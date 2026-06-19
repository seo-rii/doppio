# Modern Java Compatibility

This fork tracks post-Java-8 compatibility explicitly. The current baseline is
Doppio's Java 8-era runtime and class library. A row marked "not implemented"
means no compatibility claim is made yet, even if a trivial class happens to
run.

## Status Values

- Not implemented: no compatibility support has been merged.
- Parser only: class files can be read, but runtime semantics are not claimed.
- Partial: selected behavior is covered by tests.
- Implemented: the row has targeted runtime tests and no known gaps in scope.

## Version Matrix

| Java | Class-file major | Main compatibility areas | Status | Difficulty |
| --- | ---: | --- | --- | --- |
| 9 | 53 | modules, private interface methods, multi-release JARs, StackWalker, string concat bootstrap, Flow interfaces/`SubmissionPublisher`, `CompletableFuture`, Cleaner, Runtime.Version, `Runtime.version`, `Thread.onSpinWait`, `Reference.reachabilityFence`, `Math`/`StrictMath` wide multiplication and floor division helpers, `Class.getPackageName`, System.Logger, StackTraceElement, ProcessHandle, `InputStream` helpers, `Stream` helpers, `ClassLoader.resources`, `ClassLoader` metadata, `List`/`Set`/`Map` factories, `Objects`/`Optional` helpers, `Enumeration.asIterator`, `Matcher.results`, `Matcher` StringBuilder append overloads, collector composition helpers | Partial: module/package tags, selected `Class.getModule()` unnamed-module behavior including class-loader identity, null descriptor/layer metadata, declaring-package `Module.getPackages()` exposure, mutable package-set copy behavior, and selected null validation, private interface methods, Java 9 multi-release JAR class/resource entry selection including default `JarFile(File)` base-entry parity and classpath-style `URLClassLoader` versioned lookup, selected Java 9 `ClassLoader.resources(String)` behavior covering subclass `getResources` delegation, duplicate URL preservation, empty streams, `NONNULL`/`IMMUTABLE` unknown-size spliterator metadata, one-shot stream reuse failure, null-name rejection before delegation, and `UncheckedIOException` wrapping, selected Java 9 `ClassLoader.getName()`, `getPlatformClassLoader()`, and `isRegisteredAsParallelCapable()` metadata behavior for system, platform, unnamed custom, and explicitly parallel-capable loaders, basic `StringConcatFactory` concat including tested wide-slot `long` argument packing, boxed primitive object arguments, observable user-object and null reference conversion, and static recipe `Class` constants for ordinary classes, interfaces, arrays, `MethodType`, and `MethodHandle`, Java 9 `Flow` nested interface loading, dispatch, and `defaultBufferSize()`, selected direct-executor `SubmissionPublisher` rounded capacity, subscription tracking, publish/offer/consume/close/error/validation behavior, selected Java 9 `CompletableFuture` factory/minimal-stage/instance additions, Java 9 `Enumeration.asIterator()` adapter iteration/exhaustion/remove behavior, selected Java 9 `Matcher.results()` lazy stream behavior including captures, result snapshots, current matcher position, empty results, spliterator metadata, and iterator exhaustion, selected Java 9 `Matcher.appendReplacement(StringBuilder, String)` and `appendTail(StringBuilder)` behavior including builder mutation, returned-object identity, group-reference and quoted replacements, no-match tails, illegal-state failure, and null validation, Java 9 `Cleaner.create()`, `create(ThreadFactory)` factory invocation/null-thread rejection, `register` null validation, and explicit idempotent `Cleanable.clean()`, Java 9 `Runtime.Version.parse` metadata, immutable version list, comparison/equality, validation behavior, cached `Runtime.version()` baseline object, no-op `Thread.onSpinWait()`, no-op `Reference.reachabilityFence(Object)`, selected `Math.multiplyFull(int, int)`/`StrictMath.multiplyFull(int, int)` signed 64-bit product behavior, selected `Math.multiplyHigh(long, long)`/`StrictMath.multiplyHigh(long, long)` signed high-product behavior, selected `Math.floorDiv(long, int)`/`StrictMath.floorDiv(long, int)` and `Math.floorMod(long, int)`/`StrictMath.floorMod(long, int)` sign and zero-divisor behavior, and selected `Class.getPackageName()` behavior for ordinary, nested, local, anonymous, primitive, void, and array classes, Java 9 `System.Logger` nested type loading, `Level` metadata, default log-method delegation/lazy supplier behavior, null validation, disabled logger lazy object/supplier behavior, and selected `System.getLogger` name/type/null-validation and returned-logger null-level validation behavior, selected Java 9 `StackTraceElement` metadata constructor/accessor plus metadata-aware `toString`/`equals`/`hashCode` behavior, selected `StackWalker` caller/frame APIs including `getCallerClass` helper/reflection-frame filtering and `walk` stream closure after the callback returns, Java 9 `InputStream.readAllBytes`, `readNBytes(byte[], int, int)`, and `transferTo`, selected Java 9 object and primitive stream helpers covering `Stream.ofNullable`, three-arg `iterate` on `Stream`/`IntStream`/`LongStream`/`DoubleStream`, ordered sequential object and primitive `takeWhile`/`dropWhile`, primitive `of`/`range`/`rangeClosed` exact-size spliterator metadata, close propagation, and null validation, Java 9 `List.of`, `Set.of`, `Map.of`, `Map.entry`, and `Map.ofEntries` factory coverage with null rejection, null-hostile map/view lookup including the empty-entry-set exception, unmodifiable results, `Set.of` duplicate rejection, and `Map` duplicate-key rejection, tested collector helpers including Java 9 `filtering`/`flatMapping`, Java 8 `mapping`, `collectingAndThen`, `counting`, `minBy`, `maxBy`, `reducing`, numeric collectors, selected `toMap`, selected `toConcurrentMap`, selected `groupingBy`, selected `groupingByConcurrent`, selected `partitioningBy`, null-stream handling, mapped stream closing, characteristics, and null-timing behavior, Java 9 `Objects` null-default laziness and bounds-check helper edge cases, Java 9 object and primitive `Optional` `ifPresentOrElse`/`stream` plus object `Optional.or`, and a minimal `ProcessHandle` shim covering `current()`, `of(pid)`, pid-based identity/equality expectations, `allProcesses()` current/parent visibility, parent-handle `children()`/`descendants()` current-process visibility, empty current-handle traversal streams, non-placeholder current `pid()`, `isAlive()`, `compareTo`, current-process termination guard methods, `supportsNormalTermination()`, and present current-handle `Info` optionals with host argv-backed command, command line, arguments, start instant, and CPU duration snapshots | Medium |
| 10 | 54 | `var` source output parity, minor class-file updates, Runtime.Version accessors, StackFrame descriptor APIs, `List.copyOf`/`Set.copyOf`/`Map.copyOf`, `Collectors.toUnmodifiable*`, `Optional.orElseThrow()`, `Reader.transferTo`, `ByteArrayOutputStream.toString(Charset)`, `PrintStream`/`PrintWriter`/`Scanner` charset constructors | Partial: local-variable type inference, Java 10 `Runtime.Version` `feature`/`interim`/`update`/`patch` accessors, Java 10 `List.copyOf`, `Set.copyOf`, and `Map.copyOf` snapshot/null-rejection/unmodifiable behavior including `Set.copyOf` dedupe and factory-created immutable collection identity preservation without preserving user-created `Collections.unmodifiable*` wrappers, Java 10 `Collectors.toUnmodifiableList`, `toUnmodifiableSet`, and both `toUnmodifiableMap` overloads covering unmodifiable results, null rejection, duplicate-key rejection, duplicate set dedupe, merge behavior, and null-merge removal, no-arg object and primitive `Optional.orElseThrow()`, Java 10 `Reader.transferTo(Writer)` transfer count/output and null-writer rejection, selected `ByteArrayOutputStream.toString(Charset)` decoding/null behavior, selected `PrintStream` and `PrintWriter` charset constructors for `OutputStream`, `File`, and `String` targets including encoding/checkError/null behavior, selected `Scanner` charset constructors for `InputStream`, `File`, `Path`, and `ReadableByteChannel` targets, and `StackFrame.getDescriptor`/`getMethodType` fixtures compiled with `--release 10` including no-retain descriptor access and retained-class-reference `getMethodType` enforcement | Low |
| 11 | 55 | nestmates, `Class` nest reflection, dynamic constants, `InputStream`/`OutputStream` helpers, `Reader`/`Writer` null helpers, `FileReader`/`FileWriter` charset constructors, `ByteArrayOutputStream.writeBytes`, `Collection.toArray(IntFunction)`, `Predicate.not`, `Optional.isEmpty`, `Path.of`, `Files` string helpers, `Character.toString(int)`, `CharSequence.compare`, `Pattern.asMatchPredicate`, `StringBuilder`/`StringBuffer.compareTo`, selected `String` helpers, standard HTTP client dependencies | Partial: Java 11 `InputStream.readNBytes(int)`, `InputStream.nullInputStream`, `OutputStream.nullOutputStream`, `Reader.nullReader` EOF/ready/skip/closed behavior, `Writer.nullWriter`, selected charset-aware `FileReader`/`FileWriter` constructor read/write/append/null behavior, and selected `ByteArrayOutputStream.writeBytes(byte[])` append/copy/null behavior, Java 11 `Collection.toArray(IntFunction)` default method, Java 11 `Predicate.not`, object and primitive `Optional.isEmpty`, `Path.of(String, String...)` and `Path.of(URI)` construction/null-validation behavior, Java 11 `Files.readString`/`writeString` default UTF-8, explicit charset, append/create-new, read-all-bytes, read-all-lines, `Files.lines`, `Files.list`, selected `Files.walk`/`Files.find`, selected `Files.walkFileTree` default and option overload traversal/callback/null-validation behavior including `SKIP_SUBTREE`, root `TERMINATE`, `maxDepth == 0`, and null callback result checks, `newDirectoryStream` including selected brace/bracket glob syntax, selected `newByteChannel` read/write/create/append, parent-target, and option validation behavior, buffered reader/writer, line write helpers including selected validation-order and parent-target behavior, temp-file/temp-directory including null and short prefixes plus missing/non-directory parent validation, cleanup paths, tested `delete`/`deleteIfExists` deletion, missing-path, null, and non-empty-directory failure behavior, tested basic `Files.exists`/`notExists`/`isDirectory`/`isRegularFile`/`isSymbolicLink`/`isHidden`/`size` queries and selected `getFileStore` metadata/space/attribute-view behavior, selected `BasicFileAttributes` `readAttributes` file/directory/missing/null behavior, selected `BasicFileAttributeView` lookup/read/set-time/null-validation behavior, selected `getOwner`/`setOwner` and `FileOwnerAttributeView` current-owner behavior, selected owner POSIX permission get/set/null-validation behavior, selected `PosixFileAttributes` and `PosixFileAttributeView` read/permission-set/null-validation behavior, selected `getAttribute`, `setAttribute`, and string-based `readAttributes` basic-view, owner-view, and POSIX-view behavior including immutable returned maps and invalid attribute names, selected `setAttribute` `lastModifiedTime` behavior, selected extension-based `probeContentType`, timestamp get/set helpers, access queries, and `isSameFile`, tested `createFile`/`createDirectory`/`createDirectories` creation and conflict behavior including parent-file failure, tested input helper parent-target validation, tested `Files.copy` path/input/output overloads including selected file and directory source copying, path-copy and stream-to-path target validation, replacement, and option validation behavior, tested `Files.move` basic file and directory movement, target-parent validation, same-file/replacement/missing-source behavior plus selected `NOFOLLOW_LINKS`/`ATOMIC_MOVE` option acceptance and `COPY_ATTRIBUTES` rejection, `writeString` null-charset validation before `CharSequence.toString()`, `WRITE` without truncation preserving existing file tails, selected output parent-target validation, selected `SYNC`/`DSYNC`/`SPARSE` output option acceptance, tested `DELETE_ON_CLOSE` input/output immediate deletion behavior, rejection of `READ` as an output option without changing file content, and rejection of `WRITE`/`APPEND` as input options, selected `Character.toString(int)` code-point construction and invalid-range behavior, `CharSequence.compare` lexicographic/null behavior, selected `Pattern.asMatchPredicate` full-match/null-input/raw-type behavior, selected `StringBuilder.compareTo` and `StringBuffer.compareTo` lexicographic/mutation/null behavior, selected Java 11 `Class.getNestHost`, `getNestMembers`, and `isNestmateOf` behavior for ordinary host/member/local/anonymous classes, primitives, void, arrays, selected JDK `getNestHost`/non-nestmate checks, and null argument validation, selected Java 11 `String.isBlank`, `strip`, `stripLeading`, `stripTrailing`, `repeat`, and `lines` behavior, HTTP client/request/WebSocket builder metadata including default SSL context availability, cookie/proxy/authenticator/executor optional metadata, SSLParameters defensive copying, `Builder.NO_PROXY` direct proxy selection, and selected builder priority/null validation, plus `HttpRequest.Builder.copy()` snapshot behavior, no-arg/default request builder metadata, `setHeader` replacement, selected `PUT`/`DELETE`/custom method metadata, selected header/method/body validation, and selected `HttpHeaders` case-insensitive lookup/map/filter/immutability behavior, selected `BodyPublishers` content lengths and `fromPublisher` delegation/validation, and selected `BodySubscribers`/`BodyHandlers` byte-array/string/input-stream/line collection including `Content-Type` charset inference for no-arg string and line response handlers, byte-array consumer helpers, explicit-option file writes, `Content-Disposition` filename file-download writes including escaped quoted filename values and tested bad `filename*` rejection, subscriber and line-subscriber forwarding including selected explicit line separators and charset decoding, subscriber completion lifecycle, and publisher bridge delivery, `NestHost`/`NestMembers` metadata, nestmate private access, and selected `CONSTANT_Dynamic` `ConstantBootstraps`, including static-method, interface static-method, `GETSTATIC`/receiver-backed `GETFIELD`, tested `PUTSTATIC` and receiver-backed `PUTFIELD` setter side effects, tested `PUTSTATIC` `CONSTANT_Long` to `double` primitive setter normalization, constructor-target, receiver-backed virtual-target, receiver-backed interface-target, receiver-backed `REF_invokeSpecial` method-target, reference return adaptation, tested method/field `int` return boxing for `invoke`, tested primitive static-argument boxing for `invoke` reference parameters, tested wrapper static-argument unboxing/widening for `invoke` primitive parameters, tested `CONSTANT_Integer` static-argument widening for a `long` method parameter, tested method-target and `GETSTATIC` field-target `int`-to-`long` return widening, tested `void` method-target return adaptation to `null` reference constants, tested reference-array varargs collection, and tested `CONSTANT_Integer` to `long...` varargs component widening | High |
| 12 | 56 | Java 12 class-file runtime baseline, compact number formatting, `ClassDesc`/`ConstantDescs`/constant descriptor APIs, `Class.descriptorString`/`componentType`/`arrayType`, `InputStream.skipNBytes`, `Files.mismatch`, `String.indent`/`transform`, `Collectors.teeing`, `CompletableFuture` exceptional recovery, switch expression preview class output | Partial: class-file major 56 fixture compiled with `--release 12`, selected `CompactNumberFormat` constructor format/parse/null-validation behavior plus selected `NumberFormat.getCompactNumberInstance()` and `getCompactNumberInstance(Locale, Style)` SHORT/LONG US formatting and null-validation behavior, selected `ClassDesc` descriptor/name/display/array/component/resolve behavior including invalid binary/package/class member names, void-array, malformed internal-name, and excessive array-rank descriptor rejection, selected `MethodTypeDesc` construction/descriptor/transformation/resolve behavior, selected `MethodHandleDesc`/`DirectMethodHandleDesc` factory metadata and owner/kind/lookup-descriptor validation, method/getter/setter invocation types, `asType`, selected `resolveConstantDesc` paths for public same-class static/virtual methods, constructors, static/instance fields, and `asType`, `Kind.valueOf` field/interface/class ref-kind mappings, and display behavior, selected `ConstantDescs` `ClassDesc`/`NULL` constants, selected `Class.describeConstable` descriptor/display behavior for ordinary, primitive, array, and void classes, selected `Class.descriptorString()` behavior for ordinary, nested, local, primitive, void, reference-array, and primitive-array classes, selected `Class.componentType()` behavior for non-array, primitive, void, reference-array, primitive-array, and multidimensional-array classes, selected `Class.arrayType()` behavior for ordinary, primitive, reference-array, primitive-array, user-class array, and void rejection paths, selected `Enum.describeConstable` `Enum.EnumDesc` runtime type plus name/type/bootstrap/resolve behavior for simple enum constants, selected `InputStream.skipNBytes(long)` exact-skip/EOF/invalid-skip/null-stream behavior, selected `Files.mismatch` same-path/equal/different/prefix-length/null/missing-file and directory failure behavior, selected `String.indent` line extraction, positive/negative count, whitespace removal, and LF-normalization behavior, selected `String.transform` return/null-function/exception behavior, selected `String`, `Integer`, `Long`, `Float`, and `Double` `describeConstable`/`resolveConstantDesc` self-return behavior, selected `Collectors.teeing` downstream result merging, downstream finisher application, characteristics, and null validation, selected Java 12 `CompletableFuture` `exceptionallyAsync`/`exceptionallyCompose` receiver methods covering success propagation, failure recovery, compose flattening, common-pool and supplied executors, rejected-executor failures, handler failures, null compose results, and null validation, and runtime output comparison | Medium |
| 13 | 57 | Java 13 class-file runtime baseline, text block preview class output, `FileSystems.newFileSystem(Path)` overloads, buffer absolute bulk get/put overloads | Partial: class-file major 57 fixture compiled with `--release 13`, selected `FileSystems.newFileSystem(Path)`, `newFileSystem(Path, Map)`, `newFileSystem(Path, ClassLoader)`, and `newFileSystem(Path, Map, ClassLoader)` null/missing-file/plain-file failure behavior, selected `ByteBuffer.get(int, byte[], ...)` and `put(int, byte[], ...)` heap/direct normal plus range/null/read-only behavior, selected typed-buffer absolute bulk `get`/`put` coverage for heap/direct normal, range/null/read-only, and wide `double` element paths, and runtime output comparison | Low |
| 14 | 58 | switch expressions final, records preview, helpful NPE metadata expectations, `PrintStream.write` helpers | Partial: switch expression fixture compiled with `--release 14`, selected `PrintStream.writeBytes(byte[])` and `write(byte[])` append/copy/null behavior, and runtime output comparison | High |
| 15 | 59 | text blocks final, `CharSequence.isEmpty`, selected `String` helpers, `Math`/`StrictMath.absExact`, sealed classes preview, hidden classes | Partial: text block fixture compiled with `--release 15`, selected `CharSequence.isEmpty` default behavior while preserving Java 8 `chars`/`codePoints`, selected `String.formatted` varargs delegation/null/missing-argument behavior, selected `String.translateEscapes` named/octal/space/line-continuation/invalid escape behavior, selected `String.stripIndent` indentation/trailing-whitespace/terminator opt-out behavior, selected `Boolean`, `Byte`, `Short`, and `Character` `describeConstable` dynamic descriptor metadata and resolution behavior, selected `Math.absExact(int/long)` and `StrictMath.absExact(int/long)` behavior including `MIN_VALUE` overflow exceptions, selected `Class.isHidden()` false results for ordinary, nested, local, anonymous, JDK, primitive, void, and array classes, and runtime output comparison | High |
| 16 | 60 | records final, `Stream.toList`/`mapMulti`, `Objects` long bounds helpers, `HttpRequest` request/filter builder copy, sealed evolution, strong encapsulation assumptions | Partial: Java 16 `Objects.checkIndex(long, long)`, `checkFromToIndex(long, long, long)`, and `checkFromIndexSize(long, long, long)` happy/failure paths including endpoint zero-size ranges and negative lengths, Java 16 `Stream.toList()` order, unmodifiable result, and null-element retention behavior, selected Java 16 object and primitive `Stream.mapMulti`, `mapMultiToInt`, `mapMultiToLong`, `mapMultiToDouble`, `IntStream.mapMulti`, `LongStream.mapMulti`, and `DoubleStream.mapMulti` expansion, empty emission, primitive summing, close propagation, mapper exception propagation, and null-mapper behavior, Java 16 `HttpRequest.newBuilder(HttpRequest, BiPredicate)` metadata/body/header-filter copy behavior, `Record` attribute components, basic record construction/accessors, selected `Class.isRecord()` behavior for non-empty, empty, local, ordinary, enum, JDK, primitive, void, and array classes, basic `Class.getRecordComponents()`/`RecordComponent` name, type, raw generic signature, raw generic/annotated type fallback, runtime-visible component annotations, accessor, declaring-record, empty-record, non-record, and cloned-array behavior, and generated `toString`/`equals`/`hashCode` for field-backed components including selected `float`/`double` `NaN` and signed-zero behavior | High |
| 17 | 61 | sealed classes final, Java 17 class-file loading, `StrictMath`, `InstantSource`, `HexFormat`, `Map.Entry.copyOf`, `RandomGenerator`, modern `java.lang.invoke` behavior | Partial: Java 17 class-file version, selected `StrictMath` `cbrt`, `cosh`, `expm1`, `hypot`, `log10`, `log1p`, `sinh`, and `tanh` parity fixtures, selected `java.time.InstantSource` `system`/`fixed`/`offset`/`tick` factories, `instant`, `millis`, `withZone`, zero-duration identity, tick truncation, custom-source wrapping, and null/invalid-duration validation behavior, selected `java.util.HexFormat` format/parse/accessor/digit conversion APIs, slice/empty parsing, empty formatting, appendable failure wrapping, singleton/equal-value identity behavior, and value-object equality/hash/display behavior, `Map.Entry.copyOf` snapshot/null-rejection/unmodifiable behavior plus `Map.entry` identity preservation, full tested metadata and fresh factory identity for `RandomGeneratorFactory.of("Random")` and `of("SplittableRandom")`, selected `SecureRandom` provider metadata and bounded smoke paths, native-default `L32X64MixRandom` provider metadata, seeded and byte-array seed output parity, and selected split/splits behavior, selected `L64X128MixRandom`, `L64X128StarStarRandom`, `L64X256MixRandom`, `L64X1024MixRandom`, `L128X128MixRandom`, `L128X256MixRandom`, and `L128X1024MixRandom` provider metadata, seeded and byte-array seed output parity, and split/splits behavior, selected `Xoroshiro128PlusPlus` and `Xoshiro256PlusPlus` provider metadata, seeded and byte-array seed output parity, and jump/leap behavior, seeded `Random` provider output parity, `Random` byte-array seed fallback smoke/null validation, selected `SplittableRandom` seeded output and split/splits behavior, selected bounded/default `RandomGenerator` methods including custom-implementation default bit slicing, overflow-safe full-range `int`/`long` bounds, finite float/double range validation, eager bounded stream range validation, sized `ints`/`longs`/`doubles` and splittable `rngs`/`splits` stream metadata, `RandomGenerator` nested interface loading/static failure paths, selected Java 17 `ConstantDescs.TRUE`/`FALSE` dynamic constant descriptor metadata, boolean resolution, canonical `NULL` factory identity, dynamic-constant display metadata, and descriptor-level `ConstantBootstraps.invoke` resolution for tested public static method handles with constant arguments, selected primitive return widening, and reference cast failure wrapping, selected `ConstantDescs` bootstrap method-handle descriptor constants and bootstrap factory metadata/validation including VarHandle descriptor constants, selected `MethodHandles.Lookup.findStatic`/`findVirtual` invocation covering public same-class members, missing-method failure, non-nestmate private access failures, same-package package-private access, cross-package public and subclass protected access, cross-package package-private failures, nestmate private static/instance access, selected static/instance `String`, `int`, and `long` field getter/setter handles under the same access modes plus final-field setter rejection, selected `findConstructor` public/package-private/nestmate-private success plus non-nestmate private failure paths, selected `Lookup.unreflect`, `unreflectConstructor`, `unreflectGetter`, and `unreflectSetter` public success, non-nestmate private failure, and nestmate-private success paths, selected `MethodHandles.privateLookupIn` same-package target lookup, caller/peer private member access, public lookup rejection, and primitive/array target rejection, selected `MethodHandle.asType` reference cast, return widening-to-`Object`, non-void return dropping-to-`void`, `void` return-to-`null` reference adaptation, primitive argument and return widening, primitive return boxing, unboxing, arity mismatch, and runtime cast failure paths, and selected `MethodHandles` combinators covering `identity`, `constant`, `bindTo`, `insertArguments`, `dropArguments`, `filterArguments`, `filterReturnValue`, `permuteArguments`, `guardWithTest`, `catchException`, `exactInvoker`, `invoker`, `collectArguments`, zero-position and selected nonzero-position `foldArguments`, `explicitCastArguments`, `arrayElementGetter`, `arrayElementSetter`, `throwException`, and Java 17 public overlays `zero`, `empty`, `arrayLength`, `arrayConstructor`, `dropArgumentsToMatch`, `dropReturn`, selected `tryFinally` flows, and selected `whileLoop`/`doWhileLoop`/`countedLoop` non-`void` state loops with descriptor checks, `PermittedSubclasses` metadata, selected `Class.isSealed()` and `getPermittedSubclasses()` behavior for sealed interfaces, final permitted classes, ordinary classes, JDK classes, primitives, void, and arrays, and direct sealed supertype enforcement | High |
| 18 | 62 | UTF-8-by-default expectations, simple web server tooling output, `Math`/`StrictMath` unsigned multiplication helper | Partial: simple class-file container, selected UTF-8 default charset behavior for `file.encoding`, `Charset.defaultCharset()`, default `String` byte conversion, and default `InputStreamReader`/`OutputStreamWriter` byte conversion, plus selected `Math.unsignedMultiplyHigh(long, long)` and `StrictMath.unsignedMultiplyHigh(long, long)` behavior for zero, power-of-two, negative-bit-pattern, `Long.MIN_VALUE`, and mixed-sign unsigned products | Medium |
| 19 | 63 | virtual threads preview dependencies, record pattern preview output, `Thread.threadId()`, `Thread.sleep(Duration)` | Partial: simple class-file container, selected `Thread.threadId()` current-thread behavior matching the existing positive `Thread.getId()` identifier, and selected `Thread.sleep(Duration)` behavior for negative no-op, zero duration, short positive duration, null rejection, and interrupt delivery | High |
| 20 | 64 | scoped values preview dependencies, pattern matching output | Partial: simple class-file container plus runnable print fixture | High |
| 21 | 65 | virtual threads, sequenced collections, string templates preview | Partial: simple class-file container, runnable print fixture, selected `Thread.isVirtual()` platform-thread behavior for current, unstarted, and started platform threads, and selected `SequencedCollection`/`List`/`Deque`/`SequencedSet`/`SequencedMap` endpoint, view, and reverse-view behavior | Very high |
| 22 | 66 | class-file API ecosystem expectations, unnamed variables | Partial: simple class-file container plus runnable print fixture | Medium |
| 23 | 67 | primitive patterns preview, module/JDK library drift | Partial: simple class-file container plus runnable print fixture | High |
| 24 | 68 | stream gatherers, compact object headers ecosystem assumptions | Partial: simple class-file container plus runnable print fixture | High |
| 25 | 69 | current LTS class-file and library surface | Partial: simple class-file container plus runnable print fixture | Very high |
| 26 | 70 | current feature-release class-file and library surface | Partial: simple class-file container plus runnable print fixture | Very high |

