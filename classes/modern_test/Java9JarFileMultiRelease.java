package classes.modern_test;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URLClassLoader;
import java.util.jar.Attributes;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;

public class Java9JarFileMultiRelease {
  public static void main(String[] args) throws Exception {
    File jarPath = new File(System.getProperty("java.io.tmpdir"), "doppio-mr-jarfile.jar");

    Manifest manifest = new Manifest();
    manifest.getMainAttributes().put(Attributes.Name.MANIFEST_VERSION, "1.0");
    manifest.getMainAttributes().putValue("Multi-Release", "true");

    JarOutputStream out = new JarOutputStream(new FileOutputStream(jarPath), manifest);
    out.putNextEntry(new JarEntry("pkg/value.txt"));
    out.write("base".getBytes("UTF-8"));
    out.closeEntry();
    out.putNextEntry(new JarEntry("META-INF/versions/17/pkg/value.txt"));
    out.write("version17".getBytes("UTF-8"));
    out.closeEntry();
    out.close();

    JarFile jar = new JarFile(jarPath);
    JarEntry baseEntry = jar.getJarEntry("pkg/value.txt");
    System.out.println(read(jar.getInputStream(baseEntry)));
    System.out.println(baseEntry.getName());
    System.out.println(jar.getJarEntry("META-INF/versions/17/pkg/value.txt").getName());
    System.out.println(jar.getEntry("pkg/missing.txt") == null);
    jar.close();

    URLClassLoader loader = new URLClassLoader(new java.net.URL[] { jarPath.toURI().toURL() }, null);
    System.out.println(read(loader.getResourceAsStream("pkg/value.txt")));
    System.out.println(loader.getResource("pkg/value.txt").getProtocol());
    System.out.println(loader.getResource("pkg/missing.txt") == null);
    loader.close();

    jarPath.delete();
  }

  private static String read(InputStream input) throws Exception {
    byte[] buffer = new byte[32];
    int count = input.read(buffer);
    input.close();
    return new String(buffer, 0, count, "UTF-8");
  }
}
