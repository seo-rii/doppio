package classes.test;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

class ZipFileHotPaths {
  public static void main(String[] args) throws Exception {
    File zipPath = new File(System.getProperty("java.io.tmpdir"), "doppio-zipfile-hotpaths.zip");
    ZipOutputStream out = new ZipOutputStream(new FileOutputStream(zipPath));
    out.putNextEntry(new ZipEntry("present.txt"));
    out.write("present".getBytes("UTF-8"));
    out.closeEntry();
    out.putNextEntry(new ZipEntry("dir/nested.txt"));
    out.write("nested".getBytes("UTF-8"));
    out.closeEntry();
    out.close();

    for (int i = 0; i < 3; i++) {
      ZipFile zip = new ZipFile(zipPath);
      InputStream in = zip.getInputStream(zip.getEntry("dir/nested.txt"));
      ByteArrayOutputStream entryBytes = new ByteArrayOutputStream();
      byte[] buf = new byte[16];
      int len;
      while ((len = in.read(buf)) != -1) {
        entryBytes.write(buf, 0, len);
      }
      in.close();

      System.out.println("present-" + i + " " + (zip.getEntry("present.txt") != null));
      System.out.println("missing-" + i + " " + (zip.getEntry("missing.txt") == null));
      System.out.println("nested-" + i + " " + new String(entryBytes.toByteArray(), "UTF-8"));
      zip.close();
    }

    zipPath.delete();
  }
}
