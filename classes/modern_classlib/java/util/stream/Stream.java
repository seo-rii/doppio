package java.util.stream;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.BinaryOperator;
import java.util.function.Consumer;
import java.util.function.DoubleConsumer;
import java.util.function.Function;
import java.util.function.IntConsumer;
import java.util.function.IntFunction;
import java.util.function.LongConsumer;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.function.ToDoubleFunction;
import java.util.function.ToIntFunction;
import java.util.function.ToLongFunction;
import java.util.function.UnaryOperator;

public interface Stream<T> extends BaseStream<T, Stream<T>> {
  Stream<T> filter(Predicate<? super T> predicate);

  <R> Stream<R> map(Function<? super T, ? extends R> mapper);

  IntStream mapToInt(ToIntFunction<? super T> mapper);

  LongStream mapToLong(ToLongFunction<? super T> mapper);

  DoubleStream mapToDouble(ToDoubleFunction<? super T> mapper);

  <R> Stream<R> flatMap(Function<? super T, ? extends Stream<? extends R>> mapper);

  IntStream flatMapToInt(Function<? super T, ? extends IntStream> mapper);

  LongStream flatMapToLong(Function<? super T, ? extends LongStream> mapper);

  DoubleStream flatMapToDouble(Function<? super T, ? extends DoubleStream> mapper);

  default <R> Stream<R> mapMulti(final BiConsumer<? super T, ? super Consumer<R>> mapper) {
    Objects.requireNonNull(mapper);
    return flatMap(new Function<T, Stream<? extends R>>() {
      public Stream<? extends R> apply(T value) {
        final ArrayList<R> values = new ArrayList<R>();
        mapper.accept(value, new Consumer<R>() {
          public void accept(R mapped) {
            values.add(mapped);
          }
        });
        return values.stream();
      }
    });
  }

  default IntStream mapMultiToInt(final BiConsumer<? super T, ? super IntConsumer> mapper) {
    Objects.requireNonNull(mapper);
    return flatMapToInt(new Function<T, IntStream>() {
      public IntStream apply(T value) {
        IntStream.Builder builder = IntStream.builder();
        mapper.accept(value, builder);
        return builder.build();
      }
    });
  }

  default LongStream mapMultiToLong(final BiConsumer<? super T, ? super LongConsumer> mapper) {
    Objects.requireNonNull(mapper);
    return flatMapToLong(new Function<T, LongStream>() {
      public LongStream apply(T value) {
        LongStream.Builder builder = LongStream.builder();
        mapper.accept(value, builder);
        return builder.build();
      }
    });
  }

  default DoubleStream mapMultiToDouble(final BiConsumer<? super T, ? super DoubleConsumer> mapper) {
    Objects.requireNonNull(mapper);
    return flatMapToDouble(new Function<T, DoubleStream>() {
      public DoubleStream apply(T value) {
        DoubleStream.Builder builder = DoubleStream.builder();
        mapper.accept(value, builder);
        return builder.build();
      }
    });
  }

  Stream<T> distinct();

  Stream<T> sorted();

  Stream<T> sorted(Comparator<? super T> comparator);

  Stream<T> peek(Consumer<? super T> action);

  Stream<T> limit(long maxSize);

  Stream<T> skip(long n);

  default Stream<T> takeWhile(final Predicate<? super T> predicate) {
    Objects.requireNonNull(predicate);
    final Stream<T> self = this;
    final Iterator<T> source = iterator();
    Iterator<T> iterator = new Iterator<T>() {
      private boolean finished;
      private boolean ready;
      private T next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished || !source.hasNext()) {
          return false;
        }
        T candidate = source.next();
        if (!predicate.test(candidate)) {
          finished = true;
          return false;
        }
        next = candidate;
        ready = true;
        return true;
      }

