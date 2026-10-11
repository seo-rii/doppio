import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {memberAccessCases, memberAccessSources, assertMemberAccessCodeProof, assertMemberAccessEvolution,
  assertMemberAccessResult, checkMemberAccessExecution, assertMemberAccessClasspath,
  assertMemberAccessProvenance, writeMemberAccessLedger, memberAccessLedgerScope} from './java_member_access_test.mjs';

function success() {
  return {status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false, error: null, stderr: '',
    stdout: memberAccessCases().flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`)).concat(['MEMBER_ACCESS_OK', '']).join('\n')};
}

// Controlled declaration records test provenance assertions only. They are not
// classfiles, executed fixtures, compiler output or native/guest evidence.
function literal(owner, index = 7, method = 'run') {
  return {classReferences: [{index, name: owner}], references: [], nestHost: null,
    methods: [{name: method, descriptor: '()Ljava/lang/Class;', instructionsHex: `12${index.toString(16).padStart(2, '0')}b0`}]};
}

function staticMember(owner, field = true) {
  return {classReferences: [], nestHost: null, references: [{index: 7, kind: field ? 9 : 10, owner,
    name: field ? 'field' : 'value', descriptor: field ? 'I' : '()I'}],
    methods: [{name: 'run', descriptor: '()I', instructionsHex: `${field ? 'b2' : 'b8'}0007ac`}]};
}

test('mandatory access inventory retains all package/loader, nest and sticky-reference boundaries', () => {
  const cases = memberAccessCases();
  assert.deepEqual(cases.map(entry => entry.id), [
    'package-field-shared', 'package-field-split', 'package-method-shared', 'package-method-split',
    'protected-field-shared', 'protected-field-split', 'protected-method-shared', 'protected-method-split',
    'protected-subclass-field', 'protected-subclass-method', 'hidden-class-shared', 'hidden-class-split',
    'hidden-array-shared', 'hidden-array-split', 'evolved-class-public', 'evolved-class-hidden',
    'evolved-array-public', 'evolved-array-hidden', 'nest-field-valid', 'nest-method-valid', 'nest-constructor-valid',
    'nest-field-plain', 'nest-method-plain', 'nest-constructor-plain', 'nest-field-unlisted', 'nest-method-unlisted',
    'nest-constructor-unlisted', 'nest-field-split', 'nest-method-split', 'nest-constructor-split',
    'nest-host-failure-sticky', 'class-resolution-failure-sticky', 'field-resolution-failure-sticky', 'method-resolution-failure-sticky',
    'class-resolution-transient-oome', 'nest-host-transient-oome', 'nest-members-transient-oome'
  ]);
  assert.equal(new Set(cases.map(entry => entry.id)).size, 37);
  for (const entry of cases) {
    assert.equal(entry.packageId, 'JVM-002'); assert.equal(entry.mutation, false); assert.equal(entry.throwableIdentityCompared, false);
    for (const release of [21, 25]) assert.ok(entry.specificationRefs[release].includes(
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-5.4.4`));
  }
});

test('separate javac evolution preserves old nest members and mounts only intended replacement hosts', () => {
  const stages = memberAccessSources();
  assert.deepEqual(stages.map(stage => [stage.stage, stage.sources.length, stage.sources.flatMap(source => source.emits).length, stage.mount.length]),
    [['baseline', 23, 26, 26], ['hidden', 1, 1, 1], ['plain', 1, 1, 1], ['unlisted', 1, 2, 1]]);
  assert.deepEqual([...new Set(memberAccessCases().flatMap(entry => entry.payloads))].sort(),
    stages.flatMap(stage => stage.mount.map(name => `${stage.stage}:${name}`)).sort());
  const host = stage => stages.find(entry => entry.stage === stage).sources.find(source => source.binaryName === 'nests.Host').text;
  assert.match(host('baseline'), /private static int secret/); assert.match(host('baseline'), /private Host\(\)/);
  assert.match(host('baseline'), /class Member/); assert.match(host('baseline'), /class Probe/);
  assert.doesNotMatch(host('plain'), /class Member|class Probe|class Retained/);
  assert.match(host('unlisted'), /class Retained/); assert.doesNotMatch(host('unlisted'), /class Member|class Probe/);
  assert.deepEqual(memberAccessSources(), stages);
});

