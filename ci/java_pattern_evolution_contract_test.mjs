import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertPatternEvolutionCoverage } from './java_pattern_evolution_test.mjs';

function validLedger(browser) {
  const hosts = browser ? ['native', 'node', 'chromium'] : ['native', 'node'];
  const ledger = { releases: [21, 25], hosts, matrices: [], cases: [], comparisons: browser ? 28 : 14 };
  for (const release of [21, 25]) {
    for (const id of ['enum', 'sealed-class', 'sealed-interface']) {
      const stages = id === 'enum' ? ['baseline', 'added', 'reordered'] : ['baseline', 'expanded'];
      ledger.matrices.push({ id: `${id}-jdk${release}`, status: 'passed', operations: stages.map(() => ({})) });
      for (const stage of stages) {
        ledger.cases.push({ id: `${id}-jdk${release}-${stage}`, status: 'passed',
          execution: Object.fromEntries(hosts.map((host) => [host, {}])),
          comparisons: Object.fromEntries(hosts.slice(1).map((host) => [host,
            { status: 'passed', stdoutEqual: true, stderrEqual: true, exitCodeEqual: true }])) });
      }
    }
  }
  return ledger;
}

test('complete Node and Chromium evolution ledgers pass', () => {
  assertPatternEvolutionCoverage(validLedger(false), { browser: false });
  assertPatternEvolutionCoverage(validLedger(true), { browser: true });
});

const mutations = {
  'missing matrix': (ledger) => ledger.matrices.pop(),
  'missing evolution stage': (ledger) => ledger.cases.splice(2, 1),
  'missing compiler invocation': (ledger) => ledger.matrices[0].operations.pop(),
  'missing Chromium execution': (ledger) => delete ledger.cases[0].execution.chromium,
  'missing Chromium comparison': (ledger) => delete ledger.cases[0].comparisons.chromium,
  'mismatched output': (ledger) => { ledger.cases[0].comparisons.node.stdoutEqual = false; },
  'incomplete total': (ledger) => { ledger.comparisons--; },
  'missing target release': (ledger) => ledger.releases.pop(),
  'reduced host set': (ledger) => ledger.hosts.pop(),
};

for (const [name, mutate] of Object.entries(mutations)) {
  test(`reject ${name}`, () => {
    const ledger = validLedger(true);
    mutate(ledger);
    assert.throws(() => assertPatternEvolutionCoverage(ledger, { browser: true }), assert.AssertionError);
  });
}
