package classes.modern_test;

import com.sun.nio.file.ExtendedCopyOption;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class Java17InterruptibleCopy {
  private static final int SOURCE_SIZE = 4 * 1024 * 1024;

  public static void main(String[] args) throws Exception {
    Path root = Path.of("build", "modern-interruptible-copy");
    Path source = root.resolve("source.bin");
    Path target = root.resolve("target.bin");
    Files.createDirectories(root);
    Files.deleteIfExists(target);

    byte[] block = new byte[64 * 1024];
    try (OutputStream out = Files.newOutputStream(source)) {
      for (int written = 0; written < SOURCE_SIZE; written += block.length) {
        out.write(block);
      }
    }

    Thread.currentThread().interrupt();
    boolean cancelled = false;
    try {
      Files.copy(source, target, ExtendedCopyOption.INTERRUPTIBLE);
    } catch (IOException expected) {
      cancelled = true;
    }
    boolean interruptRestored = Thread.currentThread().isInterrupted();
    Thread.interrupted();

    System.out.println("cancelled:" + cancelled);
    System.out.println("interrupt-restored:" + interruptRestored);
    System.out.println("target-exists:" + Files.exists(target));
    System.out.println("source-size:" + Files.size(source));

    Files.deleteIfExists(target);
    Files.deleteIfExists(source);
    Files.deleteIfExists(root);
  }
}
