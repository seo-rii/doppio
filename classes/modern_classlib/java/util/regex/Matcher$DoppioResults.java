package java.util.regex;

import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

final class Matcher$DoppioResults {
  private Matcher$DoppioResults() {}

  public static Stream<MatchResult> stream(final Matcher matcher) {
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
        if (matcher.find()) {
          next = matcher.toMatchResult();
          ready = true;
        } else {
          finished = true;
        }
      }
    };
    return StreamSupport.stream(
      Spliterators.spliteratorUnknownSize(iterator, Spliterator.ORDERED | Spliterator.NONNULL),
      false
    );
  }
}
