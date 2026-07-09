package classes.modern_test;

import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class Java9UnsafeReallocateMemory {
  private static Unsafe getUnsafe() throws Exception {
    Field field = Unsafe.class.getDeclaredField("theUnsafe");
    field.setAccessible(true);
    return (Unsafe) field.get(null);
  }

  public static void main(String[] args) throws Exception {
    Unsafe unsafe = getUnsafe();
    long address = unsafe.allocateMemory(8);
    long allocatedFromNull = 0;
    try {
      for (int i = 0; i < 8; i++) {
        unsafe.putByte(address + i, (byte) (i + 1));
      }

      address = unsafe.reallocateMemory(address, 16);
      for (int i = 0; i < 8; i++) {
        System.out.print(unsafe.getByte(address + i));
      }
      System.out.println();

      address = unsafe.reallocateMemory(address, 4);
      for (int i = 0; i < 4; i++) {
        System.out.print(unsafe.getByte(address + i));
      }
      System.out.println();

      allocatedFromNull = unsafe.reallocateMemory(0, 4);
      unsafe.putInt(allocatedFromNull, 0x01020304);
      System.out.println(Integer.toHexString(unsafe.getInt(allocatedFromNull)));

      long freed = unsafe.reallocateMemory(allocatedFromNull, 0);
      allocatedFromNull = 0;
      System.out.println(freed);
    } finally {
      if (address != 0) {
        unsafe.freeMemory(address);
      }
      if (allocatedFromNull != 0) {
        unsafe.freeMemory(allocatedFromNull);
      }
    }
  }
}
