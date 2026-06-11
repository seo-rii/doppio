package classes.modern_test;

import java.util.NoSuchElementException;
import java.util.Optional;

public class Java10Optional {
  public static void main(String[] args) {
    System.out.println(Optional.of("x").orElseThrow());
    try {
      Optional.empty().orElseThrow();
      System.out.println(false);
    } catch (NoSuchElementException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      System.out.println(Optional.of("x").orElseThrow(null));
    } catch (NullPointerException e) {
      System.out.println(false);
    }
    try {
      Optional.empty().orElseThrow(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
