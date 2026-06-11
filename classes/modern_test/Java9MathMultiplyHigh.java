package classes.modern_test;

public class Java9MathMultiplyHigh {
  public static void main(String[] args) {
    System.out.println(Math.multiplyHigh(0L, 123L));
    System.out.println(Math.multiplyHigh(1L << 32, 1L << 32));
    System.out.println(Math.multiplyHigh(Long.MAX_VALUE, Long.MAX_VALUE));
    System.out.println(Math.multiplyHigh(Long.MIN_VALUE, 2L));
    System.out.println(Math.multiplyHigh(Long.MIN_VALUE, -1L));
    System.out.println(Math.multiplyHigh(-1L, -1L));
    System.out.println(Math.multiplyHigh(Long.MIN_VALUE, Long.MIN_VALUE));
    System.out.println(Math.multiplyHigh(0x123456789ABCDEFL, -0x102030405060708L));
    System.out.println(StrictMath.multiplyHigh(0L, 123L));
    System.out.println(StrictMath.multiplyHigh(1L << 32, 1L << 32));
    System.out.println(StrictMath.multiplyHigh(Long.MAX_VALUE, Long.MAX_VALUE));
    System.out.println(StrictMath.multiplyHigh(Long.MIN_VALUE, 2L));
    System.out.println(StrictMath.multiplyHigh(Long.MIN_VALUE, -1L));
    System.out.println(StrictMath.multiplyHigh(-1L, -1L));
    System.out.println(StrictMath.multiplyHigh(Long.MIN_VALUE, Long.MIN_VALUE));
    System.out.println(StrictMath.multiplyHigh(0x123456789ABCDEFL, -0x102030405060708L));
    System.out.println(Math.multiplyHigh(-1234567890123456789L, 987654321098765432L) ==
        StrictMath.multiplyHigh(-1234567890123456789L, 987654321098765432L));
  }
}
