package classes.modern_test.pattern_evolution.sealedinterfaces;

sealed interface Value permits Text, Count {
  static Value added() { throw new AssertionError("baseline factory must not run"); }
}
record Text(String value) implements Value {}
record Count(int value) implements Value {}

public class ValueDispatch {
  private static int guardTrace;

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
  }

  private static boolean guard(int digit, boolean accepted) {
    guardTrace = guardTrace * 10 + digit;
    return accepted;
  }

  private static int expression(Value value) {
    return switch (value) {
      case null -> -1;
      case Text(String text) when guard(1, text != null && text.length() > 3) -> text.length();
      case Text(var text) when guard(2, false) -> 99;
      case Text(var text) -> -2;
      case Count(int number) when guard(3, number > 0) -> number;
      case Count(int number) -> -3;
    };
  }

  private static int statement(Value value) {
    int result = 99;
    switch (value) {
      case Text(var text) -> result = text == null ? -1 : text.length();
      case Count(int number) -> result = number;
    }
    return result;
  }

  public static void main(String[] args) {
    guardTrace = 0;
    require(expression(new Text("long-text")) == 9 && guardTrace == 1, "known guarded record");
    guardTrace = 0;
    require(expression(new Text("x")) == -2 && guardTrace == 12,
        "record guard restarts must retain order");
    guardTrace = 0;
    require(expression(new Text(null)) == -2 && guardTrace == 12, "null record component");
    guardTrace = 0;
    require(expression(new Count(8)) == 8 && guardTrace == 3, "known primitive record");
    guardTrace = 0;
    require(expression(new Count(-8)) == -3 && guardTrace == 3, "primitive record guard restart");
    require(statement(new Text("text")) == 4 && statement(new Text(null)) == -1 &&
        statement(new Count(5)) == 5, "old exhaustive record statement");
    require(expression(null) == -1, "explicit null case");
    try {
      statement(null);
      throw new AssertionError("record statement without null label must reject null");
    } catch (NullPointerException expected) {}
    System.out.println("sealed-interface-known-null-and-guards");

    if (args[0].equals("expanded")) {
      Value added = Value.added();
      guardTrace = 0;
      try {
        expression(added);
        throw new AssertionError("new record must fail old exhaustive expression");
      } catch (MatchException expected) { require(expected.getCause() == null, "record failure cause"); }
      require(guardTrace == 0, "new record must not run known-record guards");
      try {
        statement(added);
        throw new AssertionError("new record must fail old exhaustive statement");
      } catch (MatchException expected) { require(expected.getCause() == null, "statement failure cause"); }
      System.out.println("sealed-interface-new-permitted-match-exception");
    }
  }
}
