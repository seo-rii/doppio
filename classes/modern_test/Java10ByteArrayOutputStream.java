package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

public class Java10ByteArrayOutputStream {
  public static void main(String[] args) throws Exception {
    ByteArrayOutputStream utf16 = new ByteArrayOutputStream();
    utf16.write(new byte[] { 65, 0, -87, 3 }, 0, 4);
    System.out.println(utf16.toString(StandardCharsets.UTF_16LE));

    ByteArrayOutputStream utf8 = new ByteArrayOutputStream();
    utf8.write(new byte[] { -61, -87 }, 0, 2);
    System.out.println(utf8.toString(StandardCharsets.UTF_8));

    ByteArrayOutputStream latin1 = new ByteArrayOutputStream();
    latin1.write(0xe9);
    System.out.println(latin1.toString(StandardCharsets.ISO_8859_1));

    System.out.println("empty:" + new ByteArrayOutputStream().toString(StandardCharsets.UTF_8));
    printFailure("null-charset", () -> utf8.toString((Charset) null));
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
    void run() throws Exception;
  }
}
