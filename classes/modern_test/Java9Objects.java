package classes.modern_test;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.Objects;

public class Java9Objects {
  public static void main(String[] args) {
    System.out.println(Objects.requireNonNullElse("x", "y"));
    System.out.println(Objects.requireNonNullElse(null, "y"));
    System.out.println(Objects.requireNonNullElse("x", null));
    try {
      Objects.requireNonNullElse(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Objects.requireNonNullElseGet("x", () -> "y"));
    System.out.println(Objects.requireNonNullElseGet(null, () -> "y"));
    AtomicInteger supplierCalls = new AtomicInteger();
    System.out.println(Objects.requireNonNullElseGet("x", () -> {
      supplierCalls.incrementAndGet();
      return "bad";
    }));
    System.out.println(supplierCalls.get());
    try {
      Objects.requireNonNullElseGet(null, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.requireNonNullElseGet(null, () -> null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Objects.checkIndex(1, 2));
    System.out.println(Objects.checkIndex(0, 1));
    try {
      Objects.checkIndex(2, 2);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkIndex(0, 0);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkIndex(0, -1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Objects.checkFromToIndex(1, 2, 3));
    System.out.println(Objects.checkFromToIndex(3, 3, 3));
    try {
      Objects.checkFromToIndex(2, 1, 3);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkFromToIndex(0, 1, 0);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Objects.checkFromIndexSize(1, 2, 3));
    System.out.println(Objects.checkFromIndexSize(3, 0, 3));
    try {
      Objects.checkFromIndexSize(2, 2, 3);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkFromIndexSize(0, 1, 0);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkFromIndexSize(0, 0, -1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
