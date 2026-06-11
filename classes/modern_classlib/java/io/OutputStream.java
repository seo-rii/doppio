package java.io;

public abstract class OutputStream implements Closeable, Flushable {
  public abstract void write(int b) throws IOException;

  public void write(byte[] b) throws IOException {
    write(b, 0, b.length);
  }

  public void write(byte[] b, int off, int len) throws IOException {
    validateBufferBounds(b, off, len);
    for (int i = 0; i < len; i++) {
      write(b[off + i]);
    }
  }

  public void flush() throws IOException {}

  public void close() throws IOException {}

  public static OutputStream nullOutputStream() {
    return new OutputStream() {
      private boolean closed;

      public void write(int b) throws IOException {
        ensureOpen();
      }

      public void write(byte[] b, int off, int len) throws IOException {
        validateBufferBounds(b, off, len);
        ensureOpen();
      }

      public void close() throws IOException {
        closed = true;
      }

      private void ensureOpen() throws IOException {
        if (closed) {
          throw new IOException("Stream closed");
        }
      }
    };
  }

  private static void validateBufferBounds(byte[] b, int off, int len) {
    if (b == null) {
      throw new NullPointerException();
    }
    if (off < 0 || len < 0 || len > b.length - off) {
      throw new IndexOutOfBoundsException();
    }
  }
}
