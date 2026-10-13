import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {decodeClassFileEvidence,canonicalClassFileProof} from './java_classfile_declarations_bytecode.mjs';
import {proveCoreGroup} from './java_core_bytecode.mjs';
import {classFileInputContracts,classFileArtifactContracts} from './classfile_structural_byte_contracts.mjs';
export {classFileInputContracts,classFileArtifactContracts} from './classfile_structural_byte_contracts.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),support='classes.modern_test.ClassFileSupport';
const lookup='java.lang.invoke.MethodHandles$Lookup',handle='java.lang.invoke.MethodHandle';
const local=(instruction,kind)=>instruction?.name===kind||instruction?.modifiedOpcode===kind?instruction.localIndex:
  instruction?.name?.startsWith(kind+'_')?Number(instruction.name.slice(kind.length+1)):null;
const cpValue=value=>{const {index,...result}=value;if(result.reference)result.reference=cpValue(result.reference);return result;};
export const structuralInstructionDigest=instructions=>sha(JSON.stringify(canonicalClassFileProof(instructions.map(value=>{
  const {cp,cpIndex,...instruction}=value;return cp?{...instruction,cp:cpValue(cp)}:instruction;
}))));

// Keep raw debug coordinates, including malformed operand/terminal positions.
// These are selected verifier INPUTS, not C7d3's valid boundary-normalized scopes.
export function structuralClassFileProfile(decoded) {
  const constants=new Map(decoded.constants.map(value=>[value.index,value]));
  const utf=index=>{const entry=constants.get(index);assert.equal(entry?.tag,1);return entry.value;};
  const debug=attribute=>{
    const bytes=Buffer.from(attribute.bodyHex,'hex');let at=0;
    const u2=()=>{assert.ok(at+2<=bytes.length);const value=bytes.readUInt16BE(at);at+=2;return value;};
    const u4=()=>{assert.ok(at+4<=bytes.length);const value=bytes.readUInt32BE(at);at+=4;return value;};
    const count=u2(),entries=[];
    for(let n=0;n<count;n++) {
      if(attribute.name==='LineNumberTable')entries.push({start:u2(),line:u2()});
      else if(['LocalVariableTable','LocalVariableTypeTable'].includes(attribute.name))
        entries.push({start:u2(),length:u2(),name:utf(u2()),type:utf(u2()),slot:u2()});
      else {assert.equal(attribute.name,'CharacterRangeTable','No opaque selected debug attribute');
        entries.push({start:u2(),endInclusive:u2(),characterStart:u4(),characterEnd:u4(),flags:u2()});}
    }
    assert.equal(at,bytes.length,'Every raw debug word consumed');return {name:attribute.name,entries};
  };
  const operation=instruction=>{
    const result={pc:instruction.pc,opcode:instruction.name,length:instruction.length};
    for(const key of ['modifiedOpcode','localIndex','increment','value','branchTarget','defaultTarget','keys','targets','dimensions','arrayType'])
      if(Object.hasOwn(instruction,key))result[key]=instruction[key];
    if(instruction.cp)result.constant=cpValue(instruction.cp);
    return result;
  };
  const code=method=>{
    const operations=[];
    for(const instruction of method.instructions) {
      const previous=operations.at(-1);
      if(instruction.name==='nop'&&previous?.opcode==='nop'&&previous.pc+previous.count===instruction.pc)previous.count++;
      else if(instruction.name==='nop')operations.push({pc:instruction.pc,opcode:'nop',count:1});
      else operations.push(operation(instruction));
    }
    return {codeLength:method.codeLength,maxStack:method.maxStack,maxLocals:method.maxLocals,operations,
      handlers:method.handlers,debug:method.codeAttributes.map(debug).sort((a,b)=>a.name.localeCompare(b.name))};
  };
  assert.deepEqual(decoded.attributes,[],'Selected outputs have no ignored class attributes');
  assert.deepEqual(decoded.fields,[],'Selected outputs have no hidden fields');
  assert.deepEqual(decoded.bootstrapMethods,[],'Generated outputs are not compiler carriers');
  return canonicalClassFileProof({className:decoded.className,major:decoded.major,minor:decoded.minor,flags:decoded.flags,
    superclass:decoded.superclass,interfaces:decoded.interfaces,fields:[],methods:decoded.methods.map(method=>{
      assert.deepEqual(method.attributes.map(value=>value.name),['Code'],'No ignored generated method metadata');
      return {name:method.name,descriptor:method.descriptor,flags:method.flags,...code(method)};
    })});
}

