package java.lang.classfile;

import java.lang.classfile.AttributeMapper.AttributeStability;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/** Typed annotation attributes, with recursive value codecs and destination-pool imports. */
public final class DoppioAnnotationAttributes {
  private DoppioAnnotationAttributes() {}
  private static final AttributeMapper<RuntimeVisibleAnnotationsAttribute> VISIBLE =
      new Mapper<RuntimeVisibleAnnotationsAttribute>("RuntimeVisibleAnnotations") {
    void payload(BufWriter writer, RuntimeVisibleAnnotationsAttribute value) { writeAnnotations(writer, value.annotations()); }
  };
  private static final AttributeMapper<RuntimeInvisibleAnnotationsAttribute> INVISIBLE =
      new Mapper<RuntimeInvisibleAnnotationsAttribute>("RuntimeInvisibleAnnotations") {
    void payload(BufWriter writer, RuntimeInvisibleAnnotationsAttribute value) { writeAnnotations(writer, value.annotations()); }
  };
  private static final AttributeMapper<RuntimeVisibleParameterAnnotationsAttribute> VISIBLE_PARAMETERS =
      new Mapper<RuntimeVisibleParameterAnnotationsAttribute>("RuntimeVisibleParameterAnnotations") {
    void payload(BufWriter writer, RuntimeVisibleParameterAnnotationsAttribute value) { writeParameters(writer, value.parameterAnnotations()); }
  };
  private static final AttributeMapper<RuntimeInvisibleParameterAnnotationsAttribute> INVISIBLE_PARAMETERS =
      new Mapper<RuntimeInvisibleParameterAnnotationsAttribute>("RuntimeInvisibleParameterAnnotations") {
    void payload(BufWriter writer, RuntimeInvisibleParameterAnnotationsAttribute value) { writeParameters(writer, value.parameterAnnotations()); }
  };
  private static final AttributeMapper<AnnotationDefaultAttribute> DEFAULT =
      new Mapper<AnnotationDefaultAttribute>("AnnotationDefault") {
    void payload(BufWriter writer, AnnotationDefaultAttribute value) { writeValue(writer, value.defaultValue()); }
  };

  private abstract static class Mapper<A extends Attribute<A>> implements AttributeMapper<A> {
    final String name;
    Mapper(String name) { this.name = name; }
    public String name() { return name; }
    public AttributeStability stability() { return AttributeStability.CP_REFS; }
    @SuppressWarnings("unchecked")
    public A readAttribute(AttributedElement owner, ClassReader reader, int start) {
      return (A) read(owner, reader, reader.readEntry(start - 6, Utf8Entry.class), start,
          reader.readBytes(start, reader.readInt(start - 4)));
    }
    public void writeAttribute(BufWriter writer, A value) {
      writer.writeIndex(value.attributeName()); int lengthAt = writer.size(); writer.writeInt(0);
      int start = writer.size(); payload(writer, value);
      writer.patchInt(lengthAt, 4, writer.size() - start);
    }
    abstract void payload(BufWriter writer, A value);
  }
  static AttributeMapper<RuntimeVisibleAnnotationsAttribute> runtimeVisibleAnnotationsMapper() { return VISIBLE; }
  static AttributeMapper<RuntimeInvisibleAnnotationsAttribute> runtimeInvisibleAnnotationsMapper() { return INVISIBLE; }
  static AttributeMapper<RuntimeVisibleParameterAnnotationsAttribute> runtimeVisibleParameterAnnotationsMapper() { return VISIBLE_PARAMETERS; }
  static AttributeMapper<RuntimeInvisibleParameterAnnotationsAttribute> runtimeInvisibleParameterAnnotationsMapper() { return INVISIBLE_PARAMETERS; }
  static AttributeMapper<AnnotationDefaultAttribute> annotationDefaultMapper() { return DEFAULT; }