Java 17 `java.lang.invoke` note: the compatibility row above now also includes
selected `MethodHandles.tryFinally` support plus selected
`MethodHandles.whileLoop`/`MethodHandles.doWhileLoop`/`MethodHandles.countedLoop`
non-`void` state-loop slices through public overlays, covering normal,
exceptional, and `void` `tryFinally` target flows plus stateful loop flows in
the Java fixtures and Kotlin smoke. Full control-flow combinator parity is
still not claimed.

## Implementation Order

1. Accept and test simple Java 17-26 class-file containers that do not need new
   JDK library APIs.
2. Parse low-risk metadata-only structures: `CONSTANT_Module`,
   `CONSTANT_Package`, `NestHost`, `NestMembers`, `Record`, and
   `PermittedSubclasses`.
3. Add targeted runtime support for nestmate access checks.
4. Add targeted runtime coverage for private interface methods, Java 9
   `StringConcatFactory` string concatenation, and minimal `StackWalker`
   caller/frame lookup.
5. Extend dynamic constants beyond the currently covered `nullConstant`,
   `primitiveClass`, `enumConstant`, `getStaticFinal`, tested reference and
   primitive `explicitCast` cases, and the targeted `invoke` fast paths, then
   broaden `invokedynamic` linkage.
6. Design and implement hard runtime surfaces separately: `java.lang.invoke`,
   reflection metadata, records, modules, and virtual-thread-facing APIs. Start
   `java.lang.invoke` work from `docs/design/java-lang-invoke.md`, track the
   Kotlin compiler bring-up in `docs/design/kotlin-compiler.md`, and track the
   Scala compiler bring-up in `docs/design/scala-compiler.md`.

## Test Strategy

- Every compatibility row needs at least one Java fixture compiled with that
  release, a native JVM `.runout`, and a Doppio output comparison.
- Parser-only work also needs a fixture that would fail at class parsing before
  the change.
- Hard runtime features need a design document before implementation and tests
  for both success and failure paths.
- Kotlin compiler bring-up uses a layered smoke: first `K2JVMCompiler -version`,
  then a CI-backed one-file Kotlin compile-and-run through
  `ci/kotlin_smoke.sh`, while each discovered VM/class-library gap is reduced
  to a focused Java fixture before being counted as supported.
- Scala compiler bring-up follows the same shape: run `scala.tools.nsc.Main`
  under Doppio, compile a small Scala 2.13 source set, then compare the
  generated program output on the host JVM and Doppio.

## Kotlin Compiler Bring-Up

