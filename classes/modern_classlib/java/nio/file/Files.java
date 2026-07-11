package java.nio.file;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.RandomAccessFile;
import java.io.UncheckedIOException;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.FileAttributeView;
import java.nio.file.attribute.FileStoreAttributeView;
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
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiPredicate;
import java.util.function.Predicate;
import java.util.regex.PatternSyntaxException;
import java.util.stream.Stream;

public final class Files {
  private Files() {}

  private static native void createHardLink0(String link, String existing) throws IOException;

  private static native void createSymbolicLink0(String link, String target) throws IOException;

  private static native String readSymbolicLink0(String link) throws IOException;

  private static native void deletePath0(String path) throws IOException;

  private static native boolean isSameFile0(String first, String second) throws IOException;

  private static native long fileStoreBlockSize0(String path) throws IOException;

  public static InputStream newInputStream(Path path, OpenOption... options) throws IOException {
    Objects.requireNonNull(options);
    boolean deleteOnClose = false;
    for (OpenOption option : options) {
      Objects.requireNonNull(option);
      if (option == StandardOpenOption.WRITE || option == StandardOpenOption.APPEND) {
        throw new UnsupportedOperationException();
      } else if (option == StandardOpenOption.DELETE_ON_CLOSE) {
        deleteOnClose = true;
      }
    }
    if (path.getFileSystem() != FileSystems.getDefault()) {
      return path.getFileSystem().provider().newInputStream(path, options);
    }
    File file = toFile(path);
    validateInputTarget(file);
    InputStream input = new FileInputStream(file);
    deleteAfterOpening(file, input, deleteOnClose);
    return input;
  }

  public static OutputStream newOutputStream(Path path, OpenOption... options) throws IOException {
    Objects.requireNonNull(options);
    boolean append = false;
    boolean create = options.length == 0;
    boolean createNew = false;
    boolean deleteOnClose = false;
    boolean truncate = options.length == 0;
    for (OpenOption option : options) {
      Objects.requireNonNull(option);
      if (option == StandardOpenOption.APPEND) {
        append = true;
      } else if (option == StandardOpenOption.CREATE) {
        create = true;
      } else if (option == StandardOpenOption.CREATE_NEW) {
        createNew = true;
      } else if (option == StandardOpenOption.DELETE_ON_CLOSE) {
        deleteOnClose = true;
      } else if (option == StandardOpenOption.TRUNCATE_EXISTING) {
        truncate = true;
      } else if (option == StandardOpenOption.READ) {
        throw new IllegalArgumentException();
      } else if (option != StandardOpenOption.WRITE
          && option != StandardOpenOption.SYNC
          && option != StandardOpenOption.DSYNC
          && option != StandardOpenOption.SPARSE) {
        throw new UnsupportedOperationException();
      }
    }
    if (append && truncate) {
      throw new IllegalArgumentException();
    }
    File file = toFile(path);
    validateOutputTarget(file, create, createNew);
    if (append || truncate) {
      OutputStream output = new FileOutputStream(file, append && !truncate);
      deleteAfterOpening(file, output, deleteOnClose);
      return output;
    }
    if (!file.exists() && !file.createNewFile()) {
      throw new IOException("Unable to create file");
    }
    OutputStream output = new RandomAccessFileOutputStream(file);
    deleteAfterOpening(file, output, deleteOnClose);
    return output;
  }

  public static SeekableByteChannel newByteChannel(Path path, OpenOption... options) throws IOException {
    Objects.requireNonNull(options);
    HashSet<OpenOption> optionSet = new HashSet<OpenOption>();
    for (OpenOption option : options) {
      optionSet.add(Objects.requireNonNull(option));
    }
    return newByteChannel(path, optionSet);
  }

