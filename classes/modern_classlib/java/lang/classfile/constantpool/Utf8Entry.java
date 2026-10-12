package java.lang.classfile.constantpool;

import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
public interface Utf8Entry extends CharSequence, AnnotationConstantValueEntry {
  String stringValue();
  boolean equalsString(String value);
  boolean isFieldType(ClassDesc descriptor);
  boolean isMethodType(MethodTypeDesc descriptor);
}
