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

public interface ModuleExportInfo {
  PackageEntry exportedPackage();
  int exportsFlagsMask();
  default Set<AccessFlag> exportsFlags() { return AccessFlag.maskToAccessFlags(exportsFlagsMask(), AccessFlag.Location.MODULE_EXPORTS); }
  default boolean has(AccessFlag flag) { return (flag.mask() & exportsFlagsMask()) == flag.mask() && flag.locations().contains(AccessFlag.Location.MODULE_EXPORTS); }
  List<ModuleEntry> exportsTo();
  static ModuleExportInfo of(PackageEntry name, int flags, List<ModuleEntry> targets) { return DoppioModuleAttributes.export(name, flags, targets); }
  static ModuleExportInfo of(PackageEntry name, Collection<AccessFlag> flags, List<ModuleEntry> targets) { return of(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_EXPORTS, flags), targets); }
  static ModuleExportInfo of(PackageEntry name, int flags, ModuleEntry... targets) { return of(name, flags, Arrays.asList(targets)); }
  static ModuleExportInfo of(PackageEntry name, Collection<AccessFlag> flags, ModuleEntry... targets) { return of(name, flags, Arrays.asList(targets)); }
  static ModuleExportInfo of(PackageDesc name, int flags, List<ModuleDesc> targets) { return DoppioModuleAttributes.export(name, flags, targets); }
  static ModuleExportInfo of(PackageDesc name, Collection<AccessFlag> flags, List<ModuleDesc> targets) { return of(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_EXPORTS, flags), targets); }
  static ModuleExportInfo of(PackageDesc name, int flags, ModuleDesc... targets) { return of(name, flags, Arrays.asList(targets)); }
  static ModuleExportInfo of(PackageDesc name, Collection<AccessFlag> flags, ModuleDesc... targets) { return of(name, flags, Arrays.asList(targets)); }
}
