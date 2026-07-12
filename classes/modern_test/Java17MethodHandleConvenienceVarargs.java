package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Arrays;
import java.util.Iterator;

public class Java17MethodHandleConvenienceVarargs {
  private static int sideEffect;

  public static int init(String... values) {
    return values.length;
  }

  public static boolean belowTwiceLength(int state, String... values) {
    return state < values.length * 2;
  }

  public static int increment(int state, String... values) {
    return state + 1;
  }

  public static int start(String... values) {
    return 1;
  }

  public static int end(String... values) {
    return values.length + 1;
  }

  public static int addIndex(int state, int index, String... values) {
    return state + index;
  }

  public static Iterator<String> iterator(String... values) {
    return Arrays.asList(values).iterator();
  }

  public static String textInit(String... values) {
    return Integer.toString(values.length);
  }

  public static String append(String state, String element, String... values) {
    return state + ":" + element + values.length;
  }

  public static String defaultTextInit(Iterable<String> values, String... suffixes) {
    return Integer.toString(suffixes.length);
  }

  public static String defaultAppend(
      String state, String element, Iterable<String> values, String... suffixes) {
    return state + ":" + element + suffixes.length;
  }

  public static void reset(String... values) {
    sideEffect = values.length;
  }

  public static boolean sideEffectBelowTwiceLength(String... values) {
    return sideEffect < values.length * 2;
  }

  public static void incrementSideEffect(String... values) {
    sideEffect++;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle init = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "init",
        MethodType.methodType(int.class, String[].class));
    MethodHandle pred = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "belowTwiceLength",
        MethodType.methodType(boolean.class, int.class, String[].class));
    MethodHandle increment = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "increment",
        MethodType.methodType(int.class, int.class, String[].class));
    MethodHandle start = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "start",
        MethodType.methodType(int.class, String[].class));
    MethodHandle end = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "end",
        MethodType.methodType(int.class, String[].class));
    MethodHandle addIndex = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "addIndex",
        MethodType.methodType(int.class, int.class, int.class, String[].class));
    MethodHandle iterator = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "iterator",
        MethodType.methodType(Iterator.class, String[].class));
    MethodHandle textInit = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "textInit",
        MethodType.methodType(String.class, String[].class));
    MethodHandle append = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "append",
        MethodType.methodType(String.class, String.class, String.class, String[].class));
    MethodHandle defaultTextInit = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "defaultTextInit",
        MethodType.methodType(String.class, Iterable.class, String[].class));
    MethodHandle defaultAppend = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "defaultAppend",
        MethodType.methodType(
            String.class, String.class, String.class, Iterable.class, String[].class));
    MethodHandle reset = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "reset",
        MethodType.methodType(void.class, String[].class));
    MethodHandle sideEffectPred = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "sideEffectBelowTwiceLength",
        MethodType.methodType(boolean.class, String[].class));
    MethodHandle sideEffectBody = lookup.findStatic(
        Java17MethodHandleConvenienceVarargs.class,
        "incrementSideEffect",
        MethodType.methodType(void.class, String[].class));

    System.out.println(init.isVarargsCollector());
    String[] values = new String[] { "a", "b" };

    MethodHandle whileLoop = MethodHandles.whileLoop(init, pred, increment);
    System.out.println(whileLoop.isVarargsCollector());
    System.out.println((int) whileLoop.invokeExact(values));

    MethodHandle doWhileLoop = MethodHandles.doWhileLoop(init, increment, pred);
    System.out.println(doWhileLoop.isVarargsCollector());
    System.out.println((int) doWhileLoop.invokeExact(values));

    MethodHandle countedLoop = MethodHandles.countedLoop(start, end, init, addIndex);
    System.out.println(countedLoop.isVarargsCollector());
    System.out.println((int) countedLoop.invokeExact(values));

    MethodHandle countedFromZero = MethodHandles.countedLoop(end, init, addIndex);
    System.out.println(countedFromZero.isVarargsCollector());
    System.out.println((int) countedFromZero.invokeExact(values));

    MethodHandle iteratedLoop = MethodHandles.iteratedLoop(iterator, textInit, append);
    System.out.println(iteratedLoop.isVarargsCollector());
    System.out.println((String) iteratedLoop.invokeExact(values));

    Iterable<String> iterable = Arrays.asList("x", "y");
    String[] suffixes = new String[] { "!", "?" };
    MethodHandle defaultIteratedLoop = MethodHandles.iteratedLoop(
        null, defaultTextInit, defaultAppend);
    System.out.println(defaultIteratedLoop.isVarargsCollector());
    System.out.println((String) defaultIteratedLoop.invokeExact(iterable, suffixes));

    MethodHandle mixedWhileLoop = MethodHandles.whileLoop(
        init.asFixedArity(), pred, increment.asFixedArity());
    System.out.println(mixedWhileLoop.isVarargsCollector());
    System.out.println((int) mixedWhileLoop.invokeExact(values));

    MethodHandle voidWhileLoop = MethodHandles.whileLoop(reset, sideEffectPred, sideEffectBody);
    System.out.println(voidWhileLoop.isVarargsCollector());
    sideEffect = -1;
    voidWhileLoop.invokeExact(values);
    System.out.println(sideEffect);

    MethodHandle voidDoWhileLoop = MethodHandles.doWhileLoop(reset, sideEffectBody, sideEffectPred);
    System.out.println(voidDoWhileLoop.isVarargsCollector());
    sideEffect = -1;
    voidDoWhileLoop.invokeExact(values);
    System.out.println(sideEffect);
  }
}
