package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.*;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

/** Scoped builder diagnostics; original host-output callers are tested separately. */
public final class ClassFileBlockBuilderRegression {
  private static int completed;
  private static void check(boolean value, String message) {
    if (!value) throw new AssertionError(message); completed++;
  }
  private static void fails(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); throw new AssertionError("Expected " + type.getName()); }
    catch (Throwable failure) { if (!type.isInstance(failure)) throw new AssertionError(failure); completed++; }
  }
  private static byte[] build(Consumer<CodeBuilder> handler) {
    return ClassFile.of().build(ClassDesc.of("classes.modern_test.BlockDiagnostic"), b ->
        b.withMethodBody("value", MethodTypeDesc.of(ConstantDescs.CD_int), 9, handler));
  }
  private static CodeModel code(byte[] bytes) { return ClassFile.of().parse(bytes).methods().get(0).code().get(); }
  private static ExceptionCatch handler(byte[] bytes) {
    for (CodeElement element : code(bytes)) if (element instanceof ExceptionCatch) return (ExceptionCatch) element;
    throw new AssertionError("No actual exception table");
  }
  public static void main(String[] arguments) {
    int[] slots = new int[7]; boolean[] labels = new boolean[1];
    byte[] lexical = build(b -> {
      slots[0] = b.allocateLocal(TypeKind.LONG);
      b.block(child -> {
        labels[0] = child.startLabel() != b.startLabel() && child.endLabel() != b.endLabel() &&
            child.startLabel() != child.endLabel() && child.endLabel() != child.breakLabel();
        slots[1] = child.allocateLocal(TypeKind.INT); slots[2] = child.allocateLocal(TypeKind.LONG);
        slots[3] = child.allocateLocal(TypeKind.VOID);
        child.block(inner -> { slots[4] = inner.allocateLocal(TypeKind.INT); inner.nop(); });
        slots[5] = child.allocateLocal(TypeKind.DOUBLE); child.nop();
      });
      slots[6] = b.allocateLocal(TypeKind.INT); b.iconst_0().ireturn();
    });
    check(Arrays.equals(slots, new int[]{0,2,3,5,5,5,2}), "lexical local isolation, nested reuse and native VOID cursor");
    check(labels[0], "distinct lexical start/end/break label identities");
    check(ClassFile.of().verify(lexical).isEmpty(), "lexical output structural verification");
    fails(IllegalStateException.class, () -> build(b -> b.block(child -> b.allocateLocal(TypeKind.INT))));
    fails(NullPointerException.class, () -> build(b -> b.block(child -> child.allocateLocal(null))));
    fails(IllegalArgumentException.class, () -> build(b -> b.trying(child -> child.lineNumber(1), catches -> {})));
    ClassDesc exception = ClassDesc.of("java.lang.Exception");
    fails(IllegalArgumentException.class, () -> build(b -> b.trying(child -> child.nop(), catches ->
        catches.catchingMulti(List.of(exception, exception), child -> child.pop()))));
    fails(IllegalArgumentException.class, () -> build(b -> b.ifThen(Opcode.GOTO, null)));
    fails(NullPointerException.class, () -> build(b -> b.ifThen(null, child -> {})));
    byte[] conditional = build(b -> b.iconst_1().ifThen(child -> child.nop()).iconst_0().ireturn());
    Opcode branch = null;
    for (CodeElement element : code(conditional)) if (element instanceof BranchInstruction) branch = ((BranchInstruction) element).opcode();
    check(branch == Opcode.IFEQ && ClassFile.of().verify(conditional).isEmpty(), "default IFNE condition uses actual inverse IFEQ");
    build(b -> { check(b.block(child -> child.nop()) == b, "block returns original parent"); b.iconst_0().ireturn(); });
    byte[] nullCatch = build(b -> b.trying(child -> child.aconst_null().athrow(), catches ->
        catches.catching(null, child -> child.pop().iconst_1().ireturn())));
    check(handler(nullCatch).catchType().isEmpty() && ClassFile.of().verify(nullCatch).isEmpty(), "null catch type means catch-all");
    byte[] emptyCatch = build(b -> b.trying(child -> child.aconst_null().athrow(), catches ->
        catches.catchingMulti(List.of(), child -> child.pop().iconst_1().ireturn())));
    check(handler(emptyCatch).catchType().isEmpty() && ClassFile.of().verify(emptyCatch).isEmpty(), "empty multi-catch means catch-all");
    byte[] multi = build(b -> b.trying(child -> child.nop(), catches -> catches.catchingMulti(
        List.of(ClassDesc.of("java.lang.RuntimeException"), exception), child -> child.pop())).iconst_0().ireturn());
    int count = 0; Label shared = null;
    for (CodeElement element : code(multi)) if (element instanceof ExceptionCatch) {
      ExceptionCatch caught = (ExceptionCatch) element;
      if (shared != null && shared != caught.handler()) throw new AssertionError("Different multi-catch targets");
      shared = caught.handler(); count++;
    }
    check(count == 2 && ClassFile.of().verify(multi).isEmpty(), "two typed exception entries share one real handler");
    StringBuilder trace = new StringBuilder();
    CodeTransform transform = new CodeTransform() {
      public void atStart(CodeBuilder b) { trace.append('S'); }
      public void accept(CodeBuilder b, CodeElement element) { trace.append('E'); b.with(element); }
      public void atEnd(CodeBuilder b) { trace.append('F'); }
    };
    byte[] transformed = build(b -> b.transforming(transform, child -> { trace.append('H'); child.iconst_1().ireturn(); }));
    check(trace.toString().equals("SHEEF") && ClassFile.of().verify(transformed).isEmpty(), "transforming callback order and real emitted code");
    RuntimeException held = new RuntimeException("held-handler"); trace.setLength(0);
    try { build(b -> b.transforming(transform, child -> { trace.append('H'); throw held; })); throw new AssertionError("Lost failure"); }
    catch (RuntimeException failure) { check(failure == held && trace.toString().equals("SH"), "handler failure identity, no end callback"); }
    fails(NullPointerException.class, () -> build(b -> b.trying(child -> child.nop(), null)));
    fails(NullPointerException.class, () -> build(b -> b.trying(null, catches -> {})));
    fails(IllegalArgumentException.class, () -> build(b -> b.trying(child -> child.nop(), catches -> {
      catches.catching(exception, child -> child.pop()); catches.catching(exception, child -> child.pop());
    })));
    if (completed != 19) throw new AssertionError("Incomplete block diagnostic: " + completed);
    System.out.println("CLASSFILE_BLOCK_BUILDER_REGRESSION_OK|19");
  }
}
