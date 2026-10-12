package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Function;

/** Selected Java25 public pipeline, not the VM's class reader. */
public interface ClassFile {
  int MAGIC_NUMBER = 0xcafebabe;
  int ACC_PUBLIC = 1, ACC_PRIVATE = 2, ACC_PROTECTED = 4, ACC_STATIC = 8;
  int ACC_FINAL = 16, ACC_SUPER = 32, ACC_SYNCHRONIZED = 32;
  int ACC_VOLATILE = 64, ACC_BRIDGE = 64, ACC_TRANSIENT = 128, ACC_VARARGS = 128;
  int ACC_NATIVE = 256, ACC_INTERFACE = 512, ACC_ABSTRACT = 1024, ACC_STRICT = 2048;
  int ACC_SYNTHETIC = 4096, ACC_ANNOTATION = 8192, ACC_ENUM = 16384, ACC_MODULE = 32768;
  int ACC_OPEN = 32, ACC_MANDATED = 32768, ACC_TRANSITIVE = 32, ACC_STATIC_PHASE = 64;
  int JAVA_1_VERSION = 45, JAVA_2_VERSION = 46, JAVA_3_VERSION = 47, JAVA_4_VERSION = 48;
  int JAVA_5_VERSION = 49, JAVA_6_VERSION = 50, JAVA_7_VERSION = 51, JAVA_8_VERSION = 52;
  int JAVA_9_VERSION = 53, JAVA_10_VERSION = 54, JAVA_11_VERSION = 55, JAVA_12_VERSION = 56;
  int JAVA_13_VERSION = 57, JAVA_14_VERSION = 58, JAVA_15_VERSION = 59, JAVA_16_VERSION = 60;
  int JAVA_17_VERSION = 61, JAVA_18_VERSION = 62, JAVA_19_VERSION = 63, JAVA_20_VERSION = 64;
  int JAVA_21_VERSION = 65, JAVA_22_VERSION = 66, JAVA_23_VERSION = 67, JAVA_24_VERSION = 68;
  int JAVA_25_VERSION = 69, PREVIEW_MINOR_VERSION = 65535;

  interface Option {}
  enum StackMapsOption implements Option {
    STACK_MAPS_WHEN_REQUIRED, GENERATE_STACK_MAPS, DROP_STACK_MAPS
  }
  enum ConstantPoolSharingOption implements Option { SHARED_POOL, NEW_POOL }
  enum AttributesProcessingOption implements Option {
    PASS_ALL_ATTRIBUTES, DROP_UNKNOWN_ATTRIBUTES, DROP_UNSTABLE_ATTRIBUTES
  }
  interface AttributeMapperOption extends Option {
    Function<Utf8Entry, AttributeMapper<?>> attributeMapper();
    static AttributeMapperOption of(Function<Utf8Entry, AttributeMapper<?>> mapper) {
      Objects.requireNonNull(mapper);
      return new AttributeMapperOption() {
        public Function<Utf8Entry, AttributeMapper<?>> attributeMapper() { return mapper; }
      };
    }
  }
  interface ClassHierarchyResolverOption extends Option {
    ClassHierarchyResolver classHierarchyResolver();
    static ClassHierarchyResolverOption of(ClassHierarchyResolver resolver) {
      Objects.requireNonNull(resolver);
      return new ClassHierarchyResolverOption() {
        public ClassHierarchyResolver classHierarchyResolver() { return resolver; }
      };
    }
  }

  static ClassFile of() { return new DoppioClassFile(new Option[0]); }
  static ClassFile of(Option... options) { return new DoppioClassFile(options); }
  ClassFile withOptions(Option... options);
  ClassModel parse(byte[] bytes);
  default ClassModel parse(Path path) throws IOException {
    return parse(Files.readAllBytes(Objects.requireNonNull(path)));
  }
  default byte[] build(ClassDesc name, Consumer<? super ClassBuilder> handler) {
    Objects.requireNonNull(name);
    Objects.requireNonNull(handler);
    if (name.isPrimitive()) throw new IllegalArgumentException("A class name cannot be primitive");
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    return build(pool.classEntry(name), pool, handler);
  }
  byte[] build(ClassEntry name, ConstantPoolBuilder pool, Consumer<? super ClassBuilder> handler);
  default void buildTo(Path path, ClassDesc name, Consumer<ClassBuilder> handler) throws IOException {
    Files.write(Objects.requireNonNull(path), build(name, handler));
  }
  default byte[] transformClass(ClassModel model, ClassTransform transform) {
    return transformClass(Objects.requireNonNull(model), model.thisClass(), transform);
  }
  default byte[] transformClass(ClassModel model, ClassDesc name, ClassTransform transform) {
    return transformClass(model, ConstantPoolBuilder.of().classEntry(Objects.requireNonNull(name)), transform);
  }
  byte[] transformClass(ClassModel model, ClassEntry name, ClassTransform transform);
  List<VerifyError> verify(byte[] bytes);
  List<VerifyError> verify(ClassModel model);
  default List<VerifyError> verify(Path path) throws IOException {
    return verify(Files.readAllBytes(Objects.requireNonNull(path)));
  }
  static int latestMajorVersion() { return JAVA_25_VERSION; }
  static int latestMinorVersion() { return 0; }
}
