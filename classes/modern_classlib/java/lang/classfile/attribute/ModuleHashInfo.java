package java.lang.classfile.attribute;

import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.ModuleEntry;
import java.lang.constant.ModuleDesc;

public interface ModuleHashInfo {
  ModuleEntry moduleName();
  byte[] hash();
  static ModuleHashInfo of(ModuleEntry name, byte[] hash) { return DoppioModuleAttributes.hash(name, hash); }
  static ModuleHashInfo of(ModuleDesc name, byte[] hash) { return DoppioModuleAttributes.hash(name, hash); }
}
