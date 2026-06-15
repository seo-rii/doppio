# Kotlin Compiler Bring-Up

This document tracks the shortest path to running the upstream Kotlin compiler
on this Doppio fork. The first concrete target is the latest Kotlin CLI smoke:

```sh
node --no-deprecation build/release-cli/console/runner.js \
  -cp "$KOTLIN_COMPILER_CLASSPATH" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -version
```

## Baseline

- Kotlin compiler version: 2.4.0.
- Native host JVM smoke passes and prints `kotlinc-jvm 2.4.0`.
- Doppio now runs `K2JVMCompiler -version` to exit status 0.
- With Node's default old-space heap, a one-file Kotlin compile can exhaust the
  host JavaScript heap. With `node --max-old-space-size=4096`, Doppio reaches
  Kotlin/JVM backend code generation for a simple `Hello.kt`.
- `kotlin-compiler.jar` alone is a valid native classpath for the `Hello.kt`
  smoke; using `kotlinc/lib/*.jar` is unnecessary for the first compiler target
  and adds substantial JAR lookup noise under Doppio.
- The first one-file compiler target now passes under Doppio. With the minimal
  `kotlin-compiler.jar` classpath, Doppio compiles an empty source,
  `class Foo`, `fun main() {}`, and `fun main() { println("hi") }`; the
  generated `HelloKt` class runs on both the host JVM and Doppio. The remaining
  Kotlin compiler work is now broader throughput and coverage hardening:
  repeated variance checks, more language constructs, and the full
  `kotlinc/lib/*.jar` classpath stress case.
- `-Xint` does not solve the one-file compile hang, so JIT overhead is not the
  sole blocker.
- The CLI now exposes Doppio's scheduler quantum as
  `-Xresponsiveness:<milliseconds>`. This is useful for long compiler smokes:
  the empty Kotlin source compile is materially faster with large CLI-only
  quanta, but `class Foo` still does not finish within 300 seconds even at
  `-Xresponsiveness:100000`.
- A `-Xphases-to-dump-before=FileClassLowering` run did not create a dump within
  90 seconds, so the next investigation should focus before or around FIR2IR /
  early backend IR construction rather than late JVM bytecode emission.

## Fixed Blocker: Executable Parameters

Kotlin's CLI argument parser calls `Executable.getParameters()` while reading
compiler argument metadata. Doppio previously stopped at:

```text
UnsatisfiedLinkError: Native method
java.lang.reflect.Executable.getParameters0()[Ljava/lang/reflect/Parameter;
not implemented
```

The current implementation parses the `MethodParameters` attribute and
constructs Java 8 `java.lang.reflect.Parameter` objects for methods and
constructors compiled with `-parameters`. When the attribute is absent, the
native returns `null` so the JDK class-library fallback can synthesize unnamed
parameters.

Coverage lives in `classes/modern_test/ReflectParameters.java` and exercises:

- `Method.getParameters()` and `Constructor.getParameters()`.
- parameter names compiled with `-parameters`.
- `Parameter.isNamePresent()`, modifiers, declaring executable, and type.
- repeated `getParameters()` array cloning while preserving cached parameter
  object identity.

## Fixed Kotlin Bring-Up Blockers

These blockers were reduced to focused fixtures while moving from CLI startup
to `Hello.kt` backend codegen:

- `Class.getModule()` and a minimal unnamed `java.lang.Module` shim for Kotlin
  reflection over JDK/runtime classes.
- Operand-stack return semantics: `areturn`/wide returns must return the top
  stack value, not the bottom value. This fixed a Kotlin reflection path that
  created `ReflectKotlinClass` wrappers with a null class.
- `sun.management` CPU-time and allocation-query shims used by Kotlin's
  performance manager.
- `sun.nio.ch.FileChannelImpl.map0/unmap0` heap-backed read-only mapping for
  Kotlin's fast JAR filesystem.
- `sun.reflect.MagicAccessorImpl` access bypass for generated reflection
  constructor accessors.
- `checkcast` and `instanceof` null short-circuiting without resolving missing
  target classes.
- Interface default-method specificity when an abstract interface method is
  seen before a later default implementation from another direct interface.
- Interface default-method specificity when a class inherits a default method
  from a superclass's interface and directly implements a subinterface with a
  more-specific default. This fixed Kotlin FIR declaration status transforms
  where `FirDeclarationStatus.transform(...)` must override
  `FirElement.transform(...)`.
- Java 9 buffer covariant fluent-return bridges such as
  `ByteBuffer.position(int): ByteBuffer`, plus direct `DirectByteBuffer`
  relative bulk `get(byte[], int, int)` / `put(byte[], int, int)` traps. These
  avoid Java 9 `NoSuchMethodError` in modern fixtures and reduce one JAR
  scanning hot path, but they do not make `EmptyMain.kt` finish within ten
  minutes.
- Lazy `Throwable` stack trace materialization matching the JDK's backtrace
  shape more closely: exception construction stores lightweight frame metadata,
  while `StackTraceElement` objects and strings are created when
  `getStackTrace()` materializes them. This keeps stack trace behavior intact
  but also does not make `EmptyMain.kt` finish within ten minutes.
- Release-mode thread returns no longer build trace strings or validate return
  types on every `asyncReturn`; those checks are debug-only in release builds.
- `Method.getFullSignature()` now returns the cached method signature instead
  of rebuilding class names on hot paths.
- Cold bytecode methods bypass `Method.getOp()` until they reach Doppio's JIT
  threshold, avoiding a per-opcode method call for the many one-shot methods
  Kotlin loads during compiler startup.
- `ZipFile.getEntry` avoids BrowserFS exception allocation for expected
  missing entries, and repeated `ZipFile.open` calls for the same path and
  modification timestamp reuse the parsed `ZipFS` index. Coverage lives in
  `classes/test/ZipFileHotPaths.java`.
- `ClassLoader.defineClass(..., byte[], offset, length, ...)` now slices
  typed-array-backed Java byte arrays with both the view `byteOffset` and the
  Java offset/length. Coverage lives in `classes/test/DefineClassOffset.java`
  and prevents padding bytes from reaching the class parser.

## Fixed Blocker: Kotlin Backend Visibility

The previous `Hello.kt` smoke reached Kotlin/JVM backend codegen and failed with:

