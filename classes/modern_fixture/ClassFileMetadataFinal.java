package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.annotation.ElementType;
import java.util.List;
import static java.lang.constant.ConstantDescs.*;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.bytes;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;

/** Genuine record/local/sealed compiler metadata and owned module-info arrays. */
public final class ClassFileMetadataFinal {
  private static EnclosingMethodAttribute enclosing;
  private static ClassModel original(ClassFile api,String resource) throws Exception {return api.parse(bytes(ClassFileMetadataFinal.class,resource));}
  private static Object enclosing() {final class D4Local {public int value(){return 31;}}return new D4Local();}
  private static void copy(ClassBuilder b,ClassElement element) {b.with(element);}
  private static void rebuildRecord(ClassBuilder b,ClassElement element) {
    if(element instanceof RecordAttribute){
      var components=new java.util.ArrayList<RecordComponentInfo>();
      for(RecordComponentInfo info:((RecordAttribute)element).components())
        components.add(RecordComponentInfo.of(info.name().stringValue(),info.descriptorSymbol(),info.attributes()));
      b.with(RecordAttribute.of(components));
    }else b.with(element);
  }
  private static void buildEnclosing(ClassBuilder b) {b.withFlags(33).with(enclosing).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileMetadataFinal::codeThirtyOne);}
  private static void codeThirtyOne(CodeBuilder b) {b.bipush(31).ireturn();}
  private static void buildMarkers(ClassBuilder b) {
    b.withFlags(33).with(SyntheticAttribute.of()).with(DeprecatedAttribute.of()).with(SourceIDAttribute.of("source-d4")).with(CompilationIDAttribute.of("compiler-d4"));
    b.withField("number",CD_int,ClassFileMetadataFinal::fieldMarkers).withMethod("value",MethodTypeDesc.of(CD_int),9,ClassFileMetadataFinal::methodMarkers);
  }
  private static void fieldMarkers(FieldBuilder b) {b.withFlags(25).with(ConstantValueAttribute.of(b.constantPool().intEntry(3))).with(SyntheticAttribute.of()).with(DeprecatedAttribute.of());}
  private static void methodMarkers(MethodBuilder b) {b.with(SyntheticAttribute.of()).with(DeprecatedAttribute.of()).withCode(ClassFileMetadataFinal::codeFortyOne);}
  private static void codeFortyOne(CodeBuilder b) {b.bipush(41).ireturn();}
  private static ModuleAttribute module() {
    ConstantPoolBuilder p=ConstantPoolBuilder.of();ModuleEntry base=p.moduleEntry(p.utf8Entry("java.base")),dependency=p.moduleEntry(p.utf8Entry("d4.dependency")),friend=p.moduleEntry(p.utf8Entry("d4.friend"));
    PackageEntry api=p.packageEntry(p.utf8Entry("classes/modern_test")),internal=p.packageEntry(p.utf8Entry("classes/modern_test/internal"));
    ClassEntry service=p.classEntry(ClassDesc.of("java.lang.Runnable")),provider=p.classEntry(ClassDesc.of("java.lang.Thread"));
    return ModuleAttribute.of(p.moduleEntry(p.utf8Entry("d4.original")),0,p.utf8Entry("4.0"),
      List.of(ModuleRequireInfo.of(base,ClassFile.ACC_MANDATED,p.utf8Entry("25")),ModuleRequireInfo.of(dependency,ClassFile.ACC_TRANSITIVE,(Utf8Entry)null)),
      List.of(ModuleExportInfo.of(api,0,List.of(friend))),List.of(ModuleOpenInfo.of(internal,ClassFile.ACC_SYNTHETIC,List.of(friend))),
      List.of(service),List.of(ModuleProvideInfo.of(service,List.of(provider))));
  }
  private static void moduleExtras(ClassBuilder b) {
    ConstantPoolBuilder p=b.constantPool();b.with(ModulePackagesAttribute.of(p.packageEntry(p.utf8Entry("classes/modern_test")),p.packageEntry(p.utf8Entry("classes/modern_test/internal"))));
    b.with(ModuleMainClassAttribute.of(ClassDesc.of("classes.modern_test.ClassFileMetadataFinal"))).with(SourceFileAttribute.of("module-info.java"));
  }
  private static void caseRecordModel() throws Exception {
    ClassFile api=ClassFile.of();ClassModel model=original(api,"D4RecordModel.class");var components=model.findAttribute(Attributes.record()).get().components();
    check(components.size()==2&&components.get(0).name().equalsString("number")&&components.get(0).descriptorSymbol().equals(CD_int));
    check(components.get(1).name().equalsString("names")&&components.get(1).descriptorSymbol().equals(ClassDesc.of("java.util.List"))&&components.get(1).findAttribute(Attributes.signature()).get().asTypeSignature().signatureString().equals("Ljava/util/List<Ljava/lang/String;>;"));
    check(components.get(1).findAttribute(Attributes.runtimeVisibleAnnotations()).isPresent()&&components.get(1).findAttribute(Attributes.runtimeVisibleTypeAnnotations()).isPresent()&&api.verify(model).isEmpty());
    emit("cf-meta-record-model","original-javac25-record=unchanged;RecordComponentInfo=number:I/names:List<String>;nested-signature/declaration/type-annotations=typed;verify(model)=empty;generated-bytes=none");
  }
  private static void caseRecordAccessor() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);byte[] output=api.transformClass(original(api,"D4RecordExecutable.class"),ClassFileMetadataFinal::copy);
    check(api.parse(output).findAttribute(Attributes.record()).get().components().size()==1&&api.verify(output).isEmpty());
    artifact("cf-meta-record-accessor","meta-record-accessor",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle constructor=lookup.findConstructor(generated,MethodType.methodType(void.class,int.class)),accessor=lookup.findVirtual(generated,"number",MethodType.methodType(int.class));Object record=constructor.invoke(37);check((int)accessor.invoke(record)==37);
    emit("cf-meta-record-accessor","genuine-record-NEW_POOL=owned-output;self-owner=original-binary-name;constructor/accessor=37;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseRecordComponents() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);byte[] output=api.transformClass(original(api,"D4RecordAnnotated.class"),ClassFileMetadataFinal::rebuildRecord);
    var info=api.parse(output).findAttribute(Attributes.record()).get().components().get(0);check(info.name().equalsString("names")&&info.descriptorSymbol().equals(ClassDesc.of("java.util.List")));
    check(info.findAttribute(Attributes.signature()).get().asTypeSignature().signatureString().equals("Ljava/util/List<Ljava/lang/String;>;")&&info.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().size()==1&&info.findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations().size()==1&&api.verify(output).isEmpty());
    artifact("cf-meta-record-components","meta-record-components",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle constructor=lookup.findConstructor(generated,MethodType.methodType(void.class,List.class)),accessor=lookup.findVirtual(generated,"names",MethodType.methodType(List.class));List<String> held=List.of("component");Object record=constructor.invoke(held);check((List<?>)accessor.invoke(record)==held);
    emit("cf-meta-record-components","RecordComponentInfo.of=rebuilt-name/descriptor/nested-attributes;NEW_POOL=actual-UTF/annotation/signature-import;accessor=held-List;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseSealed() throws Exception {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);byte[] output=api.transformClass(original(api,"D4SealedBase.class"),ClassFileMetadataFinal::copy);
    var permitted=api.parse(output).findAttribute(Attributes.permittedSubclasses()).get().permittedSubclasses();check(permitted.size()==1&&permitted.get(0).asSymbol().equals(ClassDesc.of("classes.modern_test.D4SealedLeaf"))&&api.verify(output).isEmpty());
    artifact("cf-meta-sealed-metadata","meta-sealed",output);
    emit("cf-meta-sealed-metadata","genuine-PermittedSubclasses=typed-D4SealedLeaf;NEW_POOL=actual-Class-import;verify=empty;metadata-only/neverdefine;native-sealing-reflection=separate-axis");
  }
  private static void caseEnclosing() throws Throwable {
    ClassFile api=ClassFile.of();ClassModel local=original(api,"ClassFileMetadataFinal$1D4Local.class");enclosing=local.findAttribute(Attributes.enclosingMethod()).get();
    check(enclosing.enclosingClass().asSymbol().equals(ClassDesc.of("classes.modern_test.ClassFileMetadataFinal"))&&enclosing.enclosingMethodName().get().equalsString("enclosing")&&enclosing.enclosingMethodTypeSymbol().get().descriptorString().equals("()Ljava/lang/Object;"));
    byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dEnclosingMetadata"),ClassFileMetadataFinal::buildEnclosing);check(api.parse(output).findAttribute(Attributes.enclosingMethod()).get().enclosingMethodName().get().equalsString("enclosing")&&api.verify(output).isEmpty());
    artifact("cf-meta-enclosing-method","meta-enclosing",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==31);
    emit("cf-meta-enclosing-method","genuine-local-class-EnclosingMethod=owner/name/type;public-build=actual-CP-import;value=31;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseMarkers() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dMetadataMarkers"),ClassFileMetadataFinal::buildMarkers);ClassModel model=api.parse(output);
    check(model.findAttribute(Attributes.synthetic()).isPresent()&&model.findAttribute(Attributes.deprecated()).isPresent()&&model.findAttribute(Attributes.sourceId()).get().sourceId().equalsString("source-d4")&&model.findAttribute(Attributes.compilationId()).get().compilationId().equalsString("compiler-d4"));
    check(model.fields().get(0).findAttribute(Attributes.synthetic()).isPresent()&&model.methods().get(0).findAttribute(Attributes.deprecated()).isPresent()&&api.verify(output).isEmpty());
    artifact("cf-meta-markers","meta-markers",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==41);
    emit("cf-meta-markers","Synthetic/Deprecated=class/field/method;SourceID/CompilationID=typed-UTF;value=41;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseModuleVectors() {
    ClassFile api=ClassFile.of();byte[] output=api.buildModule(module());ClassModel model=api.parse(output);ModuleAttribute attribute=model.findAttribute(Attributes.module()).get();
    check(model.flags().flagsMask()==ClassFile.ACC_MODULE&&model.superclass().isEmpty()&&model.methods().isEmpty()&&model.fields().isEmpty());
    check(attribute.moduleName().name().equalsString("d4.original")&&attribute.moduleVersion().get().equalsString("4.0")&&attribute.requires().size()==2&&attribute.exports().size()==1&&attribute.opens().size()==1&&attribute.uses().size()==1&&attribute.provides().size()==1&&api.verify(output).isEmpty());
    artifact("cf-meta-module-vectors","meta-module-vectors",output);
    emit("cf-meta-module-vectors","buildModule=module-info/ACC_MODULE/no-super/no-members;Module=version/requires/exports/opens/uses/provides;typed-CP-tags=19/20;verify=empty;metadata-only/neverdefine");
  }
  private static void caseModuleExtras() {
    ClassFile api=ClassFile.of();byte[] output=api.buildModule(module(),ClassFileMetadataFinal::moduleExtras);ClassModel model=api.parse(output);
    check(model.findAttribute(Attributes.modulePackages()).get().packages().size()==2&&model.findAttribute(Attributes.moduleMainClass()).get().mainClass().asSymbol().equals(ClassDesc.of("classes.modern_test.ClassFileMetadataFinal"))&&model.findAttribute(Attributes.sourceFile()).get().sourceFile().equalsString("module-info.java")&&api.verify(output).isEmpty());
    artifact("cf-meta-module-extras","meta-module-extras",output);
    emit("cf-meta-module-extras","buildModule+builder=ModulePackages/ModuleMainClass/SourceFile;package/Class/UTF-import=real;verify=empty;metadata-only/neverdefine;named-module-runtime=not-claimed");
  }
  public static void main(String[] args) throws Throwable {caseRecordModel();caseRecordAccessor();caseRecordComponents();caseSealed();caseEnclosing();caseMarkers();caseModuleVectors();caseModuleExtras();System.out.println("CLASSFILE_METADATA_OK");}
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.RECORD_COMPONENT)
@interface D4RecordVisible {int value();}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE_USE)
@interface D4RecordTypeVisible {int value();}

record D4RecordModel(@D4RecordVisible(11) int number,@D4RecordVisible(12) List<@D4RecordTypeVisible(13) String> names) {}
record D4RecordExecutable(int number) {}
record D4RecordAnnotated(@D4RecordVisible(21) List<@D4RecordTypeVisible(22) String> names) {}
sealed class D4SealedBase permits D4SealedLeaf {public int value(){return 23;}}
final class D4SealedLeaf extends D4SealedBase {}

