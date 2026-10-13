package java.lang.classfile;

import java.lang.classfile.AttributeMapper.AttributeStability;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.Utf8Entry;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/** Internal typed debug-table values and genuine encoders, independent of VM parsing. */
public final class DoppioDebugAttributes {
  private DoppioDebugAttributes() {}

  private static final AttributeMapper<LineNumberTableAttribute> LINES = new Mapper<LineNumberTableAttribute>("LineNumberTable", true) {
    void payload(BufWriter writer, LineNumberTableAttribute value) {
      count(writer, value.lineNumbers().size());
      for (LineNumberInfo entry : value.lineNumbers()) { writer.writeU2(entry.startPc()); writer.writeU2(entry.lineNumber()); }
    }
  };
  private static final AttributeMapper<LocalVariableTableAttribute> LOCALS = new Mapper<LocalVariableTableAttribute>("LocalVariableTable", true) {
    void payload(BufWriter writer, LocalVariableTableAttribute value) {
      count(writer, value.localVariables().size());
      for (LocalVariableInfo entry : value.localVariables()) {
        writer.writeU2(entry.startPc()); writer.writeU2(entry.length()); writer.writeIndex(entry.name()); writer.writeIndex(entry.type());
        writer.writeU2(entry.slot());
      }
    }
  };
  private static final AttributeMapper<LocalVariableTypeTableAttribute> LOCAL_TYPES = new Mapper<LocalVariableTypeTableAttribute>("LocalVariableTypeTable", true) {
    void payload(BufWriter writer, LocalVariableTypeTableAttribute value) {
      count(writer, value.localVariableTypes().size());
      for (LocalVariableTypeInfo entry : value.localVariableTypes()) {
        writer.writeU2(entry.startPc()); writer.writeU2(entry.length()); writer.writeIndex(entry.name()); writer.writeIndex(entry.signature());
        writer.writeU2(entry.slot());
      }
    }
  };
  private static final AttributeMapper<CharacterRangeTableAttribute> RANGES = new Mapper<CharacterRangeTableAttribute>("CharacterRangeTable", true) {
    void payload(BufWriter writer, CharacterRangeTableAttribute value) {
      count(writer, value.characterRangeTable().size());
      for (CharacterRangeInfo entry : value.characterRangeTable()) {
        writer.writeU2(entry.startPc()); writer.writeU2(entry.endPc());
        writer.writeInt(entry.characterRangeStart()); writer.writeInt(entry.characterRangeEnd()); writer.writeU2(entry.flags());
      }
    }
  };
  private static final AttributeMapper<SourceDebugExtensionAttribute> SOURCE = new Mapper<SourceDebugExtensionAttribute>("SourceDebugExtension", false) {
    public AttributeStability stability() { return AttributeStability.STATELESS; }
    void payload(BufWriter writer, SourceDebugExtensionAttribute value) { writer.writeBytes(value.contents()); }
  };

