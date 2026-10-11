package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;

/** Genuine positive shapes plus fresh-loader execution of explicit binary mutations. */
public class JavaBytecodeVerification {
  public static class Target {
    public int number;
    public static int shared = 3;
    public static final int LARGE = 70000;

    public Target() { this(7); }
    public Target(int number) { this.number = number; }

    public static int integer(int value) { return value + 1; }
    public static long wide(long value) { return value + 1L; }
    public static double decimal(double value) { return value + 1.0; }
    public static Object reference(Object value) { return value; }
    public static long constantWide() { return 1234567890123L; }
    public static int constantInteger() { return LARGE; }
    public static int array(int[] values, int index) { return values[index]; }
    public static Object referenceArray(Object[] values, int index) { return values[index]; }
    public static int field(Target value) { return value.number; }
    public static int invoke(String value) { return value.length(); }
    public static int invokeInterface(List<?> value) { return value.size(); }
    public static Object create() { return new Object(); }
    public String specialProbe() { return super.toString(); }
    public static String concatenate(int value) { return "value=" + value; }
    public static Class<?> arrayClass() { return int[].class; }
    public static int[][] multiArray() { return new int[2][3]; }

    public static int branch(boolean condition) {
      int answer;
      if (condition) answer = 1;
      else answer = 2;
      return answer;
    }

    public static Object merge(boolean condition) {
      Object answer;
      if (condition) answer = new Object();
      else answer = new int[1];
      return answer;
    }

    public static int handler(int value) {
      try { return 42 / value; }
      catch (ArithmeticException failure) { return -1; }
    }

    public static int loop(int value) {
      int sum = 0;
      for (int index = 0; index < value; index++) sum += index;
      return sum;
    }

    public static int denseSwitch(int value) {
      switch (value) {
        case 0: return 3;
        case 1: return 5;
        case 2: return 7;
        default: return -1;
      }
    }

    public static int sparseSwitch(int value) {
      switch (value) {
        case 1: return 3;
        case 100: return 5;
        case 1000: return 7;
        default: return -1;
      }
    }

    public static int monitor(Target value) {
      synchronized (value) { return value.number; }
    }

    // Dedicated mutation methods isolate bytecode contracts from the positive
    // execution checksum. Native verification still examines them before <clinit>.
    public static void voidProbe() {}
    public static int integerProbe(int value) { return value; }
    public static long wideProbe(long value) { return value; }
    public static Object referenceProbe(Object value) { return value; }

    private static void require(boolean condition) {
      if (!condition) throw new AssertionError("Genuine bytecode control failed");
    }

    static {
      Target target = new Target();
      Object marker = new Object();
      require(integer(41) == 42 && wide(41L) == 42L && decimal(1.5) == 2.5);
      require(reference(marker) == marker && constantWide() == 1234567890123L && constantInteger() == 70000);
      require(array(new int[] { 9 }, 0) == 9 && referenceArray(new Object[] { marker }, 0) == marker);
      require(field(target) == 7 && invoke("abc") == 3 && invokeInterface(Collections.emptyList()) == 0);
      require(create() != null && concatenate(3).equals("value=3") && arrayClass() == int[].class);
      require(multiArray().length == 2 && multiArray()[0].length == 3);
      require(branch(true) == 1 && branch(false) == 2 && merge(true) != null && merge(false) instanceof int[]);
      require(handler(2) == 21 && handler(0) == -1 && loop(4) == 6);
      require(denseSwitch(1) == 5 && denseSwitch(8) == -1 && sparseSwitch(1000) == 7 && sparseSwitch(8) == -1);
      require(monitor(target) == 7);
      System.out.println("BYTECODE_TARGET_INITIALIZED");
    }
  }

  /** Only legacy constant-pool tags; historical header changes remain explicit mutations. */
  public static class LegacyTarget {
    public static int legacy(int value) { return value; }
    static {
      if (legacy(7) != 7) throw new AssertionError("Historical control failed");
      System.out.println("BYTECODE_TARGET_INITIALIZED");
    }
  }

  /** Verification needs Child's hierarchy, not permission to execute Child. */
  public static class MetadataParent {
    public static MetadataParent choose(MetadataChild value) { return value; }
    public static int usable() { return 17; }
    static {
      if (usable() != 17) throw new AssertionError("Metadata parent is not usable");
      System.out.println("METADATA_PARENT_USABLE");
    }
  }

