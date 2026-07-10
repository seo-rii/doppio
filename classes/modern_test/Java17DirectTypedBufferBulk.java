package classes.modern_test;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.DoubleBuffer;
import java.nio.FloatBuffer;
import java.nio.IntBuffer;
import java.nio.LongBuffer;
import java.nio.ShortBuffer;
import java.util.Arrays;

public class Java17DirectTypedBufferBulk {
  public static void main(String[] args) {
    ShortBuffer shorts = ByteBuffer.allocateDirect(16).asShortBuffer();
    shorts.position(1);
    System.out.println(shorts.put(new short[] { 0x1234, (short) 0xabcd, -2 }) == shorts);
    System.out.println(shorts.position());
    shorts.position(0);
    short[] shortOut = new short[5];
    System.out.println(shorts.get(shortOut, 0, shortOut.length) == shorts);
    System.out.println(Arrays.toString(shortOut));
    System.out.println(shorts.position());

    CharBuffer chars = ByteBuffer.allocateDirect(16).asCharBuffer();
    chars.position(1);
    System.out.println(chars.put(new char[] { 'A', '\u1234', '\uffff' }) == chars);
    System.out.println(chars.position());
    chars.position(0);
    char[] charOut = new char[5];
    System.out.println(chars.get(charOut, 0, charOut.length) == chars);
    System.out.println(charCodes(charOut));
    System.out.println(chars.position());

    IntBuffer ints = ByteBuffer.allocateDirect(32).asIntBuffer();
    ints.position(2);
    System.out.println(ints.put(new int[] { 0x01020304, -7, 0x7fffffff }) == ints);
    System.out.println(ints.position());
    ints.position(1);
    int[] intOut = new int[5];
    System.out.println(ints.get(intOut, 0, intOut.length) == ints);
    System.out.println(Arrays.toString(intOut));
    System.out.println(ints.position());

    FloatBuffer floats = ByteBuffer.allocateDirect(32).asFloatBuffer();
    floats.position(1);
    System.out.println(floats.put(new float[] { 1.25f, -0.0f, Float.NaN }) == floats);
    System.out.println(floats.position());
    floats.position(0);
    float[] floatOut = new float[5];
    System.out.println(floats.get(floatOut, 0, floatOut.length) == floats);
    System.out.println(Arrays.toString(floatOut));
    System.out.println(floats.position());

    LongBuffer longs = ByteBuffer.allocateDirect(64).asLongBuffer();
    longs.position(1);
    System.out.println(longs.put(new long[] { 0x0102030405060708L, -9L, Long.MAX_VALUE }) == longs);
    System.out.println(longs.position());
    longs.position(0);
    long[] longOut = new long[5];
    System.out.println(longs.get(longOut, 0, longOut.length) == longs);
    System.out.println(Arrays.toString(longOut));
    System.out.println(longs.position());

    DoubleBuffer doubles = ByteBuffer.allocateDirect(64).asDoubleBuffer();
    doubles.position(1);
    System.out.println(doubles.put(new double[] { -1.5d, Double.POSITIVE_INFINITY, -0.0d }) == doubles);
    System.out.println(doubles.position());
    doubles.position(0);
    double[] doubleOut = new double[5];
    System.out.println(doubles.get(doubleOut, 0, doubleOut.length) == doubles);
    System.out.println(Arrays.toString(doubleOut));
    System.out.println(doubles.position());

    printFailure("short-underflow", () -> ByteBuffer.allocateDirect(2).asShortBuffer().get(new short[2]));
    printFailure("char-underflow", () -> ByteBuffer.allocateDirect(2).asCharBuffer().get(new char[2]));
    printFailure("int-overflow", () -> ByteBuffer.allocateDirect(4).asIntBuffer().put(new int[] { 1, 2 }));
    printFailure("float-overflow", () -> ByteBuffer.allocateDirect(4).asFloatBuffer().put(new float[] { 1.0f, 2.0f }));
    printFailure("long-bounds", () -> ByteBuffer.allocateDirect(16).asLongBuffer().get(new long[2], 1, 2));
    printFailure("double-bounds", () -> ByteBuffer.allocateDirect(16).asDoubleBuffer().get(new double[2], 1, 2));
  }

  private static String charCodes(char[] values) {
    int[] codes = new int[values.length];
    for (int i = 0; i < values.length; i++) {
      codes[i] = values[i];
    }
    return Arrays.toString(codes);
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run();
  }
}
