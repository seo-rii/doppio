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
- `doWhileLoop(init, body, pred)`: second slice. It supports the same selected
  non-`void` state variable shape, but body executes before the first predicate
  check.
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

## Initial `doWhileLoop` Implementation

The first `doWhileLoop` slice intentionally mirrors the selected `whileLoop`
shape, with the body and predicate order matching the Java API:

```text
V init(A...)
V body(V, A...)
boolean pred(V, A...)
V doWhileLoop(A... args) {
  V v = init(args...);
  do {
    v = body(v, args...);
  } while (pred(v, args...));
  return v;
}
```

The selected implementation also accepts `init == null` and shorter prefix
parameter lists for `init` and `pred` under the same constraints as the
selected `whileLoop` slice. This makes the first `doWhileLoop` support narrow
but useful for compiler-generated state adapters that always carry one
non-`void` state value.

## Runtime Structure

- Class loading injects a public native
  `MethodHandles.whileLoop(MethodHandle, MethodHandle, MethodHandle)` overlay
  and a public native
  `MethodHandles.doWhileLoop(MethodHandle, MethodHandle, MethodHandle)` overlay
  into the Java 8 `MethodHandles` class.
- The native entry point delegates to
  `java.lang.invoke.DoppioMethodHandles.whileLoop` or
  `java.lang.invoke.DoppioMethodHandles.doWhileLoop`.
- `DoppioMethodHandles` validates the selected shape, binds the loop parts into
  a generic target, collects external arguments into `Object[]`, and adapts the
  generic target back to `(A...)V`.

## Covered Behavior

- Java fixture coverage in
  `classes/modern_test/Java17MethodHandleControlFlow.java`:
  integer state loop with explicit init, integer state loop with `null` init
  defaulting to zero, and `String` state loop with two external arguments for
  both `whileLoop` and `doWhileLoop`. The `doWhileLoop` coverage also checks
  that body executes once when the initial predicate state would have failed.
- Kotlin smoke coverage in `classes/kotlin_smoke/MethodHandleSmoke.kt`:
  reflective discovery of `MethodHandles.whileLoop` and
  `MethodHandles.doWhileLoop`, integer state invocation, null initializer
  invocation, body-first `doWhileLoop` behavior, and descriptor checks.

## Remaining Gaps

- `void` body loops are not claimed by the initial slice.
- Predicate and initializer validation is prefix-based but not a complete
  implementation of the generic `loop` effectively-identical parameter-list
  rules.
- Broader `whileLoop`/`doWhileLoop` parity, `countedLoop`, `iteratedLoop`,
  generic `loop`, and `tableSwitch` still need separate fixtures and
  implementation slices.
- The selected `whileLoop` and `doWhileLoop` slices now share validation and
  adapter construction; broader control-flow combinators should reuse that only
  when their argument-flow rules actually match.
