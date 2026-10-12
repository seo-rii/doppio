package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.constantpool.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.*;
import java.lang.invoke.MethodHandles;
import java.util.Arrays;
import java.util.List;
import static java.lang.constant.ConstantDescs.*;

/** Public API diagnostics, not a substitute for unchanged original Java25 inputs. */
public final class ClassFileRemapRegression {
  private static int completed, bootstrapCalls;
  private static void check(boolean value,String message) { if(!value)throw new AssertionError(message);completed++; }
  public static Object bootstrap(MethodHandles.Lookup lookup,String name,Class<?> type,Object value) {
    bootstrapCalls++;return value;
  }
  private static final DirectMethodHandleDesc BSM=MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC,
      ClassDesc.of("classes.modern_test.ClassFileRemapRegression"),"bootstrap",
      MethodTypeDesc.of(CD_Object,CD_MethodHandles_Lookup,CD_String,CD_Class,CD_Object));

  private static void sourceClass(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);
    b.with(SignatureAttribute.of(b.constantPool().utf8Entry("<T:Ljava/lang/Object;>Ljava/lang/Object;")));
    b.withField("MAGIC",CD_int,f->f.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC|ClassFile.ACC_FINAL)
        .with(ConstantValueAttribute.of(f.constantPool().intEntry(37))));
    b.withMethodBody("value",MethodTypeDesc.of(CD_String),9,ClassFileRemapRegression::valueCode);
    b.withMethodBody("choose",MethodTypeDesc.of(CD_String,CD_int),9,ClassFileRemapRegression::chooseCode);
  }
  private static void valueCode(CodeBuilder b) { b.ldc(b.constantPool().stringEntry("kept-value")).areturn(); }
  private static void chooseCode(CodeBuilder b) {
    Label alternative=b.newLabel(),join=b.newLabel();
    b.iload(0).ifeq(alternative).ldc(b.constantPool().stringEntry("yes")).goto_(join)
        .labelBinding(alternative).ldc(b.constantPool().stringEntry("no")).labelBinding(join).areturn();
  }
  private static ConstantInstruction.LoadConstantInstruction load(ClassModel model,int method) {
    for(CodeElement element:model.methods().get(method).code().get())
      if(element instanceof ConstantInstruction.LoadConstantInstruction)
        return (ConstantInstruction.LoadConstantInstruction)element;
    throw new AssertionError("No pool load");
  }
  private static int branchTarget(ClassModel model) {
    CodeAttribute code=(CodeAttribute)model.methods().get(1).code().get();
    for(CodeElement element:code) if(element instanceof BranchInstruction)
      return code.labelToBci(((BranchInstruction)element).target());
    throw new AssertionError("No branch");
  }
  private static void prefill(ClassBuilder b) {
    for(int i=0;i<300;i++)b.constantPool().stringEntry("new-unused-"+i);
  }
  private static byte[] dynamicSource() {
    ConstantPoolBuilder pool=ConstantPoolBuilder.of();
    pool.bsmEntry(pool.methodHandleEntry(BSM),List.of(pool.stringEntry("unused-bootstrap")));
    return ClassFile.of().build(pool.classEntry(ClassDesc.of("classes.modern_test.RemapDynamic")),pool,
        ClassFileRemapRegression::dynamicClass);
  }
  private static void dynamicClass(ClassBuilder b) {
    b.withMethodBody("value",MethodTypeDesc.of(CD_String),9,ClassFileRemapRegression::dynamicCode);
  }
  private static void dynamicCode(CodeBuilder b) {
    ConstantPoolBuilder pool=b.constantPool();
    b.ldc(pool.constantDynamicEntry(pool.bsmEntry(pool.methodHandleEntry(BSM),List.of(pool.stringEntry("dynamic-value"))),
        pool.nameAndTypeEntry("marker",CD_String))).areturn();
  }
  private static void badClass(ClassBuilder b) {
    b.withMethodBody("bad",MethodTypeDesc.of(CD_int),9,ClassFileRemapRegression::badCode);
  }
  private static void badCode(CodeBuilder b) {
    ConstantPoolBuilder pool=b.constantPool();
    b.ldc(pool.constantDynamicEntry(pool.bsmEntry(pool.methodHandleEntry(BSM),List.of(pool.stringEntry("bad-value"))),
        pool.nameAndTypeEntry("marker",CD_String))).ireturn();
  }
  private static final class Opaque extends CustomAttribute<Opaque> {
    final Utf8Entry text;
    Opaque(Utf8Entry text) { super(MAPPER);this.text=text; }
  }
  private static final AttributeMapper<Opaque> MAPPER=new AttributeMapper<Opaque>() {
    public String name() { return "RemapOpaque"; }
    public AttributeStability stability() { return AttributeStability.UNKNOWN; }
    public Opaque readAttribute(AttributedElement owner,ClassReader reader,int start) {
      return new Opaque(reader.readEntry(start,Utf8Entry.class));
    }
    public void writeAttribute(BufWriter writer,Opaque attribute) {
      writer.writeIndex(attribute.attributeName());writer.writeInt(2);writer.writeIndex(attribute.text);
    }
  };
  private static void opaqueClass(ClassBuilder b) { b.with(new Opaque(b.constantPool().utf8Entry("opaque-CP-reference"))); }

  private static final class DebugTable extends CustomAttribute<DebugTable> {
    final Utf8Entry name, type;
    DebugTable(AttributeMapper<DebugTable> mapper,Utf8Entry name,Utf8Entry type) {
      super(mapper);this.name=name;this.type=type;
    }
  }
  private static AttributeMapper<DebugTable> debugMapper(String name) {
    return new AttributeMapper<DebugTable>() {
      public String name() { return name; }
      public AttributeStability stability() { return AttributeStability.LABELS; }
      public DebugTable readAttribute(AttributedElement owner,ClassReader reader,int start) {
        throw new AssertionError("Built-in debug tables must not call a custom reader");
      }
      public void writeAttribute(BufWriter writer,DebugTable attribute) {
        writer.writeIndex(attribute.attributeName());writer.writeInt(12);
        writer.writeU2(1);writer.writeU2(0);writer.writeU2(2);
        writer.writeIndex(attribute.name);writer.writeIndex(attribute.type);writer.writeU2(0);
      }
    };
  }
  private static void debugBoundaries(boolean nativeOracle) {
    for(String name:List.of("LocalVariableTable","LocalVariableTypeTable")) {
      AttributeMapper<DebugTable> mapper=debugMapper(name);
      String descriptor=name.equals("LocalVariableTable")?"Ljava/util/List;":"Ljava/util/List<Ljava/lang/String;>;";
      byte[] bytes=ClassFile.of().build(ClassDesc.of("classes.modern_test.RemapDebug"),b->
          b.withMethodBody("value",MethodTypeDesc.of(CD_List,CD_List),9,c-> {
            c.with(new DebugTable(mapper,c.constantPool().utf8Entry("value"),c.constantPool().utf8Entry(descriptor)));
            c.aload(0).areturn();
          }));
      ClassModel model=ClassFile.of().parse(bytes);
      for(ClassFile.AttributesProcessingOption policy:ClassFile.AttributesProcessingOption.values()) {
        ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL,policy);
        if(nativeOracle) {
          ClassModel fresh=api.parse(api.transformClass(model,ClassTransform.ACCEPT_ALL));
          boolean retained=false;
          for(Attribute<?> attribute:fresh.methods().get(0).code().get().attributes())
            if(attribute.attributeName().stringValue().equals(name))retained=true;
          check(retained&&api.verify(fresh).isEmpty(),"native remaps bound "+name+" under "+policy);
        }else{
          try { api.transformClass(model,ClassTransform.ACCEPT_ALL);throw new AssertionError("silently omitted "+name); }
          catch(UnsupportedOperationException expected) {
            check(expected.getMessage().contains(name),"explicit unselected debug-table boundary under "+policy);
          }
        }
      }
    }
  }

  public static void main(String[] arguments) {
    boolean nativeOracle=arguments.length==1&&arguments[0].equals("native");
    if(arguments.length!=0&&!nativeOracle)throw new AssertionError("Unknown diagnostic mode");
    ClassFile api=ClassFile.of(),freshApi=api.withOptions(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    ConstantPoolBuilder sourcePool=ConstantPoolBuilder.of();
    for(int i=0;i<300;i++)sourcePool.stringEntry("old-unused-"+i);
    byte[] original=api.build(sourcePool.classEntry(ClassDesc.of("classes.modern_test.RemapSource")),sourcePool,
        ClassFileRemapRegression::sourceClass),snapshot=original.clone();
    ClassModel source=api.parse(original);
    check(api.verify(source).isEmpty(),"original verification");
    check(source.constantPool().size()>600,"actual original source-pool tail");
    check(load(source,0).opcode()==Opcode.LDC_W,"original wide CP load");
    byte[] fresh=freshApi.transformClass(source,ClassTransform.ACCEPT_ALL);
    ClassModel rebuilt=freshApi.parse(fresh);
    check(rebuilt.constantPool().size()<source.constantPool().size(),"unused source entries were not cloned");
    check(load(rebuilt,0).opcode()==Opcode.LDC,"fresh operand really narrows");
    check("kept-value".equals((Object)load(rebuilt,0).constantValue()),"fresh symbolic constant preserved");
    check(rebuilt.fields().get(0).findAttribute(Attributes.constantValue()).get().constant().tag()==3&&
        rebuilt.findAttribute(Attributes.signature()).get().signature().stringValue().equals("<T:Ljava/lang/Object;>Ljava/lang/Object;"),
        "typed CP attributes remapped");
    check(freshApi.verify(fresh).isEmpty()&&freshApi.verify(rebuilt).isEmpty(),"fresh CFG/frame verification");
    check(!ConstantPoolBuilder.of(rebuilt).canWriteDirect(source.constantPool()),"semantic imports do not gain raw-copy authority");
    check(Arrays.equals(original,snapshot),"original bytes remain unchanged");
    ClassTransform fill=new ClassTransform() {
      public void atStart(ClassBuilder b) { prefill(b); }
      public void accept(ClassBuilder b,ClassElement element) { b.with(element); }
    };
    byte[] widened=freshApi.transformClass(source,fill);ClassModel wide=freshApi.parse(widened);
    check(load(wide,0).opcode()==Opcode.LDC_W,"fresh prefilling changes actual operand width");
    check(branchTarget(wide)>branchTarget(rebuilt),"branches rebound after width changes");
    check(freshApi.verify(widened).isEmpty(),"wide rebuilt frames verify");
    byte[] dynamic=dynamicSource();ClassModel dynamicModel=api.parse(dynamic);
    ClassModel dynamicFresh=freshApi.parse(freshApi.transformClass(dynamicModel,ClassTransform.ACCEPT_ALL));
    check(dynamicModel.constantPool().bootstrapMethodCount()==2&&dynamicFresh.constantPool().bootstrapMethodCount()==1&&
        ((ConstantDynamicEntry)load(dynamicModel,0).constantEntry()).bootstrapMethodIndex()==1&&
        ((ConstantDynamicEntry)load(dynamicFresh,0).constantEntry()).bootstrapMethodIndex()==0,"unused BSM pruned and real index remapped");
    ClassTransform fillBootstrap=new ClassTransform() {
      public void atStart(ClassBuilder b) {
        ConstantPoolBuilder pool=b.constantPool();pool.bsmEntry(pool.methodHandleEntry(BSM),List.of(pool.stringEntry("new-unused-bootstrap")));
      }
      public void accept(ClassBuilder b,ClassElement element) { b.with(element); }
    };
    ClassModel shifted=freshApi.parse(freshApi.transformClass(dynamicModel,fillBootstrap));
    check(shifted.constantPool().bootstrapMethodCount()==2&&
        ((ConstantDynamicEntry)load(shifted,0).constantEntry()).bootstrapMethodIndex()==1&&
        freshApi.verify(shifted).isEmpty()&&bootstrapCalls==0,"metadata verification never invokes a bootstrap");
    byte[] bad=api.build(ClassDesc.of("classes.modern_test.RemapBad"),ClassFileRemapRegression::badClass);
    check(!api.verify(bad).isEmpty()&&!api.verify(api.parse(bad)).isEmpty()&&bootstrapCalls==0,"wrong dynamic return type never executes or defines");
    byte[] opaque=api.build(ClassDesc.of("classes.modern_test.RemapOpaqueSource"),ClassFileRemapRegression::opaqueClass);
    if(nativeOracle) {
      check(freshApi.parse(freshApi.transformClass(api.parse(opaque),ClassTransform.ACCEPT_ALL)).attributes().size()==1,
          "native PASS_ALL retains opaque payload");
    }else{
      try { freshApi.transformClass(api.parse(opaque),ClassTransform.ACCEPT_ALL);throw new AssertionError("unsafe raw CP copying accepted"); }
      catch(UnsupportedOperationException expected) { check(expected.getClass()==UnsupportedOperationException.class,"explicit opaque remap boundary"); }
    }
    debugBoundaries(nativeOracle);
    if(completed!=23)throw new AssertionError("Incomplete remap diagnostics: "+completed);
    System.out.println("CLASSFILE_REMAP_REGRESSION_OK|23");
  }
}
