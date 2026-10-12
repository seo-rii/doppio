package java.lang.classfile.instruction;

import java.lang.classfile.*;
public interface OperatorInstruction extends Instruction {
  TypeKind typeKind();
  static OperatorInstruction of(Opcode opcode) { return DoppioClassReader.operator(opcode); }
}
