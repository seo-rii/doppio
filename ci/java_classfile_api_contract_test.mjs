import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as harness from './java_classfile_api_test.mjs';
import * as core from './java_methodhandle_core_test.mjs';
import * as collection from './java_methodhandle_collection_test.mjs';
import * as variable from './java_methodhandle_varhandle_test.mjs';
import * as bootstrap from './java_methodhandle_bootstrap_test.mjs';
import * as hidden from './java_methodhandle_hidden_class_test.mjs';
import * as nominal from './java_methodhandle_nominal_constant_test.mjs';
import {classFileInputContracts, classFileArtifactContracts, inspectClassFileArtifactBytes,
  assertClassFileInputProofs, proveClassFileArtifact} from './java_classfile_api_bytecode.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = value => JSON.parse(JSON.stringify(value));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const raw = group => ({status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
  error: null, stdout: group.cases.flatMap(entry => entry.trace.map(event => `CASE|${entry.id}|${event}`))
    .concat([group.completionMarker, '']).join('\n'), stderr: ''});

test('C7a independently requires 4x8 cases, four Java25 recipes and twelve mandatory host cells', () => {
  assert.equal(harness.validateClassFileGroups(), 32);
  assert.deepEqual(harness.classFileGroups.map(group => group.id), ['classfile-model', 'classfile-build', 'classfile-transform', 'classfile-verify']);
  assert.deepEqual(harness.classFileGroups.map(group => group.cases.length), [8, 8, 8, 8]);
  assert.ok(Object.isFrozen(harness.classFileGroups));
  for (const group of harness.classFileGroups) for (const entry of group.cases)
    assert.ok(Object.isFrozen(entry.trace) && Object.isFrozen(entry.probes) && Object.isFrozen(entry.callbackMethods) && Object.isFrozen(entry.artifacts));
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = harness.createClassFileLedger(mode);
    assert.equal(ledger.caseCount, 32); assert.equal(ledger.results.length, 4);
    assert.equal(ledger.results.flatMap(record => record.executions).length, 12);
    assert.deepEqual(ledger.requiredReleases, [25]); assert.deepEqual(ledger.requiredHosts, ['native', 'node', 'chromium']);
    assert.equal(ledger.officialGate, mode === 'browser'); harness.assertClassFileLedger(ledger, {phase: 'initial'});
  }
});

test('Java21 absence is an immutable applicability assessment, not a success or skipped Java25 cell', () => {
  assert.deepEqual(harness.classFileApplicability.map(item => [item.release, item.applicable, item.finalApiAvailable, item.finalApiSince]),
    [[21, false, false, 24], [25, true, true, 24]]);
  for (const mutate of [ledger => ledger.applicability.pop(), ledger => ledger.applicability.reverse(),
    ledger => ledger.applicability[0].applicable = true, ledger => ledger.applicability[0].finalApiAvailable = true,
    ledger => ledger.applicability[1].applicable = false, ledger => ledger.applicability[1].status = 'skipped',
    ledger => ledger.applicability[0].finalApiSince = 21, ledger => ledger.applicability[0].reason = 'ignored',
    ledger => ledger.requiredReleases.unshift(21), ledger => ledger.results[0].release = 21,
    ledger => ledger.results[0].executions[0].status = 'skipped']) {
    const ledger = harness.createClassFileLedger(); mutate(ledger); assert.throws(() => harness.assertClassFileLedger(ledger));
  }
});

test('pruned, reordered, substituted and changed source/callback/artifact contracts cannot shrink the exit', () => {
  for (const mutate of [groups => groups.pop(), groups => groups.reverse(), groups => groups[0].cases.pop(),
    groups => groups[0].cases.reverse(), groups => groups[0].cases.push(clone(groups[0].cases[0])),
    groups => groups[0].cases[0].trace.push('ignored'), groups => groups[0].releases.push(21),
    groups => groups[0].source = groups[1].source, groups => groups[0].driverClassNames.pop(),
    groups => groups[0].additionalSources = [], groups => groups[0].javacFlags = ['-g'],
    groups => groups[0].resourceClassNames = [], groups => groups[0].generatedSources = [],
    groups => groups[0].cases[0].probes[0].ignoredSelector = true,
    groups => groups[1].cases[1].callbackMethods = [], groups => groups[1].cases[1].artifacts = [],
    groups => groups[1].cases[1].artifacts[0].definition = 'forbidden',
    groups => groups[1].cases[1].artifacts[0].methods[0].opcodes.push('nop'),
    groups => groups[3].cases[1].artifacts[0].definition = 'define-and-invoke']) {
    const changed = clone(harness.classFileGroups); mutate(changed);
    assert.throws(() => harness.createClassFileLedger('browser', changed));
  }
});

