import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {methodHandleGroups, methodHandleHosts, methodHandleReleases, methodHandleTimeouts,
  validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger, assertMethodHandleLedger,
  assertMethodHandleCompilation, assertMethodHandleExecution, assertMethodHandleProvenance, captureMethodHandleOutput,
  writeMethodHandleLedger, methodHandleInputPaths, parseMethodHandleMode} from './java_methodhandle_core_test.mjs';
import {assertCoreResult, checkCoreExecution, checkCoreCompilation, CoreIntegrityError} from './java_core_semantics_test.mjs';
import {proveCoreGroup} from './java_core_bytecode.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const raw = group => ({status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
  error: null, stdout: group.cases.flatMap(entry => entry.trace.map(event => `${entry.id}=${event}`))
    .concat([group.completionMarker, '']).join('\n'), stderr: ''});
const sourceIndex = JSON.parse(fs.readFileSync(path.join(root, 'ci/plan_spec_source_index.json')));

test('C1 independently requires 60 selected cases, eight genuine recipes and 24 registered host cells', () => {
  assert.equal(validateMethodHandleGroups(), 60);
  assert.ok(Object.isFrozen(methodHandleGroups) && methodHandleGroups.every(group => Object.isFrozen(group.cases) &&
    group.cases.every(entry => Object.isFrozen(entry.trace) && Object.isFrozen(entry.probes))), 'Deeply frozen source contracts');
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = createMethodHandleLedger(mode);
    assert.equal(ledger.caseCount, 60); assert.equal(ledger.results.length, 8);
    assert.equal(ledger.results.flatMap(record => record.executions).length, 24);
    assert.deepEqual(ledger.requiredReleases, [21, 25]); assert.deepEqual(ledger.requiredHosts, ['native', 'node', 'chromium']);
    assert.equal(ledger.officialGate, mode === 'browser'); assertMethodHandleLedger(ledger, {phase: 'initial'});
    for (const flag of ['phaseCComplete', 'jvm003Complete', 'fullSourceUnitConformanceProven', 'fullApiConformanceProven',
      'generalBootstrapConformanceProven', 'varHandleExecutionConformanceProven', 'namedModuleRuntimeConformanceProven']) assert.equal(ledger[flag], false);
  }
});

test('pruned, duplicated, reordered or changed source contracts never define a smaller passing C1 gate', () => {
  for (const mutate of [groups => groups.pop(), groups => groups.reverse(), groups => groups[0].cases.pop(),
    groups => groups[0].cases.reverse(), groups => groups[0].cases.push(clone(groups[0].cases[0])),
    groups => groups[0].cases[0].trace.push('invented'), groups => groups[0].releases.pop(),
    groups => groups[0].driverClassNames.push('Fallback'), groups => groups[0].source = groups[1].source,
    groups => groups[0].generatedSources = [], groups => groups[0].cases[0].probes[0].ignoredSelector = true]) {
    const groups = clone(methodHandleGroups); mutate(groups);
    assert.throws(() => createMethodHandleLedger('browser', groups));
  }
});

test('ledger inventory rejects removed/reordered releases, groups, cases or mandatory hosts', () => {
  for (const mutate of [ledger => ledger.results.pop(), ledger => ledger.results.reverse(),
    ledger => ledger.results[0].cases.pop(), ledger => ledger.results[0].executions.pop(),
    ledger => ledger.results[0].executions.reverse(), ledger => ledger.results[0].release = 25,
    ledger => ledger.caseCount--, ledger => ledger.requiredHosts.pop(), ledger => ledger.requiredReleases.pop(),
    ledger => ledger.requestedMode = 'native-only', ledger => ledger.phaseCComplete = true,
    ledger => ledger.fullApiConformanceProven = true]) {
    const ledger = createMethodHandleLedger(); mutate(ledger); assert.throws(() => assertMethodHandleLedger(ledger));
  }
});

test('fresh attempts cannot import stale compiler/host success or pretend a terminal gate', () => {
  for (const mutate of [ledger => ledger.status = 'passed', ledger => ledger.results[0].status = 'passed',
    ledger => ledger.results[0].operations.push({result: raw(methodHandleGroups[0])}),
    ledger => ledger.results[0].executions[0].result = raw(methodHandleGroups[0]),
    ledger => ledger.results[0].executions[0].outcomes = []]) {
    const ledger = createMethodHandleLedger(); mutate(ledger);
    assert.throws(() => assertMethodHandleLedger(ledger, {phase: 'initial'}));
  }
  const ledger = createMethodHandleLedger(); ledger.status = 'passed';
  assert.throws(() => assertMethodHandleLedger(ledger, {phase: 'terminal'}));
});

