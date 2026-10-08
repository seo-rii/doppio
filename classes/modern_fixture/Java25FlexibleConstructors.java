package classes.modern_test;

/** Selected final JLS 25 constructor-body cases, compiled without preview features. */
public class Java25FlexibleConstructors {
  private static int checks;
  private static int baseCalls;
  private static final StringBuilder TRACE = new StringBuilder();
  private static final IllegalArgumentException EMPTY_INPUT =
      new IllegalArgumentException("empty input");

  private static void require(boolean condition, String label) {
    checks++;
    if (!condition) throw new AssertionError(label);
  }

  private static void event(String value) {
    if (TRACE.length() != 0) TRACE.append(',');
    TRACE.append(value);
  }

  private static void reset() {
    TRACE.setLength(0);
    baseCalls = 0;
  }

  private static int argument(int index, int value) {
    event("argument-" + index);
    return value;
  }

  private static class IntBase {
    final int first;
    final int second;

    IntBase(int first, int second) {
      event("base");
      baseCalls++;
      this.first = first;
      this.second = second;
    }
  }

  private static final class Computed extends IntBase {
    final int original;

    Computed(int input) {
      event("compute");
      int sum = 0;
      for (int i = 1; i <= input; i++) sum += i;
      int doubled = input * 2;
      super(argument(1, sum), argument(2, doubled));
      original = input;
      event("computed-end");
    }
  }

  private static final class Validated extends IntBase {
    Validated(String input) {
      event("validate");
      int length;
      try {
        if (input == null) throw new NullPointerException("input");
        if (input.length() == 0) throw EMPTY_INPUT;
        length = input.length();
      } finally {
        event("validation-finally");
      }
      super(length, length * 2);
      event("validated-end");
    }
  }

  private static final class Chained extends IntBase {
    int marker;

    Chained(int input) {
      event("outer-prologue");
      int normalized = input + 1;
      this(normalized, normalized * 2);
      event("outer-epilogue");
      marker += 5;
    }

    Chained(int first, int second) {
      event("inner-prologue");
      this.marker = first;
      super(first, second);
      event("inner-epilogue");
      marker += second;
    }
  }

  private abstract static class ObserverBase {
    final String observed;
    final long observedToken;

    ObserverBase() {
      event("observer-base");
      observed = describe();
      observedToken = token();
    }

    abstract String describe();
    abstract long token();
  }

  private static final class EarlyFields extends ObserverBase {
    int count;
    String name;
    final long identifier;

    EarlyFields(int value, String label, long identifier) {
      event("fields-prologue");
      count = value;
      this.name = label;
      this.identifier = identifier;
      super();
      count++;
      event("fields-epilogue");
    }

    @Override String describe() { return count + ":" + name; }
    @Override long token() { return identifier; }
  }

  private abstract static class InitializerBase {
    final int observed;

    InitializerBase() {
      event("initializer-base");
      observed = value();
    }

    abstract int value();
  }

  private static int initialValue() {
    event("field-initializer");
    return 7;
  }

  private static final class Initialized extends InitializerBase {
    int number;
    int declared = initialValue();
    int initializerRuns;
    {
      event("instance-initializer");
      initializerRuns++;
      number = declared + 3;
    }

    Initialized(int input) {
      event("initializer-prologue");
      this.number = input;
      super();
      event("initializer-epilogue");
    }

    @Override int value() { return number; }
  }

  private interface IntValue { int get(); }

  private static final class LocalCapture extends IntBase {
    final int captured;

    LocalCapture(int input) {
      event("capture-prologue");
      int delta = input + 4;
      IntValue lambda = () -> delta * 2;
      class Local {
        int value() { return delta + 1; }
      }
      IntValue anonymous = new IntValue() {
        @Override public int get() { return delta + 2; }
      };
      int result = lambda.get() + new Local().value() + anonymous.get();
      super(result, delta);
      captured = delta;
      event("capture-epilogue");
    }
  }

  private abstract static class WideBase {
    final long argumentLong;
    final double argumentDouble;
    final long observedLong;
    final double observedDouble;

    WideBase(long argumentLong, double argumentDouble) {
      event("wide-base");
      this.argumentLong = argumentLong;
      this.argumentDouble = argumentDouble;
      observedLong = valueLong();
      observedDouble = valueDouble();
    }

    abstract long valueLong();
    abstract double valueDouble();
  }

  private static final class WideFields extends WideBase {
    final long number;
    final double fraction;

    WideFields(long input, double decimal) {
      event("wide-prologue");
      long shifted = (input << 2) + 3;
      double adjusted = decimal * 2 + 0.5;
      this.number = shifted;
      this.fraction = adjusted;
      super(shifted + 5, adjusted + 1.25);
      event("wide-epilogue");
    }

    @Override long valueLong() { return number; }
    @Override double valueDouble() { return fraction; }
  }

  private static final class Outer {
    final int prefix;
    Outer(int prefix) { this.prefix = prefix; }

    class InnerBase {
      final int argument;
      InnerBase(int argument) {
        event("qualified-base");
        this.argument = argument;
      }
      int ownerValue() { return prefix; }
    }
  }

  private static final class Qualified extends Outer.InnerBase {
    Qualified(Outer outer, int input) {
      event("qualified-prologue");
      int value = input + 5;
      outer.super(value);
      event("qualified-epilogue");
    }
  }

