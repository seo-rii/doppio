package java.util.regex;

import java.util.Objects;
import java.util.function.Function;

final class Matcher$DoppioReplacer {
  private Matcher$DoppioReplacer() {}

  public static String replaceAll(Matcher matcher, Function<MatchResult, String> replacer) {
    Objects.requireNonNull(replacer);
    matcher.reset();
    StringBuffer buffer = new StringBuffer();
    while (matcher.find()) {
      matcher.appendReplacement(buffer, replacer.apply(matcher));
    }
    matcher.appendTail(buffer);
    return buffer.toString();
  }

  public static String replaceFirst(Matcher matcher, Function<MatchResult, String> replacer) {
    Objects.requireNonNull(replacer);
    matcher.reset();
    StringBuffer buffer = new StringBuffer();
    if (matcher.find()) {
      matcher.appendReplacement(buffer, replacer.apply(matcher));
    }
    matcher.appendTail(buffer);
    return buffer.toString();
  }
}
