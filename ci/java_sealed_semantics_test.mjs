import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import reflection from './java_sealed_reflection_cases.mjs';
import loading from './java_sealed_loading_cases.mjs';
import metadata from './java_sealed_metadata_cases.mjs';
import {assertSealedMutationProvenance, inspectSealedClasses, proveSealedGroup, readSealedClass} from './java_sealed_metadata.mjs';
import {coreOpcodeNames, inspectCoreClasses} from './java_core_bytecode.mjs';
import {assertCoreResult, assertCoreCompilerSources, checkCoreCompilation, checkCoreExecution, CoreIntegrityError} from './java_core_semantics_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';

const harnessPath = fileURLToPath(import.meta.url), repoRoot = path.resolve(path.dirname(harnessPath), '..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
export const sealedLedgerScope = 'JVM-007 B7 selected sealed reflection, derivation, binary evolution and PermittedSubclasses boundaries';
export const sealedGroups = freeze([reflection, loading, metadata]);
export const sealedRequiredHosts = Object.freeze(['native', 'node', 'chromium']);
export const sealedRequiredReleases = Object.freeze([21, 25]);
export const sealedTimeouts = Object.freeze({compileMs: 60000, nativeMs: 30000, guestMs: 60000});
const modes = Object.freeze(['browser', 'native-only', 'diagnostic']);
const completionFlags = Object.freeze(['phaseBComplete', 'jvm007Complete', 'fullSourceUnitConformanceProven',
  'fullClassFileConformanceProven', 'generalBootstrapConformanceProven', 'generalInitializationConformanceProven',
  'namedModuleRuntimeConformanceProven']);
const pendingIds = Object.freeze(['sm-duplicate-entry', 'sm-array-entry', 'sm-old-major-opaque']);
const ownedAnchors = Object.freeze(['8.1.1.2', '8.1.6', '9.1.1.4', '9.1.4']);
const inventories = freeze([
  ['sealed-reflection', ['sf-class-list', 'sf-interface-list', 'sf-inferred-class', 'sf-inferred-interface',
    'sf-final-leaf', 'sf-open-leaf', 'sf-ordinary-class', 'sf-ordinary-interface', 'sf-primitive', 'sf-void',
    'sf-array', 'sf-record-final', 'sf-enum-final', 'sf-fresh-array', 'sf-mutation-isolation', 'sf-defining-identity',
    'sf-passive-metadata', 'sf-reflective-api', 'sf-interface-direct-only', 'sf-sealed-child']],
  ['sealed-loading', ['sl-class-control', 'sl-interface-control', 'sl-class-permitted', 'sl-interface-permitted',
    'sl-subinterface-permitted', 'sl-class-unlisted', 'sl-interface-unlisted', 'sl-subinterface-unlisted',
    'sl-class-loader-split', 'sl-interface-loader-split', 'sl-loader-delegation', 'sl-class-unseal-owner',
    'sl-interface-unseal-owner', 'sl-public-crosspackage-class', 'sl-public-crosspackage-interface',
    'sl-nonpublic-crosspackage-class', 'sl-nonpublic-crosspackage-interface', 'sl-nonpublic-samepackage-class',
    'sl-nonpublic-samepackage-interface', 'sl-foreign-parent-identity']],
  ['sealed-metadata', ['sm-empty-owner', 'sm-empty-reject-child', 'sm-final-with-permits', 'sm-duplicate-attribute',
    'sm-wrong-index-tag', 'sm-zero-index', 'sm-oob-index', 'sm-bad-length', 'sm-truncated-entries',
    'sm-extra-attribute-byte', 'sm-missing-child', 'sm-loader-cnfe', 'sm-loader-linkage-error',
    'sm-loader-assertion-error', 'sm-loader-runtime-exception', 'sm-loader-vme-retry', 'sm-invalid-child-code',
    'sm-unrelated-listed', 'sm-indirect-listed', 'sm-duplicate-entry', 'sm-array-entry', 'sm-old-major-opaque']]
]);
const compilationPlans = freeze(sealedGroups.map(group => group.compilationUnits ? group.compilationUnits() : []));
const binaryName = name => typeof name === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(name);
const safeRelative = filename => typeof filename === 'string' && !filename.includes('\\') && !filename.startsWith('/') &&
  filename.split('/').every(part => part.length > 0 && part !== '.' && part !== '..');
const integrity = check => { try { check(); } catch (error) { throw new CoreIntegrityError(error.message, {cause: error}); } };

export function sealedSourceUnits(group, index) {
  const units = new Map(index.units.map(unit => [unit.id, unit]));
  return group.cases.map(entry => {
    const sourceUnits = [];
    for (const release of sealedRequiredReleases) for (const [specification, anchors] of Object.entries(entry.anchors)) {
      assert.ok(['JLS', 'JVMS'].includes(specification), 'Known sealed source specification');
      for (const anchor of anchors) {
        const id = `${specification}-${release}:${specification.toLowerCase()}-${anchor}`, unit = units.get(id);
        assert.ok(unit, 'Indexed sealed source anchor ' + id);
        sourceUnits.push({id, url: unit.url, ownerPackageId: unit.ownerPackageId,
          assessmentStatus: unit.assessmentStatus, fullUnitConformanceProven: false});
      }
    }
    assert.ok(sourceUnits.some(unit => unit.ownerPackageId === 'JVM-007'), 'An actual JVM-007-owned bounded sealed slice');
    return {id: entry.id, sourceUnits};
  });
}

export function validateSealedGroups(groups = sealedGroups) {
  assert.ok(Array.isArray(groups) && groups.length > 0, 'Nonempty mandatory sealed groups');
  const groupIds = new Set(), caseIds = new Set();
  for (const group of groups) {
    assert.match(group.id, /^sealed-[a-z-]+$/); assert.ok(!groupIds.has(group.id), 'Unique mandatory sealed group'); groupIds.add(group.id);
    assert.match(group.source, /^classes\/modern_fixture\/JavaSealed[A-Za-z]+\.java$/);
    assert.match(group.mainClass, /^classes\.modern_test\.JavaSealed[A-Za-z]+$/);
    assert.match(group.completionMarker, /^SEALED_[A-Z_]+_OK$/);
    assert.ok(Array.isArray(group.driverClassNames) && group.driverClassNames.length > 0 &&
      group.driverClassNames.every(binaryName) && new Set(group.driverClassNames).size === group.driverClassNames.length &&
      group.driverClassNames.includes(group.mainClass), 'Exact nonempty genuine driver inventory');
    if (group.sealedClassNames) assert.ok(Array.isArray(group.sealedClassNames) &&
      group.sealedClassNames.every(name => group.driverClassNames.includes(name)) &&
      new Set(group.sealedClassNames).size === group.sealedClassNames.length, 'Unique raw driver permits inventory');
    const units = group.compilationUnits ? group.compilationUnits() : [];
    if (group.compilationUnits) assert.deepEqual(units, group.compilationUnits(), 'Deterministic genuine sealed compiler sources');
    assert.ok(Array.isArray(units), 'Genuine separate compiler units');
    const unitIds = new Set();
    for (const unit of units) {
      assert.match(unit.id, /^[a-z][a-z0-9-]*$/); assert.ok(!unitIds.has(unit.id), 'Unique genuine compilation unit'); unitIds.add(unit.id);
      assert.ok(['ordinary-classpath', 'named-module-source'].includes(unit.compilerMode), 'Known genuine compiler mode');
      assert.equal(typeof unit.driverClasspath, 'boolean');
      assert.ok(Array.isArray(unit.sources) && unit.sources.length > 0, 'Nonempty genuine source units');
      assert.ok(Array.isArray(unit.expectedClassNames) && unit.expectedClassNames.length > 0 &&
        new Set(unit.expectedClassNames).size === unit.expectedClassNames.length &&
        unit.expectedClassNames.every(name => binaryName(name) || name === 'module-info'), 'Exact genuine compilation class inventory');
      assert.equal(new Set(unit.sources.map(source => source.binaryName)).size, unit.sources.length, 'Unique compiler source identity');
      for (const source of unit.sources) {
        assert.ok(binaryName(source.binaryName) || source.binaryName === 'module-info', 'Actual source binary name');
        assert.ok(typeof source.text === 'string' && source.text.length > 0, 'Nonempty deterministic genuine source text');
      }
      if (unit.compilerMode === 'named-module-source') {
        assert.ok(typeof unit.moduleName === 'string' && unit.moduleName.length > 0, 'Explicit compilation-only module name');
        assert.equal(unit.driverClasspath, false, 'Named-module carrier compilation has no unnamed driver dependency');
        assert.ok(unit.sources.some(source => source.binaryName === 'module-info') && unit.expectedClassNames.includes('module-info'), 'Genuine explicit module-info compilation');
      } else assert.ok(!unit.sources.some(source => source.binaryName === 'module-info'), 'Ordinary unit does not silently acquire a module');
    }
    assert.ok(Array.isArray(group.cases) && group.cases.length > 0, 'Nonempty mandatory sealed cases');
    const payloadIds = new Set(), resources = new Set();
    for (const entry of group.cases) {
      assert.match(entry.id, /^[a-z][a-z0-9-]*$/); assert.ok(!caseIds.has(entry.id), 'Unique mandatory sealed case'); caseIds.add(entry.id);
      assert.match(entry.entryMethod, /^case[A-Za-z0-9]+$/); assert.equal(entry.entryDescriptor, '()V');
      assert.ok(['specification', 'pinned-native-regression'].includes(entry.oracleKind), 'Explicit bounded oracle classification');
      assert.ok(Array.isArray(entry.limitations) && entry.limitations.length > 0 && entry.limitations.every(value => typeof value === 'string' && value.length > 0), 'Explicit bounded oracle limitations');
      const oracleStatus = entry.oracleStatus ?? 'fixed';
      assert.ok(['fixed', 'pending-native-taxonomy'].includes(oracleStatus), 'Known fixed/pending oracle status');
      const validTrace = trace => Array.isArray(trace) && trace.length > 0 && trace.every(value => typeof value === 'string' && !/[\r\n]/.test(value));
      if (oracleStatus === 'pending-native-taxonomy') {
        assert.ok(pendingIds.includes(entry.id) && entry.oracleKind === 'pinned-native-regression', 'Only mandatory native-first taxonomy cases may be pending');
        assert.equal(entry.trace, null); assert.ok(!own(entry, 'tracesByRelease'), 'Pending taxonomy has no invented expectations');
      } else {
        assert.notEqual(own(entry, 'trace'), own(entry, 'tracesByRelease'), 'Exactly one source-fixed trace form');
        if (entry.tracesByRelease) {
          assert.deepEqual(Object.keys(entry.tracesByRelease).sort(), ['21', '25'], 'Exact reviewed edition-specific traces');
          assert.ok(sealedRequiredReleases.every(release => validTrace(entry.tracesByRelease[release])), 'Exact fixed edition traces');
        } else assert.ok(validTrace(entry.trace), 'Exact fixed sealed traces');
      }
      assert.ok(entry.anchors && Object.keys(entry.anchors).length > 0 && Object.values(entry.anchors).every(anchors => Array.isArray(anchors) && anchors.length > 0), 'Nonempty specification anchor obligations');
      assert.ok(Array.isArray(entry.probes) && entry.probes.length > 0, 'Nonempty executable sealed probes');
      for (const probe of entry.probes) {
        assert.equal(typeof probe.method, 'string'); assert.equal(typeof probe.descriptor, 'string');
        assert.ok(Array.isArray(probe.requiredOpcodes) && probe.requiredOpcodes.length > 0 && probe.requiredOpcodes.every(opcode => coreOpcodeNames.includes(opcode)), 'Known nonempty required sealed opcodes');
      }
      assert.ok(!entry.payloads || Array.isArray(entry.payloads), 'Exact selected resource payload bindings');
      for (const binding of entry.payloads || []) {
        assert.ok(typeof binding.id === 'string' && binding.id.startsWith(entry.id + ':') && !payloadIds.has(binding.id), 'Unique case-bound payload identity'); payloadIds.add(binding.id);
        assert.ok(binaryName(binding.binaryName) && unitIds.has(binding.compilationUnitId), 'Actual selected compiler unit and binary identity');
        assert.ok(units.find(unit => unit.id === binding.compilationUnitId).expectedClassNames.includes(binding.binaryName), 'Payload is an actual declared unit output');
        assert.ok(['primary', 'foreign'].includes(binding.loaderTree), 'Explicit bounded defining-loader tree');
        assert.ok(safeRelative(binding.resourcePath) && binding.resourcePath.endsWith('.bin') && !resources.has(binding.resourcePath), 'Unique resource-only payload route'); resources.add(binding.resourcePath);
        if (binding.mutation) assert.ok(typeof binding.mutation === 'string' && typeof group.mutatePayload === 'function', 'Explicit selected mutation function');
      }
      assert.ok(Array.isArray(entry.sealedProofs) && entry.sealedProofs.length > 0, 'Nonempty independent sealed metadata contracts');
      for (const proof of entry.sealedProofs) {
        assert.notEqual(own(proof, 'className'), own(proof, 'payloadId'), 'Exactly one class/variant proof selector');
        if (own(proof, 'className')) assert.ok(group.driverClassNames.includes(proof.className), 'Proof selects an actual driver declaration');
        else assert.ok((entry.payloads || []).some(binding => binding.id === proof.payloadId), 'Proof selects this case exact payload variant');
        assert.ok(['class', 'permitted-attribute', 'method-code'].includes(proof.kind), 'Known independent sealed proof kind');
        if (proof.kind === 'class' || proof.kind === 'permitted-attribute') {
          assert.ok(proof.flags && ['required', 'forbidden'].every(key => Number.isInteger(proof.flags[key]) && proof.flags[key] >= 0 && proof.flags[key] <= 0xffff), 'Explicit numeric access-flag masks');
          assert.ok(own(proof, 'superName') && (proof.superName === null || binaryName(proof.superName)), 'Exact direct superclass');
          assert.ok(Array.isArray(proof.interfaceNames) && proof.interfaceNames.every(binaryName), 'Exact direct interfaces');
        }
        if (proof.kind === 'class') {
          assert.ok(proof.permits === null || Array.isArray(proof.permits) && proof.permits.every(binaryName), 'Exact present/absent raw permits declaration');
          if (proof.passiveInitializer) {
            const target = proof.passiveInitializer;
            assert.ok(binaryName(target.owner) && typeof target.name === 'string' && ['()V', '(I)V'].includes(target.descriptor), 'Exact genuine initializer marker CP target');
            if (target.descriptor === '(I)V') assert.ok(Number.isInteger(target.argumentValue) && target.argumentValue >= -0x80000000 &&
              target.argumentValue <= 0x7fffffff, 'Explicit decoded integer marker argument');
            else assert.ok(!own(target, 'argumentValue'), 'Zero-argument marker does not invent an operand');
          }
        } else if (proof.kind === 'permitted-attribute') {
          assert.ok(Number.isInteger(proof.attributeCount) && proof.attributeCount >= 0 && Array.isArray(proof.attributes) && proof.attributes.length === proof.attributeCount, 'Exact raw permits attribute inventory');
          for (const attribute of proof.attributes) assert.ok(Number.isInteger(attribute.declaredLength) && attribute.declaredLength >= 0 &&
            (attribute.numberOfClasses === null || Number.isInteger(attribute.numberOfClasses) && attribute.numberOfClasses >= 0) &&
            Array.isArray(attribute.entries), 'Explicit bounded malformed/genuine attribute shape');
        } else assert.ok(typeof proof.name === 'string' && typeof proof.descriptor === 'string' && Array.isArray(proof.requiredOpcodes) &&
          proof.requiredOpcodes.length > 0 && proof.requiredOpcodes.every(opcode => coreOpcodeNames.includes(opcode)), 'Exact actual carrier method Code obligations');
      }
    }
  }
  return caseIds.size;
}

const effectiveCases = (group, release) => group.cases.map(entry => ({...structuredClone(entry),
  ...(entry.tracesByRelease ? {trace: structuredClone(entry.tracesByRelease[release])} : {})}));

export function assertSealedOracleReadiness(groups = sealedGroups) {
  for (const group of groups) for (const entry of group.cases)
    assert.notEqual(entry.oracleStatus, 'pending-native-taxonomy', 'Mandatory native taxonomy must be source-fixed before execution: ' + entry.id);
}

export function createSealedLedger(mode = 'browser', groups = sealedGroups) {
  assert.ok(modes.includes(mode), 'Known sealed execution mode');
  const caseCount = validateSealedGroups(groups);
  assert.deepEqual(groups.map(group => group.id), inventories.map(([id]) => id), 'Exact mandatory sealed-group inventory');
  for (const [index, group] of groups.entries()) {
    const original = sealedGroups[index];
    assert.deepEqual(group.cases.map(entry => entry.id), inventories[index][1], 'Exact mandatory sealed case IDs');
    assert.deepEqual(group.cases, original.cases, 'Exact mandatory sealed-case contracts');
    for (const property of ['driverClassNames', 'sealedClassNames']) assert.deepEqual(group[property], original[property], 'Exact mandatory driver declaration inventory');
    for (const property of ['source', 'mainClass', 'completionMarker', 'kind', 'compilationUnits', 'mutatePayload'])
      assert.equal(group[property], original[property], 'Exact mandatory genuine compiler inputs');
    assert.deepEqual(group.compilationUnits ? group.compilationUnits() : [], compilationPlans[index], 'Exact fixed compilation-unit inputs');
  }
  assert.equal(caseCount, 62, 'All mandatory sealed cases including native-first taxonomy');
  const ledger = {schemaVersion: 1, scope: sealedLedgerScope, status: 'running', requestedMode: mode,
    officialGate: mode === 'browser', ...Object.fromEntries(completionFlags.map(key => [key, false])),
    startedAt: new Date().toISOString(), requiredReleases: [...sealedRequiredReleases], requiredHosts: [...sealedRequiredHosts], caseCount,
    results: sealedRequiredReleases.flatMap(release => groups.map(group => ({release, group: group.id, status: 'not-run',
      cases: effectiveCases(group, release), driverClassNames: [...group.driverClassNames], operations: [],
      executions: sealedRequiredHosts.map(host => ({host, status: 'not-run', reason: 'awaiting compilation'}))})))};
  assertSealedLedgerInventory(ledger, {phase: 'initial'}); return ledger;
}

export function assertSealedLedgerInventory(ledger, {phase = 'inventory'} = {}) {
  assert.ok(['initial', 'inventory', 'terminal'].includes(phase), 'Known sealed inventory phase');
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, sealedLedgerScope);
  assert.ok(modes.includes(ledger.requestedMode), 'Known sealed execution mode');
  assert.equal(ledger.officialGate, ledger.requestedMode === 'browser', 'Official evidence agrees with mode');
  for (const key of completionFlags) assert.equal(ledger[key], false, 'Bounded sealed evidence cannot promote full assessments');
  assert.deepEqual(ledger.requiredReleases, sealedRequiredReleases); assert.deepEqual(ledger.requiredHosts, sealedRequiredHosts);
  assert.equal(ledger.caseCount, 62); assert.equal(validateSealedGroups(), 62);
  const expected = sealedRequiredReleases.flatMap(release => sealedGroups.map(group => ({release, group})));
  assert.ok(Array.isArray(ledger.results));
  assert.deepEqual(ledger.results.map(record => [record.release, record.group]), expected.map(record => [record.release, record.group.id]), 'Exact mandatory release/group inventory');
  const selected = ledger.requestedMode === 'native-only' ? ['native'] : ledger.requestedMode === 'diagnostic' ? ['native', 'node'] : sealedRequiredHosts;
  if (phase === 'initial') assert.equal(ledger.status, 'running');
  for (const [index, record] of ledger.results.entries()) {
    assert.deepEqual(record.cases, effectiveCases(expected[index].group, record.release), 'Exact source-fixed case contracts');
    assert.deepEqual(record.driverClassNames, expected[index].group.driverClassNames, 'Exact mandatory driver class inventory');
    assert.ok(Array.isArray(record.operations), 'Recorded compiler attempts');
    assert.deepEqual(record.executions.map(cell => cell.host), sealedRequiredHosts, 'Exact mandatory host cells');
    assert.ok(['not-run', 'running', 'passed', 'failed'].includes(record.status), 'Known group status');
    if (phase === 'initial') { assert.equal(record.status, 'not-run'); assert.equal(record.operations.length, 0); }
    if (phase === 'terminal') assert.ok(['passed', 'failed'].includes(record.status), 'Terminal mandatory group');
    if (phase === 'terminal' && record.status === 'passed') {
      const group = expected[index].group, units = compilationPlans[index % sealedGroups.length];
      assert.deepEqual(record.operations.map(operation => operation.kind), ['genuine-driver', ...units.map(unit => 'genuine-carriers:' + unit.id)], 'All genuine compiler attempts retained');
      for (const operation of record.operations) {
        assert.ok(operation.result && operation.result.status === 'passed' && operation.result.exitCode === 0 &&
          !operation.result.error && !operation.result.signal && !operation.result.timedOut && !operation.result.outputLimitExceeded &&
          operation.result.stdout === '' && operation.result.stderr === '', 'Raw clean successful compiler result required');
      }
      assert.deepEqual(record.classFiles?.map(file => file.path), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(), 'Complete actual driver evidence required');
      assert.deepEqual(record.compilations?.map(unit => unit.id), units.map(unit => unit.id), 'All separate genuine compilation trees retained');
      for (const tree of record.compilations) assert.ok(tree.genuineCompilerBytes === true && tree.runtimeClasspathEntry === false &&
        tree.namedModuleRuntimeConformanceProven === false, 'Compilation provenance cannot promote named-module runtime');
      const bindings = group.cases.flatMap(entry => entry.payloads || []);
      assert.deepEqual(record.payloads?.map(binding => [binding.id, binding.resourcePath, binding.binaryName, binding.compilationUnitId, binding.loaderTree]),
        bindings.map(binding => [binding.id, binding.resourcePath, binding.binaryName, binding.compilationUnitId, binding.loaderTree]), 'All exact variant-bound payload evidence required');
      assert.deepEqual(record.sealedProofs?.map(proof => proof.id), group.cases.map(entry => entry.id), 'Every case retains independent decoded proof evidence');
      for (const [at, proof] of record.sealedProofs.entries()) {
        assert.equal(proof.sealedProofs.length, group.cases[at].sealedProofs.length, 'All independent metadata obligations retained');
        assert.equal(proof.bytecode.probes.length, group.cases[at].probes.length, 'All independent decoded probes retained');
        for (const key of ['dynamicBranchCoverageProven', 'jitExecutionProven', 'fullSourceUnitConformanceProven', 'namedModuleRuntimeConformanceProven'])
          assert.equal(proof[key], false, 'Static evidence never promotes full or dynamic coverage');
      }
    }
    for (const cell of record.executions) {
      assert.ok(['not-run', 'running', 'passed', 'failed'].includes(cell.status), 'Known host status');
      if (phase === 'initial') { assert.equal(cell.status, 'not-run'); assert.ok(!own(cell, 'result') && !own(cell, 'outcomes'), 'No previous host evidence overwritten'); }
      if (phase === 'terminal') {
        assert.notEqual(cell.status, 'running', 'Terminal mandatory host');
        if (!selected.includes(cell.host)) assert.equal(cell.status, 'not-run', 'Excluded diagnostic hosts remain registered');
        else if (record.status === 'passed') {
          assert.equal(cell.status, 'passed', 'All selected mandatory hosts must pass');
          const outcomes = assertCoreResult(cell.result, {...expected[index].group, cases: record.cases});
          assert.deepEqual(cell.outcomes, outcomes, 'Actual exact raw host result and all outcomes required');
        }
      }
    }
  }
  if (ledger.ownedSourceInventory) {
    assert.deepEqual(ledger.ownedSourceInventory.map(unit => unit.id), sealedRequiredReleases.flatMap(release => ownedAnchors.map(anchor => `JLS-${release}:jls-${anchor}`)), 'Exact eight JVM-007 source owners');
    for (const unit of ledger.ownedSourceInventory) {
      assert.equal(unit.ownerPackageId, 'JVM-007'); assert.equal(unit.assessmentStatus, 'unassessed'); assert.equal(unit.fullUnitConformanceProven, false);
    }
  }
}

