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
- `ClassLoader.defineClass(String, ByteBuffer, ProtectionDomain)` now covers
  ByteBuffer-backed class definitions without advancing the buffer position,
  including direct-buffer class bytes. Coverage lives in
  `classes/modern_test/Java17ClassLoaderDefineByteBuffer.java`, which protects
  compiler and bytecode-transformer class-loading paths that do not hand class
  bytes through a plain `byte[]`.
- `sun.misc.Unsafe.copyMemory(Object, long, Object, long, long)` now covers
  `byte[]` to `byte[]` copies, aligned same-type primitive-array copies,
  selected `byte[]` to native-memory and native-memory to `byte[]` copies, and
  overlapping ranges in the same array. `sun.misc.Unsafe.setMemory(Object,
  long, long, byte)` now covers `byte[]` and native-memory fills, while native
  memory scalar access now covers selected `short`, `char`, `int`, `long`,
  `float`, `double`, and address reads/writes. Coverage lives in
  `classes/modern_test/Java9UnsafeCopyMemoryArrays.java` and
  `classes/modern_test/Java9UnsafeNativeMemoryPrimitives.java`; these protect
  compiler and runtime-library byte-buffer shuffling paths that bypass
  `System.arraycopy` or `Arrays.fill`.

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
- A focused Kotlin modern-Java interop smoke now lives in
  `classes/kotlin_modern_java_interop_smoke` and runs through
  `ci/kotlin_modern_java_interop_smoke.sh`. It uses reflection-backed Kotlin
  source calls into selected Java 17 class-library APIs that are not visible on
  the Java 8 boot surface: `java.util.HexFormat`,
  `java.time.InstantSource`, and `java.util.random.RandomGeneratorFactory`.
  This keeps the compiler classpath compatible while verifying that
  Kotlin-generated bytecode can consume those modern runtime overlays under
  both the host JVM and Doppio, including seeded bounded output for the
  `Random` and `SplittableRandom` providers. It also directly calls Java 16
  `Stream.toList()` and Java 17 `Map.Entry.copyOf` from Kotlin source and
  checks their unmodifiable-result behavior. A local validation completed the
  focused smoke in 84 seconds and the remaining full-classpath
  `ci/kotlin_smoke.sh` in 401 seconds.
- `ci/kotlin_diagnostic_smoke.sh` now covers a failing Kotlin compiler path:
  Doppio-hosted `K2JVMCompiler` compiles an intentionally invalid source file,
  exits with status 1, reports the expected initializer type-mismatch and
  unresolved-reference diagnostics with source positions and carets, and leaves
  the output directory empty.
- The CI smoke now compiles multiple Kotlin files covering a data class,
  annotation class, interface default implementation, generic class, default
  arguments, string templates, and a lambda. Runtime execution includes
  `kotlin-stdlib.jar` and checks the same output on the host JVM and Doppio.
- `ci/kotlin_bytecode_smoke.sh` now compiles a smaller focused Kotlin source
  set under Doppio, compares its generated program output on the host JVM and
  Doppio, and runs `javap -v` over representative generated classfiles. The
  checks cover Kotlin lambda `InvokeDynamic` entries backed by
  `LambdaMetafactory`, receiver `ExtensionFunctionType` metadata, value-class
  `box-impl`/`unbox-impl` lowering, runtime-visible annotation and parameter
  metadata, `MethodParameters`, generic `Signature` attributes, bridge methods,
  debug `SourceFile`/`LineNumberTable` attributes, bootstrap metadata,
  parameter names, interface `DefaultImpls`, `InnerClasses`, and
  `kotlin.Metadata`. This focused bytecode smoke uses the minimal compiler
  classpath; full-classpath stress remains covered by `ci/kotlin_smoke.sh`.
- A focused Kotlin basic-construct smoke now lives in
  `classes/kotlin_basic_construct_smoke` and runs through
  `ci/kotlin_basic_construct_smoke.sh`. It compiles and runs a data class,
  annotation class, interface default implementation, generic class, default
  arguments, string templates, and a lambda. Both the host JVM and Doppio print
  `name=2,4:5`. A focused local run completed in 122 seconds and the remaining
  full-classpath `ci/kotlin_smoke.sh` completed in 99 seconds. The full smoke
  now keeps the broad compiler classpath stress while compiling only the
  `HelloKt` program that prints `hi`.
- A focused Kotlin advanced-construct smoke now lives in
  `classes/kotlin_advanced_construct_smoke` and runs through
  `ci/kotlin_advanced_construct_smoke.sh`. It compiles and runs sealed
  class/data subclass, `object`, companion object, enum, collection pipeline
  (`listOf`, `map`, `filter`, `joinToString`), and exception handling
  constructs. A focused local run completed in 244 seconds and the remaining
  full-classpath `ci/kotlin_smoke.sh` completed in 187 seconds. Both the host
  JVM and Doppio print `mode-FAST:3:2,3:caught`.