  static Attribute<?> read(AttributedElement owner, ClassReader reader, Utf8Entry name, int start, byte[] payload) {
    String key = name.stringValue();
    boolean visible = "RuntimeVisibleAnnotations".equals(key);
    boolean invisible = "RuntimeInvisibleAnnotations".equals(key);
    boolean visibleParameters = "RuntimeVisibleParameterAnnotations".equals(key);
    boolean invisibleParameters = "RuntimeInvisibleParameterAnnotations".equals(key);
    boolean defaultValue = "AnnotationDefault".equals(key);
    if (!visible && !invisible && !visibleParameters && !invisibleParameters && !defaultValue) return null;
    boolean declarationOwner = owner instanceof ClassModel || owner instanceof MethodModel ||
        owner instanceof FieldModel || owner instanceof RecordComponentInfo;
    require((visible || invisible) ? declarationOwner : owner instanceof MethodModel,
        "Invalid enclosing element for " + key);
    ConstantPool pool = DoppioClassReader.readerPool(reader);
    Cursor cursor = new Cursor(reader, start, start + payload.length);
    Attribute<?> result;
    if (visible || invisible) {
      List<Annotation> annotations = readAnnotations(cursor);
      result = visible ? new VisibleValue(name, annotations, pool, payload) : new InvisibleValue(name, annotations, pool, payload);
    } else if (visibleParameters || invisibleParameters) {
      int count = cursor.u1(); List<List<Annotation>> parameters = new ArrayList<List<Annotation>>();
      for (int index = 0; index < count; index++) parameters.add(readAnnotations(cursor));
      result = visibleParameters ? new VisibleParametersValue(name, parameters, pool, payload) :
          new InvisibleParametersValue(name, parameters, pool, payload);
    } else {
      result = new DefaultValue(name, readValue(cursor), pool, payload);
    }
    cursor.finish();
    return result;
  }

