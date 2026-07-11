package classes.modern_test;

import java.io.OutputStream;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.DirectoryStream;
import java.nio.file.FileSystems;
import java.nio.file.FileSystem;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class Java13FileSystems {
  public static void main(String[] args) throws Exception {
    ClassLoader loader = Java13FileSystems.class.getClassLoader();
    printFailure("null-one", () -> FileSystems.newFileSystem((Path) null));
    printFailure("null-map-path", () -> FileSystems.newFileSystem((Path) null, Collections.emptyMap()));
    printFailure("null-map", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip"), (Map<String, ?>) null));
    printFailure("null-loader-path", () -> FileSystems.newFileSystem((Path) null, loader));
    printFailure("null-map-loader-path", () -> FileSystems.newFileSystem((Path) null, Collections.emptyMap(), loader));
    printFailure("null-map-loader-map", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip"), null, loader));
    printFailure("missing-one", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip")));
    printFailure("missing-map", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip"), Collections.emptyMap()));
    printFailure("missing-loader", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip"), loader));
    printFailure("missing-null-loader", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip"), (ClassLoader) null));
    printFailure("missing-map-loader", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip"), Collections.emptyMap(), loader));
    printFailure("missing-map-null-loader", () -> FileSystems.newFileSystem(Path.of("doppio-java13-fs-missing.zip"), Collections.emptyMap(), null));

    Path temp = Files.createTempFile("doppio-java13-fs", ".bin");
    try {
      Files.write(temp, new byte[] { 1, 2, 3 });
      printFailure("plain-file", () -> FileSystems.newFileSystem(temp));
      printFailure("plain-file-map", () -> FileSystems.newFileSystem(temp, Collections.emptyMap()));
      printFailure("plain-file-loader", () -> FileSystems.newFileSystem(temp, loader));
      printFailure("plain-file-null-loader", () -> FileSystems.newFileSystem(temp, (ClassLoader) null));
      printFailure("plain-file-map-loader", () -> FileSystems.newFileSystem(temp, Collections.emptyMap(), loader));
      printFailure("plain-file-map-null-loader", () -> FileSystems.newFileSystem(temp, Collections.emptyMap(), null));
    } finally {
      Files.deleteIfExists(temp);
    }

    Path zip = Files.createTempFile("doppio-java13-fs", ".zip");
    try {
      writeZip(zip);
      try (FileSystem fs = FileSystems.newFileSystem(zip)) {
        printZipFileSystem("zip-one", fs);
      }
      try (FileSystem fs = FileSystems.newFileSystem(zip, Collections.emptyMap())) {
        printZipFileSystem("zip-map", fs);
      }
      try (FileSystem fs = FileSystems.newFileSystem(zip, loader)) {
        printZipFileSystem("zip-loader", fs);
      }
      try (FileSystem fs = FileSystems.newFileSystem(zip, Collections.emptyMap(), loader)) {
        printZipFileSystem("zip-map-loader", fs);
      }
    } finally {
      Files.deleteIfExists(zip);
    }
  }

  private static void writeZip(Path path) throws Exception {
    try (OutputStream out = Files.newOutputStream(path);
         ZipOutputStream zip = new ZipOutputStream(out)) {
      zip.putNextEntry(new ZipEntry("hello.txt"));
      zip.write(new byte[] { 'h', 'i' });
      zip.closeEntry();
      zip.putNextEntry(new ZipEntry("nested/value.txt"));
      zip.write(new byte[] { 'z' });
      zip.closeEntry();
    }
  }

  private static void printZipFileSystem(String label, FileSystem fs) throws Exception {
    Path hello = fs.getPath("hello.txt");
    Path nested = fs.getPath("nested");
    Path nestedValue = fs.getPath("nested", "value.txt");
    System.out.println(label + ":" + fs.provider().getScheme());
    System.out.println(Files.readString(hello));
    System.out.println(Files.exists(nestedValue));
    System.out.println(Files.isRegularFile(hello) + ":" + Files.isDirectory(nested) + ":" + Files.size(hello));
    BasicFileAttributes attrs = Files.readAttributes(hello, BasicFileAttributes.class);
    System.out.println(attrs.size() + ":" + attrs.isRegularFile() + ":" +
        Files.readAttributes(hello, "basic:size,isRegularFile").get("size"));
    try (SeekableByteChannel channel = Files.newByteChannel(hello)) {
      System.out.println("channel:" + channel.size());
    }
    ArrayList<String> directoryNames = new ArrayList<String>();
    try (DirectoryStream<Path> stream = Files.newDirectoryStream(nested)) {
      for (Path path : stream) {
        directoryNames.add(path.getFileName().toString());
      }
    }
    Collections.sort(directoryNames);
    System.out.println("dir:" + directoryNames);
    ArrayList<String> listedNames = new ArrayList<String>();
    try (java.util.stream.Stream<Path> stream = Files.list(nested)) {
      stream.forEach(path -> listedNames.add(path.getFileName().toString()));
    }
    Collections.sort(listedNames);
    System.out.println("list:" + listedNames);
    ArrayList<String> walkedNames = new ArrayList<String>();
    try (java.util.stream.Stream<Path> stream = Files.walk(nested)) {
      stream.forEach(path -> {
        Path fileName = path.getFileName();
        walkedNames.add(fileName == null ? "." : fileName.toString());
      });
    }
    Collections.sort(walkedNames);
    System.out.println("walk:" + walkedNames);
    ArrayList<String> foundNames = new ArrayList<String>();
    try (java.util.stream.Stream<Path> stream = Files.find(nested, 1, (path, attributes) -> attributes.isRegularFile())) {
      stream.forEach(path -> foundNames.add(path.getFileName().toString()));
    }
    Collections.sort(foundNames);
    System.out.println("find:" + foundNames);
  }

  private static void printFailure(String label, Throwing action) {
    try {
      Object fileSystem = action.run();
      System.out.println(label + ":" + fileSystem.getClass().getName());
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    Object run() throws Throwable;
  }
}