- A focused Kotlin local-interop smoke now lives in
  `classes/kotlin_local_interop_smoke` and runs through
  `ci/kotlin_local_interop_smoke.sh`. It compiles and runs nullable
  safe-call/Elvis flow, nested and inner classes, a function-local class,
  `Runnable`/`Comparator` SAM conversions, an anonymous object expression, a
  delegated local property, and an inline function. A focused local run
  completed in 288 seconds and the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 211 seconds. Both the host JVM and Doppio
  print `OK:FALLBACK:3:9:2:1:accbbb:4:4:7`.
- A focused Kotlin SAM smoke now lives in `classes/kotlin_sam_smoke` and runs
  through `ci/kotlin_sam_smoke.sh`. It compiles Kotlin `fun interface` adapters
  and Java SAM conversions for `Runnable`, `Comparator`, `Supplier`,
  `IntUnaryOperator`, `Predicate`, and `Callable`, then checks the generated
  `SamSmokeKt` class with `javap -v` for `InvokeDynamic`,
  `LambdaMetafactory`, and the expected SAM descriptors before comparing host
  JVM and Doppio output.
- A no-suspension `suspend` function, suspend lambda, `Continuation`,
  `kotlin.coroutines.startCoroutine`, synchronous and delayed
  `suspendCoroutine` resume, resume-time exception propagation, Java
  `Thread`-based resume, `ExecutorService`-based resume, and a custom
  `ContinuationInterceptor` event loop are now split into
  `classes/kotlin_suspend_smoke` and run through
  `ci/kotlin_suspend_smoke.sh`. This preserves the same host JVM versus Doppio
  output checks for `suspend=7`, `state=14`, `pending->delayed=15`,
  `pending->fail=resume3`, `pending->thread=24`, `pending->executor=13`, and
  `pending>1>pending>pending>1>pending>pending>1>dispatch=36` while reducing
  compile variance in the main full-classpath smoke.
- A focused Kotlin read-only delegated-property smoke now lives in
  `classes/kotlin_readonly_delegate_smoke` and runs through
  `ci/kotlin_readonly_delegate_smoke.sh`. A focused local run completed in 96
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 124 seconds. Both the host JVM and Doppio
  printed `delegate:answer:DelegatedOwner|local:local:top`. It covers custom
  delegated properties backed by `kotlin.reflect.KProperty` metadata for both
  member and local delegated properties.
- `ci/kotlin_coroutine_smoke.sh` adds a smaller companion compile that checks
  nested `try`/`finally` cleanup across the same queued suspension shape with
  `clean>inner>outer`; a local 2026-06-22 run completed in 127 seconds.
- A queued suspend control-flow smoke now lives in
  `classes/kotlin_suspend_control_smoke` and runs through
  `ci/kotlin_suspend_control_smoke.sh`. It covers a three-resume state machine
  through `try`/`catch`/`finally`, `break`, and `continue`, with both host JVM
  and Doppio printing
  `pending|d1:pending|r1:pending|d1:pending|r2:pending|d1:pending|r3:pending|d1:done12|loop0>wait:v0>finally0:5>loop1>wait:v1>catch:neg1>finally1:12>loop2>wait:v2>finally2:12>outer:12`.
  It also resumes a suspended continuation with `resumeWithException`, catches
  that exception inside the generated state machine, and verifies nested
  `finally` unwinding after the catch return. The expected line is
  `pending|d1:pending|r1:pending|d1:pending|x2:pending|d1:done12|wait:first>after-first:2>wait:second>catch:bad>inner-finally:12>outer-finally:112`.
  The split local validation completed the focused smoke in 150 seconds and
  the remaining full-classpath main smoke in 800 seconds, confirming coverage
  preservation while showing that full-classpath timing variance is still a
  tracking risk.
- A focused Kotlin `@JvmInline value class` smoke now lives in
  `classes/kotlin_value_class_smoke` and runs through
  `ci/kotlin_value_class_smoke.sh`. A focused local run completed in 79
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 212 seconds. Both the host JVM and Doppio
  printed `v1,v4,v7:22:box4:v7:none|v11:a`. It covers a value class
  implementing `Comparable` and a custom interface, plus operator dispatch,
  property access, nullable boxing, `Any` boxing, `Map` key equality/hash
  behavior, sorted-list comparison, and the generated
  `box-impl`/`unbox-impl`/`equals-impl`/`hashCode-impl` methods.
- A focused Kotlin reified-generic and array-lowering smoke now lives in
  `classes/kotlin_reified_array_smoke` and runs through
  `ci/kotlin_reified_array_smoke.sh`. A focused local run completed in 79
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 220 seconds. Both the host JVM and Doppio
  printed
  `String:3:a|bb|ccc:Number:2:1|2:i[3,1,4,9,1,5]=23:zamm|zbbmm:1-4-9:2345:String:int`.
  It covers `inline reified` `is`/`as?` checks,
  `T::class.java`, primitive and object arrays, spread varargs, `copyOf`,
  `toTypedArray`, `IntArray` construction, component-type reflection, and the
  generated `reifiedOperationMarker`/`instanceof`/`checkcast`/`newarray`/
  `anewarray` bytecode shape.
