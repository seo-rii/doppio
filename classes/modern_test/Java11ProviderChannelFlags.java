package classes.modern_test;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.OpenOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.spi.FileSystemProvider;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;

public class Java11ProviderChannelFlags {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-provider-channel-flags");
    FileSystemProvider provider = root.getFileSystem().provider();
    try {
      Path writeExisting = Files.writeString(root.resolve("write-existing.txt"), "ABC");
      long writeExistingSize;
      try (SeekableByteChannel channel = provider.newByteChannel(
          writeExisting, EnumSet.of(StandardOpenOption.WRITE))) {
        writeExistingSize = channel.size();
        channel.write(ByteBuffer.wrap(new byte[] { 'Z' }));
      }
      System.out.println("provider-write-existing:" + writeExistingSize + ":"
          + Files.readString(writeExisting));

      Path writeMissing = root.resolve("write-missing.txt");
      try (SeekableByteChannel ignored = provider.newByteChannel(
          writeMissing, EnumSet.of(StandardOpenOption.WRITE))) {
        System.out.println("provider-write-missing:opened");
      } catch (NoSuchFileException e) {
        System.out.println("provider-write-missing:" + e.getClass().getSimpleName());
      }
      System.out.println("provider-write-missing-exists:" + Files.exists(writeMissing));

      Path createExisting = Files.writeString(root.resolve("create-existing.txt"), "ABC");
      long createExistingSize;
      try (SeekableByteChannel channel = provider.newByteChannel(
          createExisting,
          EnumSet.of(StandardOpenOption.CREATE, StandardOpenOption.WRITE))) {
        createExistingSize = channel.size();
        channel.write(ByteBuffer.wrap(new byte[] { 'Y' }));
      }
      System.out.println("provider-create-existing:" + createExistingSize + ":"
          + Files.readString(createExisting));

      Path createMissing = root.resolve("create-missing.txt");
      try (SeekableByteChannel channel = provider.newByteChannel(
          createMissing,
          EnumSet.of(StandardOpenOption.CREATE, StandardOpenOption.WRITE))) {
        channel.write(ByteBuffer.wrap(new byte[] { 'C' }));
      }
      System.out.println("provider-create-missing:" + Files.readString(createMissing));

      Path createNewExisting = Files.writeString(root.resolve("create-new-existing.txt"), "ABC");
      try (SeekableByteChannel ignored = provider.newByteChannel(
          createNewExisting,
          EnumSet.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE))) {
        System.out.println("provider-create-new-existing:opened");
      } catch (FileAlreadyExistsException e) {
        System.out.println("provider-create-new-existing:" + e.getClass().getSimpleName());
      }

