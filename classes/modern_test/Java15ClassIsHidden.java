package classes.modern_test;

public class Java15ClassIsHidden {
  public static void main(String[] args) {
    class Local {}

    Runnable anonymous = new Runnable() {
      public void run() {}
    };

    print(Java15ClassIsHidden.class);
    print(Nested.class);
    print(Local.class);
    print(anonymous.getClass());
    print(String.class);
    print(int.class);
    print(void.class);
    print(String[].class);
    print(int[][].class);
  }

  private static void print(Class<?> cls) {
    System.out.println(cls.isHidden());
  }

  private static final class Nested {}
}
