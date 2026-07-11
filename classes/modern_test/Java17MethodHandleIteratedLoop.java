package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

public class Java17MethodHandleIteratedLoop {
  private static int sideEffect;

  public static String seed() {
    return "";
  }

  public static String prefixSeed(String prefix) {
    return prefix + ":";
  }

  public static String join(String state, String element) {
    return state + element;
  }

  public static String joinWithSource(String state, String element, List<String> source) {
    return state + element + source.size();
  }

  public static String joinWithPrefix(String state, String element, String prefix) {
    return state + prefix + element;
  }

  public static Iterator<String> prefixIterator(String prefix) {
    return Arrays.asList("a", "b", "c").iterator();
  }

  public static Iterator<String> noArgIterator() {
    return Arrays.asList("x", "y").iterator();
  }

  public static void resetPrefix(String prefix) {
    sideEffect = 0;
  }

  public static void appendElement(String element, String prefix) {
    sideEffect += prefix.length() + element.length();
  }

  public static void appendElementOnly(String element) {
    sideEffect += element.length();
  }

  public static int sum(int state, Integer element) {
    return state + element.intValue();
  }

  public static String badInit() {
    return "bad";
  }

  public static String noIterator(String ignored) {
    return ignored;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle seed = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "seed",
        MethodType.methodType(String.class));
    MethodHandle prefixSeed = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "prefixSeed",
        MethodType.methodType(String.class, String.class));
    MethodHandle join = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "join",
        MethodType.methodType(String.class, String.class, String.class));
    MethodHandle joinWithSource = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "joinWithSource",
        MethodType.methodType(String.class, String.class, String.class, List.class));
    MethodHandle joinWithPrefix = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "joinWithPrefix",
        MethodType.methodType(String.class, String.class, String.class, String.class));
    MethodHandle prefixIterator = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "prefixIterator",
        MethodType.methodType(Iterator.class, String.class));
    MethodHandle noArgIterator = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "noArgIterator",
        MethodType.methodType(Iterator.class));
    MethodHandle resetPrefix = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "resetPrefix",
        MethodType.methodType(void.class, String.class));
    MethodHandle appendElement = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "appendElement",
        MethodType.methodType(void.class, String.class, String.class));
    MethodHandle appendElementOnly = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "appendElementOnly",
        MethodType.methodType(void.class, String.class));

    MethodHandle defaultIterator = MethodHandles.iteratedLoop(null, seed, join);
    System.out.println(defaultIterator.type().toMethodDescriptorString());
    System.out.println((String) defaultIterator.invokeExact((Iterable<String>) Arrays.asList("a", "b", "c")));

    MethodHandle defaultIteratorWithSource = MethodHandles.iteratedLoop(null, seed, joinWithSource);
    System.out.println(defaultIteratorWithSource.type().toMethodDescriptorString());
    System.out.println((String) defaultIteratorWithSource.invokeExact(Arrays.asList("a", "b")));

    MethodHandle explicitIterator = MethodHandles.iteratedLoop(prefixIterator, prefixSeed, joinWithPrefix);
    System.out.println(explicitIterator.type().toMethodDescriptorString());
    System.out.println((String) explicitIterator.invokeExact("p"));

    MethodHandle explicitNoArgIterator = MethodHandles.iteratedLoop(noArgIterator, seed, join);
    System.out.println(explicitNoArgIterator.type().toMethodDescriptorString());
    System.out.println((String) explicitNoArgIterator.invokeExact());

    MethodHandle sum = lookup.findStatic(
        Java17MethodHandleIteratedLoop.class,
        "sum",
        MethodType.methodType(int.class, int.class, Integer.class));
    MethodHandle sumLoop = MethodHandles.iteratedLoop(null, null, sum);
    System.out.println(sumLoop.type().toMethodDescriptorString());
    System.out.println((int) sumLoop.invokeExact((Iterable<Integer>) Arrays.asList(2, 3, 5)));
    System.out.println((int) sumLoop.invokeExact((Iterable<Integer>) Collections.<Integer>emptyList()));

    MethodHandle voidExplicitIterator = MethodHandles.iteratedLoop(prefixIterator, resetPrefix, appendElement);
    System.out.println(voidExplicitIterator.type().toMethodDescriptorString());
    sideEffect = 99;
    voidExplicitIterator.invokeExact("p");
    System.out.println(sideEffect);

    MethodHandle voidDefaultIterator = MethodHandles.iteratedLoop(null, null, appendElementOnly);
    System.out.println(voidDefaultIterator.type().toMethodDescriptorString());
    sideEffect = 0;
    voidDefaultIterator.invokeExact((Iterable<String>) Arrays.asList("aa", "b"));
    System.out.println(sideEffect);

    try {
      MethodHandles.iteratedLoop(null, seed, null);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":nullBody");
    }
    try {
      MethodHandles.iteratedLoop(
          lookup.findStatic(
              Java17MethodHandleIteratedLoop.class,
              "noIterator",
              MethodType.methodType(String.class, String.class)),
          prefixSeed,
          joinWithPrefix);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":badIterator");
    }
    try {
      MethodHandles.iteratedLoop(
          null,
          lookup.findStatic(
              Java17MethodHandleIteratedLoop.class,
              "badInit",
              MethodType.methodType(String.class)),
          sum);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":badInit");
    }
    try {
      MethodHandles.iteratedLoop(null, seed, joinWithPrefix);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":nullIteratorBadA");
    }
  }
}
