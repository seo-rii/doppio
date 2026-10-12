package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.TypeKind;

public interface NewPrimitiveArrayInstruction extends Instruction {
  TypeKind typeKind();
  static NewPrimitiveArrayInstruction of(TypeKind typeKind) { return DoppioMemoryInstructions.newPrimitiveArray(typeKind); }
}
