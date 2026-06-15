package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;
import java.util.Arrays;

public class Java18DefaultCharset {
  public static void main(String[] args) throws Exception {
    byte[] utf8 = new byte[] {(byte) 0xc3, (byte) 0xa9, (byte) 0xe2, (byte) 0x82, (byte) 0xac};

    System.out.println(System.getProperty("file.encoding"));
    System.out.println(Charset.defaultCharset().name());

    String decoded = new String(utf8);
    System.out.println(decoded.length());
    System.out.println(Integer.toHexString(decoded.charAt(0)) + ":" + Integer.toHexString(decoded.charAt(1)));
    System.out.println(Arrays.toString("\u00e9\u20ac".getBytes()));

    InputStreamReader reader = new InputStreamReader(new ByteArrayInputStream(utf8));
    char[] chars = new char[4];
    int count = reader.read(chars);
    reader.close();
    System.out.println(count + ":" + Integer.toHexString(chars[0]) + ":" + Integer.toHexString(chars[1]));

    ByteArrayOutputStream output = new ByteArrayOutputStream();
    OutputStreamWriter writer = new OutputStreamWriter(output);
    writer.write("\u00e9\u20ac");
    writer.close();
    System.out.println(Arrays.toString(output.toByteArray()));
  }
}
