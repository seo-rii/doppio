package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.lang.classfile.Attribute;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassHierarchyResolver.ClassHierarchyInfo;
import java.lang.classfile.ClassModel;
import java.lang.classfile.Label;
import java.lang.classfile.attribute.StackMapFrameInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.ObjectVerificationTypeInfo;
import java.lang.classfile.attribute.StackMapTableAttribute;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandles;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Bounded public-API diagnostics; no generated-class definition or VM verifier verdict. */
public final class ClassFileHierarchyRegression {
  private static int completed;
  private static int initialized;
  public static final class UninitializedMetadata {
    static { initialized++; }
  }

  private static ClassDesc d(String descriptor) { return ClassDesc.ofDescriptor(descriptor); }
  private static void check(boolean valid, String message) { if (!valid) throw new AssertionError(message); }
  private static void finished() { completed++; }
  private static void illegal(Runnable action, String message) {
    try { action.run(); throw new AssertionError(message); }
    catch (IllegalArgumentException expected) { finished(); }
  }
  private static void nullArgument(Runnable action, String message) {
    try { action.run(); throw new AssertionError(message); }
    catch (NullPointerException expected) {}
  }

  private static void factories() {
    check(ClassHierarchyInfo.ofClass(null) != null && ClassHierarchyInfo.ofInterface() != null,
        "Real nested metadata factories"); finished();
    ClassDesc object=d("Ljava/lang/Object;"), a=d("Ldeclared/A;"), b=d("Ldeclared/B;");
    List<ClassDesc> interfaces=new ArrayList<>(); interfaces.add(b);
    Map<ClassDesc,ClassDesc> parents=new HashMap<>(); parents.put(a,object);
    ClassHierarchyResolver mapped=ClassHierarchyResolver.of(interfaces,parents);
    parents.clear(); interfaces.clear();
    check(mapped.getClassInfo(a)!=null && mapped.getClassInfo(b)!=null && mapped.getClassInfo(object)!=null &&
        mapped.getClassInfo(d("Ldeclared/Missing;"))==null,"Metadata snapshot and Object root"); finished();
    int[] called={0,0}; ClassHierarchyInfo information=ClassHierarchyInfo.ofClass(object);
    ClassHierarchyResolver first=key->{called[0]++;return key.equals(a)?information:null;};
    ClassHierarchyResolver second=key->{called[1]++;return information;};
    ClassHierarchyResolver chained=first.orElse(second);
    check(chained.getClassInfo(a)==information && chained.getClassInfo(b)==information &&
        called[0]==2 && called[1]==1,"Ordered resolver fallback"); finished();
    IllegalStateException original=new IllegalStateException("resolver callback");
    ClassHierarchyResolver failing=key->{throw original;};
    try { failing.orElse(second).getClassInfo(a); throw new AssertionError("Resolver exception swallowed"); }
    catch (IllegalStateException expected) { check(expected==original,"Resolver exception identity"); } finished();
    int[] queries={0}; ClassHierarchyResolver cached=(key->{queries[0]++;return key.equals(a)?information:null;});
    cached=cached.cached();
    check(cached.getClassInfo(a)==information && cached.getClassInfo(a)==information &&
        cached.getClassInfo(b)==null && cached.getClassInfo(b)==null && queries[0]==2,
        "Positive and negative cache"); finished();
    int[] factories={0}; Map<ClassDesc,ClassHierarchyInfo> backing=new ConcurrentHashMap<>();
    ClassHierarchyResolver missing=(key->null);
    ClassHierarchyResolver customCache=missing.cached(()->{factories[0]++;return backing;});
    check(customCache.getClassInfo(a)==null && customCache.getClassInfo(a)==null &&
        factories[0]==1 && backing.containsKey(a),"Caller cache including null-rejecting map"); finished();
    ClassDesc marker=ClassDesc.of(UninitializedMetadata.class.getName());
    ClassHierarchyResolver loading=ClassHierarchyResolver.ofClassLoading(ClassFileHierarchyRegression.class.getClassLoader());
    check(loading.getClassInfo(marker)!=null && initialized==0 &&
        loading.getClassInfo(d("Lmissing/NoClass;"))==null && loading.getClassInfo(d("[I"))==null,
        "Metadata class loading without initialization"); finished();
    ClassHierarchyResolver lookup=ClassHierarchyResolver.ofClassLoading(MethodHandles.lookup());
    check(lookup.getClassInfo(marker)!=null && initialized==0,"Lookup metadata without initialization"); finished();
    illegal(()->ClassHierarchyResolver.ofClassLoading(MethodHandles.publicLookup()).getClassInfo(
        ClassDesc.of("java.util.Collections$EmptyList")),"Lookup access check");
    check(ClassHierarchyResolver.defaultResolver()==ClassHierarchyResolver.defaultResolver() &&
        ClassHierarchyResolver.defaultResolver().getClassInfo(d("Ljava/lang/Integer;"))!=null,
        "Stable default metadata resolver"); finished();
    nullArgument(()->ClassHierarchyResolver.ofResourceParsing((ClassLoader)null),"Null resource loader");
    nullArgument(()->ClassHierarchyResolver.ofClassLoading((ClassLoader)null),"Null loading loader");
    nullArgument(()->ClassHierarchyResolver.ofClassLoading((MethodHandles.Lookup)null),"Null lookup");
    nullArgument(()->first.orElse(null),"Null fallback");
    nullArgument(()->ClassHierarchyResolver.of(null,parents),"Null interface collection"); finished();
  }