  // Shared with type-annotation codecs: one framed cursor consumes a semantic
  // annotation suffix, never rereads bytes outside its containing attribute.
  static final class Cursor {
    final ClassReader reader; final int end; int at;
    Cursor(ClassReader reader, int start, int end) {
      this.reader = Objects.requireNonNull(reader); this.at = start; this.end = end;
      require(start >= 0 && end >= start, "Invalid annotation attribute bounds");
    }
    void need(int bytes) { require(bytes >= 0 && end - at >= bytes, "Truncated annotation attribute"); }
    int u1() { need(1); return reader.readU1(at++); }
    int u2() { need(2); int result = reader.readU2(at); at += 2; return result; }
    <T extends PoolEntry> T entry(Class<T> type) {
      need(2); T result = reader.readEntry(at, type); at += 2; return result;
    }
    void finish() { require(at == end, "Trailing annotation attribute data"); }
  }
  static List<Annotation> readAnnotations(Cursor cursor) {
    int count = cursor.u2(); List<Annotation> annotations = new ArrayList<Annotation>();
    for (int index = 0; index < count; index++) annotations.add(readAnnotation(cursor));
    return annotations;
  }
  static Annotation readAnnotation(Cursor cursor) {
    Utf8Entry className = cursor.entry(Utf8Entry.class); int count = cursor.u2();
    List<AnnotationElement> elements = new ArrayList<AnnotationElement>();
    for (int index = 0; index < count; index++)
      elements.add(AnnotationElement.of(cursor.entry(Utf8Entry.class), readValue(cursor)));
    return Annotation.of(className, elements);
  }
  static AnnotationValue readValue(Cursor cursor) {
    int tagAt = cursor.at, tag = cursor.u1();
    switch (tag) {
      case AnnotationValue.TAG_BYTE: return AnnotationValue.ofByte(cursor.entry(IntegerEntry.class));
      case AnnotationValue.TAG_CHAR: return AnnotationValue.ofChar(cursor.entry(IntegerEntry.class));
      case AnnotationValue.TAG_DOUBLE: return AnnotationValue.ofDouble(cursor.entry(DoubleEntry.class));
      case AnnotationValue.TAG_FLOAT: return AnnotationValue.ofFloat(cursor.entry(FloatEntry.class));
      case AnnotationValue.TAG_INT: return AnnotationValue.ofInt(cursor.entry(IntegerEntry.class));
      case AnnotationValue.TAG_LONG: return AnnotationValue.ofLong(cursor.entry(LongEntry.class));
      case AnnotationValue.TAG_SHORT: return AnnotationValue.ofShort(cursor.entry(IntegerEntry.class));
      case AnnotationValue.TAG_BOOLEAN: return AnnotationValue.ofBoolean(cursor.entry(IntegerEntry.class));
      case AnnotationValue.TAG_STRING: return AnnotationValue.ofString(cursor.entry(Utf8Entry.class));
      case AnnotationValue.TAG_ENUM:
        return AnnotationValue.ofEnum(cursor.entry(Utf8Entry.class), cursor.entry(Utf8Entry.class));
      case AnnotationValue.TAG_CLASS: return AnnotationValue.ofClass(cursor.entry(Utf8Entry.class));
      case AnnotationValue.TAG_ANNOTATION: return AnnotationValue.ofAnnotation(readAnnotation(cursor));
      case AnnotationValue.TAG_ARRAY:
        int count = cursor.u2(); List<AnnotationValue> values = new ArrayList<AnnotationValue>();
        for (int index = 0; index < count; index++) values.add(readValue(cursor));
        return AnnotationValue.ofArray(values);
      default: throw new IllegalArgumentException("Unexpected tag '" + (char) tag + "' in AnnotationValue, pos = " + tagAt);
    }
  }
  static void writeAnnotations(BufWriter writer, List<Annotation> annotations) {
    writer.writeU2(annotations.size());
    for (Annotation annotation : annotations) writeAnnotation(writer, annotation);
  }
  static void writeAnnotation(BufWriter writer, Annotation annotation) {
    writer.writeIndex(annotation.className()); writer.writeU2(annotation.elements().size());
    for (AnnotationElement element : annotation.elements()) {
      writer.writeIndex(element.name()); writeValue(writer, element.value());
    }
  }
  static void writeValue(BufWriter writer, AnnotationValue value) {
    int tag = value.tag(); writer.writeU1(tag);
    switch (tag) {
      case AnnotationValue.TAG_BYTE: case AnnotationValue.TAG_CHAR: case AnnotationValue.TAG_DOUBLE:
      case AnnotationValue.TAG_FLOAT: case AnnotationValue.TAG_INT: case AnnotationValue.TAG_LONG:
      case AnnotationValue.TAG_SHORT: case AnnotationValue.TAG_BOOLEAN: case AnnotationValue.TAG_STRING:
        writer.writeIndex(((AnnotationValue.OfConstant) value).constant()); return;
      case AnnotationValue.TAG_CLASS:
        writer.writeIndex(((AnnotationValue.OfClass) value).className()); return;
      case AnnotationValue.TAG_ENUM:
        AnnotationValue.OfEnum enumValue = (AnnotationValue.OfEnum) value;
        writer.writeIndex(enumValue.className()); writer.writeIndex(enumValue.constantName()); return;
      case AnnotationValue.TAG_ANNOTATION:
        writeAnnotation(writer, ((AnnotationValue.OfAnnotation) value).annotation()); return;
      case AnnotationValue.TAG_ARRAY:
        List<AnnotationValue> values = ((AnnotationValue.OfArray) value).values(); writer.writeU2(values.size());
        for (AnnotationValue entry : values) writeValue(writer, entry);
        return;
      default: throw new InternalError("Unknown annotation value " + value);
    }
  }
  private static void writeParameters(BufWriter writer, List<List<Annotation>> parameters) {
    writer.writeU1(parameters.size());
    for (List<Annotation> annotations : parameters) writeAnnotations(writer, annotations);
  }
  static byte[] retainedPayload(Attribute<?> attribute) {
    return attribute instanceof Base && ((Base<?>) attribute).payload != null ? ((Base<?>) attribute).payload.clone() : null;
  }
  static ConstantPool sourcePool(Attribute<?> attribute) { return attribute instanceof Base ? ((Base<?>) attribute).pool : null; }
  public static RuntimeVisibleAnnotationsAttribute visibleAnnotations(List<Annotation> annotations) {
    return new VisibleValue(name("RuntimeVisibleAnnotations"), annotations, null, null);
  }
  public static RuntimeInvisibleAnnotationsAttribute invisibleAnnotations(List<Annotation> annotations) {
    return new InvisibleValue(name("RuntimeInvisibleAnnotations"), annotations, null, null);
  }
  public static RuntimeVisibleParameterAnnotationsAttribute visibleParameterAnnotations(List<List<Annotation>> annotations) {
    return new VisibleParametersValue(name("RuntimeVisibleParameterAnnotations"), annotations, null, null);
  }
  public static RuntimeInvisibleParameterAnnotationsAttribute invisibleParameterAnnotations(List<List<Annotation>> annotations) {
    return new InvisibleParametersValue(name("RuntimeInvisibleParameterAnnotations"), annotations, null, null);
  }
  public static AnnotationDefaultAttribute annotationDefault(AnnotationValue value) {
    return new DefaultValue(name("AnnotationDefault"), value, null, null);
  }
  private static Utf8Entry name(String value) { return new DoppioConstantPool().utf8Entry(value); }
  private static void require(boolean condition, String message) { if (!condition) throw new IllegalArgumentException(message); }
  private static <T> List<T> immutable(List<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : copy) Objects.requireNonNull(value);
    return Collections.unmodifiableList(copy);
  }
  private static List<List<Annotation>> immutableParameters(List<List<Annotation>> parameters) {
    List<List<Annotation>> copy = new ArrayList<List<Annotation>>();
    for (List<Annotation> annotations : Objects.requireNonNull(parameters)) copy.add(immutable(annotations));
    return Collections.unmodifiableList(copy);
  }
  private abstract static class Base<A extends Attribute<A>> implements Attribute<A> {
    final Utf8Entry name; final ConstantPool pool; final byte[] payload;
    Base(Utf8Entry name, ConstantPool pool, byte[] payload) {
      this.name = name; this.pool = pool; this.payload = payload == null ? null : payload.clone();
    }
    public Utf8Entry attributeName() { return name; }
  }
  private abstract static class AnnotationsValue<A extends Attribute<A>> extends Base<A> {
    final List<Annotation> annotations;
    AnnotationsValue(Utf8Entry name, List<Annotation> annotations, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.annotations = immutable(annotations);
    }
    public List<Annotation> annotations() { return annotations; }
  }
  private static final class VisibleValue extends AnnotationsValue<RuntimeVisibleAnnotationsAttribute> implements RuntimeVisibleAnnotationsAttribute {
    VisibleValue(Utf8Entry name, List<Annotation> annotations, ConstantPool pool, byte[] payload) { super(name, annotations, pool, payload); }
    public AttributeMapper<RuntimeVisibleAnnotationsAttribute> attributeMapper() { return VISIBLE; }
  }
  private static final class InvisibleValue extends AnnotationsValue<RuntimeInvisibleAnnotationsAttribute> implements RuntimeInvisibleAnnotationsAttribute {
    InvisibleValue(Utf8Entry name, List<Annotation> annotations, ConstantPool pool, byte[] payload) { super(name, annotations, pool, payload); }
    public AttributeMapper<RuntimeInvisibleAnnotationsAttribute> attributeMapper() { return INVISIBLE; }
  }
  private abstract static class ParametersValue<A extends Attribute<A>> extends Base<A> {
    final List<List<Annotation>> parameters;
    ParametersValue(Utf8Entry name, List<List<Annotation>> parameters, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.parameters = immutableParameters(parameters);
    }
    public List<List<Annotation>> parameterAnnotations() { return parameters; }
  }
  private static final class VisibleParametersValue extends ParametersValue<RuntimeVisibleParameterAnnotationsAttribute> implements RuntimeVisibleParameterAnnotationsAttribute {
    VisibleParametersValue(Utf8Entry name, List<List<Annotation>> annotations, ConstantPool pool, byte[] payload) { super(name, annotations, pool, payload); }
    public AttributeMapper<RuntimeVisibleParameterAnnotationsAttribute> attributeMapper() { return VISIBLE_PARAMETERS; }
  }
  private static final class InvisibleParametersValue extends ParametersValue<RuntimeInvisibleParameterAnnotationsAttribute> implements RuntimeInvisibleParameterAnnotationsAttribute {
    InvisibleParametersValue(Utf8Entry name, List<List<Annotation>> annotations, ConstantPool pool, byte[] payload) { super(name, annotations, pool, payload); }
    public AttributeMapper<RuntimeInvisibleParameterAnnotationsAttribute> attributeMapper() { return INVISIBLE_PARAMETERS; }
  }
  private static final class DefaultValue extends Base<AnnotationDefaultAttribute> implements AnnotationDefaultAttribute {
    final AnnotationValue value;
    DefaultValue(Utf8Entry name, AnnotationValue value, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.value = Objects.requireNonNull(value);
    }
    public AttributeMapper<AnnotationDefaultAttribute> attributeMapper() { return DEFAULT; }
    public AnnotationValue defaultValue() { return value; }
  }
}
