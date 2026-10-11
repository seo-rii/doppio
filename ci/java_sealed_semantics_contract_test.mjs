import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import * as sealed from './java_sealed_semantics_test.mjs';
import metadata from './java_sealed_metadata_cases.mjs';
import {assertSealedMutationProvenance, proveSealedGroup, readSealedClass} from './java_sealed_metadata.mjs';
import {assertCoreResult, assertCoreCompilerSources, checkCoreCompilation, checkCoreExecution, CoreIntegrityError} from './java_core_semantics_test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceIndex = JSON.parse(fs.readFileSync(path.join(root, 'ci/plan_spec_source_index.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rawGroup = {id: 'contract-only', completionMarker: 'SEALED_CONTRACT_OK', cases: [
  {id: 'contract-first', trace: ['error=java.lang.ClassFormatError', 'identity=true']},
  {id: 'contract-second', trace: ['error=java.lang.IncompatibleClassChangeError']}
]};
const success = (group = rawGroup) => ({status: 'passed', exitCode: 0, signal: null, error: null, timedOut: false,
  outputLimitExceeded: false, stderr: '', stdout: group.cases.flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`))
    .concat([group.completionMarker, '']).join('\n')});

test('B7 retains all three mandatory groups and all 62 cases including native-first taxonomy', () => {
  assert.deepEqual(sealed.sealedGroups.map(group => [group.id, group.cases.length]),
    [['sealed-reflection', 20], ['sealed-loading', 20], ['sealed-metadata', 22]]);
  assert.equal(sealed.validateSealedGroups(), 62);
  for (const group of sealed.sealedGroups) {
    const source = fs.readFileSync(path.join(root, group.source), 'utf8');
    assert.match(source, /package classes\.modern_test;/);
    for (const entry of group.cases) assert.ok(source.includes(entry.entryMethod + '('), 'Actual genuine Java entry method');
    if (group.compilationUnits) assert.deepEqual(group.compilationUnits(), group.compilationUnits());
  }
  const taxonomy = metadata.cases.filter(entry => ['sm-duplicate-entry', 'sm-array-entry', 'sm-old-major-opaque'].includes(entry.id));
  assert.equal(taxonomy.length, 3);
  for (const entry of taxonomy) assert.equal(entry.oracleKind, 'pinned-native-regression');
});

test('both editions bind all eight JVM-007 units without assessment or dependency promotion', () => {
  const observed = new Set();
  for (const group of sealed.sealedGroups) for (const entry of sealed.sealedSourceUnits(group, sourceIndex)) {
    assert.ok(entry.sourceUnits.some(unit => unit.ownerPackageId === 'JVM-007'));
    for (const unit of entry.sourceUnits) {
      const indexed = sourceIndex.units.find(candidate => candidate.id === unit.id);
      assert.equal(unit.url, indexed.url); assert.equal(unit.ownerPackageId, indexed.ownerPackageId);
      assert.equal(unit.assessmentStatus, indexed.assessmentStatus); assert.equal(unit.fullUnitConformanceProven, false); observed.add(unit.id);
    }
  }
  const owned = sourceIndex.units.filter(unit => unit.ownerPackageId === 'JVM-007');
  assert.equal(owned.length, 8);
  for (const unit of owned) { assert.ok(observed.has(unit.id), unit.id); assert.equal(unit.assessmentStatus, 'unassessed'); }
  const changed = {...sealed.sealedGroups[0], cases: structuredClone(sealed.sealedGroups[0].cases)};
  changed.cases[0].anchors.JVMS = ['4.7.not-real'];
  assert.throws(() => sealed.sealedSourceUnits(changed, sourceIndex), /Indexed sealed/);
});

test('all 18 release/group/host cells are registered before I/O in every mode', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = sealed.createSealedLedger(mode);
    assert.equal(ledger.caseCount, 62); assert.equal(ledger.results.length, 6);
    assert.equal(ledger.results.flatMap(record => record.executions).length, 18);
    assert.deepEqual(ledger.requiredReleases, [21, 25]); assert.deepEqual(ledger.requiredHosts, ['native', 'node', 'chromium']);
    assert.equal(ledger.officialGate, mode === 'browser');
    for (const key of ['phaseBComplete', 'jvm007Complete', 'fullSourceUnitConformanceProven', 'fullClassFileConformanceProven',
      'generalBootstrapConformanceProven', 'generalInitializationConformanceProven', 'namedModuleRuntimeConformanceProven']) assert.equal(ledger[key], false);
    for (const record of ledger.results) {
      assert.equal(record.status, 'not-run'); assert.deepEqual(record.operations, []);
      assert.ok(record.executions.every(cell => cell.status === 'not-run' && cell.reason));
    }
    sealed.assertSealedLedgerInventory(ledger, {phase: 'initial'});
  }
  assert.deepEqual(sealed.sealedTimeouts, {compileMs: 60000, nativeMs: 30000, guestMs: 60000});
});

const corruptions = [
  ledger => { ledger.results = []; }, ledger => { ledger.results.pop(); }, ledger => { ledger.results.reverse(); },
  ledger => { ledger.results[1] = structuredClone(ledger.results[0]); }, ledger => { ledger.results[0].release = 24; },
  ledger => { ledger.results[0].group = 'unregistered'; }, ledger => { ledger.requiredReleases.pop(); },
  ledger => { ledger.requiredHosts = ['native']; }, ledger => { ledger.caseCount--; },
  ledger => { ledger.results[0].cases.pop(); }, ledger => { ledger.results[0].cases.reverse(); },
  ledger => { ledger.results[0].cases[0].trace = ['waived']; }, ledger => { ledger.results[0].cases[0].sealedProofs = []; },
  ledger => { ledger.results[0].cases[0].probes[0].requiredOpcodes = []; }, ledger => { ledger.results[0].driverClassNames.pop(); },
  ledger => { ledger.results[2].cases[0].payloads[0].compilationUnitId = 'foreign-unit'; },
  ledger => { ledger.results[2].cases[0].payloads[0].loaderTree = 'foreign'; },
  ledger => { ledger.results[0].executions.pop(); }, ledger => { ledger.results[0].executions.reverse(); },
  ledger => { ledger.results[0].executions[1] = structuredClone(ledger.results[0].executions[0]); },
  ledger => { ledger.requestedMode = 'unknown'; }, ledger => { ledger.officialGate = false; },
  ...['phaseBComplete', 'jvm007Complete', 'fullSourceUnitConformanceProven', 'fullClassFileConformanceProven',
    'generalBootstrapConformanceProven', 'generalInitializationConformanceProven', 'namedModuleRuntimeConformanceProven']
    .map(key => ledger => { ledger[key] = true; })
];

test('canonical inventory rejects pruning, modified proofs/routes, duplicated hosts and inflated completion', () => {
  for (const corrupt of corruptions) for (const phase of ['initial', 'terminal']) {
    const ledger = sealed.createSealedLedger(); corrupt(ledger);
    assert.throws(() => sealed.assertSealedLedgerInventory(ledger, {phase}));
  }
  assert.throws(() => sealed.createSealedLedger('unknown'), /mode/);
  assert.throws(() => sealed.createSealedLedger('browser', []), /Nonempty/);
  assert.throws(() => sealed.createSealedLedger('browser', sealed.sealedGroups.slice(1)), /mandatory/);
  const changed = sealed.sealedGroups.map(group => ({...group, cases: structuredClone(group.cases)}));
  changed[0].cases.pop(); assert.throws(() => sealed.createSealedLedger('browser', changed), /mandatory/);
  const replacement = [...sealed.sealedGroups]; replacement[1] = {...replacement[1], compilationUnits: () => []};
  assert.throws(() => sealed.createSealedLedger('browser', replacement));
});

test('missing executable/metadata/selector/source obligations cannot silently disappear', () => {
  for (const value of [null, [], {}, undefined]) {
    const group = {...sealed.sealedGroups[0], cases: structuredClone(sealed.sealedGroups[0].cases)};
    group.cases[0].probes = value; assert.throws(() => sealed.validateSealedGroups([group]), /executable sealed probes/);
  }
  for (const value of [null, [], 'invokevirtual', ['bad-opcode']]) {
    const group = {...sealed.sealedGroups[0], cases: structuredClone(sealed.sealedGroups[0].cases)};
    group.cases[0].probes[0].requiredOpcodes = value; assert.throws(() => sealed.validateSealedGroups([group]), /required sealed opcodes/);
  }
  const group = {...sealed.sealedGroups[0], cases: structuredClone(sealed.sealedGroups[0].cases)};
  group.cases[0].sealedProofs = []; assert.throws(() => sealed.validateSealedGroups([group]), /metadata contracts/);
  const selector = {...sealed.sealedGroups[0], cases: structuredClone(sealed.sealedGroups[0].cases)};
  selector.cases[0].sealedProofs[0].payloadId = 'invented'; assert.throws(() => sealed.validateSealedGroups([selector]), /selector/);
});

test('native taxonomy cannot adapt official expectations or reach toolchain I/O while pending', async () => {
  const groups = sealed.sealedGroups.map(group => ({...group, cases: structuredClone(group.cases)}));
  const pending = groups[2].cases.find(entry => entry.id === 'sm-duplicate-entry');
  pending.oracleStatus = 'pending-native-taxonomy'; pending.trace = null; delete pending.tracesByRelease;
  assert.throws(() => sealed.assertSealedOracleReadiness(groups), /source-fixed/);
  const altered = structuredClone(sealed.createSealedLedger());
  altered.results[2].cases.find(entry => entry.id === 'sm-duplicate-entry').oracleStatus = 'pending-native-taxonomy';
  const original = fs.readFileSync;
  fs.readFileSync = function(filename, ...args) {
    assert.ok(!String(filename).endsWith('java_compatibility_toolchains.lock.json'), 'Pending/corrupt oracle reached I/O');
    return original.call(this, filename, ...args);
  };
  try { await assert.rejects(sealed.runSealedSemantics(altered)); }
  finally { fs.readFileSync = original; }
});

test('frozen canonical inputs and per-release copies cannot mutate another record', () => {
  assert.throws(() => sealed.sealedGroups.pop(), TypeError);
  assert.throws(() => { sealed.sealedGroups[0].cases[0].sealedProofs = []; }, TypeError);
  assert.throws(() => sealed.sealedGroups[0].driverClassNames.pop(), TypeError);
  const ledger = sealed.createSealedLedger(), count = ledger.results[3].cases.length;
  ledger.results[0].cases.pop(); ledger.results[0].driverClassNames.pop();
  assert.equal(ledger.results[3].cases.length, count); assert.equal(sealed.sealedGroups[0].cases.length, count);
});

test('malformed ledger is rejected before any toolchain operation', async () => {
  const original = fs.readFileSync;
  fs.readFileSync = function(filename, ...args) {
    assert.ok(!String(filename).endsWith('java_compatibility_toolchains.lock.json'), 'Invalid inventory reached I/O');
    return original.call(this, filename, ...args);
  };
  try { for (const corrupt of corruptions) { const ledger = sealed.createSealedLedger(); corrupt(ledger); await assert.rejects(sealed.runSealedSemantics(ledger)); } }
  finally { fs.readFileSync = original; }
});

function terminalBookkeeping(mode) {
  // Synthetic bookkeeping tests ledger integrity only. These are never genuine
  // compiler claims, native executions, or output from runSealedSemantics.
  const ledger = sealed.createSealedLedger(mode);
  for (const record of ledger.results) {
    const group = sealed.sealedGroups.find(candidate => candidate.id === record.group), units = group.compilationUnits?.() || [];
    record.status = 'passed'; record.operations = ['genuine-driver', ...units.map(unit => 'genuine-carriers:' + unit.id)]
      .map(kind => ({kind, result: {...success(), stdout: ''}}));
    record.classFiles = group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort().map(filename => ({path: filename}));
    record.compilations = units.map(unit => ({id: unit.id, genuineCompilerBytes: true, runtimeClasspathEntry: false, namedModuleRuntimeConformanceProven: false}));
    record.payloads = structuredClone(group.cases.flatMap(entry => entry.payloads || []));
    record.sealedProofs = group.cases.map(entry => ({id: entry.id, sealedProofs: structuredClone(entry.sealedProofs),
      bytecode: {probes: structuredClone(entry.probes)}, dynamicBranchCoverageProven: false, jitExecutionProven: false,
      fullSourceUnitConformanceProven: false, namedModuleRuntimeConformanceProven: false}));
    for (const cell of record.executions) if (cell.host === 'native' || mode === 'browser' || mode === 'diagnostic' && cell.host === 'node') {
      cell.status = 'passed'; cell.result = success({...group, cases: record.cases});
      cell.outcomes = assertCoreResult(cell.result, {...group, cases: record.cases});
    }
  }
  return ledger;
}

test('terminal checks retain diagnostic exclusions but require actual selected host/compiler/proof inventories', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = terminalBookkeeping(mode);
    sealed.assertSealedLedgerInventory(ledger, {phase: 'terminal'});
    ledger.results[0].executions[0].status = 'not-run';
    assert.throws(() => sealed.assertSealedLedgerInventory(ledger, {phase: 'terminal'}), /mandatory/);
  }
  for (const corrupt of [ledger => { delete ledger.results[0].executions[0].result; },
    ledger => { ledger.results[0].executions[0].result.stderr = 'warning'; },
    ledger => { ledger.results[0].executions[0].outcomes.pop(); },
    ledger => { ledger.results[0].operations.pop(); }, ledger => { ledger.results[0].operations[0].result.exitCode = 1; },
    ledger => { ledger.results[0].classFiles.pop(); }, ledger => { ledger.results[1].compilations.pop(); },
    ledger => { ledger.results[1].payloads.pop(); }, ledger => { ledger.results[0].sealedProofs.pop(); },
    ledger => { ledger.results[0].sealedProofs[0].sealedProofs = []; },
    ledger => { ledger.results[0].sealedProofs[0].bytecode.probes = []; },
    ledger => { ledger.results[0].sealedProofs[0].jitExecutionProven = true; }]) {
    const ledger = terminalBookkeeping('browser'); corrupt(ledger); assert.throws(() => sealed.assertSealedLedgerInventory(ledger, {phase: 'terminal'}));
  }
});

test('exact traces reject timeout/stderr/wrong exception, missing/reordered events and markers', () => {
  const good = success(); assert.equal(assertCoreResult(good, rawGroup).length, 2);
  for (const changed of [{...good, exitCode: 1}, {...good, stderr: 'warning'}, {...good, timedOut: true},
    {...good, outputLimitExceeded: true}, {...good, stdout: good.stdout.replace('java.lang.ClassFormatError', 'java.lang.LinkageError')},
    {...good, stdout: good.stdout.split('\n').slice(1).join('\n')},
    {...good, stdout: good.stdout.split('\n').reverse().join('\n')},
    {...good, stdout: good.stdout.replace('SEALED_CONTRACT_OK', 'OTHER_OK')}]) assert.throws(() => assertCoreResult(changed, rawGroup));
});

test('raw unsuccessful compiler evidence survives a post-run source integrity rejection', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-sealed-compiler-contract-'));
  try {
    const filename = path.join(directory, 'Carrier.java'), source = 'class Carrier {}\n'; fs.writeFileSync(filename, source);
    const baseline = [{path: filename, sha256: sha(source)}], operation = {}, checkpoints = [];
    const result = {status: 'failed', exitCode: 1, stdout: '', stderr: 'javac failed'};
    await assert.rejects(checkCoreCompilation(operation, async () => { fs.writeFileSync(filename, source + '// changed\n'); return result; },
      () => assertCoreCompilerSources(baseline), () => checkpoints.push(structuredClone(operation))), CoreIntegrityError);
    assert.deepEqual(operation.result, result); assert.deepEqual(checkpoints[0].result, result);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('raw host timeout/failure is checkpointed before post-run integrity rejection', async () => {
  const cell = {host: 'node', status: 'not-run'}, checkpoints = [], raw = {...success(), status: 'timeout', timedOut: true, exitCode: null, stderr: 'partial failure'};
  await assert.rejects(checkCoreExecution(cell, rawGroup, async () => raw,
    () => { throw new CoreIntegrityError('changed sealed resource'); }, () => checkpoints.push(structuredClone(cell))), CoreIntegrityError);
  assert.deepEqual(cell.result, raw); assert.equal(cell.status, 'failed'); assert.ok(!cell.outcomes);
  assert.ok(checkpoints.some(value => value.result?.stderr === 'partial failure' && value.status === 'running'));
});

test('private durable ledgers refuse diagnostics overwriting official evidence and symlinks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-sealed-ledger-contract-'));
  try {
    const filename = path.join(directory, 'results.json'); sealed.writeSealedLedger(filename, sealed.createSealedLedger());
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    assert.equal(JSON.parse(fs.readFileSync(filename)).results.flatMap(record => record.executions).length, 18);
    assert.throws(() => sealed.writeSealedLedger(filename, sealed.createSealedLedger('native-only')), /Diagnostics/);
    const linked = path.join(directory, 'linked.json'); fs.symlinkSync(filename, linked);
    assert.throws(() => sealed.writeSealedLedger(linked, sealed.createSealedLedger()), /Regular unlinked/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('resource-only inventory rejects fallback, reordered/wrong variants, missing/changed files and links', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-sealed-resource-contract-'));
  // Arbitrary bytes test bookkeeping only, never genuine compiler or VM evidence.
  const emit = (relative, bytes) => {
    const filename = path.join(directory, relative); fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, bytes);
    return {path: relative, sha256: sha(bytes), size: bytes.length};
  };
  try {
    const group = sealed.sealedGroups[1], drivers = group.driverClassNames.map(name => emit(name.replaceAll('.', '/') + '.class', Buffer.from(name)));
    const payloads = group.cases.flatMap(entry => entry.payloads).map(binding => ({...binding,
      ...emit(binding.resourcePath, Buffer.from(binding.id))}));
    const check = () => sealed.assertSealedResourceClasspath(group, directory, drivers, payloads); check();
    assert.throws(() => sealed.assertSealedResourceClasspath(group, directory, drivers.slice(1), payloads), /driver inventory/);
    assert.throws(() => sealed.assertSealedResourceClasspath(group, directory, drivers, payloads.slice(1)), /payload variant/);
    assert.throws(() => sealed.assertSealedResourceClasspath(group, directory, drivers, [...payloads].reverse()), /payload variant/);
    const wrong = structuredClone(payloads); wrong[0].compilationUnitId = 'other';
    assert.throws(() => sealed.assertSealedResourceClasspath(group, directory, drivers, wrong), /payload variant/);
    const fallback = emit('sealedloader/p/Base.class', Buffer.from('fallback'));
    assert.throws(check, /resource-only/); fs.unlinkSync(path.join(directory, fallback.path));
    const filename = path.join(directory, payloads[0].resourcePath), original = fs.readFileSync(filename);
    fs.writeFileSync(filename, Buffer.alloc(original.length)); assert.throws(check, /resource-only/);
    fs.unlinkSync(filename); assert.throws(check, /resource-only/); fs.writeFileSync(filename, original); check();
    const linked = path.join(directory, 'linked.bin'); fs.symlinkSync(filename, linked); assert.throws(check, /No linked/); fs.unlinkSync(linked);
    const hardlinked = path.join(directory, 'hardlinked.bin'); fs.linkSync(filename, hardlinked); assert.throws(check, /unlinked/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
function metadataFixture(name = 'sealedmetadata.Base', major = 65, driver = false, markerArgument) {
  // Synthetic bytes exclusively exercise the independent adapter. Never execute
  // or advertise them as javac output, class-file acceptance or a host ledger.
  const constants = [], add = bytes => { constants.push(bytes); return constants.length; };
  const utf = value => { const bytes = Buffer.from(value); return add(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes])); };
  const cls = value => add(Buffer.concat([Buffer.from([7]), u2(utf(value.replaceAll('.', '/')))]));
  const owner = cls(name), parent = cls(name === 'sealedmetadata.Child' ? 'sealedmetadata.Base' : 'java.lang.Object');
  const child = cls('sealedmetadata.Child'), good = cls('sealedmetadata.Good'), array = cls('[Lsealedmetadata.Child;');
  const codeName = utf('Code'), permittedName = utf('PermittedSubclasses'), sourceName = utf('SourceFile'), sourceFile = utf('Synthetic.java');
  const ref = (classIndex, member, descriptor) => add(Buffer.concat([Buffer.from([10]), u2(classIndex),
    u2(add(Buffer.concat([Buffer.from([12]), u2(utf(member)), u2(utf(descriptor))])))]));
  const init = ref(parent, '<init>', '()V');
  const marker = ref(cls('classes.modern_test.JavaSealedMetadata'), 'noteInitialization', markerArgument === undefined ? '()V' : '(I)V');
  const sealedCall = ref(cls('java.lang.Class'), 'isSealed', '()Z');
  const entryCall = ref(owner, 'caseEntry', '()V');
  const attribute = (index, body) => Buffer.concat([u2(index), u4(body.length), body]);
  const method = (member, descriptor, flags, instructions, stack = 1, locals = 1) => {
    const body = Buffer.concat([u2(stack), u2(locals), u4(instructions.length), instructions, u2(0), u2(0)]);
    return Buffer.concat([u2(flags), u2(utf(member)), u2(utf(descriptor)), u2(1), attribute(codeName, body)]);
  };
  const methods = driver ? [
    method('main', '([Ljava/lang/String;)V', 9, Buffer.concat([Buffer.from([0xb8]), u2(entryCall), Buffer.from([0xb1])])),
    method('caseEntry', '()V', 9, Buffer.concat([Buffer.from([0x13]), u2(child), Buffer.from([0xb6]), u2(sealedCall), Buffer.from([0x57, 0xb1])]))
  ] : [
    method('<init>', '()V', 1, Buffer.concat([Buffer.from([0x2a, 0xb7]), u2(init), Buffer.from([0xb1])])),
    method('value', '()I', 1, Buffer.from([0x04, 0xac])),
    method('arrayType', '()Ljava/lang/Class;', 9, Buffer.concat([Buffer.from([0x13]), u2(array), Buffer.from([0xb0])])),
    method('<clinit>', '()V', 8, Buffer.concat([markerArgument === undefined ? Buffer.alloc(0) : Buffer.from([3 + markerArgument]),
      Buffer.from([0xb8]), u2(marker), Buffer.from([0xb1])]))
  ];
  const attrs = [attribute(sourceName, u2(sourceFile))];
  if (name === 'sealedmetadata.Base') attrs.push(attribute(permittedName, Buffer.concat([u2(2), u2(child), u2(good)])));
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe]), u2(0), u2(major), u2(constants.length + 1), ...constants,
    u2(0x21), u2(owner), u2(parent), u2(0), u2(0), u2(methods.length), ...methods, u2(attrs.length), ...attrs]);
}
function replacePermits(original, body, duplicate = false) {
  const metadata = readSealedClass(original), attribute = metadata.permittedAttributes[0];
  const changed = Buffer.concat([u2(attribute.nameIndex), u4(body.length), body]);
  if (!duplicate) return Buffer.concat([original.subarray(0, attribute.start), changed, original.subarray(attribute.end)]);
  const prefix = Buffer.from(original); prefix.writeUInt16BE(metadata.attributes.length + 1, metadata.layout.attributes.countOffset);
  return Buffer.concat([prefix, changed]);
}

test('independent reader retains actual parent/permits ClassCP identities and empty-attribute presence', () => {
  const original = metadataFixture(), metadata = readSealedClass(original), attribute = metadata.permittedAttributes[0];
  assert.equal(metadata.name, 'sealedmetadata.Base'); assert.equal(metadata.superReference.tag, 7);
  assert.equal(metadata.superReference.internalName, 'java/lang/Object');
  assert.equal(attribute.numberOfClasses, 2); assert.equal(attribute.nestedLengthMatches, true);
  assert.deepEqual(attribute.entries.map(entry => [entry.tag, entry.internalName, entry.indexStatus]),
    [[7, 'sealedmetadata/Child', 'class'], [7, 'sealedmetadata/Good', 'class']]);
  const empty = readSealedClass(replacePermits(original, u2(0)));
  assert.equal(empty.permitsPresent, true); assert.equal(empty.permittedAttributes[0].numberOfClasses, 0);
  assert.deepEqual(empty.permittedAttributes[0].entries, []);
  assert.ok(metadata.methods.find(method => method.name === 'value').code.instructions.some(instruction => instruction.name === 'ireturn'));
});

test('bounded inner malformed attrs, duplicates, arrays and opaque majors remain inspectable evidence', () => {
  const original = metadataFixture(), layout = readSealedClass(original), child = layout.permittedAttributes[0].entries[0].index;
  for (const body of [Buffer.from([0]), u2(1), Buffer.concat([u2(0), Buffer.from([0])])])
    assert.equal(readSealedClass(replacePermits(original, body)).permittedAttributes[0].nestedLengthMatches, false);
  const duplicate = readSealedClass(replacePermits(original, Buffer.concat([u2(1), u2(child)]), true));
  assert.equal(duplicate.permittedAttributes.length, 2);
  for (const [index, status] of [[0, 'zero'], [layout.layout.pool.length + 3, 'out-of-range'], [layout.layout.pool[child].first, 'wrong-tag']]) {
    const metadata = readSealedClass(replacePermits(original, Buffer.concat([u2(1), u2(index)])));
    assert.equal(metadata.permittedAttributes[0].entries[0].indexStatus, status);
  }
  const array = layout.layout.pool.find(entry => entry?.tag === 7 && layout.layout.pool[entry.first].value === '[Lsealedmetadata/Child;').index;
  const arrays = readSealedClass(replacePermits(original, Buffer.concat([u2(1), u2(array)])));
  assert.equal(arrays.permittedAttributes[0].entries[0].isArray, true);
  assert.equal(arrays.permittedAttributes[0].entries[0].internalName, '[Lsealedmetadata/Child;');
  const old = Buffer.from(original); old.writeUInt16BE(60, 6);
  assert.equal(readSealedClass(old).permitsPresent, true);
  assert.throws(() => readSealedClass(original.subarray(0, -1)), /Truncated/);
  assert.throws(() => readSealedClass(Buffer.concat([original, Buffer.from([0])])), /trailing/);
});

test('every explicit mutation replays original offsets and preserves all unrelated CP/member/Code bytes', () => {
  let mutations = 0;
  for (const major of [65, 69]) for (const entry of metadata.cases) for (const binding of entry.payloads || []) if (binding.mutation) {
    const original = metadataFixture(binding.binaryName, major), pristine = Buffer.from(original);
    const mutation = metadata.mutatePayload(original, entry, binding), proof = assertSealedMutationProvenance(original, mutation, entry, binding);
    assert.deepEqual(original, pristine); assert.equal(proof.originalCpBytesPreserved, true);
    assert.equal(proof.unrelatedHeaderAndMembersPreserved, true); assert.equal(proof.unrelatedCodePreserved, true);
    assert.equal(proof.fullClassFileConformanceProven, false); mutations++;
  }
  assert.ok(mutations >= 26, 'Both editions execute every explicit bounded mutation recipe');
});

test('mutation provenance rejects fabricated replay and unrelated CP/member/version modifications', () => {
  const entry = metadata.cases.find(candidate => candidate.id === 'sm-empty-owner'), binding = entry.payloads.find(candidate => candidate.mutation);
  const original = metadataFixture(), mutation = metadata.mutatePayload(original, entry, binding);
  const wrongReplay = {...mutation, edits: structuredClone(mutation.edits)}; wrongReplay.edits[0].beforeHex = 'ff';
  assert.throws(() => assertSealedMutationProvenance(original, wrongReplay, entry, binding));
  for (const offset of [6, 12, readSealedClass(original).methods.find(method => method.name === 'value').code.layout.instructionsOffset]) {
    const changed = Buffer.from(mutation.bytes); changed[offset] ^= 1;
    const forged = {...mutation, bytes: changed, mutatedSha256: sha(changed), edits: [...mutation.edits,
      {offset, removeBytes: 1, beforeHex: original.subarray(offset, offset + 1).toString('hex'),
        insertHex: changed.subarray(offset, offset + 1).toString('hex'), reason: 'Undeclared unrelated modification'}]};
    assert.throws(() => assertSealedMutationProvenance(original, forged, entry, binding));
  }
});

test('independent group proof binds actual decoded Class calls and payload metadata, not names alone', () => {
  const driverName = 'classes.modern_test.JavaSealedSynthetic', driver = readSealedClass(metadataFixture(driverName, 65, true));
  const payload = readSealedClass(metadataFixture());
  const methods = new Map(driver.methods.map(method => [method.name + method.descriptor, {name: method.name, descriptor: method.descriptor,
    flags: method.flags, codeSha256: method.code.sha256, codeLength: method.code.codeLength, maxStack: method.code.maxStack,
    maxLocals: method.code.maxLocals, instructions: method.code.instructions, handlers: []}]));
  const code = new Map([[driverName, {file: {path: driverName.replaceAll('.', '/') + '.class', sha256: driver.sha256}, methods}]]);
  const classes = new Map([[driverName, driver], ['synthetic:primary:base', payload]]);
  const group = {mainClass: driverName, driverClassNames: [driverName], cases: [{id: 'synthetic', entryMethod: 'caseEntry', entryDescriptor: '()V',
    probes: [{method: 'caseEntry', descriptor: '()V', requiredOpcodes: ['invokevirtual'], symbolicOperands: [{opcode: 'invokevirtual', tag: 10,
      owner: 'java.lang.Class', name: 'isSealed', descriptor: '()Z'}]}], payloads: [{id: 'synthetic:primary:base'}],
    sealedProofs: [{kind: 'class', payloadId: 'synthetic:primary:base', flags: {required: 1, forbidden: 0x10},
      superName: 'java.lang.Object', interfaceNames: [], permits: ['sealedmetadata.Child', 'sealedmetadata.Good']}]}]};
  const proof = proveSealedGroup(group, classes, code)[0];
  assert.equal(proof.sealedProofs[0].evidence.superReference.tag, 7);
  assert.equal(proof.sealedProofs[0].evidence.permittedAttributes[0].entries[0].tag, 7);
  assert.equal(proof.dynamicBranchCoverageProven, false); assert.equal(proof.jitExecutionProven, false);
  for (const change of [changed => { changed.cases[0].sealedProofs[0].payloadId = 'missing'; },
    changed => { changed.cases[0].sealedProofs[0].superName = 'wrong.Parent'; },
    changed => { changed.cases[0].sealedProofs[0].permits.reverse(); },
    changed => { changed.cases[0].probes[0].symbolicOperands[0].name = 'isRecord'; },
    changed => { changed.cases[0].sealedProofs = []; }]) {
    const changed = structuredClone(group); change(changed); assert.throws(() => proveSealedGroup(changed, classes, code));
  }
});

test('passive initializer marker proof binds the decoded numeric argument as well as its CP call', () => {
  const driverName = 'classes.modern_test.JavaSealedSynthetic', driver = readSealedClass(metadataFixture(driverName, 65, true));
  const payload = readSealedClass(metadataFixture('sealedmetadata.Base', 65, false, 1));
  const methods = new Map(driver.methods.map(method => [method.name + method.descriptor, {name: method.name, descriptor: method.descriptor,
    flags: method.flags, codeSha256: method.code.sha256, codeLength: method.code.codeLength, maxStack: method.code.maxStack,
    maxLocals: method.code.maxLocals, instructions: method.code.instructions, handlers: []}]));
  const code = new Map([[driverName, {file: {path: driverName.replaceAll('.', '/') + '.class', sha256: driver.sha256}, methods}]]);
  const classes = new Map([[driverName, driver], ['synthetic:primary:base', payload]]);
  const group = {mainClass: driverName, driverClassNames: [driverName], cases: [{id: 'synthetic', entryMethod: 'caseEntry', entryDescriptor: '()V',
    probes: [{method: 'caseEntry', descriptor: '()V', requiredOpcodes: ['invokevirtual']}],
    payloads: [{id: 'synthetic:primary:base'}], sealedProofs: [{kind: 'class', payloadId: 'synthetic:primary:base',
      flags: {required: 1, forbidden: 0x10}, superName: 'java.lang.Object', interfaceNames: [], permits: ['sealedmetadata.Child', 'sealedmetadata.Good'],
      passiveInitializer: {owner: 'classes.modern_test.JavaSealedMetadata', name: 'noteInitialization', descriptor: '(I)V', argumentValue: 1}}]}]};
  proveSealedGroup(group, classes, code);
  const changed = structuredClone(group); changed.cases[0].sealedProofs[0].passiveInitializer.argumentValue = 2;
  assert.throws(() => proveSealedGroup(changed, classes, code), /marker argument/);
  const swapped = new Map(classes); swapped.set('synthetic:primary:base', readSealedClass(metadataFixture('sealedmetadata.Base', 65, false, 2)));
  assert.throws(() => proveSealedGroup(group, swapped, code), /marker argument/);
});
