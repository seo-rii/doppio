package java.lang.classfile.constantpool;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.BootstrapMethodEntry;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.MethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Internal checked Java constant-pool engine. Raw-copy authority is held source identity, not byte equality. */
public final class DoppioConstantPool implements ConstantPoolBuilder {
  private final List<Entry> entries = new ArrayList<Entry>();
  private final Map<String, Entry> interned = new HashMap<String, Entry>();
  private final ConstantPool directSource;
  private List<BootstrapMethodEntry> bootstraps = Collections.emptyList();
  private boolean frozen;

  public DoppioConstantPool() { this(null); }
  private DoppioConstantPool(ConstantPool directSource) {
    this.directSource = directSource;
    entries.add(null);
  }

  public static DoppioConstantPool decode(byte[] bytes, int[] cursor) {
    Objects.requireNonNull(bytes); Objects.requireNonNull(cursor);
    if (cursor.length != 1) throw new IllegalArgumentException("One checked pool cursor is required");
    int at = cursor[0];
    require(bytes, at, 2);
    int count = u2(bytes, at); at += 2;
    if (count == 0) throw new IllegalArgumentException("Empty constant-pool count");
    DoppioConstantPool pool = new DoppioConstantPool();
    for (int index = 1; index < count; index++) {
      int start = at;
      require(bytes, at, 1);
      int tag = bytes[at++] & 255, first = 0, second = 0;
      Object value = null;
      switch (tag) {
        case 1: {
          require(bytes, at, 2);
          int length = u2(bytes, at);
          require(bytes, at, 2 + length);
          try {
            DataInputStream input = new DataInputStream(new ByteArrayInputStream(bytes, at, length + 2));
            value = input.readUTF();
          } catch (IOException malformed) { throw new IllegalArgumentException("Malformed modified UTF-8", malformed); }
          at += 2 + length; break;
        }
        case 3: case 4:
          require(bytes, at, 4);
          first = i4(bytes, at); at += 4;
          value = tag == 3 ? (Object) Integer.valueOf(first) : (Object) Float.valueOf(Float.intBitsToFloat(first));
          break;
        case 5: case 6: {
          require(bytes, at, 8);
          long bits = ((long) i4(bytes, at) << 32) | (i4(bytes, at + 4) & 0xffffffffL);
          value = tag == 5 ? (Object) Long.valueOf(bits) : (Object) Double.valueOf(Double.longBitsToDouble(bits));
          at += 8;
          if (index + 1 >= count) throw new IllegalArgumentException("Missing unusable wide-constant slot");
          break;
        }
        case 7: case 8: case 16: case 19: case 20:
          require(bytes, at, 2); first = u2(bytes, at); at += 2; break;
        case 9: case 10: case 11: case 12: case 17: case 18:
          require(bytes, at, 4); first = u2(bytes, at); second = u2(bytes, at + 2); at += 4; break;
        case 15:
          require(bytes, at, 3); first = bytes[at] & 255; second = u2(bytes, at + 1); at += 3; break;
        default: throw new IllegalArgumentException("Unknown constant-pool tag " + tag);
      }
      pool.append(tag, first, second, value, Arrays.copyOfRange(bytes, start, at), false);
      if (tag == 5 || tag == 6) index++;
    }
    if (pool.size() != count) throw new IllegalArgumentException("Invalid constant-pool slot count");
    pool.validateReferences();
    cursor[0] = at;
    return pool;
  }

  public static DoppioConstantPool copyOf(ConstantPool source) {
    Objects.requireNonNull(source);
    if (!(source instanceof DoppioConstantPool))
      throw new IllegalArgumentException("A retained source pool is required for direct copy");
    DoppioConstantPool original = (DoppioConstantPool) source;
    DoppioConstantPool copy = new DoppioConstantPool(original);
    for (Entry entry : original.entries) if (entry != null)
      copy.append(entry.tag, entry.first, entry.second, entry.value, entry.raw.clone(), false);
    List<BootstrapMethodEntry> methods = new ArrayList<BootstrapMethodEntry>();
    for (BootstrapMethodEntry method : original.bootstraps) {
      MethodHandleEntry handle = copy.entryByIndex(method.bootstrapMethod().index(), MethodHandleEntry.class);
      List<LoadableConstantEntry> arguments = new ArrayList<LoadableConstantEntry>();
      for (LoadableConstantEntry argument : method.arguments())
        arguments.add(copy.entryByIndex(argument.index(), LoadableConstantEntry.class));
      methods.add(new Bootstrap(copy, methods.size(), handle, arguments));
    }
    copy.bootstraps = Collections.unmodifiableList(methods);
    return copy;
  }

