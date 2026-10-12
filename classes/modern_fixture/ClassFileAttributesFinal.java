package classes.modern_test;

import java.lang.classfile.AttributeMapper;
import java.lang.classfile.AttributedElement;
import java.lang.classfile.BufWriter;
import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassReader;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CustomAttribute;
import java.lang.classfile.FieldBuilder;
import java.lang.classfile.MethodBuilder;
import java.lang.classfile.attribute.ConstantValueAttribute;
import java.lang.classfile.attribute.ExceptionsAttribute;
import java.lang.classfile.attribute.NestHostAttribute;
import java.lang.classfile.attribute.NestMembersAttribute;
import java.lang.classfile.attribute.SignatureAttribute;
import java.lang.classfile.attribute.UnknownAttribute;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.StringEntry;
import java.lang.classfile.constantpool.Utf8Entry;
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
import static java.lang.constant.ConstantDescs.CD_double;
import static java.lang.constant.ConstantDescs.CD_float;
import static java.lang.constant.ConstantDescs.CD_int;
import static java.lang.constant.ConstantDescs.CD_long;

/** Unchanged javac25 sources: typed metadata and actual user attribute codecs. */
public final class ClassFileAttributesFinal {
  private static final int STATIC_PUBLIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final int CONSTANT_FLAGS=STATIC_PUBLIC|ClassFile.ACC_FINAL;
  private static final ProbeMapper STATELESS=new ProbeMapper("C7cStateless",AttributeMapper.AttributeStability.STATELESS,false,false);
  private static final ProbeMapper CP_REFS=new ProbeMapper("C7cReference",AttributeMapper.AttributeStability.CP_REFS,true,false);
  private static final ProbeMapper UNSTABLE=new ProbeMapper("C7cUnstable",AttributeMapper.AttributeStability.UNSTABLE,false,false);

