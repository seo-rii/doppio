# Record Reflection Design Notes

Java 16 records need two separate support layers in Doppio:

1. Class-file/runtime support for the `Record` attribute and generated record
   object methods.
2. Reflection support through modern `java.lang.Class` and
   `java.lang.reflect.RecordComponent` APIs.

The first layer is partially implemented. A narrow synthetic bridge now exposes
`Class.isRecord()`, but the rest of the second layer is not safe to add as a
small class-library shim because Doppio still boots from a Java 8-era
`java.lang.Class`, which does not declare `getRecordComponents()`.

## Current State

- `Record` attributes are parsed.
- `ReferenceClassData.getRecordComponentNames()` exposes component names for
  parser checks.
- `java.lang.Record` is synthesized as a minimal abstract base when it is
  missing from the Java 8 class library.
- `java.lang.runtime.ObjectMethods.bootstrap` has a targeted fast path for
  compiler-generated record `toString`, `equals`, and `hashCode`.
- `Class.isRecord()` is exposed through a synthetic native bridge backed by the
  parsed `Record` attribute.

## Required API Surface

- `Class.isRecord()` for the selected boolean surface
- `Class.getRecordComponents()`
- `java.lang.reflect.RecordComponent`
- `RecordComponent.getName()`
- `RecordComponent.getType()`
- `RecordComponent.getAccessor()`
- `RecordComponent.getDeclaringRecord()`
- Generic signature and annotation accessors after the basic shape works.

## Implementation Plan

1. Add a failing Java 16 fixture for `getRecordComponents()` once the
   class-library patch strategy is chosen.
2. Decide how Doppio will extend existing boot classes such as
   `java.lang.Class` without replacing the Java 8 implementation with an
   incomplete stub.
3. Create a `RecordComponent` class-library shim only after `Class` can return
   instances of it.
4. Store full record component metadata from the `Record` attribute, not only
   names.
5. Link each component to its accessor `Method` by name and descriptor.
6. Add annotation and generic signature parity tests after the basic name,
   type, accessor, and declaring-record tests are green.

## Risks

- Replacing `java.lang.Class` wholesale would break core reflection and class
  loading behavior.
- Record component accessors overlap with existing method reflection, so the
  implementation should reuse current `Method` object construction rather than
  inventing a parallel representation.
- Annotation metadata needs careful ordering after basic component metadata,
  because current annotation support is Java 8-era and incomplete.
