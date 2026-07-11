import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;

final class ZipFileSystemProbe {
  private ZipFileSystemProbe() {
  }

  static String summary(Path jarPath) throws Exception {
    String one;
    try (FileSystem fs = FileSystems.newFileSystem(jarPath)) {
      one = summarize("one", fs);
    }
    String map;
    try (FileSystem fs = FileSystems.newFileSystem(jarPath, Collections.emptyMap())) {
      map = summarize("map", fs);
    }
    return one + ";" + map;
  }

  private static String summarize(String label, FileSystem fs) throws Exception {
    String data = Files.readString(fs.getPath("pkg", "data.txt"), StandardCharsets.UTF_8)
      .trim()
      .replace('\n', '/');
    boolean serviceExists = Files.exists(fs.getPath("META-INF", "services", "example.Service"));
    return label + ":" + fs.provider().getScheme() + ":" + data + ":" + serviceExists;
  }
}
