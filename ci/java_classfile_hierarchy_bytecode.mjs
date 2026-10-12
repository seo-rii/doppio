import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode, proveCoreGroup} from './java_core_bytecode.mjs';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),prefix='classes.modern_test.',support=prefix+'ClassFileSupport';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const cb=(name,descriptor,bootstrap=true)=>({name,descriptor,flags:10,bootstrap});
const builder='(Ljava/lang/classfile/ClassBuilder;)V',codeBuilder='(Ljava/lang/classfile/CodeBuilder;)V',cd='Ljava/lang/constant/ClassDesc;',
  info='Ljava/lang/classfile/ClassHierarchyResolver$ClassHierarchyInfo;';
const input=(name,marker,callbacks)=>({source:'classes/modern_fixture/'+name+'.java',mainClass:prefix+name,completionMarker:marker,
  additionalSources:['classes/modern_fixture/classfile/ClassFileSupport.java'],driverClassNames:[prefix+name,support],resourceClassNames:[],
  javacFlags:['-g:source'],resource:null,callbacks,codecs:[]});
export const classFileInputContracts=freeze({
  'classfile-hierarchy':input('ClassFileHierarchyFinal','CLASSFILE_HIERARCHY_OK',[
    ...['Number','NumberLocal','ReferenceArray','PrimitiveArray','BadReturn'].map(name=>cb('build'+name,builder)),
    ...['Stack','Local','BadReturn'].map(name=>cb('code'+name,codeBuilder)),
    cb('resource','('+cd+')Ljava/io/InputStream;'),cb('cache','()Ljava/util/Map;'),cb('unavailable','('+cd+')'+info),cb('flags',builder,false)
  ]),
  'classfile-constant-instruction':input('ClassFileConstantInstructionFinal','CLASSFILE_CONSTANT_INSTRUCTION_OK',[
    ...['Integers','Wide','Null','Bipush','Sipush','NumericLoads','ReferenceLoads'].map(name=>cb('build'+name,builder)),
    ...['MinusOne','Zero','Five','LongOne','FloatTwo','DoubleOne','Null','ByteNegative','BytePositive','ShortNegative','ShortPositive',
      'IntLoad','LongLoad','FloatLoad','DoubleLoad','ClassLoad','StringLoad'].map(name=>cb('code'+name,codeBuilder)),cb('flags',builder,false)
  ])
});
const method=(name,descriptor,code,nativeOpcodes,{maxStack=1,maxLocals=0,frames=[]}={})=>({name,descriptor,flags:9,code,nativeOpcodes,
  maxStack,maxLocals,frames,handlers:[],metadata:{}});
const generated=(id,name,methods,{definition='define-and-invoke'}={})=>({id,className:prefix+name,origin:'public-build',flags:33,fields:[],methods,
  sourceFile:null,definition,metadata:{},bootstraps:[],extra:{},branches:methods.some(m=>m.code.some(op=>/^(?:if|goto)/.test(op))),handlers:false});
const frame=(target,locals,stack=[])=>({target,locals,stack}),I='INTEGER',O=name=>'Object:'+name;
const numberLocals=[I,O('java.lang.Integer'),O('java.lang.Long')],numberDescriptor='(ILjava/lang/Integer;Ljava/lang/Long;)Ljava/lang/Number;';
const stack=(descriptor,locals,join)=>method('choose',descriptor,['iload:0','ifeq:4','aload:1','goto:5','aload:2','areturn'],
  ['iload_0','ifeq','aload_1','goto','aload_2','areturn'],{maxLocals:3,frames:[frame(4,locals),frame(5,locals,[join])]});