- Target: Kotlin compiler 2.4.0.
- Current Doppio state: `K2JVMCompiler -version` exits with status 0, and the
  minimal `Hello.kt` compiler smoke now compiles and runs.
- Empty Kotlin source, `class Foo`, `fun main() {}`, and
  `fun main() { println("hi") }` now compile under Doppio with the minimal
  `kotlin-compiler.jar` classpath; the generated `HelloKt` class prints `hi`
  on both the host JVM and Doppio.
- The minimal `Hello.kt` smoke runs in the `Modern Java` GitHub Actions
  workflow via `ci/kotlin_smoke.sh`; it now covers a small multi-file source
  set with a data class, annotation class, interface default implementation,
  generic class, default arguments, string templates, lambda, sealed hierarchy,
  object declaration, companion object, enum, collection pipeline, exception
  handling, nullable safe-call/Elvis flow, nested/inner/local classes, SAM
  conversions, an anonymous object expression, delegated local and custom
  properties, an inline function, a no-suspension `suspend` function launched
  through `kotlin.coroutines.startCoroutine`, and a `suspendCoroutine` resume
  path including delayed continuation resume and resume-time exception
  propagation, plus Java `Thread`-based and `ExecutorService`-based
  continuation resumption, a custom `ContinuationInterceptor` event loop with
  multiple queued suspension resumes, `try`/`catch`/`finally`, `Closeable.use`,
  destructuring, range loops, stepped `downTo` loops, `mapIndexed`, and
  `synchronized`, plus top-level, bound, unbound, constructor, and companion
  callable references used through lazy `Sequence` pipelines, plus
  `@JvmInline value class` boxing, interface dispatch, nullable handling, map
  keys, and sorting, plus reified generic type checks, `T::class.java`,
  primitive/object arrays, spread varargs, copied arrays, typed arrays, and
  component-type reflection, plus runtime-retained annotation use-site targets
  observed through Java reflection, repeatable annotation containers, and
  annotation enum/class/array elements, plus Kotlin `fun interface`, sealed
  interface exhaustiveness, `data object`, `Enum.entries`, enum constant class
  bodies with overridden members, property references,
  class literals, default-argument `$default` methods, `@JvmOverloads`,
  interface `DefaultImpls`, data-class `copy$default`, enum `when`
  `$WhenMappings`, string `when` hash switching, and subjectless `when`
  branches, plus inline `try/finally`, non-local returns, `crossinline`, and
  `noinline` function-object retention, plus `@file:JvmName`, `@JvmName`,
  `@JvmStatic`, `@JvmField`, `const val`, `@Throws`, `@Volatile`, and
  `@Synchronized` JVM interop lowering, plus mutable delegated properties with
  `provideDelegate`, `getValue`, `setValue`, and generated delegated-property
  references, plus captured local classes, anonymous object lowering,
  inner-class `this$0`, nested companion construction, and synthetic accessor
  generation, plus interface delegation, delegated `DefaultImpls` forwarding,
  and generic bridge methods verified through Java reflection, plus extension
  receiver functions/properties, typealias metadata, use-site variance, star
  projections, generic `Signature` attributes, and inlined sorted comparator
  classes, plus receiver lambdas, extension function type metadata, extension
  callable references, bound extension references, extension property
  references, and runtime-visible receiver-parameter annotations, plus tailrec
  lowering, labeled loops, local default-vararg helpers, spread-array calls,
  inline `Result` control flow, labeled `return@`, exception tables, and
  `StackMapTable` metadata, plus `lateinit` property accessors,
  `LazyThreadSafetyMode.NONE` lazy initialization, `notNull`/`observable`/
  `vetoable` delegates, delegated-property references, and companion/nested
  object initialization, plus `buildList`/`buildMap`/`buildSet`, grouping
  folds, windowed/chunked collection transforms, partitioning, `zipWithNext`,
  `flatten`, `associateWith`, `runningFold`, and `reduceIndexed`, plus
  `sequence` and `iterator` builders, `SequenceScope.yield`/`yieldAll`,
  restricted suspend sequence state machines, `constrainOnce`,
  `generateSequence`, lazy `onEach`/`filter`/`map`/`zipWithNext` pipelines,
  and sequence `windowed`, plus deeper `Result` success/failure flow through
  `mapCatching`, `recoverCatching`, `getOrDefault`, `getOrElse`, boxed
  failures, exception cause retention, `try`/`finally` ordering, and inline
  lambda labeled returns, plus Kotlin text/regex APIs covering named groups,
  lazy `findAll` sequences, destructured matches, transform replacements,
  `replaceFirst`, `split`, `trimIndent`/`lineSequence`, regex options, and
  string range replacement, plus Kotlin file I/O helpers covering
  `writeText`, `appendText`, `readLines`, `useLines`, `copyTo`,
  `walkTopDown`, relative path normalization, file metadata, and byte reads,
  plus Kotlin source-level use of Java NIO `Path`/`Files` covering
  `Paths.get`, directory creation, line and byte reads/writes, copy/move,
  `Files.list`, `Files.walk`, metadata predicates, path normalization, and
  same-file checks, plus Kotlin source-level use of concurrent cache
  primitives covering `ConcurrentHashMap` compute/merge paths, atomics,
  `CopyOnWriteArrayList`, `ThreadLocal`, `ReentrantLock.withLock`,
  synchronized maps, and one-shot thread-local isolation, plus Kotlin
  classpath resource lookup covering `Class.getResource`,
  `ClassLoader.getResource`, `ClassLoader.getResources`,
  `ClassLoader.resources`,
  `ClassLoader.getSystemResource`, context classloader swap/restore, and class
  and module resource byte reads, plus `ServiceLoader` provider discovery from
  generated `META-INF/services` metadata, duplicate-provider collapse, reload,
  and provider instantiation, plus runtime jar creation and classpath-style
  reads through `JarOutputStream`, `JarFile`, `Manifest`, `ZipInputStream`,
  `CRC32`, `URLClassLoader`, and jar URL streams, plus Java dynamic-proxy
  interop covering a Kotlin interface proxy, `InvocationHandler` dispatch,
  reflective proxy-method invocation, runtime method and parameter
  annotations, proxy `Object` method dispatch, `Proxy.isProxyClass`, and
  `Proxy.getInvocationHandler`, plus Kotlin source-level use of
  `java.lang.invoke.MethodHandles` covering static, virtual, constructor, and
  field handle lookup, `invokeWithArguments`, `MethodHandle.asType`, primitive
  boxing/unboxing/widening, selected reflection-backed `Lookup.unreflect`,
  `unreflectConstructor`, `unreflectGetter`, and `unreflectSetter` success
  paths plus a private member access-failure path,
  `MethodHandles.reflectAs` method, constructor, getter, and setter round-trips,
  and selected `MethodHandles.privateLookupIn` private method access plus public-lookup
  failure behavior, selected `MethodHandles` combinators (`identity`,
  `constant`, `bindTo`, `insertArguments`,
  `dropArguments`, `filterArguments`, `filterReturnValue`, `permuteArguments`,
  `guardWithTest`, `catchException`, `exactInvoker`, `invoker`,
  `spreadInvoker`, `collectArguments`, zero-position and selected
  nonzero-position `foldArguments`, `explicitCastArguments`,
  `arrayElementGetter`, `arrayElementSetter`, `throwException`, selected
  `MethodHandle.asCollector`, `asSpreader`, `asVarargsCollector`, and
  `asFixedArity` adapter flows, and Java 17 public overlays `zero`, `empty`,
  `arrayLength`, `arrayConstructor`, `dropArgumentsToMatch`, `dropReturn`,
  selected `tryFinally` flows, and selected
  `whileLoop`/`doWhileLoop`/`countedLoop` non-`void` state loops), and
  method-type descriptor reporting, plus Kotlin unsigned
  primitives and unsigned arrays covering wraparound arithmetic, unsigned
  sorting, filtering, map keys, and hexadecimal byte rendering, then runs the
  generated code on both the host JVM and Doppio with `kotlin-stdlib.jar`.
- The workflow now runs that smoke with `KOTLIN_SMOKE_CLASSPATH_MODE=full`,
  covering the full `kotlinc/lib/*.jar` classpath rather than only
  `kotlin-compiler.jar`.
- The workflow also runs `ci/kotlin_reflect_smoke.sh`, a smaller
  `kotlin-reflect.jar` runtime smoke. Doppio compiles the source with explicit
  `kotlin-stdlib.jar` and `kotlin-reflect.jar` source classpath, then both the
  host JVM and Doppio run the generated class with `kotlin-reflect.jar`. The
  smoke covers `KClass.primaryConstructor`, `KClass.memberProperties`,
  mutable property set/get through `KMutableProperty1`,
  `KClass.memberFunctions` invocation, runtime annotation lookup,
  companion-object dispatch, `KCallable.callBy` default constructor and method
  arguments, sealed subclass enumeration, and object-instance lookup.
- Next blocker: broaden the Kotlin compiler smoke to more source constructs,
  reduce remaining throughput variance, and compare full-classpath elapsed time.
  Current notes live in `docs/design/kotlin-compiler.md`.

## Scala Compiler Bring-Up

- Target: Scala compiler 2.13.18.
- Current Doppio state: `ci/scala_smoke.sh` downloads `scala-compiler`,
  `scala-library`, `scala-reflect`, `java-diff-utils`, and JLine from Maven
  Central, runs `scala.tools.nsc.Main` under Doppio, and compiles
  `classes/scala_smoke/*.scala`; the generated `Hello` class now prints the
  expected output on both the host JVM and Doppio.
- The fixture covers a small Scala 2.13 source slice with sealed traits, case
  objects, a sealed ADT with case classes, guarded pattern matching, a generic
  case class, trait default method, anonymous class, closures, collection
  pipelines, `Vector`, `Map.collect`, `PartialFunction.collect`, `Option`,
  `Either`, tuple matching, for-comprehension desugaring, `lazy val`,
  `try`/`catch`/`finally`, `groupMapReduce`, implicit value classes, default
  arguments, case-class `copy`, `@tailrec`, varargs with `ClassTag`, `Try`,
  tuple ordering, package object initialization, package-scoped classes and
  objects, `Enumeration`, `@BeanProperty`, Java reflection over
  Scala-generated members, specialized class generation, Java `StackWalker`
  frame descriptor/`MethodType` metadata with retained-class-reference guards,
  and `scala-reflect`
  runtime universe use covering runtime mirror creation, `typeOf`, member
  symbol lookup, case-accessor discovery, and static class lookup, plus
  two-phase Scala 2 blackbox macro expansion, plus string interpolation, then
  runs the generated `Hello` class on both the host JVM and Doppio.
- Current notes live in `docs/design/scala-compiler.md`.

## Current Test Targets

