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
- a multi-file source set using `groupMapReduce`, implicit value classes,
  default arguments, case-class `copy`, `@tailrec`, varargs with `ClassTag`,
  `Try`, and tuple ordering;
- package object initialization, package-scoped classes/objects,
  `Enumeration`, `@BeanProperty`, Java reflection over Scala-generated members,
  and specialized class generation;
- source-level Java `StackWalker` usage covering retained-class-reference frame
  descriptor and `MethodType` metadata plus the no-retain `getMethodType`
  guard;
- `scala-reflect` runtime universe coverage for runtime mirror creation,
  `typeOf`, constructor/member symbol lookup, case-accessor discovery, and
  static class lookup;
- Scala 2.13 collection-library coverage for `LazyList`, extractor `unapply`,
  `Regex`, `TreeMap`, `ArraySeq`, `groupMap`, map views, and right-biased
  `Either`;
- Scala 2.13 functional/library coverage for `Function.chain`, composed
  function adapters, `Option.when`/`Option.unless`, `Using.resource`,
  `Try.map`/`filter`/`recover`, `Either.cond`, and `partitionMap`;
- Scala language/type-system coverage for path-dependent types, higher-kinded
  implicit typeclass lookup, self-types, by-name argument evaluation, extractor
  matching, and `@switch` lowering;
- Java collection interop through `scala.jdk.CollectionConverters`, mutable
  Java list/map wrappers, and a small `Future`/`Promise`/`Await` path running
  on a Java executor;
- Java concurrency interop covering `CompletableFuture` chaining and recovery,
  `ConcurrentHashMap` compute/merge paths, atomics, `CopyOnWriteArrayList`,
  `ThreadLocal`, `ReentrantLock`, and synchronized Java maps;
- a focused source-level `java.lang.invoke.MethodHandles` smoke for selected
  static, virtual, and constructor lookup, `MethodHandle.asType`,
  `invokeWithArguments`, and basic combinators including `bindTo`,
  `insertArguments`, `dropArguments`, `filterReturnValue`, and
  `guardWithTest`;
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
- runtime annotation metadata covering repeatable Java annotations applied
  from Scala, enum/class/array-valued annotation elements, and Java reflection
  lookup on Scala-generated classes, methods, and parameters;
- Java reflection over Scala-generated member, method-local, and anonymous
  classes, including simple names, declaring/enclosing classes, enclosing
  methods, implemented interfaces, and member/local/anonymous flags;
- a focused Scala NIO smoke covering reflection-backed Java NIO calls through
  `Path.of(String, String...)`, `Path.of(URI)`, `Files.mismatch`,
  `Files.isSameFile`, and path cleanup through `Files.walk`;
- reflection-backed Java 17 class-library interop for `HexFormat`,
  `InstantSource`, `RandomGeneratorFactory` `Random`/`SplittableRandom`
  provider output, and `Map.Entry.copyOf`, plus reflection-backed Java 16
  `Stream.toList()` calls, keeping the Scala 2.13 compile classpath on the
  Java 8 boot surface while checking modern runtime overlays;
- `scala.concurrent.duration` finite duration arithmetic, scanning, sorting,
  parsing, scaling, clamping, and infinite-duration metadata;
- two-phase Scala 2 macro expansion using `scala.reflect.macros.blackbox`,
  where the macro implementation is compiled first under Doppio and then used
  by the main source fixture in a second Doppio-hosted scalac invocation;
- string interpolation and a plain `main` entry point.

The smoke compares the generated program output on the host JVM and Doppio.

## Current Boundary: Initial Smoke Passes