```text
IllegalStateException: unknown is not a valid visibility in backend for
FUN name:main visibility:unknown modality:FINAL <> () returnType:kotlin.Unit
```

Native Kotlin 2.4.0 compiles the same input successfully. The reduction showed
that `FirNamedFunctionImpl.transformStatus(...)` was dispatching through the
less-specific `FirElement.transform(...)` default method instead of
`FirDeclarationStatus.transform(...)`. Doppio's interface default resolution now
replaces inherited interface defaults with more-specific subinterface defaults
and emits the replacement on the generated JavaScript prototype even when the
VM-table slot came from the superclass.

Coverage lives in `classes/modern_test/Java9DefaultMethodSpecificity.java`.
The Kotlin scratch smoke `KotlinFirStatusResolverSmokeKt` now prints:

```text
public
FINAL
public
public
```

## Current Boundary: Minimal Hello.kt Compile Passes

After the visibility fix, the compiler no longer throws
`unknown is not a valid visibility`. A later class-only diagnostic showed long
samples in
`org.jetbrains.kotlin.codegen.serialization.JvmSerializationBindings.get`, at
the `MutableSlicedMap.get(slice, key)` wrapper call used by Kotlin metadata
serialization. Doppio now traps the no-collision identity-hit case directly for
that Kotlin-internal wrapper and falls back to the original bytecode for
collisions, unknown holder shapes, or backing-map layouts that are not covered
by the fast path.

Current verified checks:

- 2026-06-14 Kotlin 2.4.0 minimal `kotlin-compiler.jar` measurements under
  `node --max-old-space-size=4096 --no-deprecation`, with
  `-Xresponsiveness:100000`:
  - Empty Kotlin source file: status 0 in 85 seconds, output
    `META-INF/main.kotlin_module`.
  - `class Foo`: status 0 in 59 seconds, output `Foo.class` and
    `META-INF/main.kotlin_module`.
  - `fun main() {}` with `-no-stdlib -no-reflect`: status 0 in 48 seconds,
    output `EmptyMainKt.class` and `META-INF/main.kotlin_module`.
  - `fun main() { println("hi") }` with `-no-reflect`: status 0 in 61 seconds,
    output `HelloKt.class` and `META-INF/main.kotlin_module`.
  - The generated `HelloKt` class prints `hi` on the host JVM.
  - The generated `HelloKt` class also prints `hi` under Doppio.
- The fast path is intentionally narrow: it handles only keys that use
  `java.lang.Object.hashCode()`, the observed `OpenAddressLinearProbingHashTable`
  identity slot hit, and `OneElementFMap`, `PairElementsFMap`, and
  `ArrayBackedFMap` holders. Other cases defer to Kotlin's original bytecode
  implementation.
- The minimal `Hello.kt` compile-and-run smoke is now tracked by
  `ci/kotlin_smoke.sh` and the `Modern Java` GitHub Actions workflow. The
  workflow caches `kotlin-compiler@2.4.0` outside the repository tree and runs
  the generated class on both the host JVM and Doppio.
- The CI smoke now compiles multiple Kotlin files covering a data class,
  annotation class, interface default implementation, generic class, default
  arguments, string templates, and a lambda. Runtime execution includes
  `kotlin-stdlib.jar` and checks the same output on the host JVM and Doppio.
- The same smoke now passes with the full `kotlinc/lib/*.jar` classpath. A
  local 2026-06-14 run completed in 83 seconds and produced `HelloKt`,
  `ConstructsKt`, `SmokePoint`, `SmokeNamed`, `SmokeBox`, `SmokeTag`, and
  `META-INF/main.kotlin_module`; both the host JVM and Doppio printed
  `hi` / `name=2,4:5`. A follow-up run through `ci/kotlin_smoke.sh` completed
  in 183 seconds, so runtime variance is still a real tracking point. The
  `Modern Java` workflow runs this full-classpath mode with
  `KOTLIN_SMOKE_CLASSPATH_MODE=full`.
- A further local reduction compiled and ran sealed class/data subclass,
  `object`, companion object, enum, collection pipeline (`listOf`, `map`,
  `filter`, `joinToString`), and exception handling constructs. It completed in
  207 seconds and both the host JVM and Doppio printed
  `mode-FAST:3:2,3:caught`; this construct set is now included in
  `classes/kotlin_smoke`.
- The current smoke also compiles and runs nullable safe-call/Elvis flow,
  nested and inner classes, a function-local class, `Runnable`/`Comparator` SAM
  conversions, an anonymous object expression, a delegated local property, and
  an inline function. A full-classpath local run completed in 222 seconds and
  both the host JVM and Doppio printed
  `OK:FALLBACK:3:9:2:1:accbbb:4:4:7`.
- A no-suspension `suspend` function, suspend lambda, `Continuation`, and
  `kotlin.coroutines.startCoroutine` path are now included in the repo smoke. A
  full-classpath local run completed in 171 seconds; both the host JVM and
  Doppio printed `suspend=7`. This covers suspend metadata and immediate
  coroutine completion, but not a real suspension/resume state machine.
- The smoke now includes custom delegated properties backed by
  `kotlin.reflect.KProperty` metadata and a `suspendCoroutine` resume path. A
  full-classpath local run completed in 258 seconds; both the host JVM and
  Doppio printed `delegate:answer:DelegatedOwner|local:local:top` and
  `state=14`. This covers synchronous resume through a generated coroutine
  state machine, but not delayed/asynchronous resumption.
- A delayed continuation resume and resume-time exception path are now included
  in the repo smoke. A full-classpath local run completed in 123 seconds. The
  `startCoroutine` callback remained `pending` until the saved continuation was
  resumed, then both the host JVM and Doppio printed `pending->delayed=15` and
  `pending->fail=resume3`. This covers delayed same-thread resumption and
  exception propagation through the generated state machine.
- The repo thread-resume smoke completed in 280 seconds with the full classpath,
  and both the host JVM and Doppio printed `pending->thread=24`. This covers
  saving a continuation on the main thread, resuming it from a Java `Thread`,
  joining that thread, and observing the coroutine result after cross-thread
  completion.
