package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.util.Optional;

public class Java12ClassConstable {
  public static void main(String[] args) {
    print(String.class);
    print(int.class);
    print(String[][].class);
    print(void.class);
  }

  private static void print(Class<?> cls) {
    Optional<ClassDesc> described = cls.describeConstable();
    System.out.println(described.isPresent());
    System.out.println(described.get().descriptorString());
    System.out.println(described.get().displayName());
  }
}
