package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.constant.ClassDesc;

public interface TypeCheckInstruction extends Instruction {
  ClassEntry type();
  static TypeCheckInstruction of(Opcode opcode, ClassEntry type) { return DoppioMemoryInstructions.typeCheck(opcode, type); }
  static TypeCheckInstruction of(Opcode opcode, ClassDesc type) { return DoppioMemoryInstructions.typeCheck(opcode, type); }
}
