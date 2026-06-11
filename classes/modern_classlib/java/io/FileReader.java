package java.io;

import java.nio.charset.Charset;

public class FileReader extends InputStreamReader {
  public FileReader(String fileName) throws FileNotFoundException {
    super(new FileInputStream(fileName));
  }

  public FileReader(File file) throws FileNotFoundException {
    super(new FileInputStream(file));
  }

  public FileReader(FileDescriptor fd) {
    super(new FileInputStream(fd));
  }

  public FileReader(String fileName, Charset charset) throws IOException {
    super(new FileInputStream(fileName), charset);
  }

  public FileReader(File file, Charset charset) throws IOException {
    super(new FileInputStream(file), charset);
  }
}
