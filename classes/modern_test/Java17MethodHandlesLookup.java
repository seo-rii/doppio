package classes.modern_test;

import classes.modern_test.invoke_access.Java17InvokeAccessTarget;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandlesLookup {
  public static String publicStaticField = "static:initial";
  static String packageStaticField = "package-static";
  private static String privateStaticField = "private-static";
  public static int publicStaticIntField = 10;
  public static long publicStaticLongField = 20L;
  public static final String publicStaticFinalField = "static-final";

  public final String label;
  public String publicInstanceField = "instance:initial";
  String packageInstanceField = "package-instance";
  private String privateInstanceField = "private-instance";
  public int publicInstanceIntField = 30;
  public long publicInstanceLongField = 40L;
  public final String publicInstanceFinalField = "instance-final";

  public Java17MethodHandlesLookup(String label) {
    this.label = label;
  }

  Java17MethodHandlesLookup(String label, String suffix) {
    this.label = label + ":" + suffix;
  }

  private Java17MethodHandlesLookup(int value) {
    this.label = "private:" + value;
  }

  public static String join(String text, int value) {
    return text + ":" + value;
  }

  public static String longJoin(long value) {
    return "long:" + value;
  }

  public static int intValue() {
    return 23;
  }

  public static void appendVoid(StringBuilder builder) {
    builder.append("void");
  }

  public static int doubleValue(int value) {
    return value * 2;
  }

  public static String bracket(String value) {
    return "[" + value + "]";
  }

  public static String triple(String first, String second, String third) {
    return first + "/" + second + "/" + third;
  }

  public static boolean isEmpty(String value) {
    return value.isEmpty();
  }

  public static String throwOnNegative(int value) {
    if (value < 0) {
      throw new IllegalArgumentException("neg:" + value);
    }
    return "pos:" + value;
  }

  public static String handleNegative(IllegalArgumentException e, int value) {
    return e.getMessage() + "/" + value;
  }

  static String packageJoin(String text) {
    return "package:" + text;
  }

  private static String privateJoin(String text) {
    return "private:" + text;
  }

  public String instanceJoin(String suffix) {
    return label + ":" + suffix;
  }

  String packageInstanceJoin(String suffix) {
    return label + ":package:" + suffix;
  }

  private String privateInstanceJoin(String suffix) {
    return label + ":private:" + suffix;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle staticHandle = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "join",
        MethodType.methodType(String.class, String.class, int.class));
    System.out.println((String) staticHandle.invokeExact("s", 7));
    System.out.println((String) staticHandle.invoke("i", Integer.valueOf(8)));

    MethodHandle virtualHandle = lookup.findVirtual(
        Java17MethodHandlesLookup.class,
        "instanceJoin",
        MethodType.methodType(String.class, String.class));
    Java17MethodHandlesLookup receiver = new Java17MethodHandlesLookup("r");
    System.out.println((String) virtualHandle.invokeExact(receiver, "v"));
    System.out.println((String) virtualHandle.invoke(receiver, "w"));
    System.out.println(virtualHandle.type());
    System.out.println(staticHandle.type());

    MethodHandle adaptedStatic = staticHandle.asType(
        MethodType.methodType(Object.class, Object.class, Integer.class));
    Object adaptedStaticResult = adaptedStatic.invokeExact((Object) "a", Integer.valueOf(9));
    System.out.println((String) adaptedStaticResult);
    System.out.println(adaptedStatic.type());

    MethodHandle adaptedVirtual = virtualHandle.asType(
        MethodType.methodType(Object.class, Java17MethodHandlesLookup.class, Object.class));
    Object adaptedVirtualResult = adaptedVirtual.invokeExact(receiver, (Object) "as");
    System.out.println((String) adaptedVirtualResult);
    System.out.println(adaptedVirtual.type());

    MethodHandle longHandle = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "longJoin",
        MethodType.methodType(String.class, long.class));
    MethodHandle widenedArgument = longHandle.asType(
        MethodType.methodType(Object.class, int.class));
    Object widenedArgumentResult = widenedArgument.invokeExact(12);
    System.out.println((String) widenedArgumentResult);
    System.out.println(widenedArgument.type());

    MethodHandle intReturnHandle = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "intValue",
        MethodType.methodType(int.class));
    MethodHandle widenedReturn = intReturnHandle.asType(MethodType.methodType(long.class));
    System.out.println((long) widenedReturn.invokeExact());
    MethodHandle boxedReturn = intReturnHandle.asType(MethodType.methodType(Object.class));
    System.out.println(boxedReturn.invokeExact().getClass().getName());

    MethodHandle droppedReturn = staticHandle.asType(
        MethodType.methodType(void.class, String.class, int.class));
    droppedReturn.invokeExact("drop", 10);
    System.out.println("void-return-drop");

    MethodHandle voidHandle = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "appendVoid",
        MethodType.methodType(void.class, StringBuilder.class));
    MethodHandle voidToObject = voidHandle.asType(MethodType.methodType(Object.class, StringBuilder.class));
    StringBuilder voidBuilder = new StringBuilder();
    Object voidResult = voidToObject.invokeExact(voidBuilder);
    System.out.println(voidBuilder.toString());
    System.out.println(voidResult == null);
    System.out.println(voidToObject.type());

    MethodHandle identity = MethodHandles.identity(String.class);
    MethodHandle constant = MethodHandles.constant(String.class, "const");
    MethodHandle boundStatic = staticHandle.bindTo("bound");
    MethodHandle boundVirtual = virtualHandle.bindTo(receiver);
    MethodHandle inserted = MethodHandles.insertArguments(staticHandle, 1, 5);
    MethodHandle droppedIdentity = MethodHandles.dropArguments(identity, 0, int.class, long.class);
    MethodHandle doubleValue = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "doubleValue",
        MethodType.methodType(int.class, int.class));
    MethodHandle filteredArgument = MethodHandles.filterArguments(staticHandle, 1, doubleValue);
    MethodHandle bracket = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "bracket",
        MethodType.methodType(String.class, String.class));
    MethodHandle filteredReturn = MethodHandles.filterReturnValue(staticHandle, bracket);
    MethodHandle triple = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "triple",
        MethodType.methodType(String.class, String.class, String.class, String.class));
    MethodHandle permuted = MethodHandles.permuteArguments(
        triple,
        MethodType.methodType(String.class, String.class, String.class, String.class),
        2, 0, 1);
    MethodHandle isEmpty = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "isEmpty",
        MethodType.methodType(boolean.class, String.class));
    MethodHandle emptyConstant = MethodHandles.dropArguments(
        MethodHandles.constant(String.class, "empty"),
        0,
        String.class);
    MethodHandle guarded = MethodHandles.guardWithTest(isEmpty, emptyConstant, identity);
    MethodHandle throwOnNegative = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "throwOnNegative",
        MethodType.methodType(String.class, int.class));
    MethodHandle handleNegative = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "handleNegative",
        MethodType.methodType(String.class, IllegalArgumentException.class, int.class));
    MethodHandle caught = MethodHandles.catchException(
        throwOnNegative,
        IllegalArgumentException.class,
        handleNegative);
    System.out.println(
        (String) identity.invokeExact("id") + "|" +
        (String) constant.invokeExact() + "|" +
        (String) boundStatic.invokeExact(6) + "|" +
        (String) boundVirtual.invokeExact("bv") + "|" +
        (String) inserted.invokeExact("ins") + "|" +
        (String) droppedIdentity.invokeExact(2, 3L, "drop") + "|" +
        (String) filteredArgument.invokeExact("flt", 4) + "|" +
        (String) filteredReturn.invokeExact("ret", 3) + "|" +
        (String) permuted.invokeExact("a", "b", "c") + "|" +
        (String) guarded.invokeExact("") + "|" +
        (String) guarded.invokeExact("word") + "|" +
        (String) caught.invokeExact(7) + "|" +
        (String) caught.invokeExact(-2));
    System.out.println(
        boundStatic.type().toMethodDescriptorString() + "|" +
        droppedIdentity.type().toMethodDescriptorString() + "|" +
        filteredArgument.type().toMethodDescriptorString() + "|" +
        guarded.type().toMethodDescriptorString() + "|" +
        caught.type().toMethodDescriptorString());

    try {
      staticHandle.asType(MethodType.methodType(String.class, String.class));
      System.out.println(false);
    } catch (java.lang.invoke.WrongMethodTypeException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Object badCast = adaptedVirtual.invokeExact(receiver, (Object) Integer.valueOf(1));
      System.out.println(badCast);
    } catch (ClassCastException e) {
      System.out.println(e.getClass().getName());
    }

    MethodHandle staticGetter = lookup.findStaticGetter(
        Java17MethodHandlesLookup.class,
        "publicStaticField",
        String.class);
    MethodHandle staticSetter = lookup.findStaticSetter(
        Java17MethodHandlesLookup.class,
        "publicStaticField",
        String.class);
    System.out.println((String) staticGetter.invokeExact());
    staticSetter.invokeExact("static:updated");
    System.out.println(publicStaticField);

    MethodHandle instanceGetter = lookup.findGetter(
        Java17MethodHandlesLookup.class,
        "publicInstanceField",
        String.class);
    MethodHandle instanceSetter = lookup.findSetter(
        Java17MethodHandlesLookup.class,
        "publicInstanceField",
        String.class);
    System.out.println((String) instanceGetter.invokeExact(receiver));
    instanceSetter.invokeExact(receiver, "instance:updated");
    System.out.println(receiver.publicInstanceField);

    MethodHandle staticIntGetter = lookup.findStaticGetter(
        Java17MethodHandlesLookup.class,
        "publicStaticIntField",
        int.class);
    MethodHandle staticIntSetter = lookup.findStaticSetter(
        Java17MethodHandlesLookup.class,
        "publicStaticIntField",
        int.class);
    System.out.println((int) staticIntGetter.invokeExact());
    staticIntSetter.invokeExact(11);
    System.out.println(publicStaticIntField);

    MethodHandle staticLongGetter = lookup.findStaticGetter(
        Java17MethodHandlesLookup.class,
        "publicStaticLongField",
        long.class);
    MethodHandle staticLongSetter = lookup.findStaticSetter(
        Java17MethodHandlesLookup.class,
        "publicStaticLongField",
        long.class);
    System.out.println((long) staticLongGetter.invokeExact());
    staticLongSetter.invokeExact(21L);
    System.out.println(publicStaticLongField);

    MethodHandle instanceIntGetter = lookup.findGetter(
        Java17MethodHandlesLookup.class,
        "publicInstanceIntField",
        int.class);
    MethodHandle instanceIntSetter = lookup.findSetter(
        Java17MethodHandlesLookup.class,
        "publicInstanceIntField",
        int.class);
    System.out.println((int) instanceIntGetter.invokeExact(receiver));
    instanceIntSetter.invokeExact(receiver, 31);
    System.out.println(receiver.publicInstanceIntField);

    MethodHandle instanceLongGetter = lookup.findGetter(
        Java17MethodHandlesLookup.class,
        "publicInstanceLongField",
        long.class);
    MethodHandle instanceLongSetter = lookup.findSetter(
        Java17MethodHandlesLookup.class,
        "publicInstanceLongField",
        long.class);
    System.out.println((long) instanceLongGetter.invokeExact(receiver));
    instanceLongSetter.invokeExact(receiver, 41L);
    System.out.println(receiver.publicInstanceLongField);

    try {
      lookup.findStaticSetter(
          Java17MethodHandlesLookup.class,
          "publicStaticFinalField",
          String.class);
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lookup.findSetter(
          Java17MethodHandlesLookup.class,
          "publicInstanceFinalField",
          String.class);
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }

    MethodHandle publicConstructor = lookup.findConstructor(
        Java17MethodHandlesLookup.class,
        MethodType.methodType(void.class, String.class));
    Java17MethodHandlesLookup publicConstructed =
        (Java17MethodHandlesLookup) publicConstructor.invokeExact("ctor-public");
    System.out.println(publicConstructed.label);
    System.out.println(publicConstructor.type());

    try {
      lookup.findStatic(
          Java17MethodHandlesLookup.class,
          "missing",
          MethodType.methodType(void.class));
      System.out.println(false);
    } catch (NoSuchMethodException e) {
      System.out.println(e.getClass().getName());
    }

    Java17MethodHandlesLookupPeer.run();
    Java17MethodHandlesLookupSubclass.run();
    Nestmate.run();
  }

  private static class Nestmate {
    static void run() throws Throwable {
      MethodHandles.Lookup lookup = MethodHandles.lookup();
      MethodHandle privateStatic = lookup.findStatic(
          Java17MethodHandlesLookup.class,
          "privateJoin",
          MethodType.methodType(String.class, String.class));
      System.out.println((String) privateStatic.invokeExact("nest"));
      MethodHandle privateVirtual = lookup.findVirtual(
          Java17MethodHandlesLookup.class,
          "privateInstanceJoin",
          MethodType.methodType(String.class, String.class));
      System.out.println((String) privateVirtual.invokeExact(new Java17MethodHandlesLookup("n"), "v"));
      MethodHandle privateStaticGetter = lookup.findStaticGetter(
          Java17MethodHandlesLookup.class,
          "privateStaticField",
          String.class);
      MethodHandle privateStaticSetter = lookup.findStaticSetter(
          Java17MethodHandlesLookup.class,
          "privateStaticField",
          String.class);
      System.out.println((String) privateStaticGetter.invokeExact());
      privateStaticSetter.invokeExact("private-static:nest");
      System.out.println(privateStaticField);

      Java17MethodHandlesLookup receiver = new Java17MethodHandlesLookup("field");
      MethodHandle privateGetter = lookup.findGetter(
          Java17MethodHandlesLookup.class,
          "privateInstanceField",
          String.class);
      MethodHandle privateSetter = lookup.findSetter(
          Java17MethodHandlesLookup.class,
          "privateInstanceField",
          String.class);
      System.out.println((String) privateGetter.invokeExact(receiver));
      privateSetter.invokeExact(receiver, "private-instance:nest");
      System.out.println(receiver.privateInstanceField);

      MethodHandle privateConstructor = lookup.findConstructor(
          Java17MethodHandlesLookup.class,
          MethodType.methodType(void.class, int.class));
      Java17MethodHandlesLookup privateConstructed =
          (Java17MethodHandlesLookup) privateConstructor.invokeExact(17);
      System.out.println(privateConstructed.label);
    }
  }
}