- A focused Kotlin annotation-metadata smoke now lives in
  `classes/kotlin_annotation_metadata_smoke` and runs through
  `ci/kotlin_annotation_metadata_smoke.sh`. A focused local run completed in 87
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 211 seconds. Both the host JVM and Doppio
  printed
  `class-a,class-b|class:HIGH:AnnotationMetadataOwner:1,2,3|ctor-a,ctor-b|ctor:LOW:String:4,5|field-a,field-b|field:LOW:int:6|method-a,method-b|method:LOW:long:7,8|arg-a,arg-b|arg:LOW:double:9|kt3`.
  Java reflection verified `getAnnotationsByType` over repeatable annotations
  plus enum, `KClass`, and `IntArray` annotation
  elements. `javap` verified `MultiTag$Container`, Java `@Repeatable`,
  `RuntimeVisibleAnnotations`, `RuntimeVisibleParameterAnnotations`, and
  `AnnotationDefault` metadata.
- A standalone `kotlin-reflect.jar` smoke now lives in
  `ci/kotlin_reflect_smoke.sh`, separate from the large `ci/kotlin_smoke.sh`
  suite so reflection regressions are isolated. Doppio compiled the source in
  78 seconds with explicit `kotlin-stdlib.jar` and `kotlin-reflect.jar` source
  classpath; both the host JVM and Doppio printed
  `ReflectSmokeBox|count,name|5|r:box:5|box:render:prefix|s:seed:1|d:x:8/d:x:12|ReflectEmptyNode,ReflectValueNode:empty`.
  This covers
  `KClass.primaryConstructor`, `KClass.memberProperties`, mutable property
  set/get through `KMutableProperty1`, `KClass.memberFunctions` invocation,
  runtime annotation lookup, companion-object instance dispatch,
  `KCallable.callBy` default constructor and method arguments, sealed subclass
  enumeration, and object-instance lookup through the real `kotlin-reflect.jar`
  runtime.
- A focused Kotlin modern-construct smoke now lives in
  `classes/kotlin_modern_construct_smoke` and runs through
  `ci/kotlin_modern_construct_smoke.sh`. A focused local run completed in 185
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 213 seconds. Both the host JVM and Doppio
  printed `ABG:1:15:kt5:StagePayload:EmptyStage:true`. It covers Kotlin
  `fun interface` SAM conversion through `invokedynamic`, sealed interface
  exhaustiveness, `data object` singleton behavior, Kotlin 1.9
  `Enum.entries`/`EnumEntries`, property-reference classes, and class-literal
  lookup.
- A standalone `@JvmRecord` smoke now compiles with `-jvm-target 17` in
  `ci/kotlin_record_smoke.sh`, separate from the main smoke so the broad
  Kotlin suite can keep its default target. It verifies Kotlin-generated JVM
  `Record` classes through `Class.isRecord()`, `RecordComponent` metadata,
  canonical constructor invocation, component accessor reflection, Kotlin
  property access, value equality, and `kotlin.Metadata`; the compile path uses
  the fork's modern `java.lang.Record` class-library shim plus a tiny Java 17
  helper that direct-calls the Java 16 `Class` methods because those runtime
  overlays are not exposed as compile-time Kotlin APIs yet.
- A focused Kotlin default/synthetic smoke now lives in
  `classes/kotlin_default_synthetic_smoke` and runs through
  `ci/kotlin_default_synthetic_smoke.sh`. A focused local run completed in 136
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 331 seconds. Both the host JVM and Doppio
  printed
  `p-box:6!:p-wide:6?:[CORE]:cfg23ab:p-box:6!|p-named:6!|p-full:9!:p-r:3!|q-r:3!|q-r:3?`.
  It covers default-argument `$default` dispatch,
  `@JvmOverloads` constructors and methods observed through Java reflection,
  interface `DefaultImpls`, data-class `copy$default`, and
  `kotlin.jvm.internal.DefaultConstructorMarker` constructor lowering.
- A focused Kotlin enum/string `when` lowering smoke now lives in
  `classes/kotlin_when_mapping_smoke` and runs through
  `ci/kotlin_when_mapping_smoke.sh`. A focused local run completed in 96
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 261 seconds. Both the host JVM and Doppio
  printed `1357:nilpe:14:10,30,-1,40:neg|zero|small|big`. The focused script
  verifies the generated `$WhenMappings` class while covering static
  enum-switch int arrays, `NoSuchFieldError` exception table, enum
  `tableswitch`, string `lookupswitch`, and subjectless range branch lowering.