  public void freeze() { frozen = true; }
  public boolean canWriteDirect(ConstantPool source) {
    Objects.requireNonNull(source);
    return source == this || source == directSource;
  }
  public int size() { return entries.size(); }
  public PoolEntry entryByIndex(int index) {
    if (index <= 0 || index >= entries.size() || entries.get(index) == null)
      throw new ConstantPoolException("Unusable constant-pool index " + index);
    return entries.get(index);
  }
  public <T extends PoolEntry> T entryByIndex(int index, Class<T> type) {
    Objects.requireNonNull(type);
    PoolEntry value = entryByIndex(index);
    if (!type.isInstance(value)) throw new ConstantPoolException("Wrong constant-pool entry type at " + index);
    return type.cast(value);
  }
  public int bootstrapMethodCount() { return bootstraps.size(); }
  public BootstrapMethodEntry bootstrapMethodEntry(int index) {
    if (index < 0 || index >= bootstraps.size()) throw new ConstantPoolException("Invalid bootstrap index " + index);
    return bootstraps.get(index);
  }

  public void bootstrapMethods(byte[] payload) {
    if (frozen) throw new IllegalStateException("The parsed pool is immutable");
    Objects.requireNonNull(payload);
    require(payload, 0, 2);
    int count = u2(payload, 0), cursor = 2;
    List<BootstrapMethodEntry> methods = new ArrayList<BootstrapMethodEntry>();
    for (int index = 0; index < count; index++) {
      require(payload, cursor, 4);
      MethodHandleEntry handle = entryByIndex(u2(payload, cursor), MethodHandleEntry.class);
      int argumentsCount = u2(payload, cursor + 2); cursor += 4;
      List<LoadableConstantEntry> arguments = new ArrayList<LoadableConstantEntry>();
      for (int argument = 0; argument < argumentsCount; argument++) {
        require(payload, cursor, 2);
        arguments.add(entryByIndex(u2(payload, cursor), LoadableConstantEntry.class)); cursor += 2;
      }
      methods.add(new Bootstrap(this, index, handle, arguments));
    }
    if (cursor != payload.length) throw new IllegalArgumentException("Trailing bootstrap bytes");
    bootstraps = Collections.unmodifiableList(methods);
  }

  public byte[] encode() {
    try {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      DataOutputStream out = new DataOutputStream(bytes);
      out.writeShort(size());
      for (Entry entry : entries) if (entry != null) out.write(entry.raw);
      out.flush();
      return bytes.toByteArray();
    } catch (IOException impossible) { throw new IllegalArgumentException(impossible); }
  }

