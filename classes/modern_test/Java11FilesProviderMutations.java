package classes.modern_test;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.AccessMode;
import java.nio.file.CopyOption;
import java.nio.file.DirectoryStream;
import java.nio.file.FileStore;
import java.nio.file.FileSystem;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.OpenOption;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.FileAttributeView;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.UserPrincipalLookupService;
import java.nio.file.spi.FileSystemProvider;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

public class Java11FilesProviderMutations {
  public static void main(String[] args) throws Exception {
    ProbeProvider provider = new ProbeProvider();
    ProbePath path = provider.path("path");
    ProbePath other = provider.path("other");

    Path created = Files.createFile(path, (FileAttribute<?>[]) null);
    System.out.println("create-file:" + (created == path) + ":" +
        provider.operation.equals("newByteChannel") + ":" +
        provider.nullAttributes + ":" +
        provider.createNewAndWrite + ":" +
        provider.channelClosed.get());

    Path directory = Files.createDirectory(path, (FileAttribute<?>[]) null);
    System.out.println("create-directory:" + (directory == path) + ":" +
        provider.operation.equals("createDirectory") + ":" + provider.nullAttributes);

    Path link = Files.createLink(path, other);
    System.out.println("create-link:" + (link == path) + ":" +
        provider.operation.equals("createLink") + ":" +
        (provider.firstPath == path) + ":" + (provider.secondPath == other));

    Path symbolicLink = Files.createSymbolicLink(path, other, (FileAttribute<?>[]) null);
    System.out.println("create-symbolic-link:" + (symbolicLink == path) + ":" +
        provider.operation.equals("createSymbolicLink") + ":" +
        (provider.firstPath == path) + ":" + (provider.secondPath == other) + ":" +
        provider.nullAttributes);

    Files.delete(path);
    System.out.println("delete:" + provider.operation.equals("delete") + ":" +
        (provider.firstPath == path));

    provider.deleteIfExistsResult = false;
    System.out.println("delete-if-exists:" + Files.deleteIfExists(path) + ":" +
        provider.operation.equals("deleteIfExists") + ":" +
        (provider.firstPath == path));

    Path copied = Files.copy(path, other, (CopyOption[]) null);
    System.out.println("copy:" + (copied == other) + ":" +
        provider.operation.equals("copy") + ":" +
        (provider.firstPath == path) + ":" + (provider.secondPath == other) + ":" +
        provider.nullCopyOptions);

    Path moved = Files.move(path, other, (CopyOption[]) null);
    System.out.println("move:" + (moved == other) + ":" +
        provider.operation.equals("move") + ":" +
        (provider.firstPath == path) + ":" + (provider.secondPath == other) + ":" +
        provider.nullCopyOptions);

    ProbeProvider foreignSourceProvider = new ProbeProvider();
    ProbeProvider foreignTargetProvider = new ProbeProvider();
    ProbePath foreignSource = foreignSourceProvider.path("foreign-source");
    ProbePath foreignTarget = foreignTargetProvider.path("foreign-target");
    foreignSourceProvider.basicAttributes = new ProbeBasicFileAttributes();
    foreignSourceProvider.inputReadFailure = new IOException("read-primary");
    foreignSourceProvider.inputCloseFailure = new IOException("close-secondary");
    foreignTargetProvider.pathExists = false;
    try {
      Files.copy(foreignSource, foreignTarget);
      System.out.println("foreign-read-close:copied");
    } catch (IOException e) {
      Throwable[] suppressed = e.getSuppressed();
      System.out.println("foreign-read-close:" + e.getClass().getSimpleName() + ":" +
          e.getMessage() + ":" + suppressed.length + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getClass().getSimpleName()) + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getMessage()) + ":" +
          foreignSourceProvider.inputClosed + ":" + foreignTargetProvider.targetCreated);
    }

    foreignSourceProvider.inputReadFailure = null;
    foreignSourceProvider.inputCloseFailure = null;
    foreignSourceProvider.inputData = new byte[] { 1 };
    foreignTargetProvider.pathExists = false;
    foreignTargetProvider.targetCreated = false;
    foreignTargetProvider.setTimesCalled = false;
    foreignTargetProvider.deleteCalled = false;
    foreignTargetProvider.setTimesFailure = new IllegalStateException("times-runtime");
    foreignTargetProvider.deleteFailure = null;
    try {
      Files.copy(
          foreignSource,
          foreignTarget,
          java.nio.file.StandardCopyOption.COPY_ATTRIBUTES);
      System.out.println("foreign-times-runtime:copied");
    } catch (RuntimeException e) {
      System.out.println("foreign-times-runtime:" + e.getClass().getSimpleName() + ":" +
          e.getMessage() + ":" + e.getSuppressed().length + ":" +
          foreignTargetProvider.targetCreated + ":" +
          foreignTargetProvider.setTimesCalled + ":" +
          foreignTargetProvider.deleteCalled + ":" + foreignTargetProvider.pathExists);
    }

    foreignTargetProvider.pathExists = false;
    foreignTargetProvider.targetCreated = false;
    foreignTargetProvider.setTimesCalled = false;
    foreignTargetProvider.deleteCalled = false;
    foreignTargetProvider.setTimesFailure = new IOException("times-io");
    foreignTargetProvider.deleteFailure = new IOException("delete-secondary");
    try {
      Files.copy(
          foreignSource,
          foreignTarget,
          java.nio.file.StandardCopyOption.COPY_ATTRIBUTES);
      System.out.println("foreign-times-io-delete:copied");
    } catch (IOException e) {
      Throwable[] suppressed = e.getSuppressed();
      System.out.println("foreign-times-io-delete:" + e.getClass().getSimpleName() + ":" +
          e.getMessage() + ":" + suppressed.length + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getClass().getSimpleName()) + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getMessage()) + ":" +
          foreignTargetProvider.targetCreated + ":" +
          foreignTargetProvider.setTimesCalled + ":" +
          foreignTargetProvider.deleteCalled + ":" + foreignTargetProvider.pathExists);
    }

    foreignTargetProvider.pathExists = false;
    foreignTargetProvider.targetCreated = false;
    foreignTargetProvider.outputClosed = false;
    foreignTargetProvider.outputWriteFailure = new IOException("target-write-primary");
    foreignTargetProvider.outputCloseFailure = new IOException("target-close-secondary");
    InputStream streamSource = foreignSourceProvider.newInputStream(foreignSource);
    try {
      Files.copy(streamSource, foreignTarget);
      System.out.println("stream-to-path-write-close:copied");
    } catch (IOException e) {
      Throwable[] suppressed = e.getSuppressed();
      System.out.println("stream-to-path-write-close:" + e.getClass().getSimpleName() + ":" +
          e.getMessage() + ":" + suppressed.length + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getClass().getSimpleName()) + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getMessage()) + ":" +
          foreignTargetProvider.targetCreated + ":" + foreignTargetProvider.outputClosed);
    }
    streamSource.close();

    foreignSourceProvider.inputClosed = false;
    foreignSourceProvider.inputReadFailure = new IOException("path-read-primary");
    foreignSourceProvider.inputCloseFailure = new IOException("path-close-secondary");
    OutputStream streamTarget = new OutputStream() {
      public void write(int value) {
      }
    };
    try {
      Files.copy(foreignSource, streamTarget);
      System.out.println("path-to-stream-read-close:copied");
    } catch (IOException e) {
      Throwable[] suppressed = e.getSuppressed();
      System.out.println("path-to-stream-read-close:" + e.getClass().getSimpleName() + ":" +
          e.getMessage() + ":" + suppressed.length + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getClass().getSimpleName()) + ":" +
          (suppressed.length == 0 ? "none" : suppressed[0].getMessage()) + ":" +
          foreignSourceProvider.inputClosed);
    }
  }

  private static final class ProbeProvider extends FileSystemProvider {
    private final ProbeFileSystem fileSystem = new ProbeFileSystem(this);
    private String operation;
    private Path firstPath;
    private Path secondPath;
    private boolean nullAttributes;
    private boolean createNewAndWrite;
    private boolean deleteIfExistsResult;
    private boolean nullCopyOptions;
    private final AtomicBoolean channelClosed = new AtomicBoolean();
    private BasicFileAttributes basicAttributes;
    private byte[] inputData = new byte[0];
    private IOException inputReadFailure;
    private IOException inputCloseFailure;
    private boolean inputClosed;
    private IOException outputWriteFailure;
    private IOException outputCloseFailure;
    private boolean outputClosed;
    private boolean pathExists = true;
    private boolean targetCreated;
    private boolean setTimesCalled;
    private boolean deleteCalled;
    private Throwable setTimesFailure;
    private IOException deleteFailure;

    ProbePath path(String value) {
      return new ProbePath(fileSystem, value);
    }

    public String getScheme() {
      return "probe";
    }

    public FileSystem newFileSystem(URI uri, Map<String, ?> env) {
      throw new UnsupportedOperationException();
    }

    public FileSystem getFileSystem(URI uri) {
      return fileSystem;
    }

    public Path getPath(URI uri) {
      return path(uri.getPath());
    }

    public InputStream newInputStream(Path path, OpenOption... options) {
      inputClosed = false;
      return new InputStream() {
        private int position;

        public int read() throws IOException {
          if (inputReadFailure != null) {
            throw inputReadFailure;
          }
          return position < inputData.length ? inputData[position++] & 0xff : -1;
        }

        public void close() throws IOException {
          inputClosed = true;
          if (inputCloseFailure != null) {
            throw inputCloseFailure;
          }
        }
      };
    }

    public OutputStream newOutputStream(Path path, OpenOption... options) {
      targetCreated = true;
      pathExists = true;
      outputClosed = false;
      return new OutputStream() {
        public void write(int value) throws IOException {
          if (outputWriteFailure != null) {
            throw outputWriteFailure;
          }
        }

        public void close() throws IOException {
          outputClosed = true;
          if (outputCloseFailure != null) {
            throw outputCloseFailure;
          }
        }
      };
    }

    public SeekableByteChannel newByteChannel(
        Path path,
        Set<? extends OpenOption> options,
        FileAttribute<?>... attrs) {
      operation = "newByteChannel";
      firstPath = path;
      nullAttributes = attrs == null;
      createNewAndWrite = options.contains(java.nio.file.StandardOpenOption.CREATE_NEW)
          && options.contains(java.nio.file.StandardOpenOption.WRITE)
          && options.size() == 2;
      channelClosed.set(false);
      return new ProbeChannel(channelClosed);
    }

    public DirectoryStream<Path> newDirectoryStream(
        Path dir,
        DirectoryStream.Filter<? super Path> filter) {
      throw new UnsupportedOperationException();
    }

    public void createDirectory(Path dir, FileAttribute<?>... attrs) {
      operation = "createDirectory";
      firstPath = dir;
      nullAttributes = attrs == null;
    }

    public void createSymbolicLink(Path link, Path target, FileAttribute<?>... attrs) {
      operation = "createSymbolicLink";
      firstPath = link;
      secondPath = target;
      nullAttributes = attrs == null;
    }

    public void createLink(Path link, Path existing) {
      operation = "createLink";
      firstPath = link;
      secondPath = existing;
    }

    public void delete(Path path) throws IOException {
      operation = "delete";
      firstPath = path;
      deleteCalled = true;
      if (deleteFailure != null) {
        throw deleteFailure;
      }
      pathExists = false;
    }

    public boolean deleteIfExists(Path path) {
      operation = "deleteIfExists";
      firstPath = path;
      return deleteIfExistsResult;
    }

    public void copy(Path source, Path target, CopyOption... options) {
      operation = "copy";
      firstPath = source;
      secondPath = target;
      nullCopyOptions = options == null;
    }

    public void move(Path source, Path target, CopyOption... options) {
      operation = "move";
      firstPath = source;
      secondPath = target;
      nullCopyOptions = options == null;
    }

    public boolean isSameFile(Path path, Path path2) {
      return path == path2;
    }

    public boolean isHidden(Path path) {
      return false;
    }

    public FileStore getFileStore(Path path) {
      throw new UnsupportedOperationException();
    }

    public void checkAccess(Path path, AccessMode... modes) throws IOException {
      if (!pathExists) {
        throw new NoSuchFileException(path.toString());
      }
    }

    public <V extends FileAttributeView> V getFileAttributeView(
        Path path,
        Class<V> type,
        LinkOption... options) {
      if (type == BasicFileAttributeView.class) {
        return type.cast(new BasicFileAttributeView() {
          public String name() {
            return "basic";
          }

          public BasicFileAttributes readAttributes() {
            return basicAttributes;
          }

          public void setTimes(
              FileTime lastModifiedTime,
              FileTime lastAccessTime,
              FileTime createTime) throws IOException {
            setTimesCalled = true;
            if (setTimesFailure instanceof IOException) {
              throw (IOException) setTimesFailure;
            }
            if (setTimesFailure instanceof RuntimeException) {
              throw (RuntimeException) setTimesFailure;
            }
            if (setTimesFailure instanceof Error) {
              throw (Error) setTimesFailure;
            }
          }
        });
      }
      return null;
    }

    public <A extends BasicFileAttributes> A readAttributes(
        Path path,
        Class<A> type,
        LinkOption... options) {
      if (type == BasicFileAttributes.class && basicAttributes != null) {
        return type.cast(basicAttributes);
      }
      throw new UnsupportedOperationException();
    }

    public Map<String, Object> readAttributes(
        Path path,
        String attributes,
        LinkOption... options) {
      throw new UnsupportedOperationException();
    }

    public void setAttribute(
        Path path,
        String attribute,
        Object value,
        LinkOption... options) {
      throw new UnsupportedOperationException();
    }
  }

  private static final class ProbeBasicFileAttributes implements BasicFileAttributes {
    private final FileTime time = FileTime.fromMillis(123456789L);

    public FileTime lastModifiedTime() {
      return time;
    }

    public FileTime lastAccessTime() {
      return time;
    }

    public FileTime creationTime() {
      return time;
    }

    public boolean isRegularFile() {
      return true;
    }

    public boolean isDirectory() {
      return false;
    }

    public boolean isSymbolicLink() {
      return false;
    }

    public boolean isOther() {
      return false;
    }

    public long size() {
      return 1L;
    }

    public Object fileKey() {
      return null;
    }
  }

  private static final class ProbeFileSystem extends FileSystem {
    private final ProbeProvider provider;

    ProbeFileSystem(ProbeProvider provider) {
      this.provider = provider;
    }

    public FileSystemProvider provider() {
      return provider;
    }

    public void close() {
    }

    public boolean isOpen() {
      return true;
    }

    public boolean isReadOnly() {
      return false;
    }

    public String getSeparator() {
      return "/";
    }

    public Iterable<Path> getRootDirectories() {
      return Collections.emptyList();
    }

    public Iterable<FileStore> getFileStores() {
      return Collections.emptyList();
    }

    public Set<String> supportedFileAttributeViews() {
      return Collections.emptySet();
    }

    public Path getPath(String first, String... more) {
      return new ProbePath(this, first);
    }

    public PathMatcher getPathMatcher(String syntaxAndPattern) {
      throw new UnsupportedOperationException();
    }

    public UserPrincipalLookupService getUserPrincipalLookupService() {
      throw new UnsupportedOperationException();
    }

    public WatchService newWatchService() {
      throw new UnsupportedOperationException();
    }
  }

  private static final class ProbePath implements Path {
    private final ProbeFileSystem fileSystem;
    private final String value;

    ProbePath(ProbeFileSystem fileSystem, String value) {
      this.fileSystem = fileSystem;
      this.value = value;
    }

    public FileSystem getFileSystem() {
      return fileSystem;
    }

    public boolean isAbsolute() {
      return false;
    }

    public Path getRoot() {
      return null;
    }

    public Path getFileName() {
      return this;
    }

    public Path getParent() {
      return null;
    }

    public int getNameCount() {
      return 1;
    }

    public Path getName(int index) {
      if (index != 0) {
        throw new IllegalArgumentException();
      }
      return this;
    }

    public Path subpath(int beginIndex, int endIndex) {
      if (beginIndex != 0 || endIndex != 1) {
        throw new IllegalArgumentException();
      }
      return this;
    }

    public boolean startsWith(Path other) {
      return equals(other);
    }

    public boolean startsWith(String other) {
      return value.equals(other);
    }

    public boolean endsWith(Path other) {
      return equals(other);
    }

    public boolean endsWith(String other) {
      return value.equals(other);
    }

    public Path normalize() {
      return this;
    }

    public Path resolve(Path other) {
      throw new UnsupportedOperationException();
    }

    public Path resolve(String other) {
      throw new UnsupportedOperationException();
    }

    public Path resolveSibling(Path other) {
      throw new UnsupportedOperationException();
    }

    public Path resolveSibling(String other) {
      throw new UnsupportedOperationException();
    }

    public Path relativize(Path other) {
      throw new UnsupportedOperationException();
    }

    public URI toUri() {
      return URI.create("probe:///" + value);
    }

    public Path toAbsolutePath() {
      return this;
    }

    public Path toRealPath(LinkOption... options) {
      return this;
    }

    public java.io.File toFile() {
      throw new UnsupportedOperationException("provider path must not become a File");
    }

    public WatchKey register(
        WatchService watcher,
        WatchEvent.Kind<?>[] events,
        WatchEvent.Modifier... modifiers) {
      throw new UnsupportedOperationException();
    }

    public WatchKey register(WatchService watcher, WatchEvent.Kind<?>... events) {
      throw new UnsupportedOperationException();
    }

    public Iterator<Path> iterator() {
      return Collections.<Path>singleton(this).iterator();
    }

    public int compareTo(Path other) {
      return value.compareTo(other.toString());
    }

    public String toString() {
      return value;
    }
  }

  private static final class ProbeChannel implements SeekableByteChannel {
    private final AtomicBoolean closed;

    ProbeChannel(AtomicBoolean closed) {
      this.closed = closed;
    }

    public int read(ByteBuffer dst) {
      return -1;
    }

    public int write(ByteBuffer src) {
      int remaining = src.remaining();
      src.position(src.limit());
      return remaining;
    }

    public long position() {
      return 0;
    }

    public SeekableByteChannel position(long newPosition) {
      return this;
    }

    public long size() {
      return 0;
    }

    public SeekableByteChannel truncate(long size) {
      return this;
    }

    public boolean isOpen() {
      return !closed.get();
    }

    public void close() {
      closed.set(true);
    }
  }
}
