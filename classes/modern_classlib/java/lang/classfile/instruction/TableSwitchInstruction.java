package java.lang.classfile.instruction;

import java.lang.classfile.*;
import java.util.List;

public interface TableSwitchInstruction extends Instruction {
  int lowValue();
  int highValue();
  Label defaultTarget();
  List<SwitchCase> cases();
  static TableSwitchInstruction of(int low, int high, Label defaultTarget, List<SwitchCase> cases) {
    return DoppioClassReader.tableSwitch(low, high, defaultTarget, cases);
  }
}
