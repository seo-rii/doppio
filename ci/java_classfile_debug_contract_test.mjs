import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {before,after,test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as gate from './java_classfile_debug_test.mjs';
import * as instructions from './java_classfile_instructions_test.mjs';
import * as api from './java_classfile_api_test.mjs';
import * as flow from './java_classfile_controlflow_test.mjs';
import * as extended from './java_classfile_extended_test.mjs';
import * as hierarchy from './java_classfile_hierarchy_test.mjs';
import {classFileInputContracts,classFileArtifactContracts,proveClassFileInputGroup,assertClassFileInputProofs,
  inspectClassFileArtifactBytes,proveClassFileArtifact,canonicalClassFileProof} from './java_classfile_debug_bytecode.mjs';
import {inspectClassFiles,runCommand,validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),clone=value=>structuredClone(value),
  sha=value=>crypto.createHash('sha256').update(value).digest('hex'),positives=new Map();
let temporary,sourceHashes;
before(async()=>{
  const lockBytes=fs.readFileSync(path.join(root,'ci/java_compatibility_toolchains.lock.json')),lock=JSON.parse(lockBytes),
    marker=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json')));
  validateToolchains(marker,lock,sha(lockBytes),[21,25]);
  const prepared=marker.toolchains.find(item=>item.feature===25);
  assert.equal(treeDigest(prepared.home),lock.toolchains.find(item=>item.feature===25).treeSha256);
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-c7d3-contract-'));fs.chmodSync(temporary,0o700);
  const empty=path.join(temporary,'empty-sourcepath');fs.mkdirSync(empty);
  sourceHashes=[...new Set(gate.classFileGroups.flatMap(group=>[group.source,...group.additionalSources]))]
    .map(relative=>[path.join(root,relative),sha(fs.readFileSync(path.join(root,relative)))]);
  for(const group of gate.classFileGroups){
    const directory=path.join(temporary,'release25',group.id,'classes');fs.mkdirSync(directory,{recursive:true});
    const sources=[group.source,...group.additionalSources].map(relative=>path.join(root,relative));
    const args=['--release','25','-encoding','UTF-8','-proc:none','-g','-sourcepath',empty,'-classpath',empty,'-d',directory,...sources];
    const compiled=await runCommand(path.join(prepared.home,'bin/javac'),args,{cwd:path.dirname(directory),timeoutMs:gate.classFileTimeouts.compileMs});
    assert.equal(compiled.status,'passed',compiled.stderr);assert.equal(compiled.exitCode,0);assert.equal(compiled.signal,null);
    const classFiles=inspectClassFiles(directory,25,group.mainClass),record={release:25,group:group.id,classFiles,cases:group.cases,
      inputProofs:proveClassFileInputGroup(group,directory,classFiles)};
    const digest=treeDigest(directory);
    record.classpath={directory,treeSha256:digest,genuineCompilerBytes:true,byteTransformations:false,fallbackClassFiles:false};
    record.operations=[{kind:'genuine-driver',command:path.join(prepared.home,'bin/javac'),arguments:args,
      sourceDigests:sources.map(filename=>({path:filename,sha256:sha(fs.readFileSync(filename))})),result:compiled,
      outputEvidence:{directory,treeSha256:digest,files:classFiles.map(({path,size,sha256})=>({path,size,sha256}))}}];
    gate.assertClassFileCompilation(record,group,prepared);
    assertClassFileInputProofs(record,group);
    const result=await runCommand(path.join(prepared.home,'bin/java'),['-Xverify:all','-cp',directory,group.mainClass],
      {cwd:directory,timeoutMs:gate.classFileTimeouts.nativeMs});
    const proved=gate.assertClassFileResult(result,group,'native',record);
    positives.set(group.id,{group,record,result,proved,prepared,args,compiled,directory});
  }
});
after(()=>{
  try{if(sourceHashes)for(const [file,digest]of sourceHashes)assert.equal(sha(fs.readFileSync(file)),digest,'Unchanged original compiler inputs');}
  finally{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});}
});

