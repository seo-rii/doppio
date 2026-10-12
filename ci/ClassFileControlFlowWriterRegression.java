package classes.modern_test;

import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CodeElement;
import java.lang.classfile.CodeModel;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.Label;
import java.lang.classfile.Opcode;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.instruction.BranchInstruction;
import java.lang.classfile.instruction.SwitchCase;
import java.lang.classfile.instruction.TableSwitchInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.util.Arrays;
import java.util.function.Consumer;

/**
 * Public writer diagnostics, not additions to the native16 C7b inventory.
 * Native and guest execution both exercise default short-jump widening and
 * explicit FAIL_ON_SHORT_JUMPS rejection, without changing the C7b inventory.
 */
public final class ClassFileControlFlowWriterRegression {
  private static final MethodTypeDesc INT_INT = MethodTypeDesc.of(ConstantDescs.CD_int, ConstantDescs.CD_int);
  private static int completed;
  private static Label foreign;

  private static void check(boolean condition, String name) {
    if (!condition) throw new AssertionError(name);
  }

  private static byte[] build(String name, Consumer<CodeBuilder> body) {
    return ClassFile.of().build(ClassDesc.of("classes.modern_test." + name), builder -> {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
      builder.withMethodBody("choose", INT_INT, ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, body);
    });
  }

  private static CodeAttribute code(byte[] bytes) {
    return (CodeAttribute) ClassFile.of().parse(bytes).methods().get(0).code().get();
  }

  private static void valid(byte[] bytes, String name) {
    ClassFile api = ClassFile.of();
    check(api.verify(bytes).isEmpty(), name + ": byte verification");
    check(api.verify(api.parse(bytes)).isEmpty(), name + ": model verification");
  }

  private static void reject(Class<? extends Throwable> expected, Runnable operation, String name) {
    try { operation.run(); }
    catch (Throwable failure) {
      check(failure.getClass() == expected, name + ": wrong exception " + failure.getClass().getName());
      completed++; return;
    }
    throw new AssertionError(name + ": failed operation returned bytes");
  }

  private static void shortOverflow(CodeBuilder builder) {
    Label target = builder.newLabel();
    builder.iload(0).ifeq(target);
    for (int count = 0; count < 33000; count++) builder.nop();
    builder.labelBinding(target).bipush(42).ireturn();
  }

  private static void wideJump(CodeBuilder builder) {
    Label through = builder.newLabel(), target = builder.newLabel();
    builder.iload(0).ifeq(through).goto_w(target).labelBinding(through);
    for (int count = 0; count < 33000; count++) builder.nop();
    builder.labelBinding(target).bipush(42).ireturn();
  }

  private static void sparseTable(CodeBuilder builder) {
    Label low = builder.newLabel(), high = builder.newLabel(), fallback = builder.newLabel();
    builder.iload(0).tableswitch(-2, 2, fallback,
      Arrays.asList(SwitchCase.of(2, high), SwitchCase.of(-2, low)));
    builder.labelBinding(low).bipush(7).ireturn();
    builder.labelBinding(high).bipush(9).ireturn();
    builder.labelBinding(fallback).iconst_m1().ireturn();
  }

  private static void unsortedLookup(CodeBuilder builder) {
    Label low = builder.newLabel(), high = builder.newLabel(), fallback = builder.newLabel();
    builder.iload(0).lookupswitch(fallback,
      Arrays.asList(SwitchCase.of(99, high), SwitchCase.of(-10, low)));
    builder.labelBinding(low).bipush(7).ireturn();
    builder.labelBinding(high).bipush(9).ireturn();
    builder.labelBinding(fallback).iconst_m1().ireturn();
  }

  private static void duplicateLookup(CodeBuilder builder) {
    Label target = builder.newLabel();
    builder.iload(0).lookupswitch(target,
      Arrays.asList(SwitchCase.of(4, target), SwitchCase.of(4, target)));
    builder.labelBinding(target).iconst_0().ireturn();
  }

  private static void duplicateTable(CodeBuilder builder) {
    Label target = builder.newLabel();
    builder.iload(0).tableswitch(4, 4, target,
      Arrays.asList(SwitchCase.of(4, target), SwitchCase.of(4, target)));
    builder.labelBinding(target).iconst_0().ireturn();
  }

  private static void unboundHandler(CodeBuilder builder) {
    Label start = builder.newBoundLabel(), end = builder.newLabel(), handler = builder.newLabel();
    builder.iconst_0().ireturn().labelBinding(end).exceptionCatchAll(start, end, handler);
  }

  private static void handlerAtEnd(CodeBuilder builder) {
    Label start = builder.newBoundLabel(), end = builder.newLabel();
    builder.iconst_0().ireturn().labelBinding(end).exceptionCatchAll(start, end, end);
  }

  private static void sourceBranches(CodeBuilder builder) {
    Label other = builder.newLabel();
    builder.iload(0).ifeq(other).iconst_1().ireturn().labelBinding(other).iconst_0().ireturn();
  }

  private static int integer(byte[] bytes, int cursor) {
    return (bytes[cursor] & 255) << 24 | (bytes[cursor + 1] & 255) << 16 |
      (bytes[cursor + 2] & 255) << 8 | bytes[cursor + 3] & 255;
  }

  private static BranchInstruction branch(CodeModel code) {
    for (CodeElement element : code) if (element instanceof BranchInstruction) return (BranchInstruction) element;
    throw new AssertionError("Missing diagnostic branch");
  }

