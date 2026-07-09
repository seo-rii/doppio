package classes.modern_test;

import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class Java9UnsafeNativeMemoryPrimitives {
  private static Unsafe getUnsafe() throws Exception {
    Field field = Unsafe.class.getDeclaredField("theUnsafe");
    field.setAccessible(true);
    return (Unsafe) field.get(null);
  }

  public static void main(String[] args) throws Exception {
    Unsafe unsafe = getUnsafe();
    long address = unsafe.allocateMemory(64);
    try {
      unsafe.setMemory(null, address, 64, (byte) 0);

      unsafe.putShort(address, (short) -12345);
      System.out.println(unsafe.getShort(address));

      unsafe.putChar(address + 2, 'K');
      System.out.println((int) unsafe.getChar(address + 2));

      unsafe.putFloat(address + 4, -12.5f);
      System.out.println(Integer.toHexString(Float.floatToIntBits(unsafe.getFloat(address + 4))));

      unsafe.putDouble(address + 8, Math.PI);
      System.out.println(Long.toHexString(Double.doubleToLongBits(unsafe.getDouble(address + 8))));

      unsafe.putLong(address + 16, 0x0102030405060708L);
      System.out.println(Long.toHexString(unsafe.getLong(address + 16)));

      unsafe.putAddress(address + 24, 0x12345678L);
      System.out.println(Long.toHexString(unsafe.getAddress(address + 24)));

      unsafe.putInt(address + 32, 0x0a0b0c0d);
      System.out.println(Integer.toHexString(unsafe.getInt(address + 32)));
    } finally {
      unsafe.freeMemory(address);
    }
  }
}
