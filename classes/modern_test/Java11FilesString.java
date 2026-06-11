package classes.modern_test;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryIteratorException;
import java.nio.file.DirectoryNotEmptyException;
import java.nio.file.DirectoryStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.FileSystemException;
import java.nio.file.FileVisitOption;
import java.nio.file.FileVisitResult;
import java.nio.file.FileVisitor;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.NotDirectoryException;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.FileAttributeView;
import java.nio.file.attribute.FileOwnerAttributeView;
import java.nio.file.attribute.FileStoreAttributeView;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.GroupPrincipal;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFileAttributes;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.UserPrincipal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.regex.PatternSyntaxException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Java11FilesString {
  public static void main(String[] args) throws Exception {
    Path path = Files.createTempFile("doppio-files", ".txt");
    try {
      System.out.println(Files.exists(path));
      System.out.println(Files.notExists(path));
      System.out.println(Files.isRegularFile(path));
      System.out.println(Files.isDirectory(path));
      System.out.println(Files.size(path));
      System.out.println(Files.exists(path, LinkOption.NOFOLLOW_LINKS));
      System.out.println(Files.isReadable(path));
      System.out.println(Files.isWritable(path));
      System.out.println(Files.isExecutable(path));
      BasicFileAttributes pathAttributes = Files.readAttributes(path, BasicFileAttributes.class);
      System.out.println(pathAttributes.isRegularFile());
      System.out.println(pathAttributes.isDirectory());
      System.out.println(pathAttributes.isSymbolicLink());
      System.out.println(pathAttributes.isOther());
      System.out.println(pathAttributes.size());
      System.out.println(pathAttributes.lastModifiedTime().toMillis() > 0);
      System.out.println(pathAttributes.lastAccessTime().toMillis() > 0);
      System.out.println(pathAttributes.creationTime().toMillis() > 0);
      System.out.println(Files.getAttribute(path, "size"));
      System.out.println(Files.getAttribute(path, "basic:size"));
      System.out.println(Files.getAttribute(path, "basic:isRegularFile"));
      Map<String, Object> selectedAttributes =
          Files.readAttributes(path, "basic:size,isRegularFile,isDirectory,lastModifiedTime,fileKey");
      System.out.println(selectedAttributes.get("size"));
      System.out.println(selectedAttributes.get("isRegularFile"));
      System.out.println(selectedAttributes.get("isDirectory"));
      System.out.println(selectedAttributes.get("lastModifiedTime") instanceof FileTime);
      System.out.println(selectedAttributes.containsKey("fileKey"));
      try {
        selectedAttributes.put("x", "y");
        System.out.println(false);
      } catch (UnsupportedOperationException e) {
        System.out.println(e.getClass().getName());
      }
      Map<String, Object> allAttributes = Files.readAttributes(path, "basic:*");
      System.out.println(allAttributes.containsKey("size"));
      System.out.println(allAttributes.containsKey("lastAccessTime"));
      System.out.println(Files.isSameFile(path, path));
      System.out.println(Files.writeString(path, "alpha").equals(path));
      System.out.println(Files.readString(path));
      Files.writeString(path, "beta");
      System.out.println(Files.readString(path));
      Files.writeString(path, "-tail", StandardOpenOption.APPEND);
      System.out.println(Files.readString(path));
      System.out.println(Files.readAllBytes(path).length);
      System.out.println(Files.size(path));
      Files.writeString(path, "Z", StandardOpenOption.WRITE);
      System.out.println(Files.readString(path));
      Files.writeString(path, "S", StandardOpenOption.WRITE, StandardOpenOption.SYNC);
      System.out.println(Files.readString(path));
      Files.writeString(path, "D", StandardOpenOption.WRITE, StandardOpenOption.DSYNC);
      System.out.println(Files.readString(path));
      Files.writeString(path, "Q", StandardOpenOption.WRITE, StandardOpenOption.SPARSE);
      System.out.println(Files.readString(path));
      InputStream readStream = Files.newInputStream(path, StandardOpenOption.READ);
      try {
        System.out.println(readStream.read());
      } finally {
        readStream.close();
      }
      try {
        Files.newInputStream(path, StandardOpenOption.WRITE).close();
        System.out.println(false);
      } catch (UnsupportedOperationException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.newInputStream(path, StandardOpenOption.APPEND).close();
        System.out.println(false);
      } catch (UnsupportedOperationException e) {
        System.out.println(e.getClass().getName());
      }
      Path inputParentFile = Files.writeString(path.getParent().resolve(path.getFileName().toString() + ".input-parent"), "p");
      try {
        try {
          Files.newInputStream(inputParentFile.resolve("in.txt")).close();
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.readAllBytes(inputParentFile.resolve("in.txt"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.readString(inputParentFile.resolve("in.txt"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.lines(inputParentFile.resolve("in.txt")).close();
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(inputParentFile);
      }

      Path queryDirectory = Files.createTempDirectory("doppio-files-query");
      try {
        System.out.println(Files.exists(queryDirectory));
        System.out.println(Files.notExists(queryDirectory));
        System.out.println(Files.isDirectory(queryDirectory));
        System.out.println(Files.isRegularFile(queryDirectory));
        BasicFileAttributes queryDirectoryAttributes =
            Files.readAttributes(queryDirectory, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
        System.out.println(queryDirectoryAttributes.isDirectory());
        System.out.println(queryDirectoryAttributes.isRegularFile());
        System.out.println(queryDirectoryAttributes.isSymbolicLink());
        System.out.println(queryDirectoryAttributes.isOther());
        System.out.println(queryDirectoryAttributes.size() >= 0);
      } finally {
        Files.deleteIfExists(queryDirectory);
      }

      Path nullPrefixFile = Files.createTempFile((String) null, null);
      try {
        System.out.println(Files.isRegularFile(nullPrefixFile));
        System.out.println(nullPrefixFile.getFileName().toString().endsWith(".tmp"));
      } finally {
        Files.deleteIfExists(nullPrefixFile);
      }
      Path shortPrefixFile = Files.createTempFile("ab", null);
      try {
        System.out.println(shortPrefixFile.getFileName().toString().startsWith("ab"));
        System.out.println(shortPrefixFile.getFileName().toString().endsWith(".tmp"));
      } finally {
        Files.deleteIfExists(shortPrefixFile);
      }
      Path nullPrefixDirectory = Files.createTempDirectory((String) null);
      try {
        System.out.println(Files.isDirectory(nullPrefixDirectory));
      } finally {
        Files.deleteIfExists(nullPrefixDirectory);
      }
      Path tempRoot = Files.createTempDirectory("doppio-files-temp");
      Path fileAsDirectory = null;
      try {
        Path childTempFile = Files.createTempFile(tempRoot, "xy", ".dat");
        try {
          System.out.println(childTempFile.getParent().equals(tempRoot));
          System.out.println(childTempFile.getFileName().toString().startsWith("xy"));
          System.out.println(childTempFile.getFileName().toString().endsWith(".dat"));
        } finally {
          Files.deleteIfExists(childTempFile);
        }
        Path childTempDirectory = Files.createTempDirectory(tempRoot, "q");
        try {
          System.out.println(childTempDirectory.getParent().equals(tempRoot));
          System.out.println(childTempDirectory.getFileName().toString().startsWith("q"));
        } finally {
          Files.deleteIfExists(childTempDirectory);
        }
        fileAsDirectory = Files.writeString(tempRoot.resolve("plain.txt"), "x");
        try {
          Files.createTempFile(fileAsDirectory, "abc", ".tmp");
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createTempDirectory(fileAsDirectory, "abc");
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createTempFile(tempRoot.resolve("missing"), "abc", ".tmp");
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createTempDirectory(tempRoot.resolve("missing"), "abc");
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        if (fileAsDirectory != null) {
          Files.deleteIfExists(fileAsDirectory);
        }
        Files.deleteIfExists(tempRoot);
      }
      try {
        Files.createTempFile("abc", ".tmp", (java.nio.file.attribute.FileAttribute<?>[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.createTempDirectory("abc", new java.nio.file.attribute.FileAttribute<?>[] { null });
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.createTempFile((Path) null, "abc", ".tmp");
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }

      Path missingQuery = path.getParent().resolve(path.getFileName().toString() + ".missing-query");
      System.out.println(Files.exists(missingQuery));
      System.out.println(Files.notExists(missingQuery));
      System.out.println(Files.isDirectory(missingQuery));
      System.out.println(Files.isRegularFile(missingQuery));
      System.out.println(Files.isReadable(missingQuery));
      System.out.println(Files.isWritable(missingQuery));
      System.out.println(Files.isExecutable(missingQuery));
      Path hiddenQuery = path.getParent().resolve("." + path.getFileName().toString() + ".hidden-query");
      try {
        Files.writeString(hiddenQuery, "hidden");
        System.out.println(Files.isHidden(hiddenQuery));
        System.out.println(Files.isHidden(missingQuery));
        System.out.println(Files.isSymbolicLink(path));
        System.out.println(Files.isSymbolicLink(missingQuery));
        try {
          Files.isHidden((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.isSymbolicLink((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(hiddenQuery);
      }
      System.out.println(Files.isSameFile(missingQuery, missingQuery));
      try {
        Files.isSameFile(path, missingQuery);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.isSameFile(null, path);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.size(missingQuery);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      FileStore fileStore = Files.getFileStore(path);
      System.out.println(fileStore.name() != null);
      System.out.println(fileStore.type() != null);
      System.out.println(fileStore.isReadOnly());
      System.out.println(fileStore.getTotalSpace() >= 0L);
      System.out.println(fileStore.getUsableSpace() >= 0L);
      System.out.println(fileStore.getUnallocatedSpace() >= 0L);
      System.out.println(fileStore.supportsFileAttributeView(BasicFileAttributeView.class));
      System.out.println(fileStore.supportsFileAttributeView(PosixFileAttributeView.class));
      System.out.println(fileStore.supportsFileAttributeView(FileOwnerAttributeView.class));
      System.out.println(fileStore.supportsFileAttributeView(MissingFileAttributeView.class));
      System.out.println(fileStore.supportsFileAttributeView("basic"));
      System.out.println(fileStore.supportsFileAttributeView("posix"));
      System.out.println(fileStore.supportsFileAttributeView("owner"));
      System.out.println(fileStore.supportsFileAttributeView("missing"));
      System.out.println(fileStore.getFileStoreAttributeView(FileStoreAttributeView.class) == null);
      System.out.println(fileStore.getAttribute("totalSpace") instanceof Long);
      System.out.println(((Long) fileStore.getAttribute("totalSpace")) >= 0L);
      System.out.println(fileStore.getAttribute("usableSpace") instanceof Long);
      System.out.println(((Long) fileStore.getAttribute("usableSpace")) >= 0L);
      System.out.println(fileStore.getAttribute("unallocatedSpace") instanceof Long);
      System.out.println(((Long) fileStore.getAttribute("unallocatedSpace")) >= 0L);
      try {
        fileStore.supportsFileAttributeView((Class<? extends FileAttributeView>) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        fileStore.supportsFileAttributeView((String) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        fileStore.getAttribute("blockSize");
        System.out.println(false);
      } catch (UnsupportedOperationException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        fileStore.getAttribute(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getFileStore(missingQuery);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getFileStore(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(missingQuery, BasicFileAttributes.class);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes((Path) null, BasicFileAttributes.class);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(path, (Class<BasicFileAttributes>) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(path, BasicFileAttributes.class, (LinkOption[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(path, BasicFileAttributes.class, new LinkOption[] { null });
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      BasicFileAttributeView basicView = Files.getFileAttributeView(path, BasicFileAttributeView.class);
      System.out.println(basicView != null);
      System.out.println(basicView.name());
      System.out.println(basicView.readAttributes().isRegularFile());
      System.out.println(basicView.readAttributes().size());
      FileTime viewTime = FileTime.fromMillis(222222222L);
      basicView.setTimes(viewTime, null, null);
      System.out.println(Files.getLastModifiedTime(path).toMillis());
      BasicFileAttributeView noFollowBasicView =
          Files.getFileAttributeView(path, BasicFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
      System.out.println(noFollowBasicView != null);
      System.out.println(Files.getFileAttributeView(path, MissingFileAttributeView.class) == null);
      try {
        Files.getFileAttributeView(null, BasicFileAttributeView.class);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getFileAttributeView(path, null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getFileAttributeView(path, BasicFileAttributeView.class, (LinkOption[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getFileAttributeView(path, BasicFileAttributeView.class, new LinkOption[] { null });
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      BasicFileAttributeView missingBasicView =
          Files.getFileAttributeView(path.getParent().resolve("missing-basic-view.txt"), BasicFileAttributeView.class);
      System.out.println(missingBasicView != null);
      try {
        missingBasicView.readAttributes();
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute(missingQuery, "size");
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(missingQuery, "size");
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute(path, "basic:missing");
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(path, "basic:missing");
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute((Path) null, "size");
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute(path, null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes((Path) null, "size");
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(path, (String) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute(path, "size", (LinkOption[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(path, "size", new LinkOption[] { null });
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.exists(path, (LinkOption[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.exists(path, new LinkOption[] { null });
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      UserPrincipal owner = Files.getOwner(path);
      System.out.println(owner != null);
      System.out.println(owner.getName() != null);
      System.out.println(owner.getName().length() > 0);
      System.out.println(Files.setOwner(path, owner).equals(path));
      System.out.println(Files.getOwner(path, LinkOption.NOFOLLOW_LINKS).getName() != null);
      try {
        Files.getOwner(missingQuery);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getOwner(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getOwner(path, (LinkOption[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getOwner(path, new LinkOption[] { null });
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setOwner(null, owner);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setOwner(path, null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setOwner(missingQuery, owner);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      FileOwnerAttributeView ownerView = Files.getFileAttributeView(path, FileOwnerAttributeView.class);
      System.out.println(ownerView.name());
      System.out.println(ownerView.getOwner().getName().length() > 0);
      System.out.println(Files.getFileAttributeView(path, FileOwnerAttributeView.class, LinkOption.NOFOLLOW_LINKS)
          .name());
      FileOwnerAttributeView missingOwnerView =
          Files.getFileAttributeView(missingQuery, FileOwnerAttributeView.class);
      System.out.println(missingOwnerView != null);
      try {
        missingOwnerView.getOwner();
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        ownerView.setOwner(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getFileAttributeView((Path) null, FileOwnerAttributeView.class);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      System.out.println(Files.getAttribute(path, "owner:owner") instanceof UserPrincipal);
      System.out.println(Files.readAttributes(path, "owner:owner").containsKey("owner"));
      Map<String, Object> allOwnerAttributes = Files.readAttributes(path, "owner:*");
      System.out.println(allOwnerAttributes.size());
      System.out.println(allOwnerAttributes.containsKey("owner"));
      System.out.println(Files.setAttribute(path, "owner:owner", owner).equals(path));
      try {
        Files.setAttribute(path, "owner:owner", null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute(path, "owner:");
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute(path, "owner:nope");
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setAttribute(path, "owner:nope", owner);
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      Set<PosixFilePermission> initialPermissions = Files.getPosixFilePermissions(path);
      System.out.println(initialPermissions != null);
      initialPermissions.add(PosixFilePermission.OWNER_EXECUTE);
      System.out.println(initialPermissions.contains(PosixFilePermission.OWNER_EXECUTE));
      Set<PosixFilePermission> ownerReadWrite =
          EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE);
      System.out.println(Files.setPosixFilePermissions(path, ownerReadWrite).equals(path));
      Set<PosixFilePermission> updatedPermissions = Files.getPosixFilePermissions(path);
      System.out.println(updatedPermissions.contains(PosixFilePermission.OWNER_READ));
      System.out.println(updatedPermissions.contains(PosixFilePermission.OWNER_WRITE));
      System.out.println(updatedPermissions.contains(PosixFilePermission.OWNER_EXECUTE));
      System.out.println(Files.getPosixFilePermissions(path, LinkOption.NOFOLLOW_LINKS)
          .contains(PosixFilePermission.OWNER_READ));
      try {
        Files.getPosixFilePermissions(missingQuery);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getPosixFilePermissions(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getPosixFilePermissions(path, (LinkOption[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getPosixFilePermissions(path, new LinkOption[] { null });
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setPosixFilePermissions(null, ownerReadWrite);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setPosixFilePermissions(path, null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      HashSet<PosixFilePermission> badPermissions = new HashSet<PosixFilePermission>();
      badPermissions.add(null);
      try {
        Files.setPosixFilePermissions(path, badPermissions);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setPosixFilePermissions(missingQuery, ownerReadWrite);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      PosixFileAttributes posixAttributes = Files.readAttributes(path, PosixFileAttributes.class);
      System.out.println(posixAttributes.isRegularFile());
      System.out.println(posixAttributes.owner().getName().length() > 0);
      System.out.println(posixAttributes.group().getName().length() > 0);
      System.out.println(posixAttributes.permissions().contains(PosixFilePermission.OWNER_READ));
      PosixFileAttributeView posixView = Files.getFileAttributeView(path, PosixFileAttributeView.class);
      System.out.println(posixView.name());
      System.out.println(posixView.readAttributes().permissions().contains(PosixFilePermission.OWNER_READ));
      posixView.setPermissions(ownerReadWrite);
      System.out.println(posixView.readAttributes().permissions().contains(PosixFilePermission.OWNER_WRITE));
      System.out.println(Files.getFileAttributeView(path, PosixFileAttributeView.class, LinkOption.NOFOLLOW_LINKS).name());
      PosixFileAttributeView missingPosixView =
          Files.getFileAttributeView(missingQuery, PosixFileAttributeView.class);
      System.out.println(missingPosixView != null);
      try {
        missingPosixView.readAttributes();
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(missingQuery, PosixFileAttributes.class);
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readAttributes(path, PosixFileAttributes.class, (LinkOption[]) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        posixView.setPermissions(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        posixView.setOwner(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        posixView.setGroup(null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getFileAttributeView((Path) null, PosixFileAttributeView.class);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      System.out.println(Files.getAttribute(path, "posix:permissions") instanceof Set);
      System.out.println(((Set<?>) Files.getAttribute(path, "posix:permissions"))
          .contains(PosixFilePermission.OWNER_READ));
      System.out.println(((UserPrincipal) Files.getAttribute(path, "posix:owner")).getName().length() > 0);
      System.out.println(((GroupPrincipal) Files.getAttribute(path, "posix:group")).getName().length() > 0);
      Map<String, Object> selectedPosixAttributes =
          Files.readAttributes(path, "posix:permissions,owner,group,size");
      System.out.println(selectedPosixAttributes.containsKey("permissions"));
      System.out.println(selectedPosixAttributes.containsKey("owner"));
      System.out.println(selectedPosixAttributes.containsKey("group"));
      System.out.println(selectedPosixAttributes.containsKey("size"));
      Map<String, Object> allPosixAttributes = Files.readAttributes(path, "posix:*");
      System.out.println(allPosixAttributes.containsKey("permissions"));
      System.out.println(allPosixAttributes.containsKey("owner"));
      System.out.println(allPosixAttributes.containsKey("group"));
      System.out.println(allPosixAttributes.containsKey("size"));
      try {
        Files.getAttribute(path, "posix:");
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.getAttribute(path, "posix:nope");
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      System.out.println(Files.setAttribute(path, "posix:permissions", ownerReadWrite).equals(path));
      System.out.println(Files.getPosixFilePermissions(path).contains(PosixFilePermission.OWNER_WRITE));
      System.out.println(Files.setAttribute(path, "posix:owner", owner).equals(path));
      System.out.println(Files.setAttribute(path, "posix:group", posixAttributes.group()).equals(path));
      FileTime posixModifiedTime = FileTime.fromMillis(System.currentTimeMillis() - 2000L);
      System.out.println(Files.setAttribute(path, "posix:lastModifiedTime", posixModifiedTime).equals(path));
      System.out.println(Files.getLastModifiedTime(path).toMillis() == posixModifiedTime.toMillis());
      try {
        Files.setAttribute(path, "posix:permissions", null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setAttribute(path, "posix:owner", null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setAttribute(path, "posix:group", null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.setAttribute(path, "posix:nope", owner);
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }

      Path createRoot = Files.createTempDirectory("doppio-files-create");
      Path createdFile = createRoot.resolve("file.txt");
      Path createdDirectory = createRoot.resolve("dir");
      Path nestedDirectory = createRoot.resolve("a").resolve("b").resolve("c");
      Path parentFile = createRoot.resolve("parent-file");
      try {
        System.out.println(Files.createFile(createdFile).equals(createdFile));
        System.out.println(Files.exists(createdFile));
        try {
          Files.createFile(createdFile);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createFile(createRoot.resolve("missing-parent").resolve("file.txt"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.createDirectory(createdDirectory).equals(createdDirectory));
        System.out.println(Files.isDirectory(createdDirectory));
        try {
          Files.createDirectory(createdDirectory);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createDirectory(createRoot.resolve("missing-parent").resolve("dir"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.createDirectories(nestedDirectory).equals(nestedDirectory));
        System.out.println(Files.isDirectory(nestedDirectory));
        System.out.println(Files.createDirectories(nestedDirectory).equals(nestedDirectory));
        try {
          Files.createDirectories(createdFile);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(parentFile, "x");
        try {
          Files.createFile(parentFile.resolve("child.txt"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createDirectory(parentFile.resolve("child"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createDirectories(parentFile.resolve("child"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createFile(createRoot.resolve("attr-null"), (java.nio.file.attribute.FileAttribute<?>[]) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.createFile(
            createRoot.resolve("attr-null-element"),
            new java.nio.file.attribute.FileAttribute<?>[] { null }
          );
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(nestedDirectory);
        Files.deleteIfExists(nestedDirectory.getParent());
        Files.deleteIfExists(nestedDirectory.getParent().getParent());
        Files.deleteIfExists(parentFile);
        Files.deleteIfExists(createdDirectory);
        Files.deleteIfExists(createdFile);
        Files.deleteIfExists(createRoot);
      }

      Path channelRoot = Files.createTempDirectory("doppio-files-channel");
      Path channelPath = channelRoot.resolve("channel.txt");
      Path channelParentFile = channelRoot.resolve("parent-file");
      try {
        SeekableByteChannel writeChannel =
            Files.newByteChannel(channelPath, EnumSet.of(StandardOpenOption.CREATE, StandardOpenOption.WRITE));
        try {
          System.out.println(writeChannel.write(ByteBuffer.wrap(new byte[] { 65, 66 })));
          System.out.println(writeChannel.position());
        } finally {
          writeChannel.close();
        }
        SeekableByteChannel readChannel = Files.newByteChannel(channelPath, StandardOpenOption.READ);
        try {
          ByteBuffer buffer = ByteBuffer.allocate(3);
          int read = readChannel.read(buffer);
          System.out.println(read);
          System.out.println(Arrays.toString(Arrays.copyOf(buffer.array(), read)));
          System.out.println(readChannel.size());
        } finally {
          readChannel.close();
        }
        SeekableByteChannel appendChannel = Files.newByteChannel(channelPath, StandardOpenOption.APPEND);
        try {
          System.out.println(appendChannel.position());
          System.out.println(appendChannel.write(ByteBuffer.wrap(new byte[] { 67 })));
        } finally {
          appendChannel.close();
        }
        System.out.println(Files.readString(channelPath));
        try {
          Files.newByteChannel(channelRoot.resolve("missing-channel.txt"), StandardOpenOption.READ);
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(channelPath, (java.nio.file.OpenOption[]) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(channelPath, new java.nio.file.OpenOption[] { null });
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(channelPath, EnumSet.of(StandardOpenOption.READ, StandardOpenOption.APPEND));
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(
            channelPath,
            EnumSet.of(StandardOpenOption.APPEND, StandardOpenOption.TRUNCATE_EXISTING)
          );
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(channelPath, EnumSet.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE));
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(
            channelRoot.resolve("missing-channel-parent").resolve("created.txt"),
            EnumSet.of(StandardOpenOption.CREATE, StandardOpenOption.WRITE)
          );
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(channelParentFile, "parent");
        try {
          Files.newByteChannel(
            channelParentFile.resolve("created.txt"),
            EnumSet.of(StandardOpenOption.CREATE, StandardOpenOption.WRITE)
          );
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(channelParentFile.resolve("read.txt"), StandardOpenOption.READ);
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newByteChannel(channelParentFile.resolve("write.txt"), StandardOpenOption.WRITE);
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(channelParentFile);
        Files.deleteIfExists(channelPath);
        Files.deleteIfExists(channelRoot);
      }

      Path probeRoot = Files.createTempDirectory("doppio-files-probe");
      Path probeText = probeRoot.resolve("a.txt");
      Path probeHtml = probeRoot.resolve("b.html");
      Path probeBinary = probeRoot.resolve("c.bin");
      Path probeUnknown = probeRoot.resolve("d.unknownext");
      Path probeNoExtension = probeRoot.resolve("README");
      try {
        Files.writeString(probeText, "text");
        Files.writeString(probeHtml, "<html></html>");
        Files.write(probeBinary, new byte[] { 0, 1 });
        Files.writeString(probeUnknown, "unknown");
        Files.writeString(probeNoExtension, "readme");
        System.out.println(Files.probeContentType(probeText));
        System.out.println(Files.probeContentType(probeHtml));
        System.out.println(Files.probeContentType(probeBinary));
        System.out.println(Files.probeContentType(probeUnknown));
        System.out.println(Files.probeContentType(probeNoExtension));
        System.out.println(Files.probeContentType(probeRoot.resolve("missing.txt")));
        try {
          Files.probeContentType(null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(probeNoExtension);
        Files.deleteIfExists(probeUnknown);
        Files.deleteIfExists(probeBinary);
        Files.deleteIfExists(probeHtml);
        Files.deleteIfExists(probeText);
        Files.deleteIfExists(probeRoot);
      }

      Path copyRoot = Files.createTempDirectory("doppio-files-copy");
      Path copySource = copyRoot.resolve("source.txt");
      Path copyTarget = copyRoot.resolve("target.txt");
      Path copyAttrTarget = copyRoot.resolve("attr.txt");
      Path copyNoFollowTarget = copyRoot.resolve("nofollow.txt");
      Path copyStreamTarget = copyRoot.resolve("stream.txt");
      Path copyDirectorySource = copyRoot.resolve("source-dir");
      Path copyDirectoryChild = copyDirectorySource.resolve("child.txt");
      Path copyDirectoryTarget = copyRoot.resolve("target-dir");
      Path copyDirectoryExistingFile = copyRoot.resolve("existing-file");
      Path copyDirectoryExistingDirectory = copyRoot.resolve("existing-dir");
      Path copyDirectoryNonEmptyTarget = copyRoot.resolve("non-empty-dir");
      Path copyParentFile = copyRoot.resolve("parent-file");
      Path copyStreamEmptyDirectoryTarget = copyRoot.resolve("stream-empty-dir");
      Path copyStreamNonEmptyDirectoryTarget = copyRoot.resolve("stream-non-empty-dir");
      Path copyStreamParentFile = copyRoot.resolve("stream-parent-file");
      try {
        Files.writeString(copySource, "abc");
        System.out.println(Files.copy(copySource, copySource).equals(copySource));
        System.out.println(Files.readString(copySource));
        System.out.println(Files.copy(copySource, copySource, StandardCopyOption.REPLACE_EXISTING)
          .equals(copySource));
        System.out.println(Files.readString(copySource));
        System.out.println(Files.copy(copySource, copyTarget).equals(copyTarget));
        System.out.println(Files.readString(copyTarget));
        try {
          Files.copy(copySource, copyTarget);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.copy(copySource, copyTarget, StandardCopyOption.REPLACE_EXISTING)
          .equals(copyTarget));
        System.out.println(Files.readString(copyTarget));
        System.out.println(Files.copy(copySource, copyAttrTarget, StandardCopyOption.COPY_ATTRIBUTES)
          .equals(copyAttrTarget));
        System.out.println(Files.copy(copySource, copyNoFollowTarget, LinkOption.NOFOLLOW_LINKS)
          .equals(copyNoFollowTarget));
        Files.createDirectory(copyDirectorySource);
        Files.writeString(copyDirectoryChild, "child");
        System.out.println(Files.copy(copyDirectorySource, copyDirectorySource).equals(copyDirectorySource));
        System.out.println(Files.isDirectory(copyDirectorySource));
        System.out.println(Files.exists(copyDirectoryChild));
        System.out.println(Files.copy(copyDirectorySource, copyDirectoryTarget).equals(copyDirectoryTarget));
        System.out.println(Files.isDirectory(copyDirectoryTarget));
        System.out.println(Files.exists(copyDirectoryTarget.resolve("child.txt")));
        try {
          Files.copy(copyDirectorySource, copyDirectoryTarget);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(copyDirectoryExistingFile, "old");
        System.out.println(Files.copy(
          copyDirectorySource,
          copyDirectoryExistingFile,
          StandardCopyOption.REPLACE_EXISTING
        ).equals(copyDirectoryExistingFile));
        System.out.println(Files.isDirectory(copyDirectoryExistingFile));
        System.out.println(Files.exists(copyDirectoryExistingFile.resolve("child.txt")));
        Files.createDirectory(copyDirectoryExistingDirectory);
        System.out.println(Files.copy(
          copyDirectorySource,
          copyDirectoryExistingDirectory,
          StandardCopyOption.REPLACE_EXISTING
        ).equals(copyDirectoryExistingDirectory));
        System.out.println(Files.isDirectory(copyDirectoryExistingDirectory));
        Files.createDirectory(copyDirectoryNonEmptyTarget);
        Files.writeString(copyDirectoryNonEmptyTarget.resolve("old.txt"), "old");
        try {
          Files.copy(copyDirectorySource, copyDirectoryNonEmptyTarget, StandardCopyOption.REPLACE_EXISTING);
          System.out.println(false);
        } catch (DirectoryNotEmptyException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.copy(copySource, copyRoot.resolve("atomic.txt"), StandardCopyOption.ATOMIC_MOVE);
          System.out.println(false);
        } catch (UnsupportedOperationException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.copy(copySource, copyRoot.resolve("nullopt.txt"), new java.nio.file.CopyOption[] { null });
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.copy(copySource, copyRoot.resolve("missing-copy-parent").resolve("target.txt"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(copyParentFile, "parent");
        try {
          Files.copy(copySource, copyParentFile.resolve("target.txt"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.copy(copyDirectorySource, copyRoot.resolve("missing-copy-parent").resolve("target-dir"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.copy(copyDirectorySource, copyParentFile.resolve("target-dir"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.copy(new ByteArrayInputStream(new byte[] { 1, 2, 3 }), copyStreamTarget));
        System.out.println(Arrays.toString(Files.readAllBytes(copyStreamTarget)));
        try {
          Files.copy(new ByteArrayInputStream(new byte[] { 4 }), copyStreamTarget);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.copy(
          new ByteArrayInputStream(new byte[] { 4, 5 }),
          copyStreamTarget,
          StandardCopyOption.REPLACE_EXISTING
        ));
        System.out.println(Arrays.toString(Files.readAllBytes(copyStreamTarget)));
        Files.createDirectory(copyStreamEmptyDirectoryTarget);
        System.out.println(Files.copy(
          new ByteArrayInputStream(new byte[] { 6 }),
          copyStreamEmptyDirectoryTarget,
          StandardCopyOption.REPLACE_EXISTING
        ));
        System.out.println(Files.isRegularFile(copyStreamEmptyDirectoryTarget));
        System.out.println(Arrays.toString(Files.readAllBytes(copyStreamEmptyDirectoryTarget)));
        class CountingInputStream extends InputStream {
          int reads;

          public int read() {
            reads++;
            return reads == 1 ? 65 : -1;
          }
        }
        Files.createDirectory(copyStreamNonEmptyDirectoryTarget);
        Files.writeString(copyStreamNonEmptyDirectoryTarget.resolve("old.txt"), "old");
        CountingInputStream nonEmptyDirectoryInput = new CountingInputStream();
        try {
          Files.copy(nonEmptyDirectoryInput, copyStreamNonEmptyDirectoryTarget, StandardCopyOption.REPLACE_EXISTING);
          System.out.println(false);
        } catch (DirectoryNotEmptyException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(nonEmptyDirectoryInput.reads);
        System.out.println(Files.exists(copyStreamNonEmptyDirectoryTarget.resolve("old.txt")));
        CountingInputStream missingParentInput = new CountingInputStream();
        try {
          Files.copy(missingParentInput, copyRoot.resolve("missing-parent").resolve("target.txt"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(missingParentInput.reads);
        Files.writeString(copyStreamParentFile, "parent");
        CountingInputStream parentFileInput = new CountingInputStream();
        try {
          Files.copy(parentFileInput, copyStreamParentFile.resolve("target.txt"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(parentFileInput.reads);
        try {
          Files.copy((InputStream) null, copyRoot.resolve("nullstream.txt"));
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.copy(
            new ByteArrayInputStream(new byte[0]),
            copyRoot.resolve("stream-copyattrs.txt"),
            StandardCopyOption.COPY_ATTRIBUTES
          );
          System.out.println(false);
        } catch (UnsupportedOperationException e) {
          System.out.println(e.getClass().getName());
        }
        ByteArrayOutputStream copyOutput = new ByteArrayOutputStream();
        System.out.println(Files.copy(copySource, copyOutput));
        System.out.println(copyOutput.toString("UTF-8"));
        try {
          Files.copy(copyRoot.resolve("missing-output.txt"), new ByteArrayOutputStream());
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.copy(copySource, (OutputStream) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(copyDirectoryNonEmptyTarget.resolve("old.txt"));
        Files.deleteIfExists(copyDirectoryNonEmptyTarget);
        Files.deleteIfExists(copyStreamNonEmptyDirectoryTarget.resolve("old.txt"));
        Files.deleteIfExists(copyStreamNonEmptyDirectoryTarget);
        Files.deleteIfExists(copyStreamEmptyDirectoryTarget);
        Files.deleteIfExists(copyStreamParentFile);
        Files.deleteIfExists(copyParentFile);
        Files.deleteIfExists(copyDirectoryExistingDirectory);
        Files.deleteIfExists(copyDirectoryExistingFile);
        Files.deleteIfExists(copyDirectoryTarget);
        Files.deleteIfExists(copyDirectoryChild);
        Files.deleteIfExists(copyDirectorySource);
        Files.deleteIfExists(copyNoFollowTarget);
        Files.deleteIfExists(copyAttrTarget);
        Files.deleteIfExists(copyStreamTarget);
        Files.deleteIfExists(copyTarget);
        Files.deleteIfExists(copySource);
        Files.deleteIfExists(copyRoot);
      }

      Path moveRoot = Files.createTempDirectory("doppio-files-move");
      Path moveSource = moveRoot.resolve("source.txt");
      Path moveTarget = moveRoot.resolve("target.txt");
      Path moveExistingSource = moveRoot.resolve("existing-source.txt");
      Path moveExistingTarget = moveRoot.resolve("existing-target.txt");
      Path moveNoFollowSource = moveRoot.resolve("nofollow-source.txt");
      Path moveNoFollowTarget = moveRoot.resolve("nofollow-target.txt");
      Path moveAtomicSource = moveRoot.resolve("atomic-source.txt");
      Path moveAtomicTarget = moveRoot.resolve("atomic-target.txt");
      Path moveMissingParentSource = moveRoot.resolve("missing-parent-source.txt");
      Path moveParentFileSource = moveRoot.resolve("parent-file-source.txt");
      Path moveParentFile = moveRoot.resolve("parent-file");
      Path moveAtomicMissingParentSource = moveRoot.resolve("atomic-missing-parent-source.txt");
      Path moveAtomicParentFileSource = moveRoot.resolve("atomic-parent-file-source.txt");
      Path moveNullOptionSource = moveRoot.resolve("null-option-source.txt");
      Path moveCopyAttributesSource = moveRoot.resolve("copy-attributes-source.txt");
      Path moveDirectorySource = moveRoot.resolve("source-dir");
      Path moveDirectoryTarget = moveRoot.resolve("target-dir");
      Path moveDirectoryExistingFile = moveRoot.resolve("existing-file");
      Path moveDirectoryExistingDirectory = moveRoot.resolve("existing-dir");
      Path moveDirectoryNonEmptySource = moveRoot.resolve("non-empty-source-dir");
      Path moveDirectoryNonEmptyTarget = moveRoot.resolve("non-empty-target-dir");
      try {
        Files.writeString(moveSource, "move");
        System.out.println(Files.move(moveSource, moveTarget).equals(moveTarget));
        System.out.println(Files.exists(moveSource));
        System.out.println(Files.readString(moveTarget));
        System.out.println(Files.move(moveTarget, moveTarget).equals(moveTarget));
        System.out.println(Files.readString(moveTarget));
        Files.writeString(moveExistingSource, "new");
        Files.writeString(moveExistingTarget, "old");
        try {
          Files.move(moveExistingSource, moveExistingTarget);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.exists(moveExistingSource));
        System.out.println(Files.readString(moveExistingTarget));
        System.out.println(Files.move(
          moveExistingSource,
          moveExistingTarget,
          StandardCopyOption.REPLACE_EXISTING
        ).equals(moveExistingTarget));
        System.out.println(Files.exists(moveExistingSource));
        System.out.println(Files.readString(moveExistingTarget));
        Files.createDirectory(moveDirectorySource);
        Files.writeString(moveDirectorySource.resolve("child.txt"), "child");
        System.out.println(Files.move(moveDirectorySource, moveDirectoryTarget).equals(moveDirectoryTarget));
        System.out.println(Files.exists(moveDirectorySource));
        System.out.println(Files.isDirectory(moveDirectoryTarget));
        System.out.println(Files.readString(moveDirectoryTarget.resolve("child.txt")));
        Files.createDirectory(moveDirectorySource);
        Files.writeString(moveDirectorySource.resolve("child.txt"), "child2");
        Files.writeString(moveDirectoryExistingFile, "old");
        System.out.println(Files.move(
          moveDirectorySource,
          moveDirectoryExistingFile,
          StandardCopyOption.REPLACE_EXISTING
        ).equals(moveDirectoryExistingFile));
        System.out.println(Files.isDirectory(moveDirectoryExistingFile));
        System.out.println(Files.readString(moveDirectoryExistingFile.resolve("child.txt")));
        Files.createDirectory(moveDirectorySource);
        Files.writeString(moveDirectorySource.resolve("child.txt"), "child3");
        Files.createDirectory(moveDirectoryExistingDirectory);
        System.out.println(Files.move(
          moveDirectorySource,
          moveDirectoryExistingDirectory,
          StandardCopyOption.REPLACE_EXISTING
        ).equals(moveDirectoryExistingDirectory));
        System.out.println(Files.isDirectory(moveDirectoryExistingDirectory));
        System.out.println(Files.readString(moveDirectoryExistingDirectory.resolve("child.txt")));
        Files.createDirectory(moveDirectoryNonEmptySource);
        Files.writeString(moveDirectoryNonEmptySource.resolve("child.txt"), "child4");
        Files.createDirectory(moveDirectoryNonEmptyTarget);
        Files.writeString(moveDirectoryNonEmptyTarget.resolve("old.txt"), "old");
        try {
          Files.move(
            moveDirectoryNonEmptySource,
            moveDirectoryNonEmptyTarget,
            StandardCopyOption.REPLACE_EXISTING
          );
          System.out.println(false);
        } catch (DirectoryNotEmptyException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.exists(moveDirectoryNonEmptySource));
        Files.writeString(moveNoFollowSource, "nofollow");
        System.out.println(Files.move(
          moveNoFollowSource,
          moveNoFollowTarget,
          LinkOption.NOFOLLOW_LINKS
        ).equals(moveNoFollowTarget));
        System.out.println(Files.readString(moveNoFollowTarget));
        Files.writeString(moveAtomicSource, "atomic-new");
        Files.writeString(moveAtomicTarget, "atomic-old");
        System.out.println(Files.move(
          moveAtomicSource,
          moveAtomicTarget,
          StandardCopyOption.ATOMIC_MOVE
        ).equals(moveAtomicTarget));
        System.out.println(Files.exists(moveAtomicSource));
        System.out.println(Files.readString(moveAtomicTarget));
        try {
          Files.move(moveRoot.resolve("missing.txt"), moveRoot.resolve("missing-target.txt"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(moveMissingParentSource, "missing-parent");
        try {
          Files.move(moveMissingParentSource, moveRoot.resolve("missing-move-parent").resolve("target.txt"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.exists(moveMissingParentSource));
        Files.writeString(moveParentFileSource, "parent-file");
        Files.writeString(moveParentFile, "parent");
        try {
          Files.move(moveParentFileSource, moveParentFile.resolve("target.txt"));
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.exists(moveParentFileSource));
        Files.writeString(moveAtomicMissingParentSource, "atomic-missing-parent");
        try {
          Files.move(
            moveAtomicMissingParentSource,
            moveRoot.resolve("missing-atomic-move-parent").resolve("target.txt"),
            StandardCopyOption.ATOMIC_MOVE
          );
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.exists(moveAtomicMissingParentSource));
        Files.writeString(moveAtomicParentFileSource, "atomic-parent-file");
        try {
          Files.move(
            moveAtomicParentFileSource,
            moveParentFile.resolve("atomic-target.txt"),
            StandardCopyOption.ATOMIC_MOVE
          );
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.exists(moveAtomicParentFileSource));
        Files.writeString(moveNullOptionSource, "null-option");
        try {
          Files.move(
            moveNullOptionSource,
            moveRoot.resolve("null-option-target.txt"),
            new java.nio.file.CopyOption[] { null }
          );
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(moveCopyAttributesSource, "copy-attributes");
        try {
          Files.move(
            moveCopyAttributesSource,
            moveRoot.resolve("copy-attributes-target.txt"),
            StandardCopyOption.COPY_ATTRIBUTES
          );
          System.out.println(false);
        } catch (UnsupportedOperationException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(moveDirectoryNonEmptyTarget.resolve("old.txt"));
        Files.deleteIfExists(moveDirectoryNonEmptyTarget);
        Files.deleteIfExists(moveDirectoryNonEmptySource.resolve("child.txt"));
        Files.deleteIfExists(moveDirectoryNonEmptySource);
        Files.deleteIfExists(moveDirectoryExistingDirectory.resolve("child.txt"));
        Files.deleteIfExists(moveDirectoryExistingDirectory);
        Files.deleteIfExists(moveDirectoryExistingFile.resolve("child.txt"));
        Files.deleteIfExists(moveDirectoryExistingFile);
        Files.deleteIfExists(moveDirectoryTarget.resolve("child.txt"));
        Files.deleteIfExists(moveDirectoryTarget);
        Files.deleteIfExists(moveDirectorySource.resolve("child.txt"));
        Files.deleteIfExists(moveDirectorySource);
        Files.deleteIfExists(moveCopyAttributesSource);
        Files.deleteIfExists(moveNullOptionSource);
        Files.deleteIfExists(moveAtomicParentFileSource);
        Files.deleteIfExists(moveAtomicMissingParentSource);
        Files.deleteIfExists(moveParentFile);
        Files.deleteIfExists(moveParentFileSource);
        Files.deleteIfExists(moveMissingParentSource);
        Files.deleteIfExists(moveAtomicTarget);
        Files.deleteIfExists(moveAtomicSource);
        Files.deleteIfExists(moveNoFollowTarget);
        Files.deleteIfExists(moveNoFollowSource);
        Files.deleteIfExists(moveExistingTarget);
        Files.deleteIfExists(moveExistingSource);
        Files.deleteIfExists(moveTarget);
        Files.deleteIfExists(moveSource);
        Files.deleteIfExists(moveRoot);
      }

      Path timeRoot = Files.createTempDirectory("doppio-files-time");
      Path timePath = timeRoot.resolve("time.txt");
      FileTime fixedTime = FileTime.fromMillis(123456789L);
      FileTime attributeTime = FileTime.fromMillis(987654321L);
      try {
        Files.writeString(timePath, "time");
        System.out.println(Files.getLastModifiedTime(timePath).toMillis() > 0);
        System.out.println(Files.setLastModifiedTime(timePath, fixedTime).equals(timePath));
        System.out.println(Files.getLastModifiedTime(timePath).toMillis());
        System.out.println(Files.getLastModifiedTime(timePath, LinkOption.NOFOLLOW_LINKS).toMillis());
        System.out.println(Files.setAttribute(timePath, "basic:lastModifiedTime", attributeTime).equals(timePath));
        System.out.println(Files.getLastModifiedTime(timePath).toMillis());
        System.out.println(Files.setAttribute(timePath, "lastModifiedTime", fixedTime).equals(timePath));
        System.out.println(Files.getLastModifiedTime(timePath).toMillis());
        try {
          Files.getLastModifiedTime(timeRoot.resolve("missing-time.txt"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setLastModifiedTime(timeRoot.resolve("missing-set-time.txt"), fixedTime);
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute(timeRoot.resolve("missing-set-attribute.txt"), "lastModifiedTime", fixedTime);
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute(timePath, "basic:size", Long.valueOf(1L));
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute(timePath, "basic:missing", fixedTime);
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute((Path) null, "lastModifiedTime", fixedTime);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute(timePath, null, fixedTime);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute(timePath, "lastModifiedTime", "bad");
          System.out.println(false);
        } catch (ClassCastException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute(timePath, "lastModifiedTime", fixedTime, (LinkOption[]) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setAttribute(timePath, "lastModifiedTime", fixedTime, new LinkOption[] { null });
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.getLastModifiedTime((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.getLastModifiedTime(timePath, (LinkOption[]) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.getLastModifiedTime(timePath, new LinkOption[] { null });
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.setLastModifiedTime(timePath, null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(timePath);
        Files.deleteIfExists(timeRoot);
      }

      Path streamRoot = Files.createTempDirectory("doppio-files-streams");
      Path streamFileA = streamRoot.resolve("a.txt");
      Path streamFileB = streamRoot.resolve("b.txt");
      Path streamDirectory = streamRoot.resolve("dir");
      Path streamLinesPath = streamRoot.resolve("lines.txt");
      Path streamLatinPath = streamRoot.resolve("latin.txt");
      try {
        Files.writeString(streamFileB, "b");
        Files.writeString(streamFileA, "a");
        Files.createDirectory(streamDirectory);
        Stream<Path> listed = Files.list(streamRoot);
        try {
          String[] names = listed.map(p -> p.getFileName().toString()).toArray(String[]::new);
          Arrays.sort(names);
          System.out.println(Arrays.toString(names));
        } finally {
          listed.close();
        }
        try {
          Files.list(streamRoot.resolve("missing-list"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.list(streamFileA);
          System.out.println(false);
        } catch (NotDirectoryException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.list((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(streamLinesPath, "one\ntwo\n");
        Stream<String> lines = Files.lines(streamLinesPath);
        try {
          System.out.println(lines.collect(Collectors.joining("|")));
        } finally {
          lines.close();
        }
        Files.write(streamLatinPath, new byte[] { (byte) 0xe9 });
        Stream<String> latinLines = Files.lines(streamLatinPath, StandardCharsets.ISO_8859_1);
        try {
          System.out.println(latinLines.collect(Collectors.joining("|")));
        } finally {
          latinLines.close();
        }
        try {
          Files.lines(streamRoot.resolve("missing-lines"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.lines((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.lines(streamLinesPath, null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(streamLatinPath);
        Files.deleteIfExists(streamLinesPath);
        Files.deleteIfExists(streamDirectory);
        Files.deleteIfExists(streamFileB);
        Files.deleteIfExists(streamFileA);
        Files.deleteIfExists(streamRoot);
      }

      Path directoryStreamRoot = Files.createTempDirectory("doppio-files-directory-stream");
      Path directoryStreamText = directoryStreamRoot.resolve("a.txt");
      Path directoryStreamBinary = directoryStreamRoot.resolve("b.bin");
      Path directoryStreamDirectory = directoryStreamRoot.resolve("dir");
      Path directoryStreamLiteralBracket = directoryStreamRoot.resolve("literal[1].txt");
      Path directoryStreamLiteralStar = directoryStreamRoot.resolve("*.txt");
      Path directoryStreamLiteralQuestion = directoryStreamRoot.resolve("?.txt");
      Path directoryStreamJava = directoryStreamRoot.resolve("q.java");
      try {
        Files.writeString(directoryStreamText, "a");
        Files.writeString(directoryStreamBinary, "b");
        Files.createDirectory(directoryStreamDirectory);
        Files.writeString(directoryStreamLiteralBracket, "bracket");
        Files.writeString(directoryStreamLiteralStar, "star");
        Files.writeString(directoryStreamLiteralQuestion, "question");
        Files.writeString(directoryStreamJava, "java");
        DirectoryStream<Path> directoryStream = Files.newDirectoryStream(directoryStreamRoot);
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : directoryStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          directoryStream.close();
        }
        DirectoryStream<Path> globStream = Files.newDirectoryStream(directoryStreamRoot, "*.txt");
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : globStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          globStream.close();
        }
        DirectoryStream<Path> braceGlobStream = Files.newDirectoryStream(directoryStreamRoot, "*.{txt,bin}");
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : braceGlobStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          braceGlobStream.close();
        }
        DirectoryStream<Path> classGlobStream = Files.newDirectoryStream(directoryStreamRoot, "[ab].???");
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : classGlobStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          classGlobStream.close();
        }
        DirectoryStream<Path> negatedClassGlobStream = Files.newDirectoryStream(directoryStreamRoot, "[!a].bin");
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : negatedClassGlobStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          negatedClassGlobStream.close();
        }
        DirectoryStream<Path> literalBracketGlobStream =
            Files.newDirectoryStream(directoryStreamRoot, "literal[[]1].txt");
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : literalBracketGlobStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          literalBracketGlobStream.close();
        }
        DirectoryStream<Path> escapedStarGlobStream = Files.newDirectoryStream(directoryStreamRoot, "\\*.txt");
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : escapedStarGlobStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          escapedStarGlobStream.close();
        }
        DirectoryStream<Path> escapedQuestionGlobStream = Files.newDirectoryStream(directoryStreamRoot, "\\?.txt");
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : escapedQuestionGlobStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          escapedQuestionGlobStream.close();
        }
        DirectoryStream<Path> filteredStream =
            Files.newDirectoryStream(directoryStreamRoot, entry -> Files.isDirectory(entry));
        try {
          ArrayList<String> names = new ArrayList<String>();
          for (Path entry : filteredStream) {
            names.add(entry.getFileName().toString());
          }
          Collections.sort(names);
          System.out.println(names);
        } finally {
          filteredStream.close();
        }
        DirectoryStream<Path> ioThrowingFilterStream =
            Files.newDirectoryStream(directoryStreamRoot, entry -> { throw new IOException("filter"); });
        try {
          System.out.println("filter-io-created");
          try {
            ioThrowingFilterStream.iterator().hasNext();
            System.out.println(false);
          } catch (DirectoryIteratorException e) {
            System.out.println(e.getClass().getName());
            System.out.println(e.getCause().getClass().getName());
          }
        } finally {
          ioThrowingFilterStream.close();
        }
        DirectoryStream<Path> closeBeforeFilterStream =
            Files.newDirectoryStream(directoryStreamRoot, entry -> { throw new IOException("filter"); });
        try {
          closeBeforeFilterStream.close();
          System.out.println("filter-close-before-iterate");
        } finally {
          closeBeforeFilterStream.close();
        }
        DirectoryStream<Path> runtimeThrowingFilterStream =
            Files.newDirectoryStream(directoryStreamRoot, entry -> { throw new RuntimeException("filter"); });
        try {
          System.out.println("filter-runtime-created");
          try {
            runtimeThrowingFilterStream.iterator().hasNext();
            System.out.println(false);
          } catch (RuntimeException e) {
            System.out.println(e.getClass().getName());
          }
        } finally {
          runtimeThrowingFilterStream.close();
        }
        DirectoryStream<Path> singleIteratorStream = Files.newDirectoryStream(directoryStreamRoot);
        try {
          Iterator<Path> iterator = singleIteratorStream.iterator();
          System.out.println(iterator.hasNext());
          try {
            iterator.remove();
            System.out.println(false);
          } catch (UnsupportedOperationException e) {
            System.out.println(e.getClass().getName());
          }
          System.out.println(iterator.next().getFileName().toString().length() > 0);
          try {
            iterator.remove();
            System.out.println(false);
          } catch (UnsupportedOperationException e) {
            System.out.println(e.getClass().getName());
          }
          try {
            singleIteratorStream.iterator();
            System.out.println(false);
          } catch (IllegalStateException e) {
            System.out.println(e.getClass().getName());
          }
          singleIteratorStream.close();
          System.out.println(iterator.hasNext());
          try {
            iterator.next();
            System.out.println(false);
          } catch (NoSuchElementException e) {
            System.out.println(e.getClass().getName());
          }
          try {
            singleIteratorStream.iterator();
            System.out.println(false);
          } catch (IllegalStateException e) {
            System.out.println(e.getClass().getName());
          }
          singleIteratorStream.close();
          System.out.println("close-twice");
        } finally {
          singleIteratorStream.close();
        }
        try {
          Files.newDirectoryStream(directoryStreamRoot.resolve("missing-directory-stream"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newDirectoryStream(directoryStreamText);
          System.out.println(false);
        } catch (NotDirectoryException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newDirectoryStream((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newDirectoryStream(directoryStreamRoot, (String) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newDirectoryStream(directoryStreamRoot, (DirectoryStream.Filter<? super Path>) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newDirectoryStream(directoryStreamRoot, "*.{");
          System.out.println(false);
        } catch (PatternSyntaxException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newDirectoryStream(directoryStreamRoot, "[");
          System.out.println(false);
        } catch (PatternSyntaxException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(directoryStreamJava);
        Files.deleteIfExists(directoryStreamLiteralQuestion);
        Files.deleteIfExists(directoryStreamLiteralStar);
        Files.deleteIfExists(directoryStreamLiteralBracket);
        Files.deleteIfExists(directoryStreamDirectory);
        Files.deleteIfExists(directoryStreamBinary);
        Files.deleteIfExists(directoryStreamText);
        Files.deleteIfExists(directoryStreamRoot);
      }

      Path walkRoot = Files.createTempDirectory("doppio-files-walk");
      Path walkFile = walkRoot.resolve("a.txt");
      Path walkDirectory = walkRoot.resolve("dir");
      Path walkNestedFile = walkDirectory.resolve("nested.txt");
      try {
        Files.writeString(walkFile, "a");
        Files.createDirectory(walkDirectory);
        Files.writeString(walkNestedFile, "nested");
        Stream<Path> walked = Files.walk(walkRoot);
        try {
          String[] names = walked.map(p -> relativeName(walkRoot, p)).toArray(String[]::new);
          Arrays.sort(names);
          System.out.println(Arrays.toString(names));
        } finally {
          walked.close();
        }
        Stream<Path> walkedOne = Files.walk(walkRoot, 1);
        try {
          String[] names = walkedOne.map(p -> relativeName(walkRoot, p)).toArray(String[]::new);
          Arrays.sort(names);
          System.out.println(Arrays.toString(names));
        } finally {
          walkedOne.close();
        }
        Stream<Path> walkedFile = Files.walk(walkFile);
        try {
          String[] names = walkedFile.map(p -> p.getFileName().toString()).toArray(String[]::new);
          Arrays.sort(names);
          System.out.println(Arrays.toString(names));
        } finally {
          walkedFile.close();
        }
        Stream<Path> followed = Files.walk(walkRoot, 2, FileVisitOption.FOLLOW_LINKS);
        try {
          System.out.println(followed.count());
        } finally {
          followed.close();
        }
        try {
          Files.walk(walkRoot.resolve("missing-walk"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walk(walkRoot, -1);
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walk((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walk(walkRoot, 1, (FileVisitOption[]) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walk(walkRoot, 1, new FileVisitOption[] { null });
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        Stream<Path> foundFiles = Files.find(
          walkRoot,
          2,
          (p, attrs) -> attrs.isRegularFile() && p.getFileName().toString().endsWith(".txt")
        );
        try {
          String[] names = foundFiles.map(p -> relativeName(walkRoot, p)).toArray(String[]::new);
          Arrays.sort(names);
          System.out.println(Arrays.toString(names));
        } finally {
          foundFiles.close();
        }
        Stream<Path> foundDirectories = Files.find(walkRoot, 1, (p, attrs) -> attrs.isDirectory());
        try {
          String[] names = foundDirectories.map(p -> relativeName(walkRoot, p)).toArray(String[]::new);
          Arrays.sort(names);
          System.out.println(Arrays.toString(names));
        } finally {
          foundDirectories.close();
        }
        Stream<Path> nullMatcher = Files.find(walkRoot, 1, null);
        System.out.println("find-null-created");
        try {
          nullMatcher.count();
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        } finally {
          nullMatcher.close();
        }
        try {
          Files.find(walkRoot, -1, (p, attrs) -> true);
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.find(walkRoot.resolve("missing-find"), 1, (p, attrs) -> true);
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        ArrayList<String> walkFileTreeEvents = new ArrayList<String>();
        Path returnedWalkFileTree = Files.walkFileTree(walkRoot, new SimpleFileVisitor<Path>() {
          @Override
          public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
            walkFileTreeEvents.add("pre:" + relativeName(walkRoot, dir) + ":" + attrs.isDirectory());
            return FileVisitResult.CONTINUE;
          }

          @Override
          public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
            walkFileTreeEvents.add("file:" + relativeName(walkRoot, file) + ":" + attrs.isRegularFile());
            return FileVisitResult.CONTINUE;
          }

          @Override
          public FileVisitResult postVisitDirectory(Path dir, IOException exc) {
            walkFileTreeEvents.add("post:" + relativeName(walkRoot, dir) + ":" + (exc == null));
            return FileVisitResult.CONTINUE;
          }
        });
        Collections.sort(walkFileTreeEvents);
        System.out.println(returnedWalkFileTree.equals(walkRoot));
        System.out.println(walkFileTreeEvents);
        walkFileTreeEvents.clear();
        Files.walkFileTree(walkRoot, new SimpleFileVisitor<Path>() {
          @Override
          public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
            String name = relativeName(walkRoot, dir);
            walkFileTreeEvents.add("pre:" + name);
            return name.equals("dir") ? FileVisitResult.SKIP_SUBTREE : FileVisitResult.CONTINUE;
          }

          @Override
          public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
            walkFileTreeEvents.add("file:" + relativeName(walkRoot, file));
            return FileVisitResult.CONTINUE;
          }

          @Override
          public FileVisitResult postVisitDirectory(Path dir, IOException exc) {
            walkFileTreeEvents.add("post:" + relativeName(walkRoot, dir));
            return FileVisitResult.CONTINUE;
          }
        });
        Collections.sort(walkFileTreeEvents);
        System.out.println(walkFileTreeEvents);
        try {
          Files.walkFileTree(walkRoot.resolve("missing-walk-file-tree"), new SimpleFileVisitor<Path>() {});
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walkFileTree(walkRoot, (FileVisitor<Path>) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walkFileTree(walkRoot, Collections.<FileVisitOption>emptySet(), -1, new SimpleFileVisitor<Path>() {});
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walkFileTree(walkRoot, null, 1, new SimpleFileVisitor<Path>() {});
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walkFileTree(
            walkRoot,
            Collections.<FileVisitOption>singleton(null),
            1,
            new SimpleFileVisitor<Path>() {}
          );
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.walkFileTree((Path) null, new SimpleFileVisitor<Path>() {});
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        walkFileTreeEvents.clear();
        Files.walkFileTree(walkRoot, Collections.<FileVisitOption>emptySet(), 0, new SimpleFileVisitor<Path>() {
          @Override
          public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
            walkFileTreeEvents.add("pre");
            return FileVisitResult.CONTINUE;
          }

          @Override
          public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
            walkFileTreeEvents.add("visit-root:" + file.equals(walkRoot) + ":" + attrs.isDirectory());
            return FileVisitResult.CONTINUE;
          }

          @Override
          public FileVisitResult postVisitDirectory(Path dir, IOException exc) {
            walkFileTreeEvents.add("post");
            return FileVisitResult.CONTINUE;
          }
        });
        System.out.println(walkFileTreeEvents);
        walkFileTreeEvents.clear();
        Files.walkFileTree(walkRoot, new SimpleFileVisitor<Path>() {
          @Override
          public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
            walkFileTreeEvents.add("pre:" + relativeName(walkRoot, dir));
            return FileVisitResult.TERMINATE;
          }

          @Override
          public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
            walkFileTreeEvents.add("file");
            return FileVisitResult.CONTINUE;
          }

          @Override
          public FileVisitResult postVisitDirectory(Path dir, IOException exc) {
            walkFileTreeEvents.add("post");
            return FileVisitResult.CONTINUE;
          }
        });
        System.out.println(walkFileTreeEvents);
        try {
          Files.walkFileTree(walkRoot, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
              return null;
            }
          });
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(walkNestedFile);
        Files.deleteIfExists(walkDirectory);
        Files.deleteIfExists(walkFile);
        Files.deleteIfExists(walkRoot);
      }

      Path lineRoot = Files.createTempDirectory("doppio-files-lines");
      Path linesPath = lineRoot.resolve("lines.txt");
      Path latinLinesPath = lineRoot.resolve("latin.txt");
      Path lineParentFile = lineRoot.resolve("parent-file");
      try {
        System.out.println(Files.write(linesPath, Arrays.asList("one", "two")).equals(linesPath));
        System.out.println(Files.readString(linesPath).replace("\r", "R").replace("\n", "N"));
        System.out.println(Files.readAllLines(linesPath));
        System.out.println(Files.write(
          latinLinesPath,
          Arrays.asList("\u00e9"),
          StandardCharsets.ISO_8859_1
        ).equals(latinLinesPath));
        System.out.println(Files.readAllLines(latinLinesPath, StandardCharsets.ISO_8859_1));
        Files.write(linesPath, Arrays.asList("three"), StandardOpenOption.APPEND);
        System.out.println(Files.readAllLines(linesPath));
        Files.write(linesPath, Arrays.asList("ok", null));
        System.out.println(Files.readAllLines(linesPath));
        try {
          Files.readAllLines((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.readAllLines(linesPath, null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.write(linesPath, (Iterable<? extends CharSequence>) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.write(linesPath, Arrays.asList("x"), (java.nio.charset.Charset) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        class CountingLines implements Iterable<CharSequence> {
          int count;

          public Iterator<CharSequence> iterator() {
            return new Iterator<CharSequence>() {
              private boolean used;

              public boolean hasNext() {
                return !used;
              }

              public CharSequence next() {
                used = true;
                count++;
                return "side";
              }
            };
          }
        }
        CountingLines nullCharsetLines = new CountingLines();
        try {
          Files.write(linesPath, nullCharsetLines, (java.nio.charset.Charset) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(nullCharsetLines.count);
        CountingLines nullOptionsLines = new CountingLines();
        try {
          Files.write(linesPath, nullOptionsLines, StandardCharsets.UTF_8, (java.nio.file.OpenOption[]) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(nullOptionsLines.count);
        CountingLines nullOptionElementLines = new CountingLines();
        try {
          Files.write(
            linesPath,
            nullOptionElementLines,
            StandardCharsets.UTF_8,
            new java.nio.file.OpenOption[] { null }
          );
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(nullOptionElementLines.count);
        CountingLines readOptionLines = new CountingLines();
        try {
          Files.write(linesPath, readOptionLines, StandardCharsets.UTF_8, StandardOpenOption.READ);
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(readOptionLines.count);
        CountingLines appendTruncateLines = new CountingLines();
        try {
          Files.write(
            linesPath,
            appendTruncateLines,
            StandardCharsets.UTF_8,
            StandardOpenOption.APPEND,
            StandardOpenOption.TRUNCATE_EXISTING
          );
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(appendTruncateLines.count);
        CountingLines missingParentLines = new CountingLines();
        try {
          Files.write(lineRoot.resolve("missing-lines-parent").resolve("target.txt"), missingParentLines);
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(missingParentLines.count);
        Files.writeString(lineParentFile, "parent");
        CountingLines parentFileLines = new CountingLines();
        try {
          Files.write(lineParentFile.resolve("target.txt"), parentFileLines);
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(parentFileLines.count);
      } finally {
        Files.deleteIfExists(lineParentFile);
        Files.deleteIfExists(latinLinesPath);
        Files.deleteIfExists(linesPath);
        Files.deleteIfExists(lineRoot);
      }

      Path bufferedRoot = Files.createTempDirectory("doppio-files-buffered");
      Path bufferedPath = bufferedRoot.resolve("buffered.txt");
      Path bufferedLatin = bufferedRoot.resolve("latin.txt");
      Path bufferedParentFile = bufferedRoot.resolve("parent-file");
      try {
        BufferedWriter bufferedWriter = Files.newBufferedWriter(bufferedPath);
        bufferedWriter.write("alpha");
        bufferedWriter.newLine();
        bufferedWriter.write("beta");
        bufferedWriter.close();
        BufferedReader bufferedReader = Files.newBufferedReader(bufferedPath);
        try {
          System.out.println(bufferedReader.readLine());
          System.out.println(bufferedReader.readLine());
          System.out.println(bufferedReader.readLine());
        } finally {
          bufferedReader.close();
        }
        BufferedWriter appendWriter =
            Files.newBufferedWriter(bufferedPath, StandardCharsets.UTF_8, StandardOpenOption.APPEND);
        appendWriter.write("gamma");
        appendWriter.close();
        System.out.println(Files.readString(bufferedPath).replace("\r", "R").replace("\n", "N"));
        BufferedWriter latinWriter = Files.newBufferedWriter(bufferedLatin, StandardCharsets.ISO_8859_1);
        latinWriter.write("\u00e9");
        latinWriter.close();
        BufferedReader latinReader = Files.newBufferedReader(bufferedLatin, StandardCharsets.ISO_8859_1);
        try {
          System.out.println(latinReader.readLine());
        } finally {
          latinReader.close();
        }
        try {
          Files.newBufferedReader((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newBufferedReader(bufferedPath, null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newBufferedWriter(null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newBufferedWriter(bufferedPath, (java.nio.charset.Charset) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newBufferedWriter(bufferedPath, StandardCharsets.UTF_8, StandardOpenOption.READ);
          System.out.println(false);
        } catch (IllegalArgumentException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newBufferedWriter(bufferedRoot.resolve("missing-buffered-parent").resolve("out.txt")).close();
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        Files.writeString(bufferedParentFile, "parent");
        try {
          Files.newBufferedWriter(bufferedParentFile.resolve("out.txt")).close();
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newOutputStream(bufferedRoot.resolve("missing-output-parent").resolve("out.txt")).close();
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.newOutputStream(bufferedParentFile.resolve("out.txt")).close();
          System.out.println(false);
        } catch (FileSystemException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(bufferedParentFile);
        Files.deleteIfExists(bufferedLatin);
        Files.deleteIfExists(bufferedPath);
        Files.deleteIfExists(bufferedRoot);
      }

      Path deleteOutput = path.getParent().resolve(path.getFileName().toString() + ".delete-output");
      Files.writeString(deleteOutput, "old");
      OutputStream deleteOutputStream = Files.newOutputStream(
        deleteOutput,
        StandardOpenOption.WRITE,
        StandardOpenOption.DELETE_ON_CLOSE
      );
      try {
        System.out.println(Files.deleteIfExists(deleteOutput));
        deleteOutputStream.write("new".getBytes(StandardCharsets.UTF_8));
      } finally {
        deleteOutputStream.close();
      }
      System.out.println(Files.deleteIfExists(deleteOutput));

      Path deleteCreated = path.getParent().resolve(path.getFileName().toString() + ".delete-created");
      OutputStream deleteCreatedStream = Files.newOutputStream(
        deleteCreated,
        StandardOpenOption.CREATE,
        StandardOpenOption.WRITE,
        StandardOpenOption.DELETE_ON_CLOSE
      );
      try {
        System.out.println(Files.deleteIfExists(deleteCreated));
        deleteCreatedStream.write(65);
      } finally {
        deleteCreatedStream.close();
      }
      System.out.println(Files.deleteIfExists(deleteCreated));

      Path deleteInput = path.getParent().resolve(path.getFileName().toString() + ".delete-input");
      Files.writeString(deleteInput, "input");
      InputStream deleteInputStream = Files.newInputStream(deleteInput, StandardOpenOption.DELETE_ON_CLOSE);
      try {
        System.out.println(Files.deleteIfExists(deleteInput));
        System.out.println(deleteInputStream.read());
      } finally {
        deleteInputStream.close();
      }
      System.out.println(Files.deleteIfExists(deleteInput));

      try {
        Files.newOutputStream(
          path.getParent().resolve(path.getFileName().toString() + ".missing-delete-output"),
          StandardOpenOption.DELETE_ON_CLOSE
        ).close();
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.newInputStream(
          path.getParent().resolve(path.getFileName().toString() + ".missing-delete-input"),
          StandardOpenOption.DELETE_ON_CLOSE
        ).close();
        System.out.println(false);
      } catch (NoSuchFileException e) {
        System.out.println(e.getClass().getName());
      }

      Path deleteRoot = Files.createTempDirectory("doppio-files-delete");
      Path deleteFile = deleteRoot.resolve("file.txt");
      Path deleteEmptyDirectory = deleteRoot.resolve("empty");
      Path deleteNonEmptyDirectory = deleteRoot.resolve("non-empty");
      Path deleteChild = deleteNonEmptyDirectory.resolve("child.txt");
      try {
        Files.writeString(deleteFile, "delete");
        Files.createDirectory(deleteEmptyDirectory);
        Files.createDirectory(deleteNonEmptyDirectory);
        Files.writeString(deleteChild, "child");
        Files.delete(deleteFile);
        System.out.println(Files.exists(deleteFile));
        System.out.println(Files.deleteIfExists(deleteFile));
        Files.delete(deleteEmptyDirectory);
        System.out.println(Files.exists(deleteEmptyDirectory));
        try {
          Files.delete(deleteNonEmptyDirectory);
          System.out.println(false);
        } catch (DirectoryNotEmptyException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.exists(deleteChild));
        try {
          Files.deleteIfExists(deleteNonEmptyDirectory);
          System.out.println(false);
        } catch (DirectoryNotEmptyException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.deleteIfExists(deleteChild));
        System.out.println(Files.deleteIfExists(deleteNonEmptyDirectory));
        try {
          Files.delete(deleteRoot.resolve("missing-delete"));
          System.out.println(false);
        } catch (NoSuchFileException e) {
          System.out.println(e.getClass().getName());
        }
        System.out.println(Files.deleteIfExists(deleteRoot.resolve("missing-delete")));
        try {
          Files.delete((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
        try {
          Files.deleteIfExists((Path) null);
          System.out.println(false);
        } catch (NullPointerException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(deleteChild);
        Files.deleteIfExists(deleteNonEmptyDirectory);
        Files.deleteIfExists(deleteEmptyDirectory);
        Files.deleteIfExists(deleteFile);
        Files.deleteIfExists(deleteRoot);
      }

      Path utf16 = Files.createTempFile("doppio-files-utf16", ".txt");
      try {
        Files.writeString(utf16, "wide", StandardCharsets.UTF_16LE);
        System.out.println(Files.readString(utf16, StandardCharsets.UTF_16LE));
        System.out.println(Files.readAllBytes(utf16).length);
      } finally {
        System.out.println(Files.deleteIfExists(utf16));
        System.out.println(Files.deleteIfExists(utf16));
      }

      Path created = path.getParent().resolve(path.getFileName().toString() + ".new");
      try {
        Files.writeString(created, "created", StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        System.out.println(Files.readString(created));
        try {
          Files.writeString(created, "again", StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
          System.out.println(false);
        } catch (FileAlreadyExistsException e) {
          System.out.println(e.getClass().getName());
        }
      } finally {
        Files.deleteIfExists(created);
      }

      try {
        Files.readString((Path) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.readString(path, null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.writeString(null, "x");
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.writeString(path, null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      try {
        Files.writeString(path, "x", (java.nio.charset.Charset) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      class CountingCharSequence implements CharSequence {
        int count;

        public int length() {
          count++;
          return 1;
        }

        public char charAt(int index) {
          count++;
          return 'x';
        }

        public CharSequence subSequence(int start, int end) {
          count++;
          return "x";
        }

        public String toString() {
          count++;
          return "x";
        }
      }
      CountingCharSequence nullCharsetString = new CountingCharSequence();
      try {
        Files.writeString(path, nullCharsetString, (java.nio.charset.Charset) null);
        System.out.println(false);
      } catch (NullPointerException e) {
        System.out.println(e.getClass().getName());
      }
      System.out.println(nullCharsetString.count);
      try {
        Files.writeString(path, "x", StandardOpenOption.READ);
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      System.out.println(Files.readString(path));
      try {
        Files.write(path, new byte[] { 1 }, StandardOpenOption.READ, StandardOpenOption.WRITE);
        System.out.println(false);
      } catch (IllegalArgumentException e) {
        System.out.println(e.getClass().getName());
      }
      System.out.println(Files.readAllBytes(path).length);
    } finally {
      Files.deleteIfExists(path);
    }
  }

  private static String relativeName(Path root, Path path) {
    return path.equals(root) ? "." : root.relativize(path).toString().replace('\\', '/');
  }

  private interface MissingFileAttributeView extends FileAttributeView {}
}
