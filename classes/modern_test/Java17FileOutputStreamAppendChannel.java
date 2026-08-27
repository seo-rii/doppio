package classes.modern_test;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileOutputStreamAppendChannel {
  public static void main(String[] args) throws Exception {
    String failureMode = System.getenv("DOPPIO_FOS_APPEND_MODE");
    Path root = Path.of("build", "modern-file-output-stream-append");
    Path path = root.resolve("append-channel.txt");
    Files.createDirectories(root);
    Files.deleteIfExists(path);
    Files.write(path, new byte[] { 'A' });

    try {
      if ("fstat-open".equals(failureMode)) {
        runInjectedOpenFailure(path, failureMode);
      } else if ("fstat-write".equals(failureMode)) {
        runInjectedWriteReconciliationFailure(path, failureMode);
      } else {
        runAppendMix(path, failureMode);
      }
    } finally {
      Files.deleteIfExists(path);
    }
  }

  private static void runInjectedOpenFailure(Path path, String failureMode) throws Exception {
    System.out.println("mode:" + failureMode);
    boolean failed = false;
    try (FileOutputStream ignored = new FileOutputStream(path.toFile(), true)) {
      System.out.println("open-failure:false");
    } catch (IOException expected) {
      failed = true;
      System.out.println("open-failure:true");
    }
    if (!failed) {
      throw new AssertionError("The injected append open did not fail.");
    }
    System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
  }

  private static void runInjectedWriteReconciliationFailure(
      Path path, String failureMode) throws Exception {
    System.out.println("mode:" + failureMode);
    try (FileOutputStream stream = new FileOutputStream(path.toFile(), true)) {
      stream.write('B');
      System.out.println("write-failure:false");
      stream.write('C');
    }
    System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
  }

  private static void runAppendMix(Path path, String failureMode) throws Exception {
    if (failureMode != null) {
      System.out.println("mode:" + failureMode);
    }
    try (FileOutputStream stream = new FileOutputStream(path.toFile(), true)) {
      FileChannel channel = stream.getChannel();
      System.out.println("open-position:" + channel.position());

      channel.position(0L);
      System.out.println("reset-position:" + channel.position());
      stream.write('B');
      System.out.println("stream-position:" + channel.position());

      channel.position(0L);
      ByteBuffer first = ByteBuffer.wrap(new byte[] { 'C' });
      ByteBuffer second = ByteBuffer.wrap(new byte[] { 'D' });
      System.out.println("gather-result:" + channel.write(new ByteBuffer[] { first, second }));
      System.out.println("buffer-positions:" + first.position() + ":" + second.position());
      System.out.println("gather-position:" + channel.position());

      Files.write(path, new byte[] { 'E' }, StandardOpenOption.APPEND);
      System.out.println("external-position:" + channel.position());

      channel.position(0L);
      stream.write('F');
      System.out.println("external-stream-position:" + channel.position());

      channel.position(0L);
      ByteBuffer scalar = ByteBuffer.wrap(new byte[] { 'G' });
      System.out.println("scalar-result:" + channel.write(scalar));
      System.out.println("scalar-buffer-position:" + scalar.position());
      System.out.println("final-position:" + channel.position());
    }
    System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
  }
}
