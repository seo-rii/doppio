package classes.modern_test;

/**
 * Phase B5 numeric semantics. Each case calls parameter probes so javac emits
 * the operation being checked instead of folding the expected result.
 * Expected results live independently in ci/java_core_numeric_cases.mjs.
 */
public class JavaCoreNumeric {
  private static int iadd(int a, int b) { return a + b; }
  private static int isub(int a, int b) { return a - b; }
  private static int imul(int a, int b) { return a * b; }
  private static int ineg(int a) { return -a; }
  private static int idiv(int a, int b) { return a / b; }
  private static int irem(int a, int b) { return a % b; }
  private static long ladd(long a, long b) { return a + b; }
  private static long lsub(long a, long b) { return a - b; }
  private static long lmul(long a, long b) { return a * b; }
  private static long lneg(long a) { return -a; }
  private static long ldiv(long a, long b) { return a / b; }
  private static long lrem(long a, long b) { return a % b; }
  private static int ishl(int a, int b) { return a << b; }
  private static int ishr(int a, int b) { return a >> b; }
  private static int iushr(int a, int b) { return a >>> b; }
  private static long lshl(long a, int b) { return a << b; }
  private static long lshr(long a, int b) { return a >> b; }
  private static long lushr(long a, int b) { return a >>> b; }
  private static int iand(int a, int b) { return a & b; }
  private static int ior(int a, int b) { return a | b; }
  private static int ixor(int a, int b) { return a ^ b; }
  private static int inot(int a) { return ~a; }
  private static long land(long a, long b) { return a & b; }
  private static long lor(long a, long b) { return a | b; }
  private static long lxor(long a, long b) { return a ^ b; }
  private static long lnot(long a) { return ~a; }

  private static long i2l(int a) { return (long) a; }
  private static float i2f(int a) { return (float) a; }
  private static double i2d(int a) { return (double) a; }
  private static int l2i(long a) { return (int) a; }
  private static float l2f(long a) { return (float) a; }
  private static double l2d(long a) { return (double) a; }
  private static int f2i(float a) { return (int) a; }
  private static long f2l(float a) { return (long) a; }
  private static double f2d(float a) { return (double) a; }
  private static int d2i(double a) { return (int) a; }
  private static long d2l(double a) { return (long) a; }
  private static float d2f(double a) { return (float) a; }
  private static byte i2b(int a) { return (byte) a; }
  private static char i2c(int a) { return (char) a; }
  private static short i2s(int a) { return (short) a; }
  private static byte d2b(double a) { return (byte) a; }
  private static char d2c(double a) { return (char) a; }
  private static short d2s(double a) { return (short) a; }

  private static float fadd(float a, float b) { return a + b; }
  private static float fsub(float a, float b) { return a - b; }
  private static float fmul(float a, float b) { return a * b; }
  private static float fdiv(float a, float b) { return a / b; }
  private static float frem(float a, float b) { return a % b; }
  private static float fneg(float a) { return -a; }
  private static double dadd(double a, double b) { return a + b; }
  private static double dsub(double a, double b) { return a - b; }
  private static double dmul(double a, double b) { return a * b; }
  private static double ddiv(double a, double b) { return a / b; }
  private static double drem(double a, double b) { return a % b; }
  private static double dneg(double a) { return -a; }

  private static int compareI(int a, int b) {
    int mask = 0;
    if (a < b) mask |= 1;
    if (a <= b) mask |= 2;
    if (a > b) mask |= 4;
    if (a >= b) mask |= 8;
    if (a == b) mask |= 16;
    if (a != b) mask |= 32;
    return mask;
  }

  private static int compareL(long a, long b) {
    int mask = 0;
    if (a < b) mask |= 1;
    if (a <= b) mask |= 2;
    if (a > b) mask |= 4;
    if (a >= b) mask |= 8;
    if (a == b) mask |= 16;
    if (a != b) mask |= 32;
    return mask;
  }

