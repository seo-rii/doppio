package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.ConstantValueEntry;
import java.lang.constant.ConstantDesc;

public interface ConstantValueAttribute extends Attribute<ConstantValueAttribute>, FieldElement {
  ConstantValueEntry constant();
  static ConstantValueAttribute of(ConstantValueEntry constant) { return DoppioAttributes.constantValue(constant); }
  static ConstantValueAttribute of(ConstantDesc constant) { return DoppioAttributes.constantValue(constant); }
}