test('all earlier Phase C inventories and ledger namespaces remain independent and two-release', () => {
  for (const earlier of [core, collection, variable, bootstrap, hidden, nominal]) {
    assert.deepEqual(earlier.methodHandleReleases, [21, 25]);
    assert.throws(() => harness.assertClassFileLedger(earlier.createMethodHandleLedger()));
    assert.throws(() => earlier.assertMethodHandleLedger(harness.createClassFileLedger()));
    assert.throws(() => harness.createClassFileLedger('browser', earlier.methodHandleGroups));
  }
});

for (const flag of harness.classFileCompletionFlags) test('finite C7a evidence does not promote ' + flag, () => {
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const original = harness.createClassFileLedger(mode); assert.equal(original[flag], false);
    for (const value of [true, 'false', null, undefined, 0]) {
      const changed = clone(original); changed[flag] = value; assert.throws(() => harness.assertClassFileLedger(changed));
    }
    const changed = clone(original); delete changed[flag]; assert.throws(() => harness.assertClassFileLedger(changed));
  }
});

test('fresh attempts cannot retain stale compilation, raw success, artifacts or terminal state', () => {
  for (const mutate of [ledger => ledger.status = 'passed', ledger => ledger.results[0].status = 'passed',
    ledger => ledger.results[0].operations.push({result: raw(harness.classFileGroups[0])}),
    ledger => ledger.results[0].classFiles = [], ledger => ledger.results[0].inputProofs = {},
    ledger => ledger.results[0].executions[0].result = raw(harness.classFileGroups[0]),
    ledger => ledger.results[0].executions[0].outcomes = [], ledger => ledger.results[0].executions[0].artifacts = []]) {
    const ledger = harness.createClassFileLedger(); mutate(ledger);
    assert.throws(() => harness.assertClassFileLedger(ledger, {phase: 'initial'}));
  }
  const ledger = harness.createClassFileLedger(); ledger.status = 'passed';
  assert.throws(() => harness.assertClassFileLedger(ledger, {phase: 'terminal'}));
});

test('missing/reordered groups, mandatory hosts or literal cases fail ledger inventory checks', () => {
  for (const mutate of [ledger => ledger.results.pop(), ledger => ledger.results.reverse(), ledger => ledger.caseCount--,
    ledger => ledger.results[0].cases.pop(), ledger => ledger.results[0].executions.pop(),
    ledger => ledger.results[0].executions.reverse(), ledger => ledger.requiredHosts.pop(), ledger => ledger.requiredReleases = [],
    ledger => ledger.requestedMode = 'native-only', ledger => ledger.phaseId = 'C6', ledger => ledger.schemaVersion++]) {
    const changed = harness.createClassFileLedger(); mutate(changed); assert.throws(() => harness.assertClassFileLedger(changed));
  }
});

test('API owner stays LIB-007 while original indexed dependent specification owners remain unchanged', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'ci/plan_spec_source_index.json')));
  assert.equal(index.units.filter(unit => unit.ownerPackageId === 'LIB-007').length, 0);
  const originals = new Map(index.units.map(unit => [unit.id, unit]));
  for (const group of harness.classFileGroups) for (const entry of harness.classFileSourceUnits(group, index)) {
    assert.equal(entry.apiOwnerPackageId, 'LIB-007'); assert.equal(entry.fullApiConformanceProven, false);
    assert.ok(entry.sourceUnits.length > 0);
    for (const unit of entry.sourceUnits) {
      assert.match(unit.id, /-25:/); assert.equal(unit.ownerPackageId, originals.get(unit.id).ownerPackageId);
      assert.equal(unit.url, originals.get(unit.id).url); assert.equal(unit.assessmentStatus, originals.get(unit.id).assessmentStatus);
      assert.equal(unit.fullUnitConformanceProven, false);
    }
  }
  assert.throws(() => harness.classFileSourceUnits(harness.classFileGroups[0], {units: []}));
});

