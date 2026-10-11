import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {memberResolutionCases, memberResolutionSources, inspectMemberResolutionPayload, assertMemberResolutionEvolution,
  assertMemberResolutionResult, checkMemberResolutionExecution, assertMemberResolutionClasspath,
  assertMemberResolutionProvenance, writeMemberResolutionLedger, memberResolutionLedgerScope}
  from './java_member_resolution_test.mjs';

function success() {
  return {status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
    error: null, stderr: '', stdout: memberResolutionCases().flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`))
      .concat(['MEMBER_RESOLUTION_OK', '']).join('\n')};
}

// Synthetic parser unit only. This fixture is never executed and never recorded
// as genuine compiler, native JVM, Node guest or Chromium conformance evidence.
function referenceFixture(caller, owner, tag, descriptor, opcode = tag === 9 ? 0xb2 : tag === 10 ? 0xb8 : 0xb9,
    options = {}) {
  const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
  const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
  const pool = [], add = (tag, ...parts) => { pool.push(Buffer.concat([Buffer.from([tag]), ...parts])); return pool.length; };
  const utf = text => add(1, u2(Buffer.byteLength(text)), Buffer.from(text));
  const cls = text => add(7, u2(utf(text)));
  const self = cls('members/' + caller), superclass = cls('java/lang/Object'), target = cls('members/' + owner);
  const nameAndType = add(12, u2(utf('value')), u2(utf(descriptor))), reference = add(tag, u2(target), u2(nameAndType));
  const unrelated = add(tag, u2(cls('members/Unrelated')), u2(nameAndType));
  const run = utf('run'), runType = utf('()I'), codeName = utf('Code');
  const prefix = tag === 11 ? Buffer.concat([Buffer.from([1]), ...(options.cast ? [Buffer.from([0xc0]), u2(target)] : []), Buffer.from([opcode])]) : Buffer.from([opcode]);
  const code = options.opcodeAsOperand ? Buffer.from([0x11, opcode, 0x00, 0xac]) :
    Buffer.concat([prefix, u2(options.unrelated ? unrelated : options.wrongIndex ? target : reference),
      Buffer.from(tag === 11 ? [options.wrongCount ? 2 : 1, options.wrongReserved ? 1 : 0, 0xac] : [0xac])]);
  const body = Buffer.concat([u2(1), u2(0), u4(code.length), code, u2(0), u2(0)]);
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(pool.length + 1), ...pool,
    u2(0x21), u2(self), u2(superclass), u2(0), u2(0), u2(1),
    u2(9), u2(run), u2(runType), u2(1), u2(codeName), u4(body.length), body, u2(0)]);
}

test('B4c first-batch inventory keeps all exact member, lookup-order, owner-kind and identity cases', () => {
  const cases = memberResolutionCases();
  assert.deepEqual(cases.map(entry => entry.id), [
    'declared-field-positive', 'declared-field-descriptor-change', 'missing-field-positive', 'missing-field-evolved',
    'inherited-field-positive', 'inherited-field-different-descriptor', 'interface-field-positive',
    'interface-field-second-added', 'interface-field-reversed', 'interface-field-before-superclass',
    'class-method-positive', 'methodref-owner-interface', 'missing-class-method-positive', 'missing-class-method-evolved',
    'interface-method-positive', 'interfacemethodref-owner-class', 'missing-interface-method-positive',
    'missing-interface-method-evolved', 'fieldref-owner-class-positive', 'fieldref-owner-interface-positive',
    'independent-class-identity', 'independent-interface-identity'
  ]);
  assert.equal(new Set(cases.map(entry => entry.id)).size, 22);
  for (const entry of cases) {
    assert.equal(entry.packageId, 'JVM-002'); assert.equal(entry.mutation, false);
    assert.equal(entry.expectedPhase, 'invoke');
    assert.equal(entry.trace[0], 'metadata-ready-no-effects');
    for (const release of [21, 25]) assert.ok(entry.specificationRefs[release].includes(
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-${entry.section}`));
  }
});

