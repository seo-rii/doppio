package classes.modern_test;

import java.util.Optional;

public class Java12WrapperConstable {
  public static void main(String[] args) throws Throwable {
    Integer integer = Integer.valueOf(42);
    Optional<Integer> integerDesc = integer.describeConstable();
    System.out.println(integerDesc.isPresent());
    System.out.println(integerDesc.get() == integer);
    System.out.println(integer.resolveConstantDesc(null) == integer);

    Long longValue = Long.valueOf(42L);
    Optional<Long> longDesc = longValue.describeConstable();
    System.out.println(longDesc.isPresent());
    System.out.println(longDesc.get() == longValue);
    System.out.println(longValue.resolveConstantDesc(null) == longValue);

    Float floatValue = Float.valueOf(-0.0f);
    Optional<Float> floatDesc = floatValue.describeConstable();
    System.out.println(floatDesc.isPresent());
    System.out.println(Float.floatToRawIntBits(floatDesc.get().floatValue()));
    System.out.println(floatValue.resolveConstantDesc(null) == floatValue);

    Double doubleValue = Double.valueOf(-0.0d);
    Optional<Double> doubleDesc = doubleValue.describeConstable();
    System.out.println(doubleDesc.isPresent());
    System.out.println(Double.doubleToRawLongBits(doubleDesc.get().doubleValue()));
    System.out.println(doubleValue.resolveConstantDesc(null) == doubleValue);
  }
}