  private static int compareF(float a, float b) {
    int mask = 0;
    if (a < b) mask |= 1;
    if (a <= b) mask |= 2;
    if (a > b) mask |= 4;
    if (a >= b) mask |= 8;
    if (a == b) mask |= 16;
    if (a != b) mask |= 32;
    return mask;
  }

  private static int compareD(double a, double b) {
    int mask = 0;
    if (a < b) mask |= 1;
    if (a <= b) mask |= 2;
    if (a > b) mask |= 4;
    if (a >= b) mask |= 8;
    if (a == b) mask |= 16;
    if (a != b) mask |= 32;
    return mask;
  }

  private static byte unboxByte(Byte a) { return a; }
  private static short unboxShort(Short a) { return a; }
  private static char unboxCharacter(Character a) { return a; }
  private static int unboxInteger(Integer a) { return a; }
  private static long unboxLong(Long a) { return a; }
  private static float unboxFloat(Float a) { return a; }
  private static double unboxDouble(Double a) { return a; }
  private static boolean unboxBoolean(Boolean a) { return a; }

  private static void start(String id) {
    System.out.print(id);
    System.out.print('=');
  }

  private static void hexI(int value) {
    String digits = Integer.toHexString(value);
    for (int padding = digits.length(); padding < 8; padding++) System.out.print('0');
    System.out.print(digits);
  }

  private static void hexL(long value) {
    String digits = Long.toHexString(value);
    for (int padding = digits.length(); padding < 16; padding++) System.out.print('0');
    System.out.print(digits);
  }

  private static void ints(String id, int... values) {
    start(id);
    for (int i = 0; i < values.length; i++) {
      if (i != 0) System.out.print(',');
      hexI(values[i]);
    }
    System.out.println();
  }

  private static void longs(String id, long... values) {
    start(id);
    for (int i = 0; i < values.length; i++) {
      if (i != 0) System.out.print(',');
      hexL(values[i]);
    }
    System.out.println();
  }

  private static void floats(String id, float... values) {
    start(id);
    for (int i = 0; i < values.length; i++) {
      if (i != 0) System.out.print(',');
      hexI(Float.floatToRawIntBits(values[i]));
    }
    System.out.println();
  }

  private static void doubles(String id, double... values) {
    start(id);
    for (int i = 0; i < values.length; i++) {
      if (i != 0) System.out.print(',');
      hexL(Double.doubleToRawLongBits(values[i]));
    }
    System.out.println();
  }

  private static void masks(String id, int... values) {
    start(id);
    for (int i = 0; i < values.length; i++) {
      if (i != 0) System.out.print(',');
      System.out.print(values[i]);
    }
    System.out.println();
  }

  private static void event(String id, String value) {
    start(id);
    System.out.println(value);
  }

  private static void nan(String id, boolean value) {
    start(id);
    System.out.print("nan=");
    System.out.println(value);
  }

  private static float rawF(int bits) { return Float.intBitsToFloat(bits); }

  private static void caseIOverflow() {
    ints("i-overflow", iadd(Integer.MAX_VALUE, 1), isub(Integer.MIN_VALUE, 1),
        imul(0x40000000, 4), ineg(Integer.MIN_VALUE));
  }

  private static void caseLOverflow() {
    longs("l-overflow", ladd(Long.MAX_VALUE, 1L), lsub(Long.MIN_VALUE, 1L),
        lmul(0x4000000000000000L, 4L), lneg(Long.MIN_VALUE),
        lmul(0x100000001L, 0x100000001L));
  }

  private static void caseIDivision() {
    ints("i-division", idiv(Integer.MIN_VALUE, -1), idiv(-7, 3), idiv(7, -3), idiv(-7, -3));
  }

  private static void caseLDivision() {
    longs("l-division", ldiv(Long.MIN_VALUE, -1L), ldiv(-7L, 3L), ldiv(7L, -3L), ldiv(-7L, -3L));
  }

  private static void caseIRemainder() {
    ints("i-remainder", irem(Integer.MIN_VALUE, -1), irem(-7, 3), irem(7, -3), irem(-7, -3));
  }

