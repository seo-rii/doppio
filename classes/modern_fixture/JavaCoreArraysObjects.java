package classes.modern_test;

import java.lang.constant.ConstantDesc;
import java.lang.invoke.MethodHandles;
import java.lang.reflect.Type;

/**
 * Genuine javac input for the selected B5 array/object execution clauses.
 * No dynamic concatenation, bytecode mutation or clone workaround. The two
 * ConstantDesc array cases also compare raw/generic interface metadata; the
 * ConstantDesc API dependency is not general dynamic-bootstrap coverage.
 * Output is checked against independently specified, exact per-case traces.
 */
public final class JavaCoreArraysObjects {
  private static String activeCase;
  private static String phase = "";
  private static boolean literalInitialized;

  private static void begin(String id) {
    activeCase = id;
    phase = "";
  }

  private static void emit(String event) {
    StringBuilder line = new StringBuilder(activeCase).append('=');
    if (phase.length() != 0) line.append(phase).append(':');
    System.out.println(line.append(event).toString());
  }

  private static void emit(String label, long value) {
    emit(new StringBuilder(label).append('=').append(value).toString());
  }

  private static void emit(String label, boolean value) {
    emit(new StringBuilder(label).append('=').append(value).toString());
  }

  private static void pair(String label, long first, long second) {
    emit(new StringBuilder(label).append('=').append(first).append(',').append(second).toString());
  }

  private static void triple(String label, boolean first, boolean second, boolean third) {
    emit(new StringBuilder(label).append('=').append(first).append(',')
      .append(second).append(',').append(third).toString());
  }

  private static void require(boolean condition) {
    if (!condition) throw new AssertionError(activeCase);
  }

  private static void missingException() {
    throw new AssertionError(new StringBuilder(activeCase).append(": expected exception").toString());
  }

  private static void error(RuntimeException failure, Class<?> expected) {
    require(failure.getClass() == expected);
    emit(new StringBuilder("error=").append(failure.getClass().getName()).toString());
  }

  private static final class ProbeException extends RuntimeException { }

  private interface Role { }
  private static class Token implements Role {
    final int value;
    Token(int value) { this.value = value; }
  }
  private static final class Child extends Token {
    Child(int value) { super(value); }
  }

  /** Parameters ensure javac emits each requested load/store/allocation. */
  private static final class ArrayProbes {
    static boolean[] allocateBoolean(int size) { return new boolean[size]; }
    static boolean loadBoolean(boolean[] values, int index) { return values[index]; }
    static boolean storeLoadBoolean(boolean[] values, int index, boolean value) {
      values[index] = value;
      return values[index];
    }
    static byte[] allocateByte(int size) { return new byte[size]; }
    static int loadByte(byte[] values, int index) { return values[index]; }
    static int storeLoadByte(byte[] values, int index, byte value) {
      values[index] = value;
      return values[index];
    }
    static short[] allocateShort(int size) { return new short[size]; }
    static int loadShort(short[] values, int index) { return values[index]; }
    static int storeLoadShort(short[] values, int index, short value) {
      values[index] = value;
      return values[index];
    }
    static char[] allocateChar(int size) { return new char[size]; }
    static int loadChar(char[] values, int index) { return values[index]; }
    static int storeLoadChar(char[] values, int index, char value) {
      values[index] = value;
      return values[index];
    }
    static int[] allocateInt(int size) { return new int[size]; }
    static int loadInt(int[] values, int index) { return values[index]; }
    static int storeLoadInt(int[] values, int index, int value) {
      values[index] = value;
      return values[index];
    }
    static long[] allocateLong(int size) { return new long[size]; }
    static long loadLong(long[] values, int index) { return values[index]; }
    static long storeLoadLong(long[] values, int index, long value) {
      values[index] = value;
      return values[index];
    }
    static float[] allocateFloat(int size) { return new float[size]; }
    static float loadFloat(float[] values, int index) { return values[index]; }
    static float storeLoadFloat(float[] values, int index, float value) {
      values[index] = value;
      return values[index];
    }
    static double[] allocateDouble(int size) { return new double[size]; }
    static double loadDouble(double[] values, int index) { return values[index]; }
    static double storeLoadDouble(double[] values, int index, double value) {
      values[index] = value;
      return values[index];
    }
    static Object[] allocateReferences(int size) { return new Object[size]; }
    static Object loadReference(Object[] values, int index) { return values[index]; }
    static Object storeLoadReference(Object[] values, int index, Object value) {
      values[index] = value;
      return values[index];
    }
    static int lengthInts(int[] values) { return values.length; }
    static int lengthReferences(Object[] values) { return values.length; }
  }

