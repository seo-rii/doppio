package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.attribute.StackMapFrameInfo.*;
import java.lang.classfile.constantpool.ConstantPoolException;
import java.lang.classfile.instruction.*;
import java.lang.constant.ConstantDescs;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Independent reader diagnostics: real minimal class files, public API only, no class definition. */
public final class ClassFileControlFlowReaderRegression {
  private static int cases;
  private static final byte[] BRANCH = {26, (byte) 153, 0, 5, 4, (byte) 172, 3, (byte) 172};
  private static final byte[] BRANCH_FRAMES = {0, 1, 6};

  public static void main(String[] args) throws Exception {
    branchAndWide();
    for (int padding = 0; padding < 4; padding++) {
      switchModel(true, padding);
      switchModel(false, padding);
    }
    handlers(false);
    handlers(true);
    compressedFrames();
    constructorFrame(false);
    constructorFrame(true);
    factories();
    malformed();
    System.out.println("CLASSFILE_CONTROL_FLOW_READER_REGRESSION_OK|" + cases);
  }

  private static void branchAndWide() throws Exception {
    CodeAttribute code = parse(classBytes(BRANCH, 1, 1, "(I)I", new int[0][], BRANCH_FRAMES));
    List<CodeElement> elements = elements(code);
    BranchInstruction branch = only(elements, BranchInstruction.class);
    check(branch.opcode() == Opcode.IFEQ && branch.sizeInBytes() == 3, "branch opcode/size");
    check(code.labelToBci(branch.target()) == 6, "branch signed relative target");
    StackMapTableAttribute frames = code.findAttribute(Attributes.stackMapTable()).orElseThrow(AssertionError::new);
    check(frames.entries().size() == 1 && frames.entries().get(0).frameType() == 6, "same frame type");
    check(frames.entries().get(0).target() == branch.target(), "canonical frame/branch label");
    check(frames.entries().get(0).locals().size() == 1 && frames.entries().get(0).locals().get(0) ==
      SimpleVerificationTypeInfo.INTEGER && frames.entries().get(0).stack().isEmpty(), "initial integer locals");
    check(only(elements, LabelTarget.class).label() == branch.target(), "traversed target label identity");
    check(count(elements, StackMapTableAttribute.class) == 0, "stack maps are not traversed elements");
    List<CodeElement> again = elements(code);
    check(only(again, BranchInstruction.class).target() == branch.target(), "stable repeated traversal labels");
    byte[] returned = code.codeArray(); returned[0] = 0;
    check(code.codeArray()[0] == 26, "defensive code array");
    expect(UnsupportedOperationException.class, () -> frames.entries().clear());
    expect(UnsupportedOperationException.class, () -> frames.entries().get(0).locals().clear());
    CodeAttribute foreign = parse(classBytes(BRANCH, 1, 1, "(I)I", new int[0][], BRANCH_FRAMES));
    Label foreignLabel = only(elements(foreign), BranchInstruction.class).target();
    expect(IllegalArgumentException.class, () -> code.labelToBci(foreignLabel));
    cases++;

    CodeAttribute wide = parse(classBytes(new byte[]{(byte) 200, 0, 0, 0, 5, 5, (byte) 172},
      1, 0, "()I", new int[0][], new byte[]{0, 1, 5}));
    BranchInstruction wideBranch = only(elements(wide), BranchInstruction.class);
    check(wideBranch.opcode() == Opcode.GOTO_W && wideBranch.sizeInBytes() == 5 &&
      wide.labelToBci(wideBranch.target()) == 5, "wide branch target/size");
    cases++;
  }

