import {api,op,probe,callback,entry,out,member,group,cb,code,cpb,cd,mt,text,flags,body} from './classfile_extended_case_helpers.mjs';
const constant=api('CodeBuilder','ldc','(Ljava/lang/constant/ConstantDesc;)'+code);
const build=(name,ops=[body])=>callback('build'+name,cb,ops);
const pool=api('CodeBuilder','constantPool','()'+cpb);
const bsm=api('constantpool.ConstantPoolBuilder','bsmEntry','(Ljava/lang/constant/DirectMethodHandleDesc;Ljava/util/List;)Ljava/lang/classfile/BootstrapMethodEntry;');
const dynamic=api('constantpool.ConstantPoolBuilder','constantDynamicEntry','(Ljava/lang/classfile/BootstrapMethodEntry;Ljava/lang/classfile/constantpool/NameAndTypeEntry;)Ljava/lang/classfile/constantpool/ConstantDynamicEntry;');
const value=()=>member('value','()I',['bipush','ireturn']);
const cases=[
  entry('cf-bootstrap-handle-type','caseHandleAndTypeEntries','CP15=REF_invokeStatic:Math.abs(I)I;CP16=(I)I;load=typed;abs(-8)=8;verify=empty;defined/invoked=same-bytes',[
    build('Handles'),callback('codeHandle',code,[pool,api('constantpool.ConstantPoolBuilder','methodHandleEntry','(ILjava/lang/classfile/constantpool/MemberRefEntry;)Ljava/lang/classfile/constantpool/MethodHandleEntry;')]),
    callback('codeType',code,[pool,api('constantpool.ConstantPoolBuilder','methodTypeEntry','('+mt+')Ljava/lang/classfile/constantpool/MethodTypeEntry;')])],
    out('bootstrap-handles','C7cHandles',[member('handle','()Ljava/lang/invoke/MethodHandle;',['ldc','areturn']),member('type','()Ljava/lang/invoke/MethodType;',['ldc','areturn'])])),
  entry('cf-bootstrap-arguments-dedup','caseBootstrapArguments','BootstrapMethods=1;dedup=semantic;argument-tags=8/3/5/6/16/7/15;ordered=7;resolution=not-requested;verify=empty;defined/invoked=same-bytes',[
    build('BootstrapArguments',[body,api('constantpool.ConstantPoolBuilder','bsmEntry','(Ljava/lang/classfile/constantpool/MethodHandleEntry;Ljava/util/List;)Ljava/lang/classfile/BootstrapMethodEntry;')]),
    callback('codeValue',code,[api('CodeBuilder','bipush','(I)'+code),api('CodeBuilder','ireturn','()'+code)])],out('bootstrap-arguments','C7cBootstrapArguments',[value()])),
  entry('cf-bootstrap-condy-null','caseCondyNull','CP17=nullValue:Ljava/lang/String;;bootstrap=nullConstant;typed=REFERENCE;resolved=null;verify=empty;defined/invoked=same-bytes',[
    build('Null'),callback('codeNull',code,[bsm,dynamic,api('CodeBuilder','ldc','(Ljava/lang/classfile/constantpool/LoadableConstantEntry;)'+code)])],
    out('bootstrap-condy-null','C7cCondyNull',[member('value','()Ljava/lang/String;',['ldc','areturn'])])),
  entry('cf-bootstrap-condy-int','caseCondyInt','CP17=integerValue:I;nominal=DynamicConstantDesc;bootstrap=explicitCast;resolved=42;verify=empty;defined/invoked=same-bytes',[
    build('Int'),callback('codeInt',code,[op('java.lang.constant.DynamicConstantDesc','ofNamed','(Ljava/lang/constant/DirectMethodHandleDesc;'+text+cd+'[Ljava/lang/constant/ConstantDesc;)Ljava/lang/constant/DynamicConstantDesc;',true,false),constant])],
    out('bootstrap-condy-int','C7cCondyInt',[member('value','()I',['ldc','ireturn'])])),
  entry('cf-bootstrap-condy-wide','caseCondyWide','CP17=longValue:J/doubleValue:D;ldc2_w=2;max_stack=2/2;bootstrap=explicitCast;resolved=9000000000/3.5;verify=empty;defined/invoked=same-bytes',[
    build('Wide'),callback('codeLong',code,[api('constantpool.ConstantPoolBuilder','constantDynamicEntry','(Ljava/lang/constant/DynamicConstantDesc;)Ljava/lang/classfile/constantpool/ConstantDynamicEntry;'),
      api('instruction.ConstantInstruction','ofLoad','(Ljava/lang/classfile/Opcode;Ljava/lang/classfile/constantpool/LoadableConstantEntry;)Ljava/lang/classfile/instruction/ConstantInstruction$LoadConstantInstruction;',true)]),
    callback('codeDouble',code,[constant,api('CodeBuilder','dreturn','()'+code)])],
    out('bootstrap-condy-wide','C7cCondyWide',[member('longValue','()J',['ldc2_w','lreturn']),member('doubleValue','()D',['ldc2_w','dreturn'])])),
  entry('cf-bootstrap-invokedynamic-entry','caseInvokeDynamicEntry','CP18=makeConcatWithConstants:(I)Ljava/lang/String;;typed-InvokeDynamicEntry;operand-padding=00/00;resolved=v=7;verify=empty;defined/invoked=same-bytes',[
    build('IndyEntry'),callback('codeIndyEntry',code,[bsm,api('constantpool.ConstantPoolBuilder','invokeDynamicEntry','(Ljava/lang/classfile/BootstrapMethodEntry;Ljava/lang/classfile/constantpool/NameAndTypeEntry;)Ljava/lang/classfile/constantpool/InvokeDynamicEntry;'),
      api('CodeBuilder','invokedynamic','(Ljava/lang/classfile/constantpool/InvokeDynamicEntry;)'+code)])],
    out('bootstrap-indy-entry','C7cIndyEntry',[member('concat','(I)Ljava/lang/String;',['iload_0','invokedynamic','areturn'])])),
  entry('cf-bootstrap-invokedynamic-nominal','caseInvokeDynamicNominal','CP18=makeConcatWithConstants:(I)Ljava/lang/String;;DynamicCallSiteDesc=round-tripped;resolved=nom=-3;verify=empty;defined/invoked=same-bytes',[
    build('IndyNominal'),callback('codeIndyNominal',code,[op('java.lang.constant.DynamicCallSiteDesc','of','(Ljava/lang/constant/DirectMethodHandleDesc;'+text+mt+'[Ljava/lang/constant/ConstantDesc;)Ljava/lang/constant/DynamicCallSiteDesc;',true,false),
      api('CodeBuilder','invokedynamic','(Ljava/lang/constant/DynamicCallSiteDesc;)'+code)])],
    out('bootstrap-indy-nominal','C7cIndyNominal',[member('concat','(I)Ljava/lang/String;',['iload_0','invokedynamic','areturn'])])),
  entry('cf-bootstrap-original-typed','caseOriginalTypedBootstraps','unchanged-javac25=ClassFileBootstrapTarget;CP18=1;BootstrapMethods=1;recipe=original-control-U0001;typed-model=verified;generated-bytes=none',[],null,{probes:[
    probe('caseOriginalTypedBootstraps','()V',[api('constantpool.ConstantPool','bootstrapMethodEntry','(I)Ljava/lang/classfile/BootstrapMethodEntry;'),
      api('ClassFile','verify','(Ljava/lang/classfile/ClassModel;)Ljava/util/List;')])]} )
];
export const classfileBootstrapGroup=group('classfile-bootstrap','ClassFileBootstrapFinal','CLASSFILE_BOOTSTRAP_OK',cases,{target:'ClassFileBootstrapTarget'});
export default classfileBootstrapGroup;
