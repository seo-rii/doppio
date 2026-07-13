# Runtime Reflection Overlay Design Notes

Modern Java support currently uses three different mechanisms for APIs that are
absent from the Java 8-era bootstrap class files:

- direct-call overlays in `ConstantPool.ts`, which let bytecode call a modern
  method that is absent from the loaded classfile;
- class-library shim classes in `classes/modern_classlib`, which provide real
  Java classes such as `java.lang.Runtime$Version`;
- parsed classfile overlays in `ClassLoader.ts`, currently used to make
  `java.lang.Runtime.version()` and modern `Math`/`StrictMath` helpers real
  methods before their Java 8 bootstrap classfiles are parsed.

Direct-call overlays are not the same as public reflection support. A method can be
callable from bytecode and still be absent from `Class.getMethod` or
`Class.getDeclaredMethods0`, because the reflection native reads the
`ClassData.getMethods()` table built from the loaded class file. Adding synthetic
methods to that table changes what compilers and libraries discover at startup,
so it needs a separate design and test gate.

## Triggering Case

`Runtime.version()` was first implemented only for direct bytecode calls and
returned a cached baseline `Runtime.Version` object. The tested Java fixtures
covered `Runtime.Version.parse(...)` and the Java 10 accessors. However, exposing
`Runtime.version()` through a naive synthetic `Method` in `ClassData.getMethods()`
made Doppio-hosted Kotlin compiler runs switch into a different Java 9+ runtime
probe path. Local validation on 2026-07-11 did not complete within 540 seconds,
where the preceding Kotlin modern interop smoke had completed near 294 seconds.

This is useful evidence: reflection visibility for modern APIs is observable to
the compiler, and enabling it can reveal deeper runtime gaps or expensive paths
that direct-call fixtures do not cover.

The retained implementation avoids the hand-built method-table object. The
bootstrap loader injects a real public static bytecode method into the parsed
Java 8 `Runtime` classfile. That method delegates to a package-private
class-library helper which owns the cached version object. A 2026-07-13 local
gate completed Kotlin compiler startup in 38 seconds, the minimal Kotlin
compile-and-run smoke in 116 seconds, Scala compiler startup in 9 seconds, and
the minimal Scala compile-and-run smoke in 58 seconds. All were below their
60/180-second rejection limits.

## Requirements

1. Direct-call overlays must keep working for existing fixtures.
2. Reflection-visible synthetic methods must have native-compatible
   `Method` metadata: declaring class, name, modifiers, return type, parameter
   types, exception types, slot behavior, annotations, and invocation.
3. Reflection overlays must not globally expose Java 9+ methods without a
   compiler-startup gate for Kotlin and Scala.
4. Every reflection overlay needs a narrow Java fixture for `Class.getMethod`,
   `getDeclaredMethods`, and reflective `Method.invoke`.
5. Every overlay used by compiler discovery needs a compiler smoke before the
   method is counted as supported.

## Implementation Shape

The existing `ClassLoader.resources(String)` synthetic method is inserted into
the `ClassData` method table and has a custom reflection object. That pattern is
acceptable for stable, isolated methods, but it does not provide ordinary
parsed-method metadata.

`Runtime.version()` instead uses this specialized first implementation:

- `ClassLoader.ts` adds the method name, descriptor, helper method reference,
  and a four-byte `invokestatic`/`areturn` `Code` attribute to the loaded
  `Runtime.class` bytes before parsing.
- The injected method is public and static, but not native or synthetic, so
  reflection modifiers match Java 17.
- `java.lang.DoppioRuntime` creates one `Runtime$Version.parse("17")` result
  and returns that cached identity to direct and reflective calls.
- The old slot-less constant-pool-only fallback was removed; ordinary method
  resolution, reflection slots, and `Method.invoke` now share the parsed
  method.
- `Java9RuntimeVersionReflection` compares lookup, enumeration, modifiers,
  descriptor metadata, invocation, accessor reflection, and cached identity
  with HotSpot, then converts the reflected method through
  `MethodHandles.Lookup.unreflect` and invokes the resulting handle.

