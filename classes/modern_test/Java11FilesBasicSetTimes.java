package classes.modern_test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.PosixFileAttributeView;

public class Java11FilesBasicSetTimes {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-basic-set-times");
    Path basicPath = root.resolve("basic.txt");
    Path posixPath = root.resolve("posix.txt");
    try {
      Files.writeString(basicPath, "basic");
      BasicFileAttributeView basicView =
          Files.getFileAttributeView(basicPath, BasicFileAttributeView.class);
      BasicFileAttributes basicBefore = basicView.readAttributes();
      FileTime basicAccessTime = FileTime.fromMillis(1234567890000L);
      basicView.setTimes(null, basicAccessTime, null);
      BasicFileAttributes basicAfter = basicView.readAttributes();
      System.out.println(
          "basic:"
              + (basicAfter.lastAccessTime().toMillis() == basicAccessTime.toMillis())
              + ":"
              + (basicAfter.lastModifiedTime().toMillis()
                  == basicBefore.lastModifiedTime().toMillis()));

      Files.writeString(posixPath, "posix");
      PosixFileAttributeView posixView =
          Files.getFileAttributeView(posixPath, PosixFileAttributeView.class);
      BasicFileAttributes posixBefore = posixView.readAttributes();
      FileTime posixAccessTime = FileTime.fromMillis(987654321000L);
      posixView.setTimes(null, posixAccessTime, null);
      BasicFileAttributes posixAfter = posixView.readAttributes();
      System.out.println(
          "posix:"
              + (posixAfter.lastAccessTime().toMillis() == posixAccessTime.toMillis())
              + ":"
              + (posixAfter.lastModifiedTime().toMillis()
                  == posixBefore.lastModifiedTime().toMillis()));
    } finally {
      Files.deleteIfExists(posixPath);
      Files.deleteIfExists(basicPath);
      Files.deleteIfExists(root);
    }
  }
}
