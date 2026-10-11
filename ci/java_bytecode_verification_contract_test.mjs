import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {verificationCases, mutateVerification, assertVerificationResult, checkVerificationExecution,
  writeVerificationLedger, verificationLedgerScope, assertVerificationProvenance,
  metadataLoaderScenarios, mutateMetadataChild} from './java_bytecode_verification_test.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';

// Synthetic offset-reader fixture, never executed as Java or reported as javac
// evidence. The native/guest gate separately compiles the genuine source.
function unitFixture(metadataProbe = false) {
  const u2 = n => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
  const u4 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
  const pool = [];
  const add = (tag, ...parts) => { pool.push(Buffer.concat([Buffer.from([tag]), ...parts])); return pool.length; };
  const utf = name => add(1, u2(Buffer.byteLength(name)), Buffer.from(name));
  const cls = name => add(7, u2(utf(name)));
  const member = (tag, owner, name, descriptor) => add(tag, u2(owner), u2(add(12, u2(utf(name)), u2(utf(descriptor)))));
  const self = cls('classes/modern_test/JavaBytecodeVerification$Target'), object = cls('java/lang/Object');
  cls('[I'); cls('[[I'); cls('java/lang/ArithmeticException');
  member(9, self, 'number', 'I');
  member(10, object, '<init>', '()V');
  member(10, object, 'toString', '()Ljava/lang/String;');
  member(10, self, 'integer', '(I)I');
  member(11, cls('java/util/List'), 'size', '()I');
  member(18, 0, 'makeConcatWithConstants', '(I)Ljava/lang/String;');
  add(3, u4(70000));
  const codeName = utf('Code');
  utf('StackMapTable');
  const methods = [['voidProbe', '()V'], ['referenceProbe', '(Ljava/lang/Object;)Ljava/lang/Object;'],
    ['<init>', '()V'], ['legacy', '(I)I'], ...(metadataProbe ? [['integerProbe', '()I']] : [])].map(([name, descriptor]) => {
      const nameIndex = utf(name), descriptorIndex = utf(descriptor);
      const code = Buffer.from(name === 'integerProbe' ? [0x08, 0xac] : [0xb1]);
      const body = Buffer.concat([u2(1), u2(name === 'integerProbe' ? 0 : 2), u4(code.length), code, u2(0), u2(0)]);
      return Buffer.concat([u2(name === '<init>' ? 1 : 9), u2(nameIndex), u2(descriptorIndex), u2(1),
        u2(codeName), u4(body.length), body]);
    });
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(pool.length + 1), ...pool,
    u2(0x21), u2(self), u2(object), u2(0), u2(0), u2(methods.length), ...methods, u2(0)]);
}

function success() {
  return {status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
    error: null, stderr: '', stdout: verificationCases().map(entry =>
      `${entry.expected === 'accepted' ? 'BYTECODE_TARGET_INITIALIZED\n' : ''}` +
      `${entry.id}=${entry.expected}@${entry.expected === 'accepted' ? 'initialize' : 'resolve'}\n`).join('') +
      metadataLoaderScenarios().map(entry => [`${entry.id}=defined-parent`, `${entry.id}=defined-child`,
        'METADATA_PARENT_USABLE', `${entry.id}=parent-usable-child-loaded`,
        ...(entry.expected === 'accepted' ? ['METADATA_CHILD_INITIALIZED'] : []),
        `${entry.id}=${entry.expected}@${entry.expected === 'accepted' ? 'initialize' : 'resolve'}`].join('\n') + '\n').join('') +
      'BYTECODE_VERIFICATION_OK\n'};
}