test('two genuine payload compilations replace owners only and keep the exact resource inventory', () => {
  const stages = memberResolutionSources();
  assert.deepEqual(stages.map(stage => stage.stage), ['baseline', 'evolved']);
  assert.equal(stages[0].sources.length, 24); assert.equal(stages[1].sources.length, 13);
  const source = (stage, name) => stages.find(entry => entry.stage === stage).sources.find(entry => entry.binaryName === 'members.' + name).text;
  assert.match(source('baseline', 'TypeOwner'), /static int value/);
  assert.match(source('evolved', 'TypeOwner'), /static long value/);
  assert.match(source('baseline', 'FieldParent'), /static int value/);
  assert.match(source('evolved', 'FieldChild'), /extends FieldParent.*static long value/);
  assert.match(source('baseline', 'InterfaceOwner'), /implements First, Second/);
  assert.match(source('evolved', 'InterfaceOwner'), /implements Second, First/);
  assert.ok(stages[1].sources.every(entry => !entry.binaryName.endsWith('Caller')));
  assert.deepEqual([...new Set(memberResolutionCases().flatMap(entry => entry.payloads))].sort(),
    stages.flatMap(stage => stage.sources.map(source => `${stage.stage}:${source.binaryName}`)).sort());
  assert.deepEqual(memberResolutionSources(), stages);
});

test('old caller proof binds CP owner, descriptor, tag and executable member opcode', () => {
  for (const [caller, owner, tag, descriptor] of [
    ['TypeCaller', 'TypeOwner', 9, 'I'], ['InheritedCaller', 'FieldChild', 9, 'I'],
    ['InterfaceFieldCaller', 'InterfaceOwner', 9, 'I'], ['ClassCaller', 'ClassOwner', 10, '()I'],
    ['InterfaceCaller', 'Role', 11, '()I']
  ]) {
    const inspect = bytes => inspectMemberResolutionPayload(bytes, 'members.' + caller);
    const valid = inspect(referenceFixture(caller, owner, tag, descriptor));
    assert.equal(valid.references[0].owner, 'members/' + owner);
    assert.throws(() => inspect(referenceFixture(caller, 'Wrong', tag, descriptor)), /symbolic owner/);
    assert.throws(() => inspect(referenceFixture(caller, owner, tag, tag === 9 ? 'J' : '()J')), /symbolic owner/);
    if (tag !== 9) assert.throws(() => inspect(referenceFixture(caller, owner, tag === 10 ? 11 : 10, descriptor)), /symbolic owner/);
    assert.throws(() => inspect(referenceFixture(caller, owner, tag, descriptor, 0)), /really executes/);
    for (const options of [{unrelated: true}, {wrongIndex: true}]) {
      assert.throws(() => inspect(referenceFixture(caller, owner, tag, descriptor, undefined, options)), /Executable CP operand/);
    }
    assert.throws(() => inspect(referenceFixture(caller, owner, tag, descriptor, undefined, {opcodeAsOperand: true})),
      /instruction boundar|really executes/);
    if (tag === 11) {
      assert.doesNotThrow(() => inspect(referenceFixture(caller, owner, tag, descriptor, undefined, {cast: true})));
      for (const options of [{wrongCount: true}, {wrongReserved: true}]) {
        assert.throws(() => inspect(referenceFixture(caller, owner, tag, descriptor, undefined, options)), /interface count/);
      }
    }
  }
});

test('field resolution distinguishes exact descriptors, first interface order and superclass fallback', () => {
  const find = id => memberResolutionCases().find(entry => entry.id === id);
  assert.deepEqual(find('declared-field-descriptor-change').trace,
    ['metadata-ready-no-effects', 'java.lang.NoSuchFieldError@invoke', 'effects=none']);
  assert.deepEqual(find('inherited-field-different-descriptor').trace,
    ['metadata-ready-no-effects', 'accepted@invoke', 'value=20', 'effects=field-parent']);
  for (const id of ['interface-field-second-added', 'interface-field-before-superclass']) {
    assert.deepEqual(find(id).trace, ['metadata-ready-no-effects', 'accepted@invoke', 'value=41', 'effects=first']);
  }
  assert.deepEqual(find('interface-field-reversed').trace,
    ['metadata-ready-no-effects', 'accepted@invoke', 'value=42', 'effects=second']);
});

