package classes.modern_test;

import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.EnumSet;
import java.util.Set;

public class Java11FilesInitialPosixPermissions {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-initial-perms");
    Path createdFile = root.resolve("created.txt");
    Path createdDirectory = root.resolve("created-dir");
    Path channelFile = root.resolve("channel.txt");
    Path unsupported = root.resolve("unsupported.txt");
    Path tempFile = null;
    Path tempDirectory = null;
    try {
      FileAttribute<Set<PosixFilePermission>> readOnly =
          PosixFilePermissions.asFileAttribute(EnumSet.of(PosixFilePermission.OWNER_READ));
      FileAttribute<Set<PosixFilePermission>> readWrite =
          PosixFilePermissions.asFileAttribute(
              EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
      FileAttribute<Set<PosixFilePermission>> readExecute =
          PosixFilePermissions.asFileAttribute(
              EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_EXECUTE));

      Files.createFile(createdFile, readOnly);
      printOwnerPermissions(createdFile);

      Files.createDirectory(createdDirectory, readExecute);
      printOwnerPermissions(createdDirectory);

      tempFile = Files.createTempFile(root, "file", ".tmp", readOnly);
      printOwnerPermissions(tempFile);

      tempDirectory = Files.createTempDirectory(root, "dir", readExecute);
      printOwnerPermissions(tempDirectory);

      SeekableByteChannel channel =
          Files.newByteChannel(
              channelFile,
              EnumSet.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE),
              readWrite);
      try {
        channel.write(ByteBuffer.wrap(new byte[] { 1, 2, 3 }));
      } finally {
        channel.close();
      }
      printOwnerPermissions(channelFile);

      printFailure("unsupported-attr", () -> Files.createFile(unsupported, unsupportedAttribute()));
    } finally {
      Files.deleteIfExists(unsupported);
      Files.deleteIfExists(channelFile);
      if (tempDirectory != null) {
        Files.deleteIfExists(tempDirectory);
      }
      if (tempFile != null) {
        Files.deleteIfExists(tempFile);
      }
      Files.deleteIfExists(createdDirectory);
      Files.deleteIfExists(createdFile);
      Files.deleteIfExists(root);
    }
  }

  private static FileAttribute<String> unsupportedAttribute() {
    return new FileAttribute<String>() {
      public String name() {
        return "basic:lastModifiedTime";
      }

      public String value() {
        return "ignored";
      }
    };
  }

  private static void printOwnerPermissions(Path path) throws Exception {
    Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(path);
    System.out.println(permissions.contains(PosixFilePermission.OWNER_READ));
    System.out.println(permissions.contains(PosixFilePermission.OWNER_WRITE));
    System.out.println(permissions.contains(PosixFilePermission.OWNER_EXECUTE));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run() throws Exception;
  }
}