- A minimal executor-resume smoke compiled in 388 seconds and both the host JVM
  and Doppio printed `pending->executor=13`. The full smoke with the same
  executor path is now included in the repo smoke and completed in 522 seconds
  after the compile timeout was raised to 900 seconds. This covers
  `Executors.newSingleThreadExecutor()`, `submit`, `Future.get()`, `shutdown`,
  and continuation resume from an executor worker.
- A minimal `ContinuationInterceptor` event-loop smoke compiled in 91 seconds
  and both the host JVM and Doppio printed
  `pending>1>pending>pending>1>pending>pending>1>dispatch=36`. The repo smoke
  now includes the same path and completed in 412 seconds with the full
  classpath. A custom interceptor queues the initial coroutine start plus two
  suspended continuation resumes, and the test drains the queue between each
  step to verify that the generated coroutine state machine preserves locals
  across multiple dispatched suspension points.
- A minimal callable-reference and lazy-sequence smoke compiled in 175 seconds
  and both the host JVM and Doppio printed `a2|b7|c4|d9:20:8:7:10`. The repo
  smoke now includes the same path and completed in 234 seconds with the full
  classpath. It covers top-level, bound instance, unbound instance,
  constructor, and companion-object callable references combined with
  `generateSequence`, `map`, `filter`, `flatMap`, `zip`, `joinToString`, and
  `fold`.
- A minimal `@JvmInline value class` smoke compiled in 106 seconds and both the
  host JVM and Doppio printed `v1,v4,v7:22:box4:v7:none|v11:a`. The repo smoke
  now includes the same path and completed in 354 seconds with the full
  classpath. It covers a value class implementing `Comparable` and a custom
  interface, plus operator dispatch, property access, nullable boxing, `Any`
  boxing, `Map` key equality/hash behavior, sorted-list comparison, and the
  generated `box-impl`/`unbox-impl`/`equals-impl`/`hashCode-impl` methods.
- A minimal reified-generic and array-lowering smoke compiled in 160 seconds
  and both the host JVM and Doppio printed
  `String:3:a|bb|ccc:Number:2:1|2:i[3,1,4,9,1,5]=23:zamm|zbbmm:1-4-9:2345:String:int`.
  The repo smoke now includes the same path and completed in 256 seconds with
  the full classpath. It covers `inline reified` `is`/`as?` checks,
  `T::class.java`, primitive and object arrays, spread varargs, `copyOf`,
  `toTypedArray`, `IntArray` construction, component-type reflection, and the
  generated `reifiedOperationMarker`/`instanceof`/`checkcast`/`newarray`/
  `anewarray` bytecode shape.
- A minimal runtime-annotation reflection smoke compiled with
  `-java-parameters` in 105 seconds and both the host JVM and Doppio printed
  `class:field:getter:ctor,_:method:arg:kt3`. The repo smoke now includes the
  same Kotlin compiler option and completed in 184 seconds with the full
  classpath. It covers runtime-retained annotations with class, field, getter,
  constructor-parameter, function, and function-parameter use-site targets
  observed through `java.lang.reflect`, plus generated
  `RuntimeVisibleAnnotations`, `RuntimeVisibleParameterAnnotations`, and
  `MethodParameters` attributes.
- A minimal annotation-metadata smoke compiled in 76 seconds and both the host
  JVM and Doppio printed
  `class-a,class-b|class:HIGH:AnnotationMetadataOwner:1,2,3|ctor-a,ctor-b|ctor:LOW:String:4,5|field-a,field-b|field:LOW:int:6|method-a,method-b|method:LOW:long:7,8|arg-a,arg-b|arg:LOW:double:9|kt3`.
  The repo smoke now includes the same path and completed in 244 seconds with
  the full classpath. Java reflection verified `getAnnotationsByType` over
  repeatable annotations plus enum, `KClass`, and `IntArray` annotation
  elements. `javap` verified `MultiTag$Container`, Java `@Repeatable`,
  `RuntimeVisibleAnnotations`, `RuntimeVisibleParameterAnnotations`, and
  `AnnotationDefault` metadata.
- A standalone `kotlin-reflect.jar` smoke now lives in
  `ci/kotlin_reflect_smoke.sh`, separate from the large `ci/kotlin_smoke.sh`
  suite so reflection regressions are isolated. Doppio compiled the source in
  76 seconds with explicit `kotlin-stdlib.jar` and `kotlin-reflect.jar` source
  classpath; both the host JVM and Doppio printed
  `ReflectSmokeBox|count,name|5|r:box:5`. This covers
  `KClass.primaryConstructor`, `KClass.memberProperties`, mutable property
  set/get through `KMutableProperty1`, and `KClass.memberFunctions` invocation
  through the real `kotlin-reflect.jar` runtime.
- A minimal modern-construct smoke compiled in 77 seconds and both the host JVM
  and Doppio printed `ABG:1:15:kt5:StagePayload:EmptyStage:true`. The repo
  smoke now includes the same path and completed in 185 seconds with the full
  classpath. It covers Kotlin `fun interface` SAM conversion through
  `invokedynamic`, sealed interface exhaustiveness, `data object` singleton
  behavior, Kotlin 1.9 `Enum.entries`/`EnumEntries`, property-reference
  classes, and class-literal lookup.
- A minimal default-synthetic smoke compiled in 76 seconds and both the host
  JVM and Doppio printed
  `p-box:6!:p-wide:6?:[CORE]:cfg23ab:p-box:6!|p-named:6!|p-full:9!:p-r:3!|q-r:3!|q-r:3?`.
  The repo smoke now includes the same path and completed in 214 seconds with
  the full classpath. It covers default-argument `$default` dispatch,
  `@JvmOverloads` constructors and methods observed through Java reflection,
  interface `DefaultImpls`, data-class `copy$default`, and
  `kotlin.jvm.internal.DefaultConstructorMarker` constructor lowering.
- A minimal enum/string `when` lowering smoke compiled in 74 seconds and both
  the host JVM and Doppio printed
  `1357:nilpe:14:10,30,-1,40:neg|zero|small|big`. The repo smoke now includes
  the same path and completed in 208 seconds with the full classpath. `javap`
  verified the generated `$WhenMappings` class, static enum-switch int arrays,
  `NoSuchFieldError` exception table, enum `tableswitch`, string
  `lookupswitch`, and subjectless range branch lowering.
