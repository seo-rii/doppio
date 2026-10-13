package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.Utf8Entry;

public interface ModuleTargetAttribute extends Attribute<ModuleTargetAttribute>, ClassElement {
  Utf8Entry targetPlatform();
  static ModuleTargetAttribute of(String target) { return DoppioModuleAttributes.target(target); }
  static ModuleTargetAttribute of(Utf8Entry target) { return DoppioModuleAttributes.target(target); }
}
