package java.util;

import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public final class Optional<T> {
  private static final Optional<?> EMPTY = new Optional<>();

  private final T value;

  private Optional() {
    this.value = null;
  }

  private Optional(T value) {
    this.value = Objects.requireNonNull(value);
  }

  @SuppressWarnings("unchecked")
  public static <T> Optional<T> empty() {
    return (Optional<T>) EMPTY;
  }

  public static <T> Optional<T> of(T value) {
    return new Optional<>(value);
  }

  public static <T> Optional<T> ofNullable(T value) {
    return value == null ? empty() : of(value);
  }

  public T get() {
    if (value == null) {
      throw new NoSuchElementException("No value present");
    }
    return value;
  }

  public boolean isPresent() {
    return value != null;
  }

  public boolean isEmpty() {
    return value == null;
  }

  public void ifPresent(Consumer<? super T> consumer) {
    if (value != null) {
      consumer.accept(value);
    }
  }

  public void ifPresentOrElse(Consumer<? super T> action, Runnable emptyAction) {
    if (value != null) {
      action.accept(value);
    } else {
      emptyAction.run();
    }
  }

  public Optional<T> filter(Predicate<? super T> predicate) {
    Objects.requireNonNull(predicate);
    if (value == null) {
      return this;
    }
    return predicate.test(value) ? this : empty();
  }

  public <U> Optional<U> map(Function<? super T, ? extends U> mapper) {
    Objects.requireNonNull(mapper);
    if (value == null) {
      return empty();
    }
    return Optional.ofNullable(mapper.apply(value));
  }

  @SuppressWarnings("unchecked")
  public <U> Optional<U> flatMap(Function<? super T, ? extends Optional<? extends U>> mapper) {
    Objects.requireNonNull(mapper);
    if (value == null) {
      return empty();
    }
    return (Optional<U>) Objects.requireNonNull(mapper.apply(value));
  }

  @SuppressWarnings("unchecked")
  public Optional<T> or(Supplier<? extends Optional<? extends T>> supplier) {
    Objects.requireNonNull(supplier);
    if (value != null) {
      return this;
    }
    return (Optional<T>) Objects.requireNonNull(supplier.get());
  }

  public Stream<T> stream() {
    if (value == null) {
      return Stream.empty();
    }
    @SuppressWarnings("unchecked")
    Spliterator<T> spliterator = (Spliterator<T>) Spliterators.spliterator(
      new Object[] { value },
      Spliterator.ORDERED | Spliterator.IMMUTABLE
    );
    return StreamSupport.stream(spliterator, false);
  }

  public T orElse(T other) {
    return value != null ? value : other;
  }

  public T orElseGet(Supplier<? extends T> other) {
    return value != null ? value : other.get();
  }

  public T orElseThrow() {
    if (value == null) {
      throw new NoSuchElementException("No value present");
    }
    return value;
  }

  public <X extends Throwable> T orElseThrow(Supplier<? extends X> exceptionSupplier) throws X {
    if (value != null) {
      return value;
    }
    throw exceptionSupplier.get();
  }

  public boolean equals(Object obj) {
    return obj instanceof Optional && Objects.equals(value, ((Optional<?>) obj).value);
  }

  public int hashCode() {
    return Objects.hashCode(value);
  }

  public String toString() {
    return value != null ? "Optional[" + value + "]" : "Optional.empty";
  }
}
