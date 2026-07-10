package classes.modern_test;

import java.nio.file.FileStore;
import java.nio.file.FileSystems;

public class Java17FileSystemStores {
  public static void main(String[] args) throws Exception {
    int count = 0;
    boolean sawUsableStore = false;
    for (FileStore store : FileSystems.getDefault().getFileStores()) {
      count++;
      long total = store.getTotalSpace();
      long usable = store.getUsableSpace();
      long unallocated = store.getUnallocatedSpace();
      long blockSize = store.getBlockSize();
      sawUsableStore |= store.name() != null
          && store.type() != null
          && total > 0L
          && usable >= 0L
          && unallocated >= 0L
          && usable <= total
          && unallocated <= total
          && blockSize > 0L;
      if (count >= 3) {
        break;
      }
    }
    System.out.println("count-positive:" + (count > 0));
    System.out.println("usable-store:" + sawUsableStore);
  }
}
