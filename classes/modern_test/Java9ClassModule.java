package classes.modern_test;

public class Java9ClassModule {
  public static void main(String[] args) {
    Module module = Java9ClassModule.class.getModule();
    Module javaBase = String.class.getModule();
    Module primitiveModule = int.class.getModule();

    System.out.println(module != null);
    System.out.println(module.isNamed());
    System.out.println(module.getName());
    System.out.println(module.canRead(javaBase));
    System.out.println(module.addReads(javaBase) == module);
    System.out.println(module.isExported("classes.modern_test"));
    System.out.println(module.isOpen("classes.modern_test"));
    System.out.println(module.getAnnotations().length);
    System.out.println(module.getDeclaredAnnotations().length);
    System.out.println(module.getClassLoader() == Java9ClassModule.class.getClassLoader());
    System.out.println(module.getDescriptor() == null);
    System.out.println(module.getLayer() == null);
    System.out.println(module.getPackages().contains("classes.modern_test"));
    System.out.println(module.getPackages().contains("java.lang"));
    printFailure("packages-add", new Runnable() {
      public void run() {
        module.getPackages().add("x");
      }
    });
    printFailure("can-read-null", new Runnable() {
      public void run() {
        module.canRead(null);
      }
    });
    printFailure("exported-null", new Runnable() {
      public void run() {
        module.isExported(null);
      }
    });
    printFailure("resource-null", new ThrowingRunnable() {
      public void run() throws Exception {
        module.getResourceAsStream(null);
      }
    });
    System.out.println(module.toString().startsWith("unnamed module"));
    System.out.println(javaBase != null);
    System.out.println(primitiveModule != null);
  }

  private static void printFailure(String label, Runnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getSimpleName());
    }
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
    void run() throws Exception;
  }
}
