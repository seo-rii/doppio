package java.lang.classfile;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.attribute.SourceFileAttribute;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.classfile.instruction.ExceptionCatch;
import java.lang.classfile.instruction.FieldInstruction;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.classfile.instruction.LoadInstruction;
import java.lang.classfile.instruction.OperatorInstruction;
import java.lang.classfile.instruction.ReturnInstruction;
import java.lang.classfile.instruction.StackInstruction;
import java.lang.classfile.instruction.StoreInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.AccessFlag;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Consumer;

/** Internal real element sinks and straight-line class-file serialization. */
final class DoppioBuilders {
  private DoppioBuilders() {}

  static int flags(AccessFlag[] flags, AccessFlag.Location location) {
    Objects.requireNonNull(flags); Objects.requireNonNull(location);
    int result = 0;
    for (AccessFlag flag : flags) {
      Objects.requireNonNull(flag);
      if (!flag.locations().contains(location)) throw new IllegalArgumentException("Flag is inapplicable to builder location");
      result |= flag.mask();
    }
    return result;
  }

  static ConstantInstruction intrinsic(Opcode opcode) { return DoppioClassReader.intrinsic(opcode); }
  static ConstantInstruction argument(Opcode opcode, int value) { return DoppioClassReader.argument(opcode, value); }

  static ConstantInstruction constant(ConstantPoolBuilder pool, Object value) {
    Objects.requireNonNull(pool); Objects.requireNonNull(value);
    if (value instanceof Integer) {
      int number = ((Integer) value).intValue();
      Opcode[] small = {Opcode.ICONST_M1, Opcode.ICONST_0, Opcode.ICONST_1, Opcode.ICONST_2,
        Opcode.ICONST_3, Opcode.ICONST_4, Opcode.ICONST_5};
      if (number >= -1 && number <= 5) return intrinsic(small[number + 1]);
      if (number >= -128 && number <= 127) return argument(Opcode.BIPUSH, number);
      if (number >= -32768 && number <= 32767) return argument(Opcode.SIPUSH, number);
    } else if (value instanceof Long) {
      long number = ((Long) value).longValue();
      if (number == 0 || number == 1) return intrinsic(number == 0 ? Opcode.LCONST_0 : Opcode.LCONST_1);
    } else if (value instanceof Float) {
      int bits = Float.floatToRawIntBits(((Float) value).floatValue());
      if (bits == Float.floatToRawIntBits(0.0f)) return intrinsic(Opcode.FCONST_0);
      if (bits == Float.floatToRawIntBits(1.0f)) return intrinsic(Opcode.FCONST_1);
      if (bits == Float.floatToRawIntBits(2.0f)) return intrinsic(Opcode.FCONST_2);
    } else if (value instanceof Double) {
      long bits = Double.doubleToRawLongBits(((Double) value).doubleValue());
      if (bits == Double.doubleToRawLongBits(0.0)) return intrinsic(Opcode.DCONST_0);
      if (bits == Double.doubleToRawLongBits(1.0)) return intrinsic(Opcode.DCONST_1);
    }
    LoadableConstantEntry entry = pool.loadableConstantEntry((ConstantDesc) value);
    Opcode opcode = entry.tag() == 5 || entry.tag() == 6 ? Opcode.LDC2_W : entry.index() <= 255 ? Opcode.LDC : Opcode.LDC_W;
    return ConstantInstruction.ofLoad(opcode, entry);
  }

  static byte[] build(ClassEntry name, DoppioConstantPool pool, Consumer<? super ClassBuilder> handler,
      ClassFile.StackMapsOption stackMaps) {
    ClassSink builder = new ClassSink(name, pool, stackMaps);
    handler.accept(builder);
    return builder.bytes();
  }

  static byte[] transform(ClassModel model, ClassEntry name, DoppioConstantPool pool, ClassTransform transform,
      ClassFile.StackMapsOption stackMaps) {
    ClassSink builder = new ClassSink(name, pool, stackMaps);
    builder.transform(model, transform);
    return builder.bytes();
  }

  private interface Context {
    DoppioConstantPool pool();
    ClassFile.StackMapsOption stackMaps();
  }
  private interface MethodContext extends Context {
    Utf8Entry descriptor();
    int methodFlags();
  }

  private static Context context(Object builder) {
    if (!(builder instanceof Context)) throw new IllegalArgumentException("Unsupported foreign builder context");
    return (Context) builder;
  }
  private static MethodContext methodContext(Object builder) {
    if (!(builder instanceof MethodContext)) throw new IllegalArgumentException("Missing method descriptor context");
    return (MethodContext) builder;
  }

