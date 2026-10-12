package classes.modern_test;

import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.Label;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.SwitchCase;
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
import static java.lang.constant.ConstantDescs.CD_int;

/** Original Java 25 public API control-flow recipes; each host builds its own bytes. */
public final class ClassFileControlFlowFinal {
  private static final int PUBLIC_STATIC = ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC;
  private static Label foreignLabel;

  private static void codePredicate(CodeBuilder b, Opcode opcode, int arity, boolean wideJump) {
    Label yes = b.newLabel(), done = b.newLabel();
    if (opcode == Opcode.IFNULL || opcode == Opcode.IFNONNULL || opcode == Opcode.IF_ACMPEQ || opcode == Opcode.IF_ACMPNE) {
      b.aload(0);
      if (arity == 2) b.aload(1);
    } else {
      b.iload(0);
      if (arity == 2) b.iload(1);
    }
    b.branch(opcode, yes).iconst_0();
    if (wideJump) b.goto_w(done); else b.goto_(done);
    b.labelBinding(yes).iconst_1().labelBinding(done).ireturn();
  }

  private static void buildZero(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    MethodTypeDesc type = MethodTypeDesc.of(CD_int, CD_int);
    b.withMethodBody("eq", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeEq);
    b.withMethodBody("ne", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeNe);
    b.withMethodBody("lt", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeLt);
    b.withMethodBody("ge", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeGe);
    b.withMethodBody("gt", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeGt);
    b.withMethodBody("le", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeLe);
  }
  private static void codeEq(CodeBuilder b) { codePredicate(b, Opcode.IFEQ, 1, true); }
  private static void codeNe(CodeBuilder b) { codePredicate(b, Opcode.IFNE, 1, false); }
  private static void codeLt(CodeBuilder b) { codePredicate(b, Opcode.IFLT, 1, false); }
  private static void codeGe(CodeBuilder b) { codePredicate(b, Opcode.IFGE, 1, false); }
  private static void codeGt(CodeBuilder b) { codePredicate(b, Opcode.IFGT, 1, false); }
  private static void codeLe(CodeBuilder b) { codePredicate(b, Opcode.IFLE, 1, false); }

  private static void buildIntCompare(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    MethodTypeDesc type = MethodTypeDesc.of(CD_int, CD_int, CD_int);
    b.withMethodBody("eq", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeIntEq);
    b.withMethodBody("ne", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeIntNe);
    b.withMethodBody("lt", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeIntLt);
    b.withMethodBody("ge", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeIntGe);
    b.withMethodBody("gt", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeIntGt);
    b.withMethodBody("le", type, PUBLIC_STATIC, ClassFileControlFlowFinal::codeIntLe);
  }
  private static void codeIntEq(CodeBuilder b) { codePredicate(b, Opcode.IF_ICMPEQ, 2, false); }
  private static void codeIntNe(CodeBuilder b) { codePredicate(b, Opcode.IF_ICMPNE, 2, false); }
  private static void codeIntLt(CodeBuilder b) { codePredicate(b, Opcode.IF_ICMPLT, 2, false); }
  private static void codeIntGe(CodeBuilder b) { codePredicate(b, Opcode.IF_ICMPGE, 2, false); }
  private static void codeIntGt(CodeBuilder b) { codePredicate(b, Opcode.IF_ICMPGT, 2, false); }
  private static void codeIntLe(CodeBuilder b) { codePredicate(b, Opcode.IF_ICMPLE, 2, false); }

  private static void buildReferences(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    MethodTypeDesc unary = MethodTypeDesc.of(CD_int, CD_Object);
    MethodTypeDesc binary = MethodTypeDesc.of(CD_int, CD_Object, CD_Object);
    b.withMethodBody("isNull", unary, PUBLIC_STATIC, ClassFileControlFlowFinal::codeNull);
    b.withMethodBody("nonNull", unary, PUBLIC_STATIC, ClassFileControlFlowFinal::codeNonNull);
    b.withMethodBody("same", binary, PUBLIC_STATIC, ClassFileControlFlowFinal::codeSame);
    b.withMethodBody("different", binary, PUBLIC_STATIC, ClassFileControlFlowFinal::codeDifferent);
  }
  private static void codeNull(CodeBuilder b) { codePredicate(b, Opcode.IFNULL, 1, false); }
  private static void codeNonNull(CodeBuilder b) { codePredicate(b, Opcode.IFNONNULL, 1, false); }
  private static void codeSame(CodeBuilder b) { codePredicate(b, Opcode.IF_ACMPEQ, 2, false); }
  private static void codeDifferent(CodeBuilder b) { codePredicate(b, Opcode.IF_ACMPNE, 2, false); }

