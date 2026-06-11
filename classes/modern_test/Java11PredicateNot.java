package classes.modern_test;

import java.util.function.Predicate;

public class Java11PredicateNot {
  public static void main(String[] args) {
    Predicate<String> empty = new Predicate<String>() {
      public boolean test(String value) {
        return value.isEmpty();
      }
    };
    Predicate<String> notEmpty = Predicate.not(empty);
    System.out.println(notEmpty.test("x"));
    System.out.println(notEmpty.test(""));
    System.out.println(Predicate.not(Predicate.isEqual("x")).test("y"));
    try {
      Predicate.not(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
