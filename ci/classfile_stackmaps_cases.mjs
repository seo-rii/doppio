const pkg='java.lang.classfile.', owner='classes.modern_test.ClassFileStackMapsFinal',support='classes.modern_test.ClassFileSupport';
const text='Ljava/lang/String;', cls='Ljava/lang/Class;',cd='Ljava/lang/constant/ClassDesc;',cb='Ljava/lang/classfile/ClassBuilder;',
  code='Ljava/lang/classfile/CodeBuilder;',consumer='Ljava/util/function/Consumer;',mt='Ljava/lang/constant/MethodTypeDesc;',label='Ljava/lang/classfile/Label;';
const op=(type,name,descriptor,static_=false,interface_=true)=>({opcode:static_?'invokestatic':interface_?'invokeinterface':'invokevirtual',
  tag:interface_?11:10,owner:type,name,descriptor});
const cf=(name,descriptor,static_=false)=>op(pkg+'ClassFile',name,descriptor,static_),
  b=(name,descriptor)=>op(pkg+'ClassBuilder',name,descriptor),c=(name,descriptor)=>op(pkg+'CodeBuilder',name,descriptor);
const probe=(method,descriptor,symbolicOperands)=>({method,descriptor,requiredOpcodes:[...new Set(symbolicOperands.map(x=>x.opcode))],symbolicOperands});
const callback=(method,parameter,operands)=>probe(method,'('+parameter+')V',operands);
const flags=b('withFlags','(I)'+cb),body=b('withMethodBody','('+text+mt+'I'+consumer+')'+cb);
const build=cf('build','('+cd+consumer+')[B'),transform=cf('transformClass','(Ljava/lang/classfile/ClassModel;'+cd+'Ljava/lang/classfile/ClassTransform;)[B');
const artifact=op(support,'artifact','('+text+text+'[B)V',true,false),emit=op(support,'emit','('+text+text+')V',true,false);
const define=op('java.lang.invoke.MethodHandles$Lookup','defineClass','([B)'+cls,false,false),verify=cf('verify','([B)Ljava/util/List;');
const invoke=descriptor=>op('java.lang.invoke.MethodHandle','invokeExact',descriptor,false,false);
const method=(name,descriptor,opcodes,flags=9)=>({name,descriptor,flags,opcodes});
const generated=(id,name,methods,{origin='public-build',definition='define-and-invoke',flags=0x21,sourceFile=null,handlers=false}={})=>({
  id,kind:definition==='forbidden'?'invalid-controlflow':'valid-generated',className:'classes.modern_test.'+name,
  major:69,minor:0,flags,definition,fields:[],methods,sourceFile,branches:true,handlers});
const sources=['ClassFile','ClassFile.StackMapsOption','CodeModel','CodeTransform','attribute/StackMapTableAttribute',
  'attribute/StackMapFrameInfo'].map(type=>'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/'+type+'.html');
const limitations=[
  'Finite genuine javac25 typed StackMapTable input and selected same-host regenerating branch/handler outputs only.',
  'Category-two LONG stack and DOUBLE wide-local merges are selected; primitive/reference incompatible merges are never defined.',
  'DROP_STACK_MAPS intentionally yields invalid modern branchful output; nonempty verification is required, not promoted as support.',
  'Default identity retains bound metadata; forced insertion regeneration must change actual offsets and preserve selected CFG/handler semantics.',
  'No arbitrary hierarchy/resolver, uninitialized allocation merges, obsolete jsr/ret, complete frame lattice or all format/API conformance claim.',
  'Canonical expanded frame state proof does not claim native byte-for-byte parity or full dynamic branch/dataflow conformance.'
];
const entry=(id,name,trace,callbacks,contract,{forced=false,transformed=false,extra=[]}={})=>({id,entryMethod:name,entryDescriptor:'()V',trace:[trace],
  probes:[probe(name,'()V',[cf('of',forced?'([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;':'()Ljava/lang/classfile/ClassFile;',true),
    ...(contract?[transformed?transform:build,verify,artifact,...(contract.definition==='forbidden'?[]:[define])]:
      [op(owner,'model','()Ljava/lang/classfile/ClassModel;',true,false),cf('verify','(Ljava/lang/classfile/ClassModel;)Ljava/util/List;')]),...extra,emit])],
  callbackMethods:callbacks,artifacts:contract?[contract]:[],oracleKind:'specification',anchors:{JVMS:['4.7.3','4.7.4','4.9.2','4.10.1']},primarySources:sources,limitations});
const defaultCallbacks=[callback('buildDefault',cb,[flags,body]),callback('codeDefault',code,[c('newLabel','()'+label),
  c('ifeq','('+label+')'+code),c('labelBinding','('+label+')'+code),c('ireturn','()'+code)])];
const originalMethods=[method('<init>','()V',['aload_0','invokespecial','return'],0),
  method('choose','(I)I',['iload_0','ifne','bipush','ireturn','bipush','ireturn']),
  method('caught','(Ljava/lang/Throwable;)I',['aload_0','athrow','astore_1','bipush','ireturn','astore_1','bipush','ireturn'])];
