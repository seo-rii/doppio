import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import types from './java_record_types_cases.mjs';
import semantics from './java_record_semantics_cases.mjs';
import signatures, {mutateRecordComponentSignature} from './java_record_signatures_cases.mjs';
import {inspectRecordClasses, proveRecordGroup, readRecordClass} from './java_record_metadata.mjs';
import {coreOpcodeNames, inspectCoreClasses} from './java_core_bytecode.mjs';
import {assertCoreResult, assertCoreCompilerSources, checkCoreCompilation, checkCoreExecution, CoreIntegrityError}
  from './java_core_semantics_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';

const harnessPath = fileURLToPath(import.meta.url), repoRoot = path.resolve(path.dirname(harnessPath), '..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
export const recordLedgerScope = 'JVM-006 B6 selected genuine record metadata, members, constructors, ObjectMethods and lazy signature failures';
export const recordGroups = freeze([types, semantics, signatures]);
export const recordRequiredHosts = Object.freeze(['native', 'node', 'chromium']);
export const recordRequiredReleases = Object.freeze([21, 25]);
export const recordTimeouts = Object.freeze({compileMs: 60000, nativeMs: 30000, guestMs: 60000});
const modes = Object.freeze(['browser', 'native-only', 'diagnostic']);
const declarationProofKinds = ['components', 'field', 'canonical-constructor', 'auxiliary-constructor', 'accessor', 'object-method', 'ordinary-method'];
const integrity = check => {
  try { check(); } catch (error) { throw new CoreIntegrityError(error.message, {cause: error}); }
};

export function recordsSourceUnits(group, index) {
  const units = new Map(index.units.map(unit => [unit.id, unit]));
  return group.cases.map(entry => {
    const sourceUnits = [];
    for (const release of recordRequiredReleases) for (const [specification, anchors] of Object.entries(entry.anchors)) {
      assert.ok(['JLS', 'JVMS'].includes(specification), 'Known source specification');
      for (const anchor of anchors) {
        const id = `${specification}-${release}:${specification.toLowerCase()}-${anchor}`, unit = units.get(id);
        assert.ok(unit, 'Indexed record source anchor ' + id);
        sourceUnits.push({id, url: unit.url, ownerPackageId: unit.ownerPackageId,
          assessmentStatus: unit.assessmentStatus, fullUnitConformanceProven: false});
      }
    }
    assert.ok(sourceUnits.some(unit => unit.ownerPackageId === 'JVM-006'), 'An actual JVM-006-owned record slice');
    return {id: entry.id, sourceUnits};
  });
}

export function validateRecordGroups(groups = recordGroups) {
  assert.ok(Array.isArray(groups) && groups.length > 0, 'Nonempty mandatory record groups');
  const groupIds = new Set(), caseIds = new Set();
  for (const group of groups) {
    assert.match(group.id, /^record-[a-z-]+$/); assert.ok(!groupIds.has(group.id), 'Unique mandatory record group'); groupIds.add(group.id);
    assert.match(group.source, /^classes\/modern_fixture\/JavaRecord[A-Za-z]+\.java$/);
    assert.match(group.mainClass, /^classes\.modern_test\.JavaRecord[A-Za-z]+$/);
    assert.match(group.completionMarker, /^RECORD_[A-Z_]+_OK$/);
    assert.ok(Array.isArray(group.recordClassNames) && group.recordClassNames.length > 0, 'Nonempty exact record-class inventory');
    assert.equal(new Set(group.recordClassNames).size, group.recordClassNames.length, 'Unique record-class inventory');
    for (const name of group.recordClassNames) assert.match(name, /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/);
    assert.ok(Array.isArray(group.cases) && group.cases.length > 0, 'Nonempty mandatory record cases');
    for (const entry of group.cases) {
      assert.match(entry.id, /^[a-z][a-z0-9-]*$/); assert.ok(!caseIds.has(entry.id), 'Unique mandatory record case'); caseIds.add(entry.id);
      assert.match(entry.entryMethod, /^case[A-Za-z0-9]+$/); assert.equal(entry.entryDescriptor, '()V');
      assert.ok(Array.isArray(entry.trace) && entry.trace.length > 0 && entry.trace.every(value => typeof value === 'string' && !/[\r\n]/.test(value)), 'Exact fixed record traces');
      assert.ok(entry.anchors && Object.keys(entry.anchors).length > 0, 'Nonempty source anchors');
      assert.ok(Array.isArray(entry.probes) && entry.probes.length > 0, 'Nonempty executable record probes');
      for (const probe of entry.probes) {
        assert.equal(typeof probe.method, 'string'); assert.equal(typeof probe.descriptor, 'string');
        assert.ok(Array.isArray(probe.requiredOpcodes) && probe.requiredOpcodes.length > 0 &&
          probe.requiredOpcodes.every(opcode => typeof opcode === 'string' && coreOpcodeNames.includes(opcode)), 'Known nonempty required record opcodes');
      }
      assert.ok(Array.isArray(entry.recordProofs) && entry.recordProofs.length > 0, 'Nonempty independent record metadata contracts');
      for (const proof of entry.recordProofs) {
        assert.ok(declarationProofKinds.includes(proof.kind), 'Known independent record proof kind');
        assert.equal(typeof proof.className, 'string');
        if (proof.kind !== 'field') assert.ok(group.recordClassNames.includes(proof.className), 'Record proof bound to exact record inventory');
        if (proof.kind === 'components') {
          assert.ok(Array.isArray(proof.components), 'Exact component metadata array');
          for (const component of proof.components) {
            assert.equal(typeof component.name, 'string'); assert.equal(typeof component.descriptor, 'string');
            assert.ok(component.signature === null || typeof component.signature === 'string', 'Explicit present/absent component Signature');
          }
        }
      }
    }
    for (const sourceFunction of ['carrierSources', 'replacementSources']) if (group[sourceFunction])
      assert.deepEqual(group[sourceFunction](), group[sourceFunction](), 'Deterministic genuine signature compiler sources');
  }
  return caseIds.size;
}

export function createRecordLedger(mode = 'browser', groups = recordGroups) {
  assert.ok(modes.includes(mode), 'Known record execution mode');
  const count = validateRecordGroups(groups);
  assert.deepEqual(groups.map(group => group.id), recordGroups.map(group => group.id), 'Exact mandatory record-group inventory');
  groups.forEach((group, index) => {
    const original = recordGroups[index];
    assert.deepEqual(group.cases, original.cases, 'Exact mandatory record-case contracts');
    assert.deepEqual(group.recordClassNames, original.recordClassNames, 'Exact mandatory record-class inventory');
    for (const property of ['source', 'mainClass', 'completionMarker', 'kind', 'carrierSources', 'replacementSources'])
      assert.equal(group[property], original[property], 'Exact mandatory compiler inputs');
  });
  const ledger = {schemaVersion: 1, scope: recordLedgerScope, status: 'running', requestedMode: mode,
    officialGate: mode === 'browser', phaseBComplete: false, jvm006Complete: false, fullSourceUnitConformanceProven: false,
    generalBootstrapConformanceProven: false, startedAt: new Date().toISOString(),
    requiredReleases: [...recordRequiredReleases], requiredHosts: [...recordRequiredHosts], caseCount: count,
    results: recordRequiredReleases.flatMap(release => groups.map(group => ({release, group: group.id,
      status: 'not-run', cases: structuredClone(group.cases), recordClassNames: [...group.recordClassNames], operations: [],
      executions: recordRequiredHosts.map(host => ({host, status: 'not-run', reason: 'awaiting compilation'}))})))};
  assertRecordLedgerInventory(ledger, {phase: 'initial'}); return ledger;
}

export function assertRecordLedgerInventory(ledger, {phase = 'inventory'} = {}) {
  assert.ok(['initial', 'inventory', 'terminal'].includes(phase), 'Known inventory phase');
  assert.equal(ledger.schemaVersion, 1, 'Exact mandatory record ledger schema'); assert.equal(ledger.scope, recordLedgerScope, 'Exact mandatory record scope');
  assert.ok(modes.includes(ledger.requestedMode), 'Known record execution mode');
  assert.equal(ledger.officialGate, ledger.requestedMode === 'browser', 'Official record gate agrees with requested mode');
  for (const property of ['phaseBComplete', 'jvm006Complete', 'fullSourceUnitConformanceProven', 'generalBootstrapConformanceProven'])
    assert.equal(ledger[property], false, 'Bounded record evidence cannot promote package/source/phase assessments');
  assert.deepEqual(ledger.requiredReleases, recordRequiredReleases, 'Exact mandatory record releases');
  assert.deepEqual(ledger.requiredHosts, recordRequiredHosts, 'Exact mandatory record hosts');
  assert.equal(ledger.caseCount, validateRecordGroups(), 'Exact mandatory record case count');
  const expected = recordRequiredReleases.flatMap(release => recordGroups.map(group => ({release, group})));
  assert.ok(Array.isArray(ledger.results), 'Exact mandatory record results');
  assert.deepEqual(ledger.results.map(record => [record.release, record.group]), expected.map(record => [record.release, record.group.id]), 'Exact mandatory group/release inventory');
  const selected = ledger.requestedMode === 'native-only' ? ['native'] : ledger.requestedMode === 'diagnostic' ? ['native', 'node'] : recordRequiredHosts;
  if (phase === 'initial') assert.equal(ledger.status, 'running', 'Fresh record execution ledger');
  ledger.results.forEach((record, index) => {
    assert.deepEqual(record.cases, expected[index].group.cases, 'Exact mandatory record-case contracts');
    assert.deepEqual(record.recordClassNames, expected[index].group.recordClassNames, 'Exact mandatory record-class inventory');
    assert.ok(Array.isArray(record.operations), 'Mandatory compiler attempt inventory');
    assert.deepEqual(record.executions.map(cell => cell.host), recordRequiredHosts, 'Exact mandatory host cells');
    assert.ok(['not-run', 'running', 'passed', 'failed'].includes(record.status), 'Known record group status');
    if (phase === 'initial') { assert.equal(record.status, 'not-run', 'Fresh record group'); assert.equal(record.operations.length, 0, 'Fresh compiler attempts'); }
    if (phase === 'terminal') assert.ok(['passed', 'failed'].includes(record.status), 'Terminal mandatory record group');
    for (const cell of record.executions) {
      assert.ok(['not-run', 'running', 'passed', 'failed'].includes(cell.status), 'Known record host status');
      if (phase === 'initial') {
        assert.equal(cell.status, 'not-run', 'Fresh host execution');
        assert.ok(!Object.hasOwn(cell, 'result') && !Object.hasOwn(cell, 'outcomes'), 'No overwritten prior host evidence');
      }
      if (phase === 'terminal') {
        assert.notEqual(cell.status, 'running', 'Terminal mandatory host execution');
        if (!selected.includes(cell.host)) assert.equal(cell.status, 'not-run', 'Diagnostic excluded host remains mandatory and not-run');
        else if (record.status === 'passed') assert.equal(cell.status, 'passed', 'All selected mandatory record hosts pass');
      }
    }
  });
}

export function writeRecordLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, recordLedgerScope);
  assert.ok(['running', 'passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'Regular record ledger parent');
  if (fs.existsSync(filename)) {
    const stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink(), 'Regular unlinked record ledger');
    const previous = JSON.parse(fs.readFileSync(filename));
    assert.equal(previous.scope, recordLedgerScope);
    assert.equal(previous.officialGate, ledger.officialGate, 'Diagnostics never overwrite official record evidence');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600}); fs.renameSync(temporary, filename);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

