'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),cp=require('node:child_process');
const {before,after,test}=require('node:test');
const {compileClassFileMetadata}=require('./compile_classfile_metadata.cjs');
const root=path.resolve(__dirname,'..'),classlib=path.join(root,'classes/modern_classlib'),units=new Map();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let temporary,readStructureLayout,decodeCoreCode;
function sources(directory){
  const files=[];
  for(const name of fs.readdirSync(directory).sort()){
    if(name==='out')continue;const filename=path.join(directory,name),stat=fs.lstatSync(filename);assert.ok(!stat.isSymbolicLink());
    if(stat.isDirectory())files.push(...sources(filename));else if(name.endsWith('.java'))files.push(filename);
  }return files;
}
function checked(command,args,cwd=root,timeout=120000){
  const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  assert.equal(result.error,undefined,String(result.error));assert.equal(result.signal,null);
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(-6000));return result;
}
before(async()=>{
  ({readStructureLayout}=await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode}=await import('./java_core_bytecode.mjs'));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-extended-metadata-'));fs.chmodSync(temporary,0o700);
  const output=path.join(temporary,'compiled'),support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
  const excluded=new Set(['java/lang/System$Logger.java','java/lang/System$DoppioLogger.java','sun/invoke/util/VerifyAccess.java']);
  const inputs=sources(classlib).filter(file=>!excluded.has(path.relative(classlib,file).split(path.sep).join('/')));
  const original=inputs.map(file=>[file,sha(fs.readFileSync(file))]),runtime=path.join(root,'vendor/java_home/lib/rt.jar'),runtimeHash=sha(fs.readFileSync(runtime));
  compileClassFileMetadata({root,classlib,output,support,inputs,checked});
  assert.deepEqual(inputs.map(file=>[file,sha(fs.readFileSync(file))]),original);assert.equal(sha(fs.readFileSync(runtime)),runtimeHash);
  for(const name of ['ClassFile','ClassFile$AttributeMapperOption','ClassFile$AttributesProcessingOption','CustomAttribute','BufWriter',
    'DoppioBufWriter','DoppioAttributes','DoppioClassFile','DoppioClassFileVerifier','DoppioCodeFlow','CodeBuilder',
    'attribute/ConstantValueAttribute','attribute/SignatureAttribute','attribute/ExceptionsAttribute','attribute/NestHostAttribute',
    'attribute/NestMembersAttribute','attribute/InnerClassesAttribute','attribute/InnerClassInfo','attribute/BootstrapMethodsAttribute',
    'constantpool/ConstantPoolBuilder','constantpool/DynamicConstantPoolEntry','constantpool/ConstantDynamicEntry',
    'constantpool/InvokeDynamicEntry','instruction/InvokeDynamicInstruction','../constant/DynamicCallSiteDesc']){
    const file=path.join(output,'java/lang/classfile',name+'.class'),stat=fs.lstatSync(file);assert.ok(stat.isFile()&&!stat.isSymbolicLink());
    const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt16BE(6),53,'Actual release9 class, never rewritten');
    units.set(name,{bytes,layout:readStructureLayout(bytes)});
  }
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
function method(owner,name,descriptor){
  const matches=units.get(owner).layout.methods.entries.filter(item=>item.name===name&&item.descriptor===descriptor);
  assert.equal(matches.length,1,owner+'.'+name+descriptor);return matches[0];
}
function calls(owner,name,descriptor){
  const unit=units.get(owner),entry=method(owner,name,descriptor);assert.ok(entry.code);assert.equal(entry.flags&0x100,0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,entry.code.instructionsOffset+entry.code.codeLength),
    unit.layout.pool,unit.bytes).filter(item=>item.name.startsWith('invoke'));
}
test('extended attribute models are real public interfaces with exact native operand descriptors',()=>{
  for(const owner of ['ConstantValueAttribute','SignatureAttribute','ExceptionsAttribute','NestHostAttribute','NestMembersAttribute',
    'InnerClassesAttribute','InnerClassInfo','BootstrapMethodsAttribute'])assert.equal(units.get('attribute/'+owner).layout.flags,0x601);
  for(const [owner,name,descriptor] of [
    ['ConstantValueAttribute','constant','()Ljava/lang/classfile/constantpool/ConstantValueEntry;'],
    ['SignatureAttribute','signature','()Ljava/lang/classfile/constantpool/Utf8Entry;'],
    ['ExceptionsAttribute','exceptions','()Ljava/util/List;'],['NestHostAttribute','nestHost','()Ljava/lang/classfile/constantpool/ClassEntry;'],
    ['NestMembersAttribute','nestMembers','()Ljava/util/List;'],['InnerClassesAttribute','classes','()Ljava/util/List;'],
    ['InnerClassInfo','outerClass','()Ljava/util/Optional;'],['BootstrapMethodsAttribute','bootstrapMethods','()Ljava/util/List;']
  ])assert.equal(method('attribute/'+owner,name,descriptor).flags,0x401);
});
test('selected attribute factories execute actual codecs and omitted signature-tree ABI is not fabricated',()=>{
  for(const [owner,descriptor] of [
    ['ConstantValueAttribute','(Ljava/lang/classfile/constantpool/ConstantValueEntry;)Ljava/lang/classfile/attribute/ConstantValueAttribute;'],
    ['SignatureAttribute','(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/attribute/SignatureAttribute;'],
    ['ExceptionsAttribute','(Ljava/util/List;)Ljava/lang/classfile/attribute/ExceptionsAttribute;'],
    ['NestHostAttribute','(Ljava/lang/classfile/constantpool/ClassEntry;)Ljava/lang/classfile/attribute/NestHostAttribute;'],
    ['NestMembersAttribute','(Ljava/util/List;)Ljava/lang/classfile/attribute/NestMembersAttribute;']
  ])assert.ok(calls('attribute/'+owner,'of',descriptor).some(item=>item.cp.owner==='java.lang.classfile.DoppioAttributes'));
  assert.ok(!units.get('attribute/SignatureAttribute').layout.methods.entries.some(item=>item.name.startsWith('as')));
  assert.ok(!units.get('attribute/BootstrapMethodsAttribute').layout.methods.entries.some(item=>item.name==='of'));
});
test('custom extension point preserves genuine abstract class and protected mapper constructor',()=>{
  assert.equal(units.get('CustomAttribute').layout.flags,0x421);
  assert.equal(method('CustomAttribute','<init>','(Ljava/lang/classfile/AttributeMapper;)V').flags,4);
  assert.equal(method('CustomAttribute','attributeMapper','()Ljava/lang/classfile/AttributeMapper;').flags,17);
  assert.equal(method('CustomAttribute','attributeName','()Ljava/lang/classfile/constantpool/Utf8Entry;').flags,1);
});
test('native-shaped custom mapper option and three processing constants are actual class metadata',()=>{
  assert.equal(method('ClassFile$AttributeMapperOption','attributeMapper','()Ljava/util/function/Function;').flags,0x401);
  assert.equal(method('ClassFile$AttributeMapperOption','of','(Ljava/util/function/Function;)Ljava/lang/classfile/ClassFile$AttributeMapperOption;').flags,9);
  assert.deepEqual(units.get('ClassFile$AttributesProcessingOption').layout.fields.entries.filter(item=>item.flags===0x4019).map(item=>item.name),
    ['PASS_ALL_ATTRIBUTES','DROP_UNKNOWN_ATTRIBUTES','DROP_UNSTABLE_ATTRIBUTES']);
});
test('CP17 and CP18 expose genuine bootstrap metadata and native nominal descriptors',()=>{
  assert.equal(method('constantpool/DynamicConstantPoolEntry','bootstrap','()Ljava/lang/classfile/BootstrapMethodEntry;').flags,0x401);
  assert.equal(method('constantpool/DynamicConstantPoolEntry','bootstrapMethodIndex','()I').flags,0x401);
  for(const [owner,name,descriptor] of [
    ['ConstantDynamicEntry','typeSymbol','()Ljava/lang/constant/ClassDesc;'],
    ['ConstantDynamicEntry','asSymbol','()Ljava/lang/constant/DynamicConstantDesc;'],
    ['InvokeDynamicEntry','typeSymbol','()Ljava/lang/constant/MethodTypeDesc;'],
    ['InvokeDynamicEntry','asSymbol','()Ljava/lang/constant/DynamicCallSiteDesc;']
  ])assert.equal(method('constantpool/'+owner,name,descriptor).flags,1);
});
test('bootstrap and dynamic factories keep actual native public signatures',()=>{
  for(const [name,descriptor] of [
    ['bsmEntry','(Ljava/lang/classfile/constantpool/MethodHandleEntry;Ljava/util/List;)Ljava/lang/classfile/BootstrapMethodEntry;'],
    ['constantDynamicEntry','(Ljava/lang/classfile/BootstrapMethodEntry;Ljava/lang/classfile/constantpool/NameAndTypeEntry;)Ljava/lang/classfile/constantpool/ConstantDynamicEntry;'],
    ['invokeDynamicEntry','(Ljava/lang/classfile/BootstrapMethodEntry;Ljava/lang/classfile/constantpool/NameAndTypeEntry;)Ljava/lang/classfile/constantpool/InvokeDynamicEntry;']
  ])assert.equal(method('constantpool/ConstantPoolBuilder',name,descriptor).flags,0x401);
  assert.ok(calls('constantpool/ConstantPoolBuilder','bsmEntry',
    '(Ljava/lang/constant/DirectMethodHandleDesc;Ljava/util/List;)Ljava/lang/classfile/BootstrapMethodEntry;')
    .some(item=>item.cp.name==='loadableConstantEntry'));
});
test('invokedynamic convenience and public instruction factory are executable Java methods',()=>{
  assert.equal(method('instruction/InvokeDynamicInstruction','invokedynamic','()Ljava/lang/classfile/constantpool/InvokeDynamicEntry;').flags,0x401);
  assert.ok(calls('CodeBuilder','invokedynamic','(Ljava/lang/classfile/constantpool/InvokeDynamicEntry;)Ljava/lang/classfile/CodeBuilder;')
    .some(item=>item.cp.owner==='java.lang.classfile.instruction.InvokeDynamicInstruction'&&item.cp.name==='of'));
  assert.ok(calls('CodeBuilder','invokedynamic','(Ljava/lang/constant/DynamicCallSiteDesc;)Ljava/lang/classfile/CodeBuilder;')
    .some(item=>item.cp.name==='invokeDynamicEntry'));
});
test('nominal call-site type is actual final Java class with native accessors, not injected metadata',()=>{
  assert.equal(units.get('../constant/DynamicCallSiteDesc').layout.flags,0x31);
  for(const [name,descriptor] of [['invocationName','()Ljava/lang/String;'],['invocationType','()Ljava/lang/constant/MethodTypeDesc;'],
    ['bootstrapArgs','()[Ljava/lang/constant/ConstantDesc;'],['bootstrapMethod','()Ljava/lang/constant/MethodHandleDesc;']])
    assert.ok(method('../constant/DynamicCallSiteDesc',name,descriptor).code);
});
test('verification and writing preserve actual configured context and CP import code paths',()=>{
  assert.ok(calls('DoppioClassFile','verify','([B)Ljava/util/List;').some(item=>item.cp.owner==='java.lang.classfile.DoppioClassFileVerifier'&&
    item.cp.descriptor==='([BLjava/util/function/Function;)Ljava/util/List;'));
  assert.ok(calls('DoppioClassFileVerifier','verify','([BLjava/util/function/Function;)Ljava/util/List;')
    .some(item=>item.cp.owner==='java.lang.classfile.DoppioClassReader'&&item.cp.name==='parse'));
  assert.ok(calls('DoppioBufWriter','writeIndex','(Ljava/lang/classfile/constantpool/PoolEntry;)V')
    .some(item=>item.cp.name==='importEntry'));
});
function diagnostic(name,marker){
  const output=path.join(temporary,name);fs.mkdirSync(output);
  checked('javac',['--release','9','--patch-module','java.base='+path.join(classlib,'out')+path.delimiter+path.join(root,'ci'),
    '-d',output,path.join(root,'ci',name+'.java')]);
  const result=checked(process.execPath,['--no-deprecation',path.join(root,'build/release-cli/console/runner.js'),'-cp',output,
    'classes.modern_test.'+name],root,60000);
  assert.equal(result.stdout.replaceAll('\r\n','\n'),marker+'\n');assert.equal(result.stderr,'');
}
test('actual guest typed/custom attribute writers and read/verify context match selected native diagnostics',()=>{
  diagnostic('ClassFileAttributesRegression','CLASSFILE_ATTRIBUTES_REGRESSION_OK|12');
});
test('actual guest pools import foreign recursive bootstraps without creating raw-copy authority',()=>{
  diagnostic('ClassFileBootstrapPoolRegression','CLASSFILE_BOOTSTRAP_POOL_REGRESSION_OK|31');
});
test('actual guest NEW_POOL changes CP/BSM indices and branch frames without invoking a bootstrap',()=>{
  diagnostic('ClassFileRemapRegression','CLASSFILE_REMAP_REGRESSION_OK|23');
});
