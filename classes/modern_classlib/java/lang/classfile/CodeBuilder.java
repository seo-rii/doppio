package java.lang.classfile;

import java.lang.classfile.constantpool.FieldRefEntry;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.InvokeDynamicEntry;
import java.lang.classfile.constantpool.InterfaceMethodRefEntry;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.MemberRefEntry;
import java.lang.classfile.constantpool.MethodRefEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.classfile.instruction.ArrayLoadInstruction;
import java.lang.classfile.instruction.ArrayStoreInstruction;
import java.lang.classfile.instruction.DoppioMemoryInstructions;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.classfile.instruction.BranchInstruction;
import java.lang.classfile.instruction.ConvertInstruction;
import java.lang.classfile.instruction.ExceptionCatch;
import java.lang.classfile.instruction.IncrementInstruction;
import java.lang.classfile.instruction.LookupSwitchInstruction;
import java.lang.classfile.instruction.NewObjectInstruction;
import java.lang.classfile.instruction.NewPrimitiveArrayInstruction;
import java.lang.classfile.instruction.NewReferenceArrayInstruction;
import java.lang.classfile.instruction.NewMultiArrayInstruction;
import java.lang.classfile.instruction.TypeCheckInstruction;
import java.lang.classfile.instruction.MonitorInstruction;
import java.lang.classfile.instruction.CharacterRange;
import java.lang.classfile.instruction.LineNumber;
import java.lang.classfile.instruction.LocalVariable;
import java.lang.classfile.instruction.LocalVariableType;
import java.lang.classfile.instruction.NopInstruction;
import java.lang.classfile.instruction.SwitchCase;
import java.lang.classfile.instruction.TableSwitchInstruction;
import java.lang.classfile.instruction.ThrowInstruction;
import java.lang.classfile.instruction.FieldInstruction;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.classfile.instruction.InvokeDynamicInstruction;
import java.lang.classfile.instruction.LoadInstruction;
import java.lang.classfile.instruction.OperatorInstruction;
import java.lang.classfile.instruction.ReturnInstruction;
import java.lang.classfile.instruction.StackInstruction;
import java.lang.classfile.instruction.StoreInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.DynamicCallSiteDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.Objects;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

