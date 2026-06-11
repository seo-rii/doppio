package java.util;

import java.util.function.IntConsumer;
import java.util.function.IntSupplier;
import java.util.function.Supplier;
import java.util.stream.IntStream;

public final class OptionalInt {
  private static final OptionalInt EMPTY = new OptionalInt();

  private final boolean isPresent;
  private final int value;

  private OptionalInt() {
    this.isPresent = false;
    this.value = 0;
  }

  private OptionalInt(int value) {
    this.isPresent = true;
    this.value = value;
  }

  public static OptionalInt empty() {
    return EMPTY;
  }

  public static OptionalInt of(int value) {
    return new OptionalInt(value);
  }

  public int getAsInt() {
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

  public void ifPresent(IntConsumer consumer) {
    if (isPresent) {
      consumer.accept(value);
    }
  }

  public void ifPresentOrElse(IntConsumer action, Runnable emptyAction) {
    if (isPresent) {
      action.accept(value);
    } else {
      emptyAction.run();
    }
  }

  public IntStream stream() {
    return isPresent ? Arrays.stream(new int[] { value }) : IntStream.empty();
  }

  public int orElse(int other) {
    return isPresent ? value : other;
  }

  public int orElseGet(IntSupplier other) {
    return isPresent ? value : other.getAsInt();
  }

  public int orElseThrow() {
    if (!isPresent) {
      throw new NoSuchElementException("No value present");
    }
    return value;
  }

  public <X extends Throwable> int orElseThrow(Supplier<? extends X> exceptionSupplier) throws X {
    if (isPresent) {
      return value;
    }
    throw exceptionSupplier.get();
  }

  public boolean equals(Object obj) {
    if (!(obj instanceof OptionalInt)) {
      return false;
    }
    OptionalInt other = (OptionalInt) obj;
    return isPresent == other.isPresent && (!isPresent || value == other.value);
  }

  public int hashCode() {
    return isPresent ? Integer.hashCode(value) : 0;
  }

  public String toString() {
    return isPresent ? "OptionalInt[" + value + "]" : "OptionalInt.empty";
  }
}
