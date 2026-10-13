package java.lang.classfile;

import java.lang.classfile.AttributeMapper.AttributeStability;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/** Selected typed attribute codecs; every pool reference is imported by the destination writer. */
public final class DoppioAttributes {
  private DoppioAttributes() {}

  static final AttributeMapper<ConstantValueAttribute> CONSTANT_VALUE = new Mapper<ConstantValueAttribute>("ConstantValue", false) {
    void payload(BufWriter writer, ConstantValueAttribute value) { writer.writeIndex(value.constant()); }
  };
  static final AttributeMapper<SignatureAttribute> SIGNATURE = new Mapper<SignatureAttribute>("Signature", false) {
    void payload(BufWriter writer, SignatureAttribute value) { writer.writeIndex(value.signature()); }
  };
  static final AttributeMapper<ExceptionsAttribute> EXCEPTIONS = new Mapper<ExceptionsAttribute>("Exceptions", false) {
    void payload(BufWriter writer, ExceptionsAttribute value) { writeClassList(writer, value.exceptions()); }
  };
  static final AttributeMapper<NestHostAttribute> NEST_HOST = new Mapper<NestHostAttribute>("NestHost", false) {
    void payload(BufWriter writer, NestHostAttribute value) { writer.writeIndex(value.nestHost()); }
  };
  static final AttributeMapper<NestMembersAttribute> NEST_MEMBERS = new Mapper<NestMembersAttribute>("NestMembers", false) {
    void payload(BufWriter writer, NestMembersAttribute value) { writeClassList(writer, value.nestMembers()); }
  };
  static final AttributeMapper<InnerClassesAttribute> INNER_CLASSES = new Mapper<InnerClassesAttribute>("InnerClasses", false) {
    void payload(BufWriter writer, InnerClassesAttribute value) {
      count(writer, value.classes().size());
      for (InnerClassInfo entry : value.classes()) {
        writer.writeIndex(entry.innerClass()); writer.writeIndexOrZero(entry.outerClass().orElse(null));
        writer.writeIndexOrZero(entry.innerName().orElse(null)); writer.writeU2(entry.flagsMask());
      }
    }
  };
  static final AttributeMapper<DeprecatedAttribute> DEPRECATED = new Mapper<DeprecatedAttribute>("Deprecated", true) {
    public AttributeStability stability() { return AttributeStability.STATELESS; }
    void payload(BufWriter writer, DeprecatedAttribute value) {}
  };
  static final AttributeMapper<SyntheticAttribute> SYNTHETIC = new Mapper<SyntheticAttribute>("Synthetic", true) {
    public AttributeStability stability() { return AttributeStability.STATELESS; }
    void payload(BufWriter writer, SyntheticAttribute value) {}
  };
  static final AttributeMapper<BootstrapMethodsAttribute> BOOTSTRAPS = new Mapper<BootstrapMethodsAttribute>("BootstrapMethods", false) {
    void payload(BufWriter writer, BootstrapMethodsAttribute value) {
      if (!(value instanceof BootstrapValue) || !writer.canWriteDirect(((BootstrapValue) value).pool))
        throw new UnsupportedOperationException("BootstrapMethods is generated from the destination constant pool");
      writer.writeBytes(((BootstrapValue) value).payload);
    }
  };

  private abstract static class Mapper<A extends Attribute<A>> implements AttributeMapper<A> {
    final String name;
    final boolean multiple;
    Mapper(String name, boolean multiple) { this.name = name; this.multiple = multiple; }
    public String name() { return name; }
    public boolean allowMultiple() { return multiple; }
    public AttributeStability stability() { return AttributeStability.CP_REFS; }
    @SuppressWarnings("unchecked")
    public A readAttribute(AttributedElement owner, ClassReader reader, int start) {
      return (A) readSelected(owner, reader, reader.readEntry(start - 6, Utf8Entry.class), start,
          reader.readBytes(start, reader.readInt(start - 4)));
    }
    public void writeAttribute(BufWriter writer, A value) {
      writer.writeIndex(value.attributeName());
      int lengthAt = writer.size(); writer.writeInt(0);
      int start = writer.size(); payload(writer, value);
      writer.patchInt(lengthAt, 4, writer.size() - start);
    }
    abstract void payload(BufWriter writer, A value);
  }

