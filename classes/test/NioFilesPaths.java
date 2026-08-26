package classes.test;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileOwnerAttributeView;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFileAttributes;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

class NioFilesPaths {
  static void printFile(Path fPath) throws IOException {
    Files.lines(fPath).forEach(System.out::println);
  }

  private static FileSystem dfs = FileSystems.getDefault();

  public static void main(String[] args) throws IOException {
    final String testDir = "./classes/test/data/FileOps";
    final Path testDirPath = Paths.get("./classes/test/data/FileOps");
    // I like scopes.
    {
      // This file does not exist.
      final File f = Paths.get("/dfsd/dsfds").toFile();
      try {
        BufferedReader reader = new BufferedReader(new FileReader(f));
      } catch (Exception e) {
        System.out.println("Successfully threw exception for nonexistent file.");
      }
    }
    {
      Path p = Paths.get("");
      System.out.println("Is '' an absolute path?: " + p.isAbsolute());
      {
        Path pAbs = p.toAbsolutePath();
        Path pNorm = p.normalize();
        System.out.println("Real path:" + pNorm);
        System.out.println("Does the absolute path of '' exist?: " + Files.exists(pAbs));
        System.out.println("Does the normalized path of '' exist?: " + Files.exists(pNorm));
        System.out.println("Does abspath == norm.abspath?: " + (pAbs == pNorm.toAbsolutePath()));
        System.out.println("Does abspath.real == normalized path?: " + (pAbs.toRealPath() == pNorm));
      }
      System.out.println("Does '' exist?: " + Files.exists(p));
      System.out.println("Does '' exist without following links?: "
          + Files.exists(p, LinkOption.NOFOLLOW_LINKS));
      System.out.println("Is '' a directory?: " + Files.isDirectory(p));
      System.out.println("Is '' a directory without following links?: "
          + Files.isDirectory(p, LinkOption.NOFOLLOW_LINKS));
      System.out.println("Is '' a regular file?: " + Files.isRegularFile(p));
      System.out.println("Is '' a regular file without following links?: "
          + Files.isRegularFile(p, LinkOption.NOFOLLOW_LINKS));
      try {
        Files.size(p);
        System.out.println("Can the size of '' be read?: true");
      } catch (IOException e) {
        System.out.println("Can the size of '' be read?: false");
      }
      try {
        BasicFileAttributes attributes = Files.readAttributes(p, BasicFileAttributes.class);
        System.out.println("Do typed attributes identify '' as a directory?: "
            + attributes.isDirectory());
      } catch (IOException e) {
        System.out.println("Do typed attributes identify '' as a directory?: false");
      }
      try {
        Map<String, Object> attributes = Files.readAttributes(
            p, "basic:isDirectory,size", LinkOption.NOFOLLOW_LINKS);
        System.out.println("Do string attributes identify '' as a directory?: "
            + (Boolean.TRUE.equals(attributes.get("isDirectory"))
                && attributes.get("size") instanceof Long));
      } catch (IOException e) {
        System.out.println("Do string attributes identify '' as a directory?: false");
      }
      try {
        System.out.println("Does getAttribute identify '' as a directory?: "
            + Boolean.TRUE.equals(Files.getAttribute(p, "basic:isDirectory")));
      } catch (IOException e) {
        System.out.println("Does getAttribute identify '' as a directory?: false");
      }
      try {
        BasicFileAttributeView view = Files.getFileAttributeView(
            p, BasicFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
        System.out.println("Does the attribute view identify '' as a directory?: "
            + view.readAttributes().isDirectory());
      } catch (IOException e) {
        System.out.println("Does the attribute view identify '' as a directory?: false");
      }
      try {
        System.out.println("Does the last-modified time of '' match its attributes?: "
            + Files.getLastModifiedTime(p).equals(
                Files.readAttributes(p, BasicFileAttributes.class).lastModifiedTime()));
      } catch (IOException e) {
        System.out.println("Does the last-modified time of '' match its attributes?: false");
      }
      PosixFileAttributes posixAttributes =
          Files.readAttributes(p, PosixFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
      try {
        System.out.println("Does the owner of '' match its attributes?: "
            + Files.getOwner(p, LinkOption.NOFOLLOW_LINKS).getName()
                .equals(posixAttributes.owner().getName()));
      } catch (IOException e) {
        System.out.println("Does the owner of '' match its attributes?: false");
      }
      try {
        System.out.println("Do the POSIX permissions of '' match its attributes?: "
            + Files.getPosixFilePermissions(p, LinkOption.NOFOLLOW_LINKS)
                .equals(posixAttributes.permissions()));
      } catch (IOException e) {
        System.out.println("Do the POSIX permissions of '' match its attributes?: false");
      }
      try {
        FileOwnerAttributeView ownerView = Files.getFileAttributeView(
            p, FileOwnerAttributeView.class, LinkOption.NOFOLLOW_LINKS);
        System.out.println("Does the owner view of '' match its attributes?: "
            + ownerView.getOwner().getName().equals(posixAttributes.owner().getName()));
      } catch (IOException e) {
        System.out.println("Does the owner view of '' match its attributes?: false");
      }
      try {
        PosixFileAttributeView posixView = Files.getFileAttributeView(
            p, PosixFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
        System.out.println("Does the POSIX view owner of '' match its attributes?: "
            + posixView.getOwner().getName().equals(posixAttributes.owner().getName()));
      } catch (IOException e) {
        System.out.println("Does the POSIX view owner of '' match its attributes?: false");
      }
      try {
        FileStore providerStore = p.getFileSystem().provider().getFileStore(p);
        FileStore emptyStore = Files.getFileStore(p);
        FileStore absoluteStore = Files.getFileStore(p.toAbsolutePath());
        System.out.println("Does the file store of '' match the absolute current directory?: "
            + (emptyStore.equals(providerStore) && emptyStore.equals(absoluteStore)));
        System.out.println("Does the file store of '' report a type?: "
            + !emptyStore.type().isEmpty());
      } catch (IOException e) {
        System.out.println("Does the file store of '' match the absolute current directory?: false");
        System.out.println("Does the file store of '' report a type?: false");
      }
      try {
        Set<Path> providerEntries = new HashSet<Path>();
        try (DirectoryStream<Path> stream = p.getFileSystem().provider().newDirectoryStream(
            p, entry -> true)) {
          for (Path entry : stream) {
            providerEntries.add(entry);
          }
        }
        Set<Path> facadeEntries = new HashSet<Path>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(p)) {
          for (Path entry : stream) {
            facadeEntries.add(entry);
          }
        }
        Set<Path> listedEntries = new HashSet<Path>();
        try (java.util.stream.Stream<Path> stream = Files.list(p)) {
          stream.forEach(entry -> listedEntries.add(entry));
        }
        System.out.println("Does the directory stream of '' match the provider?: "
            + facadeEntries.equals(providerEntries));
        System.out.println("Does the list of '' match the provider?: "
            + listedEntries.equals(providerEntries));
      } catch (IOException e) {
        System.out.println("Does the directory stream of '' match the provider?: false");
        System.out.println("Does the list of '' match the provider?: false");
      }
      try (java.util.stream.Stream<Path> stream = Files.walk(p, 0)) {
        Path[] walked = stream.toArray(Path[]::new);
        System.out.println("Does the walk of '' at depth zero contain only itself?: "
            + (walked.length == 1 && walked[0].equals(p)));
      } catch (IOException e) {
        System.out.println("Does the walk of '' at depth zero contain only itself?: false");
      }
      try (java.util.stream.Stream<Path> stream =
          Files.find(p, 0, (path, attributes) -> attributes.isDirectory())) {
        Path[] found = stream.toArray(Path[]::new);
        System.out.println("Does the find of '' at depth zero identify the current directory?: "
            + (found.length == 1 && found[0].equals(p)));
      } catch (IOException e) {
        System.out.println("Does the find of '' at depth zero identify the current directory?: false");
      }
      try (java.nio.channels.SeekableByteChannel channel = Files.newByteChannel(p)) {
        System.out.println("Can a byte channel open ''?: " + channel.isOpen());
      } catch (IOException e) {
        System.out.println("Can a byte channel open ''?: false");
      }
      try (InputStream input = Files.newInputStream(p)) {
        System.out.println("Can an input stream open ''?: " + (input != null));
      } catch (IOException e) {
        System.out.println("Can an input stream open ''?: false");
      }
      System.out.println("Can you read from ''?: " + Files.isReadable(p));
      System.out.println("Can you write to ''?: " + Files.isWritable(p));
      System.out.println("Can you execute ''?: " + Files.isExecutable(p));
    }

    final Path[] children;
    try (java.util.stream.Stream<Path> stream = Files.list(testDirPath)) {
      children = stream.toArray(Path[]::new);
    }
    // Sort by name to avoid nondeterministic file orderings.
    Arrays.sort(children);
    for (final Path child : children) {
      System.out.println("["+child.toString().replace('\\', '/')+"]");
    }

    {
      final Path p = testDirPath.resolve("contains_data.txt");
      System.out.println("Does contains_data.txt exist?: " + Files.exists(p));
      System.out.println("Length of contains_data.txt: " + Files.size(p));
    }

    {
      final Path p = Paths.get(System.getProperty("java.io.tmpdir"));
      System.out.println("Is the tmpdir a directory?: " + Files.isDirectory(p));
      System.out.println("Can I write to it?: " + Files.isWritable(p));
    }

    {
      final Path p = Paths.get(System.getProperty("java.io.tmpdir"), "temp_delete_me.txt");
      System.out.println("Does temp_delete_me.txt exist?: " + Files.exists(p));
      System.out.println("Creating file...");
      Files.createFile(p);
      System.out.println("And does it exist now?: " + Files.exists(p));
      final long lm = Files.getLastModifiedTime(p).toMillis();
      System.out.println("Can I write to it?: " + Files.isWritable(p));
      // BrowserFS doesn't implement chmod anymore for the temporary file system.
      // f.setWritable(false);
      // System.out.println("How about now?: " + f.canWrite());
      // f.setWritable(true);
      // System.out.println("And now?: " + f.canWrite());
      System.out.println("File size: " + Files.size(p));

      // write over empty file
      BufferedWriter bfw = Files.newBufferedWriter(p);
      bfw.write("Why, hello there!\n");
      bfw.close();

      // mtime is platform-specific and not guaranteed to update
      Files.setLastModifiedTime(p, FileTime.fromMillis(System.currentTimeMillis()+1337));  // padding for fast execution
      System.out.println("Last modified updated?: " + (Files.getLastModifiedTime(p).toMillis() > lm));
      System.out.println("New file size: " + Files.size(p));
      System.out.println("File contents:");
      printFile(p);
      // append a line
      System.out.println("Appending to file's end...");
      final BufferedWriter bfw2 = Files.newBufferedWriter(p, StandardOpenOption.APPEND);
      bfw2.write("A second line");
      bfw2.close();

      System.out.println("New file size: " + Files.size(p));
      System.out.println("File contents:");
      printFile(p);

      // overwrite some text
      /*System.out.println("Overwriting some text...");
      RandomAccessFile raf = new RandomAccessFile(f, "rw");
      raf.skipBytes(17);
      raf.writeChars("KILROY WAS HERE\n");
      raf.close();
      System.out.println("File size: " + f.length());
      System.out.println("File contents:");
      printFile(f);*/
      System.out.println("Deleting file: " + Files.deleteIfExists(p));
      System.out.println("Does the file exist?: " + Files.exists(p));
    }

    // Create and delete a directory.
    {
      Path p = Paths.get(System.getProperty("java.io.tmpdir"),"tempDir");
      System.out.println("Does tempDir exist?: " + Files.exists(p));
      System.out.println("Making tempDir...");
      Files.createDirectory(p);
      System.out.println("Does tempDir exist now?: " + Files.exists(p));
      System.out.println("Deleting tempDir: " + Files.deleteIfExists(p));
      System.out.println("Does tempDir exist now?: " + Files.exists(p));
    }
    {
      Path p = Paths.get(System.getProperty("java.io.tmpdir"), "tempDir/tempDir");
      Path p2 = Paths.get(System.getProperty("java.io.tmpdir"), "tempDir");
      System.out.println("Does tempDir/tempDir exist?: " + Files.exists(p));
      System.out.println("Making tempDir/tempDir....");
      Files.createDirectories(p);
      System.out.println("Does tempDir/tempDir exist now?: " + Files.exists(p));
      System.out.println("Does tempDir exist now?: " + Files.exists(p2));
      try {
        System.out.println("Deleting tempDir (should fail -- nonempty): " + Files.deleteIfExists(p2));
      } catch (final DirectoryNotEmptyException dne) {
        System.out.println("Couldn't delete non-empty directory");
      }
      System.out.println("Deleting tempDir/tempDir: " + Files.deleteIfExists(p));
      System.out.println("Deleting tempDir: " + Files.deleteIfExists(p2));
      System.out.println("Does tempDir/tempDir exist now?: " + Files.exists(p));
      System.out.println("Does tempDir exist now?: " + Files.exists(p2));
    }

    {
      final Path p = Paths.get(System.getProperty("java.io.tmpdir"));
      try {
        System.out.println("Trying to create a directory that already exists: " + Files.createDirectory(p));
      } catch (final FileAlreadyExistsException fae) {
        System.out.println("couldn't create a directory that already exists");
      }
    }

    {
      final Path p = Files.createTempFile("test", null);
      System.out.println("Created tempDir. Does it exist? " + Files.exists(p));
    }

    /*
    // Rename a file.
    {
      File f = new File("/tmp/temp_rename_file.txt");
      File f2 = new File("/tmp/temp_rename_file2.txt");
      System.out.println("Creating temp_rename_file.txt: " + f.createNewFile());
      System.out.println("Renaming it to temp_rename_file2.txt: " + f.renameTo(f2));
      System.out.println("Old file exist? " + f.exists() + " New file exists? " + f2.exists());
      System.out.println("Recreating old file: " + f.createNewFile());
      System.out.println("Moving on top of old file: " + f2.renameTo(f));
      System.out.println("Deleting old file: " + f.delete());
      System.out.println("Trying to move nonexistant old file: " + f.renameTo(f2));
    }

    // Read only.
    {
      File f = new File("/tmp/temp_readonly.txt");
      System.out.println("Creating temp_readonly.txt: " + f.createNewFile());
      // BrowserFS doesn't support chmod in its temporary file system anymore.
      // System.out.println("Marking as read only: " + f.setReadOnly());
      System.out.println("Can I write to the file?: " + f.canWrite());
      System.out.println("Can I read the file?: " + f.canRead());
      // make sure we can open a read-only file with RandomAccessFile
      RandomAccessFile raf = new RandomAccessFile(f, "r");
      System.out.println("Deleting file: " + f.delete());
    }
    */

  }
}
