import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains } from './run_java_compatibility.mjs';
import { treeDigest } from './prepare_java_compatibility_toolchains.mjs';

const harnessPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(harnessPath), '..');
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaClassStructure.java');
const mainClass = 'classes.modern_test.JavaClassStructure';
const targetPath = `${mainClass.replaceAll('.', '/')}$Target.class`;
export const structureLedgerScope = 'JVM-002 B2 class, member, attribute, Code and StackMapTable structural controls';
const formatError = 'java.lang.ClassFormatError';
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const normalize = (value) => value.replaceAll('\r\n', '\n');

export function structureCases() {
  const groups = [
    ['4.1', ['this-class-zero', 'this-class-out-of-range', 'this-class-wrong-tag',
      'super-class-zero', 'super-class-wrong-tag', 'interface-wrong-tag', 'class-final-abstract']],
    ['4.4', ['cp-class-name-wrong-tag', 'cp-member-class-wrong-tag', 'cp-member-name-type-wrong-tag',
      'truncated-constant-pool']],
    ['4.5', ['field-name-zero', 'field-name-wrong-tag', 'field-descriptor-wrong-tag',
      'field-invalid-descriptor', 'field-final-volatile', 'duplicate-field']],
    ['4.6', ['method-name-zero', 'method-name-wrong-tag', 'method-descriptor-wrong-tag',
      'method-invalid-descriptor', 'method-final-abstract', 'duplicate-method']],
    ['4.7', ['attribute-name-wrong-tag', 'attribute-length-short', 'attribute-length-long', 'truncated-class']],
    ['4.7.3', ['duplicate-code', 'missing-code', 'native-method-with-code', 'code-length-zero',
      'code-length-oversized', 'handler-empty-range', 'handler-end-past-code', 'handler-target-past-code',
      'handler-catch-wrong-tag', 'handler-catch-out-of-range']],
    ['4.7.4', ['duplicate-stack-map', 'stack-map-reserved-frame', 'stack-map-invalid-verification-type',
      'stack-map-object-wrong-tag', 'stack-map-truncated-frame']],
  ];
  const opaqueControls = ['opaque-annotations-empty', 'opaque-annotations-short', 'opaque-annotations-trailing',
    'opaque-annotations-bad-tag', 'opaque-type-annotations', 'opaque-parameter-annotations', 'opaque-annotation-default'];
  return [{ id: 'genuine-control', expected: 'accepted', mutation: false, section: '4.8' },
    ...opaqueControls.map(id => ({ id, expected: 'accepted', mutation: true, section: '4.7' })),
    ...groups.flatMap(([section, ids]) => ids.map(id => ({ id, expected: formatError, mutation: true, section })))]
    .map(entry => ({ ...entry, controlKind: !entry.mutation ? 'genuine-compiler-output' :
      entry.expected === 'accepted' ? 'opaque-attribute-acceptance' : 'negative-structure',
    packageId: 'JVM-002', specificationRefs: Object.fromEntries([21, 25].map(release =>
      [release, `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-4.html#jvms-${entry.section}`])) }));
}

