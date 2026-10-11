import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import * as final from './java_final_language_test.mjs';
import {assertCoreResult, checkCoreCompilation, CoreIntegrityError} from './java_core_semantics_test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'ci/plan_spec_source_index.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const emptyResult = {status: 'passed', exitCode: 0, signal: null, error: null, timedOut: false, outputLimitExceeded: false, stdout: '', stderr: ''};
const success = group => ({...emptyResult, stdout: group.cases.flatMap(entry => entry.trace.map(event => entry.id + '=' + event)).concat([group.completionMarker, '']).join('\n')});
const launcher = final.finalGroups.at(-1);
const positive = launcher.cases[0];
const positiveResult = entry => ({...emptyResult, stdout: [...entry.trace.map(event => entry.id + '=' + event), entry.completionMarker, ''].join('\n')});
const failure = () => ({...structuredClone(launcher.cases.find(entry => entry.id === 'fl-class-initialization-failure')),
  oracleStatus: 'fixed', diagnosticsByHost: Object.fromEntries(final.finalRequiredHosts.map(host => [host, {
    stdout: host === 'native' ? [] : {requiredPatterns: ['^Error: diagnostic-only$'], allowedPatterns: ['^Error: diagnostic-only$']},
    stderr: {requiredPatterns: ['^Exception: original-failure$'], allowedPatterns: ['^Exception: original-failure$', '^  at known-frame$']}
  }]))});
const negativeResult = (entry, host) => ({...emptyResult, status: 'failed', exitCode: 1,
  stdout: [...entry.trace.map(event => entry.id + '=' + event), ...(host === 'native' ? [] : ['Error: diagnostic-only']), ''].join('\n'),
  stderr: 'Exception: original-failure\n  at known-frame\n'});

test('B8 keeps exactly 58 canonical cases and seven genuine group/release compiles', () => {
  assert.equal(final.validateFinalGroups(), 58);
  assert.deepEqual(final.finalGroups.map(group => [group.id, group.releases, group.cases.length]), [
    ['final-patterns', [21, 25], 16], ['final-switch-flow', [21, 25], 14], ['final-constructors', [25], 10],
    ['final-resources', [25], 6], ['final-launcher', [25], 12]]);
  for (const group of final.finalGroups) {
    const source = fs.readFileSync(path.join(root, group.source), 'utf8'); assert.match(source, /package classes\.modern_test;/);
    if (group !== launcher) for (const entry of group.cases) assert.ok(source.includes(entry.entryMethod + '('));
    assert.ok(!group.compilationUnits && !group.mutatePayload);
  }
  assert.equal(launcher.driverClassNames.length, 18); assert.ok(launcher.cases.every(entry => entry.mainClass !== launcher.mainClass));
  assert.deepEqual(final.finalTimeouts, {compileMs: 60000, nativeMs: 30000, guestMs: 60000});
});

test('all 21 cells and all 36 actual launcher startups are pre-registered before I/O', () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = final.createFinalLedger(mode); assert.equal(ledger.caseCount, 58); assert.equal(ledger.releaseQualifiedCaseCount, 88);
    assert.equal(ledger.results.length, 7); assert.equal(ledger.results.flatMap(record => record.executions).length, 21);
    const actual = ledger.results.find(record => record.group === 'final-launcher');
    assert.equal(actual.executions.flatMap(cell => cell.cases).length, 36);
    for (const record of ledger.results) { assert.equal(record.status, 'not-run'); assert.deepEqual(record.operations, []);
      for (const cell of record.executions) { assert.equal(cell.status, 'not-run'); assert.ok(!cell.result);
        for (const startup of cell.cases || []) { assert.equal(startup.status, 'not-run'); assert.ok(!startup.result); } } }
    final.assertFinalLedgerInventory(ledger, {phase: 'initial'});
  }
});