The initial Scala 2.13 compiler smoke now passes under Doppio. It compiles the
source fixture, checks the emitted class files, and compares generated program
output on the host JVM and Doppio. The smoke now includes a Scala 2.13
collection/extractor slice covering `LazyList`, extractor `unapply`, `Regex`,
`TreeMap`, `ArraySeq`, `groupMap`, map views, and right-biased `Either`, plus
functional/library coverage for `Function.chain`, composed function adapters,
`Option.when`/`Option.unless`, `Using.resource`, `Try` recovery, `Either.cond`,
and `partitionMap`, plus language/type-system coverage for path-dependent
types, higher-kinded implicit typeclass lookup, self-types, by-name argument
evaluation, extractor matching, and `@switch` lowering, plus Java collection
interop, a small asynchronous `Future` path, and Java concurrency primitives
including `CompletableFuture`, `ConcurrentHashMap`, atomics,
`CopyOnWriteArrayList`, `ThreadLocal`, and `ReentrantLock`. A local
2026-06-21 run of the expanded smoke completed in 303 seconds using Scala
2.13.18.
A local 2026-06-23 run with the language/type-system smoke completed in
488 seconds using Scala 2.13.18.
The smoke now also covers `scala.concurrent.duration` finite duration
arithmetic, scan/sort paths, string parsing, scaling, clamping, and
finite/infinite metadata. A local 2026-06-24 run with this duration slice
completed in 300 seconds using Scala 2.13.18.
The Scala-compiled reflection-backed Java NIO coverage now lives in
`classes/scala_nio_smoke` and runs through `ci/scala_nio_smoke.sh`. It covers
`Path.of` factories, `Files.mismatch`, `Files.isSameFile`, and cleanup through
`Files.walk`, avoiding compile-time dependence on those Java 11/12 signatures
when Scala sees the Java 8 boot surface while keeping the main Scala compiler
smoke smaller.
A local 2026-06-29 validation completed the focused Scala NIO smoke in 117
seconds and the remaining main Scala compiler smoke in 540 seconds using Scala
2.13.18.
The direct Scala source-level `java.lang.invoke.MethodHandles` smoke now lives
in `classes/scala_methodhandle_smoke` and runs through
`ci/scala_methodhandle_smoke.sh`. It covers selected static, virtual,
constructor, adaptation, and basic combinator flows that Kotlin already
stresses more broadly while keeping the main Scala compiler smoke output
smaller and easier to isolate. The split local validation completed the
focused MethodHandles smoke in 77 seconds and the remaining main Scala compiler
smoke in 454 seconds using Scala 2.13.18.
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
The smoke also applies repeatable and rich Java runtime annotations from Scala
source and reads class, method, and parameter metadata through Java reflection,
including enum, class, and primitive-array annotation elements.
It also reflects Scala-generated member, method-local, and anonymous classes
through Java `Class` metadata, checking simple names, declaring/enclosing
classes, enclosing methods, implemented interfaces, and member/local/anonymous
flags.
It now also runs a small reflection-backed Java 17 interop slice from
Scala-compiled code covering `HexFormat`, `InstantSource`, seeded
`RandomGeneratorFactory` `Random`/`SplittableRandom` provider output, and
`Map.Entry.copyOf` snapshot behavior, plus a reflection-backed Java 16
`Stream.toList()` call with an
unmodifiable-result check, then compares the same output on the host JVM and
Doppio.

The smoke also includes a two-phase macro path: Doppio-hosted scalac first
emits a blackbox macro implementation class, then a second Doppio-hosted scalac
pass expands calls from the normal smoke source set against that generated
classpath entry.

The same smoke now inspects generated classfiles with `javap -v` and asserts
that Scala lambda-heavy classes contain `InvokeDynamic` entries backed by
`LambdaMetafactory`. A local 2026-06-22 run of the checked smoke completed in
409 seconds using Scala 2.13.18.
It also asserts representative Java `Signature` metadata for a generic case
class method, a generic trait method, and a specialized generic class method.

`ci/scala_diagnostic_smoke.sh` runs Doppio-hosted scalac on an intentionally
invalid source file and checks the nonzero exit status plus diagnostic source
filename, line number, error kind, found/required types, source line, caret
position, and error count.

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
- Unsafe byte-array bulk copies now cover
  `sun.misc.Unsafe.copyMemory(Object, long, Object, long, long)` for
  `byte[]` to `byte[]`, including overlapping ranges, and selected
  native-memory `byte[]` transfers. Coverage lives in
  `classes/modern_test/Java9UnsafeCopyMemoryArrays.java`, which also covers
  `sun.misc.Unsafe.setMemory(Object, long, long, byte)` byte-array and
  native-memory fills.

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
