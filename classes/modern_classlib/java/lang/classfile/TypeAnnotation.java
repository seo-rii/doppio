package java.lang.classfile;

import java.util.List;

/** A typed annotation placement, real code-label target and immutable type path. */
public interface TypeAnnotation {
  enum TargetType {
    CLASS_TYPE_PARAMETER(0x00, 1), METHOD_TYPE_PARAMETER(0x01, 1), CLASS_EXTENDS(0x10, 2),
    CLASS_TYPE_PARAMETER_BOUND(0x11, 2), METHOD_TYPE_PARAMETER_BOUND(0x12, 2), FIELD(0x13, 0),
    METHOD_RETURN(0x14, 0), METHOD_RECEIVER(0x15, 0), METHOD_FORMAL_PARAMETER(0x16, 1), THROWS(0x17, 2),
    LOCAL_VARIABLE(0x40, -1), RESOURCE_VARIABLE(0x41, -1), EXCEPTION_PARAMETER(0x42, 2),
    INSTANCEOF(0x43, 2), NEW(0x44, 2), CONSTRUCTOR_REFERENCE(0x45, 2), METHOD_REFERENCE(0x46, 2),
    CAST(0x47, 3), CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT(0x48, 3), METHOD_INVOCATION_TYPE_ARGUMENT(0x49, 3),
    CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT(0x4a, 3), METHOD_REFERENCE_TYPE_ARGUMENT(0x4b, 3);
    private final int value, size;
    private TargetType(int value, int size) { this.value = value; this.size = size; }
    public int targetTypeValue() { return value; }
    public int sizeIfFixed() { return size; }
  }

  TargetInfo targetInfo();
  List<TypePathComponent> targetPath();
  Annotation annotation();
  static TypeAnnotation of(TargetInfo targetInfo, List<TypePathComponent> targetPath, Annotation annotation) {
    return DoppioTypeAnnotations.annotation(targetInfo, targetPath, annotation);
  }

