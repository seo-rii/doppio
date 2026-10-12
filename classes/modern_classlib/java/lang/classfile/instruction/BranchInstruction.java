package java.lang.classfile.instruction;

import java.lang.classfile.*;

public interface BranchInstruction extends Instruction {
  Label target();
  static BranchInstruction of(Opcode opcode, Label target) {
    return DoppioClassReader.branch(opcode, target);
  }
}
