package classes.modern_test;

public class Java17StrictMathExpm1 {
  private static void printRounded(double value) {
    System.out.println(String.format("%.13g", value));
  }

  public static void main(String[] args) {
    System.out.println(Double.doubleToRawLongBits(StrictMath.expm1(-0.0d)));
    System.out.println(Double.doubleToRawLongBits(StrictMath.expm1(0.0d)));
    printRounded(StrictMath.expm1(1.0d));
    printRounded(StrictMath.expm1(-0.5d));
    printRounded(StrictMath.expm1(Double.MIN_VALUE));
    System.out.println(StrictMath.expm1(Double.POSITIVE_INFINITY));
    System.out.println(StrictMath.expm1(Double.NEGATIVE_INFINITY));
    System.out.println(Double.isNaN(StrictMath.expm1(Double.NaN)));
  }
}
