package java.util.concurrent;

import java.math.BigInteger;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

final class DoppioTimeUnit {
  private static final BigInteger NANOS_PER_SECOND = BigInteger.valueOf(1_000_000_000L);
  private static final BigInteger LONG_MAX = BigInteger.valueOf(Long.MAX_VALUE);
  private static final BigInteger LONG_MIN = BigInteger.valueOf(Long.MIN_VALUE);

  private DoppioTimeUnit() {}

  static ChronoUnit toChronoUnit(TimeUnit unit) {
    switch (unit) {
      case NANOSECONDS:
        return ChronoUnit.NANOS;
      case MICROSECONDS:
        return ChronoUnit.MICROS;
      case MILLISECONDS:
        return ChronoUnit.MILLIS;
      case SECONDS:
        return ChronoUnit.SECONDS;
      case MINUTES:
        return ChronoUnit.MINUTES;
      case HOURS:
        return ChronoUnit.HOURS;
      case DAYS:
        return ChronoUnit.DAYS;
      default:
        throw new AssertionError();
    }
  }

  static TimeUnit of(ChronoUnit chronoUnit) {
    Objects.requireNonNull(chronoUnit, "chronoUnit");
    switch (chronoUnit) {
      case NANOS:
        return TimeUnit.NANOSECONDS;
      case MICROS:
        return TimeUnit.MICROSECONDS;
      case MILLIS:
        return TimeUnit.MILLISECONDS;
      case SECONDS:
        return TimeUnit.SECONDS;
      case MINUTES:
        return TimeUnit.MINUTES;
      case HOURS:
        return TimeUnit.HOURS;
      case DAYS:
        return TimeUnit.DAYS;
      default:
        throw new IllegalArgumentException("No TimeUnit equivalent for " + chronoUnit);
    }
  }

  static long convert(TimeUnit unit, Duration duration) {
    Objects.requireNonNull(duration);
    BigInteger totalNanos = BigInteger.valueOf(duration.getSeconds())
        .multiply(NANOS_PER_SECOND)
        .add(BigInteger.valueOf(duration.getNano()));
    BigInteger converted = totalNanos.divide(BigInteger.valueOf(unit.toNanos(1)));
    if (converted.compareTo(LONG_MAX) > 0) {
      return Long.MAX_VALUE;
    }
    if (converted.compareTo(LONG_MIN) < 0) {
      return Long.MIN_VALUE;
    }
    return converted.longValue();
  }
}
