package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.WrongMethodTypeException;

/** C2: genuine fixed-arity collector/spreader calls; no carrier bytecode. */
public final class MethodHandleArraysFinal {
  private static final Object FIRST = new Object();
  private static final Object SECOND = new Object();
  private static final Object TAIL = new Object();
  private static final long WIDE = 9007199254740993L;
  private static final Exception ORIGINAL = new Exception("array target");
  private static int effects;
  private static Object seenArray;
  private static Object seenFirst;
  private static Object seenSecond;
  private static Object seenTail;
  private static long seenLong;
  private static double seenDouble;

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("array adapter invariant");
  }

  private static void reset() {
    effects = 0;
    seenArray = seenFirst = seenSecond = seenTail = null;
    seenLong = 0L;
    seenDouble = 1.0;
  }

  private static void emit(String id, String event) {
    System.out.println(new StringBuilder().append(id).append('=').append(event).toString());
  }

  private static void emitFailure(String id, String stage, Throwable failure) {
    emit(id, new StringBuilder().append(stage).append(':').append(failure.getClass().getName())
        .append(",effects=").append(effects).toString());
  }

  private static MethodHandle handle(String name, MethodType type) throws ReflectiveOperationException {
    return MethodHandles.lookup().findStatic(MethodHandleArraysFinal.class, name, type);
  }

  private static Object[] referenceArray(Object[] values) {
    effects++;
    seenArray = values;
    return values;
  }

  private static Object[] referenceArrayPosition(long prefix, Object[] values, double suffix, Object tail) {
    effects++;
    seenLong = prefix;
    seenArray = values;
    seenDouble = suffix;
    seenTail = tail;
    return values;
  }

  private static int[] intArray(int[] values) {
    effects++;
    seenArray = values;
    return values;
  }

  private static long[] longArrayPosition(double prefix, long[] values, long suffix, Object tail) {
    effects++;
    seenDouble = prefix;
    seenArray = values;
    seenLong = suffix;
    seenTail = tail;
    return values;
  }

  private static double[] doubleArrayPosition(long prefix, double[] values, Object tail) {
    effects++;
    seenLong = prefix;
    seenArray = values;
    seenTail = tail;
    return values;
  }

  private static Object pair(Object first, Object second) {
    effects++;
    seenFirst = first;
    seenSecond = second;
    return first;
  }

  private static Object pairPosition(long prefix, Object first, Object second, double suffix, Object tail) {
    effects++;
    seenLong = prefix;
    seenFirst = first;
    seenSecond = second;
    seenDouble = suffix;
    seenTail = tail;
    return first;
  }

  private static Object zeroPosition(long prefix, Object tail) {
    effects++;
    seenLong = prefix;
    seenTail = tail;
    return tail;
  }

  private static int intPair(int first, int second) {
    effects++;
    check(first == -7 && second == 16777217);
    return second;
  }

  private static Object longPairPosition(double prefix, long first, long second, Object tail) {
    effects++;
    check(first == WIDE && second == Long.MIN_VALUE);
    seenDouble = prefix;
    seenTail = tail;
    return tail;
  }

  private static Object doublePairPosition(long prefix, double first, double second, Object tail) {
    effects++;
    check(Double.doubleToRawLongBits(first) == 0x8000000000000000L);
    check(Double.doubleToRawLongBits(second) == 1L);
    seenLong = prefix;
    seenTail = tail;
    return tail;
  }

  private static Object stringPair(String first, String second) {
    effects++;
    seenFirst = first;
    seenSecond = second;
    return first;
  }

  private static Object throwingArray(Object[] values) throws Exception {
    effects++;
    try {
      seenArray = values;
      throw ORIGINAL;
    } finally {
      effects += 10;
    }
  }

  private static Object throwingPair(Object first, Object second) throws Exception {
    effects++;
    try {
      seenFirst = first;
      seenSecond = second;
      throw ORIGINAL;
    } finally {
      effects += 10;
    }
  }

  private static void caseCollectorReferenceTrailing() throws Throwable {
    reset();
    MethodHandle target = handle("referenceArray", MethodType.methodType(Object[].class, Object[].class));
    MethodHandle collector = target.asCollector(Object[].class, 2);
    check(collector.type().equals(MethodType.methodType(Object[].class, Object.class, Object.class)));
    check(!collector.isVarargsCollector());
    Object[] first = (Object[]) collector.invokeExact(FIRST, SECOND);
    check(first == seenArray && first.length == 2 && first[0] == FIRST && first[1] == SECOND);
    Object[] second = (Object[]) collector.invokeExact(FIRST, SECOND);
    check(second == seenArray && first != second && second[0] == FIRST && second[1] == SECOND);
    check(effects == 2);
    emit("collector-reference-trailing", "type=two-references;fixed=true;arrays=fresh;elements=same;return=target-array;effects=2");
  }

  private static void caseCollectorReferencePositionWide() throws Throwable {
    reset();
    MethodHandle target = handle("referenceArrayPosition",
        MethodType.methodType(Object[].class, long.class, Object[].class, double.class, Object.class));
    MethodHandle collector = target.asCollector(1, Object[].class, 2);
    check(collector.type().equals(MethodType.methodType(Object[].class,
        long.class, Object.class, Object.class, double.class, Object.class)));
    Object[] result = (Object[]) collector.invokeExact(WIDE, FIRST, SECOND, -0.0d, TAIL);
    check(result == seenArray && result[0] == FIRST && result[1] == SECOND);
    check(seenLong == WIDE && seenTail == TAIL && Double.doubleToRawLongBits(seenDouble) == 0x8000000000000000L);
    check(effects == 1);
    emit("collector-reference-position-wide", "position=1;wide-prefix/suffix=exact;elements=same;tail=same;return=target-array;effects=1");
  }

  private static void caseCollectorZeroReference() throws Throwable {
    reset();
    MethodHandle trailing = handle("referenceArray", MethodType.methodType(Object[].class, Object[].class))
        .asCollector(Object[].class, 0);
    Object[] first = (Object[]) trailing.invokeExact();
    check(first != null && first.length == 0 && first == seenArray);
    MethodHandle position = handle("referenceArrayPosition",
        MethodType.methodType(Object[].class, long.class, Object[].class, double.class, Object.class))
        .asCollector(1, Object[].class, 0);
    Object[] second = (Object[]) position.invokeExact(WIDE, -0.0d, TAIL);
    check(second != null && second.length == 0 && second == seenArray);
    check(seenLong == WIDE && seenTail == TAIL && Double.doubleToRawLongBits(seenDouble) == 0x8000000000000000L);
    check(effects == 2);
    emit("collector-zero-reference", "trailing/position=empty-nonnull;wide-routing=exact;empty-array-sharing=unclaimed;effects=2");
  }

  private static void caseCollectorPrimitiveInt() throws Throwable {
    reset();
    MethodHandle collector = handle("intArray", MethodType.methodType(int[].class, int[].class))
        .asCollector(int[].class, 2);
    int[] values = (int[]) collector.invokeExact(-7, 16777217);
    check(values == seenArray && values.length == 2 && values[0] == -7 && values[1] == 16777217);
    check(effects == 1);
    emit("collector-primitive-int", "array=int[];values=-7/16777217;return=target-array;effects=1");
  }

  private static void caseCollectorPrimitiveLongWide() throws Throwable {
    reset();
    MethodHandle collector = handle("longArrayPosition",
        MethodType.methodType(long[].class, double.class, long[].class, long.class, Object.class))
        .asCollector(1, long[].class, 2);
    long[] values = (long[]) collector.invokeExact(-0.0d, WIDE, Long.MIN_VALUE, 0x100000001L, TAIL);
    check(values == seenArray && values.length == 2 && values[0] == WIDE && values[1] == Long.MIN_VALUE);
    check(Double.doubleToRawLongBits(seenDouble) == 0x8000000000000000L && seenLong == 0x100000001L && seenTail == TAIL);
    check(effects == 1);
    emit("collector-primitive-long-wide", "position=1;array=long[];values=9007199254740993/min;wide-prefix/suffix=exact;tail=same;effects=1");
  }

  private static void caseCollectorPrimitiveDoubleWide() throws Throwable {
    reset();
    MethodHandle collector = handle("doubleArrayPosition",
        MethodType.methodType(double[].class, long.class, double[].class, Object.class))
        .asCollector(1, double[].class, 2);
    double[] values = (double[]) collector.invokeExact(WIDE, -0.0d, Double.longBitsToDouble(1L), TAIL);
    check(values == seenArray && values.length == 2 && Double.doubleToRawLongBits(values[0]) == 0x8000000000000000L);
    check(Double.doubleToRawLongBits(values[1]) == 1L && seenLong == WIDE && seenTail == TAIL);
    check(effects == 1);
    emit("collector-primitive-double-wide", "position=1;array=double[];bits=negative-zero/min-subnormal;wide-prefix=exact;tail=same;effects=1");
  }

  private static void caseSpreaderReferenceTrailing() throws Throwable {
    reset();
    MethodHandle spreader = handle("pair", MethodType.methodType(Object.class, Object.class, Object.class))
        .asSpreader(Object[].class, 2);
    Object[] values = {FIRST, SECOND};
    Object returned = (Object) spreader.invokeExact(values);
    check(returned == FIRST && seenFirst == FIRST && seenSecond == SECOND);
    check(values[0] == FIRST && values[1] == SECOND);
    values[0] = SECOND;
    Object next = (Object) spreader.invokeExact(values);
    check(next == SECOND && seenFirst == SECOND && seenSecond == SECOND && effects == 2);
    emit("spreader-reference-trailing", "elements/return=same;source-array=unchanged;later-element-mutation=observed;effects=2");
  }

  private static void caseSpreaderReferencePositionWide() throws Throwable {
    reset();
    MethodHandle spreader = handle("pairPosition",
        MethodType.methodType(Object.class, long.class, Object.class, Object.class, double.class, Object.class))
        .asSpreader(1, Object[].class, 2);
    check(spreader.type().equals(MethodType.methodType(Object.class,
        long.class, Object[].class, double.class, Object.class)));
    Object[] values = {FIRST, SECOND};
    Object result = (Object) spreader.invokeExact(WIDE, values, -0.0d, TAIL);
    check(result == FIRST && seenFirst == FIRST && seenSecond == SECOND && seenTail == TAIL);
    check(seenLong == WIDE && Double.doubleToRawLongBits(seenDouble) == 0x8000000000000000L && effects == 1);
    emit("spreader-reference-position-wide", "position=1;elements/return=same;wide-prefix/suffix=exact;tail=same;effects=1");
  }

  private static void caseSpreaderZeroNull() throws Throwable {
    reset();
    MethodHandle target = handle("zeroPosition", MethodType.methodType(Object.class, long.class, Object.class));
    MethodHandle trailing = target.asSpreader(Object[].class, 0);
    Object a = (Object) trailing.invokeExact(WIDE, TAIL, (Object[]) null);
    Object b = (Object) trailing.invokeExact(WIDE, TAIL, new Object[0]);
    MethodHandle position = target.asSpreader(1, Object[].class, 0);
    Object c = (Object) position.invokeExact(WIDE, (Object[]) null, TAIL);
    Object d = (Object) position.invokeExact(WIDE, new Object[0], TAIL);
    check(a == TAIL && b == TAIL && c == TAIL && d == TAIL && effects == 4);
    check(seenLong == WIDE && seenTail == TAIL);
    emit("spreader-zero-null", "trailing/position=null-or-empty-accepted;wide-routing=exact;return=same;effects=4");
    try {
      Object unused = (Object) position.invokeExact(WIDE, new Object[] {FIRST}, TAIL);
      throw new AssertionError("nonempty zero spreader");
    } catch (IllegalArgumentException expected) {
      emitFailure("spreader-zero-null", "nonempty", expected);
    }
  }

  private static void caseSpreaderPrimitiveInt() throws Throwable {
    reset();
    MethodHandle spreader = handle("intPair", MethodType.methodType(int.class, int.class, int.class))
        .asSpreader(int[].class, 2);
    int[] values = {-7, 16777217};
    int returned = (int) spreader.invokeExact(values);
    check(returned == 16777217 && values[0] == -7 && values[1] == 16777217 && effects == 1);
    emit("spreader-primitive-int", "array=int[];elements=-7/16777217;return=16777217;source-array=unchanged;effects=1");
  }

  private static void caseSpreaderPrimitiveLongDoubleWide() throws Throwable {
    reset();
    MethodHandle longs = handle("longPairPosition",
        MethodType.methodType(Object.class, double.class, long.class, long.class, Object.class))
        .asSpreader(1, long[].class, 2);
    long[] longValues = {WIDE, Long.MIN_VALUE};
    Object a = (Object) longs.invokeExact(-0.0d, longValues, TAIL);
    check(a == TAIL && seenTail == TAIL && Double.doubleToRawLongBits(seenDouble) == 0x8000000000000000L);
    check(longValues[0] == WIDE && longValues[1] == Long.MIN_VALUE);
    MethodHandle doubles = handle("doublePairPosition",
        MethodType.methodType(Object.class, long.class, double.class, double.class, Object.class))
        .asSpreader(1, double[].class, 2);
    double[] doubleValues = {-0.0d, Double.longBitsToDouble(1L)};
    Object b = (Object) doubles.invokeExact(WIDE, doubleValues, TAIL);
    check(b == TAIL && seenLong == WIDE && seenTail == TAIL && effects == 2);
    check(Double.doubleToRawLongBits(doubleValues[0]) == 0x8000000000000000L && Double.doubleToRawLongBits(doubleValues[1]) == 1L);
    emit("spreader-primitive-long-double-wide", "position=1;long[]/double[]=exact;wide-prefix=exact;tail/return=same;source-arrays=unchanged;effects=2");
  }

  private static void caseSpreaderLengthNull() throws Throwable {
    reset();
    MethodHandle spreader = handle("pair", MethodType.methodType(Object.class, Object.class, Object.class))
        .asSpreader(Object[].class, 2);
    try {
      Object unused = (Object) spreader.invokeExact(new Object[1]);
      throw new AssertionError("short spread array");
    } catch (IllegalArgumentException expected) {
      emitFailure("spreader-length-null-before-target", "short", expected);
    }
    try {
      Object unused = (Object) spreader.invokeExact(new Object[3]);
      throw new AssertionError("long spread array");
    } catch (IllegalArgumentException expected) {
      emitFailure("spreader-length-null-before-target", "long", expected);
    }
    try {
      Object unused = (Object) spreader.invokeExact((Object[]) null);
      throw new AssertionError("null spread array");
    } catch (NullPointerException expected) {
      emitFailure("spreader-length-null-before-target", "null", expected);
    }
  }

  private static void caseSpreaderCast() throws Throwable {
    reset();
    MethodHandle spreader = handle("stringPair", MethodType.methodType(Object.class, String.class, String.class))
        .asSpreader(Object[].class, 2);
    try {
      Object unused = (Object) spreader.invokeExact(new Object[] {"first", FIRST});
      throw new AssertionError("wrong reference element");
    } catch (ClassCastException expected) {
      emitFailure("spreader-cast-before-target", "element", expected);
    }
    MethodHandle erased = spreader.asType(MethodType.methodType(Object.class, Object.class));
    try {
      Object unused = (Object) erased.invokeExact((Object) new int[] {1, 2});
      throw new AssertionError("wrong reference array");
    } catch (ClassCastException expected) {
      emitFailure("spreader-cast-before-target", "array", expected);
    }
    Object[] values = {new String("first"), null};
    Object returned = (Object) spreader.invokeExact(values);
    check(returned == values[0] && seenFirst == values[0] && seenSecond == null && effects == 1);
    emit("spreader-cast-before-target", "valid-reference/null=accepted;return=same;effects=1");
  }

  private static void caseTargetThrowableIdentity() throws Throwable {
    reset();
    MethodHandle collector = handle("throwingArray", MethodType.methodType(Object.class, Object[].class))
        .asCollector(Object[].class, 2);
    Throwable caught = null;
    try {
      Object unused = (Object) collector.invokeExact(FIRST, SECOND);
    } catch (Exception actual) {
      caught = actual;
    }
    Object[] collected = (Object[]) seenArray;
    check(caught == ORIGINAL && effects == 11 && collected[0] == FIRST && collected[1] == SECOND);
    emit("arrays-target-throwable-identity", "collector:throwable=original;elements=same;finally=executed;effects=11");
    reset();
    MethodHandle spreader = handle("throwingPair", MethodType.methodType(Object.class, Object.class, Object.class))
        .asSpreader(Object[].class, 2);
    caught = null;
    try {
      Object unused = (Object) spreader.invokeExact(new Object[] {FIRST, SECOND});
    } catch (Exception actual) {
      caught = actual;
    }
    check(caught == ORIGINAL && effects == 11 && seenFirst == FIRST && seenSecond == SECOND);
    emit("arrays-target-throwable-identity", "spreader:throwable=original;elements=same;finally=executed;effects=11");
  }

  private static void caseCollectorFactoryRejections() throws Throwable {
    reset();
    MethodHandle target = handle("referenceArray", MethodType.methodType(Object[].class, Object[].class));
    try { target.asCollector(Object[].class, -1); throw new AssertionError("negative collector length"); }
    catch (IllegalArgumentException expected) { emitFailure("collector-factory-rejections", "negative-length", expected); }
    try { target.asCollector(-1, Object[].class, 1); throw new AssertionError("negative collector position"); }
    catch (IllegalArgumentException expected) { emitFailure("collector-factory-rejections", "negative-position", expected); }
    try { target.asCollector(1, Object[].class, 1); throw new AssertionError("missing collector parameter"); }
    catch (IllegalArgumentException expected) { emitFailure("collector-factory-rejections", "missing-position", expected); }
    try { target.asCollector(Object.class, 1); throw new AssertionError("non-array collector class"); }
    catch (IllegalArgumentException expected) { emitFailure("collector-factory-rejections", "nonarray", expected); }
    try { target.asCollector(int[].class, 1); throw new AssertionError("incompatible collector array"); }
    catch (IllegalArgumentException expected) { emitFailure("collector-factory-rejections", "incompatible-array", expected); }
    try { target.asCollector(null, 1); throw new AssertionError("null collector class"); }
    catch (NullPointerException expected) { emitFailure("collector-factory-rejections", "null-array-class", expected); }
  }

  private static void caseSpreaderFactoryRejections() throws Throwable {
    reset();
    MethodHandle target = handle("intPair", MethodType.methodType(int.class, int.class, int.class));
    try { target.asSpreader(int[].class, -1); throw new AssertionError("negative spreader length"); }
    catch (IllegalArgumentException expected) { emitFailure("spreader-factory-rejections", "negative-length", expected); }
    try { target.asSpreader(-1, int[].class, 1); throw new AssertionError("negative spreader position"); }
    catch (IllegalArgumentException expected) { emitFailure("spreader-factory-rejections", "negative-position", expected); }
    try { target.asSpreader(2, int[].class, 1); throw new AssertionError("missing spreader parameter"); }
    catch (IllegalArgumentException expected) { emitFailure("spreader-factory-rejections", "missing-position", expected); }
    try { target.asSpreader(int[].class, 3); throw new AssertionError("too many spread elements"); }
    catch (IllegalArgumentException expected) { emitFailure("spreader-factory-rejections", "excess-length", expected); }
    try { target.asSpreader(Object.class, 2); throw new AssertionError("non-array spreader class"); }
    catch (IllegalArgumentException expected) { emitFailure("spreader-factory-rejections", "nonarray", expected); }
    try { target.asSpreader(boolean[].class, 2); throw new AssertionError("incompatible spread element"); }
    catch (WrongMethodTypeException expected) { emitFailure("spreader-factory-rejections", "incompatible-elements", expected); }
    try { target.asSpreader(null, 2); throw new AssertionError("null spreader class"); }
    catch (NullPointerException expected) { emitFailure("spreader-factory-rejections", "null-array-class", expected); }
  }

  public static void main(String[] args) throws Throwable {
    caseCollectorReferenceTrailing();
    caseCollectorReferencePositionWide();
    caseCollectorZeroReference();
    caseCollectorPrimitiveInt();
    caseCollectorPrimitiveLongWide();
    caseCollectorPrimitiveDoubleWide();
    caseSpreaderReferenceTrailing();
    caseSpreaderReferencePositionWide();
    caseSpreaderZeroNull();
    caseSpreaderPrimitiveInt();
    caseSpreaderPrimitiveLongDoubleWide();
    caseSpreaderLengthNull();
    caseSpreaderCast();
    caseTargetThrowableIdentity();
    caseCollectorFactoryRejections();
    caseSpreaderFactoryRejections();
    System.out.println("METHODHANDLE_ARRAYS_OK");
  }
}
