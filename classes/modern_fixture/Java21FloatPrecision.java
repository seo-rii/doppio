package classes.modern_test;

/** Binary32 opcode results, including widening that exposes unrounded intermediates. */
public class Java21FloatPrecision {
  private static int assertions;

  private static void require(boolean condition, String message) {
    assertions++;
    if (!condition) throw new AssertionError(message);
  }

  private static float fromInt(int value) { return (float) value; }
  private static float fromLong(long value) { return (float) value; }
  private static float fromDouble(double value) { return (float) value; }
  private static double widen(float value) { return (double) value; }
  private static int toInt(float value) { return (int) value; }
  private static long toLong(float value) { return (long) value; }
  private static float add(float left, float right) { return left + right; }
  private static float subtract(float left, float right) { return left - right; }
  private static float multiply(float left, float right) { return left * right; }
  private static float divide(float left, float right) { return left / right; }
  private static float remainder(float left, float right) { return left % right; }
  private static float negate(float value) { return -value; }

  private static float bits(int value) { return Float.intBitsToFloat(value); }

  private static void check(String operation, int index, int expectedBits, float actual) {
    String name = operation + "[" + index + "]";
    if ((expectedBits & 0x7fffffff) > 0x7f800000) {
      // JVM arithmetic need not preserve a particular NaN sign or payload.
      require(Float.isNaN(actual), name + " NaN");
      require(Double.isNaN(widen(actual)), name + " widened NaN");
    } else {
      require(Float.floatToRawIntBits(actual) == expectedBits, name + " raw bits");
      // Raw-bit conversion itself rounds on some runtimes. Check the value before
      // another binary32 conversion can conceal an unrounded binary64 intermediate.
      require(Double.doubleToRawLongBits(widen(actual)) ==
          Double.doubleToRawLongBits(widen(bits(expectedBits))), name + " widened value");
    }
  }

  private static void checkIntegerConversions() {
    int[][] cases = {
      {0, 0x00000000}, {1, 0x3f800000}, {-1, 0xbf800000},
      {16777215, 0x4b7fffff}, {16777216, 0x4b800000},
      {16777217, 0x4b800000}, {16777218, 0x4b800001},
      {16777219, 0x4b800002}, {16777220, 0x4b800002},
      {-16777217, 0xcb800000}, {-16777219, 0xcb800002},
      {33554431, 0x4c000000}, {33554433, 0x4c000000},
      {33554434, 0x4c000000}, {33554435, 0x4c000001},
      {Integer.MIN_VALUE, 0xcf000000}, {Integer.MIN_VALUE + 1, 0xcf000000},
      {Integer.MAX_VALUE, 0x4f000000}, {Integer.MAX_VALUE - 63, 0x4f000000},
      {Integer.MAX_VALUE - 64, 0x4effffff}
    };
    for (int i = 0; i < cases.length; i++) check("i2f", i, cases[i][1], fromInt(cases[i][0]));
  }

