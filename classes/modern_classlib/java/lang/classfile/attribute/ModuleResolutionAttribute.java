package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioModuleAttributes;

public interface ModuleResolutionAttribute extends Attribute<ModuleResolutionAttribute>, ClassElement {
  int resolutionFlags();
  static ModuleResolutionAttribute of(int flags) { return DoppioModuleAttributes.resolution(flags); }
}
