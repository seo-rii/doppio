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
const timeoutMs = 30_000;
const expectedOutput = 'CLASS_VERSION_INITIALIZED\nCLASS_VERSION_MAIN\n';
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
    assert.equal(normalize(record.stdout), expectedOutput, `${label}: initialization and body`);
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

export async function runClassVersionTests({ browser = false, nativeOnly = false } = {}) {
  assert.ok(!browser || !nativeOnly, 'Native-only mode cannot claim Chromium coverage');
  const inputs = [sourcePath, harnessPath,
    path.join(repoRoot, 'ci/run_java_compatibility.mjs'),
    path.join(repoRoot, 'ci/prepare_java_compatibility_toolchains.mjs'),
    path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'),
    path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')];
  if (!nativeOnly) inputs.push(process.execPath);
  const inputSnapshot = () => inputs.map((filename) => ({ path: filename, sha256: digest(fs.readFileSync(filename)) }));
  const inputDigests = inputSnapshot();
  const lockBytes = fs.readFileSync(inputs[4]);
  const lock = JSON.parse(lockBytes);
  const marker = JSON.parse(fs.readFileSync(inputs[5]));
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
    for (const release of [21, 25]) {
      const directory = path.join(temporaryRoot, `genuine-${release}`);
      fs.mkdirSync(directory);
      const result = await runCommand(path.join(toolchain(release).home, 'bin/javac'),
        ['--release', String(release), '-encoding', 'UTF-8', '-proc:none',
          '-classpath', emptySourcePath, '-sourcepath', emptySourcePath,
          '-d', directory, sourcePath], { cwd: temporaryRoot, timeoutMs: 60_000 });
      assertCompleted(result, `compile genuine Java ${release}`);
      assert.equal(result.exitCode, 0, `compile genuine Java ${release}: ${result.stderr}`);
      assert.equal(result.stdout + result.stderr, '', 'Compilation must be clean');
      genuineDirectories[release] = directory;
      genuineInventories[release] = inspectClassFiles(directory, release, mainClass);
      assert.equal(genuineInventories[release].length, 1, 'One deliberately simple class per genuine control');
      originals[release] = fs.readFileSync(path.join(directory, classPath));
      assertLegacyConstantPool(originals[release]);
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
      const original = originals[entry.baseRelease];
      const bytes = entry.mutation ? mutateClassHeader(original, entry.mutation) : original;
      const directory = entry.mutation ? path.join(temporaryRoot, entry.id) : genuineDirectories[entry.baseRelease];
      if (entry.mutation) {
        fs.mkdirSync(path.dirname(path.join(directory, classPath)), { recursive: true });
        fs.writeFileSync(path.join(directory, classPath), bytes);
        if (entry.mutation.truncateBytes === undefined) {
          assert.deepEqual(bytes.subarray(8), original.subarray(8), `${entry.id}: only header bytes may differ`);
        }
      }
      const caseDigest = treeDigest(directory);
      const record = { id: entry.id, outcome: entry.error ? 'rejected' : 'accepted',
        controlKind: entry.error ? 'negative-admission' : entry.mutation ? 'structural-header' : 'genuine-compiler-output',
        expectedError: entry.error || null, baseRelease: entry.baseRelease,
        input: { path: classPath, originalSha256: digest(original), sha256: digest(bytes),
          size: bytes.length, mutation: entry.mutation || null }, native: [], guests: [] };
      const execute = async (host, release) => {
        assert.equal(treeDigest(directory), caseDigest, `${entry.id}: class integrity before ${host}`);
        let result;
        if (host === 'chromium') {
          result = await session.execute({ classesPath: directory, mainClass, arguments: [], timeoutMs });
        } else {
          const command = host === 'native' ? path.join(toolchain(release).home, 'bin/java') : process.execPath;
          const prefix = host === 'native' ? [] : ['--no-deprecation', runnerPath];
          // Preview is deliberately never enabled on either native host.
          result = await runCommand(command, [...prefix, '-cp', directory, mainClass],
            { cwd: temporaryRoot, timeoutMs, standardInput: '' });
        }
        assert.equal(treeDigest(directory), caseDigest, `${entry.id}: class integrity after ${host}`);
        for (const originalRelease of [21, 25]) {
          assert.deepEqual(inspectClassFiles(genuineDirectories[originalRelease], originalRelease, mainClass),
            genuineInventories[originalRelease], `${entry.id}: genuine compiler output must remain unchanged`);
        }
        assertVersionResult(result, entry, `${host}${release ? release : ''} ${entry.id}`);
        return result;
      };
      for (const release of entry.nativeReleases) {
        record.native.push({ release, result: await execute('native', release) });
        nativeExecutions++;
      }
      for (const host of guestHosts) {
        record.guests.push({ host, result: await execute(host) });
        comparisons++;
      }
      results.push(record);
      console.log(`PASS class header ${entry.id} ${JSON.stringify(record.input)}`);
    }
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(), runtimeDigests, 'CLI runtime integrity after version tests');
    assert.deepEqual(inputSnapshot(), inputDigests, 'Source, harness, helper and toolchain marker integrity');
    verifyJdks();
    const browserIntegrity = session ? session.verifyIntegrity() : null;
    const summary = { scope: 'JVM-001 class-version admission; final 21/25 controls and explicit header mutations only',
      nativeOnly, cases: results.length, genuine: results.filter((entry) => entry.controlKind === 'genuine-compiler-output').length,
      structural: results.filter((entry) => entry.controlKind === 'structural-header').length,
      negative: results.filter((entry) => entry.outcome === 'rejected').length, nativeExecutions, comparisons,
      inputDigests, runtimeDigests, browserProvenance: session?.provenance || null, browserIntegrity,
      node: nativeOnly ? null : { version: process.version, executable: process.execPath,
        sha256: inputDigests.find((entry) => entry.path === process.execPath).sha256 },
      toolchains: marker.toolchains.map(({ id, feature, version, archiveSha256 }) => ({ id, feature, version, archiveSha256,
        treeSha256: lock.toolchains.find((entry) => entry.id === id).treeSha256 })),
      standardInput: { bytes: 0, sha256: digest('') }, results };
    console.log(`PASS class-version gate: ${summary.genuine} genuine compiler controls, ` +
      `${summary.structural} structural header controls and ${summary.negative} negative cases; ` +
      `${nativeExecutions} native executions and ${comparisons} guest checks`);
    console.log(JSON.stringify({ provenance: { ...summary, results: undefined } }));
    return summary;
  } finally {
    try {
      if (session) await session.close();
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  try {
    const options = process.argv.slice(2);
    assert.ok(options.length <= 1 && options.every((option) => ['--browser', '--native-only'].includes(option)),
      'Usage: node ci/java_class_version_test.mjs [--browser | --native-only]');
    await runClassVersionTests({ browser: options.includes('--browser'), nativeOnly: options.includes('--native-only') });
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
