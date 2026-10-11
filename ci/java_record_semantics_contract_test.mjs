import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import * as records from './java_record_semantics_test.mjs';
import signatures, {mutateRecordComponentSignature} from './java_record_signatures_cases.mjs';
import {readRecordClass} from './java_record_metadata.mjs';
import {assertCoreResult, assertCoreCompilerSources, checkCoreCompilation, checkCoreExecution, CoreIntegrityError}
  from './java_core_semantics_test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceIndex = JSON.parse(fs.readFileSync(path.join(root, 'ci/plan_spec_source_index.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const success = group => ({status: 'passed', exitCode: 0, signal: null, error: null, timedOut: false,
  outputLimitExceeded: false, stderr: '', stdout: group.cases.flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`)).concat([group.completionMarker, '']).join('\n')});

test('B6 has three mandatory independent groups and fixed 77-case inventory', () => {
  assert.deepEqual(records.recordGroups.map(group => [group.id, group.cases.length]),
    [['record-types', 29], ['record-semantics', 40], ['record-signatures', 8]]);
  assert.equal(records.validateRecordGroups(), 77);
  for (const group of records.recordGroups) {
    const source = fs.readFileSync(path.join(root, group.source), 'utf8');
    assert.match(source, /package classes\.modern_test;/);
    for (const entry of group.cases) assert.ok(source.includes(entry.entryMethod + '('), 'Actual Java case entry');
  }
  assert.equal(signatures.cases.filter(entry => entry.kind === 'genuine-compiler-control').length, 3);
  assert.equal(signatures.cases.filter(entry => entry.kind === 'genuine-binary-evolution').length, 2);
  assert.equal(signatures.cases.filter(entry => entry.kind === 'explicit-component-signature-mutation').length, 3);
  assert.deepEqual(signatures.carrierSources(), signatures.carrierSources());
  assert.deepEqual(signatures.replacementSources(), signatures.replacementSources());
  assert.equal(signatures.carrierSources().length, 5); assert.equal(signatures.replacementSources().length, 1);
});

test('both editions bind all fourteen JVM-006 record source units without assessment promotion', () => {
  const observed = new Set();
  for (const group of records.recordGroups) for (const entry of records.recordsSourceUnits(group, sourceIndex)) {
    assert.ok(entry.sourceUnits.some(unit => unit.ownerPackageId === 'JVM-006'));
    for (const unit of entry.sourceUnits) {
      const indexed = sourceIndex.units.find(item => item.id === unit.id);
      assert.equal(unit.url, indexed.url); assert.equal(unit.ownerPackageId, indexed.ownerPackageId);
      assert.equal(unit.assessmentStatus, indexed.assessmentStatus); assert.equal(unit.fullUnitConformanceProven, false);
      observed.add(unit.id);
    }
  }
  const owned = sourceIndex.units.filter(unit => unit.ownerPackageId === 'JVM-006');
  assert.equal(owned.length, 14); for (const unit of owned) assert.ok(observed.has(unit.id), unit.id);
  const changed = {...records.recordGroups[0], cases: structuredClone(records.recordGroups[0].cases)};
  changed.cases[0].anchors.JVMS = ['4.7.not-real'];
  assert.throws(() => records.recordsSourceUnits(changed, sourceIndex), /Indexed record source anchor/);
});

test('all 18 release/group/host cells are registered before I/O including native-only excluded hosts', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = records.createRecordLedger(mode);
    assert.equal(ledger.results.length, 6); assert.equal(ledger.caseCount, 77);
    assert.equal(ledger.results.flatMap(record => record.executions).length, 18);
    assert.deepEqual(ledger.requiredReleases, [21, 25]); assert.deepEqual(ledger.requiredHosts, ['native', 'node', 'chromium']);
    assert.equal(ledger.officialGate, mode === 'browser');
    for (const property of ['phaseBComplete', 'jvm006Complete', 'fullSourceUnitConformanceProven', 'generalBootstrapConformanceProven'])
      assert.equal(ledger[property], false);
    for (const record of ledger.results) {
      assert.equal(record.status, 'not-run'); assert.deepEqual(record.operations, []);
      assert.ok(record.executions.every(cell => cell.status === 'not-run' && cell.reason));
    }
    records.assertRecordLedgerInventory(ledger, {phase: 'initial'});
  }
  assert.deepEqual(records.recordTimeouts, {compileMs: 60000, nativeMs: 30000, guestMs: 60000});
});

const corruptions = [
  ledger => { ledger.results = []; }, ledger => { ledger.results.pop(); }, ledger => { ledger.results.reverse(); },
  ledger => { ledger.results[1] = structuredClone(ledger.results[0]); }, ledger => { ledger.results[0].release = 24; },
  ledger => { ledger.results[0].group = 'unregistered'; }, ledger => { ledger.requiredReleases.pop(); },
  ledger => { ledger.requiredHosts = ['native']; }, ledger => { ledger.caseCount--; },
  ledger => { ledger.results[0].cases.pop(); }, ledger => { ledger.results[0].cases.reverse(); },
  ledger => { ledger.results[0].cases[0].trace = ['waived']; },
  ledger => { ledger.results[0].cases[0].recordProofs = []; },
  ledger => { ledger.results[0].cases[0].probes[0].requiredOpcodes = []; },
  ledger => { ledger.results[0].recordClassNames.pop(); },
  ledger => { ledger.results[0].executions.pop(); }, ledger => { ledger.results[0].executions.reverse(); },
  ledger => { ledger.results[0].executions[1] = structuredClone(ledger.results[0].executions[0]); },
  ledger => { ledger.requestedMode = 'unknown'; }, ledger => { ledger.officialGate = false; },
  ledger => { ledger.jvm006Complete = true; }, ledger => { ledger.generalBootstrapConformanceProven = true; }
];

test('canonical ledger rejects subsets, altered contracts, duplicated hosts and inflated completion claims', () => {
  for (const corrupt of corruptions) for (const phase of ['initial', 'terminal']) {
    const ledger = records.createRecordLedger(); corrupt(ledger);
    assert.throws(() => records.assertRecordLedgerInventory(ledger, {phase}));
  }
  assert.throws(() => records.createRecordLedger('unknown'), /mode/);
  assert.throws(() => records.createRecordLedger('browser', []), /Nonempty/);
  assert.throws(() => records.createRecordLedger('browser', records.recordGroups.slice(1)), /mandatory/);
  const changed = records.recordGroups.map(group => ({...group, cases: structuredClone(group.cases)}));
  changed[0].cases.pop(); assert.throws(() => records.createRecordLedger('browser', changed), /mandatory/);
  const replacement = [...records.recordGroups]; replacement[2] = {...replacement[2], carrierSources: () => []};
  assert.throws(() => records.createRecordLedger('browser', replacement), /compiler inputs/);
});

test('record contracts reject missing opcode/metadata obligations instead of silently dropping evidence', () => {
  for (const replacement of [null, [], {}, undefined]) {
    const group = {...records.recordGroups[0], cases: structuredClone(records.recordGroups[0].cases)};
    group.cases[0].probes = replacement; assert.throws(() => records.validateRecordGroups([group]), /executable record probes/);
  }
  for (const replacement of [null, [], 'getfield', ['bad-opcode']]) {
    const group = {...records.recordGroups[0], cases: structuredClone(records.recordGroups[0].cases)};
    group.cases[0].probes[0].requiredOpcodes = replacement;
    assert.throws(() => records.validateRecordGroups([group]), /required record opcodes/);
  }
  const group = {...records.recordGroups[0], cases: structuredClone(records.recordGroups[0].cases)};
  group.cases[0].recordProofs = []; assert.throws(() => records.validateRecordGroups([group]), /metadata contracts/);
});

test('record inventory is deeply frozen and per-release ledgers cannot mutate canonical or peer cases', () => {
  assert.throws(() => records.recordGroups.pop(), TypeError);
  assert.throws(() => { records.recordGroups[0].cases[0].recordProofs = []; }, TypeError);
  assert.throws(() => records.recordGroups[2].recordClassNames.pop(), TypeError);
  const ledger = records.createRecordLedger(), original = ledger.results[3].cases.length;
  ledger.results[0].cases.pop(); ledger.results[0].recordClassNames.pop();
  assert.equal(ledger.results[3].cases.length, original);
  assert.equal(records.recordGroups[0].cases.length, original);
  assert.equal(ledger.results[3].recordClassNames.length, records.recordGroups[0].recordClassNames.length);
});

test('malformed ledger is rejected before toolchain or subprocess operations', async () => {
  const original = fs.readFileSync;
  fs.readFileSync = function(filename, ...args) {
    assert.ok(!String(filename).endsWith('java_compatibility_toolchains.lock.json'), 'Invalid record inventory reached I/O');
    return original.call(this, filename, ...args);
  };
  try { for (const corrupt of corruptions) { const ledger = records.createRecordLedger(); corrupt(ledger); await assert.rejects(records.runRecordSemantics(ledger)); } }
  finally { fs.readFileSync = original; }
});

test('terminal record checks retain excluded diagnostic cells and refuse missing required host results', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = records.createRecordLedger(mode);
    for (const record of ledger.results) {
      record.status = 'passed';
      for (const cell of record.executions) if (cell.host === 'native' || mode === 'browser' || mode === 'diagnostic' && cell.host === 'node') cell.status = 'passed';
    }
    records.assertRecordLedgerInventory(ledger, {phase: 'terminal'});
    ledger.results[0].executions[0].status = 'not-run';
    assert.throws(() => records.assertRecordLedgerInventory(ledger, {phase: 'terminal'}), /mandatory/);
  }
});

test('exact record traces reject stderr, exit errors, reordered/missing cases and wrong exception subclasses', () => {
  for (const group of records.recordGroups) assert.equal(assertCoreResult(success(group), group).length, group.cases.length);
  const good = success(signatures);
  for (const changed of [{...good, exitCode: 1}, {...good, stderr: 'warning'}, {...good, timedOut: true},
    {...good, outputLimitExceeded: true}, {...good, stdout: good.stdout.replace('java.lang.TypeNotPresentException', 'java.lang.RuntimeException')},
    {...good, stdout: good.stdout.split('\n').slice(1).join('\n')},
    {...good, stdout: good.stdout.replace('RECORD_SIGNATURES_OK', 'OTHER_OK')}])
    assert.throws(() => assertCoreResult(changed, signatures));
});

test('raw compiler evidence is checkpointed before even unsuccessful compilation integrity errors', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-record-compiler-contract-'));
  try {
    const filename = path.join(directory, 'Carrier.java'), source = 'class Carrier {}\n'; fs.writeFileSync(filename, source);
    const baseline = [{path: filename, sha256: sha(source)}], operation = {}, checkpoints = [];
    const result = {status: 'failed', exitCode: 1, stdout: '', stderr: 'javac failed'};
    await assert.rejects(checkCoreCompilation(operation, async () => { fs.writeFileSync(filename, source + '// changed\n'); return result; },
      () => assertCoreCompilerSources(baseline), () => checkpoints.push(structuredClone(operation))), CoreIntegrityError);
    assert.deepEqual(operation.result, result); assert.deepEqual(checkpoints[0].result, result); assert.equal(baseline[0].sha256, sha(source));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('raw host timeout/failure is retained before integrity rejection and never converted into a waiver', async () => {
  const cell = {host: 'node', status: 'not-run'}, checkpoints = [];
  const raw = {...success(signatures), status: 'timeout', timedOut: true, exitCode: null, stderr: 'partial failure'};
  await assert.rejects(checkCoreExecution(cell, signatures, async () => raw,
    () => { throw new CoreIntegrityError('changed materialized record input'); }, () => checkpoints.push(structuredClone(cell))), CoreIntegrityError);
  assert.deepEqual(cell.result, raw); assert.equal(cell.status, 'failed');
  assert.ok(checkpoints.some(checkpoint => checkpoint.result?.stderr === 'partial failure' && checkpoint.status === 'running'));
  assert.ok(!cell.outcomes);
});

test('record ledgers are durable private files and diagnostics cannot overwrite official evidence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-record-ledger-contract-'));
  try {
    const filename = path.join(directory, 'results.json'), ledger = records.createRecordLedger();
    records.writeRecordLedger(filename, ledger);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    const raw = JSON.parse(fs.readFileSync(filename)); assert.equal(raw.results.flatMap(record => record.executions).length, 18);
    assert.throws(() => records.writeRecordLedger(filename, records.createRecordLedger('native-only')), /Diagnostics/);
    const link = path.join(directory, 'linked.json'); fs.symlinkSync(filename, link);
    assert.throws(() => records.writeRecordLedger(link, ledger), /Regular unlinked/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('resource inventory rejects fallback originals, missing/reordered/changed payloads and symlinks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-record-resource-contract-'));
  // Deliberately arbitrary bytes prove inventory bookkeeping only. Genuine
  // modern payload parsing, mutation replay and host execution are separate.
  const emit = (relative, bytes) => {
    const filename = path.join(directory, relative); fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, bytes);
    return {path: relative, size: bytes.length, sha256: sha(bytes)};
  };
  try {
    const drivers = ['classes/modern_test/JavaRecordSignatures$PayloadLoader.class', 'classes/modern_test/JavaRecordSignatures.class']
      .map(name => emit(name, Buffer.from(name)));
    const payloads = signatures.cases.flatMap(entry => entry.payload.resources.map(resource => {
      const file = emit(resource, Buffer.from(entry.id + resource)); return {...file, resourcePath: resource, id: entry.id};
    }));
    const check = () => records.assertRecordSignatureClasspath(directory, drivers, payloads); check();
    assert.throws(() => records.assertRecordSignatureClasspath(directory, drivers.slice(1), payloads), /two genuine/);
    assert.throws(() => records.assertRecordSignatureClasspath(directory, drivers, payloads.slice(1)), /mandatory/);
    assert.throws(() => records.assertRecordSignatureClasspath(directory, drivers, [...payloads].reverse()), /mandatory/);
    const fallback = emit('recordsignature/SignatureRecord.class', Buffer.from('fallback'));
    assert.throws(check, /resource-only/); fs.unlinkSync(path.join(directory, fallback.path));
    const filename = path.join(directory, payloads[0].resourcePath), original = fs.readFileSync(filename);
    fs.writeFileSync(filename, Buffer.alloc(original.length)); assert.throws(check, /resource-only/);
    fs.unlinkSync(filename); assert.throws(check, /resource-only/); fs.writeFileSync(filename, original); check();
    const linked = path.join(directory, 'extra.bin'); fs.symlinkSync(filename, linked); assert.throws(check, /No linked/); fs.unlinkSync(linked); check();
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
function metadataFixture(major = 65) {
  // Synthetic class-file bytes exclusively test the independent metadata reader;
  // they are never advertised as javac output or entered in a host ledger.
  const constants = [], add = bytes => { constants.push(bytes); return constants.length; };
  const utf = value => { const bytes = Buffer.from(value); return add(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes])); };
  const cls = name => add(Buffer.concat([Buffer.from([7]), u2(utf(name))]));
  const owner = cls('recordsignature/SignatureRecord'), parent = cls('java/lang/Record');
  const fieldName = utf('value'), fieldDescriptor = utf('Ljava/util/List;'), sharedSignature = utf('Ljava/util/List<Ljava/lang/String;>;');
  const signatureName = utf('Signature'), recordName = utf('Record'), codeName = utf('Code'), annotationName = utf('RuntimeVisibleTypeAnnotations');
  const annotationDescriptor = utf('Lrecordsignature/Tag;'), annotationValueName = utf('value'), annotationValue = utf('component');
  const initName = utf('<init>'), initDescriptor = utf('(Ljava/util/List;)V');
  const initType = add(Buffer.concat([Buffer.from([12]), u2(initName), u2(utf('()V'))]));
  const superInit = add(Buffer.concat([Buffer.from([10]), u2(parent), u2(initType)]));
  const fieldType = add(Buffer.concat([Buffer.from([12]), u2(fieldName), u2(fieldDescriptor)]));
  const fieldRef = add(Buffer.concat([Buffer.from([9]), u2(owner), u2(fieldType)]));
  const attribute = (name, value) => Buffer.concat([u2(name), u4(value.length), value]);
  const signature = attribute(signatureName, u2(sharedSignature));
  const typeAnnotation = attribute(annotationName, Buffer.concat([u2(1), Buffer.from([0x13, 1, 3, 0]),
    u2(annotationDescriptor), u2(1), u2(annotationValueName), Buffer.from([115]), u2(annotationValue)]));
  const instructions = Buffer.concat([Buffer.from([42, 183]), u2(superInit), Buffer.from([42, 43, 181]), u2(fieldRef), Buffer.from([177])]);
  const code = attribute(codeName, Buffer.concat([u2(2), u2(2), u4(instructions.length), instructions, u2(0), u2(0)]));
  const record = attribute(recordName, Buffer.concat([u2(1), u2(fieldName), u2(fieldDescriptor), u2(2), signature, typeAnnotation]));
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe]), u2(0), u2(major), u2(constants.length + 1), ...constants,
    u2(0x31), u2(owner), u2(parent), u2(0), u2(1), u2(0x12), u2(fieldName), u2(fieldDescriptor), u2(1), signature,
    u2(1), u2(1), u2(initName), u2(initDescriptor), u2(1), code, u2(1), record]);
}

test('independent reader retains nested Record offsets, shared field Signature and actual type paths', () => {
  const bytes = metadataFixture(), metadata = readRecordClass(bytes), component = metadata.record.components[0], field = metadata.fields[0];
  assert.equal(metadata.name, 'recordsignature.SignatureRecord'); assert.equal(metadata.major, 65);
  assert.equal(component.name, 'value'); assert.equal(component.descriptor, 'Ljava/util/List;');
  assert.equal(component.signature, 'Ljava/util/List<Ljava/lang/String;>;');
  assert.equal(component.signatureIndex, field.signatureIndex); assert.notEqual(component.signatureIndexOffset, field.signatureIndexOffset);
  assert.deepEqual(component.typeAnnotations.map(({descriptor, visible, targetType, path: typePath, values}) =>
    ({descriptor, visible, targetType, path: typePath, values})),
  [{descriptor: 'Lrecordsignature/Tag;', visible: true, targetType: 0x13, path: [[3, 0]], values: {value: 'component'}}]);
  assert.deepEqual(field.typeAnnotations, []); assert.ok(metadata.methods[0].code.instructions.some(instruction => instruction.name === 'putfield'));
});

test('all three malformed signature variants replay exactly and preserve CP/member/Code/major identity', () => {
  for (const major of [65, 69]) for (const entry of signatures.cases.filter(item => item.kind === 'explicit-component-signature-mutation')) {
    const original = metadataFixture(major), pristine = Buffer.from(original), before = readRecordClass(original);
    const changed = mutateRecordComponentSignature(original, entry), after = readRecordClass(changed.bytes);
    assert.equal(changed.edits.length, 3); assert.ok(original.equals(pristine)); assert.equal(changed.originalSha256, sha(original));
    const replay = changed.edits.slice().sort((a, b) => b.offset - a.offset).reduce((bytes, edit) => {
      assert.equal(original.subarray(edit.offset, edit.offset + edit.removeBytes).toString('hex'), edit.beforeHex);
      return Buffer.concat([bytes.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), bytes.subarray(edit.offset + edit.removeBytes)]);
    }, Buffer.from(original));
    assert.ok(replay.equals(changed.bytes)); assert.equal(changed.mutatedSha256, sha(replay)); assert.equal(after.major, major);
    assert.equal(after.record.components[0].signature, entry.payload.signature);
    assert.equal(after.fields[0].signature, before.fields[0].signature); assert.equal(after.fields[0].signatureIndex, before.fields[0].signatureIndex);
    assert.deepEqual(after.methods.map(method => [method.name, method.descriptor, method.code.sha256]), before.methods.map(method => [method.name, method.descriptor, method.code.sha256]));
    assert.deepEqual(after.record.components[0].typeAnnotations.map(item => [item.descriptor, item.path, item.values]),
      before.record.components[0].typeAnnotations.map(item => [item.descriptor, item.path, item.values]));
  }
});

test('independent Record parsing rejects corrupt nested bounds, CP tags and invalid type paths', () => {
  const original = metadataFixture(), metadata = readRecordClass(original), component = metadata.record.components[0];
  const wrongIndex = Buffer.from(original); wrongIndex.writeUInt16BE(metadata.layout.thisClass, component.signatureIndexOffset);
  assert.throws(() => readRecordClass(wrongIndex), /UTF8/);
  const signature = component.attributes.find(attribute => attribute.name === 'Signature'), oversized = Buffer.from(original);
  oversized.writeUInt32BE(0xffffffff, signature.start + 2); assert.throws(() => readRecordClass(oversized), /Bounded nested/);
  const typeAnnotation = component.attributes.find(attribute => attribute.name === 'RuntimeVisibleTypeAnnotations'), badPath = Buffer.from(original);
  badPath[typeAnnotation.body + 4] = 4; assert.throws(() => readRecordClass(badPath), /type path/);
  assert.throws(() => readRecordClass(Buffer.concat([original, Buffer.from([0])])), /trailing/);
});
