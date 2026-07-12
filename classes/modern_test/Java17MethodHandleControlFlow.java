package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandleControlFlow {
  private static int sideEffect;

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

  public static void resetSideEffect(int limit) {
    sideEffect = 0;
  }

  public static boolean sideEffectBelow(int limit) {
    return sideEffect < limit;
  }

  public static void incrementSideEffect(int limit) {
    sideEffect++;
  }

  public static boolean sideEffectBelowThree() {
    return sideEffect < 3;
  }

  public static void incrementSideEffectNoArgs() {
    sideEffect++;
  }

  public static void addSideEffectIndex(int index, int limit) {
    sideEffect += index;
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

    MethodHandle one = MethodHandles.constant(int.class, 1);
    MethodHandle three = MethodHandles.constant(int.class, 3);
    MethodHandle keepState = MethodHandles.dropArguments(
        MethodHandles.identity(int.class), 1, int.class);
    MethodHandle countedDefaultPrimitive = MethodHandles.countedLoop(one, three, null, keepState);
    System.out.println((int) countedDefaultPrimitive.invokeExact());
    System.out.println(countedDefaultPrimitive.type().toMethodDescriptorString());

    MethodHandle countedRangeDefaultReference = MethodHandles.countedLoop(
        rangeStart, rangeEnd, null, rangeAppendIndex);
    System.out.println((String) countedRangeDefaultReference.invokeExact("x", 2, 5));
    System.out.println(countedRangeDefaultReference.type().toMethodDescriptorString());

    MethodHandle resetSideEffect = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "resetSideEffect",
        MethodType.methodType(void.class, int.class));
    MethodHandle sideEffectBelow = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "sideEffectBelow",
        MethodType.methodType(boolean.class, int.class));
    MethodHandle incrementSideEffect = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "incrementSideEffect",
        MethodType.methodType(void.class, int.class));
    MethodHandle voidWhile = MethodHandles.whileLoop(resetSideEffect, sideEffectBelow, incrementSideEffect);
    System.out.println(voidWhile.type().toMethodDescriptorString());
    sideEffect = 99;
    voidWhile.invokeExact(4);
    System.out.println(sideEffect);

    MethodHandle sideEffectBelowThree = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "sideEffectBelowThree",
        MethodType.methodType(boolean.class));
    MethodHandle incrementSideEffectNoArgs = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "incrementSideEffectNoArgs",
        MethodType.methodType(void.class));
    MethodHandle voidWhileDefault = MethodHandles.whileLoop(null, sideEffectBelowThree, incrementSideEffectNoArgs);
    System.out.println(voidWhileDefault.type().toMethodDescriptorString());
    sideEffect = 0;
    voidWhileDefault.invokeExact();
    System.out.println(sideEffect);

    MethodHandle voidDoWhile = MethodHandles.doWhileLoop(resetSideEffect, incrementSideEffect, sideEffectBelow);
    System.out.println(voidDoWhile.type().toMethodDescriptorString());
    sideEffect = 99;
    voidDoWhile.invokeExact(4);
    System.out.println(sideEffect);

    MethodHandle addSideEffectIndex = lookup.findStatic(
        Java17MethodHandleControlFlow.class,
        "addSideEffectIndex",
        MethodType.methodType(void.class, int.class, int.class));
    MethodHandle voidCounted = MethodHandles.countedLoop(count, resetSideEffect, addSideEffectIndex);
    System.out.println(voidCounted.type().toMethodDescriptorString());
    sideEffect = 99;
    voidCounted.invokeExact(5);
    System.out.println(sideEffect);

    MethodHandle voidCountedDefault = MethodHandles.countedLoop(count, null, addSideEffectIndex);
    System.out.println(voidCountedDefault.type().toMethodDescriptorString());
    sideEffect = 10;
    voidCountedDefault.invokeExact(4);
    System.out.println(sideEffect);
  }
}
