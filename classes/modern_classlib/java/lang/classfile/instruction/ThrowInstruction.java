package java.lang.classfile.instruction;

import java.lang.classfile.*;

public interface ThrowInstruction extends Instruction {
  static ThrowInstruction of() { return DoppioClassReader.throwInstruction(); }
}
