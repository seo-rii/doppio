package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.AccessFlag;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;

public interface ClassBuilder extends ClassFileBuilder<ClassElement, ClassBuilder> {
  default ClassBuilder withVersion(int major, int minor) { return with(ClassFileVersion.of(major, minor)); }
  default ClassBuilder withFlags(int flags) { return with(DoppioClassReader.flags(flags, AccessFlag.Location.CLASS)); }
  default ClassBuilder withFlags(AccessFlag... flags) {
    return withFlags(DoppioBuilders.flags(flags, AccessFlag.Location.CLASS));
  }
  default ClassBuilder withSuperclass(ClassEntry entry) { return with(Superclass.of(entry)); }
  default ClassBuilder withSuperclass(ClassDesc symbol) { return withSuperclass(constantPool().classEntry(symbol)); }
  default ClassBuilder withInterfaces(List<ClassEntry> entries) { return with(Interfaces.of(entries)); }
  default ClassBuilder withInterfaces(ClassEntry... entries) { return withInterfaces(Arrays.asList(entries)); }
  default ClassBuilder withInterfaceSymbols(List<ClassDesc> symbols) {
    Objects.requireNonNull(symbols);
    ClassEntry[] entries = new ClassEntry[symbols.size()];
    for (int i = 0; i < entries.length; i++) entries[i] = constantPool().classEntry(symbols.get(i));
    return withInterfaces(entries);
  }
  default ClassBuilder withInterfaceSymbols(ClassDesc... symbols) { return withInterfaceSymbols(Arrays.asList(symbols)); }
  ClassBuilder withField(Utf8Entry name, Utf8Entry type, Consumer<? super FieldBuilder> handler);
  default ClassBuilder withField(Utf8Entry name, Utf8Entry type, int flags) {
    return withField(name, type, field -> field.withFlags(flags));
  }
  default ClassBuilder withField(String name, ClassDesc type, Consumer<? super FieldBuilder> handler) {
    return withField(constantPool().utf8Entry(name), constantPool().utf8Entry(type), handler);
  }
  default ClassBuilder withField(String name, ClassDesc type, int flags) {
    return withField(name, type, field -> field.withFlags(flags));
  }
  ClassBuilder withMethod(Utf8Entry name, Utf8Entry type, int flags, Consumer<? super MethodBuilder> handler);
  default ClassBuilder withMethod(String name, MethodTypeDesc type, int flags, Consumer<? super MethodBuilder> handler) {
    return withMethod(constantPool().utf8Entry(name), constantPool().utf8Entry(type), flags, handler);
  }
  default ClassBuilder withMethodBody(Utf8Entry name, Utf8Entry type, int flags, Consumer<? super CodeBuilder> handler) {
    return withMethod(name, type, flags, method -> method.withCode(handler));
  }
  default ClassBuilder withMethodBody(String name, MethodTypeDesc type, int flags, Consumer<? super CodeBuilder> handler) {
    return withMethodBody(constantPool().utf8Entry(name), constantPool().utf8Entry(type), flags, handler);
  }
  ClassBuilder transformField(FieldModel model, FieldTransform transform);
  ClassBuilder transformMethod(MethodModel model, MethodTransform transform);
}
