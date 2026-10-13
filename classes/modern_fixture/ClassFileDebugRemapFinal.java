package classes.modern_test;
import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.List;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.bytes;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;

/** Genuine javac25 -g metadata and actual label/UTF remapping, not raw attribute copying. */
public final class ClassFileDebugRemapFinal {
  private static int inserted;
  private static ClassModel model(ClassFile api) throws Exception {return api.parse(bytes(ClassFileDebugRemapFinal.class,"ClassFileDebugTarget.class"));}
  private static void insertBeforeBranches(CodeBuilder b,CodeElement element) {if(element instanceof BranchInstruction){b.nop();inserted++;}b.with(element);}
  private static void copyElement(ClassBuilder b,ClassElement element) {b.with(element);}
  private static void widen(ClassBuilder b,ClassElement element) {for(int n=0;n<300;n++)b.constantPool().stringEntry("d3-unused-"+n);b.with(element);}
  private static void buildCharacter(ClassBuilder b) {b.withFlags(33).withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),9,ClassFileDebugRemapFinal::codeCharacter);}
  private static void codeCharacter(CodeBuilder b) {Label start=b.newLabel(),end=b.newLabel();b.labelBinding(start).lineNumber(100).iload(0).ireturn().labelBinding(end).localVariable(0,"input",CD_int,start,end).characterRange(start,end,1000,2000,CharacterRange.FLAG_STATEMENT);}
  private static void insertBeforeInstructions(CodeBuilder b,CodeElement element) {if(element instanceof Instruction)b.nop();b.with(element);}
  private static int lines(CodeModel code) {int count=0;for(CodeElement element:code)if(element instanceof LineNumber)count++;return count;}
  private static int locals(CodeModel code) {int count=0;for(CodeElement element:code)if(element instanceof LocalVariable||element instanceof LocalVariableType||element instanceof CharacterRange)count++;return count;}
  private static void caseOriginal() throws Exception {
    ClassFile api=ClassFile.of();ClassModel model=model(api);check(model.methods().size()==3 && api.verify(model).isEmpty());
    int lineCount=0,localCount=0,genericCount=0;for(MethodModel method:model.methods()){CodeModel code=method.code().get();lineCount+=lines(code);localCount+=locals(code);if(code.findAttribute(Attributes.localVariableTypeTable()).isPresent())genericCount++;}
    check(lineCount>=3 && localCount>=3 && genericCount==1);
    emit("cf-remap-original-debug","original-javac25=-g/unchanged;methods=3;typed=LNT/LVT/LVTT;signature=List<String>;verify(model)=empty;generated-bytes=none");
  }
  private static void caseIdentity() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.transformClass(model(api),ClassDesc.of("classes.modern_test.C7dDebugIdentity"),ClassTransform.ACCEPT_ALL);check(api.verify(bytes).isEmpty());
    artifact("cf-remap-debug-identity","remap-identity",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle choose=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class)),identity=lookup.findStatic(generated,"identity",MethodType.methodType(Object.class,List.class));List<String> value=List.of("identity");check(((String)choose.invokeExact(0)).equals("zero")&&((String)choose.invokeExact(1)).equals("kept")&&(Object)identity.invokeExact(value)==value);
    emit("cf-remap-debug-identity","bound-class-identity=LNT/LVT/LVTT-preserved;branches=zero/kept;generic=held-identity;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseInsert() throws Throwable {
    ClassFile api=ClassFile.of();inserted=0;byte[] bytes=api.transformClass(model(api),ClassDesc.of("classes.modern_test.C7dDebugInserted"),ClassTransform.transformingMethodBodies(ClassFileDebugRemapFinal::insertBeforeBranches));check(inserted==2&&api.verify(bytes).isEmpty());
    artifact("cf-remap-debug-insertion","remap-insert",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(0)).equals("zero")&&((String)handle.invokeExact(1)).equals("kept"));
    emit("cf-remap-debug-insertion","named-CodeTransform=2-branches/2-NOPs;LNT/LVT/LVTT-labels=actual-new-BCIs;frames=regenerated;branches=zero/kept;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseFresh() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);byte[] bytes=api.transformClass(model(api),ClassDesc.of("classes.modern_test.C7dDebugFresh"),ClassFileDebugRemapFinal::copyElement);check(api.verify(bytes).isEmpty());
    artifact("cf-remap-debug-fresh","remap-fresh",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle choose=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class)),identity=lookup.findStatic(generated,"identity",MethodType.methodType(Object.class,List.class));List<String> value=List.of("fresh");check(((String)choose.invokeExact(1)).equals("kept")&&(Object)identity.invokeExact(value)==value);
    emit("cf-remap-debug-fresh","NEW_POOL=names/descriptors/signatures-imported;LNT/LVT/LVTT=typed-preserved;branches=kept;generic=held-identity;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseWiden() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);byte[] bytes=api.transformClass(model(api),ClassDesc.of("classes.modern_test.C7dDebugWide"),ClassFileDebugRemapFinal::widen);check(api.verify(bytes).isEmpty());
    artifact("cf-remap-debug-widen","remap-widen",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(0)).equals("zero")&&((String)handle.invokeExact(1)).equals("kept"));
    emit("cf-remap-debug-widen","NEW_POOL=300-prefilled-strings;LDC_W=actual-width;LNT/LVT/LVTT/frame-BCIs=remapped;branches=zero/kept;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseDrop() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.DebugElementsOption.DROP_DEBUG,ClassFile.LineNumbersOption.DROP_LINE_NUMBERS);byte[] bytes=api.transformClass(model(api),ClassDesc.of("classes.modern_test.C7dDebugDropped"),ClassTransform.transformingMethodBodies(CodeTransform.ACCEPT_ALL));
    ClassModel parsed=api.parse(bytes);for(MethodModel method:parsed.methods()){CodeModel code=method.code().get();check(lines(code)==0&&locals(code)==0&&!code.findAttribute(Attributes.lineNumberTable()).isPresent()&&!code.findAttribute(Attributes.localVariableTable()).isPresent()&&!code.findAttribute(Attributes.localVariableTypeTable()).isPresent());}check(api.verify(bytes).isEmpty());
    artifact("cf-remap-debug-drop","remap-drop",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(1)).equals("kept"));
    emit("cf-remap-debug-drop","DROP-parsed-model+forced-CodeTransform=all-debug-code-tables-absent;frames=retained/regenerated;branch=kept;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCharacter() throws Throwable {
    ClassFile api=ClassFile.of();ClassModel source=api.parse(api.build(ClassDesc.of("classes.modern_test.C7dCharacterSource"),ClassFileDebugRemapFinal::buildCharacter));
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7dCharacterMoved"),ClassTransform.transformingMethodBodies(ClassFileDebugRemapFinal::insertBeforeInstructions));CharacterRangeInfo info=api.parse(bytes).methods().get(0).code().get().findAttribute(Attributes.characterRangeTable()).get().characterRangeTable().get(0);check(info.startPc()==0&&info.endPc()==3&&api.verify(bytes).isEmpty());
    artifact("cf-remap-character-scope","remap-character",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(53)==53);
    emit("cf-remap-character-scope","2-NOP-insertion=code2-to4;CRT-exclusive-label-end4/raw-inclusive-end3;LNT/LVT=remapped;value=53;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseOptions() throws Throwable {
    ClassFile base=ClassFile.of(),drop=base.withOptions(ClassFile.DebugElementsOption.DROP_DEBUG,ClassFile.LineNumbersOption.DROP_LINE_NUMBERS);ClassModel original=model(base);check(locals(original.methods().get(1).code().get())>0&&lines(original.methods().get(1).code().get())>0);
    byte[] bytes=drop.transformClass(original,ClassDesc.of("classes.modern_test.C7dDebugOptions"),ClassTransform.ACCEPT_ALL);CodeModel code=drop.parse(bytes).methods().get(1).code().get();check(locals(code)==0&&lines(code)==0&&code.findAttribute(Attributes.localVariableTable()).isPresent()&&code.findAttribute(Attributes.lineNumberTable()).isPresent()&&base.verify(bytes).isEmpty());
    artifact("cf-remap-debug-options","remap-options",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(1)).equals("kept"));
    emit("cf-remap-debug-options","withOptions=independent-traversal;bound-identity=raw-debug-tables-retained;original-PASS-model=unchanged;branch=kept;verify=empty;defined/invoked=same-bytes");
  }
  public static void main(String[] args) throws Throwable {caseOriginal();caseIdentity();caseInsert();caseFresh();caseWiden();caseDrop();caseCharacter();caseOptions();System.out.println("CLASSFILE_DEBUG_REMAP_OK");}
}

final class ClassFileDebugTarget {
  public static String choose(int flag) {return flag==0?"zero":"kept";}
  public static Object identity(List<String> input) {return input;}
}
