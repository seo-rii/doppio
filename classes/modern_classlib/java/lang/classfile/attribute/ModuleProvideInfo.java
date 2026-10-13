package java.lang.classfile.attribute;

import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.constant.ClassDesc;
import java.util.Arrays;
import java.util.List;

public interface ModuleProvideInfo {
  ClassEntry provides();
  List<ClassEntry> providesWith();
  static ModuleProvideInfo of(ClassEntry service, List<ClassEntry> implementations) { return DoppioModuleAttributes.provide(service, implementations); }
  static ModuleProvideInfo of(ClassEntry service, ClassEntry... implementations) { return of(service, Arrays.asList(implementations)); }
  static ModuleProvideInfo of(ClassDesc service, List<ClassDesc> implementations) { return DoppioModuleAttributes.provide(service, implementations); }
  static ModuleProvideInfo of(ClassDesc service, ClassDesc... implementations) { return of(service, Arrays.asList(implementations)); }
}