- A minimal inline control-flow smoke compiled in 77 seconds and both the host
  JVM and Doppio printed `enter>body>exit:ok:c10:34:stop3`. The repo smoke now
  includes the same path and completed in 223 seconds with the full classpath.
  `javap` verified inline `try/finally` `InlineMarker.finallyStart`/
  `finallyEnd`, non-local return lowering, `crossinline` Runnable classes,
  retained `noinline` `Function1` storage, and the noinline lambda
  `invokedynamic` site.
- A minimal JVM interop annotation smoke compiled in 111 seconds and both the
  host JVM and Doppio printed
  `kt:java:ok7:IllegalArgumentException:fieldconst:top-3:o5obj:5:11111111`.
  The repo smoke now includes the same path and completed in 240 seconds with
  the full classpath. Java reflection and `javap` verified `@file:JvmName`,
  `@JvmName`, `@JvmStatic`, `@JvmField`, `const val`, `@Throws`, `@Volatile`,
  and `@Synchronized` lowering into static members, exception metadata,
  volatile fields, and synchronized methods.
- A dynamic-proxy/reflection smoke is now included in the repo source set. A
  local run through `ci/kotlin_smoke.sh` completed in 484 seconds with the
  minimal compiler classpath and 474 seconds with the full `kotlinc/lib/*.jar`
  classpath; both the host JVM and Doppio printed
  `iface/transform/value|dyn|KT5|XY3|cba|null|ProxyReflectionService(dyn)|321|true|true|true|transform:2,getLabel:0,transform:2,maybe:1,maybe:1,toString:0,hashCode:0,equals:1`.
  This covers `Proxy.newProxyInstance` for a Kotlin interface, property getter
  dispatch through `InvocationHandler`, direct and reflective proxy method
  invocation, runtime method and parameter annotations compiled with
  `-java-parameters`, proxy `toString`/`hashCode`/`equals` dispatch,
  `Proxy.isProxyClass`, and `Proxy.getInvocationHandler`.
- A Kotlin source-level `java.lang.invoke.MethodHandles` smoke is now included
  in the repo source set. A 2026-06-16 local run through
  `ci/kotlin_smoke.sh` completed in 435 seconds with the full
  `kotlinc/lib/*.jar` classpath; the host JVM and Doppio matched the scripted
  expected output.
  This covers Kotlin-compiled calls to `findStatic`, `findConstructor`,
  `findVirtual`, `findGetter`, `findSetter`, `invokeWithArguments`,
  `MethodHandle.asType`, reference casts, primitive unboxing/widening, boxed
  return adaptation, `Lookup.unreflect`, `unreflectConstructor`,
  `unreflectGetter`, and `unreflectSetter` public success paths, private member
  access-failure behavior, `MethodHandles.privateLookupIn` private method
  access plus public-lookup failure behavior, and
  `MethodType.toMethodDescriptorString()`.
- The same Kotlin MethodHandles smoke now includes selected combinators:
  `identity`, `constant`, `bindTo`, `insertArguments`, `dropArguments`,
  `filterArguments`, `filterReturnValue`, `permuteArguments`,
  `guardWithTest`, `catchException`, `exactInvoker`, `invoker`,
  `collectArguments`, zero-position and selected nonzero-position
  `foldArguments`, `explicitCastArguments`, `arrayElementGetter`,
  `arrayElementSetter`, `throwException`, and Java 17 public overlays `zero`,
  `empty`, `arrayLength`, `arrayConstructor`, `dropArgumentsToMatch`,
  `dropReturn`, and selected `tryFinally` flows, with descriptor-string checks
  for the adapted shapes. The
  Java 17 overlays are reached by reflection so the smoke exercises runtime
  discovery and invocation without requiring the Kotlin source frontend to
  hard-code those signatures. This extends the source-level Kotlin coverage
  after the matching Java 17 fixtures passed native-JVM and Doppio comparison.
- A minimal mutable delegated-property smoke compiled in 104 seconds and both
  the host JVM and Doppio printed
  `bind:primary:MutableDelegateOwner:primary:0|bind:primary:MutableDelegateOwner:primary:30|alt:secondary:MutableDelegateOwner:secondary:30|local:local:top:local:0|local:local:top:local:10`.
  The repo smoke now includes the same path and completed in 232 seconds with
  the full classpath. `javap` verified `provideDelegate`, `getValue`,
  `setValue`, generated `$$delegatedProperties`, and mutable property-reference
  lowering through `MutablePropertyReference0Impl` and
  `MutablePropertyReference1Impl`.
- A minimal captured-class shape smoke compiled in 72 seconds and both the host
  JVM and Doppio printed `234:yx:true:11:45|89:yx:true:8:5`. The repo smoke now
  includes the same path and completed in 233 seconds with the full classpath.
  `javap` verified captured local-class fields, anonymous `Runnable` object
  lowering, inner-class `this$0`, nested companion construction, and generated
  `access$mix` / `access$getSecret$p` synthetic accessors.
- A minimal delegation/bridge smoke compiled in 72 seconds and both the host JVM
  and Doppio printed
  `text:7|text:5|5x|text:6|z!|az!|apply:Object:Object,describe:String:CharSequence,describe:String:Object|apply:Object:Object,describe:String:Object|echo:Object:Object,read:Object:`.
  The repo smoke now includes the same path and completed in 233 seconds with
  the full classpath. Java reflection verified bridge methods at runtime, and
  `javap` verified interface `DefaultImpls`, delegation forwarding fields,
  generic signatures, and `ACC_BRIDGE` / `ACC_SYNTHETIC` methods.
- A minimal extension/typealias/variance smoke compiled in 90 seconds and both
  the host JVM and Doppio printed
  `5/1/5:1|5|3|p0:b:1,p1:aa:2|kt:2|ktxy|1,2|kt:2|xy:2|n:Integer,s:String,z:null`.
  The repo smoke now includes the same path and completed in 255 seconds with
  the full classpath. `javap` verified top-level extension receiver methods,
  the `bump$default` default-argument bridge, extension property accessors,
  `ScoreMap` and `PairList` typealias metadata, generic class signatures,
  use-site variance and star-projection `Signature` attributes, and the
  inlined `sortedBy` comparator class.
