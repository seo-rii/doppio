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
- Java collection interop through `scala.jdk.CollectionConverters`, mutable
  Java list/map wrappers, and a small `Future`/`Promise`/`Await` path running
  on a Java executor;
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
and `partitionMap`, plus Java collection interop and a small asynchronous
`Future` path. A local 2026-06-21 run of the expanded smoke completed in
303 seconds using Scala 2.13.18.

The smoke also includes a two-phase macro path: Doppio-hosted scalac first
emits a blackbox macro implementation class, then a second Doppio-hosted scalac
pass expands calls from the normal smoke source set against that generated
classpath entry.

The same smoke now inspects generated classfiles with `javap -v` and asserts
that Scala lambda-heavy classes contain `InvokeDynamic` entries backed by
`LambdaMetafactory`. A local 2026-06-22 run of the checked smoke completed in
409 seconds using Scala 2.13.18.

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

Expected blocker areas:

- compiler classpath scanning and JAR I/O throughput;
- deeper Scala reflection-heavy compiler paths beyond basic macro expansion;
- Java 9+ class-library APIs used from Scala 2.13 on Java 17;
- broader `invokedynamic`/lambda metafactory paths and generic signature
  metadata;
- compiler diagnostics and position rendering.

## Test Target

- `ci/scala_smoke.sh` downloads the compiler dependencies into
  `build/scala-smoke-cache`, compiles `classes/scala_smoke/*.scala` under
  Doppio, and compares the generated `Hello` output on native Java and Doppio.
