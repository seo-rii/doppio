import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createFinalRetainedManifest, finalRetainedFixtures, assertFinalRetainedEvidence} from './java_final_language_retained_test.mjs';

const seed = () => JSON.parse(fs.readFileSync(fileURLToPath(new URL('./java_compatibility_manifest.json', import.meta.url))));
test('retention keeps eight exact original fixture contracts, eleven release entries and classifications', () => {
  const original = seed(), before = structuredClone(original), selected = createFinalRetainedManifest(original);
  assert.deepEqual(original, before, 'No full-seed pruning or mutation');
  assert.deepEqual(selected.fixtures.map(fixture => fixture.id), finalRetainedFixtures.map(fixture => fixture.id));
  assert.equal(selected.fixtures.reduce((sum, fixture) => sum + fixture.releases.length, 0), 11);
  for (const fixture of selected.fixtures) assert.deepEqual(fixture, original.fixtures.find(entry => entry.id === fixture.id));
  assert.equal(selected.fixtures.find(fixture => fixture.classGenerator).classGenerator, 'ci/generate_switch_bootstrap_fixture.mjs');
  for (const id of ['switch-bootstrap-primitives', 'switch-bootstrap-exact-conversions'])
    assert.match(selected.fixtures.find(fixture => fixture.id === id).limitations, /Implementation-sensitive/);
  assert.match(selected.fixtures.find(fixture => fixture.id === 'module-imports').limitations, /no runtime named-module/);
});

test('missing, duplicate, skipped, release-pruned or unclassified retained fixtures fail', () => {
  for (const mutate of [s => s.fixtures.splice(s.fixtures.findIndex(f => f.id === 'pattern-switch'), 1),
    s => s.fixtures.push(structuredClone(s.fixtures.find(f => f.id === 'pattern-switch'))),
    s => s.fixtures.find(f => f.id === 'pattern-switch').skip = true,
    s => {const f = s.fixtures.find(f => f.id === 'pattern-switch'); f.releases = [25]; f.workloadIds = ['W-JAVA25'];},
    s => delete s.fixtures.find(f => f.id === 'switch-bootstrap-contracts').classGenerator,
    s => s.fixtures.find(f => f.id === 'switch-bootstrap-contracts').classGenerator = 'ci/other.mjs',
    s => s.fixtures.find(f => f.id === 'pattern-switch').classGenerator = 'ci/generate_switch_bootstrap_fixture.mjs']) {
    const changed = seed(); mutate(changed); assert.throws(() => createFinalRetainedManifest(changed));
  }
});

// Synthetic raw-result contract only: not evidence for compiler/host execution.
function ledger() {
  const completed = () => ({status: 'passed', exitCode: 0, timedOut: false, signal: null,
    error: null, outputLimitExceeded: false, stdout: '', stderr: ''});
  return {status: 'passed', selectedReleases: [21, 25], summary: {required: 11, passed: 11, failed: 0, notRun: 0},
    source: {commit: 'synthetic', trackedDirty: false}, sourceAtEnd: {commit: 'synthetic', trackedDirty: false},
    inputIntegrity: {status: 'passed'}, browser: {status: 'passed', summary: {passed: 11}},
    cases: [21, 25].flatMap(release => finalRetainedFixtures.filter(f => f.releases.includes(release)).map(f => ({
      id: `${f.id}:jdk${release}`, release, status: 'passed',
      classes: [{path: 'Synthetic.class', major: release + 44, minor: 0, sha256: 'a'.repeat(64)}],
      compile: completed(), native: completed(), doppio: completed(), browser: completed(),
      ...(f.id === 'switch-bootstrap-contracts' ? {classGenerator: {path: 'ci/generate_switch_bootstrap_fixture.mjs',
        sha256: 'a'.repeat(64), execution: completed()}} : {}),
      comparison: Object.fromEntries(['nativeSucceeded', 'doppioSucceeded', 'stdoutEqual', 'stderrEqual',
        'browserSucceeded', 'browserStdoutEqual', 'browserStderrEqual'].map(field => [field, true]))
    })))};
}

test('retention requires complete exact raw executions and unchanged clean provenance', () => {
  assert.doesNotThrow(() => assertFinalRetainedEvidence(ledger()));
  for (const mutate of [l => l.cases.pop(), l => l.cases.push(structuredClone(l.cases[0])),
    l => l.cases.reverse(), l => l.cases[0].native.timedOut = true, l => l.cases[0].browser.signal = 'SIGTERM',
    l => l.cases[0].compile.stderr = 'warning', l => l.cases[0].compile.stdout = 'unexpected',
    l => l.cases[0].doppio.exitCode = 1, l => l.cases[0].comparison.browserStdoutEqual = false,
    l => l.cases[0].classes[0].minor = 65535, l => l.cases[0].classes = [],
    l => delete l.cases[1].classGenerator, l => l.cases[1].classGenerator.execution.exitCode = 1,
    l => l.sourceAtEnd.commit = 'different', l => l.source.trackedDirty = true,
    l => l.inputIntegrity.status = 'failed', l => l.browser.status = 'not-run']) {
    const changed = ledger(); mutate(changed); assert.throws(() => assertFinalRetainedEvidence(changed));
  }
});
