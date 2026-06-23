package classes.modern_test;

import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelTransfer {
  private static String hex(Path path) throws Exception {
    byte[] bytes = Files.readAllBytes(path);
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < bytes.length; i++) {
      if (i > 0) {
        out.append(' ');
      }
      int value = bytes[i] & 0xff;
      if (value < 16) {
        out.append('0');
      }
      out.append(Integer.toHexString(value));
    }
    return out.toString();
  }

  public static void main(String[] args) throws Exception {
    Path dir = Files.createTempDirectory("doppio-transfer");
    Path source = dir.resolve("source.txt");
    Path toTarget = dir.resolve("to-target.txt");
    Path fromTarget = dir.resolve("from-target.txt");

    Files.write(source, "abcdefghi".getBytes(StandardCharsets.UTF_8));

    try (FileChannel src = FileChannel.open(source, StandardOpenOption.READ);
        FileChannel dst = FileChannel.open(
            toTarget,
            StandardOpenOption.CREATE,
            StandardOpenOption.WRITE,
            StandardOpenOption.TRUNCATE_EXISTING)) {
      src.position(5);
      dst.position(2);
      long copied = src.transferTo(2, 4, dst);
      System.out.println("to-file:" + copied);
      System.out.println("to-source-pos:" + src.position());
      System.out.println("to-target-pos:" + dst.position());
    }
    System.out.println("to-target-bytes:" + hex(toTarget));

    try (FileChannel src = FileChannel.open(source, StandardOpenOption.READ);
        FileChannel dst = FileChannel.open(
            fromTarget,
            StandardOpenOption.CREATE,
            StandardOpenOption.READ,
            StandardOpenOption.WRITE,
            StandardOpenOption.TRUNCATE_EXISTING)) {
      src.position(2);
      dst.position(1);
      long copied = dst.transferFrom(src, 0, 4);
      System.out.println("from-file:" + copied);
      System.out.println("from-source-pos:" + src.position());
      System.out.println("from-target-pos:" + dst.position());
    }
    System.out.println("from-target-bytes:" + hex(fromTarget));

    try (FileChannel src = FileChannel.open(source, StandardOpenOption.READ);
        FileChannel dst = FileChannel.open(toTarget, StandardOpenOption.WRITE)) {
      long copied = src.transferTo(100, 10, dst);
      System.out.println("to-eof:" + copied);
      System.out.println("to-eof-source-pos:" + src.position());
    }
  }
}
