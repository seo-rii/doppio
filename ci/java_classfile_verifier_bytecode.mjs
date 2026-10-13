import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {decodeClassFileEvidence,canonicalClassFileProof} from './java_classfile_declarations_bytecode.mjs';
import {verifierInputContract,verifierPhaseCases,verifierMessageRules} from './classfile_verifier_phase_cases.mjs';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const symbolic=value=>{
  if(Array.isArray(value))return value.map(symbolic);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
    .filter(([key])=>key!=='index').map(([key,item])=>[key,symbolic(item)]));
  return value;
};
const local=(instruction,kind)=>instruction?.name===kind?instruction.localIndex:
  instruction?.name?.startsWith(kind+'_')?Number(instruction.name.slice(kind.length+1)):null;

export function verifierInstructionDigest(instructions){return sha(JSON.stringify(canonicalClassFileProof(symbolic(instructions))));}
export function verifierBootstrapDigest(bootstraps){return sha(JSON.stringify(canonicalClassFileProof(symbolic(bootstraps))));}

/** Raw verifier inputs: fields, absent Code and invalid coordinates stay present. */
export function verifierArtifactProfile(decoded){
  const constants=new Map(decoded.constants.map(value=>[value.index,value]));
  const entry=index=>{const value=constants.get(index);assert.ok(value,'Actual own-packet constant');return symbolic(value);};
  const utf=index=>{const value=entry(index);assert.equal(value.tag,1);return value.value;};
  const attribute=(value,context)=>{
    const bytes=Buffer.from(value.bodyHex,'hex');let at=0;
    const u2=()=>{assert.ok(at+2<=bytes.length);const number=bytes.readUInt16BE(at);at+=2;return number;};
    let contents;
    if(value.name==='ConstantValue'){assert.equal(context,'field');contents=entry(u2());}
    else if(value.name==='LocalVariableTable'||value.name==='LocalVariableTypeTable'){
      const count=u2();contents=Array.from({length:count},()=>({start:u2(),length:u2(),name:utf(u2()),type:utf(u2()),slot:u2()}));
    }else if(value.name==='LineNumberTable'){
      const count=u2();contents=Array.from({length:count},()=>({start:u2(),line:u2()}));
    }else if(value.name==='PhaseParserCallback'||value.name==='PhaseParserNameCallback'){
      assert.equal(context,'class');assert.equal(bytes.length,0,'Exact original zero-payload custom callback attribute');contents=[];
    }else assert.fail('Unreviewed phase-input attribute '+context+':'+value.name);
    assert.equal(at,bytes.length,'Complete actual attribute vector, no ignored suffix');return {name:value.name,contents};
  };
  assert.deepEqual(decoded.bootstrapMethods,[],'Metadata packets are not compiler carriers');
  const methods=decoded.methods.map(method=>{
    const metadata=method.attributes.filter(value=>value.name!=='Code').map(value=>attribute(value,'method'));
    const result={name:method.name,descriptor:method.descriptor,flags:method.flags,metadata,code:null};
    if(method.instructions){
      assert.equal(method.attributes.filter(value=>value.name==='Code').length,1);
      const operations=method.instructions.map(instruction=>{
        const result={pc:instruction.pc,opcode:instruction.name,length:instruction.length};
        for(const key of ['modifiedOpcode','localIndex','increment','value','branchTarget','defaultTarget','keys','targets','dimensions','arrayType'])
          if(Object.hasOwn(instruction,key))result[key]=instruction[key];
        if(instruction.cp)result.constant=symbolic(instruction.cp);return result;
      });
      result.code={maxStack:method.maxStack,maxLocals:method.maxLocals,codeLength:method.codeLength,
        operations,handlers:method.handlers,attributes:method.codeAttributes.map(value=>attribute(value,'code'))};
    }else assert.equal(method.attributes.some(value=>value.name==='Code'),false);
    return result;
  });
  return canonicalClassFileProof({className:decoded.className,major:decoded.major,minor:decoded.minor,flags:decoded.flags,
    superclass:decoded.superclass,interfaces:decoded.interfaces,
    fields:decoded.fields.map(field=>({name:field.name,descriptor:field.descriptor,flags:field.flags,
      attributes:field.attributes.map(value=>attribute(value,'field'))})),
    methods,attributes:decoded.attributes.map(value=>attribute(value,'class'))});
}

export function inspectVerifierArtifactBytes(bytes,contract){
  const decoded=decodeClassFileEvidence(bytes),profile=verifierArtifactProfile(decoded);
  assert.deepEqual(profile,contract.profile,'Exact independent raw Code/CP/field/LVT/major/flags profile');
  assert.equal(contract.definition,'never-define','Every selected target is metadata only');
  return {decoded,profile};
}

