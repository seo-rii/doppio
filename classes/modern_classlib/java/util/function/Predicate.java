package java.util.function;

import java.util.Objects;

@FunctionalInterface
public interface Predicate<T> {
  boolean test(T t);

  default Predicate<T> and(final Predicate<? super T> other) {
    Objects.requireNonNull(other);
    final Predicate<T> self = this;
    return new Predicate<T>() {
      public boolean test(T value) {
        return self.test(value) && other.test(value);
      }
    };
  }

  default Predicate<T> negate() {
    final Predicate<T> self = this;
    return new Predicate<T>() {
      public boolean test(T value) {
        return !self.test(value);
      }
    };
  }

  default Predicate<T> or(final Predicate<? super T> other) {
    Objects.requireNonNull(other);
    final Predicate<T> self = this;
    return new Predicate<T>() {
      public boolean test(T value) {
        return self.test(value) || other.test(value);
      }
    };
  }

  static <T> Predicate<T> isEqual(final Object targetRef) {
    return new Predicate<T>() {
      public boolean test(T value) {
        return Objects.equals(value, targetRef);
      }
    };
  }

  @SuppressWarnings("unchecked")
  static <T> Predicate<T> not(Predicate<? super T> target) {
    Objects.requireNonNull(target);
    return ((Predicate<T>) target).negate();
  }
}
