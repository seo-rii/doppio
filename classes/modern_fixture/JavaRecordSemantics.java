package classes.modern_test;

/**
 * Forty selected record contracts, compiled without mutation by javac 21/25.
 * Generated hashes and complete toString syntax are deliberately not oracles.
 * No reflection, lambdas, string-concat indy or substitute record bytecode.
 */
public final class JavaRecordSemantics {
  private static String activeCase;
  private static int constructorEffects;
  private static int accessorCalls;
  private static int equalsCalls;
  private static int hashCalls;
  private static int textCalls;

  private static final class Sentinel extends RuntimeException { }
  private static final Sentinel CONSTRUCTOR_FAILURE = new Sentinel();
  private static final Sentinel ACCESSOR_FAILURE = new Sentinel();
  private static final Sentinel EQUALS_FAILURE = new Sentinel();
  private static final Sentinel HASH_FAILURE = new Sentinel();
  private static final Sentinel TEXT_FAILURE = new Sentinel();

  private static void begin(String id) { activeCase = id; }
  private static void emit(String event) {
    System.out.print(activeCase);
    System.out.print('=');
    System.out.println(event);
  }
  private static void flags(String label, boolean... values) {
    StringBuilder text = new StringBuilder(label).append('=');
    for (int i = 0; i < values.length; i++) {
      if (i != 0) text.append(',');
      text.append(values[i]);
    }
    emit(text.toString());
  }
  private static void numbers(String label, long... values) {
    StringBuilder text = new StringBuilder(label).append('=');
    for (int i = 0; i < values.length; i++) {
      if (i != 0) text.append(',');
      text.append(values[i]);
    }
    emit(text.toString());
  }
  private static boolean mentions(String text, String... tokens) {
    if (text == null) return false;
    for (String token : tokens) if (!text.contains(token)) return false;
    return true;
  }

  private record Scalars(boolean flag, byte byteValue, char charValue, short shortValue,
                         int intValue, long longValue, float floatValue, double doubleValue) { }
  private record Wide(long first, int marker, double middle, Object token,
                      long second, float small, double last) { }
  private record Explicit(int left, long right, String label) {
    Explicit(int left, long right, String label) {
      this.left = left * 2;
      this.right = right + 3;
      this.label = label == null ? "unnamed" : label;
    }
  }
  private record Compact(int low, int high, String label) {
    Compact {
      if (low > high) {
        int temporary = low;
        low = high;
        high = temporary;
      }
      label = label == null ? "normalized" : label;
    }
  }
  private record Checked(int value) {
    Checked {
      constructorEffects++;
      if (value < 0) throw CONSTRUCTOR_FAILURE;
      constructorEffects += 10;
    }
  }
  private record Auxiliary(int value, String label) {
    Auxiliary { constructorEffects = constructorEffects * 10 + 1; }
    Auxiliary(int value) {
      this(value, "auxiliary");
      constructorEffects = constructorEffects * 10 + 2;
    }
    Auxiliary() {
      this(7);
      constructorEffects = constructorEffects * 10 + 3;
    }
  }
  private record AuxChecked(int value) {
    AuxChecked {
      constructorEffects++;
      if (value < 0) throw CONSTRUCTOR_FAILURE;
      constructorEffects += 10;
    }
    AuxChecked() {
      this(-1);
      constructorEffects += 100;
    }
  }
  private record Varargs(String label, int... values) { }
  private record CompactVarargs(long... values) {
    CompactVarargs { values = values.clone(); }
  }
  private record CustomAccessor(String value) {
    public String value() {
      accessorCalls++;
      return "accessor-token";
    }
  }
  private record ThrowingAccessor(String value) {
    public String value() {
      accessorCalls++;
      throw ACCESSOR_FAILURE;
    }
  }
  private record Defensive(int[] values) {
    public int[] values() {
      accessorCalls++;
      return values.clone();
    }
  }
  private record Empty() { }
  private record EmptyTwin() { }
  private record Floating(float single, double wide) { }
  private record Refs(Object value) { }
  private record OtherRefs(Object value) { }
  private record Arrays(int[] ints, Object[] refs, Object[][] matrix) { }
  private record FloatText(float value) { }
  private record DoubleText(double value) { }
  private record ExplicitMethods(int value) {
    public boolean equals(Object other) {
      return other instanceof ExplicitMethods && value == ((ExplicitMethods) other).value;
    }
    public int hashCode() { return value; }
    public String toString() { return "explicit-record-method"; }
  }

