import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode,proveCoreGroup} from './java_core_bytecode.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),prefix='classes.modern_test.',support=prefix+'ClassFileSupport';
// JSON otherwise turns NaN/infinities into null and negative zero into zero.
// Preserve these decoded values explicitly; original class bytes and their
// hashes continue to bind the exact floating-point bit patterns.
export function canonicalClassFileProof(value) {
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0)))
    return {numericValue: Object.is(value, -0) ? '-0' : String(value)};
  if (Array.isArray(value)) return value.map(canonicalClassFileProof);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, canonicalClassFileProof(item)]));
  return value;
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const cb=(name,descriptor,bootstrap=true)=>({name,descriptor,flags:10,bootstrap});
const classBuilder='(Ljava/lang/classfile/ClassBuilder;)V',codeBuilder='(Ljava/lang/classfile/CodeBuilder;)V';
const classTransform='(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V';
const codeTransform='(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V';
const input=(name,marker,callbacks,{additional=[],resource=null,codecs=[]}={})=>({
  source:'classes/modern_fixture/'+name+'.java',mainClass:prefix+name,completionMarker:marker,
  additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames:[prefix+name,...additional.map(x=>prefix+x),support],resourceClassNames:[],
  javacFlags:['-g'],resource,codecs,callbacks
});
const pairs=(builders,codes)=>[...builders.map(name=>cb('build'+name,classBuilder)),...codes.map(name=>cb('code'+name,codeBuilder))];
export const classFileInputContracts=freeze({
  'classfile-debug-model':input('ClassFileDebugModelFinal','CLASSFILE_DEBUG_MODEL_OK',[
    ...pairs(['Line','Local','Generic','Character','Source','All'],['Line','Local','Generic','Character','Value','All']),
    cb('flags',classBuilder,false)
  ]),
  'classfile-debug-remap':input('ClassFileDebugRemapFinal','CLASSFILE_DEBUG_REMAP_OK',[
    cb('model','(Ljava/lang/classfile/ClassFile;)Ljava/lang/classfile/ClassModel;',false),
    cb('insertBeforeBranches',codeTransform),cb('copyElement',classTransform),cb('widen',classTransform),
    cb('buildCharacter',classBuilder),cb('codeCharacter',codeBuilder),cb('insertBeforeInstructions',codeTransform),
    cb('lines','(Ljava/lang/classfile/CodeModel;)I',false),cb('locals','(Ljava/lang/classfile/CodeModel;)I',false)
  ],{additional:['ClassFileDebugTarget'],resource:{method:'model',descriptor:'(Ljava/lang/classfile/ClassFile;)Ljava/lang/classfile/ClassModel;',
    name:'ClassFileDebugTarget.class',target:prefix+'ClassFileDebugTarget'}}),
  'classfile-debug-lifecycle':input('ClassFileDebugLifecycleFinal','CLASSFILE_DEBUG_LIFECYCLE_OK',[
    cb('mapper','(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/AttributeMapper;'),
    cb('customApi','()Ljava/lang/classfile/ClassFile;',false),cb('flags',classBuilder,false),
    cb('ownerAttribute','(Ljava/lang/classfile/AttributedElement;)Lclasses/modern_test/ClassFileDebugLifecycleFinal$ProbeAttribute;',false),
    cb('buildScopes',classBuilder),cb('fieldScope','(Ljava/lang/classfile/FieldBuilder;)V'),
    cb('methodScope','(Ljava/lang/classfile/MethodBuilder;)V'),cb('codeScope',codeBuilder),
    cb('buildOne',classBuilder),cb('codeValue',codeBuilder),cb('copy',classTransform),
    ...pairs(['ManualBranch','ManualWide','ManualDead','ManualInvalid'],['ManualBranch','ManualWide','ManualDead','ManualInvalid'])
  ],{additional:['ClassFileDebugLifecycleFinal$ProbeAttribute','ClassFileDebugLifecycleFinal$ProbeMapper'],
    codecs:[
      {owner:prefix+'ClassFileDebugLifecycleFinal$ProbeMapper',name:'readAttribute',descriptor:'(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)Lclasses/modern_test/ClassFileDebugLifecycleFinal$ProbeAttribute;',flags:1},
      {owner:prefix+'ClassFileDebugLifecycleFinal$ProbeMapper',name:'writeAttribute',descriptor:'(Ljava/lang/classfile/BufWriter;Lclasses/modern_test/ClassFileDebugLifecycleFinal$ProbeAttribute;)V',flags:1}
    ]})
});
const nativeOpcode=op=>{
  const local=op.match(/^([ailfd](?:load|store)):(\d+)$/);if(local)return Number(local[2])<=3?local[1]+'_'+local[2]:local[1];
  if(op.startsWith('int:')){const n=Number(op.slice(4));return n>=-1&&n<=5?n===-1?'iconst_m1':'iconst_'+n:n>=-128&&n<=127?'bipush':n>=-32768&&n<=32767?'sipush':'ldc';}
  if(op.startsWith('string:'))return 'ldc';return op.split(':')[0];
};
const method=(name,descriptor,code,{flags=9,maxStack=1,maxLocals=0,frames=[],handlers=[],opcodes=null,metadata={},debug={}}={})=>({
  name,descriptor,flags,code,nativeOpcodes:opcodes||code.map(nativeOpcode),maxStack,maxLocals,frames,handlers,metadata,debug
});
const generated=(id,name,methods,{flags=33,fields=[],definition='define-and-invoke',origin='public-build',metadata={}}={})=>({
  id,className:prefix+name,origin,flags,interfaces:[],fields,methods,sourceFile:metadata.SourceFile||null,definition,metadata,bootstraps:[],extra:{},
  branches:methods.some(m=>m.code.some(op=>/^(?:if|goto)/.test(op))),handlers:methods.some(m=>m.handlers.length>0)
});
const line=line=>({LineNumberTable:[{target:0,line}]}),I='INTEGER',J='LONG',O=name=>'Object:'+name;
const local=(name,type,end)=>({start:0,end,name,type,slot:0});
const generic=(name,end)=>({start:0,end,name,signature:'Ljava/util/List<Ljava/lang/String;>;',slot:0});
const character=(end,characterStart,characterEnd,flags)=>({start:0,end,characterStart,characterEnd,flags});
const scope=(name,type,end,lineNumber)=>({...line(lineNumber),LocalVariableTable:[local(name,type,end)]});
const intValue=(value,debug={})=>method('value','()I',['int:'+value,'ireturn'],{debug});
const argValue=debug=>method('value','(I)I',['iload:0','ireturn'],{maxLocals:1,debug});
const allDebug={...scope('value','I',2,10),CharacterRangeTable:[character(2,100,200,1)]};
const sourceFile='ClassFileDebugRemapFinal.java';
const originalMethods=({drop=false,insert=false,wide=false}={})=>[
  method('<init>','()V',['aload:0','invokespecial:java.lang.Object#<init>()V','return'],{flags:0,maxLocals:1,
    debug:drop?{}:scope('this','Lclasses/modern_test/ClassFileDebugTarget;',3,77)}),
  method('choose','(I)Ljava/lang/String;',insert?['iload:0','nop','ifne:6','string:zero','nop','goto:7','string:kept','areturn']:
    ['iload:0','ifne:4','string:zero','goto:5','string:kept','areturn'],{
      maxLocals:1,frames:[{target:insert?6:4,locals:[I],stack:[]},{target:insert?7:5,locals:[I],stack:[O('java.lang.String')]}],
      debug:drop?{}:scope('flag','I',insert?8:6,78),
      opcodes:wide?['iload_0','ifne','ldc_w','goto','ldc_w','areturn']:null}),
  method('identity','(Ljava/util/List;)Ljava/lang/Object;',['aload:0','areturn'],{
    maxLocals:1,metadata:{Signature:'(Ljava/util/List<Ljava/lang/String;>;)Ljava/lang/Object;'},
    debug:drop?{}:{...scope('input','Ljava/util/List;',2,79),LocalVariableTypeTable:[generic('input',2)]}})
];
const remap=(id,name,options={})=>generated(id,name,originalMethods(options),{flags:48,origin:'public-transform',metadata:{SourceFile:sourceFile}});
const custom=(value,reference)=>({D3Lifecycle:{value,reference:{tag:8,value:reference}}});
const ownerOutput=(id,name,origin='public-build')=>generated(id,name,[method('value','()I',['int:17','ireturn'],{
  metadata:custom(43,'method'),debug:custom(44,'code')
})],{origin,fields:[{name:'number',descriptor:'I',flags:25,metadata:{ConstantValue:{tag:3,value:3},...custom(42,'field')}}],metadata:custom(41,'class')});
const branch=(locals=[I])=>method('value','(I)I',['iload:0','ifeq:4','int:1','ireturn','int:2','ireturn'],{
  maxLocals:1,frames:[{target:4,locals,stack:[]}]});
