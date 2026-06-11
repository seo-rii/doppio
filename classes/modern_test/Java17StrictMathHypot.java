package classes.modern_test;

public class Java17StrictMathHypot {
  public static void main(String[] args) {
    print(StrictMath.hypot(Double.MAX_VALUE, 0.0d));
    print(StrictMath.hypot(Double.MAX_VALUE, Double.MAX_VALUE));
    print(StrictMath.hypot(Double.MIN_VALUE, Double.MIN_VALUE));
    print(StrictMath.hypot(3.0d, 4.0d));
    print(StrictMath.hypot(Double.POSITIVE_INFINITY, Double.NaN));
    print(StrictMath.hypot(Double.NaN, Double.POSITIVE_INFINITY));
  }

  private static void print(double value) {
    System.out.println(Double.doubleToRawLongBits(value));
  }
}
