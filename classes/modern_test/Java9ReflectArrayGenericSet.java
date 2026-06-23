package classes.modern_test;

import java.lang.reflect.Array;
import java.util.Arrays;

public class Java9ReflectArrayGenericSet {
  public static void main(String[] args) {
    Object[] objects = new Object[] { "keep", "old" };
    Number[] numbers = new Number[3];
    boolean[] booleans = new boolean[1];
    byte[] bytes = new byte[1];
    short[] shorts = new short[2];
    char[] chars = new char[1];
    int[] ints = new int[4];
    long[] longs = new long[3];
    float[] floats = new float[3];
    double[] doubles = new double[5];

    Array.set(objects, 0, null);
    Array.set(objects, 1, "text");
    Array.set(numbers, 0, Integer.valueOf(7));
    Array.set(numbers, 1, Double.valueOf(1.5d));
    Array.set(numbers, 2, null);

    Array.set(booleans, 0, Boolean.TRUE);
    Array.set(bytes, 0, Byte.valueOf((byte) 1));
    Array.set(shorts, 0, Byte.valueOf((byte) 2));
    Array.set(shorts, 1, Short.valueOf((short) 300));
    Array.set(chars, 0, Character.valueOf('Z'));
    Array.set(ints, 0, Byte.valueOf((byte) 3));
    Array.set(ints, 1, Short.valueOf((short) 4));
    Array.set(ints, 2, Character.valueOf('A'));
    Array.set(ints, 3, Integer.valueOf(5));
    Array.set(longs, 0, Integer.valueOf(6));
    Array.set(longs, 1, Long.valueOf(7L));
    Array.set(longs, 2, Character.valueOf('B'));
    Array.set(floats, 0, Integer.valueOf(8));
    Array.set(floats, 1, Long.valueOf(9L));
    Array.set(floats, 2, Float.valueOf(1.25f));
    Array.set(doubles, 0, Integer.valueOf(10));
    Array.set(doubles, 1, Long.valueOf(11L));
    Array.set(doubles, 2, Float.valueOf(2.5f));
    Array.set(doubles, 3, Double.valueOf(3.5d));
    Array.set(doubles, 4, Character.valueOf('C'));

    System.out.println(Arrays.toString(objects));
    System.out.println(numbers[0].getClass().getSimpleName() + ":" + numbers[0]);
    System.out.println(numbers[1].getClass().getSimpleName() + ":" + numbers[1]);
    System.out.println(numbers[2] == null);
    System.out.println(Arrays.toString(booleans));
    System.out.println(Arrays.toString(bytes));
    System.out.println(Arrays.toString(shorts));
    System.out.println(Arrays.toString(chars));
    System.out.println(Arrays.toString(ints));
    System.out.println(Arrays.toString(longs));
    System.out.println(Arrays.toString(floats));
    System.out.println(Arrays.toString(doubles));

    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set(new int[1], 0, null);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set(new boolean[1], 0, Integer.valueOf(1));
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set(new byte[1], 0, Short.valueOf((short) 1));
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set(new char[1], 0, Integer.valueOf(65));
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set(new String[1], 0, new Object());
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set(null, 0, "x");
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set("not-an-array", 0, "x");
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.set(new String[1], 1, null);
      }
    }));
  }

  private static String exceptionName(Action action) {
    try {
      action.run();
      return "none";
    } catch (Throwable t) {
      return t.getClass().getSimpleName();
    }
  }

  private interface Action {
    void run();
  }
}
