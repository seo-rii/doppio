package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.PackageEntry;
import java.lang.constant.PackageDesc;
import java.util.Arrays;
import java.util.List;

public interface ModulePackagesAttribute extends Attribute<ModulePackagesAttribute>, ClassElement {
  List<PackageEntry> packages();
  static ModulePackagesAttribute of(List<PackageEntry> packages) { return DoppioModuleAttributes.packages(packages); }
  static ModulePackagesAttribute of(PackageEntry... packages) { return of(Arrays.asList(packages)); }
  static ModulePackagesAttribute ofNames(List<PackageDesc> packages) { return DoppioModuleAttributes.packageNames(packages); }
  static ModulePackagesAttribute ofNames(PackageDesc... packages) { return ofNames(Arrays.asList(packages)); }
}
