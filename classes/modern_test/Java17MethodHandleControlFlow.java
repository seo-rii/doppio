package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandleControlFlow {
  public static int zero(int limit) {
    return 0;
  }

  public static boolean below(int value, int limit) {
    return value < limit;
  }

  public static int increment(int value, int limit) {
    return value + 1;
  }

  public static int count(int limit) {
    return limit;
  }

  public static int addIndex(int value, int index, int limit) {
    return value + index;
  }

  public static String seed(String prefix, int limit) {
    return prefix;
  }

  public static int countText(String prefix, int limit) {
    return limit;
  }

  public static boolean keepAppending(String value, String prefix, int limit) {
    return value.length() < prefix.length() + limit;
  }

  public static String appendDot(String value, String prefix, int limit) {
    return value + ".";
  }

  public static String appendIndex(String value, int index, String prefix, int limit) {
    return value + index;
  }

  public static int rangeStart(String prefix, int start, int end) {
    return start;
  }

  public static int rangeEnd(String prefix, int start, int end) {
    return end;
  }

  public static String rangeSeed(String prefix, int start, int end) {
    return prefix;
  }

  public static String rangeAppendIndex(String value, int index, String prefix, int start, int end) {
    return value + index;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle zero = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "zero",
        MethodType.methodType(int.class, int.class));
    MethodHandle below = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "below",
        MethodType.methodType(boolean.class, int.class, int.class));
    MethodHandle increment = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "increment",
        MethodType.methodType(int.class, int.class, int.class));

    MethodHandle counted = MethodHandles.whileLoop(zero, below, increment);
    System.out.println((int) counted.invokeExact(5));
    System.out.println(counted.type().toMethodDescriptorString());

    MethodHandle defaultStart = MethodHandles.whileLoop(null, below, increment);
    System.out.println((int) defaultStart.invokeExact(3));
    System.out.println(defaultStart.type().toMethodDescriptorString());

    MethodHandle seed = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "seed",
        MethodType.methodType(String.class, String.class, int.class));
    MethodHandle keepAppending = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "keepAppending",
        MethodType.methodType(boolean.class, String.class, String.class, int.class));
    MethodHandle appendDot = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "appendDot",
        MethodType.methodType(String.class, String.class, String.class, int.class));
    MethodHandle text = MethodHandles.whileLoop(seed, keepAppending, appendDot);
    System.out.println((String) text.invokeExact("x", 3));
    System.out.println(text.type().toMethodDescriptorString());

    MethodHandle doCounted = MethodHandles.doWhileLoop(zero, increment, below);
    System.out.println((int) doCounted.invokeExact(5));
    System.out.println(doCounted.type().toMethodDescriptorString());

    MethodHandle doDefaultStart = MethodHandles.doWhileLoop(null, increment, below);
    System.out.println((int) doDefaultStart.invokeExact(3));
    System.out.println(doDefaultStart.type().toMethodDescriptorString());
    System.out.println((int) doCounted.invokeExact(0));

    MethodHandle doText = MethodHandles.doWhileLoop(seed, appendDot, keepAppending);
    System.out.println((String) doText.invokeExact("x", 3));
    System.out.println((String) doText.invokeExact("x", 0));
    System.out.println(doText.type().toMethodDescriptorString());

    MethodHandle count = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "count",
        MethodType.methodType(int.class, int.class));
    MethodHandle addIndex = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "addIndex",
        MethodType.methodType(int.class, int.class, int.class, int.class));
    MethodHandle countedSum = MethodHandles.countedLoop(count, zero, addIndex);
    System.out.println((int) countedSum.invokeExact(5));
    System.out.println(countedSum.type().toMethodDescriptorString());

    MethodHandle countedDefaultStart = MethodHandles.countedLoop(count, null, addIndex);
    System.out.println((int) countedDefaultStart.invokeExact(4));
    System.out.println(countedDefaultStart.type().toMethodDescriptorString());
    System.out.println((int) countedSum.invokeExact(0));

    MethodHandle countText = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "countText",
        MethodType.methodType(int.class, String.class, int.class));
    MethodHandle appendIndex = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "appendIndex",
        MethodType.methodType(String.class, String.class, int.class, String.class, int.class));
    MethodHandle countedText = MethodHandles.countedLoop(countText, seed, appendIndex);
    System.out.println((String) countedText.invokeExact("x", 3));
    System.out.println(countedText.type().toMethodDescriptorString());

    MethodHandle rangeStart = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "rangeStart",
        MethodType.methodType(int.class, String.class, int.class, int.class));
    MethodHandle rangeEnd = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "rangeEnd",
        MethodType.methodType(int.class, String.class, int.class, int.class));
    MethodHandle rangeSeed = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "rangeSeed",
        MethodType.methodType(String.class, String.class, int.class, int.class));
    MethodHandle rangeAppendIndex = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "rangeAppendIndex",
        MethodType.methodType(String.class, String.class, int.class, String.class, int.class, int.class));
    MethodHandle countedRange = MethodHandles.countedLoop(rangeStart, rangeEnd, rangeSeed, rangeAppendIndex);
    System.out.println((String) countedRange.invokeExact("x", 2, 5));
    System.out.println((String) countedRange.invokeExact("x", 5, 2));
    System.out.println(countedRange.type().toMethodDescriptorString());
  }
}
