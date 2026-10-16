import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import test from 'node:test';
import {runFoundationSuite, runRuntimeFoundations} from './runtime_foundations.mjs';
import {killFoundationProcess, processIdentity} from './runtime_foundation_processes.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const cancellationUrl = pathToFileURL(path.join(import.meta.dirname, 'runtime_foundation_processes.mjs')).href;
const commandUrl = pathToFileURL(path.join(import.meta.dirname, 'run_java_compatibility.mjs')).href;
const browserUrl = pathToFileURL(path.join(import.meta.dirname, 'java_compatibility_browser.mjs')).href;
const linux = process.platform === 'linux';

function running(identity) {
  const current = processIdentity(identity.pid);
  if (!current || (identity.startTime && current.startTime !== identity.startTime)) return false;
  return current.state !== 'Z';
}

async function stopped(identity) {
  for (let attempt = 0; attempt < 100 && running(identity); attempt++) await delay(20);
  assert.equal(running(identity), false, `Owned process ${identity.pid} survived suite cleanup.`);
}

function fixture(t, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-foundation-cleanup-'));
  const script = path.join(root, 'suite.mjs');
  const resultsPath = path.join(root, 'fixture-results.json');
  fs.writeFileSync(script, `
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runCommand} from ${JSON.stringify(commandUrl)};
import {createFoundationCancellation, processIdentity} from ${JSON.stringify(cancellationUrl)};
const root = ${JSON.stringify(root)};
const cancellation = createFoundationCancellation();
const ledger = {schemaVersion: 1, scope: 'fixture', status: 'running',
  runId: process.env.DOPPIO_FOUNDATIONS_RUN_ID, cases: []};
try {
${body}
  ledger.status = 'passed';
} catch (error) {
  ledger.status = 'failed'; ledger.error = error.message; process.exitCode = 1;
} finally {
  cancellation.dispose();
  fs.writeFileSync(${JSON.stringify(resultsPath)}, JSON.stringify(ledger));
}
`);
  t.after(() => {
    for (const name of ['vm.pid', 'descendant.pid']) {
      const filename = path.join(root, name);
      if (fs.existsSync(filename)) {
        const identity = JSON.parse(fs.readFileSync(filename, 'utf8'));
        if (running(identity)) {
          try { process.kill(identity.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
        }
      }
    }
    fs.rmSync(root, {recursive: true, force: true});
  });
  return {root, script, resultsPath, name: 'fixture', scope: 'fixture',
    args: [], timeoutMs: 1500, cleanupGraceMs: 1500, stdio: 'ignore'};
}

function guestBody({exitLeader = false, cancel = true, abrupt} = {}) {
  const savePid = `const stat = require('node:fs').readFileSync('/proc/' + process.pid + '/stat', 'utf8');
    const startTime = stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19];`;
  const descendant = `${savePid} require('node:fs').writeFileSync(process.argv[1],
    JSON.stringify({pid: process.pid, startTime})); setInterval(() => {}, 1000);`;
  return `
const code = ${JSON.stringify(`
  const fs = require('node:fs');
  const path = require('node:path');
  ${savePid}
  fs.writeFileSync(path.join(process.argv[1], 'vm.pid'), JSON.stringify({pid: process.pid, startTime}));
  require('node:child_process').spawn(process.execPath,
    ['-e', ${JSON.stringify(descendant)}, path.join(process.argv[1], 'descendant.pid')], {stdio: 'inherit'});
  ${exitLeader ? "fs.writeFileSync(path.join(process.argv[1], 'leader-exited'), 'yes'); process.exit(0);" : 'setInterval(() => {}, 1000);'}
`)};
const execution = runCommand(process.execPath, ['-e', code, root],
  {cwd: root, timeoutMs: 30000${cancel ? ', signal: cancellation.signal' : ''}});
${abrupt ? `for (let attempt = 0; attempt < 200 && !fs.existsSync(path.join(root, 'descendant.pid')); attempt++) {
  await new Promise(resolve => setTimeout(resolve, 10));
}
${abrupt === 'exit' ? 'process.exit(1);' : "process.kill(process.pid, 'SIGKILL');"}` : ''}
const result = await execution;
ledger.cases.push(result);
assert.equal(result.status, 'passed', result.error);
`;
}

test('supervised commands preserve exact streams, input, environment, exit status, signals and spawn errors', {skip: !linux}, async t => {
  const setup = fixture(t, `
const record = await runCommand(process.execPath, ['-e',
  'process.stdout.write(process.env.FOUNDATION_VALUE + String.fromCharCode(10)); process.stdin.pipe(process.stdout); process.stderr.write("stderr" + String.fromCharCode(10)); process.exitCode = 7;'],
  {cwd: root, timeoutMs: 30000, standardInput: '한글\\t\\n', environment: {...process.env, FOUNDATION_VALUE: '  value  '}});
ledger.cases.push(record);
assert.equal(record.stdout, '  value  \\n한글\\t\\n');
assert.equal(record.stderr, 'stderr\\n');
assert.equal(record.exitCode, 7);
assert.equal(record.signal, null);
assert.equal(record.error, null);
const failed = await runCommand('doppio-foundation-command-does-not-exist', [], {cwd: root, timeoutMs: 30000});
assert.match(failed.error, /ENOENT/);
const signalled = await runCommand(process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM")'],
  {cwd: root, timeoutMs: 30000});
assert.equal(signalled.exitCode, null);
assert.equal(signalled.signal, 'SIGTERM');
ledger.cases.push(failed, signalled);
`);
  const summary = await runRuntimeFoundations({root: setup.root, suites: [{...setup, timeoutMs: 5000}]});
  assert.equal(summary.status, 'passed', JSON.stringify({summary,
    ledger: JSON.parse(fs.readFileSync(setup.resultsPath))}));
  assert.equal(JSON.parse(fs.readFileSync(setup.resultsPath)).cases.length, 3);
  assert.equal(JSON.parse(fs.readFileSync(path.join(setup.root, 'build/runtime-foundations-summary.json'))).status, 'passed');
  for (const identity of summary.suites[0].trackedProcesses) await stopped(identity);
});

for (const exitLeader of [false, true]) {
  test(`aggregate cancellation writes the suite ledger and kills descendants (leader exits: ${exitLeader})`,
    {skip: !linux}, async t => {
      const setup = fixture(t, guestBody({exitLeader}));
      const result = await runFoundationSuite(setup);
      assert.equal(result.timedOut, true, JSON.stringify(result));
      assert.equal(result.forced, false, JSON.stringify(result));
      assert.equal(result.status, 'failed');
      const ledger = JSON.parse(fs.readFileSync(setup.resultsPath));
      assert.equal(ledger.status, 'failed');
      assert.equal(ledger.runId, result.runId);
      assert.equal(ledger.cases[0].cancelled, true, 'The cooperative suite must reach its ordinary finally block.');
      for (const name of ['vm.pid', 'descendant.pid']) {
        await stopped(JSON.parse(fs.readFileSync(path.join(setup.root, name), 'utf8')));
      }
      if (exitLeader) assert.equal(fs.readFileSync(path.join(setup.root, 'leader-exited'), 'utf8'), 'yes');
      for (const identity of result.trackedProcesses) await stopped(identity);
    });
}

test('an unresponsive suite gets bounded group cleanup and a fallback timeout ledger', {skip: !linux}, async t => {
  const setup = fixture(t, guestBody({exitLeader: true, cancel: false}));
  setup.cleanupGraceMs = 250;
  const result = await runFoundationSuite(setup);
  assert.equal(result.timedOut, true);
  assert.equal(result.forced, true);
  assert.equal(result.signal, 'SIGKILL');
  const ledger = JSON.parse(fs.readFileSync(setup.resultsPath));
  assert.equal(ledger.status, 'failed');
  assert.equal(ledger.supervisor.forced, true);
  assert.match(ledger.notRun, /did not finish/);
  for (const name of ['vm.pid', 'descendant.pid']) {
    await stopped(JSON.parse(fs.readFileSync(path.join(setup.root, name), 'utf8')));
  }
  for (const identity of result.trackedProcesses) await stopped(identity);
});

for (const abrupt of ['exit', 'SIGKILL']) {
  test(`abrupt suite ${abrupt} before queued registration is handled cannot orphan its VM`,
    {skip: !linux}, async t => {
      const setup = fixture(t, guestBody({abrupt, cancel: false}));
      setup.timeoutMs = 5000;
      const pending = runFoundationSuite(setup);
      // Keep actual child IPC queued until the owner has exited and its
      // detached child would otherwise have been reparented to init.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
      const result = await pending;
      assert.equal(result.status, 'failed');
      assert.equal(result.timedOut, false);
      assert.equal(result.exitCode, abrupt === 'exit' ? 1 : null);
      assert.equal(result.signal, abrupt === 'exit' ? null : 'SIGKILL');
      assert.equal(JSON.parse(fs.readFileSync(setup.resultsPath)).status, 'failed');
      for (const name of ['vm.pid', 'descendant.pid']) {
        await stopped(JSON.parse(fs.readFileSync(path.join(setup.root, name), 'utf8')));
      }
      for (const identity of result.trackedProcesses) await stopped(identity);
    });
}

test('IPC cannot authorize killing unrelated or reused process identities', {skip: !linux}, async t => {
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {detached: true, stdio: 'ignore'});
  t.after(() => {
    try { process.kill(-unrelated.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  });
  const identity = processIdentity(unrelated.pid);
  assert.equal(killFoundationProcess({...identity, startTime: identity.startTime + '-reused'}), false);
  const setup = fixture(t, `
process.send({type: 'doppio-foundation-process', operation: 'start',
  runId: process.env.DOPPIO_FOUNDATIONS_RUN_ID, identity: ${JSON.stringify(identity)}});
await new Promise(resolve => cancellation.signal.addEventListener('abort', resolve, {once: true}));
throw cancellation.signal.reason;
`);
  const result = await runFoundationSuite(setup);
  assert.equal(result.timedOut, true);
  assert.equal(result.trackedProcesses.some(process => process.pid === unrelated.pid), false);
  assert.equal(running(identity), true, 'A process outside the actual suite ancestry must remain untouched.');
});

test('a missing current-run ledger cannot reuse stale passing results', async t => {
  const setup = fixture(t, '');
  fs.writeFileSync(setup.script, 'process.exitCode = 0;');
  fs.writeFileSync(setup.resultsPath, JSON.stringify({runId: 'previous-run', status: 'passed'}));
  const result = await runFoundationSuite(setup);
  assert.equal(result.status, 'failed');
  const ledger = JSON.parse(fs.readFileSync(setup.resultsPath));
  assert.equal(ledger.status, 'failed');
  assert.equal(ledger.runId, result.runId);
});

test('SIGTERM of the aggregate supervisor cleans the active suite and records later suites as skipped',
  {skip: !linux}, async t => {
    const setup = fixture(t, guestBody());
    const supervisorUrl = pathToFileURL(path.join(import.meta.dirname, 'runtime_foundations.mjs')).href;
    const code = `
import {runRuntimeFoundations} from ${JSON.stringify(supervisorUrl)};
import {createFoundationCancellation} from ${JSON.stringify(cancellationUrl)};
const cancellation = createFoundationCancellation();
try {
  const summary = await runRuntimeFoundations({root: ${JSON.stringify(setup.root)},
    suites: ${JSON.stringify([{...setup, timeoutMs: 30000}, {...setup, name: 'later'}])},
    signal: cancellation.signal});
  process.exitCode = summary.status === 'passed' ? 0 : 1;
} finally { cancellation.dispose(); }
`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', code],
      {detached: true, stdio: 'ignore'});
    t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
    const completion = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({code, signal}));
    });
    const ready = path.join(setup.root, 'descendant.pid');
    for (let attempt = 0; attempt < 100 && !fs.existsSync(ready); attempt++) await delay(20);
    assert.equal(fs.existsSync(ready), true, 'The actual VM descendant must be running before SIGTERM.');
    child.kill('SIGTERM');
    const result = await Promise.race([completion,
      delay(5000, null, {ref: false}).then(() => { throw new Error('SIGTERM cleanup exceeded five seconds.'); })]);
    assert.deepEqual(result, {code: 1, signal: null});
    const summary = JSON.parse(fs.readFileSync(path.join(setup.root, 'build/runtime-foundations-summary.json')));
    assert.equal(summary.status, 'failed');
    assert.equal(summary.suites[0].forced, false);
    assert.equal(summary.suites[1].status, 'skipped');
    assert.equal(JSON.parse(fs.readFileSync(setup.resultsPath)).status, 'failed');
    for (const name of ['vm.pid', 'descendant.pid']) {
      await stopped(JSON.parse(fs.readFileSync(path.join(setup.root, name), 'utf8')));
    }
    for (const identity of summary.suites[0].trackedProcesses) await stopped(identity);
  });

