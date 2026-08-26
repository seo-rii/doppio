package classes.modern_test;

import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.NotLinkException;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;

public class Java17FilesLinks {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-links");
    Path target = root.resolve("target.txt");
    Path hardLink = root.resolve("hard.txt");
    Path symlink = root.resolve("sym.txt");
    Path directoryTarget = root.resolve("target-dir");
    Path directorySymlink = root.resolve("sym-dir");
    Path danglingTarget = root.resolve("dangling.txt");
    Path danglingLink = root.resolve("dangling-link.txt");
    try {
      Files.writeString(target, "alpha");

      Path missing = root.resolve("missing.txt");
      System.out.println("symbolic-types:" +
          Files.isSymbolicLink(Path.of("")) + ":" +
          Files.isSymbolicLink(target) + ":" +
          Files.isSymbolicLink(root) + ":" +
          Files.isSymbolicLink(missing));
      printFailure("read-empty", () -> Files.readSymbolicLink(Path.of("")));
      printFailure("read-missing", () -> Files.readSymbolicLink(missing));
      printFailure("is-symbolic-null", () -> Files.isSymbolicLink(null));

      System.out.println(Files.createLink(hardLink, target).equals(hardLink));
      System.out.println(Files.exists(hardLink));
      System.out.println(Files.isSameFile(target, hardLink));
      System.out.println(Files.readString(hardLink));
      Files.writeString(hardLink, "beta");
      System.out.println(Files.readString(target));

      printFailure("hard-existing", () -> Files.createLink(hardLink, target));
      printFailure("hard-missing-source", () -> Files.createLink(root.resolve("missing-hard"), root.resolve("missing-source")));

      System.out.println(Files.createSymbolicLink(symlink, target.getFileName()).equals(symlink));
      System.out.println(Files.isSymbolicLink(symlink));
      System.out.println(Files.readSymbolicLink(symlink).equals(target.getFileName()));
      System.out.println(Files.exists(symlink));
      System.out.println(Files.exists(symlink, LinkOption.NOFOLLOW_LINKS));
      System.out.println(Files.isSameFile(target, symlink));
      BasicFileAttributes followed = Files.readAttributes(symlink, BasicFileAttributes.class);
      BasicFileAttributes notFollowed =
          Files.readAttributes(symlink, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
      System.out.println(followed.isRegularFile());
      System.out.println(notFollowed.isSymbolicLink());
      System.out.println("file-type:"
          + Files.isRegularFile(symlink) + ":"
          + Files.isRegularFile(symlink, LinkOption.NOFOLLOW_LINKS) + ":"
          + Files.isDirectory(symlink) + ":"
          + Files.isDirectory(symlink, LinkOption.NOFOLLOW_LINKS));
      System.out.println(Files.readString(symlink));
      Files.writeString(symlink, "gamma");
      System.out.println(Files.readString(target));

      Files.createDirectory(directoryTarget);
      Files.createSymbolicLink(directorySymlink, directoryTarget.getFileName());
      System.out.println("directory-type:"
          + Files.isRegularFile(directorySymlink) + ":"
          + Files.isRegularFile(directorySymlink, LinkOption.NOFOLLOW_LINKS) + ":"
          + Files.isDirectory(directorySymlink) + ":"
          + Files.isDirectory(directorySymlink, LinkOption.NOFOLLOW_LINKS));

      System.out.println(Files.createSymbolicLink(danglingLink, danglingTarget.getFileName()).equals(danglingLink));
      System.out.println(Files.exists(danglingLink));
      System.out.println(Files.exists(danglingLink, LinkOption.NOFOLLOW_LINKS));
      System.out.println(Files.isSymbolicLink(danglingLink));
      System.out.println(Files.readSymbolicLink(danglingLink).equals(danglingTarget.getFileName()));

      printFailure("sym-existing", () -> Files.createSymbolicLink(symlink, target.getFileName()));
      printFailure("read-non-link", () -> Files.readSymbolicLink(target));
      printFailure("create-link-null-link", () -> Files.createLink(null, target));
      printFailure("create-link-null-existing", () -> Files.createLink(root.resolve("null-hard"), null));
      printFailure("create-sym-null-link", () -> Files.createSymbolicLink(null, target));
      printFailure("create-sym-null-target", () -> Files.createSymbolicLink(root.resolve("null-sym"), null));
      printFailure("read-sym-null", () -> Files.readSymbolicLink(null));
    } finally {
      Files.deleteIfExists(danglingLink);
      Files.deleteIfExists(directorySymlink);
      Files.deleteIfExists(directoryTarget);
      Files.deleteIfExists(symlink);
      Files.deleteIfExists(hardLink);
      Files.deleteIfExists(target);
      Files.deleteIfExists(root);
    }
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run() throws Exception;
  }
}
