package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.channels.Channels;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.util.Scanner;

public class Java10ScannerCharset {
  public static void main(String[] args) throws Exception {
    byte[] utf16 = "alpha beta".getBytes(StandardCharsets.UTF_16LE);
    Scanner inputStreamScanner = new Scanner(new ByteArrayInputStream(utf16), StandardCharsets.UTF_16LE);
    System.out.println(inputStreamScanner.next() + ":" + inputStreamScanner.next());
    inputStreamScanner.close();

    File file = testFile("file");
    Files.write(file.toPath(), "cafe \u00e9clair".getBytes(StandardCharsets.UTF_8));
    Scanner fileScanner = new Scanner(file, StandardCharsets.UTF_8);
    System.out.println(fileScanner.next() + ":" + fileScanner.next());
    fileScanner.close();
    delete(file);

    File pathFile = testFile("path");
    Files.write(pathFile.toPath(), "uno dos".getBytes(StandardCharsets.ISO_8859_1));
    Scanner pathScanner = new Scanner(pathFile.toPath(), StandardCharsets.ISO_8859_1);
    System.out.println(pathScanner.next() + ":" + pathScanner.next());
    pathScanner.close();
    delete(pathFile);

    byte[] channelBytes = "left right".getBytes(StandardCharsets.UTF_8);
    Scanner channelScanner = new Scanner(
        Channels.newChannel(new ByteArrayInputStream(channelBytes)), StandardCharsets.UTF_8);
    System.out.println(channelScanner.next() + ":" + channelScanner.next());
    channelScanner.close();

    printFailure("input-null-charset", () ->
        new Scanner(new ByteArrayInputStream(new byte[0]), (Charset) null).close());
    printFailure("file-null-charset", () ->
        new Scanner(testFile("file-null-charset"), (Charset) null).close());
    File pathNullCharset = testFile("path-null-charset");
    Files.write(pathNullCharset.toPath(), new byte[0]);
    printFailure("path-null-charset", () ->
        new Scanner(pathNullCharset.toPath(), (Charset) null).close());
    delete(pathNullCharset);
    printFailure("channel-null-charset", () ->
        new Scanner(Channels.newChannel(new ByteArrayInputStream(new byte[0])), (Charset) null).close());
    printFailure("input-null-source", () ->
        new Scanner((java.io.InputStream) null, StandardCharsets.UTF_8).close());
    printFailure("file-null-source", () ->
        new Scanner((File) null, StandardCharsets.UTF_8).close());
  }

  private static File testFile(String name) throws Exception {
    File file = new File("classes/modern_test/Java10ScannerCharset-" + name + ".tmp");
    delete(file);
    return file;
  }

  private static void delete(File file) throws Exception {
    try {
      Files.delete(file.toPath());
    } catch (NoSuchFileException e) {
      // Already absent.
    }
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run() throws Throwable;
  }
}
