package classes.modern_test;

import java.util.Arrays;

public class Java17SealedReflection {
  public static void main(String[] args) {
    printSealed("shape", Shape.class);
    printPermitted("shape", Shape.class);
    printSealed("circle", Circle.class);
    printPermitted("circle", Circle.class);
    printSealed("plain", Plain.class);
    printPermitted("plain", Plain.class);
    printSealed("string", String.class);
    printPermitted("string", String.class);
    printSealed("primitive", int.class);
    printPermitted("primitive", int.class);
    printSealed("void", void.class);
    printPermitted("void", void.class);
    printSealed("array", Shape[].class);
    printPermitted("array", Shape[].class);
  }

  private static void printSealed(String label, Class<?> cls) {
    System.out.println(label + ":" + cls.isSealed());
  }

  private static void printPermitted(String label, Class<?> cls) {
    Class<?>[] permitted = cls.getPermittedSubclasses();
    if (permitted == null) {
      System.out.println(label + ":null");
      return;
    }
    String[] names = new String[permitted.length];
    for (int i = 0; i < permitted.length; i++) {
      names[i] = permitted[i].getName();
    }
    Arrays.sort(names);
    System.out.println(label + ":" + Arrays.toString(names));
  }

  sealed interface Shape permits Circle, Square {}

  static final class Circle implements Shape {}

  static final class Square implements Shape {}

  static final class Plain {}
}