  private static void resources() {
    ClassFile api=ClassFile.of(); ClassDesc target=ClassDesc.of("ResourceMetadataTarget");
    byte[] bytes=api.build(target,b->b.withSuperclass(d("Ljava/lang/Number;")));
    int[] calls={0},closed={0};
    ClassHierarchyResolver resolver=ClassHierarchyResolver.ofResourceParsing(key->{
      calls[0]++;
      return key.equals(target)?new ByteArrayInputStream(bytes){public void close()throws IOException{closed[0]++;super.close();}}:null;
    });
    check(resolver.getClassInfo(target)!=null && resolver.getClassInfo(d("Lresource/Missing;"))==null &&
        calls[0]==2 && closed[0]==1,"Actual CP/header resource parser and stream close"); finished();
    check(ClassHierarchyResolver.ofResourceParsing(ClassFileHierarchyRegression.class.getClassLoader())
        .getClassInfo(ClassDesc.of(ClassFileHierarchyRegression.class.getName()))!=null,
        "Resource loader finds compiled class bytes"); finished();
    IOException original=new IOException("resource read");
    ClassHierarchyResolver broken=ClassHierarchyResolver.ofResourceParsing(key->new InputStream(){
      public int read()throws IOException{throw original;}
    });
    try { broken.getClassInfo(target);throw new AssertionError("Resource failure swallowed"); }
    catch(UncheckedIOException expected){check(expected.getCause()==original,"Resource failure identity");} finished();
  }