  private static void checkLongConversions() {
    long[] values = {
      0L, 1L, -1L, 16777217L, 16777219L, -16777217L, -16777219L,
      2147483647L, 2147483648L, 2147483649L,
      9007199254740991L, 9007199254740992L, 9007199254740993L,
      Long.MIN_VALUE, Long.MIN_VALUE + 1, Long.MAX_VALUE - 1, Long.MAX_VALUE,
      // Values immediately around binary32 midpoints also distinguish a direct
      // long conversion from a lossy long -> double -> float conversion.
      1152921573326323711L, 1152921573326323712L, 1152921573326323713L,
      -1152921573326323711L, -1152921573326323712L, -1152921573326323713L,
      1152921710765277183L, 1152921710765277184L, 1152921710765277185L,
      -1152921710765277183L, -1152921710765277184L, -1152921710765277185L,
      9007199791611905L, -9007199791611905L,
      18014399583223809L, -18014399583223809L,
      18014401730707455L, -18014401730707455L,
      4611686293305294849L, -4611686293305294849L
    };
    int[] expected = {
      0x00000000, 0x3f800000, 0xbf800000, 0x4b800000, 0x4b800002,
      0xcb800000, 0xcb800002, 0x4f000000, 0x4f000000, 0x4f000000,
      0x5a000000, 0x5a000000, 0x5a000000,
      0xdf000000, 0xdf000000, 0x5f000000, 0x5f000000,
      0x5d800000, 0x5d800000, 0x5d800001,
      0xdd800000, 0xdd800000, 0xdd800001,
      0x5d800001, 0x5d800002, 0x5d800002,
      0xdd800001, 0xdd800002, 0xdd800002,
      0x5a000001, 0xda000001, 0x5a800001, 0xda800001,
      0x5a800001, 0xda800001, 0x5e800001, 0xde800001
    };
    require(values.length == expected.length, "l2f table length");
    for (int i = 0; i < values.length; i++) check("l2f", i, expected[i], fromLong(values[i]));
  }

  private static void checkDoubleConversions() {
    double[] values = {
      0.0d, -0.0d, 1.0d, -1.0d,
      0x1.000001p0, 0x1.000003p0, -0x1.000001p0, -0x1.000003p0,
      0x1.000000fffffffp0, 0x1.0000010000001p0,
      0x1.fffffep-1, 0x1.ffffffp-1,
      0x1p-149, 0x1p-150, 0x1.0000000000001p-150,
      -0x1p-150, -0x1.0000000000001p-150,
      0x1.8p-149, 0x1.4p-148,
      0x1p-126, 0x1.fffffcp-127, 0x1.fffffep-127,
      0x1.fffffep127, 0x1.ffffffp127, 0x1.fffffefffffffp127,
      -0x1.ffffffp127, Double.MIN_VALUE, -Double.MIN_VALUE,
      Double.MAX_VALUE, -Double.MAX_VALUE,
      Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, Double.NaN
    };
    int[] expected = {
      0x00000000, 0x80000000, 0x3f800000, 0xbf800000,
      0x3f800000, 0x3f800002, 0xbf800000, 0xbf800002,
      0x3f800000, 0x3f800001,
      0x3f7fffff, 0x3f800000,
      0x00000001, 0x00000000, 0x00000001,
      0x80000000, 0x80000001,
      0x00000002, 0x00000002,
      0x00800000, 0x007fffff, 0x00800000,
      0x7f7fffff, 0x7f800000, 0x7f7fffff,
      0xff800000, 0x00000000, 0x80000000,
      0x7f800000, 0xff800000, 0x7f800000, 0xff800000, 0x7fc00000
    };
    require(values.length == expected.length, "d2f table length");
    for (int i = 0; i < values.length; i++) check("d2f", i, expected[i], fromDouble(values[i]));
  }

  private static void checkBinary(String operation, int[][] cases) {
    for (int i = 0; i < cases.length; i++) {
      float left = bits(cases[i][0]);
      float right = bits(cases[i][1]);
      float actual;
      switch (operation) {
        case "fadd": actual = add(left, right); break;
        case "fsub": actual = subtract(left, right); break;
        case "fmul": actual = multiply(left, right); break;
        case "fdiv": actual = divide(left, right); break;
        case "frem": actual = remainder(left, right); break;
        default: throw new AssertionError(operation);
      }
      check(operation, i, cases[i][2], actual);
    }
  }

