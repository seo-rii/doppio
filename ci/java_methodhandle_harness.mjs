import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {coreOpcodeNames, inspectCoreClasses, proveCoreGroup} from './java_core_bytecode.mjs';
import {inspectUserBootstrapClasses, proveUserBootstrapGroup, assertUserBootstrapProofs} from './java_user_bootstrap_bytecode.mjs';
import {generateUserBootstrapFixtures} from './generate_user_bootstrap_fixtures.mjs';
import {hiddenPayloadContracts, proveHiddenClassGroup, assertHiddenClassProofs} from './java_hidden_class_bytecode.mjs';
import {assertCoreCompilerSources, assertCoreResult, checkCoreCompilation, checkCoreExecution,
  CoreIntegrityError} from './java_core_semantics_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};

// Each phase provides an independent literal inventory. Only the
// unchanged compiler/host evidence protocol is shared; no filtered case mode.
export function createMethodHandleHarness({scope, groups, requiredInventory, harnessUrl, contractFilename, ledgerBase, phaseId}) {
  const harnessPath = fileURLToPath(harnessUrl), contractPath = path.join(repoRoot, 'ci', contractFilename);
  const phaseLedgers = {C1: 'java-methodhandle-core', C2: 'java-methodhandle-collection',
    C3: 'java-methodhandle-varhandle', C4: 'java-methodhandle-bootstrap', C5: 'java-methodhandle-hidden-class'};
  const apiOwner = phaseId === 'C4' ? 'JVM-004' : phaseId === 'C5' ? 'JVM-005' : 'JVM-003';
  assert.ok(Object.hasOwn(phaseLedgers, phaseId));
  assert.ok(harnessPath.startsWith(path.join(repoRoot, 'ci') + path.sep));
  assert.match(contractFilename, /^java_methodhandle_[a-z_]+_contract_test\.mjs$/);
  assert.match(ledgerBase, /^java-methodhandle-(?:core|collection|varhandle|bootstrap|hidden-class)$/);
  assert.equal(ledgerBase, phaseLedgers[phaseId],
    'Each phase retains its own official and diagnostic ledger namespace');
  const methodHandleScope = scope;
  const methodHandleGroups = freeze(groups);
  const methodHandleReleases = Object.freeze([21, 25]);
  const methodHandleHosts = Object.freeze(['native', 'node', 'chromium']);
  const methodHandleTimeouts = Object.freeze({compileMs: 60_000, nativeMs: 30_000, guestMs: 60_000});
  const modes = Object.freeze(['browser', 'native-only', 'diagnostic']);
  const flags = Object.freeze(['phaseCComplete', 'jvm003Complete', 'fullSourceUnitConformanceProven',
    'fullApiConformanceProven', 'generalBootstrapConformanceProven', 'varHandleExecutionConformanceProven',
    'namedModuleRuntimeConformanceProven', ...(phaseId === 'C3' ?
      ['varHandleMemoryOrderingConformanceProven', 'varHandleConcurrentVisibilityConformanceProven'] : []),
    ...(phaseId === 'C4' ? ['bootstrapConcurrentLinkageConformanceProven', 'bootstrapMaximalArityConformanceProven'] : []),
    ...(phaseId === 'C5' ? ['hiddenClassGarbageCollectionConformanceProven', 'hiddenClassNamedModuleConformanceProven'] : [])]);
  const inventory = freeze(requiredInventory);
  const selectedHosts = mode => mode === 'native-only' ? ['native'] : mode === 'diagnostic' ? ['native', 'node'] : methodHandleHosts;
  const records = () => methodHandleReleases.flatMap(release => methodHandleGroups.map(group => ({release, group})));
  const sources = group => [group.source, ...(group.additionalSources || [])].map(relative => path.join(repoRoot, relative));
  const originalGeneratedFiles = (group, release) => generateUserBootstrapFixtures(group.generatedClassFixture.group, release)
    .map(file => ({path: file.className.replaceAll('.', '/') + '.class', size: file.bytes.length, sha256: sha(file.bytes),
      major: release + 44, minor: 0}));
  const bytecodeProofs = (group, directory, files) => (phaseId === 'C4' ?
    proveUserBootstrapGroup(group, inspectUserBootstrapClasses(directory, files)) :
    proveCoreGroup(group, inspectCoreClasses(directory, files)))
    .map(proof => ({...proof, fullSourceUnitConformanceProven: false}));
  const integrity = check => { try { check(); } catch (error) { throw new CoreIntegrityError(error.message, {cause: error}); } };
  const binaryName = value => typeof value === 'string' && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(value);
  const validateBootstrapOperand = value => {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value));
    const fields = [17, 18].includes(value.tag) ? ['tag', 'name', 'descriptor', 'bootstrap'] : value.tag === 15 ?
      ['tag', 'referenceKind', 'reference'] : value.tag === 16 ? ['tag', 'descriptor'] : [9, 10, 11].includes(value.tag) ?
        ['tag', 'owner', 'name', 'descriptor'] : ['tag', 'value'];
    assert.deepEqual(Object.keys(value).sort(), fields.sort(), 'No ignored bootstrap CP obligation fields');
    assert.ok([3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18].includes(value.tag));
    for (const key of ['owner', 'name', 'descriptor']) if (fields.includes(key)) assert.ok(typeof value[key] === 'string' && value[key].length > 0);
    if ([17, 18].includes(value.tag)) {
      assert.deepEqual(Object.keys(value.bootstrap).sort(), ['arguments', 'method']);
      validateBootstrapOperand(value.bootstrap.method); assert.equal(value.bootstrap.method.tag, 15);
      assert.ok([6, 8].includes(value.bootstrap.method.referenceKind));
      assert.ok(Array.isArray(value.bootstrap.arguments));
      value.bootstrap.arguments.forEach(validateBootstrapOperand);
    } else if (value.tag === 15) {
      assert.ok(Number.isInteger(value.referenceKind) && value.referenceKind >= 1 && value.referenceKind <= 9);
      validateBootstrapOperand(value.reference); assert.ok([9, 10, 11].includes(value.reference.tag));
    } else if ([7, 8, 5].includes(value.tag)) assert.ok(typeof value.value === 'string' && value.value.length > 0);
    else if ([3, 4, 6].includes(value.tag)) assert.equal(typeof value.value, 'number');
  };

  function parseMethodHandleMode(options) {
    assert.ok(Array.isArray(options) && options.length === 1 && ['--browser', '--native-only', '--diagnostic'].includes(options[0]),
      'Usage: node ci/' + path.basename(harnessPath) + ' --browser | --native-only | --diagnostic');
    return options[0] === '--browser' ? 'browser' : options[0] === '--native-only' ? 'native-only' : 'diagnostic';
  }

  function validateMethodHandleGroups(groups = methodHandleGroups) {
    assert.deepEqual(groups.map(group => group.id), inventory.map(group => group.id), 'Exact mandatory ' + phaseId + ' groups');
    const allIds = new Set();
    for (const [n, group] of groups.entries()) {
      assert.deepEqual(group.cases.map(entry => entry.id), inventory[n].ids, 'Independent mandatory ' + phaseId + ' case IDs');
      assert.deepEqual(group.releases, methodHandleReleases, 'Both final-profile releases');
      const prefix = phaseId === 'C3' ? 'VarHandle' : phaseId === 'C4' ? 'Bootstrap' : phaseId === 'C5' ? 'HiddenClass' : 'MethodHandle';
      assert.match(group.source, new RegExp('^classes/modern_fixture/' + prefix + '[A-Za-z]+Final\\.java$'));
      assert.match(group.mainClass, new RegExp('^classes\\.modern_test\\.' + prefix + '[A-Za-z]+Final$'));
      assert.match(group.completionMarker, phaseId === 'C3' ? /^VARHANDLE_[A-Z_]+_OK$/ : phaseId === 'C4' ? /^BOOTSTRAP_[A-Z_]+_OK$/ :
        phaseId === 'C5' ? /^HIDDEN_CLASS_[A-Z_]+_OK$/ : /^METHODHANDLE_[A-Z_]+_OK$/);
      assert.ok(group.cases.length > 0, 'Nonempty ' + phaseId + ' corpus');
      assert.ok(Array.isArray(group.driverClassNames) && group.driverClassNames.includes(group.mainClass) &&
        group.driverClassNames.every(binaryName) && new Set(group.driverClassNames).size === group.driverClassNames.length,
      'Exact genuine compiler class inventory');
      assert.ok(!group.generatedSources && !group.mutatePayload && !group.carrierSources && !group.compilationUnits,
        'No generated carrier, class transformations or fallback');
      if (phaseId === 'C4') {
        assert.deepEqual(group.generatedClassFixture, {generator: 'ci/generate_user_bootstrap_fixtures.mjs',
          group: group.id.replace('bootstrap-', ''), classNames: [group.mainClass.replace(/Final$/, 'Calls')]},
        'Exact original C4 class-file generation recipe, never a javac carrier rewrite');
        assert.ok(group.driverClassNames.includes(group.generatedClassFixture.classNames[0]));
      } else assert.ok(!Object.hasOwn(group, 'generatedClassFixture'), 'Only C4 has original generated inputs');
      if (phaseId === 'C5') {
        const expected = hiddenPayloadContracts[group.id]; assert.ok(expected, 'Independent literal hidden-class payload group');
        assert.equal(group.mainClass, expected.mainClass, 'Independent hidden-class driver identity');
        assert.deepEqual(group.hiddenPayloads, expected.payloads.map(payload => payload.name),
          'Independent complete original hidden-class payload inventory');
        assert.deepEqual([...group.driverClassNames].sort(),
          [expected.mainClass, 'classes.modern_test.HiddenClassSupport', ...expected.payloads.map(payload => payload.name)].sort(),
        'Exact original C5 main/support/payload compiler inventory');
      } else assert.ok(!Object.hasOwn(group, 'hiddenPayloads'), 'Only C5 owns hidden-class payload proof inputs');
      const extra = group.additionalSources || [];
      if (phaseId === 'C3') assert.equal(extra.length, 0, 'C3 uses original explicit driver units only');
      assert.ok(Array.isArray(extra) && extra.every(source => phaseId === 'C4' ? source === 'classes/modern_fixture/BootstrapTestSupport.java' :
        phaseId === 'C5' ? ['classes/modern_fixture/hiddenclass/HiddenClassSupport.java',
          'classes/modern_fixture/hiddenclass/foreign/ForeignPayload.java'].includes(source) :
          /^classes\/modern_fixture\/methodhandle_lookup\/[A-Za-z0-9_]+\.java$/.test(source)),
        'Explicit bounded Lookup companion sources');
      if (phaseId === 'C4') assert.deepEqual(extra, ['classes/modern_fixture/BootstrapTestSupport.java']);
      if (phaseId === 'C5') assert.deepEqual(extra, ['classes/modern_fixture/hiddenclass/HiddenClassSupport.java',
        ...(group.id === 'hidden-class-definition' ? ['classes/modern_fixture/hiddenclass/foreign/ForeignPayload.java'] : [])],
      'Exact C5 genuine javac support/package-rejection sources');
      assert.equal(new Set([group.source, ...extra]).size, 1 + extra.length, 'Unique compiler sources');
      for (const entry of group.cases) {
        assert.match(entry.id, /^[a-z][a-z0-9-]*$/); assert.ok(!allIds.has(entry.id), 'Unique ' + phaseId + ' case ID'); allIds.add(entry.id);
        assert.match(entry.entryMethod, /^case[A-Za-z0-9]+$/); assert.equal(entry.entryDescriptor, '()V');
        assert.ok(Array.isArray(entry.trace) && entry.trace.length > 0 && entry.trace.every(event =>
          typeof event === 'string' && event.length > 0 && !/[\r\n]/.test(event)), 'Fixed ordered trace');
        assert.ok(['specification', 'pinned-native-regression'].includes(entry.oracleKind), 'Explicit bounded oracle classification');
        assert.ok(Array.isArray(entry.limitations) && entry.limitations.length > 0 && entry.limitations.every(value => typeof value === 'string' && value.length > 0),
          'Explicit selected-case limitations');
        assert.ok(Array.isArray(entry.primarySources) && entry.primarySources.length > 0 && entry.primarySources.every(url =>
          /^https:\/\/docs\.oracle\.com\/(?:en\/java\/javase\/(?:21|25)\/docs\/api\/java\.base\/java\/lang\/invoke\/|javase\/specs\/)/.test(url) ||
          phaseId === 'C5' && /^https:\/\/docs\.oracle\.com\/en\/java\/javase\/(?:21|25)\/docs\/api\/java\.base\/java\/lang\/(?:Class|reflect\/Field)\.html$/.test(url)),
        'Primary API/specification contract sources');
        assert.ok(entry.anchors && Object.keys(entry.anchors).length > 0 && Object.entries(entry.anchors).every(([spec, anchors]) =>
          ['JLS', 'JVMS'].includes(spec) && Array.isArray(anchors) && anchors.length > 0 && anchors.every(anchor => typeof anchor === 'string' && anchor.length > 0)),
        'Indexed dependent specification obligations');
        assert.ok(Array.isArray(entry.probes) && entry.probes.length > 0, 'Actual executable Code probes');
        for (const probe of entry.probes) {
          assert.ok(Object.keys(probe).every(key => ['className', 'method', 'descriptor', 'requiredOpcodes', 'symbolicOperands',
            ...(phaseId === 'C4' ? ['dynamicOperands', 'sameConstantPoolAs', 'sameConstantPoolWithinMethod'] : [])].includes(key)),
            'No ignored method handle probe fields');
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
          if (phaseId === 'C4' && probe.dynamicOperands !== undefined) {
            assert.ok(Array.isArray(probe.dynamicOperands) && probe.dynamicOperands.length > 0);
            for (const operand of probe.dynamicOperands) {
              assert.ok(Object.keys(operand).every(key => ['opcode', 'cp', 'count'].includes(key)));
              assert.ok(['ldc', 'ldc_w', 'ldc2_w', 'invokedynamic'].includes(operand.opcode));
              assert.ok([17, 18].includes(operand.cp?.tag) && typeof operand.cp.name === 'string' &&
                typeof operand.cp.descriptor === 'string' && operand.cp.bootstrap?.method?.tag === 15);
              validateBootstrapOperand(operand.cp);
              assert.ok(operand.count === undefined || Number.isInteger(operand.count) && operand.count > 0);
            }
          }
          if (probe.sameConstantPoolAs) assert.deepEqual(Object.keys(probe.sameConstantPoolAs).sort(), ['descriptor', 'method', 'tag']);
          if (probe.sameConstantPoolWithinMethod) assert.deepEqual(Object.keys(probe.sameConstantPoolWithinMethod).sort(), ['count', 'tag']);
        }
      }
      if (groups !== methodHandleGroups) assert.deepEqual(group, methodHandleGroups[n], 'No changed compiler/case contracts');
    }
    return allIds.size;
  }

  function methodHandleSourceUnits(group, index) {
    const units = new Map(index.units.map(unit => [unit.id, unit]));
    return group.cases.map(entry => ({id: entry.id, apiOwnerPackageId: apiOwner, primarySources: entry.primarySources,
      fullApiConformanceProven: false, sourceUnits: methodHandleReleases.flatMap(release => Object.entries(entry.anchors)
        .flatMap(([spec, anchors]) => anchors.map(anchor => {
          const id = `${spec}-${release}:${spec.toLowerCase()}-${anchor}`, unit = units.get(id);
          assert.ok(unit, 'Existing indexed method handle dependent clause ' + id);
          return {id, url: unit.url, ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus,
            fullUnitConformanceProven: false};
        })))}));
  }

  function createMethodHandleLedger(mode = 'browser', groups = methodHandleGroups) {
    assert.ok(modes.includes(mode), 'Known method handle execution mode');
    const ledger = {schemaVersion: 1, scope: methodHandleScope, requestedMode: mode, officialGate: mode === 'browser',
      status: 'running', startedAt: new Date().toISOString(), requiredReleases: [...methodHandleReleases], requiredHosts: [...methodHandleHosts],
      caseCount: validateMethodHandleGroups(groups), ...Object.fromEntries(flags.map(flag => [flag, false])),
      results: methodHandleReleases.flatMap(release => groups.map(group => ({release, group: group.id, status: 'not-run',
        cases: structuredClone(group.cases), driverClassNames: [...group.driverClassNames], operations: [],
        executions: methodHandleHosts.map(host => ({host, status: 'not-run', reason: 'awaiting genuine compilation'}))})))};
    assertMethodHandleLedger(ledger, {phase: 'initial'}); return ledger;
  }

  function assertMethodHandleCompilation(record, group, prepared) {
    assert.equal(prepared.feature, record.release, 'Matching locked compiler edition');
    assert.equal(record.operations.length, phaseId === 'C4' ? 2 : 1, 'Exactly one original javac attempt' +
      (phaseId === 'C4' ? ' and one original C4 generator' : ''));
    const operation = record.operations.at(-1), output = record.classpath?.directory;
    assert.equal(operation.kind, 'genuine-driver');
    assert.ok(typeof output === 'string' && path.isAbsolute(output), 'Private original compiler destination');
    const empty = path.resolve(output, '..', '..', '..', 'empty-sourcepath');
    assert.equal(operation.command, path.join(prepared.home, 'bin/javac'), 'Original locked compiler command');
    assert.deepEqual(operation.arguments, ['--release', String(record.release), '-encoding', 'UTF-8', '-proc:none', '-g',
      '-sourcepath', empty, '-classpath', phaseId === 'C4' ? output : empty, '-d', output, ...sources(group)], 'Exact genuine no-fallback compiler recipe');
    assert.deepEqual(operation.sourceDigests, sources(group).map(filename => ({path: filename, sha256: sha(fs.readFileSync(filename))})),
      'Actual pre-javac compiler source hashes');
    const result = operation.result;
    assert.deepEqual(result?.command, [operation.command, ...operation.arguments], 'Raw compiler execution binds original recipe');
    assert.equal(result.cwd, path.dirname(output)); assert.equal(result.timeoutMs, methodHandleTimeouts.compileMs);
    assert.ok(result.status === 'passed' && result.exitCode === 0 && !result.error && !result.signal && !result.timedOut &&
      !result.outputLimitExceeded && result.stdout === '' && result.stderr === '', 'Raw clean compiler outcome');
    assert.deepEqual(record.classFiles?.map(file => file.path), group.driverClassNames.map(name => name.replaceAll('.', '/') + '.class').sort(),
      'Exact untouched original class inventory');
    for (const file of record.classFiles) assert.ok(file.major === record.release + 44 && file.minor === 0 &&
      /^[a-f0-9]{64}$/.test(file.sha256) && Number.isInteger(file.size) && file.size > 8, 'Genuine version/hash evidence');
    assert.ok(record.classpath.genuineCompilerBytes === (phaseId !== 'C4') && record.classpath.byteTransformations === false &&
      record.classpath.fallbackClassFiles === false, 'No transformed or fallback compiler bytes');
    if (phaseId === 'C4') {
      const generator = record.operations[0], generated = originalGeneratedFiles(group, record.release);
      const generatorPath = path.join(repoRoot, group.generatedClassFixture.generator);
      assert.equal(generator.kind, 'original-classfile-generator'); assert.equal(generator.command, process.execPath);
      assert.deepEqual(generator.arguments, [generatorPath, '--group', group.generatedClassFixture.group,
        '--release', String(record.release), '--output', output]);
      assert.deepEqual(generator.sourceDigests, [{path: generatorPath, sha256: sha(fs.readFileSync(generatorPath))}]);
      assert.deepEqual(generator.result?.command, [generator.command, ...generator.arguments]);
      assert.equal(generator.result?.cwd, path.dirname(output)); assert.equal(generator.result?.timeoutMs, methodHandleTimeouts.compileMs);
      assert.ok(generator.result?.status === 'passed' && generator.result.exitCode === 0 && !generator.result.error && !generator.result.signal &&
        !generator.result.timedOut && !generator.result.outputLimitExceeded && generator.result.stdout === '' && generator.result.stderr === '');
      assert.deepEqual(generator.generatedOutputEvidence, {directory: output, files: generated.map(({path, size, sha256}) => ({path, size, sha256}))});
      for (const file of generated) assert.deepEqual(record.classFiles.find(actual => actual.path === file.path), file,
        'Generated bytes preserved untouched across javac and every host');
      assert.equal(record.classpath.originalGeneratedClassFiles, true);
      assert.deepEqual(record.classpath.generatedClassNames, group.generatedClassFixture.classNames);
    }
    assert.equal(operation.outputEvidence?.directory, output);
    assert.equal(operation.outputEvidence.treeSha256, record.classpath.treeSha256);
    assert.deepEqual(operation.outputEvidence.files, record.classFiles.map(({path, size, sha256}) => ({path, size, sha256})),
      'Exact per-attempt compiler output evidence');
  }

  function assertMethodHandleProofs(record, group) {
    assert.deepEqual(record.bytecodeProofs?.map(proof => proof.id), group.cases.map(entry => entry.id), 'Every independent method handle case proof');
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
    if (phaseId === 'C4') assertUserBootstrapProofs(record, group);
    if (phaseId === 'C5') assertHiddenClassProofs(record, group);
  }

  function assertMethodHandleExecution(cell, record, group, prepared) {
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

  function assertMethodHandleProvenance(ledger, marker, lock) {
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

  function assertMethodHandleLedger(ledger, {phase = 'inventory'} = {}) {
    assert.ok(['inventory', 'initial', 'terminal'].includes(phase));
    assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, methodHandleScope);
    assert.ok(modes.includes(ledger.requestedMode)); assert.equal(ledger.officialGate, ledger.requestedMode === 'browser');
    assert.deepEqual(ledger.requiredReleases, methodHandleReleases); assert.deepEqual(ledger.requiredHosts, methodHandleHosts);
    flags.forEach(flag => assert.equal(ledger[flag], false, 'Selected method handles do not complete broad conformance: ' + flag));
    assert.equal(ledger.caseCount, validateMethodHandleGroups());
    const expected = records();
    assert.deepEqual(ledger.results.map(record => [record.release, record.group]), expected.map(({release, group}) => [release, group.id]),
      'Exact mandatory release/group records');
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
      assert.deepEqual(ledger.summary, {executionCells: records().length * methodHandleHosts.length, passed: cells.filter(cell => cell.status === 'passed').length,
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
  function methodHandleInputPaths() {
    return [...new Set([...localImportClosure([harnessPath, contractPath]),
      ...methodHandleGroups.flatMap(sources), ...['ci/plan_spec_source_index.json', 'ci/java_compatibility_toolchains.lock.json',
        'build/java-compatibility-toolchains/toolchains.json', 'package.json', 'yarn.lock', '.github/workflows/modern-java.yml']
        .map(relative => path.join(repoRoot, relative)), process.execPath])];
  }
  function captureMethodHandleOutput(directory) {
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
  function writeMethodHandleLedger(filename, ledger) {
    assert.equal(ledger.scope, methodHandleScope); assert.equal(ledger.schemaVersion, 1);
    fs.mkdirSync(path.dirname(filename), {recursive: true}); assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink());
    if (fs.existsSync(filename)) { const stat = fs.lstatSync(filename); assert.ok(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink());
      const previous = JSON.parse(fs.readFileSync(filename)); assert.equal(previous.scope, methodHandleScope);
      assert.equal(previous.officialGate, ledger.officialGate, 'Diagnostics never replace official ' + phaseId + ' evidence'); }
    const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try { fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600}); fs.renameSync(temporary, filename); }
    finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  async function provenance() {
    const read = async args => { const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10_000});
      assert.equal(result.status, 'passed'); return result.stdout.trim(); };
    return {commit: await read(['rev-parse', '--verify', 'HEAD']), trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
  }

  async function runMethodHandleCore(ledger, {checkpoint = () => {}} = {}) {
    assertMethodHandleLedger(ledger, {phase: 'initial'});
    const nativeOnly = ledger.requestedMode === 'native-only', browser = ledger.requestedMode === 'browser';
    const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
    const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes);
    const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
    validateToolchains(marker, lock, sha(lockBytes), methodHandleReleases);
    const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/plan_spec_source_index.json')));
    ledger.sourceUnits = methodHandleGroups.map(group => ({group: group.id, cases: methodHandleSourceUnits(group, index)}));
    ledger.directlyOwnedSpecUnitCount = index.units.filter(unit => unit.ownerPackageId === apiOwner).length;
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
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-' + ledgerBase + '-')); fs.chmodSync(temporary, 0o700);
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
          if (phaseId === 'C4') {
            const generatorPath = path.join(repoRoot, group.generatedClassFixture.generator);
            const generator = {kind: 'original-classfile-generator', command: process.execPath,
              arguments: [generatorPath, '--group', group.generatedClassFixture.group, '--release', String(record.release), '--output', output],
              sourceDigests: [{path: generatorPath, sha256: sha(fs.readFileSync(generatorPath))}]};
            record.operations.push(generator); checkpoint();
            await checkCoreCompilation(generator, () => runCommand(generator.command, generator.arguments,
              {cwd: directory, timeoutMs: methodHandleTimeouts.compileMs}), () => {checkGlobal(); assertCoreCompilerSources(generator.sourceDigests);}, checkpoint);
            generator.generatedOutputEvidence = {directory: output, files: captureMethodHandleOutput(output).files}; checkpoint();
            assert.deepEqual(generator.generatedOutputEvidence.files, originalGeneratedFiles(group, record.release)
              .map(({path, size, sha256}) => ({path, size, sha256})));
          }
          const operation = {kind: 'genuine-driver', command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(record.release),
            '-encoding', 'UTF-8', '-proc:none', '-g', '-sourcepath', empty, '-classpath', phaseId === 'C4' ? output : empty,
            '-d', output, ...sources(group)], sourceDigests};
          record.operations.push(operation); checkpoint();
          try { await checkCoreCompilation(operation, () => runCommand(operation.command, operation.arguments,
            {cwd: directory, timeoutMs: methodHandleTimeouts.compileMs}), () => {checkGlobal(); assertCoreCompilerSources(sourceDigests);}, checkpoint); }
          finally { operation.outputEvidence = captureMethodHandleOutput(output); checkpoint(); }
          record.classFiles = inspectClassFiles(output, record.release, group.mainClass);
          record.classpath = {directory: output, treeSha256: treeDigest(output), genuineCompilerBytes: phaseId !== 'C4', byteTransformations: false,
            fallbackClassFiles: false, ...(phaseId === 'C4' ? {originalGeneratedClassFiles: true, generatedClassNames: [...group.generatedClassFixture.classNames]} : {})};
          assertMethodHandleCompilation(record, group, prepared);
          record.bytecodeProofs = bytecodeProofs(group, output, record.classFiles);
          if (phaseId === 'C5') record.hiddenPayloadProofs = proveHiddenClassGroup(group, output, record.classFiles);
          assertMethodHandleProofs(record, group); checkpoint();
          const checkLocal = () => integrity(() => {
            assert.deepEqual(inspectClassFiles(output, record.release, group.mainClass), record.classFiles, 'Original classes unchanged');
            assert.deepEqual(bytecodeProofs(group, output, record.classFiles), record.bytecodeProofs, 'Actual Code proof replay');
            if (phaseId === 'C5') assert.deepEqual(proveHiddenClassGroup(group, output, record.classFiles), record.hiddenPayloadProofs,
              'Original hidden-class payload proof replay');
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
        integrity(() => {
          assert.deepEqual(bytecodeProofs(group, record.classpath.directory, record.classFiles), record.bytecodeProofs);
          if (phaseId === 'C5') assert.deepEqual(proveHiddenClassGroup(group, record.classpath.directory, record.classFiles), record.hiddenPayloadProofs);
        });
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

  async function executeMethodHandleCli() {
    if (!process.argv[1] || path.resolve(process.argv[1]) !== harnessPath) return;
    // Reject filtered/ambiguous commands before any prior official evidence can
    // be touched, including an initial checkpoint with no executed host.
    const mode = parseMethodHandleMode(process.argv.slice(2));
    const ledger = createMethodHandleLedger(mode), filename = path.join(repoRoot, mode === 'browser' ? `build/${ledgerBase}-results.json` :
      `build/${ledgerBase}-${mode}-results.json`);
    const checkpoint = () => writeMethodHandleLedger(filename, ledger); checkpoint();
    try {await runMethodHandleCore(ledger, {checkpoint}); if (ledger.status !== 'passed') process.exitCode = 1;
    } catch (error) { ledger.status = 'failed'; ledger.error = error.stack || error.message; process.exitCode = 1; console.error(ledger.error);
      for (const record of ledger.results) {if (['not-run', 'running'].includes(record.status)) record.status = 'failed';
        for (const cell of record.executions) if (cell.status === 'not-run') cell.reason = 'Gate stopped: ' + error.message;}
    } finally {ledger.finishedAt = new Date().toISOString(); checkpoint();}
  }
  return Object.freeze({methodHandleScope, methodHandleGroups, methodHandleReleases, methodHandleHosts, methodHandleTimeouts, parseMethodHandleMode, validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger, assertMethodHandleCompilation, assertMethodHandleProofs, assertMethodHandleExecution, assertMethodHandleProvenance, assertMethodHandleLedger, methodHandleInputPaths, captureMethodHandleOutput, writeMethodHandleLedger, runMethodHandleCore, executeMethodHandleCli});
}

