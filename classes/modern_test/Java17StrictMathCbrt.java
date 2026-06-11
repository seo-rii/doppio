package classes.modern_test;

public class Java17StrictMathCbrt {
  public static void main(String[] args) {
    print(StrictMath.cbrt(-0.0d));
    print(StrictMath.cbrt(0.0d));
    print(StrictMath.cbrt(8.0d));
    print(StrictMath.cbrt(-8.0d));
    print(StrictMath.cbrt(Double.MIN_VALUE));
    print(StrictMath.cbrt(-Double.MIN_VALUE));
    print(StrictMath.cbrt(Double.POSITIVE_INFINITY));
    print(StrictMath.cbrt(Double.NEGATIVE_INFINITY));
    System.out.println(Double.isNaN(StrictMath.cbrt(Double.NaN)));
  }

  private static void print(double value) {
    System.out.println(Double.doubleToRawLongBits(value));
  }
}
