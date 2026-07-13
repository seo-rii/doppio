package classes.modern_test;

public class Java18Division {
  private interface Action {
    void run();
  }

  private static boolean throwsArithmetic(Action action) {
    try {
      action.run();
      return false;
    } catch (ArithmeticException expected) {
      return true;
    }
  }

  private static int ceilDivInt(boolean strict, int x, int y) {
    return strict ? StrictMath.ceilDiv(x, y) : Math.ceilDiv(x, y);
  }

  private static long ceilDivLongInt(boolean strict, long x, int y) {
    return strict ? StrictMath.ceilDiv(x, y) : Math.ceilDiv(x, y);
  }

  private static long ceilDivLong(boolean strict, long x, long y) {
    return strict ? StrictMath.ceilDiv(x, y) : Math.ceilDiv(x, y);
  }

  private static int ceilModInt(boolean strict, int x, int y) {
    return strict ? StrictMath.ceilMod(x, y) : Math.ceilMod(x, y);
  }

  private static int ceilModLongInt(boolean strict, long x, int y) {
    return strict ? StrictMath.ceilMod(x, y) : Math.ceilMod(x, y);
  }

  private static long ceilModLong(boolean strict, long x, long y) {
    return strict ? StrictMath.ceilMod(x, y) : Math.ceilMod(x, y);
  }

  private static int divideExactInt(boolean strict, int x, int y) {
    return strict ? StrictMath.divideExact(x, y) : Math.divideExact(x, y);
  }

  private static long divideExactLong(boolean strict, long x, long y) {
    return strict ? StrictMath.divideExact(x, y) : Math.divideExact(x, y);
  }

  private static int floorDivExactInt(boolean strict, int x, int y) {
    return strict ? StrictMath.floorDivExact(x, y) : Math.floorDivExact(x, y);
  }

  private static long floorDivExactLong(boolean strict, long x, long y) {
    return strict ? StrictMath.floorDivExact(x, y) : Math.floorDivExact(x, y);
  }

  private static int ceilDivExactInt(boolean strict, int x, int y) {
    return strict ? StrictMath.ceilDivExact(x, y) : Math.ceilDivExact(x, y);
  }

  private static long ceilDivExactLong(boolean strict, long x, long y) {
    return strict ? StrictMath.ceilDivExact(x, y) : Math.ceilDivExact(x, y);
  }

  private static String divideExactIntResult(boolean strict, int x, int y) {
    try {
      return Integer.toString(divideExactInt(strict, x, y));
    } catch (ArithmeticException e) {
      return e.getClass().getSimpleName() + ":" + e.getMessage();
    }
  }

  private static String divideExactLongResult(boolean strict, long x, long y) {
    try {
      return Long.toString(divideExactLong(strict, x, y));
    } catch (ArithmeticException e) {
      return e.getClass().getSimpleName() + ":" + e.getMessage();
    }
  }

  private static String floorDivExactIntResult(boolean strict, int x, int y) {
    try {
      return Integer.toString(floorDivExactInt(strict, x, y));
    } catch (ArithmeticException e) {
      return e.getClass().getSimpleName() + ":" + e.getMessage();
    }
  }

  private static String ceilDivExactLongResult(boolean strict, long x, long y) {
    try {
      return Long.toString(ceilDivExactLong(strict, x, y));
    } catch (ArithmeticException e) {
      return e.getClass().getSimpleName() + ":" + e.getMessage();
    }
  }

