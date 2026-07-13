package java.lang;

final class DoppioMath {
  private static final long LONG_MASK = 0xffffffffL;

  private DoppioMath() {
  }

  static int ceilDiv(int x, int y) {
    int quotient = x / y;
    return (x ^ y) >= 0 && quotient * y != x ? quotient + 1 : quotient;
  }

  static long ceilDiv(long x, int y) {
    return ceilDiv(x, (long) y);
  }

  static long ceilDiv(long x, long y) {
    long quotient = x / y;
    return (x ^ y) >= 0 && quotient * y != x ? quotient + 1 : quotient;
  }

  static int ceilMod(int x, int y) {
    int remainder = x % y;
    return (x ^ y) >= 0 && remainder != 0 ? remainder - y : remainder;
  }

  static int ceilMod(long x, int y) {
    return (int) ceilMod(x, (long) y);
  }

  static long ceilMod(long x, long y) {
    long remainder = x % y;
    return (x ^ y) >= 0 && remainder != 0 ? remainder - y : remainder;
  }

  static int divideExact(int x, int y) {
    int quotient = x / y;
    if ((x & y & quotient) >= 0) {
      return quotient;
    }
    throw new ArithmeticException("integer overflow");
  }

  static long divideExact(long x, long y) {
    long quotient = x / y;
    if ((x & y & quotient) >= 0) {
      return quotient;
    }
    throw new ArithmeticException("long overflow");
  }

  static int floorDivExact(int x, int y) {
    int quotient = divideExact(x, y);
    return (x ^ y) < 0 && quotient * y != x ? quotient - 1 : quotient;
  }

  static long floorDivExact(long x, long y) {
    long quotient = divideExact(x, y);
    return (x ^ y) < 0 && quotient * y != x ? quotient - 1 : quotient;
  }

  static int ceilDivExact(int x, int y) {
    int quotient = divideExact(x, y);
    return (x ^ y) >= 0 && quotient * y != x ? quotient + 1 : quotient;
  }

  static long ceilDivExact(long x, long y) {
    long quotient = divideExact(x, y);
    return (x ^ y) >= 0 && quotient * y != x ? quotient + 1 : quotient;
  }

  static long multiplyFull(int x, int y) {
    return (long) x * (long) y;
  }

  static long multiplyHigh(long x, long y) {
    long x1 = x >> 32;
    long x2 = x & LONG_MASK;
    long y1 = y >> 32;
    long y2 = y & LONG_MASK;
    long z2 = x2 * y2;
    long t = x1 * y2 + (z2 >>> 32);
    long z1 = t & LONG_MASK;
    long z0 = t >> 32;
    z1 += x2 * y1;
    return x1 * y1 + z0 + (z1 >> 32);
  }

  static long unsignedMultiplyHigh(long x, long y) {
    return multiplyHigh(x, y) + ((x >> 63) & y) + ((y >> 63) & x);
  }

  static long floorDiv(long x, int y) {
    long quotient = x / y;
    return (x < 0) != (y < 0) && quotient * y != x ? quotient - 1 : quotient;
  }

  static int floorMod(long x, int y) {
    return (int) (x - floorDiv(x, y) * y);
  }

  static int absExact(int value) {
    if (value == Integer.MIN_VALUE) {
      throw new ArithmeticException("Overflow to represent absolute value of Integer.MIN_VALUE");
    }
    return value < 0 ? -value : value;
  }

  static long absExact(long value) {
    if (value == Long.MIN_VALUE) {
      throw new ArithmeticException("Overflow to represent absolute value of Long.MIN_VALUE");
    }
    return value < 0 ? -value : value;
  }
}
