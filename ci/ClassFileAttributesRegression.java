package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Diagnostic typed codecs and mapper buffer/context semantics, separate from the original javac25 corpus. */
public final class ClassFileAttributesRegression {
  private static final ClassDesc TARGET = ClassDesc.of("classes.modern_test.AttributesRegressionSource");
  private static int completed;
  private static Boolean expectedDirect;

  private static void check(boolean condition, String name) {
    if (!condition) throw new AssertionError(name);
  }
  private static void done() { completed++; }
  private static ClassFile mapped(AttributeMapper<Probe> mapper, ClassFile.Option... options) {
    return ClassFile.of(options).withOptions(ClassFile.AttributeMapperOption.of(name ->
        name.equalsString(mapper.name()) ? mapper : null));
  }
  private static void readonly(List<?> list) {
    try { list.clear(); throw new AssertionError("Attribute list was mutable"); }
    catch (UnsupportedOperationException expected) {}
  }
  private static ConstantPoolBuilder temporaryPool() { return ConstantPoolBuilder.of(); }
  private static byte[] customInput(AttributeMapper<Probe> mapper, int... values) {
    return ClassFile.of().build(TARGET, builder -> {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
      for (int index = 0; index < 300; index++) builder.constantPool().utf8Entry("unused-padding-" + index);
      Utf8Entry text = builder.constantPool().utf8Entry("mapper pool reference");
      for (int value : values) builder.with(new Probe(mapper, text, value, null, 0));
    });
  }
  private static Probe probe(ClassModel model) { return (Probe) model.attributes().get(0); }

  private static final class Probe extends CustomAttribute<Probe> {
    final Utf8Entry text;
    final int value;
    final ClassReader reader;
    final int payloadStart;
    Probe(AttributeMapper<Probe> mapper, Utf8Entry text, int value, ClassReader reader, int start) {
      super(mapper); this.text = text; this.value = value; this.reader = reader; this.payloadStart = start;
    }
  }
  private static AttributeMapper<Probe> mapper(AttributeMapper.AttributeStability stability, boolean multiple) {
    return new AttributeMapper<Probe>() {
      public String name() { return "DoppioC7cDiagnostic"; }
      public AttributeStability stability() { return stability; }
      public boolean allowMultiple() { return multiple; }
      public Probe readAttribute(AttributedElement owner, ClassReader reader, int start) {
        check(owner instanceof ClassModel, "Mapper real enclosing class");
        check(reader.customAttributes().apply(reader.readEntry(start - 6, Utf8Entry.class)) == this, "Reader custom mapper context");
        check(reader.flags() == (ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER), "Reader class flags");
        check(reader.thisClassEntry().asSymbol().equals(TARGET), "Reader class identity");
        check(reader.superclassEntry().get().asSymbol().equals(ConstantDescs.CD_Object), "Reader superclass");
        check(start > 10 && start + reader.readInt(start - 4) <= reader.classfileLength(), "Absolute mapper payload boundary");
        check(reader.readInt(start - 4) == 40, "Mapper full attribute header");
        Utf8Entry text = reader.readEntry(start, Utf8Entry.class);
        check(reader.readEntry(start) == text, "Reader typed/untyped pool identity");
        check(reader.readU1(start + 2) == 255 && reader.readS1(start + 2) == -1, "Reader signed/unsigned byte");
        check(reader.readU2(start + 3) == 65244 && reader.readS2(start + 3) == -292, "Reader signed/unsigned short");
        int value = reader.readInt(start + 5);
        check(reader.readFloat(start + 9) == 1.25f, "Reader float");
        check(reader.readLong(start + 13) == 0x1122334455667788L, "Reader long");
        check(reader.readDouble(start + 21) == 2.5d, "Reader double");
        check(reader.readU2(start + 29) == 34661, "BufWriter integer-byte width");
        check(reader.readEntryOrNull(start + 31) == null && reader.readEntryOrNull(start + 31, Utf8Entry.class) == null,
            "Reader zero nullable pool reference");
        check(Arrays.equals(reader.readBytes(start + 33, 3), new byte[]{6, 7, 8}), "BufWriter byte subrange");
        check(reader.readInt(start + 36) == 0x76543210, "BufWriter patch without size change");
        byte[] detached = reader.readBytes(start + 33, 3); detached[0] = 0;
        check(reader.readU1(start + 33) == 6, "Reader detached bytes");
        return new Probe(this, text, value, reader, start);
      }
      public void writeAttribute(BufWriter writer, Probe value) {
        if (value.reader != null && expectedDirect != null) {
          check(writer.canWriteDirect(value.reader) == expectedDirect.booleanValue(), "BufWriter exact reader provenance");
          check(writer.constantPool().canWriteDirect(value.reader) == expectedDirect.booleanValue(), "Writer pool reader provenance");
        }
        int start = writer.size(); writer.reserveSpace(64);
        check(writer.size() == start, "reserveSpace does not write bytes");
        writer.writeIndex(value.attributeName()); int lengthAt = writer.size(); writer.writeInt(0);
        int payloadStart = writer.size(); writer.writeIndex(value.text);
        if (value.reader != null) value.reader.copyBytesTo(writer, value.payloadStart + 2, 38);
        else {
          writer.writeU1(255); writer.writeU2(65244); writer.writeInt(value.value);
          writer.writeFloat(1.25f); writer.writeLong(0x1122334455667788L); writer.writeDouble(2.5d);
          writer.writeIntBytes(2, 34661); writer.writeIndexOrZero(null);
          writer.writeBytes(new byte[]{5, 6, 7, 8, 9}, 1, 3);
          int patchAt = writer.size(); writer.writeInt(0); writer.patchInt(patchAt, 4, 0x76543210);
        }
        writer.patchInt(lengthAt, 4, writer.size() - payloadStart);
      }
    };
  }

