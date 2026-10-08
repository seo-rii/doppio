package classes.modern_test;

import java.util.function.BiFunction;
import java.util.function.IntUnaryOperator;

/** Selected final Java 22 unnamed-variable and pattern cases, compiled without preview. */
public class Java22UnnamedPatterns {
  private record Pair(Object first, Object second) {}
  private record Nested(Pair pair, Object ignored) {}
  private record Traced(int first, Object second) {
    @Override
    public int first() { firstAccesses++; return first; }
    @Override
    public Object second() { secondAccesses++; return second; }
  }
  private static final IllegalStateException ACCESSOR_FAILURE =
      new IllegalStateException("ignored accessor failure");
  private record Explosive(Object ignored) {
    @Override
    public Object ignored() { throw ACCESSOR_FAILURE; }
  }
  private static final class Resource implements AutoCloseable {
    private final int id;
    Resource(int id) { this.id = id; resourceTrace = resourceTrace * 10 + id; }
    @Override
    public void close() { resourceTrace = resourceTrace * 10 + id; }
  }

  private static int checks;
  private static int initializerTrace;
  private static int firstAccesses;
  private static int secondAccesses;
  private static int resourceTrace;
  private static int guardCalls;

  private static void require(boolean condition, String label) {
    checks++;
    if (!condition) throw new AssertionError(label);
  }

  private static int initialize(int marker) {
    initializerTrace = initializerTrace * 10 + marker;
    return marker;
  }

  private static boolean guard() { return ++guardCalls > 1; }

  private static void unnamedLocalsAndLoops() {
    initializerTrace = 0;
    int _ = initialize(1), _ = initialize(2);
    var _ = initialize(3);
    require(initializerTrace == 123, "unnamed initializers retain side effects and order");
    int iterations = 0;
    for (int _ = initialize(4); iterations < 3; iterations++) {
      int _ = initialize(5);
    }
    require(iterations == 3 && initializerTrace == 1234555,
        "basic for and nested unnamed locals execute normally");
    int arrayIterations = 0;
    for (String _ : new String[] { "first", null, "last" }) arrayIterations++;
    require(arrayIterations == 3, "enhanced for accepts ignored null elements");
    int iterableIterations = 0;
    for (var _ : java.util.Arrays.asList(1, 2, 3, 4)) iterableIterations++;
    require(iterableIterations == 4, "enhanced for consumes an iterable");
    System.out.println("unnamed-locals-and-loops");
  }

  private static void unnamedHandlersAndLambdas() {
    boolean caught = false;
    try {
      Integer.parseInt("not a number");
      throw new AssertionError("expected parse failure");
    } catch (NumberFormatException _) {
      caught = true;
    }
    require(caught, "unnamed exception handler runs");
    int[] finallyCalls = { 0 };
    try {
      throw new IllegalArgumentException("ignored");
    } catch (IllegalArgumentException | IllegalStateException _) {
      require(true, "unnamed multi-catch handler runs");
    } finally {
      finallyCalls[0]++;
    }
    require(finallyCalls[0] == 1, "unnamed multi-catch preserves finally");
    IntUnaryOperator constant = _ -> 17;
    require(constant.applyAsInt(99) == 17, "inferred unnamed lambda parameter");
    BiFunction<String, String, Integer> length = (String _, String value) -> value.length();
    require(length.apply(null, "named") == 5, "typed unnamed and named lambda parameters");
    BiFunction<Object, Object, Integer> bothIgnored = (_, _) -> 23;
    require(bothIgnored.apply(null, new Object()) == 23, "multiple unnamed lambda parameters");
    System.out.println("unnamed-handlers-and-lambdas");
  }

  private static void unnamedResources() {
    resourceTrace = 0;
    try (Resource _ = new Resource(1); var _ = new Resource(2)) {
      require(resourceTrace == 12, "unnamed resources initialize in order");
    }
    require(resourceTrace == 1221, "unnamed resources close in reverse order");
    resourceTrace = 0;
    try (Resource _ = new Resource(3)) {
      throw new IllegalStateException("body failure");
    } catch (IllegalStateException _) {
      require(resourceTrace == 33, "unnamed resource closes on abrupt completion");
    }
    System.out.println("unnamed-resources");
  }

