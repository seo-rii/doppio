package classes.modern_test;

import java.nio.Buffer;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelPositionalRead {
  private static String bytes(ByteBuffer buffer) {
    StringBuilder out = new StringBuilder();
    while (buffer.hasRemaining()) {
      out.append((char) buffer.get());
    }
    return out.toString();
  }

  public static void main(String[] args) throws Exception {
    Path root = Path.of("build", "modern-filechannel-pread");
    Files.createDirectories(root);
    Path path = root.resolve("pread.txt");
    Files.writeString(path, "abcdef", StandardCharsets.UTF_8);

    try (FileChannel channel = FileChannel.open(
        path, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
      System.out.println(channel.position());

      ByteBuffer heap = ByteBuffer.allocate(3);
      System.out.println(channel.read(heap, 2));
      System.out.println(heap.position());
      System.out.println(channel.position());
      ((Buffer) heap).flip();
      System.out.println(bytes(heap));

      ByteBuffer direct = ByteBuffer.allocateDirect(2);
      System.out.println(channel.read(direct, 4));
      System.out.println(direct.position());
      System.out.println(channel.position());
      ((Buffer) direct).flip();
      System.out.println(bytes(direct));

      System.out.println(channel.read(ByteBuffer.allocate(4), 99));
      System.out.println(channel.read(ByteBuffer.allocate(0), 1));

      try {
        channel.read(ByteBuffer.allocate(1), -1);
        System.out.println("negative:ok");
      } catch (IllegalArgumentException e) {
        System.out.println("negative:" + e.getClass().getName());
      }
    } finally {
      Files.deleteIfExists(path);
    }
  }
}
