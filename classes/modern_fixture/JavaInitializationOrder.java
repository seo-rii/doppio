package classes.modern_test;

/**
 * Genuine javac 21/25 corpus for class and interface initialization.
 *
 * Sources: JLS 12.4.1/12.4.2 and JVMS 5.5, in both Java SE 21 and 25.
 * The VM predicate is a declared non-abstract, non-static interface method:
 * native 21/25 also initialize private-instance-only interfaces, even though
 * Method.isDefault() is false for those methods. Synthetic bridges count too.
 */
public class JavaInitializationOrder {
  private static final StringBuilder trace = new StringBuilder();
  private static final RuntimeException runtimeFailure = new RuntimeException("fixture-runtime");
  private static final Error errorFailure = new AssertionError("fixture-error");

  private static int mark(String name) {
    if (trace.length() != 0) trace.append(',');
    trace.append(name);
    return 1;
  }

  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void report(String label, String expected) {
    String actual = trace.toString();
    check(actual.equals(expected), label + ": expected [" + expected + "] but was [" + actual + "]");
    System.out.println(label + "=" + (actual.isEmpty() ? "<none>" : actual));
    trace.setLength(0);
  }

  private static int failRuntime(String name) {
    mark(name);
    throw runtimeFailure;
  }

  private static int failError(String name) {
    mark(name);
    throw errorFailure;
  }

  private static void checkWrapped(ExceptionInInitializerError error) {
    check(error.getCause() == runtimeFailure, "initializer failure must preserve its original cause");
    check(error.getException() == runtimeFailure, "initializer failure must preserve its original exception");
  }

  private static void checkErroneous(Class<?> type) throws ClassNotFoundException {
    try {
      Class.forName(type.getName(), true, JavaInitializationOrder.class.getClassLoader());
      throw new AssertionError("erroneous class initialized: " + type.getName());
    } catch (NoClassDefFoundError expected) {
      // The diagnostic text and optional remembered cause are implementation-specific.
    }
  }

  interface BaseDefault {
    int VALUE = mark("BaseDefault");
    default int base() { return 1; }
  }

  static class OrderBase implements BaseDefault {
    static final int VALUE = mark("Base");
  }

  interface OrderRoot {
    int VALUE = mark("Root");
    default int root() { return 1; }
  }

  interface OrderLeft extends OrderRoot {
    int VALUE = mark("Left");
    default int left() { return 1; }
  }

  interface OrderRight extends OrderRoot {
    int VALUE = mark("Right");
    default int right() { return 1; }
  }

  interface OrderDeep {
    int VALUE = mark("Deep");
    default int deep() { return 1; }
  }

  interface OrderIntermediate extends OrderDeep {
    int VALUE = mark("SkippedIntermediate");
  }

  interface OrderLeaf extends OrderIntermediate {
    int VALUE = mark("Leaf");
    default int leaf() { return 1; }
  }

  static class Ordered extends OrderBase implements OrderLeft, OrderRight, OrderLeaf {
    static final int VALUE = mark("Ordered");
  }

  static class NoClinitBase {
    static final int VALUE = mark("NoClinitBase");
  }

  interface NoClinitDefault {
    int VALUE = mark("NoClinitDefault");
    default int value() { return 1; }
  }

  interface NoClinitIntermediate extends NoClinitDefault {
    int VALUE = mark("SkippedNoClinitIntermediate");
  }

  // Intentionally emits no <clinit>: its initialization must still visit prerequisites.
  static class NoClinit extends NoClinitBase implements NoClinitIntermediate {}

  interface DirectParent {
    int VALUE = mark("DirectParent");
    default int parent() { return 1; }
  }

  interface DirectChild extends DirectParent {
    int VALUE = mark("DirectChild");
    default int child() { return 1; }
  }

  interface PrivateOnly {
    int VALUE = mark("PrivateOnly");
    private int privateInstance() { return 1; }
  }

  interface PrivateStaticOnly {
    int VALUE = mark("PrivateStaticOnly");
    private static int privateStatic() { return 1; }
  }

  interface StaticOnly {
    int VALUE = mark("StaticOnly");
    static int staticMethod() { return 1; }
  }

  interface AbstractOnly {
    int VALUE = mark("AbstractOnly");
    int abstractMethod();
  }

  static class NonDefaultClass implements PrivateOnly, PrivateStaticOnly, StaticOnly, AbstractOnly {
    static final int VALUE = mark("NonDefaultClass");
    public int abstractMethod() { return 1; }
  }

  interface BridgeRoot<T> {
    int VALUE = mark("SkippedBridgeRoot");
    T value();
  }

  interface BridgeChild extends BridgeRoot<String> {
    int VALUE = mark("BridgeChild");
    // javac adds a synthetic concrete Object value() bridge despite the abstract source method.
    @Override String value();
  }

  static class BridgeClass implements BridgeChild {
    static final int VALUE = mark("BridgeClass");
    public String value() { return "bridge"; }
  }