// This is an offset reader for our untouched javac fixture, not a VM verifier.
// Keeping every edit relative to its original layout makes mutations auditable.
export function readStructureLayout(bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 10 && bytes.readUInt32BE(0) === 0xcafebabe,
    'A genuine complete class-file input is required');
  let offset = 8;
  function take(length) {
    assert.ok(Number.isInteger(length) && length >= 0 && offset + length <= bytes.length,
      'Truncated fixture structure');
    const start = offset;
    offset += length;
    return start;
  }
  const u1 = () => bytes[take(1)];
  const u2 = () => bytes.readUInt16BE(take(2));
  const u4 = () => bytes.readUInt32BE(take(4));
  const pool = Array(u2());
  for (let index = 1; index < pool.length; index++) {
    const start = offset;
    const tag = u1();
    const entry = { index, start, tag };
    switch (tag) {
      case 1: {
        const length = u2();
        entry.dataOffset = offset;
        entry.value = bytes.subarray(take(length), offset).toString('utf8');
        break;
      }
      case 3: case 4: take(4); break;
      case 5: case 6: take(8); index++; break;
      case 7: case 8: case 16: case 19: case 20: entry.first = u2(); break;
      case 9: case 10: case 11: case 12: case 17: case 18: entry.first = u2(); entry.second = u2(); break;
      case 15: take(3); break;
      default: assert.fail(`Unexpected genuine constant-pool tag ${tag}`);
    }
    entry.end = offset;
    pool[entry.index] = entry;
  }
  const utf = index => {
    assert.equal(pool[index]?.tag, 1, 'Genuine metadata must reference UTF-8 constants');
    return pool[index].value;
  };
  function attributes() {
    const countOffset = offset;
    const count = u2();
    const entries = [];
    for (let index = 0; index < count; index++) {
      const start = offset;
      const nameIndex = u2();
      const length = u4();
      const body = take(length);
      entries.push({ start, end: offset, nameIndex, name: utf(nameIndex), length, body });
    }
    return { countOffset, entries, end: offset };
  }
  function members() {
    const countOffset = offset;
    const count = u2();
    const entries = [];
    for (let index = 0; index < count; index++) {
      const start = offset;
      const flags = u2();
      const nameIndex = u2();
      const descriptorIndex = u2();
      const attrs = attributes();
      entries.push({ start, end: offset, flags, nameIndex, name: utf(nameIndex), descriptorIndex,
        descriptor: utf(descriptorIndex), attributes: attrs });
    }
    return { countOffset, entries, end: offset };
  }
  const flagsOffset = offset;
  const flags = u2();
  const thisClassOffset = offset;
  const thisClass = u2();
  const superClassOffset = offset;
  u2();
  const interfaceCount = u2();
  const interfacesOffset = take(interfaceCount * 2);
  const fields = members();
  const methods = members();
  const attrs = attributes();
  assert.equal(offset, bytes.length, 'No trailing bytes in the genuine fixture');
  for (const method of methods.entries) {
    const code = method.attributes.entries.find(attr => attr.name === 'Code');
    if (!code) continue;
    offset = code.body;
    code.maxStack = u2();
    code.maxLocals = u2();
    code.codeLengthOffset = offset;
    code.codeLength = u4();
    code.instructionsOffset = take(code.codeLength);
    code.handlerCount = u2();
    code.handlersOffset = take(code.handlerCount * 8);
    code.attributes = attributes();
    assert.equal(offset, code.end, 'Exact genuine Code attribute size');
    method.code = code;
  }
  return { pool, flagsOffset, flags, thisClassOffset, thisClass, superClassOffset,
    interfaceCount, interfacesOffset, fields, methods, attributes: attrs };
}

function verificationTypeOffsets(bytes, attribute) {
  let offset = attribute.body;
  const count = bytes.readUInt16BE(offset);
  offset += 2;
  const entries = [];
  function type() {
    const start = offset;
    const tag = bytes[offset++];
    assert.ok(tag <= 8, 'Genuine stack-map verification type');
    if (tag === 7 || tag === 8) offset += 2;
    entries.push({ start, tag });
  }
  for (let index = 0; index < count; index++) {
    const frame = bytes[offset++];
    if (frame <= 63) continue;
    if (frame <= 127) { type(); continue; }
    assert.ok(frame >= 247, 'Genuine stack-map frame');
    offset += 2;
    if (frame === 247) type();
    if (frame >= 252 && frame <= 254) for (let local = 0; local < frame - 251; local++) type();
    if (frame === 255) {
      const locals = bytes.readUInt16BE(offset); offset += 2;
      for (let local = 0; local < locals; local++) type();
      const stack = bytes.readUInt16BE(offset); offset += 2;
      for (let item = 0; item < stack; item++) type();
    }
  }
  assert.equal(offset, attribute.end, 'Exact genuine StackMapTable attribute size');
  return entries;
}