  private static final class ConstantDescProbes {
    static ConstantDesc[] allocate(int size) { return new ConstantDesc[size]; }
    static ConstantDesc cast(Object value) { return (ConstantDesc) value; }
    static ConstantDesc store(ConstantDesc[] values, int index, ConstantDesc value) {
      values[index] = value;
      return values[index];
    }
    static Object storeAlias(Object[] values, int index, Object value) {
      values[index] = value;
      return values[index];
    }
    static int warmStores(ConstantDesc[] values, Object[] expected, int rounds) {
      int mask = 0;
      for (int round = 0; round < rounds; round++) {
        for (int i = 0; i < expected.length; i++) {
          require(store(values, i, cast(expected[i])) == expected[i]);
          mask |= 1 << i;
        }
      }
      return mask;
    }
    static Object resolve(ConstantDesc value, MethodHandles.Lookup lookup) {
      try {
        return value.resolveConstantDesc(lookup);
      } catch (ReflectiveOperationException failure) {
        throw new AssertionError(failure);
      }
    }
    static boolean interfaceMetadata(Class<?> type, boolean expected) {
      int raw = 0;
      for (Class<?> candidate : type.getInterfaces()) {
        if (candidate == ConstantDesc.class) raw++;
      }
      int generic = 0;
      for (Type candidate : type.getGenericInterfaces()) {
        if (candidate == ConstantDesc.class) generic++;
      }
      return raw == (expected ? 1 : 0) && generic == raw;
    }
    static Object[] positiveValues() {
      return new Object[] { Integer.valueOf(1001), Long.valueOf(4294967298L),
        Float.valueOf(1.5f), Double.valueOf(-2.25d), new String("constant-desc") };
    }
  }

  private static int marked(String event, int value, boolean abrupt) {
    emit(event);
    if (abrupt) throw new ProbeException();
    return value;
  }

  private static int[] intArray(int[] values, boolean abrupt) {
    emit("A");
    if (abrupt) throw new ProbeException();
    return values;
  }

  private static Object[] referenceArray(Object[] values) {
    emit("A");
    return values;
  }

  private static Object referenceValue(Object value) {
    emit("R");
    return value;
  }

  private static final class OrderProbes {
    static int readOrder(int[] values, int index, boolean arrayAbrupt, boolean indexAbrupt) {
      return intArray(values, arrayAbrupt)[marked("I", index, indexAbrupt)];
    }
    static void simpleStore(int[] values, int index, int value, boolean rhsAbrupt) {
      intArray(values, false)[marked("I", index, false)] = marked("R", value, rhsAbrupt);
    }
    static int compoundStore(int[] values, int index, int value) {
      return intArray(values, false)[marked("I", index, false)] += marked("R", value, false);
    }
    static void referenceStore(Object[] values, int index, Object value) {
      referenceArray(values)[marked("I", index, false)] = referenceValue(value);
    }
    static int[][][] partialMatrix(int first, int second) {
      return new int[marked("D1", first, false)][marked("D2", second, false)][];
    }
    static int[][] intMatrix(int first, int second, boolean firstAbrupt, boolean secondAbrupt) {
      return new int[marked("D1", first, firstAbrupt)][marked("D2", second, secondAbrupt)];
    }
    static Object[][] referenceMatrix(int first, int second) {
      return new Object[marked("D1", first, false)][marked("D2", second, false)];
    }
    static int[] initializer(boolean firstAbrupt) {
      return new int[] { marked("E1", 1, firstAbrupt), marked("E2", 2, false) };
    }
  }

  private static final class Fields {
    byte b;
    short s;
    char c;
    int i;
    long j;
    float f;
    double d;
    boolean z;
    Object reference;
    static int shared;

