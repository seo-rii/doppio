'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before,after,test} = require('node:test');
const {compileClassFileMetadata,runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root=path.resolve(__dirname,'..'),classlib=path.join(root,'classes/modern_classlib');
const poolPrefix='java/lang/classfile/constantpool/',constantPrefix='java/lang/constant/',units=new Map();
let temporary,output,receipt,decodeCoreCode;
function checked(command,args,cwd=root,timeout=60000) {
  const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  assert.equal(result.error,undefined,String(result.error));assert.equal(result.signal,null);
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(-6000));return result;
}
before(async()=>{
  const {readStructureLayout}=await import('./java_class_structure_test.mjs');
  ({decodeCoreCode}=await import('./java_core_bytecode.mjs'));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-module-pool-'));fs.chmodSync(temporary,0o700);
  output=path.join(temporary,'compiled');const support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
  receipt=compileClassFileMetadata({root,classlib,output,support,checked});
  for(const name of [constantPrefix+'ModuleDesc',constantPrefix+'PackageDesc',constantPrefix+'DoppioModuleDescriptors',
    constantPrefix+'DoppioModuleDescriptors$ModuleValue',constantPrefix+'DoppioModuleDescriptors$PackageValue',
    poolPrefix+'ModuleEntry',poolPrefix+'PackageEntry',poolPrefix+'ConstantPoolBuilder',poolPrefix+'DoppioConstantPool',
    poolPrefix+'DoppioConstantPool$ModuleValue',poolPrefix+'DoppioConstantPool$PackageValue']) {
    const filename=path.join(output,name+'.class'),stat=fs.lstatSync(filename);assert.ok(stat.isFile()&&!stat.isSymbolicLink());
    const bytes=fs.readFileSync(filename);assert.equal(bytes.readUInt16BE(6),53,'Naturally release9 output, no rewritten SDK/compiler headers');
    units.set(name,{bytes,layout:readStructureLayout(bytes)});
  }
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
function method(owner,name,descriptor) {
  const found=units.get(owner).layout.methods.entries.filter(item=>item.name===name&&item.descriptor===descriptor);
  assert.equal(found.length,1,owner+'.'+name+descriptor);return found[0];
}
function instructions(owner,name,descriptor) {
  const unit=units.get(owner),entry=method(owner,name,descriptor);assert.ok(entry.code);assert.equal(entry.flags&0x100,0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,entry.code.instructionsOffset+entry.code.codeLength),unit.layout.pool,unit.bytes);
}
function interfaces(owner) {
  const {bytes,layout}=units.get(owner);
  return Array.from({length:layout.interfaceCount},(_,index)=>{
    const entry=layout.pool[bytes.readUInt16BE(layout.interfacesOffset+2*index)];assert.equal(entry.tag,7);return layout.pool[entry.first].value;
  });
}
test('module/package descriptors have exact native public ABI and no ConstantDesc or Constable nominal parent',()=>{
  for(const kind of ['ModuleDesc','PackageDesc']) {
    const owner=constantPrefix+kind,layout=units.get(owner).layout;assert.equal(layout.flags,0x601);
    assert.deepEqual(interfaces(owner),[]);assert.deepEqual(layout.fields.entries,[]);
    assert.equal(method(owner,'of','(Ljava/lang/String;)L'+owner+';').flags,9);
    assert.equal(method(owner,'equals','(Ljava/lang/Object;)Z').flags,0x401);
  }
  assert.equal(method(constantPrefix+'ModuleDesc','name','()Ljava/lang/String;').flags,0x401);
  assert.equal(units.get(constantPrefix+'ModuleDesc').layout.methods.entries.length,3);
  assert.equal(method(constantPrefix+'PackageDesc','ofInternalName','(Ljava/lang/String;)L'+constantPrefix+'PackageDesc;').flags,9);
  assert.equal(method(constantPrefix+'PackageDesc','internalName','()Ljava/lang/String;').flags,0x401);
  assert.equal(method(constantPrefix+'PackageDesc','name','()Ljava/lang/String;').flags,1);
  assert.equal(units.get(constantPrefix+'PackageDesc').layout.methods.entries.length,5);
});
test('CONSTANT_Module_info and CONSTANT_Package_info expose exact typed PoolEntry hierarchy/getters',()=>{
  for(const [kind,descriptor] of [['ModuleEntry','ModuleDesc'],['PackageEntry','PackageDesc']]) {
    const owner=poolPrefix+kind,layout=units.get(owner).layout;assert.equal(layout.flags,0x601);
    assert.deepEqual(interfaces(owner),[poolPrefix+'PoolEntry']);assert.deepEqual(layout.fields.entries,[]);
    assert.equal(layout.methods.entries.length,3);
    for(const [name,type] of [['name','()L'+poolPrefix+'Utf8Entry;'],['asSymbol','()L'+constantPrefix+descriptor+';'],
      ['matches','(L'+constantPrefix+descriptor+';)Z']])assert.equal(method(owner,name,type).flags,0x401);
  }
});
test('all four constant pool builder overloads retain native abstract/default descriptors and genuine symbol delegation',()=>{
  const owner=poolPrefix+'ConstantPoolBuilder';
  for(const [name,entry,descriptor,getter] of [['moduleEntry','ModuleEntry','ModuleDesc','name'],['packageEntry','PackageEntry','PackageDesc','internalName']]) {
    assert.equal(method(owner,name,'(L'+poolPrefix+'Utf8Entry;)L'+poolPrefix+entry+';').flags,0x401);
    const signature='(L'+constantPrefix+descriptor+';)L'+poolPrefix+entry+';';assert.equal(method(owner,name,signature).flags,1);
    const body=instructions(owner,name,signature);
    assert.ok(body.some(item=>item.name==='invokeinterface'&&item.cp.owner==='java.lang.constant.'+descriptor&&item.cp.name===getter));
    assert.ok(body.some(item=>item.name==='invokeinterface'&&item.cp.name===name&&item.cp.descriptor.includes('Utf8Entry')));
  }
});
test('genuine typed module/package implementations serialize native child-index hash and parse symbols lazily',()=>{
  for(const [kind,entry,descriptor,factory] of [['ModuleValue','ModuleEntry','ModuleDesc','of'],['PackageValue','PackageEntry','PackageDesc','ofInternalName']]) {
    const owner=poolPrefix+'DoppioConstantPool$'+kind;assert.deepEqual(interfaces(owner),[poolPrefix+entry]);
    assert.equal(method(owner,'name','()L'+poolPrefix+'Utf8Entry;').flags,1);
    assert.equal(method(owner,'equals','(Ljava/lang/Object;)Z').flags,1);
    assert.equal(method(owner,'hashCode','()I').flags,1);
    assert.ok(instructions(owner,'hashCode','()I').some(item=>item.name==='invokeinterface'&&item.cp.name==='index'));
    assert.ok(instructions(owner,'asSymbol','()L'+constantPrefix+descriptor+';').some(item=>item.name==='invokestatic'&&item.cp.owner==='java.lang.constant.'+descriptor&&item.cp.name===factory));
  }
  const pool=poolPrefix+'DoppioConstantPool';
  for(const [name,kind] of [['moduleEntry','ModuleEntry'],['packageEntry','PackageEntry']]) {
    const body=instructions(pool,name,'(L'+poolPrefix+'Utf8Entry;)L'+poolPrefix+kind+';');
    assert.ok(body.some(item=>['invokevirtual','invokespecial'].includes(item.name)&&
      item.cp.owner==='java.lang.classfile.constantpool.DoppioConstantPool'&&item.cp.name==='intern'&&
      item.cp.descriptor==='(IIILjava/lang/Object;)Ljava/lang/classfile/constantpool/DoppioConstantPool$Entry;'));
    assert.ok(!body.some(item=>item.cp?.owner?.startsWith('java.lang.constant.')),'Raw factory does not prematurely validate nominal names');
  }
});
test('module/package sources remain ordinary release9 and fresh provider checks admit only the selected constant namespace',()=>{
  const [,narrow,normal]=receipt.operations;assert.deepEqual(normal.arguments.slice(0,4),['-J-Dfile.encoding=UTF8','--release','9','--patch-module']);
  for(const name of [constantPrefix+'ModuleDesc',constantPrefix+'PackageDesc',constantPrefix+'DoppioModuleDescriptors',
    poolPrefix+'ModuleEntry',poolPrefix+'PackageEntry',poolPrefix+'ConstantPoolBuilder',poolPrefix+'DoppioConstantPool']) {
    const source=path.join(classlib,name+'.java');assert.ok(normal.arguments.includes(source));assert.ok(!narrow.arguments.includes(source));
  }
  assert.equal(receipt.inputs.length,receipt.sourceHashes.length);
  assert.throws(()=>runClassFileMetadataGuest({root,output,diagnostic:temporary,className:'never.run',checked,
    requiredPackages:['java/lang/other']}),assert.AssertionError);
});
test('actual fresh guest executes all291 unchanged native grammar/ownership/CP19/20/new-pool assertions',()=>{
  const diagnostic=path.join(temporary,'diagnostic');fs.mkdirSync(diagnostic);
  checked('javac',['--release','9','--patch-module','java.base='+output+path.delimiter+path.join(root,'ci'),
    '-d',diagnostic,path.join(root,'ci/ClassFileModulePoolRegression.java')]);
  const result=runClassFileMetadataGuest({root,output,diagnostic,checked,className:'classes.modern_test.ClassFileModulePoolRegression',
    requiredPackages:['java/lang/constant','java/lang/classfile','java/lang/classfile/constantpool','java/lang/classfile/attribute']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'),'CLASSFILE_MODULE_POOL_REGRESSION_OK|291\n');assert.equal(result.stderr,'');
});
