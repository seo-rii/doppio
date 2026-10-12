package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.util.List;
import java.util.Optional;

public interface ClassModel extends CompoundElement<ClassElement>, AttributedElement {
  ConstantPool constantPool();
  AccessFlags flags();
  ClassEntry thisClass();
  int majorVersion();
  int minorVersion();
  List<FieldModel> fields();
  List<MethodModel> methods();
  Optional<ClassEntry> superclass();
  List<ClassEntry> interfaces();
  boolean isModuleInfo();
}
