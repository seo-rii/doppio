package classes.modern_test;

/** Selected final Java 21 language cases, compiled by actual Java 21 and 25 javac. */
public class Java21PatternSwitch {
  private sealed interface Shape permits Point, Box {}
  private record Point(int x, int y) implements Shape {}
  private record Box(Point first, Point second) implements Shape {}
  private record Nullable(Object value) {}
  private record PrimitiveValues(boolean flag, byte small, char symbol, short medium,
      int count, long large, float fraction, double decimal) {}
  private record PrimitiveEnvelope(PrimitiveValues values) {}
  private record LongValue(long value) {}
  private record LongEnvelope(LongValue value) {}
  private record DoubleValue(double value) {}
  private record DoubleEnvelope(DoubleValue value) {}

  private sealed interface Value permits Shade, Named {}
  private enum Shade implements Value {
    RED, GREEN,
    BLUE {
      @Override
      public String toString() { return "blue constant body"; }
    }
  }
  private record Named(String name) implements Value {}

  private static final IllegalStateException ACCESSOR_FAILURE =
      new IllegalStateException("record accessor failure");
  private record Explosive(int value) {
    @Override
    public int value() { throw ACCESSOR_FAILURE; }
  }

  private static int checks;
  private static int guardTrace;
  private static int selectorCalls;

  private static void require(boolean condition, String label) {
    checks++;
    if (!condition) throw new AssertionError(label);
  }

  private static boolean guard(int marker, boolean accepted) {
    guardTrace = guardTrace * 10 + marker;
    return accepted;
  }

  private static Object selector() {
    selectorCalls++;
    return "once";
  }

  private static void instanceOfBindings() {
    Object text = "binding";
    require(text instanceof String value && value.length() == 7, "instanceof binding");
    require(!(new Object() instanceof String), "instanceof mismatch");
    require(!(null instanceof String), "instanceof null");
    Object shape = new Box(new Point(1, 2), new Point(3, 4));
    require(shape instanceof Box(Point(int x, int y), Point(int z, int w)) &&
        x + y + z + w == 10, "instanceof nested record bindings");
    require(!(new Box(null, new Point(3, 4)) instanceof
        Box(Point(int x, int y), Point(int z, int w))), "nested record null mismatch");
    System.out.println("instanceof-bindings");
  }

  private static int typeSwitch(Object input) {
    return switch (input) {
      case null -> -1;
      case String text when text.length() > 3 -> text.length();
      case String text -> -2;
      case Integer number when number > 0 -> number;
      case Integer number -> -3;
      case Number number -> -4;
      case CharSequence sequence -> -5;
      default -> -6;
    };
  }

  private static void typeSwitches() {
    require(typeSwitch(null) == -1, "explicit null case");
    require(typeSwitch("longer") == 6, "guarded string");
    require(typeSwitch("no") == -2, "string guard restart");
    require(typeSwitch(Integer.valueOf(7)) == 7, "guarded integer");
    require(typeSwitch(Integer.valueOf(0)) == -3, "integer guard restart");
    require(typeSwitch(Double.valueOf(2.0)) == -4, "number subtype");
    require(typeSwitch(new StringBuilder("text")) == -5, "interface label");
    require(typeSwitch(new Object()) == -6, "default fallback");
    selectorCalls = 0;
    int result = switch (selector()) {
      case String text when text.length() > 10 -> 1;
      case String text -> text.length();
      default -> -1;
    };
    require(result == 4 && selectorCalls == 1, "selector evaluated once across restart");
    System.out.println("type-switches");
  }

  private static int orderedGuards(Object input) {
    return switch (input) {
      case String text when guard(1, false) -> 1;
      case String text when guard(2, text.equals("accepted")) -> 2;
      case String text when guard(3, true) -> 3;
      default -> 4;
    };
  }

  private static void guardRestarts() {
    guardTrace = 0;
    require(orderedGuards("accepted") == 2 && guardTrace == 12,
        "guards restart at the next label");
    guardTrace = 0;
    require(orderedGuards("fallback") == 3 && guardTrace == 123,
        "successive failed guards preserve order");
    guardTrace = 0;
    require(orderedGuards(Integer.valueOf(1)) == 4 && guardTrace == 0,
        "mismatching type does not evaluate guards");
    System.out.println("guard-restarts");
  }

  private static int nestedSwitch(Object input) {
    return switch (input) {
      case Box(Point(int x, int y), Point(int z, int w)) when x < z -> x + y + z + w;
      case Box(Point(int x, int y), Point(int z, int w)) -> -2;
      case Box box -> -3;
      case Nullable(String text) -> text.length();
      case Nullable(var value) -> value == null ? -4 : -5;
      case null -> -6;
      default -> -7;
    };
  }

  private static void nestedRecords() {
    require(nestedSwitch(new Box(new Point(1, 2), new Point(3, 4))) == 10,
        "nested record switch bindings");
    require(nestedSwitch(new Box(new Point(4, 3), new Point(2, 1))) == -2,
        "nested record guard restart");
    require(nestedSwitch(new Box(null, new Point(3, 4))) == -3,
        "nested null component falls through");
    require(nestedSwitch(new Nullable("record")) == 6, "typed reference component");
    require(nestedSwitch(new Nullable(null)) == -4, "var component matches null");
    require(nestedSwitch(new Nullable(Integer.valueOf(1))) == -5,
        "component type mismatch falls through");
    require(nestedSwitch(null) == -6, "null selector before record deconstruction");
    require(nestedSwitch(new Object()) == -7, "record switch default");
    System.out.println("nested-records");
  }

