import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {coreOpcodeNames} from './java_core_bytecode.mjs';
import {assertCoreCompilerSources, checkCoreCompilation, CoreIntegrityError} from './java_core_semantics_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';
import {classFileInputContracts, classFileArtifactContracts, proveClassFileInputGroup,
  assertClassFileInputProofs, proveClassFileArtifact} from './java_classfile_extended_bytecode.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const primaryClassFile = 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html';
const applicability = freeze([
  {release: 21, applicable: false, finalApiAvailable: false, finalApiSince: 24,
    reason: 'Java 21 has no final java.lang.classfile API; these unchanged direct-source recipes require Java 25.',
    primarySource: primaryClassFile},
  {release: 25, applicable: true, finalApiAvailable: true, finalApiSince: 24,
    reason: 'The Java 25 final public API is the selected native contract and genuine compiler target.',
    primarySource: primaryClassFile}
]);
const completionFlags = freeze(['phaseCComplete', 'lib007Complete', 'jvm002Complete', 'jvm003Complete',
  'fullSourceUnitConformanceProven', 'fullApiConformanceProven', 'publicClassFileApiConformanceProven',
  'classFileVerifierConformanceProven', 'classFileStackMapConformanceProven', 'classFileHierarchyResolverConformanceProven',
  'classFileAllAttributesConformanceProven', 'classFileAllOpcodesConformanceProven',
  'classFileAllVersionsConformanceProven', 'classFileByteForByteNativeParityProven',
  'namedModuleRuntimeConformanceProven']);

