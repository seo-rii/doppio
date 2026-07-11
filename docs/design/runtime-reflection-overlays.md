# Runtime Reflection Overlay Design Notes

Modern Java support currently uses two different mechanisms for APIs that are
absent from the Java 8-era bootstrap class files:

- direct-call overlays in `ConstantPool.ts`, which let bytecode call a modern
  method such as `java.lang.Runtime.version()`;
- class-library shim classes in `classes/modern_classlib`, which provide real
  Java classes such as `java.lang.Runtime$Version`.

Those mechanisms are not the same as public reflection support. A method can be
callable from bytecode and still be absent from `Class.getMethod` or
`Class.getDeclaredMethods0`, because the reflection native reads the
`ClassData.getMethods()` table built from the loaded class file. Adding synthetic
methods to that table changes what compilers and libraries discover at startup,
so it needs a separate design and test gate.

## Triggering Case

`Runtime.version()` is implemented for direct bytecode calls and returns a
cached baseline `Runtime.Version` object. The tested Java fixtures cover
`Runtime.Version.parse(...)` and the Java 10 accessors. However, exposing
`Runtime.version()` through a naive synthetic `Method` in `ClassData.getMethods()`
made Doppio-hosted Kotlin compiler runs switch into a different Java 9+ runtime
probe path. Local validation on 2026-07-11 did not complete within 540 seconds,
where the preceding Kotlin modern interop smoke had completed near 294 seconds.

This is useful evidence: reflection visibility for modern APIs is observable to
the compiler, and enabling it can reveal deeper runtime gaps or expensive paths
that direct-call fixtures do not cover.

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

The existing `ClassLoader.resources(String)` synthetic method is the closest
local pattern: it is inserted into the `ClassData` method table and has a custom
reflection object. That pattern is acceptable for stable, isolated methods, but
it is too broad to copy blindly for core classes such as `java.lang.Runtime`.

The safer shape is an explicit overlay registry:

- keyed by internal class name and method descriptor;
- able to build the direct-call native body;
- able to build a reflection `Method` object;
- able to opt into or out of `getDeclaredMethods0` enumeration independently;
- annotated in the registry with required fixture names and compiler-smoke
  gates.

For `Runtime.version()`, the first safe milestone should be Java-only:

1. Keep existing direct-call behavior unchanged.
2. Add a Java fixture that checks whether reflection visibility is intentionally
   unsupported today, or enable visibility behind the overlay registry.
3. If visibility is enabled, run Kotlin and Scala compiler smoke baselines before
   broadening source-level interop tests.

## Test Gates

Before enabling a reflection-visible modern method:

- `npm run typecheck`
- `./node_modules/.bin/grunt modern-ci-release-cli --grunt-ignore-compile-errors`
- a Java fixture comparing native JVM and Doppio output for reflective lookup
  and invocation;
- the smallest relevant Kotlin and Scala compiler smokes, with elapsed time
  recorded in the design or compiler bring-up document;
- `yarn ci:check-modern-java-workflow:test`
- `yarn ci:check-modern-java-workflow`

If a compiler smoke times out, revert the reflection exposure and document the
triggering API before trying adjacent coverage. A passing direct-call fixture is
not enough evidence that broad reflection exposure is safe.

## Open Questions

- Should synthetic modern methods appear in `getDeclaredMethods()` immediately,
  or only in `getMethod()` lookup for exact signatures?
- Should reflection overlays include a synthetic flag once method flags model it?
- Can compiler probes be made deterministic enough to distinguish a true
  semantic gap from broad compile-time variance?
- Which Java 9+ methods are already direct-call overlays but not reflection
  visible, and which of them are actually observed by Kotlin or Scala compiler
  startup?