export const classFileResourceContract=freeze(generated('original-debug-target','ClassFileDebugTarget',originalMethods(),{
  flags:48,origin:'unchanged-compiler-resource',definition:'compiler-resource-only',metadata:{SourceFile:sourceFile}
}));
export const classFileArtifactContracts=freeze({
  'cf-debug-line':[generated('debug-line','C7dDebugLine',[intValue(42,line(11))])],
  'cf-debug-local':[generated('debug-local','C7dDebugLocal',[argValue({LocalVariableTable:[local('value','I',2)]})])],
  'cf-debug-generic-local':[generated('debug-generic','C7dDebugGeneric',[method('value','(Ljava/util/List;)Ljava/lang/Object;',[
    'aload:0','areturn'],{maxLocals:1,debug:{LocalVariableTable:[local('items','Ljava/util/List;',2)],LocalVariableTypeTable:[generic('items',2)]}})])],
  'cf-debug-character':[generated('debug-character','C7dDebugCharacter',[argValue({CharacterRangeTable:[character(2,2049,3081,3)]})])],
  'cf-debug-source-extension':[generated('debug-source','C7dDebugSource',[intValue(17)],{
    metadata:{SourceDebugExtension:'SMAP\nDebug.java\nJava\n*S Java\n*F\n1 Debug.java\n*L\n1#1:1\n*E\n'}})],
  'cf-debug-drop-line':[generated('debug-drop-line','C7dDebugDropLine',[argValue(allDebug)])],
  'cf-debug-drop-debug':[generated('debug-drop-debug','C7dDebugDropDebug',[argValue(line(10))])],
  'cf-debug-drop-both':[generated('debug-drop-both','C7dDebugDropBoth',[argValue(line(10))])],
  'cf-remap-original-debug':[],
  'cf-remap-debug-identity':[remap('remap-identity','C7dDebugIdentity')],
  'cf-remap-debug-insertion':[remap('remap-insert','C7dDebugInserted',{insert:true})],
  'cf-remap-debug-fresh':[remap('remap-fresh','C7dDebugFresh')],
  'cf-remap-debug-widen':[remap('remap-widen','C7dDebugWide',{wide:true})],
  'cf-remap-debug-drop':[remap('remap-drop','C7dDebugDropped',{drop:true})],
  'cf-remap-character-scope':[generated('remap-character','C7dCharacterMoved',[method('value','(I)I',[
    'nop','iload:0','nop','ireturn'],{maxLocals:1,debug:{...scope('input','I',4,100),CharacterRangeTable:[character(4,1000,2000,1)]}})],{origin:'public-transform'})],
  'cf-remap-debug-options':[remap('remap-options','C7dDebugOptions')],
  'cf-lifecycle-deferred-owner':[ownerOutput('lifecycle-owner','C7dDeferredOwners')],
  'cf-lifecycle-fresh-reference':[ownerOutput('lifecycle-fresh','C7dLifecycleFresh','public-transform')],
  'cf-lifecycle-read-exception':[],
  'cf-lifecycle-write-exception':[],
  'cf-lifecycle-manual-branch':[generated('manual-branch','C7dManualBranch',[branch()])],
  'cf-lifecycle-manual-wide':[generated('manual-wide','C7dManualWide',[method('value','(IJJ)J',[
    'iload:0','ifeq:4','lload:1','goto:5','lload:3','lreturn'],{maxStack:2,maxLocals:5,frames:[
      {target:4,locals:[I,J,J],stack:[]},{target:5,locals:[I,J,J],stack:[J]}]})])],
  'cf-lifecycle-manual-dead':[generated('manual-dead','C7dManualDead',[method('value','()I',[
    'int:7','ireturn','int:3','ireturn'],{frames:[{target:2,locals:[],stack:[]}]})])],
  'cf-lifecycle-manual-invalid':[generated('manual-invalid','C7dManualInvalid',[branch(['FLOAT'])],{definition:'forbidden'})]
});
function decodeClass(bytes, file = null) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 10 && bytes.length <= 256 * 1024, 'Bounded complete class bytes');
  const layout = readStructureLayout(bytes), pool = layout.pool;
  const utf = index => {assert.equal(pool[index]?.tag, 1); return pool[index].value;};
  const cls = index => {assert.equal(pool[index]?.tag, 7); return utf(pool[index].first).replaceAll('/', '.');};
  const constant = index => {
    const entry = pool[index]; assert.ok(entry);
    const item = {index, tag: entry.tag};
    if (entry.tag === 1) item.value = entry.value;
    else if (entry.tag === 7) item.value = cls(index);
    else if (entry.tag === 8) item.value = utf(entry.first);
    else if (entry.tag === 3) item.value = bytes.readInt32BE(entry.start + 1);
    else if (entry.tag === 4) item.value = bytes.readFloatBE(entry.start + 1);
    else if (entry.tag === 5) item.value = bytes.readBigInt64BE(entry.start + 1).toString();
    else if (entry.tag === 6) item.value = bytes.readDoubleBE(entry.start + 1);
    else if (entry.tag === 16) item.descriptor = utf(entry.first);
    else if ([9, 10, 11].includes(entry.tag)) {
      const nt = pool[entry.second]; assert.equal(nt?.tag, 12);
      Object.assign(item, {owner: cls(entry.first), name: utf(nt.first), descriptor: utf(nt.second)});
    } else if (entry.tag === 15) {
      item.referenceKind = bytes[entry.start + 1]; item.reference = constant(bytes.readUInt16BE(entry.start + 2));
    } else if ([17, 18].includes(entry.tag)) {
      const nt = pool[entry.second]; assert.equal(nt?.tag, 12);
      Object.assign(item, {bootstrapIndex: entry.first, name: utf(nt.first), descriptor: utf(nt.second)});
    }
    return item;
  };
  const attrs = entries => entries.map(attr => ({name: attr.name, length: attr.length,
    bodyHex: bytes.subarray(attr.body, attr.end).toString('hex')}));
  const methods = layout.methods.entries.map(method => {
    const item = {name: method.name, descriptor: method.descriptor, flags: method.flags, attributes: attrs(method.attributes.entries)};
    if (method.code) {
      const code = method.code, raw = bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength);
      const handlers = [];
      for (let n = 0; n < code.handlerCount; n++) {
        const at = code.handlersOffset + n * 8, catchIndex = bytes.readUInt16BE(at + 6);
        handlers.push({start: bytes.readUInt16BE(at), end: bytes.readUInt16BE(at + 2), target: bytes.readUInt16BE(at + 4),
          catchType: catchIndex ? cls(catchIndex) : null});
      }
      Object.assign(item, {codeHex: raw.toString('hex'), codeSha256: sha(raw), codeLength: raw.length,
        maxStack: code.maxStack, maxLocals: code.maxLocals, instructions: decodeCoreCode(raw, pool, bytes), handlers,
        codeAttributes: attrs(code.attributes.entries)});
      item.stackMapFrames = decodeStackMaps(item, cls(layout.thisClass), constant);
    }
    return item;
  });
  const bootstrapMethods = [];
  const attribute = layout.attributes.entries.find(attr => attr.name === 'BootstrapMethods');
  if (attribute) {
    let at = attribute.body;
    const u2 = () => {assert.ok(at + 2 <= attribute.end); const value = bytes.readUInt16BE(at); at += 2; return value;};
    const count = u2();
    for (let n = 0; n < count; n++) {
      const method = constant(u2()); assert.equal(method.tag, 15); const length = u2(), args = [];
      for (let p = 0; p < length; p++) args.push(constant(u2()));
      bootstrapMethods.push({index: n, method, arguments: args});
    }
    assert.equal(at, attribute.end);
  }
  const className = cls(layout.thisClass);
  if (file) {
    assert.equal(file.path, className.replaceAll('.', '/') + '.class'); assert.equal(file.sha256, sha(bytes)); assert.equal(file.size, bytes.length);
    assert.equal(file.major, bytes.readUInt16BE(6)); assert.equal(file.minor, bytes.readUInt16BE(4));
  }
  return {className, classFile: file, size: bytes.length, sha256: sha(bytes), originalBytesBase64: bytes.toString('base64'),
    major: bytes.readUInt16BE(6), minor: bytes.readUInt16BE(4), flags: layout.flags, originalThisClassIndex: layout.thisClass,
    superclass: bytes.readUInt16BE(layout.superClassOffset) ? cls(bytes.readUInt16BE(layout.superClassOffset)) : null,
    interfaces: Array.from({length: layout.interfaceCount}, (_, n) => cls(bytes.readUInt16BE(layout.interfacesOffset + n * 2))),
    fields: layout.fields.entries.map(field => ({name: field.name, descriptor: field.descriptor, flags: field.flags, attributes: attrs(field.attributes.entries)})),
    methods, attributes: attrs(layout.attributes.entries), bootstrapMethods,
    constants: pool.filter(Boolean).map(entry => constant(entry.index))};
}