  static ClassBuilder forward(ClassBuilder target, ClassTransform transform) {
    Objects.requireNonNull(target); Objects.requireNonNull(transform);
    return new ForwardClass(target, transform);
  }
  static MethodBuilder forward(MethodBuilder target, MethodTransform transform) {
    Objects.requireNonNull(target); Objects.requireNonNull(transform);
    return new ForwardMethod(target, transform);
  }
  static FieldBuilder forward(FieldBuilder target, FieldTransform transform) {
    Objects.requireNonNull(target); Objects.requireNonNull(transform);
    return new ForwardField(target, transform);
  }
  static CodeBuilder forward(CodeBuilder target, CodeTransform transform) {
    Objects.requireNonNull(target); Objects.requireNonNull(transform);
    return new ForwardCode(target, transform);
  }

  private static final class ForwardClass implements ClassBuilder, Context {
    final ClassBuilder target;
    final ClassTransform transform;
    final Context context;
    ForwardClass(ClassBuilder target, ClassTransform transform) {
      this.target = target; this.transform = transform; this.context = context(target);
    }
    public DoppioConstantPool pool() { return context.pool(); }
    public ClassFile.StackMapsOption stackMaps() { return context.stackMaps(); }
    public ConstantPoolBuilder constantPool() { return pool(); }
    public ClassBuilder with(ClassElement element) { transform.accept(target, Objects.requireNonNull(element)); return this; }
    public ClassBuilder withField(Utf8Entry name, Utf8Entry type, Consumer<? super FieldBuilder> handler) {
      FieldSink field = new FieldSink(pool(), stackMaps(), name, type);
      Objects.requireNonNull(handler).accept(field);
      return with(field.value());
    }
    public ClassBuilder withMethod(Utf8Entry name, Utf8Entry type, int flags, Consumer<? super MethodBuilder> handler) {
      MethodSink method = new MethodSink(pool(), stackMaps(), name, type, flags);
      Objects.requireNonNull(handler).accept(method);
      return with(method.value());
    }
    public ClassBuilder transformField(FieldModel model, FieldTransform transform) {
      Objects.requireNonNull(model);
      FieldSink field = new FieldSink(pool(), stackMaps(), model.fieldName(), model.fieldType());
      field.transform(model, Objects.requireNonNull(transform));
      return with(field.value());
    }
    public ClassBuilder transformMethod(MethodModel model, MethodTransform transform) {
      Objects.requireNonNull(model);
      MethodSink method = new MethodSink(pool(), stackMaps(), model.methodName(), model.methodType(), model.flags().flagsMask());
      method.transform(model, Objects.requireNonNull(transform));
      return with(method.value());
    }
  }

  private static final class ForwardField implements FieldBuilder, Context {
    final FieldBuilder target;
    final FieldTransform transform;
    final Context context;
    ForwardField(FieldBuilder target, FieldTransform transform) {
      this.target = target; this.transform = transform; this.context = context(target);
    }
    public DoppioConstantPool pool() { return context.pool(); }
    public ClassFile.StackMapsOption stackMaps() { return context.stackMaps(); }
    public ConstantPoolBuilder constantPool() { return pool(); }
    public FieldBuilder with(FieldElement element) { transform.accept(target, Objects.requireNonNull(element)); return this; }
  }

  private static final class ForwardMethod implements MethodBuilder, MethodContext {
    final MethodBuilder target;
    final MethodTransform transform;
    final MethodContext context;
    ForwardMethod(MethodBuilder target, MethodTransform transform) {
      this.target = target; this.transform = transform; this.context = methodContext(target);
    }
    public DoppioConstantPool pool() { return context.pool(); }
    public ClassFile.StackMapsOption stackMaps() { return context.stackMaps(); }
    public Utf8Entry descriptor() { return context.descriptor(); }
    public int methodFlags() { return context.methodFlags(); }
    public ConstantPoolBuilder constantPool() { return pool(); }
    public MethodBuilder with(MethodElement element) { transform.accept(target, Objects.requireNonNull(element)); return this; }
    public MethodBuilder withCode(Consumer<? super CodeBuilder> handler) {
      CodeSink code = new CodeSink(pool(), stackMaps(), descriptor(), methodFlags());
      Objects.requireNonNull(handler).accept(code);
      return with(code.value());
    }
    public MethodBuilder transformCode(CodeModel model, CodeTransform transform) {
      CodeSink code = new CodeSink(pool(), stackMaps(), descriptor(), methodFlags());
      requireStraightLine(Objects.requireNonNull(model));
      code.transform(model, Objects.requireNonNull(transform));
      return with(code.value());
    }
  }