- A focused Kotlin inline control-flow smoke now lives in
  `classes/kotlin_inline_control_smoke` and runs through
  `ci/kotlin_inline_control_smoke.sh`. A focused local run completed in 81
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 170 seconds. Both the host JVM and Doppio
  printed `enter>body>exit:ok:c10:34:stop3`. The focused script verifies
  inline `try/finally` `InlineMarker.finallyStart`/`finallyEnd`, non-local
  return lowering, `crossinline` Runnable classes, retained `noinline`
  `Function1` storage, and the noinline lambda `invokedynamic` site.
- A minimal JVM interop annotation smoke compiled in 111 seconds and both the
  host JVM and Doppio printed
  `kt:java:ok7:IllegalArgumentException:fieldconst:top-3:o5obj:5:11111111`.
  The repo smoke now includes the same path and completed in 240 seconds with
  the full classpath. Java reflection and `javap` verified `@file:JvmName`,
  `@JvmName`, `@JvmStatic`, `@JvmField`, `const val`, `@Throws`, `@Volatile`,
  and `@Synchronized` lowering into static members, exception metadata,
  volatile fields, and synchronized methods.
- A dynamic-proxy/reflection smoke is now split into
  `classes/kotlin_proxy_smoke` and run through `ci/kotlin_proxy_smoke.sh`. A
  focused local run completed in 73 seconds and a follow-up run through the
  remaining full-classpath `ci/kotlin_smoke.sh` completed in 395 seconds; both
  the host JVM and Doppio printed
  `iface/transform/value|dyn|KT5|XY3|cba|null|ProxyReflectionService(dyn)|321|true|true|true|transform:2,getLabel:0,transform:2,maybe:1,maybe:1,toString:0,hashCode:0,equals:1`.
  This covers `Proxy.newProxyInstance` for a Kotlin interface, property getter
  dispatch through `InvocationHandler`, direct and reflective proxy method
  invocation, runtime method and parameter annotations compiled with
  `-java-parameters`, proxy `toString`/`hashCode`/`equals` dispatch,
  `Proxy.isProxyClass`, and `Proxy.getInvocationHandler`.
- A Kotlin source-level `java.lang.invoke.MethodHandles` smoke is now split
  into `classes/kotlin_methodhandle_smoke` and run through
  `ci/kotlin_methodhandle_smoke.sh`. It was moved out of the main
  full-classpath source set after local `ci/kotlin_smoke.sh` variance reached
  862 seconds, close to the 900-second compile timeout. The focused smoke keeps
  host JVM and Doppio output comparison while reducing the main smoke's largest
  source file; the split local validation completed the focused MethodHandles
  smoke in 147 seconds and the remaining full-classpath main smoke in 591
  seconds.
  This covers Kotlin-compiled calls to `findStatic`, `findConstructor`,
  `findVirtual`, `findGetter`, `findSetter`, `invokeWithArguments`,
  `MethodHandle.asType`, reference casts, primitive unboxing/widening, boxed
  return adaptation, `Lookup.unreflect`, `unreflectConstructor`,
  `unreflectGetter`, and `unreflectSetter` public success paths, private member
  access-failure behavior, selected `MethodHandles.reflectAs` method,
  constructor, getter, and setter round-trips, `MethodHandles.privateLookupIn`
  private method access plus public-lookup failure behavior, and
  `MethodType.toMethodDescriptorString()`.
- The same Kotlin MethodHandles smoke now includes selected combinators:
  `identity`, `constant`, `bindTo`, `insertArguments`, `dropArguments`,
  `filterArguments`, `filterReturnValue`, `permuteArguments`,
  `guardWithTest`, `catchException`, `exactInvoker`, `invoker`,
  `spreadInvoker`, `collectArguments`, zero-position and selected nonzero-position
  `foldArguments`, `explicitCastArguments`, `arrayElementGetter`,
  `arrayElementSetter`, `throwException`, selected `MethodHandle.asCollector`,
  `asSpreader`, `asVarargsCollector`, and `asFixedArity` adapter flows, and
  Java 17 public overlays `zero`, `empty`, `arrayLength`, `arrayConstructor`,
  `dropArgumentsToMatch`, `dropReturn`, selected `tryFinally` flows, and
  selected `tableSwitch` selector/fallback flows, and selected
  `whileLoop`/`doWhileLoop`/`countedLoop` non-`void` state loops, including
  both counted-loop overloads, with descriptor-string checks for the adapted
  shapes. The
  Java 17 overlays are reached by reflection so the smoke exercises runtime
  discovery and invocation without requiring the Kotlin source frontend to
  hard-code those signatures. This extends the source-level Kotlin coverage
  after the matching Java 17 fixtures passed native-JVM and Doppio comparison.
- A focused Kotlin mutable delegated-property smoke now lives in
  `classes/kotlin_mutable_delegate_smoke` and runs through
  `ci/kotlin_mutable_delegate_smoke.sh`. A focused local run completed in 183
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 347 seconds. Both the host JVM and Doppio
  printed
  `bind:primary:MutableDelegateOwner:primary:0|bind:primary:MutableDelegateOwner:primary:30|alt:secondary:MutableDelegateOwner:secondary:30|local:local:top:local:0|local:local:top:local:10`.
  `javap` verified `provideDelegate`, `getValue`, `setValue`, generated
  `$$delegatedProperties`, and mutable property-reference lowering through
  `MutablePropertyReference0Impl` and `MutablePropertyReference1Impl`.
