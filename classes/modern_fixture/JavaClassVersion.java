package classes.modern_test;

/**
 * Intentionally uses only pre-Java-5 bytecode and constant-pool constructs.
 * The version gate keeps genuine Java 21/25 compiler outputs unchanged and
 * labels every separate header-mutated copy, including historical controls.
 */
public class JavaClassVersion {
  static {
    System.out.println("CLASS_VERSION_INITIALIZED");
  }

  public static void main(String[] args) {
    System.out.println("CLASS_VERSION_MAIN");
  }
}
