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
  metadata with HotSpot.
- The compiler-discovery gates passed locally on 2026-07-13 in 188 seconds for
  Kotlin 2.4.0 and 241 seconds for Scala 2.13.18.

The Java 9 `MethodHandles.Lookup.defineClass(byte[])` overlay is also a parsed
ordinary method, despite delegating its runtime operation to native code:

- `ClassLoader.ts` injects a public instance method with only `ACC_PUBLIC`, a
  real `Code` attribute, generic return signature `Class<?>`, and the declared
  `IllegalAccessException`. The bytecode passes both the lookup receiver and
  byte array to package-private `DoppioMethodHandles.defineClass`.
- Keeping the public method non-native preserves Java 17 reflection flags,
  parameter fallback metadata, generic return structure, annotation surfaces,
  ordinary `Method.invoke`, and `Lookup.unreflect` behavior.
- The native helper owns the parts that cannot be expressed by a class-library
  shim: lookup-mode ordering, defensive copying, detached classfile parsing,
  package and module-class rejection, asynchronous linking, duplicate
  reservation, defining-loader registration, and initialization avoidance.
- `Java9LookupDefineClass` compiles payload classes into a directory outside
  the test classpath, proving they cannot be loaded before definition. It
  compares exact metadata, direct/reflected/unreflected invocation, loader,
  module, package, protection-domain identity, initialization timing, duplicate
  definition, malformed and future classfiles, wrong-package rejection, and
  successful definition after failed attempts with HotSpot 17.

The full Java 9-26 compatibility suite passed locally on 2026-07-15 in 22
minutes 13 seconds. The compiler gates then passed in 382 seconds for Kotlin
2.4.0 with the full compiler classpath and 292 seconds for Scala 2.13.18.

The Java 9 `MethodHandles.Lookup.findClass(String)` and
`accessClass(Class<?>)` methods follow the same parsed-overlay contract:

- both methods are public, concrete, non-native, and non-synthetic, with exact
  generic `Class<?>` signatures, checked-exception ordering, empty annotation
  surfaces, and absent `MethodParameters` metadata;
- `findClass` delegates to the package-private `DoppioMethodHandles` helper,
  while `accessClass` delegates directly to `VerifyAccess`; direct calls,
  reflection, `Method.invoke`, and `Lookup.unreflect` still share the same
  parsed methods and slots;
- `findClass` uses the lookup class's defining loader without initialization,
  then applies `accessClass`; `accessClass` shares the modern `VerifyAccess`
  class/module/package logic and recursively checks array component access;
- `Java9LookupClassAccess` compares metadata, same/cross-package access,
  reduced and public lookups, loader/module/protection-domain identity,
  initialization timing, primitive/void/array/null/missing inputs, exception
  ordering, reflection, and unreflected handles with HotSpot 17.

`MethodHandles.Lookup.hasPrivateAccess()` is a replacement overlay rather than
an appended method:

- the Java 8 bootstrap class already has a private `hasPrivateAccess()Z` used
  by its own lookup checks, so the transformer rewrites that method-info entry
  in place and leaves all existing symbolic references valid;
- the replacement is public, concrete, non-native, has no parameters,
  exceptions, generic signature, or parameter metadata, and delegates to the
  modern `hasFullPrivilegeAccess()` slot;
- the method carries both the classfile `Deprecated` attribute and the exact
  runtime-visible `@Deprecated(since = "14", forRemoval = false)` view;
- `java.lang.Deprecated` itself receives Java 9's abstract `since()` and
  `forRemoval()` elements with exact empty-string and false annotation defaults,
  allowing the Java 8 reflection implementation to materialize modern
  annotation proxies;
- `Java9LookupHasPrivateAccess` compares those metadata surfaces and direct,
  reflected, and unreflected full/reduced lookup behavior with HotSpot 17.

The Java 15 `MethodHandles.Lookup.ensureInitialized(Class<?>)` overlay extends
the same instance-method table:

- it is an ordinary public, concrete method with exact `Class<?>` parameter
  and return signatures, one declared `IllegalAccessException`, empty
  annotation surfaces, and absent `MethodParameters` metadata;