function originalMethod(classes,owner,name,descriptor) {
  const type=classes.find(value=>value.className===owner),method=type?.methods.find(value=>value.name===name&&value.descriptor===descriptor);
  assert.ok(method?.instructions,'Actual original method '+owner+'#'+name+descriptor);return {type,method};
}
function helperProof(classes,owner,contract) {
  const {type,method}=originalMethod(classes,owner,contract.name,contract.descriptor);
  assert.equal(method.flags,contract.flags);
  assert.equal(structuralInstructionDigest(method.instructions),contract.instructionDigest,'Exact selected original helper Code/operands and local binding');
  const bindings=type.bootstrapMethods.filter(value=>value.arguments.some(argument=>argument.tag===15&&
    argument.referenceKind===6&&argument.reference?.owner===owner&&argument.reference.name===contract.name&&argument.reference.descriptor===contract.descriptor));
  assert.equal(bindings.length>0,contract.bootstrap,'Exact original named helper/bootstrap binding');
  for(const binding of bindings)assert.equal(binding.method.reference?.owner,'java.lang.invoke.LambdaMetafactory');
  return {...contract,owner,originalClassFile:type.classFile,codeSha256:method.codeSha256,instructions:method.instructions,bootstrapBindings:bindings};
}
function mutationProof(classes,group) {
  if(group.id!=='classfile-structural-debug')return null;
  const {method}=originalMethod(classes,group.mainClass,'mutate','([BLjava/lang/String;III)[B');
  const instructions=method.instructions;
  const clones=instructions.filter(value=>value.cp?.owner==='[B'&&value.cp.name==='clone');
  assert.equal(clones.length,2,'Two original-array clones preserve input and create selected malformed output');
  assert.equal(instructions.filter(value=>value.name==='bastore').length,2,'Exactly one bounded u2 mutation, not a payload/header rewrite');
  const payload=instructions.find(value=>value.cp?.owner===group.mainClass&&value.cp.name==='payload');assert.ok(payload);
  assert.ok(instructions.some(value=>value.cp?.owner==='java.util.Arrays'&&value.cp.name==='equals'&&value.cp.descriptor==='([B[B)Z'));
  const requires=instructions.filter(value=>value.cp?.owner===group.mainClass&&value.cp.name==='require');assert.ok(requires.length>=3);
  const parser=originalMethod(classes,group.mainClass,'payload','([BLjava/lang/String;)I').method;
  assert.ok(parser.instructions.some(value=>value.cp?.tag===8&&value.cp.value==='Code'));
  assert.ok(parser.instructions.some(value=>value.cp?.owner===group.mainClass&&value.cp.name==='nextAttribute'));
  return {owner:group.mainClass,method:method.name,codeSha256:method.codeSha256,instructions,
    payloadCodeSha256:parser.codeSha256,cloneCount:2,byteStores:2,sourceArrayUnchangedCheck:true,
    generalMutationDataFlowConformanceProven:false};
}
function invocationHelper(classes,group) {
  const contract=classFileInputContracts[group.id].invocationHelper;
  const {type,method}=originalMethod(classes,group.mainClass,contract.name,contract.descriptor);
  const instructions=method.instructions;
  const definition=instructions.findIndex(value=>value.cp?.owner===lookup&&value.cp.name==='defineClass');
  let classLocal;
  if(contract.byteArrayParameter!==undefined) {
    assert.ok(definition>=0);assert.equal(local(instructions[definition-1],'aload'),contract.byteArrayParameter);
    classLocal=local(instructions[definition+1],'astore');assert.notEqual(classLocal,null);
  } else {assert.equal(definition,-1);classLocal=contract.classParameter;}
  assert.ok(!instructions.some(value=>local(value,'astore')===classLocal &&
    !(contract.byteArrayParameter!==undefined&&value.pc===instructions[definition+1].pc)),'Held defined class parameter/local is never substituted');
  const held=contract.routes.map(route=>{
    const find=pc=>{const value=instructions.find(instruction=>instruction.pc===pc);assert.ok(value);return value;};
    const call=find(route.lookupPc),store=find(route.storePc),classLoad=find(route.classArgumentPc);
    assert.equal(call.cp?.owner,lookup);assert.equal(call.cp?.name,route.lookupName);
    assert.equal(local(classLoad,'aload'),classLocal,'Actual class argument in this fixed lookup recipe');
    assert.equal(local(store,'astore'),route.handleLocal);
    const at=instructions.indexOf(store);
    assert.ok(!instructions.slice(at+1).some(value=>local(value,'astore')===route.handleLocal),'Held method handle is not replaced');
    const invocations=route.invocations.map(selected=>{
      const invocation=find(selected.pc),receiver=find(selected.receiverPc);
      assert.equal(invocation.cp?.owner,handle);assert.ok(['invoke','invokeExact'].includes(invocation.cp?.name));
      assert.equal(local(receiver,'aload'),route.handleLocal,'This invocation receives this held MethodHandle');
      assert.ok(receiver.pc>store.pc&&receiver.pc<invocation.pc);return invocation;
    });
    const adaptations=instructions.filter(value=>value.pc>call.pc&&value.pc<store.pc&&value.cp?.owner===handle);
    assert.deepEqual(adaptations.map(value=>[value.cp.name,value.cp.descriptor]),route.adaptations,
      'Exact selected adapter chain, never arbitrary later astore/handle substitution');
    return {lookup:call,classArgument:classLoad,store,handleLocal:route.handleLocal,adaptations,invocations};
  });
  assert.ok(held.length,'Actual MethodHandle lookup/invoke route from selected own class');
  return {...contract,originalClassFile:type.classFile,codeSha256:method.codeSha256,instructions,
    definition:definition<0?null:instructions[definition],classLocal,heldMethodRoutes:held,
    fullInterproceduralDataFlowConformanceProven:false};
}
function returnedArrayRoute(entry,group,classes,contract,invoke) {
  const {type,method}=originalMethod(classes,group.mainClass,entry.entryMethod,entry.entryDescriptor),instructions=method.instructions;
  const transportOwner=group.id==='classfile-structural-debug'?group.mainClass:support;
  const transportName=group.id==='classfile-structural-debug'?'output':'artifact';
  const transports=instructions.map((value,index)=>({value,index})).filter(({value,index})=>value.cp?.owner===transportOwner&&
    value.cp.name===transportName&&value.cp.descriptor==='(Ljava/lang/String;Ljava/lang/String;[B)V'&&
    instructions[index-2]?.cp?.tag===8&&instructions[index-2].cp.value===contract.id);
  assert.equal(transports.length,1,'Exact original artifact literal');const {value:transport,index}=transports[0];
  const arrayLocal=local(instructions[index-1],'aload');assert.notEqual(arrayLocal,null);
  const stores=instructions.map((value,index)=>({value,index})).filter(({value,index:n})=>n<index&&local(value,'astore')===arrayLocal);
  assert.equal(stores.length,1,'Actual selected byte array held without substitution');const producer=instructions[stores[0].index-1];
  assert.equal(instructions.filter(value=>local(value,'astore')===arrayLocal).length,1,'Selected array local stays held before AND after artifact transport');
  assert.ok(producer.cp?.descriptor.endsWith('[B'),'Array comes from a real original producer invocation');
  assert.ok(producer.cp.owner==='java.lang.classfile.ClassFile'||producer.cp.owner===group.mainClass);
  assert.equal(producer.cp.name,contract.originMethod,'Independently selected public/helper array origin');
  assert.ok(!instructions.some(value=>value.name==='bastore'),'Original caller never rewrites held bytes or compiler headers');
  const definitions=instructions.map((value,index)=>({value,index})).filter(({value,index:n})=>n>index&&
    ((value.cp?.owner===lookup&&value.cp.name==='defineClass')||
      (value.cp?.owner===group.mainClass+'$Loader'&&value.cp.name==='define')||
      (value.cp?.owner===group.mainClass&&value.cp.name==='invoke'&&invoke.byteArrayParameter!==undefined))&&
    local(instructions[n-1],'aload')===arrayLocal);
  let definition=null,generatedClassLocal=null,invocation=null;
  if(contract.definition==='never-define') {
    assert.deepEqual(definitions,[],'Malformed/unsafe selected bytes are NEVER defined even when library verification accepts');
    const eligibleLocals=classFileArtifactContracts[entry.id].filter(value=>value.definition==='define-and-invoke').map(sibling=>{
      const transport=instructions.findIndex((value,n)=>value.cp?.owner===transportOwner&&value.cp.name===transportName&&
        instructions[n-2]?.cp?.value===sibling.id);assert.ok(transport>=0);return local(instructions[transport-1],'aload');
    });
    for(const [n,value]of instructions.entries())if(value.cp?.name==='defineClass'||
      value.cp?.owner===group.mainClass+'$Loader'&&value.cp.name==='define'||
      value.cp?.owner===group.mainClass&&value.cp.name===invoke.name) {
      assert.ok(eligibleLocals.includes(local(instructions[n-1],'aload')),
        'Every definition/invocation anywhere in this fixed case is bound to an explicitly eligible sibling, never a malformed alias');
    }
  } else {
    assert.equal(contract.definition,'define-and-invoke');assert.equal(definitions.length,1);
    const selected=definitions[0];definition=selected.value;
    if(invoke.byteArrayParameter!==undefined)invocation=selected.value;
    else {
      generatedClassLocal=local(instructions[selected.index+1],'astore');assert.notEqual(generatedClassLocal,null);
      const calls=instructions.map((value,index)=>({value,index})).filter(({value,index:n})=>n>selected.index&&
        value.cp?.owner===group.mainClass&&value.cp.name===invoke.name&&value.cp.descriptor===invoke.descriptor&&
        local(instructions[n-(group.id==='classfile-structural-special'?2:1)],'aload')===generatedClassLocal);
      assert.equal(calls.length,1,'Case actually passes own definition result into selected invocation helper');invocation=calls[0].value;
      assert.ok(!instructions.slice(selected.index+2,calls[0].index).some(value=>local(value,'astore')===generatedClassLocal),
        'Defined class local stays held from this definition through this invocation; earlier disjoint-slot reuse is not substitution');
    }
  }
  return {caseId:entry.id,artifactId:contract.id,originalClassFile:type.classFile,originalCaseCodeSha256:method.codeSha256,
    arrayLocal,producer,transport,definition,generatedClassLocal,invocation,
    definitionDisposition:contract.definition,sameLocalStaticBindingProven:true,generalDataFlowConformanceProven:false};
}

