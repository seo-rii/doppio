package classes.modern_test;

import java.util.Set;

public class Java9SetFactory {
  public static void main(String[] args) {
    System.out.println(Set.of().size());
    System.out.println(Set.of("a", "b").contains("b"));
    System.out.println(Set.of("a", "b").size());
    System.out.println(Set.of("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k").contains("k"));
    System.out.println(Set.of(new String[0]) == Set.<String>of());
    try {
      Set.of("a", null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Set.of("a", "a");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Set.of("a").add("b");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Set.of("a").contains(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
