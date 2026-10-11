package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.WrongMethodTypeException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Genuine C2 finite argument-routing probes; no generated carriers or indy. */
public final class MethodHandleRoutingFinal {
  private static final Object FIRST = new Object();
  private static final Object SECOND = new Object();
  private static final long WIDE = 9007199254740993L;
  private static final StringBuilder ORDER = new StringBuilder();
  private static final ProbeFailure ORIGINAL = new ProbeFailure();
  private static int calls;
  private static int helperCalls;
  private static Object observed;

  public static final class ProbeFailure extends Exception {
    private static final long serialVersionUID = 1L;
  }

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("C2 routing probe failed");
  }

  private static void reset() {
    calls = 0;
    helperCalls = 0;
    observed = null;
    ORDER.setLength(0);
  }

  private static void order(String expected) { check(ORDER.toString().equals(expected)); }

  private static void emit(String id, String trace) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(trace);
  }

  private static MethodHandle handle(String name, MethodType type) throws ReflectiveOperationException {
    return MethodHandles.lookup().findStatic(MethodHandleRoutingFinal.class, name, type);
  }

  private static MethodHandle varargsHandle() throws ReflectiveOperationException {
    return handle("varargs", MethodType.methodType(Object.class, Object[].class));
  }

  private static MethodHandle arrayHandle() throws ReflectiveOperationException {
    return handle("fixedArray", MethodType.methodType(Object.class, Object[].class));
  }

  private static MethodHandle routeHandle() throws ReflectiveOperationException {
    return handle("route", MethodType.methodType(Object.class, Object.class, long.class, Object.class));
  }

  public static Object varargs(Object... values) {
    calls++;
    ORDER.append('T');
    observed = values;
    return values;
  }

  public static Object fixedArray(Object[] values) {
    calls++;
    ORDER.append('T');
    observed = values;
    return values;
  }

  public static long wideArray(long[] values) {
    check(values.length == 2);
    calls++;
    ORDER.append('T');
    observed = values;
    return values[0] + values[1];
  }

  public static long wideVarargs(long... values) { return wideArray(values); }

  public static Object one(Object value) {
    calls++;
    ORDER.append('T');
    observed = value;
    return value;
  }

  public static Object zero() {
    calls++;
    ORDER.append('T');
    return FIRST;
  }

  public static Object route(Object prefix, long wide, Object suffix) {
    check(prefix == FIRST && wide == WIDE && suffix == SECOND);
    calls++;
    ORDER.append('T');
    observed = suffix;
    return prefix;
  }

  public static Object mixed(Object prefix, long wide, double decimal, Object suffix) {
    check(prefix == FIRST && wide == WIDE && suffix == SECOND &&
        Double.doubleToRawLongBits(decimal) == Double.doubleToRawLongBits(-0.0d));
    calls++;
    ORDER.append('T');
    observed = suffix;
    return prefix;
  }

  public static long collectWide(double decimal, Object reference) {
    check(reference == SECOND && Double.doubleToRawLongBits(decimal) == Double.doubleToRawLongBits(-0.0d));
    helperCalls++;
    ORDER.append('C');
    return WIDE;
  }

  public static long collectWideFailure(double decimal, Object reference) throws ProbeFailure {
    check(reference == SECOND && Double.doubleToRawLongBits(decimal) == Double.doubleToRawLongBits(-0.0d));
    helperCalls++;
    ORDER.append('F');
    throw ORIGINAL;
  }

  public static long collectLeft(String value) {
    check(value.equals("wide"));
    helperCalls++;
    ORDER.append('L');
    return WIDE;
  }

  public static double collectRight(int value) {
    check(value == 3);
    helperCalls++;
    ORDER.append('R');
    return -0.0d;
  }

  public static void collectVoid(Object reference) {
    check(reference == SECOND);
    helperCalls++;
    ORDER.append('C');
  }

  public static void collectVoidFailure(Object reference) throws ProbeFailure {
    check(reference == SECOND);
    helperCalls++;
    ORDER.append('F');
    throw ORIGINAL;
  }

  public static void caseLookupVarargsFlags() throws Throwable {
    reset();
    MethodHandle variable = varargsHandle();
    MethodHandle fixed = arrayHandle();
    MethodHandle primitive = handle("wideVarargs", MethodType.methodType(long.class, long[].class));
    check(variable.isVarargsCollector() && primitive.isVarargsCollector() && !fixed.isVarargsCollector());
    check(variable.type().equals(fixed.type()) && calls == 0);
    emit("routing-lookup-varargs-flags", "reference/primitive-lookup=varargs;ordinary-array=fixed;same-reference-type=true;effects=0");
  }

  public static void caseArrayStaticTypePassthrough() throws Throwable {
    reset();
    MethodHandle variable = varargsHandle();
    Object[] values = new Object[] {FIRST, SECOND};
    Object exact = (Object) variable.invokeExact(values);
    check(exact == values && observed == values);
    Object generic = (Object) variable.invoke(values);
    check(generic == values && observed == values);
    String[] strings = new String[] {"first", "second"};
    Object subtype = (Object) variable.invoke(strings);
    check(subtype == strings && observed == strings && calls == 3);
    order("TTT");
    emit("routing-array-static-type-passthrough", "exact-Object-array=same;invoke-Object-array=same;invoke-String-array=same;effects=3");
  }

  public static void caseObjectArraySingleElement() throws Throwable {
    reset();
    MethodHandle variable = varargsHandle();
    Object[] values = new Object[] {FIRST, SECOND};
    Object[] boxed = (Object[]) (Object) variable.invoke((Object) values);
    check(boxed != values && boxed.length == 1 && boxed[0] == values && observed == boxed);
    Object[] boxedNull = (Object[]) (Object) variable.invoke((Object) null);
    check(boxedNull.length == 1 && boxedNull[0] == null);
    Object typedNull = (Object) variable.invoke((Object[]) null);
    check(typedNull == null && observed == null && calls == 3);
    emit("routing-object-array-single-element", "Object-array=one-array-element;Object-null=one-null-element;typed-array-null=passthrough;effects=3");
  }

  public static void caseZeroMultipleVarargs() throws Throwable {
    reset();
    MethodHandle variable = varargsHandle();
    Object[] empty = (Object[]) (Object) variable.invoke();
    Object[] many = (Object[]) (Object) variable.invoke(FIRST, SECOND, FIRST);
    check(empty.length == 0 && many.length == 3 && many[0] == FIRST && many[1] == SECOND && many[2] == FIRST);
    check(observed == many && calls == 2);
    emit("routing-zero-multiple-varargs", "lengths=0/3;collected-order/identities=same;effects=2");
  }

  public static void caseFixedArityNormalization() throws Throwable {
    reset();
    MethodHandle variable = varargsHandle();
    MethodHandle fixed = variable.asFixedArity();
    check(!fixed.isVarargsCollector() && fixed.type().equals(variable.type()) && fixed.asFixedArity() == fixed);
    MethodHandle scalar = handle("one", MethodType.methodType(Object.class, Object.class));
    check(scalar.asFixedArity() == scalar);
    Object[] values = new Object[] {FIRST, SECOND};
    Object exact = (Object) fixed.invokeExact(values);
    Object cast = (Object) fixed.invoke((Object) values);
    check(exact == values && cast == values && observed == values && calls == 2);
    emit("routing-fixed-arity-normalization", "mode=fixed;type=unchanged;already-fixed=identity;Object-array=cast-passthrough;effects=2");
  }

  public static void caseFixedArityFailureTiming() throws Throwable {
    reset();
    MethodHandle fixed = varargsHandle().asFixedArity();
    Object[] values = new Object[] {FIRST, SECOND};
    int wrongType = 0;
    int castFailure = 0;
    try { Object unused = (Object) fixed.invokeExact((Object) values); check(unused == FIRST); }
    catch (WrongMethodTypeException expected) { wrongType++; }
    try { Object unused = (Object) fixed.invoke(FIRST, SECOND); check(unused == FIRST); }
    catch (WrongMethodTypeException expected) { wrongType++; }
    try { Object unused = (Object) fixed.invoke((Object) FIRST); check(unused == FIRST); }
    catch (ClassCastException expected) { castFailure++; }
    check(wrongType == 2 && castFailure == 1 && calls == 0 && observed == null);
    emit("routing-fixed-arity-failure-timing", "exact/arity=WrongMethodTypeException;Object-value=ClassCastException;effects=0");
    Object nullArray = (Object) fixed.invoke((Object[]) null);
    check(nullArray == null && calls == 1);
    emit("routing-fixed-arity-failure-timing", "typed-null-array=target-reached;return=null;effects=1");
  }

  public static void caseReferenceCollector() throws Throwable {
    reset();
    MethodHandle base = arrayHandle();
    MethodHandle collector = base.asVarargsCollector(String[].class);
    check(collector.isVarargsCollector() && collector.type().parameterType(0) == String[].class);
    String first = new String("first");
    String second = new String("second");
    String[] values = new String[] {first, second};
    Object exact = (Object) collector.invokeExact(values);
    String[] collected = (String[]) (Object) collector.invoke(first, second);
    check(exact == values && collected.length == 2 && collected[0] == first && collected[1] == second && observed == collected);
    check(calls == 2);
    emit("routing-reference-collector", "last-parameter=String-array;exact-array=same;collected-elements=same;effects=2");
  }

  public static void caseWidePrimitiveCollector() throws Throwable {
    reset();
    MethodHandle base = handle("wideArray", MethodType.methodType(long.class, long[].class));
    MethodHandle collector = base.asVarargsCollector(long[].class);
    long collected = (long) collector.invoke(WIDE, 1);
    long[] values = new long[] {WIDE, 2L};
    long exact = (long) collector.invokeExact(values);
    check(collector.isVarargsCollector() && collected == 9007199254740994L && exact == 9007199254740995L);
    check(observed == values && calls == 2);
    emit("routing-wide-primitive-collector", "long-array=varargs;int-to-long=widened;results=9007199254740994/9007199254740995;exact-array=same;effects=2");
  }

  public static void caseWithVarargsToggle() throws Throwable {
    reset();
    MethodHandle base = arrayHandle();
    check(base.withVarargs(false) == base);
    MethodHandle variable = base.withVarargs(true);
    check(variable.isVarargsCollector() && variable.withVarargs(true) == variable);
    MethodHandle fixed = variable.withVarargs(false);
    check(!fixed.isVarargsCollector() && fixed.type().equals(base.type()));
    Object[] values = new Object[] {FIRST, SECOND};
    Object[] boxed = (Object[]) (Object) variable.invoke((Object) values);
    Object passed = (Object) fixed.invoke((Object) values);
    check(boxed.length == 1 && boxed[0] == values && passed == values && calls == 2);
    int rejected = 0;
    try { handle("one", MethodType.methodType(Object.class, Object.class)).withVarargs(true); }
    catch (IllegalArgumentException expected) { rejected++; }
    check(rejected == 1 && calls == 2);
    emit("routing-with-varargs-toggle", "same-mode=identity;type=unchanged;variable=collect;fixed=cast;nonarray=rejected;effects=2");
  }

  public static void caseInvokeWithArgumentsArray() throws Throwable {
    reset();
    MethodHandle mixed = handle("mixed", MethodType.methodType(Object.class, Object.class, long.class, double.class, Object.class));
    Object result = mixed.invokeWithArguments(new Object[] {FIRST, Long.valueOf(WIDE), Double.valueOf(-0.0d), SECOND});
    check(result == FIRST && observed == SECOND);
    Object[] array = new Object[] {FIRST, SECOND};
    Object[] variable = (Object[]) varargsHandle().invokeWithArguments(new Object[] {array});
    check(variable.length == 1 && variable[0] == array && variable != array);
    Object fixed = arrayHandle().invokeWithArguments(new Object[] {array});
    check(fixed == array && calls == 3);
    emit("routing-invoke-with-arguments-array", "wide/negative-zero=unboxed;reference=same;varargs=array-as-element;fixed=array-passthrough;effects=3");
  }

  public static void caseInvokeWithArgumentsList() throws Throwable {
    reset();
    MethodHandle mixed = handle("mixed", MethodType.methodType(Object.class, Object.class, long.class, double.class, Object.class));
    List<Object> arguments = Arrays.<Object>asList(FIRST, Long.valueOf(WIDE), Double.valueOf(-0.0d), SECOND);
    Object result = mixed.invokeWithArguments(arguments);
    Object[] collected = (Object[]) varargsHandle().invokeWithArguments(Arrays.<Object>asList(FIRST, SECOND));
    check(result == FIRST && collected.length == 2 && collected[0] == FIRST && collected[1] == SECOND && calls == 2);
    int rejected = 0;
    try { mixed.invokeWithArguments((List<?>) null); }
    catch (NullPointerException expected) { rejected++; }
    check(rejected == 1 && calls == 2);
    emit("routing-invoke-with-arguments-list", "wide/negative-zero=unboxed;list-order/identities=same;null-list=NullPointerException;effects=2");
  }

  public static void caseInvokeWithArgumentsEmpty() throws Throwable {
    reset();
    MethodHandle zero = handle("zero", MethodType.methodType(Object.class));
    Object nullArray = zero.invokeWithArguments((Object[]) null);
    Object emptyArray = zero.invokeWithArguments(new Object[0]);
    Object emptyList = zero.invokeWithArguments(Collections.emptyList());
    Object[] collected = (Object[]) varargsHandle().invokeWithArguments((Object[]) null);
    check(nullArray == FIRST && emptyArray == FIRST && emptyList == FIRST && collected.length == 0 && calls == 4);
    emit("routing-invoke-with-arguments-empty", "null-array/empty-array/empty-list=zero-arguments;varargs-null-array=empty-collection;effects=4");
  }

  public static void caseCollectValueNonzeroWide() throws Throwable {
    reset();
    MethodHandle target = routeHandle();
    MethodHandle collect = handle("collectWide", MethodType.methodType(long.class, double.class, Object.class));
    MethodHandle collected = MethodHandles.collectArguments(target, 1, collect);
    Object result = (Object) collected.invokeExact(FIRST, -0.0d, SECOND, SECOND);
    check(result == FIRST && observed == SECOND && calls == 1 && helperCalls == 1);
    order("CT");
    emit("routing-collect-value-nonzero-wide", "position=1;order=CT;double=-0.0;collected-long=9007199254740993;references=same;target/helper=1/1");

    reset();
    MethodHandle mixed = handle("mixed", MethodType.methodType(Object.class, Object.class, long.class, double.class, Object.class));
    MethodHandle right = MethodHandles.collectArguments(mixed, 2,
        handle("collectRight", MethodType.methodType(double.class, int.class)));
    MethodHandle both = MethodHandles.collectArguments(right, 1,
        handle("collectLeft", MethodType.methodType(long.class, String.class)));
    Object routed = (Object) both.invokeExact(FIRST, "wide", 3, SECOND);
    check(routed == FIRST && calls == 1 && helperCalls == 2);
    order("LRT");
    emit("routing-collect-value-nonzero-wide", "nested-positions=1/2;order=LRT;wide-values=exact;references=same;target/helper=1/2");

    reset();
    MethodHandle failed = MethodHandles.collectArguments(target, 1,
        handle("collectWideFailure", MethodType.methodType(long.class, double.class, Object.class)));
    Throwable caught = null;
    try { Object unused = (Object) failed.invokeExact(FIRST, -0.0d, SECOND, SECOND); check(unused == SECOND); }
    catch (ProbeFailure failure) { caught = failure; }
    check(caught == ORIGINAL && calls == 0 && helperCalls == 1 && observed == null);
    order("F");
    emit("routing-collect-value-nonzero-wide", "order=F;throwable=original;target=absent;target/helper=0/1");
  }

  public static void caseCollectVoidOrderFailure() throws Throwable {
    reset();
    MethodHandle target = routeHandle();
    MethodHandle collected = MethodHandles.collectArguments(target, 1,
        handle("collectVoid", MethodType.methodType(void.class, Object.class)));
    Object result = (Object) collected.invokeExact(FIRST, SECOND, WIDE, SECOND);
    check(result == FIRST && calls == 1 && helperCalls == 1);
    order("CT");
    emit("routing-collect-void-order-failure", "position=1;void-inserts-one-argument;order=CT;long=9007199254740993;references=same;target/helper=1/1");

    reset();
    MethodHandle failed = MethodHandles.collectArguments(target, 1,
        handle("collectVoidFailure", MethodType.methodType(void.class, Object.class)));
    Throwable caught = null;
    try { Object unused = (Object) failed.invokeExact(FIRST, SECOND, WIDE, SECOND); check(unused == SECOND); }
    catch (ProbeFailure failure) { caught = failure; }
    check(caught == ORIGINAL && calls == 0 && helperCalls == 1 && observed == null);
    order("F");
    emit("routing-collect-void-order-failure", "order=F;throwable=original;target=absent;target/helper=0/1");
  }

  public static void caseSpreadInvokerLeading() throws Throwable {
    reset();
    MethodHandle target = routeHandle();
    MethodHandle invoker = MethodHandles.spreadInvoker(target.type(), 1);
    check(invoker.type().equals(MethodType.methodType(Object.class, MethodHandle.class, Object.class, Object[].class)));
    Object result = (Object) invoker.invokeExact(target, FIRST, new Object[] {Long.valueOf(WIDE), SECOND});
    check(result == FIRST && calls == 1);
    int lengthFailure = 0;
    int castFailure = 0;
    try { Object unused = (Object) invoker.invokeExact(target, FIRST, new Object[] {Long.valueOf(WIDE)}); check(unused == SECOND); }
    catch (IllegalArgumentException expected) { lengthFailure++; }
    try { Object unused = (Object) invoker.invokeExact(target, FIRST, new Object[] {SECOND, SECOND}); check(unused == SECOND); }
    catch (ClassCastException expected) { castFailure++; }
    check(lengthFailure == 1 && castFailure == 1 && calls == 1);
    emit("routing-spread-invoker-leading", "leading=1;type=handle/reference/Object-array;wide=unboxed;references=same;length/cast=rejected-before-target;effects=1");
  }

  public static void casePermuteDropInsertErrors() throws Throwable {
    reset();
    MethodHandle target = routeHandle();
    MethodHandle permuted = MethodHandles.permuteArguments(target,
        MethodType.methodType(Object.class, long.class, Object.class, Object.class), new int[] {1, 0, 2});
    Object moved = (Object) permuted.invokeExact(WIDE, FIRST, SECOND);
    MethodHandle inserted = MethodHandles.insertArguments(target, 1, new Object[] {Long.valueOf(WIDE)});
    Object bound = (Object) inserted.invokeExact(FIRST, SECOND);
    MethodHandle scalar = handle("one", MethodType.methodType(Object.class, Object.class));
    MethodHandle dropped = MethodHandles.dropArgumentsToMatch(scalar, 0,
        Arrays.<Class<?>>asList(long.class, Object.class, double.class), 1);
    Object remaining = (Object) dropped.invokeExact(WIDE, FIRST, -0.0d);
    check(moved == FIRST && bound == FIRST && remaining == FIRST && calls == 3);
    int rejected = 0;
    try { MethodHandles.permuteArguments(target, target.type(), new int[] {0, 1}); }
    catch (IllegalArgumentException expected) { rejected++; }
    try { MethodHandles.insertArguments(target, 3, new Object[] {Long.valueOf(WIDE)}); }
    catch (IllegalArgumentException expected) { rejected++; }
    try { MethodHandles.dropArgumentsToMatch(scalar, 0, Arrays.<Class<?>>asList(long.class), 0); }
    catch (IllegalArgumentException expected) { rejected++; }
    check(rejected == 3 && calls == 3);
    order("TTT");
    emit("routing-permute-drop-insert-errors", "permute=wide-slot;insert-position=1;drop-match-position=1;references=same;factory-rejections=3;effects=3");
  }

  public static void main(String[] args) throws Throwable {
    caseLookupVarargsFlags();
    caseArrayStaticTypePassthrough();
    caseObjectArraySingleElement();
    caseZeroMultipleVarargs();
    caseFixedArityNormalization();
    caseFixedArityFailureTiming();
    caseReferenceCollector();
    caseWidePrimitiveCollector();
    caseWithVarargsToggle();
    caseInvokeWithArgumentsArray();
    caseInvokeWithArgumentsList();
    caseInvokeWithArgumentsEmpty();
    caseCollectValueNonzeroWide();
    caseCollectVoidOrderFailure();
    caseSpreadInvokerLeading();
    casePermuteDropInsertErrors();
    System.out.println("METHODHANDLE_ROUTING_OK");
  }
}
