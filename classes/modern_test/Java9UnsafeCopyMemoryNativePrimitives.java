package classes.modern_test;

import java.lang.reflect.Field;
import java.util.Arrays;
import sun.misc.Unsafe;

public class Java9UnsafeCopyMemoryNativePrimitives {
  private static Unsafe getUnsafe() throws Exception {
    Field field = Unsafe.class.getDeclaredField("theUnsafe");
    field.setAccessible(true);
    return (Unsafe) field.get(null);
  }

  public static void main(String[] args) throws Exception {
    Unsafe unsafe = getUnsafe();
    long address = unsafe.allocateMemory(128);
    try {
      unsafe.setMemory(null, address, 128, (byte) 0);

      long intBase = unsafe.arrayBaseOffset(int[].class);
      long intScale = unsafe.arrayIndexScale(int[].class);
      int[] ints = new int[] {0x01020304, 0x05060708, 0x0a0b0c0d};
      unsafe.copyMemory(ints, intBase, null, address, ints.length * intScale);
      System.out.println(Integer.toHexString(unsafe.getInt(address)));
      System.out.println(Integer.toHexString(unsafe.getInt(address + intScale)));

      int[] intDest = new int[] {-1, -1, -1, -1};
      unsafe.putInt(address + 16, 0x11223344);
      unsafe.putInt(address + 20, 0x55667788);
      unsafe.copyMemory(null, address + 16, intDest, intBase + intScale, 2 * intScale);
      System.out.println(Arrays.toString(intDest));

      long shortBase = unsafe.arrayBaseOffset(short[].class);
      long shortScale = unsafe.arrayIndexScale(short[].class);
      short[] shorts = new short[] {-1234, 2345};
      unsafe.copyMemory(shorts, shortBase, null, address + 32, shorts.length * shortScale);
      System.out.println(unsafe.getShort(address + 32));
      System.out.println(unsafe.getShort(address + 34));

      short[] shortDest = new short[] {-1, -1, -1};
      unsafe.putShort(address + 40, (short) 3210);
      unsafe.putShort(address + 42, (short) -4321);
      unsafe.copyMemory(null, address + 40, shortDest, shortBase + shortScale, 2 * shortScale);
      System.out.println(Arrays.toString(shortDest));

      long charBase = unsafe.arrayBaseOffset(char[].class);
      long charScale = unsafe.arrayIndexScale(char[].class);
      char[] chars = new char[] {'A', '\u20ac'};
      unsafe.copyMemory(chars, charBase, null, address + 48, chars.length * charScale);
      System.out.println((int) unsafe.getChar(address + 48));
      System.out.println((int) unsafe.getChar(address + 50));

      char[] charDest = new char[] {'x', 'x', 'x'};
      unsafe.putChar(address + 56, 'Z');
      unsafe.putChar(address + 58, '\u2603');
      unsafe.copyMemory(null, address + 56, charDest, charBase + charScale, 2 * charScale);
      System.out.println(Arrays.toString(charDest));

      long longBase = unsafe.arrayBaseOffset(long[].class);
      long longScale = unsafe.arrayIndexScale(long[].class);
      long[] longs = new long[] {0x0102030405060708L, -2L};
      unsafe.copyMemory(longs, longBase, null, address + 64, longs.length * longScale);
      System.out.println(Long.toHexString(unsafe.getLong(address + 64)));
      System.out.println(Long.toHexString(unsafe.getLong(address + 72)));

      long[] longDest = new long[] {-1L, -1L, -1L};
      unsafe.putLong(address + 80, 0x1122334455667788L);
      unsafe.putLong(address + 88, 0x0101010102020202L);
      unsafe.copyMemory(null, address + 80, longDest, longBase + longScale, 2 * longScale);
      System.out.println(Arrays.toString(longDest));

      long floatBase = unsafe.arrayBaseOffset(float[].class);
      long floatScale = unsafe.arrayIndexScale(float[].class);
      float[] floats = new float[] {-12.5f, 3.25f};
      unsafe.copyMemory(floats, floatBase, null, address + 96, floats.length * floatScale);
      System.out.println(Integer.toHexString(Float.floatToIntBits(unsafe.getFloat(address + 96))));
      System.out.println(Integer.toHexString(Float.floatToIntBits(unsafe.getFloat(address + 100))));

      float[] floatDest = new float[] {0f, 0f};
      unsafe.putFloat(address + 104, 1.5f);
      unsafe.putFloat(address + 108, -2.75f);
      unsafe.copyMemory(null, address + 104, floatDest, floatBase, 2 * floatScale);
      System.out.println(Integer.toHexString(Float.floatToIntBits(floatDest[0])));
      System.out.println(Integer.toHexString(Float.floatToIntBits(floatDest[1])));

      long doubleBase = unsafe.arrayBaseOffset(double[].class);
      long doubleScale = unsafe.arrayIndexScale(double[].class);
      double[] doubles = new double[] {Math.PI, -0.5d};
      unsafe.copyMemory(doubles, doubleBase, null, address + 112, doubles.length * doubleScale);
      System.out.println(Long.toHexString(Double.doubleToLongBits(unsafe.getDouble(address + 112))));
      System.out.println(Long.toHexString(Double.doubleToLongBits(unsafe.getDouble(address + 120))));

      double[] doubleDest = new double[] {0d, 0d};
      unsafe.putDouble(address, 6.25d);
      unsafe.putDouble(address + 8, -7.5d);
      unsafe.copyMemory(null, address, doubleDest, doubleBase, 2 * doubleScale);
      System.out.println(Long.toHexString(Double.doubleToLongBits(doubleDest[0])));
      System.out.println(Long.toHexString(Double.doubleToLongBits(doubleDest[1])));
    } finally {
      unsafe.freeMemory(address);
    }
  }
}
