# Scala Compiler Bring-Up

This document tracks the shortest path to running the upstream Scala compiler
on this Doppio fork. The first target is a Scala 2.13 compiler smoke that
compiles a small source set under Doppio and then runs the generated classes on
both the host JVM and Doppio.

## Baseline

- Scala compiler version: 2.13.18.
- Dependency source: Maven Central `org.scala-lang:scala-compiler`, plus
  `scala-library`, `scala-reflect`, `java-diff-utils`, and JLine with the
  `jdk8` classifier.
- Compiler entry point:

```sh
node --max-old-space-size=4096 --no-deprecation build/release-cli/console/runner.js \
  -cp "$SCALA_COMPILER_CLASSPATH" \
  scala.tools.nsc.Main \
  -classpath "$SCALA_LIBRARY_JAR" \
  -d "$OUT_DIR" \
  classes/scala_smoke/*.scala
```

## Initial Smoke Scope

The first source fixture covers a deliberately small Scala 2.13 slice:

- top-level sealed trait and case objects;
- sealed ADTs with case classes and guarded pattern matching;
- a generic case class;
- a trait with a default method;
- an anonymous class;
- closures, `List` pipelines, `Vector`, `Map.collect`, tuple pattern matching,
  `Option`, and `Either`;
- `PartialFunction.collect`, for-comprehension desugaring, `lazy val`, and
  `try`/`catch`/`finally`;
- a focused Scala library/lowering smoke covering `groupMapReduce`, implicit
  value classes, default arguments, case-class `copy`, `@tailrec`, varargs
  with `ClassTag`, `Try`, and tuple ordering;
- a focused Scala package/reflection smoke covering package object
  initialization, package-scoped classes/objects, `Enumeration`,
  `@BeanProperty`, Java reflection over Scala-generated members, specialized
  class generation, and specialized generic `Signature` metadata;
- a focused Scala macro smoke covering two-phase Scala 2 macro expansion using
  `scala.reflect.macros.blackbox`, where the macro implementation is compiled
  first under Doppio and then used by a second Doppio-hosted scalac invocation;
- a focused Scala StackWalker smoke covering source-level Java `StackWalker`
  retained-class-reference frame descriptor and `MethodType` metadata plus the
  no-retain `getMethodType` guard;
- a focused `scala-reflect` runtime universe smoke covering runtime mirror
  creation, `typeOf`, constructor/member symbol lookup, case-accessor
  discovery, and static class lookup;
- a focused Scala 2.13 collection-library smoke covering `LazyList`, extractor
  `unapply`, `Regex`, `TreeMap`, `ArraySeq`, `groupMap`, map views, and
  right-biased `Either`;
- a focused Scala functional/library smoke covering `Function.chain`, composed
  function adapters, `Option.when`/`Option.unless`, `Using.resource`,
  close-failure suppressed-exception preservation, `Try.map`/`filter`/
  `recover`, `Either.cond`, `partitionMap`, and lambda-heavy classfile
  emission;
- a focused Scala language/type-system smoke covering path-dependent types,
  higher-kinded implicit typeclass lookup, self-types, by-name argument
  evaluation, extractor matching, and `@switch` lowering;
- a focused Scala Java collection/Future interop smoke covering
  `scala.jdk.CollectionConverters`, mutable Java list/map wrappers, and a
  small `Future`/`Promise`/`Await` path running on a Java executor;
- a focused Scala concurrency smoke covering Java concurrency interop through
  `CompletableFuture` chaining and recovery, `ConcurrentHashMap` compute/merge
  paths, atomics, `CopyOnWriteArrayList`, `ThreadLocal`, `ReentrantLock`, and
  synchronized Java maps;
- a focused source-level `java.lang.invoke.MethodHandles` smoke for selected
  static, virtual, and constructor lookup, `MethodHandle.asType`,
  `invokeWithArguments`, and basic combinators including `bindTo`,
  `insertArguments`, `dropArguments`, `filterReturnValue`, and
  `guardWithTest`, plus reflection-discovered Java 17 overlay helpers and
  array collector/spreader adapter flows;
