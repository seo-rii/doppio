package java.lang.classfile.attribute;

import java.lang.classfile.*;

public interface SyntheticAttribute extends Attribute<SyntheticAttribute>, ClassElement, MethodElement, FieldElement {
  static SyntheticAttribute of() { return DoppioAttributes.synthetic(); }
}
