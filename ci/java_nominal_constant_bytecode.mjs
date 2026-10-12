import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode} from './java_core_bytecode.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const prefix = 'classes.modern_test.';
const support = 'classes/modern_fixture/nominalconstant/NominalConstantSupport.java';
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const bootstrap = '(' + lookup + 'Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;';
const varargBootstrap = '(' + lookup + 'Ljava/lang/String;Ljava/lang/Class;[Ljava/lang/Object;)Ljava/lang/Object;';
const member = (name, descriptor, flags) => ({name, descriptor, flags});
const input = (name, marker, nested, payloads = [], resources = [], companions = []) => ({
  source: 'classes/modern_fixture/' + name + '.java', mainClass: prefix + name,
  completionMarker: marker, additionalSources: [support],
  driverClassNames: [prefix + name, ...nested.map(suffix => prefix + name + '$' + suffix), prefix + 'NominalConstantSupport'],
  payloads, resources, companions
});

// Independent original compiler and hidden-restriction inputs, not an
// inventory derived from a case catalogue or an observed compiler run.
export const nominalInputContracts = freeze({
  'nominal-type': input('NominalTypeFinal', 'NOMINAL_TYPE_OK',
    ['ClassPassiveType', 'MethodPassiveType', 'HiddenPayload'], [
      {name: prefix + 'NominalTypeFinal$HiddenPayload', flags: 0x31, fields: [],
        methods: [{name: '<init>', descriptor: '()V', flags: 1},
          {name: 'selfClass', descriptor: '()Ljava/lang/Class;', flags: 9}]}
    ], [{method: 'payload', descriptor: '()[B', name: 'NominalTypeFinal$HiddenPayload.class',
      payload: prefix + 'NominalTypeFinal$HiddenPayload'}], [
        {name: prefix + 'NominalTypeFinal$ClassPassiveType', flags: 0x30, fields: [],
          methods: [member('<init>', '()V', 2), member('<clinit>', '()V', 8)],
          counter: {owner: prefix + 'NominalTypeFinal', name: 'classInitializations', descriptor: 'I'}},
        {name: prefix + 'NominalTypeFinal$MethodPassiveType', flags: 0x30, fields: [],
          methods: [member('<init>', '()V', 2), member('<clinit>', '()V', 8)],
          counter: {owner: prefix + 'NominalTypeFinal', name: 'methodInitializations', descriptor: 'I'}}
      ]),
  'nominal-handle': input('NominalHandleFinal', 'NOMINAL_HANDLE_OK',
    ['Target', 'Derived', 'WideInterface', 'InterfaceCaller', 'HiddenPayload'], [
      {name: prefix + 'NominalHandleFinal$HiddenPayload', flags: 0x31, fields: [],
        methods: [{name: '<init>', descriptor: '()V', flags: 1},
          {name: 'wide', descriptor: '(J)J', flags: 9},
          {name: 'mirror', descriptor: '()Ljava/lang/Class;', flags: 9}]}
    ], [{method: 'hiddenPayload', descriptor: '()[B', name: 'NominalHandleFinal$HiddenPayload.class',
      payload: prefix + 'NominalHandleFinal$HiddenPayload'}], [
        {name: prefix + 'NominalHandleFinal$Target', flags: 0x21, fields: [
          {name: 'staticValue', descriptor: 'J', flags: 9}, {name: 'calls', descriptor: 'I', flags: 9},
          {name: 'instanceValue', descriptor: 'J', flags: 1}, {name: 'finalValue', descriptor: 'J', flags: 0x11},
          {name: 'privateValue', descriptor: 'J', flags: 2}],
        methods: [member('<init>', '(J)V', 1), member('lookup', '()' + lookup, 9), member('staticWide', '(J)J', 9),
          member('virtualWide', '(J)J', 1), member('specialWide', '(J)J', 1), member('privateWide', '(J)J', 0x0a),
          member('<clinit>', '()V', 8)]},
        {name: prefix + 'NominalHandleFinal$Derived', flags: 0x31, fields: [],
          methods: [member('<init>', '(J)V', 1), member('lookup', '()' + lookup, 9),
            member('virtualWide', '(J)J', 1), member('specialWide', '(J)J', 1)]},
        {name: prefix + 'NominalHandleFinal$WideInterface', flags: 0x0601, fields: [],
          methods: [member('interfaceWide', '(J)J', 0x0401), member('defaultWide', '(J)J', 1), member('staticWide', '(J)J', 9)]},
        {name: prefix + 'NominalHandleFinal$InterfaceCaller', flags: 0x31, fields: [],
          methods: [member('<init>', '()V', 1), member('lookup', '()' + lookup, 9),
            member('interfaceWide', '(J)J', 1), member('defaultWide', '(J)J', 1)]}
      ]),
  'nominal-dynamic': input('NominalDynamicFinal', 'NOMINAL_DYNAMIC_OK', ['Mode', 'HiddenPayload'], [
    {name: prefix + 'NominalDynamicFinal$HiddenPayload', flags: 0x31, fields: [],
      methods: [{name: '<init>', descriptor: '()V', flags: 1},
        {name: 'selfClass', descriptor: '()Ljava/lang/Class;', flags: 9},
        {name: '<clinit>', descriptor: '()V', flags: 8}]}
  ], [{method: 'hiddenPayload', descriptor: '()[B', name: 'NominalDynamicFinal$HiddenPayload.class',
    payload: prefix + 'NominalDynamicFinal$HiddenPayload'}], [
      {name: prefix + 'NominalDynamicFinal', flags: 0x31, completeMemberInventoryProven: false,
        fields: [{name: 'calls', descriptor: 'I', flags: 0x0a}, {name: 'order', descriptor: 'Ljava/lang/String;', flags: 0x0a},
          {name: 'observedLookup', descriptor: 'Ljava/lang/Object;', flags: 0x0a},
          {name: 'observedName', descriptor: 'Ljava/lang/String;', flags: 0x0a},
          {name: 'observedType', descriptor: 'Ljava/lang/Class;', flags: 0x0a},
          {name: 'ERROR', descriptor: 'Ljava/lang/AssertionError;', flags: 0x1a},
          {name: 'CHECKED', descriptor: 'Ljava/lang/Exception;', flags: 0x1a},
          {name: 'dataInits', descriptor: 'I', flags: 9}],
        methods: [member('value', bootstrap, 9), member('privateValue', bootstrap, 0x0a), member('argument', bootstrap, 9),
          member('combine', varargBootstrap, 0x89), member('fresh', bootstrap, 9), member('nothing', bootstrap, 9),
          member('wide', varargBootstrap, 0x89), member('error', bootstrap, 9), member('checked', bootstrap, 9),
          member('wrongFirst', '(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;', 9),
          member('wrongArity', '()Ljava/lang/Object;', 9), member('data', bootstrap, 9)]}
    ]),
  'nominal-varhandle': input('NominalVarHandleFinal', 'NOMINAL_VARHANDLE_OK', ['Target', 'Passive', 'HiddenPayload'], [
    {name: prefix + 'NominalVarHandleFinal$HiddenPayload', flags: 0x31, fields: [{name: 'value', descriptor: 'J', flags: 1}],
      methods: [{name: '<init>', descriptor: '()V', flags: 1},
        {name: 'selfClass', descriptor: '()Ljava/lang/Class;', flags: 9}]}
  ], [{method: 'hiddenPayload', descriptor: '()[B', name: 'NominalVarHandleFinal$HiddenPayload.class',
    payload: prefix + 'NominalVarHandleFinal$HiddenPayload'}], [
      {name: prefix + 'NominalVarHandleFinal$Target', flags: 0x31,
        fields: [{name: 'value', descriptor: 'J', flags: 1}, {name: 'staticValue', descriptor: 'J', flags: 9},
          {name: 'finalValue', descriptor: 'J', flags: 0x11}, {name: 'privateValue', descriptor: 'J', flags: 2}],
        methods: [member('<init>', '()V', 1), member('lookup', '()' + lookup, 9), member('<clinit>', '()V', 8)]},
      {name: prefix + 'NominalVarHandleFinal$Passive', flags: 0x31, fields: [{name: 'value', descriptor: 'J', flags: 1}],
        methods: [member('<init>', '()V', 1), member('<clinit>', '()V', 8)],
        counter: {owner: prefix + 'NominalVarHandleFinal', name: 'passiveInits', descriptor: 'I'}}
    ])
});

