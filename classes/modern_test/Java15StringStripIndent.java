package classes.modern_test;

public class Java15StringStripIndent {
  public static void main(String[] args) {
    print("empty", "");
    print("basic", "  a\n  b");
    print("trailing", "  a  \n  b  ");
    print("blank-last", "    a\n    b\n  ");
    print("ends-newline", "  a\n  b\n");
    print("blank-lines", "    a\n\n    b");
    print("tabs", "\t\ta\n\t\tb");
    print("all-blank", "   ");
  }

  private static void print(String label, String value) {
    System.out.println(label + ":" + show(value.stripIndent()));
  }

  private static String show(String value) {
    return value
      .replace("\\", "\\\\")
      .replace("\t", "<tab>")
      .replace(" ", ".")
      .replace("\n", "\\n");
  }
}
