'use strict';
const assert=require('node:assert/strict'), cp=require('node:child_process'), fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {before,after,test}=require('node:test');
const {compileClassFileMetadata,runClassFileMetadataGuest}=require('./compile_classfile_metadata.cjs');
const root=path.resolve(__dirname,'..');let temporary,output,readStructureLayout;
function checked(command,args,cwd=root,timeout=60000){
  const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  assert.equal(result.error,undefined,String(result.error));assert.equal(result.signal,null);
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(-5000));return result;
}
before(async()=>{
  ({readStructureLayout}=await import('./java_class_structure_test.mjs'));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-stateful-'));fs.chmodSync(temporary,0o700);
  output=path.join(temporary,'compiled');const support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
  compileClassFileMetadata({root,classlib:path.join(root,'classes/modern_classlib'),output,support,checked});
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
test('all four public ofStateful factories have exact native Supplier descriptors and actual Java bodies',()=>{
  for(const owner of ['Class','Field','Method','Code']){
    const bytes=fs.readFileSync(path.join(output,'java/lang/classfile/'+owner+'Transform.class')),layout=readStructureLayout(bytes);
    assert.equal(bytes.readUInt16BE(6),53);
    const found=layout.methods.entries.find(method=>method.name==='ofStateful'&&method.descriptor===
      '(Ljava/util/function/Supplier;)Ljava/lang/classfile/'+owner+'Transform;');
    assert.ok(found?.code);assert.equal(found.flags,9);
  }
});
test('actual fresh-source guest preserves all31 native traversal/factory/reentrancy/exception ordering assertions',()=>{
  const diagnostic=path.join(temporary,'diagnostic');fs.mkdirSync(diagnostic);
  checked('javac',['--release','9','--patch-module','java.base='+output+path.delimiter+path.join(root,'ci'),
    '-d',diagnostic,path.join(root,'ci/ClassFileStatefulTransformRegression.java')]);
  const result=runClassFileMetadataGuest({root,output,diagnostic,checked,
    className:'classes.modern_test.ClassFileStatefulTransformRegression',
    requiredPackages:['java/lang/classfile','java/lang/classfile/instruction','java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'),'CLASSFILE_STATEFUL_TRANSFORM_REGRESSION_OK|31\n');assert.equal(result.stderr,'');
});
