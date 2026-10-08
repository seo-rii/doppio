import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectClassFiles, runCommand, validateToolchains } from './run_java_compatibility.mjs';
import { sha256File, treeDigest } from './prepare_java_compatibility_toolchains.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = 'classes/modern_fixture/pattern_evolution';
const ledgerScope = 'Final Java 21/25 switches against separately evolved enum and sealed binaries.';
const timeoutMs = 30_000;
const normalize = (value) => value.replaceAll('\r\n', '\n');
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const definitions = [
  {
    id: 'enum', mainClass: 'classes.modern_test.pattern_evolution.enums.EnumDispatch',
    baseline: 'enum/base/EnumDispatch.java',
    stdout: 'enum-known-cases\nenum-null-and-guards\n',
    stages: [
      { id: 'added', source: 'enum/added/Kind.java',
        replaced: ['Kind.class', 'Kind$1.class'],
        stdout: 'enum-new-constant-match-exception\n' },
      { id: 'reordered', source: 'enum/reordered/Kind.java',
        replaced: ['Kind.class', 'Kind$1.class'],
        stdout: 'enum-new-constant-match-exception\n' },
    ],
  },
  {
    id: 'sealed-class', mainClass: 'classes.modern_test.pattern_evolution.sealedclasses.ShapeDispatch',
    baseline: 'sealed_class/base/ShapeDispatch.java',
    stdout: 'sealed-class-known-null-and-guards\n',
    stages: [{ id: 'expanded', source: 'sealed_class/expanded/Shape.java',
      replaced: ['Shape.class', 'Triangle.class'],
      stdout: 'sealed-class-new-permitted-match-exception\n' }],
  },
  {
    id: 'sealed-interface', mainClass: 'classes.modern_test.pattern_evolution.sealedinterfaces.ValueDispatch',
    baseline: 'sealed_interface/base/ValueDispatch.java',
    stdout: 'sealed-interface-known-null-and-guards\n',
    stages: [{ id: 'expanded', source: 'sealed_interface/expanded/Value.java',
      replaced: ['Value.class', 'Extra.class'],
      stdout: 'sealed-interface-new-permitted-match-exception\n' }],
  },
];

function assertSuccess(record, label, expectedStdout) {
  assert.equal(record.signal, null, `${label}: signal`);
  assert.equal(record.timedOut, false, `${label}: timeout`);
  assert.equal(record.outputLimitExceeded, false, `${label}: output limit`);
  assert.equal(record.error, null, `${label}: host error`);
  assert.equal(record.status, 'passed', `${label}: ${record.stderr}`);
  assert.equal(record.exitCode, 0, `${label}: exit code`);
  assert.equal(normalize(record.stderr), '', `${label}: stderr`);
  if (expectedStdout !== undefined) assert.equal(normalize(record.stdout), expectedStdout, `${label}: stdout`);
}

function writeLedger(filename, ledger) {
  assert.ok(fs.statSync(path.dirname(filename)).isDirectory(), 'Ledger directory must exist');
  assert.equal(fs.realpathSync(path.dirname(filename)), path.join(fs.realpathSync(repoRoot), 'build'),
    'Ledger must stay in the repository build directory');
  let previousStat;
  try { previousStat = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previousStat) {
    assert.ok(previousStat.isFile() && previousStat.nlink === 1,
      'Refusing to overwrite a linked or non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(previous.schemaVersion, 1, 'Refusing to overwrite an unrelated file');
    assert.equal(previous.scope, ledgerScope, 'Refusing to overwrite an unrelated file');
  }
  fs.writeFileSync(filename, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 });
}

