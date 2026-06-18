package classes.modern_test;

import java.nio.Buffer;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelPositionalWrite {
  public static void main(String[] args) throws Exception {
    Path path = Files.createTempFile("doppio-pwrite", ".txt");
    try {
      Files.writeString(path, "abcdef");
      try (FileChannel channel = FileChannel.open(path, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
        System.out.println(channel.position());

        ByteBuffer heap = ByteBuffer.wrap("XYZ".getBytes(StandardCharsets.UTF_8));
        System.out.println(channel.write(heap, 2));
        System.out.println(heap.position());
        System.out.println(channel.position());

        ByteBuffer direct = ByteBuffer.allocateDirect(2);
        direct.put((byte) '1');
        direct.put((byte) '2');
        ((Buffer) direct).flip();
        System.out.println(channel.write(direct, 4));
        System.out.println(direct.position());
        System.out.println(channel.position());

        System.out.println(channel.write(ByteBuffer.allocate(0), 1));

        try {
          channel.write(ByteBuffer.wrap(new byte[] { 1 }), -1);
          System.out.println("negative:ok");
        } catch (IllegalArgumentException e) {
          System.out.println("negative:" + e.getClass().getName());
        }
      }
      System.out.println(Files.readString(path));
    } finally {
      Files.deleteIfExists(path);
    }
  }
}
