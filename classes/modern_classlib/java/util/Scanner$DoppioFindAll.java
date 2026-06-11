package java.util;

import java.util.regex.MatchResult;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

final class Scanner$DoppioFindAll {
  private Scanner$DoppioFindAll() {}

  public static Stream<MatchResult> stream(Scanner scanner, String pattern) {
    return stream(scanner, Pattern.compile(pattern));
  }

  public static Stream<MatchResult> stream(final Scanner scanner, final Pattern pattern) {
    Objects.requireNonNull(pattern);
    Iterator<MatchResult> iterator = new Iterator<MatchResult>() {
      private boolean finished;
      private boolean ready;
      private MatchResult next;

      public boolean hasNext() {
        prepare();
        return ready;
      }

      public MatchResult next() {
        prepare();
        if (!ready) {
          throw new NoSuchElementException();
        }
        MatchResult result = next;
        next = null;
        ready = false;
        return result;
      }

      private void prepare() {
        if (ready || finished) {
          return;
        }
        String match = scanner.findWithinHorizon(pattern, 0);
        if (match == null) {
          finished = true;
        } else {
          next = scanner.match();
          ready = true;
        }
      }
    };
    return StreamSupport.stream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.NONNULL),
      false
    );
  }
}