  private static void switchModel(boolean table, int prefix) throws Exception {
    byte[] instructions = switchCode(table, prefix);
    int start = prefix + 1, operands = (start + 4) & ~3;
    int first = operands + (table ? 24 : 32);
    CodeAttribute code = parse(classBytes(instructions, 1, 1, "(I)I", new int[0][],
      new byte[]{0, 3, (byte) first, 1, 1}));
    List<CodeElement> elements = elements(code);
    Label target;
    List<SwitchCase> entries;
    Instruction instruction;
    if (table) {
      TableSwitchInstruction value = only(elements, TableSwitchInstruction.class);
      check(value.lowValue() == -1 && value.highValue() == 1, "table range");
      check(value.cases().size() == 2 && value.cases().get(0).caseValue() == -1 &&
        value.cases().get(1).caseValue() == 1, "table default-equivalent case omitted");
      target = value.defaultTarget(); entries = value.cases(); instruction = value;
    } else {
      LookupSwitchInstruction value = only(elements, LookupSwitchInstruction.class);
      check(value.cases().size() == 3 && value.cases().get(0).caseValue() == Integer.MIN_VALUE &&
        value.cases().get(1).caseValue() == -7 && value.cases().get(2).caseValue() == Integer.MAX_VALUE,
        "lookup signed ascending keys");
      target = value.defaultTarget(); entries = value.cases(); instruction = value;
    }
    check(instruction.sizeInBytes() == first - start, "exact padded switch size");
    check(code.labelToBci(target) == first + 4 && code.labelToBci(entries.get(0).target()) == first &&
      code.labelToBci(entries.get(1).target()) == first + 2, "switch offsets relative to opcode");
    check(count(elements, LabelTarget.class) == 3, "canonical switch/frame targets only");
    for (StackMapFrameInfo frame : code.findAttribute(Attributes.stackMapTable()).orElseThrow(AssertionError::new).entries())
      check(hasLabel(elements, frame.target()), "frame target is traversed by identity");
    expect(UnsupportedOperationException.class, () -> entries.clear());
    cases++;
  }

  private static void handlers(boolean endAtCodeLength) throws Exception {
    byte[] instructions = endAtCodeLength ? new byte[]{1, (byte) 191, 75, (byte) 177} :
      new byte[]{42, (byte) 191, 76, 8, (byte) 172};
    int[][] table = {{0, endAtCodeLength ? instructions.length : 2, 2, endAtCodeLength ? 0 : 10}};
    CodeAttribute code = parse(classBytes(instructions, 1, endAtCodeLength ? 1 : 2,
      endAtCodeLength ? "()V" : "(Ljava/lang/Throwable;)I", table, new byte[]{0, 1, 66, 7, 0, 10}));
    List<CodeElement> elements = elements(code);
    check(code.exceptionHandlers().size() == 1 && count(elements, ExceptionCatch.class) == 1, "one ordered catch");
    ExceptionCatch handler = code.exceptionHandlers().get(0), traversed = only(elements, ExceptionCatch.class);
    check(handler.handler() == traversed.handler() && handler.tryStart() == traversed.tryStart() &&
      handler.tryEnd() == traversed.tryEnd(), "catch and traversal canonical labels");
    check(code.labelToBci(handler.tryStart()) == 0 && code.labelToBci(handler.handler()) == 2 &&
      code.labelToBci(handler.tryEnd()) == table[0][1], "catch boundaries");
    check(hasLabel(elements, handler.tryStart()) && hasLabel(elements, handler.tryEnd()) &&
      hasLabel(elements, handler.handler()), "catch labels are traversed");
    check(handler.catchType().isPresent() != endAtCodeLength, "typed versus catch-all handler");
    if (!endAtCodeLength) check(handler.catchType().get().asInternalName().equals("java/lang/Throwable"), "catch type");
    StackMapFrameInfo frame = code.findAttribute(Attributes.stackMapTable()).orElseThrow(AssertionError::new).entries().get(0);
    check(frame.target() == handler.handler() && frame.stack().size() == 1 &&
      ((ObjectVerificationTypeInfo) frame.stack().get(0)).classSymbol().equals(ConstantDescs.CD_Throwable), "handler frame");
    expect(UnsupportedOperationException.class, () -> code.exceptionHandlers().clear());
    cases++;
  }

