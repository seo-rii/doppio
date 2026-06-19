package classes.modern_test;

import java.util.Set;
import java.util.TreeSet;

public class Java9ClassLoaderUnnamedModule {
  private static final class PlainLoader extends ClassLoader {
    PlainLoader() {
      super(null);
    }
  }

  public static void main(String[] args) {
    ClassLoader system = Java9ClassLoaderUnnamedModule.class.getClassLoader();
    Module loaderModule = system.getUnnamedModule();
    Module classModule = Java9ClassLoaderUnnamedModule.class.getModule();
    PlainLoader plain = new PlainLoader();
    Module plainModule = plain.getUnnamedModule();
    Set<String> selectedNames = new TreeSet<String>();

    for (String name : loaderModule.getPackages()) {
      if ("classes.modern_test".equals(name) || "java.lang".equals(name)) {
        selectedNames.add(name);
      }
    }

    System.out.println(loaderModule == classModule);
    System.out.println(loaderModule == system.getUnnamedModule());
    System.out.println(loaderModule.getClassLoader() == system);
    System.out.println(!loaderModule.isNamed());
    System.out.println(loaderModule.getName() == null);
    System.out.println(loaderModule.getDescriptor() == null);
    System.out.println(loaderModule.getLayer() == null);
    System.out.println(selectedNames);
    System.out.println(plainModule == plain.getUnnamedModule());
    System.out.println(plainModule.getClassLoader() == plain);
    System.out.println(plainModule.getPackages().isEmpty());
    System.out.println(plainModule.toString().startsWith("unnamed module"));
  }
}
