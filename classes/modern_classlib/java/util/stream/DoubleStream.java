package java.util.stream;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.DoubleSummaryStatistics;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.PrimitiveIterator;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.BiConsumer;
import java.util.function.DoubleBinaryOperator;
import java.util.function.DoubleConsumer;
import java.util.function.DoubleFunction;
import java.util.function.DoublePredicate;
import java.util.function.DoubleSupplier;
import java.util.function.DoubleToIntFunction;
import java.util.function.DoubleToLongFunction;
import java.util.function.DoubleUnaryOperator;
import java.util.function.ObjDoubleConsumer;
import java.util.function.Supplier;
import java.util.function.ToDoubleFunction;

public interface DoubleStream extends BaseStream<Double, DoubleStream> {
  DoubleStream filter(DoublePredicate predicate);

  DoubleStream map(DoubleUnaryOperator mapper);

  <U> Stream<U> mapToObj(DoubleFunction<? extends U> mapper);

  IntStream mapToInt(DoubleToIntFunction mapper);

  LongStream mapToLong(DoubleToLongFunction mapper);

  DoubleStream flatMap(DoubleFunction<? extends DoubleStream> mapper);

  default DoubleStream mapMulti(final DoubleMapMultiConsumer mapper) {
    Objects.requireNonNull(mapper);
    return flatMap(new DoubleFunction<DoubleStream>() {
      public DoubleStream apply(double value) {
        DoubleStream.Builder builder = DoubleStream.builder();
        mapper.accept(value, builder);
        return builder.build();
      }
    });
  }

  DoubleStream distinct();

  DoubleStream sorted();

  DoubleStream peek(DoubleConsumer action);

  DoubleStream limit(long maxSize);

  DoubleStream skip(long n);

  default DoubleStream takeWhile(final DoublePredicate predicate) {
    Objects.requireNonNull(predicate);
    final DoubleStream self = this;
    final PrimitiveIterator.OfDouble source = iterator();
    PrimitiveIterator.OfDouble iterator = new PrimitiveIterator.OfDouble() {
      private boolean finished;
      private boolean ready;
      private double next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished || !source.hasNext()) {
          return false;
        }
        double candidate = source.nextDouble();
        if (!predicate.test(candidate)) {
          finished = true;
          return false;
        }
        next = candidate;
        ready = true;
        return true;
      }

