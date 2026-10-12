package classes.modern_test;

import java.io.InputStream;

/** Original compiler fixture checks; not a runtime shim or bytecode carrier. */
public final class NominalConstantSupport {
  private NominalConstantSupport() {}

  public static void check(boolean condition) {
    if (!condition) throw new AssertionError("nominal constant invariant");
  }

  public static void emit(String id, String event) {
    System.out.println(new StringBuilder().append(id).append('=').append(event).toString());
  }

  public static byte[] bytes(Class<?> anchor, String resource) throws Exception {
    try (InputStream stream = anchor.getResourceAsStream(resource)) {
      check(stream != null);
      return stream.readAllBytes();
    }
  }
}