  private static final class ForwardCode implements CodeBuilder {
    final CodeBuilder target;
    final CodeTransform transform;
    ForwardCode(CodeBuilder target, CodeTransform transform) { this.target = target; this.transform = transform; }
    public ConstantPoolBuilder constantPool() { return target.constantPool(); }
    public CodeBuilder with(CodeElement element) { transform.accept(target, Objects.requireNonNull(element)); return this; }
    public Label newLabel() { return target.newLabel(); }
    public Label startLabel() { return target.startLabel(); }
    public Label endLabel() { return target.endLabel(); }
    public int receiverSlot() { return target.receiverSlot(); }
    public int parameterSlot(int parameter) { return target.parameterSlot(parameter); }
    public int allocateLocal(TypeKind kind) { return target.allocateLocal(kind); }
  }

  private static final class ClassSink implements ClassBuilder, Context {
    final DoppioConstantPool pool;
    final ClassFile.StackMapsOption stackMaps;
    final ClassEntry name;
    int flags = ClassFile.ACC_SUPER;
    int major = 69, minor = 0;
    ClassEntry superclass;
    List<ClassEntry> interfaces = Collections.emptyList();
    final List<FieldModel> fields = new ArrayList<FieldModel>();
    final List<MethodModel> methods = new ArrayList<MethodModel>();
    final List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    ClassSink(ClassEntry name, DoppioConstantPool pool, ClassFile.StackMapsOption stackMaps) {
      this.pool = Objects.requireNonNull(pool); this.stackMaps = Objects.requireNonNull(stackMaps);
      this.name = pool.classEntry(pool.utf8Entry(Objects.requireNonNull(name).name().stringValue()));
      this.superclass = pool.classEntry(ClassDesc.of("java.lang.Object"));
    }
    public DoppioConstantPool pool() { return pool; }
    public ClassFile.StackMapsOption stackMaps() { return stackMaps; }
    public ConstantPoolBuilder constantPool() { return pool; }
    public ClassBuilder with(ClassElement element) {
      Objects.requireNonNull(element);
      if (element instanceof AccessFlags) flags = ((AccessFlags) element).flagsMask();
      else if (element instanceof ClassFileVersion) {
        major = ((ClassFileVersion) element).majorVersion(); minor = ((ClassFileVersion) element).minorVersion();
      } else if (element instanceof Superclass) superclass = ((Superclass) element).superclassEntry();
      else if (element instanceof Interfaces) interfaces = immutable(((Interfaces) element).interfaces());
      else if (element instanceof FieldModel) fields.add((FieldModel) element);
      else if (element instanceof MethodModel) methods.add((MethodModel) element);
      else if (element instanceof Attribute) addAttribute(attributes, (Attribute<?>) element);
      else throw new IllegalArgumentException("Unsupported class element");
      return this;
    }
    public ClassBuilder withField(Utf8Entry name, Utf8Entry type, Consumer<? super FieldBuilder> handler) {
      FieldSink field = new FieldSink(pool, stackMaps, name, type);
      Objects.requireNonNull(handler).accept(field);
      return with(field.value());
    }
    public ClassBuilder withMethod(Utf8Entry name, Utf8Entry type, int flags, Consumer<? super MethodBuilder> handler) {
      MethodSink method = new MethodSink(pool, stackMaps, name, type, flags);
      Objects.requireNonNull(handler).accept(method);
      return with(method.value());
    }
    public ClassBuilder transformField(FieldModel model, FieldTransform transform) {
      Objects.requireNonNull(model);
      FieldSink field = new FieldSink(pool, stackMaps, model.fieldName(), model.fieldType());
      field.transform(model, Objects.requireNonNull(transform)); return with(field.value());
    }
    public ClassBuilder transformMethod(MethodModel model, MethodTransform transform) {
      Objects.requireNonNull(model);
      MethodSink method = new MethodSink(pool, stackMaps, model.methodName(), model.methodType(), model.flags().flagsMask());
      method.transform(model, Objects.requireNonNull(transform)); return with(method.value());
    }
    byte[] bytes() {
      try {
        ByteArrayOutputStream body = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(body);
        u2(output, flags); u2(output, name.index());
        u2(output, superclass == null ? 0 : pool.classEntry(pool.utf8Entry(superclass.name().stringValue())).index());
        u2(output, interfaces.size());
        for (ClassEntry entry : interfaces) u2(output, pool.classEntry(pool.utf8Entry(entry.name().stringValue())).index());
        u2(output, fields.size());
        for (FieldModel field : fields) output.write(fieldBytes(pool, field));
        u2(output, methods.size());
        for (MethodModel method : methods) output.write(methodBytes(pool, method));
        writeAttributes(output, pool, attributes);
        output.flush();
        ByteArrayOutputStream result = new ByteArrayOutputStream(); DataOutputStream header = new DataOutputStream(result);
        header.writeInt(ClassFile.MAGIC_NUMBER); u2(header, minor); u2(header, major);
        header.write(pool.encode()); header.write(body.toByteArray()); header.flush();
        return result.toByteArray();
      } catch (IOException error) { throw new IllegalArgumentException("Class-file serialization failed", error); }
    }
  }

