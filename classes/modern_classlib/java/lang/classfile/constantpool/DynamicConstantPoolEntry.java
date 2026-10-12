package java.lang.classfile.constantpool;

import java.lang.classfile.BootstrapMethodEntry;

public interface DynamicConstantPoolEntry extends PoolEntry {
  BootstrapMethodEntry bootstrap();
  int bootstrapMethodIndex();
  NameAndTypeEntry nameAndType();
  default Utf8Entry name() { return nameAndType().name(); }
  default Utf8Entry type() { return nameAndType().type(); }
}
