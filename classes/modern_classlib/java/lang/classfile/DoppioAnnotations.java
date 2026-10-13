package java.lang.classfile;

import java.lang.classfile.constantpool.DoubleEntry;
import java.lang.classfile.constantpool.FloatEntry;
import java.lang.classfile.constantpool.IntegerEntry;
import java.lang.classfile.constantpool.LongEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/** Immutable, entry-preserving annotation models; encoding belongs to the attribute codec. */
final class DoppioAnnotations {
  private DoppioAnnotations() { }

  private static <T> List<T> copyList(List<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : copy) Objects.requireNonNull(value);
    return Collections.unmodifiableList(copy);
  }

  static Annotation annotation(Utf8Entry type, List<AnnotationElement> elements) {
    return new AnnotationModel(Objects.requireNonNull(type), copyList(elements));
  }
  static AnnotationElement element(Utf8Entry name, AnnotationValue value) {
    return new ElementModel(Objects.requireNonNull(name), Objects.requireNonNull(value));
  }
  static AnnotationValue.OfString string(Utf8Entry value) { return new StringValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfDouble doubleValue(DoubleEntry value) { return new DoubleValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfFloat floatValue(FloatEntry value) { return new FloatValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfLong longValue(LongEntry value) { return new LongValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfInt intValue(IntegerEntry value) { return new IntValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfShort shortValue(IntegerEntry value) { return new ShortValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfChar charValue(IntegerEntry value) { return new CharValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfByte byteValue(IntegerEntry value) { return new ByteValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfBoolean booleanValue(IntegerEntry value) { return new BooleanValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfClass classValue(Utf8Entry type) { return new ClassValue(Objects.requireNonNull(type)); }
  static AnnotationValue.OfEnum enumValue(Utf8Entry type, Utf8Entry name) {
    return new EnumValue(Objects.requireNonNull(type), Objects.requireNonNull(name));
  }
  static AnnotationValue.OfAnnotation nested(Annotation value) { return new NestedValue(Objects.requireNonNull(value)); }
  static AnnotationValue.OfArray array(List<AnnotationValue> values) { return new ArrayValue(copyList(values)); }

  static AnnotationValue of(Object value) {
    if (value instanceof String) return AnnotationValue.ofString((String) value);
    if (value instanceof Byte) return AnnotationValue.ofByte(((Byte) value).byteValue());
    if (value instanceof Boolean) return AnnotationValue.ofBoolean(((Boolean) value).booleanValue());
    if (value instanceof Short) return AnnotationValue.ofShort(((Short) value).shortValue());
    if (value instanceof Character) return AnnotationValue.ofChar(((Character) value).charValue());
    if (value instanceof Integer) return AnnotationValue.ofInt(((Integer) value).intValue());
    if (value instanceof Long) return AnnotationValue.ofLong(((Long) value).longValue());
    if (value instanceof Float) return AnnotationValue.ofFloat(((Float) value).floatValue());
    if (value instanceof Double) return AnnotationValue.ofDouble(((Double) value).doubleValue());
    if (value instanceof ClassDesc) return AnnotationValue.ofClass((ClassDesc) value);
    List<AnnotationValue> values = new ArrayList<AnnotationValue>();
    if (value instanceof byte[]) {
      for (byte item : (byte[]) value) values.add(AnnotationValue.ofByte(item));
    } else if (value instanceof boolean[]) {
      for (boolean item : (boolean[]) value) values.add(AnnotationValue.ofBoolean(item));
    } else if (value instanceof short[]) {
      for (short item : (short[]) value) values.add(AnnotationValue.ofShort(item));
    } else if (value instanceof char[]) {
      for (char item : (char[]) value) values.add(AnnotationValue.ofChar(item));
    } else if (value instanceof int[]) {
      for (int item : (int[]) value) values.add(AnnotationValue.ofInt(item));
    } else if (value instanceof long[]) {
      for (long item : (long[]) value) values.add(AnnotationValue.ofLong(item));
    } else if (value instanceof float[]) {
      for (float item : (float[]) value) values.add(AnnotationValue.ofFloat(item));
    } else if (value instanceof double[]) {
      for (double item : (double[]) value) values.add(AnnotationValue.ofDouble(item));
    } else if (value instanceof Object[]) {
      for (Object item : (Object[]) value) values.add(of(item));
    } else if (value instanceof Enum<?>) {
      Enum<?> item = (Enum<?>) value;
      return AnnotationValue.ofEnum(ClassDesc.of(item.getDeclaringClass().getName()), item.name());
    } else {
      throw new IllegalArgumentException("Illegal annotation constant value type " + Objects.requireNonNull(value).getClass());
    }
    return array(values);
  }

  private static final class AnnotationModel implements Annotation {
    final Utf8Entry type;
    final List<AnnotationElement> elements;
    AnnotationModel(Utf8Entry type, List<AnnotationElement> elements) { this.type = type; this.elements = elements; }
    public Utf8Entry className() { return type; }
    public List<AnnotationElement> elements() { return elements; }
    public boolean equals(Object other) {
      return other instanceof AnnotationModel && type.equals(((AnnotationModel) other).type)
        && elements.equals(((AnnotationModel) other).elements);
    }
    public int hashCode() { return 31 * type.hashCode() + elements.hashCode(); }
    public String toString() { return "Annotation[" + type.stringValue() + (elements.isEmpty() ? "" : " " + elements) + "]"; }
  }
  private static final class ElementModel implements AnnotationElement {
    final Utf8Entry name;
    final AnnotationValue value;
    ElementModel(Utf8Entry name, AnnotationValue value) { this.name = name; this.value = value; }
    public Utf8Entry name() { return name; }
    public AnnotationValue value() { return value; }
    public boolean equals(Object other) {
      return other instanceof ElementModel && name.equals(((ElementModel) other).name) && value.equals(((ElementModel) other).value);
    }
    public int hashCode() { return 31 * name.hashCode() + value.hashCode(); }
    public String toString() { return name + "=" + value; }
  }

  private abstract static class SingleValue<T> implements AnnotationValue {
    final T value;
    SingleValue(T value) { this.value = value; }
    public final boolean equals(Object other) {
      return other != null && other.getClass() == getClass() && value.equals(((SingleValue<?>) other).value);
    }
    public final int hashCode() { return value.hashCode(); }
    public String toString() {
      return "Of" + getClass().getSimpleName().replace("Value", "Impl") + "["
        + (this instanceof OfArray ? "values" : this instanceof OfAnnotation ? "annotation" : this instanceof OfClass ? "className" : "constant")
        + "=" + value + "]";
    }
  }
  private static final class StringValue extends SingleValue<Utf8Entry> implements AnnotationValue.OfString {
    StringValue(Utf8Entry value) { super(value); }
    public int tag() { return TAG_STRING; }
    public Utf8Entry constant() { return value; }
    public String stringValue() { return value.stringValue(); }
  }
  private static final class DoubleValue extends SingleValue<DoubleEntry> implements AnnotationValue.OfDouble {
    DoubleValue(DoubleEntry value) { super(value); }
    public int tag() { return TAG_DOUBLE; }
    public DoubleEntry constant() { return value; }
    public double doubleValue() { return value.doubleValue(); }
  }
  private static final class FloatValue extends SingleValue<FloatEntry> implements AnnotationValue.OfFloat {
    FloatValue(FloatEntry value) { super(value); }
    public int tag() { return TAG_FLOAT; }
    public FloatEntry constant() { return value; }
    public float floatValue() { return value.floatValue(); }
  }
  private static final class LongValue extends SingleValue<LongEntry> implements AnnotationValue.OfLong {
    LongValue(LongEntry value) { super(value); }
    public int tag() { return TAG_LONG; }
    public LongEntry constant() { return value; }
    public long longValue() { return value.longValue(); }
  }
  private static final class IntValue extends SingleValue<IntegerEntry> implements AnnotationValue.OfInt {
    IntValue(IntegerEntry value) { super(value); }
    public int tag() { return TAG_INT; }
    public IntegerEntry constant() { return value; }
    public int intValue() { return value.intValue(); }
  }
  private static final class ShortValue extends SingleValue<IntegerEntry> implements AnnotationValue.OfShort {
    ShortValue(IntegerEntry value) { super(value); }
    public int tag() { return TAG_SHORT; }
    public IntegerEntry constant() { return value; }
    public short shortValue() { return (short) value.intValue(); }
  }
  private static final class CharValue extends SingleValue<IntegerEntry> implements AnnotationValue.OfChar {
    CharValue(IntegerEntry value) { super(value); }
    public int tag() { return TAG_CHAR; }
    public IntegerEntry constant() { return value; }
    public char charValue() { return (char) value.intValue(); }
  }
  private static final class ByteValue extends SingleValue<IntegerEntry> implements AnnotationValue.OfByte {
    ByteValue(IntegerEntry value) { super(value); }
    public int tag() { return TAG_BYTE; }
    public IntegerEntry constant() { return value; }
    public byte byteValue() { return (byte) value.intValue(); }
  }
  private static final class BooleanValue extends SingleValue<IntegerEntry> implements AnnotationValue.OfBoolean {
    BooleanValue(IntegerEntry value) { super(value); }
    public int tag() { return TAG_BOOLEAN; }
    public IntegerEntry constant() { return value; }
    public boolean booleanValue() { return value.intValue() != 0; }
  }
  private static final class ClassValue extends SingleValue<Utf8Entry> implements AnnotationValue.OfClass {
    ClassValue(Utf8Entry value) { super(value); }
    public int tag() { return TAG_CLASS; }
    public Utf8Entry className() { return value; }
  }
  private static final class NestedValue extends SingleValue<Annotation> implements AnnotationValue.OfAnnotation {
    NestedValue(Annotation value) { super(value); }
    public int tag() { return TAG_ANNOTATION; }
    public Annotation annotation() { return value; }
    public String toString() { return "OfAnnotationImpl[annotation=" + value + "]"; }
  }
  private static final class ArrayValue extends SingleValue<List<AnnotationValue>> implements AnnotationValue.OfArray {
    ArrayValue(List<AnnotationValue> value) { super(value); }
    public int tag() { return TAG_ARRAY; }
    public List<AnnotationValue> values() { return value; }
  }
  private static final class EnumValue implements AnnotationValue.OfEnum {
    final Utf8Entry type, name;
    EnumValue(Utf8Entry type, Utf8Entry name) { this.type = type; this.name = name; }
    public int tag() { return TAG_ENUM; }
    public Utf8Entry className() { return type; }
    public Utf8Entry constantName() { return name; }
    public boolean equals(Object other) {
      return other instanceof EnumValue && type.equals(((EnumValue) other).type) && name.equals(((EnumValue) other).name);
    }
    public int hashCode() { return 31 * type.hashCode() + name.hashCode(); }
    public String toString() { return "OfEnumImpl[className=" + type + ", constantName=" + name + "]"; }
  }
}
