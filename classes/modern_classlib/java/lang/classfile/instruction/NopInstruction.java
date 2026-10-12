package java.lang.classfile.instruction;

import java.lang.classfile.*;
public interface NopInstruction extends Instruction {
  static NopInstruction of() { return DoppioClassReader.nop(); }
}
