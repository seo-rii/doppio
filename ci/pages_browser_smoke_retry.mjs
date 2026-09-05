import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const TRANSIENT_FAILURE_EXIT_CODE = 75;
export const SMOKE_SCRIPT_PATH = fileURLToPath(
  new URL('./pages_browser_smoke.mjs', import.meta.url)
);

const DEFAULT_ATTEMPTS = 3;
const MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 15_000;
const MAX_RETRY_DELAY_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const MAX_TIMEOUT_MS = 600_000;

const transientFailurePatterns = [
  /Failed to load \.\/runtime\//i,
  /\b(?:404|408|425|429|5[0-9]{2})\s+https?:\/\/[^\s'"]+/i,
  /\bnet::ERR_[A-Z0-9_]+\b/,
  /\brequest failed https?:\/\/[^\s'"]+/i,
];

function describeDetail(detail) {
  if (detail instanceof Error) {
    const parts = [detail.stack || detail.message];
    if (Object.prototype.hasOwnProperty.call(detail, 'actual')) {
      try {
        parts.push(JSON.stringify(detail.actual));
      } catch {
        parts.push(String(detail.actual));
      }
    }
    return parts.join('\n');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function isRetryablePagesFailure(...details) {
  const description = details.map(describeDetail).join('\n');
  return transientFailurePatterns.some((pattern) => pattern.test(description));
}

export function reportRetryablePagesFailure(
  error,
  browserErrors,
  writeDiagnostic = (message) => console.error(message)
) {
  if (!isRetryablePagesFailure(error, browserErrors)) {
    return null;
  }
  writeDiagnostic('[pages-smoke] retryable remote asset failure detected.');
  writeDiagnostic(describeDetail(error));
  if (browserErrors.length > 0) {
    writeDiagnostic(`[pages-smoke] browser errors: ${JSON.stringify(browserErrors)}`);
  }
  return TRANSIENT_FAILURE_EXIT_CODE;
}

function readBoundedInteger(environment, name, fallback, minimum, maximum) {
  const rawValue = environment[name];
  if (rawValue === undefined) {
    return fallback;
  }
  if (!/^(0|[1-9][0-9]*)$/.test(rawValue)) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function signalExitCode(signal) {
  const signalNumber = signal ? os.constants.signals[signal] : undefined;
  return Number.isInteger(signalNumber) ? 128 + signalNumber : 1;
}

function describeResult(result, timeoutMs) {
  if (result.error?.code === 'ETIMEDOUT') {
    return `timeout after ${timeoutMs} ms`;
  }
  if (result.status !== null) {
    return `exit code ${result.status}`;
  }
  return result.signal ? `signal ${result.signal}` : 'an unknown process failure';
}

const sleep = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

export async function runPagesBrowserSmokeWithRetry({
  environment = process.env,
  spawn = spawnSync,
  wait = sleep,
  writeDiagnostic = (message) => console.error(message),
} = {}) {
  let attempts;
  let retryDelayMs;
  let timeoutMs;
  try {
    attempts = readBoundedInteger(
      environment,
      'DOPPIO_PAGES_SMOKE_ATTEMPTS',
      DEFAULT_ATTEMPTS,
      1,
      MAX_ATTEMPTS
    );
    retryDelayMs = readBoundedInteger(
      environment,
      'DOPPIO_PAGES_SMOKE_RETRY_DELAY_MS',
      DEFAULT_RETRY_DELAY_MS,
      0,
      MAX_RETRY_DELAY_MS
    );
    timeoutMs = readBoundedInteger(
      environment,
      'DOPPIO_PAGES_SMOKE_TIMEOUT_MS',
      DEFAULT_TIMEOUT_MS,
      1_000,
      MAX_TIMEOUT_MS
    );
  } catch (error) {
    writeDiagnostic(`[pages-smoke] ${error.message}`);
    return 2;
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    writeDiagnostic(`[pages-smoke] starting attempt ${attempt}/${attempts}.`);
    const result = spawn(process.execPath, [SMOKE_SCRIPT_PATH], {
      env: environment,
      stdio: 'inherit',
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
      windowsHide: true,
    });
    const timedOut = result.error?.code === 'ETIMEDOUT';

    if (result.error && !timedOut) {
      writeDiagnostic(`[pages-smoke] could not start browser smoke: ${result.error.message}`);
      return 1;
    }
    if (!timedOut && result.status === 0) {
      if (attempt > 1) {
        writeDiagnostic(`[pages-smoke] recovered on attempt ${attempt}/${attempts}.`);
      }
      return 0;
    }

    const resultDescription = describeResult(result, timeoutMs);
    const retryable = timedOut || result.status === TRANSIENT_FAILURE_EXIT_CODE;
    const exitCode = timedOut ? 124 : result.status ?? signalExitCode(result.signal);
    if (!retryable) {
      writeDiagnostic(`[pages-smoke] failed without retry (${resultDescription}).`);
      return exitCode;
    }
    if (attempt === attempts) {
      writeDiagnostic(
        `[pages-smoke] failed after ${attempts} attempts (${resultDescription}).`
      );
      return exitCode;
    }

    const backoffMs = Math.min(retryDelayMs * attempt, MAX_RETRY_DELAY_MS);
    writeDiagnostic(
      `[pages-smoke] attempt ${attempt}/${attempts} failed with ${resultDescription}; ` +
      `retrying in ${backoffMs} ms.`
    );
    await wait(backoffMs);
  }

  return 1;
}
