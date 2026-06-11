package classes.modern_test;

public class Java17StrictMathTanh {
  private static void printRounded(double value) {
    System.out.println(String.format("%.13g", value));
  }

  public static void main(String[] args) {
    System.out.println(Double.doubleToRawLongBits(StrictMath.tanh(-0.0d)));
    System.out.println(Double.doubleToRawLongBits(StrictMath.tanh(0.0d)));
    printRounded(StrictMath.tanh(1.0d));
    printRounded(StrictMath.tanh(-1.0d));
    System.out.println(StrictMath.tanh(20.0d));
    System.out.println(StrictMath.tanh(-20.0d));
    System.out.println(StrictMath.tanh(Double.POSITIVE_INFINITY));
    System.out.println(StrictMath.tanh(Double.NEGATIVE_INFINITY));
    System.out.println(Double.isNaN(StrictMath.tanh(Double.NaN)));
  }
}
