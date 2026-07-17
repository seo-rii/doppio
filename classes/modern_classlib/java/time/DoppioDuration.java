package java.time;

import java.math.BigDecimal;
import java.util.Objects;

final class DoppioDuration {
  private DoppioDuration() {}

  private static BigDecimal toBigDecimalSeconds(Duration duration) {
    return BigDecimal.valueOf(duration.getSeconds())
        .add(BigDecimal.valueOf(duration.getNano(), 9));
  }

  static long dividedBy(Duration duration, Duration divisor) {
    Objects.requireNonNull(divisor, "divisor");
    return toBigDecimalSeconds(duration)
        .divideToIntegralValue(toBigDecimalSeconds(divisor))
        .longValueExact();
  }

  static long toSeconds(Duration duration) {
    return duration.getSeconds();
  }

  static long toDaysPart(Duration duration) {
    return duration.toDays();
  }

  static int toHoursPart(Duration duration) {
    return (int) (duration.toHours() % 24);
  }

  static int toMinutesPart(Duration duration) {
    return (int) (duration.toMinutes() % 60);
  }

  static int toSecondsPart(Duration duration) {
    return (int) (duration.getSeconds() % 60);
  }

  static int toMillisPart(Duration duration) {
    return duration.getNano() / 1_000_000;
  }

  static int toNanosPart(Duration duration) {
    return duration.getNano();
  }
}
