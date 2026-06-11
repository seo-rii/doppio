package classes.modern_test;

import java.io.File;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;

public class Java10PrintFileCharset {
  public static void main(String[] args) throws Exception {
    File streamFile = testFile("print-stream-file");
    try (PrintStream stream = new PrintStream(streamFile, StandardCharsets.UTF_16LE)) {
      stream.print("C\u03a9");
    }
    System.out.println(Arrays.toString(Files.readAllBytes(streamFile.toPath())));
    delete(streamFile);

    File streamName = testFile("print-stream-name");
    try (PrintStream stream = new PrintStream(streamName.getPath(), StandardCharsets.ISO_8859_1)) {
      stream.print("\u00e9");
    }
    System.out.println(Arrays.toString(Files.readAllBytes(streamName.toPath())));
    delete(streamName);

    File writerFile = testFile("print-writer-file");
    try (PrintWriter writer = new PrintWriter(writerFile, StandardCharsets.UTF_16LE)) {
      writer.print("D\u03a9");
    }
    System.out.println(Arrays.toString(Files.readAllBytes(writerFile.toPath())));
    delete(writerFile);

    File writerName = testFile("print-writer-name");
    try (PrintWriter writer = new PrintWriter(writerName.getPath(), StandardCharsets.ISO_8859_1)) {
      writer.print("\u00e9");
    }
    System.out.println(Arrays.toString(Files.readAllBytes(writerName.toPath())));
    delete(writerName);

    printFailure("ps-file-null-charset", () ->
        new PrintStream(testFile("ps-file-null-charset"), (Charset) null).close());
    printFailure("ps-name-null-charset", () ->
        new PrintStream(testFile("ps-name-null-charset").getPath(), (Charset) null).close());
    printFailure("pw-file-null-charset", () ->
        new PrintWriter(testFile("pw-file-null-charset"), (Charset) null).close());
    printFailure("pw-name-null-charset", () ->
        new PrintWriter(testFile("pw-name-null-charset").getPath(), (Charset) null).close());
    printFailure("ps-file-null", () ->
        new PrintStream((File) null, StandardCharsets.UTF_8).close());
    printFailure("ps-name-null", () ->
        new PrintStream((String) null, StandardCharsets.UTF_8).close());
    printFailure("pw-file-null", () ->
        new PrintWriter((File) null, StandardCharsets.UTF_8).close());
    printFailure("pw-name-null", () ->
        new PrintWriter((String) null, StandardCharsets.UTF_8).close());
  }

  private static File testFile(String name) throws Exception {
    File file = new File("classes/modern_test/Java10PrintFileCharset-" + name + ".tmp");
    delete(file);
    return file;
  }

  private static void delete(File file) throws Exception {
    if (file.exists()) {
      Files.delete(file.toPath());
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
