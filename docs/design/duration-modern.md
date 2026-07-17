# Modern Duration Design

## Status

Implemented for the complete Java 9 `java.time.Duration` surface in scope:
`dividedBy(Duration)`, `toSeconds()`, and the six part accessors. Difficulty:
low for the accessors and medium for exact division and reflection parity.

## Compatibility Boundary

Doppio loads the Java 8 `java.time.Duration` class from `rt.jar`. Replacing that
class would also replace its mature construction, normalization, arithmetic,
parsing, temporal, serialization, and private-field behavior. The modern
implementation must therefore retain the Java 8 class and append only these
ordinary methods to its classfile bytes before parsing:

- `public long dividedBy(Duration)` with descriptor
  `(Ljava/time/Duration;)J`;
- `public long toSeconds()` and `public long toDaysPart()`, each with descriptor
  `()J`;
- `public int toHoursPart()`, `toMinutesPart()`, `toSecondsPart()`,
  `toMillisPart()`, and `toNanosPart()`, each with descriptor `()I`.

The Java 8 class also has a private `toSeconds(): BigDecimal` helper. Java 9
renamed that helper to `toBigDecimalSeconds()` before adding the public
`toSeconds(): long` API. The transformer rewrites the helper's single UTF-8
constant while preserving its constant-pool index, so the existing
`multipliedBy(long)` and `dividedBy(long)` references follow the rename without
changing their bytecode. It then appends the eight public methods.

Each appended method is public, concrete, non-native, and non-synthetic, with a
real parsed slot and no checked exceptions, type parameters, annotations, or
`MethodParameters` attribute. Its bytecode passes the receiver, and the divisor
where applicable, to a package-private static method on
`java.time.DoppioDuration`, then returns with `lreturn` or `ireturn`. The helper
lives in the modern class library and uses only the preserved Java 8
`Duration` public surface. No replacement `Duration` class or slot-less
constant-pool fallback is needed.

## Division Semantics

`dividedBy(Duration)` returns the whole-number quotient of the two exact
durations. The helper must follow the JDK's decimal path rather than use
floating point, fixed-scale rounding, saturation, or wrapping:

1. Reject a null divisor with `Objects.requireNonNull(divisor, "divisor")`.
2. Convert each normalized duration to exact decimal seconds with
   `BigDecimal.valueOf(getSeconds()).add(BigDecimal.valueOf(getNano(), 9))`.
3. Call `divideToIntegralValue` without a `MathContext` or explicit rounding
   mode, which discards the fractional quotient toward zero.
4. Call `longValueExact` on that integral result.

This ordering preserves the JDK's `ArithmeticException` for a zero divisor and
for a quotient outside the signed 64-bit range. In-range boundary quotients,
negative operands, and subsecond divisors remain exact. An arbitrary-precision
nanosecond quotient is mathematically close, but it is not the contract here:
the `BigDecimal` operations, exception behavior, and null message are observable
and should match HotSpot.

## Seconds And Parts

The preserved Java 8 class stores a signed `seconds` value and a normalized
`nanos` adjustment from 0 through 999,999,999. `toSeconds()` returns that stored
seconds value exactly, as `getSeconds()` does; it does not truncate the complete
fractional duration toward zero. The part accessors use Java integer division
and remainder:

- days: `seconds / 86_400`;
- hours: `(seconds / 3_600) % 24`;
- minutes: `(seconds / 60) % 60`;
- seconds: `seconds % 60`;
- milliseconds: `nanos / 1_000_000`;
- nanoseconds: `nanos`.

Negative durations therefore do not produce absolute-value clock fields or
floor-mod fields. For example, `Duration.ofSeconds(-90_062, 500_000_000)`
represents -90,061.5 seconds: `toSeconds()` is `-90062`, while its day, hour,
minute, second, millisecond, and nanosecond parts are `-1`, `-1`, `-1`, `-2`,
`500`, and `500000000`. The coarse parts retain the negative sign through
truncating remainder, while the fractional parts stay non-negative because the
base class already normalized `nanos`.

## Reflection And Method Handles

Appending the methods before classfile parsing makes direct invocation,
`Class.getMethod`, `Class.getDeclaredMethod`, declared-method enumeration, and
`Method.invoke` observe the same definitions. `MethodHandles.Lookup.unreflect`
must likewise produce the exact receiver-first handle types: `(Duration,
Duration)long` for division, `(Duration)long` for the two long accessors, and
`(Duration)int` for the five int accessors. Tests must reject duplicate methods
and native, synthetic, bridge, default, static, or varargs metadata so a future
direct-call fallback cannot silently replace the parsed-method contract.

## Test Gates

`Java9DurationModern` compares Doppio with HotSpot 17 for zero, positive,
negative normalized fractional, and extreme durations. Division coverage
includes positive and negative operands, subsecond truncation toward zero,
null and zero divisors, exact `Long.MIN_VALUE`/`Long.MAX_VALUE` quotients, and
positive and negative quotient overflow. It also keeps the renamed Java 8
private-helper callers under regression.

The fixture compares exact descriptors and modifiers for all eight methods,
declared-method counts, empty exception and annotation metadata, reflective
results and exception causes, and selected unreflected handle types and
results. The full Java 9-26 suite passed locally on 2026-07-17 in 6 minutes 40
seconds. The existing Kotlin and Scala duration compiler smokes passed in 111
and 78 seconds respectively.

Parsed overlays exist only after Doppio loads and transforms the Java 8
`rt.jar`, so static compiler classpath inspection cannot discover them in the
original `rt.jar` or generated `doppio.jar`. Until the compiler-facing
bootstrap artifact tracked by `RISK_REGISTER.md` is available, direct compiler
interop checks require compile-only JDK 11+/17 method metadata; their generated
bytecode must still run against Doppio's parsed overlay.