    Fields() { }
    Fields(byte b, short s, char c, int i, long j, float f, double d, boolean z, Object reference) {
      this.b = b;
      this.s = s;
      this.c = c;
      this.i = i;
      this.j = j;
      this.f = f;
      this.d = d;
      this.z = z;
      this.reference = reference;
    }
  }

  private static Fields qualifier(Fields receiver) {
    emit("Q");
    return receiver;
  }

  private static final class ObjectProbes {
    static boolean defaultFields(Fields value) {
      return value.b == 0 && value.s == 0 && value.c == 0 && value.i == 0 && value.j == 0L
        && Float.floatToRawIntBits(value.f) == 0 && Double.doubleToRawLongBits(value.d) == 0L
        && !value.z && value.reference == null;
    }
    static boolean fieldValues(Fields value, Object reference) {
      return value.b == -7 && value.s == -300 && value.c == 65535 && value.i == 41
        && value.j == 4294967298L && Float.floatToRawIntBits(value.f) == 1069547520
        && Double.doubleToRawLongBits(value.d) == 4609434218613702656L
        && value.z && value.reference == reference;
    }
    // A null expression qualifier of a static field is evaluated but not dereferenced.
    static int readStatic(Fields receiver) { return qualifier(receiver).shared; }
    static void writeStatic(Fields receiver, int value) { qualifier(receiver).shared = marked("R", value, false); }
    static int readField(Fields receiver) { return qualifier(receiver).i; }
    static void writeField(Fields receiver, int value) { qualifier(receiver).i = marked("R", value, false); }
  }

  private static class OrderedBase {
    static { emit("base-clinit"); }
    int base = marked("base-field", 1, false);
    OrderedBase(int value) {
      emit("base-body");
      base = value;
    }
  }

  private static final class Ordered extends OrderedBase {
    static { emit("child-clinit"); }
    int child = marked("child-field", 2, false);
    Ordered(int first, int second) {
      super(marked("super-arg", first, false));
      emit("child-body");
      child = first + second;
    }
  }

  private static final class Aborted {
    static { emit("abort-clinit"); }
    static boolean body;
    Aborted(int first, int second) { body = true; }
  }

  private static final class CastProbes {
    static Token castToken(Object value) { return (Token) value; }
    static Role castRole(Object value) { return (Role) value; }
    static Object[] castObjects(Object value) { return (Object[]) value; }
    static int[] castInts(Object value) { return (int[]) value; }
    static Token[] castTokens(Object value) { return (Token[]) value; }
    static boolean isToken(Object value) { return value instanceof Token; }
    static boolean isRole(Object value) { return value instanceof Role; }
    static boolean isObject(Object value) { return value instanceof Object; }
    static boolean isCloneable(Object value) { return value instanceof Cloneable; }
    static boolean isSerializable(Object value) { return value instanceof java.io.Serializable; }
    static boolean isObjectArray(Object value) { return value instanceof Object[]; }
    static boolean isObjectMatrix(Object value) { return value instanceof Object[][]; }
    static boolean same(Object first, Object second) { return first == second; }
    static boolean different(Object first, Object second) { return first != second; }
  }

  private static final class LiteralOnly {
    static { literalInitialized = true; }
  }

  /** Small dedicated constant pool also keeps the exact ldc (not ldc_w) probes stable. */
  private static final class LiteralProbes {
    static Class<?> literalOnly() { return LiteralOnly.class; }
    static Class<?> referenceArray() { return Object[].class; }
    static Class<?> primitiveArray() { return int[].class; }
    static Class<?> primitiveMatrix() { return int[][].class; }
    static Class<?> primitive() { return int.class; }
  }

  public static void caseBoolean() {
    begin("ao-boolean");
    boolean[] values = ArrayProbes.allocateBoolean(2);
    emit("default", ArrayProbes.loadBoolean(values, 0));
    emit(new StringBuilder("stored=").append(ArrayProbes.storeLoadBoolean(values, 0, true))
      .append(',').append(ArrayProbes.storeLoadBoolean(values, 1, false)).toString());
    emit("length", values.length);
  }

  public static void caseByte() {
    begin("ao-byte");
    byte[] values = ArrayProbes.allocateByte(2);
    emit("default", ArrayProbes.loadByte(values, 0));
    pair("stored", ArrayProbes.storeLoadByte(values, 0, (byte) -128),
      ArrayProbes.storeLoadByte(values, 1, (byte) -1));
    emit("length", values.length);
  }

