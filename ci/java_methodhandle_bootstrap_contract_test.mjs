import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as harness from './java_methodhandle_bootstrap_test.mjs';
import * as core from './java_methodhandle_core_test.mjs';
import * as collection from './java_methodhandle_collection_test.mjs';
import * as variable from './java_methodhandle_varhandle_test.mjs';
import {registerMethodHandleContractTests} from './java_methodhandle_contract_suite.mjs';
import {generateUserBootstrapFixtures} from './generate_user_bootstrap_fixtures.mjs';
import {inspectUserBootstrapClasses, proveUserBootstrapGroup, assertUserBootstrapProofs} from './java_user_bootstrap_bytecode.mjs';

registerMethodHandleContractTests(harness, {phaseId: 'C4', caseCount: 48, groupCount: 3,
  harnessFilename: 'java_methodhandle_bootstrap_test.mjs', contractFilename: 'java_methodhandle_bootstrap_contract_test.mjs',
  ledgerBase: 'java-methodhandle-bootstrap'});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

test('C4 inventories, source owners and official ledgers cannot substitute C1, C2 or C3', () => {
  assert.deepEqual(harness.methodHandleGroups.map(group => group.id), ['bootstrap-condy', 'bootstrap-indy', 'bootstrap-errors']);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.cases.length), [16, 16, 16]);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.mainClass), [
    'classes.modern_test.BootstrapCondyFinal', 'classes.modern_test.BootstrapIndyFinal', 'classes.modern_test.BootstrapErrorsFinal']);
  for (const first of [core, collection, variable, harness]) for (const second of [core, collection, variable, harness]) {
    if (first === second) continue;
    assert.throws(() => first.assertMethodHandleLedger(second.createMethodHandleLedger()));
    assert.throws(() => first.createMethodHandleLedger('browser', second.methodHandleGroups));
    const ledger = first.createMethodHandleLedger(); ledger.results[0] = structuredClone(second.createMethodHandleLedger().results[0]);
    assert.throws(() => first.assertMethodHandleLedger(ledger));
  }
});

test('selected original bootstrap inputs never promote concurrent or maximal-arity conformance', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) for (const flag of
    ['bootstrapConcurrentLinkageConformanceProven', 'bootstrapMaximalArityConformanceProven']) {
    const original = harness.createMethodHandleLedger(mode); assert.equal(original[flag], false);
    for (const value of [true, 'false', null, undefined, 0]) {
      const changed = structuredClone(original); changed[flag] = value; assert.throws(() => harness.assertMethodHandleLedger(changed));
    }
    const missing = structuredClone(original); delete missing[flag]; assert.throws(() => harness.assertMethodHandleLedger(missing));
  }
});

test('native-first Error retry and repeated wrapper/cause detail remain explicit exclusions', () => {
  const errors = harness.methodHandleGroups[2].cases;
  const unwrapped = errors.filter(entry => entry.id.endsWith('error-passthrough'));
  assert.equal(unwrapped.length, 2);
  for (const entry of unwrapped) {
    assert.ok(entry.trace[0].includes('retry-policy=unclaimed'));
    assert.ok(entry.limitations.some(limit => limit.includes('invoked only once') && limit.includes('pinned native 21/25 retries')));
  }
  for (const entry of errors) assert.ok(entry.limitations.some(limit => limit.includes('wrapper identity') && limit.includes('not claimed')));
  assert.ok(errors.find(entry => entry.id === 'bootstrap-error-indy-runtime-cause').trace[0].includes('repeat-cause-detail=unclaimed'));
});