- `grunt --grunt-ignore-compile-errors test-modern-java` compiles and checks the
  current modern fixtures: Java 9 module metadata, private interface methods,
  `Flow.Publisher`, `Flow.Subscriber`, `Flow.Subscription`, and
  `Flow.Processor` nested-interface loading, dispatch, and `instanceof`
  behavior, plus `Flow.defaultBufferSize()`,
  selected direct-executor `SubmissionPublisher` constructor metadata and
  rounded max-buffer capacity, subscriber registration snapshots,
  `isSubscribed` before/after subscribe/cancel/close plus null validation,
  `submit`, both tested `offer` overloads,
  `consume` future completion and consumer-exception exceptional completion,
  normal and exceptional close delivery, late subscriber terminal delivery,
  subscriber-callback exception handling, and null/invalid-capacity validation,
  `Enumeration.asIterator()` adapter traversal, exhaustion, and unsupported
  remove behavior,
  `Cleaner.create()`, `Cleaner.create(ThreadFactory)` factory invocation and
  null-thread rejection, `register` null validation, and idempotent explicit
  `Cleanable.clean()`,
  `List.of` empty, exact-arity, and varargs factories with empty varargs
  singleton preservation, null rejection, null-hostile lookup, and
  unmodifiable results,
  `Set.of` empty, exact-arity, and varargs factories with empty varargs
  singleton preservation, null rejection, null-hostile lookup,
  duplicate rejection, and
  unmodifiable results,
  `Map.of`, `Map.entry`, and `Map.ofEntries` factories with empty varargs
  singleton preservation, null rejection, duplicate-key rejection, immutable
  entries, null-hostile map/view lookup including the empty-entry-set
  exception, and unmodifiable results,
  `Stream.ofNullable`, three-arg `iterate` on `Stream`/`IntStream`/
  `LongStream`/`DoubleStream`, ordered sequential object and primitive
  `takeWhile`/`dropWhile`, primitive `of`/`range`/`rangeClosed` exact-size
  spliterator metadata, close propagation from derived streams, and null
  predicate/operator validation,
  `Collectors.mapping`, `filtering`, `flatMapping`, `collectingAndThen`,
  `counting`, `minBy`, `maxBy`, selected `reducing`, numeric
  summing/averaging/summarizing, selected `toMap`, selected
  `toConcurrentMap`, selected `groupingBy`, and selected `partitioningBy`
  plus selected `groupingByConcurrent` behavior including mapped-stream
  closing, null-stream handling, characteristics, downstream null timing,
  fixed-key partition map behavior, and tested `joining` preservation,
  `InputStream.readAllBytes`, `readNBytes(byte[], int, int)`, and
  `transferTo` happy paths plus null/bounds failure paths,
  `Objects.requireNonNullElse`, `Objects.requireNonNullElseGet` including
  unused-default and lazy-supplier behavior, and the int
  `Objects.checkIndex`/`checkFromToIndex`/`checkFromIndexSize` bounds helpers
  including zero-length and negative-length edge cases,
  object `Optional.ifPresentOrElse`, `Optional.or`, and `Optional.stream`,
  primitive `OptionalInt`/`OptionalLong`/`OptionalDouble` `ifPresentOrElse`
  and `stream`,
  string concat including adjacent `long` wide-slot arguments, a `long`
  followed by a reference argument, boxed `Integer`, `Long`, `Boolean`, and
  `Character` object arguments, observable user-object `toString()` dispatch,
  null reference conversion, and `makeConcatWithConstants` static `Class`,
  `MethodType` recipe constants for an ordinary class, an interface,
  an array class, and a `(String)int` method type, plus a
  `MethodHandle(int)String` recipe constant, a
  multi-release JAR class fixture whose `META-INF/versions/9` class entry must
  match native Java 17 selection, a `JarFile`/`URLClassLoader` resource fixture
  covering default `JarFile(File)` base-entry parity and classpath-style
  `META-INF/versions/17` lookup, `StackWalker.getCallerClass`
  success/failure paths including nested-helper and reflection-frame filtering,
  and `StackWalker.walk`/`forEach` frame ordering with
  basic class/method/line metadata plus `SHOW_HIDDEN_FRAMES` lambda proxy filtering and
  `SHOW_REFLECT_FRAMES` reflection-frame filtering, null-option set
  validation, no-retain `StackFrame.getDeclaringClass()` failure, `StackFrame.toString()`,
  and `walk` stream closure after the callback returns,
  Java 9 buffer covariant fluent-return bridges for selected `ByteBuffer`
  position/limit/mark/reset/clear/flip/rewind calls plus direct
  `DirectByteBuffer` relative bulk get/put behavior, and lazy
  `Throwable` stack trace materialization while preserving observed
  `getStackTrace()` and `fillInStackTrace()` behavior,
  plus `Runtime.Version.parse` major/minor/security/version/pre/build/optional
  metadata including optional components without build numbers, canonical
  string rendering, immutable version list behavior, comparison/equality
  including exact equality for numeric prerelease spellings,
  ignore-optional variants, and numeric prerelease comparison, and null/invalid
  parse validation, plus selected `Math.multiplyFull(int, int)` and
  `StrictMath.multiplyFull(int, int)` signed 64-bit product behavior for zero,
  negative, and overflow-scale operands, plus selected
  `Math.multiplyHigh(long, long)` and `StrictMath.multiplyHigh(long, long)`
  high-product behavior for zero, positive overflow-scale, negative, and
  extreme `long` operands, plus selected `Math.floorDiv(long, int)`,
  `StrictMath.floorDiv(long, int)`, `Math.floorMod(long, int)`, and
  `StrictMath.floorMod(long, int)` behavior for sign combinations, extreme
  `long` operands, large non-even divisions, and zero-divisor exceptions,
  plus `System.Logger` and `System.Logger.Level` nested type loading, level
  name/severity metadata, custom logger implementation, default log-method
  delegation, null validation, null-level delegation for direct message
  overloads, disabled logger lazy object/supplier behavior, and selected
  `System.getLogger` name/type/null-validation and returned-logger null-level
  validation behavior,
  plus `ProcessHandle.current()`
  and `ProcessHandle.of(pid)` with stable non-placeholder `pid() > 0`,
  `isAlive()`, identity, present, empty lookup, same-pid equality without same-object identity,
  same-handle `compareTo`, `allProcesses()` containing the current and parent
  handles,
  non-null and present current-process `parent()` backed by the Doppio host
  parent pid, parent-handle `children()`/`descendants()` containing the
  current handle, empty current-handle `children()`/`descendants()`,
  `supportsNormalTermination()`, current-process `onExit()`/`destroy()`/
  `destroyForcibly()` illegal-call checks, and non-null present current-handle
  `Info` optional checks, non-placeholder Doppio host argv-backed command and
  command line values, command line containment of the command and first
  argument, non-empty Doppio host argv-backed arguments, host uptime-backed
  process start instant checks, and positive host CPU-usage-backed total CPU
  duration checks,
  same-`Info` arguments array stability, and
  `Info.toString()` key formatting; Java 10 local-variable type
  inference output, `List.copyOf` snapshot behavior, factory-created immutable
  list identity preservation including the empty factory singleton, legacy
  `Collections.emptyList()` copying, user unmodifiable-wrapper copying, null
  collection/null element rejection, unmodifiable result checks, `Set.copyOf`
  duplicate dedupe, snapshot behavior, factory-created immutable set identity
  preservation including the empty factory singleton, legacy
  `Collections.emptySet()` copying, user unmodifiable-wrapper copying, null
  collection/null element rejection, unmodifiable result checks, `Map.copyOf`
  snapshot behavior, factory-created immutable map identity preservation
  including the empty factory singleton, legacy `Collections.emptyMap()`
  copying, user unmodifiable-wrapper copying, null map/null key/null value rejection,
  unmodifiable result checks,
  `Collectors.toUnmodifiableList`, `toUnmodifiableSet`, and
  `toUnmodifiableMap` unmodifiable results, `copyOf` identity preservation,
  null rejection,
  duplicate-key rejection, duplicate set dedupe, merge behavior,
  null-merge removal, and tested `joining` preservation,
  no-arg object and primitive `Optional.orElseThrow`, Java 10
  `Runtime.Version` `feature`/`interim`/`update`/`patch` accessors, and
  `Reader.transferTo(Writer)` transfer count/output and null-writer rejection,
  selected `ByteArrayOutputStream.toString(Charset)` decoding/null behavior,
  selected `PrintStream` and `PrintWriter` charset constructors for
  `OutputStream`, `File`, and `String` targets covering encoded output,
  `checkError`, and null behavior,
  selected `Scanner` charset constructors for `InputStream`, `File`, `Path`,
  and `ReadableByteChannel` targets covering decoded tokens and null behavior,
  and StackFrame descriptor/`MethodType` metadata including no-retain
  descriptor access plus no-retain `getMethodType` failure; Java 11
  `InputStream.readNBytes(int)` happy/negative-length paths and
  `InputStream.nullInputStream` EOF, transfer, and close behavior,
  `OutputStream.nullOutputStream` open writes, null/bounds failure paths,
  closed-write behavior, and close-after-flush behavior,
  `Reader.nullReader` EOF and close behavior,
  `Writer.nullWriter` open writes, null/bounds failure paths,
  closed-write behavior, and closed-flush behavior,
  selected charset-aware `FileReader`/`FileWriter` constructors and
  `ByteArrayOutputStream.writeBytes(byte[])` append/copy/null behavior,
  `HttpClient.newBuilder()` version, redirect, connect-timeout metadata,
  cookie handler, proxy selector, authenticator, and executor optional metadata,
  default SSL context/parameters presence, `SSLParameters` defensive copying,
  `Builder.NO_PROXY` direct immutable proxy selection, and selected builder
  priority/null validation,
  `HttpRequest.newBuilder(URI)` timeout, repeated header, no-arg/default
  builder metadata, `setHeader` replacement behavior, `HttpRequest.Builder.copy()`
  snapshot behavior, POST, PUT, DELETE, and custom `PATCH`
  methods, invalid method-token/null-body rejection, URI, optional body
  publisher, `BodyPublishers.noBody`, `ofString`,
  `ofByteArray` mutable full-array and offset-slice publication, existing-file
  `ofFile` content lengths,
  `fromPublisher` unknown/fixed length, delegate publication, and
  null/negative-length validation,
  `BodyPublishers.ofByteArrays` unknown length, byte payload publication, and
  null-element error delivery,
  `BodyPublishers.ofInputStream` unknown length, per-subscription supplier
  invocation, byte payload publication, null-stream `IOException` delivery, and
  supplier-thrown exception propagation, Java 16
  `HttpRequest.newBuilder(HttpRequest, BiPredicate)` metadata/body/header-filter
  copy behavior, Java 16 `BodyPublishers.concat`
  fixed/unknown length and ordered byte payload publication, and
  `BodySubscribers.replacing`, `discarding`, `mapping`, `buffering`,
  `ofByteArray`, `ofString`, `ofInputStream`, `ofLines`, and
  `ofByteArrayConsumer` behavior, `BodySubscribers.ofFile` explicit-option file writes,
  `BodySubscribers.fromSubscriber` forwarding and completion lifecycle,
  `BodySubscribers.fromLineSubscriber` forwarding, selected explicit
  line-separator and charset decoding, and finisher lifecycle,
  `BodySubscribers.ofPublisher` publisher completion and byte-list delivery,
  `BodyHandlers.ofString`, `ofInputStream`, `ofByteArrayConsumer`, `ofFile`,
  `ofPublisher`, `ofFileDownload`, `fromSubscriber`, `fromLineSubscriber`,
  and `buffering` delegation, including `Content-Type` charset inference for
  no-arg `ofString` and `ofLines`, plus
  null/zero-timeout/header/body-subscriber
  validation paths, including invalid request header names, CR/LF header values,
  and `HttpHeaders.of` empty-name rejection plus native-compatible acceptance
  of non-empty invalid names and CR/LF values, case-insensitive
  `firstValue`/`allValues`/`map().containsKey`, `firstValueAsLong`,
  filter snapshot behavior, map/value-list immutability, and null/parse
  validation, plus WebSocket builder header
  and subprotocol calls including native-compatible permissive invalid inputs,
  `Path.of(String, String...)` multi-segment path construction,
  `Path.of(URI)` file URI construction, null input paths,
  `Files.readString`/`writeString` default UTF-8 and explicit charset behavior,
  append and create-new option paths, read-all-bytes length checks, temp-file
  cleanup, and null validation,
  `CharSequence.compare` lexicographic, equal, length-difference, same-object,
  and null input paths,
  `Collection.toArray(IntFunction)` generator-size, returned-array, empty
  collection, oversized-array reuse, null-generator/null-array, and
  incompatible-array behavior, `Predicate.not` negation,
  `Predicate.isEqual` composition, and null-target behavior, object and
  primitive `Optional.isEmpty`, nestmates, and generated
  `CONSTANT_Dynamic`
  fixtures covering `nullConstant`, `primitiveClass`, `enumConstant`, and
  `getStaticFinal`, plus reference and primitive `explicitCast` cases covering
  `boolean`, `byte`, `char`, `short`, `int`, `long`, `float`, and `double`,
  including selected cross-wrapper `Integer`/`Long`/`Float`/`Double`
  conversions, and `ConstantBootstraps.invoke` for static method-handle targets
  with static arguments and reference/primitive returns, `GETSTATIC`
  field-handle targets returning reference dynamic constants, receiver-backed
  `GETFIELD` field-handle targets whose receiver is another dynamic constant,
  constructor method handles returning reference dynamic constants, virtual and
  interface method-handle targets with receiver static arguments returning
  primitive dynamic constants, method plus static/instance field targets
  returning `String` into an `Object` dynamic constant, and a constructor target
  returning `StringBuilder` into an `Object` dynamic constant, plus static method
  and static/instance field `int` returns boxed into `Integer` and `Object`
  dynamic constants, a `CONSTANT_Integer` static argument boxed for an
  `Integer` method parameter, an `Integer` dynamic constant unboxed for an
  `int` method parameter, and an `Integer` dynamic constant widened for a
  `long` method parameter, plus a `CONSTANT_Integer` static argument widened
  for a `long` method parameter, a `PUTSTATIC` field-handle target that writes a
  `String` static argument, returns `null`, and is verified by a subsequent
  getter dynamic constant, and a receiver-backed `PUTFIELD` target that writes
  a `String` static argument to another dynamic constant's receiver and is
  verified by a subsequent receiver-backed getter dynamic constant, plus a
  `PUTSTATIC` double field setter fed by a `CONSTANT_Long` static argument and
  verified by a double getter, boxed `Object` getter, and double arithmetic,
  plus a
  static `ACC_VARARGS` method target where trailing `String` static arguments
  are collected into a `String[]`, and a static method target whose `int`
  return is widened into a `long` dynamic constant, plus a `GETSTATIC` field
  target whose `int` value is widened into a `long` dynamic constant, and a
  static `void` method target whose `Object` dynamic constant result is
  `null`, plus a receiver-backed `REF_invokeSpecial` target for a private
  instance method returning `String`, and a static `ACC_VARARGS` method target
  where a trailing `CONSTANT_Integer` static argument is collected and widened
  into a `long[]`, plus a `REF_invokeStatic` target backed by an interface
  static method returning `String`; Java 12 `CompactNumberFormat` basic
  constructor null validation, compact long formatting, negative formatting,
  and suffix parse position behavior, plus selected
  `NumberFormat.getCompactNumberInstance` default and US SHORT/LONG factory
  behavior, plus Java 12 `ClassDesc.of`,
  `ofDescriptor`, `arrayType`, `componentType`, `nested`, `packageName`,
  `displayName`, `descriptorString`, equality, primitive/class/array
	  `resolveConstantDesc`, selected `Class.describeConstable` descriptors for
	  ordinary, primitive, array, and void classes, selected
	  `Enum.describeConstable` `Enum.EnumDesc` runtime type plus
	  name/type/bootstrap/resolve behavior for simple enum constants, invalid
	  binary/package name rejection, maximum-rank array descriptor acceptance,
	  excessive array-rank rejection, void-array and
  malformed internal-name descriptor rejection, `ConstantDescs.DEFAULT_NAME`,
  selected
  `ConstantDescs.CD_*` descriptor constants including the
  `CD_MethodHandleDesc_Kind` owner descriptor, `ConstantDescs.NULL`
  resolution, selected `MethodTypeDesc` construction from return/parameter
  descriptors and raw descriptor strings, descriptor/display output,
  return/parameter inspection, parameter list/array snapshots,
  return/parameter/drop/insert transformations, `MethodType` resolution,
  equality, and invalid/null/bounds input paths, selected Java 12
  `MethodHandleDesc`/`DirectMethodHandleDesc` static method, virtual method,
  constructor, and getter factories, owner/name/descriptor metadata,
  invocation type descriptors, selected `asType` identity/wrapper behavior,
  selected `resolveConstantDesc` execution for public same-class and
  selected JDK-class static/virtual methods, constructors, static/instance
  field handles, and `asType`, `toString`, equality/hashCode, null validation, and
  `Kind.valueOf` mappings, Java 12
  `InputStream.skipNBytes(long)` positive skip, negative no-op, zero-`skip`
  fallback to `read`, EOF failure, invalid negative/oversized skip-return
  failure, `nullInputStream` EOF/closed behavior, and `Files.mismatch`
  same-path missing/directory, equal-file, first-different-byte,
  common-prefix-length, null, missing-file, and file/directory mismatch
  failure paths, Java 12 `String.indent` empty, positive, negative,
  whitespace-removal, and line-ending normalization paths, Java 12
	  `String.transform` string/object/null return, null-function, and mapper
	  exception propagation paths, selected `String`, `Integer`, `Long`, `Float`,
	  and `Double` `describeConstable` present optional and `resolveConstantDesc`
	  self-return paths, selected `Enum.describeConstable` `Enum.EnumDesc`
	  runtime type, constant-name, constant-type, bootstrap-method, and
	  resolution paths for simple enum constants, plus `Collectors.teeing`
  downstream result merging, downstream
  finisher application, characteristic checks, null validation, and null element
	  propagation through a downstream unmodifiable collector; Java 12 and Java 13
	  class-file runtime baselines; Java 13 selected
	  `FileSystems.newFileSystem(Path)`, `newFileSystem(Path, Map)`,
	  `newFileSystem(Path, ClassLoader)`, and
	  `newFileSystem(Path, Map, ClassLoader)` null/missing-file/plain-file
	  failure behavior, plus selected
	  `ByteBuffer.get(int, byte[], ...)` and `put(int, byte[], ...)`
	  heap/direct normal plus range/null/read-only behavior, selected
	  typed-buffer absolute bulk `get`/`put` heap/direct normal,
	  range/null/read-only, and wide `double` element paths; Java 14 switch expression
	  output and selected `PrintStream.writeBytes(byte[])` and
	  `write(byte[])` append/copy/null behavior;
	  Java 15 `CharSequence.isEmpty` for string and
  builder values plus preserved `chars`/`codePoints` counts, Java 15
  `String.formatted` varargs, null, and missing-argument behavior, Java 15
  `String.translateEscapes` named escape, octal escape, space escape,
  line-continuation, and invalid escape behavior, Java 15
  `String.stripIndent` indentation, blank-line, trailing-whitespace, and
	  trailing-terminator opt-out behavior, selected Java 15 `Boolean`, `Byte`,
	  `Short`, and `Character` `describeConstable` dynamic descriptor metadata and
	  resolution behavior, selected Java 15 `Math.absExact(int/long)` and
	  `StrictMath.absExact(int/long)` behavior including `MIN_VALUE` overflow
	  exceptions, Java 15 text block output; Java 16
  `Objects.checkIndex(long, long)`, `checkFromToIndex(long, long, long)`,
  and `checkFromIndexSize(long, long, long)` happy/failure paths including
  endpoint zero-size ranges and negative-length checks,
  `Stream.toList()` order preservation, unmodifiable result, null-element
  retention, object `Stream.mapMulti*` and primitive `mapMulti` on
  `IntStream`/`LongStream`/`DoubleStream` expansion, empty emission, primitive
  summing, close propagation, mapper exception propagation, and null-mapper behavior,
  `HttpRequest.newBuilder(HttpRequest, BiPredicate)` metadata/body/header-filter
  copy behavior, record construction/accessors, selected `Class.isRecord()`
  behavior, and generated `toString`/`equals`/`hashCode` including selected
  `float`/`double` `NaN` and signed-zero component behavior; selected Java 17 `StrictMath` native
  parity fixtures for `cbrt`, `cosh`, `expm1`, `hypot`, `log10`, `log1p`,
  `sinh`, and `tanh` covering signed zero, representative finite values,
  infinities, and NaN; Java 17 `InstantSource` `fixed`,
  `offset`, `tick`, `system`, `instant`, `millis`, and `withZone` behavior,
  zero-duration identity, tick truncation, custom-source clock wrapping, and
  null/invalid-duration failure paths; Java 17 `HexFormat` byte-array
  formatting, range formatting, delimiter/prefix/suffix accessors and parsing,
  `CharSequence` and char-array range parsing, empty parsing/formatting,
  uppercase formatting, appendable full-array and single-byte formatting,
  appendable `IOException` wrapping, digit extraction/predicates/conversions,
  numeric hex conversion helpers including signed overflow and zero-width digit
  counts, singleton/equal-value identity behavior, value-object equality/hashCode and `toString`
  output, null/range/odd-length/delimiter/invalid-digit failure paths,
  Java 17 `Map.Entry.copyOf` snapshot behavior, `Map.entry` identity
  preservation, user-created immutable entry copying, entry/key/value null
  rejection, and unmodifiable result checks, Java 17
  `RandomGeneratorFactory.of("Random")` metadata,
  `RandomGeneratorFactory.of("SplittableRandom")` metadata, fresh factory
  identity for repeated `of`, `all`, and `getDefault` calls,
  seeded `create(long)` output parity with native `java.util.Random`,
  `create(byte[])` fallback smoke and null-seed validation for the tested
  `Random` provider, selected `SplittableRandom` provider metadata,
  seeded output parity, byte-array fallback smoke, `SplittableGenerator.of`,
  `split`, `splits`, source-backed `split(source)`, split/splits/rngs
  validation and zero-size stream metadata, and factory enumeration,
  selected `SecureRandom` provider metadata plus `create()`, `create(long)`,
  and `create(byte[])` bounded smoke paths,
  native-default `L32X64MixRandom` provider metadata, `getDefault` routing,
  seeded `create(long)` output parity, byte-array seed conversion output
  parity, `RandomGenerator.of`, `SplittableGenerator.of`, and selected
  `split`/`split(source)`, salted `splits`, source-backed `splits`, and
  zero-size `splits` state-advance behavior,
  selected `L64X128MixRandom` provider metadata, seeded `create(long)` output
  parity, byte-array seed conversion output parity, `RandomGenerator.of`,
  `SplittableGenerator.of`, and selected `split`/`split(source)`, salted
  `splits`, source-backed `splits`, and zero-size `splits` state-advance
  behavior,
  selected `L64X128StarStarRandom` provider metadata, seeded `create(long)`
  output parity, byte-array seed conversion output parity,
  `RandomGenerator.of`, `SplittableGenerator.of`, and selected
  `split`/`split(source)`, salted `splits`, source-backed `splits`, and
  zero-size `splits` state-advance behavior,
  selected `L64X256MixRandom` provider metadata, seeded `create(long)` output
  parity, byte-array seed conversion output parity, `RandomGenerator.of`,
  `SplittableGenerator.of`, and selected `split`/`split(source)`, salted
  `splits`, source-backed `splits`, and zero-size `splits` state-advance
  behavior,
  selected `L64X1024MixRandom` provider metadata, seeded `create(long)` output
  parity, byte-array seed conversion output parity, `RandomGenerator.of`,
  `SplittableGenerator.of`, and selected `split`/`split(source)`, salted
  `splits`, source-backed `splits`, and zero-size `splits` state-advance
  behavior,
  selected `L128X128MixRandom` provider metadata, seeded `create(long)` output
  parity, byte-array seed conversion output parity, `RandomGenerator.of`,
  `SplittableGenerator.of`, and selected `split`/`split(source)`, salted
  `splits`, source-backed `splits`, and zero-size `splits` state-advance
  behavior,
  selected `L128X256MixRandom` provider metadata, seeded `create(long)` output
  parity, byte-array seed fallback smoke, `RandomGenerator.of`,
  `SplittableGenerator.of`, and selected `split`/`split(source)`, salted
  `splits`, source-backed `splits`, and zero-size `splits` state-advance
  behavior,
  selected `L128X1024MixRandom` provider metadata, seeded `create(long)`
  output parity, byte-array seed conversion output parity,
  `RandomGenerator.of`, `SplittableGenerator.of`, and selected
  `split`/`split(source)`, salted `splits`, source-backed `splits`, and
  zero-size `splits` state-advance behavior,
  selected `Xoroshiro128PlusPlus` provider metadata, seeded `create(long)`
  output parity, byte-array seed conversion output parity,
  `RandomGenerator.of`, `JumpableGenerator.of`, `LeapableGenerator.of`,
  wrong `SplittableGenerator.of` failure, and selected `copy`, `jump`,
  `leap`, `jumps`, and `leaps` behavior,
  selected `Xoshiro256PlusPlus` provider metadata, seeded `create(long)`
  output parity, byte-array seed conversion output parity,
  `RandomGenerator.of`, `JumpableGenerator.of`, `LeapableGenerator.of`,
  wrong `SplittableGenerator.of` failure, and selected `copy`, `jump`,
  `leap`, `jumps`, and `leaps` behavior,
  bounded `long`/`double`/`float` output parity, full-range overflow-safe
  `nextInt(origin, bound)` and `nextLong(origin, bound)` behavior, finite
  bound, NaN-bound, and finite-range validation for `nextFloat`, `nextDouble`, and bounded
  `doubles` streams, zero-standard-deviation `nextGaussian(mean, stddev)`,
  NaN and infinite standard-deviation `nextGaussian(mean, stddev)` behavior,
  non-negative `nextExponential()` invariant, bounded `ints`/`longs`/`doubles`
  stream behavior including full-range int/long stream bounds, one-bound
  invariants for unseeded and byte-array-seeded creation, plus custom
  `RandomGenerator` implementation defaults for `nextBoolean`, `nextInt`,
  bounded `nextInt`, bounded `nextLong`, `nextFloat`, bounded `nextDouble`,
  and `nextBytes` including null-byte-array rejection,
  eager invalid-range validation for bounded `ints`, `longs`, and `doubles`
  stream factories including zero-size streams, sized spliterator metadata for
  `ints`/`longs`/`doubles`, and sized splittable `rngs`/`splits` stream
  metadata, custom streamable/jumpable/leapable/arbitrarily-jumpable
  copy-and-advance helpers including arbitrary NaN/infinite jump distances,
  negative stream-size validation, and native-style unknown-size stream
  metadata for their default stream-size overloads,
  `RandomGenerator.of("Random")`, `RandomGeneratorFactory.all()`, unknown/null
  provider failure paths, `RandomGenerator` nested interface loading,
  assignability, and static wrong-provider/unknown-provider failure paths,
  bounded-number failure paths, and negative stream size failure paths,
  `ConstantDescs.TRUE`/`FALSE` dynamic constant names, types, bootstrap args,
  bootstrap arg lists, boolean resolution, equality, `toString`,
  `DynamicConstantDesc.ofCanonical` `NULL` identity, selected named/default
  dynamic-constant display strings, selected descriptor-level
  `DynamicConstantDesc.resolveConstantDesc` paths for `nullConstant`,
  `primitiveClass`, `enumConstant`, `getStaticFinal`, and reference plus
  selected primitive-target `explicitCast` exact and numeric conversion paths,
  plus selected descriptor-level
  `ConstantBootstraps.invoke` resolution for public static method handles with
  constant arguments, primitive return widening, and reference cast failure
  wrapping, selected
  `BootstrapMethodError` failure wrapping for bad primitive names, missing enum
  constants, and invalid reference/primitive explicit casts, selected `getStaticFinal`
  missing-field and wrong-type
  `NoSuchFieldError` failures, selected
  `ConstantDescs` bootstrap method-handle descriptor constants, including
  the nested `VarHandle$VarHandleDesc` nominal descriptor, primitive-class,
  enum, static-final, null, VarHandle field/static/array,
  invoke, and explicit-cast descriptors, plus constant and call-site bootstrap
  descriptor factory metadata, null validation, primitive/array owner
  rejection, and void-parameter rejection, selected
  `MethodHandles.Lookup.findStatic`/`findVirtual` `invokeExact`/`invoke`
  behavior, method-handle type display, missing-method failure path,
  non-nestmate private access failures, same-package package-private access,
  cross-package public and subclass protected access, cross-package
  package-private failures, nestmate private static/instance access, selected
  static/instance `String`, `int`, and `long` field getter/setter handles under
  those access modes plus public final static/instance setter rejection,
  selected
  `findConstructor` public/package-private/nestmate-private success and
  non-nestmate private failure paths, selected `Lookup.unreflect`,
  `unreflectConstructor`, `unreflectGetter`, and `unreflectSetter` public
  success, non-nestmate private failure, and nestmate-private success paths,
  selected `MethodHandles.reflectAs` method, constructor, getter, and setter
  round-trips,
  selected `MethodHandles.privateLookupIn` same-package target lookup,
  caller/peer private constructor, method, and field access, public lookup
  rejection, and primitive/array target rejection,
  selected `MethodHandle.asType` reference cast, return widening-to-`Object`,
  non-void return dropping-to-`void`, `void` return-to-`null` reference
  adaptation, primitive argument and return widening, primitive return boxing,
  `Integer`-to-`int` unboxing, arity mismatch, and runtime cast failure paths,
  selected `MethodHandles`
  combinators covering `identity`, `constant`, `bindTo`, `insertArguments`,
  `dropArguments`, `filterArguments`, `filterReturnValue`, `permuteArguments`,
  `guardWithTest`, `catchException`, `exactInvoker`, `invoker`,
  `spreadInvoker`, `collectArguments`, zero-position and selected
  nonzero-position `foldArguments`, `explicitCastArguments`,
  `arrayElementGetter`, `arrayElementSetter`, `throwException`, selected
  `MethodHandle.asCollector`, `asSpreader`, `asVarargsCollector`, and
  `asFixedArity` adapter flows, and Java 17 public overlays `zero`, `empty`,
  `arrayLength`, `arrayConstructor`, `dropArgumentsToMatch`, `dropReturn`,
  selected `tryFinally` flows, and selected
  `whileLoop`/`doWhileLoop`/`countedLoop` non-`void` state loops with
  descriptor checks, sealed
  metadata, and
  illegal direct subtype rejection; Java 18-26 simple parser-only class-file
  containers; and runnable Java 9/10/11/12/13/14/15/16/17 comparisons.
