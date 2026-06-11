package classes.modern_test;

public class Java12ClassArrayType {
  public static void main(String[] args) {
    print(String.class);
    print(int.class);
    print(String[][].class);
    print(int[][].class);
    print(Java12ClassArrayType.class);
    print(Java12ClassArrayType[].class);
    System.out.println(String.class.arrayType() == String[].class);
    System.out.println(int.class.arrayType() == int[].class);
    printFailure("void-array", () -> void.class.arrayType());
  }

  private static void print(Class<?> cls) {
    System.out.println(cls.arrayType().descriptorString());
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName() + ":" + String.valueOf(t.getMessage()));
    }
  }

  private interface Throwing {
    void run();
  }
}
