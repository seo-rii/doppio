package classes.modern_test;

public class Java17StrictMathLog10 {
  public static void main(String[] args) {
    print(StrictMath.log10(-0.0d));
    print(StrictMath.log10(0.0d));
    print(StrictMath.log10(1.0d));
    print(StrictMath.log10(10.0d));
    print(StrictMath.log10(1000.0d));
    print(StrictMath.log10(0.1d));
    print(StrictMath.log10(Double.MIN_VALUE));
    print(StrictMath.log10(Double.POSITIVE_INFINITY));
    System.out.println(Double.isNaN(StrictMath.log10(Double.NaN)));
    System.out.println(Double.isNaN(StrictMath.log10(-1.0d)));
  }

  private static void print(double value) {
    System.out.println(Double.doubleToRawLongBits(value));
  }
}
