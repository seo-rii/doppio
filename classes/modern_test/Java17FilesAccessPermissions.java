package classes.modern_test;

import java.nio.file.AccessMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.EnumSet;
import java.util.Set;

public class Java17FilesAccessPermissions {
  public static void main(String[] args) throws Exception {
    Path directory = Files.createTempDirectory("doppio-access-modes");
    Path file = Files.writeString(directory.resolve("value.txt"), "value");
    Path missing = directory.resolve("missing.txt");
    Set<PosixFilePermission> original = Files.getPosixFilePermissions(file);

    try {
      printAccess("read", file, EnumSet.of(PosixFilePermission.OWNER_READ));
      printAccess("write", file, EnumSet.of(PosixFilePermission.OWNER_WRITE));
      printAccess("execute", file, EnumSet.of(PosixFilePermission.OWNER_EXECUTE));
      printAccess("none", file, EnumSet.noneOf(PosixFilePermission.class));
      System.out.println("missing-files:" + Files.isReadable(missing) + ":"
          + Files.isWritable(missing) + ":" + Files.isExecutable(missing));
      printProviderAccess("missing-provider", missing);
    } finally {
      Files.setPosixFilePermissions(file, original);
      Files.deleteIfExists(file);
      Files.deleteIfExists(directory);
    }
  }

  private static void printAccess(
      String label, Path file, Set<PosixFilePermission> permissions) throws Exception {
    Files.setPosixFilePermissions(file, permissions);
    System.out.println(label + "-files:" + Files.isReadable(file) + ":"
        + Files.isWritable(file) + ":" + Files.isExecutable(file));
    printProviderAccess(label + "-provider", file);
  }

  private static void printProviderAccess(String label, Path path) {
    System.out.println(label + ":" + hasProviderAccess(path, AccessMode.READ) + ":"
        + hasProviderAccess(path, AccessMode.WRITE) + ":"
        + hasProviderAccess(path, AccessMode.EXECUTE));
  }

  private static boolean hasProviderAccess(Path path, AccessMode mode) {
    try {
      path.getFileSystem().provider().checkAccess(path, mode);
      return true;
    } catch (Exception e) {
      return false;
    }
  }
}