  public static SeekableByteChannel newByteChannel(
      Path path,
      Set<? extends OpenOption> options,
      FileAttribute<?>... attrs) throws IOException {
    Objects.requireNonNull(options);
    requireFileAttributes(attrs);
    boolean read = options.isEmpty();
    boolean write = false;
    boolean append = false;
    boolean create = false;
    boolean createNew = false;
    boolean deleteOnClose = false;
    boolean truncate = false;
    boolean sync = false;
    boolean dsync = false;
    boolean created = false;
    for (OpenOption option : options) {
      Objects.requireNonNull(option);
      if (option == StandardOpenOption.READ) {
        read = true;
      } else if (option == StandardOpenOption.WRITE) {
        write = true;
      } else if (option == StandardOpenOption.APPEND) {
        append = true;
        write = true;
      } else if (option == StandardOpenOption.CREATE) {
        create = true;
      } else if (option == StandardOpenOption.CREATE_NEW) {
        createNew = true;
      } else if (option == StandardOpenOption.DELETE_ON_CLOSE) {
        deleteOnClose = true;
      } else if (option == StandardOpenOption.TRUNCATE_EXISTING) {
        truncate = true;
      } else if (option == StandardOpenOption.SYNC) {
        sync = true;
      } else if (option == StandardOpenOption.DSYNC) {
        dsync = true;
      } else if (option != StandardOpenOption.SPARSE) {
        throw new UnsupportedOperationException();
      }
    }
    if (!read && !write) {
      read = true;
    }
    if (read && append) {
      throw new IllegalArgumentException();
    }
    if (append && truncate) {
      throw new IllegalArgumentException();
    }
    if (path.getFileSystem() != FileSystems.getDefault()) {
      return path.getFileSystem().provider().newByteChannel(path, options, attrs);
    }
    File file = toFile(path);
    validateOutputTarget(file, create, createNew);
    if (write && !file.exists() && (create || createNew)) {
      if (!file.createNewFile()) {
        throw new IOException("Unable to create file");
      }
      created = true;
    }
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    String mode = write ? (sync ? "rws" : dsync ? "rwd" : "rw") : "r";
    RandomAccessFile randomAccessFile = new RandomAccessFile(file, mode);
    if (write && truncate && !append) {
      randomAccessFile.setLength(0L);
    }
    if (append) {
      randomAccessFile.seek(randomAccessFile.length());
    }
    SeekableByteChannel channel = randomAccessFile.getChannel();
    try {
      if (created) {
        applyFileAttributes(path, attrs);
      }
      deleteAfterOpening(file, channel, deleteOnClose);
    } catch (IOException e) {
      channel.close();
      throw e;
    } catch (RuntimeException e) {
      try {
        channel.close();
      } catch (IOException ignored) {
      }
      throw e;
    }
    return channel;
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
    File file = createTemporaryFile(toFile(dir), prefix, "");
    if (!file.delete() || !file.mkdir()) {
      throw new IOException("Unable to create temporary directory");
    }
    Path path = file.toPath();
    applyFileAttributes(path, attrs);
    return path;
  }

  public static Path createFile(Path path, FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    File file = toFile(path);
    validateOutputTarget(file, true, true);
    if (!file.createNewFile()) {
      throw new IOException("Unable to create file");
    }
    applyFileAttributes(path, attrs);
    return path;
  }

  public static Path createDirectory(Path path, FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    File file = toFile(path);
    validateOutputTarget(file, true, true);
    if (!file.mkdir()) {
      throw new IOException("Unable to create directory");
    }
    applyFileAttributes(path, attrs);
    return path;
  }

  public static Path createLink(Path link, Path existing) throws IOException {
    File linkFile = toFile(link);
    File existingFile = toFile(existing);
    createHardLink0(linkFile.toString(), existingFile.toString());
    return link;
  }

  public static Path createSymbolicLink(Path link, Path target, FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    File linkFile = toFile(link);
    Path targetPath = Objects.requireNonNull(target);
    createSymbolicLink0(linkFile.toString(), targetPath.toString());
    return link;
  }

  public static Path createDirectories(Path path, FileAttribute<?>... attrs) throws IOException {
    requireFileAttributes(attrs);
    File file = toFile(path);
    if (file.exists()) {
      if (!file.isDirectory()) {
        throw new FileAlreadyExistsException(file.toString());
      }
      return path;
    }
    File ancestor = file.getParentFile();
    while (ancestor != null && !ancestor.exists()) {
      ancestor = ancestor.getParentFile();
    }
    if (ancestor != null && !ancestor.isDirectory()) {
      throw new FileSystemException(file.toString(), null, "Not a directory");
    }
    if (!file.mkdirs() && !file.isDirectory()) {
      throw new IOException("Unable to create directories");
    }
    applyFileAttributes(path, attrs);
    return path;
  }

  public static void delete(Path path) throws IOException {
    File file = toFile(path);
    if (!file.exists() && !isSymbolicLink(path)) {
      throw new NoSuchFileException(file.toString());
    }
    deleteExisting(file);
  }

  public static boolean deleteIfExists(Path path) throws IOException {
    File file = toFile(path);
    if (!file.exists() && !isSymbolicLink(path)) {
      return false;
    }
    deleteExisting(file);
    return true;
  }

