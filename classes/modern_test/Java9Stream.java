package classes.modern_test;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.Spliterator;
import java.util.stream.Collectors;
import java.util.stream.DoubleStream;
import java.util.stream.IntStream;
import java.util.stream.LongStream;
import java.util.stream.Stream;

public class Java9Stream {
  public static void main(String[] args) {
    System.out.println(Stream.ofNullable(null).count());
    System.out.println(Stream.ofNullable("x").collect(Collectors.joining()));
    System.out.println(Stream.iterate(1, value -> value < 10, value -> value * 2)
        .map(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(Stream.of(1, 2, 3, 2)
        .takeWhile(value -> value < 3)
        .map(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(Stream.of(1, 2, 3, 2)
        .dropWhile(value -> value < 3)
        .map(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(IntStream.iterate(1, value -> value < 8, value -> value * 2)
        .mapToObj(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(IntStream.of(1, 2, 3, 2)
        .takeWhile(value -> value < 3)
        .sum());
    System.out.println(IntStream.of(1, 2, 3, 2)
        .dropWhile(value -> value < 3)
        .mapToObj(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(LongStream.iterate(2L, value -> value <= 8L, value -> value * 2L)
        .mapToObj(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(LongStream.of(1L, 2L, 4L, 1L)
        .takeWhile(value -> value < 4L)
        .sum());
    System.out.println(LongStream.of(1L, 2L, 4L, 1L)
        .dropWhile(value -> value < 4L)
        .mapToObj(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(DoubleStream.iterate(1.0, value -> value < 4.0, value -> value + 1.25)
        .mapToObj(String::valueOf)
        .collect(Collectors.joining(",")));
    System.out.println(DoubleStream.of(1.0, 2.0, 4.0, 1.0)
        .takeWhile(value -> value < 4.0)
        .sum());
    System.out.println(DoubleStream.of(1.0, 2.0, 4.0, 1.0)
        .dropWhile(value -> value < 4.0)
        .mapToObj(String::valueOf)
        .collect(Collectors.joining(",")));
    Spliterator.OfInt intRange = IntStream.range(2, 5).spliterator();
    System.out.println(intRange.estimateSize());
    System.out.println(intRange.getExactSizeIfKnown());
    System.out.println(intRange.hasCharacteristics(Spliterator.DISTINCT | Spliterator.SORTED
        | Spliterator.ORDERED | Spliterator.SIZED | Spliterator.NONNULL
        | Spliterator.IMMUTABLE | Spliterator.SUBSIZED));
    System.out.println(IntStream.rangeClosed(Integer.MAX_VALUE - 1, Integer.MAX_VALUE).count());
    Spliterator.OfLong longRange = LongStream.range(2L, 5L).spliterator();
    System.out.println(longRange.estimateSize());
    System.out.println(longRange.getExactSizeIfKnown());
    System.out.println(longRange.hasCharacteristics(Spliterator.DISTINCT | Spliterator.SORTED
        | Spliterator.ORDERED | Spliterator.SIZED | Spliterator.NONNULL
        | Spliterator.IMMUTABLE | Spliterator.SUBSIZED));
    System.out.println(LongStream.rangeClosed(Long.MAX_VALUE - 1, Long.MAX_VALUE).count());
    Spliterator.OfInt intValues = IntStream.of(1, 2, 3).spliterator();
    System.out.println(intValues.estimateSize());
    System.out.println(intValues.getExactSizeIfKnown());
    System.out.println(intValues.hasCharacteristics(Spliterator.ORDERED | Spliterator.SIZED
        | Spliterator.IMMUTABLE | Spliterator.SUBSIZED));
    Spliterator.OfLong longValues = LongStream.of(1L, 2L, 3L).spliterator();
    System.out.println(longValues.estimateSize());
    System.out.println(longValues.getExactSizeIfKnown());
    System.out.println(longValues.hasCharacteristics(Spliterator.ORDERED | Spliterator.SIZED
        | Spliterator.IMMUTABLE | Spliterator.SUBSIZED));
    Spliterator.OfDouble doubleValues = DoubleStream.of(1.0, 2.0, 3.0).spliterator();
    System.out.println(doubleValues.estimateSize());
    System.out.println(doubleValues.getExactSizeIfKnown());
    System.out.println(doubleValues.hasCharacteristics(Spliterator.ORDERED | Spliterator.SIZED
        | Spliterator.IMMUTABLE | Spliterator.SUBSIZED));

    AtomicInteger closed = new AtomicInteger();
    Stream<Integer> taken = Stream.of(1, 2, 3)
        .onClose(() -> closed.incrementAndGet())
        .takeWhile(value -> value < 3);
    taken.close();
    System.out.println(closed.get());
    AtomicInteger primitiveClosed = new AtomicInteger();
    IntStream primitiveTaken = IntStream.of(1, 2, 3)
        .onClose(() -> primitiveClosed.incrementAndGet())
        .takeWhile(value -> value < 3);
    primitiveTaken.close();
    System.out.println(primitiveClosed.get());
    printCloseException(() -> Stream.concat(
        Stream.<Integer>of(1).onClose(() -> { throw new IllegalStateException("first"); }),
        Stream.<Integer>of(2).onClose(() -> { throw new IllegalArgumentException("second"); })
    ).close());
    printCloseException(() -> IntStream.concat(
        IntStream.of(1).onClose(() -> { throw new IllegalStateException("first-int"); }),
        IntStream.of(2).onClose(() -> { throw new IllegalArgumentException("second-int"); })
    ).close());
    printCloseException(() -> LongStream.concat(
        LongStream.of(1L).onClose(() -> { throw new IllegalStateException("first-long"); }),
        LongStream.of(2L).onClose(() -> { throw new IllegalArgumentException("second-long"); })
    ).close());
    printCloseException(() -> DoubleStream.concat(
        DoubleStream.of(1.0).onClose(() -> { throw new IllegalStateException("first-double"); }),
        DoubleStream.of(2.0).onClose(() -> { throw new IllegalArgumentException("second-double"); })
    ).close());
    final RuntimeException shared = new IllegalStateException("shared");
    printCloseException(() -> Stream.concat(
        Stream.<Integer>of(1).onClose(() -> { throw shared; }),
        Stream.<Integer>of(2).onClose(() -> { throw shared; })
    ).close());
    final RuntimeException sharedInt = new IllegalStateException("shared-int");
    printCloseException(() -> IntStream.concat(
        IntStream.of(1).onClose(() -> { throw sharedInt; }),
        IntStream.of(2).onClose(() -> { throw sharedInt; })
    ).close());

    try {
      Stream.of(1).takeWhile(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of(1).dropWhile(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.iterate(1, null, value -> value + 1);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.iterate(1, value -> true, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      IntStream.of(1).takeWhile(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      LongStream.of(1L).dropWhile(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      DoubleStream.iterate(1.0, null, value -> value + 1.0);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      IntStream.iterate(1, value -> true, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }

  private static void printCloseException(Runnable closeAction) {
    try {
      closeAction.run();
      System.out.println(false);
    } catch (RuntimeException e) {
      Throwable[] suppressed = e.getSuppressed();
      System.out.println(e.getClass().getName() + ":" + e.getMessage());
      System.out.println(suppressed.length);
      if (suppressed.length > 0) {
        System.out.println(suppressed[0].getClass().getName() + ":" + suppressed[0].getMessage());
      }
    }
  }
}
