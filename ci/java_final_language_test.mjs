import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import patterns from './java_final_patterns_cases.mjs';
import switchFlow from './java_final_switch_cases.mjs';
import constructors from './java_final_constructor_cases.mjs';
import resources from './java_final_resource_cases.mjs';
import launcher from './java_final_launcher_cases.mjs';
import {inspectFinalClasses, proveFinalGroup, validateFinalBootstrapSites} from './java_final_language_metadata.mjs';
import {coreOpcodeNames} from './java_core_bytecode.mjs';
import {assertCoreCompilerSources, assertCoreResult, checkCoreCompilation, checkCoreExecution, CoreIntegrityError} from './java_core_semantics_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';

const harnessPath = fileURLToPath(import.meta.url), repoRoot = path.resolve(path.dirname(harnessPath), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const finalLedgerScope = 'JVM-008 B8 selected final Java21/25 language and genuine Java25 startup boundaries';
export const finalGroups = freeze([patterns, switchFlow, constructors, resources, launcher]);
export const finalRequiredHosts = Object.freeze(['native', 'node', 'chromium']);
export const finalRequiredReleases = Object.freeze([21, 25]);
export const finalTimeouts = Object.freeze({compileMs: 60000, nativeMs: 30000, guestMs: 60000});
const modes = Object.freeze(['browser', 'native-only', 'diagnostic']);
const completionFlags = Object.freeze(['phaseBComplete', 'jvm008Complete', 'fullSourceUnitConformanceProven',
  'fullClassFileConformanceProven', 'generalBootstrapConformanceProven', 'generalInitializationConformanceProven',
  'namedModuleRuntimeConformanceProven']);
// Independent literal terminal inventory, not derived from imported case counts.
const inventory = freeze([
  {id: 'final-patterns', releases: [21, 25], ids: ['fp-selector-statement-throw', 'fp-selector-expression-throw',
    'fp-guard-statement-runtime', 'fp-guard-expression-error', 'fp-guard-statement-null-unbox', 'fp-guard-expression-null-unbox',
    'fp-boxed-false-restart', 'fp-type-mismatch-skips-guard', 'fp-instanceof-accessor-error', 'fp-switch-accessor-error',
    'fp-nested-accessor-error', 'fp-generic-explicit', 'fp-generic-nested-inferred', 'fp-erased-wildcard-mismatch',
    'fp-null-component-vs-null-record', 'fp-bounded-component-mismatch']},
  {id: 'final-switch-flow', releases: [21, 25], ids: ['fs-null-default-combined', 'fs-default-alone-null-rejection',
    'fs-colon-zero-record-fallthrough', 'fs-arrow-no-fallthrough', 'fs-colon-multiple-constants', 'fs-yield-normal-finally',
    'fs-yield-finally-throw', 'fs-yield-expression-throw', 'fs-nested-yield-target', 'fs-labeled-break-finally',
    'fs-labeled-continue-finally', 'fs-return-finally', 'fs-category2-yield', 'fs-reference-null-yield-identity']},
  {id: 'final-constructors', releases: [25], ids: ['fc-super-arg1-throw', 'fc-super-arg2-throw', 'fc-this-arg-throw',
    'fc-super-ctor-throw', 'fc-delegated-ctor-throw', 'fc-qualified-primary-order', 'fc-qualified-primary-throw',
    'fc-qualified-primary-null', 'fc-instance-initializer-throw', 'fc-prologue-cleanup-throw']},
  {id: 'final-resources', releases: [25], ids: ['fr-body-primary', 'fr-close-primary', 'fr-second-acquire-throw',
    'fr-null-resource', 'fr-extended-catch-finally', 'fr-first-acquire-throw']},
  {id: 'final-launcher', releases: [25], ids: ['fl-inherited-public-static-args', 'fl-inherited-protected-static-noargs',
    'fl-most-specific-interface-default', 'fl-class-instance-override', 'fl-abstract-static-no-constructor',
    'fl-initial-interface-abstract-failure', 'fl-class-initialization-failure', 'fl-instance-initialization-failure',
    'fl-nonvoid-args-fallback', 'fl-object-array-fallback', 'fl-two-args-fallback', 'fl-invalid-only-failure']}
]);
const records = () => finalRequiredReleases.flatMap(release => finalGroups.filter(group => group.releases.includes(release))
  .map(group => ({release, group})));
const selectedHosts = mode => mode === 'native-only' ? ['native'] : mode === 'diagnostic' ? ['native', 'node'] : finalRequiredHosts;
const binaryName = name => typeof name === 'string' && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(name);
const trace = value => Array.isArray(value) && value.every(event => typeof event === 'string' && event.length > 0 && !/[\r\n]/.test(event));
const keys = (value, expected, label) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), label);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), label);
};
const integrity = check => { try { check(); } catch (error) { throw new CoreIntegrityError(error.message, {cause: error}); } };

function validateDiagnosticStream(stream) {
  if (Array.isArray(stream)) { assert.deepEqual(stream, [], 'Empty diagnostics shorthand only'); return; }
  keys(stream, ['requiredPatterns', 'allowedPatterns'], 'Exact diagnostic stream contract');
  for (const key of ['requiredPatterns', 'allowedPatterns']) {
    assert.ok(Array.isArray(stream[key]) && stream[key].every(pattern => typeof pattern === 'string' &&
      pattern.startsWith('^') && pattern.endsWith('$') && !/[\r\n]/.test(pattern)), 'Source-fixed whole-line diagnostic patterns');
    stream[key].forEach(pattern => new RegExp(pattern));
  }
  assert.ok(stream.requiredPatterns.length === 0 || stream.allowedPatterns.length > 0, 'Required diagnostics must have an explicit allowed inventory');
}