  private static void compressedFrames() throws Exception {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    DataOutputStream frames = new DataOutputStream(bytes);
    frames.writeShort(8);
    frames.writeByte(0);                         // same: long, String, double
    frames.writeByte(253); frames.writeShort(0); frames.writeByte(1); frames.writeByte(4); // append int,long
    frames.writeByte(250); frames.writeShort(0); // chop one verification entry, not two long slots
    frames.writeByte(251); frames.writeShort(0); // same extended
    frames.writeByte(64); frames.writeByte(4);   // one long operand entry
    frames.writeByte(247); frames.writeShort(0); frames.writeByte(3); // one double entry, extended
    frames.writeByte(255); frames.writeShort(0); frames.writeShort(4);
    frames.writeByte(0); frames.writeByte(1); frames.writeByte(7); frames.writeShort(12); frames.writeByte(6);
    frames.writeShort(1); frames.writeByte(5);
    frames.writeByte(255); frames.writeShort(0); frames.writeShort(3);
    frames.writeByte(4); frames.writeByte(0); frames.writeByte(3);
    frames.writeShort(1); frames.writeByte(8); frames.writeShort(8);
    CodeAttribute code = parse(classBytes(new byte[]{0, 0, 0, 0, 0, 0, 0, 0, (byte) 187, 0, 12, 87, 3, (byte) 172},
      3, 10, "(JLjava/lang/String;D)I", new int[0][], bytes.toByteArray()));
    List<StackMapFrameInfo> entries = code.findAttribute(Attributes.stackMapTable()).orElseThrow(AssertionError::new).entries();
    check(entries.size() == 8, "all compressed frame kinds");
    int[] raw = {0, 253, 250, 251, 64, 247, 255, 255};
    for (int index = 0; index < entries.size(); index++) {
      check(entries.get(index).frameType() == raw[index] && code.labelToBci(entries.get(index).target()) == index,
        "frame type and absolute target");
    }
    List<VerificationTypeInfo> initial = entries.get(0).locals();
    check(initial.size() == 3 && initial.get(0) == SimpleVerificationTypeInfo.LONG &&
      ((ObjectVerificationTypeInfo) initial.get(1)).classSymbol().equals(ConstantDescs.CD_String) &&
      initial.get(2) == SimpleVerificationTypeInfo.DOUBLE, "wide initial parameters remain single entries");
    check(entries.get(1).locals().size() == 5 && entries.get(2).locals().size() == 4 &&
      entries.get(2).locals().get(3) == SimpleVerificationTypeInfo.INTEGER, "append/chop normalized locals");
    check(entries.get(4).stack().size() == 1 && entries.get(4).stack().get(0) == SimpleVerificationTypeInfo.LONG &&
      entries.get(5).stack().size() == 1 && entries.get(5).stack().get(0) == SimpleVerificationTypeInfo.DOUBLE,
      "wide operand entries remain single entries");
    check(entries.get(6).locals().get(0) == SimpleVerificationTypeInfo.TOP &&
      entries.get(6).locals().get(3) == SimpleVerificationTypeInfo.UNINITIALIZED_THIS &&
      entries.get(6).stack().get(0) == SimpleVerificationTypeInfo.NULL, "full simple verification tags");
    UninitializedVerificationTypeInfo uninitialized = (UninitializedVerificationTypeInfo) entries.get(7).stack().get(0);
    check(code.labelToBci(uninitialized.newTarget()) == 8 && hasLabel(elements(code), uninitialized.newTarget()),
      "uninitialized tag8 targets real new instruction");
    check(only(elements(code), NewObjectInstruction.class).className().asSymbol().equals(ConstantDescs.CD_String), "new model");
    cases++;
  }

  private static void constructorFrame(boolean object) throws Exception {
    byte[] instructions = object ? new byte[]{(byte) 177} : new byte[]{42, (byte) 183, 0, 16, (byte) 177};
    CodeAttribute code = parse(classBytes(instructions, 1, object ? 1 : 2, object ? "()V" : "(Z)V",
      new int[0][], new byte[][]{{0, 1, 0}}, true, object));
    List<VerificationTypeInfo> locals = code.findAttribute(Attributes.stackMapTable()).orElseThrow(AssertionError::new)
      .entries().get(0).locals();
    if (object) check(locals.size() == 1 && ((ObjectVerificationTypeInfo) locals.get(0)).classSymbol()
      .equals(ConstantDescs.CD_Object), "Object constructor initial receiver initialized");
    else check(locals.size() == 2 && locals.get(0) == SimpleVerificationTypeInfo.UNINITIALIZED_THIS &&
      locals.get(1) == SimpleVerificationTypeInfo.INTEGER, "constructor uninitialized receiver and boolean parameter");
    cases++;
  }

