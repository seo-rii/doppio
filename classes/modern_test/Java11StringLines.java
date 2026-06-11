package classes.modern_test;

import java.util.List;
import java.util.stream.Collectors;

public class Java11StringLines {
  public static void main(String[] args) {
    printLines("empty", "");
    printLines("plain", "one");
    printLines("mixed", "a\nb\r\nc\rd");
    printLines("trailing-lf", "a\n");
    printLines("only-lf", "\n");
    printLines("double-lf", "a\n\nb");
  }

  private static void printLines(String label, String value) {
    List<String> lines = value.lines().collect(Collectors.toList());
    System.out.println(label + ":" + lines.size() + ":" +
      lines.stream().map(line -> "[" + line + "]").collect(Collectors.joining(",")));
  }
}
