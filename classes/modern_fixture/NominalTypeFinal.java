package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static classes.modern_test.NominalConstantSupport.check;
import static classes.modern_test.NominalConstantSupport.emit;

/** Original javac21/25 C6 type inputs, with no generated or rewritten carrier. */
public final class NominalTypeFinal {
  private static int classInitializations;
  private static int methodInitializations;

  private static final class ClassPassiveType {
    static { classInitializations++; }
  }

  private static final class MethodPassiveType {
    static { methodInitializations++; }
  }

  public static final class HiddenPayload {
    public HiddenPayload() {}
    public static Class<?> selfClass() { return HiddenPayload.class; }
  }

  private static byte[] payload() throws Exception {
    return NominalConstantSupport.bytes(NominalTypeFinal.class, "NominalTypeFinal$HiddenPayload.class");
  }

  private static void rejectClassDescriptor(String descriptor, Class<?> expected) {
    try { ClassDesc.ofDescriptor(descriptor); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectClassName(String name, boolean internal, Class<?> expected) {
    try {
      if (internal) { ClassDesc.ofInternalName(name); }
      else { ClassDesc.of(name); }
      throw new AssertionError();
    } catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectNested(ClassDesc owner, String name, Class<?> expected) {
    try { owner.nested(name); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectRank(ClassDesc owner, int rank, boolean noArgument, Class<?> expected) {
    try {
      if (noArgument) { owner.arrayType(); }
      else { owner.arrayType(rank); }
      throw new AssertionError();
    } catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectClassResolution(ClassDesc descriptor, MethodHandles.Lookup lookup, Class<?> expected) {
    try { descriptor.resolveConstantDesc(lookup); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectMethodDescriptor(String descriptor, Class<?> expected) {
    try { MethodTypeDesc.ofDescriptor(descriptor); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectMethodArray(ClassDesc returnType, ClassDesc[] parameters, Class<?> expected) {
    try { MethodTypeDesc.of(returnType, parameters); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectMethodList(ClassDesc returnType, List<ClassDesc> parameters, Class<?> expected) {
    try { MethodTypeDesc.of(returnType, parameters); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void rejectMethodBounds(MethodTypeDesc descriptor, int operation, int first, int second) {
    try {
      if (operation == 0) { descriptor.parameterType(first); }
      else if (operation == 1) { descriptor.changeParameterType(first, ClassDesc.ofDescriptor("I")); }
      else if (operation == 2) { descriptor.dropParameterTypes(first, second); }
      else { descriptor.insertParameterTypes(first, ClassDesc.ofDescriptor("J")); }
      throw new AssertionError();
    } catch (Throwable error) {
      // The API specifies a family; an array-backed implementation may use a subclass.
      check(error instanceof IndexOutOfBoundsException);
    }
  }

  private static void rejectMethodResolution(MethodTypeDesc descriptor, MethodHandles.Lookup lookup, Class<?> expected) {
    try { descriptor.resolveConstantDesc(lookup); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == expected); }
  }

  private static void caseClassFactories() {
    ClassDesc binary = ClassDesc.of("java.lang.String");
    ClassDesc internal = ClassDesc.ofInternalName("java/lang/String");
    ClassDesc pair = ClassDesc.of("java.lang", "String");
    check(binary.equals(internal) && binary.equals(pair));
    check(binary.hashCode() == internal.hashCode());
    check("Ljava/lang/String;".equals(binary.descriptorString()));
    check("LPlain;".equals(ClassDesc.of("", "Plain").descriptorString()));
    check(ClassDesc.of("Plain").equals(ClassDesc.ofInternalName("Plain")));
    emit("nc-type-class-factories", "binary/internal/package=same;unnamed=LPlain;equal/hash=consistent");
  }

  private static void caseClassMetadata() {
    ClassDesc plain = ClassDesc.of("Plain");
    check("Plain".equals(plain.displayName()) && "".equals(plain.packageName()));
    check(plain.isClassOrInterface() && !plain.isArray() && !plain.isPrimitive());
    check(plain.componentType() == null);
    check("Map$Entry".equals(ClassDesc.of("java.util.Map$Entry").displayName()));
    String[] codes = {"B", "C", "D", "F", "I", "J", "S", "Z", "V"};
    String[] names = {"byte", "char", "double", "float", "int", "long", "short", "boolean", "void"};
    for (int index = 0; index < codes.length; index++) {
      ClassDesc descriptor = ClassDesc.ofDescriptor(codes[index]);
      check(descriptor.isPrimitive() && !descriptor.isArray() && !descriptor.isClassOrInterface());
      check(names[index].equals(descriptor.displayName()) && "".equals(descriptor.packageName()));
      check(descriptor.componentType() == null);
    }
    emit("nc-type-class-metadata", "unnamed=Plain;member=Map$Entry;primitive/void=9;flags/components=exact");
  }

  private static void caseClassArrays() {
    ClassDesc array = ClassDesc.of("java.lang.String").arrayType(2);
    check("[[Ljava/lang/String;".equals(array.descriptorString()));
    check("String[][]".equals(array.displayName()) && "".equals(array.packageName()));
    check(array.isArray() && !array.isPrimitive() && !array.isClassOrInterface());
    check(array.componentType().equals(ClassDesc.of("java.lang.String").arrayType()));
    check(array.componentType().componentType().equals(ClassDesc.of("java.lang.String")));
    check("Plain[][]".equals(ClassDesc.of("Plain").arrayType(2).displayName()));
    check("long[]".equals(ClassDesc.ofDescriptor("J").arrayType().displayName()));
    check("".equals(ClassDesc.ofDescriptor("I").arrayType().packageName()));
    emit("nc-type-class-arrays", "reference/unnamed/primitive=String[][]/Plain[][]/long[];package=empty;components=exact");
  }

  private static void caseClassNested() {
    ClassDesc outer = ClassDesc.of("p.Outer");
    check("Lp/Outer$Inner;".equals(outer.nested("Inner").descriptorString()));
    check("Lp/Outer$First$Second$Third;".equals(outer.nested("First", "Second", "Third").descriptorString()));
    rejectNested(outer, "bad.name", IllegalArgumentException.class);
    rejectNested(outer, "", IllegalArgumentException.class);
    rejectNested(outer, null, NullPointerException.class);
    rejectNested(ClassDesc.ofDescriptor("I"), "Inner", IllegalStateException.class);
    rejectNested(outer.arrayType(), "Inner", IllegalStateException.class);
    try { outer.nested("First", (String[]) null); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == NullPointerException.class); }
    try { outer.nested("First", new String[] {null}); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == NullPointerException.class); }
    emit("nc-type-class-nested", "nested-levels=1/3;invalid=IllegalArgumentException;null=NullPointerException;nonclass=IllegalStateException");
  }

  private static void caseClassValidation() {
    String[] invalidDescriptors = {"", "[V", "Ljava.lang.String;", "Ljava//lang/String;", "II", "(I)V"};
    for (String invalid : invalidDescriptors) { rejectClassDescriptor(invalid, IllegalArgumentException.class); }
    rejectClassDescriptor(null, NullPointerException.class);
    rejectClassName("java/lang/String", false, IllegalArgumentException.class);
    rejectClassName("java..lang.String", false, IllegalArgumentException.class);
    rejectClassName("", false, IllegalArgumentException.class);
    rejectClassName(null, false, NullPointerException.class);
    rejectClassName("java.lang.String", true, IllegalArgumentException.class);
    rejectClassName("java//lang/String", true, IllegalArgumentException.class);
    rejectClassName("/java/lang/String", true, IllegalArgumentException.class);
    rejectClassName(null, true, NullPointerException.class);
    try { ClassDesc.of("bad..package", "Plain"); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == IllegalArgumentException.class); }
    try { ClassDesc.of("p", "Bad/Name"); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == IllegalArgumentException.class); }
    emit("nc-type-class-validation", "descriptor/binary/internal/package/member=IllegalArgumentException;null=NullPointerException;rejections=17");
  }

  private static void caseClassRank() {
    ClassDesc integer = ClassDesc.ofDescriptor("I");
    ClassDesc largest = integer.arrayType(255);
    check(largest.descriptorString().length() == 256);
    check(integer.arrayType(254).arrayType().equals(largest));
    rejectRank(largest, 0, true, IllegalStateException.class);
    rejectRank(largest, 1, false, IllegalArgumentException.class);
    rejectRank(integer, 256, false, IllegalArgumentException.class);
    rejectRank(integer, 0, false, IllegalArgumentException.class);
    rejectRank(integer, -1, false, IllegalArgumentException.class);
    rejectRank(integer.arrayType(), Integer.MAX_VALUE, false, IllegalArgumentException.class);
    rejectRank(ClassDesc.ofDescriptor("V"), 0, true, IllegalArgumentException.class);
    emit("nc-type-class-rank", "rank255=accepted;noarg-overflow=IllegalStateException;rank/void=IllegalArgumentException;allocation=unclaimed");
  }

  private static void caseClassAccessPassive() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup reduced = lookup.dropLookupMode(MethodHandles.Lookup.PACKAGE);
    ClassDesc descriptor = ClassDesc.of("classes.modern_test.NominalTypeFinal$ClassPassiveType");
    check(classInitializations == 0);
    check(descriptor.resolveConstantDesc(lookup) == ClassPassiveType.class);
    check(descriptor.arrayType(2).resolveConstantDesc(lookup) == ClassPassiveType[][].class);
    rejectClassResolution(descriptor, reduced, IllegalAccessException.class);
    rejectClassResolution(descriptor.arrayType(), reduced, IllegalAccessException.class);
    check(ClassDesc.of("java.lang.String").resolveConstantDesc(MethodHandles.publicLookup()) == String.class);
    check(ClassDesc.ofDescriptor("[[I").resolveConstantDesc(lookup) == int[][].class);
    check(ClassDesc.ofDescriptor("I").resolveConstantDesc(lookup) == int.class);
    check(ClassDesc.ofDescriptor("V").resolveConstantDesc(lookup) == void.class);
    ConstantDesc erased = descriptor;
    check(erased.resolveConstantDesc(lookup) == ClassPassiveType.class);
    rejectClassResolution(ClassDesc.of("classes.modern_test.AbsentNominalType"), lookup, ClassNotFoundException.class);
    rejectClassResolution(ClassDesc.of("java.lang.String"), null, NullPointerException.class);
    check(classInitializations == 0);
    check(lookup.ensureInitialized(ClassPassiveType.class) == ClassPassiveType.class);
    lookup.ensureInitialized(ClassPassiveType.class);
    check(classInitializations == 1);
    emit("nc-type-class-access-passive", "lookup/erased/arrays=exact;reduced=IllegalAccessException;missing=ClassNotFoundException;resolve=passive;explicit-init=once");
  }

  private static void caseClassHiddenNonnominal() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup().defineHiddenClass(payload(), false);
    Class<?> hidden = lookup.lookupClass();
    MethodHandle mirror = lookup.findStatic(hidden, "selfClass", MethodType.methodType(Class.class));
    check((Class<?>) mirror.invokeExact() == hidden);
    Class<?> array = hidden.arrayType();
    check(hidden.isHidden() && !array.isHidden());
    check(!hidden.describeConstable().isPresent() && !array.describeConstable().isPresent());
    rejectClassName(hidden.getName(), false, IllegalArgumentException.class);
    rejectClassDescriptor(hidden.descriptorString(), IllegalArgumentException.class);
    rejectClassDescriptor(array.descriptorString(), IllegalArgumentException.class);
    MethodType parameter = MethodType.methodType(void.class, hidden);
    MethodType result = MethodType.methodType(hidden);
    check(!parameter.describeConstable().isPresent() && !result.describeConstable().isPresent());
    rejectMethodDescriptor(parameter.toMethodDescriptorString(), IllegalArgumentException.class);
    emit("nc-type-class-hidden-nonnominal", "original-payload=self-mirror;hidden/array/methodtype=non-nominal;runtime-name/descriptor=IllegalArgumentException");
  }

  private static void caseMethodFactories() {
    ClassDesc integer = ClassDesc.ofDescriptor("I");
    ClassDesc wide = ClassDesc.ofDescriptor("J");
    ClassDesc text = ClassDesc.of("java.lang.String");
    MethodTypeDesc empty = MethodTypeDesc.of(integer);
    check("()I".equals(empty.descriptorString()) && empty.parameterCount() == 0);
    MethodTypeDesc array = MethodTypeDesc.of(integer, wide, text);
    MethodTypeDesc list = MethodTypeDesc.of(integer, Arrays.asList(wide, text));
    MethodTypeDesc parsed = MethodTypeDesc.ofDescriptor("(JLjava/lang/String;)I");
    check(array.equals(list) && list.equals(parsed) && array.hashCode() == list.hashCode());
    check(MethodTypeDesc.of(integer, new ClassDesc[0]).equals(empty));
    emit("nc-type-method-factories", "noarg/List/varargs/descriptor=exact;equal/hash=consistent;empty=()I");
  }

  private static void caseMethodComponents() {
    MethodTypeDesc descriptor = MethodTypeDesc.ofDescriptor("(J[Ljava/lang/String;I)V");
    check(descriptor.returnType().equals(ClassDesc.ofDescriptor("V")) && descriptor.parameterCount() == 3);
    check(descriptor.parameterType(0).equals(ClassDesc.ofDescriptor("J")));
    check(descriptor.parameterType(1).equals(ClassDesc.of("java.lang.String").arrayType()));
    check(descriptor.parameterType(2).equals(ClassDesc.ofDescriptor("I")));
    check(descriptor.parameterList().size() == 3 && descriptor.parameterArray().length == 3);
    check("(long,String[],int)void".equals(descriptor.displayDescriptor()));
    emit("nc-type-method-components", "return=void;parameters=long/String[]/int;count=3;display=(long,String[],int)void");
  }

  private static void caseMethodImmutability() {
    ClassDesc integer = ClassDesc.ofDescriptor("I");
    ClassDesc wide = ClassDesc.ofDescriptor("J");
    ClassDesc[] source = {integer, wide};
    MethodTypeDesc array = MethodTypeDesc.of(integer, source);
    source[0] = ClassDesc.ofDescriptor("V");
    ClassDesc[] returned = array.parameterArray();
    returned[1] = ClassDesc.ofDescriptor("V");
    check("(IJ)I".equals(array.descriptorString()));
    List<ClassDesc> mutable = new ArrayList<ClassDesc>();
    mutable.add(integer);
    mutable.add(wide);
    MethodTypeDesc list = MethodTypeDesc.of(integer, mutable);
    mutable.clear();
    check(list.equals(array));
    try { list.parameterList().set(0, wide); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == UnsupportedOperationException.class); }
    try { list.parameterList().add(wide); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == UnsupportedOperationException.class); }
    emit("nc-type-method-immutability", "input/returned-arrays=isolated;input-list=isolated;parameter-list=immutable;original=(IJ)I");
  }

  private static void caseMethodChanges() {
    MethodTypeDesc original = MethodTypeDesc.ofDescriptor("(ILjava/lang/String;)J");
    check("(ILjava/lang/String;)V".equals(original.changeReturnType(ClassDesc.ofDescriptor("V")).descriptorString()));
    check("(DLjava/lang/String;)J".equals(original.changeParameterType(0, ClassDesc.ofDescriptor("D")).descriptorString()));
    check("(IBSLjava/lang/String;)J".equals(original.insertParameterTypes(1, ClassDesc.ofDescriptor("B"), ClassDesc.ofDescriptor("S")).descriptorString()));
    check("(I)J".equals(original.dropParameterTypes(1, 2).descriptorString()));
    check(original.dropParameterTypes(0, 0).equals(original));
    check("(ILjava/lang/String;Z)J".equals(original.insertParameterTypes(2, ClassDesc.ofDescriptor("Z")).descriptorString()));
    check("(ILjava/lang/String;)J".equals(original.descriptorString()));
    emit("nc-type-method-changes", "return/parameter/insert/drop=exact;zero-drop=identity-by-value;original=unchanged");
  }

  private static void caseMethodValidation() {
    ClassDesc integer = ClassDesc.ofDescriptor("I");
    String[] invalid = {"(I)Q", "()", "(V)I", "(I)Vx", "I)V", "([V)I", "(Ljava.lang.String;)V"};
    for (String value : invalid) { rejectMethodDescriptor(value, IllegalArgumentException.class); }
    rejectMethodDescriptor(null, NullPointerException.class);
    rejectMethodArray(null, new ClassDesc[0], NullPointerException.class);
    rejectMethodArray(integer, null, NullPointerException.class);
    rejectMethodArray(integer, new ClassDesc[] {null}, NullPointerException.class);
    rejectMethodArray(integer, new ClassDesc[] {ClassDesc.ofDescriptor("V")}, IllegalArgumentException.class);
    rejectMethodList(integer, null, NullPointerException.class);
    rejectMethodList(integer, Arrays.asList((ClassDesc) null), NullPointerException.class);
    rejectMethodList(integer, Arrays.asList(ClassDesc.ofDescriptor("V")), IllegalArgumentException.class);
    try { MethodTypeDesc.of((ClassDesc) null); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == NullPointerException.class); }
    try { MethodTypeDesc.of(integer).changeReturnType(null); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == NullPointerException.class); }
    try { MethodTypeDesc.of(integer, integer).changeParameterType(0, null); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == NullPointerException.class); }
    try { MethodTypeDesc.of(integer).insertParameterTypes(0, ClassDesc.ofDescriptor("V")); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == IllegalArgumentException.class); }
    emit("nc-type-method-validation", "descriptor/void=IllegalArgumentException;return/array/List/element/change-null=NullPointerException;rejections=19");
  }

  private static void caseMethodBounds() {
    MethodTypeDesc descriptor = MethodTypeDesc.ofDescriptor("(IJ)V");
    rejectMethodBounds(descriptor, 0, -1, 0);
    rejectMethodBounds(descriptor, 0, 2, 0);
    rejectMethodBounds(descriptor, 1, -1, 0);
    rejectMethodBounds(descriptor, 1, 2, 0);
    rejectMethodBounds(descriptor, 2, -1, 0);
    rejectMethodBounds(descriptor, 2, 1, 0);
    rejectMethodBounds(descriptor, 2, 0, 3);
    rejectMethodBounds(descriptor, 2, 2, 2);
    rejectMethodBounds(MethodTypeDesc.of(ClassDesc.ofDescriptor("V")), 2, 0, 0);
    rejectMethodBounds(descriptor, 3, -1, 0);
    rejectMethodBounds(descriptor, 3, 3, 0);
    emit("nc-type-method-bounds", "parameter/change/drop/insert=IndexOutOfBoundsException-family;drop-start-is-half-open;rejections=11");
  }

  private static void caseMethodResolution() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodTypeDesc descriptor = MethodTypeDesc.ofDescriptor("(J[Ljava/lang/String;I)V");
    MethodType expected = MethodType.methodType(void.class, long.class, String[].class, int.class);
    MethodType resolved = descriptor.resolveConstantDesc(lookup);
    check(resolved.equals(expected));
    ConstantDesc erased = descriptor;
    check(erased.resolveConstantDesc(lookup).equals(expected));
    check(resolved.describeConstable().isPresent() && resolved.describeConstable().get().equals(descriptor));
    check("(J[Ljava/lang/String;I)V".equals(resolved.descriptorString()));
    check(MethodTypeDesc.ofDescriptor(resolved.toMethodDescriptorString()).equals(descriptor));
    check(MethodTypeDesc.ofDescriptor("([I)Ljava/lang/String;").resolveConstantDesc(MethodHandles.publicLookup())
        .equals(MethodType.methodType(String.class, int[].class)));
    rejectMethodResolution(descriptor, null, NullPointerException.class);
    emit("nc-type-method-resolution", "covariant/erased=MethodType;roundtrip/Constable=exact;public-array=resolved;null-lookup=NullPointerException");
  }