  private static void factories() throws Exception {
    Label label = only(elements(parse(classBytes(BRANCH, 1, 1, "(I)I", new int[0][], BRANCH_FRAMES))), BranchInstruction.class).target();
    check(BranchInstruction.of(Opcode.IFNULL, label).target() == label, "public branch factory");
    check(IncrementInstruction.of(7, -128).opcode() == Opcode.IINC &&
      IncrementInstruction.of(256, 1).opcode() == Opcode.IINC_W &&
      IncrementInstruction.of(0, 128).sizeInBytes() == 6 && IncrementInstruction.of(65535, -32768).constant() == -32768,
      "increment operand bounds and encoding");
    ConvertInstruction conversion = ConvertInstruction.of(TypeKind.INT, TypeKind.BYTE);
    check(conversion.opcode() == Opcode.I2B && conversion.fromType() == TypeKind.INT && conversion.toType() == TypeKind.BYTE,
      "conversion factory types");
    check(ThrowInstruction.of().opcode() == Opcode.ATHROW, "throw factory");
    List<SwitchCase> entries = new ArrayList<SwitchCase>(); entries.add(SwitchCase.of(7, label));
    LookupSwitchInstruction lookup = LookupSwitchInstruction.of(label, entries);
    TableSwitchInstruction table = TableSwitchInstruction.of(7, 7, label, entries);
    entries.clear();
    check(lookup.sizeInBytes() == -1 && table.sizeInBytes() == -1 && lookup.cases().size() == 1 && table.cases().size() == 1,
      "unbound switch size and defensive factory list");
    expect(UnsupportedOperationException.class, () -> lookup.cases().clear());
    List<VerificationTypeInfo> locals = new ArrayList<VerificationTypeInfo>(); locals.add(SimpleVerificationTypeInfo.LONG);
    StackMapFrameInfo frame = StackMapFrameInfo.of(label, locals, Collections.emptyList()); locals.clear();
    List<StackMapFrameInfo> frames = new ArrayList<StackMapFrameInfo>(); frames.add(frame);
    StackMapTableAttribute attribute = StackMapTableAttribute.of(frames); frames.clear();
    check(frame.frameType() == 255 && frame.target() == label && frame.locals().size() == 1 &&
      attribute.entries().size() == 1 && attribute.attributeMapper() == Attributes.stackMapTable(), "defensive frame factories");
    expect(UnsupportedOperationException.class, () -> frame.locals().clear());
    expect(UnsupportedOperationException.class, () -> attribute.entries().clear());
    expect(IllegalArgumentException.class, () -> BranchInstruction.of(Opcode.NOP, label));
    expect(NullPointerException.class, () -> BranchInstruction.of(Opcode.IFEQ, null));
    expect(IllegalArgumentException.class, () -> IncrementInstruction.of(-1, 0));
    expect(IllegalArgumentException.class, () -> IncrementInstruction.of(65536, 0));
    expect(IllegalArgumentException.class, () -> IncrementInstruction.of(0, 32768));
    expect(IllegalArgumentException.class, () -> ConvertInstruction.of(TypeKind.BYTE, TypeKind.INT));
    expect(IllegalArgumentException.class, () -> ConvertInstruction.of(Opcode.NOP));
    expect(IllegalArgumentException.class, () -> ObjectVerificationTypeInfo.of(ConstantDescs.CD_int));
    expect(NullPointerException.class, () -> StackMapFrameInfo.of(label, Arrays.asList((VerificationTypeInfo) null), Collections.emptyList()));
    expect(NullPointerException.class, () -> UninitializedVerificationTypeInfo.of(null));
    cases++;
  }

  private static void malformed() throws Exception {
    List<byte[]> invalid = malformedInputs();
    for (int index = 0; index < invalid.size(); index++) {
      boolean rejected;
      try { rejected = !ClassFile.of().verify(invalid.get(index)).isEmpty(); }
      catch (IllegalArgumentException formatFailure) { rejected = true; }
      check(rejected, "malformed control-flow/frame input " + index);
      cases++;
    }
  }

