package classes.modern_test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.InstantSource;
import java.time.ZoneId;

public class Java17InstantSource {
  private static final class CountingSource implements InstantSource {
    private final Instant instant;
    private int calls;

    CountingSource(Instant instant) {
      this.instant = instant;
    }

    public Instant instant() {
      calls++;
      return instant;
    }
  }

  public static void main(String[] args) {
    Instant fixedInstant = Instant.parse("2020-01-02T03:04:05.123456789Z");
    InstantSource fixed = InstantSource.fixed(fixedInstant);
    System.out.println(fixed.instant());
    System.out.println(fixed.millis());
    System.out.println(fixed instanceof Clock);
    System.out.println(fixed.withZone(ZoneId.of("Asia/Seoul")).instant());
    System.out.println(fixed.withZone(ZoneId.of("Asia/Seoul")).getZone());
    System.out.println(fixed.withZone(ZoneId.of("UTC")) == fixed.withZone(ZoneId.of("UTC")));
    System.out.println(fixed.toString());
    System.out.println(fixed.equals(InstantSource.fixed(fixedInstant)));
    System.out.println(fixed.hashCode() == InstantSource.fixed(fixedInstant).hashCode());
    System.out.println(fixed.withZone(ZoneId.of("UTC")).toString());
    System.out.println(fixed.withZone(ZoneId.of("UTC")).equals(fixed));
    System.out.println(fixed.withZone(ZoneId.of("Asia/Seoul")).equals(
        Clock.fixed(fixedInstant, ZoneId.of("Asia/Seoul"))));

    System.out.println(InstantSource.offset(fixed, Duration.ZERO) == fixed);
    InstantSource offsetFive = InstantSource.offset(fixed, Duration.ofSeconds(5));
    System.out.println(offsetFive.instant());
    System.out.println(offsetFive.toString());
    System.out.println(offsetFive.equals(InstantSource.offset(fixed, Duration.ofSeconds(5))));
    System.out.println(InstantSource.offset(fixed, Duration.ofNanos(-123456789L)).instant());

    System.out.println(InstantSource.tick(fixed, Duration.ZERO) == fixed);
    System.out.println(InstantSource.tick(fixed, Duration.ofNanos(1L)) == fixed);
    InstantSource tickTen = InstantSource.tick(fixed, Duration.ofSeconds(10L));
    System.out.println(tickTen.instant());
    System.out.println(tickTen.toString());
    System.out.println(tickTen.equals(InstantSource.tick(fixed, Duration.ofSeconds(10L))));
    System.out.println(InstantSource.tick(fixed, Duration.ofMillis(250L)).instant());

    CountingSource custom = new CountingSource(fixedInstant);
    InstantSource customOffsetZero = InstantSource.offset(custom, Duration.ZERO);
    InstantSource customTickZero = InstantSource.tick(custom, Duration.ZERO);
    System.out.println(customOffsetZero == custom);
    System.out.println(customTickZero == custom);
    System.out.println(custom.withZone(ZoneId.of("UTC")) instanceof InstantSource);
    System.out.println(custom.withZone(ZoneId.of("Asia/Seoul")).getZone());
    System.out.println(custom.withZone(ZoneId.of("UTC")).instant());
    System.out.println(custom.withZone(ZoneId.of("UTC")).millis());
    System.out.println(custom.calls);

    InstantSource system = InstantSource.system();
    System.out.println(system instanceof Clock);
    System.out.println(system.toString());
    System.out.println(system == InstantSource.system());
    System.out.println(system.instant().getEpochSecond() > 0L);
    System.out.println(system.millis() > 0L);
    System.out.println(system.withZone(ZoneId.of("UTC")).getZone());
    System.out.println(system.withZone(ZoneId.of("UTC")) instanceof InstantSource);
    System.out.println(InstantSource.tick(system, Duration.ZERO) == system);

    try {
      InstantSource.fixed(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      InstantSource.offset(null, Duration.ZERO);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      InstantSource.offset(fixed, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      InstantSource.tick(null, Duration.ofSeconds(1L));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      InstantSource.tick(fixed, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      InstantSource.tick(fixed, Duration.ofNanos(7L));
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      InstantSource.tick(fixed, Duration.ofNanos(-1L));
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      fixed.withZone(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
