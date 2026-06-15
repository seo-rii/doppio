package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class Java17MethodHandlesPrivateLookupIn {
  private static String privateStaticField = "static:initial";
  private String privateInstanceField = "instance:initial";

  private final String label;

  private Java17MethodHandlesPrivateLookupIn(String label) {
    this.label = label;
  }

  private static String privateStatic(String text) {
    return "static:" + text;
  }

  private String privateInstance(String suffix) {
    return label + ":" + suffix;
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup privateLookup =
        MethodHandles.privateLookupIn(Java17MethodHandlesPrivateLookupIn.class, lookup);
    System.out.println(privateLookup.lookupClass().getName());
    System.out.println(hasMode(privateLookup, MethodHandles.Lookup.PRIVATE) + ":" +
        hasMode(privateLookup, MethodHandles.Lookup.PACKAGE));

    MethodHandle constructor = privateLookup.findConstructor(
        Java17MethodHandlesPrivateLookupIn.class,
        MethodType.methodType(void.class, String.class));
    Java17MethodHandlesPrivateLookupIn receiver =
        (Java17MethodHandlesPrivateLookupIn) constructor.invokeExact("ctor");
    System.out.println(receiver.label);
    System.out.println(constructor.type().toMethodDescriptorString());

    MethodHandle staticMethod = privateLookup.findStatic(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateStatic",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) staticMethod.invokeExact("m"));

    MethodHandle instanceMethod = privateLookup.findVirtual(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateInstance",
        MethodType.methodType(String.class, String.class));
    System.out.println((String) instanceMethod.invokeExact(receiver, "v"));

    MethodHandle staticGetter = privateLookup.findStaticGetter(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateStaticField",
        String.class);
    MethodHandle staticSetter = privateLookup.findStaticSetter(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateStaticField",
        String.class);
    System.out.println((String) staticGetter.invokeExact());
    staticSetter.invokeExact("static:updated");
    System.out.println(privateStaticField);

    MethodHandle instanceGetter = privateLookup.findGetter(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateInstanceField",
        String.class);
    MethodHandle instanceSetter = privateLookup.findSetter(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateInstanceField",
        String.class);
    System.out.println((String) instanceGetter.invokeExact(receiver));
    instanceSetter.invokeExact(receiver, "instance:updated");
    System.out.println(receiver.privateInstanceField);

    Java17MethodHandlesPrivateLookupInPeer.run();
    expectPrivateLookupFailure(MethodHandles.publicLookup(), "public");
    expectInvalidTarget(int.class, "primitive");
    expectInvalidTarget(String[].class, "array");
  }

  static boolean hasMode(MethodHandles.Lookup lookup, int mode) {
    return (lookup.lookupModes() & mode) != 0;
  }

  static void expectPrivateLookupFailure(MethodHandles.Lookup lookup, String label) {
    try {
      MethodHandles.privateLookupIn(Java17MethodHandlesPrivateLookupIn.class, lookup);
      System.out.println(label + ":ok");
    } catch (IllegalAccessException e) {
      System.out.println(label + ":" + e.getClass().getName());
    }
  }

  static void expectInvalidTarget(Class<?> target, String label) {
    try {
      MethodHandles.privateLookupIn(target, MethodHandles.lookup());
      System.out.println(label + ":ok");
    } catch (IllegalArgumentException e) {
      System.out.println(label + ":" + e.getClass().getName());
    } catch (IllegalAccessException e) {
      System.out.println(label + ":" + e.getClass().getName());
    }
  }
}

class Java17MethodHandlesPrivateLookupInPeer {
  static void run() throws Throwable {
    MethodHandles.Lookup privateLookup = MethodHandles.privateLookupIn(
        Java17MethodHandlesPrivateLookupIn.class,
        MethodHandles.lookup());
    MethodHandle staticMethod = privateLookup.findStatic(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateStatic",
        MethodType.methodType(String.class, String.class));
    MethodHandle staticGetter = privateLookup.findStaticGetter(
        Java17MethodHandlesPrivateLookupIn.class,
        "privateStaticField",
        String.class);
    System.out.println((String) staticMethod.invokeExact("peer"));
    System.out.println((String) staticGetter.invokeExact());
  }
}
