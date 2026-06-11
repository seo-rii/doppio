package classes.modern_test;

import java.util.List;

public class Java9ListFactory {
  public static void main(String[] args) {
    System.out.println(List.of());
    System.out.println(List.of("a", "b").get(1));
    System.out.println(List.of("a", "b").size());
    System.out.println(List.of("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k").get(10));
    System.out.println(List.of(new String[0]) == List.<String>of());
    try {
      List.of("a", null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      List.of("a").add("b");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      List.of("a").contains(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      List.of("a").indexOf(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      List.of("a").lastIndexOf(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
