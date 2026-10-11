import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import conversionGroups from './methodhandle_core_conversion_cases.mjs';
import referenceGroups from './methodhandle_core_reference_cases.mjs';
import {coreOpcodeNames, inspectCoreClasses, proveCoreGroup} from './java_core_bytecode.mjs';
import {assertCoreCompilerSources, assertCoreResult, checkCoreCompilation, checkCoreExecution,
  CoreIntegrityError} from './java_core_semantics_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';

const harnessPath = fileURLToPath(import.meta.url), repoRoot = path.resolve(path.dirname(harnessPath), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
export const methodHandleScope = 'JVM-003 C1 selected Lookup, direct handles, invocation, adaptation and combinators';
export const methodHandleGroups = freeze([...conversionGroups, ...referenceGroups]);
export const methodHandleReleases = Object.freeze([21, 25]);
export const methodHandleHosts = Object.freeze(['native', 'node', 'chromium']);
export const methodHandleTimeouts = Object.freeze({compileMs: 60_000, nativeMs: 30_000, guestMs: 60_000});
const modes = Object.freeze(['browser', 'native-only', 'diagnostic']);
const flags = Object.freeze(['phaseCComplete', 'jvm003Complete', 'fullSourceUnitConformanceProven',
  'fullApiConformanceProven', 'generalBootstrapConformanceProven', 'varHandleExecutionConformanceProven',
  'namedModuleRuntimeConformanceProven']);
// Independent literal inventory: deleting cases in an imported module is not a
// smaller passing gate. These are selected contracts, not full API coverage.
const inventory = freeze([
  {id: 'methodhandle-adaptation', ids: ['astype-same-identity', 'primitive-argument-widening-19',
    'primitive-return-widening-19', 'reference-argument-cast-timing', 'reference-return-cast-timing',
    'primitive-argument-boxing', 'primitive-return-boxing', 'wrapper-argument-unboxing', 'wrapper-return-unboxing',
    'null-unboxing-before-target', 'wrong-wrapper-before-target', 'reject-primitive-narrowing', 'reject-fixed-arity-change',
    'reject-boolean-numeric', 'discard-return-after-target', 'void-to-primitive-zero', 'void-to-reference-null',
    'unrelated-reference-null']},
  {id: 'methodhandle-invocation', ids: ['exact-mixed-wide-identity', 'exact-argument-mismatch-before-target',
    'exact-return-mismatch-before-target', 'exact-uncast-null-descriptor', 'invoke-as-type-equivalence',
    'target-throwable-identity', 'exact-invoker-descriptor', 'inexact-invoker-adaptation',
    'lookup-signature-polymorphic-invokers', 'reflective-invoker-placeholders']},
  {id: 'methodhandle-lookup', ids: ['lookup-authority', 'lookup-static-wide', 'lookup-virtual-dispatch',
    'lookup-interface-dispatch', 'lookup-special-nonvirtual', 'lookup-constructor-identity',
    'lookup-instance-reference-fields', 'lookup-instance-wide-fields', 'lookup-static-wide-fields',
    'lookup-private-nest-capability', 'lookup-private-lookup-in', 'lookup-package-access', 'lookup-protected-receiver',
    'lookup-unreflect-identity', 'lookup-creation-errors', 'lookup-null-receiver']},
  {id: 'methodhandle-combinators', ids: ['combinator-guard-select', 'combinator-guard-predicate-failure',
    'combinator-filter-argument-order', 'combinator-filter-argument-failure', 'combinator-filter-return-order',
    'combinator-fold-value-wide', 'combinator-fold-void-order', 'combinator-catch-match', 'combinator-catch-miss',
    'combinator-finally-success', 'combinator-finally-target-failure', 'combinator-finally-cleanup-failure',
    'combinator-permute-wide-duplicates', 'combinator-insert-bound-wide', 'combinator-drop-wide-slots',
    'combinator-factory-rejections']}
]);
const selectedHosts = mode => mode === 'native-only' ? ['native'] : mode === 'diagnostic' ? ['native', 'node'] : methodHandleHosts;
const records = () => methodHandleReleases.flatMap(release => methodHandleGroups.map(group => ({release, group})));
const sources = group => [group.source, ...(group.additionalSources || [])].map(relative => path.join(repoRoot, relative));
const integrity = check => { try { check(); } catch (error) { throw new CoreIntegrityError(error.message, {cause: error}); } };
const binaryName = value => typeof value === 'string' && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(value);

export function parseMethodHandleMode(options) {
  assert.ok(Array.isArray(options) && options.length === 1 && ['--browser', '--native-only', '--diagnostic'].includes(options[0]),
    'Usage: node ci/java_methodhandle_core_test.mjs --browser | --native-only | --diagnostic');
  return options[0] === '--browser' ? 'browser' : options[0] === '--native-only' ? 'native-only' : 'diagnostic';
}

export function validateMethodHandleGroups(groups = methodHandleGroups) {
  assert.deepEqual(groups.map(group => group.id), inventory.map(group => group.id), 'Exact four mandatory C1 groups');
  const allIds = new Set();
  for (const [n, group] of groups.entries()) {
    assert.deepEqual(group.cases.map(entry => entry.id), inventory[n].ids, 'Independent mandatory C1 case IDs');
    assert.deepEqual(group.releases, methodHandleReleases, 'Both final-profile releases');
    assert.match(group.source, /^classes\/modern_fixture\/MethodHandle[A-Za-z]+Final\.java$/);
    assert.match(group.mainClass, /^classes\.modern_test\.MethodHandle[A-Za-z]+Final$/);
    assert.match(group.completionMarker, /^METHODHANDLE_[A-Z_]+_OK$/);
    assert.ok(group.cases.length > 0, 'Nonempty C1 corpus');
    assert.ok(Array.isArray(group.driverClassNames) && group.driverClassNames.includes(group.mainClass) &&
      group.driverClassNames.every(binaryName) && new Set(group.driverClassNames).size === group.driverClassNames.length,
    'Exact genuine compiler class inventory');
    assert.ok(!group.generatedSources && !group.mutatePayload && !group.carrierSources && !group.compilationUnits,
      'No generated carrier, class transformations or fallback');
    const extra = group.additionalSources || [];
    assert.ok(Array.isArray(extra) && extra.every(source => /^classes\/modern_fixture\/methodhandle_lookup\/[A-Za-z0-9_]+\.java$/.test(source)),
      'Explicit bounded Lookup companion sources');
    assert.equal(new Set([group.source, ...extra]).size, 1 + extra.length, 'Unique compiler sources');
    for (const entry of group.cases) {
      assert.match(entry.id, /^[a-z][a-z0-9-]*$/); assert.ok(!allIds.has(entry.id), 'Unique C1 case ID'); allIds.add(entry.id);
      assert.match(entry.entryMethod, /^case[A-Za-z0-9]+$/); assert.equal(entry.entryDescriptor, '()V');
      assert.ok(Array.isArray(entry.trace) && entry.trace.length > 0 && entry.trace.every(event =>
        typeof event === 'string' && event.length > 0 && !/[\r\n]/.test(event)), 'Fixed ordered trace');
      assert.ok(['specification', 'pinned-native-regression'].includes(entry.oracleKind), 'Explicit bounded oracle classification');
      assert.ok(Array.isArray(entry.limitations) && entry.limitations.length > 0 && entry.limitations.every(value => typeof value === 'string' && value.length > 0),
        'Explicit selected-case limitations');
      assert.ok(Array.isArray(entry.primarySources) && entry.primarySources.length > 0 && entry.primarySources.every(url =>
        /^https:\/\/docs\.oracle\.com\/(?:en\/java\/javase\/(?:21|25)\/docs\/api\/java\.base\/java\/lang\/invoke\/|javase\/specs\/)/.test(url)),
      'Primary API/specification contract sources');
      assert.ok(entry.anchors && Object.keys(entry.anchors).length > 0 && Object.entries(entry.anchors).every(([spec, anchors]) =>
        ['JLS', 'JVMS'].includes(spec) && Array.isArray(anchors) && anchors.length > 0 && anchors.every(anchor => typeof anchor === 'string' && anchor.length > 0)),
      'Indexed dependent specification obligations');
      assert.ok(Array.isArray(entry.probes) && entry.probes.length > 0, 'Actual executable Code probes');
      for (const probe of entry.probes) {
        assert.ok(Object.keys(probe).every(key => ['className', 'method', 'descriptor', 'requiredOpcodes', 'symbolicOperands'].includes(key)),
          'No ignored C1 probe fields');
        assert.ok(typeof probe.method === 'string' && typeof probe.descriptor === 'string', 'Exact member signature');
        assert.ok(!probe.className || group.driverClassNames.includes(probe.className), 'Actual probe owner');
        assert.ok(Array.isArray(probe.requiredOpcodes) && probe.requiredOpcodes.length > 0 && probe.requiredOpcodes.every(opcode => coreOpcodeNames.includes(opcode)),
          'Nonempty known opcode obligations');
        if (probe.symbolicOperands !== undefined) {
          assert.ok(Array.isArray(probe.symbolicOperands) && probe.symbolicOperands.length > 0, 'Nonempty exact symbolic operands');
          for (const operand of probe.symbolicOperands) {
            const keys = operand.tag === 7 ? ['value'] : ['owner', 'name', 'descriptor'];
            assert.deepEqual(Object.keys(operand).sort(), ['opcode', 'tag', ...keys].sort(), 'Exact CP operand fields');
            assert.ok([7, 9, 10, 11].includes(operand.tag) && coreOpcodeNames.includes(operand.opcode) &&
              keys.every(key => typeof operand[key] === 'string' && operand[key].length > 0), 'Exact actual member/type operand');
          }
        }
      }
    }
    if (groups !== methodHandleGroups) assert.deepEqual(group, methodHandleGroups[n], 'No changed compiler/case contracts');
  }
  return allIds.size;
}

export function methodHandleSourceUnits(group, index) {
  const units = new Map(index.units.map(unit => [unit.id, unit]));
  return group.cases.map(entry => ({id: entry.id, apiOwnerPackageId: 'JVM-003', primarySources: entry.primarySources,
    fullApiConformanceProven: false, sourceUnits: methodHandleReleases.flatMap(release => Object.entries(entry.anchors)
      .flatMap(([spec, anchors]) => anchors.map(anchor => {
        const id = `${spec}-${release}:${spec.toLowerCase()}-${anchor}`, unit = units.get(id);
        assert.ok(unit, 'Existing indexed C1 dependent clause ' + id);
        return {id, url: unit.url, ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus,
          fullUnitConformanceProven: false};
      })))}));
}

export function createMethodHandleLedger(mode = 'browser', groups = methodHandleGroups) {
  assert.ok(modes.includes(mode), 'Known C1 execution mode');
  const ledger = {schemaVersion: 1, scope: methodHandleScope, requestedMode: mode, officialGate: mode === 'browser',
    status: 'running', startedAt: new Date().toISOString(), requiredReleases: [...methodHandleReleases], requiredHosts: [...methodHandleHosts],
    caseCount: validateMethodHandleGroups(groups), ...Object.fromEntries(flags.map(flag => [flag, false])),
    results: methodHandleReleases.flatMap(release => groups.map(group => ({release, group: group.id, status: 'not-run',
      cases: structuredClone(group.cases), driverClassNames: [...group.driverClassNames], operations: [],
      executions: methodHandleHosts.map(host => ({host, status: 'not-run', reason: 'awaiting genuine compilation'}))})))};
  assertMethodHandleLedger(ledger, {phase: 'initial'}); return ledger;
}

export function assertMethodHandleCompilation(record, group, prepared) {
  assert.equal(prepared.feature, record.release, 'Matching locked compiler edition');
  assert.equal(record.operations.length, 1, 'Exactly one original javac attempt');
  const operation = record.operations[0], output = record.classpath?.directory;
  assert.equal(operation.kind, 'genuine-driver');
  assert.ok(typeof output === 'string' && path.isAbsolute(output), 'Private original compiler destination');
  const empty = path.resolve(output, '..', '..', '..', 'empty-sourcepath');
  assert.equal(operation.command, path.join(prepared.home, 'bin/javac'), 'Original locked compiler command');
  assert.deepEqual(operation.arguments, ['--release', String(record.release), '-encoding', 'UTF-8', '-proc:none', '-g',
    '-sourcepath', empty, '-classpath', empty, '-d', output, ...sources(group)], 'Exact genuine no-fallback compiler recipe');
  assert.deepEqual(operation.sourceDigests, sources(group).map(filename => ({path: filename, sha256: sha(fs.readFileSync(filename))})),
    'Actual pre-javac compiler source hashes');
  const result = operation.result;
  assert.deepEqual(result?.command, [operation.command, ...operation.arguments], 'Raw compiler execution binds original recipe');
  assert.equal(result.cwd, path.dirname(output)); assert.equal(result.timeoutMs, methodHandleTimeouts.compileMs);
  assert.ok(result.status === 'passed' && result.exitCode === 0 && !result.error && !result.signal && !result.timedOut &&
    !result.outputLimitExceeded && result.stdout === '' && result.stderr === '', 'Raw clean compiler outcome');
  assert.deepEqual(record.classFiles?.map(file => file.path), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(),
    'Exact untouched javac class inventory');
  for (const file of record.classFiles) assert.ok(file.major === record.release + 44 && file.minor === 0 &&
    /^[a-f0-9]{64}$/.test(file.sha256) && Number.isInteger(file.size) && file.size > 8, 'Genuine version/hash evidence');
  assert.ok(record.classpath.genuineCompilerBytes === true && record.classpath.byteTransformations === false &&
    record.classpath.fallbackClassFiles === false, 'No transformed or fallback compiler bytes');
  assert.equal(operation.outputEvidence?.directory, output);
  assert.equal(operation.outputEvidence.treeSha256, record.classpath.treeSha256);
  assert.deepEqual(operation.outputEvidence.files, record.classFiles.map(({path, size, sha256}) => ({path, size, sha256})),
    'Exact per-attempt compiler output evidence');
}

export function assertMethodHandleProofs(record, group) {
  assert.deepEqual(record.bytecodeProofs?.map(proof => proof.id), group.cases.map(entry => entry.id), 'Every independent C1 case proof');
  for (const [n, proof] of record.bytecodeProofs.entries()) {
    const entry = group.cases[n]; assert.equal(proof.entry, `${group.mainClass}#${entry.entryMethod}${entry.entryDescriptor}`);
    assert.equal(proof.probes.length, entry.probes.length, 'Every actual Code obligation');
    for (const [p, decoded] of proof.probes.entries()) {
      const required = entry.probes[p], owner = required.className || group.mainClass;
      assert.equal(decoded.owner, owner); assert.equal(decoded.method, required.method); assert.equal(decoded.descriptor, required.descriptor);
      assert.deepEqual(decoded.classFile, record.classFiles.find(file => file.path === owner.replaceAll('.', '/') + '.class'));
      assert.match(decoded.codeSha256, /^[a-f0-9]{64}$/);
      for (const opcode of required.requiredOpcodes) assert.ok(decoded.matches.some(match => match.name === opcode || match.modifiedOpcode === opcode),
        'Required actual decoded opcode');
      for (const operand of required.symbolicOperands || []) assert.ok(decoded.matches.some(match => match.name === operand.opcode &&
        match.cp?.tag === operand.tag && (operand.tag === 7 ? match.cp.value === operand.value :
          ['owner', 'name', 'descriptor'].every(key => match.cp[key] === operand[key]))), 'Required exact invocation/type operand');
    }
    for (const flag of ['dynamicBranchCoverageProven', 'jitExecutionProven', 'fullSourceUnitConformanceProven'])
      assert.equal(proof[flag], false, 'Selected static proof never promotes full or dynamic coverage');
  }
}

export function assertMethodHandleExecution(cell, record, group, prepared) {
  const result = cell.result, output = record.classpath.directory;
  const command = cell.host === 'chromium' ? ['chromium', 'Doppio.VM.CLI', '-cp', '/classes', group.mainClass] :
    cell.host === 'native' ? [path.join(prepared.home, 'bin/java'), '-Xverify:all', '-cp', output, group.mainClass] :
      [process.execPath, '--no-deprecation', path.join(repoRoot, 'build/release-cli/console/runner.js'), '-cp', output, group.mainClass];
  assert.deepEqual(result?.command, command, 'Raw host execution binds this original classpath and main');
  assert.equal(result.cwd, cell.host === 'chromium' ? '/work' : path.dirname(output), 'Original host working directory');
  assert.equal(result.timeoutMs, cell.host === 'native' ? methodHandleTimeouts.nativeMs : methodHandleTimeouts.guestMs);
  if (cell.host === 'chromium') assert.deepEqual(result.browserErrors, [], 'No silent browser errors');
  return assertCoreResult(result, group, cell.host);
}

export function assertMethodHandleProvenance(ledger, marker, lock) {
  assert.deepEqual(ledger.toolchains, marker.toolchains.map(prepared => ({...prepared,
    treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256})), 'Exact original locked compiler metadata');
  assert.deepEqual(ledger.node, {version: process.version, executable: process.execPath}, 'Actual host Node identity');
  assert.match(ledger.gitStart?.commit, /^[a-f0-9]{40}$/); assert.equal(typeof ledger.gitStart.trackedDirty, 'boolean');
  assert.deepEqual(ledger.gitEnd, ledger.gitStart, 'Unchanged source state');
  if (ledger.requestedMode === 'native-only') {
    assert.equal(ledger.runtime, null); assert.equal(ledger.browserIntegrity, null); return;
  }
  const runtime = ledger.runtime;
  assert.ok(Array.isArray(runtime?.files) && runtime.files.length > 0, 'Complete original CLI runtime inventory');
  assert.equal(new Set(runtime.files.map(file => file.path)).size, runtime.files.length, 'Unique runtime input files');
  for (const file of runtime.files) assert.ok(typeof file.path === 'string' && file.path.length > 0 &&
    /^[a-f0-9]{64}$/.test(file.sha256) && Number.isInteger(file.size) && file.size > 0, 'Actual runtime file hashes/sizes');
  assert.equal(runtime.snapshotSha256, sha(JSON.stringify(runtime.files)), 'Runtime inventory binds its snapshot hash');
  assert.equal(runtime.entrypoint, path.join(repoRoot, 'build/release-cli/console/runner.js'), 'Actual CLI entrypoint path');
  assert.equal(runtime.entrypointSha256, runtime.files.find(file => file.path === 'console/runner.js')?.sha256, 'CLI entrypoint bound to runtime inventory');
  if (ledger.officialGate) {
    const provenance = ledger.browserProvenance, verified = ledger.browserIntegrity;
    assert.equal(verified?.status, 'verified', 'Complete browser integrity verification');
    for (const [key, source] of [['runtimeSha256', 'runtime'], ['browserfsSha256', 'browserfs'], ['bootstrapSha256', 'bootstrap'],
      ['chromiumExecutableSha256', 'chromiumExecutable'], ['adapterSha256', 'adapter']]) {
      assert.match(verified[key], /^[a-f0-9]{64}$/);
      assert.equal(verified[key], provenance?.[source]?.sha256, 'Original browser input binding: ' + source);
      assert.ok(typeof provenance[source].path === 'string' && path.isAbsolute(provenance[source].path), 'Actual browser input path');
    }
    assert.equal(provenance.node, process.version);
    assert.ok(typeof provenance.chromium === 'string' && typeof provenance.playwright === 'string', 'Actual browser versions');
  } else assert.equal(ledger.browserIntegrity, null, 'No browser proof for non-browser diagnostics');
}

export function assertMethodHandleLedger(ledger, {phase = 'inventory'} = {}) {
  assert.ok(['inventory', 'initial', 'terminal'].includes(phase));
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, methodHandleScope);
  assert.ok(modes.includes(ledger.requestedMode)); assert.equal(ledger.officialGate, ledger.requestedMode === 'browser');
  assert.deepEqual(ledger.requiredReleases, methodHandleReleases); assert.deepEqual(ledger.requiredHosts, methodHandleHosts);
  flags.forEach(flag => assert.equal(ledger[flag], false, 'C1 does not complete broad conformance: ' + flag));
  assert.equal(ledger.caseCount, validateMethodHandleGroups());
  const expected = records();
  assert.deepEqual(ledger.results.map(record => [record.release, record.group]), expected.map(({release, group}) => [release, group.id]),
    'Exact eight release/group records');
  const hosts = selectedHosts(ledger.requestedMode);
  if (phase === 'initial') assert.equal(ledger.status, 'running');
  if (phase === 'terminal') assert.ok(['passed', 'failed'].includes(ledger.status));
  for (const [n, record] of ledger.results.entries()) {
    const group = expected[n].group;
    assert.deepEqual(record.cases, group.cases); assert.deepEqual(record.driverClassNames, group.driverClassNames);
    assert.ok(['not-run', 'running', 'passed', 'failed'].includes(record.status)); assert.ok(Array.isArray(record.operations));
    assert.deepEqual(record.executions.map(cell => cell.host), methodHandleHosts, 'Every mandatory native/Node/Chromium cell');
    if (phase === 'initial') { assert.equal(record.status, 'not-run'); assert.deepEqual(record.operations, []); }
    let prepared;
    if (phase === 'terminal') {
      assert.ok(['passed', 'failed'].includes(record.status));
      // A failed group may contain genuine passing hosts. Those hosts still
      // require a successful original compile and the same independent proofs.
      if (record.status === 'passed' || record.executions.some(cell => cell.status === 'passed')) {
        const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
        prepared = marker.toolchains.find(item => item.feature === record.release);
        assertMethodHandleCompilation(record, group, prepared);
        assertMethodHandleProofs(record, group);
      }
    }
    for (const cell of record.executions) {
      assert.ok(['not-run', 'running', 'passed', 'failed'].includes(cell.status));
      if (phase === 'initial') { assert.equal(cell.status, 'not-run'); assert.ok(!Object.hasOwn(cell, 'result') && !Object.hasOwn(cell, 'outcomes')); }
      if (phase === 'terminal') {
        assert.notEqual(cell.status, 'running');
        if (!hosts.includes(cell.host)) { assert.equal(cell.status, 'not-run'); assert.ok(!cell.result && !cell.outcomes); }
        else if (record.status === 'passed') assert.equal(cell.status, 'passed');
        if (cell.status === 'passed') {
          if (!prepared) { const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
            prepared = marker.toolchains.find(item => item.feature === record.release); }
          assert.deepEqual(cell.outcomes, assertMethodHandleExecution(cell, record, group, prepared), 'Recomputed raw behavioral outcome');
        }
        if (cell.status === 'not-run') assert.ok(typeof cell.reason === 'string' && cell.reason.length > 0);
      }
    }
  }
  if (phase === 'terminal' && ledger.status === 'passed') {
    assert.ok(ledger.results.every(record => record.status === 'passed'), 'A passing gate hides no failed records');
    const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
    assert.deepEqual(ledger.sourceUnits, methodHandleGroups.map(group => ({group: group.id, cases: methodHandleSourceUnits(group, index)})),
      'Original source owners and selected API contracts');
    assert.equal(ledger.directlyOwnedSpecUnitCount, 0, 'No manufactured C-owned source clauses');
    assert.deepEqual(ledger.inputIntegrity, {unchanged: true, verifiedAtEnd: true});
    assert.deepEqual(ledger.proofIntegrity, {unchanged: true, verifiedAtEnd: true});
    assert.deepEqual(ledger.inputDigests, methodHandleInputPaths().map(filename => ({path: filename,
      size: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename))})), 'Actual unchanged transitive input hashes');
    const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'), lockBytes = fs.readFileSync(lockPath);
    const lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
    validateToolchains(marker, lock, sha(lockBytes), methodHandleReleases);
    assertMethodHandleProvenance(ledger, marker, lock);
    if (ledger.officialGate) { assertDerivationProvenance(ledger.gitStart, ledger.gitEnd);
      assert.equal(ledger.browserIntegrity?.status, 'verified'); assert.ok(ledger.browserProvenance?.chromiumExecutable?.sha256 ===
        ledger.browserIntegrity.chromiumExecutableSha256, 'Bound original Chromium executable'); }
    if (ledger.requestedMode === 'native-only') { assert.equal(ledger.runtime, null); assert.equal(ledger.browserIntegrity, null); }
    else assert.ok(ledger.runtime && /^[a-f0-9]{64}$/.test(ledger.runtime.snapshotSha256), 'Original CLI runtime evidence');
    assert.deepEqual(ledger.toolchains.map(toolchain => toolchain.feature), methodHandleReleases);
    const cells = ledger.results.flatMap(record => record.executions);
    assert.deepEqual(ledger.summary, {executionCells: 24, passed: cells.filter(cell => cell.status === 'passed').length,
      failed: cells.filter(cell => cell.status === 'failed').length, notRun: cells.filter(cell => cell.status === 'not-run').length},
    'Recomputed exact mandatory cell counts');
    if (ledger.officialGate) assert.equal(ledger.summary.notRun, 0, 'Every official host must execute');
  }
}

