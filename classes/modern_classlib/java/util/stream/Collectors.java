package java.util.stream;

import java.util.ArrayList;
import java.util.AbstractMap;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.DoubleSummaryStatistics;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IntSummaryStatistics;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.LongSummaryStatistics;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.StringJoiner;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.BinaryOperator;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.function.ToDoubleFunction;
import java.util.function.ToIntFunction;
import java.util.function.ToLongFunction;

public final class Collectors {
  static final Set<Collector.Characteristics> CH_CONCURRENT_ID =
      Collections.unmodifiableSet(EnumSet.of(
          Collector.Characteristics.CONCURRENT,
          Collector.Characteristics.UNORDERED,
          Collector.Characteristics.IDENTITY_FINISH));
  static final Set<Collector.Characteristics> CH_CONCURRENT_NOID =
      Collections.unmodifiableSet(EnumSet.of(
          Collector.Characteristics.CONCURRENT,
          Collector.Characteristics.UNORDERED));
  static final Set<Collector.Characteristics> CH_ID =
      Collections.unmodifiableSet(EnumSet.of(Collector.Characteristics.IDENTITY_FINISH));
  static final Set<Collector.Characteristics> CH_UNORDERED_ID =
      Collections.unmodifiableSet(EnumSet.of(
          Collector.Characteristics.UNORDERED,
          Collector.Characteristics.IDENTITY_FINISH));
  static final Set<Collector.Characteristics> CH_NOID =
      Collections.emptySet();
  static final Set<Collector.Characteristics> CH_UNORDERED_NOID =
      Collections.unmodifiableSet(EnumSet.of(Collector.Characteristics.UNORDERED));
  private static final Function<Object, Object> IDENTITY_FINISH = new Function<Object, Object>() {
    public Object apply(Object value) {
      return value;
    }
  };

  private Collectors() {}

  public static <T, C extends Collection<T>> Collector<T, ?, C> toCollection(
      final Supplier<C> collectionFactory) {
    Objects.requireNonNull(collectionFactory);
    return Collector.of(
      collectionFactory,
      new BiConsumer<C, T>() {
        public void accept(C collection, T value) {
          collection.add(value);
        }
      },
      new BinaryOperator<C>() {
        public C apply(C left, C right) {
          left.addAll(right);
          return left;
        }
      },
      Collector.Characteristics.IDENTITY_FINISH
    );
  }

  public static <T> Collector<T, ?, List<T>> toList() {
    return toCollection(new Supplier<List<T>>() {
      public List<T> get() {
        return new ArrayList<T>();
      }
    });
  }

  public static <T> Collector<T, ?, List<T>> toUnmodifiableList() {
    return Collector.of(
      new Supplier<List<T>>() {
        public List<T> get() {
          return new ArrayList<T>();
        }
      },
      new BiConsumer<List<T>, T>() {
        public void accept(List<T> list, T value) {
          list.add(Objects.requireNonNull(value));
        }
      },
      new BinaryOperator<List<T>>() {
        public List<T> apply(List<T> left, List<T> right) {
          left.addAll(right);
          return left;
        }
      },
      new Function<List<T>, List<T>>() {
        public List<T> apply(List<T> list) {
          return List.copyOf(list);
        }
      }
    );
  }

  public static <T> Collector<T, ?, Set<T>> toSet() {
    return Collector.of(
      new Supplier<Set<T>>() {
        public Set<T> get() {
          return new HashSet<T>();
        }
      },
      new BiConsumer<Set<T>, T>() {
        public void accept(Set<T> set, T value) {
          set.add(value);
        }
      },
      new BinaryOperator<Set<T>>() {
        public Set<T> apply(Set<T> left, Set<T> right) {
          left.addAll(right);
          return left;
        }
      },
      Collector.Characteristics.UNORDERED,
      Collector.Characteristics.IDENTITY_FINISH
    );
  }

  public static <T> Collector<T, ?, Set<T>> toUnmodifiableSet() {
    return Collector.of(
      new Supplier<Set<T>>() {
        public Set<T> get() {
          return new HashSet<T>();
        }
      },
      new BiConsumer<Set<T>, T>() {
        public void accept(Set<T> set, T value) {
          set.add(Objects.requireNonNull(value));
        }
      },
      new BinaryOperator<Set<T>>() {
        public Set<T> apply(Set<T> left, Set<T> right) {
          left.addAll(right);
          return left;
        }
      },
      new Function<Set<T>, Set<T>>() {
        public Set<T> apply(Set<T> set) {
          return Set.copyOf(set);
        }
      },
      Collector.Characteristics.UNORDERED
    );
  }

  public static Collector<CharSequence, ?, String> joining() {
    return joining("", "", "");
  }

  public static Collector<CharSequence, ?, String> joining(CharSequence delimiter) {
    return joining(delimiter, "", "");
  }

