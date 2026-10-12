package java.lang.classfile.attribute;

import java.lang.classfile.*;

public interface DeprecatedAttribute extends Attribute<DeprecatedAttribute>, ClassElement, MethodElement, FieldElement {
  static DeprecatedAttribute of() { return DoppioAttributes.deprecatedAttribute(); }
}
