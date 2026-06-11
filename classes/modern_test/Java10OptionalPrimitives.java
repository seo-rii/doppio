package classes.modern_test;

import java.util.NoSuchElementException;
import java.util.OptionalDouble;
import java.util.OptionalInt;
import java.util.OptionalLong;

public class Java10OptionalPrimitives {
  public static void main(String[] args) {
    System.out.println(OptionalInt.of(4).orElseThrow());
    try {
      OptionalInt.empty().orElseThrow();
      System.out.println(false);
    } catch (NoSuchElementException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      System.out.println(OptionalInt.of(4).orElseThrow(null));
    } catch (NullPointerException e) {
      System.out.println(false);
    }
    try {
      OptionalInt.empty().orElseThrow(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(OptionalLong.of(6L).orElseThrow());
    try {
      OptionalLong.empty().orElseThrow();
      System.out.println(false);
    } catch (NoSuchElementException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      System.out.println(OptionalLong.of(6L).orElseThrow(null));
    } catch (NullPointerException e) {
      System.out.println(false);
    }
    try {
      OptionalLong.empty().orElseThrow(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(OptionalDouble.of(1.5).orElseThrow());
    try {
      OptionalDouble.empty().orElseThrow();
      System.out.println(false);
    } catch (NoSuchElementException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      System.out.println(OptionalDouble.of(1.5).orElseThrow(null));
    } catch (NullPointerException e) {
      System.out.println(false);
    }
    try {
      OptionalDouble.empty().orElseThrow(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
