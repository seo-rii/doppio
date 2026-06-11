package java.io;

public abstract class Writer implements Appendable, Closeable, Flushable {
  protected Object lock;

  protected Writer() {
    lock = this;
  }

  protected Writer(Object lock) {
    if (lock == null) {
      throw new NullPointerException();
    }
    this.lock = lock;
  }

  public void write(int c) throws IOException {
    char[] cbuf = { (char) c };
    write(cbuf, 0, 1);
  }

  public void write(char[] cbuf) throws IOException {
    validateBufferBounds(cbuf, 0, cbuf.length);
    write(cbuf, 0, cbuf.length);
  }

  public abstract void write(char[] cbuf, int off, int len) throws IOException;

  public void write(String str) throws IOException {
    write(str, 0, str.length());
  }

  public void write(String str, int off, int len) throws IOException {
    char[] cbuf = str.substring(off, off + len).toCharArray();
    write(cbuf, 0, cbuf.length);
  }

  public Writer append(CharSequence csq) throws IOException {
    write(String.valueOf(csq));
    return this;
  }

  public Writer append(CharSequence csq, int start, int end) throws IOException {
    write(String.valueOf(csq).subSequence(start, end).toString());
    return this;
  }

  public Writer append(char c) throws IOException {
    write(c);
    return this;
  }

  public abstract void flush() throws IOException;

  public abstract void close() throws IOException;

  public static Writer nullWriter() {
    return new Writer() {
      private boolean closed;

      public void write(int c) throws IOException {
        ensureOpen();
      }

      public void write(char[] cbuf, int off, int len) throws IOException {
        validateBufferBounds(cbuf, off, len);
        ensureOpen();
      }

      public void write(String str, int off, int len) throws IOException {
        if (str == null) {
          throw new NullPointerException();
        }
        if (off < 0 || len < 0 || len > str.length() - off) {
          throw new IndexOutOfBoundsException();
        }
        ensureOpen();
      }

      public void flush() throws IOException {
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

  private static void validateBufferBounds(char[] cbuf, int off, int len) {
    if (cbuf == null) {
      throw new NullPointerException();
    }
    if (off < 0 || len < 0 || len > cbuf.length - off) {
      throw new IndexOutOfBoundsException();
    }
  }

}