  private static void caseLRemainder() {
    longs("l-remainder", lrem(Long.MIN_VALUE, -1L), lrem(-7L, 3L), lrem(7L, -3L), lrem(-7L, -3L));
  }

  private static void caseIntegralZeroDivisors() {
    try { idiv(1, 0); throw new AssertionError("idiv accepted zero"); }
    catch (ArithmeticException expected) { event("integral-zero-divisors", "idiv:java.lang.ArithmeticException@invoke"); }
    try { irem(1, 0); throw new AssertionError("irem accepted zero"); }
    catch (ArithmeticException expected) { event("integral-zero-divisors", "irem:java.lang.ArithmeticException@invoke"); }
    try { ldiv(1L, 0L); throw new AssertionError("ldiv accepted zero"); }
    catch (ArithmeticException expected) { event("integral-zero-divisors", "ldiv:java.lang.ArithmeticException@invoke"); }
    try { lrem(1L, 0L); throw new AssertionError("lrem accepted zero"); }
    catch (ArithmeticException expected) { event("integral-zero-divisors", "lrem:java.lang.ArithmeticException@invoke"); }
  }

  private static void caseIShlMask() { ints("i-shl-mask", ishl(1, 31), ishl(1, 32), ishl(1, -1), ishl(1, 33)); }
  private static void caseIShrMask() { ints("i-shr-mask", ishr(Integer.MIN_VALUE, 31), ishr(Integer.MIN_VALUE, 32), ishr(-1, -1), ishr(Integer.MAX_VALUE, 1)); }
  private static void caseIUshrMask() { ints("i-ushr-mask", iushr(Integer.MIN_VALUE, 31), iushr(-1, 1), iushr(-1, 32), iushr(-1, -1)); }
  private static void caseLShlMask() { longs("l-shl-mask", lshl(1L, 63), lshl(1L, 64), lshl(1L, -1), lshl(1L, 65)); }
  private static void caseLShrMask() { longs("l-shr-mask", lshr(Long.MIN_VALUE, 63), lshr(Long.MIN_VALUE, 64), lshr(-1L, -1), lshr(Long.MAX_VALUE, 1)); }
  private static void caseLUshrMask() { longs("l-ushr-mask", lushr(Long.MIN_VALUE, 63), lushr(-1L, 1), lushr(-1L, 64), lushr(-1L, -1)); }

  private static void caseIBitwise() {
    ints("i-bitwise", iand(0x55aa55aa, 0x0ff00ff0), ior(0x55aa55aa, 0x0ff00ff0),
        ixor(0x55aa55aa, 0x0ff00ff0), inot(0x55aa55aa));
  }

  private static void caseLBitwise() {
    longs("l-bitwise", land(0x55aa55aa55aa55aaL, 0x0ff00ff00ff00ff0L),
        lor(0x55aa55aa55aa55aaL, 0x0ff00ff00ff00ff0L),
        lxor(0x55aa55aa55aa55aaL, 0x0ff00ff00ff00ff0L), lnot(0x55aa55aa55aa55aaL));
  }

  private static void caseI2L() { longs("i2l", i2l(Integer.MIN_VALUE), i2l(-1), i2l(Integer.MAX_VALUE)); }
  private static void caseI2F() { floats("i2f", i2f(Integer.MIN_VALUE), i2f(Integer.MAX_VALUE), i2f(16777217), i2f(16777219), i2f(-16777217), i2f(-16777219)); }
  private static void caseI2D() { doubles("i2d", i2d(Integer.MIN_VALUE), i2d(Integer.MAX_VALUE), i2d(16777217)); }
  private static void caseL2I() { ints("l2i", l2i(Long.MIN_VALUE), l2i(Long.MAX_VALUE), l2i(0x1234567887654321L), l2i(0x100000000L)); }

  private static void caseL2F() {
    // Just above a binary32 midpoint: a long -> double -> float route loses +1.
    floats("l2f", l2f(Long.MIN_VALUE), l2f(Long.MAX_VALUE),
        l2f(4611686293305294849L), l2f(-4611686293305294849L));
  }