test('runtime package checks preserve protected subclass positives and array-leaf access denials', () => {
  const find = id => memberAccessCases().find(entry => entry.id === id);
  for (const access of ['package', 'protected']) for (const kind of ['field', 'method']) {
    assert.equal(find(`${access}-${kind}-shared`).expectedError, null);
    assert.deepEqual(find(`${access}-${kind}-split`).trace, ['metadata-ready-no-effects', 'defining-loaders=distinct',
      'java.lang.IllegalAccessError@invoke', 'effects=none']);
  }
  for (const kind of ['field', 'method']) {
    assert.equal(find(`protected-subclass-${kind}`).expectedError, null);
    assert.equal(find(`protected-subclass-${kind}`).trace[1], 'defining-loaders=distinct');
  }
  for (const id of ['hidden-class-split', 'hidden-array-split', 'evolved-class-hidden', 'evolved-array-hidden']) {
    assert.equal(find(id).expectedError, 'java.lang.IllegalAccessError'); assert.equal(find(id).expectedEffects, '');
  }
});

test('nest fallback denies all private member kinds without confusing new-time initialization with invocation', () => {
  const find = id => memberAccessCases().find(entry => entry.id === id);
  for (const mode of ['plain', 'unlisted', 'split']) for (const operation of ['field', 'method', 'constructor']) {
    const entry = find(`nest-${operation}-${mode}`);
    assert.equal(entry.expectedError, 'java.lang.IllegalAccessError'); assert.ok(entry.trace.includes('nest-host=self'));
    assert.ok(entry.trace.includes('nestmate=false'));
    assert.equal(entry.expectedEffects, operation === 'constructor' ? 'nest-init' : '');
  }
  for (const operation of ['field', 'method', 'constructor']) {
    const entry = find(`nest-${operation}-valid`);
    assert.equal(entry.expectedError, null); assert.ok(entry.trace.includes('nest-members=host:4,member:4'));
    assert.ok(entry.trace.includes('nestmate=true'));
  }
});

test('class and member failure retries remain per-reference while a new caller may succeed', () => {
  for (const kind of ['class', 'field', 'method']) {
    const entry = memberAccessCases().find(entry => entry.id === `${kind}-resolution-failure-sticky`);
    assert.equal(entry.referenceKind, kind);
    for (const [phase, count] of [['prepare', 0], ['first', 1], ['retry', 1], ['independent', 2], ['after-publication', 2]]) {
      assert.ok(entry.trace.includes(`load-attempts@${phase}=${count}`));
    }
    for (const phase of ['first', 'retry', 'after-publication']) assert.ok(entry.trace.includes(`java.lang.NoClassDefFoundError@${phase}`));
    assert.ok(entry.trace.includes('accepted@independent'));
  }
  const nest = memberAccessCases().find(entry => entry.id === 'nest-host-failure-sticky');
  assert.equal(nest.trace[0], 'load-attempts@self-nestmate=0');
  assert.ok(nest.trace.includes('nest-host=self-without-throw'));
  assert.ok(nest.trace.includes('java.lang.NoClassDefFoundError@same-cp'));
});

test('executable CP proof rejects unrelated entries and opcode bytes embedded in operands', () => {
  for (const [binaryName, owner, field] of [['access.PackageFieldCaller', 'access/PackageOwner', true],
    ['access.ProtectedMethodCaller', 'access/ProtectedOwner', false], ['outside.ProtectedSubclassField', 'outside/ProtectedSubclassField', true],
    ['retry.FreshMethodCaller', 'retry/Target', false]]) {
    const declarations = staticMember(owner, field);
    assertMemberAccessCodeProof(declarations, binaryName);
    for (const property of ['owner', 'name', 'descriptor']) {
      const wrong = structuredClone(declarations); wrong.references[0][property] = 'wrong';
      assert.throws(() => assertMemberAccessCodeProof(wrong, binaryName), /CP operand/);
    }
    const wrongIndex = structuredClone(declarations); wrongIndex.methods[0].instructionsHex = `${field ? 'b2' : 'b8'}0008ac`;
    wrongIndex.references.push({...wrongIndex.references[0], index: 8, owner: 'Unrelated'});
    assert.throws(() => assertMemberAccessCodeProof(wrongIndex, binaryName), /CP operand/);
    const operandOnly = structuredClone(declarations); operandOnly.methods[0].instructionsHex = `11${field ? 'b2' : 'b8'}00ac`;
    assert.throws(() => assertMemberAccessCodeProof(operandOnly, binaryName), /instruction boundary/);
  }
});

