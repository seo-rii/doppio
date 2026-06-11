package java.lang.constant;

import java.util.Objects;

public final class ConstantDescs {
  public static final String DEFAULT_NAME = "_";

  public static final ClassDesc CD_Object = ClassDesc.of("java.lang.Object");
  public static final ClassDesc CD_String = ClassDesc.of("java.lang.String");
  public static final ClassDesc CD_Class = ClassDesc.of("java.lang.Class");
  public static final ClassDesc CD_Number = ClassDesc.of("java.lang.Number");
  public static final ClassDesc CD_Integer = ClassDesc.of("java.lang.Integer");
  public static final ClassDesc CD_Long = ClassDesc.of("java.lang.Long");
  public static final ClassDesc CD_Float = ClassDesc.of("java.lang.Float");
  public static final ClassDesc CD_Double = ClassDesc.of("java.lang.Double");
  public static final ClassDesc CD_Short = ClassDesc.of("java.lang.Short");
  public static final ClassDesc CD_Byte = ClassDesc.of("java.lang.Byte");
  public static final ClassDesc CD_Character = ClassDesc.of("java.lang.Character");
  public static final ClassDesc CD_Boolean = ClassDesc.of("java.lang.Boolean");
  public static final ClassDesc CD_Void = ClassDesc.of("java.lang.Void");
  public static final ClassDesc CD_Throwable = ClassDesc.of("java.lang.Throwable");
  public static final ClassDesc CD_Exception = ClassDesc.of("java.lang.Exception");
  public static final ClassDesc CD_Enum = ClassDesc.of("java.lang.Enum");
  public static final ClassDesc CD_VarHandle = ClassDesc.of("java.lang.invoke.VarHandle");
  public static final ClassDesc CD_MethodHandles = ClassDesc.of("java.lang.invoke.MethodHandles");
  public static final ClassDesc CD_MethodHandles_Lookup = CD_MethodHandles.nested("Lookup");
  public static final ClassDesc CD_MethodHandle = ClassDesc.of("java.lang.invoke.MethodHandle");
  public static final ClassDesc CD_MethodType = ClassDesc.of("java.lang.invoke.MethodType");
  public static final ClassDesc CD_CallSite = ClassDesc.of("java.lang.invoke.CallSite");
  public static final ClassDesc CD_Collection = ClassDesc.of("java.util.Collection");
  public static final ClassDesc CD_List = ClassDesc.of("java.util.List");
  public static final ClassDesc CD_Set = ClassDesc.of("java.util.Set");
  public static final ClassDesc CD_Map = ClassDesc.of("java.util.Map");
  public static final ClassDesc CD_ConstantDesc = ClassDesc.of("java.lang.constant.ConstantDesc");
  public static final ClassDesc CD_ClassDesc = ClassDesc.of("java.lang.constant.ClassDesc");
  public static final ClassDesc CD_EnumDesc = CD_Enum.nested("EnumDesc");
  public static final ClassDesc CD_MethodTypeDesc = ClassDesc.of("java.lang.constant.MethodTypeDesc");
  public static final ClassDesc CD_MethodHandleDesc = ClassDesc.of("java.lang.constant.MethodHandleDesc");
  public static final ClassDesc CD_DirectMethodHandleDesc = ClassDesc.of("java.lang.constant.DirectMethodHandleDesc");
  public static final ClassDesc CD_VarHandleDesc = CD_VarHandle.nested("VarHandleDesc");
  public static final ClassDesc CD_MethodHandleDesc_Kind = CD_DirectMethodHandleDesc.nested("Kind");
  public static final ClassDesc CD_DynamicConstantDesc = ClassDesc.of("java.lang.constant.DynamicConstantDesc");
  public static final ClassDesc CD_DynamicCallSiteDesc = ClassDesc.of("java.lang.constant.DynamicCallSiteDesc");
  public static final ClassDesc CD_ConstantBootstraps = ClassDesc.of("java.lang.invoke.ConstantBootstraps");