  private static final class Value {
    private final int value;
    private final int failures;
    Value(int value, int failures) { this.value = value; this.failures = failures; }
    public boolean equals(Object other) {
      equalsCalls++;
      if ((failures & 1) != 0) throw EQUALS_FAILURE;
      return other instanceof Value && value == ((Value) other).value;
    }
    public int hashCode() {
      hashCalls++;
      if ((failures & 2) != 0) throw HASH_FAILURE;
      return value * 17;
    }
    public String toString() {
      textCalls++;
      if ((failures & 4) != 0) throw TEXT_FAILURE;
      return new StringBuilder("component-token-").append(value).toString();
    }
  }

  private static Scalars scalars(int changed) {
    return new Scalars(changed != 0, (byte) (changed == 1 ? -8 : -7),
      changed == 2 ? 'R' : 'Q', (short) (changed == 3 ? -322 : -321),
      changed == 4 ? 1234568 : 1234567, changed == 5 ? Long.MIN_VALUE + 92 : Long.MIN_VALUE + 91,
      changed == 6 ? 2.5f : 1.5f, changed == 7 ? -3.25d : -2.25d);
  }
  private static int scalarMask(Scalars value) {
    int mask = 0;
    if (value.flag()) mask |= 1;
    if (value.byteValue() == -7) mask |= 2;
    if (value.charValue() == 'Q') mask |= 4;
    if (value.shortValue() == -321) mask |= 8;
    if (value.intValue() == 1234567) mask |= 16;
    if (value.longValue() == Long.MIN_VALUE + 91) mask |= 32;
    if (Float.floatToRawIntBits(value.floatValue()) == 0x3fc00000) mask |= 64;
    if (Double.doubleToRawLongBits(value.doubleValue()) == 0xc002000000000000L) mask |= 128;
    return mask;
  }