test('selected native VM-error policy retries host determination unlike sticky missing-host SELF fallback', () => {
  const find = id => memberAccessCases().find(entry => entry.id === id);
  const ordinary = find('class-resolution-transient-oome');
  assert.ok(ordinary.trace.includes('java.lang.OutOfMemoryError@first'));
  assert.ok(ordinary.trace.includes('accepted@retry')); assert.ok(ordinary.trace.includes('load-attempts@retry=2'));
  const host = find('nest-host-transient-oome');
  assert.ok(host.trace.includes('java.lang.OutOfMemoryError@getNestHost-first'));
  assert.ok(host.trace.includes('accepted@getNestHost-retry')); assert.ok(host.trace.includes('nest-host=host-after-retry'));
  assert.ok(host.trace.includes('accepted@same-cp'));
  const members = find('nest-members-transient-oome');
  assert.ok(members.trace.includes('java.lang.OutOfMemoryError@getNestMembers-first'));
  assert.ok(members.trace.includes('accepted@getNestMembers-retry')); assert.ok(members.trace.includes('nest-members=4'));
  for (const entry of [ordinary, host, members]) {
    assert.ok(entry.trace.includes('load-attempts@cached=2')); assert.equal(entry.trace.at(-1), 'effects=none');
    assert.equal(entry.resourceErrorPolicy.id, 'pinned-native-transient-vme');
    assert.equal(entry.resourceErrorPolicy.normativeExceptionTiming, false);
    assert.match(entry.resourceErrorPolicy.description, /JVMS 5\.4\.4 alone does not require/);
    assert.equal(entry.resourceErrorPolicy.specificationRefs.length, 2);
  }
});

test('nest fallback proof requires the host literal and NestHost to use the identical CP index', () => {
  const declarations = literal('nests/Host', 7, 'hostLiteral'); declarations.nestHost = {index: 7, name: 'nests/Host'};
  assertMemberAccessCodeProof(declarations, 'nests.Host$Probe');
  const separateReference = structuredClone(declarations);
  separateReference.classReferences.push({index: 8, name: 'nests/Host'}); separateReference.nestHost.index = 8;
  assert.throws(() => assertMemberAccessCodeProof(separateReference, 'nests.Host$Probe'), /SAME genuine class CP entry/);
  const array = literal('[[Laccess/Hidden;'); assertMemberAccessCodeProof(array, 'access.HiddenArrayCaller');
  array.methods[0].instructionsHex = '1208b0'; array.classReferences.push({index: 8, name: '[[Laccess/Visible;'});
  assert.throws(() => assertMemberAccessCodeProof(array, 'access.HiddenArrayCaller'), /exact class or array leaf/);
});

test('complete exact output rejects taxonomy, phase, identity, retry-count and initialization drift', () => {
  const result = success(); assert.equal(assertMemberAccessResult(result).length, 37);
  assert.doesNotThrow(() => assertMemberAccessResult({...result, stdout: result.stdout.replaceAll('\n', '\r\n')}));
  for (const change of [{status: 'failed'}, {exitCode: 1}, {stderr: 'warning'}, {timedOut: true}, {signal: 'SIGKILL'},
    {error: 'launch'}, {outputLimitExceeded: true}, {stdout: result.stdout.replace('IllegalAccessError@invoke', 'IllegalAccessError@prepare')},
    {stdout: result.stdout.replace('IllegalAccessError@invoke', 'NoClassDefFoundError@invoke')},
    {stdout: result.stdout.replace('nest-host=self', 'nest-host=host')}, {stdout: result.stdout.replace('nestmate=false', 'nestmate=true')},
    {stdout: result.stdout.replace('load-attempts@retry=1', 'load-attempts@retry=2')},
    {stdout: result.stdout.replace('effects=none', 'effects=nest-init')}, {stdout: result.stdout.replace('MEMBER_ACCESS_OK\n', '')},
    {stdout: result.stdout + 'extra\n'}]) assert.throws(() => assertMemberAccessResult({...result, ...change}));
  for (const entry of memberAccessCases()) assert.throws(() => assertMemberAccessResult({...result,
    stdout: result.stdout.replace(`${entry.id}=${entry.trace[0]}\n`, '')}));
});

