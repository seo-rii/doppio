package classes.modern_test;

import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.function.Function;

public class Java9MatcherFunctionReplace {
  public static void main(String[] args) {
    Pattern pairPattern = Pattern.compile("([a-z])(\\d+)");
    Matcher pairs = pairPattern.matcher("a1 b22 c333");
    System.out.println(pairs.replaceAll(result ->
      result.group(1).toUpperCase() + "{" + result.group(2) + "}@" + result.start()
    ));

    Matcher groupReferences = Pattern.compile("(\\d+)").matcher("x1 y22");
    System.out.println(groupReferences.replaceAll(result -> "[$1]"));
    System.out.println(Pattern.compile("(\\d+)").matcher("x1").replaceAll(result -> Matcher.quoteReplacement("[$1]")));

    Matcher first = Pattern.compile("([a-z]+)(\\d+)").matcher("a1 b22 c333");
    System.out.println(first.find());
    System.out.println(first.replaceFirst(result -> result.group(1).toUpperCase() + "-" + result.group(2)));

    Matcher noMatch = Pattern.compile("\\d+").matcher("abc");
    System.out.println(noMatch.replaceAll(result -> "hit"));
    System.out.println(noMatch.replaceFirst(result -> "hit"));

    final int[] calls = {0};
    String counted = Pattern.compile("\\d+").matcher("1 22 333").replaceAll(result -> {
      calls[0]++;
      return String.valueOf(result.group().length());
    });
    System.out.println(counted + ":" + calls[0]);

    printFailure("null-all", () -> Pattern.compile("x").matcher("x").replaceAll((Function<MatchResult, String>) null));
    printFailure("null-first", () -> Pattern.compile("x").matcher("x").replaceFirst((Function<MatchResult, String>) null));
    printFailure("null-result", () -> Pattern.compile("x").matcher("x").replaceAll(result -> null));
    printFailure("throwing", () -> Pattern.compile("x").matcher("x").replaceFirst(result -> {
      throw new IllegalStateException("boom");
    }));

    String probe = Pattern.compile("(\\d+)").matcher("q99").replaceAll(match -> {
      System.out.println(match.group(1) + "@" + match.start(1));
      return "<" + match.group(1) + ">";
    });
    System.out.println(probe);
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
