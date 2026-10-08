package classes.modern_test;

/** Driver compiled by actual javac; its companion is replaced with generated invokedynamic bytecode. */
public class Java21SwitchBootstrapContracts {
  enum Shade { RED }
  private static int checks;
  private static int numericCalls;
  private static final IllegalStateException NUMERIC_FAILURE = new IllegalStateException("numeric failure");

  private static final class CustomNumber extends Number {
    private final int value;
    CustomNumber(int value) { this.value = value; }
    public int intValue() { numericCalls++; return value; }
    public long longValue() { return value; }
    public float floatValue() { return value; }
    public double doubleValue() { return value; }
  }

  private static final class ThrowingNumber extends Number {
    public int intValue() { throw NUMERIC_FAILURE; }
    public long longValue() { return 0; }
    public float floatValue() { return 0; }
    public double doubleValue() { return 0; }
  }

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
    checks++;
  }

  private static void labelsAndRestart() {
    require(Java21SwitchBootstrapCalls.select(new String("target"), 0) == 0, "string equality");
    require(Java21SwitchBootstrapCalls.select("other", 0) == 2, "reference class label");
    require(Java21SwitchBootstrapCalls.select(new StringBuilder("target"), 0) == 2, "interface label");
    require(Java21SwitchBootstrapCalls.select(new Object(), 0) == 4, "unmatched selector");
    require(Java21SwitchBootstrapCalls.select(null, 0) == -1, "null selector");
    require(Java21SwitchBootstrapCalls.select("target", 1) == 2, "restart skips string label");
    require(Java21SwitchBootstrapCalls.select(Integer.valueOf(65), 2) == 3, "restart skips integer label");
    require(Java21SwitchBootstrapCalls.select("target", 4) == 4, "restart at label count");
    require(Java21SwitchBootstrapCalls.select(null, 4) == -1, "null at last valid restart");
    Object[] numbers = { Byte.valueOf((byte) 65), Short.valueOf((short) 65), Integer.valueOf(65),
      Long.valueOf(65), Float.valueOf(65.9f), Double.valueOf(65.9), Character.valueOf('A') };
    for (Object number : numbers) {
      require(Java21SwitchBootstrapCalls.select(number, 0) == 1, "integer constant uses numeric conversion");
    }
    require(Java21SwitchBootstrapCalls.select(Character.valueOf('B'), 0) == 4, "unmatched character");
    numericCalls = 0;
    require(Java21SwitchBootstrapCalls.select(new CustomNumber(65), 0) == 1 && numericCalls == 1,
        "custom Number intValue invocation");
    require(Java21SwitchBootstrapCalls.select(new CustomNumber(66), 0) == 3 && numericCalls == 2,
        "number class fallback");
    try {
      Java21SwitchBootstrapCalls.select(new ThrowingNumber(), 0);
      throw new AssertionError("numeric accessor failure not propagated");
    } catch (IllegalStateException expected) {
      require(expected == NUMERIC_FAILURE, "numeric accessor failure identity");
    }
    System.out.println("labels-and-restart");
  }

  private static void restartBounds() {
    Object[] selectors = { null, "target" };
    int[] restarts = { -1, 5 };
    for (Object selector : selectors) {
      for (int restart : restarts) {
        try {
          Java21SwitchBootstrapCalls.select(selector, restart);
          throw new AssertionError("invalid restart accepted");
        } catch (IndexOutOfBoundsException expected) {
          require(true, "restart bounds precede null handling");
        }
      }
    }
    System.out.println("restart-bounds");
  }

  private static void invalidBootstrap(Runnable action, String label) {
    try {
      action.run();
      throw new AssertionError(label + " accepted");
    } catch (BootstrapMethodError expected) {
      require(expected.getCause() instanceof IllegalArgumentException, label + " bootstrap cause");
    }
  }

  private static void bootstrapValidation() {
    invalidBootstrap(() -> Java21SwitchBootstrapCalls.invalidMethodTypeLabel(null, 0), "method type label");
    invalidBootstrap(() -> Java21SwitchBootstrapCalls.invalidNullLabel(null, 0), "null label");
    invalidBootstrap(() -> Java21SwitchBootstrapCalls.invalidRestartType(null, 0L), "restart parameter type");
    invalidBootstrap(() -> Java21SwitchBootstrapCalls.invalidReturnType(null, 0), "return type");
    invalidBootstrap(() -> Java21SwitchBootstrapCalls.invalidArity(null, 0, 0), "argument count");
    invalidBootstrap(() -> Java21SwitchBootstrapCalls.invalidEnumType(null, 0), "enum selector type");
    invalidBootstrap(() -> Java21SwitchBootstrapCalls.invalidEnumLabel(Shade.RED, 0), "enum class label");
    System.out.println("bootstrap-validation");
  }

  public static void main(String[] args) {
    labelsAndRestart();
    restartBounds();
    bootstrapValidation();
    System.out.println("checks=" + checks);
  }
}

/** These signatures let isolated javac compile the driver before the generator replaces this class. */
final class Java21SwitchBootstrapCalls {
  static int select(Object selector, int restart) { throw new AssertionError("companion was not generated"); }
  static int invalidMethodTypeLabel(Object selector, int restart) { throw new AssertionError(); }
  static int invalidNullLabel(Object selector, int restart) { throw new AssertionError(); }
  static int invalidRestartType(Object selector, long restart) { throw new AssertionError(); }
  static Object invalidReturnType(Object selector, int restart) { throw new AssertionError(); }
  static int invalidArity(Object selector, int restart, int extra) { throw new AssertionError(); }
  static int invalidEnumType(Object selector, int restart) { throw new AssertionError(); }
  static int invalidEnumLabel(Java21SwitchBootstrapContracts.Shade selector, int restart) { throw new AssertionError(); }
}
