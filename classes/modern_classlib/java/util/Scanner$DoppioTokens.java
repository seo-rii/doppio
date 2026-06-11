package java.util;

import java.util.stream.Stream;
import java.util.stream.StreamSupport;

final class Scanner$DoppioTokens {
  private Scanner$DoppioTokens() {}

  public static Stream<String> stream(final Scanner scanner) {
    Iterator<String> iterator = new Iterator<String>() {
      public boolean hasNext() {
        return scanner.hasNext();
      }

      public String next() {
        return scanner.next();
      }
    };
    return StreamSupport.stream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.NONNULL),
      false
    );
  }
}
