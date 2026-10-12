package java.lang.classfile;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.attribute.SourceFileAttribute;
import java.lang.classfile.attribute.StackMapTableAttribute;
import java.lang.classfile.attribute.BootstrapMethodsAttribute;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.classfile.instruction.BranchInstruction;
import java.lang.classfile.instruction.ExceptionCatch;
import java.lang.classfile.instruction.LabelTarget;
import java.lang.classfile.instruction.LookupSwitchInstruction;
import java.lang.classfile.instruction.SwitchCase;
import java.lang.classfile.instruction.TableSwitchInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.AccessFlag;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.IdentityHashMap;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Consumer;

/** Internal element sinks and selected control-flow class-file serialization. */
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
      ClassFile.StackMapsOption stackMaps, ClassFile.AttributesProcessingOption attributesProcessing,
      ClassHierarchyResolver hierarchyResolver, ClassFile.DeadCodeOption deadCode,
      ClassFile.DeadLabelsOption deadLabels, ClassFile.ShortJumpsOption shortJumps) {
    ClassSink builder = new ClassSink(name, pool, stackMaps, attributesProcessing, false, hierarchyResolver,
        deadCode, deadLabels, shortJumps);
    handler.accept(builder);
    return builder.bytes();
  }

  static byte[] transform(ClassModel model, ClassEntry name, DoppioConstantPool pool, ClassTransform transform,
      ClassFile.StackMapsOption stackMaps, ClassFile.AttributesProcessingOption attributesProcessing, boolean remapBound,
      ClassHierarchyResolver hierarchyResolver, ClassFile.DeadCodeOption deadCode,
      ClassFile.DeadLabelsOption deadLabels, ClassFile.ShortJumpsOption shortJumps) {
    ClassSink builder = new ClassSink(name, pool, stackMaps, attributesProcessing, remapBound, hierarchyResolver,
        deadCode, deadLabels, shortJumps);
    builder.transform(model, transform);
    return builder.bytes();
  }

  private interface Context {
    DoppioConstantPool pool();
    ClassFile.StackMapsOption stackMaps();
  }
  private interface MethodContext extends Context {
    ClassContext owner();
    Utf8Entry methodName();
    Utf8Entry descriptor();
    int methodFlags();
  }
  private interface ClassContext extends Context {
    ClassEntry className();
    ClassEntry superclass();
    List<ClassEntry> interfaces();
    int majorVersion();
    int classFlags();
    ClassHierarchyResolver hierarchyResolver();
    ClassFile.DeadCodeOption deadCode();
    ClassFile.DeadLabelsOption deadLabels();
    ClassFile.ShortJumpsOption shortJumps();
    ClassFile.AttributesProcessingOption attributesProcessing();
    boolean remapBound();
  }

  private static Context context(Object builder) {
    if (!(builder instanceof Context)) throw new IllegalArgumentException("Unsupported foreign builder context");
    return (Context) builder;
  }
  private static MethodContext methodContext(Object builder) {
    if (!(builder instanceof MethodContext)) throw new IllegalArgumentException("Missing method descriptor context");
    return (MethodContext) builder;
  }
  private static ClassContext classContext(Object builder) {
    if (!(builder instanceof ClassContext)) throw new IllegalArgumentException("Missing class descriptor context");
    return (ClassContext) builder;
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

  private static final class ForwardClass implements ClassBuilder, ClassContext {
    final ClassBuilder target;
    final ClassTransform transform;
    final ClassContext context;
    ForwardClass(ClassBuilder target, ClassTransform transform) {
      this.target = target; this.transform = transform; this.context = classContext(target);
    }
    public DoppioConstantPool pool() { return context.pool(); }
    public ClassFile.StackMapsOption stackMaps() { return context.stackMaps(); }
    public ClassEntry className() { return context.className(); }
    public ClassEntry superclass() { return context.superclass(); }
    public List<ClassEntry> interfaces() { return context.interfaces(); }
    public int majorVersion() { return context.majorVersion(); }
    public int classFlags() { return context.classFlags(); }
    public ClassHierarchyResolver hierarchyResolver() { return context.hierarchyResolver(); }
    public ClassFile.DeadCodeOption deadCode() { return context.deadCode(); }
    public ClassFile.DeadLabelsOption deadLabels() { return context.deadLabels(); }
    public ClassFile.ShortJumpsOption shortJumps() { return context.shortJumps(); }
    public ClassFile.AttributesProcessingOption attributesProcessing() { return context.attributesProcessing(); }
    public boolean remapBound() { return context.remapBound(); }
    public ConstantPoolBuilder constantPool() { return pool(); }
    public ClassBuilder with(ClassElement element) { transform.accept(target, Objects.requireNonNull(element)); return this; }
    public ClassBuilder withField(Utf8Entry name, Utf8Entry type, Consumer<? super FieldBuilder> handler) {
      FieldSink field = new FieldSink(pool(), stackMaps(), name, type);
      Objects.requireNonNull(handler).accept(field);
      return with(field.value());
    }
    public ClassBuilder withMethod(Utf8Entry name, Utf8Entry type, int flags, Consumer<? super MethodBuilder> handler) {
      MethodSink method = new MethodSink(context, name, type, flags);
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
      MethodSink method = new MethodSink(context, model.methodName(), model.methodType(), model.flags().flagsMask());
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
    public ClassContext owner() { return context.owner(); }
    public Utf8Entry methodName() { return context.methodName(); }
    public Utf8Entry descriptor() { return context.descriptor(); }
    public int methodFlags() { return context.methodFlags(); }
    public ConstantPoolBuilder constantPool() { return pool(); }
    public MethodBuilder with(MethodElement element) { transform.accept(target, Objects.requireNonNull(element)); return this; }
    public MethodBuilder withCode(Consumer<? super CodeBuilder> handler) {
      CodeSink code = new CodeSink(owner(), methodName(), descriptor(), methodFlags());
      Objects.requireNonNull(handler).accept(code);
      return with(code.value());
    }
    public MethodBuilder transformCode(CodeModel model, CodeTransform transform) {
      CodeSink code = new CodeSink(owner(), methodName(), descriptor(), methodFlags());
      code.transform(Objects.requireNonNull(model), Objects.requireNonNull(transform));
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

  private static final class ClassSink implements ClassBuilder, ClassContext {
    final DoppioConstantPool pool;
    final ClassFile.StackMapsOption stackMaps;
    final ClassEntry name;
    final ClassFile.AttributesProcessingOption attributesProcessing;
    final boolean remapBound;
    final ClassHierarchyResolver hierarchyResolver;
    final ClassFile.DeadCodeOption deadCode;
    final ClassFile.DeadLabelsOption deadLabels;
    final ClassFile.ShortJumpsOption shortJumps;
    int flags = ClassFile.ACC_SUPER;
    int major = 69, minor = 0;
    ClassEntry superclass;
    List<ClassEntry> interfaces = Collections.emptyList();
    final List<FieldModel> fields = new ArrayList<FieldModel>();
    final List<MethodModel> methods = new ArrayList<MethodModel>();
    final List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    ClassSink(ClassEntry name, DoppioConstantPool pool, ClassFile.StackMapsOption stackMaps,
        ClassFile.AttributesProcessingOption attributesProcessing, boolean remapBound, ClassHierarchyResolver hierarchyResolver,
        ClassFile.DeadCodeOption deadCode, ClassFile.DeadLabelsOption deadLabels, ClassFile.ShortJumpsOption shortJumps) {
      this.pool = Objects.requireNonNull(pool); this.stackMaps = Objects.requireNonNull(stackMaps);
      this.attributesProcessing = Objects.requireNonNull(attributesProcessing); this.remapBound = remapBound;
      this.hierarchyResolver = Objects.requireNonNull(hierarchyResolver);
      this.deadCode = Objects.requireNonNull(deadCode);
      this.deadLabels = Objects.requireNonNull(deadLabels);
      this.shortJumps = Objects.requireNonNull(shortJumps);
      this.name = pool.classEntry(pool.utf8Entry(Objects.requireNonNull(name).name().stringValue()));
      this.superclass = pool.classEntry(ClassDesc.of("java.lang.Object"));
    }
    public DoppioConstantPool pool() { return pool; }
    public ClassFile.StackMapsOption stackMaps() { return stackMaps; }
    public ClassEntry className() { return name; }
    public ClassEntry superclass() { return superclass; }
    public List<ClassEntry> interfaces() { return interfaces; }
    public int majorVersion() { return major; }
    public int classFlags() { return flags; }
    public ClassHierarchyResolver hierarchyResolver() { return hierarchyResolver; }
    public ClassFile.DeadCodeOption deadCode() { return deadCode; }
    public ClassFile.DeadLabelsOption deadLabels() { return deadLabels; }
    public ClassFile.ShortJumpsOption shortJumps() { return shortJumps; }
    public ClassFile.AttributesProcessingOption attributesProcessing() { return attributesProcessing; }
    public boolean remapBound() { return remapBound; }
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
      MethodSink method = new MethodSink(this, name, type, flags);
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
      MethodSink method = new MethodSink(this, model.methodName(), model.methodType(), model.flags().flagsMask());
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
        for (FieldModel field : fields) output.write(fieldBytes(this, field));
        u2(output, methods.size());
        for (MethodModel method : methods) output.write(methodBytes(this, method));
        // Custom writers can import dynamic constants too: derive bootstrap metadata last.
        ByteArrayOutputStream attributeBytes = new ByteArrayOutputStream();
        DataOutputStream attributeOutput = new DataOutputStream(attributeBytes);
        List<Attribute<?>> selected = selectedAttributes(attributes, attributesProcessing);
        for (Attribute<?> attribute : selected) writeAttribute(attributeOutput, pool, attribute, attributesProcessing);
        u2(output, selected.size() + (pool.bootstrapMethodCount() == 0 ? 0 : 1));
        output.write(attributeBytes.toByteArray());
        if (pool.bootstrapMethodCount() != 0) {
          byte[] bootstrap = pool.encodeBootstrapMethods();
          u2(output, pool.utf8Entry("BootstrapMethods").index()); output.writeInt(bootstrap.length); output.write(bootstrap);
        }
        pool.validateBootstrapReferences();
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
    final ClassContext owner;
    final DoppioConstantPool pool;
    final ClassFile.StackMapsOption stackMaps;
    final Utf8Entry name, type;
    final int staticFlags;
    int flags;
    CodeModel code;
    final List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    MethodSink(ClassContext owner, Utf8Entry name, Utf8Entry type, int flags) {
      this.owner = owner; this.pool = owner.pool(); this.stackMaps = owner.stackMaps();
      this.name = pool.utf8Entry(Objects.requireNonNull(name).stringValue());
      this.type = pool.utf8Entry(Objects.requireNonNull(type).stringValue());
      this.flags = flags; this.staticFlags = flags & ClassFile.ACC_STATIC;
    }
    public DoppioConstantPool pool() { return pool; }
    public ClassFile.StackMapsOption stackMaps() { return stackMaps; }
    public ClassContext owner() { return owner; }
    public Utf8Entry methodName() { return name; }
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
      CodeSink sink = new CodeSink(owner, name, type, flags);
      Objects.requireNonNull(handler).accept(sink); return with(sink.value());
    }
    public MethodBuilder transformCode(CodeModel model, CodeTransform transform) {
      CodeSink sink = new CodeSink(owner, name, type, flags);
      sink.transform(Objects.requireNonNull(model), Objects.requireNonNull(transform)); return with(sink.value());
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

  private static final class OwnedLabel implements Label {
    final CodeSink owner;
    OwnedLabel(CodeSink owner) { this.owner = owner; }
  }

  private static final class CodeSink implements CodeBuilder {
    final DoppioConstantPool pool;
    final ClassFile.StackMapsOption stackMaps;
    final ClassContext owner;
    final Utf8Entry name, type;
    final int flags;
    final OwnedLabel start = new OwnedLabel(this), end = new OwnedLabel(this);
    final List<CodeElement> elements = new ArrayList<CodeElement>();
    final IdentityHashMap<Label, Label> originalLabels = new IdentityHashMap<Label, Label>();
    CodeModel source;
    int nextLocal;
    CodeSink(ClassContext owner, Utf8Entry name, Utf8Entry type, int flags) {
      this.owner = owner; this.pool = owner.pool(); this.stackMaps = owner.stackMaps();
      this.name = name; this.type = type; this.flags = flags;
      this.nextLocal = argumentSlots(type.stringValue()) + ((flags & ClassFile.ACC_STATIC) == 0 ? 1 : 0);
    }
    public ConstantPoolBuilder constantPool() { return pool; }
    public CodeBuilder with(CodeElement element) {
      Objects.requireNonNull(element);
      if (element instanceof java.lang.classfile.instruction.NopInstruction) {
        elements.add(element); return this;
      }
      if (element instanceof StackMapTableAttribute) {
        if (source == null) throw new UnsupportedOperationException("Manual stack-map attributes are outside the selected builder");
        return this; // Rewriting regenerates frames rather than retaining stale offsets.
      }
      if (element instanceof Attribute) {
        Attribute<?> attribute = (Attribute<?>) element;
        if (DoppioAttributes.shouldWrite(attribute, owner.attributesProcessing())) addAttribute(attributes, attribute);
        return this;
      }
      if (element instanceof LabelTarget) element = DoppioClassReader.labelTarget(label(((LabelTarget) element).label()));
      else if (element instanceof BranchInstruction) {
        BranchInstruction branch = (BranchInstruction) element;
        element = BranchInstruction.of(branch.opcode(), label(branch.target()));
      } else if (element instanceof TableSwitchInstruction) {
        TableSwitchInstruction instruction = (TableSwitchInstruction) element;
        element = TableSwitchInstruction.of(instruction.lowValue(), instruction.highValue(),
          label(instruction.defaultTarget()), cases(instruction.cases()));
      } else if (element instanceof LookupSwitchInstruction) {
        LookupSwitchInstruction instruction = (LookupSwitchInstruction) element;
        element = LookupSwitchInstruction.of(label(instruction.defaultTarget()), cases(instruction.cases()));
      } else if (element instanceof ExceptionCatch) {
        ExceptionCatch handler = (ExceptionCatch) element;
        element = ExceptionCatch.of(label(handler.handler()), label(handler.tryStart()), label(handler.tryEnd()), handler.catchType());
      } else if (!(element instanceof Instruction)) {
        throw new UnsupportedOperationException("Unselected offset-dependent Code element");
      }
      elements.add(element); return this;
    }
    private Label label(Label value) {
      Objects.requireNonNull(value);
      if (value instanceof OwnedLabel && ((OwnedLabel) value).owner == this) return value;
      if (source == null) throw new IllegalStateException("Foreign Code label context");
      ((CodeAttribute) source).labelToBci(value); // Identity, not equivalent BCI or byte arrays.
      Label mapped = originalLabels.get(value);
      if (mapped == null) { mapped = new OwnedLabel(this); originalLabels.put(value, mapped); }
      return mapped;
    }
    private List<SwitchCase> cases(List<SwitchCase> values) {
      List<SwitchCase> mapped = new ArrayList<SwitchCase>();
      for (SwitchCase value : values) mapped.add(SwitchCase.of(value.caseValue(), label(value.target())));
      return mapped;
    }
    public CodeBuilder transform(CompoundElement<CodeElement> model,
        ClassFileTransform<?, CodeElement, CodeBuilder> transform) {
      if (!(Objects.requireNonNull(model) instanceof CodeAttribute))
        throw new IllegalArgumentException("Code transformation requires its own model");
      if (source != null && source != model) throw new IllegalArgumentException("Cannot mix source Code label owners");
      source = (CodeModel) model;
      Objects.requireNonNull(transform).atStart(this);
      model.forEach(element -> transform.accept(this, element));
      transform.atEnd(this);
      return this;
    }
    public Label newLabel() { return new OwnedLabel(this); }
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
    final List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    CodeValue value() { return new CodeValue(owner, name, type, flags, elements, attributes, nextLocal, start, end); }
  }

  private static final class CodeValue implements CodeAttribute {
    final DoppioConstantPool pool;
    final ClassContext owner;
    final Utf8Entry name, type;
    final int flags, allocatedLocals;
    final List<CodeElement> elements;
    final List<Attribute<?>> attributes;
    final Label start, end;
    CodeValue(ClassContext owner, Utf8Entry name, Utf8Entry type, int flags, List<CodeElement> elements,
        List<Attribute<?>> attributes, int allocatedLocals,
        Label start, Label end) {
      this.owner = owner; this.pool = owner.pool(); this.name = name; this.type = type;
      this.flags = flags; this.elements = immutable(elements);
      this.attributes = immutable(attributes);
      this.allocatedLocals = allocatedLocals; this.start = start; this.end = end;
    }
    public Utf8Entry attributeName() { return pool.utf8Entry("Code"); }
    public AttributeMapper<CodeAttribute> attributeMapper() { return Attributes.code(); }
    public Optional<MethodModel> parent() { return Optional.empty(); }
    public List<ExceptionCatch> exceptionHandlers() {
      List<ExceptionCatch> handlers = new ArrayList<ExceptionCatch>();
      for (CodeElement element : elements) if (element instanceof ExceptionCatch) handlers.add((ExceptionCatch) element);
      return immutable(handlers);
    }
    public List<Attribute<?>> attributes() { return attributes; }
    public void forEach(Consumer<? super CodeElement> consumer) {
      Objects.requireNonNull(consumer);
      for (Attribute<?> attribute : attributes) consumer.accept((CodeElement) attribute);
      for (CodeElement element : elements) consumer.accept(element);
    }
    public int maxStack() { return encodeCode(this).maxStack; }
    public int maxLocals() { return encodeCode(this).maxLocals; }
    public byte[] codeArray() { return encodeCode(this).bytes; }
    public int codeLength() { return codeArray().length; }
    public int labelToBci(Label label) {
      Objects.requireNonNull(label);
      Integer bci = encodeCode(this).labels.get(label);
      if (bci == null) throw new IllegalArgumentException("Unbound or foreign label");
      return bci.intValue();
    }
  }

  private static <T> List<T> immutable(List<T> values) { return Collections.unmodifiableList(new ArrayList<T>(values)); }

  private static void addAttribute(List<Attribute<?>> attributes, Attribute<?> value) {
    Objects.requireNonNull(value);
    String name = value.attributeName().stringValue();
    for (int index = attributes.size() - 1; index >= 0; index--) {
      if (!value.attributeMapper().allowMultiple() && attributes.get(index).attributeName().stringValue().equals(name)) attributes.remove(index);
    }
    attributes.add(value);
  }

  static void requireSharedPool(DoppioConstantPool destination, ConstantPool source) {
    if (!destination.canWriteDirect(Objects.requireNonNull(source)))
      throw new IllegalArgumentException("Opaque bound data cannot be remapped to another constant pool");
  }

  private static byte[] fieldBytes(ClassContext owner, FieldModel field) throws IOException {
    DoppioConstantPool pool = owner.pool();
    if (!(field instanceof FieldValue)) {
      if (!owner.remapBound() && owner.attributesProcessing() == ClassFile.AttributesProcessingOption.PASS_ALL_ATTRIBUTES) {
        requireSharedPool(pool, field.fieldName().constantPool());
        return DoppioClassReader.memberBytes(field);
      }
      field = new FieldValue(pool, pool.utf8Entry(field.fieldName().stringValue()),
        pool.utf8Entry(field.fieldType().stringValue()), field.flags().flagsMask(), field.attributes());
    }
    FieldValue value = (FieldValue) field;
    requireSharedPool(pool, value.pool);
    ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(bytes);
    u2(output, value.flags.flagsMask()); u2(output, pool.utf8Entry(value.name.stringValue()).index());
    u2(output, pool.utf8Entry(value.type.stringValue()).index());
    writeAttributes(output, pool, value.attributes, owner.attributesProcessing());
    output.flush(); return bytes.toByteArray();
  }

  private static byte[] methodBytes(ClassContext owner, MethodModel method) throws IOException {
    DoppioConstantPool pool = owner.pool();
    if (!(method instanceof MethodValue)) {
      if (!owner.remapBound() && owner.attributesProcessing() == ClassFile.AttributesProcessingOption.PASS_ALL_ATTRIBUTES) {
        requireSharedPool(pool, method.methodName().constantPool());
        return DoppioClassReader.memberBytes(method);
      }
      method = new MethodValue(pool, pool.utf8Entry(method.methodName().stringValue()),
        pool.utf8Entry(method.methodType().stringValue()), method.flags().flagsMask(),
        method.code().orElse(null), methodAttributes(method));
    }
    MethodValue value = (MethodValue) method;
    requireSharedPool(pool, value.pool);
    if (value.code != null && !(value.code instanceof CodeValue)) {
      Optional<MethodModel> original = value.code.parent();
      if (!original.isPresent() || !original.get().methodType().stringValue().equals(value.type.stringValue()) ||
          ((original.get().flags().flagsMask() ^ value.flags.flagsMask()) & ClassFile.ACC_STATIC) != 0)
        throw new IllegalArgumentException("Bound Code cannot be copied into a different method descriptor/staticness");
      if (owner.remapBound()) {
        // These bound tables carry both CP indexes and bytecode offsets. The selected
        // reader does not yet expose their label-based elements; never silently lose
        // them when rebuilding Code for a fresh pool.
        for (Attribute<?> attribute : selectedAttributes(value.code.attributes(), owner.attributesProcessing())) {
          String name = attribute.attributeName().stringValue();
          if ("LocalVariableTable".equals(name) || "LocalVariableTypeTable".equals(name))
            throw new UnsupportedOperationException("Fresh-pool Code remapping does not support " + name);
        }
        CodeSink sink = new CodeSink(owner, value.name, value.type, value.flags.flagsMask());
        sink.transform(value.code, CodeTransform.ACCEPT_ALL);
        value = new MethodValue(pool, value.name, value.type, value.flags.flagsMask(), sink.value(), methodAttributes(value));
      }
    }
    ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(bytes);
    u2(output, value.flags.flagsMask()); u2(output, pool.utf8Entry(value.name.stringValue()).index());
    u2(output, pool.utf8Entry(value.type.stringValue()).index());
    writeAttributes(output, pool, value.attributes, owner.attributesProcessing());
    output.flush(); return bytes.toByteArray();
  }

  private static List<Attribute<?>> methodAttributes(MethodModel method) {
    List<Attribute<?>> attributes = new ArrayList<Attribute<?>>();
    for (Attribute<?> attribute : method.attributes()) if (!(attribute instanceof CodeModel)) attributes.add(attribute);
    return attributes;
  }

  private static List<Attribute<?>> selectedAttributes(List<Attribute<?>> attributes,
      ClassFile.AttributesProcessingOption policy) {
    List<Attribute<?>> selected = new ArrayList<Attribute<?>>();
    for (Attribute<?> attribute : attributes)
      if (!(attribute instanceof BootstrapMethodsAttribute) && DoppioAttributes.shouldWrite(attribute, policy)) selected.add(attribute);
    return selected;
  }

  private static void writeAttributes(DataOutputStream output, DoppioConstantPool pool,
      List<Attribute<?>> attributes, ClassFile.AttributesProcessingOption policy) throws IOException {
    List<Attribute<?>> selected = selectedAttributes(attributes, policy);
    u2(output, selected.size());
    for (Attribute<?> attribute : selected) writeAttribute(output, pool, attribute, policy);
  }

  private static void writeAttribute(DataOutputStream output, DoppioConstantPool pool,
      Attribute<?> attribute, ClassFile.AttributesProcessingOption policy) throws IOException {
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
      u2(value, encoded.handlers.size());
      for (int[] handler : encoded.handlers) {
        u2(value, handler[0]); u2(value, handler[1]); u2(value, handler[2]); u2(value, handler[3]);
      }
      List<Attribute<?>> selected = selectedAttributes(code.attributes, policy);
      u2(value, selected.size() + (encoded.stackMap == null ? 0 : 1));
      for (Attribute<?> nested : selected) writeAttribute(value, pool, nested, policy);
      if (encoded.stackMap != null) {
        u2(value, pool.utf8Entry("StackMapTable").index());
        value.writeInt(encoded.stackMap.length); value.write(encoded.stackMap);
      }
      value.flush(); payload = bytes.toByteArray();
    } else if (attribute instanceof CodeAttribute) {
      CodeAttribute code = (CodeAttribute) attribute;
      requireSharedPool(pool, DoppioClassReader.sourcePool(attribute));
      if (policy == ClassFile.AttributesProcessingOption.PASS_ALL_ATTRIBUTES) payload = DoppioClassReader.attributePayload(attribute);
      else {
        // Shared-pool policy changes need not decode/rewrite unsupported instruction families.
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream value = new DataOutputStream(bytes);
        u2(value, code.maxStack()); u2(value, code.maxLocals());
        byte[] instructions = code.codeArray(); value.writeInt(instructions.length); value.write(instructions);
        u2(value, code.exceptionHandlers().size());
        for (ExceptionCatch handler : code.exceptionHandlers()) {
          u2(value, code.labelToBci(handler.tryStart())); u2(value, code.labelToBci(handler.tryEnd()));
          u2(value, code.labelToBci(handler.handler()));
          u2(value, handler.catchType().isPresent() ? handler.catchType().get().index() : 0);
        }
        writeAttributes(value, pool, code.attributes(), policy); value.flush(); payload = bytes.toByteArray();
      }
    } else if (attribute instanceof StackMapTableAttribute) {
      requireSharedPool(pool, DoppioClassReader.sourcePool(attribute));
      payload = DoppioClassReader.attributePayload(attribute);
    } else {
      DoppioBufWriter writer = new DoppioBufWriter(pool);
      DoppioAttributes.write(writer, attribute);
      output.write(writer.bytes()); return;
    }
    u2(output, pool.utf8Entry(attribute.attributeName().stringValue()).index());
    output.writeInt(payload.length); output.write(payload);
  }

  private static void u2(DataOutputStream output, int value) throws IOException {
    if (value < 0 || value > 65535) throw new IllegalArgumentException("Unsigned-short class-file limit exceeded");
    output.writeShort(value);
  }

  static int fieldSlots(String descriptor) {
    Objects.requireNonNull(descriptor);
    if (descriptor.length() == 0) throw new IllegalArgumentException("Missing type descriptor");
    char type = descriptor.charAt(0);
    if (type == 'V') return 0;
    if (type == 'J' || type == 'D') return 2;
    return 1;
  }

  static int argumentSlots(String descriptor) {
    MethodTypeDesc type = MethodTypeDesc.ofDescriptor(descriptor);
    int slots = 0;
    for (int index = 0; index < type.parameterCount(); index++) slots += fieldSlots(type.parameterType(index).descriptorString());
    return slots;
  }

  private static final class EncodedCode {
    final byte[] bytes;
    final int maxStack, maxLocals;
    final List<int[]> handlers;
    final IdentityHashMap<Label, Integer> labels;
    final byte[] stackMap;
    EncodedCode(DoppioCodeAssembler.Result result, byte[] bytes, int maxStack, List<int[]> handlers, byte[] stackMap) {
      this.bytes = bytes; this.maxStack = maxStack; this.maxLocals = result.maxLocals;
      this.handlers = handlers; this.labels = result.labels; this.stackMap = stackMap;
    }
  }

  private static EncodedCode encodeCode(CodeValue code) {
    DoppioCodeAssembler.Result result = DoppioCodeAssembler.assemble(code.pool, code.elements,
      code.allocatedLocals, code.start, code.end, code.owner.deadLabels(), code.owner.shortJumps());
    ClassFile.StackMapsOption option = code.owner.stackMaps();
    boolean generate = option == ClassFile.StackMapsOption.GENERATE_STACK_MAPS ||
      option == ClassFile.StackMapsOption.STACK_MAPS_WHEN_REQUIRED && code.owner.majorVersion() >= 50 && result.controlFlow;
    if (!generate) return new EncodedCode(result, result.bytes, result.maxStack, result.handlers, null);
    List<ClassDesc> interfaces = new ArrayList<ClassDesc>();
    for (ClassEntry entry : code.owner.interfaces()) interfaces.add(entry.asSymbol());
    DoppioCodeFlow.Result analyzed = DoppioCodeFlow.analyze(code.owner.className().asSymbol(),
      code.owner.superclass() == null ? null : code.owner.superclass().asSymbol(), interfaces,
      code.pool, code.name.stringValue(), MethodTypeDesc.ofDescriptor(code.type.stringValue()),
      code.flags, result.bytes, 65535, result.maxLocals, result.handlers, null, false,
      code.owner.hierarchyResolver(), code.owner.classFlags(), code.owner.deadCode());
    return new EncodedCode(result, analyzed.code, analyzed.maxStack, analyzed.handlers,
      analyzed.frames.isEmpty() ? null : stackMap(code.pool, analyzed.frames));
  }

  private static byte[] stackMap(DoppioConstantPool pool, List<DoppioCodeFlow.Frame> frames) {
    try {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(bytes);
      u2(output, frames.size());
      int previous = -1;
      for (DoppioCodeFlow.Frame frame : frames) {
        output.writeByte(255); u2(output, frame.bci - previous - 1); previous = frame.bci;
        List<DoppioCodeFlow.Value> locals = new ArrayList<DoppioCodeFlow.Value>();
        int limit = frame.locals.size();
        while (limit > 0 && frame.locals.get(limit - 1).kind == 'T') limit--;
        for (int slot = 0; slot < limit; slot++) {
          DoppioCodeFlow.Value value = frame.locals.get(slot); locals.add(value);
          if (value.kind == 'J' || value.kind == 'D') slot++; // Wide-tail TOP is not a verification entry.
        }
        u2(output, locals.size());
        for (DoppioCodeFlow.Value value : locals) verificationType(output, pool, value);
        u2(output, frame.stack.size());
        for (DoppioCodeFlow.Value value : frame.stack) verificationType(output, pool, value);
      }
      output.flush(); return bytes.toByteArray();
    } catch (IOException error) { throw new IllegalArgumentException("Stack-map serialization failed", error); }
  }

  private static void verificationType(DataOutputStream output, DoppioConstantPool pool, DoppioCodeFlow.Value value)
      throws IOException {
    char kind = value.kind;
    if (kind == 'T') output.writeByte(0);
    else if (kind == 'I') output.writeByte(1);
    else if (kind == 'F') output.writeByte(2);
    else if (kind == 'D') output.writeByte(3);
    else if (kind == 'J') output.writeByte(4);
    else if (kind == 'N') output.writeByte(5);
    else if (kind == 'U' && value.newBci == -1) output.writeByte(6);
    else if (kind == 'A') {
      output.writeByte(7); u2(output, pool.classEntry(ClassDesc.ofDescriptor(value.descriptor)).index());
    } else if (kind == 'U') { output.writeByte(8); u2(output, value.newBci); }
    else throw new UnsupportedOperationException("Unselected verification-type kind");
  }
}
