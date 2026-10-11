import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runCompatibility, runCommand, validateManifest} from './run_java_compatibility.mjs';

const script = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(script), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
export const finalRetainedFixtures = Object.freeze([
  Object.freeze({id: 'pattern-switch', releases: Object.freeze([21, 25])}),
  Object.freeze({id: 'switch-bootstrap-contracts', releases: Object.freeze([21, 25])}),
  Object.freeze({id: 'switch-bootstrap-api', releases: Object.freeze([21, 25])}),
  Object.freeze({id: 'switch-bootstrap-primitives', releases: Object.freeze([25])}),
  Object.freeze({id: 'switch-bootstrap-exact-conversions', releases: Object.freeze([25])}),
  Object.freeze({id: 'flexible-constructors', releases: Object.freeze([25])}),
  Object.freeze({id: 'module-imports', releases: Object.freeze([25])}),
  Object.freeze({id: 'unnamed-variables-patterns', releases: Object.freeze([25])})
]);
export const finalRetainedScope = 'B8 retained final-language seed slices; the full seed, launcher and evolved-switch gates remain independently mandatory.';
const expectedEntries = [21, 25].flatMap(release => finalRetainedFixtures.filter(fixture => fixture.releases.includes(release))
  .map(fixture => ({id: `${fixture.id}:jdk${release}`, fixtureId: fixture.id, release})));
const expectedCases = expectedEntries.map(entry => entry.id);

export function createFinalRetainedManifest(seed) {
  validateManifest(seed);
  const fixtures = finalRetainedFixtures.map(expected => {
    const original = seed.fixtures.find(fixture => fixture.id === expected.id);
    assert.ok(original, 'Every retained final-language fixture is mandatory');
    assert.deepEqual(original.releases, expected.releases, 'Exact retained release inventory');
    return structuredClone(original);
  });
  assert.equal(fixtures.filter(fixture => fixture.classGenerator).length, 1, 'Exactly one explicitly generated retained companion');
  assert.equal(fixtures.find(fixture => fixture.classGenerator).id, 'switch-bootstrap-contracts');
  assert.equal(fixtures.find(fixture => fixture.classGenerator).classGenerator, 'ci/generate_switch_bootstrap_fixture.mjs', 'Exact retained generator classification');
  const ids = new Set(fixtures.flatMap(fixture => fixture.requirementIds));
  return validateManifest({...structuredClone(seed), profile: 'phase-b-final-language-retained', fixtures,
    requirements: structuredClone(seed.requirements.filter(requirement => ids.has(requirement.id))),
    inventory: {...structuredClone(seed.inventory), scope: finalRetainedScope}});
}

export function assertFinalRetainedEvidence(ledger, {browser = true} = {}) {
  assert.equal(ledger.status, 'passed', 'Complete retained run');
  assert.deepEqual(ledger.selectedReleases, [21, 25]);
  assert.deepEqual(ledger.cases.map(entry => entry.id), expectedCases, 'Exact retained case/release inventory');
  assert.equal(ledger.summary.required, 11); assert.equal(ledger.summary.passed, 11);
  assert.equal(ledger.summary.failed, 0); assert.equal(ledger.summary.notRun, 0);
  assert.equal(ledger.inputIntegrity.status, 'passed');
  assert.equal(ledger.source.commit, ledger.sourceAtEnd.commit, 'Unchanged retained HEAD');
  assert.equal(ledger.source.trackedDirty, false, 'Clean retained inputs');
  assert.equal(ledger.sourceAtEnd.trackedDirty, false, 'Clean retained final inputs');
  for (const [index, entry] of ledger.cases.entries()) {
    assert.equal(entry.fixtureId, expectedEntries[index].fixtureId, 'Actual retained fixture identity');
    assert.equal(entry.release, expectedEntries[index].release, 'Actual retained release identity');
    assert.equal(entry.status, 'passed');
    assert.ok(Array.isArray(entry.classes) && entry.classes.length > 0, 'Original class-byte evidence');
    for (const file of entry.classes) {
      assert.equal(file.major, entry.release + 44); assert.equal(file.minor, 0); assert.match(file.sha256, /^[a-f0-9]{64}$/);
    }
    for (const host of ['compile', 'native', 'doppio', ...(browser ? ['browser'] : [])]) {
      const result = entry[host];
      assert.ok(result && !result.timedOut && !result.signal && !result.error && !result.outputLimitExceeded, 'Completed retained host');
      assert.equal(result.status, 'passed'); assert.equal(result.exitCode, 0);
      assert.equal(result.stderr, '', 'No compiler or successful execution diagnostics');
      if (host === 'compile') assert.equal(result.stdout, '', 'Clean retained compiler stdout');
    }
    for (const field of ['nativeSucceeded', 'doppioSucceeded', 'stdoutEqual', 'stderrEqual',
      ...(browser ? ['browserSucceeded', 'browserStdoutEqual', 'browserStderrEqual'] : [])])
      assert.equal(entry.comparison[field], true, 'Exact successful retained comparison');
    const normalize = value => {assert.equal(typeof value, 'string'); return value.replaceAll('\r\n', '\n');};
    assert.equal(normalize(entry.doppio.stdout), normalize(entry.native.stdout), 'Actual native/Node retained stdout equality');
    assert.equal(normalize(entry.doppio.stderr), normalize(entry.native.stderr), 'Actual native/Node retained stderr equality');
    if (browser) {
      assert.equal(normalize(entry.browser.stdout), normalize(entry.native.stdout), 'Actual native/Chromium retained stdout equality');
      assert.equal(normalize(entry.browser.stderr), normalize(entry.native.stderr), 'Actual native/Chromium retained stderr equality');
    }
    if (entry.id.startsWith('switch-bootstrap-contracts:')) {
      assert.equal(entry.classGenerator?.path, 'ci/generate_switch_bootstrap_fixture.mjs', 'Explicit generated companion provenance');
      assert.match(entry.classGenerator.sha256, /^[a-f0-9]{64}$/);
      assert.equal(entry.classGenerator.execution?.status, 'passed');
      assert.equal(entry.classGenerator.execution.exitCode, 0);
      assert.ok(!entry.classGenerator.execution.timedOut && !entry.classGenerator.execution.signal &&
        !entry.classGenerator.execution.error && !entry.classGenerator.execution.outputLimitExceeded);
    } else assert.equal(entry.classGenerator, undefined, 'Untouched javac retained classes are not generated');
  }
  if (browser) {assert.equal(ledger.browser.status, 'passed'); assert.equal(ledger.browser.summary.passed, 11);}
}