  public Utf8Entry utf8Entry(String value) {
    Objects.requireNonNull(value);
    return (Utf8Entry) intern(1, 0, 0, value);
  }
  public ClassEntry classEntry(String internalName) { return classEntry(utf8Entry(internalName)); }
  public ClassEntry classEntry(Utf8Entry name) {
    Objects.requireNonNull(name);
    String value = name.stringValue();
    if (value.startsWith("[")) ClassDesc.ofDescriptor(value);
    else ClassDesc.ofInternalName(value);
    return (ClassEntry) intern(7, utf8Entry(value).index(), 0, null);
  }
  public NameAndTypeEntry nameAndTypeEntry(Utf8Entry name, Utf8Entry type) {
    return (NameAndTypeEntry) intern(12, utf8Entry(Objects.requireNonNull(name).stringValue()).index(),
      utf8Entry(Objects.requireNonNull(type).stringValue()).index(), null);
  }
  public FieldRefEntry fieldRefEntry(ClassEntry owner, NameAndTypeEntry member) {
    return (FieldRefEntry) member(9, owner, member);
  }
  public MethodRefEntry methodRefEntry(ClassEntry owner, NameAndTypeEntry member) {
    return (MethodRefEntry) member(10, owner, member);
  }
  public InterfaceMethodRefEntry interfaceMethodRefEntry(ClassEntry owner, NameAndTypeEntry member) {
    return (InterfaceMethodRefEntry) member(11, owner, member);
  }
  private Entry member(int tag, ClassEntry owner, NameAndTypeEntry member) {
    Objects.requireNonNull(owner); Objects.requireNonNull(member);
    ClassEntry localOwner = classEntry(owner.name());
    NameAndTypeEntry localMember = nameAndTypeEntry(member.name(), member.type());
    return intern(tag, localOwner.index(), localMember.index(), null);
  }
  public MethodTypeEntry methodTypeEntry(MethodTypeDesc descriptor) {
    return methodTypeEntry(utf8Entry(Objects.requireNonNull(descriptor).descriptorString()));
  }
  public MethodTypeEntry methodTypeEntry(Utf8Entry descriptor) {
    Objects.requireNonNull(descriptor);
    MethodTypeDesc.ofDescriptor(descriptor.stringValue());
    return (MethodTypeEntry) intern(16, utf8Entry(descriptor.stringValue()).index(), 0, null);
  }
  public IntegerEntry intEntry(int value) { return (IntegerEntry) intern(3, value, 0, Integer.valueOf(value)); }
  public FloatEntry floatEntry(float value) { return (FloatEntry) intern(4, Float.floatToRawIntBits(value), 0, Float.valueOf(value)); }
  public LongEntry longEntry(long value) { return (LongEntry) intern(5, 0, 0, Long.valueOf(value)); }
  public DoubleEntry doubleEntry(double value) { return (DoubleEntry) intern(6, 0, 0, Double.valueOf(value)); }
  public StringEntry stringEntry(Utf8Entry value) {
    return (StringEntry) intern(8, utf8Entry(Objects.requireNonNull(value).stringValue()).index(), 0, null);
  }

  private Entry intern(int tag, int first, int second, Object value) {
    String key = key(tag, first, second, value);
    Entry found = interned.get(key);
    if (found != null) return found;
    if (frozen) throw new IllegalStateException("The parsed pool is immutable");
    return append(tag, first, second, value, encodeEntry(tag, first, second, value), true);
  }
  private Entry append(int tag, int first, int second, Object value, byte[] raw, boolean checked) {
    if (entries.size() + (tag == 5 || tag == 6 ? 2 : 1) > 65535)
      throw new IllegalArgumentException("Constant-pool limit exceeded");
    int index = entries.size();
    Entry entry;
    switch (tag) {
      case 1: entry = new Utf(this, index, tag, first, second, value, raw); break;
      case 3: entry = new IntValue(this, index, tag, first, second, value, raw); break;
      case 4: entry = new FloatValue(this, index, tag, first, second, value, raw); break;
      case 5: entry = new LongValue(this, index, tag, first, second, value, raw); break;
      case 6: entry = new DoubleValue(this, index, tag, first, second, value, raw); break;
      case 7: entry = new ClassValue(this, index, tag, first, second, value, raw); break;
      case 8: entry = new StringValue(this, index, tag, first, second, value, raw); break;
      case 9: entry = new FieldValue(this, index, tag, first, second, value, raw); break;
      case 10: entry = new MethodValue(this, index, tag, first, second, value, raw); break;
      case 11: entry = new InterfaceMethodValue(this, index, tag, first, second, value, raw); break;
      case 12: entry = new NameType(this, index, tag, first, second, value, raw); break;
      case 15: entry = new HandleValue(this, index, tag, first, second, value, raw); break;
      case 16: entry = new MethodTypeValue(this, index, tag, first, second, value, raw); break;
      default: entry = new Entry(this, index, tag, first, second, value, raw);
    }
    entries.add(entry);
    if (entry.width() == 2) entries.add(null);
    String key = key(tag, first, second, value);
    if (!interned.containsKey(key)) interned.put(key, entry);
    return entry;
  }
  private static String key(int tag, int first, int second, Object value) {
    if (tag == 1) return tag + ":" + value;
    if (tag == 5) return tag + ":" + ((Long) value).longValue();
    if (tag == 6) return tag + ":" + Double.doubleToRawLongBits(((Double) value).doubleValue());
    return tag + ":" + first + ":" + second;
  }
  private static byte[] encodeEntry(int tag, int first, int second, Object value) {
    try {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      DataOutputStream out = new DataOutputStream(bytes);
      out.writeByte(tag);
      switch (tag) {
        case 1: out.writeUTF((String) value); break;
        case 3: case 4: out.writeInt(first); break;
        case 5: out.writeLong(((Long) value).longValue()); break;
        case 6: out.writeLong(Double.doubleToRawLongBits(((Double) value).doubleValue())); break;
        case 7: case 8: case 16: case 19: case 20: out.writeShort(first); break;
        case 9: case 10: case 11: case 12: case 17: case 18: out.writeShort(first); out.writeShort(second); break;
        case 15: out.writeByte(first); out.writeShort(second); break;
        default: throw new IllegalArgumentException("Unsupported pool factory");
      }
      out.flush(); return bytes.toByteArray();
    } catch (IOException invalid) { throw new IllegalArgumentException("Invalid encoded constant", invalid); }
  }

