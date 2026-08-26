package classes.modern_test;

import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelPartialReadProgress {
  public static void main(String[] args) throws Exception {
    String failureMode = System.getenv("DOPPIO_READV_FAILURE_MODE");
    Path root = Path.of("build", "modern-filechannel-readv-partial");
    Path path = root.resolve("readv-partial-progress.txt");
    Files.createDirectories(root);
    Files.deleteIfExists(path);

    try {
      if (failureMode != null) {
        System.out.println("mode:" + failureMode);
      }
      try (FileChannel channel = FileChannel.open(
          path,
          StandardOpenOption.CREATE,
          StandardOpenOption.READ,
          StandardOpenOption.WRITE,
        StandardOpenOption.TRUNCATE_EXISTING)) {
        channel.write(ByteBuffer.wrap("ABC".getBytes(StandardCharsets.UTF_8)));
        channel.position("fallback-eof".equals(failureMode) ? 2L : 0L);
        ByteBuffer first = ByteBuffer.allocate(1);
        ByteBuffer second = ByteBuffer.allocate(1);
        long read = channel.read(new ByteBuffer[] { first, second });

        System.out.println("scatter-result:" + read);
        System.out.println("buffer-positions:" + first.position() + ":" + second.position());
        System.out.println("buffer-bytes:" + (char) first.get(0) + ":"
            + (second.position() == 0 ? "-" : Character.toString((char) second.get(0))));
        System.out.println("scatter-position:" + channel.position());

        ByteBuffer next = ByteBuffer.allocate(1);
        int nextRead = channel.read(next);
        System.out.println("next-read:" + nextRead);
        System.out.println("next-position:" + channel.position());
        System.out.println("next-byte:"
            + (nextRead < 0 ? "-" : Character.toString((char) next.get(0))));
      }
    } finally {
      Files.deleteIfExists(path);
    }
  }
}
