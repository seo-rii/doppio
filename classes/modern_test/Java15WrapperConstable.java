package classes.modern_test;

import java.lang.constant.DynamicConstantDesc;
import java.lang.invoke.MethodHandles;
import java.util.Optional;

public class Java15WrapperConstable {
  public static void main(String[] args) throws Throwable {
    print(Boolean.TRUE.describeConstable());
    print(Boolean.FALSE.describeConstable());
    print(Byte.valueOf((byte) -7).describeConstable());
    print(Short.valueOf((short) 1234).describeConstable());
    print(Character.valueOf('Z').describeConstable());
  }

  private static <T> void print(Optional<? extends DynamicConstantDesc<T>> described) throws Throwable {
    DynamicConstantDesc<T> constant = described.get();
    System.out.println(described.isPresent());
    System.out.println(constant.constantName());
    System.out.println(constant.constantType().descriptorString());
    System.out.println(constant.bootstrapMethod().methodName());
    System.out.println(constant.bootstrapArgs().length);
    System.out.println(constant.resolveConstantDesc(MethodHandles.lookup()));
  }
}