  public static Path copy(Path source, Path target, CopyOption... options) throws IOException {
    Objects.requireNonNull(options);
    boolean replaceExisting = false;
    boolean copyAttributes = false;
    boolean followLinks = true;
    for (CopyOption option : options) {
      Objects.requireNonNull(option);
      if (option == StandardCopyOption.REPLACE_EXISTING) {
        replaceExisting = true;
      } else if (option == StandardCopyOption.COPY_ATTRIBUTES) {
        copyAttributes = true;
      } else if (option == LinkOption.NOFOLLOW_LINKS) {
        followLinks = false;
      } else {
        throw new UnsupportedOperationException();
      }
    }
    File sourceFile = toFile(source);
    File targetFile = toFile(target);
    boolean sourceSymbolicLink = !followLinks && isSymbolicLink(source);
    if (!sourceFile.exists() && !sourceSymbolicLink) {
      throw new NoSuchFileException(sourceFile.toString());
    }
    if (sourceSymbolicLink) {
      if (sourceFile.getAbsoluteFile().equals(targetFile.getAbsoluteFile())) {
        return target;
      }
    } else if (sourceFile.getCanonicalPath().equals(targetFile.getCanonicalPath())) {
      return target;
    }
    if (targetFile.exists() || isSymbolicLink(target)) {
      if (!replaceExisting) {
        throw new FileAlreadyExistsException(targetFile.toString());
      }
      deleteExisting(targetFile);
    }
    File targetParent = targetFile.getParentFile();
    if (targetParent != null) {
      if (!targetParent.exists()) {
        throw new NoSuchFileException(targetFile.toString());
      }
      if (!targetParent.isDirectory()) {
        throw new FileSystemException(targetFile.toString(), null, "Not a directory");
      }
    }
    if (sourceSymbolicLink) {
      createSymbolicLink(target, readSymbolicLink(source));
      return target;
    }
    if (sourceFile.isDirectory()) {
      if (!targetFile.mkdir()) {
        throw new IOException("Unable to create directory");
      }
      if (copyAttributes && !targetFile.setLastModified(sourceFile.lastModified())) {
        throw new IOException("Unable to copy file attributes");
      }
      return target;
    }
    InputStream input = new FileInputStream(sourceFile);
    try {
      OutputStream output = new FileOutputStream(targetFile);
      try {
        copyStream(input, output);
      } finally {
        output.close();
      }
    } finally {
      input.close();
    }
    if (copyAttributes && !targetFile.setLastModified(sourceFile.lastModified())) {
      throw new IOException("Unable to copy file attributes");
    }
    return target;
  }

  public static long copy(InputStream in, Path target, CopyOption... options) throws IOException {
    Objects.requireNonNull(in);
    Objects.requireNonNull(options);
    boolean replaceExisting = false;
    for (CopyOption option : options) {
      Objects.requireNonNull(option);
      if (option == StandardCopyOption.REPLACE_EXISTING) {
        replaceExisting = true;
      } else {
        throw new UnsupportedOperationException();
      }
    }
    File targetFile = toFile(target);
    if (targetFile.exists()) {
      if (!replaceExisting) {
        throw new FileAlreadyExistsException(targetFile.toString());
      }
      deleteExisting(targetFile);
    } else {
      File parent = targetFile.getParentFile();
      if (parent != null) {
        if (!parent.exists()) {
          throw new NoSuchFileException(targetFile.toString());
        }
        if (!parent.isDirectory()) {
          throw new FileSystemException(targetFile.toString(), null, "Not a directory");
        }
      }
    }
    OutputStream output = new FileOutputStream(targetFile);
    try {
      return copyStream(in, output);
    } finally {
      output.close();
    }
  }

  public static long copy(Path source, OutputStream out) throws IOException {
    Objects.requireNonNull(out);
    File sourceFile = toFile(source);
    if (!sourceFile.exists()) {
      throw new NoSuchFileException(sourceFile.toString());
    }
    InputStream input = new FileInputStream(sourceFile);
    try {
      return copyStream(input, out);
    } finally {
      input.close();
    }
  }