  private static void computedArguments() {
    reset();
    Computed value = new Computed(5);
    require(value.first == 15, "prologue loop computes superclass argument");
    require(value.second == 10, "second computed superclass argument");
    require(value.original == 5, "parameter available after superclass invocation");
    require(baseCalls == 1, "computed superclass invoked once");
    require(TRACE.toString().equals("compute,argument-1,argument-2,base,computed-end"),
        "prologue and argument evaluation order");
    Computed zero = new Computed(0);
    require(zero.first == 0 && zero.second == 0, "zero-iteration prologue");
    System.out.println("computed-arguments");
  }

  private static void validationFailures() {
    reset();
    try {
      new Validated(null);
      require(false, "null validation must throw");
    } catch (NullPointerException failure) {
      require(failure.getMessage().equals("input"), "null prologue exception");
    }
    require(baseCalls == 0, "null validation prevents superclass construction");
    require(TRACE.toString().equals("validate,validation-finally"),
        "null prologue finally without epilogue");
    reset();
    try {
      new Validated("");
      require(false, "empty validation must throw");
    } catch (IllegalArgumentException failure) {
      require(failure == EMPTY_INPUT, "prologue preserves thrown exception identity");
    }
    require(baseCalls == 0, "empty validation prevents superclass construction");
    require(TRACE.toString().equals("validate,validation-finally"),
        "empty prologue finally without epilogue");
    reset();
    Validated accepted = new Validated("abc");
    require(accepted.first == 3 && accepted.second == 6, "validated arguments");
    require(baseCalls == 1, "accepted validation invokes superclass");
    require(TRACE.toString().equals("validate,validation-finally,base,validated-end"),
        "accepted prologue finally and epilogue order");
    System.out.println("validation-failures");
  }

  private static void constructorChains() {
    reset();
    Chained value = new Chained(2);
    require(value.first == 3, "this-chain first argument");
    require(value.second == 6, "this-chain second argument");
    require(value.marker == 14, "early write and both constructor epilogues");
    require(baseCalls == 1, "this-chain superclass invoked once");
    require(TRACE.toString().equals(
        "outer-prologue,inner-prologue,base,inner-epilogue,outer-epilogue"),
        "this-chain prologue and epilogue order");
    System.out.println("constructor-chains");
  }

  private static void earlyFieldWrites() {
    reset();
    long token = 0x123456789ABCDEFL;
    EarlyFields value = new EarlyFields(42, "early", token);
    require(value.observed.equals("42:early"), "superclass dispatch sees early fields");
    require(value.observedToken == token, "superclass dispatch sees early final long");
    require(value.count == 43, "epilogue updates early int");
    require(value.name.equals("early") && value.identifier == token,
        "early reference and final long survive superclass constructor");
    require(TRACE.toString().equals("fields-prologue,observer-base,fields-epilogue"),
        "early field write order");
    System.out.println("early-field-writes");
  }

  private static void initializerOrder() {
    reset();
    Initialized value = new Initialized(40);
    require(value.observed == 40, "superclass sees field before declaration initializer");
    require(value.declared == 7, "declaration initializer runs after superclass constructor");
    require(value.number == 10, "instance initializer overwrites early write");
    require(value.initializerRuns == 1, "instance initializer runs once");
    require(TRACE.toString().equals("initializer-prologue,initializer-base," +
        "field-initializer,instance-initializer,initializer-epilogue"),
        "initializers follow superclass and precede epilogue");
    System.out.println("initializer-order");
  }

  private static void localCaptures() {
    reset();
    LocalCapture value = new LocalCapture(3);
    require(value.first == 31, "lambda local class and anonymous class capture prologue local");
    require(value.second == 7, "captured local used in superclass argument");
    require(value.captured == 7, "prologue local remains available in epilogue");
    require(TRACE.toString().equals("capture-prologue,base,capture-epilogue"),
        "nested capture constructor order");
    System.out.println("local-captures");
  }

  private static void checkWide(WideFields value, long number, double fraction) {
    require(value.number == number, "wide early long field");
    require(value.fraction == fraction, "wide early double field");
    require(value.observedLong == number, "superclass reads wide early long");
    require(value.observedDouble == fraction, "superclass reads wide early double");
    require(value.argumentLong == number + 5, "wide long superclass argument");
    require(value.argumentDouble == fraction + 1.25, "wide double superclass argument");
  }

  private static void widePrimitives() {
    reset();
    checkWide(new WideFields(1_000_000_000_000L, 1.25), 4_000_000_000_003L, 3.0);
    checkWide(new WideFields(-3L, -0.75), -9L, -1.0);
    require(TRACE.toString().equals("wide-prologue,wide-base,wide-epilogue," +
        "wide-prologue,wide-base,wide-epilogue"), "wide constructor order");
    System.out.println("wide-primitives");
  }

  private static void qualifiedSuperclass() {
    reset();
    Qualified value = new Qualified(new Outer(19), 6);
    require(value.ownerValue() == 19, "qualified superclass enclosing instance");
    require(value.argument == 11, "qualified superclass computed argument");
    require(TRACE.toString().equals("qualified-prologue,qualified-base,qualified-epilogue"),
        "qualified superclass constructor order");
    System.out.println("qualified-superclass");
  }

  public static void main(String[] args) {
    computedArguments();
    validationFailures();
    constructorChains();
    earlyFieldWrites();
    initializerOrder();
    localCaptures();
    widePrimitives();
    qualifiedSuperclass();
    System.out.println("checks=" + checks);
  }
}
