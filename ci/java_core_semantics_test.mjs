import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import numeric from './java_core_numeric_cases.mjs';
import arraysObjects from './java_core_arrays_objects_cases.mjs';
import control from './java_core_control_cases.mjs';
import exceptions from './java_core_exceptions_cases.mjs';
import {coreOpcodeNames, inspectCoreClasses, proveCoreGroup} from './java_core_bytecode.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';

const harnessPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(harnessPath), '..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const freezeContract = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeContract(child);
    Object.freeze(value);
  }
  return value;
};
export const coreLedgerScope = 'JVM-002 B5 selected core numeric, array, object, frame, control-flow and exception contracts';
export const coreGroups = freezeContract([numeric, arraysObjects, control, exceptions]);
export const coreTimeouts = {compileMs: 60_000, nativeMs: 30_000, guestMs: 60_000};
export const coreRequiredHosts = Object.freeze(['native', 'node', 'chromium']);
const coreRequiredReleases = Object.freeze([21, 25]);
const coreModes = Object.freeze(['browser', 'native-only', 'diagnostic']);

export function coreSourceUnits(group, index) {
  const units = new Map(index.units.map(unit => [unit.id, unit]));
  return group.cases.map(entry => {
    const sourceUnits = [];
    assert.ok(entry.anchors && Object.keys(entry.anchors).length > 0, `${entry.id}: normative anchors`);
    for (const release of [21, 25]) for (const [spec, anchors] of Object.entries(entry.anchors)) {
      assert.ok(['JLS', 'JVMS'].includes(spec));
      for (const anchor of anchors) {
        const id = `${spec}-${release}:${spec.toLowerCase()}-${anchor}`, unit = units.get(id);
        assert.ok(unit, `Indexed normative anchor ${id}`);
        // Cross-package source clauses are dependencies, never reassigned to B5.
        sourceUnits.push({id, url: unit.url, ownerPackageId: unit.ownerPackageId,
          assessmentStatus: unit.assessmentStatus, fullUnitConformanceProven: false});
      }
    }
    assert.ok(sourceUnits.some(unit => unit.ownerPackageId === 'JVM-002'), `${entry.id}: selected B5-owned contract slice`);
    return {id: entry.id, sourceUnits};
  });
}

export function validateCoreGroups(groups = coreGroups) {
  assert.ok(Array.isArray(groups) && groups.length > 0, 'A nonempty mandatory group array is required');
  const allIds = new Set(), groupIds = new Set();
  for (const group of groups) {
    assert.match(group.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!groupIds.has(group.id), 'Unique mandatory group id'); groupIds.add(group.id);
    assert.match(group.source, /^classes\/modern_fixture\/[A-Za-z0-9]+\.java$/);
    assert.match(group.mainClass, /^classes\.modern_test\.[A-Za-z0-9]+$/);
    assert.match(group.completionMarker, /^CORE_[A-Z_]+_OK$/);
    assert.ok(Array.isArray(group.cases) && group.cases.length > 0, 'A nonempty mandatory case array is required');
    for (const entry of group.cases) {
      assert.match(entry.id, /^[a-z][a-z0-9-]*$/); assert.ok(!allIds.has(entry.id), 'Unique mandatory case id'); allIds.add(entry.id);
      assert.equal(entry.entryDescriptor, '()V'); assert.match(entry.entryMethod, /^case[A-Za-z0-9]+$/);
      assert.ok(Array.isArray(entry.trace) && entry.trace.length > 0 &&
        entry.trace.every(event => typeof event === 'string' && !/[\r\n]/.test(event)));
      assert.ok(Array.isArray(entry.probes) && entry.probes.length > 0, `${entry.id}: actual executable opcode probes`);
      for (const probe of entry.probes) {
        assert.ok(Array.isArray(probe?.requiredOpcodes) && probe.requiredOpcodes.length > 0,
          `${entry.id}: a nonempty required opcode array is required`);
        for (const opcode of probe.requiredOpcodes) assert.ok(typeof opcode === 'string' && coreOpcodeNames.includes(opcode),
          `${entry.id}: known required opcode mnemonic`);
      }
    }
    if (group.generatedSources) assert.deepEqual(group.generatedSources(), group.generatedSources(), 'Deterministic generated genuine sources');
  }
  return allIds.size;
}

