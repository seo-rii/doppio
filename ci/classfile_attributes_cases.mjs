import {api,op,probe,callback,entry,out,member,group,cb,code,field,method,text,cd,mt,consumer,flags,body,withElement} from './classfile_extended_case_helpers.mjs';
const value=()=>member('value','()I',['bipush','ireturn']);
const base=()=>[callback('methodValue',cb,[flags,body]),callback('codeValue',code,[api('CodeBuilder','bipush','(I)'+code),api('CodeBuilder','ireturn','()'+code)])];
const build=(name,ops)=>callback('build'+name,cb,ops);
const attr=(name,descriptor)=>api('attribute.'+name,'of',descriptor,true);
const cases=[
  entry('cf-attributes-constant-values','caseConstantValues','ConstantValue=I:42/J:9000000000/F:1.25/D:2.5/String:C7c;typed=5;verify=empty;defined/invoked=same-bytes',
    [build('Constants',[api('ClassBuilder','withField','('+text+cd+consumer+')'+cb)]),...base(),...['Int','Long','Float','Double','String'].map(name=>
      callback('field'+name,field,[attr('ConstantValueAttribute','(Ljava/lang/constant/ConstantDesc;)Ljava/lang/classfile/attribute/ConstantValueAttribute;'),withElement('FieldBuilder')]))],
    out('attributes-constants','C7cConstants',[value()],{fields:[{name:'I',descriptor:'I',flags:25},{name:'J',descriptor:'J',flags:25},{name:'F',descriptor:'F',flags:25},{name:'D',descriptor:'D',flags:25},{name:'S',descriptor:'Ljava/lang/String;',flags:25}]})),
  entry('cf-attributes-signatures','caseSignatures','Signature=class/field/method;Utf8=exact;signature-tree=unclaimed;verify=empty;defined/invoked=same-bytes',
    [build('Signatures',[withElement('ClassBuilder'),api('ClassBuilder','withMethod','('+text+mt+'I'+consumer+')'+cb)]),
      callback('fieldSignature',field,[attr('SignatureAttribute','(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/attribute/SignatureAttribute;')]),
      callback('methodSignature',method,[withElement('MethodBuilder'),api('MethodBuilder','withCode','('+consumer+')'+method)]),
      callback('codeIdentity',code,[api('CodeBuilder','aload','(I)'+code),api('CodeBuilder','areturn','()'+code)])],
    out('attributes-signatures','C7cSignatures',[member('identity','(Ljava/lang/Object;)Ljava/lang/Object;',['aload_0','areturn'])],{fields:[{name:'items',descriptor:'Ljava/util/List;',flags:9}]})),
  entry('cf-attributes-exceptions','caseExceptions','Exceptions=IOException,ReflectiveOperationException;ordered=2;not-handler-table;verify=empty;defined/invoked=same-bytes',
    [build('Exceptions',[flags,api('ClassBuilder','withMethod','('+text+mt+'I'+consumer+')'+cb)]),
      callback('methodExceptions',method,[api('attribute.ExceptionsAttribute','ofSymbols','([Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/attribute/ExceptionsAttribute;',true),api('MethodBuilder','withCode','('+consumer+')'+method)]),base()[1]],
    out('attributes-exceptions','C7cExceptions',[value()])),
  entry('cf-attributes-nest-host','caseNestHost','NestHost=classes.modern_test.C7cExternalHost;typed=ClassEntry;nest-access=unclaimed;verify=empty;defined/invoked=same-bytes',
    [build('NestHost',[attr('NestHostAttribute','('+cd+')Ljava/lang/classfile/attribute/NestHostAttribute;'),withElement('ClassBuilder')]),...base()],out('attributes-nest-host','C7cNestHost',[value()])),
  entry('cf-attributes-nest-members','caseNestMembers','NestMembers=classes.modern_test.C7cMemberA,C7cMemberB;ordered=2;nest-access=unclaimed;verify=empty;defined/invoked=same-bytes',
    [build('NestMembers',[api('attribute.NestMembersAttribute','ofSymbols','([Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/attribute/NestMembersAttribute;',true),withElement('ClassBuilder')]),...base()],out('attributes-nest-members','C7cNestMembers',[value()])),
  entry('cf-attributes-custom-stateless','caseCustomStateless','CustomAttribute=STATELESS;full-header=mapper-written;absolute-reader=checked;BufWriter.patchInt=4;payload=37;verify=empty;defined/invoked=same-bytes',
    [build('Stateless',[withElement('ClassBuilder')]),...base()],out('attributes-stateless','C7cStateless',[value()]),{codecs:[
      probe('readAttribute','(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)Lclasses/modern_test/ClassFileAttributesFinal$ProbeAttribute;',[
        api('ClassReader','readInt','(I)I'),api('ClassReader','readBytes','(II)[B'),api('ClassReader','readU1','(I)I'),api('ClassReader','readS2','(I)I')],{className:'classes.modern_test.ClassFileAttributesFinal$ProbeMapper'}),
      probe('writeAttribute','(Ljava/lang/classfile/BufWriter;Lclasses/modern_test/ClassFileAttributesFinal$ProbeAttribute;)V',[
        api('BufWriter','reserveSpace','(I)V'),api('BufWriter','writeIndex','(Ljava/lang/classfile/constantpool/PoolEntry;)V'),api('BufWriter','patchInt','(III)V')],{className:'classes.modern_test.ClassFileAttributesFinal$ProbeMapper'})]}),
  entry('cf-attributes-custom-reference','caseCustomReference','CustomAttribute=CP_REFS;foreign-StringEntry=imported;readEntry=StringEntry;payload=53/attribute-reference;verify=empty;defined/invoked=same-bytes',
    [build('Reference',[withElement('ClassBuilder'),api('constantpool.ConstantPoolBuilder','stringEntry','('+text+')Ljava/lang/classfile/constantpool/StringEntry;')]),...base()],
    out('attributes-reference','C7cReference',[value()]),{codecs:[probe('readAttribute','(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)Lclasses/modern_test/ClassFileAttributesFinal$ProbeAttribute;',[
      api('ClassReader','readEntry','(ILjava/lang/Class;)Ljava/lang/classfile/constantpool/PoolEntry;')],{className:'classes.modern_test.ClassFileAttributesFinal$ProbeMapper'})]}),
  entry('cf-attributes-processing-options','caseProcessingOptions','unmapped=UnknownAttribute:2;DROP_UNKNOWN_ATTRIBUTES+NEW_POOL=0;typed-Code=retained;verify=empty;defined/invoked=same-bytes',
    [build('ProcessingSource',[withElement('ClassBuilder')]),...base(),probe('copyElement','('+cb+'Ljava/lang/classfile/ClassElement;)V',[withElement('ClassBuilder')])],
    out('attributes-processing','C7cProcessing',[value()]),{origin:'public-transform'})
];
export const classfileAttributesGroup=group('classfile-attributes','ClassFileAttributesFinal','CLASSFILE_ATTRIBUTES_OK',cases,{nested:['ProbeAttribute','ProbeMapper']});
export default classfileAttributesGroup;
