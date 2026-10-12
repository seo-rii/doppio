const pkg='java.lang.classfile.', owner='classes.modern_test.ClassFileControlFlowFinal', support='classes.modern_test.ClassFileSupport';
const text='Ljava/lang/String;', cls='Ljava/lang/Class;', cd='Ljava/lang/constant/ClassDesc;',
  cb='Ljava/lang/classfile/ClassBuilder;', code='Ljava/lang/classfile/CodeBuilder;',
  consumer='Ljava/util/function/Consumer;', mt='Ljava/lang/constant/MethodTypeDesc;', label='Ljava/lang/classfile/Label;';
const op=(type,name,descriptor,static_=false,interface_=true)=>({opcode:static_?'invokestatic':interface_?'invokeinterface':'invokevirtual',
  tag:interface_?11:10,owner:type,name,descriptor});
const cf=(name,descriptor,static_=false)=>op(pkg+'ClassFile',name,descriptor,static_);
const b=(name,descriptor)=>op(pkg+'ClassBuilder',name,descriptor);
const c=(name,descriptor)=>op(pkg+'CodeBuilder',name,descriptor);
const probe=(method,descriptor,symbolicOperands)=>({method,descriptor,requiredOpcodes:[...new Set(symbolicOperands.map(x=>x.opcode))],symbolicOperands});
const callback=(method,parameter,operands)=>probe(method,'('+parameter+')V',operands);
const flags=b('withFlags','(I)'+cb), body=b('withMethodBody','('+text+mt+'I'+consumer+')'+cb);
const build=cf('build','('+cd+consumer+')[B'), verify=cf('verify','([B)Ljava/util/List;');
const define=op('java.lang.invoke.MethodHandles$Lookup','defineClass','([B)'+cls,false,false);
const artifact=op(support,'artifact','('+text+text+'[B)V',true,false), emit=op(support,'emit','('+text+text+')V',true,false);
const invoke=descriptor=>op('java.lang.invoke.MethodHandle','invokeExact',descriptor,false,false);
const method=(name,descriptor,opcodes,flags=9)=>({name,descriptor,flags,opcodes});
const generated=(id,name,methods,handlers=false)=>({id,kind:'valid-generated',className:'classes.modern_test.'+name,
  major:69,minor:0,flags:0x21,definition:'define-and-invoke',fields:[],methods,sourceFile:null,branches:!handlers,handlers});
const sources=['CodeBuilder','ClassFile','instruction/BranchInstruction','instruction/TableSwitchInstruction',
  'instruction/LookupSwitchInstruction','instruction/ExceptionCatch','attribute/StackMapTableAttribute'].map(type=>
  'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/'+type+'.html');
const limitations=[
  'Finite original public Java25 label/branch/switch/ordered-handler recipes; Java21 is explicitly not applicable.',
  'Both predicate edges, all selected switch arms/defaults and selected thrown/caught alternatives execute same host-produced bytes.',
  'Short-branch overflow rewriting, dead-code policies, general hierarchy resolution and complete stack-map/verifier coverage remain unclaimed.',
  'Raw outputs retain their own host bytes; canonical Code/CFG and expanded frame vectors allow encoding differences, not native substitution.',
  'Foreign labels reject with the pinned native IllegalStateException; unbound and duplicate labels reject with IllegalArgumentException.',
  'Full LIB-007/JVM source-unit, public API, sealed-interface topology, all attributes/opcodes/versions and named modules remain unclaimed.'
];
const entry=(id,methodName,trace,callbacks,contract,extra=[])=>({id,entryMethod:methodName,entryDescriptor:'()V',trace:[trace],
  probes:[probe(methodName,'()V',[cf('of','()Ljava/lang/classfile/ClassFile;',true),build,
    ...(contract?[verify,artifact,define]:[]),...extra,emit])],callbackMethods:callbacks,artifacts:contract?[contract]:[],
  oracleKind:'specification',anchors:{JVMS:['4.7.3','4.7.4','4.9.2','4.10.1','6.5']},primarySources:sources,limitations});
