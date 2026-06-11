package classes.modern_test;

import java.text.CompactNumberFormat;
import java.text.DecimalFormatSymbols;
import java.text.ParsePosition;
import java.util.Locale;

public class Java12CompactNumberFormat {
  public static void main(String[] args) {
    String[] patterns = new String[] {
      "", "", "", "0K", "00K", "000K", "0M", "00M", "000M", "0B", "00B", "000B"
    };
    CompactNumberFormat format = new CompactNumberFormat("#,##0", DecimalFormatSymbols.getInstance(Locale.US), patterns);

    System.out.println(format.format(0));
    System.out.println(format.format(12));
    System.out.println(format.format(999));
    System.out.println(format.format(1000));
    System.out.println(format.format(1200));
    System.out.println(format.format(12000));
    System.out.println(format.format(1234567));
    System.out.println(format.format(-1200));

    ParsePosition position = new ParsePosition(0);
    System.out.println(format.parse("12K", position));
    System.out.println(position.getIndex());

    try {
      new CompactNumberFormat(null, DecimalFormatSymbols.getInstance(Locale.US), patterns);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new CompactNumberFormat("#,##0", null, patterns);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new CompactNumberFormat("#,##0", DecimalFormatSymbols.getInstance(Locale.US), null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