export function mutateStructure(original, id) {
  const layout = readStructureLayout(original);
  const field = layout.fields.entries.find(entry => entry.name === 'number');
  const method = layout.methods.entries.find(entry => entry.name === 'probe');
  assert.ok(field && method?.code && layout.interfaceCount === 1, 'The compiler fixture shape must be retained');
  const code = method.code;
  const sourceFile = layout.attributes.entries.find(attr => attr.name === 'SourceFile');
  const stackMap = code.attributes.entries.find(attr => attr.name === 'StackMapTable');
  const classConstant = layout.pool[layout.thisClass];
  const memberConstant = layout.pool.find(entry => entry?.tag === 10);
  assert.ok(sourceFile && stackMap && classConstant?.tag === 7 && memberConstant && code.handlerCount > 0,
    'The fixture must retain debug metadata, handlers and stack maps');
  const edits = [];
  const edit = (offset, removeBytes, insert) => edits.push({ offset, removeBytes, insertHex: insert.toString('hex') });
  const u1 = (offset, value) => edit(offset, 1, Buffer.from([value]));
  const u2 = (offset, value) => { const valueBytes = Buffer.alloc(2); valueBytes.writeUInt16BE(value); edit(offset, 2, valueBytes); };
  const u4 = (offset, value) => { const valueBytes = Buffer.alloc(4); valueBytes.writeUInt32BE(value); edit(offset, 4, valueBytes); };
  const duplicateMember = (members, member) => {
    u2(members.countOffset, members.entries.length + 1);
    edit(members.end, 0, original.subarray(member.start, member.end));
  };
  switch (id) {
    case 'genuine-control': break;
    case 'opaque-annotations-empty':
    case 'opaque-annotations-short':
    case 'opaque-annotations-trailing':
    case 'opaque-annotations-bad-tag':
    case 'opaque-type-annotations':
    case 'opaque-parameter-annotations':
    case 'opaque-annotation-default': {
      const twoBytes = value => { const data = Buffer.alloc(2); data.writeUInt16BE(value); return data; };
      const utf = value => Buffer.concat([Buffer.from([1]), twoBytes(Buffer.byteLength(value)), Buffer.from(value)]);
      const name = id === 'opaque-type-annotations' ? 'RuntimeVisibleTypeAnnotations' :
        id === 'opaque-parameter-annotations' ? 'RuntimeVisibleParameterAnnotations' :
        id === 'opaque-annotation-default' ? 'AnnotationDefault' : 'RuntimeVisibleAnnotations';
      const owner = ['opaque-parameter-annotations', 'opaque-annotation-default'].includes(id) ?
        method.attributes : layout.attributes;
      const payload = id === 'opaque-annotations-empty' ? Buffer.alloc(0) :
        id === 'opaque-annotations-trailing' ? Buffer.from([0, 0, 255]) :
        id === 'opaque-annotations-bad-tag' ? Buffer.concat([twoBytes(1), twoBytes(layout.pool.length + 1),
          twoBytes(1), twoBytes(field.nameIndex), Buffer.from([255])]) : Buffer.from([0]);
      u2(8, layout.pool.length + 2);
      edit(layout.flagsOffset, 0, Buffer.concat([utf(name), utf('LUnavailableAnnotation;')]));
      const length = Buffer.alloc(4); length.writeUInt32BE(payload.length);
      u2(owner.countOffset, owner.entries.length + 1);
      edit(owner.end, 0, Buffer.concat([twoBytes(layout.pool.length), length, payload]));
      break;
    }
    case 'this-class-zero': u2(layout.thisClassOffset, 0); break;
    case 'this-class-out-of-range': u2(layout.thisClassOffset, layout.pool.length); break;
    case 'this-class-wrong-tag': u2(layout.thisClassOffset, field.nameIndex); break;
    case 'super-class-zero': u2(layout.superClassOffset, 0); break;
    case 'super-class-wrong-tag': u2(layout.superClassOffset, field.nameIndex); break;
    case 'interface-wrong-tag': u2(layout.interfacesOffset, field.nameIndex); break;
    case 'class-final-abstract': u2(layout.flagsOffset, layout.flags | 0x410); break;
    case 'cp-class-name-wrong-tag': u2(classConstant.start + 1, layout.thisClass); break;
    case 'cp-member-class-wrong-tag': u2(memberConstant.start + 1, field.nameIndex); break;
    case 'cp-member-name-type-wrong-tag': u2(memberConstant.start + 3, layout.thisClass); break;
    case 'truncated-constant-pool': {
      const entry = layout.pool.find(item => item?.tag === 1);
      edit(entry.end - 1, original.length - entry.end + 1, Buffer.alloc(0));
      break;
    }
    case 'field-name-zero': u2(field.start + 2, 0); break;
    case 'field-name-wrong-tag': u2(field.start + 2, layout.thisClass); break;
    case 'field-descriptor-wrong-tag': u2(field.start + 4, layout.thisClass); break;
    case 'field-invalid-descriptor': u2(field.start + 4, field.nameIndex); break;
    case 'field-final-volatile': u2(field.start, field.flags | 0x50); break;
    case 'duplicate-field': duplicateMember(layout.fields, field); break;
    case 'method-name-zero': u2(method.start + 2, 0); break;
    case 'method-name-wrong-tag': u2(method.start + 2, layout.thisClass); break;
    case 'method-descriptor-wrong-tag': u2(method.start + 4, layout.thisClass); break;
    case 'method-invalid-descriptor': u2(method.start + 4, field.descriptorIndex); break;
    case 'method-final-abstract': u2(method.start, method.flags | 0x410); break;
    case 'duplicate-method': duplicateMember(layout.methods, method); break;
    case 'attribute-name-wrong-tag': u2(sourceFile.start, layout.thisClass); break;
    case 'attribute-length-short': u4(sourceFile.start + 2, sourceFile.length - 1); break;
    case 'attribute-length-long': u4(sourceFile.start + 2, sourceFile.length + 1); break;
    case 'truncated-class': edit(original.length - 1, 1, Buffer.alloc(0)); break;
    case 'duplicate-code':
      u2(method.attributes.countOffset, method.attributes.entries.length + 1);
      edit(method.end, 0, original.subarray(code.start, code.end));
      break;
    case 'missing-code':
      u2(method.attributes.countOffset, method.attributes.entries.length - 1);
      edit(code.start, code.end - code.start, Buffer.alloc(0));
      break;
    case 'native-method-with-code': u2(method.start, method.flags | 0x100); break;
    case 'code-length-zero': u4(code.codeLengthOffset, 0); break;
    case 'code-length-oversized': u4(code.codeLengthOffset, 65536); break;
    case 'handler-empty-range': u2(code.handlersOffset + 2, original.readUInt16BE(code.handlersOffset)); break;
    case 'handler-end-past-code': u2(code.handlersOffset + 2, code.codeLength + 1); break;
    case 'handler-target-past-code': u2(code.handlersOffset + 4, code.codeLength); break;
    case 'handler-catch-wrong-tag': u2(code.handlersOffset + 6, field.nameIndex); break;
    case 'handler-catch-out-of-range': u2(code.handlersOffset + 6, layout.pool.length); break;
    case 'duplicate-stack-map': {
      const size = stackMap.end - stackMap.start;
      u4(code.start + 2, code.length + size);
      u2(code.attributes.countOffset, code.attributes.entries.length + 1);
      edit(code.end, 0, original.subarray(stackMap.start, stackMap.end));
      break;
    }
    case 'stack-map-reserved-frame': u1(stackMap.body + 2, 128); break;
    case 'stack-map-invalid-verification-type': {
      const [type] = verificationTypeOffsets(original, stackMap);
      assert.ok(type, 'The fixture must retain an explicit verification type');
      u1(type.start, 9);
      break;
    }
    case 'stack-map-object-wrong-tag': {
      const type = verificationTypeOffsets(original, stackMap).find(entry => entry.tag === 7);
      assert.ok(type, 'The fixture must retain an Object verification type');
      u2(type.start + 1, field.nameIndex);
      break;
    }
    case 'stack-map-truncated-frame':
      u4(code.start + 2, code.length - 1);
      u4(stackMap.start + 2, stackMap.length - 1);
      edit(stackMap.end - 1, 1, Buffer.alloc(0));
      break;
    default: assert.fail(`Unknown structural mutation ${id}`);
  }
  let bytes = Buffer.from(original);
  for (const change of [...edits].sort((a, b) => b.offset - a.offset)) {
    bytes = Buffer.concat([bytes.subarray(0, change.offset), Buffer.from(change.insertHex, 'hex'),
      bytes.subarray(change.offset + change.removeBytes)]);
  }
  assert.deepEqual(bytes.subarray(0, 8), original.subarray(0, 8), 'B2 never relabels a class-file header');
  assert.equal(edits.length === 0, id === 'genuine-control', 'Every negative case must have explicit edits');
  return { bytes, edits };
}

