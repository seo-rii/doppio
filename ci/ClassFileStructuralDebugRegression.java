package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import static java.lang.constant.ConstantDescs.*;

/** Fresh-source release9 diagnostic replay, separate from original caller69 host evidence. */
public final class ClassFileStructuralDebugRegression {
  public static void main(String[] arguments) throws Throwable {
    ClassFileStructuralDebugFinal.main(arguments);
    System.out.println("CLASSFILE_STRUCTURAL_DEBUG_REGRESSION_OK|8");
  }

  /** Pure public-API checks; not an original-host corpus or a broad parser verdict. */
  public static final class TraversalProbe {
    private static int checks, version = 69;
    private static void check(boolean condition) {
      if (!condition) throw new AssertionError("verification traversal invariant");
      checks++;
    }
    private static void require(boolean condition) {
      if (!condition) throw new AssertionError("bounded probe mutation");
    }
    private static void buildDebug(ClassBuilder builder) {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER).withVersion(version, 0)
          .withMethodBody("run", MethodTypeDesc.of(CD_int, CD_int), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
              TraversalProbe::debugCode);
    }
    private static void debugCode(CodeBuilder code) {
      Label start = code.newLabel(), middle = code.newLabel(), end = code.newLabel();
      code.labelBinding(start).lineNumber(10).iload(0);
      for (int index = 0; index < 32; index++) code.nop();
      code.labelBinding(middle).lineNumber(20).ireturn().labelBinding(end)
          .localVariable(0, "x", CD_int, start, end).characterRange(start, end, 1025, 2050, CharacterRange.FLAG_STATEMENT);
    }
    private static void buildArray(ClassBuilder builder) {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER).withMethodBody("run",
          MethodTypeDesc.of(CD_int.arrayType()), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, TraversalProbe::arrayCode);
    }
    private static void arrayCode(CodeBuilder code) { code.nop().iconst_1().newarray(TypeKind.INT).areturn(); }
    private static void buildDeadArray(ClassBuilder builder) {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER).withMethodBody("run",
          MethodTypeDesc.of(CD_void), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, TraversalProbe::deadArrayCode);
    }
    private static void deadArrayCode(CodeBuilder code) {
      code.nop().return_().nop().iconst_1().newarray(TypeKind.INT).pop().return_();
    }
    private static void buildConstant(ClassBuilder builder) {
      builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER).withMethodBody("run",
          MethodTypeDesc.of(CD_Object), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, TraversalProbe::constantCode);
    }
    private static void constantCode(CodeBuilder code) { code.nop().ldc(code.constantPool().stringEntry("held")).areturn(); }
    private static CodeAttribute code(ClassFile api, byte[] bytes) {
      return (CodeAttribute) api.parse(bytes).methods().get(0).code().get();
    }
    private static void collect(CodeModel code, List<CodeElement> elements) { code.forEach(elements::add); }
    private static void fullTraversal() {
      ClassFile api = ClassFile.of(); version = 69;
      byte[] bytes = api.build(ClassDesc.of("C7dVerifierTraversal"), TraversalProbe::buildDebug);
      ClassModel model = api.parse(bytes); CodeAttribute code = (CodeAttribute) model.methods().get(0).code().get();
      check(api.verify(bytes).isEmpty() && api.verify(model).isEmpty());
      List<CodeElement> first = new ArrayList<CodeElement>(), second = new ArrayList<CodeElement>();
      collect(code, first); check(api.verify(model).isEmpty()); collect(code, second);
      check(first.size() == second.size());
      int nops = 0, labels = 0, lines = 0, locals = 0, ranges = 0;
      List<Integer> labelBcis = new ArrayList<Integer>(), lineValues = new ArrayList<Integer>();
      for (int index = 0; index < first.size(); index++) {
        CodeElement element = first.get(index), repeated = second.get(index);
        if (element instanceof NopInstruction) {
          nops++; check(element == repeated);
        } else if (element instanceof LabelTarget) {
          labels++; Label held = ((LabelTarget) element).label();
          check(repeated instanceof LabelTarget && held == ((LabelTarget) repeated).label());
          labelBcis.add(code.labelToBci(held));
        } else if (element instanceof LineNumber) {
          lines++; lineValues.add(((LineNumber) element).line());
          check(repeated instanceof LineNumber && ((LineNumber) repeated).line() == ((LineNumber) element).line());
        } else if (element instanceof LocalVariable) {
          locals++; LocalVariable local = (LocalVariable) element;
          check(code.labelToBci(local.startScope()) == 0 && code.labelToBci(local.endScope()) == 34);
        } else if (element instanceof CharacterRange) ranges++;
      }
      check(nops == 32 && labels == 2 && lines == 2 && locals == 1 && ranges == 1);
      check(labelBcis.equals(Arrays.asList(0, 34)) && lineValues.equals(Arrays.asList(10, 20)));
    }
    private static int u2(byte[] bytes, int at) {
      require(at >= 0 && at <= bytes.length - 2);
      return (bytes[at] & 255) << 8 | bytes[at + 1] & 255;
    }
    private static int u4(byte[] bytes, int at) {
      int value = u2(bytes, at) << 16 | u2(bytes, at + 2); require(value >= 0); return value;
    }
    private static int attributeEnd(byte[] bytes, int at) {
      int end = at + 6 + u4(bytes, at + 2); require(end >= at && end <= bytes.length); return end;
    }
    /** Exact one-method, zero-field/interface probe layout; not a general parser. */
    private static int offset(byte[] bytes, String selected) {
      require(bytes.length >= 10 && (bytes[0] & 255) == 0xca && (bytes[1] & 255) == 0xfe &&
          (bytes[2] & 255) == 0xba && (bytes[3] & 255) == 0xbe);
      int count = u2(bytes, 8), at = 10; String[] utf = new String[count];
      for (int index = 1; index < count; index++) {
        require(at < bytes.length); int tag = bytes[at++] & 255;
        if (tag == 1) {
          int length = u2(bytes, at); at += 2; require(length <= bytes.length - at);
          utf[index] = new String(bytes, at, length, StandardCharsets.UTF_8); at += length;
        } else if (tag == 3 || tag == 4 || tag == 9 || tag == 10 || tag == 11 || tag == 12 || tag == 17 || tag == 18) at += 4;
        else if (tag == 5 || tag == 6) { at += 8; index++; }
        else if (tag == 7 || tag == 8 || tag == 16 || tag == 19 || tag == 20) at += 2;
        else if (tag == 15) at += 3;
        else throw new AssertionError("unexpected probe CP tag");
        require(at <= bytes.length);
      }
      at += 6; require(u2(bytes, at) == 0); at += 2;
      require(u2(bytes, at) == 0); at += 2; require(u2(bytes, at) == 1); at += 2;
      int attributes = u2(bytes, at + 6); at += 8;
      for (int index = 0; index < attributes; index++) {
        int name = u2(bytes, at), end = attributeEnd(bytes, at);
        require(name > 0 && name < utf.length);
        if ("Code".equals(utf[name])) {
          int instructions = at + 14, length = u4(bytes, at + 10);
          require(instructions + length <= end - 4);
          if (selected.equals("Code")) return instructions;
          int nested = instructions + length; require(u2(bytes, nested) == 0); nested += 2;
          int nestedCount = u2(bytes, nested); nested += 2;
          for (int item = 0; item < nestedCount; item++) {
            int key = u2(bytes, nested), next = attributeEnd(bytes, nested);
            require(key > 0 && key < utf.length && next <= end);
            if (selected.equals(utf[key])) return nested + 6;
            nested = next;
          }
          require(nested == end);
        }
        at = end;
      }
      throw new AssertionError("missing probe attribute");
    }
    private static byte[] change(byte[] source, int at, int expected, int value) {
      require(at >= 0 && at < source.length && (source[at] & 255) == expected && value >= 0 && value <= 255 && value != expected);
      byte[] before = source.clone(), changed = source.clone(); changed[at] = (byte) value;
      for (int index = 0; index < source.length; index++) require(source[index] == changed[index] || index == at);
      require(Arrays.equals(source, before)); return changed;
    }
    private static void invalidOperand(byte[] bytes) {
      ClassFile api = ClassFile.of();
      check(!api.verify(bytes).isEmpty() && !api.verify(api.parse(bytes)).isEmpty());
      boolean rejected = false;
      try {
        for (CodeElement element : code(api, bytes)) {
          if (element instanceof NewPrimitiveArrayInstruction) ((NewPrimitiveArrayInstruction) element).typeKind();
          else if (element instanceof ConstantInstruction.LoadConstantInstruction)
            ((ConstantInstruction.LoadConstantInstruction) element).constantEntry();
        }
      } catch (IllegalArgumentException expected) { rejected = true; }
      check(rejected);
    }
    private static void operands() {
      ClassFile api = ClassFile.of();
      byte[] array = api.build(ClassDesc.of("C7dTraversalBadArray"), TraversalProbe::buildArray);
      int at = offset(array, "Code"); require(array[at] == 0 && (array[at + 2] & 255) == 188);
      check(api.verify(array).isEmpty()); invalidOperand(change(array, at + 3, 10, 0));
      byte[] constant = api.build(ClassDesc.of("C7dTraversalBadConstant"), TraversalProbe::buildConstant);
      at = offset(constant, "Code"); require(constant[at] == 0 && (constant[at + 1] & 255) == 18);
      int utf = api.parse(constant).thisClass().name().index(); require(utf > 0 && utf <= 255);
      check(api.verify(constant).isEmpty()); invalidOperand(change(constant, at + 2, constant[at + 2] & 255, utf));
      ClassFile dead = ClassFile.of(ClassFile.DeadCodeOption.KEEP_DEAD_CODE, ClassFile.StackMapsOption.DROP_STACK_MAPS);
      byte[] unreachable = dead.build(ClassDesc.of("C7dTraversalDeadArray"), TraversalProbe::buildDeadArray);
      at = offset(unreachable, "Code"); require(unreachable[at] == 0 && (unreachable[at + 4] & 255) == 188);
      invalidOperand(change(unreachable, at + 5, 10, 0));
    }
    private static void metadataBeforeInference() {
      ClassFile api = ClassFile.of(); version = 49;
      byte[] source = api.build(ClassDesc.of("C7dTraversalOldDebug"), TraversalProbe::buildDebug);
      List<VerifyError> baseline = api.verify(source);
      check(baseline.size() == 1 && baseline.get(0).getMessage().equals("Inference verification is not supported"));
      int at = offset(source, "LineNumberTable") + 2;
      require(u2(source, at) == 0 && source[at + 1] == 0);
      byte[] changed = change(source, at + 1, 0, 35);
      List<VerifyError> first = api.verify(changed), second = api.verify(api.parse(changed));
      check(!first.isEmpty() && !second.isEmpty());
      check(!first.get(0).getMessage().contains("Inference verification") && !second.get(0).getMessage().contains("Inference verification"));
    }
    public static void main(String[] arguments) {
      fullTraversal(); operands(); metadataBeforeInference();
      System.out.println("CLASSFILE_VERIFIER_TRAVERSAL_OK|" + checks);
    }
  }
}
