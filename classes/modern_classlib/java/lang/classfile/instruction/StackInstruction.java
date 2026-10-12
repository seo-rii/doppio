package java.lang.classfile.instruction;

import java.lang.classfile.*;
public interface StackInstruction extends Instruction {
  static StackInstruction of(Opcode opcode) { return DoppioClassReader.stack(opcode); }
}
