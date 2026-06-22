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
  `countedLoop(start, end, init, body)`: third slice. They support a selected
  non-`void` state variable shape with an `int` counter passed after the state.
- `iteratedLoop(iterator, init, body)`: fourth slice. It supports selected
  non-`void` state variable loops where the body has shape `(V, T, A...)V`,
  the iterator is either `null` and supplied by the leading `Iterable` runtime
  argument, or a handle returning `Iterator`, and `init` is either `null` or
  accepts a prefix of `(A...)`.
- `loop(MethodHandle[]...)`: later slice. This is the general form behind the
  convenience combinators and should wait until more simple slices have parity
  tests.
- `tableSwitch(fallback, targets...)`: selected slice. It is control flow, but
  not a loop; the current coverage lives in the broader `java.lang.invoke`
  design notes.

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

## Initial `countedLoop` Implementation

The selected counted-loop slices use body shape `(V, int, A...)V`, with state
first and the current counter second:

```text
int iterations(A...)
V init(A...)
V body(V, int, A...)
V countedLoop(A... args) {
  V v = init(args...);
  for (int i = 0; i < iterations(args...); i++) {
    v = body(v, i, args...);
  }
  return v;
}
```

The four-handle overload replaces the implicit zero start with separate
`start(A...)` and `end(A...)` handles. A start value greater than or equal to
the end value executes no iterations. The three-handle overload accepts
`init == null` and initializes state to the Java default value; the four-handle
overload requires all four handles, matching Java 17 null validation.

The selected implementation requires the body to carry the complete external
argument list. `start`, `end`/`iterations`, and `init` may accept matching
prefixes of that list. General parameter-list inference beyond this shape is
not claimed.

## Initial `iteratedLoop` Implementation

The selected iterated-loop slice uses body shape `(V, T, A...)V`, with state
first and the current iterator element second:

```text
Iterator<T> iterator(A...)
V init(A...)
V body(V, T, A...)
V iteratedLoop(A... args) {
  Iterator<T> values = iterator(args...);
  V v = init(args...);
  while (values.hasNext()) {
    v = body(v, values.next(), args...);
  }
  return v;
}
```

When `iterator == null`, the result handle takes an `Iterable` as the leading
runtime argument and calls `iterator()` on it. If the body has no external
arguments, the result handle type is `(Iterable)V`. If the body has external
arguments, the first body external argument must be assignable to `Iterable`.

The selected implementation accepts `init == null` and initializes state with
the Java default value for the body return type. It also accepts an explicit
iterator whose parameters are a prefix of the selected external argument list.
If the body has no external arguments and the explicit iterator does, the
iterator parameter list becomes the result handle's external argument list.

## Runtime Structure

- Class loading injects a public native
  `MethodHandles.whileLoop(MethodHandle, MethodHandle, MethodHandle)` overlay
  and a public native
  `MethodHandles.doWhileLoop(MethodHandle, MethodHandle, MethodHandle)` overlay
  plus both public `MethodHandles.countedLoop` overloads and the public
  `MethodHandles.iteratedLoop(MethodHandle, MethodHandle, MethodHandle)`
  overlay into the Java 8 `MethodHandles` class.
- The native entry point delegates to
  `java.lang.invoke.DoppioMethodHandles.whileLoop` or
  `java.lang.invoke.DoppioMethodHandles.doWhileLoop`, or to the corresponding
  `DoppioMethodHandles.countedLoop` or `DoppioMethodHandles.iteratedLoop`
  overload.
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
  Counted-loop coverage includes zero-based iteration with explicit and null
  initializers, zero iterations, reference state, explicit start/end ranges,
  and reversed empty ranges.
- Java fixture coverage in
  `classes/modern_test/Java17MethodHandleIteratedLoop.java`: null-iterator
  `Iterable` dispatch, null-iterator body argument flow, explicit iterator
  handle dispatch, reference state, primitive `int` state with `null`
  initializer defaulting to zero, empty iteration, descriptor strings, and
  selected validation failures for null body, non-`Iterator` iterator return,
  mismatched initializer return, and invalid null-iterator external arguments.
- Kotlin smoke coverage in `classes/kotlin_smoke/MethodHandleSmoke.kt`:
  reflective discovery of `MethodHandles.whileLoop` and
  `MethodHandles.doWhileLoop` plus both `MethodHandles.countedLoop` overloads,
  integer and reference state invocation, null initializer invocation,
  body-first `doWhileLoop` behavior, explicit counted ranges, and descriptor
  checks.

## Remaining Gaps

- `void` body loops are not claimed by the initial slice.
- Predicate and initializer validation is prefix-based but not a complete
  implementation of the generic `loop` effectively-identical parameter-list
  rules.
- The selected `iteratedLoop` slice does not claim `void` body loops, broad
  element/argument adaptation, exact generic `loop` effectively-identical
  parameter-list inference, exact null-iterator validation order beyond the
  tested cases, or exception-flow parity beyond normal `hasNext`/`next`/body
  sequencing.
- Broader `whileLoop`/`doWhileLoop`/`countedLoop`/`iteratedLoop` parity and
  generic `loop` still need separate fixtures and implementation slices.
- The selected `whileLoop` and `doWhileLoop` slices now share validation and
  adapter construction; broader control-flow combinators should reuse that only
  when their argument-flow rules actually match.