- a focused Scala I/O smoke covering runtime JAR/ZIP/classpath resource reads
  through `JarOutputStream`, `JarFile`, `ZipInputStream`, and
  `URLClassLoader`, `ServiceLoader` discovery from generated
  `META-INF/services` metadata including duplicate-provider collapse and
  reload, and classpath resource lookup through `Class.getResource`,
  `ClassLoader.getResource`, `getResources`, `getResourceAsStream`,
  `getSystemResource`, and reflection-backed Java 9 `ClassLoader.resources`;
- a focused Scala proxy smoke covering Java dynamic-proxy interop through a
  Scala trait proxy, `InvocationHandler` dispatch, reflective proxy-method
  invocation, runtime method and parameter annotations, proxy `Object` method
  dispatch, `Proxy.isProxyClass`, and `Proxy.getInvocationHandler`;
- a focused Scala annotation smoke covering runtime annotation metadata for
  repeatable Java annotations applied from Scala, enum/class/array-valued
  annotation elements, and Java reflection lookup on Scala-generated classes,
  methods, and parameters;
- a focused Scala reflection-shape smoke covering Java reflection over
  Scala-generated member, method-local, and anonymous classes, including simple
  names, declaring/enclosing classes, enclosing methods, implemented
  interfaces, and member/local/anonymous flags;
- a focused Scala NIO smoke covering reflection-backed Java NIO calls through
  `Path.of(String, String...)`, `Path.of(URI)`, `Files.mismatch`,
  `Files.isSameFile`, and path cleanup through `Files.walk`, with repository
  fixture coverage for hard-link and symbolic-link APIs in
  `classes/modern_test/Java17FilesLinks.java`;
- a focused Scala modern Java interop smoke covering reflection-backed Java 17
  class-library interop for `HexFormat`, `InstantSource`,
  `RandomGeneratorFactory` `Random`/`SplittableRandom` provider output, and
  `Map.Entry.copyOf`, plus reflection-backed Java 16 `Stream.toList()` calls,
  keeping the Scala 2.13 compile classpath on the Java 8 boot surface while
  checking modern runtime overlays;
- a focused Scala duration smoke covering `scala.concurrent.duration` finite
  duration arithmetic, scanning, sorting, parsing, scaling, clamping, and
  infinite-duration metadata;
- string interpolation and a plain `main` entry point.

The smoke compares the generated program output on the host JVM and Doppio.

## Current Boundary: Initial Smoke Passes