function assertCompleted(record, label) {
  assert.equal(record.signal, null, `${label}: signal`);
  assert.equal(record.timedOut, false, `${label}: timeout`);
  assert.equal(record.outputLimitExceeded, false, `${label}: output limit`);
  assert.equal(record.error, null, `${label}: host error`);
}

export function assertStructureResult(record, cases = structureCases(), label = 'structure') {
  assertCompleted(record, label);
  assert.equal(record.status, 'passed', `${label}: ${record.stderr}`);
  assert.equal(record.exitCode, 0, `${label}: exit code; ${record.stderr}`);
  assert.equal(normalize(record.stderr), '', `${label}: stderr`);
  const lines = normalize(record.stdout).split('\n');
  const outcomes = [];
  for (const entry of cases) {
    if (entry.expected === 'accepted') assert.equal(lines.shift(), 'STRUCTURE_TARGET_INITIALIZED', `${label}: control initialization`);
    const match = /^([a-z0-9-]+)=(accepted|java\.lang\.[A-Za-z]+)@(define|resolve|initialize)$/.exec(lines.shift() || '');
    assert.ok(match, `${label}: exact structured result for ${entry.id}`);
    assert.equal(match[1], entry.id, `${label}: case order`);
    assert.equal(match[2], entry.expected, `${label}: ${entry.id} exact Java result`);
    if (entry.expected === 'accepted') assert.equal(match[3], 'initialize', `${label}: ${entry.id} initialized control`);
    outcomes.push({ id: entry.id, result: match[2], stage: match[3] });
  }
  assert.deepEqual(lines, ['CLASS_STRUCTURE_OK', ''], `${label}: exactly one completed corpus, no unexpected execution`);
  return outcomes;
}

