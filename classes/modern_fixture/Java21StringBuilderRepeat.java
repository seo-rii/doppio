package classes.modern_test;

public class Java21StringBuilderRepeat {
  private interface Action {
    void run() throws Throwable;
  }

  private static final class RecordingSequence implements CharSequence {
    private final String value;
    private final boolean rejectAccess;
    private int accesses;
    private Object monitor;
    private boolean expectLock;

    RecordingSequence(String value, boolean rejectAccess) {
      this.value = value;
      this.rejectAccess = rejectAccess;
    }

    private void accessed() {
      accesses++;
      if (rejectAccess) {
        throw new AssertionError("unexpected CharSequence access");
      }
      if (monitor != null && Thread.holdsLock(monitor) != expectLock) {
        throw new AssertionError("unexpected receiver monitor state");
      }
    }

    public int length() {
      accessed();
      return value.length();
    }

    public char charAt(int index) {
      accessed();
      return value.charAt(index);
    }

    public CharSequence subSequence(int start, int end) {
      throw new AssertionError("unexpected subSequence call");
    }

    public String toString() {
      throw new AssertionError("unexpected toString call");
    }
  }

  private static String repeated(String value, int count) {
    String result = "";
    for (int i = 0; i < count; i++) {
      result += value;
    }
    return result;
  }

  private static void require(boolean condition, String label) {
    if (!condition) {
      throw new AssertionError(label);
    }
  }