function contract(group) {
  const expected = nominalInputContracts[group.id];
  assert.ok(expected, 'Independent mandatory C6 original input group');
  for (const key of ['source', 'mainClass', 'completionMarker', 'driverClassNames', 'additionalSources'])
    assert.deepEqual(group[key], expected[key], 'Independent C6 compiler input: ' + key);
  assert.deepEqual(group.hiddenPayloads, expected.payloads.map(item => item.name));
  return expected;
}

function decodeOriginal(classFile, bytes, name) {
  assert.deepEqual(Object.keys(classFile).sort(), ['path', 'size', 'sha256', 'major', 'minor'].sort());
  assert.equal(classFile.path, name.replaceAll('.', '/') + '.class');
  assert.equal(bytes.length, classFile.size); assert.equal(sha(bytes), classFile.sha256);
  assert.equal(bytes.readUInt16BE(6), classFile.major); assert.equal(bytes.readUInt16BE(4), classFile.minor);
  assert.ok([65, 69].includes(classFile.major) && classFile.minor === 0, 'Original non-preview javac21/25 class');
  const layout = readStructureLayout(bytes), utf = index => {
    assert.equal(layout.pool[index]?.tag, 1); return layout.pool[index].value;
  };
  const className = index => {
    assert.equal(layout.pool[index]?.tag, 7); return utf(layout.pool[index].first).replaceAll('/', '.');
  };
  assert.equal(className(layout.thisClass), name, 'Original named this_class, never a hidden suffix/carrier rewrite');
  const nests = layout.attributes.entries.filter(item => item.name === 'NestHost');
  assert.ok(nests.length <= 1);
  const methods = layout.methods.entries.map(method => {
    if (!method.code) {
      assert.ok(method.flags & 0x0500, 'Only original abstract/native members lack Code');
      return {name: method.name, descriptor: method.descriptor, flags: method.flags, code: null};
    }
    const code = bytes.subarray(method.code.instructionsOffset, method.code.instructionsOffset + method.code.codeLength);
    return {name: method.name, descriptor: method.descriptor, flags: method.flags,
      codeSha256: sha(code), codeHex: code.toString('hex'), instructions: decodeCoreCode(code, layout.pool, bytes),
      maxStack: method.code.maxStack, maxLocals: method.code.maxLocals};
  });
  return {classFile, binaryName: name, flags: layout.flags, originalThisClassIndex: layout.thisClass,
    originalNestHost: nests.length ? className(bytes.readUInt16BE(nests[0].body)) : null,
    fields: layout.fields.entries.map(({name, descriptor, flags}) => ({name, descriptor, flags})), methods,
    originalBytesBase64: bytes.toString('base64')};
}

