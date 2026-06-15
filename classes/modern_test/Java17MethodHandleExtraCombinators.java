package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Arrays;

public class Java17MethodHandleExtraCombinators {
  private static String cleanupLog = "";

  public static String join(String text, int value) {
    return text + ":" + value;
  }

  public static String longLabel(long value) {
    return "long:" + value;
  }

  public static String triple(String first, String second, String third) {
    return first + "/" + second + "/" + third;
  }

  public static String foldPrefix(String first, String second) {
    return first + ":" + second;
  }

  public static String foldTarget(String prefix, String first, String second) {
    return prefix + "|" + first + "|" + second;
  }

  public static String foldAtTarget(String first, String folded, int value) {
    return first + ":" + folded + ":" + value;
  }

  public static String foldAtCombiner(int value) {
    return "n" + value;
  }

  public static String fail(String text) {
    throw new IllegalStateException("fail:" + text);
  }

  public static String tryTarget(String text, int value) {
    return "target:" + text + ":" + value;
  }

  public static String tryFail(String text, int value) {
    throw new IllegalArgumentException("try-fail:" + text + ":" + value);
  }

  public static String tryCleanup(Throwable throwable, String result, String text) {
    cleanupLog = (throwable == null ? "none" : throwable.getClass().getSimpleName() + ":" + throwable.getMessage()) +
        "|" + result + "|" + text;
    return "cleanup:" + cleanupLog;
  }

  public static void tryVoidTarget(String text) {
    cleanupLog = "void-target:" + text;
  }

  public static void tryVoidCleanup(Throwable throwable, String text) {
    cleanupLog = (throwable == null ? "void-none" : throwable.getClass().getSimpleName()) +
        "|" + text + "|" + cleanupLog;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();

    MethodHandle join = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "join",
        MethodType.methodType(String.class, String.class, int.class));
    MethodHandle exactInvoker = MethodHandles.exactInvoker(join.type());
    MethodHandle looseInvoker = MethodHandles.invoker(join.type());
    System.out.println((String) exactInvoker.invokeExact(join, "exact", 3));
    System.out.println((String) looseInvoker.invoke(join, "loose", Integer.valueOf(4)));
    System.out.println(exactInvoker.type().toMethodDescriptorString());

