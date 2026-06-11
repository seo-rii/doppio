package classes.modern_test;

import java.util.Map;

public class Java12ClassDescriptorString {
  public static void main(String[] args) {
    class Local {}

    print(String.class);
    print(Map.Entry.class);
    print(Java12ClassDescriptorString.class);
    print(Nested.class);
    print(Local.class);
    print(int.class);
    print(void.class);
    print(String[][].class);
    print(int[][].class);
    print(Java12ClassDescriptorString[].class);
  }

  private static void print(Class<?> cls) {
    System.out.println(cls.descriptorString());
  }

  private static final class Nested {}
}
