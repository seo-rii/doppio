package classes.modern_test;

import java.lang.reflect.Method;
import java.net.URL;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Java9ClassLoaderResourcesReflection {
  public static void main(String[] args) throws Exception {
    Method method = ClassLoader.class.getMethod("resources", String.class);
    System.out.println(method.getName() + ":" + method.getReturnType().getName() + ":" + Arrays.toString(method.getParameterTypes()));

    RecordingLoader loader = new RecordingLoader();
    @SuppressWarnings("unchecked")
    Stream<URL> stream = (Stream<URL>) method.invoke(loader, "pkg/resource.txt");
    System.out.println(stream.map(URL::toString).collect(Collectors.joining(",")));
    System.out.println(loader.calls + ":" + loader.lastName);
    printFailure("null", () -> method.invoke(loader, new Object[] { null }));
  }

  private static void printFailure(String label, ThrowingRunnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      Throwable cause = t.getCause();
      String causeText = cause == null ? "none" : cause.getClass().getSimpleName();
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

    public Enumeration<URL> getResources(String name) throws java.io.IOException {
      calls++;
      lastName = name;
      return Collections.enumeration(Arrays.asList(
        new URL("file:/first"),
        new URL("file:/first"),
        new URL("file:/second")));
    }
  }
}