const corruptions = [l => l.results.pop(), l => l.results.reverse(), l => l.results[0].release = 25,
  l => l.results[0].group = 'final-launcher', l => l.requiredReleases.pop(), l => l.requiredHosts.pop(),
  l => l.caseCount--, l => l.releaseQualifiedCaseCount--, l => l.genuineCompilationCount++, l => l.executionCellCount++,
  l => l.results[0].cases.pop(), l => l.results[0].cases.reverse(), l => l.results[0].cases[0].trace = ['waived'],
  l => l.results[0].driverClassNames.pop(), l => l.results[0].executions.pop(), l => l.results[0].executions.reverse(),
  l => l.results[6].executions[0].cases.pop(), l => l.results[6].executions[0].cases.reverse(),
  l => l.results[6].executions[0].cases[0].mainClass = launcher.mainClass,
  l => l.results[6].executions[0].cases[0].arguments = [], l => l.requestedMode = 'invented', l => l.officialGate = false,
  ...['phaseBComplete', 'jvm008Complete', 'fullSourceUnitConformanceProven', 'fullClassFileConformanceProven',
    'generalBootstrapConformanceProven', 'generalInitializationConformanceProven', 'namedModuleRuntimeConformanceProven'].map(key => l => l[key] = true)];

test('mandatory inventory rejects pruning, swapped editions/targets/hosts and inflated completion', () => {
  for (const corrupt of corruptions) { const ledger = final.createFinalLedger(); corrupt(ledger); assert.throws(() => final.assertFinalLedgerInventory(ledger)); }
  assert.throws(() => final.createFinalLedger('invented')); assert.throws(() => final.createFinalLedger('browser', []));
  const groups = structuredClone(final.finalGroups); groups[2].releases = [21, 25]; assert.throws(() => final.createFinalLedger('browser', groups), /release inventory/);
  groups[2].releases = [25]; groups[0].cases[0].trace = ['adaptive']; assert.throws(() => final.createFinalLedger('browser', groups), /contracts/);
});

test('unknown/missing Code or bootstrap selectors fail before compiler/host I/O', () => {
  for (const mutate of [g => g.cases[0].probes = [], g => g.cases[0].probes[0].requiredOpcodes = [],
    g => g.cases[0].probes[0].requiredOpcodes = ['bad-opcode'], g => g.cases[0].probes[0].unusedSelector = true]) {
    const group = structuredClone(final.finalGroups[0]); mutate(group); assert.throws(() => final.validateFinalGroups([group]));
  }
  const choose = group => group.cases.flatMap(entry => entry.probes).find(probe => probe.bootstrapSites).bootstrapSites[0];
  for (const mutate of [s => s.unknown = true, s => s.bootstrap.unknown = true, s => s.arguments[0].unknown = true,
    s => s.arguments[0].tag = 8, s => s.bootstrap.kind = 5]) {
    const group = structuredClone(final.finalGroups[0]); mutate(choose(group)); assert.throws(() => final.validateFinalGroups([group]));
  }
  const group = structuredClone(final.finalGroups[0]), probe = group.cases.flatMap(entry => entry.probes).find(p => p.bootstrapSites);
  probe.bootstrapSites = []; assert.throws(() => final.validateFinalGroups([group]));
});

test('genuine abstract interface is the only case allowed to omit executable Code probes', () => {
  const abstract = launcher.cases.find(entry => entry.id === 'fl-initial-interface-abstract-failure'); assert.deepEqual(abstract.probes, []);
  assert.equal(abstract.launchSelection.constructor, null); assert.equal(abstract.classProofs.at(-1).declaredMainMethods[0].hasCode, false);
  const group = structuredClone(launcher); group.cases[0].probes = []; assert.throws(() => final.validateFinalGroups([group]));
  for (const mutate of [g => g.cases[2].launchSelection.constructor = null, g => g.cases[0].mainClass = launcher.mainClass,
    g => g.cases[0].classProofs = [], g => g.cases[0].classProofs[0].typo = true,
    g => g.cases[0].launchSelection.descriptor = '([Ljava/lang/String;)I', g => g.cases[0].launchSelection.constructor = {className: g.cases[0].mainClass, descriptor: '()V'}]) {
    const changed = structuredClone(launcher); mutate(changed); assert.throws(() => final.validateFinalGroups([changed]));
  }
});

