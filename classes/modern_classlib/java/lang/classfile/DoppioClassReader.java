package java.lang.classfile;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.attribute.SourceFileAttribute;
import java.lang.classfile.attribute.LineNumberTableAttribute;
import java.lang.classfile.attribute.LineNumberInfo;
import java.lang.classfile.attribute.LocalVariableTableAttribute;
import java.lang.classfile.attribute.LocalVariableInfo;
import java.lang.classfile.attribute.LocalVariableTypeTableAttribute;
import java.lang.classfile.attribute.LocalVariableTypeInfo;
import java.lang.classfile.attribute.CharacterRangeTableAttribute;
import java.lang.classfile.attribute.CharacterRangeInfo;
import java.lang.classfile.attribute.StackMapTableAttribute;
import java.lang.classfile.attribute.StackMapFrameInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.VerificationTypeInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.SimpleVerificationTypeInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.ObjectVerificationTypeInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.UninitializedVerificationTypeInfo;
import java.lang.classfile.attribute.UnknownAttribute;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
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
  private static final Opcode[] OPCODES = new Opcode[256];
  private static final Opcode[] WIDE_OPCODES = new Opcode[256];
  static {
    for (Opcode opcode : Opcode.values()) {
      int bytecode = opcode.bytecode();
      if (bytecode < 256) OPCODES[bytecode] = opcode;
      else WIDE_OPCODES[bytecode & 255] = opcode;
    }
  }

  public static ClassModel parse(byte[] bytes) {
    return parse(bytes, entry -> null);
  }

  public static ClassModel parse(byte[] bytes, Function<Utf8Entry, AttributeMapper<?>> customAttributes) {
    return parse(bytes, customAttributes, ClassFile.DebugElementsOption.PASS_DEBUG,
        ClassFile.LineNumbersOption.PASS_LINE_NUMBERS);
  }

  public static ClassModel parse(byte[] bytes, Function<Utf8Entry, AttributeMapper<?>> customAttributes,
      ClassFile.DebugElementsOption debugElements, ClassFile.LineNumbersOption lineNumbers) {
    byte[] retained = Objects.requireNonNull(bytes).clone();
    Input input = new Input(retained, Objects.requireNonNull(customAttributes),
        Objects.requireNonNull(debugElements), Objects.requireNonNull(lineNumbers));
    require(retained, 0, 8);
    if (input.readInt(0) != ClassFile.MAGIC_NUMBER) throw new IllegalArgumentException("Invalid class-file magic");
    int minor = input.readU2(4), major = input.readU2(6);
    if (major < 45 || major > 69) throw new IllegalArgumentException("Unsupported class-file version");
    int[] cursor = {8};
    input.pool = DoppioConstantPool.decode(retained, cursor);
    // Public custom mappers may resolve dynamic constants before traversal reaches
    // the class attributes. Bind the class-level bootstrap records first, just
    // as a native ClassReader exposes them independently of attribute order.
    bindBootstrapMethods(input, cursor[0]);
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
    input.pool.freeze();
    return model;
  }

  private static void bindBootstrapMethods(Input input, int bodyStart) {
    Cursor data = new Cursor(input, bodyStart);
    data.skip(6); // flags, this_class, super_class
    data.skip(data.u2() * 2); // interfaces
    for (int memberKind = 0; memberKind < 2; memberKind++) {
      int count = data.u2();
      for (int member = 0; member < count; member++) {
        data.skip(6); // flags, name, descriptor
        int attributes = data.u2();
        for (int index = 0; index < attributes; index++) {
          data.u2(); int length = data.length(); data.skip(length);
        }
      }
    }
    boolean seen = false;
    int count = data.u2();
    for (int index = 0; index < count; index++) {
      Utf8Entry name = input.pool.entryByIndex(data.u2(), Utf8Entry.class);
      int length = data.length();
      if ("BootstrapMethods".equals(name.stringValue())) {
        if (seen) throw new IllegalArgumentException("Duplicate BootstrapMethods attribute");
        seen = true; input.pool.bootstrapMethods(data.bytes(length));
      } else data.skip(length);
    }
    if (data.at != input.bytes.length) throw new IllegalArgumentException("Trailing class-file bytes");
  }

  private static List<Attribute<?>> readAttributes(AttributedElement owner, Cursor data, boolean method) {
    int count = data.u2();
    List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    boolean stackMapSeen = false;
    boolean bootstrapSeen = false;
    for (int index = 0; index < count; index++) {
      Utf8Entry name = data.input.pool.entryByIndex(data.u2(), Utf8Entry.class);
      int length = data.length();
      int start = data.at;
      byte[] payload = data.bytes(length);
      if ("BootstrapMethods".equals(name.stringValue())) {
        if (bootstrapSeen) throw new IllegalArgumentException("Duplicate BootstrapMethods attribute");
        bootstrapSeen = true;
      }
      if (method && "Code".equals(name.stringValue())) {
        attributes.add(readCode((MethodModel) owner, data.input, name, start, payload));
      } else if (owner instanceof CodeValue && "StackMapTable".equals(name.stringValue())) {
        if (stackMapSeen) throw new IllegalArgumentException("Duplicate StackMapTable attribute");
        stackMapSeen = true;
        attributes.add(readStackMap((CodeValue) owner, name, payload));
      } else if ("SourceFile".equals(name.stringValue())) {
        if (length != 2) throw new IllegalArgumentException("Invalid SourceFile length");
        attributes.add(new SourceFileValue(name, data.input.pool.entryByIndex(u2(payload, 0), Utf8Entry.class), data.input.pool, payload));
      } else {
        Attribute<?> decoded = DoppioAttributes.read(owner, data.input, name, start, payload);
        attributes.add(decoded == null ? new RawAttribute(name, data.input.pool, payload) : decoded);
      }
    }
    return immutable(attributes);
  }

  static List<Attribute<?>> readNestedAttributes(AttributedElement owner, ClassReader reader, int[] cursor, int end) {
    Objects.requireNonNull(owner); Objects.requireNonNull(cursor);
    if (!(reader instanceof Input) || cursor.length != 1) throw new IllegalArgumentException("Unsupported nested attribute reader context");
    Cursor data = new Cursor((Input) reader, cursor[0], end);
    List<Attribute<?>> attributes = readAttributes(owner, data, false);
    cursor[0] = data.at;
    return attributes;
  }

  static boolean isBoundLabel(Label label) { return label instanceof BoundLabel; }
  static Label annotationLabel(AttributedElement owner, int bci) {
    if (!(owner instanceof CodeValue))
      throw new IllegalArgumentException("TypeAnnotation Code target outside of Code attribute");
    return ((CodeValue) owner).debugLabel(bci);
  }

  private static CodeValue readCode(MethodModel method, Input input, Utf8Entry name, int payloadStart, byte[] payload) {
    int end = payloadStart + payload.length;
    Cursor data = new Cursor(input, payloadStart, end);
    int maxStack = data.u2(), maxLocals = data.u2(), length = data.length();
    if (length == 0 || length > 65535) throw new IllegalArgumentException("Invalid Code length");
    byte[] code = data.bytes(length);
    int count = data.u2();
    CodeValue result = new CodeValue(method, input.pool, name, maxStack, maxLocals, code, payload,
        input.debugElements, input.lineNumbers);
    List<ExceptionCatch> handlers = new ArrayList<ExceptionCatch>();
    for (int index = 0; index < count; index++) {
      int start = data.u2(), stop = data.u2(), handler = data.u2(), catchIndex = data.u2();
      if (start >= stop || stop > length || handler >= length) throw new IllegalArgumentException("Invalid exception-handler range");
      ClassEntry catchType = catchIndex == 0 ? null : input.pool.entryByIndex(catchIndex, ClassEntry.class);
      handlers.add(exceptionCatch(result.checkedLabel(handler, false), result.checkedLabel(start, false),
        result.checkedLabel(stop, true), Optional.ofNullable(catchType)));
    }
    result.handlers = immutable(handlers);
    result.attributes = readAttributes(result, data, false);
    if (data.at != end) throw new IllegalArgumentException("Invalid Code attribute boundary");
    return result;
  }

  private static StackMapTableAttribute readStackMap(CodeValue code, Utf8Entry name, byte[] payload) {
    PayloadCursor data = new PayloadCursor(payload);
    int count = data.u2();
    List<StackMapFrameInfo> entries = new ArrayList<StackMapFrameInfo>();
    List<VerificationTypeInfo> locals = initialFrameLocals(code.parent);
    int previous = -1;
    for (int index = 0; index < count; index++) {
      int type = data.u1(), delta;
      List<VerificationTypeInfo> stack = new ArrayList<VerificationTypeInfo>();
      if (type <= 63) {
        delta = type;
      } else if (type <= 127) {
        delta = type - 64;
        stack.add(readVerificationType(code, data));
      } else if (type == 247) {
        delta = data.u2();
        stack.add(readVerificationType(code, data));
      } else if (type >= 248 && type <= 250) {
        delta = data.u2();
        int removed = 251 - type;
        if (removed > locals.size()) throw new IllegalArgumentException("Stack map chop exceeds prior local entries");
        locals = new ArrayList<VerificationTypeInfo>(locals.subList(0, locals.size() - removed));
      } else if (type == 251) {
        delta = data.u2();
      } else if (type >= 252 && type <= 254) {
        delta = data.u2();
        locals = new ArrayList<VerificationTypeInfo>(locals);
        for (int added = 0; added < type - 251; added++) locals.add(readVerificationType(code, data));
      } else if (type == 255) {
        delta = data.u2();
        int localCount = data.u2();
        locals = new ArrayList<VerificationTypeInfo>();
        for (int local = 0; local < localCount; local++) locals.add(readVerificationType(code, data));
        int stackCount = data.u2();
        for (int item = 0; item < stackCount; item++) stack.add(readVerificationType(code, data));
      } else {
        throw new IllegalArgumentException("Reserved stack map frame type");
      }
      int target = previous + delta + 1;
      entries.add(new FrameValue(type, code.checkedLabel(target, false), locals, stack));
      previous = target;
    }
    if (data.at != payload.length) throw new IllegalArgumentException("Trailing StackMapTable data");
    return new StackMapValue(name, code.pool, entries, payload);
  }

  private static List<VerificationTypeInfo> initialFrameLocals(MethodModel method) {
    List<VerificationTypeInfo> locals = new ArrayList<VerificationTypeInfo>();
    ClassEntry owner = method.parent().orElseThrow(() -> new IllegalArgumentException("Missing method owner")).thisClass();
    if (!method.flags().has(AccessFlag.STATIC)) {
      if ("<init>".equals(method.methodName().stringValue()) && !owner.matches(ConstantDescs.CD_Object))
        locals.add(SimpleVerificationTypeInfo.UNINITIALIZED_THIS);
      else locals.add(objectVerificationType(owner));
    }
    DoppioConstantPool initialPool = new DoppioConstantPool();
    for (ClassDesc parameter : method.methodTypeSymbol().parameterList()) {
      TypeKind kind = TypeKind.fromDescriptor(parameter.descriptorString()).asLoadable();
      switch (kind) {
        case INT: locals.add(SimpleVerificationTypeInfo.INTEGER); break;
        case FLOAT: locals.add(SimpleVerificationTypeInfo.FLOAT); break;
        case LONG: locals.add(SimpleVerificationTypeInfo.LONG); break;
        case DOUBLE: locals.add(SimpleVerificationTypeInfo.DOUBLE); break;
        case REFERENCE: locals.add(objectVerificationType(initialPool.classEntry(parameter))); break;
        default: throw new IllegalArgumentException("Invalid initial stack map parameter");
      }
    }
    return locals;
  }

  private static VerificationTypeInfo readVerificationType(CodeValue code, PayloadCursor data) {
    int tag = data.u1();
    if (tag <= VerificationTypeInfo.ITEM_UNINITIALIZED_THIS) return SimpleVerificationTypeInfo.values()[tag];
    if (tag == VerificationTypeInfo.ITEM_OBJECT)
      return objectVerificationType(code.pool.entryByIndex(data.u2(), ClassEntry.class));
    if (tag == VerificationTypeInfo.ITEM_UNINITIALIZED) {
      int target = data.u2();
      Label label = code.checkedLabel(target, false);
      if ((code.code[target] & 255) != Opcode.NEW.bytecode())
        throw new IllegalArgumentException("Uninitialized stack map value must target new");
      return uninitializedVerificationType(label);
    }
    throw new IllegalArgumentException("Invalid stack map verification tag");
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
    byte[] typedPayload = DoppioAttributes.retainedPayload(attribute);
    if (typedPayload != null) return typedPayload;
    if (attribute instanceof RawAttribute) return ((RawAttribute) attribute).payload.clone();
    if (attribute instanceof SourceFileValue) {
      byte[] payload = ((SourceFileValue) attribute).payload;
      if (payload != null) return payload.clone();
    }
    if (attribute instanceof CodeValue) return ((CodeValue) attribute).payload.clone();
    if (attribute instanceof StackMapValue && ((StackMapValue) attribute).payload != null)
      return ((StackMapValue) attribute).payload.clone();
    throw new IllegalArgumentException("No retained original attribute payload");
  }
  public static ConstantPool sourcePool(Attribute<?> attribute) {
    Objects.requireNonNull(attribute);
    ConstantPool typedPool = DoppioAttributes.sourcePool(attribute);
    if (typedPool != null) return typedPool;
    if (attribute instanceof RawAttribute) return ((RawAttribute) attribute).pool;
    if (attribute instanceof SourceFileValue) return ((SourceFileValue) attribute).pool;
    if (attribute instanceof CodeValue) return ((CodeValue) attribute).pool;
    if (attribute instanceof StackMapValue) return ((StackMapValue) attribute).pool;
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
    public AttributeStability stability() { return AttributeStability.CP_REFS; }
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

  private static final AttributeMapper<StackMapTableAttribute> STACK_MAP_MAPPER = new AttributeMapper<StackMapTableAttribute>() {
    public String name() { return "StackMapTable"; }
    public AttributeStability stability() { return AttributeStability.LABELS; }
    public StackMapTableAttribute readAttribute(AttributedElement owner, ClassReader reader, int at) {
      if (!(owner instanceof CodeValue)) throw new IllegalArgumentException("Missing original stack map Code context");
      return readStackMap((CodeValue) owner, reader.readEntry(at - 6, Utf8Entry.class),
        reader.readBytes(at, reader.readInt(at - 4)));
    }
    public void writeAttribute(BufWriter writer, StackMapTableAttribute attribute) {
      DoppioBuilders.writeStackMapAttribute(writer, attribute);
    }
  };
  public static AttributeMapper<StackMapTableAttribute> stackMapTableMapper() { return STACK_MAP_MAPPER; }

  public static StackMapTableAttribute stackMapTable(List<StackMapFrameInfo> entries) {
    DoppioConstantPool pool = new DoppioConstantPool();
    return new StackMapValue(pool.utf8Entry("StackMapTable"), pool, entries, null);
  }
  public static StackMapFrameInfo stackMapFrame(Label target, List<VerificationTypeInfo> locals, List<VerificationTypeInfo> stack) {
    return new FrameValue(255, Objects.requireNonNull(target), locals, stack);
  }
  public static ObjectVerificationTypeInfo objectVerificationType(ClassEntry className) {
    return new ObjectTypeValue(Objects.requireNonNull(className));
  }
  public static ObjectVerificationTypeInfo objectVerificationType(ClassDesc classDesc) {
    return objectVerificationType(new DoppioConstantPool().classEntry(Objects.requireNonNull(classDesc)));
  }
  public static UninitializedVerificationTypeInfo uninitializedVerificationType(Label newTarget) {
    return new UninitializedTypeValue(Objects.requireNonNull(newTarget));
  }

  public static Opcode opcode(int bytecode) {
    Opcode opcode = bytecode >= 0 && bytecode < 256 ? OPCODES[bytecode] :
        bytecode >>> 8 == 196 ? WIDE_OPCODES[bytecode & 255] : null;
    if (opcode != null) return opcode;
    throw new IllegalArgumentException("Invalid opcode " + bytecode);
  }
  public static ConstantInstruction.IntrinsicConstantInstruction intrinsic(Opcode opcode) {
    return ConstantInstruction.ofIntrinsic(opcode);
  }
  public static ConstantInstruction.ArgumentConstantInstruction argument(Opcode opcode, int value) {
    return ConstantInstruction.ofArgument(opcode, value);
  }
  public static ConstantInstruction.LoadConstantInstruction loadConstant(Opcode opcode, LoadableConstantEntry constant) {
    return ConstantInstruction.ofLoad(opcode, constant);
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
  public static ThrowInstruction throwInstruction() { return new ThrowValue(); }
  public static NewObjectInstruction newObject(ClassEntry className) {
    return new NewObjectValue(Objects.requireNonNull(className));
  }
  public static IncrementInstruction increment(int slot, int constant) {
    if (slot < 0 || slot > 65535 || constant < -32768 || constant > 32767)
      throw new IllegalArgumentException("Increment operand overflow");
    return new IncrementValue(slot <= 255 && constant >= -128 && constant <= 127 ? Opcode.IINC : Opcode.IINC_W,
      slot, constant);
  }
  public static ConvertInstruction convert(Opcode opcode) {
    Objects.requireNonNull(opcode);
    if (opcode.kind() != Opcode.Kind.CONVERT) throw new IllegalArgumentException("Not a conversion opcode");
    return new ConvertValue(opcode, conversionKind(opcode.name().charAt(0)), conversionKind(opcode.name().charAt(2)));
  }
  public static ConvertInstruction convert(TypeKind from, TypeKind to) {
    Objects.requireNonNull(from); Objects.requireNonNull(to);
    for (Opcode opcode : Opcode.values()) if (opcode.kind() == Opcode.Kind.CONVERT &&
        conversionKind(opcode.name().charAt(0)) == from && conversionKind(opcode.name().charAt(2)) == to)
      return convert(opcode);
    throw new IllegalArgumentException("Invalid primitive conversion");
  }
  private static TypeKind conversionKind(char descriptor) {
    return descriptor == 'L' ? TypeKind.LONG : TypeKind.fromDescriptor(String.valueOf(descriptor));
  }
  public static BranchInstruction branch(Opcode opcode, Label target) {
    Objects.requireNonNull(opcode); Objects.requireNonNull(target);
    if (opcode.kind() != Opcode.Kind.BRANCH) throw new IllegalArgumentException("Not a branch opcode");
    return new BranchValue(opcode, target);
  }
  public static LabelTarget labelTarget(Label label) { return new LabelTargetValue(Objects.requireNonNull(label)); }
  public static SwitchCase switchCase(int value, Label target) { return new SwitchCaseValue(value, Objects.requireNonNull(target)); }
  public static TableSwitchInstruction tableSwitch(int low, int high, Label defaultTarget, List<SwitchCase> cases) {
    return new TableSwitchValue(low, high, Objects.requireNonNull(defaultTarget), cases, -1);
  }
  public static LookupSwitchInstruction lookupSwitch(Label defaultTarget, List<SwitchCase> cases) {
    return new LookupSwitchValue(Objects.requireNonNull(defaultTarget), cases, -1);
  }
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
    return DoppioDebugInstructions.lineNumber(line);
  }
  public static ExceptionCatch exceptionCatch(Label handler, Label start, Label end, Optional<ClassEntry> catchType) {
    return new CatchValue(Objects.requireNonNull(handler), Objects.requireNonNull(start),
      Objects.requireNonNull(end), Objects.requireNonNull(catchType));
  }

  private static List<CodeElement> instructions(CodeValue code) {
    byte[] bytes = code.code;
    List<CodeElement> elements = new ArrayList<CodeElement>();
    for (ExceptionCatch handler : code.handlers) elements.add(handler);
    int[] lines = code.lineNumbers == ClassFile.LineNumbersOption.PASS_LINE_NUMBERS ? new int[bytes.length + 1] : null;
    for (Attribute<?> attribute : code.attributes) {
      if (lines != null && attribute instanceof LineNumberTableAttribute) {
        for (LineNumberInfo line : ((LineNumberTableAttribute) attribute).lineNumbers()) {
          if (line.startPc() < 0 || line.startPc() > bytes.length)
            throw new IllegalArgumentException("Line number start_pc out of range");
          lines[line.startPc()] = line.lineNumber();
        }
      }
      if (code.debugElements != ClassFile.DebugElementsOption.PASS_DEBUG) continue;
      if (attribute instanceof CharacterRangeTableAttribute) {
        for (CharacterRangeInfo range : ((CharacterRangeTableAttribute) attribute).characterRangeTable())
          elements.add(CharacterRange.of(code.debugLabel(range.startPc()), code.debugLabel(range.endPc() + 1),
              range.characterRangeStart(), range.characterRangeEnd(), range.flags()));
      } else if (attribute instanceof LocalVariableTableAttribute) {
        for (LocalVariableInfo local : ((LocalVariableTableAttribute) attribute).localVariables())
          elements.add(LocalVariable.of(local.slot(), local.name(), local.type(), code.debugLabel(local.startPc()),
              code.debugLabel(local.startPc() + local.length())));
      } else if (attribute instanceof LocalVariableTypeTableAttribute) {
        for (LocalVariableTypeInfo local : ((LocalVariableTypeTableAttribute) attribute).localVariableTypes())
          elements.add(LocalVariableType.of(local.slot(), local.name(), local.signature(), code.debugLabel(local.startPc()),
              code.debugLabel(local.startPc() + local.length())));
      }
    }
    for (Attribute<?> attribute : code.attributes) if (attribute instanceof CodeElement &&
        (code.debugElements == ClassFile.DebugElementsOption.PASS_DEBUG ||
            !DoppioTypeAnnotationAttributes.isTypeAnnotationAttribute(attribute)) &&
        !"LineNumberTable".equals(attribute.attributeName().stringValue()) &&
        !"LocalVariableTable".equals(attribute.attributeName().stringValue()) &&
        !"LocalVariableTypeTable".equals(attribute.attributeName().stringValue()) &&
        !"StackMapTable".equals(attribute.attributeName().stringValue())) elements.add((CodeElement) attribute);
    int cursor = 0;
    while (cursor < bytes.length) {
      if (code.labels[cursor] != null) elements.add(labelTarget(code.labels[cursor]));
      if (lines != null && lines[cursor] != 0) elements.add(lineNumber(lines[cursor]));
      int start = cursor, bytecode = bytes[cursor++] & 255;
      Opcode opcode;
      if (bytecode == 196) {
        require(bytes, cursor, 3);
        bytecode = 196 << 8 | bytes[cursor++] & 255;
      }
      opcode = opcode(bytecode);
      int size = code.sizes[start];
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
        case THROW_EXCEPTION: instruction = throwInstruction(); break;
        case NEW_OBJECT: instruction = newObject(code.pool.entryByIndex(u2(bytes, cursor), ClassEntry.class)); break;
        case ARRAY_LOAD: instruction = ArrayLoadInstruction.of(opcode); break;
        case ARRAY_STORE: instruction = ArrayStoreInstruction.of(opcode); break;
        case NEW_PRIMITIVE_ARRAY:
          instruction = NewPrimitiveArrayInstruction.of(TypeKind.fromNewarrayCode(bytes[cursor] & 255)); break;
        case NEW_REF_ARRAY:
          instruction = NewReferenceArrayInstruction.of(code.pool.entryByIndex(u2(bytes, cursor), ClassEntry.class)); break;
        case NEW_MULTI_ARRAY:
          instruction = NewMultiArrayInstruction.of(code.pool.entryByIndex(u2(bytes, cursor), ClassEntry.class),
              bytes[cursor + 2] & 255); break;
        case TYPE_CHECK:
          instruction = TypeCheckInstruction.of(opcode, code.pool.entryByIndex(u2(bytes, cursor), ClassEntry.class)); break;
        case MONITOR: instruction = MonitorInstruction.of(opcode); break;
        case INCREMENT:
          instruction = new IncrementValue(opcode, opcode.isWide() ? u2(bytes, cursor) : bytes[cursor] & 255,
            opcode.isWide() ? (short) u2(bytes, cursor + 2) : bytes[cursor + 1]); break;
        case CONVERT: instruction = convert(opcode); break;
        case BRANCH:
          instruction = branch(opcode, code.checkedLabel(branchTarget(bytes, start, opcode), false)); break;
        case TABLE_SWITCH: {
          int operands = switchOperands(bytes, start), low = i4(bytes, operands + 4), high = i4(bytes, operands + 8);
          Label defaultTarget = code.checkedLabel(relativeTarget(start, i4(bytes, operands)), false);
          List<SwitchCase> cases = new ArrayList<SwitchCase>();
          int count = high - low + 1;
          for (int index = 0; index < count; index++) {
            Label target = code.checkedLabel(relativeTarget(start, i4(bytes, operands + 12 + index * 4)), false);
            if (target != defaultTarget) cases.add(switchCase(low + index, target));
          }
          instruction = new TableSwitchValue(low, high, defaultTarget, cases, size); break;
        }
        case LOOKUP_SWITCH: {
          int operands = switchOperands(bytes, start), count = i4(bytes, operands + 4);
          Label defaultTarget = code.checkedLabel(relativeTarget(start, i4(bytes, operands)), false);
          List<SwitchCase> cases = new ArrayList<SwitchCase>();
          for (int index = 0; index < count; index++) cases.add(switchCase(i4(bytes, operands + 8 + index * 8),
            code.checkedLabel(relativeTarget(start, i4(bytes, operands + 12 + index * 8)), false)));
          instruction = new LookupSwitchValue(defaultTarget, cases, size); break;
        }
        case FIELD_ACCESS: instruction = field(opcode, code.pool.entryByIndex(u2(bytes, cursor), FieldRefEntry.class)); break;
        case INVOKE: {
          instruction = invoke(opcode, code.pool.entryByIndex(u2(bytes, cursor), MemberRefEntry.class));
          if (opcode == Opcode.INVOKEINTERFACE && ((bytes[cursor + 2] & 255) != ((InvokeInstruction) instruction).count() || bytes[cursor + 3] != 0))
            throw new IllegalArgumentException("Invalid invokeinterface operands");
          break;
        }
        case INVOKE_DYNAMIC: {
          if (bytes[cursor + 2] != 0 || bytes[cursor + 3] != 0)
            throw new IllegalArgumentException("Invalid invokedynamic zero operands");
          instruction = InvokeDynamicInstruction.of(code.pool.entryByIndex(u2(bytes, cursor), InvokeDynamicEntry.class));
          break;
        }
        default: throw new IllegalArgumentException("Instruction modeling is outside the selected pipeline: " + opcode);
      }
      elements.add(instruction);
      cursor = start + size;
    }
    if (code.labels[bytes.length] != null) elements.add(labelTarget(code.labels[bytes.length]));
    if (lines != null && lines[bytes.length] != 0) elements.add(lineNumber(lines[bytes.length]));
    return immutable(elements);
  }

  private static int[] instructionSizes(byte[] bytes) {
    int[] sizes = new int[bytes.length];
    for (int start = 0; start < bytes.length;) {
      int bytecode = bytes[start] & 255;
      if (bytecode == 196) {
        require(bytes, start, 2);
        bytecode = 196 << 8 | bytes[start + 1] & 255;
      }
      Opcode opcode = opcode(bytecode);
      int size = opcode.sizeIfFixed();
      if (opcode == Opcode.TABLESWITCH) {
        int operands = switchOperands(bytes, start);
        require(bytes, operands, 12);
        int low = i4(bytes, operands + 4), high = i4(bytes, operands + 8);
        long count = (long) high - low + 1;
        if (count <= 0 || count > (bytes.length - operands - 12) / 4)
          throw new IllegalArgumentException("Invalid tableswitch range");
        size = operands - start + 12 + (int) count * 4;
      } else if (opcode == Opcode.LOOKUPSWITCH) {
        int operands = switchOperands(bytes, start);
        require(bytes, operands, 8);
        int count = i4(bytes, operands + 4);
        if (count < 0 || count > (bytes.length - operands - 8) / 8)
          throw new IllegalArgumentException("Invalid lookupswitch pair count");
        for (int index = 1; index < count; index++) if (i4(bytes, operands + 8 + (index - 1) * 8) >=
            i4(bytes, operands + 8 + index * 8)) throw new IllegalArgumentException("Unsorted lookupswitch keys");
        size = operands - start + 8 + count * 8;
      }
      if (size <= 0) throw new IllegalArgumentException("Unsupported instruction framing");
      require(bytes, start, size);
      sizes[start] = size;
      start += size;
    }
    return sizes;
  }
  private static int switchOperands(byte[] bytes, int start) {
    int operands = (start + 4) & ~3;
    require(bytes, start + 1, operands - start - 1);
    for (int at = start + 1; at < operands; at++) if (bytes[at] != 0)
      throw new IllegalArgumentException("Nonzero switch padding");
    return operands;
  }
  private static int branchTarget(byte[] bytes, int start, Opcode opcode) {
    return relativeTarget(start, opcode == Opcode.GOTO_W ? i4(bytes, start + 1) : (short) u2(bytes, start + 1));
  }
  private static int relativeTarget(int start, int offset) {
    long target = (long) start + offset;
    if (target < 0 || target > Integer.MAX_VALUE) throw new IllegalArgumentException("Invalid relative branch offset");
    return (int) target;
  }

  private static <T> List<T> immutable(List<T> values) { return Collections.unmodifiableList(new ArrayList<T>(values)); }
  private static <T> List<T> nonNullImmutable(List<T> values) {
    List<T> retained = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : retained) Objects.requireNonNull(value);
    return Collections.unmodifiableList(retained);
  }
  private static void require(byte[] bytes, int cursor, int length) {
    if (cursor < 0 || length < 0 || cursor > bytes.length || length > bytes.length - cursor)
      throw new IllegalArgumentException("Truncated class-file data");
  }
  private static int u2(byte[] bytes, int cursor) {
    require(bytes, cursor, 2); return (bytes[cursor] & 255) << 8 | bytes[cursor + 1] & 255;
  }
  private static int i4(byte[] bytes, int cursor) {
    require(bytes, cursor, 4);
    return (bytes[cursor] & 255) << 24 | (bytes[cursor + 1] & 255) << 16 |
      (bytes[cursor + 2] & 255) << 8 | bytes[cursor + 3] & 255;
  }

  private static final class Cursor {
    final Input input;
    final int end;
    int at;
    Cursor(Input input, int at) { this(input, at, input.bytes.length); }
    Cursor(Input input, int at, int end) {
      this.input = input; this.at = at; this.end = end;
      require(input.bytes, at, end - at);
    }
    void check(int length) {
      if (length < 0 || at < 0 || at > end || length > end - at)
        throw new IllegalArgumentException("Truncated attribute data");
    }
    int u2() { check(2); int value = input.readU2(at); at += 2; return value; }
    void skip(int length) { check(length); at += length; }
    int length() {
      check(4);
      int value = input.readInt(at); at += 4;
      if (value < 0) throw new IllegalArgumentException("Attribute/Code length exceeds Java array bounds");
      return value;
    }
    byte[] bytes(int length) { check(length); byte[] value = input.readBytes(at, length); at += length; return value; }
  }
  private static final class PayloadCursor {
    final byte[] bytes;
    int at;
    PayloadCursor(byte[] bytes) { this.bytes = bytes; }
    int u1() { require(bytes, at, 1); return bytes[at++] & 255; }
    int u2() { int value = DoppioClassReader.u2(bytes, at); at += 2; return value; }
  }
  private static final class Input implements ClassReader {
    final byte[] bytes;
    final Function<Utf8Entry, AttributeMapper<?>> customAttributes;
    final ClassFile.DebugElementsOption debugElements;
    final ClassFile.LineNumbersOption lineNumbers;
    DoppioConstantPool pool;
    ClassValue model;
    Input(byte[] bytes, Function<Utf8Entry, AttributeMapper<?>> customAttributes,
        ClassFile.DebugElementsOption debugElements, ClassFile.LineNumbersOption lineNumbers) {
      this.bytes = bytes; this.customAttributes = customAttributes;
      this.debugElements = debugElements; this.lineNumbers = lineNumbers;
    }
    public Function<Utf8Entry, AttributeMapper<?>> customAttributes() { return customAttributes; }
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
  public static ConstantPool readerPool(ClassReader reader) {
    return reader instanceof Input ? ((Input) reader).pool : reader;
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
        public AttributeStability stability() { return DoppioAttributes.opaqueStability(name()); }
        public boolean allowMultiple() { return DoppioAttributes.opaqueAllowMultiple(name()); }
        public UnknownAttribute readAttribute(AttributedElement owner, ClassReader reader, int at) {
          return new RawAttribute(reader.readEntry(at - 6, Utf8Entry.class), reader, reader.readBytes(at, reader.readInt(at - 4)));
        }
        public void writeAttribute(BufWriter writer, UnknownAttribute attribute) {
          if (attribute instanceof RawAttribute && !writer.canWriteDirect(sourcePool(attribute)) &&
              stability() != AttributeStability.STATELESS)
            throw new UnsupportedOperationException("Opaque attribute cannot be safely remapped to a fresh pool");
          byte[] payload = attribute.contents();
          writer.writeIndex(attribute.attributeName()); writer.writeInt(payload.length); writer.writeBytes(payload);
        }
      };
    }
    public Utf8Entry attributeName() { return name; }
    public AttributeMapper<UnknownAttribute> attributeMapper() { return mapper; }
    public byte[] contents() { return payload.clone(); }
  }
  private static final class StackMapValue implements StackMapTableAttribute {
    final Utf8Entry name;
    final ConstantPool pool;
    final List<StackMapFrameInfo> entries;
    final byte[] payload;
    StackMapValue(Utf8Entry name, ConstantPool pool, List<StackMapFrameInfo> entries, byte[] payload) {
      this.name = name; this.pool = pool; this.entries = nonNullImmutable(entries);
      this.payload = payload == null ? null : payload.clone();
    }
    public Utf8Entry attributeName() { return name; }
    public AttributeMapper<StackMapTableAttribute> attributeMapper() { return STACK_MAP_MAPPER; }
    public List<StackMapFrameInfo> entries() { return entries; }
  }
  private static final class FrameValue implements StackMapFrameInfo {
    final int type;
    final Label target;
    final List<VerificationTypeInfo> locals, stack;
    FrameValue(int type, Label target, List<VerificationTypeInfo> locals, List<VerificationTypeInfo> stack) {
      this.type = type; this.target = Objects.requireNonNull(target);
      this.locals = nonNullImmutable(locals); this.stack = nonNullImmutable(stack);
    }
    public int frameType() { return type; }
    public Label target() { return target; }
    public List<VerificationTypeInfo> locals() { return locals; }
    public List<VerificationTypeInfo> stack() { return stack; }
  }
  private static final class ObjectTypeValue implements ObjectVerificationTypeInfo {
    final ClassEntry className;
    ObjectTypeValue(ClassEntry className) { this.className = className; }
    public int tag() { return ITEM_OBJECT; }
    public ClassEntry className() { return className; }
    public boolean equals(Object value) {
      return value instanceof ObjectTypeValue && className.equals(((ObjectTypeValue) value).className);
    }
    public int hashCode() { return className.hashCode(); }
  }
  private static final class UninitializedTypeValue implements UninitializedVerificationTypeInfo {
    final Label target;
    UninitializedTypeValue(Label target) { this.target = target; }
    public int tag() { return ITEM_UNINITIALIZED; }
    public Label newTarget() { return target; }
    public boolean equals(Object value) {
      return value instanceof UninitializedTypeValue && target.equals(((UninitializedTypeValue) value).target);
    }
    public int hashCode() { return target.hashCode(); }
  }
  private static final class CodeValue implements CodeAttribute {
    final MethodModel parent;
    final DoppioConstantPool pool;
    final Utf8Entry name;
    final int stack, locals;
    final byte[] code, payload;
    final BoundLabel[] labels;
    final int[] sizes;
    final ClassFile.DebugElementsOption debugElements;
    final ClassFile.LineNumbersOption lineNumbers;
    List<ExceptionCatch> handlers = Collections.emptyList();
    List<Attribute<?>> attributes = Collections.emptyList();
    List<CodeElement> elements;
    CodeValue(MethodModel parent, DoppioConstantPool pool, Utf8Entry name, int stack, int locals, byte[] code, byte[] payload,
        ClassFile.DebugElementsOption debugElements, ClassFile.LineNumbersOption lineNumbers) {
      this.parent = parent; this.pool = pool; this.name = name; this.stack = stack; this.locals = locals;
      this.code = code.clone(); this.payload = payload.clone();
      this.labels = new BoundLabel[code.length + 1];
      this.sizes = instructionSizes(this.code);
      this.debugElements = debugElements; this.lineNumbers = lineNumbers;
      discoverLabels();
    }
    BoundLabel label(int offset) {
      if (labels[offset] == null) labels[offset] = new BoundLabel(this, offset);
      return labels[offset];
    }
    BoundLabel debugLabel(int offset) {
      if (offset < 0 || offset > code.length) throw new IllegalArgumentException("Debug label offset out of range");
      return label(offset);
    }
    BoundLabel checkedLabel(int offset, boolean allowEnd) {
      if (offset < 0 || offset > code.length || offset == code.length && !allowEnd ||
          offset < code.length && sizes[offset] == 0)
        throw new IllegalArgumentException("Label is not at a valid instruction boundary");
      return label(offset);
    }
    void discoverLabels() {
      for (int start = 0; start < code.length; start += sizes[start]) {
        int bytecode = code[start] & 255;
        if (bytecode == 196) bytecode = 196 << 8 | code[start + 1] & 255;
        Opcode opcode = DoppioClassReader.opcode(bytecode);
        if (opcode.kind() == Opcode.Kind.BRANCH) checkedLabel(branchTarget(code, start, opcode), false);
        else if (opcode == Opcode.TABLESWITCH || opcode == Opcode.LOOKUPSWITCH) {
          int operands = switchOperands(code, start);
          checkedLabel(relativeTarget(start, i4(code, operands)), false);
          if (opcode == Opcode.TABLESWITCH) {
            int count = i4(code, operands + 8) - i4(code, operands + 4) + 1;
            for (int index = 0; index < count; index++)
              checkedLabel(relativeTarget(start, i4(code, operands + 12 + index * 4)), false);
          } else {
            int count = i4(code, operands + 4);
            for (int index = 0; index < count; index++)
              checkedLabel(relativeTarget(start, i4(code, operands + 12 + index * 8)), false);
          }
        }
      }
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
  private static class InstructionValue implements Instruction {
    final Opcode opcode;
    InstructionValue(Opcode opcode) { this.opcode = opcode; }
    public Opcode opcode() { return opcode; }
    public int sizeInBytes() { return opcode.sizeIfFixed(); }
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
  private static final class ThrowValue extends InstructionValue implements ThrowInstruction {
    ThrowValue() { super(Opcode.ATHROW); }
  }
  private static final class NewObjectValue extends InstructionValue implements NewObjectInstruction {
    final ClassEntry className;
    NewObjectValue(ClassEntry className) { super(Opcode.NEW); this.className = className; }
    public ClassEntry className() { return className; }
  }
  private static final class IncrementValue extends InstructionValue implements IncrementInstruction {
    final int slot, constant;
    IncrementValue(Opcode opcode, int slot, int constant) { super(opcode); this.slot = slot; this.constant = constant; }
    public int slot() { return slot; }
    public int constant() { return constant; }
  }
  private static final class ConvertValue extends InstructionValue implements ConvertInstruction {
    final TypeKind from, to;
    ConvertValue(Opcode opcode, TypeKind from, TypeKind to) { super(opcode); this.from = from; this.to = to; }
    public TypeKind fromType() { return from; }
    public TypeKind toType() { return to; }
  }
  private static final class BranchValue extends InstructionValue implements BranchInstruction {
    final Label target;
    BranchValue(Opcode opcode, Label target) { super(opcode); this.target = target; }
    public Label target() { return target; }
  }
  private static final class LabelTargetValue implements LabelTarget {
    final Label label;
    LabelTargetValue(Label label) { this.label = label; }
    public Label label() { return label; }
  }
  private static final class SwitchCaseValue implements SwitchCase {
    final int value;
    final Label target;
    SwitchCaseValue(int value, Label target) { this.value = value; this.target = target; }
    public int caseValue() { return value; }
    public Label target() { return target; }
  }
  private static final class TableSwitchValue extends InstructionValue implements TableSwitchInstruction {
    final int low, high, size;
    final Label defaultTarget;
    final List<SwitchCase> cases;
    TableSwitchValue(int low, int high, Label defaultTarget, List<SwitchCase> cases, int size) {
      super(Opcode.TABLESWITCH); this.low = low; this.high = high; this.defaultTarget = defaultTarget;
      this.cases = nonNullImmutable(cases); this.size = size;
    }
    public int lowValue() { return low; }
    public int highValue() { return high; }
    public Label defaultTarget() { return defaultTarget; }
    public List<SwitchCase> cases() { return cases; }
    public int sizeInBytes() { return size; }
  }
  private static final class LookupSwitchValue extends InstructionValue implements LookupSwitchInstruction {
    final int size;
    final Label defaultTarget;
    final List<SwitchCase> cases;
    LookupSwitchValue(Label defaultTarget, List<SwitchCase> cases, int size) {
      super(Opcode.LOOKUPSWITCH); this.defaultTarget = defaultTarget; this.cases = nonNullImmutable(cases); this.size = size;
    }
    public Label defaultTarget() { return defaultTarget; }
    public List<SwitchCase> cases() { return cases; }
    public int sizeInBytes() { return size; }
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
