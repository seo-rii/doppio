package classes.modern_test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileTime;

public class Java11FilesCopyAttributes {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-copy-attrs");
    Path source = root.resolve("source.txt");
    Path target = root.resolve("target.txt");
    Path replaced = root.resolve("replaced.txt");
    Path sourceDir = root.resolve("source-dir");
    Path targetDir = root.resolve("target-dir");
    try {
      FileTime fileTime = FileTime.fromMillis(1234567890000L);
      Files.write(source, "alpha".getBytes(StandardCharsets.UTF_8));
      Files.setLastModifiedTime(source, fileTime);

      Files.copy(source, target, StandardCopyOption.COPY_ATTRIBUTES);
      System.out.println(new String(Files.readAllBytes(target), StandardCharsets.UTF_8));
      System.out.println(Files.getLastModifiedTime(target).toMillis() == fileTime.toMillis());

      Files.write(replaced, "old".getBytes(StandardCharsets.UTF_8));
      Files.copy(source, replaced, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES);
      System.out.println(new String(Files.readAllBytes(replaced), StandardCharsets.UTF_8));
      System.out.println(Files.getLastModifiedTime(replaced).toMillis() == fileTime.toMillis());

      FileTime directoryTime = FileTime.fromMillis(1234567800000L);
      Files.createDirectory(sourceDir);
      Files.setLastModifiedTime(sourceDir, directoryTime);
      Files.copy(sourceDir, targetDir, StandardCopyOption.COPY_ATTRIBUTES);
      System.out.println(Files.isDirectory(targetDir));
      System.out.println(Files.getLastModifiedTime(targetDir).toMillis() == directoryTime.toMillis());
    } finally {
      Files.deleteIfExists(targetDir);
      Files.deleteIfExists(sourceDir);
      Files.deleteIfExists(replaced);
      Files.deleteIfExists(target);
      Files.deleteIfExists(source);
      Files.deleteIfExists(root);
    }
  }
}