  private static void caseL2D53Ties() {
    doubles("l2d-53-ties", l2d(9007199254740991L), l2d(9007199254740992L),
        l2d(9007199254740993L), l2d(9007199254740995L),
        l2d(-9007199254740993L), l2d(-9007199254740995L));
  }

  private static void caseL2DEndpoints() { doubles("l2d-endpoints", l2d(Long.MIN_VALUE), l2d(Long.MAX_VALUE), l2d(Long.MIN_VALUE + 1L)); }
  private static void caseF2ISpecials() { ints("f2i-specials", f2i(Float.NaN), f2i(Float.POSITIVE_INFINITY), f2i(Float.NEGATIVE_INFINITY), f2i(0.0f), f2i(-0.0f)); }

  private static void caseF2IFinite() {
    ints("f2i-finite", f2i(3.75f), f2i(-3.75f), f2i(rawF(0x4effffff)), f2i(rawF(0x4f000000)),
        f2i(rawF(0xceffffff)), f2i(rawF(0xcf000000)), f2i(rawF(1)), f2i(rawF(0x80000001)));
  }

  private static void caseF2LSpecials() { longs("f2l-specials", f2l(Float.NaN), f2l(Float.POSITIVE_INFINITY), f2l(Float.NEGATIVE_INFINITY), f2l(0.0f), f2l(-0.0f)); }

  private static void caseF2LFinite() {
    longs("f2l-finite", f2l(3.75f), f2l(-3.75f), f2l(rawF(0x5effffff)), f2l(rawF(0x5f000000)),
        f2l(rawF(0xdeffffff)), f2l(rawF(0xdf000000)), f2l(rawF(1)), f2l(rawF(0x80000001)));
  }

  private static void caseF2DZeroSubnormal() {
    doubles("f2d-zero-subnormal", f2d(0.0f), f2d(-0.0f), f2d(rawF(1)),
        f2d(rawF(0x80000001)), f2d(rawF(0x007fffff)), f2d(rawF(0x00800000)));
  }

  private static void caseF2DEndpoints() {
    doubles("f2d-endpoints", f2d(Float.MAX_VALUE), f2d(-Float.MAX_VALUE),
        f2d(Float.POSITIVE_INFINITY), f2d(Float.NEGATIVE_INFINITY));
    nan("f2d-endpoints", Double.isNaN(f2d(Float.NaN)));
  }

  private static void caseD2ISpecials() { ints("d2i-specials", d2i(Double.NaN), d2i(Double.POSITIVE_INFINITY), d2i(Double.NEGATIVE_INFINITY), d2i(0.0d), d2i(-0.0d)); }

  private static void caseD2IFinite() {
    ints("d2i-finite", d2i(3.75d), d2i(-3.75d), d2i(2147483646.75d), d2i(2147483647.75d),
        d2i(-2147483647.75d), d2i(-2147483648.75d), d2i(Double.MIN_VALUE), d2i(-Double.MIN_VALUE));
  }

  private static void caseD2LSpecials() { longs("d2l-specials", d2l(Double.NaN), d2l(Double.POSITIVE_INFINITY), d2l(Double.NEGATIVE_INFINITY), d2l(0.0d), d2l(-0.0d)); }

  private static void caseD2LFinite() {
    longs("d2l-finite", d2l(3.75d), d2l(-3.75d), d2l(0x1.fffffffffffffp62), d2l(0x1p63),
        d2l(-0x1.fffffffffffffp62), d2l(-0x1p63), d2l(Double.MIN_VALUE), d2l(-Double.MIN_VALUE));
  }

  private static void caseD2FSpecials() {
    nan("d2f-specials", Float.isNaN(d2f(Double.NaN)));
    floats("d2f-specials", d2f(Double.POSITIVE_INFINITY), d2f(Double.NEGATIVE_INFINITY), d2f(0.0d), d2f(-0.0d));
  }