- The default `grunt test` suite is not currently green under the Java 17 host
  used here; existing Java 8-era output mismatches must be triaged separately.

## Known Preview Gaps

- Java 12 switch expressions and Java 13 text blocks were preview features.
  Current fixtures cover the final Java 14/15 forms plus Java 12/13 class-file
  runtime baselines, not historical preview encodings.

## Known StackWalker Gaps

- `StackWalker.getCallerClass` is implemented for retained class-reference
  walkers and tested for the success path, nested-helper caller lookup,
  reflection-frame filtering, missing retained-class-reference failure, and
  missing caller-frame failure.
- `StackWalker.walk` and `forEach` expose the current Java stack with basic
  `StackFrame` class name, method name, declaring class, bytecode index, source
  file, line number, native flag, descriptor, `MethodType`, and
  `toStackTraceElement`/`toString` support. The `walk` stream is closed after
  the callback returns, matching the native JVM's `IllegalStateException` for
  later stream reuse.
- `StackFrame.getDescriptor()` remains available without
  `RETAIN_CLASS_REFERENCE`, while `getDeclaringClass()` and `getMethodType()`
  enforce that option in the tested native-compatible paths.
- `StackWalker.getInstance(Set<Option>)` rejects null option elements, including
  the delegated `getInstance(Set<Option>, int)` path after depth validation.
- `SHOW_HIDDEN_FRAMES` controls lambda proxy frame filtering and is covered by
  native JVM output comparison.
- `SHOW_REFLECT_FRAMES` controls `java.lang.reflect`/`sun.reflect`/`jdk.internal.reflect`
  frame filtering and is covered by native JVM output comparison.

## Known Optional Gaps

- Object `java.util.Optional` now exposes the tested Java 9/10/11 methods:
  `ifPresentOrElse`, `or`, `stream`, no-arg `orElseThrow`, and `isEmpty`, while
  preserving the Java 8 method surface used by existing code. Coverage includes
  selected null timing for present/empty branches and stream spliterator
  metadata.
- Primitive optional classes `OptionalInt`, `OptionalLong`, and
  `OptionalDouble` now expose the tested Java 9/10/11 additions:
  `ifPresentOrElse`, `stream`, no-arg `orElseThrow`, and `isEmpty`, while
  preserving their Java 8 method surfaces. Coverage includes selected null
  timing and stream spliterator metadata for present/empty primitive optionals.

## Known Core Lang Gaps

- `java.lang.CharSequence` preserves the tested Java 8 `chars` and
  `codePoints` default behavior and adds tested Java 11 `compare` plus Java 15
  `isEmpty` behavior.
- `java.lang.Character.toString(int)` now covers selected Java 11 code-point
  string construction for BMP, supplementary, NUL, and max code points plus
  invalid-range rejection.
- `java.lang.StringBuilder` and `StringBuffer` now expose selected Java 11
  `compareTo` behavior for lexicographic ordering, equal and mutated contents,
  prefix-length ordering, NUL character ordering, and null argument rejection.
- `java.lang.Runtime$Version` covers the tested Java 9 `Runtime.Version.parse`
  surface plus Java 10 accessors: version-number accessors, optional
  pre/build/optional metadata including optional components without build
  numbers, string rendering, immutable version lists, comparison/equality
  including exact equality for numeric prerelease spellings,
  ignore-optional variants, and numeric prerelease comparison, selected invalid
  input validation, and `feature`/`interim`/`update`/`patch`.
- `java.lang.StackTraceElement` now exposes selected Java 9 metadata
  constructor and accessor behavior for class-loader name, module name, and
  module version while preserving the existing class/method/file/line fields,
  plus metadata-aware `toString`, `equals`, and `hashCode` behavior.
