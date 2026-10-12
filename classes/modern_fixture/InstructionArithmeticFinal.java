package classes.modern_test;
import java.lang.classfile.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;
public final class InstructionArithmeticFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void codeIntArithmetic(CodeBuilder b) {b.iload(0).iload(1).iadd().iload(1).isub().iload(1).imul().iload(1).idiv().iload(1).irem().ineg().ireturn();}
  private static void codeLongArithmetic(CodeBuilder b) {b.lload(0).lload(2).ladd().lload(2).lsub().lload(2).lmul().lload(2).ldiv().lload(2).lrem().lneg().lreturn();}
  private static void codeFloatArithmetic(CodeBuilder b) {b.fload(0).fload(1).fadd().fload(1).fsub().fload(1).fmul().fload(1).fdiv().fload(1).frem().fneg().freturn();}
  private static void codeDoubleArithmetic(CodeBuilder b) {b.dload(0).dload(2).dadd().dload(2).dsub().dload(2).dmul().dload(2).ddiv().dload(2).drem().dneg().dreturn();}
  private static void codeIntBits(CodeBuilder b) {b.iload(0).iload(1).ishl().iload(1).ishr().iload(1).iushr().bipush(7).iand().bipush(8).ior().iconst_3().ixor().ireturn();}
  private static void codeLongBits(CodeBuilder b) {b.lload(0).iload(2).lshl().iload(2).lshr().iload(2).lushr().ldc(7L).land().ldc(8L).lor().ldc(3L).lxor().lreturn();}
  private static void codeConvert(CodeBuilder b) {b.dload(0).d2l().l2f().f2d().d2i().i2l().l2d().d2f().f2l().l2i().i2f().f2i().i2d().d2i().i2b().i2c().i2s().ireturn();}
  private static void codeCompareLong(CodeBuilder b) {b.lload(0).lload(2).lcmp().ireturn();}
  private static void codeCompareFloatLow(CodeBuilder b) {b.fload(0).fload(1).fcmpl().ireturn();}
  private static void codeCompareFloatHigh(CodeBuilder b) {b.fload(0).fload(1).fcmpg().ireturn();}
  private static void codeCompareDoubleLow(CodeBuilder b) {b.dload(0).dload(2).dcmpl().ireturn();}
  private static void codeCompareDoubleHigh(CodeBuilder b) {b.dload(0).dload(2).dcmpg().ireturn();}
  private static void codeDup(CodeBuilder b) {b.iconst_3().dup().iadd().ireturn();}
  private static void codeDupX1(CodeBuilder b) {b.iconst_2().iconst_3().dup_x1().iadd().iadd().ireturn();}
  private static void codeSwap(CodeBuilder b) {b.iconst_2().iconst_3().swap().isub().ireturn();}
  private static void codeDupX2Narrow(CodeBuilder b) {b.iconst_1().iconst_2().iconst_3().dup_x2().iadd().iadd().iadd().ireturn();}
  private static void codeDupX2Wide(CodeBuilder b) {b.lconst_1().iconst_3().dup_x2().pop().pop2().ireturn();}
  private static void codeDup2Narrow(CodeBuilder b) {b.iconst_2().iconst_3().dup2().iadd().iadd().iadd().ireturn();}
  private static void codeDup2Wide(CodeBuilder b) {b.lconst_1().dup2().ladd().lreturn();}
  private static void codeDup2X1Narrow(CodeBuilder b) {b.iconst_1().iconst_2().iconst_3().dup2_x1().iadd().iadd().iadd().iadd().ireturn();}
  private static void codeDup2X1Wide(CodeBuilder b) {b.iconst_3().lconst_1().dup2_x1().pop2().pop().lreturn();}
  private static void codeDup2X2First(CodeBuilder b) {b.iconst_1().iconst_2().iconst_3().iconst_4().dup2_x2().iadd().iadd().iadd().iadd().iadd().ireturn();}
  private static void codeDup2X2Second(CodeBuilder b) {b.lconst_1().iconst_2().iconst_3().dup2_x2().pop().pop().pop2().iadd().ireturn();}
  private static void codeDup2X2Third(CodeBuilder b) {b.iconst_2().iconst_3().lconst_1().dup2_x2().pop2().pop().pop().lreturn();}
  private static void codeDup2X2Fourth(CodeBuilder b) {b.lconst_1().ldc(2L).dup2_x2().ladd().ladd().lreturn();}
  private static void buildArithmetic(ClassBuilder b) {flags(b);
    b.withMethodBody("intValue",MethodTypeDesc.of(CD_int,CD_int,CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeIntArithmetic);
    b.withMethodBody("longValue",MethodTypeDesc.of(CD_long,CD_long,CD_long),PUBLIC_STATIC,InstructionArithmeticFinal::codeLongArithmetic);
    b.withMethodBody("floatValue",MethodTypeDesc.of(CD_float,CD_float,CD_float),PUBLIC_STATIC,InstructionArithmeticFinal::codeFloatArithmetic);
    b.withMethodBody("doubleValue",MethodTypeDesc.of(CD_double,CD_double,CD_double),PUBLIC_STATIC,InstructionArithmeticFinal::codeDoubleArithmetic);
  }
  private static void caseArithmetic() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArithmetic"),InstructionArithmeticFinal::buildArithmetic);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-operators","arithmetic-operators",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"intValue",MethodType.methodType(int.class,int.class,int.class));check((int)h0.invokeExact(13,2)==-1);
    MethodHandle h1=lookup.findStatic(generated,"longValue",MethodType.methodType(long.class,long.class,long.class));check((long)h1.invokeExact(13L,2L)==-1L);
    MethodHandle h2=lookup.findStatic(generated,"floatValue",MethodType.methodType(float.class,float.class,float.class));check((float)h2.invokeExact(13.5f,2f)==-1.5f);
    MethodHandle h3=lookup.findStatic(generated,"doubleValue",MethodType.methodType(double.class,double.class,double.class));check((double)h3.invokeExact(13.5d,2d)==-1.5d);
    emit("cf-arithmetic-operators","numeric=I/J/F/D;add/sub/mul/div/rem/neg=24-operators;values=-1/-1/-1.5/-1.5;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildBits(ClassBuilder b) {flags(b);
    b.withMethodBody("intValue",MethodTypeDesc.of(CD_int,CD_int,CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeIntBits);
    b.withMethodBody("longValue",MethodTypeDesc.of(CD_long,CD_long,CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeLongBits);
  }
  private static void caseBits() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dBits"),InstructionArithmeticFinal::buildBits);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-shifts-bits","arithmetic-bits",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"intValue",MethodType.methodType(int.class,int.class,int.class));check((int)h0.invokeExact(-16,1)==11);
    MethodHandle h1=lookup.findStatic(generated,"longValue",MethodType.methodType(long.class,long.class,int.class));check((long)h1.invokeExact(-16L,1)==11L);
    emit("cf-arithmetic-shifts-bits","I/J=shl/shr/ushr/and/or/xor;operators=12;negative-values=11/11;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildComparisons(ClassBuilder b) {flags(b);
    b.withMethodBody("convert",MethodTypeDesc.of(CD_int,CD_double),PUBLIC_STATIC,InstructionArithmeticFinal::codeConvert);
    b.withMethodBody("longCompare",MethodTypeDesc.of(CD_int,CD_long,CD_long),PUBLIC_STATIC,InstructionArithmeticFinal::codeCompareLong);
    b.withMethodBody("floatLow",MethodTypeDesc.of(CD_int,CD_float,CD_float),PUBLIC_STATIC,InstructionArithmeticFinal::codeCompareFloatLow);
    b.withMethodBody("floatHigh",MethodTypeDesc.of(CD_int,CD_float,CD_float),PUBLIC_STATIC,InstructionArithmeticFinal::codeCompareFloatHigh);
    b.withMethodBody("doubleLow",MethodTypeDesc.of(CD_int,CD_double,CD_double),PUBLIC_STATIC,InstructionArithmeticFinal::codeCompareDoubleLow);
    b.withMethodBody("doubleHigh",MethodTypeDesc.of(CD_int,CD_double,CD_double),PUBLIC_STATIC,InstructionArithmeticFinal::codeCompareDoubleHigh);
  }
  private static void caseComparisons() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dComparisons"),InstructionArithmeticFinal::buildComparisons);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-compare-convert","arithmetic-comparisons",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"convert",MethodType.methodType(int.class,double.class));check((int)h0.invokeExact(3.75d)==3);
    MethodHandle h1=lookup.findStatic(generated,"longCompare",MethodType.methodType(int.class,long.class,long.class));check((int)h1.invokeExact(9L,2L)==1);
    MethodHandle h2=lookup.findStatic(generated,"floatLow",MethodType.methodType(int.class,float.class,float.class));check((int)h2.invokeExact(Float.NaN,1f)==-1);
    MethodHandle h3=lookup.findStatic(generated,"floatHigh",MethodType.methodType(int.class,float.class,float.class));check((int)h3.invokeExact(Float.NaN,1f)==1);
    MethodHandle h4=lookup.findStatic(generated,"doubleLow",MethodType.methodType(int.class,double.class,double.class));check((int)h4.invokeExact(Double.NaN,1d)==-1);
    MethodHandle h5=lookup.findStatic(generated,"doubleHigh",MethodType.methodType(int.class,double.class,double.class));check((int)h5.invokeExact(Double.NaN,1d)==1);
    emit("cf-arithmetic-compare-convert","comparisons=LCMP/FCMPL/G/DCMPL/G;NaN=-1/+1;conversions=all15;3.75=3;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildDupSwap(ClassBuilder b) {flags(b);
    b.withMethodBody("dup",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup);
    b.withMethodBody("dupX1",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDupX1);
    b.withMethodBody("swap",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeSwap);
  }
  private static void caseDupSwap() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDupSwap"),InstructionArithmeticFinal::buildDupSwap);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-dup-swap","arithmetic-dup-swap",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"dup",MethodType.methodType(int.class));check((int)h0.invokeExact()==6);
    MethodHandle h1=lookup.findStatic(generated,"dupX1",MethodType.methodType(int.class));check((int)h1.invokeExact()==8);
    MethodHandle h2=lookup.findStatic(generated,"swap",MethodType.methodType(int.class));check((int)h2.invokeExact()==1);
    emit("cf-arithmetic-dup-swap","DUP/DUP_X1/SWAP=3-legal-narrow-shapes;values=6/8/1;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildDupX2(ClassBuilder b) {flags(b);
    b.withMethodBody("narrow",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDupX2Narrow);
    b.withMethodBody("wide",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDupX2Wide);
  }
  private static void caseDupX2() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDupX2"),InstructionArithmeticFinal::buildDupX2);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-dup-x2","arithmetic-dup-x2",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"narrow",MethodType.methodType(int.class));check((int)h0.invokeExact()==9);
    MethodHandle h1=lookup.findStatic(generated,"wide",MethodType.methodType(int.class));check((int)h1.invokeExact()==3);
    emit("cf-arithmetic-dup-x2","DUP_X2=both-forms;category2-below-category1=valid;values=9/3;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildDup2(ClassBuilder b) {flags(b);
    b.withMethodBody("narrow",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2Narrow);
    b.withMethodBody("wide",MethodTypeDesc.of(CD_long),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2Wide);
  }
  private static void caseDup2() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDup2"),InstructionArithmeticFinal::buildDup2);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-dup2","arithmetic-dup2",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"narrow",MethodType.methodType(int.class));check((int)h0.invokeExact()==10);
    MethodHandle h1=lookup.findStatic(generated,"wide",MethodType.methodType(long.class));check((long)h1.invokeExact()==2L);
    emit("cf-arithmetic-dup2","DUP2=both-forms;two-category1/one-category2=valid;values=10/2;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildDup2X1(ClassBuilder b) {flags(b);
    b.withMethodBody("narrow",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2X1Narrow);
    b.withMethodBody("wide",MethodTypeDesc.of(CD_long),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2X1Wide);
  }
  private static void caseDup2X1() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDup2X1"),InstructionArithmeticFinal::buildDup2X1);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-dup2-x1","arithmetic-dup2-x1",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"narrow",MethodType.methodType(int.class));check((int)h0.invokeExact()==11);
    MethodHandle h1=lookup.findStatic(generated,"wide",MethodType.methodType(long.class));check((long)h1.invokeExact()==1L);
    emit("cf-arithmetic-dup2-x1","DUP2_X1=both-forms;category2-top=valid;values=11/1;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildDup2X2(ClassBuilder b) {flags(b);
    b.withMethodBody("first",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2X2First);
    b.withMethodBody("second",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2X2Second);
    b.withMethodBody("third",MethodTypeDesc.of(CD_long),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2X2Third);
    b.withMethodBody("fourth",MethodTypeDesc.of(CD_long),PUBLIC_STATIC,InstructionArithmeticFinal::codeDup2X2Fourth);
  }
  private static void caseDup2X2() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDup2X2"),InstructionArithmeticFinal::buildDup2X2);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-arithmetic-dup2-x2","arithmetic-dup2-x2",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle h0=lookup.findStatic(generated,"first",MethodType.methodType(int.class));check((int)h0.invokeExact()==17);
    MethodHandle h1=lookup.findStatic(generated,"second",MethodType.methodType(int.class));check((int)h1.invokeExact()==5);
    MethodHandle h2=lookup.findStatic(generated,"third",MethodType.methodType(long.class));check((long)h2.invokeExact()==1L);
    MethodHandle h3=lookup.findStatic(generated,"fourth",MethodType.methodType(long.class));check((long)h3.invokeExact()==5L);
    emit("cf-arithmetic-dup2-x2","DUP2_X2=all4-legal-forms;category-widths=1/2;values=17/5/1/5;verify=empty;defined/invoked=same-bytes");
  }
  private static void typed(ClassFile api,byte[] bytes) {
    for(MethodModel method:api.parse(bytes).methods())for(CodeElement element:method.code().get())if(element instanceof Instruction) {
      Opcode.Kind kind=((Instruction)element).opcode().kind();
      if(kind==Opcode.Kind.OPERATOR)check(((OperatorInstruction)element).typeKind()!=TypeKind.VOID);
      if(kind==Opcode.Kind.CONVERT)check(((ConvertInstruction)element).fromType()!=TypeKind.VOID && ((ConvertInstruction)element).toType()!=TypeKind.VOID);
      if(kind==Opcode.Kind.STACK)check(element instanceof StackInstruction);
    }
  }
  public static void main(String[] args) throws Throwable {caseArithmetic();caseBits();caseComparisons();caseDupSwap();caseDupX2();caseDup2();caseDup2X1();caseDup2X2();System.out.println("CLASSFILE_INSTRUCTION_ARITHMETIC_OK");}
}