- its two-load bytecode delegates to `DoppioMethodHandles.ensureInitialized`,
  so direct invocation, `Method.invoke`, and `Lookup.unreflect` resolve one
  parsed slot;
- the Java helper owns null, primitive, void, array, and lookup-access ordering,
  then calls a narrow native initialization bridge;
- `Java15LookupEnsureInitialized` compares successful and abrupt class-state
  transitions, superclass and interface behavior, repeated calls, and
  concurrent waiters with HotSpot 17.

### Executable receiver types

Java 9 changed executable receiver reflection beyond adding classfile syntax:

- `Executable.getAnnotatedReceiverType()` now parameterizes a generic
  declaring class recursively. A method declared by `Outer<T>.Inner<U>` must
  therefore expose both the parameterized `Outer<T>` owner and the `U`
  argument instead of the raw `Inner` class returned by the Java 8 bootstrap
  implementation.
- `Constructor.getAnnotatedReceiverType()` returns a receiver only for a
  non-static member class. Top-level, static-nested, local, and anonymous
  constructors return `null`, even when a local or anonymous constructor has a
  synthetic enclosing-instance parameter.

`ClassLoader.ts` implements these rules as parsed bootstrap methods:

- a method-info transformer replaces only the existing `Code` attribute while
  preserving access flags and all other method attributes;
- `Executable.parameterize(Class<?>)` is appended with its Java 17
  package-private descriptor and generic signature, using
  `ParameterizedTypeImpl.make` recursively for generic owners;
- the existing `Executable` and `Constructor` receiver method bodies are
  replaced with the Java 17 algorithms adapted to the bundled Java 8
  `sun.misc` constant-pool APIs.

Two Java 8 compatibility details are handled before those algorithms run:

- `Class.getModifiers()` reads the matching `InnerClasses` self-entry, where
  member `private`, `protected`, and `static` flags are stored, instead of only
  the top-level class access flags;
- the Java 8 `AnnotatedTypeFactory.addNesting(...)` implementation is replaced
  with the Java 17 static-aware algorithm. A static nested class or
  parameterized type now keeps the supplied base location instead of
  recursively counting its owner as an `INNER_TYPE` step. Executable type
  annotation bytes can therefore remain unchanged.

`Java9ExecutableReceiverReflection` compares structured raw, owner, and actual
type-argument identities; receiver annotations; constructor nullability;
member-class modifier classification; and exact public/package-private,
non-native, non-synthetic method metadata across generic top-level,
static-nested, inner, local, anonymous, and static cases. The earlier
`Java9ExecutableTypeAnnotations` and `Java12ClassConstableReflection` fixtures
remain focused regressions for the shared annotation-byte path.

The full Java 9-26 compatibility suite passed locally on 2026-07-14 in 11
minutes 2 seconds. The compiler-discovery gates then passed in 145 seconds for
Kotlin 2.4.0 with the full compiler classpath and 98 seconds for Scala 2.13.18.

### Annotated owner types

Java 9 added `AnnotatedType.getAnnotatedOwnerType()` as a public default
method and redeclared it as public abstract on `AnnotatedParameterizedType`,
`AnnotatedArrayType`, `AnnotatedTypeVariable`, and `AnnotatedWildcardType`.
The Java 8 bootstrap interfaces and all five
`sun.reflect.annotation.AnnotatedTypeFactory` implementation classes predate
that surface.

`ClassLoader.ts` installs parsed overlays with Java 17-compatible metadata and
dispatch:

- `AnnotatedType` receives the default null body, while its four subinterfaces
  receive exact abstract declarations;
- the base and parameterized implementations compute raw `Class` and
  `ParameterizedType` owners respectively, and the array, type-variable, and
  wildcard implementations declare exact null-returning methods;
- `TypeAnnotation.LocationInfo.popLocation(byte)` removes one trailing
  `INNER_TYPE` path element without mutating the original location;
- owner objects are constructed directly from the popped location and its
  filtered annotations. This deliberately bypasses the Java 8 factory's
  implicit `addNesting(...)` call, which would otherwise duplicate owner paths
  at three or more nesting levels.

