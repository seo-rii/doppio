package java.lang.classfile.instruction;

import java.lang.classfile.*;
public interface LineNumber extends PseudoInstruction {
  int line();
  static LineNumber of(int line) { return DoppioClassReader.lineNumber(line); }
}
