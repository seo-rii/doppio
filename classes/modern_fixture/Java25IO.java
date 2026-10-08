package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOError;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;

/** Each mode runs in a fresh JVM so IO's lazily initialized reader is isolated. */
public class Java25IO {
  private static void require(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  public static void main(String[] args) throws Exception {
    String mode = args.length == 0 ? "output" : args[0];
    if ("output".equals(mode)) {
      PrintStream original = System.out;
      final int[] flushes = { 0 };
      ByteArrayOutputStream captured = new ByteArrayOutputStream() {
        @Override public void flush() { flushes[0]++; }
      };
      PrintStream replacement = new PrintStream(captured, false, "UTF-8");
      System.setOut(replacement);
      try {
        IO.print("print=");
        IO.print(null);
        IO.println();
        IO.println(new Object() {
          @Override public String toString() { return "object-to-string"; }
        });
        require(flushes[0] == 2, "print flushes a non-autoflushing stream; println delegates");
        require(captured.toString("UTF-8").equals("print=null" + System.lineSeparator()
            + "object-to-string" + System.lineSeparator()), "output delegation");
        System.setOut(new PrintStream(new OutputStream() {
          @Override public void write(int value) throws IOException {
            throw new IOException("output-failure");
          }
        }));
        IO.print("failure");
        IO.println("failure");
        IO.println();
        require(System.out.checkError(), "PrintStream errors remain on the stream");
      } finally {
        System.setOut(original);
      }
      IO.println("output-delegation");
    } else if ("input".equals(mode)) {
      System.setProperty("stdin.encoding", "UTF-8");
      String first = IO.readln("prompt>");
      System.setProperty("stdin.encoding", "US-ASCII");
      String second = IO.readln();
      String third = IO.readln();
      require("first".equals(first) && "βeta".equals(second) && "tail".equals(third),
          "cached UTF-8 decoder and CRLF, CR, LF line terminators");
      IO.println("input-lines=" + first + "|" + second + "|" + third);
      String eof = IO.readln(null);
      require(eof == null, "EOF");
      require(IO.readln() == null && IO.readln() == null, "persistent EOF");
      IO.println("input-eof=" + eof);
    } else if ("fallback".equals(mode) || "illegal-charset".equals(mode)
        || "missing-charset".equals(mode)) {
      if ("missing-charset".equals(mode)) System.clearProperty("stdin.encoding");
      else System.setProperty("stdin.encoding", "fallback".equals(mode)
          ? "doppio-no-such-charset" : "illegal charset name");
      System.setIn(new ByteArrayInputStream(new byte[] { 'a', (byte) 0xc3, '(', '\n' }));
      String line = IO.readln();
      require("a\ufffd(".equals(line), "UTF-8 fallback and malformed-byte replacement");
      IO.println("fallback=" + line);
      require(IO.readln() == null, "fallback EOF");
    } else if ("ioerror".equals(mode)) {
      final IOException failure = new IOException("input-failure");
      System.setIn(new InputStream() {
        @Override public int read() throws IOException { throw failure; }
      });
      try {
        IO.readln("error>");
        throw new AssertionError("missing IOError");
      } catch (IOError error) {
        require(error.getCause() == failure, "IOException cause identity");
        IO.println("input-error=" + error.getCause().getMessage());
      }
    } else {
      throw new AssertionError("unknown mode: " + mode);
    }
  }
}
