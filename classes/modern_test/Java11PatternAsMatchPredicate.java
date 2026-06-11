package classes.modern_test;

import java.util.function.Predicate;
import java.util.regex.Pattern;

public class Java11PatternAsMatchPredicate {
  public static void main(String[] args) {
    Pattern letters = Pattern.compile("[a-z]+");
    Predicate<String> matchesLetters = letters.asMatchPredicate();
    System.out.println(matchesLetters.test("abc"));
    System.out.println(matchesLetters.test("abc1"));
    System.out.println(Pattern.compile("a.*z").asMatchPredicate().test("abcz"));
    System.out.println(Pattern.compile("^a$").asMatchPredicate().test("aa"));
    System.out.println(Pattern.compile("").asMatchPredicate().test(""));
    printFailure("null-input", () -> matchesLetters.test(null));
    printFailure("raw-type", () -> ((Predicate) matchesLetters).test(new StringBuilder("abc")));

    Predicate<String> captured = Pattern.compile("x+").asMatchPredicate();
    System.out.println(captured.test("xx"));
    System.out.println(captured.test("xxy"));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run();
  }
}
