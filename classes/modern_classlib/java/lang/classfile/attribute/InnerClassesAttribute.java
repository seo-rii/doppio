package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.util.Arrays;
import java.util.List;

public interface InnerClassesAttribute extends Attribute<InnerClassesAttribute>, ClassElement {
  List<InnerClassInfo> classes();
  static InnerClassesAttribute of(List<InnerClassInfo> classes) { return DoppioAttributes.innerClasses(classes); }
  static InnerClassesAttribute of(InnerClassInfo... classes) { return of(Arrays.asList(classes)); }
}