function localIndex(instruction, kind) {
  if (instruction.name === kind || instruction.modifiedOpcode === kind) return instruction.localIndex;
  const match = instruction.name.match(new RegExp('^' + kind + '_([0-3])$')); return match ? Number(match[1]) : null;
}

function canonicalOperation(instruction) {
  const name = instruction.name;
  for (const kind of ['iload', 'lload', 'fload', 'dload', 'aload', 'istore', 'lstore', 'fstore', 'dstore', 'astore']) {
    const index = localIndex(instruction, kind); if (index !== null) return kind + ':' + index;
  }
  if (/^iconst_(?:m1|[0-5])$/.test(name)) return 'int:' + (name === 'iconst_m1' ? -1 : Number(name.at(-1)));
  if (['bipush', 'sipush'].includes(name)) return 'int:' + instruction.value;
  if (/^[lfd]const_[0-2]$/.test(name)) return ({l: 'long', f: 'float', d: 'double'})[name[0]] + ':' + name.at(-1);
  if (['ldc', 'ldc_w', 'ldc2_w'].includes(name)) {
    if(instruction.cp?.tag===7)return 'class:'+instruction.cp.value;
    if(instruction.cp?.tag===15)return 'handle:'+instruction.cp.referenceKind+':'+instruction.cp.reference.owner+'#'+instruction.cp.reference.name+instruction.cp.reference.descriptor;
    if(instruction.cp?.tag===16)return 'type:'+instruction.cp.descriptor;
    if(instruction.cp?.tag===17)return 'condy:'+instruction.cp.name+':'+instruction.cp.descriptor+'@'+instruction.cp.bootstrapIndex;
    const type = {3: 'int', 4: 'float', 5: 'long', 6: 'double', 8: 'string'}[instruction.cp?.tag];
    assert.ok(type, 'Selected literal constant category'); return type + ':' + instruction.cp.value;
  }
  if(name==='newarray')return 'newarray:'+instruction.arrayType;
  if(name==='iinc'||instruction.modifiedOpcode==='iinc')return 'iinc:'+instruction.localIndex+','+instruction.increment;
  if(instruction.cp?.tag===7)return name+':'+instruction.cp.value+(name==='multianewarray'?'#'+instruction.dimensions:'');
  if(instruction.name==='invokedynamic'){assert.equal(instruction.cp?.tag,18);return 'invokedynamic:'+instruction.cp.name+instruction.cp.descriptor+'@'+instruction.cp.bootstrapIndex;}
  if (instruction.cp && [9, 10, 11].includes(instruction.cp.tag))
    return name + ':' + instruction.cp.owner + '#' + instruction.cp.name + instruction.cp.descriptor;
  assert.ok(!instruction.cp, 'No ignored generated symbolic operand'); return name;
}

