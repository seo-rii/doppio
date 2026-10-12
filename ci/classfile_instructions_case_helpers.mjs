const p='java.lang.classfile.';
export const cb='Ljava/lang/classfile/ClassBuilder;',code='Ljava/lang/classfile/CodeBuilder;',text='Ljava/lang/String;',
  cd='Ljava/lang/constant/ClassDesc;',mt='Ljava/lang/constant/MethodTypeDesc;',consumer='Ljava/util/function/Consumer;',
  cpb='Ljava/lang/classfile/constantpool/ConstantPoolBuilder;',opcode='Ljava/lang/classfile/Opcode;',
  resolver='Ljava/lang/classfile/ClassHierarchyResolver;',info='Ljava/lang/classfile/ClassHierarchyResolver$ClassHierarchyInfo;';
export const op=(owner,name,descriptor,static_=false,interface_=true)=>({opcode:static_?'invokestatic':name==='<init>'?'invokespecial':interface_?'invokeinterface':'invokevirtual',tag:interface_?11:10,owner,name,descriptor});
export const api=(owner,name,descriptor,static_=false)=>op(p+owner,name,descriptor,static_);
export const probe=(method,descriptor,operands)=>({method,descriptor,requiredOpcodes:[...new Set(operands.map(item=>item.opcode))],symbolicOperands:operands});
export const callback=(method,parameter,operands)=>probe(method,'('+parameter+')V',operands);
export const flags=api('ClassBuilder','withFlags','(I)'+cb),body=api('ClassBuilder','withMethodBody','('+text+mt+'I'+consumer+')'+cb),
  withElement=api('CodeBuilder','with','(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;');
export const member=(name,descriptor,opcodes,flags=9)=>({name,descriptor,flags,opcodes});
export const out=(id,name,methods,{definition='define-and-invoke',branches=false,interfaces=[],fields=[],handlers=false}={})=>({id,kind:definition==='forbidden'?'invalid-controlflow':'valid-generated',className:'classes.modern_test.'+name,
  major:69,minor:0,flags:33,definition,interfaces,fields,methods,sourceFile:null,branches,handlers});
export const entry=(id,method,trace,callbacks,artifact,{probes=[],forced=false}={})=>({id,entryMethod:method,entryDescriptor:'()V',trace:[trace],callbackMethods:callbacks,artifacts:artifact?[artifact]:[],probes:[probe(method,'()V',[
  ...(artifact?[api('ClassFile','build','('+cd+consumer+')[B'),api('ClassFile','verify','([B)Ljava/util/List;'),
    op('classes.modern_test.ClassFileSupport','artifact','('+text+text+'[B)V',true,false),
    ...(artifact.definition==='forbidden'?[]:[op('java.lang.invoke.MethodHandles$Lookup','defineClass','([B)Ljava/lang/Class;',false,false)])]:[]),
  op('classes.modern_test.ClassFileSupport','emit','('+text+text+')V',true,false)]),...probes],oracleKind:'specification',anchors:{JVMS:['4.7.3','4.7.4','4.9.2','4.10.1.2','6.5']},primarySources:[
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeBuilder.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/Opcode.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/ArrayLoadInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/ArrayStoreInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/NewPrimitiveArrayInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/NewReferenceArrayInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/NewMultiArrayInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/OperatorInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/StackInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/ConvertInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/MonitorInstruction.html',
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/TypeCheckInstruction.html'],limitations:[
    'Selected C7d2 modern instruction/frame profile, not full C7 or all JVM/version/API conformance.',
    'Unchanged original javac25 public API sources and host-produced bytes; Java21 final API absence is non-applicability.',
    'Selected all primitive/reference array operations, arithmetic/stack/member/monitor and long-branch/dead-code/initialization-frame recipes.',
    'No arbitrary hierarchy completeness, obsolete jsr/ret, every public convenience API/debug/annotation/signature/version or byte-for-byte native parity claim.',
    'Pure public verification is separate from same-byte host definition/invocation; invalid output is never defined.'
  ]});
export function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const group=(id,name,marker,cases,{additional=[]}={})=>freeze({id,source:'classes/modern_fixture/'+name+'.java',mainClass:'classes.modern_test.'+name,
  completionMarker:marker,releases:[25],javacFlags:['-g:source'],additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames:['classes.modern_test.'+name,...additional.map(x=>'classes.modern_test.'+x),'classes.modern_test.ClassFileSupport'],resourceClassNames:[],cases});

