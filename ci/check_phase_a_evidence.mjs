import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertVersionResult, versionCases } from './java_class_version_test.mjs';
import { validateManifest } from './run_java_compatibility.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;

function indexed(records, expectedIds, label) {
  assert.ok(Array.isArray(records), `${label}: records are required`);
  assert.deepEqual(records.map((record) => record.id).sort(), [...expectedIds].sort(),
    `${label}: exact mandatory case IDs, without duplicates`);
  return new Map(records.map((record) => [record.id, record]));
}

function successful(record, label) {
  assert.equal(record?.status, 'passed', `${label}: status`);
  assert.equal(record.exitCode, 0, `${label}: exit code`);
  assert.equal(record.signal, null, `${label}: signal`);
  assert.equal(record.timedOut, false, `${label}: timeout`);
  assert.equal(record.outputLimitExceeded, false, `${label}: output limit`);
  assert.equal(record.error, null, `${label}: host error`);
}

export function validatePhaseAEvidence({ manifest, seed, admission, commit,
  manifestSha256, runnerSha256, admissionInputHashes }) {
  validateManifest(manifest);
  assert.match(commit, /^[a-f0-9]{40}$/, 'Current commit');
  assert.equal(seed.schemaVersion, 1, 'Seed result schema');
  assert.equal(seed.status, 'passed', 'Seed gate must pass');
  assert.equal(seed.source?.commit, commit, 'Seed result must describe the current commit');
  assert.equal(seed.source.trackedDirty, false, 'Seed must run from committed inputs');
  assert.equal(seed.manifest?.sha256, manifestSha256, 'Seed manifest hash');
  assert.equal(seed.runner?.sha256, runnerSha256, 'Seed runner hash');
  assert.equal(seed.inputIntegrity?.status, 'passed', 'Seed input integrity');
  assert.deepEqual(seed.errors, [], 'Seed errors');
  assert.deepEqual(seed.selectedReleases, [21, 25], 'Both Java target releases are required');
  assert.equal(seed.browser?.status, 'passed', 'Chromium seed gate must pass');
  const expectedSeed = manifest.releases.flatMap((release) => manifest.fixtures
    .filter((fixture) => fixture.releases.includes(release))
    .map((fixture) => ({ id: `${fixture.id}:jdk${release}`, release, fixture })));
  const seedCases = indexed(seed.cases, expectedSeed.map((entry) => entry.id), 'Seed corpus');
  for (const { id, release, fixture } of expectedSeed) {
    const record = seedCases.get(id);
    assert.equal(record.status, 'passed', `${id}: aggregate status`);
    assert.equal(record.release, release, `${id}: release`);
    assert.deepEqual(record.requirementIds, fixture.requirementIds, `${id}: requirement provenance`);
    assert.deepEqual(record.workloadIds, fixture.workloadIds, `${id}: workload provenance`);
    assert.deepEqual(record.packageIds, fixture.packageIds, `${id}: package provenance`);
    for (const host of ['native', 'doppio', 'browser']) successful(record[host], `${id} ${host}`);
    for (const key of ['nativeSucceeded', 'doppioSucceeded', 'stdoutEqual', 'stderrEqual',
      'browserSucceeded', 'browserStdoutEqual', 'browserStderrEqual']) {
      assert.equal(record.comparison?.[key], true, `${id}: ${key}`);
    }
    assert.ok(record.classes?.length > 0, `${id}: emitted classes`);
    for (const file of record.classes) {
      assert.equal(file.major, release + 44, `${id} ${file.path}: actual javac release`);
      assert.equal(file.minor, 0, `${id} ${file.path}: final-only class`);
      assert.match(file.sha256, digestPattern, `${id} ${file.path}: class digest`);
    }
  }
  const seedSummary = { required: expectedSeed.length, passed: expectedSeed.length, failed: 0, notRun: 0 };
  assert.deepEqual(seed.summary, seedSummary, 'Seed summary');
  assert.deepEqual(seed.browser.summary, seedSummary, 'Chromium seed summary');

  assert.equal(admission.schemaVersion, 1, 'Admission result schema');
  assert.equal(admission.status, 'passed', 'Admission gate must pass');
  assert.equal(admission.gitCommit, commit, 'Admission result must describe the current commit');
  assert.equal(admission.gitTrackedDirty, false, 'Admission must run from committed inputs');
  assert.equal(admission.nativeOnly, false, 'Native-only results cannot finish admission');
  assert.deepEqual(admission.guestHosts, ['node', 'chromium'], 'Both admission guest hosts are required');
  assert.deepEqual(admission.notRunGuestHosts, [], 'No skipped admission hosts');
  assert.ok(admissionInputHashes && Object.keys(admissionInputHashes).length > 0,
    'Current admission input hashes are required');
  for (const [filename, hash] of Object.entries(admissionInputHashes)) {
    const inputs = admission.inputDigests?.filter((entry) => entry.path === filename);
    assert.equal(inputs?.length, 1, `Admission input ${filename} must occur exactly once`);
    assert.equal(inputs[0].sha256, hash, `Admission input ${filename} hash`);
  }
  const expectedAdmission = versionCases();
  const admissionCases = indexed(admission.results, expectedAdmission.map((entry) => entry.id), 'Admission corpus');
  for (const entry of expectedAdmission) {
    const record = admissionCases.get(entry.id);
    assert.equal(record.status, 'passed', `${entry.id}: validated result`);
    const expectedKind = entry.error ? 'negative-admission' : entry.mutation ? 'structural-header' : 'genuine-compiler-output';
    assert.equal(record.controlKind, expectedKind, `${entry.id}: control origin`);
    assert.equal(record.baseRelease, entry.baseRelease, `${entry.id}: compiler release`);
    assert.equal(record.outcome, entry.error ? 'rejected' : 'accepted', `${entry.id}: expected admission`);
    assert.deepEqual(record.input?.mutation, entry.mutation || null, `${entry.id}: explicit mutation`);
    assert.match(record.input.sha256, digestPattern, `${entry.id}: input digest`);
    assert.match(record.input.originalSha256, digestPattern, `${entry.id}: compiler digest`);
    if (!entry.mutation) {
      assert.equal(record.input.sha256, record.input.originalSha256, `${entry.id}: untouched compiler bytes`);
      assert.ok(record.input.classFiles?.length > 0, `${entry.id}: complete emitted class inventory`);
      for (const file of record.input.classFiles) {
        assert.equal(file.major, entry.baseRelease + 44, `${entry.id}: genuine major`);
        assert.equal(file.minor, 0, `${entry.id}: genuine minor`);
        assert.match(file.sha256, digestPattern, `${entry.id}: emitted class digest`);
      }
    } else {
      assert.equal(record.input.originalSha256,
        admissionCases.get(`genuine-release${entry.baseRelease}`).input.sha256,
        `${entry.id}: mutation must derive from its genuine compiler control`);
    }
    assert.deepEqual(record.native.map((result) => result.release), entry.nativeReleases,
      `${entry.id}: native reference hosts`);
    assert.deepEqual(record.guests.map((result) => result.host), ['node', 'chromium'],
      `${entry.id}: guest hosts`);
    for (const result of [...record.native, ...record.guests]) {
      assertVersionResult(result.result, entry, `${entry.id} ${result.host || result.release}`);
    }
  }
  assert.equal(admission.cases, expectedAdmission.length, 'Admission case count');
  assert.equal(admission.comparisons, expectedAdmission.length * 2, 'Admission guest comparisons');
  assert.equal(admission.nativeExecutions,
    expectedAdmission.reduce((count, entry) => count + entry.nativeReleases.length, 0), 'Admission native count');
  return { schemaVersion: 1, scope: 'phase-a-current-commit-execution-evidence', status: 'passed',
    commit, seedCases: expectedSeed.length, seedGuestComparisons: expectedSeed.length * 2,
    admissionCases: expectedAdmission.length, admissionGuestComparisons: expectedAdmission.length * 2,
    fullJavaSeConformance: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    assert.equal(process.argv.length, 2, 'Usage: node ci/check_phase_a_evidence.mjs');
    const readJson = (filename) => JSON.parse(fs.readFileSync(path.join(repoRoot, filename), 'utf8'));
    const manifestPath = path.join(repoRoot, 'ci/java_compatibility_manifest.json');
    const runnerPath = path.join(repoRoot, 'ci/run_java_compatibility.mjs');
    const inputPaths = ['classes/modern_fixture/JavaClassVersion.java',
      'classes/modern_fixture/JavaClassAdmissionShapes.java', 'ci/java_class_version_test.mjs',
      'ci/run_java_compatibility.mjs', 'ci/prepare_java_compatibility_toolchains.mjs',
      'ci/java_compatibility_toolchains.lock.json', 'build/java-compatibility-toolchains/toolchains.json']
      .map((filename) => path.join(repoRoot, filename));
    inputPaths.push(process.execPath);
    const result = validatePhaseAEvidence({ manifest: readJson('ci/java_compatibility_manifest.json'),
      seed: readJson('build/java-compatibility-results.json'),
      admission: readJson('build/java-class-version-results.json'),
      commit: execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
      manifestSha256: sha256(fs.readFileSync(manifestPath)), runnerSha256: sha256(fs.readFileSync(runnerPath)),
      admissionInputHashes: Object.fromEntries(inputPaths.map((filename) => [filename, sha256(fs.readFileSync(filename))])) });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
