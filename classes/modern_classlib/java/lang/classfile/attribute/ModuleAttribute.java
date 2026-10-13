package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ModuleEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.constant.ModuleDesc;
import java.lang.constant.PackageDesc;
import java.lang.reflect.AccessFlag;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

public interface ModuleAttribute extends Attribute<ModuleAttribute>, ClassElement {
  ModuleEntry moduleName();
  int moduleFlagsMask();
  default Set<AccessFlag> moduleFlags() { return AccessFlag.maskToAccessFlags(moduleFlagsMask(), AccessFlag.Location.MODULE); }
  default boolean has(AccessFlag flag) { return (flag.mask() & moduleFlagsMask()) == flag.mask() && flag.locations().contains(AccessFlag.Location.MODULE); }
  Optional<Utf8Entry> moduleVersion();
  List<ModuleRequireInfo> requires();
  List<ModuleExportInfo> exports();
  List<ModuleOpenInfo> opens();
  List<ClassEntry> uses();
  List<ModuleProvideInfo> provides();
  static ModuleAttribute of(ModuleEntry name, int flags, Utf8Entry version,
      Collection<ModuleRequireInfo> requires, Collection<ModuleExportInfo> exports,
      Collection<ModuleOpenInfo> opens, Collection<ClassEntry> uses, Collection<ModuleProvideInfo> provides) {
    return DoppioModuleAttributes.module(name, flags, version, requires, exports, opens, uses, provides);
  }
  static ModuleAttribute of(ModuleDesc name, Consumer<ModuleAttributeBuilder> handler) { return DoppioModuleAttributes.module(name, handler); }
  static ModuleAttribute of(ModuleEntry name, Consumer<ModuleAttributeBuilder> handler) { return DoppioModuleAttributes.module(name, handler); }
  interface ModuleAttributeBuilder {
    ModuleAttributeBuilder moduleName(ModuleDesc name);
    ModuleAttributeBuilder moduleFlags(int flags);
    default ModuleAttributeBuilder moduleFlags(AccessFlag... flags) { return moduleFlags(DoppioModuleAttributes.flags(AccessFlag.Location.MODULE, Arrays.asList(flags))); }
    ModuleAttributeBuilder moduleVersion(String version);
    ModuleAttributeBuilder requires(ModuleDesc name, int flags, String version);
    default ModuleAttributeBuilder requires(ModuleDesc name, Collection<AccessFlag> flags, String version) { return requires(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_REQUIRES, flags), version); }
    ModuleAttributeBuilder requires(ModuleRequireInfo requires);
    ModuleAttributeBuilder exports(PackageDesc name, int flags, ModuleDesc... targets);
    default ModuleAttributeBuilder exports(PackageDesc name, Collection<AccessFlag> flags, ModuleDesc... targets) { return exports(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_EXPORTS, flags), targets); }
    ModuleAttributeBuilder exports(ModuleExportInfo exports);
    ModuleAttributeBuilder opens(PackageDesc name, int flags, ModuleDesc... targets);
    default ModuleAttributeBuilder opens(PackageDesc name, Collection<AccessFlag> flags, ModuleDesc... targets) { return opens(name, DoppioModuleAttributes.flags(AccessFlag.Location.MODULE_OPENS, flags), targets); }
    ModuleAttributeBuilder opens(ModuleOpenInfo opens);
    ModuleAttributeBuilder uses(ClassDesc service);
    ModuleAttributeBuilder uses(ClassEntry service);
    ModuleAttributeBuilder provides(ClassDesc service, ClassDesc... implementations);
    ModuleAttributeBuilder provides(ModuleProvideInfo provides);
  }
}
