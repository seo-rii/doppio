package classes.modern_test;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

public class Java17IoInitIDs {
  public static void main(String[] args) throws Exception {
    invokeInitIDs("java.io.FileInputStream");
    invokeInitIDs("java.io.FileOutputStream");
    invokeInitIDs("java.io.UnixFileSystem");

    Path temp = Files.createTempFile("doppio-io-initids", ".bin");
    try {
      try (FileOutputStream out = new FileOutputStream(temp.toFile())) {
        out.write(new byte[] { 65, 66, 67 });
      }
      try (FileOutputStream out = new FileOutputStream(temp.toFile(), true)) {
        out.write(68);
        out.write(new byte[] { 89, 90 }, 1, 1);
      }

      byte[] bytes = new byte[8];
      int firstRead;
      int secondRead;
      int eof;
      try (FileInputStream in = new FileInputStream(temp.toFile())) {
        firstRead = in.read(bytes, 1, 3);
        secondRead = in.read(bytes, 4, 3);
        eof = in.read();
      }

      System.out.println("first-read:" + firstRead);
      System.out.println("second-read:" + secondRead);
      System.out.println("eof:" + eof);
      System.out.println("bytes:" + Arrays.toString(bytes));
      System.out.println("roots-positive:" + (File.listRoots().length > 0));
    } finally {
      Files.deleteIfExists(temp);
    }
  }

  private static void invokeInitIDs(String className) throws Exception {
    Class<?> cls = Class.forName(className, false, null);
    Method initIDs = cls.getDeclaredMethod("initIDs");
    initIDs.setAccessible(true);
    initIDs.invoke(null);
    System.out.println("initIDs:" + className);
  }
}