export async function checkStructureExecution(record, host, release, execute) {
  const evidence = { host, ...(release === undefined ? {} : { release }), status: 'running' };
  record.executions.push(evidence);
  try {
    const result = await execute();
    evidence.result = result;
    evidence.outcomes = assertStructureResult(result, structureCases(), `${host}${release || ''}`);
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = 'failed';
    evidence.error = error.stack || error.message;
    record.status = 'failed';
    throw error;
  }
}

export async function runClassStructureTests({ browser = false, nativeOnly = false, onRelease = () => {} } = {}) {
  assert.ok(!browser || !nativeOnly, 'Native-only mode cannot claim Chromium coverage');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath);
  const lock = JSON.parse(lockBytes);
  const marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const inputPaths = [sourcePath, harnessPath, path.join(repoRoot, 'ci/run_java_compatibility.mjs'),
    path.join(repoRoot, 'ci/prepare_java_compatibility_toolchains.mjs'), lockPath, markerPath];
  if (!nativeOnly) inputPaths.push(process.execPath);
  const inputSnapshot = () => inputPaths.map(filename => ({ path: filename, sha256: digest(fs.readFileSync(filename)) }));
  const inputDigests = inputSnapshot();
  const verifyJdks = () => {
    for (const prepared of marker.toolchains) assert.equal(treeDigest(prepared.home),
      lock.toolchains.find(item => item.id === prepared.id).treeSha256, `${prepared.id}: current locked JDK tree`);
  };
  verifyJdks();
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
  const runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-class-structure-'));
  fs.chmodSync(temporaryRoot, 0o700);
  const results = [];
  let session;
  try {
    if (browser) {
      const { createBrowserSession } = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({ repoRoot });
    }
    const emptySourcePath = path.join(temporaryRoot, 'empty-sourcepath');
    fs.mkdirSync(emptySourcePath);
    const cases = structureCases();
    const caseArguments = cases.map(entry => `${entry.id}=${entry.expected}`);
    const guestHosts = nativeOnly ? [] : browser ? ['node', 'chromium'] : ['node'];
    for (const release of [21, 25]) {
      const prepared = marker.toolchains.find(item => item.feature === release);
      const directory = path.join(temporaryRoot, `release${release}`);
      fs.mkdirSync(directory);
      const record = { release, status: 'running', cases: [], executions: [] };
      onRelease(record);
      results.push(record);
      record.compile = await runCommand(path.join(prepared.home, 'bin/javac'),
        ['--release', String(release), '-encoding', 'UTF-8', '-proc:none', '-g',
          '-classpath', emptySourcePath, '-sourcepath', emptySourcePath, '-d', directory, sourcePath],
        { cwd: temporaryRoot, timeoutMs: 60_000 });
      assertCompleted(record.compile, `compile genuine Java ${release}`);
      assert.equal(record.compile.exitCode, 0, `compile genuine Java ${release}: ${record.compile.stderr}`);
      assert.equal(record.compile.stdout + record.compile.stderr, '', 'Clean genuine compilation');
      record.classFiles = inspectClassFiles(directory, release, mainClass);
      const original = fs.readFileSync(path.join(directory, targetPath));
      record.sourceSha256 = inputDigests.find(entry => entry.path === sourcePath).sha256;
      record.original = { path: targetPath, size: original.length, sha256: digest(original),
        major: original.readUInt16BE(6), minor: original.readUInt16BE(4) };
      fs.mkdirSync(path.join(directory, 'structure-cases'));
      for (const entry of cases) {
        const mutation = mutateStructure(original, entry.id);
        const resourcePath = `structure-cases/${entry.id}.bin`;
        fs.writeFileSync(path.join(directory, resourcePath), mutation.bytes);
        record.cases.push({ ...entry, originalSha256: record.original.sha256, resource: {
          path: resourcePath, size: mutation.bytes.length, sha256: digest(mutation.bytes) }, edits: mutation.edits });
      }
      record.treeSha256 = treeDigest(directory);
      const execute = async host => {
        assert.equal(treeDigest(directory), record.treeSha256, `Java ${release}: immutable input before ${host}`);
        let result;
        if (host === 'chromium') result = await session.execute({ classesPath: directory, mainClass,
          arguments: caseArguments, timeoutMs: 120_000, standardInput: '' });
        else result = await runCommand(host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
          [...(host === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', directory, mainClass, ...caseArguments],
          { cwd: temporaryRoot, timeoutMs: 120_000, standardInput: '' });
        assert.equal(treeDigest(directory), record.treeSha256, `Java ${release}: immutable input after ${host}`);
        assert.deepEqual(inspectClassFiles(directory, release, mainClass), record.classFiles,
          `Java ${release}: unchanged genuine compiler output`);
        return result;
      };
      await checkStructureExecution(record, 'native', release, () => execute('native'));
      for (const host of guestHosts) await checkStructureExecution(record, host, undefined, () => execute(host));
      record.status = 'passed';
      console.log(`PASS class structure Java ${release}: ${cases.length} cases on ${['native', ...guestHosts].join(', ')}`);
    }
    assert.deepEqual(inputSnapshot(), inputDigests, 'Unchanged source, harness, runtime helper and toolchain inputs');
    verifyJdks();
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), runtime, 'Unchanged CLI runtime');
    const browserIntegrity = session ? session.verifyIntegrity() : null;
    return { scope: structureLedgerScope, nativeOnly, guestHosts,
      notRunGuestHosts: ['node', 'chromium'].filter(host => !guestHosts.includes(host)),
      caseCount: structureCases().length, releaseCount: results.length,
      nativeExecutions: results.length, guestExecutions: results.length * guestHosts.length,
      inputDigests, runtime, browserProvenance: session?.provenance || null, browserIntegrity,
      node: nativeOnly ? null : { version: process.version, executable: process.execPath,
        sha256: inputDigests.find(entry => entry.path === process.execPath).sha256 },
      toolchains: marker.toolchains.map(({ id, feature, version, archiveSha256 }) => ({ id, feature, version,
        archiveSha256, treeSha256: lock.toolchains.find(entry => entry.id === id).treeSha256 })),
      standardInput: { bytes: 0, sha256: digest('') }, phaseBComplete: false, results };
  } catch (error) {
    const unfinished = results.at(-1);
    if (unfinished?.status === 'running') {
      unfinished.status = 'failed';
      unfinished.error = error.stack || error.message;
    }
    throw error;
  } finally {
    try { if (session) await session.close(); }
    finally { fs.rmSync(temporaryRoot, { recursive: true, force: true }); }
  }
}