function returnedArrayRoute(entry, group, classes, contract) {
  const owner = classes.find(item => item.className === group.mainClass);
  const body = owner.methods.find(method => method.name === entry.entryMethod && method.descriptor === entry.entryDescriptor);
  assert.ok(body?.instructions);
  const instructions = body.instructions;
  const producers = instructions.filter(ins => ins.cp?.owner === 'java.lang.classfile.ClassFile' &&
    ins.cp.name === (contract.origin === 'public-transform' ? 'transformClass' : 'build') && ins.cp.descriptor.endsWith('[B'));
  assert.equal(producers.length, 1, 'One selected public returned-byte producer in the original case');
  const producerIndex = instructions.indexOf(producers[0]), store = instructions[producerIndex + 1];
  const byteArrayLocal = localIndex(store, 'astore'); assert.notEqual(byteArrayLocal, null, 'Actual returned array stored in a local');
  assert.equal(instructions.filter(ins => localIndex(ins, 'astore') === byteArrayLocal).length, 1, 'No replacement byte array in that local');
  // The genuine cases also construct Class<?>[] and Option[] arguments.
  // Their aastore is not a byte[] mutation; the typed returned [B local can
  // only be changed by bastore, which is excluded after its producer.
  assert.ok(!instructions.slice(producerIndex + 2).some(ins => ins.name === 'bastore'), 'No rewriting selected returned class bytes');
  const transportIndex = instructions.findIndex(ins => ins.cp?.owner === support && ins.cp.name === 'artifact' &&
    ins.cp.descriptor === '(Ljava/lang/String;Ljava/lang/String;[B)V');
  assert.ok(transportIndex > producerIndex + 2, 'Artifact comes after actual public returned-byte operation');
  assert.equal(instructions[transportIndex - 3].cp?.value, entry.id); assert.equal(instructions[transportIndex - 3].cp?.tag, 8);
  assert.equal(instructions[transportIndex - 2].cp?.value, contract.id); assert.equal(instructions[transportIndex - 2].cp?.tag, 8);
  assert.equal(localIndex(instructions[transportIndex - 1], 'aload'), byteArrayLocal, 'Transport uses actual returned array local');
  const definitions = instructions.filter(ins => ins.cp?.owner === 'java.lang.invoke.MethodHandles$Lookup' &&
    ins.cp.name === 'defineClass' && ins.cp.descriptor === '([B)Ljava/lang/Class;');
  let definition = null;
  if (contract.definition === 'forbidden') assert.deepEqual(definitions, [], 'Typed-invalid output is never defined');
  else {
    assert.equal(definitions.length, 1); const index = instructions.indexOf(definitions[0]);
    assert.ok(index > transportIndex); assert.equal(localIndex(instructions[index - 1], 'aload'), byteArrayLocal,
      'Same original case defines the exact public returned byte-array local');
    definition = definitions[0];
    if (contract.definition === 'define-and-invoke') assert.ok(instructions.slice(index + 1).some(ins =>
      ins.cp?.owner === 'java.lang.invoke.MethodHandle' && ['invoke', 'invokeExact'].includes(ins.cp.name)),
    'Original case actually invokes a held method handle after same-JVM definition');
  }
  return {caseId: entry.id, artifactId: contract.id, originalClassFile: owner.classFile,
    originalCaseCodeSha256: body.codeSha256, producer: producers[0], byteArrayLocal, transport: instructions[transportIndex], definition,
    sameLocalStaticBindingProven: true, dynamicBranchCoverageProven: false, generalDataFlowConformanceProven: false};
}

