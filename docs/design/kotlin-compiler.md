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

- Full `kotlinc/lib/*.jar` classpath: exceeded five minutes, CPU active, no
  class output.
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
minimal `Hello.kt` as the primary blocker. Focus on repeated variance checks,
small source files that add calls, properties, data classes, lambdas, generics,
and annotations, then the full `kotlinc/lib/*.jar` classpath as a stress case.
The current evidence still points at broad compiler throughput, but the first
minimal compile-and-run milestone is now passing.

## Implementation Plan

1. Keep the repo fixture for interface default-method specificity green.
2. Promote the current `/tmp` Kotlin smoke into a repeatable test harness once
   the repository has a practical way to cache or fetch the Kotlin compiler
   artifact in CI without bloating the tree.
3. Build smaller Kotlin smokes that distinguish class declaration, function
   declaration, metadata serialization, standard-library calls, lambdas,
   generics, annotations, and JVM bytecode emission.
4. If a smoke is slow because of repeated Java exceptions, reduce the specific
   exception pattern to a Java fixture before optimizing Doppio. The generic
   lazy `Throwable` stack trace path is already covered.
5. If a smoke diverges semantically, reduce the primitive to a Java fixture
   where possible. If it is Kotlin-compiler-internal behavior, keep a small
   `/tmp` Kotlin smoke and document the exact class/method path before changing
   VM semantics.
6. Rerun the full `kotlinc/lib/*.jar` classpath as a stress check after each
   throughput change that helps the minimal smoke.

## Done Criteria For The First Goal

- `K2JVMCompiler -version` exits with status 0 under Doppio. This is passing.
- A simple `Hello.kt` compiles under Doppio's Kotlin compiler invocation. This
  is passing for the minimal `kotlin-compiler.jar` classpath.
- The resulting class runs on a native JVM and, if feasible, under Doppio. This
  is passing for the generated `HelloKt` class.
- Each compatibility primitive discovered on the path has a focused test in the
  repository rather than only a Kotlin compiler smoke.
