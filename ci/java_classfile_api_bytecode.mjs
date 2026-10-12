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
const cb = (name, descriptor) => ({name, descriptor, flags: 0x0a});
const builder = '(Ljava/lang/classfile/ClassBuilder;)V', codeBuilder = '(Ljava/lang/classfile/CodeBuilder;)V';
const classTransform = '(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V';
const codeTransform = '(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V';
const input = (name, marker, target, callbacks, resourceMethod = null) => ({
  source: 'classes/modern_fixture/' + name + '.java', mainClass: prefix + name, completionMarker: marker,
  additionalSources: ['classes/modern_fixture/classfile/ClassFileSupport.java'],
  driverClassNames: [prefix + name, ...(target ? [prefix + target] : []), support],
  javacFlags: ['-g:source'], resourceClassNames: target ? [prefix + target] : [],
  callbacks, resource: target ? {method: resourceMethod, descriptor: name === 'ClassFileVerifyFinal' ? '()[B' : '()Ljava/lang/classfile/ClassModel;',
    name: target + '.class', target: prefix + target} : null
});

// Compiler, resource and named callback inventories were selected from the
// original source plan before guest calibration. Observed output defines none
// of these exits; full original bytes are decoded again when receipts replay.
export const classFileInputContracts = freeze({
  'classfile-model': input('ClassFileModelFinal', 'CLASSFILE_MODEL_OK', 'ClassFileModelTarget',
    [cb('collectCallback', '(Ljava/lang/classfile/ClassElement;)V')], 'model'),
  'classfile-build': input('ClassFileBuildFinal', 'CLASSFILE_BUILD_OK', null,
    [cb('buildEmpty', builder), cb('buildInt', builder), cb('codeInt', codeBuilder), cb('buildLong', builder), cb('codeLong', codeBuilder),
      cb('buildDouble', builder), cb('codeDouble', codeBuilder), cb('buildReference', builder), cb('codeReference', codeBuilder),
      cb('buildConstructor', builder), cb('codeConstructor', codeBuilder), cb('codeGetter', codeBuilder), cb('buildSourcefile', builder),
      cb('buildExplicitPool', builder), cb('codeExplicitPool', codeBuilder)]),
  'classfile-transform': input('ClassFileTransformFinal', 'CLASSFILE_TRANSFORM_OK', 'ClassFileTransformTarget',
    [cb('isUnused', '(Ljava/lang/classfile/ClassElement;)Z'), cb('selectAnswer', '(Ljava/lang/classfile/MethodModel;)Z'),
      cb('replaceSourcefile', classTransform), cb('replaceConstant', codeTransform), cb('addMethod', builder), cb('codeAdded', codeBuilder),
      cb('firstConstant', codeTransform), cb('secondConstant', codeTransform), cb('throwCallback', classTransform)], 'model'),
  'classfile-verify': input('ClassFileVerifyFinal', 'CLASSFILE_VERIFY_OK', 'ClassFileVerifyTarget',
    [cb('buildTypedInvalid', builder), cb('codeTypedInvalid', codeBuilder), cb('forbiddenCallback', builder)], 'original')
});

const member = (name, descriptor, flags, code) => ({name, descriptor, flags, code,
  nativeOpcodes: code.map(operation => /^([ailfd]load):([0-3])$/.test(operation) ? operation.replace(':', '_') :
    operation.startsWith('int:') ? 'bipush' : operation.startsWith('double:') ? 'ldc2_w' :
      operation.startsWith('string:') ? 'ldc' : operation.split(':')[0])});
