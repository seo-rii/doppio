package classes.modern_test;

import java.lang.Enum.EnumDesc;
import java.lang.invoke.MethodHandles;
import java.util.Optional;

public class Java12EnumConstable {
  private enum Color {
    RED,
    BLUE
  }

  public static void main(String[] args) throws Throwable {
    print(Color.RED);
    print(Color.BLUE);
  }

  private static void print(Color color) throws Throwable {
    Optional<? extends EnumDesc<Color>> described = color.describeConstable();
    EnumDesc<Color> constant = described.get();
    System.out.println(described.isPresent());
    System.out.println(constant.getClass().getName());
    System.out.println(constant.constantName());
    System.out.println(constant.constantType().descriptorString());
    System.out.println(constant.bootstrapMethod().methodName());
    System.out.println(constant.resolveConstantDesc(MethodHandles.lookup()) == color);
  }
}