export function writeSealedLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, sealedLedgerScope);
  assert.ok(['running', 'passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'Regular sealed ledger parent');
  if (fs.existsSync(filename)) {
    const stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink(), 'Regular unlinked sealed ledger');
    const previous = JSON.parse(fs.readFileSync(filename));
    assert.equal(previous.scope, sealedLedgerScope); assert.equal(previous.officialGate, ledger.officialGate, 'Diagnostics never overwrite official sealed evidence');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600}); fs.renameSync(temporary, filename); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

export function assertSealedResourceClasspath(group, directory, drivers, payloads = []) {
  assert.deepEqual(drivers.map(file => file.path).sort(), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(), 'Exact complete genuine driver inventory');
  const bindings = group.cases.flatMap(entry => entry.payloads || []);
  assert.deepEqual(payloads.map(file => [file.id, file.resourcePath, file.binaryName, file.compilationUnitId, file.loaderTree]),
    bindings.map(binding => [binding.id, binding.resourcePath, binding.binaryName, binding.compilationUnitId, binding.loaderTree]), 'Exact mandatory payload variant and resource inventory');
  const expected = [...drivers.map(file => ({path: file.path, sha256: file.sha256, size: file.size})),
    ...payloads.map(file => ({path: file.resourcePath, sha256: file.sha256, size: file.size}))].sort((a, b) => a.path.localeCompare(b.path));
  const actual = [];
  const visit = location => {
    for (const name of fs.readdirSync(location)) {
      const filename = path.join(location, name), stat = fs.lstatSync(filename);
      assert.ok(!stat.isSymbolicLink(), 'No linked sealed runtime inputs');
      if (stat.isDirectory()) visit(filename);
      else {
        assert.ok(stat.isFile() && stat.nlink === 1, 'Regular unlinked sealed runtime input');
        actual.push({path: path.relative(directory, filename).split(path.sep).join('/'), sha256: digest(fs.readFileSync(filename)), size: stat.size});
      }
    }
  };
  assert.ok(!fs.lstatSync(directory).isSymbolicLink(), 'Regular runtime classpath root'); visit(directory);
  assert.deepEqual(actual.sort((a, b) => a.path.localeCompare(b.path)), expected, 'Exact resource-only classpath without missing, extra, changed or fallback inputs');
}