// Only the call-graph scaffolding is synthetic here. The dynamic instructions,
// CP operands and nested BootstrapMethods bytes under test are the real original
// generated inputs. Full gates separately prove the genuine javac driver graph.
function originalProofFixture(group, release) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-c4-bytecode-contract-'));
  const files = generateUserBootstrapFixtures(group.generatedClassFixture.group, release).map(file => {
    const filename = path.join(directory, file.className.replaceAll('.', '/') + '.class'); fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, file.bytes, {flag: 'wx'});
    return {path: file.className.replaceAll('.', '/') + '.class', sha256: sha(file.bytes), size: file.bytes.length, major: release + 44, minor: 0};
  });
  const classes = inspectUserBootstrapClasses(directory, files), methods = new Map();
  const call = (owner, name, descriptor, pc) => ({pc, opcode: 184, name: 'invokestatic', cp: {tag: 10, owner, name, descriptor}});
  const body = (name, descriptor, instructions) => ({name, descriptor, instructions, codeSha256: 'a'.repeat(64), codeLength: Math.max(1, instructions.length * 3), maxStack: 8, maxLocals: 0, handlers: []});
  methods.set('main([Ljava/lang/String;)V', body('main', '([Ljava/lang/String;)V', group.cases.map((entry, n) =>
    call(group.mainClass, entry.entryMethod, entry.entryDescriptor, n * 3))));
  for (const entry of group.cases) methods.set(entry.entryMethod + entry.entryDescriptor, body(entry.entryMethod, entry.entryDescriptor,
    entry.probes[0].symbolicOperands.map((operand, n) => call(operand.owner, operand.name, operand.descriptor, n * 3))));
  if (group.id === 'bootstrap-errors') {
    methods.set('failure(I)Ljava/lang/Throwable;', body('failure', '(I)Ljava/lang/Throwable;', group.cases.flatMap(entry => entry.probes.slice(1))
      .map((probe, n) => call(probe.className, probe.method, probe.descriptor, n * 3))));
    methods.set('repeated(ILjava/lang/Class;Ljava/lang/Class;Ljava/lang/Throwable;)V', body('repeated', '(ILjava/lang/Class;Ljava/lang/Class;Ljava/lang/Throwable;)V',
      [call(group.mainClass, 'failure', '(I)Ljava/lang/Throwable;', 0)]));
  }
  classes.set(group.mainClass, {file: {path: group.mainClass.replaceAll('.', '/') + '.class', sha256: 'b'.repeat(64), size: 100, major: release + 44, minor: 0}, methods});
  return {directory, files, classes};
}

for (const release of [21, 25]) for (const group of harness.methodHandleGroups) {
  test(`original release ${release} ${group.id} binds every actual Code + bootstrap metadata obligation`, () => {
    const fixture = originalProofFixture(group, release);
    try {
      for (const file of fixture.files) {
        const bytes = fs.readFileSync(path.join(fixture.directory, file.path));
        assert.equal(bytes.readUInt16BE(4), 0); assert.equal(bytes.readUInt16BE(6), release + 44);
      }
      const proofs = proveUserBootstrapGroup(group, fixture.classes); assert.equal(proofs.length, 16);
      assertUserBootstrapProofs({bytecodeProofs: proofs}, group);
      for (const entry of proofs) for (const probe of entry.probes.slice(1)) assert.ok(probe.matches.some(match =>
        [17, 18].includes(match.cp?.tag) && match.cp.bootstrap?.method?.reference?.owner.startsWith('classes.modern_test.BootstrapTestSupport')));
    } finally {fs.rmSync(fixture.directory, {recursive: true, force: true});}
  });
}

test('metadata-only decoys and wrong BSM owner/name/type/kind/static argument cannot prove an executable site', () => {
  const group = harness.methodHandleGroups[0];
  for (const mutate of [instruction => instruction.cp.tag = 18, instruction => instruction.cp.name = 'unused-decoy',
    instruction => instruction.cp.descriptor = 'J', instruction => instruction.cp.bootstrap.method.reference.owner = 'java.lang.invoke.ConstantBootstraps',
    instruction => instruction.cp.bootstrap.method.reference.name = 'nullConstant',
    instruction => instruction.cp.bootstrap.method.reference.descriptor = '(Ljava/lang/Object;)Ljava/lang/Object;',
    instruction => instruction.cp.bootstrap.method.referenceKind = 8,
    instruction => instruction.cp.bootstrap.arguments.push({tag: 8, value: 'unused'})]) {
    const fixture = originalProofFixture(group, 21);
    try {
      const body = fixture.classes.get(group.mainClass.replace(/Final$/, 'Calls')).methods.get('exactInt()I');
      mutate(body.instructions[0]); assert.throws(() => proveUserBootstrapGroup(group, fixture.classes));
    } finally {fs.rmSync(fixture.directory, {recursive: true, force: true});}
  }
});

