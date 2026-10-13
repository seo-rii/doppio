package java.lang.classfile.instruction;

import java.lang.classfile.Label;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.DiscontinuedInstruction.JsrInstruction;
import java.lang.classfile.instruction.DiscontinuedInstruction.RetInstruction;
import java.util.Objects;

/** Pure instruction values; neither slot counting nor construction proves legacy verification. */
final class DoppioDiscontinuedInstructions {
  private DoppioDiscontinuedInstructions() {}
  static JsrInstruction jsr(Opcode opcode, Label target) {
    if (Objects.requireNonNull(opcode).kind() != Opcode.Kind.DISCONTINUED_JSR)
      throw new IllegalArgumentException("Invalid instruction opcode kind");
    return new JsrValue(opcode, Objects.requireNonNull(target));
  }
  static RetInstruction ret(Opcode opcode, int slot) {
    if (!(opcode == Opcode.RET && (slot & ~255) == 0 || opcode == Opcode.RET_W && (slot & ~65535) == 0)) {
      Objects.requireNonNull(opcode);
      throw new IllegalArgumentException("Invalid subroutine return opcode or local slot");
    }
    return new RetValue(opcode, slot);
  }
  private static final class JsrValue implements JsrInstruction {
    final Opcode opcode; final Label target;
    JsrValue(Opcode opcode, Label target) { this.opcode = opcode; this.target = target; }
    public Opcode opcode() { return opcode; }
    public int sizeInBytes() { return opcode.sizeIfFixed(); }
    public Label target() { return target; }
  }
  private static final class RetValue implements RetInstruction {
    final Opcode opcode; final int slot;
    RetValue(Opcode opcode, int slot) { this.opcode = opcode; this.slot = slot; }
    public Opcode opcode() { return opcode; }
    public int sizeInBytes() { return opcode.sizeIfFixed(); }
    public int slot() { return slot; }
  }
}