  public static Attribute<?> read(AttributedElement owner, ClassReader reader, Utf8Entry name, int start, byte[] payload) {
    Attribute<?> known = readSelected(owner, reader, name, start, payload);
    if (known != null) return known;
    // Native built-in mappings have precedence, including families whose typed
    // codecs are not selected here. An extension mapper cannot override them.
    if (opaqueStability(name.stringValue()) != AttributeStability.UNKNOWN) return null;
    AttributeMapper<?> custom = reader.customAttributes().apply(name);
    if (custom == null) return null;
    // Native bound record components expose an attributed Info, but their
    // custom nested mapper callback deliberately receives no enclosing owner.
    AttributedElement callbackOwner = owner instanceof RecordComponentInfo ? null : owner;
    return Objects.requireNonNull(custom.readAttribute(callbackOwner, reader, start), "Custom attribute mapper returned null");
  }

  private static Attribute<?> readSelected(AttributedElement owner, ClassReader reader, Utf8Entry name, int start, byte[] payload) {
    Attribute<?> debug = DoppioDebugAttributes.read(owner, reader, name, start, payload);
    if (debug != null) return debug;
    Attribute<?> metadata = DoppioMetadataAttributes.read(owner, reader, name, start, payload);
    if (metadata != null) return metadata;
    Attribute<?> annotation = DoppioAnnotationAttributes.read(owner, reader, name, start, payload);
    if (annotation != null) return annotation;
    String key = name.stringValue();
    ConstantPool source = DoppioClassReader.readerPool(reader);
    if ("ConstantValue".equals(key)) {
      length(payload, 2); requireOwner(owner instanceof FieldModel, key);
      return new ConstantValue(name, reader.readEntry(start, ConstantValueEntry.class), source, payload);
    }
    if ("Signature".equals(key)) {
      length(payload, 2); requireOwner(owner instanceof ClassModel || owner instanceof FieldModel || owner instanceof MethodModel ||
          owner instanceof RecordComponentInfo, key);
      return new SignatureValue(name, reader.readEntry(start, Utf8Entry.class), source, payload);
    }
    if ("Exceptions".equals(key)) {
      requireOwner(owner instanceof MethodModel, key);
      return new ExceptionsValue(name, readClassList(reader, start, payload), source, payload);
    }
    if ("NestHost".equals(key)) {
      length(payload, 2); requireOwner(owner instanceof ClassModel, key);
      return new NestHostValue(name, reader.readEntry(start, ClassEntry.class), source, payload);
    }
    if ("NestMembers".equals(key)) {
      requireOwner(owner instanceof ClassModel, key);
      return new NestMembersValue(name, readClassList(reader, start, payload), source, payload);
    }
    if ("InnerClasses".equals(key)) {
      requireOwner(owner instanceof ClassModel, key);
      if (payload.length < 2) throw new IllegalArgumentException("Truncated InnerClasses attribute");
      int count = reader.readU2(start); length(payload, 2 + count * 8);
      List<InnerClassInfo> entries = new ArrayList<InnerClassInfo>();
      for (int index = 0; index < count; index++) {
        int at = start + 2 + index * 8;
        entries.add(innerClass(reader.readEntry(at, ClassEntry.class),
            Optional.ofNullable(reader.readEntryOrNull(at + 2, ClassEntry.class)),
            Optional.ofNullable(reader.readEntryOrNull(at + 4, Utf8Entry.class)), reader.readU2(at + 6)));
      }
      return new InnerClassesValue(name, entries, source, payload);
    }
    if ("Deprecated".equals(key)) {
      length(payload, 0); requireOwner(owner instanceof ClassModel || owner instanceof FieldModel || owner instanceof MethodModel, key);
      return new DeprecatedValue(name, source, payload);
    }
    if ("Synthetic".equals(key)) {
      length(payload, 0); requireOwner(owner instanceof ClassModel || owner instanceof FieldModel || owner instanceof MethodModel, key);
      return new SyntheticValue(name, source, payload);
    }
    if ("BootstrapMethods".equals(key)) {
      requireOwner(owner instanceof ClassModel, key);
      ConstantPool pool = ((ClassModel) owner).constantPool();
      if (!(pool instanceof DoppioConstantPool)) throw new IllegalArgumentException("Missing bootstrap constant pool");
      List<BootstrapMethodEntry> entries = new ArrayList<BootstrapMethodEntry>();
      for (int index = 0; index < pool.bootstrapMethodCount(); index++) entries.add(pool.bootstrapMethodEntry(index));
      return new BootstrapValue(name, entries, pool, payload);
    }
    return null;
  }

