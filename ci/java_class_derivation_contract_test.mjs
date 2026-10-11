import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {derivationCases, derivationSources, mutateDerivation, assertDerivationResult,
  checkDerivationExecution, assertDerivationClasspath, assertDerivationProvenance,
  writeDerivationLedger, derivationLedgerScope} from './java_class_derivation_test.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';

// Synthetic parser-offset fixture only; it is never executed or counted as javac evidence.
function unitFixture() {
  const u2 = value => { const b = Buffer.alloc(2); b.writeUInt16BE(value); return b; };
  const u4 = value => { const b = Buffer.alloc(4); b.writeUInt32BE(value); return b; };
  const pool = [];
  const add = (tag, ...parts) => { pool.push(Buffer.concat([Buffer.from([tag]), ...parts])); return pool.length; };
  const utf = value => add(1, u2(Buffer.byteLength(value)), Buffer.from(value));
  const cls = value => add(7, u2(utf(value)));
  const self = cls('derivation/p/LookupTarget'), object = cls('java/lang/Object');
  const method = utf('integerProbe'), descriptor = utf('()I'), code = utf('Code');
  const sourceName = utf('SourceFile'), source = utf('LookupTarget.java');
  const body = Buffer.concat([u2(1), u2(0), u4(2), Buffer.from([0x08, 0xac]), u2(0), u2(0)]);
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(pool.length + 1), ...pool,
    u2(0x21), u2(self), u2(object), u2(0), u2(0), u2(1),
    u2(9), u2(method), u2(descriptor), u2(1), u2(code), u4(body.length), body,
    u2(1), u2(sourceName), u4(2), u2(source)]);
}