export function validateFinalGroups(groups = finalGroups) {
  assert.ok(Array.isArray(groups) && groups.length > 0, 'Nonempty mandatory final-language groups');
  const groupIds = new Set(), caseIds = new Set();
  for (const group of groups) {
    assert.match(group.id, /^final-[a-z-]+$/); assert.ok(!groupIds.has(group.id), 'Unique final-language group'); groupIds.add(group.id);
    assert.match(group.source, /^classes\/modern_fixture\/JavaFinal[A-Za-z]+\.java$/);
    assert.match(group.mainClass, /^classes\.modern_test\.JavaFinal[A-Za-z]+$/);
    assert.ok(Array.isArray(group.releases) && group.releases.length > 0 &&
      group.releases.every(release => finalRequiredReleases.includes(release)) && new Set(group.releases).size === group.releases.length, 'Explicit final-language release inventory');
    assert.ok(Array.isArray(group.driverClassNames) && group.driverClassNames.length > 0 && group.driverClassNames.every(binaryName) &&
      new Set(group.driverClassNames).size === group.driverClassNames.length && group.driverClassNames.includes(group.mainClass), 'Exact genuine javac class inventory');
    assert.ok(!own(group, 'compilationUnits') && !own(group, 'mutatePayload'), 'No B8 carrier compilation or byte transformations');
    assert.ok(Array.isArray(group.cases) && group.cases.length > 0, 'Nonempty mandatory final-language cases');
    if (group.id === 'final-launcher') assert.equal(group.kind, 'genuine-vm-startup', 'Actual initial-class launch route');
    else assert.match(group.completionMarker, /^FINAL_[A-Z_]+_OK$/);
    for (const entry of group.cases) {
      assert.match(entry.id, /^[a-z][a-z0-9-]*$/); assert.ok(!caseIds.has(entry.id), 'Unique final-language case'); caseIds.add(entry.id);
      assert.ok(trace(entry.trace), 'Exact source-fixed ordered trace');
      assert.ok(['specification', 'pinned-native-regression'].includes(entry.oracleKind), 'Explicit bounded oracle classification');
      assert.ok(Array.isArray(entry.limitations) && entry.limitations.length > 0 && entry.limitations.every(value => typeof value === 'string' && value.length > 0), 'Explicit bounded limitations');
      assert.ok(entry.anchors && Object.keys(entry.anchors).length > 0 && Object.entries(entry.anchors).every(([spec, anchors]) =>
        ['JLS', 'JVMS'].includes(spec) && Array.isArray(anchors) && anchors.length > 0 && anchors.every(anchor => typeof anchor === 'string' && anchor.length > 0)), 'Actual indexed specification obligations');
      const abstractInterface = group.id === 'final-launcher' && entry.id === 'fl-initial-interface-abstract-failure';
      assert.ok(Array.isArray(entry.probes) && (entry.probes.length > 0 || abstractInterface), 'Nonempty actual Code probes except genuine abstract interface');
      for (const probe of entry.probes) {
        assert.ok(typeof probe.method === 'string' && typeof probe.descriptor === 'string', 'Exact actual member probe');
        assert.ok(!probe.className || group.driverClassNames.includes(probe.className), 'Actual probe declaration owner');
        assert.ok(Array.isArray(probe.requiredOpcodes) && probe.requiredOpcodes.length > 0 &&
          probe.requiredOpcodes.every(opcode => coreOpcodeNames.includes(opcode)), 'Known required final-language opcodes');
        const allowed = group.id === 'final-launcher' ? ['className', 'method', 'descriptor', 'requiredOpcodes', 'symbolicOperands'] :
          ['className', 'method', 'descriptor', 'requiredOpcodes', 'symbolicOperands', 'bootstrapSites'];
        assert.ok(Object.keys(probe).every(key => allowed.includes(key)), 'No unknown final-language probe selectors');
        if (own(probe, 'bootstrapSites')) {
          validateFinalBootstrapSites(probe.bootstrapSites);
          assert.ok(probe.requiredOpcodes.includes('invokedynamic'), 'Bootstrap obligations share the actual indy Code probe');
        }
      }
      if (group.id !== 'final-launcher') {
        assert.match(entry.entryMethod, /^case[A-Za-z0-9]+$/); assert.equal(entry.entryDescriptor, '()V');
        assert.ok(entry.trace.length > 0, 'Nonempty behavioral core-group trace');
        assert.equal(entry.oracleStatus ?? 'fixed', 'fixed', 'Fixed final-language oracle'); continue;
      }
      assert.ok(binaryName(entry.mainClass) && group.driverClassNames.includes(entry.mainClass) && entry.mainClass !== group.mainClass, 'Actual per-case initial class/interface, never outer wrapper');
      assert.ok(Array.isArray(entry.arguments) && entry.arguments.every(argument => typeof argument === 'string' && !argument.includes('\0')), 'Exact launcher program arguments');
      assert.ok(['success', 'failure'].includes(entry.outcome), 'Explicit startup outcome');
      assert.equal(entry.completionMarker, entry.outcome === 'success' ? 'FINAL_LAUNCHER_OK' : null, 'Success marker forbidden for failure');
      assert.ok(['fixed', 'pending-native-diagnostics'].includes(entry.oracleStatus), 'Native-first launcher diagnostics status');
      if (entry.oracleStatus === 'pending-native-diagnostics') {
        assert.equal(entry.outcome, 'failure'); assert.equal(entry.diagnosticsByHost, null, 'No invented pending diagnostics');
      } else {
        keys(entry.diagnosticsByHost, finalRequiredHosts, 'All source-fixed host diagnostics');
        for (const diagnostics of Object.values(entry.diagnosticsByHost)) {
          keys(diagnostics, ['stdout', 'stderr'], 'Explicit program/host stream separation');
          validateDiagnosticStream(diagnostics.stdout); validateDiagnosticStream(diagnostics.stderr);
          if (entry.outcome === 'success') assert.deepEqual(diagnostics, {stdout: [], stderr: []}, 'Successful startup has no host diagnostics');
          else assert.ok(!Array.isArray(diagnostics.stderr) && diagnostics.stderr.requiredPatterns.length > 0 ||
            !Array.isArray(diagnostics.stdout) && diagnostics.stdout.requiredPatterns.length > 0, 'Negative startup must witness a specific failure diagnostic');
        }
      }
      assert.ok(Array.isArray(entry.classProofs) && entry.classProofs.length > 0 &&
        new Set(entry.classProofs.map(proof => proof.className)).size === entry.classProofs.length &&
        entry.classProofs.some(proof => proof.className === entry.mainClass), 'Exact startup declaration proofs');
      for (const proof of entry.classProofs) {
        keys(proof, ['className', 'flags', 'superName', 'interfaceNames', 'declaredMainMethods', 'constructors', 'classInitializer'], 'Exact class/main/constructor/initializer proof selector');
        assert.ok(group.driverClassNames.includes(proof.className), 'Actual declared proof class');
        assert.ok(binaryName(proof.superName) && Array.isArray(proof.interfaceNames) && proof.interfaceNames.every(binaryName), 'Exact direct parents');
        const access = flags => { keys(flags, ['required', 'forbidden'], 'Exact access masks'); assert.ok(
          ['required', 'forbidden'].every(key => Number.isInteger(flags[key]) && flags[key] >= 0 && flags[key] <= 65535) &&
          (flags.required & flags.forbidden) === 0, 'Nonoverlapping access masks'); };
        access(proof.flags);
        const member = expected => {
          keys(expected, ['descriptor', 'flags', 'hasCode'], 'Exact actual member selector');
          assert.equal(typeof expected.descriptor, 'string'); assert.equal(typeof expected.hasCode, 'boolean'); access(expected.flags);
        };
        assert.ok(Array.isArray(proof.declaredMainMethods) && Array.isArray(proof.constructors), 'Exact declared member inventories');
        proof.declaredMainMethods.forEach(member); proof.constructors.forEach(member);
        if (proof.classInitializer !== null) { member(proof.classInitializer); assert.equal(proof.classInitializer.descriptor, '()V'); }
      }
      if (entry.launchSelection !== null) {
        keys(entry.launchSelection, ['declaringClass', 'descriptor', 'isStatic', 'constructor'], 'Exact launch declaration bindings');
        const selection = entry.launchSelection;
        assert.ok(entry.classProofs.some(proof => proof.className === selection.declaringClass), 'Actual selected main declaration');
        assert.ok(['()V', '([Ljava/lang/String;)V'].includes(selection.descriptor) && typeof selection.isStatic === 'boolean', 'Eligible main signature');
        if (selection.isStatic || abstractInterface) assert.equal(selection.constructor, null, 'No fabricated static/interface construction');
        else { keys(selection.constructor, ['className', 'descriptor'], 'Exact initial-class constructor binding');
          assert.equal(selection.constructor.className, entry.mainClass); assert.equal(selection.constructor.descriptor, '()V'); }
      } else assert.equal(entry.outcome, 'failure', 'No selected main is a genuine negative case');
    }
  }
  return caseIds.size;
}

