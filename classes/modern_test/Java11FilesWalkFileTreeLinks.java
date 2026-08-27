package classes.modern_test;

import java.io.IOException;
import java.nio.file.FileSystemLoopException;
import java.nio.file.FileVisitOption;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Collections;

public class Java11FilesWalkFileTreeLinks {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-walk-file-tree-links");
    Path realDirectory = root.resolve("real");
    Path leaf = realDirectory.resolve("leaf.txt");
    Path directoryLink = root.resolve("directory-link");
    Path cycleDirectory = root.resolve("cycle");
    Path cycleLink = cycleDirectory.resolve("loop");
    try {
      Files.createDirectory(realDirectory);
      Files.writeString(leaf, "leaf");
      Files.createSymbolicLink(directoryLink, realDirectory.getFileName());
      Files.createDirectory(cycleDirectory);
      Files.createSymbolicLink(cycleLink, cycleDirectory.toAbsolutePath());

      int[] noFollowDirectories = {0};
      boolean[] noFollowSawLink = {false};
      boolean[] noFollowVisitedLeaf = {false};
      Files.walkFileTree(
          directoryLink,
          Collections.<FileVisitOption>emptySet(),
          8,
          new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
              noFollowDirectories[0]++;
              return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
              if (file.equals(directoryLink) && attrs.isSymbolicLink()) {
                noFollowSawLink[0] = true;
              }
              if (file.getFileName().equals(leaf.getFileName())) {
                noFollowVisitedLeaf[0] = true;
              }
              return FileVisitResult.CONTINUE;
            }
          });
      System.out.println(
          "nofollow:"
              + noFollowDirectories[0]
              + ":"
              + noFollowSawLink[0]
              + ":"
              + noFollowVisitedLeaf[0]);

      int[] followedDirectories = {0};
      int[] followedFailures = {0};
      int[] followedPostVisits = {0};
      boolean[] followedLinkAsDirectory = {false};
      boolean[] followedVisitedLeaf = {false};
      Files.walkFileTree(
          directoryLink,
          Collections.singleton(FileVisitOption.FOLLOW_LINKS),
          8,
          new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
              followedDirectories[0]++;
              if (dir.equals(directoryLink) && attrs.isDirectory()) {
                followedLinkAsDirectory[0] = true;
              }
              return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
              if (file.getFileName().equals(leaf.getFileName()) && attrs.isRegularFile()) {
                followedVisitedLeaf[0] = true;
              }
              return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) {
              followedFailures[0]++;
              return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) {
              followedPostVisits[0]++;
              return FileVisitResult.CONTINUE;
            }
          });
      System.out.println(
          "follow:"
              + followedDirectories[0]
              + ":"
              + followedLinkAsDirectory[0]
              + ":"
              + followedVisitedLeaf[0]
              + ":"
              + followedFailures[0]
              + ":"
              + followedPostVisits[0]);

      int[] cycleDirectories = {0};
      int[] cycleFailures = {0};
      int[] cyclePostVisits = {0};
      boolean[] sawLoopException = {false};
      Files.walkFileTree(
          cycleDirectory,
          Collections.singleton(FileVisitOption.FOLLOW_LINKS),
          8,
          new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
              cycleDirectories[0]++;
              return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) {
              cycleFailures[0]++;
              if (file.equals(cycleLink) && exc instanceof FileSystemLoopException) {
                sawLoopException[0] = true;
              }
              return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) {
              cyclePostVisits[0]++;
              return FileVisitResult.CONTINUE;
            }
          });
      System.out.println(
          "cycle:"
              + cycleDirectories[0]
              + ":"
              + cycleFailures[0]
              + ":"
              + sawLoopException[0]
              + ":"
              + cyclePostVisits[0]);
    } finally {
      Files.deleteIfExists(cycleLink);
      Files.deleteIfExists(cycleDirectory);
      Files.deleteIfExists(directoryLink);
      Files.deleteIfExists(leaf);
      Files.deleteIfExists(realDirectory);
      Files.deleteIfExists(root);
    }
  }
}
