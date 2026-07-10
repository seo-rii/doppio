package classes.modern_test;

import java.util.Iterator;
import java.util.PrimitiveIterator;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.DoubleStream;
import java.util.stream.IntStream;
import java.util.stream.LongStream;
import java.util.stream.Stream;

public class Java9StreamIterateBoundaries {
  public static void main(String[] args) {
    AtomicInteger objectHasNext = new AtomicInteger();
    AtomicInteger objectNext = new AtomicInteger();
    long objectCount = Stream.iterate(
        Integer.valueOf(1),
        value -> {
          objectHasNext.incrementAndGet();
          return false;
        },
        value -> {
          objectNext.incrementAndGet();
          return Integer.valueOf(value.intValue() + 1);
        }).count();
    System.out.println(objectCount + ":" + objectHasNext.get() + ":" + objectNext.get());

    AtomicInteger repeatedHasNext = new AtomicInteger();
    AtomicInteger repeatedNext = new AtomicInteger();
    Iterator<Integer> iterator = Stream.iterate(
        Integer.valueOf(1),
        value -> {
          repeatedHasNext.incrementAndGet();
          return value.intValue() < 4;
        },
        value -> {
          repeatedNext.incrementAndGet();
          return Integer.valueOf(value.intValue() + 1);
        }).iterator();
    System.out.println(iterator.hasNext());
    System.out.println(iterator.hasNext());
    System.out.println(iterator.next());
    System.out.println(repeatedHasNext.get() + ":" + repeatedNext.get());
    System.out.println(iterator.hasNext());
    System.out.println(iterator.hasNext());
    System.out.println(iterator.next());
    System.out.println(repeatedHasNext.get() + ":" + repeatedNext.get());
    System.out.println(iterator.hasNext());
    System.out.println(iterator.next());
    System.out.println(iterator.hasNext());
    System.out.println(repeatedHasNext.get() + ":" + repeatedNext.get());

    AtomicInteger objectTake = new AtomicInteger();
    AtomicInteger objectDrop = new AtomicInteger();
    System.out.println(Stream.of(1, 2, 3)
        .takeWhile(value -> {
          objectTake.incrementAndGet();
          return value.intValue() < 3;
        })
        .limit(0)
        .count() + ":" + objectTake.get());
    System.out.println(Stream.of(1, 2, 3)
        .dropWhile(value -> {
          objectDrop.incrementAndGet();
          return value.intValue() < 3;
        })
        .limit(0)
        .count() + ":" + objectDrop.get());

    AtomicInteger intHasNext = new AtomicInteger();
    AtomicInteger intNext = new AtomicInteger();
    long intCount = IntStream.iterate(
        1,
        value -> {
          intHasNext.incrementAndGet();
          return false;
        },
        value -> {
          intNext.incrementAndGet();
          return value + 1;
        }).count();
    System.out.println(intCount + ":" + intHasNext.get() + ":" + intNext.get());

    AtomicInteger intRepeatedHasNext = new AtomicInteger();
    AtomicInteger intRepeatedNext = new AtomicInteger();
    PrimitiveIterator.OfInt intIterator = IntStream.iterate(
        1,
        value -> {
          intRepeatedHasNext.incrementAndGet();
          return value < 3;
        },
        value -> {
          intRepeatedNext.incrementAndGet();
          return value + 1;
        }).iterator();
    System.out.println(intIterator.hasNext());
    System.out.println(intIterator.hasNext());
    System.out.println(intIterator.nextInt());
    System.out.println(intRepeatedHasNext.get() + ":" + intRepeatedNext.get());
    System.out.println(intIterator.hasNext());
    System.out.println(intIterator.nextInt());
    System.out.println(intIterator.hasNext());
    System.out.println(intRepeatedHasNext.get() + ":" + intRepeatedNext.get());

    AtomicInteger longHasNext = new AtomicInteger();
    AtomicInteger longNext = new AtomicInteger();
    long longCount = LongStream.iterate(
        1L,
        value -> {
          longHasNext.incrementAndGet();
          return false;
        },
        value -> {
          longNext.incrementAndGet();
          return value + 1L;
        }).count();
    System.out.println(longCount + ":" + longHasNext.get() + ":" + longNext.get());

    AtomicInteger doubleTake = new AtomicInteger();
    AtomicInteger doubleDrop = new AtomicInteger();
    System.out.println(DoubleStream.of(1.0, 2.0, 3.0)
        .takeWhile(value -> {
          doubleTake.incrementAndGet();
          return value < 3.0;
        })
        .limit(0)
        .count() + ":" + doubleTake.get());
    System.out.println(DoubleStream.of(1.0, 2.0, 3.0)
        .dropWhile(value -> {
          doubleDrop.incrementAndGet();
          return value < 3.0;
        })
        .limit(0)
        .count() + ":" + doubleDrop.get());
  }
}
