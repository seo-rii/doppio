package java.lang;

/** Java 21 bounded searches on the retained UTF-16 String implementation. */
final class DoppioString {
  private DoppioString() {
  }

  private static void checkRange(int begin, int end, int length) {
    if (begin < 0 || begin > end || end > length) {
      throw new StringIndexOutOfBoundsException(
          "Range [" + begin + ", " + end + ") out of bounds for length " + length);
    }
  }

  static int indexOf(String input, int codePoint, int begin, int end) {
    checkRange(begin, end, input.length());
    if (!Character.isValidCodePoint(codePoint)) {
      return -1;
    }
    if (codePoint <= Character.MAX_VALUE) {
      for (int i = begin; i < end; i++) {
        if (input.charAt(i) == codePoint) {
          return i;
        }
      }
    } else {
      char high = Character.highSurrogate(codePoint);
      char low = Character.lowSurrogate(codePoint);
      // Both UTF-16 code units must lie inside the requested range.
      for (int i = begin; i < end - 1; i++) {
        if (input.charAt(i) == high && input.charAt(i + 1) == low) {
          return i;
        }
      }
    }
    return -1;
  }

  static int indexOf(String input, String needle, int begin, int end) {
    // Like the JDK, reject a null needle before validating the range.
    int length = needle.length();
    checkRange(begin, end, input.length());
    if (length == 0) {
      return begin;
    }
    int lastStart = end - length;
    char first = needle.charAt(0);
    for (int i = begin; i <= lastStart; i++) {
      if (input.charAt(i) == first && input.regionMatches(i, needle, 0, length)) {
        return i;
      }
    }
    return -1;
  }
}