export function assertFinalOracleReadiness(groups = finalGroups) {
  for (const group of groups) for (const entry of group.cases)
    assert.equal(entry.oracleStatus ?? 'fixed', 'fixed', 'Native-first diagnostics must be reviewed and source-fixed before execution: ' + entry.id);
}

export function finalSourceUnits(group, index) {
  const units = new Map(index.units.map(unit => [unit.id, unit]));
  return group.cases.map(entry => ({id: entry.id, sourceUnits: group.releases.flatMap(release =>
    Object.entries(entry.anchors).flatMap(([spec, anchors]) => anchors.map(anchor => {
      const id = `${spec}-${release}:${spec.toLowerCase()}-${anchor}`, unit = units.get(id);
      assert.ok(unit, 'Indexed final-language source anchor ' + id);
      return {id, url: unit.url, ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus, fullUnitConformanceProven: false};
    })))}));
}

export function createFinalLedger(mode = 'browser', groups = finalGroups) {
  assert.ok(modes.includes(mode), 'Known final-language mode'); assert.equal(validateFinalGroups(groups), 58, 'Exact 58 mandatory final-language cases');
  assert.deepEqual(groups.map(group => group.id), inventory.map(group => group.id), 'Exact five mandatory final-language groups');
  for (const [at, group] of groups.entries()) {
    assert.deepEqual(group.releases, inventory[at].releases, 'Independent group-specific release inventory');
    assert.deepEqual(group.cases.map(entry => entry.id), inventory[at].ids, 'Independent mandatory case IDs');
    assert.deepEqual(group, finalGroups[at], 'Exact source-fixed genuine corpus contracts');
  }
  const ledger = {schemaVersion: 1, scope: finalLedgerScope, status: 'running', requestedMode: mode, officialGate: mode === 'browser',
    ...Object.fromEntries(completionFlags.map(key => [key, false])), startedAt: new Date().toISOString(),
    requiredReleases: [...finalRequiredReleases], requiredHosts: [...finalRequiredHosts], caseCount: 58,
    releaseQualifiedCaseCount: 88, genuineCompilationCount: 7, executionCellCount: 21,
    results: records().map(({release, group}) => ({release, group: group.id, status: 'not-run', cases: structuredClone(group.cases),
      driverClassNames: [...group.driverClassNames], operations: [], executions: finalRequiredHosts.map(host => ({host, status: 'not-run', reason: 'awaiting genuine compilation',
        ...(group.id === 'final-launcher' ? {cases: group.cases.map(entry => ({id: entry.id, mainClass: entry.mainClass, arguments: [...entry.arguments],
          status: 'not-run', reason: 'awaiting actual VM startup'}))} : {})}))}))};
  assertFinalLedgerInventory(ledger, {phase: 'initial'}); return ledger;
}

