import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {before,after,test} from 'node:test';
import {fileURLToPath} from 'node:url';
import * as gate from './java_classfile_structural_test.mjs';
import * as older from './java_classfile_declarations_test.mjs';
import {classFileInputContracts,classFileArtifactContracts,proveClassFileInputGroup,
  assertClassFileInputProofs,inspectClassFileArtifactBytes,proveClassFileArtifact} from './java_classfile_structural_bytecode.mjs';
import {inspectClassFiles,runCommand,validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),clone=structuredClone,
  sha=value=>crypto.createHash('sha256').update(value).digest('hex'),positives=new Map();
let temporary,sourceHashes;
before(async()=>{
  const lockBytes=fs.readFileSync(path.join(root,'ci/java_compatibility_toolchains.lock.json')),lock=JSON.parse(lockBytes),
    marker=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json')));
  validateToolchains(marker,lock,sha(lockBytes),[21,25]);const prepared=marker.toolchains.find(value=>value.feature===25);
  assert.equal(treeDigest(prepared.home),lock.toolchains.find(value=>value.feature===25).treeSha256);
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-c7d5-contract-'));fs.chmodSync(temporary,0o700);
  const empty=path.join(temporary,'empty-sourcepath');fs.mkdirSync(empty);
  sourceHashes=[...new Set(gate.classFileGroups.flatMap(group=>[group.source,...group.additionalSources]))]
    .map(relative=>[path.join(root,relative),sha(fs.readFileSync(path.join(root,relative)))]);
  for(const group of gate.classFileGroups){
    const directory=path.join(temporary,'release25',group.id,'classes');fs.mkdirSync(directory,{recursive:true});
    const sources=[group.source,...group.additionalSources].map(relative=>path.join(root,relative));
    const args=['--release','25','-encoding','UTF-8','-proc:none','-g','-parameters','-sourcepath',empty,'-classpath',empty,'-d',directory,...sources];
    const compiled=await runCommand(path.join(prepared.home,'bin/javac'),args,{cwd:path.dirname(directory),timeoutMs:gate.classFileTimeouts.compileMs});
    assert.equal(compiled.status,'passed',compiled.stderr);assert.equal(compiled.stdout,'');assert.equal(compiled.stderr,'');
    const classFiles=inspectClassFiles(directory,25,group.mainClass),record={release:25,group:group.id,classFiles,cases:group.cases,
      inputProofs:proveClassFileInputGroup(group,directory,classFiles)};
    const digest=treeDigest(directory);record.classpath={directory,treeSha256:digest,genuineCompilerBytes:true,byteTransformations:false,fallbackClassFiles:false};
    record.operations=[{kind:'genuine-driver',command:path.join(prepared.home,'bin/javac'),arguments:args,
      sourceDigests:sources.map(filename=>({path:filename,sha256:sha(fs.readFileSync(filename))})),result:compiled,
      outputEvidence:{directory,treeSha256:digest,files:classFiles.map(({path,size,sha256})=>({path,size,sha256}))}}];
    gate.assertClassFileCompilation(record,group,prepared);assertClassFileInputProofs(record,group);
    const result=await runCommand(path.join(prepared.home,'bin/java'),['-Xverify:all','-cp',directory,group.mainClass],
      {cwd:path.dirname(directory),timeoutMs:gate.classFileTimeouts.nativeMs});
    const proved=gate.assertClassFileResult(result,group,'native',record);positives.set(group.id,{group,record,result,proved,prepared,directory});
  }
});
after(()=>{
  try{if(sourceHashes)for(const[filename,digest]of sourceHashes)assert.equal(sha(fs.readFileSync(filename)),digest,'Original sources unchanged');}
  finally{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});}
});
test('three independent original groups retain24 cases and nine mandatory native25 Node Chromium cells',()=>{
  assert.equal(gate.validateClassFileGroups(),24);assert.deepEqual(gate.classFileGroups.map(value=>value.id),
    ['classfile-structural-legacy','classfile-structural-special','classfile-structural-debug']);
  assert.deepEqual(gate.classFileGroups.map(value=>value.driverClassNames.length),[5,6,2]);
  assert.deepEqual(gate.classFileHosts,['native','node','chromium']);assert.deepEqual(gate.classFileReleases,[25]);
  assert.deepEqual(gate.classFileTimeouts,{compileMs:60000,nativeMs:30000,guestMs:60000});
  assert.deepEqual(gate.classFileApplicability.map(value=>[value.release,value.applicable]),[[21,false],[25,true]]);
});
test('all18 broader completion flags remain false and other C7 ledgers cannot substitute',()=>{
  assert.deepEqual(gate.classFileCompletionFlags,older.classFileCompletionFlags);assert.equal(gate.classFileCompletionFlags.length,18);
  for(const flag of gate.classFileCompletionFlags)for(const value of [true,null,undefined,0,'false']){
    const ledger=gate.createClassFileLedger();ledger[flag]=value;assert.throws(()=>gate.assertClassFileLedger(ledger,{phase:'initial'}));
  }
  assert.throws(()=>gate.assertClassFileLedger(older.createClassFileLedger()));
  assert.throws(()=>older.assertClassFileLedger(gate.createClassFileLedger()));
});
test('immutable inventory rejects missing cases hosts editions filtering adapters and forged dispositions',()=>{
  for(const mutate of [groups=>groups.pop(),groups=>groups.reverse(),groups=>groups[0].cases.pop(),
    groups=>groups[0].cases[1].id=groups[0].cases[0].id,groups=>groups[1].driverClassNames.pop(),
    groups=>groups[0].releases.push(21),groups=>groups[1].javacFlags.pop(),groups=>groups[2].generatedSources=[],
    groups=>groups[0].cases[2].artifacts[0].definition='never-define',groups=>groups[2].cases[1].artifacts[0].verification='empty-byte-model']){
    const groups=clone(gate.classFileGroups);mutate(groups);assert.throws(()=>gate.validateClassFileGroups(groups));
  }
  for(const mutate of [ledger=>ledger.requiredHosts.pop(),ledger=>ledger.requiredReleases.push(21),ledger=>ledger.applicability[0].applicable=true,
    ledger=>ledger.results[0].executions[0].status='skipped',ledger=>ledger.results.pop(),ledger=>ledger.results[0].executions.reverse(),
    ledger=>ledger.status='passed',ledger=>ledger.caseCount--,ledger=>ledger.phaseId='C7d4']){
    const ledger=gate.createClassFileLedger();mutate(ledger);assert.throws(()=>gate.assertClassFileLedger(ledger,{phase:'initial'}));
  }
  for(const options of [[],['--diagnostic','--case','selected'],['--browser','--skip-native'],['--node'],['--browser','--browser']])
    assert.throws(()=>gate.parseClassFileMode(options));
});
test('37 actual output arrays retain13 eligible and24 explicitly never-defined byte/model inputs',()=>{
  const contracts=Object.values(classFileArtifactContracts).flat();assert.equal(contracts.length,37);
  assert.equal(contracts.filter(value=>value.definition==='define-and-invoke').length,13);
  assert.equal(contracts.filter(value=>value.definition==='never-define').length,24);
  assert.equal(contracts.reduce((n,value)=>n+value.profile.methods.length,0),46);
  assert.deepEqual(gate.classFileGroups.map(group=>group.cases.flatMap(value=>classFileArtifactContracts[value.id]).length),[8,8,21]);
  assert.deepEqual(Object.values(classFileInputContracts).map(value=>[value.callbacks.length,value.helperMethods.length]),[[28,5],[24,3],[16,0]]);
});
test('all original compiler rows helpers own definition routes and host-produced arrays independently replay',()=>{
  let rows=0,arrays=0,routes=0,cases=0;const unique=new Set();
  for(const{group,record,result,proved}of positives.values()){
    assertClassFileInputProofs(record,group);assertClassFileInputProofs(JSON.parse(JSON.stringify(record)),group);
    rows+=record.classFiles.length;record.classFiles.forEach(value=>unique.add(value.path));
    routes+=record.inputProofs.returnedArrayRoutes.length;cases+=proved.outcomes.length;arrays+=proved.artifacts.length;
    for(const artifact of proved.artifacts){const contract=classFileArtifactContracts[artifact.caseId].find(value=>value.id===artifact.artifactId);
      assert.deepEqual(proveClassFileArtifact(Buffer.from(artifact.bytesBase64,'base64'),contract,{host:'native',caseId:artifact.caseId,record}),artifact);}
    assert.equal(gate.assertClassFileResult(result,group,'native',record).artifacts.length,proved.artifacts.length);
  }
  assert.deepEqual([rows,unique.size,cases,arrays,routes],[13,11,24,37,37]);
});
test('exact stock25 compilation rejects changed source flags fallback headers and additional attempts',()=>{
  for(const{group,record,prepared}of positives.values())for(const mutate of [value=>value.operations[0].arguments.splice(6,1),
    value=>value.operations[0].sourceDigests[0].sha256='0'.repeat(64),value=>value.classpath.fallbackClassFiles=true,
    value=>value.classpath.byteTransformations=true,value=>value.classFiles[0].major=53,value=>value.classFiles.pop(),
    value=>value.operations.push(clone(value.operations[0])),value=>value.operations[0].result.stderr='ignored']){
    const changed=clone(record);mutate(changed);assert.throws(()=>gate.assertClassFileCompilation(changed,group,prepared));
  }
});
test('original helpers local bindings bootstrap inputs and actual invocation receivers cannot be forged',()=>{
  for(const{group,record}of positives.values())for(const mutate of [value=>value.inputProofs.callbackProofs.pop(),
    value=>value.inputProofs.caseProofs.pop(),value=>value.inputProofs.returnedArrayRoutes[0].arrayLocal++,
    value=>value.inputProofs.invocationHelper.heldMethodRoutes[0].handleLocal++,
    value=>value.inputProofs.classes[0].originalBytesBase64='',value=>value.inputProofs.returnedArrayRoutes[0].definitionDisposition='made-up']){
    const changed=clone(record);mutate(changed);assert.throws(()=>assertClassFileInputProofs(changed,group));
  }
  const special=positives.get('classfile-structural-special').record.inputProofs.invocationHelper.heldMethodRoutes;
  assert.deepEqual(special.map(value=>[value.handleLocal,value.invocations.map(call=>call.pc)]),[[3,[40]],[4,[49]]]);
  assert.equal(special[1].adaptations[0].cp.name,'asType');
});
test('CASE-only missing duplicate cross-case and noncanonical artifact transports fail closed',()=>{
  for(const{group,record,result}of positives.values()){
    const line=result.stdout.split('\n').find(value=>value.startsWith('CF_ARTIFACT|')),fields=line.split('|');
    const onlyCases=result.stdout.split('\n').filter(value=>!value.startsWith('CF_ARTIFACT|')).join('\n');
    for(const stdout of [onlyCases,line+'\n'+result.stdout,result.stdout.replace(line,fields.slice(0,3).join('|')+'|'+fields[3]+'='),
      result.stdout.replace(line,[fields[0],'other-case',fields[2],fields[3]].join('|')),result.stdout.replace(group.completionMarker,'missing')])
      assert.throws(()=>gate.assertClassFileResult({...result,stdout},group,'native',record));
    for(const change of [{stderr:'ignored'}, {exitCode:1}, {timedOut:true}, {signal:'SIGTERM'}, {outputLimitExceeded:true}])
      assert.throws(()=>gate.assertClassFileResult({...result,...change},group,'native',record));
  }
});
test('consistently rehashed original helper and forbidden-case byte mutations hit frozen Code guards',()=>{
  const {group,record}=positives.get('classfile-structural-special');
  const mainPath=group.mainClass.replaceAll('.','/')+'.class';
  for(const mutation of ['class-argument','actual-handle-receiver','forbidden-verdict-call']){
    const changed=clone(record),file=changed.classFiles.find(value=>value.path===mainPath),
      held=changed.inputProofs.classes.find(value=>value.className===group.mainClass),
      bytes=Buffer.from(held.originalBytesBase64,'base64'),layout=readStructureLayout(bytes);
    if(mutation==='forbidden-verdict-call') {
      const method=layout.methods.entries.find(value=>value.name==='caseIndirect'),
        original=held.methods.find(value=>value.name==='caseIndirect'),
        call=original.instructions.find(value=>value.cp?.owner===group.mainClass&&value.cp.name==='invalid');assert.ok(call);
      const valid=layout.pool.find(value=>value?.tag===10&&layout.pool[value.second]?.tag===12&&
        layout.pool[layout.pool[value.second].first]?.value==='valid');assert.ok(valid);
      bytes.writeUInt16BE(valid.index,method.code.instructionsOffset+call.pc+1);
    } else {
      const code=layout.methods.entries.find(value=>value.name==='invoke').code.instructionsOffset;
      if(mutation==='class-argument'){assert.equal(bytes[code+1],0x2b);bytes[code+1]=0x2a;}
      else {assert.equal(bytes[code+45],0x19);assert.equal(bytes[code+46],4);bytes[code+46]=3;}
    }
    file.sha256=sha(bytes);held.classFile.sha256=file.sha256;held.originalBytesBase64=bytes.toString('base64');
    assert.deepEqual(changed.inputProofs.classes.map(value=>value.classFile),changed.classFiles,
      'Rehashed row metadata is internally consistent before the semantic rejection');
    assert.throws(()=>assertClassFileInputProofs(changed,group),mutation==='forbidden-verdict-call'?
      /Fixed original case Code and exact helper\/array argument bindings/:
      /Exact selected original helper Code\/operands and local binding/);
  }
});
test('complete selected versions Code flags symbolic operands and raw coordinates cannot be altered',()=>{
  for(const{record,proved}of positives.values())for(const artifact of proved.artifacts){
    const contract=classFileArtifactContracts[artifact.caseId].find(value=>value.id===artifact.artifactId),bytes=Buffer.from(artifact.bytesBase64,'base64');
    assert.throws(()=>inspectClassFileArtifactBytes(bytes.subarray(0,bytes.length-1),contract));
    assert.throws(()=>inspectClassFileArtifactBytes(Buffer.concat([bytes,Buffer.from([0])]),contract));
    const flags=Buffer.from(bytes),layout=readStructureLayout(flags);flags[layout.flagsOffset+1]^=1;
    assert.throws(()=>inspectClassFileArtifactBytes(flags,contract));
    const code=Buffer.from(bytes);code[layout.methods.entries[0].code.instructionsOffset]=255;
    assert.throws(()=>inspectClassFileArtifactBytes(code,contract));
    const version=Buffer.from(bytes);version[7]^=1;assert.throws(()=>inspectClassFileArtifactBytes(version,contract));
    assert.throws(()=>proveClassFileArtifact(bytes,contract,{host:'native',caseId:'not-original',record}));
  }
});
test('malformed debug vectors stay raw and native permissiveness never authorizes definition',()=>{
  const debug=positives.get('classfile-structural-debug');
  const artifact=id=>debug.proved.artifacts.find(value=>value.artifactId===id);
  const first=(id,attribute)=>artifact(id).profile.methods[0].debug.find(value=>value.name===attribute).entries[0];
  assert.equal(first('struct-debug-lvt-start-operand','LocalVariableTable').start,2);
  assert.equal(first('struct-debug-lvt-start-terminal','LocalVariableTable').start,6);
  assert.equal(first('struct-debug-lvt-reversed','LocalVariableTable').length,65532);
  assert.equal(first('struct-debug-slot65535','LocalVariableTable').slot,65535);
  assert.equal(first('struct-debug-type-text','LocalVariableTypeTable').type,'!');
  for(const id of ['struct-debug-slot65535','struct-debug-wide-last-slot','struct-debug-type-text','struct-debug-lvtt-operand']){
    assert.equal(artifact(id).verification,'empty-byte-model');assert.equal(artifact(id).definitionDisposition,'never-define');
    assert.equal(artifact(id).sourceRoute.definition,null);
  }
  const changed=Buffer.from(artifact('struct-debug-lvt-start-operand').bytesBase64,'base64'),layout=readStructureLayout(changed);
  const lvt=layout.methods.entries[0].code.attributes.entries.find(value=>value.name==='LocalVariableTable');changed.writeUInt16BE(0,lvt.body+2);
  assert.throws(()=>inspectClassFileArtifactBytes(changed,classFileArtifactContracts['cf-struct-debug-lvt-start'][0]));
  assert.equal(debug.record.inputProofs.mutationHelper.byteStores,2);
});
test('legacy pairs and genuine33k relocation retain widths counters target deltas and honest verification',()=>{
  const values=positives.get('classfile-structural-legacy').proved.artifacts;
  const source=values.find(value=>value.artifactId==='legacy-relocation-source').profile.methods[0],
    moved=values.find(value=>value.artifactId==='legacy-relocation-output').profile.methods[0];
  assert.equal(moved.codeLength-source.codeLength,33002);
  assert.equal(moved.operations.find(value=>value.opcode==='jsr_w').branchTarget-source.operations.find(value=>value.opcode==='jsr').branchTarget,33002);
  assert.equal(moved.operations.find(value=>value.opcode==='nop').count,33000);
  for(const value of values){const method=value.profile.methods[0];assert.equal(method.maxStack,2);assert.deepEqual(method.debug,[]);
    assert.equal(value.profile.major,value.artifactId==='legacy-major50-metadata'?50:value.artifactId==='legacy-major51-invalid'?51:49);}
  const wide=values.find(value=>value.artifactId==='legacy-jsr-retw').profile.methods[0];assert.equal(wide.maxLocals,301);
  assert.ok(wide.operations.some(value=>value.opcode==='wide'&&value.modifiedOpcode==='ret'&&value.localIndex===300));
});
test('nonconstructor special outputs retain real CP10/11 owners receiver locals and major51 boundary',()=>{
  const values=positives.get('classfile-structural-special').proved.artifacts;
  for(const value of values){const run=value.profile.methods.find(method=>method.name==='run'),invoke=run.operations.find(operation=>operation.opcode==='invokespecial');
    assert.ok(invoke);assert.equal(invoke.constant.tag,/direct|indirect|major51/.test(value.artifactId)?11:10);}
  assert.equal(values.find(value=>value.artifactId==='special-major51').profile.major,51);
  assert.equal(values.filter(value=>value.definitionDisposition==='define-and-invoke').length,4);
});
test('new source closure binds all focused diagnostics and no private native oracle is a runtime input',()=>{
  const files=gate.classFileInputPaths();for(const name of ['ci/classfile_public_abi_test.cjs','ci/classfile_legacy_test.cjs',
    'ci/classfile_special_invoke_test.cjs','ci/classfile_structural_debug_test.cjs','ci/java_classfile_structural_contract_test.mjs'])
    assert.ok(files.includes(path.join(root,name)));
  assert.ok(!files.some(value=>value.includes('/.codex/')));
  const index=JSON.parse(fs.readFileSync(path.join(root,'ci/plan_spec_source_index.json')));
  for(const group of gate.classFileGroups)for(const entry of gate.classFileSourceUnits(group,index)){
    assert.equal(entry.apiOwnerPackageId,'LIB-007');assert.equal(entry.fullApiConformanceProven,false);
    for(const unit of entry.sourceUnits)assert.equal(unit.fullUnitConformanceProven,false);
  }
});
test('persisted official structural ledger replays72 host outcomes and111 independent arrays when available',()=>{
  const filename=path.join(root,'build/java-classfile-structural-results.json');if(!fs.existsSync(filename))return;
  const ledger=JSON.parse(fs.readFileSync(filename));if(ledger.status!=='passed')return;
  gate.assertClassFileLedger(ledger,{phase:'terminal'});assert.equal(ledger.officialGate,true);
  const cells=ledger.results.flatMap(value=>value.executions);assert.equal(cells.length,9);
  assert.equal(cells.reduce((n,value)=>n+value.outcomes.length,0),72);
  assert.equal(cells.reduce((n,value)=>n+value.artifacts.length,0),111);
});