  interface TargetInfo {
    int TARGET_CLASS_TYPE_PARAMETER = 0x00, TARGET_METHOD_TYPE_PARAMETER = 0x01, TARGET_CLASS_EXTENDS = 0x10,
      TARGET_CLASS_TYPE_PARAMETER_BOUND = 0x11, TARGET_METHOD_TYPE_PARAMETER_BOUND = 0x12, TARGET_FIELD = 0x13,
      TARGET_METHOD_RETURN = 0x14, TARGET_METHOD_RECEIVER = 0x15, TARGET_METHOD_FORMAL_PARAMETER = 0x16, TARGET_THROWS = 0x17,
      TARGET_LOCAL_VARIABLE = 0x40, TARGET_RESOURCE_VARIABLE = 0x41, TARGET_EXCEPTION_PARAMETER = 0x42,
      TARGET_INSTANCEOF = 0x43, TARGET_NEW = 0x44, TARGET_CONSTRUCTOR_REFERENCE = 0x45, TARGET_METHOD_REFERENCE = 0x46,
      TARGET_CAST = 0x47, TARGET_CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT = 0x48, TARGET_METHOD_INVOCATION_TYPE_ARGUMENT = 0x49,
      TARGET_CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT = 0x4a, TARGET_METHOD_REFERENCE_TYPE_ARGUMENT = 0x4b;
    TargetType targetType();
    default int size() { return targetType().sizeIfFixed(); }
    static TypeParameterTarget ofTypeParameter(TargetType type, int index) { return DoppioTypeAnnotations.parameter(type, index); }
    static TypeParameterTarget ofClassTypeParameter(int index) { return ofTypeParameter(TargetType.CLASS_TYPE_PARAMETER, index); }
    static TypeParameterTarget ofMethodTypeParameter(int index) { return ofTypeParameter(TargetType.METHOD_TYPE_PARAMETER, index); }
    static SupertypeTarget ofClassExtends(int index) { return DoppioTypeAnnotations.supertype(index); }
    static TypeParameterBoundTarget ofTypeParameterBound(TargetType type, int index, int bound) { return DoppioTypeAnnotations.bound(type, index, bound); }
    static TypeParameterBoundTarget ofClassTypeParameterBound(int index, int bound) { return ofTypeParameterBound(TargetType.CLASS_TYPE_PARAMETER_BOUND, index, bound); }
    static TypeParameterBoundTarget ofMethodTypeParameterBound(int index, int bound) { return ofTypeParameterBound(TargetType.METHOD_TYPE_PARAMETER_BOUND, index, bound); }
    static EmptyTarget of(TargetType type) { return DoppioTypeAnnotations.empty(type); }
    static EmptyTarget ofField() { return of(TargetType.FIELD); }
    static EmptyTarget ofMethodReturn() { return of(TargetType.METHOD_RETURN); }
    static EmptyTarget ofMethodReceiver() { return of(TargetType.METHOD_RECEIVER); }
    static FormalParameterTarget ofMethodFormalParameter(int index) { return DoppioTypeAnnotations.formal(index); }
    static ThrowsTarget ofThrows(int index) { return DoppioTypeAnnotations.throwsTarget(index); }
    static LocalVarTarget ofVariable(TargetType type, List<LocalVarTargetInfo> table) { return DoppioTypeAnnotations.variable(type, table); }
    static LocalVarTarget ofLocalVariable(List<LocalVarTargetInfo> table) { return ofVariable(TargetType.LOCAL_VARIABLE, table); }
    static LocalVarTarget ofResourceVariable(List<LocalVarTargetInfo> table) { return ofVariable(TargetType.RESOURCE_VARIABLE, table); }
    static CatchTarget ofExceptionParameter(int index) { return DoppioTypeAnnotations.catching(index); }
    static OffsetTarget ofOffset(TargetType type, Label target) { return DoppioTypeAnnotations.offset(type, target); }
    static OffsetTarget ofInstanceofExpr(Label target) { return ofOffset(TargetType.INSTANCEOF, target); }
    static OffsetTarget ofNewExpr(Label target) { return ofOffset(TargetType.NEW, target); }
    static OffsetTarget ofConstructorReference(Label target) { return ofOffset(TargetType.CONSTRUCTOR_REFERENCE, target); }
    static OffsetTarget ofMethodReference(Label target) { return ofOffset(TargetType.METHOD_REFERENCE, target); }
    static TypeArgumentTarget ofTypeArgument(TargetType type, Label target, int index) { return DoppioTypeAnnotations.argument(type, target, index); }
    static TypeArgumentTarget ofCastExpr(Label target, int index) { return ofTypeArgument(TargetType.CAST, target, index); }
    static TypeArgumentTarget ofConstructorInvocationTypeArgument(Label target, int index) { return ofTypeArgument(TargetType.CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT, target, index); }
    static TypeArgumentTarget ofMethodInvocationTypeArgument(Label target, int index) { return ofTypeArgument(TargetType.METHOD_INVOCATION_TYPE_ARGUMENT, target, index); }
    static TypeArgumentTarget ofConstructorReferenceTypeArgument(Label target, int index) { return ofTypeArgument(TargetType.CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT, target, index); }
    static TypeArgumentTarget ofMethodReferenceTypeArgument(Label target, int index) { return ofTypeArgument(TargetType.METHOD_REFERENCE_TYPE_ARGUMENT, target, index); }
  }
  interface TypeParameterTarget extends TargetInfo { int typeParameterIndex(); }
  interface SupertypeTarget extends TargetInfo { int supertypeIndex(); }
  interface TypeParameterBoundTarget extends TargetInfo { int typeParameterIndex(); int boundIndex(); }
  interface EmptyTarget extends TargetInfo { }
  interface FormalParameterTarget extends TargetInfo { int formalParameterIndex(); }
  interface ThrowsTarget extends TargetInfo { int throwsTargetIndex(); }
  interface LocalVarTarget extends TargetInfo { List<LocalVarTargetInfo> table(); }
  interface LocalVarTargetInfo {
    Label startLabel();
    Label endLabel();
    int index();
    static LocalVarTargetInfo of(Label start, Label end, int index) { return DoppioTypeAnnotations.local(start, end, index); }
  }
  interface CatchTarget extends TargetInfo { int exceptionTableIndex(); }
  interface OffsetTarget extends TargetInfo { Label target(); }
  interface TypeArgumentTarget extends TargetInfo { Label target(); int typeArgumentIndex(); }

  interface TypePathComponent {
    enum Kind {
      ARRAY(0), INNER_TYPE(1), WILDCARD(2), TYPE_ARGUMENT(3);
      private final int tag;
      private Kind(int tag) { this.tag = tag; }
      public int tag() { return tag; }
    }
    TypePathComponent ARRAY = DoppioTypeAnnotations.pathValue(Kind.ARRAY, 0);
    TypePathComponent INNER_TYPE = DoppioTypeAnnotations.pathValue(Kind.INNER_TYPE, 0);
    TypePathComponent WILDCARD = DoppioTypeAnnotations.pathValue(Kind.WILDCARD, 0);
    Kind typePathKind();
    int typeArgumentIndex();
    static TypePathComponent of(Kind kind, int index) {
      switch (kind) {
        case ARRAY: return ARRAY;
        case INNER_TYPE: return INNER_TYPE;
        case WILDCARD: return WILDCARD;
        default: return DoppioTypeAnnotations.pathValue(kind, index);
      }
    }
  }
}
