package classes.modern_test;

public class Java15MathAbsExact {
  public static void main(String[] args) {
    System.out.println(Math.absExact(0));
    System.out.println(Math.absExact(-1));
    System.out.println(Math.absExact(Integer.MAX_VALUE));
    printThrowable(() -> Math.absExact(Integer.MIN_VALUE));
    System.out.println(Math.absExact(0L));
    System.out.println(Math.absExact(-1L));
    System.out.println(Math.absExact(Long.MAX_VALUE));
    printThrowable(() -> Math.absExact(Long.MIN_VALUE));
    System.out.println(StrictMath.absExact(0));
    System.out.println(StrictMath.absExact(-1));
    System.out.println(StrictMath.absExact(Integer.MAX_VALUE));
    printThrowable(() -> StrictMath.absExact(Integer.MIN_VALUE));
    System.out.println(StrictMath.absExact(0L));
    System.out.println(StrictMath.absExact(-1L));
    System.out.println(StrictMath.absExact(Long.MAX_VALUE));
    printThrowable(() -> StrictMath.absExact(Long.MIN_VALUE));
    System.out.println(Math.absExact(-1234567890123456789L) ==
        StrictMath.absExact(-1234567890123456789L));
  }

  private static void printThrowable(Runnable action) {
    try {
      action.run();
      System.out.println(false);
    } catch (Throwable t) {
      System.out.println(t.getClass().getName());
    }
  }
}
