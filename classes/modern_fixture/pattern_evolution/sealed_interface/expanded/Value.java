package classes.modern_test.pattern_evolution.sealedinterfaces;

sealed interface Value permits Text, Count, Extra {
  static Value added() { return new Extra(null); }
}
record Extra(Object value) implements Value {}
