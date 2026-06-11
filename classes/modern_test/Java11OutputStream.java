package classes.modern_test;

import java.io.IOException;
import java.io.OutputStream;

public class Java11OutputStream {
  public static void main(String[] args) throws Exception {
    OutputStream output = OutputStream.nullOutputStream();
    output.write(1);
    output.write(new byte[] { 1, 2 });
    output.write(new byte[] { 1, 2, 3 }, 1, 2);
    output.flush();
    System.out.println("open");

    try {
      output.write(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      output.write(new byte[1], -1, 1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    output.close();
    try {
      output.write(1);
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      output.flush();
      System.out.println("flushed");
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
