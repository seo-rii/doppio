package java.lang.classfile.instruction;

import java.lang.classfile.*;

public interface IncrementInstruction extends Instruction {
  int slot();
  int constant();
  static IncrementInstruction of(int slot, int constant) {
    return DoppioClassReader.increment(slot, constant);
  }
}
