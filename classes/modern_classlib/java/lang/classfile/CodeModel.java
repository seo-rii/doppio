package java.lang.classfile;

import java.lang.classfile.instruction.ExceptionCatch;
import java.util.List;
import java.util.Optional;

public interface CodeModel extends CompoundElement<CodeElement>, AttributedElement, MethodElement {
  Optional<MethodModel> parent();
  List<ExceptionCatch> exceptionHandlers();
}