test('C7a input digests explicitly bind metadata and executed verifier/pool Java regression sources', () => {
  const paths = harness.classFileInputPaths();
  assert.equal(new Set(paths).size, paths.length, 'Unique original evidence inputs');
  assert.deepEqual(paths, paths.slice().sort(), 'Stable original input digest ordering');
  for (const relative of ['ci/classfile_api_metadata_test.cjs', 'ci/ClassFileVerifierRegression.java', 'ci/ClassFilePoolRegression.java']) {
    const filename = path.join(root, relative);
    assert.equal(paths.filter(candidate => candidate === filename).length, 1,
      'Dedicated CI semantic/metadata input is explicitly source-bound: ' + relative);
    assert.ok(fs.statSync(filename).isFile());
    assert.match(sha(fs.readFileSync(filename)), /^[a-f0-9]{64}$/);
  }
  for (const group of harness.classFileGroups) for (const relative of [group.source, ...group.additionalSources])
    assert.ok(paths.includes(path.join(root, relative)), 'Unchanged genuine Java25 sources remain mandatory');
});

function compilerFixture(group = harness.classFileGroups[0]) {
  const prepared = {feature: 25, home: path.join(os.tmpdir(), 'c7a-receipt-jdk25')};
  const output = path.join(os.tmpdir(), 'c7a-receipt-root', 'release25', group.id, 'classes');
  const empty = path.resolve(output, '..', '..', '..', 'empty-sourcepath');
  const sourcePaths = [group.source, ...group.additionalSources].map(relative => path.join(root, relative));
  const classFiles = group.driverClassNames.map(name => ({path: name.replaceAll('.', '/') + '.class', size: 123,
    sha256: 'a'.repeat(64), major: 69, minor: 0})).sort((a, b) => a.path.localeCompare(b.path));
  const operation = {kind: 'genuine-driver', command: path.join(prepared.home, 'bin/javac'),
    arguments: ['--release', '25', '-encoding', 'UTF-8', '-proc:none', '-g:source', '-sourcepath', empty, '-classpath', empty,
      '-d', output, ...sourcePaths], sourceDigests: sourcePaths.map(filename => ({path: filename, sha256: sha(fs.readFileSync(filename))}))};
  operation.result = {status: 'passed', exitCode: 0, error: null, signal: null, timedOut: false, outputLimitExceeded: false,
    command: [operation.command, ...operation.arguments], cwd: path.dirname(output), timeoutMs: harness.classFileTimeouts.compileMs, stdout: '', stderr: ''};
  operation.outputEvidence = {directory: output, treeSha256: 'b'.repeat(64), files: classFiles.map(({path, size, sha256}) => ({path, size, sha256}))};
  return {group, prepared, record: {release: 25, classFiles, operations: [operation], classpath: {directory: output, treeSha256: 'b'.repeat(64),
    genuineCompilerBytes: true, byteTransformations: false, fallbackClassFiles: false}}};
}

test('original stock javac recipe binds exact release/source flags/raw argv/timeouts/output without adapters', () => {
  const fixture = compilerFixture(); harness.assertClassFileCompilation(fixture.record, fixture.group, fixture.prepared);
  for (const mutate of [record => record.release = 21, record => record.operations.push(clone(record.operations[0])),
    record => record.operations[0].kind = 'original-classfile-generator', record => record.operations[0].arguments[1] = '21',
    record => record.operations[0].arguments[6] = '-g', record => record.operations[0].sourceDigests[0].sha256 = 'f'.repeat(64),
    record => record.operations[0].result.command.pop(), record => record.operations[0].result.cwd = root,
    record => record.operations[0].result.timeoutMs++, record => record.operations[0].result.exitCode = 1,
    record => record.operations[0].result.stdout = 'ignored', record => record.operations[0].result.stderr = 'ignored',
    record => record.operations[0].result.timedOut = true, record => record.operations[0].result.outputLimitExceeded = true,
    record => record.classFiles[0].major = 65, record => record.classFiles[0].minor = 65535,
    record => record.classFiles.pop(), record => record.classpath.genuineCompilerBytes = false,
    record => record.classpath.byteTransformations = true, record => record.classpath.fallbackClassFiles = true,
    record => record.operations[0].outputEvidence.files.pop()]) {
    const record = clone(fixture.record); mutate(record);
    assert.throws(() => harness.assertClassFileCompilation(record, fixture.group, fixture.prepared));
  }
});