export function assertFinalLedgerInventory(ledger, {phase = 'inventory'} = {}) {
  assert.ok(['initial', 'inventory', 'terminal'].includes(phase), 'Known final-language inventory phase');
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, finalLedgerScope); assert.ok(modes.includes(ledger.requestedMode));
  assert.equal(ledger.officialGate, ledger.requestedMode === 'browser'); completionFlags.forEach(key => assert.equal(ledger[key], false, 'Bounded evidence cannot promote completion'));
  assert.deepEqual(ledger.requiredReleases, finalRequiredReleases); assert.deepEqual(ledger.requiredHosts, finalRequiredHosts);
  assert.equal(ledger.caseCount, 58); assert.equal(ledger.releaseQualifiedCaseCount, 88); assert.equal(ledger.genuineCompilationCount, 7); assert.equal(ledger.executionCellCount, 21);
  assert.equal(validateFinalGroups(), 58);
  const expected = records(); assert.deepEqual(ledger.results.map(record => [record.release, record.group]), expected.map(({release, group}) => [release, group.id]), 'Exact seven release/group records');
  let lockedCompilers;
  if (phase === 'terminal' && ledger.results.some(record => record.status === 'passed')) {
    const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
    lockedCompilers = marker.toolchains;
  }
  const hosts = selectedHosts(ledger.requestedMode);
  if (phase === 'initial') assert.equal(ledger.status, 'running');
  if (phase === 'terminal') assert.ok(['passed', 'failed'].includes(ledger.status), 'Terminal overall final-language outcome');
  if (phase === 'terminal' && ledger.status === 'passed') {
    assert.ok(ledger.results.every(record => record.status === 'passed'), 'Passed overall gate cannot hide failed records');
    const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
    const sourceUnits = finalGroups.map(group => ({group: group.id, cases: finalSourceUnits(group, index)}));
    assert.deepEqual(ledger.sourceUnits, sourceUnits, 'Mandatory exact original source ownership evidence');
    const covered = new Set(sourceUnits.flatMap(group => group.cases.flatMap(entry => entry.sourceUnits.map(unit => unit.id))));
    assert.deepEqual(ledger.ownedSourceInventory, index.units.filter(unit => unit.ownerPackageId === 'JVM-008').map(unit => ({id: unit.id,
      url: unit.url, ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus,
      boundedCaseBindingPresent: covered.has(unit.id), fullUnitConformanceProven: false})), 'All original JVM-008 owners remain unassessed');
    assert.deepEqual(ledger.inputIntegrity, {unchanged: true, verifiedAtEnd: true}, 'Mandatory completed global input verification');
    assert.deepEqual(ledger.proofIntegrity, {unchanged: true, verifiedAtEnd: true}, 'Mandatory fresh original-byte proof replay');
    assert.ok(Array.isArray(ledger.inputDigests) && ledger.inputDigests.length > 0, 'Mandatory transitive input hashes');
    assert.deepEqual(ledger.inputDigests.map(input => input.path).sort(), finalInputPaths().sort(), 'Complete transitive harness and source input inventory');
    for (const input of ledger.inputDigests) assert.ok(Number.isInteger(input.size) && input.size > 0 && /^[a-f0-9]{64}$/.test(input.sha256), 'Actual input byte/hash evidence');
    assert.deepEqual(ledger.inputDigests, finalInputPaths().map(filename => ({path: filename, size: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename))})), 'Retained input hashes bind actual unchanged inputs');
    assert.ok(ledger.node?.executable === process.execPath && typeof ledger.node.version === 'string', 'Actual host Node provenance');
    assert.ok(ledger.gitStart && ledger.gitEnd, 'Mandatory start/end git provenance');
    assert.match(ledger.gitStart.commit, /^[a-f0-9]{40}$/); assert.deepEqual(ledger.gitEnd, ledger.gitStart, 'Unchanged gate source state');
    if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitEnd);
    assert.deepEqual(ledger.toolchains?.map(toolchain => toolchain.feature), finalRequiredReleases, 'Both original locked compiler homes');
    for (const toolchain of ledger.toolchains) assert.ok(/^[a-f0-9]{64}$/.test(toolchain.treeSha256) && /^[a-f0-9]{64}$/.test(toolchain.archiveSha256), 'Locked archive/tree provenance');
    if (ledger.requestedMode === 'native-only') { assert.equal(ledger.runtime, null); assert.equal(ledger.browserIntegrity, null); }
    else assert.ok(ledger.runtime && /^[a-f0-9]{64}$/.test(ledger.runtime.snapshotSha256) && Array.isArray(ledger.runtime.files) && ledger.runtime.files.length > 0, 'Actual compiled runtime provenance');
    if (ledger.officialGate) {
      assert.equal(ledger.browserIntegrity?.status, 'verified', 'Mandatory browser integrity');
      for (const key of ['runtimeSha256', 'browserfsSha256', 'bootstrapSha256', 'chromiumExecutableSha256', 'adapterSha256'])
        assert.match(ledger.browserIntegrity[key], /^[a-f0-9]{64}$/);
      assert.ok(ledger.browserProvenance?.chromiumExecutable?.sha256 === ledger.browserIntegrity.chromiumExecutableSha256 &&
        ledger.browserProvenance?.adapter?.sha256 === ledger.browserIntegrity.adapterSha256, 'Actual browser executable/adapter bindings');
    }
  }
  for (const [at, record] of ledger.results.entries()) {
    const group = expected[at].group;
    assert.deepEqual(record.cases, group.cases, 'Exact fixed case contracts'); assert.deepEqual(record.driverClassNames, group.driverClassNames);
    assert.ok(['not-run', 'running', 'passed', 'failed'].includes(record.status)); assert.ok(Array.isArray(record.operations));
    assert.deepEqual(record.executions.map(cell => cell.host), finalRequiredHosts, 'Exact 21 mandatory host cells');
    if (phase === 'initial') { assert.equal(record.status, 'not-run'); assert.deepEqual(record.operations, []); }
    if (phase === 'terminal') assert.ok(['passed', 'failed'].includes(record.status), 'Terminal final-language record');
    if (phase === 'terminal' && record.status === 'passed') {
      assert.deepEqual(record.operations.map(operation => operation.kind), ['genuine-driver'], 'Exactly one genuine compiler attempt per record');
      const operation = record.operations[0], result = operation.result;
      const compiler = lockedCompilers.find(toolchain => toolchain.feature === record.release);
      assert.ok(compiler, 'Actual retained matching compiler home');
      assert.equal(operation.command, path.join(compiler.home, 'bin', 'javac'), 'Original locked compiler invocation');
      const source = path.join(repoRoot, group.source), output = record.classpath?.directory;
      assert.ok(typeof output === 'string' && path.isAbsolute(output), 'Original private compiler destination');
      assert.equal(operation.outputEvidence?.directory, output, 'Compiler receipt and original classpath destination');
      const empty = path.resolve(output, '..', '..', '..', 'empty-sourcepath');
      assert.deepEqual(operation.arguments, ['--release', String(record.release), '-encoding', 'UTF-8', '-proc:none', '-g',
        '-sourcepath', empty, '-classpath', empty, '-d', output, source], 'Exact genuine compiler edition/source/no-fallback recipe');
      assert.deepEqual(operation.sourceDigests, [{path: source, sha256: sha(fs.readFileSync(source))}], 'Original single-source compiler digest');
      assert.deepEqual(result?.command, [operation.command, ...operation.arguments], 'Raw subprocess executed the retained compiler recipe');
      assert.equal(result.cwd, path.dirname(output), 'Raw compiler working directory');
      assert.equal(result.timeoutMs, finalTimeouts.compileMs, 'Raw bounded compiler attempt');
      assert.ok(result && result.status === 'passed' && result.exitCode === 0 && !result.error && !result.signal && !result.timedOut && !result.outputLimitExceeded && result.stdout === '' && result.stderr === '', 'Raw clean compiler evidence');
      assert.deepEqual(record.classFiles?.map(file => file.path), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(), 'Exact original javac class inventory');
      for (const file of record.classFiles) assert.ok(/^[a-f0-9]{64}$/.test(file.sha256) && file.major === record.release + 44 && file.minor === 0 && Number.isInteger(file.size) && file.size > 8, 'Actual major/hash evidence');
      assert.ok(record.classpath?.genuineCompilerBytes === true && record.classpath.byteTransformations === false && record.classpath.fallbackClassFiles === false, 'Untransformed no-fallback classpath provenance');
      assert.ok(record.operations[0].outputEvidence && record.operations[0].outputEvidence.treeSha256 === record.classpath.treeSha256, 'Per-attempt original compiler output evidence');
      assert.deepEqual(record.operations[0].outputEvidence.files, record.classFiles.map(file => ({path: file.path, sha256: file.sha256, size: file.size})), 'Exact compiler attempt output inventory');
      assert.deepEqual(record.bytecodeProofs?.map(proof => proof.id), group.cases.map(entry => entry.id), 'Every independent case proof retained');
      for (const [n, proof] of record.bytecodeProofs.entries()) {
        assert.equal(proof.probes.length, group.cases[n].probes.length, 'All actual Code obligations retained');
        for (const [p, decoded] of proof.probes.entries()) {
          const required = group.cases[n].probes[p], owner = required.className || group.mainClass;
          assert.equal(decoded.owner, owner); assert.equal(decoded.method, required.method); assert.equal(decoded.descriptor, required.descriptor);
          assert.deepEqual(decoded.classFile, record.classFiles.find(file => file.path === owner.replaceAll('.', '/') + '.class'), 'Probe is bound to this original compiler class');
          assert.match(decoded.codeSha256, /^[a-f0-9]{64}$/); assert.ok(Array.isArray(decoded.matches), 'Actual decoded operand matches');
          for (const opcode of required.requiredOpcodes) assert.ok(decoded.matches.some(match => match.name === opcode || match.modifiedOpcode === opcode), 'Every actual requested decoded opcode');
          for (const operand of required.symbolicOperands || []) assert.ok(decoded.matches.some(match => match.name === operand.opcode &&
            match.cp?.tag === operand.tag && (operand.tag === 7 ? match.cp.value === operand.value : ['owner', 'name', 'descriptor'].every(key => match.cp[key] === operand[key]))), 'Every exact requested symbolic operand');
          if (required.bootstrapSites) {
            assert.equal(decoded.bootstrapSites?.length, required.bootstrapSites.length, 'All actual bootstrap matches');
            for (const [b, site] of decoded.bootstrapSites.entries()) {
              assert.deepEqual({siteName: site.siteName, siteDescriptor: site.siteDescriptor, bootstrap: site.bootstrap, arguments: site.arguments}, required.bootstrapSites[b], 'Actual exact bootstrap member and ordered labels');
              assert.match(site.attributeSha256, /^[a-f0-9]{64}$/); assert.ok(Number.isInteger(site.instructionPc) && site.instructionPc >= 0 &&
                ['cpIndex', 'cpOffset', 'bootstrapOffset', 'methodHandleIndex', 'methodHandleOffset', 'referenceIndex'].every(key => Number.isInteger(site[key]) && site[key] > 0), 'Actual selected bootstrap CP/attribute offsets');
            }
          }
        }
        if (group.id === 'final-launcher') { assert.equal(proof.classProofs.length, group.cases[n].classProofs.length);
          assert.equal(proof.actualLaunchTarget, group.cases[n].mainClass); assert.equal(proof.staticDeclarationBindingsProven, true);
          assert.deepEqual(proof.selection, group.cases[n].launchSelection); assert.equal(proof.generalInitializationConformanceProven, false);
          for (const [c, actual] of proof.classProofs.entries()) {
            const required = group.cases[n].classProofs[c]; assert.equal(actual.className, required.className);
            assert.deepEqual(actual.classFile, record.classFiles.find(file => file.path === actual.className.replaceAll('.', '/') + '.class'));
            assert.equal(actual.flags & required.flags.required, required.flags.required); assert.equal(actual.flags & required.flags.forbidden, 0);
            assert.equal(actual.superName, required.superName); assert.deepEqual(actual.interfaceNames, required.interfaceNames);
            for (const [name, wanted] of [['mains', required.declaredMainMethods], ['constructors', required.constructors], ['initializers', required.classInitializer ? [required.classInitializer] : []]]) {
              assert.deepEqual(actual[name].map(member => member.descriptor), wanted.map(member => member.descriptor), 'Exact declared member evidence');
              for (const [m, member] of actual[name].entries()) { assert.equal(member.hasCode, wanted[m].hasCode);
                assert.equal(member.flags & wanted[m].flags.required, wanted[m].flags.required); assert.equal(member.flags & wanted[m].flags.forbidden, 0);
                assert.ok(Number.isInteger(member.start) && Number.isInteger(member.end) && member.start < member.end, 'Actual original member offsets');
                if (member.hasCode) assert.match(member.codeSha256, /^[a-f0-9]{64}$/); }
            }
          }
        }
        for (const key of ['dynamicBranchCoverageProven', 'jitExecutionProven', 'fullSourceUnitConformanceProven']) assert.equal(proof[key], false, 'Static evidence never promotes whole or dynamic coverage');
      }
    }
    for (const cell of record.executions) {
      assert.ok(['not-run', 'running', 'passed', 'failed'].includes(cell.status));
      if (phase === 'initial') { assert.equal(cell.status, 'not-run'); assert.ok(!own(cell, 'result') && !own(cell, 'outcomes')); }
      if (group.id === 'final-launcher') {
        assert.deepEqual(cell.cases?.map(entry => [entry.id, entry.mainClass, entry.arguments]), group.cases.map(entry => [entry.id, entry.mainClass, entry.arguments]), 'Every actual startup is pre-registered inside its host cell');
        for (const startup of cell.cases) {
          assert.ok(['not-run', 'running', 'passed', 'failed'].includes(startup.status));
          if (phase === 'initial') { assert.equal(startup.status, 'not-run'); assert.ok(!own(startup, 'result') && !own(startup, 'outcome')); }
          if (phase === 'terminal') { assert.notEqual(startup.status, 'running'); if (startup.status === 'not-run') assert.ok(startup.reason, 'Explicit unexecuted startup disposition'); }
        }
      }
      if (phase === 'terminal') {
        assert.notEqual(cell.status, 'running');
        if (!hosts.includes(cell.host)) { assert.equal(cell.status, 'not-run', 'Excluded diagnostic host stays registered');
          if (cell.cases) assert.ok(cell.cases.every(entry => entry.status === 'not-run'), 'No fake excluded startup results'); }
        else if (record.status === 'passed') {
          assert.equal(cell.status, 'passed', 'Every selected host must pass');
          if (group.id === 'final-launcher') {
            for (const [n, startup] of cell.cases.entries()) { assert.equal(startup.status, 'passed');
              assert.deepEqual(startup.outcome, assertFinalLauncherResult(startup.result, group.cases[n], cell.host), 'Actual raw startup outcome required'); }
            assert.deepEqual(cell.outcomes, cell.cases.map(startup => startup.outcome));
          } else assert.deepEqual(cell.outcomes, assertCoreResult(cell.result, group), 'Actual raw group trace required');
        } else if (cell.status === 'not-run') assert.ok(cell.reason, 'Explicit host preparation failure disposition');
      }
    }
  }
  if (ledger.ownedSourceInventory) {
    assert.equal(ledger.ownedSourceInventory.length, 112, 'Complete unchanged JVM-008 source owner inventory');
    assert.equal(new Set(ledger.ownedSourceInventory.map(unit => unit.id)).size, 112);
    for (const unit of ledger.ownedSourceInventory) { assert.equal(unit.ownerPackageId, 'JVM-008');
      assert.equal(unit.assessmentStatus, 'unassessed'); assert.equal(unit.fullUnitConformanceProven, false); }
  }
}

