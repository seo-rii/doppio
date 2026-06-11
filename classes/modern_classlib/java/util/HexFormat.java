package java.util;

import java.io.IOException;
import java.io.UncheckedIOException;

public final class HexFormat {
  private static final char[] LOWER_DIGITS = "0123456789abcdef".toCharArray();
  private static final char[] UPPER_DIGITS = "0123456789ABCDEF".toCharArray();
  private static final HexFormat LOWER = new HexFormat("", "", "", false);

  private final String delimiter;
  private final String prefix;
  private final String suffix;
  private final boolean uppercase;

  private HexFormat(String delimiter, String prefix, String suffix, boolean uppercase) {
    this.delimiter = delimiter;
    this.prefix = prefix;
    this.suffix = suffix;
    this.uppercase = uppercase;
  }

  public static HexFormat of() {
    return LOWER;
  }

  public static HexFormat ofDelimiter(String delimiter) {
    return LOWER.withDelimiter(delimiter);
  }

  public HexFormat withDelimiter(String delimiter) {
    return new HexFormat(Objects.requireNonNull(delimiter), prefix, suffix, uppercase);
  }

  public HexFormat withPrefix(String prefix) {
    return new HexFormat(delimiter, Objects.requireNonNull(prefix), suffix, uppercase);
  }

  public HexFormat withSuffix(String suffix) {
    return new HexFormat(delimiter, prefix, Objects.requireNonNull(suffix), uppercase);
  }

  public HexFormat withUpperCase() {
    return new HexFormat(delimiter, prefix, suffix, true);
  }

  public HexFormat withLowerCase() {
    return new HexFormat(delimiter, prefix, suffix, false);
  }

  public String delimiter() {
    return delimiter;
  }

  public String prefix() {
    return prefix;
  }

  public String suffix() {
    return suffix;
  }

  public boolean isUpperCase() {
    return uppercase;
  }

  public String formatHex(byte[] bytes) {
    return formatHex(bytes, 0, bytes.length);
  }

  public String formatHex(byte[] bytes, int fromIndex, int toIndex) {
    Objects.requireNonNull(bytes);
    checkBounds(bytes.length, fromIndex, toIndex);
    StringBuilder builder = new StringBuilder();
    formatHexDigits(builder, bytes, fromIndex, toIndex);
    return builder.toString();
  }

  public <A extends Appendable> A formatHex(A out, byte[] bytes) {
    return formatHex(out, bytes, 0, bytes.length);
  }

  public <A extends Appendable> A formatHex(A out, byte[] bytes, int fromIndex, int toIndex) {
    Objects.requireNonNull(out);
    Objects.requireNonNull(bytes);
    checkBounds(bytes.length, fromIndex, toIndex);
    formatHexDigits(out, bytes, fromIndex, toIndex);
    return out;
  }

  public byte[] parseHex(CharSequence string) {
    return parseHex(string, 0, string.length());
  }

  public byte[] parseHex(CharSequence string, int fromIndex, int toIndex) {
    Objects.requireNonNull(string);
    checkBounds(string.length(), fromIndex, toIndex);
    int tokenLength = prefix.length() + 2 + suffix.length();
    int length = toIndex - fromIndex;
    if (length == 0) {
      return new byte[0];
    }
    if (tokenLength == 0) {
      throw new IllegalArgumentException();
    }

    int byteCount;
    if (delimiter.length() == 0) {
      if (length % tokenLength != 0) {
        throw new IllegalArgumentException();
      }
      byteCount = length / tokenLength;
    } else {
      int unitLength = tokenLength + delimiter.length();
      if ((length + delimiter.length()) % unitLength != 0) {
        throw new IllegalArgumentException();
      }
      byteCount = (length + delimiter.length()) / unitLength;
    }

    byte[] bytes = new byte[byteCount];
    int index = fromIndex;
    for (int i = 0; i < byteCount; i++) {
      if (i > 0) {
        requireSubstring(string, index, delimiter);
        index += delimiter.length();
      }
      requireSubstring(string, index, prefix);
      index += prefix.length();
      int high = fromHexDigit(string.charAt(index++));
      int low = fromHexDigit(string.charAt(index++));
      bytes[i] = (byte) ((high << 4) | low);
      requireSubstring(string, index, suffix);
      index += suffix.length();
    }
    return bytes;
  }

  public byte[] parseHex(char[] chars, int fromIndex, int toIndex) {
    Objects.requireNonNull(chars);
    checkBounds(chars.length, fromIndex, toIndex);
    return parseHex(new String(chars), fromIndex, toIndex);
  }

  public char toLowHexDigit(int value) {
    return digits()[value & 0xf];
  }

