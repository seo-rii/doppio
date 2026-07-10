package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.MethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;

public class Java12MethodHandleDesc {
  public static class ResolveTarget {
    public static String staticField = "static-field";
    public String instanceField = "instance-field";
    public final String label;

    public ResolveTarget(String label) {
      this.label = label;
    }

    public static String join(String text, int value) {
      return text + ":" + value;
    }

    public String instanceJoin(String suffix) {
      return label + ":" + suffix;
    }
  }

  public String specialJoin(String suffix) {
    return "special:" + suffix;
  }

  public static void main(String[] args) throws Throwable {
    DirectMethodHandleDesc staticMethod = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,
      ConstantDescs.CD_Integer,
      "parseInt",
      MethodTypeDesc.of(ConstantDescs.CD_int, ConstantDescs.CD_String));
    System.out.println(staticMethod.kind());
    System.out.println(staticMethod.refKind());
    System.out.println(staticMethod.isOwnerInterface());
    System.out.println(staticMethod.owner().descriptorString());
    System.out.println(staticMethod.methodName());
    System.out.println(staticMethod.lookupDescriptor());
    System.out.println(staticMethod.invocationType().descriptorString());
    System.out.println(staticMethod.toString());
    MethodHandleDesc sameType = staticMethod.asType(staticMethod.invocationType());
    MethodHandleDesc changedType = staticMethod.asType(MethodTypeDesc.of(ConstantDescs.CD_long, ConstantDescs.CD_Object));
    MethodHandleDesc changedTypeAgain = staticMethod.asType(MethodTypeDesc.of(ConstantDescs.CD_long, ConstantDescs.CD_Object));
    System.out.println(sameType == staticMethod);
    System.out.println(changedType == staticMethod);
    System.out.println(changedType.invocationType().descriptorString());
    System.out.println(changedType.toString());
    System.out.println(changedType.equals(changedTypeAgain));
    System.out.println(changedType.hashCode() == changedTypeAgain.hashCode());

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle resolvedJdkStatic = (MethodHandle) staticMethod.resolveConstantDesc(lookup);
    System.out.println((int) resolvedJdkStatic.invokeExact("123"));
    System.out.println(resolvedJdkStatic.type());

