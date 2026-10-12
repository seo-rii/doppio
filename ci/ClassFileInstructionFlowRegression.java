package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.Label;
import java.lang.classfile.attribute.CodeAttribute;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

/** Independent instruction-state diagnostics, not substitutes for the unchanged javac25 fixtures. */
public final class ClassFileInstructionFlowRegression {
  private static int completed;
  private static void check(boolean valid,String message){if(!valid)throw new AssertionError(message);}
  private static void utf(DataOutputStream output,String text)throws IOException{output.writeByte(1);output.writeUTF(text);}
  private static void types(DataOutputStream output,int[] values)throws IOException{
    int count=0;for(int index=0;index<values.length;index++,count++)if(values[index]==7||values[index]==8)index++;
    output.writeShort(count);
    for(int index=0;index<values.length;index++){
      output.writeByte(values[index]);if(values[index]==7||values[index]==8)output.writeShort(values[++index]);
    }
  }
  private static byte[] frames(int target,int[] locals,int[] stack)throws IOException{
    ByteArrayOutputStream buffer=new ByteArrayOutputStream();DataOutputStream output=new DataOutputStream(buffer);
    output.writeShort(1);output.writeByte(255);output.writeShort(target);types(output,locals);types(output,stack);
    output.flush();return buffer.toByteArray();
  }
  private static byte[] sample(String descriptor,int maxStack,int maxLocals,int[] code)throws IOException{
    return sample(descriptor,maxStack,maxLocals,code,null,new int[0][],false);
  }
  private static byte[] sample(String descriptor,int maxStack,int maxLocals,int[] code,
      byte[] frames,int[][] handlers,boolean constructor)throws IOException{
    ByteArrayOutputStream buffer=new ByteArrayOutputStream();DataOutputStream output=new DataOutputStream(buffer);
    output.writeInt(0xcafebabe);output.writeShort(0);output.writeShort(69);output.writeShort(32);
    utf(output,"InstructionFlowTarget");output.writeByte(7);output.writeShort(1); // 1,2
    utf(output,"java/lang/Object");output.writeByte(7);output.writeShort(3); // 3,4
    utf(output,"test");utf(output,descriptor);utf(output,"Code");utf(output,"StackMapTable"); // 5..8
    utf(output,"java/lang/String");output.writeByte(7);output.writeShort(9); // 9,10
    utf(output,"[I");output.writeByte(7);output.writeShort(11); // 11,12
    utf(output,"[[I");output.writeByte(7);output.writeShort(13); // 13,14
    utf(output,"[Ljava/lang/String;");output.writeByte(7);output.writeShort(15); // 15,16
    utf(output,"<init>");utf(output,"()V"); // 17,18
    output.writeByte(12);output.writeShort(17);output.writeShort(18); // 19
    output.writeByte(10);output.writeShort(4);output.writeShort(19); // 20
    utf(output,"java/lang/Throwable");output.writeByte(7);output.writeShort(21); // 21,22
    utf(output,"java/lang/Number");output.writeByte(7);output.writeShort(23); // 23,24
    utf(output,"java/lang/StringBuilder");output.writeByte(7);output.writeShort(25); // 25,26
    utf(output,"(I)V");output.writeByte(12);output.writeShort(17);output.writeShort(27); // 27,28
    output.writeByte(10);output.writeShort(26);output.writeShort(28); // 29
    utf(output,"java/lang/RuntimeException");output.writeByte(7);output.writeShort(30); // 30,31
    output.writeShort(0x21);output.writeShort(2);output.writeShort(4);output.writeShort(0);output.writeShort(0);output.writeShort(1);
    output.writeShort(constructor?1:9);output.writeShort(constructor?17:5);output.writeShort(6);output.writeShort(1);
    output.writeShort(7);output.writeInt(12+code.length+handlers.length*8+(frames==null?0:6+frames.length));
    output.writeShort(maxStack);output.writeShort(maxLocals);output.writeInt(code.length);
    for(int value:code)output.writeByte(value);
    output.writeShort(handlers.length);for(int[] handler:handlers)for(int value:handler)output.writeShort(value);
    output.writeShort(frames==null?0:1);
    if(frames!=null){output.writeShort(8);output.writeInt(frames.length);output.write(frames);}
    output.writeShort(0);output.flush();return buffer.toByteArray();
  }
  private static void outcome(String name,byte[] bytes,boolean valid){
    ClassFile api=ClassFile.of();byte[] original=bytes.clone();List<VerifyError> errors=api.verify(bytes);
    check(errors.isEmpty()==valid,name+" byte outcome "+errors);
    for(VerifyError error:errors)check(error.getClass()==VerifyError.class,name+" error type");
    try{ClassModel model=api.parse(bytes);check(api.verify(model).isEmpty()==valid,name+" model outcome");}
    catch(IllegalArgumentException malformed){check(!valid,name+" unexpected malformed model");}
    check(Arrays.equals(bytes,original),name+" verifier mutated input bytes");completed++;
  }
  private static void ordinary(String name,String descriptor,int locals,int[] code,boolean valid)throws IOException{
    outcome(name,sample(descriptor,8,locals,code),valid);
  }
  private static void stacks()throws IOException{
    ordinary("dup","()Ljava/lang/Object;",0,new int[]{1,89,87,176},true);
    ordinary("dup-x1","()I",2,new int[]{11,3,90,59,68,172},true);
    ordinary("dup-x2-three-oneword","()I",3,new int[]{1,11,3,91,59,68,77,172},true);
    ordinary("dup-x2-wide-below","()F",3,new int[]{9,11,91,67,64,174},true);
    ordinary("dup2-two-oneword","()F",3,new int[]{11,3,92,59,68,61,174},true);
    ordinary("dup2-wide","()D",2,new int[]{14,92,71,175},true);
    ordinary("dup2-x1-three-oneword","()F",4,new int[]{1,11,3,93,59,68,77,62,174},true);
    ordinary("dup2-x1-wide-top","()J",3,new int[]{11,9,93,63,69,173},true);
    ordinary("dup2-x2-four-oneword","()F",5,new int[]{1,3,11,1,94,75,68,61,78,58,4,174},true);
    ordinary("dup2-x2-wide-below","()F",5,new int[]{9,11,3,94,59,68,65,54,4,174},true);
    ordinary("dup2-x2-wide-top","()J",4,new int[]{1,11,9,94,63,69,78,173},true);
    ordinary("dup2-x2-two-wide","()J",4,new int[]{14,9,94,63,73,173},true);
    ordinary("swap","()I",1,new int[]{11,3,95,67,172},true);
    ordinary("invalid-dup-wide","()V",0,new int[]{9,89,177},false);
    ordinary("invalid-dup-x1-wide-below","()V",0,new int[]{9,3,90,177},false);
    ordinary("invalid-dup-x2-wide-top","()V",0,new int[]{11,9,91,177},false);
    ordinary("invalid-dup-x2-third-wide","()V",0,new int[]{9,11,3,91,177},false);
    ordinary("invalid-dup2-mixed-pair","()V",0,new int[]{9,3,92,177},false);
    ordinary("invalid-dup2-x1-wide-below","()V",0,new int[]{14,9,93,177},false);
    ordinary("invalid-dup2-x1-third-wide","()V",0,new int[]{9,11,3,93,177},false);
    ordinary("invalid-dup2-x2-mixed-top-pair","()V",0,new int[]{9,3,94,177},false);
    ordinary("invalid-dup2-x2-mixed-bottom-pair","()V",0,new int[]{14,11,9,94,177},false);
    ordinary("invalid-dup2-x2-fourth-wide","()V",0,new int[]{9,1,11,3,94,177},false);
    ordinary("invalid-swap-wide","()V",0,new int[]{11,9,95,177},false);
    ordinary("invalid-pop2-mixed-pair","()V",0,new int[]{9,3,88,177},false);
    ordinary("invalid-pop-wide","()V",0,new int[]{9,87,177},false);
  }
  private static void arrays()throws IOException{
    int[] stores={84,85,81,82,84,86,79,80},loads={51,52,48,49,51,53,46,47},constants={3,3,11,14,3,3,3,9};
    String[] results={"I","I","F","D","I","I","I","J"};int[] returns={172,172,174,175,172,172,172,173};
    for(int index=0;index<8;index++)ordinary("primitive-array-"+(index+4),"()"+results[index],0,
        new int[]{4,188,index+4,89,3,constants[index],stores[index],3,loads[index],returns[index]},true);
    ordinary("reference-array-store-load","()Ljava/lang/String;",0,new int[]{4,189,0,10,89,3,1,83,3,50,176},true);
    ordinary("aastore-runtime-component-check","(Ljava/lang/Object;)[Ljava/lang/String;",1,new int[]{4,189,0,10,89,3,42,83,176},true);
    ordinary("anewarray-array-component","()[[I",0,new int[]{4,189,0,12,176},true);
    ordinary("multianewarray-full-rank","()[[I",0,new int[]{4,4,197,0,14,2,176},true);
    ordinary("multianewarray-partial-rank","()[[I",0,new int[]{4,197,0,14,1,176},true);
    ordinary("arraylength-primitive","()I",0,new int[]{4,188,10,190,172},true);
    ordinary("arraylength-null","()I",0,new int[]{1,190,172},true);
    ordinary("aaload-null-component","()Ljava/lang/String;",0,new int[]{1,3,50,176},true);
    ordinary("iaload-null-array","()I",0,new int[]{1,3,46,172},true);
    ordinary("invalid-newarray-small-type","()[I",0,new int[]{4,188,3,176},false);
    ordinary("invalid-newarray-large-type","()[I",0,new int[]{4,188,12,176},false);
    ordinary("invalid-multi-zero-dimensions","()[[I",0,new int[]{197,0,14,0,176},false);
    ordinary("invalid-multi-excess-dimensions","()[[I",0,new int[]{4,4,4,197,0,14,3,176},false);
    ordinary("invalid-multi-nonarray-type","()Ljava/lang/String;",0,new int[]{4,197,0,10,1,176},false);
    ordinary("invalid-reference-array-cp-tag","()[Ljava/lang/String;",0,new int[]{4,189,0,9,176},false);
    ordinary("invalid-wide-load-component","()J",0,new int[]{4,188,10,3,47,173},false);
    ordinary("invalid-reference-load-primitive","()Ljava/lang/Object;",0,new int[]{4,188,10,3,50,176},false);
    ordinary("invalid-aastore-uninitialized-value","()[Ljava/lang/String;",0,new int[]{4,189,0,10,89,3,187,0,4,83,176},false);
    ordinary("invalid-arraylength-nonarray","(Ljava/lang/Object;)I",1,new int[]{42,190,172},false);
    ordinary("invalid-array-index-type","()I",0,new int[]{4,188,10,11,46,172},false);
    ordinary("invalid-byte-load-int-array","()I",0,new int[]{4,188,10,3,51,172},false);
  }
  private static void typesAndConstructors()throws IOException{
    ordinary("checkcast","(Ljava/lang/Object;)Ljava/lang/String;",1,new int[]{42,192,0,10,176},true);
    ordinary("instanceof","(Ljava/lang/Object;)I",1,new int[]{42,193,0,10,172},true);
    ordinary("invalid-uninitialized-checkcast","()Ljava/lang/String;",0,new int[]{187,0,4,192,0,10,176},false);
    ordinary("invalid-uninitialized-instanceof","()I",0,new int[]{187,0,4,193,0,10,172},false);
    ordinary("uninitialized-monitor-reference","()V",0,new int[]{187,0,4,89,194,195,177},true);
    ordinary("invalid-primitive-monitor","()V",0,new int[]{3,194,177},false);
    outcome("uninitialized-null-branch",sample("()V",1,0,new int[]{187,0,4,199,0,4,0,177},
        frames(7,new int[0],new int[0]),new int[0][],false),true);
    outcome("uninitialized-reference-comparison",sample("()V",2,0,new int[]{187,0,4,89,165,0,4,0,177},
        frames(8,new int[0],new int[0]),new int[0][],false),true);
    int[] code={187,0,26,89,76,26,183,0,29,43,176,77,1,176};
    outcome("protected-new-constructor",sample("(I)Ljava/lang/Object;",2,3,code,
        frames(11,new int[]{1},new int[]{7,31}),new int[][]{{0,9,11,31}},false),true);
    outcome("failed-constructor-alias-must-be-top",sample("(I)Ljava/lang/Object;",2,3,code,
        frames(11,new int[]{1,8,0},new int[]{7,31}),new int[][]{{6,9,11,31}},false),false);
    outcome("failed-constructor-alias-cannot-be-reused",sample("(I)Ljava/lang/Object;",2,3,
        new int[]{187,0,26,89,76,26,183,0,29,43,176,77,43,176},
        frames(11,new int[]{1},new int[]{7,31}),new int[][]{{6,9,11,31}},false),false);
    outcome("protected-super-init-unrepresentable-flag",sample("()V",1,1,new int[]{42,183,0,20,177,191},
        frames(5,new int[0],new int[]{7,22}),new int[][]{{0,4,5,0}},true),false);
    outcome("constructor-before-init-handler",sample("()V",1,1,new int[]{1,191,191},
        frames(2,new int[]{6},new int[]{7,22}),new int[][]{{0,2,2,0}},true),true);
  }
  private static void disconnected()throws IOException{
    outcome("unreachable-missing-frame",sample("()I",1,0,new int[]{4,172,3,172}),false);
    outcome("unreachable-explicit-frame",sample("()I",1,0,new int[]{4,172,3,172},
        frames(2,new int[0],new int[0]),new int[0][],false),true);
    outcome("unreachable-explicit-stack-state",sample("()I",1,0,new int[]{4,172,172},
        frames(2,new int[0],new int[]{1}),new int[0][],false),true);
    outcome("unreachable-wrong-stack-state",sample("()I",1,0,new int[]{4,172,172},
        frames(2,new int[0],new int[]{2}),new int[0][],false),false);
    outcome("unreachable-empty-stack-state",sample("()I",1,0,new int[]{4,172,172},
        frames(2,new int[0],new int[0]),new int[0][],false),false);
  }
  private static byte[] generated(ClassFile api,Consumer<CodeBuilder> body){
    return api.build(ClassDesc.of("GeneratedInstructionFlow"),b->b.withMethodBody("test",MethodTypeDesc.ofDescriptor("()I"),
        ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC,body));
  }
  private static CodeAttribute code(ClassFile api,byte[] bytes){return (CodeAttribute)api.parse(bytes).methods().get(0).code().get();}
  private static void generation(){
    ClassFile api=ClassFile.of();
    byte[] patched=generated(api,c->{Label live=c.newLabel();c.goto_(live).iconst_0().ireturn().labelBinding(live).bipush(7).ireturn();});
    CodeAttribute patchedCode=code(api,patched);
    check(api.verify(patched).isEmpty()&&Arrays.equals(patchedCode.codeArray(),new byte[]{(byte)167,0,5,0,(byte)191,16,7,(byte)172})&&
        patchedCode.maxStack()==1,"Actual native-shaped dead-code patch bytes");completed++;
    try{generated(api.withOptions(ClassFile.DeadCodeOption.KEEP_DEAD_CODE),
      c->{Label live=c.newLabel();c.goto_(live).iconst_0().ireturn().labelBinding(live).bipush(7).ireturn();});
      throw new AssertionError("KEEP automatic frames must report unreachable code");}
    catch(IllegalArgumentException expected){completed++;}
    byte[] retained=generated(api.withOptions(ClassFile.DeadCodeOption.KEEP_DEAD_CODE,ClassFile.StackMapsOption.DROP_STACK_MAPS),
      c->c.bipush(7).ireturn().iconst_0().ireturn());
    check(Arrays.equals(code(api,retained).codeArray(),new byte[]{16,7,(byte)172,3,(byte)172})&&!api.verify(retained).isEmpty(),
      "KEEP plus DROP retains bytes, never defines invalid artifact");completed++;
    byte[] deadHandler=generated(api,c->{Label live=c.newLabel();c.goto_(live);Label start=c.newBoundLabel();c.iconst_0().ireturn();
      Label end=c.newBoundLabel(),handler=c.newBoundLabel();c.pop().iconst_1().ireturn().labelBinding(live).bipush(7).ireturn().exceptionCatchAll(start,end,handler);});
    check(api.verify(deadHandler).isEmpty()&&code(api,deadHandler).exceptionHandlers().isEmpty(),"Dead-only protected range must disappear");completed++;
    byte[] splitHandler=generated(api,c->{Label start=c.newBoundLabel(),live=c.newLabel();c.goto_(live).nop().nop().labelBinding(live).iconst_0().ireturn();
      Label end=c.newBoundLabel(),handler=c.newBoundLabel();c.pop().iconst_1().ireturn().exceptionCatchAll(start,end,handler);});
    CodeAttribute split=code(api,splitHandler);
    check(api.verify(splitHandler).isEmpty()&&split.exceptionHandlers().size()==2&&
      split.labelToBci(split.exceptionHandlers().get(0).tryStart())==0&&split.labelToBci(split.exceptionHandlers().get(0).tryEnd())==3&&
      split.labelToBci(split.exceptionHandlers().get(1).tryStart())==5&&split.labelToBci(split.exceptionHandlers().get(1).tryEnd())==7,
      "Dead interior must split protected range in order");completed++;
  }
  private static void arithmetic()throws IOException{
    ordinary("unary-negation-stack","()I",0,new int[]{4,116,4,96,172},true);
    ordinary("long-shift-stack","()J",0,new int[]{10,4,121,10,97,173},true);
    ordinary("invalid-arithmetic-operand","()I",0,new int[]{11,3,96,172},false);
    ordinary("invalid-long-shift-distance","()J",0,new int[]{9,9,121,173},false);
  }
  public static void main(String[] arguments)throws Exception{
    stacks();arrays();typesAndConstructors();disconnected();generation();arithmetic();
    check(completed==82,"Incomplete instruction flow diagnostics: "+completed);
    System.out.println("CLASSFILE_INSTRUCTION_FLOW_REGRESSION_OK|82");
  }
}
