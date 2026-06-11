package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class Java11InputStream {
  public static void main(String[] args) throws Exception {
    byte[] first = new java.io.ByteArrayInputStream("ab".getBytes("UTF-8")).readNBytes(2);
    System.out.println(new String(first, "UTF-8"));
    try {
      new java.io.ByteArrayInputStream(new byte[0]).readNBytes(-1);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }

    InputStream input = InputStream.nullInputStream();
    System.out.println(input.read());
    System.out.println(input.read(new byte[3]));
    System.out.println(input.readAllBytes().length);

    ByteArrayOutputStream output = new ByteArrayOutputStream();
    System.out.println(input.transferTo(output));
    System.out.println(output.size());

    input.close();
    try {
      input.read();
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
