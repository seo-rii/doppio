package classes.modern_test;

import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Map;

public class Java13FileSystems {
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