function localImportClosure(entrypoints) {
  const visited = new Set(), pending = [...entrypoints];
  while (pending.length) {
    const filename = path.resolve(pending.pop()); if (visited.has(filename)) continue;
    assert.ok(filename.startsWith(repoRoot + path.sep), 'Local transitive harness import'); visited.add(filename);
    for (const match of fs.readFileSync(filename, 'utf8').matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)) {
      const dependency = path.resolve(path.dirname(filename), match[1]); if (/\.(?:mjs|cjs|js)$/.test(dependency)) pending.push(dependency);
    }
  }
  return [...visited].sort();
}
export function methodHandleInputPaths() {
  return [...new Set([...localImportClosure([harnessPath, path.join(repoRoot, 'ci/java_methodhandle_core_contract_test.mjs')]),
    ...methodHandleGroups.flatMap(sources), ...['ci/plan_spec_source_index.json', 'ci/java_compatibility_toolchains.lock.json',
      'build/java-compatibility-toolchains/toolchains.json', 'package.json', 'yarn.lock', '.github/workflows/modern-java.yml']
      .map(relative => path.join(repoRoot, relative)), process.execPath])];
}
export function captureMethodHandleOutput(directory) {
  const files = [];
  const visit = location => {
    const stat = fs.lstatSync(location); assert.ok(!stat.isSymbolicLink(), 'No compiler output links');
    if (stat.isDirectory()) for (const name of fs.readdirSync(location)) visit(path.join(location, name));
    else { assert.ok(stat.isFile() && stat.nlink === 1, 'Regular singly linked original compiler output');
      files.push({path: path.relative(directory, location).split(path.sep).join('/'), size: stat.size, sha256: sha(fs.readFileSync(location))}); }
  };
  assert.ok(fs.lstatSync(directory).isDirectory()); visit(directory);
  return {directory, treeSha256: treeDigest(directory), files: files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)};
}
export function writeMethodHandleLedger(filename, ledger) {
  assert.equal(ledger.scope, methodHandleScope); assert.equal(ledger.schemaVersion, 1);
  fs.mkdirSync(path.dirname(filename), {recursive: true}); assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink());
  if (fs.existsSync(filename)) { const stat = fs.lstatSync(filename); assert.ok(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink());
    const previous = JSON.parse(fs.readFileSync(filename)); assert.equal(previous.scope, methodHandleScope);
    assert.equal(previous.officialGate, ledger.officialGate, 'Diagnostics never replace official C1 evidence'); }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600}); fs.renameSync(temporary, filename); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