function originalProof(classes){
  assert.deepEqual(classes.map(value=>value.className).sort(),verifierInputContract.driverClassNames.slice().sort());
  assert.equal(verifierInputContract.originalContracts.length,classes.length,'Final original helper contracts required');
  const proofs=[];
  for(const type of classes){
    const expected=verifierInputContract.originalContracts.find(value=>value.className===type.className);assert.ok(expected);
    assert.equal(type.major,69);assert.equal(type.minor,0);
    for(const key of ['flags','superclass','interfaces'])assert.deepEqual(type[key],expected[key]);
    assert.deepEqual(type.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})),expected.fields,'Actual original helper state fields');
    assert.equal(sha(JSON.stringify(type.attributes)),expected.attributeDigest,'Frozen genuine compiler class attributes');
    assert.deepEqual(type.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),
      expected.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),'Every named/constructor/synthetic original method');
    assert.equal(verifierBootstrapDigest(type.bootstrapMethods),expected.bootstrapDigest,'Real compiler lambda/concat recipes');
    for(const method of type.methods){
      const contract=expected.methods.find(value=>value.name===method.name&&value.descriptor===method.descriptor);
      if(method.instructions){
        assert.equal(verifierInstructionDigest(method.instructions),contract.instructionDigest,'Frozen helper/loop/lambda semantic Code');
        assert.ok(!method.instructions.some(instruction=>instruction.cp&&
          /^(?:defineClass|defineHiddenClass|ensureClassInitialized|initialize)$/.test(instruction.cp.name)),
          'Every original target-array recipe remains metadata only');
      }else assert.equal(contract.instructionDigest,null);
    }
    proofs.push({className:type.className,originalClassFile:type.classFile,bootstrapDigest:expected.bootstrapDigest,
      methods:expected.methods});
  }
  const owner=classes.find(value=>value.className===verifierInputContract.mainClass);
  const routes=verifierInputContract.arrayRoutes;assert.ok(Array.isArray(routes)&&routes.length>0,'Final actual held array/verification routes required');
  const arrayRoutes=routes.map(route=>{
    const method=owner.methods.find(value=>value.name===route.method&&value.descriptor===route.descriptor);assert.ok(method?.instructions);
    const instructions=method.instructions,selected=pc=>{const value=instructions.find(instruction=>instruction.pc===pc);assert.ok(value);return value;};
    if(route.byteArrayParameter!==undefined)assert.ok(!instructions.some(instruction=>local(instruction,'astore')===route.byteArrayParameter),'Held target byte[] parameter is never substituted');
    if(route.byteArrayLocal!==undefined){
      const stores=instructions.filter(instruction=>local(instruction,'astore')===route.byteArrayLocal);
      assert.equal(stores.length,1,'The selected loop has one original held byte[] store and no alias substitution');assert.equal(stores[0].pc,route.byteArrayStorePc);
    }
    const calls=route.calls.map(call=>{
      const instruction=selected(call.pc);assert.equal(instruction.cp?.owner,call.owner);assert.equal(instruction.cp?.name,call.name);assert.equal(instruction.cp?.descriptor,call.descriptor);
      if(call.byteArrayLoadPc!==undefined)assert.equal(local(selected(call.byteArrayLoadPc),'aload'),route.byteArrayParameter??route.byteArrayLocal);
      return instruction;
    });
    return {...route,codeSha256:method.codeSha256,calls};
  });
  for(const entry of verifierPhaseCases){
    assert.ok(owner.methods.some(method=>method.name===entry.sourceGroup&&method.descriptor===entry.sourceGroupDescriptor),
      'Case binds to an actual frozen grouped-loop recipe, never invented named case methods');
  }
  return {classes,helperProofs:proofs,arrayRoutes,
    generalInterproceduralDataFlowConformanceProven:false,compilerBytesTransformed:false,targetsNeverDefined:true};
}

export function proveVerifierInputs(directory,classFiles){return originalProof(classFiles.map(file=>
  decodeClassFileEvidence(fs.readFileSync(path.join(directory,file.path)),file)));}
export function assertVerifierInputProofs(proof,classFiles){
  assert.deepEqual(proof.classes.map(value=>value.classFile),classFiles);
  const classes=proof.classes.map(value=>{const bytes=Buffer.from(value.originalBytesBase64,'base64');
    assert.equal(bytes.toString('base64'),value.originalBytesBase64);return decodeClassFileEvidence(bytes,value.classFile);});
  assert.deepEqual(proof,originalProof(classes),'Independent replay from actual original69 bytes');
}

export function proveVerifierArtifact(bytes,contract,{host,caseId,inputProofs,classFiles}){
  assert.ok(['native','node','chromium'].includes(host));assertVerifierInputProofs(inputProofs,classFiles);
  const selected=verifierPhaseCases.find(value=>value.id===caseId);assert.ok(selected);
  assert.deepEqual(contract,selected.artifacts.find(value=>value.id===contract.id));
  const {decoded,profile}=inspectVerifierArtifactBytes(bytes,contract);
  return {caseId,artifactId:contract.id,host,definition:'never-define',size:bytes.length,sha256:sha(bytes),
    bytesBase64:bytes.toString('base64'),profile,rawConstantPool:decoded.constants,
    rawCode:decoded.methods.map(method=>({name:method.name,descriptor:method.descriptor,
      codeHex:method.codeHex??null,codeSha256:method.codeSha256??null,codeAttributes:method.codeAttributes??[]})),
    rawFields:decoded.fields,originalArrayRoutes:inputProofs.arrayRoutes,
    byteForByteNativeParityProven:false,fullVerifierConformanceProven:false};
}

export function classifyVerifierMessage(message,entry){
  assert.equal(typeof message,'string');assert.ok(message.length>0&&!/[\r\n]/.test(message));
  if(entry.initializationDebug){
    assert.ok(message==='Bytecode offset out of range; bci=4, codeLength=3'||message==='Debug label offset out of range',
      'Exact reviewed native/facade initialization-debug diagnostic');
    return 'initialization-debug';
  }
  if(entry.parserArgumentCallback){assert.equal(message,entry.parserArgumentMessage);return 'parser-IAE-singleton';}
  const matches=verifierMessageRules.filter(rule=>(rule.exact||[]).includes(message)||(rule.prefixes||[]).some(prefix=>message.startsWith(prefix)));
  assert.equal(matches.length,1,'Actual message matches one reviewed implementation diagnostic category');return matches[0].category;
}
