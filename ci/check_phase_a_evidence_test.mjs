import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { versionCases } from './java_class_version_test.mjs';
import { validatePhaseAEvidence } from './check_phase_a_evidence.mjs';

const hash = 'a'.repeat(64);
const commit = 'b'.repeat(40);
const passed = { status: 'passed', exitCode: 0, signal: null, timedOut: false,
  outputLimitExceeded: false, error: null, stdout: '', stderr: '' };

function inputs() {
  const manifest = JSON.parse(fs.readFileSync(new URL('./java_compatibility_manifest.json', import.meta.url)));
  const cases = manifest.releases.flatMap((release) => manifest.fixtures
    .filter((fixture) => fixture.releases.includes(release)).map((fixture) => ({
      id: `${fixture.id}:jdk${release}`, release, requirementIds: fixture.requirementIds,
      workloadIds: fixture.workloadIds, packageIds: fixture.packageIds,
      status: 'passed', native: { ...passed }, doppio: { ...passed }, browser: { ...passed },
      classes: [{ path: 'Example.class', major: release + 44, minor: 0, sha256: hash }],
      comparison: Object.fromEntries(['nativeSucceeded', 'doppioSucceeded', 'stdoutEqual', 'stderrEqual',
        'browserSucceeded', 'browserStdoutEqual', 'browserStderrEqual'].map((key) => [key, true])),
    })));
  const summary = { required: cases.length, passed: cases.length, failed: 0, notRun: 0 };
  const seed = { schemaVersion: 1, status: 'passed', source: { commit, trackedDirty: false },
    manifest: { sha256: hash }, runner: { sha256: hash }, inputIntegrity: { status: 'passed' },
    errors: [], selectedReleases: [21, 25], browser: { status: 'passed', summary: { ...summary } },
    summary, cases };
  const expected = versionCases();
  const results = expected.map((entry) => {
    const result = entry.error ? { ...passed, status: 'failed', exitCode: 1,
      stderr: `Exception in thread "main" ${entry.error}: rejected\n` } :
      { ...passed, stdout: entry.expectedOutput || 'CLASS_VERSION_INITIALIZED\nCLASS_VERSION_MAIN\n' };
    return { id: entry.id, status: 'passed', baseRelease: entry.baseRelease,
      controlKind: entry.error ? 'negative-admission' : entry.mutation ? 'structural-header' : 'genuine-compiler-output',
      outcome: entry.error ? 'rejected' : 'accepted',
      input: { mutation: entry.mutation || null, sha256: entry.mutation ? 'c'.repeat(64) : hash,
        originalSha256: hash, classFiles: entry.mutation ? null :
          [{ major: entry.baseRelease + 44, minor: 0, sha256: hash }] },
      native: entry.nativeReleases.map((release) => ({ release, result: { ...result } })),
      guests: ['node', 'chromium'].map((host) => ({ host, result: { ...result } })),
    };
  });
  const admission = { schemaVersion: 1, status: 'passed', gitCommit: commit, gitTrackedDirty: false,
    nativeOnly: false, guestHosts: ['node', 'chromium'], notRunGuestHosts: [], results,
    cases: expected.length, comparisons: expected.length * 2,
    nativeExecutions: expected.reduce((count, entry) => count + entry.nativeReleases.length, 0),
    inputDigests: [{ path: '/repo/ci/admission.mjs', sha256: hash }] };
  return { manifest, seed, admission, commit, manifestSha256: hash, runnerSha256: hash,
    admissionInputHashes: { '/repo/ci/admission.mjs': hash } };
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
    (data) => { data.seed.source.commit = 'c'.repeat(40); },
    (data) => { data.admission.gitCommit = 'c'.repeat(40); },
    (data) => { data.seed.source.trackedDirty = true; },
    (data) => { delete data.admission.gitTrackedDirty; },
    (data) => { data.seed.manifest.sha256 = 'd'.repeat(64); },
    (data) => { data.seed.runner.sha256 = 'd'.repeat(64); },
    (data) => { data.admission.inputDigests = []; },
    (data) => { data.admission.inputDigests[0].sha256 = 'd'.repeat(64); },
    (data) => { data.seed.cases.pop(); },
    (data) => { delete data.seed.cases[0].packageIds; },
    (data) => { data.seed.cases.push(data.seed.cases[0]); },
    (data) => { data.admission.results.pop(); },
    (data) => { data.admission.results.push(data.admission.results[0]); },
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
