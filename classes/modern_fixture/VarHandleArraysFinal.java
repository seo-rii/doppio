package classes.modern_test;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.VarHandle;
import java.lang.invoke.WrongMethodTypeException;

/** C3: genuine single-thread array access-mode calls, not a memory-order test. */
public final class VarHandleArraysFinal {
  private static final Object FIRST = new Object();
  private static final Object SECOND = new Object();
  private static final long WIDE = 9007199254740993L;

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("array VarHandle invariant");
  }

  private static void emit(String id, String event) {
    System.out.println(new StringBuilder().append(id).append('=').append(event).toString());
  }

  private static void failure(String id, String stage, Throwable error) {
    emit(id, new StringBuilder().append(stage).append(':').append(error.getClass().getName())
        .append(";storage=unchanged").toString());
  }

  private static VarHandle array(Class<?> arrayClass) {
    return MethodHandles.arrayElementVarHandle(arrayClass);
  }

  private static void unchanged(int[] values) {
    check(values[0] == 17 && values[1] == 9 && values[2] == 23);
  }

  private static void unsupported(VarHandle handle, VarHandle.AccessMode... modes) {
    for (VarHandle.AccessMode mode : modes) check(!handle.isAccessModeSupported(mode));
  }

  private static void caseIntReadWriteModes() {
    VarHandle handle = array(int[].class);
    int[] values = {17, 9, 23};
    check(handle.varType() == int.class);
    check(handle.coordinateTypes().size() == 2);
    check(handle.coordinateTypes().get(0) == int[].class);
    check(handle.coordinateTypes().get(1) == int.class);
    handle.set(values, 1, 10);
    check((int) handle.get(values, 1) == 10);
    handle.setOpaque(values, 1, 11);
    check((int) handle.getOpaque(values, 1) == 11);
    handle.setRelease(values, 1, 12);
    check((int) handle.getAcquire(values, 1) == 12);
    handle.setVolatile(values, 1, 13);
    check((int) handle.getVolatile(values, 1) == 13);
    check(values[0] == 17 && values[1] == 13 && values[2] == 23);
    emit("vh-array-int-read-write-modes",
        "coordinates=int[]/int;variable=int;plain/opaque/acquire-release/volatile=10/11/12/13;neighbors=unchanged;ordering=unclaimed");
  }

  private static void caseLongAddOverflow() {
    VarHandle handle = array(long[].class);
    long[] values = {17L, WIDE, 23L};
    check((long) handle.getAndAdd(values, 1, 3L) == WIDE);
    check(values[1] == 9007199254740996L);
    handle.set(values, 1, Long.MAX_VALUE);
    check((long) handle.getAndAddAcquire(values, 1, 1L) == Long.MAX_VALUE);
    check(values[1] == Long.MIN_VALUE);
    check((long) handle.getAndAddRelease(values, 1, -1L) == Long.MIN_VALUE);
    check(values[0] == 17L && values[1] == Long.MAX_VALUE && values[2] == 23L);
    emit("vh-array-long-add-overflow",
        "wide-old=9007199254740993;wide-new=9007199254740996;max+1=min;min-1=max;neighbors=unchanged");
  }

  private static void caseNarrowAddWrap() {
    VarHandle bytes = array(byte[].class);
    VarHandle shorts = array(short[].class);
    VarHandle chars = array(char[].class);
    byte[] b = {17, Byte.MAX_VALUE, 23};
    short[] s = {17, Short.MAX_VALUE, 23};
    char[] c = {17, Character.MAX_VALUE, 23};
    check((byte) bytes.getAndAdd(b, 1, (byte) 1) == Byte.MAX_VALUE);
    check((short) shorts.getAndAddAcquire(s, 1, (short) 1) == Short.MAX_VALUE);
    check((char) chars.getAndAddRelease(c, 1, (char) 1) == Character.MAX_VALUE);
    check(b[0] == 17 && b[1] == Byte.MIN_VALUE && b[2] == 23);
    check(s[0] == 17 && s[1] == Short.MIN_VALUE && s[2] == 23);
    check(c[0] == 17 && c[1] == 0 && c[2] == 23);
    emit("vh-array-narrow-add-wrap", "byte=127/-128;short=32767/-32768;char=65535/0;neighbors=unchanged");
  }

  private static void caseBooleanBitwise() {
    VarHandle handle = array(boolean[].class);
    boolean[] values = {true, false, false};
    check(!(boolean) handle.getAndBitwiseOr(values, 1, true));
    check(values[1]);
    check((boolean) handle.getAndBitwiseAndAcquire(values, 1, false));
    check(!values[1]);
    check(!(boolean) handle.getAndBitwiseXorRelease(values, 1, true));
    check(values[0] && values[1] && !values[2]);
    emit("vh-array-boolean-bitwise", "or=false/true;and=true/false;xor=false/true;neighbors=unchanged");
  }

  private static void caseIntegralBitwiseWide() {
    VarHandle ints = array(int[].class);
    VarHandle longs = array(long[].class);
    VarHandle bytes = array(byte[].class);
    VarHandle shorts = array(short[].class);
    VarHandle chars = array(char[].class);
    int[] i = {17, 0x40000001, 23};
    long[] l = {17L, WIDE, 23L};
    byte[] b = {17, 1, 23};
    short[] s = {17, -1, 23};
    char[] c = {17, 0x8001, 23};
    check((int) ints.getAndBitwiseOr(i, 1, Integer.MIN_VALUE) == 0x40000001);
    check((int) ints.getAndBitwiseAndAcquire(i, 1, Integer.MAX_VALUE) == 0xc0000001);
    check((int) ints.getAndBitwiseXorRelease(i, 1, 1) == 0x40000001);
    check((long) longs.getAndBitwiseOr(l, 1, Long.MIN_VALUE) == WIDE);
    check((long) longs.getAndBitwiseAndAcquire(l, 1, Long.MAX_VALUE) == (WIDE | Long.MIN_VALUE));
    check((long) longs.getAndBitwiseXorRelease(l, 1, 1L) == WIDE);
    check((byte) bytes.getAndBitwiseOr(b, 1, (byte) 0x80) == 1);
    check((short) shorts.getAndBitwiseAnd(s, 1, (short) 0x8000) == -1);
    check((char) chars.getAndBitwiseXor(c, 1, (char) 0xffff) == 0x8001);
    check(i[0] == 17 && i[1] == 0x40000000 && i[2] == 23);
    check(l[0] == 17L && l[1] == 9007199254740992L && l[2] == 23L);
    check(b[0] == 17 && b[1] == -127 && b[2] == 23);
    check(s[0] == 17 && s[1] == Short.MIN_VALUE && s[2] == 23);
    check(c[0] == 17 && c[1] == 0x7ffe && c[2] == 23);
    emit("vh-array-integral-bitwise-wide",
        "int-or/and/xor=wrapped;long=9007199254740992;byte=-127;short=-32768;char=32766;neighbors=unchanged");
  }

  private static void caseFloatRawComparison() {
    VarHandle handle = array(float[].class);
    float[] values = {17f, -0.0f, 23f};
    check(!(boolean) handle.compareAndSet(values, 1, +0.0f, 1f));
    check(Float.floatToRawIntBits(values[1]) == 0x80000000);
    float witness = (float) handle.compareAndExchange(values, 1, -0.0f, +0.0f);
    check(Float.floatToRawIntBits(witness) == 0x80000000);
    check(Float.floatToRawIntBits(values[1]) == 0);
    float quietNaN = Float.intBitsToFloat(0x7fc00000);
    handle.set(values, 1, quietNaN);
    check((boolean) handle.compareAndSet(values, 1, quietNaN, 3f));
    check((float) handle.compareAndExchangeRelease(values, 1, 4f, 5f) == 3f);
    check(values[1] == 3f);
    handle.set(values, 1, 16777216f);
    check((float) handle.getAndAddAcquire(values, 1, 1f) == 16777216f);
    check(values[0] == 17f && values[1] == 16777216f && values[2] == 23f);
    emit("vh-array-float-raw-comparison",
        "signed-zero=distinct;exchange-witness=negative-zero;quiet-NaN-same-bits=matches;failed-exchange=unchanged;add=binary32-rounded;neighbors=unchanged");
  }

  private static void caseDoubleRawComparison() {
    VarHandle handle = array(double[].class);
    double[] values = {17d, -0.0d, 23d};
    check(!(boolean) handle.compareAndSet(values, 1, +0.0d, 1d));
    check(Double.doubleToRawLongBits(values[1]) == Long.MIN_VALUE);
    double witness = (double) handle.compareAndExchangeAcquire(values, 1, -0.0d, +0.0d);
    check(Double.doubleToRawLongBits(witness) == Long.MIN_VALUE);
    check(Double.doubleToRawLongBits(values[1]) == 0L);
    double quietNaN = Double.longBitsToDouble(0x7ff8000000000000L);
    handle.set(values, 1, quietNaN);
    check((boolean) handle.compareAndSet(values, 1, quietNaN, 2.5d));
    check((double) handle.compareAndExchangeRelease(values, 1, 4d, 5d) == 2.5d);
    check((double) handle.getAndAddRelease(values, 1, 0.5d) == 2.5d);
    check(values[0] == 17d && values[1] == 3d && values[2] == 23d);
    emit("vh-array-double-raw-comparison",
        "signed-zero=distinct;exchange-witness=negative-zero;quiet-NaN-same-bits=matches;failed-exchange=unchanged;add=2.5/3.0;neighbors=unchanged");
  }

  private static void caseReferenceCasExchange() {
    VarHandle handle = array(Object[].class);
    Object first = new String("equal");
    Object equal = new String("equal");
    Object[] values = {FIRST, first, SECOND};
    check(first != equal && first.equals(equal));
    check(!(boolean) handle.compareAndSet(values, 1, equal, SECOND));
    check(values[1] == first);
    check((boolean) handle.compareAndSet(values, 1, first, equal));
    check((Object) handle.compareAndExchange(values, 1, equal, (Object) null) == equal);
    check((Object) handle.compareAndExchangeAcquire(values, 1, first, SECOND) == null);
    check(values[1] == null);
    check((boolean) handle.compareAndSet(values, 1, (Object) null, FIRST));
    check(values[0] == FIRST && values[1] == FIRST && values[2] == SECOND);
    emit("vh-array-reference-cas-exchange",
        "equal-not-identical=does-not-match;identity=matches;null-exchange=exact;failed-exchange=witness-null;neighbors=unchanged");
  }

  private static void caseGetSetWitness() {
    VarHandle ints = array(int[].class);
    VarHandle longs = array(long[].class);
    VarHandle references = array(Object[].class);
    int[] i = {17, 9, 23};
    long[] l = {17L, WIDE, 23L};
    Object[] o = {FIRST, FIRST, SECOND};
    check((int) ints.getAndSet(i, 1, 10) == 9);
    check((long) longs.getAndSetAcquire(l, 1, Long.MIN_VALUE) == WIDE);
    check((Object) references.getAndSetRelease(o, 1, (Object) null) == FIRST);
    check(i[0] == 17 && i[1] == 10 && i[2] == 23);
    check(l[0] == 17L && l[1] == Long.MIN_VALUE && l[2] == 23L);
    check(o[0] == FIRST && o[1] == null && o[2] == SECOND);
    emit("vh-array-get-set-witness", "int-old/new=9/10;long-old=9007199254740993/new=min;reference-old=same/new=null;neighbors=unchanged");
  }

  private static void caseWeakCasSafeOutcomes() {
    VarHandle handle = array(int[].class);
    int[] values = {17, 0, 23};
    for (int attempt = 0; attempt < 8; attempt++) {
      boolean changed = (boolean) handle.weakCompareAndSet(values, 1, 0, 1);
      check(values[1] == (changed ? 1 : 0));
      if (changed) break;
    }
    int previous = values[1];
    check(previous == 0 || previous == 1);
    check(!(boolean) handle.weakCompareAndSet(values, 1, 2, 3) && values[1] == previous);
    values[1] = 0;
    for (int attempt = 0; attempt < 8; attempt++) {
      boolean changed = (boolean) handle.weakCompareAndSetPlain(values, 1, 0, 1);
      check(values[1] == (changed ? 1 : 0));
      if (changed) break;
    }
    previous = values[1];
    check(!(boolean) handle.weakCompareAndSetPlain(values, 1, 2, 3) && values[1] == previous);
    values[1] = 0;
    for (int attempt = 0; attempt < 8; attempt++) {
      boolean changed = (boolean) handle.weakCompareAndSetAcquire(values, 1, 0, 1);
      check(values[1] == (changed ? 1 : 0));
      if (changed) break;
    }
    previous = values[1];
    check(!(boolean) handle.weakCompareAndSetAcquire(values, 1, 2, 3) && values[1] == previous);
    values[1] = 0;
    for (int attempt = 0; attempt < 8; attempt++) {
      boolean changed = (boolean) handle.weakCompareAndSetRelease(values, 1, 0, 1);
      check(values[1] == (changed ? 1 : 0));
      if (changed) break;
    }
    previous = values[1];
    check(!(boolean) handle.weakCompareAndSetRelease(values, 1, 2, 3) && values[1] == previous);
    check(values[0] == 17 && values[2] == 23);
    emit("vh-array-weak-cas-safe-outcomes",
        "four-modes=return/write-consistent;wrong-expected=false;spurious-or-success=accepted;neighbors=unchanged;progress=unclaimed");
  }

  private static void caseNullBoundsBeforeUpdate() {
    String id = "vh-array-null-bounds-before-update";
    VarHandle handle = array(int[].class);
    int[] values = {17, 9, 23};
    try {
      handle.set((int[]) null, 0, 13);
      throw new AssertionError("null set accepted");
    } catch (NullPointerException error) {
      unchanged(values); failure(id, "null-set", error);
    }
    try {
      int ignored = (int) handle.get((int[]) null, 0);
      throw new AssertionError("null get accepted");
    } catch (NullPointerException error) {
      unchanged(values); failure(id, "null-get", error);
    }
    try {
      boolean ignored = (boolean) handle.compareAndSet(values, -1, 9, 13);
      throw new AssertionError("negative index accepted");
    } catch (ArrayIndexOutOfBoundsException error) {
      unchanged(values); failure(id, "negative-cas", error);
    }
    try {
      int ignored = (int) handle.compareAndExchange(values, 3, 9, 13);
      throw new AssertionError("upper index accepted");
    } catch (ArrayIndexOutOfBoundsException error) {
      unchanged(values); failure(id, "upper-exchange", error);
    }
    try {
      int ignored = (int) handle.getAndAdd(values, -1, 3);
      throw new AssertionError("negative add accepted");
    } catch (ArrayIndexOutOfBoundsException error) {
      unchanged(values); failure(id, "negative-add", error);
    }
    try {
      int ignored = (int) handle.getAndSet((int[]) null, 0, 13);
      throw new AssertionError("null exchange accepted");
    } catch (NullPointerException error) {
      unchanged(values); failure(id, "null-get-set", error);
    }
  }

  private static void caseReferenceCovariantStore() {
    String id = "vh-array-reference-covariant-store";
    VarHandle handle = array(Object[].class);
    String left = new String("left");
    String middle = new String("middle");
    String right = new String("right");
    String[] values = {left, middle, right};
    try {
      handle.set(values, 1, FIRST);
      throw new AssertionError("covariant set accepted");
    } catch (ArrayStoreException error) {
      check(values[0] == left && values[1] == middle && values[2] == right);
      failure(id, "set", error);
    }
    try {
      boolean ignored = (boolean) handle.compareAndSet(values, 1, SECOND, FIRST);
      throw new AssertionError("covariant mismatched CAS accepted");
    } catch (ArrayStoreException error) {
      check(values[0] == left && values[1] == middle && values[2] == right);
      failure(id, "mismatched-cas", error);
    }
    try {
      Object ignored = (Object) handle.compareAndExchangeAcquire(values, 1, SECOND, FIRST);
      throw new AssertionError("covariant mismatched exchange accepted");
    } catch (ArrayStoreException error) {
      check(values[0] == left && values[1] == middle && values[2] == right);
      failure(id, "mismatched-exchange", error);
    }
    try {
      Object ignored = (Object) handle.getAndSetRelease(values, 1, FIRST);
      throw new AssertionError("covariant get-set accepted");
    } catch (ArrayStoreException error) {
      check(values[0] == left && values[1] == middle && values[2] == right);
      failure(id, "get-set", error);
    }
    handle.setRelease(values, 1, (Object) right);
    check(values[0] == left && values[1] == right && values[2] == right);
    emit(id, "valid-subtype-store=identity-preserved;neighbors=unchanged");
  }

  private static void caseNestedReferenceElements() {
    VarHandle handle = array(int[][].class);
    int[] first = {1, 2};
    int[] equal = {1, 2};
    int[] second = {3, 4};
    int[][] values = {first, first, second};
    check((int[]) handle.get(values, 1) == first);
    check(!(boolean) handle.compareAndSet(values, 1, equal, second));
    check(values[1] == first);
    check((boolean) handle.compareAndSet(values, 1, first, second));
    check((int[]) handle.compareAndExchangeRelease(values, 1, second, (int[]) null) == second);
    check((int[]) handle.getAndSet(values, 1, first) == null);
    check(values[0] == first && values[1] == first && values[2] == second);
    check(first[0] == 1 && first[1] == 2 && second[0] == 3 && second[1] == 4);
    emit("vh-array-nested-reference-elements",
        "component=int[];get/cas/exchange/get-set=reference-identity;equal-elements-not-identity=does-not-match;inner/outer-neighbors=unchanged");
  }

  private static void caseUnsupportedUpdateTypes() {
    String id = "vh-array-unsupported-update-types";
    VarHandle references = array(Object[].class);
    VarHandle booleans = array(boolean[].class);
    VarHandle floats = array(float[].class);
    VarHandle doubles = array(double[].class);
    Object[] o = {FIRST, FIRST, SECOND};
    boolean[] b = {true, false, true};
    float[] f = {17f, -0.0f, 23f};
    double[] d = {17d, -0.0d, 23d};
    unsupported(references, VarHandle.AccessMode.GET_AND_ADD,
        VarHandle.AccessMode.GET_AND_ADD_ACQUIRE, VarHandle.AccessMode.GET_AND_ADD_RELEASE);
    unsupported(booleans, VarHandle.AccessMode.GET_AND_ADD,
        VarHandle.AccessMode.GET_AND_ADD_ACQUIRE, VarHandle.AccessMode.GET_AND_ADD_RELEASE);
    unsupported(floats, VarHandle.AccessMode.GET_AND_BITWISE_OR, VarHandle.AccessMode.GET_AND_BITWISE_OR_ACQUIRE,
        VarHandle.AccessMode.GET_AND_BITWISE_OR_RELEASE, VarHandle.AccessMode.GET_AND_BITWISE_AND,
        VarHandle.AccessMode.GET_AND_BITWISE_AND_ACQUIRE, VarHandle.AccessMode.GET_AND_BITWISE_AND_RELEASE,
        VarHandle.AccessMode.GET_AND_BITWISE_XOR, VarHandle.AccessMode.GET_AND_BITWISE_XOR_ACQUIRE,
        VarHandle.AccessMode.GET_AND_BITWISE_XOR_RELEASE);
    unsupported(doubles, VarHandle.AccessMode.GET_AND_BITWISE_OR, VarHandle.AccessMode.GET_AND_BITWISE_OR_ACQUIRE,
        VarHandle.AccessMode.GET_AND_BITWISE_OR_RELEASE, VarHandle.AccessMode.GET_AND_BITWISE_AND,
        VarHandle.AccessMode.GET_AND_BITWISE_AND_ACQUIRE, VarHandle.AccessMode.GET_AND_BITWISE_AND_RELEASE,
        VarHandle.AccessMode.GET_AND_BITWISE_XOR, VarHandle.AccessMode.GET_AND_BITWISE_XOR_ACQUIRE,
        VarHandle.AccessMode.GET_AND_BITWISE_XOR_RELEASE);
    try {
      Object ignored = (Object) references.getAndAdd(o, 1, SECOND);
      throw new AssertionError("reference add accepted");
    } catch (UnsupportedOperationException error) {
      check(o[0] == FIRST && o[1] == FIRST && o[2] == SECOND);
      failure(id, "reference-add", error);
    }
    try {
      boolean ignored = (boolean) booleans.getAndAddAcquire(b, 1, true);
      throw new AssertionError("boolean add accepted");
    } catch (UnsupportedOperationException error) {
      check(b[0] && !b[1] && b[2]); failure(id, "boolean-add", error);
    }
    try {
      float ignored = (float) floats.getAndBitwiseOrRelease(f, 1, 1f);
      throw new AssertionError("float bitwise accepted");
    } catch (UnsupportedOperationException error) {
      check(f[0] == 17f && Float.floatToRawIntBits(f[1]) == Integer.MIN_VALUE && f[2] == 23f);
      failure(id, "float-bitwise", error);
    }
    try {
      double ignored = (double) doubles.getAndBitwiseAnd(d, 1, 1d);
      throw new AssertionError("double bitwise accepted");
    } catch (UnsupportedOperationException error) {
      check(d[0] == 17d && Double.doubleToRawLongBits(d[1]) == Long.MIN_VALUE && d[2] == 23d);
      failure(id, "double-bitwise", error);
    }
    emit(id, "unsupported-queries=24-false;neighbors/raw-zero=unchanged");
  }

  private static void caseFactoryRejections() {
    String id = "vh-array-factory-rejections";
    try {
      array(Object.class);
      throw new AssertionError("nonarray factory accepted");
    } catch (IllegalArgumentException error) {
      failure(id, "nonarray", error);
    }
    try {
      array(int.class);
      throw new AssertionError("primitive factory accepted");
    } catch (IllegalArgumentException error) {
      failure(id, "primitive", error);
    }
    try {
      array(void.class);
      throw new AssertionError("void factory accepted");
    } catch (IllegalArgumentException error) {
      failure(id, "void", error);
    }
    try {
      array(null);
      throw new AssertionError("null factory accepted");
    } catch (NullPointerException error) {
      failure(id, "null", error);
    }
    VarHandle nested = array(int[][].class);
    check(nested.varType() == int[].class);
    check(nested.coordinateTypes().get(0) == int[][].class);
    emit(id, "nested-array=accepted;variable=int[];coordinate=int[][]/int");
  }

  private static void caseCallDescriptorErrors() {
    String id = "vh-array-call-descriptor-errors";
    VarHandle handle = array(int[].class);
    int[] values = {17, 9, 23};
    try {
      String ignored = (String) handle.get(values, 1);
      throw new AssertionError("wrong return accepted");
    } catch (WrongMethodTypeException error) {
      unchanged(values); failure(id, "wrong-return", error);
    }
    try {
      int ignored = (int) handle.get(values);
      throw new AssertionError("missing coordinate accepted");
    } catch (WrongMethodTypeException error) {
      unchanged(values); failure(id, "wrong-arity", error);
    }
    try {
      int ignored = (int) handle.get((Object) new long[] {9L}, 0);
      throw new AssertionError("wrong runtime array accepted");
    } catch (ClassCastException error) {
      unchanged(values); failure(id, "wrong-runtime-array", error);
    }
    try {
      handle.set(values, 1, (Object) "bad");
      throw new AssertionError("wrong boxed value accepted");
    } catch (ClassCastException error) {
      unchanged(values); failure(id, "wrong-box", error);
    }
    try {
      handle.set(values, 1, (Object) null);
      throw new AssertionError("null boxed value accepted");
    } catch (NullPointerException error) {
      unchanged(values); failure(id, "null-box", error);
    }
    try {
      handle.set(values, 1, 1d);
      throw new AssertionError("primitive narrowing accepted");
    } catch (WrongMethodTypeException error) {
      unchanged(values); failure(id, "primitive-narrowing", error);
    }
    VarHandle exact = handle.withInvokeExactBehavior();
    try {
      long ignored = (long) exact.get(values, 1);
      throw new AssertionError("exact widened return accepted");
    } catch (WrongMethodTypeException error) {
      unchanged(values); failure(id, "exact-return", error);
    }
    Object boxed = (Object) handle.get(values, 1);
    check(boxed instanceof Integer && ((Integer) boxed).intValue() == 9);
    handle.set(values, 1, (byte) -2);
    check(values[0] == 17 && values[1] == -2 && values[2] == 23);
    emit(id, "invoke-behavior=boxed-read/primitive-widen-accepted;neighbors=unchanged");
  }

  public static void main(String[] args) {
    caseIntReadWriteModes();
    caseLongAddOverflow();
    caseNarrowAddWrap();
    caseBooleanBitwise();
    caseIntegralBitwiseWide();
    caseFloatRawComparison();
    caseDoubleRawComparison();
    caseReferenceCasExchange();
    caseGetSetWitness();
    caseWeakCasSafeOutcomes();
    caseNullBoundsBeforeUpdate();
    caseReferenceCovariantStore();
    caseNestedReferenceElements();
    caseUnsupportedUpdateTypes();
    caseFactoryRejections();
    caseCallDescriptorErrors();
    System.out.println("VARHANDLE_ARRAYS_OK");
  }
}
