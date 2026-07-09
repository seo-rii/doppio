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

    long intBase = unsafe.arrayBaseOffset(int[].class);
    long intScale = unsafe.arrayIndexScale(int[].class);
    int[] intSource = new int[] {10, 11, 12, 13, 14};
    int[] intDest = new int[] {-1, -1, -1, -1, -1, -1};
    unsafe.copyMemory(intSource, intBase + intScale, intDest, intBase + (2 * intScale), 3 * intScale);
    System.out.println(Arrays.toString(intDest));

    int[] intOverlap = new int[] {0, 1, 2, 3, 4, 5};
    unsafe.copyMemory(intOverlap, intBase + intScale, intOverlap, intBase + (2 * intScale), 3 * intScale);
    System.out.println(Arrays.toString(intOverlap));

    long longBase = unsafe.arrayBaseOffset(long[].class);
    long longScale = unsafe.arrayIndexScale(long[].class);
    long[] longSource = new long[] {100L, 101L, 102L, 103L};
    long[] longDest = new long[] {-1L, -1L, -1L, -1L};
    unsafe.copyMemory(longSource, longBase + longScale, longDest, longBase + longScale, 2 * longScale);
    System.out.println(Arrays.toString(longDest));

    long charBase = unsafe.arrayBaseOffset(char[].class);
    long charScale = unsafe.arrayIndexScale(char[].class);
    char[] charSource = new char[] {'a', 'b', 'c', 'd'};
    char[] charDest = new char[] {'x', 'x', 'x', 'x', 'x'};
    unsafe.copyMemory(charSource, charBase + charScale, charDest, charBase, 3 * charScale);
    System.out.println(Arrays.toString(charDest));

    long shortBase = unsafe.arrayBaseOffset(short[].class);
    long shortScale = unsafe.arrayIndexScale(short[].class);
    short[] shortSource = new short[] {3, 4, 5, 6};
    short[] shortDest = new short[] {-1, -1, -1, -1};
    unsafe.copyMemory(shortSource, shortBase, shortDest, shortBase + shortScale, 3 * shortScale);
    System.out.println(Arrays.toString(shortDest));

    byte[] zeroLength = new byte[] {7, 8, 9};
    unsafe.copyMemory(zeroLength, base, zeroLength, base + 1, 0);
    System.out.println(Arrays.toString(zeroLength));

    byte[] filled = new byte[] {1, 2, 3, 4, 5, 6};
    unsafe.setMemory(filled, base + 2, 3, (byte) 9);
    System.out.println(Arrays.toString(filled));

    unsafe.setMemory(filled, base + 1, 0, (byte) 7);
    System.out.println(Arrays.toString(filled));

    long address = unsafe.allocateMemory(6);
    try {
      unsafe.setMemory(null, address, 6, (byte) -1);
      unsafe.copyMemory(source, base + 1, null, address + 1, 4);
      byte[] fromNative = new byte[] {0, 0, 0, 0, 0, 0};
      unsafe.copyMemory(null, address, fromNative, base, 6);
      System.out.println(Arrays.toString(fromNative));

      unsafe.setMemory(null, address + 2, 2, (byte) 7);
      byte[] afterNativeSet = new byte[] {0, 0, 0, 0, 0, 0};
      unsafe.copyMemory(null, address, afterNativeSet, base, 6);
      System.out.println(Arrays.toString(afterNativeSet));
    } finally {
      unsafe.freeMemory(address);
    }
  }
}
