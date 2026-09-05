package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.CharBuffer;
import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

public class Java21SplitWithDelimiters {
  private interface Action {
    void run() throws Throwable;
  }

  private static final class Sequence implements CharSequence {
    private final String value;
    private final boolean rejectWholeString;
    private int slices;

    Sequence(String value, boolean rejectWholeString) {
      this.value = value;
      this.rejectWholeString = rejectWholeString;
    }

    public int length() { return value.length(); }
    public char charAt(int index) { return value.charAt(index); }

    public CharSequence subSequence(int start, int end) {
      slices++;
      return new Sequence(value.substring(start, end), false);
    }

    public String toString() {
      if (rejectWholeString) throw new AssertionError("unexpected whole-input conversion");
      return value;
    }
  }

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
  }

  private static void array(String label, String[] actual, String... expected) {
    require(Arrays.equals(actual, expected), label + ": " + Arrays.toString(actual) +
        " != " + Arrays.toString(expected));
  }

  private static void both(String input, String regex, int limit, String... expected) {
    String label = "input=" + input + ", regex=" + regex + ", limit=" + limit;
    array("String " + label, input.splitWithDelimiters(regex, limit), expected);
    array("Pattern " + label, Pattern.compile(regex).splitWithDelimiters(input, limit), expected);
  }

  private static void failure(Class<? extends Throwable> type, Action action) throws Throwable {
    try {
      action.run();
    } catch (Throwable thrown) {
      require(type.isInstance(thrown), "expected " + type.getName() + ", got " + thrown);
      return;
    }
    throw new AssertionError("expected " + type.getName());
  }

  private static void limits() {
    int[] limits = {Integer.MIN_VALUE, -1, 0, 1, 2, 3, Integer.MAX_VALUE};
    String[][] expected = {
      {"", "::", "a", ":::", "b", "::", ""},
      {"", "::", "a", ":::", "b", "::", ""},
      {"", "::", "a", ":::", "b", "::"},
      {"::a:::b::"},
      {"", "::", "a:::b::"},
      {"", "::", "a", ":::", "b::"},
      {"", "::", "a", ":::", "b", "::", ""}
    };
    String[][] emptyRegexExpected = {
      {"a", "", "b", "", ""}, {"a", "", "b", "", ""}, {"a", "", "b"},
      {"ab"}, {"a", "", "b"}, {"a", "", "b", "", ""}, {"a", "", "b", "", ""}
    };
    for (int i = 0; i < limits.length; i++) {
      both("::a:::b::", ":+", limits[i], expected[i]);
      both("ab", "", limits[i], emptyRegexExpected[i]);
      both("ab", "nomatch", limits[i], "ab");
      both("", ":", limits[i], "");
      both("", "", limits[i], "");
      both("ab", "^", limits[i], "ab");
    }
  }

  private static void boundaries() {
    both(":", ":", -1, "", ":", "");
    both(":", ":", 0, "", ":");
    both("a::", ":", 0, "a", ":", "", ":");
    both("a::", ":", 2, "a", ":", ":");
    both("ab", "$", -1, "ab", "", "");
    both("ab", "$", 0, "ab");
    both("ab", "$", 2, "ab", "", "");
    both("ab", "(?=b)", 0, "a", "", "b");
    both("ab", "(?<=a)", -1, "a", "", "b");
    both("ab", "(?=a)|(?<=b)", 2, "ab", "", "");
    both("ab", "a|$", -1, "", "a", "b", "", "");
    both("ab", "a|$", 0, "", "a", "b");
    both("ab", "a|$", 2, "", "a", "b");
    both("ab", ".", -1, "", "a", "", "b", "");
    both("ab", ".", 0, "", "a", "", "b");
  }

  private static void regex() {
    both("a12b345c", "(\\d)(\\d*)", 0, "a", "12", "b", "345", "c");
    both("a12b345c", "(?:\\d)+", 3, "a", "12", "b", "345", "c");
    both("a12b345c", "(?<digits>\\d+)", 0, "a", "12", "b", "345", "c");
    both("a::b--c", "::|--", 0, "a", "::", "b", "--", "c");
    both("a.*b.*", Pattern.quote(".*"), -1, "a", ".*", "b", ".*", "");
    both("a--b----c", "--", 0, "a", "--", "b", "--", "", "--", "c");
    both("\u03A9:\uD83D\uDE42:\uD800", ":", 0, "\u03A9", ":", "\uD83D\uDE42", ":", "\uD800");
    both("a\uD83D\uDE42b\uD83D\uDE42", "\uD83D\uDE42", 0,
        "a", "\uD83D\uDE42", "b", "\uD83D\uDE42");
    both("aXbxC", "(?i)x", 0, "a", "X", "b", "x", "C");
    array("case-insensitive flag", Pattern.compile("x", Pattern.CASE_INSENSITIVE)
        .splitWithDelimiters("aXbxC", 0), "a", "X", "b", "x", "C");
    array("literal flag", Pattern.compile(".*", Pattern.LITERAL)
        .splitWithDelimiters("a.*b", -1), "a", ".*", "b");
    array("multiline flag", Pattern.compile("^", Pattern.MULTILINE)
        .splitWithDelimiters("a\nb\nc", 0), "a\n", "", "b\n", "", "c");
  }

  private static void sequences() {
    Pattern pattern = Pattern.compile(":+");
    StringBuilder builder = new StringBuilder("a::b:");
    array("builder", pattern.splitWithDelimiters(builder, -1), "a", "::", "b", ":", "");
    require("a::b:".equals(builder.toString()), "builder unchanged");
    CharBuffer buffer = CharBuffer.wrap("!a::b:!");
    buffer.position(1);
    buffer.limit(6);
    buffer.mark();
    array("buffer", pattern.splitWithDelimiters(buffer, 0), "a", "::", "b", ":");
    require(buffer.position() == 1 && buffer.limit() == 6, "buffer bounds unchanged");
    buffer.reset();
    Sequence sequence = new Sequence("a::b:", true);
    array("custom sequence", pattern.splitWithDelimiters(sequence, -1), "a", "::", "b", ":", "");
    require(sequence.slices > 0, "custom sequence slices used");
    Sequence limited = new Sequence("a::b:", true);
    array("custom limit one", pattern.splitWithDelimiters(limited, 1), "a::b:");
    require(limited.slices > 0, "custom limit one slices used");
    array("custom no match", pattern.splitWithDelimiters(new Sequence("abc", false), 0), "abc");
    array("custom empty", pattern.splitWithDelimiters(new Sequence("", false), 0), "");
  }

  private static void exceptions() throws Throwable {
    for (int limit : new int[] {Integer.MIN_VALUE, -1, 0, 1, 2, Integer.MAX_VALUE}) {
      failure(NullPointerException.class, () -> "abc".splitWithDelimiters(null, limit));
      failure(NullPointerException.class, () -> "".splitWithDelimiters(null, limit));
      failure(PatternSyntaxException.class, () -> "abc".splitWithDelimiters("[", limit));
      failure(PatternSyntaxException.class, () -> "".splitWithDelimiters("[", limit));
      failure(NullPointerException.class, () -> Pattern.compile(":").splitWithDelimiters(null, limit));
    }
  }

  private static void enumeration(Class<?> owner, Method[] methods) {
    int found = 0;
    for (Method method : methods) {
      if (!"splitWithDelimiters".equals(method.getName())) continue;
      found++;
      require(method.getDeclaringClass() == owner && method.getReturnType() == String[].class,
          "method owner and return type");
      Class<?>[] parameters = method.getParameterTypes();
      require(parameters.length == 2 && parameters[0] ==
          (owner == String.class ? String.class : CharSequence.class) && parameters[1] == Integer.TYPE,
          "method parameters");
      require(method.getModifiers() == Modifier.PUBLIC && !method.isBridge() && !method.isSynthetic() &&
          !method.isVarArgs() && method.getExceptionTypes().length == 0, "method metadata");
    }
    require(found == 1, "exactly one splitWithDelimiters method");
  }

  private static void reflection() throws Throwable {
    for (Class<?> owner : new Class<?>[] {String.class, Pattern.class}) {
      enumeration(owner, owner.getDeclaredMethods());
      enumeration(owner, owner.getMethods());
      Class<?> input = owner == String.class ? String.class : CharSequence.class;
      Method method = owner.getMethod("splitWithDelimiters", input, Integer.TYPE);
      require(method.equals(owner.getDeclaredMethod("splitWithDelimiters", input, Integer.TYPE)),
          "declared and public method agree");
      Object receiver = owner == String.class ? "a::b" : Pattern.compile(":+");
      Object argument = owner == String.class ? ":+" : new StringBuilder("a::b");
      array("reflection invocation", (String[]) method.invoke(receiver, argument, 2), "a", "::", "b");
      try {
        method.invoke(receiver, null, 1);
        throw new AssertionError("expected wrapped null failure");
      } catch (InvocationTargetException expected) {
        require(expected.getCause() instanceof NullPointerException, "wrapped null cause");
      }
    }
    Method stringMethod = String.class.getMethod("splitWithDelimiters", String.class, Integer.TYPE);
    try {
      stringMethod.invoke("", "[", 1);
      throw new AssertionError("expected wrapped regex failure");
    } catch (InvocationTargetException expected) {
      require(expected.getCause() instanceof PatternSyntaxException, "wrapped regex cause");
    }
  }

  private static void methodHandles() throws Throwable {
    MethodHandle stringSplit = MethodHandles.publicLookup().findVirtual(String.class, "splitWithDelimiters",
        MethodType.methodType(String[].class, String.class, Integer.TYPE));
    MethodHandle patternSplit = MethodHandles.publicLookup().findVirtual(Pattern.class, "splitWithDelimiters",
        MethodType.methodType(String[].class, CharSequence.class, Integer.TYPE));
    array("String method handle", (String[]) stringSplit.invokeExact("a::b", ":+", 2), "a", "::", "b");
    Pattern pattern = Pattern.compile(":+");
    CharSequence input = new StringBuilder("a::b");
    array("Pattern method handle", (String[]) patternSplit.invokeExact(pattern, input, 2), "a", "::", "b");
    failure(PatternSyntaxException.class, () -> {
      String[] ignored = (String[]) stringSplit.invokeExact("", "[", 1);
    });
    failure(NullPointerException.class, () -> {
      String[] ignored = (String[]) patternSplit.invokeExact(pattern, (CharSequence) null, 1);
    });
  }

  private static void legacySplit() {
    array("String split", "::a:::b::".split(":+", 0), "", "a", "b");
    array("Pattern split", Pattern.compile(":+").split("::a:::b::", 0), "", "a", "b");
    array("String limited split", "::a:::b::".split(":+", 2), "", "a:::b::");
    array("Pattern limited split", Pattern.compile(":+").split("::a:::b::", 2), "", "a:::b::");
    array("String empty split", "ab".split("", -1), "a", "b", "");
    array("Pattern empty split", Pattern.compile("").split("ab", -1), "a", "b", "");
  }

  private static void report(String group, Action action) throws Throwable {
    action.run();
    System.out.println("split-with-delimiters-" + group + "=true");
  }

  public static void main(String[] args) throws Throwable {
    report("limits", Java21SplitWithDelimiters::limits);
    report("boundaries", Java21SplitWithDelimiters::boundaries);
    report("regex", Java21SplitWithDelimiters::regex);
    report("sequences", Java21SplitWithDelimiters::sequences);
    report("exceptions", Java21SplitWithDelimiters::exceptions);
    report("reflection", Java21SplitWithDelimiters::reflection);
    report("method-handles", Java21SplitWithDelimiters::methodHandles);
    report("legacy-split", Java21SplitWithDelimiters::legacySplit);
  }
}