  private static final class FieldSink implements FieldBuilder, Context {
    final DoppioConstantPool pool;
    final ClassFile.StackMapsOption stackMaps;
    final Utf8Entry name, type;
    int flags;
    final List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    FieldSink(DoppioConstantPool pool, ClassFile.StackMapsOption stackMaps, Utf8Entry name, Utf8Entry type) {
      this.pool = pool; this.stackMaps = stackMaps;
      this.name = pool.utf8Entry(Objects.requireNonNull(name).stringValue());
      this.type = pool.utf8Entry(Objects.requireNonNull(type).stringValue());
    }
    public DoppioConstantPool pool() { return pool; }
    public ClassFile.StackMapsOption stackMaps() { return stackMaps; }
    public ConstantPoolBuilder constantPool() { return pool; }
    public FieldBuilder with(FieldElement element) {
      Objects.requireNonNull(element);
      if (element instanceof AccessFlags) flags = ((AccessFlags) element).flagsMask();
      else if (element instanceof Attribute) addAttribute(attributes, (Attribute<?>) element);
      else throw new IllegalArgumentException("Unsupported field element");
      return this;
    }
    FieldValue value() { return new FieldValue(pool, name, type, flags, attributes); }
  }

  private static final class FieldValue implements FieldModel {
    final DoppioConstantPool pool;
    final Utf8Entry name, type;
    final AccessFlags flags;
    final List<Attribute<?>> attributes;
    FieldValue(DoppioConstantPool pool, Utf8Entry name, Utf8Entry type, int flags, List<Attribute<?>> attributes) {
      this.pool = pool; this.name = name; this.type = type;
      this.flags = DoppioClassReader.flags(flags, AccessFlag.Location.FIELD); this.attributes = immutable(attributes);
    }
    public Utf8Entry fieldName() { return name; }
    public Utf8Entry fieldType() { return type; }
    public AccessFlags flags() { return flags; }
    public Optional<ClassModel> parent() { return Optional.empty(); }
    public List<Attribute<?>> attributes() { return attributes; }
    public void forEach(Consumer<? super FieldElement> consumer) {
      Objects.requireNonNull(consumer).accept(flags);
      for (Attribute<?> attribute : attributes) consumer.accept((FieldElement) attribute);
    }
  }

  private static final class MethodSink implements MethodBuilder, MethodContext {
    final DoppioConstantPool pool;
    final ClassFile.StackMapsOption stackMaps;
    final Utf8Entry name, type;
    final int staticFlags;
    int flags;
    CodeModel code;
    final List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    MethodSink(DoppioConstantPool pool, ClassFile.StackMapsOption stackMaps, Utf8Entry name, Utf8Entry type, int flags) {
      this.pool = pool; this.stackMaps = stackMaps;
      this.name = pool.utf8Entry(Objects.requireNonNull(name).stringValue());
      this.type = pool.utf8Entry(Objects.requireNonNull(type).stringValue());
      this.flags = flags; this.staticFlags = flags & ClassFile.ACC_STATIC;
    }
    public DoppioConstantPool pool() { return pool; }
    public ClassFile.StackMapsOption stackMaps() { return stackMaps; }
    public Utf8Entry descriptor() { return type; }
    public int methodFlags() { return flags; }
    public ConstantPoolBuilder constantPool() { return pool; }
    public MethodBuilder with(MethodElement element) {
      Objects.requireNonNull(element);
      if (element instanceof AccessFlags) {
        int replacement = ((AccessFlags) element).flagsMask();
        if ((replacement & ClassFile.ACC_STATIC) != staticFlags) throw new IllegalArgumentException("Method staticness cannot change");
        flags = replacement;
      } else if (element instanceof CodeModel) code = (CodeModel) element;
      else if (element instanceof Attribute) addAttribute(attributes, (Attribute<?>) element);
      else throw new IllegalArgumentException("Unsupported method element");
      return this;
    }
    public MethodBuilder withCode(Consumer<? super CodeBuilder> handler) {
      CodeSink sink = new CodeSink(pool, stackMaps, type, flags);
      Objects.requireNonNull(handler).accept(sink); return with(sink.value());
    }
    public MethodBuilder transformCode(CodeModel model, CodeTransform transform) {
      requireStraightLine(Objects.requireNonNull(model));
      CodeSink sink = new CodeSink(pool, stackMaps, type, flags);
      sink.transform(model, Objects.requireNonNull(transform)); return with(sink.value());
    }
    MethodValue value() { return new MethodValue(pool, name, type, flags, code, attributes); }
  }