  public static class MetadataChild extends MetadataParent {
    public static int integerProbe() { return 5; }
    static {
      if (integerProbe() != 5) throw new AssertionError("Metadata child control failed");
      System.out.println("METADATA_CHILD_INITIALIZED");
    }
  }

  private static final String METADATA_PARENT = "classes.modern_test.JavaBytecodeVerification$MetadataParent";
  private static final String METADATA_CHILD = "classes.modern_test.JavaBytecodeVerification$MetadataChild";

  /** No class literals for Parent/Child: only this loader may define them. */
  private static class MetadataLoader extends ClassLoader {
    private final String id;
    private final byte[] parentBytes;
    private final byte[] childBytes;
    boolean parentDefined;
    boolean childDefined;

    MetadataLoader(String id, byte[] parentBytes, byte[] childBytes) {
      super(JavaBytecodeVerification.class.getClassLoader());
      this.id = id;
      this.parentBytes = parentBytes;
      this.childBytes = childBytes;
    }

    protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      boolean parent = METADATA_PARENT.equals(name);
      if (!parent && !METADATA_CHILD.equals(name)) return super.loadClass(name, resolve);
      Class<?> loaded = findLoadedClass(name);
      if (loaded == null) {
        byte[] bytes = parent ? parentBytes : childBytes;
        loaded = defineClass(name, bytes, 0, bytes.length);
        if (parent) parentDefined = true;
        else childDefined = true;
        System.out.println(id + (parent ? "=defined-parent" : "=defined-child"));
      }
      if (resolve) resolveClass(loaded);
      return loaded;
    }

    void link(Class<?> target) { resolveClass(target); }
  }

  private static class Loader extends ClassLoader {
    Loader() { super(JavaBytecodeVerification.class.getClassLoader()); }
    Class<?> define(String name, byte[] bytes) { return defineClass(name, bytes, 0, bytes.length); }
    void link(Class<?> target) { resolveClass(target); }
  }

  private static byte[] read(String id) throws Exception {
    InputStream input = JavaBytecodeVerification.class.getResourceAsStream("/verification-cases/" + id + ".bin");
    if (input == null) throw new AssertionError("Missing case resource: " + id);
    try {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      byte[] buffer = new byte[4096];
      for (int count; (count = input.read(buffer)) != -1;) bytes.write(buffer, 0, count);
      return bytes.toByteArray();
    } finally { input.close(); }
  }

  private static int metadataCase(String id, String expected) throws Exception {
    MetadataLoader loader = new MetadataLoader(id, read(id + "-parent"), read(id + "-child"));
    Class.forName(METADATA_PARENT, true, loader);
    if (!loader.parentDefined || !loader.childDefined) {
      throw new AssertionError("Parent verification did not load child metadata: " + id);
    }
    System.out.println(id + "=parent-usable-child-loaded");
    Class<?> child = loader.loadClass(METADATA_CHILD);
    String stage = "resolve";
    String actual;
    try {
      loader.link(child);
      stage = "initialize";
      Class.forName(METADATA_CHILD, true, loader);
      actual = "accepted";
    } catch (Throwable failure) {
      actual = failure.getClass().getName();
    }
    System.out.println(id + "=" + actual + "@" + stage);
    return expected.equals(actual) ? 0 : 1;
  }

  public static void main(String[] cases) throws Exception {
    if (cases.length == 0) throw new AssertionError("A mandatory case list is required");
    int failures = 0;
    for (String argument : cases) {
      int separator = argument.indexOf('=');
      int nameSeparator = argument.indexOf(':', separator + 1);
      if (separator <= 0 || nameSeparator <= separator + 1) throw new AssertionError("Invalid case argument");
      String id = argument.substring(0, separator);
      String expected = argument.substring(separator + 1, nameSeparator);
      String name = argument.substring(nameSeparator + 1);
      byte[] bytes = read(id);
      String stage = "define";
      String actual;
      try {
        Loader loader = new Loader();
        Class<?> target = loader.define(name, bytes);
        stage = "resolve";
        loader.link(target);
        stage = "initialize";
        Class.forName(name, true, loader);
        actual = "accepted";
      } catch (Throwable failure) {
        actual = failure.getClass().getName();
      }
      System.out.println(id + "=" + actual + "@" + stage);
      if (!expected.equals(actual)) failures++;
    }
    failures += metadataCase("metadata-valid-child", "accepted");
    failures += metadataCase("metadata-invalid-child", "java.lang.VerifyError");
    if (failures != 0) throw new AssertionError("Unexpected verification results: " + failures);
    System.out.println("BYTECODE_VERIFICATION_OK");
  }
}