  private static boolean checkCodePoints(boolean buffer) {
    int[] codePoints = {0, 'A', 0x03A9, 0xD800, 0xDFFF, 0xFFFF, 0x10000, 0x1F642, 0x10FFFF};
    int[] counts = {0, 1, 2, 7};
    for (int codePoint : codePoints) {
      for (int count : counts) {
        String expected = "p:" + repeated(new String(Character.toChars(codePoint)), count);
        if (buffer) {
          StringBuffer target = new StringBuffer(1).append("p:");
          if (target.repeat(codePoint, count) != target || target.length() != expected.length() ||
              !expected.equals(target.toString()) || !expected.concat("!").equals(target.append('!').toString())) {
            return false;
          }
        } else {
          StringBuilder target = new StringBuilder(1).append("p:");
          if (target.repeat(codePoint, count) != target || target.length() != expected.length() ||
              !expected.equals(target.toString()) || !expected.concat("!").equals(target.append('!').toString())) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private static boolean checkSequences(boolean buffer) {
    CharSequence[] sequences = {
      null, "", "x", "\u03A9\uD83D\uDE42\uD800", new StringBuilder("ab"),
      new StringBuffer("cd"), new RecordingSequence("e\u03A9", false)
    };
    String[] values = {"null", "", "x", "\u03A9\uD83D\uDE42\uD800", "ab", "cd", "e\u03A9"};
    int[] counts = {0, 1, 2, 5};
    for (int i = 0; i < sequences.length; i++) {
      for (int count : counts) {
        String expected = "p:" + repeated(values[i], count);
        if (buffer) {
          StringBuffer target = new StringBuffer(1).append("p:");
          if (target.repeat(sequences[i], count) != target || target.length() != expected.length() ||
              !expected.equals(target.toString()) || !expected.concat("!").equals(target.append('!').toString())) {
            return false;
          }
        } else {
          StringBuilder target = new StringBuilder(1).append("p:");
          if (target.repeat(sequences[i], count) != target || target.length() != expected.length() ||
              !expected.equals(target.toString()) || !expected.concat("!").equals(target.append('!').toString())) {
            return false;
          }
        }
      }
    }
    return ((RecordingSequence) sequences[sequences.length - 1]).accesses > 0;
  }

  private static boolean checkSelfAndEmpty(boolean buffer) {
    int[] counts = {0, 1, 2, 5};
    for (int count : counts) {
      String expected = repeated("a\u03A9\uD83D\uDE42", count + 1);
      if (buffer) {
        StringBuffer target = new StringBuffer("a\u03A9\uD83D\uDE42");
        if (target.repeat(target, count) != target || !expected.equals(target.toString())) {
          return false;
        }
      } else {
        StringBuilder target = new StringBuilder("a\u03A9\uD83D\uDE42");
        if (target.repeat(target, count) != target || !expected.equals(target.toString())) {
          return false;
        }
      }
    }
    RecordingSequence untouched = new RecordingSequence("unused", true);
    if (buffer) {
      StringBuffer target = new StringBuffer("p:");
      StringBuffer empty = new StringBuffer();
      return target.repeat(untouched, 0) == target && untouched.accesses == 0 &&
          target.repeat("", Integer.MAX_VALUE) == target && "p:".equals(target.toString()) &&
          empty.repeat(empty, Integer.MAX_VALUE) == empty && empty.length() == 0;
    }
    StringBuilder target = new StringBuilder("p:");
    StringBuilder empty = new StringBuilder();
    return target.repeat(untouched, 0) == target && untouched.accesses == 0 &&
        target.repeat("", Integer.MAX_VALUE) == target && "p:".equals(target.toString()) &&
        empty.repeat(empty, Integer.MAX_VALUE) == empty && empty.length() == 0;
  }

  private static String illegalArgument(Action action) throws Throwable {
    try {
      action.run();
      throw new AssertionError("expected IllegalArgumentException");
    } catch (IllegalArgumentException expected) {
      return expected.getMessage();
    }
  }

  private static boolean checkMonitorAndCache(boolean buffer) {
    RecordingSequence sequence = new RecordingSequence("x\u03A9", false);
    if (buffer) {
      StringBuffer target = new StringBuffer("p:");
      String before = target.toString();
      sequence.monitor = target;
      sequence.expectLock = true;
      target.repeat(sequence, 2);
      String afterSequence = target.toString();
      target.repeat('!', 2);
      return sequence.accesses > 0 && "p:".equals(before) &&
          "p:x\u03A9x\u03A9".equals(afterSequence) && "p:x\u03A9x\u03A9!!".equals(target.toString());
    }
    StringBuilder target = new StringBuilder("p:");
    String before = target.toString();
    sequence.monitor = target;
    sequence.expectLock = false;
    target.repeat(sequence, 2);
    String afterSequence = target.toString();
    target.repeat('!', 2);
    return sequence.accesses > 0 && "p:".equals(before) &&
        "p:x\u03A9x\u03A9".equals(afterSequence) && "p:x\u03A9x\u03A9!!".equals(target.toString());
  }

  private static void outOfMemory(Action action) throws Throwable {
    try {
      action.run();
      throw new AssertionError("expected OutOfMemoryError");
    } catch (OutOfMemoryError expected) {
      // Both requested lengths exceed Integer.MAX_VALUE without allocating a large array.
    }
  }

  private static boolean checkOverflow(boolean buffer) throws Throwable {
    StringBuilder builder = new StringBuilder("p:");
    StringBuffer targetBuffer = new StringBuffer("p:");
    outOfMemory(() -> {
      if (buffer) targetBuffer.repeat("ab", Integer.MAX_VALUE); else builder.repeat("ab", Integer.MAX_VALUE);
    });
    outOfMemory(() -> {
      if (buffer) targetBuffer.repeat(0x1F642, Integer.MAX_VALUE); else builder.repeat(0x1F642, Integer.MAX_VALUE);
    });
    return "p:".equals(builder.toString()) && "p:".equals(targetBuffer.toString());
  }

  private static boolean checkExceptions(boolean buffer) throws Throwable {
    StringBuilder builder = new StringBuilder("p:");
    StringBuffer targetBuffer = new StringBuffer("p:");
    String negativeMessage = illegalArgument(() -> {
      if (buffer) targetBuffer.repeat('a', -1); else builder.repeat('a', -1);
    });
    require("count is negative: -1".equals(negativeMessage), "negative count message");
    int[] invalidCodePoints = {-1, 0x110000, Integer.MIN_VALUE, Integer.MAX_VALUE};
    for (int codePoint : invalidCodePoints) {
      if (buffer) {
        require(targetBuffer.repeat(codePoint, 0) == targetBuffer, "buffer invalid code point zero count");
      } else {
        require(builder.repeat(codePoint, 0) == builder, "builder invalid code point zero count");
      }
      illegalArgument(() -> {
        if (buffer) targetBuffer.repeat(codePoint, 1); else builder.repeat(codePoint, 1);
      });
      String actual = illegalArgument(() -> {
        if (buffer) targetBuffer.repeat(codePoint, -1); else builder.repeat(codePoint, -1);
      });
      require(java.util.Objects.equals(negativeMessage, actual), "negative count precedes code point validation");
    }
    RecordingSequence untouched = new RecordingSequence("unused", true);
    for (CharSequence sequence : new CharSequence[] {null, "", untouched}) {
      String actual = illegalArgument(() -> {
        if (buffer) targetBuffer.repeat(sequence, -1); else builder.repeat(sequence, -1);
      });
      require(java.util.Objects.equals(negativeMessage, actual), "negative count precedes sequence access");
    }
    illegalArgument(() -> {
      if (buffer) targetBuffer.repeat('a', Integer.MIN_VALUE); else builder.repeat('a', Integer.MIN_VALUE);
    });
    return untouched.accesses == 0 && "p:".equals(builder.toString()) && "p:".equals(targetBuffer.toString());
  }

  private static void checkEnumeration(Class<?> owner, java.lang.reflect.Method[] methods) {
    int concrete = 0;
    int bridges = 0;
    for (java.lang.reflect.Method method : methods) {
      if (!"repeat".equals(method.getName())) {
        continue;
      }
      Class<?>[] parameters = method.getParameterTypes();
      require(parameters.length == 2 && parameters[1] == Integer.TYPE &&
          (parameters[0] == Integer.TYPE || parameters[0] == CharSequence.class), "repeat enumerated parameters");
      require(method.getDeclaringClass() == owner, "repeat enumerated owner");
      if (method.isBridge()) {
        bridges++;
        require(method.isSynthetic() && method.getReturnType() == owner.getSuperclass() &&
            method.getModifiers() == (java.lang.reflect.Modifier.PUBLIC | 0x0040 | 0x1000),
            "repeat bridge metadata");
      } else {
        concrete++;
        require(!method.isSynthetic() && method.getReturnType() == owner, "repeat concrete metadata");
      }
    }
    require(concrete == 2 && bridges == 2, "repeat enumeration counts");
  }

  private static boolean checkReflection(Class<?> owner) throws Throwable {
    Class<?>[] inputs = {Integer.TYPE, CharSequence.class};
    Object[] arguments = {0x1F642, "ab"};
    String[] expected = {"p:\uD83D\uDE42\uD83D\uDE42", "p:abab"};
    int modifiers = java.lang.reflect.Modifier.PUBLIC;
    if (owner == StringBuffer.class) {
      modifiers |= java.lang.reflect.Modifier.SYNCHRONIZED;
    }
    checkEnumeration(owner, owner.getDeclaredMethods());
    checkEnumeration(owner, owner.getMethods());
    for (int i = 0; i < inputs.length; i++) {
      java.lang.reflect.Method declared = owner.getDeclaredMethod("repeat", inputs[i], Integer.TYPE);
      java.lang.reflect.Method inherited = owner.getMethod("repeat", inputs[i], Integer.TYPE);
      require(declared.equals(inherited) && declared.getDeclaringClass() == owner &&
          declared.getReturnType() == owner && declared.getModifiers() == modifiers &&
          java.util.Arrays.equals(declared.getParameterTypes(), new Class<?>[] {inputs[i], Integer.TYPE}) &&
          declared.getExceptionTypes().length == 0 && !declared.isBridge() &&
          !declared.isSynthetic() && !declared.isVarArgs(), "repeat reflection metadata");
      Object target = owner == StringBuffer.class ? new StringBuffer("p:") : new StringBuilder("p:");
      require(declared.invoke(target, arguments[i], 2) == target && expected[i].equals(target.toString()),
          "repeat reflection result");
      int enumerated = 0;
      for (java.lang.reflect.Method method : owner.getDeclaredMethods()) {
        if (method.equals(declared)) {
          enumerated++;
        }
      }
      require(enumerated == 1, "repeat reflection enumeration");
      try {
        declared.invoke(target, arguments[i], -1);
        return false;
      } catch (java.lang.reflect.InvocationTargetException expectedFailure) {
        require(expectedFailure.getCause() instanceof IllegalArgumentException,
            "repeat reflection exception wrapping");
      }
      require(expected[i].equals(target.toString()), "repeat reflected failure preserves receiver");
      java.lang.invoke.MethodHandle handle = java.lang.invoke.MethodHandles.lookup().unreflect(declared);
      require(handle.type().returnType() == owner && handle.type().parameterCount() == 3 &&
          handle.type().parameterType(0) == owner && handle.type().parameterType(1) == inputs[i] &&
          handle.type().parameterType(2) == Integer.TYPE, "repeat method handle type");
      Object handleTarget = owner == StringBuffer.class ? new StringBuffer("p:") : new StringBuilder("p:");
      require(handle.invokeWithArguments(handleTarget, arguments[i], 2) == handleTarget &&
          expected[i].equals(handleTarget.toString()), "repeat method handle result");
      final Object argument = arguments[i];
      illegalArgument(() -> handle.invokeWithArguments(handleTarget, argument, -1));
      require(expected[i].equals(handleTarget.toString()), "repeat method handle failure preserves receiver");
    }
    for (java.lang.reflect.Method bridge : owner.getDeclaredMethods()) {
      if (!"repeat".equals(bridge.getName()) || !bridge.isBridge()) {
        continue;
      }
      Object target = owner == StringBuffer.class ? new StringBuffer("p:") : new StringBuilder("p:");
      RecordingSequence sequence = new RecordingSequence("ab", false);
      sequence.monitor = target;
      sequence.expectLock = owner == StringBuffer.class;
      boolean codePoint = bridge.getParameterTypes()[0] == Integer.TYPE;
      Object argument = codePoint ? Integer.valueOf('z') : sequence;
      String result = codePoint ? "p:zz" : "p:abab";
      require(bridge.invoke(target, argument, 2) == target && result.equals(target.toString()),
          "repeat bridge invocation and monitor");
      try {
        bridge.invoke(target, argument, -1);
        return false;
      } catch (java.lang.reflect.InvocationTargetException expectedFailure) {
        require(expectedFailure.getCause() instanceof IllegalArgumentException,
            "repeat bridge exception wrapping");
      }
    }
    return true;
  }

  private static void printGroup(String label, boolean builder, boolean buffer) {
    require(builder && buffer, label);
    System.out.println(label + "=" + builder + "," + buffer);
  }

  public static void main(String[] args) throws Throwable {
    printGroup("code-points", checkCodePoints(false), checkCodePoints(true));
    printGroup("sequences", checkSequences(false), checkSequences(true));
    printGroup("self-empty", checkSelfAndEmpty(false), checkSelfAndEmpty(true));
    printGroup("monitor-cache", checkMonitorAndCache(false), checkMonitorAndCache(true));
    printGroup("exceptions", checkExceptions(false), checkExceptions(true));
    printGroup("overflow", checkOverflow(false), checkOverflow(true));
    printGroup("reflection-handles", checkReflection(StringBuilder.class), checkReflection(StringBuffer.class));
  }
}
