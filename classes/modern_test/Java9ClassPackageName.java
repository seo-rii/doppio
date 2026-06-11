package classes.modern_test;

import java.util.Map;

public class Java9ClassPackageName {
  public static void main(String[] args) {
    class Local {}

    Runnable anonymous = new Runnable() {
      public void run() {}
    };

    print(Java9ClassPackageName.class);
    print(Nested.class);
    print(Local.class);
    print(anonymous.getClass());
    print(String.class);
    print(Map.Entry.class);
    print(int.class);
    print(void.class);
    print(String[][].class);
    print(int[][].class);
    print(Java9ClassPackageName[].class);
  }

  private static void print(Class<?> cls) {
    System.out.println(cls.getPackageName());
  }

  private static final class Nested {}
}
