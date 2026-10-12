package classes.modern_test;

import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CodeElement;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.Label;
import java.lang.classfile.Opcode;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.instruction.BranchInstruction;
import java.lang.classfile.instruction.LookupSwitchInstruction;
import java.lang.classfile.instruction.SwitchCase;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.util.Arrays;
import java.util.function.Consumer;

/** Public option and actual-layout diagnostics, separate from the original32 inventory. */
public final class ClassFileInstructionWriterRegression {
  private static final MethodTypeDesc INT_INT = MethodTypeDesc.of(ConstantDescs.CD_int, ConstantDescs.CD_int);
  private static int completed;
  private static boolean progress;

  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }
  private static void reject(Runnable operation, String message) {
    try { operation.run(); }
    catch (IllegalArgumentException expected) {
      completed++; if (progress) System.err.println("WRITER_PROGRESS|" + completed + "|" + message); return;
    }
    throw new AssertionError(message);
  }
  private static byte[] build(ClassFile api, String name, Consumer<CodeBuilder> body) {
    if (progress) System.err.println("WRITER_STAGE|build-start|" + name + "|" + System.currentTimeMillis());
    byte[] result = api.build(ClassDesc.of("classes.modern_test." + name), builder ->
      builder.withMethodBody("choose", INT_INT, ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, body));
    if (progress) System.err.println("WRITER_STAGE|build-done|" + name + "|" + System.currentTimeMillis());
    return result;
  }
  private static CodeAttribute code(byte[] bytes) {
    return (CodeAttribute) ClassFile.of().parse(bytes).methods().get(0).code().get();
  }
  private static void valid(byte[] bytes, String message) {
    ClassFile api = ClassFile.of();
    if (progress) System.err.println("WRITER_STAGE|verify-start|" + message + "|" + System.currentTimeMillis());
    check(api.verify(bytes).isEmpty(), message + ": bytes");
    if (progress) System.err.println("WRITER_STAGE|verify-bytes-done|" + message + "|" + System.currentTimeMillis());
    check(api.verify(api.parse(bytes)).isEmpty(), message + ": model");
    if (progress) System.err.println("WRITER_STAGE|verify-model-done|" + message + "|" + System.currentTimeMillis());
    completed++;
    if (progress) System.err.println("WRITER_PROGRESS|" + completed + "|" + message);
  }
  private static void nops(CodeBuilder code, int count) {
    for (int index = 0; index < count; index++) code.nop();
  }
  private static void longSwitch(CodeBuilder code) {
    Label target = code.newLabel(), through = code.newLabel();
    code.iload(0).ifeq(target).iload(0).lookupswitch(target, Arrays.asList(SwitchCase.of(1, through)));
    code.labelBinding(through); nops(code, 33000);
    code.labelBinding(target).bipush(7).ireturn();
  }
  private static void backward(CodeBuilder code) {
    Label start = code.newBoundLabel(), end = code.newLabel();
    code.iload(0).ifeq(end); nops(code, 33000);
    code.iinc(0, -1).iload(0).ifne(start).labelBinding(end).bipush(9).ireturn();
  }
  private static void longGoto(CodeBuilder code) {
    Label through = code.newLabel(), target = code.newLabel();
    code.iload(0).ifeq(through).goto_(target).labelBinding(through); nops(code, 33000);
    code.labelBinding(target).iconst_1().ireturn();
  }
  private static void deadCatch(CodeBuilder code) {
    Label start = code.newBoundLabel(), end = code.newLabel(), absent = code.newLabel();
    code.iconst_1().ireturn().labelBinding(end).exceptionCatchAll(start, end, absent);
  }
  private static void unboundBranch(CodeBuilder code) {
    code.goto_(code.newLabel()).iconst_0().ireturn();
  }
  private static void branchToEnd(CodeBuilder code) {
    code.goto_(code.endLabel());
  }
  private static void dead(CodeBuilder code) {
    code.iconst_1().ireturn().nop().nop().nop();
  }
  private static boolean wide(CodeAttribute code) {
    for (CodeElement element : code) if (element instanceof BranchInstruction &&
        ((BranchInstruction) element).opcode() == Opcode.GOTO_W) return true;
    return false;
  }

  private static void switchLayout() {
    ClassFile api = ClassFile.of();
    byte[] switchBytes = build(api, "InstructionWriterSwitch", ClassFileInstructionWriterRegression::longSwitch);
    valid(switchBytes, "widening plus switch padding");
    CodeAttribute switchCode = code(switchBytes);
    check(wide(switchCode), "Conditional widening emitted actual goto_w");
    boolean foundSwitch = false;
    for (CodeElement element : switchCode) if (element instanceof LookupSwitchInstruction) {
      LookupSwitchInstruction lookup = (LookupSwitchInstruction) element;
      check(lookup.cases().size() == 1 && lookup.cases().get(0).caseValue() == 1, "Switch preserved case values");
      check(switchCode.labelToBci(lookup.defaultTarget()) > 32767, "Switch target relocated after widening");
      foundSwitch = true;
    }
    check(foundSwitch, "Switch survived actual byte decode");
  }
  private static void backwardLayout() {
    ClassFile api = ClassFile.of();
    valid(build(api, "InstructionWriterBackward", ClassFileInstructionWriterRegression::backward), "backward widening");
  }
  private static void jumpOptions() {
    ClassFile api = ClassFile.of();
    byte[] gotoBytes = build(api, "InstructionWriterGoto", ClassFileInstructionWriterRegression::longGoto);
    valid(gotoBytes, "default goto widening"); check(wide(code(gotoBytes)), "Goto widened");
    ClassFile fail = ClassFile.of(ClassFile.ShortJumpsOption.FAIL_ON_SHORT_JUMPS);
    reject(() -> build(fail, "InstructionWriterFail", ClassFileInstructionWriterRegression::longSwitch), "Fail short jumps");
    reject(() -> build(fail.withOptions(ClassFile.DeadLabelsOption.DROP_DEAD_LABELS), "InstructionWriterFailClone",
      ClassFileInstructionWriterRegression::longGoto), "withOptions retains short jump policy");
    valid(build(fail.withOptions(ClassFile.ShortJumpsOption.FIX_SHORT_JUMPS), "InstructionWriterFixClone",
      ClassFileInstructionWriterRegression::longGoto), "explicit last short jump policy");
  }
  private static void deadLabels() {
    ClassFile api = ClassFile.of();
    reject(() -> build(api, "InstructionWriterDeadLabel", ClassFileInstructionWriterRegression::deadCatch), "Default dead labels fail");
    ClassFile drop = api.withOptions(ClassFile.DeadLabelsOption.DROP_DEAD_LABELS);
    byte[] dropped = build(drop, "InstructionWriterDroppedLabel", ClassFileInstructionWriterRegression::deadCatch);
    valid(dropped, "Drop unbound exception handler"); check(code(dropped).exceptionHandlers().isEmpty(), "Handler dropped");
    reject(() -> build(drop, "InstructionWriterMissingBranch",
      ClassFileInstructionWriterRegression::unboundBranch), "Dead label policy must never drop branch instructions");
    reject(() -> build(api, "InstructionWriterBranchEnd", ClassFileInstructionWriterRegression::branchToEnd), "Branch to code end invalid");
  }
  private static void deadCode() {
    ClassFile api = ClassFile.of();
    byte[] patched = build(api, "InstructionWriterPatched", ClassFileInstructionWriterRegression::dead);
    valid(patched, "Default dead-code patch");
    byte[] patchedCode = code(patched).codeArray();
    check(patchedCode.length == 5 && (patchedCode[4] & 255) == 191, "BCIs retained by NOP NOP ATHROW patch");
    ClassFile keep = api.withOptions(ClassFile.DeadCodeOption.KEEP_DEAD_CODE);
    reject(() -> build(keep, "InstructionWriterKeepFail", ClassFileInstructionWriterRegression::dead), "Keep does not fabricate frames");
    byte[] retained = build(keep.withOptions(ClassFile.StackMapsOption.DROP_STACK_MAPS), "InstructionWriterKeepRaw",
      ClassFileInstructionWriterRegression::dead);
    check(Arrays.equals(code(retained).codeArray(), new byte[] {4, (byte) 172, 0, 0, 0}), "Explicit KEEP and DROP retain exact code");
    check(!api.verify(retained).isEmpty(), "Retained disconnected code without frames is invalid"); completed++;
  }
  private static void transformLayout() {
    ClassFile api = ClassFile.of();
    ClassModel original = api.parse(build(api, "InstructionWriterSwitchSource", ClassFileInstructionWriterRegression::longSwitch));
    byte[] transformed = api.transformClass(original, ClassDesc.of("classes.modern_test.InstructionWriterRemapped"),
      java.lang.classfile.ClassTransform.transformingMethodBodies(CodeTransform.ACCEPT_ALL));
    valid(transformed, "read-transform-write widened layout");
    check(wide(code(transformed)), "Transformed wide branch remains typed and wide");
  }
  public static void main(String[] arguments) {
    if (arguments.length == 1 && "single".equals(arguments[0])) {
      valid(build(ClassFile.of(), "InstructionWriterSwitch", ClassFileInstructionWriterRegression::longSwitch),
        "single long-switch profile");
      System.out.println("CLASSFILE_INSTRUCTION_WRITER_PROFILE_OK|1"); return;
    }
    progress = arguments.length == 1 && "probe".equals(arguments[0]);
    String selected = arguments.length == 0 || progress ? "all" : arguments[0];
    switch (selected) {
      case "switch": switchLayout(); break;
      case "backward": backwardLayout(); break;
      case "jumps": jumpOptions(); break;
      case "labels": deadLabels(); break;
      case "dead": deadCode(); break;
      case "transform": transformLayout(); break;
      case "all": switchLayout(); backwardLayout(); jumpOptions(); deadLabels(); deadCode(); transformLayout(); break;
      default: throw new IllegalArgumentException("Unknown writer diagnostic profile");
    }
    System.out.println("CLASSFILE_INSTRUCTION_WRITER_REGRESSION_OK|" +
      ("all".equals(selected) ? "" : selected + "|") + completed);
  }
  // The same genuine Java diagnostic source runs on native25 and the guest.
  // Separate main entry points keep each focused process inside its original
  // 60s budget; no original gate inventory, recipe, or timeout is changed.
  public static final class Switch {
    public static void main(String[] arguments) { ClassFileInstructionWriterRegression.main(new String[] {"switch"}); }
  }
  public static final class Backward {
    public static void main(String[] arguments) { ClassFileInstructionWriterRegression.main(new String[] {"backward"}); }
  }
  public static final class Jumps {
    public static void main(String[] arguments) { ClassFileInstructionWriterRegression.main(new String[] {"jumps"}); }
  }
  public static final class Labels {
    public static void main(String[] arguments) { ClassFileInstructionWriterRegression.main(new String[] {"labels"}); }
  }
  public static final class Dead {
    public static void main(String[] arguments) { ClassFileInstructionWriterRegression.main(new String[] {"dead"}); }
  }
  public static final class Transform {
    public static void main(String[] arguments) { ClassFileInstructionWriterRegression.main(new String[] {"transform"}); }
  }
}