  public static Path move(Path source, Path target, CopyOption... options) throws IOException {
    Objects.requireNonNull(options);
    boolean atomicMove = false;
    boolean replaceExisting = false;
    for (CopyOption option : options) {
      Objects.requireNonNull(option);
      if (option == StandardCopyOption.ATOMIC_MOVE) {
        atomicMove = true;
      } else if (option == StandardCopyOption.REPLACE_EXISTING) {
        replaceExisting = true;
      } else if (option != LinkOption.NOFOLLOW_LINKS) {
        throw new UnsupportedOperationException();
      }
    }
    File sourceFile = toFile(source);
    File targetFile = toFile(target);
    if (!sourceFile.exists()) {
      throw new NoSuchFileException(sourceFile.toString());
    }
    if (sourceFile.getCanonicalPath().equals(targetFile.getCanonicalPath())) {
      return target;
    }
    if (targetFile.exists()) {
      if (!replaceExisting && !atomicMove) {
        throw new FileAlreadyExistsException(targetFile.toString());
      }
      deleteExisting(targetFile);
    }
    File targetParent = targetFile.getParentFile();
    if (targetParent != null) {
      if (!targetParent.exists()) {
        throw new NoSuchFileException(sourceFile.toString(), targetFile.toString(), null);
      }
      if (!targetParent.isDirectory()) {
        throw new FileSystemException(sourceFile.toString(), targetFile.toString(), "Not a directory");
      }
    }
    if (sourceFile.renameTo(targetFile)) {
      return target;
    }
    if (atomicMove) {
      throw new IOException("Unable to move file atomically");
    }
    copy(source, target, StandardCopyOption.REPLACE_EXISTING);
    delete(source);
    return target;
  }

  public static boolean exists(Path path, LinkOption... options) {
    boolean followLinks = followLinks(options);
    if (path.getFileSystem() != FileSystems.getDefault()) {
      try {
        path.getFileSystem().provider().checkAccess(path);
        return true;
      } catch (IOException e) {
        return false;
      }
    }
    File file = toFile(path);
    return file.exists() || (!followLinks && isSymbolicLink(path));
  }

  public static boolean notExists(Path path, LinkOption... options) {
    return !exists(path, options);
  }

  public static boolean isDirectory(Path path, LinkOption... options) {
    boolean followLinks = followLinks(options);
    if (path.getFileSystem() != FileSystems.getDefault()) {
      try {
        return readAttributes(path, BasicFileAttributes.class, options).isDirectory();
      } catch (IOException e) {
        return false;
      }
    }
    if (!followLinks && isSymbolicLink(path)) {
      return false;
    }
    return toFile(path).isDirectory();
  }

  public static boolean isRegularFile(Path path, LinkOption... options) {
    boolean followLinks = followLinks(options);
    if (path.getFileSystem() != FileSystems.getDefault()) {
      try {
        return readAttributes(path, BasicFileAttributes.class, options).isRegularFile();
      } catch (IOException e) {
        return false;
      }
    }
    if (!followLinks && isSymbolicLink(path)) {
      return false;
    }
    return toFile(path).isFile();
  }

  public static boolean isSymbolicLink(Path path) {
    File file = toFile(path);
    try {
      readSymbolicLink0(file.toString());
      return true;
    } catch (IOException e) {
      return false;
    }
  }

  public static Path readSymbolicLink(Path link) throws IOException {
    return Path.of(readSymbolicLink0(toFile(link).toString()));
  }

  public static long size(Path path) throws IOException {
    if (path.getFileSystem() != FileSystems.getDefault()) {
      return readAttributes(path, BasicFileAttributes.class).size();
    }
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    return file.length();
  }

  public static FileStore getFileStore(Path path) throws IOException {
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    final File storeFile = file.getAbsoluteFile();
    return new FileStore() {
      public String name() {
        File root = storeFile;
        while (root.getParentFile() != null) {
          root = root.getParentFile();
        }
        String name = root.getPath();
        return name.length() == 0 ? storeFile.getPath() : name;
      }

      public String type() {
        return "";
      }

      public boolean isReadOnly() {
        return !storeFile.canWrite();
      }

      public long getTotalSpace() throws IOException {
        return storeFile.getTotalSpace();
      }

      public long getUsableSpace() throws IOException {
        return storeFile.getUsableSpace();
      }

      public long getUnallocatedSpace() throws IOException {
        return storeFile.getFreeSpace();
      }

      public long getBlockSize() throws IOException {
        return fileStoreBlockSize0(storeFile.toString());
      }

      public boolean supportsFileAttributeView(Class<? extends FileAttributeView> type) {
        Class<? extends FileAttributeView> viewType = Objects.requireNonNull(type);
        return viewType == BasicFileAttributeView.class
            || viewType == FileOwnerAttributeView.class
            || viewType == PosixFileAttributeView.class;
      }

      public boolean supportsFileAttributeView(String name) {
        String viewName = Objects.requireNonNull(name);
        return viewName.equals("basic") || viewName.equals("owner") || viewName.equals("posix");
      }

      public <V extends FileStoreAttributeView> V getFileStoreAttributeView(Class<V> type) {
        Objects.requireNonNull(type);
        return null;
      }

      public Object getAttribute(String attribute) throws IOException {
        String attributeName = Objects.requireNonNull(attribute);
        if (attributeName.equals("totalSpace")) {
          return Long.valueOf(getTotalSpace());
        }
        if (attributeName.equals("usableSpace")) {
          return Long.valueOf(getUsableSpace());
        }
        if (attributeName.equals("unallocatedSpace")) {
          return Long.valueOf(getUnallocatedSpace());
        }
        throw new UnsupportedOperationException();
      }
    };
  }

