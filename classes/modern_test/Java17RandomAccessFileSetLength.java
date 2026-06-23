package classes.modern_test;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class Java17RandomAccessFileSetLength {
  private static String hex(byte[] bytes) {
    StringBuilder out = new StringBuilder();
    for (byte b : bytes) {
      out.append(String.format("%02x", b & 0xff));
    }
    return out.toString();
  }

  public static void main(String[] args) throws Exception {
    Path root = Path.of("build", "modern-random-access");
    Files.createDirectories(root);
    Path path = root.resolve("raf.bin");
    Files.deleteIfExists(path);

    try {
      File file = path.toFile();
      try (RandomAccessFile raf = new RandomAccessFile(file, "rw")) {
        raf.write("abcdef".getBytes(StandardCharsets.UTF_8));
        System.out.println(raf.length() + ":" + raf.getFilePointer());

        raf.getFD().sync();
        System.out.println("synced");

        raf.setLength(3);
        System.out.println(raf.length() + ":" + raf.getFilePointer());

        raf.seek(2);
        raf.write('Z');
        System.out.println(raf.length() + ":" + raf.getFilePointer());

        raf.seek(10);
        raf.setLength(8);
        System.out.println(raf.length() + ":" + raf.getFilePointer());

        raf.seek(0);
        byte[] bytes = new byte[(int) raf.length()];
        System.out.println(raf.read(bytes));
        System.out.println(hex(bytes));

        try {
          raf.setLength(-1);
          System.out.println("negative:ok");
        } catch (IOException e) {
          System.out.println("negative:" + e.getClass().getName());
        }
      }

      try (RandomAccessFile readOnly = new RandomAccessFile(file, "r")) {
        try {
          readOnly.setLength(1);
          System.out.println("readonly:ok");
        } catch (IOException e) {
          System.out.println("readonly:" + e.getClass().getName());
        }
      }
    } finally {
      Files.deleteIfExists(path);
    }
  }
}
