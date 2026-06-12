package classes.modern_test;

public class Java17ThrowableStackTraceLoop {
  private static final int ITERATIONS = 750;

  public static void main(String[] args) {
    int checksum = 0;
    for (int i = 0; i < ITERATIONS; i++) {
      checksum += capture(i).getStackTrace()[0].getMethodName().length();
    }
    System.out.println(checksum);

    Throwable refilled = capture(ITERATIONS);
    System.out.println(refilled.fillInStackTrace() == refilled);
    System.out.println(refilled.getStackTrace()[0].getMethodName());
  }

  private static Throwable capture(int value) {
    try {
      return nested(value);
    } catch (IllegalStateException ex) {
      return ex;
    }
  }

  private static Throwable nested(int value) {
    if ((value & 1) == 0) {
      throw new IllegalStateException("even");
    }
    throw new IllegalStateException("odd");
  }
}
