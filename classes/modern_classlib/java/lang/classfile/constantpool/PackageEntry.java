package java.lang.classfile.constantpool;

import java.lang.constant.PackageDesc;

/** The typed CONSTANT_Package_info pool entry. */
public interface PackageEntry extends PoolEntry {
  Utf8Entry name();
  PackageDesc asSymbol();
  boolean matches(PackageDesc descriptor);
}
