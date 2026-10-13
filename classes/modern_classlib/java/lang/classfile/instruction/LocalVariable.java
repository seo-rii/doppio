package java.lang.classfile.instruction;

import java.lang.classfile.Label;
import java.lang.classfile.PseudoInstruction;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;

public interface LocalVariable extends PseudoInstruction {
  int slot();
  Utf8Entry name();
  Utf8Entry type();
  Label startScope();
  Label endScope();
  default ClassDesc typeSymbol() { return ClassDesc.ofDescriptor(type().stringValue()); }
  static LocalVariable of(int slot, Utf8Entry name, Utf8Entry descriptor, Label start, Label end) {
    return DoppioDebugInstructions.localVariable(slot, name, descriptor, start, end);
  }
  static LocalVariable of(int slot, String name, ClassDesc descriptor, Label start, Label end) {
    return of(slot, DoppioConstantPool.temporaryPool().utf8Entry(name),
      DoppioConstantPool.temporaryPool().utf8Entry(descriptor), start, end);
  }
}
