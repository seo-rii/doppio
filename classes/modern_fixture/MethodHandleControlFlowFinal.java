package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/** Selected C2 loop/control-flow shapes, not arbitrary loop graph conformance. */
public final class MethodHandleControlFlowFinal {
  private static final long WIDE = 9007199254740993L;
  private static final Object FIRST = new Object();
  private static final Object SECOND = new Object();
  private static final IllegalStateException FAILURE = new IllegalStateException("original component failure");
  private static final StringBuilder ORDER = new StringBuilder();
  private static char failAt;
  private static int visits;
  private static int aCalls;
  private static int bCalls;
  private static Object[] callerArray;

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError(new StringBuilder("C2 control-flow assertion failed; order=").append(ORDER).toString());
  }

  private static void reset() {
    ORDER.setLength(0);
    failAt = 0;
    visits = 0;
    aCalls = 0;
    bCalls = 0;
  }

  private static void mark(String value) {
    if (ORDER.length() != 0) ORDER.append(',');
    ORDER.append(value);
    if (failAt == value.charAt(0)) throw FAILURE;
  }

  private static void mark(String prefix, int number) {
    mark(new StringBuilder(prefix).append(number).toString());
  }

  private static void order(String expected) { check(ORDER.toString().equals(expected)); }
  private static void emit(String id, String trace) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(trace);
  }

  private static MethodHandle handle(String name, Class<?> result, Class<?>... arguments)
      throws ReflectiveOperationException {
    return MethodHandles.lookup().findStatic(MethodHandleControlFlowFinal.class, name,
        MethodType.methodType(result, arguments));
  }

  private static List<Object> values(Object... elements) {
    List<Object> values = new ArrayList<Object>();
    for (Object element : elements) values.add(element);
    return values;
  }

  public static int intInit(int limit) { mark("I"); return 0; }
  public static boolean intPred(int state, int limit) { mark("P", state); return state < limit; }
  public static int intBody(int state, int limit) { mark("B", state); visits++; return state + 1; }
  public static Object referenceBody(Object state, int limit) { mark("B"); visits++; return FIRST; }
  public static boolean referenceStop(Object state, int limit) { check(state == null); mark("Pnull"); return false; }

  public static long longInit(long seed, double signed, Object value) {
    check(seed == WIDE && value == FIRST && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE);
    mark("I");
    return seed;
  }
  public static boolean longPred(long state, long seed, double signed, Object value) {
    check(state == seed + visits && seed == WIDE && value == FIRST && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE);
    mark("P", visits);
    return visits < 2;
  }
  public static long longBody(long state, long seed, double signed, Object value) {
    check(state == seed + visits && value == FIRST && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE);
    mark("B", visits);
    visits++;
    return state + 1L;
  }
  public static double doubleInit(double signed, long seed, Object value) {
    check(seed == WIDE && value == FIRST && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE);
    mark("I");
    return signed;
  }
  public static boolean doublePred(double state, double signed, long seed, Object value) {
    check(Double.doubleToRawLongBits(state) == Long.MIN_VALUE && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE && seed == WIDE && value == FIRST);
    mark("P", visits);
    return visits < 2;
  }
  public static double doubleBody(double state, double signed, long seed, Object value) {
    check(Double.doubleToRawLongBits(state) == Long.MIN_VALUE && seed == WIDE && value == FIRST);
    mark("B", visits);
    visits++;
    return state;
  }
  public static void voidInit(int limit) { mark("I"); visits = 0; }
  public static boolean voidPred(int limit) { mark("P", visits); return visits < limit; }
  public static void voidBody(int limit) { mark("B", visits); visits++; }

  public static int iterations(int count, long seed) { check(seed == WIDE); mark("N"); return count; }
  public static long countedInit(int count, long seed) { check(seed == WIDE); mark("I"); return seed; }
  public static long countedBody(long state, int index, int count, long seed) {
    check(seed == WIDE && index == visits && state == seed + (long) index * (index - 1) / 2);
    mark("B", index);
    visits++;
    return state + index;
  }
  public static int rangeStart(int start, int end, long seed) { check(seed == WIDE); mark("S"); return start; }
  public static int rangeEnd(int start, int end, long seed) { check(seed == WIDE); mark("E"); return end; }
  public static long rangeInit(int start, int end, long seed) { check(seed == WIDE); mark("I"); return seed; }
  public static long rangeBody(long state, int index, int start, int end, long seed) {
    check(seed == WIDE && index == start + visits);
    long preceding = (long) visits * (2L * start + visits - 1L) / 2L;
    check(state == seed + preceding);
    mark("B", index);
    visits++;
    return state + index;
  }

  public static Iterator<Object> iterator(List<Object> source, Object initial) {
    check(initial == FIRST);
    mark("R");
    return source.iterator();
  }
  public static Object iterInit(List<Object> source, Object initial) { check(initial == FIRST); mark("I"); return initial; }
  public static Object iterBody(Object state, Object element, List<Object> source, Object initial) {
    check(initial == FIRST && state == (visits == 0 ? FIRST : SECOND));
    check(element == (visits == 0 ? SECOND : FIRST));
    mark("B", visits);
    visits++;
    return element;
  }
  public static Object defaultIterBody(Object state, Object element) {
    check(state == (visits == 0 ? null : SECOND) && element == (visits == 0 ? SECOND : FIRST));
    mark("B", visits);
    visits++;
    return element;
  }

  public static int generalStep(int state, int limit) { mark("T", state + 1); visits++; return state + 1; }
  public static boolean generalPred(int state, int limit) { mark("P", state); return state < limit; }
  public static int generalFini(int state, int limit) { mark("F", state); return state; }
  public static int initA(int limit) { mark("IA"); return 0; }
  public static long initB(int limit) { mark("IB"); return WIDE; }
  public static int stepA(int a, long b, int limit) {
    check(a == aCalls && b == WIDE + (long) bCalls * (bCalls + 1) / 2);
    aCalls++;
    mark("A", a + 1);
    return a + 1;
  }
  public static boolean predA(int a, long b, int limit) { mark("P", a); return a < limit; }
  public static long stepB(int a, long b, int limit) { check(a == aCalls && a == bCalls + 1); bCalls++; mark("B", a); return b + a; }
  public static boolean predB(int a, long b, int limit) { mark("Q", a); return a < 2; }
  public static long finiA(int a, long b, int limit) { check(a == limit); mark("FA"); return b; }
  public static long finiB(int a, long b, int limit) { check(a == 2); mark("FB"); return b; }
  public static int varStep(int state, Object... arguments) { check(arguments == callerArray); mark("T", state + arguments.length); visits++; return state + arguments.length; }
  public static boolean varPred(int state, Object... arguments) { check(arguments == callerArray); mark("P", state); return state < 4; }
  public static Object varFini(int state, Object... arguments) { check(arguments == callerArray); mark("F", state); return arguments; }
  public static boolean invariantPred(int state, int limit) { check(state == 0); mark("P0"); return false; }
  public static int defaultStep(int state) { check(state == 0); mark("T1"); return 1; }
  public static boolean noArgumentStop() { mark("N"); return false; }

  public static Object switchFallback(int selector, long wide, double signed, Object value) {
    check(wide == WIDE && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE && value == FIRST);
    mark("F", selector);
    return value;
  }
  public static Object switchA(int selector, long wide, double signed, Object value) {
    check(selector == 0 && wide == WIDE && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE && value == FIRST);
    mark("A0");
    return SECOND;
  }
  public static Object switchB(int selector, long wide, double signed, Object value) {
    check(selector == 1 && wide == WIDE && Double.doubleToRawLongBits(signed) == Long.MIN_VALUE && value == FIRST);
    mark("B1");
    return value;
  }
  public static void switchVoidFallback(int selector, Object value) { check(value == FIRST); mark("F", selector); visits++; }
  public static void switchVoidA(int selector, Object value) { check(selector == 0 && value == FIRST); mark("A0"); visits++; }

  public static void caseWhilePredicateFirst() throws Throwable {
    reset();
    MethodHandle loop = MethodHandles.whileLoop(handle("intInit", int.class, int.class),
        handle("intPred", boolean.class, int.class, int.class), handle("intBody", int.class, int.class, int.class));
    int result = (int) loop.invokeExact(2);
    check(result == 2 && visits == 2);
    order("I,P0,B0,P1,B1,P2");
    emit("cf-while-predicate-first", "order=I,P0,B0,P1,B1,P2;result=2;body-count=2;terminal-body=absent");
  }

  public static void caseWhileZeroDefaultInit() throws Throwable {
    reset();
    MethodHandle primitive = MethodHandles.whileLoop(null, handle("intPred", boolean.class, int.class, int.class),
        handle("intBody", int.class, int.class, int.class));
    check((int) primitive.invokeExact(0) == 0 && visits == 0);
    order("P0");
    emit("cf-while-zero-default-init", "primitive-default=0;order=P0;body=absent");
    reset();
    MethodHandle reference = MethodHandles.whileLoop(null, handle("referenceStop", boolean.class, Object.class, int.class),
        handle("referenceBody", Object.class, Object.class, int.class));
    check((Object) reference.invokeExact(0) == null && visits == 0);
    order("Pnull");
    emit("cf-while-zero-default-init", "reference-default=null;order=Pnull;body=absent");
  }

  public static void caseDoWhileBodyFirst() throws Throwable {
    reset();
    MethodHandle loop = MethodHandles.doWhileLoop(handle("intInit", int.class, int.class),
        handle("intBody", int.class, int.class, int.class), handle("intPred", boolean.class, int.class, int.class));
    check((int) loop.invokeExact(0) == 1 && visits == 1);
    order("I,B0,P1");
    emit("cf-do-while-body-first", "zero-limit=one-body;order=I,B0,P1;result=1");
    reset();
    check((int) loop.invokeExact(2) == 2 && visits == 2);
    order("I,B0,P1,B1,P2");
    emit("cf-do-while-body-first", "order=I,B0,P1,B1,P2;result=2;body-count=2");
  }

  public static void caseWhileWideStateArguments() throws Throwable {
    reset();
    MethodHandle longs = MethodHandles.whileLoop(handle("longInit", long.class, long.class, double.class, Object.class),
        handle("longPred", boolean.class, long.class, long.class, double.class, Object.class),
        handle("longBody", long.class, long.class, long.class, double.class, Object.class));
    check((long) longs.invokeExact(WIDE, -0.0d, FIRST) == WIDE + 2L && visits == 2);
    order("I,P0,B0,P1,B1,P2");
    emit("cf-while-wide-state-arguments", "long=9007199254740995;external-long=9007199254740993;double=-0.0;reference=same;order=I,P0,B0,P1,B1,P2");
    reset();
    MethodHandle doubles = MethodHandles.whileLoop(handle("doubleInit", double.class, double.class, long.class, Object.class),
        handle("doublePred", boolean.class, double.class, double.class, long.class, Object.class),
        handle("doubleBody", double.class, double.class, double.class, long.class, Object.class));
    double result = (double) doubles.invokeExact(-0.0d, WIDE, FIRST);
    check(Double.doubleToRawLongBits(result) == Long.MIN_VALUE && visits == 2);
    order("I,P0,B0,P1,B1,P2");
    emit("cf-while-wide-state-arguments", "double-state=-0.0;external-long=9007199254740993;reference=same;order=I,P0,B0,P1,B1,P2");
  }

  public static void caseLoopVoidSideEffects() throws Throwable {
    reset();
    MethodHandle init = handle("voidInit", void.class, int.class);
    MethodHandle pred = handle("voidPred", boolean.class, int.class);
    MethodHandle body = handle("voidBody", void.class, int.class);
    MethodHandle before = MethodHandles.whileLoop(init, pred, body);
    before.invokeExact(2);
    check(visits == 2); order("I,P0,B0,P1,B1,P2");
    emit("cf-loop-void-side-effects", "while=void;effects=2;order=I,P0,B0,P1,B1,P2");
    reset();
    MethodHandle after = MethodHandles.doWhileLoop(init, body, pred);
    after.invokeExact(0);
    check(visits == 1); order("I,B0,P1");
    emit("cf-loop-void-side-effects", "do-while=void;zero-limit-effects=1;order=I,B0,P1");
  }

  public static void caseCountedIterationsOrder() throws Throwable {
    reset();
    MethodHandle loop = MethodHandles.countedLoop(handle("iterations", int.class, int.class, long.class),
        handle("countedInit", long.class, int.class, long.class),
        handle("countedBody", long.class, long.class, int.class, int.class, long.class));
    check((long) loop.invokeExact(3, WIDE) == WIDE + 3L && visits == 3);
    order("N,I,B0,B1,B2");
    emit("cf-counted-iterations-order", "order=N,I,B0,B1,B2;long=9007199254740996;indices=0/1/2;effects=3");
  }

  public static void caseCountedRangeWideState() throws Throwable {
    reset();
    MethodHandle loop = MethodHandles.countedLoop(handle("rangeStart", int.class, int.class, int.class, long.class),
        handle("rangeEnd", int.class, int.class, int.class, long.class),
        handle("rangeInit", long.class, int.class, int.class, long.class),
        handle("rangeBody", long.class, long.class, int.class, int.class, int.class, long.class));
    check((long) loop.invokeExact(2, 5, WIDE) == WIDE + 9L && visits == 3);
    // Pinned JDK order follows its generic-loop construction, not the API's
    // conflicting end/start/init pseudocode. This is a native-regression case.
    order("E,I,S,B2,B3,B4");
    emit("cf-counted-range-wide-state", "pinned-order=E,I,S,B2,B3,B4;long=9007199254741002;indices=2/3/4;effects=3");
  }

  public static void caseCountedEmptyReversed() throws Throwable {
    MethodHandle loop = MethodHandles.countedLoop(handle("rangeStart", int.class, int.class, int.class, long.class),
        handle("rangeEnd", int.class, int.class, int.class, long.class),
        handle("rangeInit", long.class, int.class, int.class, long.class),
        handle("rangeBody", long.class, long.class, int.class, int.class, int.class, long.class));
    reset();
    check((long) loop.invokeExact(4, 4, WIDE) == WIDE && visits == 0); order("E,I,S");
    emit("cf-counted-empty-reversed", "equal-bounds=pinned-order-E,I,S;result=9007199254740993;body=absent");
    reset();
    check((long) loop.invokeExact(5, 2, WIDE) == WIDE && visits == 0); order("E,I,S");
    emit("cf-counted-empty-reversed", "reversed-bounds=pinned-order-E,I,S;result=9007199254740993;body=absent");
    reset();
    MethodHandle iterations = MethodHandles.countedLoop(handle("iterations", int.class, int.class, long.class),
        handle("countedInit", long.class, int.class, long.class),
        handle("countedBody", long.class, long.class, int.class, int.class, long.class));
    check((long) iterations.invokeExact(-2, WIDE) == WIDE && visits == 0); order("N,I");
    emit("cf-counted-empty-reversed", "negative-iterations=order-N,I;result=9007199254740993;body=absent");
  }

  public static void caseIteratedExplicitOrder() throws Throwable {
    reset();
    List<Object> input = values(SECOND, FIRST);
    MethodHandle loop = MethodHandles.iteratedLoop(handle("iterator", Iterator.class, List.class, Object.class),
        handle("iterInit", Object.class, List.class, Object.class),
        handle("iterBody", Object.class, Object.class, Object.class, List.class, Object.class));
    Object result = (Object) loop.invokeExact(input, FIRST);
    check(result == FIRST && visits == 2); order("R,I,B0,B1");
    emit("cf-iterated-explicit-order", "order=R,I,B0,B1;iterator-before-init;elements/states/return=identity-preserved;effects=2");
    reset();
    List<Object> empty = values();
    check((Object) loop.invokeExact(empty, FIRST) == FIRST && visits == 0); order("R,I");
    emit("cf-iterated-explicit-order", "empty=order-R,I;result=initial-reference;body=absent");
  }

  public static void caseIteratedDefaultEmpty() throws Throwable {
    reset();
    MethodHandle loop = MethodHandles.iteratedLoop(null, null, handle("defaultIterBody", Object.class, Object.class, Object.class));
    Iterable<Object> empty = values();
    check((Object) loop.invokeExact(empty) == null && visits == 0); order("");
    emit("cf-iterated-default-empty", "iterator=Iterable-default;state=null-default;empty-return=null;body=absent");
    reset();
    Iterable<Object> nonempty = values(SECOND, FIRST);
    check((Object) loop.invokeExact(nonempty) == FIRST && visits == 2); order("B0,B1");
    emit("cf-iterated-default-empty", "iterator=Iterable-default;first-state=null;elements/return=same;order=B0,B1;effects=2");
  }

  public static void caseComponentThrowableIdentity() throws Throwable {
    MethodHandle state = MethodHandles.whileLoop(handle("intInit", int.class, int.class),
        handle("intPred", boolean.class, int.class, int.class), handle("intBody", int.class, int.class, int.class));
    for (char role : new char[] {'I', 'P', 'B'}) {
      reset(); failAt = role;
      try { int ignored = (int) state.invokeExact(1); throw new AssertionError(new StringBuilder("missing component failure ").append(ignored).toString()); }
      catch (IllegalStateException caught) { check(caught == FAILURE); }
      String expected = role == 'I' ? "I" : role == 'P' ? "I,P0" : "I,P0,B0";
      order(expected); check(visits == 0);
      emit("cf-component-throwable-identity", new StringBuilder("while-role=").append(role).append(";order=").append(expected)
          .append(";throwable=original;later-components=absent").toString());
    }
    MethodHandle range = MethodHandles.countedLoop(handle("rangeStart", int.class, int.class, int.class, long.class),
        handle("rangeEnd", int.class, int.class, int.class, long.class),
        handle("rangeInit", long.class, int.class, int.class, long.class),
        handle("rangeBody", long.class, long.class, int.class, int.class, int.class, long.class));
    for (char role : new char[] {'E', 'I', 'S'}) {
      reset(); failAt = role;
      try { long ignored = (long) range.invokeExact(0, 1, WIDE); throw new AssertionError(new StringBuilder("missing range failure ").append(ignored).toString()); }
      catch (IllegalStateException caught) { check(caught == FAILURE); }
      String expected = role == 'E' ? "E" : role == 'I' ? "E,I" : "E,I,S";
      order(expected); check(visits == 0);
      emit("cf-component-throwable-identity", new StringBuilder("range-role=").append(role).append(";pinned-order=").append(expected)
          .append(";throwable=original;later-components=absent").toString());
    }
    MethodHandle iterated = MethodHandles.iteratedLoop(handle("iterator", Iterator.class, List.class, Object.class),
        handle("iterInit", Object.class, List.class, Object.class),
        handle("iterBody", Object.class, Object.class, Object.class, List.class, Object.class));
    List<Object> input = values(SECOND);
    for (char role : new char[] {'R', 'I', 'B'}) {
      reset(); failAt = role;
      try { Object ignored = (Object) iterated.invokeExact(input, FIRST); throw new AssertionError(new StringBuilder("missing iterator failure ").append(ignored).toString()); }
      catch (IllegalStateException caught) { check(caught == FAILURE); }
      String expected = role == 'R' ? "R" : role == 'I' ? "R,I" : "R,I,B0";
      order(expected); check(visits == 0);
      emit("cf-component-throwable-identity", new StringBuilder("iterated-role=").append(role).append(";order=").append(expected)
          .append(";throwable=original;later-components=absent").toString());
    }
    MethodHandle general = MethodHandles.loop(new MethodHandle[] {handle("intInit", int.class, int.class),
        handle("generalStep", int.class, int.class, int.class), handle("generalPred", boolean.class, int.class, int.class),
        handle("generalFini", int.class, int.class, int.class)});
    reset(); failAt = 'F';
    try { int ignored = (int) general.invokeExact(1); throw new AssertionError(new StringBuilder("missing finalizer failure ").append(ignored).toString()); }
    catch (IllegalStateException caught) { check(caught == FAILURE); }
    check(visits == 1); order("I,T1,P1,F1");
    emit("cf-component-throwable-identity", "general-fini=order-I,T1,P1,F1;throwable=original;body-completed=1");
  }

  public static void caseGeneralOneClauseOrder() throws Throwable {
    reset();
    MethodHandle loop = MethodHandles.loop(new MethodHandle[] {handle("intInit", int.class, int.class),
        handle("generalStep", int.class, int.class, int.class), handle("generalPred", boolean.class, int.class, int.class),
        handle("generalFini", int.class, int.class, int.class)});
    check((int) loop.invokeExact(2) == 2 && visits == 2); order("I,T1,P1,T2,P2,F2");
    emit("cf-general-one-clause-order", "order=I,T1,P1,T2,P2,F2;step-before-predicate;result=2;fini=once");
  }

  public static void caseGeneralDependentClauses() throws Throwable {
    MethodHandle loop = MethodHandles.loop(new MethodHandle[] {handle("initA", int.class, int.class),
        handle("stepA", int.class, int.class, long.class, int.class), handle("predA", boolean.class, int.class, long.class, int.class),
        handle("finiA", long.class, int.class, long.class, int.class)},
        new MethodHandle[] {handle("initB", long.class, int.class), handle("stepB", long.class, int.class, long.class, int.class),
            handle("predB", boolean.class, int.class, long.class, int.class), handle("finiB", long.class, int.class, long.class, int.class)});
    reset();
    check((long) loop.invokeExact(2) == WIDE + 1L && aCalls == 2 && bCalls == 1);
    order("IA,IB,A1,P1,B1,Q1,A2,P2,FA");
    emit("cf-general-dependent-clauses", "first-exit=order-IA,IB,A1,P1,B1,Q1,A2,P2,FA;long=9007199254740994;second-clause-after-false=absent");
    reset();
    check((long) loop.invokeExact(3) == WIDE + 3L && aCalls == 2 && bCalls == 2);
    order("IA,IB,A1,P1,B1,Q1,A2,P2,B2,Q2,FB");
    emit("cf-general-dependent-clauses", "second-exit=order-IA,IB,A1,P1,B1,Q1,A2,P2,B2,Q2,FB;long=9007199254740996;updated-earlier-state=visible;fini=selected");
  }

  public static void caseGeneralNullVarargsHelpers() throws Throwable {
    reset();
    callerArray = new Object[] {FIRST, SECOND};
    MethodHandle step = handle("varStep", int.class, int.class, Object[].class);
    MethodHandle pred = handle("varPred", boolean.class, int.class, Object[].class);
    MethodHandle fini = handle("varFini", Object.class, int.class, Object[].class);
    check(step.isVarargsCollector() && pred.isVarargsCollector() && fini.isVarargsCollector());
    MethodHandle variable = MethodHandles.loop(new MethodHandle[] {null, step, pred, fini});
    check(!variable.isVarargsCollector() && (Object) variable.invokeExact(callerArray) == callerArray && visits == 2);
    order("T2,P2,T4,P4,F4");
    emit("cf-general-null-varargs-helpers", "null-init=0;helpers=varargs-normalized-fixed;array=original;order=T2,P2,T4,P4,F4;return=same");
    reset();
    MethodHandle invariant = MethodHandles.loop(new MethodHandle[] {handle("intInit", int.class, int.class), null,
        handle("invariantPred", boolean.class, int.class, int.class), null});
    invariant.invokeExact(7);
    check(visits == 0); order("I,P0");
    emit("cf-general-null-varargs-helpers", "null-step=identity-state;null-fini=void;order=I,P0;body=absent");
    reset();
    MethodHandle defaults = MethodHandles.loop(new MethodHandle[] {null, handle("defaultStep", int.class, int.class)},
        new MethodHandle[] {null, null, handle("noArgumentStop", boolean.class), null}, new MethodHandle[] {null, null, null, null});
    defaults.invokeExact(); order("T1,N");
    emit("cf-general-null-varargs-helpers", "null-init=0;null-predicate=true;void-clause/all-null-clause=normalized;order=T1,N;return=void");
  }

  public static void caseTableSwitchWideDefault() throws Throwable {
    reset();
    MethodHandle table = MethodHandles.tableSwitch(handle("switchFallback", Object.class, int.class, long.class, double.class, Object.class),
        handle("switchA", Object.class, int.class, long.class, double.class, Object.class),
        handle("switchB", Object.class, int.class, long.class, double.class, Object.class));
    check((Object) table.invokeExact(-1, WIDE, -0.0d, FIRST) == FIRST);
    check((Object) table.invokeExact(0, WIDE, -0.0d, FIRST) == SECOND);
    check((Object) table.invokeExact(1, WIDE, -0.0d, FIRST) == FIRST);
    check((Object) table.invokeExact(2, WIDE, -0.0d, FIRST) == FIRST);
    order("F-1,A0,B1,F2");
    emit("cf-table-switch-wide-default", "order=F-1,A0,B1,F2;branches=exclusive;selector-forwarded;long=9007199254740993;double=-0.0;references=same");
  }

  public static void caseTableSwitchVoidErrors() throws Throwable {
    reset();
    MethodHandle fallback = handle("switchVoidFallback", void.class, int.class, Object.class);
    MethodHandle branch = handle("switchVoidA", void.class, int.class, Object.class);
    MethodHandle table = MethodHandles.tableSwitch(fallback, branch);
    table.invokeExact(-1, FIRST); table.invokeExact(0, FIRST); table.invokeExact(1, FIRST);
    check(visits == 3); order("F-1,A0,F1");
    emit("cf-table-switch-void-errors", "void-order=F-1,A0,F1;selected-effects=3;references=same");
    reset(); failAt = 'A';
    try { table.invokeExact(0, FIRST); throw new AssertionError("missing selected target failure"); }
    catch (IllegalStateException caught) { check(caught == FAILURE); }
    check(visits == 0); order("A0");
    emit("cf-table-switch-void-errors", "selected-target-order=A0;throwable=original;fallback/later-effects=absent");
    reset();
    int errors = 0;
    try { MethodHandles.tableSwitch(null, branch); } catch (NullPointerException expected) { errors++; }
    try { MethodHandles.tableSwitch(fallback, (MethodHandle[]) null); } catch (NullPointerException expected) { errors++; }
    try { MethodHandles.tableSwitch(fallback, new MethodHandle[] {null}); } catch (NullPointerException expected) { errors++; }
    try { MethodHandles.tableSwitch(fallback, new MethodHandle[0]); } catch (IllegalArgumentException expected) { errors++; }
    try { MethodHandles.tableSwitch(MethodHandles.empty(MethodType.methodType(void.class, Object.class)), branch); }
    catch (IllegalArgumentException expected) { errors++; }
    try { MethodHandles.tableSwitch(fallback, handle("switchA", Object.class, int.class, long.class, double.class, Object.class)); }
    catch (IllegalArgumentException expected) { errors++; }
    check(errors == 6 && visits == 0); order("");
    emit("cf-table-switch-void-errors", "factory-errors=null-fallback/null-array/null-element/empty/wrong-selector/mismatched-type;count=6;callbacks=absent");
  }

  public static void main(String[] arguments) throws Throwable {
    caseWhilePredicateFirst();
    caseWhileZeroDefaultInit();
    caseDoWhileBodyFirst();
    caseWhileWideStateArguments();
    caseLoopVoidSideEffects();
    caseCountedIterationsOrder();
    caseCountedRangeWideState();
    caseCountedEmptyReversed();
    caseIteratedExplicitOrder();
    caseIteratedDefaultEmpty();
    caseComponentThrowableIdentity();
    caseGeneralOneClauseOrder();
    caseGeneralDependentClauses();
    caseGeneralNullVarargsHelpers();
    caseTableSwitchWideDefault();
    caseTableSwitchVoidErrors();
    System.out.println("METHODHANDLE_CONTROL_FLOW_OK");
  }
}
