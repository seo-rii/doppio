package java.lang.classfile.attribute;

import java.lang.classfile.constantpool.Utf8Entry;

public interface LocalVariableTypeInfo {
  int startPc();
  int length();
  Utf8Entry name();
  Utf8Entry signature();
  int slot();
}
