package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.Arrays;

public class Java17ObjectStreamFloatDouble {
  public static void main(String[] args) throws Exception {
    float[] floats = new float[] {
      1.5f,
      -0.0f,
      -2.25f,
      Float.intBitsToFloat(0x7f7fffff)
    };
    double[] doubles = new double[] {
      1.25d,
      -0.0d,
      -3.5d,
      Double.longBitsToDouble(0x7fefffffffffffffL)
    };

    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    ObjectOutputStream output = new ObjectOutputStream(bytes);
    output.writeObject(floats);
    output.writeObject(doubles);
    output.close();

    ObjectInputStream input = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()));
    float[] readFloats = (float[]) input.readObject();
    double[] readDoubles = (double[]) input.readObject();
    input.close();

    System.out.println(Arrays.toString(floatBits(readFloats)));
    System.out.println(Arrays.toString(doubleBits(readDoubles)));
    System.out.println(Arrays.equals(floatBits(floats), floatBits(readFloats)));
    System.out.println(Arrays.equals(doubleBits(doubles), doubleBits(readDoubles)));
  }

  private static int[] floatBits(float[] values) {
    int[] bits = new int[values.length];
    for (int i = 0; i < values.length; i++) {
      bits[i] = Float.floatToIntBits(values[i]);
    }
    return bits;
  }

  private static long[] doubleBits(double[] values) {
    long[] bits = new long[values.length];
    for (int i = 0; i < values.length; i++) {
      bits[i] = Double.doubleToLongBits(values[i]);
    }
    return bits;
  }
}
