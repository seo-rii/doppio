package classes.modern_test;

import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class Java17MappedByteBuffer {
  private static String read(Path path) throws Exception {
    return Files.readString(path, StandardCharsets.UTF_8);
  }

  private static String bytes(MappedByteBuffer buffer, int len) {
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < len; i++) {
      out.append((char) buffer.get(i));
    }
    return out.toString();
  }

  public static void main(String[] args) throws Exception {
    Path root = Path.of("build", "modern-mapped-byte-buffer");
    Files.createDirectories(root);
    Path path = root.resolve("mapped.txt");
    Files.writeString(path, "abcdef", StandardCharsets.UTF_8);

    try (FileChannel channel = FileChannel.open(
        path, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
      MappedByteBuffer mapped = channel.map(FileChannel.MapMode.READ_WRITE, 0, 6);
      boolean loaded = mapped.isLoaded();
      System.out.println("loaded-call:" + (loaded || !loaded));
      System.out.println("load-same:" + (mapped.load() == mapped));
      System.out.println("byte0:" + (char) mapped.get(0));

      mapped.put(1, (byte) 'Z');
      mapped.put(4, (byte) 'Y');
      System.out.println("full-force-same:" + (mapped.force() == mapped));
      System.out.println("after-full-force:" + read(path));
      System.out.println("range-force-empty-same:" + (mapped.force(0, 0) == mapped));
      mapped.put(2, (byte) 'R');
      mapped.put(3, (byte) 'S');
      System.out.println("range-force-same:" + (mapped.force(2, 2) == mapped));
      System.out.println("after-range-force:" + read(path));
      try {
        mapped.force(5, 2);
        System.out.println("range-overflow:missing");
      } catch (IndexOutOfBoundsException e) {
        System.out.println("range-overflow:" + e.getClass().getSimpleName());
      }
      try {
        mapped.force(-1, 1);
        System.out.println("range-negative-index:missing");
      } catch (IndexOutOfBoundsException e) {
        System.out.println("range-negative-index:" + e.getClass().getSimpleName());
      }
      try {
        mapped.force(0, -1);
        System.out.println("range-negative-length:missing");
      } catch (IndexOutOfBoundsException e) {
        System.out.println("range-negative-length:" + e.getClass().getSimpleName());
      }
    }

    MappedByteBuffer afterClose;
    try (FileChannel channel = FileChannel.open(
        path, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
      afterClose = channel.map(FileChannel.MapMode.READ_WRITE, 0, 6);
    }
    afterClose.put(0, (byte) 'Q');
    System.out.println("force-after-close-same:" + (afterClose.force() == afterClose));
    System.out.println("after-force-after-close:" + read(path));

    try (FileChannel channel = FileChannel.open(path, StandardOpenOption.READ)) {
      MappedByteBuffer readOnly = channel.map(FileChannel.MapMode.READ_ONLY, 1, 3);
      boolean loaded = readOnly.isLoaded();
      System.out.println("readonly-loaded-call:" + (loaded || !loaded));
      System.out.println("readonly-load-same:" + (readOnly.load() == readOnly));
      System.out.println("readonly-bytes:" + bytes(readOnly, 3));
      System.out.println("readonly-force-same:" + (readOnly.force() == readOnly));
      System.out.println("readonly-range-force-same:" + (readOnly.force(1, 1) == readOnly));
    }

    try (FileChannel channel = FileChannel.open(
        path, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
      MappedByteBuffer empty = channel.map(FileChannel.MapMode.READ_WRITE, 0, 0);
      boolean loaded = empty.isLoaded();
      System.out.println("empty-capacity:" + empty.capacity());
      System.out.println("empty-loaded-call:" + (loaded || !loaded));
      System.out.println("empty-force-same:" + (empty.force() == empty));
      System.out.println("empty-range-force-same:" + (empty.force(1, 1) == empty));
    }

    Files.deleteIfExists(path);
  }
}
