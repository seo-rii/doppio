package java.lang.classfile.instruction;

import java.lang.classfile.Label;
import java.lang.classfile.PseudoInstruction;

public interface CharacterRange extends PseudoInstruction {
  int FLAG_STATEMENT = 1;
  int FLAG_BLOCK = 2;
  int FLAG_ASSIGNMENT = 4;
  int FLAG_FLOW_CONTROLLER = 8;
  int FLAG_FLOW_TARGET = 16;
  int FLAG_INVOKE = 32;
  int FLAG_CREATE = 64;
  int FLAG_BRANCH_TRUE = 128;
  int FLAG_BRANCH_FALSE = 256;
  Label startScope();
  Label endScope();
  int characterRangeStart();
  int characterRangeEnd();
  int flags();
  static CharacterRange of(Label start, Label end, int rangeStart, int rangeEnd, int flags) {
    return DoppioDebugInstructions.characterRange(start, end, rangeStart, rangeEnd, flags);
  }
}
