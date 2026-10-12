package java.lang.classfile;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.attribute.SourceFileAttribute;
import java.lang.classfile.attribute.UnknownAttribute;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.AccessFlag;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;

/** Internal pure Java reader and immutable selected public models, independent of VM/test decoders. */
public final class DoppioClassReader {
  private DoppioClassReader() {}

  public static ClassModel parse(byte[] bytes) {
    byte[] retained = Objects.requireNonNull(bytes).clone();
    Input input = new Input(retained);
    require(retained, 0, 8);
    if (input.readInt(0) != ClassFile.MAGIC_NUMBER) throw new IllegalArgumentException("Invalid class-file magic");
    int minor = input.readU2(4), major = input.readU2(6);
    if (major < 45 || major > 69) throw new IllegalArgumentException("Unsupported class-file version");
    int[] cursor = {8};
    input.pool = DoppioConstantPool.decode(retained, cursor);
    Cursor data = new Cursor(input, cursor[0]);
    int mask = data.u2();
    ClassEntry name = input.pool.entryByIndex(data.u2(), ClassEntry.class);
    int superIndex = data.u2();
    ClassEntry superclass = superIndex == 0 ? null : input.pool.entryByIndex(superIndex, ClassEntry.class);
    int count = data.u2();
    List<ClassEntry> interfaces = new ArrayList<ClassEntry>();
    for (int index = 0; index < count; index++) interfaces.add(input.pool.entryByIndex(data.u2(), ClassEntry.class));
    ClassValue model = new ClassValue(input, major, minor, mask, name, superclass, interfaces);
    input.model = model;
    count = data.u2();
    List<FieldModel> fields = new ArrayList<FieldModel>();
    for (int index = 0; index < count; index++) {
      int start = data.at;
      int fieldFlags = data.u2();
      Utf8Entry fieldName = input.pool.entryByIndex(data.u2(), Utf8Entry.class);
      Utf8Entry fieldType = input.pool.entryByIndex(data.u2(), Utf8Entry.class);
      FieldValue field = new FieldValue(model, fieldFlags, fieldName, fieldType);
      field.attributes = readAttributes(field, data, false);
      field.raw = Arrays.copyOfRange(retained, start, data.at);
      fields.add(field);
    }
    count = data.u2();
    List<MethodModel> methods = new ArrayList<MethodModel>();
    for (int index = 0; index < count; index++) {
      int start = data.at;
      int methodFlags = data.u2();
      Utf8Entry methodName = input.pool.entryByIndex(data.u2(), Utf8Entry.class);
      Utf8Entry methodType = input.pool.entryByIndex(data.u2(), Utf8Entry.class);
      MethodValue method = new MethodValue(model, methodFlags, methodName, methodType);
      method.attributes = readAttributes(method, data, true);
      for (Attribute<?> attribute : method.attributes) if (attribute instanceof CodeModel) {
        if (method.code != null) throw new IllegalArgumentException("Duplicate Code attribute");
        method.code = (CodeModel) attribute;
      }
      method.raw = Arrays.copyOfRange(retained, start, data.at);
      methods.add(method);
    }
    model.fields = immutable(fields);
    model.methods = immutable(methods);
    model.attributes = readAttributes(model, data, false);
    if (data.at != retained.length) throw new IllegalArgumentException("Trailing class-file bytes");
    boolean bootstrapSeen = false;
    for (Attribute<?> attribute : model.attributes) if ("BootstrapMethods".equals(attribute.attributeName().stringValue())) {
      if (bootstrapSeen) throw new IllegalArgumentException("Duplicate BootstrapMethods attribute");
      bootstrapSeen = true; input.pool.bootstrapMethods(attributePayload(attribute));
    }
    input.pool.freeze();
    return model;
  }

  private static List<Attribute<?>> readAttributes(AttributedElement owner, Cursor data, boolean method) {
    int count = data.u2();
    List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    for (int index = 0; index < count; index++) {
      Utf8Entry name = data.input.pool.entryByIndex(data.u2(), Utf8Entry.class);
      int length = data.length();
      int start = data.at;
      byte[] payload = data.bytes(length);
      if (method && "Code".equals(name.stringValue())) {
        attributes.add(readCode((MethodModel) owner, data.input, name, start, payload));
      } else if ("SourceFile".equals(name.stringValue())) {
        if (length != 2) throw new IllegalArgumentException("Invalid SourceFile length");
        attributes.add(new SourceFileValue(name, data.input.pool.entryByIndex(u2(payload, 0), Utf8Entry.class), data.input.pool, payload));
      } else {
        attributes.add(new RawAttribute(name, data.input.pool, payload));
      }
    }
    return immutable(attributes);
  }

