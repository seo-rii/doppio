package java.lang;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public final class Runtime$Version implements Comparable<Runtime$Version> {
  private final List<Integer> version;
  private final Optional<String> pre;
  private final Optional<Integer> build;
  private final Optional<String> optional;

  Runtime$Version(
      List<Integer> version,
      Optional<String> pre,
      Optional<Integer> build,
      Optional<String> optional) {
    if (version == null || pre == null || build == null || optional == null) {
      throw new NullPointerException();
    }
    if (version.isEmpty()) {
      throw new IllegalArgumentException();
    }
    this.version = Collections.unmodifiableList(new ArrayList<Integer>(version));
    this.pre = pre;
    this.build = build;
    this.optional = optional;
  }

  public static Runtime$Version parse(String versionText) {
    Objects.requireNonNull(versionText);
    int plus = versionText.indexOf('+');
    if (plus != versionText.lastIndexOf('+')) {
      throw new IllegalArgumentException();
    }

    String beforePlus = plus < 0 ? versionText : versionText.substring(0, plus);
    String buildAndOptional = plus < 0 ? "" : versionText.substring(plus + 1);
    if (beforePlus.isEmpty() || (plus >= 0 && buildAndOptional.isEmpty())) {
      throw new IllegalArgumentException();
    }

    int dash = beforePlus.indexOf('-');
    String numberText = dash < 0 ? beforePlus : beforePlus.substring(0, dash);
    Optional<String> pre = Optional.empty();
    Optional<String> optional = Optional.empty();
    if (dash >= 0) {
      String preAndOptional = beforePlus.substring(dash + 1);
      int optionalDash = preAndOptional.indexOf('-');
      if (optionalDash < 0) {
        pre = Optional.of(validPreToken(preAndOptional));
      } else {
        if (plus >= 0) {
          throw new IllegalArgumentException();
        }
        pre = Optional.of(validPreToken(preAndOptional.substring(0, optionalDash)));
        optional = Optional.of(validOptionalToken(preAndOptional.substring(optionalDash + 1)));
      }
    }
    List<Integer> numbers = parseVersionNumbers(numberText);

    Optional<Integer> build = Optional.empty();
    if (plus >= 0) {
      if (buildAndOptional.charAt(0) == '-') {
        if (pre.isPresent()) {
          throw new IllegalArgumentException();
        }
        optional = Optional.of(validOptionalToken(buildAndOptional.substring(1)));
      } else {
        int buildDash = buildAndOptional.indexOf('-');
        String buildText = buildDash < 0 ? buildAndOptional : buildAndOptional.substring(0, buildDash);
        build = Optional.of(parseBuild(buildText));
        if (buildDash >= 0) {
          optional = Optional.of(validOptionalToken(buildAndOptional.substring(buildDash + 1)));
        }
      }
    }

    return new Runtime$Version(numbers, pre, build, optional);
  }

  private static List<Integer> parseVersionNumbers(String text) {
    if (text.isEmpty()) {
      throw new IllegalArgumentException();
    }
    String[] parts = text.split("\\.", -1);
    ArrayList<Integer> numbers = new ArrayList<Integer>(parts.length);
    for (int i = 0; i < parts.length; i++) {
      String part = parts[i];
      int value = parseNumber(part);
      if (i == 0 && value == 0) {
        throw new IllegalArgumentException();
      }
      numbers.add(value);
    }
    if (numbers.size() > 1 && numbers.get(numbers.size() - 1).intValue() == 0) {
      throw new IllegalArgumentException();
    }
    return numbers;
  }

  private static int parseBuild(String text) {
    return parseNumber(text);
  }

  private static int parseNumber(String text) {
    if (text.isEmpty() || (text.length() > 1 && text.charAt(0) == '0')) {
      throw new IllegalArgumentException();
    }
    long value = 0;
    for (int i = 0; i < text.length(); i++) {
      char ch = text.charAt(i);
      if (ch < '0' || ch > '9') {
        throw new IllegalArgumentException();
      }
      value = value * 10 + (ch - '0');
      if (value > Integer.MAX_VALUE) {
        throw new IllegalArgumentException();
      }
    }
    return (int) value;
  }

  private static String validPreToken(String text) {
    if (text.isEmpty()) {
      throw new IllegalArgumentException();
    }
    for (int i = 0; i < text.length(); i++) {
      char ch = text.charAt(i);
      if ((ch < 'a' || ch > 'z')
          && (ch < 'A' || ch > 'Z')
          && (ch < '0' || ch > '9')) {
        throw new IllegalArgumentException();
      }
    }
    return text;
  }

  private static String validOptionalToken(String text) {
    if (text.isEmpty()) {
      throw new IllegalArgumentException();
    }
    for (int i = 0; i < text.length(); i++) {
      char ch = text.charAt(i);
      if ((ch < 'a' || ch > 'z')
          && (ch < 'A' || ch > 'Z')
          && (ch < '0' || ch > '9')
          && ch != '.'
          && ch != '-') {
        throw new IllegalArgumentException();
      }
    }
    return text;
  }

  public int major() {
    return version.get(0).intValue();
  }

  public int feature() {
    return version.get(0).intValue();
  }

  public int minor() {
    return version.size() > 1 ? version.get(1).intValue() : 0;
  }

  public int interim() {
    return version.size() > 1 ? version.get(1).intValue() : 0;
  }

  public int security() {
    return version.size() > 2 ? version.get(2).intValue() : 0;
  }

  public int update() {
    return version.size() > 2 ? version.get(2).intValue() : 0;
  }

  public int patch() {
    return version.size() > 3 ? version.get(3).intValue() : 0;
  }

  public List<Integer> version() {
    return version;
  }

  public Optional<String> pre() {
    return pre;
  }

  public Optional<Integer> build() {
    return build;
  }

  public Optional<String> optional() {
    return optional;
  }

  public int compareTo(Runtime$Version other) {
    return compare(other, false);
  }

  public int compareToIgnoreOptional(Runtime$Version other) {
    return compare(other, true);
  }

  private int compare(Runtime$Version other, boolean ignoreOptional) {
    Objects.requireNonNull(other);
    int max = Math.max(version.size(), other.version.size());
    for (int i = 0; i < max; i++) {
      int left = i < version.size() ? version.get(i).intValue() : 0;
      int right = i < other.version.size() ? other.version.get(i).intValue() : 0;
      if (left != right) {
        return left - right;
      }
    }

    int preCompare = comparePre(pre, other.pre);
    if (preCompare != 0) {
      return preCompare;
    }

    int buildCompare = compareOptionalInteger(build, other.build);
    if (buildCompare != 0) {
      return buildCompare;
    }

    return ignoreOptional ? 0 : compareOptionalString(optional, other.optional, true);
  }

  private static int compareOptionalInteger(Optional<Integer> left, Optional<Integer> right) {
    if (!left.isPresent()) {
      return right.isPresent() ? -1 : 0;
    }
    if (!right.isPresent()) {
      return 1;
    }
    return left.get().intValue() - right.get().intValue();
  }

  private static int comparePre(Optional<String> left, Optional<String> right) {
    if (!left.isPresent()) {
      return right.isPresent() ? 1 : 0;
    }
    if (!right.isPresent()) {
      return -1;
    }
    String leftValue = left.get();
    String rightValue = right.get();
    boolean leftNumeric = isNumeric(leftValue);
    boolean rightNumeric = isNumeric(rightValue);
    if (leftNumeric && rightNumeric) {
      return compareNumericString(leftValue, rightValue);
    }
    if (leftNumeric) {
      return -1;
    }
    if (rightNumeric) {
      return 1;
    }
    return leftValue.compareTo(rightValue);
  }

  private static int compareOptionalString(Optional<String> left, Optional<String> right, boolean emptySortsLow) {
    if (!left.isPresent()) {
      return right.isPresent() ? (emptySortsLow ? -1 : 1) : 0;
    }
    if (!right.isPresent()) {
      return emptySortsLow ? 1 : -1;
    }
    return left.get().compareTo(right.get());
  }

  private static boolean isNumeric(String value) {
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      if (ch < '0' || ch > '9') {
        return false;
      }
    }
    return true;
  }

  private static int compareNumericString(String left, String right) {
    int leftStart = firstNonZero(left);
    int rightStart = firstNonZero(right);
    int leftLength = left.length() - leftStart;
    int rightLength = right.length() - rightStart;
    if (leftLength != rightLength) {
      return leftLength - rightLength;
    }
    for (int i = 0; i < leftLength; i++) {
      char leftChar = left.charAt(leftStart + i);
      char rightChar = right.charAt(rightStart + i);
      if (leftChar != rightChar) {
        return leftChar - rightChar;
      }
    }
    return 0;
  }

  private static int firstNonZero(String value) {
    int index = 0;
    while (index < value.length() - 1 && value.charAt(index) == '0') {
      index++;
    }
    return index;
  }

  public String toString() {
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < version.size(); i++) {
      if (i > 0) {
        builder.append('.');
      }
      builder.append(version.get(i));
    }
    if (pre.isPresent()) {
      builder.append('-').append(pre.get());
    }
    if (build.isPresent()) {
      builder.append('+').append(build.get());
    }
    if (optional.isPresent()) {
      if (build.isPresent()) {
        builder.append('-');
      } else {
        builder.append(pre.isPresent() ? "-" : "+-");
      }
      builder.append(optional.get());
    }
    return builder.toString();
  }

  public boolean equals(Object other) {
    if (!equalsIgnoreOptional(other)) {
      return false;
    }
    Runtime$Version version = (Runtime$Version) other;
    return optional.equals(version.optional);
  }

  public boolean equalsIgnoreOptional(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Runtime$Version)) {
      return false;
    }
    Runtime$Version version = (Runtime$Version) other;
    return this.version.equals(version.version)
        && pre.equals(version.pre)
        && build.equals(version.build);
  }

  public int hashCode() {
    return Objects.hash(version, pre, build, optional);
  }
}
