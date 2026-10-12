package java.lang.classfile.constantpool;

import java.lang.classfile.TypeKind;
public interface DoubleEntry extends AnnotationConstantValueEntry, ConstantValueEntry {
  double doubleValue();
  default TypeKind typeKind() { return TypeKind.DOUBLE; }
}
