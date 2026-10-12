package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Function;

/** Internal selected public Class-File context, independent of VM parsing. */
final class DoppioClassFile implements ClassFile {
  private final StackMapsOption stackMaps;
  private final ConstantPoolSharingOption poolSharing;
  private final AttributesProcessingOption attributesProcessing;
  private final Function<Utf8Entry, AttributeMapper<?>> customAttributes;
  private final ClassHierarchyResolver hierarchyResolver;
  private final DeadCodeOption deadCode;
  private final DeadLabelsOption deadLabels;
  private final ShortJumpsOption shortJumps;

  DoppioClassFile(Option[] options) {
    this(StackMapsOption.STACK_MAPS_WHEN_REQUIRED, ConstantPoolSharingOption.SHARED_POOL,
        AttributesProcessingOption.PASS_ALL_ATTRIBUTES, entry -> null, ClassHierarchyResolver.defaultResolver(),
        DeadCodeOption.PATCH_DEAD_CODE, DeadLabelsOption.FAIL_ON_DEAD_LABELS, ShortJumpsOption.FIX_SHORT_JUMPS, options);
  }

  private DoppioClassFile(StackMapsOption initialStackMaps, ConstantPoolSharingOption initialPoolSharing,
      AttributesProcessingOption initialAttributesProcessing, Function<Utf8Entry, AttributeMapper<?>> initialCustomAttributes,
      ClassHierarchyResolver initialHierarchyResolver, DeadCodeOption initialDeadCode,
      DeadLabelsOption initialDeadLabels, ShortJumpsOption initialShortJumps, Option[] options) {
    Objects.requireNonNull(options);
    StackMapsOption selectedStackMaps = initialStackMaps;
    ConstantPoolSharingOption selectedPoolSharing = initialPoolSharing;
    AttributesProcessingOption selectedAttributesProcessing = initialAttributesProcessing;
    Function<Utf8Entry, AttributeMapper<?>> selectedCustomAttributes = initialCustomAttributes;
    ClassHierarchyResolver selectedHierarchyResolver = initialHierarchyResolver;
    DeadCodeOption selectedDeadCode = initialDeadCode;
    DeadLabelsOption selectedDeadLabels = initialDeadLabels;
    ShortJumpsOption selectedShortJumps = initialShortJumps;
    for (Option option : options) {
      Objects.requireNonNull(option);
      if (option instanceof StackMapsOption) selectedStackMaps = (StackMapsOption) option;
      else if (option instanceof ConstantPoolSharingOption) selectedPoolSharing = (ConstantPoolSharingOption) option;
      else if (option instanceof AttributesProcessingOption) selectedAttributesProcessing = (AttributesProcessingOption) option;
      else if (option instanceof AttributeMapperOption)
        selectedCustomAttributes = Objects.requireNonNull(((AttributeMapperOption) option).attributeMapper());
      else if (option instanceof ClassHierarchyResolverOption)
        selectedHierarchyResolver = Objects.requireNonNull(((ClassHierarchyResolverOption) option).classHierarchyResolver());
      else if (option instanceof DeadCodeOption) selectedDeadCode = (DeadCodeOption) option;
      else if (option instanceof DeadLabelsOption) selectedDeadLabels = (DeadLabelsOption) option;
      else if (option instanceof ShortJumpsOption) selectedShortJumps = (ShortJumpsOption) option;
      else throw new IllegalArgumentException("Unsupported Class-File option");
    }
    this.stackMaps = selectedStackMaps;
    this.poolSharing = selectedPoolSharing;
    this.attributesProcessing = selectedAttributesProcessing;
    this.customAttributes = selectedCustomAttributes;
    this.hierarchyResolver = selectedHierarchyResolver;
    this.deadCode = selectedDeadCode;
    this.deadLabels = selectedDeadLabels;
    this.shortJumps = selectedShortJumps;
  }

  public ClassFile withOptions(Option... options) {
    return new DoppioClassFile(stackMaps, poolSharing, attributesProcessing, customAttributes, hierarchyResolver,
        deadCode, deadLabels, shortJumps, options);
  }

  public ClassModel parse(byte[] bytes) {
    return DoppioClassReader.parse(Objects.requireNonNull(bytes), customAttributes);
  }

  public byte[] build(ClassEntry name, ConstantPoolBuilder pool, Consumer<? super ClassBuilder> handler) {
    Objects.requireNonNull(name);
    Objects.requireNonNull(pool);
    Objects.requireNonNull(handler);
    if (!(pool instanceof DoppioConstantPool)) throw new IllegalArgumentException("Unsupported constant pool builder");
    return DoppioBuilders.build(name, (DoppioConstantPool) pool, handler, stackMaps, attributesProcessing,
        hierarchyResolver, deadCode, deadLabels, shortJumps);
  }

  public byte[] transformClass(ClassModel model, ClassEntry name, ClassTransform transform) {
    Objects.requireNonNull(model);
    Objects.requireNonNull(name);
    Objects.requireNonNull(transform);
    boolean remapBound = poolSharing == ConstantPoolSharingOption.NEW_POOL;
    DoppioConstantPool pool = remapBound ? new DoppioConstantPool() : DoppioConstantPool.copyOf(model.constantPool());
    return DoppioBuilders.transform(model, name, pool, transform, stackMaps, attributesProcessing, remapBound,
        hierarchyResolver, deadCode, deadLabels, shortJumps);
  }

  public List<VerifyError> verify(byte[] bytes) {
    return DoppioClassFileVerifier.verify(Objects.requireNonNull(bytes), customAttributes, hierarchyResolver);
  }

  public List<VerifyError> verify(ClassModel model) {
    return DoppioClassFileVerifier.verify(Objects.requireNonNull(model), hierarchyResolver);
  }
}
