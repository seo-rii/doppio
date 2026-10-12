package java.lang.classfile.instruction;

import java.lang.classfile.*;
public interface ReturnInstruction extends Instruction {
  TypeKind typeKind();
  static ReturnInstruction of(TypeKind kind) { return DoppioClassReader.returnInstruction(kind); }
  static ReturnInstruction of(Opcode opcode) { return DoppioClassReader.returnInstruction(opcode); }
}
