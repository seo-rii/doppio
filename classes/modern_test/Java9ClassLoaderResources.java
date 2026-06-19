package classes.modern_test;

import java.io.IOException;
import java.net.URL;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Spliterator;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Java9ClassLoaderResources {
  public static void main(String[] args) throws Exception {
    RecordingLoader loader = new RecordingLoader();

    System.out.println(loader.resources("pkg/resource.txt")
      .map(URL::toString)
      .collect(Collectors.toList()));
    System.out.println(loader.calls + ":" + loader.lastName);
    System.out.println(loader.resources("empty").count());

    Spliterator<URL> spliterator = loader.resources("pkg/resource.txt").spliterator();
    System.out.println((spliterator.characteristics() & Spliterator.NONNULL) != 0);
    System.out.println((spliterator.characteristics() & Spliterator.IMMUTABLE) != 0);
    System.out.println(spliterator.estimateSize() == Long.MAX_VALUE);

    Stream<URL> stream = loader.resources("pkg/resource.txt");
    System.out.println(stream.findFirst().get().toString());
    printFailure("reuse", () -> stream.count());
    printFailure("null", () -> loader.resources(null).count());
    System.out.println(loader.calls);
    printFailure("io", () -> new FailingLoader().resources("broken").count());
  }

  private static void printFailure(String label, ThrowingRunnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      Throwable cause = t.getCause();
      String causeText = cause == null ? "none" : cause.getClass().getSimpleName() + ":" + cause.getMessage();
      System.out.println(label + ":" + t.getClass().getSimpleName() + ":" + causeText);
    }
  }

  private interface ThrowingRunnable {
    void run() throws Exception;
  }

  private static final class RecordingLoader extends ClassLoader {
    int calls;
    String lastName;

    RecordingLoader() {
      super(null);
    }

    public Enumeration<URL> getResources(String name) throws IOException {
      calls++;
      lastName = name;
      if ("empty".equals(name)) {
        return Collections.emptyEnumeration();
      }
      return Collections.enumeration(Arrays.asList(
        new URL("file:/first"),
        new URL("file:/first"),
        new URL("file:/second")));
    }
  }

  private static final class FailingLoader extends ClassLoader {
    FailingLoader() {
      super(null);
    }

    public Enumeration<URL> getResources(String name) throws IOException {
      throw new IOException("boom:" + name);
    }
  }
}