test('source bindings use actual group releases and retain all owners/dependencies unassessed', () => {
  const owned = index.units.filter(unit => unit.ownerPackageId === 'JVM-008'); assert.equal(owned.length, 112);
  owned.forEach(unit => assert.equal(unit.assessmentStatus, 'unassessed'));
  for (const group of final.finalGroups) for (const entry of final.finalSourceUnits(group, index)) for (const unit of entry.sourceUnits) {
    assert.ok(group.releases.includes(Number(unit.id.split('-')[1].split(':')[0]))); assert.equal(unit.fullUnitConformanceProven, false);
    const original = index.units.find(u => u.id === unit.id); assert.equal(unit.ownerPackageId, original.ownerPackageId); assert.equal(unit.assessmentStatus, original.assessmentStatus);
  }
  const dependencies = final.finalSourceUnits(final.finalGroups[2], index).flatMap(entry => entry.sourceUnits);
  assert.ok(dependencies.some(unit => unit.ownerPackageId === 'JVM-002' && unit.id === 'JLS-25:jls-8.8.7'));
  const changed = structuredClone(final.finalGroups[0]); changed.cases[0].anchors.JLS = ['not-an-anchor']; assert.throws(() => final.finalSourceUnits(changed, index));
});

test('native-first diagnostic readiness is mandatory and cannot reach toolchain I/O while pending', async () => {
  // Canonical readiness intentionally remains RED until separate observations
  // have been reviewed and committed as source literals, never copied by a gate.
  final.assertFinalOracleReadiness();
  const groups = structuredClone(final.finalGroups), entry = groups[4].cases.find(c => c.outcome === 'failure');
  entry.oracleStatus = 'pending-native-diagnostics'; entry.diagnosticsByHost = null;
  assert.throws(() => final.assertFinalOracleReadiness(groups), /source-fixed/);
  const ledger = final.createFinalLedger(); ledger.results[6].cases.find(c => c.outcome === 'failure').oracleStatus = 'pending-native-diagnostics';
  const read = fs.readFileSync; fs.readFileSync = function(filename, ...args) {
    assert.ok(!String(filename).endsWith('java_compatibility_toolchains.lock.json'), 'Pending/corrupt oracle reached toolchain I/O'); return read.call(this, filename, ...args);
  };
  try { await assert.rejects(final.runFinalLanguage(ledger)); } finally { fs.readFileSync = read; }
});

test('malformed canonical ledger is rejected before any toolchain read', async () => {
  const read = fs.readFileSync; fs.readFileSync = function(filename, ...args) {
    assert.ok(!String(filename).endsWith('java_compatibility_toolchains.lock.json')); return read.call(this, filename, ...args);
  };
  try { for (const corrupt of corruptions) { const ledger = final.createFinalLedger(); corrupt(ledger); await assert.rejects(final.runFinalLanguage(ledger)); } }
  finally { fs.readFileSync = read; }
});

test('positive startup requires exact main/argument/constructor trace, marker, zero exit and empty diagnostics', () => {
  assert.equal(final.assertFinalLauncherResult(positiveResult(positive), positive, 'native').outcome, 'success');
  for (const patch of [{exitCode: 1}, {status: 'failed'}, {stderr: 'warning'}, {timedOut: true}, {signal: 'SIGKILL'}, {error: 'host error'},
    {stdout: positiveResult(positive).stdout.replace('alpha|βeta', 'alpha|wrong')}, {stdout: positiveResult(positive).stdout.replace('FINAL_LAUNCHER_OK', 'OTHER_OK')},
    {stdout: 'FORBIDDEN\n' + positiveResult(positive).stdout}]) assert.throws(() => final.assertFinalLauncherResult({...positiveResult(positive), ...patch}, positive, 'node'));
});