  private static CodeValue readCode(MethodModel method, Input input, Utf8Entry name, int payloadStart, byte[] payload) {
    Cursor data = new Cursor(input, payloadStart);
    int end = payloadStart + payload.length;
    int maxStack = data.u2(), maxLocals = data.u2(), length = data.length();
    if (length == 0 || length > 65535) throw new IllegalArgumentException("Invalid Code length");
    byte[] code = data.bytes(length);
    int count = data.u2();
    CodeValue result = new CodeValue(method, input.pool, name, maxStack, maxLocals, code, payload);
    List<ExceptionCatch> handlers = new ArrayList<ExceptionCatch>();
    for (int index = 0; index < count; index++) {
      int start = data.u2(), stop = data.u2(), handler = data.u2(), catchIndex = data.u2();
      if (start >= stop || stop > length || handler >= length) throw new IllegalArgumentException("Invalid exception-handler range");
      ClassEntry catchType = catchIndex == 0 ? null : input.pool.entryByIndex(catchIndex, ClassEntry.class);
      handlers.add(exceptionCatch(result.label(handler), result.label(start), result.label(stop), Optional.ofNullable(catchType)));
    }
    result.handlers = immutable(handlers);
    result.attributes = readAttributes(result, data, false);
    if (data.at != end) throw new IllegalArgumentException("Invalid Code attribute boundary");
    return result;
  }

  public static byte[] originalBytes(ClassModel model) {
    if (!(Objects.requireNonNull(model) instanceof ClassValue)) throw new IllegalArgumentException("No retained original class bytes");
    return ((ClassValue) model).input.bytes.clone();
  }
  public static byte[] memberBytes(FieldModel model) {
    if (!(Objects.requireNonNull(model) instanceof FieldValue)) throw new IllegalArgumentException("No retained original field bytes");
    return ((FieldValue) model).raw.clone();
  }
  public static byte[] memberBytes(MethodModel model) {
    if (!(Objects.requireNonNull(model) instanceof MethodValue)) throw new IllegalArgumentException("No retained original method bytes");
    return ((MethodValue) model).raw.clone();
  }
  public static byte[] codeBytes(CodeModel model) {
    if (!(Objects.requireNonNull(model) instanceof CodeAttribute)) throw new IllegalArgumentException("No real Code attribute");
    return ((CodeAttribute) model).codeArray().clone();
  }
  public static int maxStack(CodeModel model) {
    if (!(Objects.requireNonNull(model) instanceof CodeAttribute)) throw new IllegalArgumentException("No real Code attribute");
    return ((CodeAttribute) model).maxStack();
  }
  public static int maxLocals(CodeModel model) {
    if (!(Objects.requireNonNull(model) instanceof CodeAttribute)) throw new IllegalArgumentException("No real Code attribute");
    return ((CodeAttribute) model).maxLocals();
  }
  public static byte[] codePayload(CodeModel model) {
    if (Objects.requireNonNull(model) instanceof CodeValue) return ((CodeValue) model).payload.clone();
    if (!(model instanceof CodeAttribute) || !model.exceptionHandlers().isEmpty() || !model.attributes().isEmpty())
      throw new IllegalArgumentException("No directly serializable retained Code payload");
    try {
      CodeAttribute code = (CodeAttribute) model;
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      DataOutputStream out = new DataOutputStream(bytes);
      byte[] instructions = code.codeArray();
      out.writeShort(code.maxStack()); out.writeShort(code.maxLocals());
      out.writeInt(instructions.length); out.write(instructions); out.writeShort(0); out.writeShort(0);
      return bytes.toByteArray();
    } catch (IOException impossible) { throw new IllegalArgumentException(impossible); }
  }
  public static byte[] attributePayload(Attribute<?> attribute) {
    Objects.requireNonNull(attribute);
    if (attribute instanceof RawAttribute) return ((RawAttribute) attribute).payload.clone();
    if (attribute instanceof SourceFileValue) {
      byte[] payload = ((SourceFileValue) attribute).payload;
      if (payload != null) return payload.clone();
    }
    if (attribute instanceof CodeValue) return ((CodeValue) attribute).payload.clone();
    throw new IllegalArgumentException("No retained original attribute payload");
  }
  public static ConstantPool sourcePool(Attribute<?> attribute) {
    Objects.requireNonNull(attribute);
    if (attribute instanceof RawAttribute) return ((RawAttribute) attribute).pool;
    if (attribute instanceof SourceFileValue) return ((SourceFileValue) attribute).pool;
    if (attribute instanceof CodeValue) return ((CodeValue) attribute).pool;
    throw new IllegalArgumentException("No retained source pool");
  }

