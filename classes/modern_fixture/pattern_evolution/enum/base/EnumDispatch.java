package classes.modern_test.pattern_evolution.enums;

// Compile the caller once against these two constants, then replace only Kind.
sealed interface Value permits Kind, Named {}
record Named(String name) implements Value {}
enum Kind implements Value {
  FIRST,
  SECOND { @Override public String toString() { return "second-body"; } }
}

public class EnumDispatch {
  private static int guardTrace;

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
  }

  private static boolean guard(int digit, boolean accepted) {
    guardTrace = guardTrace * 10 + digit;
    return accepted;
  }

  private static int expression(Kind value) {
    return switch (value) {
      case FIRST -> 10;
      case SECOND -> 20;
    };
  }

  private static int enhancedStatement(Kind value) {
    int result = 99;
    switch (value) {
      case null -> result = -1;
      case FIRST -> result = 11;
      case SECOND -> result = 22;
    }
    return result;
  }

  private static int legacyStatement(Kind value) {
    int result = 99;
    switch (value) {
      case FIRST -> result = 12;
      case SECOND -> result = 24;
    }
    return result;
  }

  private static int mixedPatterns(Value value) {
    return switch (value) {
      case null -> -1;
      case Kind.FIRST -> 1;
      case Kind.SECOND -> 2;
      case Named(String name) when name != null && name.length() > 3 -> 3;
      case Named(var name) -> 4;
    };
  }

  private static int guardedEnum(Kind value) {
    return switch (value) {
      case null -> -1;
      case FIRST -> 1;
      case Kind kind when guard(1, false) -> 99;
      case Kind kind when guard(2, kind == Kind.SECOND) -> 2;
      case Kind kind -> 3;
    };
  }

  public static void main(String[] args) {
    require(expression(Kind.FIRST) == 10 && expression(Kind.SECOND) == 20,
        "old exhaustive enum expression must retain named constants");
    require(enhancedStatement(Kind.FIRST) == 11 && enhancedStatement(Kind.SECOND) == 22,
        "old exhaustive enhanced statement must retain named constants");
    require(legacyStatement(Kind.FIRST) == 12 && legacyStatement(Kind.SECOND) == 24,
        "old legacy statement must retain named constants");
    require(mixedPatterns(Kind.FIRST) == 1 && mixedPatterns(Kind.SECOND) == 2,
        "old qualified enum labels must retain named constants");
    require(Kind.SECOND.getClass() != Kind.class && Kind.SECOND.getDeclaringClass() == Kind.class,
        "constant body must use declaring enum");
    require(Kind.SECOND.toString().equals("second-body"), "constant body must survive replacement");
    require(mixedPatterns(new Named("long-name")) == 3 && mixedPatterns(new Named("x")) == 4 &&
        mixedPatterns(new Named(null)) == 4, "record pattern guard restart and null component");
    System.out.println("enum-known-cases");

    require(enhancedStatement(null) == -1 && mixedPatterns(null) == -1 && guardedEnum(null) == -1,
        "explicit null cases must survive replacement");
    try {
      expression(null);
      throw new AssertionError("enum expression without null case must reject null");
    } catch (NullPointerException expected) {}
    guardTrace = 0;
    require(guardedEnum(Kind.FIRST) == 1 && guardTrace == 0, "constant label precedes guarded type");
    require(guardedEnum(Kind.SECOND) == 2 && guardTrace == 12,
        "enum guard restart must retain label order");
    System.out.println("enum-null-and-guards");

    if (!args[0].equals("baseline")) {
      Kind added = Kind.valueOf("THIRD");
      try {
        expression(added);
        throw new AssertionError("new enum constant must fail old exhaustive expression");
      } catch (MatchException expected) { require(expected.getCause() == null, "enum failure cause"); }
      try {
        enhancedStatement(added);
        throw new AssertionError("new enum constant must fail old enhanced statement");
      } catch (MatchException expected) { require(expected.getCause() == null, "enhanced failure cause"); }
      try {
        mixedPatterns(added);
        throw new AssertionError("new enum constant must fail old mixed pattern expression");
      } catch (MatchException expected) { require(expected.getCause() == null, "mixed failure cause"); }
      require(legacyStatement(added) == 99, "non-enhanced statement must complete without a match");
      guardTrace = 0;
      require(guardedEnum(added) == 3 && guardTrace == 12,
          "total enum pattern must accept new constant after failed guards");
      if (args[0].equals("reordered")) {
        require(Kind.SECOND.ordinal() == 0 && added.ordinal() == 1 && Kind.FIRST.ordinal() == 2,
            "replacement must genuinely reorder constants");
      }
      System.out.println("enum-new-constant-match-exception");
    }
  }
}