  public char toHighHexDigit(int value) {
    return digits()[(value >>> 4) & 0xf];
  }

  public <A extends Appendable> A toHexDigits(A out, byte value) {
    Objects.requireNonNull(out);
    appendByte(out, value & 0xff);
    return out;
  }

  public String toHexDigits(byte value) {
    return toHexDigits(value & 0xff, 2);
  }

  public String toHexDigits(char value) {
    return toHexDigits(value, 4);
  }

  public String toHexDigits(short value) {
    return toHexDigits(value & 0xffff, 4);
  }

  public String toHexDigits(int value) {
    return toHexDigits(value & 0xffffffffL, 8);
  }

  public String toHexDigits(long value) {
    return toHexDigits(value, 16);
  }

  public String toHexDigits(long value, int digits) {
    if (digits < 0 || digits > 16) {
      throw new IllegalArgumentException();
    }
    char[] out = new char[digits];
    char[] alphabet = digits();
    for (int i = digits - 1; i >= 0; i--) {
      out[i] = alphabet[(int) (value & 0xf)];
      value >>>= 4;
    }
    return new String(out);
  }

  public static boolean isHexDigit(int ch) {
    return ('0' <= ch && ch <= '9') || ('a' <= ch && ch <= 'f') || ('A' <= ch && ch <= 'F');
  }

  public static int fromHexDigit(int ch) {
    if ('0' <= ch && ch <= '9') {
      return ch - '0';
    }
    if ('a' <= ch && ch <= 'f') {
      return ch - 'a' + 10;
    }
    if ('A' <= ch && ch <= 'F') {
      return ch - 'A' + 10;
    }
    throw new NumberFormatException();
  }

  public static int fromHexDigits(CharSequence string) {
    return fromHexDigits(string, 0, string.length());
  }

  public static int fromHexDigits(CharSequence string, int fromIndex, int toIndex) {
    Objects.requireNonNull(string);
    checkBounds(string.length(), fromIndex, toIndex);
    int length = toIndex - fromIndex;
    if (length > 8) {
      throw new IllegalArgumentException();
    }
    int value = 0;
    for (int i = fromIndex; i < toIndex; i++) {
      value = (value << 4) | fromHexDigit(string.charAt(i));
    }
    return value;
  }

  public static long fromHexDigitsToLong(CharSequence string) {
    return fromHexDigitsToLong(string, 0, string.length());
  }

  public static long fromHexDigitsToLong(CharSequence string, int fromIndex, int toIndex) {
    Objects.requireNonNull(string);
    checkBounds(string.length(), fromIndex, toIndex);
    int length = toIndex - fromIndex;
    if (length > 16) {
      throw new IllegalArgumentException();
    }
    long value = 0;
    for (int i = fromIndex; i < toIndex; i++) {
      value = (value << 4) | fromHexDigit(string.charAt(i));
    }
    return value;
  }

  public boolean equals(Object obj) {
    if (!(obj instanceof HexFormat)) {
      return false;
    }
    HexFormat other = (HexFormat) obj;
    return uppercase == other.uppercase
      && delimiter.equals(other.delimiter)
      && prefix.equals(other.prefix)
      && suffix.equals(other.suffix);
  }

  public int hashCode() {
    return Objects.hash(delimiter, prefix, suffix, Boolean.valueOf(uppercase));
  }

  public String toString() {
    return "uppercase: " + uppercase + ", delimiter: \"" + delimiter + "\", prefix: \"" + prefix + "\", suffix: \"" + suffix + "\"";
  }

  private static void checkBounds(int length, int fromIndex, int toIndex) {
    if (fromIndex < 0 || fromIndex > toIndex || toIndex > length) {
      throw new IndexOutOfBoundsException();
    }
  }

  private static void requireSubstring(CharSequence string, int index, String expected) {
    for (int i = 0; i < expected.length(); i++) {
      if (index + i >= string.length() || string.charAt(index + i) != expected.charAt(i)) {
        throw new IllegalArgumentException();
      }
    }
  }

  private void formatHexDigits(Appendable out, byte[] bytes, int fromIndex, int toIndex) {
    try {
      for (int i = fromIndex; i < toIndex; i++) {
        if (i > fromIndex) {
          out.append(delimiter);
        }
        out.append(prefix);
        appendByte(out, bytes[i] & 0xff);
        out.append(suffix);
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private void appendByte(Appendable out, int value) {
    try {
      out.append(toHighHexDigit(value));
      out.append(toLowHexDigit(value));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private char[] digits() {
    return uppercase ? UPPER_DIGITS : LOWER_DIGITS;
  }
}