function decodePayload(classFile, bytes, expected, mainClass) {
  const result = decodeOriginal(classFile, bytes, expected.name);
  assert.equal(result.flags, expected.flags, 'Exact original payload class access flags');
  assert.equal(result.originalNestHost, mainClass, 'Original static nested payload nest, not hidden authority');
  assert.deepEqual(result.fields, expected.fields, 'Exact original payload fields/finality/nominal descriptors');
  assert.deepEqual(result.methods.map(({name, descriptor, flags}) => ({name, descriptor, flags})), expected.methods,
    'Exact original payload constructor/helper signatures and access flags');
  const mirror = result.methods.find(item => ['selfClass', 'mirror'].includes(item.name));
  if (mirror) {
    assert.equal(mirror.instructions.length, 2);
    assert.ok(['ldc', 'ldc_w'].includes(mirror.instructions[0].name));
    assert.equal(mirror.instructions[0].cp?.index, result.originalThisClassIndex, 'Actual ldc uses original this_class CP index');
    assert.equal(mirror.instructions[1].name, 'areturn');
  }
  return result;
}

function decodeCompanion(classFile, bytes, expected, mainClass) {
  const result = decodeOriginal(classFile, bytes, expected.name);
  assert.equal(result.flags, expected.flags, 'Exact original companion class access flags');
  assert.equal(result.originalNestHost, expected.name === mainClass ? null : mainClass,
    'Exact original opaque-target/passive companion nest identity');
  const metadata = result.methods.map(({name, descriptor, flags}) => ({name, descriptor, flags}));
  const completeMemberInventoryProven = expected.completeMemberInventoryProven !== false;
  if (completeMemberInventoryProven) {
    assert.deepEqual(result.fields, expected.fields, 'Exact original opaque-target/passive companion fields');
    assert.deepEqual(metadata, expected.methods, 'Exact original companion target/initializer signatures and access flags');
  } else {
    for (const field of expected.fields) assert.deepEqual(result.fields.find(item => item.name === field.name), field,
      'Literal selected original bootstrap side-effect field');
    for (const method of expected.methods) assert.deepEqual(metadata.find(item => item.name === method.name && item.descriptor === method.descriptor),
      method, 'Literal selected original bootstrap target signature and access/varargs flags');
  }
  if (expected.counter) {
    const initializer = result.methods.find(item => item.name === '<clinit>');
    assert.ok(initializer?.instructions, 'Real original passive initializer Code');
    const read = initializer.instructions.find(item => item.name === 'getstatic' && item.cp?.tag === 9 &&
      ['owner', 'name', 'descriptor'].every(key => item.cp[key] === expected.counter[key]));
    const write = initializer.instructions.find(item => item.name === 'putstatic' && item.cp?.tag === 9 &&
      ['owner', 'name', 'descriptor'].every(key => item.cp[key] === expected.counter[key]));
    assert.ok(read && write && read.pc < write.pc, 'Actual original initializer counter read precedes update');
  }
  return {...result, selectedFields: expected.fields, selectedMethods: expected.methods,
    completeMemberInventoryProven, staticReachabilityProven: false};
}

