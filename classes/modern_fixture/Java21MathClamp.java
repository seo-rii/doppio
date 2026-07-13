package classes.modern_test;

public class Java21MathClamp {
  private interface Action {
    void run() throws Throwable;
  }

  private static boolean same(double left, double right) {
    return Double.isNaN(left) ? Double.isNaN(right) :
        Double.doubleToLongBits(left) == Double.doubleToLongBits(right);
  }

  private static boolean same(float left, float right) {
    return Float.isNaN(left) ? Float.isNaN(right) :
        Float.floatToIntBits(left) == Float.floatToIntBits(right);
  }

  private static boolean checkInteger(boolean strict) {
    long[] intValues = {
      Long.MIN_VALUE, Integer.MIN_VALUE, -6L, -5L, -1L, 0L, 1L, 5L, 6L,
      Integer.MAX_VALUE, Long.MAX_VALUE
    };
    int[][] intBounds = {
      {Integer.MIN_VALUE, Integer.MAX_VALUE}, {-5, 5}, {0, 0},
      {Integer.MIN_VALUE, Integer.MIN_VALUE + 1}, {Integer.MAX_VALUE - 1, Integer.MAX_VALUE}
    };
    for (long value : intValues) {
      for (int[] bounds : intBounds) {
        int min = bounds[0];
        int max = bounds[1];
        int expected = value < min ? min : value > max ? max : (int) value;
        int actual = strict ? StrictMath.clamp(value, min, max) : Math.clamp(value, min, max);
        if (actual != expected || Math.clamp(value, min, max) != StrictMath.clamp(value, min, max)) {
          return false;
        }
      }
    }

    long[] longValues = {
      Long.MIN_VALUE, Long.MIN_VALUE + 1, -6L, -5L, -1L, 0L, 1L, 5L, 6L,
      Long.MAX_VALUE - 1, Long.MAX_VALUE
    };
    long[][] longBounds = {
      {Long.MIN_VALUE, Long.MAX_VALUE}, {-5L, 5L}, {0L, 0L},
      {Long.MIN_VALUE, Long.MIN_VALUE + 1}, {Long.MAX_VALUE - 1, Long.MAX_VALUE}
    };
    for (long value : longValues) {
      for (long[] bounds : longBounds) {
        long min = bounds[0];
        long max = bounds[1];
        long expected = value < min ? min : value > max ? max : value;
        long actual = strict ? StrictMath.clamp(value, min, max) : Math.clamp(value, min, max);
        if (actual != expected || Math.clamp(value, min, max) != StrictMath.clamp(value, min, max)) {
          return false;
        }
      }
    }
    return true;
  }

  private static boolean checkFloating(boolean strict) {
    double[] doubleValues = {
      Double.NEGATIVE_INFINITY, -Double.MAX_VALUE, -1.0d, -0.0d, 0.0d, 1.0d,
      Double.MIN_VALUE, Double.MAX_VALUE, Double.POSITIVE_INFINITY, Double.NaN
    };
    double[][] doubleBounds = {
      {Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY}, {-1.0d, 1.0d},
      {-0.0d, 0.0d}, {0.0d, 0.0d}, {-0.0d, -0.0d},
      {Double.MIN_VALUE, Double.MAX_VALUE}
    };
    for (double value : doubleValues) {
      for (double[] bounds : doubleBounds) {
        double min = bounds[0];
        double max = bounds[1];
        double expected = Double.isNaN(value) ? Double.NaN :
            Double.compare(value, min) < 0 ? min : Double.compare(value, max) > 0 ? max : value;
        double actual = strict ? StrictMath.clamp(value, min, max) : Math.clamp(value, min, max);
        if (!same(actual, expected) || !same(Math.clamp(value, min, max), StrictMath.clamp(value, min, max))) {
          return false;
        }
      }
    }

    float[] floatValues = {
      Float.NEGATIVE_INFINITY, -Float.MAX_VALUE, -1.0f, -0.0f, 0.0f, 1.0f,
      Float.MIN_VALUE, Float.MAX_VALUE, Float.POSITIVE_INFINITY, Float.NaN
    };
    float[][] floatBounds = {
      {Float.NEGATIVE_INFINITY, Float.POSITIVE_INFINITY}, {-1.0f, 1.0f},
      {-0.0f, 0.0f}, {0.0f, 0.0f}, {-0.0f, -0.0f},
      {Float.MIN_VALUE, Float.MAX_VALUE}
    };
    for (float value : floatValues) {
      for (float[] bounds : floatBounds) {
        float min = bounds[0];
        float max = bounds[1];
        float expected = Float.isNaN(value) ? Float.NaN :
            Float.compare(value, min) < 0 ? min : Float.compare(value, max) > 0 ? max : value;
        float actual = strict ? StrictMath.clamp(value, min, max) : Math.clamp(value, min, max);
        if (!same(actual, expected) || !same(Math.clamp(value, min, max), StrictMath.clamp(value, min, max))) {
          return false;
        }
      }
    }
    return true;
  }

