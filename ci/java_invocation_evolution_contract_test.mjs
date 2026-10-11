import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {invocationEvolutionCases, invocationEvolutionSources, invocationCallerProofs, inspectInvocationEvolutionPayload,
  assertInvocationEvolution, assertInvocationEvolutionResult, checkInvocationEvolutionExecution, assertInvocationEvolutionClasspath,
  assertInvocationEvolutionProvenance, writeInvocationEvolutionLedger, invocationEvolutionLedgerScope,
  invocationEvolutionOracleBoundary}
  from './java_invocation_evolution_test.mjs';

const expectedIds = [
  'default-interface-positive', 'default-interface-abstract', 'default-virtual-positive', 'default-virtual-abstract',
  'subinterface-positive', 'subinterface-reabstract', 'conflict-interface-positive', 'conflict-interface-evolved',
  'conflict-virtual-positive', 'conflict-virtual-evolved', 'super-default-positive', 'super-default-conflict',
  'single-default-positive', 'single-default-with-abstract', 'diamond-common-default', 'diamond-more-specific-default',
  'class-interface-positive', 'class-interface-abstract', 'class-virtual-positive', 'class-virtual-abstract',
  'static-class-positive', 'static-class-became-instance', 'static-interface-positive', 'static-interface-became-instance',
  'virtual-class-positive', 'virtual-class-became-static', 'virtual-interface-positive', 'virtual-interface-became-static',
  'static-inherited-declaring-initialization', 'static-interface-declaring-initialization',
  'getstatic-positive', 'getstatic-became-instance', 'getfield-positive', 'getfield-became-static'
];

function success(host = 'node', release = 25) {
  return {status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
    error: null, stderr: '', stdout: invocationEvolutionCases().flatMap(entry => entry.expectedTraces[release][host]
      .map(event => `${entry.id}=${event}`))
      .concat(['INVOCATION_EVOLUTION_OK', '']).join('\n')};
}

// Synthetic parser unit only: never executed, never conformance/compiler evidence.
function callerFixture(caller, options = {}) {
  const [owner, tag, opcode, parameter] = invocationCallerProofs[caller];
  const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
  const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
  const pool = [], add = (tag, ...parts) => { pool.push(Buffer.concat([Buffer.from([tag]), ...parts])); return pool.length; };
  const utf = value => add(1, u2(Buffer.byteLength(value)), Buffer.from(value));
  const cls = value => add(7, u2(utf(value)));
  const self = cls('invocation/' + caller), superclass = cls('java/lang/Object');
  const target = cls('invocation/' + (options.owner || owner));
  const nameAndType = add(12, u2(utf(options.name || 'value')), u2(utf(options.descriptor || (tag === 9 ? 'I' : '()I'))));
  const reference = add(options.tag || tag, u2(target), u2(nameAndType));
  const unrelated = add(tag, u2(cls('invocation/Unrelated')), u2(nameAndType));
  const run = utf('run'), type = utf('(' + (parameter ? 'Linvocation/' + parameter + ';' : '') + ')I'), codeName = utf('Code');
  const receiver = parameter !== null || opcode === 0xb7;
  const code = options.opcodeAsOperand ? Buffer.from([0x11, opcode, 0, 0xac]) : Buffer.concat([
    Buffer.from(receiver ? [options.receiver || 0x2a, options.opcode ?? opcode] : [options.opcode ?? opcode]),
    u2(options.unrelated ? unrelated : options.wrongIndex ? target : reference),
    Buffer.from(opcode === 0xb9 ? [options.count || 1, options.reserved || 0, 0xac] : [0xac])]);
  const body = Buffer.concat([u2(1), u2(receiver ? 1 : 0), u4(code.length), code, u2(0), u2(0)]);
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(pool.length + 1), ...pool,
    u2(0x21), u2(self), u2(superclass), u2(0), u2(0), u2(1),
    u2(options.flags ?? (opcode === 0xb7 ? 1 : 9)), u2(run), u2(type), u2(1), u2(codeName), u4(body.length), body, u2(0)]);
}

