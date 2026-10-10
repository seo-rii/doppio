import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectClassFiles, runCommand, validateToolchains } from './run_java_compatibility.mjs';
import { treeDigest } from './prepare_java_compatibility_toolchains.mjs';

const harnessPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(harnessPath), '..');
const mainClass = 'classes.modern_test.JavaClassVersion';
const classPath = `${mainClass.replaceAll('.', '/')}.class`;
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaClassVersion.java');
const shapesMainClass = 'classes.modern_test.JavaClassAdmissionShapes';
const shapesClassPath = `${shapesMainClass.replaceAll('.', '/')}.class`;
const shapesSourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaClassAdmissionShapes.java');
const timeoutMs = 30_000;
const expectedOutput = 'CLASS_VERSION_INITIALIZED\nCLASS_VERSION_MAIN\n';
const shapesOutput = 'CLASS_SHAPES_INITIALIZED\nCLASS_SHAPES_MAIN point=21\n';
const ledgerScope = 'JVM-001 genuine Java 21/25 class-file admission and explicit header controls';
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const normalize = (value) => value.replaceAll('\r\n', '\n');
const versionError = 'java.lang.UnsupportedClassVersionError';
const formatError = 'java.lang.ClassFormatError';

// JVMS 25 4.1 permits every minor for majors 45 through 55. A copy of this
// deliberately old-instruction/pool fixture is a header parser control, not a
// claim that modern compiler output generally belongs to an ancient VM.
export function versionCases() {
  const cases = [
    { id: 'genuine-release21', baseRelease: 21, nativeReleases: [21] },
    { id: 'genuine-release25', baseRelease: 25, nativeReleases: [25] },
    { id: 'genuine-shapes-release21', baseRelease: 21, corpus: 'modern-shapes',
      mainClass: shapesMainClass, expectedOutput: shapesOutput, nativeReleases: [21] },
    { id: 'genuine-shapes-release25', baseRelease: 25, corpus: 'modern-shapes',
      mainClass: shapesMainClass, expectedOutput: shapesOutput, nativeReleases: [25] },
  ];
  for (const [major, minor] of [[45, 3], [45, 65535], [55, 1], [55, 65535]]) {
    cases.push({ id: `historical-${major}-${minor}`, baseRelease: 21,
      mutation: { major, minor }, nativeReleases: [25] });
  }
  cases.push(
    { id: 'below-minimum44', baseRelease: 21, mutation: { major: 44, minor: 0 },
      nativeReleases: [25], error: versionError },
    { id: 'above-maximum71', baseRelease: 25, mutation: { major: 71, minor: 0 },
      nativeReleases: [25], error: versionError },
  );
  for (const release of [21, 25]) {
    for (const minor of [1, 65534]) {
      cases.push({ id: `illegal-minor-${release + 44}-${minor}`, baseRelease: release,
        mutation: { major: release + 44, minor }, nativeReleases: [release], error: versionError });
    }
    cases.push({ id: `preview-disabled-${release + 44}`, baseRelease: release,
      mutation: { major: release + 44, minor: 65535 }, nativeReleases: [release], error: versionError });
  }
  for (const major of [56, 64]) {
    cases.push({ id: `earlier-preview-${major}`, baseRelease: 21,
      mutation: { major, minor: 65535 }, nativeReleases: [25], error: versionError });
  }
  cases.push(
    { id: 'malformed-magic', baseRelease: 21, mutation: { magic: 0xdeadbeef },
      nativeReleases: [25], error: formatError },
  );
  for (let truncateBytes = 0; truncateBytes < 8; truncateBytes++) {
    cases.push({ id: `truncated-header-${truncateBytes}`, baseRelease: 21, mutation: { truncateBytes },
      nativeReleases: [25], error: formatError });
  }
  return cases;
}

export function mutateClassHeader(original, mutation) {
  assert.ok(Buffer.isBuffer(original) && original.length >= 8 && original.readUInt32BE(0) === 0xcafebabe,
    'Mutation input must be a complete compiler-generated class header');
  const bytes = Buffer.from(original);
  if (mutation.magic !== undefined) bytes.writeUInt32BE(mutation.magic, 0);
  if (mutation.minor !== undefined) bytes.writeUInt16BE(mutation.minor, 4);
  if (mutation.major !== undefined) bytes.writeUInt16BE(mutation.major, 6);
  if (mutation.truncateBytes !== undefined) return bytes.subarray(0, mutation.truncateBytes);
  return bytes;
}

