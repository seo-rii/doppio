package java.lang;

final class DoppioCharacter {
  private DoppioCharacter() {
  }

  static String toString(int codePoint) {
    if (!Character.isValidCodePoint(codePoint)) {
      throw new IllegalArgumentException("Not a valid Unicode code point: 0x" +
          Integer.toHexString(codePoint).toUpperCase());
    }
    return new String(Character.toChars(codePoint));
  }
}