function decodeResource(classFile, bytes, expected, mainClass) {
  const driver = decodeOriginal(classFile, bytes, mainClass);
  const method = driver.methods.find(item => item.name === expected.method && item.descriptor === expected.descriptor);
  assert.ok(method, 'Original driver resource method');
  const instructions = method.instructions;
  const index = instructions.findIndex((item, i) => ['ldc', 'ldc_w'].includes(item.name) && item.cp?.tag === 7 &&
    item.cp.value === mainClass && ['ldc', 'ldc_w'].includes(instructions[i + 1]?.name) &&
    instructions[i + 1].cp?.tag === 8 && instructions[i + 1].cp.value === expected.name &&
    instructions[i + 2]?.name === 'invokestatic' && instructions[i + 2].cp?.owner === prefix + 'NominalConstantSupport' &&
    instructions[i + 2].cp.name === 'bytes' && instructions[i + 2].cp.descriptor === '(Ljava/lang/Class;Ljava/lang/String;)[B');
  assert.ok(index >= 0, 'Exact adjacent original anchor/resource/shared reader Code operands');
  const runtimePath = expected.name.startsWith('/') ? expected.name.slice(1) :
    mainClass.slice(0, mainClass.lastIndexOf('.') + 1).replaceAll('.', '/') + expected.name;
  assert.equal(runtimePath, expected.payload.replaceAll('.', '/') + '.class');
  return {...expected, driverClassFile: classFile, driverOriginalBytesBase64: driver.originalBytesBase64,
    codeSha256: method.codeSha256, codeHex: method.codeHex, instructions, resourceInstructionIndex: index, runtimePath};
}

