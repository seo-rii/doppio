import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode, proveCoreGroup} from './java_core_bytecode.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const prefix = 'classes.modern_test.';
const support = prefix + 'ClassFileSupport';
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const cb = (name, descriptor, bootstrap = true) => ({name, descriptor, flags: 0x0a, bootstrap});
const builder = '(Ljava/lang/classfile/ClassBuilder;)V', codeBuilder = '(Ljava/lang/classfile/CodeBuilder;)V';
const input = (name, marker, callbacks, target = null) => ({
  source: 'classes/modern_fixture/' + name + '.java', mainClass: prefix + name, completionMarker: marker,
  additionalSources: ['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames: [prefix + name, ...(target ? [prefix + target] : []), support], javacFlags: ['-g:source'],
  resourceClassNames: target ? [prefix + target] : [], callbacks,
  resource: target ? {method: 'model', descriptor: '()Ljava/lang/classfile/ClassModel;',
    name: target + '.class', target: prefix + target} : null
});

// Independent original javac25 callback/resource inventory; never calibrated
// from guest output or pruned after a selected host fails.
export const classFileInputContracts = freeze({
  'classfile-controlflow': input('ClassFileControlFlowFinal', 'CLASSFILE_CONTROLFLOW_OK', [
    cb('buildZero', builder), ...['codeEq','codeNe','codeLt','codeGe','codeGt','codeLe'].map(name => cb(name,codeBuilder)),
    cb('buildIntCompare',builder), ...['codeIntEq','codeIntNe','codeIntLt','codeIntGe','codeIntGt','codeIntLe'].map(name => cb(name,codeBuilder)),
    cb('buildReferences',builder), ...['codeNull','codeNonNull','codeSame','codeDifferent'].map(name => cb(name,codeBuilder)),
    ...['Loop','Table','Lookup','Handlers','Unbound','Duplicate','ForeignSource','ForeignTarget']
      .flatMap(name => [cb('build'+name,builder),cb('code'+name,codeBuilder)]),
    cb('codePredicate','(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/Opcode;IZ)V',false)
  ]),
  'classfile-stackmaps': input('ClassFileStackMapsFinal', 'CLASSFILE_STACKMAPS_OK', [
    ...['LongMerge','DoubleMerge','Default','BadMerge'].flatMap(name => [cb('build'+name,builder),cb('code'+name,codeBuilder)]),
    cb('insertBeforeBranches','(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V')
  ], 'ClassFileStackMapsTarget')
});
const method = (name, descriptor, code, nativeOpcodes, frames, {flags=9,handlers=[],maxStack=1,maxLocals=1}={}) =>
  ({name,descriptor,flags,code,nativeOpcodes,frames,handlers,maxStack,maxLocals});
const frame=(target,locals,stack=[])=>({target,locals,stack});
const I='INTEGER', J='LONG', D='DOUBLE', O='Object:java.lang.Object', T='Object:java.lang.Throwable',
  N='Object:java.lang.NullPointerException';
const predicate=(name,branch,{binary=false,reference=false,wide=false}={})=>{
  const kind=reference?'aload':'iload',loads=binary?[kind+':0',kind+':1']:[kind+':0'],yes=binary?5:4,join=binary?6:5;
  const descriptor=reference?(binary?'(Ljava/lang/Object;Ljava/lang/Object;)I':'(Ljava/lang/Object;)I'):(binary?'(II)I':'(I)I');
  return method(name,descriptor,[...loads,branch+':'+yes,'int:0',(wide?'goto_w':'goto')+':'+join,'int:1','ireturn'],
    [...loads.map(x=>x.replace(':','_')),branch,'iconst_0',wide?'goto_w':'goto','iconst_1','ireturn'],
    [frame(yes,binary?[reference?O:I,reference?O:I]:[reference?O:I]),frame(join,binary?[reference?O:I,reference?O:I]:[reference?O:I],[I])],
    {maxStack:binary?2:1,maxLocals:binary?2:1});
};
const generated=(id,name,methods,{origin='public-build',flags=0x21,sourceFile=null,definition='define-and-invoke'}={})=>({
  id,className:prefix+name,origin,flags,fields:[],methods,sourceFile,definition,
  branches:methods.some(m=>m.code.some(x=>/^(?:if|goto|table|lookup)/.test(x))),handlers:methods.some(m=>m.handlers.length>0)
});
const defaultMethod=()=>method('choose','(I)I',['iload:0','ifeq:4','int:31','ireturn','int:47','ireturn'],
  ['iload_0','ifeq','bipush','ireturn','bipush','ireturn'],[frame(4,[I])]);
const objectConstructor=method('<init>','()V',['aload:0','invokespecial:java.lang.Object#<init>()V','return'],
  ['aload_0','invokespecial','return'],[],{flags:0,maxStack:1,maxLocals:1});
const caughtMethod=()=>method('caught','(Ljava/lang/Throwable;)I',
  ['aload:0','athrow','astore:1','int:9','ireturn','astore:1','int:7','ireturn'],
  ['aload_0','athrow','astore_1','bipush','ireturn','astore_1','bipush','ireturn'],
  [frame(2,[T],[N]),frame(5,[T],[T])],{maxLocals:2,handlers:[{start:0,end:2,target:2,catchType:'java.lang.NullPointerException'},
    {start:0,end:2,target:5,catchType:'java.lang.Throwable'}]});
const transformed=(id,name,inserted=false)=>generated(id,name,[
  objectConstructor,
  inserted?method('choose','(I)I',['iload:0','nop','ifne:5','int:47','ireturn','int:31','ireturn'],
    ['iload_0','nop','ifne','bipush','ireturn','bipush','ireturn'],[frame(5,[I])]):
    method('choose','(I)I',['iload:0','ifne:4','int:47','ireturn','int:31','ireturn'],
      ['iload_0','ifne','bipush','ireturn','bipush','ireturn'],[frame(4,[I])]),
  caughtMethod()
],{origin:'public-transform',flags:0x30,sourceFile:'ClassFileStackMapsFinal.java'});

// Fourteen independently selected per-host output byte contracts: twelve
// valid definitions/invocations and two verification failures never defined.
export const classFileArtifactContracts = freeze({
  'cf-flow-zero-predicates':[generated('flow-zero','CfFlowZero',[
    predicate('eq','ifeq',{wide:true}),predicate('ne','ifne'),predicate('lt','iflt'),
    predicate('ge','ifge'),predicate('gt','ifgt'),predicate('le','ifle')])],
  'cf-flow-int-predicates':[generated('flow-int','CfFlowIntCompare',[
    predicate('eq','if_icmpeq',{binary:true}),predicate('ne','if_icmpne',{binary:true}),
    predicate('lt','if_icmplt',{binary:true}),predicate('ge','if_icmpge',{binary:true}),
    predicate('gt','if_icmpgt',{binary:true}),predicate('le','if_icmple',{binary:true})])],
  'cf-flow-reference-predicates':[generated('flow-reference','CfFlowReference',[
    predicate('isNull','ifnull',{reference:true}),predicate('nonNull','ifnonnull',{reference:true}),
    predicate('same','if_acmpeq',{binary:true,reference:true}),predicate('different','if_acmpne',{binary:true,reference:true})])],
  'cf-flow-backward-loop':[generated('flow-loop','CfFlowLoop',[method('sum','(I)I',
    ['int:0','istore:1','iload:0','ifle:13','iload:1','iload:0','iadd','istore:1','iload:0','int:1','isub','istore:0','goto:2','iload:1','ireturn'],
    ['iconst_0','istore_1','iload_0','ifle','iload_1','iload_0','iadd','istore_1','iload_0','iconst_1','isub','istore_0','goto','iload_1','ireturn'],
    [frame(2,[I,I]),frame(13,[I,I])],{maxStack:2,maxLocals:2})])],
  'cf-flow-table-switch':[generated('flow-table','CfFlowTable',[method('select','(I)I',
    ['iload:0','tableswitch:-1..1;default=8;cases=-1:2,0:4,1:6','int:11','ireturn','int:22','ireturn','int:33','ireturn','int:44','ireturn'],
    ['iload_0','tableswitch','bipush','ireturn','bipush','ireturn','bipush','ireturn','bipush','ireturn'],
    [frame(2,[I]),frame(4,[I]),frame(6,[I]),frame(8,[I])])])],
  'cf-flow-lookup-switch':[generated('flow-lookup','CfFlowLookup',[method('select','(I)I',
    ['nop','iload:0','lookupswitch:default=9;cases=-10:3,4:5,99:7','int:12','ireturn','int:23','ireturn','int:34','ireturn','int:45','ireturn'],
    ['nop','iload_0','lookupswitch','bipush','ireturn','bipush','ireturn','bipush','ireturn','bipush','ireturn'],
    [frame(3,[I]),frame(5,[I]),frame(7,[I]),frame(9,[I])])])],
  'cf-flow-ordered-handlers':[generated('flow-handlers','CfFlowHandlers',[method('catchValue','(Ljava/lang/Throwable;)I',
    ['aload:0','athrow','pop','int:9','ireturn','pop','int:7','ireturn'],
    ['aload_0','athrow','pop','bipush','ireturn','pop','bipush','ireturn'],
    [frame(2,[T],[N]),frame(5,[T],[T])],{handlers:[{start:0,end:2,target:2,catchType:'java.lang.NullPointerException'},
      {start:0,end:2,target:5,catchType:null}]})])],
  'cf-flow-label-rejections':[],
  'cf-frames-original-typed':[],
  'cf-frames-long-stack-merge':[generated('frames-long','CfFramesLong',[method('choose','(IJJ)J',
    ['iload:0','ifeq:4','lload:1','goto:5','lload:3','lreturn'],
    ['iload_0','ifeq','lload_1','goto','lload_3','lreturn'],[frame(4,[I,J,J]),frame(5,[I,J,J],[J])],{maxStack:2,maxLocals:5})])],
  'cf-frames-wide-double-merge':[generated('frames-double','CfFramesDouble',[method('choose','(IDD)D',
    ['iload:0','ifeq:5','dload:1','dstore:260','goto:7','dload:3','dstore:260','dload:260','dreturn'],
    ['iload_0','ifeq','dload_1','wide','goto','dload_3','wide','wide','dreturn'],
    [frame(5,[I,D,D]),frame(7,[I,D,D,...Array(255).fill('TOP'),D])],{maxStack:2,maxLocals:262})])],
  'cf-frames-default-generation':[generated('frames-default','CfFramesDefault',[defaultMethod()])],
  'cf-frames-drop-option':[generated('frames-dropped','CfFramesDropped',[{...defaultMethod(),frames:[]}],{definition:'forbidden'})],
  'cf-frames-transform-identity':[transformed('frames-identity','CfFramesIdentity')],
  'cf-frames-transform-insertion':[transformed('frames-inserted','CfFramesInserted',true)],
  'cf-frames-invalid-merge':[generated('frames-invalid','CfFramesInvalidMerge',[method('bad','(I)Ljava/lang/Object;',
    ['iload:0','ifeq:4','int:1','goto:5','aconst_null','areturn'],['iload_0','ifeq','iconst_1','goto','aconst_null','areturn'],[],
    {maxStack:1,maxLocals:1})],{definition:'forbidden'})]
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
    const type = {3: 'int', 4: 'float', 5: 'long', 6: 'double', 8: 'string'}[instruction.cp?.tag];
    assert.ok(type, 'Selected literal constant category'); return type + ':' + instruction.cp.value;
  }
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
  assert.deepEqual(classes.map(item => item.className), expected.driverClassNames.slice().sort());
  for (const item of classes) {
    assert.equal(item.major, 69); assert.equal(item.minor, 0); assert.equal(item.superclass, 'java.lang.Object');
    assert.equal(item.flags, item.className.endsWith('Target') ? 0x30 : 0x31);
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
      assert.deepEqual(bindings, [], 'Shared predicate helper is a direct method, not an opaque factory callback');
      assert.ok(owner.methods.some(body => body.instructions?.some(ins => ins.cp?.owner === group.mainClass &&
        ins.cp.name === callback.name && ins.cp.descriptor === callback.descriptor)), 'Original wrapper directly invokes selected predicate helper');
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
  }
  const map = new Map(classes.map(item => [item.className, {file: item.classFile,
    methods: new Map(item.methods.filter(method => method.instructions).map(method => [method.name + method.descriptor, method]))}]));
  const caseProofs = proveCoreGroup(group, map).map(proof => ({...proof, fullSourceUnitConformanceProven: false}));
  const caseCallbackProofs = group.cases.map(entry => ({id: entry.id, probes: entry.callbackMethods.map(probe => {
    assert.ok(expected.callbacks.some(callback => callback.name === probe.method && callback.descriptor === probe.descriptor),
      'Independently selected named callback signature');
    const method = owner.methods.find(item => item.name === probe.method && item.descriptor === probe.descriptor);
    const matches = [];
    for (const opcode of probe.requiredOpcodes) {
      const found = method.instructions.find(ins => ins.name === opcode || ins.modifiedOpcode === opcode);
      assert.ok(found, 'Actual selected callback opcode'); matches.push(found);
    }
    for (const operand of probe.symbolicOperands || []) {
      const keys = operand.tag === 7 ? ['value'] : ['owner', 'name', 'descriptor'];
      const found = method.instructions.find(ins => ins.name === operand.opcode && ins.cp?.tag === operand.tag &&
        keys.every(key => ins.cp[key] === operand[key]));
      assert.ok(found, 'Actual exact callback public method/field operand'); matches.push(found);
    }
    return {owner: group.mainClass, method: probe.method, descriptor: probe.descriptor, originalClassFile: owner.classFile,
      codeSha256: method.codeSha256, matches, opaqueCallbackStaticReachabilityProven: false};
  })}));
  const returnedArrayRoutes = group.cases.flatMap(entry => classFileArtifactContracts[entry.id].map(contract => returnedArrayRoute(entry, group, classes, contract)));
  return {schemaVersion: 1, group: group.id, classes, caseProofs, callbackProofs, caseCallbackProofs, resourceProof, returnedArrayRoutes,
    compilerBytesTransformed: false, generatedArtifactsAreCompilerInputs: false, dynamicBranchCoverageProven: false,
    opaqueCallbackStaticReachabilityProven: false, fullSourceUnitConformanceProven: false, fullPublicClassFileApiConformanceProven: false};
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
      locals.push('Object:'+descriptor.slice(start,at));
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
export function inspectClassFileArtifactBytes(bytes, contract) {
  const decoded=decodeClass(bytes);assert.equal(decoded.className,contract.className);assert.equal(decoded.major,69);assert.equal(decoded.minor,0);
  assert.equal(decoded.flags,contract.flags);assert.equal(decoded.superclass,'java.lang.Object');assert.deepEqual(decoded.interfaces,[]);
  assert.deepEqual(decoded.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})),contract.fields);
  assert.deepEqual(decoded.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),
    contract.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),'Exact generated member inventory');
  for(const [n,method] of decoded.methods.entries()) {
    const expected=contract.methods[n];assert.ok(method.instructions);
    assert.ok(method.instructions.every(ins=>!['ret','jsr','jsr_w','invokedynamic'].includes(ins.name)),'No unselected obsolete/dynamic instructions');
    assert.deepEqual(canonicalControlFlow(method),expected.code,'Real complete generated operands and target graph');
    assert.equal(method.maxStack,expected.maxStack);assert.equal(method.maxLocals,expected.maxLocals);
    const index=pc=>{if(pc===method.codeLength)return method.instructions.length;const result=method.instructions.findIndex(ins=>ins.pc===pc);assert.ok(result>=0);return result;};
    assert.deepEqual(method.handlers.map(handler=>{
      assert.ok(handler.start<handler.end&&handler.end<=method.codeLength&&handler.target<method.codeLength,'Nonempty bounded protected interval');
      return {...handler,start:index(handler.start),end:index(handler.end),target:index(handler.target)};
    }),expected.handlers,'Real ordered typed/catch-all handler boundaries');
    assert.deepEqual(method.stackMapFrames.map(({target,locals,stack})=>({target,locals,stack})),expected.frames,'Complete expanded frame state vectors independent of compression');
    assert.deepEqual(method.codeAttributes.map(attribute=>attribute.name),expected.frames.length?['StackMapTable']:[],'No retained stale Code metadata');
  }
  assert.deepEqual(decoded.bootstrapMethods,[]);
  const sourceFiles=decoded.attributes.filter(attribute=>attribute.name==='SourceFile');
  assert.equal(sourceFiles.length,contract.sourceFile===null?0:1);
  assert.deepEqual(decoded.attributes.map(attribute=>attribute.name),contract.sourceFile===null?[]:['SourceFile']);
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
  let regeneration = null;
  if (caseId === 'cf-frames-transform-insertion') {
    const original=record.inputProofs.classes.find(item=>item.className===prefix+'ClassFileStackMapsTarget');
    const before=original.methods.find(method=>method.name==='choose'),after=decoded.methods.find(method=>method.name==='choose');
    assert.ok(after.codeLength>before.codeLength && after.codeSha256!==before.codeSha256,'Inserted NOP changes actual Code bytes and offsets');
    assert.ok(after.stackMapFrames[0].offset>before.stackMapFrames[0].offset,'Regenerated frame target advances with inserted instruction');
    regeneration={originalCodeSha256:before.codeSha256,generatedCodeSha256:after.codeSha256,
      originalFrameOffset:before.stackMapFrames[0].offset,generatedFrameOffset:after.stackMapFrames[0].offset,
      actualOffsetsChanged:true,canonicalTypedTargetGraphPreserved:true};
  }
  return {schemaVersion: 1, caseId, artifactId: contract.id, producerHost: host, origin: contract.origin, regeneration,
    genuineCompilerBytes: false, originalInputClassFiles: record.classFiles, originalCaseCodeSha256: route.originalCaseCodeSha256,
    selectedDefinitionRequirement: contract.definition, returnedArrayStaticRoute: route, bytesBase64: bytes.toString('base64'),
    size: bytes.length, sha256: sha(bytes), decoded,
    nativeBytesSubstituted: false, byteForByteNativeParityProven: false, dynamicBranchCoverageProven: false,
    sameJvmDefinitionGeneralConformanceProven: false, fullPublicClassFileApiConformanceProven: false,
    fullBytecodeVerifierConformanceProven: false, fullStackMapConformanceProven: false, selectedCanonicalControlFlowProven: true, selectedExpandedFrameVectorsProven: true};
}

