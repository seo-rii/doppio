package classes.modern_test;

import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class Java9UnsafeCompareAndSwap {
  private int intValue = 1;
  private long longValue = 2L;
  private static int staticIntValue = 3;

  public static void main(String[] args) throws Exception {
    Unsafe unsafe = getUnsafe();
    Java9UnsafeCompareAndSwap target = new Java9UnsafeCompareAndSwap();

    long intOffset = unsafe.objectFieldOffset(Java9UnsafeCompareAndSwap.class.getDeclaredField("intValue"));
    System.out.println(unsafe.compareAndSwapInt(target, intOffset, 0, 10));
    System.out.println(target.intValue);
    System.out.println(unsafe.compareAndSwapInt(target, intOffset, 1, 10));
    System.out.println(target.intValue);
    System.out.println(unsafe.getAndAddInt(target, intOffset, 5));
    System.out.println(target.intValue);

    long longOffset = unsafe.objectFieldOffset(Java9UnsafeCompareAndSwap.class.getDeclaredField("longValue"));
    System.out.println(unsafe.compareAndSwapLong(target, longOffset, 0L, 20L));
    System.out.println(target.longValue);
    System.out.println(unsafe.compareAndSwapLong(target, longOffset, 2L, 20L));
    System.out.println(target.longValue);
    System.out.println(unsafe.getAndAddLong(target, longOffset, 7L));
    System.out.println(target.longValue);

    Field staticField = Java9UnsafeCompareAndSwap.class.getDeclaredField("staticIntValue");
    long staticOffset = unsafe.staticFieldOffset(staticField);
    Object staticBase = unsafe.staticFieldBase(staticField);
    System.out.println(unsafe.compareAndSwapInt(staticBase, staticOffset, 3, 30));
    System.out.println(staticIntValue);
    System.out.println(unsafe.getAndAddInt(staticBase, staticOffset, 4));
    System.out.println(staticIntValue);
  }

  private static Unsafe getUnsafe() throws Exception {
    Field field = Unsafe.class.getDeclaredField("theUnsafe");
    field.setAccessible(true);
    return (Unsafe) field.get(null);
  }
}
