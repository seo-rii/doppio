package java.lang.classfile.instruction;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.MethodTypeDesc;
public interface InvokeInstruction extends Instruction {
  MemberRefEntry method();
  boolean isInterface();
  int count();
  default ClassEntry owner() { return method().owner(); }
  default Utf8Entry name() { return method().name(); }
  default Utf8Entry type() { return method().type(); }
  default MethodTypeDesc typeSymbol() { return MethodTypeDesc.ofDescriptor(type().stringValue()); }
  static InvokeInstruction of(Opcode opcode, MemberRefEntry method) { return DoppioClassReader.invoke(opcode, method); }
  static InvokeInstruction of(Opcode opcode, ClassEntry owner, Utf8Entry name, Utf8Entry type, boolean isInterface) {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    return of(opcode, owner, pool.nameAndTypeEntry(name, type), isInterface);
  }
  static InvokeInstruction of(Opcode opcode, ClassEntry owner, NameAndTypeEntry method, boolean isInterface) {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    return of(opcode, isInterface ? pool.interfaceMethodRefEntry(owner, method) : pool.methodRefEntry(owner, method));
  }
}
