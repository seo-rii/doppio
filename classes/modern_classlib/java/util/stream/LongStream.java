package java.util.stream;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LongSummaryStatistics;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.OptionalLong;
import java.util.PrimitiveIterator;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.BiConsumer;
import java.util.function.LongBinaryOperator;
import java.util.function.LongConsumer;
import java.util.function.LongFunction;
import java.util.function.LongPredicate;
import java.util.function.LongSupplier;
import java.util.function.LongToDoubleFunction;
import java.util.function.LongToIntFunction;
import java.util.function.LongUnaryOperator;
import java.util.function.ObjLongConsumer;
import java.util.function.Supplier;
import java.util.function.ToLongFunction;

public interface LongStream extends BaseStream<Long, LongStream> {
  LongStream filter(LongPredicate predicate);

  LongStream map(LongUnaryOperator mapper);

  <U> Stream<U> mapToObj(LongFunction<? extends U> mapper);

  IntStream mapToInt(LongToIntFunction mapper);

  DoubleStream mapToDouble(LongToDoubleFunction mapper);

  LongStream flatMap(LongFunction<? extends LongStream> mapper);

  default LongStream mapMulti(final LongMapMultiConsumer mapper) {
    Objects.requireNonNull(mapper);
    return flatMap(new LongFunction<LongStream>() {
      public LongStream apply(long value) {
        LongStream.Builder builder = LongStream.builder();
        mapper.accept(value, builder);
        return builder.build();
      }
    });
  }

  LongStream distinct();

  LongStream sorted();

  LongStream peek(LongConsumer action);

  LongStream limit(long maxSize);

  LongStream skip(long n);

