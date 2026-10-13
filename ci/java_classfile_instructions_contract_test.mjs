import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as gate from './java_classfile_instructions_test.mjs';
import * as earlier from './java_classfile_api_test.mjs';
import * as flow from './java_classfile_controlflow_test.mjs';
import * as extended from './java_classfile_extended_test.mjs';
import {classFileInputContracts,classFileArtifactContracts,inspectClassFileArtifactBytes,assertClassFileInputProofs,proveClassFileArtifact,canonicalClassFileProof} from './java_classfile_instructions_bytecode.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {coreOpcodeNames} from './java_core_bytecode.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),clone=value=>structuredClone(value),sha=value=>crypto.createHash('sha256').update(value).digest('hex');

test('decoded non-finite and signed-zero proof values survive exact JSON replay without null substitution',()=>{
  const proof=canonicalClassFileProof({constants:[NaN,Infinity,-Infinity,-0,0,1.25,null,'NaN'],nested:{tag:4,value:NaN}});
  assert.deepEqual(proof,{constants:[{numericValue:'NaN'},{numericValue:'Infinity'},{numericValue:'-Infinity'},{numericValue:'-0'},0,1.25,null,'NaN'],nested:{tag:4,value:{numericValue:'NaN'}}});
  assert.deepEqual(JSON.parse(JSON.stringify(proof)),proof);
  assert.deepEqual(canonicalClassFileProof(proof),proof);
  assert.notDeepEqual(proof,JSON.parse(JSON.stringify({constants:[NaN,Infinity,-Infinity,-0,0,1.25,null,'NaN'],nested:{tag:4,value:NaN}})));
});

