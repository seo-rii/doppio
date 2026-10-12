package java.lang.classfile.attribute;

import java.lang.classfile.DoppioAttributes;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.reflect.AccessFlag;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

public interface InnerClassInfo {
  ClassEntry innerClass();
  Optional<ClassEntry> outerClass();
  Optional<Utf8Entry> innerName();
  int flagsMask();
  default Set<AccessFlag> flags() { return AccessFlag.maskToAccessFlags(flagsMask(), AccessFlag.Location.INNER_CLASS); }
  default boolean has(AccessFlag flag) {
    return Objects.requireNonNull(flag).locations().contains(AccessFlag.Location.INNER_CLASS) &&
        (flagsMask() & flag.mask()) != 0;
  }
  static InnerClassInfo of(ClassEntry inner, Optional<ClassEntry> outer, Optional<Utf8Entry> name, int flags) {
    return DoppioAttributes.innerClass(inner, outer, name, flags);
  }
  static InnerClassInfo of(ClassDesc inner, Optional<ClassDesc> outer, Optional<String> name, int flags) {
    DoppioConstantPool pool = new DoppioConstantPool();
    return of(pool.classEntry(inner), Objects.requireNonNull(outer).map(pool::classEntry),
        Objects.requireNonNull(name).map(pool::utf8Entry), flags);
  }
  static InnerClassInfo of(ClassDesc inner, Optional<ClassDesc> outer, Optional<String> name, AccessFlag... flags) {
    int mask = 0;
    for (AccessFlag flag : Objects.requireNonNull(flags)) {
      if (!Objects.requireNonNull(flag).locations().contains(AccessFlag.Location.INNER_CLASS))
        throw new IllegalArgumentException("Access flag is not valid for an inner class");
      mask |= flag.mask();
    }
    return of(inner, outer, name, mask);
  }
}
