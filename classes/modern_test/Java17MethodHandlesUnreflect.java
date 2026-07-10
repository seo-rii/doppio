package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

public class Java17MethodHandlesUnreflect {
  public static String publicStaticField = "static:initial";
  private static String privateStaticField = "private-static";

  public String publicInstanceField = "instance:initial";
  private String privateInstanceField = "private-instance";

  public final String label;

  public Java17MethodHandlesUnreflect(String label) {
    this.label = label;
  }

  private Java17MethodHandlesUnreflect(int value) {
    this.label = "private:" + value;
  }

  public static String join(String text, int value) {
    return text + ":" + value;
  }

  private static String privateJoin(String text) {
    return "private:" + text;
  }

  public String append(String suffix) {
    return label + ":" + suffix;
  }

  private String privateAppend(String suffix) {
    return label + ":private:" + suffix;
  }

  public static class SpecialParent {
    public String dispatch(String suffix) {
      return "parent:" + suffix;
    }
  }

  public interface SpecialDefault {
    default String defaultJoin(String suffix) {
      return "default:" + suffix;
    }
  }

  public static class SpecialChild extends SpecialParent implements SpecialDefault {
    public String dispatch(String suffix) {
      return "child:" + suffix;
    }

    public static void run() throws Throwable {
      MethodHandles.Lookup lookup = MethodHandles.lookup();
      SpecialChild receiver = new SpecialChild();

      Method parentMethod = SpecialParent.class.getDeclaredMethod("dispatch", String.class);
      MethodHandle parentSpecial = lookup.unreflectSpecial(parentMethod, SpecialChild.class);
      System.out.println((String) parentSpecial.invokeExact(receiver, "reflect"));
      System.out.println(parentSpecial.type().toMethodDescriptorString());

      Method defaultMethod = SpecialDefault.class.getDeclaredMethod("defaultJoin", String.class);
      MethodHandle defaultSpecial = lookup.unreflectSpecial(defaultMethod, SpecialChild.class);
      System.out.println((String) defaultSpecial.invokeExact(receiver, "reflect"));
      System.out.println(defaultSpecial.type().toMethodDescriptorString());
    }
  }

  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Method publicStaticMethod = Java17MethodHandlesUnreflect.class.getDeclaredMethod(
        "join",
        String.class,
        int.class);
    MethodHandle publicStatic = lookup.unreflect(publicStaticMethod);
    System.out.println((String) publicStatic.invokeExact("s", 7));
    System.out.println(publicStatic.type().toMethodDescriptorString());
    Method reflectedPublicStatic = MethodHandles.reflectAs(Method.class, publicStatic);
    System.out.println(reflectedPublicStatic.getName() + ":" + reflectedPublicStatic.getParameterTypes().length);

    Constructor<Java17MethodHandlesUnreflect> publicConstructor =
        Java17MethodHandlesUnreflect.class.getConstructor(String.class);
    MethodHandle constructor = lookup.unreflectConstructor(publicConstructor);
    Java17MethodHandlesUnreflect receiver =
        (Java17MethodHandlesUnreflect) constructor.invokeExact("r");
    System.out.println(receiver.label);
    System.out.println(constructor.type().toMethodDescriptorString());
    Constructor<?> reflectedConstructor = MethodHandles.reflectAs(Constructor.class, constructor);
    System.out.println(reflectedConstructor.getDeclaringClass().getSimpleName() + ":" +
        reflectedConstructor.getParameterTypes()[0].getName());

    Method publicVirtualMethod = Java17MethodHandlesUnreflect.class.getDeclaredMethod(
        "append",
        String.class);
    MethodHandle publicVirtual = lookup.unreflect(publicVirtualMethod);
    System.out.println((String) publicVirtual.invokeExact(receiver, "v"));
    System.out.println(publicVirtual.type().toMethodDescriptorString());
    Method reflectedPublicVirtual = MethodHandles.reflectAs(Method.class, publicVirtual);
    System.out.println(reflectedPublicVirtual.getName() + ":" +
        reflectedPublicVirtual.getReturnType().getName());

