package java.io;

import java.nio.CharBuffer;

public abstract class Reader implements Readable, Closeable {
  private static final int TRANSFER_BUFFER_SIZE = 8192;
  private static final int MAX_SKIP_BUFFER_SIZE = 8192;

  protected Object lock;

  protected Reader() {
    lock = this;
  }

  protected Reader(Object lock) {
    if (lock == null) {
      throw new NullPointerException();
    }
    this.lock = lock;
  }

  public int read(CharBuffer target) throws IOException {
    int len = target.remaining();
    char[] cbuf = new char[len];
    int count = read(cbuf, 0, len);
    if (count > 0) {
      target.put(cbuf, 0, count);
    }
    return count;
  }

  public int read() throws IOException {
    char[] cbuf = new char[1];
    int count = read(cbuf, 0, 1);
    if (count == -1) {
      return -1;
    }
    return cbuf[0];
  }

  public int read(char[] cbuf) throws IOException {
    validateBufferBounds(cbuf, 0, cbuf.length);
    return read(cbuf, 0, cbuf.length);
  }

  public abstract int read(char[] cbuf, int off, int len) throws IOException;

  public long skip(long n) throws IOException {
    if (n < 0) {
      throw new IllegalArgumentException("skip value is negative");
    }
    synchronized (lock) {
      long remaining = n;
      int bufferSize = (int) Math.min(MAX_SKIP_BUFFER_SIZE, remaining);
      char[] buffer = new char[bufferSize];
      while (remaining > 0) {
        int count = read(buffer, 0, (int) Math.min(buffer.length, remaining));
        if (count < 0) {
          break;
        }
        remaining -= count;
      }
      return n - remaining;
    }
  }

  public boolean ready() throws IOException {
    return false;
  }

  public boolean markSupported() {
    return false;
  }

  public void mark(int readAheadLimit) throws IOException {
    throw new IOException("mark() not supported");
  }

  public void reset() throws IOException {
    throw new IOException("reset() not supported");
  }

  public long transferTo(Writer out) throws IOException {
    if (out == null) {
      throw new NullPointerException();
    }
    long transferred = 0;
    char[] buffer = new char[TRANSFER_BUFFER_SIZE];
    int count;
    while ((count = read(buffer, 0, buffer.length)) >= 0) {
      out.write(buffer, 0, count);
      transferred += count;
    }
    return transferred;
  }

  public abstract void close() throws IOException;

  public static Reader nullReader() {
    return new Reader() {
      private boolean closed;

      public int read() throws IOException {
        ensureOpen();
        return -1;
      }

      public int read(char[] cbuf, int off, int len) throws IOException {
        validateBufferBounds(cbuf, off, len);
        ensureOpen();
        return len == 0 ? 0 : -1;
      }

      public boolean ready() throws IOException {
        ensureOpen();
        return false;
      }

      public long skip(long n) throws IOException {
        ensureOpen();
        return 0;
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
