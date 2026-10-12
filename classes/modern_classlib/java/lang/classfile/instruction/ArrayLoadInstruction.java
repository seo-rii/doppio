package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;

public interface ArrayLoadInstruction extends Instruction {
  TypeKind typeKind();
  static ArrayLoadInstruction of(Opcode opcode) { return DoppioMemoryInstructions.arrayLoad(opcode); }
}