export function writeStructureLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1, 'Structure ledger schema');
  assert.equal(ledger.scope, structureLedgerScope, 'Structure ledger scope');
  assert.ok(['passed', 'failed'].includes(ledger.status), 'A final ledger status is required');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'Refusing a symlinked ledger directory');
  let existing;
  try { existing = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    assert.ok(existing.isFile(), 'Refusing to overwrite a non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(previous.schemaVersion, 1, 'Refusing to overwrite an unrelated file');
    assert.equal(previous.scope, structureLedgerScope, 'Refusing to overwrite an unrelated file');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, filename);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

async function gitProvenance() {
  const read = async args => {
    const record = await runCommand('git', args, { cwd: repoRoot, timeoutMs: 10_000 });
    assertCompleted(record, 'Git provenance');
    assert.equal(record.exitCode, 0, `Git provenance: ${record.stderr}`);
    return record.stdout.trim();
  };
  const commit = await read(['rev-parse', '--verify', 'HEAD']);
  assert.match(commit, /^[a-f0-9]{40}$/);
  return { commit, trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0 };
}

export function assertStructureGitProvenance(start, end) {
  assert.equal(start.trackedDirty, false, 'Structure gate must start from committed inputs');
  assert.equal(end.commit, start.commit, 'Git HEAD changed during the structure gate');
  assert.equal(end.trackedDirty, false, 'Tracked inputs changed during the structure gate');
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2);
  const ledger = { schemaVersion: 1, scope: structureLedgerScope, status: 'failed',
    gitCommit: null, gitTrackedDirty: null, gitCommitAtEnd: null, gitTrackedDirtyAtEnd: null,
    startedAt: new Date().toISOString(), requestedMode: options[0] || 'node', attemptedReleases: [] };
  try {
    assert.ok(options.length <= 1 && options.every(option => ['--browser', '--native-only'].includes(option)),
      'Usage: node ci/java_class_structure_test.mjs [--browser | --native-only]');
    const start = await gitProvenance();
    ledger.gitCommit = start.commit;
    ledger.gitTrackedDirty = start.trackedDirty;
    assert.equal(start.trackedDirty, false, 'Structure gate must start from committed inputs');
    const summary = await runClassStructureTests({ browser: options.includes('--browser'),
      nativeOnly: options.includes('--native-only'), onRelease: record => ledger.attemptedReleases.push(record) });
    const end = await gitProvenance();
    ledger.gitCommitAtEnd = end.commit;
    ledger.gitTrackedDirtyAtEnd = end.trackedDirty;
    assertStructureGitProvenance(start, end);
    Object.assign(ledger, summary, { status: 'passed' });
    delete ledger.attemptedReleases;
  } catch (error) {
    ledger.error = error.stack || error.message;
    console.error(ledger.error);
    process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString();
    writeStructureLedger(path.join(repoRoot, 'build/java-class-structure-results.json'), ledger);
  }
  if (ledger.status === 'passed') console.log(`PASS B2 structural gate: ${ledger.caseCount} cases per release; ` +
    `${ledger.nativeExecutions} native and ${ledger.guestExecutions} guest executions`);
}
