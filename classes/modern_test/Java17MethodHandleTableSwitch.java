package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandleTableSwitch {
  private static String switchLog = "";

  public static String fallback(int index, String prefix) {
    return prefix + ":fallback" + index;
  }

  public static String target0(int index, String prefix) {
    return prefix + ":zero" + index;
  }

  public static String target1(int index, String prefix) {
    return prefix + ":one" + index;
  }

  public static String target2(int index, String prefix) {
    return prefix + ":two" + index;
  }

  public static int intFallback(int index, int base) {
    return base - index;
  }

  public static int intTarget0(int index, int base) {
    return base + index + 10;
  }

  public static int intTarget1(int index, int base) {
    return base + index + 20;
  }

  public static void voidFallback(int index, String prefix) {
    switchLog += prefix + ":fallback" + index + "|";
  }

  public static void voidTarget0(int index, String prefix) {
    switchLog += prefix + ":zero" + index + "|";
  }

  public static void voidTarget1(int index, String prefix) {
    switchLog += prefix + ":one" + index + "|";
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle fallback = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "fallback",
        MethodType.methodType(String.class, int.class, String.class));
    MethodHandle target0 = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "target0",
        MethodType.methodType(String.class, int.class, String.class));
    MethodHandle target1 = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "target1",
        MethodType.methodType(String.class, int.class, String.class));
    MethodHandle target2 = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "target2",
        MethodType.methodType(String.class, int.class, String.class));

    MethodHandle textSwitch = MethodHandles.tableSwitch(fallback, target0, target1, target2);
    System.out.println(textSwitch.type().toMethodDescriptorString());
    System.out.println((String) textSwitch.invokeExact(0, "p"));
    System.out.println((String) textSwitch.invokeExact(1, "p"));
    System.out.println((String) textSwitch.invokeExact(2, "p"));
    System.out.println((String) textSwitch.invokeExact(-1, "p"));
    System.out.println((String) textSwitch.invokeExact(3, "p"));

    MethodHandle intFallback = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "intFallback",
        MethodType.methodType(int.class, int.class, int.class));
    MethodHandle intTarget0 = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "intTarget0",
        MethodType.methodType(int.class, int.class, int.class));
    MethodHandle intTarget1 = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "intTarget1",
        MethodType.methodType(int.class, int.class, int.class));
    MethodHandle intSwitch = MethodHandles.tableSwitch(intFallback, intTarget0, intTarget1);
    System.out.println(intSwitch.type().toMethodDescriptorString());
    System.out.println((int) intSwitch.invokeExact(0, 5));
    System.out.println((int) intSwitch.invokeExact(1, 5));
    System.out.println((int) intSwitch.invokeExact(7, 5));

    MethodHandle voidFallback = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "voidFallback",
        MethodType.methodType(void.class, int.class, String.class));
    MethodHandle voidTarget0 = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "voidTarget0",
        MethodType.methodType(void.class, int.class, String.class));
    MethodHandle voidTarget1 = lookup.findStatic(
        Java17MethodHandleTableSwitch.class,
        "voidTarget1",
        MethodType.methodType(void.class, int.class, String.class));
    MethodHandle voidSwitch = MethodHandles.tableSwitch(voidFallback, voidTarget0, voidTarget1);
    System.out.println(voidSwitch.type().toMethodDescriptorString());
    switchLog = "";
    voidSwitch.invokeExact(0, "v");
    voidSwitch.invokeExact(1, "v");
    voidSwitch.invokeExact(2, "v");
    voidSwitch.invokeExact(-1, "v");
    System.out.println(switchLog);

    try {
      MethodHandles.tableSwitch(null, target0);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":nullFallback");
    }
    try {
      MethodHandles.tableSwitch(fallback, target0, null);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":nullTarget");
    }
    try {
      MethodHandles.tableSwitch(fallback);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":noTargets");
    }
    try {
      MethodHandles.tableSwitch(target0, intFallback);
    } catch (Throwable t) {
      System.out.println(t.getClass().getSimpleName() + ":typeMismatch");
    }
  }
}
