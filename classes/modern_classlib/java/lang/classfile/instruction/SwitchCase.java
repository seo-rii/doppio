package java.lang.classfile.instruction;

import java.lang.classfile.DoppioClassReader;
import java.lang.classfile.Label;

public interface SwitchCase {
  int caseValue();
  Label target();
  static SwitchCase of(int value, Label target) {
    return DoppioClassReader.switchCase(value, target);
  }
}