- A focused Kotlin JVM interop smoke now lives in
  `classes/kotlin_jvm_interop_smoke` and runs through
  `ci/kotlin_jvm_interop_smoke.sh`. A focused local run completed in 98
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 240 seconds. Both the host JVM and Doppio
  printed
  `kt:java:ok7:IllegalArgumentException:fieldconst:top-3:o5obj:5:11111111`.
  Runtime reflection verifies `@JvmStatic`, `@JvmField`, `const val`,
  `@Volatile`, `@Synchronized`, top-level `@JvmName`, object static access,
  declared exception metadata, and Java parameter metadata.
- A focused Kotlin callable-reference/sequence smoke now lives in
  `classes/kotlin_reference_sequence_smoke` and runs through
  `ci/kotlin_reference_sequence_smoke.sh`. A focused local run completed in
  155 seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 226 seconds. Both the host JVM and Doppio
  printed `a2|b7|c4|d9:20:8:7:10`. This covers top-level callable
  references, bound and unbound member references, constructor references,
  companion references, `generateSequence`, `map`, `filter`, `flatMap`,
  `zip`, `joinToString`, and `fold`.
- A focused Kotlin annotation reflection smoke now lives in
  `classes/kotlin_annotation_reflection_smoke` and runs through
  `ci/kotlin_annotation_reflection_smoke.sh`. A focused local run completed in
  96 seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 167 seconds. Both the host JVM and Doppio
  printed `class:field:getter:ctor,_:method:arg:kt3`. It verifies runtime
  annotation retention on classes, fields, property getters, constructor
  parameters, functions, and value parameters through Java reflection with
  Kotlin output compiled using `-java-parameters`.
- A focused Kotlin captured-class shape smoke now lives in
  `classes/kotlin_capture_shape_smoke` and runs through
  `ci/kotlin_capture_shape_smoke.sh`. A focused local run completed in 97
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 186 seconds. Both the host JVM and Doppio
  printed `234:yx:true:11:45|89:yx:true:8:5`. `javap` verified captured
  local-class fields, anonymous `Runnable` object
  lowering, inner-class `this$0`, nested companion construction, and generated
  `access$mix` / `access$getSecret$p` synthetic accessors.
- A focused Kotlin reflection-shape smoke now lives in
  `classes/kotlin_reflection_shape_smoke` and runs through
  `ci/kotlin_reflection_shape_smoke.sh`. A focused local run completed in 80
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 396 seconds. It reflects Kotlin nested,
  inner, companion, method-local, companion-local, and anonymous classes
  through Java `Class` metadata, checking declared classes,
  declaring/enclosing classes, enclosing methods, member/local/anonymous flags,
  and anonymous interface metadata on both the host JVM and Doppio.
- A focused Kotlin delegation/bridge smoke now lives in
  `classes/kotlin_delegation_bridge_smoke` and runs through
  `ci/kotlin_delegation_bridge_smoke.sh`. A focused local run completed in 74
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 214 seconds. Both the host JVM and Doppio
  printed
  `text:7|text:5|5x|text:6|z!|az!|apply:Object:Object,describe:String:CharSequence,describe:String:Object|apply:Object:Object,describe:String:Object|echo:Object:Object,read:Object:`.
  Java reflection verified bridge methods at runtime, and `javap` verified
  interface `DefaultImpls`, delegation forwarding fields,
  generic signatures, and `ACC_BRIDGE` / `ACC_SYNTHETIC` methods.
- A focused Kotlin extension/typealias/variance smoke now lives in
  `classes/kotlin_extension_variance_smoke` and runs through
  `ci/kotlin_extension_variance_smoke.sh`. A focused local run completed in 112
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 217 seconds. Both the host JVM and Doppio
  printed
  `5/1/5:1|5|3|p0:b:1,p1:aa:2|kt:2|ktxy|1,2|kt:2|xy:2|n:Integer,s:String,z:null`.
  `javap` verified top-level extension receiver methods,
  the `bump$default` default-argument bridge, extension property accessors,
  `ScoreMap` and `PairList` typealias metadata, generic class signatures,
  use-site variance and star-projection `Signature` attributes, and the
  inlined `sortedBy` comparator class.
- A focused Kotlin receiver-lambda smoke now lives in
  `classes/kotlin_receiver_lambda_smoke` and runs through
  `ci/kotlin_receiver_lambda_smoke.sh`. A focused local run completed in 83
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 230 seconds. Both the host JVM and Doppio
  printed `s|[a]|kn|<GO>|x1|(xy)|{q}|ad|text`. The smoke script now asserts
  with `javap -v` that the generated classfile contains `InvokeDynamic`
  entries backed by `LambdaMetafactory`, `ExtensionFunctionType` metadata, and
  the runtime-visible receiver-parameter annotation used by the extension
  receiver.
