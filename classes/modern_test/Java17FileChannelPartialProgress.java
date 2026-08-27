package classes.modern_test;

import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelPartialProgress {
  public static void main(String[] args) throws Exception {
    String failureMode = System.getenv("DOPPIO_WRITEV_FAILURE_MODE");
    Path root = Path.of("build", "modern-filechannel-writev-partial");
    Path path = root.resolve("writev-partial-progress.txt");
    Files.createDirectories(root);
    Files.deleteIfExists(path);

    try {
      if (failureMode == null) {
        runSuccessfulGather(path);
      } else {
        runInjectedFailure(path, failureMode);
      }
    } finally {
      Files.deleteIfExists(path);
    }
  }

  private static void runSuccessfulGather(Path path) throws Exception {
    ByteBuffer first = ByteBuffer.wrap(new byte[] { 'A' });
    ByteBuffer second = ByteBuffer.wrap(new byte[] { 'B' });
    try (FileChannel channel = FileChannel.open(
        path,
        StandardOpenOption.CREATE,
        StandardOpenOption.WRITE,
        StandardOpenOption.TRUNCATE_EXISTING)) {
      long written = channel.write(new ByteBuffer[] {
          first,
          second
      });
      System.out.println("success:" + written);
      System.out.println("success-position:" + channel.position());
      System.out.println("buffer-positions:" + first.position() + ":" + second.position());
    }
    System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
  }

  private static void runInjectedFailure(Path path, String failureMode) throws Exception {
    System.out.println("mode:" + failureMode);
    FileChannel channel;
    if (failureMode.endsWith("sync")) {
      channel = FileChannel.open(
          path,
          StandardOpenOption.CREATE,
          StandardOpenOption.WRITE,
          StandardOpenOption.TRUNCATE_EXISTING,
          StandardOpenOption.SYNC);
    } else if (failureMode.equals("fallback-stat")) {
      channel = FileChannel.open(
          path,
          StandardOpenOption.CREATE,
          StandardOpenOption.WRITE,
          StandardOpenOption.APPEND);
    } else {
      channel = FileChannel.open(
          path,
          StandardOpenOption.CREATE,
          StandardOpenOption.WRITE,
          StandardOpenOption.TRUNCATE_EXISTING);
    }
    ByteBuffer first = ByteBuffer.wrap(new byte[] { 'A' });
    ByteBuffer second = ByteBuffer.wrap(new byte[] { 'B' });
    try {
      if (failureMode.equals("fallback-write")) {
        long written = channel.write(new ByteBuffer[] {
            first,
            second
        });
        System.out.println("partial-result:" + written);
      } else if (failureMode.equals("fallback-stat")) {
        long written = channel.write(new ByteBuffer[] {
            first,
            second
        });
        System.out.println("committed-result:" + written);
      } else {
        try {
          channel.write(new ByteBuffer[] {
              first,
              second
          });
          System.out.println("failure:false");
          throw new AssertionError("The injected gather write did not fail.");
        } catch (Exception expected) {
          System.out.println("failure:true");
        }
      }

      System.out.println("buffer-positions:" + first.position() + ":" + second.position());
      System.out.println("partial-position:" + channel.position());
      System.out.println("next-write:" + channel.write(ByteBuffer.wrap(new byte[] { 'Z' })));
      System.out.println("next-position:" + channel.position());
    } finally {
      channel.close();
    }
    System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
  }
}