    MethodHandle triple = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "triple",
        MethodType.methodType(String.class, String.class, String.class, String.class));
    MethodHandle collected = MethodHandles.collectArguments(triple, 1, join);
    System.out.println((String) collected.invokeExact("A", "B", 5, "C"));
    System.out.println(collected.type().toMethodDescriptorString());

    MethodHandle foldPrefix = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "foldPrefix",
        MethodType.methodType(String.class, String.class, String.class));
    MethodHandle foldTarget = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "foldTarget",
        MethodType.methodType(String.class, String.class, String.class, String.class));
    MethodHandle folded = MethodHandles.foldArguments(foldTarget, foldPrefix);
    System.out.println((String) folded.invokeExact("left", "right"));
    System.out.println(folded.type().toMethodDescriptorString());

    MethodHandle longLabel = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "longLabel",
        MethodType.methodType(String.class, long.class));
    MethodHandle explicitDoubleToLong = MethodHandles.explicitCastArguments(
        longLabel,
        MethodType.methodType(String.class, double.class));
    System.out.println((String) explicitDoubleToLong.invokeExact(12.75d));
    System.out.println(explicitDoubleToLong.type().toMethodDescriptorString());

    MethodHandle stringGetter = MethodHandles.arrayElementGetter(String[].class);
    MethodHandle stringSetter = MethodHandles.arrayElementSetter(String[].class);
    String[] strings = new String[] { "zero", "one" };
    System.out.println((String) stringGetter.invokeExact(strings, 1));
    stringSetter.invokeExact(strings, 1, "changed");
    System.out.println(strings[1]);
    System.out.println(stringGetter.type().toMethodDescriptorString());

    MethodHandle intGetter = MethodHandles.arrayElementGetter(int[].class);
    MethodHandle intSetter = MethodHandles.arrayElementSetter(int[].class);
    int[] ints = new int[] { 7, 8 };
    System.out.println((int) intGetter.invokeExact(ints, 0));
    intSetter.invokeExact(ints, 0, 9);
    System.out.println(ints[0]);
    System.out.println(intSetter.type().toMethodDescriptorString());

    MethodHandle throwing = MethodHandles.throwException(String.class, IllegalStateException.class);
    try {
      String value = (String) throwing.invokeExact(new IllegalStateException("boom"));
      System.out.println(value);
    } catch (IllegalStateException e) {
      System.out.println(e.getMessage());
    }
    System.out.println(throwing.type().toMethodDescriptorString());

    MethodHandle zeroInt = MethodHandles.zero(int.class);
    MethodHandle zeroString = MethodHandles.zero(String.class);
    System.out.println((int) zeroInt.invokeExact());
    System.out.println(((String) zeroString.invokeExact()) == null);
    System.out.println(zeroInt.type().toMethodDescriptorString());
    System.out.println(zeroString.type().toMethodDescriptorString());

    MethodHandle emptyString = MethodHandles.empty(
        MethodType.methodType(String.class, int.class, String.class));
    System.out.println(((String) emptyString.invokeExact(4, "empty")) == null);
    System.out.println(emptyString.type().toMethodDescriptorString());

    MethodHandle arrayLength = MethodHandles.arrayLength(String[].class);
    MethodHandle arrayConstructor = MethodHandles.arrayConstructor(String[].class);
    String[] constructed = (String[]) arrayConstructor.invokeExact(3);
    System.out.println((int) arrayLength.invokeExact(new String[] { "a", "b", "c", "d" }));
    System.out.println(constructed.length + ":" + (constructed[0] == null));
    System.out.println(arrayLength.type().toMethodDescriptorString());
    System.out.println(arrayConstructor.type().toMethodDescriptorString());

    MethodHandle droppedReturn = MethodHandles.dropReturn(join);
    droppedReturn.invokeExact("drop", 5);
    System.out.println("drop-return");
    System.out.println(droppedReturn.type().toMethodDescriptorString());

    MethodHandle matchedDrop = MethodHandles.dropArgumentsToMatch(
        MethodHandles.identity(String.class),
        0,
        Arrays.<Class<?>>asList(int.class, String.class),
        1);
    System.out.println((String) matchedDrop.invokeExact(2, "matched"));
    System.out.println(matchedDrop.type().toMethodDescriptorString());

    MethodHandle foldAtTarget = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "foldAtTarget",
        MethodType.methodType(String.class, String.class, String.class, int.class));
    MethodHandle foldAtCombiner = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "foldAtCombiner",
        MethodType.methodType(String.class, int.class));
    MethodHandle foldedAtOne = MethodHandles.foldArguments(foldAtTarget, 1, foldAtCombiner);
    System.out.println((String) foldedAtOne.invokeExact("fold", 6));
    System.out.println(foldedAtOne.type().toMethodDescriptorString());

    MethodHandle tryTarget = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "tryTarget",
        MethodType.methodType(String.class, String.class, int.class));
    MethodHandle tryFail = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "tryFail",
        MethodType.methodType(String.class, String.class, int.class));
    MethodHandle tryCleanup = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "tryCleanup",
        MethodType.methodType(String.class, Throwable.class, String.class, String.class));
    MethodHandle tried = MethodHandles.tryFinally(tryTarget, tryCleanup);
    System.out.println((String) tried.invokeExact("try", 7));
    System.out.println(cleanupLog);
    MethodHandle triedFail = MethodHandles.tryFinally(tryFail, tryCleanup);
    try {
      String value = (String) triedFail.invokeExact("bad", 8);
      System.out.println(value);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getMessage());
      System.out.println(cleanupLog);
    }
    System.out.println(tried.type().toMethodDescriptorString());

    MethodHandle tryVoidTarget = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "tryVoidTarget",
        MethodType.methodType(void.class, String.class));
    MethodHandle tryVoidCleanup = lookup.findStatic(
        Java17MethodHandleExtraCombinators.class,
        "tryVoidCleanup",
        MethodType.methodType(void.class, Throwable.class, String.class));
    MethodHandle triedVoid = MethodHandles.tryFinally(tryVoidTarget, tryVoidCleanup);
    cleanupLog = "before-void";
    triedVoid.invokeExact("void");
    System.out.println(cleanupLog);
    System.out.println(triedVoid.type().toMethodDescriptorString());
  }
}