  default LongStream takeWhile(final LongPredicate predicate) {
    Objects.requireNonNull(predicate);
    final LongStream self = this;
    final PrimitiveIterator.OfLong source = iterator();
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      private boolean finished;
      private boolean ready;
      private long next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished || !source.hasNext()) {
          return false;
        }
        long candidate = source.nextLong();
        if (!predicate.test(candidate)) {
          finished = true;
          return false;
        }
        next = candidate;
        ready = true;
        return true;
      }

      public long nextLong() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return next;
      }
    };
    return StreamSupport.longStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  default LongStream dropWhile(final LongPredicate predicate) {
    Objects.requireNonNull(predicate);
    final LongStream self = this;
    final PrimitiveIterator.OfLong source = iterator();
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      private boolean dropping = true;
      private boolean ready;
      private long next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (!dropping) {
          return source.hasNext();
        }
        while (source.hasNext()) {
          long candidate = source.nextLong();
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

      public long nextLong() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        if (ready) {
          ready = false;
          return next;
        }
        return source.nextLong();
      }
    };
    return StreamSupport.longStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  void forEach(LongConsumer action);

  void forEachOrdered(LongConsumer action);

  long[] toArray();

  long reduce(long identity, LongBinaryOperator op);

  OptionalLong reduce(LongBinaryOperator op);

  <R> R collect(Supplier<R> supplier, ObjLongConsumer<R> accumulator, BiConsumer<R, R> combiner);

  long sum();

  OptionalLong min();

  OptionalLong max();

  long count();

  OptionalDouble average();

  LongSummaryStatistics summaryStatistics();

  boolean anyMatch(LongPredicate predicate);

  boolean allMatch(LongPredicate predicate);

  boolean noneMatch(LongPredicate predicate);

  OptionalLong findFirst();

  OptionalLong findAny();

  DoubleStream asDoubleStream();

  Stream<Long> boxed();

  LongStream sequential();

  LongStream parallel();

  PrimitiveIterator.OfLong iterator();

  Spliterator.OfLong spliterator();

  public static interface Builder extends LongConsumer {
    void accept(long value);

    default Builder add(long value) {
      accept(value);
      return this;
    }

    LongStream build();
  }

  public static interface LongMapMultiConsumer {
    void accept(long value, LongConsumer sink);
  }

  public static Builder builder() {
    return new Builder() {
      private final ArrayList<Long> values = new ArrayList<Long>();
      private boolean built;

      public void accept(long value) {
        if (built) {
          throw new IllegalStateException();
        }
        values.add(Long.valueOf(value));
      }

      public LongStream build() {
        if (built) {
          throw new IllegalStateException();
        }
        built = true;
        return values.stream().mapToLong(new ToLongFunction<Long>() {
          public long applyAsLong(Long value) {
            return value.longValue();
          }
        });
      }
    };
  }

  public static LongStream empty() {
    return StreamSupport.longStream(Spliterators.emptyLongSpliterator(), false);
  }

  public static LongStream of(long value) {
    return LongStream.of(new long[] { value });
  }

  public static LongStream of(final long... values) {
    Objects.requireNonNull(values);
    return StreamSupport.longStream(Arrays.spliterator(values), false);
  }

  public static LongStream iterate(final long seed, final LongUnaryOperator next) {
    Objects.requireNonNull(next);
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      private long value = seed;
      private boolean first = true;

      public boolean hasNext() {
        return true;
      }

      public long nextLong() {
        if (first) {
          first = false;
          return value;
        }
        value = next.applyAsLong(value);
        return value;
      }
    };
    return StreamSupport.longStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static LongStream iterate(
      final long seed,
      final LongPredicate hasNext,
      final LongUnaryOperator next) {
    Objects.requireNonNull(next);
    Objects.requireNonNull(hasNext);
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      private long value = seed;
      private boolean first = true;
      private boolean ready;
      private boolean finished;
      private long nextValue;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished) {
          return false;
        }
        long candidate = first ? value : next.applyAsLong(value);
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

      public long nextLong() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return nextValue;
      }
    };
    return StreamSupport.longStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static LongStream generate(final LongSupplier supplier) {
    Objects.requireNonNull(supplier);
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      public boolean hasNext() {
        return true;
      }

      public long nextLong() {
        return supplier.getAsLong();
      }
    };
    return StreamSupport.longStream(Spliterators.spliteratorUnknownSize(iterator, 0), false);
  }

  public static LongStream range(final long startInclusive, final long endExclusive) {
    if (startInclusive >= endExclusive) {
      return LongStream.empty();
    }
    long size = endExclusive - startInclusive;
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      private long value = startInclusive;

      public boolean hasNext() {
        return value < endExclusive;
      }

      public long nextLong() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        return value++;
      }
    };
    if (size > 0L) {
      return StreamSupport.longStream(
        Spliterators.spliterator(iterator, size,
            Spliterator.DISTINCT | Spliterator.SORTED | Spliterator.ORDERED | Spliterator.SIZED
            | Spliterator.NONNULL | Spliterator.IMMUTABLE | Spliterator.SUBSIZED),
        false
      );
    }
    return StreamSupport.longStream(
      Spliterators.spliteratorUnknownSize(iterator,
          Spliterator.ORDERED | Spliterator.NONNULL | Spliterator.IMMUTABLE),
      false
    );
  }

  public static LongStream rangeClosed(final long startInclusive, final long endInclusive) {
    if (startInclusive > endInclusive) {
      return LongStream.empty();
    }
    long size = endInclusive - startInclusive + 1L;
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      private long value = startInclusive;
      private boolean hasNext = true;

      public boolean hasNext() {
        return hasNext;
      }

      public long nextLong() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        long result = value;
        if (value == endInclusive) {
          hasNext = false;
        } else {
          value++;
        }
        return result;
      }
    };
    if (size > 0L) {
      return StreamSupport.longStream(
        Spliterators.spliterator(iterator, size,
            Spliterator.DISTINCT | Spliterator.SORTED | Spliterator.ORDERED | Spliterator.SIZED
            | Spliterator.NONNULL | Spliterator.IMMUTABLE | Spliterator.SUBSIZED),
        false
      );
    }
    return StreamSupport.longStream(
      Spliterators.spliteratorUnknownSize(iterator,
          Spliterator.ORDERED | Spliterator.NONNULL | Spliterator.IMMUTABLE),
      false
    );
  }

  public static LongStream concat(final LongStream first, final LongStream second) {
    Objects.requireNonNull(first);
    Objects.requireNonNull(second);
    final PrimitiveIterator.OfLong firstIterator = first.iterator();
    final PrimitiveIterator.OfLong secondIterator = second.iterator();
    PrimitiveIterator.OfLong iterator = new PrimitiveIterator.OfLong() {
      public boolean hasNext() {
        return firstIterator.hasNext() || secondIterator.hasNext();
      }

      public long nextLong() {
        return firstIterator.hasNext() ? firstIterator.nextLong() : secondIterator.nextLong();
      }
    };
    return StreamSupport.longStream(
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