The initial Scala 2.13 compiler smoke now passes under Doppio. It compiles the
source fixture, checks the emitted class files, verifies `SourceFile` and
`ScalaSignature` metadata with `javap -v`, and compares generated program
output on the host JVM and Doppio. The smoke now includes Java collection
interop and a small asynchronous `Future` path. A local 2026-06-21 run of the
expanded smoke completed in 303 seconds using Scala
2.13.18.
A local 2026-06-23 run with the language/type-system smoke completed in
488 seconds using Scala 2.13.18.
The Java concurrency interop coverage now lives in
`classes/scala_concurrent_smoke` and runs through
`ci/scala_concurrent_smoke.sh`. It covers `CompletableFuture` chaining and
recovery, `ConcurrentHashMap` compute/merge paths, atomics,
`CopyOnWriteArrayList`, `ThreadLocal`, `ReentrantLock`, and synchronized Java
maps while keeping the main Scala compiler smoke smaller.
A local 2026-06-29 validation completed the focused Scala concurrency smoke in
81 seconds and the remaining main Scala compiler smoke in 313 seconds using
Scala 2.13.18.
`SubmissionPublisher` bounded `offer` now covers direct-executor drop
callbacks, negative drop results, buffered delivery after demand, and invalid
request cancellation. Demand estimate coverage lives in
`classes/modern_test/Java9SubmissionPublisherDemandEstimates.java`; drop and
request coverage lives in
`classes/modern_test/Java9SubmissionPublisherBackpressure.java`. Together they
harden Java Flow interop used by libraries around Scala compiler and build
tests.
The smoke now also covers `scala.concurrent.duration` finite duration
arithmetic, scan/sort paths, string parsing, scaling, clamping, and
finite/infinite metadata. A local 2026-06-24 run with this duration slice
completed in 300 seconds using Scala 2.13.18.
The Scala-compiled reflection-backed Java NIO coverage now lives in
`classes/scala_nio_smoke` and runs through `ci/scala_nio_smoke.sh`. It covers
`Path.of` factories, `Files.mismatch`, `Files.isSameFile`,
`Files.getFileStore` space queries, reflection-backed
`FileStore.getBlockSize()`, and cleanup through `Files.walk`, avoiding
compile-time dependence on newer Java signatures when Scala sees the Java 8
boot surface while keeping the main Scala compiler smoke smaller.
A local 2026-06-29 validation completed the focused Scala NIO smoke in 117
seconds and the remaining main Scala compiler smoke in 540 seconds using Scala
2.13.18.
A local 2026-07-10 validation with `FileStore` coverage completed the focused
Scala NIO smoke in 57 seconds using Scala 2.13.18.
The direct Scala source-level `java.lang.invoke.MethodHandles` smoke now lives
in `classes/scala_methodhandle_smoke` and runs through
`ci/scala_methodhandle_smoke.sh`. It covers selected static, virtual,
constructor, adaptation, basic combinator flows, private-lookup-backed
superclass/interface-default `unreflectSpecial` dispatch, reflection-discovered
Java 17 `MethodHandles` overlay helpers, and selected array
collector/spreader adapter flows that Kotlin already stresses more broadly
while keeping the main Scala compiler smoke output smaller and easier to
isolate. A local 2026-07-10 validation completed the focused MethodHandles
smoke in 109 seconds using Scala 2.13.18. A follow-up 2026-07-10
release-runner validation completed the same focused MethodHandles smoke in
208 seconds using Scala 2.13.18. The previous split validation kept the
remaining main Scala compiler smoke green in 454 seconds using Scala 2.13.18.
The Scala runtime JAR/ZIP, `ServiceLoader`, and classpath resource lookup
coverage now lives in `classes/scala_io_smoke` and runs through
`ci/scala_io_smoke.sh`. The focused smoke writes a manifest-bearing JAR, reads
entries and manifest metadata through `JarFile`, scans the same archive through
`ZipInputStream`, verifies classpath-style resource lookup through
`URLClassLoader`, creates `META-INF/services` metadata for Scala-compiled
provider classes, checks duplicate-provider collapse and reload behavior, and
verifies class-relative, loader-relative, system, enumeration, stream, and Java
9 `ClassLoader.resources` lookup paths from Scala-compiled code while keeping
the main Scala compiler smoke smaller.
A local 2026-06-29 validation completed the focused Scala I/O smoke in 202
seconds and the remaining main Scala compiler smoke in 540 seconds using Scala
2.13.18.
The Java dynamic-proxy interop coverage now lives in
`classes/scala_proxy_smoke` and runs through `ci/scala_proxy_smoke.sh`. It
covers a Scala trait proxy, `InvocationHandler` dispatch, reflective
proxy-method invocation, runtime annotation metadata on the proxied interface
method and parameter, proxy `Object` method behavior, `Proxy.isProxyClass`, and
`Proxy.getInvocationHandler` while keeping the main Scala compiler smoke
smaller.
A local 2026-06-29 validation completed the focused Scala proxy smoke in 79
seconds and the remaining main Scala compiler smoke in 422 seconds using Scala
2.13.18.
The runtime annotation metadata coverage now lives in
`classes/scala_annotation_smoke` and runs through
`ci/scala_annotation_smoke.sh`. It applies repeatable and rich Java runtime
annotations from Scala source and reads class, method, and parameter metadata
through Java reflection, including enum, class, and primitive-array annotation
elements while keeping the main Scala compiler smoke smaller.
A local 2026-06-30 validation completed the focused Scala annotation smoke in
395 seconds and the remaining main Scala compiler smoke in 484 seconds using
Scala 2.13.18.
The Scala-generated class-shape reflection coverage now lives in
`classes/scala_reflection_shape_smoke` and runs through
`ci/scala_reflection_shape_smoke.sh`. It reflects member, method-local, and
anonymous classes through Java `Class` metadata, checking simple names,
declaring/enclosing classes, enclosing methods, implemented interfaces, and
member/local/anonymous flags while keeping the main Scala compiler smoke
smaller.
A local 2026-06-30 validation completed the focused Scala reflection-shape
smoke in 90 seconds and the remaining main Scala compiler smoke in 405 seconds
using Scala 2.13.18.
The reflection-backed modern Java interop coverage now lives in
`classes/scala_modern_interop_smoke` and runs through
`ci/scala_modern_interop_smoke.sh`. It checks Java 17 `HexFormat`,
`InstantSource`, seeded `RandomGeneratorFactory` `Random`/`SplittableRandom`
provider output, and `Map.Entry.copyOf` snapshot behavior from
Scala-compiled code, plus a reflection-backed Java 16 `Stream.toList()` call
with an unmodifiable-result check while keeping the main Scala compiler smoke
smaller.
A local 2026-06-30 validation completed the focused Scala modern interop smoke
in 73 seconds and the remaining main Scala compiler smoke in 337 seconds using
Scala 2.13.18.
The Scala duration coverage now lives in `classes/scala_duration_smoke` and
runs through `ci/scala_duration_smoke.sh`. It covers finite duration
arithmetic, scan/sort paths, string parsing, scaling, clamping, and
finite/infinite metadata while keeping the main Scala compiler smoke smaller.
A local 2026-06-30 validation completed the focused Scala duration smoke in 81
seconds and the remaining main Scala compiler smoke in 353 seconds using Scala
2.13.18.
The Scala StackWalker coverage now lives in `classes/scala_stackwalker_smoke`
and runs through `ci/scala_stackwalker_smoke.sh`. It checks retained
class-reference frame descriptor and `MethodType` metadata plus the no-retain
`getMethodType` guard while keeping the main Scala compiler smoke smaller.
A local 2026-06-30 validation completed the focused Scala StackWalker smoke in
58 seconds and the remaining main Scala compiler smoke in 310 seconds using
Scala 2.13.18.
The `scala-reflect` runtime universe coverage now lives in
`classes/scala_reflect_smoke` and runs through `ci/scala_reflect_smoke.sh`. It
checks runtime mirror creation, `typeOf`, constructor/member symbol lookup,
case-accessor discovery, and static class lookup while keeping the main Scala
compiler smoke smaller.
A local 2026-06-30 validation completed the focused Scala runtime reflection
smoke in 76 seconds and the remaining main Scala compiler smoke in 250 seconds
using Scala 2.13.18.
The Scala functional/library coverage now lives in
`classes/scala_functional_smoke` and runs through
`ci/scala_functional_smoke.sh`. It checks `Function.chain`, composed function
adapters, `Option.when`/`Option.unless`, `Using.resource` including
close-failure suppressed-exception preservation, `Try` recovery, `Either.cond`,
`partitionMap`, and generated `InvokeDynamic` entries backed by
`LambdaMetafactory` while keeping the main Scala compiler smoke smaller.
A local 2026-07-03 validation completed the focused Scala functional smoke in
153 seconds using Scala 2.13.18.
The Scala collection-library coverage now lives in
`classes/scala_collection_smoke` and runs through
`ci/scala_collection_smoke.sh`. It checks `LazyList`, extractor `unapply`,
`Regex`, `TreeMap`, `ArraySeq`, `groupMap`, map views, and right-biased
`Either` while keeping the main Scala compiler smoke smaller.
A local 2026-06-30 validation completed the focused Scala collection smoke in
80 seconds and the remaining main Scala compiler smoke in 225 seconds using
Scala 2.13.18.
The Scala language/type-system coverage now lives in
`classes/scala_language_smoke` and runs through
`ci/scala_language_smoke.sh`. It checks path-dependent types, higher-kinded
implicit typeclass lookup, self-types, by-name argument evaluation, extractor
matching, value-class extension methods, structural refinement dispatch, and
`@switch` lowering while keeping the main Scala compiler smoke smaller.
A local 2026-07-10 validation completed the focused Scala language smoke in
220 seconds using Scala 2.13.18.
The Scala library/lowering coverage now lives in
`classes/scala_library_smoke` and runs through `ci/scala_library_smoke.sh`. It
checks `groupMapReduce`, implicit value classes, default arguments, case-class
`copy`, `@tailrec`, varargs with `ClassTag`, `Try`, and tuple ordering while
keeping the main Scala compiler smoke smaller.
A local 2026-06-30 validation completed the focused Scala library smoke in 78
seconds and the remaining main Scala compiler smoke in 206 seconds using Scala
2.13.18.
The Scala Java collection/Future interop coverage now lives in
`classes/scala_interop_smoke` and runs through `ci/scala_interop_smoke.sh`. It
checks `scala.jdk.CollectionConverters` wrappers for mutable Java lists and
maps plus a small `Future`/`Promise`/`Await` path on a Java executor, while
keeping the main Scala compiler smoke smaller.
A local 2026-06-30 validation completed the focused Scala interop smoke in 63
seconds, the focused Scala package/reflection smoke in 140 seconds, and the
remaining main Scala compiler smoke in 379 seconds using Scala 2.13.18.
The Scala package/reflection coverage now lives in
`classes/scala_package_smoke` and runs through `ci/scala_package_smoke.sh`. It
checks package object initialization, package-scoped classes and objects,
`Enumeration`, `@BeanProperty`, Java reflection over Scala-generated members,
specialized class generation, and specialized generic `Signature` metadata
while keeping the main Scala compiler smoke smaller.

