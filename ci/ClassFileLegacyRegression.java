package classes.modern_test;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.DiscontinuedInstruction;
import java.lang.classfile.instruction.DiscontinuedInstruction.JsrInstruction;
import java.lang.classfile.instruction.DiscontinuedInstruction.RetInstruction;

/** Additional factory boundaries followed by the unchanged eight-case native original. */
public final class ClassFileLegacyRegression {
  private static int checks;
  private static void check(boolean condition) {if(!condition)throw new AssertionError("legacy regression "+checks);checks++;}
  public static void main(String[] args)throws Throwable {
    check(DiscontinuedInstruction.class.getInterfaces()[0]==Instruction.class);
    check(JsrInstruction.class.getInterfaces()[0]==DiscontinuedInstruction.class);
    check(RetInstruction.class.getInterfaces()[0]==DiscontinuedInstruction.class);
    check(Opcode.JSR.bytecode()==168&&Opcode.JSR.sizeIfFixed()==3&&Opcode.JSR.kind()==Opcode.Kind.DISCONTINUED_JSR);
    check(Opcode.JSR_W.bytecode()==201&&Opcode.JSR_W.sizeIfFixed()==5);
    check(Opcode.RET.bytecode()==169&&Opcode.RET.sizeIfFixed()==2&&Opcode.RET.kind()==Opcode.Kind.DISCONTINUED_RET);
    check(Opcode.RET_W.bytecode()==50345&&Opcode.RET_W.sizeIfFixed()==4&&Opcode.RET_W.isWide());
    for(int slot:new int[]{0,1,255,256,300,65535}) {
      RetInstruction value=RetInstruction.of(slot);check(value.slot()==slot&&value.opcode()==(slot<256?Opcode.RET:Opcode.RET_W));
      RetInstruction wide=RetInstruction.of(Opcode.RET_W,slot);check(wide.slot()==slot&&wide.sizeInBytes()==4&&wide.opcode()==Opcode.RET_W);
    }
    for(int slot:new int[]{-1,Integer.MIN_VALUE,65536,Integer.MAX_VALUE}) {
      try{RetInstruction.of(slot);throw new AssertionError("invalid slot");}catch(IllegalArgumentException expected){checks++;}
    }
    check(checks==23);
    ClassFileLegacyFinal.main(args);
    System.out.println("CLASSFILE_LEGACY_REGRESSION_OK|24");
  }
}