/** Exact runtime file inventory includes no original/replacement .class fallback. */
export function assertRecordSignatureClasspath(directory, drivers, payloads) {
  assert.deepEqual(drivers.map(file => file.path).sort(), ['classes/modern_test/JavaRecordSignatures$PayloadLoader.class',
    'classes/modern_test/JavaRecordSignatures.class'], 'Exact two genuine signature driver classes');
  assert.deepEqual(payloads.map(payload => [payload.id, payload.resourcePath]),
    signatures.cases.flatMap(entry => entry.payload.resources.map(resource => [entry.id, resource])), 'Exact mandatory signature resource inventory');
  const expected = [...drivers.map(file => ({path: file.path, sha256: file.sha256, size: file.size})),
    ...payloads.map(file => ({path: file.resourcePath, sha256: file.sha256, size: file.size}))].sort((a, b) => a.path.localeCompare(b.path));
  const actual = [];
  const visit = location => {
    for (const name of fs.readdirSync(location)) {
      const filename = path.join(location, name), stat = fs.lstatSync(filename);
      assert.ok(!stat.isSymbolicLink(), 'No linked signature runtime input');
      if (stat.isDirectory()) visit(filename);
      else { assert.ok(stat.isFile(), 'Regular signature runtime input'); actual.push({path: path.relative(directory, filename).split(path.sep).join('/'),
        sha256: digest(fs.readFileSync(filename)), size: stat.size}); }
    }
  };
  visit(directory);
  assert.deepEqual(actual.sort((a, b) => a.path.localeCompare(b.path)), expected, 'Exact resource-only signature classpath without missing, extra, changed or fallback inputs');
}