- A focused Kotlin control-flow smoke now lives in
  `classes/kotlin_control_flow_smoke` and runs through
  `ci/kotlin_control_flow_smoke.sh`. A focused local run completed in 100
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 235 seconds. Both the host JVM and Doppio
  printed
  `16|1:2:2,1:4:4,2:1:2,2:2:4,2:3:6,2:4:8,3:2:6#6|p357|q46|ok1:neg1:For input string: "x":ok7|2:ccc`.
  `javap` verified tailrec/default bridges, labeled loop lowering, local
  default-vararg helpers, spread-array calls, inline
  `runCatching` / `fold`, labeled `return@` lowering, `Exception table`
  entries, and `StackMapTable` metadata.
- A focused Kotlin initialization/delegate smoke now lives in
  `classes/kotlin_initialization_delegate_smoke` and runs through
  `ci/kotlin_initialization_delegate_smoke.sh`. A focused local run completed
  in 77 seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 277 seconds. Both the host JVM and Doppio
  printed
  `false/true|KT:5:1|KT:5:1|kt|2/9/6|companion>observed:start->kt>guarded:2?1>guarded:2?9>lazy>nested`.
  `javap` verified `lateinit` accessors and
  `throwUninitializedPropertyAccessException`, `Delegates.notNull`,
  `observable`, `vetoable`, `LazyThreadSafetyMode.NONE`, `LazyKt.lazy`,
  `$$delegatedProperties`, `MutablePropertyReference1Impl`, inlined delegate
  classes, companion/nested object initialization, and `StackMapTable`
  metadata.
- A focused Kotlin collection-builder smoke now lives in
  `classes/kotlin_collection_builder_smoke` and runs through
  `ci/kotlin_collection_builder_smoke.sh`. A focused local run completed in 89
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 277 seconds. Both the host JVM and Doppio
  printed
  `24678|k0=4,k1=16,k2=36,k3=49,k4=64|e=20,o=7|12,21,8|24|67|8|678/24|2:4;4:6;6:7|abc|22,44,66,77,88|1:3:7:13:20:28|71|2,1,0,9`.
  `javap` verified `CollectionsKt.createListBuilder` / `build`,
  `MapsKt.createMapBuilder` / `build`, `SetsKt.createSetBuilder` / `build`,
  inlined `groupingBy`, `fold`, `windowed`, `chunked`, `partition`,
  `zipWithNext`, `flatten`, `associateWith`, `runningFold`, `reduceIndexed`,
  `toSortedMap`, `invokedynamic` `Function1` lambdas, `StackMapTable`, and
  `kotlin.Metadata`.
- A focused Kotlin sequence-builder smoke now lives in
  `classes/kotlin_sequence_builder_smoke` and runs through
  `ci/kotlin_sequence_builder_smoke.sh`. A focused local run completed in 78
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 290 seconds. Both the host JVM and Doppio
  printed
  `1:2|start>after1|0=3,1=8,2=10|start>after1>start>after1>afterAll>done|abcd|789/IllegalStateException|3,6,12,24|xyyzzz:23`.
  `javap` verified `SequencesKt.sequence`, `iterator`, `asSequence`,
  `constrainOnce`, `generateSequence`, `windowed`, `onEach`, `zipWithNext`,
  generated `RestrictedSuspendLambda` classes, `SequenceScope.yield` /
  `yieldAll`, `Continuation`, `invokeSuspend`, `COROUTINE_SUSPENDED`,
  `ResultKt.throwOnFailure`, `DebugMetadata`, `StackMapTable`, and
  `kotlin.Metadata`.
- A focused Kotlin Result/exception smoke now lives in
  `classes/kotlin_result_exception_smoke` and runs through
  `ci/kotlin_result_exception_smoke.sh`. A focused local run completed in 103
  seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 336 seconds. Both the host JVM and Doppio
  printed
  `44|12|IllegalStateException/99/77|0=ok44,1=errIllegalStateException:again,2=errUnsupportedOperationException:manual|6:body>recover:inner>finally|IllegalArgumentException:root|two|enter:a>ok:a>mapped:44>enter:b>fail:b:ResultSmokeException:boom>recover:boom>enter:c>ok:c>recoverCatching:bad4>else:again`.
  `javap` verified `Result.constructor-impl`, `ResultKt.createFailure`,
  `Result.isSuccess-impl`, `Result.isFailure-impl`,
  `Result.exceptionOrNull-impl`, `Result.box-impl`, `Result.unbox-impl`,
  `ResultKt.throwOnFailure`, exception tables for inline `runCatching` /
  `mapCatching` / `recoverCatching` / `try` / `finally`, `StackMapTable`,
  and `kotlin.Metadata`.