  public static Collector<CharSequence, ?, String> joining(
      final CharSequence delimiter,
      final CharSequence prefix,
      final CharSequence suffix) {
    Objects.requireNonNull(delimiter);
    Objects.requireNonNull(prefix);
    Objects.requireNonNull(suffix);
    return Collector.of(
      new Supplier<StringJoiner>() {
        public StringJoiner get() {
          return new StringJoiner(delimiter, prefix, suffix);
        }
      },
      new BiConsumer<StringJoiner, CharSequence>() {
        public void accept(StringJoiner joiner, CharSequence value) {
          joiner.add(value);
        }
      },
      new BinaryOperator<StringJoiner>() {
        public StringJoiner apply(StringJoiner left, StringJoiner right) {
          return left.merge(right);
        }
      },
      new Function<StringJoiner, String>() {
        public String apply(StringJoiner joiner) {
          return joiner.toString();
        }
      }
    );
  }

  public static <T, U, A, R> Collector<T, ?, R> mapping(
      final Function<? super T, ? extends U> mapper,
      Collector<? super U, A, R> downstream) {
    final Collector collector = (Collector) downstream;
    final BiConsumer downstreamAccumulator = collector.accumulator();
    return new CollectorImpl<T, Object, R>(
      collector.supplier(),
      new BiConsumer<Object, T>() {
        public void accept(Object container, T value) {
          downstreamAccumulator.accept(container, mapper.apply(value));
        }
      },
      collector.combiner(),
      collector.finisher(),
      collector.characteristics()
    );
  }

  public static <T, U, A, R> Collector<T, ?, R> flatMapping(
      final Function<? super T, ? extends Stream<? extends U>> mapper,
      Collector<? super U, A, R> downstream) {
    final Collector collector = (Collector) downstream;
    final BiConsumer downstreamAccumulator = collector.accumulator();
    return new CollectorImpl<T, Object, R>(
      collector.supplier(),
      new BiConsumer<Object, T>() {
        public void accept(final Object container, T value) {
          try (Stream<? extends U> mapped = mapper.apply(value)) {
            if (mapped != null) {
              mapped.sequential().forEach(new Consumer<U>() {
                public void accept(U element) {
                  downstreamAccumulator.accept(container, element);
                }
              });
            }
          }
        }
      },
      collector.combiner(),
      collector.finisher(),
      collector.characteristics()
    );
  }

  public static <T, A, R> Collector<T, ?, R> filtering(
      final Predicate<? super T> predicate,
      Collector<? super T, A, R> downstream) {
    final Collector collector = (Collector) downstream;
    final BiConsumer downstreamAccumulator = collector.accumulator();
    return new CollectorImpl<T, Object, R>(
      collector.supplier(),
      new BiConsumer<Object, T>() {
        public void accept(Object container, T value) {
          if (predicate.test(value)) {
            downstreamAccumulator.accept(container, value);
          }
        }
      },
      collector.combiner(),
      collector.finisher(),
      collector.characteristics()
    );
  }

  public static <T, A, R, RR> Collector<T, A, RR> collectingAndThen(
      Collector<T, A, R> downstream,
      Function<R, RR> finisher) {
    Set<Collector.Characteristics> characteristics = downstream.characteristics();
    if (characteristics.contains(Collector.Characteristics.IDENTITY_FINISH)) {
      if (characteristics.size() == 1) {
        characteristics = CH_NOID;
      } else {
        characteristics = EnumSet.copyOf(characteristics);
        characteristics.remove(Collector.Characteristics.IDENTITY_FINISH);
        characteristics = Collections.unmodifiableSet(characteristics);
      }
    }
    return new CollectorImpl<T, A, RR>(
      downstream.supplier(),
      downstream.accumulator(),
      downstream.combiner(),
      downstream.finisher().andThen(finisher),
      characteristics
    );
  }

