package classes.modern_test;

import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.AccessDeniedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17FileChannelIOExceptionBoundaries {
  public static void main(String[] args) throws Exception {
    String failureMode = System.getenv("DOPPIO_FILECHANNEL_IOEXCEPTION_MODE");
    Path root = Path.of("build", "modern-filechannel-ioexception");
    Path path = root.resolve("channel-errors.txt");
    Path transferSource = root.resolve("transfer-source.txt");
    Path transferTarget = root.resolve("transfer-target.txt");
    Files.createDirectories(root);
    Files.deleteIfExists(path);
    Files.deleteIfExists(transferSource);
    Files.deleteIfExists(transferTarget);

    try {
      if (failureMode != null && failureMode.startsWith("legacy-close-")) {
        Files.write(path, "ABC".getBytes(StandardCharsets.UTF_8));
      } else {
        try (FileOutputStream output = new FileOutputStream(path.toFile())) {
          output.write("ABC".getBytes(StandardCharsets.UTF_8));
        }
      }

      if (failureMode == null) {
        System.out.println("mode:baseline");
        ByteBuffer buffer = ByteBuffer.allocate(3);
        try (FileChannel channel = FileChannel.open(path, StandardOpenOption.READ)) {
          int read = channel.read(buffer);
          System.out.println("read:" + read + ":"
              + new String(buffer.array(), 0, read, StandardCharsets.UTF_8));
        }
      } else if (failureMode.startsWith("operations")) {
        System.out.println("mode:" + failureMode);
        Files.write(transferSource, new byte[] { 'S' });

        try (FileChannel channel = FileChannel.open(
            path,
            StandardOpenOption.READ,
            StandardOpenOption.WRITE)) {
          Throwable sizeFailure = null;
          try {
            channel.size();
          } catch (Throwable expected) {
            sizeFailure = expected;
          }
          if (sizeFailure == null) {
            throw new AssertionError("The injected size failure was not observed.");
          }
          System.out.println("size:" + sizeFailure.getClass().getName() + ":"
              + (sizeFailure.getClass() == IOException.class) + ":"
              + sizeFailure.getClass().getName().equals("sun.nio.fs.UnixException"));

          Throwable truncateFailure = null;
          try {
            channel.truncate(1L);
          } catch (Throwable expected) {
            truncateFailure = expected;
          }
          if (truncateFailure == null) {
            throw new AssertionError("The injected truncate failure was not observed.");
          }
          System.out.println("truncate:" + truncateFailure.getClass().getName() + ":"
              + (truncateFailure.getClass() == IOException.class) + ":"
              + truncateFailure.getClass().getName().equals("sun.nio.fs.UnixException"));

          ByteBuffer scalar = ByteBuffer.wrap(new byte[] { 'W' });
          Throwable writeFailure = null;
          try {
            channel.write(scalar);
          } catch (Throwable expected) {
            writeFailure = expected;
          }
          if (writeFailure == null) {
            throw new AssertionError("The injected scalar-write failure was not observed.");
          }
          System.out.println("write:" + writeFailure.getClass().getName() + ":"
              + (writeFailure.getClass() == IOException.class) + ":"
              + writeFailure.getClass().getName().equals("sun.nio.fs.UnixException") + ":"
              + scalar.position());

          ByteBuffer gatherFirst = ByteBuffer.wrap(new byte[] { 'X' });
          ByteBuffer gatherSecond = ByteBuffer.wrap(new byte[] { 'Y' });
          Throwable gatherFailure = null;
          try {
            channel.write(new ByteBuffer[] { gatherFirst, gatherSecond });
          } catch (Throwable expected) {
            gatherFailure = expected;
          }
          if (gatherFailure == null) {
            throw new AssertionError("The injected gather-write failure was not observed.");
          }
          System.out.println("gather:" + gatherFailure.getClass().getName() + ":"
              + (gatherFailure.getClass() == IOException.class) + ":"
              + gatherFailure.getClass().getName().equals("sun.nio.fs.UnixException") + ":"
              + gatherFirst.position() + ":" + gatherSecond.position());

          Throwable forceFailure = null;
          try {
            channel.force(true);
          } catch (Throwable expected) {
            forceFailure = expected;
          }
          if (forceFailure == null) {
            throw new AssertionError("The injected force failure was not observed.");
          }
          System.out.println("force:" + forceFailure.getClass().getName() + ":"
              + (forceFailure.getClass() == IOException.class) + ":"
              + forceFailure.getClass().getName().equals("sun.nio.fs.UnixException"));

          Throwable mapFailure = null;
          try {
            channel.map(FileChannel.MapMode.READ_ONLY, 0L, 1L);
          } catch (Throwable expected) {
            mapFailure = expected;
          }
          if (mapFailure == null) {
            throw new AssertionError("The injected map failure was not observed.");
          }
          System.out.println("map:" + mapFailure.getClass().getName() + ":"
              + (mapFailure.getClass() == IOException.class) + ":"
              + mapFailure.getClass().getName().equals("sun.nio.fs.UnixException"));

          Throwable mapMemoryFailure = null;
          try {
            channel.map(FileChannel.MapMode.READ_ONLY, 0L, 2L);
          } catch (Throwable expected) {
            mapMemoryFailure = expected;
          }
          if (mapMemoryFailure == null) {
            throw new AssertionError("The injected map allocation failure was not observed.");
          }
          System.out.println("map-memory:" + mapMemoryFailure.getClass().getName() + ":"
              + (mapMemoryFailure.getClass() == IOException.class) + ":"
              + (mapMemoryFailure.getCause() instanceof OutOfMemoryError));

          Throwable transferReadFailure = null;
          try (FileChannel target = FileChannel.open(
              transferTarget,
              StandardOpenOption.CREATE,
              StandardOpenOption.WRITE,
              StandardOpenOption.TRUNCATE_EXISTING)) {
            try {
              channel.transferTo(0L, 1L, target);
            } catch (Throwable expected) {
              transferReadFailure = expected;
            }
          }
          if (transferReadFailure == null) {
            throw new AssertionError("The injected transfer-source failure was not observed.");
          }
          System.out.println("transfer-read:" + transferReadFailure.getClass().getName() + ":"
              + (transferReadFailure.getClass() == IOException.class) + ":"
              + transferReadFailure.getClass().getName().equals("sun.nio.fs.UnixException"));

          Throwable transferWriteFailure = null;
          try (FileChannel source = FileChannel.open(transferSource, StandardOpenOption.READ)) {
            try {
              source.transferTo(0L, 1L, channel);
            } catch (Throwable expected) {
              transferWriteFailure = expected;
            }
          }
          if (transferWriteFailure == null) {
            throw new AssertionError("The injected transfer-target failure was not observed.");
          }
          System.out.println("transfer-write:" + transferWriteFailure.getClass().getName() + ":"
              + (transferWriteFailure.getClass() == IOException.class) + ":"
              + transferWriteFailure.getClass().getName().equals("sun.nio.fs.UnixException"));

        }

        try (FileChannel appendChannel = FileChannel.open(
            path,
            StandardOpenOption.WRITE,
            StandardOpenOption.APPEND)) {
          ByteBuffer committed = ByteBuffer.wrap(new byte[] { 'Q' });
          int committedBytes = appendChannel.write(committed);
          System.out.println("post-write:" + committedBytes + ":"
              + committed.position() + ":" + appendChannel.position());
        }

        Throwable providerFailure = null;
        try {
          Files.size(path);
        } catch (Throwable expected) {
          providerFailure = expected;
        }
        if (providerFailure == null) {
          throw new AssertionError("The injected provider stat failure was not observed.");
        }
        System.out.println("provider:" + providerFailure.getClass().getName() + ":"
            + (providerFailure.getClass() == AccessDeniedException.class) + ":"
            + Files.exists(path));
        System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
      } else if (failureMode.equals("read-close-fallback") ||
          failureMode.equals("read-close-native")) {
        System.out.println("mode:" + failureMode);
        ByteBuffer first = ByteBuffer.allocate(1);
        ByteBuffer second = ByteBuffer.allocate(1);
        Throwable readFailure = null;
        try (FileChannel readChannel = FileChannel.open(path, StandardOpenOption.READ)) {
          try {
            readChannel.read(new ByteBuffer[] { first, second });
          } catch (Throwable expected) {
            readFailure = expected;
          }
        }
        if (readFailure == null) {
          throw new AssertionError("The injected scatter-read failure was not observed.");
        }

        System.out.println("read:" + readFailure.getClass().getName() + ":"
            + (readFailure.getClass() == IOException.class) + ":"
            + readFailure.getClass().getName().equals("sun.nio.fs.UnixException"));
        System.out.println("buffer-positions:" + first.position() + ":" + second.position());

        FileChannel closeChannel = FileChannel.open(path, StandardOpenOption.READ);
        Throwable closeFailure = null;
        try {
          closeChannel.close();
        } catch (Throwable expected) {
          closeFailure = expected;
        }
        if (closeFailure == null) {
          throw new AssertionError("The injected close failure was not observed.");
        }
        System.out.println("close:" + closeFailure.getClass().getName() + ":"
            + (closeFailure.getClass() == IOException.class) + ":"
            + closeFailure.getClass().getName().equals("sun.nio.fs.UnixException"));
        System.out.println("channel-open:" + closeChannel.isOpen());
        boolean secondCloseSucceeded = true;
        try {
          closeChannel.close();
        } catch (Throwable unexpected) {
          secondCloseSucceeded = false;
        }
        System.out.println("second-close:" + secondCloseSucceeded);
        System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
      } else if (failureMode.startsWith("legacy-close-")) {
        System.out.println("mode:" + failureMode);
        FileChannel legacyChannel;
        FileDescriptor legacyDescriptor;
        if (failureMode.equals("legacy-close-input")) {
          FileInputStream input = new FileInputStream(path.toFile());
          legacyChannel = input.getChannel();
          legacyDescriptor = input.getFD();
        } else if (failureMode.equals("legacy-close-output")) {
          FileOutputStream output = new FileOutputStream(path.toFile(), true);
          legacyChannel = output.getChannel();
          legacyDescriptor = output.getFD();
        } else if (failureMode.equals("legacy-close-random")) {
          RandomAccessFile random = new RandomAccessFile(path.toFile(), "rw");
          legacyChannel = random.getChannel();
          legacyDescriptor = random.getFD();
        } else {
          throw new IllegalArgumentException("Unsupported legacy close mode: " + failureMode);
        }

        Throwable closeFailure = null;
        try {
          legacyChannel.close();
        } catch (Throwable expected) {
          closeFailure = expected;
        }
        if (closeFailure == null) {
          throw new AssertionError("The injected legacy close failure was not observed.");
        }
        System.out.println("close:" + closeFailure.getClass().getName() + ":"
            + (closeFailure.getClass() == IOException.class) + ":"
            + closeFailure.getClass().getName().equals("sun.nio.fs.UnixException"));
        System.out.println("descriptor-valid:" + legacyDescriptor.valid());
        System.out.println("channel-open:" + legacyChannel.isOpen());
        boolean secondCloseSucceeded = true;
        try {
          legacyChannel.close();
        } catch (Throwable unexpected) {
          secondCloseSucceeded = false;
        }
        System.out.println("second-close:" + secondCloseSucceeded);
        System.out.println("content:" + Files.readString(path, StandardCharsets.UTF_8));
      } else {
        throw new IllegalArgumentException("Unsupported failure mode: " + failureMode);
      }
    } finally {
      Files.deleteIfExists(transferTarget);
      Files.deleteIfExists(transferSource);
      Files.deleteIfExists(path);
    }
  }
}