  public static void caseCtorImplicit() {
    begin("record-ctor-implicit");
    numbers("fields", scalarMask(scalars(-1)));
  }
  public static void caseCtorMixedWide() {
    begin("record-ctor-mixed-wide");
    Object token = new Object();
    Wide value = new Wide(0x0102030405060708L, 91, -0.0d, token,
      -0x0102030405060708L, 1.5f, Double.longBitsToDouble(1L));
    flags("fields", value.first() == 0x0102030405060708L, value.marker() == 91,
      Double.doubleToRawLongBits(value.middle()) == Long.MIN_VALUE, value.token() == token,
      value.second() == -0x0102030405060708L, Float.floatToRawIntBits(value.small()) == 0x3fc00000,
      Double.doubleToRawLongBits(value.last()) == 1L);
  }
  public static void caseCtorExplicit() {
    begin("record-ctor-explicit");
    Explicit value = new Explicit(5, 9L, null);
    numbers("fields", value.left(), value.right());
    flags("label", value.label().equals("unnamed"));
  }
  public static void caseCtorCompact() {
    begin("record-ctor-compact");
    Compact value = new Compact(9, 2, null);
    numbers("fields", value.low(), value.high());
    flags("label", value.label().equals("normalized"));
  }
  public static void caseCtorCompactThrow() {
    begin("record-ctor-compact-throw");
    constructorEffects = 0;
    Checked failed = null;
    Throwable caught = null;
    try { failed = new Checked(-1); } catch (Throwable failure) { caught = failure; }
    Checked valid = new Checked(4);
    flags("outcome", caught == CONSTRUCTOR_FAILURE, failed == null, valid.value() == 4);
    numbers("effects", constructorEffects);
  }
  public static void caseCtorAuxiliary() {
    begin("record-ctor-auxiliary");
    constructorEffects = 0;
    Auxiliary value = new Auxiliary();
    numbers("order", constructorEffects);
    flags("fields", value.value() == 7, value.label().equals("auxiliary"));
  }
  public static void caseCtorAuxiliaryThrow() {
    begin("record-ctor-auxiliary-throw");
    constructorEffects = 0;
    Throwable caught = null;
    try { new AuxChecked(); } catch (Throwable failure) { caught = failure; }
    flags("identity", caught == CONSTRUCTOR_FAILURE);
    numbers("effects", constructorEffects);
  }
  public static void caseCtorVarargsPacked() {
    begin("record-ctor-varargs-packed");
    Varargs empty = new Varargs("empty");
    Varargs packed = new Varargs("packed", 3, 4);
    numbers("values", empty.values().length, packed.values().length,
      packed.values()[0], packed.values()[1]);
    flags("labels", empty.label().equals("empty"), packed.label().equals("packed"));
  }
  public static void caseCtorVarargsAlias() {
    begin("record-ctor-varargs-alias");
    int[] input = { 3, 4 };
    Varargs value = new Varargs("alias", input);
    input[0] = 9;
    Varargs nullable = new Varargs("null", (int[]) null);
    flags("alias", value.values() == input, value.values()[0] == 9, nullable.values() == null);
  }
  public static void caseCtorVarargsCompact() {
    begin("record-ctor-varargs-compact");
    long[] input = { Long.MIN_VALUE, 4294967298L };
    CompactVarargs value = new CompactVarargs(input);
    input[0] = 0L;
    CompactVarargs packed = new CompactVarargs(7L, 9L);
    flags("copy", value.values() != input, value.values()[0] == Long.MIN_VALUE,
      value.values()[1] == 4294967298L, packed.values()[0] == 7L, packed.values()[1] == 9L);
  }

  public static void caseAccessorsAll() {
    begin("record-accessors-all");
    numbers("returns", scalarMask(scalars(-1)));
  }
  public static void caseAccessorCustom() {
    begin("record-accessor-custom");
    CustomAccessor first = new CustomAccessor("field-token");
    CustomAccessor different = new CustomAccessor("other-field-token");
    accessorCalls = 0;
    flags("direct", first.value().equals("accessor-token"));
    numbers("direct-calls", accessorCalls);
    accessorCalls = 0;
    boolean equal = first.equals(new CustomAccessor("field-token"));
    boolean unequal = !first.equals(different);
    boolean equalHash = first.hashCode() == new CustomAccessor("field-token").hashCode();
    String text = first.toString();
    flags("fields", equal, unequal, equalHash, mentions(text, "field-token"), !text.contains("accessor-token"));
    numbers("implicit-accessor-calls", accessorCalls);
  }
  public static void caseAccessorThrowing() {
    begin("record-accessor-throwing");
    ThrowingAccessor value = new ThrowingAccessor("stored-token");
    accessorCalls = 0;
    Throwable caught = null;
    try { value.value(); } catch (Throwable failure) { caught = failure; }
    flags("direct", caught == ACCESSOR_FAILURE);
    numbers("direct-calls", accessorCalls);
    accessorCalls = 0;
    flags("fields", value.equals(new ThrowingAccessor("stored-token")),
      value.hashCode() == new ThrowingAccessor("stored-token").hashCode(),
      mentions(value.toString(), "stored-token"));
    numbers("implicit-accessor-calls", accessorCalls);
  }
  public static void caseAccessorDefensive() {
    begin("record-accessor-defensive");
    int[] input = { 7, 9 };
    Defensive value = new Defensive(input);
    accessorCalls = 0;
    int[] copy = value.values();
    copy[0] = -1;
    flags("copy", copy != input, input[0] == 7, copy[1] == 9);
    numbers("direct-calls", accessorCalls);
    accessorCalls = 0;
    flags("fields", value.equals(new Defensive(input)), value.hashCode() == new Defensive(input).hashCode());
    numbers("implicit-accessor-calls", accessorCalls);
  }

