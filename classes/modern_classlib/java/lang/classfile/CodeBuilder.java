package java.lang.classfile;

import java.lang.classfile.constantpool.FieldRefEntry;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.MemberRefEntry;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.classfile.instruction.BranchInstruction;
import java.lang.classfile.instruction.ConvertInstruction;
import java.lang.classfile.instruction.ExceptionCatch;
import java.lang.classfile.instruction.IncrementInstruction;
import java.lang.classfile.instruction.LookupSwitchInstruction;
import java.lang.classfile.instruction.NewObjectInstruction;
import java.lang.classfile.instruction.NopInstruction;
import java.lang.classfile.instruction.SwitchCase;
import java.lang.classfile.instruction.TableSwitchInstruction;
import java.lang.classfile.instruction.ThrowInstruction;
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
import java.util.Objects;
import java.util.List;
import java.util.Optional;

/** Selected instruction and label-based control-flow builders. */
public interface CodeBuilder extends ClassFileBuilder<CodeElement, CodeBuilder> {
  Label newLabel();
  Label startLabel();
  Label endLabel();
  int receiverSlot();
  int parameterSlot(int parameter);
  int allocateLocal(TypeKind kind);
  default CodeBuilder nop() { return with(NopInstruction.of()); }
  default Label newBoundLabel() { Label label = newLabel(); labelBinding(label); return label; }
  default CodeBuilder labelBinding(Label label) { return with(DoppioClassReader.labelTarget(label)); }
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
    Opcode opcode = entry.tag() == 5 || entry.tag() == 6 ? Opcode.LDC2_W : entry.index() <= 255 ? Opcode.LDC : Opcode.LDC_W;
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
  default CodeBuilder dsub() { return with(OperatorInstruction.of(Opcode.DSUB)); }
  default CodeBuilder dup() { return with(StackInstruction.of(Opcode.DUP)); }
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
  default CodeBuilder invokestatic(ClassDesc owner, String name, MethodTypeDesc type) { return invoke(Opcode.INVOKESTATIC, owner, name, type, false); }
  default CodeBuilder invokevirtual(ClassDesc owner, String name, MethodTypeDesc type) { return invoke(Opcode.INVOKEVIRTUAL, owner, name, type, false); }
  default CodeBuilder invokeinterface(ClassDesc owner, String name, MethodTypeDesc type) { return invoke(Opcode.INVOKEINTERFACE, owner, name, type, true); }
}
