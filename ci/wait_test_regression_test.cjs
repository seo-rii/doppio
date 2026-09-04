'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'classes', 'test', 'WaitTest.java');
const readinessLoop = [
  '    // Wait for all five worker threads to be in the waiting state.',
  '    while (a.thread.getState() != Thread.State.WAITING ||',
  '      b.thread.getState() != Thread.State.WAITING ||',
  '      c.thread.getState() != Thread.State.WAITING ||',
  '      d.thread.getState() != Thread.State.WAITING ||',
  '      e.thread.getState() != Thread.State.WAITING) {',
  '      Thread.currentThread().sleep(50);',
  '    }',
].join('\n');
const historicalReadinessLoop = readinessLoop.replaceAll(' ||', ' &&');
const expectedOutput = [
  'Interrupting one thread.',
  'Interrupted',
  'Notifying one thread.',
  'Notifying the rest of the threads.',
  'Main thread relinquishing lock!',
  'Not interrupted',
  'Not interrupted',
  'Not interrupted',
  'Not interrupted',
  '',
].join('\n');
const processTimeoutMs = 15_000;
const processOutputLimit = 64 * 1024;
const stressRuns = 32;

function replaceRequired(value, search, replacement) {
  const first = value.indexOf(search);
  if (first === -1 || first !== value.lastIndexOf(search)) {
    throw new Error('Expected exactly one WaitTest readiness loop.');
  }
  return value.slice(0, first) + replacement + value.slice(first + search.length);
}

function checkWaitSource(source) {
  assert.equal(
    source.split(readinessLoop).length - 1,
    1,
    'WaitTest must wait for all five workers with the exact disjunctive readiness loop.'
  );
  assert.match(
    source,
    /Foo a = new Foo\(\);\s*Foo b = new Foo\(\);\s*Foo c = new Foo\(\);\s*Foo d = new Foo\(\);\s*Foo e = new Foo\(\);/s,
    'WaitTest must start all five workers before checking readiness.'
  );
  assert.match(
    source,
    /a\.thread\.interrupt\(\);\s*\/\/ Wait for the thread to terminate\.\s*while \(a\.thread\.getState\(\) != Thread\.State\.TERMINATED\) \{\s*Thread\.currentThread\(\)\.sleep\(50\);\s*\}\s*synchronized\(obj\) \{\s*System\.out\.println\("Notifying one thread\."\);\s*\/\/ Notify one\s*obj\.notify\(\);\s*System\.out\.println\("Notifying the rest of the threads\."\);\s*\/\/ Notify the rest\s*obj\.notifyAll\(\);/s,
    'WaitTest must finish the interrupted worker before notifying every remaining waiter.'
  );
}

function checkSourceContractMutations(source) {
  const historicalSource = replaceRequired(
    source,
    readinessLoop,
    historicalReadinessLoop
  );
  assert.throws(
    () => checkWaitSource(historicalSource),
    undefined,
    'WaitTest source contract must reject the historical conjunctive readiness loop.'
  );
}

function runChecked(command, args, label) {
  const result = childProcess.spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: processTimeoutMs,
    killSignal: 'SIGKILL',
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${label} failed: ${result.error || result.stderr || result.stdout ||
        `status ${result.status}, signal ${result.signal}`}`
    );
  }
  return result;
}

function assertJava17() {
  const javaVersion = runChecked(
    'java',
    ['-XshowSettings:properties', '-version'],
    'Java version check'
  );
  assert.match(
    javaVersion.stdout + javaVersion.stderr,
    /java\.specification\.version = 17(?:\s|$)/,
    'WaitTest regression coverage requires the CI Java 17 runtime.'
  );

  const javacVersion = runChecked('javac', ['-version'], 'javac version check');
  assert.match(
    javacVersion.stdout + javacVersion.stderr,
    /javac 17(?:[.\s]|$)/,
    'WaitTest regression coverage requires the CI Java 17 compiler.'
  );
}

function runWaitProcess(classDirectory, index, activeChildren) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(
      'java',
      [
        '-XX:+UseHeavyMonitors',
        '-cp',
        classDirectory,
        'classes.test.WaitTest',
      ],
      {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    activeChildren.add(child);

    let stdout = '';
    let stderr = '';
    let failure = null;
    const timer = setTimeout(() => {
      failure = new Error(`WaitTest stress process ${index} exceeded ${processTimeoutMs}ms.`);
      child.kill('SIGKILL');
    }, processTimeoutMs);

    function appendOutput(streamName, chunk) {
      if (streamName === 'stdout') {
        stdout += chunk;
      } else {
        stderr += chunk;
      }
      if (
        !failure &&
        Buffer.byteLength(stdout, 'utf8') + Buffer.byteLength(stderr, 'utf8') > processOutputLimit
      ) {
        failure = new Error(`WaitTest stress process ${index} exceeded its output limit.`);
        child.kill('SIGKILL');
      }
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => appendOutput('stdout', chunk));
    child.stderr.on('data', (chunk) => appendOutput('stderr', chunk));
    child.once('error', (error) => {
      failure = failure || error;
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      activeChildren.delete(child);
      if (failure) {
        reject(failure);
        return;
      }

      const normalizedStdout = stdout.replace(/\r\n/g, '\n');
      const normalizedStderr = stderr.replace(/\r\n/g, '\n');
      if (code !== 0 || signal || normalizedStderr || normalizedStdout !== expectedOutput) {
        reject(
          new Error(
            `WaitTest stress process ${index} failed: code=${code}, signal=${signal}, ` +
            `stdout=${JSON.stringify(normalizedStdout)}, stderr=${JSON.stringify(normalizedStderr)}`
          )
        );
        return;
      }
      resolve();
    });
  });
}

async function runStress(classDirectory) {
  const activeChildren = new Set();
  const runs = Array.from({ length: stressRuns }, (_, index) =>
    runWaitProcess(classDirectory, index + 1, activeChildren)
  );
  try {
    await Promise.all(runs);
  } catch (error) {
    for (const child of activeChildren) {
      child.kill('SIGKILL');
    }
    await Promise.allSettled(runs);
    throw error;
  }
}

async function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  checkWaitSource(source);
  checkSourceContractMutations(source);
  assertJava17();

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-wait-test-'));
  const classDirectory = path.join(temporaryRoot, 'classes');
  try {
    fs.mkdirSync(classDirectory);
    runChecked(
      'javac',
      ['--release', '8', '-encoding', 'UTF-8', '-d', classDirectory, sourcePath],
      'WaitTest source-fresh compilation'
    );
    await runStress(classDirectory);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }

  console.log(`wait-test-regression:${stressRuns}:ok`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
