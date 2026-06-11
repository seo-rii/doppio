package classes.modern_test;

import java.util.Iterator;
import java.util.Spliterator;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public class Java9MatcherResults {
  public static void main(String[] args) {
    Matcher matcher = Pattern.compile("(a+)(b?)").matcher("aa ab aaa");
    StringBuilder matches = new StringBuilder();
    matcher.results().forEach(result -> append(matches, result));
    System.out.println(matches.toString());

    Iterator<MatchResult> iterator = Pattern.compile("\\w+").matcher("ab cd").results().iterator();
    MatchResult first = iterator.next();
    MatchResult second = iterator.next();
    System.out.println(first.group() + ":" + first.start() + "-" + first.end());
    System.out.println(second.group() + ":" + second.start() + "-" + second.end());
    printFailure("exhausted", () -> iterator.next());

    Matcher advanced = Pattern.compile("\\d+").matcher("a1 b22 c333");
    System.out.println(advanced.find());
    System.out.println(advanced.group());
    StringBuilder remaining = new StringBuilder();
    advanced.results().forEach(result -> remaining.append(result.group()).append(","));
    System.out.println(remaining.toString());

    System.out.println(Pattern.compile("z+").matcher("abc").results().count());

    Stream<MatchResult> stream = Pattern.compile("x+").matcher("xx yy").results();
    Spliterator<MatchResult> spliterator = stream.spliterator();
    System.out.println(spliterator.hasCharacteristics(Spliterator.ORDERED));
    System.out.println(spliterator.hasCharacteristics(Spliterator.NONNULL));
    System.out.println(spliterator.hasCharacteristics(Spliterator.SIZED));
  }

  private static void append(StringBuilder builder, MatchResult result) {
    builder
      .append(result.group())
      .append(":")
      .append(result.start())
      .append("-")
      .append(result.end())
      .append(":")
      .append(result.group(1))
      .append(":")
      .append(result.group(2))
      .append("|");
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
