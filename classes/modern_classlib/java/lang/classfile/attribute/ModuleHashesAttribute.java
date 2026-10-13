package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioModuleAttributes;
import java.lang.classfile.constantpool.Utf8Entry;
import java.util.Arrays;
import java.util.List;

public interface ModuleHashesAttribute extends Attribute<ModuleHashesAttribute>, ClassElement {
  Utf8Entry algorithm();
  List<ModuleHashInfo> hashes();
  static ModuleHashesAttribute of(String algorithm, List<ModuleHashInfo> hashes) { return DoppioModuleAttributes.hashes(algorithm, hashes); }
  static ModuleHashesAttribute of(String algorithm, ModuleHashInfo... hashes) { return of(algorithm, Arrays.asList(hashes)); }
  static ModuleHashesAttribute of(Utf8Entry algorithm, List<ModuleHashInfo> hashes) { return DoppioModuleAttributes.hashes(algorithm, hashes); }
  static ModuleHashesAttribute of(Utf8Entry algorithm, ModuleHashInfo... hashes) { return of(algorithm, Arrays.asList(hashes)); }
}