    Field staticField = Java17MethodHandlesUnreflect.class.getDeclaredField("publicStaticField");
    MethodHandle staticGetter = lookup.unreflectGetter(staticField);
    MethodHandle staticSetter = lookup.unreflectSetter(staticField);
    System.out.println((String) staticGetter.invokeExact());
    staticSetter.invokeExact("static:updated");
    System.out.println(publicStaticField);
    Field reflectedStaticField = MethodHandles.reflectAs(Field.class, staticGetter);
    System.out.println(reflectedStaticField.getName() + ":" + reflectedStaticField.getType().getName());

    Field instanceField = Java17MethodHandlesUnreflect.class.getDeclaredField("publicInstanceField");
    MethodHandle instanceGetter = lookup.unreflectGetter(instanceField);
    MethodHandle instanceSetter = lookup.unreflectSetter(instanceField);
    System.out.println((String) instanceGetter.invokeExact(receiver));
    instanceSetter.invokeExact(receiver, "instance:updated");
    System.out.println(receiver.publicInstanceField);
    Field reflectedInstanceField = MethodHandles.reflectAs(Field.class, instanceSetter);
    System.out.println(reflectedInstanceField.getName() + ":" + reflectedInstanceField.getType().getName());

    SpecialChild.run();
    Java17MethodHandlesUnreflectPeer.run();
    Nestmate.run();
  }

  private static class Nestmate {
    static void run() throws Throwable {
      MethodHandles.Lookup lookup = MethodHandles.lookup();
      Method privateStaticMethod = Java17MethodHandlesUnreflect.class.getDeclaredMethod(
          "privateJoin",
          String.class);
      MethodHandle privateStatic = lookup.unreflect(privateStaticMethod);
      System.out.println((String) privateStatic.invokeExact("nest"));

      Constructor<Java17MethodHandlesUnreflect> privateConstructor =
          Java17MethodHandlesUnreflect.class.getDeclaredConstructor(int.class);
      MethodHandle constructor = lookup.unreflectConstructor(privateConstructor);
      Java17MethodHandlesUnreflect receiver =
          (Java17MethodHandlesUnreflect) constructor.invokeExact(17);
      System.out.println(receiver.label);

      Method privateVirtualMethod = Java17MethodHandlesUnreflect.class.getDeclaredMethod(
          "privateAppend",
          String.class);
      MethodHandle privateVirtual = lookup.unreflect(privateVirtualMethod);
      System.out.println((String) privateVirtual.invokeExact(receiver, "v"));

      Field staticField = Java17MethodHandlesUnreflect.class.getDeclaredField("privateStaticField");
      MethodHandle staticGetter = lookup.unreflectGetter(staticField);
      MethodHandle staticSetter = lookup.unreflectSetter(staticField);
      System.out.println((String) staticGetter.invokeExact());
      staticSetter.invokeExact("private-static:nest");
      System.out.println(privateStaticField);

      Field instanceField = Java17MethodHandlesUnreflect.class.getDeclaredField("privateInstanceField");
      MethodHandle instanceGetter = lookup.unreflectGetter(instanceField);
      MethodHandle instanceSetter = lookup.unreflectSetter(instanceField);
      System.out.println((String) instanceGetter.invokeExact(receiver));
      instanceSetter.invokeExact(receiver, "private-instance:nest");
      System.out.println(receiver.privateInstanceField);
    }
  }
}

class Java17MethodHandlesUnreflectPeer {
  static void run() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    try {
      lookup.unreflect(Java17MethodHandlesUnreflect.class.getDeclaredMethod(
          "privateJoin",
          String.class));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      lookup.unreflectConstructor(Java17MethodHandlesUnreflect.class.getDeclaredConstructor(int.class));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      lookup.unreflectGetter(Java17MethodHandlesUnreflect.class.getDeclaredField("privateStaticField"));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      lookup.unreflectSetter(Java17MethodHandlesUnreflect.class.getDeclaredField("privateInstanceField"));
      System.out.println(false);
    } catch (IllegalAccessException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
