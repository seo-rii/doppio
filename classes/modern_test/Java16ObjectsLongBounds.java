package classes.modern_test;

import java.util.Objects;

public class Java16ObjectsLongBounds {
  public static void main(String[] args) {
    long high = Long.MAX_VALUE;

    System.out.println(Objects.checkIndex(high - 1, high));
    System.out.println(Objects.checkIndex(0L, 1L));
    try {
      Objects.checkIndex(high, high);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkIndex(0L, -1L);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Objects.checkFromToIndex(high - 2, high - 1, high));
    System.out.println(Objects.checkFromToIndex(high, high, high));
    try {
      Objects.checkFromToIndex(high - 1, high - 2, high);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkFromToIndex(0L, 1L, -1L);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Objects.checkFromIndexSize(high - 2, 1L, high));
    System.out.println(Objects.checkFromIndexSize(high, 0L, high));
    try {
      Objects.checkFromIndexSize(high - 1, 2L, high);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Objects.checkFromIndexSize(0L, -1L, high);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