// Include the complete local import closure of reused B5 guard functions. Their
// fixed B5 inventories are never used to construct or validate the B6 ledger.
function localImportClosure(entrypoints) {
  const visited = new Set(), pending = [...entrypoints];
  while (pending.length) {
    const filename = path.resolve(pending.pop()); if (visited.has(filename)) continue;
    assert.ok(filename.startsWith(repoRoot + path.sep), 'Harness import remains in this repository'); visited.add(filename);
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
    assert.equal(result.status, 'passed', 'Available repository provenance'); return result.stdout.trim();
  };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']), trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

export async function runRecordSemantics(ledger, {checkpoint = () => {}} = {}) {
  assertRecordLedgerInventory(ledger, {phase: 'initial'});
  const nativeOnly = ledger.requestedMode === 'native-only', browser = ledger.requestedMode === 'browser';
  const hosts = nativeOnly ? ['native'] : browser ? recordRequiredHosts : ['native', 'node'];
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'), markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), recordRequiredReleases);
  const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
  ledger.sourceUnits = recordGroups.map(group => ({group: group.id, cases: recordsSourceUnits(group, index)}));
  const covered = new Set(ledger.sourceUnits.flatMap(group => group.cases.flatMap(entry => entry.sourceUnits.map(unit => unit.id))));
  ledger.ownedSourceInventory = index.units.filter(unit => unit.ownerPackageId === 'JVM-006').map(unit => {
    assert.ok(covered.has(unit.id), 'All fourteen indexed record-source units have an explicit bounded slice');
    return {id: unit.id, url: unit.url, ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus,
      fullUnitConformanceProven: false};
  });
  assert.equal(ledger.ownedSourceInventory.length, 14, 'Exact two-edition record source ownership');
  const entrypoints = ['ci/java_record_semantics_test.mjs', 'ci/java_record_semantics_contract_test.mjs'].map(relative => path.join(repoRoot, relative));
  const inputPaths = [...new Set([...localImportClosure(entrypoints), ...recordGroups.map(group => path.join(repoRoot, group.source)),
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
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-record-semantics-')); fs.chmodSync(temporaryRoot, 0o700);
  let session;
  const checkGlobal = () => integrity(() => {
    assert.deepEqual(inputs(), ledger.inputDigests, 'Immutable record corpus and transitive harness inputs');
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), ledger.runtime, 'Immutable compiled CLI runtime');
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
      const group = recordGroups.find(candidate => candidate.id === record.group), prepared = marker.toolchains.find(item => item.feature === record.release);
      const directory = path.join(temporaryRoot, 'release' + record.release, group.id), output = path.join(directory, 'runtime');
      fs.mkdirSync(output, {recursive: true}); record.status = 'running'; checkpoint();
      try {
        checkGlobal();
        const sourceRecords = [{path: path.join(repoRoot, group.source), sha256: digest(fs.readFileSync(path.join(repoRoot, group.source)))}];
        const sourceDigests = sourceRecords.map(source => ({path: source.path, sha256: source.sha256})); record.sources = sourceRecords;
        const compile = async (sources, destination, kind, classpath = emptySourcepath) => {
          fs.mkdirSync(destination, {recursive: true}); assertCoreCompilerSources(sourceDigests);
          const operation = {kind, command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(record.release),
            '-encoding', 'UTF-8', '-proc:none', '-g', '-classpath', classpath, '-sourcepath', emptySourcepath, '-d', destination,
            ...sources.map(source => source.path)], destination};
          record.operations.push(operation); checkpoint();
          await checkCoreCompilation(operation, () => runCommand(operation.command, operation.arguments, {cwd: directory, timeoutMs: recordTimeouts.compileMs}),
            () => { checkGlobal(); assertCoreCompilerSources(sourceDigests); }, checkpoint);
        };
        await compile(sourceRecords, output, 'genuine-driver');
        record.classFiles = inspectClassFiles(output, record.release, group.mainClass);
        const codeClasses = inspectCoreClasses(output, record.classFiles), driverMetadata = inspectRecordClasses(output, record.classFiles);
        if (group.id === 'record-signatures') {
          const materialize = (sources, kind) => sources.map(source => {
            assert.match(source.binaryName, /^recordsignature\.[A-Za-z]+$/);
            const filename = path.join(directory, kind, source.binaryName.replaceAll('.', '/') + '.java');
            fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, source.text, {flag: 'wx', mode: 0o600});
            const result = {...source, path: filename, sha256: digest(source.text)}; sourceDigests.push({path: filename, sha256: result.sha256}); return result;
          });
          record.carrierSources = materialize(group.carrierSources(), 'carrier-sources');
          record.replacementSources = materialize(group.replacementSources(), 'replacement-sources');
          const originalDirectory = path.join(directory, 'compilations', 'original'), replacementDirectory = path.join(directory, 'compilations', 'replacement');
          await compile(record.carrierSources, originalDirectory, 'genuine-signature-carriers', output);
          const originals = inspectClassFiles(originalDirectory, record.release, 'recordsignature.MissingRecord');
          assert.deepEqual(originals.map(file => file.path), group.carrierSources().map(source => source.binaryName.replaceAll('.', '/') + '.class').sort(), 'Exact original signature class inventory');
          record.originals = {directory: originalDirectory, classFiles: originals, treeSha256: treeDigest(originalDirectory), genuineCompilerBytes: true, runtimeClasspathEntry: false};
          await compile(record.replacementSources, replacementDirectory, 'genuine-evolved-arity', output);
          assert.equal(treeDigest(originalDirectory), record.originals.treeSha256, 'Original tree not rewritten by replacement compiler');
          const replacements = inspectClassFiles(replacementDirectory, record.release, 'recordsignature.Box');
          assert.deepEqual(replacements.map(file => file.path), ['recordsignature/Box.class'], 'Exact separately compiled replacement');
          record.replacements = {directory: replacementDirectory, classFiles: replacements, treeSha256: treeDigest(replacementDirectory), genuineCompilerBytes: true, runtimeClasspathEntry: false};
          const originalMetadata = inspectRecordClasses(originalDirectory, originals), replacementMetadata = inspectRecordClasses(replacementDirectory, replacements);
          assert.deepEqual([...originalMetadata.values()].filter(item => item.record).map(item => item.name).sort(), [...group.recordClassNames].sort(), 'Exact genuine carrier Record inventory');
          assert.equal(originalMetadata.get('recordsignature.Box').signature, '<T:Ljava/lang/Object;>Ljava/lang/Object;');
          assert.equal(replacementMetadata.get('recordsignature.Box').signature, '<A:Ljava/lang/Object;B:Ljava/lang/Object;>Ljava/lang/Object;');
          record.payloads = []; record.recordProofs = [];
          for (const entry of group.cases) {
            const metadata = new Map(driverMetadata), names = [entry.payload.recordClass, ...entry.payload.supportClasses];
            for (const [position, name] of names.entries()) {
              const relative = name.replaceAll('.', '/') + '.class';
              const evolved = entry.payload.replacement && name === 'recordsignature.Box', tree = evolved ? record.replacements : record.originals;
              const originalRecord = tree.classFiles.find(file => file.path === relative); assert.ok(originalRecord, 'Actual payload source class');
              const original = fs.readFileSync(path.join(tree.directory, relative)); assert.equal(digest(original), originalRecord.sha256);
              let bytes = original, mutation = null;
              if (position === 0 && entry.kind === 'explicit-component-signature-mutation') {
                mutation = mutateRecordComponentSignature(original, entry); bytes = mutation.bytes;
                const replayed = mutation.edits.slice().sort((a, b) => b.offset - a.offset).reduce((data, edit) => {
                  assert.equal(original.subarray(edit.offset, edit.offset + edit.removeBytes).toString('hex'), edit.beforeHex);
                  return Buffer.concat([data.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), data.subarray(edit.offset + edit.removeBytes)]);
                }, Buffer.from(original));
                assert.ok(replayed.equals(bytes), 'Independent exact component-only mutation replay');
                assert.equal(mutation.originalSha256, originalRecord.sha256); assert.equal(mutation.mutatedSha256, digest(bytes));
              }
              assert.equal(digest(original), originalRecord.sha256, 'Original payload source stays immutable');
              const inspected = readRecordClass(bytes); assert.equal(inspected.name, name); assert.equal(inspected.major, record.release + 44);
              metadata.set(name, inspected);
              const resourcePath = entry.payload.resources[position], filename = path.join(output, resourcePath);
              fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, bytes, {flag: 'wx', mode: 0o600});
              record.payloads.push({id: entry.id, resourcePath, binaryName: name, size: bytes.length, sha256: digest(bytes), major: inspected.major,
                kind: mutation ? entry.kind : evolved ? 'genuine-replacement-compiler-output' : 'genuine-original-compiler-output',
                original: {...originalRecord, directory: tree.directory}, edits: mutation?.edits || [], evidence: mutation?.evidence || null}); checkpoint();
            }
            record.recordProofs.push(...proveRecordGroup(group, metadata, codeClasses, {payloadCase: entry}));
          }
          assertRecordSignatureClasspath(output, record.classFiles, record.payloads);
        } else record.recordProofs = proveRecordGroup(group, driverMetadata, codeClasses);
        record.classpath = {directory: output, treeSha256: treeDigest(output), driverGenuineCompilerBytes: true,
          payloadKind: group.kind || 'genuine-compiler-bytes', fallbackPayloadClassFiles: false,
          invocationRoute: group.id === 'record-signatures' ? 'manifest-controlled resource-only child-first loader and passive reflection' : 'genuine direct compiler calls'};
        const programArguments = group.id === 'record-signatures' ? group.cases.map(entry => entry.id) : []; record.programArguments = programArguments;
        const checkLocal = () => integrity(() => {
          assertCoreCompilerSources(sourceDigests);
          assert.equal(treeDigest(output), record.classpath.treeSha256, 'Immutable record runtime classpath');
          assert.deepEqual(inspectClassFiles(output, record.release, group.mainClass), record.classFiles, 'Immutable genuine driver bytes and majors');
          for (const tree of [record.originals, record.replacements].filter(Boolean)) {
            assert.equal(treeDigest(tree.directory), tree.treeSha256, 'Immutable separate genuine compilation');
            const main = tree === record.originals ? 'recordsignature.MissingRecord' : 'recordsignature.Box';
            assert.deepEqual(inspectClassFiles(tree.directory, record.release, main), tree.classFiles, 'Immutable genuine source class bytes');
          }
          if (record.payloads) assertRecordSignatureClasspath(output, record.classFiles, record.payloads);
        });
        for (const cell of record.executions) {
          if (!hosts.includes(cell.host)) { cell.reason = 'explicit diagnostic mode excludes this mandatory host'; checkpoint(); continue; }
          checkGlobal(); checkLocal();
          await checkCoreExecution(cell, group, () => cell.host === 'chromium' ? session.execute({classesPath: output,
            mainClass: group.mainClass, arguments: programArguments, timeoutMs: recordTimeouts.guestMs, standardInput: ''}) : runCommand(
            cell.host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(cell.host === 'native' ? ['-Xverify:all'] : ['--no-deprecation', runnerPath]), '-cp', output, group.mainClass, ...programArguments],
            {cwd: directory, timeoutMs: cell.host === 'native' ? recordTimeouts.nativeMs : recordTimeouts.guestMs, standardInput: ''}),
          () => { checkGlobal(); checkLocal(); }, checkpoint);
        }
        record.status = record.executions.filter(cell => hosts.includes(cell.host)).every(cell => cell.status === 'passed') ? 'passed' : 'failed';
        console.log(`${record.status === 'passed' ? 'PASS' : 'FAIL'} records ${group.id} Java ${record.release}: ${group.cases.length} cases on ${hosts.join(', ')}`);
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
    assertRecordLedgerInventory(ledger, {phase: 'terminal'});
    ledger.status = ledger.results.every(record => record.status === 'passed') ? 'passed' : 'failed';
    const cells = ledger.results.flatMap(record => record.executions);
    ledger.summary = {executionCells: cells.length, passed: cells.filter(cell => cell.status === 'passed').length,
      failed: cells.filter(cell => cell.status === 'failed').length, notRun: cells.filter(cell => cell.status === 'not-run').length};
    if (ledger.officialGate) assert.equal(ledger.summary.notRun, 0, 'Every mandatory record native/Node/Chromium cell executes');
    return ledger;
  } finally {
    try { if (session) await session.close(); }
    finally { fs.rmSync(temporaryRoot, {recursive: true, force: true}); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2), mode = options[0] === '--browser' ? 'browser' : options[0] === '--native-only' ? 'native-only' : 'diagnostic';
  const ledger = createRecordLedger(mode), filename = path.join(repoRoot, mode === 'browser' ? 'build/java-record-semantics-results.json' : `build/java-record-semantics-${mode}-results.json`);
  const checkpoint = () => writeRecordLedger(filename, ledger); checkpoint();
  try {
    assert.ok(options.length === 1 && ['--browser', '--native-only', '--diagnostic'].includes(options[0]),
      'Usage: node ci/java_record_semantics_test.mjs --browser | --native-only | --diagnostic');
    await runRecordSemantics(ledger, {checkpoint}); if (ledger.status !== 'passed') process.exitCode = 1;
  } catch (error) {
    ledger.status = 'failed'; ledger.error = error.stack || error.message; process.exitCode = 1; console.error(ledger.error);
    for (const record of ledger.results) for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'gate stopped: ' + error.message;
  } finally { ledger.finishedAt = new Date().toISOString(); checkpoint(); }
}