  private static void buildLoop(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("sum", MethodTypeDesc.of(CD_int, CD_int), PUBLIC_STATIC, ClassFileControlFlowFinal::codeLoop);
  }
  private static void codeLoop(CodeBuilder b) {
    Label head = b.newLabel(), done = b.newLabel();
    b.iconst_0().istore(1).labelBinding(head).iload(0).ifle(done)
        .iload(1).iload(0).iadd().istore(1).iload(0).iconst_1().isub().istore(0)
        .goto_(head).labelBinding(done).iload(1).ireturn();
  }

  private static void buildTable(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("select", MethodTypeDesc.of(CD_int, CD_int), PUBLIC_STATIC, ClassFileControlFlowFinal::codeTable);
  }
  private static void codeTable(CodeBuilder b) {
    Label negative=b.newLabel(), zero=b.newLabel(), positive=b.newLabel(), other=b.newLabel();
    b.iload(0).tableswitch(-1, 1, other,
        List.of(SwitchCase.of(-1, negative), SwitchCase.of(0, zero), SwitchCase.of(1, positive)))
        .labelBinding(negative).bipush(11).ireturn().labelBinding(zero).bipush(22).ireturn()
        .labelBinding(positive).bipush(33).ireturn().labelBinding(other).bipush(44).ireturn();
  }

  private static void buildLookup(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("select", MethodTypeDesc.of(CD_int, CD_int), PUBLIC_STATIC, ClassFileControlFlowFinal::codeLookup);
  }
  private static void codeLookup(CodeBuilder b) {
    Label first=b.newLabel(), second=b.newLabel(), third=b.newLabel(), other=b.newLabel();
    b.nop().iload(0).lookupswitch(other,
        List.of(SwitchCase.of(-10, first), SwitchCase.of(4, second), SwitchCase.of(99, third)))
        .labelBinding(first).bipush(12).ireturn().labelBinding(second).bipush(23).ireturn()
        .labelBinding(third).bipush(34).ireturn().labelBinding(other).bipush(45).ireturn();
  }

  private static void buildHandlers(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    b.withMethodBody("catchValue", MethodTypeDesc.of(CD_int, ClassDesc.of("java.lang.Throwable")), PUBLIC_STATIC,
        ClassFileControlFlowFinal::codeHandlers);
  }
  private static void codeHandlers(CodeBuilder b) {
    Label start=b.newLabel(), end=b.newLabel(), typed=b.newLabel(), all=b.newLabel();
    b.labelBinding(start).aload(0).athrow().labelBinding(end)
        .labelBinding(typed).pop().bipush(9).ireturn().labelBinding(all).pop().bipush(7).ireturn()
        .exceptionCatch(start, end, typed, ClassDesc.of("java.lang.NullPointerException"))
        .exceptionCatchAll(start, end, all);
  }

