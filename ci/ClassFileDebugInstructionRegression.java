package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.Signature.*;
import java.lang.classfile.Signature.TypeArg.Bounded.WildcardIndicator;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.*;
import java.util.Arrays;

/** Genuine factory/tree checks and label-based debug builder output, without adapters. */
public final class ClassFileDebugInstructionRegression {
  private static int checks;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    checks++;
  }
  private static void expect(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); }
    catch (Throwable error) {
      check(type.isInstance(error), "Expected " + type.getName() + ", got " + error.getClass().getName());
      return;
    }
    throw new AssertionError("Expected " + type.getName());
  }
  private static String arraySignature(int dimensions, String component) {
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < dimensions; i++) result.append('[');
    return result.append(component).toString();
  }

  private static void signatures() {
    for (char token : "VIJCSBFDZ".toCharArray()) {
      BaseTypeSig type = BaseTypeSig.of(token);
      check(type.baseType() == token && type.signatureString().equals(String.valueOf(token)), "Base signature getter/string");
      check(type.equals(Signature.parseFrom(type.signatureString())) && type.hashCode() == token,
        "Base values are structural, not opaque string carriers");
      check(BaseTypeSig.of(ClassDesc.ofDescriptor(String.valueOf(token))).equals(type) &&
        Signature.of(ClassDesc.ofDescriptor(String.valueOf(token))).equals(type), "Nominal base factories, including void");
    }
    String[] valid = {"Ljava/lang/String;", "TT;", "[I", "[[TT;", "[V", "Ljava/util/List<Ljava/lang/String;>;",
      "Ljava/util/List<*>;", "Ljava/util/List<+Ljava/lang/Number;>;", "Ljava/util/List<-TT;>;",
      "Ljava/util/Map<TK;Ljava/util/List<[TV;>;>;", "Lpkg/Outer<TT;>.Inner<+Ljava/lang/Number;>;",
      "Lpkg/Outer.Inner.Deep;", "Lfoo(bar);", "Tname+other;"};
    for (String value : valid) {
      Signature parsed = Signature.parseFrom(value);
      check(parsed.signatureString().equals(value) && parsed.equals(Signature.parseFrom(value)), "Exact typed parse/serialize roundtrip");
    }
    ClassTypeSig nested = (ClassTypeSig) Signature.parseFrom("Lpkg/Outer<TT;>.Inner<+Ljava/lang/Number;>;");
    check(nested.className().equals("Inner") && nested.outerType().get().className().equals("pkg/Outer"), "Nested segments are a real tree");
    check(nested.classDesc().equals(ClassDesc.of("pkg.Outer$Inner")), "Nested class descriptor drops generic arguments");
    TypeArg.Bounded bound = (TypeArg.Bounded) nested.typeArgs().get(0);
    check(bound.wildcardIndicator() == WildcardIndicator.EXTENDS &&
      ((ClassTypeSig) bound.boundType()).classDesc().equals(ClassDesc.of("java.lang.Number")), "Typed upper-bound tree");
    check(nested instanceof RefTypeSig && nested instanceof ThrowableSig && TypeVarSig.of("T") instanceof ThrowableSig,
      "Exact reference/throwable superinterfaces");
    TypeArg[] arguments = {TypeArg.of(TypeVarSig.of("T")), TypeArg.unbounded(),
      TypeArg.extendsOf(ClassTypeSig.of(ConstantDescs.CD_String)), TypeArg.superOf(ArrayTypeSig.of(TypeVarSig.of("U")))};
    ClassTypeSig nominal = ClassTypeSig.of("pkg.Outer", arguments);
    String expected = "Lpkg/Outer<TT;*+Ljava/lang/String;-[TU;>;";
    check(nominal.signatureString().equals(expected) && nominal.equals(Signature.parseFrom(expected)), "All four type-argument kinds");
    arguments[0] = TypeArg.unbounded();
    check(nominal.signatureString().equals(expected), "Class factory defensively copies its varargs");
    expect(UnsupportedOperationException.class, () -> nominal.typeArgs().clear());
    check(TypeArg.unbounded() == TypeArg.unbounded(), "Unbounded wildcard is a singleton");
    check(TypeArg.bounded(WildcardIndicator.NONE, TypeVarSig.of("T")).equals(TypeArg.of(TypeVarSig.of("T"))), "Explicit bounded factory");
    ClassTypeSig inner = ClassTypeSig.of(nominal, "Inner");
    check(inner.outerType().get() == nominal && inner.className().equals("Inner") &&
      inner.classDesc().equals(ClassDesc.of("pkg.Outer$Inner")), "Nominal nested factory retains actual outer value");
    check(ClassTypeSig.of(nominal, ConstantDescs.CD_String).className().equals("java/lang/String"), "Nominal ClassDesc overload with outer");
    check(ClassTypeSig.of("bad;name").signatureString().equals("Lbad;name;") &&
      ClassTypeSig.of("").signatureString().equals("L;"), "Factories do not invent parser grammar validation");
    check(TypeVarSig.of("").identifier().equals("") && TypeVarSig.of("bad;name").signatureString().equals("Tbad;name;"),
      "Type-variable factory accepts non-null raw identifiers");
    ArrayTypeSig array = ArrayTypeSig.of(2, TypeVarSig.of("T"));
    check(array.signatureString().equals("[[TT;") && array.componentSignature() instanceof ArrayTypeSig &&
      ((ArrayTypeSig) array.componentSignature()).componentSignature().equals(TypeVarSig.of("T")), "Array components expose real signatures");
    check(ArrayTypeSig.of(3, array).equals(ArrayTypeSig.of(5, TypeVarSig.of("T"))), "Nested array depths are combined structurally");
    check(Signature.of(ConstantDescs.CD_String.arrayType(2)).equals(Signature.parseFrom("[[Ljava/lang/String;")), "Nominal array tree");
    check(ArrayTypeSig.of(255, BaseTypeSig.of('I')).signatureString().equals(arraySignature(255, "I")), "255-dimensional factory limit");
    check(Signature.parseFrom(arraySignature(255, "TT;")).signatureString().equals(arraySignature(255, "TT;")), "255-dimensional parsed tree");
    expect(IllegalArgumentException.class, () -> ArrayTypeSig.of(1, ArrayTypeSig.of(255, BaseTypeSig.of('I'))));
    for (int depth : new int[] {-1, 0, 256, Integer.MIN_VALUE, Integer.MAX_VALUE})
      expect(IllegalArgumentException.class, () -> ArrayTypeSig.of(depth, BaseTypeSig.of('I')));
    expect(NullPointerException.class, () -> ArrayTypeSig.of(0, null));
    expect(NullPointerException.class, () -> ArrayTypeSig.of((Signature) null));
    expect(IllegalArgumentException.class, () -> Signature.parseFrom(arraySignature(256, "I")));
    for (String invalid : Arrays.asList("", "X", "II", "Ljava/lang/String", "L;", "L/foo;", "Lfoo/;", "Lfoo<>;",
      "Lfoo<I>;", "Lfoo<+I>;", "Lfoo<-I>;", "Lfoo<*", "Lfoo.;", "Lfoo.Inner/Bad;", "Lfoo;;", "T;", "TT", "[", "[X",
      "(I)V", "<T:Ljava/lang/Object;>Ljava/lang/Object;"))
      expect(IllegalArgumentException.class, () -> Signature.parseFrom(invalid));
    for (char invalid : new char[] {'L', '[', 'X', 0}) expect(IllegalArgumentException.class, () -> BaseTypeSig.of(invalid));
    expect(IllegalArgumentException.class, () -> BaseTypeSig.of(ConstantDescs.CD_String));
    expect(IllegalArgumentException.class, () -> BaseTypeSig.of(ConstantDescs.CD_int.arrayType()));
    expect(IllegalArgumentException.class, () -> ClassTypeSig.of(ConstantDescs.CD_int));
    expect(IllegalArgumentException.class, () -> ClassTypeSig.of(ConstantDescs.CD_String.arrayType()));
    expect(IllegalArgumentException.class, () -> ClassTypeSig.of(ConstantDescs.CD_int, (TypeArg[]) null));
    expect(NullPointerException.class, () -> Signature.parseFrom(null));
    expect(NullPointerException.class, () -> Signature.of(null));
    expect(NullPointerException.class, () -> BaseTypeSig.of((ClassDesc) null));
    expect(NullPointerException.class, () -> ClassTypeSig.of((String) null));
    expect(NullPointerException.class, () -> ClassTypeSig.of("Name", (TypeArg[]) null));
    expect(NullPointerException.class, () -> ClassTypeSig.of("Name", new TypeArg[] {null}));
    expect(NullPointerException.class, () -> TypeVarSig.of(null));
    expect(NullPointerException.class, () -> TypeArg.of(null));
    expect(NullPointerException.class, () -> TypeArg.extendsOf(null));
    expect(NullPointerException.class, () -> TypeArg.superOf(null));
    expect(NullPointerException.class, () -> TypeArg.bounded(null, null));
  }

  private static void factoryValues(CodeBuilder code) {
    Label start = code.newLabel(), end = code.newLabel();
    ConstantPoolBuilder pool = code.constantPool();
    Utf8Entry name = pool.utf8Entry("items"), type = pool.utf8Entry(ClassDesc.of("java.util.List"));
    Utf8Entry signature = pool.utf8Entry("Ljava/util/List<Ljava/lang/String;>;");
    for (int slot : new int[] {0, 65535}) {
      LocalVariable local = LocalVariable.of(slot, name, type, start, end);
      check(local.slot() == slot && local.name() == name && local.type() == type && local.startScope() == start &&
        local.endScope() == end && local.typeSymbol().equals(ClassDesc.of("java.util.List")), "Local-variable raw identity/getters");
      LocalVariableType generic = LocalVariableType.of(slot, name, signature, start, end);
      check(generic.slot() == slot && generic.name() == name && generic.signature() == signature && generic.startScope() == start &&
        generic.endScope() == end && generic.signatureSymbol().equals(Signature.parseFrom(signature.stringValue())), "Local-variable-type real generic symbol");
    }
    LocalVariable nominal = LocalVariable.of(2, "items", ClassDesc.of("java.util.List"), start, end);
    LocalVariable nominalAgain = LocalVariable.of(2, "items", ClassDesc.of("java.util.List"), start, end);
    LocalVariableType nominalType = LocalVariableType.of(2, "items", Signature.parseFrom(signature.stringValue()), start, end);
    check(nominal.name().index() == -1 && nominal.type().index() == -1 && nominalType.signature().index() == -1,
      "Nominal factories produce genuine unbound UTF entries");
    check(nominal.name() != nominalAgain.name() && nominal.name().constantPool() == nominalAgain.name().constantPool() &&
      nominal.name().constantPool() == nominalType.signature().constantPool(), "Distinct values share actual temporary owner");
    check(nominalType.signatureSymbol() instanceof ClassTypeSig && nominalType.signatureSymbol().signatureString().equals(signature.stringValue()),
      "Generic pseudo exposes the typed Signature ABI");
    LocalVariable invalidType = LocalVariable.of(0, name, pool.utf8Entry("not-a-descriptor"), start, end);
    expect(IllegalArgumentException.class, () -> invalidType.typeSymbol());
    LocalVariableType invalidSignature = LocalVariableType.of(0, name, pool.utf8Entry("not-a-signature"), start, end);
    expect(IllegalArgumentException.class, () -> invalidSignature.signatureSymbol());
    for (int slot : new int[] {-1, 65536, Integer.MIN_VALUE, Integer.MAX_VALUE}) {
      expect(IllegalArgumentException.class, () -> LocalVariable.of(slot, name, type, start, end));
      expect(IllegalArgumentException.class, () -> LocalVariableType.of(slot, name, signature, start, end));
    }
    expect(IllegalArgumentException.class, () -> LocalVariable.of(-1, (Utf8Entry) null, null, null, null));
    expect(IllegalArgumentException.class, () -> LocalVariableType.of(-1, (Utf8Entry) null, null, null, null));
    expect(NullPointerException.class, () -> LocalVariable.of(0, (Utf8Entry) null, type, start, end));
    expect(NullPointerException.class, () -> LocalVariable.of(0, name, (Utf8Entry) null, start, end));
    expect(NullPointerException.class, () -> LocalVariable.of(0, name, type, null, end));
    expect(NullPointerException.class, () -> LocalVariable.of(0, name, type, start, null));
    expect(NullPointerException.class, () -> LocalVariableType.of(0, (Utf8Entry) null, signature, start, end));
    expect(NullPointerException.class, () -> LocalVariableType.of(0, name, (Utf8Entry) null, start, end));
    expect(NullPointerException.class, () -> LocalVariableType.of(0, name, signature, null, end));
    expect(NullPointerException.class, () -> LocalVariableType.of(0, name, signature, start, null));
    expect(NullPointerException.class, () -> LocalVariable.of(-1, (String) null, ConstantDescs.CD_int, start, end));
    expect(NullPointerException.class, () -> LocalVariable.of(-1, "name", (ClassDesc) null, start, end));
    expect(NullPointerException.class, () -> LocalVariableType.of(-1, (String) null, Signature.of(ConstantDescs.CD_int), start, end));
    expect(NullPointerException.class, () -> LocalVariableType.of(-1, "name", (Signature) null, start, end));
    CharacterRange range = CharacterRange.of(start, end, Integer.MIN_VALUE, Integer.MAX_VALUE, -1);
    check(range.startScope() == start && range.endScope() == end && range.characterRangeStart() == Integer.MIN_VALUE &&
      range.characterRangeEnd() == Integer.MAX_VALUE && range.flags() == -1, "Character-range factory only validates labels");
    expect(NullPointerException.class, () -> CharacterRange.of(null, end, 1, 2, 3));
    expect(NullPointerException.class, () -> CharacterRange.of(start, null, 1, 2, 3));
    check(CharacterRange.FLAG_STATEMENT == 1 && CharacterRange.FLAG_BLOCK == 2 && CharacterRange.FLAG_ASSIGNMENT == 4 &&
      CharacterRange.FLAG_FLOW_CONTROLLER == 8 && CharacterRange.FLAG_FLOW_TARGET == 16 && CharacterRange.FLAG_INVOKE == 32 &&
      CharacterRange.FLAG_CREATE == 64 && CharacterRange.FLAG_BRANCH_TRUE == 128 && CharacterRange.FLAG_BRANCH_FALSE == 256,
      "All nine native flags");
  }

  private static void lines() {
    for (int line : new int[] {0, 1, 999}) check(LineNumber.of(line).line() == line && LineNumber.of(line) == LineNumber.of(line), "Native cached line range");
    for (int line : new int[] {1000, 65535, 65536, Integer.MAX_VALUE})
      check(LineNumber.of(line).line() == line && LineNumber.of(line) != LineNumber.of(line), "Native fresh positive lines are not prematurely u2-capped");
    expect(ArrayIndexOutOfBoundsException.class, () -> LineNumber.of(-1));
    expect(ArrayIndexOutOfBoundsException.class, () -> LineNumber.of(Integer.MIN_VALUE));
  }

  private static void aliases() {
    ClassDesc list = ClassDesc.of("java.util.List");
    ClassFile classFile = ClassFile.of();
    byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.DebugAliasOutput"), builder ->
      builder.withMethodBody("value", MethodTypeDesc.of(list, list), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, code -> {
        Label start = code.startLabel(), end = code.endLabel();
        code.lineNumber(65536);
        code.localVariable(0, code.constantPool().utf8Entry("raw"), code.constantPool().utf8Entry(list), start, end);
        code.localVariable(0, "nominal", list, start, end);
        code.localVariableType(0, code.constantPool().utf8Entry("raw"),
          code.constantPool().utf8Entry("Ljava/util/List<Ljava/lang/String;>;"), start, end);
        code.localVariableType(0, "nominal", Signature.parseFrom("Ljava/util/List<Ljava/lang/String;>;"), start, end);
        code.characterRange(start, end, 10, 20, CharacterRange.FLAG_STATEMENT);
        code.aload(0).areturn();
      }));
    check(classFile.verify(bytes).isEmpty(), "Actual six-alias output verifies");
    ClassModel model = classFile.parse(bytes);
    CodeModel codeModel = model.methods().get(0).code().get();
    check(codeModel.findAttribute(Attributes.lineNumberTable()).get().lineNumbers().get(0).lineNumber() == 0,
      "65536 is retained as an actual clipped raw line-table entry");
    int lineCount = 0, locals = 0, genericLocals = 0, ranges = 0;
    for (CodeElement element : codeModel) {
      if (element instanceof LineNumber) {
        check(((LineNumber) element).line() == 0, "Line-number serialization clips only at the u2 writer"); lineCount++;
      } else if (element instanceof LocalVariable) {
        LocalVariable local = (LocalVariable) element;
        check(local.slot() == 0 && local.typeSymbol().equals(list) && local.name().index() > 0 &&
          local.name().constantPool() == model.constantPool(), "Real local-variable output has indexed owner/type"); locals++;
      } else if (element instanceof LocalVariableType) {
        LocalVariableType local = (LocalVariableType) element;
        check(local.slot() == 0 && local.signatureSymbol() instanceof ClassTypeSig &&
          local.signatureSymbol().signatureString().equals("Ljava/util/List<Ljava/lang/String;>;"), "Real generic-local output parses typed signatures"); genericLocals++;
      } else if (element instanceof CharacterRange) {
        CharacterRange range = (CharacterRange) element;
        check(range.characterRangeStart() == 10 && range.characterRangeEnd() == 20 && range.flags() == 1,
          "Real character-range output retains original operands"); ranges++;
      }
    }
    check(lineCount == 0 && locals == 2 && genericLocals == 2 && ranges == 1,
      "All six aliases serialize; clipped line0 is the native traversal sentinel, not a pseudo element");
  }

  public static void main(String[] arguments) {
    signatures(); lines();
    ClassFile.of().build(ClassDesc.of("classes.modern_test.DebugFactoryLabels"), builder ->
      builder.withMethodBody("value", MethodTypeDesc.of(ConstantDescs.CD_void), ClassFile.ACC_STATIC,
        code -> { factoryValues(code); code.return_(); }));
    aliases();
    System.out.println("CLASSFILE_DEBUG_INSTRUCTION_REGRESSION_OK|" + checks);
  }
}