  public static boolean shouldWrite(Attribute<?> value, ClassFile.AttributesProcessingOption option) {
    Objects.requireNonNull(value); Objects.requireNonNull(option);
    // Native custom mappers create unbound elements and are retained even for UNKNOWN/UNSTABLE stability.
    if (value instanceof CustomAttribute) return true;
    AttributeStability stability = Objects.requireNonNull(value.attributeMapper().stability());
    if (option == ClassFile.AttributesProcessingOption.DROP_UNKNOWN_ATTRIBUTES) return stability != AttributeStability.UNKNOWN;
    if (option == ClassFile.AttributesProcessingOption.DROP_UNSTABLE_ATTRIBUTES)
      return stability != AttributeStability.UNKNOWN && stability != AttributeStability.UNSTABLE;
    return true;
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  public static void write(BufWriter writer, Attribute<?> attribute) {
    Objects.requireNonNull(writer); Objects.requireNonNull(attribute);
    AttributeMapper mapper = Objects.requireNonNull(attribute.attributeMapper());
    mapper.writeAttribute(writer, attribute);
  }

  // Unselected built-ins retain their real policy classification; this does not authorize raw CP or label remapping.
  private static final Set<String> KNOWN_CP = new HashSet<String>(Arrays.asList(
      "AnnotationDefault", "Record", "Module", "ModuleTarget", "ModuleHashes", "RuntimeVisibleAnnotations",
      "CompilationID", "EnclosingMethod", "MethodParameters", "ModuleMainClass", "ModulePackages",
      "PermittedSubclasses", "RuntimeInvisibleAnnotations", "RuntimeInvisibleParameterAnnotations",
      "RuntimeVisibleParameterAnnotations", "SourceID"));
  static AttributeStability opaqueStability(String name) {
    if (KNOWN_CP.contains(name)) return AttributeStability.CP_REFS;
    if ("CharacterRangeTable".equals(name) || "LineNumberTable".equals(name) ||
        "LocalVariableTable".equals(name) || "LocalVariableTypeTable".equals(name)) return AttributeStability.LABELS;
    if ("RuntimeInvisibleTypeAnnotations".equals(name) || "RuntimeVisibleTypeAnnotations".equals(name))
      return AttributeStability.UNSTABLE;
    if ("SourceDebugExtension".equals(name) || "ModuleResolution".equals(name)) return AttributeStability.STATELESS;
    return AttributeStability.UNKNOWN;
  }
  static boolean opaqueAllowMultiple(String name) {
    return "CharacterRangeTable".equals(name) || "LineNumberTable".equals(name) ||
        "LocalVariableTable".equals(name) || "LocalVariableTypeTable".equals(name);
  }
  static byte[] retainedPayload(Attribute<?> attribute) {
    if (attribute instanceof Base && ((Base<?>) attribute).payload != null) return ((Base<?>) attribute).payload.clone();
    byte[] debug = DoppioDebugAttributes.retainedPayload(attribute);
    if (debug != null) return debug;
    byte[] metadata = DoppioMetadataAttributes.retainedPayload(attribute);
    return metadata != null ? metadata : DoppioAnnotationAttributes.retainedPayload(attribute);
  }
  static ConstantPool sourcePool(Attribute<?> attribute) {
    if (attribute instanceof Base) return ((Base<?>) attribute).pool;
    ConstantPool debug = DoppioDebugAttributes.sourcePool(attribute);
    if (debug != null) return debug;
    ConstantPool metadata = DoppioMetadataAttributes.sourcePool(attribute);
    return metadata != null ? metadata : DoppioAnnotationAttributes.sourcePool(attribute);
  }

  private static void requireOwner(boolean allowed, String name) {
    if (!allowed) throw new IllegalArgumentException("Invalid enclosing element for " + name);
  }
  private static void length(byte[] payload, int length) {
    if (payload.length != length) throw new IllegalArgumentException("Invalid attribute payload length");
  }
  private static List<ClassEntry> readClassList(ClassReader reader, int start, byte[] payload) {
    if (payload.length < 2) throw new IllegalArgumentException("Truncated class list attribute");
    int count = reader.readU2(start); length(payload, 2 + count * 2);
    List<ClassEntry> entries = new ArrayList<ClassEntry>();
    for (int index = 0; index < count; index++) entries.add(reader.readEntry(start + 2 + index * 2, ClassEntry.class));
    return entries;
  }
  private static void count(BufWriter writer, int count) {
    if (count < 0 || count > 65535) throw new IllegalArgumentException("Attribute entry count exceeds u2");
    writer.writeU2(count);
  }
  private static void writeClassList(BufWriter writer, List<ClassEntry> entries) {
    count(writer, entries.size());
    for (ClassEntry entry : entries) writer.writeIndex(entry);
  }
  private static <T> List<T> immutable(List<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : copy) Objects.requireNonNull(value);
    return Collections.unmodifiableList(copy);
  }
  public static List<ClassEntry> classEntries(List<ClassDesc> descriptors) {
    DoppioConstantPool pool = new DoppioConstantPool();
    List<ClassEntry> entries = new ArrayList<ClassEntry>();
    for (ClassDesc descriptor : Objects.requireNonNull(descriptors)) entries.add(pool.classEntry(Objects.requireNonNull(descriptor)));
    return entries;
  }
  public static ConstantValueAttribute constantValue(ConstantDesc constant) {
    return constantValue(new DoppioConstantPool().constantValueEntry(Objects.requireNonNull(constant)));
  }
  public static ConstantValueAttribute constantValue(ConstantValueEntry constant) {
    Objects.requireNonNull(constant);
    return new ConstantValue(new DoppioConstantPool().utf8Entry("ConstantValue"), constant, null, null);
  }
  public static SignatureAttribute signature(Utf8Entry signature) {
    return new SignatureValue(new DoppioConstantPool().utf8Entry("Signature"), Objects.requireNonNull(signature), null, null);
  }
  public static ExceptionsAttribute exceptions(List<ClassEntry> exceptions) {
    return new ExceptionsValue(new DoppioConstantPool().utf8Entry("Exceptions"), exceptions, null, null);
  }
  public static NestHostAttribute nestHost(ClassEntry host) {
    return new NestHostValue(new DoppioConstantPool().utf8Entry("NestHost"), Objects.requireNonNull(host), null, null);
  }
  public static NestMembersAttribute nestMembers(List<ClassEntry> members) {
    return new NestMembersValue(new DoppioConstantPool().utf8Entry("NestMembers"), members, null, null);
  }
  public static InnerClassesAttribute innerClasses(List<InnerClassInfo> classes) {
    return new InnerClassesValue(new DoppioConstantPool().utf8Entry("InnerClasses"), classes, null, null);
  }
  public static InnerClassInfo innerClass(ClassEntry inner, Optional<ClassEntry> outer, Optional<Utf8Entry> name, int flags) {
    if ((flags & ~65535) != 0) throw new IllegalArgumentException("Inner class flags exceed u2");
    return new InnerValue(Objects.requireNonNull(inner), Objects.requireNonNull(outer), Objects.requireNonNull(name), flags);
  }
  public static DeprecatedAttribute deprecatedAttribute() { return new DeprecatedValue(new DoppioConstantPool().utf8Entry("Deprecated"), null, null); }
  public static SyntheticAttribute synthetic() { return new SyntheticValue(new DoppioConstantPool().utf8Entry("Synthetic"), null, null); }

