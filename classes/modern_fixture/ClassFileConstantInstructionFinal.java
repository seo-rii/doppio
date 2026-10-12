package classes.modern_test;

import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.classfile.instruction.ConstantInstruction.ArgumentConstantInstruction;
import java.lang.classfile.instruction.ConstantInstruction.IntrinsicConstantInstruction;
import java.lang.classfile.instruction.ConstantInstruction.LoadConstantInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.CD_Object;
import static java.lang.constant.ConstantDescs.CD_String;
import static java.lang.constant.ConstantDescs.CD_Class;
import static java.lang.constant.ConstantDescs.CD_int;
import static java.lang.constant.ConstantDescs.CD_long;
import static java.lang.constant.ConstantDescs.CD_float;
import static java.lang.constant.ConstantDescs.CD_double;
import static java.lang.constant.ConstantDescs.NULL;

/** Genuine javac25 covariant instruction factories and bridge invocation. */
public final class ClassFileConstantInstructionFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void buildIntegers(ClassBuilder b) {
    flags(b);b.withMethodBody("minusOne",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeMinusOne);
    b.withMethodBody("zero",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeZero);
    b.withMethodBody("five",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeFive);
  }
  private static void codeMinusOne(CodeBuilder b) {IntrinsicConstantInstruction value=ConstantInstruction.ofIntrinsic(Opcode.ICONST_M1);check(value.typeKind()==TypeKind.INT && value.constantValue().equals(-1));b.with(value).ireturn();}
  private static void codeZero(CodeBuilder b) {b.with(ConstantInstruction.ofIntrinsic(Opcode.ICONST_0)).ireturn();}
  private static void codeFive(CodeBuilder b) {b.with(ConstantInstruction.ofIntrinsic(Opcode.ICONST_5)).ireturn();}
  private static void buildWide(ClassBuilder b) {
    flags(b);b.withMethodBody("longValue",MethodTypeDesc.of(CD_long),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeLongOne);
    b.withMethodBody("floatValue",MethodTypeDesc.of(CD_float),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeFloatTwo);
    b.withMethodBody("doubleValue",MethodTypeDesc.of(CD_double),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeDoubleOne);
  }
  private static void codeLongOne(CodeBuilder b) {b.with(ConstantInstruction.ofIntrinsic(Opcode.LCONST_1)).lreturn();}
  private static void codeFloatTwo(CodeBuilder b) {b.with(ConstantInstruction.ofIntrinsic(Opcode.FCONST_2)).freturn();}
  private static void codeDoubleOne(CodeBuilder b) {b.with(ConstantInstruction.ofIntrinsic(Opcode.DCONST_1)).dreturn();}
  private static void buildNull(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_Object),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeNull);}
  private static void codeNull(CodeBuilder b) {IntrinsicConstantInstruction value=ConstantInstruction.ofIntrinsic(Opcode.ACONST_NULL);check(value.constantValue().equals(NULL) && value.typeKind()==TypeKind.REFERENCE);b.with(value).areturn();}
  private static void buildBipush(ClassBuilder b) {
    flags(b);b.withMethodBody("negative",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeByteNegative);
    b.withMethodBody("positive",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeBytePositive);
  }
  private static void codeByteNegative(CodeBuilder b) {
    ArgumentConstantInstruction value=ConstantInstruction.ofArgument(Opcode.BIPUSH,-128);Integer narrow=value.constantValue();ConstantInstruction parent=value;
    check(narrow.intValue()==-128 && parent.constantValue().equals(narrow) && value.typeKind()==TypeKind.INT);b.with(value).ireturn();
  }
  private static void codeBytePositive(CodeBuilder b) {b.with(ConstantInstruction.ofArgument(Opcode.BIPUSH,127)).ireturn();}
  private static void buildSipush(ClassBuilder b) {
    flags(b);b.withMethodBody("negative",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeShortNegative);
    b.withMethodBody("positive",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeShortPositive);
  }
  private static void codeShortNegative(CodeBuilder b) {b.with(ConstantInstruction.ofArgument(Opcode.SIPUSH,-32768)).ireturn();}
  private static void codeShortPositive(CodeBuilder b) {b.with(ConstantInstruction.ofArgument(Opcode.SIPUSH,32767)).ireturn();}
  private static void buildNumericLoads(ClassBuilder b) {
    flags(b);b.withMethodBody("intValue",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeIntLoad);
    b.withMethodBody("longValue",MethodTypeDesc.of(CD_long),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeLongLoad);
    b.withMethodBody("floatValue",MethodTypeDesc.of(CD_float),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeFloatLoad);
    b.withMethodBody("doubleValue",MethodTypeDesc.of(CD_double),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeDoubleLoad);
  }
  private static void codeIntLoad(CodeBuilder b) {LoadConstantInstruction value=ConstantInstruction.ofLoad(Opcode.LDC,b.constantPool().intEntry(42));check(value.constantEntry().tag()==3 && value.constantValue().equals(42));b.with(value).ireturn();}
  private static void codeLongLoad(CodeBuilder b) {b.with(ConstantInstruction.ofLoad(Opcode.LDC2_W,b.constantPool().longEntry(1234567890123L))).lreturn();}
  private static void codeFloatLoad(CodeBuilder b) {b.with(ConstantInstruction.ofLoad(Opcode.LDC,b.constantPool().floatEntry(1.25f))).freturn();}
  private static void codeDoubleLoad(CodeBuilder b) {b.with(ConstantInstruction.ofLoad(Opcode.LDC2_W,b.constantPool().doubleEntry(2.5d))).dreturn();}
  private static void buildReferenceLoads(ClassBuilder b) {
    flags(b);b.withMethodBody("classValue",MethodTypeDesc.of(CD_Class),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeClassLoad);
    b.withMethodBody("stringValue",MethodTypeDesc.of(CD_String),PUBLIC_STATIC,ClassFileConstantInstructionFinal::codeStringLoad);
  }
  private static void codeClassLoad(CodeBuilder b) {b.with(ConstantInstruction.ofLoad(Opcode.LDC,b.constantPool().classEntry(CD_String))).areturn();}
  private static void codeStringLoad(CodeBuilder b) {b.with(ConstantInstruction.ofLoad(Opcode.LDC,b.constantPool().stringEntry("typed-constant"))).areturn();}

  private static void caseIntrinsicIntegers() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dIntrinsicInts"),ClassFileConstantInstructionFinal::buildIntegers);
    check(api.verify(bytes).isEmpty());artifact("cf-constant-intrinsic-integers","constant-integers",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle negative=lookup.findStatic(generated,"minusOne",MethodType.methodType(int.class)),zero=lookup.findStatic(generated,"zero",MethodType.methodType(int.class)),five=lookup.findStatic(generated,"five",MethodType.methodType(int.class));
    check((int)negative.invokeExact()==-1 && (int)zero.invokeExact()==0 && (int)five.invokeExact()==5);
    emit("cf-constant-intrinsic-integers","ofIntrinsic=typed-IntrinsicConstantInstruction;ICONST_M1/0/5=-1/0/5;typeKind=INT;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseIntrinsicWide() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dIntrinsicWide"),ClassFileConstantInstructionFinal::buildWide);
    check(api.verify(bytes).isEmpty());artifact("cf-constant-intrinsic-wide","constant-wide",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle l=lookup.findStatic(generated,"longValue",MethodType.methodType(long.class)),f=lookup.findStatic(generated,"floatValue",MethodType.methodType(float.class)),d=lookup.findStatic(generated,"doubleValue",MethodType.methodType(double.class));
    check((long)l.invokeExact()==1L && (float)f.invokeExact()==2f && (double)d.invokeExact()==1d);
    emit("cf-constant-intrinsic-wide","ofIntrinsic=LCONST_1/FCONST_2/DCONST_1;values=1/2/1;max_stack=2/1/2;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseIntrinsicNull() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dIntrinsicNull"),ClassFileConstantInstructionFinal::buildNull);
    check(api.verify(bytes).isEmpty());artifact("cf-constant-intrinsic-null","constant-null",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(Object.class));check((Object)handle.invokeExact()==null);
    emit("cf-constant-intrinsic-null","ofIntrinsic=ACONST_NULL;constantValue=ConstantDescs.NULL;typeKind=REFERENCE;resolved=null;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseArgumentByte() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArgumentByte"),ClassFileConstantInstructionFinal::buildBipush);
    check(api.verify(bytes).isEmpty());artifact("cf-constant-argument-byte","constant-byte",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle negative=lookup.findStatic(generated,"negative",MethodType.methodType(int.class)),positive=lookup.findStatic(generated,"positive",MethodType.methodType(int.class));check((int)negative.invokeExact()==-128 && (int)positive.invokeExact()==127);
    emit("cf-constant-argument-byte","ofArgument=BIPUSH;covariant=Integer;parent-bridge=ConstantDesc;bounds=-128/127;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseArgumentShort() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArgumentShort"),ClassFileConstantInstructionFinal::buildSipush);
    check(api.verify(bytes).isEmpty());artifact("cf-constant-argument-short","constant-short",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle negative=lookup.findStatic(generated,"negative",MethodType.methodType(int.class)),positive=lookup.findStatic(generated,"positive",MethodType.methodType(int.class));check((int)negative.invokeExact()==-32768 && (int)positive.invokeExact()==32767);
    emit("cf-constant-argument-short","ofArgument=SIPUSH;typed-ArgumentConstantInstruction;bounds=-32768/32767;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseNumericLoads() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dNumericLoads"),ClassFileConstantInstructionFinal::buildNumericLoads);
    check(api.verify(bytes).isEmpty());artifact("cf-constant-numeric-loads","constant-numeric-loads",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle i=lookup.findStatic(generated,"intValue",MethodType.methodType(int.class)),l=lookup.findStatic(generated,"longValue",MethodType.methodType(long.class)),f=lookup.findStatic(generated,"floatValue",MethodType.methodType(float.class)),d=lookup.findStatic(generated,"doubleValue",MethodType.methodType(double.class));
    check((int)i.invokeExact()==42 && (long)l.invokeExact()==1234567890123L && (float)f.invokeExact()==1.25f && (double)d.invokeExact()==2.5d);
    emit("cf-constant-numeric-loads","ofLoad=typed-LoadConstantInstruction;constantEntry=typed;tags=3/5/4/6;values=42/1234567890123/1.25/2.5;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseReferenceLoads() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dReferenceLoads"),ClassFileConstantInstructionFinal::buildReferenceLoads);
    check(api.verify(bytes).isEmpty());artifact("cf-constant-reference-loads","constant-reference-loads",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle c=lookup.findStatic(generated,"classValue",MethodType.methodType(Class.class)),s=lookup.findStatic(generated,"stringValue",MethodType.methodType(String.class));check((Class<?>)c.invokeExact()==String.class && ((String)s.invokeExact()).equals("typed-constant"));
    emit("cf-constant-reference-loads","ofLoad=ClassEntry/StringEntry;tags=7/8;values=String.class/typed-constant;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseFactoryValidation() {
    int rejected=0;
    try {ConstantInstruction.ofIntrinsic(Opcode.BIPUSH);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofIntrinsic(null);} catch(NullPointerException e) {rejected++;}
    try {ConstantInstruction.ofArgument(Opcode.ICONST_0,0);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofArgument(null,0);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofArgument(Opcode.BIPUSH,-129);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofArgument(Opcode.BIPUSH,128);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofArgument(Opcode.SIPUSH,-32769);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofArgument(Opcode.SIPUSH,32768);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofLoad(Opcode.NOP,null);} catch(IllegalArgumentException e) {rejected++;}
    try {ConstantInstruction.ofLoad(Opcode.LDC,null);} catch(NullPointerException e) {rejected++;}
    check(rejected==10);
    emit("cf-constant-factory-validation","wrong-opcodes/ranges/null=10-original-exceptions;ofArgument-null=IllegalArgumentException;ofLoad-opcode-before-entry;generated-bytes=none");
  }
  public static void main(String[] args) throws Throwable {
    caseIntrinsicIntegers();caseIntrinsicWide();caseIntrinsicNull();caseArgumentByte();caseArgumentShort();caseNumericLoads();caseReferenceLoads();caseFactoryValidation();
    System.out.println("CLASSFILE_CONSTANT_INSTRUCTION_OK");
  }
}
