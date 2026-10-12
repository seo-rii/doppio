package classes.modern_test;

import java.io.InputStream;
import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassHierarchyResolver.ClassHierarchyInfo;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.Label;
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
import static java.lang.constant.ConstantDescs.CD_Object;
import static java.lang.constant.ConstantDescs.CD_String;
import static java.lang.constant.ConstantDescs.CD_int;
import static java.lang.constant.ConstantDescs.CD_long;

/** Original Java25 resolver calls and finite reference/array frame joins. */
public final class ClassFileHierarchyFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ClassDesc INTEGER=ClassDesc.of("java.lang.Integer"),LONG=ClassDesc.of("java.lang.Long"),NUMBER=ClassDesc.of("java.lang.Number");
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void buildNumber(ClassBuilder b) {
    flags(b);b.withMethodBody("choose",MethodTypeDesc.of(NUMBER,CD_int,INTEGER,LONG),PUBLIC_STATIC,ClassFileHierarchyFinal::codeStack);
  }
  private static void buildNumberLocal(ClassBuilder b) {
    flags(b);b.withMethodBody("choose",MethodTypeDesc.of(NUMBER,CD_int,INTEGER,LONG),PUBLIC_STATIC,ClassFileHierarchyFinal::codeLocal);
  }
  private static void buildReferenceArray(ClassBuilder b) {
    flags(b);b.withMethodBody("choose",MethodTypeDesc.of(CD_Object.arrayType(),CD_int,CD_String.arrayType(),INTEGER.arrayType()),PUBLIC_STATIC,ClassFileHierarchyFinal::codeStack);
  }
  private static void buildPrimitiveArray(ClassBuilder b) {
    flags(b);b.withMethodBody("choose",MethodTypeDesc.of(CD_Object,CD_int,CD_int.arrayType(),CD_long.arrayType()),PUBLIC_STATIC,ClassFileHierarchyFinal::codeStack);
  }
  private static void buildBadReturn(ClassBuilder b) {
    flags(b);b.withMethodBody("bad",MethodTypeDesc.of(CD_String,INTEGER),PUBLIC_STATIC,ClassFileHierarchyFinal::codeBadReturn);
  }
  private static void codeStack(CodeBuilder b) {
    Label other=b.newLabel(),join=b.newLabel();
    b.iload(0).ifeq(other).aload(1).goto_(join).labelBinding(other).aload(2).labelBinding(join).areturn();
  }
  private static void codeLocal(CodeBuilder b) {
    Label other=b.newLabel(),join=b.newLabel();
    b.iload(0).ifeq(other).aload(1).astore(3).goto_(join).labelBinding(other).aload(2).astore(3).labelBinding(join).aload(3).areturn();
  }
  private static void codeBadReturn(CodeBuilder b) {b.aload(0).areturn();}
  private static ClassHierarchyInfo unavailable(ClassDesc name) {throw new IllegalStateException("replaced-resolver-must-not-run");}
  private static InputStream resource(ClassDesc name) {
    String descriptor=name.descriptorString();
    return ClassFileHierarchyFinal.class.getClassLoader().getResourceAsStream(descriptor.substring(1,descriptor.length()-1)+".class");
  }
  private static Map<ClassDesc,ClassHierarchyInfo> cache() {return new HashMap<>();}

  private static void caseCallableResolvers() {
    ClassLoader loader=ClassFileHierarchyFinal.class.getClassLoader();
    check(ClassHierarchyResolver.defaultResolver().getClassInfo(CD_String)!=null);
    check(ClassHierarchyResolver.ofClassLoading(loader).getClassInfo(INTEGER)!=null);
    check(ClassHierarchyResolver.ofClassLoading(MethodHandles.lookup()).getClassInfo(NUMBER)!=null);
    check(ClassHierarchyResolver.ofResourceParsing(loader).getClassInfo(CD_String)!=null);
    check(ClassHierarchyResolver.ofResourceParsing(ClassFileHierarchyFinal::resource).getClassInfo(LONG)!=null);
    check(ClassHierarchyInfo.ofClass(CD_Object)!=null && ClassHierarchyInfo.ofInterface()!=null);
    emit("cf-hierarchy-callable-resolvers","default/classLoading-loader/lookup/resource-loader/function=callable;class/interface-info=non-null;generated-bytes=none");
  }
  private static void caseDeclaredChainCache() {
    ClassDesc declared=ClassDesc.of("classes.modern_test.C7dDeclared"),missing=ClassDesc.of("classes.modern_test.C7dMissing");
    ClassHierarchyResolver primary=ClassHierarchyResolver.of(List.of(ClassDesc.of("java.lang.CharSequence")),Map.of(declared,CD_Object));
    check(primary.getClassInfo(declared)!=null && primary.getClassInfo(ClassDesc.of("java.lang.CharSequence"))!=null && primary.getClassInfo(missing)==null);
    ClassHierarchyResolver cached=primary.orElse(ClassHierarchyResolver.defaultResolver()).cached(ClassFileHierarchyFinal::cache);
    ClassHierarchyInfo first=cached.getClassInfo(declared);check(first!=null && cached.getClassInfo(declared)==first && cached.getClassInfo(CD_String)!=null);
    check(primary.cached().getClassInfo(declared)!=null);
    emit("cf-hierarchy-declared-chain-cache","declared-map=class/interface;unknown=null;orElse=String-fallback;cached-supplier/default=callable;held-info=identity;generated-bytes=none");
  }
  private static void caseResolverOptions() throws Throwable {
    ClassHierarchyResolver resolver=ClassHierarchyResolver.defaultResolver();
    ClassFile.ClassHierarchyResolverOption option=ClassFile.ClassHierarchyResolverOption.of(resolver);check(option.classHierarchyResolver()==resolver);
    ClassFile base=ClassFile.of(ClassFile.ClassHierarchyResolverOption.of(ClassFileHierarchyFinal::unavailable));
    ClassFile api=base.withOptions(option,ClassFile.StackMapsOption.GENERATE_STACK_MAPS);check(api!=base);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dResolverOptions"),ClassFileHierarchyFinal::buildNumber);
    check(api.verify(bytes).isEmpty());artifact("cf-hierarchy-resolver-options","hierarchy-options",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(Number.class,int.class,Integer.class,Long.class));
    Integer first=Integer.valueOf(17);Long second=Long.valueOf(29);check((Number)handle.invokeExact(1,first,second)==first && (Number)handle.invokeExact(0,first,second)==second);
    emit("cf-hierarchy-resolver-options","withOptions=resolver-replaced;option-getter=identity;Number-join=generated;branches=17/29;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseSubtypeStackMerge() throws Throwable {
    ClassHierarchyResolver resolver=ClassHierarchyResolver.of(List.of(),Map.of(INTEGER,NUMBER,LONG,NUMBER,NUMBER,CD_Object)).orElse(ClassHierarchyResolver.defaultResolver());
    ClassFile api=ClassFile.of(ClassFile.ClassHierarchyResolverOption.of(resolver),ClassFile.StackMapsOption.GENERATE_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dNumberStack"),ClassFileHierarchyFinal::buildNumber);
    check(api.verify(bytes).isEmpty());artifact("cf-hierarchy-subtype-stack","hierarchy-stack",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(Number.class,int.class,Integer.class,Long.class));
    Integer first=Integer.valueOf(31);Long second=Long.valueOf(47);check((Number)handle.invokeExact(1,first,second)==first && (Number)handle.invokeExact(0,first,second)==second);
    emit("cf-hierarchy-subtype-stack","declared-Integer/Long-to-Number=stack-join;frames=2;branches=31/47;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseSubtypeLocalMerge() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dNumberLocal"),ClassFileHierarchyFinal::buildNumberLocal);
    check(api.verify(bytes).isEmpty());artifact("cf-hierarchy-subtype-local","hierarchy-local",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(Number.class,int.class,Integer.class,Long.class));
    Integer first=Integer.valueOf(53);Long second=Long.valueOf(61);check((Number)handle.invokeExact(1,first,second)==first && (Number)handle.invokeExact(0,first,second)==second);
    emit("cf-hierarchy-subtype-local","Integer/Long-to-Number=local-3-join;frames=2;branches=53/61;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseReferenceArrayMerge() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dReferenceArrays"),ClassFileHierarchyFinal::buildReferenceArray);
    check(api.verify(bytes).isEmpty());artifact("cf-hierarchy-reference-array","hierarchy-reference-array",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(Object[].class,int.class,String[].class,Integer[].class));
    String[] first={"first"};Integer[] second={Integer.valueOf(7)};check((Object[])handle.invokeExact(1,first,second)==first && (Object[])handle.invokeExact(0,first,second)==second);
    emit("cf-hierarchy-reference-array","String[]/Integer[]=Object[]-stack-join;frames=2;parameter-arrays=identity-both-branches;verify=empty;defined/invoked=same-bytes");
  }
  private static void casePrimitiveArrayMerge() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dPrimitiveArrays"),ClassFileHierarchyFinal::buildPrimitiveArray);
    check(api.verify(bytes).isEmpty());artifact("cf-hierarchy-primitive-array","hierarchy-primitive-array",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(Object.class,int.class,int[].class,long[].class));
    int[] first={3};long[] second={5};check((Object)handle.invokeExact(1,first,second)==first && (Object)handle.invokeExact(0,first,second)==second);
    emit("cf-hierarchy-primitive-array","int[]/long[]=Object-stack-join;frames=2;parameter-arrays=identity-both-branches;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseInvalidReferenceReturn() {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dInvalidReference"),ClassFileHierarchyFinal::buildBadReturn);
    check(!api.verify(bytes).isEmpty() && !api.verify(api.parse(bytes)).isEmpty());artifact("cf-hierarchy-invalid-return","hierarchy-invalid",bytes);
    emit("cf-hierarchy-invalid-return","Integer-parameter-to-String-return=invalid;verify(bytes/model)=nonempty;invalid-output-never-defined");
  }
  public static void main(String[] args) throws Throwable {
    caseCallableResolvers();caseDeclaredChainCache();caseResolverOptions();caseSubtypeStackMerge();caseSubtypeLocalMerge();caseReferenceArrayMerge();casePrimitiveArrayMerge();caseInvalidReferenceReturn();
    System.out.println("CLASSFILE_HIERARCHY_OK");
  }
}