test('negative startup keeps exact program prefix and separate explicit host diagnostics', () => {
  const entry = failure();
  for (const host of final.finalRequiredHosts) assert.equal(final.assertFinalLauncherResult(negativeResult(entry, host), entry, host).outcome, 'failure');
  const good = negativeResult(entry, 'node');
  for (const patch of [{exitCode: 0}, {exitCode: null}, {status: 'passed'}, {timedOut: true}, {outputLimitExceeded: true}, {signal: 'SIGKILL'},
    {stdout: good.stdout.replace('class-init-start', 'class-init-complete')}, {stdout: good.stdout.split('\n').reverse().join('\n')},
    {stdout: good.stdout.replace('Error: diagnostic-only\n', '')}, {stdout: good.stdout + 'FINAL_LAUNCHER_OK\n'},
    {stderr: ''}, {stderr: good.stderr + 'unknown diagnostic\n'}, {stderr: good.stderr + 'AssertionError\n'},
    {stdout: good.stdout + entry.id + '=FORBIDDEN-body\n'}]) assert.throws(() => final.assertFinalLauncherResult({...good, ...patch}, entry, 'node'));
  const broad = structuredClone(launcher); broad.cases[0].diagnosticsByHost.node.stdout = {requiredPatterns: [], allowedPatterns: ['not-anchored']};
  assert.throws(() => final.validateFinalGroups([broad]));
});

test('raw startup timeout/failure is checkpointed before post-run input rejection', async () => {
  const startup = {id: positive.id, status: 'not-run'}, checkpoints = [], raw = {...positiveResult(positive), status: 'timeout', timedOut: true, exitCode: null, stderr: 'partial failure'};
  await assert.rejects(final.checkFinalLauncherExecution(startup, positive, 'node', async () => raw,
    () => { throw new CoreIntegrityError('changed earlier original class'); }, () => checkpoints.push(structuredClone(startup))), CoreIntegrityError);
  assert.deepEqual(startup.result, raw); assert.equal(startup.status, 'failed'); assert.ok(!startup.outcome);
  assert.ok(checkpoints.some(value => value.status === 'running' && value.result?.stderr === 'partial failure'));
});

test('ordinary startup oracle failure does not erase raw result or become an integrity abort', async () => {
  const startup = {id: positive.id, status: 'not-run'}, raw = {...positiveResult(positive), stderr: 'wrong output'};
  assert.equal(await final.checkFinalLauncherExecution(startup, positive, 'node', async () => raw, () => {}), 'failed');
  assert.deepEqual(startup.result, raw); assert.ok(startup.error); assert.ok(!startup.outcome);
});