class Java17MethodHandlesLookupPeer {
  static void run() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    try {
      lookup.findStatic(
          Java17MethodHandlesLookup.class,
          "privateJoin",
          MethodType.methodType(String.class, String.class));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lookup.findVirtual(
          Java17MethodHandlesLookup.class,
          "privateInstanceJoin",
          MethodType.methodType(String.class, String.class));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }

    MethodHandle packageStatic = lookup.findStatic(
        Java17MethodHandlesLookup.class,
        "packageJoin",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) packageStatic.invokeExact("peer"));
    MethodHandle packageVirtual = lookup.findVirtual(
        Java17MethodHandlesLookup.class,
        "packageInstanceJoin",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) packageVirtual.invokeExact(new Java17MethodHandlesLookup("p"), "v"));

    try {
      lookup.findStaticGetter(
          Java17MethodHandlesLookup.class,
          "privateStaticField",
          String.class);
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lookup.findGetter(
          Java17MethodHandlesLookup.class,
          "privateInstanceField",
          String.class);
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }

    MethodHandle packageStaticGetter = lookup.findStaticGetter(
        Java17MethodHandlesLookup.class,
        "packageStaticField",
        String.class);
    MethodHandle packageStaticSetter = lookup.findStaticSetter(
        Java17MethodHandlesLookup.class,
        "packageStaticField",
        String.class);
    System.out.println((String) packageStaticGetter.invokeExact());
    packageStaticSetter.invokeExact("package-static:peer");
    System.out.println(Java17MethodHandlesLookup.packageStaticField);

    Java17MethodHandlesLookup receiver = new Java17MethodHandlesLookup("field");
    MethodHandle packageGetter = lookup.findGetter(
        Java17MethodHandlesLookup.class,
        "packageInstanceField",
        String.class);
    MethodHandle packageSetter = lookup.findSetter(
        Java17MethodHandlesLookup.class,
        "packageInstanceField",
        String.class);
    System.out.println((String) packageGetter.invokeExact(receiver));
    packageSetter.invokeExact(receiver, "package-instance:peer");
    System.out.println(receiver.packageInstanceField);

    try {
      lookup.findConstructor(
          Java17MethodHandlesLookup.class,
          MethodType.methodType(void.class, int.class));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }

    MethodHandle packageConstructor = lookup.findConstructor(
        Java17MethodHandlesLookup.class,
        MethodType.methodType(void.class, String.class, String.class));
    Java17MethodHandlesLookup packageConstructed =
        (Java17MethodHandlesLookup) packageConstructor.invokeExact("ctor", "peer");
    System.out.println(packageConstructed.label);
  }
}