  private static List<byte[]> malformedInputs() throws Exception {
    List<byte[]> invalid = new ArrayList<byte[]>();
    byte[] branchOperand = BRANCH.clone(); branchOperand[3] = 1;
    invalid.add(classBytes(branchOperand, 1, 1, "(I)I", new int[0][], BRANCH_FRAMES));
    byte[] branchEnd = BRANCH.clone(); branchEnd[3] = 7;
    invalid.add(classBytes(branchEnd, 1, 1, "(I)I", new int[0][], BRANCH_FRAMES));
    byte[] branchNegative = BRANCH.clone(); branchNegative[2] = -1; branchNegative[3] = -2;
    invalid.add(classBytes(branchNegative, 1, 1, "(I)I", new int[0][], BRANCH_FRAMES));
    invalid.add(classBytes(new byte[]{(byte) 200, 0, 0, 0}, 1, 0, "()I", new int[0][], null));
    byte[] badTable = switchCode(true, 0); putInt(badTable, 8, 2); putInt(badTable, 12, 1);
    invalid.add(classBytes(badTable, 1, 1, "(I)I", new int[0][], null));
    byte[] hugeTable = switchCode(true, 0); putInt(hugeTable, 8, Integer.MIN_VALUE); putInt(hugeTable, 12, Integer.MAX_VALUE);
    invalid.add(classBytes(hugeTable, 1, 1, "(I)I", new int[0][], null));
    byte[] negativePairs = switchCode(false, 0); putInt(negativePairs, 8, -1);
    invalid.add(classBytes(negativePairs, 1, 1, "(I)I", new int[0][], null));
    byte[] hugePairs = switchCode(false, 0); putInt(hugePairs, 8, Integer.MAX_VALUE);
    invalid.add(classBytes(hugePairs, 1, 1, "(I)I", new int[0][], null));
    byte[] unsorted = switchCode(false, 0); putInt(unsorted, 12, 0);
    invalid.add(classBytes(unsorted, 1, 1, "(I)I", new int[0][], null));
    byte[] duplicate = switchCode(false, 0); putInt(duplicate, 20, Integer.MIN_VALUE);
    invalid.add(classBytes(duplicate, 1, 1, "(I)I", new int[0][], null));
    for (int[] handler : new int[][]{{2, 6, 6, 10}, {0, 2, 6, 10}, {0, 6, 2, 10}, {0, 6, 6, 1}})
      invalid.add(classBytes(BRANCH, 1, 1, "(I)I", new int[][]{handler}, BRANCH_FRAMES));
    for (byte[] frames : new byte[][]{
      {0, 1, (byte) 128}, {0, 1, (byte) 247}, {0, 1, 8}, {0, 1, 2},
      {0, 1, 70, 9}, {0, 1, 70, 7, 0, 1}, {0, 1, 70, 8, 0, 6},
      {0, 1, 70, 8, 0, 2}, {0, 1, (byte) 248, 0, 6}})
      invalid.add(classBytes(BRANCH, 1, 1, "(I)I", new int[0][], frames));
    invalid.add(classBytes(BRANCH, 1, 1, "(I)I", new int[0][], new byte[][]{BRANCH_FRAMES, BRANCH_FRAMES}, false, false));
    return invalid;
  }

  /** Stricter checked-reader boundaries, separate from the native verifier's selected guarantees. */
  public static final class CheckedBounds {
    public static void main(String[] args) throws Exception {
      List<byte[]> invalid = malformedInputs();
      // The pinned native API ignores an empty exception range. The selected
      // checked reader additionally enforces the JVMS non-empty range bound;
      // keep that stronger diagnostic out of the native-comparable inventory.
      invalid.add(classBytes(BRANCH, 1, 1, "(I)I", new int[][]{{0, 0, 6, 10}}, BRANCH_FRAMES));
      for (int index = 0; index < invalid.size(); index++) {
        final byte[] bytes = invalid.get(index);
        // Invalid catch_type and tag7 object entries retain the exact public
        // pool error; all remaining vectors are checked structural framing.
        Class<? extends Throwable> expected = index == 13 || index == 19 ?
          ConstantPoolException.class : IllegalArgumentException.class;
        expect(expected, () -> {
          CodeAttribute code = parse(bytes);
          code.forEach(element -> {});
          code.findAttribute(Attributes.stackMapTable()).ifPresent(attribute -> attribute.entries());
        });
      }
      System.out.println("CLASSFILE_CONTROL_FLOW_READER_BOUNDS_OK|" + invalid.size());
    }
  }

  private static byte[] switchCode(boolean table, int prefix) throws IOException {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    DataOutputStream code = new DataOutputStream(bytes);
    for (int index = 0; index < prefix; index++) code.writeByte(0);
    code.writeByte(26);
    int start = prefix + 1, operands = (start + 4) & ~3;
    code.writeByte(table ? 170 : 171);
    while (bytes.size() < operands) code.writeByte(0);
    int first = operands + (table ? 24 : 32);
    code.writeInt(first + 4 - start);
    if (table) {
      code.writeInt(-1); code.writeInt(1);
      code.writeInt(first - start); code.writeInt(first + 4 - start); code.writeInt(first + 2 - start);
    } else {
      code.writeInt(3);
      code.writeInt(Integer.MIN_VALUE); code.writeInt(first - start);
      code.writeInt(-7); code.writeInt(first + 2 - start);
      code.writeInt(Integer.MAX_VALUE); code.writeInt(first + 4 - start);
    }
    code.writeByte(6); code.writeByte(172); code.writeByte(7); code.writeByte(172); code.writeByte(8); code.writeByte(172);
    return bytes.toByteArray();
  }

