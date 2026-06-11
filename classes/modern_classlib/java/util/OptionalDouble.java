package java.util;

import java.util.function.DoubleConsumer;
import java.util.function.DoubleSupplier;
import java.util.function.Supplier;
import java.util.stream.DoubleStream;

public final class OptionalDouble {
  private static final OptionalDouble EMPTY = new OptionalDouble();

  private final boolean isPresent;
  private final double value;

  private OptionalDouble() {
    this.isPresent = false;
    this.value = Double.NaN;
  }

  private OptionalDouble(double value) {
    this.isPresent = true;
    this.value = value;
  }

  public static OptionalDouble empty() {
    return EMPTY;
  }

  public static OptionalDouble of(double value) {
    return new OptionalDouble(value);
  }

  public double getAsDouble() {
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

  public void ifPresent(DoubleConsumer consumer) {
    if (isPresent) {
      consumer.accept(value);
    }
  }

  public void ifPresentOrElse(DoubleConsumer action, Runnable emptyAction) {
    if (isPresent) {
      action.accept(value);
    } else {
      emptyAction.run();
    }
  }

  public DoubleStream stream() {
    return isPresent ? Arrays.stream(new double[] { value }) : DoubleStream.empty();
  }

  public double orElse(double other) {
    return isPresent ? value : other;
  }

  public double orElseGet(DoubleSupplier other) {
    return isPresent ? value : other.getAsDouble();
  }

  public double orElseThrow() {
    if (!isPresent) {
      throw new NoSuchElementException("No value present");
    }
    return value;
  }

  public <X extends Throwable> double orElseThrow(Supplier<? extends X> exceptionSupplier) throws X {
    if (isPresent) {
      return value;
    }
    throw exceptionSupplier.get();
  }

  public boolean equals(Object obj) {
    if (!(obj instanceof OptionalDouble)) {
      return false;
    }
    OptionalDouble other = (OptionalDouble) obj;
    return isPresent == other.isPresent && (!isPresent || Double.compare(value, other.value) == 0);
  }

  public int hashCode() {
    return isPresent ? Double.hashCode(value) : 0;
  }

  public String toString() {
    return isPresent ? "OptionalDouble[" + value + "]" : "OptionalDouble.empty";
  }
}
