import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectClassFiles, runCommand, validateToolchains } from './run_java_compatibility.mjs';
import { sha256File, treeDigest } from './prepare_java_compatibility_toolchains.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'classes/modern_fixture/JavaUncaughtExit.java';
const mainClass = 'classes.modern_test.JavaUncaughtExit';
const ledgerScope = 'Final Java 21/25 launcher exit status after uncaught main and child failures.';
const normalize = (value) => value.replaceAll('\r\n', '\n');
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sha256Pattern = /^[a-f0-9]{64}$/;
const timeoutMs = 30_000;

export const uncaughtExitCases = Object.freeze([
  { id: 'normal', exitCode: 0, stdout: 'normal\n', stderr: '' },
  { id: 'caught', exitCode: 0, stdout: 'caught\n', stderr: '' },
  { id: 'exception', exitCode: 1, stdout: '',
    stderr: 'Exception in thread "main" java.lang.IllegalStateException: main-failure\n' },
  { id: 'error', exitCode: 1, stdout: '',
    stderr: 'Exception in thread "main" java.lang.AssertionError: main-error\n' },
  { id: 'linkage', exitCode: 1, stdout: '',
    stderr: 'Exception in thread "main" java.lang.NoClassDefFoundError: main-linkage\n' },
  { id: 'bootstrap-invalid', exitCode: 1,
    stdout: 'handler:main:java.lang.IllegalArgumentException\n', stderr: '' },
  { id: 'main-handler', exitCode: 1,
    stdout: 'handler:main:java.lang.IllegalStateException\n', stderr: '' },
  { id: 'default-handler', exitCode: 1,
    stdout: 'handler:main:java.lang.IllegalStateException\n', stderr: '' },
  { id: 'handler-exit-zero', exitCode: 0,
    stdout: 'handler:main:java.lang.IllegalStateException\nexplicit-exit-zero\n', stderr: '' },
  { id: 'handler-exit-seven', exitCode: 7,
    stdout: 'handler:main:java.lang.IllegalStateException\nexplicit-exit-seven\n', stderr: '' },
  { id: 'child-exception', exitCode: 0, stdout: 'main-survived-child\n',
    stderr: 'Exception in thread "child" java.lang.IllegalStateException: child-failure\n' },
  { id: 'child-handler', exitCode: 0,
    stdout: 'handler:child:java.lang.IllegalStateException\nmain-survived-child\n', stderr: '' },
  { id: 'live-child', exitCode: 1,
    stdout: 'handler:main:java.lang.IllegalStateException\nchild-completed\n', stderr: '' },
  { id: 'initialization', exitCode: 1,
    stdout: 'handler:main:java.lang.ExceptionInInitializerError\ncause:java.lang.IllegalStateException\n', stderr: '' },
  { id: 'exit-zero', exitCode: 0, stdout: 'explicit-exit-zero\n', stderr: '' },
  { id: 'exit-seven', exitCode: 7, stdout: 'explicit-exit-seven\n', stderr: '' },
].map((entry) => Object.freeze(entry)));

function assertCompleted(record, label) {
  assert.equal(record.signal, null, `${label}: signal`);
  assert.equal(record.timedOut, false, `${label}: timeout`);
  assert.equal(record.outputLimitExceeded, false, `${label}: output limit`);
  assert.equal(record.error, null, `${label}: host error`);
  if (record.browserErrors) assert.deepEqual(record.browserErrors, [], `${label}: browser errors`);
}

export function assertExitExecution(record, definition, label = definition.id) {
  assertCompleted(record, label);
  assert.equal(record.exitCode, definition.exitCode, `${label}: exit code`);
  assert.equal(record.status, definition.exitCode === 0 ? 'passed' : 'failed', `${label}: process status`);
  assert.equal(normalize(record.stdout), definition.stdout, `${label}: stdout`);
  assert.equal(normalize(record.stderr), definition.stderr, `${label}: stderr`);
}

