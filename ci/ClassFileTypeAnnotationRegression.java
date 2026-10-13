package classes.modern_test;

import java.lang.classfile.Annotation;
import java.lang.classfile.AnnotationElement;
import java.lang.classfile.Attributes;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.Label;
import java.lang.classfile.TypeAnnotation;
import java.lang.classfile.TypeAnnotation.*;
import java.lang.classfile.attribute.RuntimeInvisibleTypeAnnotationsAttribute;
import java.lang.classfile.attribute.RuntimeVisibleTypeAnnotationsAttribute;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import static java.lang.classfile.TypeAnnotation.TargetInfo.*;

/** Genuine labels, native22 target families and exact unchecked numeric factory behavior. */
public final class ClassFileTypeAnnotationRegression {
  private static int checks;
  private static final Label[] labels = new Label[2];
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    checks++;
  }
  private static void expect(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); }
    catch (Throwable error) {
      check(type.isInstance(error), "Expected " + type.getName() + ", got " + error.getClass().getName());
      return;
    }
    throw new AssertionError("Expected " + type.getName());
  }
  private static Annotation annotation() { return Annotation.of(ClassDesc.of("missing.TypeAnnotation"), AnnotationElement.ofInt("value", 7)); }
  private static void createLabels() {
    byte[] bytes = ClassFile.of().build(ClassDesc.of("classes.modern_test.TypeAnnotationLabelSource"), builder ->
      builder.withMethodBody("labels", MethodTypeDesc.of(ConstantDescs.CD_void), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, code -> {
        labels[0] = code.startLabel(); labels[1] = code.endLabel(); code.return_();
      }));
    check(ClassFile.of().verify(bytes).isEmpty() && labels[0] != null && labels[1] != null && labels[0] != labels[1], "Genuine ClassFile code builder creates the target labels");
  }
  private static List<TargetInfo> named() {
    List<LocalVarTargetInfo> table = Collections.singletonList(LocalVarTargetInfo.of(labels[0], labels[1], 2));
    return Arrays.asList(ofClassTypeParameter(3), ofMethodTypeParameter(3), ofClassExtends(65535),
      ofClassTypeParameterBound(3,4), ofMethodTypeParameterBound(3,4), ofField(), ofMethodReturn(), ofMethodReceiver(),
      ofMethodFormalParameter(3), ofThrows(4), ofLocalVariable(table), ofResourceVariable(table), ofExceptionParameter(5),
      ofInstanceofExpr(labels[0]), ofNewExpr(labels[0]), ofConstructorReference(labels[0]), ofMethodReference(labels[0]),
      ofCastExpr(labels[0],6), ofConstructorInvocationTypeArgument(labels[0],6), ofMethodInvocationTypeArgument(labels[0],6),
      ofConstructorReferenceTypeArgument(labels[0],6), ofMethodReferenceTypeArgument(labels[0],6));
  }
  private static void targets() {
    int[] tags = {0,1,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x40,0x41,0x42,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4a,0x4b};
    int[] sizes = {1,1,2,2,2,0,0,0,1,2,-1,-1,2,2,2,2,2,3,3,3,3,3};
    TargetType[] types = TargetType.values(); List<TargetInfo> values = named(), copies = named();
    check(types.length == 22 && values.size() == 22, "Complete target-kind inventory");
    for (int index = 0; index < types.length; index++) {
      check(types[index].targetTypeValue() == tags[index] && types[index].sizeIfFixed() == sizes[index], "Exact native target numeric tag and fixed-size inventory");
      check(values.get(index).targetType() == types[index] && values.get(index).size() == (sizes[index] < 0 ? 8 : sizes[index]), "Every named factory has exact target kind/size");
      check(values.get(index) != copies.get(index) && values.get(index).equals(copies.get(index)) && values.get(index).hashCode() == copies.get(index).hashCode(), "Native target models have structural value equality, not factory interned identity");
      check(values.get(index).equals(values.get(index)) && !values.get(index).equals(null) && !values.get(index).equals(new Object()), "Target identity/unrelated equality");
    }
    check(((TypeParameterTarget) values.get(0)).typeParameterIndex() == 3 && ((TypeParameterTarget) values.get(1)).typeParameterIndex() == 3, "Typed parameter target getters");
    check(((SupertypeTarget) values.get(2)).supertypeIndex() == 65535, "Supertype superclass sentinel preserved");
    check(((TypeParameterBoundTarget) values.get(3)).typeParameterIndex() == 3 && ((TypeParameterBoundTarget) values.get(3)).boundIndex() == 4, "Bound target carries both real indexes");
    check(((FormalParameterTarget) values.get(8)).formalParameterIndex() == 3 && ((ThrowsTarget) values.get(9)).throwsTargetIndex() == 4 &&
      ((CatchTarget) values.get(12)).exceptionTableIndex() == 5, "Distinct parameter/throws/catch target getters");
    check(((OffsetTarget) values.get(13)).target() == labels[0] && ((TypeArgumentTarget) values.get(17)).target() == labels[0] &&
      ((TypeArgumentTarget) values.get(17)).typeArgumentIndex() == 6, "Offset and type-argument targets retain genuine labels");
    check(!(values.get(0) instanceof TypeParameterBoundTarget) && !(values.get(2) instanceof FormalParameterTarget) &&
      !(values.get(13) instanceof TypeArgumentTarget), "Private implementations do not collapse incompatible target interfaces");
    for (int raw : new int[] {Integer.MIN_VALUE,-1,0,255,256,65535,65536,Integer.MAX_VALUE}) {
      check(ofClassTypeParameter(raw).typeParameterIndex() == raw && ofMethodTypeParameter(raw).typeParameterIndex() == raw, "Parameter factories do not invent u1 bounds");
      check(ofClassTypeParameterBound(raw, raw).typeParameterIndex() == raw && ofMethodTypeParameterBound(raw, raw).boundIndex() == raw, "Bound factories preserve both signed ints");
      check(ofClassExtends(raw).supertypeIndex() == raw, "Supertype factory preserves signed int");
      check(ofMethodFormalParameter(raw).formalParameterIndex() == raw, "Formal parameter factory does not narrow its input");
      check(ofThrows(raw).throwsTargetIndex() == raw && ofExceptionParameter(raw).exceptionTableIndex() == raw, "Throws/catch factories do not invent u2 bounds");
      check(ofCastExpr(labels[0],raw).typeArgumentIndex() == raw && ofMethodReferenceTypeArgument(labels[0],raw).typeArgumentIndex() == raw, "Type argument factories preserve signed int");
      check(LocalVarTargetInfo.of(labels[0],labels[1],raw).index() == raw, "Local target index factory remains unchecked");
    }
    check(ofClassExtends(-7).hashCode() == -7 && ofThrows(9).hashCode() == 9 && ofExceptionParameter(8).hashCode() == 8, "Single numeric record hash is the exact signed index");
    check(!ofClassTypeParameter(0).equals(ofMethodTypeParameter(0)) && !ofMethodFormalParameter(0).equals(ofThrows(0)), "Equal indices do not collapse native target-kind or record-family equality");
  }
  private static void genericFactories() {
    for (TargetType type : TargetType.values()) {
      int tag = type.targetTypeValue();
      if (tag <= 1) check(ofTypeParameter(type,-1).targetType() == type, "Generic parameter permits both native kinds");
      else expect(IllegalArgumentException.class, () -> ofTypeParameter(type,-1));
      if (tag >= 0x11 && tag <= 0x12) check(ofTypeParameterBound(type,-1,-2).targetType() == type, "Generic bound target native kinds");
      else expect(IllegalArgumentException.class, () -> ofTypeParameterBound(type,-1,-2));
      if (tag >= 0x13 && tag <= 0x15) check(of(type).targetType() == type, "Generic empty target permits exactly three kinds");
      else expect(IllegalArgumentException.class, () -> of(type));
      if (tag >= 0x40 && tag <= 0x41) check(ofVariable(type,Collections.emptyList()).size() == 2, "Generic local target empty-table size");
      else expect(IllegalArgumentException.class, () -> ofVariable(type,null));
      if (tag >= 0x43 && tag <= 0x46) check(ofOffset(type,labels[0]).targetType() == type, "Generic offset target native kinds");
      else expect(IllegalArgumentException.class, () -> ofOffset(type,null));
      if (tag >= 0x47 && tag <= 0x4b) check(ofTypeArgument(type,labels[0],-1).targetType() == type, "Generic argument target native kinds");
      else expect(IllegalArgumentException.class, () -> ofTypeArgument(type,null,-1));
    }
    expect(NullPointerException.class, () -> ofTypeParameter(null,0));
    expect(NullPointerException.class, () -> ofTypeParameterBound(null,0,0));
    expect(NullPointerException.class, () -> of((TargetType) null));
    expect(NullPointerException.class, () -> ofVariable(null,null));
    expect(NullPointerException.class, () -> ofOffset(null,null));
    expect(NullPointerException.class, () -> ofTypeArgument(null,null,0));
    expect(NullPointerException.class, () -> ofOffset(TargetType.NEW,null));
    expect(NullPointerException.class, () -> ofTypeArgument(TargetType.CAST,null,0));
    expect(NullPointerException.class, () -> ofLocalVariable(null));
    expect(NullPointerException.class, () -> ofResourceVariable(Arrays.asList((LocalVarTargetInfo) null)));
    expect(NullPointerException.class, () -> LocalVarTargetInfo.of(null,labels[1],0));
    expect(NullPointerException.class, () -> LocalVarTargetInfo.of(labels[0],null,0));
  }
  private static void containers() {
    LocalVarTargetInfo info = LocalVarTargetInfo.of(labels[0], labels[1], -1);
    check(info.startLabel() == labels[0] && info.endLabel() == labels[1] && info.index() == -1, "Local range row retains real labels/index");
    check(info.equals(LocalVarTargetInfo.of(labels[0],labels[1],-1)) && !info.equals(LocalVarTargetInfo.of(labels[1],labels[0],-1)), "Local rows have label-sensitive structural equality");
    List<LocalVarTargetInfo> mutable = new ArrayList<LocalVarTargetInfo>(); mutable.add(info); mutable.add(info);
    LocalVarTarget variable = ofLocalVariable(mutable); mutable.clear();
    check(variable.table().size() == 2 && variable.size() == 14 && variable.table().get(0) == info, "Local target snapshots list and retains real row objects");
    expect(UnsupportedOperationException.class, () -> variable.table().clear());
    expect(UnsupportedOperationException.class, () -> ofLocalVariable(Collections.emptyList()).table().clear());
    check(!variable.equals(ofResourceVariable(variable.table())), "Resource/local target kinds remain distinct");
    TypePathComponent.Kind[] kinds = TypePathComponent.Kind.values();
    check(kinds.length == 4, "Complete native type-path kind inventory");
    for (int kind = 0; kind < kinds.length; kind++) {
      check(kinds[kind].tag() == kind, "Exact path kind tag");
      for (int index : new int[] {Integer.MIN_VALUE,-1,0,256,Integer.MAX_VALUE}) {
        TypePathComponent path = TypePathComponent.of(kinds[kind],index);
        check(path.typePathKind() == kinds[kind] && path.typeArgumentIndex() == (kind == 3 ? index : 0), "Nonargument kinds ignore index; argument keeps unchecked signed input");
        if (kind == 3) check(path != TypePathComponent.of(kinds[kind],index) && path.equals(TypePathComponent.of(kinds[kind],index)), "Argument path is a fresh structural record");
        else check(path == (kind == 0 ? TypePathComponent.ARRAY : kind == 1 ? TypePathComponent.INNER_TYPE : TypePathComponent.WILDCARD), "Nonargument path factories return native shared constants");
      }
    }
    expect(NullPointerException.class, () -> TypePathComponent.of(null,0));
    List<TypePathComponent> path = new ArrayList<TypePathComponent>(); path.add(TypePathComponent.ARRAY); path.add(TypePathComponent.of(TypePathComponent.Kind.TYPE_ARGUMENT,1));
    Annotation annotation = annotation(); TypeAnnotation value = TypeAnnotation.of(ofField(),path,annotation); path.clear();
    check(value.targetInfo().targetType() == TargetType.FIELD && value.targetPath().size() == 2 && value.annotation() == annotation, "Type annotation snapshots path and retains typed target/annotation");
    expect(UnsupportedOperationException.class, () -> value.targetPath().clear());
    expect(UnsupportedOperationException.class, () -> TypeAnnotation.of(ofField(),Collections.emptyList(),annotation).targetPath().clear());
    TypeAnnotation copy = TypeAnnotation.of(ofField(),value.targetPath(),annotation());
    check(value.equals(copy) && value.hashCode() == copy.hashCode(), "Type annotations have full target/path/annotation structural equality");
    check(!value.equals(TypeAnnotation.of(ofMethodReturn(),value.targetPath(),annotation)) && !value.equals(TypeAnnotation.of(ofField(),Collections.emptyList(),annotation)), "Changing target/path changes placement equality");
    List<TypePathComponent> longPath = new ArrayList<TypePathComponent>(); for (int count = 0; count < 257; count++) longPath.add(TypePathComponent.ARRAY);
    check(TypeAnnotation.of(ofField(),longPath,annotation).targetPath().size() == 257, "Model factory does not invent serialized path-count bounds");
    expect(NullPointerException.class, () -> TypeAnnotation.of(null,Collections.emptyList(),annotation));
    expect(NullPointerException.class, () -> TypeAnnotation.of(ofField(),null,annotation));
    expect(NullPointerException.class, () -> TypeAnnotation.of(ofField(),Arrays.asList((TypePathComponent) null),annotation));
    expect(NullPointerException.class, () -> TypeAnnotation.of(ofField(),Collections.emptyList(),null));
  }
  private static void encoded() {
    Annotation annotation = annotation(); ClassFile api = ClassFile.of();
    TypeAnnotation superclass = TypeAnnotation.of(ofClassExtends(65535),Collections.emptyList(),annotation);
    TypeAnnotation field = TypeAnnotation.of(ofField(),Collections.singletonList(TypePathComponent.ARRAY),annotation);
    TypeAnnotation method = TypeAnnotation.of(ofMethodReturn(),Collections.emptyList(),annotation);
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.TypeAnnotationOutput"), builder -> {
      builder.with(RuntimeVisibleTypeAnnotationsAttribute.of(superclass));
      builder.withField("field",ConstantDescs.CD_String.arrayType(), f -> f.withFlags(ClassFile.ACC_PUBLIC).with(RuntimeInvisibleTypeAnnotationsAttribute.of(field)));
      builder.withMethod("method",MethodTypeDesc.of(ConstantDescs.CD_String),ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        m -> m.with(RuntimeVisibleTypeAnnotationsAttribute.of(method)).withCode(c -> c.ldc("value").areturn()));
    });
    check(api.verify(bytes).isEmpty(), "Actual typed class/field/method type annotations verify");
    ClassModel model = api.parse(bytes);
    TypeAnnotation bound = model.findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations().get(0);
    check(bound.equals(superclass) && ((SupertypeTarget) bound.targetInfo()).supertypeIndex() == 65535, "Bound class target model retains exact superclass sentinel");
    check(bound.annotation().className().index() > 0 && bound.annotation().className().constantPool() == model.constantPool(), "Bound type annotation suffix has real indexed ownership");
    check(model.fields().get(0).findAttribute(Attributes.runtimeInvisibleTypeAnnotations()).get().annotations().get(0).equals(field), "Bound invisible field type/path/annotation graph");
    check(model.methods().get(0).findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations().get(0).equals(method), "Bound visible method return model");
    byte[] rebuilt = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model,ClassTransform.ACCEPT_ALL);
    ClassModel imported = api.parse(rebuilt);
    check(api.verify(rebuilt).isEmpty() && imported.findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations().get(0).equals(superclass), "Fresh-pool class annotation target/path suffix semantic imports");
    check(imported.fields().get(0).findAttribute(Attributes.runtimeInvisibleTypeAnnotations()).get().annotations().get(0).equals(field) &&
      imported.methods().get(0).findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations().get(0).equals(method), "Fresh-pool field/method typed imports");
  }
  public static void main(String[] arguments) {
    createLabels(); targets(); genericFactories(); containers(); encoded();
    System.out.println("CLASSFILE_TYPE_ANNOTATION_REGRESSION_OK|" + checks);
  }
}