  public static AccessFlags flags(int mask, AccessFlag.Location location) {
    Objects.requireNonNull(location);
    if ((mask & ~65535) != 0) throw new IllegalArgumentException("Flags exceed u2");
    return new FlagsValue(mask, location);
  }
  public static ClassFileVersion version(int major, int minor) {
    if (major < 0 || major > 65535 || minor < 0 || minor > 65535) throw new IllegalArgumentException("Version exceeds u2");
    return new VersionValue(major, minor);
  }
  public static SourceFileAttribute sourceFile(String sourceFile) {
    DoppioConstantPool pool = new DoppioConstantPool();
    return sourceFile(pool.utf8Entry(Objects.requireNonNull(sourceFile)));
  }
  public static SourceFileAttribute sourceFile(Utf8Entry sourceFile) {
    Objects.requireNonNull(sourceFile);
    DoppioConstantPool pool = new DoppioConstantPool();
    return new SourceFileValue(pool.utf8Entry("SourceFile"), sourceFile, sourceFile.constantPool(), null);
  }
  private static final AttributeMapper<SourceFileAttribute> SOURCE_FILE_MAPPER = new AttributeMapper<SourceFileAttribute>() {
    public String name() { return "SourceFile"; }
    public AttributeStability stability() { return AttributeStability.CP_REFS; }
    public SourceFileAttribute readAttribute(AttributedElement owner, ClassReader reader, int at) {
      return sourceFile(reader.readEntry(at, Utf8Entry.class));
    }
    public void writeAttribute(BufWriter writer, SourceFileAttribute attribute) {
      writer.writeIndex(attribute.attributeName()); writer.writeInt(2); writer.writeIndex(attribute.sourceFile());
    }
  };
  private static final AttributeMapper<CodeAttribute> CODE_MAPPER = new AttributeMapper<CodeAttribute>() {
    public String name() { return "Code"; }
    public AttributeStability stability() { return AttributeStability.LABELS; }
    public CodeAttribute readAttribute(AttributedElement owner, ClassReader reader, int at) {
      if (!(owner instanceof MethodModel) || !(reader instanceof Input)) throw new IllegalArgumentException("Unsupported Code reader context");
      int length = reader.readInt(at - 4);
      return readCode((MethodModel) owner, (Input) reader,
        reader.readEntry(at - 6, Utf8Entry.class), at, reader.readBytes(at, length));
    }
    public void writeAttribute(BufWriter writer, CodeAttribute attribute) {
      if (attribute instanceof CodeValue && !writer.canWriteDirect(sourcePool(attribute)))
        throw new IllegalArgumentException("Code copy requires the held original pool");
      byte[] payload = codePayload(attribute);
      writer.writeIndex(attribute.attributeName()); writer.writeInt(payload.length); writer.writeBytes(payload);
    }
  };
  public static AttributeMapper<SourceFileAttribute> sourceFileMapper() { return SOURCE_FILE_MAPPER; }
  public static AttributeMapper<CodeAttribute> codeMapper() { return CODE_MAPPER; }

