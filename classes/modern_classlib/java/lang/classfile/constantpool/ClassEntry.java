package java.lang.classfile.constantpool;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
public interface ClassEntry extends LoadableConstantEntry {
  default ConstantDesc constantValue() { return asSymbol(); }
  Utf8Entry name();
  String asInternalName();
  ClassDesc asSymbol();
  boolean matches(ClassDesc descriptor);
}