  public static void caseEqualsExactClass() {
    begin("record-equals-exact-class");
    Empty empty = new Empty();
    Refs value = new Refs("same");
    flags("equal", empty.equals(empty), empty.equals(new Empty()), empty.equals(null),
      empty.equals(new Object()), empty.equals(new EmptyTwin()), value.equals(new OtherRefs("same")));
  }
  public static void caseEqualsAllPrimitives() {
    begin("record-equals-all-primitives");
    Scalars value = scalars(-1);
    int differences = 0;
    for (int component = 0; component < 8; component++) {
      if (!value.equals(scalars(component))) differences |= 1 << component;
    }
    flags("same", value.equals(scalars(-1)));
    numbers("different", differences);
  }
  public static void caseEqualsFloatNan() {
    begin("record-equals-float-nan");
    Floating first = new Floating(Float.intBitsToFloat(0x7fc00001), 2.0d);
    Floating second = new Floating(Float.intBitsToFloat(0x7fe01234), 2.0d);
    flags("nan", first.equals(second), second.equals(first), first.hashCode() == second.hashCode());
  }
  public static void caseEqualsDoubleNan() {
    begin("record-equals-double-nan");
    Floating first = new Floating(2.0f, Double.longBitsToDouble(0x7ff8000000000001L));
    Floating second = new Floating(2.0f, Double.longBitsToDouble(0x7fffffffffffffffL));
    flags("nan", first.equals(second), second.equals(first), first.hashCode() == second.hashCode());
  }
  public static void caseEqualsFloatZero() {
    begin("record-equals-float-zero");
    Floating positive = new Floating(0.0f, 1.0d);
    Floating negative = new Floating(-0.0f, 1.0d);
    flags("zero", positive.equals(negative), negative.equals(positive),
      negative.equals(new Floating(-0.0f, 1.0d)));
  }
  public static void caseEqualsDoubleZero() {
    begin("record-equals-double-zero");
    Floating positive = new Floating(1.0f, 0.0d);
    Floating negative = new Floating(1.0f, -0.0d);
    flags("zero", positive.equals(negative), negative.equals(positive),
      negative.equals(new Floating(1.0f, -0.0d)));
  }
  public static void caseEqualsInfinity() {
    begin("record-equals-infinity");
    Floating value = new Floating(Float.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY);
    flags("infinity", value.equals(new Floating(Float.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY)),
      value.equals(new Floating(Float.NEGATIVE_INFINITY, Double.NEGATIVE_INFINITY)),
      value.equals(new Floating(Float.POSITIVE_INFINITY, Double.POSITIVE_INFINITY)));
  }
  public static void caseEqualsNull() {
    begin("record-equals-null");
    Refs nullable = new Refs(null);
    Refs present = new Refs("value");
    flags("null", nullable.equals(new Refs(null)), nullable.equals(present), present.equals(nullable));
  }
  public static void caseEqualsReferenceValue() {
    begin("record-equals-reference-value");
    equalsCalls = 0;
    Refs value = new Refs(new Value(7, 0));
    flags("value", value.equals(new Refs(new Value(7, 0))),
      value.equals(new Refs(new Value(9, 0))), equalsCalls > 0);
  }
  public static void caseEqualsPrimitiveArray() {
    begin("record-equals-primitive-array");
    int[] input = { 7, 9 };
    Arrays value = new Arrays(input, null, null);
    flags("identity", value.equals(new Arrays(input, null, null)),
      value.equals(new Arrays(new int[] { 7, 9 }, null, null)));
    input[0] = -1;
    flags("mutation", value.equals(new Arrays(input, null, null)));
  }
  public static void caseEqualsReferenceArray() {
    begin("record-equals-reference-array");
    Object[] row = { "same" };
    Object[][] matrix = { row };
    Arrays value = new Arrays(null, row, matrix);
    flags("identity", value.equals(new Arrays(null, row, matrix)),
      value.equals(new Arrays(null, new Object[] { "same" }, matrix)),
      value.equals(new Arrays(null, row, new Object[][] { row })));
  }
  public static void caseEqualsComponentThrow() {
    begin("record-equals-component-throw");
    equalsCalls = 0;
    Throwable caught = null;
    try { new Refs(new Value(7, 1)).equals(new Refs(new Value(7, 0))); }
    catch (Throwable failure) { caught = failure; }
    flags("throw", caught == EQUALS_FAILURE, equalsCalls > 0);
  }

