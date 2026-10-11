package classes.modern_test.methodhandle_lookup;

/** Separate runtime package for the bounded protected/private Lookup probes. */
public class LookupForeign {
  public static int calls;

  protected Object protectedEcho(Object value) {
    calls++;
    return value;
  }

  private static Object privateEcho(Object value) {
    calls++;
    return value;
  }
}