test('initial C7d2 fixes four literal eight-case original groups and twelve mandatory host cells',()=>{
  assert.equal(gate.validateClassFileGroups(),32);assert.deepEqual(gate.classFileGroups.map(x=>x.id),['classfile-instruction-arrays','classfile-instruction-arithmetic','classfile-instruction-members','classfile-instruction-frames']);
  assert.deepEqual(gate.classFileGroups.map(x=>x.cases.length),[8,8,8,8]);
  for(const mode of ['browser','native-only','diagnostic']){const ledger=gate.createClassFileLedger(mode);assert.equal(ledger.phaseId,'C7d2');assert.equal(ledger.caseCount,32);
    assert.equal(ledger.results.flatMap(x=>x.executions).length,12);assert.deepEqual(ledger.requiredReleases,[25]);assert.deepEqual(ledger.requiredHosts,['native','node','chromium']);
    assert.equal(ledger.officialGate,mode==='browser');gate.assertClassFileLedger(ledger,{phase:'initial'});}
  for(const group of gate.classFileGroups)for(const entry of group.cases)for(const key of ['trace','probes','callbackMethods','artifacts'])assert.ok(Object.isFrozen(entry[key]));
});
test('unchanged C7a32 C7b16 C7c24 gates cannot substitute for initial C7d2',()=>{
  assert.equal(earlier.validateClassFileGroups(),32);assert.equal(flow.validateClassFileGroups(),16);assert.equal(extended.validateClassFileGroups(),24);
  for(const other of [earlier,flow,extended]){assert.throws(()=>gate.assertClassFileLedger(other.createClassFileLedger()));
    assert.throws(()=>other.assertClassFileLedger(gate.createClassFileLedger()));assert.throws(()=>gate.createClassFileLedger('browser',other.classFileGroups));}
});
test('final API Java21 absence is non-applicability and no Java25 cell can be skipped or waived',()=>{
  assert.deepEqual(gate.classFileApplicability.map(x=>[x.release,x.applicable,x.finalApiSince]),[[21,false,24],[25,true,24]]);
  for(const mutate of [x=>x.applicability.pop(),x=>x.applicability[0].applicable=true,x=>x.requiredReleases.push(21),x=>x.results[0].release=21,x=>x.results[0].executions[0].status='skipped']){
    const changed=gate.createClassFileLedger();mutate(changed);assert.throws(()=>gate.assertClassFileLedger(changed));}
});
test('changed or pruned original case/callback/source/trace/output inventories cannot shrink exit',()=>{
  for(const mutate of [x=>x.pop(),x=>x.reverse(),x=>x[0].cases.pop(),x=>x[1].cases.reverse(),x=>x[0].source=x[1].source,x=>x[0].driverClassNames.pop(),
    x=>x[0].additionalSources=[],x=>x[0].javacFlags=['-g'],x=>x[0].releases=[21],x=>x[0].generatedSources=[],x=>x[0].cases[0].trace.push('invented'),
    x=>x[0].cases[0].callbackMethods=[],x=>x[0].cases[2].artifacts=[],x=>x[1].cases[0].artifacts[0].methods[0].opcodes=['ireturn'],x=>x[0].cases[0].probes[0].ignored=true]){
    const changed=clone(gate.classFileGroups);mutate(changed);assert.throws(()=>gate.createClassFileLedger('browser',changed));}
});
for(const flag of gate.classFileCompletionFlags)test('initial finite C7d2 never claims broad completion: '+flag,()=>{
  const ledger=gate.createClassFileLedger();assert.equal(ledger[flag],false);
  for(const value of [true,null,undefined,0,'false']){const changed=clone(ledger);changed[flag]=value;assert.throws(()=>gate.assertClassFileLedger(changed));}
  const changed=clone(ledger);delete changed[flag];assert.throws(()=>gate.assertClassFileLedger(changed));
});
test('host omissions, changed phase/order, stale success and partial raw proof cannot pass',()=>{
  for(const mutate of [x=>x.results.pop(),x=>x.results.reverse(),x=>x.results[0].executions.pop(),x=>x.results[0].executions.reverse(),x=>x.phaseId='C7c',x=>x.schemaVersion++,
    x=>x.caseCount--,x=>x.status='passed',x=>x.results[0].status='passed',x=>x.results[0].operations.push({}),x=>x.results[0].classFiles=[],x=>x.results[0].inputProofs={}]){
    const changed=gate.createClassFileLedger();mutate(changed);assert.throws(()=>gate.assertClassFileLedger(changed,{phase:'initial'}));}
  const changed=gate.createClassFileLedger();changed.status='passed';assert.throws(()=>gate.assertClassFileLedger(changed,{phase:'terminal'}));
});
test('dependency source units preserve indexed owners without manufacturing LIB007 full-source conformance',()=>{
  const index=JSON.parse(fs.readFileSync(path.join(root,'ci/plan_spec_source_index.json'))),originals=new Map(index.units.map(x=>[x.id,x]));
  assert.equal(index.units.filter(x=>x.ownerPackageId==='LIB-007').length,0);
  for(const group of gate.classFileGroups)for(const item of gate.classFileSourceUnits(group,index)){
    assert.equal(item.apiOwnerPackageId,'LIB-007');assert.equal(item.fullApiConformanceProven,false);
    for(const unit of item.sourceUnits){assert.equal(unit.ownerPackageId,originals.get(unit.id).ownerPackageId);assert.equal(unit.url,originals.get(unit.id).url);assert.equal(unit.fullUnitConformanceProven,false);}
  }
});
function compilation(){
  const group=gate.classFileGroups[0],prepared={feature:25,home:path.join(os.tmpdir(),'c7d2-jdk25')},output=path.join(os.tmpdir(),'c7d2-original-root','release25',group.id,'classes'),
    empty=path.resolve(output,'..','..','..','empty-sourcepath'),sources=[group.source,...group.additionalSources].map(x=>path.join(root,x)),
    files=group.driverClassNames.map(name=>({path:name.replaceAll('.','/')+'.class',size:123,sha256:'a'.repeat(64),major:69,minor:0})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),
    operation={kind:'genuine-driver',command:path.join(prepared.home,'bin/javac'),arguments:['--release','25','-encoding','UTF-8','-proc:none','-g:source','-sourcepath',empty,'-classpath',empty,'-d',output,...sources],
      sourceDigests:sources.map(filename=>({path:filename,sha256:sha(fs.readFileSync(filename))}))};
  operation.result={status:'passed',exitCode:0,error:null,signal:null,timedOut:false,outputLimitExceeded:false,stdout:'',stderr:'',command:[operation.command,...operation.arguments],cwd:path.dirname(output),timeoutMs:gate.classFileTimeouts.compileMs};
  operation.outputEvidence={directory:output,treeSha256:'b'.repeat(64),files:files.map(({path,size,sha256})=>({path,size,sha256}))};
  return {group,prepared,record:{release:25,classFiles:files,operations:[operation],classpath:{directory:output,treeSha256:'b'.repeat(64),genuineCompilerBytes:true,byteTransformations:false,fallbackClassFiles:false}}};
}
test('compiler contract binds exact stock Java25/no-adapter argv/source digests/original output tree',()=>{
  const fixture=compilation();gate.assertClassFileCompilation(fixture.record,fixture.group,fixture.prepared);
  for(const mutate of [x=>x.release=21,x=>x.operations.push(clone(x.operations[0])),x=>x.operations[0].kind='adapter',x=>x.operations[0].arguments[1]='21',
    x=>x.operations[0].arguments[6]='-g',x=>x.operations[0].sourceDigests[0].sha256='f'.repeat(64),x=>x.operations[0].result.command.pop(),x=>x.operations[0].result.stdout='ignored',
    x=>x.operations[0].result.stderr='ignored',x=>x.operations[0].result.timedOut=true,x=>x.classFiles.pop(),x=>x.classFiles[0].major=65,x=>x.classpath.byteTransformations=true,
    x=>x.classpath.genuineCompilerBytes=false,x=>x.classpath.fallbackClassFiles=true,x=>x.operations[0].outputEvidence.files.pop()]){
    const changed=clone(fixture.record);mutate(changed);assert.throws(()=>gate.assertClassFileCompilation(changed,fixture.group,fixture.prepared));}
});
test('CASE traces alone cannot replace any actual returned public API byte array',()=>{
  for(const group of gate.classFileGroups){const raw={status:'passed',exitCode:0,signal:null,timedOut:false,outputLimitExceeded:false,error:null,stderr:'',
    stdout:group.cases.map(e=>'CASE|'+e.id+'|'+e.trace[0]).join('\n')+'\n'+group.completionMarker+'\n'};
    assert.throws(()=>gate.assertClassFileResult(raw,group,'node',{}));assert.throws(()=>gate.assertClassFileResult(raw,group,'unknown',{}));
  }
});
test('thirty-two output contracts and ninety-seven original named methods are distinct from nine compiled class rows',()=>{
  assert.deepEqual(gate.classFileGroups.map(x=>x.driverClassNames.length),[2,2,3,2]);assert.deepEqual(gate.classFileGroups.map(x=>x.cases.reduce((n,e)=>n+e.artifacts.length,0)),[8,8,8,8]);
  const outputs=Object.values(classFileArtifactContracts).flat();assert.equal(outputs.length,32);assert.equal(outputs.filter(x=>x.definition==='forbidden').length,1);
  assert.equal(Object.values(classFileInputContracts).reduce((n,x)=>n+x.callbacks.length,0),97);
  assert.equal(Object.values(classFileInputContracts).reduce((n,x)=>n+x.callbacks.filter(c=>c.bootstrap).length,0),89);
});