test('nested dynamic static arguments must retain null/wide types, their own BSM and ordered argument tags', () => {
  const group = harness.methodHandleGroups[0];
  for (const mutate of [instruction => instruction.cp.bootstrap.arguments.reverse(),
    instruction => instruction.cp.bootstrap.arguments[2].value = '9007199254740992',
    instruction => instruction.cp.bootstrap.arguments[8].tag = 8,
    instruction => instruction.cp.bootstrap.arguments[8].bootstrap.method.reference.name = 'constantLong']) {
    const fixture = originalProofFixture(group, 25);
    try {
      mutate(fixture.classes.get(group.mainClass.replace(/Final$/, 'Calls')).methods.get('variableArguments()Ljava/lang/String;').instructions[0]);
      assert.throws(() => proveUserBootstrapGroup(group, fixture.classes));
    } finally {fs.rmSync(fixture.directory, {recursive: true, force: true});}
  }
});

test('two lexical instructions and two methods must really share one CP index, not merely equal symbolic metadata', () => {
  const group = harness.methodHandleGroups[1];
  for (const method of ['lexicalTwice', 'lexicalRight']) {
    const fixture = originalProofFixture(group, 21);
    try {
      const body = fixture.classes.get(group.mainClass.replace(/Final$/, 'Calls')).methods.get(method + '()I');
      body.instructions.filter(instruction => instruction.cp?.tag === 18).at(-1).cp.index++;
      assert.throws(() => proveUserBootstrapGroup(group, fixture.classes));
    } finally {fs.rmSync(fixture.directory, {recursive: true, force: true});}
  }
});

test('retained proofs cannot drop, repeat or alter a lexical bootstrap instruction', () => {
  const group = harness.methodHandleGroups[1], fixture = originalProofFixture(group, 21);
  try {
    const proof = proveUserBootstrapGroup(group, fixture.classes);
    for (const mutate of [decoded => decoded.matches.pop(), decoded => decoded.matches[1].pc = decoded.matches[0].pc,
      decoded => decoded.matches[1].cp.index++, decoded => decoded.matches[0].cp.bootstrap.method.referenceKind = 8]) {
      const changed = structuredClone(proof); mutate(changed.find(entry => entry.id === 'bootstrap-indy-lexical-two-instructions').probes[1]);
      assert.throws(() => assertUserBootstrapProofs({bytecodeProofs: changed}, group));
    }
  } finally {fs.rmSync(fixture.directory, {recursive: true, force: true});}
});

test('original class generator CLI refuses unsupported profiles and overwriting any existing javac or generated class', () => {
  for (const release of [8, 17, 22, 69]) assert.throws(() => generateUserBootstrapFixtures('condy', release));
  assert.throws(() => generateUserBootstrapFixtures('filtered', 21));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-c4-original-input-contract-'));
  try {
    const command = path.join(root, 'ci/generate_user_bootstrap_fixtures.mjs');
    const args = [command, '--group', 'condy', '--release', '21', '--output', directory];
    const first = spawnSync(process.execPath, args, {encoding: 'utf8'}); assert.equal(first.status, 0); assert.equal(first.stdout, ''); assert.equal(first.stderr, '');
    const file = path.join(directory, 'classes/modern_test/BootstrapCondyCalls.class'), original = fs.readFileSync(file);
    const second = spawnSync(process.execPath, args, {encoding: 'utf8'}); assert.notEqual(second.status, 0); assert.deepEqual(fs.readFileSync(file), original);
  } finally {fs.rmSync(directory, {recursive: true, force: true});}
});