  private static void buildUnbound(ClassBuilder b) {
    b.withMethodBody("value", MethodTypeDesc.of(CD_int), PUBLIC_STATIC, ClassFileControlFlowFinal::codeUnbound);
  }
  private static void codeUnbound(CodeBuilder b) { b.goto_(b.newLabel()).iconst_0().ireturn(); }
  private static void buildDuplicate(ClassBuilder b) {
    b.withMethodBody("value", MethodTypeDesc.of(CD_int), PUBLIC_STATIC, ClassFileControlFlowFinal::codeDuplicate);
  }
  private static void codeDuplicate(CodeBuilder b) {
    Label label=b.newLabel(); b.labelBinding(label).nop().labelBinding(label).iconst_0().ireturn();
  }
  private static void buildForeignSource(ClassBuilder b) {
    b.withMethodBody("value", MethodTypeDesc.of(CD_int), PUBLIC_STATIC, ClassFileControlFlowFinal::codeForeignSource);
  }
  private static void codeForeignSource(CodeBuilder b) {
    foreignLabel=b.newLabel(); b.labelBinding(foreignLabel).iconst_0().ireturn();
  }
  private static void buildForeignTarget(ClassBuilder b) {
    b.withMethodBody("value", MethodTypeDesc.of(CD_int), PUBLIC_STATIC, ClassFileControlFlowFinal::codeForeignTarget);
  }
  private static void codeForeignTarget(CodeBuilder b) { b.goto_(foreignLabel).iconst_0().ireturn(); }