- A minimal receiver-lambda and extension callable-reference smoke compiled in
  79 seconds and both the host JVM and Doppio printed
  `s|[a]|kn|<GO>|x1|(xy)|{q}|ad|text`. The repo smoke now includes the same
  path and completed in 275 seconds with the full classpath. `javap` verified
  `ExtensionFunctionType` metadata, `BuilderBlock` typealias metadata,
  `Function2` receiver-lambda signatures, extension callable-reference and
  bound-reference classes, extension property-reference lowering, the
  `decorate$default` bridge, invokedynamic lambda sites, and runtime-visible
  receiver-parameter annotations.
- A minimal control-flow bytecode smoke compiled in 82 seconds and both the
  host JVM and Doppio printed
  `16|1:2:2,1:4:4,2:1:2,2:2:4,2:3:6,2:4:8,3:2:6#6|p357|q46|ok1:neg1:For input string: "x":ok7|2:ccc`.
  The repo smoke now includes the same path and completed in 305 seconds with
  the full classpath. `javap` verified tailrec/default bridges, labeled loop
  lowering, local default-vararg helpers, spread-array calls, inline
  `runCatching` / `fold`, labeled `return@` lowering, `Exception table`
  entries, and `StackMapTable` metadata.
- A minimal initialization/delegate smoke compiled in 72 seconds and both the
  host JVM and Doppio printed
  `false/true|KT:5:1|KT:5:1|kt|2/9/6|companion>observed:start->kt>guarded:2?1>guarded:2?9>lazy>nested`.
  The repo smoke now includes the same path and completed in 284 seconds with
  the full classpath. `javap` verified `lateinit` accessors and
  `throwUninitializedPropertyAccessException`, `Delegates.notNull`,
  `observable`, `vetoable`, `LazyThreadSafetyMode.NONE`, `LazyKt.lazy`,
  `$$delegatedProperties`, `MutablePropertyReference1Impl`, inlined delegate
  classes, companion/nested object initialization, and `StackMapTable`
  metadata.
- A minimal collection-builder smoke compiled in 78 seconds and both the host
  JVM and Doppio printed
  `24678|k0=4,k1=16,k2=36,k3=49,k4=64|e=20,o=7|12,21,8|24|67|8|678/24|2:4;4:6;6:7|abc|22,44,66,77,88|1:3:7:13:20:28|71|2,1,0,9`.
  The repo smoke now includes the same path and completed in 293 seconds with
  the full classpath. `javap` verified `CollectionsKt.createListBuilder` /
  `build`, `MapsKt.createMapBuilder` / `build`,
  `SetsKt.createSetBuilder` / `build`, inlined `groupingBy`, `fold`,
  `windowed`, `chunked`, `partition`, `zipWithNext`, `flatten`,
  `associateWith`, `runningFold`, `reduceIndexed`, `toSortedMap`,
  `invokedynamic` `Function1` lambdas, `StackMapTable`, and
  `kotlin.Metadata`.
- A minimal sequence-builder smoke compiled in 81 seconds and both the host
  JVM and Doppio printed
  `1:2|start>after1|0=3,1=8,2=10|start>after1>start>after1>afterAll>done|abcd|789/IllegalStateException|3,6,12,24|xyyzzz:23`.
  The repo smoke now includes the same path and completed in 335 seconds with
  the full classpath. `javap` verified `SequencesKt.sequence`, `iterator`,
  `asSequence`, `constrainOnce`, `generateSequence`, `windowed`, `onEach`,
  `zipWithNext`, generated `RestrictedSuspendLambda` classes,
  `SequenceScope.yield` / `yieldAll`, `Continuation`, `invokeSuspend`,
  `COROUTINE_SUSPENDED`, `ResultKt.throwOnFailure`, `DebugMetadata`,
  `StackMapTable`, and `kotlin.Metadata`.
- A minimal Result/exception smoke compiled with the repo suite in 336 seconds
  and both the host JVM and Doppio printed
  `44|12|IllegalStateException/99/77|0=ok44,1=errIllegalStateException:again,2=errUnsupportedOperationException:manual|6:body>recover:inner>finally|IllegalArgumentException:root|two|enter:a>ok:a>mapped:44>enter:b>fail:b:ResultSmokeException:boom>recover:boom>enter:c>ok:c>recoverCatching:bad4>else:again`.
  `javap` verified `Result.constructor-impl`, `ResultKt.createFailure`,
  `Result.isSuccess-impl`, `Result.isFailure-impl`,
  `Result.exceptionOrNull-impl`, `Result.box-impl`, `Result.unbox-impl`,
  `ResultKt.throwOnFailure`, exception tables for inline `runCatching` /
  `mapCatching` / `recoverCatching` / `try` / `finally`, `StackMapTable`,
  and `kotlin.Metadata`.
- A minimal text/regex smoke compiled with the repo suite in 324 seconds and
  both the host JVM and Doppio printed
  `0:a:2:0-2,1:bb:25:5-9,2:c:457:12-16|A:1; BB:32; C:654; bad=x|first b=2|a|bb|c|0:5:a,1:6:b,2:5:g|KT/42|true|KOTin`.
  `javap` verified `Regex.findAll`, JDK 8 named-group extension lookup,
  lazy `SequencesKt.mapIndexed` / `joinToString`, transform replacement,
  `Regex.replaceFirst`, `Regex.split`, `StringsKt.lineSequence`,
  `MatchResult.Destructured`, `RegexOption` set construction,
  `StringsKt.replaceRange`, `LambdaMetafactory` bootstrap methods for the
  Kotlin lambdas, `StackMapTable`, and `kotlin.Metadata`.
- A minimal file I/O smoke compiled with the repo suite in 364 seconds and
  both the host JVM and Doppio printed
  `0:5:a,1:4:b,2:5:g|aaa|input.txt:17,nested/out.txt:17|616c706861|txt/out/nested/out.txt|true/true`.
  `javap` verified `FilesKt.writeText`, `appendText`, `readLines`,
  `useLines`, `copyTo`, `walkTopDown`, `relativeTo`,
  `getInvariantSeparatorsPath`, `readBytes`, `CloseableKt.closeFinally`,
  `LambdaMetafactory` bootstrap methods for Kotlin lambdas, `StackMapTable`,
  and `kotlin.Metadata`.