test('a failed group cannot retain a passing host after failed compilation or without original Code proof', () => {
  const ledger = createMethodHandleLedger('native-only'); ledger.status = 'failed';
  for (const record of ledger.results) record.status = 'failed';
  const record = ledger.results[0]; record.classpath = {directory: '/invented/classes'};
  record.classFiles = []; record.bytecodeProofs = [];
  record.executions[0] = {host: 'native', status: 'passed', result: raw(methodHandleGroups[0]),
    outcomes: methodHandleGroups[0].cases.map(({id, trace}) => ({id, trace}))};
  assert.throws(() => assertMethodHandleLedger(ledger, {phase: 'terminal'}), /Exactly one original javac attempt/);
});

test('C1 binds API contracts without reassigning indexed dependent JVMS/JLS owners or full units', () => {
  assert.equal(sourceIndex.units.filter(unit => unit.ownerPackageId === 'JVM-003').length, 0);
  const originals = new Map(sourceIndex.units.map(unit => [unit.id, unit]));
  for (const group of methodHandleGroups) for (const entry of methodHandleSourceUnits(group, sourceIndex)) {
    assert.equal(entry.apiOwnerPackageId, 'JVM-003'); assert.equal(entry.fullApiConformanceProven, false);
    assert.ok(entry.sourceUnits.length >= 2);
    for (const unit of entry.sourceUnits) {
      assert.equal(unit.ownerPackageId, originals.get(unit.id).ownerPackageId);
      assert.equal(unit.assessmentStatus, originals.get(unit.id).assessmentStatus);
      assert.equal(unit.url, originals.get(unit.id).url); assert.equal(unit.fullUnitConformanceProven, false);
    }
  }
  const index = clone(sourceIndex); index.units = [];
  assert.throws(() => methodHandleSourceUnits(methodHandleGroups[0], index));
});

test('exact independent case trace, end marker and clean raw process outcome are mandatory', () => {
  for (const group of methodHandleGroups) {
    assert.deepEqual(assertCoreResult(raw(group), group), group.cases.map(({id, trace}) => ({id, trace})));
    for (const mutate of [result => result.stdout = result.stdout.replace(group.cases[0].id, 'other-case'),
      result => result.stdout = result.stdout.replace(group.completionMarker, ''), result => result.stdout += 'extra\n',
      result => result.stdout = result.stdout.split('\n').reverse().join('\n'), result => result.stderr = 'warning\n',
      result => result.exitCode = 1, result => result.timedOut = true, result => result.signal = 'SIGKILL',
      result => result.outputLimitExceeded = true, result => result.error = 'incomplete']) {
      const result = raw(group); mutate(result); assert.throws(() => assertCoreResult(result, group));
    }
  }
});

function compilerReceipt() {
  const group = methodHandleGroups[0], prepared = {feature: 21, home: '/locked/jdk21'};
  const output = path.join(os.tmpdir(), 'c1-receipt-placeholder/release21/methodhandle-adaptation/classes');
  const empty = path.resolve(output, '..', '..', '..', 'empty-sourcepath');
  const arguments_ = ['--release', '21', '-encoding', 'UTF-8', '-proc:none', '-g', '-sourcepath', empty, '-classpath', empty,
    '-d', output, path.join(root, group.source)];
  const classFiles = group.driverClassNames.map(name => ({path: name.replaceAll('.', '/') + '.class', size: 100,
    sha256: 'a'.repeat(64), major: 65, minor: 0}));
  const operation = {kind: 'genuine-driver', command: '/locked/jdk21/bin/javac', arguments: arguments_,
    sourceDigests: [{path: path.join(root, group.source), sha256: sha(fs.readFileSync(path.join(root, group.source)))}],
    result: {command: ['/locked/jdk21/bin/javac', ...arguments_], cwd: path.dirname(output), timeoutMs: methodHandleTimeouts.compileMs,
      status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false, error: null, stdout: '', stderr: ''},
    outputEvidence: {directory: output, treeSha256: 'b'.repeat(64), files: classFiles.map(({path, size, sha256}) => ({path, size, sha256}))}};
  return {group, prepared, record: {release: 21, classFiles, operations: [operation], classpath: {directory: output,
    treeSha256: 'b'.repeat(64), genuineCompilerBytes: true, byteTransformations: false, fallbackClassFiles: false}}};
}