export function assertPatternEvolutionCoverage(ledger, { browser }) {
  const matrices = [21, 25].flatMap((release) =>
    ['enum', 'sealed-class', 'sealed-interface'].map((id) => `${id}-jdk${release}`));
  const cases = [21, 25].flatMap((release) => [
    `enum-jdk${release}-baseline`, `enum-jdk${release}-added`, `enum-jdk${release}-reordered`,
    `sealed-class-jdk${release}-baseline`, `sealed-class-jdk${release}-expanded`,
    `sealed-interface-jdk${release}-baseline`, `sealed-interface-jdk${release}-expanded`,
  ]);
  const hosts = browser ? ['native', 'node', 'chromium'] : ['native', 'node'];
  assert.deepEqual(ledger.releases, [21, 25], 'Both final target releases must remain mandatory');
  assert.deepEqual(ledger.hosts, hosts, 'All selected hosts must remain mandatory');
  assert.deepEqual(ledger.matrices.map((entry) => entry.id), matrices, 'Required evolution matrices are missing');
  assert.deepEqual(ledger.cases.map((entry) => entry.id), cases, 'Required evolution stages are missing');
  assert.equal(ledger.matrices.reduce((count, entry) => count + entry.operations.length, 0), 14,
    'Every baseline and evolution stage must have its own recorded javac invocation');
  for (const entry of ledger.matrices) assert.equal(entry.status, 'passed', `${entry.id}: incomplete matrix`);
  for (const entry of ledger.cases) {
    assert.equal(entry.status, 'passed', `${entry.id}: incomplete case`);
    assert.deepEqual(Object.keys(entry.execution), hosts, `${entry.id}: missing host execution`);
    assert.deepEqual(Object.keys(entry.comparisons), hosts.slice(1), `${entry.id}: missing guest comparison`);
    for (const comparison of Object.values(entry.comparisons)) {
      assert.deepEqual(comparison,
        { status: 'passed', stdoutEqual: true, stderrEqual: true, exitCodeEqual: true },
        `${entry.id}: incomplete guest comparison`);
    }
  }
  assert.equal(ledger.comparisons, browser ? 28 : 14, 'Required guest comparison count is incomplete');
}

