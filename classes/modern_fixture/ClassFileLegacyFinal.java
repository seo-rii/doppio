package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.instruction.*;
import java.lang.classfile.instruction.DiscontinuedInstruction.JsrInstruction;
import java.lang.classfile.instruction.DiscontinuedInstruction.RetInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.ArrayList;
import java.util.List;
import static java.lang.constant.ConstantDescs.CD_int;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;

/** Original stable25 public legacy models, old-major packets and honest verification applicability. */
public final class ClassFileLegacyFinal {
  private static Label factoryLabel;
  private static void labels(ClassBuilder b) {
    b.withFlags(33).withMethodBody("unused",MethodTypeDesc.of(CD_int),9,ClassFileLegacyFinal::labelCode);
  }
  private static void labelCode(CodeBuilder b) {factoryLabel=b.newLabel();b.iconst_0().ireturn();}
  private static String failure(Action action) {
    try {action.run();throw new AssertionError("missing native failure");}
    catch(IllegalArgumentException expected) {return "IAE";}
    catch(NullPointerException expected) {return "NPE";}
  }
  private static void caseJsrModels() {
    ClassFile.of().build(ClassDesc.of("classes.modern_test.C7d5LegacyLabels"),ClassFileLegacyFinal::labels);
    JsrInstruction jsr=JsrInstruction.of(factoryLabel),wide=JsrInstruction.of(Opcode.JSR_W,factoryLabel);
    check(jsr.opcode()==Opcode.JSR&&jsr.sizeInBytes()==3&&jsr.target()==factoryLabel);
    check(wide.opcode()==Opcode.JSR_W&&wide.sizeInBytes()==5&&wide.target()==factoryLabel);
    check(DiscontinuedInstruction.class.getInterfaces()[0]==Instruction.class&&JsrInstruction.class.getInterfaces()[0]==DiscontinuedInstruction.class);
    check(failure(ClassFileLegacyFinal::wrongJsr).equals("IAE")&&failure(ClassFileLegacyFinal::nullJsrOpcode).equals("NPE")&&failure(ClassFileLegacyFinal::nullJsrTarget).equals("NPE"));
    emit("cf-legacy-jsr-models","JSR/JSR_W=3/5;real-label-identity;parents=Instruction/DiscontinuedInstruction;bad-kind/null-op/null-target=IAE/NPE/NPE;artifact=none");
  }
  private static void wrongJsr(){JsrInstruction.of(Opcode.RET,null);}
  private static void nullJsrOpcode(){JsrInstruction.of(null,null);}
  private static void nullJsrTarget(){JsrInstruction.of((Label)null);}
  private static void caseRetModels() {
    check(RetInstruction.of(0).opcode()==Opcode.RET&&RetInstruction.of(255).opcode()==Opcode.RET);
    check(RetInstruction.of(256).opcode()==Opcode.RET_W&&RetInstruction.of(65535).slot()==65535);
    check(RetInstruction.of(Opcode.RET_W,1).sizeInBytes()==4&&RetInstruction.class.getInterfaces()[0]==DiscontinuedInstruction.class);
    check(failure(ClassFileLegacyFinal::negativeRet).equals("IAE")&&failure(ClassFileLegacyFinal::overflowRet).equals("IAE")&&failure(ClassFileLegacyFinal::shortRetOverflow).equals("IAE")&&failure(ClassFileLegacyFinal::wrongRet).equals("IAE")&&failure(ClassFileLegacyFinal::nullRet).equals("NPE"));
    emit("cf-legacy-ret-models","slots=0/255:RET,256/65535:RET_W;explicit-RET_W1=size4;bad-slot/kind=IAE;null-op=NPE;artifact=none");
  }
  private static void negativeRet(){RetInstruction.of(-1);}
  private static void overflowRet(){RetInstruction.of(65536);}
  private static void shortRetOverflow(){RetInstruction.of(Opcode.RET,256);}
  private static void wrongRet(){RetInstruction.of(Opcode.JSR,0);}
  private static void nullRet(){RetInstruction.of(null,0);}
  private static void classShort(ClassBuilder b){b.withFlags(33).withVersion(49,0).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileLegacyFinal::shortCode);}
  private static void classWideJump(ClassBuilder b){b.withFlags(33).withVersion(49,0).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileLegacyFinal::wideJumpCode);}
  private static void classWideRet(ClassBuilder b){b.withFlags(33).withVersion(49,0).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileLegacyFinal::wideRetCode);}
  private static void classBothWide(ClassBuilder b){b.withFlags(33).withVersion(49,0).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileLegacyFinal::bothWideCode);}
  private static void shortCode(CodeBuilder b){subroutine(b,Opcode.JSR,Opcode.RET,1);}
  private static void wideJumpCode(CodeBuilder b){subroutine(b,Opcode.JSR_W,Opcode.RET,1);}
  private static void wideRetCode(CodeBuilder b){subroutine(b,Opcode.JSR,Opcode.RET_W,300);}
  private static void bothWideCode(CodeBuilder b){subroutine(b,Opcode.JSR_W,Opcode.RET_W,1);}
  private static void subroutine(CodeBuilder b,Opcode jump,Opcode ret,int slot) {
    Label sub=b.newLabel();b.bipush(37).istore(0).with(JsrInstruction.of(jump,sub)).iload(0).ireturn();
    b.labelBinding(sub).astore(slot).iinc(0,5).with(RetInstruction.of(ret,slot));
  }
  private static CodeAttribute code(ClassFile api,byte[] output) {
    ClassModel model=api.parse(output);check(model.majorVersion()==49||model.majorVersion()==50||model.majorVersion()==51);
    return (CodeAttribute)model.methods().get(0).code().get();
  }
  private static void inference(ClassFile api,byte[] output) {
    List<VerifyError> errors=api.verify(output);check(errors.size()==1&&errors.get(0).getMessage().equals("Inference verification is not supported"));
  }
  private static void typed(CodeAttribute code,Opcode jump,Opcode ret,int slot) {
    int jsrs=0,rets=0;for(CodeElement element:code.elementList()) {
      if(element instanceof JsrInstruction){JsrInstruction value=(JsrInstruction)element;check(value.opcode()==jump&&code.labelToBci(value.target())>0);jsrs++;}
      if(element instanceof RetInstruction){RetInstruction value=(RetInstruction)element;check(value.opcode()==ret&&value.slot()==slot);rets++;}
    }
    check(jsrs==1&&rets==1&&code.maxLocals()==slot+1&&code.maxStack()==2&&code.findAttribute(Attributes.stackMapTable()).isEmpty());
  }
  private static int invoke(Class<?> generated)throws Throwable {
    MethodHandle handle=MethodHandles.lookup().findStatic(generated,"value",MethodType.methodType(int.class));return (int)handle.invokeExact();
  }
  private static void caseShort()throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7d5JsrRet"),ClassFileLegacyFinal::classShort);
    typed(code(api,output),Opcode.JSR,Opcode.RET,1);inference(api,output);artifact("cf-legacy-jsr-ret","legacy-jsr-ret",output);
    Class<?> generated=new Loader().define(output);check(invoke(generated)==42);
    emit("cf-legacy-jsr-ret","major49;JSR/RET=typed;maxStack/Locals=2/2;verify=inference-unsupported;value=42;defined/invoked=same-bytes");
  }
  private static void caseWideJump()throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7d5JsrWideRet"),ClassFileLegacyFinal::classWideJump);
    typed(code(api,output),Opcode.JSR_W,Opcode.RET,1);inference(api,output);artifact("cf-legacy-jsrw-ret","legacy-jsrw-ret",output);
    Class<?> generated=new Loader().define(output);check(invoke(generated)==42);
    emit("cf-legacy-jsrw-ret","major49;JSR_W/RET=typed;maxStack/Locals=2/2;signed32-target;verify=inference-unsupported;value=42;defined/invoked=same-bytes");
  }
  private static void caseWideRet()throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7d5JsrRetWide"),ClassFileLegacyFinal::classWideRet);
    typed(code(api,output),Opcode.JSR,Opcode.RET_W,300);inference(api,output);artifact("cf-legacy-jsr-retw","legacy-jsr-retw",output);
    Class<?> generated=new Loader().define(output);check(invoke(generated)==42);
    emit("cf-legacy-jsr-retw","major49;JSR/RET_W=typed;maxStack/Locals=2/301;wide-ret-slot300;verify=inference-unsupported;value=42;defined/invoked=same-bytes");
  }
  private static void caseBothWide()throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7d5JsrWideRetWide"),ClassFileLegacyFinal::classBothWide);
    typed(code(api,output),Opcode.JSR_W,Opcode.RET_W,1);inference(api,output);artifact("cf-legacy-jsrw-retw","legacy-jsrw-retw",output);
    Class<?> generated=new Loader().define(output);check(invoke(generated)==42);
    emit("cf-legacy-jsrw-retw","major49;JSR_W/RET_W=typed;maxStack/Locals=2/2;explicit-small-wide-ret;verify=inference-unsupported;value=42;defined/invoked=same-bytes");
  }
  private static void caseRelocation()throws Throwable {
    ClassFile api=ClassFile.of();byte[] source=api.build(ClassDesc.of("classes.modern_test.C7d5LegacySource"),ClassFileLegacyFinal::classShort);ClassModel model=api.parse(source);
    ClassFile fresh=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);
    byte[] output=fresh.transformClass(model,ClassDesc.of("classes.modern_test.C7d5LegacyRelocated"),ClassTransform.transformingMethodBodies(CodeTransform.ofStateful(Relocator::new)));
    CodeAttribute before=code(api,source),after=code(api,output);typed(before,Opcode.JSR,Opcode.RET,1);typed(after,Opcode.JSR_W,Opcode.RET,1);
    JsrInstruction first=null,second=null;for(CodeElement element:before.elementList())if(element instanceof JsrInstruction)first=(JsrInstruction)element;
    for(CodeElement element:after.elementList())if(element instanceof JsrInstruction)second=(JsrInstruction)element;
    check(after.labelToBci(second.target())-before.labelToBci(first.target())==33002&&after.codeLength()-before.codeLength()==33002);
    inference(api,source);inference(api,output);artifact("cf-legacy-relocate-promote","legacy-relocation-source",source);artifact("cf-legacy-relocate-promote","legacy-relocation-output",output);
    Class<?> sourceClass=new Loader().define(source),outputClass=new Loader().define(output);check(invoke(sourceClass)==42&&invoke(outputClass)==42);
    String failure;
    try {ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL,ClassFile.ShortJumpsOption.FAIL_ON_SHORT_JUMPS).transformClass(model,ClassTransform.transformingMethodBodies(CodeTransform.ofStateful(Relocator::new)));throw new AssertionError("missing short overflow");}
    catch(IllegalArgumentException expected){failure="IAE";}
    check(failure.equals("IAE"));emit("cf-legacy-relocate-promote","major49;NEW_POOL;real-target/code-shift=33002;JSR-promoted-JSR_W;FAIL-short=IAE;verify=inference-unsupported;values=42/42;defined/invoked=each-same-bytes");
  }
  private static void classFifty(ClassBuilder b){b.withFlags(33).withVersion(50,0).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileLegacyFinal::shortCode);}
  private static void classFiftyOne(ClassBuilder b){b.withFlags(33).withVersion(51,0).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileLegacyFinal::shortCode);}
  private static void caseVersionPolicy() {
    ClassFile api=ClassFile.of();byte[] fifty=api.build(ClassDesc.of("classes.modern_test.C7d5LegacyFifty"),ClassFileLegacyFinal::classFifty);inference(api,fifty);typed(code(api,fifty),Opcode.JSR,Opcode.RET,1);artifact("cf-legacy-version-policy","legacy-major50-metadata",fifty);
    check(failure(ClassFileLegacyFinal::generateOld).equals("IAE")&&failure(ClassFileLegacyFinal::buildNew).equals("IAE"));
    ClassFile drop=ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);byte[] invalid=drop.build(ClassDesc.of("classes.modern_test.C7d5LegacyInvalid51"),ClassFileLegacyFinal::classFiftyOne);
    typed(code(drop,invalid),Opcode.JSR,Opcode.RET,1);check(!drop.verify(invalid).isEmpty());artifact("cf-legacy-version-policy","legacy-major51-invalid",invalid);
    emit("cf-legacy-version-policy","major50=fallback/inference-unsupported;GENERATE-major49/default-major51=IAE;DROP-major51=encodable/verify-errors;all-policy-packets=never-defined");
  }
  private static void generateOld(){ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS).build(ClassDesc.of("classes.modern_test.C7d5LegacyGenerateOld"),ClassFileLegacyFinal::classShort);}
  private static void buildNew(){ClassFile.of().build(ClassDesc.of("classes.modern_test.C7d5LegacyNew"),ClassFileLegacyFinal::classFiftyOne);}
  public static void main(String[] args)throws Throwable {caseJsrModels();caseRetModels();caseShort();caseWideJump();caseWideRet();caseBothWide();caseRelocation();caseVersionPolicy();System.out.println("CLASSFILE_LEGACY_OK");}
  interface Action {void run();}
  static final class Loader extends ClassLoader {
    Loader(){super(ClassFileLegacyFinal.class.getClassLoader());}
    Class<?> define(byte[] bytes){return defineClass(null,bytes,0,bytes.length);}
  }
  static final class Relocator implements CodeTransform {
    private final List<CodeElement> pending=new ArrayList<CodeElement>();private boolean moved;
    public void accept(CodeBuilder b,CodeElement element) {
      if(!(element instanceof Instruction)){pending.add(element);return;}
      if(!moved&&element instanceof StoreInstruction&&((StoreInstruction)element).typeKind()==TypeKind.REFERENCE){for(int i=0;i<33000;i++)b.nop();moved=true;}
      for(CodeElement previous:pending)b.with(previous);pending.clear();b.with(element);
    }
    public void atEnd(CodeBuilder b){for(CodeElement previous:pending)b.with(previous);pending.clear();check(moved);}
  }
}