      Path createNewMissing = root.resolve("create-new-missing.txt");
      try (SeekableByteChannel channel = provider.newByteChannel(
          createNewMissing,
          EnumSet.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE))) {
        channel.write(ByteBuffer.wrap(new byte[] { 'N' }));
      }
      System.out.println("provider-create-new-missing:" + Files.readString(createNewMissing));

      Path truncateExisting = Files.writeString(root.resolve("truncate-existing.txt"), "ABC");
      long truncateExistingSize;
      try (SeekableByteChannel channel = provider.newByteChannel(
          truncateExisting,
          EnumSet.of(StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING))) {
        truncateExistingSize = channel.size();
        channel.write(ByteBuffer.wrap(new byte[] { 'T' }));
      }
      System.out.println("provider-truncate-existing:" + truncateExistingSize + ":"
          + Files.readString(truncateExisting));

      Path truncateMissing = root.resolve("truncate-missing.txt");
      try (SeekableByteChannel ignored = provider.newByteChannel(
          truncateMissing,
          EnumSet.of(StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING))) {
        System.out.println("provider-truncate-missing:opened");
      } catch (NoSuchFileException e) {
        System.out.println("provider-truncate-missing:" + e.getClass().getSimpleName());
      }
      System.out.println("provider-truncate-missing-exists:" + Files.exists(truncateMissing));

      Path readWriteTruncate = Files.writeString(root.resolve("read-write-truncate.txt"), "ABC");
      long readWriteTruncateSize;
      try (SeekableByteChannel channel = provider.newByteChannel(
          readWriteTruncate,
          EnumSet.of(
              StandardOpenOption.READ,
              StandardOpenOption.WRITE,
              StandardOpenOption.TRUNCATE_EXISTING))) {
        readWriteTruncateSize = channel.size();
        channel.write(ByteBuffer.wrap(new byte[] { 'R' }));
      }
      System.out.println("provider-read-write-truncate:" + readWriteTruncateSize + ":"
          + Files.readString(readWriteTruncate));

      Path readWriteCreate = Files.writeString(root.resolve("read-write-create.txt"), "ABC");
      long readWriteCreateSize;
      try (SeekableByteChannel channel = provider.newByteChannel(
          readWriteCreate,
          EnumSet.of(
              StandardOpenOption.READ,
              StandardOpenOption.WRITE,
              StandardOpenOption.CREATE))) {
        readWriteCreateSize = channel.size();
        channel.write(ByteBuffer.wrap(new byte[] { 'W' }));
      }
      System.out.println("provider-read-write-create:" + readWriteCreateSize + ":"
          + Files.readString(readWriteCreate));

      Path appendMissing = root.resolve("append-missing.txt");
      try (SeekableByteChannel ignored = provider.newByteChannel(
          appendMissing, EnumSet.of(StandardOpenOption.APPEND))) {
        System.out.println("provider-append-missing:opened");
      } catch (NoSuchFileException e) {
        System.out.println("provider-append-missing:" + e.getClass().getSimpleName());
      }
      System.out.println("provider-append-missing-exists:" + Files.exists(appendMissing));

      Path appendExisting = Files.writeString(root.resolve("append-existing.txt"), "ABC");
      long appendInitialPosition;
      long appendResetPosition;
      long appendFinalPosition;
      try (SeekableByteChannel channel = provider.newByteChannel(
          appendExisting, EnumSet.of(StandardOpenOption.APPEND))) {
        appendInitialPosition = channel.position();
        channel.position(0L);
        appendResetPosition = channel.position();
        channel.write(ByteBuffer.wrap(new byte[] { 'D' }));
        appendFinalPosition = channel.position();
      }
      System.out.println("provider-append-existing:"
          + appendInitialPosition + ":" + appendResetPosition + ":" + appendFinalPosition + ":"
          + Files.readString(appendExisting));

      long appendPositionalPosition;
      try (FileChannel channel = (FileChannel) provider.newByteChannel(
          appendExisting, EnumSet.of(StandardOpenOption.APPEND))) {
        channel.write(ByteBuffer.wrap(new byte[] { 'E' }), 0L);
        appendPositionalPosition = channel.position();
      }
      System.out.println("provider-append-positional:" + appendPositionalPosition + ":"
          + Files.readString(appendExisting));

      Path appendTwoHandles = Files.writeString(root.resolve("append-two-handles.txt"), "ABC");
      long appendFirstPosition;
      long appendSecondPosition;
      try (SeekableByteChannel first = provider.newByteChannel(
              appendTwoHandles, EnumSet.of(StandardOpenOption.APPEND));
          SeekableByteChannel second = provider.newByteChannel(
              appendTwoHandles, EnumSet.of(StandardOpenOption.APPEND))) {
        first.write(ByteBuffer.wrap(new byte[] { 'D' }));
        second.write(ByteBuffer.wrap(new byte[] { 'E' }));
        appendFirstPosition = first.position();
        appendSecondPosition = second.position();
      }
      System.out.println("provider-append-two-handles:"
          + appendFirstPosition + ":" + appendSecondPosition + ":"
          + Files.readString(appendTwoHandles));

      Path appendExternalGrowth = Files.writeString(
          root.resolve("append-external-growth.txt"), "ABC");
      long appendExternalPosition;
      try (SeekableByteChannel channel = provider.newByteChannel(
          appendExternalGrowth, EnumSet.of(StandardOpenOption.APPEND))) {
        Files.writeString(appendExternalGrowth, "D", StandardOpenOption.APPEND);
        appendExternalPosition = channel.position();
        channel.write(ByteBuffer.wrap(new byte[] { 'E' }));
      }
      System.out.println("provider-append-external-growth:" + appendExternalPosition + ":"
          + Files.readString(appendExternalGrowth));

      Path appendGather = Files.writeString(root.resolve("append-gather.txt"), "ABC");
      long appendGatherCount;
      long appendGatherPosition;
      try (FileChannel channel = (FileChannel) provider.newByteChannel(
          appendGather, EnumSet.of(StandardOpenOption.APPEND))) {
        channel.position(0L);
        appendGatherCount = channel.write(new ByteBuffer[] {
            ByteBuffer.wrap(new byte[] { 'D' }),
            ByteBuffer.wrap(new byte[] { 'E' })
        });
        appendGatherPosition = channel.position();
      }
      System.out.println("provider-append-gather:"
          + appendGatherCount + ":" + appendGatherPosition + ":"
          + Files.readString(appendGather));

      Path transferSource = Files.writeString(root.resolve("transfer-source.txt"), "XY");
      Path appendTransfer = Files.writeString(root.resolve("append-transfer.txt"), "ABC");
      long appendTransferCount;
      try (FileChannel source = FileChannel.open(transferSource, StandardOpenOption.READ);
          FileChannel target = (FileChannel) provider.newByteChannel(
              appendTransfer, EnumSet.of(StandardOpenOption.APPEND))) {
        target.position(0L);
        appendTransferCount = source.transferTo(0L, source.size(), target);
      }
      System.out.println("provider-append-transfer:" + appendTransferCount + ":"
          + Files.readString(appendTransfer));

      Path createAppend = root.resolve("create-append.txt");
      try (SeekableByteChannel channel = provider.newByteChannel(
          createAppend,
          EnumSet.of(StandardOpenOption.CREATE, StandardOpenOption.APPEND))) {
        channel.write(ByteBuffer.wrap(new byte[] { 'A' }));
      }
      System.out.println("provider-create-append:" + Files.readString(createAppend));

      Path syncExisting = Files.writeString(root.resolve("sync-existing.txt"), "ABC");
      long syncSize;
      try (SeekableByteChannel channel = provider.newByteChannel(
          syncExisting,
          EnumSet.of(StandardOpenOption.WRITE, StandardOpenOption.SYNC))) {
        syncSize = channel.size();
        channel.write(ByteBuffer.wrap(new byte[] { 'S' }));
      }
      System.out.println("provider-sync-existing:" + syncSize + ":"
          + Files.readString(syncExisting));

      Path dsyncExisting = Files.writeString(root.resolve("dsync-existing.txt"), "ABC");
      long dsyncSize;
      try (SeekableByteChannel channel = provider.newByteChannel(
          dsyncExisting,
          EnumSet.of(StandardOpenOption.WRITE, StandardOpenOption.DSYNC))) {
        dsyncSize = channel.size();
        channel.write(ByteBuffer.wrap(new byte[] { 'D' }));
      }
      System.out.println("provider-dsync-existing:" + dsyncSize + ":"
          + Files.readString(dsyncExisting));

      Path noFollowTarget = Files.writeString(root.resolve("nofollow-target.txt"), "ABC");
      Path noFollowLink = Files.createSymbolicLink(
          root.resolve("nofollow-link.txt"), noFollowTarget.getFileName());
      Set<OpenOption> noFollowOptions = new HashSet<OpenOption>();
      noFollowOptions.add(StandardOpenOption.WRITE);
      noFollowOptions.add(LinkOption.NOFOLLOW_LINKS);
      try (SeekableByteChannel ignored = provider.newByteChannel(noFollowLink, noFollowOptions)) {
        System.out.println("provider-nofollow:opened");
      } catch (IOException e) {
        System.out.println("provider-nofollow:" + e.getClass().getSimpleName());
      }
      System.out.println("provider-nofollow-target:" + Files.readString(noFollowTarget));

      Path deleteOnClose = Files.writeString(root.resolve("delete-on-close.txt"), "ABC");
      int deleteOnCloseByte;
      boolean deleteOnCloseDuring;
      try (SeekableByteChannel channel = provider.newByteChannel(
          deleteOnClose,
          EnumSet.of(StandardOpenOption.READ, StandardOpenOption.DELETE_ON_CLOSE))) {
        deleteOnCloseDuring = Files.exists(deleteOnClose);
        ByteBuffer firstByte = ByteBuffer.allocate(1);
        channel.read(firstByte);
        deleteOnCloseByte = firstByte.array()[0];
      }
      System.out.println("provider-delete-on-close:"
          + deleteOnCloseDuring + ":" + deleteOnCloseByte + ":" + Files.exists(deleteOnClose));

      Path deleteOnCloseWrite = Files.writeString(
          root.resolve("delete-on-close-write.txt"), "ABC");
      boolean deleteOnCloseWriteDuring;
      try (SeekableByteChannel channel = provider.newByteChannel(
          deleteOnCloseWrite,
          EnumSet.of(StandardOpenOption.WRITE, StandardOpenOption.DELETE_ON_CLOSE))) {
        deleteOnCloseWriteDuring = Files.exists(deleteOnCloseWrite);
        channel.write(ByteBuffer.wrap(new byte[] { 'Z' }));
      }
      System.out.println("provider-delete-on-close-write:"
          + deleteOnCloseWriteDuring + ":" + Files.exists(deleteOnCloseWrite));

      Path facadeCreateExisting = Files.writeString(
          root.resolve("facade-create-existing.txt"), "ABC");
      try (SeekableByteChannel channel = Files.newByteChannel(
          facadeCreateExisting,
          EnumSet.of(StandardOpenOption.CREATE, StandardOpenOption.WRITE))) {
        channel.write(ByteBuffer.wrap(new byte[] { 'F' }));
      }
      System.out.println("facade-create-existing:" + Files.readString(facadeCreateExisting));

      Path outputExisting = Files.writeString(root.resolve("output-existing.txt"), "ABC");
      try (OutputStream output = Files.newOutputStream(
          outputExisting, StandardOpenOption.WRITE)) {
        output.write('O');
      }
      System.out.println("facade-output-existing:" + Files.readString(outputExisting));

      Path outputMissing = root.resolve("output-missing.txt");
      try (OutputStream ignored = Files.newOutputStream(
          outputMissing, StandardOpenOption.WRITE)) {
        System.out.println("facade-output-missing:opened");
      } catch (NoSuchFileException e) {
        System.out.println("facade-output-missing:" + e.getClass().getSimpleName());
      }
      System.out.println("facade-output-missing-exists:" + Files.exists(outputMissing));

      Path outputDefault = Files.writeString(root.resolve("output-default.txt"), "ABC");
      try (OutputStream output = Files.newOutputStream(outputDefault)) {
        output.write('Q');
      }
      System.out.println("facade-output-default:" + Files.readString(outputDefault));

      Path outputAppendMissing = root.resolve("output-append-missing.txt");
      try (OutputStream ignored = Files.newOutputStream(
          outputAppendMissing, StandardOpenOption.APPEND)) {
        System.out.println("facade-output-append-missing:opened");
      } catch (NoSuchFileException e) {
        System.out.println("facade-output-append-missing:" + e.getClass().getSimpleName());
      }
      System.out.println("facade-output-append-missing-exists:"
          + Files.exists(outputAppendMissing));
    } finally {
      try (Stream<Path> paths = Files.walk(root)) {
        paths.sorted(Comparator.reverseOrder()).forEach(path -> {
          try {
            Files.deleteIfExists(path);
          } catch (IOException e) {
            throw new UncheckedIOException(e);
          }
        });
      }
    }
  }
}
