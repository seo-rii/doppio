package java.time;

import java.util.Objects;

public interface InstantSource {
  static InstantSource system() {
    return SystemInstantSource.INSTANCE;
  }

  static InstantSource tick(InstantSource baseSource, Duration tickDuration) {
    Objects.requireNonNull(baseSource, "baseSource");
    return asInstantSource(Clock.tick(baseSource.withZone(ZoneOffset.UTC), tickDuration));
  }

  static InstantSource fixed(Instant fixedInstant) {
    return asInstantSource(Clock.fixed(fixedInstant, ZoneOffset.UTC));
  }

  static InstantSource offset(InstantSource baseSource, Duration offsetDuration) {
    Objects.requireNonNull(baseSource, "baseSource");
    return asInstantSource(Clock.offset(baseSource.withZone(ZoneOffset.UTC), offsetDuration));
  }

  Instant instant();

  default long millis() {
    return instant().toEpochMilli();
  }

  default Clock withZone(ZoneId zone) {
    return new SourceClock(this, zone);
  }

  private static InstantSource asInstantSource(Clock clock) {
    return (InstantSource) asClock(clock);
  }

  private static Clock asClock(Clock clock) {
    return clock instanceof InstantSource ? clock : new ClockSource(clock);
  }

  final class SystemInstantSource implements InstantSource {
    private static final SystemInstantSource INSTANCE = new SystemInstantSource();

    private SystemInstantSource() {}

    public Instant instant() {
      return Clock.systemUTC().instant();
    }

    public long millis() {
      return System.currentTimeMillis();
    }

    public Clock withZone(ZoneId zone) {
      return asClock(Clock.system(Objects.requireNonNull(zone)));
    }

    public String toString() {
      return "SystemInstantSource";
    }
  }

  final class ClockSource extends Clock implements InstantSource {
    private final Clock clock;

    ClockSource(Clock clock) {
      this.clock = Objects.requireNonNull(clock);
    }

    public ZoneId getZone() {
      return clock.getZone();
    }

    public Clock withZone(ZoneId zone) {
      Clock zoned = clock.withZone(zone);
      return zoned == clock ? this : asClock(zoned);
    }

    public Instant instant() {
      return clock.instant();
    }

    public long millis() {
      return clock.millis();
    }

    public boolean equals(Object obj) {
      return obj instanceof ClockSource && clock.equals(((ClockSource) obj).clock);
    }

    public int hashCode() {
      return clock.hashCode();
    }

    public String toString() {
      return clock.toString();
    }
  }

  final class SourceClock extends Clock implements InstantSource {
    private final InstantSource source;
    private final ZoneId zone;

    SourceClock(InstantSource source, ZoneId zone) {
      this.source = Objects.requireNonNull(source);
      this.zone = Objects.requireNonNull(zone);
    }

    public ZoneId getZone() {
      return zone;
    }

    public Clock withZone(ZoneId zone) {
      Objects.requireNonNull(zone);
      return this.zone.equals(zone) ? this : new SourceClock(source, zone);
    }

    public Instant instant() {
      return source.instant();
    }

    public long millis() {
      return source.millis();
    }

    public boolean equals(Object obj) {
      if (!(obj instanceof SourceClock)) {
        return false;
      }
      SourceClock other = (SourceClock) obj;
      return source.equals(other.source) && zone.equals(other.zone);
    }

    public int hashCode() {
      return Objects.hash(source, zone);
    }

    public String toString() {
      return "SourceClock[" + source + "," + zone + "]";
    }
  }
}
