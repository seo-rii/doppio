package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

/** Fixed-arity C1 compositions; general conversion/varargs matrices live elsewhere. */
public final class MethodHandleCombinatorsFinal {
  private static final Object FIRST = new Object();
  private static final Object SECOND = new Object();
  private static final long WIDE = 9007199254740993L;
  private static final StringBuilder ORDER = new StringBuilder();
  private static final ProbeFailure ORIGINAL = new ProbeFailure();
  private static final ProbeFailure CLEANUP = new ProbeFailure();
  private static final ProbeFailure LATER = new ProbeFailure();
  private static final MethodType UNARY = MethodType.methodType(Object.class, Object.class);
  private static final MethodType BINARY = MethodType.methodType(Object.class, Object.class, Object.class);

  public static final class ProbeFailure extends Exception {
    private static final long serialVersionUID = 1L;
  }

  private static void check(boolean value) {
    if (!value) throw new AssertionError("C1 combinator probe failed");
  }

  private static void reset() { ORDER.setLength(0); }
  private static void order(String expected) { check(ORDER.toString().equals(expected)); }

  private static void emit(String id, String trace) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(trace);
  }

  private static MethodHandle handle(String name, MethodType type) throws ReflectiveOperationException {
    return MethodHandles.lookup().findStatic(MethodHandleCombinatorsFinal.class, name, type);
  }

  public static boolean predicate(Object value) { ORDER.append('P'); return value == FIRST; }
  public static boolean predicateFailure(Object value) throws ProbeFailure { ORDER.append('P'); throw ORIGINAL; }
  public static Object branchA(Object value) { check(value == FIRST); ORDER.append('A'); return SECOND; }
  public static Object branchB(Object value) { check(value == SECOND); ORDER.append('B'); return FIRST; }
  public static Object left(Object value) { ORDER.append('L'); return value; }
  public static Object middle(Object value) { ORDER.append('M'); return value; }
  public static Object right(Object value) { ORDER.append('R'); return value; }
  public static Object argumentFailure(Object value) throws ProbeFailure { ORDER.append('F'); throw ORIGINAL; }
  public static Object laterArgumentFailure(Object value) throws ProbeFailure { ORDER.append('E'); throw LATER; }

  public static Object fourArguments(Object first, Object second, Object third, Object fourth) {
    check(first == FIRST && second == SECOND && third == FIRST && fourth == SECOND);
    ORDER.append('T');
    return first;
  }

  public static long stringToWide(String value) {
    check(value.equals("wide"));
    ORDER.append('L');
    return WIDE;
  }

  public static double intToNegativeZero(int value) {
    check(value == 3);
    ORDER.append('R');
    return -0.0d;
  }

  public static Object filteredWideTarget(long wide, Object reference, double decimal) {
    check(wide == WIDE && reference == FIRST &&
        Double.doubleToRawLongBits(decimal) == Double.doubleToRawLongBits(-0.0d));
    ORDER.append('T');
    return reference;
  }

  public static Object binary(Object first, Object second) {
    check(first == FIRST && second == SECOND);
    ORDER.append('T');
    return first;
  }

  public static Object identity(Object value) { ORDER.append('T'); return value; }
  public static Object returnFilter(Object value) { check(value == FIRST); ORDER.append('R'); return value; }
  public static long foldValue(Object value) { check(value == FIRST); ORDER.append('C'); return WIDE; }
  public static void foldVoid(Object value) { check(value == FIRST); ORDER.append('C'); }

  public static Object wideTarget(long value, Object reference) {
    check(value == WIDE && reference == FIRST);
    ORDER.append('T');
    return reference;
  }

  public static Object fail(Object value) throws ProbeFailure {
    check(value == FIRST);
    ORDER.append('T');
    throw ORIGINAL;
  }

  public static Object recover(ProbeFailure failure, Object value) {
    check(failure == ORIGINAL && value == FIRST);
    ORDER.append('H');
    return value;
  }

  public static Object wrongRecovery(IllegalArgumentException failure, Object value) {
    ORDER.append('H');
    return value;
  }

  public static Object cleanupSuccess(Throwable failure, Object result, Object value) {
    check(failure == null && result == FIRST && value == FIRST);
    ORDER.append('C');
    return SECOND;
  }

  public static Object cleanupFailure(Throwable failure, Object result, Object value) {
    check(failure == ORIGINAL && result == null && value == FIRST);
    ORDER.append('C');
    return SECOND;
  }

  public static Object cleanupThrows(Throwable failure, Object result, Object value) throws ProbeFailure {
    check(failure == ORIGINAL && result == null && value == FIRST);
    ORDER.append('C');
    throw CLEANUP;
  }

  public static Object duplicateTarget(Object first, long wide, Object second) {
    check(first == FIRST && second == FIRST && first == second && wide == WIDE);
    ORDER.append('T');
    return first;
  }

  public static Object boundTarget(Object bound, long wide, Object argument) {
    check(bound == FIRST && wide == WIDE && argument == SECOND);
    ORDER.append('T');
    return bound;
  }

  public static void caseGuardSelect() throws Throwable {
    reset();
    MethodHandle test = handle("predicate", MethodType.methodType(boolean.class, Object.class));
    MethodHandle guarded = MethodHandles.guardWithTest(test, handle("branchA", UNARY), handle("branchB", UNARY));
    Object first = (Object) guarded.invokeExact(FIRST);
    Object second = (Object) guarded.invokeExact(SECOND);
    check(first == SECOND && second == FIRST);
    order("PAPB");
    emit("combinator-guard-select", "order=PAPB;branches=exclusive;references=same");
  }

  public static void caseGuardPredicateFailure() throws Throwable {
    reset();
    MethodHandle test = handle("predicateFailure", MethodType.methodType(boolean.class, Object.class));
    MethodHandle guarded = MethodHandles.guardWithTest(test, handle("branchA", UNARY), handle("branchB", UNARY));
    Throwable caught = null;
    try {
      Object unused = (Object) guarded.invokeExact(FIRST);
      check(unused == SECOND);
    } catch (ProbeFailure failure) { caught = failure; }
    check(caught == ORIGINAL);
    order("P");
    emit("combinator-guard-predicate-failure", "order=P;throwable=original;branches=absent");
  }

  public static void caseFilterArgumentOrder() throws Throwable {
    reset();
    MethodHandle binaryTarget = handle("binary", BINARY);
    MethodHandle filtered = MethodHandles.filterArguments(binaryTarget, 0,
        new MethodHandle[] {handle("left", UNARY), handle("right", UNARY)});
    Object result = (Object) filtered.invokeExact(FIRST, SECOND);
    check(result == FIRST);
    order("LRT");
    emit("combinator-filter-argument-order", "order=LRT;argument-identities=same;return=first");

    reset();
    MethodHandle noFilters = MethodHandles.filterArguments(binaryTarget, 2, new MethodHandle[0]);
    MethodHandle allNull = MethodHandles.filterArguments(binaryTarget, 0, new MethodHandle[] {null, null});
    check(noFilters == binaryTarget && allNull == binaryTarget);
    order("");
    emit("combinator-filter-argument-order", "zero/all-null=original-handle;callbacks=absent");

    reset();
    MethodHandle fourTarget = handle("fourArguments",
        MethodType.methodType(Object.class, Object.class, Object.class, Object.class, Object.class));
    MethodHandle gap = MethodHandles.filterArguments(fourTarget, 1,
        new MethodHandle[] {handle("left", UNARY), null, handle("right", UNARY)});
    Object gapResult = (Object) gap.invokeExact(FIRST, SECOND, FIRST, SECOND);
    check(gapResult == FIRST);
    order("LRT");
    emit("combinator-filter-argument-order", "position=1;null-gap=unchanged;order=LRT;reference=same");

    reset();
    MethodHandle[] callerFilters = new MethodHandle[] {
        handle("left", UNARY), handle("middle", UNARY), handle("right", UNARY)};
    MethodHandle three = MethodHandles.filterArguments(fourTarget, 1, callerFilters);
    callerFilters[0] = handle("argumentFailure", UNARY);
    callerFilters[1] = null;
    callerFilters[2] = handle("laterArgumentFailure", UNARY);
    Object threeResult = (Object) three.invokeExact(FIRST, SECOND, FIRST, SECOND);
    check(threeResult == FIRST);
    order("LMRT");
    emit("combinator-filter-argument-order", "position=1;three-filters=LMRT;caller-array-mutation=isolated;reference=same");

    reset();
    MethodHandle wideTarget = handle("filteredWideTarget",
        MethodType.methodType(Object.class, long.class, Object.class, double.class));
    MethodHandle wideFiltered = MethodHandles.filterArguments(wideTarget, 0, new MethodHandle[] {
        handle("stringToWide", MethodType.methodType(long.class, String.class)), null,
        handle("intToNegativeZero", MethodType.methodType(double.class, int.class))});
    check(wideFiltered.type().equals(MethodType.methodType(Object.class, String.class, Object.class, int.class)));
    Object wideResult = (Object) wideFiltered.invokeExact("wide", FIRST, 3);
    check(wideResult == FIRST);
    order("LRT");
    emit("combinator-filter-argument-order", "unary-types=String-to-long/int-to-double;long=9007199254740993;double=-0.0;order=LRT;reference=same");
  }

  public static void caseFilterArgumentFailure() throws Throwable {
    reset();
    MethodHandle filtered = MethodHandles.filterArguments(handle("binary", BINARY), 0,
        new MethodHandle[] {handle("argumentFailure", UNARY), handle("right", UNARY)});
    Throwable caught = null;
    try {
      Object unused = (Object) filtered.invokeExact(FIRST, SECOND);
      check(unused == FIRST);
    } catch (ProbeFailure failure) { caught = failure; }
    check(caught == ORIGINAL);
    order("F");
    emit("combinator-filter-argument-failure", "order=F;throwable=original;later-filter/target=absent");

    reset();
    MethodHandle fourTarget = handle("fourArguments",
        MethodType.methodType(Object.class, Object.class, Object.class, Object.class, Object.class));
    MethodHandle leftmostFails = MethodHandles.filterArguments(fourTarget, 1, new MethodHandle[] {
        handle("argumentFailure", UNARY), handle("laterArgumentFailure", UNARY), handle("right", UNARY)});
    caught = null;
    try {
      Object unused = (Object) leftmostFails.invokeExact(FIRST, SECOND, FIRST, SECOND);
      check(unused == FIRST);
    } catch (ProbeFailure failure) { caught = failure; }
    check(caught == ORIGINAL);
    order("F");
    emit("combinator-filter-argument-failure", "three-filters=F;leftmost-throwable=original;later-throwable/remaining-filter/target=absent");

    reset();
    MethodHandle laterFails = MethodHandles.filterArguments(fourTarget, 1, new MethodHandle[] {
        handle("left", UNARY), handle("laterArgumentFailure", UNARY), handle("right", UNARY)});
    caught = null;
    try {
      Object unused = (Object) laterFails.invokeExact(FIRST, SECOND, FIRST, SECOND);
      check(unused == FIRST);
    } catch (ProbeFailure failure) { caught = failure; }
    check(caught == LATER && caught != ORIGINAL);
    order("LE");
    emit("combinator-filter-argument-failure", "three-filters=LE;later-throwable=original-later-instance;remaining-filter/target=absent");
  }

  public static void caseFilterReturnOrder() throws Throwable {
    reset();
    MethodHandle filtered = MethodHandles.filterReturnValue(handle("identity", UNARY), handle("returnFilter", UNARY));
    Object result = (Object) filtered.invokeExact(FIRST);
    check(result == FIRST);
    order("TR");
    emit("combinator-filter-return-order", "order=TR;target-result/filtered-return=same");
  }

  public static void caseFoldValueWide() throws Throwable {
    reset();
    MethodHandle folded = MethodHandles.foldArguments(
        handle("wideTarget", MethodType.methodType(Object.class, long.class, Object.class)),
        handle("foldValue", MethodType.methodType(long.class, Object.class)));
    Object result = (Object) folded.invokeExact(FIRST);
    check(result == FIRST);
    order("CT");
    emit("combinator-fold-value-wide", "order=CT;long=9007199254740993;reference=same");
  }

  public static void caseFoldVoidOrder() throws Throwable {
    reset();
    MethodHandle folded = MethodHandles.foldArguments(handle("identity", UNARY),
        handle("foldVoid", MethodType.methodType(void.class, Object.class)));
    Object result = (Object) folded.invokeExact(FIRST);
    check(result == FIRST);
    order("CT");
    emit("combinator-fold-void-order", "order=CT;void-does-not-add-argument;reference=same");
  }

  public static void caseCatchMatch() throws Throwable {
    reset();
    MethodHandle recovered = MethodHandles.catchException(handle("fail", UNARY), ProbeFailure.class,
        handle("recover", MethodType.methodType(Object.class, ProbeFailure.class, Object.class)));
    Object result = (Object) recovered.invokeExact(FIRST);
    check(result == FIRST);
    order("TH");
    emit("combinator-catch-match", "order=TH;handler-throwable=original;handler-argument/return=same");
  }

  public static void caseCatchMiss() throws Throwable {
    reset();
    MethodHandle recovered = MethodHandles.catchException(handle("fail", UNARY), IllegalArgumentException.class,
        handle("wrongRecovery", MethodType.methodType(Object.class, IllegalArgumentException.class, Object.class)));
    Throwable caught = null;
    try {
      Object unused = (Object) recovered.invokeExact(FIRST);
      check(unused == FIRST);
    } catch (ProbeFailure failure) { caught = failure; }
    check(caught == ORIGINAL);
    order("T");
    emit("combinator-catch-miss", "order=T;throwable=original;handler=absent");
  }

  public static void caseFinallySuccess() throws Throwable {
    reset();
    MethodHandle cleaned = MethodHandles.tryFinally(handle("identity", UNARY),
        handle("cleanupSuccess", MethodType.methodType(Object.class, Throwable.class, Object.class, Object.class)));
    Object result = (Object) cleaned.invokeExact(FIRST);
    check(result == SECOND);
    order("TC");
    emit("combinator-finally-success", "order=TC;throwable=null;cleanup-sees-original-result/argument;return=cleanup-reference");
  }

  public static void caseFinallyTargetFailure() throws Throwable {
    reset();
    MethodHandle cleaned = MethodHandles.tryFinally(handle("fail", UNARY),
        handle("cleanupFailure", MethodType.methodType(Object.class, Throwable.class, Object.class, Object.class)));
    Throwable caught = null;
    try {
      Object unused = (Object) cleaned.invokeExact(FIRST);
      check(unused == SECOND);
    } catch (ProbeFailure failure) { caught = failure; }
    check(caught == ORIGINAL);
    order("TC");
    emit("combinator-finally-target-failure", "order=TC;throwable=original;cleanup-result-placeholder=null;cleanup-return=ignored");
  }

  public static void caseFinallyCleanupFailure() throws Throwable {
    reset();
    MethodHandle cleaned = MethodHandles.tryFinally(handle("fail", UNARY),
        handle("cleanupThrows", MethodType.methodType(Object.class, Throwable.class, Object.class, Object.class)));
    Throwable caught = null;
    try {
      Object unused = (Object) cleaned.invokeExact(FIRST);
      check(unused == SECOND);
    } catch (ProbeFailure failure) { caught = failure; }
    check(caught == CLEANUP && CLEANUP.getSuppressed().length == 0 && ORIGINAL.getSuppressed().length == 0);
    order("TC");
    emit("combinator-finally-cleanup-failure", "order=TC;throwable=cleanup-original;target-throwable=replaced;automatic-suppression=absent");
  }

  public static void casePermuteWideDuplicates() throws Throwable {
    reset();
    MethodHandle permuted = MethodHandles.permuteArguments(
        handle("duplicateTarget", MethodType.methodType(Object.class, Object.class, long.class, Object.class)),
        MethodType.methodType(Object.class, long.class, Object.class), new int[] {1, 0, 1});
    Object result = (Object) permuted.invokeExact(WIDE, FIRST);
    check(result == FIRST);
    order("T");
    emit("combinator-permute-wide-duplicates", "order=T;duplicate-references=same;long=9007199254740993;return=same");
  }

  public static void caseInsertBoundWide() throws Throwable {
    reset();
    MethodHandle bound = MethodHandles.insertArguments(
        handle("boundTarget", MethodType.methodType(Object.class, Object.class, long.class, Object.class)),
        0, new Object[] {FIRST, Long.valueOf(WIDE)});
    Object result = (Object) bound.invokeExact(SECOND);
    check(result == FIRST);
    order("T");
    emit("combinator-insert-bound-wide", "order=T;bound-reference=same;long=9007199254740993;argument=same");
  }

  public static void caseDropWideSlots() throws Throwable {
    reset();
    MethodHandle dropped = MethodHandles.dropArguments(handle("identity", UNARY), 0,
        new Class<?>[] {Object.class, long.class, double.class});
    Object result = (Object) dropped.invokeExact(SECOND, WIDE, -0.0d, FIRST);
    check(result == FIRST);
    order("T");
    emit("combinator-drop-wide-slots", "order=T;unused=reference/long/double;remaining-reference=same");
  }

  public static void caseFactoryRejections() throws Throwable {
    reset();
    MethodHandle unary = handle("identity", UNARY);
    MethodHandle binary = handle("binary", BINARY);
    int rejected = 0;
    try { MethodHandles.guardWithTest(unary, unary, unary); }
    catch (IllegalArgumentException expected) { rejected++; }
    try { MethodHandles.permuteArguments(binary, UNARY, new int[] {0, 1}); }
    catch (IllegalArgumentException expected) { rejected++; }
    try { MethodHandles.filterArguments(unary, 0, new MethodHandle[] {handle("foldValue", MethodType.methodType(long.class, Object.class))}); }
    catch (IllegalArgumentException expected) { rejected++; }
    try { MethodHandles.tryFinally(unary, handle("foldVoid", MethodType.methodType(void.class, Object.class))); }
    catch (IllegalArgumentException expected) { rejected++; }
    check(rejected == 4);
    order("");
    emit("combinator-factory-rejections", "guard/permute/filter/finally=rejected;callbacks=absent");
  }

  public static void main(String[] args) throws Throwable {
    caseGuardSelect();
    caseGuardPredicateFailure();
    caseFilterArgumentOrder();
    caseFilterArgumentFailure();
    caseFilterReturnOrder();
    caseFoldValueWide();
    caseFoldVoidOrder();
    caseCatchMatch();
    caseCatchMiss();
    caseFinallySuccess();
    caseFinallyTargetFailure();
    caseFinallyCleanupFailure();
    casePermuteWideDuplicates();
    caseInsertBoundWide();
    caseDropWideSlots();
    caseFactoryRejections();
    System.out.println("METHODHANDLE_COMBINATORS_OK");
  }
}
