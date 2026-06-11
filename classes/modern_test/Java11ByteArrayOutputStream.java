package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.util.Arrays;

public class Java11ByteArrayOutputStream {
  public static void main(String[] args) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    out.write(1);
    out.writeBytes(new byte[] { 2, 3 });
    System.out.println(Arrays.toString(out.toByteArray()));
    System.out.println(out.size());

    byte[] source = new byte[] { 4, 5 };
    out.writeBytes(source);
    source[0] = 99;
    System.out.println(Arrays.toString(out.toByteArray()));

    out.writeBytes(new byte[0]);
    System.out.println(out.size());

    printFailure("null-bytes", () -> out.writeBytes(null));
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
