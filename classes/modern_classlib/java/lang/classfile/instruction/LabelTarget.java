package java.lang.classfile.instruction;

import java.lang.classfile.*;

public interface LabelTarget extends PseudoInstruction {
  Label label();
}