- A focused Kotlin text/regex smoke now lives in
  `classes/kotlin_text_regex_smoke` and runs through
  `ci/kotlin_text_regex_smoke.sh`. A focused local run completed in 114 seconds
  and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 352 seconds. Both the host JVM and Doppio
  printed
  `0:a:2:0-2,1:bb:25:5-9,2:c:457:12-16|A:1; BB:32; C:654; bad=x|first b=2|a|bb|c|0:5:a,1:6:b,2:5:g|KT/42|true|KOTin`.
  `javap` verified `Regex.findAll`, JDK 8 named-group extension lookup,
  lazy `SequencesKt.mapIndexed` / `joinToString`, transform replacement,
  `Regex.replaceFirst`, `Regex.split`, `StringsKt.lineSequence`,
  `MatchResult.Destructured`, `RegexOption` set construction,
  `StringsKt.replaceRange`, `LambdaMetafactory` bootstrap methods for the
  Kotlin lambdas, `StackMapTable`, and `kotlin.Metadata`.
- A focused Kotlin duration smoke now lives in `classes/kotlin_duration_smoke`
  and runs through `ci/kotlin_duration_smoke.sh`. A focused local run completed
  in 85 seconds and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 343 seconds. Both the host JVM and Doppio
  printed
  `3250|0,500,1500,1250|-1000,0,1500,3000|1|2.0|1250|2250|3|true:true:true`.
  It covers Kotlin `Duration` value-class arithmetic, `runningFold`,
  sorting/comparison, nanosecond-to-microsecond conversion, duration division,
  ISO parsing, scaling, range coercion, and finite/infinite checks.
- A focused Kotlin I/O smoke now lives in `classes/kotlin_io_smoke` and runs
  through `ci/kotlin_io_smoke.sh`, comparing the generated output on both the
  host JVM and Doppio. The split local validation completed the focused smoke
  in 229 seconds and the remaining full-classpath main smoke in 578 seconds.
- The focused I/O smoke includes file I/O helpers; both runtimes print
  `0:5:a,1:4:b,2:5:g|aaa|input.txt:17,nested/out.txt:17|616c706861|txt/out/nested/out.txt|true/true`.
  `javap` verified `FilesKt.writeText`, `appendText`, `readLines`,
  `useLines`, `copyTo`, `walkTopDown`, `relativeTo`,
  `getInvariantSeparatorsPath`, `readBytes`, `CloseableKt.closeFinally`,
  `LambdaMetafactory` bootstrap methods for Kotlin lambdas, `StackMapTable`,
  and `kotlin.Metadata`.
- The focused I/O smoke includes NIO path coverage; both runtimes print
  `0:5:d,1:7:e,2:4:z|64656c74|-1/5/5/-1|input.txt:false,nested:true|input.txt:19,nested/moved.txt:19|input.txt/runtime-nio/nested/moved.txt|true/true/true/true/true`.
  `javap` verified `Paths.get`, `Files.exists`, `createDirectories`, `write`,
  `readAllLines`, `readAllBytes`, `copy`, `move`, `Files.mismatch`, `list`,
  `walk`, `isDirectory`, `isRegularFile`, `size`, and `isSameFile`, explicit
  stream close paths in `finally` blocks, `LambdaMetafactory` bootstrap
  methods for Kotlin lambdas, `StackMapTable`, and `kotlin.Metadata`.
- The focused I/O smoke includes `MappedByteBuffer` coverage; both runtimes
  print
  `aZcdYf:aZRSYf:ZRS:true:true:true:true:true:true:IndexOutOfBoundsException:0:true:true`.
  This covers mmap `load`, full-buffer `force`, reflection-backed range
  `force`, read-only mappings, empty mappings, and range validation.
- A focused Kotlin concurrency smoke now lives in
  `classes/kotlin_concurrency_smoke` and runs through
  `ci/kotlin_concurrency_smoke.sh`. A focused local run completed in 85 seconds
  and a follow-up run through the remaining full-classpath
  `ci/kotlin_smoke.sh` completed in 368 seconds. Both the host JVM and Doppio
  printed
  `a=123,b=12,c=89|true|true:y:Y11|abc:false:true:1|main:11/worker:3/main:11/main:11|locked:3:hold:1:true|k=1,z=12|11`.
  `javap` verified `ConcurrentHashMap.computeIfAbsent`, `compute`, `merge`,
  `putIfAbsent`, `replace`, `AtomicInteger`, `AtomicReference.compareAndSet`,
  `getAndUpdate`, `updateAndGet`, `CopyOnWriteArrayList.addIfAbsent`,
  `addAllAbsent`, `ThreadLocal.withInitial`, `Thread.start` / `join`,
  `ReentrantLock` lowered through `Lock.lock` / `unlock`, synchronized map
  `monitorenter` / `monitorexit`, `LambdaMetafactory`, `StackMapTable`, and
  `kotlin.Metadata`.
