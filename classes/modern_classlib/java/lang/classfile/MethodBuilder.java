package java.lang.classfile;

import java.lang.reflect.AccessFlag;
import java.util.function.Consumer;

public interface MethodBuilder extends ClassFileBuilder<MethodElement, MethodBuilder> {
  default MethodBuilder withFlags(int flags) { return with(DoppioClassReader.flags(flags, AccessFlag.Location.METHOD)); }
  default MethodBuilder withFlags(AccessFlag... flags) { return withFlags(DoppioBuilders.flags(flags, AccessFlag.Location.METHOD)); }
  MethodBuilder withCode(Consumer<? super CodeBuilder> handler);
  MethodBuilder transformCode(CodeModel model, CodeTransform transform);
}
