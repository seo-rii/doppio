package classes.modern_test;

import java.lang.reflect.Field;
import java.util.Arrays;
import sun.misc.Unsafe;

public class Java9UnsafeCopyMemoryArrays {
  private static Unsafe getUnsafe() throws Exception {
    Field field = Unsafe.class.getDeclaredField("theUnsafe");
    field.setAccessible(true);
    return (Unsafe) field.get(null);
  }

  public static void main(String[] args) throws Exception {
    Unsafe unsafe = getUnsafe();
    long base = unsafe.arrayBaseOffset(byte[].class);

    byte[] source = new byte[] {10, 11, 12, 13, 14, 15};
    byte[] dest = new byte[8];
    Arrays.fill(dest, (byte) -1);
    unsafe.copyMemory(source, base + 1, dest, base + 2, 4);
    System.out.println(Arrays.toString(dest));

    byte[] overlapRight = new byte[] {0, 1, 2, 3, 4, 5};
    unsafe.copyMemory(overlapRight, base + 1, overlapRight, base + 2, 3);
    System.out.println(Arrays.toString(overlapRight));

    byte[] overlapLeft = new byte[] {0, 1, 2, 3, 4, 5};
    unsafe.copyMemory(overlapLeft, base + 2, overlapLeft, base + 1, 3);
    System.out.println(Arrays.toString(overlapLeft));

    byte[] zeroLength = new byte[] {7, 8, 9};
    unsafe.copyMemory(zeroLength, base, zeroLength, base + 1, 0);
    System.out.println(Arrays.toString(zeroLength));
  }
}
