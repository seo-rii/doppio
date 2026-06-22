# `MethodHandles.tryFinally` Overlay Design

`MethodHandles.tryFinally` is a Java 9+ control-flow combinator. Doppio's
modern class-library image exposes Java 17 API shapes, but the runtime still
needs explicit coverage for method-handle exception and argument flow.

## Specification Shape

The Java 17 API defines `tryFinally(target, cleanup)` as a method-handle
adapter that invokes `target` in a try block and always invokes `cleanup` in the
finally block. The cleanup handle returns the same type as target, starts with a
`Throwable` parameter, and for non-`void` targets also receives the target
result as its second parameter. Remaining cleanup parameters are a prefix of the
adapter arguments, so cleanup may omit trailing target arguments.

On a normal target return, the cleanup return value becomes the adapter result.
If target throws and cleanup returns normally, the original target exception is
still thrown. If cleanup throws, normal Java finally semantics let the cleanup
exception replace any pending target result or exception.

Reference: Java SE 17 `MethodHandles.tryFinally` API documentation:
https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/invoke/MethodHandles.html#tryFinally(java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle)

## Current Implementation

- Class loading injects a public native
  `MethodHandles.tryFinally(MethodHandle, MethodHandle)` overlay beside the
  other modern `MethodHandles` overlays.
- The native entry point delegates to
  `java.lang.invoke.DoppioMethodHandles.tryFinally`.
- The helper validates the selected Java 17 type rules: matching target and
  cleanup return type, required cleanup leading parameters, and cleanup
  trailing parameters matching a prefix of the target parameters.
- The helper builds a generic adapter around
  `DoppioMethodHandles.tryFinallyTarget`, binds target, cleanup, return type,
  and cleanup argument count, collects the adapter arguments into `Object[]`,
  and adapts the resulting handle back to the target type.
- `tryFinallyTarget` invokes target with `invokeWithArguments`, runs cleanup in
  a Java `finally` block, passes zero values for primitive non-`void` result
  slots when target throws before producing a result, and preserves Java finally
  exception behavior.

## Covered Behavior

- Java 17 fixture coverage in
  `classes/modern_test/Java17MethodHandleExtraCombinators.java`:
  normal `String` target where cleanup omits the trailing `int` argument,
  exceptional `String` target with cleanup side-effect proof and original
  exception propagation, and `void` target/cleanup descriptor parity.
- Kotlin smoke coverage in `classes/kotlin_smoke/MethodHandleSmoke.kt`:
  reflective discovery of `MethodHandles.tryFinally`, normal/exception/void
  invocation, cleanup side-effect proof, and descriptor checks.

## Remaining Gaps

- Broad primitive return/result cleanup combinations beyond the generic zero
  value path are not individually fixture-covered yet.
- Cleanup handles with narrower `Throwable` parameters and the resulting
  runtime `ClassCastException` masking behavior need a dedicated parity
  fixture.
- Cleanup-throws-over-target-result and cleanup-throws-over-target-exception
  precedence should get explicit fixtures before claiming full control-flow
  parity.
- Broader Java 9+ control-flow parity continues in
  `docs/design/methodhandles-control-flow.md`, including the remaining generic
  `loop` work and unimplemented edge cases for the selected loop and switch
  slices.
