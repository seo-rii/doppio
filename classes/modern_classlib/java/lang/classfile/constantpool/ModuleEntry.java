package java.lang.classfile.constantpool;

import java.lang.constant.ModuleDesc;

/** The typed CONSTANT_Module_info pool entry. */
public interface ModuleEntry extends PoolEntry {
  Utf8Entry name();
  ModuleDesc asSymbol();
  boolean matches(ModuleDesc descriptor);
}