The shared reflection byte source also now covers fields and class bounds:
`Field.getTypeAnnotationBytes0()` and `Class.getRawTypeAnnotations()` return
their parsed `RuntimeVisibleTypeAnnotations` payloads just as the existing
executable native does.

`Java9AnnotatedOwnerTypes` compares recursive annotated-type trees with
HotSpot for parameterized, three-level, zero-argument, static, and raw member
types, top-level types, arrays, type variables, and wildcards. It verifies
owner and argument annotation placement, null owners, exact interface method
flags/default metadata, and the declaring implementation class for all five
runtime implementation kinds. Existing executable receiver, executable type
annotation, parameterized type name, class constable, and record reflection
fixtures remain focused regressions for the shared paths.

The full Java 9-26 compatibility suite passed locally on 2026-07-14 in 18
minutes 8 seconds. The compiler gates then passed in 412 seconds for Kotlin
2.4.0 with the full compiler classpath and 303 seconds for Scala 2.13.18.

### Parameterized type names

The Java 8 `ParameterizedTypeImpl.toString()` owner rendering predates the
Java 9 `Type.getTypeName()` contract used by current reflection clients:

- when the owner is a raw `Class`, Java 8 appends the owner's full name, a dot,
  and then the nested raw type's full name, duplicating the owner;
- when the owner is parameterized, Java 8 removes the repeated binary prefix
  but still joins the nested name with a dot. Java 17 uses `$`, matching the
  binary nested-class name.

`ClassLoader.ts` replaces only the existing public, non-native
`ParameterizedTypeImpl.toString(): String` `Code` attribute. The Java 17 body
uses recursive `Type.getTypeName()`, `$`, `Class.getSimpleName()` for a raw
owner, and `StringJoiner` for actual arguments. Fields, constructors,
structured raw/owner/argument identity, equality, hashing, and all other method
metadata remain the bundled implementation.

`Java9ParameterizedTypeNames` compares exact `getTypeName()` and `toString()`
output plus a separate structural representation for top-level parameterized
types, static nested classes, parameterized inner owners, zero-argument inner
types, raw inner classes, `Map.Entry`, generic arrays, upper/lower wildcards,
and nested parameterized types inside wildcard arrays. It also protects the
implementation method's exact declaring class, flags, return type, and arity.
`Java12ClassConstableReflection` separately asserts the motivating
`TypeDescriptor.OfField<Class<?>>` name through the injected generic `Class`
interface.

The full Java 9-26 compatibility suite passed locally on 2026-07-14 in 16
minutes 27 seconds. The compiler gates then passed in 228 seconds for Kotlin
2.4.0 with the full compiler classpath and 136 seconds for Scala 2.13.18.

### Accessible object access probes

The Java 8 bootstrap `AccessibleObject` predates Java 9
`canAccess(Object)` and `trySetAccessible()`. `ClassLoader.ts` appends both
methods as public, final, non-native parsed methods with the modern
`CallerSensitive` marker:

- `canAccess` validates instance, static, and constructor receivers before it
  observes the access-override flag. It then combines the actual caller from
  `sun.reflect.Reflection.getCallerClass()`, Java 8
  `verifyMemberAccess(...)`, and Doppio's nestmate metadata. Reflection
  implementation frames derived from `MagicAccessorImpl` are excluded from
  caller discovery, including when `canAccess` itself is invoked through
  `Method.invoke`.
- `trySetAccessible` reuses the existing `setAccessible` permission check,
  preserves an already-enabled override, returns `false` without mutation for
  the `java.lang.Class` constructor, and enables access for the unnamed-module
  classpath model used by Doppio.

`Java9AccessibleObjectAccess` compares exact method flags, inherited declaring
class, caller-sensitive annotation shape, direct and reflective caller
selection, public/protected/package/private members, cross-package protected
receiver rules, static/instance/constructor validation before and after an
override, repeated/reset state, non-`Member` subclasses, and the `Class`
constructor. `Java11AccessibleObjectNestAccess` separately compiles with nest
metadata and distinguishes a true private nestmate caller from an unrelated
same-package helper.

