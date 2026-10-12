package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;

public interface MonitorInstruction extends Instruction {
  static MonitorInstruction of(Opcode opcode) { return DoppioMemoryInstructions.monitor(opcode); }
}
