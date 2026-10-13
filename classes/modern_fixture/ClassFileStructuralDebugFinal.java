package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;

/** Original stock-javac25 selected structural debug checks, never a source adapter. */
public final class ClassFileStructuralDebugFinal {
  private static final ClassDesc LIST = ClassDesc.of("java.util.List");
  private static final String GENERIC = "Ljava/util/List<Ljava/lang/String;>;";
  private static final int PUBLIC_STATIC = ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC;
  private static int recipe, checks, artifacts;

  private static void check(boolean condition) {
    ClassFileSupport.check(condition);
    checks++;
  }
  private static void require(boolean condition) { ClassFileSupport.check(condition); }
  private static ClassFile context(boolean debug, boolean lines) {
    return ClassFile.of(debug ? ClassFile.DebugElementsOption.PASS_DEBUG : ClassFile.DebugElementsOption.DROP_DEBUG,
        lines ? ClassFile.LineNumbersOption.PASS_LINE_NUMBERS : ClassFile.LineNumbersOption.DROP_LINE_NUMBERS);
  }
  private static byte[] build(String name, int selectedRecipe) {
    recipe = selectedRecipe;
    return ClassFile.of().build(ClassDesc.of("classes.modern_test." + name), ClassFileStructuralDebugFinal::buildClass);
  }
  private static void buildClass(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER).withMethodBody("value",
        MethodTypeDesc.of(CD_int, CD_int, LIST), PUBLIC_STATIC, ClassFileStructuralDebugFinal::buildCode);
  }
  private static void buildCode(CodeBuilder builder) {
    Label start = builder.newLabel(), middle = builder.newLabel(), end = builder.newLabel();
    builder.labelBinding(start).lineNumber(11).iload(0).sipush(1234).labelBinding(middle).iadd()
        .lineNumber(22).ireturn().labelBinding(end);
    ConstantPoolBuilder pool = builder.constantPool();
    Utf8Entry name = pool.utf8Entry("x"), type = pool.utf8Entry(recipe == 5 ? "(I)I" : recipe == 4 ? "J" : "I");
    int slot = recipe == 3 ? 65535 : recipe == 4 ? 1 : 0;
    Label localStart = recipe == 2 ? end : recipe == 1 ? middle : start;
    Label localEnd = recipe == 2 ? end : recipe == 1 ? start : end;
    builder.with(LocalVariable.of(slot, name, type, localStart, localEnd));
    builder.localVariable(1, "items", LIST, start, end);
    builder.with(LocalVariableType.of(1, pool.utf8Entry("items"),
        pool.utf8Entry(recipe == 5 ? "!" : GENERIC), start, end));
    builder.characterRange(start, end, 1025, 2050, CharacterRange.FLAG_STATEMENT);
    if (recipe == 6) builder.localVariable(0, "empty", CD_int, middle, middle);
    if (recipe == 3) {
      boolean negative = false, overflow = false;
      try { LocalVariable.of(-1, name, type, start, end); } catch (IllegalArgumentException expected) { negative = true; }
      try { LocalVariableType.of(65536, name, pool.utf8Entry(GENERIC), start, end); }
      catch (IllegalArgumentException expected) { overflow = true; }
      check(negative && overflow);
    }
  }
  private static CodeAttribute code(ClassFile api, byte[] bytes) {
    return (CodeAttribute) api.parse(bytes).methods().get(0).code().get();
  }
  private static void verify(byte[] bytes, boolean debug, boolean lines, boolean valid) {
    ClassFile api = context(debug, lines);
    List<VerifyError> first = api.verify(bytes), second = api.verify(api.parse(bytes));
    check(first.isEmpty() == valid && second.isEmpty() == valid);
    for (VerifyError error : first) check(error.getClass() == VerifyError.class);
    for (VerifyError error : second) check(error.getClass() == VerifyError.class);
  }
  private static void traversal(byte[] bytes, boolean debug, boolean lines, boolean valid) {
    boolean failed = false;
    try { for (CodeElement ignored : code(context(debug, lines), bytes)) {} }
    catch (IllegalArgumentException expected) { failed = true; }
    check(failed != valid);
  }
  private static void output(String id, String name, byte[] bytes) {
    artifact(id, name, bytes);
    artifacts++;
  }
  private static void invoke(byte[] bytes) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    MethodHandle handle = lookup.findStatic(generated, "value", MethodType.methodType(int.class, int.class, List.class));
    List<String> held = List.of("debug");
    check((int) handle.invokeExact(7, held) == 1241);
  }
  private static int u2(byte[] bytes, int at) {
    require(at >= 0 && at <= bytes.length - 2);
    return (bytes[at] & 255) << 8 | bytes[at + 1] & 255;
  }
  private static int u4(byte[] bytes, int at) {
    int value = u2(bytes, at) << 16 | u2(bytes, at + 2);
    require(value >= 0);
    return value;
  }
  private static int nextAttribute(byte[] bytes, int at) {
    int next = at + 6 + u4(bytes, at + 2);
    require(next >= at && next <= bytes.length);
    return next;
  }
  /** Independently locate exactly one first entry in the selected Code table. */
  private static int payload(byte[] bytes, String selected) {
    require(bytes.length >= 10 && (bytes[0] & 255) == 0xca && (bytes[1] & 255) == 0xfe &&
        (bytes[2] & 255) == 0xba && (bytes[3] & 255) == 0xbe);
    int count = u2(bytes, 8), at = 10;
    String[] utf = new String[count];
    for (int index = 1; index < count; index++) {
      require(at < bytes.length);
      int tag = bytes[at++] & 255;
      if (tag == 1) {
        int length = u2(bytes, at); at += 2;
        require(length <= bytes.length - at);
        utf[index] = new String(bytes, at, length, StandardCharsets.UTF_8); at += length;
      } else if (tag == 3 || tag == 4 || tag == 9 || tag == 10 || tag == 11 || tag == 12 || tag == 17 || tag == 18) at += 4;
      else if (tag == 5 || tag == 6) { at += 8; index++; }
      else if (tag == 7 || tag == 8 || tag == 16 || tag == 19 || tag == 20) at += 2;
      else if (tag == 15) at += 3;
      else throw new AssertionError("Unexpected constant-pool tag " + tag);
      require(at <= bytes.length);
    }
    at += 6; int interfaces = u2(bytes, at); at += 2 + 2 * interfaces;
    int fields = u2(bytes, at); at += 2;
    for (int field = 0; field < fields; field++) {
      int attributes = u2(bytes, at + 6); at += 8;
      for (int attr = 0; attr < attributes; attr++) at = nextAttribute(bytes, at);
    }
    int methods = u2(bytes, at); at += 2;
    int located = -1, matches = 0;
    for (int method = 0; method < methods; method++) {
      int attributes = u2(bytes, at + 6); at += 8;
      for (int attr = 0; attr < attributes; attr++) {
        int name = u2(bytes, at), next = nextAttribute(bytes, at);
        require(name > 0 && name < utf.length);
        if ("Code".equals(utf[name])) {
          int start = at + 6, length = u4(bytes, start + 4), nested = start + 8 + length;
          require(nested >= start && nested <= next - 2);
          int catches = u2(bytes, nested); nested += 2 + catches * 8;
          int nestedCount = u2(bytes, nested); nested += 2;
          for (int item = 0; item < nestedCount; item++) {
            int key = u2(bytes, nested), nestedNext = nextAttribute(bytes, nested);
            require(key > 0 && key < utf.length && nestedNext <= next);
            if (selected.equals(utf[key])) {
              located = nested + 6; matches++;
              int width = "LineNumberTable".equals(selected) ? 4 : "CharacterRangeTable".equals(selected) ? 14 : 10;
              require(u2(bytes, located) > 0 && nestedNext - located == 2 + u2(bytes, located) * width);
            }
            nested = nestedNext;
          }
          require(nested == next);
        }
        at = next;
      }
    }
    require(matches == 1 && located >= 0);
    return located;
  }
  private static byte[] mutate(byte[] original, String table, int relative, int expected, int value) {
    int at = payload(original, table) + relative;
    require(relative >= 2 && (relative & 1) == 0 && u2(original, at) == expected &&
        value >= 0 && value <= 65535 && value != expected);
    byte[] preserved = original.clone(), result = original.clone();
    result[at] = (byte) (value >>> 8); result[at + 1] = (byte) value;
    int changed = 0;
    for (int index = 0; index < original.length; index++) if (original[index] != result[index]) {
      require(index == at || index == at + 1); changed++;
    }
    require(changed >= 1 && changed <= 2 && u2(result, at) == value && Arrays.equals(original, preserved));
    return result;
  }

  private static void caseValid() throws Throwable {
    String id = "cf-struct-debug-valid";
    byte[] bytes = build("C7dStructuralDebugValid", 0), zero = build("C7dStructuralDebugZero", 6);
    CodeAttribute code = code(ClassFile.of(), bytes), foreign = code(ClassFile.of(), zero);
    check(code.codeLength() == 6 && code.maxLocals() == 2);
    LocalVariableInfo local = code.findAttribute(Attributes.localVariableTable()).get().localVariables().get(0);
    check(local.startPc() == 0 && local.length() == 6 && local.slot() == 0 && local.typeSymbol().equals(CD_int));
    LocalVariableInfo empty = code(ClassFile.of(), zero).findAttribute(Attributes.localVariableTable()).get().localVariables().get(2);
    check(empty.startPc() == 4 && empty.length() == 0);
    Label held = null;
    for (CodeElement element : code) if (element instanceof LocalVariable) { held = ((LocalVariable) element).startScope(); break; }
    check(held != null && code.labelToBci(held) == 0);
    boolean rejected = false;
    try { foreign.labelToBci(held); } catch (IllegalArgumentException expected) { rejected = true; }
    check(rejected);
    verify(bytes, true, true, true); verify(zero, true, true, true);
    output(id, "struct-debug-valid", bytes); invoke(bytes);
    output(id, "struct-debug-zero", zero); invoke(zero);
    emit(id, "LVT/LVTT/CRT/LNT=raw-typed;zero-length-at-instruction=valid;labels=own-only;value=1241;defined/invoked=same-two-arrays");
  }
  private static void caseStart() {
    String id = "cf-struct-debug-lvt-start";
    byte[] source = build("C7dStructuralDebugStart", 0);
    byte[] operand = mutate(source, "LocalVariableTable", 2, 0, 2), terminal = mutate(source, "LocalVariableTable", 2, 0, 6);
    for (byte[] bytes : List.of(operand, terminal)) { verify(bytes, true, true, false); verify(bytes, false, true, false); }
    output(id, "struct-debug-lvt-start-operand", operand); output(id, "struct-debug-lvt-start-terminal", terminal);
    emit(id, "first-LVT-start=operand/terminal;verify(bytes/model)=nonempty-PASS-and-DROP_DEBUG;malformed-never-defined");
  }
  private static void caseEnd() throws Throwable {
    String id = "cf-struct-debug-lvt-end";
    byte[] source = build("C7dStructuralDebugEnd", 0);
    byte[] operand = mutate(source, "LocalVariableTable", 4, 6, 2), past = mutate(source, "LocalVariableTable", 4, 6, 7),
        boundary = mutate(source, "LocalVariableTable", 4, 6, 4);
    verify(operand, true, true, false); verify(operand, false, true, false);
    verify(past, true, true, false); verify(past, false, true, false);
    verify(boundary, true, true, true);
    output(id, "struct-debug-lvt-end-operand", operand); output(id, "struct-debug-lvt-end-past", past);
    output(id, "struct-debug-lvt-end-boundary", boundary); invoke(boundary);
    emit(id, "first-LVT-end=operand/past-rejected;instruction-boundary=valid;value=1241;only-valid-boundary-array-defined");
  }
  private static void caseReversed() {
    String id = "cf-struct-debug-lvt-reversed";
    byte[] reversed = build("C7dStructuralDebugReversed", 1), terminal = build("C7dStructuralDebugTerminal", 2);
    LocalVariableInfo first = code(ClassFile.of(), reversed).findAttribute(Attributes.localVariableTable()).get().localVariables().get(0);
    LocalVariableInfo last = code(ClassFile.of(), terminal).findAttribute(Attributes.localVariableTable()).get().localVariables().get(0);
    check(first.startPc() == 4 && first.length() == 65532 && first.startPc() + first.length() == 65536);
    check(last.startPc() == 6 && last.length() == 0);
    for (byte[] bytes : List.of(reversed, terminal)) { verify(bytes, true, true, false); verify(bytes, false, true, false); }
    traversal(reversed, true, true, false); traversal(reversed, false, true, true);
    output(id, "struct-debug-lvt-reversed", reversed); output(id, "struct-debug-lvt-terminal-zero", terminal);
    emit(id, "builder-reversed=4+65532-wide-end65536;terminal-zero=6+0;verify=nonempty-even-DROP_DEBUG;malformed-never-defined");
  }
  private static void caseSlots() {
    String id = "cf-struct-debug-slots";
    byte[] large = build("C7dStructuralDebugSlots", 3), wide = build("C7dStructuralDebugWideSlot", 4);
    LocalVariableInfo first = code(ClassFile.of(), large).findAttribute(Attributes.localVariableTable()).get().localVariables().get(0),
        second = code(ClassFile.of(), wide).findAttribute(Attributes.localVariableTable()).get().localVariables().get(0);
    check(first.slot() == 65535 && second.slot() == 1 && second.typeSymbol().equals(CD_long));
    verify(large, true, true, true); verify(wide, true, true, true);
    output(id, "struct-debug-slot65535", large); output(id, "struct-debug-wide-last-slot", wide);
    emit(id, "factory=-1/65536-rejected;raw-slot65535-and-J-at-last-slot=retained;selected-library-verify=empty;unsafe-metadata-never-defined");
  }
  private static void caseTypeText() {
    String id = "cf-struct-debug-type-text";
    byte[] bytes = build("C7dStructuralDebugTypeText", 5);
    CodeAttribute code = code(ClassFile.of(), bytes);
    LocalVariableInfo local = code.findAttribute(Attributes.localVariableTable()).get().localVariables().get(0);
    check(local.type().equalsString("(I)I") && code.findAttribute(Attributes.localVariableTypeTable()).get()
        .localVariableTypes().get(0).signature().equalsString("!"));
    verify(bytes, true, true, true);
    boolean typeFailed = false, signatureFailed = false;
    try { local.typeSymbol(); } catch (IllegalArgumentException expected) { typeFailed = true; }
    for (CodeElement element : code) if (element instanceof LocalVariableType) {
      try { ((LocalVariableType) element).signatureSymbol(); } catch (IllegalArgumentException expected) { signatureFailed = true; }
    }
    check(typeFailed && signatureFailed);
    output(id, "struct-debug-type-text", bytes);
    emit(id, "raw-LVT=(I)I;raw-LVTT=!;selected-library-verify=empty;explicit-symbol-access=IAE;unsafe-metadata-never-defined");
  }
  private static void caseLocalTypeRanges() {
    String id = "cf-struct-debug-local-type-ranges";
    byte[] source = build("C7dStructuralDebugLocalRanges", 0);
    byte[] localStart = mutate(source, "LocalVariableTypeTable", 2, 0, 7),
        localEnd = mutate(source, "LocalVariableTypeTable", 4, 6, 7),
        localOperand = mutate(mutate(source, "LocalVariableTypeTable", 2, 0, 2), "LocalVariableTypeTable", 4, 6, 4),
        charStart = mutate(source, "CharacterRangeTable", 2, 0, 7),
        charEnd = mutate(source, "CharacterRangeTable", 4, 5, 6),
        charReversed = mutate(mutate(source, "CharacterRangeTable", 2, 0, 4), "CharacterRangeTable", 4, 5, 0);
    for (byte[] bytes : List.of(localStart, localEnd, charStart, charEnd)) {
      verify(bytes, true, true, false); verify(bytes, false, true, true);
      traversal(bytes, true, true, false); traversal(bytes, false, true, true);
    }
    verify(localOperand, true, true, true); verify(charReversed, true, true, true);
    output(id, "struct-debug-lvtt-start-past", localStart); output(id, "struct-debug-lvtt-end-past", localEnd);
    output(id, "struct-debug-lvtt-operand", localOperand); output(id, "struct-debug-crt-start-past", charStart);
    output(id, "struct-debug-crt-end-past", charEnd); output(id, "struct-debug-crt-reversed-in-range", charReversed);
    emit(id, "LVTT/CRT-out-of-range=PASS-reject/DROP-accept-raw-retained;LVTT-operand/CRT-reversed-in-range=library-accepted;unsafe-metadata-never-defined");
  }
  private static void caseLines() {
    String id = "cf-struct-debug-line-ranges";
    byte[] source = build("C7dStructuralDebugLines", 0);
    byte[] operand = mutate(source, "LineNumberTable", 2, 0, 2), terminal = mutate(source, "LineNumberTable", 2, 0, 6),
        past = mutate(source, "LineNumberTable", 2, 0, 7);
    verify(operand, true, true, true); verify(terminal, true, true, true);
    verify(past, true, true, false); verify(past, true, false, true);
    traversal(past, true, true, false); traversal(past, true, false, true);
    output(id, "struct-debug-lnt-operand", operand); output(id, "struct-debug-lnt-terminal", terminal);
    output(id, "struct-debug-lnt-past", past);
    emit(id, "LNT-operand/terminal=library-accepted;past=PASS-reject/DROP-accept-raw-retained;unsafe-metadata-never-defined");
  }
  public static void main(String[] arguments) throws Throwable {
    caseValid(); caseStart(); caseEnd(); caseReversed(); caseSlots(); caseTypeText(); caseLocalTypeRanges(); caseLines();
    System.out.println("CLASSFILE_STRUCTURAL_DEBUG_OK|" + checks + "|artifacts=" + artifacts);
  }
}