function diagnosticLines(lines, stream, label) {
  validateDiagnosticStream(stream);
  if (Array.isArray(stream)) { assert.deepEqual(lines, [], label + ': unexpected diagnostics'); return; }
  const allowed = stream.allowedPatterns.map(pattern => new RegExp(pattern));
  assert.ok(lines.every(line => allowed.some(pattern => pattern.test(line))), label + ': unexpected diagnostic line');
  for (const pattern of stream.requiredPatterns) assert.ok(lines.some(line => new RegExp(pattern).test(line)), label + ': missing required diagnostic ' + pattern);
}
const outputLines = output => { assert.equal(typeof output, 'string'); const lines = output.replaceAll('\r\n', '\n').split('\n');
  if (lines.at(-1) === '') lines.pop(); return lines; };

export function assertFinalLauncherResult(result, entry, host) {
  assert.ok(finalRequiredHosts.includes(host), 'Known actual startup host'); assert.equal(entry.oracleStatus, 'fixed', 'Source-fixed startup oracle');
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal && Number.isInteger(result.exitCode), entry.id + ': incomplete startup');
  assert.ok(!/FORBIDDEN|AssertionError/.test(result.stdout + result.stderr), entry.id + ': forbidden constructor, main or completion ran');
  assert.equal(result.status, entry.outcome === 'success' ? 'passed' : 'failed', entry.id + ': actual process outcome');
  assert.equal(result.exitCode === 0, entry.outcome === 'success', entry.id + ': actual nonzero failure exit');
  const expected = entry.trace.map(event => entry.id + '=' + event), stdout = outputLines(result.stdout), stderr = outputLines(result.stderr);
  assert.deepEqual(stdout.slice(0, expected.length), expected, entry.id + ': exact program prefailure trace');
  if (entry.outcome === 'success') {
    assert.deepEqual(stdout, [...expected, entry.completionMarker], entry.id + ': exact selected main trace and marker'); assert.deepEqual(stderr, []);
  } else {
    assert.ok(!stdout.includes('FINAL_LAUNCHER_OK') && !stderr.includes('FINAL_LAUNCHER_OK'), entry.id + ': no success marker');
    diagnosticLines(stdout.slice(expected.length), entry.diagnosticsByHost[host].stdout, entry.id + ' stdout');
    diagnosticLines(stderr, entry.diagnosticsByHost[host].stderr, entry.id + ' stderr');
  }
  return {id: entry.id, mainClass: entry.mainClass, arguments: [...entry.arguments], outcome: entry.outcome, trace: [...entry.trace], diagnosticsValidated: true};
}