export async function runPatternEvolutionTests({ browser = false } = {}) {
  const ledger = {
    schemaVersion: 1, scope: ledgerScope, startedAt: new Date().toISOString(), status: 'running',
    releases: [21, 25], hosts: browser ? ['native', 'node', 'chromium'] : ['native', 'node'],
    normalization: 'CRLF to LF only', timeouts: { compileMs: 60_000, executionMs: timeoutMs },
    sources: [], toolchains: [], matrices: [], cases: [], comparisons: 0,
    references: [21, 25].flatMap((release) => ['13.4.2.1', '13.4.26', '13.5.2', '14.11.3', '15.28.2'].map((section) =>
      `https://docs.oracle.com/javase/specs/jls/se${release}/html/jls-${section.split('.')[0]}.html#jls-${section}`)),
  };
  const ledgerPath = path.join(repoRoot, 'build/java-pattern-evolution-results.json');
  let temporaryRoot;
  let session;
  try {
    const gitCommit = await runCommand('git', ['rev-parse', '--verify', 'HEAD'], { cwd: repoRoot, timeoutMs: 10_000 });
    const gitDirty = await runCommand('git', ['status', '--porcelain=v1', '--untracked-files=no'],
      { cwd: repoRoot, timeoutMs: 10_000 });
    assertSuccess(gitCommit, 'Git commit');
    assertSuccess(gitDirty, 'Git working tree');
    ledger.repository = { commit: gitCommit.stdout.trim(), trackedDirty: gitDirty.stdout.trim().length > 0 };
    const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
    const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
    const lockBytes = fs.readFileSync(lockPath);
    const lock = JSON.parse(lockBytes);
    const marker = JSON.parse(fs.readFileSync(markerPath));
    const toolchains = validateToolchains(marker, lock, digest(lockBytes), ledger.releases);
    const sourcePaths = definitions.flatMap((definition) => [definition.baseline,
      ...definition.stages.map((stage) => stage.source)]).map((relative) => `${fixtureRoot}/${relative}`);
    const inputs = [...sourcePaths, 'ci/java_pattern_evolution_test.mjs', 'ci/java_pattern_evolution_contract_test.mjs',
      'ci/run_java_compatibility.mjs',
      'ci/prepare_java_compatibility_toolchains.mjs', 'ci/java_compatibility_browser.mjs',
      'ci/java_compatibility_toolchains.lock.json', 'build/java-compatibility-toolchains/toolchains.json',
      'yarn.lock', 'package.json', 'build/modern-bootstrap-overlay/modern-bootstrap.jar'];
    const inputSnapshot = () => inputs.map((relative) => {
      const filename = path.join(repoRoot, relative);
      assert.ok(fs.lstatSync(filename).isFile(), `${relative}: regular input required`);
      return { path: relative, sha256: sha256File(filename), size: fs.statSync(filename).size };
    });
    ledger.inputs = inputSnapshot();
    ledger.sources = ledger.inputs.filter((entry) => sourcePaths.includes(entry.path));
    ledger.toolchainLockSha256 = digest(lockBytes);
    for (const entry of toolchains) {
      const locked = lock.toolchains.find((candidate) => candidate.id === entry.id);
      const record = { ...entry, treeSha256: treeDigest(entry.home), executables: {}, probes: {} };
      ledger.toolchains.push(record);
      assert.equal(record.treeSha256, locked.treeSha256, `${entry.id}: pinned JDK tree integrity`);
      for (const name of ['java', 'javac']) {
        const executable = path.join(entry.home, 'bin', name);
        fs.accessSync(executable, fs.constants.X_OK);
        record.executables[name] = { path: executable, sha256: sha256File(executable) };
        record.probes[name] = await runCommand(executable, ['-version'], { cwd: repoRoot, timeoutMs: 10_000 });
        const probe = record.probes[name];
        assert.equal(probe.exitCode, 0, `${entry.id} ${name}: version probe`);
        assert.equal(probe.status, 'passed', `${entry.id} ${name}: version probe`);
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
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-pattern-evolution-'));
    const emptyPath = path.join(temporaryRoot, 'empty-class-and-sourcepath');
    fs.mkdirSync(emptyPath);
    if (browser) {
      const { createBrowserSession } = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({ repoRoot });
      ledger.browser = session.provenance;
    }

    for (const release of ledger.releases) {
      const toolchain = ledger.toolchains.find((entry) => entry.feature === release);
      for (const definition of definitions) {
        const matrixRoot = path.join(temporaryRoot, `${definition.id}-jdk${release}`);
        const classesPath = path.join(matrixRoot, 'classes');
        fs.mkdirSync(classesPath, { recursive: true });
        const matrix = { id: `${definition.id}-jdk${release}`, release, mainClass: definition.mainClass,
          operations: [], baselineClasses: [], status: 'running' };
        ledger.matrices.push(matrix);
        const compile = async (source, destination, classpath, stage) => {
          const record = { stage, source: ledger.sources.find((entry) => entry.path === `${fixtureRoot}/${source}`),
            destination, classpath };
          matrix.operations.push(record);
          record.execution = await runCommand(toolchain.executables.javac.path,
            ['--release', String(release), '-encoding', 'UTF-8', '-proc:none',
              '-classpath', classpath, '-sourcepath', emptyPath, '-d', destination,
              path.join(repoRoot, fixtureRoot, source)], { cwd: matrixRoot, timeoutMs: ledger.timeouts.compileMs });
          assertSuccess(record.execution, `${matrix.id} compile ${stage}`, '');
          return record;
        };
        await compile(definition.baseline, classesPath, emptyPath, 'baseline');
        matrix.baselineClasses = inspectClassFiles(classesPath, release, definition.mainClass);

        for (const stage of [{ id: 'baseline', stdout: '' }, ...definition.stages]) {
          const record = { id: `${matrix.id}-${stage.id}`, matrixId: matrix.id, release,
            stage: stage.id, mainClass: definition.mainClass, arguments: [stage.id], status: 'running',
            classes: [], execution: {}, comparisons: {} };
          ledger.cases.push(record);
          if (stage.source) {
            const replacementPath = path.join(matrixRoot, `replacement-${stage.id}`);
            fs.mkdirSync(replacementPath);
            const operation = await compile(stage.source, replacementPath, classesPath, stage.id);
            const packagePath = definition.mainClass.slice(0, definition.mainClass.lastIndexOf('.')).replaceAll('.', '/');
            const firstClass = stage.replaced[0].slice(0, -'.class'.length);
            operation.emittedClasses = inspectClassFiles(replacementPath, release,
              `${packagePath.replaceAll('/', '.')}.${firstClass}`);
            const allowedPaths = stage.replaced.map((filename) => `${packagePath}/${filename}`).sort();
            assert.deepEqual(operation.emittedClasses.map((entry) => entry.path).sort(), allowedPaths,
              `${record.id}: replacement compilation must not recompile the caller or unrelated classes`);
            operation.classesBefore = inspectClassFiles(classesPath, release, definition.mainClass);
            operation.replacements = [];
            for (const entry of operation.emittedClasses) {
              fs.copyFileSync(path.join(replacementPath, entry.path), path.join(classesPath, entry.path));
              operation.replacements.push({ path: entry.path,
                beforeSha256: operation.classesBefore.find((candidate) => candidate.path === entry.path)?.sha256 || null,
                afterSha256: entry.sha256 });
            }
            operation.classesAfter = inspectClassFiles(classesPath, release, definition.mainClass);
            assert.ok(operation.replacements.some((entry) => entry.beforeSha256 !== entry.afterSha256),
              `${record.id}: evolution must actually change class bytes`);
            assert.deepEqual(operation.classesBefore.filter((entry) => !allowedPaths.includes(entry.path)),
              operation.classesAfter.filter((entry) => !allowedPaths.includes(entry.path)),
              `${record.id}: original caller and all non-replaced classes must stay byte-identical`);
            record.evolution = operation;
          }
          record.classes = inspectClassFiles(classesPath, release, definition.mainClass);
          const mainClassPath = `${definition.mainClass.replaceAll('.', '/')}.class`;
          assert.deepEqual(record.classes.find((entry) => entry.path === mainClassPath),
            matrix.baselineClasses.find((entry) => entry.path === mainClassPath), `${record.id}: caller must not be recompiled`);
          for (const host of ledger.hosts) {
            const execution = host === 'chromium' ? await session.execute({ classesPath,
              mainClass: definition.mainClass, arguments: record.arguments, timeoutMs }) :
              await runCommand(host === 'native' ? toolchain.executables.java.path : process.execPath,
                [...(host === 'native' ? [] : ['--no-deprecation', runnerPath]),
                  '-cp', classesPath, definition.mainClass, ...record.arguments], { cwd: matrixRoot, timeoutMs });
            record.execution[host] = execution;
            assert.deepEqual(inspectClassFiles(classesPath, release, definition.mainClass), record.classes,
              `${record.id} ${host}: execution must preserve all class bytes`);
            const native = record.execution.native;
            assertSuccess(execution, `${record.id} ${host}`, host === 'native' ?
              definition.stdout + stage.stdout : normalize(native.stdout));
            if (host !== 'native') {
              record.comparisons[host] = { status: 'passed', stdoutEqual: true, stderrEqual: true, exitCodeEqual: true };
              ledger.comparisons++;
            }
          }
          record.status = 'passed';
          console.log(`PASS ${record.id}: unchanged caller and identical native/guest class bytes`);
        }
        matrix.status = 'passed';
      }
    }
    assertPatternEvolutionCoverage(ledger, { browser });
    assert.deepEqual(inputSnapshot(), ledger.inputs, 'Source, lock, marker and harness inputs changed during testing');
    assert.deepEqual(runtimeSnapshot(), ledger.runtime.inputs, 'CLI runtime inputs changed during testing');
    assert.equal(sha256File(process.execPath), ledger.host.sha256, 'Node executable changed during testing');
    for (const entry of ledger.toolchains) {
      assert.equal(treeDigest(entry.home), entry.treeSha256, `${entry.id}: JDK tree changed during testing`);
    }
    ledger.integrity = { inputs: 'verified', runtime: 'verified', node: 'verified', toolchains: 'verified',
      browser: session ? session.verifyIntegrity() : { status: 'not-run' } };
    ledger.status = 'passed';
    console.log(`PASS final pattern evolution: ${ledger.matrices.length} matrices, ${ledger.cases.length} cases, ` +
      `${ledger.comparisons} guest comparisons`);
  } catch (error) {
    ledger.status = 'failed';
    ledger.error = error.stack || error.message;
    for (const record of [...ledger.matrices, ...ledger.cases]) if (record.status === 'running') record.status = 'failed';
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.argv.slice(2).every((argument) => argument === '--browser') && process.argv.slice(2).length <= 1,
      'Usage: node ci/java_pattern_evolution_test.mjs [--browser]');
    await runPatternEvolutionTests({ browser: process.argv.includes('--browser') });
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
