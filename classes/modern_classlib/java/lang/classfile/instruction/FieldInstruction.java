package java.lang.classfile.instruction;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.ClassDesc;
public interface FieldInstruction extends Instruction {
  FieldRefEntry field();
  default ClassEntry owner() { return field().owner(); }
  default Utf8Entry name() { return field().name(); }
  default Utf8Entry type() { return field().type(); }
  default ClassDesc typeSymbol() { return field().typeSymbol(); }
  static FieldInstruction of(Opcode opcode, FieldRefEntry field) { return DoppioClassReader.field(opcode, field); }
  static FieldInstruction of(Opcode opcode, ClassEntry owner, Utf8Entry name, Utf8Entry type) {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    return of(opcode, pool.fieldRefEntry(owner, pool.nameAndTypeEntry(name, type)));
  }
  static FieldInstruction of(Opcode opcode, ClassEntry owner, NameAndTypeEntry field) {
    return of(opcode, ConstantPoolBuilder.of().fieldRefEntry(owner, field));
  }
}