The Java 9 no-op runtime hints use a smaller reusable parsed overlay:

- `ClassLoader.ts` injects an ordinary one-byte `return` method into
  `Thread.class` for `onSpinWait()` and `Reference.class` for
  `reachabilityFence(Object)` before either class is parsed.
- The methods are public and static, with real reflection slots and no native
  or synthetic modifier. The old slot-less constant-pool fallbacks and the
  obsolete `Thread.onSpinWait` native were removed.
- The overlay preserves HotSpot's runtime-visible marker metadata:
  `IntrinsicCandidate` on `Thread.onSpinWait()` and `ForceInline` on
  `Reference.reachabilityFence(Object)`. Minimal matching annotation classes
  live in the modern class library.
- `Java9NoopReflection` compares direct calls, declared/public lookup,
  declared-method enumeration, exact method and annotation metadata,
  `Method.invoke`, and `Lookup.unreflect` invocation with HotSpot.
- The complete compiler gates passed locally on 2026-07-13 in 139 seconds for
  Kotlin 2.4.0 and 77 seconds for Scala 2.13.18.

The Java 11 `Character.toString(int)` overlay follows the same parsed-method
rule while delegating nontrivial string construction:

- `ClassLoader.ts` injects an ordinary public static
  `iload_0`/`invokestatic`/`areturn` method into `Character.class` and removes
  the old slot-less constant-pool fallback.
- The package-private `DoppioCharacter` helper validates the full Unicode code
  point range, preserves HotSpot's exact invalid-code-point messages, and uses
  the existing `Character.toChars` implementation for valid input.
- `Java11CharacterToStringReflection` compares declared/public lookup,
  declared-method enumeration, modifiers, descriptor and empty annotation
  metadata, BMP/supplementary/max results, exact reflected exception causes,
  `Method.invoke`, and `Lookup.unreflect` invocation with HotSpot. The original
  direct-call fixture remains as a separate regression.
- The complete compiler gates passed locally on 2026-07-13 in 97 seconds for
  Kotlin 2.4.0 and 58 seconds for Scala 2.13.18.

The Java 9 `ClassLoader.getPlatformClassLoader()` overlay adds the first
caller-sensitive parsed method:

- `ClassLoader.ts` injects an ordinary public static method that delegates to
  the package-private `DoppioClassLoader` helper. The previous slot-less
  constant-pool fallback was removed, so direct calls, reflection slots, and
  invocation use the same method and cached platform-loader identity.
- The parsed method has the exact runtime-visible
  `jdk.internal.reflect.CallerSensitive` marker used by HotSpot. The matching
  annotation class lives in the modern class library, and the runtime
  annotation parser recognizes both the legacy and modern descriptors.
- Enabling caller-sensitive `Lookup.unreflect` exposed three shared
  `java.lang.invoke` defects. Anonymous classes now inherit the host protection
  domain and are linked before `Unsafe.defineAnonymousClass` returns; an erased
  `invokeExact(Object[])` call site now performs signature-polymorphic
  `MemberName` linkage even when ordinary lookup finds the declared method;
  and caller discovery excludes `LambdaForm.Hidden` frames before counting
  frames.
- `Java9PlatformClassLoaderReflection` compares exact modifiers, descriptor,
  annotation metadata, declared-method enumeration, direct and reflective
  identity, `Method.invoke`, caller-sensitive `Lookup.unreflect`, handle type,
  and the platform/system loader hierarchy with HotSpot. The broader modern
  Java suite and the Kotlin/Scala MethodHandle output comparisons cover the
  shared runtime fixes in both development and optimized release runners.
- The legacy `SecurityManager` caller permission check performed by HotSpot is
  still unsupported. The local compiler-discovery gates passed on 2026-07-13
  in 78 seconds for Kotlin 2.4.0 and 53 seconds for Scala 2.13.18.

The two Java 9 `ClassLoader` defined-package methods add parsed instance
methods:

- `ClassLoader.ts` injects ordinary public final `getDefinedPackage(String)`
  and `getDefinedPackages()` methods. Their bytecode passes the receiver to
  package-private native `DoppioClassLoader` helpers, preserving exact-loader
  package ownership while sharing the existing package-table implementation.
