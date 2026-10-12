package classes.modern_test;

import java.lang.classfile.Attributes;
import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CodeElement;
import java.lang.classfile.CodeModel;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.Label;
import java.lang.classfile.attribute.StackMapFrameInfo;
import java.lang.classfile.attribute.StackMapTableAttribute;
import java.lang.classfile.instruction.BranchInstruction;
import java.lang.classfile.instruction.LabelTarget;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.List;

import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.CD_Object;
import static java.lang.constant.ConstantDescs.CD_double;
import static java.lang.constant.ConstantDescs.CD_int;
import static java.lang.constant.ConstantDescs.CD_long;

/** Typed StackMapTable parsing and finite regenerating CFG recipes, not full verifier conformance. */
public final class ClassFileStackMapsFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC;
  private static int inserted;

  private static ClassModel model() throws Exception {
    return ClassFile.of().parse(ClassFileSupport.bytes(ClassFileStackMapsFinal.class,"ClassFileStackMapsTarget.class"));
  }

  private static void buildLongMerge(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("choose",MethodTypeDesc.of(CD_long,CD_int,CD_long,CD_long),PUBLIC_STATIC,ClassFileStackMapsFinal::codeLongMerge);
  }
  private static void codeLongMerge(CodeBuilder b) {
    Label alternative=b.newLabel(), join=b.newLabel();
    b.iload(0).ifeq(alternative).lload(1).goto_(join).labelBinding(alternative).lload(3).labelBinding(join).lreturn();
  }

  private static void buildDoubleMerge(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("choose",MethodTypeDesc.of(CD_double,CD_int,CD_double,CD_double),PUBLIC_STATIC,ClassFileStackMapsFinal::codeDoubleMerge);
  }
  private static void codeDoubleMerge(CodeBuilder b) {
    Label alternative=b.newLabel(), join=b.newLabel();
    b.iload(0).ifeq(alternative).dload(1).dstore(260).goto_(join)
        .labelBinding(alternative).dload(3).dstore(260).labelBinding(join).dload(260).dreturn();
  }

  private static void buildDefault(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("choose",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,ClassFileStackMapsFinal::codeDefault);
  }
  private static void codeDefault(CodeBuilder b) {
    Label alternative=b.newLabel();
    b.iload(0).ifeq(alternative).bipush(31).ireturn().labelBinding(alternative).bipush(47).ireturn();
  }

  private static void buildBadMerge(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("bad",MethodTypeDesc.of(CD_Object,CD_int),PUBLIC_STATIC,ClassFileStackMapsFinal::codeBadMerge);
  }
  private static void codeBadMerge(CodeBuilder b) {
    Label alternative=b.newLabel(), join=b.newLabel();
    b.iload(0).ifeq(alternative).iconst_1().goto_(join).labelBinding(alternative).aconst_null().labelBinding(join).areturn();
  }

  private static void insertBeforeBranches(CodeBuilder b, CodeElement element) {
    if(element instanceof BranchInstruction) { inserted++; b.nop(); }
    b.with(element);
  }

  private static void caseOriginalTypedFrames() throws Exception {
    ClassFile api=ClassFile.of(); ClassModel original=model(); int frameCount=0, branchCount=0, targets=0;
    for(var method:original.methods()) if(method.code().isPresent()) {
      CodeModel code=method.code().get();
      if(code.findAttribute(Attributes.stackMapTable()).isPresent()) {
        StackMapTableAttribute attribute=code.findAttribute(Attributes.stackMapTable()).get();
        check(attribute.attributeMapper()==Attributes.stackMapTable());
        for(StackMapFrameInfo frame:attribute.entries()) {
          check(frame.target()!=null && frame.frameType()>=0 && frame.frameType()<=255);
          for(var type:frame.locals()) check(type.tag()>=0 && type.tag()<=8);
          for(var type:frame.stack()) check(type.tag()>=0 && type.tag()<=8);
          frameCount++;
        }
      }
      for(CodeElement element:code) {
        if(element instanceof BranchInstruction) branchCount++;
        if(element instanceof LabelTarget) targets++;
      }
    }
    check(frameCount==3 && branchCount==1 && targets>=3 && original.methods().size()==3);
    check(api.verify(original).isEmpty());
    emit("cf-frames-original-typed", "original-javac25=unchanged;methods=3;frames=3;branches=1;typed-labels/types=present;verify(model)=empty");
  }

  private static void caseLongStackMerge() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFramesLong"),ClassFileStackMapsFinal::buildLongMerge);
    CodeModel code=api.parse(bytes).methods().get(0).code().get();
    List<StackMapFrameInfo> frames=code.findAttribute(Attributes.stackMapTable()).get().entries();
    check(frames.size()==2 && frames.get(1).stack().size()==1 && frames.get(1).stack().get(0).tag()==4);
    check(api.verify(bytes).isEmpty()); artifact("cf-frames-long-stack-merge","frames-long",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(long.class,int.class,long.class,long.class));
    check((long)handle.invokeExact(1,9007199254740993L,7L)==9007199254740993L);
    check((long)handle.invokeExact(0,9007199254740993L,7L)==7L);
    emit("cf-frames-long-stack-merge", "forced-generation=2-frames;join-stack=LONG;wide-parameters=1/3;branches=9007199254740993/7;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseWideDoubleLocalMerge() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFramesDouble"),ClassFileStackMapsFinal::buildDoubleMerge);
    CodeModel code=api.parse(bytes).methods().get(0).code().get();
    List<StackMapFrameInfo> frames=code.findAttribute(Attributes.stackMapTable()).get().entries();
    check(frames.size()==2 && frames.get(1).locals().get(frames.get(1).locals().size()-1).tag()==3);
    check(api.verify(bytes).isEmpty()); artifact("cf-frames-wide-double-merge","frames-double",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(double.class,int.class,double.class,double.class));
    check((double)handle.invokeExact(1,12.5,7.25)==12.5 && (double)handle.invokeExact(0,12.5,7.25)==7.25);
    emit("cf-frames-wide-double-merge", "forced-generation=2-frames;wide-local=260/261;join-local=DOUBLE;branches=12.5/7.25;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseDefaultGeneration() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFramesDefault"),ClassFileStackMapsFinal::buildDefault);
    check(api.parse(bytes).methods().get(0).code().get().findAttribute(Attributes.stackMapTable()).get().entries().size()==1);
    check(api.verify(bytes).isEmpty()); artifact("cf-frames-default-generation","frames-default",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(int.class,int.class));
    check((int)handle.invokeExact(1)==31 && (int)handle.invokeExact(0)==47);
    emit("cf-frames-default-generation", "default69=1-frame;branches=31/47;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseDroppedFrames() {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFramesDropped"),ClassFileStackMapsFinal::buildDefault);
    ClassModel parsed=api.parse(bytes);
    check(parsed.majorVersion()==69 && !parsed.methods().get(0).code().get().findAttribute(Attributes.stackMapTable()).isPresent());
    check(!api.verify(bytes).isEmpty() && !api.verify(parsed).isEmpty());
    artifact("cf-frames-drop-option","frames-dropped",bytes);
    emit("cf-frames-drop-option", "DROP_STACK_MAPS=absent;version=69;verify(bytes/model)=nonempty;invalid-output-never-defined");
  }

  private static void caseBranchfulIdentity() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.transformClass(model(),ClassDesc.of("classes.modern_test.CfFramesIdentity"),ClassTransform.ACCEPT_ALL);
    check(api.parse(bytes).methods().get(1).code().get().findAttribute(Attributes.stackMapTable()).get().entries().size()==1);
    check(api.verify(bytes).isEmpty()); artifact("cf-frames-transform-identity","frames-identity",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle choose=lookup.findStatic(generated,"choose",MethodType.methodType(int.class,int.class));
    MethodHandle caught=lookup.findStatic(generated,"caught",MethodType.methodType(int.class,Throwable.class));
    check((int)choose.invokeExact(1)==31 && (int)choose.invokeExact(0)==47);
    check((int)caught.invokeExact((Throwable)null)==9 && (int)caught.invokeExact((Throwable)new IllegalArgumentException())==7);
    emit("cf-frames-transform-identity", "branchful-original=accept-all;frames/handlers=retained;branches=31/47;catch=9/7;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseInsertedFrames() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS); inserted=0;
    byte[] bytes=api.transformClass(model(),ClassDesc.of("classes.modern_test.CfFramesInserted"),
        ClassTransform.transformingMethodBodies(ClassFileStackMapsFinal::insertBeforeBranches));
    check(inserted==1 && api.verify(bytes).isEmpty()); artifact("cf-frames-transform-insertion","frames-inserted",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle choose=lookup.findStatic(generated,"choose",MethodType.methodType(int.class,int.class));
    MethodHandle caught=lookup.findStatic(generated,"caught",MethodType.methodType(int.class,Throwable.class));
    check((int)choose.invokeExact(1)==31 && (int)choose.invokeExact(0)==47);
    check((int)caught.invokeExact((Throwable)null)==9 && (int)caught.invokeExact((Throwable)new IllegalArgumentException())==7);
    emit("cf-frames-transform-insertion", "named-callback=1-branch/1-nop;offsets/frames=regenerated;branches=31/47;catch=9/7;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseInvalidMerge() {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFramesInvalidMerge"),ClassFileStackMapsFinal::buildBadMerge);
    check(!api.verify(bytes).isEmpty() && !api.verify(api.parse(bytes)).isEmpty());
    artifact("cf-frames-invalid-merge","frames-invalid",bytes);
    emit("cf-frames-invalid-merge", "join-stack=INT-vs-NULL;return=Object;verify(bytes/model)=nonempty;invalid-output-never-defined");
  }

  public static void main(String[] arguments) throws Throwable {
    caseOriginalTypedFrames(); caseLongStackMerge(); caseWideDoubleLocalMerge(); caseDefaultGeneration();
    caseDroppedFrames(); caseBranchfulIdentity(); caseInsertedFrames(); caseInvalidMerge();
    System.out.println("CLASSFILE_STACKMAPS_OK");
  }
}

final class ClassFileStackMapsTarget {
  public static int choose(int value) { if(value==0) return 47; return 31; }
  public static int caught(Throwable value) {
    try { throw value; } catch(NullPointerException error) { return 9; } catch(Throwable error) { return 7; }
  }
}