test('fixed CASE order, marker and clean bounded raw result are independent of native equality', () => {
  const group = harness.classFileGroups[0], valid = raw(group);
  assert.deepEqual(harness.assertClassFileResult(valid, group, 'node').outcomes, group.cases.map(({id, trace}) => ({id, trace})));
  for (const mutate of [result => result.stdout = '', result => result.stdout = result.stdout.replace(group.completionMarker, ''),
    result => result.stdout += 'ignored\n', result => result.stdout = result.stdout.replace(group.cases[0].trace[0], 'invented'),
    result => result.stdout = result.stdout.split('\n').reverse().join('\n'), result => result.stderr = 'ignored',
    result => result.status = 'failed', result => result.exitCode = 1, result => result.signal = 'SIGTERM',
    result => result.error = 'ignored', result => result.timedOut = true, result => result.outputLimitExceeded = true]) {
    const result = clone(valid); mutate(result); assert.throws(() => harness.assertClassFileResult(result, group, 'node'));
  }
  assert.throws(() => harness.assertClassFileResult(valid, group, 'unknown'));
});

test('artifact transport rejects missing/duplicate/foreign/cross-case/noncanonical byte records', () => {
  const group = harness.classFileGroups[1], valid = raw(group);
  for (const line of ['', 'CF_ARTIFACT|cf-build-empty-model|wrong|AA==',
    'CF_ARTIFACT|cf-build-int-execute|built-empty|AA==', 'CF_ARTIFACT|cf-build-empty-model|built-empty|',
    'CF_ARTIFACT|cf-build-empty-model|built-empty|AA', 'CF_ARTIFACT|cf-build-empty-model|built-empty|!!!!',
    'CF_ARTIFACT|cf-build-empty-model|built-empty|AA==|ignored']) {
    const result = clone(valid); result.stdout = line + '\n' + result.stdout;
    assert.throws(() => harness.assertClassFileResult(result, group, 'node', {}));
  }
});