  private static void constantValues() {
    ConstantPoolBuilder pool = temporaryPool();
    List<ConstantValueEntry> entries = Arrays.<ConstantValueEntry>asList(pool.intEntry(42), pool.longEntry(1234567890123L),
        pool.floatEntry(1.5f), pool.doubleEntry(2.25), pool.stringEntry("constant-value text"));
    ClassDesc[] types = {ConstantDescs.CD_int, ConstantDescs.CD_long, ConstantDescs.CD_float,
        ConstantDescs.CD_double, ConstantDescs.CD_String};
    byte[] bytes = ClassFile.of().build(TARGET, builder -> {
      for (int index = 0; index < entries.size(); index++) {
        final int selected = index;
        builder.withField("value" + index, types[index], field -> field
            .withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC | ClassFile.ACC_FINAL)
            .with(ConstantValueAttribute.of(entries.get(selected))));
      }
    });
    ClassFile api = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    ClassModel output = api.parse(api.transformClass(api.parse(bytes), ClassTransform.ACCEPT_ALL));
    for (int index = 0; index < entries.size(); index++) {
      ConstantValueEntry actual = output.fields().get(index).findAttribute(Attributes.constantValue()).get().constant();
      check(actual.constantValue().equals(entries.get(index).constantValue()), "All selected constant-value kinds remapped");
      check(actual.constantPool() == output.constantPool(), "ConstantValue destination pool ownership");
    }
    done();
  }
  private static void signatures() {
    ConstantPoolBuilder pool = temporaryPool();
    byte[] bytes = ClassFile.of().build(TARGET, builder -> {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_ABSTRACT | ClassFile.ACC_SUPER);
      builder.with(SignatureAttribute.of(pool.utf8Entry("<T:Ljava/lang/Object;>Ljava/lang/Object;")));
      builder.withField("generic", ConstantDescs.CD_Object,
          field -> field.withFlags(ClassFile.ACC_PUBLIC).with(SignatureAttribute.of(pool.utf8Entry("TT;"))));
      builder.withMethod("generic", MethodTypeDesc.of(ConstantDescs.CD_Object), ClassFile.ACC_PUBLIC | ClassFile.ACC_ABSTRACT,
          method -> method.with(SignatureAttribute.of(pool.utf8Entry("()TT;"))));
    });
    ClassFile api = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    ClassModel output = api.parse(api.transformClass(api.parse(bytes), ClassTransform.ACCEPT_ALL));
    check(output.findAttribute(Attributes.signature()).get().signature().equalsString("<T:Ljava/lang/Object;>Ljava/lang/Object;"), "Class encoded signature");
    check(output.fields().get(0).findAttribute(Attributes.signature()).get().signature().equalsString("TT;"), "Field encoded signature");
    check(output.methods().get(0).findAttribute(Attributes.signature()).get().signature().equalsString("()TT;"), "Method encoded signature");
    done();
  }
  private static void exceptionList() {
    List<ClassDesc> types = new ArrayList<ClassDesc>(Arrays.asList(ClassDesc.of("java.io.IOException"), ClassDesc.of("java.lang.RuntimeException")));
    ExceptionsAttribute attribute = ExceptionsAttribute.ofSymbols(types); types.clear();
    check(attribute.exceptions().size() == 2, "Exceptions retains detached list"); readonly(attribute.exceptions());
    byte[] bytes = ClassFile.of().build(TARGET, builder -> {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_ABSTRACT | ClassFile.ACC_SUPER);
      builder.withMethod("checked", MethodTypeDesc.of(ConstantDescs.CD_void), ClassFile.ACC_PUBLIC | ClassFile.ACC_ABSTRACT,
          method -> method.with(attribute));
    });
    ClassFile api = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    List<ClassEntry> result = api.parse(api.transformClass(api.parse(bytes), ClassTransform.ACCEPT_ALL)).methods().get(0)
        .findAttribute(Attributes.exceptions()).get().exceptions();
    check(result.size() == 2 && result.get(0).asSymbol().equals(ClassDesc.of("java.io.IOException")), "Exception ordered pool remap");
    readonly(result); done();
  }
  private static void nestsAndInnerClasses() {
    ClassDesc child = ClassDesc.of("classes.modern_test.AttributesRegressionSource$Child");
    InnerClassInfo entry = InnerClassInfo.of(child, Optional.of(TARGET), Optional.of("Child"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC);
    byte[] bytes = ClassFile.of().build(TARGET, builder -> {
      builder.with(NestMembersAttribute.ofSymbols(child)); builder.with(InnerClassesAttribute.of(entry));
    });
    ClassFile api = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    ClassModel result = api.parse(api.transformClass(api.parse(bytes), ClassTransform.ACCEPT_ALL));
    check(result.findAttribute(Attributes.nestMembers()).get().nestMembers().get(0).asSymbol().equals(child), "NestMembers remap");
    InnerClassInfo actual = result.findAttribute(Attributes.innerClasses()).get().classes().get(0);
    check(actual.innerClass().asSymbol().equals(child) && actual.outerClass().get().asSymbol().equals(TARGET) &&
        actual.innerName().get().equalsString("Child") && actual.flagsMask() == entry.flagsMask(), "InnerClasses all references remap");
    byte[] host = ClassFile.of().build(child, builder -> builder.with(NestHostAttribute.of(TARGET)));
    check(api.parse(api.transformClass(api.parse(host), ClassTransform.ACCEPT_ALL)).findAttribute(Attributes.nestHost())
        .get().nestHost().asSymbol().equals(TARGET), "NestHost remap");
    done();
  }
  private static void customRoundTrip(ClassFile.ConstantPoolSharingOption sharing) {
    AttributeMapper<Probe> mapper = mapper(AttributeMapper.AttributeStability.CP_REFS, false);
    ClassFile api = mapped(mapper, sharing); ClassModel source = api.parse(customInput(mapper, 42));
    Probe before = probe(source); check(before.text.index() > 255, "Original CP index wider than byte");
    expectedDirect = sharing == ClassFile.ConstantPoolSharingOption.SHARED_POOL;
    byte[] bytes = api.transformClass(source, ClassTransform.ACCEPT_ALL); expectedDirect = null;
    Probe result = probe(api.parse(bytes)); check(result.value == 42 && result.text.equalsString("mapper pool reference"), "Custom actual writer/read round trip");
    if (sharing == ClassFile.ConstantPoolSharingOption.NEW_POOL) check(result.text.index() < before.text.index(), "CP_REFS custom entry actually rebased");
    else check(result.text.index() == before.text.index(), "SHARED custom entry held index");
    done();
  }
  private static void rawPolicy() {
    AttributeMapper<Probe> mapper = mapper(AttributeMapper.AttributeStability.STATELESS, false);
    byte[] bytes = customInput(mapper, 7);
    for (ClassFile.AttributesProcessingOption policy : ClassFile.AttributesProcessingOption.values()) {
      ClassFile api = ClassFile.of(policy);
      ClassModel result = api.parse(api.transformClass(api.parse(bytes), ClassTransform.ACCEPT_ALL));
      check(result.attributes().size() == (policy == ClassFile.AttributesProcessingOption.PASS_ALL_ATTRIBUTES ? 1 : 0), "Raw unknown processing policy");
    }
    done();
  }
  private static void mappedPolicy() {
    for (AttributeMapper.AttributeStability stability : AttributeMapper.AttributeStability.values()) {
      AttributeMapper<Probe> mapper = mapper(stability, false);
      for (ClassFile.AttributesProcessingOption policy : ClassFile.AttributesProcessingOption.values()) {
        ClassFile api = mapped(mapper, ClassFile.ConstantPoolSharingOption.NEW_POOL, policy);
        Probe result = probe(api.parse(api.transformClass(api.parse(customInput(mapper, 8)), ClassTransform.ACCEPT_ALL)));
        check(result.value == 8, "Mapped CustomAttribute is retained regardless stability and processing option");
      }
    }
    done();
  }
  private static void duplicates() {
    for (boolean multiple : new boolean[]{false, true}) {
      AttributeMapper<Probe> mapper = mapper(AttributeMapper.AttributeStability.STATELESS, multiple);
      ClassFile api = mapped(mapper); List<Attribute<?>> values = api.parse(customInput(mapper, 1, 2)).attributes();
      check(values.size() == (multiple ? 2 : 1), "Mapper allowMultiple serialization policy");
      check(((Probe) values.get(values.size() - 1)).value == 2, "Nonmultiple mapper keeps last occurrence");
    }
    done();
  }
  private static void retainedOptions() {
    AttributeMapper<Probe> mapper = mapper(AttributeMapper.AttributeStability.CP_REFS, false);
    ClassFile api = mapped(mapper, ClassFile.ConstantPoolSharingOption.NEW_POOL).withOptions(ClassFile.StackMapsOption.DROP_STACK_MAPS);
    ClassModel source = api.parse(customInput(mapper, 9));
    Probe before = probe(source); expectedDirect = false;
    byte[] bytes = api.transformClass(source, ClassTransform.ACCEPT_ALL); expectedDirect = null;
    Probe after = probe(api.parse(bytes));
    check(after.value == 9 && after.text.index() < before.text.index(), "withOptions preserves custom mapper and fresh-pool option");
    done();
  }
  private static void verifyMapperPropagation() {
    AttributeMapper<Probe> sourceMapper = mapper(AttributeMapper.AttributeStability.STATELESS, false);
    final int[] reads = {0};
    AttributeMapper<Probe> throwing = new AttributeMapper<Probe>() {
      public String name() { return sourceMapper.name(); }
      public AttributeStability stability() { return AttributeStability.STATELESS; }
      public Probe readAttribute(AttributedElement owner, ClassReader reader, int start) {
        reads[0]++; throw new IllegalStateException("C7c verify mapper callback");
      }
      public void writeAttribute(BufWriter writer, Probe value) { throw new AssertionError("Read-only throwing mapper writer"); }
    };
    try {
      mapped(throwing).verify(customInput(sourceMapper, 10));
      throw new AssertionError("verify(byte[]) ignored custom mapper context");
    } catch (IllegalStateException expected) {
      check(reads[0] == 1 && "C7c verify mapper callback".equals(expected.getMessage()), "verify propagates actual custom reader exception");
    }
    done();
  }
  private static void builtinMapperPrecedence() {
    AttributeMapper<Probe> builtinNamed = new AttributeMapper<Probe>() {
      public String name() { return "SourceDebugExtension"; }
      public AttributeStability stability() { return AttributeStability.STATELESS; }
      public Probe readAttribute(AttributedElement owner, ClassReader reader, int start) {
        throw new AssertionError("An extension mapper cannot override a native built-in");
      }
      public void writeAttribute(BufWriter writer, Probe value) {
        writer.writeIndex(value.attributeName()); writer.writeInt(3); writer.writeBytes(new byte[]{1, 2, 3});
      }
    };
    byte[] bytes = ClassFile.of().build(TARGET, builder -> builder.with(new Probe(builtinNamed,
        temporaryPool().utf8Entry("unused"), 0, null, 0)));
    final int[] callbacks = {0};
    ClassFile api = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL,
        ClassFile.AttributeMapperOption.of(name -> {
          callbacks[0]++; throw new IllegalStateException("Built-in mapper lookup was overridden");
        }));
    ClassModel source = api.parse(bytes);
    check(source.attributes().size() == 1 && source.attributes().get(0).attributeName().equalsString("SourceDebugExtension"),
        "Known unselected attribute uses its default mapping");
    ClassModel result = api.parse(api.transformClass(source, ClassTransform.ACCEPT_ALL));
    check(result.attributes().size() == 1 && result.attributes().get(0).attributeName().equalsString("SourceDebugExtension") &&
        callbacks[0] == 0, "Known built-in bypasses custom mapper lookup during parse and fresh-pool round trip");
    done();
  }
  public static void main(String[] arguments) {
    constantValues(); signatures(); exceptionList(); nestsAndInnerClasses();
    customRoundTrip(ClassFile.ConstantPoolSharingOption.SHARED_POOL);
    customRoundTrip(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    rawPolicy(); mappedPolicy(); duplicates(); retainedOptions(); verifyMapperPropagation(); builtinMapperPrecedence();
    check(completed == 12, "Incomplete selected attributes diagnostic");
    System.out.println("CLASSFILE_ATTRIBUTES_REGRESSION_OK|12");
  }
}
