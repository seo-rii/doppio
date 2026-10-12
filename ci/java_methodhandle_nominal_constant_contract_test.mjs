import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as harness from './java_methodhandle_nominal_constant_test.mjs';
import * as core from './java_methodhandle_core_test.mjs';
import * as collection from './java_methodhandle_collection_test.mjs';
import * as variable from './java_methodhandle_varhandle_test.mjs';
import * as bootstrap from './java_methodhandle_bootstrap_test.mjs';
import * as hidden from './java_methodhandle_hidden_class_test.mjs';
import {registerMethodHandleContractTests} from './java_methodhandle_contract_suite.mjs';
import {nominalInputContracts, proveNominalConstantGroup, assertNominalConstantProofs} from './java_nominal_constant_bytecode.mjs';

registerMethodHandleContractTests(harness, {phaseId: 'C6', caseCount: 64, groupCount: 4,
  harnessFilename: 'java_methodhandle_nominal_constant_test.mjs', contractFilename: 'java_methodhandle_nominal_constant_contract_test.mjs',
  ledgerBase: 'java-methodhandle-nominal-constant'});
// Mutate the persisted JSON representation, not shared in-memory receipt aliases.
const clone = value => JSON.parse(JSON.stringify(value));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

test('C6 literal 4x16 inventories and ledger namespaces reject every earlier phase', () => {
  assert.deepEqual(harness.methodHandleGroups.map(group => group.id),
    ['nominal-type', 'nominal-handle', 'nominal-dynamic', 'nominal-varhandle']);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.cases.length), [16, 16, 16, 16]);
  const phases = [core, collection, variable, bootstrap, hidden, harness];
  for (const first of phases) for (const second of phases) {
    if (first === second) continue;
    assert.throws(() => first.assertMethodHandleLedger(second.createMethodHandleLedger()));
    assert.throws(() => first.createMethodHandleLedger('browser', second.methodHandleGroups));
  }
});

test('C6 selected nominal constants leave library completeness and broad runtime claims false', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) for (const flag of
    ['lib007Complete', 'nominalConstantResolutionConformanceProven', 'nominalConstantLoaderLatticeConformanceProven',
      'nominalConstantMaximalArityConformanceProven', 'hiddenClassGarbageCollectionConformanceProven']) {
    const original = harness.createMethodHandleLedger(mode); assert.equal(original[flag], false);
    for (const value of [true, 'false', null, undefined, 0]) {
      const changed = clone(original); changed[flag] = value; assert.throws(() => harness.assertMethodHandleLedger(changed));
    }
    const changed = clone(original); delete changed[flag]; assert.throws(() => harness.assertMethodHandleLedger(changed));
  }
});

test('C6 original javac sources and hidden restriction resources are independently literal', () => {
  for (const group of harness.methodHandleGroups) {
    const expected = nominalInputContracts[group.id];
    assert.equal(group.generatedClassFixture, undefined);
    assert.deepEqual(group.hiddenPayloads, expected.payloads.map(item => item.name));
    for (const mutate of [changed => changed.additionalSources.push('classes/modern_fixture/hiddenclass/HiddenClassSupport.java'),
      changed => changed.additionalSources = [], changed => changed.driverClassNames.pop(),
      changed => changed.driverClassNames.reverse(), changed => changed.completionMarker = 'HIDDEN_CLASS_DATA_OK',
      changed => changed.hiddenPayloads.push(group.mainClass), changed => changed.generatedClassFixture = {},
      changed => changed.source = 'classes/modern_fixture/HiddenClassDataFinal.java']) {
      const groups = clone(harness.methodHandleGroups); mutate(groups.find(item => item.id === group.id));
      assert.throws(() => harness.validateMethodHandleGroups(groups));
    }
    assert.ok(Object.isFrozen(expected.driverClassNames)); assert.ok(Object.isFrozen(expected.payloads));
    assert.ok(Object.isFrozen(group.cases[0].trace));
  }
});