function inputProof(group, classes) {
  const expected = classFileInputContracts[group.id]; assert.ok(expected);
  const classPath=name=>name.replaceAll('.','/')+'.class';
  assert.deepEqual(classes.map(item => item.className), expected.driverClassNames.slice().sort((a,b)=>classPath(a)<classPath(b)?-1:classPath(a)>classPath(b)?1:0));
  for (const item of classes) {
    assert.equal(item.major,69);assert.equal(item.minor,0);
    const attributeClass=/\$(?:Probe|Reference)Attribute$/.test(item.className);
    assert.equal(item.superclass,attributeClass?'java.lang.classfile.CustomAttribute':'java.lang.Object');
    assert.equal(item.flags,item.className===prefix+'ClassFileDebugTarget'||/\$Probe(?:Attribute|Mapper)$/.test(item.className)?48:49);
    assert.equal(new Set(item.methods.map(method => method.name + method.descriptor)).size, item.methods.length);
  }
  const owner = classes.find(item => item.className === group.mainClass);
  const callbackProofs = expected.callbacks.map(callback => {
    const method = owner.methods.find(item => item.name === callback.name && item.descriptor === callback.descriptor);
    assert.ok(method?.instructions); assert.equal(method.flags, callback.flags);
    const bindings = owner.bootstrapMethods.filter(item => item.arguments.some(argument => argument.tag === 15 &&
      argument.referenceKind === 6 && argument.reference?.owner === group.mainClass &&
      argument.reference.name === callback.name && argument.reference.descriptor === callback.descriptor));
    if (callback.bootstrap) assert.ok(bindings.length > 0, 'Named callback has a real original bootstrap implementation handle');
    else {
      assert.deepEqual(bindings, [], 'Shared named helper is a direct method, not an opaque factory callback');
      assert.ok(owner.methods.some(body => body.instructions?.some(ins => ins.cp?.owner === group.mainClass &&
        ins.cp.name === callback.name && ins.cp.descriptor === callback.descriptor)), 'Original wrappers directly invoke selected named helper');
    }
    for (const binding of bindings) assert.ok(binding.method.referenceKind === 6 &&
      binding.method.reference?.owner === 'java.lang.invoke.LambdaMetafactory' && binding.method.reference.name === 'metafactory');
    return {...callback, originalClassFile: owner.classFile, codeSha256: method.codeSha256, codeHex: method.codeHex,
      instructions: method.instructions, bootstrapBindings: bindings, callbackExecutionCoverageProven: false};
  });
  const utility = classes.find(item => item.className === support);
  const bytesMethod = utility.methods.find(item => item.name === 'bytes' && item.descriptor === '(Ljava/lang/Class;Ljava/lang/String;)[B');
  const artifactMethod = utility.methods.find(item => item.name === 'artifact' && item.descriptor === '(Ljava/lang/String;Ljava/lang/String;[B)V');
  assert.ok(bytesMethod?.instructions && artifactMethod?.instructions);
  assert.ok(bytesMethod.instructions.some(ins => ins.cp?.owner === 'java.lang.Class' && ins.cp.name === 'getResourceAsStream' &&
    ins.cp.descriptor === '(Ljava/lang/String;)Ljava/io/InputStream;'));
  assert.ok(bytesMethod.instructions.some(ins => ins.cp?.owner === 'java.io.InputStream' && ins.cp.name === 'readAllBytes' && ins.cp.descriptor === '()[B'));
  assert.ok(artifactMethod.instructions.some(ins => ins.cp?.owner === 'java.util.Base64$Encoder' &&
    ins.cp.name === 'encodeToString' && ins.cp.descriptor === '([B)Ljava/lang/String;'));
  const encodedArray = artifactMethod.instructions.findIndex(ins => ins.cp?.owner === 'java.util.Base64$Encoder' &&
    ins.cp.name === 'encodeToString' && ins.cp.descriptor === '([B)Ljava/lang/String;');
  assert.equal(localIndex(artifactMethod.instructions[encodedArray - 1], 'aload'), 2,
    'Artifact helper encodes its actual byte[] parameter, not precomputed native bytes');
  let resourceProof = null;
  if (expected.resource) {
    const body = owner.methods.find(method => method.name === expected.resource.method && method.descriptor === expected.resource.descriptor);
    assert.ok(body?.instructions);
    const at = body.instructions.findIndex((ins, i) => ins.cp?.tag === 7 && ins.cp.value === group.mainClass &&
      body.instructions[i + 1]?.cp?.tag === 8 && body.instructions[i + 1].cp.value === expected.resource.name &&
      body.instructions[i + 2]?.cp?.owner === support && body.instructions[i + 2].cp.name === 'bytes' &&
      body.instructions[i + 2].cp.descriptor === '(Ljava/lang/Class;Ljava/lang/String;)[B');
    assert.ok(at >= 0, 'Original anchor and literal resource use the unchanged reader');
    resourceProof = {...expected.resource, targetClassFile: classes.find(item => item.className === expected.resource.target).classFile,
      originalClassFile: owner.classFile, codeSha256: body.codeSha256, codeHex: body.codeHex, resourceInstructionIndex: at,
      instructions: body.instructions, runtimePath: expected.resource.target.replaceAll('.', '/') + '.class'};
    inspectClassFileArtifactBytes(Buffer.from(classes.find(item=>item.className===expected.resource.target).originalBytesBase64,'base64'),classFileResourceContract);
  }
  const map = new Map(classes.map(item => [item.className, {file: item.classFile,
    methods: new Map(item.methods.filter(method => method.instructions).map(method => [method.name + method.descriptor, method]))}]));
  const caseProofs = proveCoreGroup(group, map).map(proof => ({...proof, fullSourceUnitConformanceProven: false}));
  const codecProofs=expected.codecs.map(codec=>{
    const clazz=classes.find(item=>item.className===codec.owner);
    assert.deepEqual(clazz.interfaces,['java.lang.classfile.AttributeMapper']);
    const method=clazz.methods.find(item=>item.name===codec.name&&item.descriptor===codec.descriptor);assert.ok(method?.instructions);assert.equal(method.flags,codec.flags);
    return {...codec,originalClassFile:clazz.classFile,codeSha256:method.codeSha256,codeHex:method.codeHex,instructions:method.instructions,mapperDispatchExecutionCoverageProven:false};
  });
  const caseCallbackProofs = group.cases.map(entry => ({id: entry.id, probes: entry.callbackMethods.map(probe => {
    const probeOwner=probe.className||group.mainClass;
    assert.ok(probeOwner===group.mainClass?expected.callbacks.some(callback=>callback.name===probe.method&&callback.descriptor===probe.descriptor):
      expected.codecs.some(codec=>codec.owner===probeOwner&&codec.name===probe.method&&codec.descriptor===probe.descriptor),'Independently selected named callback or mapper codec signature');
    const clazz=classes.find(item=>item.className===probeOwner);
    const method = clazz.methods.find(item => item.name === probe.method && item.descriptor === probe.descriptor);
    const matches = [];
    for (const opcode of probe.requiredOpcodes) {
      const found = method.instructions.find(ins => ins.name === opcode || ins.modifiedOpcode === opcode);
      assert.ok(found, 'Actual selected callback opcode'); matches.push(found);
    }
    for (const operand of probe.symbolicOperands || []) {
      const keys = operand.tag === 7 ? ['value'] : ['owner', 'name', 'descriptor'];
      const found = method.instructions.find(ins => ins.name === operand.opcode && ins.cp?.tag === operand.tag &&
        keys.every(key => ins.cp[key] === operand[key]));
      assert.ok(found, 'Actual exact callback public method/field operand '+probe.method+' '+JSON.stringify(operand)); matches.push(found);
    }
    return {owner: probeOwner, method: probe.method, descriptor: probe.descriptor, originalClassFile: clazz.classFile,
      codeSha256: method.codeSha256, matches, opaqueCallbackStaticReachabilityProven: false};
  })}));
  const returnedArrayRoutes = group.cases.flatMap(entry => classFileArtifactContracts[entry.id].map(contract => returnedArrayRoute(entry, group, classes, contract)));
  const apiOnlyRoutes = group.cases.filter(entry=>classFileArtifactContracts[entry.id].length===0).map(entry=>{
    const body=owner.methods.find(method=>method.name===entry.entryMethod&&method.descriptor===entry.entryDescriptor);
    assert.ok(body?.instructions);
    assert.ok(!body.instructions.some(ins=>ins.cp?.owner===support&&ins.cp.name==='artifact'),'API-only case never transports unselected bytes');
    assert.ok(!body.instructions.some(ins=>ins.cp?.owner==='java.lang.invoke.MethodHandles$Lookup'&&ins.cp.name==='defineClass'),'API-only case never defines an unselected output');
    let exceptionIdentity=null;
    if(entry.id==='cf-lifecycle-read-exception'||entry.id==='cf-lifecycle-write-exception') {
      const exceptionClass=entry.id==='cf-lifecycle-read-exception'?'java.lang.IllegalStateException':'java.lang.IllegalArgumentException';
      assert.ok(body.handlers.some(handler=>handler.catchType===exceptionClass),'Actual typed exception handler');
      assert.ok(body.instructions.some(ins=>ins.name==='if_acmpne'),'Original handler compares exception object identity');
      exceptionIdentity={exceptionClass,referenceIdentityComparison:true,wrappingAllowed:false};
    }
    return {caseId:entry.id,originalClassFile:owner.classFile,codeSha256:body.codeSha256,exceptionIdentity,transportedArtifacts:0,definitions:0};
  });
  let mapperLifecycleProof=null;
  if(group.id==='classfile-debug-lifecycle') {
    const clazz=classes.find(item=>item.className===prefix+'ClassFileDebugLifecycleFinal$ProbeMapper');
    const read=clazz.methods.find(method=>method.name==='readAttribute'&&method.descriptor.endsWith('Lclasses/modern_test/ClassFileDebugLifecycleFinal$ProbeAttribute;'));
    const write=clazz.methods.find(method=>method.name==='writeAttribute'&&method.descriptor.startsWith('(Ljava/lang/classfile/BufWriter;Lclasses/modern_test/ClassFileDebugLifecycleFinal$ProbeAttribute;'));
    assert.ok(read?.instructions&&write?.instructions);
    assert.ok(!read.instructions.some(ins=>ins.cp?.owner==='java.lang.classfile.AttributedElement'&&['attributes','findAttribute'].includes(ins.cp.name)),
      'Mapper callback retains its owner without recursively traversing owner attributes');
    for(const [body,field] of [[read,'readFailure'],[write,'writeFailure']]) {
      const at=body.instructions.findIndex((ins,n)=>ins.cp?.owner===group.mainClass&&ins.cp.name===field&&body.instructions[n+1]?.name==='athrow');
      assert.ok(at>=0,'Mapper callback throws the original held exception object');
    }
    const deferred=owner.methods.find(method=>method.name==='caseDeferred'),parsed=deferred.instructions.findIndex(ins=>ins.cp?.owner==='java.lang.classfile.ClassFile'&&ins.cp.name==='parse');
    const accesses=deferred.instructions.map((ins,n)=>ins.cp?.owner===group.mainClass&&ins.cp.name==='ownerAttribute'?n:-1).filter(n=>n>=0);
    assert.equal(accesses.length,4);assert.ok(parsed>=0&&accesses.every(n=>n>parsed),'All four owner-attribute accesses are after parse returns');
    mapperLifecycleProof={originalClassFile:clazz.classFile,readCodeSha256:read.codeSha256,writeCodeSha256:write.codeSha256,
      retainedOwnerWithoutCallbackTraversal:true,postParseOwnerScopes:['Class','Field','Method','Code'],originalExceptionObjectThrown:true,
      callbackExecutionCoverageProven:false,reentrantMapperGeneralConformanceProven:false};
  }
  return canonicalClassFileProof({schemaVersion: 1, group: group.id, classes, caseProofs, callbackProofs, codecProofs, caseCallbackProofs, resourceProof, returnedArrayRoutes, apiOnlyRoutes, mapperLifecycleProof,
    compilerBytesTransformed: false, generatedArtifactsAreCompilerInputs: false, dynamicBranchCoverageProven: false,
    opaqueCallbackStaticReachabilityProven: false, fullSourceUnitConformanceProven: false, fullPublicClassFileApiConformanceProven: false});
}

