package java.util;

import java.util.function.LongConsumer;
import java.util.function.LongSupplier;
import java.util.function.Supplier;
import java.util.stream.LongStream;

public final class OptionalLong {
  private static final OptionalLong EMPTY = new OptionalLong();

  private final boolean isPresent;
  private final long value;

  private OptionalLong() {
    this.isPresent = false;
    this.value = 0L;
  }

  private OptionalLong(long value) {
    this.isPresent = true;
    this.value = value;
  }

  public static OptionalLong empty() {
    return EMPTY;
  }

  public static OptionalLong of(long value) {
    return new OptionalLong(value);
  }

  public long getAsLong() {
    if (!isPresent) {
      throw new NoSuchElementException("No value present");
    }
    return value;
  }

  public boolean isPresent() {
    return isPresent;
  }

  public boolean isEmpty() {
    return !isPresent;
  }

  public void ifPresent(LongConsumer consumer) {
    if (isPresent) {
      consumer.accept(value);
    }
  }

  public void ifPresentOrElse(LongConsumer action, Runnable emptyAction) {
    if (isPresent) {
      action.accept(value);
    } else {
      emptyAction.run();
    }
  }

  public LongStream stream() {
    return isPresent ? Arrays.stream(new long[] { value }) : LongStream.empty();
  }

  public long orElse(long other) {
    return isPresent ? value : other;
  }

  public long orElseGet(LongSupplier other) {
    return isPresent ? value : other.getAsLong();
  }

  public long orElseThrow() {
    if (!isPresent) {
      throw new NoSuchElementException("No value present");
    }
    return value;
  }

  public <X extends Throwable> long orElseThrow(Supplier<? extends X> exceptionSupplier) throws X {
    if (isPresent) {
      return value;
    }
    throw exceptionSupplier.get();
  }

  public boolean equals(Object obj) {
    if (!(obj instanceof OptionalLong)) {
      return false;
    }
    OptionalLong other = (OptionalLong) obj;
    return isPresent == other.isPresent && (!isPresent || value == other.value);
  }

  public int hashCode() {
    return isPresent ? Long.hashCode(value) : 0;
  }

  public String toString() {
    return isPresent ? "OptionalLong[" + value + "]" : "OptionalLong.empty";
  }
}
