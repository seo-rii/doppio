import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {cancellationMessage, createFoundationCancellation, killFoundationProcess,
  ownedFoundationProcess, processIdentity} from './runtime_foundation_processes.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
// The full CLI inventory declares 34 minutes of individual execution budgets.
// Each native/guest deadline remains 30 seconds; aggregate cleanup is separate.
const suiteMinutes = {cli: 40, jar: 70};
const scopes = {
  cli: 'CLI argument, assertion and native module launch regressions',
  jar: 'JAR launcher parity across native Java, Node CLI, JVM API, interpreter/JIT, and Chromium.'
};

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  if (fs.existsSync(filename)) {
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error(`Refusing to replace linked results: ${filename}`);
  }
  fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', {mode: 0o600});
}

export function runFoundationSuite({name, script, args = ['--browser'], timeoutMs,
  resultsPath, scope = scopes[name], cwd = repoRoot, cleanupGraceMs = 35_000,
  signal, stdio = 'inherit'}) {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const record = {name, runId, status: 'running', exitCode: null, signal: null, error: null,
    timeoutMs, results: resultsPath, timedOut: false, forced: false, cleanupErrors: [], trackedProcesses: []};
  return new Promise(resolve => {
    const tracked = new Map();
    let deadline, fallback, stopping = false;
    const child = fork(script, args, {cwd, execArgv: [], detached: process.platform !== 'win32',
      env: {...process.env, DOPPIO_FOUNDATIONS_RUN_ID: runId},
      stdio: [stdio, stdio, stdio, 'ipc']});
    const suiteIdentity = processIdentity(child.pid);
    const cleanup = identity => {
      try { killFoundationProcess(identity); } catch (error) { record.cleanupErrors.push(error.message); }
    };
    const stop = (reason, timedOut = false) => {
      if (stopping) return;
      stopping = true;
      record.timedOut = timedOut;
      record.error = reason;
      if (child.connected) child.send({type: cancellationMessage, runId, reason}, () => {});
      // Suite handlers abort commands/browser resources, then their ordinary
      // finally blocks write ledgers. Playwright also handles pending launches.
      child.kill('SIGTERM');
      fallback = setTimeout(() => {
        record.forced = true;
        for (const identity of tracked.values()) cleanup(identity);
        if (child.exitCode === null && child.signalCode === null) {
          if (suiteIdentity) cleanup(suiteIdentity);
          else child.kill('SIGKILL');
        }
      }, cleanupGraceMs);
    };
    const abort = () => stop(signal.reason?.message || 'Foundation supervisor was cancelled.');
    child.on('message', message => {
      const identity = ownedFoundationProcess(message, runId, child.pid);
      if (!identity) return;
      if (message.operation === 'stop') {
        if (tracked.get(identity.pid)?.startTime === identity.startTime) tracked.delete(identity.pid);
      } else if (stopping) {
        // A launch notification can race with the deadline. It still belongs
        // to this suite and must not escape the pending cancellation.
        tracked.set(identity.pid, identity);
        record.trackedProcesses.push(identity);
        cleanup(identity);
      } else {
        tracked.set(identity.pid, identity);
        record.trackedProcesses.push(identity);
      }
    });
    child.once('error', error => { record.error = error.message; });
    child.once('close', (code, childSignal) => {
      clearTimeout(deadline);
      clearTimeout(fallback);
      signal?.removeEventListener('abort', abort);
      // An abruptly exited suite cannot deliver its own cleanup notification.
      for (const identity of tracked.values()) cleanup(identity);
      tracked.clear();
      record.exitCode = code;
      record.signal = childSignal;
      let ledger;
      try { ledger = JSON.parse(fs.readFileSync(resultsPath, 'utf8')); } catch {}
      const currentLedger = ledger?.runId === runId;
      record.status = !record.error && record.cleanupErrors.length === 0 && code === 0 && !childSignal && currentLedger &&
        ledger.status === 'passed' ? 'passed' : 'failed';
      if (!currentLedger || record.status === 'failed') {
        if (!currentLedger) ledger = {schemaVersion: 1, scope, runId, startedAt, cases: [],
          notRun: 'The suite did not finish writing its execution ledger.'};
        ledger.status = 'failed';
        ledger.error ||= record.error || `Foundation suite exited with status ${code}, signal ${childSignal}.`;
        ledger.supervisor = {timedOut: record.timedOut, forced: record.forced,
          cleanupErrors: record.cleanupErrors};
        ledger.completedAt = new Date().toISOString();
        try { writeJson(resultsPath, ledger); } catch (error) { record.cleanupErrors.push(error.message); }
      }
      resolve(record);
    });
    deadline = setTimeout(() => stop(`Foundation ${name} suite exceeded its aggregate deadline.`, true), timeoutMs);
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) abort();
  });
}

export async function runRuntimeFoundations({root = repoRoot, suites = ['cli', 'jar'].map(name => ({
  name, script: path.join(import.meta.dirname, `${name}_launch_test.mjs`),
  timeoutMs: suiteMinutes[name] * 60 * 1000,
  resultsPath: path.join(root, `build/${name}-foundations-results.json`)
})), signal} = {}) {
  const summary = {schemaVersion: 1, status: 'running', startedAt: new Date().toISOString(), suites: []};
  const destination = path.join(root, 'build/runtime-foundations-summary.json');
  writeJson(destination, summary);
  try {
    for (const suite of suites) {
      if (signal?.aborted) {
        summary.suites.push({name: suite.name, status: 'skipped', error: 'Supervisor was cancelled.'});
        continue;
      }
      summary.suites.push(await runFoundationSuite({...suite, cwd: root, signal}));
      writeJson(destination, summary);
    }
  } finally {
    summary.status = summary.suites.length === suites.length &&
      summary.suites.every(suite => suite.status === 'passed') ? 'passed' : 'failed';
    summary.finishedAt = new Date().toISOString();
    writeJson(destination, summary);
  }
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cancellation = createFoundationCancellation();
  try {
    const summary = await runRuntimeFoundations({signal: cancellation.signal});
    process.exitCode = summary.status === 'passed' ? 0 : 1;
  } finally {
    cancellation.dispose();
  }
}