  private static boolean failsWith(Action action, String message) {
    try {
      action.run();
      return false;
    } catch (IllegalArgumentException expected) {
      return message.equals(expected.getMessage());
    } catch (Throwable unexpected) {
      return false;
    }
  }

  private static boolean checkExceptions(boolean strict) {
    return failsWith(() -> {
      if (strict) StrictMath.clamp(0L, 5, 4); else Math.clamp(0L, 5, 4);
    }, "5 > 4") && failsWith(() -> {
      if (strict) StrictMath.clamp(0L, 5L, 4L); else Math.clamp(0L, 5L, 4L);
    }, "5 > 4") && failsWith(() -> {
      if (strict) StrictMath.clamp(0.0d, Double.NaN, 1.0d); else Math.clamp(0.0d, Double.NaN, 1.0d);
    }, "min is NaN") && failsWith(() -> {
      if (strict) StrictMath.clamp(0.0d, -1.0d, Double.NaN); else Math.clamp(0.0d, -1.0d, Double.NaN);
    }, "max is NaN") && failsWith(() -> {
      if (strict) StrictMath.clamp(0.0d, 0.0d, -0.0d); else Math.clamp(0.0d, 0.0d, -0.0d);
    }, "0.0 > -0.0") && failsWith(() -> {
      if (strict) StrictMath.clamp(0.0f, Float.NaN, 1.0f); else Math.clamp(0.0f, Float.NaN, 1.0f);
    }, "min is NaN") && failsWith(() -> {
      if (strict) StrictMath.clamp(0.0f, -1.0f, Float.NaN); else Math.clamp(0.0f, -1.0f, Float.NaN);
    }, "max is NaN") && failsWith(() -> {
      if (strict) StrictMath.clamp(0.0f, 0.0f, -0.0f); else Math.clamp(0.0f, 0.0f, -0.0f);
    }, "0.0 > -0.0");
  }

  private static boolean checkReflection(Class<?> owner) throws Throwable {
    Class<?>[][] parameterTypes = {
      {Long.TYPE, Integer.TYPE, Integer.TYPE},
      {Long.TYPE, Long.TYPE, Long.TYPE},
      {Double.TYPE, Double.TYPE, Double.TYPE},
      {Float.TYPE, Float.TYPE, Float.TYPE}
    };
    Class<?>[] returnTypes = {Integer.TYPE, Long.TYPE, Double.TYPE, Float.TYPE};
    Object[][] arguments = {
      {100L, -2, 3}, {Long.MIN_VALUE, -5L, 5L},
      {-0.0d, 0.0d, 1.0d}, {-0.0f, 0.0f, 1.0f}
    };
    Object[] expected = {3, -5L, 0.0d, 0.0f};
    java.lang.reflect.Method[] methods = new java.lang.reflect.Method[parameterTypes.length];

    for (int i = 0; i < parameterTypes.length; i++) {
      java.lang.reflect.Method declared = owner.getDeclaredMethod("clamp", parameterTypes[i]);
      java.lang.reflect.Method inherited = owner.getMethod("clamp", parameterTypes[i]);
      methods[i] = declared;
      if (!declared.equals(inherited) || declared.getDeclaringClass() != owner ||
          declared.getModifiers() != (java.lang.reflect.Modifier.PUBLIC | java.lang.reflect.Modifier.STATIC) ||
          declared.getReturnType() != returnTypes[i] ||
          !java.util.Arrays.equals(declared.getParameterTypes(), parameterTypes[i]) ||
          declared.getExceptionTypes().length != 0 || declared.isBridge() ||
          declared.isSynthetic() || declared.isVarArgs() ||
          !expected[i].equals(declared.invoke(null, arguments[i]))) {
        return false;
      }
      java.lang.invoke.MethodHandle handle = java.lang.invoke.MethodHandles.lookup().unreflect(declared);
      if (handle.type().returnType() != returnTypes[i] ||
          !expected[i].equals(handle.invokeWithArguments(arguments[i]))) {
        return false;
      }
    }

    int enumerated = 0;
    for (java.lang.reflect.Method method : owner.getDeclaredMethods()) {
      for (int i = 0; i < methods.length; i++) {
        if (method.equals(methods[i])) {
          enumerated++;
          break;
        }
      }
    }
    if (enumerated != methods.length) {
      return false;
    }

    try {
      owner.getMethod("clamp", Double.TYPE, Double.TYPE, Double.TYPE)
          .invoke(null, 0.0d, Double.NaN, 1.0d);
      return false;
    } catch (java.lang.reflect.InvocationTargetException expectedFailure) {
      Throwable cause = expectedFailure.getCause();
      return cause instanceof IllegalArgumentException && "min is NaN".equals(cause.getMessage());
    }
  }

  public static void main(String[] args) throws Throwable {
    System.out.println("integer=" + checkInteger(false) + "," + checkInteger(true));
    System.out.println("floating=" + checkFloating(false) + "," + checkFloating(true));
    System.out.println("exceptions=" + checkExceptions(false) + "," + checkExceptions(true));
    System.out.println("reflection=" + checkReflection(Math.class) + "," + checkReflection(StrictMath.class));
  }
}