  private void validateReferences() {
    for (Entry entry : entries) if (entry != null) switch (entry.tag) {
      case 7: case 8: case 16: case 19: case 20:
        entryByIndex(entry.first, Utf8Entry.class); break;
      case 9: case 10: case 11:
        entryByIndex(entry.first, ClassEntry.class); entryByIndex(entry.second, NameAndTypeEntry.class); break;
      case 12:
        entryByIndex(entry.first, Utf8Entry.class); entryByIndex(entry.second, Utf8Entry.class); break;
      case 15: {
        if (entry.first < 1 || entry.first > 9) throw new IllegalArgumentException("Invalid method-handle kind");
        MemberRefEntry member = entryByIndex(entry.second, MemberRefEntry.class);
        if (entry.first <= 4 && member.tag() != 9 || entry.first >= 5 && member.tag() == 9)
          throw new IllegalArgumentException("Method-handle reference tag mismatch");
        break;
      }
      case 17: case 18: entryByIndex(entry.second, NameAndTypeEntry.class); break;
      default: break;
    }
  }
  private static void require(byte[] bytes, int cursor, int length) {
    if (cursor < 0 || length < 0 || cursor > bytes.length || length > bytes.length - cursor)
      throw new IllegalArgumentException("Truncated constant pool");
  }
  private static int u2(byte[] bytes, int cursor) {
    require(bytes, cursor, 2); return (bytes[cursor] & 255) << 8 | bytes[cursor + 1] & 255;
  }
  private static int i4(byte[] bytes, int cursor) {
    require(bytes, cursor, 4);
    return (bytes[cursor] & 255) << 24 | (bytes[cursor + 1] & 255) << 16 |
      (bytes[cursor + 2] & 255) << 8 | bytes[cursor + 3] & 255;
  }