test('every prior compiler output/source stays checked after an unsuccessful later compiler attempt', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-final-prior-compiler-contract-'));
  try {
    const first = path.join(directory, 'first'), second = path.join(directory, 'second'), source = path.join(directory, 'Fixture.java');
    fs.mkdirSync(first); fs.mkdirSync(second); fs.writeFileSync(source, 'class Fixture {}\n'); fs.writeFileSync(path.join(first, 'Fixture.class'), 'original-model-bytes');
    const sourceDigests = [{path: source, sha256: sha(fs.readFileSync(source))}], previous = {sourceDigests, outputEvidence: final.captureFinalCompilerOutput(first)};
    final.checkFinalPriorCompilations([previous]); const operation = {sourceDigests}, checkpoints = [], raw = {...emptyResult, status: 'failed', exitCode: 1, stderr: 'javac failed'};
    await assert.rejects(checkCoreCompilation(operation, async () => { fs.writeFileSync(path.join(first, 'Fixture.class'), 'changed-model-bytes');
      fs.writeFileSync(path.join(second, 'Partial.class'), 'partial-model-bytes'); return raw; }, () => {
      operation.outputEvidence = final.captureFinalCompilerOutput(second); checkpoints.push(structuredClone(operation));
      final.checkFinalPriorCompilations([previous, operation]); }, () => checkpoints.push(structuredClone(operation))), CoreIntegrityError);
    assert.deepEqual(operation.result, raw); assert.equal(operation.outputEvidence.files.length, 1); assert.deepEqual(checkpoints[0].result, raw);
    assert.ok(checkpoints.some(value => value.outputEvidence?.files[0].path === 'Partial.class'));
    fs.writeFileSync(path.join(first, 'Fixture.class'), 'original-model-bytes'); fs.writeFileSync(source, 'changed source');
    assert.throws(() => final.checkFinalPriorCompilations([previous]), CoreIntegrityError);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

function terminalModel(mode = 'native-only') {
  // Bookkeeping-only synthetic receipts. Not javac output, host execution,
  // decoder truth or coverage evidence; real gate paths produce all of those.
  const ledger = final.createFinalLedger(mode), digest = '0'.repeat(64);
  ledger.status = 'passed'; ledger.sourceUnits = final.finalGroups.map(group => ({group: group.id, cases: final.finalSourceUnits(group, index)}));
  const covered = new Set(ledger.sourceUnits.flatMap(group => group.cases.flatMap(entry => entry.sourceUnits.map(unit => unit.id))));
  ledger.ownedSourceInventory = index.units.filter(unit => unit.ownerPackageId === 'JVM-008').map(unit => ({id: unit.id, url: unit.url, ownerPackageId: unit.ownerPackageId,
    assessmentStatus: unit.assessmentStatus, boundedCaseBindingPresent: covered.has(unit.id), fullUnitConformanceProven: false}));
  ledger.inputIntegrity = {unchanged: true, verifiedAtEnd: true}; ledger.inputDigests = final.finalInputPaths().map(filename => ({path: filename, size: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename))}));
  ledger.proofIntegrity = {unchanged: true, verifiedAtEnd: true};
  ledger.node = {executable: process.execPath, version: process.version}; ledger.gitStart = ledger.gitEnd = {commit: '0'.repeat(40), trackedDirty: false};
  ledger.toolchains = [21, 25].map(feature => ({feature, treeSha256: digest, archiveSha256: digest})); ledger.runtime = mode === 'native-only' ? null : {snapshotSha256: digest, files: [{}]};
  ledger.browserIntegrity = mode === 'browser' ? {status: 'verified', ...Object.fromEntries(['runtimeSha256', 'browserfsSha256', 'bootstrapSha256', 'chromiumExecutableSha256', 'adapterSha256'].map(key => [key, digest]))} : null;
  if (mode === 'browser') ledger.browserProvenance = {chromiumExecutable: {sha256: digest}, adapter: {sha256: digest}};
  for (const record of ledger.results) {
    const group = final.finalGroups.find(candidate => candidate.id === record.group); record.status = 'passed';
    record.classFiles = group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort().map(filename => ({path: filename, sha256: digest, size: 100, major: record.release + 44, minor: 0}));
    const file = name => record.classFiles.find(item => item.path === name.replaceAll('.', '/') + '.class');
    const directory = path.join(os.tmpdir(), 'doppio-synthetic-final-receipt', 'release' + record.release, group.id, 'classes');
    record.classpath = {directory, genuineCompilerBytes: true, byteTransformations: false, fallbackClassFiles: false, treeSha256: digest};
    const compiler = JSON.parse(fs.readFileSync(path.join(root, 'build/java-compatibility-toolchains/toolchains.json'))).toolchains.find(item => item.feature === record.release);
    const source = path.join(root, group.source), empty = path.resolve(directory, '..', '..', '..', 'empty-sourcepath');
    const command = path.join(compiler.home, 'bin', 'javac'), arguments_ = ['--release', String(record.release), '-encoding', 'UTF-8', '-proc:none', '-g',
      '-sourcepath', empty, '-classpath', empty, '-d', directory, source];
    record.operations = [{kind: 'genuine-driver', command, arguments: arguments_, sourceDigests: [{path: source, sha256: sha(fs.readFileSync(source))}],
      result: {...emptyResult, command: [command, ...arguments_], cwd: path.dirname(directory), timeoutMs: final.finalTimeouts.compileMs},
      outputEvidence: {directory, treeSha256: digest, files: record.classFiles.map(({path, sha256, size}) => ({path, sha256, size}))}}];
    record.bytecodeProofs = group.cases.map(entry => ({id: entry.id, probes: entry.probes.map(probe => ({owner: probe.className || group.mainClass,
      method: probe.method, descriptor: probe.descriptor, classFile: file(probe.className || group.mainClass), codeSha256: digest,
      matches: [...probe.requiredOpcodes.map(name => ({name})), ...(probe.symbolicOperands || []).map(operand => ({name: operand.opcode, cp: {...operand}}))],
      ...(probe.bootstrapSites ? {bootstrapSites: probe.bootstrapSites.map(site => ({...structuredClone(site), instructionPc: 0, cpIndex: 1, cpOffset: 1,
        bootstrapOffset: 1, methodHandleIndex: 1, methodHandleOffset: 1, referenceIndex: 1, attributeSha256: digest}))} : {})})),
      dynamicBranchCoverageProven: false, jitExecutionProven: false, fullSourceUnitConformanceProven: false,
      ...(group === launcher ? {actualLaunchTarget: entry.mainClass, selection: structuredClone(entry.launchSelection), staticDeclarationBindingsProven: true,
        generalInitializationConformanceProven: false, classProofs: entry.classProofs.map(proof => ({className: proof.className, classFile: file(proof.className), flags: proof.flags.required,
          superName: proof.superName, interfaceNames: [...proof.interfaceNames], ...Object.fromEntries([['mains', proof.declaredMainMethods], ['constructors', proof.constructors],
            ['initializers', proof.classInitializer ? [proof.classInitializer] : []]].map(([name, members]) => [name, members.map(member => ({descriptor: member.descriptor, flags: member.flags.required,
              hasCode: member.hasCode, start: 1, end: 2, ...(member.hasCode ? {codeSha256: digest} : {})}))]))}))} : {})}));
    for (const cell of record.executions) if (cell.host === 'native' || mode === 'browser' || mode === 'diagnostic' && cell.host === 'node') {
      cell.status = 'passed'; delete cell.reason;
      if (group === launcher) {
        for (const [at, startup] of cell.cases.entries()) { const entry = group.cases[at]; startup.status = 'passed';
          if (entry.outcome === 'success') startup.result = positiveResult(entry);
          else {
            const literal = stream => Array.isArray(stream) ? [] : stream.requiredPatterns.map(pattern => pattern.slice(1, -1).replace(/\\([\\.$*+?()[\]{}|^])/g, '$1').replaceAll('\\t', '\t'));
            startup.result = {...emptyResult, status: 'failed', exitCode: 1,
              stdout: [...entry.trace.map(event => entry.id + '=' + event), ...literal(entry.diagnosticsByHost[cell.host].stdout), ''].join('\n'),
              stderr: [...literal(entry.diagnosticsByHost[cell.host].stderr), ''].join('\n')};
          }
          startup.outcome = final.assertFinalLauncherResult(startup.result, entry, cell.host);
        }
        cell.outcomes = cell.cases.map(startup => startup.outcome);
      } else { cell.result = success(group); cell.outcomes = assertCoreResult(cell.result, group); }
    }
  }
  return ledger;
}