- The previous slot-less constant-pool fallbacks were removed, so direct
  calls, reflection slots, `Method.invoke`, and `Lookup.unreflect` all resolve
  the same parsed methods with non-native, non-synthetic metadata.
- `Java9ClassLoaderPackagesReflection` compares exact modifiers, descriptors,
  annotation and parameter metadata, declared/public lookup and enumeration,
  system and empty-loader package visibility, bootstrap-package exclusion,
  fresh array snapshots, mutation isolation, null exception causes, and exact
  unreflected handle types and invocation with HotSpot. The original direct
  package fixture remains a separate regression.
- The compiler-discovery gates passed locally on 2026-07-13 in 146 seconds for
  Kotlin 2.4.0 and 135 seconds for Scala 2.13.18.

The Java 9 `Class.getPackageName()` overlay is a parsed ordinary method:

- `ClassLoader.ts` injects the exact public, non-native descriptor into the
  Java 8 bootstrap `Class` classfile. Its bytecode passes the receiver to a
  package-private native `DoppioClass` helper that preserves Java 9 primitive,
  void, reference-array, primitive-array, and ordinary package-name behavior.
- The previous slot-less constant-pool fallback and synthetic native-frame
  trampoline were removed, so direct calls, reflection slots,
  `Method.invoke`, and `Lookup.unreflect` resolve the same parsed method with
  empty annotation and generic metadata.
- `Java9ClassPackageNameReflection` compares exact modifiers, descriptors,
  annotation and parameter metadata, declared/public lookup and enumeration,
  direct and reflective results across ordinary, nested, local, anonymous,
  JDK, primitive, void, and array classes, and exact unreflected handle type
  and invocation with HotSpot. The original direct fixture remains a separate
  regression.
- Exercising annotated return metadata exposed the previously missing
  `Executable.getTypeAnnotationBytes0()` native. The implementation now
  returns each parsed method or constructor's raw
  `RuntimeVisibleTypeAnnotations` bytes. `Java9ExecutableTypeAnnotations`
  compares top-level and nested return, receiver, parameter, and throws
  annotations plus constructor parameter/throws annotations and empty
  metadata with HotSpot. Top-level constructor receiver nullability remains a
  separate Java 8 class-library compatibility gap.
- The compiler-discovery gates passed locally on 2026-07-13 in 188 seconds for
  Kotlin 2.4.0 and 241 seconds for Scala 2.13.18.

The Java 12 `Class.descriptorString()` overlay is a parsed ordinary method:

- `ClassLoader.ts` injects the exact public, non-native descriptor into the
  Java 8 bootstrap `Class` classfile. Its bytecode passes the receiver to a
  package-private native `DoppioClass` helper that returns Doppio's canonical
  internal class descriptor for ordinary, primitive, void, and array classes.
- The previous slot-less constant-pool fallback and synthetic native-frame
  trampoline were removed, so direct calls, reflection slots,
  `Method.invoke`, and `Lookup.unreflect` resolve the same parsed method with
  empty annotation and generic metadata.
- `Java12ClassDescriptorStringReflection` compares exact modifiers,
  descriptors, annotation and parameter metadata, declared/public lookup and
  enumeration, direct and reflective results across ordinary, nested, local,
  anonymous, JDK, primitive, void, and array classes, and exact unreflected
  handle type and invocation with HotSpot. The original direct fixture remains
  a separate regression.
- The compiler-discovery gates passed locally on 2026-07-13 in 524 seconds for
  Kotlin 2.4.0 under a heavily contended shared host and 236 seconds for Scala
  2.13.18.

The Java 15 `Class.isHidden()` overlay is also a parsed native method:

- `ClassLoader.ts` injects the exact public native `isHidden()` descriptor and
  its runtime-visible `IntrinsicCandidate` annotation into the Java 8
  bootstrap `Class` classfile before parsing. The native implementation returns
  false because hidden-class definition and discovery are not yet supported.
- The previous slot-less constant-pool fallback and synthetic native-frame
  trampoline were removed, so direct calls, reflection slots,
  `Method.invoke`, and `Lookup.unreflect` all resolve the same parsed method.