  public static Opcode opcode(int bytecode) {
    for (Opcode opcode : Opcode.values()) if (opcode.bytecode() == bytecode) return opcode;
    throw new IllegalArgumentException("Invalid opcode " + bytecode);
  }
  public static ConstantInstruction intrinsic(Opcode opcode) {
    Objects.requireNonNull(opcode);
    int code = opcode.bytecode();
    Object value; TypeKind kind;
    if (code == 1) { value = ConstantDescs.NULL; kind = TypeKind.REFERENCE; }
    else if (code >= 2 && code <= 8) { value = Integer.valueOf(code - 3); kind = TypeKind.INT; }
    else if (code >= 9 && code <= 10) { value = Long.valueOf(code - 9); kind = TypeKind.LONG; }
    else if (code >= 11 && code <= 13) { value = Float.valueOf(code - 11); kind = TypeKind.FLOAT; }
    else if (code >= 14 && code <= 15) { value = Double.valueOf(code - 14); kind = TypeKind.DOUBLE; }
    else throw new IllegalArgumentException("Not an intrinsic constant");
    return new ConstantValue(opcode, value, kind);
  }
  public static ConstantInstruction argument(Opcode opcode, int value) {
    Objects.requireNonNull(opcode);
    if (opcode != Opcode.BIPUSH && opcode != Opcode.SIPUSH) throw new IllegalArgumentException("Not an argument constant");
    if (opcode == Opcode.BIPUSH && (value < -128 || value > 127) ||
        opcode == Opcode.SIPUSH && (value < -32768 || value > 32767)) throw new IllegalArgumentException("Constant operand overflow");
    return new ConstantValue(opcode, Integer.valueOf(value), TypeKind.INT);
  }
  public static ConstantInstruction.LoadConstantInstruction loadConstant(Opcode opcode, LoadableConstantEntry constant) {
    Objects.requireNonNull(opcode); Objects.requireNonNull(constant);
    if (opcode != Opcode.LDC && opcode != Opcode.LDC_W && opcode != Opcode.LDC2_W)
      throw new IllegalArgumentException("Not a constant-pool load opcode");
    if ((opcode == Opcode.LDC2_W) != (constant.typeKind().slotSize() == 2))
      throw new IllegalArgumentException("Constant category does not match opcode");
    return new LoadConstantValue(opcode, constant);
  }
  public static LoadInstruction load(TypeKind kind, int slot) { return load(localOpcode(kind, slot, true), slot); }
  public static StoreInstruction store(TypeKind kind, int slot) { return store(localOpcode(kind, slot, false), slot); }
  public static LoadInstruction load(Opcode opcode, int slot) {
    validateLocal(opcode, slot, true); return new LoadValue(opcode, slot, localKind(opcode));
  }
  public static StoreInstruction store(Opcode opcode, int slot) {
    validateLocal(opcode, slot, false); return new StoreValue(opcode, slot, localKind(opcode));
  }
  private static Opcode localOpcode(TypeKind kind, int slot, boolean load) {
    Objects.requireNonNull(kind);
    if (slot < 0 || slot > 65535 || kind == TypeKind.VOID) throw new IllegalArgumentException("Invalid local slot/type");
    int offset = kind.asLoadable().ordinal() - TypeKind.INT.ordinal();
    int base = (load ? 21 : 54) + offset;
    return opcode(slot < 4 ? (load ? 26 : 59) + offset * 4 + slot : slot <= 255 ? base : 196 << 8 | base);
  }
  private static void validateLocal(Opcode opcode, int slot, boolean load) {
    Objects.requireNonNull(opcode);
    if (opcode.kind() != (load ? Opcode.Kind.LOAD : Opcode.Kind.STORE) || slot < 0 || slot > 65535)
      throw new IllegalArgumentException("Invalid local instruction");
    if (opcode.sizeIfFixed() == 1 && (opcode.bytecode() - (load ? 26 : 59)) % 4 != slot)
      throw new IllegalArgumentException("Intrinsic local opcode/slot mismatch");
    if (!opcode.isWide() && opcode.sizeIfFixed() == 2 && slot > 255)
      throw new IllegalArgumentException("Local operand exceeds u1");
  }
  private static TypeKind localKind(Opcode opcode) {
    int code = opcode.bytecode() & 255, offset;
    if (code >= 21 && code <= 25) offset = code - 21;
    else if (code >= 26 && code <= 45) offset = (code - 26) / 4;
    else if (code >= 54 && code <= 58) offset = code - 54;
    else if (code >= 59 && code <= 78) offset = (code - 59) / 4;
    else throw new IllegalArgumentException("Not a local opcode");
    return TypeKind.values()[TypeKind.INT.ordinal() + offset];
  }
  public static ReturnInstruction returnInstruction(TypeKind kind) {
    Objects.requireNonNull(kind); return returnInstruction(opcode(172 + kind.asLoadable().ordinal() - TypeKind.INT.ordinal()));
  }
  public static ReturnInstruction returnInstruction(Opcode opcode) {
    Objects.requireNonNull(opcode);
    if (opcode.kind() != Opcode.Kind.RETURN) throw new IllegalArgumentException("Not a return opcode");
    return new ReturnValue(opcode, TypeKind.values()[TypeKind.INT.ordinal() + opcode.bytecode() - 172]);
  }
  public static OperatorInstruction operator(Opcode opcode) {
    Objects.requireNonNull(opcode);
    if (opcode.kind() != Opcode.Kind.OPERATOR) throw new IllegalArgumentException("Not an operator opcode");
    char prefix = opcode.name().charAt(0);
    TypeKind kind = prefix == 'L' ? TypeKind.LONG : prefix == 'F' ? TypeKind.FLOAT : prefix == 'D' ? TypeKind.DOUBLE : TypeKind.INT;
    return new OperatorValue(opcode, kind);
  }
  public static StackInstruction stack(Opcode opcode) {
    Objects.requireNonNull(opcode);
    if (opcode.kind() != Opcode.Kind.STACK) throw new IllegalArgumentException("Not a stack opcode");
    return new StackValue(opcode);
  }
  public static NopInstruction nop() { return new NopValue(); }
  public static FieldInstruction field(Opcode opcode, FieldRefEntry field) {
    Objects.requireNonNull(opcode); Objects.requireNonNull(field);
    if (opcode.kind() != Opcode.Kind.FIELD_ACCESS) throw new IllegalArgumentException("Not a field opcode");
    return new FieldInstructionValue(opcode, field);
  }
  public static InvokeInstruction invoke(Opcode opcode, MemberRefEntry method) {
    Objects.requireNonNull(opcode); Objects.requireNonNull(method);
    if (opcode.kind() != Opcode.Kind.INVOKE || method.tag() != 10 && method.tag() != 11)
      throw new IllegalArgumentException("Invalid invocation entry");
    if (opcode == Opcode.INVOKEINTERFACE && method.tag() != 11 || opcode == Opcode.INVOKEVIRTUAL && method.tag() != 10)
      throw new IllegalArgumentException("Invocation opcode/reference mismatch");
    MethodTypeDesc signature = MethodTypeDesc.ofDescriptor(method.type().stringValue());
    int count = 1;
    for (ClassDesc parameter : signature.parameterList()) count += TypeKind.fromDescriptor(parameter.descriptorString()).slotSize();
    return new InvokeValue(opcode, method, opcode == Opcode.INVOKEINTERFACE ? count : 0);
  }
  public static LineNumber lineNumber(int line) {
    if (line < 0 || line > 65535) throw new IllegalArgumentException("Line number exceeds u2");
    return new LineValue(line);
  }
  public static ExceptionCatch exceptionCatch(Label handler, Label start, Label end, Optional<ClassEntry> catchType) {
    return new CatchValue(Objects.requireNonNull(handler), Objects.requireNonNull(start),
      Objects.requireNonNull(end), Objects.requireNonNull(catchType));
  }

