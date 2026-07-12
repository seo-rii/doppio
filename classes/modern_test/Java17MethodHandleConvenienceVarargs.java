package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Arrays;
import java.util.Iterator;

public class Java17MethodHandleConvenienceVarargs {
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
  }
}
