package classes.modern_test.lookup_init;

public class Java15LookupEnsureInitializedTarget {
  static class PackageTarget {
    static {
      System.setProperty("doppio.lookup.ensure.inaccessible", "initialized");
    }
  }
}
