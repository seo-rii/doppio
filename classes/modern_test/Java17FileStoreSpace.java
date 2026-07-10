package classes.modern_test;

import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.Path;

public class Java17FileStoreSpace {
  public static void main(String[] args) throws Exception {
    printStore("cwd", Files.getFileStore(Path.of(".").toRealPath()));

    Path root = Files.createTempDirectory("doppio-filestore");
    Path file = Files.createTempFile(root, "space", ".txt");
    Files.write(file, new byte[] { 1, 2, 3 });
    try {
      printStore("dir", Files.getFileStore(root));
      printStore("file", Files.getFileStore(file));
    } finally {
      Files.deleteIfExists(file);
      Files.deleteIfExists(root);
    }
  }

  private static void printStore(String label, FileStore store) throws Exception {
    long total = store.getTotalSpace();
    long usable = store.getUsableSpace();
    long unallocated = store.getUnallocatedSpace();
    long blockSize = store.getBlockSize();
    System.out.println(label + "-name-present:" + (store.name() != null));
    System.out.println(label + "-type-present:" + (store.type() != null));
    System.out.println(label + "-total-positive:" + (total > 0));
    System.out.println(label + "-usable-nonnegative:" + (usable >= 0));
    System.out.println(label + "-unallocated-nonnegative:" + (unallocated >= 0));
    System.out.println(label + "-usable-within-total:" + (usable <= total));
    System.out.println(label + "-unallocated-within-total:" + (unallocated <= total));
    System.out.println(label + "-block-size-positive:" + (blockSize > 0));
    try {
      store.getAttribute("blockSize");
      System.out.println(label + "-block-size-attribute:ok");
    } catch (Throwable t) {
      System.out.println(label + "-block-size-attribute:" + t.getClass().getName());
    }
  }
}
