import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertExitExecution, assertUncaughtExitCoverage, parseUncaughtExitOptions, uncaughtExitCases }
  from './java_uncaught_exit_test.mjs';

function execution(definition) {
  return { exitCode: definition.exitCode, status: definition.exitCode === 0 ? 'passed' : 'failed',
    signal: null, timedOut: false, outputLimitExceeded: false, error: null,
    stdout: definition.stdout, stderr: definition.stderr };
}

function validLedger(browser, releases = [21, 25]) {
  const hosts = browser ? ['native', 'node', 'chromium'] : ['native', 'node'];
  const ledger = { releases, hosts, compilations: [], cases: [],
    comparisons: uncaughtExitCases.length * releases.length * (hosts.length - 1) };
  for (const release of releases) {
    const classes = [{ path: 'classes/modern_test/JavaUncaughtExit.class', sha256: 'a'.repeat(64),
      size: 128, major: release + 44, minor: 0 }];
    ledger.compilations.push({ release, status: 'passed', classes,
      execution: { ...execution({ exitCode: 0, stdout: '', stderr: '' }),
        command: [`/locked/jdk${release}/bin/javac`, '--release', String(release)] } });
    for (const definition of uncaughtExitCases) {
      ledger.cases.push({ id: `${definition.id}-jdk${release}`, release, status: 'passed',
        expected: structuredClone(definition),
        mainClass: 'classes.modern_test.JavaUncaughtExit', arguments: [definition.id], classes: structuredClone(classes),
        execution: Object.fromEntries(hosts.map((host) => [host, execution(definition)])),
        comparisons: Object.fromEntries(hosts.slice(1).map((host) => [host,
          { status: 'passed', stdoutEqual: true, stderrEqual: true, exitCodeEqual: true }])) });
    }
  }
  return ledger;
}

test('complete Node and Chromium final exit-status matrices pass', () => {
  assertUncaughtExitCoverage(validLedger(false));
  assertUncaughtExitCoverage(validLedger(true), { browser: true });
});

test('an explicit focused release retains every case and selected host', () => {
  for (const release of [21, 25]) {
    assertUncaughtExitCoverage(validLedger(true, [release]), { browser: true, releases: [release] });
  }
});

test('nonzero process status is an expected successful oracle case', () => {
  for (const id of ['exception', 'main-handler', 'default-handler', 'initialization', 'exit-seven']) {
    const definition = uncaughtExitCases.find((entry) => entry.id === id);
    assertExitExecution(execution(definition), definition);
  }
});

test('child failure leaves normal main completion at zero', () => {
  for (const id of ['child-exception', 'child-handler']) {
    const definition = uncaughtExitCases.find((entry) => entry.id === id);
    assert.equal(definition.exitCode, 0);
    assertExitExecution(execution(definition), definition);
    assert.throws(() => assertExitExecution({ ...execution(definition), exitCode: 1, status: 'failed' }, definition),
      assert.AssertionError);
  }
});

test('a handled main failure remains nonzero and permits a surviving child to finish', () => {
  for (const id of ['main-handler', 'default-handler', 'live-child']) {
    const definition = uncaughtExitCases.find((entry) => entry.id === id);
    assert.equal(definition.exitCode, 1);
    assertExitExecution(execution(definition), definition);
    assert.throws(() => assertExitExecution({ ...execution(definition), exitCode: 0, status: 'passed' }, definition),
      assert.AssertionError);
  }
});

test('explicit System.exit preserves the exact exit code instead of mapping every failure to one', () => {
  const definition = uncaughtExitCases.find((entry) => entry.id === 'exit-seven');
  assertExitExecution(execution(definition), definition);
  assert.throws(() => assertExitExecution({ ...execution(definition), exitCode: 1 }, definition), assert.AssertionError);
});

test('System.exit from an uncaught main handler overrides the automatic failure status', () => {
  for (const [id, exitCode] of [['handler-exit-zero', 0], ['handler-exit-seven', 7]]) {
    const definition = uncaughtExitCases.find((entry) => entry.id === id);
    assert.equal(definition.exitCode, exitCode);
    assertExitExecution(execution(definition), definition);
    assert.throws(() => assertExitExecution({ ...execution(definition), exitCode: 1, status: 'failed' }, definition),
      assert.AssertionError);
  }
});

test('only CRLF is normalized; exception type, message, stack and output differences remain visible', () => {
  const definition = uncaughtExitCases.find((entry) => entry.id === 'exception');
  assertExitExecution({ ...execution(definition), stderr: definition.stderr.replaceAll('\n', '\r\n') }, definition);
  for (const stderr of [definition.stderr.trimEnd(), `${definition.stderr}\tat hidden.Frame.call(Frame.java:1)\n`,
    definition.stderr.replace('main-failure', 'different'), definition.stderr.replace('IllegalStateException', 'Error')]) {
    assert.throws(() => assertExitExecution({ ...execution(definition), stderr }, definition), assert.AssertionError);
  }
});

