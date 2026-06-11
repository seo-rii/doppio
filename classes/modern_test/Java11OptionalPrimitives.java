package classes.modern_test;

import java.util.OptionalDouble;
import java.util.OptionalInt;
import java.util.OptionalLong;

public class Java11OptionalPrimitives {
  public static void main(String[] args) {
    System.out.println(OptionalInt.empty().isEmpty());
    System.out.println(OptionalInt.of(4).isEmpty());
    System.out.println(OptionalLong.empty().isEmpty());
    System.out.println(OptionalLong.of(6L).isEmpty());
    System.out.println(OptionalDouble.empty().isEmpty());
    System.out.println(OptionalDouble.of(1.5).isEmpty());
  }
}
