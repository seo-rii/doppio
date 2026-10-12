package java.lang.classfile.constantpool;

import java.lang.constant.ClassDesc;
public interface FieldRefEntry extends MemberRefEntry {
  default ClassDesc typeSymbol() { return ClassDesc.ofDescriptor(type().stringValue()); }
}
