package classes.modern_test;

import java.util.OptionalDouble;
import java.util.OptionalInt;
import java.util.OptionalLong;
import java.util.Spliterator;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.DoubleAdder;

public class Java9OptionalPrimitives {
  public static void main(String[] args) {
    AtomicInteger intEvents = new AtomicInteger();
    OptionalInt.of(4).ifPresentOrElse(value -> intEvents.addAndGet(value), () -> intEvents.addAndGet(100));
    OptionalInt.empty().ifPresentOrElse(value -> intEvents.addAndGet(1000), () -> intEvents.addAndGet(5));
    System.out.println(intEvents.get());
    System.out.println(OptionalInt.of(4).stream().sum());
    System.out.println(OptionalInt.empty().stream().count());
    printSized("int-present", OptionalInt.of(4).stream().spliterator());
    printSized("int-empty", OptionalInt.empty().stream().spliterator());
    try {
      OptionalInt.of(4).ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      OptionalInt.empty().ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    OptionalInt.of(4).ifPresentOrElse(value -> System.out.println(value), null);
    OptionalInt.empty().ifPresentOrElse(null, () -> System.out.println("int-empty-action"));

    AtomicLong longEvents = new AtomicLong();
    OptionalLong.of(6L).ifPresentOrElse(value -> longEvents.addAndGet(value), () -> longEvents.addAndGet(100));
    OptionalLong.empty().ifPresentOrElse(value -> longEvents.addAndGet(1000), () -> longEvents.addAndGet(7));
    System.out.println(longEvents.get());
    System.out.println(OptionalLong.of(6L).stream().sum());
    System.out.println(OptionalLong.empty().stream().count());
    printSized("long-present", OptionalLong.of(6L).stream().spliterator());
    printSized("long-empty", OptionalLong.empty().stream().spliterator());
    try {
      OptionalLong.of(6L).ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      OptionalLong.empty().ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    DoubleAdder doubleEvents = new DoubleAdder();
    OptionalDouble.of(1.5).ifPresentOrElse(value -> doubleEvents.add(value), () -> doubleEvents.add(100.0));
    OptionalDouble.empty().ifPresentOrElse(value -> doubleEvents.add(1000.0), () -> doubleEvents.add(2.5));
    System.out.println(doubleEvents.sum());
    System.out.println(OptionalDouble.of(1.5).stream().sum());
    System.out.println(OptionalDouble.empty().stream().count());
    printSized("double-present", OptionalDouble.of(1.5).stream().spliterator());
    printSized("double-empty", OptionalDouble.empty().stream().spliterator());
    try {
      OptionalDouble.of(1.5).ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      OptionalDouble.empty().ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }

  private static void printSized(String label, Spliterator<?> spliterator) {
    System.out.println(label + ":" + spliterator.estimateSize());
    System.out.println(spliterator.getExactSizeIfKnown());
    System.out.println(spliterator.characteristics());
  }
}
