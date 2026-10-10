import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { assertVersionResult, versionCases } from './java_class_version_test.mjs';
import { treeDigest } from './prepare_java_compatibility_toolchains.mjs';
import { runtimeSnapshot, validateManifest } from './run_java_compatibility.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const seedScope = 'Mandatory Java compatibility fixtures on selected hosts; the full Java SE inventory remains incomplete.';
const admissionScope = 'JVM-001 genuine Java 21/25 class-file admission and explicit header controls';
const admissionInputFiles = ['classes/modern_fixture/JavaClassVersion.java',
  'classes/modern_fixture/JavaClassAdmissionShapes.java', 'ci/java_class_version_test.mjs',
  'ci/run_java_compatibility.mjs', 'ci/prepare_java_compatibility_toolchains.mjs',
  'ci/java_compatibility_toolchains.lock.json', 'build/java-compatibility-toolchains/toolchains.json'];

function hashFile(filename) {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(filename, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (!bytes) break;
      hash.update(buffer.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
}

function browserInventory(directory) {
  const files = [];
  function visit(candidate, relative) {
    const stat = fs.lstatSync(candidate);
    assert.equal(stat.isSymbolicLink(), false, 'Browser inputs must not contain symbolic links');
    if (stat.isDirectory()) {
      const listing = Object.create(null);
      for (const name of fs.readdirSync(candidate).sort()) {
        listing[name] = visit(path.join(candidate, name), relative ? `${relative}/${name}` : name);
      }
      return listing;
    }
    assert.equal(stat.isFile(), true, 'Browser inputs must be regular files');
    files.push({ path: relative, sha256: hashFile(candidate) });
    return null;
  }
  assert.equal(fs.lstatSync(directory).isDirectory(), true, 'Browser vendor directory');
  const listing = visit(directory, '');
  return { files, sha256: sha256(JSON.stringify({ listing, files })) };
}

function currentBrowserAssets() {
  const file = (filename) => ({ path: filename, sha256: hashFile(filename) });
  const bootstrapPath = path.join(repoRoot, 'vendor');
  const bootstrap = browserInventory(bootstrapPath);
  return { runtime: file(path.join(repoRoot, 'build/release/doppio.js')),
    browserfs: file(path.join(repoRoot, 'node_modules/browserfs/dist/browserfs.min.js')),
    bootstrap: { path: bootstrapPath, ...bootstrap },
    chromiumExecutable: file(process.env.DOPPIO_CHROMIUM_EXECUTABLE || chromium.executablePath()),
    adapter: file(path.join(repoRoot, 'ci/java_compatibility_browser.mjs')),
    node: process.version,
    playwright: JSON.parse(fs.readFileSync(path.join(repoRoot, 'node_modules/playwright/package.json'))).version };
}

function assertBrowserProvenance(provenance, current, label) {
  assert.ok(provenance && current, `${label}: browser provenance is required`);
  for (const key of ['runtime', 'browserfs', 'chromiumExecutable', 'adapter']) {
    assert.deepEqual(provenance[key], current[key], `${label}: ${key} provenance`);
  }
  assert.deepEqual(provenance.bootstrap, current.bootstrap, `${label}: browser bootstrap provenance`);
  assert.equal(provenance.node, current.node, `${label}: Node version`);
  assert.equal(provenance.playwright, current.playwright, `${label}: Playwright version`);
  assert.ok(typeof provenance.chromium === 'string' && provenance.chromium.length > 0,
    `${label}: Chromium version`);
}

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
  currentTrackedDirty, manifestSha256, runnerSha256, seedInputHashes, seedRuntime,
  admissionInputHashes, admissionRuntimeDigests, browserAssets }) {
  validateManifest(manifest);
  assert.match(commit, /^[a-f0-9]{40}$/, 'Current commit');
  assert.equal(currentTrackedDirty, false, 'Current tracked working tree must be clean');
  assert.match(manifestSha256, digestPattern, 'Current manifest hash');
  assert.match(runnerSha256, digestPattern, 'Current seed runner hash');
  const expectedAdmissionPaths = admissionInputFiles.map((filename) => path.join(repoRoot, filename));
  expectedAdmissionPaths.push(process.execPath);
  assert.deepEqual(Object.keys(admissionInputHashes || {}).sort(), expectedAdmissionPaths.sort(),
    'Current admission input hashes must be complete');
  for (const [filename, hash] of Object.entries(admissionInputHashes)) {
    assert.match(hash, digestPattern, `Current admission input hash: ${filename}`);
  }
  assert.match(seedRuntime?.snapshotSha256, digestPattern, 'Current seed runtime snapshot hash');
  assert.deepEqual(admissionRuntimeDigests?.map(([name]) => name), ['console', 'src', 'vendor/java_home'],
    'Current admission runtime tree names');
  for (const [name, hash] of admissionRuntimeDigests) {
    assert.match(hash, digestPattern, `Current admission runtime tree: ${name}`);
  }
  assert.equal(seed.schemaVersion, 1, 'Seed result schema');
  assert.equal(seed.scope, seedScope, 'Seed result scope');
  assert.equal(seed.status, 'passed', 'Seed gate must pass');
  assert.equal(seed.source?.commit, commit, 'Seed result must describe the current commit');
  assert.equal(seed.source.trackedDirty, false, 'Seed must run from committed inputs');
  assert.deepEqual(seed.sourceAtEnd, seed.source, 'Seed git provenance must remain stable through execution');
  assert.equal(seed.manifest?.sha256, manifestSha256, 'Seed manifest hash');
  assert.equal(seed.runner?.sha256, runnerSha256, 'Seed runner hash');
  assert.equal(seed.toolchainLock?.sha256,
    admissionInputHashes?.[path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json')],
  'Seed toolchain lock hash');
  assert.equal(seed.toolchainMarker?.sha256,
    admissionInputHashes?.[path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')],
  'Seed toolchain marker hash');
  assert.equal(seed.host?.nodeExecutableSha256, admissionInputHashes?.[process.execPath],
    'Seed Node executable hash');
  assert.equal(seed.host?.node, process.version, 'Seed Node version');
  assert.deepEqual(seed.runtime, seedRuntime, 'Seed runtime must match current complete snapshot');
  assert.equal(seed.inputIntegrity?.status, 'passed', 'Seed input integrity');
  assert.deepEqual(seed.errors, [], 'Seed errors');
  assert.deepEqual(seed.selectedReleases, [21, 25], 'Both Java target releases are required');
  assert.equal(seed.browser?.status, 'passed', 'Chromium seed gate must pass');
  assert.equal(seed.browser.required, true, 'Chromium seed gate must be required');
  assertBrowserProvenance(seed.browser.provenance, browserAssets, 'Seed Chromium');
  const expectedSeed = manifest.releases.flatMap((release) => manifest.fixtures
    .filter((fixture) => fixture.releases.includes(release))
    .map((fixture) => ({ id: `${fixture.id}:jdk${release}`, release, fixture })));
  const expectedSeedPaths = [...new Set(manifest.fixtures.flatMap((fixture) =>
    [fixture.source, fixture.classGenerator].filter(Boolean)))].sort();
  assert.deepEqual(Object.keys(seedInputHashes || {}).sort(), expectedSeedPaths,
    'Current seed source and generator hashes must be complete');
  for (const [filename, hash] of Object.entries(seedInputHashes)) {
    assert.match(hash, digestPattern, `Current seed input hash: ${filename}`);
  }
  const seedCases = indexed(seed.cases, expectedSeed.map((entry) => entry.id), 'Seed corpus');
  for (const { id, release, fixture } of expectedSeed) {
    const record = seedCases.get(id);
    assert.equal(record.status, 'passed', `${id}: aggregate status`);
    assert.equal(record.fixtureId, fixture.id, `${id}: fixture identity`);
    assert.equal(record.release, release, `${id}: release`);
    assert.equal(record.mainClass, fixture.mainClass, `${id}: main class`);
    assert.deepEqual(record.source, { path: fixture.source, sha256: seedInputHashes[fixture.source] },
      `${id}: current fixture source`);
    assert.deepEqual(record.standardInput, { bytes: Buffer.byteLength(fixture.standardInput || '', 'utf8'),
      sha256: sha256(fixture.standardInput || '') }, `${id}: standard input`);
    if (fixture.classGenerator) {
      assert.equal(record.classGenerator?.path, fixture.classGenerator, `${id}: class generator path`);
      assert.equal(record.classGenerator.sha256, seedInputHashes[fixture.classGenerator],
        `${id}: current class generator`);
      successful(record.classGenerator.execution, `${id} class generator`);
    } else assert.equal(record.classGenerator, undefined, `${id}: no class generator`);
    assert.deepEqual(record.requirementIds, fixture.requirementIds, `${id}: requirement provenance`);
    assert.deepEqual(record.workloadIds, fixture.workloadIds, `${id}: workload provenance`);
    assert.deepEqual(record.packageIds, fixture.packageIds, `${id}: package provenance`);
    successful(record.compile, `${id} javac`);
    for (const host of ['native', 'doppio', 'browser']) successful(record[host], `${id} ${host}`);
    assert.deepEqual(record.browser.browserErrors, [], `${id}: browser errors`);
    assert.equal(record.comparison?.status, 'passed', `${id}: comparison status`);
    assert.equal(record.comparison.normalization, 'CRLF to LF only', `${id}: comparison normalization`);
    for (const key of ['nativeSucceeded', 'doppioSucceeded', 'stdoutEqual', 'stderrEqual',
      'browserSucceeded', 'browserStdoutEqual', 'browserStderrEqual']) {
      assert.equal(record.comparison?.[key], true, `${id}: ${key}`);
    }
    assert.ok(record.classes?.length > 0, `${id}: emitted classes`);
    assert.ok(record.classes.some((file) => file.path === `${fixture.mainClass.replaceAll('.', '/')}.class`),
      `${id}: emitted main class`);
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
  assert.equal(admission.scope, admissionScope, 'Admission result scope');
  assert.equal(admission.status, 'passed', 'Admission gate must pass');
  assert.equal(admission.gitCommit, commit, 'Admission result must describe the current commit');
  assert.equal(admission.gitTrackedDirty, false, 'Admission must run from committed inputs');
  assert.equal(admission.gitCommitAtEnd, commit, 'Admission git commit must remain stable');
  assert.equal(admission.gitTrackedDirtyAtEnd, false, 'Admission tracked inputs must remain clean');
  assert.equal(admission.nativeOnly, false, 'Native-only results cannot finish admission');
  assert.deepEqual(admission.guestHosts, ['node', 'chromium'], 'Both admission guest hosts are required');
  assert.deepEqual(admission.notRunGuestHosts, [], 'No skipped admission hosts');
  assert.deepEqual(admission.runtimeDigests, admissionRuntimeDigests,
    'Admission runtime must match current complete tree digests');
  assertBrowserProvenance(admission.browserProvenance, browserAssets, 'Admission Chromium');
  assert.deepEqual(admission.browserIntegrity, { status: 'verified',
    runtimeSha256: browserAssets.runtime.sha256,
    browserfsSha256: browserAssets.browserfs.sha256,
    bootstrapSha256: browserAssets.bootstrap.sha256,
    chromiumExecutableSha256: browserAssets.chromiumExecutable.sha256,
    adapterSha256: browserAssets.adapter.sha256 }, 'Admission Chromium integrity');
  assert.ok(admissionInputHashes && Object.keys(admissionInputHashes).length > 0,
    'Current admission input hashes are required');
  for (const [filename, hash] of Object.entries(admissionInputHashes)) {
    const inputs = admission.inputDigests?.filter((entry) => entry.path === filename);
    assert.equal(inputs?.length, 1, `Admission input ${filename} must occur exactly once`);
    assert.equal(inputs[0].sha256, hash, `Admission input ${filename} hash`);
  }
  assert.deepEqual(admission.node, { version: process.version, executable: process.execPath,
    sha256: admissionInputHashes[process.execPath] }, 'Admission Node executable provenance');
  const expectedAdmission = versionCases();
  const admissionCases = indexed(admission.results, expectedAdmission.map((entry) => entry.id), 'Admission corpus');
  for (const entry of expectedAdmission) {
    const record = admissionCases.get(entry.id);
    assert.equal(record.status, 'passed', `${entry.id}: validated result`);
    const expectedKind = entry.error ? 'negative-admission' : entry.mutation ? 'structural-header' : 'genuine-compiler-output';
    assert.equal(record.controlKind, expectedKind, `${entry.id}: control origin`);
    assert.equal(record.baseRelease, entry.baseRelease, `${entry.id}: compiler release`);
    assert.equal(record.outcome, entry.error ? 'rejected' : 'accepted', `${entry.id}: expected admission`);
    assert.equal(record.expectedError, entry.error || null, `${entry.id}: expected Java error`);
    const corpus = entry.corpus || 'simple';
    const source = path.join(repoRoot, corpus === 'modern-shapes' ?
      'classes/modern_fixture/JavaClassAdmissionShapes.java' : 'classes/modern_fixture/JavaClassVersion.java');
    const classPath = corpus === 'modern-shapes' ?
      'classes/modern_test/JavaClassAdmissionShapes.class' : 'classes/modern_test/JavaClassVersion.class';
    assert.equal(record.corpus, corpus, `${entry.id}: corpus`);
    assert.equal(record.sourceSha256, admissionInputHashes[source], `${entry.id}: current corpus source`);
    assert.equal(record.input?.path, classPath, `${entry.id}: main class path`);
    assert.deepEqual(record.input?.mutation, entry.mutation || null, `${entry.id}: explicit mutation`);
    assert.match(record.input.sha256, digestPattern, `${entry.id}: input digest`);
    assert.match(record.input.originalSha256, digestPattern, `${entry.id}: compiler digest`);
    assert.match(record.input.treeSha256, digestPattern, `${entry.id}: class tree digest`);
    assert.ok(Number.isSafeInteger(record.input.size) && record.input.size >= 0,
      `${entry.id}: input byte size`);
    if (!entry.mutation) {
      assert.equal(record.input.sha256, record.input.originalSha256, `${entry.id}: untouched compiler bytes`);
      assert.ok(record.input.classFiles?.length > 0, `${entry.id}: complete emitted class inventory`);
      assert.ok(record.input.classFiles.some((file) => file.path === classPath &&
        file.sha256 === record.input.sha256), `${entry.id}: main class bytes in emitted inventory`);
      for (const file of record.input.classFiles) {
        assert.equal(file.major, entry.baseRelease + 44, `${entry.id}: genuine major`);
        assert.equal(file.minor, 0, `${entry.id}: genuine minor`);
        assert.match(file.sha256, digestPattern, `${entry.id}: emitted class digest`);
      }
    } else {
      assert.equal(record.input.classFiles, null, `${entry.id}: mutation is not genuine output`);
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
  assert.equal(admission.genuine, expectedAdmission.filter((entry) => !entry.mutation).length,
    'Admission genuine control count');
  assert.equal(admission.structural, expectedAdmission.filter((entry) => entry.mutation && !entry.error).length,
    'Admission structural control count');
  assert.equal(admission.negative, expectedAdmission.filter((entry) => entry.error).length,
    'Admission negative control count');
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
    const gitState = () => ({
      commit: execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
      trackedDirty: execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=no'],
        { cwd: repoRoot, encoding: 'utf8' }).trim().length > 0,
    });
    const start = gitState();
    assert.equal(start.trackedDirty, false, 'Current tracked working tree must be clean');
    const readJson = (filename) => JSON.parse(fs.readFileSync(path.join(repoRoot, filename), 'utf8'));
    const manifest = validateManifest(readJson('ci/java_compatibility_manifest.json'));
    const manifestPath = path.join(repoRoot, 'ci/java_compatibility_manifest.json');
    const runnerPath = path.join(repoRoot, 'ci/run_java_compatibility.mjs');
    const inputPaths = admissionInputFiles.map((filename) => path.join(repoRoot, filename));
    inputPaths.push(process.execPath);
    const seedPaths = [...new Set(manifest.fixtures.flatMap((fixture) =>
      [fixture.source, fixture.classGenerator].filter(Boolean)))];
    const trackedFiles = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot })
      .toString('utf8').split('\0').filter(Boolean));
    for (const filename of [...seedPaths, 'ci/java_compatibility_manifest.json',
      'ci/run_java_compatibility.mjs', 'ci/java_class_version_test.mjs',
      'ci/java_compatibility_browser.mjs']) {
      assert.ok(trackedFiles.has(filename), `Phase A source input is not committed: ${filename}`);
    }
    const result = validatePhaseAEvidence({ manifest,
      seed: readJson('build/java-compatibility-results.json'),
      admission: readJson('build/java-class-version-results.json'),
      commit: start.commit, currentTrackedDirty: start.trackedDirty,
      manifestSha256: hashFile(manifestPath), runnerSha256: hashFile(runnerPath),
      seedInputHashes: Object.fromEntries(seedPaths.map((filename) =>
        [filename, hashFile(path.join(repoRoot, filename))])),
      seedRuntime: runtimeSnapshot(repoRoot, path.join(repoRoot, 'build/release-cli/console/runner.js')),
      admissionInputHashes: Object.fromEntries(inputPaths.map((filename) => [filename, hashFile(filename)])),
      admissionRuntimeDigests: ['console', 'src', 'vendor/java_home'].map((relative) =>
        [relative, treeDigest(fs.realpathSync(path.join(repoRoot, 'build/release-cli', relative)))]),
      browserAssets: currentBrowserAssets() });
    const end = gitState();
    assert.deepEqual(end, start, 'Git provenance changed while checking Phase A evidence');
    assert.equal(end.trackedDirty, false, 'Current tracked working tree must be clean');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
