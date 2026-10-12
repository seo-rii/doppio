package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.constantpool.ClassEntry;

public interface NewReferenceArrayInstruction extends Instruction {
  ClassEntry componentType();
  static NewReferenceArrayInstruction of(ClassEntry componentType) { return DoppioMemoryInstructions.newReferenceArray(componentType); }
}
