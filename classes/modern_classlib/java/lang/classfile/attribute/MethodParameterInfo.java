package java.lang.classfile.attribute;

import java.lang.classfile.DoppioMetadataAttributes;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.reflect.AccessFlag;
import java.util.Optional;
import java.util.Set;

public interface MethodParameterInfo {
  Optional<Utf8Entry> name();
  int flagsMask();
  default Set<AccessFlag> flags() { return AccessFlag.maskToAccessFlags(flagsMask(), AccessFlag.Location.METHOD_PARAMETER); }
  default boolean has(AccessFlag flag) {
    return (flag.mask() & flagsMask()) == flag.mask() && flag.locations().contains(AccessFlag.Location.METHOD_PARAMETER);
  }
  static MethodParameterInfo of(Optional<Utf8Entry> name, int flags) { return DoppioMetadataAttributes.methodParameter(name, flags); }
  static MethodParameterInfo of(Optional<String> name, AccessFlag... flags) { return DoppioMetadataAttributes.methodParameter(name, flags); }
  static MethodParameterInfo ofParameter(Optional<String> name, int flags) { return DoppioMetadataAttributes.namedMethodParameter(name, flags); }
}