  private static int classify(Object input) {
    return switch (input) {
      case Pair(String _, String _) -> 1;
      case Pair(String _, _) -> 2;
      case Pair(_, String _) -> 3;
      case Pair(_, _) -> 4;
      case null -> 5;
      default -> 6;
    };
  }

  private static int nested(Object input) {
    return switch (input) {
      case Nested(Pair(String _, _), _) -> 7;
      case Nested(_, _) -> 8;
      default -> 9;
    };
  }

  private static int alternatives(Object input) {
    return switch (input) {
      case Integer _, Long _ -> 10;
      default -> 11;
    };
  }

  private static void unnamedPatterns() {
    Object text = "text";
    Object nothing = null;
    require(text instanceof String _, "top-level unnamed type pattern");
    require(!(nothing instanceof String _), "top-level type pattern rejects null");
    require(classify(new Pair("one", "two")) == 1, "multiple typed unnamed components");
    require(classify(new Pair("one", null)) == 2, "bare unnamed component accepts null");
    require(classify(new Pair(null, "two")) == 3, "typed unnamed component rejects null");
    require(classify(new Pair(null, null)) == 4, "all unnamed components accept null");
    require(classify(null) == 5, "explicit null switch selector");
    require(classify(new Object()) == 6, "unnamed record mismatch falls through");
    Object pair = new Pair(null, null);
    require(pair instanceof Pair(var _, _), "inferred unnamed component accepts null");
    require(pair instanceof Pair(Object _, _), "unconditional typed component accepts null");
    require(nested(new Nested(new Pair("value", null), null)) == 7,
        "nested record and ignored null component");
    require(nested(new Nested(null, null)) == 8, "nested record rejects null before fallback");
    require(nested(new Nested(new Pair(null, "value"), null)) == 8,
        "nested typed mismatch restarts at fallback");
    require(alternatives(Integer.valueOf(1)) == 10 && alternatives(Long.valueOf(2L)) == 10,
        "unnamed type patterns permit alternative labels");
    require(alternatives("value") == 11, "alternative labels retain default");
    guardCalls = 0;
    int guarded = switch (new Pair("value", null)) {
      case Pair(String _, _) when guard() -> 12;
      case Pair(String _, _) -> 13;
      default -> 14;
    };
    require(guarded == 13 && guardCalls == 1, "unnamed guarded pattern restarts once");
    System.out.println("unnamed-patterns");
  }

  private static void ignoredAccessorEffects() {
    firstAccesses = secondAccesses = 0;
    Object input = new Traced(7, null);
    require(input instanceof Traced(_, _), "ignored primitive and reference components match");
    require(firstAccesses == 1 && secondAccesses == 1,
        "ignored instanceof components still invoke accessors");
    firstAccesses = secondAccesses = 0;
    int result = switch (input) {
      case Traced(int _, _) -> 15;
      default -> 16;
    };
    require(result == 15 && firstAccesses == 1 && secondAccesses == 1,
        "ignored switch components still invoke accessors");
    try {
      Object explosive = new Explosive(null);
      if (explosive instanceof Explosive(_)) {
        throw new AssertionError("ignored accessor unexpectedly returned");
      }
      throw new AssertionError("ignored accessor should throw");
    } catch (MatchException failure) {
      require(failure.getCause() == ACCESSOR_FAILURE, "ignored accessor preserves wrapped cause");
    }
    System.out.println("ignored-accessor-effects");
  }

  public static void main(String[] args) {
    unnamedLocalsAndLoops();
    unnamedHandlersAndLambdas();
    unnamedResources();
    unnamedPatterns();
    ignoredAccessorEffects();
    System.out.println("checks=" + checks);
  }
}
