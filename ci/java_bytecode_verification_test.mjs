import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';

const harnessPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(harnessPath), '..');
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaBytecodeVerification.java');
const mainClass = 'classes.modern_test.JavaBytecodeVerification';
const verifyError = 'java.lang.VerifyError';
const formatError = 'java.lang.ClassFormatError';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const u2 = value => { const b = Buffer.alloc(2); b.writeUInt16BE(value); return b; };
const u4 = value => { const b = Buffer.alloc(4); b.writeUInt32BE(value >>> 0); return b; };
export const verificationLedgerScope = 'JVM-002 B3 pre-execution static, type-flow and loader-aware bytecode verification';

export function verificationCases() {
  const controls = ['genuine-control', 'extra-stack-return', 'uninitialized-null-check', 'uninitialized-monitor',
    'framed-branch', 'framed-dead-block', 'explicit-zero-frame', 'unused-top-frame'];
  const staticFailures = ['truncated-operand', 'reserved-opcode', 'unknown-opcode', 'invalid-wide-opcode',
    'branch-into-operand', 'branch-past-code', 'truncated-goto-wide', 'table-switch-reversed-range',
    'lookup-switch-unsorted', 'ldc-wrong-kind', 'ldc2-wrong-kind', 'local-out-of-range',
    'invokeinterface-count', 'invokeinterface-reserved', 'invokedynamic-reserved',
    'newarray-type', 'new-array-class', 'multiarray-zero-dimensions', 'multiarray-excess-dimensions'];
  const typeFailures = ['operand-underflow', 'wrong-return-type', 'category-two-dup', 'uninitialized-local',
    'overlapping-wide-local', 'primitive-array-type', 'array-index-type', 'field-receiver-type',
    'field-value-type', 'invocation-argument-type', 'uninitialized-return', 'wrong-constructor-owner',
    'missing-super-constructor', 'repeated-constructor', 'initialized-constructor-receiver',
    'foreign-special-receiver', 'missing-branch-frame', 'wrong-branch-stack', 'missing-dead-frame',
    'missing-zero-frame', 'frame-in-operand', 'used-top-frame', 'non-throwable-handler',
    'lost-constructor-flag', 'stack-capacity', 'falls-off-code'];
  const formatFailures = ['handler-start-in-operand', 'handler-end-in-operand', 'handler-target-in-operand',
    'frame-uninitialized-not-new', 'frame-stack-overflow'];
  return [
    ...controls.map(id => ({id, expected: 'accepted', section: '4.10.1'})),
    ...staticFailures.map(id => ({id, expected: verifyError, section: '4.9.1'})),
    ...typeFailures.map(id => ({id, expected: verifyError, section: '4.10.1'})),
    ...formatFailures.map(id => ({id, expected: formatError, section: '4.7'})),
    ...[49, 50].flatMap(major => [
      {id: `legacy-jsr-${major}`, expected: 'accepted', major},
      {id: `legacy-bad-ret-${major}`, expected: verifyError, major},
      {id: `legacy-address-load-${major}`, expected: verifyError, major}
    ].map(entry => ({...entry, section: '4.10.2', legacy: true}))),
    {id: 'modern-jsr-51', expected: verifyError, major: 51, legacy: true, section: '4.9.1'},
    {id: 'legacy-frame-fallback-50', expected: 'accepted', major: 50, legacy: true, section: '4.10.1'}
  ].map(entry => ({...entry, mutation: entry.id !== 'genuine-control', packageId: 'JVM-002',
    binaryName: `${mainClass}$${entry.legacy ? 'LegacyTarget' : 'Target'}`,
    controlKind: entry.id === 'genuine-control' ? 'genuine-compiler-output' :
      entry.legacy ? 'explicit-historical-mutation' : entry.expected === 'accepted' ? 'valid-bytecode-mutation' : 'negative-bytecode',
    specificationRefs: Object.fromEntries([21, 25].map(release => [release,
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-4.html#jvms-${entry.section}`]))}));
}

/** Additional mandatory integration scenarios; keep the 66 bytecode cases
 * independently inventoried so adding a loader control cannot replace one.
 */
export function metadataLoaderScenarios() {
  return [
    {id: 'metadata-valid-child', expected: 'accepted', mutation: false},
    {id: 'metadata-invalid-child', expected: verifyError, mutation: true}
  ].map(entry => ({...entry, packageId: 'JVM-002', parentBinaryName: `${mainClass}$MetadataParent`,
    childBinaryName: `${mainClass}$MetadataChild`, controlKind: entry.mutation ?
      'negative-child-bytecode-loaded-as-parent-metadata' : 'genuine-compiler-output',
    specificationRefs: Object.fromEntries([21, 25].map(release => [release, [
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-4.html#jvms-4.10.1.2`,
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-5.3.5`
    ]]))}));
}

export function mutateMetadataChild(original, id) {
  const entry = metadataLoaderScenarios().find(item => item.id === id);
  assert.ok(entry, `Unknown metadata-loader scenario: ${id}`);
  const method = readStructureLayout(original).methods.entries.find(item =>
    item.name === 'integerProbe' && item.descriptor === '()I');
  assert.ok(method?.code, 'Genuine metadata child integerProbe()I');
  assert.equal(method.code.maxStack, 1);
  assert.equal(method.code.maxLocals, 0);
  assert.deepEqual(original.subarray(method.code.instructionsOffset,
    method.code.instructionsOffset + method.code.codeLength), Buffer.from([0x08, 0xac]),
  'Genuine metadata probe must return iconst_5 using ireturn');
  const bytes = Buffer.from(original);
  const edits = entry.mutation ? [{offset: method.code.instructionsOffset, removeBytes: 1, insertHex: '0b',
    reason: 'Explicit metadata child Code mutation: fconst_0 cannot satisfy integerProbe()I ireturn'}] : [];
  for (const edit of edits) bytes[edit.offset] = 0x0b;
  return {bytes, edits};
}

/** Replace only declared Code and (for explicitly historical cases) the major.
 * Original compiler bytes are immutable; every change is a replayable edit.
 */
export function mutateVerification(original, id) {
  const entry = verificationCases().find(item => item.id === id);
  assert.ok(entry, `Unknown verification mutation: ${id}`);
  if (!entry.mutation) return {bytes: Buffer.from(original), edits: []};
  const layout = readStructureLayout(original);
  const classIndex = name => {
    const found = layout.pool.find(item => item?.tag === 7 && layout.pool[item.first].value === name);
    assert.ok(found, `Genuine class constant ${name}`);
    return found.index;
  };
  const member = (tag, owner, name, descriptor) => {
    const found = layout.pool.find(item => item?.tag === tag &&
      (owner === null || layout.pool[layout.pool[item.first].first].value === owner) &&
      layout.pool[layout.pool[item.second].first].value === name &&
      layout.pool[layout.pool[item.second].second].value === descriptor);
    assert.ok(found, `Genuine member constant ${owner}.${name}${descriptor}`);
    return found.index;
  };
  const utf = name => {
    const found = layout.pool.find(item => item?.tag === 1 && item.value === name);
    assert.ok(found, `Genuine UTF-8 constant ${name}`);
    return found.index;
  };
  const objectClass = () => classIndex('java/lang/Object');
  const selfClass = () => layout.thisClass;
  const objectInit = () => member(10, 'java/lang/Object', '<init>', '()V');
  const field = () => member(9, entry.binaryName.replaceAll('.', '/'), 'number', 'I');
  let methodName = entry.legacy ? 'legacy' : 'voidProbe', descriptor;
  let code = Buffer.from([0xb1]), stack = 4, locals = 4, frames = null, handlers = [];
  const set = bytes => { code = Buffer.from(bytes); };
  const same = offset => Buffer.concat([u2(1), Buffer.from([251]), u2(offset)]);
  const full = (offset, localTypes = [], stackTypes = []) => Buffer.concat([
    u2(1), Buffer.from([255]), u2(offset), u2(localTypes.length), ...localTypes,
    u2(stackTypes.length), ...stackTypes]);
  const obj = index => Buffer.concat([Buffer.from([7]), u2(index)]);
  switch (id) {
    case 'extra-stack-return': set([3, 0xb1]); break;
    case 'uninitialized-null-check': set([0xbb, ...u2(objectClass()), 0xc6, 0, 4, 0xb1, 0xb1]); frames = same(7); break;
    case 'uninitialized-monitor': set([0xbb, ...u2(objectClass()), 0x59, 0xc2, 0xc3, 0xb1]); break;
    case 'framed-branch': case 'missing-branch-frame': case 'wrong-branch-stack':
      set([3, 0x99, 0, 4, 0xb1, 0xb1]);
      if (id === 'framed-branch') frames = same(5);
      if (id === 'wrong-branch-stack') frames = full(5, [], [Buffer.from([1])]);
      break;
    case 'framed-dead-block': case 'missing-dead-frame':
      set([0xb1, 0xb1]); if (id === 'framed-dead-block') frames = same(1); break;
    case 'explicit-zero-frame': case 'missing-zero-frame':
      set([0xa7, 0, 0]); if (id === 'explicit-zero-frame') frames = same(0); break;
    case 'unused-top-frame': set([0xb1, 0xb1]); frames = full(1, [], [Buffer.from([0])]); break;
    case 'used-top-frame': set([0xb1, 0x57, 0xb1]); frames = full(1, [], [Buffer.from([0])]); break;
    case 'truncated-operand': set([0x11, 0]); break;
    case 'reserved-opcode': set([0xca, 0xb1]); break;
    case 'unknown-opcode': set([0xff, 0xb1]); break;
    case 'invalid-wide-opcode': set([0xc4, 0, 0, 0, 0xb1]); break;
    case 'branch-into-operand': set([0xa7, 0, 2, 0xb1]); break;
    case 'branch-past-code': set([0xa7, 0, 4, 0xb1]); break;
    case 'truncated-goto-wide': set([0xc8, 0, 0]); break;
    case 'table-switch-reversed-range': set([0xaa, 0, 0, 0, ...u4(0), ...u4(2), ...u4(1)]); break;
    case 'lookup-switch-unsorted': set([0xab, 0, 0, 0, ...u4(0), ...u4(2), ...u4(2), ...u4(0), ...u4(1), ...u4(0)]); break;
    case 'ldc-wrong-kind': set([0x13, ...u2(utf('Code')), 0x57, 0xb1]); break;
    case 'ldc2-wrong-kind': set([0x14, ...u2(layout.pool.find(item => item?.tag === 3).index), 0x58, 0xb1]); break;
    case 'local-out-of-range': set([0x15, 1, 0x57, 0xb1]); locals = 1; break;
    case 'invokeinterface-count': case 'invokeinterface-reserved':
      set([1, 0xb9, ...u2(member(11, 'java/util/List', 'size', '()I')),
        id === 'invokeinterface-count' ? 2 : 1, id === 'invokeinterface-reserved' ? 1 : 0, 0x57, 0xb1]); break;
    case 'invokedynamic-reserved':
      set([3, 0xba, ...u2(member(18, null, 'makeConcatWithConstants', '(I)Ljava/lang/String;')), 0, 1, 0x57, 0xb1]); break;
    case 'newarray-type': set([3, 0xbc, 3, 0x57, 0xb1]); break;
    case 'new-array-class': set([0xbb, ...u2(classIndex('[I')), 0x57, 0xb1]); break;
    case 'multiarray-zero-dimensions': case 'multiarray-excess-dimensions':
      set([3, 3, 3, 0xc5, ...u2(classIndex('[[I')), id === 'multiarray-zero-dimensions' ? 0 : 3, 0x57, 0xb1]); break;
    case 'operand-underflow': set([0x60, 0x57, 0xb1]); break;
    case 'wrong-return-type': set([3, 0xac]); break;
    case 'category-two-dup': set([9, 0x59, 0x58, 0xb1]); break;
    case 'uninitialized-local': set([0x1a, 0x57, 0xb1]); break;
    case 'overlapping-wide-local': set([9, 0x3f, 3, 0x3c, 0x1e, 0x58, 0xb1]); break;
    case 'primitive-array-type': set([3, 0xbc, 10, 3, 0x30, 0x57, 0xb1]); break;
    case 'array-index-type': set([3, 0xbc, 10, 0x0b, 0x2e, 0x57, 0xb1]); break;
    case 'field-receiver-type': set([3, 0xb4, ...u2(field()), 0x57, 0xb1]); break;
    case 'field-value-type': set([1, 1, 0xb5, ...u2(field()), 0xb1]); break;
    case 'invocation-argument-type': set([1, 0xb8, ...u2(member(10, entry.binaryName.replaceAll('.', '/'), 'integer', '(I)I')), 0x57, 0xb1]); break;
    case 'uninitialized-return':
      methodName = 'referenceProbe'; set([0xbb, ...u2(objectClass()), 0xb0]); break;
    case 'wrong-constructor-owner': set([0xbb, ...u2(selfClass()), 0xb7, ...u2(objectInit()), 0xb1]); break;
    case 'missing-super-constructor': methodName = '<init>'; descriptor = '()V'; set([0xb1]); break;
    case 'repeated-constructor': set([0xbb, ...u2(objectClass()), 0x59, 0xb7, ...u2(objectInit()), 0xb7, ...u2(objectInit()), 0xb1]); break;
    case 'initialized-constructor-receiver': set([1, 0xb7, ...u2(objectInit()), 0xb1]); break;
    case 'foreign-special-receiver':
      methodName = 'referenceProbe'; set([0x2a, 0xb7, ...u2(member(10, 'java/lang/Object', 'toString', '()Ljava/lang/String;')), 0xb0]); break;
    case 'frame-in-operand': set([0x11, 0, 0, 0x57, 0xb1]); frames = same(1); break;
    case 'non-throwable-handler':
      set([1, 0xbf, 0x57, 0xb1]); handlers = [[0, 2, 2, objectClass()]];
      frames = full(2, [], [obj(objectClass())]); break;
    case 'handler-start-in-operand': case 'handler-end-in-operand': case 'handler-target-in-operand':
      set([0x11, 0, 0, 0x57, 0xb1, 0x57, 0xb1]);
      handlers = [[id === 'handler-start-in-operand' ? 1 : 0,
        id === 'handler-end-in-operand' ? 2 : 4, id === 'handler-target-in-operand' ? 1 : 5, 0]];
      frames = full(5, [], [obj(classIndex('java/lang/ArithmeticException'))]); break;
    case 'frame-uninitialized-not-new': set([0xb1, 0xb1]); frames = full(1, [], [Buffer.from([8, 0, 0])]); break;
    case 'frame-stack-overflow': set([0xb1, 0xb1]); stack = 0; frames = full(1, [], [Buffer.from([1])]); break;
    case 'lost-constructor-flag':
      methodName = '<init>'; descriptor = '()V'; set([0x2a, 0xa7, 0, 3, 0xbf]);
      frames = full(4, [Buffer.from([5])], [Buffer.from([6])]); break;
    case 'stack-capacity': set([3, 4, 0x58, 0xb1]); stack = 1; break;
    case 'falls-off-code': set([0]); break;
    default:
      assert.ok(entry.legacy, `Unimplemented verification mutation ${id}`);
      locals = 2; stack = 1;
      if (id.startsWith('legacy-bad-ret')) set([3, 0x3c, 0xa9, 1]);
      else if (id.startsWith('legacy-address-load')) set([0xa8, 0, 5, 0x1a, 0xac, 0x4c, 0x2b, 0x57, 0xa9, 1]);
      else if (id === 'legacy-frame-fallback-50') {
        set([0x1a, 0xac]); frames = full(1, [], [Buffer.from([8, 0, 0])]);
      } else set([0xa8, 0, 5, 0x1a, 0xac, 0x4c, 0xa9, 1]);
  }
  const method = layout.methods.entries.find(item => item.name === methodName && (!descriptor || item.descriptor === descriptor));
  assert.ok(method?.code, `Genuine method ${methodName}${descriptor || ''}`);
  const nested = frames === null ? [] : [Buffer.concat([u2(utf('StackMapTable')), u4(frames.length), frames])];
  const body = Buffer.concat([u2(stack), u2(locals), u4(code.length), code, u2(handlers.length),
    ...handlers.map(handler => Buffer.concat(handler.map(u2))), u2(nested.length), ...nested]);
  const replacement = Buffer.concat([u2(method.code.nameIndex), u4(body.length), body]);
  const edits = [{offset: method.code.start, removeBytes: method.code.end - method.code.start,
    insertHex: replacement.toString('hex'), reason: `Explicit ${id} Code mutation of ${method.name}${method.descriptor}`}];
  if (entry.major) edits.push({offset: 6, removeBytes: 2, insertHex: u2(entry.major).toString('hex'),
    reason: `Explicit historical verifier policy major ${entry.major}; not genuine compiler output`});
  let bytes = Buffer.from(original);
  for (const edit of [...edits].sort((a, b) => b.offset - a.offset)) bytes = Buffer.concat([
    bytes.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), bytes.subarray(edit.offset + edit.removeBytes)]);
  return {bytes, edits};
}

function completed(result, label) {
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal,
    `${label}: incomplete execution ${JSON.stringify(result)}`);
}

export function assertVerificationResult(result, cases = verificationCases(), label = 'verification', onMetadata = () => {}) {
  completed(result, label);
  assert.equal(result.status, 'passed', `${label}: ${result.stderr}`);
  assert.equal(result.exitCode, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', `${label}: stderr`);
  const lines = result.stdout.replaceAll('\r\n', '\n').split('\n');
  const outcomes = [];
  for (const entry of cases) {
    if (entry.expected === 'accepted') assert.equal(lines.shift(), 'BYTECODE_TARGET_INITIALIZED', `${label}: initialized control`);
    const match = /^([a-z0-9-]+)=(accepted|java\.lang\.[A-Za-z]+)@(define|resolve|initialize)$/.exec(lines.shift() || '');
    assert.ok(match, `${label}: exact result for ${entry.id}`);
    assert.equal(match[1], entry.id, `${label}: case order`);
    assert.equal(match[2], entry.expected, `${label}: exact error for ${entry.id}`);
    if (entry.expected === 'accepted') assert.equal(match[3], 'initialize', `${label}: completed control`);
    outcomes.push({id: entry.id, result: match[2], stage: match[3]});
  }
  const metadataOutcomes = [];
  for (const entry of metadataLoaderScenarios()) {
    for (const line of [`${entry.id}=defined-parent`, `${entry.id}=defined-child`,
      'METADATA_PARENT_USABLE', `${entry.id}=parent-usable-child-loaded`]) {
      assert.equal(lines.shift(), line, `${label}: exact metadata-loader trace`);
    }
    if (entry.expected === 'accepted') assert.equal(lines.shift(), 'METADATA_CHILD_INITIALIZED', `${label}: valid child initialized`);
    const match = /^([a-z0-9-]+)=(accepted|java\.lang\.[A-Za-z]+)@(resolve|initialize)$/.exec(lines.shift() || '');
    assert.ok(match, `${label}: child may fail only after parent is usable`);
    assert.equal(match[1], entry.id, `${label}: exact metadata-loader scenario order`);
    assert.equal(match[2], entry.expected, `${label}: exact metadata child outcome`);
    if (entry.expected === 'accepted') assert.equal(match[3], 'initialize', `${label}: genuine child completed`);
    metadataOutcomes.push({id: entry.id, result: match[2], stage: match[3], parentUsable: true,
      childLoadedAsMetadata: true, childInitialized: entry.expected === 'accepted'});
  }
  assert.deepEqual(lines, ['BYTECODE_VERIFICATION_OK', ''], `${label}: full corpus, no rejected initialization`);
  onMetadata(metadataOutcomes);
  return outcomes;
}

export async function checkVerificationExecution(record, host, execute) {
  const evidence = {host, status: 'running'};
  record.executions.push(evidence);
  try {
    evidence.result = await execute();
    evidence.outcomes = assertVerificationResult(evidence.result, verificationCases(), `${host} ${record.release}`,
      outcomes => { evidence.metadataOutcomes = outcomes; });
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = record.status = 'failed';
    evidence.error = error.stack || error.message;
    throw error;
  }
}

export async function runBytecodeVerificationTests({browser = false, nativeOnly = false, onRelease = () => {}} = {}) {
  assert.ok(!browser || !nativeOnly, 'Native-only mode is not guest evidence');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const inputPaths = [sourcePath, harnessPath, path.join(repoRoot, 'ci/java_class_structure_test.mjs'),
    path.join(repoRoot, 'ci/run_java_compatibility.mjs'), path.join(repoRoot, 'ci/prepare_java_compatibility_toolchains.mjs'),
    lockPath, markerPath, ...(nativeOnly ? [] : [process.execPath])];
  const inputs = () => inputPaths.map(filename => ({path: filename, sha256: digest(fs.readFileSync(filename))}));
  const inputDigests = inputs();
  const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
    lock.toolchains.find(item => item.id === prepared.id).treeSha256, `${prepared.id}: locked compiler/runtime tree`));
  checkJdks();
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
  const runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-bytecode-verification-'));
  fs.chmodSync(temporaryRoot, 0o700);
  const results = [], guestHosts = nativeOnly ? [] : browser ? ['node', 'chromium'] : ['node'];
  let session;
  try {
    if (browser) {
      const {createBrowserSession} = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({repoRoot});
    }
    const sourceDirectory = path.join(temporaryRoot, 'empty-sourcepath');
    fs.mkdirSync(sourceDirectory);
    const cases = verificationCases(), metadataScenarios = metadataLoaderScenarios();
    const args = cases.map(entry => `${entry.id}=${entry.expected}:${entry.binaryName}`);
    for (const release of [21, 25]) {
      const prepared = marker.toolchains.find(item => item.feature === release);
      const directory = path.join(temporaryRoot, `release${release}`);
      fs.mkdirSync(directory);
      const record = {release, status: 'running', cases: [], metadataScenarios: [], executions: []};
      results.push(record);
      onRelease(record);
      record.compile = await runCommand(path.join(prepared.home, 'bin/javac'),
        ['--release', String(release), '-encoding', 'UTF-8', '-proc:none', '-g',
          '-classpath', sourceDirectory, '-sourcepath', sourceDirectory, '-d', directory, sourcePath],
        {cwd: temporaryRoot, timeoutMs: 60_000});
      completed(record.compile, `compile genuine Java ${release}`);
      assert.equal(record.compile.exitCode, 0, record.compile.stderr);
      assert.equal(record.compile.stdout + record.compile.stderr, '', 'Clean genuine compiler output');
      record.classFiles = inspectClassFiles(directory, release, mainClass);
      record.originals = [];
      const originals = new Map();
      for (const binaryName of [...new Set([...cases.map(entry => entry.binaryName),
        ...metadataScenarios.flatMap(entry => [entry.parentBinaryName, entry.childBinaryName])])]) {
        const relativePath = `${binaryName.replaceAll('.', '/')}.class`;
        const bytes = fs.readFileSync(path.join(directory, relativePath));
        originals.set(binaryName, bytes);
        record.originals.push({binaryName, path: relativePath, size: bytes.length, sha256: digest(bytes),
          major: bytes.readUInt16BE(6), minor: bytes.readUInt16BE(4)});
      }
      record.sourceSha256 = inputDigests.find(entry => entry.path === sourcePath).sha256;
      fs.mkdirSync(path.join(directory, 'verification-cases'));
      for (const entry of cases) {
        const original = originals.get(entry.binaryName), mutation = mutateVerification(original, entry.id);
        const relativePath = `verification-cases/${entry.id}.bin`;
        fs.writeFileSync(path.join(directory, relativePath), mutation.bytes);
        record.cases.push({...entry, originalSha256: digest(original), edits: mutation.edits,
          resource: {path: relativePath, size: mutation.bytes.length, sha256: digest(mutation.bytes),
            major: mutation.bytes.readUInt16BE(6), minor: mutation.bytes.readUInt16BE(4)}});
      }
      for (const entry of metadataScenarios) {
        const resources = {};
        for (const role of ['parent', 'child']) {
          const binaryName = entry[`${role}BinaryName`], original = originals.get(binaryName);
          const mutation = role === 'child' ? mutateMetadataChild(original, entry.id) : {bytes: Buffer.from(original), edits: []};
          const relativePath = `verification-cases/${entry.id}-${role}.bin`;
          fs.writeFileSync(path.join(directory, relativePath), mutation.bytes);
          resources[role] = {binaryName, originalSha256: digest(original), edits: mutation.edits,
            resource: {path: relativePath, size: mutation.bytes.length, sha256: digest(mutation.bytes),
              major: mutation.bytes.readUInt16BE(6), minor: mutation.bytes.readUInt16BE(4)}};
        }
        record.metadataScenarios.push({...entry, resources});
      }
      record.treeSha256 = treeDigest(directory);
      const execute = async host => {
        assert.equal(treeDigest(directory), record.treeSha256, `${host}: immutable input before execution`);
        const result = host === 'chromium' ? await session.execute({classesPath: directory, mainClass,
          arguments: args, timeoutMs: 120_000, standardInput: ''}) :
          await runCommand(host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(host === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', directory, mainClass, ...args],
            {cwd: temporaryRoot, timeoutMs: 120_000, standardInput: ''});
        assert.equal(treeDigest(directory), record.treeSha256, `${host}: immutable input after execution`);
        assert.deepEqual(inspectClassFiles(directory, release, mainClass), record.classFiles, 'Unchanged genuine class files');
        return result;
      };
      for (const host of ['native', ...guestHosts]) await checkVerificationExecution(record, host, () => execute(host));
      record.status = 'passed';
      console.log(`PASS bytecode verification Java ${release}: ${cases.length} cases + ${metadataScenarios.length} metadata-loader scenarios on ${['native', ...guestHosts].join(', ')}`);
    }
    assert.deepEqual(inputs(), inputDigests, 'Unchanged verification inputs');
    checkJdks();
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), runtime, 'Unchanged CLI runtime');
    return {scope: verificationLedgerScope, nativeOnly, guestHosts,
      notRunGuestHosts: ['node', 'chromium'].filter(host => !guestHosts.includes(host)),
      caseCount: cases.length, metadataScenarioCount: metadataScenarios.length,
      releaseCount: results.length, nativeExecutions: results.length,
      guestExecutions: results.length * guestHosts.length, inputDigests, runtime,
      browserProvenance: session?.provenance || null, browserIntegrity: session ? session.verifyIntegrity() : null,
      node: nativeOnly ? null : {version: process.version, executable: process.execPath,
        sha256: inputDigests.find(item => item.path === process.execPath).sha256},
      toolchains: marker.toolchains.map(({id, feature, version, archiveSha256}) => ({id, feature, version, archiveSha256,
        treeSha256: lock.toolchains.find(item => item.id === id).treeSha256})),
      standardInput: {bytes: 0, sha256: digest('')}, phaseBComplete: false, results};
  } catch (error) {
    const pending = results.at(-1);
    if (pending?.status === 'running') { pending.status = 'failed'; pending.error = error.stack || error.message; }
    throw error;
  } finally {
    try { if (session) await session.close(); }
    finally { fs.rmSync(temporaryRoot, {recursive: true, force: true}); }
  }
}

export function writeVerificationLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.scope, verificationLedgerScope);
  assert.ok(['passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'Refusing a symlinked ledger directory');
  let existing;
  try { existing = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    assert.ok(existing.isFile(), 'Refusing to overwrite a non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(previous.schemaVersion, 1);
    assert.equal(previous.scope, verificationLedgerScope, 'Refusing to overwrite an unrelated ledger');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, {flag: 'wx', mode: 0o600});
    fs.renameSync(temporary, filename);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

async function provenance() {
  const read = async args => {
    const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10_000});
    completed(result, 'Git provenance');
    assert.equal(result.exitCode, 0);
    return result.stdout.trim();
  };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']),
    trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

export function assertVerificationProvenance(start, end) {
  assert.match(start.commit, /^[a-f0-9]{40}$/);
  assert.equal(start.trackedDirty, false, 'Verification gate must start from committed inputs');
  assert.equal(end.commit, start.commit, 'Verification gate HEAD changed');
  assert.equal(end.trackedDirty, false, 'Verification gate inputs changed');
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2);
  const ledger = {schemaVersion: 1, scope: verificationLedgerScope, status: 'failed',
    startedAt: new Date().toISOString(), requestedMode: options[0] || 'node', attemptedReleases: []};
  try {
    assert.ok(options.length <= 1 && options.every(option => ['--native-only', '--browser'].includes(option)),
      'Usage: node ci/java_bytecode_verification_test.mjs [--native-only | --browser]');
    const start = await provenance();
    Object.assign(ledger, {gitCommit: start.commit, gitTrackedDirty: start.trackedDirty});
    assertVerificationProvenance(start, start);
    const summary = await runBytecodeVerificationTests({browser: options.includes('--browser'), nativeOnly: options.includes('--native-only'),
      onRelease: record => ledger.attemptedReleases.push(record)});
    const end = await provenance();
    Object.assign(ledger, {gitCommitAtEnd: end.commit, gitTrackedDirtyAtEnd: end.trackedDirty});
    assertVerificationProvenance(start, end);
    Object.assign(ledger, summary, {status: 'passed'});
    delete ledger.attemptedReleases;
  } catch (error) {
    ledger.error = error.stack || error.message;
    console.error(ledger.error);
    process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString();
    writeVerificationLedger(path.join(repoRoot, 'build/java-bytecode-verification-results.json'), ledger);
  }
}
