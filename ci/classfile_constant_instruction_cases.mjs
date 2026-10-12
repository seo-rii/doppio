import {api,probe,callback,entry,out,member,group,cb,code,opcode,body,flags,withElement} from './classfile_hierarchy_case_helpers.mjs';
const factory='instruction.ConstantInstruction',intrinsic='Ljava/lang/classfile/instruction/ConstantInstruction$IntrinsicConstantInstruction;',
  argument='Ljava/lang/classfile/instruction/ConstantInstruction$ArgumentConstantInstruction;',load='Ljava/lang/classfile/instruction/ConstantInstruction$LoadConstantInstruction;';
const build=name=>callback('build'+name,cb,[body]);
const intrinsicCode=(name,return_=null)=>callback('code'+name,code,[api(factory,'ofIntrinsic','('+opcode+')'+intrinsic,true),withElement,...(return_?[api('CodeBuilder',return_,'()'+code)]:[])]);
const argumentCode=name=>callback('code'+name,code,[api(factory,'ofArgument','('+opcode+'I)'+argument,true),withElement,api('CodeBuilder','ireturn','()'+code),
  ...(name==='ByteNegative'?[api(factory+'$ArgumentConstantInstruction','constantValue','()Ljava/lang/Integer;'),api(factory,'constantValue','()Ljava/lang/constant/ConstantDesc;')]:[])]);
const loadCode=name=>callback('code'+name,code,[api(factory,'ofLoad','('+opcode+'Ljava/lang/classfile/constantpool/LoadableConstantEntry;)'+load,true),withElement]);
const cases=[
  entry('cf-constant-intrinsic-integers','caseIntrinsicIntegers','ofIntrinsic=typed-IntrinsicConstantInstruction;ICONST_M1/0/5=-1/0/5;typeKind=INT;verify=empty;defined/invoked=same-bytes',[
    build('Integers'),intrinsicCode('MinusOne','ireturn'),intrinsicCode('Zero','ireturn'),intrinsicCode('Five','ireturn')],
    out('constant-integers','C7dIntrinsicInts',[member('minusOne','()I',['iconst_m1','ireturn']),member('zero','()I',['iconst_0','ireturn']),member('five','()I',['iconst_5','ireturn'])])),
  entry('cf-constant-intrinsic-wide','caseIntrinsicWide','ofIntrinsic=LCONST_1/FCONST_2/DCONST_1;values=1/2/1;max_stack=2/1/2;verify=empty;defined/invoked=same-bytes',[
    build('Wide'),intrinsicCode('LongOne','lreturn'),intrinsicCode('FloatTwo','freturn'),intrinsicCode('DoubleOne','dreturn')],
    out('constant-wide','C7dIntrinsicWide',[member('longValue','()J',['lconst_1','lreturn']),member('floatValue','()F',['fconst_2','freturn']),member('doubleValue','()D',['dconst_1','dreturn'])])),
  entry('cf-constant-intrinsic-null','caseIntrinsicNull','ofIntrinsic=ACONST_NULL;constantValue=ConstantDescs.NULL;typeKind=REFERENCE;resolved=null;verify=empty;defined/invoked=same-bytes',[
    build('Null'),intrinsicCode('Null','areturn')],out('constant-null','C7dIntrinsicNull',[member('value','()Ljava/lang/Object;',['aconst_null','areturn'])])),
  entry('cf-constant-argument-byte','caseArgumentByte','ofArgument=BIPUSH;covariant=Integer;parent-bridge=ConstantDesc;bounds=-128/127;verify=empty;defined/invoked=same-bytes',[
    build('Bipush'),argumentCode('ByteNegative'),argumentCode('BytePositive')],out('constant-byte','C7dArgumentByte',[
      member('negative','()I',['bipush','ireturn']),member('positive','()I',['bipush','ireturn'])])),
  entry('cf-constant-argument-short','caseArgumentShort','ofArgument=SIPUSH;typed-ArgumentConstantInstruction;bounds=-32768/32767;verify=empty;defined/invoked=same-bytes',[
    build('Sipush'),argumentCode('ShortNegative'),argumentCode('ShortPositive')],out('constant-short','C7dArgumentShort',[
      member('negative','()I',['sipush','ireturn']),member('positive','()I',['sipush','ireturn'])])),
  entry('cf-constant-numeric-loads','caseNumericLoads','ofLoad=typed-LoadConstantInstruction;constantEntry=typed;tags=3/5/4/6;values=42/1234567890123/1.25/2.5;verify=empty;defined/invoked=same-bytes',[
    build('NumericLoads'),loadCode('IntLoad'),loadCode('LongLoad'),loadCode('FloatLoad'),loadCode('DoubleLoad')],out('constant-numeric-loads','C7dNumericLoads',[
      member('intValue','()I',['ldc','ireturn']),member('longValue','()J',['ldc2_w','lreturn']),member('floatValue','()F',['ldc','freturn']),member('doubleValue','()D',['ldc2_w','dreturn'])])),
  entry('cf-constant-reference-loads','caseReferenceLoads','ofLoad=ClassEntry/StringEntry;tags=7/8;values=String.class/typed-constant;verify=empty;defined/invoked=same-bytes',[
    build('ReferenceLoads'),loadCode('ClassLoad'),loadCode('StringLoad')],out('constant-reference-loads','C7dReferenceLoads',[
      member('classValue','()Ljava/lang/Class;',['ldc','areturn']),member('stringValue','()Ljava/lang/String;',['ldc','areturn'])])),
  entry('cf-constant-factory-validation','caseFactoryValidation','wrong-opcodes/ranges/null=10-original-exceptions;ofArgument-null=IllegalArgumentException;ofLoad-opcode-before-entry;generated-bytes=none',[],null,{probes:[probe('caseFactoryValidation','()V',[
    api(factory,'ofIntrinsic','('+opcode+')'+intrinsic,true),api(factory,'ofArgument','('+opcode+'I)'+argument,true),api(factory,'ofLoad','('+opcode+'Ljava/lang/classfile/constantpool/LoadableConstantEntry;)'+load,true)])]})
];
export const classfileConstantInstructionGroup=group('classfile-constant-instruction','ClassFileConstantInstructionFinal','CLASSFILE_CONSTANT_INSTRUCTION_OK',cases);
export default classfileConstantInstructionGroup;
