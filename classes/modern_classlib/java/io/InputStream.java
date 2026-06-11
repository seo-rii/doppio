package java.io;

public abstract class InputStream implements Closeable {
  private static final int DEFAULT_BUFFER_SIZE = 8192;
  private static final int MAX_SKIP_BUFFER_SIZE = 2048;

  public abstract int read() throws IOException;

  public int read(byte[] b) throws IOException {
    return read(b, 0, b.length);
  }

  public int read(byte[] b, int off, int len) throws IOException {
    validateBufferBounds(b, off, len);
    if (len == 0) {
      return 0;
    }
    int first = read();
    if (first == -1) {
      return -1;
    }
    b[off] = (byte) first;
    int count = 1;
    try {
      while (count < len) {
        int next = read();
        if (next == -1) {
          break;
        }
        b[off + count] = (byte) next;
        count++;
      }
    } catch (IOException e) {
      return count;
    }
    return count;
  }

  public byte[] readAllBytes() throws IOException {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    transferTo(output);
    return output.toByteArray();
  }

  public byte[] readNBytes(int len) throws IOException {
    if (len < 0) {
      throw new IllegalArgumentException("len < 0");
    }
    ByteArrayOutputStream output = new ByteArrayOutputStream(Math.min(len, DEFAULT_BUFFER_SIZE));
    byte[] buffer = new byte[Math.min(len, DEFAULT_BUFFER_SIZE)];
    int remaining = len;
    while (remaining > 0) {
      int count = read(buffer, 0, Math.min(buffer.length, remaining));
      if (count < 0) {
        break;
      }
      output.write(buffer, 0, count);
      remaining -= count;
    }
    return output.toByteArray();
  }

  public int readNBytes(byte[] b, int off, int len) throws IOException {
    validateBufferBounds(b, off, len);
    int count = 0;
    while (count < len) {
      int n = read(b, off + count, len - count);
      if (n < 0) {
        break;
      }
      count += n;
    }
    return count;
  }

  public long transferTo(OutputStream out) throws IOException {
    if (out == null) {
      throw new NullPointerException();
    }
    long transferred = 0;
    byte[] buffer = new byte[DEFAULT_BUFFER_SIZE];
    int count;
    while ((count = read(buffer, 0, DEFAULT_BUFFER_SIZE)) >= 0) {
      out.write(buffer, 0, count);
      transferred += count;
    }
    return transferred;
  }

  public long skip(long n) throws IOException {
    if (n <= 0) {
      return 0;
    }
    long remaining = n;
    byte[] buffer = new byte[(int) Math.min(MAX_SKIP_BUFFER_SIZE, remaining)];
    while (remaining > 0) {
      int count = read(buffer, 0, (int) Math.min(buffer.length, remaining));
      if (count < 0) {
        break;
      }
      remaining -= count;
    }
    return n - remaining;
  }

  public void skipNBytes(long n) throws IOException {
    while (n > 0) {
      long skipped = skip(n);
      if (skipped > 0 && skipped <= n) {
        n -= skipped;
      } else if (skipped == 0) {
        if (read() == -1) {
          throw new EOFException();
        }
        n--;
      } else {
        throw new IOException("Unable to skip exactly");
      }
    }
  }

  public int available() throws IOException {
    return 0;
  }

  public void close() throws IOException {}

  public synchronized void mark(int readlimit) {}

  public synchronized void reset() throws IOException {
    throw new IOException("mark/reset not supported");
  }

  public boolean markSupported() {
    return false;
  }

  public static InputStream nullInputStream() {
    return new InputStream() {
      private boolean closed;

      public int read() throws IOException {
        ensureOpen();
        return -1;
      }

      public int read(byte[] b, int off, int len) throws IOException {
        validateBufferBounds(b, off, len);
        ensureOpen();
        return len == 0 ? 0 : -1;
      }

      public byte[] readAllBytes() throws IOException {
        ensureOpen();
        return new byte[0];
      }

      public byte[] readNBytes(int len) throws IOException {
        if (len < 0) {
          throw new IllegalArgumentException("len < 0");
        }
        ensureOpen();
        return new byte[0];
      }

      public int readNBytes(byte[] b, int off, int len) throws IOException {
        validateBufferBounds(b, off, len);
        ensureOpen();
        return 0;
      }

      public long skip(long n) throws IOException {
        ensureOpen();
        return 0;
      }

      public void skipNBytes(long n) throws IOException {
        ensureOpen();
        if (n > 0) {
          throw new EOFException();
        }
      }

      public int available() throws IOException {
        ensureOpen();
        return 0;
      }

      public long transferTo(OutputStream out) throws IOException {
        if (out == null) {
          throw new NullPointerException();
        }
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

  private static void validateBufferBounds(byte[] b, int off, int len) {
    if (b == null) {
      throw new NullPointerException();
    }
    if (off < 0 || len < 0 || len > b.length - off) {
      throw new IndexOutOfBoundsException();
    }
  }
}
