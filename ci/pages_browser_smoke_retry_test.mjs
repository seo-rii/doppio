import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  isRetryablePagesFailure,
  reportRetryablePagesFailure,
  runPagesBrowserSmokeWithRetry,
  SMOKE_SCRIPT_PATH,
  TRANSIENT_FAILURE_EXIT_CODE,
} from './pages_browser_smoke_retry.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runnerPath = path.join(repoRoot, 'ci', 'run_pages_browser_smoke_with_retry.mjs');

const exited = (status) => ({error: undefined, signal: null, status});

async function exercise(outcomes, environment = {}) {
  const calls = [];
  const waits = [];
  const diagnostics = [];
  let outcomeIndex = 0;
  const status = await runPagesBrowserSmokeWithRetry({
    environment,
    spawn(command, args, options) {
      calls.push({command, args, options});
      const outcome = outcomes[Math.min(outcomeIndex, outcomes.length - 1)];
      outcomeIndex += 1;
      return outcome;
    },
    wait(milliseconds) {
      waits.push(milliseconds);
      return Promise.resolve();
    },
    writeDiagnostic(message) {
      diagnostics.push(message);
    },
  });
  return {calls, diagnostics, status, waits};
}

const deployedEnvironment = {DOPPIO_PAGES_URL: 'https://example.test/doppio/'};
const recovered = await exercise(
  [exited(TRANSIENT_FAILURE_EXIT_CODE), exited(0)],
  deployedEnvironment
);
assert.equal(recovered.status, 0);
assert.equal(recovered.calls.length, 2);
assert.deepEqual(recovered.waits, [15_000]);
assert.match(recovered.diagnostics.join('\n'), /recovered on attempt 2\/3/);
for (const call of recovered.calls) {
  assert.equal(call.command, process.execPath);
  assert.deepEqual(call.args, [SMOKE_SCRIPT_PATH]);
  assert.equal(call.options.env, deployedEnvironment);
  assert.equal(call.options.env.DOPPIO_PAGES_URL, 'https://example.test/doppio/');
  assert.equal(call.options.stdio, 'inherit');
  assert.equal(call.options.timeout, 600_000);
  assert.equal(call.options.killSignal, 'SIGKILL');
  assert.equal(call.options.windowsHide, true);
}

const exhausted = await exercise([
  exited(TRANSIENT_FAILURE_EXIT_CODE),
  exited(TRANSIENT_FAILURE_EXIT_CODE),
  exited(TRANSIENT_FAILURE_EXIT_CODE),
]);
assert.equal(exhausted.status, TRANSIENT_FAILURE_EXIT_CODE);
assert.equal(exhausted.calls.length, 3);
assert.deepEqual(exhausted.waits, [15_000, 30_000]);
assert.match(exhausted.diagnostics.join('\n'), /failed after 3 attempts \(exit code 75\)/);

const cappedBackoff = await exercise(
  [
    exited(TRANSIENT_FAILURE_EXIT_CODE),
    exited(TRANSIENT_FAILURE_EXIT_CODE),
    exited(TRANSIENT_FAILURE_EXIT_CODE),
  ],
  {DOPPIO_PAGES_SMOKE_RETRY_DELAY_MS: '60000'}
);
assert.equal(cappedBackoff.status, TRANSIENT_FAILURE_EXIT_CODE);
assert.deepEqual(cappedBackoff.waits, [60_000, 60_000]);

const deterministicFailure = await exercise([exited(37)]);
assert.equal(deterministicFailure.status, 37);
assert.equal(deterministicFailure.calls.length, 1);
assert.deepEqual(deterministicFailure.waits, []);
assert.match(deterministicFailure.diagnostics.join('\n'), /failed without retry \(exit code 37\)/);

const signaledFailure = await exercise([
  {error: undefined, signal: 'SIGTERM', status: null},
]);
assert.equal(signaledFailure.status, 143);
assert.equal(signaledFailure.calls.length, 1);
assert.deepEqual(signaledFailure.waits, []);
assert.match(signaledFailure.diagnostics.join('\n'), /failed without retry \(signal SIGTERM\)/);

const timeoutError = Object.assign(new Error('timed out'), {code: 'ETIMEDOUT'});
const timedOutThenRecovered = await exercise([
  {error: timeoutError, signal: 'SIGKILL', status: null},
  exited(0),
]);
assert.equal(timedOutThenRecovered.status, 0);
assert.equal(timedOutThenRecovered.calls.length, 2);
assert.match(timedOutThenRecovered.diagnostics.join('\n'), /timeout after 600000 ms/);

