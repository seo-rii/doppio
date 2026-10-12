package java.lang.classfile.instruction;

import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.util.Objects;

/** Real instruction values; compiled against nominal boxed-constant declarations. */
public final class DoppioConstantInstructions {
  private DoppioConstantInstructions() {}

  static ConstantInstruction.IntrinsicConstantInstruction intrinsic(Opcode opcode) {
    intrinsicKind(opcode);
    return new IntrinsicValue(opcode);
  }

  static TypeKind intrinsicKind(Opcode opcode) {
    int code = Objects.requireNonNull(opcode).bytecode();
    if (code == 1) return TypeKind.REFERENCE;
    if (code >= 2 && code <= 8) return TypeKind.INT;
    if (code >= 9 && code <= 10) return TypeKind.LONG;
    if (code >= 11 && code <= 13) return TypeKind.FLOAT;
    if (code >= 14 && code <= 15) return TypeKind.DOUBLE;
    throw new IllegalArgumentException("Not an intrinsic constant");
  }

  static ConstantInstruction.ArgumentConstantInstruction argument(Opcode opcode, int value) {
    // The native immediate factory rejects a null opcode as an invalid opcode.
    if (opcode != Opcode.BIPUSH && opcode != Opcode.SIPUSH)
      throw new IllegalArgumentException("Not an argument constant");
    if (opcode == Opcode.BIPUSH && (value < -128 || value > 127) ||
        opcode == Opcode.SIPUSH && (value < -32768 || value > 32767))
      throw new IllegalArgumentException("Constant operand overflow");
    return new ArgumentValue(opcode, value);
  }

  static ConstantInstruction.LoadConstantInstruction load(Opcode opcode, LoadableConstantEntry constant) {
    Objects.requireNonNull(opcode);
    if (opcode != Opcode.LDC && opcode != Opcode.LDC_W && opcode != Opcode.LDC2_W)
      throw new IllegalArgumentException("Not a constant-pool load opcode");
    // Native factories preserve the selected opcode; category and index validity
    // are writer/verifier decisions rather than instruction-value restrictions.
    return new LoadValue(opcode, Objects.requireNonNull(constant));
  }

  private abstract static class Value implements ConstantInstruction {
    final Opcode opcode;
    Value(Opcode opcode) { this.opcode = opcode; }
    public Opcode opcode() { return opcode; }
    public int sizeInBytes() { return opcode.sizeIfFixed(); }
  }

  private static final class IntrinsicValue extends Value implements ConstantInstruction.IntrinsicConstantInstruction {
    IntrinsicValue(Opcode opcode) { super(opcode); }
    public ConstantDesc constantValue() {
      int code = opcode.bytecode();
      if (code == 1) return ConstantDescs.NULL;
      if (code >= 2 && code <= 8) return Integer.valueOf(code - 3);
      if (code >= 9 && code <= 10) return Long.valueOf(code - 9);
      if (code >= 11 && code <= 13) return Float.valueOf(code - 11);
      if (code >= 14 && code <= 15) return Double.valueOf(code - 14);
      throw new IllegalArgumentException("Not an intrinsic constant");
    }
  }

  private static final class ArgumentValue extends Value implements ConstantInstruction.ArgumentConstantInstruction {
    final int value;
    ArgumentValue(Opcode opcode, int value) { super(opcode); this.value = value; }
    public Integer constantValue() { return Integer.valueOf(value); }
  }

  private static final class LoadValue extends Value implements ConstantInstruction.LoadConstantInstruction {
    final LoadableConstantEntry constant;
    LoadValue(Opcode opcode, LoadableConstantEntry constant) { super(opcode); this.constant = constant; }
    public LoadableConstantEntry constantEntry() { return constant; }
    public ConstantDesc constantValue() { return constant.constantValue(); }
  }
}