export function assertUncaughtExitCoverage(ledger, { browser = false, releases = [21, 25] } = {}) {
  assert.ok(releases.length > 0 && releases.every((release) => release === 21 || release === 25) &&
    new Set(releases).size === releases.length, 'Only explicit final Java 21/25 selections are allowed');
  const hosts = browser ? ['native', 'node', 'chromium'] : ['native', 'node'];
  assert.deepEqual(ledger.releases, releases, 'All selected final target releases must remain mandatory');
  assert.deepEqual(ledger.hosts, hosts, 'All selected hosts must remain mandatory');
  assert.deepEqual(ledger.compilations.map((entry) => entry.release), releases,
    'Every selected target needs its own compiler invocation');
  for (const compilation of ledger.compilations) {
    assert.equal(compilation.status, 'passed', `Java ${compilation.release}: compilation incomplete`);
    assertExitExecution(compilation.execution, { id: 'compile', exitCode: 0, stdout: '', stderr: '' });
    assert.deepEqual(compilation.execution.command.slice(1, 3), ['--release', String(compilation.release)],
      'Compiler must use the genuine selected release');
    assert.ok(!compilation.execution.command.includes('--enable-preview'), 'Preview inputs are forbidden');
    assert.ok(compilation.classes.length > 0, 'Generated class inventory is mandatory');
    assert.ok(compilation.classes.some((entry) => entry.path === `${mainClass.replaceAll('.', '/')}.class`),
      'The compiled fixture main class must be present');
    assert.equal(new Set(compilation.classes.map((entry) => entry.path)).size, compilation.classes.length,
      'Duplicate generated class entries are forbidden');
    for (const entry of compilation.classes) {
      assert.equal(entry.major, compilation.release + 44, 'Class version must match the compiler release');
      assert.equal(entry.minor, 0, 'Preview class files are forbidden');
      assert.match(entry.sha256, sha256Pattern, 'Generated class hash is required');
      assert.ok(Number.isSafeInteger(entry.size) && entry.size >= 8, 'Generated class size is required');
    }
  }
  const requiredIds = releases.flatMap((release) => uncaughtExitCases.map((entry) => `${entry.id}-jdk${release}`));
  assert.deepEqual(ledger.cases.map((entry) => entry.id), requiredIds, 'Required exit-status cases are missing');
  for (const record of ledger.cases) {
    const definition = uncaughtExitCases.find((entry) => record.id === `${entry.id}-jdk${record.release}`);
    assert.ok(definition, `${record.id}: unknown or mismatched case`);
    assert.deepEqual(record.expected, definition, `${record.id}: pinned expected result`);
    assert.equal(record.mainClass, mainClass, `${record.id}: fixture main class`);
    assert.deepEqual(record.arguments, [definition.id], `${record.id}: fixture case argument`);
    assert.equal(record.status, 'passed', `${record.id}: incomplete case`);
    assert.deepEqual(record.classes, ledger.compilations.find((entry) => entry.release === record.release).classes,
      `${record.id}: compiled class bytes must remain unchanged`);
    assert.deepEqual(Object.keys(record.execution), hosts, `${record.id}: missing host execution`);
    assert.deepEqual(Object.keys(record.comparisons), hosts.slice(1), `${record.id}: missing guest comparison`);
    for (const host of hosts) assertExitExecution(record.execution[host], definition, `${record.id} ${host}`);
    for (const host of hosts.slice(1)) {
      assert.deepEqual(record.comparisons[host],
        { status: 'passed', stdoutEqual: true, stderrEqual: true, exitCodeEqual: true },
        `${record.id} ${host}: incomplete guest comparison`);
    }
  }
  assert.equal(ledger.comparisons, requiredIds.length * (hosts.length - 1),
    'Every selected case and guest needs a completed comparison');
}

function writeLedger(filename, ledger) {
  assert.equal(fs.realpathSync(path.dirname(filename)), path.join(fs.realpathSync(repoRoot), 'build'),
    'Ledger must stay in the repository build directory');
  let previousStat;
  try { previousStat = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previousStat) {
    assert.ok(previousStat.isFile() && previousStat.nlink === 1, 'Refusing to overwrite a linked or non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(previous.schemaVersion, 1, 'Refusing to overwrite an unrelated file');
    assert.equal(previous.scope, ledgerScope, 'Refusing to overwrite an unrelated file');
  }
  fs.writeFileSync(filename, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 });
}

