package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.util.Arrays;

public class Java14PrintStreamWriteBytes {
  public static void main(String[] args) throws Exception {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    PrintStream stream = new PrintStream(bytes, true, "UTF-8");
    stream.write(1);
    stream.writeBytes(new byte[] { 2, 3 });
    stream.write(new byte[] { 4, 5 });
    stream.flush();
    System.out.println(Arrays.toString(bytes.toByteArray()));
    System.out.println(stream.checkError());

    byte[] source = new byte[] { 6, 7 };
    stream.writeBytes(source);
    source[0] = 99;
    stream.write(source);
    source[1] = 88;
    stream.writeBytes(new byte[0]);
    stream.write(new byte[0]);
    stream.close();
    System.out.println(Arrays.toString(bytes.toByteArray()));

    PrintStream failing = new PrintStream(new ByteArrayOutputStream(), true, "UTF-8");
    printFailure("null-bytes", () -> failing.writeBytes(null));
    printFailure("null-write", () -> failing.write((byte[]) null));
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
    void run() throws Throwable;
  }
}