  private static final class MethodValue implements MethodModel {
    final DoppioConstantPool pool;
    final Utf8Entry name, type;
    final AccessFlags flags;
    final CodeModel code;
    final List<Attribute<?>> attributes;
    MethodValue(DoppioConstantPool pool, Utf8Entry name, Utf8Entry type, int flags, CodeModel code, List<Attribute<?>> attributes) {
      this.pool = pool; this.name = name; this.type = type; this.code = code;
      this.flags = DoppioClassReader.flags(flags, AccessFlag.Location.METHOD);
      List<Attribute<?>> all = new ArrayList<Attribute<?>>(attributes);
      if (code != null) {
        if (!(code instanceof Attribute)) throw new IllegalArgumentException("Unsupported unbound Code model");
        all.add((Attribute<?>) code);
      }
      this.attributes = immutable(all);
    }
    public Utf8Entry methodName() { return name; }
    public Utf8Entry methodType() { return type; }
    public AccessFlags flags() { return flags; }
    public Optional<ClassModel> parent() { return Optional.empty(); }
    public Optional<CodeModel> code() { return Optional.ofNullable(code); }
    public List<Attribute<?>> attributes() { return attributes; }
    public void forEach(Consumer<? super MethodElement> consumer) {
      Objects.requireNonNull(consumer).accept(flags);
      for (Attribute<?> attribute : attributes) consumer.accept((MethodElement) attribute);
    }
  }

  private static final class OwnedLabel implements Label {}

  private static final class CodeSink implements CodeBuilder {
    final DoppioConstantPool pool;
    final ClassFile.StackMapsOption stackMaps;
    final Utf8Entry type;
    final int flags;
    final OwnedLabel start = new OwnedLabel(), end = new OwnedLabel();
    final List<CodeElement> elements = new ArrayList<CodeElement>();
    int nextLocal;
    CodeSink(DoppioConstantPool pool, ClassFile.StackMapsOption stackMaps, Utf8Entry type, int flags) {
      this.pool = pool; this.stackMaps = stackMaps; this.type = type; this.flags = flags;
      this.nextLocal = argumentSlots(type.stringValue()) + ((flags & ClassFile.ACC_STATIC) == 0 ? 1 : 0);
    }
    public ConstantPoolBuilder constantPool() { return pool; }
    public CodeBuilder with(CodeElement element) {
      Objects.requireNonNull(element);
      if (!(element instanceof Instruction)) throw new IllegalArgumentException("Offset-dependent Code element is unsupported");
      elements.add(element); return this;
    }
    public Label newLabel() { return new OwnedLabel(); }
    public Label startLabel() { return start; }
    public Label endLabel() { return end; }
    public int receiverSlot() {
      if ((flags & ClassFile.ACC_STATIC) != 0) throw new IllegalStateException("Static method has no receiver slot");
      return 0;
    }
    public int parameterSlot(int parameter) {
      MethodTypeDesc descriptor = MethodTypeDesc.ofDescriptor(type.stringValue());
      if (parameter < 0 || parameter >= descriptor.parameterCount()) throw new IllegalArgumentException("Invalid parameter index");
      int slot = (flags & ClassFile.ACC_STATIC) == 0 ? 1 : 0;
      for (int index = 0; index < parameter; index++) slot += fieldSlots(descriptor.parameterType(index).descriptorString());
      return slot;
    }
    public int allocateLocal(TypeKind kind) {
      Objects.requireNonNull(kind);
      if (kind == TypeKind.VOID) throw new IllegalArgumentException("Void has no local slot");
      int result = nextLocal;
      nextLocal += kind.slotSize();
      if (nextLocal > 65535) throw new IllegalArgumentException("Local-variable limit exceeded");
      return result;
    }
    CodeValue value() { return new CodeValue(pool, type, flags, elements, nextLocal, start, end); }
  }

