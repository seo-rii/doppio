package classes.modern_test;

public class Java17StrictMathCosh {
  public static void main(String[] args) {
    print(StrictMath.cosh(-0.0d));
    print(StrictMath.cosh(0.0d));
    printRounded(StrictMath.cosh(1.0d));
    printRounded(StrictMath.cosh(-1.0d));
    print(StrictMath.cosh(20.0d));
    print(StrictMath.cosh(-20.0d));
    print(StrictMath.cosh(710.0d));
    print(StrictMath.cosh(-710.0d));
    print(StrictMath.cosh(Double.POSITIVE_INFINITY));
    print(StrictMath.cosh(Double.NEGATIVE_INFINITY));
    System.out.println(Double.isNaN(StrictMath.cosh(Double.NaN)));
  }

  private static void print(double value) {
    System.out.println(Double.doubleToRawLongBits(value));
  }

  private static void printRounded(double value) {
    System.out.printf("%.12f%n", value);
  }
}