  interface OverrideDefault {
    int VALUE = mark("OverrideDefault");
    default int value() { return 1; }
  }

  static class OverrideClass implements OverrideDefault {
    static final int VALUE = mark("OverrideClass");
    @Override public int value() { return 2; }
  }

  static class PassiveClass {
    static final int NUMBER = 42;
    static final String TEXT = "constant";
    static final int VALUE = mark("PassiveClass");
  }

  interface PassiveInterface {
    int NUMBER = 24;
    int VALUE = mark("PassiveInterface");
    default int value() { return 1; }
  }

  static class DeclaringParent {
    static int value = mark("DeclaringParent");
    static int read() { return value; }
  }

  interface DeclaringDefault {
    int VALUE = mark("DeclaringDefault");
    default int value() { return 1; }
  }

  static class DeclaringChild extends DeclaringParent implements DeclaringDefault {
    static final int VALUE = mark("DeclaringChild");
  }

  static class GetOnly {
    static final int VALUE = mark("GetOnly");
  }

  static class PutOnly {
    static int value = mark("PutOnly");
  }

  static class InvokeOnly {
    static final int VALUE = mark("InvokeOnly");
    static int read() { return VALUE; }
  }

  static class RecursiveA {
    static final int START = mark("RecursiveA.start");
    static final int FROM_B = RecursiveB.read();
    // The nonconstant field below must still hold its prepared zero during recursion.
    static int value = 7;
    static final int END = mark("RecursiveA.end");
    static int read() { return value; }
  }

  static class RecursiveB {
    static final int START = mark("RecursiveB.start");
    static final int SEEN = RecursiveA.read();
    static final int END = mark("RecursiveB.end");
    static int read() { return SEEN; }
  }

  private static int recursiveDefaultValue() {
    mark("RecursiveDefault");
    return RecursiveImplementer.read();
  }

  interface RecursiveDefault {
    int VALUE = recursiveDefaultValue();
    default int value() { return 1; }
  }

  static class RecursiveImplementer implements RecursiveDefault {
    static final int VALUE = mark("RecursiveImplementer");
    static int read() { return VALUE; }
  }

  static class RuntimeClassFailure {
    static final int VALUE = failRuntime("RuntimeClass");
    static final int AFTER = mark("SkippedRuntimeClassBody");
  }

  static class ErrorClassFailure {
    static final int VALUE = failError("ErrorClass");
    static final int AFTER = mark("SkippedErrorClassBody");
  }

  interface FailingDefault {
    int VALUE = failRuntime("FailingDefault");
    default int failed() { return 1; }
  }

  interface AfterFailingDefault {
    int VALUE = mark("AfterFailingDefault");
    default int after() { return 1; }
  }

  static class RuntimeImplementerFailure implements FailingDefault, AfterFailingDefault {
    static final int VALUE = mark("SkippedRuntimeImplementerBody");
  }

  interface ErrorDefault {
    int VALUE = failError("ErrorDefault");
    default int failed() { return 1; }
  }

  interface AfterErrorDefault {
    int VALUE = mark("AfterErrorDefault");
    default int after() { return 1; }
  }

  // Also exercise an erroneous implementing class that has no <clinit> of its own.
  static class ErrorImplementerFailure implements ErrorDefault, AfterErrorDefault {}

  static class FailingSuperclass {
    static final int VALUE = failRuntime("FailingSuperclass");
  }

  interface AfterFailingSuperclass {
    int VALUE = mark("AfterFailingSuperclass");
    default int after() { return 1; }
  }

  static class SubclassFailure extends FailingSuperclass implements AfterFailingSuperclass {
    static final int VALUE = mark("SkippedSubclassBody");
  }