test('compiler receipts bind release, source hash, flags, raw argv/cwd/timeouts and exact output inventory', () => {
  const valid = compilerReceipt(); assertMethodHandleCompilation(valid.record, valid.group, valid.prepared);
  for (const mutate of [record => record.operations[0].arguments[1] = '8',
    record => record.operations[0].arguments.push('--enable-preview'), record => record.operations[0].command = '/other/javac',
    record => record.operations[0].result.command[0] = '/other/javac', record => record.operations[0].result.command[2] = '25',
    record => record.operations[0].result.cwd = '/other', record => record.operations[0].result.timeoutMs++,
    record => record.operations[0].sourceDigests[0].sha256 = 'c'.repeat(64), record => record.classFiles[0].major = 52,
    record => record.classFiles[0].minor = 65535, record => record.classFiles.push(clone(record.classFiles[0])),
    record => record.classpath.byteTransformations = true, record => record.classpath.fallbackClassFiles = true,
    record => record.operations[0].outputEvidence.files.pop(), record => record.operations[0].outputEvidence.treeSha256 = 'c'.repeat(64),
    record => record.operations[0].result.stdout = 'warning', record => record.operations[0].result.stderr = 'warning',
    record => record.operations[0].result.exitCode = 1, record => record.operations[0].result.timedOut = true,
    record => record.operations.push(clone(record.operations[0]))]) {
    const record = clone(valid.record); mutate(record); assert.throws(() => assertMethodHandleCompilation(record, valid.group, valid.prepared));
  }
});

test('raw host receipts cannot exchange guest/native mains, classpaths, flags or swallow Chromium errors', () => {
  const {record, group, prepared} = compilerReceipt(), output = record.classpath.directory;
  for (const host of methodHandleHosts) {
    const result = {...raw(group), command: host === 'native' ? ['/locked/jdk21/bin/java', '-Xverify:all', '-cp', output, group.mainClass] :
      host === 'node' ? [process.execPath, '--no-deprecation', path.join(root, 'build/release-cli/console/runner.js'), '-cp', output, group.mainClass] :
        ['chromium', 'Doppio.VM.CLI', '-cp', '/classes', group.mainClass],
    cwd: host === 'chromium' ? '/work' : path.dirname(output),
    timeoutMs: host === 'native' ? methodHandleTimeouts.nativeMs : methodHandleTimeouts.guestMs, browserErrors: []};
    const cell = {host, result}; assertMethodHandleExecution(cell, record, group, prepared);
    for (const mutate of [value => value.command[value.command.length - 1] = 'OtherMain', value => value.command[0] = 'other-host',
      value => value.cwd = '/other', value => value.timeoutMs++]) {
      const changed = clone(cell); mutate(changed.result); assert.throws(() => assertMethodHandleExecution(changed, record, group, prepared));
    }
    if (host === 'chromium') {cell.result.browserErrors.push('pageerror'); assert.throws(() => assertMethodHandleExecution(cell, record, group, prepared));}
  }
});

test('raw execution failure survives later integrity failure, with checkpoint before checking', async () => {
  const group = methodHandleGroups[0], cell = {host: 'node', status: 'not-run'}, result = {...raw(group), exitCode: 1, status: 'failed'};
  const saved = [];
  await assert.rejects(() => checkCoreExecution(cell, group, async () => result,
    () => {assert.ok(saved.some(snapshot => snapshot.result?.exitCode === 1)); throw new CoreIntegrityError('changed input');},
    () => saved.push(clone(cell))), CoreIntegrityError);
  assert.equal(cell.status, 'failed'); assert.deepEqual(cell.result, result);
});