test('terminal bookkeeping requires all source/global/compiler/runtime/static evidence', () => {
  for (const mode of ['native-only', 'diagnostic', 'browser']) final.assertFinalLedgerInventory(terminalModel(mode), {phase: 'terminal'});
  for (const corrupt of [l => delete l.sourceUnits, l => delete l.ownedSourceInventory, l => delete l.inputIntegrity, l => delete l.proofIntegrity,
    l => delete l.inputDigests, l => l.inputDigests.pop(), l => delete l.gitEnd, l => l.gitEnd = {...l.gitStart, trackedDirty: true},
    l => l.inputDigests[0].sha256 = '0'.repeat(64), l => l.results[0].status = 'failed',
    l => delete l.toolchains, l => delete l.runtime, l => delete l.browserProvenance, l => delete l.browserIntegrity,
    l => l.ownedSourceInventory[0].assessmentStatus = 'complete', l => l.results[0].operations.pop(),
    l => delete l.results[0].operations[0].outputEvidence, l => l.results[0].classFiles.pop(),
    l => l.results[0].operations[0].command = '/not-the-locked-javac',
    l => l.results[0].operations[0].arguments = ['--release', '8', 'Unrelated.java'],
    l => l.results[0].operations[0].sourceDigests = [],
    l => l.results[0].operations[0].result.command = ['unrelated-process'],
    l => l.results[0].operations[0].result.cwd = '/unrelated-directory',
    l => l.results[0].operations[0].result.timeoutMs = 0,
    l => l.results[0].bytecodeProofs.pop(), l => l.results[0].bytecodeProofs[0].probes.pop(),
    l => l.results[0].bytecodeProofs[0].probes[0].owner = 'Decoy', l => l.results[0].bytecodeProofs[0].probes[0].codeSha256 = 'not-hash',
    l => l.results[0].bytecodeProofs[0].probes[0].classFile.sha256 = '1'.repeat(64),
    l => l.results[0].bytecodeProofs[0].probes[0].matches = [],
    l => l.results[0].bytecodeProofs.flatMap(proof => proof.probes).find(probe => probe.bootstrapSites).bootstrapSites[0].arguments = [],
    l => l.results[6].bytecodeProofs[0].selection = null, l => l.results[6].bytecodeProofs[0].classProofs[0].mains = [{}],
    l => delete l.results[6].executions[0].cases[0].result, l => l.results[6].executions[0].cases[0].outcome = {id: 'waived'}]) {
    const ledger = terminalModel('browser'); corrupt(ledger); assert.throws(() => final.assertFinalLedgerInventory(ledger, {phase: 'terminal'}));
  }
});

