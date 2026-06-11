package java.util.stream;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.IntSummaryStatistics;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.OptionalInt;
import java.util.PrimitiveIterator;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.BiConsumer;
import java.util.function.IntBinaryOperator;
import java.util.function.IntConsumer;
import java.util.function.IntFunction;
import java.util.function.IntPredicate;
import java.util.function.IntSupplier;
import java.util.function.IntToDoubleFunction;
import java.util.function.IntToLongFunction;
import java.util.function.IntUnaryOperator;
import java.util.function.ObjIntConsumer;
import java.util.function.Supplier;
import java.util.function.ToIntFunction;

public interface IntStream extends BaseStream<Integer, IntStream> {
  IntStream filter(IntPredicate predicate);

  IntStream map(IntUnaryOperator mapper);

  <U> Stream<U> mapToObj(IntFunction<? extends U> mapper);

  LongStream mapToLong(IntToLongFunction mapper);

  DoubleStream mapToDouble(IntToDoubleFunction mapper);

  IntStream flatMap(IntFunction<? extends IntStream> mapper);

  default IntStream mapMulti(final IntMapMultiConsumer mapper) {
    Objects.requireNonNull(mapper);
    return flatMap(new IntFunction<IntStream>() {
      public IntStream apply(int value) {
        IntStream.Builder builder = IntStream.builder();
        mapper.accept(value, builder);
        return builder.build();
      }
    });
  }

  IntStream distinct();

  IntStream sorted();

  IntStream peek(IntConsumer action);

  IntStream limit(long maxSize);

  IntStream skip(long n);

  default IntStream takeWhile(final IntPredicate predicate) {
    Objects.requireNonNull(predicate);
    final IntStream self = this;
    final PrimitiveIterator.OfInt source = iterator();
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private boolean finished;
      private boolean ready;
      private int next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished || !source.hasNext()) {
          return false;
        }
        int candidate = source.nextInt();
        if (!predicate.test(candidate)) {
          finished = true;
          return false;
        }
        next = candidate;
        ready = true;
        return true;
      }

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return next;
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  default IntStream dropWhile(final IntPredicate predicate) {
    Objects.requireNonNull(predicate);
    final IntStream self = this;
    final PrimitiveIterator.OfInt source = iterator();
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private boolean dropping = true;
      private boolean ready;
      private int next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (!dropping) {
          return source.hasNext();
        }
        while (source.hasNext()) {
          int candidate = source.nextInt();
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

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        if (ready) {
          ready = false;
          return next;
        }
        return source.nextInt();
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  void forEach(IntConsumer action);

  void forEachOrdered(IntConsumer action);

  int[] toArray();

  int reduce(int identity, IntBinaryOperator op);

  OptionalInt reduce(IntBinaryOperator op);

  <R> R collect(Supplier<R> supplier, ObjIntConsumer<R> accumulator, BiConsumer<R, R> combiner);

  int sum();

  OptionalInt min();

  OptionalInt max();

  long count();

  OptionalDouble average();

  IntSummaryStatistics summaryStatistics();

  boolean anyMatch(IntPredicate predicate);

  boolean allMatch(IntPredicate predicate);

  boolean noneMatch(IntPredicate predicate);

  OptionalInt findFirst();

  OptionalInt findAny();

  LongStream asLongStream();

  DoubleStream asDoubleStream();

  Stream<Integer> boxed();

  IntStream sequential();

  IntStream parallel();

  PrimitiveIterator.OfInt iterator();

  Spliterator.OfInt spliterator();

  public static interface Builder extends IntConsumer {
    void accept(int value);

    default Builder add(int value) {
      accept(value);
      return this;
    }

    IntStream build();
  }

  public static interface IntMapMultiConsumer {
    void accept(int value, IntConsumer sink);
  }

  public static Builder builder() {
    return new Builder() {
      private final ArrayList<Integer> values = new ArrayList<Integer>();
      private boolean built;

      public void accept(int value) {
        if (built) {
          throw new IllegalStateException();
        }
        values.add(Integer.valueOf(value));
      }

      public IntStream build() {
        if (built) {
          throw new IllegalStateException();
        }
        built = true;
        return values.stream().mapToInt(new ToIntFunction<Integer>() {
          public int applyAsInt(Integer value) {
            return value.intValue();
          }
        });
      }
    };
  }

  public static IntStream empty() {
    return StreamSupport.intStream(Spliterators.emptyIntSpliterator(), false);
  }

  public static IntStream of(int value) {
    return IntStream.of(new int[] { value });
  }

  public static IntStream of(final int... values) {
    Objects.requireNonNull(values);
    return StreamSupport.intStream(Arrays.spliterator(values), false);
  }

  public static IntStream iterate(final int seed, final IntUnaryOperator next) {
    Objects.requireNonNull(next);
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private int value = seed;
      private boolean first = true;

      public boolean hasNext() {
        return true;
      }

      public int nextInt() {
        if (first) {
          first = false;
          return value;
        }
        value = next.applyAsInt(value);
        return value;
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static IntStream iterate(
      final int seed,
      final IntPredicate hasNext,
      final IntUnaryOperator next) {
    Objects.requireNonNull(next);
    Objects.requireNonNull(hasNext);
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private int value = seed;
      private boolean first = true;
      private boolean ready;
      private boolean finished;
      private int nextValue;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished) {
          return false;
        }
        int candidate = first ? value : next.applyAsInt(value);
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

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return nextValue;
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static IntStream generate(final IntSupplier supplier) {
    Objects.requireNonNull(supplier);
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      public boolean hasNext() {
        return true;
      }

      public int nextInt() {
        return supplier.getAsInt();
      }
    };
    return StreamSupport.intStream(Spliterators.spliteratorUnknownSize(iterator, 0), false);
  }

  public static IntStream range(final int startInclusive, final int endExclusive) {
    if (startInclusive >= endExclusive) {
      return IntStream.empty();
    }
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private int value = startInclusive;

      public boolean hasNext() {
        return value < endExclusive;
      }

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        return value++;
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliterator(iterator, (long) endExclusive - startInclusive,
          Spliterator.DISTINCT | Spliterator.SORTED | Spliterator.ORDERED | Spliterator.SIZED
          | Spliterator.NONNULL | Spliterator.IMMUTABLE | Spliterator.SUBSIZED),
      false
    );
  }

  public static IntStream rangeClosed(final int startInclusive, final int endInclusive) {
    if (startInclusive > endInclusive) {
      return IntStream.empty();
    }
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private long value = startInclusive;

      public boolean hasNext() {
        return value <= endInclusive;
      }

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        return (int) value++;
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliterator(iterator, (long) endInclusive - startInclusive + 1L,
          Spliterator.DISTINCT | Spliterator.SORTED | Spliterator.ORDERED | Spliterator.SIZED
          | Spliterator.NONNULL | Spliterator.IMMUTABLE | Spliterator.SUBSIZED),
      false
    );
  }

  public static IntStream concat(final IntStream first, final IntStream second) {
    Objects.requireNonNull(first);
    Objects.requireNonNull(second);
    final PrimitiveIterator.OfInt firstIterator = first.iterator();
    final PrimitiveIterator.OfInt secondIterator = second.iterator();
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      public boolean hasNext() {
        return firstIterator.hasNext() || secondIterator.hasNext();
      }

      public int nextInt() {
        return firstIterator.hasNext() ? firstIterator.nextInt() : secondIterator.nextInt();
      }
    };
    return StreamSupport.intStream(
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
