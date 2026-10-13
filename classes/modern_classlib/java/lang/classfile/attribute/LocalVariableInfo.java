package java.lang.classfile.attribute;

import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;

public interface LocalVariableInfo {
  int startPc();
  int length();
  Utf8Entry name();
  Utf8Entry type();
  default ClassDesc typeSymbol() { return ClassDesc.ofDescriptor(type().stringValue()); }
  int slot();
}
