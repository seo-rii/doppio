package classes.modern_test;

/** Selected final Java 21/25 patterns; actual javac owns source acceptance. */
public final class JavaFinalPatterns {
  private static final StringBuilder ORDER = new StringBuilder();
  private static final RuntimeException SELECTOR_RUNTIME = new IllegalStateException("selector runtime");
  private static final Error SELECTOR_ERROR = new AssertionError("selector error");
  private static final RuntimeException GUARD_RUNTIME = new IllegalStateException("guard runtime");
  private static final Error GUARD_ERROR = new AssertionError("guard error");
  private static final Error ACCESSOR_ERROR = new AssertionError("accessor error");
  private static int selectorCalls, guardCalls, bodyCalls, fallbackCalls, accessorCalls, outerCalls;

  private record Box<T>(T value) {}
  private record NumberBox<T extends Number>(T value) {}
  private record Explosive(int value) {
    @Override public int value() {
      accessorCalls++;
      mark("accessor");
      throw ACCESSOR_ERROR;
    }
  }
  private record Envelope(Explosive value) {
    @Override public Explosive value() {
      outerCalls++;
      mark("outer");
      return value;
    }
  }

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("Final pattern probe failed");
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
  private static void reset() {
    ORDER.setLength(0);
    selectorCalls = guardCalls = bodyCalls = fallbackCalls = accessorCalls = outerCalls = 0;
  }
  private static void order(String expected) { check(ORDER.toString().equals(expected)); }
  private static Object selector(Object value) {
    selectorCalls++;
    mark("selector");
    return value;
  }
  private static Object selectorRuntime() {
    selectorCalls++;
    mark("selector");
    throw SELECTOR_RUNTIME;
  }
  private static Object selectorError() {
    selectorCalls++;
    mark("selector");
    throw SELECTOR_ERROR;
  }
  private static boolean acceptingGuard(String value) {
    guardCalls++;
    mark("guard");
    return value.length() > 0;
  }
  private static boolean runtimeGuard(String value) {
    guardCalls++;
    mark("guard");
    throw GUARD_RUNTIME;
  }
  private static boolean errorGuard(String value) {
    guardCalls++;
    mark("guard");
    throw GUARD_ERROR;
  }
  private static Boolean nullGuard(String value) {
    guardCalls++;
    mark("guard");
    return null;
  }
  private static Boolean boxedGuard(String value, String original, int stage, boolean accepted) {
    check(value == original);
    guardCalls++;
    mark(stage == 1 ? "guard1" : "guard2");
    return Boolean.valueOf(accepted);
  }
  private static int body(String event) { bodyCalls++; mark(event); return 17; }
  private static int fallback() { fallbackCalls++; mark("fallback"); return -1; }
  private static boolean causeIs(Throwable caught, Throwable expected) { return caught.getCause() == expected; }

  static void selectorStatement() {
    switch (selectorRuntime()) {
      case String text when acceptingGuard(text) -> body("body");
      default -> fallback();
    }
  }
  static int selectorExpression() {
    return switch (selectorError()) {
      case String text when acceptingGuard(text) -> body("body");
      default -> fallback();
    };
  }
  static void runtimeGuardStatement(Object input) {
    switch (selector(input)) {
      case String text when runtimeGuard(text) -> body("body");
      case String text -> fallback();
      default -> fallback();
    }
  }
  static int errorGuardExpression(Object input) {
    return switch (selector(input)) {
      case String text when errorGuard(text) -> body("body");
      case String text -> fallback();
      default -> fallback();
    };
  }
  static void nullGuardStatement(Object input) {
    switch (selector(input)) {
      case String text when nullGuard(text) -> body("body");
      case String text -> fallback();
      default -> fallback();
    }
  }
  static int nullGuardExpression(Object input) {
    return switch (selector(input)) {
      case String text when nullGuard(text) -> body("body");
      case String text -> fallback();
      default -> fallback();
    };
  }
  static int boxedRestart(Object input, String original) {
    return switch (selector(input)) {
      case String text when boxedGuard(text, original, 1, false) -> body("body1");
      case String text when boxedGuard(text, original, 2, true) -> body("body2");
      case String text -> fallback();
      default -> fallback();
    };
  }
  static int mismatchingGuard(Object input) {
    return switch (selector(input)) {
      case String text when acceptingGuard(text) -> body("body");
      default -> body("default");
    };
  }
  static int instanceofExplosive(Object input) {
    if (input instanceof Explosive(int value)) {
      body("body");
      return value;
    }
    return -1;
  }
  static int switchExplosive(Object input) {
    return switch (input) {
      case Explosive(int value) -> { body("body"); yield value; }
      default -> -1;
    };
  }
  static int nestedExplosive(Object input) {
    return switch (input) {
      case Envelope(Explosive(int value)) -> { body("body"); yield value; }
      default -> -1;
    };
  }
  static int explicit(Box<String> input) {
    if (input instanceof Box<String>(String text)) return text.length();
    return -1;
  }
  static int nestedInferred(Box<Box<String>> input) {
    if (input instanceof Box(Box(var text))) return text.length();
    return -1;
  }
  static int wildcard(Box<?> input) {
    if (input instanceof Box(String text)) return text.length();
    return -1;
  }
  static boolean nullComponent(Box<String> input) {
    return input instanceof Box(var text) && text == null;
  }
  static boolean narrowComponent(Box<?> input) { return input instanceof Box(String text); }
  static boolean bounded(NumberBox<?> input) {
    return input instanceof NumberBox(Double value) && value.doubleValue() == 2.5;
  }

