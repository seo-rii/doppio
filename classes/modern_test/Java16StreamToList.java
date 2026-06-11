package classes.modern_test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.DoubleStream;
import java.util.stream.IntStream;
import java.util.stream.LongStream;
import java.util.stream.Stream;

public class Java16StreamToList {
  public static void main(String[] args) {
    List<String> listed = Stream.of("b", "a").toList();
    System.out.println(listed);
    try {
      listed.add("c");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }

    List<String> withNull = Stream.of("a", (String) null).toList();
    System.out.println(withNull.size() + ":" + (withNull.get(1) == null));

    System.out.println(Stream.of("ab", "", "c")
        .<String>mapMulti((value, sink) -> {
          for (int i = 0; i < value.length(); i++) {
            sink.accept(value.substring(i, i + 1));
          }
        })
        .collect(java.util.stream.Collectors.joining("-")));
    System.out.println(Stream.of("ab", "c")
        .mapMultiToInt((value, sink) -> {
          sink.accept(value.length());
          sink.accept(value.charAt(0));
        })
        .sum());
    System.out.println(Stream.of("ab", "c")
        .mapMultiToLong((value, sink) -> {
          sink.accept(value.length());
          sink.accept(value.length() * 10L);
        })
        .sum());
    System.out.println(Stream.of("ab", "c")
        .mapMultiToDouble((value, sink) -> {
          sink.accept(value.length());
          sink.accept(value.length() / 2.0);
        })
        .sum());
    System.out.println(Stream.of("a").<String>mapMulti((value, sink) -> {}).count());
    AtomicInteger closeCount = new AtomicInteger();
    Stream<String> mapped = Stream.of("x")
        .onClose(closeCount::incrementAndGet)
        .<String>mapMulti((value, sink) -> sink.accept(value));
    mapped.close();
    System.out.println(closeCount.get());
    try {
      Stream.of("x").<String>mapMulti((value, sink) -> {
        throw new IllegalStateException("object mapper");
      }).count();
      System.out.println(false);
    } catch (IllegalStateException e) {
      System.out.println(e.getMessage());
    }
    try {
      Stream.of("x").mapMultiToInt((value, sink) -> {
        throw new IllegalArgumentException("int mapper");
      }).sum();
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getMessage());
    }
    System.out.println(IntStream.of(1, 2)
        .mapMulti((value, sink) -> {
          sink.accept(value);
          sink.accept(value * 10);
        })
        .sum());
    System.out.println(LongStream.of(2L, 3L)
        .mapMulti((value, sink) -> {
          sink.accept(value);
          sink.accept(value * 10L);
        })
        .sum());
    System.out.println(DoubleStream.of(1.5, 2.0)
        .mapMulti((value, sink) -> {
          sink.accept(value);
          sink.accept(value / 2.0);
        })
        .sum());
    System.out.println(IntStream.of(1).mapMulti((value, sink) -> {}).count());
    AtomicInteger primitiveCloseCount = new AtomicInteger();
    IntStream primitiveMapped = IntStream.of(1)
        .onClose(primitiveCloseCount::incrementAndGet)
        .mapMulti((value, sink) -> sink.accept(value));
    primitiveMapped.close();
    System.out.println(primitiveCloseCount.get());
    try {
      LongStream.of(1L).mapMulti((value, sink) -> {
        throw new IllegalStateException("long mapper");
      }).sum();
      System.out.println(false);
    } catch (IllegalStateException e) {
      System.out.println(e.getMessage());
    }

    try {
      Stream.of("a").mapMulti(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").mapMultiToInt(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").mapMultiToLong(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").mapMultiToDouble(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      IntStream.of(1).mapMulti(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      LongStream.of(1L).mapMulti(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      DoubleStream.of(1.0).mapMulti(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