  private static class Entry implements PoolEntry {
    final DoppioConstantPool pool;
    final int index, tag, first, second;
    final Object value;
    final byte[] raw;
    Entry(DoppioConstantPool pool, int index, int tag, int first, int second, Object value, byte[] raw) {
      this.pool = pool; this.index = index; this.tag = tag; this.first = first; this.second = second; this.value = value; this.raw = raw;
    }
    public ConstantPool constantPool() { return pool; }
    public int tag() { return tag; }
    public int index() { return index; }
    public int width() { return tag == 5 || tag == 6 ? 2 : 1; }
  }
  private static final class Utf extends Entry implements Utf8Entry {
    Utf(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public String stringValue() { return (String) value; }
    public boolean equalsString(String value) { return stringValue().equals(value); }
    public boolean isFieldType(ClassDesc type) { return stringValue().equals(Objects.requireNonNull(type).descriptorString()); }
    public boolean isMethodType(MethodTypeDesc type) { return stringValue().equals(Objects.requireNonNull(type).descriptorString()); }
    public int length() { return stringValue().length(); }
    public char charAt(int index) { return stringValue().charAt(index); }
    public CharSequence subSequence(int start, int end) { return stringValue().subSequence(start, end); }
    public ConstantDesc constantValue() { return (ConstantDesc) (Object) stringValue(); }
    public String toString() { return stringValue(); }
  }
  private static final class ClassValue extends Entry implements ClassEntry {
    ClassValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public Utf8Entry name() { return pool.entryByIndex(first, Utf8Entry.class); }
    public String asInternalName() { return name().stringValue(); }
    public ClassDesc asSymbol() {
      String name = asInternalName(); return name.startsWith("[") ? ClassDesc.ofDescriptor(name) : ClassDesc.ofInternalName(name);
    }
    public boolean matches(ClassDesc type) { return asSymbol().equals(Objects.requireNonNull(type)); }
  }
  private static final class NameType extends Entry implements NameAndTypeEntry {
    NameType(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public Utf8Entry name() { return pool.entryByIndex(first, Utf8Entry.class); }
    public Utf8Entry type() { return pool.entryByIndex(second, Utf8Entry.class); }
  }
  private static class Member extends Entry implements MemberRefEntry {
    Member(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public ClassEntry owner() { return pool.entryByIndex(first, ClassEntry.class); }
    public NameAndTypeEntry nameAndType() { return pool.entryByIndex(second, NameAndTypeEntry.class); }
  }
  private static final class FieldValue extends Member implements FieldRefEntry {
    FieldValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
  }
  private static final class MethodValue extends Member implements MethodRefEntry {
    MethodValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
  }
  private static final class InterfaceMethodValue extends Member implements InterfaceMethodRefEntry {
    InterfaceMethodValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
  }
  private static final class IntValue extends Entry implements IntegerEntry {
    IntValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public int intValue() { return ((Integer) value).intValue(); }
    public ConstantDesc constantValue() { return (ConstantDesc) value; }
  }
  private static final class FloatValue extends Entry implements FloatEntry {
    FloatValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public float floatValue() { return ((Float) value).floatValue(); }
    public ConstantDesc constantValue() { return (ConstantDesc) value; }
  }
  private static final class LongValue extends Entry implements LongEntry {
    LongValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public long longValue() { return ((Long) value).longValue(); }
    public ConstantDesc constantValue() { return (ConstantDesc) value; }
  }
  private static final class DoubleValue extends Entry implements DoubleEntry {
    DoubleValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public double doubleValue() { return ((Double) value).doubleValue(); }
    public ConstantDesc constantValue() { return (ConstantDesc) value; }
  }
  private static final class StringValue extends Entry implements StringEntry {
    StringValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public Utf8Entry utf8() { return pool.entryByIndex(first, Utf8Entry.class); }
    public String stringValue() { return utf8().stringValue(); }
    public boolean equalsString(String value) { return stringValue().equals(value); }
    public ConstantDesc constantValue() { return (ConstantDesc) (Object) stringValue(); }
  }
  private static final class MethodTypeValue extends Entry implements MethodTypeEntry {
    MethodTypeValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public Utf8Entry descriptor() { return pool.entryByIndex(first, Utf8Entry.class); }
    public MethodTypeDesc asSymbol() { return MethodTypeDesc.ofDescriptor(descriptor().stringValue()); }
    public boolean matches(MethodTypeDesc type) { return asSymbol().equals(Objects.requireNonNull(type)); }
  }
  private static final class HandleValue extends Entry implements MethodHandleEntry {
    HandleValue(DoppioConstantPool p, int i, int t, int a, int b, Object v, byte[] r) { super(p, i, t, a, b, v, r); }
    public int kind() { return first; }
    public MemberRefEntry reference() { return pool.entryByIndex(second, MemberRefEntry.class); }
    public DirectMethodHandleDesc asSymbol() {
      MemberRefEntry reference = reference();
      DirectMethodHandleDesc.Kind kind = DirectMethodHandleDesc.Kind.valueOf(first, reference.tag() == 11);
      if (reference instanceof FieldRefEntry)
        return MethodHandleDesc.ofField(kind, reference.owner().asSymbol(), reference.name().stringValue(),
          ClassDesc.ofDescriptor(reference.type().stringValue()));
      return MethodHandleDesc.ofMethod(kind, reference.owner().asSymbol(), reference.name().stringValue(),
        MethodTypeDesc.ofDescriptor(reference.type().stringValue()));
    }
  }
  private static final class Bootstrap implements BootstrapMethodEntry {
    final ConstantPool pool;
    final int index;
    final MethodHandleEntry method;
    final List<LoadableConstantEntry> arguments;
    Bootstrap(ConstantPool pool, int index, MethodHandleEntry method, List<LoadableConstantEntry> arguments) {
      this.pool = pool; this.index = index; this.method = method;
      this.arguments = Collections.unmodifiableList(new ArrayList<LoadableConstantEntry>(arguments));
    }
    public ConstantPool constantPool() { return pool; }
    public int bsmIndex() { return index; }
    public MethodHandleEntry bootstrapMethod() { return method; }
    public List<LoadableConstantEntry> arguments() { return arguments; }
  }
}