  private static final class CodeValue implements CodeAttribute {
    final DoppioConstantPool pool;
    final Utf8Entry type;
    final int flags, allocatedLocals;
    final List<CodeElement> elements;
    final Label start, end;
    CodeValue(DoppioConstantPool pool, Utf8Entry type, int flags, List<CodeElement> elements, int allocatedLocals,
        Label start, Label end) {
      this.pool = pool; this.type = type; this.flags = flags; this.elements = immutable(elements);
      this.allocatedLocals = allocatedLocals; this.start = start; this.end = end;
    }
    public Utf8Entry attributeName() { return pool.utf8Entry("Code"); }
    public AttributeMapper<CodeAttribute> attributeMapper() { return Attributes.code(); }
    public Optional<MethodModel> parent() { return Optional.empty(); }
    public List<ExceptionCatch> exceptionHandlers() { return Collections.emptyList(); }
    public List<Attribute<?>> attributes() { return Collections.emptyList(); }
    public void forEach(Consumer<? super CodeElement> consumer) {
      Objects.requireNonNull(consumer); for (CodeElement element : elements) consumer.accept(element);
    }
    public int maxStack() { return encodeCode(this).maxStack; }
    public int maxLocals() { return encodeCode(this).maxLocals; }
    public byte[] codeArray() { return encodeCode(this).bytes; }
    public int codeLength() { return codeArray().length; }
    public int labelToBci(Label label) {
      Objects.requireNonNull(label);
      if (label == start) return 0;
      if (label == end) return codeLength();
      throw new IllegalArgumentException("Unbound label");
    }
  }

  private static <T> List<T> immutable(List<T> values) { return Collections.unmodifiableList(new ArrayList<T>(values)); }

  private static void addAttribute(List<Attribute<?>> attributes, Attribute<?> value) {
    Objects.requireNonNull(value);
    String name = value.attributeName().stringValue();
    for (int index = attributes.size() - 1; index >= 0; index--) {
      if (value instanceof SourceFileAttribute && attributes.get(index).attributeName().stringValue().equals(name)) attributes.remove(index);
    }
    attributes.add(value);
  }

  private static void requireStraightLine(CodeModel code) {
    if (!code.exceptionHandlers().isEmpty()) throw new IllegalArgumentException("Handler transformation is outside the selected pipeline");
    for (CodeElement element : code) {
      if (!(element instanceof Instruction)) throw new IllegalArgumentException("Offset-dependent Code transformation is unsupported");
      Instruction instruction = (Instruction) element;
      if (!(instruction instanceof ConstantInstruction || instruction instanceof LoadInstruction || instruction instanceof StoreInstruction ||
          instruction instanceof OperatorInstruction || instruction instanceof ReturnInstruction || instruction instanceof StackInstruction ||
          instruction instanceof FieldInstruction || instruction instanceof InvokeInstruction))
        throw new IllegalArgumentException("Control-flow or opaque instruction transformation is unsupported");
    }
  }

  private static void requireSharedPool(DoppioConstantPool destination, ConstantPool source) {
    if (!destination.canWriteDirect(Objects.requireNonNull(source)))
      throw new IllegalArgumentException("Opaque bound data cannot be remapped to another constant pool");
  }

  private static byte[] fieldBytes(DoppioConstantPool pool, FieldModel field) throws IOException {
    if (!(field instanceof FieldValue)) {
      requireSharedPool(pool, field.fieldName().constantPool());
      return DoppioClassReader.memberBytes(field);
    }
    FieldValue value = (FieldValue) field;
    requireSharedPool(pool, value.pool);
    ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(bytes);
    u2(output, value.flags.flagsMask()); u2(output, pool.utf8Entry(value.name.stringValue()).index());
    u2(output, pool.utf8Entry(value.type.stringValue()).index()); writeAttributes(output, pool, value.attributes);
    output.flush(); return bytes.toByteArray();
  }

  private static byte[] methodBytes(DoppioConstantPool pool, MethodModel method) throws IOException {
    if (!(method instanceof MethodValue)) {
      requireSharedPool(pool, method.methodName().constantPool());
      return DoppioClassReader.memberBytes(method);
    }
    MethodValue value = (MethodValue) method;
    requireSharedPool(pool, value.pool);
    if (value.code != null && !(value.code instanceof CodeValue)) {
      Optional<MethodModel> original = value.code.parent();
      if (!original.isPresent() || !original.get().methodType().stringValue().equals(value.type.stringValue()) ||
          ((original.get().flags().flagsMask() ^ value.flags.flagsMask()) & ClassFile.ACC_STATIC) != 0)
        throw new IllegalArgumentException("Bound Code cannot be copied into a different method descriptor/staticness");
    }
    ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(bytes);
    u2(output, value.flags.flagsMask()); u2(output, pool.utf8Entry(value.name.stringValue()).index());
    u2(output, pool.utf8Entry(value.type.stringValue()).index()); writeAttributes(output, pool, value.attributes);
    output.flush(); return bytes.toByteArray();
  }

