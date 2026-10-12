package java.lang.classfile;

import java.lang.classfile.constantpool.FieldRefEntry;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.MemberRefEntry;
import java.lang.classfile.instruction.ConstantInstruction;
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

/** Basic straight-line builders; unselected control-flow families are separate. */
public interface CodeBuilder extends ClassFileBuilder<CodeElement, CodeBuilder> {
  Label newLabel();
  Label startLabel();
  Label endLabel();
  int receiverSlot();
  int parameterSlot(int parameter);
  int allocateLocal(TypeKind kind);
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
