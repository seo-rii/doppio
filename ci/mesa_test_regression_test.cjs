'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'classes', 'test', 'MesaTest.java');
const expectedOutput = [
  '1: Running Foo-Thread',
  '2: Running Bar-Thread',
  '3: Finishing Bar-Thread',
  '4: Finishing Foo-Thread',
  '',
].join('\n');
const processTimeoutMs = 15_000;
const processOutputLimit = 64 * 1024;
const stressRuns = 32;

function replaceRequired(value, search, replacement) {
  const first = value.indexOf(search);
  if (first === -1 || first !== value.lastIndexOf(search)) {
    throw new Error(`Expected exactly one MesaTest mutation anchor: ${search}`);
  }
  return value.slice(0, first) + replacement + value.slice(first + search.length);
}

function checkMesaSource(source) {
  assert.match(
    source,
    /static boolean fooWaiting = false;/,
    'MesaTest must track when Foo reaches its wait boundary.'
  );
  assert.match(
    source,
    /static boolean fooNotified = false;/,
    'MesaTest must guard Foo against lost and spurious notifications.'
  );
  assert.doesNotMatch(
    source,
    /Thread(?:\.currentThread\(\))?\.yield\(\)/,
    'MesaTest must not use yield as a scheduling handshake.'
  );
  assert.match(
    source,
    /synchronized\(obj\)\s*\{\s*System\.out\.println\("1: Running " \+ thread\.getName\(\)\);\s*fooWaiting = true;\s*obj\.notifyAll\(\);\s*while \(!fooNotified\) \{\s*try \{\s*obj\.wait\(\);/s,
    'Foo must publish readiness before waiting in a notified predicate loop.'
  );
  assert.match(
    source,
    /System\.out\.println\("2: Running " \+ thread\.getName\(\)\);\s*fooNotified = true;\s*obj\.notify\(\);\s*System\.out\.println\("3: Finishing " \+ thread\.getName\(\)\);/s,
    'Bar must publish notification before notify while retaining the monitor.'
  );
  assert.match(
    source,
    /new Foo\(\);\s*synchronized\(obj\)\s*\{\s*while \(!fooWaiting\) \{\s*obj\.wait\(\);\s*\}\s*\}\s*new Bar\(\);/s,
    'Main must start Bar only after Foo reaches the wait boundary.'
  );
}

function checkSourceContractMutations(source) {
  const mutations = [
    replaceRequired(source, 'while (!fooNotified) {', 'if (!fooNotified) {'),
    replaceRequired(source, 'while (!fooWaiting) {', 'if (!fooWaiting) {'),
    replaceRequired(source, '        fooWaiting = true;\n', ''),
    replaceRequired(source, '        fooNotified = true;\n', ''),
    replaceRequired(
      source,
      '    synchronized(obj) {\n      while (!fooWaiting) {\n        obj.wait();\n      }\n    }',
      '    synchronized(obj) {\n      Thread.currentThread().yield();\n    }'
    ),
    replaceRequired(
      source,
      '    synchronized(obj) {\n      while (!fooWaiting) {\n        obj.wait();\n      }\n    }\n    new Bar();',
      '    new Bar();\n    synchronized(obj) {\n      while (!fooWaiting) {\n        obj.wait();\n      }\n    }'
    ),
  ];

  for (const mutation of mutations) {
    assert.throws(
      () => checkMesaSource(mutation),
      undefined,
      'MesaTest source contract must reject a broken scheduling handshake.'
    );
  }
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
    'MesaTest regression coverage requires the CI Java 17 runtime.'
  );

  const javacVersion = runChecked('javac', ['-version'], 'javac version check');
  assert.match(
    javacVersion.stdout + javacVersion.stderr,
    /javac 17(?:[.\s]|$)/,
    'MesaTest regression coverage requires the CI Java 17 compiler.'
  );
}

function runMesaProcess(classDirectory, index, activeChildren) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(
      'java',
      [
        '-XX:+UseHeavyMonitors',
        '-cp',
        classDirectory,
        'classes.test.MesaTest',
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
      failure = new Error(`MesaTest stress process ${index} exceeded ${processTimeoutMs}ms.`);
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
        failure = new Error(`MesaTest stress process ${index} exceeded its output limit.`);
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
            `MesaTest stress process ${index} failed: code=${code}, signal=${signal}, ` +
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
    runMesaProcess(classDirectory, index + 1, activeChildren)
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
  checkMesaSource(source);
  checkSourceContractMutations(source);
  assertJava17();

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-mesa-test-'));
  const classDirectory = path.join(temporaryRoot, 'classes');
  try {
    fs.mkdirSync(classDirectory);
    runChecked(
      'javac',
      ['--release', '8', '-encoding', 'UTF-8', '-d', classDirectory, sourcePath],
      'MesaTest source-fresh compilation'
    );
    await runStress(classDirectory);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }

  console.log(`mesa-test-regression:${stressRuns}:ok`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