  private static List<CodeElement> instructions(CodeValue code) {
    byte[] bytes = code.code;
    List<CodeElement> elements = new ArrayList<CodeElement>();
    for (ExceptionCatch handler : code.handlers) elements.add(handler);
    for (Attribute<?> attribute : code.attributes) if (attribute instanceof UnknownAttribute &&
        !"LineNumberTable".equals(attribute.attributeName().stringValue()) &&
        !"LocalVariableTable".equals(attribute.attributeName().stringValue()) &&
        !"LocalVariableTypeTable".equals(attribute.attributeName().stringValue()) &&
        !"StackMapTable".equals(attribute.attributeName().stringValue())) elements.add((UnknownAttribute) attribute);
    int cursor = 0;
    while (cursor < bytes.length) {
      for (Attribute<?> attribute : code.attributes) if ("LineNumberTable".equals(attribute.attributeName().stringValue())) {
        byte[] lines = attributePayload(attribute);
        int count = u2(lines, 0);
        if (lines.length != 2 + count * 4) throw new IllegalArgumentException("Invalid LineNumberTable");
        for (int index = 0; index < count; index++) if (u2(lines, 2 + index * 4) == cursor)
          elements.add(lineNumber(u2(lines, 4 + index * 4)));
      }
      int start = cursor, bytecode = bytes[cursor++] & 255;
      Opcode opcode;
      if (bytecode == 196) {
        require(bytes, cursor, 3);
        bytecode = 196 << 8 | bytes[cursor++] & 255;
      }
      opcode = opcode(bytecode);
      int size = opcode.sizeIfFixed();
      if (size < 0) throw new IllegalArgumentException("Control-flow modeling is outside the selected pipeline");
      require(bytes, start, size);
      Instruction instruction;
      switch (opcode.kind()) {
        case CONSTANT:
          if (opcode.bytecode() <= 15) instruction = intrinsic(opcode);
          else if (opcode == Opcode.BIPUSH) instruction = argument(opcode, bytes[cursor]);
          else if (opcode == Opcode.SIPUSH) instruction = argument(opcode, (short) u2(bytes, cursor));
          else instruction = loadConstant(opcode, code.pool.entryByIndex(opcode == Opcode.LDC ?
            bytes[cursor] & 255 : u2(bytes, cursor), LoadableConstantEntry.class));
          break;
        case LOAD:
          instruction = load(opcode, size == 1 ? (bytecode - 26) % 4 : opcode.isWide() ? u2(bytes, cursor) : bytes[cursor] & 255); break;
        case STORE:
          instruction = store(opcode, size == 1 ? (bytecode - 59) % 4 : opcode.isWide() ? u2(bytes, cursor) : bytes[cursor] & 255); break;
        case RETURN: instruction = returnInstruction(opcode); break;
        case OPERATOR: instruction = operator(opcode); break;
        case STACK: instruction = stack(opcode); break;
        case NOP: instruction = nop(); break;
        case FIELD_ACCESS: instruction = field(opcode, code.pool.entryByIndex(u2(bytes, cursor), FieldRefEntry.class)); break;
        case INVOKE: {
          instruction = invoke(opcode, code.pool.entryByIndex(u2(bytes, cursor), MemberRefEntry.class));
          if (opcode == Opcode.INVOKEINTERFACE && ((bytes[cursor + 2] & 255) != ((InvokeInstruction) instruction).count() || bytes[cursor + 3] != 0))
            throw new IllegalArgumentException("Invalid invokeinterface operands");
          break;
        }
        default: throw new IllegalArgumentException("Instruction modeling is outside the selected pipeline: " + opcode);
      }
      elements.add(instruction);
      cursor = start + size;
    }
    return immutable(elements);
  }

  private static <T> List<T> immutable(List<T> values) { return Collections.unmodifiableList(new ArrayList<T>(values)); }
  private static void require(byte[] bytes, int cursor, int length) {
    if (cursor < 0 || length < 0 || cursor > bytes.length || length > bytes.length - cursor)
      throw new IllegalArgumentException("Truncated class-file data");
  }
  private static int u2(byte[] bytes, int cursor) {
    require(bytes, cursor, 2); return (bytes[cursor] & 255) << 8 | bytes[cursor + 1] & 255;
  }