- `Java15ClassIsHiddenReflection` compares exact modifiers, descriptors,
  annotation and parameter metadata, declared/public lookup and enumeration,
  direct and reflective results across ordinary, nested, local, anonymous,
  JDK, primitive, void, and array classes, plus exact unreflected handle type
  and invocation with HotSpot. The original direct fixture remains a separate
  regression.
- The compiler-discovery gates passed locally on 2026-07-13 in 455 seconds for
  Kotlin 2.4.0 and 283 seconds for Scala 2.13.18 under a heavily contended
  shared host.

The Java 16 `Class.isRecord()` overlay is a parsed ordinary method:

- `ClassLoader.ts` injects the exact public, non-native `isRecord()` descriptor
  into the Java 8 bootstrap `Class` classfile. Its bytecode passes the receiver
  to the package-private native `DoppioClass` helper, which reads Doppio's
  parsed `Record` classfile metadata.
- The previous slot-less constant-pool fallback and synthetic native-frame
  trampoline were removed, so direct calls, reflection slots,
  `Method.invoke`, and `Lookup.unreflect` all resolve the same parsed method
  with empty annotation metadata.
- `Java16ClassIsRecordReflection` compares exact modifiers, descriptors,
  annotation and parameter metadata, declared/public lookup and enumeration,
  direct and reflective results across non-empty, empty, and local records plus
  ordinary, enum, JDK, primitive, void, and array classes, and exact
  unreflected handle type and true/false invocation with HotSpot. The original
  direct fixture and broader record-component fixture remain separate
  regressions.
- The compiler-discovery gates passed locally on 2026-07-13 in 170 seconds for
  Kotlin 2.4.0 and 97 seconds for Scala 2.13.18.

The Java 17 sealed-class accessors are parsed ordinary methods:

- `ClassLoader.ts` injects public, non-native `isSealed()` and
  `getPermittedSubclasses()` methods. Their bytecode passes the receiver to
  package-private native `DoppioClass` helpers that reuse Doppio's parsed
  `PermittedSubclasses` metadata and asynchronous class resolution.
- The permitted-subclass method carries HotSpot's runtime-visible
  `CallerSensitive` marker and `Class<?>[]` generic method signature. The
  sealed predicate has empty annotation and generic metadata.
- The previous slot-less constant-pool fallbacks and synthetic native-frame
  trampolines were removed, so direct calls, reflection slots,
  `Method.invoke`, and `Lookup.unreflect` resolve the same parsed methods.
- `Java17ClassSealedReflection` compares exact raw and generic method metadata,
  modifiers, annotations, declared/public lookup and enumeration, direct and
  reflective results for sealed and unsealed class kinds, deterministic permit
  order, fresh array snapshots, mutation isolation, and exact unreflected
  handle types and invocation with HotSpot. The original sealed reflection
  fixture remains a separate direct-call regression.
- The compiler-discovery gates passed locally on 2026-07-13 in 540 seconds for
  Kotlin 2.4.0 and 262 seconds for Scala 2.13.18 under a heavily contended
  shared host.

The two Java 9 `System.getLogger` overloads reuse the caller-sensitive path:

- `ClassLoader.ts` injects ordinary public static methods for the name-only and
  `ResourceBundle` descriptors. Both delegate to package-private
  `DoppioSystem`, carry the exact runtime-visible `CallerSensitive` marker, and
  replace the old slot-less constant-pool/native-frame implementations.
- `DoppioSystem` preserves the existing minimal no-op logger behavior and
  tested null validation, with HotSpot's bundle-first check in the two-argument
  path. Full `LoggerFinder` provider lookup,
  caller-module selection, resource-bundle localization, privileged access,
  and `SecurityManager` behavior are not claimed.
- `Java9SystemGetLoggerReflection` compares both overloads with HotSpot through
  declared/public lookup, exact modifiers, parameters, return and annotation
  metadata, declared-method enumeration, direct calls, `Method.invoke`, null
  exception causes, caller-sensitive `Lookup.unreflect`, exact handle types,
  and invocation. The original direct logger fixture remains a separate
  regression.
