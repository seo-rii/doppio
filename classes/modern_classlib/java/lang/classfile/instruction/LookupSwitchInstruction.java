package java.lang.classfile.instruction;

import java.lang.classfile.*;
import java.util.List;

public interface LookupSwitchInstruction extends Instruction {
  Label defaultTarget();
  List<SwitchCase> cases();
  static LookupSwitchInstruction of(Label defaultTarget, List<SwitchCase> cases) {
    return DoppioClassReader.lookupSwitch(defaultTarget, cases);
  }
}