      public double nextDouble() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return next;
      }
    };
    return StreamSupport.doubleStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  default DoubleStream dropWhile(final DoublePredicate predicate) {
    Objects.requireNonNull(predicate);
    final DoubleStream self = this;
    final PrimitiveIterator.OfDouble source = iterator();
    PrimitiveIterator.OfDouble iterator = new PrimitiveIterator.OfDouble() {
      private boolean dropping = true;
      private boolean ready;
      private double next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (!dropping) {
          return source.hasNext();
        }
        while (source.hasNext()) {
          double candidate = source.nextDouble();
          if (!predicate.test(candidate)) {
            next = candidate;
            ready = true;
            dropping = false;
            return true;
          }
        }
        dropping = false;
        return false;
      }

      public double nextDouble() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        if (ready) {
          ready = false;
          return next;
        }
        return source.nextDouble();
      }
    };
    return StreamSupport.doubleStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  void forEach(DoubleConsumer action);

  void forEachOrdered(DoubleConsumer action);

  double[] toArray();

  double reduce(double identity, DoubleBinaryOperator op);

  OptionalDouble reduce(DoubleBinaryOperator op);

  <R> R collect(Supplier<R> supplier, ObjDoubleConsumer<R> accumulator, BiConsumer<R, R> combiner);

  double sum();

  OptionalDouble min();

  OptionalDouble max();

  long count();

  OptionalDouble average();

  DoubleSummaryStatistics summaryStatistics();

  boolean anyMatch(DoublePredicate predicate);

  boolean allMatch(DoublePredicate predicate);

  boolean noneMatch(DoublePredicate predicate);

  OptionalDouble findFirst();

  OptionalDouble findAny();

  Stream<Double> boxed();

  DoubleStream sequential();

  DoubleStream parallel();

  PrimitiveIterator.OfDouble iterator();

  Spliterator.OfDouble spliterator();

  public static interface Builder extends DoubleConsumer {
    void accept(double value);

    default Builder add(double value) {
      accept(value);
      return this;
    }

    DoubleStream build();
  }

  public static interface DoubleMapMultiConsumer {
    void accept(double value, DoubleConsumer sink);
  }

  public static Builder builder() {
    return new Builder() {
      private final ArrayList<Double> values = new ArrayList<Double>();
      private boolean built;

      public void accept(double value) {
        if (built) {
          throw new IllegalStateException();
        }
        values.add(Double.valueOf(value));
      }

      public DoubleStream build() {
        if (built) {
          throw new IllegalStateException();
        }
        built = true;
        return values.stream().mapToDouble(new ToDoubleFunction<Double>() {
          public double applyAsDouble(Double value) {
            return value.doubleValue();
          }
        });
      }
    };
  }

  public static DoubleStream empty() {
    return StreamSupport.doubleStream(Spliterators.emptyDoubleSpliterator(), false);
  }

  public static DoubleStream of(double value) {
    return DoubleStream.of(new double[] { value });
  }

  public static DoubleStream of(final double... values) {
    Objects.requireNonNull(values);
    return StreamSupport.doubleStream(Arrays.spliterator(values), false);
  }

  public static DoubleStream iterate(final double seed, final DoubleUnaryOperator next) {
    Objects.requireNonNull(next);
    PrimitiveIterator.OfDouble iterator = new PrimitiveIterator.OfDouble() {
      private double value = seed;
      private boolean first = true;

      public boolean hasNext() {
        return true;
      }

      public double nextDouble() {
        if (first) {
          first = false;
          return value;
        }
        value = next.applyAsDouble(value);
        return value;
      }
    };
    return StreamSupport.doubleStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static DoubleStream iterate(
      final double seed,
      final DoublePredicate hasNext,
      final DoubleUnaryOperator next) {
    Objects.requireNonNull(next);
    Objects.requireNonNull(hasNext);
    PrimitiveIterator.OfDouble iterator = new PrimitiveIterator.OfDouble() {
      private double value = seed;
      private boolean first = true;
      private boolean ready;
      private boolean finished;
      private double nextValue;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished) {
          return false;
        }
        double candidate = first ? value : next.applyAsDouble(value);
        first = false;
        if (!hasNext.test(candidate)) {
          finished = true;
          return false;
        }
        value = candidate;
        nextValue = candidate;
        ready = true;
        return true;
      }

      public double nextDouble() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return nextValue;
      }
    };
    return StreamSupport.doubleStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static DoubleStream generate(final DoubleSupplier supplier) {
    Objects.requireNonNull(supplier);
    PrimitiveIterator.OfDouble iterator = new PrimitiveIterator.OfDouble() {
      public boolean hasNext() {
        return true;
      }

      public double nextDouble() {
        return supplier.getAsDouble();
      }
    };
    return StreamSupport.doubleStream(Spliterators.spliteratorUnknownSize(iterator, 0), false);
  }

  public static DoubleStream concat(final DoubleStream first, final DoubleStream second) {
    Objects.requireNonNull(first);
    Objects.requireNonNull(second);
    final PrimitiveIterator.OfDouble firstIterator = first.iterator();
    final PrimitiveIterator.OfDouble secondIterator = second.iterator();
    PrimitiveIterator.OfDouble iterator = new PrimitiveIterator.OfDouble() {
      public boolean hasNext() {
        return firstIterator.hasNext() || secondIterator.hasNext();
      }

      public double nextDouble() {
        return firstIterator.hasNext() ? firstIterator.nextDouble() : secondIterator.nextDouble();
      }
    };
    return StreamSupport.doubleStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      first.isParallel() || second.isParallel()
    ).onClose(new Runnable() {
      public void run() {
        Throwable thrown = null;
        try {
          first.close();
        } catch (Throwable t) {
          thrown = t;
        }
        try {
          second.close();
        } catch (Throwable t) {
          if (thrown == null) {
            thrown = t;
          } else if (thrown != t) {
            thrown.addSuppressed(t);
          }
        }
        if (thrown instanceof RuntimeException) {
          throw (RuntimeException) thrown;
        }
        if (thrown instanceof Error) {
          throw (Error) thrown;
        }
        if (thrown != null) {
          throw new RuntimeException(thrown);
        }
      }
    });
  }
}
