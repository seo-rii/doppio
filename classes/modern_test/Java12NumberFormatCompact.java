package classes.modern_test;

import java.text.NumberFormat;
import java.util.Locale;

public class Java12NumberFormatCompact {
  public static void main(String[] args) {
    Locale previous = Locale.getDefault();
    Locale.setDefault(Locale.US);
    try {
      NumberFormat defaultFormat = NumberFormat.getCompactNumberInstance();
      NumberFormat shortFormat = NumberFormat.getCompactNumberInstance(Locale.US, NumberFormat.Style.SHORT);
      NumberFormat longFormat = NumberFormat.getCompactNumberInstance(Locale.US, NumberFormat.Style.LONG);

      System.out.println(defaultFormat.getClass().getName());
      System.out.println(defaultFormat.format(1200));
      System.out.println(shortFormat.format(1234));
      System.out.println(shortFormat.format(1234567));
      System.out.println(shortFormat.format(-1200));
      System.out.println(longFormat.format(1200));
      System.out.println(longFormat.format(1234567));
      System.out.println(longFormat.format(-1200));
      System.out.println(defaultFormat == NumberFormat.getCompactNumberInstance());

      printFailure("null-locale", () -> NumberFormat.getCompactNumberInstance(null, NumberFormat.Style.SHORT));
      printFailure("null-style", () -> NumberFormat.getCompactNumberInstance(Locale.US, null));
    } finally {
      Locale.setDefault(previous);
    }
  }

  private static void printFailure(String label, ThrowingRunnable action) {
    try {
      action.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface ThrowingRunnable {
    void run() throws Exception;
  }
}