- `java.lang.Class` now exposes selected Java 9 `getPackageName()` behavior
  for ordinary, nested, local, anonymous, primitive, void, reference-array, and
  primitive-array classes.
- `java.lang.Class` now exposes selected Java 11 nest reflection behavior:
  `getNestHost`, `getNestMembers`, and `isNestmateOf` for ordinary
  host/member/local/anonymous classes, primitives, void, arrays, and selected
  JDK `getNestHost`/non-nestmate checks, including null argument validation
  for `isNestmateOf`.
- `java.lang.Class` now exposes selected Java 12 `descriptorString()` behavior
  for ordinary, nested, local, primitive, void, reference-array, and
  primitive-array classes.
- `java.lang.Class` now exposes selected Java 12 `componentType()` behavior
  for non-array, primitive, void, reference-array, primitive-array, and
  multidimensional-array classes.
- `java.lang.Class` now exposes selected Java 12 `arrayType()` behavior for
  ordinary, primitive, reference-array, primitive-array, user-class array, and
  void rejection paths.
- `java.lang.Class` now exposes selected Java 15 `isHidden()` behavior for
  non-hidden ordinary, nested, local, anonymous, JDK, primitive, void, and
  array classes. Hidden class definition and discovery are not implemented.
- `java.lang.System$Logger` covers the tested Java 9 nested interface and
  `Level` enum type surface, level metadata, and default log-method delegation
  for custom logger implementations, including null validation and lazy
  disabled logger behavior for supplier and object overloads. `System.getLogger`
  returns a minimal no-op `System.Logger` shim for the tested name/type,
  null-argument, and returned-logger null-level validation paths.
- Selected `java.lang.StrictMath` native hooks are covered by Java 17 parity
  fixtures for `cbrt`, `cosh`, `expm1`, `hypot`, `log10`, `log1p`, `sinh`,
  and `tanh`. The shim delegates to host JavaScript `Math` functions for these
  paths, so exhaustive fdlibm bit-for-bit parity across all inputs is not
  claimed.
- `Runtime.version()` returns a cached baseline `Runtime.Version` object,
  `Thread.onSpinWait()` is implemented as the tested no-op spin hint, and
  `Reference.reachabilityFence(Object)` is implemented as the tested no-op
  reachability barrier shim for object and null references.
- Selected Java 9 `Math.multiplyFull(int, int)` and
  `StrictMath.multiplyFull(int, int)` behavior is covered for signed 64-bit
  products, including zero, negative operands, and values whose product exceeds
  32-bit range. Selected Java 9 `Math.multiplyHigh(long, long)` and
  `StrictMath.multiplyHigh(long, long)` behavior is covered for signed high
  products, including zero, positive overflow-scale operands, negative
  operands, and `Long.MIN_VALUE`/`Long.MAX_VALUE` extremes. Selected Java 15
  `Math.absExact(int/long)` and `StrictMath.absExact(int/long)` behavior is
  covered for positive, negative, zero, max-value, and `MIN_VALUE` overflow
  exception paths. Selected Java 9 `Math.floorDiv(long, int)`,
  `StrictMath.floorDiv(long, int)`, `Math.floorMod(long, int)`, and
  `StrictMath.floorMod(long, int)` behavior is covered for sign combinations,
  `Long.MIN_VALUE`, `Long.MAX_VALUE`, large non-even divisions, and
  zero-divisor exceptions.
- Selected Java 18 `Math.unsignedMultiplyHigh(long, long)` and
  `StrictMath.unsignedMultiplyHigh(long, long)` behavior is covered for
  unsigned high-product results including zero, power-of-two, all-one bit
  patterns, `Long.MIN_VALUE`, and mixed-sign unsigned operands.
- Selected Java 18 UTF-8 default charset expectations are covered for
  `file.encoding`, `Charset.defaultCharset()`, default `String` byte
  decoding/encoding, and default `InputStreamReader`/`OutputStreamWriter` byte
  conversion.
- Selected Java 19 `Thread.threadId()` behavior is covered for the current
  thread, including a positive identifier and parity with the existing
  `Thread.getId()` value. Selected Java 19 `Thread.sleep(Duration)` behavior
  is covered for negative no-op, zero duration, short positive duration, and
  null rejection, plus `InterruptedException` delivery when another thread
  interrupts a sleeping thread. Java 19 preview virtual-thread builders are
  not implemented.
- Java 20 through Java 26 class-file versions are covered by both parser-only
  container fixtures and runnable print fixtures that verify Doppio can load,
  link, initialize, and execute a simple `main` method for major versions 64
  through 70.
- Selected Java 21 `Thread.isVirtual()` behavior is covered for Doppio's
  platform-thread-only runtime, including the current main thread, an
  unstarted platform `Thread`, and a started platform `Thread`.
  `Thread.ofVirtual()` and
  `Thread.startVirtualThread(...)` are not implemented.
- Selected Java 21 `SequencedCollection`/`List`/`Deque`/`SequencedSet`
  behavior is covered for
  `List` assignability to `SequencedCollection`, `List.of(...)`
  non-empty and empty endpoint access, singleton first/last identity,
  `List.reversed()` first/last access and double-reverse identity, and
  mutable-list `addFirst`, `addLast`, `removeFirst`, and `removeLast` default
  methods. It also covers `ArrayDeque` assignability to
  `SequencedCollection`, `Deque.reversed()` endpoint access,
  double-reverse identity, endpoint removals, size after endpoint removals,
  and empty `Deque.getFirst()` exception behavior. It also covers `TreeSet`
  assignability to `SequencedSet` and `SequencedCollection`, selected
  `SortedSet` first/last endpoint access, `NavigableSet.reversed()` via
  reverse-order views, endpoint removals, size after endpoint removals, empty
  `SortedSet.getFirst()` exception behavior, and unsupported explicit
  positioning on sorted sets. It also covers `TreeMap` assignability to
  `SequencedMap` through the `SortedMap`/`NavigableMap` hierarchy, selected
  `SequencedMap` first/last entry access, `NavigableMap.reversed()` via
  descending views, sequenced key/value/entry view endpoint access, sorted
  first/last key access, endpoint entry removals, size after removals, and
  unsupported explicit front insertion on sorted maps. Broader sequenced
  collection surfaces, including `LinkedHashSet`/insertion-order set
  hierarchy updates, insertion-order map hierarchy updates, and fully
  specified reverse-view mutation semantics beyond the tested
  list/deque/sorted-set/sorted-map paths, are not implemented.
- Selected Java 11 `String` additions are covered for `isBlank`, `strip`,
  `stripLeading`, `stripTrailing`, `repeat`, and `lines`, including negative
  repeat count validation and line splitting for LF, CRLF, CR, empty input,
  and trailing terminators.
	- Selected Java 12 `String.indent` behavior is covered for empty input,
	  positive indentation, negative indentation, Java whitespace removal, CRLF/CR
	  normalization, and trailing terminators. Selected Java 12
	  `String.transform` behavior is covered for contravariant functions, object
	  and null returns, null function validation, and mapper exception
	  propagation. Selected Java 12 `String`, `Integer`, `Long`, `Float`, and
	  `Double` `describeConstable` and `resolveConstantDesc` behavior is covered
	  for present optionals and self-returning constants.
- Selected Java 15 `String.formatted` behavior is covered by delegating to the
  existing `String.format(String, Object...)` implementation for varargs,
  literal percent, null argument, explicit object-array, and missing-argument
  exception paths. Selected Java 15 `String.translateEscapes` behavior covers
  named escapes, `\s`, octal escapes, line continuation, and invalid/trailing
  escape validation. Selected Java 15 `String.stripIndent` behavior covers
  incidental indentation removal, trailing whitespace removal, blank-line
  handling, tab indentation, and trailing line-terminator opt-out behavior.
  Selected Java 15 `Boolean`, `Byte`, `Short`, and `Character`
  `describeConstable` behavior covers dynamic descriptor metadata and resolved
  values.
- Broader Java 9+ `java.lang` APIs, including remaining `String` additions
  beyond this selected surface and module-facing reflection hooks are not
  implemented by this shim.

## Known Functional Interface Gaps

- `java.util.function.Predicate` now exposes tested Java 11 `Predicate.not`
  while preserving the Java 8 `and`, `or`, `negate`, and `isEqual` surface.

## Known Regex Gaps

- `java.util.regex.Pattern` now exposes selected Java 11
  `asMatchPredicate()` behavior through a small predicate shim. Coverage
  includes full-match semantics, captured pattern reuse, null input rejection,
  and raw-predicate non-string argument failure.
- `java.util.regex.Matcher` now exposes selected Java 9 `results()` behavior
  through a lazy `MatchResult` stream. Coverage includes capture groups,
  result snapshots, continuation from the current matcher position, empty
  result streams, spliterator metadata, and iterator exhaustion.
- `java.util.regex.Matcher` now exposes selected Java 9
  `appendReplacement(StringBuilder, String)` and `appendTail(StringBuilder)`
  behavior. Coverage includes builder mutation, returned-object identity,
  group-reference expansion, quoted literal replacements, no-match tails,
  illegal-state failure before a match, and null validation.
- `java.util.regex.Matcher` now exposes selected Java 9
  `replaceAll(Function<MatchResult, String>)` and
  `replaceFirst(Function<MatchResult, String>)` behavior. Coverage includes
  reset-before-replacement behavior, capture groups in the replacement
  function, replacement group-reference expansion, quoted literal
  replacements, no-match input preservation, call counts, null validation, and
  replacer exception propagation.
- `java.util.Scanner` now exposes selected Java 9 `tokens()` behavior through a
  lazy token stream. Coverage includes default and custom delimiters, empty
  tokens with simple comma delimiters, continuation from the current scanner
  position, empty input, iterator exhaustion, and spliterator metadata.
- `java.util.Scanner` now exposes selected Java 9 `findAll(Pattern)` and
  `findAll(String)` behavior through lazy `MatchResult` streams. Coverage
  includes capture groups, string-pattern compilation, continuation from the
  current scanner position, empty result streams, null validation,
  spliterator metadata, and iterator exhaustion.
- `java.util.Scanner` now exposes selected Java 10 charset constructors for
  `InputStream`, `File`, `Path`, and `ReadableByteChannel` targets. Coverage
  includes decoded token output and null charset/source behavior.
- Broader Java 9+ regex additions beyond the tested scanner and matcher stream
  helpers are not implemented yet.

## Known Stream Pipeline Gaps

- `java.util.stream.Stream`, `IntStream`, `LongStream`, and `DoubleStream` are
  patched as interface shims that preserve the Java 8 abstract stream surface
  and add tested Java 9 helpers: `Stream.ofNullable`, three-arg object and
  primitive `iterate`, ordered sequential object and primitive `takeWhile` and
  `dropWhile`, close propagation from the derived stream, `concat` close
  exception suppression including duplicate throwable handling, and null
  predicate/operator validation.
- The tested Java 16 surface covers `Stream.toList()` order preservation,
  unmodifiable result behavior, null-element retention, selected object
  `Stream.mapMulti`, `mapMultiToInt`, `mapMultiToLong`, `mapMultiToDouble`,
  and primitive `IntStream.mapMulti`, `LongStream.mapMulti`, and
  `DoubleStream.mapMulti` expansion, empty emission, primitive summing, close
  propagation, mapper exception propagation, and null-mapper behavior.
- Primitive `IntStream`, `LongStream`, and `DoubleStream` `of(...)` helpers
  now expose tested native-compatible exact-size spliterator metadata.
- Primitive `IntStream` and `LongStream` range helpers now expose tested
  native-compatible exact-size spliterator metadata for ordinary
  `range`/`rangeClosed` intervals and preserve overflow-sized long ranges as
  unknown-size streams.
- Exact OpenJDK spliterator characteristics, parallel while-operation
  semantics, broader Java 16 stream additions, and exhaustive `mapMulti` edge
  cases are not claimed yet.

## Known Concurrent Gaps

- `java.util.concurrent.Flow` now exposes the tested Java 9 nested interface
  surface for `Publisher`, `Subscriber`, `Subscription`, and `Processor`.
- `Flow.defaultBufferSize()` returns the tested OpenJDK default value `256`.
- `SubmissionPublisher` is a minimal Java 9 class-library shim for the tested
  direct-executor paths: constructor metadata and rounded capacity, subscriber
  snapshots, `isSubscribed`, cancellation removal, basic `submit`/`offer`
  delivery, `consume` future completion paths, normal/exceptional close, late
  subscribers, callback exception handling, and selected validation.
- `CompletableFuture.failedFuture(Throwable)`, `completedStage(value)`,
  `failedStage(Throwable)`, `completeAsync(Supplier)`,
  `completeAsync(Supplier, Executor)`, `delayedExecutor(...)`, `orTimeout`,
  `completeOnTimeout`, `copy()`, `minimalCompletionStage()`, and
  `newIncompleteFuture()` are minimal Java 9 shims covering normal and
  exceptional completion metadata, fresh incomplete future creation, supplied
  and common-pool async completion, already-completed no-op completion,
  supplier failure/rejected-executor behavior, delayed executor completion,
  timeout exceptional completion, timeout fallback completion, negative-delay
  immediate behavior, pending-source completion relay, `exceptionally` recovery,
  `get()`/`join()` failure wrapping, `toCompletableFuture()` copies for minimal
  stages, selected `MinimalStage` unsupported direct methods, and null
  validation.
  `defaultExecutor()` returns the tested common-pool executor and executes a
  submitted task off the caller thread.
  Java 12 `CompletableFuture` receiver methods `exceptionallyAsync`,
  `exceptionallyCompose`, and `exceptionallyComposeAsync` cover tested success
  propagation, failure recovery, compose flattening, common-pool/supplied
  executors, rejected-executor failures, handler failures, null compose
  results, and null validation. Java 12 `CompletionStage`-typed dispatch for
  these exceptional recovery methods covers tested `CompletableFuture` receiver
  success propagation, failure recovery, compose flattening, null compose
  results, and null validation.
- Asynchronous scheduling parity, full backpressure/drop policies, concurrent
  memory-safety semantics, and broader Java 9+ `java.util.concurrent` API
  additions are not implemented yet.

## Known Cleaner Gaps

- `java.lang.ref.Cleaner` is a minimal Java 9 class-library shim covering
  explicit registration, `ThreadFactory` invocation/null validation, and
  idempotent `Cleanable.clean()`.
- GC-triggered cleanup, background cleaner thread behavior, phantom/reference
  queue integration, and `ThreadFactory`-created thread startup/lifecycle are
  not implemented. `create(ThreadFactory)` currently marks the returned thread
  daemon but does not start or manage a cleaner thread.

## Known IO Gaps

- `java.io.InputStream` now exposes tested Java 9 `readAllBytes`,
  `readNBytes(byte[], int, int)`, `transferTo`, Java 11 `readNBytes(int)`, and
  `nullInputStream` behavior, plus tested Java 12 `skipNBytes(long)` positive,
  negative, EOF, invalid skip-return, zero-skip fallback, and null-stream
  closed behavior, while preserving the Java 8 `InputStream` abstract/default
  surface.
- `java.io.OutputStream` now exposes tested Java 11 `nullOutputStream` while
  preserving the Java 8 `OutputStream` abstract/default surface.
