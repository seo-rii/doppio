package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

public class Java9InputStream {
  public static void main(String[] args) throws Exception {
    ByteArrayInputStream input = new ByteArrayInputStream("abcdef".getBytes("UTF-8"));
    byte[] buffer = new byte[5];
    int count = input.readNBytes(buffer, 1, 2);
    System.out.println(count);
    System.out.println(new String(buffer, 1, count, "UTF-8"));
    System.out.println(new String(input.readAllBytes(), "UTF-8"));

    ByteArrayOutputStream output = new ByteArrayOutputStream();
    long transferred = new ByteArrayInputStream("xy".getBytes("UTF-8")).transferTo(output);
    System.out.println(transferred);
    System.out.println(output.toString("UTF-8"));

    try {
      new ByteArrayInputStream(new byte[0]).readNBytes(null, 0, 1);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new ByteArrayInputStream(new byte[0]).readNBytes(new byte[1], -1, 1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new ByteArrayInputStream(new byte[] { 1 }).transferTo(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
