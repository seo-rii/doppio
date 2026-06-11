package java.util.regex;

final class Matcher$DoppioStringBuilderAppend {
  private Matcher$DoppioStringBuilderAppend() {}

  public static Matcher appendReplacement(Matcher matcher, StringBuilder builder, String replacement) {
    StringBuffer buffer = new StringBuffer(builder.toString());
    matcher.appendReplacement(buffer, replacement);
    builder.setLength(0);
    builder.append(buffer.toString());
    return matcher;
  }

  public static StringBuilder appendTail(Matcher matcher, StringBuilder builder) {
    StringBuffer buffer = new StringBuffer(builder.toString());
    matcher.appendTail(buffer);
    builder.setLength(0);
    builder.append(buffer.toString());
    return builder;
  }
}
