package classes.modern_test;
import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.nio.charset.StandardCharsets;
import java.util.List;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;

/** Genuine Java25 debug pseudo factories and independent traversal/build options. */
public final class ClassFileDebugModelFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ClassDesc LIST=ClassDesc.of("java.util.List");
  private static final String GENERIC="Ljava/util/List<Ljava/lang/String;>;",SMAP="SMAP\nDebug.java\nJava\n*S Java\n*F\n1 Debug.java\n*L\n1#1:1\n*E\n";
  private static SourceDebugExtensionAttribute source;
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void buildLine(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileDebugModelFinal::codeLine);}
  private static void codeLine(CodeBuilder b) {b.with(LineNumber.of(11)).bipush(42).ireturn();}
  private static void buildLocal(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,ClassFileDebugModelFinal::codeLocal);}
  private static void codeLocal(CodeBuilder b) {Label start=b.newLabel(),end=b.newLabel();b.labelBinding(start).iload(0).ireturn().labelBinding(end).with(LocalVariable.of(0,"value",CD_int,start,end));}
  private static void buildGeneric(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_Object,LIST),PUBLIC_STATIC,ClassFileDebugModelFinal::codeGeneric);}
  private static void codeGeneric(CodeBuilder b) {
    Label start=b.newLabel(),end=b.newLabel();Signature signature=Signature.parseFrom(GENERIC);
    check(signature instanceof Signature.ClassTypeSig && ((Signature.ClassTypeSig)signature).typeArgs().size()==1 && Signature.of(CD_String).signatureString().equals("Ljava/lang/String;"));
    b.labelBinding(start).aload(0).areturn().labelBinding(end).with(LocalVariable.of(0,"items",LIST,start,end)).with(LocalVariableType.of(0,"items",signature,start,end));
  }
  private static void buildCharacter(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,ClassFileDebugModelFinal::codeCharacter);}
  private static void codeCharacter(CodeBuilder b) {Label start=b.newLabel(),end=b.newLabel();b.labelBinding(start).iload(0).ireturn().labelBinding(end).with(CharacterRange.of(start,end,2049,3081,CharacterRange.FLAG_STATEMENT|CharacterRange.FLAG_BLOCK));}
  private static void buildSource(ClassBuilder b) {flags(b);b.with(source).withMethodBody("value",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileDebugModelFinal::codeValue);}
  private static void codeValue(CodeBuilder b) {b.bipush(17).ireturn();}
  private static void buildAll(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,ClassFileDebugModelFinal::codeAll);}
  private static void codeAll(CodeBuilder b) {Label start=b.newLabel(),end=b.newLabel();b.labelBinding(start).lineNumber(10).iload(0).ireturn().labelBinding(end).localVariable(0,"value",CD_int,start,end).characterRange(start,end,100,200,CharacterRange.FLAG_STATEMENT);}
  private static void caseLine() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugLine"),ClassFileDebugModelFinal::buildLine);CodeModel code=api.parse(bytes).methods().get(0).code().get();
    check(code.findAttribute(Attributes.lineNumberTable()).get().lineNumbers().get(0).startPc()==0 && code.findAttribute(Attributes.lineNumberTable()).get().lineNumbers().get(0).lineNumber()==11 && api.verify(bytes).isEmpty());
    artifact("cf-debug-line","debug-line",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==42);
    emit("cf-debug-line","LineNumber.of=11;LineNumberTable=0:11;value=42;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseLocal() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugLocal"),ClassFileDebugModelFinal::buildLocal);CodeModel code=api.parse(bytes).methods().get(0).code().get();LocalVariableInfo info=code.findAttribute(Attributes.localVariableTable()).get().localVariables().get(0);
    check(info.startPc()==0 && info.length()==2 && info.slot()==0 && info.name().equalsString("value") && info.typeSymbol().equals(CD_int) && api.verify(bytes).isEmpty());
    artifact("cf-debug-local","debug-local",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(29)==29);
    emit("cf-debug-local","LocalVariable.of=slot0/value:I;scope=0+2;typeSymbol=int;value=29;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseGeneric() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugGeneric"),ClassFileDebugModelFinal::buildGeneric);CodeModel code=api.parse(bytes).methods().get(0).code().get();
    LocalVariableTypeInfo info=code.findAttribute(Attributes.localVariableTypeTable()).get().localVariableTypes().get(0);check(info.startPc()==0 && info.length()==2 && info.signature().equalsString(GENERIC));
    boolean typed=false;for(CodeElement element:code)if(element instanceof LocalVariableType){LocalVariableType variable=(LocalVariableType)element;check(variable.signatureSymbol().signatureString().equals(GENERIC));typed=true;}check(typed && api.verify(bytes).isEmpty());
    artifact("cf-debug-generic-local","debug-generic",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(Object.class,List.class));List<String> value=List.of("generic");check((Object)handle.invokeExact(value)==value);
    emit("cf-debug-generic-local","LocalVariableType.of=items:List<String>;Signature=parse-tree/roundtrip;LVT/LVTT=0+2;value=held-identity;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCharacter() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugCharacter"),ClassFileDebugModelFinal::buildCharacter);CharacterRangeInfo info=api.parse(bytes).methods().get(0).code().get().findAttribute(Attributes.characterRangeTable()).get().characterRangeTable().get(0);
    check(info.startPc()==0 && info.endPc()==1 && info.characterRangeStart()==2049 && info.characterRangeEnd()==3081 && info.flags()==3 && api.verify(bytes).isEmpty());
    artifact("cf-debug-character","debug-character",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(31)==31);
    emit("cf-debug-character","CharacterRange.of=scopes0..2;rawBCIs=0..1-inclusive;characters=2049..3081;flags=3;value=31;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseSource() throws Throwable {
    byte[] payload=SMAP.getBytes(StandardCharsets.UTF_8);source=SourceDebugExtensionAttribute.of(payload);check(source.contents()==payload);
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugSource"),ClassFileDebugModelFinal::buildSource);check(new String(api.parse(bytes).findAttribute(Attributes.sourceDebugExtension()).get().contents(),StandardCharsets.UTF_8).equals(SMAP) && api.verify(bytes).isEmpty());
    artifact("cf-debug-source-extension","debug-source",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-debug-source-extension","SourceDebugExtension.of=input-array-alias;SMAP=exact-UTF8;value=17;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseDropLine() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.LineNumbersOption.DROP_LINE_NUMBERS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugDropLine"),ClassFileDebugModelFinal::buildAll);CodeModel code=api.parse(bytes).methods().get(0).code().get();
    check(code.findAttribute(Attributes.lineNumberTable()).isPresent() && code.findAttribute(Attributes.localVariableTable()).isPresent() && code.findAttribute(Attributes.characterRangeTable()).isPresent() && api.verify(bytes).isEmpty());for(CodeElement element:code)check(!(element instanceof LineNumber));
    artifact("cf-debug-drop-line","debug-drop-line",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(37)==37);
    emit("cf-debug-drop-line","DROP_LINE_NUMBERS=traversal-absent;explicit-built-LNT=retained;PASS_DEBUG=LVT/CRT-retained;value=37;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseDropDebug() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.DebugElementsOption.DROP_DEBUG);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugDropDebug"),ClassFileDebugModelFinal::buildAll);CodeModel code=api.parse(bytes).methods().get(0).code().get();
    check(code.findAttribute(Attributes.lineNumberTable()).isPresent() && !code.findAttribute(Attributes.localVariableTable()).isPresent() && !code.findAttribute(Attributes.characterRangeTable()).isPresent() && api.verify(bytes).isEmpty());
    artifact("cf-debug-drop-debug","debug-drop-debug",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(41)==41);
    emit("cf-debug-drop-debug","DROP_DEBUG=LVT/CRT-absent;PASS_LINE_NUMBERS=retained;value=41;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseDropBoth() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.DebugElementsOption.DROP_DEBUG,ClassFile.LineNumbersOption.DROP_LINE_NUMBERS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDebugDropBoth"),ClassFileDebugModelFinal::buildAll);CodeModel code=api.parse(bytes).methods().get(0).code().get();
    check(code.findAttribute(Attributes.lineNumberTable()).isPresent() && !code.findAttribute(Attributes.localVariableTable()).isPresent() && !code.findAttribute(Attributes.characterRangeTable()).isPresent() && api.verify(bytes).isEmpty());for(CodeElement element:code)check(!(element instanceof LineNumber));
    artifact("cf-debug-drop-both","debug-drop-both",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(43)==43);
    emit("cf-debug-drop-both","DROP_DEBUG=LVT/CRT-absent;explicit-built-LNT=retained;DROP_LINE_NUMBERS=traversal-absent;value=43;verify=empty;defined/invoked=same-bytes");
  }
  public static void main(String[] args) throws Throwable {caseLine();caseLocal();caseGeneric();caseCharacter();caseSource();caseDropLine();caseDropDebug();caseDropBoth();System.out.println("CLASSFILE_DEBUG_MODEL_OK");}
}
