package java.lang.classfile.attribute;

import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.ModuleEntry;
import java.lang.classfile.constantpool.PackageEntry;
import java.lang.constant.ModuleDesc;
import java.lang.constant.PackageDesc;
import java.lang.reflect.AccessFlag;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface ModuleOpenInfo {
  PackageEntry openedPackage();
  int opensFlagsMask();
  default Set<AccessFlag> opensFlags() { return AccessFlag.maskToAccessFlags(opensFlagsMask(), AccessFlag.Location.MODULE_OPENS); }
  default boolean has(AccessFlag flag) { return (flag.mask() & opensFlagsMask()) == flag.mask() && flag.locations().contains(AccessFlag.Location.MODULE_OPENS); }
  List<ModuleEntry> opensTo();
  static ModuleOpenInfo of(PackageEntry name, int flags, List<ModuleEntry> targets) { return DoppioModuleAttributes.open(name, flags, targets); }
  static ModuleOpenInfo of(PackageEntry name, Collection<AccessFlag> flags, List<ModuleEntry> targets) { return of(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_OPENS, flags), targets); }
  static ModuleOpenInfo of(PackageEntry name, int flags, ModuleEntry... targets) { return of(name, flags, Arrays.asList(targets)); }
  static ModuleOpenInfo of(PackageEntry name, Collection<AccessFlag> flags, ModuleEntry... targets) { return of(name, flags, Arrays.asList(targets)); }
  static ModuleOpenInfo of(PackageDesc name, int flags, List<ModuleDesc> targets) { return DoppioModuleAttributes.open(name, flags, targets); }
  static ModuleOpenInfo of(PackageDesc name, Collection<AccessFlag> flags, List<ModuleDesc> targets) { return of(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_OPENS, flags), targets); }
  static ModuleOpenInfo of(PackageDesc name, int flags, ModuleDesc... targets) { return of(name, flags, Arrays.asList(targets)); }
  static ModuleOpenInfo of(PackageDesc name, Collection<AccessFlag> flags, ModuleDesc... targets) { return of(name, flags, Arrays.asList(targets)); }
}