export async function checkFinalLauncherExecution(startup, entry, host, execute, verifyIntegrity, checkpoint = () => {}) {
  startup.status = 'running'; delete startup.reason; checkpoint();
  try {
    startup.result = await execute(); checkpoint(); // Raw error/timeout survives post-run integrity and oracle rejection.
    await verifyIntegrity(); startup.outcome = assertFinalLauncherResult(startup.result, entry, host); startup.status = 'passed';
  } catch (error) {
    startup.status = 'failed'; startup.error = error.stack || error.message;
    if (error instanceof CoreIntegrityError) { checkpoint(); throw error; }
  }
  checkpoint(); return startup.status;
}

export function assertFinalClasspath(group, directory, files) {
  assert.deepEqual(files.map(file => file.path).sort(), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(), 'Exact genuine final-language class inventory');
  const expected = files.map(file => ({path: file.path, sha256: file.sha256, size: file.size})).sort((a, b) => a.path.localeCompare(b.path)), actual = [];
  const visit = location => {
    const stat = fs.lstatSync(location); assert.ok(!stat.isSymbolicLink(), 'No linked final-language classpath input');
    if (stat.isDirectory()) for (const name of fs.readdirSync(location)) visit(path.join(location, name));
    else { assert.ok(stat.isFile() && stat.nlink === 1, 'Regular singly linked compiler output');
      actual.push({path: path.relative(directory, location).split(path.sep).join('/'), sha256: sha(fs.readFileSync(location)), size: stat.size}); }
  };
  assert.ok(fs.lstatSync(directory).isDirectory(), 'Actual classpath directory'); visit(directory);
  assert.deepEqual(actual.sort((a, b) => a.path.localeCompare(b.path)), expected, 'No extra, missing, mutated, resource or fallback classpath bytes');
}

