package classes.modern_test;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.VarHandle;
import java.lang.invoke.WrongMethodTypeException;

/** C3: genuine field/static signature-polymorphic calls, single-thread values only. */
public final class VarHandleFieldsFinal {
  private static final long WIDE = 9007199254740993L;
  private static int lazyInitializations;
  public static long staticLong;

  public int integer;
  public long wide;
  public byte smallByte;
  public short smallShort;
  public char character;
  public boolean flag;
  public Object reference;
  public float single;
  public double precision;
  public final int finalInt = 16777217;
  private int hidden = 37;

  public static class Base {
    public int inherited = 41;
  }

  public static final class Child extends Base {
  }

  public static final class PrivateOwner {
    private long secret = WIDE;

    private static VarHandle capability() throws ReflectiveOperationException {
      return MethodHandles.lookup().findVarHandle(PrivateOwner.class, "secret", long.class);
    }
  }

  public static final class LazyOwner {
    public static long value = initialValue();

    private static long initialValue() {
      lazyInitializations++;
      return WIDE;
    }
  }

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("field VarHandle invariant");
  }

  private static void emit(String id, String event) {
    System.out.println(new StringBuilder().append(id).append('=').append(event).toString());
  }

  private static VarHandle field(String name, Class<?> type) throws ReflectiveOperationException {
    return MethodHandles.lookup().findVarHandle(VarHandleFieldsFinal.class, name, type);
  }

  private static VarHandle staticField(Class<?> owner, String name, Class<?> type)
      throws ReflectiveOperationException {
    return MethodHandles.lookup().findStaticVarHandle(owner, name, type);
  }

  private static void caseIntReadWriteModes() throws Throwable {
    VarHandle handle = field("integer", int.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    handle.set(owner, -7);
    check((int) handle.get(owner) == -7 && owner.integer == -7);
    handle.setVolatile(owner, 16777217);
    check((int) handle.getVolatile(owner) == 16777217 && owner.integer == 16777217);
    handle.setOpaque(owner, Integer.MIN_VALUE);
    check((int) handle.getOpaque(owner) == Integer.MIN_VALUE && owner.integer == Integer.MIN_VALUE);
    handle.setRelease(owner, Integer.MAX_VALUE);
    check((int) handle.getAcquire(owner) == Integer.MAX_VALUE && owner.integer == Integer.MAX_VALUE);
    emit("vh-field-int-read-write-modes", "reads=4;writes=4;values=-7/16777217/min/max;ordering=unclaimed");
  }

  private static void caseLongAddOverflow() throws Throwable {
    VarHandle handle = field("wide", long.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    owner.wide = WIDE;
    check((long) handle.getAndAdd(owner, 2L) == WIDE && owner.wide == 9007199254740995L);
    owner.wide = Long.MAX_VALUE;
    check((long) handle.getAndAddAcquire(owner, 1L) == Long.MAX_VALUE && owner.wide == Long.MIN_VALUE);
    check((long) handle.getAndAddRelease(owner, -1L) == Long.MIN_VALUE && owner.wide == Long.MAX_VALUE);
    emit("vh-field-long-add-overflow", "forms=3;wide=9007199254740993;max+1=min;min-1=max;witness=old");
  }

  private static void caseNarrowAddWrap() throws Throwable {
    VarHandle bytes = field("smallByte", byte.class);
    VarHandle shorts = field("smallShort", short.class);
    VarHandle chars = field("character", char.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    owner.smallByte = 125;
    check((byte) bytes.getAndAdd(owner, (byte) 3) == 125 && owner.smallByte == Byte.MIN_VALUE);
    check((byte) bytes.getAndAddAcquire(owner, (byte) -1) == Byte.MIN_VALUE && owner.smallByte == Byte.MAX_VALUE);
    check((byte) bytes.getAndAddRelease(owner, (byte) 1) == Byte.MAX_VALUE && owner.smallByte == Byte.MIN_VALUE);
    owner.smallShort = 32766;
    check((short) shorts.getAndAdd(owner, (short) 2) == 32766 && owner.smallShort == Short.MIN_VALUE);
    check((short) shorts.getAndAddAcquire(owner, (short) -1) == Short.MIN_VALUE && owner.smallShort == Short.MAX_VALUE);
    check((short) shorts.getAndAddRelease(owner, (short) 1) == Short.MAX_VALUE && owner.smallShort == Short.MIN_VALUE);
    owner.character = 65534;
    check((char) chars.getAndAdd(owner, (char) 2) == 65534 && owner.character == 0);
    check((char) chars.getAndAddAcquire(owner, (char) 65535) == 0 && owner.character == 65535);
    check((char) chars.getAndAddRelease(owner, (char) 1) == 65535 && owner.character == 0);
    emit("vh-field-narrow-add-wrap", "types=byte/short/char;forms=3-each;signed/unsigned-wrap=exact;witness=old");
  }

  private static void caseBooleanBitwise() throws Throwable {
    VarHandle handle = field("flag", boolean.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    check(!(boolean) handle.getAndBitwiseOr(owner, true) && owner.flag);
    check((boolean) handle.getAndBitwiseOrAcquire(owner, false) && owner.flag);
    check((boolean) handle.getAndBitwiseOrRelease(owner, false) && owner.flag);
    check((boolean) handle.getAndBitwiseAnd(owner, false) && !owner.flag);
    check(!(boolean) handle.getAndBitwiseAndAcquire(owner, true) && !owner.flag);
    check(!(boolean) handle.getAndBitwiseAndRelease(owner, false) && !owner.flag);
    check(!(boolean) handle.getAndBitwiseXor(owner, true) && owner.flag);
    check((boolean) handle.getAndBitwiseXorAcquire(owner, true) && !owner.flag);
    check(!(boolean) handle.getAndBitwiseXorRelease(owner, false) && !owner.flag);
    emit("vh-field-boolean-bitwise", "or/and/xor=logical;forms=9;witness=old;state=verified");
  }

  private static void caseIntegralBitwiseWide() throws Throwable {
    VarHandle integers = field("integer", int.class);
    VarHandle longs = field("wide", long.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    owner.integer = 0x13579bdf;
    check((int) integers.getAndBitwiseOr(owner, 0x80000000) == 0x13579bdf && owner.integer == 0x93579bdf);
    check((int) integers.getAndBitwiseOrAcquire(owner, 0x00000020) == 0x93579bdf && owner.integer == 0x93579bff);
    check((int) integers.getAndBitwiseOrRelease(owner, 0x00004000) == 0x93579bff && owner.integer == 0x9357dbff);
    check((int) integers.getAndBitwiseAnd(owner, 0x0fffffff) == 0x9357dbff && owner.integer == 0x0357dbff);
    check((int) integers.getAndBitwiseAndAcquire(owner, 0xffff00ff) == 0x0357dbff && owner.integer == 0x035700ff);
    check((int) integers.getAndBitwiseAndRelease(owner, 0xffffff00) == 0x035700ff && owner.integer == 0x03570000);
    check((int) integers.getAndBitwiseXor(owner, 0x80000000) == 0x03570000 && owner.integer == 0x83570000);
    check((int) integers.getAndBitwiseXorAcquire(owner, 0x00000001) == 0x83570000 && owner.integer == 0x83570001);
    check((int) integers.getAndBitwiseXorRelease(owner, 0x00000001) == 0x83570001 && owner.integer == 0x83570000);
    owner.wide = WIDE;
    check((long) longs.getAndBitwiseOr(owner, Long.MIN_VALUE) == WIDE && owner.wide == 0x8020000000000001L);
    check((long) longs.getAndBitwiseOrAcquire(owner, 0x100000000L) == 0x8020000000000001L && owner.wide == 0x8020000100000001L);
    check((long) longs.getAndBitwiseOrRelease(owner, 2L) == 0x8020000100000001L && owner.wide == 0x8020000100000003L);
    check((long) longs.getAndBitwiseAnd(owner, Long.MAX_VALUE) == 0x8020000100000003L && owner.wide == 0x0020000100000003L);
    check((long) longs.getAndBitwiseAndAcquire(owner, 0xffffffffL) == 0x0020000100000003L && owner.wide == 3L);
    check((long) longs.getAndBitwiseAndRelease(owner, -2L) == 3L && owner.wide == 2L);
    check((long) longs.getAndBitwiseXor(owner, Long.MIN_VALUE) == 2L && owner.wide == 0x8000000000000002L);
    check((long) longs.getAndBitwiseXorAcquire(owner, WIDE) == 0x8000000000000002L && owner.wide == 0x8020000000000003L);
    check((long) longs.getAndBitwiseXorRelease(owner, WIDE) == 0x8020000000000003L && owner.wide == 0x8000000000000002L);
    emit("vh-field-integral-bitwise-wide", "types=int/long;forms=9-each;high-bit/wide-mask=exact;witness=old");
  }

  private static void caseReferenceCasExchange() throws Throwable {
    VarHandle handle = field("reference", Object.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    Object first = new String("same");
    Object equal = new String("same");
    Object replacement = new Object();
    owner.reference = first;
    check(!handle.compareAndSet(owner, equal, replacement) && owner.reference == first);
    check(handle.compareAndSet(owner, first, replacement) && owner.reference == replacement);
    check((Object) handle.compareAndExchange(owner, first, equal) == replacement && owner.reference == replacement);
    check((Object) handle.compareAndExchange(owner, replacement, first) == replacement && owner.reference == first);
    check((Object) handle.compareAndExchangeAcquire(owner, equal, replacement) == first && owner.reference == first);
    check((Object) handle.compareAndExchangeAcquire(owner, first, replacement) == first && owner.reference == replacement);
    check((Object) handle.compareAndExchangeRelease(owner, first, equal) == replacement && owner.reference == replacement);
    check((Object) handle.compareAndExchangeRelease(owner, replacement, (Object) null) == replacement && owner.reference == null);
    check(handle.compareAndSet(owner, (Object) null, first) && owner.reference == first);
    emit("vh-field-reference-cas-exchange", "equals-distinct=miss;identity/null=match;exchange-forms=3;witness=original-reference");
  }

  private static void caseFloatRawComparison() throws Throwable {
    VarHandle handle = field("single", float.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    owner.single = -0.0f;
    check(!handle.compareAndSet(owner, +0.0f, 1.0f));
    check(Float.floatToRawIntBits(owner.single) == 0x80000000);
    check(handle.compareAndSet(owner, -0.0f, 1.0f) && owner.single == 1.0f);
    owner.single = -0.0f;
    check(Float.floatToRawIntBits((float) handle.compareAndExchange(owner, +0.0f, 1.0f)) == 0x80000000);
    check(Float.floatToRawIntBits((float) handle.compareAndExchange(owner, -0.0f, 1.0f)) == 0x80000000 && owner.single == 1.0f);
    owner.single = -0.0f;
    check(Float.floatToRawIntBits((float) handle.compareAndExchangeAcquire(owner, +0.0f, 1.0f)) == 0x80000000);
    check(Float.floatToRawIntBits((float) handle.compareAndExchangeAcquire(owner, -0.0f, 1.0f)) == 0x80000000 && owner.single == 1.0f);
    owner.single = -0.0f;
    check(Float.floatToRawIntBits((float) handle.compareAndExchangeRelease(owner, +0.0f, 1.0f)) == 0x80000000);
    check(Float.floatToRawIntBits((float) handle.compareAndExchangeRelease(owner, -0.0f, 1.0f)) == 0x80000000 && owner.single == 1.0f);
    owner.single = Float.NaN;
    float observed = (float) handle.get(owner);
    check(Float.isNaN(observed) && handle.compareAndSet(owner, observed, 1.5f) && owner.single == 1.5f);
    check((float) handle.getAndAdd(owner, 0.5f) == 1.5f && owner.single == 2.0f);
    check((float) handle.getAndAddAcquire(owner, 0.5f) == 2.0f && owner.single == 2.5f);
    check((float) handle.getAndAddRelease(owner, -0.5f) == 2.5f && owner.single == 2.0f);
    emit("vh-field-float-raw-comparison", "positive/negative-zero=distinct;exchange-forms=3;observed-quiet-nan=match;add-forms=3;arbitrary-payload=unclaimed");
  }

  private static void caseDoubleRawComparison() throws Throwable {
    VarHandle handle = field("precision", double.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    owner.precision = -0.0d;
    check(!handle.compareAndSet(owner, +0.0d, 1.0d));
    check(Double.doubleToRawLongBits(owner.precision) == 0x8000000000000000L);
    check(handle.compareAndSet(owner, -0.0d, 1.0d) && owner.precision == 1.0d);
    owner.precision = -0.0d;
    check(Double.doubleToRawLongBits((double) handle.compareAndExchange(owner, +0.0d, 1.0d)) == 0x8000000000000000L);
    check(Double.doubleToRawLongBits((double) handle.compareAndExchange(owner, -0.0d, 1.0d)) == 0x8000000000000000L && owner.precision == 1.0d);
    owner.precision = -0.0d;
    check(Double.doubleToRawLongBits((double) handle.compareAndExchangeAcquire(owner, +0.0d, 1.0d)) == 0x8000000000000000L);
    check(Double.doubleToRawLongBits((double) handle.compareAndExchangeAcquire(owner, -0.0d, 1.0d)) == 0x8000000000000000L && owner.precision == 1.0d);
    owner.precision = -0.0d;
    check(Double.doubleToRawLongBits((double) handle.compareAndExchangeRelease(owner, +0.0d, 1.0d)) == 0x8000000000000000L);
    check(Double.doubleToRawLongBits((double) handle.compareAndExchangeRelease(owner, -0.0d, 1.0d)) == 0x8000000000000000L && owner.precision == 1.0d);
    owner.precision = Double.NaN;
    double observed = (double) handle.get(owner);
    check(Double.isNaN(observed) && handle.compareAndSet(owner, observed, 1.5d) && owner.precision == 1.5d);
    check((double) handle.getAndAdd(owner, 0.5d) == 1.5d && owner.precision == 2.0d);
    check((double) handle.getAndAddAcquire(owner, 0.5d) == 2.0d && owner.precision == 2.5d);
    check((double) handle.getAndAddRelease(owner, -0.5d) == 2.5d && owner.precision == 2.0d);
    emit("vh-field-double-raw-comparison", "positive/negative-zero=distinct;exchange-forms=3;observed-quiet-nan=match;add-forms=3;arbitrary-payload=unclaimed");
  }

  private static void caseGetSetWitness() throws Throwable {
    VarHandle references = field("reference", Object.class);
    VarHandle longs = field("wide", long.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    Object first = new Object();
    Object second = new Object();
    owner.reference = first;
    check((Object) references.getAndSet(owner, second) == first && owner.reference == second);
    check((Object) references.getAndSetAcquire(owner, (Object) null) == second && owner.reference == null);
    check((Object) references.getAndSetRelease(owner, first) == null && owner.reference == first);
    owner.wide = WIDE;
    check((long) longs.getAndSet(owner, Long.MIN_VALUE) == WIDE && owner.wide == Long.MIN_VALUE);
    check((long) longs.getAndSetAcquire(owner, Long.MAX_VALUE) == Long.MIN_VALUE && owner.wide == Long.MAX_VALUE);
    check((long) longs.getAndSetRelease(owner, WIDE) == Long.MAX_VALUE && owner.wide == WIDE);
    emit("vh-field-get-set-witness", "types=reference/long;forms=3-each;old/null-identity/wide=exact;new-state=verified");
  }

  private static void caseWeakCasSafeOutcomes() throws Throwable {
    VarHandle handle = field("integer", int.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    owner.integer = 7;
    boolean changed = handle.weakCompareAndSetPlain(owner, 7, 11);
    check(owner.integer == (changed ? 11 : 7));
    check(!handle.weakCompareAndSetPlain(owner, -1, 19) && owner.integer == (changed ? 11 : 7));
    owner.integer = 7;
    changed = handle.weakCompareAndSet(owner, 7, 11);
    check(owner.integer == (changed ? 11 : 7));
    check(!handle.weakCompareAndSet(owner, -1, 19) && owner.integer == (changed ? 11 : 7));
    owner.integer = 7;
    changed = handle.weakCompareAndSetAcquire(owner, 7, 11);
    check(owner.integer == (changed ? 11 : 7));
    check(!handle.weakCompareAndSetAcquire(owner, -1, 19) && owner.integer == (changed ? 11 : 7));
    owner.integer = 7;
    changed = handle.weakCompareAndSetRelease(owner, 7, 11);
    check(owner.integer == (changed ? 11 : 7));
    check(!handle.weakCompareAndSetRelease(owner, -1, 19) && owner.integer == (changed ? 11 : 7));
    emit("vh-field-weak-cas-safe-outcomes", "forms=4;equal=allowed-outcome;miss=false;state=verified;first-success=unclaimed");
  }

  private static void caseStaticZeroCoordinates() throws Throwable {
    VarHandle handle = staticField(VarHandleFieldsFinal.class, "staticLong", long.class);
    check(handle.varType() == long.class && handle.coordinateTypes().isEmpty());
    check(handle.accessModeType(VarHandle.AccessMode.GET).equals(MethodType.methodType(long.class)));
    check(handle.accessModeType(VarHandle.AccessMode.COMPARE_AND_SET).equals(MethodType.methodType(boolean.class, long.class, long.class)));
    handle.set(WIDE);
    check((long) handle.get() == WIDE && staticLong == WIDE);
    check(!handle.compareAndSet(WIDE + 1L, Long.MIN_VALUE) && staticLong == WIDE);
    check(handle.compareAndSet(WIDE, Long.MIN_VALUE) && staticLong == Long.MIN_VALUE);
    check((long) handle.compareAndExchange(Long.MIN_VALUE, Long.MAX_VALUE) == Long.MIN_VALUE && staticLong == Long.MAX_VALUE);
    check((long) handle.getAndAddRelease(1L) == Long.MAX_VALUE && staticLong == Long.MIN_VALUE);
    emit("vh-field-static-zero-coordinates", "coordinates=empty;get/cas-types=exact;wide/cas/exchange/add=verified");
  }

  private static void caseStaticInitialization() throws Throwable {
    Class<?> owner = LazyOwner.class;
    check(lazyInitializations == 0);
    VarHandle handle = staticField(owner, "value", long.class);
    check(lazyInitializations == 0 || lazyInitializations == 1);
    check(handle.varType() == long.class && handle.coordinateTypes().isEmpty());
    check(handle.isAccessModeSupported(VarHandle.AccessMode.GET));
    check(handle.accessModeType(VarHandle.AccessMode.SET).equals(MethodType.methodType(void.class, long.class)));
    check(lazyInitializations == 0 || lazyInitializations == 1);
    check((long) handle.getAcquire() == WIDE && lazyInitializations == 1);
    handle.setRelease(Long.MIN_VALUE);
    check((long) handle.get() == Long.MIN_VALUE && lazyInitializations == 1);
    emit("vh-field-static-initialization", "class-literal=not-initialized;factory/query-timing=unclaimed;first-access=initialized-once;later-write/read=same-class");
  }

  private static void caseFinalReadOnly() throws Throwable {
    VarHandle handle = field("finalInt", int.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    check((int) handle.get(owner) == 16777217 && (int) handle.getVolatile(owner) == 16777217);
    check((int) handle.getOpaque(owner) == 16777217 && (int) handle.getAcquire(owner) == 16777217);
    for (VarHandle.AccessMode mode : VarHandle.AccessMode.values()) {
      boolean readable = mode == VarHandle.AccessMode.GET || mode == VarHandle.AccessMode.GET_VOLATILE
          || mode == VarHandle.AccessMode.GET_OPAQUE || mode == VarHandle.AccessMode.GET_ACQUIRE;
      check(handle.isAccessModeSupported(mode) == readable);
      check(handle.accessModeType(mode) != null);
    }
    int rejected = 0;
    try { handle.set(owner, 3); throw new AssertionError("final set"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { handle.setVolatile(owner, 3); throw new AssertionError("final volatile set"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { handle.setOpaque(owner, 3); throw new AssertionError("final opaque set"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { handle.setRelease(owner, 3); throw new AssertionError("final release set"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { boolean unused = handle.compareAndSet(owner, 16777217, 3); throw new AssertionError("final cas"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { int unused = (int) handle.compareAndExchange(owner, 16777217, 3); throw new AssertionError("final exchange"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { int unused = (int) handle.getAndSet(owner, 3); throw new AssertionError("final get/set"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { int unused = (int) handle.getAndAdd(owner, 3); throw new AssertionError("final add"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    try { int unused = (int) handle.getAndBitwiseAnd(owner, 3); throw new AssertionError("final bitwise"); }
    catch (UnsupportedOperationException expected) { rejected++; }
    check(rejected == 9 && (int) handle.get(owner) == 16777217);
    emit("vh-field-final-read-only", "reads=4;supported=read-only;unsupported-types=queryable;rejected=9-UOE;value=unchanged");
  }

  private static void caseInheritedPrivateCapability() throws Throwable {
    VarHandle inherited = MethodHandles.lookup().findVarHandle(Child.class, "inherited", int.class);
    check(inherited.varType() == int.class && inherited.coordinateTypes().size() == 1);
    check(inherited.coordinateTypes().get(0) == Child.class);
    Child child = new Child();
    check((int) inherited.get(child) == 41);
    inherited.set(child, 43);
    check(child.inherited == 43);
    VarHandle capability = PrivateOwner.capability();
    PrivateOwner privateOwner = new PrivateOwner();
    check((long) capability.get(privateOwner) == WIDE);
    capability.set(privateOwner, Long.MIN_VALUE);
    check((long) capability.get(privateOwner) == Long.MIN_VALUE);
    emit("vh-field-inherited-private-capability", "inherited-coordinate=subclass;private-capability=transferred;reads/writes=verified");
  }

  private static void caseFactoryRejections() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    int missing = 0;
    int inaccessible = 0;
    int nulls = 0;
    try { lookup.findVarHandle(VarHandleFieldsFinal.class, "absent", int.class); throw new AssertionError("missing field"); }
    catch (NoSuchFieldException expected) { missing++; }
    try { lookup.findVarHandle(VarHandleFieldsFinal.class, "integer", long.class); throw new AssertionError("wrong field type"); }
    catch (NoSuchFieldException expected) { missing++; }
    try { lookup.findStaticVarHandle(VarHandleFieldsFinal.class, "absent", long.class); throw new AssertionError("missing static field"); }
    catch (NoSuchFieldException expected) { missing++; }
    try { lookup.findStaticVarHandle(VarHandleFieldsFinal.class, "staticLong", int.class); throw new AssertionError("wrong static type"); }
    catch (NoSuchFieldException expected) { missing++; }
    try { lookup.findVarHandle(VarHandleFieldsFinal.class, "staticLong", long.class); throw new AssertionError("static as instance"); }
    catch (IllegalAccessException expected) { inaccessible++; }
    try { lookup.findStaticVarHandle(VarHandleFieldsFinal.class, "integer", int.class); throw new AssertionError("instance as static"); }
    catch (IllegalAccessException expected) { inaccessible++; }
    try { MethodHandles.publicLookup().findVarHandle(VarHandleFieldsFinal.class, "hidden", int.class); throw new AssertionError("private public lookup"); }
    catch (IllegalAccessException expected) { inaccessible++; }
    try { lookup.findVarHandle(null, "integer", int.class); throw new AssertionError("null owner"); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findVarHandle(VarHandleFieldsFinal.class, null, int.class); throw new AssertionError("null name"); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findVarHandle(VarHandleFieldsFinal.class, "integer", null); throw new AssertionError("null type"); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findStaticVarHandle(null, "staticLong", long.class); throw new AssertionError("null static owner"); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findStaticVarHandle(VarHandleFieldsFinal.class, null, long.class); throw new AssertionError("null static name"); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findStaticVarHandle(VarHandleFieldsFinal.class, "staticLong", null); throw new AssertionError("null static type"); }
    catch (NullPointerException expected) { nulls++; }
    check(missing == 4 && inaccessible == 3 && nulls == 6);
    emit("vh-field-factory-rejections", "missing/type=4-NoSuchFieldException;static/access=3-IllegalAccessException;null=6-NullPointerException");
  }

  private static void caseReceiverTypeErrors() throws Throwable {
    VarHandle handle = field("integer", int.class);
    VarHandleFieldsFinal owner = new VarHandleFieldsFinal();
    owner.integer = 29;
    int nulls = 0;
    int casts = 0;
    int types = 0;
    try { int unused = (int) handle.get((VarHandleFieldsFinal) null); throw new AssertionError("null read receiver"); }
    catch (NullPointerException expected) { nulls++; }
    try { handle.set((VarHandleFieldsFinal) null, 3); throw new AssertionError("null write receiver"); }
    catch (NullPointerException expected) { nulls++; }
    try { int unused = (int) handle.get((Object) new Object()); throw new AssertionError("wrong read receiver"); }
    catch (ClassCastException expected) { casts++; }
    try { handle.set((Object) new Object(), 3); throw new AssertionError("wrong write receiver"); }
    catch (ClassCastException expected) { casts++; }
    try { handle.set(owner, 3L); throw new AssertionError("narrowing value"); }
    catch (WrongMethodTypeException expected) { types++; }
    try { int unused = (int) handle.get(owner, 3); throw new AssertionError("excess coordinate"); }
    catch (WrongMethodTypeException expected) { types++; }
    try { int unused = (int) handle.get(); throw new AssertionError("missing coordinate"); }
    catch (WrongMethodTypeException expected) { types++; }
    check(nulls == 2 && casts == 2 && types == 3 && owner.integer == 29);
    emit("vh-field-receiver-type-errors", "null=2-NPE;receiver=2-CCE;narrowing/arity=3-WMT;value=unchanged");
  }

  public static void main(String[] args) throws Throwable {
    caseIntReadWriteModes();
    caseLongAddOverflow();
    caseNarrowAddWrap();
    caseBooleanBitwise();
    caseIntegralBitwiseWide();
    caseReferenceCasExchange();
    caseFloatRawComparison();
    caseDoubleRawComparison();
    caseGetSetWitness();
    caseWeakCasSafeOutcomes();
    caseStaticZeroCoordinates();
    caseStaticInitialization();
    caseFinalReadOnly();
    caseInheritedPrivateCapability();
    caseFactoryRejections();
    caseReceiverTypeErrors();
    System.out.println("VARHANDLE_FIELDS_OK");
  }
}
