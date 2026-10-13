package java.lang.classfile;

import java.lang.classfile.AttributeMapper.AttributeStability;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.ModuleDesc;
import java.lang.constant.PackageDesc;
import java.lang.reflect.AccessFlag;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

/** Typed module metadata and destination-pool importing wire codecs, not module runtime resolution. */
public final class DoppioModuleAttributes {
  private DoppioModuleAttributes() {}
  private static final AttributeMapper<ModuleAttribute> MODULE = new Mapper<ModuleAttribute>("Module", AttributeStability.CP_REFS) {
    void payload(BufWriter writer, ModuleAttribute value) {
      writer.writeIndex(value.moduleName()); writer.writeU2(value.moduleFlagsMask()); writer.writeIndexOrZero(value.moduleVersion().orElse(null));
      writer.writeU2(value.requires().size());
      for (ModuleRequireInfo info : value.requires()) {
        writer.writeIndex(info.requires()); writer.writeU2(info.requiresFlagsMask()); writer.writeIndexOrZero(info.requiresVersion().orElse(null));
      }
      writer.writeU2(value.exports().size());
      for (ModuleExportInfo info : value.exports()) {
        writer.writeIndex(info.exportedPackage()); writer.writeU2(info.exportsFlagsMask()); writeEntries(writer, info.exportsTo());
      }
      writer.writeU2(value.opens().size());
      for (ModuleOpenInfo info : value.opens()) {
        writer.writeIndex(info.openedPackage()); writer.writeU2(info.opensFlagsMask()); writeEntries(writer, info.opensTo());
      }
      writeEntries(writer, value.uses()); writer.writeU2(value.provides().size());
      for (ModuleProvideInfo info : value.provides()) {
        writer.writeIndex(info.provides()); writeEntries(writer, info.providesWith());
      }
    }
  };
  private static final AttributeMapper<ModulePackagesAttribute> PACKAGES = new Mapper<ModulePackagesAttribute>("ModulePackages", AttributeStability.CP_REFS) {
    void payload(BufWriter writer, ModulePackagesAttribute value) { writeEntries(writer, value.packages()); }
  };
  private static final AttributeMapper<ModuleMainClassAttribute> MAIN = new Mapper<ModuleMainClassAttribute>("ModuleMainClass", AttributeStability.CP_REFS) {
    void payload(BufWriter writer, ModuleMainClassAttribute value) { writer.writeIndex(value.mainClass()); }
  };
  private static final AttributeMapper<ModuleTargetAttribute> TARGET = new Mapper<ModuleTargetAttribute>("ModuleTarget", AttributeStability.CP_REFS) {
    void payload(BufWriter writer, ModuleTargetAttribute value) { writer.writeIndex(value.targetPlatform()); }
  };
  private static final AttributeMapper<ModuleResolutionAttribute> RESOLUTION = new Mapper<ModuleResolutionAttribute>("ModuleResolution", AttributeStability.STATELESS) {
    void payload(BufWriter writer, ModuleResolutionAttribute value) { writer.writeU2(value.resolutionFlags()); }
  };
  private static final AttributeMapper<ModuleHashesAttribute> HASHES = new Mapper<ModuleHashesAttribute>("ModuleHashes", AttributeStability.CP_REFS) {
    void payload(BufWriter writer, ModuleHashesAttribute value) {
      writer.writeIndex(value.algorithm()); writer.writeU2(value.hashes().size());
      for (ModuleHashInfo info : value.hashes()) {
        writer.writeIndex(info.moduleName()); writer.writeU2(info.hash().length); writer.writeBytes(info.hash());
      }
    }
  };
  private abstract static class Mapper<A extends Attribute<A>> implements AttributeMapper<A> {
    final String name; final AttributeStability stability;
    Mapper(String name, AttributeStability stability) { this.name = name; this.stability = stability; }
    public String name() { return name; }
    public AttributeStability stability() { return stability; }
    @SuppressWarnings("unchecked")
    public A readAttribute(AttributedElement owner, ClassReader reader, int start) {
      return (A) read(owner, reader, reader.readEntry(start - 6, Utf8Entry.class), start,
          reader.readBytes(start, reader.readInt(start - 4)));
    }
    public void writeAttribute(BufWriter writer, A value) {
      byte[] retained = retainedPayload(value); ConstantPool source = sourcePool(value);
      if (retained != null && source != null && writer.canWriteDirect(source)) {
        // Native bound module attributes preserve the original shared-pool
        // packet, including a hash array whose exposed model view was mutated.
        writer.writeIndex(value.attributeName()); writer.writeInt(retained.length); writer.writeBytes(retained);
        return;
      }
      writer.writeIndex(value.attributeName()); int lengthAt = writer.size(); writer.writeInt(0);
      int start = writer.size(); payload(writer, value); writer.patchInt(lengthAt, 4, writer.size() - start);
    }
    abstract void payload(BufWriter writer, A value);
  }
  static AttributeMapper<ModuleAttribute> moduleMapper() { return MODULE; }
  static AttributeMapper<ModulePackagesAttribute> modulePackagesMapper() { return PACKAGES; }
  static AttributeMapper<ModuleMainClassAttribute> moduleMainClassMapper() { return MAIN; }
  static AttributeMapper<ModuleTargetAttribute> moduleTargetMapper() { return TARGET; }
  static AttributeMapper<ModuleResolutionAttribute> moduleResolutionMapper() { return RESOLUTION; }
  static AttributeMapper<ModuleHashesAttribute> moduleHashesMapper() { return HASHES; }
  private static void writeEntries(BufWriter writer, List<? extends PoolEntry> entries) {
    writer.writeU2(entries.size()); for (PoolEntry entry : entries) writer.writeIndex(entry);
  }
  static Attribute<?> read(AttributedElement owner, ClassReader reader, Utf8Entry name, int start, byte[] payload) {
    String key = name.stringValue();
    if (!"Module".equals(key) && !"ModulePackages".equals(key) && !"ModuleMainClass".equals(key) &&
        !"ModuleTarget".equals(key) && !"ModuleResolution".equals(key) && !"ModuleHashes".equals(key)) return null;
    ConstantPool pool = DoppioClassReader.readerPool(reader);
    Cursor cursor = new Cursor(reader, start, start + payload.length); Attribute<?> result;
    if ("Module".equals(key)) {
      ModuleEntry moduleName = cursor.entry(ModuleEntry.class); int flags = cursor.u2(); Utf8Entry version = cursor.optionalEntry(Utf8Entry.class);
      List<ModuleRequireInfo> requires = new ArrayList<ModuleRequireInfo>();
      int count = cursor.u2();
      for (int index = 0; index < count; index++) requires.add(require(cursor.entry(ModuleEntry.class), cursor.u2(), cursor.optionalEntry(Utf8Entry.class)));
      List<ModuleExportInfo> exports = new ArrayList<ModuleExportInfo>(); count = cursor.u2();
      for (int index = 0; index < count; index++) exports.add(export(cursor.entry(PackageEntry.class), cursor.u2(), cursor.entries(ModuleEntry.class)));
      List<ModuleOpenInfo> opens = new ArrayList<ModuleOpenInfo>(); count = cursor.u2();
      for (int index = 0; index < count; index++) opens.add(open(cursor.entry(PackageEntry.class), cursor.u2(), cursor.entries(ModuleEntry.class)));
      List<ClassEntry> uses = cursor.entries(ClassEntry.class); List<ModuleProvideInfo> provides = new ArrayList<ModuleProvideInfo>(); count = cursor.u2();
      for (int index = 0; index < count; index++) provides.add(provide(cursor.entry(ClassEntry.class), cursor.entries(ClassEntry.class)));
      result = new ModuleValue(name, moduleName, flags, version, requires, exports, opens, uses, provides, pool, payload);
    } else if ("ModulePackages".equals(key)) result = new PackagesValue(name, cursor.entries(PackageEntry.class), pool, payload);
    else if ("ModuleMainClass".equals(key)) result = new MainValue(name, cursor.entry(ClassEntry.class), pool, payload);
    else if ("ModuleTarget".equals(key)) result = new TargetValue(name, cursor.entry(Utf8Entry.class), pool, payload);
    else if ("ModuleResolution".equals(key)) result = new ResolutionValue(name, cursor.u2(), pool, payload);
    else {
      Utf8Entry algorithm = cursor.entry(Utf8Entry.class); int count = cursor.u2(); List<ModuleHashInfo> hashes = new ArrayList<ModuleHashInfo>();
      for (int index = 0; index < count; index++) hashes.add(hash(cursor.entry(ModuleEntry.class), cursor.bytes(cursor.u2())));
      result = new HashesValue(name, algorithm, hashes, pool, payload);
    }
    cursor.finish(); return result;
  }
  private static final class Cursor {
    final ClassReader reader; final int end; int at;
    Cursor(ClassReader reader, int start, int end) { this.reader = reader; this.at = start; this.end = end; if (start < 0 || end < start) throw new IllegalArgumentException("Invalid module attribute bounds"); }
    void need(int count) { if (count < 0 || end - at < count) throw new IllegalArgumentException("Truncated module attribute"); }
    int u2() { need(2); int result = reader.readU2(at); at += 2; return result; }
    <T extends PoolEntry> T entry(Class<T> type) { need(2); T result = reader.readEntry(at, type); at += 2; return result; }
    <T extends PoolEntry> T optionalEntry(Class<T> type) { need(2); T result = reader.readEntryOrNull(at, type); at += 2; return result; }
    <T extends PoolEntry> List<T> entries(Class<T> type) { int count = u2(); List<T> values = new ArrayList<T>(); for (int index = 0; index < count; index++) values.add(entry(type)); return values; }
    byte[] bytes(int count) { need(count); byte[] result = reader.readBytes(at, count); at += count; return result; }
    void finish() { if (at != end) throw new IllegalArgumentException("Trailing module attribute data"); }
  }
  static byte[] retainedPayload(Attribute<?> attribute) { return attribute instanceof Base && ((Base<?>) attribute).payload != null ? ((Base<?>) attribute).payload.clone() : null; }
  static ConstantPool sourcePool(Attribute<?> attribute) { return attribute instanceof Base ? ((Base<?>) attribute).pool : null; }
  private static ConstantPoolBuilder temporaryPool() { return DoppioConstantPool.temporaryPool(); }
  private static Utf8Entry name(String name) { return temporaryPool().utf8Entry(name); }
  public static int flags(AccessFlag.Location location, Collection<AccessFlag> flags) {
    int result = 0;
    for (AccessFlag flag : flags) {
      if (!flag.locations().contains(location)) throw new IllegalArgumentException("Unexpected flag at " + location + ": " + flag);
      result |= flag.mask();
    }
    return result;
  }
  public static ModuleAttribute module(ModuleEntry name, int flags, Utf8Entry version, Collection<ModuleRequireInfo> requires,
      Collection<ModuleExportInfo> exports, Collection<ModuleOpenInfo> opens, Collection<ClassEntry> uses, Collection<ModuleProvideInfo> provides) {
    return new ModuleValue(name("Module"), name, flags, version, requires, exports, opens, uses, provides, null, null);
  }
  public static ModuleAttribute module(ModuleDesc name, Consumer<ModuleAttribute.ModuleAttributeBuilder> handler) { return module(temporaryPool().moduleEntry(name), handler); }
  public static ModuleAttribute module(ModuleEntry name, Consumer<ModuleAttribute.ModuleAttributeBuilder> handler) {
    Builder builder = new Builder(name); handler.accept(builder); return builder.build();
  }
  public static ModuleRequireInfo require(ModuleEntry name, int flags, Utf8Entry version) { return new RequireValue(name, flags, Optional.ofNullable(version)); }
  public static ModuleRequireInfo require(ModuleDesc name, int flags, String version) { return require(temporaryPool().moduleEntry(name), flags, version == null ? null : temporaryPool().utf8Entry(version)); }
  public static ModuleExportInfo export(PackageEntry name, int flags, List<ModuleEntry> targets) { return new ExportValue(name, flags, targets); }
  public static ModuleExportInfo export(PackageDesc name, int flags, List<ModuleDesc> targets) { return export(temporaryPool().packageEntry(name), flags, moduleEntries(targets)); }
  public static ModuleOpenInfo open(PackageEntry name, int flags, List<ModuleEntry> targets) { return new OpenValue(name, flags, targets); }
  public static ModuleOpenInfo open(PackageDesc name, int flags, List<ModuleDesc> targets) { return open(temporaryPool().packageEntry(name), flags, moduleEntries(targets)); }
  private static List<ModuleEntry> moduleEntries(List<ModuleDesc> symbols) {
    List<ModuleEntry> entries = new ArrayList<ModuleEntry>(); for (ModuleDesc symbol : symbols) entries.add(temporaryPool().moduleEntry(symbol)); return entries;
  }
  public static ModuleProvideInfo provide(ClassEntry service, List<ClassEntry> implementations) { return new ProvideValue(service, implementations); }
  public static ModuleProvideInfo provide(ClassDesc service, List<ClassDesc> implementations) {
    List<ClassEntry> entries = new ArrayList<ClassEntry>(); for (ClassDesc symbol : implementations) entries.add(temporaryPool().classEntry(symbol));
    return provide(temporaryPool().classEntry(service), entries);
  }
  public static ModuleHashInfo hash(ModuleEntry name, byte[] hash) { return new HashValue(name, hash); }
  public static ModuleHashInfo hash(ModuleDesc name, byte[] hash) { return hash(temporaryPool().moduleEntry(name), hash); }
  public static ModulePackagesAttribute packages(List<PackageEntry> packages) { return new PackagesValue(name("ModulePackages"), packages, null, null); }
  public static ModulePackagesAttribute packageNames(List<PackageDesc> packages) {
    List<PackageEntry> entries = new ArrayList<PackageEntry>(); for (PackageDesc symbol : packages) entries.add(temporaryPool().packageEntry(symbol)); return packages(entries);
  }
  public static ModuleMainClassAttribute mainClass(ClassEntry mainClass) { return new MainValue(name("ModuleMainClass"), mainClass, null, null); }
  public static ModuleMainClassAttribute mainClass(ClassDesc mainClass) { return mainClass(temporaryPool().classEntry(mainClass)); }
  public static ModuleTargetAttribute target(Utf8Entry target) { return new TargetValue(name("ModuleTarget"), target, null, null); }
  public static ModuleTargetAttribute target(String target) { return target(temporaryPool().utf8Entry(target)); }
  public static ModuleResolutionAttribute resolution(int flags) { return new ResolutionValue(name("ModuleResolution"), flags, null, null); }
  public static ModuleHashesAttribute hashes(Utf8Entry algorithm, List<ModuleHashInfo> hashes) { return new HashesValue(name("ModuleHashes"), algorithm, hashes, null, null); }
  public static ModuleHashesAttribute hashes(String algorithm, List<ModuleHashInfo> hashes) { return hashes(temporaryPool().utf8Entry(algorithm), hashes); }
  private static <T> List<T> immutable(Collection<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values)); for (T value : copy) Objects.requireNonNull(value); return Collections.unmodifiableList(copy);
  }
  private abstract static class Base<A extends Attribute<A>> implements Attribute<A> {
    final Utf8Entry name; final ConstantPool pool; final byte[] payload;
    Base(Utf8Entry name, ConstantPool pool, byte[] payload) { this.name = name; this.pool = pool; this.payload = payload == null ? null : payload.clone(); }
    public Utf8Entry attributeName() { return name; }
  }
  private static final class ModuleValue extends Base<ModuleAttribute> implements ModuleAttribute {
    final ModuleEntry moduleName; final int flags; final Utf8Entry version;
    final List<ModuleRequireInfo> requires; final List<ModuleExportInfo> exports; final List<ModuleOpenInfo> opens; final List<ClassEntry> uses; final List<ModuleProvideInfo> provides;
    ModuleValue(Utf8Entry name, ModuleEntry moduleName, int flags, Utf8Entry version, Collection<ModuleRequireInfo> requires,
        Collection<ModuleExportInfo> exports, Collection<ModuleOpenInfo> opens, Collection<ClassEntry> uses, Collection<ModuleProvideInfo> provides, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.moduleName = Objects.requireNonNull(moduleName); this.flags = flags; this.version = version;
      this.requires = immutable(requires); this.exports = immutable(exports); this.opens = immutable(opens); this.uses = immutable(uses); this.provides = immutable(provides);
    }
    public AttributeMapper<ModuleAttribute> attributeMapper() { return MODULE; }
    public ModuleEntry moduleName() { return moduleName; }
    public int moduleFlagsMask() { return flags; }
    public Optional<Utf8Entry> moduleVersion() { return Optional.ofNullable(version); }
    public List<ModuleRequireInfo> requires() { return requires; }
    public List<ModuleExportInfo> exports() { return exports; }
    public List<ModuleOpenInfo> opens() { return opens; }
    public List<ClassEntry> uses() { return uses; }
    public List<ModuleProvideInfo> provides() { return provides; }
  }
  private static final class PackagesValue extends Base<ModulePackagesAttribute> implements ModulePackagesAttribute {
    final List<PackageEntry> packages;
    PackagesValue(Utf8Entry name, List<PackageEntry> packages, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.packages = immutable(packages); }
    public AttributeMapper<ModulePackagesAttribute> attributeMapper() { return PACKAGES; }
    public List<PackageEntry> packages() { return packages; }
  }
  private static final class MainValue extends Base<ModuleMainClassAttribute> implements ModuleMainClassAttribute {
    final ClassEntry mainClass;
    MainValue(Utf8Entry name, ClassEntry mainClass, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.mainClass = Objects.requireNonNull(mainClass); }
    public AttributeMapper<ModuleMainClassAttribute> attributeMapper() { return MAIN; }
    public ClassEntry mainClass() { return mainClass; }
  }
  private static final class TargetValue extends Base<ModuleTargetAttribute> implements ModuleTargetAttribute {
    final Utf8Entry target;
    TargetValue(Utf8Entry name, Utf8Entry target, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.target = Objects.requireNonNull(target); }
    public AttributeMapper<ModuleTargetAttribute> attributeMapper() { return TARGET; }
    public Utf8Entry targetPlatform() { return target; }
  }
  private static final class ResolutionValue extends Base<ModuleResolutionAttribute> implements ModuleResolutionAttribute {
    final int flags;
    ResolutionValue(Utf8Entry name, int flags, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.flags = flags; }
    public AttributeMapper<ModuleResolutionAttribute> attributeMapper() { return RESOLUTION; }
    public int resolutionFlags() { return flags; }
  }
  private static final class HashesValue extends Base<ModuleHashesAttribute> implements ModuleHashesAttribute {
    final Utf8Entry algorithm; final List<ModuleHashInfo> hashes;
    HashesValue(Utf8Entry name, Utf8Entry algorithm, List<ModuleHashInfo> hashes, ConstantPool pool, byte[] payload) { super(name, pool, payload); this.algorithm = Objects.requireNonNull(algorithm); this.hashes = immutable(hashes); }
    public AttributeMapper<ModuleHashesAttribute> attributeMapper() { return HASHES; }
    public Utf8Entry algorithm() { return algorithm; }
    public List<ModuleHashInfo> hashes() { return hashes; }
  }
  private static final class RequireValue implements ModuleRequireInfo {
    final ModuleEntry name; final int flags; final Optional<Utf8Entry> version;
    RequireValue(ModuleEntry name, int flags, Optional<Utf8Entry> version) { this.name = Objects.requireNonNull(name); this.flags = flags; this.version = Objects.requireNonNull(version); }
    public ModuleEntry requires() { return name; }
    public int requiresFlagsMask() { return flags; }
    public Optional<Utf8Entry> requiresVersion() { return version; }
    public boolean equals(Object value) { if (!(value instanceof RequireValue)) return false; RequireValue other = (RequireValue) value; return name.equals(other.name) && flags == other.flags && version.equals(other.version); }
    public int hashCode() { return (31 * name.hashCode() + flags) * 31 + version.hashCode(); }
  }
  private static final class ExportValue implements ModuleExportInfo {
    final PackageEntry name; final int flags; final List<ModuleEntry> targets;
    ExportValue(PackageEntry name, int flags, List<ModuleEntry> targets) { this.name = Objects.requireNonNull(name); this.flags = flags; this.targets = immutable(targets); }
    public PackageEntry exportedPackage() { return name; }
    public int exportsFlagsMask() { return flags; }
    public List<ModuleEntry> exportsTo() { return targets; }
    public boolean equals(Object value) { if (!(value instanceof ExportValue)) return false; ExportValue other = (ExportValue) value; return name.equals(other.name) && flags == other.flags && targets.equals(other.targets); }
    public int hashCode() { return (31 * name.hashCode() + flags) * 31 + targets.hashCode(); }
  }
  private static final class OpenValue implements ModuleOpenInfo {
    final PackageEntry name; final int flags; final List<ModuleEntry> targets;
    OpenValue(PackageEntry name, int flags, List<ModuleEntry> targets) { this.name = Objects.requireNonNull(name); this.flags = flags; this.targets = immutable(targets); }
    public PackageEntry openedPackage() { return name; }
    public int opensFlagsMask() { return flags; }
    public List<ModuleEntry> opensTo() { return targets; }
    public boolean equals(Object value) { if (!(value instanceof OpenValue)) return false; OpenValue other = (OpenValue) value; return name.equals(other.name) && flags == other.flags && targets.equals(other.targets); }
    public int hashCode() { return (31 * name.hashCode() + flags) * 31 + targets.hashCode(); }
  }
  private static final class ProvideValue implements ModuleProvideInfo {
    final ClassEntry service; final List<ClassEntry> implementations;
    ProvideValue(ClassEntry service, List<ClassEntry> implementations) { this.service = Objects.requireNonNull(service); this.implementations = immutable(implementations); }
    public ClassEntry provides() { return service; }
    public List<ClassEntry> providesWith() { return implementations; }
    public boolean equals(Object value) {
      if (!(value instanceof ProvideValue)) return false; ProvideValue other = (ProvideValue) value;
      return service.equals(other.service) && implementations.equals(other.implementations);
    }
    public int hashCode() { return 31 * service.hashCode() + implementations.hashCode(); }
  }
  private static final class HashValue implements ModuleHashInfo {
    final ModuleEntry name; final byte[] hash;
    HashValue(ModuleEntry name, byte[] hash) { this.name = Objects.requireNonNull(name); this.hash = Objects.requireNonNull(hash); }
    public ModuleEntry moduleName() { return name; }
    public byte[] hash() { return hash; }
    public boolean equals(Object value) { if (!(value instanceof HashValue)) return false; HashValue other = (HashValue) value; return name.equals(other.name) && hash == other.hash; }
    public int hashCode() { return 31 * name.hashCode() + hash.hashCode(); }
  }
  private static final class Builder implements ModuleAttribute.ModuleAttributeBuilder {
    ModuleEntry name; int flags; Utf8Entry version;
    final Set<ModuleRequireInfo> requires = new LinkedHashSet<ModuleRequireInfo>(); final Set<ModuleExportInfo> exports = new LinkedHashSet<ModuleExportInfo>();
    final Set<ModuleOpenInfo> opens = new LinkedHashSet<ModuleOpenInfo>(); final Set<ClassEntry> uses = new LinkedHashSet<ClassEntry>(); final Set<ModuleProvideInfo> provides = new LinkedHashSet<ModuleProvideInfo>();
    Builder(ModuleEntry name) { this.name = name; }
    ModuleAttribute build() {
      return module(name, flags, version, requires, exports, opens, uses, provides);
    }
    public ModuleAttribute.ModuleAttributeBuilder moduleName(ModuleDesc name) { this.name = temporaryPool().moduleEntry(Objects.requireNonNull(name)); return this; }
    public ModuleAttribute.ModuleAttributeBuilder moduleFlags(int flags) { this.flags = flags; return this; }
    public ModuleAttribute.ModuleAttributeBuilder moduleVersion(String version) { this.version = version == null ? null : temporaryPool().utf8Entry(version); return this; }
    public ModuleAttribute.ModuleAttributeBuilder requires(ModuleDesc name, int flags, String version) { return requires(require(name, flags, version)); }
    public ModuleAttribute.ModuleAttributeBuilder requires(ModuleRequireInfo info) { requires.add(Objects.requireNonNull(info)); return this; }
    public ModuleAttribute.ModuleAttributeBuilder exports(PackageDesc name, int flags, ModuleDesc... targets) { return exports(export(name, flags, Arrays.asList(targets))); }
    public ModuleAttribute.ModuleAttributeBuilder exports(ModuleExportInfo info) { exports.add(Objects.requireNonNull(info)); return this; }
    public ModuleAttribute.ModuleAttributeBuilder opens(PackageDesc name, int flags, ModuleDesc... targets) { return opens(open(name, flags, Arrays.asList(targets))); }
    public ModuleAttribute.ModuleAttributeBuilder opens(ModuleOpenInfo info) { opens.add(Objects.requireNonNull(info)); return this; }
    public ModuleAttribute.ModuleAttributeBuilder uses(ClassDesc service) { return uses(temporaryPool().classEntry(service)); }
    public ModuleAttribute.ModuleAttributeBuilder uses(ClassEntry service) { uses.add(Objects.requireNonNull(service)); return this; }
    public ModuleAttribute.ModuleAttributeBuilder provides(ClassDesc service, ClassDesc... implementations) { return provides(provide(service, Arrays.asList(implementations))); }
    public ModuleAttribute.ModuleAttributeBuilder provides(ModuleProvideInfo info) { provides.add(Objects.requireNonNull(info)); return this; }
  }
}
