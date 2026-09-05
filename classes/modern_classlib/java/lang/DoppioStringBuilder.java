package java.lang;

/** Java 21 repetition on the Java 8 bootstrap's UTF-16 builders. */
final class DoppioStringBuilder {
  private DoppioStringBuilder() {
  }

  static void repeat(AbstractStringBuilder builder, int codePoint, int count) {
    if (count < 0) {
      throw new IllegalArgumentException("count is negative: " + count);
    }
    if (count == 0) {
      return;
    }
    // toChars also accepts individual surrogate code units, as the JDK does.
    repeat(builder, new String(Character.toChars(codePoint)), count);
  }

  static void repeat(AbstractStringBuilder builder, CharSequence sequence, int count) {
    if (count < 0) {
      throw new IllegalArgumentException("count is negative: " + count);
    }
    if (count == 0) {
      return;
    }
    if (count == 1) {
      builder.append(sequence);
      return;
    }
    if (sequence == null) {
      sequence = "null";
    }
    int length = sequence.length();
    if (length == 0) {
      return;
    }
    int start = builder.length();
    if (length > (Integer.MAX_VALUE - start) / count) {
      throw new OutOfMemoryError("Required length exceeds implementation limit");
    }
    int additional = length * count;
    builder.ensureCapacity(start + additional);

    // Read the input once without relying on CharSequence.toString(). This
    // preserves the original contents when the sequence is the receiver.
    char[] original = new char[length];
    for (int i = 0; i < length; i++) {
      original[i] = sequence.charAt(i);
    }
    builder.append(original);

    // Reuse the appended region in doubling chunks, rather than making count
    // separate appends or allocating a second full-sized repeated array.
    int copied = length;
    while (copied < additional) {
      int chunk = Math.min(copied, additional - copied);
      builder.append(builder, start, start + chunk);
      copied += chunk;
    }
  }
}