  public static void caseShort() {
    begin("ao-short");
    short[] values = ArrayProbes.allocateShort(2);
    emit("default", ArrayProbes.loadShort(values, 0));
    pair("stored", ArrayProbes.storeLoadShort(values, 0, (short) -32768),
      ArrayProbes.storeLoadShort(values, 1, (short) -1));
    emit("length", values.length);
  }

  public static void caseChar() {
    begin("ao-char");
    char[] values = ArrayProbes.allocateChar(2);
    emit("default", ArrayProbes.loadChar(values, 0));
    pair("stored", ArrayProbes.storeLoadChar(values, 0, (char) 32768),
      ArrayProbes.storeLoadChar(values, 1, (char) 65535));
    emit("length", values.length);
  }

  public static void caseInt() {
    begin("ao-int");
    int[] values = ArrayProbes.allocateInt(2);
    emit("default", ArrayProbes.loadInt(values, 0));
    pair("stored", ArrayProbes.storeLoadInt(values, 0, -2147483648),
      ArrayProbes.storeLoadInt(values, 1, 2147483647));
    emit("length", values.length);
  }

  public static void caseLong() {
    begin("ao-long");
    long[] values = ArrayProbes.allocateLong(2);
    emit("default", ArrayProbes.loadLong(values, 0));
    pair("stored", ArrayProbes.storeLoadLong(values, 0, -9223372036854775808L),
      ArrayProbes.storeLoadLong(values, 1, 9223372036854775807L));
    emit("length", values.length);
  }

  public static void caseFloat() {
    begin("ao-float");
    float[] values = ArrayProbes.allocateFloat(2);
    emit("default", Float.floatToRawIntBits(ArrayProbes.loadFloat(values, 0)));
    pair("stored", Float.floatToRawIntBits(ArrayProbes.storeLoadFloat(values, 0, 1.5f)),
      Float.floatToRawIntBits(ArrayProbes.storeLoadFloat(values, 1, -0.0f)));
    emit("length", values.length);
  }

  public static void caseDouble() {
    begin("ao-double");
    double[] values = ArrayProbes.allocateDouble(2);
    emit("default", Double.doubleToRawLongBits(ArrayProbes.loadDouble(values, 0)));
    pair("stored", Double.doubleToRawLongBits(ArrayProbes.storeLoadDouble(values, 0, 1.5d)),
      Double.doubleToRawLongBits(ArrayProbes.storeLoadDouble(values, 1, -0.0d)));
    emit("length", values.length);
  }

  public static void caseReference() {
    begin("ao-reference");
    Object[] values = ArrayProbes.allocateReferences(2);
    emit(new StringBuilder("default=").append(ArrayProbes.loadReference(values, 0)).toString());
    Token first = new Token(1);
    Token second = new Token(1);
    emit("first", ArrayProbes.storeLoadReference(values, 0, first) == first);
    emit("second", ArrayProbes.storeLoadReference(values, 1, second) == second);
    emit("distinct", values[0] != values[1]);
    emit("null", ArrayProbes.storeLoadReference(values, 0, null) == null);
    emit("length", values.length);
  }

  public static void caseReadOrder() {
    begin("ao-read-order");
    emit("value", OrderProbes.readOrder(new int[] { 7 }, 0, false, false));
  }

  public static void caseArrayAbrupt() {
    begin("ao-array-abrupt");
    try {
      OrderProbes.readOrder(new int[] { 7 }, 0, true, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, ProbeException.class); }
  }

  public static void caseIndexAbrupt() {
    begin("ao-index-abrupt");
    try {
      OrderProbes.readOrder(null, 0, false, true);
      missingException();
    } catch (RuntimeException failure) { error(failure, ProbeException.class); }
  }

  public static void caseNullBeforeBounds() {
    begin("ao-null-before-bounds");
    try {
      OrderProbes.readOrder(null, -1, false, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, NullPointerException.class); }
  }

