package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandleLoop {
  private static int noStateCounter = 0;
  private static int mixedVoidInitCount = 0;
  private static int mixedVoidStepCount = 0;

  public static int init(int limit) {
    return 0;
  }

  public static int initNoArgs() {
    return 0;
  }

  public static int step(int state, int limit) {
    return state + 1;
  }

  public static int stepStateOnly(int state) {
    return state + 2;
  }

  public static int stepNoArgs() {
    return 7;
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

  public static int finiIntNoArgs() {
    return 17;
  }

  public static void finiVoidNoArgs() {
  }

  public static void resetNoState() {
    noStateCounter = 0;
  }

  public static void resetNoStateWithLimit(int limit) {
    noStateCounter = 0;
  }

  public static void stepNoState() {
    noStateCounter++;
  }

  public static void stepNoStateWithLimit(int limit) {
    noStateCounter++;
  }

  public static boolean predNoState() {
    return noStateCounter < 3;
  }

  public static boolean predNoStateWithLimit(int limit) {
    return noStateCounter < limit;
  }

  public static String finiNoState() {
    return "nostate:" + noStateCounter;
  }

  public static String finiNoStateWithLimit(int limit) {
    return "nostate:" + noStateCounter + ":" + limit;
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

  public static String multiTextInit(int limit) {
    return "";
  }

  public static int multiCountStep(int count, String text, int limit) {
    return count + 1;
  }

  public static String multiTextStep(int count, String text, int limit) {
    return text + count;
  }

  public static boolean multiAlways(int count, String text, int limit) {
    return true;
  }

  public static boolean multiBelow(int count, String text, int limit) {
    return count < limit;
  }

  public static boolean multiNever(int count, String text, int limit) {
    return false;
  }

  public static String multiFini(int count, String text, int limit) {
    return "multi:" + count + ":" + text + ":" + limit;
  }

  public static int multiIntFini(int count, String text, int limit) {
    return count;
  }

  public static int multiCountStepStateOnly(int count) {
    return count + 1;
  }

  public static String multiTextStepStatesOnly(int count, String text) {
    return text + count;
  }

  public static boolean multiAlwaysNoArgs() {
    return true;
  }

  public static boolean multiBelowCountOnly(int count) {
    return count < 3;
  }

  public static String multiFiniStatesOnly(int count, String text) {
    return "multi-prefix:" + count + ":" + text;
  }

  public static int splitIntInit(String marker) {
    return 0;
  }

  public static String splitTextInit(String marker) {
    return "";
  }

  public static String splitTextStep(int count, String text, String marker) {
    return "split:" + count + ":" + marker;
  }

  public static boolean splitNever(int count, String text, String marker) {
    return false;
  }

  public static String splitFini(int count, String text, String marker) {
    return text;
  }

  public static String inferredTextInit() {
    return "";
  }

  public static String inferredTextStep(
      int count, String text, long marker, double fraction) {
    return "inferred:" + count + ":" + marker + ":" + fraction;
  }

  public static boolean inferredNever(int count, String text, long marker) {
    return false;
  }

  public static String inferredFini(
      int count, String text, long marker, double fraction) {
    return text;
  }

  public static void mixedVoidInit(String prefix) {
    mixedVoidInitCount++;
    mixedVoidStepCount = 0;
  }

  public static void mixedVoidStep(int state, String prefix, int limit) {
    mixedVoidStepCount++;
  }

  public static int mixedStateInit(String prefix) {
    return 1;
  }

  public static int mixedStateStep(int state, String prefix, int limit) {
    return state + 1;
  }

  public static boolean mixedNever(int state, String prefix, int limit) {
    return false;
  }

  public static String mixedFini(int state, String prefix, int limit) {
    return "mixed:" + state + ":" + prefix + ":" + limit + ":"
        + mixedVoidInitCount + ":" + mixedVoidStepCount;
  }

  public static String badPred(int state, int limit) {
    return "bad";
  }

  public static int badStateStep(long state) {
    return 0;
  }

  public static String badStatePred(long state) {
    return "bad";
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle init = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "init",
        MethodType.methodType(int.class, int.class));
    MethodHandle initNoArgs = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "initNoArgs",
        MethodType.methodType(int.class));
    MethodHandle step = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "step",
        MethodType.methodType(int.class, int.class, int.class));
    MethodHandle stepStateOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "stepStateOnly",
        MethodType.methodType(int.class, int.class));
    MethodHandle stepNoArgs = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "stepNoArgs",
        MethodType.methodType(int.class));
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
    MethodHandle finiIntNoArgs = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "finiIntNoArgs",
        MethodType.methodType(int.class));
    MethodHandle finiVoidNoArgs = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "finiVoidNoArgs",
        MethodType.methodType(void.class));
    MethodHandle resetNoState = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "resetNoState",
        MethodType.methodType(void.class));
    MethodHandle resetNoStateWithLimit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "resetNoStateWithLimit",
        MethodType.methodType(void.class, int.class));
    MethodHandle stepNoState = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "stepNoState",
        MethodType.methodType(void.class));
    MethodHandle stepNoStateWithLimit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "stepNoStateWithLimit",
        MethodType.methodType(void.class, int.class));
    MethodHandle predNoState = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "predNoState",
        MethodType.methodType(boolean.class));
    MethodHandle predNoStateWithLimit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "predNoStateWithLimit",
        MethodType.methodType(boolean.class, int.class));
    MethodHandle finiNoState = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "finiNoState",
        MethodType.methodType(String.class));
    MethodHandle finiNoStateWithLimit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "finiNoStateWithLimit",
        MethodType.methodType(String.class, int.class));
    MethodHandle multiTextInit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiTextInit",
        MethodType.methodType(String.class, int.class));
    MethodHandle multiCountStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiCountStep",
        MethodType.methodType(int.class, int.class, String.class, int.class));
    MethodHandle multiTextStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiTextStep",
        MethodType.methodType(String.class, int.class, String.class, int.class));
    MethodHandle multiAlways = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiAlways",
        MethodType.methodType(boolean.class, int.class, String.class, int.class));
    MethodHandle multiBelow = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiBelow",
        MethodType.methodType(boolean.class, int.class, String.class, int.class));
    MethodHandle multiNever = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiNever",
        MethodType.methodType(boolean.class, int.class, String.class, int.class));
    MethodHandle multiFini = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiFini",
        MethodType.methodType(String.class, int.class, String.class, int.class));
    MethodHandle multiIntFini = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiIntFini",
        MethodType.methodType(int.class, int.class, String.class, int.class));
    MethodHandle multiCountStepStateOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiCountStepStateOnly",
        MethodType.methodType(int.class, int.class));
    MethodHandle multiTextStepStatesOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiTextStepStatesOnly",
        MethodType.methodType(String.class, int.class, String.class));
    MethodHandle multiAlwaysNoArgs = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiAlwaysNoArgs",
        MethodType.methodType(boolean.class));
    MethodHandle multiBelowCountOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiBelowCountOnly",
        MethodType.methodType(boolean.class, int.class));
    MethodHandle multiFiniStatesOnly = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "multiFiniStatesOnly",
        MethodType.methodType(String.class, int.class, String.class));
    MethodHandle splitIntInit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "splitIntInit",
        MethodType.methodType(int.class, String.class));
    MethodHandle splitTextInit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "splitTextInit",
        MethodType.methodType(String.class, String.class));
    MethodHandle splitTextStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "splitTextStep",
        MethodType.methodType(String.class, int.class, String.class, String.class));
    MethodHandle splitNever = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "splitNever",
        MethodType.methodType(boolean.class, int.class, String.class, String.class));
    MethodHandle splitFini = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "splitFini",
        MethodType.methodType(String.class, int.class, String.class, String.class));
    MethodHandle inferredTextInit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "inferredTextInit",
        MethodType.methodType(String.class));
    MethodHandle inferredTextStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "inferredTextStep",
        MethodType.methodType(
            String.class, int.class, String.class, long.class, double.class));
    MethodHandle inferredNever = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "inferredNever",
        MethodType.methodType(boolean.class, int.class, String.class, long.class));
    MethodHandle inferredFini = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "inferredFini",
        MethodType.methodType(
            String.class, int.class, String.class, long.class, double.class));
    MethodHandle mixedVoidInit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "mixedVoidInit",
        MethodType.methodType(void.class, String.class));
    MethodHandle mixedVoidStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "mixedVoidStep",
        MethodType.methodType(void.class, int.class, String.class, int.class));
    MethodHandle mixedStateInit = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "mixedStateInit",
        MethodType.methodType(int.class, String.class));
    MethodHandle mixedStateStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "mixedStateStep",
        MethodType.methodType(int.class, int.class, String.class, int.class));
    MethodHandle mixedNever = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "mixedNever",
        MethodType.methodType(boolean.class, int.class, String.class, int.class));
    MethodHandle mixedFini = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "mixedFini",
        MethodType.methodType(String.class, int.class, String.class, int.class));

    MethodHandle counted = MethodHandles.loop(new MethodHandle[] { init, step, pred, fini });
    System.out.println(counted.type().toMethodDescriptorString());
    System.out.println((String) counted.invokeExact(3));
    System.out.println((String) counted.invokeExact(0));

    MethodHandle defaultCounted = MethodHandles.loop(new MethodHandle[] { null, step, pred, fini });
    System.out.println(defaultCounted.type().toMethodDescriptorString());
    System.out.println((String) defaultCounted.invokeExact(3));
    System.out.println((String) defaultCounted.invokeExact(0));

    MethodHandle defaultConstantStep = MethodHandles.loop(
        new MethodHandle[] { null, stepNoArgs, predStateOnly, finiStateOnly });
    System.out.println(defaultConstantStep.type().toMethodDescriptorString());
    System.out.println((String) defaultConstantStep.invokeExact());

    MethodHandle defaultConstantStepWithExternal = MethodHandles.loop(
        new MethodHandle[] { null, stepNoArgs, never, fini });
    System.out.println(defaultConstantStepWithExternal.type().toMethodDescriptorString());
    System.out.println((String) defaultConstantStepWithExternal.invokeExact(9));

    MethodHandle noStep = MethodHandles.loop(new MethodHandle[] { init, null, never, fini });
    System.out.println(noStep.type().toMethodDescriptorString());
    System.out.println((String) noStep.invokeExact(7));

    MethodHandle inferredExternal = MethodHandles.loop(new MethodHandle[] { initNoArgs, step, pred, fini });
    System.out.println(inferredExternal.type().toMethodDescriptorString());
    System.out.println((String) inferredExternal.invokeExact(4));

    MethodHandle prefixPredicate = MethodHandles.loop(new MethodHandle[] { init, stepStateOnly, predStateOnly, fini });
    System.out.println(prefixPredicate.type().toMethodDescriptorString());
    System.out.println((String) prefixPredicate.invokeExact(5));

    MethodHandle prefixFini = MethodHandles.loop(new MethodHandle[] { init, stepStateOnly, predStateOnly, finiStateOnly });
    System.out.println(prefixFini.type().toMethodDescriptorString());
    System.out.println((String) prefixFini.invokeExact(5));

    MethodHandle noArgPrefix = MethodHandles.loop(new MethodHandle[] { init, stepStateOnly, neverNoArgs, finiNoArgs });
    System.out.println(noArgPrefix.type().toMethodDescriptorString());
    System.out.println((String) noArgPrefix.invokeExact(5));

    MethodHandle noStateNullHandles = MethodHandles.loop(new MethodHandle[] { null, null, neverNoArgs, finiNoArgs });
    System.out.println(noStateNullHandles.type().toMethodDescriptorString());
    System.out.println((String) noStateNullHandles.invokeExact());

    MethodHandle noStateNullHandlesInt = MethodHandles.loop(new MethodHandle[] { null, null, neverNoArgs, finiIntNoArgs });
    System.out.println(noStateNullHandlesInt.type().toMethodDescriptorString());
    System.out.println((int) noStateNullHandlesInt.invokeExact());

    MethodHandle noStateNullHandlesVoidFini = MethodHandles.loop(
        new MethodHandle[] { null, null, neverNoArgs, finiVoidNoArgs });
    System.out.println(noStateNullHandlesVoidFini.type().toMethodDescriptorString());
    noStateNullHandlesVoidFini.invokeExact();
    System.out.println("no-state-null-handles-void-fini");

    MethodHandle noStateNullHandlesVoid = MethodHandles.loop(new MethodHandle[] { null, null, neverNoArgs });
    System.out.println(noStateNullHandlesVoid.type().toMethodDescriptorString());
    noStateNullHandlesVoid.invokeExact();
    System.out.println("no-state-null-handles-void");

    MethodHandle noStateNullHandlesPredPrefix = MethodHandles.loop(
        new MethodHandle[] { null, null, never, finiNoArgs });
    System.out.println(noStateNullHandlesPredPrefix.type().toMethodDescriptorString());
    System.out.println((String) noStateNullHandlesPredPrefix.invokeExact(5, 9));

    MethodHandle noStateNullHandlesFiniPrefix = MethodHandles.loop(
        new MethodHandle[] { null, null, neverNoArgs, fini });
    System.out.println(noStateNullHandlesFiniPrefix.type().toMethodDescriptorString());
    System.out.println((String) noStateNullHandlesFiniPrefix.invokeExact(5, 9));

    MethodHandle noState = MethodHandles.loop(
        new MethodHandle[] { resetNoState, stepNoState, predNoState, finiNoState });
    System.out.println(noState.type().toMethodDescriptorString());
    System.out.println((String) noState.invokeExact());

    MethodHandle noStateWithLimit = MethodHandles.loop(
        new MethodHandle[] {
            resetNoStateWithLimit,
            stepNoStateWithLimit,
            predNoStateWithLimit,
            finiNoStateWithLimit
        });
    System.out.println(noStateWithLimit.type().toMethodDescriptorString());
    System.out.println((String) noStateWithLimit.invokeExact(4));

    MethodHandle multiClause = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, multiAlways, multiFini },
        new MethodHandle[] { multiTextInit, multiTextStep, multiBelow, multiFini });
    System.out.println(multiClause.type().toMethodDescriptorString());
    System.out.println((String) multiClause.invokeExact(3));

    MethodHandle multiPrefixClause = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStepStateOnly, multiAlwaysNoArgs, multiFiniStatesOnly },
        new MethodHandle[] { multiTextInit, multiTextStepStatesOnly, multiBelowCountOnly, multiFiniStatesOnly });
    System.out.println(multiPrefixClause.type().toMethodDescriptorString());
    System.out.println((String) multiPrefixClause.invokeExact(5));

    MethodHandle splitParameterDomains = MethodHandles.loop(
        new MethodHandle[] { splitIntInit, multiCountStepStateOnly },
        new MethodHandle[] { splitTextInit, splitTextStep, splitNever, splitFini });
    System.out.println(splitParameterDomains.type().toMethodDescriptorString());
    System.out.println((String) splitParameterDomains.invokeExact("ok"));

    MethodHandle inferredExternalOnly = MethodHandles.loop(
        new MethodHandle[] { initNoArgs, multiCountStepStateOnly },
        new MethodHandle[] {
            inferredTextInit, inferredTextStep, inferredNever, inferredFini
        });
    System.out.println(inferredExternalOnly.type().toMethodDescriptorString());
    System.out.println((String) inferredExternalOnly.invokeExact(7L, 2.5d));

    MethodHandle mixedVoidState = MethodHandles.loop(
        new MethodHandle[] { mixedVoidInit, mixedVoidStep, null },
        new MethodHandle[] { mixedStateInit, mixedStateStep, mixedNever, mixedFini });
    System.out.println(mixedVoidState.type().toMethodDescriptorString());
    System.out.println((String) mixedVoidState.invokeExact("p", 7));

    MethodHandle multiHelperClause = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, null },
        new MethodHandle[] { multiTextInit, multiTextStep, multiBelow, multiFini });
    System.out.println(multiHelperClause.type().toMethodDescriptorString());
    System.out.println((String) multiHelperClause.invokeExact(3));

    MethodHandle multiHelperClauseLength4 = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, null, null },
        new MethodHandle[] { multiTextInit, multiTextStep, multiBelow, multiFini });
    System.out.println(multiHelperClauseLength4.type().toMethodDescriptorString());
    System.out.println((String) multiHelperClauseLength4.invokeExact(3));

    MethodHandle multiHelperClauseLength2 = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep },
        new MethodHandle[] { multiTextInit, multiTextStep, multiBelow, multiFini });
    System.out.println(multiHelperClauseLength2.type().toMethodDescriptorString());
    System.out.println((String) multiHelperClauseLength2.invokeExact(3));

    MethodHandle multiEmptyHelperClause = MethodHandles.loop(
        new MethodHandle[] {},
        new MethodHandle[] { null, null, neverNoArgs, finiNoArgs });
    System.out.println(multiEmptyHelperClause.type().toMethodDescriptorString());
    System.out.println((String) multiEmptyHelperClause.invokeExact());

    MethodHandle multiInitOnlyHelperClause = MethodHandles.loop(
        new MethodHandle[] { init },
        new MethodHandle[] { null, null, never, fini });
    System.out.println(multiInitOnlyHelperClause.type().toMethodDescriptorString());
    System.out.println((String) multiInitOnlyHelperClause.invokeExact(7));

    MethodHandle multiNullFiniExit = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, multiNever, null },
        new MethodHandle[] { multiTextInit, multiTextStep, multiAlways, multiFini });
    System.out.println(multiNullFiniExit.type().toMethodDescriptorString());
    System.out.println((String) multiNullFiniExit.invokeExact(3));

    MethodHandle multiPrimitiveNullFiniExit = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, multiNever, null },
        new MethodHandle[] { multiTextInit, multiTextStep, multiAlways, multiIntFini });
    System.out.println(multiPrimitiveNullFiniExit.type().toMethodDescriptorString());
    System.out.println((int) multiPrimitiveNullFiniExit.invokeExact(3));

    MethodHandle multiVoidNullFiniExit = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, multiNever, null },
        new MethodHandle[] { multiTextInit, multiTextStep, null, null });
    System.out.println(multiVoidNullFiniExit.type().toMethodDescriptorString());
    multiVoidNullFiniExit.invokeExact(3);
    System.out.println("multi-null-fini-void");

    MethodHandle multiNullInitInt = MethodHandles.loop(
        new MethodHandle[] { null, multiCountStep, multiAlways, multiFini },
        new MethodHandle[] { multiTextInit, multiTextStep, multiBelow, multiFini });
    System.out.println(multiNullInitInt.type().toMethodDescriptorString());
    System.out.println((String) multiNullInitInt.invokeExact(3));

    MethodHandle multiNullInitText = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, multiAlways, multiFini },
        new MethodHandle[] { null, multiTextStep, multiBelow, multiFini });
    System.out.println(multiNullInitText.type().toMethodDescriptorString());
    System.out.println((String) multiNullInitText.invokeExact(3));

    MethodHandle multiNullStepInt = MethodHandles.loop(
        new MethodHandle[] { init, null, multiNever, multiFini },
        new MethodHandle[] { multiTextInit, multiTextStep, multiAlways, multiFini });
    System.out.println(multiNullStepInt.type().toMethodDescriptorString());
    System.out.println((String) multiNullStepInt.invokeExact(3));

    MethodHandle multiNullStepText = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStep, multiAlways, multiFini },
        new MethodHandle[] { multiTextInit, null, multiBelow, multiFini });
    System.out.println(multiNullStepText.type().toMethodDescriptorString());
    System.out.println((String) multiNullStepText.invokeExact(3));

    MethodHandle multiVoidClause = MethodHandles.loop(
        new MethodHandle[] { init, multiCountStepStateOnly, multiAlwaysNoArgs, finiStateOnly },
        new MethodHandle[] { null, null, multiBelowCountOnly, finiStateOnly });
    System.out.println(multiVoidClause.type().toMethodDescriptorString());
    System.out.println((String) multiVoidClause.invokeExact(5));

    MethodHandle noStateExternalPrefix = MethodHandles.loop(new MethodHandle[] { null, null, never, fini });
    System.out.println(noStateExternalPrefix.type().toMethodDescriptorString());
    System.out.println((String) noStateExternalPrefix.invokeExact(5, 9));

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

    MethodHandle noStateTextExternalPrefix = MethodHandles.loop(new MethodHandle[] { null, null, textNever, textFini });
    System.out.println(noStateTextExternalPrefix.type().toMethodDescriptorString());
    System.out.println((String) noStateTextExternalPrefix.invokeExact("x", "ignored", 7));

    MethodHandle voidLoop = MethodHandles.loop(new MethodHandle[] { init, step, pred, null });
    System.out.println(voidLoop.type().toMethodDescriptorString());
    voidLoop.invokeExact(2);
    System.out.println("void-loop");

    MethodHandle voidNoStep = MethodHandles.loop(new MethodHandle[] { init, null, never });
    System.out.println(voidNoStep.type().toMethodDescriptorString());
    voidNoStep.invokeExact(7);
    System.out.println("void-no-step-loop");

    MethodHandle voidNoStateExternalPrefix = MethodHandles.loop(new MethodHandle[] { null, null, never });
    System.out.println(voidNoStateExternalPrefix.type().toMethodDescriptorString());
    voidNoStateExternalPrefix.invokeExact(5, 9);
    System.out.println("void-no-state-external-prefix-loop");

    MethodHandle shortVoidLoop = MethodHandles.loop(new MethodHandle[] { init, step, pred });
    System.out.println(shortVoidLoop.type().toMethodDescriptorString());
    shortVoidLoop.invokeExact(1);
    System.out.println("short-void-loop");

    printFailure("null-clauses", () -> MethodHandles.loop((MethodHandle[][]) null));
    printFailure("no-clauses", () -> MethodHandles.loop());
    printFailureContains(
        "null-clause",
        () -> MethodHandles.loop(new MethodHandle[][] { null }),
        "null clauses are not allowed");
    MethodHandle badPred = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "badPred",
        MethodType.methodType(String.class, int.class, int.class));
    MethodHandle badStateStep = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "badStateStep",
        MethodType.methodType(int.class, long.class));
    MethodHandle badStatePred = lookup.findStatic(
        Java17MethodHandleLoop.class,
        "badStatePred",
        MethodType.methodType(String.class, long.class));
    printFailureContains(
        "empty-clause-pred",
        () -> MethodHandles.loop(new MethodHandle[] {}),
        "no predicate found");
    printFailureContains(
        "one-handle-clause-pred",
        () -> MethodHandles.loop(new MethodHandle[] { init }),
        "no predicate found");
    printFailureContains(
        "two-handle-clause-pred",
        () -> MethodHandles.loop(new MethodHandle[] { init, step }),
        "no predicate found");
    printFailure(
        "long-clause",
        () -> MethodHandles.loop(new MethodHandle[] { init, step, pred, fini, fini }));
    printFailure("null-pred", () -> MethodHandles.loop(new MethodHandle[] { init, step, null, fini }));
    printFailure("bad-pred", () -> MethodHandles.loop(new MethodHandle[] { init, step, badPred, fini }));
    printFailure(
        "multi-no-pred",
        () -> MethodHandles.loop(
            new MethodHandle[] { init, multiCountStep, null, null },
            new MethodHandle[] { multiTextInit, multiTextStep, null, null }));
    printFailureContains(
        "multi-short-no-pred",
        () -> MethodHandles.loop(new MethodHandle[] {}, new MethodHandle[] { init }),
        "no predicate found");
    printFailureContains(
        "multi-no-pred-before-parameters",
        () -> MethodHandles.loop(
            new MethodHandle[] { init, badStateStep },
            new MethodHandle[] { multiTextInit, multiTextStep }),
        "no predicate found");
    printFailureContains(
        "multi-bad-pred-before-parameters",
        () -> MethodHandles.loop(
            new MethodHandle[] { init, badStateStep, badStatePred },
            new MethodHandle[] { multiTextInit, multiTextStep }),
        "predicates must have boolean return type");
    printFailureContains(
        "multi-bad-fini-before-parameters",
        () -> MethodHandles.loop(
            new MethodHandle[] { init, badStateStep, neverNoArgs, finiNoArgs },
            new MethodHandle[] { multiTextInit, multiTextStep, null, finiIntNoArgs }),
        "finalizer return types");
    printFailureContains(
        "multi-null-clause-before-length",
        () -> MethodHandles.loop(
            new MethodHandle[] { init, step, pred, fini, fini },
            (MethodHandle[]) null),
        "null clauses are not allowed");
    printFailure(
        "multi-long-clause",
        () -> MethodHandles.loop(
            new MethodHandle[] { init, step, pred, fini, fini },
            new MethodHandle[] { init, step, pred, fini }));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      Object value = action.run();
      System.out.println(label + ":" + value.getClass().getName());
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private static void printFailureContains(String label, Throwing action, String fragment) {
    try {
      Object value = action.run();
      System.out.println(label + ":success:" + value.getClass().getName());
    } catch (Throwable t) {
      String message = t.getMessage();
      boolean contains = message != null && message.indexOf(fragment) >= 0;
      System.out.println(label + ":" + t.getClass().getName() + ":" + contains);
    }
  }

  private interface Throwing {
    Object run() throws Throwable;
  }
}
