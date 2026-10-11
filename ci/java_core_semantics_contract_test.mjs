import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {coreGroups, coreRequiredHosts, coreTimeouts, coreSourceUnits, validateCoreGroups,
  createCoreLedger, assertCoreResult, writeCoreLedger, checkCoreExecution, CoreIntegrityError}
  from './java_core_semantics_test.mjs';

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