// Reader-only synthetic inputs; these never become compiler fixtures, API
// implementation bytes, native oracle output or passing host evidence.
function syntheticArtifact(contract,{genericLocals=false,compressed=false}={}){
  const pool=[],cache=new Map(),u2=value=>{const b=Buffer.alloc(2);b.writeUInt16BE(value);return b;},u4=value=>{const b=Buffer.alloc(4);b.writeUInt32BE(value);return b;},
    add=(key,bytes,wide=false)=>{if(cache.has(key))return cache.get(key);const index=pool.length+1;pool.push(bytes);if(wide)pool.push(null);cache.set(key,index);return index;},
    utf=value=>add('u:'+value,Buffer.concat([Buffer.from([1]),u2(Buffer.byteLength(value)),Buffer.from(value)])),
    cls=value=>add('c:'+value,Buffer.concat([Buffer.from([7]),u2(utf(value.replaceAll('.','/')))])),
    ref=(tag,owner,name,descriptor)=>{const c=cls(owner),nt=add('nt:'+name+descriptor,Buffer.concat([Buffer.from([12]),u2(utf(name)),u2(utf(descriptor))]));return add('r:'+tag+owner+name+descriptor,Buffer.concat([Buffer.from([tag]),u2(c),u2(nt)]));},
    cp=(kind,value)=>{if(kind==='class')return cls(value);if(kind==='string')return add('s:'+value,Buffer.concat([Buffer.from([8]),u2(utf(value))]));
      const tag={int:3,float:4,long:5,double:6}[kind],bytes=Buffer.alloc(tag===5||tag===6?9:5);bytes[0]=tag;
      if(tag===3)bytes.writeInt32BE(Number(value),1);else if(tag===4)bytes.writeFloatBE(Number(value),1);else if(tag===5)bytes.writeBigInt64BE(BigInt(value),1);else bytes.writeDoubleBE(Number(value),1);
      return add(kind+':'+value,bytes,tag===5||tag===6);},
    opcode=name=>{const result=coreOpcodeNames.indexOf(name);assert.ok(result>=0);return result;},
    locals={iload:[21,26],lload:[22,30],fload:[23,34],dload:[24,38],aload:[25,42],istore:[54,59],lstore:[55,63],fstore:[56,67],dstore:[57,71],astore:[58,75]},self=cls(contract.className),parent=cls('java.lang.Object'),codeName=utf('Code');
  const methods=contract.methods.map(method=>{
    const name=utf(method.name),descriptor=utf(method.descriptor),pcs=[];let size=0;
    const recipes=method.code.map((operation,n)=>{
      pcs.push(size);const local=operation.match(/^([ailfd](?:load|store)):(\d+)$/),branch=operation.match(/^(if[a-z_]+|goto|goto_w):(\d+)$/),literal=operation.match(/^(int|float|long|double|class|string):(.+)$/);let result;
      if(local){const index=Number(local[2]),ops=locals[local[1]];assert.ok(ops);result={bytes:Buffer.from(index<=3&&!genericLocals?[ops[1]+index]:[ops[0],index])};}
      else if(branch)result={branch:branch[1],target:Number(branch[2]),length:branch[1]==='goto_w'?5:3};
      else if(operation.startsWith('newarray:'))result={bytes:Buffer.from([188,Number(operation.slice(9))])};
      else if(operation.startsWith('iinc:')){const [local,increment]=operation.slice(5).split(',').map(Number);result={bytes:Buffer.from([132,local,increment&255])};}
      else if(/^(new|anewarray|checkcast|instanceof):/.test(operation)){const at=operation.indexOf(':');result={bytes:Buffer.concat([Buffer.from([opcode(operation.slice(0,at))]),u2(cls(operation.slice(at+1)))])};}
      else if(operation.startsWith('multianewarray:')){const value=operation.slice(operation.indexOf(':')+1),at=value.lastIndexOf('#');result={bytes:Buffer.concat([Buffer.from([197]),u2(cls(value.slice(0,at))),Buffer.from([Number(value.slice(at+1))])])};}
      else if(/^(getfield|putfield|getstatic|putstatic):/.test(operation)){const m=operation.match(/^([^:]+):([^#]+)#([a-z]+)(.+)$/);assert.ok(m);result={bytes:Buffer.concat([Buffer.from([opcode(m[1])]),u2(ref(9,m[2],m[3],m[4]))])};}
      else if(/^(invokevirtual|invokestatic|invokespecial|invokeinterface):/.test(operation)){const m=operation.match(/^([^:]+):([^#]+)#([^()]+)(\(.+)$/);assert.ok(m);const tag=m[1]==='invokeinterface'||m[2].endsWith('InstructionMemberApi')?11:10;result={bytes:Buffer.concat([Buffer.from([opcode(m[1])]),u2(ref(tag,m[2],m[3],m[4])),...(m[1]==='invokeinterface'?[Buffer.from([1,0])]:[])])};}
      else if(literal){const nativeOpcode=method.nativeOpcodes[n],kind=literal[1],value=literal[2];
        if(['ldc','ldc_w','ldc2_w'].includes(nativeOpcode)){const index=cp(kind,value);result={bytes:nativeOpcode==='ldc'?Buffer.from([18,index]):Buffer.concat([Buffer.from([opcode(nativeOpcode)]),u2(index)])};}
        else if(nativeOpcode==='bipush')result={bytes:Buffer.from([16,Number(value)&255])};
        else if(nativeOpcode==='sipush'){const b=Buffer.alloc(3);b[0]=17;b.writeInt16BE(Number(value),1);result={bytes:b};}
        else result={bytes:Buffer.from([opcode(nativeOpcode)])};
      }else result={bytes:Buffer.from([opcode(operation)])};
      result.length??=result.bytes.length;size+=result.length;return result;
    });pcs.push(size);
    const raw=Buffer.concat(recipes.map((recipe,n)=>{if(recipe.bytes)return recipe.bytes;const b=Buffer.alloc(recipe.length);b[0]=opcode(recipe.branch);if(recipe.length===5)b.writeInt32BE(pcs[recipe.target]-pcs[n],1);else b.writeInt16BE(pcs[recipe.target]-pcs[n],1);return b;}));
    const vt=value=>{if(value.startsWith('Uninitialized:'))return Buffer.concat([Buffer.from([8]),u2(Number(value.slice(14)))]);const tag=['TOP','INTEGER','FLOAT','DOUBLE','LONG','NULL','UNINITIALIZED_THIS'].indexOf(value);return tag>=0?Buffer.from([tag]):Buffer.concat([Buffer.from([7]),u2(cls(value.slice(7)))]);};
    let previous=-1,previousLocals=null;const frames=method.frames.map(frame=>{
      const delta=pcs[frame.target]-previous-1;previous=pcs[frame.target];let bytes;
      if(compressed&&previousLocals&&JSON.stringify(previousLocals)===JSON.stringify(frame.locals)&&delta<64&&frame.stack.length<=1)
        bytes=frame.stack.length?Buffer.concat([Buffer.from([64+delta]),vt(frame.stack[0])]):Buffer.from([delta]);
      else bytes=Buffer.concat([Buffer.from([255]),u2(delta),u2(frame.locals.length),...frame.locals.map(vt),u2(frame.stack.length),...frame.stack.map(vt)]);
      previousLocals=frame.locals;return bytes;
    });
    const attrs=frames.length?[Buffer.concat([u2(utf('StackMapTable')),u4(2+frames.reduce((n,b)=>n+b.length,0)),u2(frames.length),...frames])]:[],
      handlers=method.handlers.map(h=>Buffer.concat([u2(pcs[h.start]),u2(pcs[h.end]),u2(pcs[h.target]),u2(h.catchType===null?0:cls(h.catchType))])),
      body=Buffer.concat([u2(method.maxStack),u2(method.maxLocals),u4(raw.length),raw,u2(handlers.length),...handlers,u2(attrs.length),...attrs]);
    return Buffer.concat([u2(method.flags),u2(name),u2(descriptor),u2(1),u2(codeName),u4(body.length),body]);
  });
  const header=Buffer.alloc(10);header.writeUInt32BE(0xcafebabe);header.writeUInt16BE(69,6);header.writeUInt16BE(pool.length+1,8);
  const interfaces=contract.interfaces.map(cls),fields=contract.fields.map(field=>Buffer.concat([u2(field.flags),u2(utf(field.name)),u2(utf(field.descriptor)),u2(0)]));
  header.writeUInt16BE(pool.length+1,8);
  return Buffer.concat([header,...pool.filter(Boolean),u2(contract.flags),u2(self),u2(parent),u2(interfaces.length),...interfaces.map(u2),u2(fields.length),...fields,u2(methods.length),...methods,u2(0)]);
}
for(const [caseId,contracts] of Object.entries(classFileArtifactContracts))for(const contract of contracts)test('reader-only '+caseId+' fixes real typed Code/targets/frames without native-byte substitution',()=>{
  const bytes=syntheticArtifact(contract),decoded=inspectClassFileArtifactBytes(bytes,contract),layout=readStructureLayout(bytes);
  assert.equal(decoded.sha256,sha(bytes));assert.equal(decoded.originalBytesBase64,bytes.toString('base64'));inspectClassFileArtifactBytes(syntheticArtifact(contract,{compressed:true}),contract);
  for(const mutate of [x=>x.writeUInt16BE(65,6),x=>x.writeUInt16BE(65535,4),x=>x.writeUInt16BE(contract.flags^16,layout.flagsOffset),x=>x.writeUInt16BE(0,layout.thisClassOffset),
    x=>x[layout.methods.entries[0].code.instructionsOffset]=255,x=>x.writeUInt16BE(contract.methods[0].maxStack+1,layout.methods.entries[0].code.instructionsOffset-8),
    x=>x.writeUInt16BE(contract.methods[0].maxLocals+1,layout.methods.entries[0].code.instructionsOffset-6)]){
    const changed=Buffer.from(bytes);mutate(changed);assert.throws(()=>inspectClassFileArtifactBytes(changed,contract));}
  assert.throws(()=>inspectClassFileArtifactBytes(bytes.subarray(0,-1),contract));assert.throws(()=>inspectClassFileArtifactBytes(Buffer.concat([bytes,Buffer.from([0])]),contract));
  assert.throws(()=>proveClassFileArtifact(bytes,contract,{host:'unknown',caseId,record:{}}));assert.throws(()=>proveClassFileArtifact(bytes,contract,{host:'node',caseId,record:{release:25}}));
});
test('array kinds/ranks, monitor intervals and initialization-token frame identities cannot drift',()=>{
  for(const id of ['cf-array-int-long','cf-array-multi-reference','cf-member-monitor-handler','cf-frame-protected-new','cf-frame-uninitialized-join']){
    const contract=classFileArtifactContracts[id][0],bytes=syntheticArtifact(contract),wrong=clone(contract);
    if(id==='cf-array-int-long')wrong.methods[0].code[1]='newarray:11';
    else if(id==='cf-array-multi-reference')wrong.methods[0].code[2]='multianewarray:[[Ljava.lang.String;#1';
    else if(id==='cf-member-monitor-handler')wrong.methods[0].handlers[0].end--;
    else if(id==='cf-frame-protected-new')wrong.methods[0].frames[0].locals.push('Uninitialized:0');
    else wrong.methods[0].frames[0].locals[1]='Object:java.lang.StringBuilder';
    assert.throws(()=>inspectClassFileArtifactBytes(bytes,wrong));
  }
});
test('large actual forward/backward GOTO_W boundaries and dead patch instruction shapes cannot be replaced',()=>{
  for(const id of ['cf-frame-forward-wide','cf-frame-backward-wide','cf-frame-goto-wide','cf-frame-dead-patch']){
    const contract=classFileArtifactContracts[id][0],bytes=syntheticArtifact(contract),wrong=clone(contract);
    const at=wrong.methods[0].code.findIndex(op=>op.startsWith('goto_w:')||op==='athrow');wrong.methods[0].code[at]='nop';
    assert.throws(()=>inspectClassFileArtifactBytes(bytes,wrong));
  }
});
test('artifact transport rejects missing, duplicate/cross-case and noncanonical base64 records',()=>{
  const group={...gate.classFileGroups[0],cases:[gate.classFileGroups[0].cases[0]]};
  for(const line of ['', 'CF_ARTIFACT|cf-array-int-long|wrong|AA==','CF_ARTIFACT|cf-array-float-double|array-int-long|AA==',
    'CF_ARTIFACT|cf-array-int-long|array-int-long|','CF_ARTIFACT|cf-array-int-long|array-int-long|AA',
    'CF_ARTIFACT|cf-array-int-long|array-int-long|!!!!','CF_ARTIFACT|cf-array-int-long|array-int-long|AA==|ignored'])
    assert.throws(()=>gate.assertClassFileResult({status:'passed',exitCode:0,timedOut:false,outputLimitExceeded:false,stderr:'',stdout:line+'\n'},group,'node',{}));
});
test('empty, generated or wrong-release bytes cannot replace original compiler/callback proof',()=>{
  for(const record of [{release:21,classFiles:[],inputProofs:{}},{release:25,classFiles:[],inputProofs:{classes:[]}},{release:25,classFiles:[],inputProofs:{classes:[{originalBytesBase64:'AA==',classFile:{}}]}}])
    assert.throws(()=>assertClassFileInputProofs(record,gate.classFileGroups[0]));
});
test('input digest closure is unique and binds every original source/corpus/proof contract',()=>{
  const files=gate.classFileInputPaths();assert.equal(new Set(files).size,files.length);assert.deepEqual(files,files.slice().sort());
  for(const group of gate.classFileGroups)for(const relative of [group.source,...group.additionalSources])assert.ok(files.includes(path.join(root,relative)));
  for(const relative of ['ci/java_classfile_instructions_contract_test.mjs','ci/java_classfile_instructions_bytecode.mjs','ci/classfile_instruction_arrays_cases.mjs','ci/classfile_instruction_arithmetic_cases.mjs','ci/classfile_instruction_members_cases.mjs','ci/classfile_instruction_frames_cases.mjs',
    'ci/ClassFileInstructionFlowRegression.java','ci/ClassFileMemoryInstructionRegression.java','ci/classfile_memory_instruction_test.cjs','ci/ClassFileInstructionWriterRegression.java','ci/classfile_instruction_writer_test.cjs','ci/classfile_instruction_frame_policy_test.cjs','ci/PartialMultianewarrayRegression.java','ci/partial_multianewarray_regression_test.cjs','ci/compile_classfile_metadata.cjs'])assert.ok(files.includes(path.join(root,relative)));
});
test('strict CLI accepts exactly one explicit mode and rejects selectors/waivers before execution',()=>{
  for(const mode of ['--browser','--native-only','--diagnostic'])assert.equal(gate.parseClassFileMode([mode]),mode.slice(2));
  for(const args of [[],['--node'],['--browser','--browser'],['--browser','ignored'],['--browser','--release','21'],['--browser','--skip-native']]){
    assert.throws(()=>gate.parseClassFileMode(args));const result=spawnSync(process.execPath,[path.join(root,'ci/java_classfile_instructions_test.mjs'),...args],{cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(result.status,1);assert.match(result.stderr,/Usage:/);assert.equal(result.stdout,'');
  }
});
test('private initial C7d2 ledger cannot overwrite diagnostic or earlier C7 evidence',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-c7d2-write-contract-'));
  try{const file=path.join(directory,'receipt.json');gate.writeClassFileLedger(file,gate.createClassFileLedger());assert.equal(fs.statSync(file).mode&0o777,0o600);const before=fs.readFileSync(file,'utf8');
    assert.throws(()=>gate.writeClassFileLedger(file,gate.createClassFileLedger('native-only')));for(const other of [earlier,flow,extended])assert.throws(()=>gate.writeClassFileLedger(file,other.createClassFileLedger()));
    assert.equal(fs.readFileSync(file,'utf8'),before);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('passed initial C7d2 receipt, when present, replays all original callbacks/routes and host-produced arrays',()=>{
  const filename=path.join(root,'build/java-classfile-instructions-results.json');if(!fs.existsSync(filename))return;const ledger=JSON.parse(fs.readFileSync(filename));if(ledger.status!=='passed')return;
  assert.equal(ledger.phaseId,'C7d2');let routes=0,artifacts=0;
  for(const record of ledger.results){const group=gate.classFileGroups.find(x=>x.id===record.group);assertClassFileInputProofs(record,group);routes+=record.inputProofs.returnedArrayRoutes.length;
    for(const cell of record.executions){assert.equal(cell.status,'passed');for(const output of cell.artifacts){const expected=classFileArtifactContracts[output.caseId].find(x=>x.id===output.artifactId);
      assert.deepEqual(proveClassFileArtifact(Buffer.from(output.bytesBase64,'base64'),expected,{host:cell.host,caseId:output.caseId,record}),output);artifacts++;}}
    for(const mutate of [x=>x.inputProofs.classes.pop(),x=>x.inputProofs.callbackProofs.pop(),x=>x.inputProofs.returnedArrayRoutes[0].byteArrayLocal++,x=>x.inputProofs.caseCallbackProofs[2].probes[0].codeSha256='f'.repeat(64),
      x=>x.inputProofs.classes[0].originalBytesBase64=x.inputProofs.classes[1].originalBytesBase64]){const changed=clone(record);mutate(changed);assert.throws(()=>assertClassFileInputProofs(changed,group));}
  }
  assert.equal(routes,32);assert.equal(artifacts,96);
});

