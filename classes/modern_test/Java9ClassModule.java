package classes.modern_test;

import java.io.InputStream;

public class Java9ClassModule {
  public static void main(String[] args) throws Exception {
    Module module = Java9ClassModule.class.getModule();
    Module javaBase = String.class.getModule();
    Module primitiveModule = int.class.getModule();
    String classResource = Java9ClassModule.class.getName().replace('.', '/') + ".class";

    System.out.println(module != null);
    System.out.println(module.isNamed());
    System.out.println(module.getName());
    System.out.println(module.canRead(javaBase));
    System.out.println(module.addReads(javaBase) == module);
    System.out.println(module.isExported("classes.modern_test"));
    System.out.println(module.isOpen("classes.modern_test"));
    System.out.println(module.isExported("classes.modern_test", javaBase));
    System.out.println(module.isOpen("classes.modern_test", javaBase));
    System.out.println(module.addExports("classes.modern_test", javaBase) == module);
    System.out.println(module.addOpens("classes.modern_test", javaBase) == module);
    System.out.println(module.addUses(Runnable.class) == module);
    System.out.println(module.canUse(Runnable.class));
    System.out.println(module.getAnnotations().length);
    System.out.println(module.getDeclaredAnnotations().length);
    System.out.println(module.getClassLoader() == Java9ClassModule.class.getClassLoader());
    System.out.println(module.getDescriptor() == null);
    System.out.println(module.getLayer() == null);
    System.out.println(module.getPackages().contains("classes.modern_test"));
    System.out.println(module.getPackages().contains("java.lang"));
    InputStream classStream = module.getResourceAsStream(classResource);
    System.out.println(classStream != null);
    if (classStream != null) {
      classStream.close();
    }
    System.out.println(module.getResourceAsStream("classes/modern_test/MissingModuleResource.nope") == null);
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
    printFailure("add-reads-null", new Runnable() {
      public void run() {
        module.addReads(null);
      }
    });
    printFailure("export-to-null", new Runnable() {
      public void run() {
        module.isExported("classes.modern_test", null);
      }
    });
    printFailure("open-to-null", new Runnable() {
      public void run() {
        module.isOpen("classes.modern_test", null);
      }
    });
    printFailure("add-export-null", new Runnable() {
      public void run() {
        module.addExports("classes.modern_test", null);
      }
    });
    printFailure("add-open-null", new Runnable() {
      public void run() {
        module.addOpens("classes.modern_test", null);
      }
    });
    printFailure("add-uses-null", new Runnable() {
      public void run() {
        module.addUses(null);
      }
    });
    printFailure("can-use-null", new Runnable() {
      public void run() {
        module.canUse(null);
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
