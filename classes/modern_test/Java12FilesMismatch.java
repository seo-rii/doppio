package classes.modern_test;

import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;

public class Java12FilesMismatch {
  public static void main(String[] args) throws Exception {
    Path first = Files.createTempFile("doppio-mismatch-a", ".bin");
    Path second = Files.createTempFile("doppio-mismatch-b", ".bin");
    Path longer = Files.createTempFile("doppio-mismatch-c", ".bin");
    Path directory = Files.createTempDirectory("doppio-mismatch-dir");
    try {
      Files.write(first, new byte[] { 1, 2, 3, 4 });
      Files.write(second, new byte[] { 1, 2, 9, 4 });
      Files.write(longer, new byte[] { 1, 2, 3, 4, 5 });

      System.out.println(Files.mismatch(first, first));
      System.out.println(Files.mismatch(directory, directory));
      System.out.println(Files.mismatch(
          first.resolveSibling("same-missing-file"),
          first.resolveSibling("same-missing-file")));
      System.out.println(Files.mismatch(first, second));
      System.out.println(Files.mismatch(first, longer));
      System.out.println(Files.mismatch(longer, first));
      try {
        Files.mismatch(first, directory);
        System.out.println(false);
      } catch (java.io.IOException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.mismatch(directory, first);
        System.out.println(false);
      } catch (java.io.IOException e) {
        System.out.println(e.getClass().getName());
      }
      Path secondDirectory = Files.createTempDirectory("doppio-mismatch-dir2");
      try {
        Files.mismatch(directory, secondDirectory);
        System.out.println(false);
      } catch (java.io.IOException e) {
        System.out.println(e.getClass().getName());
      } finally {
        Files.deleteIfExists(secondDirectory);
      }

      Files.write(second, new byte[] { 1, 2, 3, 4 });
      System.out.println(Files.mismatch(first, second));

      try {
        Files.mismatch(null, second);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.mismatch(first, null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.mismatch(first, first.resolveSibling("missing-file"));
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
    } finally {
      Files.deleteIfExists(first);
      Files.deleteIfExists(second);
      Files.deleteIfExists(longer);
      Files.deleteIfExists(directory);
    }
  }
}
