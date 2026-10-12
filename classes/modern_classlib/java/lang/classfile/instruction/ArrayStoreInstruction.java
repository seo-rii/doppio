package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;

public interface ArrayStoreInstruction extends Instruction {
  TypeKind typeKind();
  static ArrayStoreInstruction of(Opcode opcode) { return DoppioMemoryInstructions.arrayStore(opcode); }
}