const mutations = {
  'missing target release': (ledger) => ledger.releases.pop(),
  'missing compiler invocation': (ledger) => ledger.compilations.pop(),
  'compiler targeting the wrong release': (ledger) => { ledger.compilations[0].execution.command[2] = '25'; },
  'preview compiler input': (ledger) => ledger.compilations[0].execution.command.push('--enable-preview'),
  'preview class header': (ledger) => { ledger.compilations[0].classes[0].minor = 65535; },
  'wrong class major': (ledger) => { ledger.compilations[0].classes[0].major = 69; },
  'missing generated class hash': (ledger) => { ledger.compilations[0].classes[0].sha256 = ''; },
  'missing generated main class': (ledger) => { ledger.compilations[0].classes[0].path = 'Wrong.class'; },
  'mutated case class bytes': (ledger) => { ledger.cases[0].classes[0].sha256 = 'b'.repeat(64); },
  'missing mandatory case': (ledger) => ledger.cases.splice(2, 1),
  'duplicated case instead of required case': (ledger) => { ledger.cases[2] = ledger.cases[1]; },
  'wrong main class': (ledger) => { ledger.cases[0].mainClass = 'Wrong'; },
  'wrong case argument': (ledger) => { ledger.cases[0].arguments = ['caught']; },
  'wrong case release': (ledger) => { ledger.cases[0].release = 25; },
  'mutated expected result': (ledger) => { ledger.cases[2].expected.exitCode = 0; },
  'skipped case': (ledger) => { ledger.cases[0].status = 'skipped'; },
  'zero-exit false success for uncaught main': (ledger) => {
    ledger.cases[2].execution.node.exitCode = 0;
    ledger.cases[2].execution.node.status = 'passed';
  },
  'all hosts falsely returning zero for uncaught main': (ledger) => {
    for (const result of Object.values(ledger.cases[2].execution)) {
      result.exitCode = 0;
      result.status = 'passed';
    }
  },
  'child error promoted to launcher failure': (ledger) => {
    const result = ledger.cases.find((entry) => entry.id === 'child-exception-jdk21').execution.node;
    result.exitCode = 1;
    result.status = 'failed';
  },
  'explicit seven replaced by generic one': (ledger) => {
    ledger.cases.find((entry) => entry.id === 'exit-seven-jdk21').execution.node.exitCode = 1;
  },
  'handler output swallowed': (ledger) => {
    ledger.cases.find((entry) => entry.id === 'main-handler-jdk21').execution.node.stdout = '';
  },
  'surviving child killed before completion': (ledger) => {
    ledger.cases.find((entry) => entry.id === 'live-child-jdk21').execution.node.stdout =
      'handler:main:java.lang.IllegalStateException\n';
  },
  'missing Chromium execution': (ledger) => delete ledger.cases[0].execution.chromium,
  'missing Chromium comparison': (ledger) => delete ledger.cases[0].comparisons.chromium,
  'reduced host set': (ledger) => ledger.hosts.pop(),
  'timeout despite matching output': (ledger) => { ledger.cases[0].execution.node.timedOut = true; },
  'signal despite matching output': (ledger) => { ledger.cases[0].execution.node.signal = 'SIGKILL'; },
  'output limit despite matching output': (ledger) => { ledger.cases[0].execution.node.outputLimitExceeded = true; },
  'host error despite matching output': (ledger) => { ledger.cases[0].execution.node.error = 'failed host'; },
  'browser error despite matching output': (ledger) => { ledger.cases[0].execution.chromium.browserErrors = ['error']; },
  'stderr mismatch hidden behind positive comparison flags': (ledger) => {
    ledger.cases[0].execution.node.stderr = 'unexpected\n';
  },
  'incomplete guest comparison': (ledger) => { ledger.cases[0].comparisons.node.exitCodeEqual = false; },
  'incomplete comparison total': (ledger) => { ledger.comparisons--; },
};

for (const [name, mutate] of Object.entries(mutations)) {
  test(`reject ${name}`, () => {
    const ledger = validLedger(true);
    mutate(ledger);
    assert.throws(() => assertUncaughtExitCoverage(ledger, { browser: true }), assert.AssertionError);
  });
}

test('CLI defaults to both mandatory releases and accepts only an explicit final focused release', () => {
  assert.deepEqual(parseUncaughtExitOptions([]), { browser: false, releases: [21, 25] });
  assert.deepEqual(parseUncaughtExitOptions(['--browser']), { browser: true, releases: [21, 25] });
  assert.deepEqual(parseUncaughtExitOptions(['--browser', '--release', '21']), { browser: true, releases: [21] });
  assert.deepEqual(parseUncaughtExitOptions(['--release', '25', '--browser']), { browser: true, releases: [25] });
  for (const args of [['--release'], ['--release', '24'], ['--preview'], ['--skip', 'exception'],
    ['--browser', '--browser'], ['--release', '21', '--release', '25']]) {
    assert.throws(() => parseUncaughtExitOptions(args), /Usage:/);
  }
});