The Scala macro coverage now lives in `classes/scala_macro_use_smoke` and runs
through `ci/scala_macro_smoke.sh`. It keeps the two-phase macro path intact:
Doppio-hosted scalac first emits a blackbox macro implementation class from
`classes/scala_macro_smoke`, then a second Doppio-hosted scalac pass expands
calls from the macro-use source set against that generated classpath entry.
A local 2026-06-30 validation completed the focused Scala macro smoke in 176
seconds and the remaining main Scala compiler smoke in 110 seconds using Scala
2.13.18.

The Scala core smoke now lives in `classes/scala_core_smoke` and runs through
`ci/scala_core_smoke.sh`. It covers sealed traits, case classes and objects,
generic case classes, variance, anonymous trait implementation, pattern
matching with guards, for-comprehension lowering, partial functions, `Option`,
`Either`, lazy vals, exception handling, Scala lambdas, and representative Java
`Signature` metadata for a generic case-class method and a generic trait
method. The core smoke also inspects generated classfiles with `javap -v`,
asserts that Scala lambda-heavy classes contain `InvokeDynamic` entries backed
by `LambdaMetafactory`, and checks debug/source metadata plus Scala-specific
`ScalaSignature`, `ScalaInlineInfo`, and `ScalaSig` attributes. A local
2026-07-02 validation completed the focused
Scala core smoke in 154 seconds and the remaining main Scala compiler smoke in
68 seconds using Scala 2.13.18. The main smoke now keeps the full compiler
classpath stress while compiling only a minimal `Hello` program that prints
`scala`.

