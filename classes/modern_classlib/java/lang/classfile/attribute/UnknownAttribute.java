package java.lang.classfile.attribute;

import java.lang.classfile.*;
public interface UnknownAttribute extends Attribute<UnknownAttribute>, ClassElement, MethodElement, FieldElement, CodeElement {
  byte[] contents();
}
