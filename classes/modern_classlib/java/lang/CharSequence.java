package java.lang;

import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.PrimitiveIterator;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.IntStream;
import java.util.stream.StreamSupport;

public interface CharSequence {
  int length();

  char charAt(int index);

  default boolean isEmpty() {
    return length() == 0;
  }

  CharSequence subSequence(int start, int end);

  String toString();

  default IntStream chars() {
    final CharSequence sequence = this;
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private int index;

      public boolean hasNext() {
        return index < sequence.length();
      }

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        return sequence.charAt(index++);
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliterator(iterator, length(), Spliterator.ORDERED),
      false
    );
  }

  default IntStream codePoints() {
    final CharSequence sequence = this;
    PrimitiveIterator.OfInt iterator = new PrimitiveIterator.OfInt() {
      private int index;

      public boolean hasNext() {
        return index < sequence.length();
      }

      public int nextInt() {
        if (!hasNext()) {
          throw new NoSuchElementException();
        }
        char first = sequence.charAt(index++);
        if (Character.isHighSurrogate(first) && index < sequence.length()) {
          char second = sequence.charAt(index);
          if (Character.isLowSurrogate(second)) {
            index++;
            return Character.toCodePoint(first, second);
          }
        }
        return first;
      }
    };
    return StreamSupport.intStream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED),
      false
    );
  }

  static int compare(CharSequence cs1, CharSequence cs2) {
    Objects.requireNonNull(cs1);
    Objects.requireNonNull(cs2);
    if (cs1 == cs2) {
      return 0;
    }
    if (cs1.getClass() == cs2.getClass() && cs1 instanceof Comparable) {
      return ((Comparable) cs1).compareTo(cs2);
    }
    int limit = Math.min(cs1.length(), cs2.length());
    for (int i = 0; i < limit; i++) {
      char c1 = cs1.charAt(i);
      char c2 = cs2.charAt(i);
      if (c1 != c2) {
        return c1 - c2;
      }
    }
    return cs1.length() - cs2.length();
  }
}
