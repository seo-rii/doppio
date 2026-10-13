'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {before,after,test}=require('node:test');
const {compileClassFileMetadata,runClassFileMetadataGuest}=require('./compile_classfile_metadata.cjs');
const root=path.resolve(__dirname,'..');let temporary,output,readStructureLayout;
function checked(command,args,cwd=root,timeout=60000) {
  const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
  assert.equal(result.error,undefined,String(result.error));assert.equal(result.signal,null);
  assert.equal(result.status,0,(result.stderr||result.stdout).slice(-5000));return result;
}
before(async()=>{
  ({readStructureLayout}=await import('./java_class_structure_test.mjs'));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-special-invoke-'));fs.chmodSync(temporary,0o700);
  output=path.join(temporary,'compiled');const support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
  compileClassFileMetadata({root,classlib:path.join(root,'classes/modern_classlib'),output,support,checked});
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
test('fresh compiled flow keeps a separate verification purpose with real class-version input',()=>{
  const bytes=fs.readFileSync(path.join(output,'java/lang/classfile/DoppioCodeFlow.class')),layout=readStructureLayout(bytes);
  assert.equal(bytes.readUInt16BE(6),53);
  const found=layout.methods.entries.find(method=>method.name==='analyzeForVerification'&&method.descriptor===
    '(Ljava/lang/constant/ClassDesc;Ljava/lang/constant/ClassDesc;Ljava/util/List;Ljava/lang/classfile/constantpool/ConstantPool;Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;I[BIILjava/util/List;Ljava/util/Map;ZLjava/lang/classfile/ClassHierarchyResolver;II)Ljava/lang/classfile/DoppioCodeFlow$Result;');
  assert.ok(found?.code);assert.equal(found.flags,8);
});
test('fresh-source guest reproduces all14 native nonconstructor special owner, receiver, version and generator checks',()=>{
  const diagnostic=path.join(temporary,'diagnostic');fs.mkdirSync(diagnostic);
  checked('javac',['--release','9','--patch-module','java.base='+output+path.delimiter+path.join(root,'ci'),
    '-d',diagnostic,path.join(root,'ci/ClassFileSpecialInvokeRegression.java')]);
  const result=runClassFileMetadataGuest({root,output,diagnostic,checked,className:'classes.modern_test.ClassFileSpecialInvokeRegression',
    requiredPackages:['java/lang/classfile','java/lang/classfile/instruction','java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'),'CLASSFILE_SPECIAL_INVOKE_REGRESSION_OK|14\n');assert.equal(result.stderr,'');
});