function writeEvidence(filename, ledger) {
  if (fs.existsSync(filename)) {
    const stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Regular retained ledger');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    fs.renameSync(temporary, filename);
  } finally {if (fs.existsSync(temporary)) fs.unlinkSync(temporary);}
}

export async function runFinalRetained({browser = true} = {}) {
  const sources = ['ci/java_compatibility_manifest.json', 'ci/java_final_language_retained_test.mjs',
    'ci/java_final_language_retained_contract_test.mjs'];
  const inputs = () => sources.map(filename => ({path: filename, sha256: sha(fs.readFileSync(path.join(root, filename)))}));
  const initialInputs = inputs(), seed = JSON.parse(fs.readFileSync(path.join(root, sources[0])));
  const manifest = createFinalRetainedManifest(seed);
  const git = await runCommand('git', ['status', '--porcelain=v1', '--untracked-files=no'], {cwd: root, timeoutMs: 10000});
  assert.equal(git.exitCode, 0); assert.equal(git.stdout, '', 'Commit final retained inputs before execution');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-final-retained-manifest-'));
  fs.chmodSync(directory, 0o700);
  const manifestPath = path.join(directory, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  const outputPath = path.join(root, browser ? 'build/java-final-language-retained-results.json' :
    'build/java-final-language-retained-diagnostic-results.json');
  // The seed runner checkpoints its complete raw ledger before wrapper checks.
  const ledger = await runCompatibility({manifestPath, outputPath, browser});
  ledger.retainedFinalLanguage = {scope: finalRetainedScope, officialGate: browser,
    fixtureInventory: structuredClone(finalRetainedFixtures), releaseCaseCount: 11, hostCaseCount: browser ? 33 : 22,
    inputDigests: initialInputs, phaseBComplete: false, jvm008Complete: false, fullSourceUnitConformanceProven: false,
    generalBootstrapConformanceProven: false, namedModuleRuntimeConformanceProven: false,
    generatedCompanion: {fixtureId: 'switch-bootstrap-contracts', generator: 'ci/generate_switch_bootstrap_fixture.mjs'},
    primitiveApiOracle: 'Pinned-native implementation-sensitive comparisons, not primitive preview source conformance.'};
  try {
    assert.deepEqual(inputs(), initialInputs, 'Unchanged retained seed and wrapper contracts');
    assertFinalRetainedEvidence(ledger, {browser});
  } catch (error) {
    ledger.status = 'failed'; ledger.errors.push(error.message);
    ledger.retainedFinalLanguage.validationError = error.message;
    for (const entry of ledger.cases) if (entry.status === 'passed') {
      entry.status = 'failed'; entry.error = 'Retained wrapper validation failed: ' + error.message;
    }
    ledger.summary = {required: ledger.cases.length, passed: 0,
      failed: ledger.cases.filter(entry => entry.status === 'failed').length,
      notRun: ledger.cases.filter(entry => entry.status === 'not-run').length};
  }
  writeEvidence(outputPath, ledger);
  return ledger;
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  assert.ok(process.argv.length === 3 && ['--browser', '--diagnostic'].includes(process.argv[2]), 'Select official browser or diagnostic mode');
  const ledger = await runFinalRetained({browser: process.argv[2] === '--browser'});
  console.log(JSON.stringify({scope: finalRetainedScope, status: ledger.status, summary: ledger.summary}));
  process.exitCode = ledger.status === 'passed' ? 0 : 1;
}
