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
/** Original Java25 array instructions, not an API adapter or generated compiler carrier. */
public final class InstructionArraysFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void codeInt(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.INT).dup().arraylength().pop().dup().iconst_1().bipush(42).iastore().iconst_1().iaload().ireturn();
  }
  private static void codeLong(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.LONG).dup().arraylength().pop().dup().iconst_1().ldc(1234567890123L).lastore().iconst_1().laload().lreturn();
  }
  private static void codeFloat(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.FLOAT).dup().arraylength().pop().dup().iconst_1().ldc(1.25f).fastore().iconst_1().faload().freturn();
  }
  private static void codeDouble(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.DOUBLE).dup().arraylength().pop().dup().iconst_1().ldc(2.5d).dastore().iconst_1().daload().dreturn();
  }
  private static void codeByte(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.BYTE).dup().arraylength().pop().dup().iconst_1().bipush(-128).bastore().iconst_1().baload().ireturn();
  }
  private static void codeBoolean(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.BOOLEAN).dup().arraylength().pop().dup().iconst_1().iconst_1().bastore().iconst_1().baload().ireturn();
  }
  private static void codeChar(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.CHAR).dup().arraylength().pop().dup().iconst_1().ldc(65535).castore().iconst_1().caload().ireturn();
  }
  private static void codeShort(CodeBuilder b) {
    b.iconst_2().newarray(TypeKind.SHORT).dup().arraylength().pop().dup().iconst_1().sipush(-32768).sastore().iconst_1().saload().ireturn();
  }
  private static void buildIntLong(ClassBuilder b) {flags(b);
    b.withMethodBody("intValue",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArraysFinal::codeInt);
    b.withMethodBody("longValue",MethodTypeDesc.of(CD_long),PUBLIC_STATIC,InstructionArraysFinal::codeLong);
  }
  private static void caseIntLong() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArrayIntLong"),InstructionArraysFinal::buildIntLong);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-int-long","array-int-long",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle first=lookup.findStatic(generated,"intValue",MethodType.methodType(int.class)),second=lookup.findStatic(generated,"longValue",MethodType.methodType(long.class));
    check((int)first.invokeExact()==42 && (long)second.invokeExact()==1234567890123L);
    emit("cf-array-int-long","newarray=INT/LONG;store/load=typed;arraylength=2;values=42/1234567890123;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildFloatDouble(ClassBuilder b) {flags(b);
    b.withMethodBody("floatValue",MethodTypeDesc.of(CD_float),PUBLIC_STATIC,InstructionArraysFinal::codeFloat);
    b.withMethodBody("doubleValue",MethodTypeDesc.of(CD_double),PUBLIC_STATIC,InstructionArraysFinal::codeDouble);
  }
  private static void caseFloatDouble() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArrayFloatDouble"),InstructionArraysFinal::buildFloatDouble);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-float-double","array-float-double",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle first=lookup.findStatic(generated,"floatValue",MethodType.methodType(float.class)),second=lookup.findStatic(generated,"doubleValue",MethodType.methodType(double.class));
    check((float)first.invokeExact()==1.25f && (double)second.invokeExact()==2.5d);
    emit("cf-array-float-double","newarray=FLOAT/DOUBLE;store/load=typed;arraylength=2;values=1.25/2.5d;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildByteBoolean(ClassBuilder b) {flags(b);
    b.withMethodBody("byteValue",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArraysFinal::codeByte);
    b.withMethodBody("booleanValue",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArraysFinal::codeBoolean);
  }
  private static void caseByteBoolean() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArrayByteBoolean"),InstructionArraysFinal::buildByteBoolean);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-byte-boolean","array-byte-boolean",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle first=lookup.findStatic(generated,"byteValue",MethodType.methodType(int.class)),second=lookup.findStatic(generated,"booleanValue",MethodType.methodType(int.class));
    check((int)first.invokeExact()==-128 && (int)second.invokeExact()==1);
    emit("cf-array-byte-boolean","newarray=BYTE/BOOLEAN;store/load=typed;arraylength=2;values=-128/1;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildCharShort(ClassBuilder b) {flags(b);
    b.withMethodBody("charValue",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArraysFinal::codeChar);
    b.withMethodBody("shortValue",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,InstructionArraysFinal::codeShort);
  }
  private static void caseCharShort() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArrayCharShort"),InstructionArraysFinal::buildCharShort);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-char-short","array-char-short",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle first=lookup.findStatic(generated,"charValue",MethodType.methodType(int.class)),second=lookup.findStatic(generated,"shortValue",MethodType.methodType(int.class));
    check((int)first.invokeExact()==65535 && (int)second.invokeExact()==-32768);
    emit("cf-array-char-short","newarray=CHAR/SHORT;store/load=typed;arraylength=2;values=65535/-32768;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildReference(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_String),PUBLIC_STATIC,InstructionArraysFinal::codeReference);}
  private static void codeReference(CodeBuilder b) {
    b.iconst_2().anewarray(CD_String).dup().arraylength().pop().dup().iconst_0().ldc("array-reference").aastore().iconst_0().aaload().areturn();
  }
  private static void caseReference() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArrayReference"),InstructionArraysFinal::buildReference);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-reference","array-reference",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(String.class));check(((String)handle.invokeExact()).equals("array-reference"));
    emit("cf-array-reference","anewarray=String;AASTORE/AALOAD=reference;arraylength=2;value=array-reference;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildNested(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_String),PUBLIC_STATIC,InstructionArraysFinal::codeNested);}
  private static void codeNested(CodeBuilder b) {
    b.iconst_1().anewarray(CD_String.arrayType()).dup().iconst_0().iconst_1().anewarray(CD_String).dup().iconst_0().ldc("nested-reference").aastore()
      .aastore().iconst_0().aaload().iconst_0().aaload().areturn();
  }
  private static void caseNested() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dArrayNested"),InstructionArraysFinal::buildNested);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-nested-reference","array-nested",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(String.class));check(((String)handle.invokeExact()).equals("nested-reference"));
    emit("cf-array-nested-reference","anewarray=String[]/String;descriptor=[[Ljava/lang/String;;nested-AASTORE/AALOAD=value;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildMultiPrimitive(ClassBuilder b) {flags(b);
    b.withMethodBody("full",MethodTypeDesc.of(CD_int.arrayType(2)),PUBLIC_STATIC,InstructionArraysFinal::codeMultiIntFull);
    b.withMethodBody("partial",MethodTypeDesc.of(CD_int.arrayType(3)),PUBLIC_STATIC,InstructionArraysFinal::codeMultiIntPartial);
  }
  private static void codeMultiIntFull(CodeBuilder b) {b.iconst_2().iconst_3().multianewarray(CD_int.arrayType(2),2).areturn();}
  private static void codeMultiIntPartial(CodeBuilder b) {b.iconst_2().iconst_3().multianewarray(CD_int.arrayType(3),2).areturn();}
  private static void caseMultiPrimitive() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dMultiPrimitive"),InstructionArraysFinal::buildMultiPrimitive);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-multi-primitive","array-multi-primitive",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle full=lookup.findStatic(generated,"full",MethodType.methodType(int[][].class)),partial=lookup.findStatic(generated,"partial",MethodType.methodType(int[][][].class));
    int[][] first=(int[][])full.invokeExact();int[][][] second=(int[][][])partial.invokeExact();
    check(first.length==2 && first[0].length==3 && first[1].length==3 && second.length==2 && second[0].length==3 && second[0][0]==null);
    emit("cf-array-multi-primitive","multianewarray=[[I/[[[I;dimensions=2/2;shape=2x3;partial-leaves=null;verify=empty;defined/invoked=same-bytes");
  }
  private static void buildMultiReference(ClassBuilder b) {flags(b);
    b.withMethodBody("full",MethodTypeDesc.of(CD_String.arrayType(2)),PUBLIC_STATIC,InstructionArraysFinal::codeMultiStringFull);
    b.withMethodBody("partial",MethodTypeDesc.of(CD_String.arrayType(3)),PUBLIC_STATIC,InstructionArraysFinal::codeMultiStringPartial);
  }
  private static void codeMultiStringFull(CodeBuilder b) {b.iconst_2().iconst_3().multianewarray(CD_String.arrayType(2),2).areturn();}
  private static void codeMultiStringPartial(CodeBuilder b) {b.iconst_2().multianewarray(CD_String.arrayType(3),1).areturn();}
  private static void caseMultiReference() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dMultiReference"),InstructionArraysFinal::buildMultiReference);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-array-multi-reference","array-multi-reference",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle full=lookup.findStatic(generated,"full",MethodType.methodType(String[][].class)),partial=lookup.findStatic(generated,"partial",MethodType.methodType(String[][][].class));
    String[][] first=(String[][])full.invokeExact();String[][][] second=(String[][][])partial.invokeExact();
    check(first.length==2 && first[0].length==3 && first[1].length==3 && first[0][0]==null && second.length==2 && second[0]==null);
    emit("cf-array-multi-reference","multianewarray=String[][]/String[][][];dimensions=2/1;shape=2x3/2;unallocated-reference-leaves=null;verify=empty;defined/invoked=same-bytes");
  }
  private static void typed(ClassFile api,byte[] bytes) {
    for(MethodModel method:api.parse(bytes).methods())for(CodeElement element:method.code().get())if(element instanceof Instruction) {
      Instruction instruction=(Instruction)element;Opcode.Kind kind=instruction.opcode().kind();
      if(kind==Opcode.Kind.NEW_PRIMITIVE_ARRAY)check(((NewPrimitiveArrayInstruction)element).typeKind().newarrayCode()>=4);
      if(kind==Opcode.Kind.NEW_REF_ARRAY)check(((NewReferenceArrayInstruction)element).componentType().tag()==7);
      if(kind==Opcode.Kind.NEW_MULTI_ARRAY)check(((NewMultiArrayInstruction)element).arrayType().tag()==7 && ((NewMultiArrayInstruction)element).dimensions()>=1);
      if(kind==Opcode.Kind.ARRAY_LOAD)check(((ArrayLoadInstruction)element).typeKind()!=TypeKind.VOID);
      if(kind==Opcode.Kind.ARRAY_STORE)check(((ArrayStoreInstruction)element).typeKind()!=TypeKind.VOID);
      if(kind==Opcode.Kind.OPERATOR)check(((OperatorInstruction)element).typeKind()==TypeKind.INT);
    }
  }
  public static void main(String[] args) throws Throwable {
    caseIntLong();caseFloatDouble();caseByteBoolean();caseCharShort();caseReference();caseNested();caseMultiPrimitive();caseMultiReference();
    System.out.println("CLASSFILE_INSTRUCTION_ARRAYS_OK");
  }
}

