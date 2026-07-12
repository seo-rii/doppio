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
  loops where `body` has shape `(V, A...)V`, plus selected `void`
  side-effect loops where `body` has shape `(A...)void`. `pred` accepts a
  prefix of the effective loop argument list and returns `boolean`, and `init`
  is either `null` or accepts a prefix of `(A...)`.
- `doWhileLoop(init, body, pred)`: second slice. It supports the same selected
  non-`void` state variable and `void` side-effect shapes, but body executes
  before the first predicate check.
- `countedLoop(iterations, init, body)` and
  `countedLoop(start, end, init, body)`: third slice. They support a selected
  non-`void` state variable shape with an `int` counter passed after the
  state, plus selected `void` side-effect loops where the counter is the
  leading body parameter.
- `iteratedLoop(iterator, init, body)`: fourth slice. It supports selected
  non-`void` state variable loops where the body has shape `(V, T, A...)V`,
  plus selected `void` side-effect loops where the body has shape
  `(T, A...)void`. The iterator is either `null` and supplied by the leading
  `Iterable` runtime argument, or a handle returning `Iterator`, and `init` is
  either `null` or accepts a prefix of `(A...)`.
- `loop(MethodHandle[]...)`: selected fifth slice. It supports one clause with
  an explicit or `null` `init`, optional `step`, `pred`, and optional `fini`
  handle over one non-`void` loop state variable. A `null` `init` starts from
  the Java default value for the state type inferred from `step`. The inferred
  non-`void` `step` may have no parameters, in which case it ignores the
  current state and replaces it with its return value. A `null` `step` is
  supported when `init` is explicit and preserves the current state.
  When both `init` and `step` are `null`, the selected slice treats the clause
  as a no-state `void` clause whose `pred` and `fini` handles consume matching
  prefixes of the external argument list. For explicit-init state loops,
  `step`, `pred`, and `fini` may consume a matching prefix of the state plus
  external argument list, and a shorter explicit `init` can infer the returned
  handle's external argument list from a longer prefix-compatible `step`,
  `pred`, or `fini` handle. The `fini` handle may be `null` or omitted from the
  selected clause. The selected slice also supports no-state loops where
  `init` and `step` return `void` and all clause handles consume matching
  prefixes of the external argument list. A selected
  multi-clause state-loop slice supports multiple explicit non-`void` state
  variables plus selected `void` clauses. In that selected multi-clause slice,
  a `null` `init` starts a non-`void` state from the Java default value inferred
  from a non-null `step`, a `null` `step` preserves the current state from a
  non-null `init`, a clause with both `init` and `step` null is a `void` clause,
  a `null` `pred` marks a helper clause that does not terminate the loop, and a
  `null` or omitted `fini` returns the selected result type's default value
  when that clause terminates the loop. Clause arrays with only `{ init }`,
  `{ init, step }`, or no handles are accepted as helper clauses. The returned
  handle's external argument list is inferred from prefix-compatible `init`
  handles and from `step`/`pred`/`fini` handles that consume prefixes of the
  effective `(V..., A...)` loop argument list. Selected coverage keeps the
  state and external parameter domains distinct even when their types differ.
  The general multi-clause form remains a later slice.
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

For the selected `void` shape, no state value is threaded. `init`, `pred`, and
`body` consume matching prefixes of the external argument list, and the result
handle returns `void`:

```text
void init(A...)
boolean pred(A...)
void body(A...)
void whileLoop(A... args) {
  init(args...);
  while (pred(args...)) {
    body(args...);
  }
}
```

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

For the selected `void` shape, the same no-state argument flow is used, but
`body(args...)` executes before the first predicate check.

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

For the selected `void` shape, the body shape is `(int, A...)void`; the current
counter is the leading body parameter, no state is threaded, and the result
handle returns `void`.

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

For the selected `void` shape, the body shape is `(T, A...)void`; the current
element is the leading body parameter, no state is threaded, and the result
handle returns `void`.

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
  reversed empty ranges, and selected `void` side-effect loops for
  `whileLoop`, `doWhileLoop`, and `countedLoop`.
