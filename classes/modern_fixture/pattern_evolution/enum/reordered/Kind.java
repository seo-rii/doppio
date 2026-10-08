package classes.modern_test.pattern_evolution.enums;

enum Kind implements Value {
  SECOND { @Override public String toString() { return "second-body"; } },
  THIRD,
  FIRST
}