test('symbolic method kind failures precede null invocation and target initialization', () => {
  const find = id => memberResolutionCases().find(entry => entry.id === id);
  for (const id of ['methodref-owner-interface', 'interfacemethodref-owner-class']) {
    assert.deepEqual(find(id).trace, ['metadata-ready-no-effects', 'java.lang.IncompatibleClassChangeError@invoke', 'effects=none']);
  }
  assert.deepEqual(find('interface-method-positive').trace,
    ['metadata-ready-no-effects', 'java.lang.NullPointerException@invoke', 'effects=none']);
  for (const id of ['missing-class-method-evolved', 'missing-interface-method-evolved']) {
    assert.equal(find(id).expectedError, 'java.lang.NoSuchMethodError');
  }
  for (const id of ['fieldref-owner-class-positive', 'fieldref-owner-interface-positive']) assert.equal(find(id).expectedError, null);
});

test('exact complete output rejects skipped cases, wrong taxonomy/phase/value and extra initialization', () => {
  const result = success();
  assert.equal(assertMemberResolutionResult(result).length, 22);
  assert.doesNotThrow(() => assertMemberResolutionResult({...result, stdout: result.stdout.replaceAll('\n', '\r\n')}));
  for (const change of [{status: 'failed'}, {exitCode: 1}, {stderr: 'warning'}, {timedOut: true}, {signal: 'SIGKILL'},
    {error: 'launch'}, {outputLimitExceeded: true},
    {stdout: result.stdout.replace('java.lang.NoSuchFieldError@invoke', 'java.lang.NoSuchMethodError@invoke')},
    {stdout: result.stdout.replace('java.lang.IncompatibleClassChangeError@invoke', 'java.lang.NullPointerException@invoke')},
    {stdout: result.stdout.replace('java.lang.NoSuchFieldError@invoke', 'java.lang.NoSuchFieldError@prepare')},
    {stdout: result.stdout.replace('inherited-field-different-descriptor=value=20', 'inherited-field-different-descriptor=value=30')},
    {stdout: result.stdout.replace('interface-field-second-added=effects=first', 'interface-field-second-added=effects=second')},
    {stdout: result.stdout.replace('same-name-interface-identities-distinct', 'same-name-interface-identities-shared')},
    {stdout: result.stdout.replace('effects=none', 'effects=role-init')},
    {stdout: result.stdout.replace('MEMBER_RESOLUTION_OK\n', '')}, {stdout: result.stdout + 'extra\n'}]) {
    assert.throws(() => assertMemberResolutionResult({...result, ...change}));
  }
  for (const entry of memberResolutionCases()) assert.throws(() => assertMemberResolutionResult({...result,
    stdout: result.stdout.replace(`${entry.id}=${entry.trace[0]}\n`, '')}));
});

test('failed raw execution survives post-execution integrity errors and failed launches', async () => {
  const record = {release: 21, status: 'running', executions: []};
  await checkMemberResolutionExecution(record, 'native', async () => success());
  assert.equal(record.executions[0].outcomes.length, 22);
  const failed = {...success(), status: 'failed', exitCode: 1};
  await assert.rejects(checkMemberResolutionExecution(record, 'node', async () => failed));
  assert.deepEqual(record.executions[1].result, failed);
  let checks = 0;
  await assert.rejects(checkMemberResolutionExecution(record, 'chromium', async () => success(), () => {
    if (++checks === 2) throw new Error('Changed input');
  }), /Changed input/);
  assert.deepEqual(record.executions[2].result, success());
  assert.equal(record.status, 'failed');
  await assert.rejects(checkMemberResolutionExecution(record, 'node', async () => { throw new Error('Launch failure'); }), /Launch failure/);
  assert.match(record.executions[3].error, /Launch failure/);
  await assert.rejects(checkMemberResolutionExecution(record, 'unrecognized', async () => success()), /Known execution host/);
});