  public static void main(String[] args) throws Exception {
    new Ordered();
    report("order", "BaseDefault,Base,Root,Left,Right,Deep,Leaf,Ordered");
    new Ordered();
    check(Ordered.VALUE == 1 && OrderRoot.VALUE == 1, "repeated active use");
    report("repeat", "");

    check(new NoClinit().value() == 1, "class without <clinit>");
    report("no-clinit", "NoClinitBase,NoClinitDefault");

    check(DirectChild.VALUE == 1, "direct interface initialization");
    report("direct-interface", "DirectChild");
    check(DirectParent.VALUE == 1, "parent remains independently initializable");
    report("direct-interface-parent", "DirectParent");

    new NonDefaultClass();
    check(!PrivateOnly.class.getDeclaredMethod("privateInstance").isDefault(),
      "private instance method is not a Java reflection default method");
    report("method-flags", "PrivateOnly,NonDefaultClass");
    check(PrivateStaticOnly.VALUE + StaticOnly.VALUE + AbstractOnly.VALUE == 3,
      "static and abstract interfaces remain independently initializable");
    report("non-eager-interfaces", "PrivateStaticOnly,StaticOnly,AbstractOnly");

    boolean syntheticDefault = false;
    for (java.lang.reflect.Method method : BridgeChild.class.getDeclaredMethods()) {
      if (method.isBridge() && method.isSynthetic() && method.isDefault()) syntheticDefault = true;
    }
    check(syntheticDefault, "javac must emit the concrete synthetic interface bridge");
    check(trace.length() == 0, "method metadata query must not initialize the interface");
    check(new BridgeClass().value().equals("bridge"), "bridge implementation");
    report("synthetic-default", "BridgeChild,BridgeClass");

    check(new OverrideClass().value() == 2, "class overrides default method");
    report("overridden-default", "OverrideDefault,OverrideClass");

    check(PassiveClass.NUMBER == 42 && PassiveClass.TEXT.equals("constant") && PassiveInterface.NUMBER == 24,
      "constant variables");
    Class<?> passiveClass = PassiveClass.class;
    Class<?> passiveInterface = PassiveInterface.class;
    check(new PassiveClass[2].length == 2 && new PassiveClass[2][3][0].length == 2,
      "class arrays do not initialize component types");
    check(new PassiveInterface[1].length == 1, "interface array does not initialize component type");
    ClassLoader loader = JavaInitializationOrder.class.getClassLoader();
    check(Class.forName(passiveClass.getName(), false, loader) == passiveClass, "passive class loading");
    check(Class.forName(passiveInterface.getName(), false, loader) == passiveInterface, "passive interface loading");
    report("passive-uses", "");
    Class.forName(passiveClass.getName(), true, loader);
    Class.forName(passiveInterface.getName(), true, loader);
    report("reflective-active-use", "PassiveClass,PassiveInterface");

    check(DeclaringChild.value == 1 && DeclaringChild.read() == 1, "inherited static member owner");
    DeclaringChild.value = 7;
    check(DeclaringParent.read() == 7, "inherited putstatic owner");
    report("declaring-members", "DeclaringParent");
    new DeclaringChild();
    report("declaring-child", "DeclaringDefault,DeclaringChild");

    check(GetOnly.VALUE == 1, "getstatic active use");
    report("getstatic", "GetOnly");
    PutOnly.value = 9;
    check(PutOnly.value == 9, "putstatic occurs after initializer");
    report("putstatic", "PutOnly");
    check(InvokeOnly.read() == 1, "invokestatic active use");
    report("invokestatic", "InvokeOnly");

    check(RecursiveA.read() == 7 && RecursiveA.FROM_B == 0 && RecursiveB.SEEN == 0,
      "recursive initialization must expose the prepared default value without restarting");
    check(RecursiveA.read() == 7 && RecursiveB.read() == 0, "repeated recursive class use");
    report("recursive", "RecursiveA.start,RecursiveB.start,RecursiveB.end,RecursiveA.end");
    new RecursiveImplementer();
    check(RecursiveDefault.VALUE == 0 && RecursiveImplementer.VALUE == 1,
      "interface initialization can reenter its initializing implementation class");
    report("recursive-default", "RecursiveDefault,RecursiveImplementer");

    try {
      int unexpected = RuntimeClassFailure.VALUE;
      throw new AssertionError("runtime class failure missing: " + unexpected);
    } catch (ExceptionInInitializerError expected) {
      checkWrapped(expected);
    }
    checkErroneous(RuntimeClassFailure.class);
    report("runtime-failure", "RuntimeClass");

    try {
      int unexpected = ErrorClassFailure.VALUE;
      throw new AssertionError("error class failure missing: " + unexpected);
    } catch (Error actual) {
      check(actual == errorFailure, "an Error must not be wrapped or replaced");
    }
    checkErroneous(ErrorClassFailure.class);
    report("error-failure", "ErrorClass");

    try {
      new RuntimeImplementerFailure();
      throw new AssertionError("runtime default interface failure missing");
    } catch (ExceptionInInitializerError expected) {
      checkWrapped(expected);
    }
    checkErroneous(RuntimeImplementerFailure.class);
    checkErroneous(FailingDefault.class);
    report("default-runtime-failure", "FailingDefault");

    try {
      new ErrorImplementerFailure();
      throw new AssertionError("error default interface failure missing");
    } catch (Error actual) {
      check(actual == errorFailure, "interface Error must propagate unchanged through its implementer");
    }
    checkErroneous(ErrorImplementerFailure.class);
    checkErroneous(ErrorDefault.class);
    report("default-error-failure", "ErrorDefault");

    try {
      new SubclassFailure();
      throw new AssertionError("superclass failure missing");
    } catch (ExceptionInInitializerError expected) {
      checkWrapped(expected);
    }
    checkErroneous(SubclassFailure.class);
    checkErroneous(FailingSuperclass.class);
    report("superclass-failure", "FailingSuperclass");

    check(AfterFailingDefault.VALUE + AfterErrorDefault.VALUE + AfterFailingSuperclass.VALUE == 3,
      "skipped interfaces must not become erroneous");
    report("skipped-interfaces-remain-usable", "AfterFailingDefault,AfterErrorDefault,AfterFailingSuperclass");
    System.out.println("INITIALIZATION_OK");
  }
}
