package classes.modern_test;

public class Java15StringTranslateEscapes {
  public static void main(String[] args) {
    print("plain", "plain");
    print("newline", "a\\nb");
    print("space", "a\\sb");
    print("quotes", "\\\"\\'\\\\");
    printCodes("controls", "\\b\\t\\n\\f\\r");
    printCodes("octal", "\\101\\0\\7\\40\\377\\400");
    print("continuation", "a\\" + "\n" + "b");

    try {
      "\\x".translateEscapes();
      System.out.println(false);
    } catch (IllegalArgumentException ex) {
      System.out.println(ex.getClass().getName());
    }

    try {
      "\\".translateEscapes();
      System.out.println(false);
    } catch (IllegalArgumentException ex) {
      System.out.println(ex.getClass().getName());
    }
  }

  private static void print(String label, String value) {
    System.out.println(label + ":" + show(value.translateEscapes()));
  }

  private static void printCodes(String label, String value) {
    String translated = value.translateEscapes();
    StringBuilder builder = new StringBuilder(label + ":");
    for (int i = 0; i < translated.length(); i++) {
      if (i > 0) {
        builder.append(',');
      }
      builder.append((int) translated.charAt(i));
    }
    System.out.println(builder.toString());
  }

  private static String show(String value) {
    return value
      .replace("\\", "\\\\")
      .replace("\b", "\\b")
      .replace("\t", "\\t")
      .replace("\n", "\\n")
      .replace("\f", "\\f")
      .replace("\r", "\\r")
      .replace(" ", ".");
  }
}
