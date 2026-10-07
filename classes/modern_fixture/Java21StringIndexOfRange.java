package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

public class Java21StringIndexOfRange {
  private interface Action {
    void run() throws Throwable;
  }

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
  }

  private static void codePoint(String input, int value, int begin, int end, int expected) {
    int actual = input.indexOf(value, begin, end);
    require(actual == expected, "code point " + value + " in " + begin + ":" + end +
        ": " + actual + " != " + expected);
  }

  private static void substring(String input, String value, int begin, int end, int expected) {
    int actual = input.indexOf(value, begin, end);
    require(actual == expected, "substring in " + begin + ":" + end +
        ": " + actual + " != " + expected);
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

  private static void codePoints() {
    String input = "x\uD83D\uDE42\u03A9\0\uD800z\uDC00\uFFFFx\uD83D\uDE42";
    codePoint(input, 'x', 0, 12, 0);
    codePoint(input, 'x', 1, 12, 9);
    codePoint(input, 0x1F642, 0, 12, 1);
    codePoint(input, 0x1F642, 2, 12, 10);
    codePoint(input, 0x1F642, 1, 3, 1);
    codePoint(input, 0x1F642, 1, 2, -1);
    codePoint(input, 0x1F642, 2, 3, -1);
    codePoint(input, 0x1F642, 10, 11, -1);
    codePoint(input, 0x03A9, 0, 12, 3);
    codePoint(input, 0, 0, 12, 4);
    codePoint(input, 0xD800, 0, 12, 5);
    codePoint(input, 0xDC00, 0, 12, 7);
    codePoint(input, 0xD83D, 1, 2, 1);
    codePoint(input, 0xDE42, 2, 3, 2);
    codePoint(input, 0xFFFF, 0, 12, 8);
    codePoint("\uD800\uDC00", 0x10000, 0, 2, 0);
    codePoint("\uDBFF\uDFFF", 0x10FFFF, 0, 2, 0);
    for (int invalid : new int[] {-1, Integer.MIN_VALUE, 0x110000, Integer.MAX_VALUE}) {
      codePoint(input, invalid, 0, input.length(), -1);
      codePoint(input, invalid, 3, 3, -1);
      codePoint("", invalid, 0, 0, -1);
    }
  }

  private static void substrings() {
    substring("ababa", "aba", 0, 5, 0);
    substring("ababa", "aba", 1, 5, 2);
    substring("ababa", "aba", 2, 5, 2);
    substring("ababa", "aba", 1, 4, -1);
    substring("ababa", "aba", 0, 2, -1);
    substring("aaaaa", "aaa", 1, 4, 1);
    substring("aaaaa", "aaa", 2, 4, -1);
    substring("a\u03A9\0b", "\u03A9\0", 1, 3, 1);
    substring("a\u03A9\0b", "\u03A9\0", 1, 2, -1);
    substring("a\uD83D\uDE42b", "\uD83D\uDE42", 1, 3, 1);
    substring("a\uD83D\uDE42b", "\uD83D\uDE42", 1, 2, -1);
    substring("a\uD83D\uDE42b", "\uD83D", 1, 2, 1);
    substring("a\uD83D\uDE42b", "\uDE42", 2, 3, 2);
    substring("x\uD800y\uDC00", "\uD800y\uDC00", 1, 4, 1);
  }

  private static void boundaries() {
    for (int begin = 0; begin <= 3; begin++) {
      for (int end = begin; end <= 3; end++) {
        substring("abc", "", begin, end, begin);
      }
      substring("abc", "a", begin, begin, -1);
      codePoint("abc", 'a', begin, begin, -1);
    }
    substring("", "", 0, 0, 0);
    substring("", "a", 0, 0, -1);
    codePoint("", 'a', 0, 0, -1);
    codePoint("abc", 'b', 1, 2, 1);
    codePoint("abc", 'a', 1, 3, -1);
    codePoint("abc", 'c', 0, 2, -1);
    substring("abc", "b", 1, 2, 1);
    substring("abc", "a", 1, 3, -1);
    substring("abc", "c", 0, 2, -1);
    substring("abc", "abc", 0, 3, 0);
    substring("abc", "abcd", 0, 3, -1);
  }

  private static void rangeMatrix() {
    String[] inputs = {"", "ababa", "\0a\0", "a\u03A9a", "\uD83D\uDE42x\uD83D\uDE42",
        "\uD800x\uDC00\uD800\uDC00"};
    String[] needles = {"", "a", "aba", "bab", "aa", "\0", "\u03A9", "\uD83D",
        "\uDE42", "\uD83D\uDE42", "\uD800", "\uDC00", "\uD800\uDC00", "missing"};
    int[] values = {0, 'a', 'b', 'x', 0x03A9, 0xD800, 0xDC00, 0xD83D, 0xDE42,
        0x10000, 0x1F642, -1, 0x110000};
    for (String input : inputs) {
      for (int begin = 0; begin <= input.length(); begin++) {
        for (int end = begin; end <= input.length(); end++) {
          String slice = input.substring(begin, end);
          for (String needle : needles) {
            int relative = slice.indexOf(needle);
            substring(input, needle, begin, end, relative < 0 ? -1 : begin + relative);
          }
          for (int value : values) {
            int relative = slice.indexOf(value);
            codePoint(input, value, begin, end, relative < 0 ? -1 : begin + relative);
          }
        }
      }
    }
  }

  private static void exceptions() throws Throwable {
    int[][] invalidRanges = {{-1, 0}, {0, 4}, {2, 1}, {4, 4}, {-1, -1},
        {Integer.MIN_VALUE, Integer.MAX_VALUE}, {0, Integer.MIN_VALUE},
        {Integer.MAX_VALUE, Integer.MAX_VALUE}, {Integer.MAX_VALUE, 0}};
    for (int[] range : invalidRanges) {
      int begin = range[0];
      int end = range[1];
      failure(StringIndexOutOfBoundsException.class, () -> "abc".indexOf('a', begin, end));
      failure(StringIndexOutOfBoundsException.class, () -> "abc".indexOf(-1, begin, end));
      failure(StringIndexOutOfBoundsException.class, () -> "abc".indexOf(0x110000, begin, end));
      failure(StringIndexOutOfBoundsException.class, () -> "abc".indexOf("a", begin, end));
      failure(StringIndexOutOfBoundsException.class, () -> "abc".indexOf("", begin, end));
      failure(NullPointerException.class, () -> "abc".indexOf(null, begin, end));
    }
    failure(NullPointerException.class, () -> "abc".indexOf(null, 0, 3));
    failure(NullPointerException.class, () -> "abc".indexOf(null, 3, 3));
    failure(NullPointerException.class, () -> "".indexOf(null, 0, 0));
    failure(NullPointerException.class, () -> ((String) null).indexOf('a', 0, 0));
    failure(NullPointerException.class, () -> ((String) null).indexOf("a", 0, 0));
  }

  private static void enumeration(Method[] methods) {
    int codePoints = 0;
    int substrings = 0;
    for (Method method : methods) {
      if (!"indexOf".equals(method.getName())) continue;
      Class<?>[] parameters = method.getParameterTypes();
      if (parameters.length != 3) continue;
      require(method.getDeclaringClass() == String.class && method.getReturnType() == Integer.TYPE,
          "owner and return type");
      require(parameters[1] == Integer.TYPE && parameters[2] == Integer.TYPE, "range parameters");
      require(method.getModifiers() == Modifier.PUBLIC && !method.isBridge() && !method.isSynthetic() &&
          !method.isVarArgs() && method.getExceptionTypes().length == 0, "method metadata");
      if (parameters[0] == Integer.TYPE) codePoints++;
      else if (parameters[0] == String.class) substrings++;
      else throw new AssertionError("unexpected indexOf range overload");
    }
    require(codePoints == 1 && substrings == 1, "exactly two indexOf range overloads");
  }

  private static void wrappedFailure(Method method, Object value, int begin, int end,
      Class<? extends Throwable> type) throws Throwable {
    try {
      method.invoke("ababa", value, begin, end);
    } catch (InvocationTargetException expected) {
      require(type.isInstance(expected.getCause()), "wrapped cause " + expected.getCause());
      return;
    }
    throw new AssertionError("expected wrapped " + type.getName());
  }

  private static void reflection() throws Throwable {
    enumeration(String.class.getDeclaredMethods());
    enumeration(String.class.getMethods());
    for (Class<?> valueType : new Class<?>[] {Integer.TYPE, String.class}) {
      Method method = String.class.getMethod("indexOf", valueType, Integer.TYPE, Integer.TYPE);
      require(method.equals(String.class.getDeclaredMethod("indexOf", valueType, Integer.TYPE,
          Integer.TYPE)), "declared and public method agree");
      Object value = valueType == Integer.TYPE ? Integer.valueOf('a') : "aba";
      require(((Integer) method.invoke("ababa", value, 1, 5)).intValue() == 2, "reflective match");
      require(((Integer) method.invoke("ababa", value, 1, 2)).intValue() == -1, "reflective miss");
      wrappedFailure(method, value, -1, 5, StringIndexOutOfBoundsException.class);
      if (valueType == String.class) wrappedFailure(method, null, -1, 5, NullPointerException.class);
    }
  }

  private static void methodHandles() throws Throwable {
    for (boolean unreflect : new boolean[] {false, true}) {
      MethodHandles.Lookup lookup = MethodHandles.publicLookup();
      MethodHandle codePoint = unreflect
          ? lookup.unreflect(String.class.getMethod("indexOf", Integer.TYPE, Integer.TYPE, Integer.TYPE))
          : lookup.findVirtual(String.class, "indexOf",
              MethodType.methodType(Integer.TYPE, Integer.TYPE, Integer.TYPE, Integer.TYPE));
      MethodHandle substring = unreflect
          ? lookup.unreflect(String.class.getMethod("indexOf", String.class, Integer.TYPE, Integer.TYPE))
          : lookup.findVirtual(String.class, "indexOf",
              MethodType.methodType(Integer.TYPE, String.class, Integer.TYPE, Integer.TYPE));
      require((int) codePoint.invokeExact("a\uD83D\uDE42b", 0x1F642, 1, 3) == 1,
          "code point handle match");
      require((int) codePoint.invokeExact("a\uD83D\uDE42b", 0x1F642, 1, 2) == -1,
          "code point handle clipped pair");
      require((int) substring.invokeExact("ababa", "aba", 1, 5) == 2, "substring handle match");
      require((int) substring.invokeExact("ababa", "", 5, 5) == 5, "substring handle empty");
      failure(StringIndexOutOfBoundsException.class, () -> {
        int ignored = (int) codePoint.invokeExact("abc", -1, 0, 4);
      });
      failure(StringIndexOutOfBoundsException.class, () -> {
        int ignored = (int) substring.invokeExact("abc", "", -1, 3);
      });
      failure(NullPointerException.class, () -> {
        int ignored = (int) substring.invokeExact("abc", (String) null, -1, 3);
      });
    }
  }

  private static void legacyIndexOf() {
    require("ababa".indexOf('a') == 0 && "ababa".indexOf('a', 1) == 2,
        "legacy code point overloads");
    require("ababa".indexOf("aba") == 0 && "ababa".indexOf("aba", 1) == 2,
        "legacy substring overloads");
    require("abc".indexOf('a', Integer.MIN_VALUE) == 0 &&
        "abc".indexOf("a", Integer.MIN_VALUE) == 0, "legacy negative start clamping");
    require("abc".indexOf('a', Integer.MAX_VALUE) == -1 &&
        "abc".indexOf("a", Integer.MAX_VALUE) == -1 &&
        "abc".indexOf("", Integer.MAX_VALUE) == 3, "legacy excessive start clamping");
    require("a\uD83D\uDE42b".indexOf(0x1F642) == 1 &&
        "a\uD83D\uDE42b".indexOf(0x1F642, 2) == -1, "legacy supplementary code point");
  }

  private static void report(String group, Action action) throws Throwable {
    action.run();
    System.out.println("string-indexof-range-" + group + "=true");
  }

  public static void main(String[] args) throws Throwable {
    report("code-points", Java21StringIndexOfRange::codePoints);
    report("substrings", Java21StringIndexOfRange::substrings);
    report("boundaries", Java21StringIndexOfRange::boundaries);
    report("range-matrix", Java21StringIndexOfRange::rangeMatrix);
    report("exceptions", Java21StringIndexOfRange::exceptions);
    report("reflection", Java21StringIndexOfRange::reflection);
    report("method-handles", Java21StringIndexOfRange::methodHandles);
    report("legacy-indexof", Java21StringIndexOfRange::legacyIndexOf);
  }
}
