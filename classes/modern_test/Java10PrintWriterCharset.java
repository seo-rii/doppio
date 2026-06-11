package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class Java10PrintWriterCharset {
  public static void main(String[] args) {
    ByteArrayOutputStream utf16 = new ByteArrayOutputStream();
    PrintWriter utf16Writer = new PrintWriter(utf16, true, StandardCharsets.UTF_16LE);
    utf16Writer.print("B\u03a9");
    utf16Writer.flush();
    System.out.println(Arrays.toString(utf16.toByteArray()));
    System.out.println(utf16Writer.checkError());

    ByteArrayOutputStream latin = new ByteArrayOutputStream();
    PrintWriter latinWriter = new PrintWriter(latin, false, StandardCharsets.ISO_8859_1);
    latinWriter.print("\u00e9");
    latinWriter.flush();
    System.out.println(Arrays.toString(latin.toByteArray()));
    System.out.println(latinWriter.checkError());

    printFailure("null-charset", () ->
        new PrintWriter(new ByteArrayOutputStream(), true, (Charset) null).close());
    printFailure("null-output", () ->
        new PrintWriter((OutputStream) null, true, StandardCharsets.UTF_8).close());
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