  public static <A extends BasicFileAttributes> A readAttributes(
      Path path,
      Class<A> type,
      LinkOption... options) throws IOException {
    requireLinkOptions(options);
    Class<A> attributeType = Objects.requireNonNull(type);
    if (attributeType != BasicFileAttributes.class && attributeType != PosixFileAttributes.class) {
      throw new UnsupportedOperationException();
    }
    if (path.getFileSystem() != FileSystems.getDefault()) {
      return path.getFileSystem().provider().readAttributes(path, attributeType, options);
    }
    File file = toFile(path);
    boolean symbolicLink = !followLinks(options) && isSymbolicLink(path);
    if (!file.exists() && !symbolicLink) {
      throw new NoSuchFileException(file.toString());
    }
    if (attributeType == BasicFileAttributes.class) {
      return attributeType.cast(readBasicFileAttributes(file, symbolicLink));
    }
    return attributeType.cast(readPosixFileAttributes(file, symbolicLink));
  }

  public static <V extends FileAttributeView> V getFileAttributeView(
      final Path path,
      Class<V> type,
      LinkOption... options) {
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
            return Files.getOwner(path);
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
          return Files.getOwner(path);
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
    requireLinkOptions(options);
    String attributeString = Objects.requireNonNull(attributes);
    if (path.getFileSystem() != FileSystems.getDefault()) {
      return path.getFileSystem().provider().readAttributes(path, attributeString, options);
    }
    String viewName = attributeViewName(attributeString);
    String attributeNames = attributeNames(attributeString);
    File file = toFile(path);
    boolean symbolicLink = !followLinks(options) && isSymbolicLink(path);
    if (!file.exists() && !symbolicLink) {
      throw new NoSuchFileException(file.toString());
    }
    BasicFileAttributes basicAttributes = readBasicFileAttributes(file, symbolicLink);
    PosixFileAttributes posixAttributes =
        viewName.equals("posix") ? readPosixFileAttributes(file, symbolicLink) : null;
    UserPrincipal ownerAttribute = viewName.equals("owner") ? currentUserPrincipal() : null;
    HashMap<String, Object> values = new HashMap<String, Object>();
    if (attributeNames.equals("*")) {
      if (ownerAttribute != null) {
        putOwnerAttribute(values, ownerAttribute, "owner");
        return Collections.unmodifiableMap(values);
      }
      putBasicAttribute(values, basicAttributes, "lastModifiedTime");
      putBasicAttribute(values, basicAttributes, "lastAccessTime");
      putBasicAttribute(values, basicAttributes, "creationTime");
      putBasicAttribute(values, basicAttributes, "size");
      putBasicAttribute(values, basicAttributes, "isRegularFile");
      putBasicAttribute(values, basicAttributes, "isDirectory");
      putBasicAttribute(values, basicAttributes, "isSymbolicLink");
      putBasicAttribute(values, basicAttributes, "isOther");
      putBasicAttribute(values, basicAttributes, "fileKey");
      if (posixAttributes != null) {
        putPosixAttribute(values, posixAttributes, "owner");
        putPosixAttribute(values, posixAttributes, "group");
        putPosixAttribute(values, posixAttributes, "permissions");
      }
      return Collections.unmodifiableMap(values);
    }
    String[] names = attributeNames.split(",");
    for (String name : names) {
      if (name.length() == 0) {
        throw new IllegalArgumentException();
      }
      if (posixAttributes != null) {
        putPosixAttribute(values, posixAttributes, name);
      } else if (ownerAttribute != null) {
        putOwnerAttribute(values, ownerAttribute, name);
      } else {
        putBasicAttribute(values, basicAttributes, name);
      }
    }
    return Collections.unmodifiableMap(values);
  }

