package classes.modern_test;

import java.util.Optional;
import java.util.Spliterator;

public class Java9Optional {
  public static void main(String[] args) {
    StringBuilder events = new StringBuilder();
    Optional.of("x").ifPresentOrElse(value -> events.append(value), () -> events.append("bad"));
    Optional.<String>empty().ifPresentOrElse(value -> events.append("bad"), () -> events.append("e"));
    System.out.println(events.toString());

    System.out.println(Optional.<String>empty().or(() -> Optional.of("fallback")).get());
    System.out.println(Optional.of("x").or(() -> Optional.of("bad")).get());
    try {
      Optional.<String>empty().or(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Optional.of("x").or(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(Optional.of("x").or(() -> null).get());
    try {
      Optional.<String>empty().or(() -> null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Optional.of("x").stream().count());
    System.out.println(Optional.empty().stream().count());
    printSized("present", Optional.of("x").stream().spliterator());
    printSized("empty", Optional.empty().stream().spliterator());

    try {
      Optional.of("x").ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Optional.<String>empty().ifPresentOrElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    Optional.of("x").ifPresentOrElse(value -> System.out.println(value), null);
    Optional.<String>empty().ifPresentOrElse(null, () -> System.out.println("empty-action"));
  }

  private static void printSized(String label, Spliterator<?> spliterator) {
    System.out.println(label + ":" + spliterator.estimateSize());
    System.out.println(spliterator.getExactSizeIfKnown());
    System.out.println(spliterator.characteristics());
  }
}
