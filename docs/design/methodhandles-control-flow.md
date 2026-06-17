# `MethodHandles` Control-Flow Combinator Design

Java 9 added method-handle combinators that model loops and switch-like
control flow. They are substantially harder than the simple public overlays
because their result handles must preserve Java's argument-flow, state-update,
predicate, finalizer, and exception behavior.

Reference: Java SE 17 `MethodHandles` API documentation:
https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/invoke/MethodHandles.html

## Scope

The control-flow family is split into small implementation slices:

- `whileLoop(init, pred, body)`: first slice. Support non-`void` state variable
  loops where `body` has shape `(V, A...)V`, `pred` accepts a prefix of
  `(V, A...)` and returns `boolean`, and `init` is either `null` or accepts a
  prefix of `(A...)` and returns `V`.
- `doWhileLoop(init, body, pred)`: later slice. It shares most validation and
  invocation machinery with `whileLoop`, but body executes before the first
  predicate check.
- `countedLoop(iterations, init, body)` and
  `countedLoop(start, end, init, body)`: later slices. They add an `int` loop
  counter state and extra validation around external parameter lists.
- `iteratedLoop(iterator, init, body)`: later slice. It needs iterator
  acquisition, `hasNext`/`next` sequencing, and element argument flow.
- `loop(MethodHandle[]...)`: later slice. This is the general form behind the
  convenience combinators and should wait until more simple slices have parity
  tests.
- `tableSwitch(fallback, targets...)`: later slice. It is control flow, but not
  a loop; it needs selector validation and target/fallback type adaptation.

## Initial `whileLoop` Implementation

The first implementation intentionally targets the common stateful non-`void`
shape used by compiler-generated adapters:

```text
V init(A...)
boolean pred(V, A...)
V body(V, A...)
V whileLoop(A... args) {
  V v = init(args...);
  while (pred(v, args...)) {
    v = body(v, args...);
  }
  return v;
}
```

The helper accepts shorter `init` and `pred` parameter lists when they match the
allowed prefixes. The returned adapter type is `(A...)V`, where `A...` comes
from the body parameters after the leading state variable.

`init == null` initializes the state variable with the Java default value for
the body return type. Primitive state values are boxed inside the generic helper
and adapted back to the exact method-handle type with `asType`.

## Runtime Structure

- Class loading injects a public native
  `MethodHandles.whileLoop(MethodHandle, MethodHandle, MethodHandle)` overlay
  into the Java 8 `MethodHandles` class.
- The native entry point delegates to
  `java.lang.invoke.DoppioMethodHandles.whileLoop`.
- `DoppioMethodHandles.whileLoop` validates the selected shape, binds the loop
  parts into `whileLoopTarget`, collects external arguments into `Object[]`, and
  adapts the generic target back to `(A...)V`.

## Covered Behavior

- Java fixture coverage in
  `classes/modern_test/Java17MethodHandleControlFlow.java`:
  integer state loop with explicit init, integer state loop with `null` init
  defaulting to zero, and `String` state loop with two external arguments.
- Kotlin smoke coverage in `classes/kotlin_smoke/MethodHandleSmoke.kt`:
  reflective discovery of `MethodHandles.whileLoop`, integer state invocation,
  null initializer invocation, and descriptor checks.

## Remaining Gaps

- `void` body loops are not claimed by the initial slice.
- Predicate and initializer validation is prefix-based but not a complete
  implementation of the generic `loop` effectively-identical parameter-list
  rules.
- `doWhileLoop`, `countedLoop`, `iteratedLoop`, generic `loop`, and
  `tableSwitch` still need separate fixtures and implementation slices.
- Cleanup of duplicated adapter logic should wait until at least two loop
  combinators share it; premature factoring would obscure the narrow first
  slice.