export function proveClassFileInputGroup(group, directory, classFiles) {
  const classes = classFiles.map(file => decodeClass(fs.readFileSync(path.join(directory, file.path)), file));
  return inputProof(group, classes);
}

export function assertClassFileInputProofs(record, group) {
  assert.equal(record.release, 25); const proof = record.inputProofs;
  assert.ok(proof && Array.isArray(proof.classes));
  assert.deepEqual(proof.classes.map(item => item.classFile), record.classFiles);
  const classes = proof.classes.map(item => {
    assert.ok(typeof item.originalBytesBase64 === 'string'); const bytes = Buffer.from(item.originalBytesBase64, 'base64');
    assert.equal(bytes.toString('base64'), item.originalBytesBase64); return decodeClass(bytes, item.classFile);
  });
  assert.deepEqual(proof, inputProof(group, classes), 'Every original byte, Code/callback/resource/returned-array claim independently replays');
}

// Evidence reader only: never supplies or substitutes guest public API class bytes.
function methodInitialLocals(method, className) {
  const locals=(method.flags&8)?[]:[method.name==='<init>'?'UNINITIALIZED_THIS':'Object:'+className];
  const descriptor=method.descriptor; assert.equal(descriptor[0],'(');
  for(let at=1;descriptor[at]!==')';) {
    const first=descriptor[at++]; assert.ok(first);
    if(first==='L') {const end=descriptor.indexOf(';',at);assert.ok(end>=at);locals.push('Object:'+descriptor.slice(at,end).replaceAll('/','.'));at=end+1;}
    else if(first==='[') {
      const start=at-1;while(descriptor[at]==='[')at++;
      if(descriptor[at]==='L'){const end=descriptor.indexOf(';',at);assert.ok(end>=at);at=end+1;}else at++;
      locals.push('Object:'+descriptor.slice(start,at).replaceAll('/','.'));
    } else {const type={B:'INTEGER',C:'INTEGER',I:'INTEGER',S:'INTEGER',Z:'INTEGER',F:'FLOAT',J:'LONG',D:'DOUBLE'}[first];assert.ok(type);locals.push(type);}
  }
  return locals;
}
function decodeStackMaps(method,className,constant) {
  const attributes=method.codeAttributes.filter(attribute=>attribute.name==='StackMapTable');assert.ok(attributes.length<=1,'Singleton StackMapTable');
  if(!attributes.length)return [];
  const bytes=Buffer.from(attributes[0].bodyHex,'hex');let at=0,previous=-1,locals=methodInitialLocals(method,className);const frames=[];
  const u1=()=>{assert.ok(at<bytes.length,'Complete frame tag');return bytes[at++];};
  const u2=()=>{assert.ok(at+2<=bytes.length,'Complete frame operands');const v=bytes.readUInt16BE(at);at+=2;return v;};
  const type=()=>{
    const tag=u1(),simple=['TOP','INTEGER','FLOAT','DOUBLE','LONG','NULL','UNINITIALIZED_THIS'];
    if(tag<7)return simple[tag];
    if(tag===7){const value=constant(u2());assert.equal(value.tag,7);return 'Object:'+value.value;}
    assert.equal(tag,8,'Known verification type');const offset=u2();
    assert.ok(method.instructions.some(ins=>ins.pc===offset&&ins.name==='new'),'Uninitialized identity targets NEW boundary');
    return 'Uninitialized:'+offset;
  };
  const list=count=>Array.from({length:count},type),count=u2();
  for(let n=0;n<count;n++) {
    const frameType=u1();let delta,stack=[];
    if(frameType<=63)delta=frameType;
    else if(frameType<=127){delta=frameType-64;stack=list(1);}
    else if(frameType===247){delta=u2();stack=list(1);}
    else if(frameType>=248&&frameType<=250){delta=u2();assert.ok(locals.length>=251-frameType);locals=locals.slice(0,locals.length-(251-frameType));}
    else if(frameType===251)delta=u2();
    else if(frameType>=252&&frameType<=254){delta=u2();locals=[...locals,...list(frameType-251)];}
    else {assert.equal(frameType,255,'Reserved frame type rejected');delta=u2();locals=list(u2());stack=list(u2());}
    const offset=previous+delta+1;assert.ok(offset>previous,'Strict ordered frame targets');
    const target=method.instructions.findIndex(instruction=>instruction.pc===offset);
    assert.ok(target>=0,'Frame target is an actual Code boundary');
    const slots=values=>values.reduce((sum,value)=>sum+(value==='LONG'||value==='DOUBLE'?2:1),0);
    assert.ok(slots(locals)<=method.maxLocals && slots(stack)<=method.maxStack,'Frame slots fit real Code maxima');
    frames.push({frameType,offsetDelta:delta,offset,target,locals:[...locals],stack});previous=offset;
  }
  assert.equal(at,bytes.length,'Complete StackMapTable with no ignored trailing bytes');return frames;
}
function canonicalControlFlow(method) {
  const index=pc=>{if(pc===method.codeLength)return method.instructions.length;const result=method.instructions.findIndex(ins=>ins.pc===pc);assert.ok(result>=0);return result;};
  return method.instructions.map(instruction=>{
    if(instruction.branchTarget!==undefined)return instruction.name+':'+index(instruction.branchTarget);
    if(instruction.defaultTarget!==undefined) {
      const keys=instruction.keys.map((key,n)=>key+':'+index(instruction.targets[n])).join(',');
      const span=instruction.name==='tableswitch'?instruction.low+'..'+instruction.high+';':'';
      const paddingStart=instruction.pc+1,paddingEnd=(instruction.pc+4)&~3,raw=Buffer.from(method.codeHex,'hex');
      for(let at=paddingStart;at<paddingEnd;at++)assert.equal(raw[at],0,'Switch alignment padding is real zero bytes');
      return instruction.name+':'+span+'default='+index(instruction.defaultTarget)+';cases='+keys;
    }
    return canonicalOperation(instruction);
  });
}
function semanticConstant(item) {
  const {index,...value}=item; if(value.reference)value.reference=semanticConstant(value.reference);return value;
}
function attributeMetadata(attributes,decoded) {
  const result={},constant=index=>{const entry=decoded.constants.find(item=>item.index===index);assert.ok(entry);return semanticConstant(entry);};
  const utf=index=>{const entry=constant(index);assert.equal(entry.tag,1);return entry.value;};
  const cls=index=>{const entry=constant(index);assert.equal(entry.tag,7);return entry.value;};
  for(const attribute of attributes) {
    assert.ok(!Object.hasOwn(result,attribute.name),'No duplicate selected singleton attributes');
    const bytes=Buffer.from(attribute.bodyHex,'hex');const u2=at=>{assert.ok(at+2<=bytes.length);return bytes.readUInt16BE(at);};
    let value;
    if(['Signature','SourceFile'].includes(attribute.name)){assert.equal(bytes.length,2);value=utf(u2(0));}
    else if(attribute.name==='SourceDebugExtension'){value=bytes.toString('utf8');assert.equal(Buffer.from(value,'utf8').toString('hex'),attribute.bodyHex,'Exact complete source-debug UTF8 bytes');}
    else if(attribute.name==='D3Lifecycle'){assert.equal(bytes.length,6);const reference=constant(u2(4));assert.equal(reference.tag,8);value={value:bytes.readInt32BE(0),reference};}
    else if(attribute.name==='ConstantValue'){assert.equal(bytes.length,2);value=constant(u2(0));}
    else if(attribute.name==='NestHost'){assert.equal(bytes.length,2);value=cls(u2(0));}
    else if(['Exceptions','NestMembers'].includes(attribute.name)){const count=u2(0);assert.equal(bytes.length,2+count*2);value=Array.from({length:count},(_,n)=>cls(u2(2+n*2)));}
    else if(attribute.name==='InnerClasses'){const count=u2(0);assert.equal(bytes.length,2+count*8);value=Array.from({length:count},(_,n)=>{const at=2+n*8;return {innerClass:cls(u2(at)),outerClass:u2(at+2)?cls(u2(at+2)):null,innerName:u2(at+4)?utf(u2(at+4)):null,flags:u2(at+6)};});}
    else assert.fail('Unselected output metadata '+attribute.name);
    result[attribute.name]=value;
  }
  return result;
}


