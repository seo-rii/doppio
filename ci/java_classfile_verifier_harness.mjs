import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runCommand,inspectClassFiles,runtimeSnapshot,validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertCoreCompilerSources,checkCoreCompilation,CoreIntegrityError} from './java_core_semantics_test.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';
import {verifierPhaseScope,verifierInputContract,verifierPhaseCases,verifierPhaseSummary,verifierCompletionFlags} from './classfile_verifier_phase_cases.mjs';
import {proveVerifierInputs,assertVerifierInputProofs,proveVerifierArtifact,classifyVerifierMessage} from './java_classfile_verifier_bytecode.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const entrypoint=path.join(root,'ci/java_classfile_verifier_test.mjs');
const sources=()=>[verifierInputContract.source,...verifierInputContract.additionalSources].map(file=>path.join(root,file));
export const verifierHosts=Object.freeze(['native','node','chromium']);
export const verifierTimeouts=Object.freeze({compileMs:60000,nativeMs:30000,guestMs:60000});
export const verifierApplicability=Object.freeze([
  Object.freeze({release:21,applicable:false,reason:'No final java.lang.classfile API; unchanged original requires final Java 25 API.'}),
  Object.freeze({release:25,applicable:true,reason:'Pinned stock Java 25 source/compiler and public verifier phase contract.'})
]);
const integrity=check=>{try{check();}catch(error){throw new CoreIntegrityError(error.message,{cause:error});}};

export function validateVerifierCases(candidate=verifierPhaseCases){
  assert.ok(verifierPhaseSummary.cases>0,'Final native source/control catalogue is not frozen yet');
  assert.equal(candidate.length,verifierPhaseSummary.cases);assert.deepEqual(candidate,verifierPhaseCases);
  const ids=new Set();let artifacts=0;
  for(const entry of candidate){
    assert.match(entry.id,/^phase-[A-Za-z0-9-]+$/);assert.ok(!ids.has(entry.id));ids.add(entry.id);
    assert.ok(Array.isArray(entry.categories));assert.ok(entry.categories.every(value=>typeof value==='string'&&value.length>0));
    assert.ok(Number.isInteger(entry.messageCount)&&entry.messageCount>=0);assert.equal(entry.messageCount,entry.messageCategories.length);
    assert.ok(typeof entry.profileLine==='string'&&entry.profileLine.length>0);assert.ok(Array.isArray(entry.outputOrder));
    assert.ok(typeof entry.event==='string'&&!/[\r\n|]/.test(entry.event));assert.ok(Array.isArray(entry.artifacts));
    for(const contract of entry.artifacts){assert.equal(contract.definition,'never-define');assert.ok(contract.profile);artifacts++;}
  }
  assert.equal(artifacts,verifierPhaseSummary.artifacts);assert.equal(verifierInputContract.driverClassNames.length,verifierPhaseSummary.compilerRows);
  assert.ok(typeof verifierInputContract.completionMarker==='string'&&verifierInputContract.completionMarker.length>0);
  return candidate.length;
}

export function parseVerifierMode(options){assert.deepEqual(options,['--browser'],'Usage: node ci/java_classfile_verifier_test.mjs --browser');return 'browser';}
export function createVerifierLedger(){
  const ledger={schemaVersion:1,phaseId:'C7e1',scope:verifierPhaseScope,requestedMode:'browser',officialGate:true,status:'running',
    startedAt:new Date().toISOString(),requiredReleases:[25],requiredHosts:[...verifierHosts],applicability:structuredClone(verifierApplicability),
    caseCount:validateVerifierCases(),artifactCount:verifierPhaseSummary.artifacts,
    ...Object.fromEntries(verifierCompletionFlags.map(flag=>[flag,false])),
    results:[{release:25,group:'classfile-verifier-phase',status:'not-run',cases:structuredClone(verifierPhaseCases),operations:[],
      executions:verifierHosts.map(host=>({host,status:'not-run',reason:'Awaiting unchanged genuine original69 compiler output'}))}]};
  assertVerifierLedger(ledger,{phase:'initial'});return ledger;
}

