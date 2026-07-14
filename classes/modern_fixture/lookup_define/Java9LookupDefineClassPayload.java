package classes.modern_test;

public class Java9LookupDefineClassPayload {
  static {
    System.setProperty("doppio.lookup.define.initialized", "yes");
  }

  public static String message() {
    return "direct-payload";
  }
}