  private static void checkArithmetic() {
    checkBinary("fadd", new int[][] {
      {0x3f800000, 0x33800000, 0x3f800000},
      {0x3f800001, 0x33800000, 0x3f800002},
      {0xbf800000, 0xb3800000, 0xbf800000},
      {0xbf800001, 0xb3800000, 0xbf800002},
      {0x4b800000, 0x3f800000, 0x4b800000},
      {0x4b800000, 0x40400000, 0x4b800002},
      {0x00000001, 0x00000001, 0x00000002},
      {0x007fffff, 0x00000001, 0x00800000},
      {0x00800000, 0x80000001, 0x007fffff},
      {0x7f7fffff, 0x7f7fffff, 0x7f800000},
      {0xff7fffff, 0xff7fffff, 0xff800000},
      {0x00000000, 0x80000000, 0x00000000},
      {0x80000000, 0x80000000, 0x80000000},
      {0x3f800000, 0xbf800000, 0x00000000},
      {0x7f800000, 0xff800000, 0x7fc00000},
      {0x7fc12345, 0x3f800000, 0x7fc00000}
    });
    checkBinary("fsub", new int[][] {
      {0x3f800000, 0x33000000, 0x3f800000},
      {0x3f800001, 0x33800000, 0x3f800000},
      {0x3f800000, 0x33800000, 0x3f7fffff},
      {0x4b800000, 0x3f800000, 0x4b7fffff},
      {0x4b800001, 0x3f800000, 0x4b800000},
      {0x00000002, 0x00000001, 0x00000001},
      {0x00800000, 0x00000001, 0x007fffff},
      {0x7f7fffff, 0xff7fffff, 0x7f800000},
      {0x80000000, 0x00000000, 0x80000000},
      {0x00000000, 0x80000000, 0x00000000},
      {0x80000000, 0x80000000, 0x00000000},
      {0xbf800000, 0xbf800000, 0x00000000},
      {0x7f800000, 0x7f800000, 0x7fc00000},
      {0xff800000, 0x7f800000, 0xff800000},
      {0x3f800000, 0x7fc12345, 0x7fc00000}
    });
    checkBinary("fmul", new int[][] {
      {0x3f800001, 0x3f800001, 0x3f800002},
      {0x3f7fffff, 0x3f7fffff, 0x3f7ffffe},
      {0x00000001, 0x3f000000, 0x00000000},
      {0x00000001, 0x3fc00000, 0x00000002},
      {0x00000003, 0x3f000000, 0x00000002},
      {0x00000005, 0x3f000000, 0x00000002},
      {0x80000001, 0x3f000000, 0x80000000},
      {0x00800000, 0x3f000000, 0x00400000},
      {0x7f7fffff, 0x40000000, 0x7f800000},
      {0xff7fffff, 0x40000000, 0xff800000},
      {0x80000000, 0xbf800000, 0x00000000},
      {0x00000000, 0xbf800000, 0x80000000},
      {0xff800000, 0xbf800000, 0x7f800000},
      {0x00000000, 0x7f800000, 0x7fc00000},
      {0x7fc12345, 0x40000000, 0x7fc00000}
    });
    checkBinary("fdiv", new int[][] {
      {0x3f800000, 0x40400000, 0x3eaaaaab},
      {0x40000000, 0x40400000, 0x3f2aaaab},
      {0x41200000, 0x40400000, 0x40555555},
      {0x3f800000, 0x41200000, 0x3dcccccd},
      {0x3f800000, 0x40e00000, 0x3e124925},
      {0x7f7fffff, 0x3f000000, 0x7f800000},
      {0x00800000, 0x40000000, 0x00400000},
      {0x00000001, 0x40000000, 0x00000000},
      {0x00000003, 0x40000000, 0x00000002},
      {0x80000000, 0xc0000000, 0x00000000},
      {0x00000000, 0xc0000000, 0x80000000},
      {0x3f800000, 0x80000000, 0xff800000},
      {0xbf800000, 0x80000000, 0x7f800000},
      {0x00000000, 0x00000000, 0x7fc00000},
      {0x7f800000, 0x7f800000, 0x7fc00000},
      {0x7f800000, 0x3f800000, 0x7f800000},
      {0xbf800000, 0x7f800000, 0x80000000},
      {0x3f800000, 0x7fc12345, 0x7fc00000}
    });
    checkBinary("frem", new int[][] {
      {0x40b00000, 0x40000000, 0x3fc00000},
      {0xc0b00000, 0x40000000, 0xbfc00000},
      {0x40b00000, 0xc0000000, 0x3fc00000},
      {0x40800000, 0x40000000, 0x00000000},
      {0xc0800000, 0x40000000, 0x80000000},
      {0x7f7fffff, 0x3f800000, 0x00000000},
      {0x00000001, 0x3f800000, 0x00000001},
      {0x00000001, 0x00000001, 0x00000000},
      {0x80000000, 0xc0000000, 0x80000000},
      {0x00000000, 0xc0000000, 0x00000000},
      {0x3f800000, 0x7f800000, 0x3f800000},
      {0x7f800000, 0x3f800000, 0x7fc00000},
      {0x3f800000, 0x00000000, 0x7fc00000},
      {0x7fc12345, 0x40000000, 0x7fc00000}
    });
    int[][] negations = {
      {0x00000000, 0x80000000}, {0x80000000, 0x00000000},
      {0x3f800001, 0xbf800001}, {0xbf800001, 0x3f800001},
      {0x00000001, 0x80000001}, {0x80000001, 0x00000001},
      {0x7f7fffff, 0xff7fffff}, {0xff7fffff, 0x7f7fffff},
      {0x7f800000, 0xff800000}, {0xff800000, 0x7f800000},
      {0x7fc12345, 0x7fc00000}
    };
    for (int i = 0; i < negations.length; i++) check("fneg", i, negations[i][1], negate(bits(negations[i][0])));

    // These opcode chains catch deferred rounding that a final raw-bit conversion hides.
    check("fadd cancellation", 0, 0x00000000, subtract(add(bits(0x4b800000), 1.0f), bits(0x4b800000)));
    check("fsub cancellation", 0, 0x00000000, subtract(subtract(bits(0x3f800000), bits(0x33000000)), 1.0f));
    check("i2f cancellation", 0, 0x00000000, subtract(fromInt(16777217), bits(0x4b800000)));
    check("l2f cancellation", 0, 0x00000000, subtract(fromLong(16777217L), bits(0x4b800000)));
  }

