package classes.modern_test;

import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CodeElement;
import java.lang.classfile.MethodModel;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;

/** Eight unchanged stock-Java25 callers; invalid own outputs are never defined. */
public final class ClassFileSpecialInvokeFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ClassDesc PARENT=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeFinal$Parent"),
    GRANDPARENT=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeFinal$Grandparent"),
    BASE_API=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeFinal$BaseApi"),
    CHILD_API=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeFinal$ChildApi");
  private static final MethodTypeDesc INT=MethodTypeDesc.of(CD_int),VOID=MethodTypeDesc.of(CD_void);
  private static ClassDesc owner,parent;

  public static class Grandparent {public Grandparent(){} public int grandValue(){return 31;}}
  public static class Parent extends Grandparent {public Parent(){} public int parentValue(){return 23;}}
  public interface BaseApi {default int defaultValue(){return 41;}}
  public interface ChildApi extends BaseApi {}

  private static ClassFile api() {
    Map<ClassDesc,ClassDesc> parents=new HashMap<>();parents.put(owner,parent);
    parents.put(PARENT,GRANDPARENT);parents.put(GRANDPARENT,CD_Object);
    ClassHierarchyResolver resolver=ClassHierarchyResolver.of(List.of(BASE_API,CHILD_API),parents)
      .orElse(ClassHierarchyResolver.defaultResolver());
    return ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS,ClassFile.ClassHierarchyResolverOption.of(resolver));
  }
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER).withSuperclass(parent);}
  private static void codeConstructor(CodeBuilder b) {b.aload(0).invokespecial(parent,"<init>",VOID).return_();}
  private static void codeMake(CodeBuilder b) {b.new_(owner).dup().invokespecial(owner,"<init>",VOID).areturn();}
  private static void constructors(ClassBuilder b) {
    b.withMethodBody("<init>",VOID,ClassFile.ACC_PUBLIC,ClassFileSpecialInvokeFinal::codeConstructor);
    b.withMethodBody("make",MethodTypeDesc.of(CD_Object),PUBLIC_STATIC,ClassFileSpecialInvokeFinal::codeMake);
  }
  private static void codePrivateValue(CodeBuilder b) {b.bipush(17).ireturn();}
  private static void codePrivateRun(CodeBuilder b) {b.aload(0).invokespecial(owner,"value",INT).ireturn();}
  private static void buildPrivate(ClassBuilder b) {flags(b);constructors(b);
    b.withMethodBody("value",INT,ClassFile.ACC_PRIVATE,ClassFileSpecialInvokeFinal::codePrivateValue);
    b.withMethodBody("run",INT,ClassFile.ACC_PUBLIC,ClassFileSpecialInvokeFinal::codePrivateRun);
  }
  private static void codeParentRun(CodeBuilder b) {b.aload(0).invokespecial(PARENT,"parentValue",INT).ireturn();}
  private static void buildParent(ClassBuilder b) {flags(b);constructors(b);b.withMethodBody("run",INT,ClassFile.ACC_PUBLIC,ClassFileSpecialInvokeFinal::codeParentRun);}
  private static void codeAncestorRun(CodeBuilder b) {b.aload(0).invokespecial(GRANDPARENT,"grandValue",INT).ireturn();}
  private static void buildAncestor(ClassBuilder b) {flags(b);constructors(b);b.withMethodBody("run",INT,ClassFile.ACC_PUBLIC,ClassFileSpecialInvokeFinal::codeAncestorRun);}
  private static void codeInterfaceRun(CodeBuilder b) {b.aload(0).invokespecial(BASE_API,"defaultValue",INT,true).ireturn();}
  private static void buildDirect(ClassBuilder b) {flags(b);b.withInterfaceSymbols(BASE_API);constructors(b);b.withMethodBody("run",INT,ClassFile.ACC_PUBLIC,ClassFileSpecialInvokeFinal::codeInterfaceRun);}
  private static void buildIndirect(ClassBuilder b) {flags(b);b.withInterfaceSymbols(CHILD_API);b.withMethodBody("run",INT,ClassFile.ACC_PUBLIC,ClassFileSpecialInvokeFinal::codeInterfaceRun);}
  private static void codeUnrelated(CodeBuilder b) {b.aload(0).invokespecial(CD_String,"length",INT).ireturn();}
  private static void buildUnrelated(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_int,CD_String),PUBLIC_STATIC,ClassFileSpecialInvokeFinal::codeUnrelated);}
  private static void codeWrongReceiver(CodeBuilder b) {b.aload(0).invokespecial(PARENT,"parentValue",INT).ireturn();}
  private static void buildWrongReceiver(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_int,PARENT),PUBLIC_STATIC,ClassFileSpecialInvokeFinal::codeWrongReceiver);}
  private static void buildMajor51(ClassBuilder b) {flags(b);b.withVersion(51,0).withInterfaceSymbols(BASE_API);b.withMethodBody("run",INT,ClassFile.ACC_PUBLIC,ClassFileSpecialInvokeFinal::codeInterfaceRun);}

  private static void typed(ClassFile api,byte[] bytes,ClassDesc referenced,int tag) {
    ClassModel model=api.parse(bytes);check(model.thisClass().asSymbol().equals(owner));
    check(model.superclass().get().asSymbol().equals(parent));int found=0;
    for(MethodModel method:model.methods())if(method.methodName().equalsString("run"))
      for(CodeElement element:method.code().get())if(element instanceof InvokeInstruction) {
        InvokeInstruction invoke=(InvokeInstruction)element;check(invoke.opcode()==Opcode.INVOKESPECIAL);
        check(invoke.method().tag()==tag&&invoke.method().owner().asSymbol().equals(referenced));found++;
      }
    check(found==1);
  }
  private static void valid(ClassFile api,byte[] bytes) {check(api.verify(bytes).isEmpty()&&api.verify(api.parse(bytes)).isEmpty());}
  private static void invalid(ClassFile api,byte[] bytes) {
    List<VerifyError> byteErrors=api.verify(bytes),modelErrors=api.verify(api.parse(bytes));
    check(!byteErrors.isEmpty()&&!modelErrors.isEmpty());
    for(VerifyError error:byteErrors)check(error.getClass()==VerifyError.class);
    for(VerifyError error:modelErrors)check(error.getClass()==VerifyError.class);
  }
  private static void invoke(MethodHandles.Lookup lookup,Class<?> generated,int expected) throws Throwable {
    MethodHandle make=lookup.findStatic(generated,"make",MethodType.methodType(Object.class)),
      run=lookup.findVirtual(generated,"run",MethodType.methodType(int.class)).asType(MethodType.methodType(int.class,Object.class));
    Object instance=(Object)make.invokeExact();check((int)run.invokeExact(instance)==expected);
  }
  private static void casePrivate() throws Throwable {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialPrivate");parent=CD_Object;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildPrivate);
    valid(api,bytes);typed(api,bytes,owner,10);artifact("cf-special-current-private","special-private",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);invoke(lookup,generated,17);
    emit("cf-special-current-private","owner=current;receiver=current;CP10;value=17;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseParent() throws Throwable {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialParent");parent=PARENT;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildParent);
    valid(api,bytes);typed(api,bytes,PARENT,10);artifact("cf-special-direct-super","special-parent",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);invoke(lookup,generated,23);
    emit("cf-special-direct-super","owner=direct-super;receiver=current;CP10;value=23;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseAncestor() throws Throwable {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialAncestor");parent=PARENT;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildAncestor);
    valid(api,bytes);typed(api,bytes,GRANDPARENT,10);artifact("cf-special-class-ancestor","special-ancestor",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);invoke(lookup,generated,31);
    emit("cf-special-class-ancestor","owner=class-ancestor;receiver=current;CP10;value=31;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseDirect() throws Throwable {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialDirect");parent=CD_Object;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildDirect);
    valid(api,bytes);typed(api,bytes,BASE_API,11);artifact("cf-special-direct-interface","special-direct",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);invoke(lookup,generated,41);
    emit("cf-special-direct-interface","owner=direct-interface;receiver=current;CP11;value=41;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseIndirect() {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialIndirect");parent=CD_Object;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildIndirect);
    invalid(api,bytes);typed(api,bytes,BASE_API,11);artifact("cf-special-indirect-interface","special-indirect",bytes);
    emit("cf-special-indirect-interface","owner=indirect-interface;receiver=current;CP11;verify=nonempty/VerifyError;never-defined");
  }
  private static void caseUnrelated() {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialUnrelated");parent=CD_Object;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildUnrelated);
    invalid(api,bytes);typed(api,bytes,CD_String,10);artifact("cf-special-unrelated-owner","special-unrelated",bytes);
    emit("cf-special-unrelated-owner","owner=unrelated-class;receiver=referenced-String;CP10;verify=nonempty/VerifyError;never-defined");
  }
  private static void caseWrongReceiver() {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialReceiver");parent=PARENT;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildWrongReceiver);
    invalid(api,bytes);typed(api,bytes,PARENT,10);artifact("cf-special-wrong-current-receiver","special-receiver",bytes);
    emit("cf-special-wrong-current-receiver","owner=direct-super;receiver=super-not-current;CP10;verify=nonempty/VerifyError;never-defined");
  }
  private static void caseMajor51() {
    owner=ClassDesc.of("classes.modern_test.C7d5SpecialMajor51");parent=CD_Object;ClassFile api=api();byte[] bytes=api.build(owner,ClassFileSpecialInvokeFinal::buildMajor51);
    invalid(api,bytes);typed(api,bytes,BASE_API,11);check(api.parse(bytes).majorVersion()==51);artifact("cf-special-interface-major51","special-major51",bytes);
    emit("cf-special-interface-major51","major=51;owner=direct-interface;CP11;verify=nonempty/VerifyError;never-defined");
  }
  public static void main(String[] args) throws Throwable {
    casePrivate();caseParent();caseAncestor();caseDirect();caseIndirect();caseUnrelated();caseWrongReceiver();caseMajor51();
    System.out.println("CLASSFILE_SPECIAL_INVOKE_OK");
  }
}