    ClassDesc resolveOwner = ClassDesc.of("classes.modern_test", "Java12MethodHandleDesc").nested("ResolveTarget");
    DirectMethodHandleDesc resolveStatic = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,
      resolveOwner,
      "join",
      MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_String, ConstantDescs.CD_int));
    MethodHandle resolvedStatic = (MethodHandle) resolveStatic.resolveConstantDesc(lookup);
    System.out.println((String) resolvedStatic.invokeExact("s", 7));
    System.out.println(resolvedStatic.type());

    MethodHandle resolvedAsType = (MethodHandle) resolveStatic
      .asType(MethodTypeDesc.of(ConstantDescs.CD_Object, ConstantDescs.CD_Object, ConstantDescs.CD_Integer))
      .resolveConstantDesc(lookup);
    Object resolvedAsTypeResult = resolvedAsType.invokeExact((Object) "a", Integer.valueOf(9));
    System.out.println((String) resolvedAsTypeResult);
    System.out.println(resolvedAsType.type());

    DirectMethodHandleDesc resolveVirtual = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.VIRTUAL,
      resolveOwner,
      "instanceJoin",
      MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_String));
    MethodHandle resolvedVirtual = (MethodHandle) resolveVirtual.resolveConstantDesc(lookup);
    ResolveTarget receiver = new ResolveTarget("r");
    System.out.println((String) resolvedVirtual.invokeExact(receiver, "v"));
    System.out.println(resolvedVirtual.type());

    ClassDesc sameClass = ClassDesc.of("classes.modern_test", "Java12MethodHandleDesc");
    DirectMethodHandleDesc resolveSpecial = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.SPECIAL,
      sameClass,
      "specialJoin",
      MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_String));
    MethodHandle resolvedSpecial = (MethodHandle) resolveSpecial.resolveConstantDesc(lookup);
    System.out.println((String) resolvedSpecial.invokeExact(new Java12MethodHandleDesc(), "desc"));
    System.out.println(resolvedSpecial.type());

    MethodHandle resolvedConstructor = (MethodHandle) MethodHandleDesc
      .ofConstructor(resolveOwner, ConstantDescs.CD_String)
      .resolveConstantDesc(lookup);
    System.out.println(((ResolveTarget) resolvedConstructor.invokeExact("ctor")).label);
    System.out.println(resolvedConstructor.type());

    MethodHandle resolvedStaticGetter = (MethodHandle) MethodHandleDesc
      .ofField(DirectMethodHandleDesc.Kind.STATIC_GETTER, resolveOwner, "staticField", ConstantDescs.CD_String)
      .resolveConstantDesc(lookup);
    MethodHandle resolvedStaticSetter = (MethodHandle) MethodHandleDesc
      .ofField(DirectMethodHandleDesc.Kind.STATIC_SETTER, resolveOwner, "staticField", ConstantDescs.CD_String)
      .resolveConstantDesc(lookup);
    System.out.println((String) resolvedStaticGetter.invokeExact());
    resolvedStaticSetter.invokeExact("static-updated");
    System.out.println(ResolveTarget.staticField);

    MethodHandle resolvedGetter = (MethodHandle) MethodHandleDesc
      .ofField(DirectMethodHandleDesc.Kind.GETTER, resolveOwner, "instanceField", ConstantDescs.CD_String)
      .resolveConstantDesc(lookup);
    MethodHandle resolvedSetter = (MethodHandle) MethodHandleDesc
      .ofField(DirectMethodHandleDesc.Kind.SETTER, resolveOwner, "instanceField", ConstantDescs.CD_String)
      .resolveConstantDesc(lookup);
    System.out.println((String) resolvedGetter.invokeExact(receiver));
    resolvedSetter.invokeExact(receiver, "instance-updated");
    System.out.println(receiver.instanceField);

    try {
      MethodHandleDesc
        .ofMethod(
          DirectMethodHandleDesc.Kind.STATIC,
          resolveOwner,
          "missing",
          MethodTypeDesc.of(ConstantDescs.CD_void))
        .resolveConstantDesc(lookup);
      System.out.println(false);
    } catch (NoSuchMethodException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      staticMethod.asType(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    DirectMethodHandleDesc virtualMethod = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.VIRTUAL,
      ConstantDescs.CD_String,
      "substring",
      MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_int));
    System.out.println(virtualMethod.invocationType().descriptorString());
    System.out.println(virtualMethod.toString());
    MethodHandle resolvedJdkVirtual = (MethodHandle) virtualMethod.resolveConstantDesc(lookup);
    System.out.println((String) resolvedJdkVirtual.invokeExact("abcdef", 2));
    System.out.println(resolvedJdkVirtual.type());

    DirectMethodHandleDesc constructor = MethodHandleDesc.ofConstructor(
      ClassDesc.of("java.lang.StringBuilder"),
      ConstantDescs.CD_String);
    System.out.println(constructor.methodName());
    System.out.println(constructor.lookupDescriptor());
    System.out.println(constructor.invocationType().descriptorString());
    System.out.println(constructor.toString());

    DirectMethodHandleDesc getter = MethodHandleDesc.ofField(
      DirectMethodHandleDesc.Kind.GETTER,
      ConstantDescs.CD_Integer,
      "value",
      ConstantDescs.CD_int);
    System.out.println(getter.lookupDescriptor());
    System.out.println(getter.invocationType().descriptorString());
    System.out.println(getter.toString());

    DirectMethodHandleDesc setter = MethodHandleDesc.ofField(
      DirectMethodHandleDesc.Kind.SETTER,
      ConstantDescs.CD_Integer,
      "value",
      ConstantDescs.CD_int);
    System.out.println(setter.refKind());
    System.out.println(setter.lookupDescriptor());
    System.out.println(setter.invocationType().descriptorString());
    System.out.println(setter.toString());

    DirectMethodHandleDesc staticGetter = MethodHandleDesc.ofField(
      DirectMethodHandleDesc.Kind.STATIC_GETTER,
      ConstantDescs.CD_Integer,
      "value",
      ConstantDescs.CD_int);
    System.out.println(staticGetter.refKind());
    System.out.println(staticGetter.lookupDescriptor());
    System.out.println(staticGetter.invocationType().descriptorString());
    System.out.println(staticGetter.toString());

    DirectMethodHandleDesc staticSetter = MethodHandleDesc.ofField(
      DirectMethodHandleDesc.Kind.STATIC_SETTER,
      ConstantDescs.CD_Integer,
      "value",
      ConstantDescs.CD_int);
    System.out.println(staticSetter.refKind());
    System.out.println(staticSetter.lookupDescriptor());
    System.out.println(staticSetter.invocationType().descriptorString());
    System.out.println(staticSetter.toString());

    System.out.println(DirectMethodHandleDesc.Kind.valueOf(6));
    System.out.println(DirectMethodHandleDesc.Kind.valueOf(6, true));
    System.out.println(DirectMethodHandleDesc.Kind.valueOf(9));
    for (int refKind = 1; refKind <= 9; refKind++) {
      try {
        System.out.println("plain:" + refKind + "=" + DirectMethodHandleDesc.Kind.valueOf(refKind));
      } catch (IllegalArgumentException e) {
        System.out.println("plain:" + refKind + "=" + e.getClass().getName());
      }
    }
    for (int refKind = 1; refKind <= 9; refKind++) {
      try {
        System.out.println("iface:" + refKind + "=" + DirectMethodHandleDesc.Kind.valueOf(refKind, true));
      } catch (IllegalArgumentException e) {
        System.out.println("iface:" + refKind + "=" + e.getClass().getName());
      }
    }
    for (int refKind = 1; refKind <= 9; refKind++) {
      try {
        System.out.println("class:" + refKind + "=" + DirectMethodHandleDesc.Kind.valueOf(refKind, false));
      } catch (IllegalArgumentException e) {
        System.out.println("class:" + refKind + "=" + e.getClass().getName());
      }
    }
    try {
      DirectMethodHandleDesc.Kind.valueOf(99);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.of(
        DirectMethodHandleDesc.Kind.STATIC,
        ConstantDescs.CD_String,
        "x",
        ConstantDescs.CD_int.descriptorString());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.of(
        DirectMethodHandleDesc.Kind.GETTER,
        ConstantDescs.CD_String,
        "x",
        MethodTypeDesc.of(ConstantDescs.CD_int).descriptorString());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.of(
        DirectMethodHandleDesc.Kind.CONSTRUCTOR,
        ConstantDescs.CD_String,
        "<init>",
        MethodTypeDesc.of(ConstantDescs.CD_int).descriptorString());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.of(
        DirectMethodHandleDesc.Kind.STATIC,
        ConstantDescs.CD_int,
        "x",
        MethodTypeDesc.of(ConstantDescs.CD_void).descriptorString());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.of(
        DirectMethodHandleDesc.Kind.STATIC,
        ConstantDescs.CD_String.arrayType(),
        "x",
        MethodTypeDesc.of(ConstantDescs.CD_void).descriptorString());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.ofField(
        DirectMethodHandleDesc.Kind.GETTER,
        ConstantDescs.CD_String,
        "x",
        ConstantDescs.CD_void);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.ofMethod(
        DirectMethodHandleDesc.Kind.GETTER,
        ConstantDescs.CD_String,
        "x",
        MethodTypeDesc.of(ConstantDescs.CD_void));
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      MethodHandleDesc.ofField(
        DirectMethodHandleDesc.Kind.STATIC,
        ConstantDescs.CD_String,
        "x",
        ConstantDescs.CD_int);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
