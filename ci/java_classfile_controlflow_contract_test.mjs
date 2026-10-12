import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as harness from './java_classfile_controlflow_test.mjs';
import * as earlier from './java_classfile_api_test.mjs';
import {classFileInputContracts,classFileArtifactContracts,inspectClassFileArtifactBytes,
  assertClassFileInputProofs,proveClassFileArtifact} from './java_classfile_controlflow_bytecode.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {coreOpcodeNames} from './java_core_bytecode.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clone=value=>structuredClone(value),sha=value=>crypto.createHash('sha256').update(value).digest('hex');

test('C7b independently fixes two eight-case original Java25 recipes and six mandatory host cells',()=>{
  assert.equal(harness.validateClassFileGroups(),16);
  assert.deepEqual(harness.classFileGroups.map(group=>group.id),['classfile-controlflow','classfile-stackmaps']);
  assert.deepEqual(harness.classFileGroups.map(group=>group.cases.length),[8,8]);
  for(const mode of ['browser','native-only','diagnostic']){
    const ledger=harness.createClassFileLedger(mode);assert.equal(ledger.phaseId,'C7b');assert.equal(ledger.caseCount,16);
    assert.equal(ledger.results.flatMap(record=>record.executions).length,6);
    assert.deepEqual(ledger.requiredReleases,[25]);assert.deepEqual(ledger.requiredHosts,['native','node','chromium']);
    assert.equal(ledger.officialGate,mode==='browser');harness.assertClassFileLedger(ledger,{phase:'initial'});
  }
  for(const group of harness.classFileGroups)for(const entry of group.cases)
    assert.ok(Object.isFrozen(entry.trace)&&Object.isFrozen(entry.probes)&&Object.isFrozen(entry.callbackMethods)&&Object.isFrozen(entry.artifacts));
});
test('earlier C7a32 remains a separate exact gate and cannot substitute for C7b',()=>{
  assert.equal(earlier.validateClassFileGroups(),32);assert.equal(earlier.createClassFileLedger().results.length,4);
  assert.throws(()=>harness.assertClassFileLedger(earlier.createClassFileLedger()));
  assert.throws(()=>earlier.assertClassFileLedger(harness.createClassFileLedger()));
  assert.throws(()=>harness.createClassFileLedger('browser',earlier.classFileGroups));
});
test('Java21 final-API absence stays explicit non-applicability, never a passed or waived Java25 cell',()=>{
  assert.deepEqual(harness.classFileApplicability.map(x=>[x.release,x.applicable,x.finalApiSince]),[[21,false,24],[25,true,24]]);
  for(const mutate of [x=>x.applicability.pop(),x=>x.applicability[0].applicable=true,x=>x.applicability[1].applicable=false,
    x=>x.requiredReleases.push(21),x=>x.results[0].release=21,x=>x.results[0].executions[0].status='skipped']){
    const ledger=harness.createClassFileLedger();mutate(ledger);assert.throws(()=>harness.assertClassFileLedger(ledger));
  }
});
test('changed/pruned callback, source, case, trace, field, output or recipe inventories cannot shrink exit',()=>{
  for(const mutate of [x=>x.pop(),x=>x.reverse(),x=>x[0].cases.pop(),x=>x[0].cases.reverse(),x=>x[0].cases[0].trace.push('invented'),
    x=>x[0].source=x[1].source,x=>x[0].additionalSources=[],x=>x[1].resourceClassNames=[],x=>x[0].driverClassNames.pop(),
    x=>x[0].javacFlags=['-g'],x=>x[0].releases=[21],x=>x[0].generatedSources=[],x=>x[0].cases[0].callbackMethods=[],
    x=>x[0].cases[0].probes[0].ignored=true,x=>x[0].cases[0].artifacts=[],x=>x[1].cases[4].artifacts[0].definition='define-and-invoke',
    x=>x[0].cases[4].artifacts[0].methods[0].opcodes.push('nop')]){
    const groups=clone(harness.classFileGroups);mutate(groups);assert.throws(()=>harness.createClassFileLedger('browser',groups));
  }
});
for(const flag of harness.classFileCompletionFlags)test('finite C7b does not promote '+flag,()=>{
  const ledger=harness.createClassFileLedger();assert.equal(ledger[flag],false);
  for(const value of [true,null,undefined,0,'false']){const changed=clone(ledger);changed[flag]=value;assert.throws(()=>harness.assertClassFileLedger(changed));}
  const changed=clone(ledger);delete changed[flag];assert.throws(()=>harness.assertClassFileLedger(changed));
});
test('mandatory host/order/inventory omissions and stale success evidence are rejected',()=>{
  for(const mutate of [x=>x.results.pop(),x=>x.results.reverse(),x=>x.caseCount--,x=>x.results[0].executions.pop(),
    x=>x.results[0].executions.reverse(),x=>x.requiredHosts.pop(),x=>x.requiredReleases=[],x=>x.phaseId='C7a',x=>x.schemaVersion++,
    x=>x.status='passed',x=>x.results[0].status='passed',x=>x.results[0].operations.push({}),x=>x.results[0].classFiles=[],
    x=>x.results[0].inputProofs={},x=>x.results[0].executions[0].result={},x=>x.results[0].executions[0].outcomes=[]]){
    const ledger=harness.createClassFileLedger();mutate(ledger);assert.throws(()=>harness.assertClassFileLedger(ledger,{phase:'initial'}));
  }
  const ledger=harness.createClassFileLedger();ledger.status='passed';assert.throws(()=>harness.assertClassFileLedger(ledger,{phase:'terminal'}));
});
test('LIB007 owns public API while indexed dependent clauses keep original owners and completeness false',()=>{
  const index=JSON.parse(fs.readFileSync(path.join(root,'ci/plan_spec_source_index.json'))),originals=new Map(index.units.map(x=>[x.id,x]));
  assert.equal(index.units.filter(x=>x.ownerPackageId==='LIB-007').length,0);
  for(const group of harness.classFileGroups)for(const item of harness.classFileSourceUnits(group,index)){
    assert.equal(item.apiOwnerPackageId,'LIB-007');assert.equal(item.fullApiConformanceProven,false);
    for(const unit of item.sourceUnits){assert.equal(unit.ownerPackageId,originals.get(unit.id).ownerPackageId);
      assert.equal(unit.url,originals.get(unit.id).url);assert.equal(unit.fullUnitConformanceProven,false);}
  }
});
function compilerFixture(){
  const group=harness.classFileGroups[0],prepared={feature:25,home:path.join(os.tmpdir(),'c7b-jdk25')};
  const output=path.join(os.tmpdir(),'c7b-recipe-root','release25',group.id,'classes'),empty=path.resolve(output,'..','..','..','empty-sourcepath');
  const sources=[group.source,...group.additionalSources].map(x=>path.join(root,x));
  const files=group.driverClassNames.map(name=>({path:name.replaceAll('.','/')+'.class',size:123,sha256:'a'.repeat(64),major:69,minor:0})).sort((a,b)=>a.path.localeCompare(b.path));
  const operation={kind:'genuine-driver',command:path.join(prepared.home,'bin/javac'),arguments:['--release','25','-encoding','UTF-8','-proc:none',
    '-g:source','-sourcepath',empty,'-classpath',empty,'-d',output,...sources],sourceDigests:sources.map(filename=>({path:filename,sha256:sha(fs.readFileSync(filename))}))};
  operation.result={status:'passed',exitCode:0,error:null,signal:null,timedOut:false,outputLimitExceeded:false,stdout:'',stderr:'',
    command:[operation.command,...operation.arguments],cwd:path.dirname(output),timeoutMs:harness.classFileTimeouts.compileMs};
  operation.outputEvidence={directory:output,treeSha256:'b'.repeat(64),files:files.map(({path,size,sha256})=>({path,size,sha256}))};
  return {group,prepared,record:{release:25,classFiles:files,operations:[operation],classpath:{directory:output,treeSha256:'b'.repeat(64),
    genuineCompilerBytes:true,byteTransformations:false,fallbackClassFiles:false}}};
}
test('genuine javac25 compilation must bind exact argv, source digests, clean raw result and output bytes',()=>{
  const fixture=compilerFixture();harness.assertClassFileCompilation(fixture.record,fixture.group,fixture.prepared);
  for(const mutate of [x=>x.release=21,x=>x.operations.push(clone(x.operations[0])),x=>x.operations[0].kind='adapter',
    x=>x.operations[0].arguments[1]='21',x=>x.operations[0].arguments[6]='-g',x=>x.operations[0].sourceDigests[0].sha256='f'.repeat(64),
    x=>x.operations[0].result.command.pop(),x=>x.operations[0].result.timeoutMs++,x=>x.operations[0].result.stdout='ignored',
    x=>x.operations[0].result.stderr='ignored',x=>x.operations[0].result.timedOut=true,x=>x.classFiles.pop(),x=>x.classFiles[0].major=65,
    x=>x.classpath.byteTransformations=true,x=>x.classpath.genuineCompilerBytes=false,x=>x.classpath.fallbackClassFiles=true,
    x=>x.operations[0].outputEvidence.files.pop()]){const record=clone(fixture.record);mutate(record);
      assert.throws(()=>harness.assertClassFileCompilation(record,fixture.group,fixture.prepared));}
});
test('CASE-only negative parser rejects unexpected output, wrong trace/order/status, timeout and stderr',()=>{
  // Reader/parser isolation only; this single artifactless case is not a gate inventory.
  const group={...harness.classFileGroups[0],cases:[harness.classFileGroups[0].cases[7]]};
  const raw={status:'passed',exitCode:0,signal:null,timedOut:false,outputLimitExceeded:false,error:null,stderr:'',
    stdout:'CASE|'+group.cases[0].id+'|'+group.cases[0].trace[0]+'\n'+group.completionMarker+'\n'};
  assert.equal(harness.assertClassFileResult(raw,group,'node').outcomes.length,1);
  for(const mutate of [x=>x.stdout='',x=>x.stdout+='ignored\n',x=>x.stdout=x.stdout.replace(group.completionMarker,'WRONG'),
    x=>x.stdout=x.stdout.replace('IllegalArgumentException','invented'),x=>x.stderr='ignored',x=>x.status='failed',x=>x.exitCode=1,
    x=>x.signal='SIGTERM',x=>x.error='failed',x=>x.timedOut=true,x=>x.outputLimitExceeded=true]){const changed=clone(raw);mutate(changed);
      assert.throws(()=>harness.assertClassFileResult(changed,group,'node'));}
  assert.throws(()=>harness.assertClassFileResult(raw,group,'unknown'));
});
test('fourteen output contracts are independent of five original artifacts and exactly two are never defined',()=>{
  assert.deepEqual(harness.classFileGroups.map(x=>x.driverClassNames.length),[2,3]);
  assert.deepEqual(harness.classFileGroups.map(x=>x.cases.reduce((n,c)=>n+c.artifacts.length,0)),[7,7]);
  const outputs=Object.values(classFileArtifactContracts).flat();assert.equal(outputs.length,14);
  assert.equal(outputs.filter(x=>x.definition==='forbidden').length,2);
  assert.equal(Object.values(classFileInputContracts).reduce((n,x)=>n+x.callbacks.filter(c=>c.bootstrap).length,0),44);
  assert.equal(Object.values(classFileInputContracts).reduce((n,x)=>n+x.callbacks.length,0),45);
});

