package java.lang.constant;

/** A nominal module name, not a loadable constant descriptor. */
public interface ModuleDesc {
  static ModuleDesc of(String name) { return DoppioModuleDescriptors.module(name); }
  String name();
  boolean equals(Object other);
}
