package java.lang.classfile.instruction;

import java.lang.classfile.DoppioClassReader;
import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.constant.ConstantDesc;

/** The selected base and load-entry contracts; unselected boxed covariance factories are omitted. */
public interface ConstantInstruction extends Instruction {
  ConstantDesc constantValue();
  TypeKind typeKind();
  interface LoadConstantInstruction extends ConstantInstruction {
    LoadableConstantEntry constantEntry();
    default TypeKind typeKind() { return constantEntry().typeKind(); }
  }
  static LoadConstantInstruction ofLoad(Opcode opcode, LoadableConstantEntry constant) {
    return DoppioClassReader.loadConstant(opcode, constant);
  }
}