export function captureVerifierOutput(directory){
  const files=[],walk=current=>{const stat=fs.lstatSync(current);assert.ok(!stat.isSymbolicLink());
    if(stat.isDirectory())for(const name of fs.readdirSync(current))walk(path.join(current,name));
    else{assert.ok(stat.isFile()&&stat.nlink===1);files.push({path:path.relative(directory,current).split(path.sep).join('/'),size:stat.size,sha256:sha(fs.readFileSync(current))});}};
  walk(directory);return {directory,treeSha256:treeDigest(directory),files:files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)};
}

export function verifierInputPaths(){
  const visited=new Set(),pending=[entrypoint,path.join(root,'ci/java_classfile_verifier_contract_test.mjs')];
  while(pending.length){const file=path.resolve(pending.pop());if(visited.has(file))continue;
    assert.ok(file.startsWith(root+path.sep));visited.add(file);
    for(const match of fs.readFileSync(file,'utf8').matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)){
      const dependency=path.resolve(path.dirname(file),match[1]);if(/\.(?:mjs|cjs|js)$/.test(dependency))pending.push(dependency);
    }
  }
  const library=[],pendingDirectories=[path.join(root,'classes/modern_classlib')];
  while(pendingDirectories.length){const directory=pendingDirectories.pop();for(const name of fs.readdirSync(directory)){
    const file=path.join(directory,name),stat=fs.lstatSync(file);assert.ok(!stat.isSymbolicLink());
    if(stat.isDirectory()&&name!=='out')pendingDirectories.push(file);else if(stat.isFile()&&name.endsWith('.java'))library.push(file);
  }}
  return [...new Set([...visited,...library,...sources(),...['ci/classfile_verifier_phase_test.cjs','ci/compile_classfile_metadata.cjs',
    'ci/plan_spec_source_index.json','ci/java_compatibility_toolchains.lock.json','build/java-compatibility-toolchains/toolchains.json',
    'package.json','yarn.lock','.github/workflows/modern-java.yml'].map(file=>path.join(root,file)),process.execPath])].sort();
}
const inputDigests=()=>verifierInputPaths().map(file=>({path:file,size:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))}));

export function assertVerifierCompilation(record,prepared){
  assert.equal(record.release,25);assert.equal(record.operations.length,1);const operation=record.operations[0],output=record.classpath?.directory;
  assert.equal(operation.kind,'genuine-original');assert.ok(path.isAbsolute(output));assert.equal(operation.command,path.join(prepared.home,'bin/javac'));
  assert.deepEqual(operation.arguments,['--release','25','-encoding','UTF-8','-proc:none','-g','-parameters','-sourcepath',record.emptySourcepath,
    '-classpath',record.emptySourcepath,'-d',output,...sources()]);
  assert.deepEqual(operation.sourceDigests,sources().map(file=>({path:file,sha256:sha(fs.readFileSync(file))})));
  assert.deepEqual(operation.sourceDigests.map(value=>({path:path.relative(root,value.path).split(path.sep).join('/'),sha256:value.sha256})),
    verifierInputContract.sourceDigests,'Independent final unchanged original source digests');
  const result=operation.result;assert.deepEqual(result.command,[operation.command,...operation.arguments]);
  assert.equal(result.cwd,path.dirname(output));assert.equal(result.timeoutMs,verifierTimeouts.compileMs);
  assert.equal(result.status,'passed');assert.equal(result.exitCode,0);assert.equal(result.stdout,'');assert.equal(result.stderr,'');
  for(const key of ['error','signal','timedOut','outputLimitExceeded'])assert.ok(!result[key]);
  assert.deepEqual(record.classFiles.map(file=>file.path),verifierInputContract.driverClassNames.map(name=>name.replaceAll('.','/')+'.class').sort());
  for(const file of record.classFiles){assert.equal(file.major,69);assert.equal(file.minor,0);assert.match(file.sha256,/^[a-f0-9]{64}$/);assert.ok(file.size>8);}
  assert.equal(record.classpath.genuineCompilerBytes,true);assert.equal(record.classpath.byteTransformations,false);assert.equal(record.classpath.fallbackClassFiles,false);
  assert.equal(operation.outputEvidence.directory,output);assert.equal(operation.outputEvidence.treeSha256,record.classpath.treeSha256);
  assert.deepEqual(operation.outputEvidence.files,record.classFiles.map(({path,size,sha256})=>({path,size,sha256})));
  assertVerifierInputProofs(record.inputProofs,record.classFiles);
}