  private static void checkWideningAndIntegralConversions() {
    int[] inputs = {
      0x00000000, 0x80000000, 0x00000001, 0x80000001,
      0x00800000, 0x80800000, 0x3f800000, 0xbf800000,
      0x3f800001, 0xbf800001, 0x4b7fffff, 0xcb7fffff,
      0x4b800000, 0xcb800000, 0x4effffff, 0xceffffff,
      0x4f000000, 0xcf000000, 0x5effffff, 0xdeffffff,
      0x5f000000, 0xdf000000, 0x7f7fffff, 0xff7fffff,
      0x7f800000, 0xff800000, 0x7fc12345
    };
    int[] ints = {
      0, 0, 0, 0, 0, 0, 1, -1, 1, -1,
      16777215, -16777215, 16777216, -16777216,
      2147483520, -2147483520, Integer.MAX_VALUE, Integer.MIN_VALUE,
      Integer.MAX_VALUE, Integer.MIN_VALUE, Integer.MAX_VALUE, Integer.MIN_VALUE,
      Integer.MAX_VALUE, Integer.MIN_VALUE, Integer.MAX_VALUE, Integer.MIN_VALUE, 0
    };
    long[] longs = {
      0L, 0L, 0L, 0L, 0L, 0L, 1L, -1L, 1L, -1L,
      16777215L, -16777215L, 16777216L, -16777216L,
      2147483520L, -2147483520L, 2147483648L, -2147483648L,
      9223371487098961920L, -9223371487098961920L,
      Long.MAX_VALUE, Long.MIN_VALUE, Long.MAX_VALUE, Long.MIN_VALUE,
      Long.MAX_VALUE, Long.MIN_VALUE, 0L
    };
    long[] doubles = {
      0x0000000000000000L, 0x8000000000000000L,
      0x36a0000000000000L, 0xb6a0000000000000L,
      0x3810000000000000L, 0xb810000000000000L,
      0x3ff0000000000000L, 0xbff0000000000000L,
      0x3ff0000020000000L, 0xbff0000020000000L,
      0x416fffffe0000000L, 0xc16fffffe0000000L,
      0x4170000000000000L, 0xc170000000000000L,
      0x41dfffffe0000000L, 0xc1dfffffe0000000L,
      0x41e0000000000000L, 0xc1e0000000000000L,
      0x43dfffffe0000000L, 0xc3dfffffe0000000L,
      0x43e0000000000000L, 0xc3e0000000000000L,
      0x47efffffe0000000L, 0xc7efffffe0000000L,
      0x7ff0000000000000L, 0xfff0000000000000L, 0x7ff8000000000000L
    };
    require(inputs.length == ints.length && inputs.length == longs.length &&
        inputs.length == doubles.length, "floating conversion table lengths");
    for (int i = 0; i < inputs.length; i++) {
      float value = bits(inputs[i]);
      require(toInt(value) == ints[i], "f2i[" + i + "]");
      require(toLong(value) == longs[i], "f2l[" + i + "]");
      double actual = widen(value);
      require(i == inputs.length - 1 ? Double.isNaN(actual) :
          Double.doubleToRawLongBits(actual) == doubles[i], "f2d[" + i + "]");
    }
  }

