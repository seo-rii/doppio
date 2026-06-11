package java.text;

import java.math.RoundingMode;
import java.util.Arrays;
import java.util.Objects;

public final class CompactNumberFormat extends NumberFormat {
  private static final long serialVersionUID = 7128367218649234678L;

  private final String decimalPattern;
  private final DecimalFormatSymbols symbols;
  private final String[] compactPatterns;
  private final DecimalFormat decimalFormat;
  private boolean parseBigDecimal;
  private RoundingMode roundingMode = RoundingMode.HALF_EVEN;

  public CompactNumberFormat(
    String decimalPattern,
    DecimalFormatSymbols symbols,
    String[] compactPatterns) {
    this(decimalPattern, symbols, compactPatterns, "");
  }

  public CompactNumberFormat(
    String decimalPattern,
    DecimalFormatSymbols symbols,
    String[] compactPatterns,
    String pluralRules) {
    this.decimalPattern = Objects.requireNonNull(decimalPattern);
    this.symbols = Objects.requireNonNull(symbols);
    this.compactPatterns = (String[]) Objects.requireNonNull(compactPatterns).clone();
    Objects.requireNonNull(pluralRules);
    this.decimalFormat = new DecimalFormat(decimalPattern, symbols);
  }

  public final StringBuffer format(Object number, StringBuffer result, FieldPosition fieldPosition) {
    Objects.requireNonNull(number);
    if (number instanceof Long || number instanceof Integer || number instanceof Short || number instanceof Byte) {
      return format(((Number) number).longValue(), result, fieldPosition);
    }
    if (number instanceof Number) {
      return format(((Number) number).doubleValue(), result, fieldPosition);
    }
    throw new IllegalArgumentException();
  }

  public StringBuffer format(double number, StringBuffer result, FieldPosition fieldPosition) {
    if (Double.isNaN(number) || Double.isInfinite(number)) {
      return decimalFormat.format(number, result, fieldPosition);
    }
    return formatLong((long) number, result, fieldPosition);
  }

  public StringBuffer format(long number, StringBuffer result, FieldPosition fieldPosition) {
    return formatLong(number, result, fieldPosition);
  }

  public AttributedCharacterIterator formatToCharacterIterator(Object obj) {
    return new AttributedString(format(obj).toString()).getIterator();
  }

  public Number parse(String text, ParsePosition position) {
    Objects.requireNonNull(text);
    Objects.requireNonNull(position);
    int start = position.getIndex();
    ParseResult best = null;
    for (int index = compactPatterns.length - 1; index >= 0; index--) {
      String suffix = suffixFor(index);
      if (suffix.length() == 0) {
        continue;
      }
      ParseResult parsed = parseWithSuffix(text, start, suffix, divisorFor(index));
      if (parsed != null && (best == null || parsed.endIndex > best.endIndex)) {
        best = parsed;
      }
    }
    if (best == null) {
      Number parsed = decimalFormat.parse(text, position);
      if (parsed == null) {
        position.setErrorIndex(start);
      }
      return parsed;
    }
    position.setIndex(best.endIndex);
    return best.value;
  }

  public void setMaximumIntegerDigits(int newValue) {
    decimalFormat.setMaximumIntegerDigits(newValue);
  }

  public void setMinimumIntegerDigits(int newValue) {
    decimalFormat.setMinimumIntegerDigits(newValue);
  }

  public void setMinimumFractionDigits(int newValue) {
    decimalFormat.setMinimumFractionDigits(newValue);
  }

  public void setMaximumFractionDigits(int newValue) {
    decimalFormat.setMaximumFractionDigits(newValue);
  }

  public RoundingMode getRoundingMode() {
    return roundingMode;
  }

  public void setRoundingMode(RoundingMode roundingMode) {
    this.roundingMode = Objects.requireNonNull(roundingMode);
    decimalFormat.setRoundingMode(roundingMode);
  }

