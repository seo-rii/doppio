import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { versionCases } from './java_class_version_test.mjs';
import { validatePhaseAEvidence } from './check_phase_a_evidence.mjs';

const hash = 'a'.repeat(64);
const commit = 'b'.repeat(40);
const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const passed = { status: 'passed', exitCode: 0, signal: null, timedOut: false,
  outputLimitExceeded: false, error: null, stdout: '', stderr: '' };

function inputs() {
  const manifest = JSON.parse(fs.readFileSync(new URL('./java_compatibility_manifest.json', import.meta.url)));
  const seedInputHashes = Object.fromEntries([...new Set(manifest.fixtures.flatMap((fixture) =>
    [fixture.source, fixture.classGenerator].filter(Boolean)))].map((filename) => [filename, hash]));
  const seedRuntime = { entrypoint: '/repo/build/release-cli/console/runner.js',
    entrypointSha256: hash, snapshotSha256: hash, files: [{ path: 'console/runner.js', sha256: hash, size: 1 }] };
  const browserAssets = { runtime: { path: '/repo/build/release/doppio.js', sha256: hash },
    browserfs: { path: '/repo/node_modules/browserfs/dist/browserfs.min.js', sha256: hash },
    bootstrap: { path: '/repo/vendor', sha256: hash, files: [{ path: 'jdk.json', sha256: hash }] },
    chromiumExecutable: { path: '/browser/chromium', sha256: hash },
    adapter: { path: '/repo/ci/java_compatibility_browser.mjs', sha256: hash },
    node: process.version, playwright: '1.57.0' };
  const browserProvenance = { ...structuredClone(browserAssets), chromium: 'test Chromium' };
  const cases = manifest.releases.flatMap((release) => manifest.fixtures
    .filter((fixture) => fixture.releases.includes(release)).map((fixture) => ({
      id: `${fixture.id}:jdk${release}`, fixtureId: fixture.id, release, mainClass: fixture.mainClass,
      source: { path: fixture.source, sha256: hash },
      standardInput: { bytes: Buffer.byteLength(fixture.standardInput || '', 'utf8'),
        sha256: sha256(fixture.standardInput || '') },
      ...(fixture.classGenerator ? { classGenerator: { path: fixture.classGenerator, sha256: hash,
        execution: { ...passed } } } : {}),
      requirementIds: fixture.requirementIds,
      workloadIds: fixture.workloadIds, packageIds: fixture.packageIds,
      status: 'passed', compile: { ...passed }, native: { ...passed }, doppio: { ...passed },
      browser: { ...passed, browserErrors: [] },
      classes: [{ path: `${fixture.mainClass.replaceAll('.', '/')}.class`, major: release + 44,
        minor: 0, sha256: hash }],
      comparison: { status: 'passed', normalization: 'CRLF to LF only',
        ...Object.fromEntries(['nativeSucceeded', 'doppioSucceeded', 'stdoutEqual', 'stderrEqual',
          'browserSucceeded', 'browserStdoutEqual', 'browserStderrEqual'].map((key) => [key, true])) },
    })));
  const summary = { required: cases.length, passed: cases.length, failed: 0, notRun: 0 };
  const seed = { schemaVersion: 1,
    scope: 'Mandatory Java compatibility fixtures on selected hosts; this seed alone does not establish full Java SE inventory completion.',
    status: 'passed', source: { commit, trackedDirty: false }, sourceAtEnd: { commit, trackedDirty: false },
    manifest: { sha256: hash }, runner: { sha256: hash },
    host: { node: process.version, nodeExecutableSha256: hash },
    toolchainLock: { sha256: hash }, toolchainMarker: { sha256: hash },
    runtime: structuredClone(seedRuntime), inputIntegrity: { status: 'passed' },
    errors: [], selectedReleases: [21, 25], browser: { status: 'passed', required: true,
      provenance: structuredClone(browserProvenance), summary: { ...summary } },
    summary, cases };
  const expected = versionCases();
  const results = expected.map((entry) => {
    const corpus = entry.corpus || 'simple';
    const classPath = corpus === 'modern-shapes' ? 'classes/modern_test/JavaClassAdmissionShapes.class' :
      'classes/modern_test/JavaClassVersion.class';
    const result = entry.error ? { ...passed, status: 'failed', exitCode: 1,
      stderr: `Exception in thread "main" ${entry.error}: rejected\n` } :
      { ...passed, stdout: entry.expectedOutput || 'CLASS_VERSION_INITIALIZED\nCLASS_VERSION_MAIN\n' };
    return { id: entry.id, status: 'passed', baseRelease: entry.baseRelease,
      controlKind: entry.error ? 'negative-admission' : entry.mutation ? 'structural-header' : 'genuine-compiler-output',
      outcome: entry.error ? 'rejected' : 'accepted', expectedError: entry.error || null, corpus,
      sourceSha256: hash,
      input: { path: classPath, size: 100, treeSha256: hash, mutation: entry.mutation || null,
        sha256: entry.mutation ? 'c'.repeat(64) : hash,
        originalSha256: hash, classFiles: entry.mutation ? null :
          [{ path: classPath, major: entry.baseRelease + 44, minor: 0, sha256: hash }] },
      native: entry.nativeReleases.map((release) => ({ release, result: { ...result } })),
      guests: ['node', 'chromium'].map((host) => ({ host, result: { ...result } })),
    };
  });
  const admissionRuntimeDigests = [['console', hash], ['src', hash], ['vendor/java_home', hash]];
  const admissionInputHashes = Object.fromEntries([
    'classes/modern_fixture/JavaClassVersion.java', 'classes/modern_fixture/JavaClassAdmissionShapes.java',
    'ci/java_class_version_test.mjs', 'ci/run_java_compatibility.mjs',
    'ci/prepare_java_compatibility_toolchains.mjs', 'ci/java_compatibility_toolchains.lock.json',
    'build/java-compatibility-toolchains/toolchains.json'].map((filename) => [path.join(repoRoot, filename), hash]));
  admissionInputHashes[process.execPath] = hash;
  const admission = { schemaVersion: 1,
    scope: 'JVM-001 genuine Java 21/25 class-file admission and explicit header controls',
    status: 'passed', gitCommit: commit, gitTrackedDirty: false,
    gitCommitAtEnd: commit, gitTrackedDirtyAtEnd: false,
    nativeOnly: false, guestHosts: ['node', 'chromium'], notRunGuestHosts: [], results,
    genuine: 4, structural: 4, negative: 19,
    cases: expected.length, comparisons: expected.length * 2,
    nativeExecutions: expected.reduce((count, entry) => count + entry.nativeReleases.length, 0),
    inputDigests: Object.entries(admissionInputHashes).map(([filename, sha]) => ({ path: filename, sha256: sha })),
    runtimeDigests: structuredClone(admissionRuntimeDigests), browserProvenance: structuredClone(browserProvenance),
    browserIntegrity: { status: 'verified', runtimeSha256: hash, browserfsSha256: hash,
      bootstrapSha256: hash, chromiumExecutableSha256: hash, adapterSha256: hash },
    node: { version: process.version, executable: process.execPath, sha256: hash } };
  return { manifest, seed, admission, commit, currentTrackedDirty: false,
    manifestSha256: hash, runnerSha256: hash, seedInputHashes, seedRuntime,
    admissionInputHashes, admissionRuntimeDigests, browserAssets };
}