function codeDebugMetadata(method,decoded) {
  const constants=new Map(decoded.constants.map(item=>[item.index,item]));
  const utf=index=>{const item=constants.get(index);assert.equal(item?.tag,1);return item.value;};
  const boundary=pc=>{
    if(pc===method.codeLength)return method.instructions.length;
    const index=method.instructions.findIndex(item=>item.pc===pc);
    assert.ok(index>=0,'Debug labels point at actual Code boundaries');return index;
  };
  const result={};
  for(const attribute of method.codeAttributes.filter(item=>item.name!=='StackMapTable')) {
    assert.ok(!Object.hasOwn(result,attribute.name),'No duplicate debug/custom Code attributes');
    const bytes=Buffer.from(attribute.bodyHex,'hex');
    if(attribute.name==='D3Lifecycle') {
      assert.equal(bytes.length,6);const reference=constants.get(bytes.readUInt16BE(4));assert.equal(reference?.tag,8);
      result.D3Lifecycle={value:bytes.readInt32BE(0),reference:semanticConstant(reference)};continue;
    }
    assert.ok(bytes.length>=2,'Complete debug table count');
    const count=bytes.readUInt16BE(0),width={LineNumberTable:4,LocalVariableTable:10,LocalVariableTypeTable:10,CharacterRangeTable:14}[attribute.name];
    assert.ok(width,'Selected typed Code attribute');assert.equal(bytes.length,2+count*width,'Complete debug table bytes with no ignored suffix');
    const entries=[];
    for(let n=0;n<count;n++) {
      const at=2+n*width,start=bytes.readUInt16BE(at);
      if(attribute.name==='LineNumberTable')entries.push({target:boundary(start),line:bytes.readUInt16BE(at+2)});
      else if(attribute.name==='CharacterRangeTable') {
        const inclusive=bytes.readUInt16BE(at+2),end=inclusive+1;
        assert.ok(start<end && end<=method.codeLength,'Selected nonempty bounded inclusive character range');
        entries.push({start:boundary(start),end:boundary(end),characterStart:bytes.readUInt32BE(at+4),characterEnd:bytes.readUInt32BE(at+8),flags:bytes.readUInt16BE(at+12)});
      } else {
        const end=start+bytes.readUInt16BE(at+2),slot=bytes.readUInt16BE(at+8);
        assert.ok(start<=end && end<=method.codeLength,'Selected bounded local-variable scope');
        assert.ok(slot<method.maxLocals,'Selected local slot fits actual Code maxima');
        entries.push({start:boundary(start),end:boundary(end),name:utf(bytes.readUInt16BE(at+4)),
          [attribute.name==='LocalVariableTable'?'type':'signature']:utf(bytes.readUInt16BE(at+6)),slot});
      }
    }
    result[attribute.name]=entries;
  }
  return result;
}

