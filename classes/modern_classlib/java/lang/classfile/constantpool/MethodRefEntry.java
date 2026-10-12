package java.lang.classfile.constantpool;

import java.lang.constant.MethodTypeDesc;
public interface MethodRefEntry extends MemberRefEntry {
  default MethodTypeDesc typeSymbol() { return MethodTypeDesc.ofDescriptor(type().stringValue()); }
}
