package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.constant.ClassDesc;

public interface ModuleMainClassAttribute extends Attribute<ModuleMainClassAttribute>, ClassElement {
  ClassEntry mainClass();
  static ModuleMainClassAttribute of(ClassEntry mainClass) { return DoppioModuleAttributes.mainClass(mainClass); }
  static ModuleMainClassAttribute of(ClassDesc mainClass) { return DoppioModuleAttributes.mainClass(mainClass); }
}
