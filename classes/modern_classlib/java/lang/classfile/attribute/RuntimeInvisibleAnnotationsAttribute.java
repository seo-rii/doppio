package java.lang.classfile.attribute;

import java.lang.classfile.Annotation;
import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioAnnotationAttributes;
import java.lang.classfile.FieldElement;
import java.lang.classfile.MethodElement;
import java.util.Arrays;
import java.util.List;

public interface RuntimeInvisibleAnnotationsAttribute extends Attribute<RuntimeInvisibleAnnotationsAttribute>, ClassElement, MethodElement, FieldElement {
  List<Annotation> annotations();
  static RuntimeInvisibleAnnotationsAttribute of(List<Annotation> annotations) { return DoppioAnnotationAttributes.invisibleAnnotations(annotations); }
  static RuntimeInvisibleAnnotationsAttribute of(Annotation... annotations) { return of(Arrays.asList(annotations)); }
}
