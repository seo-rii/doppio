package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.constantpool.ClassEntry;

public interface NewMultiArrayInstruction extends Instruction {
  ClassEntry arrayType();
  int dimensions();
  static NewMultiArrayInstruction of(ClassEntry arrayType, int dimensions) {
    return DoppioMemoryInstructions.newMultiArray(arrayType, dimensions);
  }
}
