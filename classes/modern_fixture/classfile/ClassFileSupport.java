package classes.modern_test;

import java.io.InputStream;
import java.util.Base64;

/** Original javac25 checks and evidence transport; not a runtime API shim. */
public final class ClassFileSupport {
  private ClassFileSupport() {}

  public static void check(boolean condition) {
    if (!condition) throw new AssertionError("public class-file invariant");
  }

  public static void emit(String id, String detail) {
    System.out.println(new StringBuilder().append("CASE|").append(id).append('|').append(detail).toString());
  }

  public static byte[] bytes(Class<?> anchor, String resource) throws Exception {
    try (InputStream stream = anchor.getResourceAsStream(resource)) {
      check(stream != null);
      return stream.readAllBytes();
    }
  }

  public static void artifact(String id, String artifactId, byte[] bytes) {
    check(bytes != null && bytes.length != 0);
    System.out.println(new StringBuilder().append("CF_ARTIFACT|").append(id).append('|')
        .append(artifactId).append('|').append(Base64.getEncoder().encodeToString(bytes)).toString());
  }
}
