import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {before,after,test} from 'node:test';
import {fileURLToPath} from 'node:url';
import * as gate from './java_classfile_declarations_test.mjs';
import * as debug from './java_classfile_debug_test.mjs';
import {classFileInputContracts,classFileArtifactContracts,proveClassFileInputGroup,
  assertClassFileInputProofs,proveClassFileArtifact} from './java_classfile_declarations_bytecode.mjs';
import {inspectClassFiles,runCommand,validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),clone=structuredClone,
  sha=value=>crypto.createHash('sha256').update(value).digest('hex'),positives=new Map();
let temporary,sourceHashes;
before(async()=>{
  const lockBytes=fs.readFileSync(path.join(root,'ci/java_compatibility_toolchains.lock.json')),lock=JSON.parse(lockBytes),
    marker=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json')));
  validateToolchains(marker,lock,sha(lockBytes),[21,25]);
  const prepared=marker.toolchains.find(item=>item.feature===25);
  assert.equal(treeDigest(prepared.home),lock.toolchains.find(item=>item.feature===25).treeSha256);
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-c7d4-contract-'));fs.chmodSync(temporary,0o700);
  const empty=path.join(temporary,'empty-sourcepath');fs.mkdirSync(empty);
  sourceHashes=[...new Set(gate.classFileGroups.flatMap(group=>[group.source,...group.additionalSources]))]
    .map(relative=>[path.join(root,relative),sha(fs.readFileSync(path.join(root,relative)))]);
  for(const group of gate.classFileGroups){
    const directory=path.join(temporary,'release25',group.id,'classes');fs.mkdirSync(directory,{recursive:true});
    const sources=[group.source,...group.additionalSources].map(relative=>path.join(root,relative));
    const args=['--release','25','-encoding','UTF-8','-proc:none','-g','-parameters','-sourcepath',empty,'-classpath',empty,'-d',directory,...sources];
    const compiled=await runCommand(path.join(prepared.home,'bin/javac'),args,{cwd:path.dirname(directory),timeoutMs:gate.classFileTimeouts.compileMs});
    assert.equal(compiled.status,'passed',compiled.stderr);assert.equal(compiled.exitCode,0);assert.equal(compiled.signal,null);
    const classFiles=inspectClassFiles(directory,25,group.mainClass),record={release:25,group:group.id,classFiles,cases:group.cases,
      inputProofs:proveClassFileInputGroup(group,directory,classFiles)};
    const digest=treeDigest(directory);
    record.classpath={directory,treeSha256:digest,genuineCompilerBytes:true,byteTransformations:false,fallbackClassFiles:false};
    record.operations=[{kind:'genuine-driver',command:path.join(prepared.home,'bin/javac'),arguments:args,
      sourceDigests:sources.map(filename=>({path:filename,sha256:sha(fs.readFileSync(filename))})),result:compiled,
      outputEvidence:{directory,treeSha256:digest,files:classFiles.map(({path,size,sha256})=>({path,size,sha256}))}}];
    gate.assertClassFileCompilation(record,group,prepared);assertClassFileInputProofs(record,group);
    const result=await runCommand(path.join(prepared.home,'bin/java'),['-Xverify:all','-cp',directory,group.mainClass],
      {cwd:path.dirname(directory),timeoutMs:gate.classFileTimeouts.nativeMs});
    const proved=gate.assertClassFileResult(result,group,'native',record);
    positives.set(group.id,{group,record,result,proved,prepared,directory});
  }
});
after(()=>{
  try{if(sourceHashes)for(const[file,digest]of sourceHashes)assert.equal(sha(fs.readFileSync(file)),digest,'Original compiler inputs unchanged');}
  finally{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});}
});
test('four independent original groups fix32 cases and12 mandatory cells',()=>{
  assert.equal(gate.validateClassFileGroups(),32);
  assert.deepEqual(gate.classFileGroups.map(group=>group.id),['classfile-declarations-signatures','classfile-declarations-type-annotations',
    'classfile-declarations-metadata','classfile-declarations-combinators']);
  assert.deepEqual(gate.classFileGroups.map(group=>group.cases.length),[8,8,8,8]);
  assert.deepEqual(gate.classFileGroups.map(group=>group.driverClassNames.length),[7,9,10,6]);
  assert.deepEqual(gate.classFileHosts,['native','node','chromium']);assert.deepEqual(gate.classFileReleases,[25]);
  assert.equal(gate.classFileApplicability[0].applicable,false);assert.equal(gate.classFileApplicability[1].applicable,true);
});
test('case inventory and compiler source schema reject missing duplicated or adapter recipes',()=>{
  for(const mutate of [groups=>groups.pop(),groups=>groups[0].cases.pop(),groups=>groups[0].cases[1].id=groups[0].cases[0].id,
    groups=>groups[0].releases.push(21),groups=>groups[0].generatedSources=[],groups=>groups[0].javacFlags.pop(),
    groups=>groups[0].driverClassNames.pop(),groups=>groups[0].additionalSources.push('ci/adapter.java')]){
    const groups=clone(gate.classFileGroups);mutate(groups);assert.throws(()=>gate.validateClassFileGroups(groups));
  }
});
test('all18 broader flags remain false including independent native sealing topology',()=>{
  assert.equal(gate.classFileCompletionFlags.length,18);
  assert.deepEqual(gate.classFileCompletionFlags.slice(0,17),debug.classFileCompletionFlags);
  assert.equal(gate.classFileCompletionFlags.at(-1),'classFileApiSealingConformanceProven');
  for(const flag of gate.classFileCompletionFlags){const ledger=gate.createClassFileLedger();assert.equal(ledger[flag],false);
    ledger[flag]=true;assert.throws(()=>gate.assertClassFileLedger(ledger,{phase:'initial'}));}
});
test('exact stock25 compilation rejects missing parameters flags altered sources fallback or rewritten headers',()=>{
  for(const{group,record,prepared}of positives.values())for(const mutate of [r=>r.operations[0].arguments.splice(6,1),
    r=>r.operations[0].sourceDigests[0].sha256='0'.repeat(64),r=>r.classpath.fallbackClassFiles=true,
    r=>r.classFiles[0].major=53,r=>r.operations.push(clone(r.operations[0])),r=>r.classFiles.pop()]){
    const bad=clone(record);mutate(bad);assert.throws(()=>gate.assertClassFileCompilation(bad,group,prepared));
  }
});
test('original callback resource array and definition routes are replayed from genuine driver bytes',()=>{
  let rows=0,routes=0;const unique=new Set();
  for(const{record,group}of positives.values()){
    assertClassFileInputProofs(record,group);rows+=record.classFiles.length;record.classFiles.forEach(file=>unique.add(file.path));
    routes+=record.inputProofs.returnedArrayRoutes.length;
    for(const mutate of [r=>r.inputProofs.classes[0].originalBytesBase64='',r=>r.inputProofs.returnedArrayRoutes.pop(),
      r=>r.inputProofs.callbackProofs.pop(),r=>r.inputProofs.caseProofs.pop()]){
      const bad=clone(record);mutate(bad);assert.throws(()=>assertClassFileInputProofs(bad,group));
    }
    assert.equal(group.source,classFileInputContracts[group.id].source);
  }
  assert.equal(rows,32);assert.equal(unique.size,29);assert.equal(routes,32);
});
test('native outputs retain32 real arrays with28 defined outputs and four explicitly never-defined metadata objects',()=>{
  const contracts=Object.values(classFileArtifactContracts).flat();assert.equal(contracts.length,32);
  assert.equal(contracts.filter(value=>value.definition==='define-and-invoke').length,28);
  assert.equal(contracts.filter(value=>value.definition==='metadata-only-neverdefine').length,4);
  assert.equal(contracts.reduce((count,value)=>count+value.methods.length,0),110);
  assert.deepEqual(gate.classFileGroups.map(group=>group.cases.flatMap(entry=>classFileArtifactContracts[entry.id]).length),[8,8,7,9]);
});
test('artifact transport rejects omitted duplicate cross-case and noncanonical actual byte arrays',()=>{
  for(const{group,record,result}of positives.values()){
    const lines=result.stdout.trimEnd().split('\n'),artifact=lines.find(line=>line.startsWith('CF_ARTIFACT|')),fields=artifact.split('|');
    for(const stdout of [lines.filter(line=>line!==artifact).join('\n')+'\n',artifact+'\n'+result.stdout,
      result.stdout.replace(artifact,[fields[0],'not-original',fields[2],fields[3]].join('|')),
      result.stdout.replace(artifact,[...fields.slice(0,3),fields[3]+'='].join('|'))])
      assert.throws(()=>gate.assertClassFileResult({...result,stdout},group,'native',record));
  }
});
test('actual original output class bytes reject altered class flags and recursive declaration metadata',()=>{
  for(const{record,result}of positives.values())for(const line of result.stdout.split('\n').filter(line=>line.startsWith('CF_ARTIFACT|'))){
    const[,caseId,id,base64]=line.split('|'),contract=classFileArtifactContracts[caseId].find(value=>value.id===id),bytes=Buffer.from(base64,'base64');
    proveClassFileArtifact(bytes,contract,{host:'native',caseId,record});
    const bad=Buffer.from(bytes),layout=readStructureLayout(bad);bad[layout.flagsOffset+1]^=1;
    assert.throws(()=>proveClassFileArtifact(bad,contract,{host:'native',caseId,record}));
    const attribute=[...layout.attributes.entries,...layout.fields.entries.flatMap(field=>field.attributes.entries),
      ...layout.methods.entries.flatMap(method=>[...method.attributes.entries,...(method.code?.attributes.entries||[])])]
      .find(value=>value.length>0&&/^(?:Runtime.*Annotations|AnnotationDefault|Record|Module.*|Signature|MethodParameters|EnclosingMethod|PermittedSubclasses)$/.test(value.name));
    if(attribute){const altered=Buffer.from(bytes);altered[attribute.end-1]^=1;
      assert.throws(()=>proveClassFileArtifact(altered,contract,{host:'native',caseId,record}),attribute.name);}
  }
});
test('official declarations ledger replays all96 own host artifacts when available',()=>{
  const filename=path.join(root,'build/java-classfile-declarations-results.json');if(!fs.existsSync(filename))return;
  const ledger=JSON.parse(fs.readFileSync(filename));if(ledger.status!=='passed')return;
  gate.assertClassFileLedger(ledger,{phase:'terminal'});assert.equal(ledger.officialGate,true);
  let outcomes=0,artifacts=0;
  for(const record of ledger.results)for(const cell of record.executions){assert.equal(cell.status,'passed');outcomes+=cell.outcomes.length;artifacts+=cell.artifacts.length;}
  assert.equal(outcomes,96);assert.equal(artifacts,96);
});
test('source closure includes actual public ABI and output diagnostics and never changes source-unit owners',()=>{
  const files=gate.classFileInputPaths();for(const relative of ['ci/classfile_public_abi_test.cjs','ci/classfile_output_test.cjs',
    'ci/java_classfile_declarations_contract_test.mjs','ci/ClassFileTypeAnnotationAttributeRegression.java'])assert.ok(files.includes(path.join(root,relative)));
  const index=JSON.parse(fs.readFileSync(path.join(root,'ci/plan_spec_source_index.json'))),units=new Map(index.units.map(unit=>[unit.id,unit]));
  for(const group of gate.classFileGroups)for(const item of gate.classFileSourceUnits(group,index)){
    assert.equal(item.apiOwnerPackageId,'LIB-007');assert.equal(item.fullApiConformanceProven,false);
    for(const unit of item.sourceUnits){assert.equal(unit.ownerPackageId,units.get(unit.id).ownerPackageId);assert.equal(unit.fullUnitConformanceProven,false);}
  }
});