test('three independent original groups fix 24 cases and nine mandatory host cells',()=>{
  assert.equal(gate.validateClassFileGroups(),24);
  assert.deepEqual(gate.classFileGroups.map(group=>group.id),['classfile-debug-model','classfile-debug-remap','classfile-debug-lifecycle']);
  assert.deepEqual(gate.classFileGroups.map(group=>group.cases.length),[8,8,8]);
  assert.deepEqual(gate.classFileGroups.map(group=>group.driverClassNames.length),[2,3,4]);
  for(const mode of ['browser','native-only','diagnostic']){
    const ledger=gate.createClassFileLedger(mode);assert.equal(ledger.phaseId,'C7d3');assert.equal(ledger.caseCount,24);
    assert.equal(ledger.results.flatMap(row=>row.executions).length,9);assert.equal(ledger.officialGate,mode==='browser');
    gate.assertClassFileLedger(ledger,{phase:'initial'});
  }
});
test('stock compiler, complete output, API-only and callback inventories remain explicit',()=>{
  const contracts=Object.values(classFileArtifactContracts),outputs=contracts.flat();
  assert.equal(contracts.length,24);assert.equal(outputs.length,21);
  assert.equal(outputs.filter(output=>output.definition==='forbidden').length,1);
  assert.equal(outputs.reduce((sum,output)=>sum+output.methods.length,0),33);
  assert.equal(Object.values(classFileInputContracts).reduce((sum,input)=>sum+input.callbacks.length,0),41);
  assert.equal(Object.values(classFileInputContracts).reduce((sum,input)=>sum+input.callbacks.filter(cb=>cb.bootstrap).length,0),34);
  assert.equal(Object.values(classFileInputContracts).reduce((sum,input)=>sum+input.codecs.length,0),2);
  assert.deepEqual(gate.classFileGroups.map(group=>group.cases.reduce((sum,item)=>sum+item.artifacts.length,0)),[8,7,6]);
});
for(const flag of gate.classFileCompletionFlags)test('finite debug profile keeps broader completion false: '+flag,()=>{
  const ledger=gate.createClassFileLedger();assert.equal(ledger[flag],false);
  for(const value of [true,null,undefined,0,'false']){const changed=clone(ledger);changed[flag]=value;assert.throws(()=>gate.assertClassFileLedger(changed));}
  const changed=clone(ledger);delete changed[flag];assert.throws(()=>gate.assertClassFileLedger(changed));
});
test('old API/CFG/attributes/hierarchy/instruction gates cannot stand in for C7d3',()=>{
  for(const other of [api,flow,extended,hierarchy,instructions]){
    assert.throws(()=>gate.assertClassFileLedger(other.createClassFileLedger()));
    assert.throws(()=>other.assertClassFileLedger(gate.createClassFileLedger()));
    assert.throws(()=>gate.createClassFileLedger('browser',other.classFileGroups));
  }
});
test('Java21 is non-applicable and Java25/native/Node/Chromium cannot be waived',()=>{
  assert.deepEqual(gate.classFileApplicability.map(row=>[row.release,row.applicable,row.finalApiSince]),[[21,false,24],[25,true,24]]);
  assert.deepEqual(gate.classFileTimeouts,{compileMs:60000,nativeMs:30000,guestMs:60000});
  for(const mutate of [x=>x.applicability.pop(),x=>x.applicability[0].applicable=true,x=>x.requiredReleases.push(21),
    x=>x.requiredHosts.pop(),x=>x.results[0].release=21,x=>x.results[0].executions[0].status='skipped']){
    const changed=gate.createClassFileLedger();mutate(changed);assert.throws(()=>gate.assertClassFileLedger(changed));
  }
});