function inputProof(group,classes) {
  const contract=classFileInputContracts[group.id];assert.ok(contract);
  assert.deepEqual(classes.map(value=>value.className).sort(),contract.driverClassNames.slice().sort(),'Every natural original compiler row');
  for(const type of classes) {
    const expected=contract.driverContracts.find(value=>value.className===type.className);assert.ok(expected);
    assert.equal(type.major,69);assert.equal(type.minor,0);
    for(const key of ['flags','superclass','interfaces'])assert.deepEqual(type[key],expected[key]);
  }
  const owner=classes.find(value=>value.className===group.mainClass);
  assert.deepEqual(owner.methods.filter(value=>value.name!=='main'&&!value.name.startsWith('case')&&!value.name.startsWith('<'))
    .map(({name,descriptor,flags})=>({name,descriptor,flags})),contract.callbacks.map(({name,descriptor,flags})=>({name,descriptor,flags})),
  'Every named original helper, including explicit validators and mutation parser');
  const callbackProofs=contract.callbacks.map(value=>helperProof(classes,group.mainClass,value));
  const helperMethodProofs=contract.helperMethods.map(value=>helperProof(classes,value.owner,value));
  const invoker=invocationHelper(classes,group);
  const utility=originalMethod(classes,support,'artifact','(Ljava/lang/String;Ljava/lang/String;[B)V').method;
  const encoded=utility.instructions.findIndex(value=>value.cp?.owner==='java.util.Base64$Encoder'&&value.cp.name==='encodeToString');
  assert.ok(encoded>0);assert.equal(local(utility.instructions[encoded-1],'aload'),2,'Actual host bytes transported, not a substituted native packet');
  const map=new Map(classes.map(value=>[value.className,{file:value.classFile,
    methods:new Map(value.methods.filter(method=>method.instructions).map(method=>[method.name+method.descriptor,method]))}]));
  for(const entry of group.cases) {
    const method=originalMethod(classes,group.mainClass,entry.entryMethod,entry.entryDescriptor).method;
    assert.equal(structuralInstructionDigest(method.instructions),contract.caseContracts.find(value=>value.name===entry.entryMethod).instructionDigest,
      'Fixed original case Code and exact helper/array argument bindings, including forbidden call graph');
  }
  const caseProofs=proveCoreGroup(group,map);
  const main=originalMethod(classes,group.mainClass,'main','([Ljava/lang/String;)V').method;
  assert.deepEqual(main.instructions.filter(value=>value.cp?.owner===group.mainClass&&value.cp.name.startsWith('case')).map(value=>value.cp.name),group.cases.map(value=>value.entryMethod));
  assert.ok(main.instructions.some(value=>value.cp?.tag===8&&value.cp.value===contract.markerLiteral||value.cp?.tag===18&&
    owner.bootstrapMethods[value.cp.bootstrapIndex]?.arguments.some(argument=>argument.tag===8&&argument.value.startsWith(contract.markerLiteral))),
  'Actual original completion literal, including the genuine javac25 concat recipe');
  const returnedArrayRoutes=group.cases.flatMap(entry=>classFileArtifactContracts[entry.id].map(value=>returnedArrayRoute(entry,group,classes,value,invoker)));
  const apiOnlyRoutes=group.cases.filter(entry=>classFileArtifactContracts[entry.id].length===0).map(entry=>{
    const method=originalMethod(classes,group.mainClass,entry.entryMethod,entry.entryDescriptor).method;
    assert.ok(!method.instructions.some(value=>value.cp?.owner===support&&value.cp.name==='artifact'));
    assert.ok(!method.instructions.some(value=>value.cp?.owner===lookup&&value.cp.name==='defineClass'));
    return {caseId:entry.id,codeSha256:method.codeSha256,transportedArtifacts:0,definitions:0};
  });
  return canonicalClassFileProof({schemaVersion:1,group:group.id,classes,callbackProofs,helperMethodProofs,caseProofs,
    invocationHelper:invoker,mutationHelper:mutationProof(classes,group),returnedArrayRoutes,apiOnlyRoutes,
    compilerBytesTransformed:false,generatedArtifactsAreCompilerInputs:false,
    dynamicBranchCoverageProven:false,fullSourceUnitConformanceProven:false,fullPublicClassFileApiConformanceProven:false});
}
export function proveClassFileInputGroup(group,directory,classFiles) {
  return inputProof(group,classFiles.map(file=>decodeClassFileEvidence(fs.readFileSync(path.join(directory,file.path)),file)));
}
export function assertClassFileInputProofs(record,group) {
  assert.equal(record.release,25);assert.deepEqual(record.inputProofs.classes.map(value=>value.classFile),record.classFiles);
  const classes=record.inputProofs.classes.map(value=>{
    const bytes=Buffer.from(value.originalBytesBase64,'base64');assert.equal(bytes.toString('base64'),value.originalBytesBase64);
    return decodeClassFileEvidence(bytes,value.classFile);
  });
  assert.deepEqual(record.inputProofs,inputProof(group,classes),'Replay complete actual original Code and helper-expanded own-array routes');
}
export function inspectClassFileArtifactBytes(bytes,contract) {
  const decoded=decodeClassFileEvidence(bytes),profile=structuralClassFileProfile(decoded);
  assert.deepEqual(profile,contract.profile,'Every actual Code operand, version, counter and raw debug coordinate matches the fixed selected profile');
  return {decoded,profile};
}
export function proveClassFileArtifact(bytes,contract,{host,caseId,record}) {
  assert.ok(['native','node','chromium'].includes(host));assert.deepEqual(contract,classFileArtifactContracts[caseId].find(value=>value.id===contract.id));
  const {decoded,profile}=inspectClassFileArtifactBytes(bytes,contract);
  assertClassFileInputProofs(record,{...classFileInputContracts[record.group],id:record.group,cases:record.cases});
  const route=record.inputProofs.returnedArrayRoutes.find(value=>value.caseId===caseId&&value.artifactId===contract.id);assert.ok(route);
  return {caseId,artifactId:contract.id,host,bytesBase64:bytes.toString('base64'),size:bytes.length,sha256:sha(bytes),
    profile,sourceRoute:route,verification:contract.verification,definitionDisposition:contract.definition,
    originalThisClassIndex:decoded.originalThisClassIndex,byteForByteNativeParityProven:false,
    fullVerifierConformanceProven:false,generalDataFlowConformanceProven:false};
}