test('failed raw execution remains in the ledger after post-execution integrity or launch failures', async () => {
  const record = {release: 21, status: 'running', executions: []};
  await checkMemberAccessExecution(record, 'native', async () => success());
  assert.equal(record.executions[0].outcomes.length, 37);
  const failed = {...success(), status: 'failed', exitCode: 1};
  await assert.rejects(checkMemberAccessExecution(record, 'node', async () => failed));
  assert.deepEqual(record.executions[1].result, failed);
  let checks = 0;
  await assert.rejects(checkMemberAccessExecution(record, 'chromium', async () => success(), () => {
    if (++checks === 2) throw new Error('Changed input');
  }), /Changed input/);
  assert.deepEqual(record.executions[2].result, success()); assert.equal(record.status, 'failed');
  await assert.rejects(checkMemberAccessExecution(record, 'node', async () => { throw new Error('Launch failure'); }), /Launch failure/);
  assert.match(record.executions[3].error, /Launch failure/);
  await assert.rejects(checkMemberAccessExecution(record, 'unknown', async () => success()), /Known execution host/);
});

test('evolution inventory rejects recompilation of old callers or nest members as mounted replacements', () => {
  const stages = memberAccessSources().map((plan, index) => ({stage: plan.stage, originals: plan.sources.flatMap(source => source.emits)
    .map(name => ({path: `${name.replaceAll('.', '/')}.class`, sha256: String(index).repeat(64)}))}));
  const evolution = assertMemberAccessEvolution(stages);
  assert.equal(evolution.replacements.length, 3); assert.equal(evolution.unmountedCompilerOutputs.length, 1);
  assert.equal(evolution.unmountedCompilerOutputs[0].path, 'nests/Host$Retained.class');
  assert.ok(evolution.oldCallersAndNestMembers.some(entry => entry.path === 'nests/Host$Probe.class'));
  const extra = structuredClone(stages); extra[1].originals.push({path: 'outside/VisibleCaller.class', sha256: 'a'.repeat(64)});
  assert.throws(() => assertMemberAccessEvolution(extra), /Exact javac output inventory/);
  const unchanged = structuredClone(stages); unchanged[1].originals[0].sha256 = '0'.repeat(64);
  assert.throws(() => assertMemberAccessEvolution(unchanged), /change owner bytes/);
});

test('classpath evidence permits only driver classes and exact resource-only payloads', () => {
  const driver = ['classes/modern_test/JavaMemberAccess$PayloadLoader.class', 'classes/modern_test/JavaMemberAccess.class']
    .map((filename, index) => ({path: filename, size: index + 1, sha256: String(index).repeat(64)}));
  const payload = {resource: {path: 'member-access-cases/baseline/nests/Host.bin', size: 3, sha256: '2'.repeat(64)}};
  assertMemberAccessClasspath([...driver, payload.resource], driver, [payload]);
  assert.throws(() => assertMemberAccessClasspath(driver, driver, [payload]));
  assert.throws(() => assertMemberAccessClasspath([...driver, payload.resource, {path: 'nests/Host.class', size: 3, sha256: '2'.repeat(64)}], driver, [payload]));
  const wrong = {resource: {...payload.resource, path: 'nests/Host.class'}};
  assert.throws(() => assertMemberAccessClasspath([...driver, wrong.resource], driver, [wrong]));
});

test('official provenance requires a clean unchanged commit and atomic ledgers refuse unrelated targets', () => {
  const clean = {commit: 'a'.repeat(40), trackedDirty: false};
  assertMemberAccessProvenance(clean, clean);
  assert.throws(() => assertMemberAccessProvenance({...clean, trackedDirty: true}, clean));
  assert.throws(() => assertMemberAccessProvenance(clean, {...clean, trackedDirty: true}));
  assert.throws(() => assertMemberAccessProvenance(clean, {...clean, commit: 'b'.repeat(40)}));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-access-ledger-unit-'));
  try {
    const filename = path.join(directory, 'ledger.json'), ledger = {schemaVersion: 1, scope: memberAccessLedgerScope, status: 'failed'};
    writeMemberAccessLedger(filename, ledger); assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600); writeMemberAccessLedger(filename, {...ledger, status: 'passed'});
    const unrelated = path.join(directory, 'other.json'); fs.writeFileSync(unrelated, '{}');
    assert.throws(() => writeMemberAccessLedger(unrelated, ledger)); assert.equal(fs.readFileSync(unrelated, 'utf8'), '{}');
    const link = path.join(directory, 'link.json'); fs.symlinkSync(filename, link); assert.throws(() => writeMemberAccessLedger(link, ledger));
    const hard = path.join(directory, 'hard.json'); fs.linkSync(filename, hard);
    assert.throws(() => writeMemberAccessLedger(hard, ledger)); assert.throws(() => writeMemberAccessLedger(filename, ledger));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
