package classes.modern_test;

import java.lang.classfile.AttributeMapper;
import java.lang.classfile.AttributedElement;
import java.lang.classfile.BufWriter;
import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassElement;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CustomAttribute;
import java.lang.classfile.FieldBuilder;
import java.lang.classfile.Label;
import java.lang.classfile.attribute.ConstantValueAttribute;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.ConstantPoolException;
import java.lang.classfile.constantpool.InvokeDynamicEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.constantpool.StringEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.List;

import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.bytes;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.BSM_NULL_CONSTANT;
import static java.lang.constant.ConstantDescs.CD_String;
import static java.lang.constant.ConstantDescs.CD_double;
import static java.lang.constant.ConstantDescs.CD_int;
import static java.lang.constant.ConstantDescs.CD_long;

/** Public NEW_POOL imports are exercised against unchanged javac25 input. */
public final class ClassFilePoolRemapFinal {
  private static final int STATIC_PUBLIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ReferenceMapper REFERENCE=new ReferenceMapper();
  private static boolean seeded;
  public static final class ReferenceAttribute extends CustomAttribute<ReferenceAttribute> {
    final StringEntry reference;
    ReferenceAttribute(StringEntry reference) {super(REFERENCE);this.reference=reference;}
  }
  public static final class ReferenceMapper implements AttributeMapper<ReferenceAttribute> {
    public String name() {return "C7cPoolReference";}
    public AttributeStability stability() {return AttributeStability.CP_REFS;}
    public ReferenceAttribute readAttribute(AttributedElement parent,java.lang.classfile.ClassReader reader,int position) {
      check(reader.readInt(position-4)==2);return new ReferenceAttribute(reader.readEntry(position,StringEntry.class));
    }
    public void writeAttribute(BufWriter writer,ReferenceAttribute attribute) {
      writer.writeIndex(writer.constantPool().utf8Entry(name()));writer.writeInt(2);writer.writeIndex(attribute.reference);
    }
  }
  private static AttributeMapper<?> mapper(Utf8Entry name) {return name.equalsString(REFERENCE.name())?REFERENCE:null;}
  private static ClassFile newPoolApi() {return ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);}
  private static ClassModel model() throws Exception {return ClassFile.of().parse(bytes(ClassFilePoolRemapFinal.class,"ClassFilePoolRemapTarget.class"));}
  private static void copyClass(ClassBuilder b,ClassElement element) {b.with(element);}
  private static void widenClass(ClassBuilder b,ClassElement element) {
    if(!seeded) {for(int n=0;n<300;n++)b.constantPool().stringEntry(new StringBuilder().append("C7c-widen-unused-").append(n).toString());seeded=true;}
    b.with(element);
  }
  private static void seedBootstrap(ClassBuilder b,ClassElement element) {
    if(!seeded) {b.constantPool().bsmEntry(BSM_NULL_CONSTANT,List.of());seeded=true;}
    b.with(element);
  }
  private static void codeValue(CodeBuilder b) {b.bipush(23).ireturn();}
  private static void buildUnusedSource(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);
    for(int n=0;n<80;n++)b.constantPool().stringEntry(new StringBuilder().append("unused-").append(n).toString());
    b.withMethodBody("value",MethodTypeDesc.of(CD_int),STATIC_PUBLIC,ClassFilePoolRemapFinal::codeValue);
  }
  private static ClassModel unusedSource() {return ClassFile.of().parse(ClassFile.of().build(ClassDesc.of("classes.modern_test.C7cUnusedSource"),ClassFilePoolRemapFinal::buildUnusedSource));}
  private static void fieldValue(FieldBuilder b) {b.withFlags(STATIC_PUBLIC|ClassFile.ACC_FINAL).with(ConstantValueAttribute.of(Integer.valueOf(44)));}
  private static void codeForeignMember(CodeBuilder b) {
    var foreign=ConstantPoolBuilder.of();b.getstatic(foreign.fieldRefEntry(ClassDesc.of("classes.modern_test.C7cForeignMember"),"value",CD_int)).ireturn();
  }
  private static void buildForeignMember(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);b.withField("value",CD_int,ClassFilePoolRemapFinal::fieldValue);
    b.withMethodBody("read",MethodTypeDesc.of(CD_int),STATIC_PUBLIC,ClassFilePoolRemapFinal::codeForeignMember);
  }
  private static void codeWideLong(CodeBuilder b) {b.ldc(ConstantPoolBuilder.of().longEntry(1234567890123L)).lreturn();}
  private static void codeWideDouble(CodeBuilder b) {
    var foreign=ConstantPoolBuilder.of();Label other=b.newLabel(),done=b.newLabel();
    b.iload(0).ifeq(other).ldc(foreign.doubleEntry(1.25d)).goto_(done).labelBinding(other).ldc(foreign.doubleEntry(2.5d)).labelBinding(done).dreturn();
  }
  private static void buildWideImports(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);
    b.withMethodBody("longValue",MethodTypeDesc.of(CD_long),STATIC_PUBLIC,ClassFilePoolRemapFinal::codeWideLong);
    b.withMethodBody("doubleValue",MethodTypeDesc.of(CD_double,CD_int),STATIC_PUBLIC,ClassFilePoolRemapFinal::codeWideDouble);
  }
  private static void buildReferenceSource(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);
    for(int n=0;n<130;n++)b.constantPool().stringEntry(new StringBuilder().append("unused-ref-").append(n).toString());
    b.with(new ReferenceAttribute(b.constantPool().stringEntry("remapped-reference")));
    b.withMethodBody("value",MethodTypeDesc.of(CD_int),STATIC_PUBLIC,ClassFilePoolRemapFinal::codeValue);
  }
  private static ClassModel referenceSource() {
    ClassFile api=ClassFile.of(ClassFile.AttributeMapperOption.of(ClassFilePoolRemapFinal::mapper));
    return api.parse(api.build(ClassDesc.of("classes.modern_test.C7cReferenceSource"),ClassFilePoolRemapFinal::buildReferenceSource));
  }
  private static boolean hasWideLoad(ClassModel model) {
    for(var element:model.methods().get(1).code().get())if(element instanceof ConstantInstruction && ((ConstantInstruction)element).opcode()==java.lang.classfile.Opcode.LDC_W)return true;
    return false;
  }
  private static void caseOriginalFreshPool() throws Throwable {
    ClassFile api=newPoolApi();ClassModel source=model();
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7cFreshOriginal"),ClassFilePoolRemapFinal::copyClass);
    ClassModel output=api.parse(bytes);check(output.thisClass().asInternalName().equals("classes/modern_test/C7cFreshOriginal") && output.fields().size()==2 && output.methods().size()==5);
    check(api.verify(bytes).isEmpty());artifact("cf-pool-original-fresh","pool-original",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(0)).equals("zero") && ((String)handle.invokeExact(7)).equals("kept"));
    emit("cf-pool-original-fresh","NEW_POOL=unchanged-javac25;typed-ConstantValue/Signature/InnerClasses/BootstrapMethods=remapped;branch-frames=regenerated;choose(0/7)=zero/kept;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseLdcWidening() throws Throwable {
    ClassFile api=newPoolApi();ClassModel source=model();check(!hasWideLoad(source));seeded=false;
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7cWideOriginal"),ClassFilePoolRemapFinal::widenClass);
    ClassModel output=api.parse(bytes);check(hasWideLoad(output) && output.methods().get(1).code().get().findAttribute(java.lang.classfile.Attributes.code()).isEmpty());
    check(api.verify(bytes).isEmpty());artifact("cf-pool-ldc-widening","pool-widening",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle choose=lookup.findStatic(generated,"choose",MethodType.methodType(String.class,int.class));check(((String)choose.invokeExact(0)).equals("zero") && ((String)choose.invokeExact(1)).equals("kept"));
    MethodHandle dense=lookup.findStatic(generated,"dense",MethodType.methodType(String.class,int.class));check(((String)dense.invokeExact(1)).equals("one") && ((String)dense.invokeExact(3)).equals("three") && ((String)dense.invokeExact(9)).equals("other"));
    emit("cf-pool-ldc-widening","NEW_POOL+300-prefilled-strings=ldc_w;original=ldc;branch/switch/frame-offsets=rebuilt;choose/table/default=executed;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseUnusedPoolDropped() throws Throwable {
    ClassFile api=newPoolApi();ClassModel source=unusedSource();check(source.constantPool().size()>160);
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7cUnusedDropped"),ClassFilePoolRemapFinal::copyClass);
    check(api.parse(bytes).constantPool().size()<20 && api.verify(bytes).isEmpty());artifact("cf-pool-unused-dropped","pool-unused",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==23);
    emit("cf-pool-unused-dropped","NEW_POOL=unused-80-strings-dropped;source-size>160;output-size<20;value=23;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseForeignMemberImport() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cForeignMember"),ClassFilePoolRemapFinal::buildForeignMember);
    check(api.verify(bytes).isEmpty());artifact("cf-pool-foreign-member","pool-foreign-member",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"read",MethodType.methodType(int.class));check((int)handle.invokeExact()==44);
    emit("cf-pool-foreign-member","foreign-FieldRefEntry=semantic-import;owner/name/type=selected;ConstantValue=44;getstatic=44;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseWideImports() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7cWideImports"),ClassFilePoolRemapFinal::buildWideImports);
    check(api.verify(bytes).isEmpty());artifact("cf-pool-wide-imports","pool-wide-imports",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle longHandle=lookup.findStatic(generated,"longValue",MethodType.methodType(long.class));check((long)longHandle.invokeExact()==1234567890123L);
    MethodHandle doubleHandle=lookup.findStatic(generated,"doubleValue",MethodType.methodType(double.class,int.class));check((double)doubleHandle.invokeExact(1)==1.25d && (double)doubleHandle.invokeExact(0)==2.5d);
    emit("cf-pool-wide-imports","foreign-LongEntry/DoubleEntry=imported;CP-wide-slots=preserved;ldc2_w=3;category2-stack-join=typed;resolved=1234567890123/1.25/2.5;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseCustomReferenceRemap() throws Throwable {
    ClassModel source=referenceSource();int before=((ReferenceAttribute)source.attributes().get(0)).reference.index();check(before>255);
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL,ClassFile.AttributeMapperOption.of(ClassFilePoolRemapFinal::mapper));
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7cReferenceRemapped"),ClassFilePoolRemapFinal::copyClass);
    ReferenceAttribute attribute=(ReferenceAttribute)api.parse(bytes).attributes().get(0);check(attribute.reference.index()<255 && attribute.reference.stringValue().equals("remapped-reference"));
    check(api.verify(bytes).isEmpty());artifact("cf-pool-custom-reference-remap","pool-reference-remap",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==23);
    emit("cf-pool-custom-reference-remap","CP_REFS+NEW_POOL=mapper-reencoded;source-index>255;output-index<255;StringEntry=remapped-reference;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseBootstrapReindex() throws Throwable {
    ClassFile api=newPoolApi();ClassModel source=model();check(source.constantPool().bootstrapMethodCount()==1);seeded=false;
    byte[] bytes=api.transformClass(source,ClassDesc.of("classes.modern_test.C7cBootstrapReindexed"),ClassFilePoolRemapFinal::seedBootstrap);
    var pool=api.parse(bytes).constantPool();check(pool.bootstrapMethodCount()==2);
    int dynamic=0;for(PoolEntry entry:pool)if(entry instanceof InvokeDynamicEntry){check(((InvokeDynamicEntry)entry).bootstrapMethodIndex()==1);dynamic++;}
    check(dynamic==1 && api.verify(bytes).isEmpty());artifact("cf-pool-bootstrap-reindex","pool-bootstrap-reindex",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle handle=lookup.findStatic(generated,"concat",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(5)).equals("pool=5"));
    emit("cf-pool-bootstrap-reindex","NEW_POOL=bootstrap-index-0-to-1;prefilled-nullConstant=0;original-concat=1;CP18+BootstrapMethods=consistent;resolved=pool=5;verify=empty;defined/invoked=same-bytes");
  }
  private static void casePoolValidation() {
    var pool=ConstantPoolBuilder.of();var first=pool.intEntry(7);check(pool.intEntry(7).index()==first.index());var wide=pool.longEntry(9L);
    int failures=0;try{pool.entryByIndex(0);throw new AssertionError();}catch(ConstantPoolException error){failures++;}
    try{pool.entryByIndex(wide.index()+1);throw new AssertionError();}catch(ConstantPoolException error){failures++;}
    try{pool.entryByIndex(pool.size());throw new AssertionError();}catch(ConstantPoolException error){failures++;}
    check(failures==3);emit("cf-pool-index-validation","semantic-dedup=int:7;index-zero/wide-tail/out-of-range=ConstantPoolException;rejections=3;generated-bytes=none");
  }
  public static void main(String[] args) throws Throwable {
    caseOriginalFreshPool();caseLdcWidening();caseUnusedPoolDropped();caseForeignMemberImport();caseWideImports();caseCustomReferenceRemap();caseBootstrapReindex();casePoolValidation();
    System.out.println("CLASSFILE_POOL_REMAP_OK");
  }
}

final class ClassFilePoolRemapTarget<T> {
  public static final int I=7;
  public static final long W=9000000000L;
  public static String choose(int value) {if(value==0)return "zero";return "kept";}
  public static String dense(int value) {switch(value){case 1:return "one";case 2:return "two";case 3:return "three";default:return "other";}}
  public static String concat(int value) {return "pool="+value;}
  public static long wide() {return W;}
}