  private static byte[] select(ClassFile api,String left,String right,String returns,boolean local) {
    return api.build(ClassDesc.of("HierarchySelectTarget"),b->b.withMethodBody("test",
        MethodTypeDesc.of(d(returns),d(left),d(right),d("I")),ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC,c->{
          Label other=c.newLabel(),join=c.newLabel();
          c.iload(2).ifeq(other).aload(0);
          if(local)c.astore(3);
          c.goto_(join).labelBinding(other).aload(1);
          if(local)c.astore(3);
          c.labelBinding(join);
          if(local)c.aload(3);
          c.areturn();
        }));
  }
  private static void merge(String name,String left,String right,String expected,boolean local) {
    ClassFile api=ClassFile.of(); byte[] bytes=select(api,left,right,expected,local);
    ClassModel model=api.parse(bytes);check(api.verify(bytes).isEmpty()&&api.verify(model).isEmpty(),name+" verify");
    boolean seen=false;
    for(Attribute<?> attribute:model.methods().get(0).code().get().attributes())if(attribute instanceof StackMapTableAttribute)
      for(StackMapFrameInfo frame:((StackMapTableAttribute)attribute).entries()) {
        List<StackMapFrameInfo.VerificationTypeInfo> types=local?frame.locals():frame.stack();
        if(local && types.size()<4 || !local && types.isEmpty())continue;
        StackMapFrameInfo.VerificationTypeInfo item=types.get(local?3:0);
        check(item instanceof ObjectVerificationTypeInfo && expected.equals(
            ((ObjectVerificationTypeInfo)item).classSymbol().descriptorString()),name+" genuine merged verification type"); seen=true;
      }
    check(seen,name+" generated join frame");finished();
  }
  private static byte[] returnArgument(ClassFile api,String source,String target) {
    return api.withOptions(ClassFile.StackMapsOption.DROP_STACK_MAPS).build(ClassDesc.of("HierarchyReturnTarget"),
        b->b.withMethodBody("test",MethodTypeDesc.of(d(target),d(source)),ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC,
          c->c.aload(0).areturn()));
  }
  private static void outcome(ClassFile api,String name,byte[] bytes,boolean valid) {
    List<VerifyError> errors=api.verify(bytes);
    check(errors.isEmpty()==valid,name+" byte outcome");
    for(VerifyError error:errors)check(error.getClass()==VerifyError.class,name+" error type");
    check(api.verify(api.parse(bytes)).isEmpty()==valid,name+" model outcome");finished();
  }
  private static void assignment(String source,String target,boolean valid) {
    ClassFile api=ClassFile.of(); outcome(api,source+" -> "+target,returnArgument(api,source,target),valid);
  }

  private static void utf(DataOutputStream output,String text)throws IOException {output.writeByte(1);output.writeUTF(text);}
  private static byte[] declared(int joinType)throws IOException {
    ByteArrayOutputStream buffer=new ByteArrayOutputStream(); DataOutputStream output=new DataOutputStream(buffer);
    output.writeInt(0xcafebabe);output.writeShort(0);output.writeShort(69);output.writeShort(17);
    utf(output,"HierarchyDeclaredTarget");output.writeByte(7);output.writeShort(1);
    utf(output,"java/lang/Object");output.writeByte(7);output.writeShort(3);
    utf(output,"test");utf(output,"(Ljava/lang/Integer;Ljava/lang/Double;I)Ljava/lang/Number;");
    utf(output,"Code");utf(output,"StackMapTable");
    utf(output,"java/lang/Integer");output.writeByte(7);output.writeShort(9);
    utf(output,"java/lang/Double");output.writeByte(7);output.writeShort(11);
    utf(output,"java/lang/Number");output.writeByte(7);output.writeShort(13);
    utf(output,"java/lang/String");output.writeByte(7);output.writeShort(15);
    output.writeShort(0x21);output.writeShort(2);output.writeShort(4);output.writeShort(0);output.writeShort(0);output.writeShort(1);
    output.writeShort(9);output.writeShort(5);output.writeShort(6);output.writeShort(1);
    output.writeShort(7);output.writeInt(61);output.writeShort(1);output.writeShort(3);output.writeInt(10);
    output.write(new byte[]{0x1c,(byte)0x99,0,7,0x2a,(byte)0xa7,0,4,0x2b,(byte)0xb0});
    output.writeShort(0);output.writeShort(1);output.writeShort(8);output.writeInt(33);output.writeShort(2);
    for(int delta:new int[]{8,0}){
      output.writeByte(255);output.writeShort(delta);output.writeShort(3);
      output.writeByte(7);output.writeShort(10);output.writeByte(7);output.writeShort(12);output.writeByte(1);
      output.writeShort(delta==8?0:1);
      if(delta==0){output.writeByte(7);output.writeShort(joinType);}
    }
    output.writeShort(0);output.flush();return buffer.toByteArray();
  }

