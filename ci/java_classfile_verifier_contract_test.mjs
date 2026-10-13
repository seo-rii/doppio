import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {before,after,test} from 'node:test';
import {fileURLToPath} from 'node:url';
import * as gate from './java_classfile_verifier_test.mjs';
import {proveVerifierInputs,assertVerifierInputProofs,inspectVerifierArtifactBytes,verifierArtifactProfile,
  classifyVerifierMessage} from './java_classfile_verifier_bytecode.mjs';
import {decodeClassFileEvidence} from './java_classfile_declarations_bytecode.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {runCommand,inspectClassFiles,validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),clone=structuredClone;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
let temporary,record,prepared,result,proved,sourceHashes;
const packets=new Map();
before(async()=>{
  gate.validateVerifierCases();const lockBytes=fs.readFileSync(path.join(root,'ci/java_compatibility_toolchains.lock.json')),lock=JSON.parse(lockBytes);
  const marker=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json')));validateToolchains(marker,lock,sha(lockBytes),[21,25]);
  prepared=marker.toolchains.find(value=>value.feature===25);assert.equal(treeDigest(prepared.home),lock.toolchains.find(value=>value.feature===25).treeSha256);
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-verifier-phase-contract-'));fs.chmodSync(temporary,0o700);
  const directory=path.join(temporary,'release25'),output=path.join(directory,'classes'),empty=path.join(temporary,'empty-sourcepath');fs.mkdirSync(output,{recursive:true});fs.mkdirSync(empty);
  const sources=[gate.verifierInputContract.source,...gate.verifierInputContract.additionalSources].map(file=>path.join(root,file));sourceHashes=sources.map(file=>[file,sha(fs.readFileSync(file))]);
  const command=path.join(prepared.home,'bin/javac'),args=['--release','25','-encoding','UTF-8','-proc:none','-g','-parameters','-sourcepath',empty,'-classpath',empty,'-d',output,...sources];
  const compiled=await runCommand(command,args,{cwd:directory,timeoutMs:gate.verifierTimeouts.compileMs});assert.equal(compiled.status,'passed',compiled.stderr);
  const classFiles=inspectClassFiles(output,25,gate.verifierInputContract.mainClass);record={release:25,group:'classfile-verifier-phase',emptySourcepath:empty,classFiles,
    inputProofs:proveVerifierInputs(output,classFiles),cases:gate.verifierPhaseCases,
    classpath:{directory:output,treeSha256:treeDigest(output),genuineCompilerBytes:true,byteTransformations:false,fallbackClassFiles:false},
    operations:[{kind:'genuine-original',command,arguments:args,sourceDigests:sources.map(file=>({path:file,sha256:sha(fs.readFileSync(file))})),
      result:compiled,outputEvidence:gate.captureVerifierOutput(output)}]};gate.assertVerifierCompilation(record,prepared);
  result=await runCommand(path.join(prepared.home,'bin/java'),['-Xverify:all','-cp',output,gate.verifierInputContract.mainClass],{cwd:directory,timeoutMs:gate.verifierTimeouts.nativeMs});
  proved=gate.assertVerifierResult(result,'native',record);
  for(const line of result.stdout.split('\n').filter(value=>value.startsWith('CF_ARTIFACT|'))){const[,id,artifactId,encoded]=line.split('|');
    packets.set(artifactId,{id,bytes:Buffer.from(encoded,'base64'),contract:gate.verifierPhaseCases.find(value=>value.id===id).artifacts.find(value=>value.id===artifactId)});}
});
after(()=>{try{if(sourceHashes)for(const[file,digest]of sourceHashes)assert.equal(sha(fs.readFileSync(file)),digest,'Original source stayed unchanged');}
  finally{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});}});

