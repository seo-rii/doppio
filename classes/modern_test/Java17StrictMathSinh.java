package classes.modern_test;

public class Java17StrictMathSinh {
  private static void printRounded(double value) {
    System.out.println(String.format("%.13g", value));
  }

  public static void main(String[] args) {
    System.out.println(Double.doubleToRawLongBits(StrictMath.sinh(-0.0d)));
    System.out.println(Double.doubleToRawLongBits(StrictMath.sinh(0.0d)));
    printRounded(StrictMath.sinh(1.0d));
    printRounded(StrictMath.sinh(-1.0d));
    printRounded(StrictMath.sinh(20.0d));
    printRounded(StrictMath.sinh(-20.0d));
    printRounded(StrictMath.sinh(Double.MIN_VALUE));
    System.out.println(StrictMath.sinh(Double.POSITIVE_INFINITY));
    System.out.println(StrictMath.sinh(Double.NEGATIVE_INFINITY));
    System.out.println(Double.isNaN(StrictMath.sinh(Double.NaN)));
  }
}
