package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandleLoop {
  public static int init(int limit) {
    return 0;
  }

  public static int step(int state, int limit) {
    return state + 1;
  }

  public static int stepStateOnly(int state) {
    return state + 2;
  }

  public static boolean pred(int state, int limit) {
    return state < limit;
  }

  public static boolean predStateOnly(int state) {
    return state < 5;
  }

  public static boolean neverNoArgs() {
    return false;
  }

  public static boolean never(int state, int limit) {
    return false;
  }

  public static String fini(int state, int limit) {
    return "done:" + state + ":" + limit;
  }

  public static String finiStateOnly(int state) {
    return "state:" + state;
  }

  public static String finiNoArgs() {
    return "none";
  }

  public static String textInit(String prefix, int limit) {
    return prefix;
  }

  public static String textStep(String state, String prefix, int limit) {
    return state == null ? prefix : state + ".";
  }

  public static boolean textPred(String state, String prefix, int limit) {
    return state.length() < prefix.length() + limit;
  }

  public static boolean textNever(String state, String prefix, int limit) {
    return false;
  }

  public static String textFini(String state, String prefix, int limit) {
    return state + ":" + limit;
  }

  public static String badPred(int state, int limit) {
    return "bad";
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle init = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "init",
        MethodType.methodType(int.class, int.class));
    MethodHandle step = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "step",
        MethodType.methodType(int.class, int.class, int.class));
    MethodHandle stepStateOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "stepStateOnly",
        MethodType.methodType(int.class, int.class));
    MethodHandle pred = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "pred",
        MethodType.methodType(boolean.class, int.class, int.class));
    MethodHandle predStateOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "predStateOnly",
        MethodType.methodType(boolean.class, int.class));
    MethodHandle neverNoArgs = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "neverNoArgs",
        MethodType.methodType(boolean.class));
    MethodHandle never = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "never",
        MethodType.methodType(boolean.class, int.class, int.class));
    MethodHandle fini = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "fini",
        MethodType.methodType(String.class, int.class, int.class));
    MethodHandle finiStateOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "finiStateOnly",
        MethodType.methodType(String.class, int.class));
    MethodHandle finiNoArgs = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "finiNoArgs",
        MethodType.methodType(String.class));

    MethodHandle counted = MethodHandles.loop(new MethodHandle[] { init, step, pred, fini });
    System.out.println(counted.type().toMethodDescriptorString());
    System.out.println((String) counted.invokeExact(3));
    System.out.println((String) counted.invokeExact(0));

    MethodHandle defaultCounted = MethodHandles.loop(new MethodHandle[] { null, step, pred, fini });
    System.out.println(defaultCounted.type().toMethodDescriptorString());
    System.out.println((String) defaultCounted.invokeExact(3));
    System.out.println((String) defaultCounted.invokeExact(0));

    MethodHandle noStep = MethodHandles.loop(new MethodHandle[] { init, null, never, fini });
    System.out.println(noStep.type().toMethodDescriptorString());
    System.out.println((String) noStep.invokeExact(7));

    MethodHandle prefixPredicate = MethodHandles.loop(new MethodHandle[] { init, stepStateOnly, predStateOnly, fini });
    System.out.println(prefixPredicate.type().toMethodDescriptorString());
    System.out.println((String) prefixPredicate.invokeExact(5));

    MethodHandle prefixFini = MethodHandles.loop(new MethodHandle[] { init, stepStateOnly, predStateOnly, finiStateOnly });
    System.out.println(prefixFini.type().toMethodDescriptorString());
    System.out.println((String) prefixFini.invokeExact(5));

    MethodHandle noArgPrefix = MethodHandles.loop(new MethodHandle[] { init, stepStateOnly, neverNoArgs, finiNoArgs });
    System.out.println(noArgPrefix.type().toMethodDescriptorString());
    System.out.println((String) noArgPrefix.invokeExact(5));

    MethodHandle externalState = MethodHandles.loop(new MethodHandle[] { null, null, never, fini });
    System.out.println(externalState.type().toMethodDescriptorString());
    System.out.println((String) externalState.invokeExact(5, 9));

    MethodHandle textInit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "textInit",
        MethodType.methodType(String.class, String.class, int.class));
    MethodHandle textStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "textStep",
        MethodType.methodType(String.class, String.class, String.class, int.class));
    MethodHandle textPred = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "textPred",
        MethodType.methodType(boolean.class, String.class, String.class, int.class));
    MethodHandle textNever = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "textNever",
        MethodType.methodType(boolean.class, String.class, String.class, int.class));
    MethodHandle textFini = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "textFini",
        MethodType.methodType(String.class, String.class, String.class, int.class));
    MethodHandle textLoop = MethodHandles.loop(new MethodHandle[] { textInit, textStep, textPred, textFini });
    System.out.println(textLoop.type().toMethodDescriptorString());
    System.out.println((String) textLoop.invokeExact("x", 3));
    System.out.println((String) textLoop.invokeExact("x", 0));

    MethodHandle defaultTextLoop = MethodHandles.loop(new MethodHandle[] { null, textStep, textPred, textFini });
    System.out.println(defaultTextLoop.type().toMethodDescriptorString());
    System.out.println((String) defaultTextLoop.invokeExact("x", 3));
    System.out.println((String) defaultTextLoop.invokeExact("x", 0));

    MethodHandle noStepText = MethodHandles.loop(new MethodHandle[] { textInit, null, textNever, textFini });
    System.out.println(noStepText.type().toMethodDescriptorString());
    System.out.println((String) noStepText.invokeExact("x", 7));

    MethodHandle externalTextState = MethodHandles.loop(new MethodHandle[] { null, null, textNever, textFini });
    System.out.println(externalTextState.type().toMethodDescriptorString());
    System.out.println((String) externalTextState.invokeExact("x", "ignored", 7));

    MethodHandle voidLoop = MethodHandles.loop(new MethodHandle[] { init, step, pred, null });
    System.out.println(voidLoop.type().toMethodDescriptorString());
    voidLoop.invokeExact(2);
    System.out.println("void-loop");

    MethodHandle voidNoStep = MethodHandles.loop(new MethodHandle[] { init, null, never });
    System.out.println(voidNoStep.type().toMethodDescriptorString());
    voidNoStep.invokeExact(7);
    System.out.println("void-no-step-loop");

    MethodHandle voidExternalState = MethodHandles.loop(new MethodHandle[] { null, null, never });
    System.out.println(voidExternalState.type().toMethodDescriptorString());
    voidExternalState.invokeExact(5, 9);
    System.out.println("void-external-state-loop");

    MethodHandle shortVoidLoop = MethodHandles.loop(new MethodHandle[] { init, step, pred });
    System.out.println(shortVoidLoop.type().toMethodDescriptorString());
    shortVoidLoop.invokeExact(1);
    System.out.println("short-void-loop");

    printFailure("null-clauses", () -> MethodHandles.loop((MethodHandle[][]) null));
    printFailure("no-clauses", () -> MethodHandles.loop());
    MethodHandle badPred = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "badPred",
        MethodType.methodType(String.class, int.class, int.class));
    printFailure("bad-pred", () -> MethodHandles.loop(new MethodHandle[] { init, step, badPred, fini }));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      Object value = action.run();
      System.out.println(label + ":" + value.getClass().getName());
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    Object run() throws Throwable;
  }
}
