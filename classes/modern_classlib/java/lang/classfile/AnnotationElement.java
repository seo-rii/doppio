package java.lang.classfile;

import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;

/** A named annotation element value. */
public interface AnnotationElement {
  Utf8Entry name();
  AnnotationValue value();

  static AnnotationElement of(Utf8Entry name, AnnotationValue value) {
    return DoppioAnnotations.element(name, value);
  }
  static AnnotationElement of(String name, AnnotationValue value) {
    return of(DoppioConstantPool.temporaryPool().utf8Entry(name), value);
  }
  static AnnotationElement ofClass(String name, ClassDesc value) { return of(name, AnnotationValue.ofClass(value)); }
  static AnnotationElement ofString(String name, String value) { return of(name, AnnotationValue.ofString(value)); }
  static AnnotationElement ofLong(String name, long value) { return of(name, AnnotationValue.ofLong(value)); }
  static AnnotationElement ofInt(String name, int value) { return of(name, AnnotationValue.ofInt(value)); }
  static AnnotationElement ofChar(String name, char value) { return of(name, AnnotationValue.ofChar(value)); }
  static AnnotationElement ofShort(String name, short value) { return of(name, AnnotationValue.ofShort(value)); }
  static AnnotationElement ofByte(String name, byte value) { return of(name, AnnotationValue.ofByte(value)); }
  static AnnotationElement ofBoolean(String name, boolean value) { return of(name, AnnotationValue.ofBoolean(value)); }
  static AnnotationElement ofDouble(String name, double value) { return of(name, AnnotationValue.ofDouble(value)); }
  static AnnotationElement ofFloat(String name, float value) { return of(name, AnnotationValue.ofFloat(value)); }
  static AnnotationElement ofAnnotation(String name, Annotation value) { return of(name, AnnotationValue.ofAnnotation(value)); }
  static AnnotationElement ofArray(String name, AnnotationValue... values) { return of(name, AnnotationValue.ofArray(values)); }
}