test('retained provenance rejects substituted toolchains, runtime inventories and cross-wired browser hashes', () => {
  const lock = {toolchains: [{id: 'jdk21', treeSha256: '1'.repeat(64)}, {id: 'jdk25', treeSha256: '2'.repeat(64)}]};
  const marker = {toolchains: [21, 25].map(feature => ({id: `jdk${feature}`, feature, home: `/locked/jdk${feature}`,
    vendor: 'locked', version: `${feature}.0.0`, archiveSha256: '3'.repeat(64)}))};
  const files = [{path: 'console/runner.js', size: 10, sha256: '4'.repeat(64)}];
  const browserProvenance = {node: process.version, chromium: '123', playwright: '1.0',
    ...Object.fromEntries(['runtime', 'browserfs', 'bootstrap', 'chromiumExecutable', 'adapter'].map((key, index) =>
      [key, {path: `/locked/${key}`, sha256: String(index + 5).repeat(64)}]))};
  const browserIntegrity = {status: 'verified', runtimeSha256: browserProvenance.runtime.sha256,
    browserfsSha256: browserProvenance.browserfs.sha256, bootstrapSha256: browserProvenance.bootstrap.sha256,
    chromiumExecutableSha256: browserProvenance.chromiumExecutable.sha256, adapterSha256: browserProvenance.adapter.sha256};
  const valid = {requestedMode: 'browser', officialGate: true, node: {version: process.version, executable: process.execPath},
    toolchains: marker.toolchains.map(prepared => ({...prepared, treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256})),
    runtime: {files, entrypoint: path.join(root, 'build/release-cli/console/runner.js'), entrypointSha256: files[0].sha256,
      snapshotSha256: sha(JSON.stringify(files))}, browserProvenance, browserIntegrity,
    gitStart: {commit: 'a'.repeat(40), trackedDirty: false}, gitEnd: {commit: 'a'.repeat(40), trackedDirty: false}};
  assertMethodHandleProvenance(valid, marker, lock);
  for (const mutate of [ledger => ledger.toolchains[0].home = '/other', ledger => ledger.toolchains[0].vendor = 'other',
    ledger => ledger.toolchains[0].archiveSha256 = 'b'.repeat(64), ledger => ledger.toolchains[0].treeSha256 = 'b'.repeat(64),
    ledger => ledger.runtime.snapshotSha256 = 'b'.repeat(64), ledger => ledger.runtime.entrypointSha256 = 'b'.repeat(64),
    ledger => ledger.runtime.entrypoint = '/other', ledger => ledger.runtime.files[0].size++,
    ledger => ledger.browserIntegrity.bootstrapSha256 = 'b'.repeat(64), ledger => ledger.browserProvenance.adapter.sha256 = 'b'.repeat(64),
    ledger => ledger.gitEnd.commit = 'b'.repeat(40), ledger => ledger.node.version = 'other']) {
    const ledger = clone(valid); mutate(ledger); assert.throws(() => assertMethodHandleProvenance(ledger, marker, lock));
  }
});

test('raw javac failure is retained before post-compile integrity rejection', async () => {
  const operation = {}, result = {status: 'failed', exitCode: 2, stdout: '', stderr: 'compile failure'};
  const saved = [];
  await assert.rejects(() => checkCoreCompilation(operation, async () => result,
    () => {assert.ok(saved.some(snapshot => snapshot.result?.exitCode === 2)); throw new CoreIntegrityError('changed source');},
    () => saved.push(clone(operation))), CoreIntegrityError);
  assert.deepEqual(operation.result, result);
});

test('unused CP decoys never satisfy actual invokeExact owner/name/descriptor probes', () => {
  const className = 'Fixture', exact = {opcode: 'invokevirtual', tag: 10, owner: 'java.lang.invoke.MethodHandle', name: 'invokeExact', descriptor: '(J)J'};
  const group = {mainClass: className, cases: [{id: 'shape', entryMethod: 'caseShape', entryDescriptor: '()V', probes: [{method: 'caseShape',
    descriptor: '()V', requiredOpcodes: ['invokevirtual'], symbolicOperands: [exact]}]}]};
  const body = (name, descriptor, instructions) => ({name, descriptor, instructions, codeSha256: 'a'.repeat(64), codeLength: 4, maxStack: 3, maxLocals: 0, handlers: []});
  const call = (owner, name, descriptor, pc = 0) => ({name: 'invokevirtual', opcode: 182, pc, cp: {tag: 10, owner, name, descriptor}});
  const classes = new Map([[className, {file: {path: 'Fixture.class', sha256: 'b'.repeat(64)}, methods: new Map([
    ['main([Ljava/lang/String;)V', body('main', '([Ljava/lang/String;)V', [call(className, 'caseShape', '()V')])],
    ['caseShape()V', body('caseShape', '()V', [call(exact.owner, exact.name, '(I)I')])]
  ])}]]);
  assert.throws(() => proveCoreGroup(group, classes));
  classes.get(className).methods.get('caseShape()V').instructions[0].cp.descriptor = '(J)J';
  assert.equal(proveCoreGroup(group, classes)[0].probes[0].matches.at(-1).cp.descriptor, '(J)J');
  classes.get(className).methods.get('main([Ljava/lang/String;)V').instructions = [];
  assert.throws(() => proveCoreGroup(group, classes));
});

