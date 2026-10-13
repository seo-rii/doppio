package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Label;
import java.lang.classfile.Opcode;

/** Instructions whose use is restricted to the old class-file subroutine profile. */
public interface DiscontinuedInstruction extends Instruction {
  interface JsrInstruction extends DiscontinuedInstruction {
    Label target();
    static JsrInstruction of(Opcode opcode, Label target) {
      return DoppioDiscontinuedInstructions.jsr(opcode, target);
    }
    static JsrInstruction of(Label target) { return of(Opcode.JSR, target); }
  }
  interface RetInstruction extends DiscontinuedInstruction {
    int slot();
    static RetInstruction of(Opcode opcode, int slot) {
      return DoppioDiscontinuedInstructions.ret(opcode, slot);
    }
    static RetInstruction of(int slot) { return of(slot < 256 ? Opcode.RET : Opcode.RET_W, slot); }
  }
}
