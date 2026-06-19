package java.lang;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URL;
import java.util.Enumeration;
import java.util.Objects;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public final class ClassLoader$DoppioResources {
  private ClassLoader$DoppioResources() {}

  public static Stream<URL> stream(ClassLoader loader, String name) {
    Objects.requireNonNull(name);
    try {
      Enumeration<URL> resources = loader.getResources(name);
      return StreamSupport.stream(
        Spliterators.spliteratorUnknownSize(resources.asIterator(), Spliterator.NONNULL | Spliterator.IMMUTABLE),
        false);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
