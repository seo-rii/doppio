package classes.modern_test;

import java.nio.ByteBuffer;
import java.nio.channels.ClosedChannelException;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelForce {
  public static void main(String[] args) throws Exception {
    Path root = Path.of("build", "modern-filechannel-force");
    Files.createDirectories(root);
    Path path = root.resolve("force.txt");
    Files.deleteIfExists(path);

    FileChannel channel = FileChannel.open(
        path, StandardOpenOption.CREATE, StandardOpenOption.READ, StandardOpenOption.WRITE);
    try {
      System.out.println(channel.write(ByteBuffer.wrap("abc".getBytes(StandardCharsets.UTF_8))));
      channel.force(false);
      System.out.println("force-data:" + Files.size(path));

      channel.position(1);
      System.out.println(channel.write(ByteBuffer.wrap("Z".getBytes(StandardCharsets.UTF_8))));
      channel.force(true);
      System.out.println("force-meta:" + Files.readString(path));
    } finally {
      channel.close();
    }

    try {
      channel.force(false);
      System.out.println("closed:ok");
    } catch (ClosedChannelException e) {
      System.out.println("closed:" + e.getClass().getName());
    }

    try (FileChannel readOnly = FileChannel.open(path, StandardOpenOption.READ)) {
      readOnly.force(false);
      System.out.println("readonly-force:" + readOnly.size());
    } finally {
      Files.deleteIfExists(path);
    }
  }
}