export function writeFinalLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, finalLedgerScope); assert.ok(['running', 'passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true}); assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'Regular ledger parent');
  if (fs.existsSync(filename)) { const stat = fs.lstatSync(filename); assert.ok(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink(), 'Regular unlinked ledger');
    const previous = JSON.parse(fs.readFileSync(filename)); assert.equal(previous.scope, finalLedgerScope);
    assert.equal(previous.officialGate, ledger.officialGate, 'Diagnostics never replace official final-language evidence'); }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600}); fs.renameSync(temporary, filename); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function localImportClosure(entrypoints) {
  const visited = new Set(), pending = [...entrypoints];
  while (pending.length) {
    const filename = path.resolve(pending.pop()); if (visited.has(filename)) continue;
    assert.ok(filename.startsWith(repoRoot + path.sep), 'Repository-local transitive harness import'); visited.add(filename);
    for (const match of fs.readFileSync(filename, 'utf8').matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)) {
      const dependency = path.resolve(path.dirname(filename), match[1]); if (/\.(?:mjs|cjs|js)$/.test(dependency)) pending.push(dependency);
    }
  }
  return [...visited].sort();
}
export function finalInputPaths() {
  const entrypoints = ['ci/java_final_language_test.mjs', 'ci/java_final_language_harness_contract_test.mjs', 'ci/java_final_language_metadata_contract_test.mjs'].map(relative => path.join(repoRoot, relative));
  return [...new Set([...localImportClosure(entrypoints), ...finalGroups.map(group => path.join(repoRoot, group.source)),
    ...['ci/plan_spec_source_index.json', 'package.json', 'yarn.lock', '.github/workflows/modern-java.yml', 'ci/java_compatibility_toolchains.lock.json',
      'build/java-compatibility-toolchains/toolchains.json'].map(relative => path.join(repoRoot, relative)), process.execPath])];
}
export function captureFinalCompilerOutput(directory) {
  const files = [];
  const visit = location => { const stat = fs.lstatSync(location); assert.ok(!stat.isSymbolicLink(), 'No compiler output symlink');
    if (stat.isDirectory()) for (const name of fs.readdirSync(location)) visit(path.join(location, name));
    else { assert.ok(stat.isFile() && stat.nlink === 1, 'Regular compiler output'); files.push({path: path.relative(directory, location).split(path.sep).join('/'), size: stat.size, sha256: sha(fs.readFileSync(location))}); } };
  visit(directory); return {directory, treeSha256: treeDigest(directory), files: files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)};
}
export function checkFinalPriorCompilations(compilations) {
  integrity(() => { for (const operation of compilations) { assertCoreCompilerSources(operation.sourceDigests);
    assert.deepEqual(captureFinalCompilerOutput(operation.outputEvidence.directory), operation.outputEvidence, 'Every earlier original compiler attempt tree remains immutable'); } });
}
async function provenance() {
  const read = async args => { const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10000});
    assert.equal(result.status, 'passed', 'Available repository provenance'); return result.stdout.trim(); };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']), trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