  private abstract static class Base<A extends Attribute<A>> implements Attribute<A> {
    final Utf8Entry name;
    final ConstantPool pool;
    final byte[] payload;
    Base(Utf8Entry name, ConstantPool pool, byte[] payload) {
      this.name = name; this.pool = pool; this.payload = payload == null ? null : payload.clone();
    }
    public Utf8Entry attributeName() { return name; }
  }
  private static final class ConstantValue extends Base<ConstantValueAttribute> implements ConstantValueAttribute {
    final ConstantValueEntry constant;
    ConstantValue(Utf8Entry name, ConstantValueEntry constant, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.constant = constant; }
    public AttributeMapper<ConstantValueAttribute> attributeMapper() { return CONSTANT_VALUE; }
    public ConstantValueEntry constant() { return constant; }
  }
  private static final class SignatureValue extends Base<SignatureAttribute> implements SignatureAttribute {
    final Utf8Entry signature;
    SignatureValue(Utf8Entry name, Utf8Entry signature, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.signature = signature; }
    public AttributeMapper<SignatureAttribute> attributeMapper() { return SIGNATURE; }
    public Utf8Entry signature() { return signature; }
  }
  private static final class ExceptionsValue extends Base<ExceptionsAttribute> implements ExceptionsAttribute {
    final List<ClassEntry> entries;
    ExceptionsValue(Utf8Entry name, List<ClassEntry> entries, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.entries = immutable(entries); }
    public AttributeMapper<ExceptionsAttribute> attributeMapper() { return EXCEPTIONS; }
    public List<ClassEntry> exceptions() { return entries; }
  }
  private static final class NestHostValue extends Base<NestHostAttribute> implements NestHostAttribute {
    final ClassEntry host;
    NestHostValue(Utf8Entry name, ClassEntry host, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.host = host; }
    public AttributeMapper<NestHostAttribute> attributeMapper() { return NEST_HOST; }
    public ClassEntry nestHost() { return host; }
  }
  private static final class NestMembersValue extends Base<NestMembersAttribute> implements NestMembersAttribute {
    final List<ClassEntry> entries;
    NestMembersValue(Utf8Entry name, List<ClassEntry> entries, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.entries = immutable(entries); }
    public AttributeMapper<NestMembersAttribute> attributeMapper() { return NEST_MEMBERS; }
    public List<ClassEntry> nestMembers() { return entries; }
  }
  private static final class InnerClassesValue extends Base<InnerClassesAttribute> implements InnerClassesAttribute {
    final List<InnerClassInfo> entries;
    InnerClassesValue(Utf8Entry name, List<InnerClassInfo> entries, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.entries = immutable(entries); }
    public AttributeMapper<InnerClassesAttribute> attributeMapper() { return INNER_CLASSES; }
    public List<InnerClassInfo> classes() { return entries; }
  }
  private static final class InnerValue implements InnerClassInfo {
    final ClassEntry inner;
    final Optional<ClassEntry> outer;
    final Optional<Utf8Entry> name;
    final int flags;
    InnerValue(ClassEntry inner, Optional<ClassEntry> outer, Optional<Utf8Entry> name, int flags) { this.inner = inner; this.outer = outer; this.name = name; this.flags = flags; }
    public ClassEntry innerClass() { return inner; }
    public Optional<ClassEntry> outerClass() { return outer; }
    public Optional<Utf8Entry> innerName() { return name; }
    public int flagsMask() { return flags; }
  }
  private static final class DeprecatedValue extends Base<DeprecatedAttribute> implements DeprecatedAttribute {
    DeprecatedValue(Utf8Entry name, ConstantPool pool, byte[] payload) { super(name, pool, payload); }
    public AttributeMapper<DeprecatedAttribute> attributeMapper() { return DEPRECATED; }
  }
  private static final class SyntheticValue extends Base<SyntheticAttribute> implements SyntheticAttribute {
    SyntheticValue(Utf8Entry name, ConstantPool pool, byte[] payload) { super(name, pool, payload); }
    public AttributeMapper<SyntheticAttribute> attributeMapper() { return SYNTHETIC; }
  }
  private static final class BootstrapValue extends Base<BootstrapMethodsAttribute> implements BootstrapMethodsAttribute {
    final List<BootstrapMethodEntry> entries;
    BootstrapValue(Utf8Entry name, List<BootstrapMethodEntry> entries, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.entries = immutable(entries); }
    public AttributeMapper<BootstrapMethodsAttribute> attributeMapper() { return BOOTSTRAPS; }
    public List<BootstrapMethodEntry> bootstrapMethods() { return entries; }
    public int bootstrapMethodsSize() { return entries.size(); }
  }
}
