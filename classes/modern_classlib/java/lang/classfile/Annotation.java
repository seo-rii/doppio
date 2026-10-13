package java.lang.classfile;

import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.util.List;

/** An annotation's descriptor and immutable element-value pairs. */
public interface Annotation {
  Utf8Entry className();
  default ClassDesc classSymbol() { return ClassDesc.ofDescriptor(className().stringValue()); }
  List<AnnotationElement> elements();

  static Annotation of(Utf8Entry annotationClass, List<AnnotationElement> elements) {
    return DoppioAnnotations.annotation(annotationClass, elements);
  }
  static Annotation of(Utf8Entry annotationClass, AnnotationElement... elements) {
    return of(annotationClass, List.of(elements));
  }
  static Annotation of(ClassDesc annotationClass, List<AnnotationElement> elements) {
    return of(DoppioConstantPool.temporaryPool().utf8Entry(annotationClass), elements);
  }
  static Annotation of(ClassDesc annotationClass, AnnotationElement... elements) {
    return of(DoppioConstantPool.temporaryPool().utf8Entry(annotationClass), elements);
  }
}
