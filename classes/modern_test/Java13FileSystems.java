package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.DirectoryStream;
import java.nio.file.FileVisitOption;
import java.nio.file.FileVisitResult;
import java.nio.file.FileSystems;
import java.nio.file.FileSystem;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileAttributeView;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class Java13FileSystems {
  private interface MissingFileAttributeView extends FileAttributeView {
  }

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
      zip.putNextEntry(new ZipEntry("nested/"));
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
    System.out.println("time:" + (Files.getLastModifiedTime(hello).toMillis() >= 0));
    System.out.println("access:" + Files.isReadable(hello) + ":" +
        Files.isWritable(hello) + ":" + Files.isExecutable(hello));
    System.out.println("hidden-symbolic:" + Files.isHidden(hello) + ":" + Files.isSymbolicLink(hello));
    System.out.println("same-mismatch:" + Files.isSameFile(hello, fs.getPath("hello.txt")) + ":" +
        Files.mismatch(hello, nestedValue));
    System.out.println("store:" + Files.getFileStore(hello).supportsFileAttributeView("basic"));
    BasicFileAttributeView basicView = Files.getFileAttributeView(hello, BasicFileAttributeView.class);
    BasicFileAttributes viewAttrs = basicView.readAttributes();
    System.out.println("view:" + basicView.name() + ":" + viewAttrs.size() + ":" + viewAttrs.isRegularFile());
    System.out.println("missing-view:" + (Files.getFileAttributeView(hello, MissingFileAttributeView.class) == null));
    ByteArrayOutputStream copiedOut = new ByteArrayOutputStream();
    System.out.println("copy-out:" + Files.copy(hello, copiedOut) + ":" + copiedOut.toString("UTF-8"));
    Path copied = fs.getPath(label + "-copy.txt");
    System.out.println("copy-in:" + Files.copy(new ByteArrayInputStream(new byte[] { 'o', 'k' }), copied) +
        ":" + Files.readString(copied));
    printFailure(label + "-copy-existing",
        () -> Long.valueOf(Files.copy(new ByteArrayInputStream(new byte[] { 'x' }), copied)));
    System.out.println("copy-replace:" +
        Files.copy(new ByteArrayInputStream(new byte[] { 'n' }), copied, StandardCopyOption.REPLACE_EXISTING) +
        ":" + Files.readString(copied));
    System.out.println("delete:" + Files.deleteIfExists(copied) + ":" + Files.exists(copied));
    Path pathCopied = fs.getPath(label + "-path-copy.txt");
    System.out.println("path-copy:" + Files.copy(hello, pathCopied).equals(pathCopied) +
        ":" + Files.readString(pathCopied));
    printFailure(label + "-path-copy-existing", () -> Files.copy(hello, pathCopied));
    System.out.println("path-copy-replace:" +
        Files.copy(nestedValue, pathCopied, StandardCopyOption.REPLACE_EXISTING).equals(pathCopied) +
        ":" + Files.readString(pathCopied));
    Path copiedDirectory = fs.getPath(label + "-dir-copy");
    System.out.println("dir-copy:" + Files.copy(nested, copiedDirectory).equals(copiedDirectory) +
        ":" + Files.isDirectory(copiedDirectory));
    Path defaultTarget = Files.createTempFile("doppio-java13-fs-copy-target", ".txt");
    Files.deleteIfExists(defaultTarget);
    try {
      System.out.println("copy-to-default:" + Files.copy(hello, defaultTarget).equals(defaultTarget) +
          ":" + Files.readString(defaultTarget));
    } finally {
      Files.deleteIfExists(defaultTarget);
    }
    Path defaultSource = Files.createTempFile("doppio-java13-fs-copy-source", ".txt");
    try {
      Files.writeString(defaultSource, "df");
      Path copiedFromDefault = fs.getPath(label + "-default-copy.txt");
      System.out.println("copy-from-default:" + Files.copy(defaultSource, copiedFromDefault).equals(copiedFromDefault) +
          ":" + Files.readString(copiedFromDefault));
    } finally {
      Files.deleteIfExists(defaultSource);
    }
    Path createdNested = fs.getPath(label + "-created", "nested");
    Files.createDirectories(createdNested);
    System.out.println("createdirs:" + Files.isDirectory(createdNested));
    Path lineFile = createdNested.resolve("lines.txt");
    System.out.println("write-lines:" + Files.write(lineFile, Arrays.asList("a", "b")).equals(lineFile) +
        ":" + Files.readAllLines(lineFile));
    Path moveSource = fs.getPath(label + "-move-source.txt");
    Path moveTarget = fs.getPath(label + "-move-target.txt");
    Files.writeString(moveSource, "mz");
    Files.move(moveSource, moveTarget);
    System.out.println("move-zip:" + Files.readString(moveTarget) + ":" + Files.exists(moveSource));
    Path moveExistingSource = fs.getPath(label + "-move-existing-source.txt");
    Files.writeString(moveExistingSource, "mr");
    printFailure(label + "-move-existing", () -> Files.move(moveExistingSource, moveTarget));
    Files.move(moveExistingSource, moveTarget, StandardCopyOption.REPLACE_EXISTING);
    System.out.println("move-replace:" + Files.readString(moveTarget) + ":" + Files.exists(moveExistingSource));
    Path defaultMoveSource = Files.createTempFile("doppio-java13-fs-move-source", ".txt");
    try {
      Files.writeString(defaultMoveSource, "dm");
      Path movedFromDefault = fs.getPath(label + "-default-move.txt");
      Files.move(defaultMoveSource, movedFromDefault);
      System.out.println("move-from-default:" + Files.exists(defaultMoveSource) + ":" +
          Files.readString(movedFromDefault));
    } finally {
      Files.deleteIfExists(defaultMoveSource);
    }
    Path zipMoveSource = fs.getPath(label + "-zip-move-source.txt");
    Files.writeString(zipMoveSource, "zd");
    Path defaultMoveTarget = Files.createTempFile("doppio-java13-fs-move-target", ".txt");
    Files.deleteIfExists(defaultMoveTarget);
    try {
      Files.move(zipMoveSource, defaultMoveTarget);
      System.out.println("move-to-default:" + Files.exists(zipMoveSource) + ":" +
          Files.readString(defaultMoveTarget));
    } finally {
      Files.deleteIfExists(defaultMoveTarget);
    }
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
    ArrayList<String> treeEvents = new ArrayList<String>();
    Path returned = Files.walkFileTree(nested, new SimpleFileVisitor<Path>() {
      @Override
      public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attributes) {
        treeEvents.add("pre:" + dir.getFileName().toString() + ":" + attributes.isDirectory());
        return FileVisitResult.CONTINUE;
      }

      @Override
      public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) {
        treeEvents.add("file:" + file.getFileName().toString() + ":" + attributes.isRegularFile());
        return FileVisitResult.CONTINUE;
      }

      @Override
      public FileVisitResult postVisitDirectory(Path dir, IOException error) {
        treeEvents.add("post:" + dir.getFileName().toString() + ":" + (error == null));
        return FileVisitResult.CONTINUE;
      }
    });
    Collections.sort(treeEvents);
    System.out.println("tree:" + returned.equals(nested) + ":" + treeEvents);
    treeEvents.clear();
    Files.walkFileTree(nested, Collections.<FileVisitOption>emptySet(), 0, new SimpleFileVisitor<Path>() {
      @Override
      public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) {
        treeEvents.add("depth0:" + file.equals(nested) + ":" + attributes.isDirectory());
        return FileVisitResult.CONTINUE;
      }
    });
    System.out.println("tree-depth0:" + treeEvents);
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