  public static final DirectMethodHandleDesc BSM_PRIMITIVE_CLASS =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "primitiveClass",
      CD_Class);
  public static final DirectMethodHandleDesc BSM_ENUM_CONSTANT =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "enumConstant",
      CD_Enum);
  public static final DirectMethodHandleDesc BSM_GET_STATIC_FINAL =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "getStaticFinal",
      CD_Object,
      CD_Class);
  public static final DirectMethodHandleDesc BSM_NULL_CONSTANT =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "nullConstant",
      CD_Object);
  public static final DirectMethodHandleDesc BSM_VARHANDLE_FIELD =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "fieldVarHandle",
      CD_VarHandle,
      CD_Class,
      CD_Class);
  public static final DirectMethodHandleDesc BSM_VARHANDLE_STATIC_FIELD =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "staticFieldVarHandle",
      CD_VarHandle,
      CD_Class,
      CD_Class);
  public static final DirectMethodHandleDesc BSM_VARHANDLE_ARRAY =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "arrayVarHandle",
      CD_VarHandle,
      CD_Class);
  public static final DirectMethodHandleDesc BSM_INVOKE =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "invoke",
      CD_Object,
      CD_MethodHandle,
      CD_Object.arrayType());
  public static final DirectMethodHandleDesc BSM_EXPLICIT_CAST =
    ofConstantBootstrap(
      CD_ConstantBootstraps,
      "explicitCast",
      CD_Object,
      CD_Object);

  public static final ClassDesc CD_int = ClassDesc.ofDescriptor("I");
  public static final ClassDesc CD_long = ClassDesc.ofDescriptor("J");
  public static final ClassDesc CD_float = ClassDesc.ofDescriptor("F");
  public static final ClassDesc CD_double = ClassDesc.ofDescriptor("D");
  public static final ClassDesc CD_short = ClassDesc.ofDescriptor("S");
  public static final ClassDesc CD_byte = ClassDesc.ofDescriptor("B");
  public static final ClassDesc CD_char = ClassDesc.ofDescriptor("C");
  public static final ClassDesc CD_boolean = ClassDesc.ofDescriptor("Z");
  public static final ClassDesc CD_void = ClassDesc.ofDescriptor("V");

  public static final ConstantDesc NULL =
    new ResolvedDynamicConstantDesc<Object>(BSM_NULL_CONSTANT, DEFAULT_NAME, CD_Object, null);
  public static final DynamicConstantDesc<Boolean> TRUE =
    new ResolvedDynamicConstantDesc<Boolean>(BSM_GET_STATIC_FINAL, "TRUE", CD_Boolean, Boolean.TRUE, CD_Boolean);
  public static final DynamicConstantDesc<Boolean> FALSE =
    new ResolvedDynamicConstantDesc<Boolean>(BSM_GET_STATIC_FINAL, "FALSE", CD_Boolean, Boolean.FALSE, CD_Boolean);

  private ConstantDescs() {}

  public static DirectMethodHandleDesc ofCallsiteBootstrap(
      ClassDesc owner,
      String name,
      ClassDesc returnType,
      ClassDesc... paramTypes) {
    Objects.requireNonNull(paramTypes);
    ClassDesc[] lookupTypeParams = new ClassDesc[paramTypes.length + 3];
    lookupTypeParams[0] = CD_MethodHandles_Lookup;
    lookupTypeParams[1] = CD_String;
    lookupTypeParams[2] = CD_MethodType;
    for (int i = 0; i < paramTypes.length; i++) {
      lookupTypeParams[i + 3] = Objects.requireNonNull(paramTypes[i]);
    }
    return MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,
      Objects.requireNonNull(owner),
      Objects.requireNonNull(name),
      MethodTypeDesc.of(Objects.requireNonNull(returnType), lookupTypeParams));
  }

  public static DirectMethodHandleDesc ofConstantBootstrap(
      ClassDesc owner,
      String name,
      ClassDesc returnType,
      ClassDesc... paramTypes) {
    Objects.requireNonNull(paramTypes);
    ClassDesc[] lookupTypeParams = new ClassDesc[paramTypes.length + 3];
    lookupTypeParams[0] = CD_MethodHandles_Lookup;
    lookupTypeParams[1] = CD_String;
    lookupTypeParams[2] = CD_Class;
    for (int i = 0; i < paramTypes.length; i++) {
      lookupTypeParams[i + 3] = Objects.requireNonNull(paramTypes[i]);
    }
    return MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,
      Objects.requireNonNull(owner),
      Objects.requireNonNull(name),
      MethodTypeDesc.of(Objects.requireNonNull(returnType), lookupTypeParams));
  }
}