- A minimal NIO path smoke compiled with the repo suite in 384 seconds and
  both the host JVM and Doppio printed
  `0:5:d,1:7:e,2:4:z|64656c74|input.txt:false,nested:true|input.txt:19,nested/moved.txt:19|input.txt/runtime-nio/nested/moved.txt|true/true/true`.
  `javap` verified `Paths.get`, `Files.exists`, `createDirectories`, `write`,
  `readAllLines`, `readAllBytes`, `copy`, `move`, `list`, `walk`,
  `isDirectory`, `isRegularFile`, `size`, and `isSameFile`, explicit stream
  close paths in `finally` blocks, `LambdaMetafactory` bootstrap methods for
  Kotlin lambdas, `StackMapTable`, and `kotlin.Metadata`.
- A minimal concurrent cache smoke compiled with the repo suite in 363 seconds
  and both the host JVM and Doppio printed
  `a=123,b=12,c=89|true|true:y:Y11|abc:false:true:1|main:11/worker:3/main:11/main:11|locked:3:hold:1:true|k=1,z=12|11`.
  `javap` verified `ConcurrentHashMap.computeIfAbsent`, `compute`, `merge`,
  `putIfAbsent`, `replace`, `AtomicInteger`, `AtomicReference.compareAndSet`,
  `getAndUpdate`, `updateAndGet`, `CopyOnWriteArrayList.addIfAbsent`,
  `addAllAbsent`, `ThreadLocal.withInitial`, `Thread.start` / `join`,
  `ReentrantLock` lowered through `Lock.lock` / `unlock`, synchronized map
  `monitorenter` / `monitorexit`, `LambdaMetafactory`, `StackMapTable`, and
  `kotlin.Metadata`.
- A minimal classpath resource lookup smoke compiled with the repo suite in
  387 seconds and both the host JVM and Doppio printed
  `ffffff|4:cafebabe|1:1:true|true:true:true`. This covers Kotlin-generated
  class and module resource discovery while avoiding environment-specific
  absolute paths in the expected output. `javap` verified
  `Class.getClassLoader`, `ClassLoader.getSystemClassLoader`, thread context
  classloader get/set/restore, `ClassLoader.getResource`,
  `ClassLoader.getSystemResource`, `ClassLoader.getResources`,
  `Class.getResource`, `URL.openStream`, `Collections.list`,
  `URL.toExternalForm`, exception-table-backed context restoration,
  `LambdaMetafactory`, `StackMapTable`, and `kotlin.Metadata`.
- A minimal `ServiceLoader` smoke compiled with the repo suite in 392 seconds
  and both the host JVM and Doppio printed
  `alpha=7,beta=11|2|alpha=7,beta=11|AlphaServiceLookupPlugin>BetaServiceLookupPlugin|true`.
  The CI script now creates a generated `META-INF/services/ServiceLookupPlugin`
  resource next to the compiled Kotlin classes, including a comment and a
  duplicate provider line. `javap` verified `ServiceLoader.load`,
  `ServiceLoader.iterator`, `ServiceLoader.reload`, iterator-to-sequence
  lowering through `SequencesKt.asSequence` / `toList`, provider interface
  dispatch, public no-arg provider constructors, duplicate-provider collapse,
  fresh instances after `reload`, `LambdaMetafactory`, `StackMapTable`, and
  `kotlin.Metadata`.
- A minimal jar/zip classpath smoke compiled with the repo suite in 412
  seconds and both the host JVM and Doppio printed
  `jarzip:false:META-INF/MANIFEST.MF,META-INF/services/example.Service,META-INF/versions/17/pkg/data.txt,pkg/data.txt:alpha/beta:pkg.Provider:11:6e30506e:6e30506e:true|META-INF/MANIFEST.MF=META-INF,META-INF/services/example.Service=META-INF,META-INF/versions/17/pkg/data.txt=META-INF,pkg/data.txt=alpha|jar:jar:alpha/beta:pkg.Provider:true`.
  This covers runtime jar creation and classpath-style reads while avoiding
  absolute paths in the expected output. `javap` verified `JarOutputStream`,
  `JarEntry`, `JarFile`, `Manifest`, `Attributes`, `ZipInputStream`, `CRC32`,
  `URLClassLoader`, jar URL `openStream`, Kotlin `readBytes`, and
  `CloseableKt.closeFinally` paths. The separate
  `classes.modern_test.Java9JarFileMultiRelease` fixture now covers
  `Multi-Release: true` default `JarFile(File)` base-entry parity and
  classpath-style `URLClassLoader` versioned resource lookup; this smoke
  deliberately uses `Multi-Release: false` so it proves ordinary
  jar/zip/resource behavior first. 2026-06-15 full-classpath regression runs
  after the multi-release `JarFile` parity fix completed in 518-855 seconds.
- A minimal unsigned Kotlin smoke covers `UInt`, `ULong`, `UByte`,
  unsigned-array construction, wraparound arithmetic, unsigned sorting,
  filtering, map lookup by unsigned keys, and byte-to-hex rendering. Both the
  host JVM and Doppio print
  `3:4:0fa0ff:2,9,18446744073709551615:4294967295,4:wrap:true:true`.
- A minimal enum-polymorphism smoke covers enum constants with class bodies,
  overridden properties and methods, `Enum.entries`, `enumValues`,
  `enumValueOf`, `valueOf`, and `when` dispatch over those constants. Both the
  host JVM and Doppio print
  `A1B3G5|tk2|X1,x2,xxx3|low/high/high|IllegalArgumentException`.
- The repo bytecode-shape smoke completed in 406 seconds with the full
  classpath, and both the host JVM and Doppio printed
  `try>catch>finally:boom:8:true:x3:10:12:4:sync`. This covers Kotlin lowering
  for `try`/`catch`/`finally`, `Closeable.use`, destructuring via
  `componentN`, `1..n` loops, stepped `downTo` loops, `mapIndexed`, and
  `synchronized`.

Historical checks that led to this boundary:

- 2026-06-12 Kotlin 2.4.0 minimal `kotlin-compiler.jar` measurements under
  `node --max-old-space-size=4096 --no-deprecation`, rechecked after the
  `defineClass` byte-slicing fix:
  - `K2JVMCompiler -version`: status 0 in about 20 seconds.
  - Empty Kotlin source file: status 0 in about 50 seconds, output
    `META-INF/main.kotlin_module`.
  - `fun main() {}`: still timed out at 420 seconds with no output directory.
  - `fun main() { println("hi") }`: still timed out at 420 seconds with no
    output directory.