test('pruning, reordered groups, altered original recipes and substituted inventories fail closed',()=>{
  for(const mutate of [x=>x.pop(),x=>x.reverse(),x=>x[0].cases.pop(),x=>x[1].cases.reverse(),
    x=>x[0].source=x[1].source,x=>x[0].additionalSources=[],x=>x[1].driverClassNames.pop(),
    x=>x[0].javacFlags=['-g:source'],x=>x[0].releases=[21],x=>x[0].generatedSources=[],
    x=>x[0].cases[0].trace.push('invented'),x=>x[0].cases[0].callbackMethods=[],x=>x[0].cases[0].artifacts=[]]){
    const changed=clone(gate.classFileGroups);mutate(changed);assert.throws(()=>gate.createClassFileLedger('browser',changed));
  }
});
test('partial, reordered, fabricated and cross-phase ledgers cannot claim completion',()=>{
  for(const mutate of [x=>x.results.pop(),x=>x.results.reverse(),x=>x.results[0].executions.pop(),
    x=>x.results[0].executions.reverse(),x=>x.phaseId='C7d2',x=>x.schemaVersion++,x=>x.caseCount--,
    x=>x.status='passed',x=>x.results[0].status='passed',x=>x.results[0].operations.push({}),x=>x.results[0].inputProofs={}]){
    const changed=gate.createClassFileLedger();mutate(changed);assert.throws(()=>gate.assertClassFileLedger(changed,{phase:'initial'}));
  }
  const ledger=gate.createClassFileLedger();ledger.status='passed';assert.throws(()=>gate.assertClassFileLedger(ledger,{phase:'terminal'}));
});
test('genuine compiler argv/source bytes/output evidence cannot become adapters or rewritten headers',()=>{
  for(const {record,group,prepared}of positives.values()){
    gate.assertClassFileCompilation(record,group,prepared);
    for(const mutate of [x=>x.release=21,x=>x.operations.push(clone(x.operations[0])),x=>x.operations[0].kind='adapter',
      x=>x.operations[0].arguments[1]='21',x=>x.operations[0].arguments[6]='-g:source',
      x=>x.operations[0].sourceDigests[0].sha256='f'.repeat(64),x=>x.operations[0].result.command.pop(),
      x=>x.operations[0].result.stderr='unexpected',x=>x.operations[0].result.timedOut=true,x=>x.classFiles.pop(),
      x=>x.classFiles[0].major=53,x=>x.classpath.byteTransformations=true,x=>x.classpath.genuineCompilerBytes=false,
      x=>x.classpath.fallbackClassFiles=true,x=>x.operations[0].outputEvidence.files.pop()]){
      const changed=clone(record);mutate(changed);assert.throws(()=>gate.assertClassFileCompilation(changed,group,prepared));
    }
  }
});
test('fresh stock Java25 originals replay all callbacks, resources and returned byte routes',()=>{
  let cases=0,artifacts=0,rows=0,routes=0;
  for(const {record,group,result}of positives.values()){
    assertClassFileInputProofs(record,group);const proof=gate.assertClassFileResult(result,group,'native',record);
    assert.equal(proof.outcomes.length,8);cases+=proof.outcomes.length;artifacts+=proof.artifacts.length;
    rows+=record.classFiles.length;routes+=record.inputProofs.returnedArrayRoutes.length;
    for(const artifact of proof.artifacts){const expected=classFileArtifactContracts[artifact.caseId].find(item=>item.id===artifact.artifactId);
      assert.deepEqual(proveClassFileArtifact(Buffer.from(artifact.bytesBase64,'base64'),expected,{host:'native',caseId:artifact.caseId,record}),artifact);}
  }
  assert.equal(cases,24);assert.equal(artifacts,21);assert.equal(rows,9);assert.equal(routes,21);
});

test('original compiler bytes, callbacks and returned routes are independently replayed rather than trusted',()=>{
  for(const {record,group}of positives.values()){
    for(const mutate of [x=>x.inputProofs.classes.pop(),x=>x.inputProofs.callbackProofs.pop(),
      x=>x.inputProofs.returnedArrayRoutes[0].byteArrayLocal++,x=>x.inputProofs.caseCallbackProofs[0].probes[0].codeSha256='f'.repeat(64),
      x=>x.inputProofs.classes[0].originalBytesBase64=x.inputProofs.classes[1].originalBytesBase64]){
      const changed=clone(record);mutate(changed);assert.throws(()=>assertClassFileInputProofs(changed,group));
    }
    assertClassFileInputProofs(JSON.parse(JSON.stringify(record)),group);
  }
});
test('API-only no-definition and deferred mapper/exception identity claims cannot be pruned',()=>{
  for(const {record,group}of positives.values()){
    for(const field of ['apiOnlyRoutes','mapperLifecycleProof'])if(record.inputProofs[field]){
      const changed=clone(record);delete changed.inputProofs[field];assert.throws(()=>assertClassFileInputProofs(changed,group));
    }
  }
  assert.ok(positives.get('classfile-debug-lifecycle').record.inputProofs.mapperLifecycleProof);
});
test('CASE traces without actual host-returned artifacts cannot pass',()=>{
  for(const {record,group,result}of positives.values()){
    const changed=clone(result);changed.stdout=group.cases.map(item=>'CASE|'+item.id+'|'+item.trace[0]).join('\n')+'\n'+group.completionMarker+'\n';
    assert.throws(()=>gate.assertClassFileResult(changed,group,'native',record));
    for(const mutate of [x=>x.stderr='unexpected',x=>x.exitCode=1,x=>x.signal='SIGTERM',x=>x.timedOut=true,
      x=>x.outputLimitExceeded=true,x=>x.stdout=x.stdout.replace(group.completionMarker,'missing')]){
      const bad=clone(result);mutate(bad);assert.throws(()=>gate.assertClassFileResult(bad,group,'native',record));
    }
    assert.throws(()=>gate.assertClassFileResult(result,group,'unknown',record));
  }
});
test('truncated, suffixed and invalid Code bytes cannot replace any complete returned output',()=>{
  for(const {record,group,result}of positives.values())for(const artifact of gate.assertClassFileResult(result,group,'native',record).artifacts){
    const expected=classFileArtifactContracts[artifact.caseId].find(item=>item.id===artifact.artifactId),bytes=Buffer.from(artifact.bytesBase64,'base64');
    assert.throws(()=>inspectClassFileArtifactBytes(bytes.subarray(0,bytes.length-1),expected));
    assert.throws(()=>inspectClassFileArtifactBytes(Buffer.concat([bytes,Buffer.from([0])]),expected));
    const changed=Buffer.from(bytes),method=readStructureLayout(bytes).methods.entries.find(item=>item.code);
    changed[method.code.instructionsOffset]=255;assert.throws(()=>inspectClassFileArtifactBytes(changed,expected));
    assert.throws(()=>proveClassFileArtifact(bytes,expected,{host:'native',caseId:'not-an-original-case',record}));
  }
});