// Synthetic class-reader/mutation inputs ONLY. They are not javac output,
// compiler receipts, native/guest execution or a substitute compatibility
// corpus. Full gates compile the unchanged actual source inventory separately.
function syntheticClass(name, release, {fields = [], methods = [], nestHost = null, flags = 0x21} = {}) {
  const constants = [], cache = new Map();
  const u2 = value => {const result = Buffer.alloc(2); result.writeUInt16BE(value); return result;};
  const u4 = value => {const result = Buffer.alloc(4); result.writeUInt32BE(value); return result;};
  const add = (key, bytes) => {
    if (cache.has(key)) return cache.get(key);
    const index = constants.length + 1; constants.push(bytes); cache.set(key, index); return index;
  };
  const utf = value => add('u:' + value, Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(value)), Buffer.from(value)]));
  const cls = value => {const index = utf(value.replaceAll('.', '/')); return add('c:' + value, Buffer.concat([Buffer.from([7]), u2(index)]));};
  const string = value => {const index = utf(value); return add('s:' + value, Buffer.concat([Buffer.from([8]), u2(index)]));};
  const member = (owner, name, descriptor, tag = 10) => {
    const ownerIndex = cls(owner), a = utf(name), b = utf(descriptor);
    const nt = add('n:' + name + descriptor, Buffer.concat([Buffer.from([12]), u2(a), u2(b)]));
    return add('m:' + tag + owner + name + descriptor, Buffer.concat([Buffer.from([tag]), u2(ownerIndex), u2(nt)]));
  };
  const self = cls(name), parent = cls('java.lang.Object'), codeName = utf('Code');
  const attributes = nestHost ? [Buffer.concat([u2(utf('NestHost')), u4(2), u2(cls(nestHost))])] : [];
  const fieldBytes = fields.map(item => Buffer.concat([u2(item.flags), u2(utf(item.name)), u2(utf(item.descriptor)), u2(0)]));
  const methodBytes = methods.map(item => {
    if (item.flags & 0x0500) return Buffer.concat([u2(item.flags), u2(utf(item.name)), u2(utf(item.descriptor)), u2(0)]);
    const code = Buffer.from(item.code({self, cls, string, member, u2}));
    return Buffer.concat([u2(item.flags), u2(utf(item.name)), u2(utf(item.descriptor)), u2(1), u2(codeName), u4(12 + code.length),
      u2(8), u2(8), u4(code.length), code, u2(0), u2(0)]);
  });
  const header = Buffer.alloc(10); header.writeUInt32BE(0xcafebabe); header.writeUInt16BE(release + 44, 6);
  header.writeUInt16BE(constants.length + 1, 8);
  return Buffer.concat([header, ...constants, u2(flags), u2(self), u2(parent), u2(0), u2(fieldBytes.length), ...fieldBytes,
    u2(methodBytes.length), ...methodBytes, u2(attributes.length), ...attributes]);
}

function syntheticProofFixture(group, release) {
  const expected = nominalInputContracts[group.id], directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-c6-proof-unit-'));
  const classFiles = [];
  const save = (name, bytes) => {
    const relative = name.replaceAll('.', '/') + '.class', target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, bytes, {flag: 'wx'});
    classFiles.push({path: relative, size: bytes.length, sha256: sha(bytes), major: release + 44, minor: 0});
  };
  const resourceMethods = expected.resources.map(item => ({name: item.method, descriptor: item.descriptor, flags: 9,
    code: ({cls, string, member, u2}) => Buffer.concat([Buffer.from([0x12, cls(group.mainClass), 0x12, string(item.name), 0xb8]),
      u2(member('classes.modern_test.NominalConstantSupport', 'bytes', '(Ljava/lang/Class;Ljava/lang/String;)[B')),
      Buffer.from(item.descriptor.endsWith('[B') ? [0xb0] : [0x57, 0xb1])])}));
  for (const payload of expected.payloads) save(payload.name, syntheticClass(payload.name, release, {
    fields: payload.fields, flags: payload.flags, nestHost: group.mainClass, methods: payload.methods.map(item => ({...item,
      code: ({self, member, u2}) => ['selfClass', 'mirror'].includes(item.name) ? [0x12, self, 0xb0] :
        item.name === '<init>' ? Buffer.concat([Buffer.from([0x2a, 0xb7]), u2(member('java.lang.Object', '<init>', '()V')), Buffer.from([0xb1])]) :
          item.descriptor.endsWith('V') ? [0xb1] : [0x01, 0xb0]}))
  }));
  for (const companion of expected.companions) save(companion.name, syntheticClass(companion.name, release, {
    fields: companion.fields, flags: companion.flags, nestHost: companion.name === group.mainClass ? null : group.mainClass,
    methods: [...companion.methods.map(item => ({...item, code: ({member, u2}) => {
      if (item.name === '<clinit>' && companion.counter) {
        // The field reference is a genuine CP Fieldref in this synthetic
        // reader-only input, not a fabricated executed companion body.
        return Buffer.concat([Buffer.from([0xb2]), u2(member(companion.counter.owner,
          companion.counter.name, companion.counter.descriptor, 9)), Buffer.from([0x03, 0xb3]),
          u2(member(companion.counter.owner, companion.counter.name, companion.counter.descriptor, 9)), Buffer.from([0xb1])]);
      }
      return item.descriptor.endsWith('V') ? [0xb1] : [0x01, 0xb0];
    }})), ...(companion.name === group.mainClass ? resourceMethods : [])]
  }));
  if (expected.resources.length && !expected.companions.some(item => item.name === group.mainClass)) save(group.mainClass, syntheticClass(group.mainClass, release, {
    methods: resourceMethods
  }));
  const record = {release, classFiles, nominalConstantProofs: proveNominalConstantGroup(group, directory, classFiles)};
  return {directory, record};
}

