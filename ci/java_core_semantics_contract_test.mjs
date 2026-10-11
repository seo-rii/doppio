import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {coreGroups, coreRequiredHosts, coreTimeouts, coreSourceUnits, validateCoreGroups,
  createCoreLedger, assertCoreResult, writeCoreLedger, checkCoreExecution, CoreIntegrityError}
  from './java_core_semantics_test.mjs';
import * as core from './java_core_semantics_test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'ci/plan_spec_source_index.json')));
const success = group => ({status: 'passed', exitCode: 0, signal: null, error: null, timedOut: false,
  outputLimitExceeded: false, stderr: '', stdout: group.cases.flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`))
    .concat([group.completionMarker, '']).join('\n')});

test('B5 genuine corpus has exactly four mandatory groups and 130 independently fixed scenarios', () => {
  assert.deepEqual(coreGroups.map(group => [group.id, group.cases.length]),
    [['numeric', 48], ['arrays-objects', 38], ['control', 26], ['exceptions', 18]]);
  assert.equal(validateCoreGroups(), 130);
  const numeric = coreGroups[0];
  assert.deepEqual(numeric.cases.find(entry => entry.id === 'l2f').trace, ['df000000,5f000000,5e800001,de800001']);
  assert.equal(coreGroups[1].cases.flatMap(entry => entry.trace).length, 180);
  const generated = coreGroups[2].generatedSources();
  assert.ok(generated.length > 0 && generated.every(source => typeof source.text === 'string' && source.text.length > 0));
  assert.deepEqual(generated, coreGroups[2].generatedSources());
  for (const group of coreGroups) {
    const source = fs.readFileSync(path.join(root, group.source), 'utf8');
    assert.match(source, /package classes\.modern_test;/);
    for (const entry of group.cases) assert.ok(source.includes(entry.entryMethod + '('), 'Real dedicated Java entry');
  }
});

test('source-unit references bind both actual edition indices without promoting unit assessment', () => {
  for (const group of coreGroups) for (const entry of coreSourceUnits(group, index)) {
    assert.ok(entry.sourceUnits.length > 0);
    assert.ok(entry.sourceUnits.some(unit => unit.id.startsWith('JVMS-21:')));
    assert.ok(entry.sourceUnits.some(unit => unit.id.startsWith('JVMS-25:')));
    for (const unit of entry.sourceUnits) {
      assert.equal(unit.fullUnitConformanceProven, false);
      assert.equal(unit.assessmentStatus, index.units.find(actual => actual.id === unit.id).assessmentStatus);
    }
  }
  const changed = structuredClone(coreGroups[0]); changed.cases[0].anchors.JVMS = ['6.5.not-an-opcode'];
  assert.throws(() => coreSourceUnits(changed, index), /Indexed normative anchor/);
});

test('all native and guest execution cells are registered as not-run before the first compile', () => {
  const ledger = createCoreLedger();
  assert.equal(ledger.results.length, 8); assert.equal(ledger.caseCount, 130);
  assert.deepEqual(coreRequiredHosts, ['native', 'node', 'chromium']);
  for (const record of ledger.results) {
    assert.equal(record.status, 'not-run'); assert.deepEqual(record.executions.map(cell => cell.host), coreRequiredHosts);
    assert.ok(record.executions.every(cell => cell.status === 'not-run' && cell.reason));
  }
  assert.equal(ledger.officialGate, true); assert.equal(ledger.phaseBComplete, false);
  assert.equal(ledger.jvm002Complete, false); assert.equal(ledger.fullSourceUnitConformanceProven, false);
  assert.equal(createCoreLedger('native-only').officialGate, false);
  assert.equal(createCoreLedger('diagnostic').officialGate, false);
  assert.deepEqual(coreTimeouts, {compileMs: 60000, nativeMs: 30000, guestMs: 60000});
});

test('group validation rejects empty or duplicate groups and empty opcode contracts', () => {
  assert.throws(() => validateCoreGroups([]), /nonempty/);
  const duplicate = structuredClone(coreGroups[0]);
  duplicate.cases = duplicate.cases.map(entry => ({...entry, id: 'duplicate-' + entry.id}));
  assert.throws(() => validateCoreGroups([coreGroups[0], duplicate]), /Unique mandatory group/);
  for (const requiredOpcodes of [undefined, null, [], {}, 'iadd', ['not-an-opcode'], [null], ['iadd', 1], Array(1)]) {
    const group = structuredClone(coreGroups[0]);
    group.cases[0].probes[0].requiredOpcodes = requiredOpcodes;
    assert.throws(() => validateCoreGroups([group]), /required opcode/);
  }
  const missing = structuredClone(coreGroups[0]); delete missing.cases[0].probes[0].requiredOpcodes;
  assert.throws(() => validateCoreGroups([missing]), /required opcode/);
  for (const probes of [undefined, null, {}, [], 'iadd']) {
    const group = structuredClone(coreGroups[0]); group.cases[0].probes = probes;
    assert.throws(() => validateCoreGroups([group]), /executable opcode probes/);
  }
});

test('ledger constructor rejects unknown modes and incomplete mandatory group profiles', () => {
  assert.throws(() => createCoreLedger('unknown'), /mode/);
  assert.throws(() => createCoreLedger('browser', []), /nonempty/);
  assert.throws(() => createCoreLedger('browser', coreGroups.slice(1)), /mandatory group/);
  assert.throws(() => createCoreLedger('browser', [...coreGroups].reverse()), /mandatory group/);
  const changed = coreGroups.map(group => ({...group, cases: structuredClone(group.cases)}));
  changed[0].cases.pop();
  assert.throws(() => createCoreLedger('browser', changed), /mandatory.*case/);
});

const invalidInventories = [
  ledger => { ledger.results = []; },
  ledger => { ledger.results.pop(); },
  ledger => { ledger.results[1] = structuredClone(ledger.results[0]); },
  ledger => { ledger.results.reverse(); },
  ledger => { ledger.results[0].group = 'unknown'; },
  ledger => { ledger.results[0].release = 22; },
  ledger => { ledger.requiredReleases = [21]; },
  ledger => { ledger.requiredReleases = [21, 21]; },
  ledger => { ledger.requiredHosts = ['native']; },
  ledger => { ledger.requiredHosts = ['native', 'node', 'node']; },
  ledger => { ledger.results[0].executions = []; },
  ledger => { ledger.results[0].executions.pop(); },
  ledger => { ledger.results[0].executions[2] = structuredClone(ledger.results[0].executions[1]); },
  ledger => { ledger.results[0].executions.reverse(); },
  ledger => { ledger.results[0].cases = []; },
  ledger => { ledger.results[0].cases.pop(); },
  ledger => { ledger.results[0].cases[1] = structuredClone(ledger.results[0].cases[0]); },
  ledger => { ledger.results[0].cases.reverse(); },
  ledger => { ledger.results[0].cases[0].trace = ['changed expectation']; },
  ledger => { ledger.results[0].cases[0].probes[0].requiredOpcodes = []; },
  ledger => { ledger.caseCount--; },
  ledger => { ledger.officialGate = false; },
  ledger => { ledger.requestedMode = 'native-only'; },
  ledger => { ledger.requestedMode = 'unknown'; }
];

test('ledger inventory rejects pruned, duplicate and changed mandatory contracts at entry and terminal', () => {
  for (const mutate of invalidInventories) for (const phase of ['initial', 'terminal']) {
    const ledger = createCoreLedger(); mutate(ledger);
    assert.throws(() => core.assertCoreLedgerInventory(ledger, {phase}), /mandatory|mode|official/);
  }
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = createCoreLedger(mode);
    assert.doesNotThrow(() => core.assertCoreLedgerInventory(ledger, {phase: 'initial'}));
    for (const record of ledger.results) {
      record.status = 'passed';
      for (const cell of record.executions) {
        if (mode === 'browser' || cell.host === 'native' || mode === 'diagnostic' && cell.host === 'node') cell.status = 'passed';
      }
    }
    assert.doesNotThrow(() => core.assertCoreLedgerInventory(ledger, {phase: 'terminal'}));
    ledger.results[0].executions[0].status = 'not-run';
    assert.throws(() => core.assertCoreLedgerInventory(ledger, {phase: 'terminal'}), /mandatory/);
  }
});

test('ledger case and host arrays cannot mutate canonical contracts or another release', () => {
  assert.throws(() => coreGroups.pop(), TypeError);
  assert.throws(() => coreGroups[0].cases.pop(), TypeError);
  assert.throws(() => { coreGroups[0].cases[0].trace[0] = 'changed'; }, TypeError);
  assert.throws(() => { coreGroups[0].cases[0].probes[0].requiredOpcodes = []; }, TypeError);
  const ledger = createCoreLedger(), count = coreGroups[0].cases.length;
  ledger.results[0].cases.pop();
  ledger.results[0].cases[0].trace[0] = 'changed';
  ledger.requiredHosts.pop();
  assert.equal(coreGroups[0].cases.length, count);
  assert.notEqual(coreGroups[0].cases[0].trace[0], 'changed');
  assert.equal(ledger.results[coreGroups.length].cases.length, count);
  assert.notEqual(ledger.results[coreGroups.length].cases[0].trace[0], 'changed');
  assert.deepEqual(coreRequiredHosts, ['native', 'node', 'chromium']);
});

test('run entry rejects malformed inventories before any toolchain or subprocess operation', async () => {
  const original = fs.readFileSync;
  fs.readFileSync = function(filename, ...args) {
    assert.ok(!String(filename).endsWith('java_compatibility_toolchains.lock.json'), 'Invalid inventory reached toolchain I/O');
    return original.call(this, filename, ...args);
  };
  try {
    for (const mutate of invalidInventories) {
      const ledger = createCoreLedger(); mutate(ledger);
      await assert.rejects(core.runCoreSemantics(ledger), /mandatory|mode|official/);
    }
  } finally { fs.readFileSync = original; }
});

test('compiler integrity uses pre-javac hashes and preserves raw results even when compilation failed', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-core-source-integrity-'));
  try {
    const filename = path.join(directory, 'Generated.java');
    const original = 'class Generated {}\n';
    const sha256 = crypto.createHash('sha256').update(original).digest('hex');
    for (const status of ['passed', 'failed']) {
      fs.writeFileSync(filename, original);
      const sources = [{path: filename, sha256}], operation = {}, checkpoints = [];
      const raw = {status, exitCode: status === 'passed' ? 0 : 1, stdout: '', stderr: status === 'passed' ? '' : 'javac failed\n'};
      await assert.rejects(core.checkCoreCompilation(operation, async () => {
        fs.writeFileSync(filename, original + '// changed during compilation\n'); return raw;
      }, () => core.assertCoreCompilerSources(sources), () => checkpoints.push(structuredClone(operation))), CoreIntegrityError);
      assert.deepEqual(operation.result, raw);
      assert.deepEqual(checkpoints[0].result, raw, 'Raw compiler output precedes the integrity rejection');
      assert.equal(sources[0].sha256, sha256, 'Original baseline is not refreshed after javac');
    }
    fs.writeFileSync(filename, original);
    assert.doesNotThrow(() => core.assertCoreCompilerSources([{path: filename, sha256}]));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('ordinary failed compilation still checks integrity before reporting its retained compiler error', async () => {
  const operation = {}, order = [];
  const raw = {status: 'failed', exitCode: 1, stdout: '', stderr: 'independent javac failure'};
  await assert.rejects(core.checkCoreCompilation(operation, async () => { order.push('execute'); return raw; },
    () => { order.push('integrity'); }, () => { order.push('checkpoint'); }), /independent javac failure/);
  assert.deepEqual(order, ['execute', 'checkpoint', 'integrity']);
  assert.deepEqual(operation.result, raw);
  const accepted = {};
  await core.checkCoreCompilation(accepted, async () => ({status: 'passed', exitCode: 0, stdout: '', stderr: ''}),
    () => { order.push('verified'); });
  assert.equal(accepted.result.status, 'passed');
});

test('oracle rejects missing, reordered, duplicate or extra events and exact failure substitutions', () => {
  for (const group of coreGroups) {
    const result = success(group); assert.equal(assertCoreResult(result, group).length, group.cases.length);
    const lines = result.stdout.split('\n');
    for (const stdout of [lines.slice(1).join('\n'), [lines[1], lines[0], ...lines.slice(2)].join('\n'),
      [lines[0], ...lines].join('\n'), result.stdout + 'EXTRA\n', result.stdout.replace(group.completionMarker, 'OTHER_OK')])
      assert.throws(() => assertCoreResult({...result, stdout}, group));
    for (const change of [{status: 'failed'}, {exitCode: 1}, {signal: 'SIGKILL'}, {timedOut: true},
      {outputLimitExceeded: true}, {error: 'launch error'}, {stderr: 'warning\n'}])
      assert.throws(() => assertCoreResult({...result, ...change}, group));
    assert.doesNotThrow(() => assertCoreResult({...result, stdout: result.stdout.replaceAll('\n', '\r\n')}, group));
  }
});

test('raw results are checkpointed before a failing integrity check, including exact host failure', async () => {
  const group = coreGroups[0], cell = {host: 'node', status: 'not-run', reason: 'pending'}, records = [];
  const raw = {...success(group), timedOut: true, status: 'timeout'};
  await assert.rejects(checkCoreExecution(cell, group, async () => raw,
    () => { throw new CoreIntegrityError('changed bytes'); }, () => records.push(structuredClone(cell))), /changed bytes/);
  assert.equal(records[1].status, 'running'); assert.deepEqual(records[1].result, raw);
  assert.equal(cell.status, 'failed'); assert.deepEqual(cell.result, raw); assert.match(cell.error, /changed bytes/);
});

test('semantic and launch failures retain evidence without aborting independent cells', async () => {
  const group = coreGroups[0];
  for (const change of [{timedOut: true}, {outputLimitExceeded: true}, {exitCode: 1}, {stdout: ''}]) {
    const cell = {host: 'chromium', status: 'not-run'};
    assert.equal(await checkCoreExecution(cell, group, async () => ({...success(group), ...change}), () => {}), 'failed');
    assert.ok(cell.result); assert.ok(cell.error);
  }
  const missing = {host: 'native', status: 'not-run'};
  assert.equal(await checkCoreExecution(missing, group, async () => { throw new Error('ENOENT'); }, () => {}), 'failed');
  assert.match(missing.error, /ENOENT/);
  const next = {host: 'node', status: 'not-run'};
  assert.equal(await checkCoreExecution(next, group, async () => success(group), () => {}), 'passed');
});

test('atomic ledgers preserve failure/not-run cells and refuse diagnostics over official evidence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-core-ledger-unit-'));
  try {
    const filename = path.join(directory, 'results.json'), ledger = createCoreLedger();
    writeCoreLedger(filename, ledger); assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    ledger.status = 'failed'; ledger.results[0].executions[0].status = 'failed';
    ledger.results[0].executions[0].result = {status: 'timeout', timedOut: true, stdout: 'partial'};
    writeCoreLedger(filename, ledger);
    const saved = JSON.parse(fs.readFileSync(filename));
    assert.equal(saved.results[0].executions[0].result.stdout, 'partial');
    assert.equal(saved.results[7].executions[2].status, 'not-run');
    assert.throws(() => writeCoreLedger(filename, createCoreLedger('native-only')), /Diagnostics/);
    const link = path.join(directory, 'link.json'); fs.symlinkSync(filename, link);
    assert.throws(() => writeCoreLedger(link, ledger), /Regular unlinked/);
    assert.deepEqual(fs.readdirSync(directory).sort(), ['link.json', 'results.json']);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
