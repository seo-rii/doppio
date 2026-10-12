import {api,op,probe,callback,entry,out,member,group,cb,code,cd,flags,body,resolver,info} from './classfile_hierarchy_case_helpers.mjs';
const label='Ljava/lang/classfile/Label;',option='Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;';
const stack=callback('codeStack',code,[api('CodeBuilder','ifeq','('+label+')'+code),api('CodeBuilder','aload','(I)'+code),api('CodeBuilder','goto_','('+label+')'+code),api('CodeBuilder','areturn','()'+code)]);
const build=name=>callback('build'+name,cb,[body]);
const choose=(descriptor,local=false)=>member('choose',descriptor,local?['iload_0','ifeq','aload_1','astore_3','goto','aload_2','astore_3','aload_3','areturn']:['iload_0','ifeq','aload_1','goto','aload_2','areturn']);
const cases=[
  entry('cf-hierarchy-callable-resolvers','caseCallableResolvers','default/classLoading-loader/lookup/resource-loader/function=callable;class/interface-info=non-null;generated-bytes=none',[
    probe('resource','('+cd+')Ljava/io/InputStream;',[op('java.lang.ClassLoader','getResourceAsStream','(Ljava/lang/String;)Ljava/io/InputStream;',false,false)])],null,{probes:[
      probe('caseCallableResolvers','()V',[api('ClassHierarchyResolver','defaultResolver','()'+resolver,true),api('ClassHierarchyResolver','getClassInfo','('+cd+')'+info),
        api('ClassHierarchyResolver','ofClassLoading','(Ljava/lang/ClassLoader;)'+resolver,true),api('ClassHierarchyResolver','ofClassLoading','(Ljava/lang/invoke/MethodHandles$Lookup;)'+resolver,true),
        api('ClassHierarchyResolver','ofResourceParsing','(Ljava/lang/ClassLoader;)'+resolver,true),api('ClassHierarchyResolver','ofResourceParsing','(Ljava/util/function/Function;)'+resolver,true),
        api('ClassHierarchyResolver$ClassHierarchyInfo','ofClass','('+cd+')'+info,true),api('ClassHierarchyResolver$ClassHierarchyInfo','ofInterface','()'+info,true)])]}),
  entry('cf-hierarchy-declared-chain-cache','caseDeclaredChainCache','declared-map=class/interface;unknown=null;orElse=String-fallback;cached-supplier/default=callable;held-info=identity;generated-bytes=none',[
    probe('cache','()Ljava/util/Map;',[op('java.util.HashMap','<init>','()V',false,false)])],null,{probes:[probe('caseDeclaredChainCache','()V',[
      api('ClassHierarchyResolver','of','(Ljava/util/Collection;Ljava/util/Map;)'+resolver,true),api('ClassHierarchyResolver','orElse','('+resolver+')'+resolver),
      api('ClassHierarchyResolver','cached','(Ljava/util/function/Supplier;)'+resolver),api('ClassHierarchyResolver','cached','()'+resolver),api('ClassHierarchyResolver','getClassInfo','('+cd+')'+info)])]}),
  entry('cf-hierarchy-resolver-options','caseResolverOptions','withOptions=resolver-replaced;option-getter=identity;Number-join=generated;branches=17/29;verify=empty;defined/invoked=same-bytes',[
    build('Number'),stack,probe('unavailable','('+cd+')'+info,[op('java.lang.IllegalStateException','<init>','(Ljava/lang/String;)V',false,false)])],
    out('hierarchy-options','C7dResolverOptions',[choose('(ILjava/lang/Integer;Ljava/lang/Long;)Ljava/lang/Number;')],{branches:true}),{probes:[probe('caseResolverOptions','()V',[
      api('ClassFile$ClassHierarchyResolverOption','of','('+resolver+')'+option,true),api('ClassFile$ClassHierarchyResolverOption','classHierarchyResolver','()'+resolver),
      api('ClassFile','withOptions','([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;')])]}),
  entry('cf-hierarchy-subtype-stack','caseSubtypeStackMerge','declared-Integer/Long-to-Number=stack-join;frames=2;branches=31/47;verify=empty;defined/invoked=same-bytes',[
    build('Number'),stack],out('hierarchy-stack','C7dNumberStack',[choose('(ILjava/lang/Integer;Ljava/lang/Long;)Ljava/lang/Number;')],{branches:true})),
  entry('cf-hierarchy-subtype-local','caseSubtypeLocalMerge','Integer/Long-to-Number=local-3-join;frames=2;branches=53/61;verify=empty;defined/invoked=same-bytes',[
    build('NumberLocal'),callback('codeLocal',code,[api('CodeBuilder','astore','(I)'+code),api('CodeBuilder','aload','(I)'+code),api('CodeBuilder','goto_','('+label+')'+code)])],
    out('hierarchy-local','C7dNumberLocal',[choose('(ILjava/lang/Integer;Ljava/lang/Long;)Ljava/lang/Number;',true)],{branches:true})),
  entry('cf-hierarchy-reference-array','caseReferenceArrayMerge','String[]/Integer[]=Object[]-stack-join;frames=2;parameter-arrays=identity-both-branches;verify=empty;defined/invoked=same-bytes',[
    build('ReferenceArray'),stack],out('hierarchy-reference-array','C7dReferenceArrays',[choose('(I[Ljava/lang/String;[Ljava/lang/Integer;)[Ljava/lang/Object;')],{branches:true})),
  entry('cf-hierarchy-primitive-array','casePrimitiveArrayMerge','int[]/long[]=Object-stack-join;frames=2;parameter-arrays=identity-both-branches;verify=empty;defined/invoked=same-bytes',[
    build('PrimitiveArray'),stack],out('hierarchy-primitive-array','C7dPrimitiveArrays',[choose('(I[I[J)Ljava/lang/Object;')],{branches:true})),
  entry('cf-hierarchy-invalid-return','caseInvalidReferenceReturn','Integer-parameter-to-String-return=invalid;verify(bytes/model)=nonempty;invalid-output-never-defined',[
    build('BadReturn'),callback('codeBadReturn',code,[api('CodeBuilder','aload','(I)'+code),api('CodeBuilder','areturn','()'+code)])],
    out('hierarchy-invalid','C7dInvalidReference',[member('bad','(Ljava/lang/Integer;)Ljava/lang/String;',['aload_0','areturn'])],{definition:'forbidden'}))
];
export const classfileHierarchyGroup=group('classfile-hierarchy','ClassFileHierarchyFinal','CLASSFILE_HIERARCHY_OK',cases);
export default classfileHierarchyGroup;