const helper=probe('codePredicate','('+code+'Ljava/lang/classfile/Opcode;IZ)V',[
  c('newLabel','()'+label),c('branch','(Ljava/lang/classfile/Opcode;'+label+')'+code),c('goto_w','('+label+')'+code),
  c('goto_','('+label+')'+code),c('labelBinding','('+label+')'+code),c('ireturn','()'+code)]);
const delegates=names=>names.map(name=>callback(name,code,[op(owner,'codePredicate','('+code+'Ljava/lang/classfile/Opcode;IZ)V',true,false)]));
const names=['eq','ne','lt','ge','gt','le'];
const cases=[
  entry('cf-flow-zero-predicates','caseZeroPredicates',
    'ifeq/ne/lt/ge/gt/le=010/101/100/011/001/110;goto_w=executed;verify=empty;defined/invoked=same-bytes',
    [callback('buildZero',cb,[flags,body]),...delegates(['codeEq','codeNe','codeLt','codeGe','codeGt','codeLe']),helper],
    generated('flow-zero','CfFlowZero',names.map((name,i)=>method(name,'(I)I',['iload_0',
      ['ifeq','ifne','iflt','ifge','ifgt','ifle'][i],'iconst_0',i===0?'goto_w':'goto','iconst_1','ireturn']))),[invoke('(I)I')]),
  entry('cf-flow-int-predicates','caseIntPredicates',
    'if_icmpeq/ne/lt/ge/gt/le=010/101/100/011/001/110;both-edges=executed;verify=empty;defined/invoked=same-bytes',
    [callback('buildIntCompare',cb,[flags,body]),...delegates(['codeIntEq','codeIntNe','codeIntLt','codeIntGe','codeIntGt','codeIntLe']),helper],
    generated('flow-int','CfFlowIntCompare',names.map((name,i)=>method(name,'(II)I',['iload_0','iload_1',
      ['if_icmpeq','if_icmpne','if_icmplt','if_icmpge','if_icmpgt','if_icmple'][i],'iconst_0','goto','iconst_1','ireturn']))),[invoke('(II)I')]),
  entry('cf-flow-reference-predicates','caseReferencePredicates',
    'ifnull/nonnull=10/01;if_acmpeq/ne=10/01;identity-not-equals=exact;verify=empty;defined/invoked=same-bytes',
    [callback('buildReferences',cb,[flags,body]),...delegates(['codeNull','codeNonNull','codeSame','codeDifferent']),helper],
    generated('flow-reference','CfFlowReference',[
      method('isNull','(Ljava/lang/Object;)I',['aload_0','ifnull','iconst_0','goto','iconst_1','ireturn']),
      method('nonNull','(Ljava/lang/Object;)I',['aload_0','ifnonnull','iconst_0','goto','iconst_1','ireturn']),
      method('same','(Ljava/lang/Object;Ljava/lang/Object;)I',['aload_0','aload_1','if_acmpeq','iconst_0','goto','iconst_1','ireturn']),
      method('different','(Ljava/lang/Object;Ljava/lang/Object;)I',['aload_0','aload_1','if_acmpne','iconst_0','goto','iconst_1','ireturn'])]),
    [invoke('(Ljava/lang/Object;)I'),invoke('(Ljava/lang/Object;Ljava/lang/Object;)I')]),
  entry('cf-flow-backward-loop','caseBackwardLoop',
    'backward-goto=executed;locals=0/1;sum(0/5/-2)=0/15/0;verify=empty;defined/invoked=same-bytes',
    [callback('buildLoop',cb,[flags,body]),callback('codeLoop',code,[c('newLabel','()'+label),c('istore','(I)'+code),
      c('ifle','('+label+')'+code),c('isub','()'+code),c('goto_','('+label+')'+code),c('labelBinding','('+label+')'+code)])],
    generated('flow-loop','CfFlowLoop',[method('sum','(I)I',['iconst_0','istore_1','iload_0','ifle','iload_1','iload_0','iadd',
      'istore_1','iload_0','iconst_1','isub','istore_0','goto','iload_1','ireturn'])]),[invoke('(I)I')]),
  entry('cf-flow-table-switch','caseTableSwitch',
    'tableswitch=-1..1;arms=11/22/33;default-below/above=44/44;padding=decoded;verify=empty;defined/invoked=same-bytes',
    [callback('buildTable',cb,[flags,body]),callback('codeTable',code,[c('tableswitch','(II'+label+'Ljava/util/List;)'+code),
      op(pkg+'instruction.SwitchCase','of','(I'+label+')Ljava/lang/classfile/instruction/SwitchCase;',true),c('labelBinding','('+label+')'+code)])],
    generated('flow-table','CfFlowTable',[method('select','(I)I',['iload_0','tableswitch','bipush','ireturn','bipush','ireturn','bipush','ireturn','bipush','ireturn'])]),[invoke('(I)I')]),
  entry('cf-flow-lookup-switch','caseLookupSwitch',
    'lookupswitch=sorted[-10,4,99];arms=12/23/34;default-hole/outside=45/45;nop-padding=decoded;verify=empty;defined/invoked=same-bytes',
    [callback('buildLookup',cb,[flags,body]),callback('codeLookup',code,[c('nop','()'+code),c('lookupswitch','('+label+'Ljava/util/List;)'+code),
      op(pkg+'instruction.SwitchCase','of','(I'+label+')Ljava/lang/classfile/instruction/SwitchCase;',true),c('labelBinding','('+label+')'+code)])],
    generated('flow-lookup','CfFlowLookup',[method('select','(I)I',['nop','iload_0','lookupswitch','bipush','ireturn','bipush','ireturn','bipush','ireturn','bipush','ireturn'])]),[invoke('(I)I')]),
  entry('cf-flow-ordered-handlers','caseOrderedHandlers',
    'handlers=typed-NullPointerException,catch-all;athrow(null/NPE/IAE)=9/9/7;order=retained;verify=empty;defined/invoked=same-bytes',
    [callback('buildHandlers',cb,[flags,body]),callback('codeHandlers',code,[c('athrow','()'+code),
      c('exceptionCatch','('+label+label+label+cd+')'+code),c('exceptionCatchAll','('+label+label+label+')'+code)])],
    generated('flow-handlers','CfFlowHandlers',[method('catchValue','(Ljava/lang/Throwable;)I',['aload_0','athrow','pop','bipush','ireturn','pop','bipush','ireturn'])],true),
    [invoke('(Ljava/lang/Throwable;)I')]),
  entry('cf-flow-label-rejections','caseLabelRejections',
    'unbound=IllegalArgumentException;duplicate=IllegalArgumentException;foreign-builder=IllegalStateException;failed-bytes-not-defined',
    [callback('buildUnbound',cb,[body]),callback('codeUnbound',code,[c('newLabel','()'+label),c('goto_','('+label+')'+code)]),
      callback('buildDuplicate',cb,[body]),callback('codeDuplicate',code,[c('labelBinding','('+label+')'+code),c('nop','()'+code)]),
      callback('buildForeignSource',cb,[body]),callback('codeForeignSource',code,[c('newLabel','()'+label),c('labelBinding','('+label+')'+code)]),
      callback('buildForeignTarget',cb,[body]),callback('codeForeignTarget',code,[c('goto_','('+label+')'+code)])],null)
];
function freeze(value) {if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const classfileControlFlowGroup=freeze({id:'classfile-controlflow',source:'classes/modern_fixture/ClassFileControlFlowFinal.java',
  mainClass:owner,completionMarker:'CLASSFILE_CONTROLFLOW_OK',releases:[25],javacFlags:['-g:source'],
  additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],driverClassNames:[owner,support],resourceClassNames:[],cases});
export default classfileControlFlowGroup;