test('classpath allows only exact singly-linked original compiler files', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-final-classpath-contract-'));
  try {
    const group = {driverClassNames: ['Fixture']}, filename = path.join(directory, 'Fixture.class'), bytes = Buffer.from('model bytes'); fs.writeFileSync(filename, bytes);
    const files = [{path: 'Fixture.class', sha256: sha(bytes), size: bytes.length}]; final.assertFinalClasspath(group, directory, files);
    fs.writeFileSync(path.join(directory, 'fallback.bin'), 'not allowed'); assert.throws(() => final.assertFinalClasspath(group, directory, files)); fs.unlinkSync(path.join(directory, 'fallback.bin'));
    fs.linkSync(filename, path.join(directory, 'hard.class')); assert.throws(() => final.assertFinalClasspath(group, directory, files)); fs.unlinkSync(path.join(directory, 'hard.class'));
    fs.renameSync(filename, path.join(directory, 'original.bin')); fs.symlinkSync('original.bin', filename); assert.throws(() => final.assertFinalClasspath(group, directory, files));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('private atomic ledgers never replace official evidence with diagnostics or follow symlinks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-final-ledger-contract-'));
  try {
    const filename = path.join(directory, 'results.json'), ledger = final.createFinalLedger(); final.writeFinalLedger(filename, ledger);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600); assert.throws(() => final.writeFinalLedger(filename, final.createFinalLedger('native-only')));
    const target = path.join(directory, 'target.json'); fs.renameSync(filename, target); fs.symlinkSync(target, filename); assert.throws(() => final.writeFinalLedger(filename, ledger));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('canonical contracts are frozen and release/host copies cannot contaminate each other', () => {
  assert.throws(() => final.finalGroups.pop(), TypeError); assert.throws(() => final.finalGroups[0].cases[0].probes.pop(), TypeError);
  const ledger = final.createFinalLedger(), original = ledger.results[2].cases.length; ledger.results[0].cases.pop(); assert.equal(ledger.results[2].cases.length, original);
  ledger.results[6].executions[0].cases[0].arguments.pop(); assert.deepEqual(ledger.results[6].executions[1].cases[0].arguments, positive.arguments);
});
