import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as harness from './java_methodhandle_hidden_class_test.mjs';
import * as core from './java_methodhandle_core_test.mjs';
import * as collection from './java_methodhandle_collection_test.mjs';
import * as variable from './java_methodhandle_varhandle_test.mjs';
import * as bootstrap from './java_methodhandle_bootstrap_test.mjs';
import {registerMethodHandleContractTests} from './java_methodhandle_contract_suite.mjs';
import {hiddenPayloadContracts, proveHiddenClassGroup, assertHiddenClassProofs} from './java_hidden_class_bytecode.mjs';

registerMethodHandleContractTests(harness, {phaseId: 'C5', caseCount: 48, groupCount: 3,
  harnessFilename: 'java_methodhandle_hidden_class_test.mjs', contractFilename: 'java_methodhandle_hidden_class_contract_test.mjs',
  ledgerBase: 'java-methodhandle-hidden-class'});
// A persisted JSON ledger duplicates shared source object identities. Mutate
// the receipt as loaded from disk, not an in-memory alias of classFiles.
const clone = value => JSON.parse(JSON.stringify(value));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('C5 literal inventories and namespaces are independent of every earlier phase', () => {
  assert.deepEqual(harness.methodHandleGroups.map(group => group.id),
    ['hidden-class-definition', 'hidden-class-identity', 'hidden-class-data']);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.cases.length), [16, 16, 16]);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.driverClassNames.length), [6, 4, 3]);
  for (const first of [core, collection, variable, bootstrap, harness]) for (const second of [core, collection, variable, bootstrap, harness]) {
    if (first === second) continue;
    assert.throws(() => first.assertMethodHandleLedger(second.createMethodHandleLedger()));
    assert.throws(() => first.createMethodHandleLedger('browser', second.methodHandleGroups));
  }
});

test('all selected hidden modes keep module and GC-lifetime conformance explicitly false', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) for (const flag of
    ['hiddenClassGarbageCollectionConformanceProven', 'hiddenClassNamedModuleConformanceProven']) {
    const original = harness.createMethodHandleLedger(mode); assert.equal(original[flag], false);
    for (const value of [true, 'false', null, undefined, 0]) {
      const changed = clone(original); changed[flag] = value; assert.throws(() => harness.assertMethodHandleLedger(changed));
    }
    const changed = clone(original); delete changed[flag]; assert.throws(() => harness.assertMethodHandleLedger(changed));
  }
});

test('C5 uses only bounded explicit original javac sources and literal hidden payloads', () => {
  for (const group of harness.methodHandleGroups) {
    assert.equal(group.generatedClassFixture, undefined);
    assert.deepEqual(group.hiddenPayloads, hiddenPayloadContracts[group.id].payloads.map(item => item.name));
    for (const mutate of [changed => changed.hiddenPayloads.pop(), changed => changed.hiddenPayloads.length > 1 ?
      changed.hiddenPayloads.reverse() : changed.hiddenPayloads[0] = 'java.lang.Object',
      changed => changed.hiddenPayloads.push(group.mainClass), changed => changed.generatedClassFixture = {}]) {
      const groups = clone(harness.methodHandleGroups); mutate(groups.find(item => item.id === group.id));
      assert.throws(() => harness.validateMethodHandleGroups(groups));
    }
    assert.ok(Object.isFrozen(group.cases[0].trace));
    assert.ok(Object.isFrozen(hiddenPayloadContracts[group.id].payloads[0].methods));
  }
});

test('C5 scope records unknown suffixes, original self descriptors, single-failure checks and no C6 promotion', () => {
  for (const entry of harness.methodHandleGroups.flatMap(group => group.cases)) {
    assert.ok(entry.limitations.some(value => value.includes('suffix') && value.includes('mixed-invalid')));
    assert.ok(entry.limitations.some(value => value.includes('descriptors') && value.includes('not rewritten')));
    assert.ok(entry.limitations.some(value => value.includes('Nominal constant resolution')));
  }
  assert.ok(harness.methodHandleGroups[0].cases.find(item => item.id === 'hc-definition-self-return-verification')
    .trace[0].includes('VerifyError'));
});