  private static void caseMethodAccessPassive() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup reduced = lookup.dropLookupMode(MethodHandles.Lookup.PACKAGE);
    MethodTypeDesc parameter = MethodTypeDesc.ofDescriptor("(Lclasses/modern_test/NominalTypeFinal$MethodPassiveType;)V");
    MethodTypeDesc result = MethodTypeDesc.ofDescriptor("()Lclasses/modern_test/NominalTypeFinal$MethodPassiveType;");
    MethodTypeDesc array = MethodTypeDesc.ofDescriptor("([Lclasses/modern_test/NominalTypeFinal$MethodPassiveType;)V");
    check(methodInitializations == 0);
    check(parameter.resolveConstantDesc(lookup).parameterType(0) == MethodPassiveType.class);
    check(result.resolveConstantDesc(lookup).returnType() == MethodPassiveType.class);
    check(array.resolveConstantDesc(lookup).parameterType(0) == MethodPassiveType[].class);
    rejectMethodResolution(parameter, reduced, IllegalAccessException.class);
    rejectMethodResolution(result, reduced, IllegalAccessException.class);
    rejectMethodResolution(array, reduced, IllegalAccessException.class);
    check(methodInitializations == 0);
    lookup.ensureInitialized(MethodPassiveType.class);
    lookup.ensureInitialized(MethodPassiveType.class);
    check(methodInitializations == 1);
    emit("nc-type-method-access-passive", "private-return/parameter/array=lookup-checked;reduced=IllegalAccessException;resolution=passive;explicit-init=once");
  }

  public static void main(String[] args) throws Throwable {
    // Canonical constant entry is an explicit scenario precondition. The pinned
    // native25 library's primitive-factory-first cold initialization is separate.
    check("I".equals(ConstantDescs.CD_int.descriptorString()));
    caseClassFactories();
    caseClassMetadata();
    caseClassArrays();
    caseClassNested();
    caseClassValidation();
    caseClassRank();
    caseClassAccessPassive();
    caseClassHiddenNonnominal();
    caseMethodFactories();
    caseMethodComponents();
    caseMethodImmutability();
    caseMethodChanges();
    caseMethodValidation();
    caseMethodBounds();
    caseMethodResolution();
    caseMethodAccessPassive();
    System.out.println("NOMINAL_TYPE_OK");
  }
}