  public static void main(String[] arguments)throws Exception {
    boolean nativeMode=arguments.length!=0&&"native".equals(arguments[0]);
    factories();resources();
    merge("nearest-class-stack","Ljava/lang/Integer;","Ljava/lang/Double;","Ljava/lang/Number;",false);
    merge("nearest-class-local","Ljava/lang/Integer;","Ljava/lang/Double;","Ljava/lang/Number;",true);
    merge("parent-and-child","Ljava/lang/Number;","Ljava/lang/Integer;","Ljava/lang/Number;",false);
    merge("unrelated-classes","Ljava/lang/String;","Ljava/lang/Integer;","Ljava/lang/Object;",false);
    merge("interface-verification-join","Ljava/lang/String;","Ljava/lang/CharSequence;","Ljava/lang/Object;",false);
    merge("reference-array-covariance","[Ljava/lang/String;","[Ljava/lang/Integer;","[Ljava/lang/Object;",false);
    merge("primitive-array-join","[I","[J","Ljava/lang/Object;",false);
    merge("nested-primitive-array-join","[[I","[[J","[Ljava/lang/Object;",false);
    merge("mixed-array-dimensions","[[Ljava/lang/String;","[Ljava/lang/Object;","[Ljava/lang/Object;",false);
    assignment("Ljava/lang/Integer;","Ljava/lang/Number;",true);
    assignment("Ljava/lang/Number;","Ljava/lang/Integer;",false);
    assignment("Ljava/lang/Object;","Ljava/lang/CharSequence;",true);
    assignment("Ljava/lang/CharSequence;","Ljava/lang/String;",false);
    assignment("[I","Ljava/lang/Cloneable;",true);
    assignment("[I","Ljava/lang/CharSequence;",false);
    assignment("[Ljava/lang/String;","[Ljava/lang/Object;",true);
    assignment("[Ljava/lang/Object;","[Ljava/lang/String;",false);
    assignment("[[I","[Ljava/lang/Object;",true);
    assignment("[I","[J",false);
    assignment("Ljava/io/IOException;","Ljava/lang/Exception;",true);
    ClassFile api=ClassFile.of();
    outcome(api,"declared-nearest-parent",declared(14),true);
    outcome(api,"declared-unrelated-type",declared(16),false);
    outcome(api,"declared-Object-not-inferred-Number",declared(4),false);
    ClassHierarchyResolver none=ClassHierarchyResolver.of(new ArrayList<ClassDesc>(),new HashMap<ClassDesc,ClassDesc>());
    ClassFile missing=api.withOptions(ClassFile.ClassHierarchyResolverOption.of(none));
    outcome(missing,"missing-hierarchy-metadata",returnArgument(api,"Ljava/lang/Integer;","Ljava/lang/Number;"),false);
    illegal(()->select(missing,"Lmissing/A;","Lmissing/B;","Ljava/lang/Object;",false),"Generation must report missing hierarchy");
    if(!nativeMode){
      Map<ClassDesc,ClassDesc> cycle=new HashMap<>();cycle.put(d("Lcycle/A;"),d("Lcycle/B;"));cycle.put(d("Lcycle/B;"),d("Lcycle/A;"));
      cycle.put(d("Ljava/lang/String;"),d("Ljava/lang/Object;"));
      ClassFile cyclic=api.withOptions(ClassFile.ClassHierarchyResolverOption.of(ClassHierarchyResolver.of(new ArrayList<ClassDesc>(),cycle)));
      byte[] cyclicReturn=returnArgument(api,"Lcycle/A;","Ljava/lang/String;");
      outcome(cyclic,"cyclic-hierarchy-metadata",cyclicReturn,false);
      for(VerifyError error:cyclic.verify(cyclicReturn))
        check(error.getMessage().contains("Cyclic class hierarchy"),"Cycle verification must actually traverse the cycle");
      illegal(()->select(cyclic,"Lcycle/A;","Lcycle/B;","Ljava/lang/Object;",false),"Generation must reject cyclic superclass metadata");
    }
    check(initialized==0,"Metadata resolution initialized a class");
    check(completed==(nativeMode?39:41),"Incomplete hierarchy diagnostics: "+completed);
    System.out.println("CLASSFILE_HIERARCHY_REGRESSION_OK|"+completed);
  }
}
