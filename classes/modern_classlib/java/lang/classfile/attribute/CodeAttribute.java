package java.lang.classfile.attribute;

import java.lang.classfile.*;
public interface CodeAttribute extends Attribute<CodeAttribute>, CodeModel {
  int maxLocals();
  int maxStack();
  int codeLength();
  byte[] codeArray();
  int labelToBci(Label label);
}
