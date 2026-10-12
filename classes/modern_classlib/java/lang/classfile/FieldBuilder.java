package java.lang.classfile;

import java.lang.reflect.AccessFlag;

public interface FieldBuilder extends ClassFileBuilder<FieldElement, FieldBuilder> {
  default FieldBuilder withFlags(int flags) { return with(DoppioClassReader.flags(flags, AccessFlag.Location.FIELD)); }
  default FieldBuilder withFlags(AccessFlag... flags) { return withFlags(DoppioBuilders.flags(flags, AccessFlag.Location.FIELD)); }
}
