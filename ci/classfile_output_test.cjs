'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
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
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-output-'));fs.chmodSync(temporary,0o700);
  output=path.join(temporary,'compiled');const support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
  compileClassFileMetadata({root,classlib:path.join(root,'classes/modern_classlib'),output,support,checked});
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
test('ClassEntry buildTo has the exact native public path/pool/consumer descriptor and real Java body',()=>{
  const bytes=fs.readFileSync(path.join(output,'java/lang/classfile/ClassFile.class')),layout=readStructureLayout(bytes);
  assert.equal(bytes.readUInt16BE(6),53);
  const found=layout.methods.entries.find(method=>method.name==='buildTo'&&method.descriptor===
    '(Ljava/nio/file/Path;Ljava/lang/classfile/constantpool/ClassEntry;Ljava/lang/classfile/constantpool/ConstantPoolBuilder;Ljava/util/function/Consumer;)V');
  assert.ok(found?.code);assert.equal(found.flags,1);
});
test('actual fresh-source guest executes all7 native file-output, replacement and failure-order checks',()=>{
  const diagnostic=path.join(temporary,'diagnostic');fs.mkdirSync(diagnostic);
  checked('javac',['--release','9','--patch-module','java.base='+output+path.delimiter+path.join(root,'ci'),
    '-d',diagnostic,path.join(root,'ci/ClassFileOutputRegression.java')]);
  const result=runClassFileMetadataGuest({root,output,diagnostic,checked,className:'classes.modern_test.ClassFileOutputRegression',
    requiredPackages:['java/lang/classfile','java/lang/classfile/instruction','java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'),'CLASSFILE_OUTPUT_REGRESSION_OK|7\n');assert.equal(result.stderr,'');
});
