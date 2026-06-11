package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class Java10PrintStreamCharset {
  public static void main(String[] args) throws Exception {
    ByteArrayOutputStream utf16 = new ByteArrayOutputStream();
    PrintStream utf16Stream = new PrintStream(utf16, true, StandardCharsets.UTF_16LE);
    utf16Stream.print("A\u03a9");
    utf16Stream.flush();
    System.out.println(Arrays.toString(utf16.toByteArray()));
    System.out.println(utf16Stream.checkError());

    ByteArrayOutputStream latin = new ByteArrayOutputStream();
    PrintStream latinStream = new PrintStream(latin, false, StandardCharsets.ISO_8859_1);
    latinStream.print("\u00e9");
    latinStream.flush();
    System.out.println(Arrays.toString(latin.toByteArray()));
    System.out.println(latinStream.checkError());

    printFailure("null-charset", () ->
        new PrintStream(new ByteArrayOutputStream(), true, (Charset) null).close());
    printFailure("null-output", () ->
        new PrintStream((OutputStream) null, true, StandardCharsets.UTF_8).close());
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
