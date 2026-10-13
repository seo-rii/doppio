package classes.modern_test;

import java.lang.classfile.Annotation;
import java.lang.classfile.AnnotationElement;
import java.lang.classfile.AnnotationValue;
import java.lang.classfile.Attributes;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.attribute.AnnotationDefaultAttribute;
import java.lang.classfile.attribute.RuntimeInvisibleAnnotationsAttribute;
import java.lang.classfile.attribute.RuntimeInvisibleParameterAnnotationsAttribute;
import java.lang.classfile.attribute.RuntimeVisibleAnnotationsAttribute;
import java.lang.classfile.attribute.RuntimeVisibleParameterAnnotationsAttribute;
import java.lang.classfile.constantpool.AnnotationConstantValueEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.DoubleEntry;
import java.lang.classfile.constantpool.FloatEntry;
import java.lang.classfile.constantpool.IntegerEntry;
import java.lang.classfile.constantpool.LongEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.constant.Constable;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Native annotation factories, actual covariance bridges and semantic attribute imports. */
public final class ClassFileAnnotationRegression {
  private enum Sample { PLAIN, WITH_BODY { public String toString() { return "body"; } } }
  private static int checks;
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
  private static void scalar(AnnotationValue.OfConstant value, int tag, Object expected, Class<?> family, Class<?> resolved) {
    check(value.tag() == tag && family.isInstance(value), "Tag and typed annotation family");
    Constable actual = value.resolvedValue();
    check(actual.equals(expected) && actual.getClass() == resolved, "Real OfConstant bridge returns the correct live boxed/String type");
    check(value.constant().index() == -1, "Nominal scalar has an unbound temporary entry");
  }
  private static void scalars() throws Exception {
    AnnotationValue.OfByte b = AnnotationValue.ofByte((byte) -128);
    AnnotationValue.OfChar c = AnnotationValue.ofChar('\uffff');
    AnnotationValue.OfShort s = AnnotationValue.ofShort((short) -32768);
    AnnotationValue.OfBoolean z = AnnotationValue.ofBoolean(true);
    AnnotationValue.OfInt i = AnnotationValue.ofInt(Integer.MIN_VALUE);
    AnnotationValue.OfLong j = AnnotationValue.ofLong(Long.MIN_VALUE);
    AnnotationValue.OfFloat f = AnnotationValue.ofFloat(-0.0f);
    AnnotationValue.OfDouble d = AnnotationValue.ofDouble(Double.POSITIVE_INFINITY);
    AnnotationValue.OfString text = AnnotationValue.ofString("a\u0000\u03bb\ud83d\ude00");
    scalar(b, 'B', Byte.valueOf((byte) -128), AnnotationValue.OfByte.class, Byte.class);
    scalar(c, 'C', Character.valueOf('\uffff'), AnnotationValue.OfChar.class, Character.class);
    scalar(s, 'S', Short.valueOf((short) -32768), AnnotationValue.OfShort.class, Short.class);
    scalar(z, 'Z', Boolean.TRUE, AnnotationValue.OfBoolean.class, Boolean.class);
    scalar(i, 'I', Integer.valueOf(Integer.MIN_VALUE), AnnotationValue.OfInt.class, Integer.class);
    scalar(j, 'J', Long.valueOf(Long.MIN_VALUE), AnnotationValue.OfLong.class, Long.class);
    scalar(f, 'F', Float.valueOf(-0.0f), AnnotationValue.OfFloat.class, Float.class);
    scalar(d, 'D', Double.valueOf(Double.POSITIVE_INFINITY), AnnotationValue.OfDouble.class, Double.class);
    scalar(text, 's', "a\u0000\u03bb\ud83d\ude00", AnnotationValue.OfString.class, String.class);
    Byte boxedByte = b.resolvedValue(); Character boxedChar = c.resolvedValue(); Short boxedShort = s.resolvedValue();
    Boolean boxedBoolean = z.resolvedValue(); Integer boxedInt = i.resolvedValue(); Long boxedLong = j.resolvedValue();
    Float boxedFloat = f.resolvedValue(); Double boxedDouble = d.resolvedValue(); String resolvedText = text.resolvedValue();
    check(boxedByte.byteValue() == b.byteValue() && boxedChar.charValue() == c.charValue() && boxedShort.shortValue() == s.shortValue(),
      "Byte/char/short exact boxed covariant getters execute");
    check(boxedBoolean.booleanValue() == z.booleanValue() && boxedInt.intValue() == i.intValue() && boxedLong.longValue() == j.longValue(),
      "Boolean/int/long exact boxed covariant getters execute");
    check(Float.floatToRawIntBits(boxedFloat.floatValue()) == 0x80000000 && boxedDouble.doubleValue() == d.doubleValue() && resolvedText.equals(text.stringValue()),
      "Float/double/String exact boxed covariant getters execute");
    Class<?>[] types = {AnnotationValue.OfByte.class, AnnotationValue.OfChar.class, AnnotationValue.OfShort.class, AnnotationValue.OfBoolean.class,
      AnnotationValue.OfInt.class, AnnotationValue.OfLong.class, AnnotationValue.OfFloat.class, AnnotationValue.OfDouble.class, AnnotationValue.OfString.class};
    Class<?>[] boxes = {Byte.class, Character.class, Short.class, Boolean.class, Integer.class, Long.class, Float.class, Double.class, String.class};
    AnnotationValue.OfConstant[] values = {b,c,s,z,i,j,f,d,text};
    for (int index = 0; index < types.length; index++) {
      boolean typed = false, resolvedBridge = false, constantBridge = false;
      for (Method method : types[index].getDeclaredMethods()) {
        if (method.getName().equals("resolvedValue") && method.getReturnType() == boxes[index]) typed = method.isDefault() && !method.isBridge();
        if (method.getName().equals("resolvedValue") && method.getReturnType() == Constable.class)
          resolvedBridge = method.isDefault() && method.isBridge() && method.isSynthetic();
        if (method.getName().equals("constant") && method.getReturnType() == AnnotationConstantValueEntry.class)
          constantBridge = method.isDefault() && method.isBridge() && method.isSynthetic();
      }
      check(typed && resolvedBridge && constantBridge, "Exact native default/bridge interface covariance");
      boolean concreteBridge = false;
      for (Method method : values[index].getClass().getDeclaredMethods())
        if (method.getName().equals("constant") && method.getReturnType() == AnnotationConstantValueEntry.class)
          concreteBridge = method.isBridge() && method.isSynthetic();
      check(concreteBridge, "Real javac concrete entry covariance bridge");
    }
    ConstantPool owner = b.constant().constantPool();
    for (AnnotationValue.OfConstant value : values) check(value.constant().constantPool() == owner, "All nominal scalar entry families share the real temporary owner");
    check(AnnotationValue.ofInt(Integer.MIN_VALUE).constant() != i.constant() && AnnotationValue.ofString(text.stringValue()).constant() != text.constant(),
      "Temporary symbols are distinct entry objects, not falsely regular-pool interned");
    expect(UnsupportedOperationException.class, () -> owner.size());
    expect(UnsupportedOperationException.class, () -> owner.entryByIndex(-1));
    expect(UnsupportedOperationException.class, () -> owner.bootstrapMethodCount());
    check(AnnotationValue.ofFloat(Float.intBitsToFloat(0x7fc00001)).floatValue() != 0 &&
      Float.floatToRawIntBits(AnnotationValue.ofFloat(Float.intBitsToFloat(0x7fc00001)).floatValue()) == 0x7fc00001, "Float NaN payload retained by value getter");
    check(Double.doubleToRawLongBits(AnnotationValue.ofDouble(Double.longBitsToDouble(0x7ff8000000000001L)).doubleValue()) == 0x7ff8000000000001L,
      "Double NaN payload retained by value getter");
    check(Double.doubleToRawLongBits(AnnotationValue.ofDouble(-0.0).doubleValue()) == 0x8000000000000000L, "Double signed zero retained by getter");
  }
  private static void rawEntries() {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    IntegerEntry raw = pool.intEntry(0x12345678);
    check(AnnotationValue.ofInt(raw).constant() == raw && AnnotationValue.ofInt(raw).intValue() == 0x12345678, "Raw integer exact entry/value");
    check(AnnotationValue.ofByte(raw).constant() == raw && AnnotationValue.ofByte(raw).byteValue() == (byte) 0x78, "Raw byte getter truncates without rewriting its integer entry");
    check(AnnotationValue.ofShort(raw).constant() == raw && AnnotationValue.ofShort(raw).shortValue() == (short) 0x5678, "Raw short getter truncates without factory range checks");
    check(AnnotationValue.ofChar(raw).constant() == raw && AnnotationValue.ofChar(raw).charValue() == '\u5678', "Raw char getter truncates without factory range checks");
    check(AnnotationValue.ofBoolean(raw).constant() == raw && AnnotationValue.ofBoolean(raw).booleanValue(), "Raw boolean accepts any nonzero encoded integer");
    check(!AnnotationValue.ofBoolean(pool.intEntry(0)).booleanValue() && AnnotationValue.ofBoolean(pool.intEntry(-2)).booleanValue(), "Boolean zero/nonzero semantics");
    LongEntry j = pool.longEntry(Long.MAX_VALUE); FloatEntry f = pool.floatEntry(-1.25f); DoubleEntry d = pool.doubleEntry(-2.5);
    Utf8Entry text = pool.utf8Entry("raw");
    check(AnnotationValue.ofLong(j).constant() == j && AnnotationValue.ofLong(j).longValue() == Long.MAX_VALUE, "Raw long preserved");
    check(AnnotationValue.ofFloat(f).constant() == f && AnnotationValue.ofFloat(f).floatValue() == -1.25f, "Raw float preserved");
    check(AnnotationValue.ofDouble(d).constant() == d && AnnotationValue.ofDouble(d).doubleValue() == -2.5, "Raw double preserved");
    check(AnnotationValue.ofString(text).constant() == text && AnnotationValue.ofString(text).stringValue().equals("raw"), "Annotation String uses raw UTF, not CONSTANT_String");
    Utf8Entry type = pool.utf8Entry("Lmissing/Annotation;"), name = pool.utf8Entry("VALUE");
    check(AnnotationValue.ofClass(type).className() == type && AnnotationValue.ofClass(type).classSymbol().equals(ClassDesc.of("missing.Annotation")), "Raw class descriptor factory preserves identity");
    check(AnnotationValue.ofEnum(type, name).className() == type && AnnotationValue.ofEnum(type, name).constantName() == name, "Raw enum descriptor/name identities");
    Annotation annotation = Annotation.of(type, AnnotationElement.of(name, AnnotationValue.ofInt(raw)));
    check(annotation.className() == type && annotation.elements().get(0).name() == name, "Annotation/element raw UTF identity");
    Utf8Entry malformed = pool.utf8Entry("bad");
    AnnotationValue.OfClass delayed = AnnotationValue.ofClass(malformed);
    check(delayed.className() == malformed, "Raw class factory does not eagerly parse invalid descriptor text");
    expect(IllegalArgumentException.class, () -> delayed.classSymbol());
    expect(IllegalArgumentException.class, () -> Annotation.of(malformed).classSymbol());
    expect(IllegalArgumentException.class, () -> AnnotationValue.ofEnum(malformed, name).classSymbol());
  }
  private static void containers() {
    AnnotationElement first = AnnotationElement.ofString("value", "text");
    List<AnnotationElement> elements = new ArrayList<AnnotationElement>(); elements.add(first);
    Annotation annotation = Annotation.of(ClassDesc.of("missing.Annotation"), elements);
    elements.clear();
    check(annotation.classSymbol().equals(ClassDesc.of("missing.Annotation")) && annotation.elements().size() == 1 && annotation.elements().get(0) == first,
      "Annotation factory snapshots input list and retains genuine child objects");
    expect(UnsupportedOperationException.class, () -> annotation.elements().clear());
    AnnotationElement[] mutable = {first}; Annotation copied = Annotation.of(ClassDesc.of("missing.Annotation"), mutable); mutable[0] = null;
    check(copied.equals(annotation) && copied.hashCode() == annotation.hashCode(), "Annotation varargs copy and semantic value equality");
    check(first.equals(AnnotationElement.ofString("value", "text")) && first.hashCode() == AnnotationElement.ofString("value", "text").hashCode(), "AnnotationElement structural equality");
    check(!first.equals(AnnotationElement.ofString("other", "text")) && !first.equals(AnnotationElement.ofString("value", "other")), "Element name/value inequality");
    check(annotation.toString().startsWith("Annotation[Lmissing/Annotation; ") && Annotation.of(ClassDesc.of("missing.Annotation")).toString().equals("Annotation[Lmissing/Annotation;]"), "Native annotation text shape");
    AnnotationValue.OfAnnotation nested = AnnotationValue.ofAnnotation(annotation);
    check(nested.tag() == '@' && nested.annotation() == annotation && nested.equals(AnnotationValue.ofAnnotation(copied)), "Nested annotation keeps actual typed child");
    List<AnnotationValue> values = new ArrayList<AnnotationValue>(); values.add(AnnotationValue.ofInt(1)); values.add(nested);
    AnnotationValue.OfArray array = AnnotationValue.ofArray(values); values.clear();
    check(array.tag() == '[' && array.values().size() == 2 && array.values().get(1) == nested, "Array immutable snapshot with heterogeneous children");
    expect(UnsupportedOperationException.class, () -> array.values().clear());
    expect(UnsupportedOperationException.class, () -> AnnotationValue.ofArray().values().clear());
    AnnotationValue[] varargs = {array}; AnnotationValue.OfArray arrayCopy = AnnotationValue.ofArray(varargs); varargs[0] = null;
    check(arrayCopy.values().get(0) == array && arrayCopy.equals(AnnotationValue.ofArray(Collections.<AnnotationValue>singletonList(array))), "Nested arrays and list/varargs equality");
    AnnotationValue.OfClass clazz = AnnotationValue.ofClass(ConstantDescs.CD_void);
    check(clazz.tag() == 'c' && clazz.classSymbol().equals(ConstantDescs.CD_void) && clazz.className().index() == -1, "Nominal class value accepts void descriptor");
    check(Annotation.of(ConstantDescs.CD_int).classSymbol().equals(ConstantDescs.CD_int), "Annotation nominal factory has no invented annotation-kind check");
    AnnotationValue.OfEnum enumeration = AnnotationValue.ofEnum(ClassDesc.of("missing.Enum"), "VALUE");
    check(enumeration.tag() == 'e' && enumeration.classSymbol().equals(ClassDesc.of("missing.Enum")) && enumeration.constantName().stringValue().equals("VALUE"), "Nominal enum descriptor/name");
    check(enumeration.className().index() == -1 && enumeration.constantName().index() == -1 &&
      enumeration.className().constantPool() == clazz.className().constantPool() && enumeration.constantName().constantPool() == clazz.className().constantPool(), "Enum/class symbols share temporary UTF owner");
    check(enumeration.equals(AnnotationValue.ofEnum(ClassDesc.of("missing.Enum"), "VALUE")) && !enumeration.equals(AnnotationValue.ofEnum(ClassDesc.of("missing.Enum"), "OTHER")), "Enum semantic equality");
    check(clazz.equals(AnnotationValue.ofClass(ConstantDescs.CD_void)) && !clazz.equals(AnnotationValue.ofClass(ConstantDescs.CD_int)), "Class value semantic equality");
    AnnotationElement[] convenience = {AnnotationElement.ofClass("c", ConstantDescs.CD_String), AnnotationElement.ofLong("j", 3L), AnnotationElement.ofInt("i", 4),
      AnnotationElement.ofChar("ch", 'x'), AnnotationElement.ofShort("s", (short) 5), AnnotationElement.ofByte("b", (byte) 6), AnnotationElement.ofBoolean("z", false),
      AnnotationElement.ofDouble("d", 7.5), AnnotationElement.ofFloat("f", 8.5f), AnnotationElement.ofAnnotation("a", annotation), AnnotationElement.ofArray("arr", array)};
    int[] tags = {'c','J','I','C','S','B','Z','D','F','@','['};
    for (int index = 0; index < tags.length; index++) check(convenience[index].value().tag() == tags[index] && convenience[index].name().index() == -1, "Exact element convenience family");
    check(AnnotationValue.ofInt(7).equals(AnnotationValue.ofInt(7)) && AnnotationValue.ofInt(7).hashCode() == AnnotationValue.ofInt(7).hashCode(), "Nominal numeric value equality/hash");
    check(!AnnotationValue.ofInt(7).equals(AnnotationValue.ofByte((byte) 7)), "Equal backing integer does not erase distinct annotation tags");
    check(!AnnotationValue.ofFloat(Float.NaN).equals(AnnotationValue.ofFloat(Float.NaN)) && !AnnotationValue.ofDouble(Double.NaN).equals(AnnotationValue.ofDouble(Double.NaN)), "Native distinct NaN entry values remain unequal");
    check(AnnotationValue.ofFloat(0.0f).equals(AnnotationValue.ofFloat(-0.0f)) && AnnotationValue.ofFloat(0.0f).hashCode() != AnnotationValue.ofFloat(-0.0f).hashCode(), "Native scalar float signed-zero equality and hash behavior");
  }
  private static void genericValues() {
    Object[] values = {Byte.valueOf((byte) 1), Character.valueOf('x'), Short.valueOf((short) 2), Boolean.FALSE, Integer.valueOf(3),
      Long.valueOf(4), Float.valueOf(5.5f), Double.valueOf(6.5), "text", ConstantDescs.CD_String, Sample.PLAIN};
    int[] tags = {'B','C','S','Z','I','J','F','D','s','c','e'};
    for (int index = 0; index < tags.length; index++) check(AnnotationValue.of(values[index]).tag() == tags[index], "Generic scalar actual input family");
    AnnotationValue.OfEnum enumBody = (AnnotationValue.OfEnum) AnnotationValue.of(Sample.WITH_BODY);
    check(enumBody.classSymbol().equals(ClassDesc.of(Sample.class.getName())) && enumBody.constantName().stringValue().equals("WITH_BODY"), "Generic enum uses declaring enum, not anonymous constant subclass");
    Object[] arrays = {new byte[] {1,2}, new char[] {'a','b'}, new short[] {1,2}, new boolean[] {false,true}, new int[] {1,2},
      new long[] {1,2}, new float[] {1,2}, new double[] {1,2}, new String[] {"a","b"}, new ClassDesc[] {ConstantDescs.CD_int, ConstantDescs.CD_String}, new Sample[] {Sample.PLAIN,Sample.WITH_BODY}};
    for (int index = 0; index < arrays.length; index++) {
      AnnotationValue.OfArray array = (AnnotationValue.OfArray) AnnotationValue.of(arrays[index]);
      check(array.tag() == '[' && array.values().size() == 2 && array.values().get(0).tag() == tags[index] && array.values().get(1).tag() == tags[index], "Generic primitive/reference array preserves element tags");
      expect(UnsupportedOperationException.class, () -> array.values().clear());
    }
    int[] integers = {1,2}; AnnotationValue.OfArray snapshot = (AnnotationValue.OfArray) AnnotationValue.of(integers); integers[0] = 99;
    check(((AnnotationValue.OfInt) snapshot.values().get(0)).intValue() == 1, "Generic arrays copy live primitive values");
    AnnotationValue.OfArray mixed = (AnnotationValue.OfArray) AnnotationValue.of(new Object[] {1, "text", new int[] {2,3}, new Object[] {true, Sample.PLAIN}});
    check(mixed.values().size() == 4 && mixed.values().get(2) instanceof AnnotationValue.OfArray && mixed.values().get(3) instanceof AnnotationValue.OfArray,
      "Generic Object arrays recurse with heterogeneous/nested input");
    check(((AnnotationValue.OfArray) AnnotationValue.of(new int[0])).values().isEmpty(), "Empty primitive array");
    expect(NullPointerException.class, () -> AnnotationValue.of((Object) null));
    expect(NullPointerException.class, () -> AnnotationValue.of(new Object[] {1,null}));
    for (Object unsupported : Arrays.<Object>asList(new Object(), String.class, Collections.emptyList(), AnnotationValue.ofInt(1), Annotation.of(ClassDesc.of("missing.A"))))
      expect(IllegalArgumentException.class, () -> AnnotationValue.of(unsupported));
    expect(IllegalArgumentException.class, () -> AnnotationValue.of((Object) new AnnotationValue[] {AnnotationValue.ofInt(1)}));
  }
  private static void nullFactories() {
    expect(NullPointerException.class, () -> AnnotationValue.ofByte((IntegerEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofChar((IntegerEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofShort((IntegerEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofBoolean((IntegerEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofInt((IntegerEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofLong((LongEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofFloat((FloatEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofDouble((DoubleEntry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofString((Utf8Entry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofString((String) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofClass((Utf8Entry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofClass((ClassDesc) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofEnum((Utf8Entry) null, ConstantPoolBuilder.of().utf8Entry("V")));
    expect(NullPointerException.class, () -> AnnotationValue.ofEnum(ConstantPoolBuilder.of().utf8Entry("LA;"), (Utf8Entry) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofEnum((ClassDesc) null, "V"));
    expect(NullPointerException.class, () -> AnnotationValue.ofEnum(ConstantDescs.CD_String, (String) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofAnnotation(null));
    expect(NullPointerException.class, () -> AnnotationValue.ofArray((List<AnnotationValue>) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofArray((AnnotationValue[]) null));
    expect(NullPointerException.class, () -> AnnotationValue.ofArray(Arrays.asList((AnnotationValue) null)));
    expect(NullPointerException.class, () -> AnnotationValue.ofArray(new AnnotationValue[] {null}));
    expect(NullPointerException.class, () -> Annotation.of((Utf8Entry) null));
    expect(NullPointerException.class, () -> Annotation.of((ClassDesc) null));
    expect(NullPointerException.class, () -> Annotation.of(ConstantDescs.CD_String, (List<AnnotationElement>) null));
    expect(NullPointerException.class, () -> Annotation.of(ConstantDescs.CD_String, (AnnotationElement[]) null));
    expect(NullPointerException.class, () -> Annotation.of(ConstantDescs.CD_String, new AnnotationElement[] {null}));
    expect(NullPointerException.class, () -> AnnotationElement.of((Utf8Entry) null, AnnotationValue.ofInt(1)));
    expect(NullPointerException.class, () -> AnnotationElement.of((String) null, AnnotationValue.ofInt(1)));
    expect(NullPointerException.class, () -> AnnotationElement.of("v", null));
    expect(NullPointerException.class, () -> AnnotationElement.ofString("v", null));
    expect(NullPointerException.class, () -> AnnotationElement.ofClass("v", null));
    expect(NullPointerException.class, () -> AnnotationElement.ofAnnotation("v", null));
    expect(NullPointerException.class, () -> AnnotationElement.ofArray("v", (AnnotationValue[]) null));
  }
  private static Annotation allTags() {
    return Annotation.of(ClassDesc.of("missing.Annotation"), AnnotationElement.ofByte("b", (byte) -128), AnnotationElement.ofChar("c", '\uffff'),
      AnnotationElement.ofDouble("d", -2.5), AnnotationElement.ofFloat("f", 1.25f), AnnotationElement.ofInt("i", Integer.MIN_VALUE),
      AnnotationElement.ofLong("j", Long.MIN_VALUE), AnnotationElement.ofShort("s", (short) -32768), AnnotationElement.ofBoolean("z", true),
      AnnotationElement.ofString("text", "a\u0000\u03bb\ud83d\ude00"), AnnotationElement.of("e", AnnotationValue.ofEnum(ClassDesc.of("missing.Enum"), "VALUE")),
      AnnotationElement.ofClass("clazz", ConstantDescs.CD_int.arrayType()), AnnotationElement.ofAnnotation("nested", Annotation.of(ClassDesc.of("missing.Nested"))),
      AnnotationElement.ofArray("array", AnnotationValue.ofInt(2), AnnotationValue.ofInt(3)));
  }
  private static void encoded() {
    Annotation expected = allTags(); ClassFile classFile = ClassFile.of();
    List<List<Annotation>> parameters = Arrays.asList(Collections.emptyList(), Collections.singletonList(expected), Collections.emptyList());
    byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.AnnotationOutput"), builder -> {
      builder.with(RuntimeVisibleAnnotationsAttribute.of(expected)); builder.with(RuntimeInvisibleAnnotationsAttribute.of(expected));
      builder.withField("field", ConstantDescs.CD_int, field -> field.withFlags(ClassFile.ACC_PUBLIC).with(RuntimeVisibleAnnotationsAttribute.of(expected)));
      builder.withMethod("method", MethodTypeDesc.of(ConstantDescs.CD_int, ConstantDescs.CD_int, ConstantDescs.CD_int, ConstantDescs.CD_int), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        method -> method.with(RuntimeInvisibleAnnotationsAttribute.of(expected)).with(RuntimeVisibleParameterAnnotationsAttribute.of(parameters))
          .with(RuntimeInvisibleParameterAnnotationsAttribute.of(parameters)).withCode(code -> code.iload(0).ireturn()));
    });
    check(classFile.verify(bytes).isEmpty(), "Native class/field/method annotation attribute bytes verify");
    ClassModel model = classFile.parse(bytes);
    Annotation bound = model.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0);
    check(bound.equals(expected) && bound.hashCode() == expected.hashCode(), "All thirteen encoded value families retain semantic equality");
    check(bound.className().index() > 0 && bound.className().constantPool() == model.constantPool(), "Bound annotation descriptor has genuine indexed output ownership");
    for (AnnotationElement element : bound.elements()) {
      check(element.name().index() > 0 && element.name().constantPool() == model.constantPool(), "Bound element name has real output ownership");
      if (element.value() instanceof AnnotationValue.OfConstant) check(((AnnotationValue.OfConstant) element.value()).constant().constantPool() == model.constantPool(), "Bound scalar uses its real indexed pool");
    }
    check(model.findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().get(0).equals(expected), "Invisible declaration annotation semantic model");
    check(model.fields().get(0).findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0).equals(expected), "Field annotation semantic model");
    check(model.methods().get(0).findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().get(0).equals(expected), "Method annotation semantic model");
    check(model.methods().get(0).findAttribute(Attributes.runtimeVisibleParameterAnnotations()).get().parameterAnnotations().equals(parameters) &&
      model.methods().get(0).findAttribute(Attributes.runtimeInvisibleParameterAnnotations()).get().parameterAnnotations().equals(parameters), "Parameter annotations preserve empty positional groups");
    byte[] rewritten = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model, ClassTransform.ACCEPT_ALL);
    ClassModel imported = classFile.parse(rewritten);
    check(classFile.verify(rewritten).isEmpty() && imported.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0).equals(expected), "Fresh-pool transform imports semantic annotation graphs");
    check(imported.methods().get(0).findAttribute(Attributes.runtimeVisibleParameterAnnotations()).get().parameterAnnotations().equals(parameters), "Fresh-pool parameter graph retains positions and child values");
    byte[] defaultBytes = classFile.build(ClassDesc.of("classes.modern_test.AnnotationDefaultOutput"), builder ->
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_INTERFACE | ClassFile.ACC_ABSTRACT | ClassFile.ACC_ANNOTATION)
        .withMethod("value", MethodTypeDesc.of(ConstantDescs.CD_int), ClassFile.ACC_PUBLIC | ClassFile.ACC_ABSTRACT,
          method -> method.with(AnnotationDefaultAttribute.of(AnnotationValue.ofInt(7)))));
    check(classFile.verify(defaultBytes).isEmpty(), "Native annotation-interface default bytes verify");
    AnnotationValue value = classFile.parse(defaultBytes).methods().get(0).findAttribute(Attributes.annotationDefault()).get().defaultValue();
    check(value.tag() == 'I' && ((AnnotationValue.OfInt) value).intValue() == 7 && value.equals(AnnotationValue.ofInt(7)), "Bound annotation default typed semantic value");
  }
  public static void main(String[] arguments) throws Exception {
    scalars(); rawEntries(); containers(); genericValues(); nullFactories(); encoded();
    System.out.println("CLASSFILE_ANNOTATION_REGRESSION_OK|" + checks);
  }
}