`ci/scala_diagnostic_smoke.sh` runs Doppio-hosted scalac on an intentionally
invalid source pair and checks the nonzero exit status plus diagnostic source
filenames, line numbers, type-mismatch found/required types, missing-member
error kind, source lines, caret positions, and multi-error count.

`ci/scala_record_smoke.sh` compiles a Java 17 record support class with the
host JDK, then runs Doppio-hosted scalac on a focused Scala interop source that
consumes the record. The generated Scala program verifies `Class.isRecord()`,
`RecordComponent` metadata, canonical constructor invocation, component
accessor reflection, Scala calls to record accessors, value equality, and the
fork's modern `java.lang.Record` class-library shim. Like the Kotlin record
smoke, it uses a tiny Java 17 helper to direct-call the Java 16 `Class`
methods instead of depending on those runtime overlays as Scala compile-time
APIs.

This is intentionally narrower than the Kotlin smoke. The next Scala compiler
work should expand source coverage and classpath stress after each blocker is
reduced to a focused Java or Scala fixture.

## Fixed Scala Bring-Up Blockers

- Scala 2.13 trait static bridges call interface default methods with
  `invokespecial`. Doppio's non-virtual invoke path previously assumed the
  resolved full-signature method was present on the receiver object. The
  interpreter and JIT now fall back to the resolved declaring class prototype
  while preserving the original receiver as `this`.