test('aggregate cancellation closes real Chromium and retains the interrupted execution ledger', {skip: !linux}, async t => {
  const setup = fixture(t, `
const {createBrowserSession} = await import(${JSON.stringify(browserUrl)});
const session = await createBrowserSession({repoRoot: root, signal: cancellation.signal});
try {
  fs.writeFileSync(path.join(root, 'browser-ready'), 'yes');
  const result = await session.execute({classesPath: path.join(root, 'classes'), mainClass: 'Loop', timeoutMs: 30000});
  ledger.cases.push(result);
  assert.equal(result.status, 'passed', result.error);
} finally {
  await session.close();
}
`);
  const write = (name, data) => {
    const filename = path.join(setup.root, name);
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, data);
  };
  write('build/release/doppio.js', 'window.Doppio = {VM: {CLI() { for (;;) {} }}};');
  write('node_modules/browserfs/dist/browserfs.min.js', fs.readFileSync(path.join(repoRoot, 'node_modules/browserfs/dist/browserfs.min.js')));
  write('vendor/java_home/jdk.json', '{"classpath":[]}');
  write('classes/Loop.class', Buffer.from([0xca, 0xfe, 0xba, 0xbe]));
  setup.timeoutMs = 8000;
  setup.cleanupGraceMs = 5000;
  const result = await runFoundationSuite(setup);
  assert.equal(result.timedOut, true);
  assert.equal(result.forced, false, JSON.stringify(result));
  assert.equal(fs.readFileSync(path.join(setup.root, 'browser-ready'), 'utf8'), 'yes');
  const ledger = JSON.parse(fs.readFileSync(setup.resultsPath));
  assert.equal(ledger.status, 'failed');
  assert.equal(ledger.cases.length, 1, ledger.error);
  assert.ok(result.trackedProcesses.length > 0, 'The actual Chromium process must be tracked.');
  for (const identity of result.trackedProcesses) await stopped(identity);
});