  private static boolean checkIntMatrix() {
    int[] dividends = {Integer.MIN_VALUE, -7, -4, -1, 0, 1, 4, 7, Integer.MAX_VALUE};
    int[] divisors = {Integer.MIN_VALUE, -3, -1, 1, 3, Integer.MAX_VALUE};
    for (int x : dividends) {
      for (int y : divisors) {
        int quotient = Math.ceilDiv(x, y);
        int remainder = Math.ceilMod(x, y);
        if (quotient != StrictMath.ceilDiv(x, y) || remainder != StrictMath.ceilMod(x, y)) {
          return false;
        }
        if (quotient * y + remainder != x) {
          return false;
        }
        if (remainder != 0 && (remainder > 0) == (y > 0)) {
          return false;
        }
        if (!(x == Integer.MIN_VALUE && y == -1)) {
          if (Math.divideExact(x, y) != x / y || StrictMath.divideExact(x, y) != x / y) {
            return false;
          }
          if (Math.floorDivExact(x, y) != Math.floorDiv(x, y) ||
              StrictMath.floorDivExact(x, y) != Math.floorDiv(x, y)) {
            return false;
          }
          if (Math.ceilDivExact(x, y) != quotient || StrictMath.ceilDivExact(x, y) != quotient) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private static boolean checkLongMatrix() {
    long[] dividends = {Long.MIN_VALUE, -8589934593L, -7L, -1L, 0L, 1L, 7L, 8589934593L, Long.MAX_VALUE};
    long[] divisors = {Long.MIN_VALUE, -3L, -1L, 1L, 3L, Long.MAX_VALUE};
    for (long x : dividends) {
      for (long y : divisors) {
        long quotient = Math.ceilDiv(x, y);
        long remainder = Math.ceilMod(x, y);
        if (quotient != StrictMath.ceilDiv(x, y) || remainder != StrictMath.ceilMod(x, y)) {
          return false;
        }
        if (quotient * y + remainder != x) {
          return false;
        }
        if (remainder != 0 && (remainder > 0) == (y > 0)) {
          return false;
        }
        if (!(x == Long.MIN_VALUE && y == -1L)) {
          if (Math.divideExact(x, y) != x / y || StrictMath.divideExact(x, y) != x / y) {
            return false;
          }
          if (Math.floorDivExact(x, y) != Math.floorDiv(x, y) ||
              StrictMath.floorDivExact(x, y) != Math.floorDiv(x, y)) {
            return false;
          }
          if (Math.ceilDivExact(x, y) != quotient || StrictMath.ceilDivExact(x, y) != quotient) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private static boolean checkMixedMatrix() {
    long[] dividends = {Long.MIN_VALUE, -8589934593L, -1L, 0L, 1L, 8589934593L, Long.MAX_VALUE};
    int[] divisors = {Integer.MIN_VALUE, -3, -1, 1, 3, Integer.MAX_VALUE};
    for (long x : dividends) {
      for (int y : divisors) {
        long quotient = Math.ceilDiv(x, y);
        int remainder = Math.ceilMod(x, y);
        if (quotient != StrictMath.ceilDiv(x, y) || remainder != StrictMath.ceilMod(x, y)) {
          return false;
        }
        if (quotient * y + remainder != x) {
          return false;
        }
        if (remainder != 0 && (remainder > 0) == (y > 0)) {
          return false;
        }
      }
    }
    return true;
  }

  private static boolean checkExceptionMatrix() {
    return throwsArithmetic(() -> Math.ceilDiv(1, 0)) &&
        throwsArithmetic(() -> StrictMath.ceilDiv(1, 0)) &&
        throwsArithmetic(() -> Math.ceilDiv(1L, 0)) &&
        throwsArithmetic(() -> StrictMath.ceilDiv(1L, 0)) &&
        throwsArithmetic(() -> Math.ceilDiv(1L, 0L)) &&
        throwsArithmetic(() -> StrictMath.ceilDiv(1L, 0L)) &&
        throwsArithmetic(() -> Math.ceilMod(1, 0)) &&
        throwsArithmetic(() -> StrictMath.ceilMod(1, 0)) &&
        throwsArithmetic(() -> Math.ceilMod(1L, 0)) &&
        throwsArithmetic(() -> StrictMath.ceilMod(1L, 0)) &&
        throwsArithmetic(() -> Math.ceilMod(1L, 0L)) &&
        throwsArithmetic(() -> StrictMath.ceilMod(1L, 0L)) &&
        throwsArithmetic(() -> Math.divideExact(1, 0)) &&
        throwsArithmetic(() -> StrictMath.divideExact(1, 0)) &&
        throwsArithmetic(() -> Math.divideExact(1L, 0L)) &&
        throwsArithmetic(() -> StrictMath.divideExact(1L, 0L)) &&
        throwsArithmetic(() -> Math.floorDivExact(1, 0)) &&
        throwsArithmetic(() -> StrictMath.floorDivExact(1, 0)) &&
        throwsArithmetic(() -> Math.floorDivExact(1L, 0L)) &&
        throwsArithmetic(() -> StrictMath.floorDivExact(1L, 0L)) &&
        throwsArithmetic(() -> Math.ceilDivExact(1, 0)) &&
        throwsArithmetic(() -> StrictMath.ceilDivExact(1, 0)) &&
        throwsArithmetic(() -> Math.ceilDivExact(1L, 0L)) &&
        throwsArithmetic(() -> StrictMath.ceilDivExact(1L, 0L)) &&
        throwsArithmetic(() -> Math.divideExact(Integer.MIN_VALUE, -1)) &&
        throwsArithmetic(() -> StrictMath.divideExact(Integer.MIN_VALUE, -1)) &&
        throwsArithmetic(() -> Math.divideExact(Long.MIN_VALUE, -1L)) &&
        throwsArithmetic(() -> StrictMath.divideExact(Long.MIN_VALUE, -1L)) &&
        throwsArithmetic(() -> Math.floorDivExact(Integer.MIN_VALUE, -1)) &&
        throwsArithmetic(() -> StrictMath.floorDivExact(Integer.MIN_VALUE, -1)) &&
        throwsArithmetic(() -> Math.floorDivExact(Long.MIN_VALUE, -1L)) &&
        throwsArithmetic(() -> StrictMath.floorDivExact(Long.MIN_VALUE, -1L)) &&
        throwsArithmetic(() -> Math.ceilDivExact(Integer.MIN_VALUE, -1)) &&
        throwsArithmetic(() -> StrictMath.ceilDivExact(Integer.MIN_VALUE, -1)) &&
        throwsArithmetic(() -> Math.ceilDivExact(Long.MIN_VALUE, -1L)) &&
        throwsArithmetic(() -> StrictMath.ceilDivExact(Long.MIN_VALUE, -1L));
  }

  private static boolean checkReflection(Class<?> owner) throws Exception {
    String[] names = {
      "ceilDiv", "ceilDiv", "ceilDiv",
      "ceilMod", "ceilMod", "ceilMod",
      "divideExact", "divideExact",
      "floorDivExact", "floorDivExact",
      "ceilDivExact", "ceilDivExact",
      "multiplyFull", "multiplyHigh", "unsignedMultiplyHigh",
      "floorDiv", "floorMod", "absExact", "absExact"
    };
    Class<?>[][] parameterTypes = {
      {Integer.TYPE, Integer.TYPE},
      {Long.TYPE, Integer.TYPE},
      {Long.TYPE, Long.TYPE},
      {Integer.TYPE, Integer.TYPE},
      {Long.TYPE, Integer.TYPE},
      {Long.TYPE, Long.TYPE},
      {Integer.TYPE, Integer.TYPE},
      {Long.TYPE, Long.TYPE},
      {Integer.TYPE, Integer.TYPE},
      {Long.TYPE, Long.TYPE},
      {Integer.TYPE, Integer.TYPE},
      {Long.TYPE, Long.TYPE},
      {Integer.TYPE, Integer.TYPE},
      {Long.TYPE, Long.TYPE},
      {Long.TYPE, Long.TYPE},
      {Long.TYPE, Integer.TYPE},
      {Long.TYPE, Integer.TYPE},
      {Integer.TYPE},
      {Long.TYPE}
    };
    Class<?>[] returnTypes = {
      Integer.TYPE, Long.TYPE, Long.TYPE,
      Integer.TYPE, Integer.TYPE, Long.TYPE,
      Integer.TYPE, Long.TYPE,
      Integer.TYPE, Long.TYPE,
      Integer.TYPE, Long.TYPE,
      Long.TYPE, Long.TYPE, Long.TYPE,
      Long.TYPE, Integer.TYPE, Integer.TYPE, Long.TYPE
    };
    Object[][] arguments = {
      {4, 3}, {4L, 3}, {4L, 3L},
      {4, 3}, {4L, 3}, {4L, 3L},
      {4, 3}, {4L, 3L},
      {4, 3}, {4L, 3L},
      {4, 3}, {4L, 3L},
      {4, -3}, {Long.MIN_VALUE, 2L}, {-1L, -1L},
      {-7L, 3}, {-7L, 3}, {-4}, {-4L}
    };
    Object[] expected = {
      2, 2L, 2L,
      -2, -2, -2L,
      1, 1L,
      1, 1L,
      2, 2L,
      -12L, -1L, -2L,
      -3L, 2, 4, 4L
    };

    for (int i = 0; i < names.length; i++) {
      java.lang.reflect.Method declared = owner.getDeclaredMethod(names[i], parameterTypes[i]);
      java.lang.reflect.Method inherited = owner.getMethod(names[i], parameterTypes[i]);
      if (!declared.equals(inherited) || declared.getDeclaringClass() != owner ||
          declared.getModifiers() != (java.lang.reflect.Modifier.PUBLIC | java.lang.reflect.Modifier.STATIC) ||
          declared.getReturnType() != returnTypes[i] ||
          declared.getParameterTypes().length != parameterTypes[i].length ||
          declared.getExceptionTypes().length != 0 || declared.isBridge() ||
          declared.isSynthetic() || declared.isVarArgs() ||
          !expected[i].equals(declared.invoke(null, arguments[i]))) {
        return false;
      }
      for (int parameter = 0; parameter < parameterTypes[i].length; parameter++) {
        if (declared.getParameterTypes()[parameter] != parameterTypes[i][parameter]) {
          return false;
        }
      }
    }

    int enumerated = 0;
    for (java.lang.reflect.Method method : owner.getDeclaredMethods()) {
      for (int i = 0; i < names.length; i++) {
        if (method.getName().equals(names[i]) &&
            method.getReturnType() == returnTypes[i] &&
            java.util.Arrays.equals(method.getParameterTypes(), parameterTypes[i])) {
          enumerated++;
          break;
        }
      }
    }
    if (enumerated != names.length) {
      return false;
    }

    boolean divideOverflow = false;
    try {
      owner.getMethod("divideExact", Integer.TYPE, Integer.TYPE)
          .invoke(null, Integer.MIN_VALUE, -1);
    } catch (java.lang.reflect.InvocationTargetException expectedFailure) {
      Throwable cause = expectedFailure.getCause();
      divideOverflow = cause instanceof ArithmeticException && "integer overflow".equals(cause.getMessage());
    }
    if (!divideOverflow) {
      return false;
    }
    try {
      owner.getMethod("absExact", Long.TYPE).invoke(null, Long.MIN_VALUE);
      return false;
    } catch (java.lang.reflect.InvocationTargetException expectedFailure) {
      Throwable cause = expectedFailure.getCause();
      return cause instanceof ArithmeticException &&
          "Overflow to represent absolute value of Long.MIN_VALUE".equals(cause.getMessage());
    }
  }

  public static void main(String[] args) throws Exception {
    System.out.println("ceil-int=" + ceilDivInt(false, 4, 3) + "," + ceilDivInt(false, -4, 3) + "," +
        ceilDivInt(false, 4, -3) + "," + ceilDivInt(false, -4, -3) + "," +
        ceilDivInt(false, Integer.MIN_VALUE, -1));
    System.out.println("ceil-long-int=" + ceilDivLongInt(false, 8589934593L, 2) + "," +
        ceilDivLongInt(false, -8589934593L, 2));
    System.out.println("ceil-long=" + ceilDivLong(false, Long.MAX_VALUE, 3L) + "," +
        ceilDivLong(false, Long.MIN_VALUE, -1L));
    System.out.println("mod-int=" + ceilModInt(false, 4, 3) + "," + ceilModInt(false, -4, 3) + "," +
        ceilModInt(false, 4, -3) + "," + ceilModInt(false, -4, -3) + "," + ceilModInt(false, 6, 3));
    System.out.println("mod-long-int=" + ceilModLongInt(false, 8589934593L, 2) + "," +
        ceilModLongInt(false, -8589934593L, 2));
    System.out.println("mod-long=" + ceilModLong(false, Long.MAX_VALUE, 3L) + "," +
        ceilModLong(false, Long.MIN_VALUE, -1L));
    System.out.println("exact-int=" + divideExactIntResult(false, 7, 3) + "," +
        divideExactIntResult(false, Integer.MIN_VALUE, -1) + "," + divideExactIntResult(false, 1, 0));
    System.out.println("exact-long=" + divideExactLongResult(true, 7L, 3L) + "," +
        divideExactLongResult(true, Long.MIN_VALUE, -1L) + "," + divideExactLongResult(true, 1L, 0L));
    System.out.println("round-exact=" + floorDivExactIntResult(false, -4, 3) + "," +
        ceilDivExactLongResult(true, 4L, 3L) + "," +
        floorDivExactIntResult(true, Integer.MIN_VALUE, -1) + "," +
        ceilDivExactLongResult(false, Long.MIN_VALUE, -1L));
    System.out.println("matrix=" + checkIntMatrix() + "," + checkLongMatrix() + "," + checkMixedMatrix());
    System.out.println("exceptions=" + checkExceptionMatrix());
    System.out.println("reflection=" + checkReflection(Math.class) + "," + checkReflection(StrictMath.class));
  }
}
