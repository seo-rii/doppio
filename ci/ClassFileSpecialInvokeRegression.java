package classes.modern_test;

import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassModel;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static java.lang.constant.ConstantDescs.*;

/** Bounded public verifier/generator profile, with no target class definition. */
public final class ClassFileSpecialInvokeRegression {
  private static int completed;
  private static boolean nativeMode;
  private static final ClassDesc OWNER=ClassDesc.of("classes.modern_test.SpecialRegressionTarget"),
    PARENT=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeRegression$Parent"),
    GRANDPARENT=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeRegression$Grandparent"),
    BASE_API=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeRegression$BaseApi"),
    CHILD_API=ClassDesc.of("classes.modern_test.ClassFileSpecialInvokeRegression$ChildApi");
  public static class Grandparent {public int grandValue(){return 31;}}
  public static class Parent extends Grandparent {public int parentValue(){return 23;}}
  public interface BaseApi {default int defaultValue(){return 41;}}
  public interface ChildApi extends BaseApi {}
  private static void check(boolean valid,String message) {if(!valid)throw new AssertionError(message);}
  private static ClassFile api(ClassDesc owner,ClassDesc parent,boolean generate,boolean isInterface) {
    Map<ClassDesc,ClassDesc> parents=new HashMap<>();parents.put(owner,parent);
    parents.put(PARENT,GRANDPARENT);parents.put(GRANDPARENT,CD_Object);
    ClassHierarchyResolver resolver=ClassHierarchyResolver.of(isInterface?List.of(owner,BASE_API,CHILD_API):List.of(BASE_API,CHILD_API),parents)
      .orElse(ClassHierarchyResolver.defaultResolver());
    return ClassFile.of(generate?ClassFile.StackMapsOption.GENERATE_STACK_MAPS:ClassFile.StackMapsOption.DROP_STACK_MAPS,
      ClassFile.ClassHierarchyResolverOption.of(resolver));
  }
  private static byte[] target(ClassFile api,ClassDesc owner,ClassDesc parent,ClassDesc directInterface,
      ClassDesc reference,ClassDesc receiver,boolean interfaceReference,int major,int source,boolean selfInterface) {
    return api.build(owner,b->{
      b.withFlags(selfInterface?ClassFile.ACC_PUBLIC|ClassFile.ACC_INTERFACE|ClassFile.ACC_ABSTRACT:ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER)
        .withSuperclass(parent).withVersion(major,0);
      if(directInterface!=null)b.withInterfaceSymbols(directInterface);
      b.withMethodBody("run",MethodTypeDesc.of(CD_int,receiver),ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC,c->{
        if(source==1)c.aconst_null();else if(source==2)c.new_(owner);else c.aload(0);
        c.invokespecial(reference,"value",MethodTypeDesc.of(CD_int),interfaceReference).ireturn();
      });
    });
  }
  private static void outcome(String name,ClassFile api,byte[] bytes,boolean valid) {
    List<VerifyError> byteErrors=api.verify(bytes),modelErrors=api.verify(api.parse(bytes));
    check(byteErrors.isEmpty()==valid,name+" byte verification");check(modelErrors.isEmpty()==valid,name+" model verification");
    for(VerifyError error:byteErrors)check(error.getClass()==VerifyError.class,name+" error class");
    for(VerifyError error:modelErrors)check(error.getClass()==VerifyError.class,name+" model error class");
    if(nativeMode) {
      System.out.println("PROFILE|"+name+"|bytes="+byteErrors.size()+"|model="+modelErrors.size()+"|major="+api.parse(bytes).majorVersion());
      for(VerifyError error:byteErrors)System.out.println("ERROR|"+name+"|"+error.getMessage().replace('\n',' ').replace('\r',' '));
    }
    completed++;
  }
  private static void test(String name,ClassDesc parent,ClassDesc directInterface,ClassDesc reference,
      ClassDesc receiver,boolean interfaceReference,int major,int source,boolean valid) {
    ClassFile api=api(OWNER,parent,false,false);outcome(name,api,target(api,OWNER,parent,directInterface,reference,receiver,interfaceReference,major,source,false),valid);
  }
  public static void main(String[] args) {
    nativeMode=args.length!=0&&"native".equals(args[0]);
    test("current-owner",CD_Object,null,OWNER,OWNER,false,69,0,true);
    test("direct-super",PARENT,null,PARENT,OWNER,false,69,0,true);
    test("class-ancestor",PARENT,null,GRANDPARENT,OWNER,false,69,0,true);
    test("direct-interface",CD_Object,BASE_API,BASE_API,OWNER,true,69,0,true);
    test("indirect-interface",CD_Object,CHILD_API,BASE_API,OWNER,true,69,0,false);
    test("unrelated-owner",CD_Object,null,CD_String,CD_String,false,69,0,false);
    test("wrong-current-receiver",PARENT,null,PARENT,PARENT,false,69,0,false);
    test("interface-major51",CD_Object,BASE_API,BASE_API,OWNER,true,51,0,false);
    test("interface-major52",CD_Object,BASE_API,BASE_API,OWNER,true,52,0,true);
    test("null-current-receiver",PARENT,null,PARENT,OWNER,false,69,1,true);
    test("uninitialized-current-receiver",CD_Object,null,OWNER,OWNER,false,69,2,false);
    ClassFile sameInterface=api(BASE_API,CD_Object,false,true);
    outcome("current-interface",sameInterface,target(sameInterface,BASE_API,CD_Object,null,BASE_API,BASE_API,true,53,0,true),true);
    ClassFile generatedOwner=api(OWNER,CD_Object,true,false);
    outcome("generated-unrelated-owner",generatedOwner,target(generatedOwner,OWNER,CD_Object,null,CD_String,CD_String,false,69,0,false),false);
    ClassFile generatedReceiver=api(OWNER,PARENT,true,false);
    outcome("generated-wrong-current-receiver",generatedReceiver,target(generatedReceiver,OWNER,PARENT,null,PARENT,PARENT,false,69,0,false),false);
    System.out.println("CLASSFILE_SPECIAL_INVOKE_REGRESSION_OK|"+completed);
  }
}
