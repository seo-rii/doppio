package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;

public class Java12InputStream {
  public static void main(String[] args) throws Exception {
    ByteArrayInputStream input = new ByteArrayInputStream("abcdef".getBytes("UTF-8"));
    input.skipNBytes(3);
    System.out.println((char) input.read());

    ByteArrayInputStream negative = new ByteArrayInputStream("xy".getBytes("UTF-8"));
    negative.skipNBytes(-4);
    System.out.println((char) negative.read());

    ZeroSkipInputStream zeroSkip = new ZeroSkipInputStream("wxyz".getBytes("UTF-8"));
    zeroSkip.skipNBytes(2);
    System.out.println((char) zeroSkip.read());
    System.out.println(zeroSkip.reads);

    try {
      new ByteArrayInputStream("q".getBytes("UTF-8")).skipNBytes(2);
      System.out.println(false);
    } catch (EOFException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      new NegativeSkipInputStream().skipNBytes(1);
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      new OverskipInputStream().skipNBytes(1);
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }

    InputStream nullInput = InputStream.nullInputStream();
    nullInput.skipNBytes(0);
    try {
      nullInput.skipNBytes(1);
      System.out.println(false);
    } catch (EOFException e) {
      System.out.println(e.getClass().getName());
    }
    nullInput.close();
    try {
      nullInput.skipNBytes(0);
      System.out.println(false);
    } catch (IOException e) {
      System.out.println(e.getClass().getName());
    }
  }

  private static class ZeroSkipInputStream extends InputStream {
    private final byte[] data;
    private int index;
    int reads;

    ZeroSkipInputStream(byte[] data) {
      this.data = data;
    }

    public int read() {
      reads++;
      return index < data.length ? data[index++] & 0xff : -1;
    }

    public long skip(long n) {
      return 0;
    }
  }

  private static class NegativeSkipInputStream extends InputStream {
    public int read() {
      return 'n';
    }

    public long skip(long n) {
      return -1;
    }
  }

  private static class OverskipInputStream extends InputStream {
    public int read() {
      return 'o';
    }

    public long skip(long n) {
      return n + 1;
    }
  }
}
