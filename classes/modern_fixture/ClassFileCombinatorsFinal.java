package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import static java.lang.constant.ConstantDescs.*;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;

/** Original public block/catch macros and per-scope stateful transform recipes. */
public final class ClassFileCombinatorsFinal {
  private static int firstSlot,secondSlot,parentSlot,classFactories,fieldFactories,methodFactories,codeFactories;
  private static int classStarts,classEnds,fieldStarts,fieldEnds,methodStarts,methodEnds,codeStarts,codeEnds,chainEnds,classChainEnds;
  private static void flags(ClassBuilder b) {b.withFlags(33);}
  private static void buildBlock(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),9,ClassFileCombinatorsFinal::codeBlock);}
  private static void codeBlock(CodeBuilder b) {
    int result=b.allocateLocal(TypeKind.INT);check(result==1&&b.parameterSlot(0)==0);b.iconst_0().istore(result);
    b.block(ClassFileCombinatorsFinal::blockFirst).block(ClassFileCombinatorsFinal::blockSecond);parentSlot=b.allocateLocal(TypeKind.INT);b.iload(result).ireturn();
  }
  private static void blockFirst(CodeBuilder.BlockCodeBuilder b) {firstSlot=b.allocateLocal(TypeKind.INT);check(b.startLabel()!=b.endLabel()&&b.breakLabel()!=b.startLabel());b.bipush(7).istore(firstSlot).iload(0).ifne(b.breakLabel()).iload(firstSlot).istore(1);}
  private static void blockSecond(CodeBuilder.BlockCodeBuilder b) {secondSlot=b.allocateLocal(TypeKind.LONG);b.lconst_1().lstore(secondSlot);}
  private static void buildIfThen(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),9,ClassFileCombinatorsFinal::codeIfThen);}
  private static void codeIfThen(CodeBuilder b) {int result=b.allocateLocal(TypeKind.INT);check(result==1);b.iconst_0().istore(result).iload(0).ifThen(ClassFileCombinatorsFinal::thenEleven).iload(result).ireturn();}
  private static void thenEleven(CodeBuilder.BlockCodeBuilder b) {b.bipush(11).istore(1);}
  private static void buildIfElse(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int,CD_int),9,ClassFileCombinatorsFinal::codeIfElse);}
  private static void codeIfElse(CodeBuilder b) {b.iload(0).iload(1).ifThenElse(Opcode.IF_ICMPGT,ClassFileCombinatorsFinal::thenSeventeen,ClassFileCombinatorsFinal::elseNineteen).ireturn();}
  private static void thenSeventeen(CodeBuilder.BlockCodeBuilder b) {b.bipush(17);}
  private static void elseNineteen(CodeBuilder.BlockCodeBuilder b) {b.bipush(19);}
  private static void buildTry(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int),9,ClassFileCombinatorsFinal::codeTry);}
  private static void codeTry(CodeBuilder b) {b.trying(ClassFileCombinatorsFinal::tryDivide,ClassFileCombinatorsFinal::divideCatch).ireturn();}
  private static void tryDivide(CodeBuilder.BlockCodeBuilder b) {b.bipush(12).iload(0).idiv();}
  private static void divideCatch(CodeBuilder.CatchBuilder b) {b.catching(ClassDesc.of("java.lang.ArithmeticException"),ClassFileCombinatorsFinal::divideFailure);}
  private static void divideFailure(CodeBuilder.BlockCodeBuilder b) {b.pop().iconst_m1();}
  private static void buildMulti(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int,CD_int,CD_Throwable),9,ClassFileCombinatorsFinal::codeMulti);}
  private static void codeMulti(CodeBuilder b) {b.trying(ClassFileCombinatorsFinal::tryThrow,ClassFileCombinatorsFinal::multiCatch).ireturn();}
  private static void tryThrow(CodeBuilder.BlockCodeBuilder b) {Label okay=b.newLabel();b.aload(1).ifnull(okay).aload(1).athrow().labelBinding(okay).bipush(9);}
  private static void multiCatch(CodeBuilder.CatchBuilder b) {b.catchingMulti(java.util.List.of(ClassDesc.of("java.lang.IllegalArgumentException"),ClassDesc.of("java.lang.IllegalStateException")),ClassFileCombinatorsFinal::specificFailure).catchingAll(ClassFileCombinatorsFinal::anyFailure);}
  private static void specificFailure(CodeBuilder.BlockCodeBuilder b) {b.pop().bipush(21);}
  private static void anyFailure(CodeBuilder.BlockCodeBuilder b) {b.pop().bipush(22);}
  private static void buildTransforming(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileCombinatorsFinal::codeTransforming);}
  private static void codeTransforming(CodeBuilder b) {b.transforming(ClassFileCombinatorsFinal::threeToFour,ClassFileCombinatorsFinal::emitThree).ireturn();}
  private static void emitThree(CodeBuilder b) {b.iconst_3();}
  private static void threeToFour(CodeBuilder b,CodeElement element) {if(element instanceof Instruction&&((Instruction)element).opcode()==Opcode.ICONST_3)b.iconst_4();else b.with(element);}
  private static void fourToSix(CodeBuilder b,CodeElement element) {if(element instanceof Instruction&&((Instruction)element).opcode()==Opcode.ICONST_4)b.bipush(6);else b.with(element);}
  private static void codeEnd(CodeBuilder b) {chainEnds++;}
  private static void classEnd(ClassBuilder b) {classChainEnds++;b.withField("ended",CD_int,ClassFileCombinatorsFinal::endedField);}
  private static void endedField(FieldBuilder b) {b.withFlags(25).with(ConstantValueAttribute.of(b.constantPool().intEntry(1)));}
  private static void buildChainSource(ClassBuilder b) {flags(b);b.withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileCombinatorsFinal::codeThreeReturn);}
  private static void codeThreeReturn(CodeBuilder b) {b.iconst_3().ireturn();}
  private static void buildStateSource(ClassBuilder b) {flags(b);b.withField("marker",CD_int,9).withMethodBody("first",MethodTypeDesc.of(CD_int),9,ClassFileCombinatorsFinal::codeEight).withMethodBody("second",MethodTypeDesc.of(CD_int),9,ClassFileCombinatorsFinal::codeNine);}
  private static void codeEight(CodeBuilder b) {b.bipush(8).ireturn();}
  private static void codeNine(CodeBuilder b) {b.bipush(9).ireturn();}
  private static ClassTransform newClass() {classFactories++;return new ClassLife();}
  private static FieldTransform newField() {fieldFactories++;return new FieldLife();}
  private static MethodTransform newMethod() {methodFactories++;return new MethodLife();}
  private static CodeTransform newCode() {codeFactories++;return new CodeLife();}
  private static void caseBlock() throws Throwable {
    ClassFile api=ClassFile.of();firstSlot=secondSlot=parentSlot=-1;byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dBlockCombinator"),ClassFileCombinatorsFinal::buildBlock);
    check(firstSlot==2&&secondSlot==2&&parentSlot==2&&api.verify(output).isEmpty());artifact("cf-combinator-block","combinator-block",output);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(0)==7&&(int)handle.invokeExact(1)==0);
    emit("cf-combinator-block","block=distinct-start/end/break;INT/LONG-child-locals=slot2-reused;parent-allocation=slot2;values=7/0;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseIfThen() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dIfThenCombinator"),ClassFileCombinatorsFinal::buildIfThen);check(api.verify(output).isEmpty());artifact("cf-combinator-if-then","combinator-if-then",output);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(0)==0&&(int)handle.invokeExact(7)==11);
    emit("cf-combinator-if-then","ifThen=default-IFNE/inverted-real-branch;shared-local-join=typed;values=0/11;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseIfElse() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dIfElseCombinator"),ClassFileCombinatorsFinal::buildIfElse);check(api.verify(output).isEmpty());artifact("cf-combinator-if-else","combinator-if-else",output);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class,int.class));check((int)handle.invokeExact(9,3)==17&&(int)handle.invokeExact(3,9)==19);
    emit("cf-combinator-if-else","ifThenElse=IF_ICMPGT/inverted-real-branch;stack-INT-join=typed;values=17/19;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseTry() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dTryCombinator"),ClassFileCombinatorsFinal::buildTry);check(api.parse(output).methods().get(0).code().get().exceptionHandlers().size()==1&&api.verify(output).isEmpty());artifact("cf-combinator-try-catch","combinator-try",output);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(3)==4&&(int)handle.invokeExact(0)==-1);
    emit("cf-combinator-try-catch","trying=protected-IDIV/ArithmeticException-catch;handler-and-join-frames=typed;values=4/-1;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseMulti() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dMultiCatchCombinator"),ClassFileCombinatorsFinal::buildMulti);check(api.parse(output).methods().get(0).code().get().exceptionHandlers().size()==3&&api.verify(output).isEmpty());artifact("cf-combinator-try-multi-all","combinator-multi",output);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class,Throwable.class));
    check((int)handle.invokeExact(1,(Throwable)null)==9&&(int)handle.invokeExact(1,(Throwable)new IllegalArgumentException())==21&&(int)handle.invokeExact(1,(Throwable)new IllegalStateException())==21&&(int)handle.invokeExact(1,(Throwable)new AssertionError())==22);
    emit("cf-combinator-try-multi-all","catchingMulti=2-typed-entries/shared-handler;catchingAll=third-entry;real-handler-index/order=preserved;values=9/21/21/22;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseTransforming() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dDirectTransforming"),ClassFileCombinatorsFinal::buildTransforming);check(api.verify(output).isEmpty());artifact("cf-combinator-transforming","combinator-transforming",output);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==4);
    emit("cf-combinator-transforming","CodeBuilder.transforming=real-consumer-stage;ICONST3-to4;value=4;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseStateful() throws Throwable {
    classFactories=fieldFactories=methodFactories=codeFactories=classStarts=classEnds=fieldStarts=fieldEnds=methodStarts=methodEnds=codeStarts=codeEnds=0;
    ClassFile api=ClassFile.of();ClassModel source=api.parse(api.build(ClassDesc.of("classes.modern_test.C7dStateSource"),ClassFileCombinatorsFinal::buildStateSource));
    ClassTransform transform=ClassTransform.ofStateful(ClassFileCombinatorsFinal::newClass)
      .andThen(ClassTransform.transformingFields(FieldTransform.ofStateful(ClassFileCombinatorsFinal::newField)))
      .andThen(ClassTransform.transformingMethods(MethodTransform.ofStateful(ClassFileCombinatorsFinal::newMethod)))
      .andThen(ClassTransform.transformingMethodBodies(CodeTransform.ofStateful(ClassFileCombinatorsFinal::newCode)));
    byte[] first=api.transformClass(source,ClassDesc.of("classes.modern_test.C7dStateFirst"),transform);
    byte[] second=api.transformClass(source,ClassDesc.of("classes.modern_test.C7dStateSecond"),transform);
    check(classFactories==2&&fieldFactories==2&&methodFactories==4&&codeFactories==4&&classStarts==2&&classEnds==2&&fieldStarts==2&&fieldEnds==2&&methodStarts==4&&methodEnds==4&&codeStarts==4&&codeEnds==4&&api.verify(first).isEmpty()&&api.verify(second).isEmpty());
    artifact("cf-combinator-stateful","combinator-state-first",first);artifact("cf-combinator-stateful","combinator-state-second",second);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> firstClass=lookup.defineClass(first),secondClass=lookup.defineClass(second);
    MethodHandle firstValue=lookup.findStatic(firstClass,"first",MethodType.methodType(int.class)),secondValue=lookup.findStatic(secondClass,"second",MethodType.methodType(int.class));check((int)firstValue.invokeExact()==8&&(int)secondValue.invokeExact()==9);
    emit("cf-combinator-stateful","ofStateful=Class/Field/Method/Code;factories/start/end=2/2/4/4;per-instance-state=isolated;two-owned-arrays=8/9;verify=empty;defined/invoked=each-same-bytes");
  }
  private static void caseChain() throws Throwable {
    ClassFile api=ClassFile.of();ClassModel source=api.parse(api.build(ClassDesc.of("classes.modern_test.C7dChainSource"),ClassFileCombinatorsFinal::buildChainSource));chainEnds=classChainEnds=0;
    CodeTransform code=((CodeTransform)ClassFileCombinatorsFinal::threeToFour).andThen(ClassFileCombinatorsFinal::fourToSix).andThen(CodeTransform.endHandler(ClassFileCombinatorsFinal::codeEnd));
    ClassTransform transform=ClassTransform.transformingMethodBodies(code).andThen(ClassTransform.endHandler(ClassFileCombinatorsFinal::classEnd));
    byte[] output=api.transformClass(source,ClassDesc.of("classes.modern_test.C7dChainedTransforms"),transform);check(chainEnds==1&&classChainEnds==1&&api.parse(output).fields().size()==1&&api.verify(output).isEmpty());
    artifact("cf-combinator-chain","combinator-chain",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==6);
    emit("cf-combinator-chain","andThen=3-to4-to6;Code/Class-endHandler=once/in-order;late-ended-field=ConstantValue1;value=6;verify=empty;defined/invoked=same-bytes");
  }
  public static void main(String[] args) throws Throwable {caseBlock();caseIfThen();caseIfElse();caseTry();caseMulti();caseTransforming();caseStateful();caseChain();System.out.println("CLASSFILE_COMBINATORS_OK");}
  static final class ClassLife implements ClassTransform {
    private boolean started,ended;private int elements;
    public void atStart(ClassBuilder b){check(!started&&!ended);started=true;classStarts++;}
    public void accept(ClassBuilder b,ClassElement element){check(started&&!ended);elements++;b.with(element);}
    public void atEnd(ClassBuilder b){check(started&&!ended&&elements>0);ended=true;classEnds++;}
  }
  static final class FieldLife implements FieldTransform {
    private boolean started,ended;private int elements;
    public void atStart(FieldBuilder b){check(!started&&!ended);started=true;fieldStarts++;}
    public void accept(FieldBuilder b,FieldElement element){check(started&&!ended);elements++;b.with(element);}
    public void atEnd(FieldBuilder b){check(started&&!ended&&elements>0);ended=true;fieldEnds++;}
  }
  static final class MethodLife implements MethodTransform {
    private boolean started,ended;private int codeElements;
    public void atStart(MethodBuilder b){check(!started&&!ended);started=true;methodStarts++;}
    public void accept(MethodBuilder b,MethodElement element){check(started&&!ended);if(element instanceof CodeModel)codeElements++;b.with(element);}
    public void atEnd(MethodBuilder b){check(started&&!ended&&codeElements==1);ended=true;methodEnds++;}
  }
  static final class CodeLife implements CodeTransform {
    private boolean started,ended;private int instructions;
    public void atStart(CodeBuilder b){check(!started&&!ended);started=true;codeStarts++;}
    public void accept(CodeBuilder b,CodeElement element){check(started&&!ended);if(element instanceof Instruction)instructions++;b.with(element);}
    public void atEnd(CodeBuilder b){check(started&&!ended&&instructions==2);ended=true;codeEnds++;}
  }
}