  private static byte[] classBytes(byte[] code, int stack, int locals, String descriptor, int[][] handlers, byte[] frames)
      throws IOException {
    return classBytes(code, stack, locals, descriptor, handlers, frames == null ? new byte[0][] : new byte[][]{frames}, false, false);
  }
  private static byte[] classBytes(byte[] code, int stack, int locals, String descriptor, int[][] handlers, byte[][] frames,
      boolean constructor, boolean object) throws IOException {
    ByteArrayOutputStream payloadBytes = new ByteArrayOutputStream();
    DataOutputStream payload = new DataOutputStream(payloadBytes);
    payload.writeShort(stack); payload.writeShort(locals); payload.writeInt(code.length); payload.write(code);
    payload.writeShort(handlers.length);
    for (int[] handler : handlers) for (int value : handler) payload.writeShort(value);
    payload.writeShort(frames.length);
    for (byte[] frame : frames) { payload.writeShort(8); payload.writeInt(frame.length); payload.write(frame); }
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    DataOutputStream out = new DataOutputStream(bytes);
    out.writeInt(0xcafebabe); out.writeShort(0); out.writeShort(69); out.writeShort(17);
    utf(out, object ? "java/lang/Object" : "ReaderFixture"); cls(out, 1);
    utf(out, "java/lang/Object"); cls(out, 3);
    utf(out, "exercise"); utf(out, descriptor); utf(out, "Code"); utf(out, "StackMapTable");
    utf(out, "java/lang/Throwable"); cls(out, 9); utf(out, "java/lang/String"); cls(out, 11);
    utf(out, "<init>"); utf(out, "()V"); out.writeByte(12); out.writeShort(13); out.writeShort(14);
    out.writeByte(10); out.writeShort(4); out.writeShort(15);
    out.writeShort(0x21); out.writeShort(2); out.writeShort(object ? 0 : 4);
    out.writeShort(0); out.writeShort(0); out.writeShort(1);
    out.writeShort(constructor ? 1 : 9); out.writeShort(constructor ? 13 : 5); out.writeShort(6); out.writeShort(1);
    out.writeShort(7); out.writeInt(payloadBytes.size()); out.write(payloadBytes.toByteArray()); out.writeShort(0);
    return bytes.toByteArray();
  }
  private static void utf(DataOutputStream out, String value) throws IOException { out.writeByte(1); out.writeUTF(value); }
  private static void cls(DataOutputStream out, int name) throws IOException { out.writeByte(7); out.writeShort(name); }
  private static void putInt(byte[] bytes, int at, int value) {
    bytes[at] = (byte) (value >>> 24); bytes[at + 1] = (byte) (value >>> 16);
    bytes[at + 2] = (byte) (value >>> 8); bytes[at + 3] = (byte) value;
  }
  private static CodeAttribute parse(byte[] bytes) {
    ClassModel model = ClassFile.of().parse(bytes);
    MethodModel method = model.methods().get(0);
    CodeAttribute code = (CodeAttribute) method.code().orElseThrow(AssertionError::new);
    check(code.parent().orElseThrow(AssertionError::new) == method && method.parent().orElseThrow(AssertionError::new) == model,
      "bound parent identities");
    return code;
  }
  private static List<CodeElement> elements(CodeAttribute code) {
    List<CodeElement> result = new ArrayList<CodeElement>(); code.forEach(result::add); return result;
  }
  private static int count(List<CodeElement> elements, Class<?> type) {
    int result = 0; for (CodeElement element : elements) if (type.isInstance(element)) result++; return result;
  }
  private static <T> T only(List<CodeElement> elements, Class<T> type) {
    T result = null;
    for (CodeElement element : elements) if (type.isInstance(element)) {
      check(result == null, "one " + type.getName()); result = type.cast(element);
    }
    check(result != null, "present " + type.getName()); return result;
  }
  private static boolean hasLabel(List<CodeElement> elements, Label label) {
    for (CodeElement element : elements) if (element instanceof LabelTarget && ((LabelTarget) element).label() == label) return true;
    return false;
  }
  private static void expect(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); }
    catch (Throwable failure) {
      if (failure.getClass() == type) return;
      throw new AssertionError("Expected " + type.getName() + " but got " + failure.getClass().getName(), failure);
    }
    throw new AssertionError("Expected " + type.getName());
  }
  private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
