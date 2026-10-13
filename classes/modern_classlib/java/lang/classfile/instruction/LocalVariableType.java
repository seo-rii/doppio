package java.lang.classfile.instruction;

import java.lang.classfile.Label;
import java.lang.classfile.PseudoInstruction;
import java.lang.classfile.Signature;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;

public interface LocalVariableType extends PseudoInstruction {
  int slot();
  Utf8Entry name();
  Utf8Entry signature();
  Label startScope();
  Label endScope();
  default Signature signatureSymbol() { return Signature.parseFrom(signature().stringValue()); }
  static LocalVariableType of(int slot, Utf8Entry name, Utf8Entry signature, Label start, Label end) {
    return DoppioDebugInstructions.localVariableType(slot, name, signature, start, end);
  }
  static LocalVariableType of(int slot, String name, Signature signature, Label start, Label end) {
    return of(slot, DoppioConstantPool.temporaryPool().utf8Entry(name),
      DoppioConstantPool.temporaryPool().utf8Entry(signature.signatureString()), start, end);
  }
}