  public static void caseReadBounds() {
    begin("ao-read-bounds");
    int[] values = new int[] { 7 };
    phase = "negative";
    try {
      OrderProbes.readOrder(values, -1, false, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, ArrayIndexOutOfBoundsException.class); }
    phase = "upper";
    try {
      OrderProbes.readOrder(values, values.length, false, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, ArrayIndexOutOfBoundsException.class); }
  }

  public static void caseSimpleRhs() {
    begin("ao-simple-rhs");
    phase = "throw";
    try {
      OrderProbes.simpleStore(null, -1, 3, true);
      missingException();
    } catch (RuntimeException failure) { error(failure, ProbeException.class); }
    phase = "null";
    try {
      OrderProbes.simpleStore(null, -1, 3, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, NullPointerException.class); }
  }

  public static void caseCompoundEarlyCheck() {
    begin("ao-compound-early-check");
    phase = "null";
    try {
      OrderProbes.compoundStore(null, -1, 3);
      missingException();
    } catch (RuntimeException failure) { error(failure, NullPointerException.class); }
    phase = "bounds";
    try {
      OrderProbes.compoundStore(new int[] { 7 }, 1, 3);
      missingException();
    } catch (RuntimeException failure) { error(failure, ArrayIndexOutOfBoundsException.class); }
  }

  public static void caseCovariantStore() {
    begin("ao-covariant-store");
    Child original = new Child(1);
    Child replacement = new Child(2);
    Child[] concrete = new Child[] { original };
    Object[] alias = concrete;
    phase = "valid";
    OrderProbes.referenceStore(alias, 0, replacement);
    emit("same", concrete[0] == replacement);
    phase = "null";
    OrderProbes.referenceStore(alias, 0, null);
    emit("value", concrete[0] == null);
    concrete[0] = original;
    phase = "fail";
    try {
      OrderProbes.referenceStore(alias, 0, new Token(3));
      missingException();
    } catch (RuntimeException failure) { error(failure, ArrayStoreException.class); }
    phase = "";
    emit("unchanged", concrete[0] == original);
    emit("alias", alias == concrete);
  }

  public static void caseBoundsBeforeStoreType() {
    begin("ao-bounds-before-store-type");
    Child original = new Child(1);
    Child[] concrete = new Child[] { original };
    try {
      OrderProbes.referenceStore(concrete, 1, new Token(2));
      missingException();
    } catch (RuntimeException failure) { error(failure, ArrayIndexOutOfBoundsException.class); }
    emit("unchanged", concrete[0] == original);
  }

  public static void casePartialRank() {
    begin("ao-partial-rank");
    int[][][] values = OrderProbes.partialMatrix(2, 3);
    emit(new StringBuilder("shape=").append(values.length).append(',')
      .append(values[0].length).append(',').append(values[0][0] == null).toString());
    emit("rows-distinct", values[0] != values[1]);
    int[][] alias = values[0];
    int[] leaf = new int[] { 9 };
    alias[1] = leaf;
    emit("alias", values[0][1] == leaf);
  }

  public static void caseFullMatrices() {
    begin("ao-full-matrices");
    phase = "int";
    int[][] ints = OrderProbes.intMatrix(2, 3, false, false);
    pair("shape", ints.length, ints[0].length);
    emit("default", ints[0][0]);
    emit("rows-distinct", ints[0] != ints[1]);
    ints[0][0] = 9;
    emit("other", ints[1][0]);
    phase = "ref";
    Object[][] references = OrderProbes.referenceMatrix(2, 2);
    pair("shape", references.length, references[0].length);
    emit("default", references[0][0] == null);
    emit("rows-distinct", references[0] != references[1]);
  }

  public static void caseNegativeDimensions() {
    begin("ao-negative-dimensions");
    phase = "single";
    try {
      ArrayProbes.allocateInt(marked("D1", -1, false));
      missingException();
    } catch (RuntimeException failure) { error(failure, NegativeArraySizeException.class); }
    phase = "first";
    try {
      OrderProbes.intMatrix(-1, 2, false, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, NegativeArraySizeException.class); }
    phase = "later";
    try {
      OrderProbes.intMatrix(2, -1, false, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, NegativeArraySizeException.class); }
    phase = "zero-negative";
    try {
      OrderProbes.intMatrix(0, -1, false, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, NegativeArraySizeException.class); }
    phase = "zero";
    emit("length", OrderProbes.intMatrix(0, 2, false, false).length);
  }

