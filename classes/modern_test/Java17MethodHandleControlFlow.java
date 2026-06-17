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

  public static String seed(String prefix, int limit) {
    return prefix;
  }

  public static boolean keepAppending(String value, String prefix, int limit) {
    return value.length() < prefix.length() + limit;
  }

  public static String appendDot(String value, String prefix, int limit) {
    return value + ".";
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
  }
}
