package classes.modern_test.pattern_evolution.sealedclasses;

abstract sealed class Shape permits Circle, Rectangle, Triangle {
  static Shape added() { return new Triangle(); }
}
final class Triangle extends Shape {}
