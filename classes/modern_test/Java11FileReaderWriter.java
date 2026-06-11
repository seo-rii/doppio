package classes.modern_test;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;

public class Java11FileReaderWriter {
  public static void main(String[] args) throws Exception {
    File file = new File("classes/modern_test/Java11FileReaderWriter.tmp");
    Files.deleteIfExists(file.toPath());

    FileWriter writer = new FileWriter(file, StandardCharsets.UTF_16LE);
    writer.write("A\u03a9");
    writer.close();
    System.out.println(Arrays.toString(Files.readAllBytes(file.toPath())));

    char[] buffer = new char[8];
    FileReader reader = new FileReader(file, StandardCharsets.UTF_16LE);
    int count = reader.read(buffer);
    reader.close();
    System.out.println(count + ":" + new String(buffer, 0, count));

    writer = new FileWriter(file, StandardCharsets.UTF_16LE, true);
    writer.write("!");
    writer.close();
    System.out.println(Arrays.toString(Files.readAllBytes(file.toPath())));

    writer = new FileWriter(file.getPath(), StandardCharsets.UTF_8, false);
    writer.write("\u00e9");
    writer.close();
    System.out.println(Arrays.toString(Files.readAllBytes(file.toPath())));

    reader = new FileReader(file.getPath(), StandardCharsets.UTF_8);
    count = reader.read(buffer);
    reader.close();
    System.out.println(count + ":" + new String(buffer, 0, count));

    printFailure("reader-null-charset", () -> new FileReader(file, null).close());
    printFailure("reader-null-file", () -> new FileReader((File) null, StandardCharsets.UTF_8).close());
    printFailure("reader-null-path", () -> new FileReader((String) null, StandardCharsets.UTF_8).close());
    printFailure("writer-null-charset", () -> new FileWriter(file, null).close());
    printFailure("writer-null-path", () -> new FileWriter((String) null, StandardCharsets.UTF_8).close());
    printFailure("writer-null-path-append", () -> new FileWriter((String) null, StandardCharsets.UTF_8, false).close());

    Files.deleteIfExists(file.toPath());
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
    void run() throws Exception;
  }
}