test('only the specified classDataAt bounds family allows implementation subclasses, without an exception allowlist', () => {
  const entry = harness.methodHandleGroups[2].cases.find(item => item.id === 'hc-data-list-bounds');
  assert.ok(entry.trace[0].includes('IndexOutOfBoundsException-family'));
  assert.ok(entry.limitations.some(value => value.includes('may throw a subclass') && value.includes('no exception is rewritten')));
  const source = fs.readFileSync(path.resolve('classes/modern_fixture/hiddenclass/HiddenClassSupport.java'), 'utf8');
  assert.ok(source.includes('expected == IndexOutOfBoundsException.class ? expected.isInstance(error) : error.getClass() == expected'));
  const definition = source.slice(source.indexOf('Throwable rejectDefinition'), source.indexOf('Throwable rejectData('));
  assert.ok(definition.includes('check(error.getClass() == expected)'));
  assert.ok(!definition.includes('expected.isInstance'));
  for (const item of harness.methodHandleGroups.flatMap(group => group.cases)) assert.equal(item.exceptionAllowlist, undefined);
});

// Synthetic reader/mutation inputs ONLY. These unit bytes are never substituted
// into a compatibility run, are not javac output, and prove no guest/native
// execution. Full gates separately compile and execute the actual source corpus.
function syntheticClass(name, release, {fields = [], methods = [], nestHost = null, interfaceClass = false} = {}) {
  const constants = [], cache = new Map();
  const u2 = value => {const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes;};
  const u4 = value => {const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes;};
  const add = (key, bytes) => {if (cache.has(key)) return cache.get(key); const index = constants.length + 1; constants.push(bytes); cache.set(key, index); return index;};
  const utf = value => add('u:' + value, Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(value)), Buffer.from(value)]));
  const cls = value => {const index = utf(value.replaceAll('.', '/')); return add('c:' + value, Buffer.concat([Buffer.from([7]), u2(index)]));};
  const string = value => {const index = utf(value); return add('s:' + value, Buffer.concat([Buffer.from([8]), u2(index)]));};
  const member = (owner, name, descriptor, tag = 10) => {
    const classIndex = cls(owner), a = utf(name), b = utf(descriptor);
    const nt = add('n:' + name + descriptor, Buffer.concat([Buffer.from([12]), u2(a), u2(b)]));
    return add('m:' + tag + owner + name + descriptor, Buffer.concat([Buffer.from([tag]), u2(classIndex), u2(nt)]));
  };
  const self = cls(name), parent = cls('java.lang.Object'), codeName = utf('Code');
  const attributes = nestHost ? [Buffer.concat([u2(utf('NestHost')), u4(2), u2(cls(nestHost))])] : [];
  const fieldBytes = fields.map(item => Buffer.concat([u2(item.flags), u2(utf(item.name)), u2(utf(item.descriptor)), u2(0)]));
  const methodBytes = methods.map(item => {
    const code = Buffer.from(item.code({self, cls, string, member, u2}));
    return Buffer.concat([u2(item.flags || 1), u2(utf(item.name)), u2(utf(item.descriptor)), u2(1), u2(codeName), u4(12 + code.length),
      u2(8), u2(8), u4(code.length), code, u2(0), u2(0)]);
  });
  const header = Buffer.alloc(10); header.writeUInt32BE(0xcafebabe); header.writeUInt16BE(release + 44, 6); header.writeUInt16BE(constants.length + 1, 8);
  return Buffer.concat([header, ...constants, u2(interfaceClass ? 0x601 : 0x21), u2(self), u2(parent), u2(0),
    u2(fieldBytes.length), ...fieldBytes, u2(methodBytes.length), ...methodBytes, u2(attributes.length), ...attributes]);
}

