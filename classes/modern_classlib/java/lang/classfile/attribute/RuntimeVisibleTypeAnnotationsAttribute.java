package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.CodeElement;
import java.lang.classfile.DoppioTypeAnnotationAttributes;
import java.lang.classfile.FieldElement;
import java.lang.classfile.MethodElement;
import java.lang.classfile.TypeAnnotation;
import java.util.Arrays;
import java.util.List;

public interface RuntimeVisibleTypeAnnotationsAttribute extends Attribute<RuntimeVisibleTypeAnnotationsAttribute>, ClassElement, MethodElement, FieldElement, CodeElement {
  List<TypeAnnotation> annotations();
  static RuntimeVisibleTypeAnnotationsAttribute of(List<TypeAnnotation> annotations) { return DoppioTypeAnnotationAttributes.visibleAnnotations(annotations); }
  static RuntimeVisibleTypeAnnotationsAttribute of(TypeAnnotation... annotations) { return of(Arrays.asList(annotations)); }
}
