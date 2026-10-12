const p='java.lang.classfile.';
export const cb='Ljava/lang/classfile/ClassBuilder;',code='Ljava/lang/classfile/CodeBuilder;',field='Ljava/lang/classfile/FieldBuilder;',
  method='Ljava/lang/classfile/MethodBuilder;',text='Ljava/lang/String;',cd='Ljava/lang/constant/ClassDesc;',mt='Ljava/lang/constant/MethodTypeDesc;',
  cpb='Ljava/lang/classfile/constantpool/ConstantPoolBuilder;',utf='Ljava/lang/classfile/constantpool/Utf8Entry;',consumer='Ljava/util/function/Consumer;';
export const op=(owner,name,descriptor,static_=false,interface_=true)=>({opcode:static_?'invokestatic':interface_?'invokeinterface':'invokevirtual',
  tag:interface_?11:10,owner,name,descriptor});
export const api=(owner,name,descriptor,static_=false)=>op(p+owner,name,descriptor,static_);
export const probe=(method,descriptor,operands,extra={})=>({method,descriptor,requiredOpcodes:[...new Set(operands.map(item=>item.opcode))],symbolicOperands:operands,...extra});
export const callback=(method,parameter,operands)=>probe(method,'('+parameter+')V',operands);
export const flags=api('ClassBuilder','withFlags','(I)'+cb),body=api('ClassBuilder','withMethodBody','('+text+mt+'I'+consumer+')'+cb),
  withElement=owner=>api(owner,'with','(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;');
export const member=(name,descriptor,opcodes,flags=9)=>({name,descriptor,flags,opcodes});
export const out=(id,name,methods,{flags=33,fields=[],sourceFile=null,branches=false}={})=>({id,kind:'valid-generated',className:'classes.modern_test.'+name,
  major:69,minor:0,flags,definition:'define-and-invoke',fields,methods,sourceFile,branches,handlers:false});
export const entry=(id,method,trace,callbacks,artifact,{origin='public-build',probes=[],codecs=[]}={})=>({id,entryMethod:method,entryDescriptor:'()V',trace:[trace],
  callbackMethods:[...callbacks,...codecs],artifacts:artifact?[artifact]:[],probes:[probe(method,'()V',[
    ...(artifact?[api('ClassFile',origin==='public-transform'?'transformClass':'build',origin==='public-transform'?
      '(Ljava/lang/classfile/ClassModel;'+cd+'Ljava/lang/classfile/ClassTransform;)[B':'('+cd+consumer+')[B'),
      api('ClassFile','verify','([B)Ljava/util/List;'),
      op('classes.modern_test.ClassFileSupport','artifact','('+text+text+'[B)V',true,false),
      op('java.lang.invoke.MethodHandles$Lookup','defineClass','([B)Ljava/lang/Class;',false,false)]:[]),
    op('classes.modern_test.ClassFileSupport','emit','('+text+text+')V',true,false)]),...probes],
  oracleKind:'specification',anchors:{JVMS:['4.4','4.7','4.9.2','4.10.1','6.5']},primarySources:[
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/AttributeMapper.html',
    'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/constantpool/ConstantPoolBuilder.html'],
  limitations:[
    'Finite original javac25 public API recipes; Java21 final-API absence remains explicitly not applicable.',
    'Each host returns and transports its own public API byte array; native bytes never substitute for guest output.',
    'Pure Java public verify is checked before separate same-byte VM definition/invocation; descriptor-only dynamics do not prove arbitrary bootstrap resolution.',
    'Selected typed metadata, custom STATELESS/CP_REFS codecs and fresh-pool imports do not prove all attributes or signature-tree parsing.',
    'Unknown unsafe opaque NEW_POOL payloads, general hierarchy resolution, full verifier/API/source-unit conformance and named modules remain unclaimed.'
  ]});
export function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const group=(id,name,marker,cases,{nested=[],target=null}={})=>freeze({id,source:'classes/modern_fixture/'+name+'.java',mainClass:'classes.modern_test.'+name,
  completionMarker:marker,releases:[25],javacFlags:['-g:source'],additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames:['classes.modern_test.'+name,...nested.map(suffix=>'classes.modern_test.'+name+'$'+suffix),...(target?['classes.modern_test.'+target]:[]),'classes.modern_test.ClassFileSupport'],
  resourceClassNames:target?['classes.modern_test.'+target]:[],cases});