Strong named-module encapsulation remains outside this overlay: Doppio models
bootstrap and application classes as unnamed-module members, so it cannot yet
return `false` for JDK-private packages that Java 17 does not open to the
caller. `ARCH-002` in `RISK_REGISTER.md` tracks the required module-model work.

The full Java 9-26 compatibility suite passed locally on 2026-07-14 in 11
minutes 41 seconds. The compiler gates then passed in 223 seconds for Kotlin
2.4.0 with the full compiler classpath and 162 seconds for Scala 2.13.18.

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

The Java 12 `Class` field-type descriptor overlay preserves its covariant API:

- `ClassLoader.ts` appends `TypeDescriptor.OfField` to the Java 8 bootstrap
  `Class` interface table and extends its class-level generic signature with
  `TypeDescriptor.OfField<Class<?>>`.
- `componentType()` and `arrayType()` are parsed public, non-native methods.
  Each has the Java 17-compatible public synthetic bridge returning raw
  `TypeDescriptor.OfField`; bridge bytecode delegates to the corresponding
  `Class`-returning primary method.
- Primary bytecode passes the receiver to package-private native `DoppioClass`
  helpers. Component lookup reuses resolved `ArrayClassData`; array creation
  resolves the next-rank array class asynchronously and preserves the no-arg,
  null-message `IllegalArgumentException` for void and rank-overflow inputs.
- The previous slot-less constant-pool fallbacks and native-frame trampolines
  were removed. `Java12ClassComponentTypeReflection` and
  `Java12ClassArrayTypeReflection` compare exact metadata, lookup selection,
  direct and reflective calls, interface dispatch, `Lookup.unreflect`, and both
  primary and bridge `Lookup.findVirtual` descriptors with HotSpot.
- The Java 8 `ParameterizedTypeImpl.getTypeName()` nested-owner duplication is
  a separate display-only reflection gap; structured raw type and type argument
  metadata are correct and are tested directly.
- The compiler-discovery gates passed locally on 2026-07-13 in 285 seconds for
  Kotlin 2.4.0 with the full compiler classpath and 292 seconds for Scala
  2.13.18.

The Java 12 `Class` constant-description overlay preserves the `Constable`
contract as parsed metadata:

- `ClassLoader.ts` appends `java.lang.constant.Constable` after
  `TypeDescriptor.OfField` in the Java 8 bootstrap `Class` interface table and
  adds the same raw interface to the class-level generic signature.
- `describeConstable()` is injected as a public, non-native method with erased
  descriptor `()Ljava/util/Optional;` and generic signature
  `()Ljava/util/Optional<Ljava/lang/constant/ClassDesc;>;`. No bridge is needed
  because the `Constable` declaration has the same erased return type.
- Parsed bytecode passes the receiver to a package-private native
  `DoppioClass` helper. The helper creates a `ClassDesc` from Doppio's canonical
  internal descriptor and returns it through `Optional.of`, retaining the
  existing ordinary, primitive, void, and array behavior.
- The previous slot-less constant-pool fallback and native-frame trampoline
  were removed. Direct calls, reflection slots, `Method.invoke`, interface
  dispatch, `Lookup.unreflect`, and `Lookup.findVirtual` now resolve one method
  with HotSpot-compatible modifiers, generic return type, and empty annotation,
  parameter, exception, and method-type-parameter metadata.
- `Java12ClassConstableReflection` compares those contracts with a native Java
  17 oracle across ordinary, nested, local, anonymous, interface, enum,
  annotation, JDK, primitive, void, reference-array, primitive-array, and user
  array classes. It also resolves every produced descriptor back to the same
  `Class` object and checks MethodHandle dispatch through both `Class` and
  `Constable`.
- HotSpot returns `Optional.empty()` for hidden classes and arrays whose
  recursive element type is hidden. That path is intentionally deferred with
  hidden-class definition and discovery; no such class object can currently be
  created by Doppio.
- The compiler-discovery gates passed locally on 2026-07-14 in 229 seconds for
  Kotlin 2.4.0 with the full compiler classpath and 166 seconds for Scala
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