export function inspectClassFileArtifactBytes(bytes, contract) {
  const decoded=decodeClass(bytes);assert.equal(decoded.className,contract.className);assert.equal(decoded.major,69);assert.equal(decoded.minor,0);
  assert.equal(decoded.flags,contract.flags);assert.equal(decoded.superclass,'java.lang.Object');assert.deepEqual(decoded.interfaces,contract.interfaces);
  assert.deepEqual(decoded.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})),contract.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})));
  assert.deepEqual(decoded.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),
    contract.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),'Exact generated member inventory');
  for(const [n,method] of decoded.methods.entries()) {
    const expected=contract.methods[n];assert.ok(method.instructions);
    assert.ok(method.codeLength>0 && method.codeLength<=65535,'Real Code length remains within the JVM u2-sized limit');
    assert.ok(method.instructions.every(ins=>!['ret','jsr','jsr_w'].includes(ins.name)),'No unselected obsolete/dynamic instructions');
    assert.deepEqual(canonicalControlFlow(method),expected.code,'Real complete generated operands and target graph');
    assert.deepEqual(method.instructions.map(ins=>ins.name),expected.nativeOpcodes,
      'Selected modern instructions preserve actual complete opcode encodings and widths');
    const raw=Buffer.from(method.codeHex,'hex');
    for(const instruction of method.instructions){
      if(instruction.name==='invokedynamic'){assert.equal(raw[instruction.pc+3],0);assert.equal(raw[instruction.pc+4],0);}
      if(instruction.name==='invokeinterface'){assert.equal(instruction.cp.tag,11);assert.equal(raw[instruction.pc+3],1);assert.equal(raw[instruction.pc+4],0);}
      if(['invokevirtual','invokestatic','invokespecial'].includes(instruction.name))assert.equal(instruction.cp.tag,
        10,'Actual method reference class/interface category');
      if(['getfield','putfield','getstatic','putstatic'].includes(instruction.name))assert.equal(instruction.cp.tag,9);
      if(instruction.name==='newarray')assert.ok(instruction.arrayType>=4 && instruction.arrayType<=11);
      if(instruction.name==='multianewarray'){
        assert.equal(instruction.cp.tag,7);const rank=instruction.cp.value.match(/^\[+/)?.[0].length||0;
        assert.ok(instruction.dimensions>=1 && instruction.dimensions<=rank,'Actual multi-array dimensions fit the CP class descriptor');
      }
    }
    assert.equal(method.maxStack,expected.maxStack);assert.equal(method.maxLocals,expected.maxLocals);
    const index=pc=>{if(pc===method.codeLength)return method.instructions.length;const result=method.instructions.findIndex(ins=>ins.pc===pc);assert.ok(result>=0);return result;};
    assert.deepEqual(method.handlers.map(handler=>{
      assert.ok(handler.start<handler.end&&handler.end<=method.codeLength&&handler.target<method.codeLength,'Nonempty bounded protected interval');
      return {...handler,start:index(handler.start),end:index(handler.end),target:index(handler.target)};
    }),expected.handlers,'Real ordered typed/catch-all handler boundaries');
    assert.deepEqual(method.stackMapFrames.map(({target,locals,stack})=>({target,locals,stack})),expected.frames,'Complete expanded frame state vectors independent of compression');
    method.debugMetadata=codeDebugMetadata(method,decoded);
    assert.deepEqual(method.debugMetadata,expected.debug,'Complete typed debug scopes/characters/lines/custom Code payloads');
    assert.deepEqual(method.codeAttributes.map(attribute=>attribute.name).slice().sort(),[...Object.keys(expected.debug),...(expected.frames.length?['StackMapTable']:[])].sort(),'No ignored or retained stale Code metadata');
  }
  assert.deepEqual(decoded.bootstrapMethods.map(item=>({method:semanticConstant(item.method),arguments:item.arguments.map(semanticConstant)})),contract.bootstraps,'Typed complete bootstrap method and static argument vectors');
  for(const constant of decoded.constants.filter(item=>[17,18].includes(item.tag)))assert.ok(constant.bootstrapIndex>=0&&constant.bootstrapIndex<decoded.bootstrapMethods.length,'Dynamic bootstrap index is bounded');
  for(const [n,field] of decoded.fields.entries())assert.deepEqual(attributeMetadata(field.attributes,decoded),contract.fields[n].metadata,'Complete typed field attributes');
  for(const [n,method] of decoded.methods.entries())assert.deepEqual(attributeMetadata(method.attributes.filter(item=>item.name!=='Code'),decoded),contract.methods[n].metadata,'Complete typed method attributes');
  assert.deepEqual(attributeMetadata(decoded.attributes.filter(item=>item.name!=='BootstrapMethods'),decoded),contract.metadata,'Complete typed class/custom attribute payload vectors');
  const sourceFiles=decoded.attributes.filter(attribute=>attribute.name==='SourceFile');
  assert.equal(sourceFiles.length,contract.sourceFile===null?0:1);
  assert.deepEqual(decoded.attributes.map(attribute=>attribute.name).slice().sort(),[...Object.keys(contract.metadata),...(contract.bootstraps.length?['BootstrapMethods']:[])].sort(),'No ignored output attributes');
  if(contract.id==='remap-widen') {
    const prefilled=decoded.constants.filter(item=>item.tag===8&&item.value.startsWith('d3-unused-')).map(item=>item.value).sort();
    assert.deepEqual(prefilled,Array.from({length:300},(_,n)=>'d3-unused-'+n).sort(),'Exact selected fresh-pool 300-string prefill');
    const literals=decoded.methods.find(method=>method.name==='choose').instructions.filter(ins=>ins.name==='ldc_w');
    assert.equal(literals.length,2);assert.ok(literals.every(ins=>ins.cp.tag===8&&ins.cp.index>255),'Actual imported string operands require u2-width loads');
  }
  if(contract.sourceFile!==null){assert.equal(sourceFiles[0].length,2);const index=Buffer.from(sourceFiles[0].bodyHex,'hex').readUInt16BE(0);
    assert.equal(decoded.constants.find(item=>item.index===index)?.value,contract.sourceFile);assert.equal(decoded.constants.find(item=>item.index===index)?.tag,1);}
  return decoded;
}

export function proveClassFileArtifact(bytes, contract, {host, caseId, record}) {
  assert.ok(['native', 'node', 'chromium'].includes(host));
  const expected = classFileArtifactContracts[caseId].find(item => item.id === contract.id); assert.deepEqual(contract, expected);
  const decoded = inspectClassFileArtifactBytes(bytes, contract);
  assertClassFileInputProofs(record, {...classFileInputContracts[record.group], id: record.group, cases: record.cases});
  const route = record.inputProofs.returnedArrayRoutes.find(item => item.caseId === caseId && item.artifactId === contract.id);
  assert.ok(route, 'Artifact operation is bound to the original source/Code route');
  let regeneration=null;
  if(['cf-remap-debug-insertion','cf-remap-debug-widen'].includes(caseId)) {
    const original=record.inputProofs.classes.find(item=>item.className===prefix+'ClassFileDebugTarget');
    const before=original.methods.find(item=>item.name==='choose'),after=decoded.methods.find(item=>item.name==='choose');
    assert.ok(after.codeLength>before.codeLength && after.codeSha256!==before.codeSha256,'Real remapped Code differs from unchanged resource');
    const priorFrames=before.stackMapFrames.map(item=>item.offset),frames=after.stackMapFrames.map(item=>item.offset);
    assert.notDeepEqual(frames,priorFrames,'Real frame BCIs follow width/insertion changes');
    regeneration={originalClassFile:original.classFile,method:'choose',originalCodeSha256:before.codeSha256,outputCodeSha256:after.codeSha256,
      originalCodeLength:before.codeLength,outputCodeLength:after.codeLength,originalFrameOffsets:priorFrames,outputFrameOffsets:frames,
      sourceResourceUnchanged:true,actualOutputDebugScopesProven:true,nativeOutputSubstitution:false};
  }
  return {schemaVersion: 1, caseId, artifactId: contract.id, producerHost: host, origin: contract.origin, regeneration,
    genuineCompilerBytes: false, originalInputClassFiles: record.classFiles, originalCaseCodeSha256: route.originalCaseCodeSha256,
    selectedDefinitionRequirement: contract.definition, returnedArrayStaticRoute: route, bytesBase64: bytes.toString('base64'),
    size: bytes.length, sha256: sha(bytes), decoded,
    nativeBytesSubstituted: false, byteForByteNativeParityProven: false, dynamicBranchCoverageProven: false,
    sameJvmDefinitionGeneralConformanceProven: false, fullPublicClassFileApiConformanceProven: false,
    fullBytecodeVerifierConformanceProven: false, fullStackMapConformanceProven: false, selectedCanonicalControlFlowProven: true, selectedExpandedFrameVectorsProven: true, selectedDebugAttributeVectorsProven: true};
}



