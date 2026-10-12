import {api,probe,callback,entry,out,member,group,cb,code,field,cpb,text,flags,body,withElement} from './classfile_extended_case_helpers.mjs';
const copy=(name='copyClass',ops=[withElement('ClassBuilder')])=>probe(name,'('+cb+'Ljava/lang/classfile/ClassElement;)V',ops);
const build=(name,ops=[flags,body])=>callback('build'+name,cb,ops);
const value=()=>member('value','()I',['bipush','ireturn']);
const original=(id,name,wide=false)=>out(id,name,[member('<init>','()V',['aload_0','invokespecial','return'],0),
  member('choose','(I)Ljava/lang/String;',['iload_0','ifne',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn']),
  member('dense','(I)Ljava/lang/String;',['iload_0','tableswitch',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn',wide?'ldc_w':'ldc','areturn']),
  member('concat','(I)Ljava/lang/String;',['iload_0','invokedynamic','areturn']),member('wide','()J',['ldc2_w','lreturn'])],
  {flags:48,fields:[{name:'I',descriptor:'I',flags:25},{name:'W',descriptor:'J',flags:25}],sourceFile:'ClassFilePoolRemapFinal.java',branches:true});
const codeValue=()=>callback('codeValue',code,[api('CodeBuilder','bipush','(I)'+code),api('CodeBuilder','ireturn','()'+code)]);
const cases=[
  entry('cf-pool-original-fresh','caseOriginalFreshPool','NEW_POOL=unchanged-javac25;typed-ConstantValue/Signature/InnerClasses/BootstrapMethods=remapped;branch-frames=regenerated;choose(0/7)=zero/kept;verify=empty;defined/invoked=same-bytes',
    [copy()],original('pool-original','C7cFreshOriginal'),{origin:'public-transform'}),
  entry('cf-pool-ldc-widening','caseLdcWidening','NEW_POOL+300-prefilled-strings=ldc_w;original=ldc;branch/switch/frame-offsets=rebuilt;choose/table/default=executed;verify=empty;defined/invoked=same-bytes',
    [copy('widenClass',[api('constantpool.ConstantPoolBuilder','stringEntry','('+text+')Ljava/lang/classfile/constantpool/StringEntry;'),withElement('ClassBuilder')])],
    original('pool-widening','C7cWideOriginal',true),{origin:'public-transform'}),
  entry('cf-pool-unused-dropped','caseUnusedPoolDropped','NEW_POOL=unused-80-strings-dropped;source-size>160;output-size<20;value=23;verify=empty;defined/invoked=same-bytes',
    [build('UnusedSource',[flags,body,api('constantpool.ConstantPoolBuilder','stringEntry','('+text+')Ljava/lang/classfile/constantpool/StringEntry;')]),codeValue(),copy()],
    out('pool-unused','C7cUnusedDropped',[value()]),{origin:'public-transform'}),
  entry('cf-pool-foreign-member','caseForeignMemberImport','foreign-FieldRefEntry=semantic-import;owner/name/type=selected;ConstantValue=44;getstatic=44;verify=empty;defined/invoked=same-bytes',
    [build('ForeignMember',[flags,body]),callback('fieldValue',field,[api('attribute.ConstantValueAttribute','of','(Ljava/lang/constant/ConstantDesc;)Ljava/lang/classfile/attribute/ConstantValueAttribute;',true)]),
      callback('codeForeignMember',code,[api('CodeBuilder','getstatic','(Ljava/lang/classfile/constantpool/FieldRefEntry;)'+code)])],
    out('pool-foreign-member','C7cForeignMember',[member('read','()I',['getstatic','ireturn'])],{fields:[{name:'value',descriptor:'I',flags:25}]})),
  entry('cf-pool-wide-imports','caseWideImports','foreign-LongEntry/DoubleEntry=imported;CP-wide-slots=preserved;ldc2_w=3;category2-stack-join=typed;resolved=1234567890123/1.25/2.5;verify=empty;defined/invoked=same-bytes',
    [build('WideImports'),callback('codeWideLong',code,[api('constantpool.ConstantPoolBuilder','longEntry','(J)Ljava/lang/classfile/constantpool/LongEntry;'),api('CodeBuilder','ldc','(Ljava/lang/classfile/constantpool/LoadableConstantEntry;)'+code)]),
      callback('codeWideDouble',code,[api('constantpool.ConstantPoolBuilder','doubleEntry','(D)Ljava/lang/classfile/constantpool/DoubleEntry;'),api('CodeBuilder','ifeq','(Ljava/lang/classfile/Label;)'+code)])],
    out('pool-wide-imports','C7cWideImports',[member('longValue','()J',['ldc2_w','lreturn']),member('doubleValue','(I)D',['iload_0','ifeq','ldc2_w','goto','ldc2_w','dreturn'])],{branches:true})),
  entry('cf-pool-custom-reference-remap','caseCustomReferenceRemap','CP_REFS+NEW_POOL=mapper-reencoded;source-index>255;output-index<255;StringEntry=remapped-reference;verify=empty;defined/invoked=same-bytes',
    [build('ReferenceSource',[flags,body,withElement('ClassBuilder')]),codeValue(),copy()],out('pool-reference-remap','C7cReferenceRemapped',[value()]),
    {origin:'public-transform',codecs:[probe('writeAttribute','(Ljava/lang/classfile/BufWriter;Lclasses/modern_test/ClassFilePoolRemapFinal$ReferenceAttribute;)V',[
      api('BufWriter','writeIndex','(Ljava/lang/classfile/constantpool/PoolEntry;)V'),api('BufWriter','writeInt','(I)V')],{className:'classes.modern_test.ClassFilePoolRemapFinal$ReferenceMapper'})]}),
  entry('cf-pool-bootstrap-reindex','caseBootstrapReindex','NEW_POOL=bootstrap-index-0-to-1;prefilled-nullConstant=0;original-concat=1;CP18+BootstrapMethods=consistent;resolved=pool=5;verify=empty;defined/invoked=same-bytes',
    [copy('seedBootstrap',[api('constantpool.ConstantPoolBuilder','bsmEntry','(Ljava/lang/constant/DirectMethodHandleDesc;Ljava/util/List;)Ljava/lang/classfile/BootstrapMethodEntry;'),withElement('ClassBuilder')])],
    original('pool-bootstrap-reindex','C7cBootstrapReindexed'),{origin:'public-transform'}),
  entry('cf-pool-index-validation','casePoolValidation','semantic-dedup=int:7;index-zero/wide-tail/out-of-range=ConstantPoolException;rejections=3;generated-bytes=none',[],null,{probes:[
    probe('casePoolValidation','()V',[api('constantpool.ConstantPoolBuilder','entryByIndex','(I)Ljava/lang/classfile/constantpool/PoolEntry;'),
      api('constantpool.ConstantPoolBuilder','longEntry','(J)Ljava/lang/classfile/constantpool/LongEntry;')])]} )
];
export const classfilePoolRemapGroup=group('classfile-poolremap','ClassFilePoolRemapFinal','CLASSFILE_POOL_REMAP_OK',cases,{nested:['ReferenceAttribute','ReferenceMapper'],target:'ClassFilePoolRemapTarget'});
export default classfilePoolRemapGroup;
