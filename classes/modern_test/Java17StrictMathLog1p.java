package classes.modern_test;

public class Java17StrictMathLog1p {
  private static void printRounded(double value) {
    System.out.println(String.format("%.13g", value));
  }

  public static void main(String[] args) {
    System.out.println(Double.doubleToRawLongBits(StrictMath.log1p(-0.0d)));
    System.out.println(Double.doubleToRawLongBits(StrictMath.log1p(0.0d)));
    printRounded(StrictMath.log1p(1.0d));
    printRounded(StrictMath.log1p(-0.5d));
    printRounded(StrictMath.log1p(Double.MIN_VALUE));
    System.out.println(StrictMath.log1p(Double.POSITIVE_INFINITY));
    System.out.println(Double.isNaN(StrictMath.log1p(-2.0d)));
  }
}