const exhaustedTimeout = await exercise(
  [{error: timeoutError, signal: 'SIGKILL', status: null}],
  {DOPPIO_PAGES_SMOKE_ATTEMPTS: '1'}
);
assert.equal(exhaustedTimeout.status, 124);
assert.equal(exhaustedTimeout.calls.length, 1);
assert.deepEqual(exhaustedTimeout.waits, []);

const spawnError = Object.assign(new Error('missing executable'), {code: 'ENOENT'});
const failedToSpawn = await exercise([
  {error: spawnError, signal: null, status: null},
]);
assert.equal(failedToSpawn.status, 1);
assert.equal(failedToSpawn.calls.length, 1);
assert.deepEqual(failedToSpawn.waits, []);
assert.match(failedToSpawn.diagnostics.join('\n'), /could not start browser smoke/);

const configured = await exercise(
  [exited(TRANSIENT_FAILURE_EXIT_CODE), exited(0)],
  {
    DOPPIO_PAGES_SMOKE_ATTEMPTS: '2',
    DOPPIO_PAGES_SMOKE_RETRY_DELAY_MS: '7',
    DOPPIO_PAGES_SMOKE_TIMEOUT_MS: '1000',
  }
);
assert.equal(configured.status, 0);
assert.equal(configured.calls.length, 2);
assert.deepEqual(configured.waits, [7]);
assert.equal(configured.calls[0].options.timeout, 1_000);

for (const [name, value] of [
  ['DOPPIO_PAGES_SMOKE_ATTEMPTS', '0'],
  ['DOPPIO_PAGES_SMOKE_ATTEMPTS', '4'],
  ['DOPPIO_PAGES_SMOKE_ATTEMPTS', 'three'],
  ['DOPPIO_PAGES_SMOKE_RETRY_DELAY_MS', '-1'],
  ['DOPPIO_PAGES_SMOKE_RETRY_DELAY_MS', '60001'],
  ['DOPPIO_PAGES_SMOKE_TIMEOUT_MS', '999'],
  ['DOPPIO_PAGES_SMOKE_TIMEOUT_MS', '600001'],
]) {
  const invalid = await exercise([exited(0)], {[name]: value});
  assert.equal(invalid.status, 2, `${name}=${value}`);
  assert.equal(invalid.calls.length, 0, `${name}=${value}`);
  assert.match(invalid.diagnostics.join('\n'), new RegExp(`${name} must be an integer`));
}

assert.equal(
  isRetryablePagesFailure('Error: Failed to load ./runtime/browserfs.min.js'),
  true
);
assert.equal(
  isRetryablePagesFailure({actual: [
    '503 http://seorii.page/doppio/playground/runtime/compilers/kotlin/kotlin-test-sources.jar',
  ]}),
  true
);
assert.equal(
  isRetryablePagesFailure('request failed https://example.test/runtime/doppio.js'),
  true
);
assert.equal(isRetryablePagesFailure('AssertionError: output did not match'), false);
assert.equal(isRetryablePagesFailure('400 https://example.test/runtime/doppio.js'), false);

const reportedDiagnostics = [];
const reportedError = Object.assign(new Error('remote runtime request failed'), {
  actual: [
    '503 http://seorii.page/doppio/playground/runtime/compilers/kotlin/kotlin-test-sources.jar',
  ],
});
assert.equal(
  reportRetryablePagesFailure(
    reportedError,
    ['Failed to load resource: 503 Service Unavailable'],
    (message) => reportedDiagnostics.push(message)
  ),
  TRANSIENT_FAILURE_EXIT_CODE
);
assert.match(reportedDiagnostics.join('\n'), /retryable remote asset failure detected/);
assert.match(reportedDiagnostics.join('\n'), /kotlin-test-sources\.jar/);

const deterministicDiagnostics = [];
assert.equal(
  reportRetryablePagesFailure(
    new Error('deterministic assertion failed'),
    [],
    (message) => deterministicDiagnostics.push(message)
  ),
  null
);
assert.deepEqual(deterministicDiagnostics, []);

const browserSmokeSource = fs.readFileSync(SMOKE_SCRIPT_PATH, 'utf8');
assert.match(
  browserSmokeSource,
  /const failureExitCode = reportRetryablePagesFailure\(error, browserErrors\);\s+if \(failureExitCode === null\) \{\s+throw error;\s+\}\s+process\.exitCode = failureExitCode;/
);

const entrypointFailure = spawnSync(process.execPath, [runnerPath], {
  encoding: 'utf8',
  env: {
    ...process.env,
    DOPPIO_PAGES_SMOKE_ATTEMPTS: '0',
  },
});
assert.equal(entrypointFailure.status, 2, entrypointFailure.stderr);
assert.match(entrypointFailure.stderr, /DOPPIO_PAGES_SMOKE_ATTEMPTS must be an integer/);

console.log('Pages browser smoke retry tests passed.');
