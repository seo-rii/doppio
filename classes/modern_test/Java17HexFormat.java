package classes.modern_test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.HexFormat;

public class Java17HexFormat {
  private static final class ThrowingAppendable implements Appendable {
    public Appendable append(CharSequence chars) throws IOException {
      throw new IOException("boom");
    }

    public Appendable append(CharSequence chars, int start, int end) throws IOException {
      throw new IOException("boom");
    }

    public Appendable append(char ch) throws IOException {
      throw new IOException("boom");
    }
  }

  public static void main(String[] args) {
    byte[] bytes = new byte[] { 0, 15, 16, -1 };
    HexFormat lower = HexFormat.of();

    System.out.println(lower.formatHex(bytes));
    System.out.println(lower.formatHex(bytes, 1, 3));

    HexFormat decorated = HexFormat.ofDelimiter(":").withPrefix("0x").withSuffix("!");
    System.out.println(decorated.formatHex(new byte[] { 10, 43, -1 }));
    byte[] parsed = decorated.parseHex("0x0a!:0x2b!:0xff!");
    System.out.println(parsed.length);
    System.out.println(HexFormat.of().formatHex(parsed));

    System.out.println(HexFormat.ofDelimiter(":").withUpperCase().formatHex(bytes));

    StringBuilder builder = new StringBuilder("[");
    lower.formatHex(builder, new byte[] { 1, 35 });
    System.out.println(builder.append("]").toString());

    System.out.println(decorated.delimiter());
    System.out.println(decorated.prefix());
    System.out.println(decorated.suffix());
    System.out.println(decorated.isUpperCase());
    System.out.println(HexFormat.ofDelimiter(":").withUpperCase().isUpperCase());

    byte[] parsedChars = decorated.parseHex("xx0x0a!:0x2b!:yy".toCharArray(), 2, 13);
    System.out.println(parsedChars.length);
    System.out.println(lower.formatHex(parsedChars));

    byte[] parsedSlice = lower.parseHex("xx0010yy", 2, 6);
    System.out.println(parsedSlice.length);
    System.out.println(lower.formatHex(parsedSlice));
    System.out.println(lower.parseHex("").length);
    System.out.println(decorated.parseHex("").length);
    StringBuilder emptyFormat = new StringBuilder("empty=");
    System.out.println(lower.formatHex(emptyFormat, bytes, 2, 2).toString());

    StringBuilder byteDigits = new StringBuilder("b=");
    lower.toHexDigits(byteDigits, (byte) 0x2a);
    System.out.println(byteDigits.toString());

    System.out.println("" + lower.toHighHexDigit(0xab) + lower.toLowHexDigit(0xab));
    HexFormat upper = HexFormat.of().withUpperCase();
    System.out.println("" + upper.toHighHexDigit(0xab) + upper.toLowHexDigit(0xab));

    System.out.println(HexFormat.isHexDigit('f'));
    System.out.println(HexFormat.isHexDigit('G'));
    System.out.println(HexFormat.fromHexDigit('F'));
    try {
      HexFormat.fromHexDigit('g');
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(HexFormat.fromHexDigits("7fffffff"));
    System.out.println(HexFormat.fromHexDigits("ffffffff"));
    System.out.println(HexFormat.fromHexDigits("0", 0, 1));
    System.out.println(HexFormat.fromHexDigitsToLong("7fffffffffffffff"));
    System.out.println(HexFormat.fromHexDigitsToLong("ffffffffffffffff"));
    System.out.println(lower.toHexDigits((byte) -1));
    System.out.println(lower.toHexDigits('A'));
    System.out.println(lower.toHexDigits((short) 0x1234));
    System.out.println(lower.toHexDigits(42));
    System.out.println(lower.toHexDigits(42L));
    System.out.println(lower.toHexDigits(0x123456789abcdef0L, 12));
    System.out.println(lower.toHexDigits(0x123456789abcdef0L, 0).length());
    System.out.println(lower.toHexDigits(42L, 4));
    System.out.println(lower.equals(HexFormat.of()));
    System.out.println(HexFormat.of() == HexFormat.of());
    System.out.println(HexFormat.ofDelimiter("") == HexFormat.of());
    System.out.println(lower.withLowerCase() == lower);
    System.out.println(upper.withUpperCase() == upper);
    System.out.println(upper.withLowerCase() == lower);

    HexFormat valueFormat = HexFormat.ofDelimiter(":").withPrefix("0x").withSuffix(";").withUpperCase();
    HexFormat sameValueFormat = HexFormat.of().withDelimiter(":").withPrefix("0x").withSuffix(";").withUpperCase();
    System.out.println(valueFormat.equals(sameValueFormat));
    System.out.println(valueFormat.hashCode() == sameValueFormat.hashCode());
    System.out.println(valueFormat.equals(lower));
    System.out.println(valueFormat.equals(null));
    System.out.println(valueFormat.equals("bad"));
    System.out.println(lower.toString());
    System.out.println(valueFormat.toString());
    System.out.println(valueFormat.withLowerCase().toString());
    System.out.println(valueFormat.withDelimiter(":") == valueFormat);
    System.out.println(valueFormat.withPrefix("0x") == valueFormat);
    System.out.println(valueFormat.withSuffix(";") == valueFormat);
    System.out.println(valueFormat.withUpperCase() == valueFormat);
    System.out.println(valueFormat.withLowerCase() == valueFormat);

    try {
      HexFormat.ofDelimiter(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.formatHex((Appendable) null, bytes);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.parseHex((CharSequence) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.formatHex(bytes, -1, 1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.parseHex("0010", 3, 2);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.parseHex("0");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HexFormat.ofDelimiter(":").parseHex("aa-bb");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.parseHex("zz");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HexFormat.fromHexDigits("123456789");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HexFormat.fromHexDigitsToLong("123456789abcdef01");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.toHexDigits(1L, 17);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lower.formatHex(new ThrowingAppendable(), bytes);
      System.out.println(false);
    } catch (UncheckedIOException e) {
      System.out.println(e.getClass().getName());
      System.out.println(e.getCause().getClass().getName());
    }
    try {
      lower.toHexDigits(new ThrowingAppendable(), (byte) 1);
      System.out.println(false);
    } catch (UncheckedIOException e) {
      System.out.println(e.getClass().getName());
      System.out.println(e.getCause().getClass().getName());
    }
  }
}