  public int getGroupingSize() {
    return decimalFormat.getGroupingSize();
  }

  public void setGroupingSize(int newValue) {
    decimalFormat.setGroupingSize(newValue);
  }

  public boolean isGroupingUsed() {
    return decimalFormat.isGroupingUsed();
  }

  public void setGroupingUsed(boolean newValue) {
    decimalFormat.setGroupingUsed(newValue);
  }

  public boolean isParseIntegerOnly() {
    return decimalFormat.isParseIntegerOnly();
  }

  public void setParseIntegerOnly(boolean value) {
    decimalFormat.setParseIntegerOnly(value);
  }

  public boolean isParseBigDecimal() {
    return parseBigDecimal;
  }

  public void setParseBigDecimal(boolean value) {
    parseBigDecimal = value;
  }

  public boolean equals(Object obj) {
    if (!(obj instanceof CompactNumberFormat)) {
      return false;
    }
    CompactNumberFormat other = (CompactNumberFormat) obj;
    return decimalPattern.equals(other.decimalPattern)
      && symbols.equals(other.symbols)
      && Arrays.equals(compactPatterns, other.compactPatterns)
      && parseBigDecimal == other.parseBigDecimal
      && roundingMode.equals(other.roundingMode);
  }

  public int hashCode() {
    return decimalPattern.hashCode() ^ Arrays.hashCode(compactPatterns);
  }

  public CompactNumberFormat clone() {
    CompactNumberFormat copy = new CompactNumberFormat(decimalPattern, symbols, compactPatterns);
    copy.parseBigDecimal = parseBigDecimal;
    copy.roundingMode = roundingMode;
    return copy;
  }

  private StringBuffer formatLong(long number, StringBuffer result, FieldPosition fieldPosition) {
    long abs = number < 0L ? -number : number;
    int index = compactIndex(abs);
    if (index < 0) {
      return decimalFormat.format(number, result, fieldPosition);
    }
    long divisor = divisorFor(index);
    long scaled = abs / divisor;
    if (number < 0L) {
      result.append('-');
    }
    result.append(scaled);
    result.append(suffixFor(index));
    return result;
  }

  private int compactIndex(long abs) {
    if (abs < 1000L) {
      return -1;
    }
    int digits = Long.toString(abs).length();
    int index = digits - 1;
    if (index >= compactPatterns.length || suffixFor(index).length() == 0) {
      return -1;
    }
    return index;
  }

  private String suffixFor(int index) {
    String pattern = compactPatterns[index];
    int lastZero = pattern.lastIndexOf('0');
    return lastZero >= 0 && lastZero + 1 < pattern.length() ? pattern.substring(lastZero + 1) : "";
  }

  private long divisorFor(int index) {
    long value = 1L;
    int exponent = index - (index % 3);
    for (int i = 0; i < exponent; i++) {
      value *= 10L;
    }
    return value;
  }

  private ParseResult parseWithSuffix(String text, int start, String suffix, long divisor) {
    int index = start;
    boolean negative = false;
    if (index < text.length() && text.charAt(index) == '-') {
      negative = true;
      index++;
    }
    long value = 0L;
    int numberStart = index;
    while (index < text.length()) {
      char c = text.charAt(index);
      if (c < '0' || c > '9') {
        break;
      }
      value = value * 10L + (c - '0');
      index++;
    }
    if (index == numberStart || index + suffix.length() > text.length()) {
      return null;
    }
    for (int i = 0; i < suffix.length(); i++) {
      if (text.charAt(index + i) != suffix.charAt(i)) {
        return null;
      }
    }
    long parsed = value * divisor;
    return new ParseResult(Long.valueOf(negative ? -parsed : parsed), index + suffix.length());
  }

  private static final class ParseResult {
    private final Number value;
    private final int endIndex;

    private ParseResult(Number value, int endIndex) {
      this.value = value;
      this.endIndex = endIndex;
    }
  }
}
