package java.nio.file;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.FileAttributeView;
import java.nio.file.attribute.FileOwnerAttributeView;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.GroupPrincipal;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFileAttributes;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.UserPrincipal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.BiPredicate;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public final class Files {
  private static int temporaryProviderCounter;

  private Files() {}

  public static InputStream newInputStream(Path path, OpenOption... options) throws IOException {
    return path.getFileSystem().provider().newInputStream(path, options);
  }

  public static OutputStream newOutputStream(Path path, OpenOption... options) throws IOException {
    return path.getFileSystem().provider().newOutputStream(path, options);
  }

  public static SeekableByteChannel newByteChannel(Path path, OpenOption... options) throws IOException {
    HashSet<OpenOption> optionSet = new HashSet<OpenOption>();
    Collections.addAll(optionSet, options);
    return newByteChannel(path, optionSet);
  }

  public static SeekableByteChannel newByteChannel(
      Path path,
      Set<? extends OpenOption> options,
      FileAttribute<?>... attrs) throws IOException {
    return path.getFileSystem().provider().newByteChannel(path, options, attrs);
  }

  public static Path createTempFile(String prefix, String suffix, FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    Path path = createTemporaryFile(null, prefix, suffix).toPath();
    applyFileAttributes(path, attrs);
    return path;
  }

  public static Path createTempFile(
      Path dir,
      String prefix,
      String suffix,
      FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    if (dir.getFileSystem() != FileSystems.getDefault()) {
      return createTemporaryProviderPath(dir, prefix, suffix, false, attrs);
    }
    Path path = createTemporaryFile(toFile(dir), prefix, suffix).toPath();
    applyFileAttributes(path, attrs);
    return path;
  }

  public static Path createTempDirectory(String prefix, FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    File file = createTemporaryFile(null, prefix, "");
    if (!file.delete() || !file.mkdir()) {
      throw new IOException("Unable to create temporary directory");
    }
    Path path = file.toPath();
    applyFileAttributes(path, attrs);
    return path;
  }

  public static Path createTempDirectory(Path dir, String prefix, FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    if (dir.getFileSystem() != FileSystems.getDefault()) {
      return createTemporaryProviderPath(dir, prefix, "", true, attrs);
    }
    File file = createTemporaryFile(toFile(dir), prefix, "");
    if (!file.delete() || !file.mkdir()) {
      throw new IOException("Unable to create temporary directory");
    }
    Path path = file.toPath();
    applyFileAttributes(path, attrs);
    return path;
  }

  public static Path createFile(Path path, FileAttribute<?>... attrs) throws IOException {
    HashSet<OpenOption> options = new HashSet<OpenOption>();
    options.add(StandardOpenOption.CREATE_NEW);
    options.add(StandardOpenOption.WRITE);
    SeekableByteChannel channel = newByteChannel(path, options, attrs);
    channel.close();
    return path;
  }

  public static Path createDirectory(Path path, FileAttribute<?>... attrs) throws IOException {
    path.getFileSystem().provider().createDirectory(path, attrs);
    return path;
  }

  public static Path createLink(Path link, Path existing) throws IOException {
    link.getFileSystem().provider().createLink(link, existing);
    return link;
  }

  public static Path createSymbolicLink(Path link, Path target, FileAttribute<?>... attrs) throws IOException {
    link.getFileSystem().provider().createSymbolicLink(link, target, attrs);
    return link;
  }

  public static Path createDirectories(Path path, FileAttribute<?>... attrs) throws IOException {
    try {
      createDirectory(path, attrs);
      return path;
    } catch (FileAlreadyExistsException e) {
      if (!isDirectory(path)) {
        throw e;
      }
      return path;
    } catch (IOException ignored) {
    }

    SecurityException securityFailure = null;
    try {
      path = path.toAbsolutePath();
    } catch (SecurityException e) {
      securityFailure = e;
    }

    Path parent = path.getParent();
    while (parent != null) {
      try {
        parent.getFileSystem().provider().checkAccess(parent);
        break;
      } catch (NoSuchFileException e) {
        parent = parent.getParent();
      }
    }

    if (parent == null) {
      if (securityFailure != null) {
        throw securityFailure;
      }
      throw new FileSystemException(
          path.toString(), null, "Unable to determine if root directory exists");
    }

    Path child = parent;
    for (Path name : parent.relativize(path)) {
      child = child.resolve(name);
      try {
        createDirectory(child, attrs);
      } catch (FileAlreadyExistsException e) {
        if (!isDirectory(child)) {
          throw e;
        }
      }
    }
    return path;
  }

  public static void delete(Path path) throws IOException {
    path.getFileSystem().provider().delete(path);
  }

  public static boolean deleteIfExists(Path path) throws IOException {
    return path.getFileSystem().provider().deleteIfExists(path);
  }

  public static Path copy(Path source, Path target, CopyOption... options) throws IOException {
    java.nio.file.spi.FileSystemProvider provider =
        source.getFileSystem().provider();
    if (target.getFileSystem().provider() == provider) {
      provider.copy(source, target, options);
    } else {
      copyToForeignTarget(source, target, options);
    }
    return target;
  }

  public static long copy(InputStream in, Path target, CopyOption... options) throws IOException {
    Objects.requireNonNull(in);
    boolean replaceExisting = false;
    for (CopyOption option : options) {
      if (option == StandardCopyOption.REPLACE_EXISTING) {
        replaceExisting = true;
      } else if (option == null) {
        throw new NullPointerException("options contains 'null'");
      } else {
        throw new UnsupportedOperationException(option + " not supported");
      }
    }

    SecurityException securityFailure = null;
    if (replaceExisting) {
      try {
        deleteIfExists(target);
      } catch (SecurityException e) {
        securityFailure = e;
      }
    }

    OutputStream output;
    try {
      output = newOutputStream(
          target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
    } catch (FileAlreadyExistsException e) {
      if (securityFailure != null) {
        throw securityFailure;
      }
      throw e;
    }
    try (OutputStream stream = output) {
      return copyStream(in, stream);
    }
  }

  public static long copy(Path source, OutputStream out) throws IOException {
    Objects.requireNonNull(out);
    try (InputStream input = newInputStream(source)) {
      return copyStream(input, out);
    }
  }

  public static Path move(Path source, Path target, CopyOption... options) throws IOException {
    java.nio.file.spi.FileSystemProvider provider =
        source.getFileSystem().provider();
    if (target.getFileSystem().provider() == provider) {
      provider.move(source, target, options);
    } else {
      CopyOption[] copyOptions = new CopyOption[options.length + 2];
      for (int i = 0; i < options.length; i++) {
        CopyOption option = options[i];
        if (option == StandardCopyOption.ATOMIC_MOVE) {
          throw new AtomicMoveNotSupportedException(
              null, null, "Atomic move between providers is not supported");
        }
        copyOptions[i] = option;
      }
      copyOptions[options.length] = LinkOption.NOFOLLOW_LINKS;
      copyOptions[options.length + 1] = StandardCopyOption.COPY_ATTRIBUTES;
      copyToForeignTarget(source, target, copyOptions);
      delete(source);
    }
    return target;
  }

  public static boolean exists(Path path, LinkOption... options) {
    try {
      checkExistence(path, options);
      return true;
    } catch (IOException e) {
      return false;
    }
  }

  public static boolean notExists(Path path, LinkOption... options) {
    try {
      checkExistence(path, options);
      return false;
    } catch (NoSuchFileException e) {
      return true;
    } catch (IOException e) {
      return false;
    }
  }

  public static boolean isDirectory(Path path, LinkOption... options) {
    requireLinkOptions(options);
    try {
      return path.getFileSystem().provider()
          .readAttributes(path, BasicFileAttributes.class, options).isDirectory();
    } catch (IOException e) {
      return false;
    }
  }

  public static boolean isRegularFile(Path path, LinkOption... options) {
    requireLinkOptions(options);
    try {
      return path.getFileSystem().provider()
          .readAttributes(path, BasicFileAttributes.class, options).isRegularFile();
    } catch (IOException e) {
      return false;
    }
  }

  public static boolean isSymbolicLink(Path path) {
    try {
      return readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).isSymbolicLink();
    } catch (IOException e) {
      return false;
    }
  }

  public static Path readSymbolicLink(Path link) throws IOException {
    return link.getFileSystem().provider().readSymbolicLink(link);
  }

  public static long size(Path path) throws IOException {
    return readAttributes(path, BasicFileAttributes.class).size();
  }

  public static FileStore getFileStore(Path path) throws IOException {
    return path.getFileSystem().provider().getFileStore(path);
  }

  public static <A extends BasicFileAttributes> A readAttributes(
      Path path,
      Class<A> type,
      LinkOption... options) throws IOException {
    return path.getFileSystem().provider().readAttributes(path, type, options);
  }

  public static <V extends FileAttributeView> V getFileAttributeView(
      final Path path,
      Class<V> type,
      LinkOption... options) {
    FileSystem fileSystem = path.getFileSystem();
    if (fileSystem != FileSystems.getDefault()) {
      return fileSystem.provider().getFileAttributeView(path, type, options);
    }
    requireLinkOptions(options);
    final LinkOption[] linkOptions = options.clone();
    final Class<V> viewType = Objects.requireNonNull(type);
    toFile(path);
    if (viewType != BasicFileAttributeView.class) {
      if (viewType == FileOwnerAttributeView.class) {
        return viewType.cast(new FileOwnerAttributeView() {
          public String name() {
            return "owner";
          }

          public UserPrincipal getOwner() throws IOException {
            return Files.getOwner(path, linkOptions);
          }

          public void setOwner(UserPrincipal owner) throws IOException {
            Files.setOwner(path, owner);
          }
        });
      }
      if (viewType != PosixFileAttributeView.class) {
        return null;
      }
      return viewType.cast(new PosixFileAttributeView() {
        public String name() {
          return "posix";
        }

        public PosixFileAttributes readAttributes() throws IOException {
          return Files.readAttributes(path, PosixFileAttributes.class, linkOptions);
        }

        public void setPermissions(Set<PosixFilePermission> perms) throws IOException {
          Files.setPosixFilePermissions(path, perms);
        }

        public void setOwner(UserPrincipal owner) throws IOException {
          Files.setOwner(path, owner);
        }

        public UserPrincipal getOwner() throws IOException {
          return Files.getOwner(path, linkOptions);
        }

        public void setGroup(GroupPrincipal group) throws IOException {
          Objects.requireNonNull(group);
          File file = toFile(path);
          if (!file.exists()) {
            throw new NoSuchFileException(file.toString());
          }
        }

        public void setTimes(FileTime lastModifiedTime, FileTime lastAccessTime, FileTime createTime)
            throws IOException {
          if (lastModifiedTime != null) {
            Files.setLastModifiedTime(path, lastModifiedTime);
          }
        }
      });
    }
    return viewType.cast(new BasicFileAttributeView() {
      public String name() {
        return "basic";
      }

      public BasicFileAttributes readAttributes() throws IOException {
        return Files.readAttributes(path, BasicFileAttributes.class, linkOptions);
      }

      public void setTimes(FileTime lastModifiedTime, FileTime lastAccessTime, FileTime createTime)
          throws IOException {
        if (lastModifiedTime != null) {
          Files.setLastModifiedTime(path, lastModifiedTime);
        }
      }
    });
  }

  public static Object getAttribute(Path path, String attribute, LinkOption... options) throws IOException {
    String attributeName = attributeNames(Objects.requireNonNull(attribute));
    if (attributeName.equals("*") || attributeName.indexOf(',') >= 0) {
      throw new IllegalArgumentException();
    }
    return readAttributes(path, attribute, options).get(attributeName);
  }

  public static Map<String, Object> readAttributes(Path path, String attributes, LinkOption... options)
      throws IOException {
    return path.getFileSystem().provider().readAttributes(path, attributes, options);
  }

  public static Path setAttribute(Path path, String attribute, Object value, LinkOption... options)
      throws IOException {
    requireLinkOptions(options);
    String attributeString = Objects.requireNonNull(attribute);
    if (path.getFileSystem() != FileSystems.getDefault()) {
      path.getFileSystem().provider().setAttribute(path, attributeString, value, options);
      return path;
    }
    String viewName = attributeViewName(attributeString);
    String attributeName = attributeNames(attributeString);
    if (viewName.equals("owner")) {
      if (!attributeName.equals("owner")) {
        throw new IllegalArgumentException();
      }
      return setOwner(path, (UserPrincipal) value);
    }
    if (viewName.equals("posix")) {
      if (attributeName.equals("permissions")) {
        return setPosixFilePermissions(path, (Set<PosixFilePermission>) value);
      }
      if (attributeName.equals("owner")) {
        return setOwner(path, (UserPrincipal) value);
      }
      if (attributeName.equals("group")) {
        Objects.requireNonNull((GroupPrincipal) value);
        File file = toFile(path);
        if (!file.exists()) {
          throw new NoSuchFileException(file.toString());
        }
        return path;
      }
      if (attributeName.equals("lastModifiedTime")) {
        return setLastModifiedTime(path, (FileTime) value);
      }
      throw new IllegalArgumentException();
    }
    if (!viewName.equals("basic")) {
      throw new UnsupportedOperationException();
    }
    if (!attributeName.equals("lastModifiedTime")) {
      throw new IllegalArgumentException();
    }
    return setLastModifiedTime(path, (FileTime) value);
  }

  public static FileTime getLastModifiedTime(Path path, LinkOption... options) throws IOException {
    return readAttributes(path, BasicFileAttributes.class, options).lastModifiedTime();
  }

  public static Path setLastModifiedTime(Path path, FileTime time) throws IOException {
    BasicFileAttributeView view = path.getFileSystem().provider()
        .getFileAttributeView(path, BasicFileAttributeView.class);
    view.setTimes(Objects.requireNonNull(time), null, null);
    return path;
  }

  public static UserPrincipal getOwner(Path path, LinkOption... options) throws IOException {
    FileOwnerAttributeView view = path.getFileSystem().provider()
        .getFileAttributeView(path, FileOwnerAttributeView.class, options);
    if (view == null) {
      throw new UnsupportedOperationException();
    }
    return view.getOwner();
  }

  public static Path setOwner(Path path, UserPrincipal owner) throws IOException {
    UserPrincipal user = Objects.requireNonNull(owner);
    if (path.getFileSystem() != FileSystems.getDefault()) {
      FileOwnerAttributeView view = getFileAttributeView(path, FileOwnerAttributeView.class);
      if (view == null) {
        throw new UnsupportedOperationException();
      }
      view.setOwner(user);
      return path;
    }
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    return path;
  }

  public static Set<PosixFilePermission> getPosixFilePermissions(Path path, LinkOption... options)
      throws IOException {
    PosixFileAttributes attributes = readAttributes(path, PosixFileAttributes.class, options);
    if (attributes == null) {
      throw new UnsupportedOperationException();
    }
    return attributes.permissions();
  }

  public static Path setPosixFilePermissions(Path path, Set<PosixFilePermission> perms)
      throws IOException {
    Set<PosixFilePermission> permissions = Objects.requireNonNull(perms);
    for (PosixFilePermission permission : permissions) {
      Objects.requireNonNull(permission);
    }
    if (path.getFileSystem() != FileSystems.getDefault()) {
      PosixFileAttributeView view = getFileAttributeView(path, PosixFileAttributeView.class);
      if (view == null) {
        throw new UnsupportedOperationException();
      }
      view.setPermissions(permissions);
      return path;
    }
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    boolean ownerRead = permissions.contains(PosixFilePermission.OWNER_READ);
    boolean groupRead = permissions.contains(PosixFilePermission.GROUP_READ);
    boolean othersRead = permissions.contains(PosixFilePermission.OTHERS_READ);
    boolean ownerWrite = permissions.contains(PosixFilePermission.OWNER_WRITE);
    boolean groupWrite = permissions.contains(PosixFilePermission.GROUP_WRITE);
    boolean othersWrite = permissions.contains(PosixFilePermission.OTHERS_WRITE);
    boolean ownerExecute = permissions.contains(PosixFilePermission.OWNER_EXECUTE);
    boolean groupExecute = permissions.contains(PosixFilePermission.GROUP_EXECUTE);
    boolean othersExecute = permissions.contains(PosixFilePermission.OTHERS_EXECUTE);
    if (!file.setReadable(false, false)
        || !file.setWritable(false, false)
        || !file.setExecutable(false, false)) {
      throw new IOException("Unable to clear file permissions");
    }
    if ((ownerRead || groupRead || othersRead) && !file.setReadable(true, !groupRead && !othersRead)) {
      throw new IOException("Unable to set read permission");
    }
    if ((ownerWrite || groupWrite || othersWrite) && !file.setWritable(true, !groupWrite && !othersWrite)) {
      throw new IOException("Unable to set write permission");
    }
    if ((ownerExecute || groupExecute || othersExecute)
        && !file.setExecutable(true, !groupExecute && !othersExecute)) {
      throw new IOException("Unable to set execute permission");
    }
    return path;
  }

  public static Stream<Path> list(Path dir) throws IOException {
    final DirectoryStream<Path> directoryStream = newDirectoryStream(dir);
    try {
      final Iterator<Path> delegate = directoryStream.iterator();
      Iterator<Path> iterator = new Iterator<Path>() {
        public boolean hasNext() {
          try {
            return delegate.hasNext();
          } catch (DirectoryIteratorException e) {
            throw new UncheckedIOException(e.getCause());
          }
        }

        public Path next() {
          try {
            return delegate.next();
          } catch (DirectoryIteratorException e) {
            throw new UncheckedIOException(e.getCause());
          }
        }
      };
      Spliterator<Path> spliterator =
          Spliterators.spliteratorUnknownSize(iterator, Spliterator.DISTINCT);
      return StreamSupport.stream(spliterator, false).onClose(new Runnable() {
        public void run() {
          try {
            directoryStream.close();
          } catch (IOException e) {
            throw new UncheckedIOException(e);
          }
        }
      });
    } catch (Error | RuntimeException e) {
      try {
        directoryStream.close();
      } catch (IOException closeException) {
        try {
          e.addSuppressed(closeException);
        } catch (Throwable ignored) {
          // Preserve the original stream-construction failure.
        }
      }
      throw e;
    }
  }

  public static DirectoryStream<Path> newDirectoryStream(Path dir) throws IOException {
    return dir.getFileSystem().provider().newDirectoryStream(dir, new DirectoryStream.Filter<Path>() {
      public boolean accept(Path entry) {
        return true;
      }
    });
  }

  public static DirectoryStream<Path> newDirectoryStream(Path dir, String glob) throws IOException {
    if (glob.equals("*")) {
      return newDirectoryStream(dir);
    }
    FileSystem fileSystem = dir.getFileSystem();
    final PathMatcher matcher = fileSystem.getPathMatcher("glob:" + glob);
    DirectoryStream.Filter<Path> filter = new DirectoryStream.Filter<Path>() {
      public boolean accept(Path entry) {
        return matcher.matches(entry.getFileName());
      }
    };
    return fileSystem.provider().newDirectoryStream(dir, filter);
  }

  public static DirectoryStream<Path> newDirectoryStream(
      Path dir,
      DirectoryStream.Filter<? super Path> filter) throws IOException {
    return dir.getFileSystem().provider().newDirectoryStream(dir, filter);
  }

  public static Stream<Path> walk(Path start, FileVisitOption... options) throws IOException {
    return walk(start, Integer.MAX_VALUE, options);
  }

  public static Stream<Path> walk(Path start, int maxDepth, FileVisitOption... options) throws IOException {
    final FileTreeIterator iterator = new FileTreeIterator(start, maxDepth, options);
    try {
      Spliterator<FileTreeWalker.Event> spliterator =
          Spliterators.spliteratorUnknownSize(iterator, Spliterator.DISTINCT);
      return StreamSupport.stream(spliterator, false).onClose(new Runnable() {
        public void run() {
          iterator.close();
        }
      }).map(new Function<FileTreeWalker.Event, Path>() {
        public Path apply(FileTreeWalker.Event event) {
          return event.file();
        }
      });
    } catch (Error | RuntimeException e) {
      iterator.close();
      throw e;
    }
  }

  public static Stream<Path> find(
      Path start,
      int maxDepth,
      final BiPredicate<Path, BasicFileAttributes> matcher,
      FileVisitOption... options) throws IOException {
    final FileTreeIterator iterator = new FileTreeIterator(start, maxDepth, options);
    try {
      Spliterator<FileTreeWalker.Event> spliterator =
          Spliterators.spliteratorUnknownSize(iterator, Spliterator.DISTINCT);
      return StreamSupport.stream(spliterator, false).onClose(new Runnable() {
        public void run() {
          iterator.close();
        }
      }).filter(new Predicate<FileTreeWalker.Event>() {
        public boolean test(FileTreeWalker.Event event) {
          return matcher.test(event.file(), event.attributes());
        }
      }).map(new Function<FileTreeWalker.Event, Path>() {
        public Path apply(FileTreeWalker.Event event) {
          return event.file();
        }
      });
    } catch (Error | RuntimeException e) {
      iterator.close();
      throw e;
    }
  }

  public static Path walkFileTree(Path start, FileVisitor<? super Path> visitor) throws IOException {
    FileVisitor<? super Path> fileVisitor = Objects.requireNonNull(visitor);
    if (start.getFileSystem() != FileSystems.getDefault()) {
      walkPathFileTreeInternal(start, 0, Integer.MAX_VALUE, fileVisitor);
      return start;
    }
    File root = toFile(start);
    if (!root.exists()) {
      throw new NoSuchFileException(root.toString());
    }
    walkFileTreeInternal(root, 0, Integer.MAX_VALUE, fileVisitor);
    return start;
  }

  public static Path walkFileTree(
      Path start,
      Set<FileVisitOption> options,
      int maxDepth,
      FileVisitor<? super Path> visitor) throws IOException {
    Objects.requireNonNull(options);
    for (FileVisitOption option : options) {
      Objects.requireNonNull(option);
    }
    if (maxDepth < 0) {
      throw new IllegalArgumentException();
    }
    FileVisitor<? super Path> fileVisitor = Objects.requireNonNull(visitor);
    if (start.getFileSystem() != FileSystems.getDefault()) {
      walkPathFileTreeInternal(start, 0, maxDepth, fileVisitor);
      return start;
    }
    File root = toFile(start);
    if (!root.exists()) {
      throw new NoSuchFileException(root.toString());
    }
    walkFileTreeInternal(root, 0, maxDepth, fileVisitor);
    return start;
  }

  public static byte[] readAllBytes(Path path) throws IOException {
    InputStream input = newInputStream(path);
    try {
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      byte[] buffer = new byte[8192];
      int count;
      while ((count = input.read(buffer)) != -1) {
        output.write(buffer, 0, count);
      }
      return output.toByteArray();
    } finally {
      input.close();
    }
  }

  public static long mismatch(Path path, Path path2) throws IOException {
    if (isSameFile(path, path2)) {
      return -1L;
    }
    byte[] first = readAllBytes(path);
    byte[] second = readAllBytes(path2);
    int length = Math.min(first.length, second.length);
    for (int i = 0; i < length; i++) {
      if (first[i] != second[i]) {
        return i;
      }
    }
    return first.length == second.length ? -1L : length;
  }

  public static boolean isSameFile(Path path, Path path2) throws IOException {
    return path.getFileSystem().provider().isSameFile(path, path2);
  }

  public static boolean isReadable(Path path) {
    return hasAccess(path, AccessMode.READ);
  }

  public static boolean isWritable(Path path) {
    return hasAccess(path, AccessMode.WRITE);
  }

  public static boolean isExecutable(Path path) {
    return hasAccess(path, AccessMode.EXECUTE);
  }

  public static boolean isHidden(Path path) throws IOException {
    if (path.getFileSystem() != FileSystems.getDefault()) {
      return path.getFileSystem().provider().isHidden(path);
    }
    return toFile(path).isHidden();
  }

  public static String probeContentType(Path path) throws IOException {
    String fileName = Objects.requireNonNull(path).getFileName().toString().toLowerCase();
    int extensionStart = fileName.lastIndexOf('.');
    if (extensionStart < 0 || extensionStart == fileName.length() - 1) {
      return null;
    }
    String extension = fileName.substring(extensionStart + 1);
    if (extension.equals("txt") || extension.equals("text")) {
      return "text/plain";
    } else if (extension.equals("html") || extension.equals("htm")) {
      return "text/html";
    } else if (extension.equals("bin")) {
      return "application/octet-stream";
    }
    return null;
  }

  public static String readString(Path path) throws IOException {
    return readString(path, StandardCharsets.UTF_8);
  }

  public static String readString(Path path, Charset cs) throws IOException {
    return new String(readAllBytes(path), Objects.requireNonNull(cs));
  }

  public static BufferedReader newBufferedReader(Path path) throws IOException {
    return newBufferedReader(path, StandardCharsets.UTF_8);
  }

  public static BufferedReader newBufferedReader(Path path, Charset cs) throws IOException {
    Charset charset = Objects.requireNonNull(cs);
    return new BufferedReader(new InputStreamReader(newInputStream(path), charset));
  }

  public static List<String> readAllLines(Path path) throws IOException {
    return readAllLines(path, StandardCharsets.UTF_8);
  }

  public static List<String> readAllLines(Path path, Charset cs) throws IOException {
    String content = readString(path, Objects.requireNonNull(cs));
    ArrayList<String> lines = new ArrayList<String>();
    int start = 0;
    for (int i = 0; i < content.length(); i++) {
      char ch = content.charAt(i);
      if (ch == '\n' || ch == '\r') {
        lines.add(content.substring(start, i));
        if (ch == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') {
          i++;
        }
        start = i + 1;
      }
    }
    if (start < content.length()) {
      lines.add(content.substring(start));
    }
    return lines;
  }

  public static Stream<String> lines(Path path) throws IOException {
    return lines(path, StandardCharsets.UTF_8);
  }

  public static Stream<String> lines(Path path, Charset cs) throws IOException {
    return readAllLines(path, Objects.requireNonNull(cs)).stream();
  }

  public static Path write(Path path, byte[] bytes, OpenOption... options) throws IOException {
    Objects.requireNonNull(bytes);
    OutputStream output = newOutputStream(path, options);
    try {
      output.write(bytes);
      return path;
    } finally {
      output.close();
    }
  }

  public static Path write(Path path, Iterable<? extends CharSequence> lines, OpenOption... options)
      throws IOException {
    return write(path, lines, StandardCharsets.UTF_8, options);
  }

  public static Path write(
      Path path,
      Iterable<? extends CharSequence> lines,
      Charset cs,
      OpenOption... options) throws IOException {
    Objects.requireNonNull(lines);
    Charset charset = Objects.requireNonNull(cs);
    Objects.requireNonNull(options);
    boolean append = false;
    boolean create = options.length == 0;
    boolean createNew = false;
    boolean truncate = false;
    for (OpenOption option : options) {
      Objects.requireNonNull(option);
      if (option == StandardOpenOption.APPEND) {
        append = true;
      } else if (option == StandardOpenOption.CREATE) {
        create = true;
      } else if (option == StandardOpenOption.CREATE_NEW) {
        createNew = true;
      } else if (option == StandardOpenOption.TRUNCATE_EXISTING) {
        truncate = true;
      } else if (option == StandardOpenOption.READ) {
        throw new IllegalArgumentException();
      } else if (option != StandardOpenOption.CREATE
          && option != StandardOpenOption.CREATE_NEW
          && option != StandardOpenOption.DELETE_ON_CLOSE
          && option != StandardOpenOption.WRITE
          && option != StandardOpenOption.SYNC
          && option != StandardOpenOption.DSYNC
          && option != StandardOpenOption.SPARSE) {
        throw new UnsupportedOperationException();
      }
    }
    if (append && truncate) {
      throw new IllegalArgumentException();
    }
    if (path.getFileSystem() == FileSystems.getDefault()) {
      validateOutputTarget(toFile(path), create, createNew);
    }
    StringBuilder builder = new StringBuilder();
    String separator = System.lineSeparator();
    for (CharSequence line : lines) {
      builder.append(String.valueOf(line));
      builder.append(separator);
    }
    return write(path, builder.toString().getBytes(charset), options);
  }

  public static BufferedWriter newBufferedWriter(Path path, OpenOption... options) throws IOException {
    return newBufferedWriter(path, StandardCharsets.UTF_8, options);
  }

  public static BufferedWriter newBufferedWriter(Path path, Charset cs, OpenOption... options) throws IOException {
    Charset charset = Objects.requireNonNull(cs);
    return new BufferedWriter(new OutputStreamWriter(newOutputStream(path, options), charset));
  }

  public static Path writeString(Path path, CharSequence csq, OpenOption... options) throws IOException {
    return writeString(path, csq, StandardCharsets.UTF_8, options);
  }

  public static Path writeString(Path path, CharSequence csq, Charset cs, OpenOption... options) throws IOException {
    Charset charset = Objects.requireNonNull(cs);
    Objects.requireNonNull(csq);
    return write(path, csq.toString().getBytes(charset), options);
  }

  private static File toFile(Path path) {
    return Objects.requireNonNull(path).toFile();
  }

  private static void requireLinkOptions(LinkOption... options) {
    Objects.requireNonNull(options);
    for (LinkOption option : options) {
      Objects.requireNonNull(option);
    }
  }

  private static boolean followLinks(LinkOption... options) {
    requireLinkOptions(options);
    for (LinkOption option : options) {
      if (option == LinkOption.NOFOLLOW_LINKS) {
        return false;
      }
    }
    return true;
  }

  private static void requireFileAttributes(FileAttribute<?>... attrs) {
    Objects.requireNonNull(attrs);
    for (FileAttribute<?> attr : attrs) {
      Objects.requireNonNull(attr);
    }
  }

  private static void applyFileAttributes(Path path, FileAttribute<?>... attrs) throws IOException {
    for (FileAttribute<?> attr : attrs) {
      String name = attr.name();
      if (name.equals("posix:permissions")) {
        setPosixFilePermissions(path, (Set<PosixFilePermission>) attr.value());
      } else {
        throw new UnsupportedOperationException();
      }
    }
  }

  private static void validateOutputTarget(File file, boolean create, boolean createNew) throws IOException {
    if (createNew && file.exists()) {
      throw new FileAlreadyExistsException(file.toString());
    }
    if (!file.exists()) {
      File parent = file.getParentFile();
      if (parent != null) {
        if (parent.exists() && !parent.isDirectory()) {
          throw new FileSystemException(file.toString(), null, "Not a directory");
        }
      }
      if (!create && !createNew) {
        throw new NoSuchFileException(file.toString());
      }
      if (parent != null && !parent.exists()) {
        throw new NoSuchFileException(file.toString());
      }
    }
  }

  private static File createTemporaryFile(File directory, String prefix, String suffix) throws IOException {
    if (directory != null) {
      if (!directory.exists()) {
        throw new NoSuchFileException(directory.toString());
      }
      if (!directory.isDirectory()) {
        throw new FileSystemException(directory.toString());
      }
    }
    return File.createTempFile(temporaryPrefix(prefix), suffix, directory);
  }

  private static Path createTemporaryProviderPath(
      Path dir,
      String prefix,
      String suffix,
      boolean directory,
      FileAttribute<?>... attrs) throws IOException {
    Path parent = Objects.requireNonNull(dir);
    if (!exists(parent)) {
      throw new NoSuchFileException(parent.toString());
    }
    if (!isDirectory(parent)) {
      throw new FileSystemException(parent.toString());
    }
    String namePrefix = temporaryPrefix(prefix);
    String nameSuffix = suffix == null ? ".tmp" : suffix;
    IOException failure = null;
    for (int i = 0; i < 10000; i++) {
      String name = namePrefix + Integer.toString(temporaryProviderCounter++, 16) + "-" + i + nameSuffix;
      Path candidate = parent.resolve(name);
      try {
        if (directory) {
          return createDirectory(candidate, attrs);
        }
        return createFile(candidate, attrs);
      } catch (FileAlreadyExistsException e) {
        failure = e;
      }
    }
    IOException e = new IOException("Unable to create temporary " + (directory ? "directory" : "file"));
    if (failure != null) {
      e.initCause(failure);
    }
    throw e;
  }

  private static String temporaryPrefix(String prefix) {
    String result = prefix == null ? "" : prefix;
    while (result.length() < 3) {
      result += "_";
    }
    return result;
  }

  private static void copyToForeignTarget(
      Path source,
      Path target,
      CopyOption... options) throws IOException {
    boolean replaceExisting = false;
    boolean copyAttributes = false;
    boolean followLinks = true;
    for (CopyOption option : options) {
      if (option == StandardCopyOption.REPLACE_EXISTING) {
        replaceExisting = true;
      } else if (option == StandardCopyOption.COPY_ATTRIBUTES) {
        copyAttributes = true;
      } else if (option == LinkOption.NOFOLLOW_LINKS) {
        followLinks = false;
      } else if (option == null) {
        throw new NullPointerException();
      } else {
        throw new UnsupportedOperationException(option + " not supported");
      }
    }

    LinkOption[] linkOptions = followLinks
        ? new LinkOption[0]
        : new LinkOption[] { LinkOption.NOFOLLOW_LINKS };
    BasicFileAttributes sourceAttributes =
        readAttributes(source, BasicFileAttributes.class, linkOptions);
    if (sourceAttributes.isSymbolicLink()) {
      throw new IOException("Copying of symbolic links not supported");
    }

    if (replaceExisting) {
      deleteIfExists(target);
    } else if (exists(target)) {
      throw new FileAlreadyExistsException(target.toString());
    }

    if (sourceAttributes.isDirectory()) {
      createDirectory(target);
    } else {
      try (InputStream input = newInputStream(source)) {
        copy(input, target);
      }
    }

    if (copyAttributes) {
      BasicFileAttributeView view =
          getFileAttributeView(target, BasicFileAttributeView.class);
      try {
        view.setTimes(
            sourceAttributes.lastModifiedTime(),
            sourceAttributes.lastAccessTime(),
            sourceAttributes.creationTime());
      } catch (Throwable e) {
        try {
          delete(target);
        } catch (Throwable deleteFailure) {
          e.addSuppressed(deleteFailure);
        }
        throw e;
      }
    }
  }

  private static long copyStream(InputStream input, OutputStream output) throws IOException {
    long copied = 0L;
    byte[] buffer = new byte[8192];
    int count;
    while ((count = input.read(buffer)) != -1) {
      output.write(buffer, 0, count);
      copied += count;
    }
    return copied;
  }

  private static boolean hasAccess(Path path, AccessMode mode) {
    try {
      path.getFileSystem().provider().checkAccess(path, mode);
      return true;
    } catch (IOException e) {
      return false;
    }
  }

  private static void checkExistence(Path path, LinkOption... options) throws IOException {
    if (followLinks(options)) {
      path.getFileSystem().provider().checkAccess(path);
    } else {
      path.getFileSystem().provider().readAttributes(
          path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
    }
  }

  private static FileVisitResult walkFileTreeInternal(
      File file,
      int depth,
      int maxDepth,
      FileVisitor<? super Path> visitor) throws IOException {
    Path path = file.toPath();
    BasicFileAttributes attributes = readBasicFileAttributes(file);
    if (file.isDirectory() && depth < maxDepth) {
      FileVisitResult preResult = Objects.requireNonNull(visitor.preVisitDirectory(path, attributes));
      if (preResult == FileVisitResult.TERMINATE) {
        return FileVisitResult.TERMINATE;
      }
      if (preResult == FileVisitResult.SKIP_SUBTREE) {
        return FileVisitResult.CONTINUE;
      }
      if (preResult == FileVisitResult.SKIP_SIBLINGS) {
        return FileVisitResult.SKIP_SIBLINGS;
      }
      File[] children = file.listFiles();
      if (children == null) {
        FileVisitResult failureResult = Objects.requireNonNull(
            visitor.visitFileFailed(path, new IOException("Unable to list directory")));
        if (failureResult == FileVisitResult.TERMINATE || failureResult == FileVisitResult.SKIP_SIBLINGS) {
          return failureResult;
        }
        return FileVisitResult.CONTINUE;
      }
      for (File child : children) {
        FileVisitResult childResult = walkFileTreeInternal(child, depth + 1, maxDepth, visitor);
        if (childResult == FileVisitResult.TERMINATE) {
          return FileVisitResult.TERMINATE;
        }
        if (childResult == FileVisitResult.SKIP_SIBLINGS) {
          break;
        }
      }
      FileVisitResult postResult = Objects.requireNonNull(visitor.postVisitDirectory(path, null));
      if (postResult == FileVisitResult.TERMINATE || postResult == FileVisitResult.SKIP_SIBLINGS) {
        return postResult;
      }
      return FileVisitResult.CONTINUE;
    }
    FileVisitResult visitResult = Objects.requireNonNull(visitor.visitFile(path, attributes));
    if (visitResult == FileVisitResult.TERMINATE || visitResult == FileVisitResult.SKIP_SIBLINGS) {
      return visitResult;
    }
    return FileVisitResult.CONTINUE;
  }

  private static FileVisitResult walkPathFileTreeInternal(
      Path path,
      int depth,
      int maxDepth,
      FileVisitor<? super Path> visitor) throws IOException {
    BasicFileAttributes attributes = readAttributes(path, BasicFileAttributes.class);
    if (attributes.isDirectory() && depth < maxDepth) {
      FileVisitResult preResult = Objects.requireNonNull(visitor.preVisitDirectory(path, attributes));
      if (preResult == FileVisitResult.TERMINATE) {
        return FileVisitResult.TERMINATE;
      }
      if (preResult == FileVisitResult.SKIP_SUBTREE) {
        return FileVisitResult.CONTINUE;
      }
      if (preResult == FileVisitResult.SKIP_SIBLINGS) {
        return FileVisitResult.SKIP_SIBLINGS;
      }
      DirectoryStream<Path> stream;
      try {
        stream = newDirectoryStream(path);
      } catch (IOException e) {
        FileVisitResult failureResult = Objects.requireNonNull(visitor.visitFileFailed(path, e));
        if (failureResult == FileVisitResult.TERMINATE || failureResult == FileVisitResult.SKIP_SIBLINGS) {
          return failureResult;
        }
        return FileVisitResult.CONTINUE;
      }
      try {
        for (Path child : stream) {
          FileVisitResult childResult = walkPathFileTreeInternal(child, depth + 1, maxDepth, visitor);
          if (childResult == FileVisitResult.TERMINATE) {
            return FileVisitResult.TERMINATE;
          }
          if (childResult == FileVisitResult.SKIP_SIBLINGS) {
            break;
          }
        }
      } finally {
        stream.close();
      }
      FileVisitResult postResult = Objects.requireNonNull(visitor.postVisitDirectory(path, null));
      if (postResult == FileVisitResult.TERMINATE || postResult == FileVisitResult.SKIP_SIBLINGS) {
        return postResult;
      }
      return FileVisitResult.CONTINUE;
    }
    FileVisitResult visitResult = Objects.requireNonNull(visitor.visitFile(path, attributes));
    if (visitResult == FileVisitResult.TERMINATE || visitResult == FileVisitResult.SKIP_SIBLINGS) {
      return visitResult;
    }
    return FileVisitResult.CONTINUE;
  }

  private static String basicAttributeName(String attribute) {
    String view = attributeViewName(attribute);
    if (!view.equals("basic")) {
      throw new UnsupportedOperationException();
    }
    return attributeNames(attribute);
  }

  private static String attributeViewName(String attribute) {
    int separator = attribute.indexOf(':');
    if (separator < 0) {
      return "basic";
    }
    String view = attribute.substring(0, separator);
    if (!view.equals("basic") && !view.equals("posix") && !view.equals("owner")) {
      throw new UnsupportedOperationException();
    }
    return view;
  }

  private static String attributeNames(String attribute) {
    int separator = attribute.indexOf(':');
    String names = separator < 0 ? attribute : attribute.substring(separator + 1);
    if (names.length() == 0) {
      throw new IllegalArgumentException();
    }
    return names;
  }

  private static void putBasicAttribute(
      HashMap<String, Object> values,
      BasicFileAttributes attributes,
      String name) {
    if (name.equals("lastModifiedTime")) {
      values.put(name, attributes.lastModifiedTime());
    } else if (name.equals("lastAccessTime")) {
      values.put(name, attributes.lastAccessTime());
    } else if (name.equals("creationTime")) {
      values.put(name, attributes.creationTime());
    } else if (name.equals("size")) {
      values.put(name, Long.valueOf(attributes.size()));
    } else if (name.equals("isRegularFile")) {
      values.put(name, Boolean.valueOf(attributes.isRegularFile()));
    } else if (name.equals("isDirectory")) {
      values.put(name, Boolean.valueOf(attributes.isDirectory()));
    } else if (name.equals("isSymbolicLink")) {
      values.put(name, Boolean.valueOf(attributes.isSymbolicLink()));
    } else if (name.equals("isOther")) {
      values.put(name, Boolean.valueOf(attributes.isOther()));
    } else if (name.equals("fileKey")) {
      values.put(name, attributes.fileKey());
    } else {
      throw new IllegalArgumentException();
    }
  }

  private static void putPosixAttribute(
      HashMap<String, Object> values,
      PosixFileAttributes attributes,
      String name) {
    if (name.equals("owner")) {
      values.put(name, attributes.owner());
    } else if (name.equals("group")) {
      values.put(name, attributes.group());
    } else if (name.equals("permissions")) {
      values.put(name, attributes.permissions());
    } else {
      putBasicAttribute(values, attributes, name);
    }
  }

  private static void putOwnerAttribute(
      HashMap<String, Object> values,
      UserPrincipal owner,
      String name) {
    if (!name.equals("owner")) {
      throw new IllegalArgumentException();
    }
    values.put(name, owner);
  }

  private static Set<PosixFilePermission> readPosixFilePermissions(File file) {
    HashSet<PosixFilePermission> permissions = new HashSet<PosixFilePermission>();
    if (file.canRead()) {
      permissions.add(PosixFilePermission.OWNER_READ);
    }
    if (file.canWrite()) {
      permissions.add(PosixFilePermission.OWNER_WRITE);
    }
    if (file.canExecute()) {
      permissions.add(PosixFilePermission.OWNER_EXECUTE);
    }
    return permissions;
  }

  private static UserPrincipal currentUserPrincipal() {
    final String ownerName = principalName();
    return new UserPrincipal() {
      public String getName() {
        return ownerName;
      }

      public String toString() {
        return ownerName;
      }
    };
  }

  private static GroupPrincipal currentGroupPrincipal() {
    final String groupName = principalName();
    return new GroupPrincipal() {
      public String getName() {
        return groupName;
      }

      public String toString() {
        return groupName;
      }
    };
  }

  private static String principalName() {
    String propertyName = System.getProperty("user.name", "user");
    return propertyName == null || propertyName.length() == 0 ? "user" : propertyName;
  }

  private static PosixFileAttributes readPosixFileAttributes(final File file, boolean symbolicLink) {
    final BasicFileAttributes basicAttributes = readBasicFileAttributes(file, symbolicLink);
    final UserPrincipal owner = currentUserPrincipal();
    final GroupPrincipal group = currentGroupPrincipal();
    final Set<PosixFilePermission> permissions = readPosixFilePermissions(file);
    return new PosixFileAttributes() {
      public FileTime lastModifiedTime() {
        return basicAttributes.lastModifiedTime();
      }

      public FileTime lastAccessTime() {
        return basicAttributes.lastAccessTime();
      }

      public FileTime creationTime() {
        return basicAttributes.creationTime();
      }

      public boolean isRegularFile() {
        return basicAttributes.isRegularFile();
      }

      public boolean isDirectory() {
        return basicAttributes.isDirectory();
      }

      public boolean isSymbolicLink() {
        return basicAttributes.isSymbolicLink();
      }

      public boolean isOther() {
        return basicAttributes.isOther();
      }

      public long size() {
        return basicAttributes.size();
      }

      public Object fileKey() {
        return basicAttributes.fileKey();
      }

      public UserPrincipal owner() {
        return owner;
      }

      public GroupPrincipal group() {
        return group;
      }

      public Set<PosixFilePermission> permissions() {
        return permissions;
      }
    };
  }

  private static BasicFileAttributes readBasicFileAttributes(final File file) {
    return readBasicFileAttributes(file, false);
  }

  private static BasicFileAttributes readBasicFileAttributes(final File file, boolean symbolicLink) {
    final FileTime lastModifiedTime = FileTime.fromMillis(file.lastModified());
    long fileSize = file.length();
    if (symbolicLink) {
      try {
        fileSize = readSymbolicLink(file.toPath()).toString().getBytes(StandardCharsets.UTF_8).length;
      } catch (IOException e) {
        fileSize = 0L;
      }
    }
    final long size = fileSize;
    final boolean regularFile = !symbolicLink && file.isFile();
    final boolean directory = !symbolicLink && file.isDirectory();
    return new BasicFileAttributes() {
      public FileTime lastModifiedTime() {
        return lastModifiedTime;
      }

      public FileTime lastAccessTime() {
        return lastModifiedTime;
      }

      public FileTime creationTime() {
        return lastModifiedTime;
      }

      public boolean isRegularFile() {
        return regularFile;
      }

      public boolean isDirectory() {
        return directory;
      }

      public boolean isSymbolicLink() {
        return symbolicLink;
      }

      public boolean isOther() {
        return !regularFile && !directory && !symbolicLink;
      }

      public long size() {
        return size;
      }

      public Object fileKey() {
        return null;
      }
    };
  }
}