const cases=[
  entry('cf-frames-original-typed','caseOriginalTypedFrames',
    'original-javac25=unchanged;methods=3;frames=3;branches=1;typed-labels/types=present;verify(model)=empty',[],null),
  entry('cf-frames-long-stack-merge','caseLongStackMerge',
    'forced-generation=2-frames;join-stack=LONG;wide-parameters=1/3;branches=9007199254740993/7;verify=empty;defined/invoked=same-bytes',
    [callback('buildLongMerge',cb,[flags,body]),callback('codeLongMerge',code,[c('ifeq','('+label+')'+code),c('lload','(I)'+code),c('goto_','('+label+')'+code),c('lreturn','()'+code)])],
    generated('frames-long','CfFramesLong',[method('choose','(IJJ)J',['iload_0','ifeq','lload_1','goto','lload_3','lreturn'])]),
    {forced:true,extra:[invoke('(IJJ)J')]}),
  entry('cf-frames-wide-double-merge','caseWideDoubleLocalMerge',
    'forced-generation=2-frames;wide-local=260/261;join-local=DOUBLE;branches=12.5/7.25;verify=empty;defined/invoked=same-bytes',
    [callback('buildDoubleMerge',cb,[flags,body]),callback('codeDoubleMerge',code,[c('ifeq','('+label+')'+code),c('dstore','(I)'+code),c('dload','(I)'+code),c('goto_','('+label+')'+code),c('dreturn','()'+code)])],
    generated('frames-double','CfFramesDouble',[method('choose','(IDD)D',['iload_0','ifeq','dload_1','wide','goto','dload_3','wide','wide','dreturn'])]),
    {forced:true,extra:[invoke('(IDD)D')]}),
  entry('cf-frames-default-generation','caseDefaultGeneration','default69=1-frame;branches=31/47;verify=empty;defined/invoked=same-bytes',
    defaultCallbacks,generated('frames-default','CfFramesDefault',[method('choose','(I)I',['iload_0','ifeq','bipush','ireturn','bipush','ireturn'])]),{extra:[invoke('(I)I')]}),
  entry('cf-frames-drop-option','caseDroppedFrames',
    'DROP_STACK_MAPS=absent;version=69;verify(bytes/model)=nonempty;invalid-output-never-defined',defaultCallbacks,
    generated('frames-dropped','CfFramesDropped',[method('choose','(I)I',['iload_0','ifeq','bipush','ireturn','bipush','ireturn'])],{definition:'forbidden'}),{forced:true}),
  entry('cf-frames-transform-identity','caseBranchfulIdentity',
    'branchful-original=accept-all;frames/handlers=retained;branches=31/47;catch=9/7;verify=empty;defined/invoked=same-bytes',[],
    generated('frames-identity','CfFramesIdentity',originalMethods,{origin:'public-transform',flags:0x30,sourceFile:'ClassFileStackMapsFinal.java',handlers:true}),
    {transformed:true,extra:[invoke('(I)I'),invoke('(Ljava/lang/Throwable;)I')]}),
  entry('cf-frames-transform-insertion','caseInsertedFrames',
    'named-callback=1-branch/1-nop;offsets/frames=regenerated;branches=31/47;catch=9/7;verify=empty;defined/invoked=same-bytes',
    [probe('insertBeforeBranches','('+code+'Ljava/lang/classfile/CodeElement;)V',[c('nop','()'+code),c('with','(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;')])],
    generated('frames-inserted','CfFramesInserted',[originalMethods[0],method('choose','(I)I',['iload_0','nop','ifne','bipush','ireturn','bipush','ireturn']),originalMethods[2]],
      {origin:'public-transform',flags:0x30,sourceFile:'ClassFileStackMapsFinal.java',handlers:true}),
    {forced:true,transformed:true,extra:[invoke('(I)I'),invoke('(Ljava/lang/Throwable;)I')]}),
  entry('cf-frames-invalid-merge','caseInvalidMerge',
    'join-stack=INT-vs-NULL;return=Object;verify(bytes/model)=nonempty;invalid-output-never-defined',
    [callback('buildBadMerge',cb,[flags,body]),callback('codeBadMerge',code,[c('ifeq','('+label+')'+code),c('goto_','('+label+')'+code),c('aconst_null','()'+code),c('areturn','()'+code)])],
    generated('frames-invalid','CfFramesInvalidMerge',[method('bad','(I)Ljava/lang/Object;',['iload_0','ifeq','iconst_1','goto','aconst_null','areturn'])],{definition:'forbidden'}),{forced:true})
];
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const classfileStackMapsGroup=freeze({id:'classfile-stackmaps',source:'classes/modern_fixture/ClassFileStackMapsFinal.java',mainClass:owner,
  completionMarker:'CLASSFILE_STACKMAPS_OK',releases:[25],javacFlags:['-g:source'],additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames:[owner,'classes.modern_test.ClassFileStackMapsTarget',support],resourceClassNames:['classes.modern_test.ClassFileStackMapsTarget'],cases});
export default classfileStackMapsGroup;
