package classes.modern_test;

/** Genuine final switch statements/expressions, not complete language conformance. */
public final class JavaFinalSwitchFlow {
  private static final StringBuilder ORDER = new StringBuilder();
  private static final RuntimeException FINALLY_FAILURE = new IllegalStateException("finally failure");
  private static final RuntimeException VALUE_FAILURE = new IllegalStateException("yield value failure");
  private record Empty() {}

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("Final switch flow probe failed");
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
  private static void reset() { ORDER.setLength(0); }
  private static void order(String expected) { check(ORDER.toString().equals(expected)); }
  private static int value(int input) { mark("value"); return input; }
  private static int throwingValue() { mark("value!"); throw VALUE_FAILURE; }
  private static long longValue(long input) { mark("value"); return input; }
  private static double doubleValue(double input) { mark("value"); return input; }
  private static Object referenceValue(Object input) { mark("value"); return input; }

  static int combined(Object input) {
    return switch (input) {
      case String text -> { mark("string"); yield text.length(); }
      case null, default -> { mark("combined"); yield -1; }
    };
  }
  static int defaultAlone(Object input) {
    return switch (input) {
      case String text -> { mark("string"); yield text.length(); }
      default -> { mark("default"); yield -1; }
    };
  }
  static void colonRecords(Object input) {
    switch (input) {
      case String text:
        check(text.length() == 6);
        mark("string");
      case Empty():
        mark("empty");
      default:
        mark("default");
    }
  }
  static void arrowRecords(Object input) {
    switch (input) {
      case String text -> { check(text.length() == 6); mark("string"); }
      case Empty() -> mark("empty");
      default -> mark("default");
    }
  }
  static void colonConstants(int input) {
    switch (input) {
      case 1, 1000:
        mark("multi");
      case 2000:
        mark("tail");
        break;
      default:
        mark("default");
    }
  }
  static int normalFinally(int input) {
    return switch (input) {
      case 1 -> {
        try { mark("try"); yield value(17); }
        finally { mark("finally"); }
      }
      default -> -1;
    };
  }
  static int finallyThrow(int input) {
    return switch (input) {
      case 1 -> {
        try { mark("try"); yield value(17); }
        finally { mark("finally"); throw FINALLY_FAILURE; }
      }
      default -> -1;
    };
  }
  static int expressionThrow(int input) {
    return switch (input) {
      case 1 -> {
        try { mark("try"); yield throwingValue(); }
        finally { mark("finally"); }
      }
      default -> -1;
    };
  }
  static int nestedYield(int input) {
    return switch (input) {
      case 1 -> {
        try {
          mark("outer");
          int inner = switch (input) {
            case 1 -> {
              try { mark("inner"); yield value(5); }
              finally { mark("inner-finally"); }
            }
            default -> -1;
          };
          mark("outer-value");
          yield inner + 2;
        } finally { mark("outer-finally"); }
      }
      default -> -1;
    };
  }
  static int labeledBreak(int input) {
    int result = 0;
    exit: {
      switch (input) {
        case 1:
          try { mark("body"); result = 7; break exit; }
          finally { mark("finally"); }
        default:
          mark("default");
      }
      mark("tail");
    }
    mark("after");
    return result;
  }
  static int labeledContinue() {
    int count = 0;
    outer: for (int i = 0; i < 2; i++) {
      count++;
      switch (i) {
        case 0:
          try { mark("body0"); continue outer; }
          finally { mark("finally0"); }
        default:
          mark("body1");
      }
      mark("tail");
    }
    mark("after");
    return count;
  }
  static int returnFinally(int input) {
    switch (input) {
      case 1:
        try { return value(17); }
        finally { mark("finally"); }
      default:
        return -1;
    }
  }
  static long yieldLong(int input) {
    return switch (input) {
      case 1 -> {
        try { yield longValue(9007199254740993L); }
        finally { mark("finally"); }
      }
      default -> 0L;
    };
  }
  static double yieldDouble(int input) {
    return switch (input) {
      case 1 -> {
        try { yield doubleValue(-3.25); }
        finally { mark("finally"); }
      }
      default -> 0.0;
    };
  }
  static Object referenceYield(Object input, int mode) {
    return switch (mode) {
      case 1 -> {
        try { yield referenceValue(input); }
        finally { mark("finally"); }
      }
      default -> {
        try { yield referenceValue(null); }
        finally { mark("finally"); }
      }
    };
  }

