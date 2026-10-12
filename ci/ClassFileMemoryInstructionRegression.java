package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.*;
import java.util.Arrays;

/** Exact factory/value and real writer/reader diagnostics, never class definition. */
public final class ClassFileMemoryInstructionRegression {
  private static int checks;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }
  private static void expect(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); }
    catch (Throwable error) {
      check(type.isInstance(error), "Expected " + type.getName() + ", got " + error.getClass().getName());
      checks++;
      return;
    }
    throw new AssertionError("Expected " + type.getName());
  }

  private static void arrayValues() {
    Opcode[] loads = {Opcode.IALOAD, Opcode.LALOAD, Opcode.FALOAD, Opcode.DALOAD, Opcode.AALOAD,
      Opcode.BALOAD, Opcode.CALOAD, Opcode.SALOAD};
    Opcode[] stores = {Opcode.IASTORE, Opcode.LASTORE, Opcode.FASTORE, Opcode.DASTORE, Opcode.AASTORE,
      Opcode.BASTORE, Opcode.CASTORE, Opcode.SASTORE};
    TypeKind[] kinds = {TypeKind.INT, TypeKind.LONG, TypeKind.FLOAT, TypeKind.DOUBLE, TypeKind.REFERENCE,
      TypeKind.BYTE, TypeKind.CHAR, TypeKind.SHORT};
    for (int index = 0; index < kinds.length; index++) {
      ArrayLoadInstruction load = ArrayLoadInstruction.of(loads[index]);
      ArrayStoreInstruction store = ArrayStoreInstruction.of(stores[index]);
      check(load.opcode() == loads[index] && load.sizeInBytes() == 1 && load.typeKind() == kinds[index], "Array-load type/opcode");
      check(store.opcode() == stores[index] && store.sizeInBytes() == 1 && store.typeKind() == kinds[index], "Array-store type/opcode");
      checks += 2;
    }
    for (TypeKind kind : Arrays.asList(TypeKind.BOOLEAN, TypeKind.BYTE, TypeKind.CHAR, TypeKind.SHORT,
        TypeKind.INT, TypeKind.LONG, TypeKind.FLOAT, TypeKind.DOUBLE)) {
      NewPrimitiveArrayInstruction instruction = NewPrimitiveArrayInstruction.of(kind);
      check(instruction.opcode() == Opcode.NEWARRAY && instruction.sizeInBytes() == 2 && instruction.typeKind() == kind,
        "Primitive array preserves exact component kind");
      checks++;
    }
  }

  private static void referenceValues() {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    ClassEntry object = pool.classEntry(ConstantDescs.CD_Object), array = pool.classEntry(ConstantDescs.CD_int.arrayType(2));
    for (ClassEntry component : Arrays.asList(object, array)) {
      NewReferenceArrayInstruction instruction = NewReferenceArrayInstruction.of(component);
      check(instruction.opcode() == Opcode.ANEWARRAY && instruction.sizeInBytes() == 3 && instruction.componentType() == component,
        "Reference array retains genuine CP entry, including array components");
      checks++;
    }
    for (int dimensions : new int[] {1, 2, 255}) {
      NewMultiArrayInstruction instruction = NewMultiArrayInstruction.of(array, dimensions);
      check(instruction.opcode() == Opcode.MULTIANEWARRAY && instruction.sizeInBytes() == 4 && instruction.arrayType() == array &&
        instruction.dimensions() == dimensions, "Multiarray encoded dimension count");
      checks++;
    }
    check(NewMultiArrayInstruction.of(object, 1).arrayType() == object, "Factory intentionally does not verify array descriptor"); checks++;
    check(NewMultiArrayInstruction.of(array, 3).dimensions() == 3, "Factory intentionally does not verify actual array rank"); checks++;
    for (Opcode opcode : Arrays.asList(Opcode.CHECKCAST, Opcode.INSTANCEOF)) {
      TypeCheckInstruction entry = TypeCheckInstruction.of(opcode, object);
      TypeCheckInstruction nominal = TypeCheckInstruction.of(opcode, ConstantDescs.CD_String);
      check(entry.opcode() == opcode && entry.type() == object && entry.sizeInBytes() == 3, "Type-check actual CP entry");
      check(nominal.opcode() == opcode && nominal.type().asSymbol().equals(ConstantDescs.CD_String), "Type-check nominal factory");
      checks += 2;
    }
    check(TypeCheckInstruction.of(Opcode.CHECKCAST, ConstantDescs.CD_String).type() !=
      TypeCheckInstruction.of(Opcode.INSTANCEOF, ConstantDescs.CD_String).type(), "Nominal factories produce distinct unbound values"); checks++;
    for (Opcode opcode : Arrays.asList(Opcode.MONITORENTER, Opcode.MONITOREXIT)) {
      MonitorInstruction instruction = MonitorInstruction.of(opcode);
      check(instruction.opcode() == opcode && instruction.sizeInBytes() == 1, "Monitor exact opcode/size"); checks++;
    }
  }

  private static void factoryErrors() {
    ClassEntry object = ConstantPoolBuilder.of().classEntry(ConstantDescs.CD_Object);
    expect(IllegalArgumentException.class, () -> ArrayLoadInstruction.of(Opcode.IASTORE));
    expect(NullPointerException.class, () -> ArrayLoadInstruction.of(null));
    expect(IllegalArgumentException.class, () -> ArrayStoreInstruction.of(Opcode.IALOAD));
    expect(NullPointerException.class, () -> ArrayStoreInstruction.of(null));
    expect(IllegalArgumentException.class, () -> NewPrimitiveArrayInstruction.of(TypeKind.REFERENCE));
    expect(IllegalArgumentException.class, () -> NewPrimitiveArrayInstruction.of(TypeKind.VOID));
    expect(NullPointerException.class, () -> NewPrimitiveArrayInstruction.of(null));
    expect(NullPointerException.class, () -> NewReferenceArrayInstruction.of(null));
    for (int dimensions : new int[] {-1, 0, 256, Integer.MIN_VALUE, Integer.MAX_VALUE})
      expect(IllegalArgumentException.class, () -> NewMultiArrayInstruction.of(object, dimensions));
    expect(IllegalArgumentException.class, () -> NewMultiArrayInstruction.of(null, 0));
    expect(NullPointerException.class, () -> NewMultiArrayInstruction.of(null, 1));
    expect(IllegalArgumentException.class, () -> TypeCheckInstruction.of(Opcode.NOP, object));
    expect(IllegalArgumentException.class, () -> TypeCheckInstruction.of(Opcode.NOP, (ClassEntry) null));
    expect(NullPointerException.class, () -> TypeCheckInstruction.of(Opcode.CHECKCAST, (ClassEntry) null));
    expect(NullPointerException.class, () -> TypeCheckInstruction.of(null, object));
    expect(IllegalArgumentException.class, () -> TypeCheckInstruction.of(Opcode.CHECKCAST, ConstantDescs.CD_int));
    expect(IllegalArgumentException.class, () -> TypeCheckInstruction.of(null, ConstantDescs.CD_int));
    expect(NullPointerException.class, () -> TypeCheckInstruction.of(Opcode.NOP, (ClassDesc) null));
    expect(NullPointerException.class, () -> TypeCheckInstruction.of(Opcode.CHECKCAST, (ClassDesc) null));
    expect(IllegalArgumentException.class, () -> MonitorInstruction.of(Opcode.NOP));
    expect(NullPointerException.class, () -> MonitorInstruction.of(null));
  }

  private static void temporaryEntries() {
    ClassEntry first = TypeCheckInstruction.of(Opcode.CHECKCAST, ConstantDescs.CD_String).type();
    ClassEntry second = TypeCheckInstruction.of(Opcode.INSTANCEOF, ConstantDescs.CD_String).type();
    check(first != second && first.name() != second.name(), "Distinct genuine temporary entries");
    check(first.index() == -2 && first.name().index() == -1, "Native unbound indexes, not arbitrary regular-pool slots");
    check(first.constantPool() == second.constantPool() && first.name().constantPool() == first.constantPool(), "Shared real temporary owner");
    check(first.constantPool() instanceof ConstantPoolBuilder, "Temporary owner preserves builder ABI"); checks++;
    ConstantPoolBuilder pool = (ConstantPoolBuilder) first.constantPool();
    expect(UnsupportedOperationException.class, () -> pool.size());
    expect(UnsupportedOperationException.class, () -> pool.entryByIndex(1));
    expect(UnsupportedOperationException.class, () -> pool.entryByIndex(1, ClassEntry.class));
    expect(UnsupportedOperationException.class, () -> pool.entryByIndex(1, null));
    expect(UnsupportedOperationException.class, () -> pool.bootstrapMethodCount());
    expect(UnsupportedOperationException.class, () -> pool.bootstrapMethodEntry(0));
    expect(UnsupportedOperationException.class, () -> pool.iterator().hasNext());
    check(!pool.canWriteDirect(pool) && !pool.canWriteDirect(ConstantPoolBuilder.of()), "Temporary owner never grants raw-copy authority"); checks++;
    expect(NullPointerException.class, () -> pool.canWriteDirect(null));
    Utf8Entry name = pool.utf8Entry("java/lang/String");
    ClassEntry type = pool.classEntry(name);
    check(name.index() == -1 && type.index() == -2 && type.name() == name && type.constantPool() == pool, "Real unbound semantic child"); checks++;
    check(pool.intEntry(42).index() == -1 && pool.intEntry(42).intValue() == 42, "Temporary integer value");
    check(pool.floatEntry(1.25f).index() == -1 && pool.floatEntry(1.25f).floatValue() == 1.25f, "Temporary float value");
    check(pool.longEntry(4000000000L).index() == -1 && pool.longEntry(1).width() == 2, "Temporary wide long");
    check(pool.doubleEntry(2.5).index() == -1 && pool.doubleEntry(1).width() == 2, "Temporary wide double"); checks++;
    NameAndTypeEntry member = pool.nameAndTypeEntry(pool.utf8Entry("length"), pool.utf8Entry("()I"));
    MethodRefEntry method = pool.methodRefEntry(type, member);
    check(member.index() == -3 && method.index() == -3 && method.owner() == type && method.nameAndType() == member,
      "Real unbound member graph preserves semantic references"); checks++;
    StringEntry string = pool.stringEntry(name);
    check(string.index() == -2 && string.utf8() == name && string.stringValue().equals("java/lang/String"), "Real unbound string"); checks++;
    expect(UnsupportedOperationException.class, () -> pool.methodTypeEntry((Utf8Entry) null));
    expect(UnsupportedOperationException.class, () -> pool.methodTypeEntry((MethodTypeDesc) null));
    expect(UnsupportedOperationException.class, () -> pool.methodHandleEntry(0, null));
    expect(UnsupportedOperationException.class, () -> pool.bsmEntry((MethodHandleEntry) null, null));
    expect(UnsupportedOperationException.class, () -> pool.constantDynamicEntry(null, null));
    expect(UnsupportedOperationException.class, () -> pool.invokeDynamicEntry(null, null));
    ClassFile classFile = ClassFile.of();
    byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.MemoryNominalCast"), builder ->
      builder.withMethodBody("value", MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_Object),
        ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        code -> code.aload(0).with(TypeCheckInstruction.of(Opcode.CHECKCAST, ConstantDescs.CD_String)).areturn()));
    check(classFile.verify(bytes).isEmpty(), "Unbound nominal operand imports into a genuine indexed output");
    ClassModel model = classFile.parse(bytes);
    int casts = 0;
    for (CodeElement element : model.methods().get(0).code().get()) if (element instanceof TypeCheckInstruction) {
      ClassEntry imported = ((TypeCheckInstruction) element).type();
      check(imported.index() > 0 && imported.name().index() > 0 && imported.constantPool() == model.constantPool() &&
        imported.asSymbol().equals(ConstantDescs.CD_String), "No negative index or temporary ownership leaks into encoded bytes");
      casts++;
    }
    check(casts == 1 && first.index() == -2, "Imported output did not mutate the nominal source"); checks++;
  }

  private static void genericArrayAliases() {
    ClassFile classFile = ClassFile.of();
    for (TypeKind kind : Arrays.asList(TypeKind.BOOLEAN, TypeKind.BYTE, TypeKind.CHAR, TypeKind.SHORT,
        TypeKind.INT, TypeKind.LONG, TypeKind.FLOAT, TypeKind.DOUBLE, TypeKind.REFERENCE)) {
      byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.MemoryArray" + kind.name()), builder ->
        builder.withMethodBody("value", MethodTypeDesc.of(kind.upperBound()), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
          code -> {
            code.iconst_1();
            if (kind == TypeKind.REFERENCE) code.anewarray(ConstantDescs.CD_Object); else code.newarray(kind);
            code.dup().iconst_0();
            if (kind == TypeKind.REFERENCE) code.aconst_null();
            else if (kind == TypeKind.LONG) code.lconst_1();
            else if (kind == TypeKind.FLOAT) code.fconst_1();
            else if (kind == TypeKind.DOUBLE) code.dconst_1();
            else code.iconst_1();
            code.arrayStore(kind).iconst_0().arrayLoad(kind).return_(kind);
          }));
      check(classFile.verify(bytes).isEmpty(), "Actual generic-array builder output verifies");
      CodeModel code = classFile.parse(bytes).methods().get(0).code().get();
      int counts = 0;
      for (CodeElement element : code) {
        if (element instanceof ArrayLoadInstruction) {
          check(((ArrayLoadInstruction) element).typeKind() == (kind == TypeKind.BOOLEAN ? TypeKind.BYTE : kind), "Parsed array-load membership/kind");
          counts++;
        }
        if (element instanceof ArrayStoreInstruction) {
          check(((ArrayStoreInstruction) element).typeKind() == (kind == TypeKind.BOOLEAN ? TypeKind.BYTE : kind), "Parsed array-store membership/kind");
          counts++;
        }
        if (element instanceof NewPrimitiveArrayInstruction) {
          check(((NewPrimitiveArrayInstruction) element).typeKind() == kind, "Parsed primitive component kind"); counts++;
        }
        if (element instanceof NewReferenceArrayInstruction) counts++;
      }
      check(counts == 3, "Three genuinely parsed memory instruction models"); checks++;
    }
    expect(IllegalArgumentException.class, () -> classFile.build(ClassDesc.of("classes.modern_test.MemoryVoidLoad"),
      builder -> builder.withMethodBody("value", MethodTypeDesc.of(ConstantDescs.CD_void), ClassFile.ACC_STATIC,
        code -> code.arrayLoad(TypeKind.VOID))));
    expect(NullPointerException.class, () -> classFile.build(ClassDesc.of("classes.modern_test.MemoryNullStore"),
      builder -> builder.withMethodBody("value", MethodTypeDesc.of(ConstantDescs.CD_void), ClassFile.ACC_STATIC,
        code -> code.arrayStore(null))));
  }

  public static void main(String[] arguments) {
    arrayValues(); referenceValues(); factoryErrors(); temporaryEntries(); genericArrayAliases();
    System.out.println("CLASSFILE_MEMORY_INSTRUCTION_REGRESSION_OK|" + checks);
  }
}