  public static void caseDimensionLaterAbrupt() {
    begin("ao-dimension-later-abrupt");
    try {
      OrderProbes.intMatrix(-1, 2, false, true);
      missingException();
    } catch (RuntimeException failure) { error(failure, ProbeException.class); }
  }

  public static void caseDimensionFirstAbrupt() {
    begin("ao-dimension-first-abrupt");
    try {
      OrderProbes.intMatrix(2, -1, true, false);
      missingException();
    } catch (RuntimeException failure) { error(failure, ProbeException.class); }
  }

  public static void caseFieldDefaults() {
    begin("ao-field-defaults");
    // A fixed summary is emitted only after every actual field value is checked.
    require(ObjectProbes.defaultFields(new Fields()));
    emit("defaults=0,0,0,0,0,0,0,false,true");
  }

  public static void caseFieldValues() {
    begin("ao-field-values");
    Object reference = new Token(1);
    Fields values = new Fields((byte) -7, (short) -300, (char) 65535, 41, 4294967298L,
      1.5f, 1.5d, true, reference);
    require(ObjectProbes.fieldValues(values, reference));
    emit("values=-7,-300,65535,41,4294967298,1069547520,4609434218613702656,true,true");
  }

  public static void caseNewOrder() {
    begin("ao-new-order");
    Ordered value = new Ordered(marked("arg1", 3, false), marked("arg2", 4, false));
    pair("values", value.base, value.child);
  }

  public static void caseNewArgumentAbrupt() {
    begin("ao-new-argument-abrupt");
    try {
      new Aborted(marked("arg1", 3, true), marked("arg2", 4, false));
      missingException();
    } catch (RuntimeException failure) { error(failure, ProbeException.class); }
    emit("body", Aborted.body);
  }

  public static void caseFieldEvaluation() {
    begin("ao-field-evaluation");
    Fields.shared = 7;
    phase = "static-read";
    emit("value", ObjectProbes.readStatic(null));
    phase = "static-write";
    ObjectProbes.writeStatic(null, 11);
    emit("value", Fields.shared);
    phase = "read-null";
    try {
      ObjectProbes.readField(null);
      missingException();
    } catch (RuntimeException failure) { error(failure, NullPointerException.class); }
    phase = "write-null";
    try {
      ObjectProbes.writeField(null, 12);
      missingException();
    } catch (RuntimeException failure) { error(failure, NullPointerException.class); }
  }

  public static void caseCastIdentities() {
    begin("ao-cast-identities");
    Object value = new Child(1);
    emit("base-same", CastProbes.castToken(value) == value);
    emit("role-same", CastProbes.castRole(value) == value);
  }

  public static void caseCastFailure() {
    begin("ao-cast-failure");
    Token original = new Token(1);
    Token value = original;
    try {
      value = CastProbes.castToken(new Object());
      missingException();
    } catch (RuntimeException failure) { error(failure, ClassCastException.class); }
    emit("unchanged", value == original);
  }

  public static void caseCastNull() {
    begin("ao-cast-null");
    emit("base", CastProbes.castToken(null) == null);
    emit("interface", CastProbes.castRole(null) == null);
    emit("references", CastProbes.castObjects(null) == null);
    emit("primitive-array", CastProbes.castInts(null) == null);
  }

  public static void caseInstanceof() {
    begin("ao-instanceof");
    Object child = new Child(1);
    Object unrelated = new Object();
    triple("class", CastProbes.isToken(child), CastProbes.isToken(unrelated), CastProbes.isToken(null));
    triple("interface", CastProbes.isRole(child), CastProbes.isRole(unrelated), CastProbes.isRole(null));
  }

  public static void caseArrayCasts() {
    begin("ao-array-casts");
    Child[] children = new Child[1];
    int[][] matrix = new int[1][1];
    emit("covariant", CastProbes.castObjects(children) == children);
    emit("rank2-objects", CastProbes.castObjects(matrix) == matrix);
    phase = "primitive";
    try {
      CastProbes.castObjects(new int[1]);
      missingException();
    } catch (RuntimeException failure) { error(failure, ClassCastException.class); }
    phase = "contents-not-type";
    try {
      CastProbes.castTokens(new Object[] { new Token(1) });
      missingException();
    } catch (RuntimeException failure) { error(failure, ClassCastException.class); }
  }