  private static void caseD2FUnderflow() {
    floats("d2f-underflow", d2f(0x1p-151), d2f(0x1p-150), d2f(0x1.8p-150), d2f(0x1p-149),
        d2f(-0x1p-150), d2f(-0x1.8p-150), d2f(0x1.fffffcp-127),
        d2f(0x1.fffffep-127), d2f(0x1p-126));
  }

  private static void caseD2FRounding() {
    floats("d2f-rounding", d2f(0x1.000001p0), d2f(0x1.000003p0), d2f(0x1.000005p0),
        d2f(0x1.ffffffp-1), d2f(-0x1.000001p0), d2f(-0x1.000003p0));
  }

  private static void caseD2FOverflow() {
    floats("d2f-overflow", d2f(0x1.fffffep127), d2f(0x1.ffffffp127),
        d2f(0x1.fffffe8p127), d2f(-0x1.fffffep127), d2f(-0x1.ffffffp127));
  }

  private static void caseI2B() { ints("i2b", i2b(-129), i2b(-128), i2b(127), i2b(128), i2b(255), i2b(256), i2b(Integer.MIN_VALUE), i2b(Integer.MAX_VALUE)); }
  private static void caseI2C() { ints("i2c", i2c(-1), i2c(0), i2c(65535), i2c(65536), i2c(Integer.MIN_VALUE), i2c(Integer.MAX_VALUE), i2c(0x12345678), i2c(-65537)); }
  private static void caseI2S() { ints("i2s", i2s(-32769), i2s(-32768), i2s(32767), i2s(32768), i2s(65535), i2s(65536), i2s(Integer.MIN_VALUE), i2s(Integer.MAX_VALUE)); }

  private static void caseD2SmallTwoStage() {
    double[] inputs = {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, 128.75d, -129.75d, 65535.75d};
    for (double input : inputs) ints("d2-small-two-stage", d2b(input), d2c(input), d2s(input));
  }

  private static void caseIComparisons() {
    masks("i-comparisons", compareI(Integer.MIN_VALUE, Integer.MAX_VALUE), compareI(Integer.MAX_VALUE, Integer.MIN_VALUE),
        compareI(-1, 0), compareI(0, -1), compareI(0, 0));
  }

  private static void caseLComparisons() {
    masks("l-comparisons", compareL(Long.MIN_VALUE, Long.MAX_VALUE), compareL(Long.MAX_VALUE, Long.MIN_VALUE),
        compareL(9007199254740993L, 9007199254740992L), compareL(9007199254740992L, 9007199254740993L),
        compareL(Long.MAX_VALUE, Long.MAX_VALUE));
  }

  private static void caseFComparisons() {
    masks("f-comparisons", compareF(Float.NaN, 1.0f), compareF(1.0f, Float.NaN), compareF(Float.NaN, Float.NaN),
        compareF(0.0f, -0.0f), compareF(Float.NEGATIVE_INFINITY, Float.POSITIVE_INFINITY),
        compareF(Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY), compareF(Float.MIN_VALUE, 0.0f), compareF(-Float.MIN_VALUE, 0.0f));
  }

  private static void caseDComparisons() {
    masks("d-comparisons", compareD(Double.NaN, 1.0d), compareD(1.0d, Double.NaN), compareD(Double.NaN, Double.NaN),
        compareD(0.0d, -0.0d), compareD(Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY),
        compareD(Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY), compareD(Double.MIN_VALUE, 0.0d), compareD(-Double.MIN_VALUE, 0.0d));
  }

  private static void caseFZeroSubnormalArithmetic() {
    floats("f-zero-subnormal-arithmetic", fadd(-0.0f, -0.0f), fadd(-0.0f, 0.0f), fmul(-0.0f, -1.0f),
        fdiv(1.0f, -0.0f), fdiv(Float.MIN_VALUE, 2.0f), fmul(Float.MIN_VALUE, 2.0f),
        fsub(Float.MIN_NORMAL, rawF(0x007fffff)), frem(-0.0f, 3.0f), fneg(-0.0f), fneg(Float.MIN_VALUE));
    nan("f-zero-subnormal-arithmetic", Float.isNaN(fdiv(0.0f, 0.0f)));
  }