test('complete residual inventory is 34 genuine evolved invocation and field scenarios', () => {
  const cases = invocationEvolutionCases();
  assert.deepEqual(cases.map(entry => entry.id), expectedIds);
  assert.equal(new Set(cases.map(entry => entry.id)).size, 34);
  for (const entry of cases) {
    assert.equal(entry.packageId, 'JVM-002'); assert.equal(entry.mutation, false);
    assert.equal(entry.expectedPhase, 'invoke'); assert.equal(entry.throwableIdentityCompared, false);
    assert.equal(entry.trace[0], 'metadata-ready-no-effects');
    for (const release of [21, 25]) assert.ok(entry.specificationRefs[release].includes(
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-5.4.6`));
  }
});

test('two-stage compilation replaces only owners and keeps old callers and receivers', () => {
  const stages = invocationEvolutionSources();
  assert.deepEqual(stages.map(entry => entry.stage), ['baseline', 'evolved']);
  assert.ok(stages[1].sources.every(entry => !/(Caller|Impl|Override)$/.test(entry.binaryName)));
  assert.deepEqual([...new Set(invocationEvolutionCases().flatMap(entry => entry.payloads))].sort(),
    stages.flatMap(stage => stage.sources.map(source => `${stage.stage}:${source.binaryName}`)).sort());
  const source = (stage, name) => stages.find(entry => entry.stage === stage).sources.find(entry => entry.binaryName === 'invocation.' + name).text;
  assert.match(source('baseline', 'DefaultRole'), /default int value/);
  assert.match(source('evolved', 'DefaultRole'), /int value\(\);/);
  assert.match(source('evolved', 'ClassBase'), /abstract class ClassBase.*abstract int value\(\);/);
  assert.match(source('evolved', 'ConflictRight'), /default int value/);
  assert.match(source('evolved', 'SingleRight'), /int value\(\);/);
  assert.match(source('baseline', 'SuperCaller'), /return super.value\(\)/);
  assert.match(source('baseline', 'InitClassCaller'), /return InitChild.value\(\)/);
  assert.deepEqual(invocationEvolutionSources(), stages);
});

test('executable byte proofs bind every old CP owner/tag/descriptor/opcode at exact boundaries', () => {
  for (const caller of Object.keys(invocationCallerProofs)) {
    const inspect = bytes => inspectInvocationEvolutionPayload(bytes, 'invocation.' + caller);
    assert.doesNotThrow(() => inspect(callerFixture(caller)));
    for (const options of [{owner: 'Wrong'}, {name: 'wrong'}, {descriptor: 'J'}, {unrelated: true}, {wrongIndex: true}]) {
      assert.throws(() => inspect(callerFixture(caller, options)), /Executable CP operand/);
    }
    assert.throws(() => inspect(callerFixture(caller, {opcode: 0})), /executable member instruction/);
    assert.throws(() => inspect(callerFixture(caller, {opcodeAsOperand: true})), /instruction boundar|executable member instruction/);
    const [, tag, opcode, parameter] = invocationCallerProofs[caller];
    assert.throws(() => inspect(callerFixture(caller, {tag: tag === 11 ? 10 : 11})), /Executable CP operand/);
    assert.throws(() => inspect(callerFixture(caller, {flags: opcode === 0xb7 ? 9 : 1})), /static entry/);
    if (parameter || opcode === 0xb7) assert.throws(() => inspect(callerFixture(caller, {receiver: 1})), /receiver load/);
    if (opcode === 0xb9) for (const options of [{count: 2}, {reserved: 1}]) {
      assert.throws(() => inspect(callerFixture(caller, options)), /interface count/);
    }
  }
});

test('receiver-dependent conflicts leave the same old caller usable for overriding and null receivers', () => {
  for (const form of ['interface', 'virtual']) {
    const item = invocationEvolutionCases().find(entry => entry.id === 'conflict-' + form + '-evolved');
    assert.equal(item.sameCallerAndConstantPool, true);
    assert.deepEqual(item.trace, ['metadata-ready-no-effects', 'runtime-default-identities-proven', 'receivers-ready-no-effects',
      'accepted@override-before', 'value@override-before=23', 'java.lang.IncompatibleClassChangeError@plain',
      'accepted@override-after', 'value@override-after=23', 'java.lang.NullPointerException@null',
      'java.lang.IncompatibleClassChangeError@plain-repeat', 'effects=override,override']);
  }
});

test('one documented native21 subtype difference never weakens native25 or either guest expectation', () => {
  const boundary = invocationEvolutionOracleBoundary();
  assert.equal(boundary.strictNativeParity, false);
  assert.equal(boundary.crossHostSpecAgreement, false);
  assert.deepEqual(boundary.nativeParityCaseCountByRelease, {21: 33, 25: 34});
  assert.equal(boundary.documentedOracleDifferenceCaseCount, 1);
  assert.equal(boundary.oracleDifferences.length, 1);
  const difference = boundary.oracleDifferences[0];
  assert.equal(difference.id, 'conflict-interface-evolved');
  assert.deepEqual(difference.nativeFeatures, [21]);
  assert.equal(difference.nativeExpected, 'java.lang.AbstractMethodError');
  assert.equal(difference.specExpected, 'java.lang.IncompatibleClassChangeError');
  assert.equal(difference.runtimeIdentityAndDefaultMetadataChecked, true);
  for (const host of ['native', 'node', 'chromium']) for (const release of [21, 25]) {
    assert.equal(assertInvocationEvolutionResult(success(host, release), 'profile unit', host, release).length, 34);
  }
  for (const [host, release] of [['native', 25], ['node', 21], ['chromium', 21], ['node', 25], ['chromium', 25]]) {
    assert.throws(() => assertInvocationEvolutionResult(success('native', 21), 'wrong profile', host, release));
  }
  assert.throws(() => assertInvocationEvolutionResult(success('native', 25), 'wrong native21', 'native', 21));
  assert.throws(() => assertInvocationEvolutionResult(success(), 'unknown host', 'other', 21));
  assert.throws(() => assertInvocationEvolutionResult(success(), 'unknown release', 'native', 17));
  const native21 = success('native', 21);
  assert.throws(() => assertInvocationEvolutionResult({...native21, stdout: native21.stdout.replace(
    'conflict-virtual-evolved=java.lang.IncompatibleClassChangeError@plain',
    'conflict-virtual-evolved=java.lang.AbstractMethodError@plain')}, 'unrelated subtype', 'native', 21));
});

test('abstract class declaration masks a default and retains its actual declaring owner', () => {
  const cases = invocationEvolutionCases();
  for (const form of ['interface', 'virtual']) {
    const item = cases.find(entry => entry.id === 'class-' + form + '-abstract');
    assert.deepEqual(item.trace, ['metadata-ready-no-effects', 'declaring-owner=invocation.ClassBase;abstract=true',
      'receiver-ready-no-effects', 'java.lang.AbstractMethodError@invoke', 'effects=none']);
  }
  assert.ok(cases.filter(entry => entry.id.startsWith('default-') && entry.id.endsWith('-abstract'))
    .every(entry => entry.expectedError === 'java.lang.AbstractMethodError'));
  assert.ok(!cases.some(entry => entry.expectedError === 'java.lang.NoSuchMethodError'));
});

test('opcode/member-kind changes fail before null checks or owner initialization', () => {
  const cases = invocationEvolutionCases();
  for (const item of cases.filter(entry => entry.id.includes('-became-'))) {
    assert.deepEqual(item.trace, ['metadata-ready-no-effects', 'java.lang.IncompatibleClassChangeError@invoke', 'effects=none']);
  }
  for (const id of ['virtual-class-positive', 'virtual-interface-positive', 'getfield-positive']) {
    assert.deepEqual(cases.find(entry => entry.id === id).trace,
      ['metadata-ready-no-effects', 'java.lang.NullPointerException@invoke', 'effects=none']);
  }
  assert.deepEqual(cases.find(entry => entry.id === 'static-inherited-declaring-initialization').trace,
    ['metadata-ready-no-effects', 'declaring-owner=invocation.InitBase', 'accepted@invoke', 'value@invoke=51',
      'effects=init-base,base-static', 'accepted@explicit-initialize', 'effects=init-base,base-static,init-child']);
  assert.deepEqual(cases.find(entry => entry.id === 'static-interface-declaring-initialization').trace,
    ['metadata-ready-no-effects', 'declaring-owner=invocation.InitRole', 'accepted@invoke', 'value@invoke=52',
      'effects=init-role,role-static', 'accepted@explicit-initialize', 'effects=init-role,role-static,init-parent']);
});

test('result contract rejects missing cases, wrong order/taxonomy/phase/value and extra effects', () => {
  const result = success();
  assert.equal(assertInvocationEvolutionResult(result).length, 34);
  assert.doesNotThrow(() => assertInvocationEvolutionResult({...result, stdout: result.stdout.replaceAll('\n', '\r\n')}));
  for (const change of [{status: 'failed'}, {exitCode: 1}, {stderr: 'warning'}, {timedOut: true}, {signal: 'SIGKILL'},
    {error: 'launch'}, {outputLimitExceeded: true},
    {stdout: result.stdout.replace('java.lang.AbstractMethodError@invoke', 'java.lang.NoSuchMethodError@invoke')},
    {stdout: result.stdout.replace('java.lang.IncompatibleClassChangeError@plain', 'java.lang.IncompatibleClassChangeError@prepare')},
    {stdout: result.stdout.replace('value@invoke=32', 'value@invoke=31')},
    {stdout: result.stdout.replace('effects=none', 'effects=unexpected-init')},
    {stdout: result.stdout.replace('declaring-owner=invocation.ClassBase', 'declaring-owner=invocation.ClassImpl')},
    {stdout: result.stdout.replace('INVOCATION_EVOLUTION_OK\n', '')}, {stdout: result.stdout + 'extra\n'}]) {
    assert.throws(() => assertInvocationEvolutionResult({...result, ...change}));
  }
  for (const entry of invocationEvolutionCases()) assert.throws(() => assertInvocationEvolutionResult({...result,
    stdout: result.stdout.replace(`${entry.id}=${entry.trace[0]}\n`, '')}));
});

test('failed execution and post-execution integrity failures retain raw evidence', async () => {
  const record = {release: 21, status: 'running', executions: []};
  await checkInvocationEvolutionExecution(record, 'native', async () => success('native', 21));
  assert.equal(record.executions[0].outcomes.length, 34);
  const failed = {...success(), status: 'failed', exitCode: 1};
  await assert.rejects(checkInvocationEvolutionExecution(record, 'node', async () => failed));
  assert.deepEqual(record.executions[1].result, failed);
  let count = 0;
  await assert.rejects(checkInvocationEvolutionExecution(record, 'chromium', async () => success(), () => {
    if (++count === 2) throw new Error('Changed input');
  }), /Changed input/);
  assert.deepEqual(record.executions[2].result, success());
  assert.equal(record.status, 'failed');
  await assert.rejects(checkInvocationEvolutionExecution(record, 'node', async () => { throw new Error('Launch failure'); }), /Launch failure/);
  await assert.rejects(checkInvocationEvolutionExecution(record, 'unknown', async () => success()), /Known execution host/);
});

test('evolution rejects recompiling old callers/receivers and unchanged or unplanned owners', () => {
  const owner = {path: 'invocation/ClassBase.class', sha256: 'a'.repeat(64)};
  const caller = {path: 'invocation/ClassVirtualCaller.class', sha256: 'b'.repeat(64)};
  const receiver = {path: 'invocation/ClassImpl.class', sha256: 'd'.repeat(64)};
  const replacement = {...owner, sha256: 'c'.repeat(64)};
  assert.deepEqual(assertInvocationEvolution([owner, caller, receiver], [replacement], [owner.path]), [caller]);
  assert.throws(() => assertInvocationEvolution([owner], [owner], [owner.path]), /actually change/);
  assert.throws(() => assertInvocationEvolution([owner, caller], [replacement, caller], [owner.path]), /planned owner/);
  assert.throws(() => assertInvocationEvolution([caller], [{...caller, sha256: 'f'.repeat(64)}], [caller.path]), /old caller/);
  assert.throws(() => assertInvocationEvolution([receiver], [{...receiver, sha256: 'f'.repeat(64)}], [receiver.path]), /old receiver/);
  assert.throws(() => assertInvocationEvolution([], [replacement], [owner.path]), /genuine baseline/);
});

test('runtime classpath has only genuine driver classes and exact resource-only payloads', () => {
  const driver = ['classes/modern_test/JavaInvocationEvolution$PayloadLoader.class', 'classes/modern_test/JavaInvocationEvolution.class']
    .map((filename, index) => ({path: filename, size: index + 1, sha256: String(index).repeat(64)}));
  const payload = {resource: {path: 'invocation-evolution-cases/baseline/invocation/ClassBase.bin', size: 3, sha256: '2'.repeat(64)}};
  assertInvocationEvolutionClasspath([...driver, payload.resource], driver, [payload]);
  assert.throws(() => assertInvocationEvolutionClasspath(driver, driver, [payload]));
  assert.throws(() => assertInvocationEvolutionClasspath([...driver, payload.resource,
    {path: 'invocation/ClassBase.class', size: 3, sha256: '2'.repeat(64)}], driver, [payload]));
  const wrong = {resource: {...payload.resource, path: 'invocation/ClassBase.class'}};
  assert.throws(() => assertInvocationEvolutionClasspath([...driver, wrong.resource], driver, [wrong]));
});

test('official provenance requires unchanged clean commits, not diagnostic working trees', () => {
  const clean = {commit: 'a'.repeat(40), trackedDirty: false};
  assertInvocationEvolutionProvenance(clean, clean);
  assert.throws(() => assertInvocationEvolutionProvenance({...clean, trackedDirty: true}, clean));
  assert.throws(() => assertInvocationEvolutionProvenance(clean, {...clean, trackedDirty: true}));
  assert.throws(() => assertInvocationEvolutionProvenance(clean, {...clean, commit: 'b'.repeat(40)}));
});

test('private atomic ledger refuses unrelated, symlinked or hardlinked targets', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-invocation-ledger-unit-'));
  try {
    const filename = path.join(directory, 'ledger.json');
    const ledger = {schemaVersion: 1, scope: invocationEvolutionLedgerScope, status: 'failed'};
    writeInvocationEvolutionLedger(filename, ledger);
    assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    writeInvocationEvolutionLedger(filename, {...ledger, status: 'passed'});
    const unrelated = path.join(directory, 'other.json'); fs.writeFileSync(unrelated, '{}');
    assert.throws(() => writeInvocationEvolutionLedger(unrelated, ledger));
    assert.equal(fs.readFileSync(unrelated, 'utf8'), '{}');
    const link = path.join(directory, 'link.json'); fs.symlinkSync(filename, link);
    assert.throws(() => writeInvocationEvolutionLedger(link, ledger));
    const hard = path.join(directory, 'hard.json'); fs.linkSync(filename, hard);
    assert.throws(() => writeInvocationEvolutionLedger(hard, ledger));
    assert.throws(() => writeInvocationEvolutionLedger(filename, ledger));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
