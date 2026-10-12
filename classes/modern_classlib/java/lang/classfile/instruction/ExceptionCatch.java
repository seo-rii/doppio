package java.lang.classfile.instruction;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.ClassEntry;
import java.util.Optional;
public interface ExceptionCatch extends PseudoInstruction {
  Label handler();
  Label tryStart();
  Label tryEnd();
  Optional<ClassEntry> catchType();
  static ExceptionCatch of(Label handler, Label start, Label end, Optional<ClassEntry> catchType) {
    return DoppioClassReader.exceptionCatch(handler, start, end, catchType);
  }
  static ExceptionCatch of(Label handler, Label start, Label end) {
    return of(handler, start, end, Optional.empty());
  }
}
