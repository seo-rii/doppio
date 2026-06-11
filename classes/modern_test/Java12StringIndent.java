package classes.modern_test;

public class Java12StringIndent {
  public static void main(String[] args) {
    print("empty", "", 2);
    print("positive", "a\nb", 2);
    print("zero-crlf", "a\r\nb\r", 0);
    print("negative-spaces", "    a\n  b", -2);
    print("negative-tabs", " \t a", -3);
    print("trailing-lf", "a\n", 4);
    print("only-lf", "\n", 1);
    print("large-negative", " x", -10);
  }

  private static void print(String label, String value, int count) {
    System.out.println(label + ":" + show(value.indent(count)));
  }

  private static String show(String value) {
    return value
      .replace("\t", "<tab>")
      .replace(" ", ".")
      .replace("\n", "\\n");
  }
}