  public static void caseArrayInstanceof() {
    begin("ao-array-instanceof");
    int[] ints = new int[1];
    Token[] references = new Token[1];
    int[][] matrix = new int[1][1];
    triple("primitive-markers", CastProbes.isObject(ints), CastProbes.isCloneable(ints),
      CastProbes.isSerializable(ints));
    triple("reference-markers", CastProbes.isObject(references), CastProbes.isCloneable(references),
      CastProbes.isSerializable(references));
    triple("object-array", CastProbes.isObjectArray(references), CastProbes.isObjectArray(ints),
      CastProbes.isObjectArray(matrix));
    emit("rank2-object-array", CastProbes.isObjectMatrix(matrix));
  }

  public static void caseReferenceEquality() {
    begin("ao-reference-equality");
    Token first = new Token(1);
    Token second = new Token(1);
    Object alias = first;
    emit("same", CastProbes.same(first, alias));
    emit("distinct", CastProbes.same(first, second));
    emit("null-null", CastProbes.same(null, null));
    emit("null-object", CastProbes.same(null, first));
    emit(new StringBuilder("neq=").append(CastProbes.different(first, alias)).append(',')
      .append(CastProbes.different(first, second)).append(',')
      .append(CastProbes.different(null, null)).append(',')
      .append(CastProbes.different(null, first)).toString());
  }

  public static void caseClassLiterals() {
    begin("ao-class-literals");
    Class<?> passive = LiteralProbes.literalOnly();
    emit("passive", !literalInitialized);
    emit("literal-repeat", passive == LiteralProbes.literalOnly());
    emit("reference-array", LiteralProbes.referenceArray() == new Object[0].getClass());
    emit("primitive-array", LiteralProbes.primitiveArray() == new int[0].getClass());
    emit("rank2", LiteralProbes.primitiveMatrix() == new int[0][].getClass());
    emit("primitive", LiteralProbes.primitive() == Integer.TYPE);
    emit("distinct", LiteralProbes.primitive() != boolean.class);
  }

  public static void caseInitializerOrder() {
    begin("ao-initializer-order");
    phase = "ok";
    int[] values = OrderProbes.initializer(false);
    pair("values", values[0], values[1]);
    int[] original = values;
    phase = "abrupt";
    try {
      values = OrderProbes.initializer(true);
      missingException();
    } catch (RuntimeException failure) { error(failure, ProbeException.class); }
    phase = "";
    emit("unchanged", values == original);
  }

  public static void caseArraylength() {
    begin("ao-arraylength");
    emit(new StringBuilder("lengths=").append(ArrayProbes.lengthInts(new int[0])).append(',')
      .append(ArrayProbes.lengthInts(new int[3])).append(',')
      .append(ArrayProbes.lengthReferences(new Object[2])).toString());
    phase = "int-null";
    try {
      ArrayProbes.lengthInts(null);
      missingException();
    } catch (RuntimeException failure) { error(failure, NullPointerException.class); }
    phase = "ref-null";
    try {
      ArrayProbes.lengthReferences(null);
      missingException();
    } catch (RuntimeException failure) { error(failure, NullPointerException.class); }
  }

  public static void caseConstantDescStores() {
    begin("ao-constant-desc-stores");
    Object[] expected = ConstantDescProbes.positiveValues();
    Class<?>[] types = { Integer.class, Long.class, Float.class, Double.class, String.class };
    ConstantDesc[] values = ConstantDescProbes.allocate(expected.length);
    int typeMask = 0;
    int normalMask = 0;
    for (int i = 0; i < expected.length; i++) {
      if (expected[i].getClass() == types[i]) typeMask |= 1 << i;
      if (ConstantDescProbes.store(values, i, ConstantDescProbes.cast(expected[i])) == expected[i]) {
        normalMask |= 1 << i;
      }
    }
    emit("types", typeMask);
    // Repeated calls exercise the warmed path without claiming JIT coverage.
    pair("stores", normalMask, ConstantDescProbes.warmStores(values, expected, 256));
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    int nullMask = 0;
    int resolveMask = 0;
    int assignableMask = 0;
    int interfacesMask = 0;
    for (int i = 0; i < expected.length; i++) {
      if (ConstantDescProbes.store(values, i, null) == null) nullMask |= 1 << i;
      require(ConstantDescProbes.store(values, i, ConstantDescProbes.cast(expected[i])) == expected[i]);
      if (ConstantDescProbes.resolve(values[i], lookup) == expected[i]) resolveMask |= 1 << i;
      if (ConstantDesc.class.isAssignableFrom(types[i])) assignableMask |= 1 << i;
      if (ConstantDescProbes.interfaceMetadata(types[i], true)) interfacesMask |= 1 << i;
    }
    emit("null", nullMask);
    emit("resolve", resolveMask);
    emit("assignable", assignableMask);
    emit("interfaces", interfacesMask);
  }