  private static void checkHotLoops() {
    float one = bits(0x3f800000);
    float nextOne = bits(0x3f800001);
    float halfUlpAbove = bits(0x33800000);
    float halfUlpBelow = bits(0x33000000);
    float three = bits(0x40400000);
    float fiveAndHalf = bits(0x40b00000);
    float two = bits(0x40000000);
    float zero = bits(0x00000000);
    float intResult = zero, longResult = zero, doubleResult = zero;
    float addResult = zero, subResult = zero, mulResult = zero;
    float divResult = zero, remResult = zero, negResult = zero;
    int narrowedInt = 0;
    long narrowedLong = 0L;
    double widened = 0.0d;
    // Exceed the interpreter's basic-block warm-up thresholds, including the
    // shorter conversion helpers. Inspect results after optimized execution.
    for (int i = 0; i < 4096; i++) {
      intResult = fromInt(16777218 - (i & 1));
      longResult = fromLong(1152921573326323712L + (i & 1));
      doubleResult = fromDouble(0x1.000001p0);
      addResult = add(nextOne, halfUlpAbove);
      subResult = subtract(one, halfUlpBelow);
      mulResult = multiply(nextOne, nextOne);
      divResult = divide(one, three);
      remResult = remainder(fiveAndHalf, two);
      negResult = negate(zero);
      narrowedInt = toInt(intResult);
      narrowedLong = toLong(intResult);
      widened = widen(intResult);
    }
    check("hot i2f", 0, 0x4b800000, intResult);
    check("hot l2f", 0, 0x5d800001, longResult);
    check("hot d2f", 0, 0x3f800000, doubleResult);
    check("hot fadd", 0, 0x3f800002, addResult);
    check("hot fsub", 0, 0x3f800000, subResult);
    check("hot fmul", 0, 0x3f800002, mulResult);
    check("hot fdiv", 0, 0x3eaaaaab, divResult);
    check("hot frem", 0, 0x3fc00000, remResult);
    check("hot fneg", 0, 0x80000000, negResult);
    require(narrowedInt == 16777216, "hot f2i");
    require(narrowedLong == 16777216L, "hot f2l");
    require(Double.doubleToRawLongBits(widened) == 0x4170000000000000L, "hot f2d");
  }

  public static void main(String[] arguments) {
    checkIntegerConversions();
    checkLongConversions();
    checkDoubleConversions();
    checkArithmetic();
    checkWideningAndIntegralConversions();
    checkHotLoops();
    System.out.println("Java21FloatPrecision assertions=" + assertions);
  }
}