  public static Path setAttribute(Path path, String attribute, Object value, LinkOption... options)
      throws IOException {
    requireLinkOptions(options);
    String attributeString = Objects.requireNonNull(attribute);
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
    requireLinkOptions(options);
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    return FileTime.fromMillis(file.lastModified());
  }

  public static Path setLastModifiedTime(Path path, FileTime time) throws IOException {
    FileTime fileTime = Objects.requireNonNull(time);
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    if (!file.setLastModified(fileTime.toMillis())) {
      throw new IOException("Unable to set last modified time");
    }
    return path;
  }

  public static UserPrincipal getOwner(Path path, LinkOption... options) throws IOException {
    requireLinkOptions(options);
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    return currentUserPrincipal();
  }

  public static Path setOwner(Path path, UserPrincipal owner) throws IOException {
    Objects.requireNonNull(owner);
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    return path;
  }

  public static Set<PosixFilePermission> getPosixFilePermissions(Path path, LinkOption... options)
      throws IOException {
    requireLinkOptions(options);
    File file = toFile(path);
    if (!file.exists()) {
      throw new NoSuchFileException(file.toString());
    }
    return readPosixFilePermissions(file);
  }

  public static Path setPosixFilePermissions(Path path, Set<PosixFilePermission> perms)
      throws IOException {
    Set<PosixFilePermission> permissions = Objects.requireNonNull(perms);
    for (PosixFilePermission permission : permissions) {
      Objects.requireNonNull(permission);
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
    if (dir.getFileSystem() != FileSystems.getDefault()) {
      ArrayList<Path> paths = new ArrayList<Path>();
      DirectoryStream<Path> stream = newDirectoryStream(dir);
      try {
        for (Path path : stream) {
          paths.add(path);
        }
      } finally {
        stream.close();
      }
      return paths.stream();
    }
    File directory = toFile(dir);
    if (!directory.exists()) {
      throw new NoSuchFileException(directory.toString());
    }
    if (!directory.isDirectory()) {
      throw new NotDirectoryException(directory.toString());
    }
    File[] children = directory.listFiles();
    if (children == null) {
      throw new IOException("Unable to list directory");
    }
    ArrayList<Path> paths = new ArrayList<Path>(children.length);
    for (File child : children) {
      paths.add(child.toPath());
    }
    return paths.stream();
  }

  public static DirectoryStream<Path> newDirectoryStream(Path dir) throws IOException {
    return newDirectoryStream(dir, new DirectoryStream.Filter<Path>() {
      public boolean accept(Path entry) {
        return true;
      }
    });
  }

  public static DirectoryStream<Path> newDirectoryStream(Path dir, String glob) throws IOException {
    Objects.requireNonNull(glob);
    StringBuilder regex = new StringBuilder();
    int groupDepth = 0;
    for (int i = 0; i < glob.length(); i++) {
      char ch = glob.charAt(i);
      if (ch == '*') {
        regex.append(".*");
      } else if (ch == '?') {
        regex.append('.');
      } else if (ch == '{') {
        groupDepth++;
        regex.append('(');
      } else if (ch == '}') {
        if (groupDepth == 0) {
          throw new PatternSyntaxException("Unmatched closing brace", glob, i);
        }
        groupDepth--;
        regex.append(')');
      } else if (ch == ',' && groupDepth > 0) {
        regex.append('|');
      } else if (ch == '[') {
        int classStart = i;
        i++;
        if (i >= glob.length()) {
          throw new PatternSyntaxException("Missing closing bracket", glob, classStart);
        }
        regex.append('[');
        if (glob.charAt(i) == '!') {
          regex.append('^');
          i++;
        } else if (glob.charAt(i) == '^') {
          regex.append("\\^");
          i++;
        }
        boolean closed = false;
        for (; i < glob.length(); i++) {
          char classChar = glob.charAt(i);
          if (classChar == ']') {
            regex.append(']');
            closed = true;
            break;
          }
          if (classChar == '\\') {
            i++;
            if (i >= glob.length()) {
              throw new PatternSyntaxException("No character to escape", glob, i - 1);
            }
            classChar = glob.charAt(i);
          }
          if (classChar == '[' || classChar == ']' || classChar == '^' || classChar == '\\') {
            regex.append('\\');
          }
          regex.append(classChar);
        }
        if (!closed) {
          throw new PatternSyntaxException("Missing closing bracket", glob, classStart);
        }
      } else if (ch == '\\') {
        i++;
        if (i >= glob.length()) {
          throw new PatternSyntaxException("No character to escape", glob, i - 1);
        }
        ch = glob.charAt(i);
        if ("\\.[]{}()+-^$|*?".indexOf(ch) >= 0) {
          regex.append('\\');
        }
        regex.append(ch);
      } else {
        if ("\\.[]{}()+-^$|".indexOf(ch) >= 0) {
          regex.append('\\');
        }
        regex.append(ch);
      }
    }
    if (groupDepth != 0) {
      throw new PatternSyntaxException("Missing closing brace", glob, glob.length() - 1);
    }
    final String pattern = regex.toString();
    return newDirectoryStream(dir, new DirectoryStream.Filter<Path>() {
      public boolean accept(Path entry) {
        Path fileName = entry.getFileName();
        return fileName != null && fileName.toString().matches(pattern);
      }
    });
  }

  public static DirectoryStream<Path> newDirectoryStream(
      Path dir,
      DirectoryStream.Filter<? super Path> filter) throws IOException {
    final DirectoryStream.Filter<? super Path> directoryFilter = Objects.requireNonNull(filter);
    if (dir.getFileSystem() != FileSystems.getDefault()) {
      return dir.getFileSystem().provider().newDirectoryStream(dir, directoryFilter);
    }
    File directory = toFile(dir);
    if (!directory.exists()) {
      throw new NoSuchFileException(directory.toString());
    }
    if (!directory.isDirectory()) {
      throw new NotDirectoryException(directory.toString());
    }
    File[] children = directory.listFiles();
    if (children == null) {
      throw new IOException("Unable to list directory");
    }
    final ArrayList<Path> paths = new ArrayList<Path>(children.length);
    for (File child : children) {
      paths.add(child.toPath());
    }
    return new DirectoryStream<Path>() {
      private boolean closed;
      private boolean iteratorCreated;

      public Iterator<Path> iterator() {
        if (closed || iteratorCreated) {
          throw new IllegalStateException();
        }
        iteratorCreated = true;
        final Iterator<Path> iterator = paths.iterator();
        return new Iterator<Path>() {
          private Path nextPath;
          private boolean nextPathReady;

          public boolean hasNext() {
            if (closed) {
              return false;
            }
            if (nextPathReady) {
              return true;
            }
            while (iterator.hasNext()) {
              Path path = iterator.next();
              try {
                if (directoryFilter.accept(path)) {
                  nextPath = path;
                  nextPathReady = true;
                  return true;
                }
              } catch (IOException e) {
                throw new DirectoryIteratorException(e);
              }
            }
            return false;
          }

          public Path next() {
            if (closed || !hasNext()) {
              throw new NoSuchElementException();
            }
            Path path = nextPath;
            nextPath = null;
            nextPathReady = false;
            return path;
          }

          public void remove() {
            throw new UnsupportedOperationException();
          }
        };
      }

      public void close() {
        closed = true;
      }
    };
  }

  public static Stream<Path> walk(Path start, FileVisitOption... options) throws IOException {
    return walk(start, Integer.MAX_VALUE, options);
  }

  public static Stream<Path> walk(Path start, int maxDepth, FileVisitOption... options) throws IOException {
    Objects.requireNonNull(options);
    for (FileVisitOption option : options) {
      Objects.requireNonNull(option);
    }
    if (maxDepth < 0) {
      throw new IllegalArgumentException();
    }
    if (start.getFileSystem() != FileSystems.getDefault()) {
      ArrayList<Path> paths = new ArrayList<Path>();
      ArrayList<Path> pending = new ArrayList<Path>();
      ArrayList<Integer> depths = new ArrayList<Integer>();
      pending.add(start);
      depths.add(Integer.valueOf(0));
      while (!pending.isEmpty()) {
        int index = pending.size() - 1;
        Path path = pending.remove(index);
        int depth = depths.remove(index).intValue();
        BasicFileAttributes attributes = readAttributes(path, BasicFileAttributes.class);
        paths.add(path);
        if (depth < maxDepth && attributes.isDirectory()) {
          ArrayList<Path> children = new ArrayList<Path>();
          DirectoryStream<Path> stream = newDirectoryStream(path);
          try {
            for (Path child : stream) {
              children.add(child);
            }
          } finally {
            stream.close();
          }
          for (int i = children.size() - 1; i >= 0; i--) {
            pending.add(children.get(i));
            depths.add(Integer.valueOf(depth + 1));
          }
        }
      }
      return paths.stream();
    }
    File root = toFile(start);
    if (!root.exists()) {
      throw new NoSuchFileException(root.toString());
    }
    ArrayList<Path> paths = new ArrayList<Path>();
    ArrayList<File> files = new ArrayList<File>();
    ArrayList<Integer> depths = new ArrayList<Integer>();
    files.add(root);
    depths.add(Integer.valueOf(0));
    while (!files.isEmpty()) {
      int index = files.size() - 1;
      File file = files.remove(index);
      int depth = depths.remove(index).intValue();
      paths.add(file.toPath());
      if (depth < maxDepth && file.isDirectory()) {
        File[] children = file.listFiles();
        if (children == null) {
          throw new IOException("Unable to list directory");
        }
        for (int i = children.length - 1; i >= 0; i--) {
          files.add(children[i]);
          depths.add(Integer.valueOf(depth + 1));
        }
      }
    }
    return paths.stream();
  }

  public static Stream<Path> find(
      Path start,
      int maxDepth,
      final BiPredicate<Path, BasicFileAttributes> matcher,
      FileVisitOption... options) throws IOException {
    return walk(start, maxDepth, options).filter(new Predicate<Path>() {
      public boolean test(final Path path) {
        try {
          return matcher.test(path, Files.readAttributes(path, BasicFileAttributes.class));
        } catch (IOException e) {
          throw new UncheckedIOException(e);
        }
      }
    });
  }

  public static Path walkFileTree(Path start, FileVisitor<? super Path> visitor) throws IOException {
    FileVisitor<? super Path> fileVisitor = Objects.requireNonNull(visitor);
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
    Objects.requireNonNull(path);
    Objects.requireNonNull(path2);
    File firstFile = path.toFile();
    File secondFile = path2.toFile();
    if (firstFile.getCanonicalPath().equals(secondFile.getCanonicalPath())) {
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
    File first = toFile(path);
    File second = toFile(path2);
    String firstCanonical = first.getCanonicalPath();
    String secondCanonical = second.getCanonicalPath();
    if (firstCanonical.equals(secondCanonical)) {
      return true;
    }
    if (!first.exists()) {
      throw new NoSuchFileException(first.toString());
    }
    if (!second.exists()) {
      throw new NoSuchFileException(second.toString());
    }
    return isSameFile0(first.toString(), second.toString());
  }

  public static boolean isReadable(Path path) {
    return toFile(path).canRead();
  }

  public static boolean isWritable(Path path) {
    return toFile(path).canWrite();
  }

  public static boolean isExecutable(Path path) {
    return toFile(path).canExecute();
  }

  public static boolean isHidden(Path path) throws IOException {
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
    validateOutputTarget(toFile(path), create, createNew);
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

  private static void validateInputTarget(File file) throws IOException {
    if (!file.exists()) {
      File parent = file.getParentFile();
      if (parent != null && parent.exists() && !parent.isDirectory()) {
        throw new FileSystemException(file.toString(), null, "Not a directory");
      }
      throw new NoSuchFileException(file.toString());
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

  private static String temporaryPrefix(String prefix) {
    String result = prefix == null ? "" : prefix;
    while (result.length() < 3) {
      result += "_";
    }
    return result;
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

  private static void deleteAfterOpening(File file, Closeable stream, boolean deleteOnClose) throws IOException {
    if (!deleteOnClose) {
      return;
    }
    if (!file.delete()) {
      stream.close();
      throw new IOException("Unable to delete file");
    }
  }

  private static void deleteExisting(File file) throws IOException {
    if (isSymbolicLink(file.toPath())) {
      deletePath0(file.toString());
      return;
    }
    if (file.isDirectory()) {
      File[] children = file.listFiles();
      if (children != null && children.length > 0) {
        throw new DirectoryNotEmptyException(file.toString());
      }
    }
    if (!file.delete()) {
      throw new IOException("Unable to delete file");
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

final class RandomAccessFileOutputStream extends OutputStream {
  private final RandomAccessFile file;

  RandomAccessFileOutputStream(File path) throws IOException {
    file = new RandomAccessFile(path, "rw");
  }

  public void write(int value) throws IOException {
    file.write(value);
  }

  public void write(byte[] bytes, int offset, int length) throws IOException {
    file.write(bytes, offset, length);
  }

  public void close() throws IOException {
    file.close();
  }
}