  public static void caseConstantDescRejections() {
    begin("ao-constant-desc-rejections");
    Object[] expected = ConstantDescProbes.positiveValues();
    Object[] rejected = { Boolean.TRUE, Byte.valueOf((byte) 7), Short.valueOf((short) 9),
      Character.valueOf('x'), new Object() };
    ConstantDesc[] values = ConstantDescProbes.allocate(expected.length);
    Object[] alias = values;
    for (int i = 0; i < expected.length; i++) {
      require(ConstantDescProbes.store(values, i, ConstantDescProbes.cast(expected[i])) == expected[i]);
    }
    int rejectedMask = 0;
    int unchangedMask = 0;
    int disallowedMask = 0;
    int interfacesMask = 0;
    for (int i = 0; i < rejected.length; i++) {
      try {
        ConstantDescProbes.storeAlias(alias, i, rejected[i]);
        missingException();
      } catch (RuntimeException failure) {
        require(failure.getClass() == ArrayStoreException.class);
        rejectedMask |= 1 << i;
      }
      for (int j = 0; j < expected.length; j++) require(values[j] == expected[j]);
      unchangedMask |= 1 << i;
      Class<?> rejectedType = rejected[i].getClass();
      if (!ConstantDesc.class.isAssignableFrom(rejectedType)) disallowedMask |= 1 << i;
      if (ConstantDescProbes.interfaceMetadata(rejectedType, false)) interfacesMask |= 1 << i;
    }
    emit(new StringBuilder("errors=java.lang.ArrayStoreException:").append(rejectedMask).toString());
    emit("unchanged", unchangedMask);
    emit("disallowed", disallowedMask);
    emit("interfaces", interfacesMask);
    int nullMask = 0;
    int restoredMask = 0;
    for (int i = 0; i < expected.length; i++) {
      if (ConstantDescProbes.storeAlias(alias, i, null) == null) nullMask |= 1 << i;
      if (ConstantDescProbes.storeAlias(alias, i, expected[i]) == expected[i]
          && values[i] == expected[i]) restoredMask |= 1 << i;
    }
    emit("null", nullMask);
    emit("restored", restoredMask);
  }

  public static void main(String[] args) {
    caseBoolean();
    caseByte();
    caseShort();
    caseChar();
    caseInt();
    caseLong();
    caseFloat();
    caseDouble();
    caseReference();
    caseReadOrder();
    caseArrayAbrupt();
    caseIndexAbrupt();
    caseNullBeforeBounds();
    caseReadBounds();
    caseSimpleRhs();
    caseCompoundEarlyCheck();
    caseCovariantStore();
    caseBoundsBeforeStoreType();
    casePartialRank();
    caseFullMatrices();
    caseNegativeDimensions();
    caseDimensionLaterAbrupt();
    caseDimensionFirstAbrupt();
    caseFieldDefaults();
    caseFieldValues();
    caseNewOrder();
    caseNewArgumentAbrupt();
    caseFieldEvaluation();
    caseCastIdentities();
    caseCastFailure();
    caseCastNull();
    caseInstanceof();
    caseArrayCasts();
    caseArrayInstanceof();
    caseReferenceEquality();
    caseClassLiterals();
    caseInitializerOrder();
    caseArraylength();
    caseConstantDescStores();
    caseConstantDescRejections();
    System.out.println("CORE_ARRAYS_OBJECTS_OK");
  }
}