function success() {
  return {status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
    error: null, stderr: '', stdout: derivationCases().flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`))
      .concat(['CLASS_DERIVATION_OK', '']).join('\n')};
}

test('mandatory B4a inventory retains all name, hierarchy, publication and identity controls', () => {
  const cases = derivationCases();
  assert.equal(cases.length, 36);
  assert.equal(new Set(cases.map(entry => entry.id)).size, 36);
  for (const [prefix, count] of [['named-', 4], ['wrong-name-', 2], ['duplicate-', 8],
    ['malformed-', 2], ['identity-', 2], ['initiating-', 2], ['lookup-', 2], ['circular-', 2], ['passive-array-', 2]]) {
    assert.equal(cases.filter(entry => entry.id.startsWith(prefix)).length, count, prefix);
  }
  assert.equal(cases.filter(entry => entry.kind === 'separately-compiled-evolution').length, 5);
  assert.equal(cases.filter(entry => entry.kind === 'explicit-byte-mutation').length, 5);
  assert.equal(cases.filter(entry => entry.kind === 'same-runtime-package').length, 2);
  assert.equal(cases.filter(entry => entry.kind === 'different-runtime-package-loader').length, 2);
  assert.equal(cases.filter(entry => entry.kind === 'genuine-module-descriptor').length, 1);
  assert.equal(cases.filter(entry => entry.kind === 'passive-array-of-invalid-component').length, 2);
  for (const entry of cases) {
    assert.equal(entry.packageId, 'JVM-002');
    assert.ok(entry.trace.includes('no-initialization'));
    assert.ok(entry.payloads.length > 0);
    for (const release of [21, 25]) assert.ok(entry.specificationRefs[release].every(ref =>
      ref.startsWith(`https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-`)));
  }
});

test('hierarchy failures require define-time error and an independent repaired child', () => {
  for (const entry of derivationCases().filter(item => item.kind === 'separately-compiled-evolution')) {
    assert.match(entry.trace[0], /^java\.lang\.(IncompatibleClassChangeError|IllegalAccessError)@define$/);
    assert.deepEqual(entry.trace.slice(1), ['not-published', 'repaired@define', 'repaired@resolve', 'no-initialization']);
    assert.ok(entry.payloads.includes('baseline/derivation.q.Child'));
    assert.ok(entry.payloads.includes('repair/derivation.q.Child'));
  }
  const invalidLookup = derivationCases().find(entry => entry.id === 'lookup-invalid-publication');
  assert.deepEqual(invalidLookup.trace, ['java.lang.VerifyError@lookup-define', 'published-identity-preserved',
    'java.lang.LinkageError@duplicate-define', 'no-initialization']);
});

test('both passive array ranks retain an invalid component while keeping its active verification gate', () => {
  const cases = derivationCases().filter(entry => entry.kind === 'passive-array-of-invalid-component');
  assert.deepEqual(cases.map(entry => entry.id), ['passive-array-rank1', 'passive-array-rank2']);
  for (const entry of cases) {
    assert.deepEqual(entry.payloads, ['baseline/derivation.p.LookupHost', 'baseline/derivation.p.LookupTarget',
      'lookup-invalid/derivation.p.LookupTarget']);
    assert.deepEqual(entry.trace, ['java.lang.VerifyError@lookup-define', 'forname-false-array-identity',
      'forname-true-array-identity', 'array-component-chain-and-loader', 'array-instance-identity',
      'published-component-retained', 'java.lang.VerifyError@component-initialize', 'no-initialization']);
    for (const release of [21, 25]) assert.ok(entry.specificationRefs[release].some(ref => ref.endsWith('#jvms-5.3.3')));
  }
  const result = success();
  for (const entry of cases) for (const event of entry.trace) {
    assert.throws(() => assertDerivationResult({...result, stdout: result.stdout.replace(`${entry.id}=${event}\n`, '')}));
  }
  assert.throws(() => assertDerivationResult({...result, stdout: result.stdout.replace(
    'passive-array-rank2=java.lang.VerifyError@component-initialize', 'passive-array-rank2=accepted@component-initialize')}));
});

test('evolution sources are independent compilations and do not rebuild original children', () => {
  const variants = derivationSources();
  assert.deepEqual(variants.map(entry => entry.variant), ['baseline', 'parent-interface', 'parent-final',
    'parent-package', 'role-class', 'role-package', 'repair', 'module-descriptor']);
  assert.equal(variants[0].sources.length, 6);
  for (const variant of variants.slice(1)) assert.equal(variant.sources.length, 1);
  const repair = variants.find(entry => entry.variant === 'repair').sources[0];
  assert.equal(repair.binaryName, 'derivation.q.Child');
  assert.ok(!repair.text.includes('extends ') && !repair.text.includes('implements '));
  const baselineChild = variants[0].sources.find(entry => entry.binaryName === repair.binaryName);
  assert.match(baselineChild.text, /extends derivation\.p\.Parent implements derivation\.p\.Role/);
  assert.match(variants.find(entry => entry.variant === 'parent-interface').sources[0].text, /public interface Parent/);
  assert.match(variants.find(entry => entry.variant === 'parent-final').sources[0].text, /public final class Parent/);
  assert.match(variants.find(entry => entry.variant === 'module-descriptor').sources[0].text, /^module /);
  assert.deepEqual(derivationSources(), variants, 'Stable emitted source text');
});

test('all explicit mutations replay exactly without changing genuine version headers', () => {
  const original = unitFixture(), before = Buffer.from(original);
  for (const variant of ['malformed-magic', 'malformed-truncation', 'circular-super', 'circular-interface', 'lookup-invalid']) {
    const mutation = mutateDerivation(original, variant);
    assert.deepEqual(mutation, mutateDerivation(original, variant));
    assert.deepEqual(original, before);
    assert.equal(mutation.edits.length, 1);
    let replay = Buffer.from(original);
    for (const edit of mutation.edits) {
      assert.equal(edit.beforeHex, replay.subarray(edit.offset, edit.offset + edit.removeBytes).toString('hex'));
      assert.ok(edit.reason.length > 0);
      replay = Buffer.concat([replay.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), replay.subarray(edit.offset + edit.removeBytes)]);
    }
    assert.deepEqual(replay, mutation.bytes);
    assert.deepEqual(mutation.bytes.subarray(4, 8), original.subarray(4, 8));
    if (!variant.startsWith('malformed-')) assert.equal(readStructureLayout(mutation.bytes).methods.entries.length, 1);
  }
  assert.throws(() => mutateDerivation(original, 'missing'), /Unknown derivation mutation/);
});

test('Lookup mutation is exactly one wrong-type instruction, with intact declaration and framing', () => {
  const original = unitFixture(), mutation = mutateDerivation(original, 'lookup-invalid');
  const method = readStructureLayout(original).methods.entries[0];
  assert.equal(mutation.edits[0].offset, method.code.instructionsOffset);
  assert.equal(mutation.edits[0].beforeHex, '08');
  assert.equal(mutation.edits[0].insertHex, '0b');
  assert.equal(mutation.bytes.length, original.length);
  assert.equal([...mutation.bytes].filter((byte, index) => byte !== original[index]).length, 1);
  const wrong = Buffer.from(original); wrong[method.code.instructionsOffset] = 0x03;
  assert.throws(() => mutateDerivation(wrong, 'lookup-invalid'), /iconst_5/);
});

test('circular hierarchy mutations retain this_class identity and otherwise complete structure', () => {
  const original = unitFixture(), layout = readStructureLayout(original);
  const superclass = mutateDerivation(original, 'circular-super').bytes;
  assert.equal(superclass.readUInt16BE(layout.superClassOffset), layout.thisClass);
  const interfaces = mutateDerivation(original, 'circular-interface').bytes;
  const changed = readStructureLayout(interfaces);
  assert.equal(changed.interfaceCount, 1);
  assert.equal(interfaces.readUInt16BE(changed.interfacesOffset), layout.thisClass);
  assert.throws(() => mutateDerivation(interfaces, 'circular-interface'), /no superinterfaces/);
});

test('exact output requires all traces and rejects wrong failure phase or published-state claims', () => {
  const result = success();
  assert.equal(assertDerivationResult(result).length, 36);
  assert.doesNotThrow(() => assertDerivationResult({...result, stdout: result.stdout.replaceAll('\n', '\r\n')}));
  for (const change of [
    {status: 'failed'}, {exitCode: 1}, {signal: 'SIGTERM'}, {timedOut: true}, {outputLimitExceeded: true},
    {error: 'launch failure'}, {stderr: 'warning'},
    {stdout: result.stdout.replace('super-final=java.lang.IncompatibleClassChangeError@define', 'super-final=java.lang.IncompatibleClassChangeError@resolve')},
    {stdout: result.stdout.replace('wrong-name-class=java.lang.NoClassDefFoundError', 'wrong-name-class=java.lang.ClassFormatError')},
    {stdout: result.stdout.replace('lookup-invalid-publication=published-identity-preserved', 'lookup-invalid-publication=not-published')},
    {stdout: result.stdout.replace('super-final=repaired@resolve\n', '')},
    {stdout: result.stdout.replace('named-class-exact=no-initialization', 'PAYLOAD_INITIALIZED')},
    {stdout: result.stdout.replace('CLASS_DERIVATION_OK\n', '')}, {stdout: result.stdout + 'extra\n'},
    {stdout: result.stdout.replace('named-class-exact=', 'other=')}
  ]) assert.throws(() => assertDerivationResult({...result, ...change}));
});

test('failed and unlaunched host executions remain in the attempted ledger', async () => {
  const record = {release: 21, status: 'running', executions: []};
  await checkDerivationExecution(record, 'native', async () => success());
  assert.equal(record.executions[0].outcomes.length, 36);
  const failure = {...success(), status: 'timeout', timedOut: true, exitCode: null};
  await assert.rejects(checkDerivationExecution(record, 'node', async () => failure));
  assert.equal(record.status, 'failed');
  assert.equal(record.executions[0].status, 'passed');
  assert.deepEqual(record.executions[1].result, failure);
  await assert.rejects(checkDerivationExecution(record, 'chromium', async () => { throw new Error('Launch failure'); }), /Launch failure/);
  assert.match(record.executions[2].error, /Launch failure/);
});

test('runtime classpath excludes all fallback payload class files and undeclared resources', () => {
  const driver = ['classes/modern_test/JavaClassDerivation$PayloadLoader.class', 'classes/modern_test/JavaClassDerivation.class']
    .map((filename, index) => ({path: filename, size: 20 + index, sha256: String(index).repeat(64)}));
  const payloads = [{resource: {path: 'derivation-cases/baseline/derivation/p/Parent.bin', size: 40, sha256: '2'.repeat(64)}}];
  const files = [...driver, payloads[0].resource];
  assertDerivationClasspath(files, driver, payloads);
  assert.throws(() => assertDerivationClasspath([...files, {path: 'derivation/p/Parent.class', size: 40, sha256: '2'.repeat(64)}], driver, payloads));
  assert.throws(() => assertDerivationClasspath(files.slice(1), driver, payloads));
  assert.throws(() => assertDerivationClasspath(files, [...driver, {path: 'Extra.class', size: 1, sha256: '3'.repeat(64)}], payloads));
  const extra = {resource: {path: 'derivation/p/Parent.class', size: 40, sha256: '2'.repeat(64)}};
  assert.throws(() => assertDerivationClasspath([...driver, extra.resource], driver, [extra]));
});

test('official evidence requires a clean unchanged committed tree', () => {
  const clean = {commit: 'a'.repeat(40), trackedDirty: false};
  assertDerivationProvenance(clean, clean);
  assert.throws(() => assertDerivationProvenance({...clean, trackedDirty: true}, clean));
  assert.throws(() => assertDerivationProvenance(clean, {...clean, trackedDirty: true}));
  assert.throws(() => assertDerivationProvenance(clean, {...clean, commit: 'b'.repeat(40)}));
  assert.throws(() => assertDerivationProvenance({...clean, commit: 'HEAD'}, clean));
});

test('atomic scoped ledger writes preserve unrelated files, symlinks and hardlinks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-derivation-ledger-unit-'));
  try {
    const filename = path.join(directory, 'ledger.json');
    const ledger = {schemaVersion: 1, scope: derivationLedgerScope, status: 'failed', error: 'Retained failure'};
    writeDerivationLedger(filename, ledger);
    assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    writeDerivationLedger(filename, {...ledger, status: 'passed'});
    const unrelated = path.join(directory, 'unrelated.json');
    fs.writeFileSync(unrelated, '{}');
    assert.throws(() => writeDerivationLedger(unrelated, ledger));
    assert.equal(fs.readFileSync(unrelated, 'utf8'), '{}');
    const link = path.join(directory, 'link.json'); fs.symlinkSync(filename, link);
    assert.throws(() => writeDerivationLedger(link, ledger));
    const hard = path.join(directory, 'hard.json'); fs.linkSync(filename, hard);
    assert.throws(() => writeDerivationLedger(hard, ledger));
    assert.throws(() => writeDerivationLedger(filename, ledger));
    assert.throws(() => writeDerivationLedger(path.join(directory, 'invalid.json'), {...ledger, scope: 'other'}));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
