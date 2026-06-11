package classes.modern_test;

public class Java9StackTraceElementAccessors {
  public static void main(String[] args) {
    StackTraceElement legacy = new StackTraceElement("pkg.Legacy", "run", "Legacy.java", 12);
    System.out.println(value(legacy.getClassLoaderName()));
    System.out.println(value(legacy.getModuleName()));
    System.out.println(value(legacy.getModuleVersion()));
    System.out.println(legacy.getClassName());
    System.out.println(legacy.getMethodName());
    System.out.println(legacy.getFileName());
    System.out.println(legacy.getLineNumber());

    StackTraceElement modern = new StackTraceElement(
      "app",
      "demo.module",
      "1.2.3",
      "pkg.Modern",
      "work",
      "Modern.java",
      34
    );
    System.out.println(modern.getClassLoaderName());
    System.out.println(modern.getModuleName());
    System.out.println(modern.getModuleVersion());
    System.out.println(modern.getClassName());
    System.out.println(modern.getMethodName());
    System.out.println(modern.getFileName());
    System.out.println(modern.getLineNumber());
    System.out.println(modern.toString());
    System.out.println(modern.equals(new StackTraceElement(
      "app",
      "demo.module",
      "1.2.3",
      "pkg.Modern",
      "work",
      "Modern.java",
      34
    )));
    System.out.println(modern.equals(new StackTraceElement(
      "other",
      "demo.module",
      "1.2.3",
      "pkg.Modern",
      "work",
      "Modern.java",
      34
    )));
    System.out.println(modern.hashCode() == new StackTraceElement(
      "app",
      "demo.module",
      "1.2.3",
      "pkg.Modern",
      "work",
      "Modern.java",
      34
    ).hashCode());

    StackTraceElement partial = new StackTraceElement(
      null,
      "demo.module",
      null,
      "pkg.Partial",
      "call",
      null,
      -1
    );
    System.out.println(value(partial.getClassLoaderName()));
    System.out.println(partial.getModuleName());
    System.out.println(value(partial.getModuleVersion()));
    System.out.println(value(partial.getFileName()));
    System.out.println(partial.getLineNumber());
    System.out.println(partial.toString());
  }

  private static String value(String input) {
    return input == null ? "<null>" : input;
  }
}