test('original compiler inventory captures all bytes and rejects linked or substituted outputs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-c1-output-test-'));
  try {
    fs.writeFileSync(path.join(directory, 'Driver.class'), Buffer.from([1, 2, 3]), {flag: 'wx'});
    const original = captureMethodHandleOutput(directory);
    assert.deepEqual(original.files.map(file => file.path), ['Driver.class']);
    fs.writeFileSync(path.join(directory, 'fallback.resource'), 'extra', {flag: 'wx'});
    assert.notDeepEqual(captureMethodHandleOutput(directory), original);
    fs.symlinkSync(path.join(directory, 'Driver.class'), path.join(directory, 'Linked.class'));
    assert.throws(() => captureMethodHandleOutput(directory));
  } finally {fs.rmSync(directory, {recursive: true, force: true});}
});

test('private atomic ledgers cannot overwrite official evidence with diagnostics or follow symlinks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-c1-ledger-test-'));
  try {
    const filename = path.join(directory, 'results.json'), ledger = createMethodHandleLedger();
    writeMethodHandleLedger(filename, ledger); assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    assert.throws(() => writeMethodHandleLedger(filename, createMethodHandleLedger('native-only')));
    fs.symlinkSync(filename, path.join(directory, 'link.json'));
    assert.throws(() => writeMethodHandleLedger(path.join(directory, 'link.json'), ledger));
    assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
  } finally {fs.rmSync(directory, {recursive: true, force: true});}
});

test('invalid/mixed CLI selectors reject before initial checkpoint and preserve prior official bytes', () => {
  assert.equal(parseMethodHandleMode(['--browser']), 'browser');
  assert.equal(parseMethodHandleMode(['--native-only']), 'native-only');
  assert.equal(parseMethodHandleMode(['--diagnostic']), 'diagnostic');
  for (const options of [[], ['--node-only'], ['--browser', '--case', 'selected'], ['--browser', '--native-only'],
    ['--native-only', '--release', '21'], ['--diagnostic', '--group', 'selected']])
    assert.throws(() => parseMethodHandleMode(options));
  const official = path.join(root, 'build/java-methodhandle-core-results.json');
  const original = fs.existsSync(official) ? fs.readFileSync(official) : null;
  const result = spawnSync(process.execPath, [path.join(root, 'ci/java_methodhandle_core_test.mjs'), '--browser', '--case', 'selected'],
    {cwd: root, encoding: 'utf8', timeout: 10_000});
  assert.equal(result.status, 1); assert.match(result.stderr, /Usage: node ci\/java_methodhandle_core_test/);
  if (original) assert.ok(fs.readFileSync(official).equals(original), 'Previous official ledger untouched');
  else assert.equal(fs.existsSync(official), false, 'No invalid-command official ledger created');
});

test('transitive source/input inventory includes genuine fixtures, independent decoder and host adapter', () => {
  const inputs = methodHandleInputPaths(); assert.equal(inputs.length, new Set(inputs).size);
  for (const relative of ['ci/java_methodhandle_core_test.mjs', 'ci/java_methodhandle_core_contract_test.mjs',
    'ci/java_core_bytecode.mjs', 'ci/java_compatibility_browser.mjs', 'ci/plan_spec_source_index.json',
    'ci/java_compatibility_toolchains.lock.json', '.github/workflows/modern-java.yml', 'package.json'])
    assert.ok(inputs.includes(path.join(root, relative)), 'Mandatory actual input ' + relative);
  for (const group of methodHandleGroups) for (const source of [group.source, ...(group.additionalSources || [])])
    assert.ok(inputs.includes(path.join(root, source)), 'Original compiler source ' + source);
  assert.ok(inputs.includes(process.execPath)); assert.deepEqual(methodHandleReleases, [21, 25]);
});
