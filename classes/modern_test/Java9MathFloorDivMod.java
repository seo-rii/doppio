package classes.modern_test;

public class Java9MathFloorDivMod {
  public static void main(String[] args) {
    printMath(7L, 3);
    printMath(-7L, 3);
    printMath(7L, -3);
    printMath(-7L, -3);
    printMath(Long.MIN_VALUE, -1);
    printMath(Long.MIN_VALUE, 3);
    printMath(Long.MAX_VALUE, -7);
    printMath(1234567890123456789L, 1000);
    printMath(-1234567890123456789L, 1000);
    printThrowable(() -> Math.floorDiv(1L, 0));
    printThrowable(() -> Math.floorMod(1L, 0));
    System.out.println(Math.floorDiv(-987654321098765432L, 321) ==
        StrictMath.floorDiv(-987654321098765432L, 321));
    System.out.println(Math.floorMod(-987654321098765432L, 321) ==
        StrictMath.floorMod(-987654321098765432L, 321));
  }

  private static void printMath(long left, int right) {
    System.out.println(Math.floorDiv(left, right));
    System.out.println(Math.floorMod(left, right));
    System.out.println(StrictMath.floorDiv(left, right));
    System.out.println(StrictMath.floorMod(left, right));
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