export function assertVerifierResult(result,host,record){
  assert.ok(verifierHosts.includes(host));assert.equal(result.status,'passed');assert.equal(result.exitCode,0);
  for(const key of ['error','signal','timedOut','outputLimitExceeded'])assert.ok(!result[key]);
  assert.equal(result.stderr.replaceAll('\r\n','\n'),'');assert.ok(Buffer.byteLength(result.stdout)<=4*1024*1024);
  const lines=result.stdout.replaceAll('\r\n','\n').split('\n');let at=0;const outcomes=[],artifacts=[];
  for(const entry of verifierPhaseCases){
    const messages=[];
    const packet=contract=>{
      const prefix='CF_ARTIFACT|'+entry.id+'|'+contract.id+'|',line=lines[at++];assert.ok(line?.startsWith(prefix));
      const encoded=line.slice(prefix.length);assert.ok(encoded.length>0&&encoded.length<=350000&&/^[A-Za-z0-9+/]+={0,2}$/.test(encoded));
      const bytes=Buffer.from(encoded,'base64');assert.equal(bytes.toString('base64'),encoded);
      artifacts.push(proveVerifierArtifact(bytes,contract,{host,caseId:entry.id,inputProofs:record.inputProofs,classFiles:record.classFiles}));
    };
    let packets=0,messageIndex=0,profiles=0,cases=0;
    for(const operation of entry.outputOrder){
      if(operation==='artifact'){assert.ok(packets<entry.artifacts.length);packet(entry.artifacts[packets++]);}
      else if(operation==='profile'){assert.equal(lines[at++],entry.profileLine,'Exact actual major, byte/model count and ordered categories');profiles++;}
      else if(operation==='message'){assert.ok(messageIndex<entry.messageCategories.length);const prefix='VERIFY_MESSAGE|'+entry.id+'|',line=lines[at++];assert.ok(line?.startsWith(prefix));
        const message=line.slice(prefix.length);assert.equal(classifyVerifierMessage(message,entry),entry.messageCategories[messageIndex++]);messages.push(message);}
      else if(operation==='case'){assert.equal(lines[at++],'CASE|'+entry.id+'|'+entry.event);cases++;}
      else assert.fail('Unreviewed phase output operation '+operation);
    }
    assert.equal(packets,entry.artifacts.length);assert.equal(messageIndex,entry.messageCount);assert.equal(profiles,1);assert.equal(cases,1);
    outcomes.push({id:entry.id,profile:entry.profileLine,categories:entry.categories,rawMessages:messages,trace:[entry.event]});
  }
  assert.deepEqual(lines.slice(at),[verifierInputContract.completionMarker,''],'Exact completion and no ignored stdout suffix');
  assert.equal(artifacts.length,verifierPhaseSummary.artifacts);return {outcomes,artifacts};
}

export function assertVerifierExecution(cell,record,prepared){
  const runner=path.join(root,'build/release-cli/console/runner.js'),output=record.classpath.directory,result=cell.result;
  const command=cell.host==='chromium'?['chromium','Doppio.VM.CLI','-cp','/classes',verifierInputContract.mainClass]:
    cell.host==='native'?[path.join(prepared.home,'bin/java'),'-Xverify:all','-cp',output,verifierInputContract.mainClass]:
      [process.execPath,'--no-deprecation',runner,'-cp',output,verifierInputContract.mainClass];
  assert.deepEqual(result.command,command);assert.equal(result.cwd,cell.host==='chromium'?'/work':path.dirname(output));
  assert.equal(result.timeoutMs,cell.host==='native'?verifierTimeouts.nativeMs:verifierTimeouts.guestMs);
  if(cell.host==='chromium')assert.deepEqual(result.browserErrors,[]);
  return assertVerifierResult(result,cell.host,record);
}