class Java17MethodHandlesLookupSubclass extends Java17InvokeAccessTarget {
  static void run() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();

    MethodHandle publicStatic = lookup.findStatic(
        Java17InvokeAccessTarget.class,
        "publicStatic",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) publicStatic.invokeExact("cross"));
    MethodHandle publicVirtual = lookup.findVirtual(
        Java17InvokeAccessTarget.class,
        "publicVirtual",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) publicVirtual.invokeExact(
        new Java17InvokeAccessTarget(),
        "cross"));

    MethodHandle protectedStatic = lookup.findStatic(
        Java17InvokeAccessTarget.class,
        "protectedStatic",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) protectedStatic.invokeExact("sub"));
    MethodHandle protectedVirtual = lookup.findVirtual(
        Java17InvokeAccessTarget.class,
        "protectedVirtual",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) protectedVirtual.invokeExact(
        new Java17MethodHandlesLookupSubclass(),
        "sub"));
    System.out.println(protectedVirtual.type());

    try {
      lookup.findStatic(
          Java17InvokeAccessTarget.class,
          "packageStatic",
          MethodType.methodType(String.class, String.class));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      lookup.findVirtual(
          Java17InvokeAccessTarget.class,
          "packageVirtual",
          MethodType.methodType(String.class, String.class));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
