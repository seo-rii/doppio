package classes.modern_test;

import java.lang.reflect.Field;
import java.util.Arrays;
import sun.misc.Unsafe;

public class Java9UnsafeSetMemoryPrimitiveArrays {
  private static Unsafe getUnsafe() throws Exception {
    Field field = Unsafe.class.getDeclaredField("theUnsafe");
    field.setAccessible(true);
    return (Unsafe) field.get(null);
  }

  public static void main(String[] args) throws Exception {
    Unsafe unsafe = getUnsafe();

    long shortBase = unsafe.arrayBaseOffset(short[].class);
    long shortScale = unsafe.arrayIndexScale(short[].class);
    short[] shorts = new short[] {1, 2, 3, 4};
    unsafe.setMemory(shorts, shortBase + shortScale, 2 * shortScale, (byte) 0x7f);
    System.out.println(Arrays.toString(shorts));

    long charBase = unsafe.arrayBaseOffset(char[].class);
    long charScale = unsafe.arrayIndexScale(char[].class);
    char[] chars = new char[] {'a', 'b', 'c'};
    unsafe.setMemory(chars, charBase, 2 * charScale, (byte) 0x41);
    System.out.println((int) chars[0] + "," + (int) chars[1] + "," + (int) chars[2]);

    long intBase = unsafe.arrayBaseOffset(int[].class);
    long intScale = unsafe.arrayIndexScale(int[].class);
    int[] ints = new int[] {1, 2, 3, 4};
    unsafe.setMemory(ints, intBase + intScale, 2 * intScale, (byte) 0x80);
    unsafe.setMemory(ints, intBase, 0, (byte) 0x11);
    System.out.println(Arrays.toString(ints));

    long longBase = unsafe.arrayBaseOffset(long[].class);
    long longScale = unsafe.arrayIndexScale(long[].class);
    long[] longs = new long[] {1L, 2L, 3L};
    unsafe.setMemory(longs, longBase + longScale, longScale, (byte) 0x01);
    System.out.println(Arrays.toString(longs));

    long floatBase = unsafe.arrayBaseOffset(float[].class);
    long floatScale = unsafe.arrayIndexScale(float[].class);
    float[] floats = new float[] {1f, 2f};
    unsafe.setMemory(floats, floatBase, 2 * floatScale, (byte) 0x3f);
    System.out.println(Integer.toHexString(Float.floatToIntBits(floats[0])));
    System.out.println(Integer.toHexString(Float.floatToIntBits(floats[1])));

    long doubleBase = unsafe.arrayBaseOffset(double[].class);
    long doubleScale = unsafe.arrayIndexScale(double[].class);
    double[] doubles = new double[] {1d, 2d};
    unsafe.setMemory(doubles, doubleBase + doubleScale, doubleScale, (byte) 0x40);
    System.out.println(Long.toHexString(Double.doubleToLongBits(doubles[0])));
    System.out.println(Long.toHexString(Double.doubleToLongBits(doubles[1])));
  }
}
