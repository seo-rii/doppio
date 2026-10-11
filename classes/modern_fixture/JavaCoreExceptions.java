package classes.modern_test;

/** JVM execution slices, not a claim that every JLS statement form is covered. */
public final class JavaCoreExceptions {
  private static final StringBuilder ORDER = new StringBuilder();

  static class Base extends Exception { }
  static final class A extends Base { }
  static final class B extends Base { }
  static final class Marker extends RuntimeException {
    Marker(String label) { super(label); }
  }

  static final class Resource implements AutoCloseable {
    private final String name;
    private final Marker failure;

    Resource(String name, Marker failure) { this.name = name; this.failure = failure; }

    public void close() {
      resourceMark(name, "-");
      if (failure != null) throw failure;
    }
  }

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("Core exception probe failed");
  }

  private static void emit(String id, String event) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(event);
  }

  private static void mark(String event) {
    if (ORDER.length() != 0) ORDER.append(',');
    ORDER.append(event);
  }

  private static void resourceMark(String name, String suffix) {
    if (ORDER.length() != 0) ORDER.append(',');
    ORDER.append(name).append(suffix);
  }

  private static void reset() { ORDER.setLength(0); }
  private static void order(String expected) { check(ORDER.toString().equals(expected)); }

  static void throwExact(Throwable value) throws Throwable { throw value; }

  static int handlerOrder(Throwable value) {
    try { throwExact(value); }
    catch (A caught) { return 1; }
    catch (Base caught) { return 2; }
    catch (Error caught) { return 3; }
    catch (Throwable caught) { return 4; }
    return 0;
  }

  static Throwable multiCatch(Throwable value) throws Throwable {
    try { throwExact(value); }
    catch (A | B caught) { return caught; }
    throw new AssertionError("Expected a thrown value");
  }

  static void rethrow(Throwable value) throws Throwable {
    try { throwExact(value); }
    catch (Throwable caught) {
      check(caught == value);
      mark("inner");
      throw caught;
    }
  }

  static void unwind(int depth, Throwable value) throws Throwable {
    if (ORDER.length() != 0) ORDER.append(',');
    ORDER.append(depth);
    if (depth == 0) throwExact(value);
    else unwind(depth - 1, value);
    mark("after-call");
  }

  private static long before(long value) { mark("before"); return value; }
  private static int explode(Throwable value) throws Throwable { mark("throw"); throw value; }
  private static double laterArgument() { mark("later-argument"); return 2.5; }
  private static int take(long first, int second, double third) {
    throw new AssertionError("Invocation after a throwing argument");
  }

  static int stackCleared(Throwable value) {
    int saved = 73;
    try { return take(before(11L), explode(value), laterArgument()); }
    catch (Throwable caught) {
      check(caught == value);
      mark("catch");
      return saved;
    }
  }

  static void normalFinally() {
    try { mark("try"); }
    finally { mark("finally"); }
    mark("after");
  }

  static long keepReturn(long value) {
    try { return value; }
    finally { value = 99L; mark("finally"); }
  }

  static int returnWins() {
    try { return 7; }
    finally { return 9; }
  }

  static int throwOverReturn(Throwable replacement) throws Throwable {
    try { return 7; }
    finally { throw replacement; }
  }

  static int returnOverThrow(Throwable original) {
    try { throwExact(original); }
    finally { return 9; }
  }

  static void throwOverThrow(Throwable original, Throwable replacement) throws Throwable {
    try { throwExact(original); }
    finally { throw replacement; }
  }

  static void nestedFinally(Throwable original) throws Throwable {
    try {
      try { mark("try"); throwExact(original); }
      finally { mark("inner-finally"); }
    } finally { mark("outer-finally"); }
  }

  private static Resource open(String name, Marker closeFailure, Marker acquireFailure) {
    resourceMark(name, acquireFailure == null ? "+" : "+!");
    if (acquireFailure != null) throw acquireFailure;
    return new Resource(name, closeFailure);
  }

  static void resources(Marker body, Marker closeA, Marker closeB, Marker acquireB) {
    try (Resource a = open("A", closeA, null); Resource b = open("B", closeB, acquireB)) {
      if (body != null) { mark("body!"); throw body; }
      mark("body");
    }
  }

  static void caseIdentity() {
    Throwable original = new Marker("original");
    boolean caughtValue = false;
    try { throwExact(original); }
    catch (Throwable caught) { check(caught == original); caughtValue = true; }
    check(caughtValue);
    emit("exceptions-identity", "same");
  }

  static void caseHandlerOrder() {
    check(handlerOrder(new A()) == 1 && handlerOrder(new Base()) == 2 &&
      handlerOrder(new Error()) == 3 && handlerOrder(new Throwable()) == 4);
    emit("exceptions-handler-order", "1,2,3,4");
  }

  static void caseMultiCatch() throws Throwable {
    Throwable a = new A(), b = new B();
    check(multiCatch(a) == a && multiCatch(b) == b);
    emit("exceptions-multi-catch", "A=same;B=same");
  }

  static void caseRethrow() {
    Throwable original = new Marker("original");
    reset();
    try { rethrow(original); }
    catch (Throwable caught) { check(caught == original); mark("outer"); }
    order("inner,outer");
    emit("exceptions-rethrow", "inner,outer;same");
  }

  static void caseUnwind() {
    Throwable original = new Marker("original");
    reset();
    try { unwind(3, original); }
    catch (Throwable caught) { check(caught == original); mark("catch"); }
    order("3,2,1,0,catch");
    emit("exceptions-unwind", "3,2,1,0,catch;same;after-call=absent");
  }

  static void caseNullThrow() {
    Throwable saved = null;
    try { throwExact(null); }
    catch (Throwable caught) { check(caught.getClass() == NullPointerException.class); saved = caught; }
    check(saved != null);
    boolean caughtAgain = false;
    try { throwExact(saved); }
    catch (Throwable caught) { check(caught == saved); caughtAgain = true; }
    check(caughtAgain);
    emit("exceptions-null-throw", "java.lang.NullPointerException;rethrow=same");
  }

  static void caseStackClear() {
    reset();
    check(stackCleared(new Marker("original")) == 73);
    order("before,throw,catch");
    emit("exceptions-stack-clear", "before,throw,catch;value=73;later-argument=absent");
  }

  static void caseNormalFinally() {
    reset(); normalFinally(); order("try,finally,after");
    emit("exceptions-normal-finally", "try,finally,after");
  }

  static void caseReturnFinally() {
    reset(); check(keepReturn(9007199254740993L) == 9007199254740993L); order("finally");
    emit("exceptions-return-finally", "finally;value=9007199254740993");
  }

  static void caseReturnWins() {
    check(returnWins() == 9);
    emit("exceptions-return-wins", "value=9");
  }

  static void caseThrowOverReturn() {
    Throwable replacement = new Marker("replacement");
    boolean caughtValue = false;
    try { throwOverReturn(replacement); }
    catch (Throwable caught) { check(caught == replacement); caughtValue = true; }
    check(caughtValue);
    emit("exceptions-throw-over-return", "same-replacement;no-return");
  }

  static void caseReturnOverThrow() {
    Throwable original = new Marker("original");
    check(returnOverThrow(original) == 9 && original.getSuppressed().length == 0);
    emit("exceptions-return-over-throw", "value=9;original-suppressed=0");
  }

  static void caseThrowOverThrow() {
    Throwable original = new Marker("original"), replacement = new Marker("replacement");
    boolean caughtValue = false;
    try { throwOverThrow(original, replacement); }
    catch (Throwable caught) {
      check(caught == replacement && caught.getSuppressed().length == 0 && original.getSuppressed().length == 0);
      caughtValue = true;
    }
    check(caughtValue);
    emit("exceptions-throw-over-throw", "replacement=same;suppressed=0");
  }

  static void caseNestedFinally() {
    Throwable original = new Marker("original");
    reset();
    try { nestedFinally(original); }
    catch (Throwable caught) { check(caught == original); mark("catch"); }
    order("try,inner-finally,outer-finally,catch");
    emit("exceptions-nested-finally", "try,inner-finally,outer-finally,catch;same");
  }

  static void caseResourceNormal() {
    reset(); resources(null, null, null, null); order("A+,B+,body,B-,A-");
    emit("exceptions-resource-normal", "A+,B+,body,B-,A-;normal");
  }

  static void caseResourceBody() {
    Marker primary = new Marker("P"), a = new Marker("A"), b = new Marker("B");
    boolean caughtValue = false;
    reset();
    try { resources(primary, a, b, null); }
    catch (Throwable caught) {
      Throwable[] suppressed = caught.getSuppressed();
      check(caught == primary && suppressed.length == 2 && suppressed[0] == b && suppressed[1] == a);
      caughtValue = true;
    }
    check(caughtValue); order("A+,B+,body!,B-,A-");
    emit("exceptions-resource-body", "A+,B+,body!,B-,A-;primary=P;suppressed=B,A");
  }

  static void caseResourceClose() {
    Marker a = new Marker("A"), b = new Marker("B");
    boolean caughtValue = false;
    reset();
    try { resources(null, a, b, null); }
    catch (Throwable caught) {
      Throwable[] suppressed = caught.getSuppressed();
      check(caught == b && suppressed.length == 1 && suppressed[0] == a);
      caughtValue = true;
    }
    check(caughtValue); order("A+,B+,body,B-,A-");
    emit("exceptions-resource-close", "A+,B+,body,B-,A-;primary=B;suppressed=A");
  }

  static void caseResourceAcquire() {
    Marker a = new Marker("A"), b = new Marker("B");
    boolean caughtValue = false;
    reset();
    try { resources(null, a, null, b); }
    catch (Throwable caught) {
      Throwable[] suppressed = caught.getSuppressed();
      check(caught == b && suppressed.length == 1 && suppressed[0] == a);
      caughtValue = true;
    }
    check(caughtValue); order("A+,B+!,A-");
    emit("exceptions-resource-acquire", "A+,B+!,A-;primary=B;suppressed=A;body=absent");
  }

  public static void main(String[] args) throws Throwable {
    caseIdentity(); caseHandlerOrder(); caseMultiCatch(); caseRethrow(); caseUnwind(); caseNullThrow(); caseStackClear();
    caseNormalFinally(); caseReturnFinally(); caseReturnWins(); caseThrowOverReturn(); caseReturnOverThrow();
    caseThrowOverThrow(); caseNestedFinally(); caseResourceNormal(); caseResourceBody(); caseResourceClose(); caseResourceAcquire();
    System.out.println("CORE_EXCEPTIONS_OK");
  }
}