async function provenance() {
  const read = async args => { const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10_000});
    assert.equal(result.status, 'passed'); return result.stdout.trim(); };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']), trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

export async function runMethodHandleCore(ledger, {checkpoint = () => {}} = {}) {
  assertMethodHandleLedger(ledger, {phase: 'initial'});
  const nativeOnly = ledger.requestedMode === 'native-only', browser = ledger.requestedMode === 'browser';
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes);
  const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
  validateToolchains(marker, lock, sha(lockBytes), methodHandleReleases);
  const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
  ledger.sourceUnits = methodHandleGroups.map(group => ({group: group.id, cases: methodHandleSourceUnits(group, index)}));
  ledger.directlyOwnedSpecUnitCount = index.units.filter(unit => unit.ownerPackageId === 'JVM-003').length;
  const inputPaths = methodHandleInputPaths(), inputs = () => inputPaths.map(filename => ({path: filename,
    size: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename))}));
  ledger.inputDigests = inputs(); ledger.node = {version: process.version, executable: process.execPath};
  ledger.gitStart = await provenance(); if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitStart);
  const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
    lock.toolchains.find(item => item.id === prepared.id).treeSha256, 'Immutable locked JDK ' + prepared.id));
  integrity(checkJdks); ledger.toolchains = marker.toolchains.map(prepared => ({...prepared,
    treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256}));
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
  ledger.runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-methodhandle-core-')); fs.chmodSync(temporary, 0o700);
  let session;
  const checkGlobal = () => integrity(() => { assert.deepEqual(inputs(), ledger.inputDigests);
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), ledger.runtime);
    if (session) session.verifyIntegrity();
    for (const record of ledger.results) for (const operation of record.operations) if (operation.outputEvidence) {
      assertCoreCompilerSources(operation.sourceDigests);
      assert.deepEqual(captureMethodHandleOutput(operation.outputEvidence.directory), operation.outputEvidence,
        'Earlier original javac attempts remain immutable');
    }
  });
  try {
    if (browser) { const {createBrowserSession} = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({repoRoot}); ledger.browserProvenance = session.provenance; }
    const empty = path.join(temporary, 'empty-sourcepath'); fs.mkdirSync(empty); checkpoint();
    for (const record of ledger.results) {
      const group = methodHandleGroups.find(group => group.id === record.group), prepared = marker.toolchains.find(item => item.feature === record.release);
      const directory = path.join(temporary, `release${record.release}`, group.id), output = path.join(directory, 'classes');
      fs.mkdirSync(output, {recursive: true}); record.status = 'running'; checkpoint();
      try {
        checkGlobal(); const sourceDigests = sources(group).map(filename => ({path: filename, sha256: sha(fs.readFileSync(filename))}));
        assertCoreCompilerSources(sourceDigests);
        const operation = {kind: 'genuine-driver', command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(record.release),
          '-encoding', 'UTF-8', '-proc:none', '-g', '-sourcepath', empty, '-classpath', empty, '-d', output, ...sources(group)], sourceDigests};
        record.operations.push(operation); checkpoint();
        try { await checkCoreCompilation(operation, () => runCommand(operation.command, operation.arguments,
          {cwd: directory, timeoutMs: methodHandleTimeouts.compileMs}), () => {checkGlobal(); assertCoreCompilerSources(sourceDigests);}, checkpoint); }
        finally { operation.outputEvidence = captureMethodHandleOutput(output); checkpoint(); }
        record.classFiles = inspectClassFiles(output, record.release, group.mainClass);
        record.classpath = {directory: output, treeSha256: treeDigest(output), genuineCompilerBytes: true, byteTransformations: false, fallbackClassFiles: false};
        assertMethodHandleCompilation(record, group, prepared);
        record.bytecodeProofs = proveCoreGroup(group, inspectCoreClasses(output, record.classFiles))
          .map(proof => ({...proof, fullSourceUnitConformanceProven: false}));
        assertMethodHandleProofs(record, group); checkpoint();
        const checkLocal = () => integrity(() => {
          assert.deepEqual(inspectClassFiles(output, record.release, group.mainClass), record.classFiles, 'Original classes unchanged');
          assert.deepEqual(proveCoreGroup(group, inspectCoreClasses(output, record.classFiles))
            .map(proof => ({...proof, fullSourceUnitConformanceProven: false})), record.bytecodeProofs, 'Actual Code proof replay');
        });
        for (const cell of record.executions) {
          if (!selectedHosts(ledger.requestedMode).includes(cell.host)) {cell.reason = 'Explicit diagnostic mode excludes this mandatory host'; checkpoint(); continue;}
          checkGlobal(); checkLocal();
          await checkCoreExecution(cell, group, () => cell.host === 'chromium' ? session.execute({classesPath: output,
            mainClass: group.mainClass, arguments: [], timeoutMs: methodHandleTimeouts.guestMs, standardInput: ''}) : runCommand(
            cell.host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(cell.host === 'native' ? ['-Xverify:all'] : ['--no-deprecation', runnerPath]), '-cp', output, group.mainClass],
            {cwd: directory, timeoutMs: cell.host === 'native' ? methodHandleTimeouts.nativeMs : methodHandleTimeouts.guestMs, standardInput: ''}),
          () => {checkGlobal(); checkLocal();}, checkpoint);
        }
        record.status = record.executions.filter(cell => selectedHosts(ledger.requestedMode).includes(cell.host))
          .every(cell => cell.status === 'passed') ? 'passed' : 'failed';
        console.log(`${record.status === 'passed' ? 'PASS' : 'FAIL'} methodhandle ${group.id} Java ${record.release}: ${group.cases.length} cases`);
      } catch (error) {
        record.status = 'failed'; record.error = error.stack || error.message;
        for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'Preparation failed: ' + error.message;
        checkpoint(); if (error instanceof CoreIntegrityError) throw error;
      }
      checkpoint();
    }
    checkGlobal(); integrity(checkJdks);
    for (const record of ledger.results) if (record.bytecodeProofs) {
      const group = methodHandleGroups.find(group => group.id === record.group);
      integrity(() => assert.deepEqual(proveCoreGroup(group, inspectCoreClasses(record.classpath.directory, record.classFiles))
        .map(proof => ({...proof, fullSourceUnitConformanceProven: false})), record.bytecodeProofs));
    }
    ledger.gitEnd = await provenance(); assert.deepEqual(ledger.gitEnd, ledger.gitStart);
    if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitEnd);
    ledger.browserIntegrity = session ? session.verifyIntegrity() : null;
    ledger.inputIntegrity = {unchanged: true, verifiedAtEnd: true}; ledger.proofIntegrity = {unchanged: true, verifiedAtEnd: true};
    ledger.status = ledger.results.every(record => record.status === 'passed') ? 'passed' : 'failed';
    ledger.summary = {executionCells: ledger.results.flatMap(record => record.executions).length,
      passed: ledger.results.flatMap(record => record.executions).filter(cell => cell.status === 'passed').length,
      failed: ledger.results.flatMap(record => record.executions).filter(cell => cell.status === 'failed').length,
      notRun: ledger.results.flatMap(record => record.executions).filter(cell => cell.status === 'not-run').length};
    assertMethodHandleLedger(ledger, {phase: 'terminal'}); return ledger;
  } finally { try {if (session) await session.close();} finally {fs.rmSync(temporary, {recursive: true, force: true});} }
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  // Reject filtered/ambiguous commands before any prior official evidence can
  // be touched, including an initial checkpoint with no executed host.
  const mode = parseMethodHandleMode(process.argv.slice(2));
  const ledger = createMethodHandleLedger(mode), filename = path.join(repoRoot, mode === 'browser' ? 'build/java-methodhandle-core-results.json' :
    `build/java-methodhandle-core-${mode}-results.json`);
  const checkpoint = () => writeMethodHandleLedger(filename, ledger); checkpoint();
  try {await runMethodHandleCore(ledger, {checkpoint}); if (ledger.status !== 'passed') process.exitCode = 1;
  } catch (error) { ledger.status = 'failed'; ledger.error = error.stack || error.message; process.exitCode = 1; console.error(ledger.error);
    for (const record of ledger.results) {if (['not-run', 'running'].includes(record.status)) record.status = 'failed';
      for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'Gate stopped: ' + error.message;}
  } finally {ledger.finishedAt = new Date().toISOString(); checkpoint();}
}
