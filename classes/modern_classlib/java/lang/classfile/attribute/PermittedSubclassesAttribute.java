package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioMetadataAttributes;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.constant.ClassDesc;
import java.util.Arrays;
import java.util.List;

public interface PermittedSubclassesAttribute extends Attribute<PermittedSubclassesAttribute>, ClassElement {
  List<ClassEntry> permittedSubclasses();
  static PermittedSubclassesAttribute of(List<ClassEntry> subclasses) { return DoppioMetadataAttributes.permittedSubclasses(subclasses); }
  static PermittedSubclassesAttribute of(ClassEntry... subclasses) { return of(Arrays.asList(subclasses)); }
  static PermittedSubclassesAttribute ofSymbols(List<ClassDesc> subclasses) { return DoppioMetadataAttributes.permittedSubclassSymbols(subclasses); }
  static PermittedSubclassesAttribute ofSymbols(ClassDesc... subclasses) { return ofSymbols(Arrays.asList(subclasses)); }
}
