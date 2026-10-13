package classes.modern_test;
import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.List;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;
import static java.lang.classfile.attribute.StackMapFrameInfo.SimpleVerificationTypeInfo.*;

/** Custom mapper retained-owner lifecycle and truly user-supplied native stack maps. */
public final class ClassFileDebugLifecycleFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ProbeMapper MAPPER=new ProbeMapper();
  private static IllegalStateException readFailure;
  private static IllegalArgumentException writeFailure;
  private static AttributeMapper<?> mapper(Utf8Entry name) {return name.equalsString(MAPPER.name())?MAPPER:null;}
  private static ClassFile customApi() {return ClassFile.of(ClassFile.AttributeMapperOption.of(ClassFileDebugLifecycleFinal::mapper));}
  private static void flags(ClassBuilder b) {b.withFlags(33);}
  private static void buildScopes(ClassBuilder b) {flags(b);b.with(new ProbeAttribute(41,b.constantPool().stringEntry("class")));b.withField("number",CD_int,ClassFileDebugLifecycleFinal::fieldScope);b.withMethod("value",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileDebugLifecycleFinal::methodScope);}
  private static void fieldScope(FieldBuilder b) {b.withFlags(PUBLIC_STATIC|ClassFile.ACC_FINAL).with(ConstantValueAttribute.of(b.constantPool().intEntry(3))).with(new ProbeAttribute(42,b.constantPool().stringEntry("field")));}
  private static void methodScope(MethodBuilder b) {b.with(new ProbeAttribute(43,b.constantPool().stringEntry("method"))).withCode(ClassFileDebugLifecycleFinal::codeScope);}
  private static void codeScope(CodeBuilder b) {b.with(new ProbeAttribute(44,b.constantPool().stringEntry("code"))).bipush(17).ireturn();}
  private static void buildOne(ClassBuilder b) {flags(b);b.with(new ProbeAttribute(51,b.constantPool().stringEntry("single"))).withMethodBody("value",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileDebugLifecycleFinal::codeValue);}
  private static void codeValue(CodeBuilder b) {b.bipush(17).ireturn();}
  private static void copy(ClassBuilder b,ClassElement element) {b.with(element);}
  private static ProbeAttribute ownerAttribute(AttributedElement owner) {ProbeAttribute attr=owner.findAttribute(MAPPER).get();check(attr.enclosing==owner && owner.attributes().contains(attr) && attr.reader!=null && attr.reader.readEntry(attr.offset-6,Utf8Entry.class).equalsString(MAPPER.name()) && attr.reader.readInt(attr.offset-4)==6);return attr;}
  private static void buildManualBranch(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,ClassFileDebugLifecycleFinal::codeManualBranch);}
  private static void codeManualBranch(CodeBuilder b) {Label other=b.newLabel();b.iload(0).ifeq(other).iconst_1().ireturn().labelBinding(other).iconst_2().ireturn().with(StackMapTableAttribute.of(List.of(StackMapFrameInfo.of(other,List.of(INTEGER),List.of()))));}
  private static void buildManualWide(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_long,CD_int,CD_long,CD_long),PUBLIC_STATIC,ClassFileDebugLifecycleFinal::codeManualWide);}
  private static void codeManualWide(CodeBuilder b) {Label other=b.newLabel(),join=b.newLabel();b.iload(0).ifeq(other).lload(1).goto_(join).labelBinding(other).lload(3).labelBinding(join).lreturn().with(StackMapTableAttribute.of(List.of(StackMapFrameInfo.of(other,List.of(INTEGER,LONG,LONG),List.of()),StackMapFrameInfo.of(join,List.of(INTEGER,LONG,LONG),List.of(LONG)))));}
  private static void buildManualDead(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileDebugLifecycleFinal::codeManualDead);}
  private static void codeManualDead(CodeBuilder b) {Label dead=b.newLabel();b.bipush(7).ireturn().labelBinding(dead).iconst_3().ireturn().with(StackMapTableAttribute.of(List.of(StackMapFrameInfo.of(dead,List.of(),List.of()))));}
  private static void buildManualInvalid(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),PUBLIC_STATIC,ClassFileDebugLifecycleFinal::codeManualInvalid);}
  private static void codeManualInvalid(CodeBuilder b) {Label other=b.newLabel();b.iload(0).ifeq(other).iconst_1().ireturn().labelBinding(other).iconst_2().ireturn().with(StackMapTableAttribute.of(List.of(StackMapFrameInfo.of(other,List.of(FLOAT),List.of()))));}
  private static void caseDeferred() throws Throwable {
    ClassFile api=customApi();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dDeferredOwners"),ClassFileDebugLifecycleFinal::buildScopes);ClassModel model=api.parse(bytes);
    ProbeAttribute first=ownerAttribute(model),second=ownerAttribute(model.fields().get(0)),third=ownerAttribute(model.methods().get(0)),fourth=ownerAttribute(model.methods().get(0).code().get());
    check(first.value+second.value+third.value+fourth.value==170 && first.reference.stringValue().equals("class") && fourth.reference.stringValue().equals("code") && first.reader.flags()==33 && ClassFile.of().verify(bytes).isEmpty());
    artifact("cf-lifecycle-deferred-owner","lifecycle-owner",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-lifecycle-deferred-owner","mapper=Class/Field/Method/Code;owner-attribute-access=only-after-parse;header/name/absolute-payload-offset=valid;sum=170;value=17;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseFresh() throws Throwable {
    ClassFile api=customApi().withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL);ClassModel source=api.parse(customApi().build(ClassDesc.of("classes.modern_test.C7dLifecycleSource"),ClassFileDebugLifecycleFinal::buildScopes));
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7dLifecycleFresh"),ClassFileDebugLifecycleFinal::copy);ClassModel model=api.parse(bytes);check(ownerAttribute(model).reference.stringValue().equals("class")&&ownerAttribute(model.methods().get(0).code().get()).reference.stringValue().equals("code")&&ClassFile.of().verify(bytes).isEmpty());
    artifact("cf-lifecycle-fresh-reference","lifecycle-fresh",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-lifecycle-fresh-reference","custom-CP_REFS=all4scopes;NEW_POOL=semantic-index-import;returned-owner=complete;value=17;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseReadFailure() {
    ClassFile api=customApi();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dReadFailure"),ClassFileDebugLifecycleFinal::buildOne);IllegalStateException expected=new IllegalStateException("read-identity");readFailure=expected;boolean caught=false;
    try {api.parse(bytes).findAttribute(MAPPER);} catch(IllegalStateException actual) {caught=actual==expected;} finally {readFailure=null;}check(caught);
    emit("cf-lifecycle-read-exception","readAttribute=original-IllegalStateException-identity;no-wrapping;generated-bytes=not-transported;never-defined");
  }
  private static void caseWriteFailure() {
    ClassFile api=customApi();IllegalArgumentException expected=new IllegalArgumentException("write-identity");writeFailure=expected;boolean caught=false;
    try {api.build(ClassDesc.of("classes.modern_test.C7dWriteFailure"),ClassFileDebugLifecycleFinal::buildOne);} catch(IllegalArgumentException actual) {caught=actual==expected;} finally {writeFailure=null;}check(caught);
    emit("cf-lifecycle-write-exception","writeAttribute=original-IllegalArgumentException-identity;no-wrapping;no-returned-array;never-defined");
  }
  private static void caseManualBranch() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dManualBranch"),ClassFileDebugLifecycleFinal::buildManualBranch);check(api.parse(bytes).methods().get(0).code().get().findAttribute(Attributes.stackMapTable()).get().entries().size()==1&&api.verify(bytes).isEmpty());
    artifact("cf-lifecycle-manual-branch","manual-branch",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(1)==1&&(int)handle.invokeExact(0)==2);
    emit("cf-lifecycle-manual-branch","DROP_STACK_MAPS+user-table=1-frame;locals=INTEGER;branches=1/2;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseManualWide() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dManualWide"),ClassFileDebugLifecycleFinal::buildManualWide);var frames=api.parse(bytes).methods().get(0).code().get().findAttribute(Attributes.stackMapTable()).get().entries();check(frames.size()==2&&frames.get(0).locals().size()==3&&frames.get(1).stack().get(0).tag()==4&&api.verify(bytes).isEmpty());
    artifact("cf-lifecycle-manual-wide","manual-wide",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(long.class,int.class,long.class,long.class));check((long)handle.invokeExact(1,9L,11L)==9L&&(long)handle.invokeExact(0,9L,11L)==11L);
    emit("cf-lifecycle-manual-wide","DROP_STACK_MAPS+user-table=2-frames;logical-locals=INTEGER/LONG/LONG;J-stack=LONG;branches=9/11;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseManualDead() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.DeadCodeOption.KEEP_DEAD_CODE,ClassFile.StackMapsOption.DROP_STACK_MAPS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dManualDead"),ClassFileDebugLifecycleFinal::buildManualDead);check(api.parse(bytes).methods().get(0).code().get().findAttribute(Attributes.stackMapTable()).get().entries().size()==1&&api.verify(bytes).isEmpty());
    artifact("cf-lifecycle-manual-dead","manual-dead",bytes);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==7);
    emit("cf-lifecycle-manual-dead","KEEP_DEAD_CODE/DROP_STACK_MAPS+user-dead-entry-frame=valid;unreachable-ICONST3/IRETURN=not-patched;value=7;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseManualInvalid() {
    ClassFile api=ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dManualInvalid"),ClassFileDebugLifecycleFinal::buildManualInvalid);check(!api.verify(bytes).isEmpty()&&!api.verify(api.parse(bytes)).isEmpty());
    artifact("cf-lifecycle-manual-invalid","manual-invalid",bytes);emit("cf-lifecycle-manual-invalid","user-frame=FLOAT-vs-INTEGER-local;verify(bytes/model)=nonempty;invalid-output-never-defined");
  }
  public static void main(String[] args) throws Throwable {caseDeferred();caseFresh();caseReadFailure();caseWriteFailure();caseManualBranch();caseManualWide();caseManualDead();caseManualInvalid();System.out.println("CLASSFILE_DEBUG_LIFECYCLE_OK");}
  static final class ProbeAttribute extends CustomAttribute<ProbeAttribute> {
    final int value;final StringEntry reference;AttributedElement enclosing;ClassReader reader;int offset;
    ProbeAttribute(int value,StringEntry reference) {super(MAPPER);this.value=value;this.reference=reference;}
  }
  static final class ProbeMapper implements AttributeMapper<ProbeAttribute> {
    public String name(){return "D3Lifecycle";}
    public AttributeStability stability(){return AttributeStability.CP_REFS;}
    public ProbeAttribute readAttribute(AttributedElement owner,ClassReader reader,int offset) {
      if(readFailure!=null)throw readFailure;ProbeAttribute attr=new ProbeAttribute(reader.readInt(offset),reader.readEntry(offset+4,StringEntry.class));attr.enclosing=owner;attr.reader=reader;attr.offset=offset;return attr;
    }
    public void writeAttribute(BufWriter buf,ProbeAttribute attr) {
      if(writeFailure!=null)throw writeFailure;buf.writeIndex(attr.attributeName());buf.writeInt(6);buf.writeInt(attr.value);buf.writeIndex(attr.reference);
    }
  }
}