- Java fixture coverage in
  `classes/modern_test/Java17MethodHandleIteratedLoop.java`: null-iterator
  `Iterable` dispatch, null-iterator body argument flow, explicit iterator
  handle dispatch, reference state, primitive `int` state with `null`
  initializer defaulting to zero, empty iteration, selected `void` side-effect
  explicit/default iterator loops, descriptor strings, and selected validation
  failures for null body, non-`Iterator` iterator return, mismatched
  initializer return, and invalid null-iterator external arguments.
- Java fixture coverage in
  `classes/modern_test/Java17MethodHandleLoop.java`: selected single-clause
  `loop(MethodHandle[]...)` state flows, including `init -> step -> pred`
  ordering, primitive and reference state, `null init` default-state behavior
  for primitive and reference state, null-init state inference from a
  zero-argument non-`void` step with and without external arguments,
  explicit-init `null step` identity-state behavior, null-init/null-step
  no-state false-predicate exits with and without external prefix arguments,
  explicit prefix-parameter `step`/`pred`/`fini` flows, explicit-init external
  argument inference from longer
  prefix-compatible clause handles, explicit `fini` return adaptation, `null`
  and omitted `fini` void return adaptation, selected no-state loops with
  `void` `init`/`step` handles and with or without external arguments, selected
  multi-clause empty, init-only, and init-step helper clauses, a selected
  two-clause two-state loop where the second predicate exits through its
  `fini`, and a two-state loop with distinct state and external parameter
  domains, descriptor strings, and selected validation failures including
  null-predicate rejection, short-clause missing-predicate rejection,
  null-clause-before-length validation, and finalizer/predicate-before-parameter
  validation ordering.
- Kotlin smoke coverage in
  `classes/kotlin_methodhandle_smoke/MethodHandleSmoke.kt`:
  reflective discovery of `MethodHandles.whileLoop` and
  `MethodHandles.doWhileLoop` plus both `MethodHandles.countedLoop` overloads,
  integer and reference state invocation, null initializer invocation,
  body-first `doWhileLoop` behavior, explicit counted ranges, selected
  `MethodHandles.loop` null-init, null-step, no-state external-prefix
  invocation, explicit-init external argument inference, no-state invocation,
  and descriptor checks.

## Remaining Gaps

- Predicate and initializer validation is prefix-based but not a complete
  implementation of the generic `loop` effectively-identical parameter-list
  rules.
- The selected `loop` slice covers one-clause non-`void` state variables, the
  selected no-state `void init`/`void step` shape, and selected explicit
  multi-clause non-`void` state loops with prefix-compatible clause handles,
  selected `void` clauses, selected `null` initializers, selected `null` steps,
  selected `null` helper predicates, and selected `null` finalizers. Broad
  multi-clause state/no-state mixes beyond the selected fixtures, broad
  null-init plus null-step inference beyond the tested no-state external-prefix
  shape, no-state clauses beyond the selected `void init`/`void step` and
  null-init/null-step shapes, external argument inference beyond the selected
  prefix-compatible shapes, and exact validation ordering beyond the tested
  null/length/finalizer/predicate/parameter precedence remain open.
- The selected `void` loop slices cover simple side-effect loops only; broad
  no-state/state mixes, exact generic `loop` effectively-identical
  parameter-list inference, and full validation ordering are not claimed.
- The selected `iteratedLoop` slice does not claim broad element/argument
  adaptation, exact generic `loop` effectively-identical parameter-list
  inference, exact null-iterator validation order beyond the tested cases, or
  exception-flow parity beyond normal `hasNext`/`next`/body sequencing.
- Broader `whileLoop`/`doWhileLoop`/`countedLoop`/`iteratedLoop` parity and
  generic `loop` still need separate fixtures and implementation slices.
- The selected `whileLoop` and `doWhileLoop` slices now share validation and
  adapter construction; broader control-flow combinators should reuse that only
  when their argument-flow rules actually match.