export function assertVerifierLedger(ledger,{phase='inventory'}={}){
  assert.ok(['inventory','initial','terminal'].includes(phase));assert.equal(ledger.schemaVersion,1);assert.equal(ledger.phaseId,'C7e1');assert.equal(ledger.scope,verifierPhaseScope);
  assert.equal(ledger.requestedMode,'browser');assert.equal(ledger.officialGate,true);assert.deepEqual(ledger.requiredHosts,verifierHosts);assert.deepEqual(ledger.requiredReleases,[25]);
  assert.deepEqual(ledger.applicability,verifierApplicability);assert.equal(ledger.caseCount,validateVerifierCases());assert.equal(ledger.artifactCount,verifierPhaseSummary.artifacts);
  for(const flag of verifierCompletionFlags)assert.equal(ledger[flag],false);
  assert.equal(ledger.results.length,1);const record=ledger.results[0];assert.equal(record.release,25);assert.equal(record.group,'classfile-verifier-phase');
  assert.deepEqual(record.cases,verifierPhaseCases);assert.deepEqual(record.executions.map(cell=>cell.host),verifierHosts);
  if(phase==='initial'){assert.equal(ledger.status,'running');assert.equal(record.status,'not-run');assert.deepEqual(record.operations,[]);
    assert.ok(!record.classFiles&&!record.classpath&&!record.inputProofs);for(const cell of record.executions){assert.equal(cell.status,'not-run');assert.ok(!cell.result&&!cell.outcomes&&!cell.artifacts);}}
  if(phase==='terminal'){
    assert.ok(['passed','failed'].includes(ledger.status));assert.ok(['passed','failed'].includes(record.status));
    const marker=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json'))),prepared=marker.toolchains.find(value=>value.feature===25);
    if(record.executions.some(cell=>cell.status==='passed'))assertVerifierCompilation(record,prepared);
    for(const cell of record.executions){assert.ok(['passed','failed','not-run'].includes(cell.status));
      if(cell.status==='passed'){const proof=assertVerifierExecution(cell,record,prepared);assert.deepEqual(cell.outcomes,proof.outcomes);assert.deepEqual(cell.artifacts,proof.artifacts);}}
    if(ledger.status==='passed'){
      assert.equal(record.status,'passed');assert.ok(record.executions.every(cell=>cell.status==='passed'));
      assert.deepEqual(ledger.summary,{executionCells:3,passed:3,failed:0,notRun:0});
      assert.deepEqual(ledger.inputDigests,inputDigests());assert.deepEqual(ledger.inputIntegrity,{unchanged:true,verifiedAtEnd:true});
      assert.deepEqual(ledger.proofIntegrity,{unchanged:true,verifiedAtEnd:true});assert.deepEqual(ledger.gitEnd,ledger.gitStart);assertDerivationProvenance(ledger.gitStart,ledger.gitEnd);
      const lockBytes=fs.readFileSync(path.join(root,'ci/java_compatibility_toolchains.lock.json')),lock=JSON.parse(lockBytes);
      validateToolchains(marker,lock,sha(lockBytes),[21,25]);assert.deepEqual(ledger.toolchains,marker.toolchains.map(value=>({...value,treeSha256:lock.toolchains.find(item=>item.id===value.id).treeSha256})));
      assert.deepEqual(ledger.node,{version:process.version,executable:process.execPath});
      assert.ok(Array.isArray(ledger.runtime?.files)&&ledger.runtime.files.length>0);
      assert.equal(new Set(ledger.runtime.files.map(file=>file.path)).size,ledger.runtime.files.length);
      for(const file of ledger.runtime.files)assert.ok(typeof file.path==='string'&&file.path.length>0&&
        /^[a-f0-9]{64}$/.test(file.sha256)&&Number.isSafeInteger(file.size)&&file.size>0);
      assert.equal(ledger.runtime.snapshotSha256,sha(JSON.stringify(ledger.runtime.files)));assert.equal(ledger.runtime.entrypoint,path.join(root,'build/release-cli/console/runner.js'));
      assert.equal(ledger.runtime.entrypointSha256,ledger.runtime.files.find(file=>file.path==='console/runner.js')?.sha256);
      assert.equal(ledger.browserIntegrity?.status,'verified');
      for(const[key,name]of [['runtimeSha256','runtime'],['browserfsSha256','browserfs'],['bootstrapSha256','bootstrap'],['chromiumExecutableSha256','chromiumExecutable'],['adapterSha256','adapter']]){
        assert.match(ledger.browserIntegrity[key],/^[a-f0-9]{64}$/);assert.equal(ledger.browserIntegrity[key],ledger.browserProvenance?.[name]?.sha256);
        assert.ok(typeof ledger.browserProvenance[name].path==='string'&&path.isAbsolute(ledger.browserProvenance[name].path));}
      assert.equal(ledger.browserProvenance.node,process.version);assert.equal(typeof ledger.browserProvenance.chromium,'string');assert.equal(typeof ledger.browserProvenance.playwright,'string');
    }
  }
}