  public static final class ProbeAttribute extends CustomAttribute<ProbeAttribute> {
    final int value;
    final StringEntry reference;
    ProbeAttribute(ProbeMapper mapper,int value,StringEntry reference) {super(mapper);this.value=value;this.reference=reference;}
  }
  public static final class ProbeMapper implements AttributeMapper<ProbeAttribute> {
    final String name;
    final AttributeStability stability;
    final boolean reference,multiple;
    ProbeMapper(String name,AttributeStability stability,boolean reference,boolean multiple) {
      this.name=name;this.stability=stability;this.reference=reference;this.multiple=multiple;
    }
    public String name() {return name;}
    public AttributeStability stability() {return stability;}
    public boolean allowMultiple() {return multiple;}
    public ProbeAttribute readAttribute(AttributedElement parent,ClassReader reader,int position) {
      check(reader.classfileLength()>position+3 && reader.readInt(position-4)==(reference?6:4));
      int value=reader.readInt(position);
      if(reference) return new ProbeAttribute(this,value,reader.readEntry(position+4,StringEntry.class));
      byte[] copied=reader.readBytes(position,4);check(copied.length==4);
      check(reader.readU1(position)==0 && reader.readS1(position)==0 && reader.readU2(position)==0 && reader.readS2(position)==0);
      return new ProbeAttribute(this,value,null);
    }
    public void writeAttribute(BufWriter writer,ProbeAttribute attribute) {
      writer.reserveSpace(12);
      writer.writeIndex(writer.constantPool().utf8Entry(name));
      int lengthPosition=writer.size();writer.writeInt(0);int payload=writer.size();
      writer.writeInt(attribute.value);
      if(reference) writer.writeIndex(attribute.reference);
      writer.patchInt(lengthPosition,4,writer.size()-payload);
    }
  }
  private static AttributeMapper<?> mapper(Utf8Entry name) {
    if(name.equalsString(STATELESS.name())) return STATELESS;
    if(name.equalsString(CP_REFS.name())) return CP_REFS;
    if(name.equalsString(UNSTABLE.name())) return UNSTABLE;
    return null;
  }
  private static ClassFile mappedApi() {return ClassFile.of(ClassFile.AttributeMapperOption.of(ClassFileAttributesFinal::mapper));}
  private static void codeValue(CodeBuilder b) {b.bipush(17).ireturn();}
  private static void methodValue(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);
    b.withMethodBody("value",MethodTypeDesc.of(CD_int),STATIC_PUBLIC,ClassFileAttributesFinal::codeValue);
  }
  private static void fieldInt(FieldBuilder b) {b.withFlags(CONSTANT_FLAGS).with(ConstantValueAttribute.of(Integer.valueOf(42)));}
  private static void fieldLong(FieldBuilder b) {b.withFlags(CONSTANT_FLAGS).with(ConstantValueAttribute.of(Long.valueOf(9000000000L)));}
  private static void fieldFloat(FieldBuilder b) {b.withFlags(CONSTANT_FLAGS).with(ConstantValueAttribute.of(Float.valueOf(1.25f)));}
  private static void fieldDouble(FieldBuilder b) {b.withFlags(CONSTANT_FLAGS).with(ConstantValueAttribute.of(Double.valueOf(2.5d)));}
  private static void fieldString(FieldBuilder b) {b.withFlags(CONSTANT_FLAGS).with(ConstantValueAttribute.of("C7c"));}
  private static void buildConstants(ClassBuilder b) {
    methodValue(b);
    b.withField("I",CD_int,ClassFileAttributesFinal::fieldInt);
    b.withField("J",CD_long,ClassFileAttributesFinal::fieldLong);
    b.withField("F",CD_float,ClassFileAttributesFinal::fieldFloat);
    b.withField("D",CD_double,ClassFileAttributesFinal::fieldDouble);
    b.withField("S",CD_String,ClassFileAttributesFinal::fieldString);
  }
  private static void fieldSignature(FieldBuilder b) {
    b.withFlags(STATIC_PUBLIC).with(SignatureAttribute.of(ConstantPoolBuilder.of().utf8Entry("Ljava/util/List<TT;>;")));
  }
  private static void codeIdentity(CodeBuilder b) {b.aload(0).areturn();}
  private static void methodSignature(MethodBuilder b) {
    b.with(SignatureAttribute.of(ConstantPoolBuilder.of().utf8Entry("<U:Ljava/lang/Object;>(TU;)TU;")));
    b.withCode(ClassFileAttributesFinal::codeIdentity);
  }
  private static void buildSignatures(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);
    b.with(SignatureAttribute.of(b.constantPool().utf8Entry("<T:Ljava/lang/Object;>Ljava/lang/Object;")));
    b.withField("items",ClassDesc.of("java.util.List"),ClassFileAttributesFinal::fieldSignature);
    b.withMethod("identity",MethodTypeDesc.of(CD_Object,CD_Object),STATIC_PUBLIC,ClassFileAttributesFinal::methodSignature);
  }
  private static void methodExceptions(MethodBuilder b) {
    b.with(ExceptionsAttribute.ofSymbols(ClassDesc.of("java.io.IOException"),ClassDesc.of("java.lang.ReflectiveOperationException")));
    b.withCode(ClassFileAttributesFinal::codeValue);
  }
  private static void buildExceptions(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);
    b.withMethod("value",MethodTypeDesc.of(CD_int),STATIC_PUBLIC,ClassFileAttributesFinal::methodExceptions);
  }
  private static void buildNestHost(ClassBuilder b) {
    methodValue(b);b.with(NestHostAttribute.of(ClassDesc.of("classes.modern_test.C7cExternalHost")));
  }
  private static void buildNestMembers(ClassBuilder b) {
    methodValue(b);b.with(NestMembersAttribute.ofSymbols(ClassDesc.of("classes.modern_test.C7cMemberA"),ClassDesc.of("classes.modern_test.C7cMemberB")));
  }
  private static void buildStateless(ClassBuilder b) {methodValue(b);b.with(new ProbeAttribute(STATELESS,37,null));}
  private static void buildReference(ClassBuilder b) {
    methodValue(b);b.with(new ProbeAttribute(CP_REFS,53,ConstantPoolBuilder.of().stringEntry("attribute-reference")));
  }
  private static void buildProcessingSource(ClassBuilder b) {
    methodValue(b);b.with(new ProbeAttribute(STATELESS,7,null));b.with(new ProbeAttribute(UNSTABLE,11,null));
  }
  private static ClassModel processingSource() {
    return ClassFile.of().parse(mappedApi().build(ClassDesc.of("classes.modern_test.C7cProcessingSource"),ClassFileAttributesFinal::buildProcessingSource));
  }
  private static void copyElement(ClassBuilder b,java.lang.classfile.ClassElement element) {b.with(element);}

  private static void caseConstantValues() throws Throwable {
    ClassFile api=ClassFile.of();
    byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cConstants"),ClassFileAttributesFinal::buildConstants);
    ClassModel model=api.parse(bytes);check(model.fields().size()==5);
    Object[] expected={Integer.valueOf(42),Long.valueOf(9000000000L),Float.valueOf(1.25f),Double.valueOf(2.5d),"C7c"};
    for(int n=0;n<5;n++) check(expected[n].equals(model.fields().get(n).findAttribute(java.lang.classfile.Attributes.constantValue()).get().constant().constantValue()));
    check(api.verify(bytes).isEmpty());artifact("cf-attributes-constant-values","attributes-constants",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-attributes-constant-values","ConstantValue=I:42/J:9000000000/F:1.25/D:2.5/String:C7c;typed=5;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseSignatures() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cSignatures"),ClassFileAttributesFinal::buildSignatures);
    ClassModel model=api.parse(bytes);
    check(model.findAttribute(java.lang.classfile.Attributes.signature()).get().signature().equalsString("<T:Ljava/lang/Object;>Ljava/lang/Object;"));
    check(model.fields().get(0).findAttribute(java.lang.classfile.Attributes.signature()).get().signature().equalsString("Ljava/util/List<TT;>;"));
    check(model.methods().get(0).findAttribute(java.lang.classfile.Attributes.signature()).get().signature().equalsString("<U:Ljava/lang/Object;>(TU;)TU;"));
    check(api.verify(bytes).isEmpty());artifact("cf-attributes-signatures","attributes-signatures",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);Object value=new Object();
    MethodHandle handle=lookup.findStatic(generated,"identity",MethodType.methodType(Object.class,Object.class));check((Object)handle.invokeExact(value)==value);
    emit("cf-attributes-signatures","Signature=class/field/method;Utf8=exact;signature-tree=unclaimed;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseExceptions() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cExceptions"),ClassFileAttributesFinal::buildExceptions);
    var exceptions=api.parse(bytes).methods().get(0).findAttribute(java.lang.classfile.Attributes.exceptions()).get().exceptions();
    check(exceptions.size()==2 && exceptions.get(0).asSymbol().equals(ClassDesc.of("java.io.IOException")) && exceptions.get(1).asSymbol().equals(ClassDesc.of("java.lang.ReflectiveOperationException")));
    check(api.verify(bytes).isEmpty());artifact("cf-attributes-exceptions","attributes-exceptions",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-attributes-exceptions","Exceptions=IOException,ReflectiveOperationException;ordered=2;not-handler-table;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseNestHost() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cNestHost"),ClassFileAttributesFinal::buildNestHost);
    check(api.parse(bytes).findAttribute(java.lang.classfile.Attributes.nestHost()).get().nestHost().asSymbol().equals(ClassDesc.of("classes.modern_test.C7cExternalHost")));
    check(api.verify(bytes).isEmpty());artifact("cf-attributes-nest-host","attributes-nest-host",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-attributes-nest-host","NestHost=classes.modern_test.C7cExternalHost;typed=ClassEntry;nest-access=unclaimed;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseNestMembers() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cNestMembers"),ClassFileAttributesFinal::buildNestMembers);
    var members=api.parse(bytes).findAttribute(java.lang.classfile.Attributes.nestMembers()).get().nestMembers();
    check(members.size()==2 && members.get(0).asSymbol().equals(ClassDesc.of("classes.modern_test.C7cMemberA")) && members.get(1).asSymbol().equals(ClassDesc.of("classes.modern_test.C7cMemberB")));
    check(api.verify(bytes).isEmpty());artifact("cf-attributes-nest-members","attributes-nest-members",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-attributes-nest-members","NestMembers=classes.modern_test.C7cMemberA,C7cMemberB;ordered=2;nest-access=unclaimed;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCustomStateless() throws Throwable {
    ClassFile api=mappedApi();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cStateless"),ClassFileAttributesFinal::buildStateless);
    var attrs=api.parse(bytes).attributes();check(attrs.size()==1 && attrs.get(0) instanceof ProbeAttribute && ((ProbeAttribute)attrs.get(0)).value==37);
    check(api.verify(bytes).isEmpty());artifact("cf-attributes-custom-stateless","attributes-stateless",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-attributes-custom-stateless","CustomAttribute=STATELESS;full-header=mapper-written;absolute-reader=checked;BufWriter.patchInt=4;payload=37;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCustomReference() throws Throwable {
    ClassFile api=mappedApi();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cReference"),ClassFileAttributesFinal::buildReference);
    ClassModel model=api.parse(bytes);ProbeAttribute attr=(ProbeAttribute)model.attributes().get(0);
    check(attr.value==53 && attr.reference.stringValue().equals("attribute-reference") && attr.reference.constantPool()==model.constantPool());
    check(api.verify(bytes).isEmpty());artifact("cf-attributes-custom-reference","attributes-reference",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-attributes-custom-reference","CustomAttribute=CP_REFS;foreign-StringEntry=imported;readEntry=StringEntry;payload=53/attribute-reference;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseProcessingOptions() throws Throwable {
    ClassModel source=processingSource();check(source.attributes().size()==2 && source.attributes().get(0) instanceof UnknownAttribute);
    ClassFile api=ClassFile.of(ClassFile.AttributesProcessingOption.DROP_UNKNOWN_ATTRIBUTES,ClassFile.ConstantPoolSharingOption.NEW_POOL);
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7cProcessing"),ClassFileAttributesFinal::copyElement);
    check(api.parse(bytes).attributes().isEmpty() && api.verify(bytes).isEmpty());artifact("cf-attributes-processing-options","attributes-processing",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==17);
    emit("cf-attributes-processing-options","unmapped=UnknownAttribute:2;DROP_UNKNOWN_ATTRIBUTES+NEW_POOL=0;typed-Code=retained;verify=empty;defined/invoked=same-bytes");
  }
  public static void main(String[] args) throws Throwable {
    caseConstantValues();caseSignatures();caseExceptions();caseNestHost();caseNestMembers();caseCustomStateless();caseCustomReference();caseProcessingOptions();
    System.out.println("CLASSFILE_ATTRIBUTES_OK");
  }
}
