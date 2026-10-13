package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.*;
import java.lang.reflect.AccessFlag;
import java.util.*;

/** Bounded typed metadata/fresh-pool checks; record/sealing VM recognition is a separate axis. */
public class ClassFileMetadataAttributeRegression {
  private static final ClassDesc OBJECT = ConstantDescs.CD_Object;
  private static int passed;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    passed++;
  }
  private static void require(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
  private static void expect(Class<? extends Throwable> type, Runnable operation, String message) {
    Throwable caught = null;
    try { operation.run(); } catch (Throwable failure) { caught = failure; }
    check(caught != null && type.isInstance(caught), message);
  }
  private static final class Note extends CustomAttribute<Note> {
    final Utf8Entry symbol;
    Note(NoteMapper mapper, Utf8Entry symbol) { super(mapper); this.symbol = symbol; }
  }
  private static final class NoteMapper implements AttributeMapper<Note> {
    int nullOwnerReads, boundWrites;
    public String name() { return "RecordNote"; }
    public AttributeStability stability() { return AttributeStability.CP_REFS; }
    public Note readAttribute(AttributedElement owner, ClassReader reader, int start) {
      require(owner == null, "Native record-component custom mapper has null enclosing owner");
      require(reader.readInt(start - 4) == 2, "Nested custom attribute retains real framing");
      nullOwnerReads++; return new Note(this, reader.readEntry(start, Utf8Entry.class));
    }
    public void writeAttribute(BufWriter writer, Note value) {
      writer.writeIndex(value.attributeName()); writer.writeInt(2); writer.writeIndex(value.symbol); boundWrites++;
    }
  }
  private static byte[] fixture(ClassFile context, NoteMapper mapper) {
    SignatureAttribute signature = SignatureAttribute.of(Signature.parseFrom("Ljava/util/List<Ljava/lang/String;>;"));
    RecordComponentInfo values = RecordComponentInfo.of("values", ClassDesc.of("java.util.List"), signature,
        new Note(mapper, ConstantPoolBuilder.of().utf8Entry("nested-symbol")));
    RecordComponentInfo count = RecordComponentInfo.of("count", ConstantDescs.CD_int, Collections.<Attribute<?>>emptyList());
    MethodParametersAttribute parameters = MethodParametersAttribute.of(
        MethodParameterInfo.of(Optional.of("value"), AccessFlag.FINAL, AccessFlag.SYNTHETIC),
        MethodParameterInfo.ofParameter(Optional.<String>empty(), ClassFile.ACC_MANDATED));
    return context.build(ClassDesc.of("C7dMetadataTarget"), builder -> builder
        .with(RecordAttribute.of(values, count))
        .with(SourceIDAttribute.of("source-id"))
        .with(CompilationIDAttribute.of("compilation-id"))
        .with(EnclosingMethodAttribute.of(ClassDesc.of("metadata.Owner"), Optional.of("enclose"),
            Optional.of(MethodTypeDesc.ofDescriptor("(I)V"))))
        .withMethod("run", MethodTypeDesc.ofDescriptor("(ILjava/lang/String;)I"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
            method -> method.with(parameters).withCode(code -> code.iload(0).ireturn())));
  }
  private static void metadata(ClassModel model, NoteMapper mapper, int expectedReads) {
    RecordAttribute record = model.findAttribute(Attributes.record()).get();
    check(record.components().size() == 2, "Typed record component count");
    RecordComponentInfo values = record.components().get(0), count = record.components().get(1);
    check("values".equals(values.name().stringValue()) && values.descriptorSymbol().equals(ClassDesc.of("java.util.List")),
        "Record component name and descriptor symbol are real UTF/nominal values");
    check(values instanceof AttributedElement && !(((Object) values) instanceof FieldModel), "Record component is attributed, not a fake field");
    check(values.attributes().size() == 2 && values.findAttributes(Attributes.signature()).size() == 1, "Nested typed attribute view and mapper identity");
    check("Ljava/util/List<Ljava/lang/String;>;".equals(values.findAttribute(Attributes.signature()).get().asTypeSignature().signatureString()),
        "Nested record Signature decodes to the genuine field-type tree");
    Note note = values.findAttribute(mapper).get();
    check("nested-symbol".equals(note.symbol.stringValue()) && note.symbol.constantPool() == model.constantPool(), "Nested custom CP reference belongs to parsed destination pool");
    check("count".equals(count.name().stringValue()) && count.descriptorSymbol().equals(ConstantDescs.CD_int) && count.attributes().isEmpty(),
        "Scalar record component has independent empty attribute view");
    check("source-id".equals(model.findAttribute(Attributes.sourceId()).get().sourceId().stringValue()) &&
        "compilation-id".equals(model.findAttribute(Attributes.compilationId()).get().compilationId().stringValue()), "Both typed identifier attributes survive encoding");
    EnclosingMethodAttribute enclosing = model.findAttribute(Attributes.enclosingMethod()).get();
    check(enclosing.enclosingClass().matches(ClassDesc.of("metadata.Owner")) && "enclose".equals(enclosing.enclosingMethodName().get().stringValue()) &&
        "(I)V".equals(enclosing.enclosingMethodType().get().stringValue()) && enclosing.enclosingMethodTypeSymbol().get().equals(MethodTypeDesc.ofDescriptor("(I)V")),
        "Enclosing method name/type defaults retain genuine NameAndType entry");
    List<MethodParameterInfo> parameters = model.methods().get(0).findAttribute(Attributes.methodParameters()).get().parameters();
    check(parameters.size() == 2 && "value".equals(parameters.get(0).name().get().stringValue()), "Method parameter count and optional name");
    check(parameters.get(0).flags().containsAll(Arrays.asList(AccessFlag.FINAL, AccessFlag.SYNTHETIC)) &&
        parameters.get(0).has(AccessFlag.FINAL) && !parameters.get(0).has(AccessFlag.STATIC), "Parameter flag views use METHOD_PARAMETER location");
    check(!parameters.get(1).name().isPresent() && parameters.get(1).has(AccessFlag.MANDATED), "Unnamed mandated parameter retains zero name index");
    int[] traversed = {0}; model.forEach(element -> { if (element instanceof RecordAttribute) traversed[0]++; });
    check(traversed[0] == 1, "Record is a delivered ClassElement");
    expect(UnsupportedOperationException.class, () -> record.components().add(count), "Parsed component list is immutable");
    expect(UnsupportedOperationException.class, () -> values.attributes().clear(), "Parsed nested attribute list is immutable");
    check(mapper.nullOwnerReads == expectedReads, "Nested custom callback sees native null owner once per decoded record");
  }
  private static void factories() {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    Utf8Entry name = pool.utf8Entry("x"), descriptor = pool.utf8Entry("I");
    check(RecordComponentInfo.of(name, descriptor, Collections.<Attribute<?>>emptyList()).descriptorSymbol().equals(ConstantDescs.CD_int) &&
        RecordComponentInfo.of(name, descriptor).name() == name, "Both encoded record-component factory overloads");
    check(RecordComponentInfo.of("s", ConstantDescs.CD_String).descriptorSymbol().equals(ConstantDescs.CD_String), "Nominal varargs record-component factory");
    List<Attribute<?>> attributes = new ArrayList<Attribute<?>>(); attributes.add(SignatureAttribute.of(pool.utf8Entry("I")));
    RecordComponentInfo component = RecordComponentInfo.of("x", ConstantDescs.CD_int, attributes); attributes.clear();
    check(component.attributes().size() == 1, "Unbound component copies attribute list");
    List<RecordComponentInfo> components = new ArrayList<RecordComponentInfo>(); components.add(component);
    RecordAttribute record = RecordAttribute.of(components); components.clear();
    check(record.components().size() == 1, "Unbound Record copies component list");
    PermittedSubclassesAttribute permitted = PermittedSubclassesAttribute.ofSymbols(OBJECT, ConstantDescs.CD_String);
    check(permitted.permittedSubclasses().get(1).matches(ConstantDescs.CD_String), "Nominal permitted varargs import descriptors");
    check(PermittedSubclassesAttribute.of(permitted.permittedSubclasses().get(0)).permittedSubclasses().size() == 1,
        "ClassEntry permitted varargs factory");
    check(!EnclosingMethodAttribute.of(OBJECT, Optional.<String>empty(), Optional.of(MethodTypeDesc.ofDescriptor("()V"))).enclosingMethod().isPresent(),
        "Missing enclosing method name yields absent method");
    check(!EnclosingMethodAttribute.of(OBJECT, Optional.of("run"), Optional.<MethodTypeDesc>empty()).enclosingMethod().isPresent(),
        "Missing enclosing method type yields absent method");
    check(EnclosingMethodAttribute.of(OBJECT, Optional.of("run"), Optional.of(MethodTypeDesc.ofDescriptor("()V"))).enclosingMethodTypeSymbol().get()
        .equals(MethodTypeDesc.ofDescriptor("()V")), "Both nominal optionals create typed method entry");
    check(EnclosingMethodAttribute.of(pool.classEntry(OBJECT), Optional.of(pool.nameAndTypeEntry("run", MethodTypeDesc.ofDescriptor("()V"))))
        .enclosingMethodName().get().stringValue().equals("run"), "Encoded enclosing ClassEntry/NameAndType factory");
    MethodParameterInfo raw = MethodParameterInfo.of(Optional.<Utf8Entry>empty(), -1);
    check(raw.flagsMask() == -1 && raw.has(AccessFlag.FINAL) && !raw.has(AccessFlag.PUBLIC), "Raw parameter mask stays signed; has filters location");
    expect(IllegalArgumentException.class, () -> raw.flags(), "Invalid raw parameter flags are rejected only by flags view");
    check(MethodParameterInfo.ofParameter(Optional.of("p"), 65536).flagsMask() == 65536, "Nominal raw parameter factory preserves out-of-u2 mask");
    check(MethodParameterInfo.of(Optional.of("p"), AccessFlag.FINAL, AccessFlag.MANDATED).flagsMask() == (ClassFile.ACC_FINAL | ClassFile.ACC_MANDATED),
        "Parameter flag varargs converts valid location bits");
    expect(IllegalArgumentException.class, () -> MethodParameterInfo.of(Optional.of("p"), AccessFlag.PUBLIC), "Parameter varargs rejects inapplicable flag");
    expect(NullPointerException.class, () -> RecordAttribute.of(Arrays.asList((RecordComponentInfo) null)), "Record rejects null component");
    expect(NullPointerException.class, () -> RecordComponentInfo.of((Utf8Entry) null, descriptor), "Record component requires name");
    check(SourceIDAttribute.of(name).sourceId() == name && CompilationIDAttribute.of(name).compilationId() == name, "Encoded identifier factories preserve supplied entry identity");
    check(component instanceof ClassFileElement && !(((Object) component) instanceof ClassElement) && !(((Object) component) instanceof FieldElement),
        "RecordComponentInfo has exact attributed-element topology");
    check(MethodParametersAttribute.of(raw).parameters().size() == 1 && MethodParametersAttribute.of(raw) instanceof MethodElement &&
        !(((Object) MethodParametersAttribute.of(raw)) instanceof ClassElement), "MethodParameters list/varargs and element topology");
  }
  private static void permitted() {
    ClassFile context = ClassFile.of();
    ClassDesc first = ClassDesc.of("metadata.First"), second = ClassDesc.of("metadata.Second");
    byte[] bytes = context.build(ClassDesc.of("C7dPermittedMetadataTarget"), builder -> builder
        .with(PermittedSubclassesAttribute.ofSymbols(Arrays.asList(first, second))));
    ClassModel model = context.parse(bytes);
    List<ClassEntry> entries = model.findAttribute(Attributes.permittedSubclasses()).get().permittedSubclasses();
    check(entries.size() == 2 && entries.get(0).matches(first) && entries.get(1).matches(second), "Typed permitted descriptor order");
    check(entries.get(0).constantPool() == model.constantPool() && entries.get(1).constantPool() == model.constantPool(), "Permitted ClassEntries belong to parsed pool");
    ClassModel copy = context.parse(context.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model, ClassTransform.ACCEPT_ALL));
    check(copy.constantPool() != model.constantPool() && copy.findAttribute(Attributes.permittedSubclasses()).get().permittedSubclasses().get(1).matches(second),
        "Fresh-pool permitted entries are imported semantically");
    expect(UnsupportedOperationException.class, () -> entries.clear(), "Permitted parsed list is immutable");
  }
  public static void main(String[] args) {
    factories(); permitted();
    NoteMapper mapper = new NoteMapper();
    ClassFile context = ClassFile.of(ClassFile.AttributeMapperOption.of(name -> "RecordNote".equals(name.stringValue()) ? mapper : null));
    byte[] bytes = fixture(context, mapper); ClassModel model = context.parse(bytes); metadata(model, mapper, 1);
    mapper.boundWrites = 0;
    byte[] imported = context.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model, ClassTransform.ACCEPT_ALL);
    check(mapper.boundWrites == 1, "Fresh-pool record recursively invokes nested custom semantic writer");
    metadata(context.parse(imported), mapper, 2);
    System.out.println("CLASSFILE_METADATA_ATTRIBUTE_REGRESSION_OK|" + passed);
  }
}
