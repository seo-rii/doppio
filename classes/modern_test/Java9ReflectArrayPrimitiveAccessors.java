package classes.modern_test;

import java.lang.reflect.Array;

public class Java9ReflectArrayPrimitiveAccessors {
  public static void main(String[] args) {
    boolean[] booleans = new boolean[] { true };
    byte[] bytes = new byte[] { 7 };
    short[] shorts = new short[] { 300 };
    char[] chars = new char[] { 'A' };
    int[] ints = new int[] { 11 };
    long[] longs = new long[] { 12L };
    float[] floats = new float[] { 1.5f };
    double[] doubles = new double[] { 2.5d };

    System.out.println(Array.getBoolean(booleans, 0));
    System.out.println(Array.getByte(bytes, 0));
    System.out.println(Array.getShort(bytes, 0) + ":" + Array.getShort(shorts, 0));
    System.out.println(Array.getChar(chars, 0));
    System.out.println(
        Array.getInt(bytes, 0) + ":" +
        Array.getInt(shorts, 0) + ":" +
        Array.getInt(chars, 0) + ":" +
        Array.getInt(ints, 0));
    System.out.println(
        Array.getLong(bytes, 0) + ":" +
        Array.getLong(shorts, 0) + ":" +
        Array.getLong(chars, 0) + ":" +
        Array.getLong(ints, 0) + ":" +
        Array.getLong(longs, 0));
    System.out.println(
        Array.getFloat(bytes, 0) + ":" +
        Array.getFloat(shorts, 0) + ":" +
        Array.getFloat(chars, 0) + ":" +
        Array.getFloat(ints, 0) + ":" +
        Array.getFloat(longs, 0) + ":" +
        Array.getFloat(floats, 0));
    System.out.println(
        Array.getDouble(bytes, 0) + ":" +
        Array.getDouble(shorts, 0) + ":" +
        Array.getDouble(chars, 0) + ":" +
        Array.getDouble(ints, 0) + ":" +
        Array.getDouble(longs, 0) + ":" +
        Array.getDouble(floats, 0) + ":" +
        Array.getDouble(doubles, 0));

    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.getBoolean(new int[] { 1 }, 0);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.getByte(new short[] { 1 }, 0);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.getChar(new int[] { 65 }, 0);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.getInt(new boolean[] { true }, 0);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.getInt(new int[] { 1 }, 1);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.getInt(null, 0);
      }
    }));
    System.out.println(exceptionName(new Action() {
      public void run() {
        Array.getInt("not-an-array", 0);
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