for (const release of [21, 25]) for (const group of harness.methodHandleGroups) {
  test(`C6 independent original-input reader ${release} ${group.id} rejects forged Code/resource/flags`, () => {
    const fixture = syntheticProofFixture(group, release);
    try {
      assertNominalConstantProofs(fixture.record, group);
      const mutations = [proof => proof.group = 'hidden-class-identity', proof => proof.schemaVersion++,
        proof => proof.compilerBytesTransformed = true, proof => proof.runtimeNameSuffixComparison = true,
        proof => proof.dynamicBranchCoverageProven = true, proof => proof.fullNominalConstantConformanceProven = true,
        proof => proof.hiddenClassGarbageCollectionConformanceProven = true, proof => proof.opaqueTargetStaticReachabilityProven = true,
        proof => proof.ignored = true, proof => proof.payloads.push({}), proof => proof.resources.push({}), proof => proof.companions.push({})];
      if (fixture.record.nominalConstantProofs.payloads.length) mutations.push(
        proof => proof.payloads.pop(), proof => proof.payloads[0].flags ^= 0x10,
        proof => proof.payloads[0].classFile.sha256 = 'a'.repeat(64), proof => proof.payloads[0].originalThisClassIndex++,
        proof => proof.payloads[0].originalNestHost = 'java.lang.Object', proof => proof.payloads[0].fields.push({}),
        proof => proof.payloads[0].methods.pop(), proof => proof.payloads[0].methods[0].codeSha256 = 'a'.repeat(64),
        proof => proof.payloads[0].originalBytesBase64 = Buffer.from('not-an-original-class').toString('base64'),
        proof => proof.payloads[0].ignored = true);
      if (fixture.record.nominalConstantProofs.resources.length) mutations.push(
        proof => proof.resources.pop(), proof => proof.resources[0].name = 'replacement.class',
        proof => proof.resources[0].driverClassFile.sha256 = 'a'.repeat(64), proof => proof.resources[0].codeHex = 'b1',
        proof => proof.resources[0].instructions[0].name = 'pop', proof => proof.resources[0].resourceInstructionIndex++,
        proof => proof.resources[0].runtimePath = 'replacement.class', proof => proof.resources[0].ignored = true,
        proof => proof.resources[0].driverOriginalBytesBase64 = Buffer.from('replacement-driver').toString('base64'));
      if (fixture.record.nominalConstantProofs.companions.length) mutations.push(
        proof => proof.companions.pop(), proof => proof.companions[0].flags ^= 0x10,
        proof => proof.companions[0].classFile.sha256 = 'a'.repeat(64), proof => proof.companions[0].methods.pop(),
        proof => proof.companions[0].staticReachabilityProven = true,
        proof => proof.companions[0].completeMemberInventoryProven = !proof.companions[0].completeMemberInventoryProven,
        proof => proof.companions[0].selectedMethods.pop(), proof => proof.companions[0].ignored = true,
        proof => proof.companions[0].originalBytesBase64 = Buffer.from('replacement-opaque-target').toString('base64'));
      for (const mutate of mutations) {
        const changed = clone(fixture.record); mutate(changed.nominalConstantProofs);
        assert.throws(() => assertNominalConstantProofs(changed, group));
      }
    } finally {fs.rmSync(fixture.directory, {recursive: true, force: true});}
  });
}
