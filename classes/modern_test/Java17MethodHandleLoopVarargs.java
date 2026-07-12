package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandleLoopVarargs {
  private static int sideEffect;

  public static int init(String... values) {
    return values.length;
  }

  public static int step(int state, String... values) {
    return state + 1;
  }

  public static boolean pred(int state, String... values) {
    return state < values.length * 2;
  }

  public static int fini(int state, String... values) {
    return state;
  }

  public static void voidInit(String... values) {
    sideEffect = values.length;
  }

  public static void voidStep(String... values) {
    sideEffect++;
  }

  public static boolean voidPred(String... values) {
    return sideEffect < values.length * 2;
  }

  public static void voidFini(String... values) {
    sideEffect += 10;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle init = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "init",
        MethodType.methodType(int.class, String[].class));
    MethodHandle step = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "step",
        MethodType.methodType(int.class, int.class, String[].class));
    MethodHandle pred = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "pred",
        MethodType.methodType(boolean.class, int.class, String[].class));
    MethodHandle fini = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "fini",
        MethodType.methodType(int.class, int.class, String[].class));
    MethodHandle voidInit = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "voidInit",
        MethodType.methodType(void.class, String[].class));
    MethodHandle voidStep = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "voidStep",
        MethodType.methodType(void.class, String[].class));
    MethodHandle voidPred = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "voidPred",
        MethodType.methodType(boolean.class, String[].class));
    MethodHandle voidFini = lookup.findStatic(
        Java17MethodHandleLoopVarargs.class,
        "voidFini",
        MethodType.methodType(void.class, String[].class));

    System.out.println(init.isVarargsCollector());
    String[] values = new String[] { "a", "b" };

    MethodHandle single = MethodHandles.loop(
        new MethodHandle[] { init, step, pred, fini });
    System.out.println(single.isVarargsCollector());
    System.out.println(single.type().toMethodDescriptorString());
    System.out.println((int) single.invokeExact(values));

    MethodHandle multi = MethodHandles.loop(
        new MethodHandle[] { init, step, pred, fini },
        new MethodHandle[] {});
    System.out.println(multi.isVarargsCollector());
    System.out.println(multi.type().toMethodDescriptorString());
    System.out.println((int) multi.invokeExact(values));

    MethodHandle mixed = MethodHandles.loop(
        new MethodHandle[] {
          init.asFixedArity(), step, pred.asFixedArity(), fini
        });
    System.out.println(mixed.isVarargsCollector());
    System.out.println((int) mixed.invokeExact(values));

    MethodHandle voidLoop = MethodHandles.loop(
        new MethodHandle[] { voidInit, voidStep, voidPred, voidFini });
    System.out.println(voidLoop.isVarargsCollector());
    System.out.println(voidLoop.type().toMethodDescriptorString());
    sideEffect = -1;
    voidLoop.invokeExact(values);
    System.out.println(sideEffect);
  }
}
