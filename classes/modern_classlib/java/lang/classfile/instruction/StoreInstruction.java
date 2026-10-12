package java.lang.classfile.instruction;

import java.lang.classfile.*;
public interface StoreInstruction extends Instruction {
  int slot();
  TypeKind typeKind();
  static StoreInstruction of(TypeKind kind, int slot) { return DoppioClassReader.store(kind, slot); }
  static StoreInstruction of(Opcode opcode, int slot) { return DoppioClassReader.store(opcode, slot); }
}
