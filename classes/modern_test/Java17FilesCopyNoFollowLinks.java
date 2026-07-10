package classes.modern_test;

import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public class Java17FilesCopyNoFollowLinks {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-copy-links");
    Path target = root.resolve("target.txt");
    Path sourceLink = root.resolve("source-link.txt");
    Path followedCopy = root.resolve("followed-copy.txt");
    Path copiedLink = root.resolve("copied-link.txt");
    Path replaced = root.resolve("replaced.txt");
    Path danglingTarget = root.resolve("dangling-target.txt");
    Path danglingSource = root.resolve("dangling-source.txt");
    Path danglingCopy = root.resolve("dangling-copy.txt");
    Path danglingFollowed = root.resolve("dangling-followed.txt");
    try {
      Files.writeString(target, "alpha");
      Files.createSymbolicLink(sourceLink, target.getFileName());

      Files.copy(sourceLink, followedCopy);
      System.out.println(Files.isRegularFile(followedCopy));
      System.out.println(Files.isSymbolicLink(followedCopy));
      System.out.println(Files.readString(followedCopy));

      Files.copy(sourceLink, copiedLink, LinkOption.NOFOLLOW_LINKS);
      System.out.println(Files.isSymbolicLink(copiedLink));
      System.out.println(Files.readSymbolicLink(copiedLink).equals(target.getFileName()));
      System.out.println(Files.readString(copiedLink));
      Files.writeString(copiedLink, "beta");
      System.out.println(Files.readString(target));

      Files.writeString(replaced, "old");
      Files.copy(
          sourceLink,
          replaced,
          LinkOption.NOFOLLOW_LINKS,
          StandardCopyOption.REPLACE_EXISTING);
      System.out.println(Files.isSymbolicLink(replaced));
      System.out.println(Files.readSymbolicLink(replaced).equals(target.getFileName()));
      System.out.println(Files.readString(replaced));

      Files.createSymbolicLink(danglingSource, danglingTarget.getFileName());
      Files.copy(danglingSource, danglingCopy, LinkOption.NOFOLLOW_LINKS);
      System.out.println(Files.exists(danglingCopy));
      System.out.println(Files.exists(danglingCopy, LinkOption.NOFOLLOW_LINKS));
      System.out.println(Files.isSymbolicLink(danglingCopy));
      System.out.println(Files.readSymbolicLink(danglingCopy).equals(danglingTarget.getFileName()));
      printFailure("dangling-follow", () -> Files.copy(danglingSource, danglingFollowed));
    } finally {
      Files.deleteIfExists(danglingFollowed);
      Files.deleteIfExists(danglingCopy);
      Files.deleteIfExists(danglingSource);
      Files.deleteIfExists(replaced);
      Files.deleteIfExists(copiedLink);
      Files.deleteIfExists(followedCopy);
      Files.deleteIfExists(sourceLink);
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
