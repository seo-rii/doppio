package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.constant.ConstantDesc;

/** Typed intrinsic, immediate, and constant-pool load instructions. */
public interface ConstantInstruction extends Instruction {
  ConstantDesc constantValue();
  TypeKind typeKind();
  interface IntrinsicConstantInstruction extends ConstantInstruction {
    default TypeKind typeKind() { return DoppioConstantInstructions.intrinsicKind(opcode()); }
  }
  interface ArgumentConstantInstruction extends ConstantInstruction {
    Integer constantValue();
    default TypeKind typeKind() { return TypeKind.INT; }
  }
  interface LoadConstantInstruction extends ConstantInstruction {
    LoadableConstantEntry constantEntry();
    default TypeKind typeKind() { return constantEntry().typeKind(); }
  }
  static IntrinsicConstantInstruction ofIntrinsic(Opcode opcode) {
    return DoppioConstantInstructions.intrinsic(opcode);
  }
  static ArgumentConstantInstruction ofArgument(Opcode opcode, int value) {
    return DoppioConstantInstructions.argument(opcode, value);
  }
  static LoadConstantInstruction ofLoad(Opcode opcode, LoadableConstantEntry constant) {
    return DoppioConstantInstructions.load(opcode, constant);
  }
}
