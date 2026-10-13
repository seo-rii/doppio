package java.lang.classfile.attribute;

import java.lang.classfile.AnnotationValue;
import java.lang.classfile.Attribute;
import java.lang.classfile.DoppioAnnotationAttributes;
import java.lang.classfile.MethodElement;

public interface AnnotationDefaultAttribute extends Attribute<AnnotationDefaultAttribute>, MethodElement {
  AnnotationValue defaultValue();
  static AnnotationDefaultAttribute of(AnnotationValue value) { return DoppioAnnotationAttributes.annotationDefault(value); }
}