export function proveNominalConstantGroup(group, directory, classFiles) {
  const expected = contract(group);
  const file = name => {
    const found = classFiles.find(item => item.path === name.replaceAll('.', '/') + '.class');
    assert.ok(found, 'Original compiler payload/driver file exists'); return found;
  };
  const bytes = entry => fs.readFileSync(path.join(directory, entry.path));
  return {schemaVersion: 1, group: group.id,
    payloads: expected.payloads.map(item => {const entry = file(item.name); return decodePayload(entry, bytes(entry), item, group.mainClass);}),
    resources: expected.resources.map(item => {const entry = file(group.mainClass); return decodeResource(entry, bytes(entry), item, group.mainClass);}),
    companions: expected.companions.map(item => {const entry = file(item.name); return decodeCompanion(entry, bytes(entry), item, group.mainClass);}),
    compilerBytesTransformed: false, runtimeNameSuffixComparison: false, dynamicBranchCoverageProven: false,
    fullNominalConstantConformanceProven: false, hiddenClassGarbageCollectionConformanceProven: false,
    opaqueTargetStaticReachabilityProven: false};
}

function originalBytes(item, key) {
  assert.equal(typeof item[key], 'string'); assert.ok(item[key].length > 0 && item[key].length < 200000);
  const bytes = Buffer.from(item[key], 'base64');
  assert.equal(bytes.toString('base64'), item[key], 'Canonical original javac byte receipt'); return bytes;
}

export function assertNominalConstantProofs(record, group) {
  const expected = contract(group), proof = record.nominalConstantProofs;
  assert.deepEqual(Object.keys(proof || {}).sort(), ['schemaVersion', 'group', 'payloads', 'resources', 'companions',
    'compilerBytesTransformed', 'runtimeNameSuffixComparison', 'dynamicBranchCoverageProven',
    'fullNominalConstantConformanceProven', 'hiddenClassGarbageCollectionConformanceProven', 'opaqueTargetStaticReachabilityProven'].sort());
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.group, group.id);
  for (const flag of ['compilerBytesTransformed', 'runtimeNameSuffixComparison', 'dynamicBranchCoverageProven',
    'fullNominalConstantConformanceProven', 'hiddenClassGarbageCollectionConformanceProven', 'opaqueTargetStaticReachabilityProven']) assert.equal(proof[flag], false);
  assert.equal(proof.payloads.length, expected.payloads.length); assert.equal(proof.resources.length, expected.resources.length);
  assert.equal(proof.companions.length, expected.companions.length);
  for (const [n, item] of proof.payloads.entries()) {
    const classFile = record.classFiles.find(file => file.path === expected.payloads[n].name.replaceAll('.', '/') + '.class');
    assert.ok(classFile && classFile.major === record.release + 44);
    assert.deepEqual(item, decodePayload(classFile, originalBytes(item, 'originalBytesBase64'), expected.payloads[n], group.mainClass),
      'Independent replay of every original payload byte rejects metadata/Code substitution');
  }
  for (const [n, item] of proof.resources.entries()) {
    const classFile = record.classFiles.find(file => file.path === group.mainClass.replaceAll('.', '/') + '.class');
    assert.ok(classFile && classFile.major === record.release + 44);
    assert.deepEqual(item, decodeResource(classFile, originalBytes(item, 'driverOriginalBytesBase64'), expected.resources[n], group.mainClass),
      'Independent replay binds the complete actual driver Code and original hidden-class resource');
  }
  for (const [n, item] of proof.companions.entries()) {
    const classFile = record.classFiles.find(file => file.path === expected.companions[n].name.replaceAll('.', '/') + '.class');
    assert.ok(classFile && classFile.major === record.release + 44);
    assert.deepEqual(item, decodeCompanion(classFile, originalBytes(item, 'originalBytesBase64'), expected.companions[n], group.mainClass),
      'Independent raw target/initializer bytes reject invented member bodies or static reachability');
  }
}
