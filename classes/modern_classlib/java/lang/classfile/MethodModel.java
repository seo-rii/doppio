package java.lang.classfile;

import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.MethodTypeDesc;
import java.util.Optional;

public interface MethodModel extends CompoundElement<MethodElement>, AttributedElement, ClassElement {
  AccessFlags flags();
  Optional<ClassModel> parent();
  Utf8Entry methodName();
  Utf8Entry methodType();
  default MethodTypeDesc methodTypeSymbol() { return MethodTypeDesc.ofDescriptor(methodType().stringValue()); }
  Optional<CodeModel> code();
}