function assertCompleted(record, label) {
  assert.equal(record.signal, null, `${label}: signal`);
  assert.equal(record.timedOut, false, `${label}: timeout`);
  assert.equal(record.outputLimitExceeded, false, `${label}: output limit`);
  assert.equal(record.error, null, `${label}: host error`);
}

export function assertVersionResult(record, entry, label) {
  assertCompleted(record, label);
  if (!entry.error) {
    assert.equal(record.status, 'passed', `${label}: ${record.stderr}`);
    assert.equal(record.exitCode, 0, `${label}: exit code`);
    assert.equal(normalize(record.stdout), entry.expectedOutput || expectedOutput,
      `${label}: initialization and body`);
    assert.equal(normalize(record.stderr), '', `${label}: stderr`);
    return;
  }
  assert.equal(record.status, 'failed', `${label}: ${record.stdout} ${record.stderr}`);
  assert.ok(Number.isInteger(record.exitCode) && record.exitCode !== 0, `${label}: nonzero exit code`);
  // Doppio's launcher may print a generic load diagnostic on stdout. Admission
  // concerns the Java error type and absence of execution, not launcher wording.
  assert.doesNotMatch(record.stdout, /CLASS_VERSION_INITIALIZED|CLASS_VERSION_MAIN|AssertionError/,
    `${label}: rejected class must not initialize or execute`);
  assert.doesNotMatch(record.stderr, /CLASS_VERSION_INITIALIZED|CLASS_VERSION_MAIN|AssertionError/,
    `${label}: rejected class body must not run`);
  // Read the first actual exception diagnostic, not an expected type token
  // mentioned inside a different exception's message or an unrelated log line.
  let actualError;
  for (const diagnostic of normalize(record.stderr).split('\n')) {
    const line = diagnostic.trim();
    // This is the native launcher's wrapper, not a host JavaScript Error.
    if (line.startsWith('Error: LinkageError occurred while loading main class ')) continue;
    const match = line.match(
      /^(?:Exception in thread "[^"\n]*"\s+)?((?:[A-Za-z_$][\w$]*\.)+[A-Za-z_$][\w$]*|AggregateError|EvalError|RangeError|ReferenceError|SyntaxError|TypeError|URIError|Error)(?=[:\s]|$)/);
    if (match) {
      actualError = match[1];
      break;
    }
  }
  assert.equal(actualError, entry.error,
    `${label}: expected ${entry.error}; actual diagnostic: ${record.stderr.slice(0, 4096)}`);
}

export async function checkAdmissionCase(record, entry, guestHosts, execute) {
  record.status = 'running';
  try {
    for (const release of entry.nativeReleases) {
      const result = await execute('native', release);
      record.native.push({ release, result });
      assertVersionResult(result, entry, `native${release} ${entry.id}`);
    }
    for (const host of guestHosts) {
      const result = await execute(host);
      record.guests.push({ host, result });
      assertVersionResult(result, entry, `${host} ${entry.id}`);
    }
    record.status = 'passed';
  } catch (error) {
    record.status = 'failed';
    record.error = error.stack || error.message;
    throw error;
  }
}

function assertLegacyConstantPool(bytes) {
  const count = bytes.readUInt16BE(8);
  let offset = 10;
  for (let index = 1; index < count; index++) {
    const tag = bytes[offset++];
    switch (tag) {
      case 1: offset += 2 + bytes.readUInt16BE(offset); break;
      case 3: case 4: case 9: case 10: case 11: case 12: offset += 4; break;
      case 5: case 6: offset += 8; index++; break;
      case 7: case 8: offset += 2; break;
      default: assert.fail(`Historical header controls require a legacy constant pool; found tag ${tag}`);
    }
    assert.ok(offset <= bytes.length, 'Complete legacy constant pool');
  }
}

export async function runClassVersionTests({ browser = false, nativeOnly = false, onCase = () => {} } = {}) {
  assert.ok(!browser || !nativeOnly, 'Native-only mode cannot claim Chromium coverage');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const inputs = [sourcePath, shapesSourcePath, harnessPath,
    path.join(repoRoot, 'ci/run_java_compatibility.mjs'),
    path.join(repoRoot, 'ci/prepare_java_compatibility_toolchains.mjs'), lockPath, markerPath];
  if (!nativeOnly) inputs.push(process.execPath);
  const inputSnapshot = () => inputs.map((filename) => ({ path: filename, sha256: digest(fs.readFileSync(filename)) }));
  const inputDigests = inputSnapshot();
  const lockBytes = fs.readFileSync(lockPath);
  const lock = JSON.parse(lockBytes);
  const marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const toolchain = (release) => marker.toolchains.find((entry) => entry.feature === release);
  const verifyJdks = () => {
    for (const entry of marker.toolchains) {
      assert.equal(treeDigest(entry.home), lock.toolchains.find((locked) => locked.id === entry.id).treeSha256,
        `${entry.id}: prepared JDK integrity`);
    }
  };
  verifyJdks();
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-class-version-test-'));
  fs.chmodSync(temporaryRoot, 0o700);
  let session;
  try {
    const emptySourcePath = path.join(temporaryRoot, 'empty-sourcepath');
    fs.mkdirSync(emptySourcePath);
    const genuineDirectories = {};
    const genuineInventories = {};
    const originals = {};
    const controls = [
      { id: 'simple', source: sourcePath, main: mainClass, classFile: classPath },
      { id: 'modern-shapes', source: shapesSourcePath, main: shapesMainClass, classFile: shapesClassPath },
    ];
    for (const release of [21, 25]) {
      for (const control of controls) {
        const key = `${release}:${control.id}`;
        const directory = path.join(temporaryRoot, `genuine-${release}-${control.id}`);
        fs.mkdirSync(directory);
        const result = await runCommand(path.join(toolchain(release).home, 'bin/javac'),
          ['--release', String(release), '-encoding', 'UTF-8', '-proc:none',
            '-classpath', emptySourcePath, '-sourcepath', emptySourcePath,
            '-d', directory, control.source], { cwd: temporaryRoot, timeoutMs: 60_000 });
        assertCompleted(result, `compile genuine Java ${release} ${control.id}`);
        assert.equal(result.exitCode, 0, `compile genuine Java ${release} ${control.id}: ${result.stderr}`);
        assert.equal(result.stdout + result.stderr, '', 'Compilation must be clean');
        genuineDirectories[key] = directory;
        genuineInventories[key] = inspectClassFiles(directory, release, control.main);
        if (control.id === 'simple') {
          assert.equal(genuineInventories[key].length, 1, 'One deliberately simple class per header control');
          originals[release] = fs.readFileSync(path.join(directory, classPath));
          assertLegacyConstantPool(originals[release]);
        } else {
          for (const name of ['Shape', 'Point', 'Marker']) {
            assert.ok(genuineInventories[key].some((entry) => entry.path ===
              `${shapesMainClass.replaceAll('.', '/')}$${name}.class`),
            `Genuine ${release} output must include ${name}`);
          }
          for (const [filename, attribute] of [
            [`${shapesMainClass.replaceAll('.', '/')}$Shape.class`, 'PermittedSubclasses:'],
            [`${shapesMainClass.replaceAll('.', '/')}$Point.class`, 'Record:'],
            [shapesClassPath, 'BootstrapMethods:'],
          ]) {
            const detail = await runCommand(path.join(toolchain(release).home, 'bin/javap'),
              ['-v', '-p', path.join(directory, filename)], { cwd: temporaryRoot, timeoutMs: 30_000 });
            assertCompleted(detail, `inspect genuine Java ${release} ${filename}`);
            assert.equal(detail.exitCode, 0, `javap ${filename}: ${detail.stderr}`);
            assert.ok(detail.stdout.includes(attribute), `${filename} lacks ${attribute}`);
          }
        }
      }
    }
    const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
    const runtimeRoot = path.dirname(path.dirname(runnerPath));
    const runtimeSnapshot = () => ['console', 'src', 'vendor/java_home'].map((relative) =>
      [relative, treeDigest(fs.realpathSync(path.join(runtimeRoot, relative)))]);
    const runtimeDigests = nativeOnly ? null : runtimeSnapshot();
    if (browser) {
      const { createBrowserSession } = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({ repoRoot });
    }
    const guestHosts = nativeOnly ? [] : browser ? ['node', 'chromium'] : ['node'];
    const results = [];
    let comparisons = 0;
    let nativeExecutions = 0;
    for (const entry of versionCases()) {
      const corpus = entry.corpus || 'simple';
      const key = `${entry.baseRelease}:${corpus}`;
      const entryMainClass = entry.mainClass || mainClass;
      const entryClassPath = entry.corpus === 'modern-shapes' ? shapesClassPath : classPath;
      const original = entry.corpus === 'modern-shapes' ?
        fs.readFileSync(path.join(genuineDirectories[key], entryClassPath)) : originals[entry.baseRelease];
      const bytes = entry.mutation ? mutateClassHeader(original, entry.mutation) : original;
      const directory = entry.mutation ? path.join(temporaryRoot, entry.id) : genuineDirectories[key];
      if (entry.mutation) {
        fs.mkdirSync(path.dirname(path.join(directory, classPath)), { recursive: true });
        fs.writeFileSync(path.join(directory, classPath), bytes);
        if (entry.mutation.truncateBytes === undefined) {
          assert.deepEqual(bytes.subarray(8), original.subarray(8), `${entry.id}: only header bytes may differ`);
        }
      }
      const caseDigest = treeDigest(directory);
      const record = { id: entry.id, status: 'running', outcome: entry.error ? 'rejected' : 'accepted',
        controlKind: entry.error ? 'negative-admission' : entry.mutation ? 'structural-header' : 'genuine-compiler-output',
        expectedError: entry.error || null, baseRelease: entry.baseRelease, corpus,
        sourceSha256: digest(fs.readFileSync(entry.corpus === 'modern-shapes' ? shapesSourcePath : sourcePath)),
        input: { path: entryClassPath, originalSha256: digest(original), sha256: digest(bytes),
          size: bytes.length, mutation: entry.mutation || null, treeSha256: caseDigest,
          classFiles: entry.mutation ? null : genuineInventories[key] }, native: [], guests: [] };
      const execute = async (host, release) => {
        assert.equal(treeDigest(directory), caseDigest, `${entry.id}: class integrity before ${host}`);
        let result;
        if (host === 'chromium') {
          result = await session.execute({ classesPath: directory, mainClass: entryMainClass, arguments: [], timeoutMs });
        } else {
          const command = host === 'native' ? path.join(toolchain(release).home, 'bin/java') : process.execPath;
          const prefix = host === 'native' ? [] : ['--no-deprecation', runnerPath];
          // Preview is deliberately never enabled on either native host.
          result = await runCommand(command, [...prefix, '-cp', directory, entryMainClass],
            { cwd: temporaryRoot, timeoutMs, standardInput: '' });
        }
        assert.equal(treeDigest(directory), caseDigest, `${entry.id}: class integrity after ${host}`);
        for (const originalRelease of [21, 25]) {
          for (const control of controls) {
            const originalKey = `${originalRelease}:${control.id}`;
            assert.deepEqual(inspectClassFiles(genuineDirectories[originalKey], originalRelease, control.main),
              genuineInventories[originalKey], `${entry.id}: genuine ${control.id} output must remain unchanged`);
          }
        }
        return result;
      };
      onCase(record);
      await checkAdmissionCase(record, entry, guestHosts, execute);
      nativeExecutions += record.native.length;
      comparisons += record.guests.length;
      results.push(record);
      console.log(`PASS class admission ${entry.id} ${JSON.stringify(record.input)}`);
    }
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(), runtimeDigests, 'CLI runtime integrity after version tests');
    assert.deepEqual(inputSnapshot(), inputDigests, 'Source, harness, helper and toolchain marker integrity');
    verifyJdks();
    const browserIntegrity = session ? session.verifyIntegrity() : null;
    const summary = { scope: ledgerScope, nativeOnly,
      guestHosts, notRunGuestHosts: ['node', 'chromium'].filter((host) => !guestHosts.includes(host)),
      cases: results.length, genuine: results.filter((entry) => entry.controlKind === 'genuine-compiler-output').length,
      structural: results.filter((entry) => entry.controlKind === 'structural-header').length,
      negative: results.filter((entry) => entry.outcome === 'rejected').length, nativeExecutions, comparisons,
      inputDigests, runtimeDigests, browserProvenance: session?.provenance || null, browserIntegrity,
      node: nativeOnly ? null : { version: process.version, executable: process.execPath,
        sha256: inputDigests.find((entry) => entry.path === process.execPath).sha256 },
      toolchains: marker.toolchains.map(({ id, feature, version, archiveSha256 }) => ({ id, feature, version, archiveSha256,
        treeSha256: lock.toolchains.find((entry) => entry.id === id).treeSha256 })),
      standardInput: { bytes: 0, sha256: digest('') }, results };
    return summary;
  } finally {
    try {
      if (session) await session.close();
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

export function writeAdmissionLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1, 'Admission ledger schema');
  assert.equal(ledger.scope, ledgerScope, 'Admission ledger scope');
  assert.ok(['passed', 'failed'].includes(ledger.status), 'Admission ledger must have a final status');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(),
    'Refusing to write through a symlinked admission ledger directory');
  let existing;
  try {
    existing = fs.lstatSync(filename);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (existing) {
    assert.ok(existing.isFile(), 'Refusing to overwrite a non-regular admission ledger');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(previous.schemaVersion, 1, 'Refusing to overwrite an unrelated file');
    assert.equal(previous.scope, ledgerScope, 'Refusing to overwrite an unrelated file');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

async function readGitProvenance() {
  const commit = await runCommand('git', ['rev-parse', '--verify', 'HEAD'],
    { cwd: repoRoot, timeoutMs: 10_000 });
  assertCompleted(commit, 'git commit provenance');
  assert.equal(commit.exitCode, 0, `git commit provenance: ${commit.stderr}`);
  assert.match(commit.stdout.trim(), /^[a-f0-9]{40}$/, 'Git commit provenance');
  const state = await runCommand('git', ['status', '--porcelain=v1', '--untracked-files=no'],
    { cwd: repoRoot, timeoutMs: 10_000 });
  assertCompleted(state, 'git working tree provenance');
  assert.equal(state.exitCode, 0, `git working tree provenance: ${state.stderr}`);
  return { commit: commit.stdout.trim(), trackedDirty: state.stdout.trim().length > 0 };
}

export function assertStableGitProvenance(start, end) {
  assert.equal(start.trackedDirty, false, 'Admission must start from committed inputs');
  assert.equal(end.commit, start.commit, 'Git HEAD changed during admission');
  assert.equal(end.trackedDirty, false, 'Tracked inputs changed during admission');
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2);
  const ledger = { schemaVersion: 1, scope: ledgerScope, status: 'failed', gitCommit: null,
    gitTrackedDirty: null, gitCommitAtEnd: null, gitTrackedDirtyAtEnd: null,
    startedAt: new Date().toISOString(),
    requestedMode: options[0] || 'node', attemptedCases: [] };
  let successfulSummary;
  try {
    assert.ok(options.length <= 1 && options.every((option) => ['--browser', '--native-only'].includes(option)),
      'Usage: node ci/java_class_version_test.mjs [--browser | --native-only]');
    const start = await readGitProvenance();
    ledger.gitCommit = start.commit;
    ledger.gitTrackedDirty = start.trackedDirty;
    assert.equal(start.trackedDirty, false, 'Admission must start from committed inputs');
    const summary = await runClassVersionTests({ browser: options.includes('--browser'),
      nativeOnly: options.includes('--native-only'), onCase: (record) => ledger.attemptedCases.push(record) });
    const end = await readGitProvenance();
    ledger.gitCommitAtEnd = end.commit;
    ledger.gitTrackedDirtyAtEnd = end.trackedDirty;
    assertStableGitProvenance(start, end);
    Object.assign(ledger, summary, { status: 'passed' });
    delete ledger.attemptedCases;
    successfulSummary = summary;
  } catch (error) {
    ledger.error = error.stack || error.message;
    console.error(ledger.error);
    process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString();
    writeAdmissionLedger(path.join(repoRoot, 'build/java-class-version-results.json'), ledger);
  }
  if (successfulSummary) {
    console.log(`PASS class-version gate: ${successfulSummary.genuine} genuine compiler controls, ` +
      `${successfulSummary.structural} structural header controls and ${successfulSummary.negative} negative cases; ` +
      `${successfulSummary.nativeExecutions} native executions and ${successfulSummary.comparisons} guest checks`);
    console.log(JSON.stringify({ provenance: { ...successfulSummary, results: undefined } }));
  }
}