export function assertCoreResult(result, group, label = group.id) {
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal,
    `${label}: incomplete execution`);
  assert.equal(result.status, 'passed', `${label}: ${result.stderr}`);
  assert.equal(result.exitCode, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', `${label}: unexpected stderr`);
  const expected = group.cases.flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`)).concat([group.completionMarker, '']);
  assert.deepEqual(result.stdout.replaceAll('\r\n', '\n').split('\n'), expected, `${label}: exact ordered independent trace`);
  return group.cases.map(entry => ({id: entry.id, trace: entry.trace}));
}

export function createCoreLedger(mode = 'browser', groups = coreGroups) {
  assert.ok(coreModes.includes(mode), 'Known core execution mode');
  const caseCount = validateCoreGroups(groups);
  assert.deepEqual(groups.map(group => group.id), coreGroups.map(group => group.id), 'Exact mandatory group inventory');
  for (const [index, group] of groups.entries()) {
    const expected = coreGroups[index];
    assert.deepEqual(group.cases, expected.cases, 'Exact mandatory group case contracts');
    for (const key of ['source', 'mainClass', 'completionMarker', 'generatedSources'])
      assert.equal(group[key], expected[key], 'Exact mandatory group compiler inputs');
  }
  const ledger = {schemaVersion: 1, scope: coreLedgerScope, status: 'running', requestedMode: mode,
    officialGate: mode === 'browser', phaseBComplete: false, jvm002Complete: false,
    fullSourceUnitConformanceProven: false, startedAt: new Date().toISOString(),
    requiredReleases: [...coreRequiredReleases], requiredHosts: [...coreRequiredHosts],
    caseCount, results: coreRequiredReleases.flatMap(release => groups.map(group => ({
      release, group: group.id, status: 'not-run', cases: structuredClone(group.cases), operations: [],
      executions: coreRequiredHosts.map(host => ({host, status: 'not-run', reason: 'awaiting compilation'}))
    })))};
  assertCoreLedgerInventory(ledger, {phase: 'initial'});
  return ledger;
}

/** Validate against the canonical corpus, never against a caller-pruned ledger. */
export function assertCoreLedgerInventory(ledger, {phase = 'inventory'} = {}) {
  assert.ok(['inventory', 'initial', 'terminal'].includes(phase), 'Known inventory validation phase');
  assert.equal(ledger.schemaVersion, 1, 'Exact mandatory ledger schema');
  assert.equal(ledger.scope, coreLedgerScope, 'Exact mandatory ledger scope');
  assert.ok(coreModes.includes(ledger.requestedMode), 'Known core execution mode');
  assert.equal(ledger.officialGate, ledger.requestedMode === 'browser', 'Execution mode and official gate must agree');
  assert.deepEqual(ledger.requiredReleases, coreRequiredReleases, 'Exact mandatory release inventory');
  assert.deepEqual(ledger.requiredHosts, coreRequiredHosts, 'Exact mandatory host inventory');
  assert.equal(ledger.caseCount, validateCoreGroups(), 'Exact mandatory case count');
  const expected = coreRequiredReleases.flatMap(release => coreGroups.map(group => ({release, group})));
  assert.ok(Array.isArray(ledger.results), 'Exact mandatory group/release inventory');
  assert.deepEqual(ledger.results.map(record => [record.release, record.group]),
    expected.map(record => [record.release, record.group.id]), 'Exact mandatory group/release inventory');
  const selectedHosts = ledger.requestedMode === 'native-only' ? ['native'] :
    ledger.requestedMode === 'diagnostic' ? ['native', 'node'] : coreRequiredHosts;
  if (phase === 'initial') assert.equal(ledger.status, 'running', 'Fresh mandatory execution ledger');
  for (const [index, record] of ledger.results.entries()) {
    assert.deepEqual(record.cases, expected[index].group.cases, 'Exact mandatory case contracts');
    assert.ok(Array.isArray(record.operations), 'Mandatory compiler operation records');
    assert.ok(Array.isArray(record.executions), 'Exact mandatory host execution inventory');
    assert.deepEqual(record.executions.map(cell => cell.host), coreRequiredHosts, 'Exact mandatory host execution inventory');
    assert.ok(['not-run', 'running', 'passed', 'failed'].includes(record.status), 'Known mandatory group status');
    if (phase === 'initial') {
      assert.equal(record.status, 'not-run', 'Fresh mandatory group execution');
      assert.equal(record.operations.length, 0, 'Do not overwrite prior mandatory compiler attempts');
    }
    if (phase === 'terminal') assert.ok(['passed', 'failed'].includes(record.status), 'Terminal mandatory group status');
    for (const cell of record.executions) {
      assert.ok(['not-run', 'running', 'passed', 'failed'].includes(cell.status), 'Known mandatory host status');
      if (phase === 'initial') {
        assert.equal(cell.status, 'not-run', 'Fresh mandatory host execution');
        assert.ok(!Object.hasOwn(cell, 'result') && !Object.hasOwn(cell, 'outcomes'), 'Do not overwrite prior mandatory host evidence');
      }
      if (phase === 'terminal') {
        assert.notEqual(cell.status, 'running', 'Terminal mandatory host status');
        if (!selectedHosts.includes(cell.host)) assert.equal(cell.status, 'not-run', 'Excluded diagnostic host remains mandatory and not-run');
        else if (record.status === 'passed') assert.equal(cell.status, 'passed', 'Every selected mandatory host must pass');
      }
    }
  }
}

export function writeCoreLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, coreLedgerScope);
  assert.ok(['running', 'passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'Regular ledger parent');
  if (fs.existsSync(filename)) {
    const stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink(), 'Regular unlinked ledger');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(previous.scope, coreLedgerScope); assert.equal(previous.officialGate, ledger.officialGate,
      'Diagnostics must never overwrite official execution evidence');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    fs.renameSync(temporary, filename);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

export async function checkCoreExecution(cell, group, execute, verifyIntegrity, checkpoint = () => {}) {
  cell.status = 'running'; delete cell.reason; checkpoint();
  try {
    cell.result = await execute();
    checkpoint(); // Preserve raw stdout/error/timeout before any post-run check.
    await verifyIntegrity();
    cell.outcomes = assertCoreResult(cell.result, group, `${cell.host} ${group.id}`);
    cell.status = 'passed';
  } catch (error) {
    cell.status = 'failed'; cell.error = error.stack || error.message;
    if (error instanceof CoreIntegrityError) { checkpoint(); throw error; }
  }
  checkpoint(); return cell.status;
}

export class CoreIntegrityError extends Error {}
const integrity = check => {
  try { check(); } catch (error) { throw new CoreIntegrityError(error.message, {cause: error}); }
};

export function assertCoreCompilerSources(sourceDigests) {
  integrity(() => {
    assert.ok(Array.isArray(sourceDigests) && sourceDigests.length > 0, 'Pre-javac source digests are required');
    assert.deepEqual(sourceDigests.map(source => ({path: source.path, sha256: digest(fs.readFileSync(source.path))})),
      sourceDigests, 'Immutable compiler sources from pre-javac hashes');
  });
}

// Keep this ordering explicit and independently testable: an unsuccessful javac
// attempt may also corrupt inputs, and neither fact may erase its raw result.
export async function checkCoreCompilation(operation, execute, verifyIntegrity, checkpoint = () => {}) {
  operation.result = await execute();
  checkpoint();
  await verifyIntegrity();
  assert.equal(operation.result.status, 'passed', operation.result.stderr);
  assert.equal(operation.result.stdout + operation.result.stderr, '', 'Clean genuine compilation');
}

async function provenance() {
  const read = async args => {
    const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10_000});
    assert.equal(result.status, 'passed', 'Git provenance available'); return result.stdout.trim();
  };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']),
    trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

export async function runCoreSemantics(ledger, {checkpoint = () => {}} = {}) {
  assertCoreLedgerInventory(ledger, {phase: 'initial'});
  const nativeOnly = ledger.requestedMode === 'native-only', browser = ledger.requestedMode === 'browser';
  const hosts = nativeOnly ? ['native'] : browser ? coreRequiredHosts : ['native', 'node'];
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const indexPath = path.join(repoRoot, 'ci/plan_spec_source_index.json'), index = JSON.parse(fs.readFileSync(indexPath));
  ledger.sourceUnits = coreGroups.map(group => ({group: group.id, cases: coreSourceUnits(group, index)}));
  const relativeInputs = ['ci/java_core_semantics_test.mjs', 'ci/java_core_semantics_contract_test.mjs',
    'ci/java_core_bytecode.mjs', 'ci/java_core_bytecode_test.mjs', 'ci/java_class_structure_test.mjs',
    'ci/java_class_derivation_test.mjs', 'ci/run_java_compatibility.mjs', 'ci/prepare_java_compatibility_toolchains.mjs',
    'ci/java_compatibility_browser.mjs', 'ci/plan_spec_source_index.json', 'package.json', 'yarn.lock',
    '.github/workflows/modern-java.yml', ...coreGroups.flatMap(group => [group.source, `ci/java_core_${
      group.id === 'arrays-objects' ? 'arrays_objects' : group.id}_cases.mjs`])];
  const inputPaths = [...relativeInputs.map(relative => path.join(repoRoot, relative)), lockPath, markerPath, process.execPath];
  const inputs = () => inputPaths.map(filename => ({path: filename, size: fs.statSync(filename).size, sha256: digest(fs.readFileSync(filename))}));
  ledger.inputDigests = inputs(); ledger.node = {version: process.version, executable: process.execPath};
  ledger.gitStart = await provenance();
  if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitStart);
  const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
    lock.toolchains.find(item => item.id === prepared.id).treeSha256, `${prepared.id}: immutable locked JDK tree`));
  integrity(checkJdks);
  ledger.toolchains = marker.toolchains.map(prepared => ({...prepared,
    treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256}));
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
  ledger.runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-core-semantics-')); fs.chmodSync(temporaryRoot, 0o700);
  let session;
  const checkGlobal = () => integrity(() => {
    assert.deepEqual(inputs(), ledger.inputDigests, 'Immutable corpus and harness inputs');
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), ledger.runtime, 'Immutable CLI runtime');
    if (session) session.verifyIntegrity();
  });
  try {
    if (browser) {
      const {createBrowserSession} = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({repoRoot}); ledger.browserProvenance = session.provenance;
    }
    checkpoint();
    const emptySourcepath = path.join(temporaryRoot, 'empty-sourcepath'); fs.mkdirSync(emptySourcepath);
    for (const record of ledger.results) {
      const group = coreGroups.find(candidate => candidate.id === record.group);
      const prepared = marker.toolchains.find(item => item.feature === record.release);
      const directory = path.join(temporaryRoot, `release${record.release}`, group.id), output = path.join(directory, 'classes');
      fs.mkdirSync(output, {recursive: true});
      record.status = 'running'; checkpoint();
      try {
        checkGlobal();
        const sourceRecords = [{path: path.join(repoRoot, group.source), sha256: digest(fs.readFileSync(path.join(repoRoot, group.source)))}];
        for (const source of group.generatedSources?.() || []) {
          assert.match(source.binaryName, /^[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*$/);
          const filename = path.join(directory, 'sources', source.binaryName.replaceAll('.', '/') + '.java');
          fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, source.text, {flag: 'wx', mode: 0o600});
          sourceRecords.push({...source, path: filename, sha256: digest(source.text)});
        }
        record.sources = sourceRecords;
        const sourceDigests = sourceRecords.map(source => ({path: source.path, sha256: source.sha256}));
        assertCoreCompilerSources(sourceDigests);
        const operation = {command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(record.release),
          '-encoding', 'UTF-8', '-proc:none', '-g', '-classpath', emptySourcepath, '-sourcepath', emptySourcepath, '-d', output,
          ...sourceRecords.map(source => source.path)], destination: output};
        record.operations.push(operation); checkpoint();
        await checkCoreCompilation(operation, () => runCommand(operation.command, operation.arguments,
          {cwd: directory, timeoutMs: coreTimeouts.compileMs}),
        () => { checkGlobal(); assertCoreCompilerSources(sourceDigests); }, checkpoint);
        record.classFiles = inspectClassFiles(output, record.release, group.mainClass);
        record.bytecodeProofs = proveCoreGroup(group, inspectCoreClasses(output, record.classFiles));
        record.classpath = {directory: output, treeSha256: treeDigest(output), genuineCompilerBytes: true, fallbackPayloadClassFiles: false};
        const checkLocal = () => integrity(() => {
          assertCoreCompilerSources(sourceDigests);
          assert.equal(treeDigest(output), record.classpath.treeSha256, 'Immutable genuine runtime classpath');
          assert.deepEqual(inspectClassFiles(output, record.release, group.mainClass), record.classFiles, 'Genuine class versions and hashes');
        });
        for (const cell of record.executions) {
          if (!hosts.includes(cell.host)) { cell.reason = 'explicit diagnostic mode excludes this mandatory host'; checkpoint(); continue; }
          checkGlobal(); checkLocal();
          await checkCoreExecution(cell, group, () => cell.host === 'chromium' ? session.execute({classesPath: output,
            mainClass: group.mainClass, arguments: [], timeoutMs: coreTimeouts.guestMs, standardInput: ''}) : runCommand(
            cell.host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(cell.host === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', output, group.mainClass],
            {cwd: directory, timeoutMs: cell.host === 'native' ? coreTimeouts.nativeMs : coreTimeouts.guestMs, standardInput: ''}),
          () => { checkGlobal(); checkLocal(); }, checkpoint);
        }
        record.status = record.executions.filter(cell => hosts.includes(cell.host)).every(cell => cell.status === 'passed') ? 'passed' : 'failed';
        console.log(`${record.status === 'passed' ? 'PASS' : 'FAIL'} core ${group.id} Java ${record.release}: ${group.cases.length} cases on ${hosts.join(', ')}`);
      } catch (error) {
        record.status = 'failed'; record.error = error.stack || error.message;
        for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'group preparation failed: ' + error.message;
        checkpoint(); if (error instanceof CoreIntegrityError) throw error;
      }
      checkpoint();
    }
    checkGlobal(); integrity(checkJdks);
    ledger.gitEnd = await provenance();
    if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitEnd);
    else assert.deepEqual(ledger.gitEnd, ledger.gitStart, 'Unchanged diagnostic source state');
    ledger.browserIntegrity = session ? session.verifyIntegrity() : null;
    ledger.inputIntegrity = {unchanged: true, verifiedAtEnd: true};
    assertCoreLedgerInventory(ledger, {phase: 'terminal'});
    ledger.status = ledger.results.every(record => record.status === 'passed') ? 'passed' : 'failed';
    ledger.summary = {executionCells: ledger.results.flatMap(record => record.executions).length,
      passed: ledger.results.flatMap(record => record.executions).filter(cell => cell.status === 'passed').length,
      failed: ledger.results.flatMap(record => record.executions).filter(cell => cell.status === 'failed').length,
      notRun: ledger.results.flatMap(record => record.executions).filter(cell => cell.status === 'not-run').length};
    if (ledger.officialGate) assert.equal(ledger.summary.notRun, 0, 'Every mandatory native/Node/Chromium cell must execute');
    return ledger;
  } finally {
    try { if (session) await session.close(); }
    finally { fs.rmSync(temporaryRoot, {recursive: true, force: true}); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2), mode = options[0] === '--browser' ? 'browser' :
    options[0] === '--native-only' ? 'native-only' : 'diagnostic';
  const ledger = createCoreLedger(mode);
  const filename = path.join(repoRoot, mode === 'browser' ? 'build/java-core-semantics-results.json' :
    `build/java-core-semantics-${mode}-results.json`);
  const checkpoint = () => writeCoreLedger(filename, ledger);
  checkpoint();
  try {
    assert.ok(options.length === 1 && ['--browser', '--native-only', '--diagnostic'].includes(options[0]),
      'Usage: node ci/java_core_semantics_test.mjs --browser | --native-only | --diagnostic');
    await runCoreSemantics(ledger, {checkpoint});
    if (ledger.status !== 'passed') process.exitCode = 1;
  } catch (error) {
    ledger.status = 'failed'; ledger.error = error.stack || error.message; process.exitCode = 1; console.error(ledger.error);
    for (const record of ledger.results) for (const cell of record.executions) if (cell.status === 'not-run')
      cell.reason = 'gate stopped: ' + error.message;
  } finally {
    ledger.finishedAt = new Date().toISOString(); checkpoint();
  }
}