  private static void writeAttributes(DataOutputStream output, DoppioConstantPool pool, List<Attribute<?>> attributes)
      throws IOException {
    u2(output, attributes.size());
    for (Attribute<?> attribute : attributes) {
      byte[] payload;
      if (attribute instanceof SourceFileAttribute) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream value = new DataOutputStream(bytes);
        u2(value, pool.utf8Entry(((SourceFileAttribute) attribute).sourceFile().stringValue()).index());
        value.flush(); payload = bytes.toByteArray();
      } else if (attribute instanceof CodeValue) {
        CodeValue code = (CodeValue) attribute;
        requireSharedPool(pool, code.pool);
        EncodedCode encoded = encodeCode(code);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream value = new DataOutputStream(bytes);
        u2(value, encoded.maxStack); u2(value, encoded.maxLocals);
        value.writeInt(encoded.bytes.length); value.write(encoded.bytes);
        u2(value, 0); // Regenerated selected Code has no exception table.
        u2(value, 0); // Never retain stale offset/frame/debug attributes after rewriting.
        value.flush(); payload = bytes.toByteArray();
      } else {
        requireSharedPool(pool, DoppioClassReader.sourcePool(attribute));
        payload = DoppioClassReader.attributePayload(attribute);
      }
      u2(output, pool.utf8Entry(attribute.attributeName().stringValue()).index());
      output.writeInt(payload.length); output.write(payload);
    }
  }

  private static void u2(DataOutputStream output, int value) throws IOException {
    if (value < 0 || value > 65535) throw new IllegalArgumentException("Unsigned-short class-file limit exceeded");
    output.writeShort(value);
  }

  private static int fieldSlots(String descriptor) {
    Objects.requireNonNull(descriptor);
    if (descriptor.length() == 0) throw new IllegalArgumentException("Missing type descriptor");
    char type = descriptor.charAt(0);
    if (type == 'V') return 0;
    if (type == 'J' || type == 'D') return 2;
    return 1;
  }

  private static int argumentSlots(String descriptor) {
    MethodTypeDesc type = MethodTypeDesc.ofDescriptor(descriptor);
    int slots = 0;
    for (int index = 0; index < type.parameterCount(); index++) slots += fieldSlots(type.parameterType(index).descriptorString());
    return slots;
  }

  private static int localFamily(TypeKind kind) {
    TypeKind loadable = Objects.requireNonNull(kind).asLoadable();
    if (loadable == TypeKind.INT) return 0;
    if (loadable == TypeKind.LONG) return 1;
    if (loadable == TypeKind.FLOAT) return 2;
    if (loadable == TypeKind.DOUBLE) return 3;
    if (loadable == TypeKind.REFERENCE) return 4;
    throw new IllegalArgumentException("Unsupported local-variable type");
  }

  private static int writeLocal(DataOutputStream output, TypeKind kind, int slot, boolean load) throws IOException {
    if (slot < 0 || slot > 65535) throw new IllegalArgumentException("Invalid local-variable slot");
    int family = localFamily(kind), generic = (load ? 0x15 : 0x36) + family;
    if (slot <= 3) output.writeByte((load ? 0x1a : 0x3b) + family * 4 + slot);
    else if (slot <= 255) { output.writeByte(generic); output.writeByte(slot); }
    else { output.writeByte(0xc4); output.writeByte(generic); u2(output, slot); }
    int size = kind.slotSize();
    if (slot + size > 65535) throw new IllegalArgumentException("Local-variable limit exceeded");
    return slot + size;
  }

  private static final class EncodedCode {
    final byte[] bytes;
    final int maxStack, maxLocals;
    EncodedCode(byte[] bytes, int maxStack, int maxLocals) {
      this.bytes = bytes; this.maxStack = maxStack; this.maxLocals = maxLocals;
    }
  }

  private static EncodedCode encodeCode(CodeValue code) {
    try {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(bytes);
      int stack = 0, maxStack = 0, maxLocals = code.allocatedLocals;
      boolean terminated = false;
      for (CodeElement element : code.elements) {
        if (!(element instanceof Instruction)) throw new IllegalArgumentException("Unsupported offset-dependent Code element");
        if (terminated) throw new IllegalArgumentException("Dead-code rewriting is outside the selected pipeline");
        Instruction instruction = (Instruction) element;
        int opcode = instruction.opcode().bytecode();
        if (instruction instanceof ConstantInstruction) {
          ConstantInstruction constant = (ConstantInstruction) instruction;
          output.writeByte(opcode);
          if (opcode == 0x10 || opcode == 0x11) {
            int value = ((Number) (Object) constant.constantValue()).intValue();
            if (opcode == 0x10) output.writeByte(value);
            else if (opcode == 0x11) output.writeShort(value);
            else throw new IllegalArgumentException("Unsupported argument constant opcode");
          } else if (constant instanceof ConstantInstruction.LoadConstantInstruction) {
            LoadableConstantEntry entry = ((ConstantInstruction.LoadConstantInstruction) constant).constantEntry();
            requireSharedPool(code.pool, entry.constantPool());
            if (opcode == 0x12) {
              if (entry.index() > 255) throw new IllegalArgumentException("ldc operand requires wide encoding");
              output.writeByte(entry.index());
            } else if (opcode == 0x13 || opcode == 0x14) u2(output, entry.index());
            else throw new IllegalArgumentException("Unsupported constant-pool load opcode");
          } else if (opcode < 0x01 || opcode > 0x0f) {
            throw new IllegalArgumentException("Unsupported constant instruction");
          }
          stack += constant.typeKind().slotSize();
        } else if (instruction instanceof LoadInstruction) {
          LoadInstruction local = (LoadInstruction) instruction;
          maxLocals = Math.max(maxLocals, writeLocal(output, local.typeKind(), local.slot(), true));
          stack += local.typeKind().slotSize();
        } else if (instruction instanceof StoreInstruction) {
          StoreInstruction local = (StoreInstruction) instruction;
          maxLocals = Math.max(maxLocals, writeLocal(output, local.typeKind(), local.slot(), false));
          stack -= local.typeKind().slotSize();
        } else if (instruction instanceof FieldInstruction) {
          FieldInstruction field = (FieldInstruction) instruction;
          requireSharedPool(code.pool, field.field().constantPool());
          output.writeByte(opcode); u2(output, field.field().index());
          int slots = fieldSlots(field.typeSymbol().descriptorString());
          if (opcode == 0xb2) stack += slots;
          else if (opcode == 0xb3) stack -= slots;
          else if (opcode == 0xb4) stack += slots - 1;
          else if (opcode == 0xb5) stack -= slots + 1;
          else throw new IllegalArgumentException("Unsupported field opcode");
        } else if (instruction instanceof InvokeInstruction) {
          InvokeInstruction invoke = (InvokeInstruction) instruction;
          requireSharedPool(code.pool, invoke.method().constantPool());
          if (opcode < 0xb6 || opcode > 0xb9) throw new IllegalArgumentException("Unsupported invocation opcode");
          output.writeByte(opcode); u2(output, invoke.method().index());
          String descriptor = invoke.type().stringValue();
          int parameters = argumentSlots(descriptor) + (opcode == 0xb8 ? 0 : 1);
          if (opcode == 0xb9) {
            if (parameters > 255) throw new IllegalArgumentException("invokeinterface slot limit exceeded");
            output.writeByte(parameters); output.writeByte(0);
          }
          stack += fieldSlots(MethodTypeDesc.ofDescriptor(descriptor).returnType().descriptorString()) - parameters;
        } else if (instruction instanceof OperatorInstruction) {
          if (opcode < 0x60 || opcode > 0x67) throw new IllegalArgumentException("Unsupported arithmetic opcode");
          output.writeByte(opcode);
          stack -= opcode % 4 == 1 || opcode % 4 == 3 ? 2 : 1;
        } else if (instruction instanceof StackInstruction) {
          output.writeByte(opcode);
          if (opcode == 0x57) stack--;
          else if (opcode == 0x58) stack -= 2;
          else if (opcode == 0x59) stack++;
          else throw new IllegalArgumentException("Unsupported stack opcode");
        } else if (instruction instanceof ReturnInstruction) {
          if (opcode < 0xac || opcode > 0xb1) throw new IllegalArgumentException("Unsupported return opcode");
          output.writeByte(opcode);
          stack -= opcode == 0xb1 ? 0 : opcode == 0xad || opcode == 0xaf ? 2 : 1;
          terminated = true;
        } else throw new IllegalArgumentException("Control-flow or opaque instruction generation is unsupported");
        // This is slot accounting, not implicit typed verification: ()I/areturn
        // intentionally builds and is rejected only by the explicit verifier.
        maxStack = Math.max(maxStack, stack);
        if (maxStack > 65535 || maxLocals > 65535) throw new IllegalArgumentException("Code resource limit exceeded");
      }
      output.flush();
      byte[] result = bytes.toByteArray();
      if (result.length == 0 || result.length > 65535) throw new IllegalArgumentException("Code length is outside the selected pipeline");
      return new EncodedCode(result, maxStack, maxLocals);
    } catch (IOException error) { throw new IllegalArgumentException("Code serialization failed", error); }
  }
}