- `java.io.Reader` now exposes tested Java 10 `transferTo(Writer)` and Java 11
  `nullReader` EOF, ready, skip, and closed-state behavior while preserving
  the Java 8 `Reader` abstract/default surface.
- `java.io.Writer` now exposes tested Java 11 `nullWriter` while preserving the
  Java 8 `Writer` abstract/default surface.
- `java.io.FileReader` and `java.io.FileWriter` now expose tested Java 11
  charset-aware constructors while preserving the Java 8 constructor surface.
- `java.io.ByteArrayOutputStream` now exposes tested Java 10
  `toString(Charset)` and Java 11 `writeBytes(byte[])` while preserving the
  Java 8 byte-array stream surface.
- `java.io.PrintStream` now exposes tested Java 10
  `PrintStream(OutputStream, boolean, Charset)`, `PrintStream(File, Charset)`,
  and `PrintStream(String, Charset)` plus Java 14 `writeBytes(byte[])` and
  `write(byte[])` while preserving the Java 8 print stream surface.
- `java.io.PrintWriter` now exposes tested Java 10
  `PrintWriter(OutputStream, boolean, Charset)`, `PrintWriter(File, Charset)`,
  and `PrintWriter(String, Charset)` while preserving the Java 8 print writer
  surface.
- Other Java 9+ `java.io` helpers are not implemented yet.

## Known NIO File Gaps

- `java.nio.file.Path` preserves the existing Doppio Java 8-era abstract
  interface surface and adds the tested Java 11 static factories
  `Path.of(String, String...)` and `Path.of(URI)`.
- `java.nio.file.Files` has a minimal shim for the tested Java 11
  `readString`/`writeString` paths and Java 12 `mismatch` paths including
  directory failure behavior plus the file
  helpers needed by the modern fixtures: temp file/directory creation
  including null/short prefixes and selected parent-directory failures,
  `readAllBytes`, `readAllLines`, `lines`, `list`, selected `walk`/`find`,
  `newDirectoryStream` iterator/close behavior, lazy filter exceptions, and
  escaped glob metacharacters, buffered reader/writer helpers, byte-array and
  line-based `write` including selected validation-order behavior, selected `newByteChannel` read/write/create/append and parent-target
  paths, `delete`, `deleteIfExists`, including non-empty-directory
  failure behavior, basic
  existence/type/hidden/symlink/access queries, `size`, selected
  `getFileStore` metadata/space/attribute-view behavior, selected
  `BasicFileAttributes` `readAttributes`, selected `BasicFileAttributeView`,
  selected owner lookup/setter behavior, selected `FileOwnerAttributeView`
  lookup/setter behavior, selected owner string-attribute lookup/setter
  behavior, selected owner POSIX permission get/set behavior, selected
  `PosixFileAttributes` and
  `PosixFileAttributeView` behavior, selected POSIX string-attribute lookup,
  read, and setter behavior,
  selected `getAttribute`,
  string-based `readAttributes`, `setAttribute`, and extension-based
  `probeContentType`, input helper parent-target validation, timestamp get/set helpers,
  `isSameFile`, and basic
  `createFile`/`createDirectory`/`createDirectories` paths including
  single-level and recursive parent-file failure behavior. `writeString`
  covers null-charset validation before `CharSequence.toString()`. The tested copy
  surface covers path-to-path file and directory sources, same-file no-op,
  input-to-path, and path-to-output streams, `REPLACE_EXISTING`,
  path-copy missing-parent/parent-file target validation,
  stream-copy replacement of empty directory targets, stream-copy
  non-empty-directory/missing-parent/parent-file target validation,
  path-copy `COPY_ATTRIBUTES`/`NOFOLLOW_LINKS` option acceptance,
  and unsupported stream-copy option rejection. The tested move
  surface covers plain-file and directory basic movement, target-parent
  validation, same-file no-op, existing target
  rejection/replacement including selected directory targets, missing-source failure, `NOFOLLOW_LINKS`/`ATOMIC_MOVE`
  option acceptance for plain files, and `COPY_ATTRIBUTES` rejection; it does
  not verify real atomicity.
  The tested output option surface includes append, create-new, `WRITE`
  overwrite-without-truncate behavior, `READ` rejection for output helpers,
  selected output parent-target validation, selected `SYNC`/`DSYNC`/`SPARSE` acceptance, `DELETE_ON_CLOSE` immediate
  path deletion for input and output streams, missing-file failure for
  `DELETE_ON_CLOSE` without creation, and `WRITE`/`APPEND` rejection for input
  helpers.
- Broader Java 11+ NIO file APIs, exact provider discovery edge cases,
  attribute/view/link APIs, directory walking edge cases, remaining glob syntax edge cases, broader stream helpers, and new default method
  behavior beyond the tested factories are not implemented.

## Known HTTP Client Gaps

- `java.net.http` is a minimal Java 11 class-library shim for builder metadata
  only. The tested surface covers `HttpClient.newBuilder()`, client version,
  redirect policy, connect timeout, cookie handler, proxy selector,
  authenticator, and executor optional metadata, default SSL context/parameters
  presence, selected `SSLParameters` defensive copying, `Builder.NO_PROXY`
  direct immutable proxy selection, selected builder priority/null validation,
  `HttpRequest.newBuilder(URI)`, timeout,
  repeated headers, no-arg/default builder metadata, `setHeader` replacement,
  `HttpRequest.Builder.copy()` snapshot behavior,
  selected builder URI/header/body/method validation and `HttpHeaders.of`
  empty-name/permissive invalid-name and CR/LF-value behavior,
  case-insensitive lookup and `map().containsKey`, filter snapshot behavior,
  map/value-list immutability, `firstValueAsLong`, and null/parse validation, URI/method
  metadata, selected WebSocket builder header/subprotocol permissive validation,
  selected
  `BodyPublishers` content-length behavior, including mutable full-array and
  offset-slice `ofByteArray`, existing-file `ofFile`,
  `fromPublisher` fixed/unknown metadata and delegate publication,
  selected in-memory `ofByteArrays`/`ofInputStream` payload publication and
  error propagation,
  selected Java 16 `HttpRequest.newBuilder(HttpRequest, BiPredicate)`
  metadata/body/header-filter copy behavior, selected Java 16
  `BodyPublishers.concat` ordered in-memory payload
  publication, and selected `BodySubscribers`/`BodyHandlers` helpers with
  byte-array/string/input-stream/line collection, byte-array consumer events,
  explicit-option response body file writes, selected `Content-Type` charset
  inference for no-arg string and line response handlers, and selected
  `Content-Disposition` `filename` file-download writes including escaped quoted
  filename values and bad `filename*` rejection, plus selected
  `BodySubscribers.fromSubscriber` lifecycle and `BodyHandlers.fromSubscriber`
  forwarding, selected `fromLineSubscriber` forwarding with explicit line
  separators and charset decoding, selected `ofPublisher` bridge delivery, and
  selected `ofLines` line-stream collection.
- Real HTTP/WebSocket I/O, asynchronous transport, SSL/proxy/cookie/auth
  behavior, complete response body decoding/subscription semantics beyond the
  tested in-memory byte collectors, exhaustive `Content-Disposition` parsing
  beyond the tested simple and escaped quoted `filename` values,
  asynchronous/backpressure
  request body streaming beyond the tested eager publishers, exhaustive
  WebSocket builder semantics beyond the tested permissive validation calls, and exhaustive
  header and method validation beyond the tested builder name/value,
  method-token, and selected `HttpHeaders.of`/lookup/immutability paths are not
  implemented.

## Known CompactNumberFormat Gaps

- `java.text.CompactNumberFormat` is a minimal Java 12 class-library shim
  covering the tested constructor null checks, simple suffix-based compact
  integer formatting, negative formatting, parse-position behavior, selected
  default and US SHORT/LONG `NumberFormat.getCompactNumberInstance` factory
  paths, fresh factory instances, and null locale/style validation.
- Locale plural rules, decimal/fraction rounding parity, attributed formatting,
  locale data beyond the tested US SHORT/LONG suffix patterns, serialization,
  and exhaustive pattern grammar support are not implemented.

## Known Constant API Gaps

- `java.lang.constant.ClassDesc`, `ConstantDesc`, `Constable`,
  `MethodTypeDesc`, `MethodHandleDesc`, `DirectMethodHandleDesc`,
  `ConstantDescs`, and `java.lang.invoke.TypeDescriptor` are minimal Java 12
  class-library shims, with a narrow `DynamicConstantDesc` extension for tested
  `ConstantDescs.TRUE`/`FALSE`/`NULL` dynamic constants and descriptor display
  metadata.
  The tested surface covers descriptor construction for classes, primitives,
  arrays, and nested classes; package/display names; component lookup; equality;
  resolving selected primitive/reference/array descriptors to `Class` through
  the lookup class loader;
  rejecting selected invalid binary/package/class member names through `ClassDesc.of`
  and `ClassDesc.nested`;
  rejecting empty, void-array, and unknown primitive descriptors through
  `ClassDesc.ofDescriptor` and `ClassDesc.arrayType`; rejecting selected
  malformed internal-name class descriptors with leading, doubled, or trailing
  slashes; accepting rank-255 array descriptors and rejecting selected rank-256
  descriptors through raw descriptor parsing and `arrayType`; selected `MethodTypeDesc` method
  descriptor construction, transformations, and `MethodType` resolution;
  selected `MethodHandleDesc`/`DirectMethodHandleDesc` static method, virtual
  method, constructor, getter, setter, static-getter, and static-setter
  factories; selected `resolveConstantDesc` execution for public same-class
  and selected JDK-class static/virtual methods, constructors, static/instance
  fields, and `asType`; validation of owner class/interface descriptors, method versus
  field lookup descriptors, constructor return descriptors, and void field
  descriptors; `Kind.valueOf` field/interface/class ref-kind mappings;
  owner/name/lookup-descriptor metadata; invocation type descriptors; selected
  `asType` wrapper display/equality/hash behavior; and OpenJDK-style display;
  selected `ConstantDescs.CD_*` descriptor constants including
  `CD_MethodHandleDesc_Kind`; `DEFAULT_NAME`; `NULL` resolution and
  dynamic-constant display; and Java 17 `TRUE`/`FALSE` constant
  names, boolean resolution, bootstrap args/list snapshots, equality,
  `DynamicConstantDesc.ofCanonical` `NULL` identity, selected descriptor
  `toString` formatting, selected descriptor-level
  `DynamicConstantDesc.resolveConstantDesc` paths for `nullConstant`,
  `primitiveClass`, `enumConstant`, `getStaticFinal`, and reference plus
  selected primitive-target `explicitCast` exact and numeric conversion paths,
  plus selected descriptor-level
  `ConstantBootstraps.invoke` resolution for public static method handles with
  constant arguments, primitive return widening, and reference cast failure
  wrapping, selected
  `BootstrapMethodError` failure wrapping for bad primitive names, missing enum
  constants, and invalid reference/primitive explicit casts, selected `getStaticFinal`
  missing-field and wrong-type
  `NoSuchFieldError` failures, bootstrap method-handle descriptor constants including
  nested `VarHandle$VarHandleDesc` and VarHandle bootstrap descriptors, and
  constant/call-site bootstrap descriptor factory
  metadata plus selected owner and parameter validation.
- Broad `MethodHandleDesc`/`DirectMethodHandleDesc` resolution beyond the
  tested public same-class static/virtual/constructor/field and `asType`
  descriptor cases, exhaustive `asType` semantics, exhaustive factory
  validation, unsupported handle kinds beyond the tested descriptor cases,
  broad `DynamicConstantDesc` bootstrap execution beyond the selected
  descriptor-level `ConstantBootstraps.invoke` public-static method-handle
  cases, failure handling beyond the
  selected descriptor-level failure paths, and canonicalization beyond the
  selected descriptor-level resolution paths,
	  nominal descriptor interoperation with `ldc` constants,
	  exhaustive `ConstantDescs` factory validation, core-class
	  `Constable.describeConstable()` integration beyond the tested `Class`,
	  `String`, `Integer`, `Long`, `Float`, `Double`, and selected `Enum`
	  simple-constant direct-method bridges,
	  exact OpenJDK descriptor validation beyond the tested descriptors, and full
	  `Lookup` access checks are not implemented. See
	  `docs/design/java-lang-invoke.md` for the gated
  implementation plan for this surface.

## Known Collection Factory Gaps

- `java.util.List`, `java.util.Set`, and `java.util.Map` now expose tested
  Java 9 factory methods, Java 10 `copyOf` methods, and Java 17
  `Map.Entry.copyOf` through minimal class-library shims. `java.util.List`
  also exposes tested Java 21 `SequencedCollection` inheritance plus selected
  `getFirst()`/`getLast()`, `addFirst()`/`addLast()`,
  `removeFirst()`/`removeLast()`, and `reversed()` default methods, and
  `java.util.Deque` exposes tested Java 21 `SequencedCollection` inheritance
  plus selected endpoint and `reversed()` default behavior. `java.util.TreeSet`
  now exposes tested Java 21 `SequencedSet`/`SequencedCollection` inheritance
  through the `SortedSet`/`NavigableSet` hierarchy plus selected endpoint and
  `reversed()` behavior, and `java.util.TreeMap` exposes tested Java 21
  `SequencedMap` inheritance through the `SortedMap`/`NavigableMap` hierarchy
  plus selected endpoint entry, sequenced view, and `reversed()` behavior. Empty
  varargs factory calls reuse the same empty singletons as the fixed empty
  factories, and factory-created immutable collections reject tested null
  lookup probes such as `List.contains(null)`, `Set.contains(null)`,
  `Map.get(null)`, and non-empty
  `Map.entrySet().contains(null)`, while empty `Map.entrySet().contains(null)`
  returns false like native Java.
  `Map.entry` uses a
  shim-specific immutable entry so `Map.Entry.copyOf(Map.entry(...))` preserves
  identity while user-created immutable entries are copied. Empty factory
  collections are distinct from legacy `Collections.empty*()` singletons so
  `copyOf` can preserve the former without preserving the latter.
- `java.util.Collection` now exposes tested Java 11
  `toArray(IntFunction)` while preserving the Java 8 default `removeIf`,
  `spliterator`, `stream`, and `parallelStream` surface. Coverage includes
  generator size, empty collections, oversized array reuse, null generator,
  null returned arrays, and incompatible array failure paths.
- `java.util.Enumeration` now exposes tested Java 9 `asIterator()` behavior
  while preserving the Java 8 `hasMoreElements`/`nextElement` surface.
- OpenJDK's compact immutable collection implementation classes, broader
  value-based identity details, serialization details, and copy identity
  preservation optimizations beyond the tested factory-created collection and
  `Map.entry` cases are not implemented.

## Known Stream Collector Gaps

- `java.util.stream.Collectors` is a minimal shim preserving the tested Java 8
  `joining` paths used by existing StackWalker fixtures and the package-private
  collector helpers needed by precompiled Java 8 stream classes.