- The focused I/O smoke includes classpath resource lookup; both runtimes print
  `ffffff|4:cafebabe|1:1:true|true:true:true`. This covers Kotlin-generated
  class and module resource discovery while avoiding environment-specific
  absolute paths in the expected output. `javap` verified
  `Class.getClassLoader`, `ClassLoader.getSystemClassLoader`, thread context
  classloader get/set/restore, `ClassLoader.getResource`,
  `ClassLoader.getSystemResource`, `ClassLoader.getResources`,
  `Class.getResource`, `URL.openStream`, `Collections.list`,
  `URL.toExternalForm`, exception-table-backed context restoration,
  `LambdaMetafactory`, `StackMapTable`, and `kotlin.Metadata`.
- The focused I/O smoke includes `ServiceLoader` provider discovery; both
  runtimes print
  `alpha=7,beta=11|2|alpha=7,beta=11|AlphaServiceLookupPlugin>BetaServiceLookupPlugin|true`.
  The CI script now creates a generated `META-INF/services/ServiceLookupPlugin`
  resource next to the compiled Kotlin classes, including a comment and a
  duplicate provider line. `javap` verified `ServiceLoader.load`,
  `ServiceLoader.iterator`, `ServiceLoader.reload`, iterator-to-sequence
  lowering through `SequencesKt.asSequence` / `toList`, provider interface
  dispatch, public no-arg provider constructors, duplicate-provider collapse,
  fresh instances after `reload`, `LambdaMetafactory`, `StackMapTable`, and
  `kotlin.Metadata`.
- The focused I/O smoke includes jar/zip classpath behavior; both runtimes
  print
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
- A focused unsigned Kotlin smoke now lives in `classes/kotlin_unsigned_smoke`
  and runs through `ci/kotlin_unsigned_smoke.sh`. It covers `UInt`, `ULong`,
  `UByte`, unsigned-array construction, wraparound arithmetic, unsigned
  sorting, filtering, map lookup by unsigned keys, and byte-to-hex rendering.
  Both the host JVM and Doppio print
  `3:4:0fa0ff:2,9,18446744073709551615:4294967295,4:wrap:true:true`.
  A local 2026-06-30 validation completed the focused unsigned smoke in 92
  seconds and the remaining full-classpath Kotlin compiler smoke in 527
  seconds.
- A focused Kotlin source-level `CompletableFuture` smoke now lives in
  `classes/kotlin_completable_future_smoke` and runs through
  `ci/kotlin_completable_future_smoke.sh`. It covers Java SAM conversion into
  `CompletableFuture.supplyAsync`, executor-backed asynchronous completion,
  `thenApply`, `thenCompose`, `handle`, `thenCombine`, `applyToEither`,
  `allOf`, `join`, and timed `get`. Both the host JVM and Doppio print
  `KT2!:5:l`. A local 2026-06-30 validation completed the focused
  CompletableFuture smoke in 74 seconds and the remaining full-classpath
  Kotlin compiler smoke in 404 seconds.
- A focused Kotlin contracts smoke now lives in `classes/kotlin_contract_smoke`
  and runs through `ci/kotlin_contract_smoke.sh`. It covers
  `ExperimentalContracts`, `returns` implications, `callsInPlace` with
  `AT_MOST_ONCE` and `EXACTLY_ONCE`, inline contract functions, nullable smart
  casts in the caller, and lambda capture through an exactly-once block. Both
  the host JVM and Doppio print `KT2|missing|before>body7>after|7|1002`.
  A local 2026-06-30 validation completed the focused contracts smoke in 80
  seconds and the remaining full-classpath Kotlin compiler smoke in 385
  seconds.
- A focused enum-polymorphism smoke now lives in `classes/kotlin_enum_smoke`
  and runs through `ci/kotlin_enum_smoke.sh`. It covers enum constants with
  class bodies, overridden properties and methods, `Enum.entries`,
  `enumValues`, `enumValueOf`, `valueOf`, and `when` dispatch over those
  constants. Both the host JVM and Doppio print
  `A1B3G5|tk2|X1,x2,xxx3|low/high/high|IllegalArgumentException`.
  A local 2026-06-30 validation completed the focused enum smoke in 83
  seconds and the remaining full-classpath Kotlin compiler smoke in 388
  seconds.
- A focused Kotlin bytecode-runtime smoke now lives in
  `classes/kotlin_bytecode_runtime_smoke` and runs through
  `ci/kotlin_bytecode_runtime_smoke.sh`. A focused local run completed in 135
  seconds. Both the host JVM and Doppio printed
  `try>catch>finally:boom:8:true:body/close:x3:10:12:4:sync:BytecodeSmoke.kt:true`.
  This covers Kotlin lowering for `try`/`catch`/`finally`, `Closeable.use`
  including close-failure suppressed-exception preservation, destructuring via
  `componentN`, `1..n` loops, stepped `downTo` loops, `mapIndexed`,
  `synchronized`, and generated `LineNumberTable` metadata flowing into
  Doppio stack-trace frames with Kotlin source filenames and positive line
  numbers.

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
   sources, and split very large or high-risk surfaces into focused smoke
   scripts when that preserves coverage and reduces timeout variance.
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