  static void caseNullDefaultCombined() {
    reset(); check(combined(null) == -1); order("combined");
    reset(); check(combined(new Object()) == -1); order("combined");
    reset(); check(combined("modern") == 6); order("string");
    emit("fs-null-default-combined", "null=combined;other=combined;string=string");
  }
  static void caseDefaultAloneNullRejection() {
    reset(); check(defaultAlone("modern") == 6); order("string");
    reset(); check(defaultAlone(new Object()) == -1); order("default");
    reset();
    try { defaultAlone(null); throw new AssertionError("Default must not match null"); }
    catch (NullPointerException caught) { order(""); }
    emit("fs-default-alone-null-rejection", "string=string;other=default;null=NullPointerException;null-body=absent");
  }
  static void caseColonZeroRecordFallthrough() {
    reset(); colonRecords("modern"); order("string,empty,default");
    reset(); colonRecords(new Empty()); order("empty,default");
    reset(); colonRecords(new Object()); order("default");
    emit("fs-colon-zero-record-fallthrough", "string=string,empty,default;empty=empty,default;other=default");
  }
  static void caseArrowNoFallthrough() {
    reset(); arrowRecords("modern"); mark("after"); order("string,after");
    reset(); arrowRecords(new Empty()); mark("after"); order("empty,after");
    reset(); arrowRecords(new Object()); mark("after"); order("default,after");
    emit("fs-arrow-no-fallthrough", "string=string;empty=empty;other=default;after=3");
  }
  static void caseColonMultipleConstants() {
    reset(); colonConstants(1); order("multi,tail");
    reset(); colonConstants(1000); order("multi,tail");
    reset(); colonConstants(2000); order("tail");
    reset(); colonConstants(7); order("default");
    emit("fs-colon-multiple-constants", "1=multi,tail;1000=multi,tail;2000=tail;other=default");
  }
  static void caseYieldNormalFinally() {
    reset(); check(normalFinally(1) == 17); mark("after"); order("try,value,finally,after");
    emit("fs-yield-normal-finally", "try,value,finally,after;value=17");
  }
  static void caseYieldFinallyThrow() {
    reset();
    try { finallyThrow(1); throw new AssertionError("Finally must discard yield"); }
    catch (RuntimeException caught) { check(caught == FINALLY_FAILURE); mark("catch"); }
    order("try,value,finally,catch");
    emit("fs-yield-finally-throw", "try,value,finally,catch;same;result=absent");
  }
  static void caseYieldExpressionThrow() {
    reset();
    try { expressionThrow(1); throw new AssertionError("Yield expression must throw"); }
    catch (RuntimeException caught) { check(caught == VALUE_FAILURE); mark("catch"); }
    order("try,value!,finally,catch");
    emit("fs-yield-expression-throw", "try,value!,finally,catch;same;result=absent");
  }
  static void caseNestedYieldTarget() {
    reset(); check(nestedYield(1) == 7); mark("after");
    order("outer,inner,value,inner-finally,outer-value,outer-finally,after");
    emit("fs-nested-yield-target", "outer,inner,value,inner-finally,outer-value,outer-finally,after;value=7");
  }
  static void caseLabeledBreakFinally() {
    reset(); check(labeledBreak(1) == 7); order("body,finally,after");
    emit("fs-labeled-break-finally", "body,finally,after;value=7;tail=absent");
  }
  static void caseLabeledContinueFinally() {
    reset(); check(labeledContinue() == 2); order("body0,finally0,body1,tail,after");
    emit("fs-labeled-continue-finally", "body0,finally0,body1,tail,after;iterations=2");
  }
  static void caseReturnFinally() {
    reset(); check(returnFinally(1) == 17); mark("after"); order("value,finally,after");
    emit("fs-return-finally", "value,finally,after;value=17");
  }
  static void caseCategory2Yield() {
    reset(); check(yieldLong(1) == 9007199254740993L); mark("after"); order("value,finally,after");
    reset(); check(yieldDouble(1) == -3.25); mark("after"); order("value,finally,after");
    emit("fs-category2-yield", "long:value,finally,after;double:value,finally,after;long=9007199254740993;double=-3.25");
  }
  static void caseReferenceNullYieldIdentity() {
    Object original = new Object();
    reset(); check(referenceYield(original, 1) == original); mark("after"); order("value,finally,after");
    reset(); check(referenceYield(original, 0) == null); mark("after"); order("value,finally,after");
    emit("fs-reference-null-yield-identity", "reference:value,finally,after;same;null:value,finally,after;null");
  }

  public static void main(String[] args) {
    check(args.length == 0);
    caseNullDefaultCombined();
    caseDefaultAloneNullRejection();
    caseColonZeroRecordFallthrough();
    caseArrowNoFallthrough();
    caseColonMultipleConstants();
    caseYieldNormalFinally();
    caseYieldFinallyThrow();
    caseYieldExpressionThrow();
    caseNestedYieldTarget();
    caseLabeledBreakFinally();
    caseLabeledContinueFinally();
    caseReturnFinally();
    caseCategory2Yield();
    caseReferenceNullYieldIdentity();
    System.out.println("FINAL_SWITCH_FLOW_OK");
  }
}
