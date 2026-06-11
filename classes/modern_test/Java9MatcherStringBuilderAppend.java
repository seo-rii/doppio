package classes.modern_test;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Java9MatcherStringBuilderAppend {
  public static void main(String[] args) {
    Matcher pairs = Pattern.compile("([a-z])(\\d+)").matcher("a1 b22");
    StringBuilder builder = new StringBuilder("prefix:");
    while (pairs.find()) {
      System.out.println(pairs.appendReplacement(builder, "$1-$2") == pairs);
    }
    System.out.println(pairs.appendTail(builder) == builder);
    System.out.println(builder.toString());

    Matcher quoted = Pattern.compile("(\\d+)").matcher("x1 y22");
    StringBuilder literal = new StringBuilder();
    while (quoted.find()) {
      quoted.appendReplacement(literal, Matcher.quoteReplacement("[$1]\\"));
    }
    quoted.appendTail(literal);
    System.out.println(literal.toString());

    Matcher noMatch = Pattern.compile("\\d+").matcher("abc");
    StringBuilder noMatchBuilder = new StringBuilder("start:");
    System.out.println(noMatch.appendTail(noMatchBuilder) == noMatchBuilder);
    System.out.println(noMatchBuilder.toString());

    Matcher advanced = Pattern.compile("\\d+").matcher("a1 b22 c333");
    System.out.println(advanced.find());
    StringBuilder advancedBuilder = new StringBuilder("seed:");
    advanced.appendReplacement(advancedBuilder, "<$0>");
    System.out.println(advanced.find());
    advanced.appendReplacement(advancedBuilder, "{$0}");
    advanced.appendTail(advancedBuilder);
    System.out.println(advancedBuilder.toString());

    printFailure("append-before-find", () ->
      Pattern.compile("x").matcher("x").appendReplacement(new StringBuilder(), "y"));
    printFailure("append-null-builder", () -> {
      Matcher matcher = Pattern.compile("x").matcher("x");
      matcher.find();
      matcher.appendReplacement((StringBuilder) null, "y");
    });
    printFailure("append-null-replacement", () -> {
      Matcher matcher = Pattern.compile("x").matcher("x");
      matcher.find();
      matcher.appendReplacement(new StringBuilder(), null);
    });
    printFailure("tail-null-builder", () ->
      Pattern.compile("x").matcher("x").appendTail((StringBuilder) null));
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
