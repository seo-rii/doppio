package classes.modern_test;

/** Selected final Java 25 constructor paths; no preview or bootstrap-dependent expressions. */
public final class JavaFinalConstructors {
  private static final StringBuilder ORDER = new StringBuilder();
  private static int superCalls;
  private static int argumentCalls;
  private static int targetCalls;
  private static int epilogueCalls;
  private static int initializerCalls;

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("Final constructor probe failed");
  }

  private static void mark(String value) {
    if (ORDER.length() != 0) ORDER.append(',');
    ORDER.append(value);
  }

  private static void reset() {
    ORDER.setLength(0);
    superCalls = 0;
    argumentCalls = 0;
    targetCalls = 0;
    epilogueCalls = 0;
    initializerCalls = 0;
  }

  private static void emit(String id, String value) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(value);
  }

  private static void emitOrder(String id, String expected) {
    check(ORDER.toString().equals(expected));
    emit(id, new StringBuilder().append("order=").append(ORDER).toString());
  }

  private static boolean same(Throwable actual, Throwable expected) { return actual == expected; }

  private static int argument(String label, int value, Throwable failure) throws Throwable {
    mark(label);
    argumentCalls++;
    if (failure != null) throw failure;
    return value;
  }

  private static void fail(String label, Throwable failure) throws Throwable {
    mark(label);
    if (failure != null) throw failure;
  }

  private static int initialize(String label) {
    mark(label);
    initializerCalls++;
    return 37;
  }

  private static class PairBase {
    final int first;
    final int second;

    PairBase(int first, int second, Throwable failure) throws Throwable {
      mark("super-body");
      superCalls++;
      if (failure != null) throw failure;
      this.first = first;
      this.second = second;
      mark("super-end");
    }
  }

  private static final class SuperArguments extends PairBase {
    SuperArguments(Throwable firstFailure, Throwable secondFailure) throws Throwable {
      mark("prologue");
      super(argument("arg1", 11, firstFailure), argument("arg2", 22, secondFailure), null);
      mark("epilogue");
      epilogueCalls++;
    }
  }

  private static final class ThisArgument extends PairBase {
    ThisArgument(Throwable failure) throws Throwable {
      mark("outer-prologue");
      this(argument("this-arg", 7, failure));
      mark("outer-epilogue");
      epilogueCalls++;
    }

    ThisArgument(int value) throws Throwable {
      mark("inner-prologue");
      targetCalls++;
      super(value, 0, null);
      mark("inner-epilogue");
      epilogueCalls++;
    }
  }

  private static final class SuperFailure extends PairBase {
    SuperFailure(Throwable failure) throws Throwable {
      mark("prologue");
      super(argument("arg1", 11, null), argument("arg2", 22, null), failure);
      mark("epilogue");
      epilogueCalls++;
    }
  }

  private static final class DelegatedFailure extends PairBase {
    DelegatedFailure(Throwable failure) throws Throwable {
      mark("outer-prologue");
      this(0, failure);
      mark("outer-epilogue");
      epilogueCalls++;
    }

    DelegatedFailure(int ignored, Throwable failure) throws Throwable {
      mark("inner-prologue");
      targetCalls++;
      super(11, 22, null);
      mark("inner-epilogue");
      epilogueCalls++;
      throw failure;
    }
  }

  private static final class Outer {
    class InnerBase {
      final int first;
      final int second;

      InnerBase(int first, int second) {
        mark("super-body");
        superCalls++;
        this.first = first;
        this.second = second;
        mark("super-end");
      }

      Outer owner() { return Outer.this; }
    }
  }

  private static Outer qualifier(Outer outer, Throwable failure) throws Throwable {
    mark("primary");
    if (failure != null) throw failure;
    return outer;
  }

  private static final class Qualified extends Outer.InnerBase {
    Qualified(Outer outer, Throwable failure) throws Throwable {
      mark("prologue");
      qualifier(outer, failure).super(argument("arg1", 11, null), argument("arg2", 22, null));
      mark("epilogue");
      epilogueCalls++;
    }
  }

  private static final class InitializerFailure extends PairBase {
    Throwable original;
    int firstInitializer = initialize("initializer-first");
    {
      fail("initializer-throw", original);
    }
    int laterInitializer = initialize("initializer-later");

    InitializerFailure(Throwable failure) throws Throwable {
      mark("prologue");
      this.original = failure;
      super(11, 22, null);
      mark("epilogue");
      epilogueCalls++;
    }
  }

  private static final class CleanupFailure extends PairBase {
    CleanupFailure(Throwable failure) throws Throwable {
      mark("prologue");
      try {
        mark("prologue-work");
      } finally {
        fail("prologue-cleanup", failure);
      }
      super(11, 22, null);
      mark("epilogue");
      epilogueCalls++;
    }
  }

  private static void caseSuperArg1Throw() {
    reset();
    Throwable original = new IllegalStateException("first constructor argument");
    Throwable actual = null;
    try { new SuperArguments(original, null); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(argumentCalls == 1 && superCalls == 0 && epilogueCalls == 0);
    emitOrder("fc-super-arg1-throw", "prologue,arg1");
    emit("fc-super-arg1-throw", "primary=same");
    emit("fc-super-arg1-throw", "unreached=arg2,super,epilogue");
  }

  private static void caseSuperArg2Throw() {
    reset();
    Throwable original = new AssertionError("second constructor argument");
    Throwable actual = null;
    try { new SuperArguments(null, original); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(argumentCalls == 2 && superCalls == 0 && epilogueCalls == 0);
    emitOrder("fc-super-arg2-throw", "prologue,arg1,arg2");
    emit("fc-super-arg2-throw", "primary=same");
    emit("fc-super-arg2-throw", "unreached=super,epilogue");
  }

  private static void caseThisArgThrow() {
    reset();
    Throwable original = new IllegalStateException("alternate constructor argument");
    Throwable actual = null;
    try { new ThisArgument(original); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(argumentCalls == 1 && targetCalls == 0 && superCalls == 0 && epilogueCalls == 0);
    emitOrder("fc-this-arg-throw", "outer-prologue,this-arg");
    emit("fc-this-arg-throw", "primary=same");
    emit("fc-this-arg-throw", "unreached=target,outer-epilogue");
  }

  private static void caseSuperCtorThrow() {
    reset();
    Throwable original = new IllegalStateException("superclass constructor");
    Throwable actual = null;
    try { new SuperFailure(original); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(argumentCalls == 2 && superCalls == 1 && epilogueCalls == 0);
    emitOrder("fc-super-ctor-throw", "prologue,arg1,arg2,super-body");
    emit("fc-super-ctor-throw", "primary=same");
    emit("fc-super-ctor-throw", "unreached=super-end,epilogue");
  }

  private static void caseDelegatedCtorThrow() {
    reset();
    Throwable original = new IllegalStateException("delegated constructor");
    Throwable actual = null;
    try { new DelegatedFailure(original); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(targetCalls == 1 && superCalls == 1 && epilogueCalls == 1);
    emitOrder("fc-delegated-ctor-throw", "outer-prologue,inner-prologue,super-body,super-end,inner-epilogue");
    emit("fc-delegated-ctor-throw", "primary=same");
    emit("fc-delegated-ctor-throw", "unreached=outer-epilogue");
  }

  private static void caseQualifiedPrimaryOrder() {
    reset();
    Outer outer = new Outer();
    Outer.InnerBase value = null;
    try { value = new Qualified(outer, null); }
    catch (Throwable failure) { throw new AssertionError("Qualified constructor unexpectedly failed"); }
    check(value != null && value.owner() == outer);
    check(value.first == 11 && value.second == 22);
    check(argumentCalls == 2 && superCalls == 1 && epilogueCalls == 1);
    emitOrder("fc-qualified-primary-order", "prologue,primary,arg1,arg2,super-body,super-end,epilogue");
    emit("fc-qualified-primary-order", "owner=same");
    emit("fc-qualified-primary-order", "values=11,22");
  }

  private static void caseQualifiedPrimaryThrow() {
    reset();
    Throwable original = new IllegalStateException("qualified primary");
    Throwable actual = null;
    try { new Qualified(new Outer(), original); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(argumentCalls == 0 && superCalls == 0 && epilogueCalls == 0);
    emitOrder("fc-qualified-primary-throw", "prologue,primary");
    emit("fc-qualified-primary-throw", "primary=same");
    emit("fc-qualified-primary-throw", "unreached=arg1,arg2,super,epilogue");
  }

  private static void caseQualifiedPrimaryNull() {
    reset();
    Throwable actual = null;
    try { new Qualified(null, null); }
    catch (Throwable caught) { actual = caught; }
    check(actual != null && actual.getClass() == NullPointerException.class);
    check(argumentCalls == 0 && superCalls == 0 && epilogueCalls == 0);
    emitOrder("fc-qualified-primary-null", "prologue,primary");
    emit("fc-qualified-primary-null", "failure=java.lang.NullPointerException");
    emit("fc-qualified-primary-null", "unreached=arg1,arg2,super,epilogue");
  }

  private static void caseInstanceInitializerThrow() {
    reset();
    Throwable original = new IllegalStateException("instance initializer");
    Throwable actual = null;
    try { new InitializerFailure(original); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(superCalls == 1 && initializerCalls == 1 && epilogueCalls == 0);
    emitOrder("fc-instance-initializer-throw", "prologue,super-body,super-end,initializer-first,initializer-throw");
    emit("fc-instance-initializer-throw", "primary=same");
    emit("fc-instance-initializer-throw", "unreached=initializer-later,epilogue");
  }

  private static void casePrologueCleanupThrow() {
    reset();
    Throwable original = new IllegalStateException("prologue cleanup");
    Throwable actual = null;
    try { new CleanupFailure(original); }
    catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    check(superCalls == 0 && epilogueCalls == 0);
    emitOrder("fc-prologue-cleanup-throw", "prologue,prologue-work,prologue-cleanup");
    emit("fc-prologue-cleanup-throw", "primary=same");
    emit("fc-prologue-cleanup-throw", "unreached=super,epilogue");
  }

  public static void main(String[] args) {
    caseSuperArg1Throw();
    caseSuperArg2Throw();
    caseThisArgThrow();
    caseSuperCtorThrow();
    caseDelegatedCtorThrow();
    caseQualifiedPrimaryOrder();
    caseQualifiedPrimaryThrow();
    caseQualifiedPrimaryNull();
    caseInstanceInitializerThrow();
    casePrologueCleanupThrow();
    System.out.println("FINAL_CONSTRUCTORS_OK");
  }
}
