package classes.modern_test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Map;

public class Java17FilesNoFollowLinkAttributes {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-nofollow-attrs");
    Path target = root.resolve("target.txt");
    Path link = root.resolve("link.txt");
    Path danglingTarget = root.resolve("dangling-target.txt");
    Path danglingLink = root.resolve("dangling-link.txt");
    try {
      Files.writeString(target, "alpha");
      Files.createSymbolicLink(link, target.getFileName());

      BasicFileAttributes followed = Files.readAttributes(link, BasicFileAttributes.class);
      BasicFileAttributes notFollowed =
          Files.readAttributes(link, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
      System.out.println(followed.isRegularFile());
      System.out.println(followed.isSymbolicLink());
      printBasic(notFollowed, target.getFileName());

      Map<String, Object> notFollowedMap =
          Files.readAttributes(
              link,
              "basic:isRegularFile,isDirectory,isSymbolicLink,size",
              LinkOption.NOFOLLOW_LINKS);
      printMap(notFollowedMap, target.getFileName());

      BasicFileAttributeView notFollowedView =
          Files.getFileAttributeView(link, BasicFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
      printBasic(notFollowedView.readAttributes(), target.getFileName());

      Files.createSymbolicLink(danglingLink, danglingTarget.getFileName());
      System.out.println(Files.exists(danglingLink));
      System.out.println(Files.exists(danglingLink, LinkOption.NOFOLLOW_LINKS));
      BasicFileAttributes dangling =
          Files.readAttributes(danglingLink, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
      printBasic(dangling, danglingTarget.getFileName());
      Map<String, Object> danglingMap =
          Files.readAttributes(danglingLink, "basic:*", LinkOption.NOFOLLOW_LINKS);
      printMap(danglingMap, danglingTarget.getFileName());

      printFailure(
          "dangling-follow",
          () -> Files.readAttributes(danglingLink, BasicFileAttributes.class));
      printFailure(
          "missing-nofollow",
          () -> Files.readAttributes(root.resolve("missing.txt"), BasicFileAttributes.class,
              LinkOption.NOFOLLOW_LINKS));
    } finally {
      Files.deleteIfExists(danglingLink);
      Files.deleteIfExists(link);
      Files.deleteIfExists(target);
      Files.deleteIfExists(root);
    }
  }

  private static void printBasic(BasicFileAttributes attributes, Path linkTarget) {
    System.out.println(attributes.isRegularFile());
    System.out.println(attributes.isDirectory());
    System.out.println(attributes.isSymbolicLink());
    System.out.println(attributes.size() == linkTarget.toString().getBytes(StandardCharsets.UTF_8).length);
  }

  private static void printMap(Map<String, Object> attributes, Path linkTarget) {
    System.out.println(attributes.get("isRegularFile"));
    System.out.println(attributes.get("isDirectory"));
    System.out.println(attributes.get("isSymbolicLink"));
    System.out.println(((Long) attributes.get("size")).longValue()
        == linkTarget.toString().getBytes(StandardCharsets.UTF_8).length);
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
