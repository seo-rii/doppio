package java.util.regex;

import java.util.ArrayList;

/** Shared Java 21 delimiter-preserving split for String and Pattern. */
public final class DoppioPattern {
  private DoppioPattern() {
  }

  public static String[] splitWithDelimiters(String input, String regex, int limit) {
    return splitWithDelimiters(Pattern.compile(regex), input, limit);
  }

  public static String[] splitWithDelimiters(Pattern pattern, CharSequence input, int limit) {
    Matcher matcher = pattern.matcher(input);
    ArrayList<String> parts = new ArrayList<String>();
    int position = 0;
    int splits = 0;
    boolean remainderAdded = false;
    while (matcher.find()) {
      if (limit > 0 && splits == limit - 1) {
        if (!remainderAdded) {
          parts.add(input.subSequence(position, input.length()).toString());
          position = matcher.end();
          remainderAdded = true;
        }
      } else {
        int start = matcher.start();
        int end = matcher.end();
        // A leading zero-width match contributes neither a token nor a
        // delimiter, and does not consume the positive match limit.
        if (position == 0 && start == 0 && end == 0) {
          continue;
        }
        parts.add(input.subSequence(position, start).toString());
        position = end;
        parts.add(input.subSequence(start, end).toString());
        splits++;
      }
    }
    if (position == 0) {
      return new String[] {input.toString()};
    }
    if (!remainderAdded) {
      parts.add(input.subSequence(position, input.length()).toString());
    }
    int size = parts.size();
    if (limit == 0) {
      // Empty delimiters, not only empty tokens, are stripped from the tail.
      while (size > 0 && parts.get(size - 1).isEmpty()) {
        size--;
      }
    }
    String[] result = new String[size];
    for (int i = 0; i < size; i++) {
      result[i] = parts.get(i);
    }
    return result;
  }
}
