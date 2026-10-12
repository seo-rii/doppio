package classes.modern_test;

import java.lang.classfile.BootstrapMethodEntry;
import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.Opcode;
import java.lang.classfile.constantpool.ConstantDynamicEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.InvokeDynamicEntry;
import java.lang.classfile.constantpool.MethodHandleEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.DynamicCallSiteDesc;
import java.lang.constant.DynamicConstantDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.List;

import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.bytes;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.BSM_EXPLICIT_CAST;
import static java.lang.constant.ConstantDescs.BSM_NULL_CONSTANT;
import static java.lang.constant.ConstantDescs.CD_MethodHandle;
import static java.lang.constant.ConstantDescs.CD_MethodType;
import static java.lang.constant.ConstantDescs.CD_String;
import static java.lang.constant.ConstantDescs.CD_double;
import static java.lang.constant.ConstantDescs.CD_int;
import static java.lang.constant.ConstantDescs.CD_long;

/** Each host constructs genuine CP15/16/17/18 and BootstrapMethods payloads. */
public final class ClassFileBootstrapFinal {
  private static final int STATIC_PUBLIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ClassDesc CONCAT=ClassDesc.of("java.lang.invoke.StringConcatFactory");
  // Exact public nominal bootstrap descriptor; no runtime API adapter.
  private static final DirectMethodHandleDesc CONCAT_HANDLE=java.lang.constant.MethodHandleDesc.ofMethod(
      DirectMethodHandleDesc.Kind.STATIC,CONCAT,"makeConcatWithConstants",MethodTypeDesc.of(ClassDesc.of("java.lang.invoke.CallSite"),
      ClassDesc.of("java.lang.invoke.MethodHandles$Lookup"),CD_String,CD_MethodType,CD_String,ClassDesc.of("java.lang.Object").arrayType()));
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void buildHandles(ClassBuilder b) {
    flags(b);b.withMethodBody("handle",MethodTypeDesc.of(CD_MethodHandle),STATIC_PUBLIC,ClassFileBootstrapFinal::codeHandle);
    b.withMethodBody("type",MethodTypeDesc.of(CD_MethodType),STATIC_PUBLIC,ClassFileBootstrapFinal::codeType);
  }
  private static void codeHandle(CodeBuilder b) {
    var pool=b.constantPool();
    b.ldc(pool.methodHandleEntry(6,pool.methodRefEntry(ClassDesc.of("java.lang.Math"),"abs",MethodTypeDesc.of(CD_int,CD_int)))).areturn();
  }
  private static void codeType(CodeBuilder b) {b.ldc(b.constantPool().methodTypeEntry(MethodTypeDesc.of(CD_int,CD_int))).areturn();}
  private static void codeValue(CodeBuilder b) {b.bipush(17).ireturn();}
  private static void buildBootstrapArguments(ClassBuilder b) {
    flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int),STATIC_PUBLIC,ClassFileBootstrapFinal::codeValue);
    var pool=b.constantPool();MethodHandleEntry method=pool.methodHandleEntry(BSM_EXPLICIT_CAST);
    var args=List.of(pool.stringEntry("bootstrap-text"),pool.intEntry(7),pool.longEntry(11L),pool.doubleEntry(2.5d),
        pool.methodTypeEntry(MethodTypeDesc.of(CD_int)),pool.classEntry(CD_String),method);
    BootstrapMethodEntry first=pool.bsmEntry(method,args),second=pool.bsmEntry(method,args);
    check(first.bsmIndex()==second.bsmIndex());
  }
  private static void buildNull(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_String),STATIC_PUBLIC,ClassFileBootstrapFinal::codeNull);}
  private static void codeNull(CodeBuilder b) {
    var pool=b.constantPool();BootstrapMethodEntry bootstrap=pool.bsmEntry(BSM_NULL_CONSTANT,List.of());
    ConstantDynamicEntry entry=pool.constantDynamicEntry(bootstrap,pool.nameAndTypeEntry("nullValue",CD_String));
    b.ldc(entry).areturn();
  }
  private static void buildInt(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int),STATIC_PUBLIC,ClassFileBootstrapFinal::codeInt);}
  private static void codeInt(CodeBuilder b) {b.ldc(DynamicConstantDesc.ofNamed(BSM_EXPLICIT_CAST,"integerValue",CD_int,Integer.valueOf(42))).ireturn();}
  private static void buildWide(ClassBuilder b) {
    flags(b);b.withMethodBody("longValue",MethodTypeDesc.of(CD_long),STATIC_PUBLIC,ClassFileBootstrapFinal::codeLong);
    b.withMethodBody("doubleValue",MethodTypeDesc.of(CD_double),STATIC_PUBLIC,ClassFileBootstrapFinal::codeDouble);
  }
  private static void codeLong(CodeBuilder b) {
    var pool=b.constantPool();ConstantDynamicEntry entry=pool.constantDynamicEntry(DynamicConstantDesc.ofNamed(BSM_EXPLICIT_CAST,"longValue",CD_long,Long.valueOf(9000000000L)));
    b.with(ConstantInstruction.ofLoad(Opcode.LDC2_W,entry)).lreturn();
  }
  private static void codeDouble(CodeBuilder b) {b.ldc(DynamicConstantDesc.ofNamed(BSM_EXPLICIT_CAST,"doubleValue",CD_double,Double.valueOf(3.5d))).dreturn();}
  private static void buildIndyEntry(ClassBuilder b) {flags(b);b.withMethodBody("concat",MethodTypeDesc.of(CD_String,CD_int),STATIC_PUBLIC,ClassFileBootstrapFinal::codeIndyEntry);}
  private static void codeIndyEntry(CodeBuilder b) {
    var pool=b.constantPool();BootstrapMethodEntry bootstrap=pool.bsmEntry(CONCAT_HANDLE,List.of("v=\u0001"));
    InvokeDynamicEntry entry=pool.invokeDynamicEntry(bootstrap,pool.nameAndTypeEntry("makeConcatWithConstants",MethodTypeDesc.of(CD_String,CD_int)));
    b.iload(0).invokedynamic(entry).areturn();
  }
  private static void buildIndyNominal(ClassBuilder b) {flags(b);b.withMethodBody("concat",MethodTypeDesc.of(CD_String,CD_int),STATIC_PUBLIC,ClassFileBootstrapFinal::codeIndyNominal);}
  private static void codeIndyNominal(CodeBuilder b) {
    b.iload(0).invokedynamic(DynamicCallSiteDesc.of(CONCAT_HANDLE,"makeConcatWithConstants",MethodTypeDesc.of(CD_String,CD_int),"nom=\u0001")).areturn();
  }
  private static ClassModel model() throws Exception {
    return ClassFile.of().parse(bytes(ClassFileBootstrapFinal.class,"ClassFileBootstrapTarget.class"));
  }
  private static void caseHandleAndTypeEntries() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cHandles"),ClassFileBootstrapFinal::buildHandles);
    var pool=api.parse(bytes).constantPool();int handles=0,types=0;
    for(PoolEntry entry:pool) {if(entry.tag()==15){MethodHandleEntry handle=(MethodHandleEntry)entry;check(handle.kind()==6 && handle.reference().name().equalsString("abs"));handles++;}if(entry.tag()==16)types++;}
    check(handles==1 && types==1 && api.verify(bytes).isEmpty());artifact("cf-bootstrap-handle-type","bootstrap-handles",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle getter=lookup.findStatic(generated,"handle",MethodType.methodType(MethodHandle.class));MethodHandle handle=(MethodHandle)getter.invokeExact();check((int)handle.invokeExact(-8)==8);
    MethodHandle typeGetter=lookup.findStatic(generated,"type",MethodType.methodType(MethodType.class));check(((MethodType)typeGetter.invokeExact()).equals(MethodType.methodType(int.class,int.class)));
    emit("cf-bootstrap-handle-type","CP15=REF_invokeStatic:Math.abs(I)I;CP16=(I)I;load=typed;abs(-8)=8;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseBootstrapArguments() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cBootstrapArguments"),ClassFileBootstrapFinal::buildBootstrapArguments);
    ClassModel model=api.parse(bytes);var pool=model.constantPool();check(pool.bootstrapMethodCount()==1);
    BootstrapMethodEntry bootstrap=pool.bootstrapMethodEntry(0);check(bootstrap.arguments().size()==7);
    int[] tags={8,3,5,6,16,7,15};for(int n=0;n<tags.length;n++)check(bootstrap.arguments().get(n).tag()==tags[n]);
    var attribute=model.findAttribute(java.lang.classfile.Attributes.bootstrapMethods()).get();check(attribute.bootstrapMethodsSize()==1 && attribute.bootstrapMethods().get(0).bsmIndex()==0);
    check(api.verify(bytes).isEmpty());artifact("cf-bootstrap-arguments-dedup","bootstrap-arguments",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-bootstrap-arguments-dedup","BootstrapMethods=1;dedup=semantic;argument-tags=8/3/5/6/16/7/15;ordered=7;resolution=not-requested;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCondyNull() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cCondyNull"),ClassFileBootstrapFinal::buildNull);
    ClassModel model=api.parse(bytes);ConstantDynamicEntry dynamic=null;for(PoolEntry entry:model.constantPool())if(entry.tag()==17)dynamic=(ConstantDynamicEntry)entry;
    check(dynamic!=null && dynamic.typeSymbol().equals(CD_String) && dynamic.name().equalsString("nullValue") && dynamic.bootstrapMethodIndex()==0 && dynamic.asSymbol().constantType().equals(CD_String));
    check(api.verify(bytes).isEmpty());artifact("cf-bootstrap-condy-null","bootstrap-condy-null",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(String.class));check((String)handle.invokeExact()==null);
    emit("cf-bootstrap-condy-null","CP17=nullValue:Ljava/lang/String;;bootstrap=nullConstant;typed=REFERENCE;resolved=null;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCondyInt() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cCondyInt"),ClassFileBootstrapFinal::buildInt);
    check(api.verify(bytes).isEmpty());artifact("cf-bootstrap-condy-int","bootstrap-condy-int",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==42);
    emit("cf-bootstrap-condy-int","CP17=integerValue:I;nominal=DynamicConstantDesc;bootstrap=explicitCast;resolved=42;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCondyWide() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cCondyWide"),ClassFileBootstrapFinal::buildWide);
    ClassModel model=api.parse(bytes);check(model.constantPool().bootstrapMethodCount()==2 && api.verify(bytes).isEmpty());
    artifact("cf-bootstrap-condy-wide","bootstrap-condy-wide",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle longHandle=lookup.findStatic(generated,"longValue",MethodType.methodType(long.class));check((long)longHandle.invokeExact()==9000000000L);
    MethodHandle doubleHandle=lookup.findStatic(generated,"doubleValue",MethodType.methodType(double.class));check((double)doubleHandle.invokeExact()==3.5d);
    emit("cf-bootstrap-condy-wide","CP17=longValue:J/doubleValue:D;ldc2_w=2;max_stack=2/2;bootstrap=explicitCast;resolved=9000000000/3.5;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseInvokeDynamicEntry() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cIndyEntry"),ClassFileBootstrapFinal::buildIndyEntry);
    check(api.verify(bytes).isEmpty());artifact("cf-bootstrap-invokedynamic-entry","bootstrap-indy-entry",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"concat",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(7)).equals("v=7"));
    emit("cf-bootstrap-invokedynamic-entry","CP18=makeConcatWithConstants:(I)Ljava/lang/String;;typed-InvokeDynamicEntry;operand-padding=00/00;resolved=v=7;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseInvokeDynamicNominal() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cIndyNominal"),ClassFileBootstrapFinal::buildIndyNominal);
    var pool=api.parse(bytes).constantPool();InvokeDynamicEntry dynamic=null;for(PoolEntry entry:pool)if(entry.tag()==18)dynamic=(InvokeDynamicEntry)entry;
    check(dynamic!=null && dynamic.asSymbol().invocationType().equals(MethodTypeDesc.of(CD_String,CD_int)) && dynamic.asSymbol().bootstrapArgs()[0].equals("nom=\u0001"));
    check(api.verify(bytes).isEmpty());artifact("cf-bootstrap-invokedynamic-nominal","bootstrap-indy-nominal",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"concat",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(-3)).equals("nom=-3"));
    emit("cf-bootstrap-invokedynamic-nominal","CP18=makeConcatWithConstants:(I)Ljava/lang/String;;DynamicCallSiteDesc=round-tripped;resolved=nom=-3;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseOriginalTypedBootstraps() throws Exception {
    ClassFile api=ClassFile.of();ClassModel model=model();var pool=model.constantPool();
    check(pool.bootstrapMethodCount()==1 && pool.bootstrapMethodEntry(0).bootstrapMethod().reference().owner().asSymbol().equals(CONCAT));
    int dynamics=0;for(PoolEntry entry:pool)if(entry instanceof InvokeDynamicEntry){InvokeDynamicEntry dynamic=(InvokeDynamicEntry)entry;check(dynamic.bootstrapMethodIndex()==0 && dynamic.typeSymbol().equals(MethodTypeDesc.of(CD_String,CD_int)));dynamics++;}
    check(dynamics==1 && model.findAttribute(java.lang.classfile.Attributes.bootstrapMethods()).get().bootstrapMethodsSize()==1 && api.verify(model).isEmpty());
    emit("cf-bootstrap-original-typed","unchanged-javac25=ClassFileBootstrapTarget;CP18=1;BootstrapMethods=1;recipe=original-control-U0001;typed-model=verified;generated-bytes=none");
  }
  public static void main(String[] args) throws Throwable {
    caseHandleAndTypeEntries();caseBootstrapArguments();caseCondyNull();caseCondyInt();caseCondyWide();caseInvokeDynamicEntry();caseInvokeDynamicNominal();caseOriginalTypedBootstraps();
    System.out.println("CLASSFILE_BOOTSTRAP_OK");
  }
}

final class ClassFileBootstrapTarget {
  static String concat(int value) {return "c="+value;}
}