- 2026-06-12 Kotlin 2.3.21 `kotlin-compiler.jar` smoke from the local pnpm
  cache after the `defineClass` byte-slicing fix:
  - `K2JVMCompiler -version`: status 0, prints `kotlinc-jvm 2.3.21`.
  - Empty source directory: exits with `error: no source files`, matching this
    compiler line rather than the 2.4.0 empty-source behavior above.
  - `fun main() { println("hi") }`: still timed out at 420 seconds with no
    output directory.
- Before the release-return, method-signature, cold-`getOp`, and ZipFS hot-path
  reductions, the same empty source compile took about 282.8 seconds in this
  environment.
- Current V8 CPU profiles no longer show `ext_classname` or BrowserFS
  `ApiError` construction as dominant costs. Remaining top costs are broad
  interpreter execution (`BytecodeStackFrame.run`, `Method.getOp` for hot
  methods), GC, class constructor generation, array copies, and Kotlin's
  normal zip/class loading work.
- A typed-array bulk-copy shortcut in `System.arraycopy` was rejected during
  Kotlin smoke testing. The retained change is only local source/destination
  array caching in the existing checked copy loop, with primitive coverage in
  `classes/modern_test/Java17SystemArrayCopy.java` and the legacy
  `classes/test/ArrayCopyTest.java`.
- Repeated `Throwable.fillInStackTrace` remains visible in Kotlin CPU profiles.
  Doppio stack-trace frame capture no longer copies bytecode operand stacks or
  locals arrays for every frame; repeated exception construction is covered by
  `classes/modern_test/Java17ThrowableStackTraceLoop.java`.
- 2026-06-13 follow-up reductions removed more VM overhead from the Kotlin
  class-only path: true no-argument native calls bypass `convertArgs/apply`,
  `JVMThread.currentMethod()` no longer allocates stack-trace frame objects, and
  `asyncReturn()` skips the redundant `setStatus(RUNNABLE)` call when already
  runnable. All three changes pass `test-modern-java` locally and in CI, but
  `class Foo` still times out at the 120 second boundary with no output
  directory. The latest profile still points at broad bytecode/thread
  execution, `Method.getOp`, invoke opcodes, `ClassData._constructConstructor`,
  GC, and array copies rather than a completed classfile write.
- 2026-06-14 follow-up reductions and measurements:
  - `Method.isHidden()` / `isCallerSensitive()` cache annotation lookups used by
    stack-trace filtering.
  - `ClassReference.setResolved()` no longer constructs JavaScript class
    constructors eagerly; object allocation materializes the constructor on the
    `new` fast path.
  - Java CLI accepts `-Xresponsiveness:<milliseconds>` for compiler-style
    workloads. This leaves default VM behavior unchanged.
  - Instance invoke fast paths combine argument slicing with receiver stack
    dropping for non-zero-argument calls.
  - Kotlin `Intrinsics` null-check helpers are trapped as VM natives for the
    common no-op path. Coverage lives in
    `classes/test/KotlinIntrinsicsNullCheck.java`.
  - A precise `Intrinsics.areEqual(Object, Object)` trap was rejected after
    testing. The non-null case must call dynamic Java `equals`, which requires
    a callback/native-frame round trip; the empty Kotlin source smoke regressed
    to about 120 seconds from the previous 77 second local measurement.
  - A per-method constant-pool cache for resolved fast invoke opcodes was also
    rejected. Even with lazy allocation, the empty Kotlin source smoke timed
    out at 121 seconds, so the added cache lookup/allocation pressure outweighed
    avoiding `readUInt16BE` and `constantPool.getUnchecked` in this workload.
  - JIT null-check inlining and invoke-error PC restoration were also rejected
    for the Kotlin compiler path. Replacing hot `u.isNull(...)` calls with
    emitted `obj != null` checks left `class Foo` timed out at 181 seconds and
    slowed the empty-source smoke to about 99 seconds. Keeping only the invoke
    null-error `f.pc` restoration still made the empty-source smoke time out at
    120 seconds in the same run, while the restored baseline completed in 64
    seconds. Coverage for the existing JIT null exception behavior lives in
    `classes/test/JITNullChecks.java`.
  - Fast virtual/interface invoke opcodes now specialize receiver and argument
    stack extraction for common parameter counts instead of calling both
    `fromTop` and `sliceAndDropFromTop`. The empty-source smoke completed in 62
    seconds in the same environment where the restored baseline completed in 64
    seconds. `class Foo` still timed out at 180 seconds with no output
    directory, so the remaining blocker is not just generic stack slicing in
    the fast invoke opcode.
  - A native trap for the thin
    `JvmSerializationBindings.get/put -> MutableSlicedMap.get/put` wrappers was
    rejected. The wrapper trap still had to call back into JVM bytecode for the
    underlying sliced map operation and added native/callback-frame overhead;
    the empty-source smoke timed out at 120 seconds from the 62 second
    fast-invoke baseline.
  - Direct operand-stack extraction inside JIT-emitted invoke snippets was also
    rejected. The change mirrored the fast invoke opcode's `store/curr`
    specialization in generated trace code, but the empty-source smoke timed
    out at 151 seconds where the restored baseline had completed in about 62
    seconds. The class-only smoke also timed out at 300 seconds in the same
    experimental build, so the source change was reverted.
  - Empty Kotlin source still completes and writes `META-INF/main.kotlin_module`;
    with large `-Xresponsiveness` values it completed in the tens of seconds in
    local measurements.
  - `class Foo` is now known to be capable of producing bytecode under Doppio,
    but the result is not stable enough to count as done. One direct `java_cli`
    diagnostic run completed and wrote `Foo.class` plus
    `META-INF/main.kotlin_module`; `javap` verified the generated `Foo.class`.
    A subsequent `console/runner.js` run also exited with status 0 in 176
    seconds and wrote the same outputs. Repeated runner checks then timed out
    at 240 and 420 seconds with no output directory, and a repeated direct
    `java_cli` check timed out at 240 seconds. Treat this as an intermittent
    class-only success / severe performance-variance finding, not as a stable
    Kotlin declaration milestone.
  - 120 second and 200 second `JVM.dumpState()` snapshots of the class-only
    compile both sampled
    `org.jetbrains.kotlin.codegen.serialization.JvmSerializationBindings.get`
    at the `MutableSlicedMap.get(slice, key)` `invokeinterface` bytecode. The
    remaining hot path is therefore in Kotlin metadata serialization over
    sliced-map/key-map access, stressing Doppio's interface/virtual dispatch and
    general bytecode execution rather than class loading alone.
  - A later successful class-only diagnostic sampled different work at 60 and
    120 seconds: Kotlin builtins protobuf parsing and ASM-based Java class
    signature parsing. This suggests the slow path is broad compiler throughput
    with several hot phases, not one permanently stuck frame.

