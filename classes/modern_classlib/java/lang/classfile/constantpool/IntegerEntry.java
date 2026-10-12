package java.lang.classfile.constantpool;

import java.lang.classfile.TypeKind;
public interface IntegerEntry extends AnnotationConstantValueEntry, ConstantValueEntry {
  int intValue();
  default TypeKind typeKind() { return TypeKind.INT; }
}