const literal=(name,descriptor,operation,opcode,return_,maxStack=1)=>method(name,descriptor,[operation,return_],[opcode,return_],{maxStack});
export const classFileArtifactContracts=freeze({
  'cf-hierarchy-callable-resolvers':[],
  'cf-hierarchy-declared-chain-cache':[],
  'cf-hierarchy-resolver-options':[generated('hierarchy-options','C7dResolverOptions',[stack(numberDescriptor,numberLocals,O('java.lang.Number'))])],
  'cf-hierarchy-subtype-stack':[generated('hierarchy-stack','C7dNumberStack',[stack(numberDescriptor,numberLocals,O('java.lang.Number'))])],
  'cf-hierarchy-subtype-local':[generated('hierarchy-local','C7dNumberLocal',[method('choose',numberDescriptor,
    ['iload:0','ifeq:5','aload:1','astore:3','goto:7','aload:2','astore:3','aload:3','areturn'],
    ['iload_0','ifeq','aload_1','astore_3','goto','aload_2','astore_3','aload_3','areturn'],
    {maxLocals:4,frames:[frame(5,numberLocals),frame(7,[...numberLocals,O('java.lang.Number')])]})])],
  'cf-hierarchy-reference-array':[generated('hierarchy-reference-array','C7dReferenceArrays',[stack('(I[Ljava/lang/String;[Ljava/lang/Integer;)[Ljava/lang/Object;',
    [I,O('[Ljava.lang.String;'),O('[Ljava.lang.Integer;')],O('[Ljava.lang.Object;'))])],
  'cf-hierarchy-primitive-array':[generated('hierarchy-primitive-array','C7dPrimitiveArrays',[stack('(I[I[J)Ljava/lang/Object;',[I,O('[I'),O('[J')],O('java.lang.Object'))])],
  'cf-hierarchy-invalid-return':[generated('hierarchy-invalid','C7dInvalidReference',[method('bad','(Ljava/lang/Integer;)Ljava/lang/String;',
    ['aload:0','areturn'],['aload_0','areturn'],{maxLocals:1})],{definition:'forbidden'})],
  'cf-constant-intrinsic-integers':[generated('constant-integers','C7dIntrinsicInts',[
    literal('minusOne','()I','int:-1','iconst_m1','ireturn'),literal('zero','()I','int:0','iconst_0','ireturn'),literal('five','()I','int:5','iconst_5','ireturn')])],
  'cf-constant-intrinsic-wide':[generated('constant-wide','C7dIntrinsicWide',[
    literal('longValue','()J','long:1','lconst_1','lreturn',2),literal('floatValue','()F','float:2','fconst_2','freturn'),literal('doubleValue','()D','double:1','dconst_1','dreturn',2)])],
  'cf-constant-intrinsic-null':[generated('constant-null','C7dIntrinsicNull',[literal('value','()Ljava/lang/Object;','aconst_null','aconst_null','areturn')])],
  'cf-constant-argument-byte':[generated('constant-byte','C7dArgumentByte',[
    literal('negative','()I','int:-128','bipush','ireturn'),literal('positive','()I','int:127','bipush','ireturn')])],
  'cf-constant-argument-short':[generated('constant-short','C7dArgumentShort',[
    literal('negative','()I','int:-32768','sipush','ireturn'),literal('positive','()I','int:32767','sipush','ireturn')])],
  'cf-constant-numeric-loads':[generated('constant-numeric-loads','C7dNumericLoads',[
    literal('intValue','()I','int:42','ldc','ireturn'),literal('longValue','()J','long:1234567890123','ldc2_w','lreturn',2),
    literal('floatValue','()F','float:1.25','ldc','freturn'),literal('doubleValue','()D','double:2.5','ldc2_w','dreturn',2)])],
  'cf-constant-reference-loads':[generated('constant-reference-loads','C7dReferenceLoads',[
    literal('classValue','()Ljava/lang/Class;','class:java.lang.String','ldc','areturn'),
    literal('stringValue','()Ljava/lang/String;','string:typed-constant','ldc','areturn')])],
  'cf-constant-factory-validation':[]
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
    assert.equal(item.flags,item.className.endsWith('Target')?48:49);
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
  return {schemaVersion: 1, group: group.id, classes, caseProofs, callbackProofs, codecProofs, caseCallbackProofs, resourceProof, returnedArrayRoutes,
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
    else if(attribute.name==='ConstantValue'){assert.equal(bytes.length,2);value=constant(u2(0));}
    else if(attribute.name==='NestHost'){assert.equal(bytes.length,2);value=cls(u2(0));}
    else if(['Exceptions','NestMembers'].includes(attribute.name)){const count=u2(0);assert.equal(bytes.length,2+count*2);value=Array.from({length:count},(_,n)=>cls(u2(2+n*2)));}
    else if(attribute.name==='InnerClasses'){const count=u2(0);assert.equal(bytes.length,2+count*8);value=Array.from({length:count},(_,n)=>{const at=2+n*8;return {innerClass:cls(u2(at)),outerClass:u2(at+2)?cls(u2(at+2)):null,innerName:u2(at+4)?utf(u2(at+4)):null,flags:u2(at+6)};});}
    else assert.fail('Unselected output metadata '+attribute.name);
    result[attribute.name]=value;
  }
  return result;
}

export function inspectClassFileArtifactBytes(bytes, contract) {
  const decoded=decodeClass(bytes);assert.equal(decoded.className,contract.className);assert.equal(decoded.major,69);assert.equal(decoded.minor,0);
  assert.equal(decoded.flags,contract.flags);assert.equal(decoded.superclass,'java.lang.Object');assert.deepEqual(decoded.interfaces,[]);
  assert.deepEqual(decoded.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})),contract.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})));
  assert.deepEqual(decoded.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),
    contract.methods.map(({name,descriptor,flags})=>({name,descriptor,flags})),'Exact generated member inventory');
  for(const [n,method] of decoded.methods.entries()) {
    const expected=contract.methods[n];assert.ok(method.instructions);
    assert.ok(method.instructions.every(ins=>!['ret','jsr','jsr_w'].includes(ins.name)),'No unselected obsolete/dynamic instructions');
    assert.deepEqual(canonicalControlFlow(method),expected.code,'Real complete generated operands and target graph');
    if(contract.id.startsWith('constant-'))assert.deepEqual(method.instructions.map(ins=>ins.name),expected.nativeOpcodes,
      'Selected typed constant factories preserve intrinsic, argument and actual constant-pool load encodings');
    for(const instruction of method.instructions)if(instruction.name==='invokedynamic'){const raw=Buffer.from(method.codeHex,'hex');assert.equal(raw[instruction.pc+3],0);assert.equal(raw[instruction.pc+4],0);}
    assert.equal(method.maxStack,expected.maxStack);assert.equal(method.maxLocals,expected.maxLocals);
    const index=pc=>{if(pc===method.codeLength)return method.instructions.length;const result=method.instructions.findIndex(ins=>ins.pc===pc);assert.ok(result>=0);return result;};
    assert.deepEqual(method.handlers.map(handler=>{
      assert.ok(handler.start<handler.end&&handler.end<=method.codeLength&&handler.target<method.codeLength,'Nonempty bounded protected interval');
      return {...handler,start:index(handler.start),end:index(handler.end),target:index(handler.target)};
    }),expected.handlers,'Real ordered typed/catch-all handler boundaries');
    assert.deepEqual(method.stackMapFrames.map(({target,locals,stack})=>({target,locals,stack})),expected.frames,'Complete expanded frame state vectors independent of compression');
    assert.deepEqual(method.codeAttributes.map(attribute=>attribute.name),expected.frames.length?['StackMapTable']:[],'No retained stale Code metadata');
  }
  assert.deepEqual(decoded.bootstrapMethods.map(item=>({method:semanticConstant(item.method),arguments:item.arguments.map(semanticConstant)})),contract.bootstraps,'Typed complete bootstrap method and static argument vectors');
  for(const constant of decoded.constants.filter(item=>[17,18].includes(item.tag)))assert.ok(constant.bootstrapIndex>=0&&constant.bootstrapIndex<decoded.bootstrapMethods.length,'Dynamic bootstrap index is bounded');
  for(const [n,field] of decoded.fields.entries())assert.deepEqual(attributeMetadata(field.attributes,decoded),contract.fields[n].metadata,'Complete typed field attributes');
  for(const [n,method] of decoded.methods.entries())assert.deepEqual(attributeMetadata(method.attributes.filter(item=>item.name!=='Code'),decoded),contract.methods[n].metadata,'Complete typed method attributes');
  assert.deepEqual(attributeMetadata(decoded.attributes.filter(item=>item.name!=='BootstrapMethods'),decoded),contract.metadata,'Complete typed class/custom attribute payload vectors');
  const sourceFiles=decoded.attributes.filter(attribute=>attribute.name==='SourceFile');
  assert.equal(sourceFiles.length,contract.sourceFile===null?0:1);
  assert.deepEqual(decoded.attributes.map(attribute=>attribute.name).slice().sort(),[...Object.keys(contract.metadata),...(contract.bootstraps.length?['BootstrapMethods']:[])].sort(),'No ignored output attributes');
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
  const regeneration = null;
  return {schemaVersion: 1, caseId, artifactId: contract.id, producerHost: host, origin: contract.origin, regeneration,
    genuineCompilerBytes: false, originalInputClassFiles: record.classFiles, originalCaseCodeSha256: route.originalCaseCodeSha256,
    selectedDefinitionRequirement: contract.definition, returnedArrayStaticRoute: route, bytesBase64: bytes.toString('base64'),
    size: bytes.length, sha256: sha(bytes), decoded,
    nativeBytesSubstituted: false, byteForByteNativeParityProven: false, dynamicBranchCoverageProven: false,
    sameJvmDefinitionGeneralConformanceProven: false, fullPublicClassFileApiConformanceProven: false,
    fullBytecodeVerifierConformanceProven: false, fullStackMapConformanceProven: false, selectedCanonicalControlFlowProven: true, selectedExpandedFrameVectorsProven: true};
}

