'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cp=require('node:child_process');
const {before,after,test}=require('node:test');
const {compileClassFileMetadata,runClassFileMetadataGuest}=require('./compile_classfile_metadata.cjs');
const root=path.resolve(__dirname,'..'),classlib=path.join(root,'classes/modern_classlib'),units=new Map();
let temporary,output,readStructureLayout,decodeCoreCode;
function checked(command,args,cwd=root,timeout=120000){
  const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  assert.equal(result.error,undefined,String(result.error));assert.equal(result.signal,null);
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(-6000));return result;
}
before(async()=>{
  ({readStructureLayout}=await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode}=await import('./java_core_bytecode.mjs'));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-hierarchy-metadata-'));fs.chmodSync(temporary,0o700);
  output=path.join(temporary,'compiled');const support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
  compileClassFileMetadata({root,classlib,output,support,checked});
  for(const name of ['ClassHierarchyResolver','ClassHierarchyResolver$ClassHierarchyInfo','ClassFile',
    'ClassFile$ClassHierarchyResolverOption','DoppioClassHierarchy','DoppioClassFile','DoppioClassFileVerifier',
    'DoppioCodeFlow','DoppioBuilders']){
    const file=path.join(output,'java/lang/classfile',name+'.class'),stat=fs.lstatSync(file);assert.ok(stat.isFile()&&!stat.isSymbolicLink());
    const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt16BE(6),53,'Natural Java9 output, not a header rewrite');
    units.set(name,{bytes,layout:readStructureLayout(bytes)});
  }
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
function method(owner,name,descriptor){
  const matches=units.get(owner).layout.methods.entries.filter(item=>item.name===name&&item.descriptor===descriptor);
  assert.equal(matches.length,1,owner+'.'+name+descriptor);return matches[0];
}
function instructions(owner,entry){
  const unit=units.get(owner);assert.ok(entry.code);assert.equal(entry.flags&0x100,0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,entry.code.instructionsOffset+entry.code.codeLength),unit.layout.pool,unit.bytes);
}
function calls(owner,name,descriptor){return instructions(owner,method(owner,name,descriptor)).filter(item=>item.name.startsWith('invoke'));}
const resolver='Ljava/lang/classfile/ClassHierarchyResolver;',info='Ljava/lang/classfile/ClassHierarchyResolver$ClassHierarchyInfo;';
test('resolver and hierarchy info retain the actual public functional interface ABI',()=>{
  assert.equal(units.get('ClassHierarchyResolver').layout.flags,0x601);
  assert.equal(units.get('ClassHierarchyResolver$ClassHierarchyInfo').layout.flags,0x601);
  assert.equal(method('ClassHierarchyResolver','getClassInfo','(Ljava/lang/constant/ClassDesc;)'+info).flags,0x401);
  assert.ok(!units.get('ClassHierarchyResolver$ClassHierarchyInfo').layout.methods.entries.some(item=>item.name.startsWith('get')),
    'No invented public metadata getters or record ABI');
});
test('all public native hierarchy factory overload descriptors have actual executable Java bodies',()=>{
  for(const [name,parameters] of [['defaultResolver','()'],['of','(Ljava/util/Collection;Ljava/util/Map;)'],
    ['ofResourceParsing','(Ljava/util/function/Function;)'],['ofResourceParsing','(Ljava/lang/ClassLoader;)'],
    ['ofClassLoading','(Ljava/lang/ClassLoader;)'],['ofClassLoading','(Ljava/lang/invoke/MethodHandles$Lookup;)']]){
    const entry=method('ClassHierarchyResolver',name,parameters+resolver);assert.equal(entry.flags,9);assert.ok(entry.code);
  }
});
test('hierarchy info factories preserve nullable class roots and the exact interface descriptor',()=>{
  for(const [name,parameters] of [['ofClass','(Ljava/lang/constant/ClassDesc;)'],['ofInterface','()']])
    assert.ok(calls('ClassHierarchyResolver$ClassHierarchyInfo',name,parameters+info)
      .some(item=>item.cp.owner==='java.lang.classfile.DoppioClassHierarchy$Info'&&item.cp.name==='<init>'));
});
test('native chaining and both cache overloads are real interface defaults',()=>{
  for(const [name,parameters] of [['orElse','('+resolver+')'],['cached','()'],['cached','(Ljava/util/function/Supplier;)']]){
    const entry=method('ClassHierarchyResolver',name,parameters+resolver);assert.equal(entry.flags,1);assert.ok(entry.code);
  }
});
test('resolver option exposes the exact native getter and guarded factory',()=>{
  assert.equal(units.get('ClassFile$ClassHierarchyResolverOption').layout.flags,0x601);
  assert.equal(method('ClassFile$ClassHierarchyResolverOption','classHierarchyResolver','()'+resolver).flags,0x401);
  assert.ok(calls('ClassFile$ClassHierarchyResolverOption','of','('+resolver+')Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;')
    .some(item=>item.cp.owner==='java.util.Objects'&&item.cp.name==='requireNonNull'));
});
test('configured resolver reaches byte/model verification without a VM definition verdict',()=>{
  for(const [parameters,target] of [['([B)','([BLjava/util/function/Function;'+resolver+')Ljava/util/List;'],
    ['(Ljava/lang/classfile/ClassModel;)','(Ljava/lang/classfile/ClassModel;'+resolver+')Ljava/util/List;']])
    assert.ok(calls('DoppioClassFile','verify',parameters+'Ljava/util/List;').some(item=>
      item.cp.owner==='java.lang.classfile.DoppioClassFileVerifier'&&item.cp.descriptor===target));
  for(const entry of units.get('DoppioClassFileVerifier').layout.methods.entries.filter(item=>item.code))
    assert.ok(!instructions('DoppioClassFileVerifier',entry).some(item=>item.cp&&
      /^(?:defineClass|defineHiddenClass|initialize|ensureClassInitialized)$/.test(item.cp.name)));
});
test('resource resolver consumes actual class headers and never delegates its verdict to verification',()=>{
  const body=calls('DoppioClassHierarchy','read','(Ljava/io/InputStream;)Ljava/lang/classfile/DoppioClassHierarchy$Info;');
  assert.ok(body.some(item=>item.cp.owner==='java.io.DataInputStream'&&item.cp.name==='readInt'));
  assert.ok(body.some(item=>item.cp.owner==='java.io.DataInputStream'&&item.cp.name==='readUTF'));
  assert.ok(!body.some(item=>/^(?:parse|verify|defineClass|defineHiddenClass)$/.test(item.cp.name)));
});
test('reflection resolver uses the explicit non-initializing Class.forName overload',()=>{
  const entries=units.get('ClassHierarchyResolver').layout.methods.entries.filter(item=>item.code);
  const bodies=entries.map(entry=>instructions('ClassHierarchyResolver',entry));
  assert.ok(bodies.some(body=>body.some((item,index)=>item.cp?.owner==='java.lang.Class'&&item.cp.name==='forName'&&
    item.cp.descriptor==='(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;'&&
    body.slice(Math.max(0,index-4),index).some(operand=>operand.name==='iconst_0'))));
});
test('real guest hierarchy resolver, frame joins, declared states and cycle guards match selected diagnostics',()=>{
  const diagnostic=path.join(temporary,'diagnostic');fs.mkdirSync(diagnostic);
  checked('javac',['--release','9','--patch-module','java.base='+output+path.delimiter+path.join(root,'ci'),
    '-d',diagnostic,path.join(root,'ci/ClassFileHierarchyRegression.java')]);
  const result=runClassFileMetadataGuest({root,output,diagnostic,
    className:'classes.modern_test.ClassFileHierarchyRegression',checked,
    requiredPackages:['java/lang/classfile','java/lang/classfile/instruction']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'),'CLASSFILE_HIERARCHY_REGRESSION_OK|41\n');assert.equal(result.stderr,'');
});
