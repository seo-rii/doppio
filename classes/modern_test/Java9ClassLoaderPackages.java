package classes.modern_test;

import java.util.Set;
import java.util.TreeSet;

public class Java9ClassLoaderPackages {
  private static final class PlainLoader extends ClassLoader {
    PlainLoader() {
      super(null);
    }
  }

  public static void main(String[] args) {
    ClassLoader system = Java9ClassLoaderPackages.class.getClassLoader();
    ClassLoader plain = new PlainLoader();

    Package own = system.getDefinedPackage("classes.modern_test");
    Package missing = system.getDefinedPackage("missing.pkg");
    Package javaLang = system.getDefinedPackage("java.lang");
    Package[] first = system.getDefinedPackages();
    Package[] second = system.getDefinedPackages();
    Set<String> selectedNames = new TreeSet<String>();

    for (Package pkg : first) {
      String name = pkg.getName();
      if ("classes.modern_test".equals(name) || "java.lang".equals(name)) {
        selectedNames.add(name);
      }
    }

    System.out.println(own != null);
    System.out.println(own == null ? "<null>" : own.getName());
    System.out.println(missing == null);
    System.out.println(javaLang == null);
    System.out.println(selectedNames);
    System.out.println(first != second);
    if (first.length > 0) {
      first[0] = null;
    }
    System.out.println(second.length > 0 && second[0] != null);
    System.out.println(plain.getDefinedPackage("classes.modern_test") == null);
    System.out.println(plain.getDefinedPackages().length);
    printFailure("pkg-null", new ThrowingRunnable() {
      public void run() {
        system.getDefinedPackage(null);
      }
    });
  }

  private static void printFailure(String label, ThrowingRunnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getSimpleName());
    }
  }

  private interface ThrowingRunnable {
    void run();
  }
}
