package java.lang.classfile.instruction;

import java.lang.classfile.*;

public interface ConvertInstruction extends Instruction {
  TypeKind fromType();
  TypeKind toType();
  static ConvertInstruction of(TypeKind from, TypeKind to) { return DoppioClassReader.convert(from, to); }
  static ConvertInstruction of(Opcode opcode) { return DoppioClassReader.convert(opcode); }
}
