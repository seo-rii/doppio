package java.lang.classfile.attribute;

import java.lang.classfile.Annotation;
import java.lang.classfile.Attribute;
import java.lang.classfile.DoppioAnnotationAttributes;
import java.lang.classfile.MethodElement;
import java.util.List;

public interface RuntimeInvisibleParameterAnnotationsAttribute extends Attribute<RuntimeInvisibleParameterAnnotationsAttribute>, MethodElement {
  List<List<Annotation>> parameterAnnotations();
  static RuntimeInvisibleParameterAnnotationsAttribute of(List<List<Annotation>> annotations) { return DoppioAnnotationAttributes.invisibleParameterAnnotations(annotations); }
}
