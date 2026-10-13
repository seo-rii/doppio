package java.lang.constant;

/** A nominal package name, including the unnamed package. */
public interface PackageDesc {
  static PackageDesc of(String name) { return DoppioModuleDescriptors.packageName(name, false); }
  static PackageDesc ofInternalName(String name) { return DoppioModuleDescriptors.packageName(name, true); }
  String internalName();
  default String name() { return internalName().replace('/', '.'); }
  boolean equals(Object other);
}
