package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.VarHandle;
import java.lang.invoke.WrongMethodTypeException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;

/** Genuine C3 finite query/interop probes; original javac output, no indy. */
public final class VarHandleInteropFinal {
  private static final Object FIRST = new Object();
  private static final Object SECOND = new Object();
  private static final long WIDE = 9007199254740993L;

  public static final class Cell {
    public long value = WIDE;
    public static long shared = WIDE;
    public final long readOnly = WIDE;
    public int number = 7;
    private int secret = 11;
  }

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("C3 VarHandle interop probe failed");
  }

  private static void emit(String id, String trace) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(trace);
  }

  private static VarHandle arrayHandle(Class<?> arrayClass) {
    return MethodHandles.arrayElementVarHandle(arrayClass);
  }

  private static VarHandle fieldHandle(String name, Class<?> type) throws ReflectiveOperationException {
    return MethodHandles.lookup().findVarHandle(Cell.class, name, type);
  }

  private static VarHandle staticHandle() throws ReflectiveOperationException {
    return MethodHandles.lookup().findStaticVarHandle(Cell.class, "shared", long.class);
  }

  private static boolean readMode(VarHandle.AccessMode mode) {
    return mode == VarHandle.AccessMode.GET || mode == VarHandle.AccessMode.GET_VOLATILE ||
        mode == VarHandle.AccessMode.GET_ACQUIRE || mode == VarHandle.AccessMode.GET_OPAQUE;
  }

  private static boolean writeMode(VarHandle.AccessMode mode) {
    return mode == VarHandle.AccessMode.SET || mode == VarHandle.AccessMode.SET_VOLATILE ||
        mode == VarHandle.AccessMode.SET_RELEASE || mode == VarHandle.AccessMode.SET_OPAQUE;
  }

  private static void checkModeTypes(VarHandle handle) {
    Class<?> valueType = handle.varType();
    List<Class<?>> coordinates = handle.coordinateTypes();
    for (VarHandle.AccessMode mode : VarHandle.AccessMode.values()) {
      String name = mode.methodName();
      boolean compare = name.startsWith("compareAnd") || name.startsWith("weakCompareAnd");
      boolean booleanResult = name.equals("compareAndSet") || name.startsWith("weakCompareAnd");
      Class<?> result = writeMode(mode) ? void.class : booleanResult ? boolean.class : valueType;
      int valueCount = readMode(mode) ? 0 : compare ? 2 : 1;
      Class<?>[] parameters = new Class<?>[coordinates.size() + valueCount];
      for (int index = 0; index < coordinates.size(); index++) parameters[index] = coordinates.get(index);
      for (int index = coordinates.size(); index < parameters.length; index++) parameters[index] = valueType;
      check(handle.accessModeType(mode).equals(MethodType.methodType(result, parameters)));
    }
  }

  public static void caseQueryCoordinateValueImmutable() throws Throwable {
    VarHandle array = arrayHandle(long[].class);
    VarHandle field = fieldHandle("value", long.class);
    VarHandle shared = staticHandle();
    check(array.varType() == long.class && field.varType() == long.class && shared.varType() == long.class);
    check(array.coordinateTypes().equals(Arrays.asList(long[].class, int.class)));
    check(field.coordinateTypes().equals(Arrays.asList(Cell.class)) && shared.coordinateTypes().isEmpty());
    int immutable = 0;
    try { array.coordinateTypes().add(Object.class); }
    catch (UnsupportedOperationException expected) { immutable++; }
    try { field.coordinateTypes().set(0, Object.class); }
    catch (UnsupportedOperationException expected) { immutable++; }
    try { shared.coordinateTypes().add(Object.class); }
    catch (UnsupportedOperationException expected) { immutable++; }
    check(immutable == 3 && array.coordinateTypes().equals(Arrays.asList(long[].class, int.class)) &&
        field.coordinateTypes().equals(Arrays.asList(Cell.class)) && shared.coordinateTypes().isEmpty());
    emit("vh-query-coordinate-value-immutable", "value=long;array=long-array/int;field=Cell;static=empty;immutable=3;coordinates=unchanged");
  }

  public static void caseQueryAccessModeTypes() throws Throwable {
    VarHandle array = arrayHandle(long[].class);
    VarHandle field = fieldHandle("value", long.class);
    VarHandle shared = staticHandle();
    VarHandle reference = arrayHandle(String[].class);
    VarHandle readOnly = fieldHandle("readOnly", long.class);
    checkModeTypes(array);
    checkModeTypes(field);
    checkModeTypes(shared);
    checkModeTypes(reference);
    checkModeTypes(readOnly);
    check(array.accessModeType(VarHandle.AccessMode.GET).equals(MethodType.methodType(long.class, long[].class, int.class)));
    check(array.accessModeType(VarHandle.AccessMode.SET).equals(MethodType.methodType(void.class, long[].class, int.class, long.class)));
    check(array.accessModeType(VarHandle.AccessMode.COMPARE_AND_SET).equals(MethodType.methodType(boolean.class,
        long[].class, int.class, long.class, long.class)));
    check(array.accessModeType(VarHandle.AccessMode.COMPARE_AND_EXCHANGE).equals(MethodType.methodType(long.class,
        long[].class, int.class, long.class, long.class)));
    check(!readOnly.isAccessModeSupported(VarHandle.AccessMode.SET) &&
        readOnly.accessModeType(VarHandle.AccessMode.SET).equals(MethodType.methodType(void.class, Cell.class, long.class)));
    emit("vh-query-access-mode-types", "modes=31;array/field/static/reference/final=typed;read=T;write=void;compare-set=boolean;exchange/update=T;unsupported=still-typed");
  }

  public static void caseQuerySupportedTypeMatrix() throws Throwable {
    Class<?>[] arrays = {boolean[].class, byte[].class, short[].class, char[].class, int[].class,
        long[].class, float[].class, double[].class, Object[].class, String[].class};
    Class<?>[] values = {boolean.class, byte.class, short.class, char.class, int.class,
        long.class, float.class, double.class, Object.class, String.class};
    for (int index = 0; index < arrays.length; index++) {
      VarHandle handle = arrayHandle(arrays[index]);
      check(handle.varType() == values[index]);
      int supported = 0;
      for (VarHandle.AccessMode mode : VarHandle.AccessMode.values()) {
        String name = mode.methodName();
        boolean add = name.startsWith("getAndAdd");
        boolean bitwise = name.startsWith("getAndBitwise");
        boolean reference = index >= 8;
        boolean floating = index == 6 || index == 7;
        boolean expected = !(add && (index == 0 || reference)) && !(bitwise && (floating || reference));
        check(handle.isAccessModeSupported(mode) == expected);
        if (expected) supported++;
      }
      check(supported == (index == 0 ? 28 : index >= 8 ? 19 : index >= 6 ? 22 : 31));
    }
    VarHandle finalField = fieldHandle("readOnly", long.class);
    int reads = 0;
    for (VarHandle.AccessMode mode : VarHandle.AccessMode.values()) {
      check(finalField.isAccessModeSupported(mode) == readMode(mode));
      if (finalField.isAccessModeSupported(mode)) reads++;
    }
    check(reads == 4);
    emit("vh-query-supported-type-matrix", "array-types=10;integral=31;boolean=28;floating=22;reference=19;final-read-only=4;all-mode-masks=checked");
  }

  public static void caseAccessModeNameRoundtrip() throws Throwable {
    VarHandle.AccessMode[] modes = VarHandle.AccessMode.values();
    check(modes.length == 31);
    for (VarHandle.AccessMode mode : modes) {
      check(VarHandle.AccessMode.valueFromMethodName(mode.methodName()) == mode);
      check(VarHandle.AccessMode.valueOf(mode.name()) == mode);
    }
    modes[0] = null;
    check(VarHandle.AccessMode.values()[0] == VarHandle.AccessMode.GET);
    int invalid = 0;
    int nulls = 0;
    try { VarHandle.AccessMode.valueFromMethodName("GET"); }
    catch (IllegalArgumentException expected) { invalid++; }
    try { VarHandle.AccessMode.valueFromMethodName("noSuchMode"); }
    catch (IllegalArgumentException expected) { invalid++; }
    try { VarHandle.AccessMode.valueFromMethodName(null); }
    catch (NullPointerException expected) { nulls++; }
    check(invalid == 2 && nulls == 1);
    emit("vh-access-mode-name-roundtrip", "modes=31;method-name/enum-name=roundtrip;values-array=defensive;invalid=2;null=1");
  }

  public static void caseBehaviorToggleIdentity() throws Throwable {
    VarHandle ordinary = arrayHandle(long[].class);
    VarHandle exact = ordinary.withInvokeExactBehavior();
    VarHandle restored = exact.withInvokeBehavior();
    check(!ordinary.hasInvokeExactBehavior() && exact.hasInvokeExactBehavior() && !restored.hasInvokeExactBehavior());
    check(ordinary.withInvokeBehavior() == ordinary && exact.withInvokeExactBehavior() == exact &&
        restored.withInvokeBehavior() == restored);
    check(ordinary.varType() == exact.varType() && ordinary.coordinateTypes().equals(exact.coordinateTypes()));
    long[] values = {WIDE};
    exact.set(values, 0, WIDE + 1L);
    check((long) ordinary.get(values, 0) == WIDE + 1L && (long) restored.get(values, 0) == WIDE + 1L);
    emit("vh-behavior-toggle-identity", "default=invoke;toggle=exact/invoke;same-mode=identity;coordinate/value-types=same;variable-family=shared;wide=9007199254740994");
  }

  public static void caseInvokeAdaptationBoxWide() throws Throwable {
    VarHandle handle = arrayHandle(long[].class);
    long[] values = {WIDE};
    handle.set((Object) values, Integer.valueOf(0), Integer.valueOf(9));
    Object boxed = (Object) handle.get((Object) values, Integer.valueOf(0));
    check(boxed instanceof Long && ((Long) boxed).longValue() == 9L && (double) handle.get(values, 0) == 9.0d);
    handle.set((Object) values, Integer.valueOf(0), (Object) Long.valueOf(WIDE));
    long previous = (long) handle.getAndAdd(values, 0, 1);
    check(previous == WIDE && values[0] == WIDE + 1L);
    VarHandle reference = arrayHandle(Object[].class);
    Object[] references = {FIRST};
    Object old = (Object) reference.getAndSet((Object) references, Integer.valueOf(0), SECOND);
    check(old == FIRST && references[0] == SECOND);
    emit("vh-invoke-adaptation-box-wide", "Object-coordinate=cast;index/value=unbox/widen;return=box/widen;long=9007199254740994;reference-old/new=identity");
  }

  public static void caseInvokeExactRejections() throws Throwable {
    VarHandle exact = arrayHandle(long[].class).withInvokeExactBehavior();
    long[] values = {WIDE};
    int wrong = 0;
    try { long unused = (long) exact.get((Object) values, 0); check(unused == 0L); }
    catch (WrongMethodTypeException expected) { wrong++; }
    try { long unused = (long) exact.get(values, Integer.valueOf(0)); check(unused == 0L); }
    catch (WrongMethodTypeException expected) { wrong++; }
    try { Object unused = (Object) exact.get(values, 0); check(unused == FIRST); }
    catch (WrongMethodTypeException expected) { wrong++; }
    try { exact.set(values, 0, 7); }
    catch (WrongMethodTypeException expected) { wrong++; }
    try { exact.get(values, 0); }
    catch (WrongMethodTypeException expected) { wrong++; }
    try { long unused = (long) exact.get(); check(unused == 0L); }
    catch (WrongMethodTypeException expected) { wrong++; }
    check(wrong == 6 && values[0] == WIDE && (long) exact.get(values, 0) == WIDE);
    exact.set(values, 0, WIDE + 1L);
    check(values[0] == WIDE + 1L);
    emit("vh-invoke-exact-rejections", "coordinate/index/value/return/void/arity=WrongMethodTypeException;rejections=6;failed-writes=absent;exact-long=9007199254740994");
  }

  public static void caseInvokeAdaptationErrors() throws Throwable {
    VarHandle handle = arrayHandle(long[].class);
    long[] values = {WIDE};
    int casts = 0;
    int nulls = 0;
    int wrong = 0;
    try { long unused = (long) handle.get((Object) new int[] {1}, 0); check(unused == 0L); }
    catch (ClassCastException expected) { casts++; }
    try { handle.set(values, 0, (Object) "wrong"); }
    catch (ClassCastException expected) { casts++; }
    VarHandle reference = arrayHandle(Object[].class);
    try { String unused = (String) reference.get(new Object[] {FIRST}, 0); check(unused == null); }
    catch (ClassCastException expected) { casts++; }
    try { handle.set(values, 0, (Object) null); }
    catch (NullPointerException expected) { nulls++; }
    try { long unused = (long) handle.get((long[]) null, 0); check(unused == 0L); }
    catch (NullPointerException expected) { nulls++; }
    VarHandle missing = null;
    try { Object unused = (Object) missing.get((Object) values, "wrong-index"); check(unused == FIRST); }
    catch (NullPointerException expected) { nulls++; }
    try { long unused = (long) handle.get(values); check(unused == 0L); }
    catch (WrongMethodTypeException expected) { wrong++; }
    check(casts == 3 && nulls == 3 && wrong == 1 && values[0] == WIDE);
    emit("vh-invoke-adaptation-errors", "cast=3;null-unbox/coordinate/handle=3;null-handle-before-bad-index=NullPointerException;arity=WrongMethodTypeException;failed-writes=absent;long=9007199254740993");
  }

  public static void caseToMethodHandleBound() throws Throwable {
    VarHandle handle = arrayHandle(long[].class).withInvokeExactBehavior();
    MethodHandle get = handle.toMethodHandle(VarHandle.AccessMode.GET);
    MethodHandle set = handle.toMethodHandle(VarHandle.AccessMode.SET);
    check(get.type().equals(MethodType.methodType(long.class, long[].class, int.class)) && !get.isVarargsCollector());
    check(set.type().equals(MethodType.methodType(void.class, long[].class, int.class, long.class)) && !set.isVarargsCollector());
    long[] first = {WIDE};
    long[] second = {WIDE + 1L};
    check((long) get.invokeExact(first, 0) == WIDE && (long) get.invokeExact(second, 0) == WIDE + 1L);
    set.invokeExact(first, 0, WIDE + 2L);
    Object boxed = (Object) get.invoke((Object) first, Integer.valueOf(0));
    check(boxed instanceof Long && ((Long) boxed).longValue() == WIDE + 2L);
    MethodHandle fieldGet = fieldHandle("value", long.class).toMethodHandle(VarHandle.AccessMode.GET);
    MethodHandle sharedGet = staticHandle().toMethodHandle(VarHandle.AccessMode.GET);
    Cell cell = new Cell();
    check(fieldGet.type().equals(MethodType.methodType(long.class, Cell.class)) && (long) fieldGet.invokeExact(cell) == WIDE);
    check(sharedGet.type().equals(MethodType.methodType(long.class)) && (long) sharedGet.invokeExact() == WIDE);
    emit("vh-to-method-handle-bound", "receiver=bound;coordinates=unbound;array/field/static=exact-types;fixed-arity=true;exact-VH-to-MH=adaptable;long=9007199254740995");
  }

  public static void caseExactInvokerWide() throws Throwable {
    VarHandle handle = arrayHandle(long[].class);
    long[] values = {WIDE};
    MethodType compareType = MethodType.methodType(boolean.class, long[].class, int.class, long.class, long.class);
    MethodHandle compare = MethodHandles.varHandleExactInvoker(VarHandle.AccessMode.COMPARE_AND_SET, compareType);
    check(compare.type().equals(compareType.insertParameterTypes(0, VarHandle.class)) && !compare.isVarargsCollector());
    boolean changed = (boolean) compare.invokeExact(handle, values, 0, WIDE, WIDE + 1L);
    boolean absent = (boolean) compare.invokeExact(handle.withInvokeExactBehavior(), values, 0, WIDE, WIDE + 2L);
    MethodHandle replace = MethodHandles.varHandleExactInvoker(VarHandle.AccessMode.GET_AND_SET,
        MethodType.methodType(long.class, long[].class, int.class, long.class));
    long previous = (long) replace.invokeExact(handle, values, 0, WIDE + 2L);
    MethodHandle wrong = MethodHandles.varHandleExactInvoker(VarHandle.AccessMode.SET,
        MethodType.methodType(void.class, Object.class, int.class, long.class));
    int rejected = 0;
    try { wrong.invokeExact(handle, (Object) values, 0, 4L); }
    catch (WrongMethodTypeException expected) { rejected++; }
    check(changed && !absent && previous == WIDE + 1L && values[0] == WIDE + 2L && rejected == 1);
    emit("vh-exact-invoker-wide", "leading-coordinate=VarHandle;fixed-arity=true;two-wide-values=preserved;compare=success/failure;replace-witness=9007199254740994;type-rejection=no-write");
  }

  public static void caseAdaptableInvokerBoxWide() throws Throwable {
    VarHandle handle = arrayHandle(long[].class);
    long[] values = {WIDE};
    MethodHandle get = MethodHandles.varHandleInvoker(VarHandle.AccessMode.GET,
        MethodType.methodType(Object.class, Object.class, Integer.class));
    MethodHandle set = MethodHandles.varHandleInvoker(VarHandle.AccessMode.SET,
        MethodType.methodType(void.class, Object.class, Integer.class, Object.class));
    check(get.type().equals(MethodType.methodType(Object.class, VarHandle.class, Object.class, Integer.class)) &&
        !get.isVarargsCollector() && !set.isVarargsCollector());
    Object before = (Object) get.invokeExact(handle, (Object) values, Integer.valueOf(0));
    set.invokeExact(handle, (Object) values, Integer.valueOf(0), (Object) Long.valueOf(WIDE + 1L));
    Object after = (Object) get.invokeExact(handle, (Object) values, Integer.valueOf(0));
    int wrong = 0;
    try { Object unused = (Object) get.invokeExact(handle.withInvokeExactBehavior(), (Object) values, Integer.valueOf(0)); check(unused == FIRST); }
    catch (WrongMethodTypeException expected) { wrong++; }
    check(((Long) before).longValue() == WIDE && ((Long) after).longValue() == WIDE + 1L && wrong == 1 && values[0] == WIDE + 1L);
    emit("vh-adaptable-invoker-box-wide", "leading-coordinate=VarHandle;Object/Integer=cast/unbox;long=box;before/after=9007199254740993/9007199254740994;exact-VH=mismatch-rejected");
  }

  public static void caseLookupVirtualAccessMode() throws Throwable {
    VarHandle handle = arrayHandle(long[].class);
    long[] values = {WIDE};
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodType getType = MethodType.methodType(long.class, long[].class, int.class);
    MethodHandle get = lookup.findVirtual(VarHandle.class, "get", getType);
    MethodHandle set = lookup.findVirtual(VarHandle.class, "set",
        MethodType.methodType(void.class, long[].class, int.class, long.class));
    check(get.type().equals(getType.insertParameterTypes(0, VarHandle.class)) && !get.isVarargsCollector());
    check((long) get.invokeExact(handle, values, 0) == WIDE);
    set.invokeExact(handle, values, 0, WIDE + 1L);
    MethodHandle generic = lookup.findVirtual(VarHandle.class, "get", MethodType.methodType(Object.class, Object.class, Integer.class));
    Object boxed = (Object) generic.invokeExact(handle, (Object) values, Integer.valueOf(0));
    int wrong = 0;
    try { Object unused = (Object) generic.invokeExact(handle.withInvokeExactBehavior(), (Object) values, Integer.valueOf(0)); check(unused == FIRST); }
    catch (WrongMethodTypeException expected) { wrong++; }
    check(((Long) boxed).longValue() == WIDE + 1L && wrong == 1 && values[0] == WIDE + 1L);
    emit("vh-lookup-virtual-access-mode", "arbitrary-symbolic-type=resolved;receiver=VarHandle;fixed-arity=true;get/set=9007199254740994;generic=adaptable;exact-VH=mismatch-rejected");
  }

  public static void caseUnreflectAccessibleIgnored() throws Throwable {
    Field secret = Cell.class.getDeclaredField("secret");
    MethodHandles.Lookup publicLookup = MethodHandles.publicLookup();
    int denied = 0;
    secret.setAccessible(true);
    try { publicLookup.unreflectVarHandle(secret); }
    catch (IllegalAccessException expected) { denied++; }
    secret.setAccessible(false);
    try { publicLookup.unreflectVarHandle(secret); }
    catch (IllegalAccessException expected) { denied++; }
    VarHandle own = MethodHandles.lookup().unreflectVarHandle(secret);
    Cell cell = new Cell();
    check((int) own.get(cell) == 11);
    own.set(cell, 12);
    Field number = Cell.class.getDeclaredField("number");
    number.setAccessible(false);
    VarHandle first = publicLookup.unreflectVarHandle(number);
    number.setAccessible(true);
    VarHandle second = publicLookup.unreflectVarHandle(number);
    first.set(cell, 8);
    check(denied == 2 && (int) own.get(cell) == 12 && (int) second.get(cell) == 8 && cell.secret == 12 && cell.number == 8);
    emit("vh-unreflect-accessible-ignored", "public-lookup/private-field=denied-with-accessible-true/false;owner-lookup=allowed;public-field=allowed-with-accessible-true/false;values=12/8");
  }

  private static void checkPlaceholder(String name, Class<?> result, VarHandle handle, Object[] values) throws Throwable {
    Method method = VarHandle.class.getDeclaredMethod(name, Object[].class);
    int modifiers = method.getModifiers();
    check(Modifier.isPublic(modifiers) && Modifier.isFinal(modifiers) && Modifier.isNative(modifiers) &&
        !Modifier.isStatic(modifiers) && method.isVarArgs() && method.getReturnType() == result &&
        Arrays.equals(method.getParameterTypes(), new Class<?>[] {Object[].class}));
    // Method.invoke differs between the pinned 21/25 native implementations.
    // This bounded case instead checks the specified unreflected placeholders,
    // not findVirtual's real signature-polymorphic access-mode invokers.
    MethodHandle placeholder = MethodHandles.lookup().unreflect(method).asFixedArity();
    check(placeholder.type().equals(MethodType.methodType(result, VarHandle.class, Object[].class)) &&
        !placeholder.isVarargsCollector());
    boolean rejected = false;
    try {
      if (result == void.class) placeholder.invokeExact(handle, values);
      else if (result == boolean.class) {
        boolean unused = (boolean) placeholder.invokeExact(handle, values);
        check(!unused);
      } else {
        Object unused = (Object) placeholder.invokeExact(handle, values);
        check(unused == null);
      }
    } catch (UnsupportedOperationException expected) { rejected = true; }
    check(rejected);
  }

  public static void caseReflectiveAccessPlaceholders() throws Throwable {
    VarHandle handle = arrayHandle(long[].class);
    long[] values = {WIDE};
    checkPlaceholder("get", Object.class, handle, new Object[] {values, Integer.valueOf(0)});
    checkPlaceholder("set", void.class, handle, new Object[] {values, Integer.valueOf(0), Long.valueOf(1L)});
    checkPlaceholder("compareAndSet", boolean.class, handle,
        new Object[] {values, Integer.valueOf(0), Long.valueOf(WIDE), Long.valueOf(1L)});
    check(values[0] == WIDE && (long) handle.get(values, 0) == WIDE);
    emit("vh-reflective-access-placeholders", "get/set/compare-set=public-final-native-varargs;erased-returns=Object/void/boolean;unreflected-fixed-placeholders=UnsupportedOperationException;direct-get=9007199254740993;writes=absent");
  }

  public static void caseInteropUnsupportedModes() throws Throwable {
    VarHandle readOnly = fieldHandle("readOnly", long.class);
    Cell cell = new Cell();
    MethodType setType = MethodType.methodType(void.class, Cell.class, long.class);
    MethodHandle bound = readOnly.toMethodHandle(VarHandle.AccessMode.SET);
    MethodHandle exact = MethodHandles.varHandleExactInvoker(VarHandle.AccessMode.SET, setType);
    MethodHandle generic = MethodHandles.varHandleInvoker(VarHandle.AccessMode.SET, setType);
    check(bound.type().equals(setType) && !bound.isVarargsCollector());
    int unsupported = 0;
    int wrong = 0;
    try { bound.invokeExact(cell, 1L); }
    catch (UnsupportedOperationException expected) { unsupported++; }
    try { exact.invokeExact(readOnly, cell, 1L); }
    catch (UnsupportedOperationException expected) { unsupported++; }
    try { generic.invokeExact(readOnly, cell, 1L); }
    catch (UnsupportedOperationException expected) { unsupported++; }
    MethodType mismatch = MethodType.methodType(void.class, Object.class, long.class);
    MethodHandle exactMismatch = MethodHandles.varHandleExactInvoker(VarHandle.AccessMode.SET, mismatch);
    MethodHandle genericMismatch = MethodHandles.varHandleInvoker(VarHandle.AccessMode.SET, mismatch);
    try { exactMismatch.invokeExact(readOnly, (Object) cell, 1L); }
    catch (UnsupportedOperationException expected) { unsupported++; }
    try { genericMismatch.invokeExact(readOnly, (Object) cell, 1L); }
    catch (UnsupportedOperationException expected) { unsupported++; }
    try { genericMismatch.invokeExact(readOnly.withInvokeExactBehavior(), (Object) cell, 1L); }
    catch (WrongMethodTypeException expected) { wrong++; }
    check(unsupported == 5 && wrong == 1 && cell.readOnly == WIDE && (long) readOnly.get(cell) == WIDE);
    emit("vh-interop-unsupported-modes", "unsupported-to-MH=construction-succeeds;bound/exact/generic=UnsupportedOperationException;pinned-mixed-priority=unsupported-before-normal-mismatch/exact-VH-mismatch-before-unsupported;counts=5/1;writes=absent");
  }

  public static void caseInteropFactoryErrors() throws Throwable {
    MethodType type = MethodType.methodType(long.class, long[].class, int.class);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    VarHandle handle = arrayHandle(long[].class);
    int nulls = 0;
    int invalid = 0;
    int absent = 0;
    try { MethodHandles.arrayElementVarHandle(null); }
    catch (NullPointerException expected) { nulls++; }
    try { MethodHandles.arrayElementVarHandle(Object.class); }
    catch (IllegalArgumentException expected) { invalid++; }
    try { MethodHandles.varHandleInvoker(null, type); }
    catch (NullPointerException expected) { nulls++; }
    try { MethodHandles.varHandleExactInvoker(null, type); }
    catch (NullPointerException expected) { nulls++; }
    try { MethodHandles.varHandleInvoker(VarHandle.AccessMode.GET, null); }
    catch (NullPointerException expected) { nulls++; }
    try { MethodHandles.varHandleExactInvoker(VarHandle.AccessMode.GET, null); }
    catch (NullPointerException expected) { nulls++; }
    try { handle.accessModeType(null); }
    catch (NullPointerException expected) { nulls++; }
    try { handle.isAccessModeSupported(null); }
    catch (NullPointerException expected) { nulls++; }
    try { handle.toMethodHandle(null); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.unreflectVarHandle(null); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findVirtual(null, "get", type); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findVirtual(VarHandle.class, null, type); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findVirtual(VarHandle.class, "get", null); }
    catch (NullPointerException expected) { nulls++; }
    try { lookup.findVirtual(VarHandle.class, "noSuchMode", type); }
    catch (NoSuchMethodException expected) { absent++; }
    check(nulls == 12 && invalid == 1 && absent == 1);
    emit("vh-interop-factory-errors", "null=12;non-array=IllegalArgumentException;unknown-virtual-mode=NoSuchMethodException;execution=absent");
  }

  public static void main(String[] args) throws Throwable {
    caseQueryCoordinateValueImmutable();
    caseQueryAccessModeTypes();
    caseQuerySupportedTypeMatrix();
    caseAccessModeNameRoundtrip();
    caseBehaviorToggleIdentity();
    caseInvokeAdaptationBoxWide();
    caseInvokeExactRejections();
    caseInvokeAdaptationErrors();
    caseToMethodHandleBound();
    caseExactInvokerWide();
    caseAdaptableInvokerBoxWide();
    caseLookupVirtualAccessMode();
    caseUnreflectAccessibleIgnored();
    caseReflectiveAccessPlaceholders();
    caseInteropUnsupportedModes();
    caseInteropFactoryErrors();
    System.out.println("VARHANDLE_INTEROP_OK");
  }
}
