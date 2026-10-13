package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.*;
import java.util.*;

/** Bounded pure-public-API debug options and legal deferred mapper lifecycle diagnostic. */
public class ClassFileDebugReaderRegression {
  private static final ClassDesc OBJECT = ConstantDescs.CD_Object;
  private static int passed;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    passed++;
  }
  private static void require(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }
  private static void expect(Class<? extends Throwable> type, Runnable operation, String message) {
    Throwable caught = null;
    try { operation.run(); } catch (Throwable failure) { caught = failure; }
    check(caught != null && type.isInstance(caught), message);
  }
  private static byte[] debugClass(ClassFile context) {
    return context.build(ClassDesc.of("C7dDebugReaderTarget"), cb -> cb
        .with(SourceDebugExtensionAttribute.of(new byte[]{11, 22, 33}))
        .withMethodBody("run", MethodTypeDesc.ofDescriptor("(I)I"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
            code -> {
              Label start = code.newLabel(), end = code.newLabel();
              code.labelBinding(start).lineNumber(10).iload(0).lineNumber(20).nop().ireturn().labelBinding(end);
              code.localVariable(0, "x", ConstantDescs.CD_int, start, end);
              code.localVariableType(0, "x", Signature.parseFrom("Ljava/util/List<Ljava/lang/String;>;"), start, end);
              code.characterRange(start, end, 1025, 2050, CharacterRange.FLAG_STATEMENT);
            }));
  }
  private static CodeAttribute code(ClassModel model) { return (CodeAttribute) model.methods().get(0).code().get(); }
  private static int[] counts(CodeModel code) {
    int[] result = new int[3];
    code.forEach(element -> {
      if (element instanceof LocalVariable || element instanceof LocalVariableType || element instanceof CharacterRange) result[0]++;
      else if (element instanceof LineNumber) result[1]++;
      else if (element instanceof LabelTarget) result[2]++;
    });
    return result;
  }
  private static void counts(ClassFile context, byte[] bytes, int tables, int debug, int lines, int labels, String message) {
    CodeAttribute code = code(context.parse(bytes));
    check(code.attributes().size() == tables && Arrays.equals(counts(code), new int[]{debug, lines, labels}), message);
  }
  private static List<String> sequence(CodeAttribute code) {
    List<String> result = new ArrayList<String>();
    code.forEach(element -> {
      if (element instanceof CharacterRange) result.add("chars");
      else if (element instanceof LocalVariable) result.add("local");
      else if (element instanceof LocalVariableType) result.add("generic");
      else if (element instanceof LabelTarget) result.add("label" + code.labelToBci(((LabelTarget) element).label()));
      else if (element instanceof LineNumber) result.add("line" + ((LineNumber) element).line());
      else if (element instanceof Instruction) result.add(((Instruction) element).opcode().name());
    });
    return result;
  }
  private static final class TableCarrier extends CustomAttribute<TableCarrier> {
    final Attribute<?> table;
    TableCarrier(Attribute<?> table) { super(mapper(table)); this.table = table; }
    static AttributeMapper<TableCarrier> mapper(Attribute<?> table) {
      return new AttributeMapper<TableCarrier>() {
        public String name() { return table.attributeName().stringValue(); }
        public AttributeStability stability() { return AttributeStability.LABELS; }
        public boolean allowMultiple() { return table.attributeMapper().allowMultiple(); }
        public TableCarrier readAttribute(AttributedElement owner, ClassReader reader, int start) {
          throw new UnsupportedOperationException("Built-in table mapper has precedence");
        }
        @SuppressWarnings({"rawtypes", "unchecked"})
        public void writeAttribute(BufWriter writer, TableCarrier value) {
          ((AttributeMapper) value.table.attributeMapper()).writeAttribute(writer, value.table);
        }
      };
    }
  }
  private static boolean declaresFactory(Class<?> type) {
    for (java.lang.reflect.Method method : type.getDeclaredMethods()) if ("of".equals(method.getName())) return true;
    return false;
  }
  private static void optionsAndTables() {
    ClassFile defaults = ClassFile.of();
    byte[] bytes = debugClass(defaults);
    ClassFile dropDebug = defaults.withOptions(ClassFile.DebugElementsOption.DROP_DEBUG);
    ClassFile dropLines = defaults.withOptions(ClassFile.LineNumbersOption.DROP_LINE_NUMBERS);
    ClassFile dropBoth = dropDebug.withOptions(ClassFile.LineNumbersOption.DROP_LINE_NUMBERS);
    counts(defaults, bytes, 4, 3, 2, 2, "Default PASS/PASS raw tables, pseudos and scope-only labels");
    counts(dropDebug, bytes, 4, 0, 2, 0, "DROP_DEBUG preserves raw tables and does not inflate debug-only labels");
    counts(dropLines, bytes, 4, 3, 0, 2, "DROP_LINE_NUMBERS preserves raw tables and selected debug labels");
    counts(dropBoth, bytes, 4, 0, 0, 0, "Independent DROP options preserve raw typed tables");
    counts(dropBoth.withOptions(ClassFile.DebugElementsOption.PASS_DEBUG), bytes, 4, 3, 0, 2,
        "withOptions changes debug option and preserves line option");
    counts(dropBoth.withOptions(ClassFile.DebugElementsOption.PASS_DEBUG, ClassFile.DebugElementsOption.DROP_DEBUG,
        ClassFile.LineNumbersOption.PASS_LINE_NUMBERS), bytes, 4, 0, 2, 0, "Repeated option is last-wins");
    CodeAttribute original = code(defaults.parse(bytes));
    check(sequence(original).equals(Arrays.asList("chars", "local", "generic", "label0", "line10", "ILOAD_0",
        "line20", "NOP", "IRETURN", "label3")), "Debug attribute order precedes instructions; lines do not create labels");
    LineNumberTableAttribute lnt = original.findAttribute(Attributes.lineNumberTable()).get();
    LocalVariableInfo local = original.findAttribute(Attributes.localVariableTable()).get().localVariables().get(0);
    LocalVariableTypeInfo generic = original.findAttribute(Attributes.localVariableTypeTable()).get().localVariableTypes().get(0);
    CharacterRangeInfo chars = original.findAttribute(Attributes.characterRangeTable()).get().characterRangeTable().get(0);
    check(lnt.lineNumbers().size() == 2 && lnt.lineNumbers().get(1).startPc() == 1 && lnt.lineNumbers().get(1).lineNumber() == 20,
        "Typed raw line table values");
    check(local.startPc() == 0 && local.length() == 3 && local.slot() == 0 && "x".equals(local.name().stringValue()) &&
        local.typeSymbol().equals(ConstantDescs.CD_int), "Typed raw local variable descriptor and scope");
    check(generic.startPc() == 0 && generic.length() == 3 && "x".equals(generic.name().stringValue()) &&
        "Ljava/util/List<Ljava/lang/String;>;".equals(generic.signature().stringValue()), "Typed raw generic local signature");
    check(chars.startPc() == 0 && chars.endPc() == 2 && chars.characterRangeStart() == 1025 &&
        chars.characterRangeEnd() == 2050 && chars.flags() == CharacterRange.FLAG_STATEMENT,
        "Raw character end_pc is inclusive; pseudo endScope is exclusive");
    check(!(((Object) lnt) instanceof CodeElement) &&
        !(((Object) original.findAttribute(Attributes.localVariableTable()).get()) instanceof CodeElement) &&
        !(((Object) original.findAttribute(Attributes.localVariableTypeTable()).get()) instanceof CodeElement) &&
        !(((Object) original.findAttribute(Attributes.characterRangeTable()).get()) instanceof CodeElement), "Raw debug tables are Attribute-only");
    check(!declaresFactory(LocalVariableInfo.class) && !declaresFactory(LocalVariableTypeInfo.class), "Local Info interfaces have no invented public factories");
    LineNumberInfo negativeLine = LineNumberInfo.of(-1, Integer.MAX_VALUE);
    check(negativeLine.startPc() == -1 && negativeLine.lineNumber() == Integer.MAX_VALUE,
        "LineNumberInfo factory does not impose encoded u2 range checks");
    CharacterRangeInfo negativeRange = CharacterRangeInfo.of(-1, -2, -3, -4, -5);
    check(negativeRange.startPc() == -1 && negativeRange.endPc() == -2 && negativeRange.characterRangeStart() == -3 &&
        negativeRange.characterRangeEnd() == -4 && negativeRange.flags() == -5, "CharacterRangeInfo factory retains all signed ints");
    List<LineNumberInfo> mutable = new ArrayList<LineNumberInfo>(); mutable.add(LineNumberInfo.of(0, 10));
    LineNumberTableAttribute copied = LineNumberTableAttribute.of(mutable); mutable.clear();
    check(copied.lineNumbers().size() == 1, "Table factory copies caller list");
    expect(UnsupportedOperationException.class, () -> copied.lineNumbers().add(LineNumberInfo.of(1, 20)), "Table list is immutable");
    expect(NullPointerException.class, () -> LineNumberTableAttribute.of(Arrays.asList((LineNumberInfo) null)), "Table rejects null entries");
    byte[] rawLines = defaults.build(ClassDesc.of("C7dRawLineTarget"), cb -> cb.withMethodBody("run",
        MethodTypeDesc.ofDescriptor("()V"), ClassFile.ACC_STATIC, builder -> builder
            .with(new TableCarrier(LineNumberTableAttribute.of(Arrays.asList(LineNumberInfo.of(0, 10), LineNumberInfo.of(1, 0)))))
            .with(new TableCarrier(LineNumberTableAttribute.of(Arrays.asList(LineNumberInfo.of(0, 31), LineNumberInfo.of(2, 99)))))
            .nop().return_()));
    CodeAttribute raw = code(defaults.parse(rawLines));
    check(raw.attributes().size() == 2, "Multiple raw line-number tables remain available");
    check(sequence(raw).equals(Arrays.asList("line31", "NOP", "RETURN", "line99")),
        "Indexed lines use last-wins, omit zero sentinel and deliver nonzero code-end line");
    byte[] source = {1, 2, 3}; SourceDebugExtensionAttribute unbound = SourceDebugExtensionAttribute.of(source);
    check(unbound.contents() == source, "Unbound source-debug contents aliases input array");
    source[0] = 9; check(unbound.contents()[0] == 9, "Source-debug input alias remains live");
    check(unbound instanceof ClassElement, "SourceDebugExtension is a class element");
    SourceDebugExtensionAttribute bound = defaults.parse(bytes).findAttribute(Attributes.sourceDebugExtension()).get();
    byte[] first = bound.contents(), second = bound.contents();
    check(first != second && Arrays.equals(first, second), "Bound source-debug contents are fresh detached copies");
    first[0] = 0; check(bound.contents()[0] == 11, "Bound source-debug mutation does not affect retained source");
    counts(defaults, debugClass(dropDebug), 1, 0, 2, 0, "Build DROP_DEBUG suppresses explicitly supplied debug pseudos");
    counts(defaults, debugClass(dropLines), 4, 3, 2, 2, "Build DROP_LINES retains explicitly supplied line elements");
    ClassModel model = defaults.parse(bytes);
    counts(defaults, dropBoth.transformClass(model, ClassTransform.ACCEPT_ALL), 4, 3, 2, 2,
        "Bound identity copy preserves tables even under DROP contexts");
    counts(defaults, dropDebug.transformClass(model, ClassTransform.transformingMethodBodies(CodeTransform.ACCEPT_ALL)), 1, 0, 2, 0,
        "Forced code transform applies builder debug policy");
    counts(defaults, dropLines.transformClass(model, ClassTransform.transformingMethodBodies(CodeTransform.ACCEPT_ALL)), 4, 3, 2, 2,
        "Writer line option does not discard explicit PASS-source lines");
    counts(defaults, dropLines.transformClass(dropLines.parse(bytes), ClassTransform.transformingMethodBodies(CodeTransform.ACCEPT_ALL)),
        3, 3, 0, 2, "DROP-parsed source supplies no line elements to forced transform");
    check(defaults.verify(bytes).isEmpty() && defaults.verify(defaults.parse(bytes)).isEmpty(), "Metadata-only verifier accepts ordinary debug fixture");
  }

  private static final class LifecycleAttribute extends CustomAttribute<LifecycleAttribute> {
    final int kind;
    final Utf8Entry symbol;
    final AttributedElement owner;
    final ClassReader reader;
    final int start;
    LifecycleAttribute(LifecycleMapper mapper, int kind) {
      this(mapper, kind, ConstantPoolBuilder.of().utf8Entry("lifeSymbol"), null, null, -1);
    }
    LifecycleAttribute(LifecycleMapper mapper, int kind, Utf8Entry symbol, AttributedElement owner, ClassReader reader, int start) {
      super(mapper); this.kind = kind; this.symbol = symbol; this.owner = owner; this.reader = reader; this.start = start;
    }
  }
  private static final class LifecycleMapper implements AttributeMapper<LifecycleAttribute> {
    final List<LifecycleAttribute> reads = new ArrayList<LifecycleAttribute>();
    boolean expectFresh;
    int boundWrites;
    public String name() { return "DoppioLifecycle"; }
    public AttributeStability stability() { return AttributeStability.CP_REFS; }
    public LifecycleAttribute readAttribute(AttributedElement owner, ClassReader reader, int start) {
      // The native contract prohibits owner.attributes() here. Retain owner and
      // reader; all enclosing-attribute access occurs after the caller receives the model.
      require(reader.readInt(start - 4) == 35, "Mapper receives payload start after framing validation");
      LifecycleAttribute value = new LifecycleAttribute(this, reader.readU1(start + 34), reader.readEntry(start + 32, Utf8Entry.class),
          owner, reader, start);
      reads.add(value); return value;
    }
    public void writeAttribute(BufWriter writer, LifecycleAttribute value) {
      int initialSize = writer.size(); writer.reserveSpace(100);
      require(writer.size() == initialSize, "reserveSpace reserves capacity without advancing size");
      writer.writeIndex(value.attributeName()); int lengthAt = writer.size(); writer.writeInt(0);
      int start = writer.size();
      if (value.reader != null) {
        if (expectFresh) require(!writer.canWriteDirect(value.reader), "Fresh pool cannot copy source pool indices directly");
        value.reader.copyBytesTo(writer, value.start, 32); boundWrites++;
      } else {
        writer.writeU1(-1); writer.writeU2(-2); writer.writeInt(0x80706050);
        writer.writeLong(0x8123456789abcdefL); writer.writeFloat(-1.25f); writer.writeDouble(-2.5);
        writer.writeIntBytes(3, 0x7abcde); writer.writeBytes(new byte[]{1, 2, 3, 4}, 1, 2);
      }
      writer.writeIndex(value.symbol); writer.writeU1(value.kind);
      writer.patchInt(lengthAt, 4, writer.size() - start);
      require(writer.size() - initialSize == 41, "Full header plus 35-byte payload works at any writer offset");
    }
  }
  private static void materialize(ClassModel model) {
    model.attributes();
    for (FieldModel field : model.fields()) field.attributes();
    for (MethodModel method : model.methods()) {
      method.attributes(); if (method.code().isPresent()) method.code().get().attributes();
    }
  }
  private static boolean numericPayload(LifecycleAttribute value) {
    ClassReader reader = value.reader; int at = value.start;
    return reader.readU1(at) == 255 && reader.readS1(at) == -1 && reader.readU2(at + 1) == 65534 && reader.readS2(at + 1) == -2 &&
        reader.readInt(at + 3) == 0x80706050 && reader.readLong(at + 7) == 0x8123456789abcdefL &&
        reader.readFloat(at + 15) == -1.25f && reader.readDouble(at + 19) == -2.5 &&
        reader.readU1(at + 27) == 0x7a && reader.readU2(at + 28) == 0xbcde && reader.readU2(at + 30) == 0x0203 &&
        "lifeSymbol".equals(reader.readEntry(at + 32, Utf8Entry.class).stringValue());
  }
  private static void lifecycle() {
    LifecycleMapper mapper = new LifecycleMapper();
    ClassFile context = ClassFile.of(ClassFile.AttributeMapperOption.of(name -> "DoppioLifecycle".equals(name.stringValue()) ? mapper : null));
    byte[] bytes = context.build(ClassDesc.of("C7dReaderLifecycleTarget"), cb -> cb.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER)
        .with(new LifecycleAttribute(mapper, 1))
        .withField("field", ConstantDescs.CD_int,
            field -> field.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC).with(new LifecycleAttribute(mapper, 2)))
        .withMethod("run", MethodTypeDesc.ofDescriptor("()V"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
            method -> method.with(new LifecycleAttribute(mapper, 3)).withCode(builder -> builder.with(new LifecycleAttribute(mapper, 4)).return_())));
    ClassModel model = context.parse(bytes); materialize(model);
    check(mapper.reads.size() == 4, "Custom mapper retained one class, field, method and code owner");
    int kindMask = 0;
    for (LifecycleAttribute value : mapper.reads) {
      kindMask |= 1 << value.kind;
      check(value.owner.attributes().contains(value), "Deferred owner attribute view contains returned custom attribute");
      check(value.reader.classfileLength() == bytes.length && (value.reader.flags() & ClassFile.ACC_PUBLIC) != 0 &&
          "C7dReaderLifecycleTarget".equals(value.reader.thisClassEntry().asInternalName()) &&
          value.reader.superclassEntry().get().matches(OBJECT), "Retained ClassReader exposes stable complete class header");
      check(numericPayload(value), "Retained reader typed numeric/entry views match BufWriter payload");
      byte[] first = value.reader.readBytes(value.start, 35), second = value.reader.readBytes(value.start, 35);
      first[0] = 0;
      check(first != second && second[0] == -1 && value.reader.readU1(value.start) == 255, "Reader readBytes is detached and repeatable");
      AttributedElement owner = value.owner;
      boolean linked = owner == model;
      if (owner instanceof FieldModel) linked = ((FieldModel) owner).parent().get() == model;
      else if (owner instanceof MethodModel) linked = ((MethodModel) owner).parent().get() == model;
      else if (owner instanceof CodeModel) linked = ((CodeModel) owner).parent().get().parent().get() == model;
      check(linked, "Deferred retained owner is linked to the returned model");
    }
    check(kindMask == 30, "All four enclosing-element kinds were genuinely decoded");
    mapper.reads.clear(); mapper.expectFresh = true;
    byte[] remapped = context.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model, ClassTransform.ACCEPT_ALL);
    check(mapper.boundWrites == 4, "Fresh pool writes all custom attributes through real destination mappers");
    ClassModel copy = context.parse(remapped); materialize(copy);
    check(mapper.reads.size() == 4, "Fresh pool parse rebinds all four custom owners");
    for (LifecycleAttribute value : mapper.reads) {
      check(numericPayload(value) && "lifeSymbol".equals(value.symbol.stringValue()), "copyBytesTo preserves scalars while writeIndex imports symbol");
      check(value.owner.attributes().contains(value), "Remapped owner attribute access remains legal after parse");
    }
    // Native JDK25 ParserVerifier casts custom-mapped attributes to its own bound
    // values. Verify the same bytes with default raw extension-attribute mapping;
    // the legal custom-mapped lifecycle and fresh-pool path were checked above.
    check(ClassFile.of().verify(remapped).isEmpty(), "Metadata-only default verifier accepts the same remapped lifecycle bytes");
  }
  public static void main(String[] args) {
    optionsAndTables(); lifecycle();
    System.out.println("CLASSFILE_DEBUG_READER_REGRESSION_OK|" + passed);
  }
}