function syntheticProofFixture(group, release) {
  const expected = hiddenPayloadContracts[group.id], directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-c5-proof-unit-')), classFiles = [];
  const save = (name, bytes) => {
    const relative = name.replaceAll('.', '/') + '.class', target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, bytes, {flag: 'wx'});
    classFiles.push({path: relative, sha256: sha(bytes), size: bytes.length, major: release + 44, minor: 0});
  };
  for (const item of expected.payloads) save(item.name, syntheticClass(item.name, release, {
    fields: item.fields, nestHost: item.role === 'foreign-package-rejection' ? null : group.mainClass,
    interfaceClass: item.role === 'accepted-interface', methods: item.methods.map(signature => {
      const split = signature.indexOf('('), name = signature.slice(0, split), descriptor = signature.slice(split);
      return {name, descriptor, flags: name === '<clinit>' || ['mirror', 'readSecret', 'selfData', 'staticValue', 'value'].includes(name) ? 9 : 1,
        code: ({self, member, string, cls, u2}) => {
          if (name === 'self') return [0x2a, 0xb0];
          if (name === 'nominalSelf') return [0x01, 0xb0];
          if (name === 'mirror') return [0x12, self, 0xb0];
          if (name === 'readSecret') return Buffer.concat([Buffer.from([0xb2]), u2(member(group.mainClass, 'secret', 'J', 9)),
            Buffer.from([0x3f, 0x03, 0xb3]), u2(member(group.mainClass, 'secretReads', 'I', 9)), Buffer.from([0x1e, 0xad])]);
          if (name === 'selfData') return Buffer.concat([Buffer.from([0xb8]),
            u2(member('java.lang.invoke.MethodHandles', 'lookup', '()Ljava/lang/invoke/MethodHandles$Lookup;')),
            Buffer.from([0x12, string('_'), 0x12, cls('java.lang.Object'), 0xb8]),
            u2(member('java.lang.invoke.MethodHandles', 'classData', '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;')),
            Buffer.from([0xb0])]);
          return descriptor.endsWith('V') ? [0xb1] : [0x03, 0xac];
        }};
    })}));
  save(group.mainClass, syntheticClass(group.mainClass, release, {methods: expected.resources.map(item => ({
    name: item.method, descriptor: item.descriptor, flags: 9,
    code: ({cls, string, member, u2}) => Buffer.concat([Buffer.from([0x12, cls(group.mainClass), 0x12, string(item.name), 0xb8]),
      u2(member('classes.modern_test.HiddenClassSupport', 'bytes', '(Ljava/lang/Class;Ljava/lang/String;)[B')),
      Buffer.from(item.descriptor.endsWith('[B') ? [0xb0] : [0x57, 0xb1])])}))}));
  const record = {release, classFiles, hiddenPayloadProofs: proveHiddenClassGroup(group, directory, classFiles)};
  return {directory, record};
}

for (const release of [21, 25]) for (const group of harness.methodHandleGroups) {
  test(`C5 reader contract ${release} ${group.id} replays original bytes and rejects metadata substitution`, () => {
    const fixture = syntheticProofFixture(group, release);
    try {
      assertHiddenClassProofs(fixture.record, group);
      for (const mutate of [
        proof => proof.payloads.pop(), proof => proof.payloads.length > 1 ? proof.payloads.reverse() : proof.payloads[0].role = 'replacement',
        proof => proof.payloads[0].classFile.sha256 = 'a'.repeat(64),
        proof => proof.payloads[0].flags ^= 0x10, proof => proof.payloads[0].originalThisClassIndex++,
        proof => proof.payloads[0].originalNestHost = 'java.lang.Object', proof => proof.payloads[0].methods[0].codeSha256 = 'a'.repeat(64),
        proof => proof.payloads[0].methods.pop(), proof => proof.payloads[0].ignored = true,
        proof => proof.payloads[0].originalBytesBase64 = Buffer.from('not-a-class').toString('base64'),
        proof => proof.resources.pop(), proof => proof.resources[0].name = 'another.class',
        proof => proof.resources[0].driverClassFile.sha256 = 'a'.repeat(64), proof => proof.resources[0].instructions[0].name = 'pop',
        proof => proof.resources[0].instructions[1].pc++, proof => proof.resources[0].instructions[2].cp.name = 'loadAlternative',
        proof => proof.resources[0].runtimePath = 'replacement.class', proof => proof.resources[0].ignored = true,
        proof => proof.compilerBytesTransformed = true, proof => proof.runtimeNameSuffixComparison = true,
        proof => proof.fullHiddenClassConformanceProven = true, proof => proof.dynamicBranchCoverageProven = true,
        proof => proof.ignored = true
      ]) {
        const changed = clone(fixture.record); mutate(changed.hiddenPayloadProofs);
        assert.throws(() => assertHiddenClassProofs(changed, group));
      }
    } finally {fs.rmSync(fixture.directory, {recursive: true, force: true});}
  });
}