export async function runUncaughtExitTests({ browser = false, releases = [21, 25] } = {}) {
  assert.ok(releases.length > 0 && releases.every((release) => release === 21 || release === 25) &&
    new Set(releases).size === releases.length, 'Only final Java 21/25 release selections are supported');
  const ledger = {
    schemaVersion: 1, scope: ledgerScope, startedAt: new Date().toISOString(), status: 'running',
    releases, hosts: browser ? ['native', 'node', 'chromium'] : ['native', 'node'],
    normalization: 'CRLF to LF only', timeouts: { compileMs: 60_000, executionMs: timeoutMs },
    sources: [], toolchains: [], compilations: [], cases: [], comparisons: 0,
    references: releases.map((release) =>
      `https://docs.oracle.com/en/java/javase/${release}/docs/api/java.base/java/lang/Thread.html`),
  };
  const ledgerPath = path.join(repoRoot, 'build/java-uncaught-exit-results.json');
  let temporaryRoot;
  let session;
  try {
    const gitCommit = await runCommand('git', ['rev-parse', '--verify', 'HEAD'], { cwd: repoRoot, timeoutMs: 10_000 });
    const gitDirty = await runCommand('git', ['status', '--porcelain=v1', '--untracked-files=no'],
      { cwd: repoRoot, timeoutMs: 10_000 });
    for (const record of [gitCommit, gitDirty]) {
      assertCompleted(record, 'Git provenance');
      assert.equal(record.exitCode, 0, 'Git provenance exit code');
    }
    ledger.repository = { commit: gitCommit.stdout.trim(), trackedDirty: gitDirty.stdout.trim().length > 0 };
    const lockBytes = fs.readFileSync(path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'));
    const lock = JSON.parse(lockBytes);
    const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
    const toolchains = validateToolchains(marker, lock, digest(lockBytes), releases);
    const inputs = [sourcePath, 'src/jvm.ts', 'ci/java_uncaught_exit_test.mjs', 'ci/java_uncaught_exit_contract_test.mjs',
      'ci/run_java_compatibility.mjs', 'ci/prepare_java_compatibility_toolchains.mjs',
      'ci/java_compatibility_browser.mjs', 'ci/java_compatibility_toolchains.lock.json',
      'build/java-compatibility-toolchains/toolchains.json', 'yarn.lock', 'package.json',
      'build/modern-bootstrap-overlay/modern-bootstrap.jar'];
    const inputSnapshot = () => inputs.map((relative) => {
      const filename = path.join(repoRoot, relative);
      assert.ok(fs.lstatSync(filename).isFile(), `${relative}: regular input required`);
      return { path: relative, sha256: sha256File(filename), size: fs.statSync(filename).size };
    });
    ledger.inputs = inputSnapshot();
    ledger.sources = ledger.inputs.filter((entry) => entry.path === sourcePath);
    ledger.toolchainLockSha256 = digest(lockBytes);
    for (const entry of toolchains) {
      const record = { ...entry, treeSha256: treeDigest(entry.home), executables: {}, probes: {} };
      ledger.toolchains.push(record);
      assert.equal(record.treeSha256, lock.toolchains.find((candidate) => candidate.id === entry.id).treeSha256,
        `${entry.id}: pinned JDK tree integrity`);
      for (const name of ['java', 'javac']) {
        const executable = path.join(entry.home, 'bin', name);
        fs.accessSync(executable, fs.constants.X_OK);
        record.executables[name] = { path: executable, sha256: sha256File(executable) };
        const probe = await runCommand(executable, ['-version'], { cwd: repoRoot, timeoutMs: 10_000 });
        record.probes[name] = probe;
        assertCompleted(probe, `${entry.id} ${name}: version probe`);
        assert.equal(probe.exitCode, 0, `${entry.id} ${name}: version probe exit code`);
        const text = `${probe.stdout}\n${probe.stderr}`;
        const version = name === 'javac' ? /^javac\s+(\S+)/m.exec(text)?.[1] : /\bversion\s+"([^"]+)"/.exec(text)?.[1];
        assert.equal(version, entry.version, `${entry.id} ${name}: exact locked version`);
      }
    }
    const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
    const runtimeRoot = path.dirname(path.dirname(runnerPath));
    const runtimeSnapshot = () => ['console', 'src', 'vendor/java_home'].map((relative) => ({
      path: relative, sha256: treeDigest(fs.realpathSync(path.join(runtimeRoot, relative))),
    }));
    ledger.runtime = { entrypoint: runnerPath, entrypointSha256: sha256File(runnerPath), inputs: runtimeSnapshot() };
    ledger.host = { node: process.version, executable: process.execPath, sha256: sha256File(process.execPath) };
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-uncaught-exit-'));
    const emptyPath = path.join(temporaryRoot, 'empty-class-and-sourcepath');
    fs.mkdirSync(emptyPath);
    if (browser) {
      const { createBrowserSession } = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({ repoRoot });
      ledger.browser = session.provenance;
    }
    const failures = [];
    for (const release of releases) {
      const toolchain = ledger.toolchains.find((entry) => entry.feature === release);
      const classesPath = path.join(temporaryRoot, `jdk${release}`);
      fs.mkdirSync(classesPath);
      const compilation = { release, mainClass, source: ledger.sources[0], classes: [], status: 'running' };
      ledger.compilations.push(compilation);
      compilation.execution = await runCommand(toolchain.executables.javac.path,
        ['--release', String(release), '-encoding', 'UTF-8', '-proc:none',
          '-classpath', emptyPath, '-sourcepath', emptyPath, '-d', classesPath, path.join(repoRoot, sourcePath)],
        { cwd: temporaryRoot, timeoutMs: ledger.timeouts.compileMs });
      assertExitExecution(compilation.execution, { id: `compile Java ${release}`, exitCode: 0, stdout: '', stderr: '' });
      compilation.classes = inspectClassFiles(classesPath, release, mainClass);
      compilation.status = 'passed';
      for (const definition of uncaughtExitCases) {
        const record = { id: `${definition.id}-jdk${release}`, release, mainClass, arguments: [definition.id],
          expected: definition, classes: compilation.classes, execution: {}, comparisons: {}, status: 'running' };
        ledger.cases.push(record);
        const caseFailures = [];
        const validHosts = new Set();
        for (const host of ledger.hosts) {
          const execution = host === 'chromium' ? await session.execute({ classesPath,
            mainClass, arguments: record.arguments, timeoutMs }) :
            await runCommand(host === 'native' ? toolchain.executables.java.path : process.execPath,
              [...(host === 'native' ? [] : ['--no-deprecation', runnerPath]),
                '-cp', classesPath, mainClass, ...record.arguments], { cwd: temporaryRoot, timeoutMs });
          record.execution[host] = execution;
          assert.deepEqual(inspectClassFiles(classesPath, release, mainClass), compilation.classes,
            `${record.id} ${host}: execution must preserve all class bytes`);
          try {
            assertExitExecution(execution, definition, `${record.id} ${host}`);
            validHosts.add(host);
          }
          catch (error) { caseFailures.push(error.message); }
          if (host !== 'native') {
            const native = record.execution.native;
            const comparison = {
              status: 'running', stdoutEqual: normalize(execution.stdout) === normalize(native.stdout),
              stderrEqual: normalize(execution.stderr) === normalize(native.stderr),
              exitCodeEqual: execution.exitCode === native.exitCode,
            };
            comparison.status = comparison.stdoutEqual && comparison.stderrEqual && comparison.exitCodeEqual &&
              validHosts.has('native') && validHosts.has(host) ? 'passed' : 'failed';
            record.comparisons[host] = comparison;
            if (comparison.status === 'passed') ledger.comparisons++;
          }
        }
        record.status = caseFailures.length === 0 ? 'passed' : 'failed';
        if (caseFailures.length) {
          record.errors = caseFailures;
          failures.push(...caseFailures);
        }
        console.log(`${record.status === 'passed' ? 'PASS' : 'FAIL'} ${record.id}: expected exit ${definition.exitCode}`);
      }
    }
    assert.deepEqual(inputSnapshot(), ledger.inputs, 'Source, lock, marker and harness inputs changed during testing');
    assert.deepEqual(runtimeSnapshot(), ledger.runtime.inputs, 'CLI runtime inputs changed during testing');
    assert.equal(sha256File(process.execPath), ledger.host.sha256, 'Node executable changed during testing');
    for (const entry of ledger.toolchains) {
      assert.equal(treeDigest(entry.home), entry.treeSha256, `${entry.id}: JDK tree changed during testing`);
    }
    ledger.integrity = { inputs: 'verified', runtime: 'verified', node: 'verified', toolchains: 'verified',
      browser: session ? session.verifyIntegrity() : { status: 'not-run' } };
    assert.equal(failures.length, 0, `Exit-status oracle mismatches:\n${failures.join('\n')}`);
    assertUncaughtExitCoverage(ledger, { browser, releases });
    ledger.status = 'passed';
    console.log(`PASS final uncaught exit status: ${ledger.cases.length} cases, ${ledger.comparisons} guest comparisons`);
  } catch (error) {
    ledger.status = 'failed';
    ledger.error = error.stack || error.message;
    for (const record of [...ledger.compilations, ...ledger.cases]) if (record.status === 'running') record.status = 'failed';
    throw error;
  } finally {
    try {
      if (session) await session.close();
    } catch (error) {
      ledger.status = 'failed';
      ledger.error = error.stack || error.message;
      throw error;
    } finally {
      try {
        if (temporaryRoot) fs.rmSync(temporaryRoot, { recursive: true, force: true });
      } catch (error) {
        ledger.status = 'failed';
        ledger.cleanupError = error.stack || error.message;
        ledger.error ||= ledger.cleanupError;
        throw error;
      } finally {
        ledger.finishedAt = new Date().toISOString();
        writeLedger(ledgerPath, ledger);
      }
    }
  }
  return ledger;
}

export function parseUncaughtExitOptions(argumentsList) {
  let browser = false;
  let releases = [21, 25];
  let selectedRelease = false;
  for (let index = 0; index < argumentsList.length; index++) {
    const argument = argumentsList[index];
    if (argument === '--browser' && !browser) browser = true;
    else if (argument === '--release' && !selectedRelease && ['21', '25'].includes(argumentsList[index + 1])) {
      releases = [Number(argumentsList[++index])];
      selectedRelease = true;
    } else throw new Error('Usage: node ci/java_uncaught_exit_test.mjs [--browser] [--release 21|25]');
  }
  return { browser, releases };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runUncaughtExitTests(parseUncaughtExitOptions(process.argv.slice(2))); }
  catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
