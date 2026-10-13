'use strict';
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {before,after,test}=require('node:test');
const {compileClassFileMetadata,runClassFileMetadataGuest}=require('./compile_classfile_metadata.cjs');
const root=path.resolve(__dirname,'..');
let temporary,output,readStructureLayout;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function checked(command,args,cwd=root,timeout=60000){
 const result=cp.spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
 assert.equal(result.error,undefined,String(result.error));assert.equal(result.signal,null);
 assert.equal(result.status,0,(result.stderr||result.stdout).slice(-5000));return result;
}
before(async()=>{
 ({readStructureLayout}=await import('./java_class_structure_test.mjs'));
 temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-classfile-legacy-'));fs.chmodSync(temporary,0o700);
 output=path.join(temporary,'compiled');const support=path.join(temporary,'support');fs.mkdirSync(output);fs.mkdirSync(support);
 compileClassFileMetadata({root,classlib:path.join(root,'classes/modern_classlib'),output,support,checked});
});
after(()=>{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
test('all three genuine legacy facade interfaces expose native parents and exact public factories',()=>{
 const prefix='java/lang/classfile/instruction/DiscontinuedInstruction';
 for(const [suffix,parent,methods] of [
  ['', 'java/lang/classfile/Instruction', []],
  ['$JsrInstruction',prefix,[['target','()Ljava/lang/classfile/Label;',1025],['of','(Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Label;)L'+prefix+'$JsrInstruction;',9],['of','(Ljava/lang/classfile/Label;)L'+prefix+'$JsrInstruction;',9]]],
  ['$RetInstruction',prefix,[['slot','()I',1025],['of','(Ljava/lang/classfile/Opcode;I)L'+prefix+'$RetInstruction;',9],['of','(I)L'+prefix+'$RetInstruction;',9]]]
 ]){
  const bytes=fs.readFileSync(path.join(output,prefix+suffix+'.class')),layout=readStructureLayout(bytes),pool=layout.pool;
  assert.equal(bytes.readUInt16BE(6),53,'Natural release9 compiler output');assert.equal(layout.flags,1537);
  assert.equal(layout.interfaceCount,1);const entry=pool[bytes.readUInt16BE(layout.interfacesOffset)];assert.equal(pool[entry.first].value,parent);
  assert.deepEqual(layout.methods.entries.map(method=>[method.name,method.descriptor,method.flags]),methods);
  assert.equal(layout.attributes.entries.some(attribute=>attribute.name==='PermittedSubclasses'),false,'Sealing remains independent and unproved');
  assert.equal(layout.attributes.entries.some(attribute=>attribute.name==='Deprecated'),false,'Discontinued is not deprecation');
  for(const method of layout.methods.entries)if(method.flags&8)assert.ok(method.code,'Actual forwarding factory body');
 }
});
test('fresh facade runs unchanged stock25 legacy caller: eight cases, eight real arrays, honest inference boundary',()=>{
 const diagnostic=path.join(temporary,'diagnostic'),empty=path.join(temporary,'empty');fs.mkdirSync(diagnostic);fs.mkdirSync(empty);
 const sdk=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json'))).toolchains.find(item=>item.feature===25).home;
 const inputs=['classes/modern_fixture/ClassFileLegacyFinal.java','classes/modern_fixture/classfile/ClassFileSupport.java','ci/ClassFileLegacyRegression.java'].map(relative=>path.join(root,relative));
 const hashes=inputs.map(input=>[input,sha(fs.readFileSync(input))]);
 checked(path.join(sdk,'bin/javac'),['--release','25','-g','-parameters','-encoding','UTF-8','-proc:none','-sourcepath',empty,'-classpath',empty,'-d',diagnostic,...inputs]);
 assert.deepEqual(inputs.map(input=>[input,sha(fs.readFileSync(input))]),hashes,'No original source adapters');
 const original=fs.readFileSync(path.join(diagnostic,'classes/modern_test/ClassFileLegacyFinal.class'));assert.equal(original.readUInt16BE(6),69,'Original unchanged natural stock25 output');
 const result=runClassFileMetadataGuest({root,output,diagnostic,checked,className:'classes.modern_test.ClassFileLegacyRegression',requiredPackages:['java/lang/classfile','java/lang/classfile/instruction','java/lang/classfile/constantpool']});
 assert.equal(result.stderr,'');const lines=result.stdout.replaceAll('\r\n','\n').trim().split('\n');
 assert.equal(lines.filter(line=>line.startsWith('CASE|')).length,8);assert.equal(lines.filter(line=>line.startsWith('CF_ARTIFACT|')).length,8);
 assert.deepEqual(lines.slice(-2),['CLASSFILE_LEGACY_OK','CLASSFILE_LEGACY_REGRESSION_OK|24']);
 assert.ok(lines.includes('CASE|cf-legacy-relocate-promote|major49;NEW_POOL;real-target/code-shift=33002;JSR-promoted-JSR_W;FAIL-short=IAE;verify=inference-unsupported;values=42/42;defined/invoked=each-same-bytes'));
 assert.ok(lines.includes('CASE|cf-legacy-version-policy|major50=fallback/inference-unsupported;GENERATE-major49/default-major51=IAE;DROP-major51=encodable/verify-errors;all-policy-packets=never-defined'));
 for(const line of lines.filter(line=>line.startsWith('CF_ARTIFACT|'))){
  const [,caseId,id,encoded]=line.split('|'),bytes=Buffer.from(encoded,'base64'),layout=readStructureLayout(bytes);
  assert.equal(bytes.readUInt32BE(0),0xcafebabe);assert.equal(layout.methods.entries.filter(method=>method.code).length,1);
  assert.equal(bytes.readUInt16BE(6),id==='legacy-major50-metadata'?50:id==='legacy-major51-invalid'?51:49);
  assert.ok(caseId.startsWith('cf-legacy-'));assert.equal(bytes.toString('base64'),encoded);
 }
});