  public static void caseHashEqual() {
    begin("record-hash-equal");
    Scalars first = scalars(-1);
    Scalars second = scalars(-1);
    int hash = first.hashCode();
    flags("consistent", hash == second.hashCode(), hash == first.hashCode());
  }
  public static void caseHashNull() {
    begin("record-hash-null");
    Refs value = new Refs(null);
    int hash = value.hashCode();
    flags("consistent", hash == new Refs(null).hashCode(), hash == value.hashCode(),
      new Empty().hashCode() == new Empty().hashCode());
  }
  public static void caseHashArrayIdentity() {
    begin("record-hash-array-identity");
    int[] ints = { 7 };
    Object[] refs = { "before" };
    Object[][] matrix = { refs };
    Arrays first = new Arrays(ints, refs, matrix);
    Arrays second = new Arrays(ints, refs, matrix);
    int hash = first.hashCode();
    boolean same = hash == second.hashCode();
    ints[0] = -9;
    refs[0] = "after";
    matrix[0] = new Object[0];
    flags("identity", same, hash == first.hashCode(), hash == second.hashCode());
  }
  public static void caseHashComponentDispatch() {
    begin("record-hash-component-dispatch");
    hashCalls = 0;
    Refs first = new Refs(new Value(7, 0));
    int hash = first.hashCode();
    flags("dispatch", hashCalls > 0, hash == new Refs(new Value(7, 0)).hashCode());
  }
  public static void caseHashComponentThrow() {
    begin("record-hash-component-throw");
    hashCalls = 0;
    Throwable caught = null;
    try { new Refs(new Value(7, 2)).hashCode(); } catch (Throwable failure) { caught = failure; }
    flags("throw", caught == HASH_FAILURE, hashCalls > 0);
  }

  public static void caseStringPrimitives() {
    begin("record-string-primitives");
    String text = scalars(-1).toString();
    flags("content", mentions(text, "Scalars", "flag", "byteValue", "charValue", "shortValue",
      "intValue", "longValue", "floatValue", "doubleValue"),
      mentions(text, "true", "-7", "Q", "-321", "1234567", Long.toString(Long.MIN_VALUE + 91),
        Float.toString(1.5f), Double.toString(-2.25d)));
  }
  public static void caseStringFloating() {
    begin("record-string-floating");
    float[] singles = { 1.0e20f, Float.MIN_VALUE, Float.NaN, Float.POSITIVE_INFINITY,
      Float.NEGATIVE_INFINITY, 0.0f, -0.0f, Float.MAX_VALUE };
    double[] wides = { 1.0e20d, Double.MIN_VALUE, Double.NaN, Double.POSITIVE_INFINITY,
      Double.NEGATIVE_INFINITY, 0.0d, -0.0d, Double.MAX_VALUE };
    int singleMask = 0;
    int wideMask = 0;
    int boxedSingleMask = 0;
    int boxedWideMask = 0;
    for (int i = 0; i < singles.length; i++) {
      if (mentions(new FloatText(singles[i]).toString(), "FloatText", "value", Float.toString(singles[i]))) {
        singleMask |= 1 << i;
      }
      if (mentions(new DoubleText(wides[i]).toString(), "DoubleText", "value", Double.toString(wides[i]))) {
        wideMask |= 1 << i;
      }
      if (mentions(new Refs(Float.valueOf(singles[i])).toString(), "Refs", "value", Float.toString(singles[i]))) {
        boxedSingleMask |= 1 << i;
      }
      if (mentions(new Refs(Double.valueOf(wides[i])).toString(), "Refs", "value", Double.toString(wides[i]))) {
        boxedWideMask |= 1 << i;
      }
    }
    numbers("wrapper-content", singleMask, wideMask, boxedSingleMask, boxedWideMask);
  }
  public static void caseStringNull() {
    begin("record-string-null");
    flags("content", mentions(new Refs(null).toString(), "Refs", "value", "null"));
  }
  public static void caseStringReferenceDispatch() {
    begin("record-string-reference-dispatch");
    textCalls = 0;
    String text = new Refs(new Value(7, 0)).toString();
    flags("dispatch", mentions(text, "Refs", "value", "component-token-7"), textCalls > 0);
  }
  public static void caseStringArrayIdentity() {
    begin("record-string-array-identity");
    int[] ints = { 7 };
    Object[] refs = { "same" };
    Object[][] matrix = { refs };
    String text = new Arrays(ints, refs, matrix).toString();
    flags("content", mentions(text, "Arrays", "ints", "refs", "matrix"),
      mentions(text, ints.toString(), refs.toString(), matrix.toString()));
  }
  public static void caseStringComponentThrow() {
    begin("record-string-component-throw");
    textCalls = 0;
    Throwable caught = null;
    try { new Refs(new Value(7, 4)).toString(); } catch (Throwable failure) { caught = failure; }
    flags("throw", caught == TEXT_FAILURE, textCalls > 0);
  }
  public static void caseStringEmptyAndEqual() {
    begin("record-string-empty-and-equal");
    String empty = new Empty().toString();
    Refs first = new Refs(new Value(7, 0));
    Refs second = new Refs(new Value(7, 0));
    flags("consistent", mentions(empty, "Empty"), empty.equals(new Empty().toString()),
      first.equals(second), first.toString().equals(second.toString()));
  }