  public static <T> Collector<T, ?, Long> counting() {
    return new CollectorImpl<T, long[], Long>(
      new Supplier<long[]>() {
        public long[] get() {
          return new long[1];
        }
      },
      new BiConsumer<long[], T>() {
        public void accept(long[] count, T value) {
          count[0]++;
        }
      },
      new BinaryOperator<long[]>() {
        public long[] apply(long[] left, long[] right) {
          left[0] += right[0];
          return left;
        }
      },
      new Function<long[], Long>() {
        public Long apply(long[] count) {
          return Long.valueOf(count[0]);
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, Optional<T>> minBy(final Comparator<? super T> comparator) {
    Objects.requireNonNull(comparator);
    return reducing(new BinaryOperator<T>() {
      public T apply(T left, T right) {
        return comparator.compare(left, right) <= 0 ? left : right;
      }
    });
  }

  public static <T> Collector<T, ?, Optional<T>> maxBy(final Comparator<? super T> comparator) {
    Objects.requireNonNull(comparator);
    return reducing(new BinaryOperator<T>() {
      public T apply(T left, T right) {
        return comparator.compare(left, right) >= 0 ? left : right;
      }
    });
  }

  public static <T> Collector<T, ?, Integer> summingInt(final ToIntFunction<? super T> mapper) {
    return new CollectorImpl<T, int[], Integer>(
      new Supplier<int[]>() {
        public int[] get() {
          return new int[1];
        }
      },
      new BiConsumer<int[], T>() {
        public void accept(int[] sum, T value) {
          sum[0] += mapper.applyAsInt(value);
        }
      },
      new BinaryOperator<int[]>() {
        public int[] apply(int[] left, int[] right) {
          left[0] += right[0];
          return left;
        }
      },
      new Function<int[], Integer>() {
        public Integer apply(int[] sum) {
          return Integer.valueOf(sum[0]);
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, Long> summingLong(final ToLongFunction<? super T> mapper) {
    return new CollectorImpl<T, long[], Long>(
      new Supplier<long[]>() {
        public long[] get() {
          return new long[1];
        }
      },
      new BiConsumer<long[], T>() {
        public void accept(long[] sum, T value) {
          sum[0] += mapper.applyAsLong(value);
        }
      },
      new BinaryOperator<long[]>() {
        public long[] apply(long[] left, long[] right) {
          left[0] += right[0];
          return left;
        }
      },
      new Function<long[], Long>() {
        public Long apply(long[] sum) {
          return Long.valueOf(sum[0]);
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, Double> summingDouble(final ToDoubleFunction<? super T> mapper) {
    return new CollectorImpl<T, double[], Double>(
      new Supplier<double[]>() {
        public double[] get() {
          return new double[3];
        }
      },
      new BiConsumer<double[], T>() {
        public void accept(double[] sum, T value) {
          double mapped = mapper.applyAsDouble(value);
          sumWithCompensation(sum, mapped);
          sum[2] += mapped;
        }
      },
      new BinaryOperator<double[]>() {
        public double[] apply(double[] left, double[] right) {
          sumWithCompensation(left, right[0]);
          sumWithCompensation(left, -right[1]);
          left[2] += right[2];
          return left;
        }
      },
      new Function<double[], Double>() {
        public Double apply(double[] sum) {
          return Double.valueOf(computeFinalSum(sum));
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, Double> averagingInt(final ToIntFunction<? super T> mapper) {
    return new CollectorImpl<T, long[], Double>(
      new Supplier<long[]>() {
        public long[] get() {
          return new long[2];
        }
      },
      new BiConsumer<long[], T>() {
        public void accept(long[] sumAndCount, T value) {
          sumAndCount[0] += mapper.applyAsInt(value);
          sumAndCount[1]++;
        }
      },
      new BinaryOperator<long[]>() {
        public long[] apply(long[] left, long[] right) {
          left[0] += right[0];
          left[1] += right[1];
          return left;
        }
      },
      new Function<long[], Double>() {
        public Double apply(long[] sumAndCount) {
          return Double.valueOf(sumAndCount[1] == 0 ? 0.0d : (double) sumAndCount[0] / sumAndCount[1]);
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, Double> averagingLong(final ToLongFunction<? super T> mapper) {
    return new CollectorImpl<T, long[], Double>(
      new Supplier<long[]>() {
        public long[] get() {
          return new long[2];
        }
      },
      new BiConsumer<long[], T>() {
        public void accept(long[] sumAndCount, T value) {
          sumAndCount[0] += mapper.applyAsLong(value);
          sumAndCount[1]++;
        }
      },
      new BinaryOperator<long[]>() {
        public long[] apply(long[] left, long[] right) {
          left[0] += right[0];
          left[1] += right[1];
          return left;
        }
      },
      new Function<long[], Double>() {
        public Double apply(long[] sumAndCount) {
          return Double.valueOf(sumAndCount[1] == 0 ? 0.0d : (double) sumAndCount[0] / sumAndCount[1]);
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, Double> averagingDouble(final ToDoubleFunction<? super T> mapper) {
    return new CollectorImpl<T, double[], Double>(
      new Supplier<double[]>() {
        public double[] get() {
          return new double[4];
        }
      },
      new BiConsumer<double[], T>() {
        public void accept(double[] sumAndCount, T value) {
          double mapped = mapper.applyAsDouble(value);
          sumWithCompensation(sumAndCount, mapped);
          sumAndCount[2]++;
          sumAndCount[3] += mapped;
        }
      },
      new BinaryOperator<double[]>() {
        public double[] apply(double[] left, double[] right) {
          sumWithCompensation(left, right[0]);
          sumWithCompensation(left, -right[1]);
          left[2] += right[2];
          left[3] += right[3];
          return left;
        }
      },
      new Function<double[], Double>() {
        public Double apply(double[] sumAndCount) {
          return Double.valueOf(
            sumAndCount[2] == 0.0d ? 0.0d : computeFinalSum(sumAndCount) / sumAndCount[2]
          );
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, IntSummaryStatistics> summarizingInt(
      final ToIntFunction<? super T> mapper) {
    return new CollectorImpl<T, IntSummaryStatistics, IntSummaryStatistics>(
      new Supplier<IntSummaryStatistics>() {
        public IntSummaryStatistics get() {
          return new IntSummaryStatistics();
        }
      },
      new BiConsumer<IntSummaryStatistics, T>() {
        public void accept(IntSummaryStatistics statistics, T value) {
          statistics.accept(mapper.applyAsInt(value));
        }
      },
      new BinaryOperator<IntSummaryStatistics>() {
        public IntSummaryStatistics apply(IntSummaryStatistics left, IntSummaryStatistics right) {
          left.combine(right);
          return left;
        }
      },
      CH_ID
    );
  }

  public static <T> Collector<T, ?, LongSummaryStatistics> summarizingLong(
      final ToLongFunction<? super T> mapper) {
    return new CollectorImpl<T, LongSummaryStatistics, LongSummaryStatistics>(
      new Supplier<LongSummaryStatistics>() {
        public LongSummaryStatistics get() {
          return new LongSummaryStatistics();
        }
      },
      new BiConsumer<LongSummaryStatistics, T>() {
        public void accept(LongSummaryStatistics statistics, T value) {
          statistics.accept(mapper.applyAsLong(value));
        }
      },
      new BinaryOperator<LongSummaryStatistics>() {
        public LongSummaryStatistics apply(LongSummaryStatistics left, LongSummaryStatistics right) {
          left.combine(right);
          return left;
        }
      },
      CH_ID
    );
  }

  public static <T> Collector<T, ?, DoubleSummaryStatistics> summarizingDouble(
      final ToDoubleFunction<? super T> mapper) {
    return new CollectorImpl<T, DoubleSummaryStatistics, DoubleSummaryStatistics>(
      new Supplier<DoubleSummaryStatistics>() {
        public DoubleSummaryStatistics get() {
          return new DoubleSummaryStatistics();
        }
      },
      new BiConsumer<DoubleSummaryStatistics, T>() {
        public void accept(DoubleSummaryStatistics statistics, T value) {
          statistics.accept(mapper.applyAsDouble(value));
        }
      },
      new BinaryOperator<DoubleSummaryStatistics>() {
        public DoubleSummaryStatistics apply(DoubleSummaryStatistics left, DoubleSummaryStatistics right) {
          left.combine(right);
          return left;
        }
      },
      CH_ID
    );
  }

  public static <T> Collector<T, ?, T> reducing(
      final T identity,
      final BinaryOperator<T> operator) {
    return new CollectorImpl<T, Object[], T>(
      new Supplier<Object[]>() {
        public Object[] get() {
          return new Object[] { identity };
        }
      },
      new BiConsumer<Object[], T>() {
        public void accept(Object[] box, T value) {
          box[0] = operator.apply((T) box[0], value);
        }
      },
      new BinaryOperator<Object[]>() {
        public Object[] apply(Object[] left, Object[] right) {
          left[0] = operator.apply((T) left[0], (T) right[0]);
          return left;
        }
      },
      new Function<Object[], T>() {
        public T apply(Object[] box) {
          return (T) box[0];
        }
      },
      CH_NOID
    );
  }

  public static <T> Collector<T, ?, Optional<T>> reducing(final BinaryOperator<T> operator) {
    return new CollectorImpl<T, ReducingBox, Optional<T>>(
      new Supplier<ReducingBox>() {
        public ReducingBox get() {
          return new ReducingBox();
        }
      },
      new BiConsumer<ReducingBox, T>() {
        public void accept(ReducingBox box, T value) {
          if (box.present) {
            box.value = operator.apply((T) box.value, value);
          } else {
            box.value = value;
            box.present = true;
          }
        }
      },
      new BinaryOperator<ReducingBox>() {
        public ReducingBox apply(ReducingBox left, ReducingBox right) {
          if (!left.present) {
            return right;
          }
          if (right.present) {
            left.value = operator.apply((T) left.value, (T) right.value);
          }
          return left;
        }
      },
      new Function<ReducingBox, Optional<T>>() {
        public Optional<T> apply(ReducingBox box) {
          return box.present ? Optional.of((T) box.value) : Optional.<T>empty();
        }
      },
      CH_NOID
    );
  }

  public static <T, U> Collector<T, ?, U> reducing(
      final U identity,
      final Function<? super T, ? extends U> mapper,
      final BinaryOperator<U> operator) {
    return new CollectorImpl<T, Object[], U>(
      new Supplier<Object[]>() {
        public Object[] get() {
          return new Object[] { identity };
        }
      },
      new BiConsumer<Object[], T>() {
        public void accept(Object[] box, T value) {
          box[0] = operator.apply((U) box[0], mapper.apply(value));
        }
      },
      new BinaryOperator<Object[]>() {
        public Object[] apply(Object[] left, Object[] right) {
          left[0] = operator.apply((U) left[0], (U) right[0]);
          return left;
        }
      },
      new Function<Object[], U>() {
        public U apply(Object[] box) {
          return (U) box[0];
        }
      },
      CH_NOID
    );
  }

  public static <T, K> Collector<T, ?, Map<K, List<T>>> groupingBy(
      Function<? super T, ? extends K> classifier) {
    return groupingBy(classifier, Collectors.<T>toList());
  }

  public static <T, K, A, D> Collector<T, ?, Map<K, D>> groupingBy(
      Function<? super T, ? extends K> classifier,
      Collector<? super T, A, D> downstream) {
    return groupingBy(
      classifier,
      new Supplier<Map<K, D>>() {
        public Map<K, D> get() {
          return new HashMap<K, D>();
        }
      },
      downstream
    );
  }

  public static <T, K, D, A, M extends Map<K, D>> Collector<T, ?, M> groupingBy(
      final Function<? super T, ? extends K> classifier,
      final Supplier<M> mapFactory,
      Collector<? super T, A, D> downstream) {
    final Collector collector = (Collector) Objects.requireNonNull(downstream);
    final Supplier downstreamSupplier = collector.supplier();
    final BiConsumer downstreamAccumulator = collector.accumulator();
    final BinaryOperator downstreamCombiner = collector.combiner();
    final Set<Collector.Characteristics> characteristics =
        collector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH) ? CH_ID : CH_NOID;
    return new CollectorImpl<T, M, M>(
      new Supplier<M>() {
        public M get() {
          return mapFactory.get();
        }
      },
      new BiConsumer<M, T>() {
        public void accept(M map, T value) {
          K key = Objects.requireNonNull(classifier.apply(value));
          Object container = map.get(key);
          if (container == null && !map.containsKey(key)) {
            container = downstreamSupplier.get();
            map.put(key, (D) container);
          }
          downstreamAccumulator.accept(container, value);
        }
      },
      new BinaryOperator<M>() {
        public M apply(M left, M right) {
          for (Map.Entry<K, D> entry : right.entrySet()) {
            K key = entry.getKey();
            Object rightContainer = entry.getValue();
            Object leftContainer = left.get(key);
            if (leftContainer == null && !left.containsKey(key)) {
              left.put(key, (D) rightContainer);
            } else {
              left.put(key, (D) downstreamCombiner.apply(leftContainer, rightContainer));
            }
          }
          return left;
        }
      },
      new Function<M, M>() {
        public M apply(M map) {
          if (collector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH)) {
            return map;
          }
          for (Map.Entry<K, D> entry : map.entrySet()) {
            entry.setValue((D) collector.finisher().apply(entry.getValue()));
          }
          return map;
        }
      },
      characteristics
    );
  }

  public static <T, K> Collector<T, ?, ConcurrentMap<K, List<T>>> groupingByConcurrent(
      Function<? super T, ? extends K> classifier) {
    return groupingByConcurrent(classifier, Collectors.<T>toList());
  }

  public static <T, K, A, D> Collector<T, ?, ConcurrentMap<K, D>> groupingByConcurrent(
      Function<? super T, ? extends K> classifier,
      Collector<? super T, A, D> downstream) {
    return groupingByConcurrent(
      classifier,
      new Supplier<ConcurrentMap<K, D>>() {
        public ConcurrentMap<K, D> get() {
          return new ConcurrentHashMap<K, D>();
        }
      },
      downstream
    );
  }

  public static <T, K, D, A, M extends ConcurrentMap<K, D>> Collector<T, ?, M> groupingByConcurrent(
      final Function<? super T, ? extends K> classifier,
      final Supplier<M> mapFactory,
      Collector<? super T, A, D> downstream) {
    final Collector collector = (Collector) Objects.requireNonNull(downstream);
    final Supplier downstreamSupplier = collector.supplier();
    final BiConsumer downstreamAccumulator = collector.accumulator();
    final BinaryOperator downstreamCombiner = collector.combiner();
    final boolean identityFinish = collector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH);
    final Set<Collector.Characteristics> characteristics = identityFinish ? CH_CONCURRENT_ID : CH_CONCURRENT_NOID;
    return new CollectorImpl<T, M, M>(
      new Supplier<M>() {
        public M get() {
          return mapFactory.get();
        }
      },
      new BiConsumer<M, T>() {
        public void accept(M map, T value) {
          K key = Objects.requireNonNull(classifier.apply(value));
          Object container = map.get(key);
          if (container == null && !map.containsKey(key)) {
            container = downstreamSupplier.get();
            Object existing = map.putIfAbsent(key, (D) container);
            if (existing != null) {
              container = existing;
            }
          }
          downstreamAccumulator.accept(container, value);
        }
      },
      new BinaryOperator<M>() {
        public M apply(M left, M right) {
          for (Map.Entry<K, D> entry : right.entrySet()) {
            K key = entry.getKey();
            Object rightContainer = entry.getValue();
            Object leftContainer = left.get(key);
            if (leftContainer == null && !left.containsKey(key)) {
              Object existing = left.putIfAbsent(key, (D) rightContainer);
              if (existing != null) {
                left.put(key, (D) downstreamCombiner.apply(existing, rightContainer));
              }
            } else {
              left.put(key, (D) downstreamCombiner.apply(leftContainer, rightContainer));
            }
          }
          return left;
        }
      },
      new Function<M, M>() {
        public M apply(M map) {
          if (identityFinish) {
            return map;
          }
          for (Map.Entry<K, D> entry : map.entrySet()) {
            entry.setValue((D) collector.finisher().apply(entry.getValue()));
          }
          return map;
        }
      },
      characteristics
    );
  }

  public static <T> Collector<T, ?, Map<Boolean, List<T>>> partitioningBy(
      Predicate<? super T> predicate) {
    return partitioningBy(predicate, Collectors.<T>toList());
  }

  public static <T, D, A> Collector<T, ?, Map<Boolean, D>> partitioningBy(
      final Predicate<? super T> predicate,
      Collector<? super T, A, D> downstream) {
    final Collector collector = (Collector) Objects.requireNonNull(downstream);
    final Supplier downstreamSupplier = collector.supplier();
    final BiConsumer downstreamAccumulator = collector.accumulator();
    final BinaryOperator downstreamCombiner = collector.combiner();
    final Set<Collector.Characteristics> characteristics =
        collector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH) ? CH_ID : CH_NOID;
    return new CollectorImpl<T, PartitionMap, Map<Boolean, D>>(
      new Supplier<PartitionMap>() {
        public PartitionMap get() {
          return new PartitionMap(downstreamSupplier.get(), downstreamSupplier.get());
        }
      },
      new BiConsumer<PartitionMap, T>() {
        public void accept(PartitionMap map, T value) {
          downstreamAccumulator.accept(
            predicate.test(value) ? map.trueValue : map.falseValue,
            value
          );
        }
      },
      new BinaryOperator<PartitionMap>() {
        public PartitionMap apply(PartitionMap left, PartitionMap right) {
          left.falseValue = downstreamCombiner.apply(left.falseValue, right.falseValue);
          left.trueValue = downstreamCombiner.apply(left.trueValue, right.trueValue);
          return left;
        }
      },
      new Function<PartitionMap, Map<Boolean, D>>() {
        public Map<Boolean, D> apply(PartitionMap map) {
          if (collector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH)) {
            return map;
          }
          return new PartitionMap(
            collector.finisher().apply(map.falseValue),
            collector.finisher().apply(map.trueValue)
          );
        }
      },
      characteristics
    );
  }

  public static <T, K, U> Collector<T, ?, Map<K, U>> toMap(
      Function<? super T, ? extends K> keyMapper,
      Function<? super T, ? extends U> valueMapper) {
    return toMap(keyMapper, valueMapper, new BinaryOperator<U>() {
      public U apply(U left, U right) {
        throw new IllegalStateException();
      }
    });
  }

  public static <T, K, U> Collector<T, ?, Map<K, U>> toMap(
      final Function<? super T, ? extends K> keyMapper,
      final Function<? super T, ? extends U> valueMapper,
      final BinaryOperator<U> mergeFunction) {
    return toMap(
      keyMapper,
      valueMapper,
      mergeFunction,
      new Supplier<Map<K, U>>() {
        public Map<K, U> get() {
          return new HashMap<K, U>();
        }
      }
    );
  }

  public static <T, K, U, M extends Map<K, U>> Collector<T, ?, M> toMap(
      final Function<? super T, ? extends K> keyMapper,
      final Function<? super T, ? extends U> valueMapper,
      final BinaryOperator<U> mergeFunction,
      final Supplier<M> mapSupplier) {
    return new CollectorImpl<T, M, M>(
      new Supplier<M>() {
        public M get() {
          return mapSupplier.get();
        }
      },
      new BiConsumer<M, T>() {
        public void accept(M map, T value) {
          K key = keyMapper.apply(value);
          U mapped = Objects.requireNonNull(valueMapper.apply(value));
          Objects.requireNonNull(mergeFunction);
          if (map.containsKey(key)) {
            U merged = mergeFunction.apply(map.get(key), mapped);
            if (merged == null) {
              map.remove(key);
            } else {
              map.put(key, merged);
            }
          } else {
            map.put(key, mapped);
          }
        }
      },
      new BinaryOperator<M>() {
        public M apply(M left, M right) {
          for (Map.Entry<K, U> entry : right.entrySet()) {
            Objects.requireNonNull(mergeFunction);
            if (left.containsKey(entry.getKey())) {
              U merged = mergeFunction.apply(left.get(entry.getKey()), entry.getValue());
              if (merged == null) {
                left.remove(entry.getKey());
              } else {
                left.put(entry.getKey(), merged);
              }
            } else {
              left.put(entry.getKey(), entry.getValue());
            }
          }
          return left;
        }
      },
      CH_ID
    );
  }

  public static <T, K, U> Collector<T, ?, ConcurrentMap<K, U>> toConcurrentMap(
      Function<? super T, ? extends K> keyMapper,
      Function<? super T, ? extends U> valueMapper) {
    return toConcurrentMap(keyMapper, valueMapper, new BinaryOperator<U>() {
      public U apply(U left, U right) {
        throw new IllegalStateException();
      }
    });
  }

  public static <T, K, U> Collector<T, ?, ConcurrentMap<K, U>> toConcurrentMap(
      final Function<? super T, ? extends K> keyMapper,
      final Function<? super T, ? extends U> valueMapper,
      final BinaryOperator<U> mergeFunction) {
    return toConcurrentMap(
      keyMapper,
      valueMapper,
      mergeFunction,
      new Supplier<ConcurrentMap<K, U>>() {
        public ConcurrentMap<K, U> get() {
          return new ConcurrentHashMap<K, U>();
        }
      }
    );
  }

  public static <T, K, U, M extends ConcurrentMap<K, U>> Collector<T, ?, M> toConcurrentMap(
      final Function<? super T, ? extends K> keyMapper,
      final Function<? super T, ? extends U> valueMapper,
      final BinaryOperator<U> mergeFunction,
      final Supplier<M> mapSupplier) {
    return new CollectorImpl<T, M, M>(
      new Supplier<M>() {
        public M get() {
          return mapSupplier.get();
        }
      },
      new BiConsumer<M, T>() {
        public void accept(M map, T value) {
          K key = keyMapper.apply(value);
          U mapped = Objects.requireNonNull(valueMapper.apply(value));
          Objects.requireNonNull(mergeFunction);
          map.merge(key, mapped, mergeFunction);
        }
      },
      new BinaryOperator<M>() {
        public M apply(M left, M right) {
          for (Map.Entry<K, U> entry : right.entrySet()) {
            Objects.requireNonNull(mergeFunction);
            left.merge(entry.getKey(), Objects.requireNonNull(entry.getValue()), mergeFunction);
          }
          return left;
        }
      },
      CH_CONCURRENT_ID
    );
  }

  public static <T, K, U> Collector<T, ?, Map<K, U>> toUnmodifiableMap(
      Function<? super T, ? extends K> keyMapper,
      Function<? super T, ? extends U> valueMapper) {
    return toUnmodifiableMap(keyMapper, valueMapper, new BinaryOperator<U>() {
      public U apply(U left, U right) {
        throw new IllegalStateException();
      }
    });
  }

  public static <T, K, U> Collector<T, ?, Map<K, U>> toUnmodifiableMap(
      final Function<? super T, ? extends K> keyMapper,
      final Function<? super T, ? extends U> valueMapper,
      final BinaryOperator<U> mergeFunction) {
    Objects.requireNonNull(keyMapper);
    Objects.requireNonNull(valueMapper);
    Objects.requireNonNull(mergeFunction);
    return Collector.of(
      new Supplier<Map<K, U>>() {
        public Map<K, U> get() {
          return new HashMap<K, U>();
        }
      },
      new BiConsumer<Map<K, U>, T>() {
        public void accept(Map<K, U> map, T value) {
          K key = Objects.requireNonNull(keyMapper.apply(value));
          U mapped = Objects.requireNonNull(valueMapper.apply(value));
          if (map.containsKey(key)) {
            U merged = mergeFunction.apply(map.get(key), mapped);
            if (merged == null) {
              map.remove(key);
            } else {
              map.put(key, merged);
            }
          } else {
            map.put(key, mapped);
          }
        }
      },
      new BinaryOperator<Map<K, U>>() {
        public Map<K, U> apply(Map<K, U> left, Map<K, U> right) {
          for (Map.Entry<K, U> entry : right.entrySet()) {
            if (left.containsKey(entry.getKey())) {
              U merged = mergeFunction.apply(left.get(entry.getKey()), entry.getValue());
              if (merged == null) {
                left.remove(entry.getKey());
              } else {
                left.put(entry.getKey(), merged);
              }
            } else {
              left.put(entry.getKey(), entry.getValue());
            }
          }
          return left;
        }
      },
      new Function<Map<K, U>, Map<K, U>>() {
        public Map<K, U> apply(Map<K, U> map) {
          return Map.copyOf(map);
        }
      }
    );
  }

  public static <T, R1, R2, R> Collector<T, ?, R> teeing(
      Collector<? super T, ?, R1> downstream1,
      Collector<? super T, ?, R2> downstream2,
      BiFunction<? super R1, ? super R2, R> merger) {
    final Collector first = (Collector) Objects.requireNonNull(downstream1);
    final Collector second = (Collector) Objects.requireNonNull(downstream2);
    final BiFunction<? super R1, ? super R2, R> checkedMerger =
        Objects.requireNonNull(merger);
    Set<Collector.Characteristics> characteristics = new HashSet<Collector.Characteristics>();
    characteristics.addAll(first.characteristics());
    characteristics.retainAll(second.characteristics());
    characteristics.remove(Collector.Characteristics.IDENTITY_FINISH);
    characteristics.remove(Collector.Characteristics.CONCURRENT);
    final Set<Collector.Characteristics> resultCharacteristics =
        characteristics.contains(Collector.Characteristics.UNORDERED) ? CH_UNORDERED_NOID : CH_NOID;

    return new CollectorImpl<T, TeeBox, R>(
      new Supplier<TeeBox>() {
        public TeeBox get() {
          return new TeeBox(first.supplier().get(), second.supplier().get());
        }
      },
      new BiConsumer<TeeBox, T>() {
        public void accept(TeeBox box, T value) {
          first.accumulator().accept(box.first, value);
          second.accumulator().accept(box.second, value);
        }
      },
      new BinaryOperator<TeeBox>() {
        public TeeBox apply(TeeBox left, TeeBox right) {
          left.first = first.combiner().apply(left.first, right.first);
          left.second = second.combiner().apply(left.second, right.second);
          return left;
        }
      },
      new Function<TeeBox, R>() {
        public R apply(TeeBox box) {
          R1 firstResult = (R1) first.finisher().apply(box.first);
          R2 secondResult = (R2) second.finisher().apply(box.second);
          return checkedMerger.apply(firstResult, secondResult);
        }
      },
      resultCharacteristics
    );
  }

  static double[] sumWithCompensation(double[] intermediateSum, double value) {
    double tmp = value - intermediateSum[1];
    double sum = intermediateSum[0];
    double next = sum + tmp;
    intermediateSum[1] = (next - sum) - tmp;
    intermediateSum[0] = next;
    return intermediateSum;
  }

  static double computeFinalSum(double[] intermediateSum) {
    double sum = intermediateSum[0] - intermediateSum[1];
    double simpleSum = intermediateSum[intermediateSum.length - 1];
    if (Double.isNaN(sum) && Double.isInfinite(simpleSum)) {
      return simpleSum;
    }
    return sum;
  }

  private static final class TeeBox {
    Object first;
    Object second;

    TeeBox(Object first, Object second) {
      this.first = first;
      this.second = second;
    }
  }

  private static final class ReducingBox {
    boolean present;
    Object value;
  }

  private static final class PartitionMap<V> extends AbstractMap<Boolean, V> {
    V falseValue;
    V trueValue;

    PartitionMap(V falseValue, V trueValue) {
      this.falseValue = falseValue;
      this.trueValue = trueValue;
    }

    public boolean containsKey(Object key) {
      return Boolean.FALSE.equals(key) || Boolean.TRUE.equals(key);
    }

    public V get(Object key) {
      if (Boolean.FALSE.equals(key)) {
        return falseValue;
      }
      if (Boolean.TRUE.equals(key)) {
        return trueValue;
      }
      return null;
    }

    public Set<Map.Entry<Boolean, V>> entrySet() {
      Set<Map.Entry<Boolean, V>> entries = new LinkedHashSet<Map.Entry<Boolean, V>>();
      entries.add(new AbstractMap.SimpleImmutableEntry<Boolean, V>(Boolean.FALSE, falseValue));
      entries.add(new AbstractMap.SimpleImmutableEntry<Boolean, V>(Boolean.TRUE, trueValue));
      return Collections.unmodifiableSet(entries);
    }
  }

  static final class CollectorImpl<T, A, R> implements Collector<T, A, R> {
    private final Supplier<A> supplier;
    private final BiConsumer<A, T> accumulator;
    private final BinaryOperator<A> combiner;
    private final Function<A, R> finisher;
    private final Set<Collector.Characteristics> characteristics;

    CollectorImpl(
        Supplier<A> supplier,
        BiConsumer<A, T> accumulator,
        BinaryOperator<A> combiner,
        Function<A, R> finisher,
        Set<Collector.Characteristics> characteristics) {
      this.supplier = supplier;
      this.accumulator = accumulator;
      this.combiner = combiner;
      this.finisher = finisher;
      this.characteristics = characteristics;
    }

    CollectorImpl(
        Supplier<A> supplier,
        BiConsumer<A, T> accumulator,
        BinaryOperator<A> combiner,
        Set<Collector.Characteristics> characteristics) {
      this(supplier, accumulator, combiner, (Function<A, R>) IDENTITY_FINISH, characteristics);
    }

    public Supplier<A> supplier() {
      return supplier;
    }

    public BiConsumer<A, T> accumulator() {
      return accumulator;
    }

    public BinaryOperator<A> combiner() {
      return combiner;
    }

    public Function<A, R> finisher() {
      return finisher;
    }

    public Set<Collector.Characteristics> characteristics() {
      return characteristics;
    }
  }
}
