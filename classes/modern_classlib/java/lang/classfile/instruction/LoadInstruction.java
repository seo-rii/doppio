package java.lang.classfile.instruction;

import java.lang.classfile.*;
public interface LoadInstruction extends Instruction {
  int slot();
  TypeKind typeKind();
  static LoadInstruction of(TypeKind kind, int slot) { return DoppioClassReader.load(kind, slot); }
  static LoadInstruction of(Opcode opcode, int slot) { return DoppioClassReader.load(opcode, slot); }
}