test('mandatory B3 corpus separates genuine, valid, invalid, and explicitly historical inputs', () => {
  const cases = verificationCases();
  assert.equal(cases.length, 66);
  assert.equal(new Set(cases.map(entry => entry.id)).size, cases.length);
  assert.deepEqual(cases.filter(entry => !entry.mutation).map(entry => entry.id), ['genuine-control']);
  assert.equal(cases.filter(entry => entry.expected === 'accepted').length, 11);
  assert.equal(cases.filter(entry => entry.expected === 'java.lang.ClassFormatError').length, 5);
  assert.equal(cases.filter(entry => entry.expected === 'java.lang.VerifyError').length, 50);
  assert.equal(cases.filter(entry => entry.legacy).length, 8);
  for (const entry of cases) {
    assert.equal(entry.packageId, 'JVM-002');
    assert.match(entry.binaryName, /^classes\.modern_test\.JavaBytecodeVerification\$(?:Legacy)?Target$/);
    for (const release of [21, 25]) assert.equal(entry.specificationRefs[release],
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-4.html#jvms-${entry.section}`);
  }
});

test('all 66 mutations are deterministic, replayable and leave originals unchanged', () => {
  const original = unitFixture(), before = Buffer.from(original);
  for (const entry of verificationCases()) {
    const result = mutateVerification(original, entry.id);
    assert.deepEqual(result, mutateVerification(original, entry.id), entry.id);
    assert.deepEqual(original, before);
    assert.equal(result.edits.length > 0, entry.mutation, entry.id);
    let replay = Buffer.from(original);
    for (const edit of [...result.edits].sort((a, b) => b.offset - a.offset)) {
      assert.ok(edit.reason.length > 0);
      replay = Buffer.concat([replay.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'),
        replay.subarray(edit.offset + edit.removeBytes)]);
    }
    assert.deepEqual(replay, result.bytes, entry.id);
    assert.deepEqual(result.bytes.subarray(0, 6), before.subarray(0, 6));
    assert.equal(result.bytes.readUInt16BE(6), entry.major || 65, entry.id);
    // Even intentionally invalid instructions retain complete outer framing.
    assert.equal(readStructureLayout(result.bytes).methods.entries.length, 4);
  }
  assert.throws(() => mutateVerification(original, 'missing-case'), /Unknown verification mutation/);
});

test('mandatory metadata-loader scenarios are independent of the frozen 66-case inventory', () => {
  assert.equal(verificationCases().length, 66);
  const scenarios = metadataLoaderScenarios();
  assert.deepEqual(scenarios.map(entry => [entry.id, entry.expected, entry.mutation]), [
    ['metadata-valid-child', 'accepted', false], ['metadata-invalid-child', 'java.lang.VerifyError', true]
  ]);
  for (const entry of scenarios) {
    assert.equal(entry.packageId, 'JVM-002');
    assert.equal(entry.parentBinaryName, 'classes.modern_test.JavaBytecodeVerification$MetadataParent');
    assert.equal(entry.childBinaryName, 'classes.modern_test.JavaBytecodeVerification$MetadataChild');
    for (const release of [21, 25]) assert.equal(entry.specificationRefs[release].length, 2);
  }
});

test('invalid metadata child changes one replayable Code byte and preserves genuine headers and framing', () => {
  const original = unitFixture(true), before = Buffer.from(original);
  for (const entry of metadataLoaderScenarios()) {
    const result = mutateMetadataChild(original, entry.id);
    assert.deepEqual(result, mutateMetadataChild(original, entry.id));
    assert.deepEqual(original, before);
    assert.equal(result.edits.length, entry.mutation ? 1 : 0);
    let replay = Buffer.from(original);
    for (const edit of result.edits) {
      assert.equal(edit.removeBytes, 1);
      assert.equal(edit.insertHex, '0b');
      assert.match(edit.reason, /integerProbe\(\)I/);
      replay = Buffer.concat([replay.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'),
        replay.subarray(edit.offset + edit.removeBytes)]);
    }
    assert.deepEqual(replay, result.bytes);
    assert.deepEqual(result.bytes.subarray(0, 8), before.subarray(0, 8));
    assert.equal(result.bytes.length, original.length);
    assert.equal([...result.bytes].filter((byte, index) => byte !== original[index]).length, entry.mutation ? 1 : 0);
    assert.equal(readStructureLayout(result.bytes).methods.entries.length, 5);
  }
  assert.throws(() => mutateMetadataChild(original, 'missing-case'), /Unknown metadata-loader scenario/);
  assert.throws(() => mutateMetadataChild(unitFixture(), 'metadata-invalid-child'), /integerProbe/);
  const wrong = Buffer.from(original), probe = readStructureLayout(wrong).methods.entries.find(method => method.name === 'integerProbe');
  wrong[probe.code.instructionsOffset] = 0x03;
  assert.throws(() => mutateMetadataChild(wrong, 'metadata-invalid-child'), /Genuine metadata probe/);
});

test('exact host outcomes require full completion without initializing rejected classes', () => {
  const result = success();
  assert.equal(assertVerificationResult(result).length, 66);
  assert.doesNotThrow(() => assertVerificationResult({...result, stdout: result.stdout.replaceAll('\n', '\r\n')}));
  const metadataOffset = result.stdout.indexOf('metadata-valid-child=');
  assert.doesNotThrow(() => assertVerificationResult({...result, stdout:
    result.stdout.slice(0, metadataOffset).replaceAll('@resolve', '@define') + result.stdout.slice(metadataOffset)}));
  for (const change of [
    {status: 'failed'}, {exitCode: 1}, {signal: 'SIGTERM'}, {timedOut: true}, {outputLimitExceeded: true},
    {error: 'host failure'}, {stderr: 'host failure'},
    {stdout: result.stdout.replace('java.lang.VerifyError', 'java.lang.ClassFormatError')},
    {stdout: result.stdout.replace('java.lang.VerifyError', 'java.lang.VerifyErrorSuffix')},
    {stdout: result.stdout.replace('truncated-operand=', 'BYTECODE_TARGET_INITIALIZED\ntruncated-operand=')},
    {stdout: result.stdout.replace('BYTECODE_VERIFICATION_OK\n', '')},
    {stdout: result.stdout + 'extra\n'},
    {stdout: result.stdout.replace('genuine-control=', 'renamed-control=')}
  ]) assert.throws(() => assertVerificationResult({...result, ...change}));
});

test('exact metadata traces require usable parent before child verification and forbid rejected initialization', () => {
  const result = success();
  let outcomes;
  assert.equal(assertVerificationResult(result, verificationCases(), 'metadata unit', value => { outcomes = value; }).length, 66);
  assert.deepEqual(outcomes, [
    {id: 'metadata-valid-child', result: 'accepted', stage: 'initialize', parentUsable: true,
      childLoadedAsMetadata: true, childInitialized: true},
    {id: 'metadata-invalid-child', result: 'java.lang.VerifyError', stage: 'resolve', parentUsable: true,
      childLoadedAsMetadata: true, childInitialized: false}
  ]);
  for (const stdout of [
    result.stdout.replace('metadata-invalid-child=defined-child\n', ''),
    result.stdout.replace('METADATA_PARENT_USABLE\n', ''),
    result.stdout.replace('metadata-invalid-child=parent-usable-child-loaded\n', ''),
    result.stdout.replace('metadata-invalid-child=java.lang.VerifyError', 'METADATA_CHILD_INITIALIZED\nmetadata-invalid-child=java.lang.VerifyError'),
    result.stdout.replace('metadata-invalid-child=java.lang.VerifyError', 'metadata-invalid-child=java.lang.ClassFormatError'),
    result.stdout.replace('metadata-invalid-child=java.lang.VerifyError@resolve', 'metadata-invalid-child=java.lang.VerifyError@define'),
    result.stdout.replace('metadata-invalid-child=java.lang.VerifyError', 'metadata-invalid-child=java.lang.VerifyErrorSuffix'),
    result.stdout.slice(0, result.stdout.indexOf('metadata-valid-child=')) + 'BYTECODE_VERIFICATION_OK\n'
  ]) assert.throws(() => assertVerificationResult({...result, stdout}));
});

test('failed executions remain in the ledger beside earlier successes', async () => {
  const record = {release: 21, status: 'running', executions: []};
  await checkVerificationExecution(record, 'native', async () => success());
  assert.equal(record.executions[0].outcomes.length, 66);
  assert.equal(record.executions[0].metadataOutcomes.length, 2);
  const failed = {...success(), status: 'timeout', timedOut: true, exitCode: null};
  await assert.rejects(checkVerificationExecution(record, 'node', async () => failed));
  assert.equal(record.status, 'failed');
  assert.equal(record.executions[0].status, 'passed');
  assert.deepEqual(record.executions[1].result, failed);
  await assert.rejects(checkVerificationExecution(record, 'chromium', async () => { throw new Error('Launch failure'); }), /Launch failure/);
  assert.match(record.executions[2].error, /Launch failure/);
});

test('official gate requires one clean unchanged committed tree', () => {
  const clean = {commit: 'a'.repeat(40), trackedDirty: false};
  assertVerificationProvenance(clean, clean);
  assert.throws(() => assertVerificationProvenance({...clean, trackedDirty: true}, clean));
  assert.throws(() => assertVerificationProvenance(clean, {...clean, trackedDirty: true}));
  assert.throws(() => assertVerificationProvenance(clean, {...clean, commit: 'b'.repeat(40)}));
});

test('ledger writes preserve unrelated files and reject symlink targets', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-verification-ledger-unit-'));
  try {
    const filename = path.join(directory, 'ledger.json');
    const ledger = {schemaVersion: 1, scope: verificationLedgerScope, status: 'failed', error: 'Retained failure'};
    writeVerificationLedger(filename, ledger);
    assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
    writeVerificationLedger(filename, {...ledger, status: 'passed'});
    const unrelated = path.join(directory, 'unrelated.json');
    fs.writeFileSync(unrelated, '{}');
    assert.throws(() => writeVerificationLedger(unrelated, ledger));
    assert.equal(fs.readFileSync(unrelated, 'utf8'), '{}');
    fs.symlinkSync(unrelated, path.join(directory, 'link.json'));
    assert.throws(() => writeVerificationLedger(path.join(directory, 'link.json'), ledger));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
