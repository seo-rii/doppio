package classes.modern_test.pattern_evolution.sealedclasses;

abstract sealed class Shape permits Circle, Rectangle {
  static Shape added() { throw new AssertionError("baseline factory must not run"); }
}
final class Circle extends Shape {
  final int radius;
  Circle(int radius) { this.radius = radius; }
}
final class Rectangle extends Shape {
  final int area;
  Rectangle(int area) { this.area = area; }
}

public class ShapeDispatch {
  private static int guardTrace;
  private static int selectorCalls;

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
  }

  private static boolean guard(int digit, boolean accepted) {
    guardTrace = guardTrace * 10 + digit;
    return accepted;
  }

  private static Shape selector(Shape value) {
    selectorCalls++;
    return value;
  }

  private static int expression(Shape value) {
    return switch (selector(value)) {
      case null -> -1;
      case Circle circle when guard(1, circle.radius > 0) -> circle.radius;
      case Circle circle when guard(2, false) -> 99;
      case Circle circle -> -2;
      case Rectangle rectangle -> rectangle.area;
    };
  }

  private static int statement(Shape value) {
    int result = 99;
    switch (value) {
      case Circle circle -> result = circle.radius;
      case Rectangle rectangle -> result = rectangle.area;
    }
    return result;
  }

  public static void main(String[] args) {
    selectorCalls = 0;
    guardTrace = 0;
    require(expression(new Circle(7)) == 7 && selectorCalls == 1 && guardTrace == 1,
        "known class and guard");
    selectorCalls = 0;
    guardTrace = 0;
    require(expression(new Circle(-7)) == -2 && selectorCalls == 1 && guardTrace == 12,
        "class guard restart must not reevaluate selector");
    guardTrace = 0;
    require(expression(new Rectangle(12)) == 12 && guardTrace == 0,
        "unmatched class must not evaluate guards");
    require(statement(new Circle(2)) == 2 && statement(new Rectangle(3)) == 3,
        "old exhaustive class statement");
    require(expression(null) == -1, "explicit null case");
    try {
      statement(null);
      throw new AssertionError("class statement without null label must reject null");
    } catch (NullPointerException expected) {}
    System.out.println("sealed-class-known-null-and-guards");

    if (args[0].equals("expanded")) {
      Shape added = Shape.added();
      selectorCalls = 0;
      guardTrace = 0;
      try {
        expression(added);
        throw new AssertionError("new class must fail old exhaustive expression");
      } catch (MatchException expected) { require(expected.getCause() == null, "class failure cause"); }
      require(selectorCalls == 1 && guardTrace == 0, "new class must not run known-type guards");
      try {
        statement(added);
        throw new AssertionError("new class must fail old exhaustive statement");
      } catch (MatchException expected) { require(expected.getCause() == null, "statement failure cause"); }
      System.out.println("sealed-class-new-permitted-match-exception");
    }
  }
}
