package java.lang.classfile;

import java.lang.classfile.AttributeMapper.AttributeStability;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.AccessFlag;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Genuine non-Code metadata values and semantic constant-pool importing codecs. */
public final class DoppioMetadataAttributes {
  private DoppioMetadataAttributes() {}
  private static final AttributeMapper<RecordAttribute> RECORD = new Mapper<RecordAttribute>("Record") {
    void payload(BufWriter writer, RecordAttribute value) {
      writer.writeU2(value.components().size());
      for (RecordComponentInfo component : value.components()) {
        writer.writeIndex(component.name()); writer.writeIndex(component.descriptor());
        writer.writeU2(component.attributes().size());
        for (Attribute<?> attribute : component.attributes()) DoppioAttributes.write(writer, attribute);
      }
    }
  };
  private static final AttributeMapper<PermittedSubclassesAttribute> PERMITTED = new Mapper<PermittedSubclassesAttribute>("PermittedSubclasses") {
    void payload(BufWriter writer, PermittedSubclassesAttribute value) {
      writer.writeU2(value.permittedSubclasses().size());
      for (ClassEntry subclass : value.permittedSubclasses()) writer.writeIndex(subclass);
    }
  };
  private static final AttributeMapper<EnclosingMethodAttribute> ENCLOSING = new Mapper<EnclosingMethodAttribute>("EnclosingMethod") {
    void payload(BufWriter writer, EnclosingMethodAttribute value) {
      writer.writeIndex(value.enclosingClass()); writer.writeIndexOrZero(value.enclosingMethod().orElse(null));
    }
  };
  private static final AttributeMapper<MethodParametersAttribute> PARAMETERS = new Mapper<MethodParametersAttribute>("MethodParameters") {
    void payload(BufWriter writer, MethodParametersAttribute value) {
      writer.writeU1(value.parameters().size());
      for (MethodParameterInfo parameter : value.parameters()) {
        writer.writeIndexOrZero(parameter.name().orElse(null)); writer.writeU2(parameter.flagsMask());
      }
    }
  };
  private static final AttributeMapper<SourceIDAttribute> SOURCE = new Mapper<SourceIDAttribute>("SourceID") {
    void payload(BufWriter writer, SourceIDAttribute value) { writer.writeIndex(value.sourceId()); }
  };
  private static final AttributeMapper<CompilationIDAttribute> COMPILATION = new Mapper<CompilationIDAttribute>("CompilationID") {
    void payload(BufWriter writer, CompilationIDAttribute value) { writer.writeIndex(value.compilationId()); }
  };

  private abstract static class Mapper<A extends Attribute<A>> implements AttributeMapper<A> {
    final String name;
    Mapper(String name) { this.name = name; }
    public String name() { return name; }
    public AttributeStability stability() { return AttributeStability.CP_REFS; }
    @SuppressWarnings("unchecked")
    public A readAttribute(AttributedElement owner, ClassReader reader, int start) {
      return (A) read(owner, reader, reader.readEntry(start - 6, Utf8Entry.class), start,
          reader.readBytes(start, reader.readInt(start - 4)));
    }
    public void writeAttribute(BufWriter writer, A value) {
      writer.writeIndex(value.attributeName()); int lengthAt = writer.size(); writer.writeInt(0);
      int start = writer.size(); payload(writer, value); writer.patchInt(lengthAt, 4, writer.size() - start);
    }
    abstract void payload(BufWriter writer, A value);
  }
  static AttributeMapper<RecordAttribute> recordMapper() { return RECORD; }
  static AttributeMapper<PermittedSubclassesAttribute> permittedSubclassesMapper() { return PERMITTED; }
  static AttributeMapper<EnclosingMethodAttribute> enclosingMethodMapper() { return ENCLOSING; }
  static AttributeMapper<MethodParametersAttribute> methodParametersMapper() { return PARAMETERS; }
  static AttributeMapper<SourceIDAttribute> sourceIdMapper() { return SOURCE; }
  static AttributeMapper<CompilationIDAttribute> compilationIdMapper() { return COMPILATION; }

