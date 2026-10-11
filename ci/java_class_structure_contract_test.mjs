import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertStructureGitProvenance, assertStructureResult, checkStructureExecution, mutateStructure,
  readStructureLayout, structureCases, structureLedgerScope, writeStructureLedger } from './java_class_structure_test.mjs';

// Deliberately synthetic parser-unit input. It is never used as native evidence
// or described as compiler output by the actual cross-host gate.
function unitFixture() {
  const u1 = n => Buffer.from([n]);
  const u2 = n => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
  const u4 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
  const utf = s => Buffer.concat([u1(1), u2(Buffer.byteLength(s)), Buffer.from(s)]);
  const cp = [utf('Target'), Buffer.concat([u1(7), u2(1)]), utf('java/lang/Object'),
    Buffer.concat([u1(7), u2(3)]), utf('number'), utf('I'), utf('probe'), utf('(I)I'), utf('Code'),
    utf('SourceFile'), utf('Target.java'), utf('StackMapTable'), utf('java/lang/Throwable'),
    Buffer.concat([u1(7), u2(13)]), utf('<init>'), utf('()V'),
    Buffer.concat([u1(12), u2(15), u2(16)]), Buffer.concat([u1(10), u2(4), u2(17)]),
    utf('java/io/Serializable'), Buffer.concat([u1(7), u2(19)])];
  const attr = (name, data) => Buffer.concat([u2(name), u4(data.length), data]);
  const stackMap = attr(12, Buffer.concat([u2(1), u1(67), u1(7), u2(14)]));
  const code = attr(9, Buffer.concat([u2(2), u2(2), u4(5), Buffer.from([0x1a, 0xac, 0, 0, 0]),
    u2(1), u2(0), u2(2), u2(3), u2(14), u2(1), stackMap]));
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(cp.length + 1), ...cp,
    u2(0x21), u2(2), u2(4), u2(1), u2(20),
    u2(1), u2(1), u2(5), u2(6), u2(0),
    u2(1), u2(9), u2(7), u2(8), u2(1), code,
    u2(1), attr(10, u2(11))]);
}

function success(cases = structureCases()) {
  return { status: 'passed', exitCode: 0, signal: null, timedOut: false,
    outputLimitExceeded: false, error: null, stderr: '', stdout: cases.map(entry =>
      `${entry.expected === 'accepted' ? 'STRUCTURE_TARGET_INITIALIZED\n' : ''}` +
      `${entry.id}=${entry.expected}@${entry.expected === 'accepted' ? 'initialize' : 'define'}\n`)
      .join('') + 'CLASS_STRUCTURE_OK\n' };
}

test('mandatory B2 corpus separates real controls from explicit structural mutations', () => {
  const cases = structureCases();
  assert.equal(cases.length, 50);
  assert.equal(new Set(cases.map(entry => entry.id)).size, cases.length);
  assert.deepEqual(cases.filter(entry => !entry.mutation).map(entry => entry.id), ['genuine-control']);
  assert.equal(cases.filter(entry => entry.controlKind === 'negative-structure').length, 42);
  assert.ok(cases.filter(entry => entry.controlKind === 'negative-structure')
    .every(entry => entry.expected === 'java.lang.ClassFormatError'));
  assert.equal(cases.filter(entry => entry.controlKind === 'opaque-attribute-acceptance').length, 7);
  assert.deepEqual([...new Set(cases.map(entry => entry.section))].sort(),
    ['4.1', '4.4', '4.5', '4.6', '4.7', '4.7.3', '4.7.4', '4.8']);
  for (const entry of cases) {
    assert.equal(entry.packageId, 'JVM-002');
    for (const release of [21, 25]) assert.equal(entry.specificationRefs[release],
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-4.html#jvms-${entry.section}`);
  }
  for (const id of ['this-class-zero', 'this-class-out-of-range', 'this-class-wrong-tag',
    'duplicate-field', 'duplicate-method', 'duplicate-code', 'duplicate-stack-map',
    'code-length-zero', 'code-length-oversized', 'handler-empty-range', 'handler-target-past-code',
    'stack-map-reserved-frame', 'stack-map-invalid-verification-type', 'stack-map-truncated-frame']) {
    assert.ok(cases.some(entry => entry.id === id), `Required boundary ${id}`);
  }
});

test('every mutation is a deterministic, replayable copy and leaves the genuine header unchanged', () => {
  const original = unitFixture();
  const before = Buffer.from(original);
  for (const entry of structureCases()) {
    const first = mutateStructure(original, entry.id);
    const second = mutateStructure(original, entry.id);
    assert.deepEqual(first, second, entry.id);
    assert.deepEqual(first.bytes.subarray(0, 8), before.subarray(0, 8), entry.id);
    assert.deepEqual(original, before, `${entry.id}: input unchanged`);
    assert.equal(first.edits.length > 0, entry.mutation, entry.id);
    let replay = Buffer.from(original);
    for (const edit of [...first.edits].sort((a, b) => b.offset - a.offset)) replay = Buffer.concat([
      replay.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), replay.subarray(edit.offset + edit.removeBytes)]);
    assert.deepEqual(replay, first.bytes, entry.id);
    assert.equal(first.bytes.equals(original), !entry.mutation, entry.id);
  }
  assert.throws(() => mutateStructure(original, 'unknown-case'), /Unknown structural mutation/);
});