- Scala's classfile writer uses `FileChannel.write(ByteBuffer, long)`, which
  reaches `sun.nio.ch.FileDispatcherImpl.pwrite0`. Doppio now implements the
  positional write native without advancing the channel's tracked file
  position. Coverage lives in
  `classes/modern_test/Java17FileChannelPositionalWrite.java`.
- `CompletableFuture` subclass methodrefs now reach Doppio's Java 9/12 helper
  methods, and selected subclass hooks use receiver `newIncompleteFuture()` and
  `defaultExecutor()` for copy and exceptional async recovery paths. Coverage
  lives in `classes/modern_test/Java12CompletableFutureSubclassHooks.java`,
  protecting Scala and build-tool future interop that supplies custom
  executors or subclasses.
- Java NIO link helpers now cover `Files.createLink`, `createSymbolicLink`,
  `readSymbolicLink`, hard-link `isSameFile`, `NOFOLLOW_LINKS` symlink
  existence checks, and dangling symlink cleanup. Coverage lives in
  `classes/modern_test/Java17FilesLinks.java`, protecting compiler and build
  tool paths that inspect linked source or classpath trees.
- `scala-reflect` runtime universe forced the JIT non-virtual invoke fallback
  path. The generated JIT trace previously referenced an out-of-scope
  `methodReference` variable when falling back from the receiver object to the
  resolved declaring-class prototype. The JIT now emits a runtime constant-pool
  method reference local for that fallback, matching the interpreter behavior.
- Compiler-adjacent bytecode loading paths can define classes from
  `ByteBuffer` input. Doppio now implements the Java 17
  `ClassLoader.defineClass(String, ByteBuffer, ProtectionDomain)` direct-buffer
  native without advancing the buffer position. Coverage lives in
  `classes/modern_test/Java17ClassLoaderDefineByteBuffer.java`.
- Direct typed-buffer bulk paths now cover the `java.nio.Bits`
  `copyFrom*Array` and `copyTo*Array` natives for swapped direct
  `ShortBuffer`, `CharBuffer`, `IntBuffer`, `FloatBuffer`, `LongBuffer`, and
  `DoubleBuffer` views. Coverage lives in
  `classes/modern_test/Java17DirectTypedBufferBulk.java`, protecting compiler
  and classfile libraries that stage primitive data through direct buffers.
- `AccessController.doPrivileged(PrivilegedAction)` now handles covariant
  concrete `run()` methods used by JDK privileged actions. Coverage lives in
  `classes/modern_test/Java17CharsetAvailable.java`, protecting
  `Charset.availableCharsets()` and charset-provider enumeration paths used
  during source and classpath decoding.
- `AccessController.getInheritedAccessControlContext()` now exposes the
  current Java thread's inherited access-control context. Coverage lives in
  `classes/modern_test/Java17AccessControlContext.java`, protecting
  privileged compiler/bootstrap actions and `doPrivilegedWithCombiner`
  fallback paths.
- `java.io.File` disk-space queries now cover total, free, and usable space
  for files and directories, plus missing-path zero results. Coverage lives in
  `classes/modern_test/Java17FileSpace.java`, protecting compiler and build
  tool output/cache directory checks.
- NIO `FileStore` disk-space queries now populate total, usable, and
  unallocated space and `getBlockSize()` in Doppio's `Files` shim, with the
  block size coming from host `statfs` when available. The OpenJDK
  `sun.nio.fs.UnixNativeDispatcher.statvfs0` bridge is populated for native
  class-library paths. Coverage lives in
  `classes/modern_test/Java17FileStoreSpace.java`, protecting compiler and
  build-tool output/cache directory checks that use `Files.getFileStore(...)`.
- Default file-system `getFileStores()` enumeration now covers Linux mount-table
  dispatch enough to materialize usable `FileStore` instances. Coverage lives
  in `classes/modern_test/Java17FileSystemStores.java`, protecting compiler and
  build-tool probes that scan all mounted stores before selecting output/cache
  roots.
