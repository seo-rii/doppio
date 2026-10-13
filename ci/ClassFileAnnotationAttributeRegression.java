package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.*;
import java.util.*;

/** Finite annotation metadata/value/pool-import checks; never defines or initializes the emitted class. */
public class ClassFileAnnotationAttributeRegression {
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
  private static Annotation nested() {
    return Annotation.of(ClassDesc.of("annotations.Nested"), AnnotationElement.ofInt("n", 7));
  }
  private static Annotation allValues() {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    return Annotation.of(pool.utf8Entry("Lannotations/All;"),
        AnnotationElement.of("b", AnnotationValue.ofByte(pool.intEntry(511))),
        AnnotationElement.of("c", AnnotationValue.ofChar(pool.intEntry(-1))),
        AnnotationElement.of("d", AnnotationValue.ofDouble(Double.POSITIVE_INFINITY)),
        AnnotationElement.of("f", AnnotationValue.ofFloat(-0.0f)),
        AnnotationElement.of("i", AnnotationValue.ofInt(123456789)),
        AnnotationElement.of("j", AnnotationValue.ofLong(Long.MIN_VALUE)),
        AnnotationElement.of("s", AnnotationValue.ofShort(pool.intEntry(65535))),
        AnnotationElement.of("z", AnnotationValue.ofBoolean(pool.intEntry(2))),
        AnnotationElement.of("text", AnnotationValue.ofString("text-\u0000\u03a9")),
        AnnotationElement.of("e", AnnotationValue.ofEnum(ClassDesc.of("annotations.Color"), "GREEN")),
        AnnotationElement.of("type", AnnotationValue.ofClass(ConstantDescs.CD_String.arrayType().arrayType())),
        AnnotationElement.of("annotation", AnnotationValue.ofAnnotation(nested())),
        AnnotationElement.of("array", AnnotationValue.ofArray(AnnotationValue.ofByte(pool.intEntry(513)),
            AnnotationValue.ofArray(AnnotationValue.ofInt(9)), AnnotationValue.ofAnnotation(nested()))));
  }
  private static boolean owned(Annotation annotation, ConstantPool pool) {
    if (annotation.className().constantPool() != pool) return false;
    for (AnnotationElement element : annotation.elements())
      if (element.name().constantPool() != pool || !owned(element.value(), pool)) return false;
    return true;
  }
  private static boolean owned(AnnotationValue value, ConstantPool pool) {
    if (value instanceof AnnotationValue.OfConstant)
      return ((AnnotationValue.OfConstant) value).constant().constantPool() == pool;
    if (value instanceof AnnotationValue.OfClass)
      return ((AnnotationValue.OfClass) value).className().constantPool() == pool;
    if (value instanceof AnnotationValue.OfEnum) {
      AnnotationValue.OfEnum entry = (AnnotationValue.OfEnum) value;
      return entry.className().constantPool() == pool && entry.constantName().constantPool() == pool;
    }
    if (value instanceof AnnotationValue.OfAnnotation) return owned(((AnnotationValue.OfAnnotation) value).annotation(), pool);
    if (value instanceof AnnotationValue.OfArray) {
      for (AnnotationValue entry : ((AnnotationValue.OfArray) value).values()) if (!owned(entry, pool)) return false;
      return true;
    }
    return false;
  }
  private static void factories() {
    Annotation annotation = nested();
    check(RuntimeVisibleAnnotationsAttribute.of(annotation).annotations().get(0) == annotation,
        "Visible declaration varargs preserves annotation identity");
    check(RuntimeInvisibleAnnotationsAttribute.of(annotation).annotations().get(0) == annotation,
        "Invisible declaration varargs preserves annotation identity");
    List<Annotation> declarations = new ArrayList<Annotation>(); declarations.add(annotation);
    RuntimeVisibleAnnotationsAttribute visible = RuntimeVisibleAnnotationsAttribute.of(declarations);
    RuntimeInvisibleAnnotationsAttribute invisible = RuntimeInvisibleAnnotationsAttribute.of(declarations); declarations.clear();
    check(visible.annotations().size() == 1 && invisible.annotations().size() == 1, "Both declaration factories copy caller list");
    expect(UnsupportedOperationException.class, () -> visible.annotations().clear(), "Declaration list is immutable");
    List<Annotation> middle = new ArrayList<Annotation>(); middle.add(annotation);
    List<List<Annotation>> parameters = new ArrayList<List<Annotation>>();
    parameters.add(Collections.<Annotation>emptyList()); parameters.add(middle); parameters.add(Collections.<Annotation>emptyList());
    RuntimeVisibleParameterAnnotationsAttribute vp = RuntimeVisibleParameterAnnotationsAttribute.of(parameters);
    RuntimeInvisibleParameterAnnotationsAttribute ip = RuntimeInvisibleParameterAnnotationsAttribute.of(parameters);
    middle.clear(); parameters.clear();
    check(vp.parameterAnnotations().size() == 3 && vp.parameterAnnotations().get(0).isEmpty() &&
        vp.parameterAnnotations().get(1).size() == 1 && vp.parameterAnnotations().get(2).isEmpty(), "Visible parameter factory deep-copies positional empties");
    check(ip.parameterAnnotations().size() == 3 && ip.parameterAnnotations().get(1).size() == 1, "Invisible parameter factory deep-copies lists");
    expect(UnsupportedOperationException.class, () -> vp.parameterAnnotations().clear(), "Parameter outer list is immutable");
    expect(UnsupportedOperationException.class, () -> vp.parameterAnnotations().get(1).clear(), "Parameter inner list is immutable");
    AnnotationValue defaultValue = AnnotationValue.ofString("default");
    check(AnnotationDefaultAttribute.of(defaultValue).defaultValue() == defaultValue, "Default factory preserves supplied tagged value");
    check(visible instanceof ClassElement && visible instanceof MethodElement && visible instanceof FieldElement &&
        !(((Object) visible) instanceof CodeElement), "Declaration attribute has exact non-Code element topology");
    check(vp instanceof MethodElement && !(((Object) vp) instanceof ClassElement) &&
        AnnotationDefaultAttribute.of(defaultValue) instanceof MethodElement, "Parameter/default attributes are method elements only");
    List<Attribute<?>> attributes = Arrays.<Attribute<?>>asList(visible, invisible, vp, ip, AnnotationDefaultAttribute.of(defaultValue));
    boolean mapperPolicy = true;
    for (Attribute<?> attribute : attributes) mapperPolicy &= !attribute.attributeMapper().allowMultiple() &&
        attribute.attributeMapper().stability() == AttributeMapper.AttributeStability.CP_REFS;
    check(mapperPolicy, "All five native mapper policies are single CP_REFS attributes");
    expect(NullPointerException.class, () -> RuntimeVisibleAnnotationsAttribute.of((List<Annotation>) null), "Declaration rejects null list");
    expect(NullPointerException.class, () -> RuntimeInvisibleAnnotationsAttribute.of(Arrays.asList((Annotation) null)), "Declaration rejects null element");
    expect(NullPointerException.class, () -> RuntimeVisibleParameterAnnotationsAttribute.of(Arrays.asList((List<Annotation>) null)), "Parameter rejects null inner list");
    expect(NullPointerException.class, () -> RuntimeInvisibleParameterAnnotationsAttribute.of(Arrays.asList(Arrays.asList((Annotation) null))),
        "Parameter rejects null nested annotation");
    expect(NullPointerException.class, () -> AnnotationDefaultAttribute.of(null), "Default requires non-null value");
  }
  private static byte[] fixture(ClassFile context) {
    Annotation all = allValues(), simple = nested();
    RuntimeVisibleAnnotationsAttribute visible = RuntimeVisibleAnnotationsAttribute.of(all);
    RuntimeInvisibleAnnotationsAttribute invisible = RuntimeInvisibleAnnotationsAttribute.of(simple);
    RecordComponentInfo component = RecordComponentInfo.of("component", ConstantDescs.CD_String, visible, invisible);
    List<List<Annotation>> visibleParameters = Arrays.asList(Collections.<Annotation>emptyList(), Arrays.asList(all), Collections.<Annotation>emptyList());
    List<List<Annotation>> invisibleParameters = Arrays.asList(Arrays.asList(simple), Collections.<Annotation>emptyList(), Arrays.asList(simple));
    return context.build(ClassDesc.of("C7dAnnotationMetadataTarget"), builder -> builder
        .with(visible).with(invisible).with(RecordAttribute.of(component))
        .withField("field", ConstantDescs.CD_int, field -> field.with(visible).with(invisible))
        .withMethod("run", MethodTypeDesc.ofDescriptor("(III)I"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
            method -> method.with(visible).with(invisible)
                .with(RuntimeVisibleParameterAnnotationsAttribute.of(visibleParameters))
                .with(RuntimeInvisibleParameterAnnotationsAttribute.of(invisibleParameters))
                .withCode(code -> code.iload(0).ireturn())));
  }
  private static void metadata(ClassModel model) {
    RuntimeVisibleAnnotationsAttribute visible = model.findAttribute(Attributes.runtimeVisibleAnnotations()).get();
    RuntimeInvisibleAnnotationsAttribute invisible = model.findAttribute(Attributes.runtimeInvisibleAnnotations()).get();
    check(visible.annotations().size() == 1 && invisible.annotations().size() == 1, "Both typed declaration attributes are delivered");
    Annotation annotation = visible.annotations().get(0);
    check(annotation.classSymbol().equals(ClassDesc.of("annotations.All")) && annotation.elements().size() == 13,
        "Typed annotation contains all thirteen value tags in declared order");
    List<AnnotationElement> elements = annotation.elements();
    AnnotationValue.OfByte b = (AnnotationValue.OfByte) elements.get(0).value();
    check(b.tag() == AnnotationValue.TAG_BYTE && b.constant().intValue() == 511 && b.byteValue() == -1, "Raw byte constant is preserved before narrowed view");
    AnnotationValue.OfChar c = (AnnotationValue.OfChar) elements.get(1).value();
    check(c.tag() == AnnotationValue.TAG_CHAR && c.constant().intValue() == -1 && c.charValue() == 65535, "Raw char constant is preserved before narrowed view");
    AnnotationValue.OfDouble d = (AnnotationValue.OfDouble) elements.get(2).value();
    check(d.tag() == AnnotationValue.TAG_DOUBLE && d.doubleValue() == Double.POSITIVE_INFINITY, "Double tag and pool value");
    AnnotationValue.OfFloat f = (AnnotationValue.OfFloat) elements.get(3).value();
    check(f.tag() == AnnotationValue.TAG_FLOAT && Float.floatToRawIntBits(f.floatValue()) == Float.floatToRawIntBits(-0.0f), "Float negative-zero tag and bits");
    AnnotationValue.OfInt i = (AnnotationValue.OfInt) elements.get(4).value();
    check(i.tag() == AnnotationValue.TAG_INT && i.intValue() == 123456789, "Int tag and pool value");
    AnnotationValue.OfLong j = (AnnotationValue.OfLong) elements.get(5).value();
    check(j.tag() == AnnotationValue.TAG_LONG && j.longValue() == Long.MIN_VALUE, "Long tag and two-slot pool value");
    AnnotationValue.OfShort s = (AnnotationValue.OfShort) elements.get(6).value();
    check(s.tag() == AnnotationValue.TAG_SHORT && s.constant().intValue() == 65535 && s.shortValue() == -1, "Raw short constant is preserved before narrowed view");
    AnnotationValue.OfBoolean z = (AnnotationValue.OfBoolean) elements.get(7).value();
    check(z.tag() == AnnotationValue.TAG_BOOLEAN && z.constant().intValue() == 2 && z.booleanValue(), "Nonzero raw boolean constant is retained");
    AnnotationValue.OfString text = (AnnotationValue.OfString) elements.get(8).value();
    check(text.tag() == AnnotationValue.TAG_STRING && text.stringValue().equals("text-\u0000\u03a9") && text.constant() instanceof Utf8Entry,
        "String annotation uses actual modified-UTF8 entry, not CONSTANT_String");
    AnnotationValue.OfEnum e = (AnnotationValue.OfEnum) elements.get(9).value();
    check(e.tag() == AnnotationValue.TAG_ENUM && e.classSymbol().equals(ClassDesc.of("annotations.Color")) &&
        e.constantName().stringValue().equals("GREEN"), "Enum annotation preserves two UTF references");
    AnnotationValue.OfClass type = (AnnotationValue.OfClass) elements.get(10).value();
    check(type.tag() == AnnotationValue.TAG_CLASS && type.classSymbol().equals(ConstantDescs.CD_String.arrayType().arrayType()),
        "Class annotation preserves array descriptor UTF reference");
    AnnotationValue.OfAnnotation nested = (AnnotationValue.OfAnnotation) elements.get(11).value();
    check(nested.tag() == AnnotationValue.TAG_ANNOTATION && nested.annotation().classSymbol().equals(ClassDesc.of("annotations.Nested")) &&
        ((AnnotationValue.OfInt) nested.annotation().elements().get(0).value()).intValue() == 7, "Nested annotation recursively decodes elements");
    AnnotationValue.OfArray array = (AnnotationValue.OfArray) elements.get(12).value();
    check(array.tag() == AnnotationValue.TAG_ARRAY && array.values().size() == 3 &&
        ((AnnotationValue.OfByte) array.values().get(0)).constant().intValue() == 513 &&
        ((AnnotationValue.OfInt) ((AnnotationValue.OfArray) array.values().get(1)).values().get(0)).intValue() == 9 &&
        ((AnnotationValue.OfAnnotation) array.values().get(2)).annotation().elements().size() == 1, "Nested array/annotation metadata is decoded recursively");
    check(owned(annotation, model.constantPool()) && owned(invisible.annotations().get(0), model.constantPool()), "Every recursive annotation CP reference belongs to parsed pool");
    FieldModel field = model.fields().get(0); MethodModel method = model.methods().get(0);
    check(field.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0).elements().size() == 13 &&
        field.findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().size() == 1, "Both field declaration annotation attributes survive");
    check(method.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0).elements().size() == 13 &&
        method.findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().size() == 1, "Both method declaration annotation attributes survive");
    List<List<Annotation>> vp = method.findAttribute(Attributes.runtimeVisibleParameterAnnotations()).get().parameterAnnotations();
    check(vp.size() == 3 && vp.get(0).isEmpty() && vp.get(1).size() == 1 && vp.get(2).isEmpty(),
        "Visible parameter annotation positions preserve empty first/last slots");
    List<List<Annotation>> ip = method.findAttribute(Attributes.runtimeInvisibleParameterAnnotations()).get().parameterAnnotations();
    check(ip.size() == 3 && ip.get(0).size() == 1 && ip.get(1).isEmpty() && ip.get(2).size() == 1,
        "Invisible parameter annotation positions preserve empty middle slot");
    check(owned(vp.get(1).get(0), model.constantPool()) && owned(ip.get(0).get(0), model.constantPool()) &&
        owned(ip.get(2).get(0), model.constantPool()), "Parameter value references belong to parsed destination pool");
    RecordComponentInfo component = model.findAttribute(Attributes.record()).get().components().get(0);
    check(component.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0).elements().size() == 13 &&
        component.findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().size() == 1, "Record component owns typed declaration annotation attributes");
    check(owned(component.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0), model.constantPool()),
        "Record-component recursive imports use destination pool");
    expect(UnsupportedOperationException.class, () -> annotation.elements().clear(), "Parsed annotation elements are immutable");
    expect(UnsupportedOperationException.class, () -> array.values().clear(), "Parsed array values are immutable");
    expect(UnsupportedOperationException.class, () -> vp.get(1).clear(), "Parsed parameter annotation groups are immutable");
  }
  private static void defaults() {
    ClassFile context = ClassFile.of();
    byte[] bytes = context.build(ClassDesc.of("C7dDefaultMetadataAnnotation"), builder -> builder
        .withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_INTERFACE | ClassFile.ACC_ABSTRACT | ClassFile.ACC_ANNOTATION)
        .withInterfaceSymbols(ClassDesc.of("java.lang.annotation.Annotation"))
        .withMethod("value", MethodTypeDesc.ofDescriptor("()Ljava/lang/String;"), ClassFile.ACC_PUBLIC | ClassFile.ACC_ABSTRACT,
            method -> method.with(AnnotationDefaultAttribute.of(AnnotationValue.ofString("default-text")))));
    ClassModel model = context.parse(bytes);
    AnnotationValue value = model.methods().get(0).findAttribute(Attributes.annotationDefault()).get().defaultValue();
    check(value instanceof AnnotationValue.OfString && ((AnnotationValue.OfString) value).stringValue().equals("default-text"), "Typed default string value is delivered");
    check(owned(value, model.constantPool()), "Default constant belongs to source pool");
    ClassModel copy = context.parse(context.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model, ClassTransform.ACCEPT_ALL));
    AnnotationValue copied = copy.methods().get(0).findAttribute(Attributes.annotationDefault()).get().defaultValue();
    check(copy.constantPool() != model.constantPool() && ((AnnotationValue.OfString) copied).stringValue().equals("default-text") &&
        owned(copied, copy.constantPool()), "Default semantic writer imports actual destination UTF reference");
    for (AnnotationElement element : allValues().elements()) {
      byte[] raw = context.build(ClassDesc.of("C7dRawDefaultMetadata"), builder -> builder
          .withMethod("value", MethodTypeDesc.ofDescriptor("()Ljava/lang/Object;"), ClassFile.ACC_PUBLIC | ClassFile.ACC_ABSTRACT,
              method -> method.with(AnnotationDefaultAttribute.of(element.value()))));
      ClassModel bound = context.parse(raw);
      AnnotationValue roundTrip = bound.methods().get(0).findAttribute(Attributes.annotationDefault()).get().defaultValue();
      check(roundTrip.tag() == element.value().tag() && owned(roundTrip, bound.constantPool()), "Each raw tagged default uses the genuine semantic codec");
    }
  }
  public static void main(String[] args) {
    factories(); defaults();
    ClassFile context = ClassFile.of(); ClassModel model = context.parse(fixture(context)); metadata(model);
    ClassModel copy = context.parse(context.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model, ClassTransform.ACCEPT_ALL));
    check(copy.constantPool() != model.constantPool(), "NEW_POOL rebuild owns an independent constant pool");
    metadata(copy);
    System.out.println("CLASSFILE_ANNOTATION_ATTRIBUTE_REGRESSION_OK|" + passed);
  }
}