  private static int primitiveSwitch(Object input) {
    return switch (input) {
      case PrimitiveEnvelope(PrimitiveValues(boolean flag, byte small, char symbol, short medium,
          int count, long large, float fraction, double decimal)) when flag ->
          small == -7 && symbol == 'A' && medium == 300 && count == 17 &&
              large == 0x1_0000_0002L && fraction == 1.5f && decimal == -3.25 ? 1 : -1;
      case PrimitiveEnvelope(PrimitiveValues(boolean flag, byte small, char symbol, short medium,
          int count, long large, float fraction, double decimal)) ->
          !flag && small == -7 && symbol == 'A' && medium == 300 && count == 17 &&
              large == 0x1_0000_0002L && fraction == 1.5f && decimal == -3.25 ? 2 : -2;
      case PrimitiveEnvelope envelope -> 3;
      default -> 4;
    };
  }

  private static void primitiveRecords() {
    require(primitiveSwitch(new PrimitiveEnvelope(new PrimitiveValues(true, (byte) -7,
        'A', (short) 300, 17, 0x1_0000_0002L, 1.5f, -3.25))) == 1,
        "all primitive record components preserve values");
    require(primitiveSwitch(new PrimitiveEnvelope(new PrimitiveValues(false, (byte) -7,
        'A', (short) 300, 17, 0x1_0000_0002L, 1.5f, -3.25))) == 2,
        "all primitive components survive guard restart");
    require(primitiveSwitch(new PrimitiveEnvelope(null)) == 3,
        "null nested primitive record falls through");
    require(wideSwitch(new LongEnvelope(new LongValue(0x1_0000_0002L))) == 1 &&
        wideSwitch(new LongEnvelope(new LongValue(-0x1_0000_0002L))) == 2,
        "wide long selector preserves value and guard restart");
    require(wideSwitch(new DoubleEnvelope(new DoubleValue(-3.25))) == 3 &&
        wideSwitch(new DoubleEnvelope(new DoubleValue(1.5))) == 4,
        "wide double selector preserves value and guard restart");
    System.out.println("primitive-records");
  }

  private static int wideSwitch(Object input) {
    return switch (input) {
      case LongEnvelope(LongValue(long value)) when value == 0x1_0000_0002L -> 1;
      case LongEnvelope(LongValue(long value)) -> 2;
      case DoubleEnvelope(DoubleValue(double value)) when value == -3.25 -> 3;
      case DoubleEnvelope(DoubleValue(double value)) -> 4;
      default -> 5;
    };
  }

  private static int enumSwitch(Shade input) {
    return switch (input) {
      case null -> -1;
      case RED -> 1;
      case Shade shade when shade == Shade.GREEN -> 2;
      case Shade shade -> 3;
    };
  }

  private static int mixedEnumSwitch(Value input) {
    return switch (input) {
      case Shade.RED -> 10;
      case Shade.GREEN -> 20;
      case Shade.BLUE -> 30;
      case Named(String name) -> name.length();
    };
  }

  private static void enumSwitches() {
    require(Shade.BLUE.getClass() != Shade.class && Shade.BLUE.getDeclaringClass() == Shade.class,
        "constant-specific body uses its declaring enum");
    require(enumSwitch(null) == -1, "enum null");
    require(enumSwitch(Shade.RED) == 1, "enum constant label");
    require(enumSwitch(Shade.GREEN) == 2, "enum type guard");
    require(enumSwitch(Shade.BLUE) == 3, "enum guard restart");
    require(mixedEnumSwitch(Shade.RED) == 10, "mixed enum red constant");
    require(mixedEnumSwitch(Shade.GREEN) == 20, "mixed enum green constant");
    require(mixedEnumSwitch(Shade.BLUE) == 30, "mixed enum blue constant");
    require(mixedEnumSwitch(new Named("name")) == 4, "mixed enum record label");
    System.out.println("enum-switches");
  }

  private static int sealedSwitch(Shape shape) {
    return switch (shape) {
      case Point(int x, int y) -> x + y;
      case Box box -> 10;
    };
  }

  private static void sealedAndNull() {
    require(sealedSwitch(new Point(2, 3)) == 5, "sealed exhaustive point");
    require(sealedSwitch(new Box(null, null)) == 10, "sealed exhaustive box");
    try {
      sealedSwitch(null);
      throw new AssertionError("switch without null label must reject null");
    } catch (NullPointerException expected) {
      require(true, "implicit null rejection");
    }
    System.out.println("sealed-and-null");
  }

  private static int throwingRecordSwitch(Object input) {
    return switch (input) {
      case Explosive(int value) -> value;
      default -> -1;
    };
  }

  private static void accessorFailures() {
    try {
      throwingRecordSwitch(new Explosive(1));
      throw new AssertionError("record accessor must throw MatchException");
    } catch (MatchException expected) {
      require(expected.getCause() == ACCESSOR_FAILURE, "switch accessor failure retains cause");
    }
    try {
      Object input = new Explosive(1);
      if (input instanceof Explosive(int value)) {
        throw new AssertionError("instanceof accessor unexpectedly returned");
      }
      throw new AssertionError("instanceof record accessor must throw MatchException");
    } catch (MatchException expected) {
      require(expected.getCause() == ACCESSOR_FAILURE, "instanceof accessor failure retains cause");
    }
    System.out.println("accessor-failures");
  }

  public static void main(String[] args) {
    instanceOfBindings();
    typeSwitches();
    guardRestarts();
    nestedRecords();
    primitiveRecords();
    enumSwitches();
    sealedAndNull();
    accessorFailures();
    System.out.println("checks=" + checks);
  }
}