test('independent final verifier catalogue requires all original metadata cases and native Node Chromium',()=>{
  assert.deepEqual(gate.verifierPhaseSummary,{cases:65,artifacts:65,compilerRows:6});assert.equal(gate.validateVerifierCases(),65);
  assert.deepEqual(gate.verifierHosts,['native','node','chromium']);assert.deepEqual(gate.verifierApplicability.map(value=>[value.release,value.applicable]),[[21,false],[25,true]]);
  assert.ok(gate.verifierPhaseCases.every(entry=>entry.artifacts.every(value=>value.definition==='never-define')));
  assert.equal(gate.verifierPhaseCases.reduce((n,entry)=>n+entry.artifacts.length,0),gate.verifierPhaseSummary.artifacts);
});
test('CLI accepts only the complete official browser mode, never diagnostic or filtered waivers',()=>{
  assert.equal(gate.parseVerifierMode(['--browser']),'browser');
  for(const args of [[],['--diagnostic'],['--native-only'],['--browser','--case','phase-v69-valid'],['--browser','--skip-node']])assert.throws(()=>gate.parseVerifierMode(args));
  const ledger=gate.createVerifierLedger();assert.equal(ledger.officialGate,true);assert.equal(ledger.requestedMode,'browser');assert.equal(ledger.results[0].executions.length,3);
});
test('all finite completion flags remain exactly false and old C7 ledgers cannot substitute',()=>{
  for(const flag of gate.verifierCompletionFlags)for(const value of [true,null,undefined,0,'false']){const ledger=gate.createVerifierLedger();ledger[flag]=value;assert.throws(()=>gate.assertVerifierLedger(ledger,{phase:'initial'}));}
  for(const change of [ledger=>ledger.phaseId='C7d5',ledger=>ledger.scope='old structural gate',ledger=>ledger.officialGate=false,
    ledger=>ledger.requiredReleases=[21,25],ledger=>ledger.results[0].executions.pop()]){const ledger=gate.createVerifierLedger();change(ledger);assert.throws(()=>gate.assertVerifierLedger(ledger,{phase:'initial'}));}
});
test('catalogue refuses altered IDs, order, counts, scalar error predicates and raw packet recipes',()=>{
  const mutations=[values=>values.pop(),values=>values.reverse(),values=>values[0].id='phase-other',values=>values[0].categories=['empty'],
    values=>values[0].profileLine='PROFILE|waived',values=>values[0].artifacts[0].profile.major=68,values=>values[0].artifacts[0].definition='define-and-invoke'];
  for(const mutate of mutations){const values=clone(gate.verifierPhaseCases);mutate(values);assert.throws(()=>gate.validateVerifierCases(values));}
  assert.throws(()=>gate.verifierPhaseCases.pop(),TypeError);assert.throws(()=>{gate.verifierPhaseCases[0].artifacts[0].profile.major=0;},TypeError);
});
test('fresh untouched stock25 original has every frozen real helper loop lambda callback and compiler row',()=>{
  assert.equal(record.classFiles.length,gate.verifierPhaseSummary.compilerRows);assert.ok(record.classFiles.every(value=>value.major===69&&value.minor===0));
  assertVerifierInputProofs(record.inputProofs,record.classFiles);assert.equal(record.inputProofs.targetsNeverDefined,true);
  assert.equal(record.inputProofs.generalInterproceduralDataFlowConformanceProven,false);
  assert.equal(record.inputProofs.helperProofs.reduce((n,type)=>n+type.methods.length,0),74);
  assert.ok(record.inputProofs.arrayRoutes.some(route=>route.method==='outcome'&&route.byteArrayParameter===2));
  assert.ok(record.inputProofs.arrayRoutes.some(route=>route.method==='callbackArtifact'&&route.byteArrayParameter===1));
});
test('compiler contracts reject host adapters altered recipes header versions and absent helper rows',()=>{
  for(const mutation of [copy=>copy.operations[0].arguments[1]='17',copy=>copy.operations[0].arguments.push('-XDignore.symbol.file'),
    copy=>copy.operations[0].sourceDigests.pop(),copy=>copy.classFiles[0].major=53,copy=>copy.classFiles.pop(),
    copy=>copy.classpath.byteTransformations=true,copy=>copy.classpath.fallbackClassFiles=true]){
    const copy=clone(record);mutation(copy);assert.throws(()=>gate.assertVerifierCompilation(copy,prepared));}
});
test('original proof replays original bytes and rejects rewritten semantic helpers or route substitutions',()=>{
  for(const mutation of [copy=>copy.helperProofs[0].methods[0].instructionDigest='0'.repeat(64),
    copy=>copy.arrayRoutes[0].byteArrayParameter=1,copy=>copy.compilerBytesTransformed=true,
    copy=>copy.classes[0].methods[0].flags^=8,copy=>copy.classes[0].originalBytesBase64=Buffer.from('not-original').toString('base64')]){
    const copy=clone(record.inputProofs);mutation(copy);assert.throws(()=>assertVerifierInputProofs(copy,record.classFiles));}
});
test('native actual metadata arrays preserve all raw field Code LVT noCode Object-zero-super vectors',()=>{
  assert.equal(proved.outcomes.length,gate.verifierPhaseSummary.cases);assert.equal(proved.artifacts.length,gate.verifierPhaseSummary.artifacts);
  for(const{bytes,contract}of packets.values())inspectVerifierArtifactBytes(bytes,contract);
  assert.equal(packets.get('phase-excluded-Object').contract.profile.superclass,null);
  assert.equal(packets.get('phase-bridge-no-code').contract.profile.methods[0].code,null);
  const constant=packets.get('phase-v69-parser-bridge').contract.profile.fields[0].attributes[0];assert.equal(constant.name,'ConstantValue');assert.deepEqual(constant.contents,{tag:3,value:7});
  const lvt=packets.get('phase-ordinary-lvt-operand').contract.profile.methods[0].code.attributes.find(value=>value.name==='LocalVariableTable');assert.equal(lvt.contents[0].start,1);
  assert.ok(proved.artifacts.every(value=>value.definition==='never-define'&&value.fullVerifierConformanceProven===false));
});
test('raw inputs reject changed opcode bytes and maxStack while retaining actual underflow packets',()=>{
  const{bytes,contract}=packets.get('phase-v69-ordinary-bad'),layout=readStructureLayout(bytes),code=layout.methods.entries[0].code;
  for(const change of [copy=>copy[code.instructionsOffset]=177,copy=>copy.writeUInt16BE(1,code.body),copy=>copy.writeUInt16BE(1,code.body+2)]){
    const copy=Buffer.from(bytes);change(copy);assert.throws(()=>inspectVerifierArtifactBytes(copy,contract));}
});
test('invalid LVT remains raw and changed start length slot or CP operand cannot pass',()=>{
  const{bytes,contract}=packets.get('phase-ordinary-lvt-operand'),layout=readStructureLayout(bytes),table=layout.methods.entries[0].code.attributes.entries.find(value=>value.name==='LocalVariableTable');
  for(const relative of [2,4,6,8,10]){const copy=Buffer.from(bytes),at=table.body+relative;copy.writeUInt16BE((copy.readUInt16BE(at)+1)&65535,at);assert.throws(()=>inspectVerifierArtifactBytes(copy,contract));}
});
test('wrong ConstantValue CP tag/value and method flag changes fail independent metadata profiles',()=>{
  const{bytes,contract}=packets.get('phase-v69-parser-bridge'),layout=readStructureLayout(bytes),attr=layout.fields.entries[0].attributes.entries.find(value=>value.name==='ConstantValue');
  const index=bytes.readUInt16BE(attr.body),entry=layout.pool[index];assert.equal(entry.tag,3);
  for(const change of [copy=>copy.writeInt32BE(8,entry.start+1),copy=>copy[entry.start]=4,copy=>copy.writeUInt16BE(9,layout.methods.entries[0].start)]){
    const copy=Buffer.from(bytes);change(copy);assert.throws(()=>inspectVerifierArtifactBytes(copy,contract));}
});
test('raw message categories allow only reviewed diagnostics and preserve held parser exception boundaries',()=>{
  const normal=gate.verifierPhaseCases.find(entry=>entry.id==='phase-v69-ordinary-bad');assert.equal(classifyVerifierMessage('Operand stack underflow',normal),'byte-underflow');
  for(const message of ['', 'anything is an error', 'Operand stack underflow\nignored'])assert.throws(()=>classifyVerifierMessage(message,normal));
  const callback=gate.verifierPhaseCases.find(entry=>entry.id==='phase-parser-callback-IAE');assert.equal(classifyVerifierMessage('phase-parser-held-IAE',callback),'parser-IAE-singleton');
  assert.throws(()=>classifyVerifierMessage('java.lang.IllegalArgumentException: phase-parser-held-IAE',callback));
  const initialization=gate.verifierPhaseCases.find(entry=>entry.initializationDebug);
  for(const message of ['Bytecode offset out of range; bci=4, codeLength=3','Debug label offset out of range'])
    assert.equal(classifyVerifierMessage(message,initialization),'initialization-debug');
  for(const message of ['anything is an error','Inference verification is not supported','Bytecode offset out of range; bci=5, codeLength=3','Debug label offset out of range: ignored'])
    assert.throws(()=>classifyVerifierMessage(message,initialization));
});
test('ordered raw output refuses missing reordered unbound messages packets or extra suffix',()=>{
  for(const change of [value=>value.replace('PROFILE|phase-v49-valid','PROFILE|other'),value=>value.replace('CASE|phase-v49-valid','CASE|other'),
    value=>value.replace(/CF_ARTIFACT\|[^\n]+\n/,''),value=>value+'ignored\n',value=>value.replace('VERIFY_MESSAGE|phase-v49-valid','VERIFY_MESSAGE|other')]){
    const copy=clone(result);copy.stdout=change(copy.stdout);assert.throws(()=>gate.assertVerifierResult(copy,'native',record));}
  for(const flag of ['timedOut','outputLimitExceeded']){const copy=clone(result);copy[flag]=true;assert.throws(()=>gate.assertVerifierResult(copy,'native',record));}
});
test('pure verifier decoder does not define class targets or silently normalize impossible metadata',()=>{
  const{bytes,contract}=packets.get('phase-bridge-debug-initialization');const decoded=decodeClassFileEvidence(bytes),profile=verifierArtifactProfile(decoded);
  assert.deepEqual(profile,contract.profile);const table=profile.methods[0].code.attributes.find(value=>value.name==='LocalVariableTable');assert.equal(table.contents[0].start,4);
  assert.equal(contract.definition,'never-define');assert.equal(decoded.major,69);
});
test('source closure includes original helpers codecs compiler and workflow but no private oracle input',()=>{
  const paths=gate.verifierInputPaths();assert.equal(new Set(paths).size,paths.length);
  for(const relative of ['ci/ClassFileVerifierPhaseRegression.java','ci/java_classfile_verifier_bytecode.mjs','ci/classfile_verifier_phase_cases.mjs',
    'ci/classfile_verifier_phase_test.cjs','ci/compile_classfile_metadata.cjs','.github/workflows/modern-java.yml'])assert.ok(paths.includes(path.join(root,relative)));
  assert.ok(paths.some(file=>file.endsWith('/DoppioClassFileParserVerifier.java')));assert.ok(!paths.some(file=>file.includes('/.codex/')||file.includes('/logs/')));
});
