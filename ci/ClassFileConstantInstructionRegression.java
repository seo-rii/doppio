package classes.modern_test;

import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeElement;
import java.lang.classfile.CodeModel;
import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.classfile.instruction.ConstantInstruction.ArgumentConstantInstruction;
import java.lang.classfile.instruction.ConstantInstruction.IntrinsicConstantInstruction;
import java.lang.classfile.instruction.ConstantInstruction.LoadConstantInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Factory/value diagnostics: no replacement driver and no generated-class definition. */
public final class ClassFileConstantInstructionRegression {
  private static int checks;

  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void expect(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); }
    catch (Throwable error) {
      check(type.isInstance(error), "Expected " + type.getName() + ", got " + error.getClass().getName());
      return;
    }
    throw new AssertionError("Expected " + type.getName());
  }

  private static void intrinsicValues() {
    Opcode[] opcodes = {Opcode.ACONST_NULL, Opcode.ICONST_M1, Opcode.ICONST_0, Opcode.ICONST_1,
      Opcode.ICONST_2, Opcode.ICONST_3, Opcode.ICONST_4, Opcode.ICONST_5,
      Opcode.LCONST_0, Opcode.LCONST_1, Opcode.FCONST_0, Opcode.FCONST_1, Opcode.FCONST_2,
      Opcode.DCONST_0, Opcode.DCONST_1};
    Object[] values = {ConstantDescs.NULL, Integer.valueOf(-1), Integer.valueOf(0), Integer.valueOf(1),
      Integer.valueOf(2), Integer.valueOf(3), Integer.valueOf(4), Integer.valueOf(5),
      Long.valueOf(0), Long.valueOf(1), Float.valueOf(0), Float.valueOf(1), Float.valueOf(2),
      Double.valueOf(0), Double.valueOf(1)};
    TypeKind[] kinds = {TypeKind.REFERENCE, TypeKind.INT, TypeKind.INT, TypeKind.INT, TypeKind.INT,
      TypeKind.INT, TypeKind.INT, TypeKind.INT, TypeKind.LONG, TypeKind.LONG,
      TypeKind.FLOAT, TypeKind.FLOAT, TypeKind.FLOAT, TypeKind.DOUBLE, TypeKind.DOUBLE};
    for (int index = 0; index < opcodes.length; index++) {
      IntrinsicConstantInstruction instruction = ConstantInstruction.ofIntrinsic(opcodes[index]);
      check(instruction.opcode() == opcodes[index] && instruction.sizeInBytes() == 1, "Intrinsic opcode/size");
      check(instruction.typeKind() == kinds[index], "Intrinsic default typeKind");
      ConstantDesc value = instruction.constantValue();
      check(value.equals(values[index]) && value.getClass() == values[index].getClass(), "Intrinsic nominal boxed value");
      checks++;
    }
  }

  private static void argumentValues() throws Exception {
    for (Opcode opcode : Arrays.asList(Opcode.BIPUSH, Opcode.SIPUSH)) {
      int[] values = opcode == Opcode.BIPUSH ? new int[] {-128, -1, 0, 127} : new int[] {-32768, -129, 128, 32767};
      for (int value : values) {
        ArgumentConstantInstruction instruction = ConstantInstruction.ofArgument(opcode, value);
        Integer boxed = instruction.constantValue();
        check(boxed.intValue() == value, "Real covariant Integer method");
        ConstantInstruction base = instruction;
        ConstantDesc bridged = base.constantValue();
        check((Object) bridged instanceof Integer && boxed.equals(bridged), "Real generated ConstantDesc bridge");
        check(instruction.typeKind() == TypeKind.INT && instruction.opcode() == opcode, "Argument default type/opcode");
        check(instruction.sizeInBytes() == (opcode == Opcode.BIPUSH ? 2 : 3), "Argument size");
        checks++;
      }
    }
    Method typed = ArgumentConstantInstruction.class.getMethod("constantValue");
    check(typed.getReturnType() == Integer.class, "Interface boxed return ABI");
    boolean interfaceBridge = false;
    for (Method method : ArgumentConstantInstruction.class.getDeclaredMethods())
      if (method.getName().equals("constantValue") && method.getReturnType() == ConstantDesc.class)
        interfaceBridge = method.isBridge() && method.isSynthetic() && method.isDefault();
    check(interfaceBridge, "Actual javac synthetic interface bridge");
    boolean valueBridge = false;
    for (Method method : ConstantInstruction.ofArgument(Opcode.SIPUSH, 500).getClass().getDeclaredMethods())
      if (method.getName().equals("constantValue") && method.getReturnType() == ConstantDesc.class)
        valueBridge = method.isBridge() && method.isSynthetic();
    check(valueBridge, "Actual javac concrete bridge");
    checks++;
  }

  private static void loadValues() {
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    List<LoadableConstantEntry> entries = Arrays.<LoadableConstantEntry>asList(pool.intEntry(500), pool.floatEntry(1.25f),
      pool.longEntry(8000000000L), pool.doubleEntry(2.5), pool.stringEntry("constant-abi"),
      pool.classEntry(ConstantDescs.CD_String), pool.methodTypeEntry(MethodTypeDesc.of(ConstantDescs.CD_int)));
    for (LoadableConstantEntry entry : entries) {
      Opcode opcode = entry.typeKind().slotSize() == 2 ? Opcode.LDC2_W : Opcode.LDC;
      LoadConstantInstruction instruction = ConstantInstruction.ofLoad(opcode, entry);
      check(instruction.constantEntry() == entry, "Entry is not replaced by a nominal test codec");
      check(instruction.typeKind() == entry.typeKind() && instruction.opcode() == opcode, "Load native default type");
      check(instruction.constantValue().equals(entry.constantValue()), "Load actual constantValue path");
      check(instruction.sizeInBytes() == (opcode == Opcode.LDC ? 2 : 3), "Load instruction size");
      checks++;
    }
    LoadConstantInstruction narrowWide = ConstantInstruction.ofLoad(Opcode.LDC_W, pool.intEntry(1));
    check(narrowWide.opcode() == Opcode.LDC_W && narrowWide.sizeInBytes() == 3, "Factory retains requested wide opcode");
    LoadConstantInstruction mismatchedLong = ConstantInstruction.ofLoad(Opcode.LDC, pool.longEntry(1));
    LoadConstantInstruction mismatchedInt = ConstantInstruction.ofLoad(Opcode.LDC2_W, pool.intEntry(1));
    check(mismatchedLong.opcode() == Opcode.LDC && mismatchedLong.typeKind() == TypeKind.LONG, "Factory does not verify category");
    check(mismatchedInt.opcode() == Opcode.LDC2_W && mismatchedInt.typeKind() == TypeKind.INT, "Factory preserves mismatched category");
    checks++;
    for (int index = 0; index < 300; index++) pool.stringEntry("prefill-" + index);
    LoadableConstantEntry high = pool.intEntry(99999);
    check(high.index() > 255, "Real high CP index");
    check(ConstantInstruction.ofLoad(Opcode.LDC, high).constantEntry() == high, "Factory does not verify index width");
    checks++;
  }

  private static void factoryErrors() {
    for (Opcode opcode : Arrays.asList(Opcode.NOP, Opcode.BIPUSH, Opcode.SIPUSH, Opcode.LDC, Opcode.LDC_W, Opcode.LDC2_W)) {
      expect(IllegalArgumentException.class, () -> ConstantInstruction.ofIntrinsic(opcode));
      checks++;
    }
    expect(NullPointerException.class, () -> ConstantInstruction.ofIntrinsic(null)); checks++;
    for (int value : new int[] {-129, 128, Integer.MIN_VALUE, Integer.MAX_VALUE}) {
      expect(IllegalArgumentException.class, () -> ConstantInstruction.ofArgument(Opcode.BIPUSH, value)); checks++;
    }
    for (int value : new int[] {-32769, 32768, Integer.MIN_VALUE, Integer.MAX_VALUE}) {
      expect(IllegalArgumentException.class, () -> ConstantInstruction.ofArgument(Opcode.SIPUSH, value)); checks++;
    }
    expect(IllegalArgumentException.class, () -> ConstantInstruction.ofArgument(Opcode.ICONST_0, 0)); checks++;
    expect(IllegalArgumentException.class, () -> ConstantInstruction.ofArgument(null, 0)); checks++;
    expect(NullPointerException.class, () -> ConstantInstruction.ofLoad(null, ConstantPoolBuilder.of().intEntry(0))); checks++;
    expect(NullPointerException.class, () -> ConstantInstruction.ofLoad(Opcode.LDC, null)); checks++;
    expect(IllegalArgumentException.class, () -> ConstantInstruction.ofLoad(Opcode.NOP, null)); checks++;
    expect(IllegalArgumentException.class, () -> ConstantInstruction.ofLoad(Opcode.ICONST_0, ConstantPoolBuilder.of().intEntry(0))); checks++;
  }

  private static void realBuildAndParse() {
    ClassFile classFile = ClassFile.of();
    byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.ConstantInstructionOutput"), builder ->
      builder.withMethodBody("value", MethodTypeDesc.of(ConstantDescs.CD_int), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        code -> code.with(ConstantInstruction.ofIntrinsic(Opcode.ICONST_1))
          .with(ConstantInstruction.ofArgument(Opcode.BIPUSH, 7)).iadd()
          .with(ConstantInstruction.ofArgument(Opcode.SIPUSH, 500)).iadd()
          .with(ConstantInstruction.ofLoad(Opcode.LDC, code.constantPool().intEntry(100000))).iadd().ireturn()));
    check(classFile.verify(bytes).isEmpty(), "Writer output verifies without definition");
    ClassModel model = classFile.parse(bytes);
    CodeModel code = model.methods().get(0).code().get();
    List<ConstantInstruction> values = new ArrayList<ConstantInstruction>();
    for (CodeElement element : code)
      if (element instanceof ConstantInstruction) values.add((ConstantInstruction) element);
    check(values.size() == 4, "Actual parsed constants");
    check(values.get(0) instanceof IntrinsicConstantInstruction, "Parsed intrinsic membership");
    check(values.get(1) instanceof ArgumentConstantInstruction && values.get(2) instanceof ArgumentConstantInstruction,
      "Parsed immediate covariance membership");
    check(values.get(3) instanceof LoadConstantInstruction, "Parsed pool-load membership");
    check(((ArgumentConstantInstruction) values.get(2)).constantValue().intValue() == 500, "Parsed typed Integer invocation");
    checks++;
  }

  public static void main(String[] arguments) throws Exception {
    intrinsicValues(); argumentValues(); loadValues(); factoryErrors(); realBuildAndParse();
    check(checks == 55, "Diagnostic count " + checks);
    System.out.println("CLASSFILE_CONSTANT_INSTRUCTION_REGRESSION_OK|" + checks);
  }
}
