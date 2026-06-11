package classes.modern_test;

public class Java9MathMultiplyFull {
  public static void main(String[] args) {
    System.out.println(Math.multiplyFull(0, 123));
    System.out.println(Math.multiplyFull(12345, -6789));
    System.out.println(Math.multiplyFull(Integer.MAX_VALUE, Integer.MAX_VALUE));
    System.out.println(Math.multiplyFull(Integer.MIN_VALUE, -1));
    System.out.println(Math.multiplyFull(Integer.MIN_VALUE, Integer.MIN_VALUE));
    System.out.println(StrictMath.multiplyFull(0, 123));
    System.out.println(StrictMath.multiplyFull(12345, -6789));
    System.out.println(StrictMath.multiplyFull(Integer.MAX_VALUE, Integer.MAX_VALUE));
    System.out.println(StrictMath.multiplyFull(Integer.MIN_VALUE, -1));
    System.out.println(StrictMath.multiplyFull(Integer.MIN_VALUE, Integer.MIN_VALUE));
    System.out.println(Math.multiplyFull(Integer.MAX_VALUE, -2) == StrictMath.multiplyFull(Integer.MAX_VALUE, -2));
  }
}
