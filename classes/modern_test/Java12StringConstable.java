package classes.modern_test;

import java.lang.invoke.MethodHandles;
import java.util.Optional;

public class Java12StringConstable {
  public static void main(String[] args) throws Throwable {
    String value = "abc";
    Optional<String> described = value.describeConstable();
    System.out.println(described.isPresent());
    System.out.println(described.get());
    System.out.println(described.get() == value);
    System.out.println(value.resolveConstantDesc(null) == value);
    System.out.println(value.resolveConstantDesc(MethodHandles.lookup()));
  }
}
