# Modern Java Compatibility

This fork tracks post-Java-8 compatibility explicitly. The current baseline is
Doppio's Java 8-era runtime and class library. A row marked "not implemented"
means no compatibility claim is made yet, even if a trivial class happens to
run.

For approved Java 21/25 development targets, required workloads and remaining work with
completion criteria, see the
[repository compatibility roadmap](https://github.com/seo-rii/doppio/blob/modern/docs/compatibility-roadmap.md).
It distinguishes workload compatibility from full Java SE conformance; this
matrix continues to describe the current implementation.

## Status Values

- Not implemented: no compatibility support has been merged.
- Parser only: class files can be read, but runtime semantics are not claimed.
- Partial: selected behavior is covered by tests.
- Implemented: the row has targeted runtime tests and no known gaps in scope.

## Version Matrix

| Java | Class-file major | Main compatibility areas | Status | Difficulty |
| --- | ---: | --- | --- | --- |
| 9 | 53 | modules, private interface methods, `MethodHandles.Lookup` class definition/discovery/access, multi-release JARs, StackWalker, string concat bootstrap, Flow interfaces/`SubmissionPublisher`, `CompletableFuture`, Cleaner, Runtime.Version, `Runtime.version`, `Thread.onSpinWait`, `Reference.reachabilityFence`, `Math`/`StrictMath` wide multiplication and floor division helpers, `Class.getPackageName`, `AccessibleObject` access probes, annotated owner types, reflection array generic/primitive accessors, System.Logger, StackTraceElement, ProcessHandle, management metadata, `InputStream` helpers, `Stream` helpers, `ClassLoader.resources`, `ClassLoader` metadata, defined packages, and unnamed modules, `List`/`Set`/`Map` factories, `Objects`/`Optional` helpers, `Enumeration.asIterator`, `Matcher.results`, `Matcher` StringBuilder append overloads, collector composition helpers | Partial: module/package tags, selected `Class.getModule()` unnamed-module behavior including class-loader identity, null descriptor/layer metadata, declaring-package `Module.getPackages()` exposure, mutable package-set copy behavior, selected read/export/open/use mutation/query shims, resource lookup delegation, and selected null validation, private interface methods, selected Java 9 `MethodHandles.Lookup.defineClass(byte[])` exact metadata, package-only access, defining-loader/protection-domain/package/module identity, initialization delay, reflection and unreflect invocation, malformed/version/module/wrong-package rejection, duplicate errors, and recovery after invalid definitions, selected Java 9 `Lookup.findClass(String)`/`accessClass(Class<?>)` exact metadata, lookup-loader identity, package/public/reduced-mode access, array-component visibility, primitive/void/array/null/missing inputs, initialization delay, exception ordering, and reflection/unreflect invocation, Java 9 multi-release JAR class/resource entry selection including default `JarFile(File)` base-entry parity and classpath-style `URLClassLoader` versioned lookup, selected Java 9 `ClassLoader.resources(String)` behavior covering subclass `getResources` delegation, duplicate URL preservation, empty streams, `NONNULL`/`IMMUTABLE` unknown-size spliterator metadata, one-shot stream reuse failure, null-name rejection before delegation, and `UncheckedIOException` wrapping, selected Java 9 `ClassLoader.getName()`, `getPlatformClassLoader()`, and `isRegisteredAsParallelCapable()` metadata behavior for system, platform, unnamed custom, and explicitly parallel-capable loaders, selected Java 9 `ClassLoader.getDefinedPackage(String)` and `getDefinedPackages()` behavior covering system-loader packages, missing and parent/bootstrap package filtering, array snapshot isolation, empty custom-loader results, and null-name rejection, selected Java 9 `ClassLoader.getUnnamedModule()` behavior covering per-loader caching, `Class.getModule()` identity sharing, class-loader metadata, unnamed metadata, null descriptor/layer metadata, package exposure, empty custom-loader packages, and unnamed `toString` prefix, basic `StringConcatFactory` concat including tested wide-slot `long` argument packing, boxed primitive object arguments, observable user-object and null reference conversion, and static recipe `Class` constants for ordinary classes, interfaces, arrays, `MethodType`, and `MethodHandle`, Java 9 `Flow` nested interface loading, dispatch, and `defaultBufferSize()`, selected direct-executor `SubmissionPublisher` rounded capacity, subscription tracking, publish/offer/consume/close/error/validation behavior, selected Java 9 `CompletableFuture` factory/minimal-stage/instance additions, Java 9 `Enumeration.asIterator()` adapter iteration/exhaustion/remove behavior, selected Java 9 `Matcher.results()` lazy stream behavior including captures, result snapshots, current matcher position, empty results, spliterator metadata, and iterator exhaustion, selected Java 9 `Matcher.appendReplacement(StringBuilder, String)` and `appendTail(StringBuilder)` behavior including builder mutation, returned-object identity, group-reference and quoted replacements, no-match tails, illegal-state failure, and null validation, Java 9 `Cleaner.create()`, `create(ThreadFactory)` factory invocation/null-thread rejection, `register` null validation, and explicit idempotent `Cleanable.clean()`, Java 9 `Runtime.Version.parse` metadata, immutable version list, comparison/equality, validation behavior, cached direct/reflection-visible `Runtime.version()` baseline object with native-compatible method metadata and invocation, direct/reflection-visible no-op `Thread.onSpinWait()` and `Reference.reachabilityFence(Object)` with runtime marker annotations, selected `Math.multiplyFull(int, int)`/`StrictMath.multiplyFull(int, int)` signed 64-bit product behavior, selected `Math.multiplyHigh(long, long)`/`StrictMath.multiplyHigh(long, long)` signed high-product behavior, selected `Math.floorDiv(long, int)`/`StrictMath.floorDiv(long, int)` and `Math.floorMod(long, int)`/`StrictMath.floorMod(long, int)` sign and zero-divisor behavior, selected `Class.getPackageName()` behavior for ordinary, nested, local, anonymous, primitive, void, and array classes, selected `AccessibleObject.canAccess`/`trySetAccessible` access and receiver validation with nestmate support, selected `AnnotatedType.getAnnotatedOwnerType` metadata and recursive raw/parameterized/static owner annotation trees, selected `java.lang.reflect.Array` generic set and primitive getter/setter widening and failure behavior, Java 9 `System.Logger` nested type loading, `Level` metadata, default log-method delegation/lazy supplier behavior, null validation, disabled logger lazy object/supplier behavior, and selected `System.getLogger` name/type/null-validation and returned-logger null-level validation behavior, selected Java 9 `StackTraceElement` metadata constructor/accessor plus metadata-aware `toString`/`equals`/`hashCode` behavior, selected `StackWalker` caller/frame APIs including `getCallerClass` helper/reflection-frame filtering and `walk` stream closure after the callback returns, Java 9 `InputStream.readAllBytes`, `readNBytes(byte[], int, int)`, and `transferTo`, selected Java 9 object and primitive stream helpers covering `Stream.ofNullable`, three-arg `iterate` on `Stream`/`IntStream`/`LongStream`/`DoubleStream`, ordered sequential object and primitive `takeWhile`/`dropWhile`, primitive `of`/`range`/`rangeClosed` exact-size spliterator metadata, close propagation, and null validation, Java 9 `List.of`, `Set.of`, `Map.of`, `Map.entry`, and `Map.ofEntries` factory coverage with null rejection, null-hostile map/view lookup including the empty-entry-set exception, unmodifiable results, `Set.of` duplicate rejection, and `Map` duplicate-key rejection, tested collector helpers including Java 9 `filtering`/`flatMapping`, Java 8 `mapping`, `collectingAndThen`, `counting`, `minBy`, `maxBy`, `reducing`, numeric collectors, selected `toMap`, selected `toConcurrentMap`, selected `groupingBy`, selected `groupingByConcurrent`, selected `partitioningBy`, null-stream handling, mapped stream closing, characteristics, and null-timing behavior, Java 9 `Objects` null-default laziness and bounds-check helper edge cases, Java 9 object and primitive `Optional` `ifPresentOrElse`/`stream` plus object `Optional.or`, a minimal `ProcessHandle` shim covering `current()`, `of(pid)`, pid-based identity/equality expectations, `allProcesses()` current/parent visibility, parent-handle `children()`/`descendants()` current-process visibility, empty current-handle traversal streams, non-placeholder current `pid()`, `isAlive()`, `compareTo`, current-process termination guard methods, `supportsNormalTermination()`, and present current-handle `Info` optionals with host argv-backed command, command line, arguments, start instant, and CPU duration snapshots, selected `java.lang.management` runtime/class-loading/thread/compilation/memory/operating-system metadata covering input-argument immutability, class/thread count invariants, CPU-time enablement, synthetic compilation bean metadata/time, synthetic OS metadata with unsupported load-average fallback, verbose flag no-ops, and heap/non-heap `MemoryUsage` invariants, and selected `java.nio.Bits` direct typed-buffer relative bulk `get`/`put` paths for `short`, `char`, `int`, `float`, `long`, and `double` arrays | Medium |
| 10 | 54 | `var` source output parity, minor class-file updates, Runtime.Version accessors, StackFrame descriptor APIs, `List.copyOf`/`Set.copyOf`/`Map.copyOf`, `Collectors.toUnmodifiable*`, `Optional.orElseThrow()`, `Reader.transferTo`, `ByteArrayOutputStream.toString(Charset)`, `PrintStream`/`PrintWriter`/`Scanner` charset constructors | Partial: local-variable type inference, Java 10 `Runtime.Version` `feature`/`interim`/`update`/`patch` accessors, Java 10 `List.copyOf`, `Set.copyOf`, and `Map.copyOf` snapshot/null-rejection/unmodifiable behavior including `Set.copyOf` dedupe and factory-created immutable collection identity preservation without preserving user-created `Collections.unmodifiable*` wrappers, Java 10 `Collectors.toUnmodifiableList`, `toUnmodifiableSet`, and both `toUnmodifiableMap` overloads covering unmodifiable results, null rejection, duplicate-key rejection, duplicate set dedupe, merge behavior, and null-merge removal, no-arg object and primitive `Optional.orElseThrow()`, Java 10 `Reader.transferTo(Writer)` transfer count/output and null-writer rejection, selected `ByteArrayOutputStream.toString(Charset)` decoding/null behavior, selected `PrintStream` and `PrintWriter` charset constructors for `OutputStream`, `File`, and `String` targets including encoding/checkError/null behavior, selected `Scanner` charset constructors for `InputStream`, `File`, `Path`, and `ReadableByteChannel` targets, and `StackFrame.getDescriptor`/`getMethodType` fixtures compiled with `--release 10` including no-retain descriptor access and retained-class-reference `getMethodType` enforcement | Low |
| 11 | 55 | nestmates, `Class` nest reflection, dynamic constants, `InputStream`/`OutputStream` helpers, `Reader`/`Writer` null helpers, `FileReader`/`FileWriter` charset constructors, `ByteArrayOutputStream.writeBytes`, `Collection.toArray(IntFunction)`, `Predicate.not`, `Optional.isEmpty`, `Path.of`, `Files` string helpers, `Character.toString(int)`, `CharSequence.compare`, `Pattern.asMatchPredicate`, `StringBuilder`/`StringBuffer.compareTo`, selected `String` helpers, standard HTTP client dependencies | Partial: Java 11 `InputStream.readNBytes(int)`, `InputStream.nullInputStream`, `OutputStream.nullOutputStream`, `Reader.nullReader` EOF/ready/skip/closed behavior, `Writer.nullWriter`, selected charset-aware `FileReader`/`FileWriter` constructor read/write/append/null behavior, and selected `ByteArrayOutputStream.writeBytes(byte[])` append/copy/null behavior, Java 11 `Collection.toArray(IntFunction)` default method, Java 11 `Predicate.not`, object and primitive `Optional.isEmpty`, `Path.of(String, String...)` and `Path.of(URI)` construction/null-validation behavior, Java 11 `Files.readString`/`writeString` default UTF-8, explicit charset, append/create-new, read-all-bytes, read-all-lines, `Files.lines`, `Files.list`, selected `Files.walk`/`Files.find` including ZIP filesystem paths, selected `Files.walkFileTree` default and option overload traversal/callback/null-validation behavior including ZIP filesystem paths, `SKIP_SUBTREE`, root `TERMINATE`, `maxDepth == 0`, and null callback result checks, `newDirectoryStream` including selected brace/bracket glob syntax, selected `newByteChannel` read/write/create/append, parent-target, and option validation behavior, buffered reader/writer, line write helpers including selected validation-order and parent-target behavior, temp-file/temp-directory including null and short prefixes plus missing/non-directory parent validation, cleanup paths, tested `delete`/`deleteIfExists` deletion, missing-path, null, and non-empty-directory failure behavior, tested basic `Files.exists`/`notExists`/`isDirectory`/`isRegularFile`/`isSymbolicLink`/`isHidden`/`size` queries and selected `getFileStore` metadata/space/attribute-view behavior, selected `BasicFileAttributes` `readAttributes` file/directory/missing/null behavior, selected `BasicFileAttributeView` lookup/read/set-time/null-validation behavior, selected `getOwner`/`setOwner` and `FileOwnerAttributeView` current-owner behavior, selected owner POSIX permission get/set/null-validation behavior, selected `PosixFileAttributes` and `PosixFileAttributeView` read/permission-set/null-validation behavior, selected `getAttribute`, `setAttribute`, and string-based `readAttributes` basic-view, owner-view, and POSIX-view behavior including immutable returned maps and invalid attribute names, selected `setAttribute` `lastModifiedTime` behavior, selected extension-based `probeContentType`, timestamp get/set helpers, access queries, and `isSameFile`, tested `createFile`/`createDirectory`/`createDirectories` creation and conflict behavior including parent-file failure, tested input helper parent-target validation, tested `Files.copy` path/input/output overloads including selected file and directory source copying, path-copy and stream-to-path target validation, replacement, and option validation behavior, tested `Files.move` basic file and directory movement, target-parent validation, same-file/replacement/missing-source behavior plus selected `NOFOLLOW_LINKS`/`ATOMIC_MOVE` option acceptance and `COPY_ATTRIBUTES` rejection, `writeString` null-charset validation before `CharSequence.toString()`, `WRITE` without truncation preserving existing file tails, selected output parent-target validation, selected `SYNC`/`DSYNC`/`SPARSE` output option acceptance, tested `DELETE_ON_CLOSE` input/output immediate deletion behavior, rejection of `READ` as an output option without changing file content, and rejection of `WRITE`/`APPEND` as input options, selected `Character.toString(int)` code-point construction and invalid-range behavior, `CharSequence.compare` lexicographic/null behavior, selected `Pattern.asMatchPredicate` full-match/null-input/raw-type behavior, selected `StringBuilder.compareTo` and `StringBuffer.compareTo` lexicographic/mutation/null behavior, selected Java 11 `Class.getNestHost`, `getNestMembers`, and `isNestmateOf` behavior for ordinary host/member/local/anonymous classes, primitives, void, arrays, selected JDK `getNestHost`/non-nestmate checks, and null argument validation, selected Java 11 `String.isBlank`, `strip`, `stripLeading`, `stripTrailing`, `repeat`, and `lines` behavior, HTTP client/request/WebSocket builder metadata including default SSL context availability, cookie/proxy/authenticator/executor optional metadata, SSLParameters defensive copying, `Builder.NO_PROXY` direct proxy selection, and selected builder priority/null validation, plus `HttpRequest.Builder.copy()` snapshot behavior, no-arg/default request builder metadata, `setHeader` replacement, selected `PUT`/`DELETE`/custom method metadata, selected header/method/body validation, and selected `HttpHeaders` case-insensitive lookup/map/filter/immutability behavior, selected `BodyPublishers` content lengths and `fromPublisher` delegation/validation, and selected `BodySubscribers`/`BodyHandlers` byte-array/string/input-stream/line collection including `Content-Type` charset inference for no-arg string and line response handlers, byte-array consumer helpers, explicit-option file writes, `Content-Disposition` filename file-download writes including escaped quoted filename values and tested bad `filename*` rejection, subscriber and line-subscriber forwarding including selected explicit line separators and charset decoding, subscriber completion lifecycle, and publisher bridge delivery, `NestHost`/`NestMembers` metadata, nestmate private access, and selected `CONSTANT_Dynamic` `ConstantBootstraps`, including static-method, interface static-method, `GETSTATIC`/receiver-backed `GETFIELD`, tested `PUTSTATIC` and receiver-backed `PUTFIELD` setter side effects, tested `PUTSTATIC` `CONSTANT_Long` to `double` primitive setter normalization, constructor-target, receiver-backed virtual-target, receiver-backed interface-target, receiver-backed `REF_invokeSpecial` class/interface-special method-targets, reference return adaptation, tested method/field `int` return boxing for `invoke`, tested primitive static-argument boxing for `invoke` reference parameters, tested wrapper static-argument unboxing/widening for `invoke` primitive parameters, tested `CONSTANT_Integer` static-argument widening for a `long` method parameter, tested method-target and `GETSTATIC` field-target `int`-to-`long` return widening, tested `void` method-target return adaptation to `null` reference constants, tested reference-array varargs collection, and tested `CONSTANT_Integer` to `long...` varargs component widening | High |
| 12 | 56 | Java 12 class-file runtime baseline, compact number formatting, `ClassDesc`/`ConstantDescs`/constant descriptor APIs, `Class.descriptorString`/`componentType`/`arrayType`, `InputStream.skipNBytes`, `Files.mismatch`, `String.indent`/`transform`, `Collectors.teeing`, `CompletableFuture` exceptional recovery, switch expression preview class output | Partial: class-file major 56 fixture compiled with `--release 12`, selected `CompactNumberFormat` constructor format/parse/null-validation behavior plus selected `NumberFormat.getCompactNumberInstance()` and `getCompactNumberInstance(Locale, Style)` SHORT/LONG US formatting and null-validation behavior, selected `ClassDesc` descriptor/name/display/array/component/resolve behavior including invalid binary/package/class member names, void-array, malformed internal-name, and excessive array-rank descriptor rejection, selected `MethodTypeDesc` construction/descriptor/transformation/resolve behavior, selected `MethodHandleDesc`/`DirectMethodHandleDesc` factory metadata and owner/kind/lookup-descriptor validation, method/getter/setter invocation types, `asType`, selected `resolveConstantDesc` paths for public same-class static/virtual methods, constructors, static/instance fields, and `asType`, `Kind.valueOf` field/interface/class ref-kind mappings, and display behavior, selected `ConstantDescs` `ClassDesc`/`NULL` constants, selected `Class.describeConstable` descriptor/display behavior for ordinary, primitive, array, and void classes, selected `Class.descriptorString()` behavior for ordinary, nested, local, primitive, void, reference-array, and primitive-array classes, direct and reflection-visible `Class.componentType()` and `Class.arrayType()` primary/covariant-bridge metadata and behavior, `TypeDescriptor.OfField<Class<?>>` raw/generic interface assignability and dispatch, non-array, primitive, void, reference-array, primitive-array, multidimensional-array, user-class-array, exact MethodHandle, and void rejection paths, selected `Enum.describeConstable` `Enum.EnumDesc` runtime type plus name/type/bootstrap/resolve behavior for simple enum constants, selected `InputStream.skipNBytes(long)` exact-skip/EOF/invalid-skip/null-stream behavior, selected `Files.mismatch` same-path/equal/different/prefix-length/null/missing-file and directory failure behavior, selected `String.indent` line extraction, positive/negative count, whitespace removal, and LF-normalization behavior, selected `String.transform` return/null-function/exception behavior, selected `String`, `Integer`, `Long`, `Float`, and `Double` `describeConstable`/`resolveConstantDesc` self-return behavior, selected `Collectors.teeing` downstream result merging, downstream finisher application, characteristics, and null validation, selected Java 12 `CompletableFuture` `exceptionallyAsync`/`exceptionallyCompose` receiver methods covering success propagation, failure recovery, compose flattening, common-pool and supplied executors, rejected-executor failures, handler failures, null compose results, and null validation, and runtime output comparison | Medium |
| 13 | 57 | Java 13 class-file runtime baseline, text block preview class output, `FileSystems.newFileSystem(Path)` overloads, buffer absolute bulk get/put overloads | Partial: class-file major 57 fixture compiled with `--release 13`, selected `FileSystems.newFileSystem(Path)`, `newFileSystem(Path, Map)`, `newFileSystem(Path, ClassLoader)`, and `newFileSystem(Path, Map, ClassLoader)` null/missing-file/plain-file failure behavior plus ZIP/JAR provider success for all four `Path` overloads including selected `Files` input/output, same-provider path-copy including `COPY_ATTRIBUTES`, cross-provider copy/move/delete, create/write, temp file/directory, access, metadata, attribute-view, owner/POSIX attribute failure delegation, link API failure and provider-mismatch delegation, file-store, same-file, mismatch, listing, walking, and find helpers on ZIP filesystem paths, selected `ByteBuffer.get(int, byte[], ...)` and `put(int, byte[], ...)` heap/direct normal plus range/null/read-only behavior, selected typed-buffer absolute bulk `get`/`put` coverage for heap/direct normal, range/null/read-only, and wide `double` element paths, and runtime output comparison | Low |
| 14 | 58 | switch expressions final, records preview, helpful NPE metadata expectations, `PrintStream.write` helpers | Partial: switch expression fixture compiled with `--release 14`, selected `PrintStream.writeBytes(byte[])` and `write(byte[])` append/copy/null behavior, and runtime output comparison | High |
| 15 | 59 | text blocks final, `CharSequence.isEmpty`, selected `String` helpers, `Math`/`StrictMath.absExact`, sealed classes preview, hidden classes, `MethodHandles.Lookup.ensureInitialized` | Partial: text block fixture compiled with `--release 15`, selected `CharSequence.isEmpty` default behavior while preserving Java 8 `chars`/`codePoints`, selected `String.formatted` varargs delegation/null/missing-argument behavior, selected `String.translateEscapes` named/octal/space/line-continuation/invalid escape behavior, selected `String.stripIndent` indentation/trailing-whitespace/terminator opt-out behavior, selected `Boolean`, `Byte`, `Short`, and `Character` `describeConstable` dynamic descriptor metadata and resolution behavior, direct and reflection-visible `Math.absExact(int/long)` and `StrictMath.absExact(int/long)` behavior including `MIN_VALUE` overflow exceptions, direct and reflection-visible `Class.isHidden()` false results for ordinary, nested, local, anonymous, JDK, primitive, void, and array classes with native-compatible method and annotation metadata, selected `MethodHandles.Lookup.ensureInitialized(Class<?>)` exact metadata, validation/access ordering, class/interface and superclass initialization, repeat identity, reflection/unreflect invocation, permanent erroneous-class state after ordinary or `Error` initializer failures, superclass failure propagation, and concurrent waiter behavior, and runtime output comparison | High |
| 16 | 60 | records final, `Stream.toList`/`mapMulti`, `Objects` long bounds helpers, `HttpRequest` request/filter builder copy, sealed evolution, strong encapsulation assumptions | Partial: Java 16 `Objects.checkIndex(long, long)`, `checkFromToIndex(long, long, long)`, and `checkFromIndexSize(long, long, long)` happy/failure paths including endpoint zero-size ranges and negative lengths, Java 16 `Stream.toList()` order, unmodifiable result, and null-element retention behavior, selected Java 16 object and primitive `Stream.mapMulti`, `mapMultiToInt`, `mapMultiToLong`, `mapMultiToDouble`, `IntStream.mapMulti`, `LongStream.mapMulti`, and `DoubleStream.mapMulti` expansion, empty emission, primitive summing, close propagation, mapper exception propagation, and null-mapper behavior, Java 16 `HttpRequest.newBuilder(HttpRequest, BiPredicate)` metadata/body/header-filter copy behavior, `Record` attribute components, basic record construction/accessors, selected `Class.isRecord()` behavior for non-empty, empty, local, ordinary, enum, JDK, primitive, void, and array classes, basic `Class.getRecordComponents()`/`RecordComponent` name, type, raw generic signature, lazy record-scoped generic types, nested annotated-type paths and owners, runtime-visible component annotations, accessor, declaring-record, empty-record, non-record, and cloned-array behavior, and generated `toString`/`equals`/`hashCode` for field-backed components including selected `float`/`double` `NaN` and signed-zero behavior plus reference-component `equals`/`hashCode`/`toString` dispatch and original Throwable propagation for equal distinct lists, user-defined value objects, nulls, and array identity | High |
| 17 | 61 | sealed classes final, Java 17 class-file loading, `StrictMath`, `InstantSource`, `HexFormat`, `Map.Entry.copyOf`, `RandomGenerator`, modern `java.lang.invoke` behavior | Partial: Java 17 class-file version, selected `StrictMath` `cbrt`, `cosh`, `expm1`, `hypot`, `log10`, `log1p`, `sinh`, and `tanh` parity fixtures, selected `java.time.InstantSource` `system`/`fixed`/`offset`/`tick` factories, `instant`, `millis`, `withZone`, zero-duration identity, tick truncation, custom-source wrapping, and null/invalid-duration validation behavior, selected `java.util.HexFormat` format/parse/accessor/digit conversion APIs, slice/empty parsing, empty formatting, appendable failure wrapping, singleton/equal-value identity behavior, and value-object equality/hash/display behavior, `Map.Entry.copyOf` snapshot/null-rejection/unmodifiable behavior plus `Map.entry` identity preservation, full tested metadata and fresh factory identity for `RandomGeneratorFactory.of("Random")` and `of("SplittableRandom")`, selected `SecureRandom` provider metadata and bounded smoke paths, native-default `L32X64MixRandom` provider metadata, seeded and byte-array seed output parity, and selected split/splits behavior, selected `L64X128MixRandom`, `L64X128StarStarRandom`, `L64X256MixRandom`, `L64X1024MixRandom`, `L128X128MixRandom`, `L128X256MixRandom`, and `L128X1024MixRandom` provider metadata, seeded and byte-array seed output parity, and split/splits behavior, selected `Xoroshiro128PlusPlus` and `Xoshiro256PlusPlus` provider metadata, seeded and byte-array seed output parity, and jump/leap behavior, seeded `Random` provider output parity, `Random` byte-array seed fallback smoke/null validation, selected `SplittableRandom` seeded output and split/splits behavior, selected bounded/default `RandomGenerator` methods including custom-implementation default bit slicing, overflow-safe full-range `int`/`long` bounds, finite float/double range validation, eager bounded stream range validation, sized `ints`/`longs`/`doubles` and splittable `rngs`/`splits` stream metadata, `RandomGenerator` nested interface loading/static failure paths, selected `RandomAccessFile.setLength` shrink/extend/pointer/failure behavior and `FileDescriptor.sync`, selected Java 17 `ConstantDescs.TRUE`/`FALSE` dynamic constant descriptor metadata, boolean resolution, canonical `NULL` factory identity, dynamic-constant display metadata, and descriptor-level `ConstantBootstraps.invoke` resolution for tested public static method handles with constant arguments, selected primitive return widening, and reference cast failure wrapping, selected `ConstantDescs` bootstrap method-handle descriptor constants and bootstrap factory metadata/validation including VarHandle descriptor constants, selected `MethodHandles.Lookup.findStatic`/`findVirtual` invocation covering public same-class members, missing-method failure, non-nestmate private access failures, same-package package-private access, cross-package public and subclass protected access, cross-package package-private failures, nestmate private static/instance access, selected static/instance `String`, `int`, and `long` field getter/setter handles under the same access modes plus final-field setter rejection, selected `findConstructor` public/package-private/nestmate-private success plus non-nestmate private failure paths, selected `Lookup.unreflect`, `unreflectSpecial`, `unreflectConstructor`, `unreflectGetter`, and `unreflectSetter` public success, selected superclass/interface-default special dispatch, non-nestmate private failure, and nestmate-private success paths, selected `MethodHandles.privateLookupIn` same-package target lookup, caller/peer private member access, public lookup rejection, primitive/array target rejection, and selected `Lookup.previousLookupClass`/`hasFullPrivilegeAccess`/`dropLookupMode` behavior, selected `MethodHandle.asType` reference cast, return widening-to-`Object`, non-void return dropping-to-`void`, `void` return-to-`null` reference adaptation, primitive argument and return widening, primitive return boxing, unboxing, arity mismatch, and runtime cast failure paths, and selected `MethodHandles` combinators covering `identity`, `constant`, `bindTo`, `insertArguments`, `dropArguments`, `filterArguments`, `filterReturnValue`, `permuteArguments`, `guardWithTest`, `catchException`, `exactInvoker`, `invoker`, `collectArguments`, zero-position and selected nonzero-position `foldArguments`, `explicitCastArguments`, `arrayElementGetter`, `arrayElementSetter`, `throwException`, and Java 17 public overlays `zero`, `empty`, `arrayLength`, `arrayConstructor`, `dropArgumentsToMatch`, `dropReturn`, selected `tryFinally`, `tableSwitch`, and `iteratedLoop` flows, and selected `whileLoop`/`doWhileLoop`/`countedLoop` non-`void` state plus `void` side-effect loops with descriptor checks, `PermittedSubclasses` metadata, selected `Class.isSealed()` and `getPermittedSubclasses()` behavior for sealed interfaces, final permitted classes, ordinary classes, JDK classes, primitives, void, and arrays, and direct sealed supertype enforcement | High |
| 18 | 62 | UTF-8-by-default expectations, simple web server tooling output, `Math`/`StrictMath` unsigned multiplication and integer division helpers | Partial: simple class-file container, selected UTF-8 default charset behavior for `file.encoding`, `Charset.defaultCharset()`, default `String` byte conversion, and default `InputStreamReader`/`OutputStreamWriter` byte conversion, direct and reflection-visible `Math.unsignedMultiplyHigh(long, long)` and `StrictMath.unsignedMultiplyHigh(long, long)` behavior for zero, power-of-two, negative-bit-pattern, `Long.MIN_VALUE`, and mixed-sign unsigned products, plus direct and reflection-visible support for all Java 18 `Math`/`StrictMath` `ceilDiv`, `ceilMod`, `divideExact`, `floorDivExact`, and `ceilDivExact` overloads with tested metadata, sign, mixed-width, zero-divisor, and integer-overflow behavior | Medium |
| 19 | 63 | virtual threads preview dependencies, record pattern preview output, `Thread.threadId()`, `Thread.sleep(Duration)` | Partial: simple class-file container, selected `Thread.threadId()` current-thread behavior matching the existing positive `Thread.getId()` identifier, and selected `Thread.sleep(Duration)` behavior for negative no-op, zero duration, short positive duration, null rejection, and interrupt delivery | High |
| 20 | 64 | scoped values preview dependencies, pattern matching output | Partial: simple class-file container plus runnable print fixture | High |
| 21 | 65 | final record patterns and pattern switches, virtual threads, sequenced collections, `Math`/`StrictMath.clamp`, `StringBuilder`/`StringBuffer.repeat`, `String`/`Pattern.splitWithDelimiters`, bounded `String.indexOf`, string templates preview | Partial: selected genuine final pattern-switch/record-pattern lowering and bootstrap contracts (see note below), simple class-file container, runnable print fixture, selected `Thread.isVirtual()` platform-thread behavior for current, unstarted, and started platform threads, direct and reflection-visible integer/floating-point `Math.clamp` and `StrictMath.clamp` overloads, Unicode/sequence repetition with covariant reflection bridges and synchronized `StringBuffer` calls, delimiter-preserving regex splitting and range-bounded string/code-point searches with direct/reflection/MethodHandle calls, and selected `SequencedCollection`/`List`/`Deque`/`SequencedSet`/`SequencedMap` endpoint, view, and reverse-view behavior | Very high |
| 22 | 66 | class-file API ecosystem expectations, unnamed variables and patterns | Partial: simple class-file container, runnable print fixture and selected final unnamed-variable/pattern forms compiled by genuine javac 25 (see note below) | Medium |
| 23 | 67 | primitive patterns preview, module/JDK library drift | Partial: simple class-file container plus runnable print fixture | High |
| 24 | 68 | stream gatherers, compact object headers ecosystem assumptions | Partial: simple class-file container plus runnable print fixture | High |
| 25 | 69 | current LTS class-file and library surface | Partial: simple class-file container, runnable print fixture, selected final pattern/record, module-import, flexible-constructor and compact-source lowering compiled by genuine javac 25, non-private static/instance main startup, five `java.lang.IO` methods, and the selected C7a public `java.lang.classfile` parse/model, branch-free build, transform and typed-verify pipeline (see notes below) | Very high |
| 26 | 70 | current feature-release class-file and library surface | Partial: simple class-file container plus runnable print fixture | Very high |

Java 21/25 final pattern note: the native-oracle
[pattern fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java21PatternSwitch.java) exercises
44 selected assertions for `instanceof` binding, ordered class/interface/enum
switch labels, guarded restart, null/default/exhaustive switches, nested record
deconstruction, nullable components and accessor failures with original
`MatchException` causes. A compiler-generated `typeSwitch`/`enumSwitch` fast path
handles these cases, including `EnumDesc` nested dynamic constants and javac 25's
primitive selectors/class labels (`I`/`Z`/`J`/`D`) and all eight primitive record
component bindings, with correct wide `long`/`double` argument slots. Primitive selectors are boxed for
this final record-lowering path only, not preview cross-primitive conversions. The
[bootstrap contracts](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java21SwitchBootstrapContracts.java)
add 31 native-compared assertions for string/integer labels, numeric conversions
and failure propagation, restart bounds before null and malformed inputs. Their
companion is deliberately [generated](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/ci/generate_switch_bootstrap_fixture.mjs)
after javac; all final bytes are identical across native, Node and Chromium.
See the [Java 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/runtime/SwitchBootstraps.html)
and [Java 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/runtime/SwitchBootstraps.html)
bootstrap contracts and [record-pattern semantics](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.30.2).
These compiler-generated tests do not establish the public API contract.
The separate [public API fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java21SwitchBootstrapAPI.java)
checks 169 selected common final Java 21/25 API assertions through direct `typeSwitch` and
`enumSwitch` calls. They return real `ConstantCallSite` objects with invocable
targets/dynamic invokers. Tests cover exact/inexact/adapted handles, public varargs
metadata and bootstrap lookup, label snapshots, duplicates/restarts, numeric
accessor effects/failures, enum descriptors, lazy initialization, constant-specific
enum subclasses and invalid arguments/names. Object type-switch and concrete-enum
targets use a full-access caller lookup. Primitive selectors/class labels,
version-dependent narrow-reference targets, asymmetric String equality, reduced
lookups/hidden helper classes, cross-loader enum resolution and null enum selectors
with invalid restarts on the all-string path are outside this common public API corpus.
Preview primitive conversions and complete language conformance remain
unimplemented; the remaining Java 21/25 language and library surface is partial.

The Java 25-only [public primitive fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java25SwitchBootstrapPrimitives.java)
adds 651 assertions for typed `Z`/`B`/`C`/`S`/`I`/`J`/`F`/`D` selectors and
identity primitive/wrapper Class labels, including boxed Object selectors,
wide arguments, target adaptation, snapshots, empty labels and restart bounds.
Declared primitive `boolean` selectors match only `boolean.class` and
`Boolean.class`, not their ordinary boxed supertypes. These are selected pinned-native implementation
checks without preview flags: the
[Java 25 implementation](https://raw.githubusercontent.com/openjdk/jdk/jdk-25-ga/src/java.base/share/classes/java/lang/runtime/SwitchBootstraps.java)
accepts these primitive call sites while the API description remains
reference-oriented. This identity fixture does not cover cross-primitive Class
conversions or preview constant labels.

The separate Java 25-only [exact-conversion fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java25SwitchBootstrapExactConversions.java)
adds 2,926 assertions across 140 fixed-mask values for all 49 pairs of seven
numeric primitive selector types and seven numeric primitive Class labels.
Matching requires a lossless conversion, with selected
integral range and floating precision boundaries, fractions, signed zeros, NaN,
infinities and subnormals. Typed handles, label snapshots, duplicates and restart
selection are checked against the same pinned native implementation without
preview flags. Cross-numeric conversions for declared reference/boxed selector
types, preview constant labels and primitive source patterns remain outside
these selected slices; neither fixture establishes complete public API or
language conformance.

The [binary32 instruction fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java21FloatPrecision.java)
adds 471 native-compared assertions on genuine javac 21/25 output for `i2f`,
`l2f`, `d2f`, float arithmetic and selected `f2i`/`f2l`/`f2d` controls on Node
and Chromium. Raw bits and widened double values expose unrounded intermediates.
Selected ties-to-even, subnormal, signed-zero, NaN, infinity and overflow
boundaries follow the
[JVM floating-point rules](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-2.html#jvms-2.8).
Direct `long` conversion avoids double rounding at midpoint-adjacent integers;
`f2l` saturates positive and negative infinity to the corresponding `long`
endpoint. The fixture exercises 4,096-call hot paths. Separate opcode contracts
check 48 interpreter/JIT rounding cases and 17 float-to-long conversion cases,
including operand stack effects. Native math libraries, universal floating-point
conformance and explicit long-to-double-to-float bootstrap/constant adapters
remain outside this slice.

The separate [evolved-binary gate](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/ci/java_pattern_evolution_test.mjs) compiles
enum, sealed-class and sealed-interface callers with genuine javac 21 and 25,
then recompiles only the enum or permitted-type declaration. It covers added
and reordered enum constants and newly permitted sealed implementations while
preserving caller and synthetic-helper bytes. Fourteen cases compare native,
Node and Chromium results (twenty-eight guest checks). Known values, nulls and
guards retain their behavior; new values cause `MatchException` in the selected
exhaustive expressions and enhanced statements, while the legacy enum statement
continues without a match. The ledger records compiler operations, replacement
hashes and unchanged callers. This selected corpus is not general binary
compatibility or complete pattern-language conformance.

Java 25 IO note: the [IO fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java25IO.java)
compares six isolated modes against native Java 25 on Node and Chromium.
`print(Object)`, both `println` overloads, and both `readln` overloads delegate
to standard streams. Coverage includes null/object rendering, explicit print
flushing and retained `PrintStream` error state, prompt output, CRLF/CR/LF lines,
EOF, a cached decoder with UTF-8 fallback for invalid or missing `stdin.encoding`,
malformed-byte replacement, and `IOError` cause identity. The native input bridge
also preserves EOF across subsequent reads of a finite redirected stream.
The comparison runner records the identical UTF-8 input bytes and hash for
native, CLI and browser executions. Interactive console/TTY behavior and full
Java 25 library compatibility are not established by these tests. See the
[Java 25 IO API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/IO.html).

Java 22 unnamed-variable/pattern note: the
[fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java22UnnamedPatterns.java) checks 33 selected
assertions for local/loop/catch/lambda/resource variables, initializer and close
effects, nested typed/match-all patterns, nulls and guards. Ignored record
components still invoke accessors; failures retain their `MatchException`
causes. The gate compares genuine non-preview `--release 25` output with native
Java 25 on Node and Chromium, not version-patched Java 17 output. It establishes
these final source-lowering cases, not full Java 22 runtime/API conformance or a
separate native Java 22 gate.

Java 25 module-import note: the
[fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java25ModuleImports.java) checks ten selected
assertions over `java.base` packages and `java.desktop`/`java.sql` imports,
duplicate imports and single-type/package-import precedence. Genuine javac 25
resolves these source imports; the resulting class-path bytecode runs on native
Java 25, Node and Chromium. This does not implement named-module resolution,
readability, exports/opens or strong encapsulation. See
[JLS 25 module imports](https://docs.oracle.com/javase/specs/jls/se25/html/jls-7.html#jls-7.5.5).

Java 25 flexible-constructor note: the
[fixture](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java25FlexibleConstructors.java) checks 50
assertions for prologue computation/validation/finally, this-constructor chains,
early own-field writes observed during super dispatch, field/instance
initialization order, allowed captured locals, wide `long`/`double` values and
qualified outer-super calls. Existing VM execution runs these genuine final
`--release 25` class files with matching native, Node and Chromium results.
General verifier coverage and full constructor-language conformance remain
outside this slice. See
[JLS 25 constructor bodies](https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.8.7).

Java 25 launch note: class files with major 69 or newer select non-private
`void main(String[])` before `void main()`, including static and inherited
instance/default-interface methods. Instance startup invokes a non-private
zero-argument constructor before the selected main; failures retain a nonzero
exit status. Older class files keep the existing static `main(String[])`
protocol, not the Java 21–24 preview startup protocol.
The [named](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java25InstanceMain.java) and
[compact-source](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/classes/modern_fixture/Java25CompactMain.java) fixtures use
genuine final javac 25 output. Compact-source implicit classes and `java.base`
imports, field initialization, UTF-8 arguments and IO output run on both hosts.
This does not add a source-file launcher or hosted javac 25.

The [launcher gate](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/ci/java25_main_test.mjs) checks twelve native-positive,
six native-negative and two legacy cases, plus three explicitly separate
JLS-only inheritance cases on Node and Chromium (forty-six guest checks).
Corretto 25.0.3 invokes private/non-inherited superclass mains in those three
cases; Doppio follows the candidate rule in
[JLS 25 section 12.1.4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-12.html#jls-12.1.4).
They are not native-output equality passes. Failure diagnostics remain
implementation-defined, and full launcher/language conformance is not claimed.

Java 9/11 `TimeUnit` note: `toChronoUnit()`, `of(ChronoUnit)`, and
`convert(Duration)` are implemented as ordinary parsed methods on the retained
Java 8 enum. Coverage includes every supported unit mapping, exact method
metadata, unsupported/null failures, reflection and unreflected handles, plus
positive/negative fractional duration truncation and signed `long` saturation.
Difficulty: low.

Java 9 `Duration` note: `dividedBy(Duration)`, `toSeconds()`, and all six part
accessors are implemented as ordinary parsed methods on the retained Java 8
class. The Java 8 private `toSeconds(): BigDecimal` helper is renamed to its
Java 9 name before the public overload is appended, preserving legacy duration
arithmetic. Coverage includes normalized negative parts, exact decimal
division, signed `long` boundaries and overflow, metadata, reflection, and
unreflected handles. Focused Kotlin 2.4.0 and Scala 2.13.18 smokes also guard
all eight direct-call descriptors and compare host/Doppio output using only the
generated Doppio compiler bootstrap overlay. Difficulty: medium.

Compiler bootstrap note: `modern-ci-release-cli` generates a deterministic
compiler-only JAR containing 43 changed Java 8 bootstrap classes and the exact
genuinely compiled/overlaid ClassOption enum: 44 class-only entries. Kotlin and
Scala put this artifact before `doppio.jar` and `rt.jar` for source analysis,
eliminating host JDK metadata
from the main compiler, broad modern interop, duration, diagnostic, Kotlin
bytecode, basic/advanced/modern constructs, local and JVM interop,
default/synthetic and JVM-default lowering, indy string concat, focused
lowering, contracts, enum polymorphism, mutable delegation, callable
references/sequences, coroutine/suspend state machines, shape/reflection,
I/O, standalone Kotlin reflection, proxy, receiver lambda/sequence, annotation
metadata, collection builders, control flow, Result/exception,
initialization/delegation, multifile facades, SAM conversion,
extension/variance, CompletableFuture, concurrency, unsigned, text/regex,
Scala core, MethodHandles, record, and StackWalker gates without changing
Doppio's runtime bootstrap path. The broad gates compile and
bytecode-check a direct `Runtime.version()` call, while CI also compares two
forced-generation SHA-256 values and the exact class-only entry contract. A
tested consumer checker locks all 73 migrated Kotlin/Scala smoke scripts (50
Kotlin and 23 Scala) to the ordered compiler-only paths and rejects runtime
overlay contamination. See
`docs/design/compiler-bootstrap-overlay.md`.

Java 17 `java.lang.invoke` note: the compatibility row above now also includes
selected `MethodHandles.tryFinally` support including fixed-arity normalization
for varargs target and cleanup handles, selected
`MethodHandles.tableSwitch` selector/fallback support including `void`
side-effect targets, selected `MethodHandles.iteratedLoop` `Iterable`/`Iterator`
support including no-arg explicit iterator handles, plus selected
`MethodHandles.whileLoop`/`MethodHandles.doWhileLoop`/`MethodHandles.countedLoop`
non-`void` state-loop and selected `void` side-effect slices through public
overlays, including primitive and reference default state from a null
initializer in four-handle `countedLoop`, and fixed-arity normalization of
varargs component handles across `whileLoop`, `doWhileLoop`, both
`countedLoop` overloads, and explicit/default-iterator `iteratedLoop`, including
mixed fixed/varargs and `void` state paths, plus selected
single-clause `MethodHandles.loop` state-loop flows
with explicit or `null` `init`, null-init state inference from zero-argument
non-`void` steps, selected `null step`, null-init/null-step no-state exits with
external prefix arguments, and prefix-parameter clause handles, selected
explicit-init external argument inference, selected no-state loops, selected
explicit multi-clause state
loops with prefix-compatible clause handles, selected `null` initializers,
selected `null` steps, selected `void` clauses, selected `null` helper
predicates, selected `null` finalizers, distinct state/external parameter
domains, non-init-only external argument inference, executing void/state mixed
clauses, fixed-arity normalization with tested single- and multi-clause varargs
initializers, steps, predicates, and finalizers including mixed and no-state
`void` clauses, single- and multi-clause null rejection, and selected validation
precedence including single-clause init/step-return-before-predicate and
predicate-before-parameter ordering, plus optional `fini`, covering
normal, exceptional, `void`, and varargs-component
`tryFinally` target flows, same-typed `tableSwitch` target/fallback dispatch,
selected iterated `Iterable`/`Iterator` flows, plus stateful, multi-state, and
no-state loop flows in the Java fixtures and Kotlin smoke. Full control-flow
combinator parity is still not claimed.

Java 17 I/O note: the compatibility row above now also includes selected
`FileChannel.force(boolean)` data/metadata flush behavior, read-only-channel
no-op behavior, closed-channel failure behavior, and selected
`FileChannel.read(ByteBuffer, long)` heap/direct-buffer positional reads, EOF,
zero-length, negative-position, and channel-position preservation behavior, plus
selected `FileChannel.read(ByteBuffer[])`/`write(ByteBuffer[])` scatter/gather
behavior across heap and direct buffers, EOF/zero-length results, and channel
and buffer-position updates, plus selected `FileChannel.transferTo` and
`transferFrom` file-channel paths covering copied byte counts, EOF transfer
results, file contents, and source/target position updates, plus selected
`MappedByteBuffer.isLoaded()`, `load()`, and full-buffer `force()` mmap
behavior covering writable, read-only, and empty mappings, plus selected Java
13+ `MappedByteBuffer.force(int, int)` range forcing, zero-length range,
read-only range no-op, empty-mapping validation order, and range validation
behavior. Writable mappings retain their descriptor across channel close so a
later full or ranged force remains safe and cannot reach a reused descriptor.
Selected `Files` hard-link and symbolic-link APIs are also covered,
including `createLink`, `createSymbolicLink`, `readSymbolicLink`,
`NOFOLLOW_LINKS` existence checks, hard-link `isSameFile`, `Files.copy`
symlink-object preservation with `NOFOLLOW_LINKS`, selected symlink
`readAttributes(..., NOFOLLOW_LINKS)` behavior including dangling links, and
dangling symlink cleanup. Symbolic-link queries and reads use the owning
provider, including the default Unix provider's empty-`Path` current-directory
handling and resulting `NotLinkException` for `readSymbolicLink`. The obsolete
custom read-link native has been removed. `Files.notExists` now preserves the
provider's three-state existence result: only `NoSuchFileException` proves
absence, while
other I/O failures leave both `exists` and `notExists` false. The
`Java11FilesString` fixture covers this distinction for follow and
`NOFOLLOW_LINKS` probes with an overlong path component.

Default `Files.newDirectoryStream` calls now use the owning file-system
provider for plain, glob, and predicate-filtered enumeration. This gives an
empty `Path` the provider's current-directory meaning and preserves the
provider iterator's lazy filtering, prefetched-entry, exception, and close
behavior. `Files.list` is likewise a lazy, close-backed, unknown-size
`DISTINCT` stream and converts deferred `DirectoryIteratorException` failures
to `UncheckedIOException`. Coverage lives in `NioFilesPaths` and
`Java11FilesString`; `Java13FileSystems` protects basic enumeration through the
same facade for ZIP paths.

`Files.walk` and `Files.find` now use the vendor provider-backed
`FileTreeIterator` instead of eagerly recursing through `java.io.File`.
Returned streams are lazy, close-backed, and unknown-size; an empty `Path`
therefore starts at the provider's current directory. Traversal does not follow
symbolic links unless `FOLLOW_LINKS` is present, and `find` passes the
iterator's cached, link-aware attributes to its predicate rather than
re-reading each path with different link semantics. `NioFilesPaths` covers the
empty-path root, `Java11FilesString` covers lifecycle and link traversal, and
`Java13FileSystems` protects ZIP walking and finding. The Java 9 class-library
compile exposes only `FileTreeIterator`, `FileTreeWalker`, and the walker's four
nested class files from the vendor runtime in an ignored compile-support
directory because `--release 9` hides package-private peers. Those support
classes are compile-only and are not added to the Doppio runtime overlay.

Default-file-system `Files.newInputStream`, `newOutputStream`, and
`newByteChannel` calls now enter the owning Unix provider instead of converting
the path to `java.io.File`. On the CLI/Node backend, read-only empty paths retain
their current-directory meaning; BrowserFS still rejects directory read handles
with `EISDIR`. Creation-only options on a read channel are ignored as the
provider specifies, while initial attributes and unsupported options retain
provider/channel validation. Known Unix errno values remain errno-backed
through the native bridge, so failures such as a non-directory parent translate
to `FileSystemException` instead of a generic `IOException`.

For Node writes, the native bridge decodes the vendor Unix flags and rebuilds
them with the current host's numeric `fs.constants`. `WRITE`, `CREATE`,
`CREATE_NEW`, `TRUNCATE_EXISTING`, `APPEND`, `SYNC`, `DSYNC`, and
`NOFOLLOW_LINKS` therefore retain their separate meanings, including kernel
append behavior. BrowserFS accepts only string modes, so its bridge uses
`r`/`r+`/`wx+` transitions, explicit truncation, descriptor append state, and
write-completion sync calls. Dirty `DELETE_ON_CLOSE` handles track their
successful unlink and discard that stale BrowserFS descriptor without a
path-based close flush.

Scatter reads feature-detect Node's callback `fs.readv` and use one host vector
operation when it is available; the API first appeared in Node 12.17.0 and
13.13.0. BrowserFS 1.3 and runtimes without that API retain the sequential
fallback: it now commits descriptor position after every positive read, returns
the committed prefix when a later raw read fails, and preserves the existing
EOF, short-read, and empty-vector results.
`Java17FileChannelPartialReadProgress` forces the later-vector failure and the
native fast path while checking buffer contents, buffer positions, channel
position, and the next scalar read. Sequential fallback remains a multi-call
operation and is scoped in `BUG-013`.

Gather writes feature-detect Node's callback `fs.writev` and use one host
vector operation when it is available. BrowserFS 1.3 and Node releases before
12.9 retain the sequential fallback: it now commits descriptor position after
every successful vector, returns the committed prefix when a later raw write
fails, and preserves the advanced position if a post-write sync or stat fails.
`Java17FileChannelPartialProgress` forces the later-vector write, post-write
sync, and post-append stat boundaries through a host preload fixture while also
checking source-buffer positions. Sequential fallback append remains subject
to backend interleaving and is scoped in `BUG-008`.

Non-retryable channel-native host failures now stay on the public NIO contract boundary:
`FileChannelImpl` mapping/transfers and `FileDispatcherImpl` scalar/vector
reads, writes, sizing, truncation, forcing, and close paths raise
`java.io.IOException`. The shared write and descriptor-close primitives require
their caller to select that policy explicitly. `UnixNativeDispatcher` and
`UnixCopyFile` retain errno-backed `sun.nio.fs.UnixException`, allowing the
provider to translate failures such as `EACCES` into path-aware exceptions.
`Java17FileChannelIOExceptionBoundaries` injects failures into the Node scalar,
native/fallback vector, post-append metadata, map read/allocation, transfer,
force, and close paths and also verifies that a provider stat denial remains
`AccessDeniedException`. Native mapping allocation exhaustion becomes Java
`OutOfMemoryError`, allowing the vendor `FileChannelImpl` retry/wrapping path to
return `IOException` rather than leaking a JavaScript error. Stream-owned input,
output, and random-access channels invalidate their shared descriptor and retire
its state before dispatching host close, including the error case. Their
BrowserFS close path also discards a dirty descriptor whose path was already
unlinked through either `java.io.File.delete()` or the Unix provider, and
random-access descriptors now retain the path needed to detect that case. A
direct native-map check separately fixes raw Unix close-error
suppression, `fclose` EIO conversion and EINTR suppression, one-time
retirement, and survival of state registered for a reused fd number. Every
`FDState.open` now assigns a monotonic generation. Legacy input, output, and
random-access operations capture it before host dispatch; a successful
completion from a closed generation raises `IOException("Stream Closed")`
exactly once instead of recreating missing state, mutating a replacement
descriptor, copying stale read bytes, or issuing the append write's follow-up
`fstat`. Random-access state operations invoked after close now raise Java
`IOException` instead of leaking a JavaScript `TypeError`. The
`legacy_fd_generation_test.cjs` native-map fixture deterministically covers 31
closed-generation scalar, bulk, metadata, truncate, two-stage append, and
post-close random-access boundaries on Node. Its replacement modes register a
same-number state after host-close dispatch and verify that the later close
callback leaves it intact. Legacy stream and random-access operations plus
`FileDescriptor.sync()` now also hold generation-bound leases from host dispatch
through native completion handling. Close invalidates the Java
descriptor and makes its generation non-current immediately, then both the
stream and channel close paths defer host `close` until the last lease is
released. This prevents the OS
from reusing the numeric fd while submitted legacy work is still pending; the
native callback selects its return or exception path before the release that can
wake close. Exception construction itself may still initialize Java classes
asynchronously after that selection.
The `legacy_fd_lease_test.cjs` native-map fixture covers seven multiple-operation,
duplicate-close, success/error, delayed-close-error, two-stage append, sync,
synchronous-dispatch-throw, duplicate-callback, post-close-dispatch same-number
re-registration, and simulated unlinked BrowserFS close boundaries. The
BrowserFS branch is injected through the shared close logic. Separately, the
Chromium acceptance canary performs an actual BrowserFS descriptor read and
defers its real result to the next event-loop turn before requesting its
descriptor-state close.
This exercises late completion and descriptor reuse without claiming that the
pinned InMemory backend, whose callbacks are normally synchronous, provides a
genuinely asynchronous host operation. All nine `FileDispatcherImpl`
read, positional-read, scatter-read, size, truncate, force, write,
positional-write, and gather-write entry points now use the same lease boundary.
One lease spans each complete native call, including sequential vector fallback
and append metadata/sync tails. A close makes the generation non-current at
once, so a later successful host callback selects
`IOException("Stream Closed")`; its native completion handler runs before lease
release can dispatch physical close. `nio_fd_lease_test.cjs` deterministically
holds a channel `fstat` callback, closes the descriptor, rejects premature
same-number registration, and verifies exception-initiation-before-host-close
dispatch ordering.
`FileChannelImpl.transferTo0` and `UnixCopyFile.transfer` now acquire source and
destination leases as one operation, release them in reverse order, and stop
before dispatching the next stage when either generation closes. Raw
descriptor-backed `UnixNativeDispatcher` stat, owner/mode/time update, read,
and write calls likewise retain one lease across every host callback and
append/sync tail. Unix failures claim completion before asynchronously
initializing `UnixException`; the converted exception is thrown, or an
exception-class initialization failure already installed on the VM thread is
preserved, before the lease releases and permits physical close.
`nio_fd_operation_lease_test.cjs`
deterministically covers both dual-descriptor acquisition rollbacks,
transfer/copy read and write-tail close races, host-error precedence, delayed
two-class Unix exception conversion, single/paired synchronous VM completion
throws, both exception-class initialization failures, raw Unix operation close
races, and successful scratch-buffer reads.
Writable mapped buffers now own a generation-bound descriptor retention that is
independent of their channel. Channel close completes logically after ordinary
operations drain, while physical host close and fd reuse wait for every mapping
retention and in-flight `force` operation. `force()` therefore remains valid
after channel close, loops across short writes, and cannot target a reused fd.
Unmap waits for concurrent forces before freeing heap storage and releasing the
retention. Mapping tables are scoped by JVM heap so equal native addresses in
multiple JVM instances cannot collide, and zero-based heap allocations are
shifted to a nonzero page-aligned mapped address. The
`mapped_buffer_fd_lifetime_test.cjs` native-map fixture covers ten partial-I/O,
close/map/force/unmap race, multiple-retention, concurrent-force, fd-reuse,
multi-JVM and adjacent-address collisions, completion-throw, cleanup-failure,
zero-address, and legacy-close cases. `Java17MappedByteBuffer` also verifies
that a writable mapping can be changed and forced after its channel closes.
Doppio does not currently promise prompt GC-triggered unmapping, so an otherwise unreachable
mapping may retain its copied heap storage and host descriptor until its cleaner
runs explicitly or the VM terminates. The six scalar, positional, and vector
`FileDispatcherImpl` read/write operations also translate host `EINTR` to
`IOStatus.INTERRUPTED` and `EAGAIN`/`EWOULDBLOCK` to `IOStatus.UNAVAILABLE`,
using the exact Java `int` or `long` return shape. Terminal and per-host-callback
guards prevent a duplicate callback, or a callback that starts a follow-up
operation before the original host call throws, from completing twice or
mutating position after completion. Sequential vectors return committed
partial progress when a later element fails. The 45-case
`file_dispatcher_status_test.cjs` fixture covers these status, callback,
partial-progress, and close-generation boundaries. Native file locking remains
an explicit unsupported platform boundary.

Legacy `FileOutputStream(path, true)` descriptors now enter the same append
state model before their file descriptor is exposed to Java. Stream writes and
writes through the derived `FileChannel` therefore remain at EOF after an
explicit channel-position reset, and successful stream writes reconcile the
cached position with the descriptor size. An initial append-open `fstat`
failure closes the host descriptor before raising `IOException`.
`Java17FileOutputStreamAppendChannel` covers stream/channel mixing, scalar and
gather writes, source-buffer progress, and growth from a second writer on Node;
the preload check also validates append registration and failed-open cleanup.
It injects a post-write `fstat` failure as well, verifying that committed
progress survives and a following write restores the authoritative size. The
Chromium smoke covers append-channel position queries and the supported
single-handle BrowserFS path. Separate live BrowserFS handles still do not share
inode and buffer state, so browser external-growth parity remains outside this
guarantee and is tracked in `BUG-007`.

The core `Files` mutation facade now follows the same boundary. `createFile`,
`createDirectory`, recursive `createDirectories`, `createLink`,
`createSymbolicLink`, `delete`, and `deleteIfExists` call the path's owning
provider. Same-provider `copy` and `move` preserve the provider's option-array
and exception behavior, while foreign-provider operations use the JDK-style
stream/attribute bridge with close suppression and target cleanup on attribute
failure. The default Unix provider is backed by link, symlink, unlink, rename,
file-transfer, ownership, mode, and timestamp dispatcher operations. Node and
BrowserFS do not expose descriptor extended attributes, so `COPY_ATTRIBUTES`
copies supported basic/POSIX metadata but treats the xattr list as empty.

BrowserFS 1.3 reports `(dev, ino) = (0, 0)` for every public `Stats` object.
The bridge now derives a stable synthetic device from each mounted backend and
a stable inode from the pinned synchronous key-value backend's metadata node
ID. Existing-target copy/move therefore no longer mistake unrelated paths for
the same file in the playground's InMemory mounts. Cross-mount BrowserFS rename
reports `EXDEV`: atomic moves are rejected, and ordinary moves enter the
provider's copy-with-attributes/delete fallback instead of silently performing
a non-atomic mount-layer rename. Mutable non-key-value BrowserFS backends still
fall back to path identity and do not claim hard-link/symlink alias parity.

`NioFilesPaths`, `Java11FilesString`, `Java11ProviderChannelFlags`, the
initial-POSIX fixture, and `Java13FileSystems` protect the CLI/provider and ZIP
boundaries. The Pages Chromium smoke exercises ordinary BrowserFS write,
missing-file, truncate, single-handle append, scatter-read and gather-write
fallbacks, data-sync, dirty delete-on-close, output-stream, create/delete,
legacy output `File.delete()` and random-access provider-unlink close,
existing-target copy/move, replacement, attribute-copy path execution, and cross-mount move
paths. BrowserFS 1.3 still cannot share live inode state across separately
opened or renamed handles, and its no-follow support is a non-atomic `lstat`
precheck; those backend limits remain explicit in `BUG-007`.

`java.io.File` disk-space queries now cover
`getTotalSpace()`, `getFreeSpace()`, and `getUsableSpace()` for files and
directories, plus missing-path zero results, backed by
`classes/modern_test/Java17FileSpace.java`. NIO `Files.getFileStore(...)` now
returns the default provider's mounted `FileStore`, including real name, type,
attribute-view, and empty-`Path` current-directory behavior. Its total, usable,
and unallocated space comes through the OpenJDK
`sun.nio.fs.UnixNativeDispatcher.statvfs0` bridge. Because the runtime provider
is a JDK 8 implementation, it inherits the modern class library's positive
4096-byte compatibility fallback for the Java 10+ `getBlockSize()` method.
Coverage is in the legacy `NioFilesPaths` check and
`classes/modern_test/Java17FileStoreSpace.java`. Default file-system
`getFileStores()` enumeration now covers Linux mount-table dispatch enough to
materialize usable `FileStore` instances; coverage is in
`classes/modern_test/Java17FileSystemStores.java`.
`java.io.FileInputStream`,
`java.io.FileOutputStream`, and `java.io.UnixFileSystem` VM `initIDs()`
initializers are treated as metadata no-ops; coverage lives in
`classes/modern_test/Java17IoInitIDs.java`, which also protects basic
read/write/append behavior and root listing.

Java security/runtime note: `AccessController.doPrivileged(PrivilegedAction)`
now dispatches covariant concrete `run()` methods instead of being pinned to
the erased `run():Object` bridge when the action class exposes a more-specific
reference return. Coverage lives in
`classes/modern_test/Java17CharsetAvailable.java`, which protects
`Charset.availableCharsets()` provider enumeration, case-insensitive charset
lookup, and unmodifiable map behavior. `AccessController` now also exposes the
current Java thread's inherited `AccessControlContext` through its native entry,
with coverage in `classes/modern_test/Java17AccessControlContext.java` for
`getContext()`, reflected inherited-context lookup, `doPrivileged`, and
`doPrivilegedWithCombiner` fallback behavior.

Java system/runtime note: `System.mapLibraryName(String)` now maps library
base names to host-style platform filenames and preserves Java's null-argument
failure. Coverage lives in
`classes/modern_test/Java17SystemMapLibraryName.java`. `Thread.dumpThreads`
now materializes stack traces for `Thread.getAllStackTraces()` and
non-current `Thread.getStackTrace()` calls. Coverage lives in
`classes/modern_test/Java17ThreadDumpThreads.java`. `Runtime.runFinalization()`
and `System.runFinalization()` now return as best-effort no-ops when Doppio has
no finalizer queue work. Coverage lives in
`classes/modern_test/Java17RuntimeFinalization.java`.

Java 17 compiler interop note: the Kotlin compiler smoke and focused Scala
modern interop smoke now also exercise selected Java 17 class-library overlays
from generated Kotlin/Scala bytecode via reflection, covering `HexFormat`,
`InstantSource`, and seeded `RandomGeneratorFactory` lookup/output for
`Random` and `SplittableRandom` providers while keeping compile-time bootstrap
metadata limited to Doppio's transformed Java 8 classes and modern class
library. They also cover Java
16 `Stream.toList()` from generated compiler output, directly from Kotlin
source and through the same reflection-backed runtime overlay path for Scala,
verifying the returned list is unmodifiable. The same compiler interop slice
covers Java 17 `Map.Entry.copyOf` snapshot and unmodifiable-result behavior,
directly from Kotlin source and through reflection from Scala. The Scala
compiler interop smoke also covers Java 9 `List.of`, `Set.of`, and `Map.of`
immutability/duplicate behavior plus Java 10 `List.copyOf` through the same
reflection-backed path and Java 11 `Optional.isEmpty()` / no-arg
`Optional.orElseThrow()` and Java 9 `ProcessHandle.current()` /
`ProcessHandle.of(pid)` metadata plus selected `ProcessHandle.Info` optionals
through reflection, except that Scala now compiles and executes the no-arg
`Optional.orElseThrow()` calls directly using the packaged modern class library
ahead of `rt.jar` on scalac's boot classpath. The Kotlin compiler interop smoke
directly covers
Java 10 `List.copyOf`/`Set.copyOf`/`Map.copyOf` and the same Java 11 Optional
additions, plus Java 9 `StackWalker.walk(...)` frame discovery,
`StackWalker.getCallerClass()`, and `StackWalker.forEach(...)` traversal plus
`ProcessHandle.current()` / `ProcessHandle.of(pid)` metadata plus selected
`ProcessHandle.Info` optionals through reflection. The Java 17 fixture set also
covers
`ClassLoader.defineClass(String, ByteBuffer, ProtectionDomain)` for heap,
direct, read-only direct, and sliced buffers without advancing buffer
positions, which protects compiler and transformer class-loading paths that pass
class bytes via `ByteBuffer`.

Java 9 Unsafe note: the compatibility row above now also includes selected
`sun.misc.Unsafe.copyMemory(Object, long, Object, long, long)` primitive-array
behavior for `byte[]` to `byte[]` copies, aligned same-type `short[]`,
`char[]`, `int[]`, and `long[]` copies, including same-array overlapping
ranges and zero-length no-ops, plus selected native-memory transfers through
`byte[]` and aligned primitive arrays. It also includes selected
`sun.misc.Unsafe.setMemory(Object, long, long, byte)` behavior for `byte[]`,
aligned primitive arrays, and native-memory fills, including zero-length
no-ops, and selected native-memory primitive scalar accessors for `short`,
`char`, `int`, `long`, `float`, `double`, and Doppio's 32-bit address model.
It also covers selected
`sun.misc.Unsafe.reallocateMemory(long, long)` behavior for allocation from
zero, growth, shrinkage, preserved prefixes, and zero-size frees.

## Compatibility Expansion Policy

The matrix above records the implemented release surface; it is not a claim of
complete API support for any Java release. New runtime surfaces require focused
native-oracle coverage and, for cross-cutting work, a design note. The existing
design notes cover `java.lang.invoke`, synthetic modern-method reflection
overlays, and Kotlin and Scala compiler bring-up. Named modules, native file
locks, direct I/O, and other accepted platform boundaries must first gain a
portable implementation and focused fixtures before the support profile can be
expanded.

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
  `Hello.kt` compiler smoke compiles and runs with the full compiler classpath
  while target metadata comes only from Doppio's compiler bootstrap overlay,
  modern class library, Java 8 runtime, and Kotlin stdlib.
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
  properties, an inline function, packaged `@JvmMultifileClass` facade
  generation, `Closeable.use` including close-failure
  suppressed-exception preservation, destructuring, range loops, stepped
  `downTo` loops, `mapIndexed`, `synchronized`, and generated Kotlin
  `LineNumberTable` metadata flowing into Doppio stack-trace frames, plus
  top-level,
  bound, unbound, constructor, and companion
  callable references used through lazy `Sequence` pipelines, plus
  `@JvmInline value class` boxing, interface dispatch, nullable handling, map
  keys, and sorting, plus reified generic type checks, `T::class.java`,
  primitive/object arrays, spread varargs, copied arrays, typed arrays, and
  component-type reflection, plus runtime-retained annotation use-site targets
  observed through Java reflection, repeatable annotation containers, and
  annotation enum/class/array elements, plus Kotlin operator/destructuring
  lowering, `fun interface`, sealed
  interface exhaustiveness, `data object`, `Enum.entries`, enum constant class
  bodies with overridden members, property references,
  class literals, default-argument `$default` methods, `@JvmOverloads`,
  interface `DefaultImpls`, qualified interface-super method/property dispatch,
  no-compatibility JVM interface default methods and delegation,
  data-class `copy$default`, enum `when`
  `$WhenMappings`, string `when` hash switching, and subjectless `when`
  branches, plus inline `try/finally`, non-local returns, `crossinline`, and
  `noinline` function-object retention, plus `@file:JvmName`, `@JvmName`,
  `@JvmStatic`, `@JvmField`, `const val`, `@Throws`, `@Volatile`,
  `@Synchronized`, and `@JvmSynthetic` JVM interop lowering, plus mutable
  `MethodParameters` name/presence metadata including synthetic-method fallback
  behavior, plus mutable delegated properties with `provideDelegate`,
  `getValue`, `setValue`, and generated
  delegated-property references, plus captured local classes,
  anonymous object lowering, inner-class `this$0`, nested companion
  construction, and synthetic accessor generation, plus Java reflection over
  Kotlin nested, inner, companion, method-local, companion-local, and anonymous
  class shape metadata, plus
  interface delegation, delegated `DefaultImpls` forwarding,
  and generic bridge methods verified through Java reflection, plus extension
  receiver functions/properties, typealias metadata, use-site variance, star
  projections, generic `Signature` attributes, and inlined sorted comparator
  classes, plus receiver lambdas, extension function type metadata, extension
  callable references, bound extension references, extension property
  references, and runtime-visible receiver-parameter annotations, plus tailrec
  lowering, labeled loops, local default-vararg helpers, spread-array calls,
  inline `Result` control flow, labeled `return@`, exception tables, and
  `StackMapTable` metadata, `do`/`while` plus `when` branch lowering, and
  finally-on-iteration cleanup, plus `lateinit` property accessors,
  `LazyThreadSafetyMode.NONE` lazy initialization, `notNull`/`observable`/
  `vetoable` delegates, delegated-property references, and companion/nested
  object initialization, plus `buildList`/`buildMap`/`buildSet`, grouping
  folds, windowed/chunked collection transforms, partitioning, `zipWithNext`,
  `flatten`, `associateWith`, `runningFold`, and `reduceIndexed`, plus
  `sequence` and `iterator` builders, `SequenceScope.yield`/`yieldAll`,
  restricted suspend sequence state machines, `constrainOnce`,
  `generateSequence`, lazy `onEach`/`filter`/`map`/`zipWithNext` pipelines,
  and sequence `windowed`, plus Kotlin 2.4 context function/property lowering
  with context parameters verified in generated JVM descriptors, plus deeper
  `Result` success/failure flow through
  `mapCatching`, `recoverCatching`, `getOrDefault`, `getOrElse`, boxed
  failures, exception cause retention, `try`/`finally` ordering, and inline
  lambda labeled returns, plus Kotlin text/regex APIs covering named groups,
  lazy `findAll` sequences, destructured matches, transform replacements,
  `replaceFirst`, `split`, `trimIndent`/`lineSequence`, regex options, and
  string range replacement, plus Kotlin `Duration` stdlib value-class
  arithmetic, sorting, ISO parsing, scaling, range coercion, and
  finite/infinite checks, plus Kotlin source-level use of Java 16
  `Stream.toList()` and its unmodifiable result
  behavior, plus Kotlin source-level use of Java 17 `Map.Entry.copyOf`
  snapshot and unmodifiable-result behavior, plus Kotlin source-level use of
  Java 10 collection `copyOf` APIs and Java 11 `Optional` additions, plus Kotlin
  source-level reflection over Java 9 `StackWalker.walk`,
  `StackWalker.getCallerClass`, `StackWalker.forEach`, `ProcessHandle`, and
  selected `ProcessHandle.Info` metadata, plus
  concurrent cache primitives covering `ConcurrentHashMap` compute/merge paths,
  atomics,
  `CopyOnWriteArrayList`, `ThreadLocal`, `ReentrantLock.withLock`,
  synchronized maps, and one-shot thread-local isolation, plus Kotlin contracts
  covering `returns` implications, `callsInPlace` invocation-kind metadata,
  inline contract functions, and nullable smart casts, plus an isolated Kotlin
  suspend smoke covering no-suspension `startCoroutine`, synchronous and
  delayed `suspendCoroutine` resume, resume-time exception propagation,
  Java `Thread` and `ExecutorService` continuation resumption, and a custom
  `ContinuationInterceptor` event loop, plus an isolated Kotlin coroutine
  lowering smoke covering queued `ContinuationInterceptor` resumption through
  nested `try`/`finally` cleanup, plus a focused queued suspend control-flow
  smoke covering `try`/`catch`/`finally`, `break`, `continue`, and
  `resumeWithException` unwinding, plus suspend-inline delayed continuation
  resumption with inlined `finally` cleanup on success and failure, plus a
  focused Kotlin I/O smoke covering
  file helpers, Java NIO `Path`/`Files`, `FileStore` space/block-size queries,
  `MappedByteBuffer`, classpath resource lookup, `ServiceLoader`, and runtime
  jar/zip/classpath-style reads, plus
  Java dynamic-proxy
  interop covering a Kotlin interface proxy, `InvocationHandler` dispatch,
  reflective proxy-method invocation, runtime method and parameter
  annotations, proxy `Object` method dispatch, `Proxy.isProxyClass`, and
  `Proxy.getInvocationHandler`, and the workflow's focused Kotlin
  MethodHandles smoke covers Kotlin source-level use of
  `java.lang.invoke.MethodHandles` covering static, virtual, constructor, and
  field handle lookup, `invokeWithArguments`, `MethodHandle.asType`, primitive
  boxing/unboxing/widening, selected reflection-backed `Lookup.unreflect`,
  `unreflectSpecial`, `unreflectConstructor`, `unreflectGetter`, and
  `unreflectSetter` success paths including private-lookup-backed superclass
  and interface-default special dispatch plus a private member access-failure path,
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
  selected `tryFinally` flows including fixed-arity varargs target/cleanup
  normalization, `tableSwitch`, and `iteratedLoop` flows, and selected
  `whileLoop`/`doWhileLoop`/`countedLoop` non-`void` state plus `void`
  side-effect loops), and
  method-type descriptor reporting, plus Kotlin unsigned
  primitives and unsigned arrays covering wraparound arithmetic, unsigned
  sorting, filtering, map keys, and hexadecimal byte rendering, plus Kotlin
  source-level Java `CompletableFuture` interop covering SAM conversion,
  executor-backed completion, composition, recovery, combination, racing, and
  timed retrieval, plus focused Kotlin SAM conversion coverage for Kotlin
  `fun interface` adapters and Java `Runnable`, `Comparator`, `Supplier`,
  `IntUnaryOperator`, `Predicate`, and `Callable` lambdas with
  `InvokeDynamic`/`LambdaMetafactory` classfile checks, plus Kotlin contracts
  covering inline call-in-place behavior and nullable smart casts, then runs the
  generated code on both the host JVM and Doppio with `kotlin-stdlib.jar`.
- The workflow also runs `ci/kotlin_bytecode_smoke.sh`, a smaller focused
  Kotlin compiler smoke that inspects representative generated classfiles with
  `javap -v` and asserts Kotlin lambda `InvokeDynamic`/`LambdaMetafactory`
  emission, extension-function metadata, value-class `box-impl`/`unbox-impl`
  lowering, runtime annotation metadata, `MethodParameters`, generic
  `Signature` attributes, debug `SourceFile`/`LineNumberTable` attributes,
  bootstrap metadata, parameter names, bridge methods, interface
  `DefaultImpls`, `InnerClasses`, and `kotlin.Metadata`, then compares the
  generated bytecode smoke output on the host JVM and Doppio.
- The workflow also runs `ci/kotlin_jvm_default_smoke.sh` with
  `-jvm-default=no-compatibility`. It rejects generated `DefaultImpls` classes,
  verifies executable interface default methods and the interface-local
  default-argument bridge, checks qualified interface-super and delegation
  targets, and compares inherited, diamond, delegated, and reflection
  `Method.isDefault()` behavior on the host JVM and Doppio. A local
  2026-07-13 run completed in 237 seconds.
- The workflow also runs `ci/kotlin_indy_concat_smoke.sh`, compiling Kotlin 2.4
  with Java 17 classfiles and `-Xstring-concat=indy-with-constants`. It asserts
  `StringConcatFactory.makeConcatWithConstants` lowering without
  `StringBuilder`, adjacent wide primitive slots, direct `Object` parameters,
  null conversion, observable `toString()` dispatch, and original exception
  propagation before comparing host JVM and Doppio output. The focused run
  completed in 291 seconds after exposing and fixing direct-object conversion.
- The workflow also runs `ci/kotlin_methodhandle_smoke.sh`, a focused Kotlin
  compiler smoke split out of the main full-classpath source set so the large
  `java.lang.invoke.MethodHandles` fixture still compares host JVM and Doppio
  output while reducing main-smoke compile variance.
- The workflow also runs `ci/kotlin_suspend_smoke.sh`, a focused Kotlin
  compiler smoke split out of the main full-classpath source set so suspend
  state-machine, cross-thread resume, executor resume, and queued dispatcher
  coverage still compare host JVM and Doppio output while reducing main-smoke
  compile variance.
- The workflow also runs `ci/kotlin_suspend_control_smoke.sh`, a focused Kotlin
  compiler smoke split out of the main full-classpath source set so queued
  suspend control flow through `try`/`catch`/`finally`, `break`, `continue`,
  `resumeWithException` unwinding, and nested `finally` return-state evaluation
  still compares host JVM and Doppio output while reducing main-smoke compile
  variance.
- The workflow also runs `ci/kotlin_io_smoke.sh`, a focused Kotlin compiler
  smoke split out of the main full-classpath source set so file I/O, Java
  NIO including `FileStore` space/block-size queries, mmap forcing, classpath
  resources, `ServiceLoader`, and jar/zip coverage still compare host JVM and
  Doppio output while reducing main-smoke compile variance.
- The workflow also runs `ci/kotlin_record_smoke.sh`, a focused Kotlin
  `@JvmRecord` smoke compiled with `-jvm-target 17` to cover Kotlin-generated
  record classfiles, record reflection metadata, canonical constructors, and
  component accessors without changing the main Kotlin smoke target; this also
  exercises the modern `java.lang.Record` class-library shim.
- The workflow now runs that smoke with `KOTLIN_SMOKE_CLASSPATH_MODE=full`,
  covering the full `kotlinc/lib/*.jar` classpath rather than only
  `kotlin-compiler.jar`.
- The workflow also runs `ci/kotlin_diagnostic_smoke.sh`, which compiles an
  intentionally invalid Kotlin source under Doppio and checks the nonzero exit
  status, type-mismatch and unresolved-reference diagnostics, source lines,
  caret positions, and absence of generated output files.
- The workflow also runs `ci/kotlin_reflect_smoke.sh`, a smaller
  `kotlin-reflect.jar` runtime smoke. Doppio compiles the source with explicit
  `kotlin-stdlib.jar` and `kotlin-reflect.jar` source classpath, then both the
  host JVM and Doppio run the generated class with `kotlin-reflect.jar`. The
  smoke covers `KClass.primaryConstructor`, `KClass.memberProperties`,
  mutable property set/get through `KMutableProperty1`,
  `KClass.memberFunctions` invocation, runtime annotation lookup,
  companion-object dispatch, `KCallable.callBy` default constructor and method
  arguments, sealed subclass enumeration, object-instance lookup, and selected
  `KType` classifier, generic argument, type-parameter, return-type, and
  nullability metadata.
- The release workflow executes the complete manifest-backed Kotlin inventory
  with per-script and process-group deadlines. Current implementation notes live
  in `docs/design/kotlin-compiler.md`.

## Scala Compiler Bring-Up

- Target: Scala compiler 2.13.18.
- Current Doppio state: `ci/scala_smoke.sh` downloads `scala-compiler`,
  `scala-library`, `scala-reflect`, `java-diff-utils`, and JLine from Maven
  Central, runs `scala.tools.nsc.Main` under Doppio, and compiles
  `classes/scala_smoke/*.scala` against the Doppio-owned compiler bootstrap
  overlay; the generated `Hello` class prints the expected output on both the
  host JVM and Doppio.
- The fixture covers a small Scala 2.13 source slice with sealed traits, case
  objects, a sealed ADT with case classes, guarded pattern matching, a generic
  case class, trait default method, anonymous class, closures, collection
  pipelines, `Vector`, `Map.collect`, `PartialFunction.collect`, `Option`,
  `Either`, tuple matching, for-comprehension desugaring, `lazy val`,
  `try`/`catch`/`finally`, a focused Scala library/lowering smoke covering
  `groupMapReduce`, implicit value classes, default arguments, case-class
  `copy`, `@tailrec`, varargs with `ClassTag`, `Try`, and tuple ordering,
  a focused Scala package/reflection smoke covering package object
  initialization, package-scoped classes and objects, `Enumeration`,
  `@BeanProperty`, Java reflection over Scala-generated members, specialized
  class generation, and specialized generic `Signature` metadata, a focused Scala
  StackWalker smoke covering Java `StackWalker` frame descriptor/`MethodType`
  metadata with retained-class-reference guards, `getCallerClass()`, and
  `forEach` traversal, a focused `scala-reflect`
  runtime universe smoke covering runtime mirror creation, `typeOf`,
  constructor/member symbol lookup, case-accessor discovery, and static class
  lookup, a focused Scala collection-library smoke covering `LazyList`,
  extractor `unapply`, `Regex`, `TreeMap`, `ArraySeq`, `groupMap`, map views,
  and right-biased `Either`, a focused Scala language/type-system smoke
  covering path-dependent types, higher-kinded implicit typeclass lookup,
  self-types, by-name argument evaluation, extractor matching, value-class
  extension methods, structural refinement dispatch, and `@switch` lowering,
  a focused Scala functional/library smoke covering `Function.chain`,
  composed function adapters, `Option.when`/`Option.unless`, `Using.resource`,
  close-failure suppressed-exception preservation, `Try` recovery,
  `Either.cond`, `partitionMap`, and lambda-heavy classfile emission,
  a focused Scala Java collection/Future interop smoke covering
  `scala.jdk.CollectionConverters`, mutable Java list/map wrappers, and a
  small `Future`/`Promise`/`Await` path running on a Java executor,
  a focused Scala concurrency smoke covering Java concurrency interop through
  `CompletableFuture` chaining and recovery, `ConcurrentHashMap` compute/merge
  paths, atomics, `CopyOnWriteArrayList`, `ThreadLocal`, `ReentrantLock`, and
  synchronized Java maps,
  a focused Scala source-level `java.lang.invoke.MethodHandles`
  lookup/adaptation smoke for selected static, virtual, constructor, and
  combinator flows plus private-lookup-backed superclass and interface-default
  `unreflectSpecial` dispatch, reflection-discovered Java 17 overlay helpers,
  and selected array collector/spreader adapter flows,
  a focused Scala I/O smoke covering runtime JAR/ZIP/classpath resource reads
  through `JarOutputStream`, `JarFile`, `ZipInputStream`, and
  `URLClassLoader`, `ServiceLoader` provider discovery from generated
  `META-INF/services` metadata including duplicate-provider collapse and
  reload, and classpath resource lookup through `Class.getResource`,
  `ClassLoader.getResource`, `getResources`, `getResourceAsStream`,
  `getSystemResource`, and reflection-backed `ClassLoader.resources`,
  a focused Scala proxy smoke covering Java dynamic-proxy interop through a
  Scala trait proxy, `InvocationHandler`, reflective proxy-method invocation,
  runtime method and parameter annotations, proxy `Object` methods,
  `Proxy.isProxyClass`, and `Proxy.getInvocationHandler`,
  a focused Scala annotation smoke covering runtime annotation metadata for
  repeatable Java annotations applied from Scala, enum/class/array-valued
  annotation elements, and Java reflection lookup on Scala-generated classes,
  methods, and parameters, a focused Scala reflection-shape smoke covering
  Java reflection over Scala-generated member, method-local, and anonymous
  class shape metadata,
  a focused Scala NIO smoke covering reflection-backed Scala use of Java NIO
  `Path.of` factories, `Files.mismatch`, `Files.isSameFile`,
  `Files.getFileStore` space queries, `FileStore.getBlockSize()`, and
  `Files.walk` cleanup paths, a focused Scala modern Java interop smoke
  covering reflection-backed Scala use of Java 16 `Stream.toList()` and its
  unmodifiable result behavior plus reflection-backed Scala use of Java 17
  `Map.Entry.copyOf` snapshot and unmodifiable-result behavior plus Java 9/10
  collection factory/copy APIs, reflection-backed Java 11 `Optional.isEmpty`,
  direct no-arg `Optional.orElseThrow` calls, and Java 9
  `ProcessHandle` / `ProcessHandle.Info` metadata,
  a focused Scala duration smoke covering `scala.concurrent.duration`
  arithmetic/sorting/parsing/scaling checks,
  classfile assertions for `InvokeDynamic`/`LambdaMetafactory` emission in the
  main and focused functional Scala smokes, plus a dedicated captured-lambda
  serialization path through `altMetafactory`, `SerializedLambda`, and
  `$deserializeLambda$`, representative
  generic `Signature` metadata, Scala `SourceFile`/`LineNumberTable`,
  `ScalaSignature`, `ScalaInlineInfo`, and `ScalaSig` classfile attributes,
  path-dependent types, higher-kinded implicit typeclass lookup, self-types,
  by-name argument evaluation, extractor matching, value-class extension
  methods, structural refinement dispatch, `@switch` lowering, and opposing
  stackable-trait linearization orders through generated super bridges, plus
  closure non-local return control and enclosing `finally` cleanup, and a
  diagnostic smoke covering single-line and multiline type-mismatch plus
  missing-member source filename, line number, found/required types, source
  lines, carets, and multi-error count,
  plus a focused two-phase Scala 2 blackbox macro expansion smoke, plus string
  interpolation,
  then runs the generated `Hello` class on both the host JVM and Doppio.
- The workflow also runs `ci/scala_record_smoke.sh`, a focused Java 17 record
  interop smoke that compiles a record support class with the host JDK and then
  verifies Doppio-hosted scalac output against record reflection metadata,
  canonical constructor invocation, component accessor reflection, Scala calls
  to record accessors, and the modern `java.lang.Record` class-library shim.
- Current notes live in `docs/design/scala-compiler.md`.

## Additional JVM Language Smokes

- `ci/groovy_smoke.sh` pins and verifies Apache Groovy 4.0.33, compiles
  `GroovySmoke.groovy` with Groovy's compiler running inside Doppio, checks the
  emitted Java 8 class and closure bytecode, and compares execution on the
  host JVM and Doppio. This is a small collection/closure slice, not general
  Groovy compatibility.
- `ci/clojure_smoke.sh` pins and verifies Clojure 1.12.6 and its two required
  spec JARs, compiles a `:gen-class` fixture ahead of time on the host JVM,
  then compares the generated class's output on the host JVM and Doppio.
  Clojure compiler execution inside Doppio and full dynamic Clojure runtime
  compatibility are not part of this gate.
- `ci/jruby_smoke.sh` pins and verifies JRuby 9.4.15.0, syntax-checks a Ruby
  fixture on the host JVM, and compares interpreted Ruby blocks plus a small
  `java.util.ArrayList` interop path on the host JVM and Doppio. JRuby 9.4 is
  an EOL line; JRuby 10 and broader Ruby compatibility are not claimed.
- All three smokes run in the manifest-backed Modern Java compiler matrix with
  bounded per-command and shard timeouts.

## Current Test Targets

- `yarn ci:check-modern-java-workflow:test` covers the workflow checker itself,
  and `yarn ci:check-modern-java-workflow` verifies that every Kotlin, Scala,
  Groovy, Clojure, and JRuby smoke script is referenced by the
  Modern Java workflow, so newly added compiler smokes fail fast if they are not
  wired into CI.
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
  `LongStream`/`DoubleStream` including lazy predicate/next invocation
  boundaries and repeated `Iterator.hasNext()` caching, ordered sequential
  object and primitive `takeWhile`/`dropWhile` including `limit(0)`
  short-circuiting, primitive `of`/`range`/`rangeClosed` exact-size
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
  followed by a reference argument, boxed `Byte`, `Short`, `Integer`, `Long`,
  `Boolean`, `Character`, `Float`, and `Double` object arguments, selected
  floating-point `.0`, negative-zero, `NaN`, and infinity rendering,
  observable user-object `toString()` dispatch, null reference conversion,
  direct `StringBuilder`, enum, and `Class` reference conversion,
  primitive/object array identity-display prefix checks, and
  `makeConcatWithConstants` static `Class`,
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
  `DirectByteBuffer` relative bulk get/put behavior and `java.nio.Bits`-backed
  direct typed-buffer relative bulk `get`/`put` for `short`, `char`, `int`,
  `float`, `long`, and `double` arrays, and lazy
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
  custom implementation, and null input paths,
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
  instance method returning `String`, a receiver-backed interface
  `REF_invokeSpecial` target for a default method returning `String`, and a
  static `ACC_VARARGS` method target where a trailing `CONSTANT_Integer`
  static argument is collected and widened into a `long[]`, plus a
  `REF_invokeStatic` target backed by an interface static method returning
  `String`, and a static method target where a boxed `Long` dynamic constant
  argument is unboxed and widened into a `double` parameter, plus a boxed
  `Integer` dynamic constant unboxed, widened, and rounded into a `float`
  parameter; Java 12 `CompactNumberFormat` basic
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
	  failure behavior, plus ZIP/JAR provider success for all four `Path`
	  overloads including selected `Files` input, byte-channel, metadata,
	  directory-listing, walking, and find dispatch through non-default ZIP
	  filesystem paths, plus selected
	  `ByteBuffer.get(int, byte[], ...)` and `put(int, byte[], ...)`
	  heap/direct normal plus range/null/read-only behavior, selected
	  typed-buffer absolute bulk `get`/`put` heap/direct normal,
	  range/null/read-only, wide `double` element paths, and direct
	  typed-buffer relative bulk paths through `java.nio.Bits`; Java 14 switch expression
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
  bound, NaN-bound, and finite-range validation for `nextFloat`,
  `nextDouble`, and bounded `doubles` streams, zero-standard-deviation
  `nextGaussian(mean, stddev)`,
  native `+0.0` raw-bits parity for zero-valued default `nextGaussian()`
  samples, NaN and infinite standard-deviation
  `nextGaussian(mean, stddev)` behavior,
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
  `unreflectSpecial`, `unreflectConstructor`, `unreflectGetter`, and
  `unreflectSetter` public success, selected superclass/interface-default
  special dispatch, non-nestmate private failure, and nestmate-private success paths,
  selected `MethodHandles.reflectAs` method, constructor, getter, and setter
  round-trips,
  selected `MethodHandles.privateLookupIn` same-package target lookup,
  caller/peer private constructor, method, and field access, public lookup
  rejection, and primitive/array target rejection,
  selected `Lookup.defineClass(byte[])` exact metadata, package-only access,
  direct/reflected/unreflected definition, defining context identity,
  initialization delay, duplicate rejection, classfile failures, and recovery,
  selected `Lookup.findClass(String)` and `accessClass(Class<?>)` exact
  metadata, lookup-loader identity, package/public/reduced-mode access,
  inaccessible array-component rejection, primitive/void/array/null/missing
  inputs, initialization delay, exception ordering, and direct/reflected/
  unreflected invocation,
  selected `Lookup.hasPrivateAccess()` public/deprecated metadata and
  full/reduced/public/private lookup behavior through direct, reflected, and
  unreflected invocation, plus Java 9 `Deprecated.since()`/`forRemoval()`
  annotation element defaults,
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
  selected `tryFinally` flows including fixed-arity varargs target/cleanup
  normalization, `tableSwitch`, and `iteratedLoop` flows, and selected
  `whileLoop`/`doWhileLoop`/`countedLoop` non-`void` state plus `void`
  side-effect loops with descriptor checks, including four-handle `countedLoop`
  null initializer default state, plus selected single-clause
  `MethodHandles.loop` external argument inference, null-init state inference
  from zero-argument non-`void` steps, null-init/null-step no-state
  external-prefix loops, no-state loops, and selected prefix-compatible
  multi-clause state loops with selected `null`
  initializers, `null` steps, `void` clauses, `null` helper predicates, and
  `null` finalizers, distinct state/external parameter domains, and selected
  non-init-only external argument inference, executing void/state mixed clauses,
  fixed-arity normalization with tested single- and multi-clause varargs
  finalizers, single- and multi-clause null rejection, and validation precedence
  including single-clause init/step-return-before-predicate and
  predicate-before-parameter ordering, sealed metadata, and illegal direct
  subtype rejection;
  Java 18-26 simple parser-only class-file
  containers; and runnable Java 9/10/11/12/13/14/15/16/17 comparisons.
- The default `grunt test` suite is green under the supported Java 17 host: its
  Java 8-era output is normalized where host formatting changed, and the
  bundled Nashorn compatibility smoke uses a separate Doppio-owned golden
  output. The gate currently reports 77/77 passing fixtures.

## Known Preview Gaps

- Class-file admission preserves the existing major range 45–70. Majors 56–70
  accept only minor 0; minor 65535 is rejected because this runtime has no
  preview execution mode, and other modern minors are invalid. Majors 45–55
  retain the JVMS-permitted arbitrary minors. Both ordinary class definition and
  `Lookup.defineClass` distinguish `UnsupportedClassVersionError` from structural
  `ClassFormatError` without relying on message text. This is admission policy,
  not complete VM verification or Java 26 language/API support. See
  [JVMS 25 class versions](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html#jvms-4.1)
  and [class derivation errors](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.3.5).
- The [admission checks](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/ci/class_file_version_test.cjs) cover 57 parser,
  loader, Lookup, failed-definition recovery, application-loader propagation and
  launch-shutdown scenarios. The
  [native/host gate](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/ci/java_class_version_test.mjs) adds two untouched javac
  21/25 controls, four explicitly header-mutated historical controls and nineteen
  negative cases (fifty Node/Chromium checks). Version mutations, input hashes
  and runtime/toolchain provenance remain separate from genuine compiler output.
  Rejected classes must not run their initializer or main body.
  Launch failure waits for the pending Java exception diagnostic and normal
  shutdown rather than completing the host callback prematurely.
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
- `java.lang.Character.toString(int)` is a parsed public static Java 11 method,
  so direct calls, reflective lookup and enumeration, `Method.invoke`, and
  `Lookup.unreflect` share one implementation. Coverage includes exact method
  and empty annotation metadata, BMP, supplementary, NUL, and max code points,
  plus native-compatible invalid-range exception messages.
- `java.lang.ClassLoader.getPlatformClassLoader()` is a parsed public static
  Java 9 method, so direct calls, reflective lookup and enumeration,
  `Method.invoke`, and caller-sensitive `Lookup.unreflect` invocation share one
  implementation. It exposes HotSpot-compatible
  `jdk.internal.reflect.CallerSensitive` runtime annotation metadata and keeps
  the tested platform/system loader identity and parent hierarchy. The legacy
  `SecurityManager` caller permission check is not implemented.
- `java.lang.ClassLoader.getDefinedPackage(String)` and
  `getDefinedPackages()` are parsed public final Java 9 methods, so direct
  calls, reflective lookup and enumeration, `Method.invoke`, and
  `Lookup.unreflect` share one implementation. Coverage includes exact-loader
  system and empty-loader package visibility, missing and bootstrap-package
  exclusion, fresh array snapshots, mutation isolation, null validation, and
  native-compatible method metadata.
- `java.lang.invoke.MethodHandles.Lookup.defineClass(byte[])` is a parsed
  public, non-native Java 9 method with its exact generic `Class<?>` return and
  declared `IllegalAccessException`. Coverage includes package-only lookup
  success, access checks before null handling, defining loader/module/package/
  protection-domain identity, no initialization during definition or lookup,
  direct, reflective, and unreflected calls, duplicate definition,
  malformed/truncated/trailing/future classfiles, module descriptors,
  wrong-package input, and successful definition after rejected inputs. The
  legacy SecurityManager check and named-module package ownership remain
  unsupported.
- `MethodHandles.Lookup.findClass(String)` and `accessClass(Class<?>)` are
  parsed public, non-native Java 9 methods with exact generic signatures and
  checked-exception metadata. Coverage includes lookup-loader/module/
  protection-domain identity, same-package and cross-package access, reduced
  and public lookups, array component visibility, primitive and void access,
  primitive-name, missing, and null failures, class-loading-before-access
  exception ordering, initialization delay, exact returned identity,
  `Method.invoke`, and `Lookup.unreflect`. Doppio's Java `Class.forName` bridge
  now rejects primitive and void binary names before descriptor conversion.
  SecurityManager checks, previous-lookup module edges, cross-module mode
  transitions, and named-module qualified exports remain unsupported.
- `MethodHandles.Lookup.hasPrivateAccess()` promotes the bootstrap class's
  existing private method slot to an ordinary public Java 9 API and delegates
  to `hasFullPrivilegeAccess()`. It carries Java 14's exact classfile and
  runtime-visible deprecation metadata. The modern class-library
  `java.lang.Deprecated` definition supplies Java 9's abstract `since()` and
  `forRemoval()` elements with empty-string and false defaults. Coverage
  compares full, dropped-private, public, same-class, and `privateLookupIn`
  lookups plus `Method.invoke` and `Lookup.unreflect` with HotSpot 17.
  Previous-lookup and named-module privilege semantics remain part of the
  broader lookup-mode limitation.
- Java 17 `java.lang.annotation.ElementType` and `java.lang.Deprecated`
  metadata are implemented through complete modern class-library definitions
  rather than method-only bytecode overlays. `ElementType` exposes the exact
  twelve-value order through `MODULE` and `RECORD_COMPONENT`; `Deprecated`
  exposes exact element defaults plus `Documented`, runtime retention, and the
  Java 9+ target set including `MODULE`. `Java17DeprecatedMetadata` compares
  enum fields, ordinals, clone behavior, `valueOf` failures,
  `RECORD_COMPONENT` target materialization, method metadata, annotation
  metadata, defaults, and an explicit annotation proxy with HotSpot 17.
  Difficulty: low.
- `MethodHandles.publicLookup().toString()` now reports the Java 9+
  `java.lang.Object/publicLookup` diagnostic form through the existing parsed
  `Lookup.toString()` slot. Exact `MODULE`, `UNCONDITIONAL`, and `ORIGINAL`
  field metadata plus selected raw original/same/nested/private/public and all
  single-mode drop values are covered. Full, private, package, module,
  public-mode, and no-access strings are regression-tested; named-module and
  previous-lookup-class transitions remain unsupported.
- `MethodHandles.Lookup.ensureInitialized(Class<?>)` is a parsed public,
  non-native Java 15 method with exact generic and checked-exception metadata.
  Coverage includes null/primitive/void/array validation, access rejection
  without initialization, exact returned identity, superclass-before-subclass
  and direct-interface initialization, repeated no-op success, `Method.invoke`,
  `Lookup.unreflect`, first-failure `ExceptionInInitializerError` wrapping,
  direct `Error` propagation, permanent `NoClassDefFoundError` after failure,
  superclass failure propagation, and concurrent waiter behavior. The runtime
  now retains an `ERRONEOUS` class state instead of retrying `<clinit>`.
  Superinterface initialization for default methods, SecurityManager checks,
  and full named-module access semantics remain unsupported.
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
- `java.util.concurrent.TimeUnit.toChronoUnit()` and static
  `TimeUnit.of(ChronoUnit)` are parsed Java 9 methods with exact seven-unit
  bidirectional mappings and native-compatible null/unsupported-unit failures.
  `TimeUnit.convert(Duration)` is a parsed Java 11 overload covering exact
  positive/negative truncation toward zero and overflow saturation for all
  seven target units. Both fixtures verify exact metadata, `Method.invoke`,
  and `Lookup.unreflect`; the existing Java 8 enum timing methods remain
  untouched. See `docs/design/timeunit-modern.md`.
- `java.time.Duration.dividedBy(Duration)`, `toSeconds()`, and the six part
  accessors are parsed Java 9 methods with exact metadata. Coverage includes
  zero, positive, normalized negative, fractional, and extreme part values;
  exact decimal division and truncation toward zero; null, zero-divisor, and
  signed overflow failures; reflection; and selected `Lookup.unreflect`
  invocation. Existing Java 8 `multipliedBy(long)` and `dividedBy(long)` remain
  under regression after the private helper rename. Kotlin and Scala duration
  smokes compile and inspect direct calls to all eight methods before comparing
  runtime output against the compiler-only Doppio bootstrap overlay, without
  host JDK class metadata. See `docs/design/duration-modern.md`.
- `java.lang.StackTraceElement` now exposes selected Java 9 metadata
  constructor and accessor behavior for class-loader name, module name, and
  module version while preserving the existing class/method/file/line fields,
  plus metadata-aware `toString`, `equals`, and `hashCode` behavior.
- `java.lang.Class.getPackageName()` is a parsed public, non-native Java 9
  method, so direct calls, reflective lookup and enumeration, `Method.invoke`,
  and `Lookup.unreflect` share one implementation. Coverage includes exact
  method and empty annotation metadata plus ordinary, nested, local,
  anonymous, JDK, primitive, void, reference-array, primitive-array, and user
  array classes.
- `java.lang.reflect.Executable.getTypeAnnotationBytes0()` now returns parsed
  `RuntimeVisibleTypeAnnotations` bytes for methods and constructors. Coverage
  includes annotated method return, nested generic argument, receiver,
  parameter, and throws types, constructor parameter and throws types, and
  unannotated methods.
- `java.lang.reflect.Executable.getAnnotatedReceiverType()` now recursively
  parameterizes generic declaring classes, including generic owners of inner
  classes, while preserving receiver type-use annotations. The parsed
  package-private `parameterize(Class<?>)` helper has Java 17-compatible
  generic metadata. `Constructor.getAnnotatedReceiverType()` now returns an
  enclosing receiver only for non-static member classes and returns `null` for
  top-level, static-nested, local, and anonymous constructors. Coverage also
  protects `InnerClasses`-based class modifiers and static-aware annotated-type
  nesting for static nested receivers.
- `java.lang.reflect.AnnotatedType.getAnnotatedOwnerType()` now has its Java 9
  default-method metadata, and the four specialized annotated-type interfaces
  redeclare the exact abstract method. Parsed implementation overlays expose
  raw and parameterized owners while array, type-variable, and wildcard owners
  remain null. Coverage includes recursive three-level and zero-argument inner
  types, static and raw members, owner/type-argument annotations, exact method
  flags and declaring implementation classes, and top-level, array, type
  variable, and wildcard cases. `Field.getTypeAnnotationBytes0()` and
  `Class.getRawTypeAnnotations()` now provide the classfile annotation payloads
  needed by those paths. The full Java 9-26 suite and Kotlin 2.4.0
  full-classpath/Scala 2.13.18 compiler gates passed after this overlay was
  added.
- `java.lang.reflect.AccessibleObject` now exposes parsed public-final
  `canAccess(Object)` and `trySetAccessible()` methods with caller-sensitive
  metadata. Coverage includes direct and reflective caller selection,
  public/protected/package/private access, cross-package protected receivers,
  static/instance/constructor argument validation before and after overrides,
  non-`Member` subclasses, Java 11 private nestmates, permission-preserving
  state changes, and the `Class` constructor rejection. Named-module package
  openness remains limited by Doppio's current unnamed-module model. The full
  Java 9-26 suite and Kotlin 2.4.0/Scala 2.13.18 compiler gates passed after
  this overlay was added.
- `sun.reflect.generics.reflectiveObjects.ParameterizedTypeImpl` now renders
  Java 17-compatible nested type names without duplicating raw owners and uses
  `$` between parameterized owners and inner types. Coverage compares exact
  `getTypeName()`/`toString()` output and independent raw, owner, argument,
  generic-array, and wildcard structure, including `Map.Entry` and
  `TypeDescriptor.OfField<Class<?>>`. The complete Java 9-26 suite and the
  Kotlin 2.4.0 full-classpath and Scala 2.13.18 compiler gates passed after
  this overlay was added.
- `java.lang.reflect.Array` now exposes selected generic and primitive accessor
  behavior: reference-array null/type checks, wrapper unboxing into primitive
  arrays, direct primitive array reads/writes, allowed widening conversions,
  incompatible primitive targets, null arrays, non-array receivers, and index
  failures.
- `java.lang.Class` now exposes selected Java 11 nest reflection behavior:
  `getNestHost`, `getNestMembers`, and `isNestmateOf` for ordinary
  host/member/local/anonymous classes, primitives, void, arrays, and selected
  JDK `getNestHost`/non-nestmate checks, including null argument validation
  for `isNestmateOf`.
- `java.lang.Class.descriptorString()` is a parsed public, non-native Java 12
  method, so direct calls, reflective lookup and enumeration, `Method.invoke`,
  and `Lookup.unreflect` share one implementation. Coverage includes exact
  method and empty annotation metadata plus ordinary, nested, local,
  anonymous, JDK, primitive, void, reference-array, primitive-array, and user
  array classes.
- `java.lang.Class` now implements the Java 12
  `TypeDescriptor.OfField<Class<?>>` raw and generic interface metadata. Its
  `componentType()` and `arrayType()` methods are parsed public, non-native
  methods with the matching public synthetic covariant bridges, so direct,
  interface, reflective, and MethodHandle dispatch share one implementation.
- Coverage compares exact primary/bridge descriptors, modifiers, generic and
  annotation metadata, lookup selection, `Method.invoke`, `Lookup.unreflect`,
  `Lookup.findVirtual`, and interface dispatch with HotSpot. Behavior includes
  ordinary, interface, primitive, void, reference-array, primitive-array,
  multidimensional-array, and user-array classes, including the null-message
  `IllegalArgumentException` from `void.class.arrayType()`.
- `java.lang.Class` also exposes the Java 12 `Constable` contract in both its
  raw interface table and generic class signature. `describeConstable()` is a
  parsed public, non-native method with the exact
  `Optional<ClassDesc>` generic return type, so direct, `Constable` interface,
  reflective, and MethodHandle dispatch all select the same method.
- `Java12ClassConstableReflection` compares declared/public lookup and
  enumeration, modifiers, generic and annotation metadata, interface
  assignability, descriptor equality and resolution for ordinary, nested,
  local, anonymous, interface, enum, annotation, JDK, primitive, void, and
  array classes, plus `Lookup.unreflect` and `Lookup.findVirtual` through both
  `Class` and `Constable`. The separate selected C5 corpus now also checks
  empty constables for actual hidden classes and arrays with hidden components;
  selected nominal descriptor resolution is now independently checked by
  [C6](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c6-verified-batch-exit), not completed by C5 alone.
- `java.lang.Class.isHidden()` is a parsed public native Java 15 method, so
  direct calls, reflective lookup and enumeration, `Method.invoke`, and
  `Lookup.unreflect` share one implementation with HotSpot-compatible
  `IntrinsicCandidate` metadata. Coverage includes false results for non-hidden
  ordinary, nested, local, anonymous, JDK, primitive, void, and array classes.
  The separate [selected C5 evidence](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c5-verified-batch-exit)
  adds true results for actual hidden definitions and false for their arrays,
  with definition/class-data initialization, Lookup authority, identity/nest and
  reflective final-write restrictions. Hidden classes/arrays remain unavailable
  through ordinary name discovery; GC/unloading and named modules are unproven.
- `java.lang.System$Logger` covers the tested Java 9 nested interface and
  `Level` enum type surface, level metadata, and default log-method delegation
  for custom logger implementations, including null validation and lazy
  disabled logger behavior for supplier and object overloads. Both
  `System.getLogger` overloads are parsed public static Java 9 methods with
  HotSpot-compatible `CallerSensitive` metadata, reflective lookup and
  enumeration, `Method.invoke`, and caller-sensitive `Lookup.unreflect`
  invocation. They return a minimal no-op `System.Logger` shim for the tested
  name/type, null-argument, and returned-logger null-level validation paths.
  LoggerFinder provider discovery, module-specific selection, resource-bundle
  localization, and legacy `SecurityManager` behavior remain unsupported.
- Selected `java.lang.StrictMath` native hooks are covered by Java 17 parity
  fixtures for `cbrt`, `cosh`, `expm1`, `hypot`, `log10`, `log1p`, `sinh`,
  and `tanh`. The shim delegates to host JavaScript `Math` functions for these
  paths, so exhaustive fdlibm bit-for-bit parity across all inputs is not
  claimed.
- Direct and reflective calls to `Runtime.version()` return the same cached
  baseline `Runtime.Version` object. The parsed classfile overlay exposes
  native-compatible public/static/non-native/non-synthetic method metadata,
  zero parameters, the `Runtime.Version` return type, empty exception and
  annotation metadata, declared-method enumeration, reflective accessors, and
  `Method.invoke` dispatch, plus `Lookup.unreflect` conversion and invocation.
  Other broader reflection-visible modern methods still require the separate
  overlay design in `docs/design/runtime-reflection-overlays.md`.
- `Thread.onSpinWait()` is a parsed public static no-op spin hint, and
  `Reference.reachabilityFence(Object)` is a parsed public static no-op
  reachability barrier shim for object and null references. They expose the
  HotSpot-compatible runtime-visible `IntrinsicCandidate` and `ForceInline`
  marker annotations respectively. `Java9NoopReflection` covers direct calls,
  declared/public reflective lookup and enumeration, exact method and
  annotation metadata, `Method.invoke`, and `Lookup.unreflect` invocation.
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
  zero-divisor exceptions. All six Java 9 and Java 15 signatures are parsed
  public static methods on both bootstrap classes, so direct calls, reflective
  lookup and enumeration, and `Method.invoke` share the same implementation.
- Selected Java 18 `Math.unsignedMultiplyHigh(long, long)` and
  `StrictMath.unsignedMultiplyHigh(long, long)` behavior is covered for
  unsigned high-product results including zero, power-of-two, all-one bit
  patterns, `Long.MIN_VALUE`, and mixed-sign unsigned operands. Both methods
  are also direct and reflection-visible parsed methods.
- Direct and reflective calls to every Java 18 `Math` and `StrictMath`
  `ceilDiv`, `ceilMod`, `divideExact`, `floorDivExact`, and `ceilDivExact`
  overload are supported.
  The Java 18 class-file fixture covers fixed sign combinations, `long`/`int`
  mixed-width overloads, `MIN_VALUE / -1` wrapping for non-exact ceiling
  division, exact-method overflow messages, zero-divisor exceptions, and
  matrix checks for the quotient/remainder identity and `Math`/`StrictMath`
  parity. The 19 parsed public static methods covered through Java 18 on each
  bootstrap class, 38 reflection methods in this fixture, share one
  `DoppioMath` helper with reflection slots and direct calls. The fixture checks lookup,
  declared-method enumeration, modifiers, declaring class,
  parameter/return/exception metadata, invocation, and wrapped exact and
  absolute-value overflow failures. Its complete output matches Temurin
  21.0.11.
- Selected Java 18 UTF-8 default charset expectations are covered for
  `file.encoding`, `Charset.defaultCharset()`, default `String` byte
  decoding/encoding, and default `InputStreamReader`/`OutputStreamWriter` byte
  conversion.
- Java 18 `Duration.isPositive()` is an ordinary parsed method on the retained
  Java 8 class. Genuine javac 21 and 25 fixtures compare direct calls,
  reflection, and unreflected handles with their matching native JDKs across
  zero, nanosecond sign boundaries, and extreme seconds. This is a selected
  `java.time` API slice, not a complete time-library compatibility claim.
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
- All four Java 21 `Math.clamp` and `StrictMath.clamp` overloads are direct and
  reflection-visible parsed methods. The major-65 fixture covers saturating
  `long`-to-`int` conversion, integer and long extrema, float/double NaN and
  infinities, signed-zero ordering and bit preservation, equal bounds, invalid
  bound messages, exact reflection metadata and enumeration, wrapped
  reflection failures, and `MethodHandles.Lookup.unreflect` invocation. The
  complete output matches Temurin 21.0.11. These eight methods extend the
  shared parsed `DoppioMath` surface to 23 methods per bootstrap class and 46
  reflection methods in total.
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
- Java 21 `StringBuilder.repeat(int, int)` / `repeat(CharSequence, int)` and
  the corresponding `StringBuffer` methods are parsed bootstrap methods,
  including the two `AbstractStringBuilder` base methods and four covariant
  bridges. The focused major-65 fixture covers receiver identity, BMP and
  supplementary code points, isolated surrogates, null/empty/custom/self
  sequences, zero-count short-circuiting, negative-count validation order,
  length overflow, cached string refresh, reflection enumeration and wrapped
  failures, and `MethodHandles.Lookup.unreflect` calls. `StringBuffer` concrete
  methods hold the receiver monitor throughout the operation; its bridges
  delegate through those synchronized methods. The same fixture is compiled
  with Java 17 against the runtime's transformed bootstrap signatures for CI.
  Its expected output was verified against native Corretto 25.0.3 and Doppio
  executions of the same fixture compiled using `--release 21`; CI does not
  require that newer host JDK. This is a targeted Java 21 API claim, not full Java 21 or
  Java 25 compatibility. Semantics follow the
  [Java 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html#repeat(int,int)).
- Java 21 `String.indexOf(int, int, int)` and
  `String.indexOf(String, int, int)` are parsed bootstrap methods. Searches
  stay within the inclusive-start/exclusive-end UTF-16 range and return
  absolute indices without constructing a substring. Coverage includes empty
  needles and ranges, overlapping matches, BMP and supplementary characters,
  isolated surrogates, matches crossing the end boundary, invalid code points,
  invalid bounds, null-before-bounds validation for string needles, reflection
  enumeration/invocation, and `findVirtual`/unreflected method handles. The
  major-65 fixture is compiled on Java 17 against the transformed runtime
  signatures for CI. Its eight test groups include 2,268 small-input range
  comparisons. Expected output was verified against native Corretto 25.0.3
  using genuine `--release 21` classes and the same classes on Doppio;
  CI does not require that newer JDK. This is a targeted API claim, not full
  Java 21 compatibility. See the
  [Java 21 String API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#indexOf(java.lang.String,int,int)).
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
- Selected Java 15 `CharSequence.isEmpty()` behavior is covered for `String`,
  `StringBuilder`, and custom `CharSequence` implementations while preserving
  default `chars()` and `codePoints()` behavior.
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

- Java 21 `String.splitWithDelimiters(String, int)` and
  `Pattern.splitWithDelimiters(CharSequence, int)` are parsed bootstrap methods
  sharing a delimiter-preserving split implementation. The major-65 fixture
  covers positive match limits, zero/negative limits, trailing empty tokens and
  delimiters, leading zero-width matches, capture groups, Unicode delimiters,
  pattern flags, custom and mutable `CharSequence` inputs, validation failures,
  reflection metadata and wrapped exceptions, and unreflected method handles.
  Matching uses the original sequence; tokens and delimiters are copied from
  its subsequences, without an eager `toString()` conversion. The CI fixture
  is built with Java 17 against the transformed runtime signatures. Expected
  results were verified against native Corretto 25.0.3 and Doppio executions
  of genuine `--release 21` output; CI does not require that newer JDK.
  The underlying Java 8-era regex engine is retained;
  this does not claim every Java 21 regex syntax or matching-rule change, or
  support for concurrent mutation of an input sequence. See the
  [Java 21 Pattern API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html#splitWithDelimiters(java.lang.CharSequence,int)).
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
  position, empty input, iterator exhaustion, spliterator metadata, and stream
  close propagation to the backing scanner.
- `java.util.Scanner` now exposes selected Java 9 `findAll(Pattern)` and
  `findAll(String)` behavior through lazy `MatchResult` streams. Coverage
  includes capture groups, string-pattern compilation, continuation from the
  current scanner position, empty result streams, null validation,
  spliterator metadata, iterator exhaustion, and stream close propagation to
  the backing scanner.
- `java.util.Scanner` now exposes selected Java 10 charset constructors for
  `InputStream`, `File`, `Path`, and `ReadableByteChannel` targets. Coverage
  includes decoded token output and null charset/source behavior.
- Broader Java 9+ regex additions beyond the tested scanner and matcher stream
  helpers are not implemented yet.

## Known Stream Pipeline Gaps

- `java.util.stream.Stream`, `IntStream`, `LongStream`, and `DoubleStream` are
  patched as interface shims that preserve the Java 8 abstract stream surface
  and add tested Java 9 helpers: `Stream.ofNullable`, three-arg object and
  primitive `iterate` including lazy predicate/next invocation boundaries and
  repeated `Iterator.hasNext()` caching, ordered sequential object and
  primitive `takeWhile` and `dropWhile` including `limit(0)` short-circuiting,
  close propagation from the derived stream, `concat` close
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
  delivery, bounded `offer` drop callbacks and negative drop result, invalid
  request cancellation, selected maximum-lag and minimum-demand estimates,
  `consume` future completion paths, normal/exceptional close, late subscribers,
  callback exception handling, and selected validation.
- `CompletableFuture.failedFuture(Throwable)`, `completedStage(value)`,
  `failedStage(Throwable)`, `completeAsync(Supplier)`,
  `completeAsync(Supplier, Executor)`, `delayedExecutor(...)`, `orTimeout`,
  `completeOnTimeout`, `copy()`, `minimalCompletionStage()`, and
  `newIncompleteFuture()` are minimal Java 9 shims covering normal and
  exceptional completion metadata, fresh incomplete future creation, supplied
  and common-pool async completion, already-completed no-op completion,
  supplier failure/rejected-executor behavior, delayed executor completion,
  delayed executor null/throwing command failure isolation, timeout exceptional
  completion, timeout fallback completion, negative-delay immediate behavior,
  pending-source completion relay, `exceptionally` recovery,
  `get()`/`join()` failure wrapping, `toCompletableFuture()` copies for minimal
  stages, selected `MinimalStage` unsupported direct methods including
  timeout/async-completion mutators and dependent-count queries, and null
  validation.
  `defaultExecutor()` returns the tested common-pool executor and executes a
  submitted task off the caller thread. Selected subclass hooks now cover
  subclass methodrefs plus `newIncompleteFuture()` result construction and
  `defaultExecutor()` scheduling for `copy()`, `completeAsync(...)`,
  `exceptionallyAsync(...)`, and `exceptionallyComposeAsync(...)`.
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
- `java.io.ObjectInputStream` and `ObjectOutputStream` now expose tested
  primitive `float[]`/`double[]` array serialization round-trips through their
  bulk byte-conversion natives.
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
  `readAllBytes`, `readAllLines`, `lines`, provider-backed lazy `list`,
  provider-backed lazy `walk`/`find` with selected link traversal and close
  behavior, provider-backed `newDirectoryStream` iterator/close behavior,
  lazy filter exceptions, and file-system `PathMatcher` glob handling including
  escaped metacharacters, buffered reader/writer helpers, byte-array and
  line-based `write` including selected validation-order behavior,
  provider-backed `newInputStream`/`newOutputStream` and `newByteChannel`
  behavior including selected write/create/truncate/append/sync/no-follow/
  delete-on-close and parent-target paths, provider-backed `createFile`,
  `createDirectory`, recursive `createDirectories`, `createLink`,
  `createSymbolicLink`, `delete`, and `deleteIfExists`,
  including non-empty-directory
  failure behavior, basic
  existence/type/hidden/symlink/access queries, including permission-aware
  default-provider `checkAccess` read/write/execute modes for POSIX owner-only
  permissions and missing paths, `size`, selected
  `getFileStore` metadata/space/attribute-view behavior, including
  total/usable/unallocated space fields and `getBlockSize()`, selected
  `BasicFileAttributes` `readAttributes`, selected `BasicFileAttributeView`,
  `NOFOLLOW_LINKS` symlink attribute queries including dangling links,
  selected owner lookup/setter behavior, selected `FileOwnerAttributeView`
  lookup/setter behavior, selected owner string-attribute lookup/setter
  behavior, selected owner POSIX permission get/set behavior, selected
  `PosixFileAttributes` and
  `PosixFileAttributeView` behavior, selected POSIX string-attribute lookup,
  read, and setter behavior. Non-default `getFileAttributeView` requests reach
  their owning provider before default-file-system link-option validation, so
  ZIP retains its provider-defined acceptance of null option arrays and
  elements. The shim also covers selected `getAttribute`,
  string-based `readAttributes`, `setAttribute`, and extension-based
  `probeContentType`, input helper parent-target validation, timestamp get/set helpers,
  `isSameFile`, selected hard-link and symbolic-link helpers, and basic
  `createFile`/`createDirectory`/`createDirectories` paths including
  single-level and recursive parent-file failure behavior plus selected initial
  `posix:permissions` `FileAttribute` handling for file, directory, temp, and
  channel creation. `writeString`
  covers null-charset validation before `CharSequence.toString()`. The tested copy
  surface covers path-to-path file and directory sources, same-file no-op,
  input-to-path, and path-to-output streams, `REPLACE_EXISTING`,
  path-copy missing-parent/parent-file target validation,
  stream-copy replacement of empty directory targets, stream-copy
  non-empty-directory/missing-parent/parent-file target validation,
  path-copy `COPY_ATTRIBUTES` `lastModifiedTime` preservation for selected
  file, replacement, and directory copies, `NOFOLLOW_LINKS` symlink-object
  copying including dangling links, and unsupported stream-copy option
  rejection. Same-provider copy/move delegation, null option-array pass-through,
  foreign-provider stream-close suppression, and attribute-failure rollback
  are protected by `Java11FilesProviderMutations`. The tested move
  surface covers plain-file and directory basic movement, target-parent
  validation, same-file no-op, existing target
  rejection/replacement including selected directory targets, missing-source failure, `NOFOLLOW_LINKS`/`ATOMIC_MOVE`
  option acceptance for plain files, and `COPY_ATTRIBUTES` rejection. CLI tests
  do not claim filesystem-wide atomicity; the browser smoke does verify that a
  cross-mount `ATOMIC_MOVE` is rejected instead of degraded to copy/delete.
  The tested output option surface includes append, create-new, `WRITE`
  overwrite-without-truncate behavior, `READ` rejection for output helpers,
  selected output parent-target validation, selected `SYNC`/`DSYNC`/`SPARSE` acceptance, `DELETE_ON_CLOSE` immediate
  path deletion for input and output streams, missing-file failure for
  `DELETE_ON_CLOSE` without creation, and `WRITE`/`APPEND` rejection for input
  helpers.
- Broader Java 11+ NIO file APIs, exact provider discovery edge cases,
  remaining attribute/view/link APIs, directory walking and glob edge cases,
  broader stream helpers, and new default method behavior beyond the tested
  factories are not implemented. The Unix dispatcher still reports no
  `openat` capability, so the provider intentionally exposes an ordinary
  `DirectoryStream`; unimplemented `SecureDirectoryStream` descriptor-relative
  operations are not claimed.

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

- The retained constant-library shims now have a separate [selected C6 execution
  gate](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c6-verified-batch-exit): 64 original-javac 21/25
  cases in four 16-case type, handle, dynamic and VarHandle groups. All 24
  native/Node/Chromium cells and 384 mandatory outcomes pass. Earlier Java 12/17
  descriptor, boolean/null, explicitCast/getStaticFinal and invoke smokes remain
  retained evidence, not exhaustive API contracts.
- Selected ClassDesc factories, metadata/ranks and caller-Lookup access;
  MethodTypeDesc factories, immutable transformations and covariant/erased
  resolution; eleven direct-handle kinds and selected constructor, field,
  static/virtual/special/interface/asType execution; and actual Constable
  round trips are covered. Class-mirror field requests bind captured runtime
  class/member/loader identity rather than just a descriptor name; legacy
  String-descriptor requests have no supplied Class identity to compare.
  Hidden classes/components and
  selected non-direct/bound handles remain non-nominal, not discoverable names.
- DynamicConstantDesc adds a genuine user-bootstrap fallback with the supplied
  Lookup/name/type, ordered nested arguments, wide variable arity, null/results,
  repeated uncached API calls and selected Error/cause identities. Existing
  ConstantBootstraps special fast paths remain; this is not a wholesale
  rewrite or arbitrary-bootstrap proof. C4 CP-entry caching/result conversion
  is separate. One erased result mismatch is pinned-native API characterization,
  not a general nominal or CP-ldc type-conversion contract.
- The genuinely compiled nested VarHandle.VarHandleDesc resolves executable
  instance/static/array handles through the supplied Lookup and C3 factories.
  Wide/reference storage, selected access/type/staticness/final errors,
  describeConstable/canonical round trips, passive resolution, exact/loose
  invocation-behavior view identity and held hidden capabilities are checked.
  Public metadata alone
  does not establish C3 execution or D's memory-order/concurrency requirements.
- Complete factory/signature/error/conversion/access/loader families, all
  ConstantDescs canonicalization, arbitrary user/built-in bootstrap shapes,
  nominal/ldc interoperation, maximal arity, named modules, hidden-class GC and
  full LIB-007/source-unit/API conformance remain unclaimed. The matrix has
  explicit canonical-initialization preconditions and excludes pinned 21/25
  empty-method-descriptor/missing-member-type category differences; errors are
  not whitelisted or normalized. Original companion Code evidence is not
  opaque static reachability or dynamic branch coverage. See the
  [invoke design](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/design/java-lang-invoke.md#c6-nominal-descriptor-resolution)
  and [Phase C boundaries](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c6-selected-nominal-constants).

## Known Class-File API Gaps

- [C7a's selected public pipeline](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c7a-verified-batch-exit)
  verifies 32 original-javac 25 cases in 12 native Java 25/Node/Chromium cells
  and 96 mandatory outcomes. This is an actual Java class library, not the
  VM-internal parser or a test decoder. The final API exists since Java 24;
  Java 21 is non-applicable, not skipped or counted as passing. Java 24 native
  execution is not claimed.
- Immutable parse/model and pool metadata, selected executable build and
  transform outputs, callback forwarding/exception barriers and selected
  byte/model verification errors are covered. The pure-Java verifier does not
  define/initialize classes to produce its verdict; typed-invalid output is
  retained but never defined. Shared-pool raw copies require exact source
  identity; selected rebuilt Code rebinds offsets and regenerates frames.
- [C7b's selected expansion](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c7b-verified-batch-exit)
  verifies another 16 original-javac25 cases/six cells/48 outcomes: labels,
  integer/reference predicates, loops, switch padding/defaults, ordered handlers,
  typed StackMapTable parsing and default/forced frame regeneration. LONG stack
  and wide DOUBLE local joins plus branchful insertion/identity transforms are
  covered. Declared frames govern downstream checks, not just inferred states.
  DROP outputs lacking required frames remain invalid and are never defined.
- [C7c's selected expansion](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c7c-verified-batch-exit)
  verifies 24 more original Java25 cases/nine cells/72 outcomes: typed extended
  attributes, genuine custom reader/writer callbacks, CP17/18/bootstrap models
  and actual NEW_POOL semantic remapping. LDC width, branch/switch/frame offsets
  and bootstrap indexes really change; each host independently creates and
  defines/invokes 22 valid arrays. Raw Signature text is supported, not signature
  trees. Built-in attribute names take precedence over custom lookup.
- Short branch overflow, duplicate table keys and empty/reversed handler ranges
  reject explicitly rather than implementing native widening/default repair.
  Arbitrary hierarchy, protected constructor invokes, dead-code rewriting and
  general frame/allocation lattices remain unsupported. C7d retains hierarchy/
  resolvers, general verification and remaining ABI/reflective topology.
  NEW_POOL now remaps selected bound members/Code/attributes/bootstrap graphs;
  retained opaque CP/label payloads and unselected bound local-variable debug
  tables reject explicitly. Native supports those debug tables; this is a
  selected boundary, not full native remapping parity. Mapper cross-model/
  reentrant traversal, arbitrary LABELS codecs and signature trees remain open.
  Forced generation is now supported for the selected C7b pipeline, superseding
  C7a's historical pre-callback unsupported boundary.
- `ConstantInstruction.ofIntrinsic`/`ofArgument` and their nested public types,
  full sealed/non-sealed reflection, all attributes/opcodes/versions and complete
  API/source-unit conformance remain open. Legal selected instruction encodings
  are compared, not byte-for-byte native pool/class parity or general callback
  data flow. C7a–C7c together pass 72 cases/27 cells/216 outcomes on the C7c
  implementation; this does not complete the public API. See the
  [C7c boundaries](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c7c-selected-attributes-bootstrap-models-and-fresh-pools).

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
  pid, equality remains limited to the shim handle implementation rather than
  arbitrary same-pid `ProcessHandle` implementations, `compareTo` is
  implemented as pid ordering for those stable handles with native-style
  rejection of unrelated implementations, and `allProcesses()` exposes the
  current handle plus the host parent handle when the parent pid is available.
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

## Known JVM Management Gaps

- `java.lang.management.ManagementFactory` now covers selected runtime,
  class-loading, thread, memory, and operating-system metadata through the legacy
  `sun.management` shims: management spec version/name availability, immutable
  cached input arguments, class count invariants, verbose class/GC flags,
  live/peak/started/daemon thread count invariants, CPU-time enablement,
  current-thread CPU/user time, synthetic compilation bean metadata/time,
  memory verbose no-op behavior, synthetic heap/non-heap `MemoryUsage`
  values with stable field invariants, empty memory pool/manager/garbage
  collector list shims, synthetic OS name/architecture/version,
  processor-count, object-name, unsupported load-average metadata, selected
  `com.sun.management.OperatingSystemMXBean` unsupported `-1`/load fallback
  getters, and zero-valued HotSpot safepoint/class-loading/internal-thread
  diagnostic counters.
- The shim intentionally reports synthetic in-VM counts and empty VM input
  arguments. Detailed `ThreadInfo`, non-empty memory pool/manager metadata,
  exact host OS and memory accounting, detailed HotSpot compilation counters,
  real safepoint/class-size counters, and host JVM diagnostic data are not
  implemented.

## Known InstantSource Gaps

- `java.time.InstantSource` is a Java 17 class-library shim layered over the
  Java 8 `Clock`, `Instant`, `Duration`, and `ZoneId` runtime types.
- The covered surface is the tested `system`, `fixed`, `offset`, `tick`,
  `instant`, `millis`, and `withZone` behavior, including zero-duration
  identity for fixed sources, custom-source wrapping, tick truncation, and
  null/invalid-duration validation, plus selected fixed/offset/tick/system
  `toString`, equality, and hash-code behavior including wrapper-to-wrapper and
  wrapper-to-raw-`Clock` comparisons for fixed clocks.
- Exact OpenJDK implementation class names, serialization details, and
  exhaustive raw `Clock` equality compatibility are not claimed yet.

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
  zero-valued default `nextGaussian()` and `nextExponential()` samples,
  null-byte-array rejection, and sized
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
  path for compiler-generated field component handles. It covers generated
  record `toString`, primitive equality/hash behavior, and reference-component
  `equals`/`hashCode`/`toString` dispatch, including original component exceptions
  and deferred Float/Double conversion. It is not a general
  `java.lang.runtime.ObjectMethods` implementation.
- `java.lang.Class.isRecord()` is a parsed public, non-native Java 16 method,
  so direct calls, reflective lookup and enumeration, `Method.invoke`, and
  `Lookup.unreflect` share one implementation with native-compatible empty
  annotation metadata. Coverage includes non-empty, empty, and local records
  plus ordinary, enum, JDK, primitive, void, and array classes.
- `Class.getRecordComponents()` and a minimal
  `java.lang.reflect.RecordComponent` shim cover component name, raw type and
  signature, lazy generic repositories scoped to the declaring record, nested
  type-use annotations and owners, runtime-visible declaration annotations,
  accessor, declaring record, null for non-record classes, empty record arrays
  and array cloning. The [B6 selected corpus](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-b-loading.md#b6-selected-records)
  compares generic/type-annotation trees with ordinary fields and checks exact
  lazy missing-type, evolved-arity and malformed-signature errors. Its 77 cases
  pass on pinned 21/25 native, Node and Chromium, with unchanged original
  regressions; this does not establish every generic-reflection or record
  contract. See [the reflection design](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/design/record-reflection.md).

## Known Sealed-Class Gaps

- `java.lang.Class.isSealed()` and `getPermittedSubclasses()` are parsed public,
  non-native Java 17 methods, so direct calls, reflective lookup and
  enumeration, `Method.invoke`, and `Lookup.unreflect` share one
  implementation. The permitted-subclass method exposes its native-compatible
  `Class<?>[]` generic return and `CallerSensitive` metadata. Coverage includes
  sealed interfaces, final permitted classes, ordinary classes, selected JDK
  classes, primitives, void, arrays, fresh arrays and mutation isolation.
  Array order is not a general specification guarantee.
- The [B7 selected corpus](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-b-loading.md#b7-selected-sealed-types) adds
  62 genuine/mutated cases on pinned 21/25 native, Node and Chromium. Direct
  superclass/interface checks bind actual defining-loader and runtime-package
  identities and reject prohibited derivation with exact
  `IncompatibleClassChangeError`. Public cross-package children in the same
  unnamed module are accepted; named-module runtime checks remain unclaimed.
- Permitted metadata uses the declaring owner's original constant-pool
  references without preparation or initialization. It filters by actual direct
  parent identity, omits ordinary loading failures, propagates the original
  bootstrap VirtualMachineError, and retains constant-pool success/failure
  caching. A native return cannot consume a pending internal exception boundary.
  The selected malformed-attribute, old-major, duplicate/array and passive
  verification cases do not establish every class-file or reflection contract;
  all JVM-007 source units remain unassessed.

## Final-Language Evidence Boundaries

The [B8 selected corpus](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-b-loading.md#b8-selected-final-language) adds
58 fixed final-language and actual-startup cases. At clean `f8d41537b`, all 21
applicable pinned Java 21/25 native/Node/Chromium cells and the separate retained
language, existing launcher and evolved-switch gates pass. B1–B7 host gates and
the original 323 retained fixtures also pass unchanged. Independent decoded
bootstrap and startup declaration evidence is not full language, compiler,
bootstrap, branch or initialization conformance. All 112 JVM-008 source units
remain unassessed and dependency clauses retain their actual owners. Preview
source forms, hosted modern javac, arbitrary bootstrap behavior, named-module
runtime access and broader scheduler/memory-model support remain separate work.

## Method-Handle Evidence Boundaries

[Phase C C1](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c1-verified-batch-exit) adds selected
Lookup/direct-handle, invocation/adaptation and combinator exception-order
evidence. At clean `a99d5f74f`, all 60 cases pass across 24 pinned Java 21/25
native/Node/Chromium cells (360 outcomes), using genuine, unchanged javac
outputs and independently decoded symbolic call descriptors. The modern
left-to-right `filterArguments` path preserves stock single-filter validation
and the public method's metadata; its failure-order regression expectations
were not relaxed.

The strict builds, 853 unit/contract tests, all B1–B8 and separate retained
language/launcher/evolved-switch host gates, original 323 fixtures and selected
Kotlin/Scala MethodHandle compiler smokes also pass at that implementation
commit. One existing optional unit diagnostic is skipped; no required C1
execution is skipped. Consumer compiler smokes use Node/native Java 17 and do
not replace the genuine 21/25 C1 host matrix.

[C2's selected matrix](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c2-verified-batch-exit) adds 48
array-adapter, variable-arity/routing and control-flow cases. At clean
`be7cb5dc2`, all 18 pinned Java 21/25 native/Node/Chromium cells and 288 outcomes
pass with the original expectations. The runtime adds parsed `withVarargs`
mode switching, corrects only the positive-length null-spread exception path,
and matches pinned counted-range initialization order. The three counted-range
order-sensitive cases remain native-regression evidence because the API body
pseudocode and API Note disagree.

A fresh C1 full-host run, strict builds, 875 unit/contract tests, all 15
batch-boundary regression gates, the original unchanged 323 fixtures and the
selected Kotlin/Scala MethodHandle compiler smokes also pass at that frozen
implementation. One existing optional unit diagnostic is skipped; no required
C1/C2 execution is skipped. The overlay verifier independently checks all
1,460 Code bodies in its 37-class inventory; the compiler-only bootstrap
artifact has a separate, exact 41-class inventory.

[C3's selected matrix](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c3-verified-batch-exit) adds 48
field/static, array and interoperation cases. At clean `15bbeab5b`, all 18
pinned Java 21/25 native/Node/Chromium cells and 288 outcomes pass. Original
javac bytes prove 186 case-linked Code probes and all 31 access-mode names;
single-thread ordered-mode values are not a memory-order/concurrency proof.
Field capabilities retain actual declarations and caller Lookup authorization;
mode invocation uses caller-typed MethodHandle linkage and synchronous typed
storage updates. Exact/default views, bound handles and selected invokers are
verified without rewriting the broader retained getter/Unsafe paths.

Fresh C1/C2 gates (360/288 outcomes), strict builds, 982 unit/contract tests,
all 15 batch-boundary host gates, the original unchanged 323 fixtures and the
selected Kotlin/Scala compiler smokes pass at that same implementation. One
existing optional unit diagnostic is skipped; no mandatory execution skips.
All 1,467 Code methods in the 37-class overlay inventory pass verification,
with 1,344 stock Code attributes and historical generated-body identities
unchanged. The compiler-only bootstrap artifact retains 41 exact classes.

Factory/query initialization timing and `Method.invoke` placeholders remain
outside the selected C3 claim. The negative reflection case covers only fixed
unreflected erased handles; mixed unsupported/type priority is explicitly
pinned-native evidence. View/buffer/off-heap handles, fences, arbitrary NaN
payloads, maximal arities and complete module/loader/access lattices are not
established. At that C3 exit the full conversion/combinator/VarHandle API,
memory ordering, general bootstrap, hidden definitions, named modules and
public class-file API remained unclaimed. The later selected C4/C5 exits below
do not complete any full owner/API matrix; source units remain unassessed.

## User Bootstrap And Hidden-Class Evidence

[C4's selected matrix](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c4-verified-batch-exit) adds 48 user
dynamic-constant, invokedynamic and error cases. At frozen `8d38c63e2`, all 18
pinned Java 21/25 native/Node/Chromium cells and 288 outcomes pass. Six directly
generated original 65/69 instruction classes plus 18 untouched javac artifacts
are bound to actual BootstrapMethods operands and 200 case-linked Code probes.
Shared support outputs repeat across directories, so this is not 24 distinct
binary names. Resolution retains caller Lookup, ordered nested arguments,
selected adaptation, exact lexical-site identities and single-thread mutable/
volatile target updates. Existing compiler-generated fast paths are retained.

Native unwrapped-Error retry policy and repeated bootstrap wrapper/cause-object
identity are explicitly outside the comparison matrix. Runtime units separately
check specified Error caching. Concurrent linkage, maximal arity and cross-thread
visibility are not established by these selected value/error traces.

[C5's independent matrix](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c5-verified-batch-exit) adds 48
definition, identity and class-data cases; all 18 original-javac Java 21/25
native/Node/Chromium cells and 288 outcomes pass at the same implementation.
The six compilations retain 26 class-file artifacts, 234 case-linked Code probes
and separate raw proofs for 14 payload artifacts/all 34 payload Code methods.
Only runtime this_class identity is rebound; ordinary self-type descriptors
remain unchanged and continue through the genuine verifier.

Full-privilege definition, ORIGINAL class-data authority, passive/eager
initialization, repeated identity isolation, NESTMATE/STRONG, hidden arrays and
non-discovery are selected. Hidden-final write guards preserve ordinary stock
paths and deny accessible private-alias reflection/MethodHandle bypasses.
`classDataAt` bounds use the specified IndexOutOfBoundsException family rather
than demanding a concrete exception subtype chosen by the retained List.
Generated name suffix values, GC/unloading, arbitrary raw InnerClasses reflection fidelity,
mixed-invalid-input priority, SecurityManager and named modules remain unclaimed.

At that historical C4/C5 exit, the compiler-facing projection has 43 exact
class-only entries, including the genuinely compiled ClassOption enum.
The independent stock-overlay verifier
checks 1,525 Code methods across 38 selected stock classes: 138 generated/
rewritten and 1,387 byte-identical stock bodies, with eleven intact C5 aliases
and historical hashes/branch frames preserved. These are metadata inventory
counts, not passing semantic cases. See the batch exit for fresh C1–C3,
B1–B8, original 323-fixture and selected compiler-consumer verification.

## Selected C6 nominal constants and refreshed boundaries

[C6's independent matrix](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c6-verified-batch-exit) verifies
64 selected original-javac nominal type, handle, dynamic and VarHandle cases at
clean implementation `0aa573593`. All 24 native/Node/Chromium Java 21/25 cells
and 384 mandatory outcomes pass. The eight compilations retain 42 class-file
artifacts and 248 case-linked Code probes, with separate original payload,
resource and selected opaque companion proofs. Original-byte inventory is not
an assertion of opaque static reachability, branch coverage or full LIB-007.

Covariant/erased API bridges, supplied-Lookup resolution, actual runtime
member/type identities, executable wide invocation/storage and selected
Constable/canonical round trips are checked. API bootstrap reinvocation remains
uncached and separate from C4 CP linkage. Hidden MethodType descriptor syntax
is retained without inventing nominal hidden types; native category exclusions
and canonical-initialization preconditions are explicit in the batch exit.

At that C6 exit, the compiler JAR had 44 exact class-only entries (43 changed
stock classes plus the genuinely compiled ClassOption enum), with deterministic
SHA-256 `caa9598e266120414c393b6b03a1158988fe42d12a626a1482685f3d33434daa`.
The independent verifier inventories 39 stock classes and 1,601 Code bodies:
141 generated/rewritten and 1,460 retained, with C5/MethodType original-Code
aliases and historical body hashes/frames intact. These metadata inventories
are separate from semantic case/artifact counts.

Fresh C1–C6 gates pass 316 selected cases, 120 cells and 1,896 outcomes at the
same frozen implementation/runtime. Strict builds, 1,200 passing unit/contract
tests plus one existing optional diagnostic skip (1,201 total, zero failures),
all 15 B-boundary
gates and the unchanged original 323 fixtures pass. Selected lock-verified
Kotlin 2.4.0/Scala 2.13.18 MethodHandle compiler smokes pass in Doppio and match
native Java 17 on Node (544/387 seconds). The initial unchanged-limit Kotlin
timeout is retained; its isolated same-source/input/limit rerun passes without
a waiver or a proven particular cause. String cache/identity, Chromium compiler
support and full language conformance are not inferred.

The final fail-closed local verification receipt has exit code 0 and SHA-256
`e153c8877c69d0eb5b36df7e03366a177794ff20f587d79110146a9c71a0e484`;
the batch exit records its path and independent ledger,
runtime and unchanged-input hashes. No C6 Pro review was produced: consultation
failed at the model-picker UI before chat creation.

At that historical C6 exit, C7's public class-file library was next. Full
Phase C/LIB-007/JVM-003/004/005/source-unit/API conformance, maximal arity, memory ordering,
concurrency, named modules and hidden-class GC remain open; all broader flags
stay false.

## Selected C7a public class-file pipeline and refreshed boundaries

[C7a's independent exit](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c7a-verified-batch-exit) verifies
32 selected public parse/model, branch-free build, transform and typed-verify
cases at clean implementation `bed25a30e`. All 12 native Java 25/Node/Chromium
cells and 96 outcomes pass. Four original compilations retain 11 artifacts,
28 named callback Code proofs and 16 returned-array routes; all three hosts
independently produce 16 output artifacts each. Invalid verification output is
never defined. Java 21 is non-applicable; full public API/ABI is not established.

Fresh C1–C7a gates pass 348 selected cases, 132 cells and 1,992 outcomes at the
same frozen runtime. Strict builds/checks, 1,262 passing units plus one existing
optional diagnostic skip (1,263 total) and all 15 B-boundary commands pass.
The original 323-fixture producer retains 307 passes and 16 timeouts; exact
16-case replay passes with byte-identical full323 input snapshots and unchanged
workers/limits. This combines old and new evidence, not a full323 rerun or a
successful relabeling of the initial producer. All 969 original fixture files
remain byte-identical to C6. Initial native compiler SIGKILL, C6/Scala timeouts
and the incomplete first compiler-consumer attempt remain recorded without a
proven particular cause.

Lock-verified Kotlin 2.4.0 and Scala 2.13.18 MethodHandle compiler smokes pass in
Doppio and match native Java 17 on Node (321/327 seconds). The deterministic
44-class-only compiler JAR and independent 39-class/1,601-Code stock verifier
retain the C6 hashes, aliases and branch
frames. Native Java 17/Node compiler smokes are not Chromium or full-language
conformance evidence.

The final fail-closed local receipt has exit code 0 and SHA-256
`b0cab6dc56016eb08c435f2b4202829abdf23b90451126aa946575323080ff59`;
the batch exit records its path, runtime and individual ledger/input hashes.
No C7a Pro review was produced: consultation failed before
chat creation. At that historical C7a exit, C7b–C7d were the follow-ups.
The [C7b selected exit](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c7b-verified-batch-exit) added
16 cases/six cells/48 outcomes and rechecks the unchanged 32 C7a cases on
`2e7cbf57b`. The [C7c selected exit](https://github.com/seo-rii/doppio/blob/27c73672b7e4c2bd1cd06e2462844f6b44071ebe/docs/phase-c-invocation.md#c7c-verified-batch-exit)
adds 24 cases/nine cells/72 outcomes and rechecks both unchanged public-library
gates at `21439e0d7`: 72 cases/27 cells/216 outcomes. Strict builds, 1,357
passing units (one existing optional skip), full workflow guards and the
unchanged compiler JAR also pass. A transient JAR-regeneration input-guard
failure is preserved; the identical-runtime full-gate rerun passes. C1–C6
host gates, retained323 and compiler consumers were not rerun in this turn.
C7d, unselected attributes/debug/mapper families, wider CFG/frame families and full
Phase C/LIB-007/JVM/API/source-unit, module, memory-order/concurrency and GC
contracts remain open; all broader flags stay false.