  private static void wide(boolean nativeOracle) {
    byte[] widened = build("WriterShortOverflow", ClassFileControlFlowWriterRegression::shortOverflow);
    valid(widened, "default short overflow widening");
    boolean automatic = false;
    for (CodeElement element : code(widened))
      if (element instanceof BranchInstruction && ((BranchInstruction) element).opcode() == Opcode.GOTO_W) automatic = true;
    check(automatic, "Automatic overflow widening");
    reject(IllegalArgumentException.class, () -> ClassFile.of(ClassFile.ShortJumpsOption.FAIL_ON_SHORT_JUMPS)
      .build(ClassDesc.of("classes.modern_test.WriterShortOverflowRejected"), builder ->
        builder.withMethodBody("choose", INT_INT, ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
          ClassFileControlFlowWriterRegression::shortOverflow)), "explicit short branch overflow");
    byte[] bytes = build("WriterWideJump", ClassFileControlFlowWriterRegression::wideJump);
    CodeAttribute code = code(bytes); valid(bytes, "explicit goto_w");
    boolean found = false;
    for (CodeElement element : code) if (element instanceof BranchInstruction) {
      BranchInstruction branch = (BranchInstruction) element;
      if (branch.opcode() == Opcode.GOTO_W) {
        check(branch.sizeInBytes() == 5 && code.labelToBci(branch.target()) > 32767, "Real wide displacement");
        found = true;
      }
    }
    check(found && code.maxStack() == 1, "Wide jump Code resources"); completed++;
  }

  private static void switches(boolean nativeOracle) {
    byte[] tableBytes = build("WriterSparseTable", ClassFileControlFlowWriterRegression::sparseTable);
    CodeAttribute table = code(tableBytes); valid(tableBytes, "sparse table");
    TableSwitchInstruction instruction = null;
    for (CodeElement element : table) if (element instanceof TableSwitchInstruction) instruction = (TableSwitchInstruction) element;
    check(instruction != null && instruction.lowValue() == -2 && instruction.highValue() == 2, "Table range");
    byte[] bytes = table.codeArray();
    check((bytes[1] & 255) == 170 && bytes[2] == 0 && bytes[3] == 0, "Real table alignment padding");
    int fallback = integer(bytes, 4);
    check(integer(bytes, 8) == -2 && integer(bytes, 12) == 2, "Real table bounds");
    check(integer(bytes, 20) == fallback && integer(bytes, 24) == fallback && integer(bytes, 28) == fallback,
      "Sparse holes use default offset");
    check(integer(bytes, 16) != fallback && integer(bytes, 32) != fallback, "Sparse endpoints retain targets"); completed++;
    byte[] lookupBytes = build("WriterSortedLookup", ClassFileControlFlowWriterRegression::unsortedLookup);
    CodeAttribute lookup = code(lookupBytes); valid(lookupBytes, "lookup sorting");
    bytes = lookup.codeArray();
    check((bytes[1] & 255) == 171 && integer(bytes, 8) == 2 && integer(bytes, 12) == -10 && integer(bytes, 20) == 99,
      "Lookup pairs must be encoded in ascending key order"); completed++;
    reject(IllegalArgumentException.class,
      () -> build("WriterDuplicateLookup", ClassFileControlFlowWriterRegression::duplicateLookup), "duplicate lookup keys");
    if (nativeOracle) {
      // The native serializer takes the first repeated table key; Doppio
      // rejects this unselected ambiguous recipe instead of choosing silently.
      byte[] duplicate = build("WriterDuplicateTableNative", ClassFileControlFlowWriterRegression::duplicateTable);
      valid(duplicate, "native repeated table key"); completed++;
    } else reject(IllegalArgumentException.class,
      () -> build("WriterDuplicateTable", ClassFileControlFlowWriterRegression::duplicateTable), "duplicate table keys");
  }

  private static void labels(boolean nativeOracle) {
    reject(IllegalArgumentException.class,
      () -> build("WriterUnboundHandler", ClassFileControlFlowWriterRegression::unboundHandler), "unbound handler");
    reject(IllegalArgumentException.class,
      () -> build("WriterEndHandler", ClassFileControlFlowWriterRegression::handlerAtEnd), "handler at code_length");
    ClassFile api = ClassFile.of();
    byte[] original = build("WriterSourceLabels", ClassFileControlFlowWriterRegression::sourceBranches);
    CodeModel independent = code(original.clone());
    foreign = branch(independent).target();
    ClassModel model = api.parse(original);
    reject(IllegalArgumentException.class, () -> api.transformClass(model,
      java.lang.classfile.ClassTransform.transformingMethodBodies((builder, element) -> {
        if (element instanceof BranchInstruction) builder.branch(((BranchInstruction) element).opcode(), foreign);
        else builder.with(element);
      })), "Foreign separately parsed label");
    byte[] transformed = api.transformClass(api.parse(original),
      java.lang.classfile.ClassTransform.transformingMethodBodies(CodeTransform.ACCEPT_ALL));
    valid(transformed, "canonical source labels"); completed++;
  }

  public static void main(String[] arguments) {
    check(arguments.length == 0 || arguments.length == 1 && arguments[0].equals("native"), "Unknown diagnostic mode");
    boolean nativeOracle = arguments.length == 1;
    wide(nativeOracle); switches(nativeOracle); labels(nativeOracle);
    check(completed == 10, "Incomplete writer regression execution");
    System.out.println("CLASSFILE_CONTROL_FLOW_WRITER_REGRESSION_OK|10");
  }
}
