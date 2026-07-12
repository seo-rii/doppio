package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandleTryFinallyVarargs {
  private static int cleanupCalls;
  private static int sideEffect;

  public static String target(String... values) {
    return String.join(",", values);
  }

  public static String failingTarget(String... values) {
    throw new IllegalArgumentException("boom:" + values.length);
  }

  public static String cleanupFixed(
      Throwable thrown, String result, String[] values) {
    cleanupCalls++;
    return result + ":fixed:" + values.length;
  }

  public static String cleanupVarargs(
      Throwable thrown, String result, String... values) {
    cleanupCalls++;
    return result + ":varargs:" + values.length;
  }

  public static void voidTarget(String... values) {
    sideEffect = values.length;
  }

  public static void voidCleanup(Throwable thrown, String... values) {
    sideEffect += values.length * 10;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle target = lookup.findStatic(
        Java17MethodHandleTryFinallyVarargs.class,
        "target",
        MethodType.methodType(String.class, String[].class));
    MethodHandle failingTarget = lookup.findStatic(
        Java17MethodHandleTryFinallyVarargs.class,
        "failingTarget",
        MethodType.methodType(String.class, String[].class));
    MethodHandle cleanupFixed = lookup.findStatic(
        Java17MethodHandleTryFinallyVarargs.class,
        "cleanupFixed",
        MethodType.methodType(
            String.class, Throwable.class, String.class, String[].class));
    MethodHandle cleanupVarargs = lookup.findStatic(
        Java17MethodHandleTryFinallyVarargs.class,
        "cleanupVarargs",
        MethodType.methodType(
            String.class, Throwable.class, String.class, String[].class));
    MethodHandle voidTarget = lookup.findStatic(
        Java17MethodHandleTryFinallyVarargs.class,
        "voidTarget",
        MethodType.methodType(void.class, String[].class));
    MethodHandle voidCleanup = lookup.findStatic(
        Java17MethodHandleTryFinallyVarargs.class,
        "voidCleanup",
        MethodType.methodType(void.class, Throwable.class, String[].class));

    System.out.println(target.isVarargsCollector());
    System.out.println(cleanupFixed.isVarargsCollector());
    System.out.println(cleanupVarargs.isVarargsCollector());
    String[] values = new String[] { "a", "b" };

    MethodHandle varargsTarget = MethodHandles.tryFinally(target, cleanupFixed);
    System.out.println(varargsTarget.isVarargsCollector());
    System.out.println((String) varargsTarget.invokeExact(values));

    MethodHandle varargsCleanup = MethodHandles.tryFinally(
        target.asFixedArity(), cleanupVarargs);
    System.out.println(varargsCleanup.isVarargsCollector());
    System.out.println((String) varargsCleanup.invokeExact(values));

    MethodHandle bothVarargs = MethodHandles.tryFinally(target, cleanupVarargs);
    System.out.println(bothVarargs.isVarargsCollector());
    System.out.println((String) bothVarargs.invokeExact(values));

    cleanupCalls = 0;
    MethodHandle exceptional = MethodHandles.tryFinally(failingTarget, cleanupVarargs);
    try {
      String ignored = (String) exceptional.invokeExact(values);
      System.out.println(ignored);
    } catch (IllegalArgumentException ex) {
      System.out.println(ex.getMessage());
    }
    System.out.println(cleanupCalls);

    MethodHandle voidVarargs = MethodHandles.tryFinally(voidTarget, voidCleanup);
    System.out.println(voidVarargs.isVarargsCollector());
    sideEffect = -1;
    voidVarargs.invokeExact(values);
    System.out.println(sideEffect);
  }
}
