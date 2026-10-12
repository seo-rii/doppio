package java.lang.classfile;

import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.util.Optional;

public interface FieldModel extends CompoundElement<FieldElement>, AttributedElement, ClassElement {
  AccessFlags flags();
  Optional<ClassModel> parent();
  Utf8Entry fieldName();
  Utf8Entry fieldType();
  default ClassDesc fieldTypeSymbol() { return ClassDesc.ofDescriptor(fieldType().stringValue()); }

}