export async function runFinalLanguage(ledger, {checkpoint = () => {}} = {}) {
  assertFinalLedgerInventory(ledger, {phase: 'initial'}); assertFinalOracleReadiness(); // Before compiler/toolchain/runtime/browser I/O.
  const nativeOnly = ledger.requestedMode === 'native-only', browser = ledger.requestedMode === 'browser', hosts = selectedHosts(ledger.requestedMode);
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'), markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, sha(lockBytes), finalRequiredReleases);
  const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
  ledger.sourceUnits = finalGroups.map(group => ({group: group.id, cases: finalSourceUnits(group, index)}));
  const covered = new Set(ledger.sourceUnits.flatMap(group => group.cases.flatMap(entry => entry.sourceUnits.map(unit => unit.id))));
  ledger.ownedSourceInventory = index.units.filter(unit => unit.ownerPackageId === 'JVM-008').map(unit => ({id: unit.id, url: unit.url,
    ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus, boundedCaseBindingPresent: covered.has(unit.id), fullUnitConformanceProven: false}));
  assert.equal(ledger.ownedSourceInventory.length, 112); ledger.ownedSourceInventory.forEach(unit => assert.equal(unit.assessmentStatus, 'unassessed'));
  const inputPaths = finalInputPaths();
  const inputs = () => inputPaths.map(filename => ({path: filename, size: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename))}));
  ledger.inputDigests = inputs(); ledger.node = {executable: process.execPath, version: process.version}; ledger.gitStart = await provenance();
  if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitStart);
  const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
    lock.toolchains.find(item => item.id === prepared.id).treeSha256, 'Immutable locked JDK ' + prepared.id));
  integrity(checkJdks); ledger.toolchains = marker.toolchains.map(prepared => ({...prepared, treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256}));
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js'); ledger.runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-final-language-')); fs.chmodSync(temporaryRoot, 0o700);
  let session; const completedCompilations = [];
  const checkGlobal = () => integrity(() => { assert.deepEqual(inputs(), ledger.inputDigests, 'Immutable corpus and transitive harness inputs');
    checkFinalPriorCompilations(completedCompilations);
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), ledger.runtime, 'Immutable compiled CLI runtime'); if (session) session.verifyIntegrity(); });
  try {
    if (browser) { const {createBrowserSession} = await import('./java_compatibility_browser.mjs'); session = await createBrowserSession({repoRoot}); ledger.browserProvenance = session.provenance; }
    const empty = path.join(temporaryRoot, 'empty-sourcepath'); fs.mkdirSync(empty); checkpoint();
    for (const record of ledger.results) {
      const group = finalGroups.find(candidate => candidate.id === record.group), prepared = marker.toolchains.find(item => item.feature === record.release);
      const directory = path.join(temporaryRoot, 'release' + record.release, group.id), output = path.join(directory, 'classes');
      fs.mkdirSync(output, {recursive: true}); record.status = 'running'; checkpoint();
      try {
        checkGlobal(); const source = path.join(repoRoot, group.source), sourceDigests = [{path: source, sha256: sha(fs.readFileSync(source))}];
        const operation = {kind: 'genuine-driver', command: path.join(prepared.home, 'bin', 'javac'), arguments:
          ['--release', String(record.release), '-encoding', 'UTF-8', '-proc:none', '-g', '-sourcepath', empty, '-classpath', empty, '-d', output, source], sourceDigests};
        record.operations.push(operation); checkpoint();
        await checkCoreCompilation(operation, () => runCommand(operation.command, operation.arguments, {cwd: directory, timeoutMs: finalTimeouts.compileMs}),
          () => { try { operation.outputEvidence = captureFinalCompilerOutput(output); }
            catch (error) { operation.outputEvidence = {directory: output, status: 'rejected', error: error.message}; checkpoint(); throw new CoreIntegrityError(error.message, {cause: error}); }
            completedCompilations.push(operation); checkpoint();
            checkGlobal(); assertCoreCompilerSources(sourceDigests); }, checkpoint);
        record.classFiles = inspectClassFiles(output, record.release, group.mainClass); assertFinalClasspath(group, output, record.classFiles);
        record.classpath = {directory: output, treeSha256: treeDigest(output), genuineCompilerBytes: true, byteTransformations: false,
          fallbackClassFiles: false, invocationRoute: group.id === 'final-launcher' ? 'actual per-case VM initial class/interface' : 'genuine emitted driver main', namedModuleRuntimeConformanceProven: false};
        record.bytecodeProofs = proveFinalGroup(group, inspectFinalClasses(output, record.classFiles)); checkpoint();
        const checkLocal = () => integrity(() => { assertCoreCompilerSources(sourceDigests); assert.equal(treeDigest(output), record.classpath.treeSha256, 'Immutable original javac output tree');
          assert.deepEqual(inspectClassFiles(output, record.release, group.mainClass), record.classFiles, 'Immutable actual class major/hash inventory'); assertFinalClasspath(group, output, record.classFiles); });
        const execute = (host, mainClass, arguments_) => host === 'chromium' ? session.execute({classesPath: output, mainClass, arguments: arguments_, timeoutMs: finalTimeouts.guestMs, standardInput: ''}) :
          runCommand(host === 'native' ? path.join(prepared.home, 'bin', 'java') : process.execPath,
            [...(host === 'native' ? ['-Xverify:all'] : ['--no-deprecation', runnerPath]), '-cp', output, mainClass, ...arguments_],
            {cwd: directory, timeoutMs: host === 'native' ? finalTimeouts.nativeMs : finalTimeouts.guestMs, standardInput: ''});
        for (const cell of record.executions) {
          if (!hosts.includes(cell.host)) { cell.reason = 'explicit diagnostic mode excludes this mandatory host';
            for (const startup of cell.cases || []) startup.reason = cell.reason; checkpoint(); continue; }
          checkGlobal(); checkLocal();
          if (group.id !== 'final-launcher') await checkCoreExecution(cell, group, () => execute(cell.host, group.mainClass, []), () => { checkGlobal(); checkLocal(); }, checkpoint);
          else {
            cell.status = 'running'; delete cell.reason; checkpoint();
            for (const [at, startup] of cell.cases.entries()) { checkGlobal(); checkLocal();
              await checkFinalLauncherExecution(startup, group.cases[at], cell.host, () => execute(cell.host, startup.mainClass, startup.arguments),
                () => { checkGlobal(); checkLocal(); }, checkpoint); }
            cell.outcomes = cell.cases.filter(startup => startup.outcome).map(startup => startup.outcome);
            cell.status = cell.cases.every(startup => startup.status === 'passed') ? 'passed' : 'failed'; checkpoint();
          }
        }
        record.status = record.executions.filter(cell => hosts.includes(cell.host)).every(cell => cell.status === 'passed') ? 'passed' : 'failed';
        console.log(`${record.status === 'passed' ? 'PASS' : 'FAIL'} final ${group.id} Java ${record.release}: ${group.cases.length} cases on ${hosts.join(', ')}`);
      } catch (error) {
        record.status = 'failed'; record.error = error.stack || error.message;
        for (const cell of record.executions) {
          if (cell.status === 'running') { cell.status = 'failed'; cell.error = error.stack || error.message; }
          if (cell.status === 'not-run') cell.reason = 'group preparation stopped: ' + error.message;
          for (const startup of cell.cases || []) if (startup.status === 'not-run') startup.reason = 'group stopped: ' + error.message;
        }
        checkpoint(); if (error instanceof CoreIntegrityError) throw error;
      }
      checkpoint();
    }
    checkGlobal(); integrity(checkJdks); ledger.gitEnd = await provenance();
    if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitEnd); else assert.deepEqual(ledger.gitEnd, ledger.gitStart, 'Unchanged diagnostic source state');
    ledger.browserIntegrity = session ? session.verifyIntegrity() : null; ledger.inputIntegrity = {unchanged: true, verifiedAtEnd: true};
    // Re-read original unchanged emitted bytes, independently rebuilding every
    // retained Code/CP/bootstrap/header/member proof before private cleanup.
    integrity(() => { for (const record of ledger.results) if (record.bytecodeProofs) {
      const group = finalGroups.find(candidate => candidate.id === record.group);
      assert.deepEqual(proveFinalGroup(group, inspectFinalClasses(record.classpath.directory, record.classFiles)), record.bytecodeProofs,
        'Fresh original-byte proof replay binds every retained case/selector/hash');
    } });
    ledger.proofIntegrity = {unchanged: true, verifiedAtEnd: true};
    ledger.status = ledger.results.every(record => record.status === 'passed') ? 'passed' : 'failed'; assertFinalLedgerInventory(ledger, {phase: 'terminal'});
    const cells = ledger.results.flatMap(record => record.executions);
    ledger.summary = {executionCells: cells.length, passed: cells.filter(cell => cell.status === 'passed').length, failed: cells.filter(cell => cell.status === 'failed').length,
      notRun: cells.filter(cell => cell.status === 'not-run').length, compilerAttempts: ledger.results.reduce((sum, record) => sum + record.operations.length, 0),
      actualProgramExecutions: cells.reduce((sum, cell) => sum + (cell.cases ? cell.cases.filter(startup => startup.result).length : cell.result ? 1 : 0), 0)};
    if (ledger.officialGate && ledger.status === 'passed') { assert.equal(ledger.summary.notRun, 0); assert.equal(ledger.summary.compilerAttempts, 7); assert.equal(ledger.summary.actualProgramExecutions, 54); }
    return ledger;
  } finally { try { if (session) await session.close(); } finally { fs.rmSync(temporaryRoot, {recursive: true, force: true}); } }
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2), mode = options[0] === '--browser' ? 'browser' : options[0] === '--native-only' ? 'native-only' : 'diagnostic';
  const ledger = createFinalLedger(mode), filename = path.join(repoRoot, mode === 'browser' ? 'build/java-final-language-results.json' : `build/java-final-language-${mode}-results.json`);
  const checkpoint = () => writeFinalLedger(filename, ledger); checkpoint();
  try { assert.ok(options.length === 1 && ['--browser', '--native-only', '--diagnostic'].includes(options[0]),
    'Usage: node ci/java_final_language_test.mjs --browser | --native-only | --diagnostic');
    await runFinalLanguage(ledger, {checkpoint}); if (ledger.status !== 'passed') process.exitCode = 1;
  } catch (error) { ledger.status = 'failed'; ledger.error = error.stack || error.message; process.exitCode = 1; console.error(ledger.error);
    for (const record of ledger.results) { if (record.status === 'not-run' || record.status === 'running') record.status = 'failed';
      for (const cell of record.executions) { if (cell.status === 'running') cell.status = 'failed'; if (cell.status === 'not-run') cell.reason = 'gate stopped: ' + error.message;
        for (const startup of cell.cases || []) if (startup.status === 'not-run') startup.reason = 'gate stopped: ' + error.message; } }
  } finally { ledger.finishedAt = new Date().toISOString(); checkpoint(); }
}