  private abstract static class Mapper<A extends Attribute<A>> implements AttributeMapper<A> {
    final String name;
    final boolean multiple;
    Mapper(String name, boolean multiple) { this.name = name; this.multiple = multiple; }
    public String name() { return name; }
    public boolean allowMultiple() { return multiple; }
    public AttributeStability stability() { return AttributeStability.LABELS; }
    @SuppressWarnings("unchecked")
    public A readAttribute(AttributedElement owner, ClassReader reader, int start) {
      return (A) read(owner, reader, reader.readEntry(start - 6, Utf8Entry.class), start,
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

  static AttributeMapper<LineNumberTableAttribute> lineNumberTableMapper() { return LINES; }
  static AttributeMapper<LocalVariableTableAttribute> localVariableTableMapper() { return LOCALS; }
  static AttributeMapper<LocalVariableTypeTableAttribute> localVariableTypeTableMapper() { return LOCAL_TYPES; }
  static AttributeMapper<CharacterRangeTableAttribute> characterRangeTableMapper() { return RANGES; }
  static AttributeMapper<SourceDebugExtensionAttribute> sourceDebugExtensionMapper() { return SOURCE; }

  static Attribute<?> read(AttributedElement owner, ClassReader reader, Utf8Entry name, int start, byte[] payload) {
    String key = name.stringValue();
    ConstantPool pool = DoppioClassReader.readerPool(reader);
    if ("SourceDebugExtension".equals(key)) {
      if (!(owner instanceof ClassModel)) throw new IllegalArgumentException("Invalid SourceDebugExtension attribute location");
      return new SourceValue(name, pool, payload, null);
    }
    int width;
    if ("LineNumberTable".equals(key)) width = 4;
    else if ("LocalVariableTable".equals(key) || "LocalVariableTypeTable".equals(key)) width = 10;
    else if ("CharacterRangeTable".equals(key)) width = 14;
    else return null;
    if (!(owner instanceof CodeModel)) throw new IllegalArgumentException("Invalid " + key + " attribute location");
    if (payload.length < 2) throw new IllegalArgumentException("Truncated " + key + " attribute");
    int count = reader.readU2(start);
    if (payload.length != 2 + count * width) throw new IllegalArgumentException("Invalid " + key + " attribute length");
    if (width == 4) {
      List<LineNumberInfo> entries = new ArrayList<LineNumberInfo>();
      for (int index = 0; index < count; index++) {
        int at = start + 2 + index * width;
        entries.add(lineNumberInfo(reader.readU2(at), reader.readU2(at + 2)));
      }
      return new LinesValue(name, entries, pool, payload);
    }
    if (width == 14) {
      List<CharacterRangeInfo> entries = new ArrayList<CharacterRangeInfo>();
      for (int index = 0; index < count; index++) {
        int at = start + 2 + index * width;
        entries.add(characterRangeInfo(reader.readU2(at), reader.readU2(at + 2), reader.readInt(at + 4),
            reader.readInt(at + 8), reader.readU2(at + 12)));
      }
      return new RangesValue(name, entries, pool, payload);
    }
    if ("LocalVariableTable".equals(key)) {
      List<LocalVariableInfo> entries = new ArrayList<LocalVariableInfo>();
      for (int index = 0; index < count; index++) {
        int at = start + 2 + index * width;
        entries.add(localVariableInfo(reader.readU2(at), reader.readU2(at + 2), reader.readEntry(at + 4, Utf8Entry.class),
            reader.readEntry(at + 6, Utf8Entry.class), reader.readU2(at + 8)));
      }
      return new LocalsValue(name, entries, pool, payload);
    }
    List<LocalVariableTypeInfo> entries = new ArrayList<LocalVariableTypeInfo>();
    for (int index = 0; index < count; index++) {
      int at = start + 2 + index * width;
      entries.add(localVariableTypeInfo(reader.readU2(at), reader.readU2(at + 2), reader.readEntry(at + 4, Utf8Entry.class),
          reader.readEntry(at + 6, Utf8Entry.class), reader.readU2(at + 8)));
    }
    return new LocalTypesValue(name, entries, pool, payload);
  }

  static byte[] retainedPayload(Attribute<?> attribute) {
    return attribute instanceof Base && ((Base<?>) attribute).payload != null ? ((Base<?>) attribute).payload.clone() : null;
  }
  static ConstantPool sourcePool(Attribute<?> attribute) { return attribute instanceof Base ? ((Base<?>) attribute).pool : null; }

  public static LineNumberTableAttribute lineNumberTable(List<LineNumberInfo> entries) {
    return new LinesValue(name("LineNumberTable"), entries, null, null);
  }
  public static LocalVariableTableAttribute localVariableTable(List<LocalVariableInfo> entries) {
    return new LocalsValue(name("LocalVariableTable"), entries, null, null);
  }
  public static LocalVariableTypeTableAttribute localVariableTypeTable(List<LocalVariableTypeInfo> entries) {
    return new LocalTypesValue(name("LocalVariableTypeTable"), entries, null, null);
  }
  public static CharacterRangeTableAttribute characterRangeTable(List<CharacterRangeInfo> entries) {
    return new RangesValue(name("CharacterRangeTable"), entries, null, null);
  }
  public static SourceDebugExtensionAttribute sourceDebugExtension(byte[] contents) {
    return new SourceValue(name("SourceDebugExtension"), null, null, Objects.requireNonNull(contents));
  }
  public static LineNumberInfo lineNumberInfo(int startPc, int lineNumber) { return new LineInfo(startPc, lineNumber); }
  public static CharacterRangeInfo characterRangeInfo(int startPc, int endPc, int rangeStart, int rangeEnd, int flags) {
    return new RangeInfo(startPc, endPc, rangeStart, rangeEnd, flags);
  }
  static LocalVariableInfo localVariableInfo(int startPc, int length, Utf8Entry name, Utf8Entry type, int slot) {
    return new LocalInfo(startPc, length, name, type, slot);
  }
  static LocalVariableTypeInfo localVariableTypeInfo(int startPc, int length, Utf8Entry name, Utf8Entry signature, int slot) {
    return new LocalTypeInfo(startPc, length, name, signature, slot);
  }
  private static Utf8Entry name(String value) { return new DoppioConstantPool().utf8Entry(value); }
  private static void count(BufWriter writer, int count) {
    if (count > 65535) throw new IllegalArgumentException("Debug table entry count exceeds u2");
    writer.writeU2(count);
  }
  private static <T> List<T> immutable(List<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : copy) Objects.requireNonNull(value);
    return Collections.unmodifiableList(copy);
  }

  private abstract static class Base<A extends Attribute<A>> implements Attribute<A> {
    final Utf8Entry name;
    final ConstantPool pool;
    final byte[] payload;
    Base(Utf8Entry name, ConstantPool pool, byte[] payload) {
      this.name = name; this.pool = pool; this.payload = payload == null ? null : payload.clone();
    }
    public Utf8Entry attributeName() { return name; }
  }
  private static final class LinesValue extends Base<LineNumberTableAttribute> implements LineNumberTableAttribute {
    final List<LineNumberInfo> entries;
    LinesValue(Utf8Entry name, List<LineNumberInfo> entries, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.entries = immutable(entries);
    }
    public AttributeMapper<LineNumberTableAttribute> attributeMapper() { return LINES; }
    public List<LineNumberInfo> lineNumbers() { return entries; }
  }
  private static final class LocalsValue extends Base<LocalVariableTableAttribute> implements LocalVariableTableAttribute {
    final List<LocalVariableInfo> entries;
    LocalsValue(Utf8Entry name, List<LocalVariableInfo> entries, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.entries = immutable(entries);
    }
    public AttributeMapper<LocalVariableTableAttribute> attributeMapper() { return LOCALS; }
    public List<LocalVariableInfo> localVariables() { return entries; }
  }
  private static final class LocalTypesValue extends Base<LocalVariableTypeTableAttribute> implements LocalVariableTypeTableAttribute {
    final List<LocalVariableTypeInfo> entries;
    LocalTypesValue(Utf8Entry name, List<LocalVariableTypeInfo> entries, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.entries = immutable(entries);
    }
    public AttributeMapper<LocalVariableTypeTableAttribute> attributeMapper() { return LOCAL_TYPES; }
    public List<LocalVariableTypeInfo> localVariableTypes() { return entries; }
  }
  private static final class RangesValue extends Base<CharacterRangeTableAttribute> implements CharacterRangeTableAttribute {
    final List<CharacterRangeInfo> entries;
    RangesValue(Utf8Entry name, List<CharacterRangeInfo> entries, ConstantPool pool, byte[] payload) {
      super(name, pool, payload); this.entries = immutable(entries);
    }
    public AttributeMapper<CharacterRangeTableAttribute> attributeMapper() { return RANGES; }
    public List<CharacterRangeInfo> characterRangeTable() { return entries; }
  }
  private static final class SourceValue extends Base<SourceDebugExtensionAttribute> implements SourceDebugExtensionAttribute {
    final byte[] unbound;
    SourceValue(Utf8Entry name, ConstantPool pool, byte[] payload, byte[] unbound) {
      super(name, pool, payload); this.unbound = unbound;
    }
    public AttributeMapper<SourceDebugExtensionAttribute> attributeMapper() { return SOURCE; }
    public byte[] contents() { return payload == null ? unbound : payload.clone(); }
  }
  private static final class LineInfo implements LineNumberInfo {
    final int start, line;
    LineInfo(int start, int line) { this.start = start; this.line = line; }
    public int startPc() { return start; }
    public int lineNumber() { return line; }
    public boolean equals(Object value) {
      return value instanceof LineInfo && start == ((LineInfo) value).start && line == ((LineInfo) value).line;
    }
    public int hashCode() { return 31 * start + line; }
  }
  private static final class RangeInfo implements CharacterRangeInfo {
    final int start, end, rangeStart, rangeEnd, flags;
    RangeInfo(int start, int end, int rangeStart, int rangeEnd, int flags) {
      this.start = start; this.end = end; this.rangeStart = rangeStart; this.rangeEnd = rangeEnd; this.flags = flags;
    }
    public int startPc() { return start; }
    public int endPc() { return end; }
    public int characterRangeStart() { return rangeStart; }
    public int characterRangeEnd() { return rangeEnd; }
    public int flags() { return flags; }
    public boolean equals(Object value) {
      if (!(value instanceof RangeInfo)) return false;
      RangeInfo other = (RangeInfo) value;
      return start == other.start && end == other.end && rangeStart == other.rangeStart && rangeEnd == other.rangeEnd && flags == other.flags;
    }
    public int hashCode() { return 31 * (31 * (31 * (31 * start + end) + rangeStart) + rangeEnd) + flags; }
  }
  private abstract static class LocalBase {
    final int start, length, slot;
    final Utf8Entry name, descriptor;
    LocalBase(int start, int length, Utf8Entry name, Utf8Entry descriptor, int slot) {
      this.start = start; this.length = length; this.slot = slot;
      this.name = Objects.requireNonNull(name); this.descriptor = Objects.requireNonNull(descriptor);
    }
    public int startPc() { return start; }
    public int length() { return length; }
    public Utf8Entry name() { return name; }
    public int slot() { return slot; }
  }
  private static final class LocalInfo extends LocalBase implements LocalVariableInfo {
    LocalInfo(int start, int length, Utf8Entry name, Utf8Entry descriptor, int slot) { super(start, length, name, descriptor, slot); }
    public Utf8Entry type() { return descriptor; }
  }
  private static final class LocalTypeInfo extends LocalBase implements LocalVariableTypeInfo {
    LocalTypeInfo(int start, int length, Utf8Entry name, Utf8Entry signature, int slot) { super(start, length, name, signature, slot); }
    public Utf8Entry signature() { return descriptor; }
  }
}