// Synthetic reader-only byte inputs. They are not original javac sources,
// native/guest API execution or a compatibility substitute. Official gates
// independently compile and run the unchanged genuine source inventory.
function syntheticArtifact(contract, {genericLocals = false, intEncoding = 'bipush', stringWide = false} = {}) {
  const pool = [], cache = new Map();
  const u2 = value => {const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes;};
  const u4 = value => {const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes;};
  const add = (key, bytes, wide = false) => {
    if (cache.has(key)) return cache.get(key);
    const index = pool.length + 1; pool.push(bytes); if (wide) pool.push(null); cache.set(key, index); return index;
  };
  const utf = value => add('u:' + value, Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(value)), Buffer.from(value)]));
  const cls = value => {const index = utf(value.replaceAll('.', '/')); return add('c:' + value, Buffer.concat([Buffer.from([7]), u2(index)]));};
  const ref = (owner, name, descriptor, tag) => {
    const classIndex = cls(owner), nameIndex = utf(name), descriptorIndex = utf(descriptor);
    const nt = add('n:' + name + descriptor, Buffer.concat([Buffer.from([12]), u2(nameIndex), u2(descriptorIndex)]));
    return add('r:' + tag + owner + name + descriptor, Buffer.concat([Buffer.from([tag]), u2(classIndex), u2(nt)]));
  };
  const instruction = operation => {
    const local = operation.match(/^([ailfd]load):([0-3])$/);
    if (local) {
      const opcodes = {iload: [0x15, 0x1a], lload: [0x16, 0x1e], fload: [0x17, 0x22], dload: [0x18, 0x26], aload: [0x19, 0x2a]};
      return Buffer.from(genericLocals ? [opcodes[local[1]][0], Number(local[2])] : [opcodes[local[1]][1] + Number(local[2])]);
    }
    if (operation.startsWith('int:')) {
      const value = Number(operation.slice(4));
      if (intEncoding === 'bipush') return Buffer.from([0x10, value & 255]);
      const bytes = Buffer.alloc(5); bytes[0] = 3; bytes.writeInt32BE(value, 1);
      const index = add('i:' + value, bytes); return Buffer.concat([Buffer.from([0x13]), u2(index)]);
    }
    if (operation.startsWith('double:')) {
      const value = Number(operation.slice(7)), bytes = Buffer.alloc(9); bytes[0] = 6; bytes.writeDoubleBE(value, 1);
      return Buffer.concat([Buffer.from([0x14]), u2(add('d:' + value, bytes, true))]);
    }
    if (operation.startsWith('string:')) {
      const value = operation.slice(7), index = utf(value), constant = add('s:' + value, Buffer.concat([Buffer.from([8]), u2(index)]));
      return stringWide ? Buffer.concat([Buffer.from([0x13]), u2(constant)]) : Buffer.from([0x12, constant]);
    }
    const symbolic = operation.match(/^(invokespecial|getfield|putfield):([^#]+)#([^(:]+)(.+)$/);
    if (symbolic) return Buffer.concat([Buffer.from([{invokespecial: 0xb7, getfield: 0xb4, putfield: 0xb5}[symbolic[1]]]),
      u2(ref(symbolic[2], symbolic[3], symbolic[4], symbolic[1] === 'invokespecial' ? 10 : 9))]);
    const opcode = {ladd: 0x61, dadd: 0x63, ireturn: 0xac, lreturn: 0xad, dreturn: 0xaf, areturn: 0xb0, return: 0xb1, aconst_null: 0x01}[operation];
    assert.notEqual(opcode, undefined); return Buffer.from([opcode]);
  };
  const self = cls(contract.className), parent = cls('java.lang.Object'), codeName = utf('Code');
  const fields = contract.fields.map(field => Buffer.concat([u2(field.flags), u2(utf(field.name)), u2(utf(field.descriptor)), u2(0)]));
  const methods = contract.methods.map(method => {
    const name = utf(method.name), descriptor = utf(method.descriptor), code = Buffer.concat(method.code.map(instruction));
    return Buffer.concat([u2(method.flags), u2(name), u2(descriptor), u2(1), u2(codeName), u4(12 + code.length),
      u2(8), u2(8), u4(code.length), code, u2(0), u2(0)]);
  });
  const attributes = contract.sourceFile === null ? [] : [Buffer.concat([u2(utf('SourceFile')), u4(2), u2(utf(contract.sourceFile))])];
  const header = Buffer.alloc(10); header.writeUInt32BE(0xcafebabe); header.writeUInt16BE(69, 6); header.writeUInt16BE(pool.length + 1, 8);
  return Buffer.concat([header, ...pool.filter(Boolean), u2(contract.flags), u2(self), u2(parent), u2(0),
    u2(fields.length), ...fields, u2(methods.length), ...methods, u2(attributes.length), ...attributes]);
}

test('sixteen literal output artifacts stay distinct from eleven original compiler artifacts', () => {
  assert.deepEqual(harness.classFileGroups.map(group => group.driverClassNames.length), [3, 2, 3, 3]);
  assert.deepEqual(harness.classFileGroups.map(group => group.cases.reduce((sum, entry) => sum + entry.artifacts.length, 0)), [0, 8, 7, 1]);
  assert.equal(Object.values(classFileArtifactContracts).flat().length, 16);
  assert.equal(Object.values(classFileArtifactContracts).flat().reduce((sum, artifact) => sum + artifact.methods.length, 0), 30);
  assert.equal(Object.values(classFileInputContracts).reduce((sum, group) => sum + group.callbacks.length, 0), 28);
  const invalid = classFileArtifactContracts['cf-verify-typed-invalid-return'][0];
  assert.equal(invalid.definition, 'forbidden'); assert.deepEqual(invalid.methods[0].code, ['aconst_null', 'areturn']);
});

for (const [caseId, contracts] of Object.entries(classFileArtifactContracts)) for (const contract of contracts) {
  test('reader-only ' + caseId + ' proves actual generated members/operands and rejects forged bytes', () => {
    const bytes = syntheticArtifact(contract), decoded = inspectClassFileArtifactBytes(bytes, contract);
    assert.equal(decoded.className, contract.className); assert.equal(decoded.sha256, sha(bytes));
    assert.equal(decoded.originalBytesBase64, bytes.toString('base64'));
    const layout = readStructureLayout(bytes);
    for (const mutate of [changed => changed.writeUInt16BE(65, 6), changed => changed.writeUInt16BE(65535, 4),
      changed => changed.writeUInt16BE(contract.flags ^ 0x10, layout.flagsOffset),
      changed => changed.writeUInt16BE(0, layout.thisClassOffset),
      ...(layout.methods.entries.length ? [changed => changed[layout.methods.entries[0].code.instructionsOffset] = 0x00,
        changed => changed.writeUInt16BE(layout.methods.entries[0].flags ^ 0x08, layout.methods.entries[0].start)] : [])]) {
      const changed = Buffer.from(bytes); mutate(changed); assert.throws(() => inspectClassFileArtifactBytes(changed, contract));
    }
    assert.throws(() => inspectClassFileArtifactBytes(bytes.subarray(0, bytes.length - 1), contract));
    assert.throws(() => inspectClassFileArtifactBytes(Buffer.concat([bytes, Buffer.from([0])]), contract));
    assert.throws(() => proveClassFileArtifact(bytes, contract, {host: 'unknown', caseId, record: {}}));
    const foreign = clone(contract); foreign.definition = 'ignored';
    assert.throws(() => proveClassFileArtifact(bytes, foreign, {host: 'node', caseId, record: {}}));
    assert.throws(() => proveClassFileArtifact(bytes, contract, {host: 'node', caseId, record: {release: 25}}),
      'Decoded artifacts alone cannot stand in for original compilation/callback/returned-array proof');
  });
}

test('known encoding equivalents preserve exact full operations/literal values/wide indices/field owners', () => {
  for (const contract of Object.values(classFileArtifactContracts).flat())
    inspectClassFileArtifactBytes(syntheticArtifact(contract, {genericLocals: true, intEncoding: 'ldc_w', stringWide: true}), contract);
  const integer = classFileArtifactContracts['cf-build-int-execute'][0], bytes = syntheticArtifact(integer);
  const layout = readStructureLayout(bytes); bytes[layout.methods.entries[0].code.instructionsOffset + 1] = 41;
  assert.throws(() => inspectClassFileArtifactBytes(bytes, integer));
  const wide = classFileArtifactContracts['cf-build-long-execute'][0], bad = syntheticArtifact(wide, {genericLocals: true});
  const wideLayout = readStructureLayout(bad); bad[wideLayout.methods.entries[0].code.instructionsOffset + 3] = 1;
  assert.throws(() => inspectClassFileArtifactBytes(bad, wide));
});

test('original input proof cannot be replaced by empty classes, generated output or a Java21 recipe', () => {
  const group = harness.classFileGroups[0];
  for (const record of [{release: 21, classFiles: [], inputProofs: {}}, {release: 25, classFiles: [], inputProofs: {}},
    {release: 25, classFiles: [], inputProofs: {classes: []}},
    {release: 25, classFiles: [], inputProofs: {classes: [{originalBytesBase64: 'AA==', classFile: {}}]}}])
    assert.throws(() => assertClassFileInputProofs(record, group));
});

test('strict mode parser rejects filtering, extra flags and diagnostic receipt substitution before writing', () => {
  for (const option of ['--browser', '--native-only', '--diagnostic']) assert.equal(harness.parseClassFileMode([option]), option.slice(2));
  const runner = path.join(root, 'ci/java_classfile_api_test.mjs');
  for (const options of [[], ['--node-only'], ['--browser', '--release', '25'], ['--native-only', '--release', '21'],
    ['--diagnostic', '--group', 'selected'], ['--browser', '--case', 'selected'], ['--browser', '--skip-native']]) {
    assert.throws(() => harness.parseClassFileMode(options));
    const result = spawnSync(process.execPath, [runner, ...options], {cwd: root, encoding: 'utf8', timeout: 8_000, maxBuffer: 1024 * 1024});
    assert.equal(result.error, undefined); assert.notEqual(result.status, 0); assert.match(result.stderr, /Usage: node ci\/java_classfile_api_test\.mjs/);
  }
});

test('dedicated ledger writes keep official/diagnostic namespaces separate and private', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-c7a-write-contract-'));
  try {
    const filename = path.join(directory, 'receipt.json'); harness.writeClassFileLedger(filename, harness.createClassFileLedger());
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    const saved = fs.readFileSync(filename, 'utf8');
    assert.throws(() => harness.writeClassFileLedger(filename, harness.createClassFileLedger('native-only')));
    assert.equal(fs.readFileSync(filename, 'utf8'), saved);
    assert.throws(() => harness.writeClassFileLedger(filename, nominal.createMethodHandleLedger()));
    assert.equal(fs.readFileSync(filename, 'utf8'), saved);
  } finally {fs.rmSync(directory, {recursive: true, force: true});}
});