  private static void caseDZeroSubnormalArithmetic() {
    doubles("d-zero-subnormal-arithmetic", dadd(-0.0d, -0.0d), dadd(-0.0d, 0.0d), dmul(-0.0d, -1.0d),
        ddiv(1.0d, -0.0d), ddiv(Double.MIN_VALUE, 2.0d), dmul(Double.MIN_VALUE, 2.0d),
        dsub(Double.MIN_NORMAL, 0x0.fffffffffffffp-1022), drem(-0.0d, 3.0d), dneg(-0.0d), dneg(Double.MIN_VALUE));
    nan("d-zero-subnormal-arithmetic", Double.isNaN(ddiv(0.0d, 0.0d)));
  }

  private static void caseNullUnboxing() {
    try { unboxByte(null); throw new AssertionError("Byte null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Byte:java.lang.NullPointerException@invoke"); }
    try { unboxShort(null); throw new AssertionError("Short null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Short:java.lang.NullPointerException@invoke"); }
    try { unboxCharacter(null); throw new AssertionError("Character null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Character:java.lang.NullPointerException@invoke"); }
    try { unboxInteger(null); throw new AssertionError("Integer null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Integer:java.lang.NullPointerException@invoke"); }
    try { unboxLong(null); throw new AssertionError("Long null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Long:java.lang.NullPointerException@invoke"); }
    try { unboxFloat(null); throw new AssertionError("Float null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Float:java.lang.NullPointerException@invoke"); }
    try { unboxDouble(null); throw new AssertionError("Double null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Double:java.lang.NullPointerException@invoke"); }
    try { unboxBoolean(null); throw new AssertionError("Boolean null accepted"); }
    catch (NullPointerException expected) { event("null-unboxing", "Boolean:java.lang.NullPointerException@invoke"); }
  }

  private static void caseNonnullUnboxing() {
    ints("nonnull-unboxing", unboxByte(Byte.valueOf(Byte.MIN_VALUE)), unboxShort(Short.valueOf(Short.MIN_VALUE)),
        unboxCharacter(Character.valueOf(Character.MAX_VALUE)), unboxInteger(Integer.valueOf(Integer.MIN_VALUE)));
    longs("nonnull-unboxing", unboxLong(Long.valueOf(Long.MIN_VALUE)));
    floats("nonnull-unboxing", unboxFloat(Float.valueOf(-0.0f)));
    doubles("nonnull-unboxing", unboxDouble(Double.valueOf(-0.0d)));
    start("nonnull-unboxing");
    System.out.println(unboxBoolean(Boolean.TRUE));
  }

  public static void main(String[] args) {
    caseIOverflow();
    caseLOverflow();
    caseIDivision();
    caseLDivision();
    caseIRemainder();
    caseLRemainder();
    caseIntegralZeroDivisors();
    caseIShlMask();
    caseIShrMask();
    caseIUshrMask();
    caseLShlMask();
    caseLShrMask();
    caseLUshrMask();
    caseIBitwise();
    caseLBitwise();
    caseI2L();
    caseI2F();
    caseI2D();
    caseL2I();
    caseL2F();
    caseL2D53Ties();
    caseL2DEndpoints();
    caseF2ISpecials();
    caseF2IFinite();
    caseF2LSpecials();
    caseF2LFinite();
    caseF2DZeroSubnormal();
    caseF2DEndpoints();
    caseD2ISpecials();
    caseD2IFinite();
    caseD2LSpecials();
    caseD2LFinite();
    caseD2FSpecials();
    caseD2FUnderflow();
    caseD2FRounding();
    caseD2FOverflow();
    caseI2B();
    caseI2C();
    caseI2S();
    caseD2SmallTwoStage();
    caseIComparisons();
    caseLComparisons();
    caseFComparisons();
    caseDComparisons();
    caseFZeroSubnormalArithmetic();
    caseDZeroSubnormalArithmetic();
    caseNullUnboxing();
    caseNonnullUnboxing();
    System.out.println("CORE_NUMERIC_OK");
  }
}
