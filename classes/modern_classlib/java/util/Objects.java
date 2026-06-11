package java.util;

import java.util.function.Supplier;

public final class Objects {
  private Objects() {}

  public static boolean equals(Object a, Object b) {
    return a == b || (a != null && a.equals(b));
  }

  public static boolean deepEquals(Object a, Object b) {
    if (a == b) {
      return true;
    }
    if (a == null || b == null) {
      return false;
    }
    if (a instanceof Object[] && b instanceof Object[]) {
      return Arrays.deepEquals((Object[]) a, (Object[]) b);
    }
    if (a instanceof byte[] && b instanceof byte[]) {
      return Arrays.equals((byte[]) a, (byte[]) b);
    }
    if (a instanceof short[] && b instanceof short[]) {
      return Arrays.equals((short[]) a, (short[]) b);
    }
    if (a instanceof int[] && b instanceof int[]) {
      return Arrays.equals((int[]) a, (int[]) b);
    }
    if (a instanceof long[] && b instanceof long[]) {
      return Arrays.equals((long[]) a, (long[]) b);
    }
    if (a instanceof char[] && b instanceof char[]) {
      return Arrays.equals((char[]) a, (char[]) b);
    }
    if (a instanceof float[] && b instanceof float[]) {
      return Arrays.equals((float[]) a, (float[]) b);
    }
    if (a instanceof double[] && b instanceof double[]) {
      return Arrays.equals((double[]) a, (double[]) b);
    }
    if (a instanceof boolean[] && b instanceof boolean[]) {
      return Arrays.equals((boolean[]) a, (boolean[]) b);
    }
    return a.equals(b);
  }

  public static int hashCode(Object o) {
    return o != null ? o.hashCode() : 0;
  }

  public static int hash(Object... values) {
    return Arrays.hashCode(values);
  }

  public static String toString(Object o) {
    return String.valueOf(o);
  }

  public static String toString(Object o, String nullDefault) {
    return o != null ? o.toString() : nullDefault;
  }

  public static <T> int compare(T a, T b, Comparator<? super T> c) {
    return a == b ? 0 : c.compare(a, b);
  }

  public static <T> T requireNonNull(T obj) {
    if (obj == null) {
      throw new NullPointerException();
    }
    return obj;
  }

  public static <T> T requireNonNull(T obj, String message) {
    if (obj == null) {
      throw new NullPointerException(message);
    }
    return obj;
  }

  public static <T> T requireNonNull(T obj, Supplier<String> messageSupplier) {
    if (obj == null) {
      throw new NullPointerException(messageSupplier == null ? null : messageSupplier.get());
    }
    return obj;
  }

  public static boolean isNull(Object obj) {
    return obj == null;
  }

  public static boolean nonNull(Object obj) {
    return obj != null;
  }

  public static <T> T requireNonNullElse(T obj, T defaultObj) {
    return obj != null ? obj : requireNonNull(defaultObj, "defaultObj");
  }

  public static <T> T requireNonNullElseGet(T obj, Supplier<? extends T> supplier) {
    if (obj != null) {
      return obj;
    }
    Supplier<? extends T> defaultSupplier = requireNonNull(supplier, "supplier");
    return requireNonNull(defaultSupplier.get(), "supplier.get()");
  }

  public static int checkIndex(int index, int length) {
    if (index < 0 || index >= length) {
      throw outOfBounds("Index " + index + " out of bounds for length " + length);
    }
    return index;
  }

  public static int checkFromToIndex(int fromIndex, int toIndex, int length) {
    if (fromIndex < 0 || fromIndex > toIndex || toIndex > length) {
      throw outOfBounds("Range [" + fromIndex + ", " + toIndex + ") out of bounds for length " + length);
    }
    return fromIndex;
  }

  public static int checkFromIndexSize(int fromIndex, int size, int length) {
    if (fromIndex < 0 || size < 0 || length < 0 || fromIndex > length - size) {
      throw outOfBounds("Range [" + fromIndex + ", " + fromIndex + " + " + size + ") out of bounds for length " + length);
    }
    return fromIndex;
  }

  public static long checkIndex(long index, long length) {
    if (index < 0 || index >= length) {
      throw outOfBounds(new StringBuilder()
        .append("Index ")
        .append(index)
        .append(" out of bounds for length ")
        .append(length)
        .toString());
    }
    return index;
  }

  public static long checkFromToIndex(long fromIndex, long toIndex, long length) {
    if (fromIndex < 0 || fromIndex > toIndex || toIndex > length) {
      throw outOfBounds(new StringBuilder()
        .append("Range [")
        .append(fromIndex)
        .append(", ")
        .append(toIndex)
        .append(") out of bounds for length ")
        .append(length)
        .toString());
    }
    return fromIndex;
  }

  public static long checkFromIndexSize(long fromIndex, long size, long length) {
    if (fromIndex < 0 || size < 0 || length < 0 || fromIndex > length - size) {
      throw outOfBounds(new StringBuilder()
        .append("Range [")
        .append(fromIndex)
        .append(", ")
        .append(fromIndex)
        .append(" + ")
        .append(size)
        .append(") out of bounds for length ")
        .append(length)
        .toString());
    }
    return fromIndex;
  }

  private static IndexOutOfBoundsException outOfBounds(String message) {
    return new IndexOutOfBoundsException(message);
  }
}