- The complete compiler-discovery gates passed locally on 2026-07-13 in 127
  seconds for Kotlin 2.4.0 and 56 seconds for Scala 2.13.18.

The modern integer arithmetic family is the first multi-method parsed overlay:

- `ClassLoader.ts` injects 23 methods into each of `Math` and `StrictMath`
  before parsing their Java 8 bootstrap classfiles: the 12 Java 18 `ceilDiv`,
  `ceilMod`, `divideExact`, `floorDivExact`, and `ceilDivExact` overloads;
  Java 9 `multiplyFull`, `multiplyHigh`, `floorDiv(long, int)`, and
  `floorMod(long, int)`; Java 15 `absExact(int/long)`; and Java 18
  `unsignedMultiplyHigh`; plus the four Java 21 integer and floating-point
  `clamp` overloads.
- Each injected method is ordinary public static bytecode, without native or
  synthetic modifiers, and delegates to the package-private `DoppioMath`
  class-library helper. The previous slot-less constant-pool fallback was
  removed so direct resolution, reflection enumeration, slots, and invocation
  use one implementation.
- `Java18Division` verifies all 38 reflection methods through
  `getDeclaredMethod`, `getMethod`, `getDeclaredMethods`, metadata, invocation,
  and exact/absolute-value overflow `InvocationTargetException` causes while
  retaining the direct sign, mixed-width, identity, and exception matrices.
  The complete output matches Temurin 21.0.11.
- `Java21MathClamp` verifies the remaining eight reflection methods, bringing
  the parsed surface to 46 methods across both classes. It covers exact method
  metadata and enumeration, reflective and `Lookup.unreflect` invocation,
  integer saturation and extrema, float/double NaN and infinities, signed zero,
  equal bounds, and native-compatible invalid-bound exception messages. Its
  complete output also matches Temurin 21.0.11.
- The initial 12-method compiler-discovery gates passed locally on 2026-07-13:
  Kotlin 2.4 startup in 50 seconds and minimal compile/run in 168 seconds, plus
  Scala 2.13.18 startup in 20 seconds and minimal compile/run in 185 seconds.
  After expanding to all 19 methods per class and removing the old direct-call
  fallbacks, the complete minimal compile/run gates passed again in 404 seconds
  for Kotlin 2.4.0 and 253 seconds for Scala 2.13.18 under a contended host.
  After adding the four Java 21 `clamp` methods to each class, the same gates
  passed in 170 seconds for Kotlin 2.4.0 and 101 seconds for Scala 2.13.18.

The safer shape is an explicit overlay registry:

- keyed by internal class name and method descriptor;
- able to build the direct-call native body;
- able to build a reflection `Method` object;
- able to opt into or out of `getDeclaredMethods0` enumeration independently;
- annotated in the registry with required fixture names and compiler-smoke
  gates.

The broader registry remains the preferred shape before exposing multiple
unrelated modern methods. It should not replace the tested `Runtime.version()`
path merely to generalize one entry.

## Test Gates

Before enabling a reflection-visible modern method:

- `npm run typecheck`
- `./node_modules/.bin/grunt modern-ci-release-cli --grunt-ignore-compile-errors`
- a Java fixture comparing native JVM and Doppio output for reflective lookup
  and invocation;
- the smallest relevant Kotlin and Scala compiler smokes, with elapsed time
  recorded in the design or compiler bring-up document;
- `npm run ci:check-modern-java-workflow:test`
- `npm run ci:check-modern-java-workflow`

If a compiler smoke times out, revert the reflection exposure and document the
triggering API before trying adjacent coverage. A passing direct-call fixture is
not enough evidence that broad reflection exposure is safe.

## Open Questions

- Should future overlays use parsed classfile methods like `Runtime.version()`
  or registry-built reflection objects when bytecode delegation is impractical?
- Can compiler probes be made deterministic enough to distinguish a true
  semantic gap from broad compile-time variance?
- Which Java 9+ methods are already direct-call overlays but not reflection
  visible, and which of them are actually observed by Kotlin or Scala compiler
  startup?