      public T next() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return next;
      }
    };
    return StreamSupport.stream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  default Stream<T> dropWhile(final Predicate<? super T> predicate) {
    Objects.requireNonNull(predicate);
    final Stream<T> self = this;
    final Iterator<T> source = iterator();
    Iterator<T> iterator = new Iterator<T>() {
      private boolean dropping = true;
      private boolean ready;
      private T next;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (!dropping) {
          return source.hasNext();
        }
        while (source.hasNext()) {
          T candidate = source.next();
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

      public T next() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        if (ready) {
          ready = false;
          return next;
        }
        return source.next();
      }
    };
    return StreamSupport.stream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      isParallel()
    ).onClose(new Runnable() {
      public void run() {
        self.close();
      }
    });
  }

  void forEach(Consumer<? super T> action);

  void forEachOrdered(Consumer<? super T> action);

  Object[] toArray();

  <A> A[] toArray(IntFunction<A[]> generator);

  T reduce(T identity, BinaryOperator<T> accumulator);

  Optional<T> reduce(BinaryOperator<T> accumulator);

  <U> U reduce(U identity, BiFunction<U, ? super T, U> accumulator, BinaryOperator<U> combiner);

  <R> R collect(Supplier<R> supplier, BiConsumer<R, ? super T> accumulator, BiConsumer<R, R> combiner);

  <R, A> R collect(Collector<? super T, A, R> collector);

  default List<T> toList() {
    Object[] values = toArray();
    ArrayList<T> list = new ArrayList<T>(values.length);
    for (Object value : values) {
      list.add((T) value);
    }
    return Collections.unmodifiableList(list);
  }

  Optional<T> min(Comparator<? super T> comparator);

  Optional<T> max(Comparator<? super T> comparator);

  long count();

  boolean anyMatch(Predicate<? super T> predicate);

  boolean allMatch(Predicate<? super T> predicate);

  boolean noneMatch(Predicate<? super T> predicate);

  Optional<T> findFirst();

  Optional<T> findAny();

  public static interface Builder<T> extends Consumer<T> {
    void accept(T value);

    default Builder<T> add(T value) {
      accept(value);
      return this;
    }

    Stream<T> build();
  }

  public static <T> Builder<T> builder() {
    return new Builder<T>() {
      private final ArrayList<T> values = new ArrayList<T>();
      private boolean built;

      public void accept(T value) {
        if (built) {
          throw new IllegalStateException();
        }
        values.add(value);
      }

      public Stream<T> build() {
        if (built) {
          throw new IllegalStateException();
        }
        built = true;
        return values.stream();
      }
    };
  }

  public static <T> Stream<T> empty() {
    return StreamSupport.stream(Spliterators.<T>emptySpliterator(), false);
  }

  public static <T> Stream<T> of(T value) {
    return Collections.singletonList(value).stream();
  }

  public static <T> Stream<T> ofNullable(T value) {
    return value == null ? Stream.<T>empty() : Stream.of(value);
  }

  public static <T> Stream<T> of(T... values) {
    return Arrays.stream(values);
  }

  public static <T> Stream<T> iterate(final T seed, final UnaryOperator<T> next) {
    Objects.requireNonNull(next);
    Iterator<T> iterator = new Iterator<T>() {
      private T value = seed;
      private boolean first = true;

      public boolean hasNext() {
        return true;
      }

      public T next() {
        if (first) {
          first = false;
          return value;
        }
        value = next.apply(value);
        return value;
      }
    };
    return StreamSupport.stream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static <T> Stream<T> iterate(
      final T seed,
      final Predicate<? super T> hasNext,
      final UnaryOperator<T> next) {
    Objects.requireNonNull(next);
    Objects.requireNonNull(hasNext);
    Iterator<T> iterator = new Iterator<T>() {
      private T value = seed;
      private boolean first = true;
      private boolean ready;
      private boolean finished;
      private T nextValue;

      public boolean hasNext() {
        if (ready) {
          return true;
        }
        if (finished) {
          return false;
        }
        T candidate = first ? value : next.apply(value);
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

      public T next() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        ready = false;
        return nextValue;
      }
    };
    return StreamSupport.stream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.IMMUTABLE),
      false
    );
  }

  public static <T> Stream<T> generate(final Supplier<? extends T> supplier) {
    Objects.requireNonNull(supplier);
    Iterator<T> iterator = new Iterator<T>() {
      public boolean hasNext() {
        return true;
      }

      public T next() {
        return supplier.get();
      }
    };
    return StreamSupport.stream(Spliterators.spliteratorUnknownSize(iterator, 0), false);
  }

  public static <T> Stream<T> concat(final Stream<? extends T> first, final Stream<? extends T> second) {
    Objects.requireNonNull(first);
    Objects.requireNonNull(second);
    final Iterator<? extends T> firstIterator = first.iterator();
    final Iterator<? extends T> secondIterator = second.iterator();
    Iterator<T> iterator = new Iterator<T>() {
      public boolean hasNext() {
        return firstIterator.hasNext() || secondIterator.hasNext();
      }

      public T next() {
        return firstIterator.hasNext() ? firstIterator.next() : secondIterator.next();
      }
    };
    return StreamSupport.stream(
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
