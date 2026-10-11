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
  reference-component virtual dispatch and original Throwable propagation for
  field-backed records. Primitive Float/Double text conversion waits for Java
  class initialization before resuming the invokedynamic frame.
- `Class.isRecord()` is a parsed public Java overlay delegating to a native
  bridge backed by the `Record` attribute; direct and reflective calls share it.
- `Class.getRecordComponents()` is exposed through a native overlay on
  `java.lang.Class` and returns a minimal
  `java.lang.reflect.RecordComponent` shim for record classes. The first slice
  covers component name, type, accessor method, declaring record, null for
  non-record classes, and empty arrays for empty records.
- `RecordComponent.getGenericSignature()` exposes the raw component
  `Signature` attribute string. Without a signature, `getGenericType()` returns
  the raw Class; otherwise it lazily uses FieldRepository, CoreReflectionFactory
  and ClassScope for the declaring record. `getAnnotatedType()` uses that
  generic Type, the original record constant pool and the complete component
  FIELD-target type-annotation table, including nested paths and owners.
  InvocationTargetException is unwrapped to preserve the original generic or
  annotation failure instead of converting it to a different exception.
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
- `RecordComponent.getGenericType()` raw Class or lazy generic Type
- `RecordComponent.getAnnotatedType()` generic-aware nested type-use lookup
- `RecordComponent.getAccessor()`
- `RecordComponent.getDeclaringRecord()`
- Runtime-visible component annotation lookup
- Parameterized, variable, wildcard, generic-array and nested-owner Type shapes
  in the selected B6 corpus; broader reflection conformance remains unassessed.

## Implementation Boundaries

1. Keep the Java 16 `getRecordComponents()` fixture focused on the basic
   component shape and deterministic accessor output.
2. Extend existing boot classes such as `java.lang.Class` with narrow native
   overlays instead of replacing the Java 8 implementation with an incomplete
   stub.
3. Reuse bundled generic repositories and annotation parsers in the
   `RecordComponent` shim rather than maintaining a parallel Type model.
4. Store full record component metadata from the `Record` attribute, not only
   names.
5. Link each component to its accessor `Method` by name and descriptor.
6. Preserve the original field-signature and component-signature distinction.
   Missing generic classes, evolved generic arity and explicit malformed
   component signatures must fail lazily with their exact public error types.

## Selected Verification

[B6](../phase-b-loading.md#b6-selected-records) registers 29 type/annotation,
40 construction/object-semantics and eight lazy-signature cases before any
compilation. Genuine javac 21/25 output is compared against fixed independent
expectations on native Java, Node and Chromium. Only three explicitly recorded
component Signature mutations alter compiler bytes; their original-offset edits
and preservation proofs are mandatory. The lower-wildcard helper correction
also has exact emitted-Code verification and compiler-artifact byte parity.
The selected exit at clean `db5faa90c` passes all 18 cells and the original
323 retained fixtures without regenerating class files or expectations.
This does not complete general ObjectMethods/bootstrap support, arbitrary
record handles or all generic/annotation contracts. Source units remain
unassessed and package/phase completion flags remain false.

## Risks

- Replacing `java.lang.Class` wholesale would break core reflection and class
  loading behavior.
- Record component accessors overlap with existing method reflection, so the
  implementation should reuse current `Method` object construction rather than
  inventing a parallel representation.
- Type-use annotation metadata needs careful ordering after runtime-visible
  component annotations, because current annotation support is Java 8-era and
  incomplete.