// C7c shares bounded process/compiler/browser primitives, not C1-C6's
// two-release inventory or their behavioral result parser.
export function createClassFileHarness({groups, requiredInventory, harnessUrl}) {
  const harnessPath = fileURLToPath(harnessUrl);
  assert.equal(harnessPath, path.join(repoRoot, 'ci/java_classfile_extended_test.mjs'));
  const contractPath = path.join(repoRoot, 'ci/java_classfile_extended_contract_test.mjs');
  const classFileScope = 'LIB-007 C7c selected Java 25 public class-file typed/custom attributes, bootstrap models and fresh constant-pool remapping APIs';
  const classFileGroups = freeze(groups), inventory = freeze(requiredInventory);
  const classFileReleases = freeze([25]), classFileHosts = freeze(['native', 'node', 'chromium']);
  const classFileTimeouts = freeze({compileMs: 60_000, nativeMs: 30_000, guestMs: 60_000});
  const modes = freeze(['browser', 'native-only', 'diagnostic']);
  const selectedHosts = mode => mode === 'native-only' ? ['native'] : mode === 'diagnostic' ? ['native', 'node'] : classFileHosts;
  const sources = group => [group.source, ...group.additionalSources].map(relative => path.join(repoRoot, relative));
  const records = () => classFileGroups.map(group => ({release: 25, group}));
  const integrity = check => {try {check();} catch (error) {throw new CoreIntegrityError(error.message, {cause: error});}};

  function parseClassFileMode(options) {
    assert.ok(Array.isArray(options) && options.length === 1 && ['--browser', '--native-only', '--diagnostic'].includes(options[0]),
      'Usage: node ci/java_classfile_extended_test.mjs --browser | --native-only | --diagnostic');
    return options[0].slice(2);
  }

  function validateClassFileGroups(candidate = classFileGroups) {
    assert.deepEqual(candidate.map(group => group.id), inventory.map(group => group.id), 'Independent literal C7c groups');
    assert.equal(candidate.length, 3); const ids = new Set();
    for (const [n, group] of candidate.entries()) {
      const expected = classFileInputContracts[group.id]; assert.ok(expected, 'Independent C7c original input contract');
      assert.deepEqual(group.cases.map(entry => entry.id), inventory[n].ids, 'Independent literal eight-case exit');
      assert.equal(group.cases.length, 8); assert.deepEqual(group.releases, [25], 'Only applicable direct Java 25 sources');
      for (const key of ['source', 'mainClass', 'completionMarker', 'additionalSources', 'driverClassNames', 'javacFlags', 'resourceClassNames'])
        assert.deepEqual(group[key], expected[key], 'Independent original compiler contract: ' + key);
      assert.ok(!group.generatedSources && !group.generatedClassFixture && !group.mutatePayload && !group.carrierSources &&
        !group.compilationUnits, 'No generated compiler carrier, adapter or fallback');
      assert.equal(new Set([group.source, ...group.additionalSources]).size, 1 + group.additionalSources.length);
      for (const entry of group.cases) {
        assert.match(entry.id, /^cf-(?:attributes|bootstrap|pool)-[a-z0-9-]+$/);
        assert.ok(!ids.has(entry.id)); ids.add(entry.id);
        assert.match(entry.entryMethod, /^case[A-Za-z0-9]+$/); assert.equal(entry.entryDescriptor, '()V');
        assert.ok(Array.isArray(entry.trace) && entry.trace.length === 1 && entry.trace.every(event =>
          typeof event === 'string' && event.length > 0 && !/[\r\n|]/.test(event)), 'One independently fixed CASE event');
        assert.ok(['specification', 'pinned-native-regression'].includes(entry.oracleKind));
        assert.ok(Array.isArray(entry.limitations) && entry.limitations.length > 0 &&
          entry.limitations.every(value => typeof value === 'string' && value.length > 0));
        assert.ok(Array.isArray(entry.primarySources) && entry.primarySources.length > 0 && entry.primarySources.every(url =>
          /^https:\/\/docs\.oracle\.com\/(?:en\/java\/javase\/25\/docs\/api\/java\.base\/java\/lang\/(?:classfile|constant)\/|javase\/specs\/)/.test(url)),
        'Selected public Java 25 API and indexed specification sources');
        assert.ok(entry.anchors && Object.entries(entry.anchors).length > 0 && Object.entries(entry.anchors).every(([spec, anchors]) =>
          ['JLS', 'JVMS'].includes(spec) && Array.isArray(anchors) && anchors.length > 0 && anchors.every(anchor => typeof anchor === 'string' && anchor.length > 0)));
        assert.ok(Array.isArray(entry.probes) && entry.probes.length > 0, 'Actual original driver Code obligations');
        assert.ok(Array.isArray(entry.callbackMethods));
        for (const probe of [...entry.probes, ...entry.callbackMethods]) {
          assert.ok(Object.keys(probe).every(key => ['className', 'method', 'descriptor', 'requiredOpcodes', 'symbolicOperands'].includes(key)),
            'No ignored original Code probe fields');
          assert.ok(!probe.className || group.driverClassNames.includes(probe.className));
          assert.ok(typeof probe.method === 'string' && typeof probe.descriptor === 'string');
          assert.ok(Array.isArray(probe.requiredOpcodes) && probe.requiredOpcodes.length > 0 &&
            probe.requiredOpcodes.every(opcode => coreOpcodeNames.includes(opcode)));
          for (const operand of probe.symbolicOperands || []) {
            const fields = operand.tag === 7 ? ['value'] : ['owner', 'name', 'descriptor'];
            assert.deepEqual(Object.keys(operand).sort(), ['opcode', 'tag', ...fields].sort());
            assert.ok([7, 9, 10, 11].includes(operand.tag) && coreOpcodeNames.includes(operand.opcode) &&
              fields.every(key => typeof operand[key] === 'string' && operand[key].length > 0));
          }
        }
        assert.ok(Object.hasOwn(classFileArtifactContracts, entry.id), 'Independent zero-or-more artifact exit');
        assert.deepEqual(entry.artifacts, classFileArtifactContracts[entry.id].map(contract => ({id: contract.id,
          kind: contract.definition === 'forbidden' ? 'invalid-controlflow' : 'valid-generated', className: contract.className,
          major: 69, minor: 0, flags: contract.flags, definition: contract.definition, fields: contract.fields.map(({name,descriptor,flags})=>({name,descriptor,flags})),
          methods: contract.methods.map(({name, descriptor, flags, nativeOpcodes}) => ({name, descriptor, flags, opcodes: nativeOpcodes})),
          sourceFile: contract.sourceFile, branches: contract.branches, handlers: contract.handlers})), 'Independent literal output artifact metadata');
      }
      if (candidate !== classFileGroups) assert.deepEqual(group, classFileGroups[n], 'No changed selected source/trace contracts');
    }
    assert.equal(ids.size, 24); return ids.size;
  }

  function classFileSourceUnits(group, index) {
    const units = new Map(index.units.map(unit => [unit.id, unit]));
    return group.cases.map(entry => ({id: entry.id, apiOwnerPackageId: 'LIB-007', primarySources: entry.primarySources,
      fullApiConformanceProven: false, sourceUnits: Object.entries(entry.anchors).flatMap(([spec, anchors]) => anchors.map(anchor => {
        const id = `${spec}-25:${spec.toLowerCase()}-${anchor}`, unit = units.get(id);
        assert.ok(unit, 'Existing indexed C7c dependency ' + id);
        return {id, url: unit.url, ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus,
          fullUnitConformanceProven: false};
      }))}));
  }

  function createClassFileLedger(mode = 'browser', candidate = classFileGroups) {
    assert.ok(modes.includes(mode));
    const ledger = {schemaVersion: 1, phaseId: 'C7c', scope: classFileScope, requestedMode: mode, officialGate: mode === 'browser',
      status: 'running', startedAt: new Date().toISOString(), applicability: structuredClone(applicability),
      requiredReleases: [25], requiredHosts: [...classFileHosts], caseCount: validateClassFileGroups(candidate),
      ...Object.fromEntries(completionFlags.map(flag => [flag, false])),
      results: candidate.map(group => ({release: 25, group: group.id, status: 'not-run', cases: structuredClone(group.cases),
        driverClassNames: [...group.driverClassNames], operations: [],
        executions: classFileHosts.map(host => ({host, status: 'not-run', reason: 'awaiting genuine Java 25 compilation'}))}))};
    assertClassFileLedger(ledger, {phase: 'initial'}); return ledger;
  }

  function assertClassFileCompilation(record, group, prepared) {
    assert.equal(record.release, 25); assert.equal(prepared.feature, 25);
    assert.equal(record.operations.length, 1, 'Exactly one original stock javac attempt');
    const operation = record.operations[0], output = record.classpath?.directory;
    assert.equal(operation.kind, 'genuine-driver');
    assert.ok(typeof output === 'string' && path.isAbsolute(output));
    const empty = path.resolve(output, '..', '..', '..', 'empty-sourcepath');
    assert.equal(operation.command, path.join(prepared.home, 'bin/javac'));
    assert.deepEqual(operation.arguments, ['--release', '25', '-encoding', 'UTF-8', '-proc:none', '-g:source',
      '-sourcepath', empty, '-classpath', empty, '-d', output, ...sources(group)], 'Exact stock Java 25 no-adapter recipe');
    assert.deepEqual(operation.sourceDigests, sources(group).map(filename => ({path: filename, sha256: sha(fs.readFileSync(filename))})));
    const result = operation.result;
    assert.deepEqual(result?.command, [operation.command, ...operation.arguments]);
    assert.equal(result.cwd, path.dirname(output)); assert.equal(result.timeoutMs, classFileTimeouts.compileMs);
    assert.ok(result.status === 'passed' && result.exitCode === 0 && !result.error && !result.signal && !result.timedOut &&
      !result.outputLimitExceeded && result.stdout === '' && result.stderr === '', 'Clean raw genuine compilation');
    assert.deepEqual(record.classFiles?.map(file => file.path), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort());
    for (const file of record.classFiles) assert.ok(file.major === 69 && file.minor === 0 && /^[a-f0-9]{64}$/.test(file.sha256) &&
      Number.isSafeInteger(file.size) && file.size > 8, 'Original genuine javac 69/0 evidence');
    assert.deepEqual({genuineCompilerBytes: record.classpath.genuineCompilerBytes,
      byteTransformations: record.classpath.byteTransformations, fallbackClassFiles: record.classpath.fallbackClassFiles},
    {genuineCompilerBytes: true, byteTransformations: false, fallbackClassFiles: false});
    assert.equal(operation.outputEvidence?.directory, output); assert.equal(operation.outputEvidence.treeSha256, record.classpath.treeSha256);
    assert.deepEqual(operation.outputEvidence.files, record.classFiles.map(({path, size, sha256}) => ({path, size, sha256})));
  }

  function assertClassFileProofs(record, group) {
    assertClassFileInputProofs(record, group);
  }

  function assertClassFileResult(result, group, host, record) {
    assert.ok(classFileHosts.includes(host));
    assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal, 'Complete bounded C7c run');
    assert.equal(result.status, 'passed'); assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', 'No unexpected guest/native stderr');
    assert.ok(typeof result.stdout === 'string' && Buffer.byteLength(result.stdout) <= 4 * 1024 * 1024, 'Bounded raw artifact and CASE output');
    const lines = result.stdout.replaceAll('\r\n', '\n').split('\n'); let at = 0;
    const artifacts = [], outcomes = [];
    for (const entry of group.cases) {
      for (const contract of classFileArtifactContracts[entry.id]) {
        const prefix = `CF_ARTIFACT|${entry.id}|${contract.id}|`, line = lines[at++];
        assert.ok(typeof line === 'string' && line.startsWith(prefix), 'Exact ordered host-produced artifact record');
        const encoded = line.slice(prefix.length);
        assert.ok(encoded.length > 0 && encoded.length <= 350_000 && /^[A-Za-z0-9+/]+={0,2}$/.test(encoded), 'Bounded canonical artifact base64');
        const bytes = Buffer.from(encoded, 'base64'); assert.equal(bytes.toString('base64'), encoded, 'Canonical complete artifact bytes');
        artifacts.push(proveClassFileArtifact(bytes, contract, {host, caseId: entry.id, record}));
      }
      for (const event of entry.trace) assert.equal(lines[at++], `CASE|${entry.id}|${event}`, 'Independent exact selected CASE trace');
      outcomes.push({id: entry.id, trace: entry.trace});
    }
    assert.deepEqual(lines.slice(at), [group.completionMarker, ''], 'Exact completion marker; no ignored or extra output');
    return {outcomes, artifacts};
  }

  function assertClassFileExecution(cell, record, group, prepared) {
    const result = cell.result, output = record.classpath.directory;
    const command = cell.host === 'chromium' ? ['chromium', 'Doppio.VM.CLI', '-cp', '/classes', group.mainClass] :
      cell.host === 'native' ? [path.join(prepared.home, 'bin/java'), '-Xverify:all', '-cp', output, group.mainClass] :
        [process.execPath, '--no-deprecation', path.join(repoRoot, 'build/release-cli/console/runner.js'), '-cp', output, group.mainClass];
    assert.deepEqual(result?.command, command, 'Same genuine original driver on each selected host');
    assert.equal(result.cwd, cell.host === 'chromium' ? '/work' : path.dirname(output));
    assert.equal(result.timeoutMs, cell.host === 'native' ? classFileTimeouts.nativeMs : classFileTimeouts.guestMs);
    if (cell.host === 'chromium') assert.deepEqual(result.browserErrors, []);
    return assertClassFileResult(result, group, cell.host, record);
  }

  function assertClassFileProvenance(ledger, marker, lock) {
    assert.deepEqual(ledger.toolchains, marker.toolchains.map(prepared => ({...prepared,
      treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256})));
    assert.deepEqual(ledger.toolchains.map(toolchain => toolchain.feature), [21, 25], 'Original lock also binds the non-applicable edition');
    assert.deepEqual(ledger.node, {version: process.version, executable: process.execPath});
    assert.match(ledger.gitStart?.commit, /^[a-f0-9]{40}$/); assert.equal(typeof ledger.gitStart.trackedDirty, 'boolean');
    assert.deepEqual(ledger.gitEnd, ledger.gitStart, 'Unchanged source state');
    if (ledger.requestedMode === 'native-only') {
      assert.equal(ledger.runtime, null); assert.equal(ledger.browserIntegrity, null); return;
    }
    const runtime = ledger.runtime;
    assert.ok(Array.isArray(runtime?.files) && runtime.files.length > 0);
    assert.equal(new Set(runtime.files.map(file => file.path)).size, runtime.files.length);
    for (const file of runtime.files) assert.ok(typeof file.path === 'string' && file.path.length > 0 &&
      /^[a-f0-9]{64}$/.test(file.sha256) && Number.isSafeInteger(file.size) && file.size > 0);
    assert.equal(runtime.snapshotSha256, sha(JSON.stringify(runtime.files)));
    assert.equal(runtime.entrypoint, path.join(repoRoot, 'build/release-cli/console/runner.js'));
    assert.equal(runtime.entrypointSha256, runtime.files.find(file => file.path === 'console/runner.js')?.sha256);
    if (ledger.officialGate) {
      const verified = ledger.browserIntegrity, provenance = ledger.browserProvenance;
      assert.equal(verified?.status, 'verified');
      for (const [key, source] of [['runtimeSha256', 'runtime'], ['browserfsSha256', 'browserfs'], ['bootstrapSha256', 'bootstrap'],
        ['chromiumExecutableSha256', 'chromiumExecutable'], ['adapterSha256', 'adapter']]) {
        assert.match(verified[key], /^[a-f0-9]{64}$/); assert.equal(verified[key], provenance?.[source]?.sha256);
        assert.ok(typeof provenance[source].path === 'string' && path.isAbsolute(provenance[source].path));
      }
      assert.equal(provenance.node, process.version); assert.equal(typeof provenance.chromium, 'string'); assert.equal(typeof provenance.playwright, 'string');
    } else assert.equal(ledger.browserIntegrity, null);
  }

  function assertClassFileLedger(ledger, {phase = 'inventory'} = {}) {
    assert.ok(['inventory', 'initial', 'terminal'].includes(phase));
    assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.phaseId, 'C7c'); assert.equal(ledger.scope, classFileScope);
    assert.ok(modes.includes(ledger.requestedMode)); assert.equal(ledger.officialGate, ledger.requestedMode === 'browser');
    assert.deepEqual(ledger.applicability, applicability, 'Immutable explicit applicability; never a skipped mandatory Java 25 case');
    assert.deepEqual(ledger.requiredReleases, [25]); assert.deepEqual(ledger.requiredHosts, classFileHosts);
    for (const flag of completionFlags) assert.equal(ledger[flag], false, 'Finite C7c evidence leaves broad completion false: ' + flag);
    assert.equal(ledger.caseCount, validateClassFileGroups());
    const expected = records(), hosts = selectedHosts(ledger.requestedMode);
    assert.deepEqual(ledger.results.map(record => [record.release, record.group]), expected.map(({release, group}) => [release, group.id]));
    if (phase === 'initial') assert.equal(ledger.status, 'running');
    if (phase === 'terminal') assert.ok(['passed', 'failed'].includes(ledger.status));
    for (const [n, record] of ledger.results.entries()) {
      const group = expected[n].group;
      assert.deepEqual(record.cases, group.cases); assert.deepEqual(record.driverClassNames, group.driverClassNames);
      assert.ok(['not-run', 'running', 'passed', 'failed'].includes(record.status)); assert.ok(Array.isArray(record.operations));
      assert.deepEqual(record.executions.map(cell => cell.host), classFileHosts);
      if (phase === 'initial') {
        assert.equal(record.status, 'not-run'); assert.deepEqual(record.operations, []);
        assert.ok(!record.classFiles && !record.inputProofs && !record.classpath, 'Fresh input proof state');
      }
      let prepared;
      if (phase === 'terminal') {
        assert.ok(['passed', 'failed'].includes(record.status));
        if (record.status === 'passed' || record.executions.some(cell => cell.status === 'passed')) {
          const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
          prepared = marker.toolchains.find(item => item.feature === 25);
          assertClassFileCompilation(record, group, prepared); assertClassFileProofs(record, group);
        }
      }
      for (const cell of record.executions) {
        assert.ok(['not-run', 'running', 'passed', 'failed'].includes(cell.status));
        if (phase === 'initial') {
          assert.equal(cell.status, 'not-run'); assert.ok(!cell.result && !cell.outcomes && !cell.artifacts, 'Fresh raw execution/artifact state');
        }
        if (phase === 'terminal') {
          assert.notEqual(cell.status, 'running');
          if (!hosts.includes(cell.host)) {assert.equal(cell.status, 'not-run'); assert.ok(!cell.result && !cell.outcomes && !cell.artifacts);}
          else if (record.status === 'passed') assert.equal(cell.status, 'passed');
          if (cell.status === 'passed') {
            if (!prepared) {
              const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
              prepared = marker.toolchains.find(item => item.feature === 25);
            }
            const evidence = assertClassFileExecution(cell, record, group, prepared);
            assert.deepEqual(cell.outcomes, evidence.outcomes); assert.deepEqual(cell.artifacts, evidence.artifacts, 'Replay exact host-produced raw artifact proofs');
          }
          if (cell.status === 'not-run') assert.ok(typeof cell.reason === 'string' && cell.reason.length > 0);
        }
      }
    }
    if (phase === 'terminal' && ledger.status === 'passed') {
      assert.ok(ledger.results.every(record => record.status === 'passed'));
      const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
      assert.deepEqual(ledger.sourceUnits, classFileGroups.map(group => ({group: group.id, cases: classFileSourceUnits(group, index)})));
      assert.equal(ledger.directlyOwnedSpecUnitCount, 0, 'No manufactured LIB-007 owned specification clauses');
      assert.deepEqual(ledger.inputIntegrity, {unchanged: true, verifiedAtEnd: true});
      assert.deepEqual(ledger.proofIntegrity, {unchanged: true, verifiedAtEnd: true});
      assert.deepEqual(ledger.inputDigests, classFileInputPaths().map(filename => ({path: filename,
        size: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename))})));
      const lockBytes = fs.readFileSync(path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'));
      const lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
      validateToolchains(marker, lock, sha(lockBytes), [21, 25]); assertClassFileProvenance(ledger, marker, lock);
      if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitEnd);
      const cells = ledger.results.flatMap(record => record.executions);
      assert.deepEqual(ledger.summary, {executionCells: 9, passed: cells.filter(cell => cell.status === 'passed').length,
        failed: cells.filter(cell => cell.status === 'failed').length, notRun: cells.filter(cell => cell.status === 'not-run').length});
      if (ledger.officialGate) assert.equal(ledger.summary.notRun, 0, 'Every applicable official host executed');
    }
  }

  function classFileInputPaths() {
    const visited = new Set(), pending = [harnessPath, contractPath];
    while (pending.length) {
      const filename = path.resolve(pending.pop()); if (visited.has(filename)) continue;
      assert.ok(filename.startsWith(repoRoot + path.sep)); visited.add(filename);
      for (const match of fs.readFileSync(filename, 'utf8').matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)) {
        const dependency = path.resolve(path.dirname(filename), match[1]); if (/\.(?:mjs|cjs|js)$/.test(dependency)) pending.push(dependency);
      }
    }
    return [...new Set([...visited, ...classFileGroups.flatMap(sources), ...['ci/plan_spec_source_index.json',
      'ci/classfile_api_metadata_test.cjs', 'ci/ClassFileVerifierRegression.java', 'ci/ClassFilePoolRegression.java',
      'ci/ClassFileControlFlowRegression.java', 'ci/ClassFileControlFlowReaderRegression.java', 'ci/ClassFileControlFlowWriterRegression.java',
      'ci/classfile_extended_metadata_test.cjs', 'ci/ClassFileAttributesRegression.java', 'ci/ClassFileBootstrapPoolRegression.java', 'ci/ClassFileRemapRegression.java',
      'ci/java_compatibility_toolchains.lock.json', 'build/java-compatibility-toolchains/toolchains.json',
      'package.json', 'yarn.lock', '.github/workflows/modern-java.yml'].map(relative => path.join(repoRoot, relative)), process.execPath])].sort();
  }

  function captureClassFileOutput(directory) {
    const files = [];
    const visit = location => {
      const stat = fs.lstatSync(location); assert.ok(!stat.isSymbolicLink());
      if (stat.isDirectory()) for (const name of fs.readdirSync(location)) visit(path.join(location, name));
      else {
        assert.ok(stat.isFile() && stat.nlink === 1); files.push({path: path.relative(directory, location).split(path.sep).join('/'),
          size: stat.size, sha256: sha(fs.readFileSync(location))});
      }
    };
    assert.ok(fs.lstatSync(directory).isDirectory()); visit(directory);
    return {directory, treeSha256: treeDigest(directory), files: files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)};
  }

  function writeClassFileLedger(filename, ledger) {
    assert.equal(ledger.scope, classFileScope); assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.phaseId, 'C7c');
    fs.mkdirSync(path.dirname(filename), {recursive: true}); assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink());
    if (fs.existsSync(filename)) {
      const stat = fs.lstatSync(filename); assert.ok(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink());
      const previous = JSON.parse(fs.readFileSync(filename)); assert.equal(previous.scope, classFileScope);
      assert.equal(previous.officialGate, ledger.officialGate, 'Diagnostics cannot replace official C7c evidence');
    }
    const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600}); fs.renameSync(temporary, filename);}
    finally {if (fs.existsSync(temporary)) fs.unlinkSync(temporary);}
  }

  async function provenance() {
    const read = async args => {
      const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10_000}); assert.equal(result.status, 'passed'); return result.stdout.trim();
    };
    return {commit: await read(['rev-parse', '--verify', 'HEAD']), trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
  }

  async function runClassFileApi(ledger, {checkpoint = () => {}} = {}) {
    assertClassFileLedger(ledger, {phase: 'initial'});
    const nativeOnly = ledger.requestedMode === 'native-only', browser = ledger.requestedMode === 'browser';
    const lockBytes = fs.readFileSync(path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'));
    const lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
    validateToolchains(marker, lock, sha(lockBytes), [21, 25]);
    const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
    ledger.sourceUnits = classFileGroups.map(group => ({group: group.id, cases: classFileSourceUnits(group, index)}));
    ledger.directlyOwnedSpecUnitCount = index.units.filter(unit => unit.ownerPackageId === 'LIB-007').length;
    const inputPaths = classFileInputPaths(), inputs = () => inputPaths.map(filename => ({path: filename,
      size: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename))}));
    ledger.inputDigests = inputs(); ledger.node = {version: process.version, executable: process.execPath};
    ledger.gitStart = await provenance(); if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitStart);
    const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
      lock.toolchains.find(item => item.id === prepared.id).treeSha256));
    integrity(checkJdks); ledger.toolchains = marker.toolchains.map(prepared => ({...prepared,
      treeSha256: lock.toolchains.find(item => item.id === prepared.id).treeSha256}));
    const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
    ledger.runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-java-classfile-extended-')); fs.chmodSync(temporary, 0o700);
    let session;
    const checkGlobal = () => integrity(() => {
      assert.deepEqual(inputs(), ledger.inputDigests);
      if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), ledger.runtime);
      if (session) session.verifyIntegrity();
      for (const record of ledger.results) for (const operation of record.operations) if (operation.outputEvidence) {
        assertCoreCompilerSources(operation.sourceDigests); assert.deepEqual(captureClassFileOutput(operation.outputEvidence.directory), operation.outputEvidence);
      }
    });
    try {
      if (browser) {
        const {createBrowserSession} = await import('./java_compatibility_browser.mjs');
        session = await createBrowserSession({repoRoot}); ledger.browserProvenance = session.provenance;
      }
      const empty = path.join(temporary, 'empty-sourcepath'); fs.mkdirSync(empty); checkpoint();
      for (const record of ledger.results) {
        const group = classFileGroups.find(group => group.id === record.group), prepared = marker.toolchains.find(item => item.feature === 25);
        const directory = path.join(temporary, 'release25', group.id), output = path.join(directory, 'classes');
        fs.mkdirSync(output, {recursive: true}); record.status = 'running'; checkpoint();
        try {
          checkGlobal(); const sourceDigests = sources(group).map(filename => ({path: filename, sha256: sha(fs.readFileSync(filename))}));
          assertCoreCompilerSources(sourceDigests);
          const operation = {kind: 'genuine-driver', command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', '25',
            '-encoding', 'UTF-8', '-proc:none', '-g:source', '-sourcepath', empty, '-classpath', empty, '-d', output, ...sources(group)], sourceDigests};
          record.operations.push(operation); checkpoint();
          try {
            await checkCoreCompilation(operation, () => runCommand(operation.command, operation.arguments,
              {cwd: directory, timeoutMs: classFileTimeouts.compileMs}), () => {checkGlobal(); assertCoreCompilerSources(sourceDigests);}, checkpoint);
          } finally {operation.outputEvidence = captureClassFileOutput(output); checkpoint();}
          record.classFiles = inspectClassFiles(output, 25, group.mainClass);
          record.classpath = {directory: output, treeSha256: treeDigest(output), genuineCompilerBytes: true,
            byteTransformations: false, fallbackClassFiles: false};
          assertClassFileCompilation(record, group, prepared);
          record.inputProofs = proveClassFileInputGroup(group, output, record.classFiles); assertClassFileProofs(record, group); checkpoint();
          const checkLocal = () => integrity(() => {
            assert.deepEqual(inspectClassFiles(output, 25, group.mainClass), record.classFiles);
            assert.deepEqual(proveClassFileInputGroup(group, output, record.classFiles), record.inputProofs);
          });
          for (const cell of record.executions) {
            if (!selectedHosts(ledger.requestedMode).includes(cell.host)) {
              cell.reason = 'Explicit diagnostic mode excludes this mandatory host'; checkpoint(); continue;
            }
            checkGlobal(); checkLocal(); cell.status = 'running'; checkpoint();
            try {
              cell.result = cell.host === 'chromium' ? await session.execute({classesPath: output, mainClass: group.mainClass,
                arguments: [], timeoutMs: classFileTimeouts.guestMs, standardInput: ''}) : await runCommand(
                cell.host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
                [...(cell.host === 'native' ? ['-Xverify:all'] : ['--no-deprecation', runnerPath]), '-cp', output, group.mainClass],
                {cwd: directory, timeoutMs: cell.host === 'native' ? classFileTimeouts.nativeMs : classFileTimeouts.guestMs, standardInput: ''});
              checkpoint(); checkGlobal(); checkLocal();
              const evidence = assertClassFileExecution(cell, record, group, prepared);
              cell.outcomes = evidence.outcomes; cell.artifacts = evidence.artifacts; cell.status = 'passed';
            } catch (error) {
              cell.status = 'failed'; cell.error = error.stack || error.message;
              if (error instanceof CoreIntegrityError) {checkpoint(); throw error;}
            }
            checkpoint();
          }
          record.status = record.executions.filter(cell => selectedHosts(ledger.requestedMode).includes(cell.host))
            .every(cell => cell.status === 'passed') ? 'passed' : 'failed';
          console.log(`${record.status === 'passed' ? 'PASS' : 'FAIL'} classfile ${group.id} Java 25: ${group.cases.length} cases`);
        } catch (error) {
          record.status = 'failed'; record.error = error.stack || error.message;
          for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'Preparation failed: ' + error.message;
          checkpoint(); if (error instanceof CoreIntegrityError) throw error;
        }
        checkpoint();
      }
      checkGlobal(); integrity(checkJdks);
      for (const record of ledger.results) if (record.inputProofs) {
        const group = classFileGroups.find(group => group.id === record.group);
        integrity(() => assert.deepEqual(proveClassFileInputGroup(group, record.classpath.directory, record.classFiles), record.inputProofs));
      }
      ledger.gitEnd = await provenance(); assert.deepEqual(ledger.gitEnd, ledger.gitStart);
      if (ledger.officialGate) assertDerivationProvenance(ledger.gitStart, ledger.gitEnd);
      ledger.browserIntegrity = session ? session.verifyIntegrity() : null;
      ledger.inputIntegrity = {unchanged: true, verifiedAtEnd: true}; ledger.proofIntegrity = {unchanged: true, verifiedAtEnd: true};
      ledger.status = ledger.results.every(record => record.status === 'passed') ? 'passed' : 'failed';
      const cells = ledger.results.flatMap(record => record.executions);
      ledger.summary = {executionCells: cells.length, passed: cells.filter(cell => cell.status === 'passed').length,
        failed: cells.filter(cell => cell.status === 'failed').length, notRun: cells.filter(cell => cell.status === 'not-run').length};
      assertClassFileLedger(ledger, {phase: 'terminal'}); return ledger;
    } finally {try {if (session) await session.close();} finally {fs.rmSync(temporary, {recursive: true, force: true});}}
  }

  async function executeClassFileCli() {
    if (!process.argv[1] || path.resolve(process.argv[1]) !== harnessPath) return;
    const mode = parseClassFileMode(process.argv.slice(2)), ledger = createClassFileLedger(mode);
    const filename = path.join(repoRoot, mode === 'browser' ? 'build/java-classfile-extended-results.json' : `build/java-classfile-extended-${mode}-results.json`);
    const checkpoint = () => writeClassFileLedger(filename, ledger); checkpoint();
    try {await runClassFileApi(ledger, {checkpoint}); if (ledger.status !== 'passed') process.exitCode = 1;}
    catch (error) {
      ledger.status = 'failed'; ledger.error = error.stack || error.message; process.exitCode = 1; console.error(ledger.error);
      for (const record of ledger.results) {
        if (['not-run', 'running'].includes(record.status)) record.status = 'failed';
        for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'Gate stopped: ' + error.message;
      }
    } finally {ledger.finishedAt = new Date().toISOString(); checkpoint();}
  }

  return freeze({classFileScope, classFileGroups, classFileReleases, classFileHosts, classFileTimeouts,
    classFileApplicability: applicability, classFileCompletionFlags: completionFlags, parseClassFileMode, validateClassFileGroups,
    classFileSourceUnits, createClassFileLedger, assertClassFileCompilation, assertClassFileProofs, assertClassFileExecution,
    assertClassFileProvenance, assertClassFileLedger, classFileInputPaths, captureClassFileOutput, writeClassFileLedger,
    runClassFileApi, assertClassFileResult, executeClassFileCli});
}