  static void caseSelectorStatementThrow() {
    reset();
    try { selectorStatement(); throw new AssertionError("Missing selector exception"); }
    catch (RuntimeException caught) { check(caught == SELECTOR_RUNTIME); mark("catch"); }
    order("selector,catch");
    check(selectorCalls == 1 && guardCalls == 0 && bodyCalls == 0 && fallbackCalls == 0);
    emit("fp-selector-statement-throw", "selector,catch;same;guards=0;bodies=0");
  }
  static void caseSelectorExpressionThrow() {
    reset();
    try { selectorExpression(); throw new AssertionError("Missing selector error"); }
    catch (Error caught) { check(caught == SELECTOR_ERROR); mark("catch"); }
    order("selector,catch");
    check(selectorCalls == 1 && guardCalls == 0 && bodyCalls == 0 && fallbackCalls == 0);
    emit("fp-selector-expression-throw", "selector,catch;same;guards=0;bodies=0");
  }
  static void caseGuardStatementRuntime() {
    reset();
    try { runtimeGuardStatement("modern"); throw new AssertionError("Missing guard exception"); }
    catch (RuntimeException caught) { check(caught == GUARD_RUNTIME); mark("catch"); }
    order("selector,guard,catch");
    check(selectorCalls == 1 && guardCalls == 1 && bodyCalls == 0 && fallbackCalls == 0);
    emit("fp-guard-statement-runtime", "selector,guard,catch;same;fallback=0;body=0");
  }
  static void caseGuardExpressionError() {
    reset();
    try { errorGuardExpression("modern"); throw new AssertionError("Missing guard error"); }
    catch (Error caught) { check(caught == GUARD_ERROR); mark("catch"); }
    order("selector,guard,catch");
    check(selectorCalls == 1 && guardCalls == 1 && bodyCalls == 0 && fallbackCalls == 0);
    emit("fp-guard-expression-error", "selector,guard,catch;same;fallback=0;body=0");
  }
  static void caseGuardStatementNullUnbox() {
    reset();
    try { nullGuardStatement("modern"); throw new AssertionError("Missing guard NPE"); }
    catch (NullPointerException caught) { mark("catch"); }
    order("selector,guard,catch");
    check(selectorCalls == 1 && guardCalls == 1 && bodyCalls == 0 && fallbackCalls == 0);
    emit("fp-guard-statement-null-unbox", "selector,guard,catch;NullPointerException;fallback=0;body=0");
  }
  static void caseGuardExpressionNullUnbox() {
    reset();
    try { nullGuardExpression("modern"); throw new AssertionError("Missing guard NPE"); }
    catch (NullPointerException caught) { mark("catch"); }
    order("selector,guard,catch");
    check(selectorCalls == 1 && guardCalls == 1 && bodyCalls == 0 && fallbackCalls == 0);
    emit("fp-guard-expression-null-unbox", "selector,guard,catch;NullPointerException;fallback=0;body=0");
  }
  static void caseBoxedFalseRestart() {
    reset();
    String input = new String("modern");
    check(boxedRestart(input, input) == 17);
    order("selector,guard1,guard2,body2");
    check(selectorCalls == 1 && guardCalls == 2 && bodyCalls == 1 && fallbackCalls == 0);
    emit("fp-boxed-false-restart", "selector,guard1,guard2,body2;bound=same;selectors=1");
  }
  static void caseTypeMismatchSkipsGuard() {
    reset();
    check(mismatchingGuard(Integer.valueOf(7)) == 17);
    order("selector,default");
    check(selectorCalls == 1 && guardCalls == 0 && bodyCalls == 1);
    emit("fp-type-mismatch-skips-guard", "selector,default;guards=0");
  }
  static void caseInstanceofAccessorError() {
    reset();
    try { instanceofExplosive(new Explosive(7)); throw new AssertionError("Missing accessor failure"); }
    catch (MatchException caught) { check(causeIs(caught, ACCESSOR_ERROR)); mark("catch"); }
    order("accessor,catch");
    check(accessorCalls == 1 && outerCalls == 0 && bodyCalls == 0);
    emit("fp-instanceof-accessor-error", "accessor,catch;MatchException;cause=same;body=0");
  }
  static void caseSwitchAccessorError() {
    reset();
    try { switchExplosive(new Explosive(7)); throw new AssertionError("Missing accessor failure"); }
    catch (MatchException caught) { check(causeIs(caught, ACCESSOR_ERROR)); mark("catch"); }
    order("accessor,catch");
    check(accessorCalls == 1 && outerCalls == 0 && bodyCalls == 0);
    emit("fp-switch-accessor-error", "accessor,catch;MatchException;cause=same;body=0");
  }
  static void caseNestedAccessorError() {
    reset();
    try { nestedExplosive(new Envelope(new Explosive(7))); throw new AssertionError("Missing nested failure"); }
    catch (MatchException caught) { check(causeIs(caught, ACCESSOR_ERROR)); mark("catch"); }
    order("outer,accessor,catch");
    check(accessorCalls == 1 && outerCalls == 1 && bodyCalls == 0);
    emit("fp-nested-accessor-error", "outer,accessor,catch;MatchException;cause=same;body=0");
  }
  static void caseGenericExplicit() {
    check(explicit(new Box<String>("modern")) == 6);
    emit("fp-generic-explicit", "value=6;binding=String;record=Box");
  }
  static void caseGenericNestedInferred() {
    check(nestedInferred(new Box<Box<String>>(new Box<String>("modern"))) == 6);
    emit("fp-generic-nested-inferred", "value=6;binding=String;nested=Box");
  }
  static void caseErasedWildcardMismatch() {
    Box<?> string = new Box<String>("modern"), integer = new Box<Integer>(Integer.valueOf(7));
    check(wildcard(string) == 6 && wildcard(integer) == -1);
    emit("fp-erased-wildcard-mismatch", "string=6;integer=miss;no-abrupt");
  }
  static void caseNullComponentVsNullRecord() {
    Box<String> componentNull = new Box<String>(null);
    check(nullComponent(componentNull) && !nullComponent(null) && !narrowComponent(componentNull));
    emit("fp-null-component-vs-null-record", "component-null=match;record-null=miss;narrow-null=miss");
  }
  static void caseBoundedComponentMismatch() {
    NumberBox<?> integer = new NumberBox<Integer>(Integer.valueOf(7));
    NumberBox<?> decimal = new NumberBox<Double>(Double.valueOf(2.5));
    check(!bounded(integer) && bounded(decimal));
    emit("fp-bounded-component-mismatch", "integer=miss;double=match;no-abrupt");
  }

  public static void main(String[] args) {
    check(args.length == 0);
    caseSelectorStatementThrow();
    caseSelectorExpressionThrow();
    caseGuardStatementRuntime();
    caseGuardExpressionError();
    caseGuardStatementNullUnbox();
    caseGuardExpressionNullUnbox();
    caseBoxedFalseRestart();
    caseTypeMismatchSkipsGuard();
    caseInstanceofAccessorError();
    caseSwitchAccessorError();
    caseNestedAccessorError();
    caseGenericExplicit();
    caseGenericNestedInferred();
    caseErasedWildcardMismatch();
    caseNullComponentVsNullRecord();
    caseBoundedComponentMismatch();
    System.out.println("FINAL_PATTERNS_OK");
  }
}