- `Files.copy(..., COPY_ATTRIBUTES)` now preserves `lastModifiedTime` for
  selected file and directory copies, including replacement. Coverage lives in
  `classes/modern_test/Java11FilesCopyAttributes.java`, protecting compiler and
  build-tool copy/cache paths that rely on timestamp-based freshness checks.
- `Files.copy(..., NOFOLLOW_LINKS)` now copies symbolic-link objects instead
  of dereferencing them, including dangling links. Coverage lives in
  `classes/modern_test/Java17FilesCopyNoFollowLinks.java`, protecting compiler
  and build-tool copy paths that preserve linked source or classpath trees.
- `Files.readAttributes(..., NOFOLLOW_LINKS)` now reports symlink object
  attributes instead of followed-target attributes, including dangling links,
  for class-based, string-based, and basic-view reads. Coverage lives in
  `classes/modern_test/Java17FilesNoFollowLinkAttributes.java`, protecting
  compiler and build-tool scanners that avoid following linked source or
  dependency trees.
- Initial `posix:permissions` `FileAttribute` values are now applied for
  selected file, directory, temp-file, temp-directory, and `newByteChannel`
  creation paths. Coverage lives in
  `classes/modern_test/Java11FilesInitialPosixPermissions.java`, protecting
  compiler and build-cache code that creates restricted temp/output files.
- `java.io.FileInputStream`, `java.io.FileOutputStream`, and
  `java.io.UnixFileSystem` `initIDs()` natives are implemented as VM metadata
  no-ops. Coverage lives in
  `classes/modern_test/Java17IoInitIDs.java`, protecting jar/classpath scans,
  source reads, and incremental output writes.
- `System.mapLibraryName(String)` now maps optional native library base names
  to host-style filenames and preserves null-argument failure behavior.
  Coverage lives in `classes/modern_test/Java17SystemMapLibraryName.java`,
  protecting compiler and build-tool native bridge probes.
- `Thread.dumpThreads()` now materializes stack traces for
  `Thread.getAllStackTraces()` and non-current `Thread.getStackTrace()` calls.
  Coverage lives in `classes/modern_test/Java17ThreadDumpThreads.java`,
  protecting compiler diagnostics and build-tool thread dump paths.
- `Runtime.runFinalization()` and `System.runFinalization()` now return as
  best-effort no-ops when there is no finalizer queue work. Coverage lives in
  `classes/modern_test/Java17RuntimeFinalization.java`, protecting cleanup hooks
  that call finalization opportunistically.
- Unsafe bulk and native-memory paths now cover
  `sun.misc.Unsafe.copyMemory(Object, long, Object, long, long)` for
  `byte[]` to `byte[]`, aligned same-type primitive arrays, overlapping
  ranges, and selected native-memory primitive-array transfers. Coverage lives in
  `classes/modern_test/Java9UnsafeCopyMemoryArrays.java`, which also covers
  `sun.misc.Unsafe.setMemory(Object, long, long, byte)` byte-array,
  aligned primitive-array, and native-memory fills.
  `classes/modern_test/Java9UnsafeCopyMemoryNativePrimitives.java` covers
  selected aligned primitive array native-memory transfers.
  `classes/modern_test/Java9UnsafeNativeMemoryPrimitives.java`
  covers selected native scalar reads/writes for `short`, `char`, `int`,
  `long`, `float`, `double`, and Doppio's 32-bit address model.
  `classes/modern_test/Java9UnsafeSetMemoryPrimitiveArrays.java` covers
  primitive-array byte-pattern fills.
  `classes/modern_test/Java9UnsafeReallocateMemory.java` covers selected
  native-memory growth, shrinkage, allocation-from-zero, and zero-size free
  behavior.

Expected blocker areas:

- compiler classpath scanning and JAR I/O throughput;
- deeper Scala reflection-heavy compiler paths beyond basic macro expansion;
- Java 9+ class-library APIs used from Scala 2.13 on Java 17;
- broader `invokedynamic`/lambda metafactory paths and deeper generic
  signature metadata;
- broader compiler diagnostics and position rendering.

## Test Target

- `ci/scala_smoke.sh` downloads the compiler dependencies into
  `build/scala-smoke-cache`, compiles `classes/scala_smoke/*.scala` under
  Doppio, and compares the generated `Hello` output on native Java and Doppio.
