package classes.modern_test.invoke_access;

public class Java17InvokeAccessTarget {
  protected static String protectedStatic(String suffix) {
    return "protected-static:" + suffix;
  }

  protected String protectedVirtual(String suffix) {
    return "protected-virtual:" + suffix;
  }

  static String packageStatic(String suffix) {
    return "package-static:" + suffix;
  }

  String packageVirtual(String suffix) {
    return "package-virtual:" + suffix;
  }

  public static String publicStatic(String suffix) {
    return "public-static:" + suffix;
  }

  public String publicVirtual(String suffix) {
    return "public-virtual:" + suffix;
  }
}