// Reuse only B5 transaction/decoding guards, never B5/B6 ledger constructors.
function localImportClosure(entrypoints) {
  const visited = new Set(), pending = [...entrypoints];
  while (pending.length) {
    const filename = path.resolve(pending.pop()); if (visited.has(filename)) continue;
    assert.ok(filename.startsWith(repoRoot + path.sep), 'Harness imports remain in this repository'); visited.add(filename);
    const source = fs.readFileSync(filename, 'utf8');
    for (const match of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)) {
      const dependency = path.resolve(path.dirname(filename), match[1]);
      if (/\.(?:mjs|cjs|js)$/.test(dependency)) pending.push(dependency);
    }
  }
  return [...visited].sort();
}

async function provenance() {
  const read = async args => {
    const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10000});
    assert.equal(result.status, 'passed', 'Available sealed repository provenance'); return result.stdout.trim();
  };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']), trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

export async function runSealedSemantics(ledger, {checkpoint = () => {}} = {}) {
  assertSealedLedgerInventory(ledger, {phase: 'initial'});
  assertSealedOracleReadiness(); // Before lock, compiler, browser or runtime I/O.
  const nativeOnly = ledger.requestedMode === 'native-only', browser = ledger.requestedMode === 'browser';
  const hosts = nativeOnly ? ['native'] : browser ? sealedRequiredHosts : ['native', 'node'];
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'), markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), sealedRequiredReleases);
  const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
  ledger.sourceUnits = sealedGroups.map(group => ({group: group.id, cases: sealedSourceUnits(group, index)}));
  const covered = new Set(ledger.sourceUnits.flatMap(group => group.cases.flatMap(entry => entry.sourceUnits.map(unit => unit.id))));
  ledger.ownedSourceInventory = sealedRequiredReleases.flatMap(release => ownedAnchors.map(anchor => {
    const id = `JLS-${release}:jls-${anchor}`, unit = index.units.find(candidate => candidate.id === id);
    assert.ok(unit && unit.ownerPackageId === 'JVM-007' && covered.has(id), 'Actual bounded slice for every JVM-007 source owner');
    assert.equal(unit.assessmentStatus, 'unassessed');
    return {id, url: unit.url, ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus, fullUnitConformanceProven: false};
  }));
  assert.equal(index.units.filter(unit => unit.ownerPackageId === 'JVM-007').length, 8, 'No omitted JVM-007 source owners');
  const entrypoints = ['ci/java_sealed_semantics_test.mjs', 'ci/java_sealed_semantics_contract_test.mjs'].map(relative => path.join(repoRoot, relative));
  const inputPaths = [...new Set([...localImportClosure(entrypoints), ...sealedGroups.map(group => path.join(repoRoot, group.source)),
    ...['ci/plan_spec_source_index.json', 'package.json', 'yarn.lock', '.github/workflows/modern-java.yml'].map(relative => path.join(repoRoot, relative)),
    lockPath, markerPath, process.execPath])];
  const inputs = () => inputPaths.map(filename => ({path: filename, size: fs.statSync(filename).size, sha256: digest(fs.readFileSync(filename))}));
  ledger.inputDigests = inputs(); ledger.node = {executable: process.execPath, version: process.version}; ledger.gitStart = await provenance();
  if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitStart);
  const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
    lock.toolchains.find(item => item.id === prepared.id).treeSha256, 'Immutable locked JDK ' + prepared.id));
  integrity(checkJdks);
  ledger.toolchains = marker.toolchains.map(prepared => ({...prepared, treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256}));
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
  ledger.runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-sealed-semantics-')); fs.chmodSync(temporaryRoot, 0o700);
  let session;
  const checkGlobal = () => integrity(() => {
    assert.deepEqual(inputs(), ledger.inputDigests, 'Immutable sealed corpus and transitive harness inputs');
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), ledger.runtime, 'Immutable compiled CLI runtime');
    if (session) session.verifyIntegrity();
  });
  try {
    if (browser) { const {createBrowserSession} = await import('./java_compatibility_browser.mjs'); session = await createBrowserSession({repoRoot}); ledger.browserProvenance = session.provenance; }
    checkpoint();
    const emptySourcepath = path.join(temporaryRoot, 'empty-sourcepath'); fs.mkdirSync(emptySourcepath);
    for (const record of ledger.results) {
      const group = sealedGroups.find(candidate => candidate.id === record.group), effectiveGroup = {...group, cases: record.cases};
      const prepared = marker.toolchains.find(item => item.feature === record.release);
      const directory = path.join(temporaryRoot, 'release' + record.release, group.id), output = path.join(directory, 'runtime');
      fs.mkdirSync(output, {recursive: true}); record.status = 'running'; checkpoint();
      try {
        checkGlobal();
        const sourceRecords = [{path: path.join(repoRoot, group.source), sha256: digest(fs.readFileSync(path.join(repoRoot, group.source)))}];
        const sourceDigests = sourceRecords.map(source => ({path: source.path, sha256: source.sha256})); record.sources = sourceRecords;
        record.compilations = []; record.payloads = [];
        const checkPreparedCompilations = () => integrity(() => {
          if (record.driverTreeSha256) {
            assert.equal(treeDigest(output), record.driverTreeSha256, 'Immutable genuine driver tree during carrier compilation');
            assert.deepEqual(inspectClassFiles(output, record.release, group.mainClass), record.classFiles, 'Immutable genuine driver bytes after every compiler attempt');
          }
          for (const tree of record.compilations) {
            assert.equal(treeDigest(tree.sourceDirectory), tree.sourceTreeSha256, 'Earlier generated source trees stay immutable');
            assert.equal(treeDigest(tree.directory), tree.treeSha256, 'Earlier genuine trees stay immutable after every compiler attempt');
            const main = tree.classFiles.find(file => file.path !== 'module-info.class').path.slice(0, -6).replaceAll('/', '.');
            assert.deepEqual(inspectClassFiles(tree.directory, record.release, main), tree.classFiles, 'Original separate carrier bytes and majors retained');
          }
        });
        const compile = async (sources, destination, kind, classpath = emptySourcepath, unit = null) => {
          fs.mkdirSync(destination, {recursive: true}); assertCoreCompilerSources(sourceDigests); checkPreparedCompilations();
          const sourceRoot = unit ? path.join(directory, 'sources', unit.id) : null;
          const sourceTreeSha256 = sourceRoot ? treeDigest(sourceRoot) : null;
          // javac's explicit named module requires its actual source root. It
          // contains only this unit's materialized, individually hashed inputs.
          const sourcepath = unit?.compilerMode === 'named-module-source' ? sourceRoot : emptySourcepath;
          const checkSourceTree = () => integrity(() => {
            if (sourceRoot) assert.equal(treeDigest(sourceRoot), sourceTreeSha256, 'Immutable exact generated source tree after every compiler attempt');
          });
          const operation = {kind, compilerMode: unit?.compilerMode ?? 'ordinary-classpath', moduleName: unit?.moduleName ?? null,
            sourceTreeSha256,
            command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(record.release), '-encoding', 'UTF-8', '-proc:none',
              '-g', '-classpath', classpath, '-sourcepath', sourcepath, '-d', destination, ...sources.map(source => source.path)], destination};
          record.operations.push(operation); checkpoint();
          await checkCoreCompilation(operation, () => runCommand(operation.command, operation.arguments, {cwd: directory, timeoutMs: sealedTimeouts.compileMs}),
            () => { checkGlobal(); assertCoreCompilerSources(sourceDigests); checkSourceTree(); checkPreparedCompilations(); }, checkpoint);
        };
        await compile(sourceRecords, output, 'genuine-driver');
        record.classFiles = inspectClassFiles(output, record.release, group.mainClass);
        assert.deepEqual(record.classFiles.map(file => file.path), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(),
          'Exact complete genuine driver inventory before resource materialization');
        record.driverTreeSha256 = treeDigest(output);
        const codeClasses = inspectCoreClasses(output, record.classFiles), metadataClasses = inspectSealedClasses(output, record.classFiles);
        for (const unit of group.compilationUnits ? group.compilationUnits() : []) {
          const sources = unit.sources.map(source => {
            const filename = path.join(directory, 'sources', unit.id, source.binaryName.replaceAll('.', '/') + '.java');
            fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, source.text, {flag: 'wx', mode: 0o600});
            const result = {...source, path: filename, sha256: digest(source.text)}; sourceDigests.push({path: filename, sha256: result.sha256}); return result;
          });
          const destination = path.join(directory, 'compilations', unit.id);
          await compile(sources, destination, 'genuine-carriers:' + unit.id, unit.driverClasspath ? output : emptySourcepath, unit);
          const main = unit.expectedClassNames.find(name => name !== 'module-info'), files = inspectClassFiles(destination, record.release, main);
          assert.deepEqual(files.map(file => file.path), unit.expectedClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(), 'Exact separately compiled genuine unit inventory');
          record.compilations.push({id: unit.id, compilerMode: unit.compilerMode, moduleName: unit.moduleName ?? null,
            directory: destination, sources, sourceDirectory: path.join(directory, 'sources', unit.id),
            sourceTreeSha256: treeDigest(path.join(directory, 'sources', unit.id)),
            classFiles: files, treeSha256: treeDigest(destination), genuineCompilerBytes: true,
            runtimeClasspathEntry: false, namedModuleRuntimeConformanceProven: false}); checkpoint();
        }
        for (const entry of group.cases) for (const binding of entry.payloads || []) {
          const tree = record.compilations.find(unit => unit.id === binding.compilationUnitId);
          assert.ok(tree, 'Actual selected genuine source tree');
          const relative = binding.binaryName.replaceAll('.', '/') + '.class', file = tree.classFiles.find(candidate => candidate.path === relative);
          assert.ok(file, 'Actual selected compiler class');
          const original = fs.readFileSync(path.join(tree.directory, relative)); assert.equal(digest(original), file.sha256);
          let bytes = original, mutationProof = null, mutation = null;
          if (binding.mutation) {
            mutation = group.mutatePayload(original, entry, binding);
            mutationProof = assertSealedMutationProvenance(original, mutation, entry, binding); bytes = mutation.bytes;
          }
          assert.equal(digest(original), file.sha256, 'Selected genuine compiler bytes remain immutable');
          const inspected = readSealedClass(bytes);
          assert.equal(inspected.name, binding.binaryName); assert.equal(inspected.major, entry.id === 'sm-old-major-opaque' && binding.mutation ? 60 : record.release + 44);
          assert.ok(!metadataClasses.has(binding.id), 'Unique actual payload metadata variant'); metadataClasses.set(binding.id, inspected);
          const filename = path.join(output, binding.resourcePath); fs.mkdirSync(path.dirname(filename), {recursive: true});
          fs.writeFileSync(filename, bytes, {flag: 'wx', mode: 0o600});
          record.payloads.push({...binding, size: bytes.length, sha256: digest(bytes), major: inspected.major,
            genuineCompilerBytes: !mutation, kind: mutation ? 'explicit-bounded-permits-or-code-mutation' : 'genuine-compiler-bytes',
            original: {...file, directory: tree.directory, compilationUnitId: tree.id}, edits: mutation?.edits || [],
            mutationProof, actualClassReference: inspected.classReference, actualSuperReference: inspected.superReference,
            actualInterfaceReferences: inspected.interfaceReferences, actualPermittedAttributes: inspected.permittedAttributes}); checkpoint();
        }
        record.sealedProofs = proveSealedGroup(effectiveGroup, metadataClasses, codeClasses);
        assertSealedResourceClasspath(group, output, record.classFiles, record.payloads);
        record.classpath = {directory: output, treeSha256: treeDigest(output), driverGenuineCompilerBytes: true,
          resourceOnlyPayloads: true, fallbackPayloadClassFiles: false,
          invocationRoute: group.id === 'sealed-reflection' ? 'genuine direct compiler Class API calls' : 'fixed manifest resource-only loader trees and exact Class identity checks',
          namedModuleRuntimeConformanceProven: false};
        const programArguments = group.id === 'sealed-reflection' ? [] : group.cases.map(entry => entry.id); record.programArguments = programArguments;
        const checkLocal = () => integrity(() => {
          assertCoreCompilerSources(sourceDigests);
          assert.equal(treeDigest(output), record.classpath.treeSha256, 'Immutable sealed runtime classpath');
          assert.deepEqual(inspectClassFiles(output, record.release, group.mainClass), record.classFiles, 'Immutable genuine driver bytes and majors');
          for (const tree of record.compilations) {
            assert.equal(treeDigest(tree.sourceDirectory), tree.sourceTreeSha256, 'Immutable exact separate compiler source inventory');
            assert.equal(treeDigest(tree.directory), tree.treeSha256, 'Immutable separate genuine compilation');
            const main = tree.classFiles.find(file => file.path !== 'module-info.class').path.slice(0, -6).replaceAll('/', '.');
            assert.deepEqual(inspectClassFiles(tree.directory, record.release, main), tree.classFiles, 'Immutable genuine carrier bytes and majors');
          }
          assertSealedResourceClasspath(group, output, record.classFiles, record.payloads);
        });
        for (const cell of record.executions) {
          if (!hosts.includes(cell.host)) { cell.reason = 'explicit diagnostic mode excludes this mandatory host'; checkpoint(); continue; }
          checkGlobal(); checkLocal();
          await checkCoreExecution(cell, effectiveGroup, () => cell.host === 'chromium' ? session.execute({classesPath: output,
            mainClass: group.mainClass, arguments: programArguments, timeoutMs: sealedTimeouts.guestMs, standardInput: ''}) : runCommand(
            cell.host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(cell.host === 'native' ? ['-Xverify:all'] : ['--no-deprecation', runnerPath]), '-cp', output, group.mainClass, ...programArguments],
            {cwd: directory, timeoutMs: cell.host === 'native' ? sealedTimeouts.nativeMs : sealedTimeouts.guestMs, standardInput: ''}),
          () => { checkGlobal(); checkLocal(); }, checkpoint);
        }
        record.status = record.executions.filter(cell => hosts.includes(cell.host)).every(cell => cell.status === 'passed') ? 'passed' : 'failed';
        console.log(`${record.status === 'passed' ? 'PASS' : 'FAIL'} sealed ${group.id} Java ${record.release}: ${group.cases.length} cases on ${hosts.join(', ')}`);
      } catch (error) {
        record.status = 'failed'; record.error = error.stack || error.message;
        for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'group preparation failed: ' + error.message;
        checkpoint(); if (error instanceof CoreIntegrityError) throw error;
      }
      checkpoint();
    }
    checkGlobal(); integrity(checkJdks); ledger.gitEnd = await provenance();
    if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitEnd);
    else assert.deepEqual(ledger.gitEnd, ledger.gitStart, 'Unchanged diagnostic source state');
    ledger.browserIntegrity = session ? session.verifyIntegrity() : null; ledger.inputIntegrity = {unchanged: true, verifiedAtEnd: true};
    assertSealedLedgerInventory(ledger, {phase: 'terminal'});
    ledger.status = ledger.results.every(record => record.status === 'passed') ? 'passed' : 'failed';
    const cells = ledger.results.flatMap(record => record.executions);
    ledger.summary = {executionCells: cells.length, passed: cells.filter(cell => cell.status === 'passed').length,
      failed: cells.filter(cell => cell.status === 'failed').length, notRun: cells.filter(cell => cell.status === 'not-run').length};
    if (ledger.officialGate) assert.equal(ledger.summary.notRun, 0, 'Every mandatory native/Node/Chromium sealed cell executes');
    return ledger;
  } finally { try { if (session) await session.close(); } finally { fs.rmSync(temporaryRoot, {recursive: true, force: true}); } }
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2), mode = options[0] === '--browser' ? 'browser' : options[0] === '--native-only' ? 'native-only' : 'diagnostic';
  const ledger = createSealedLedger(mode), filename = path.join(repoRoot, mode === 'browser' ? 'build/java-sealed-semantics-results.json' : `build/java-sealed-semantics-${mode}-results.json`);
  const checkpoint = () => writeSealedLedger(filename, ledger); checkpoint();
  try {
    assert.ok(options.length === 1 && ['--browser', '--native-only', '--diagnostic'].includes(options[0]),
      'Usage: node ci/java_sealed_semantics_test.mjs --browser | --native-only | --diagnostic');
    await runSealedSemantics(ledger, {checkpoint}); if (ledger.status !== 'passed') process.exitCode = 1;
  } catch (error) {
    ledger.status = 'failed'; ledger.error = error.stack || error.message; process.exitCode = 1; console.error(ledger.error);
    for (const record of ledger.results) for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'gate stopped: ' + error.message;
  } finally { ledger.finishedAt = new Date().toISOString(); checkpoint(); }
}
