package java.lang.classfile;

import java.lang.classfile.constantpool.AnnotationConstantValueEntry;
import java.lang.classfile.constantpool.DoubleEntry;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.FloatEntry;
import java.lang.classfile.constantpool.IntegerEntry;
import java.lang.classfile.constantpool.LongEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.constant.Constable;
import java.util.List;

/** The thirteen tagged annotation-value forms and their precise resolved types. */
public interface AnnotationValue {
  int TAG_BYTE = 'B', TAG_CHAR = 'C', TAG_DOUBLE = 'D', TAG_FLOAT = 'F', TAG_INT = 'I',
    TAG_LONG = 'J', TAG_SHORT = 'S', TAG_BOOLEAN = 'Z', TAG_STRING = 's', TAG_ENUM = 'e',
    TAG_CLASS = 'c', TAG_ANNOTATION = '@', TAG_ARRAY = '[';
  int tag();

  interface OfAnnotation extends AnnotationValue { Annotation annotation(); }
  interface OfArray extends AnnotationValue { List<AnnotationValue> values(); }
  interface OfConstant extends AnnotationValue {
    AnnotationConstantValueEntry constant();
    Constable resolvedValue();
  }
  interface OfString extends OfConstant {
    Utf8Entry constant();
    String stringValue();
    default String resolvedValue() { return stringValue(); }
  }
  interface OfDouble extends OfConstant {
    DoubleEntry constant();
    double doubleValue();
    default Double resolvedValue() { return Double.valueOf(doubleValue()); }
  }
  interface OfFloat extends OfConstant {
    FloatEntry constant();
    float floatValue();
    default Float resolvedValue() { return Float.valueOf(floatValue()); }
  }
  interface OfLong extends OfConstant {
    LongEntry constant();
    long longValue();
    default Long resolvedValue() { return Long.valueOf(longValue()); }
  }
  interface OfInt extends OfConstant {
    IntegerEntry constant();
    int intValue();
    default Integer resolvedValue() { return Integer.valueOf(intValue()); }
  }
  interface OfShort extends OfConstant {
    IntegerEntry constant();
    short shortValue();
    default Short resolvedValue() { return Short.valueOf(shortValue()); }
  }
  interface OfChar extends OfConstant {
    IntegerEntry constant();
    char charValue();
    default Character resolvedValue() { return Character.valueOf(charValue()); }
  }
  interface OfByte extends OfConstant {
    IntegerEntry constant();
    byte byteValue();
    default Byte resolvedValue() { return Byte.valueOf(byteValue()); }
  }
  interface OfBoolean extends OfConstant {
    IntegerEntry constant();
    boolean booleanValue();
    default Boolean resolvedValue() { return Boolean.valueOf(booleanValue()); }
  }
  interface OfClass extends AnnotationValue {
    Utf8Entry className();
    default ClassDesc classSymbol() { return ClassDesc.ofDescriptor(className().stringValue()); }
  }
  interface OfEnum extends AnnotationValue {
    Utf8Entry className();
    default ClassDesc classSymbol() { return ClassDesc.ofDescriptor(className().stringValue()); }
    Utf8Entry constantName();
  }

  static OfEnum ofEnum(Utf8Entry className, Utf8Entry constantName) { return DoppioAnnotations.enumValue(className, constantName); }
  static OfEnum ofEnum(ClassDesc className, String constantName) {
    return ofEnum(DoppioConstantPool.temporaryPool().utf8Entry(className), DoppioConstantPool.temporaryPool().utf8Entry(constantName));
  }
  static OfClass ofClass(Utf8Entry className) { return DoppioAnnotations.classValue(className); }
  static OfClass ofClass(ClassDesc className) { return ofClass(DoppioConstantPool.temporaryPool().utf8Entry(className)); }
  static OfString ofString(Utf8Entry value) { return DoppioAnnotations.string(value); }
  static OfString ofString(String value) { return ofString(DoppioConstantPool.temporaryPool().utf8Entry(value)); }
  static OfDouble ofDouble(DoubleEntry value) { return DoppioAnnotations.doubleValue(value); }
  static OfDouble ofDouble(double value) { return ofDouble(DoppioConstantPool.temporaryPool().doubleEntry(value)); }
  static OfFloat ofFloat(FloatEntry value) { return DoppioAnnotations.floatValue(value); }
  static OfFloat ofFloat(float value) { return ofFloat(DoppioConstantPool.temporaryPool().floatEntry(value)); }
  static OfLong ofLong(LongEntry value) { return DoppioAnnotations.longValue(value); }
  static OfLong ofLong(long value) { return ofLong(DoppioConstantPool.temporaryPool().longEntry(value)); }
  static OfInt ofInt(IntegerEntry value) { return DoppioAnnotations.intValue(value); }
  static OfInt ofInt(int value) { return ofInt(DoppioConstantPool.temporaryPool().intEntry(value)); }
  static OfShort ofShort(IntegerEntry value) { return DoppioAnnotations.shortValue(value); }
  static OfShort ofShort(short value) { return ofShort(DoppioConstantPool.temporaryPool().intEntry(value)); }
  static OfChar ofChar(IntegerEntry value) { return DoppioAnnotations.charValue(value); }
  static OfChar ofChar(char value) { return ofChar(DoppioConstantPool.temporaryPool().intEntry(value)); }
  static OfByte ofByte(IntegerEntry value) { return DoppioAnnotations.byteValue(value); }
  static OfByte ofByte(byte value) { return ofByte(DoppioConstantPool.temporaryPool().intEntry(value)); }
  static OfBoolean ofBoolean(IntegerEntry value) { return DoppioAnnotations.booleanValue(value); }
  static OfBoolean ofBoolean(boolean value) { return ofBoolean(DoppioConstantPool.temporaryPool().intEntry(value ? 1 : 0)); }
  static OfAnnotation ofAnnotation(Annotation value) { return DoppioAnnotations.nested(value); }
  static OfArray ofArray(List<AnnotationValue> values) { return DoppioAnnotations.array(values); }
  static OfArray ofArray(AnnotationValue... values) { return ofArray(List.of(values)); }
  static AnnotationValue of(Object value) { return DoppioAnnotations.of(value); }
}
