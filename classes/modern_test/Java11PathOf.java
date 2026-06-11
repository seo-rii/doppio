package classes.modern_test;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

public class Java11PathOf {
  public static void main(String[] args) throws Exception {
    Path joined = Path.of("alpha", "beta", "gamma");
    System.out.println(joined.toString().replace('\\', '/'));
    System.out.println(joined.equals(Paths.get("alpha", "beta", "gamma")));

    Path single = Path.of("delta");
    System.out.println(single.getFileName());

    Path uri = Path.of(new URI("file:///tmp/doppio-path-of.txt"));
    System.out.println(uri.isAbsolute());
    System.out.println(uri.getFileName());

    try {
      Path.of((String) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Path.of((URI) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
