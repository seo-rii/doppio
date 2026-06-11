package classes.modern_test;

import java.nio.Buffer;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.DoubleBuffer;
import java.nio.FloatBuffer;
import java.nio.IntBuffer;
import java.nio.LongBuffer;
import java.nio.ShortBuffer;
import java.util.Arrays;

public class Java13TypedBuffers {
  public static void main(String[] args) {
    CharBuffer charGet = CharBuffer.wrap(new char[] { 'a', 'b', 'c', 'd', 'e' });
    ((Buffer) charGet).position(1);
    ((Buffer) charGet).limit(4);
    char[] chars = new char[] { '_', '_', '_', '_', '_' };
    System.out.println(charGet.get(1, chars, 1, 3) == charGet);
    System.out.println(Arrays.toString(chars));
    System.out.println(charGet.position());

    char[] allChars = new char[] { 'x', 'x' };
    charGet.get(2, allChars);
    System.out.println(Arrays.toString(allChars));
    System.out.println(charGet.position());

    char[] charBacking = new char[] { '0', '1', '2', '3', '4' };
    CharBuffer charPut = CharBuffer.wrap(charBacking);
    ((Buffer) charPut).position(2);
    ((Buffer) charPut).limit(4);
    System.out.println(charPut.put(1, new char[] { 'A', 'B', 'C', 'D' }, 1, 3) == charPut);
    System.out.println(Arrays.toString(charBacking));
    System.out.println(charPut.position());
    charPut.put(0, new char[] { 'x', 'y' });
    System.out.println(Arrays.toString(charBacking));
    System.out.println(charPut.position());

    IntBuffer intGet = IntBuffer.wrap(new int[] { 10, 11, 12, 13, 14 });
    ((Buffer) intGet).position(1);
    ((Buffer) intGet).limit(4);
    int[] ints = new int[] { 0, 0, 0, 0, 0 };
    System.out.println(intGet.get(1, ints, 1, 3) == intGet);
    System.out.println(Arrays.toString(ints));
    System.out.println(intGet.position());

    ShortBuffer shortBuffer = ShortBuffer.wrap(new short[] { 3, 4, 5, 6 });
    short[] shorts = new short[] { 0, 0 };
    shortBuffer.get(1, shorts);
    System.out.println(Arrays.toString(shorts));
    shortBuffer.put(2, new short[] { 8, 9 });
    System.out.println(Arrays.toString(shortBuffer.array()));

    FloatBuffer floatBuffer = FloatBuffer.wrap(new float[] { 1.5f, 2.5f, 3.5f });
    float[] floats = new float[] { 0.0f, 0.0f };
    floatBuffer.get(1, floats);
    System.out.println(Arrays.toString(floats));
    floatBuffer.put(0, new float[] { -1.0f, -2.0f });
    System.out.println(Arrays.toString(floatBuffer.array()));

    LongBuffer longBuffer = LongBuffer.wrap(new long[] { 10000000000L, -2L, 3L });
    long[] longs = new long[] { 0L, 0L };
    System.out.println(longBuffer.get(0, longs, 0, 2) == longBuffer);
    System.out.println(Arrays.toString(longs));
    longBuffer.put(1, new long[] { 7L, 8000000000L }, 0, 2);
    System.out.println(Arrays.toString(longBuffer.array()));

    DoubleBuffer doubleBuffer = ByteBuffer.allocateDirect(32).asDoubleBuffer();
    doubleBuffer.put(0, 1.25);
    doubleBuffer.put(1, 2.5);
    doubleBuffer.put(2, -3.75);
    ((Buffer) doubleBuffer).position(1);
    ((Buffer) doubleBuffer).limit(3);
    double[] doubles = new double[] { 0.0, 0.0, 0.0 };
    System.out.println(doubleBuffer.get(0, doubles, 0, 3) == doubleBuffer);
    System.out.println(Arrays.toString(doubles));
    System.out.println(doubleBuffer.position());
    doubleBuffer.put(1, new double[] { 9.5, 10.5 }, 0, 2);
    System.out.println(doubleBuffer.get(1) + ":" + doubleBuffer.get(2) + ":" + doubleBuffer.position());

    printFailure("char-get-null", () -> charGet.get(0, null, 0, 1));
    printFailure("char-get-array-range", () -> charGet.get(0, new char[2], 1, 2));
    printFailure("char-get-buffer-range", () -> charGet.get(3, new char[2], 0, 2));
    printFailure("char-put-null", () -> charPut.put(0, null, 0, 1));
    printFailure("char-put-read-only", () -> CharBuffer.wrap(new char[] { 'a', 'b' }).asReadOnlyBuffer().put(0, new char[] { 'z' }, 0, 1));
    printFailure("int-get-buffer-range", () -> intGet.get(3, new int[2], 0, 2));
    printFailure("double-put-read-only", () -> doubleBuffer.asReadOnlyBuffer().put(0, new double[] { 1.0 }, 0, 1));
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
