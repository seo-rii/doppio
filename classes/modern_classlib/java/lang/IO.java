package java.lang;

import java.io.BufferedReader;
import java.io.IOError;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.charset.Charset;
import java.nio.charset.IllegalCharsetNameException;
import java.nio.charset.UnsupportedCharsetException;

/** Java 25 line-oriented access to the standard input and output streams. */
public final class IO {
  private static BufferedReader reader;

  private IO() {}

  public static void print(Object obj) {
    PrintStream out = System.out;
    out.print(obj);
    out.flush();
  }

  public static void println(Object obj) {
    System.out.println(obj);
  }

  public static void println() {
    System.out.println();
  }

  public static String readln() {
    BufferedReader input;
    synchronized (IO.class) {
      if (reader == null) {
        Charset charset = Charset.forName("UTF-8");
        String encoding = System.getProperty("stdin.encoding");
        if (encoding != null) {
          try {
            charset = Charset.forName(encoding);
          } catch (IllegalCharsetNameException ignored) {
          } catch (UnsupportedCharsetException ignored) {
          }
        }
        reader = new BufferedReader(new InputStreamReader(System.in, charset));
      }
      input = reader;
    }
    try {
      return input.readLine();
    } catch (IOException cause) {
      throw new IOError(cause);
    }
  }

  public static String readln(String prompt) {
    print(prompt);
    return readln();
  }
}
