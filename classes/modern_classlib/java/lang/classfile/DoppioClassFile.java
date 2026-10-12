package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;

/** Internal selected public Class-File context, independent of VM parsing. */
final class DoppioClassFile implements ClassFile {
  private final StackMapsOption stackMaps;
  private final ConstantPoolSharingOption poolSharing;

  DoppioClassFile(Option[] options) {
    this(StackMapsOption.STACK_MAPS_WHEN_REQUIRED, ConstantPoolSharingOption.SHARED_POOL, options);
  }

  private DoppioClassFile(StackMapsOption initialStackMaps, ConstantPoolSharingOption initialPoolSharing,
      Option[] options) {
    Objects.requireNonNull(options);
    StackMapsOption selectedStackMaps = initialStackMaps;
    ConstantPoolSharingOption selectedPoolSharing = initialPoolSharing;
    for (Option option : options) {
      Objects.requireNonNull(option);
      if (option instanceof StackMapsOption) selectedStackMaps = (StackMapsOption) option;
      else if (option instanceof ConstantPoolSharingOption) selectedPoolSharing = (ConstantPoolSharingOption) option;
      else throw new IllegalArgumentException("Unsupported Class-File option");
    }
    this.stackMaps = selectedStackMaps;
    this.poolSharing = selectedPoolSharing;
  }

  public ClassFile withOptions(Option... options) {
    return new DoppioClassFile(stackMaps, poolSharing, options);
  }

  public ClassModel parse(byte[] bytes) {
    return DoppioClassReader.parse(Objects.requireNonNull(bytes));
  }

  public byte[] build(ClassEntry name, ConstantPoolBuilder pool, Consumer<? super ClassBuilder> handler) {
    Objects.requireNonNull(name);
    Objects.requireNonNull(pool);
    Objects.requireNonNull(handler);
    if (stackMaps == StackMapsOption.GENERATE_STACK_MAPS)
      throw new UnsupportedOperationException("Forced stack-map generation is outside the selected pipeline");
    if (!(pool instanceof DoppioConstantPool)) throw new IllegalArgumentException("Unsupported constant pool builder");
    return DoppioBuilders.build(name, (DoppioConstantPool) pool, handler, stackMaps);
  }

  public byte[] transformClass(ClassModel model, ClassEntry name, ClassTransform transform) {
    Objects.requireNonNull(model);
    Objects.requireNonNull(name);
    Objects.requireNonNull(transform);
    if (stackMaps == StackMapsOption.GENERATE_STACK_MAPS)
      throw new UnsupportedOperationException("Forced stack-map generation is outside the selected pipeline");
    if (poolSharing != ConstantPoolSharingOption.SHARED_POOL)
      throw new IllegalArgumentException("Fresh-pool transformation is outside the selected pipeline");
    DoppioConstantPool pool = DoppioConstantPool.copyOf(model.constantPool());
    return DoppioBuilders.transform(model, name, pool, transform, stackMaps);
  }

  public List<VerifyError> verify(byte[] bytes) {
    return DoppioClassFileVerifier.verify(Objects.requireNonNull(bytes));
  }

  public List<VerifyError> verify(ClassModel model) {
    return DoppioClassFileVerifier.verify(Objects.requireNonNull(model));
  }
}
