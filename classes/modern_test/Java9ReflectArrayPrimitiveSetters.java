package classes.modern_test;

import java.lang.reflect.Array;
import java.util.Arrays;

public class Java9ReflectArrayPrimitiveSetters {
  public static void main(String[] args) {
    boolean[] booleans = new boolean[1];
    byte[] bytes = new byte[1];
    short[] shorts = new short[2];
    char[] chars = new char[1];
    int[] ints = new int[4];
    long[] longs = new long[4];
    float[] floats = new float[4];
    double[] doubles = new double[5];

    Array.setBoolean(booleans, 0, true);
    Array.setByte(bytes, 0, (byte) 7);
    Array.setByte(shorts, 0, (byte) 8);
    Array.setShort(shorts, 1, (short) 300);
    Array.setChar(chars, 0, 'A');
    Array.setByte(ints, 0, (byte) 9);
    Array.setShort(ints, 1, (short) 10);
    Array.setChar(ints, 2, 'B');
    Array.setInt(ints, 3, 11);
    Array.setInt(longs, 0, 12);
    Array.setLong(longs, 1, 13L);
    Array.setChar(longs, 2, 'C');
    Array.setByte(longs, 3, (byte) 14);
    Array.setInt(floats, 0, 15);
    Array.setLong(floats, 1, 16L);
    Array.setFloat(floats, 2, 1.5f);
    Array.setShort(floats, 3, (short) 17);
    Array.setInt(doubles, 0, 18);
    Array.setLong(doubles, 1, 19L);
    Array.setFloat(doubles, 2, 2.5f);
    Array.setDouble(doubles, 3, 3.5d);
    Array.setChar(doubles, 4, 'D');

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
        Array.setBoolean(new int[1], 0, true);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.setInt(new boolean[1], 0, 1);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.setDouble(new float[1], 0, 1.0d);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.setInt(new int[1], 1, 1);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.setInt(null, 0, 1);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.setInt("not-an-array", 0, 1);
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
