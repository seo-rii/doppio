package classes.modern_test;
import java.lang.classfile.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;

/** Original Java25 long jump, dead code and initialization-token frame recipes. */
public final class InstructionFramesFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ClassDesc BUILDER=ClassDesc.of("java.lang.StringBuilder"),SEQUENCE=ClassDesc.of("java.lang.CharSequence");
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void codeForward(CodeBuilder b) {Label far=b.newLabel();b.iload(0).ifeq(far);for(int n=0;n<33000;n++)b.nop();b.iconst_1().ireturn().labelBinding(far).iconst_2().ireturn();}
  private static void codeBackward(CodeBuilder b) {Label start=b.newLabel();b.labelBinding(start);for(int n=0;n<33000;n++)b.nop();b.iinc(0,-1).iload(0).ifgt(start).iconst_3().ireturn();}
  private static void codeGoto(CodeBuilder b) {Label far=b.newLabel();b.goto_(far);for(int n=0;n<33000;n++)b.nop();b.labelBinding(far).bipush(7).ireturn();}
  private static void codeDead(CodeBuilder b) {b.bipush(7).ireturn().iconst_3().ireturn();}
  private static void buildForward(ClassBuilder b) {flags(b);b.withMethodBody("choose",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,InstructionFramesFinal::codeForward);}
  private static void buildBackward(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,InstructionFramesFinal::codeBackward);}
  private static void buildGoto(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionFramesFinal::codeGoto);}
  private static void buildDead(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionFramesFinal::codeDead);}
  private static void codeProtected(CodeBuilder b) {
    Label start=b.newLabel(),end=b.newLabel(),handler=b.newLabel();
    b.labelBinding(start).new_(BUILDER).dup().astore(1).iload(0).invokespecial(BUILDER,"<init>",MethodTypeDesc.of(CD_void,CD_int))
      .labelBinding(end).aload(1).areturn().labelBinding(handler).astore(2).aconst_null().areturn().exceptionCatch(start,end,handler,ClassDesc.of("java.lang.RuntimeException"));
  }
  private static void buildProtected(ClassBuilder b) {flags(b);b.withMethodBody("make",MethodTypeDesc.of(CD_Object,CD_int),PUBLIC_STATIC,InstructionFramesFinal::codeProtected);}
  private static void codeUninitialized(CodeBuilder b) {
    Label other=b.newLabel(),join=b.newLabel();
    b.new_(BUILDER).astore(1).iload(0).ifeq(other).nop().goto_(join).labelBinding(other).nop().labelBinding(join)
      .aload(1).dup().invokespecial(BUILDER,"<init>",MethodTypeDesc.of(CD_void)).areturn();
  }
  private static void buildUninitialized(ClassBuilder b) {flags(b);b.withMethodBody("make",MethodTypeDesc.of(CD_Object,CD_int),PUBLIC_STATIC,InstructionFramesFinal::codeUninitialized);}
  private static void codeInterfaceJoin(CodeBuilder b) {
    Label other=b.newLabel(),join=b.newLabel();b.iload(0).ifeq(other).aload(1).goto_(join).labelBinding(other).aload(2).labelBinding(join).invokeinterface(SEQUENCE,"length",MethodTypeDesc.of(CD_int)).ireturn();
  }
  private static void buildInterfaceJoin(ClassBuilder b) {flags(b);b.withMethodBody("length",MethodTypeDesc.of(CD_int,CD_int,CD_String,BUILDER),PUBLIC_STATIC,InstructionFramesFinal::codeInterfaceJoin);}
  private static void caseForward() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ShortJumpsOption.FIX_SHORT_JUMPS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dForwardWide"),InstructionFramesFinal::buildForward);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-frame-forward-wide","frame-forward",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(1)==1 && (int)handle.invokeExact(0)==2);
    emit("cf-frame-forward-wide","FIX_SHORT_JUMPS=conditional-inversion/GOTO_W;live-NOPs=33000;forward-target>32767;branches=1/2;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseBackward() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ShortJumpsOption.FIX_SHORT_JUMPS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dBackwardWide"),InstructionFramesFinal::buildBackward);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-frame-backward-wide","frame-backward",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"run",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(1)==3 && (int)handle.invokeExact(2)==3);
    emit("cf-frame-backward-wide","FIX_SHORT_JUMPS=backward-conditional-inversion/GOTO_W;live-NOPs=33000;iterations=1/2;value=3;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseGoto() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ShortJumpsOption.FIX_SHORT_JUMPS,ClassFile.DeadCodeOption.PATCH_DEAD_CODE);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dGotoWide"),InstructionFramesFinal::buildGoto);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-frame-goto-wide","frame-goto",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"run",MethodType.methodType(int.class));check((int)handle.invokeExact()==7);
    emit("cf-frame-goto-wide","FIX_SHORT_JUMPS=GOTO_W;dead-region=33000-patched-bytes;PATCH_DEAD_CODE=NOPs/ATHROW;value=7;verify=empty;defined/invoked=same-bytes");
  }
  private static void casePatch() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.DeadCodeOption.PATCH_DEAD_CODE);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDeadPatched"),InstructionFramesFinal::buildDead);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-frame-dead-patch","frame-patch",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"run",MethodType.methodType(int.class));check((int)handle.invokeExact()==7);
    emit("cf-frame-dead-patch","PATCH_DEAD_CODE=unreachable-NOP/ATHROW;synthetic-frame=Throwable-stack;live-value=7;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseKeep() {
    ClassFile api=ClassFile.of(ClassFile.DeadCodeOption.KEEP_DEAD_CODE,ClassFile.StackMapsOption.DROP_STACK_MAPS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDeadKept"),InstructionFramesFinal::buildDead);
    check(!api.verify(bytes).isEmpty() && !api.verify(api.parse(bytes)).isEmpty());artifact("cf-frame-dead-keep","frame-keep",bytes);
    emit("cf-frame-dead-keep","KEEP_DEAD_CODE/DROP_STACK_MAPS=unreachable-instructions-retained;missing-required-frame=invalid;verify(bytes/model)=nonempty;invalid-output-never-defined");
  }
  private static void caseProtected() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dProtectedAllocation"),InstructionFramesFinal::buildProtected);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-frame-protected-new","frame-protected",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"make",MethodType.methodType(Object.class,int.class));
    check(((Object)handle.invokeExact(2)) instanceof StringBuilder && (Object)handle.invokeExact(-1)==null);
    emit("cf-frame-protected-new","protected-NEW-constructor=StringBuilder(I)V;failed-local-token=TOP;positive/negative-capacity=instance/null-catch;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseUninitialized() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dUninitializedJoin"),InstructionFramesFinal::buildUninitialized);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-frame-uninitialized-join","frame-uninitialized",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"make",MethodType.methodType(Object.class,int.class));
    check(((Object)handle.invokeExact(1)) instanceof StringBuilder && ((Object)handle.invokeExact(0)) instanceof StringBuilder);
    emit("cf-frame-uninitialized-join","NEW-offset-token=held-local-1;branch-merge=same-uninitialized-identity;initialization=all-aliases;both-branches=StringBuilder;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseInterfaceJoin() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dInterfaceJoin"),InstructionFramesFinal::buildInterfaceJoin);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-frame-interface-join","frame-interface",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"length",MethodType.methodType(int.class,int.class,String.class,StringBuilder.class));
    String first="one";StringBuilder second=new StringBuilder("seven");check((int)handle.invokeExact(1,first,second)==3 && (int)handle.invokeExact(0,first,second)==5);
    emit("cf-frame-interface-join","String/StringBuilder=Object-common-stack;INVOKEINTERFACE=CharSequence.length;branches=3/5;verify=empty;defined/invoked=same-bytes");
  }
  private static void typed(ClassFile api,byte[] bytes) {
    for(MethodModel method:api.parse(bytes).methods()) {
      CodeModel code=method.code().get();
      check(code.findAttribute(Attributes.stackMapTable()).isPresent());
      for(java.lang.classfile.attribute.StackMapFrameInfo frame:code.findAttribute(Attributes.stackMapTable()).get().entries())check(frame.target()!=null && frame.frameType()>=0 && frame.frameType()<=255);
    }
  }
  public static void main(String[] args) throws Throwable {caseForward();caseBackward();caseGoto();casePatch();caseKeep();caseProtected();caseUninitialized();caseInterfaceJoin();System.out.println("CLASSFILE_INSTRUCTION_FRAMES_OK");}
}