  private static void caseZeroPredicates() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFlowZero"), ClassFileControlFlowFinal::buildZero);
    check(api.verify(bytes).isEmpty());
    artifact("cf-flow-zero-predicates", "flow-zero", bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    String[] names={"eq","ne","lt","ge","gt","le"}, expected={"010","101","100","011","001","110"};
    for(int m=0;m<names.length;m++) {
      MethodHandle handle=lookup.findStatic(generated,names[m],MethodType.methodType(int.class,int.class));
      StringBuilder observed=new StringBuilder();
      for(int value=-1;value<=1;value++) observed.append((int)handle.invokeExact(value));
      check(expected[m].equals(observed.toString()));
    }
    emit("cf-flow-zero-predicates", "ifeq/ne/lt/ge/gt/le=010/101/100/011/001/110;goto_w=executed;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseIntPredicates() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFlowIntCompare"), ClassFileControlFlowFinal::buildIntCompare);
    check(api.verify(bytes).isEmpty()); artifact("cf-flow-int-predicates", "flow-int", bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    String[] names={"eq","ne","lt","ge","gt","le"}, expected={"010","101","100","011","001","110"};
    for(int m=0;m<names.length;m++) {
      MethodHandle handle=lookup.findStatic(generated,names[m],MethodType.methodType(int.class,int.class,int.class));
      StringBuilder observed=new StringBuilder();
      for(int value=-1;value<=1;value++) observed.append((int)handle.invokeExact(value,0));
      check(expected[m].equals(observed.toString()));
    }
    emit("cf-flow-int-predicates", "if_icmpeq/ne/lt/ge/gt/le=010/101/100/011/001/110;both-edges=executed;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseReferencePredicates() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFlowReference"), ClassFileControlFlowFinal::buildReferences);
    check(api.verify(bytes).isEmpty()); artifact("cf-flow-reference-predicates", "flow-reference", bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes); Object same=new Object(), other=new Object();
    MethodHandle nullHandle=lookup.findStatic(generated,"isNull",MethodType.methodType(int.class,Object.class));
    MethodHandle nonNull=lookup.findStatic(generated,"nonNull",MethodType.methodType(int.class,Object.class));
    MethodHandle equal=lookup.findStatic(generated,"same",MethodType.methodType(int.class,Object.class,Object.class));
    MethodHandle different=lookup.findStatic(generated,"different",MethodType.methodType(int.class,Object.class,Object.class));
    check((int)nullHandle.invokeExact((Object)null)==1 && (int)nullHandle.invokeExact(same)==0);
    check((int)nonNull.invokeExact((Object)null)==0 && (int)nonNull.invokeExact(same)==1);
    check((int)equal.invokeExact(same,same)==1 && (int)equal.invokeExact(same,other)==0);
    check((int)different.invokeExact(same,same)==0 && (int)different.invokeExact(same,other)==1);
    emit("cf-flow-reference-predicates", "ifnull/nonnull=10/01;if_acmpeq/ne=10/01;identity-not-equals=exact;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseBackwardLoop() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFlowLoop"), ClassFileControlFlowFinal::buildLoop);
    check(api.verify(bytes).isEmpty()); artifact("cf-flow-backward-loop", "flow-loop", bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"sum",MethodType.methodType(int.class,int.class));
    check((int)handle.invokeExact(0)==0 && (int)handle.invokeExact(5)==15 && (int)handle.invokeExact(-2)==0);
    emit("cf-flow-backward-loop", "backward-goto=executed;locals=0/1;sum(0/5/-2)=0/15/0;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseTableSwitch() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFlowTable"), ClassFileControlFlowFinal::buildTable);
    check(api.verify(bytes).isEmpty()); artifact("cf-flow-table-switch", "flow-table", bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"select",MethodType.methodType(int.class,int.class));
    check((int)handle.invokeExact(-1)==11 && (int)handle.invokeExact(0)==22 && (int)handle.invokeExact(1)==33);
    check((int)handle.invokeExact(-2)==44 && (int)handle.invokeExact(2)==44);
    emit("cf-flow-table-switch", "tableswitch=-1..1;arms=11/22/33;default-below/above=44/44;padding=decoded;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseLookupSwitch() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFlowLookup"), ClassFileControlFlowFinal::buildLookup);
    check(api.verify(bytes).isEmpty()); artifact("cf-flow-lookup-switch", "flow-lookup", bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"select",MethodType.methodType(int.class,int.class));
    check((int)handle.invokeExact(-10)==12 && (int)handle.invokeExact(4)==23 && (int)handle.invokeExact(99)==34);
    check((int)handle.invokeExact(0)==45 && (int)handle.invokeExact(100)==45);
    emit("cf-flow-lookup-switch", "lookupswitch=sorted[-10,4,99];arms=12/23/34;default-hole/outside=45/45;nop-padding=decoded;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseOrderedHandlers() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.CfFlowHandlers"), ClassFileControlFlowFinal::buildHandlers);
    ClassModel model=api.parse(bytes); check(model.methods().get(0).code().get().exceptionHandlers().size()==2);
    check(api.verify(bytes).isEmpty()); artifact("cf-flow-ordered-handlers", "flow-handlers", bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup(); Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"catchValue",MethodType.methodType(int.class,Throwable.class));
    check((int)handle.invokeExact((Throwable)null)==9);
    check((int)handle.invokeExact((Throwable)new NullPointerException())==9);
    check((int)handle.invokeExact((Throwable)new IllegalArgumentException())==7);
    emit("cf-flow-ordered-handlers", "handlers=typed-NullPointerException,catch-all;athrow(null/NPE/IAE)=9/9/7;order=retained;verify=empty;defined/invoked=same-bytes");
  }

  private static void caseLabelRejections() {
    ClassFile api=ClassFile.of();
    try { api.build(ClassDesc.of("classes.modern_test.CfUnbound"),ClassFileControlFlowFinal::buildUnbound); throw new AssertionError(); }
    catch(IllegalArgumentException error) { check(error.getClass()==IllegalArgumentException.class); }
    try { api.build(ClassDesc.of("classes.modern_test.CfDuplicate"),ClassFileControlFlowFinal::buildDuplicate); throw new AssertionError(); }
    catch(IllegalArgumentException error) { check(error.getClass()==IllegalArgumentException.class); }
    api.build(ClassDesc.of("classes.modern_test.CfForeignSource"),ClassFileControlFlowFinal::buildForeignSource);
    try { api.build(ClassDesc.of("classes.modern_test.CfForeignTarget"),ClassFileControlFlowFinal::buildForeignTarget); throw new AssertionError(); }
    catch(IllegalStateException error) { check(error.getClass()==IllegalStateException.class); }
    emit("cf-flow-label-rejections", "unbound=IllegalArgumentException;duplicate=IllegalArgumentException;foreign-builder=IllegalStateException;failed-bytes-not-defined");
  }

  public static void main(String[] arguments) throws Throwable {
    caseZeroPredicates(); caseIntPredicates(); caseReferencePredicates(); caseBackwardLoop();
    caseTableSwitch(); caseLookupSwitch(); caseOrderedHandlers(); caseLabelRejections();
    System.out.println("CLASSFILE_CONTROLFLOW_OK");
  }
}
