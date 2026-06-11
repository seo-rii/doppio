package java.util.regex;

import java.util.Objects;
import java.util.function.Predicate;

final class Pattern$DoppioMatchPredicate implements Predicate<String> {
  private final Pattern pattern;

  Pattern$DoppioMatchPredicate(Pattern pattern) {
    this.pattern = Objects.requireNonNull(pattern);
  }

  public boolean test(String input) {
    return pattern.matcher(input).matches();
  }
}