  public static void caseExplicitObjectMethods() {
    begin("record-explicit-object-methods");
    ExplicitMethods value = new ExplicitMethods(7);
    flags("custom", value.equals(new ExplicitMethods(7)), !value.equals(new ExplicitMethods(9)),
      value.hashCode() == new ExplicitMethods(7).hashCode(), value.toString().equals("explicit-record-method"));
  }
  public static void caseCopyInvariant() {
    begin("record-copy-invariant");
    Scalars first = scalars(-1);
    Scalars copy = new Scalars(first.flag(), first.byteValue(), first.charValue(), first.shortValue(),
      first.intValue(), first.longValue(), first.floatValue(), first.doubleValue());
    flags("copy", first != copy, first.equals(copy), first.hashCode() == copy.hashCode());
  }

  public static void main(String[] args) {
    caseCtorImplicit();
    caseCtorMixedWide();
    caseCtorExplicit();
    caseCtorCompact();
    caseCtorCompactThrow();
    caseCtorAuxiliary();
    caseCtorAuxiliaryThrow();
    caseCtorVarargsPacked();
    caseCtorVarargsAlias();
    caseCtorVarargsCompact();
    caseAccessorsAll();
    caseAccessorCustom();
    caseAccessorThrowing();
    caseAccessorDefensive();
    caseEqualsExactClass();
    caseEqualsAllPrimitives();
    caseEqualsFloatNan();
    caseEqualsDoubleNan();
    caseEqualsFloatZero();
    caseEqualsDoubleZero();
    caseEqualsInfinity();
    caseEqualsNull();
    caseEqualsReferenceValue();
    caseEqualsPrimitiveArray();
    caseEqualsReferenceArray();
    caseEqualsComponentThrow();
    caseHashEqual();
    caseHashNull();
    caseHashArrayIdentity();
    caseHashComponentDispatch();
    caseHashComponentThrow();
    caseStringPrimitives();
    caseStringFloating();
    caseStringNull();
    caseStringReferenceDispatch();
    caseStringArrayIdentity();
    caseStringComponentThrow();
    caseStringEmptyAndEqual();
    caseExplicitObjectMethods();
    caseCopyInvariant();
    System.out.println("RECORD_SEMANTICS_OK");
  }
}