- The tested Java 9 collector-composition surface covers `filtering` and
  `flatMapping`, while also preserving tested Java 8 `mapping` and
  `collectingAndThen` behavior. Coverage includes sequential downstream
  accumulation, mapped stream closing, null-stream handling, characteristic
  propagation/removal, and native-compatible null timing for mapper/predicate
  failures.
- The tested Java 8 collector surface now includes `counting`, `minBy`,
  `maxBy`, and all three `reducing` overloads, covering empty/non-empty
  results, optional results, downstream use in grouping/partitioning,
  characteristics, and selected native-compatible null timing.
- The tested numeric collector surface covers `summingInt`, `summingLong`,
  `summingDouble`, `averagingInt`, `averagingLong`, `averagingDouble`,
  `summarizingInt`, `summarizingLong`, and `summarizingDouble`, including
  empty/non-empty results, selected overflow/double results, summary-statistic
  metadata, downstream grouping/partitioning use, characteristics, and null
  mapper timing.
- The tested map collector surface covers Java 8 `toMap` overloads including
  custom map suppliers, duplicate-key rejection, merge functions, null-key
  acceptance, null-value rejection, and selected mapper/merge/supplier null
  timing.
- The tested concurrent map collector surface covers Java 8 `toConcurrentMap`
  overloads including default and custom concurrent maps, duplicate-key
  rejection, merge functions, `CONCURRENT`/`UNORDERED`/`IDENTITY_FINISH`
  characteristics, null-key/null-value rejection, and selected
  mapper/merge/supplier null timing.
- The tested grouping surface covers Java 8 `groupingBy` overloads with default
  `HashMap`, custom map factories, downstream `toList`, downstream Java 9
  `filtering`/`flatMapping`, result-map mutability, null classifier/downstream
  validation, and null-key rejection.
- The tested concurrent grouping surface covers Java 8 `groupingByConcurrent`
  overloads with default and custom concurrent maps, downstream `toList`,
  downstream `joining`, downstream `mapping`, result-map mutability,
  `CONCURRENT`/`UNORDERED` characteristics with identity-finish propagation,
  null classifier/downstream validation, null-key rejection, and null factory
  timing.
- The tested partitioning surface covers Java 8 `partitioningBy` overloads with
  downstream `toList` and `joining`, fixed `false`/`true` keys, native-style
  unmodifiable partition-map structure, mutable downstream lists, collector
  characteristics, and null predicate/downstream validation.
- The tested Java 10 surface covers `toUnmodifiableList`,
  `toUnmodifiableSet`, and both `toUnmodifiableMap` overloads for
  unmodifiable results, `copyOf` identity preservation, null rejection,
  duplicate-key rejection, duplicate set dedupe, merge behavior, and
  null-merge removal.
- The tested Java 12 surface covers `teeing` for sequential downstream result
  merging, downstream finisher application, basic characteristic intersection,
  null validation, and downstream null-element rejection.
- Exhaustive parallel/concurrent collector semantics beyond the tested
  sequential-compatible concurrent map/grouping paths are not implemented by
  this shim.

## Known ProcessHandle Gaps

- `ProcessHandle.current()`/`of(pid)` are minimal Java 9 class-library shims.
  They return a stable in-VM handle with the Doppio host process pid and
  `isAlive() == true` for the tested current-process case, and
  `Optional.empty()` for unrecognized pids. `of(current.pid())` and
  `of(current.parent().pid())` return separate handles that compare equal by
  pid, `compareTo` is implemented as pid ordering for those stable handles, and
  `allProcesses()` exposes the current handle plus the host parent handle when
  the parent pid is available.
- `parent()` returns the Doppio host parent pid for the current handle when the
  host exposes one. When a handle represents that host parent pid,
  `children()` and `descendants()` expose the current handle; current-handle
  traversal streams remain empty. `supportsNormalTermination()` returns true,
  and the current process `onExit()`/`destroy()`/`destroyForcibly()` methods throw
  `IllegalStateException` to match the tested native JVM guard paths.
- `ProcessHandle.Info` is present for the tested current-process handle and
  returns present optionals for command, command line, arguments, start instant,
  CPU duration, and user. Command, command line, and arguments are backed by the
  Doppio host process argv, and start instant is derived from the Doppio host
  process uptime. CPU duration is derived from the Doppio host process
  `cpuUsage()` snapshot for the `Info` object; user remains a stable shim value,
  not real host process metadata.
  `info()` returns a fresh `Info` object on
  each call, matching the tested native JVM identity behavior, while repeated
  `arguments()` calls on the same `Info` object return an optional wrapping the
  same argument array. `Info.toString()` includes the OpenJDK-style
  `user`/`cmd`/`args`/`startTime`/`totalTime` keys for the shim values.
- Real parent/child process traversal, non-current `onExit`, process
  destruction, and full host process enumeration are not implemented.

## Known InstantSource Gaps

- `java.time.InstantSource` is a Java 17 class-library shim layered over the
  Java 8 `Clock`, `Instant`, `Duration`, and `ZoneId` runtime types.
- The covered surface is the tested `system`, `fixed`, `offset`, `tick`,
  `instant`, `millis`, and `withZone` behavior, including zero-duration
  identity for fixed sources, custom-source wrapping, tick truncation, and
  null/invalid-duration validation.
- Exact OpenJDK implementation class names, serialization details, and
  exhaustive `Clock` equality/toString compatibility are not claimed yet.

## Known HexFormat Gaps

- `java.util.HexFormat` is a Java 17 class-library shim covering the tested
  byte-array formatting, appendable formatting, delimiter/prefix/suffix
  accessors and parsing, `CharSequence` and `char[]` range parsing, empty
  parsing/formatting, uppercase/lowercase digit output, high/low digit
  extraction, appendable `IOException` wrapping, static digit conversion
  helpers, and numeric conversion bounds, plus value-object equality,
  hashCode, `toString`, and tested singleton/equal-value identity behavior.
- The broader OpenJDK compatibility surface, including exact exception
  messages and exhaustive parse corner cases beyond the fixture, is not
  claimed yet.

## Known RandomGenerator Gaps

- `java.util.random.RandomGenerator` and `RandomGeneratorFactory` are minimal
  Java 17 class-library shims for the tested `"Random"`, `"SecureRandom"`,
  `"SplittableRandom"`, native-default `"L32X64MixRandom"`, and
  `"L64X128MixRandom"`, `"L64X128StarStarRandom"`, and
  `"L64X256MixRandom"`, `"L64X1024MixRandom"`, and
  `"L128X128MixRandom"`, `"L128X256MixRandom"`,
  `"L128X1024MixRandom"`, `"Xoroshiro128PlusPlus"`, and
  `"Xoshiro256PlusPlus"` providers.
- The tested provider factories expose native-compatible metadata and return a
  fresh factory object for repeated `of`, `all`, and `getDefault` calls.
- Seeded `create(long)` delegates to `java.util.Random`, so the tested
  `nextInt`, bounded `nextInt`, `nextLong`, bounded `nextLong`,
  `nextBoolean`, `nextBytes`, bounded `nextDouble`, bounded `nextFloat`, and
  selected bounded stream sequence matches native Java 17 for that provider.
- `create(byte[])` for the tested `"Random"` provider follows the native
  unsupported-byte-seed fallback path by validating the seed array and using
  the no-arg provider creation path rather than deriving a deterministic long
  seed.
- The tested `"SecureRandom"` provider exposes native-compatible metadata and
  smoke-tested `create()`, `create(long)`, and `create(byte[])` bounded output
  invariants. It delegates to the host `java.security.SecureRandom`; exact
  provider algorithm selection, explicit seed application, and random sequence
  parity are not claimed.
- The tested `"SplittableRandom"` provider exposes native-compatible metadata,
  seeded `nextInt`/bounded `nextInt`/`nextLong`/`nextDouble`/`nextBoolean`
  output, byte-array fallback validation, `SplittableGenerator.of`, `split`,
  `splits`, source-backed `split(source)`, null-source validation, negative
  stream-size validation, and zero-size `splits`/`rngs` stream metadata paths.
- The tested `"L32X64MixRandom"` provider exposes native-compatible metadata,
  is returned by `RandomGeneratorFactory.getDefault()`, and covers seeded
  `nextInt`/bounded `nextInt`/`nextLong`/`nextDouble`/`nextBoolean` output,
  deterministic `create(byte[])` seed conversion, `RandomGenerator.of`,
  `SplittableGenerator.of`, selected `split`/`split(source)` output, salted
  `splits` output, source-backed `splits` output, and zero-size `splits`
  state advancement.
- The tested `"L64X128MixRandom"` provider exposes native-compatible metadata
  and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/`nextDouble`/
  `nextBoolean` output, deterministic `create(byte[])` seed conversion,
  `RandomGenerator.of`, `SplittableGenerator.of`, selected
  `split`/`split(source)` output, salted `splits` output, source-backed
  `splits` output, and zero-size `splits` state advancement.
- The tested `"L64X128StarStarRandom"` provider exposes native-compatible
  metadata and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/
  `nextDouble`/`nextBoolean` output, deterministic `create(byte[])` seed
  conversion, `RandomGenerator.of`, `SplittableGenerator.of`, selected
  `split`/`split(source)` output, salted `splits` output, source-backed
  `splits` output, and zero-size `splits` state advancement.
- The tested `"L64X256MixRandom"` provider exposes native-compatible metadata
  and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/`nextDouble`/
  `nextBoolean` output, deterministic `create(byte[])` seed conversion,
  `RandomGenerator.of`, `SplittableGenerator.of`, selected
  `split`/`split(source)` output, salted `splits` output, source-backed
  `splits` output, and zero-size `splits` state advancement.
- The tested `"L64X1024MixRandom"` provider exposes native-compatible metadata
  and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/`nextDouble`/
  `nextBoolean` output, deterministic `create(byte[])` seed conversion,
  `RandomGenerator.of`, `SplittableGenerator.of`, selected
  `split`/`split(source)` output, salted `splits` output, source-backed
  `splits` output, and zero-size `splits` state advancement.
- The tested `"L128X128MixRandom"` provider exposes native-compatible metadata
  and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/`nextDouble`/
  `nextBoolean` output, deterministic `create(byte[])` seed conversion,
  `RandomGenerator.of`, `SplittableGenerator.of`, selected
  `split`/`split(source)` output, salted `splits` output, source-backed
  `splits` output, and zero-size `splits` state advancement.
- The tested `"L128X256MixRandom"` provider exposes native-compatible metadata
  and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/`nextDouble`/
  `nextBoolean` output, byte-array seed fallback smoke,
  `RandomGenerator.of`, `SplittableGenerator.of`, selected
  `split`/`split(source)` output, salted `splits` output, source-backed
  `splits` output, and zero-size `splits` state advancement. The direct
  JDK 17 `jdk.random.L128X256MixRandom(byte[])` constructor throws for the
  tested seeds, so deterministic byte-array seed sequence parity is not
  claimed for this provider.
- The tested `"L128X1024MixRandom"` provider exposes native-compatible
  metadata and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/
  `nextDouble`/`nextBoolean` output, deterministic `create(byte[])` seed
  conversion, `RandomGenerator.of`, `SplittableGenerator.of`, selected
  `split`/`split(source)` output, salted `splits` output, source-backed
  `splits` output, and zero-size `splits` state advancement.
- The tested `"Xoroshiro128PlusPlus"` provider exposes native-compatible
  metadata and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/
  `nextDouble`/`nextBoolean` output, deterministic `create(byte[])` seed
  conversion, `RandomGenerator.of`, `JumpableGenerator.of`,
  `LeapableGenerator.of`, wrong `SplittableGenerator.of` failure, selected
  `copy`, `jump`, `leap`, `jumps`, and `leaps` behavior.
- The tested `"Xoshiro256PlusPlus"` provider exposes native-compatible
  metadata and covers seeded `nextInt`/bounded `nextInt`/`nextLong`/
  `nextDouble`/`nextBoolean` output, deterministic `create(byte[])` seed
  conversion, `RandomGenerator.of`, `JumpableGenerator.of`,
  `LeapableGenerator.of`, wrong `SplittableGenerator.of` failure, selected
  `copy`, `jump`, `leap`, `jumps`, and `leaps` behavior.
- Interface default methods for custom `RandomGenerator` implementations are
  covered for the tested `nextLong()` bit-slicing paths behind `nextBoolean`,
  `nextInt`, bounded `nextInt`, bounded `nextLong`, `nextFloat`, bounded
  `nextDouble`, and `nextBytes`, plus eager invalid-range validation for
  bounded int/long/double stream factories, NaN and infinite floating-point
  bound behavior in the tested paths, native `+0.0` raw-bits parity for
  zero-valued `nextExponential()` samples, null-byte-array rejection, and sized
  spliterator metadata for bounded and unbounded sized primitive stream
  factories.
- `RandomGenerator.StreamableGenerator`, `SplittableGenerator`,
  `JumpableGenerator`, `LeapableGenerator`, and
  `ArbitrarilyJumpableGenerator` expose the tested nested type hierarchy,
  static `of(String)` failure behavior, basic stream/copy default helpers,
  custom streamable/jumpable/leapable/arbitrarily-jumpable default stream
  helpers, arbitrary NaN/infinite distance delegation, zero/negative
  stream-size validation without advancing the generator, native-compatible
  unknown-size metadata for their `limit`-backed stream-size overloads, and sized
  splittable `rngs`/`splits` stream metadata.
- Other Java 17 random providers, exact factory metadata for non-tested
  methods, concrete jumpable/leapable/streamable generator families, exact
  ziggurat-based `nextGaussian`/`nextExponential` distribution parity, and
  exhaustive stream/bounds/distribution behavior are not implemented.

## Known Record Gaps

- `java.lang.Record` is currently synthesized only as the minimal abstract base
  needed by compiled record constructors.
- Record `ObjectMethods.bootstrap` support is a targeted `invokedynamic` fast
  path for compiler-generated field component handles; it is not a general
  `java.lang.runtime.ObjectMethods` implementation.
- `java.lang.Class` now exposes selected Java 16 `isRecord()` behavior for
  non-empty, empty, and local records plus ordinary, enum, JDK, primitive,
  void, and array classes.
- `Class.getRecordComponents()` and a minimal
  `java.lang.reflect.RecordComponent` shim now cover component name, type, raw
  generic signature strings, raw generic/annotated type fallback for
  non-generic components, runtime-visible component annotations, accessor,
  declaring record, null for non-record classes, empty record arrays, and array
  cloning behavior. Full generic `Type` parsing and type-use annotations are
  not implemented. See `docs/design/record-reflection.md` for the remaining
  Class/RecordComponent design split before expanding this surface.

## Known Sealed-Class Gaps

- `java.lang.Class` now exposes selected Java 17 sealed reflection behavior:
  `isSealed()` and `getPermittedSubclasses()` for sealed interfaces, final
  permitted classes, ordinary classes, selected JDK classes, primitives, void,
  and arrays.
- Direct superclass and direct interface `PermittedSubclasses` checks are
  enforced during class resolution.
- The current illegal-subtype fixture verifies rejection through `LinkageError`
  compatibility. Doppio's Java 8-era class-loader surface can still map the
  internal `IncompatibleClassChangeError` to a broader linkage failure on some
  reflective loading paths.