- Earlier full `kotlinc/lib/*.jar` classpath checks exceeded five minutes with
  CPU active and no class output. This has been superseded for the current
  CI smoke by the 2026-06-14 full-classpath success above.
- Minimal `kotlin-compiler.jar` classpath: exceeded fifteen minutes, CPU active,
  no class output.
- Empty Kotlin source file: completed under Doppio and produced only
  `META-INF/main.kotlin_module`.
- `fun main() {}` without `println`: exceeded ten minutes both before and after
  direct-buffer and lazy-throwable optimizations, with no output directory.
- After removing stack-trace frame operand-stack/local-array copies,
  `fun main() {}` still exceeded 180 seconds with no output directory.
- `class Foo` alone also exceeded 180 seconds with no output directory, and
  a follow-up `-Xphases-to-dump-after=JvmIrValidationAfterLoweringPhase` run
  did not produce a dump within 240 seconds. After caching bytecode buffers on
  stack frames, `class Foo` still exceeded 120 seconds with no output directory.
  The same 120 second boundary also held with Doppio `-Xint` and after removing
  the redundant JIT-threshold check from the `Method.getOp` hot path. Reusing
  empty stack-trace arrays and the 2026-06-13 VM return/current-method/native
  fast paths did not move the 120 second class-only boundary. Guarding native
  trace formatting and caching signature-polymorphic method checks also left
  the 120 second class-only boundary in place. Using cached static-method flags
  during method-table resolution did not change the boundary. Caching
  field/method code-generation metadata also left the 120 second class-only
  boundary in place. Direct native calls for short non-wide argument lists
  likewise did not move the boundary. Avoiding `Array.slice()` for short
  operand-stack argument copies did not move the boundary. Precomputing native
  call fast-path selection on `Method` objects likewise kept the same 120 second
  class-only timeout. Caching bytecode frame code buffers and max-stack metadata
  on `Method` objects also left the 120 second class-only boundary unchanged.
  Later runs proved `class Foo` can sometimes finish and write a valid classfile,
  but repeated 240-420 second checks still time out. The blocker is therefore
  unstable compiler throughput around class metadata/classfile generation rather
  than a confirmed semantic failure before classfile output.
- `-Xphases-to-dump-before=GenerateMultifileFacades`: no dump in 90 seconds.
- `-Xphases-to-dump-before=InterfaceLowering`: no dump in 120 seconds.
- `-Xphases-to-dump-before=FileClassLowering`: no dump in 90 seconds.
- `-Xdisable-phases=FileClassLowering`: reached JVM backend codegen and exited
  with Kotlin's expected assertion that a file-level declaration should have
  been lowered to an `IrClass` after `JvmLower`.
- `-Xphases-to-dump-after=FileClassLowering`: produced a dump containing a
  `MainKt` file class with the original top-level `main`.
- `-Xphases-to-dump-after=JvmIrValidationAfterLoweringPhase`: produced the
  final lowering dump containing `MainKt`, the original empty `main()`, and the
  generated `main(String[])` bridge. The current boundary is therefore after
  JVM IR lowering, in JVM bytecode generation, metadata/classfile emission, or
  an immediately adjacent codegen helper.
- V8 `--prof` shows broad interpreter/thread execution with noticeable
  `Throwable.fillInStackTrace`, string work, and dynamic property access rather
  than one obvious JavaScript infinite loop.
- A dev-cli `-XX:+PrintCompilation` run showed progress through Kotlin metadata
  protobuf parsing, `java.lang.invoke.MemberName` resolution, ASM
  `jdk.internal.org.objectweb.asm.MethodWriter` bytecode emission, and repeated
  `FastJarVirtualFile` / UTF-8 / `DirectByteBuffer.get(byte[], int, int)` work
  before it was stopped. The compiler is not simply stuck before backend
  codegen, but it is still far too slow or cycling before writing class files.

The next reduction should broaden the compiler smoke rather than keep treating
minimal `Hello.kt` or full classpath startup as the primary blocker. Focus on
repeated variance checks and small source files that add event-loop
asynchronous resumption, more complex control-flow bytecode, and broader JVM
bytecode emission. The current evidence still points at broad compiler
throughput, but the first compile-and-run milestone now passes in both minimal
and full-classpath modes.

## Implementation Plan

1. Keep the repo fixture for interface default-method specificity green.
2. Keep `ci/kotlin_smoke.sh` green in CI while broadening the checked Kotlin
   sources.
3. Keep broadening the Kotlin smoke in small increments that distinguish
   event-loop asynchronous resumption, more complex control-flow bytecode, and
   broader JVM bytecode emission.
4. If a smoke is slow because of repeated Java exceptions, reduce the specific
   exception pattern to a Java fixture before optimizing Doppio. The generic
   lazy `Throwable` stack trace path is already covered.
5. If a smoke diverges semantically, reduce the primitive to a Java fixture
   where possible. If it is Kotlin-compiler-internal behavior, keep a small
   `/tmp` Kotlin smoke and document the exact class/method path before changing
   VM semantics.
6. Keep the full `kotlinc/lib/*.jar` classpath stress path in CI and compare
   elapsed time after each throughput change.

## Done Criteria For The First Goal

- `K2JVMCompiler -version` exits with status 0 under Doppio. This is passing.
- A simple `Hello.kt` compiles under Doppio's Kotlin compiler invocation. This
  is passing for the minimal `kotlin-compiler.jar` classpath.
- The resulting class runs on a native JVM and, if feasible, under Doppio. This
  is passing for the generated `HelloKt` class.
- Each compatibility primitive discovered on the path has a focused test in the
  repository rather than only a Kotlin compiler smoke.