  static Attribute<?> read(AttributedElement owner, ClassReader reader, Utf8Entry name, int start, byte[] payload) {
    String key = name.stringValue(); ConstantPool pool = DoppioClassReader.readerPool(reader);
    if ("Record".equals(key)) {
      require(owner instanceof ClassModel, "Invalid Record location");
      require(payload.length >= 2, "Truncated Record attribute");
      int count = reader.readU2(start), end = start + payload.length;
      int[] cursor = {start + 2}; List<RecordComponentInfo> components = new ArrayList<RecordComponentInfo>();
      for (int index = 0; index < count; index++) {
        require(end - cursor[0] >= 6, "Truncated record component");
        BoundComponent component = new BoundComponent(reader.readEntry(cursor[0], Utf8Entry.class), reader.readEntry(cursor[0] + 2, Utf8Entry.class));
        cursor[0] += 4;
        component.attributes = DoppioClassReader.readNestedAttributes(component, reader, cursor, end);
        components.add(component);
      }
      require(cursor[0] == end, "Trailing Record attribute data");
      return new RecordValue(name, components, pool, payload);
    }
    if ("PermittedSubclasses".equals(key)) {
      require(owner instanceof ClassModel, "Invalid PermittedSubclasses location");
      require(payload.length >= 2, "Truncated PermittedSubclasses attribute");
      int count = reader.readU2(start); length(payload, 2 + count * 2);
      List<ClassEntry> entries = new ArrayList<ClassEntry>();
      for (int index = 0; index < count; index++) entries.add(reader.readEntry(start + 2 + index * 2, ClassEntry.class));
      return new PermittedValue(name, entries, pool, payload);
    }
    if ("EnclosingMethod".equals(key)) {
      require(owner instanceof ClassModel, "Invalid EnclosingMethod location"); length(payload, 4);
      return new EnclosingValue(name, reader.readEntry(start, ClassEntry.class), reader.readEntryOrNull(start + 2, NameAndTypeEntry.class), pool, payload);
    }
    if ("MethodParameters".equals(key)) {
      require(owner instanceof MethodModel, "Invalid MethodParameters location");
      require(payload.length >= 1, "Truncated MethodParameters attribute");
      int count = reader.readU1(start); length(payload, 1 + count * 4);
      List<MethodParameterInfo> parameters = new ArrayList<MethodParameterInfo>();
      for (int index = 0; index < count; index++) {
        int at = start + 1 + index * 4;
        parameters.add(methodParameter(Optional.ofNullable(reader.readEntryOrNull(at, Utf8Entry.class)), reader.readU2(at + 2)));
      }
      return new ParametersValue(name, parameters, pool, payload);
    }
    if ("SourceID".equals(key) || "CompilationID".equals(key)) {
      require(owner instanceof ClassModel, "Invalid identifier attribute location"); length(payload, 2);
      Utf8Entry value = reader.readEntry(start, Utf8Entry.class);
      return "SourceID".equals(key) ? new SourceValue(name, value, pool, payload) : new CompilationValue(name, value, pool, payload);
    }
    return null;
  }
  static byte[] retainedPayload(Attribute<?> attribute) {
    return attribute instanceof Base && ((Base<?>) attribute).payload != null ? ((Base<?>) attribute).payload.clone() : null;
  }
  static ConstantPool sourcePool(Attribute<?> attribute) { return attribute instanceof Base ? ((Base<?>) attribute).pool : null; }
  public static RecordAttribute record(List<RecordComponentInfo> components) { return new RecordValue(name("Record"), components, null, null); }
  public static RecordComponentInfo recordComponent(Utf8Entry name, Utf8Entry descriptor, List<Attribute<?>> attributes) {
    return new UnboundComponent(name, descriptor, attributes);
  }
  public static RecordComponentInfo recordComponent(String name, ClassDesc descriptor, List<Attribute<?>> attributes) {
    DoppioConstantPool pool = new DoppioConstantPool();
    return recordComponent(pool.utf8Entry(name), pool.utf8Entry(descriptor), attributes);
  }
  public static PermittedSubclassesAttribute permittedSubclasses(List<ClassEntry> subclasses) {
    return new PermittedValue(name("PermittedSubclasses"), subclasses, null, null);
  }
  public static PermittedSubclassesAttribute permittedSubclassSymbols(List<ClassDesc> subclasses) {
    List<ClassEntry> entries = new ArrayList<ClassEntry>();
    ConstantPoolBuilder pool = DoppioConstantPool.temporaryPool();
    for (ClassDesc subclass : Objects.requireNonNull(subclasses)) entries.add(pool.classEntry(subclass));
    return permittedSubclasses(entries);
  }
  public static EnclosingMethodAttribute enclosingMethod(ClassEntry owner, Optional<NameAndTypeEntry> method) {
    return new EnclosingValue(name("EnclosingMethod"), owner, method.orElse(null), null, null);
  }
  public static EnclosingMethodAttribute enclosingMethod(ClassDesc owner, Optional<String> methodName, Optional<MethodTypeDesc> methodType) {
    DoppioConstantPool pool = new DoppioConstantPool(); ClassEntry className = pool.classEntry(owner);
    NameAndTypeEntry method = methodName.isPresent() && methodType.isPresent() ? pool.nameAndTypeEntry(methodName.get(), methodType.get()) : null;
    return new EnclosingValue(name("EnclosingMethod"), className, method, null, null);
  }
  public static MethodParametersAttribute methodParameters(List<MethodParameterInfo> parameters) {
    return new ParametersValue(name("MethodParameters"), parameters, null, null);
  }
  public static MethodParameterInfo methodParameter(Optional<Utf8Entry> name, int flags) { return new ParameterValue(name, flags); }
  public static MethodParameterInfo methodParameter(Optional<String> name, AccessFlag[] flags) {
    Optional<Utf8Entry> entry = name.map(value -> new DoppioConstantPool().utf8Entry(value));
    return methodParameter(entry, DoppioBuilders.flags(flags, AccessFlag.Location.METHOD_PARAMETER));
  }
  public static MethodParameterInfo namedMethodParameter(Optional<String> name, int flags) {
    return methodParameter(name.map(value -> new DoppioConstantPool().utf8Entry(value)), flags);
  }
  public static SourceIDAttribute sourceId(Utf8Entry value) { return new SourceValue(name("SourceID"), value, null, null); }
  public static SourceIDAttribute sourceId(String value) { return sourceId(new DoppioConstantPool().utf8Entry(value)); }
  public static CompilationIDAttribute compilationId(Utf8Entry value) { return new CompilationValue(name("CompilationID"), value, null, null); }
  public static CompilationIDAttribute compilationId(String value) { return compilationId(new DoppioConstantPool().utf8Entry(value)); }
  private static Utf8Entry name(String value) { return new DoppioConstantPool().utf8Entry(value); }
  private static void require(boolean condition, String message) { if (!condition) throw new IllegalArgumentException(message); }
  private static void length(byte[] payload, int expected) { require(payload.length == expected, "Invalid metadata attribute length"); }
  private static <T> List<T> immutable(List<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : copy) Objects.requireNonNull(value);
    return Collections.unmodifiableList(copy);
  }
  private abstract static class Base<A extends Attribute<A>> implements Attribute<A> {
    final Utf8Entry name; final ConstantPool pool; final byte[] payload;
    Base(Utf8Entry name, ConstantPool pool, byte[] payload) { this.name = name; this.pool = pool; this.payload = payload == null ? null : payload.clone(); }
    public Utf8Entry attributeName() { return name; }
  }
  private static final class RecordValue extends Base<RecordAttribute> implements RecordAttribute {
    final List<RecordComponentInfo> components;
    RecordValue(Utf8Entry name, List<RecordComponentInfo> components, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.components = immutable(components); }
    public AttributeMapper<RecordAttribute> attributeMapper() { return RECORD; }
    public List<RecordComponentInfo> components() { return components; }
  }
  private static final class PermittedValue extends Base<PermittedSubclassesAttribute> implements PermittedSubclassesAttribute {
    final List<ClassEntry> subclasses;
    PermittedValue(Utf8Entry name, List<ClassEntry> subclasses, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.subclasses = immutable(subclasses); }
    public AttributeMapper<PermittedSubclassesAttribute> attributeMapper() { return PERMITTED; }
    public List<ClassEntry> permittedSubclasses() { return subclasses; }
  }
  private static final class EnclosingValue extends Base<EnclosingMethodAttribute> implements EnclosingMethodAttribute {
    final ClassEntry owner; final NameAndTypeEntry method;
    EnclosingValue(Utf8Entry name, ClassEntry owner, NameAndTypeEntry method, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.owner = Objects.requireNonNull(owner); this.method = method; }
    public AttributeMapper<EnclosingMethodAttribute> attributeMapper() { return ENCLOSING; }
    public ClassEntry enclosingClass() { return owner; }
    public Optional<NameAndTypeEntry> enclosingMethod() { return Optional.ofNullable(method); }
  }
  private static final class ParametersValue extends Base<MethodParametersAttribute> implements MethodParametersAttribute {
    final List<MethodParameterInfo> parameters;
    ParametersValue(Utf8Entry name, List<MethodParameterInfo> parameters, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.parameters = immutable(parameters); }
    public AttributeMapper<MethodParametersAttribute> attributeMapper() { return PARAMETERS; }
    public List<MethodParameterInfo> parameters() { return parameters; }
  }
  private static final class SourceValue extends Base<SourceIDAttribute> implements SourceIDAttribute {
    final Utf8Entry value;
    SourceValue(Utf8Entry name, Utf8Entry value, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.value = Objects.requireNonNull(value); }
    public AttributeMapper<SourceIDAttribute> attributeMapper() { return SOURCE; }
    public Utf8Entry sourceId() { return value; }
  }
  private static final class CompilationValue extends Base<CompilationIDAttribute> implements CompilationIDAttribute {
    final Utf8Entry value;
    CompilationValue(Utf8Entry name, Utf8Entry value, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.value = Objects.requireNonNull(value); }
    public AttributeMapper<CompilationIDAttribute> attributeMapper() { return COMPILATION; }
    public Utf8Entry compilationId() { return value; }
  }
  private abstract static class ComponentBase implements RecordComponentInfo {
    final Utf8Entry name, descriptor;
    ComponentBase(Utf8Entry name, Utf8Entry descriptor) { this.name = Objects.requireNonNull(name); this.descriptor = Objects.requireNonNull(descriptor); }
    public Utf8Entry name() { return name; }
    public Utf8Entry descriptor() { return descriptor; }
  }
  private static final class UnboundComponent extends ComponentBase {
    final List<Attribute<?>> attributes;
    UnboundComponent(Utf8Entry name, Utf8Entry descriptor, List<Attribute<?>> attributes) { super(name, descriptor); this.attributes = immutable(attributes); }
    public List<Attribute<?>> attributes() { return attributes; }
    public boolean equals(Object value) {
      if (!(value instanceof UnboundComponent)) return false; UnboundComponent other = (UnboundComponent) value;
      return name.equals(other.name) && descriptor.equals(other.descriptor) && attributes.equals(other.attributes);
    }
    public int hashCode() { return (31 * name.hashCode() + descriptor.hashCode()) * 31 + attributes.hashCode(); }
  }
  private static final class BoundComponent extends ComponentBase {
    List<Attribute<?>> attributes = Collections.emptyList();
    BoundComponent(Utf8Entry name, Utf8Entry descriptor) { super(name, descriptor); }
    public List<Attribute<?>> attributes() { return attributes; }
  }
  private static final class ParameterValue implements MethodParameterInfo {
    final Optional<Utf8Entry> name; final int flags;
    ParameterValue(Optional<Utf8Entry> name, int flags) { this.name = Objects.requireNonNull(name); this.flags = flags; }
    public Optional<Utf8Entry> name() { return name; }
    public int flagsMask() { return flags; }
    public boolean equals(Object value) { return value instanceof ParameterValue && name.equals(((ParameterValue) value).name) && flags == ((ParameterValue) value).flags; }
    public int hashCode() { return 31 * name.hashCode() + flags; }
  }
}
