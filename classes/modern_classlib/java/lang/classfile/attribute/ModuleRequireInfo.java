package java.lang.classfile.attribute;

import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.ModuleEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ModuleDesc;
import java.lang.reflect.AccessFlag;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;

public interface ModuleRequireInfo {
  ModuleEntry requires();
  int requiresFlagsMask();
  default Set<AccessFlag> requiresFlags() { return AccessFlag.maskToAccessFlags(requiresFlagsMask(), AccessFlag.Location.MODULE_REQUIRES); }
  Optional<Utf8Entry> requiresVersion();
  default boolean has(AccessFlag flag) { return (flag.mask() & requiresFlagsMask()) == flag.mask() && flag.locations().contains(AccessFlag.Location.MODULE_REQUIRES); }
  static ModuleRequireInfo of(ModuleEntry name, int flags, Utf8Entry version) { return DoppioModuleAttributes.require(name, flags, version); }
  static ModuleRequireInfo of(ModuleEntry name, Collection<AccessFlag> flags, Utf8Entry version) { return of(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_REQUIRES, flags), version); }
  static ModuleRequireInfo of(ModuleDesc name, int flags, String version) { return DoppioModuleAttributes.require(name, flags, version); }
  static ModuleRequireInfo of(ModuleDesc name, Collection<AccessFlag> flags, String version) { return of(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_REQUIRES, flags), version); }
}
