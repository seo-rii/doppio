package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.DynamicConstantDesc;
import java.lang.constant.MethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandles;

public class Java17ConstantDescs {
  public enum Color {
    RED
  }

  public static final String TEXT = "text-value";
  public static final int INT_VALUE = 42;

  public static String join(String text, int value) {
    return text + ":" + value;
  }

  public static int intValue(int value) {
    return value;
  }

  public static Object identity(Object value) {
    return value;
  }

  public static void main(String[] args) throws ReflectiveOperationException {
    System.out.println(ConstantDescs.TRUE.constantName());
    System.out.println(ConstantDescs.TRUE.constantType().descriptorString());
    System.out.println(ConstantDescs.TRUE.bootstrapArgs().length);
    System.out.println(ConstantDescs.TRUE.bootstrapArgsList().size());
    System.out.println(ConstantDescs.TRUE.resolveConstantDesc(MethodHandles.lookup()));
    System.out.println(ConstantDescs.FALSE.resolveConstantDesc(MethodHandles.lookup()));
    System.out.println(ConstantDescs.TRUE.equals(ConstantDescs.FALSE));
    System.out.println(ConstantDescs.TRUE.equals(ConstantDescs.TRUE));
    System.out.println(ConstantDescs.TRUE.toString());
    System.out.println(ConstantDescs.FALSE.toString());
    System.out.println(ConstantDescs.NULL.toString());
    System.out.println(ConstantDescs.TRUE.bootstrapMethod().methodName());
    System.out.println(ConstantDescs.TRUE.bootstrapMethod().owner().descriptorString());
    System.out.println(ConstantDescs.TRUE.bootstrapMethod().lookupDescriptor());
    System.out.println(ConstantDescs.CD_MethodHandleDesc_Kind.descriptorString());
    System.out.println(ConstantDescs.CD_MethodHandleDesc_Kind.displayName());
    System.out.println(((Class<?>) ConstantDescs.CD_MethodHandleDesc_Kind.resolveConstantDesc(MethodHandles.lookup())).getName());
    System.out.println(ConstantDescs.CD_VarHandleDesc.descriptorString());
    System.out.println(ConstantDescs.CD_VarHandleDesc.displayName());
    System.out.println(ConstantDescs.CD_VarHandleDesc.packageName());
    System.out.println(ConstantDescs.CD_VarHandleDesc.isClassOrInterface());
    System.out.println(ConstantDescs.CD_VarHandleDesc.equals(ConstantDescs.CD_VarHandle.nested("VarHandleDesc")));

    ConstantDesc canonicalNull = DynamicConstantDesc.ofCanonical(
      ConstantDescs.BSM_NULL_CONSTANT,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_Object,
      new ConstantDesc[0]);
    System.out.println(canonicalNull == ConstantDescs.NULL);
    System.out.println(canonicalNull.equals(ConstantDescs.NULL));
    ConstantDesc canonicalTrue = DynamicConstantDesc.ofCanonical(
      ConstantDescs.BSM_GET_STATIC_FINAL,
      "TRUE",
      ConstantDescs.CD_Boolean,
      new ConstantDesc[] { ConstantDescs.CD_Boolean });
    System.out.println(canonicalTrue == ConstantDescs.TRUE);
    System.out.println(canonicalTrue.equals(ConstantDescs.TRUE));
    System.out.println(canonicalTrue.toString());
    System.out.println(DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_NULL_CONSTANT,
      "x",
      ConstantDescs.CD_Object).toString());
    System.out.println(DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_NULL_CONSTANT,
      "x",
      ConstantDescs.CD_Object,
      ConstantDescs.CD_String).toString());
    System.out.println(DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_Object,
      ConstantDescs.CD_String).toString());
    ClassDesc owner = ClassDesc.of("classes.modern_test", "Java17ConstantDescs");
    ClassDesc color = owner.nested("Color");
    printResolved("dynamicNull", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_NULL_CONSTANT,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_Object).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicPrimitive", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_PRIMITIVE_CLASS,
      "I",
      ConstantDescs.CD_Class).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicEnum", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_ENUM_CONSTANT,
      "RED",
      color).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicStaticText", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_GET_STATIC_FINAL,
      "TEXT",
      ConstantDescs.CD_String,
      owner).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicStaticInt", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_GET_STATIC_FINAL,
      "INT_VALUE",
      ConstantDescs.CD_int,
      owner).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicExplicitClass", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_Class,
      ConstantDescs.CD_String).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicExplicitInt", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_int,
      DynamicConstantDesc.ofNamed(
        ConstantDescs.BSM_GET_STATIC_FINAL,
        "INT_VALUE",
        ConstantDescs.CD_int,
        owner)).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicExplicitIntToLong", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_long,
      Integer.valueOf(130)).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicExplicitIntToByte", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_byte,
      Integer.valueOf(130)).resolveConstantDesc(MethodHandles.lookup()));
    DynamicConstantDesc<Character> dynamicExplicitIntToChar = DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_char,
      Integer.valueOf(65));
    printResolved("dynamicExplicitIntToChar", dynamicExplicitIntToChar.resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicExplicitCharToInt", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_int,
      dynamicExplicitIntToChar).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicExplicitIntToDouble", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_double,
      Integer.valueOf(130)).resolveConstantDesc(MethodHandles.lookup()));
    DirectMethodHandleDesc dynamicInvokeJoin = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,
      owner,
      "join",
      MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_String, ConstantDescs.CD_int));
    printResolved("dynamicInvokeJoin", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_INVOKE,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_String,
      dynamicInvokeJoin,
      "x",
      Integer.valueOf(7)).resolveConstantDesc(MethodHandles.lookup()));
    DirectMethodHandleDesc dynamicInvokeIntValue = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,
      owner,
      "intValue",
      MethodTypeDesc.of(ConstantDescs.CD_int, ConstantDescs.CD_int));
    printResolved("dynamicInvokeIntToLong", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_INVOKE,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_long,
      dynamicInvokeIntValue,
      Integer.valueOf(-9)).resolveConstantDesc(MethodHandles.lookup()));
    printResolved("dynamicInvokeIntToDouble", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_INVOKE,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_double,
      dynamicInvokeIntValue,
      Integer.valueOf(3)).resolveConstantDesc(MethodHandles.lookup()));
    DirectMethodHandleDesc dynamicInvokeIdentity = MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,
      owner,
      "identity",
      MethodTypeDesc.of(ConstantDescs.CD_Object, ConstantDescs.CD_Object));
    printResolved("dynamicInvokeReferenceCast", DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_INVOKE,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_String,
      dynamicInvokeIdentity,
      "cast-ok").resolveConstantDesc(MethodHandles.lookup()));
    printFailure("dynamicInvokeBadReferenceCast", () -> DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_INVOKE,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_Integer,
      dynamicInvokeIdentity,
      "bad").resolveConstantDesc(MethodHandles.lookup()));
    printFailure("dynamicBadPrimitiveName", () -> DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_PRIMITIVE_CLASS,
      "int",
      ConstantDescs.CD_Class).resolveConstantDesc(MethodHandles.lookup()));
    printFailure("dynamicMissingEnum", () -> DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_ENUM_CONSTANT,
      "MISSING",
      color).resolveConstantDesc(MethodHandles.lookup()));
    printFailure("dynamicBadExplicitCast", () -> DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_Integer,
      ConstantDescs.CD_String).resolveConstantDesc(MethodHandles.lookup()));
    printFailure("dynamicBadPrimitiveExplicitCast", () -> DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_EXPLICIT_CAST,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_int,
      DynamicConstantDesc.ofNamed(
        ConstantDescs.BSM_GET_STATIC_FINAL,
        "TEXT",
        ConstantDescs.CD_String,
        owner)).resolveConstantDesc(MethodHandles.lookup()));
    printFailure("dynamicMissingStaticFinal", () -> DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_GET_STATIC_FINAL,
      "MISSING",
      ConstantDescs.CD_String,
      owner).resolveConstantDesc(MethodHandles.lookup()));
    printFailure("dynamicWrongStaticFinalType", () -> DynamicConstantDesc.ofNamed(
      ConstantDescs.BSM_GET_STATIC_FINAL,
      "TEXT",
      ConstantDescs.CD_Integer,
      owner).resolveConstantDesc(MethodHandles.lookup()));

    printBootstrap("primitive", ConstantDescs.BSM_PRIMITIVE_CLASS);
    printBootstrap("enum", ConstantDescs.BSM_ENUM_CONSTANT);
    printBootstrap("getStaticFinal", ConstantDescs.BSM_GET_STATIC_FINAL);
    printBootstrap("null", ConstantDescs.BSM_NULL_CONSTANT);
    printBootstrap("varField", ConstantDescs.BSM_VARHANDLE_FIELD);
    printBootstrap("varStatic", ConstantDescs.BSM_VARHANDLE_STATIC_FIELD);
    printBootstrap("varArray", ConstantDescs.BSM_VARHANDLE_ARRAY);
    printBootstrap("invoke", ConstantDescs.BSM_INVOKE);
    printBootstrap("explicitCast", ConstantDescs.BSM_EXPLICIT_CAST);

    DirectMethodHandleDesc customConstant = ConstantDescs.ofConstantBootstrap(
      ConstantDescs.CD_ConstantBootstraps,
      "nullConstant",
      ConstantDescs.CD_Object);
    printBootstrap("customConstant", customConstant);
    System.out.println(DynamicConstantDesc.ofNamed(
      customConstant,
      ConstantDescs.DEFAULT_NAME,
      ConstantDescs.CD_Object,
      ConstantDescs.CD_String).toString());

    DirectMethodHandleDesc customCallsite = ConstantDescs.ofCallsiteBootstrap(
      ConstantDescs.CD_String,
      "valueOf",
      ConstantDescs.CD_CallSite,
      ConstantDescs.CD_Object);
    printBootstrap("customCallsite", customCallsite);

    try {
      ConstantDescs.ofConstantBootstrap(ConstantDescs.CD_ConstantBootstraps, null, ConstantDescs.CD_Object);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ConstantDescs.ofCallsiteBootstrap(
        ConstantDescs.CD_String,
        "valueOf",
        ConstantDescs.CD_CallSite,
        ConstantDescs.CD_Object,
        null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ConstantDescs.ofConstantBootstrap(
        ConstantDescs.CD_int,
        "x",
        ConstantDescs.CD_Object);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ConstantDescs.ofConstantBootstrap(
        ConstantDescs.CD_String.arrayType(),
        "x",
        ConstantDescs.CD_Object);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ConstantDescs.ofConstantBootstrap(
        ConstantDescs.CD_ConstantBootstraps,
        "x",
        ConstantDescs.CD_Object,
        ConstantDescs.CD_void);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      ConstantDescs.ofCallsiteBootstrap(
        ConstantDescs.CD_int,
        "x",
        ConstantDescs.CD_CallSite);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
  }

  private static void printResolved(String label, Object value) {
    System.out.println(label + ":" + value + ":" + (value == null ? "null" : value.getClass().getName()));
  }

  private static void printFailure(String label, ThrowingRunnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":ok");
    } catch (Throwable e) {
      Throwable cause = e.getCause();
      System.out.println(label + ":" + e.getClass().getName() + ":" + (cause == null ? "null" : cause.getClass().getName()));
    }
  }

  private interface ThrowingRunnable {
    void run() throws ReflectiveOperationException;
  }

  private static void printBootstrap(String label, DirectMethodHandleDesc desc) {
    System.out.println(label);
    System.out.println(desc.kind());
    System.out.println(desc.refKind());
    System.out.println(desc.isOwnerInterface());
    System.out.println(desc.owner().descriptorString());
    System.out.println(desc.methodName());
    System.out.println(desc.lookupDescriptor());
    System.out.println(desc.invocationType().descriptorString());
    System.out.println(desc.toString());
  }
}
