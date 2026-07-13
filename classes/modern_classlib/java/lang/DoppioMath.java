package java.lang;

final class DoppioMath {
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
}