test('evolution rejects caller recompilation, unplanned outputs and unchanged replacement bytes', () => {
  const owner = {path: 'members/TypeOwner.class', sha256: 'a'.repeat(64)}, caller = {path: 'members/TypeCaller.class', sha256: 'b'.repeat(64)};
  const replacement = {...owner, sha256: 'c'.repeat(64)};
  assert.deepEqual(assertMemberResolutionEvolution([owner, caller], [replacement], [owner.path]), [caller]);
  assert.throws(() => assertMemberResolutionEvolution([owner, caller], [owner], [owner.path]), /actually change/);
  assert.throws(() => assertMemberResolutionEvolution([owner, caller], [replacement, caller], [owner.path]), /planned owner/);
  assert.throws(() => assertMemberResolutionEvolution([owner, caller], [{...caller, sha256: 'c'.repeat(64)}], [caller.path]), /never recompile a caller/);
  assert.throws(() => assertMemberResolutionEvolution([caller], [replacement], [owner.path]), /genuine baseline/);
});

test('runtime classpath contains driver classes and exact stage resources, never fallback owners', () => {
  const driver = ['classes/modern_test/JavaMemberResolution$PayloadLoader.class', 'classes/modern_test/JavaMemberResolution.class']
    .map((filename, index) => ({path: filename, size: index + 1, sha256: String(index).repeat(64)}));
  const payload = {resource: {path: 'member-resolution-cases/baseline/members/TypeOwner.bin', size: 3, sha256: '2'.repeat(64)}};
  assertMemberResolutionClasspath([...driver, payload.resource], driver, [payload]);
  assert.throws(() => assertMemberResolutionClasspath(driver, driver, [payload]));
  assert.throws(() => assertMemberResolutionClasspath([...driver, payload.resource, {path: 'members/TypeOwner.class', size: 3, sha256: '2'.repeat(64)}], driver, [payload]));
  const wrong = {resource: {...payload.resource, path: 'members/TypeOwner.class'}};
  assert.throws(() => assertMemberResolutionClasspath([...driver, wrong.resource], driver, [wrong]));
});

test('shared provenance requires clean committed and unchanged sources', () => {
  const clean = {commit: 'a'.repeat(40), trackedDirty: false};
  assertMemberResolutionProvenance(clean, clean);
  assert.throws(() => assertMemberResolutionProvenance({...clean, trackedDirty: true}, clean));
  assert.throws(() => assertMemberResolutionProvenance(clean, {...clean, trackedDirty: true}));
  assert.throws(() => assertMemberResolutionProvenance(clean, {...clean, commit: 'b'.repeat(40)}));
});

test('owned atomic result ledger preserves unrelated or linked targets', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-member-ledger-unit-'));
  try {
    const filename = path.join(directory, 'ledger.json');
    const ledger = {schemaVersion: 1, scope: memberResolutionLedgerScope, status: 'failed'};
    writeMemberResolutionLedger(filename, ledger);
    assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    writeMemberResolutionLedger(filename, {...ledger, status: 'passed'});
    const unrelated = path.join(directory, 'other.json'); fs.writeFileSync(unrelated, '{}');
    assert.throws(() => writeMemberResolutionLedger(unrelated, ledger));
    assert.equal(fs.readFileSync(unrelated, 'utf8'), '{}');
    const link = path.join(directory, 'link.json'); fs.symlinkSync(filename, link);
    assert.throws(() => writeMemberResolutionLedger(link, ledger));
    const hard = path.join(directory, 'hard.json'); fs.linkSync(filename, hard);
    assert.throws(() => writeMemberResolutionLedger(hard, ledger));
    assert.throws(() => writeMemberResolutionLedger(filename, ledger));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
