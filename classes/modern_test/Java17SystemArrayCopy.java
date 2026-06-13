package classes.modern_test;

import java.util.Arrays;

public final class Java17SystemArrayCopy {
  public static void main(String[] args) {
    boolean[] booleans = new boolean[] { true, false, true };
    boolean[] booleanDest = new boolean[3];
    System.arraycopy(booleans, 0, booleanDest, 0, 3);
    System.out.println(Arrays.toString(booleanDest));

    byte[] bytes = new byte[] { 0, -1, 2, -128, 4 };
    byte[] byteDest = new byte[4];
    System.arraycopy(bytes, 0, byteDest, 0, 4);
    System.out.println(Arrays.toString(byteDest));

    byte[] byteBackward = new byte[] { 10, 11, 12, 13 };
    System.arraycopy(byteBackward, 0, byteBackward, 1, 3);
    System.out.println(Arrays.toString(byteBackward));

    byte[] byteForward = new byte[] { 20, 21, 22, 23 };
    System.arraycopy(byteForward, 1, byteForward, 0, 3);
    System.out.println(Arrays.toString(byteForward));

    char[] chars = new char[] { 'A', 'B', 'C' };
    char[] charDest = new char[3];
    System.arraycopy(chars, 0, charDest, 0, 3);
    System.out.println(Arrays.toString(charDest));

    char[] charBackward = new char[] { 'a', 'b', 'c', 'd' };
    System.arraycopy(charBackward, 0, charBackward, 1, 3);
    System.out.println(Arrays.toString(charBackward));

    short[] shorts = new short[] { 3, -4, 5 };
    short[] shortDest = new short[3];
    System.arraycopy(shorts, 0, shortDest, 0, 3);
    System.out.println(Arrays.toString(shortDest));

    int[] ints = new int[] { 7, -8, 9 };
    int[] intDest = new int[3];
    System.arraycopy(ints, 0, intDest, 0, 3);
    System.out.println(Arrays.toString(intDest));

    int[] intSource = new int[] { 1, 2, 3, 4, 5 };
    int[] intSubrangeDest = new int[] { 9, 9, 9, 9, 9, 9 };
    System.arraycopy(intSource, 1, intSubrangeDest, 2, 3);
    System.out.println(Arrays.toString(intSubrangeDest));

    long[] longs = new long[] { 11L, -12L, 13L };
    long[] longDest = new long[3];
    System.arraycopy(longs, 0, longDest, 0, 3);
    System.out.println(Arrays.toString(longDest));

    float[] floats = new float[] { 1.5f, -2.25f, 3.75f };
    float[] floatDest = new float[3];
    System.arraycopy(floats, 0, floatDest, 0, 3);
    System.out.println(Arrays.toString(floatDest));

    double[] doubles = new double[] { 1.5, -2.25, 3.75 };
    double[] doubleDest = new double[3];
    System.arraycopy(doubles, 0, doubleDest, 0, 3);
    System.out.println(Arrays.toString(doubleDest));

    double[] doubleBackward = new double[] { 1.0, 2.0, 3.0, 4.0, 5.0 };
    System.arraycopy(doubleBackward, 0, doubleBackward, 2, 3);
    System.out.println(Arrays.toString(doubleBackward));
  }
}
