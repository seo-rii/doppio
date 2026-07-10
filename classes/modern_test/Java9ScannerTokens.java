package classes.modern_test;

import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.Scanner;
import java.util.Spliterator;
import java.util.stream.Stream;

public class Java9ScannerTokens {
  public static void main(String[] args) {
    Scanner words = new Scanner("alpha beta  gamma");
    StringBuilder joined = new StringBuilder();
    words.tokens().forEach(token -> joined.append(token).append("|"));
    System.out.println(joined.toString());

    Scanner comma = new Scanner("a,b,,c");
    comma.useDelimiter(",");
    StringBuilder commaTokens = new StringBuilder();
    comma.tokens().forEach(token -> commaTokens.append("[").append(token).append("]"));
    System.out.println(commaTokens.toString());

    Scanner advanced = new Scanner("first second third");
    System.out.println(advanced.next());
    StringBuilder remaining = new StringBuilder();
    advanced.tokens().forEach(token -> remaining.append(token).append(","));
    System.out.println(remaining.toString());

    System.out.println(new Scanner("").tokens().count());

    Iterator<String> iterator = new Scanner("x y").tokens().iterator();
    System.out.println(iterator.next());
    System.out.println(iterator.next());
    printFailure("exhausted", () -> iterator.next());

    Stream<String> stream = new Scanner("one").tokens();
    Spliterator<String> spliterator = stream.spliterator();
    System.out.println(spliterator.hasCharacteristics(Spliterator.ORDERED));
    System.out.println(spliterator.hasCharacteristics(Spliterator.NONNULL));
    System.out.println(spliterator.hasCharacteristics(Spliterator.SIZED));

    Scanner closeSource = new Scanner("close me");
    Stream<String> closeStream = closeSource.tokens();
    closeStream.close();
    printFailure("tokens-close", () -> closeSource.hasNext());
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
