package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.classfile.TypeAnnotation.*;
import java.lang.constant.*;
import java.util.*;

import static java.lang.classfile.TypeAnnotation.TargetInfo.*;
import static java.lang.classfile.TypeAnnotation.TargetType.*;

/** Bounded target/path/label metadata checks, not a definition or general JVMS-validity verdict. */
public class ClassFileTypeAnnotationAttributeRegression {
  private static int passed;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    passed++;
  }
  private static void expect(Class<? extends Throwable> type, Runnable operation, String message) {
    Throwable failure = null;
    try { operation.run(); } catch (Throwable caught) { failure = caught; }
    check(failure != null && type.isInstance(failure), message);
  }
  private static Annotation suffix() {
    return Annotation.of(ClassDesc.of("metadata.TypeMark"), AnnotationElement.ofString("name", "mark"),
        AnnotationElement.ofArray("values", AnnotationValue.ofInt(6), AnnotationValue.ofAnnotation(
            Annotation.of(ClassDesc.of("metadata.Nested"), AnnotationElement.of("enumValue", AnnotationValue.ofEnum(ClassDesc.of("metadata.Color"), "GREEN"))))));
  }
  private static TypeAnnotation annotation(TargetInfo target) {
    return TypeAnnotation.of(target, Arrays.asList(TypePathComponent.ARRAY, TypePathComponent.INNER_TYPE,
        TypePathComponent.WILDCARD, TypePathComponent.of(TypePathComponent.Kind.TYPE_ARGUMENT, 265)), suffix());
  }
  private static List<TypeAnnotation> annotations(TargetInfo... targets) {
    List<TypeAnnotation> result = new ArrayList<TypeAnnotation>();
    for (TargetInfo target : targets) result.add(annotation(target));
    return result;
  }
  private static void factories() {
    TypeAnnotation annotation = annotation(ofField());
    check(RuntimeVisibleTypeAnnotationsAttribute.of(annotation).annotations().get(0) == annotation, "Visible varargs preserves supplied type annotation");
    check(RuntimeInvisibleTypeAnnotationsAttribute.of(annotation).annotations().get(0) == annotation, "Invisible varargs preserves supplied type annotation");
    List<TypeAnnotation> list = new ArrayList<TypeAnnotation>(); list.add(annotation);
    RuntimeVisibleTypeAnnotationsAttribute visible = RuntimeVisibleTypeAnnotationsAttribute.of(list);
    RuntimeInvisibleTypeAnnotationsAttribute invisible = RuntimeInvisibleTypeAnnotationsAttribute.of(list); list.clear();
    check(visible.annotations().size() == 1 && invisible.annotations().size() == 1, "Both typed factories copy caller lists");
    expect(UnsupportedOperationException.class, () -> visible.annotations().clear(), "Type annotation list is immutable");
    expect(NullPointerException.class, () -> RuntimeVisibleTypeAnnotationsAttribute.of((List<TypeAnnotation>) null), "Visible rejects null list");
    expect(NullPointerException.class, () -> RuntimeInvisibleTypeAnnotationsAttribute.of(Arrays.asList((TypeAnnotation) null)), "Invisible rejects null annotation");
    check(visible instanceof ClassElement && visible instanceof MethodElement && visible instanceof FieldElement && visible instanceof CodeElement,
        "Type attribute has all four actual element locations");
    check(!visible.attributeMapper().allowMultiple() && !invisible.attributeMapper().allowMultiple() &&
        visible.attributeMapper().stability() == AttributeMapper.AttributeStability.UNSTABLE &&
        invisible.attributeMapper().stability() == AttributeMapper.AttributeStability.UNSTABLE, "Both mapper policies are native single UNSTABLE attributes");
  }
  private static byte[] fixture(ClassFile context, Label[] owned) {
    List<TypeAnnotation> classTypes = annotations(ofClassTypeParameter(257), ofClassExtends(65535), ofClassTypeParameterBound(2, 3));
    List<TypeAnnotation> fieldTypes = annotations(ofField());
    List<TypeAnnotation> methodTypes = annotations(ofMethodTypeParameter(4), ofMethodTypeParameterBound(5, 6), ofMethodReturn(),
        ofMethodReceiver(), ofMethodFormalParameter(0), ofThrows(7));
    RecordComponentInfo component = RecordComponentInfo.of("component", ConstantDescs.CD_Object,
        RuntimeVisibleTypeAnnotationsAttribute.of(fieldTypes), RuntimeInvisibleTypeAnnotationsAttribute.of(fieldTypes));
    return context.build(ClassDesc.of("C7dTypeAnnotationMetadataTarget"), cls -> cls
        .with(RuntimeVisibleTypeAnnotationsAttribute.of(classTypes)).with(RuntimeInvisibleTypeAnnotationsAttribute.of(classTypes))
        .with(RecordAttribute.of(component))
        .withField("field", ConstantDescs.CD_Object, field -> field.with(RuntimeVisibleTypeAnnotationsAttribute.of(fieldTypes))
            .with(RuntimeInvisibleTypeAnnotationsAttribute.of(fieldTypes)))
        .withMethod("run", MethodTypeDesc.ofDescriptor("(Ljava/lang/Object;)Ljava/lang/Object;"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
            method -> method.with(RuntimeVisibleTypeAnnotationsAttribute.of(methodTypes))
                .with(RuntimeInvisibleTypeAnnotationsAttribute.of(methodTypes)).withCode(code -> {
                  Label start = code.newLabel(), duplicate = code.newLabel(), invocation = code.newLabel();
                  Label protectedEnd = code.newLabel(), instance = code.newLabel(), cast = code.newLabel();
                  Label castEnd = code.newLabel(), handler = code.newLabel(), end = code.newLabel();
                  if (owned != null) owned[0] = start;
                  List<TypeAnnotation> codeTypes = annotations(
                      ofLocalVariable(Arrays.asList(LocalVarTargetInfo.of(start, end, 65536))),
                      ofResourceVariable(Arrays.asList(LocalVarTargetInfo.of(duplicate, castEnd, 1))),
                      ofExceptionParameter(65536), ofInstanceofExpr(instance), ofNewExpr(start),
                      ofConstructorReference(start), ofMethodReference(instance), ofCastExpr(cast, 0),
                      ofConstructorInvocationTypeArgument(invocation, 1), ofMethodInvocationTypeArgument(invocation, 258),
                      ofConstructorReferenceTypeArgument(start, 3), ofMethodReferenceTypeArgument(instance, 4));
                  code.with(RuntimeVisibleTypeAnnotationsAttribute.of(codeTypes)).with(RuntimeInvisibleTypeAnnotationsAttribute.of(codeTypes))
                      .exceptionCatch(start, protectedEnd, handler, ClassDesc.of("java.lang.RuntimeException"))
                      .labelBinding(start).new_(ConstantDescs.CD_Object).labelBinding(duplicate).dup().labelBinding(invocation)
                      .invokespecial(ConstantDescs.CD_Object, "<init>", MethodTypeDesc.ofDescriptor("()V"))
                      .labelBinding(protectedEnd).astore(0).aload(0).labelBinding(instance).instanceOf(ConstantDescs.CD_Object)
                      .pop().aload(0).labelBinding(cast).checkcast(ConstantDescs.CD_Object).labelBinding(castEnd).areturn()
                      .labelBinding(handler).astore(1).aconst_null().areturn().labelBinding(end);
                })));
  }
  private static boolean owned(Annotation annotation, ConstantPool pool) {
    if (annotation.className().constantPool() != pool) return false;
    for (AnnotationElement element : annotation.elements()) if (element.name().constantPool() != pool || !owned(element.value(), pool)) return false;
    return true;
  }
  private static boolean owned(AnnotationValue value, ConstantPool pool) {
    if (value instanceof AnnotationValue.OfConstant) return ((AnnotationValue.OfConstant) value).constant().constantPool() == pool;
    if (value instanceof AnnotationValue.OfEnum) return ((AnnotationValue.OfEnum) value).className().constantPool() == pool &&
        ((AnnotationValue.OfEnum) value).constantName().constantPool() == pool;
    if (value instanceof AnnotationValue.OfClass) return ((AnnotationValue.OfClass) value).className().constantPool() == pool;
    if (value instanceof AnnotationValue.OfAnnotation) return owned(((AnnotationValue.OfAnnotation) value).annotation(), pool);
    if (value instanceof AnnotationValue.OfArray) {
      for (AnnotationValue entry : ((AnnotationValue.OfArray) value).values()) if (!owned(entry, pool)) return false;
      return true;
    }
    return false;
  }
  private static String shape(TargetInfo target, CodeAttribute code) {
    if (target instanceof TypeParameterTarget) return "p:" + ((TypeParameterTarget) target).typeParameterIndex();
    if (target instanceof SupertypeTarget) return "s:" + ((SupertypeTarget) target).supertypeIndex();
    if (target instanceof TypeParameterBoundTarget) {
      TypeParameterBoundTarget value = (TypeParameterBoundTarget) target;
      return "b:" + value.typeParameterIndex() + ":" + value.boundIndex();
    }
    if (target instanceof EmptyTarget) return "empty";
    if (target instanceof FormalParameterTarget) return "f:" + ((FormalParameterTarget) target).formalParameterIndex();
    if (target instanceof ThrowsTarget) return "t:" + ((ThrowsTarget) target).throwsTargetIndex();
    if (target instanceof CatchTarget) return "c:" + ((CatchTarget) target).exceptionTableIndex();
    if (target instanceof OffsetTarget) return "o:" + code.labelToBci(((OffsetTarget) target).target());
    if (target instanceof TypeArgumentTarget) {
      TypeArgumentTarget value = (TypeArgumentTarget) target;
      return "a:" + code.labelToBci(value.target()) + ":" + value.typeArgumentIndex();
    }
    LocalVarTargetInfo value = ((LocalVarTarget) target).table().get(0);
    return "l:" + code.labelToBci(value.startLabel()) + ":" + code.labelToBci(value.endLabel()) + ":" + value.index();
  }
  private static boolean path(TypeAnnotation annotation) {
    List<TypePathComponent> path = annotation.targetPath();
    return path.size() == 4 && path.get(0).typePathKind() == TypePathComponent.Kind.ARRAY &&
        path.get(1).typePathKind() == TypePathComponent.Kind.INNER_TYPE &&
        path.get(2).typePathKind() == TypePathComponent.Kind.WILDCARD &&
        path.get(3).typePathKind() == TypePathComponent.Kind.TYPE_ARGUMENT && path.get(3).typeArgumentIndex() == 9 &&
        path.get(0).typeArgumentIndex() == 0 && path.get(1).typeArgumentIndex() == 0 && path.get(2).typeArgumentIndex() == 0;
  }
  private static void validate(AttributedElement owner, ConstantPool pool, CodeAttribute code, TargetType[] kinds, String[] shapes) {
    List<List<TypeAnnotation>> lists = Arrays.asList(owner.findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations(),
        owner.findAttribute(Attributes.runtimeInvisibleTypeAnnotations()).get().annotations());
    for (List<TypeAnnotation> list : lists) {
      check(list.size() == kinds.length, "Each typed visibility table preserves target count");
      boolean pathsAndReferences = true;
      for (int index = 0; index < kinds.length; index++) {
        TypeAnnotation value = list.get(index);
        check(value.targetInfo().targetType() == kinds[index] && shape(value.targetInfo(), code).equals(shapes[index]), "Native target payload for " + kinds[index]);
        pathsAndReferences &= path(value) && owned(value.annotation(), pool);
      }
      check(pathsAndReferences, "All four paths and recursive annotation suffix references retain destination ownership");
    }
  }
  private static void metadata(ClassModel model, int shift) {
    ConstantPool pool = model.constantPool(); FieldModel field = model.fields().get(0); MethodModel method = model.methods().get(0);
    CodeAttribute code = (CodeAttribute) method.code().get();
    validate(model, pool, null, new TargetType[] {CLASS_TYPE_PARAMETER, CLASS_EXTENDS, CLASS_TYPE_PARAMETER_BOUND}, new String[] {"p:1", "s:65535", "b:2:3"});
    validate(field, pool, null, new TargetType[] {FIELD}, new String[] {"empty"});
    validate(method, pool, null, new TargetType[] {METHOD_TYPE_PARAMETER, METHOD_TYPE_PARAMETER_BOUND, METHOD_RETURN, METHOD_RECEIVER, METHOD_FORMAL_PARAMETER, THROWS},
        new String[] {"p:4", "b:5:6", "empty", "empty", "f:0", "t:7"});
    validate(model.findAttribute(Attributes.record()).get().components().get(0), pool, null, new TargetType[] {FIELD}, new String[] {"empty"});
    validate(code, pool, code, new TargetType[] {LOCAL_VARIABLE, RESOURCE_VARIABLE, EXCEPTION_PARAMETER, INSTANCEOF, NEW, CONSTRUCTOR_REFERENCE,
        METHOD_REFERENCE, CAST, CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT, METHOD_INVOCATION_TYPE_ARGUMENT, CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT, METHOD_REFERENCE_TYPE_ARGUMENT},
        new String[] {"l:" + shift + ":" + (21 + shift) + ":0", "l:" + (3 + shift) + ":" + (17 + shift) + ":1", "c:0",
            "o:" + (9 + shift), "o:" + shift, "o:" + shift, "o:" + (9 + shift), "a:" + (14 + shift) + ":0",
            "a:" + (4 + shift) + ":1", "a:" + (4 + shift) + ":2", "a:" + shift + ":3", "a:" + (9 + shift) + ":4"});
    check(code.codeLength() == 21 + shift && code.exceptionHandlers().size() == 1, "Metadata fixture keeps actual instruction and exception-table layout");
  }
  private static int typeAttributeCount(AttributedElement owner) {
    return owner.findAttributes(Attributes.runtimeVisibleTypeAnnotations()).size() + owner.findAttributes(Attributes.runtimeInvisibleTypeAnnotations()).size();
  }
  private static int delivered(CodeModel code) {
    int[] count = {0}; code.forEach(element -> {
      if (element instanceof RuntimeVisibleTypeAnnotationsAttribute || element instanceof RuntimeInvisibleTypeAnnotationsAttribute) count[0]++;
    }); return count[0];
  }
  private static int labels(CodeModel code) {
    int[] count = {0}; code.forEach(element -> { if (element instanceof LabelTarget) count[0]++; }); return count[0];
  }
  private static void options(ClassModel model, byte[] bytes) {
    CodeModel original = model.methods().get(0).code().get();
    ClassFile dropDebug = ClassFile.of(ClassFile.DebugElementsOption.DROP_DEBUG);
    CodeModel dropped = dropDebug.parse(bytes).methods().get(0).code().get();
    check(delivered(original) == 2 && delivered(dropped) == 0, "DROP_DEBUG suppresses type attribute delivery only");
    check(typeAttributeCount(dropped) == 2, "DROP_DEBUG retains both raw typed Code attributes");
    check(labels(original) == 9 && labels(dropped) == labels(original), "Type target/scope labels are inflated unconditionally under DROP_DEBUG");
    check(typeAttributeCount(dropDebug.parse(fixture(dropDebug, null)).methods().get(0).code().get()) == 2,
        "DROP_DEBUG does not remove explicitly supplied type attributes from output");
    ClassFile dropBound = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL, ClassFile.AttributesProcessingOption.DROP_UNSTABLE_ATTRIBUTES);
    ClassModel copy = dropBound.parse(dropBound.transformClass(model, ClassTransform.transformingMethodBodies(CodeTransform.ACCEPT_ALL)));
    check(typeAttributeCount(copy) == 0 && typeAttributeCount(copy.fields().get(0)) == 0 &&
        typeAttributeCount(copy.methods().get(0)) == 0 && typeAttributeCount(copy.methods().get(0).code().get()) == 0,
        "DROP_UNSTABLE removes original bound class/field/method/Code type attributes");
    check(typeAttributeCount(copy.findAttribute(Attributes.record()).get().components().get(0)) == 2,
        "Record mapper serializes its explicit nested component attribute list without inventing nested pruning");
    ClassModel explicit = dropBound.parse(fixture(dropBound, null));
    check(typeAttributeCount(explicit) == 2 && typeAttributeCount(explicit.fields().get(0)) == 2 &&
        typeAttributeCount(explicit.methods().get(0)) == 2 && typeAttributeCount(explicit.methods().get(0).code().get()) == 2,
        "DROP_UNSTABLE preserves explicitly supplied unbound type attributes at every builder location");
  }
  private static List<TypeAnnotation> incrementCatch(List<TypeAnnotation> annotations) {
    List<TypeAnnotation> result = new ArrayList<TypeAnnotation>();
    for (TypeAnnotation annotation : annotations) {
      TargetInfo target = annotation.targetInfo();
      if (target instanceof CatchTarget) target = ofExceptionParameter(((CatchTarget) target).exceptionTableIndex() + 1);
      result.add(TypeAnnotation.of(target, annotation.targetPath(), annotation.annotation()));
    } return result;
  }
  private static void catchIndex(ClassModel model) {
    ClassFile context = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    byte[] moved = context.transformClass(model, ClassTransform.transformingMethodBodies(CodeTransform.ofStateful(() -> new CodeTransform() {
      Label extraHandler;
      public void atStart(CodeBuilder code) {
        Label start = code.newLabel(), end = code.newLabel(); extraHandler = code.newLabel();
        code.labelBinding(start).nop().labelBinding(end).exceptionCatchAll(start, end, extraHandler);
      }
      public void accept(CodeBuilder code, CodeElement element) {
        if (element instanceof RuntimeVisibleTypeAnnotationsAttribute)
          code.with(RuntimeVisibleTypeAnnotationsAttribute.of(incrementCatch(((RuntimeVisibleTypeAnnotationsAttribute) element).annotations())));
        else if (element instanceof RuntimeInvisibleTypeAnnotationsAttribute)
          code.with(RuntimeInvisibleTypeAnnotationsAttribute.of(incrementCatch(((RuntimeInvisibleTypeAnnotationsAttribute) element).annotations())));
        else code.with(element);
      }
      public void atEnd(CodeBuilder code) { code.labelBinding(extraHandler).pop().aconst_null().areturn(); }
    })));
    CodeAttribute code = (CodeAttribute) context.parse(moved).methods().get(0).code().get(); boolean indices = true;
    for (TypeAnnotation annotation : code.findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations())
      if (annotation.targetInfo() instanceof CatchTarget) indices &= ((CatchTarget) annotation.targetInfo()).exceptionTableIndex() == 1;
    for (TypeAnnotation annotation : code.findAttribute(Attributes.runtimeInvisibleTypeAnnotations()).get().annotations())
      if (annotation.targetInfo() instanceof CatchTarget) indices &= ((CatchTarget) annotation.targetInfo()).exceptionTableIndex() == 1;
    check(indices && code.exceptionHandlers().size() == 2, "Caller-written catch0->1 index is preserved, never automatically rewritten again");
  }
  private static void rawOffset(byte[] bytes, int offset, String message) {
    // This deliberately invalid target is a raw writer contract, not a parsed
    // model or JVM verdict. The tiny generated class has one Code type table,
    // its ten-byte payload followed by the empty class-attribute count.
    int tail = bytes.length - 12;
    check(tail > 0 && bytes[tail] == 0 && bytes[tail + 1] == 1 && bytes[tail + 2] == 0x44 &&
        (bytes[tail + 3] & 255) == (offset >>> 8) && (bytes[tail + 4] & 255) == (offset & 255) &&
        bytes[tail + 5] == 0 && bytes[tail + 8] == 0 && bytes[tail + 9] == 0 &&
        bytes[tail + 10] == 0 && bytes[tail + 11] == 0, message);
  }
  private static RuntimeVisibleTypeAnnotationsAttribute minimal(Label label) {
    return RuntimeVisibleTypeAnnotationsAttribute.of(TypeAnnotation.of(ofNewExpr(label), Collections.<TypePathComponent>emptyList(),
        Annotation.of(ClassDesc.of("metadata.Mark"), Collections.<AnnotationElement>emptyList())));
  }
  private static void unbound(ClassFile context) {
    unbound(context, null);
  }
  private static void unbound(ClassFile context, Label supplied) {
    byte[] bytes = context.build(ClassDesc.of("C7dUnboundTypeMetadata"), cls -> cls.withMethodBody("value",
        MethodTypeDesc.ofDescriptor("()Ljava/lang/Object;"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, code -> code
            .with(minimal(supplied == null ? code.newLabel() : supplied)).aconst_null().areturn()));
    rawOffset(bytes, 65535, "Missing own or foreign parsed type-target label writes native lower16bits65535");
  }
  private static void omitted() {
    ClassFile shared = ClassFile.of();
    ClassModel model = shared.parse(shared.build(ClassDesc.of("C7dOmittedSourceTypeMetadata"), cls -> cls.withMethodBody("value",
        MethodTypeDesc.ofDescriptor("()Ljava/lang/Object;"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, code -> {
          Label start = code.newLabel();
          code.with(minimal(start)).labelBinding(start).new_(ConstantDescs.CD_Object).dup()
              .invokespecial(ConstantDescs.CD_Object, "<init>", MethodTypeDesc.ofDescriptor("()V")).areturn();
        })));
    ClassTransform omitLabels = ClassTransform.transformingMethodBodies((code, element) -> {
      if (!(element instanceof LabelTarget)) code.with(element);
    });
    rawOffset(shared.transformClass(model, omitLabels), 0, "SHARED retains original bound type-target payload when source label is omitted");
    ClassFile newPool = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    rawOffset(newPool.transformClass(model, omitLabels), 65535, "NEW_POOL semantically writes missing source type-target label as lower16bits65535");
  }
  public static void main(String[] args) {
    factories(); ClassFile context = ClassFile.of(); Label[] owned = new Label[1]; byte[] bytes = fixture(context, owned);
    ClassModel model = context.parse(bytes); metadata(model, 0); options(model, bytes);
    ClassFile newPool = context.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    ClassModel copy = newPool.parse(newPool.transformClass(model, ClassTransform.ACCEPT_ALL));
    check(copy.constantPool() != model.constantPool(), "Typed type annotations import into an independent NEW_POOL");
    metadata(copy, 0);
    ClassModel moved = newPool.parse(newPool.transformClass(model, ClassTransform.transformingMethodBodies(CodeTransform.ofStateful(() -> new CodeTransform() {
      public void atStart(CodeBuilder code) { code.nop(); }
      public void accept(CodeBuilder code, CodeElement element) { code.with(element); }
    }))));
    metadata(moved, 1); catchIndex(model);
    unbound(context); unbound(ClassFile.of(ClassFile.DeadLabelsOption.DROP_DEAD_LABELS)); omitted();
    Label bound = ((OffsetTarget) model.methods().get(0).code().get().findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations().get(4).targetInfo()).target();
    unbound(context, bound);
    expect(IllegalArgumentException.class, () -> context.build(ClassDesc.of("C7dOutsideCodeTypeMetadata"), cls -> cls.with(RuntimeVisibleTypeAnnotationsAttribute.of(annotation(ofNewExpr(bound))))),
        "Code-label targets require a Code writer context");
    expect(IllegalStateException.class, () -> context.build(ClassDesc.of("C7dForeignBuilderTypeMetadata"), cls -> cls.withMethodBody("value",
        MethodTypeDesc.ofDescriptor("()Ljava/lang/Object;"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        code -> code.with(RuntimeVisibleTypeAnnotationsAttribute.of(annotation(ofNewExpr(owned[0])))).aconst_null().areturn())),
        "Owned label from another CodeBuilder is not silently adopted");
    System.out.println("CLASSFILE_TYPE_ANNOTATION_ATTRIBUTE_REGRESSION_OK|" + passed);
  }
}
