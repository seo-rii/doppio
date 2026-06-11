package classes.modern_test;

import java.util.Iterator;
import java.util.Spliterator;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;
import java.util.Scanner;
import java.util.stream.Stream;

public class Java9ScannerFindAll {
  public static void main(String[] args) {
    Scanner pairs = new Scanner("a1 b22 c333");
    Pattern pairPattern = Pattern.compile("([a-z])(\\d+)");
    StringBuilder pairResults = new StringBuilder();
    pairs.findAll(pairPattern).forEach(result -> append(pairResults, result));
    System.out.println(pairResults.toString());

    Scanner digits = new Scanner("x1 y22 z333");
    StringBuilder digitResults = new StringBuilder();
    digits.findAll("\\d+").forEach(result -> digitResults.append(result.group()).append("@").append(result.start()).append("|"));
    System.out.println(digitResults.toString());

    Scanner advanced = new Scanner("pre 11 mid 22 tail 333");
    System.out.println(advanced.findWithinHorizon("\\d+", 0));
    StringBuilder remaining = new StringBuilder();
    advanced.findAll(Pattern.compile("\\d+")).forEach(result -> remaining.append(result.group()).append(","));
    System.out.println(remaining.toString());

    System.out.println(new Scanner("abc").findAll("\\d+").count());

    Iterator<MatchResult> iterator = new Scanner("p7 q8").findAll("([a-z])(\\d)").iterator();
    MatchResult first = iterator.next();
    MatchResult second = iterator.next();
    System.out.println(first.group(1) + ":" + first.group(2));
    System.out.println(second.group(1) + ":" + second.group(2));
    printFailure("exhausted", () -> iterator.next());

    Stream<MatchResult> stream = new Scanner("one 1").findAll("\\d+");
    Spliterator<MatchResult> spliterator = stream.spliterator();
    System.out.println(spliterator.hasCharacteristics(Spliterator.ORDERED));
    System.out.println(spliterator.hasCharacteristics(Spliterator.NONNULL));
    System.out.println(spliterator.hasCharacteristics(Spliterator.SIZED));

    printFailure("null-pattern", () -> new Scanner("x").findAll((Pattern) null));
    printFailure("null-string", () -> new Scanner("x").findAll((String) null));
  }

  private static void append(StringBuilder builder, MatchResult result) {
    builder
      .append(result.group())
      .append(":")
      .append(result.group(1))
      .append(":")
      .append(result.group(2))
      .append("@")
      .append(result.start())
      .append("-")
      .append(result.end())
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
