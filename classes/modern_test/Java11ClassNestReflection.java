package classes.modern_test;

import java.util.Arrays;

public class Java11ClassNestReflection {
  private static int secret = 9;

  public static void main(String[] args) {
    class Local {
      int read() {
        return secret;
      }
    }

    Probe anonymous = new Probe() {
      public int read() {
        return secret;
      }
    };

    System.out.println(new Nested().read());
    System.out.println(new Local().read());
    System.out.println(anonymous.read());

    printHost("host", Java11ClassNestReflection.class);
    printHost("nested", Nested.class);
    printHost("sibling", Sibling.class);
    printHost("local", Local.class);
    printHost("anonymous", anonymous.getClass());
    printHost("string", String.class);
    printHost("primitive", int.class);
    printHost("void", void.class);
    printHost("array", String[].class);

    printNestmate("host-nested", Java11ClassNestReflection.class, Nested.class);
    printNestmate("nested-sibling", Nested.class, Sibling.class);
    printNestmate("host-local", Java11ClassNestReflection.class, Local.class);
    printNestmate("host-anonymous", Java11ClassNestReflection.class, anonymous.getClass());
    printNestmate("host-string", Java11ClassNestReflection.class, String.class);
    printNestmate("primitive-self", int.class, int.class);
    printNestmate("array-self", String[].class, String[].class);

    printMembers("host", Java11ClassNestReflection.class);
    printMembers("nested", Nested.class);
    printMembers("primitive", int.class);
    printMembers("void", void.class);
    printMembers("array", String[].class);

    printFailure("null-nestmate", () -> Java11ClassNestReflection.class.isNestmateOf(null));
  }

  private static void printHost(String label, Class<?> cls) {
    System.out.println(label + ":" + cls.getNestHost().getName());
  }

  private static void printNestmate(String label, Class<?> first, Class<?> second) {
    System.out.println(label + ":" + first.isNestmateOf(second));
  }

  private static void printMembers(String label, Class<?> cls) {
    String[] names = new String[cls.getNestMembers().length];
    Class<?>[] members = cls.getNestMembers();
    for (int i = 0; i < members.length; i++) {
      names[i] = members[i].getName();
    }
    Arrays.sort(names);
    System.out.println(label + ":" + Arrays.toString(names));
  }

  private static void printFailure(String label, ThrowingRunnable action) {
    try {
      action.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Probe {
    int read();
  }

  private static final class Nested {
    int read() {
      return secret;
    }
  }

  private static final class Sibling {}

  private interface ThrowingRunnable {
    void run() throws Exception;
  }
}
