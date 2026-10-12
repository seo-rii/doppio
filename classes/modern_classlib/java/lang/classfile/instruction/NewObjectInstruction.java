package java.lang.classfile.instruction;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.ClassEntry;

public interface NewObjectInstruction extends Instruction {
  ClassEntry className();
  static NewObjectInstruction of(ClassEntry className) { return DoppioClassReader.newObject(className); }
}
