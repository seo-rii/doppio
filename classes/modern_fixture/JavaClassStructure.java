package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** Loads each explicit binary mutation in a fresh loader, without launcher diagnostics. */
public class JavaClassStructure {
  public static class Target implements java.io.Serializable {
    public int number = 1;
    public long wide = 2L;
    public static final int CONSTANT = 7;

    static {
      System.out.println("STRUCTURE_TARGET_INITIALIZED");
    }

    public static int probe(int value) {
      try {
        if (value < 0) throw new IllegalArgumentException();
        return value + 1;
      } catch (IllegalArgumentException exception) {
        return -1;
      }
    }
  }

  private static class Loader extends ClassLoader {
    Loader() {
      super(JavaClassStructure.class.getClassLoader());
    }

    Class<?> define(byte[] bytes) {
      // Nullable-name inference belongs to the B4 loader contract; this gate
      // isolates binary structure checks with an explicit expected name.
      return defineClass("classes.modern_test.JavaClassStructure$Target", bytes, 0, bytes.length);
    }

    void link(Class<?> target) {
      resolveClass(target);
    }
  }

  private static byte[] read(String id) throws Exception {
    InputStream input = JavaClassStructure.class.getResourceAsStream("/structure-cases/" + id + ".bin");
    if (input == null) throw new AssertionError("Missing case resource: " + id);
    try {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      byte[] buffer = new byte[4096];
      for (int count; (count = input.read(buffer)) != -1;) bytes.write(buffer, 0, count);
      return bytes.toByteArray();
    } finally {
      input.close();
    }
  }

  public static void main(String[] cases) throws Exception {
    if (cases.length == 0) throw new AssertionError("A mandatory case list is required");
    int failures = 0;
    for (String argument : cases) {
      int separator = argument.indexOf('=');
      if (separator <= 0) throw new AssertionError("Invalid case argument");
      String id = argument.substring(0, separator);
      String expected = argument.substring(separator + 1);
      byte[] bytes = read(id);
      String stage = "define";
      String actual;
      try {
        Loader loader = new Loader();
        Class<?> target = loader.define(bytes);
        stage = "resolve";
        loader.link(target);
        stage = "initialize";
        Class.forName(target.getName(), true, loader);
        // Annotation payload validation belongs to reflection, not this loading
        // gate. In particular, do not call getAnnotations/getDeclaredMethods.
        actual = "accepted";
      } catch (Throwable failure) {
        actual = failure.getClass().getName();
      }
      System.out.println(id + "=" + actual + "@" + stage);
      if (!expected.equals(actual)) failures++;
    }
    if (failures != 0) throw new AssertionError("Unexpected structure results: " + failures);
    System.out.println("CLASS_STRUCTURE_OK");
  }
}
