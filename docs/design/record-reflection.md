# Record Reflection Design Notes

Java 16 records need two separate support layers in Doppio:

1. Class-file/runtime support for the `Record` attribute and generated record
   object methods.
2. Reflection support through modern `java.lang.Class` and
   `java.lang.reflect.RecordComponent` APIs.

The first layer is partially implemented. Narrow synthetic bridges now expose
`Class.isRecord()` and the basic `Class.getRecordComponents()` shape while
keeping Doppio's Java 8-era `java.lang.Class` implementation in place.

## Current State

- `Record` attributes are parsed.
- `ReferenceClassData.getRecordComponentNames()` exposes component names for
  parser checks.
- `java.lang.Record` is synthesized as a minimal abstract base when it is
  missing from the Java 8 class library.
- `java.lang.runtime.ObjectMethods.bootstrap` has a targeted fast path for
  compiler-generated record `toString`, `equals`, and `hashCode`, including
  reference-component `equals`/`hashCode` dispatch for field-backed records.
- `Class.isRecord()` is exposed through a synthetic native bridge backed by the
  parsed `Record` attribute.
- `Class.getRecordComponents()` is exposed through a native overlay on
  `java.lang.Class` and returns a minimal
  `java.lang.reflect.RecordComponent` shim for record classes. The first slice
  covers component name, type, accessor method, declaring record, null for
  non-record classes, and empty arrays for empty records.
- `RecordComponent.getGenericSignature()` exposes the raw component
  `Signature` attribute string. `getGenericType()` uses a raw `Class` fallback
  for non-generic components. `getAnnotatedType()` uses the same raw type
  fallback and now exposes top-level runtime-visible type-use annotations for
  record component types; nested type-argument annotations still require full
  generic/type-use metadata parsing.
- `RecordComponent.getAnnotation()`, `getAnnotations()`, and
  `getDeclaredAnnotations()` parse runtime-visible component annotations using
  the existing JDK annotation parser and the declaring record constant pool.
- The modern `ElementType` definition exposes `RECORD_COMPONENT` at its exact
  Java 17 ordinal. `Java17DeprecatedMetadata` resolves a runtime `Target`
  annotation containing that value, preventing the Java 8 bootstrap enum from
  silently replacing the modern definition.

## Required API Surface

- `Class.isRecord()` for the selected boolean surface
- `Class.getRecordComponents()`
- `java.lang.reflect.RecordComponent`
- `RecordComponent.getName()`
- `RecordComponent.getType()`
- `RecordComponent.getGenericSignature()` for raw signature strings
- `RecordComponent.getGenericType()` raw fallback for non-generic components
- `RecordComponent.getAnnotatedType()` raw fallback for non-generic components
  plus top-level runtime-visible type-use annotation lookup
- `RecordComponent.getAccessor()`
- `RecordComponent.getDeclaringRecord()`
- Runtime-visible component annotation lookup
- Full generic `Type` parsing and nested type-use annotation accessors after
  the top-level shape works.

## Implementation Plan

1. Keep the Java 16 `getRecordComponents()` fixture focused on the basic
   component shape and deterministic accessor output.
2. Extend existing boot classes such as `java.lang.Class` with narrow native
   overlays instead of replacing the Java 8 implementation with an incomplete
   stub.
3. Keep the `RecordComponent` class-library shim minimal: raw signature strings
   and raw `Class` fallback first, full generic repositories and annotation
   state later.
4. Store full record component metadata from the `Record` attribute, not only
   names.
5. Link each component to its accessor `Method` by name and descriptor.
6. Add full generic `Type` and nested type-use annotation parity tests after
   the basic name, type, accessor, declaring-record, raw-signature,
   runtime-visible component annotation, and top-level annotated-type tests are
   green.

## Risks

- Replacing `java.lang.Class` wholesale would break core reflection and class
  loading behavior.
- Record component accessors overlap with existing method reflection, so the
  implementation should reuse current `Method` object construction rather than
  inventing a parallel representation.
- Type-use annotation metadata needs careful ordering after runtime-visible
  component annotations, because current annotation support is Java 8-era and
  incomplete.