test('duplicate member and nested-attribute edits preserve their enclosing sizes', () => {
  const original = unitFixture();
  for (const [id, name] of [['duplicate-field', 'fields'], ['duplicate-method', 'methods']]) {
    const parsed = readStructureLayout(mutateStructure(original, id).bytes);
    assert.equal(parsed[name].entries.length, 2);
    assert.equal(parsed[name].entries[0].name, parsed[name].entries[1].name);
  }
  const duplicateCode = readStructureLayout(mutateStructure(original, 'duplicate-code').bytes);
  assert.equal(duplicateCode.methods.entries[0].attributes.entries.filter(attr => attr.name === 'Code').length, 2);
  const duplicateMap = readStructureLayout(mutateStructure(original, 'duplicate-stack-map').bytes);
  assert.equal(duplicateMap.methods.entries[0].code.attributes.entries.filter(attr => attr.name === 'StackMapTable').length, 2);
  const truncatedMap = readStructureLayout(mutateStructure(original, 'stack-map-truncated-frame').bytes);
  assert.equal(truncatedMap.methods.entries[0].code.length,
    readStructureLayout(original).methods.entries[0].code.length - 1);
});

test('opaque metadata controls keep valid outer class and attribute framing', () => {
  const original = unitFixture();
  for (const entry of structureCases().filter(item => item.controlKind === 'opaque-attribute-acceptance')) {
    const parsed = readStructureLayout(mutateStructure(original, entry.id).bytes);
    const methodAttribute = ['opaque-parameter-annotations', 'opaque-annotation-default'].includes(entry.id);
    const attributes = methodAttribute ? parsed.methods.entries[0].attributes.entries : parsed.attributes.entries;
    assert.equal(attributes.length, 2);
    assert.ok(/^(?:RuntimeVisible|AnnotationDefault)/.test(attributes[1].name));
    assert.equal(parsed.pool.length, readStructureLayout(original).pool.length + 2);
  }
});

test('offset reader refuses incomplete fixture bytes rather than guessing offsets', () => {
  const original = unitFixture();
  for (const length of [0, 7, 10, 30, original.length - 1]) {
    assert.throws(() => readStructureLayout(original.subarray(0, length)));
  }
});

test('structured exact Java errors allow checking time differences but never rejected initialization', () => {
  const result = success();
  assert.equal(assertStructureResult(result).length, structureCases().length);
  assert.doesNotThrow(() => assertStructureResult({ ...result,
    stdout: result.stdout.replaceAll('@define', '@initialize').replaceAll('\n', '\r\n') }));
  for (const change of [
    { status: 'failed' }, { exitCode: 1 }, { timedOut: true }, { signal: 'SIGTERM' },
    { error: 'host exception' }, { outputLimitExceeded: true }, { stderr: 'TypeError: host failure' },
    { stdout: result.stdout.replace('java.lang.ClassFormatError', 'java.lang.VerifyError') },
    { stdout: result.stdout.replace('java.lang.ClassFormatError', 'java.lang.ClassFormatErrorUnexpected') },
    { stdout: result.stdout.replace('@initialize', '@define') },
    { stdout: result.stdout.replace('this-class-zero=', 'STRUCTURE_TARGET_INITIALIZED\nthis-class-zero=') },
    { stdout: result.stdout.replace('CLASS_STRUCTURE_OK\n', '') },
    { stdout: result.stdout + 'unexpected\n' },
    { stdout: result.stdout.replace('genuine-control=', 'unexpected-control=') },
  ]) assert.throws(() => assertStructureResult({ ...result, ...change }));
});

test('failed host records remain available together with earlier complete executions', async () => {
  const record = { status: 'running', executions: [] };
  await checkStructureExecution(record, 'native', 21, async () => success());
  const failed = { ...success(), status: 'timeout', timedOut: true, exitCode: null };
  await assert.rejects(checkStructureExecution(record, 'chromium', undefined, async () => failed), /timeout/);
  assert.equal(record.status, 'failed');
  assert.equal(record.executions.length, 2);
  assert.equal(record.executions[0].status, 'passed');
  assert.equal(record.executions[1].status, 'failed');
  assert.deepEqual(record.executions[1].result, failed);
  await assert.rejects(checkStructureExecution(record, 'node', undefined, async () => {
    throw new Error('Host launch failure');
  }), /Host launch failure/);
  assert.equal(record.executions[2].status, 'failed');
  assert.match(record.executions[2].error, /Host launch failure/);
});

test('structure gate requires committed and unchanged source provenance', () => {
  const clean = { commit: 'a'.repeat(40), trackedDirty: false };
  assertStructureGitProvenance(clean, { ...clean });
  for (const [start, end] of [[{ ...clean, trackedDirty: true }, clean],
    [clean, { ...clean, trackedDirty: true }], [clean, { ...clean, commit: 'b'.repeat(40) }]]) {
    assert.throws(() => assertStructureGitProvenance(start, end));
  }
});

test('private atomic structure ledger never overwrites unrelated files or follows target symlinks', context => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-structure-ledger-test-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'results.json');
  const ledger = { schemaVersion: 1, scope: structureLedgerScope, status: 'passed', results: [] };
  writeStructureLedger(filename, ledger);
  assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
  assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
  writeStructureLedger(filename, { ...ledger, status: 'failed' });
  fs.writeFileSync(filename, '{"schemaVersion":1,"scope":"unrelated"}\n');
  assert.throws(() => writeStructureLedger(filename, ledger), /unrelated/);
  fs.unlinkSync(filename);
  fs.symlinkSync(path.join(directory, 'elsewhere.json'), filename);
  assert.throws(() => writeStructureLedger(filename, ledger), /non-regular/);
});