  private static final class Cursor {
    final Input input;
    int at;
    Cursor(Input input, int at) { this.input = input; this.at = at; }
    int u2() { int value = input.readU2(at); at += 2; return value; }
    int length() {
      int value = input.readInt(at); at += 4;
      if (value < 0) throw new IllegalArgumentException("Attribute/Code length exceeds Java array bounds");
      return value;
    }
    byte[] bytes(int length) { byte[] value = input.readBytes(at, length); at += length; return value; }
  }
  private static final class Input implements ClassReader {
    final byte[] bytes;
    DoppioConstantPool pool;
    ClassValue model;
    Input(byte[] bytes) { this.bytes = bytes; }
    public Function<Utf8Entry, AttributeMapper<?>> customAttributes() { return entry -> null; }
    public int flags() { return model.flags.flagsMask(); }
    public ClassEntry thisClassEntry() { return model.name; }
    public Optional<ClassEntry> superclassEntry() { return model.superclass(); }
    public int classfileLength() { return bytes.length; }
    public PoolEntry entryByIndex(int index) { return pool.entryByIndex(index); }
    public <T extends PoolEntry> T entryByIndex(int index, Class<T> type) { return pool.entryByIndex(index, type); }
    public int size() { return pool.size(); }
    public BootstrapMethodEntry bootstrapMethodEntry(int index) { return pool.bootstrapMethodEntry(index); }
    public int bootstrapMethodCount() { return pool.bootstrapMethodCount(); }
    public PoolEntry readEntry(int at) { return entryByIndex(readU2(at)); }
    public <T extends PoolEntry> T readEntry(int at, Class<T> type) { return entryByIndex(readU2(at), type); }
    public PoolEntry readEntryOrNull(int at) { int index = readU2(at); return index == 0 ? null : entryByIndex(index); }
    public <T extends PoolEntry> T readEntryOrNull(int at, Class<T> type) {
      int index = readU2(at); return index == 0 ? null : entryByIndex(index, type);
    }
    public int readU1(int at) { require(bytes, at, 1); return bytes[at] & 255; }
    public int readU2(int at) { return u2(bytes, at); }
    public int readS1(int at) { require(bytes, at, 1); return bytes[at]; }
    public int readS2(int at) { return (short) readU2(at); }
    public int readInt(int at) {
      require(bytes, at, 4);
      return (bytes[at] & 255) << 24 | (bytes[at + 1] & 255) << 16 | (bytes[at + 2] & 255) << 8 | bytes[at + 3] & 255;
    }
    public long readLong(int at) { return ((long) readInt(at) << 32) | (readInt(at + 4) & 0xffffffffL); }
    public float readFloat(int at) { return Float.intBitsToFloat(readInt(at)); }
    public double readDouble(int at) { return Double.longBitsToDouble(readLong(at)); }
    public byte[] readBytes(int at, int length) { require(bytes, at, length); return Arrays.copyOfRange(bytes, at, at + length); }
    public void copyBytesTo(BufWriter writer, int at, int length) { Objects.requireNonNull(writer).writeBytes(readBytes(at, length)); }
  }
  private static final class FlagsValue implements AccessFlags {
    final int mask;
    final AccessFlag.Location location;
    FlagsValue(int mask, AccessFlag.Location location) { this.mask = mask; this.location = location; }
    public int flagsMask() { return mask; }
    public Set<AccessFlag> flags() { return AccessFlag.maskToAccessFlags(mask, location); }
    public boolean has(AccessFlag flag) {
      return Objects.requireNonNull(flag).locations().contains(location) && (mask & flag.mask()) != 0;
    }
    public AccessFlag.Location location() { return location; }
  }
  private static final class VersionValue implements ClassFileVersion {
    final int major, minor;
    VersionValue(int major, int minor) { this.major = major; this.minor = minor; }
    public int majorVersion() { return major; }
    public int minorVersion() { return minor; }
  }
  private static final class ClassValue implements ClassModel {
    final Input input;
    final int major, minor;
    final AccessFlags flags;
    final ClassEntry name, superclass;
    final List<ClassEntry> interfaces;
    List<FieldModel> fields = Collections.emptyList();
    List<MethodModel> methods = Collections.emptyList();
    List<Attribute<?>> attributes = Collections.emptyList();
    ClassValue(Input input, int major, int minor, int flags, ClassEntry name, ClassEntry superclass, List<ClassEntry> interfaces) {
      this.input = input; this.major = major; this.minor = minor; this.flags = DoppioClassReader.flags(flags, AccessFlag.Location.CLASS);
      this.name = name; this.superclass = superclass; this.interfaces = immutable(interfaces);
    }
    public ConstantPool constantPool() { return input.pool; }
    public AccessFlags flags() { return flags; }
    public ClassEntry thisClass() { return name; }
    public int majorVersion() { return major; }
    public int minorVersion() { return minor; }
    public List<FieldModel> fields() { return fields; }
    public List<MethodModel> methods() { return methods; }
    public Optional<ClassEntry> superclass() { return Optional.ofNullable(superclass); }
    public List<ClassEntry> interfaces() { return interfaces; }
    public List<Attribute<?>> attributes() { return attributes; }
    public boolean isModuleInfo() {
      if (!flags.has(AccessFlag.MODULE) || major < 53 || !"module-info".equals(name.asInternalName()) ||
          superclass != null || !interfaces.isEmpty() || !fields.isEmpty() || !methods.isEmpty()) return false;
      for (Attribute<?> attribute : attributes) if ("Module".equals(attribute.attributeName().stringValue())) return true;
      return false;
    }
    public void forEach(Consumer<? super ClassElement> consumer) {
      Objects.requireNonNull(consumer);
      consumer.accept(flags); consumer.accept(version(major, minor));
      if (superclass != null) consumer.accept(Superclass.of(superclass));
      consumer.accept(Interfaces.of(interfaces));
      for (FieldModel field : fields) consumer.accept(field);
      for (MethodModel method : methods) consumer.accept(method);
      for (Attribute<?> attribute : attributes) if (attribute instanceof ClassElement) consumer.accept((ClassElement) attribute);
    }
  }
  private static final class FieldValue implements FieldModel {
    final ClassValue parent;
    final AccessFlags flags;
    final Utf8Entry name, type;
    byte[] raw;
    List<Attribute<?>> attributes = Collections.emptyList();
    FieldValue(ClassValue parent, int flags, Utf8Entry name, Utf8Entry type) {
      this.parent = parent; this.flags = DoppioClassReader.flags(flags, AccessFlag.Location.FIELD); this.name = name; this.type = type;
    }
    public AccessFlags flags() { return flags; }
    public Optional<ClassModel> parent() { return Optional.of(parent); }
    public Utf8Entry fieldName() { return name; }
    public Utf8Entry fieldType() { return type; }
    public List<Attribute<?>> attributes() { return attributes; }
    public void forEach(Consumer<? super FieldElement> consumer) {
      Objects.requireNonNull(consumer); consumer.accept(flags);
      for (Attribute<?> attribute : attributes) if (attribute instanceof FieldElement) consumer.accept((FieldElement) attribute);
    }
  }
  private static final class MethodValue implements MethodModel {
    final ClassValue parent;
    final AccessFlags flags;
    final Utf8Entry name, type;
    byte[] raw;
    CodeModel code;
    List<Attribute<?>> attributes = Collections.emptyList();
    MethodValue(ClassValue parent, int flags, Utf8Entry name, Utf8Entry type) {
      this.parent = parent; this.flags = DoppioClassReader.flags(flags, AccessFlag.Location.METHOD); this.name = name; this.type = type;
    }
    public AccessFlags flags() { return flags; }
    public Optional<ClassModel> parent() { return Optional.of(parent); }
    public Utf8Entry methodName() { return name; }
    public Utf8Entry methodType() { return type; }
    public Optional<CodeModel> code() { return Optional.ofNullable(code); }
    public List<Attribute<?>> attributes() { return attributes; }
    public void forEach(Consumer<? super MethodElement> consumer) {
      Objects.requireNonNull(consumer); consumer.accept(flags);
      for (Attribute<?> attribute : attributes) if (attribute instanceof MethodElement) consumer.accept((MethodElement) attribute);
    }
  }
  private static final class SourceFileValue implements SourceFileAttribute {
    final Utf8Entry name, source;
    final ConstantPool pool;
    final byte[] payload;
    SourceFileValue(Utf8Entry name, Utf8Entry source, ConstantPool pool, byte[] payload) {
      this.name = name; this.source = source; this.pool = pool; this.payload = payload == null ? null : payload.clone();
    }
    public Utf8Entry attributeName() { return name; }
    public AttributeMapper<SourceFileAttribute> attributeMapper() { return SOURCE_FILE_MAPPER; }
    public Utf8Entry sourceFile() { return source; }
  }
  private static final class RawAttribute implements UnknownAttribute {
    final Utf8Entry name;
    final ConstantPool pool;
    final byte[] payload;
    final AttributeMapper<UnknownAttribute> mapper;
    RawAttribute(Utf8Entry name, ConstantPool pool, byte[] payload) {
      this.name = name; this.pool = pool; this.payload = payload.clone();
      this.mapper = new AttributeMapper<UnknownAttribute>() {
        public String name() { return RawAttribute.this.name.stringValue(); }
        public AttributeStability stability() { return AttributeStability.UNKNOWN; }
        public UnknownAttribute readAttribute(AttributedElement owner, ClassReader reader, int at) {
          return new RawAttribute(reader.readEntry(at - 6, Utf8Entry.class), reader, reader.readBytes(at, reader.readInt(at - 4)));
        }
        public void writeAttribute(BufWriter writer, UnknownAttribute attribute) {
          if (attribute instanceof RawAttribute && !writer.canWriteDirect(sourcePool(attribute)))
            throw new IllegalArgumentException("Unknown attribute requires the held original pool");
          byte[] payload = attribute.contents();
          writer.writeIndex(attribute.attributeName()); writer.writeInt(payload.length); writer.writeBytes(payload);
        }
      };
    }
    public Utf8Entry attributeName() { return name; }
    public AttributeMapper<UnknownAttribute> attributeMapper() { return mapper; }
    public byte[] contents() { return payload.clone(); }
  }
  private static final class CodeValue implements CodeAttribute {
    final MethodModel parent;
    final DoppioConstantPool pool;
    final Utf8Entry name;
    final int stack, locals;
    final byte[] code, payload;
    final List<BoundLabel> labels = new ArrayList<BoundLabel>();
    List<ExceptionCatch> handlers = Collections.emptyList();
    List<Attribute<?>> attributes = Collections.emptyList();
    List<CodeElement> elements;
    CodeValue(MethodModel parent, DoppioConstantPool pool, Utf8Entry name, int stack, int locals, byte[] code, byte[] payload) {
      this.parent = parent; this.pool = pool; this.name = name; this.stack = stack; this.locals = locals;
      this.code = code.clone(); this.payload = payload.clone();
    }
    BoundLabel label(int offset) {
      for (BoundLabel label : labels) if (label.offset == offset) return label;
      BoundLabel label = new BoundLabel(this, offset); labels.add(label); return label;
    }
    public Optional<MethodModel> parent() { return Optional.of(parent); }
    public List<ExceptionCatch> exceptionHandlers() { return handlers; }
    public List<Attribute<?>> attributes() { return attributes; }
    public Utf8Entry attributeName() { return name; }
    public AttributeMapper<CodeAttribute> attributeMapper() { return CODE_MAPPER; }
    public int maxStack() { return stack; }
    public int maxLocals() { return locals; }
    public int codeLength() { return code.length; }
    public byte[] codeArray() { return code.clone(); }
    public int labelToBci(Label label) {
      if (!(Objects.requireNonNull(label) instanceof BoundLabel) || ((BoundLabel) label).owner != this)
        throw new IllegalArgumentException("Foreign code label");
      return ((BoundLabel) label).offset;
    }
    public void forEach(Consumer<? super CodeElement> consumer) {
      Objects.requireNonNull(consumer);
      if (elements == null) elements = instructions(this);
      for (CodeElement element : elements) consumer.accept(element);
    }
  }
  private static final class BoundLabel implements Label {
    final CodeValue owner;
    final int offset;
    BoundLabel(CodeValue owner, int offset) { this.owner = owner; this.offset = offset; }
  }
  private static final class CatchValue implements ExceptionCatch {
    final Label handler, start, end;
    final Optional<ClassEntry> type;
    CatchValue(Label handler, Label start, Label end, Optional<ClassEntry> type) {
      this.handler = handler; this.start = start; this.end = end; this.type = type;
    }
    public Label handler() { return handler; }
    public Label tryStart() { return start; }
    public Label tryEnd() { return end; }
    public Optional<ClassEntry> catchType() { return type; }
  }
  private static final class LineValue implements LineNumber {
    final int line;
    LineValue(int line) { this.line = line; }
    public int line() { return line; }
  }
  private static class InstructionValue implements Instruction {
    final Opcode opcode;
    InstructionValue(Opcode opcode) { this.opcode = opcode; }
    public Opcode opcode() { return opcode; }
    public int sizeInBytes() { return opcode.sizeIfFixed(); }
  }
  private static final class ConstantValue extends InstructionValue implements ConstantInstruction {
    final Object value;
    final TypeKind kind;
    ConstantValue(Opcode opcode, Object value, TypeKind kind) { super(opcode); this.value = value; this.kind = kind; }
    public ConstantDesc constantValue() { return (ConstantDesc) value; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class LoadConstantValue extends InstructionValue implements ConstantInstruction.LoadConstantInstruction {
    final LoadableConstantEntry constant;
    LoadConstantValue(Opcode opcode, LoadableConstantEntry constant) { super(opcode); this.constant = constant; }
    public LoadableConstantEntry constantEntry() { return constant; }
    public ConstantDesc constantValue() { return constant.constantValue(); }
  }
  private static final class LoadValue extends InstructionValue implements LoadInstruction {
    final int slot;
    final TypeKind kind;
    LoadValue(Opcode opcode, int slot, TypeKind kind) { super(opcode); this.slot = slot; this.kind = kind; }
    public int slot() { return slot; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class StoreValue extends InstructionValue implements StoreInstruction {
    final int slot;
    final TypeKind kind;
    StoreValue(Opcode opcode, int slot, TypeKind kind) { super(opcode); this.slot = slot; this.kind = kind; }
    public int slot() { return slot; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class ReturnValue extends InstructionValue implements ReturnInstruction {
    final TypeKind kind;
    ReturnValue(Opcode opcode, TypeKind kind) { super(opcode); this.kind = kind; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class OperatorValue extends InstructionValue implements OperatorInstruction {
    final TypeKind kind;
    OperatorValue(Opcode opcode, TypeKind kind) { super(opcode); this.kind = kind; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class StackValue extends InstructionValue implements StackInstruction {
    StackValue(Opcode opcode) { super(opcode); }
  }
  private static final class NopValue extends InstructionValue implements NopInstruction {
    NopValue() { super(Opcode.NOP); }
  }
  private static final class FieldInstructionValue extends InstructionValue implements FieldInstruction {
    final FieldRefEntry field;
    FieldInstructionValue(Opcode opcode, FieldRefEntry field) { super(opcode); this.field = field; }
    public FieldRefEntry field() { return field; }
  }
  private static final class InvokeValue extends InstructionValue implements InvokeInstruction {
    final MemberRefEntry method;
    final int count;
    InvokeValue(Opcode opcode, MemberRefEntry method, int count) { super(opcode); this.method = method; this.count = count; }
    public MemberRefEntry method() { return method; }
    public boolean isInterface() { return method.tag() == 11; }
    public int count() { return count; }
  }
}