const integer = (name, value) => member(name, '()I', 9, ['int:' + value, 'ireturn']);
const objectConstructor = member('<init>', '()V', 0, ['aload:0', 'invokespecial:java.lang.Object#<init>()V', 'return']);
const transformed = (id, name, answer = 42, {drop = false, added = false, sourceFile = 'ClassFileTransformFinal.java'} = {}) => ({
  id, className: prefix + name, origin: 'public-transform', flags: 0x30, fields: [],
  methods: [objectConstructor, integer('answer', answer), ...(drop ? [] : [integer('debugUnused', 13)]), ...(added ? [integer('added', 101)] : [])],
  sourceFile, definition: 'define-and-invoke'
});
const built = (id, name, methods, fields = [], sourceFile = null, definition = 'define-and-invoke') => ({
  id, className: prefix + name, origin: 'public-build', flags: 0x21, fields, methods, sourceFile, definition
});

// Sixteen output contracts are separate from the original javac inventory.
// A host must produce and exercise its own bytes; native output is never an
// input substitute for a guest public-API operation.
export const classFileArtifactContracts = freeze({
  'cf-model-name-version': [], 'cf-model-flags-locations': [], 'cf-model-super-interfaces': [], 'cf-model-field-symbols': [],
  'cf-model-method-code': [], 'cf-model-traversal-inventory': [], 'cf-model-sourcefile-parent': [], 'cf-model-constantpool': [],
  'cf-build-empty-model': [built('built-empty', 'CfBuiltEmpty', [], [], null, 'define-only')],
  'cf-build-int-execute': [built('built-int', 'CfBuiltInt', [integer('answer', 42)])],
  'cf-build-long-execute': [built('built-long', 'CfBuiltLong', [member('wide', '(JJ)J', 9, ['lload:0', 'lload:2', 'ladd', 'lreturn'])])],
  'cf-build-double-execute': [built('built-double', 'CfBuiltDouble', [member('decimal', '(D)D', 9, ['dload:0', 'double:0.5', 'dadd', 'dreturn'])])],
  'cf-build-reference-execute': [built('built-reference', 'CfBuiltReference', [member('text', '()Ljava/lang/String;', 9, ['string:public-classfile', 'areturn'])])],
  'cf-build-constructor-field': [built('built-constructor', 'CfBuiltConstructor', [
    member('<init>', '(J)V', 1, ['aload:0', 'invokespecial:java.lang.Object#<init>()V', 'aload:0', 'lload:1',
      'putfield:' + prefix + 'CfBuiltConstructor#valueJ', 'return']),
    member('value', '()J', 1, ['aload:0', 'getfield:' + prefix + 'CfBuiltConstructor#valueJ', 'lreturn'])
  ], [{name: 'value', descriptor: 'J', flags: 1}])],
  'cf-build-sourcefile-last': [built('built-sourcefile', 'CfBuiltSourcefile', [integer('answer', 42)], [], 'Selected.java')],
  'cf-build-explicit-pool': [built('built-explicit-pool', 'CfBuiltExplicitPool', [integer('answer', 9)], [{name: 'wide', descriptor: 'J', flags: 1}])],
  'cf-transform-accept-all': [transformed('transformed-accept-all', 'ClassFileTransformTarget')],
  'cf-transform-drop-method': [transformed('transformed-dropped', 'CfTransformDropped', 42, {drop: true})],
  'cf-transform-rename-ownerfree': [transformed('transformed-renamed', 'CfTransformRenamed')],
  'cf-transform-sourcefile': [transformed('transformed-sourcefile', 'CfTransformSourcefile', 42, {sourceFile: 'Transformed.java'})],
  'cf-transform-constant': [transformed('transformed-constant', 'CfTransformConstant', 73)],
  'cf-transform-end-handler': [transformed('transformed-added', 'CfTransformAdded', 42, {added: true})],
  'cf-transform-composition': [transformed('transformed-composed', 'CfTransformComposed', 9)],
  'cf-transform-callback-identity': [],
  'cf-verify-valid-model': [],
  'cf-verify-typed-invalid-return': [built('typed-invalid-return', 'CfTypedInvalid',
    [member('bad', '()I', 9, ['aconst_null', 'areturn'])], [], null, 'forbidden')],
  'cf-verify-bad-magic-list': [], 'cf-verify-bad-magic-parse': [], 'cf-verify-truncated-parse': [],
  'cf-verify-pool-failures': [], 'cf-verify-primitive-build': [], 'cf-verify-null-bytes': []
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
    assert.ok(bindings.length > 0, 'Named callback has a real original bootstrap implementation handle');
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

// Evidence-reader isolation for adversarial unit inputs. This function neither
// claims original compilation nor executes or supplies the public Java API.
export function inspectClassFileArtifactBytes(bytes, contract) {
  const decoded = decodeClass(bytes);
  assert.equal(decoded.className, contract.className); assert.equal(decoded.major, 69); assert.equal(decoded.minor, 0);
  assert.equal(decoded.flags, contract.flags); assert.equal(decoded.superclass, 'java.lang.Object'); assert.deepEqual(decoded.interfaces, []);
  assert.deepEqual(decoded.fields.map(({name, descriptor, flags}) => ({name, descriptor, flags})), contract.fields);
  assert.deepEqual(decoded.methods.map(({name, descriptor, flags}) => ({name, descriptor, flags})),
    contract.methods.map(({name, descriptor, flags}) => ({name, descriptor, flags})), 'Exact generated method inventory/access/nominal signatures');
  for (const [n, method] of decoded.methods.entries()) {
    assert.ok(method.instructions && method.handlers.length === 0, 'Actual branch-free generated Code');
    assert.ok(method.instructions.every(ins => ins.branchTarget === undefined && ins.defaultTarget === undefined &&
      !['ret', 'jsr', 'jsr_w', 'invokedynamic'].includes(ins.name)), 'C7a output does not claim branch/indy support');
    assert.deepEqual(method.instructions.map(canonicalOperation), contract.methods[n].code, 'Actual generated operands and wide slots, not self-reported JVM output');
  }
  assert.deepEqual(decoded.bootstrapMethods, []);
  const sourceFiles = decoded.attributes.filter(item => item.name === 'SourceFile');
  assert.equal(sourceFiles.length, contract.sourceFile === null ? 0 : 1);
  if (contract.sourceFile !== null) {
    assert.equal(sourceFiles[0].length, 2);
    const index = Buffer.from(sourceFiles[0].bodyHex, 'hex').readUInt16BE(0);
    assert.equal(decoded.constants.find(item => item.index === index)?.value, contract.sourceFile);
    assert.equal(decoded.constants.find(item => item.index === index)?.tag, 1);
  }
  return decoded;
}

export function proveClassFileArtifact(bytes, contract, {host, caseId, record}) {
  assert.ok(['native', 'node', 'chromium'].includes(host));
  const expected = classFileArtifactContracts[caseId].find(item => item.id === contract.id); assert.deepEqual(contract, expected);
  const decoded = inspectClassFileArtifactBytes(bytes, contract);
  assertClassFileInputProofs(record, {...classFileInputContracts[record.group], id: record.group, cases: record.cases});
  const route = record.inputProofs.returnedArrayRoutes.find(item => item.caseId === caseId && item.artifactId === contract.id);
  assert.ok(route, 'Artifact operation is bound to the original source/Code route');
  return {schemaVersion: 1, caseId, artifactId: contract.id, producerHost: host, origin: contract.origin,
    genuineCompilerBytes: false, originalInputClassFiles: record.classFiles, originalCaseCodeSha256: route.originalCaseCodeSha256,
    selectedDefinitionRequirement: contract.definition, returnedArrayStaticRoute: route, bytesBase64: bytes.toString('base64'),
    size: bytes.length, sha256: sha(bytes), decoded,
    nativeBytesSubstituted: false, byteForByteNativeParityProven: false, dynamicBranchCoverageProven: false,
    sameJvmDefinitionGeneralConformanceProven: false, fullPublicClassFileApiConformanceProven: false,
    fullBytecodeVerifierConformanceProven: false, fullStackMapConformanceProven: false};
}
