package classes.modern_test;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

public class Java17FileSpace {
  public static void main(String[] args) throws Exception {
    File cwd = new File(".").getCanonicalFile();
    printSpace("cwd", cwd);

    Path tempDir = Files.createTempDirectory("doppio-space");
    Path tempFile = Files.createTempFile(tempDir, "space", ".txt");
    Files.write(tempFile, new byte[] { 1, 2, 3 });
    try {
      printSpace("dir", tempDir.toFile());
      printSpace("file", tempFile.toFile());
    } finally {
      Files.deleteIfExists(tempFile);
      Files.deleteIfExists(tempDir);
    }

    File missing = new File(cwd, "doppio-missing-space-" + System.nanoTime());
    System.out.println("missing-exists:" + missing.exists());
    System.out.println("missing-total:" + missing.getTotalSpace());
    System.out.println("missing-free:" + missing.getFreeSpace());
    System.out.println("missing-usable:" + missing.getUsableSpace());
  }

  private static void printSpace(String label, File file) {
    long total = file.getTotalSpace();
    long free = file.getFreeSpace();
    long usable = file.getUsableSpace();
    System.out.println(label + "-total-positive:" + (total > 0));
    System.out.println(label + "-free-nonnegative:" + (free >= 0));
    System.out.println(label + "-usable-nonnegative:" + (usable >= 0));
    System.out.println(label + "-free-within-total:" + (free <= total));
    System.out.println(label + "-usable-within-total:" + (usable <= total));
  }
}