export function writeVerifierLedger(filename,ledger){
  assert.equal(ledger.scope,verifierPhaseScope);assert.equal(ledger.requestedMode,'browser');assert.equal(ledger.officialGate,true);
  fs.mkdirSync(path.dirname(filename),{recursive:true});assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink());
  if(fs.existsSync(filename)){const stat=fs.lstatSync(filename);assert.ok(stat.isFile()&&stat.nlink===1&&!stat.isSymbolicLink());
    const previous=JSON.parse(fs.readFileSync(filename));assert.equal(previous.scope,verifierPhaseScope);assert.equal(previous.officialGate,true);}
  const temporary=filename+'.'+process.pid+'.'+crypto.randomUUID()+'.tmp';
  try{fs.writeFileSync(temporary,JSON.stringify(ledger,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temporary,filename);}
  finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
async function gitProvenance(){
  const checked=async args=>{const result=await runCommand('git',args,{cwd:root,timeoutMs:10000});assert.equal(result.status,'passed');return result.stdout.trim();};
  return {commit:await checked(['rev-parse','--verify','HEAD']),trackedDirty:(await checked(['status','--porcelain=v1','--untracked-files=no'])).length>0};
}

export async function runVerifierGate(ledger,{checkpoint=()=>{}}={}){
  assertVerifierLedger(ledger,{phase:'initial'});const lockBytes=fs.readFileSync(path.join(root,'ci/java_compatibility_toolchains.lock.json')),lock=JSON.parse(lockBytes);
  const marker=JSON.parse(fs.readFileSync(path.join(root,'build/java-compatibility-toolchains/toolchains.json')));validateToolchains(marker,lock,sha(lockBytes),[21,25]);
  const prepared=marker.toolchains.find(value=>value.feature===25);ledger.inputDigests=inputDigests();ledger.node={version:process.version,executable:process.execPath};
  ledger.gitStart=await gitProvenance();assertDerivationProvenance(ledger.gitStart,ledger.gitStart);
  const checkJdks=()=>marker.toolchains.forEach(value=>assert.equal(treeDigest(value.home),lock.toolchains.find(item=>item.id===value.id).treeSha256));
  integrity(checkJdks);ledger.toolchains=marker.toolchains.map(value=>({...value,treeSha256:lock.toolchains.find(item=>item.id===value.id).treeSha256}));
  const runner=path.join(root,'build/release-cli/console/runner.js');ledger.runtime=runtimeSnapshot(root,runner);
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-public-verifier-phase-'));fs.chmodSync(temporary,0o700);let session;
  const record=ledger.results[0];
  const checkGlobal=()=>integrity(()=>{assert.deepEqual(inputDigests(),ledger.inputDigests);assert.deepEqual(runtimeSnapshot(root,runner),ledger.runtime);
    if(session)session.verifyIntegrity();for(const operation of record.operations)if(operation.outputEvidence){assertCoreCompilerSources(operation.sourceDigests);
      assert.deepEqual(captureVerifierOutput(operation.outputEvidence.directory),operation.outputEvidence);}});
  try{
    const {createBrowserSession}=await import('./java_compatibility_browser.mjs');session=await createBrowserSession({repoRoot:root});ledger.browserProvenance=session.provenance;
    const directory=path.join(temporary,'release25'),output=path.join(directory,'classes'),empty=path.join(temporary,'empty-sourcepath');fs.mkdirSync(output,{recursive:true});fs.mkdirSync(empty);
    record.emptySourcepath=empty;record.status='running';checkpoint();checkGlobal();
    const sourceDigests=sources().map(file=>({path:file,sha256:sha(fs.readFileSync(file))}));assertCoreCompilerSources(sourceDigests);
    const operation={kind:'genuine-original',command:path.join(prepared.home,'bin/javac'),arguments:['--release','25','-encoding','UTF-8','-proc:none','-g','-parameters',
      '-sourcepath',empty,'-classpath',empty,'-d',output,...sources()],sourceDigests};record.operations.push(operation);checkpoint();
    try{await checkCoreCompilation(operation,()=>runCommand(operation.command,operation.arguments,{cwd:directory,timeoutMs:verifierTimeouts.compileMs}),
      ()=>{checkGlobal();assertCoreCompilerSources(sourceDigests);},checkpoint);}finally{operation.outputEvidence=captureVerifierOutput(output);checkpoint();}
    record.classFiles=inspectClassFiles(output,25,verifierInputContract.mainClass);record.classpath={directory:output,treeSha256:treeDigest(output),genuineCompilerBytes:true,byteTransformations:false,fallbackClassFiles:false};
    record.inputProofs=proveVerifierInputs(output,record.classFiles);assertVerifierCompilation(record,prepared);
    const checkLocal=()=>integrity(()=>{assert.deepEqual(inspectClassFiles(output,25,verifierInputContract.mainClass),record.classFiles);assert.deepEqual(proveVerifierInputs(output,record.classFiles),record.inputProofs);});
    for(const cell of record.executions){checkGlobal();checkLocal();cell.status='running';checkpoint();
      try{
        cell.result=cell.host==='chromium'?await session.execute({classesPath:output,mainClass:verifierInputContract.mainClass,arguments:[],timeoutMs:verifierTimeouts.guestMs,standardInput:''}):
          await runCommand(cell.host==='native'?path.join(prepared.home,'bin/java'):process.execPath,
            [...(cell.host==='native'?['-Xverify:all']:['--no-deprecation',runner]),'-cp',output,verifierInputContract.mainClass],
            {cwd:directory,timeoutMs:cell.host==='native'?verifierTimeouts.nativeMs:verifierTimeouts.guestMs,standardInput:''});
        checkpoint();checkGlobal();checkLocal();const proof=assertVerifierExecution(cell,record,prepared);cell.outcomes=proof.outcomes;cell.artifacts=proof.artifacts;cell.status='passed';
      }catch(error){cell.status='failed';cell.error=error.stack||error.message;checkpoint();if(error instanceof CoreIntegrityError)throw error;}checkpoint();
    }
    record.status=record.executions.every(cell=>cell.status==='passed')?'passed':'failed';checkGlobal();integrity(checkJdks);ledger.gitEnd=await gitProvenance();assert.deepEqual(ledger.gitEnd,ledger.gitStart);
    ledger.browserIntegrity=session.verifyIntegrity();ledger.inputIntegrity={unchanged:true,verifiedAtEnd:true};ledger.proofIntegrity={unchanged:true,verifiedAtEnd:true};
    ledger.status=record.status;ledger.summary={executionCells:3,passed:record.executions.filter(cell=>cell.status==='passed').length,
      failed:record.executions.filter(cell=>cell.status==='failed').length,notRun:record.executions.filter(cell=>cell.status==='not-run').length};assertVerifierLedger(ledger,{phase:'terminal'});return ledger;
  }finally{try{if(session)await session.close();}finally{fs.rmSync(temporary,{recursive:true,force:true});}}
}

export async function executeVerifierCli(){
  if(!process.argv[1]||path.resolve(process.argv[1])!==entrypoint)return;
  parseVerifierMode(process.argv.slice(2));const ledger=createVerifierLedger(),filename=path.join(root,'build/java-classfile-verifier-results.json'),checkpoint=()=>writeVerifierLedger(filename,ledger);checkpoint();
  try{await runVerifierGate(ledger,{checkpoint});if(ledger.status!=='passed')process.exitCode=1;}
  catch(error){ledger.status='failed';ledger.error=error.stack||error.message;process.exitCode=1;console.error(ledger.error);
    for(const record of ledger.results){if(['running','not-run'].includes(record.status))record.status='failed';for(const cell of record.executions){
      if(cell.status==='running'){cell.status='failed';cell.error='Gate stopped: '+error.message;}else if(cell.status==='not-run')cell.reason='Gate stopped: '+error.message;}}}
  finally{ledger.finishedAt=new Date().toISOString();checkpoint();}
}
