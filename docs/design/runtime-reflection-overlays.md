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

The modern integer arithmetic family is the first multi-method parsed overlay:

- `ClassLoader.ts` injects 19 methods into each of `Math` and `StrictMath`
  before parsing their Java 8 bootstrap classfiles: the 12 Java 18 `ceilDiv`,
  `ceilMod`, `divideExact`, `floorDivExact`, and `ceilDivExact` overloads;
  Java 9 `multiplyFull`, `multiplyHigh`, `floorDiv(long, int)`, and
  `floorMod(long, int)`; Java 15 `absExact(int/long)`; and Java 18
  `unsignedMultiplyHigh`.
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
- The initial 12-method compiler-discovery gates passed locally on 2026-07-13:
  Kotlin 2.4 startup in 50 seconds and minimal compile/run in 168 seconds, plus
  Scala 2.13.18 startup in 20 seconds and minimal compile/run in 185 seconds.
  After expanding to all 19 methods per class and removing the old direct-call
  fallbacks, the complete minimal compile/run gates passed again in 404 seconds
  for Kotlin 2.4.0 and 253 seconds for Scala 2.13.18 under a contended host.

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
