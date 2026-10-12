package java.lang.classfile.constantpool;

import java.lang.classfile.TypeKind;
public interface FloatEntry extends AnnotationConstantValueEntry, ConstantValueEntry {
  float floatValue();
  default TypeKind typeKind() { return TypeKind.FLOAT; }
}