/** Selected instruction and label-based control-flow builders. */
public interface CodeBuilder extends ClassFileBuilder<CodeElement, CodeBuilder> {
  Label newLabel();
  Label startLabel();
  Label endLabel();
  int receiverSlot();
  int parameterSlot(int parameter);
  int allocateLocal(TypeKind kind);
  interface BlockCodeBuilder extends CodeBuilder {
    Label breakLabel();
  }
  interface CatchBuilder {
    CatchBuilder catching(ClassDesc type, Consumer<BlockCodeBuilder> handler);
    CatchBuilder catchingMulti(List<ClassDesc> types, Consumer<BlockCodeBuilder> handler);
    void catchingAll(Consumer<BlockCodeBuilder> handler);
  }
  default CodeBuilder transforming(CodeTransform transform, Consumer<CodeBuilder> handler) {
    return DoppioBuilders.transforming(this, transform, handler);
  }
  default CodeBuilder block(Consumer<BlockCodeBuilder> handler) { return DoppioBuilders.block(this, handler); }
  default CodeBuilder ifThen(Consumer<BlockCodeBuilder> handler) { return ifThen(Opcode.IFNE, handler); }
  default CodeBuilder ifThen(Opcode opcode, Consumer<BlockCodeBuilder> handler) {
    return DoppioBuilders.ifThen(this, opcode, handler);
  }
  default CodeBuilder ifThenElse(Consumer<BlockCodeBuilder> thenHandler, Consumer<BlockCodeBuilder> elseHandler) {
    return ifThenElse(Opcode.IFNE, thenHandler, elseHandler);
  }
  default CodeBuilder ifThenElse(Opcode opcode, Consumer<BlockCodeBuilder> thenHandler, Consumer<BlockCodeBuilder> elseHandler) {
    return DoppioBuilders.ifThenElse(this, opcode, thenHandler, elseHandler);
  }
  default CodeBuilder trying(Consumer<BlockCodeBuilder> tryHandler, Consumer<CatchBuilder> catchesHandler) {
    return DoppioBuilders.trying(this, tryHandler, catchesHandler);
  }
  default CodeBuilder nop() { return with(NopInstruction.of()); }
  default Label newBoundLabel() { Label label = newLabel(); labelBinding(label); return label; }
  default CodeBuilder labelBinding(Label label) { return with(DoppioClassReader.labelTarget(label)); }
  default CodeBuilder lineNumber(int line) { return with(LineNumber.of(line)); }
  default CodeBuilder characterRange(Label start, Label end, int rangeStart, int rangeEnd, int flags) {
    return with(CharacterRange.of(start, end, rangeStart, rangeEnd, flags));
  }
  default CodeBuilder localVariable(int slot, Utf8Entry name, Utf8Entry descriptor, Label start, Label end) {
    return with(LocalVariable.of(slot, name, descriptor, start, end));
  }
  default CodeBuilder localVariable(int slot, String name, ClassDesc descriptor, Label start, Label end) {
    return localVariable(slot, constantPool().utf8Entry(name), constantPool().utf8Entry(descriptor), start, end);
  }
  default CodeBuilder localVariableType(int slot, Utf8Entry name, Utf8Entry signature, Label start, Label end) {
    return with(LocalVariableType.of(slot, name, signature, start, end));
  }
  default CodeBuilder localVariableType(int slot, String name, Signature signature, Label start, Label end) {
    return localVariableType(slot, constantPool().utf8Entry(name), constantPool().utf8Entry(signature.signatureString()), start, end);
  }
  default CodeBuilder branch(Opcode opcode, Label label) { return with(BranchInstruction.of(opcode, label)); }
  default CodeBuilder goto_(Label label) { return branch(Opcode.GOTO, label); }
  default CodeBuilder goto_w(Label label) { return branch(Opcode.GOTO_W, label); }
  default CodeBuilder ifeq(Label label) { return branch(Opcode.IFEQ, label); }
  default CodeBuilder ifne(Label label) { return branch(Opcode.IFNE, label); }
  default CodeBuilder iflt(Label label) { return branch(Opcode.IFLT, label); }
  default CodeBuilder ifge(Label label) { return branch(Opcode.IFGE, label); }
  default CodeBuilder ifgt(Label label) { return branch(Opcode.IFGT, label); }
  default CodeBuilder ifle(Label label) { return branch(Opcode.IFLE, label); }
  default CodeBuilder if_icmpeq(Label label) { return branch(Opcode.IF_ICMPEQ, label); }
  default CodeBuilder if_icmpne(Label label) { return branch(Opcode.IF_ICMPNE, label); }
  default CodeBuilder if_icmplt(Label label) { return branch(Opcode.IF_ICMPLT, label); }
  default CodeBuilder if_icmpge(Label label) { return branch(Opcode.IF_ICMPGE, label); }
  default CodeBuilder if_icmpgt(Label label) { return branch(Opcode.IF_ICMPGT, label); }
  default CodeBuilder if_icmple(Label label) { return branch(Opcode.IF_ICMPLE, label); }
  default CodeBuilder if_acmpeq(Label label) { return branch(Opcode.IF_ACMPEQ, label); }
  default CodeBuilder if_acmpne(Label label) { return branch(Opcode.IF_ACMPNE, label); }
  default CodeBuilder ifnull(Label label) { return branch(Opcode.IFNULL, label); }
  default CodeBuilder ifnonnull(Label label) { return branch(Opcode.IFNONNULL, label); }
  default CodeBuilder tableswitch(int low, int high, Label defaultTarget, List<SwitchCase> cases) {
    return with(TableSwitchInstruction.of(low, high, defaultTarget, cases));
  }
  default CodeBuilder tableswitch(Label defaultTarget, List<SwitchCase> cases) {
    Objects.requireNonNull(cases);
    if (cases.isEmpty()) throw new IllegalArgumentException("A table switch requires a case range");
    int low = Integer.MAX_VALUE, high = Integer.MIN_VALUE;
    for (SwitchCase entry : cases) {
      low = Math.min(low, Objects.requireNonNull(entry).caseValue());
      high = Math.max(high, entry.caseValue());
    }
    return tableswitch(low, high, defaultTarget, cases);
  }
  default CodeBuilder lookupswitch(Label defaultTarget, List<SwitchCase> cases) {
    return with(LookupSwitchInstruction.of(defaultTarget, cases));
  }
  default CodeBuilder exceptionCatch(Label start, Label end, Label handler, ClassEntry catchType) {
    return exceptionCatch(start, end, handler, Optional.ofNullable(catchType));
  }
  default CodeBuilder exceptionCatch(Label start, Label end, Label handler, Optional<ClassEntry> catchType) {
    return with(ExceptionCatch.of(handler, start, end, catchType));
  }
  default CodeBuilder exceptionCatch(Label start, Label end, Label handler, ClassDesc catchType) {
    return exceptionCatch(start, end, handler, constantPool().classEntry(Objects.requireNonNull(catchType)));
  }
  default CodeBuilder exceptionCatchAll(Label start, Label end, Label handler) {
    return exceptionCatch(start, end, handler, Optional.empty());
  }
  default CodeBuilder athrow() { return with(ThrowInstruction.of()); }
  default CodeBuilder iinc(int slot, int increment) { return with(IncrementInstruction.of(slot, increment)); }
  default CodeBuilder conversion(TypeKind from, TypeKind to) { return with(ConvertInstruction.of(from, to)); }
  default CodeBuilder i2l() { return with(ConvertInstruction.of(Opcode.I2L)); }
  default CodeBuilder i2f() { return with(ConvertInstruction.of(Opcode.I2F)); }
  default CodeBuilder i2d() { return with(ConvertInstruction.of(Opcode.I2D)); }
  default CodeBuilder l2i() { return with(ConvertInstruction.of(Opcode.L2I)); }
  default CodeBuilder l2f() { return with(ConvertInstruction.of(Opcode.L2F)); }
  default CodeBuilder l2d() { return with(ConvertInstruction.of(Opcode.L2D)); }
  default CodeBuilder f2i() { return with(ConvertInstruction.of(Opcode.F2I)); }
  default CodeBuilder f2l() { return with(ConvertInstruction.of(Opcode.F2L)); }
  default CodeBuilder f2d() { return with(ConvertInstruction.of(Opcode.F2D)); }
  default CodeBuilder d2i() { return with(ConvertInstruction.of(Opcode.D2I)); }
  default CodeBuilder d2l() { return with(ConvertInstruction.of(Opcode.D2L)); }
  default CodeBuilder d2f() { return with(ConvertInstruction.of(Opcode.D2F)); }
  default CodeBuilder i2b() { return with(ConvertInstruction.of(Opcode.I2B)); }
  default CodeBuilder i2c() { return with(ConvertInstruction.of(Opcode.I2C)); }
  default CodeBuilder i2s() { return with(ConvertInstruction.of(Opcode.I2S)); }
  default CodeBuilder lcmp() { return with(OperatorInstruction.of(Opcode.LCMP)); }
  default CodeBuilder fcmpl() { return with(OperatorInstruction.of(Opcode.FCMPL)); }
  default CodeBuilder fcmpg() { return with(OperatorInstruction.of(Opcode.FCMPG)); }
  default CodeBuilder dcmpl() { return with(OperatorInstruction.of(Opcode.DCMPL)); }
  default CodeBuilder dcmpg() { return with(OperatorInstruction.of(Opcode.DCMPG)); }
  default CodeBuilder new_(ClassEntry className) { return with(NewObjectInstruction.of(className)); }
  default CodeBuilder new_(ClassDesc className) { return new_(constantPool().classEntry(Objects.requireNonNull(className))); }
  default CodeBuilder arrayLoad(TypeKind kind) { return with(ArrayLoadInstruction.of(DoppioMemoryInstructions.arrayOpcode(kind, false))); }
  default CodeBuilder arrayStore(TypeKind kind) { return with(ArrayStoreInstruction.of(DoppioMemoryInstructions.arrayOpcode(kind, true))); }
  default CodeBuilder iaload() { return with(ArrayLoadInstruction.of(Opcode.IALOAD)); }
  default CodeBuilder laload() { return with(ArrayLoadInstruction.of(Opcode.LALOAD)); }
  default CodeBuilder faload() { return with(ArrayLoadInstruction.of(Opcode.FALOAD)); }
  default CodeBuilder daload() { return with(ArrayLoadInstruction.of(Opcode.DALOAD)); }
  default CodeBuilder aaload() { return with(ArrayLoadInstruction.of(Opcode.AALOAD)); }
  default CodeBuilder baload() { return with(ArrayLoadInstruction.of(Opcode.BALOAD)); }
  default CodeBuilder caload() { return with(ArrayLoadInstruction.of(Opcode.CALOAD)); }
  default CodeBuilder saload() { return with(ArrayLoadInstruction.of(Opcode.SALOAD)); }
  default CodeBuilder iastore() { return with(ArrayStoreInstruction.of(Opcode.IASTORE)); }
  default CodeBuilder lastore() { return with(ArrayStoreInstruction.of(Opcode.LASTORE)); }
  default CodeBuilder fastore() { return with(ArrayStoreInstruction.of(Opcode.FASTORE)); }
  default CodeBuilder dastore() { return with(ArrayStoreInstruction.of(Opcode.DASTORE)); }
  default CodeBuilder aastore() { return with(ArrayStoreInstruction.of(Opcode.AASTORE)); }
  default CodeBuilder bastore() { return with(ArrayStoreInstruction.of(Opcode.BASTORE)); }
  default CodeBuilder castore() { return with(ArrayStoreInstruction.of(Opcode.CASTORE)); }
  default CodeBuilder sastore() { return with(ArrayStoreInstruction.of(Opcode.SASTORE)); }
  default CodeBuilder arraylength() { return with(OperatorInstruction.of(Opcode.ARRAYLENGTH)); }
  default CodeBuilder newarray(TypeKind component) { return with(NewPrimitiveArrayInstruction.of(component)); }
  default CodeBuilder anewarray(ClassEntry component) { return with(NewReferenceArrayInstruction.of(component)); }
  default CodeBuilder anewarray(ClassDesc component) { return anewarray(constantPool().classEntry(component)); }
  default CodeBuilder multianewarray(ClassEntry type, int dimensions) { return with(NewMultiArrayInstruction.of(type, dimensions)); }
  default CodeBuilder multianewarray(ClassDesc type, int dimensions) { return multianewarray(constantPool().classEntry(type), dimensions); }
  default CodeBuilder checkcast(ClassEntry type) { return with(TypeCheckInstruction.of(Opcode.CHECKCAST, type)); }
  default CodeBuilder checkcast(ClassDesc type) { return checkcast(constantPool().classEntry(type)); }
  default CodeBuilder instanceOf(ClassEntry type) { return with(TypeCheckInstruction.of(Opcode.INSTANCEOF, type)); }
  default CodeBuilder instanceOf(ClassDesc type) { return instanceOf(constantPool().classEntry(type)); }
  default CodeBuilder monitorenter() { return with(MonitorInstruction.of(Opcode.MONITORENTER)); }
  default CodeBuilder monitorexit() { return with(MonitorInstruction.of(Opcode.MONITOREXIT)); }
  default CodeBuilder loadLocal(TypeKind kind, int slot) { return with(LoadInstruction.of(kind, slot)); }
  default CodeBuilder storeLocal(TypeKind kind, int slot) { return with(StoreInstruction.of(kind, slot)); }
  default CodeBuilder iload(int slot) { return loadLocal(TypeKind.INT, slot); }
  default CodeBuilder lload(int slot) { return loadLocal(TypeKind.LONG, slot); }
  default CodeBuilder fload(int slot) { return loadLocal(TypeKind.FLOAT, slot); }
  default CodeBuilder dload(int slot) { return loadLocal(TypeKind.DOUBLE, slot); }
  default CodeBuilder aload(int slot) { return loadLocal(TypeKind.REFERENCE, slot); }
  default CodeBuilder istore(int slot) { return storeLocal(TypeKind.INT, slot); }
  default CodeBuilder lstore(int slot) { return storeLocal(TypeKind.LONG, slot); }
  default CodeBuilder fstore(int slot) { return storeLocal(TypeKind.FLOAT, slot); }
  default CodeBuilder dstore(int slot) { return storeLocal(TypeKind.DOUBLE, slot); }
  default CodeBuilder astore(int slot) { return storeLocal(TypeKind.REFERENCE, slot); }
  default CodeBuilder return_(TypeKind kind) { return with(ReturnInstruction.of(kind)); }
  default CodeBuilder return_() { return return_(TypeKind.VOID); }
  default CodeBuilder ireturn() { return return_(TypeKind.INT); }
  default CodeBuilder lreturn() { return return_(TypeKind.LONG); }
  default CodeBuilder freturn() { return return_(TypeKind.FLOAT); }
  default CodeBuilder dreturn() { return return_(TypeKind.DOUBLE); }
  default CodeBuilder areturn() { return return_(TypeKind.REFERENCE); }
  default CodeBuilder loadConstant(int value) { return with(DoppioBuilders.constant(constantPool(), Integer.valueOf(value))); }
  default CodeBuilder loadConstant(long value) { return with(DoppioBuilders.constant(constantPool(), Long.valueOf(value))); }
  default CodeBuilder loadConstant(float value) { return with(DoppioBuilders.constant(constantPool(), Float.valueOf(value))); }
  default CodeBuilder loadConstant(double value) { return with(DoppioBuilders.constant(constantPool(), Double.valueOf(value))); }
  default CodeBuilder loadConstant(ConstantDesc value) { return with(DoppioBuilders.constant(constantPool(), Objects.requireNonNull(value))); }
  default CodeBuilder ldc(ConstantDesc value) { return ldc(constantPool().loadableConstantEntry(Objects.requireNonNull(value))); }
  default CodeBuilder ldc(LoadableConstantEntry entry) {
    Objects.requireNonNull(entry);
    Opcode opcode = entry.typeKind().slotSize() == 2 ? Opcode.LDC2_W : entry.index() <= 255 ? Opcode.LDC : Opcode.LDC_W;
    return with(ConstantInstruction.ofLoad(opcode, entry));
  }
  default CodeBuilder aconst_null() { return with(DoppioBuilders.intrinsic(Opcode.ACONST_NULL)); }
  default CodeBuilder iconst_m1() { return with(DoppioBuilders.intrinsic(Opcode.ICONST_M1)); }
  default CodeBuilder iconst_0() { return with(DoppioBuilders.intrinsic(Opcode.ICONST_0)); }
  default CodeBuilder iconst_1() { return with(DoppioBuilders.intrinsic(Opcode.ICONST_1)); }
  default CodeBuilder iconst_2() { return with(DoppioBuilders.intrinsic(Opcode.ICONST_2)); }
  default CodeBuilder iconst_3() { return with(DoppioBuilders.intrinsic(Opcode.ICONST_3)); }
  default CodeBuilder iconst_4() { return with(DoppioBuilders.intrinsic(Opcode.ICONST_4)); }
  default CodeBuilder iconst_5() { return with(DoppioBuilders.intrinsic(Opcode.ICONST_5)); }
  default CodeBuilder lconst_0() { return with(DoppioBuilders.intrinsic(Opcode.LCONST_0)); }
  default CodeBuilder lconst_1() { return with(DoppioBuilders.intrinsic(Opcode.LCONST_1)); }
  default CodeBuilder fconst_0() { return with(DoppioBuilders.intrinsic(Opcode.FCONST_0)); }
  default CodeBuilder fconst_1() { return with(DoppioBuilders.intrinsic(Opcode.FCONST_1)); }
  default CodeBuilder fconst_2() { return with(DoppioBuilders.intrinsic(Opcode.FCONST_2)); }
  default CodeBuilder dconst_0() { return with(DoppioBuilders.intrinsic(Opcode.DCONST_0)); }
  default CodeBuilder dconst_1() { return with(DoppioBuilders.intrinsic(Opcode.DCONST_1)); }
  default CodeBuilder bipush(int value) { return with(DoppioBuilders.argument(Opcode.BIPUSH, value)); }
  default CodeBuilder sipush(int value) { return with(DoppioBuilders.argument(Opcode.SIPUSH, value)); }
  default CodeBuilder iadd() { return with(OperatorInstruction.of(Opcode.IADD)); }
  default CodeBuilder ladd() { return with(OperatorInstruction.of(Opcode.LADD)); }
  default CodeBuilder fadd() { return with(OperatorInstruction.of(Opcode.FADD)); }
  default CodeBuilder dadd() { return with(OperatorInstruction.of(Opcode.DADD)); }
  default CodeBuilder isub() { return with(OperatorInstruction.of(Opcode.ISUB)); }
  default CodeBuilder lsub() { return with(OperatorInstruction.of(Opcode.LSUB)); }
  default CodeBuilder fsub() { return with(OperatorInstruction.of(Opcode.FSUB)); }
  default CodeBuilder dsub() { return with(OperatorInstruction.of(Opcode.DSUB)); }
  default CodeBuilder imul() { return with(OperatorInstruction.of(Opcode.IMUL)); }
  default CodeBuilder lmul() { return with(OperatorInstruction.of(Opcode.LMUL)); }
  default CodeBuilder fmul() { return with(OperatorInstruction.of(Opcode.FMUL)); }
  default CodeBuilder dmul() { return with(OperatorInstruction.of(Opcode.DMUL)); }
  default CodeBuilder idiv() { return with(OperatorInstruction.of(Opcode.IDIV)); }
  default CodeBuilder ldiv() { return with(OperatorInstruction.of(Opcode.LDIV)); }
  default CodeBuilder fdiv() { return with(OperatorInstruction.of(Opcode.FDIV)); }
  default CodeBuilder ddiv() { return with(OperatorInstruction.of(Opcode.DDIV)); }
  default CodeBuilder irem() { return with(OperatorInstruction.of(Opcode.IREM)); }
  default CodeBuilder lrem() { return with(OperatorInstruction.of(Opcode.LREM)); }
  default CodeBuilder frem() { return with(OperatorInstruction.of(Opcode.FREM)); }
  default CodeBuilder drem() { return with(OperatorInstruction.of(Opcode.DREM)); }
  default CodeBuilder ineg() { return with(OperatorInstruction.of(Opcode.INEG)); }
  default CodeBuilder lneg() { return with(OperatorInstruction.of(Opcode.LNEG)); }
  default CodeBuilder fneg() { return with(OperatorInstruction.of(Opcode.FNEG)); }
  default CodeBuilder dneg() { return with(OperatorInstruction.of(Opcode.DNEG)); }
  default CodeBuilder ishl() { return with(OperatorInstruction.of(Opcode.ISHL)); }
  default CodeBuilder lshl() { return with(OperatorInstruction.of(Opcode.LSHL)); }
  default CodeBuilder ishr() { return with(OperatorInstruction.of(Opcode.ISHR)); }
  default CodeBuilder lshr() { return with(OperatorInstruction.of(Opcode.LSHR)); }
  default CodeBuilder iushr() { return with(OperatorInstruction.of(Opcode.IUSHR)); }
  default CodeBuilder lushr() { return with(OperatorInstruction.of(Opcode.LUSHR)); }
  default CodeBuilder iand() { return with(OperatorInstruction.of(Opcode.IAND)); }
  default CodeBuilder land() { return with(OperatorInstruction.of(Opcode.LAND)); }
  default CodeBuilder ior() { return with(OperatorInstruction.of(Opcode.IOR)); }
  default CodeBuilder lor() { return with(OperatorInstruction.of(Opcode.LOR)); }
  default CodeBuilder ixor() { return with(OperatorInstruction.of(Opcode.IXOR)); }
  default CodeBuilder lxor() { return with(OperatorInstruction.of(Opcode.LXOR)); }
  default CodeBuilder dup() { return with(StackInstruction.of(Opcode.DUP)); }
  default CodeBuilder dup_x1() { return with(StackInstruction.of(Opcode.DUP_X1)); }
  default CodeBuilder dup_x2() { return with(StackInstruction.of(Opcode.DUP_X2)); }
  default CodeBuilder dup2() { return with(StackInstruction.of(Opcode.DUP2)); }
  default CodeBuilder dup2_x1() { return with(StackInstruction.of(Opcode.DUP2_X1)); }
  default CodeBuilder dup2_x2() { return with(StackInstruction.of(Opcode.DUP2_X2)); }
  default CodeBuilder swap() { return with(StackInstruction.of(Opcode.SWAP)); }
  default CodeBuilder pop() { return with(StackInstruction.of(Opcode.POP)); }
  default CodeBuilder pop2() { return with(StackInstruction.of(Opcode.POP2)); }
  default CodeBuilder fieldAccess(Opcode opcode, FieldRefEntry field) { return with(FieldInstruction.of(opcode, field)); }
  default CodeBuilder fieldAccess(Opcode opcode, ClassDesc owner, String name, ClassDesc type) {
    return fieldAccess(opcode, constantPool().fieldRefEntry(owner, name, type));
  }
  default CodeBuilder getfield(ClassDesc owner, String name, ClassDesc type) { return fieldAccess(Opcode.GETFIELD, owner, name, type); }
  default CodeBuilder putfield(ClassDesc owner, String name, ClassDesc type) { return fieldAccess(Opcode.PUTFIELD, owner, name, type); }
  default CodeBuilder getstatic(ClassDesc owner, String name, ClassDesc type) { return fieldAccess(Opcode.GETSTATIC, owner, name, type); }
  default CodeBuilder putstatic(ClassDesc owner, String name, ClassDesc type) { return fieldAccess(Opcode.PUTSTATIC, owner, name, type); }
  default CodeBuilder getfield(FieldRefEntry field) { return fieldAccess(Opcode.GETFIELD, field); }
  default CodeBuilder putfield(FieldRefEntry field) { return fieldAccess(Opcode.PUTFIELD, field); }
  default CodeBuilder getstatic(FieldRefEntry field) { return fieldAccess(Opcode.GETSTATIC, field); }
  default CodeBuilder putstatic(FieldRefEntry field) { return fieldAccess(Opcode.PUTSTATIC, field); }
  default CodeBuilder invoke(Opcode opcode, MemberRefEntry method) { return with(InvokeInstruction.of(opcode, method)); }
  default CodeBuilder invoke(Opcode opcode, ClassDesc owner, String name, MethodTypeDesc type, boolean isInterface) {
    return invoke(opcode, isInterface ? constantPool().interfaceMethodRefEntry(owner, name, type) :
        constantPool().methodRefEntry(owner, name, type));
  }
  default CodeBuilder invokespecial(ClassDesc owner, String name, MethodTypeDesc type) { return invoke(Opcode.INVOKESPECIAL, owner, name, type, false); }
  default CodeBuilder invokespecial(ClassDesc owner, String name, MethodTypeDesc type, boolean isInterface) { return invoke(Opcode.INVOKESPECIAL, owner, name, type, isInterface); }
  default CodeBuilder invokespecial(MethodRefEntry method) { return invoke(Opcode.INVOKESPECIAL, method); }
  default CodeBuilder invokespecial(InterfaceMethodRefEntry method) { return invoke(Opcode.INVOKESPECIAL, method); }
  default CodeBuilder invokestatic(ClassDesc owner, String name, MethodTypeDesc type) { return invoke(Opcode.INVOKESTATIC, owner, name, type, false); }
  default CodeBuilder invokestatic(ClassDesc owner, String name, MethodTypeDesc type, boolean isInterface) { return invoke(Opcode.INVOKESTATIC, owner, name, type, isInterface); }
  default CodeBuilder invokestatic(MethodRefEntry method) { return invoke(Opcode.INVOKESTATIC, method); }
  default CodeBuilder invokestatic(InterfaceMethodRefEntry method) { return invoke(Opcode.INVOKESTATIC, method); }
  default CodeBuilder invokevirtual(ClassDesc owner, String name, MethodTypeDesc type) { return invoke(Opcode.INVOKEVIRTUAL, owner, name, type, false); }
  default CodeBuilder invokevirtual(MethodRefEntry method) { return invoke(Opcode.INVOKEVIRTUAL, method); }
  default CodeBuilder invokeinterface(ClassDesc owner, String name, MethodTypeDesc type) { return invoke(Opcode.INVOKEINTERFACE, owner, name, type, true); }
  default CodeBuilder invokeinterface(InterfaceMethodRefEntry method) { return invoke(Opcode.INVOKEINTERFACE, method); }
  default CodeBuilder invokedynamic(InvokeDynamicEntry entry) { return with(InvokeDynamicInstruction.of(entry)); }
  default CodeBuilder invokedynamic(DynamicCallSiteDesc descriptor) { return invokedynamic(constantPool().invokeDynamicEntry(Objects.requireNonNull(descriptor))); }
}
