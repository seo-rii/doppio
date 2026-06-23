package classes.modern_test;

import java.nio.Buffer;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelScatterGather {
  public static void main(String[] args) throws Exception {
    Path root = Path.of("build", "modern-filechannel-scatter-gather");
    Files.createDirectories(root);
    Path readPath = root.resolve("scatter.txt");
    Path writePath = root.resolve("gather.txt");
    Files.writeString(readPath, "abcdef", StandardCharsets.UTF_8);

    try {
      try (FileChannel channel = FileChannel.open(readPath, StandardOpenOption.READ)) {
        ByteBuffer first = ByteBuffer.allocate(2);
        ByteBuffer second = ByteBuffer.allocateDirect(3);
        ByteBuffer third = ByteBuffer.allocate(4);

        System.out.println("read:" + channel.read(new ByteBuffer[] {first, second, third}));
        System.out.println("read-pos:" + channel.position());
        System.out.println("first-pos:" + first.position());
        System.out.println("second-pos:" + second.position());
        System.out.println("third-pos:" + third.position());

        ((Buffer) first).flip();
        while (first.hasRemaining()) {
          System.out.print((char) first.get());
        }
        System.out.println();

        ((Buffer) second).flip();
        while (second.hasRemaining()) {
          System.out.print((char) second.get());
        }
        System.out.println();

        ((Buffer) third).flip();
        while (third.hasRemaining()) {
          System.out.print((char) third.get());
        }
        System.out.println();

        System.out.println("eof:" + channel.read(new ByteBuffer[] {
            ByteBuffer.allocate(1), ByteBuffer.allocateDirect(1)}));
        System.out.println("empty-read:" + channel.read(new ByteBuffer[] {
            ByteBuffer.allocate(0), ByteBuffer.allocate(0)}));
      }

      try (FileChannel channel = FileChannel.open(
          writePath,
          StandardOpenOption.CREATE,
          StandardOpenOption.WRITE,
          StandardOpenOption.TRUNCATE_EXISTING)) {
        ByteBuffer first = ByteBuffer.wrap("012".getBytes(StandardCharsets.UTF_8));
        first.position(1);

        ByteBuffer second = ByteBuffer.allocateDirect(4);
        second.put("ABCD".getBytes(StandardCharsets.UTF_8));
        ((Buffer) second).flip();
        second.position(1);
        second.limit(3);

        ByteBuffer third = ByteBuffer.wrap("xyz".getBytes(StandardCharsets.UTF_8));
        third.limit(2);

        System.out.println("write:" + channel.write(new ByteBuffer[] {first, second, third}));
        System.out.println("write-pos:" + channel.position());
        System.out.println("write-first-pos:" + first.position());
        System.out.println("write-second-pos:" + second.position());
        System.out.println("write-third-pos:" + third.position());
      }

      System.out.println("written-bytes:" + Files.readString(writePath, StandardCharsets.UTF_8));
    } finally {
      Files.deleteIfExists(writePath);
      Files.deleteIfExists(readPath);
    }
  }
}