// Synthetic reader-only inputs exercise the evidence parser. They are never
// a stock-javac fixture, a public API implementation or a host gate result.
function syntheticArtifact(contract,{genericLocals=false,compressed=false}={}){
  const pool=[],cache=new Map(),u2=value=>{const b=Buffer.alloc(2);b.writeUInt16BE(value);return b;},
    u4=value=>{const b=Buffer.alloc(4);b.writeUInt32BE(value);return b;};
  const add=(key,bytes)=>{if(cache.has(key))return cache.get(key);const index=pool.length+1;pool.push(bytes);cache.set(key,index);return index;};
  const utf=value=>add('u:'+value,Buffer.concat([Buffer.from([1]),u2(Buffer.byteLength(value)),Buffer.from(value)]));
  const cls=value=>{const index=utf(value.replaceAll('.','/'));return add('c:'+value,Buffer.concat([Buffer.from([7]),u2(index)]));};
  const ref=(owner,name,descriptor)=>{const c=cls(owner),n=utf(name),d=utf(descriptor),nt=add('n:'+name+descriptor,Buffer.concat([Buffer.from([12]),u2(n),u2(d)]));
    return add('r:'+owner+name+descriptor,Buffer.concat([Buffer.from([10]),u2(c),u2(nt)]));};
  const self=cls(contract.className),parent=cls('java.lang.Object'),codeName=utf('Code');
  const opcode=name=>{const value=coreOpcodeNames.indexOf(name);assert.ok(value>=0);return value;};
  const locals={iload:[0x15,0x1a],lload:[0x16,0x1e],fload:[0x17,0x22],dload:[0x18,0x26],aload:[0x19,0x2a],
    istore:[0x36,0x3b],lstore:[0x37,0x3f],fstore:[0x38,0x43],dstore:[0x39,0x47],astore:[0x3a,0x4b]};
  const methods=contract.methods.map(method=>{
    const name=utf(method.name),descriptor=utf(method.descriptor),pcs=[];let size=0;
    const recipes=method.code.map(operation=>{
      const pc=size;pcs.push(pc);let result;
      const local=operation.match(/^([ailfd](?:load|store)):(\d+)$/),branch=operation.match(/^(if[a-z_]+|goto|goto_w):(\d+)$/);
      if(local){const index=Number(local[2]),ops=locals[local[1]];result={bytes:Buffer.from(index>255?[196,ops[0],index>>8,index&255]:
          index<=3&&!genericLocals?[ops[1]+index]:[ops[0],index])};}
      else if(branch)result={branch,target:Number(branch[2]),length:branch[1]==='goto_w'?5:3};
      else if(operation.startsWith('tableswitch:')||operation.startsWith('lookupswitch:')){
        const table=operation.startsWith('tableswitch:'),match=operation.match(table?/^tableswitch:(-?\d+)\.\.(-?\d+);default=(\d+);cases=(.+)$/:/^lookupswitch:default=(\d+);cases=(.+)$/);
        assert.ok(match);const pairs=(table?match[4]:match[2]).split(',').map(x=>x.split(':').map(Number)),base=(pc+4)&~3;
        result={table,pairs,default:Number(table?match[3]:match[1]),low:table?Number(match[1]):null,high:table?Number(match[2]):null,
          pc,base,length:base-pc+(table?12:8)+pairs.length*(table?4:8)};
      }else if(operation.startsWith('int:')){const value=Number(operation.slice(4));result={bytes:Buffer.from(value>=-1&&value<=5?[value+3]:[16,value&255])};}
      else if(operation.startsWith('invokespecial:')){const m=operation.match(/^invokespecial:([^#]+)#([^(:]+)(.+)$/);result={bytes:Buffer.concat([Buffer.from([183]),u2(ref(m[1],m[2],m[3]))])};}
      else result={bytes:Buffer.from([opcode(operation)])};
      result.length??=result.bytes.length;size+=result.length;return result;
    });
    pcs.push(size);
    const code=Buffer.concat(recipes.map((recipe,index)=>{
      if(recipe.bytes)return recipe.bytes;
      const bytes=Buffer.alloc(recipe.length);
      if(recipe.branch){bytes[0]=opcode(recipe.branch[1]);const offset=pcs[recipe.target]-pcs[index];
        if(recipe.length===5)bytes.writeInt32BE(offset,1);else bytes.writeInt16BE(offset,1);}
      else{bytes[0]=recipe.table?170:171;const base=recipe.base-recipe.pc;bytes.writeInt32BE(pcs[recipe.default]-recipe.pc,base);
        if(recipe.table){bytes.writeInt32BE(recipe.low,base+4);bytes.writeInt32BE(recipe.high,base+8);
          recipe.pairs.forEach(([,target],n)=>bytes.writeInt32BE(pcs[target]-recipe.pc,base+12+n*4));}
        else{bytes.writeInt32BE(recipe.pairs.length,base+4);recipe.pairs.forEach(([key,target],n)=>{bytes.writeInt32BE(key,base+8+n*8);bytes.writeInt32BE(pcs[target]-recipe.pc,base+12+n*8);});}}
      return bytes;
    }));
    const vt=value=>{const tag=['TOP','INTEGER','FLOAT','DOUBLE','LONG','NULL','UNINITIALIZED_THIS'].indexOf(value);
      return tag>=0?Buffer.from([tag]):Buffer.concat([Buffer.from([7]),u2(cls(value.slice(7)))]);};
    let previous=-1,previousLocals=null;const frames=method.frames.map(frame=>{
      const delta=pcs[frame.target]-previous-1;previous=pcs[frame.target];
      let bytes;
      if(compressed&&previousLocals&&JSON.stringify(previousLocals)===JSON.stringify(frame.locals)&&delta<64&&frame.stack.length<=1)
        bytes=frame.stack.length?Buffer.concat([Buffer.from([64+delta]),vt(frame.stack[0])]):Buffer.from([delta]);
      else bytes=Buffer.concat([Buffer.from([255]),u2(delta),u2(frame.locals.length),...frame.locals.map(vt),u2(frame.stack.length),...frame.stack.map(vt)]);
      previousLocals=frame.locals;return bytes;
    });
    const attrs=frames.length?[Buffer.concat([u2(utf('StackMapTable')),u4(2+frames.reduce((n,x)=>n+x.length,0)),u2(frames.length),...frames])]:[];
    const handlers=method.handlers.map(handler=>Buffer.concat([u2(pcs[handler.start]),u2(pcs[handler.end]),u2(pcs[handler.target]),u2(handler.catchType===null?0:cls(handler.catchType))]));
    const body=Buffer.concat([u2(method.maxStack),u2(method.maxLocals),u4(code.length),code,u2(handlers.length),...handlers,u2(attrs.length),...attrs]);
    return Buffer.concat([u2(method.flags),u2(name),u2(descriptor),u2(1),u2(codeName),u4(body.length),body]);
  });
  const attrs=contract.sourceFile===null?[]:[Buffer.concat([u2(utf('SourceFile')),u4(2),u2(utf(contract.sourceFile))])];
  const header=Buffer.alloc(10);header.writeUInt32BE(0xcafebabe);header.writeUInt16BE(69,6);header.writeUInt16BE(pool.length+1,8);
  return Buffer.concat([header,...pool,u2(contract.flags),u2(self),u2(parent),u2(0),u2(0),u2(methods.length),...methods,u2(attrs.length),...attrs]);
}
for(const [caseId,contracts] of Object.entries(classFileArtifactContracts))for(const contract of contracts){
  test('reader-only '+caseId+' fixes full Code/targets/handlers/expanded frames and rejects byte forgery',()=>{
    const bytes=syntheticArtifact(contract),decoded=inspectClassFileArtifactBytes(bytes,contract),layout=readStructureLayout(bytes);
    assert.equal(decoded.sha256,sha(bytes));assert.equal(decoded.originalBytesBase64,bytes.toString('base64'));
    inspectClassFileArtifactBytes(syntheticArtifact(contract,{genericLocals:true,compressed:true}),contract);
    for(const mutate of [x=>x.writeUInt16BE(65,6),x=>x.writeUInt16BE(65535,4),x=>x.writeUInt16BE(contract.flags^16,layout.flagsOffset),
      x=>x.writeUInt16BE(0,layout.thisClassOffset),x=>x[layout.methods.entries[0].code.instructionsOffset]=255,
      x=>x.writeUInt16BE(contract.methods[0].maxStack+1,layout.methods.entries[0].code.instructionsOffset-8),
      x=>x.writeUInt16BE(contract.methods[0].maxLocals+1,layout.methods.entries[0].code.instructionsOffset-6)]){
      const changed=Buffer.from(bytes);mutate(changed);assert.throws(()=>inspectClassFileArtifactBytes(changed,contract));
    }
    assert.throws(()=>inspectClassFileArtifactBytes(bytes.subarray(0,-1),contract));
    assert.throws(()=>inspectClassFileArtifactBytes(Buffer.concat([bytes,Buffer.from([0])]),contract));
    assert.throws(()=>proveClassFileArtifact(bytes,contract,{host:'unknown',caseId,record:{}}));
    assert.throws(()=>proveClassFileArtifact(bytes,contract,{host:'node',caseId,record:{release:25}}),'Output is not an original callback/source proof');
  });
}
test('target redirection, switch keys/padding, handler ordering/ranges and frame vectors are not ignored',()=>{
  for(const [caseId,edit] of [
    ['cf-flow-zero-predicates',(bytes,layout)=>bytes.writeInt16BE(3,layout.methods.entries[0].code.instructionsOffset+2)],
    ['cf-flow-table-switch',(bytes,layout)=>bytes[layout.methods.entries[0].code.instructionsOffset+2]=1],
    ['cf-flow-lookup-switch',(bytes,layout)=>bytes.writeInt32BE(5,layout.methods.entries[0].code.instructionsOffset+12)],
    ['cf-flow-ordered-handlers',(bytes,layout)=>bytes.writeUInt16BE(0,layout.methods.entries[0].code.handlersOffset+2)],
    ['cf-frames-long-stack-merge',(bytes,layout)=>{const attr=layout.methods.entries[0].code.attributes.entries[0];bytes[attr.end-1]=1;}]
  ]){const contract=classFileArtifactContracts[caseId][0],bytes=syntheticArtifact(contract),layout=readStructureLayout(bytes);edit(bytes,layout);
    assert.throws(()=>inspectClassFileArtifactBytes(bytes,contract));}
});
test('artifact transport rejects missing, duplicate, foreign/cross-case and noncanonical base64 records',()=>{
  const group=harness.classFileGroups[0];
  for(const line of ['', 'CF_ARTIFACT|cf-flow-zero-predicates|wrong|AA==','CF_ARTIFACT|cf-flow-int-predicates|flow-zero|AA==',
    'CF_ARTIFACT|cf-flow-zero-predicates|flow-zero|','CF_ARTIFACT|cf-flow-zero-predicates|flow-zero|AA',
    'CF_ARTIFACT|cf-flow-zero-predicates|flow-zero|!!!!','CF_ARTIFACT|cf-flow-zero-predicates|flow-zero|AA==|ignored']){
    assert.throws(()=>harness.assertClassFileResult({status:'passed',exitCode:0,timedOut:false,outputLimitExceeded:false,stderr:'',stdout:line+'\n'},group,'node',{}));
  }
});
test('original proof rejects empty, generated or non-Java25 input replacement',()=>{
  for(const record of [{release:21,classFiles:[],inputProofs:{}},{release:25,classFiles:[],inputProofs:{classes:[]}},
    {release:25,classFiles:[],inputProofs:{classes:[{originalBytesBase64:'AA==',classFile:{}}]}}])
    assert.throws(()=>assertClassFileInputProofs(record,harness.classFileGroups[0]));
});
test('source digest closure is unique, stable and contains all original corpus/proof/contract inputs',()=>{
  const files=harness.classFileInputPaths();assert.equal(new Set(files).size,files.length);assert.deepEqual(files,files.slice().sort());
  for(const group of harness.classFileGroups)for(const relative of [group.source,...group.additionalSources])assert.ok(files.includes(path.join(root,relative)));
  for(const relative of ['ci/java_classfile_controlflow_contract_test.mjs','ci/java_classfile_controlflow_bytecode.mjs','ci/classfile_stackmaps_cases.mjs'])
    assert.ok(files.includes(path.join(root,relative)));
});
test('strict CLI rejects selectors, release substitutions and mandatory host waivers before execution',()=>{
  for(const flag of ['--browser','--native-only','--diagnostic'])assert.equal(harness.parseClassFileMode([flag]),flag.slice(2));
  for(const args of [[],['--node-only'],['--browser','--release','25'],['--native-only','--release','21'],
    ['--diagnostic','--group','selected'],['--browser','--case','selected'],['--browser','--skip-native']]){
    assert.throws(()=>harness.parseClassFileMode(args));
    const result=spawnSync(process.execPath,[path.join(root,'ci/java_classfile_controlflow_test.mjs'),...args],{cwd:root,encoding:'utf8',timeout:8000});
    assert.equal(result.error,undefined);assert.notEqual(result.status,0);assert.match(result.stderr,/Usage: node ci\/java_classfile_controlflow_test\.mjs/);
  }
});
test('C7b ledger writes use private files and cannot overwrite diagnostics or earlier C7a receipt',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'doppio-c7b-write-contract-'));
  try{const file=path.join(directory,'receipt.json');harness.writeClassFileLedger(file,harness.createClassFileLedger());
    assert.equal(fs.statSync(file).mode&0o777,0o600);const before=fs.readFileSync(file,'utf8');
    assert.throws(()=>harness.writeClassFileLedger(file,harness.createClassFileLedger('native-only')));
    assert.throws(()=>harness.writeClassFileLedger(file,earlier.createClassFileLedger()));assert.equal(fs.readFileSync(file,'utf8'),before);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