test('actual debug and custom attribute bytes reject changed line/scope/UTF/character/reference vectors',()=>{
  const seen=new Set();let mutations=0;
  for(const {group,record,result}of positives.values())for(const artifact of gate.assertClassFileResult(result,group,'native',record).artifacts){
    const contract=classFileArtifactContracts[artifact.caseId].find(item=>item.id===artifact.artifactId),bytes=Buffer.from(artifact.bytesBase64,'base64'),layout=readStructureLayout(bytes);
    const attributes=[...layout.attributes.entries,...layout.fields.entries.flatMap(field=>field.attributes.entries),
      ...layout.methods.entries.flatMap(method=>[...method.attributes.entries,...(method.code?.attributes.entries||[])])];
    for(const attribute of attributes){
      const positions=attribute.name==='LineNumberTable'?[attribute.body+4]:
        ['LocalVariableTable','LocalVariableTypeTable'].includes(attribute.name)?[attribute.body+2,attribute.body+4,attribute.body+6,attribute.body+8,attribute.body+10]:
        attribute.name==='CharacterRangeTable'?[attribute.body+2,attribute.body+4,attribute.body+6,attribute.body+10,attribute.body+14]:
        attribute.name==='D3Lifecycle'?[attribute.body,attribute.body+4]:attribute.name==='SourceDebugExtension'?[attribute.body]:[];
      for(const position of positions){
        assert.ok(position<attribute.end);const altered=Buffer.from(bytes);altered[position]^=1;
        assert.throws(()=>inspectClassFileArtifactBytes(altered,contract),attribute.name+' actual payload tamper');mutations++;
      }
      if(positions.length)seen.add(attribute.name);
    }
  }
  assert.deepEqual([...seen].sort(),['CharacterRangeTable','D3Lifecycle','LineNumberTable','LocalVariableTable','LocalVariableTypeTable','SourceDebugExtension']);
  assert.ok(mutations>=50,'All six selected debug/custom payload families independently mutated');
});
test('debug input closure uniquely binds original recipes, complete proof contracts and diagnostics',()=>{
  const files=gate.classFileInputPaths();assert.equal(new Set(files).size,files.length);assert.deepEqual(files,files.slice().sort());
  for(const group of gate.classFileGroups)for(const relative of [group.source,...group.additionalSources])assert.ok(files.includes(path.join(root,relative)));
  for(const relative of ['ci/java_classfile_debug_contract_test.mjs','ci/java_classfile_debug_bytecode.mjs',
    'ci/classfile_debug_model_cases.mjs','ci/classfile_debug_remap_cases.mjs','ci/classfile_debug_lifecycle_cases.mjs',
    'ci/ClassFileDebugInstructionRegression.java','ci/classfile_debug_instruction_test.cjs',
    'ci/ClassFileDebugReaderRegression.java','ci/ClassFileManualFrameRegression.java','ci/classfile_debug_reader_test.cjs','ci/compile_classfile_metadata.cjs'])
    assert.ok(files.includes(path.join(root,relative)),relative);
});
test('numeric proof values are lossless through JSON and distinct from null and string carriers',()=>{
  const values=canonicalClassFileProof([NaN,Infinity,-Infinity,-0,0,'NaN',null]);
  assert.deepEqual(JSON.parse(JSON.stringify(values)),values);
  assert.deepEqual(values,[{numericValue:'NaN'},{numericValue:'Infinity'},{numericValue:'-Infinity'},{numericValue:'-0'},0,'NaN',null]);
});
test('strict CLI forbids selector, waiver, alternate-host and swallowed modes before execution',()=>{
  for(const flag of ['--browser','--native-only','--diagnostic'])assert.equal(gate.parseClassFileMode([flag]),flag.slice(2));
  for(const args of [[],['--node'],['--browser','--browser'],['--browser','ignored'],['--browser','--case','selected'],['--browser','--skip-native']]){
    assert.throws(()=>gate.parseClassFileMode(args));const result=spawnSync(process.execPath,[path.join(root,'ci/java_classfile_debug_test.mjs'),...args],{cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(result.status,1);assert.match(result.stderr,/Usage:/);assert.equal(result.stdout,'');
  }
});
test('fresh C7d3 ledger output is private and cannot overwrite cross-mode or other phase evidence',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-c7d3-ledger-'));
  try{
    const filename=path.join(directory,'ledger.json');gate.writeClassFileLedger(filename,gate.createClassFileLedger());
    assert.equal(fs.statSync(filename).mode&0o777,0o600);const bytes=fs.readFileSync(filename);
    assert.throws(()=>gate.writeClassFileLedger(filename,gate.createClassFileLedger('native-only')));
    assert.throws(()=>gate.writeClassFileLedger(filename,instructions.createClassFileLedger()));
    assert.deepEqual(fs.readFileSync(filename),bytes);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('dependency source units retain their original indexed owner and never claim full LIB007',()=>{
  const index=JSON.parse(fs.readFileSync(path.join(root,'ci/plan_spec_source_index.json'))),originals=new Map(index.units.map(unit=>[unit.id,unit]));
  for(const group of gate.classFileGroups)for(const item of gate.classFileSourceUnits(group,index)){
    assert.equal(item.apiOwnerPackageId,'LIB-007');assert.equal(item.fullApiConformanceProven,false);
    for(const unit of item.sourceUnits){assert.equal(unit.ownerPackageId,originals.get(unit.id).ownerPackageId);
      assert.equal(unit.url,originals.get(unit.id).url);assert.equal(unit.fullUnitConformanceProven,false);}
  }
});
test('artifact transport rejects omitted, duplicate, cross-case and noncanonical actual byte arrays',()=>{
  for(const {group,record,result}of positives.values()){
    const lines=result.stdout.trimEnd().split('\n'),artifact=lines.find(line=>line.startsWith('CF_ARTIFACT|'));assert.ok(artifact);
    const fields=artifact.split('|');assert.equal(fields.length,4);
    for(const stdout of [lines.filter(line=>line!==artifact).join('\n')+'\n',artifact+'\n'+result.stdout,
      result.stdout.replace(artifact,[fields[0],'not-original',fields[2],fields[3]].join('|')),
      result.stdout.replace(artifact,[...fields.slice(0,3),fields[3]+'='].join('|'))])
      assert.throws(()=>gate.assertClassFileResult({...result,stdout},group,'native',record));
  }
});
test('passed official debug receipt, when present, replays every original route and all 63 host outputs through JSON',()=>{
  const filename=path.join(root,'build/java-classfile-debug-results.json');if(!fs.existsSync(filename))return;
  const ledger=JSON.parse(fs.readFileSync(filename));if(ledger.status!=='passed')return;
  gate.assertClassFileLedger(ledger,{phase:'terminal'});assert.equal(ledger.officialGate,true);
  let outcomes=0,artifacts=0,routes=0;
  for(const record of ledger.results){
    const group=gate.classFileGroups.find(item=>item.id===record.group);assertClassFileInputProofs(record,group);
    routes+=record.inputProofs.returnedArrayRoutes.length;
    for(const execution of record.executions){assert.equal(execution.status,'passed');outcomes+=execution.outcomes.length;
      for(const artifact of execution.artifacts){const expected=classFileArtifactContracts[artifact.caseId].find(item=>item.id===artifact.artifactId);
        assert.deepEqual(proveClassFileArtifact(Buffer.from(artifact.bytesBase64,'base64'),expected,
          {host:execution.host,caseId:artifact.caseId,record}),artifact);artifacts++;}}
  }
  assert.equal(outcomes,72);assert.equal(artifacts,63);assert.equal(routes,21);
});