test('phase A evidence accounts for both complete dual-host corpora without claiming conformance', () => {
  const result = validatePhaseAEvidence(inputs());
  assert.equal(result.status, 'passed');
  assert.equal(result.seedCases, 29);
  assert.equal(result.seedGuestComparisons, 58);
  assert.equal(result.admissionCases, 27);
  assert.equal(result.admissionGuestComparisons, 54);
  assert.equal(result.fullJavaSeConformance, false);
});

test('stale, dirty, partial or changed-input results cannot close phase A evidence', () => {
  const mutations = [
    (data) => { data.currentTrackedDirty = true; },
    (data) => { data.seed.source.commit = 'c'.repeat(40); },
    (data) => { data.seed.sourceAtEnd.commit = 'c'.repeat(40); },
    (data) => { data.admission.gitCommit = 'c'.repeat(40); },
    (data) => { data.admission.gitCommitAtEnd = 'c'.repeat(40); },
    (data) => { data.seed.source.trackedDirty = true; },
    (data) => { data.admission.gitTrackedDirtyAtEnd = true; },
    (data) => { delete data.admission.gitTrackedDirty; },
    (data) => { data.seed.manifest.sha256 = 'd'.repeat(64); },
    (data) => { data.seed.runner.sha256 = 'd'.repeat(64); },
    (data) => { data.seed.toolchainLock.sha256 = 'd'.repeat(64); },
    (data) => { data.seed.host.nodeExecutableSha256 = 'd'.repeat(64); },
    (data) => { data.seed.runtime.files.pop(); },
    (data) => { data.admission.runtimeDigests.pop(); },
    (data) => { data.browserAssets.runtime.sha256 = 'd'.repeat(64); },
    (data) => { data.browserAssets.bootstrap.files.pop(); },
    (data) => { delete data.seed.browser.provenance; },
    (data) => { delete data.admission.browserProvenance; },
    (data) => { delete data.admission.browserIntegrity; },
    (data) => { data.admission.browserIntegrity.status = 'not-verified'; },
    (data) => { data.admission.inputDigests = []; },
    (data) => { data.admission.inputDigests[0].sha256 = 'd'.repeat(64); },
    (data) => { data.seedInputHashes[data.seed.cases[0].source.path] = 'd'.repeat(64); },
    (data) => { data.seed.cases.pop(); },
    (data) => { delete data.seed.cases[0].source; },
    (data) => { delete data.seed.cases[0].compile; },
    (data) => { delete data.seed.cases.find((entry) => entry.classGenerator).classGenerator; },
    (data) => { delete data.seed.cases[0].packageIds; },
    (data) => { data.seed.cases.push(data.seed.cases[0]); },
    (data) => { data.admission.results.pop(); },
    (data) => { data.admission.results.push(data.admission.results[0]); },
    (data) => { delete data.admission.results[0].sourceSha256; },
    (data) => { delete data.admission.results[0].corpus; },
    (data) => { delete data.admission.results[0].input.path; },
    (data) => { delete data.admission.results[0].input.treeSha256; },
    (data) => { data.admission.results[0].input.classFiles[0].path = 'Other.class'; },
    (data) => { data.seed.browser.status = 'not-run'; },
    (data) => { data.seed.cases[0].browser.timedOut = true; },
    (data) => { data.seed.cases[0].comparison.browserStdoutEqual = false; },
    (data) => { data.admission.results[0].guests.pop(); },
    (data) => { data.admission.nativeOnly = true; },
    (data) => { data.admission.notRunGuestHosts = ['chromium']; },
    (data) => { data.admission.comparisons--; },
  ];
  for (const mutate of mutations) {
    const data = inputs();
    mutate(data);
    assert.throws(() => validatePhaseAEvidence(data), undefined, mutate.toString());
  }
});

test('patched classes and false rejection records cannot masquerade as genuine admission evidence', () => {
  const mutations = [
    (data) => { data.admission.results[0].input.sha256 = 'e'.repeat(64); },
    (data) => { data.admission.results[0].input.classFiles[0].major = 61; },
    (data) => { data.admission.results[0].input.classFiles[0].minor = 65535; },
    (data) => { data.admission.results[4].controlKind = 'genuine-compiler-output'; },
    (data) => { data.admission.results[4].input.originalSha256 = 'e'.repeat(64); },
    (data) => { data.admission.results.find((entry) => entry.outcome === 'rejected')
      .guests[0].result.stderr = 'TypeError: host exception\n'; },
    (data) => { data.admission.results.find((entry) => entry.outcome === 'rejected')
      .guests[1].result.stdout = 'CLASS_VERSION_MAIN\n'; },
  ];
  for (const mutate of mutations) {
    const data = inputs();
    mutate(data);
    assert.throws(() => validatePhaseAEvidence(data), undefined, mutate.toString());
  }
});
