import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = process.env.MODERN_JAVA_SHARD_REPO_ROOT ?
  path.resolve(process.env.MODERN_JAVA_SHARD_REPO_ROOT) : defaultRepoRoot;
const manifestPath = process.env.MODERN_JAVA_SHARD_MANIFEST_PATH ||
  path.join(repoRoot, 'ci', 'modern_java_smoke_shards.json');
const compilerLockPath = process.env.MODERN_JAVA_COMPILER_INPUT_LOCK_PATH ||
  path.join(repoRoot, 'ci', 'modern_java_compiler_inputs.lock.json');
const compilerMarkerPath = process.env.MODERN_JAVA_COMPILER_INPUT_MARKER_PATH ||
  path.join(repoRoot, 'build', 'modern-java-compiler-inputs.json');
const shardId = process.argv[2];
const runId = process.env.GITHUB_RUN_ID || 'local';
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1';
const environmentNames = [
  'KOTLIN_COMPILER_JAR',
  'KOTLIN_STDLIB_JAR',
  'KOTLIN_REFLECT_JAR',
  'SCALA_COMPILER_JAR',
  'SCALA_LIBRARY_JAR',
  'SCALA_REFLECT_JAR',
  'SCALA_DIFF_UTILS_JAR',
  'SCALA_JLINE_JAR',
];

function fail(message) {
  throw new Error(message);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countLiteral(text, literal) {
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(literal, offset)) >= 0) {
    count += 1;
    offset += literal.length;
  }
  return count;
}

function scriptOuterTimeout(text, scriptPath) {
  const compileMatch = text.match(/compile_timeout="\$\{[^:}]+:-(\d+)\}"/);
  const killMatch = text.match(/kill_after="\$\{[^:}]+:-(\d+)\}"/);
  if (!compileMatch || !killMatch) {
    fail(`${scriptPath} is missing its inner timeout contract.`);
  }
  const compileInvocations = countLiteral(
    text,
    'timeout -k "${kill_after}s" -s INT "${compile_timeout}s"'
  );
  const runMatch = text.match(/run_timeout="\$\{[^:}]+:-(\d+)\}"/);
  const runInvocations = countLiteral(
    text,
    'timeout -k "${kill_after}s" -s INT "${run_timeout}s"'
  );
  if (compileInvocations === 0 || (runMatch && runInvocations === 0)) {
    fail(`${scriptPath} does not preserve its inner timeout -k execution.`);
  }
  const innerBudgetSeconds =
    Number(compileMatch[1]) * compileInvocations +
    (runMatch ? Number(runMatch[1]) * runInvocations : 0);
  const configuredOuterTimeout = process.env.MODERN_JAVA_SHARD_OUTER_TIMEOUT_SECONDS;
  const configuredKillGrace = process.env.MODERN_JAVA_SHARD_KILL_GRACE_SECONDS;
  const outerTimeoutSeconds = configuredOuterTimeout ? Number(configuredOuterTimeout) : innerBudgetSeconds + 180;
  const killGraceSeconds = configuredKillGrace ? Number(configuredKillGrace) : Number(killMatch[1]);
  if (
    !Number.isInteger(outerTimeoutSeconds) ||
    outerTimeoutSeconds <= 0 ||
    !Number.isInteger(killGraceSeconds) ||
    killGraceSeconds <= 0
  ) {
    fail(`${scriptPath} has an invalid outer timeout configuration.`);
  }
  return { innerBudgetSeconds, outerTimeoutSeconds, killGraceSeconds };
}

function readCompilerEnvironment() {
  const compilerLock = JSON.parse(fs.readFileSync(compilerLockPath, 'utf8'));
  const marker = JSON.parse(fs.readFileSync(compilerMarkerPath, 'utf8'));
  if (
    marker?.schemaVersion !== 1 ||
    marker.lockSha256 !== sha256File(compilerLockPath) ||
    !marker.environment ||
    typeof marker.environment !== 'object' ||
    !marker.environmentSha256 ||
    typeof marker.environmentSha256 !== 'object'
  ) {
    fail('Verified compiler input marker does not match the checked-in lock.');
  }
  const scalaHashes = new Map(
    Array.isArray(compilerLock.scala?.files) ?
      compilerLock.scala.files.map((file) => [file.name, file.sha256]) : []
  );
  if (scalaHashes.size !== 5 || compilerLock.scala?.files?.length !== 5) {
    fail('Verified Scala compiler cache lock must contain exactly five JARs.');
  }
  const scalaEnvironmentFiles = {
    SCALA_COMPILER_JAR: `scala-compiler-${compilerLock.scala?.version}.jar`,
    SCALA_LIBRARY_JAR: `scala-library-${compilerLock.scala?.version}.jar`,
    SCALA_REFLECT_JAR: `scala-reflect-${compilerLock.scala?.version}.jar`,
    SCALA_DIFF_UTILS_JAR: 'java-diff-utils-4.16.jar',
    SCALA_JLINE_JAR: 'jline-3.29.0-jdk8.jar',
  };
  const expectedEnvironmentSha256 = {
    KOTLIN_COMPILER_JAR: compilerLock.kotlin?.jars?.['package/lib/kotlin-compiler.jar'],
    KOTLIN_STDLIB_JAR: compilerLock.kotlin?.jars?.['package/lib/kotlin-stdlib.jar'],
    KOTLIN_REFLECT_JAR: compilerLock.kotlin?.jars?.['package/lib/kotlin-reflect.jar'],
    SCALA_COMPILER_JAR: scalaHashes.get(`scala-compiler-${compilerLock.scala?.version}.jar`),
    SCALA_LIBRARY_JAR: scalaHashes.get(`scala-library-${compilerLock.scala?.version}.jar`),
    SCALA_REFLECT_JAR: scalaHashes.get(`scala-reflect-${compilerLock.scala?.version}.jar`),
    SCALA_DIFF_UTILS_JAR: scalaHashes.get('java-diff-utils-4.16.jar'),
    SCALA_JLINE_JAR: scalaHashes.get('jline-3.29.0-jdk8.jar'),
  };
  const realRepoRoot = fs.realpathSync(repoRoot);
  const childEnvironment = {};
  const verifyInput = (candidate, expectedSha256, label) => {
    if (typeof candidate !== 'string' || !path.isAbsolute(candidate)) {
      fail(`Verified compiler input marker is missing ${label}.`);
    }
    const realCandidate = fs.realpathSync(candidate);
    const relative = path.relative(realRepoRoot, realCandidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      fail(`Verified compiler input path escapes the checkout through a symbolic link: ${label}.`);
    }
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
      fail(`Verified compiler input must be a regular file: ${label}.`);
    }
    if (!/^[0-9a-f]{64}$/.test(expectedSha256 || '') || sha256File(candidate) !== expectedSha256) {
      fail(`Verified compiler input SHA-256 changed after preparation: ${label}.`);
    }
  };

  for (const name of environmentNames) {
    const lockedSha256 = expectedEnvironmentSha256[name];
    if (marker.environmentSha256[name] !== lockedSha256) {
      fail(`Verified compiler input marker hash does not match the lock: ${name}.`);
    }
    childEnvironment[name] = marker.environment[name];
  }

  const lockedKotlinJars = Object.entries(compilerLock.kotlin?.jars || {});
  if (
    lockedKotlinJars.length === 0 ||
    lockedKotlinJars.some(([relativePath, digest]) =>
      !/^package\/lib\/[A-Za-z0-9_.-]+\.jar$/.test(relativePath) ||
      !/^[0-9a-f]{64}$/.test(digest || '')
    )
  ) {
    fail('Verified Kotlin compiler classpath lock is invalid.');
  }
  const kotlinLibraryRoot = path.dirname(childEnvironment.KOTLIN_COMPILER_JAR);
  const scalaCacheRoot = path.dirname(childEnvironment.SCALA_COMPILER_JAR);
  const expectedKotlinNames = lockedKotlinJars.map(([relativePath]) => path.posix.basename(relativePath));
  const kotlinClasspath = lockedKotlinJars.map(([relativePath, digest]) => {
    const candidate = path.join(kotlinLibraryRoot, path.posix.basename(relativePath));
    return candidate;
  });
  childEnvironment.KOTLIN_COMPILER_CLASSPATH = kotlinClasspath.join(path.delimiter);

  const verifyCompilerInputs = () => {
    for (const name of environmentNames) {
      verifyInput(childEnvironment[name], expectedEnvironmentSha256[name], name);
    }
    const kotlinEntries = fs.readdirSync(kotlinLibraryRoot, { withFileTypes: true });
    const actualKotlinNames = kotlinEntries
      .filter((entry) => entry.name.endsWith('.jar'))
      .map((entry) => entry.name)
      .sort();
    if (
      kotlinEntries.some((entry) => entry.name.endsWith('.jar') && !entry.isFile()) ||
      JSON.stringify(actualKotlinNames) !== JSON.stringify([...expectedKotlinNames].sort())
    ) {
      fail('Verified Kotlin compiler classpath inventory changed after preparation.');
    }
    for (let index = 0; index < lockedKotlinJars.length; index += 1) {
      const [relativePath, digest] = lockedKotlinJars[index];
      verifyInput(kotlinClasspath[index], digest, relativePath);
    }
    const expectedScalaNames = [...scalaHashes.keys()].sort();
    const scalaEntries = fs.readdirSync(scalaCacheRoot, { withFileTypes: true })
      .filter((entry) => entry.name.endsWith('.jar'));
    const actualScalaNames = scalaEntries.map((entry) => entry.name).sort();
    if (
      scalaEntries.some((entry) => !entry.isFile()) ||
      JSON.stringify(actualScalaNames) !== JSON.stringify(expectedScalaNames)
    ) {
      fail('Verified Scala compiler cache JAR inventory changed after preparation.');
    }
    for (const [environmentName, filename] of Object.entries(scalaEnvironmentFiles)) {
      if (path.resolve(childEnvironment[environmentName]) !== path.join(scalaCacheRoot, filename)) {
        fail(`Verified Scala compiler input is outside the exact cache inventory: ${environmentName}.`);
      }
    }
  };
  verifyCompilerInputs();
  return { childEnvironment, verifyCompilerInputs };
}

function terminateProcessTree(child, signal) {
  if (!child?.pid) {
    return;
  }
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error.code !== 'ESRCH') {
        console.error(`Unable to signal process group ${child.pid}: ${error.message}`);
      }
    }
  }
  try {
    child.kill(signal);
  } catch (error) {
    if (error.code !== 'ESRCH') {
      console.error(`Unable to signal compiler smoke ${child.pid}: ${error.message}`);
    }
  }
}

function writeLedger(ledgerPath, ledger) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const temporaryPath = `${ledgerPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o644 });
  fs.renameSync(temporaryPath, ledgerPath);
}

let activeChild;
let activeForcedKill;
let interruptedSignal;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    interruptedSignal = signal;
    const interruptedChild = activeChild;
    if (!interruptedChild) {
      return;
    }
    terminateProcessTree(interruptedChild, signal);
    if (activeForcedKill) {
      clearTimeout(activeForcedKill.timer);
    }
    const timer = setTimeout(() => {
      terminateProcessTree(interruptedChild, 'SIGKILL');
      if (activeForcedKill?.timer === timer) {
        activeForcedKill = undefined;
      }
    }, 30_000);
    activeForcedKill = { child: interruptedChild, timer };
  });
}

async function runScript(absoluteScriptPath, childEnvironment, timeout) {
  const started = Date.now();
  return await new Promise((resolve) => {
    let timedOut = false;
    let settled = false;
    let forcedKill;
    const child = spawn('bash', [absoluteScriptPath], {
      cwd: repoRoot,
      env: { ...process.env, ...childEnvironment },
      stdio: 'inherit',
      detached: process.platform !== 'win32',
    });
    activeChild = child;

    const hardTimeout = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child, 'SIGINT');
      forcedKill = setTimeout(() => terminateProcessTree(child, 'SIGKILL'), timeout.killGraceSeconds * 1000);
    }, timeout.outerTimeoutSeconds * 1000);
    hardTimeout.unref();

    const finish = (exitCode, signal, error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timedOut || interruptedSignal) {
        // Once the group leader closes, no remaining descendant should receive
        // any further grace: kill the old group before its id can be reused.
        terminateProcessTree(child, 'SIGKILL');
      }
      clearTimeout(hardTimeout);
      clearTimeout(forcedKill);
      if (activeForcedKill?.child === child) {
        clearTimeout(activeForcedKill.timer);
        activeForcedKill = undefined;
      }
      activeChild = undefined;
      resolve({
        status: timedOut ? 'timeout' : interruptedSignal ? 'interrupted' : error || exitCode !== 0 ? 'failed' : 'passed',
        exitCode,
        signal: signal || interruptedSignal || null,
        error: error?.message || null,
        durationMilliseconds: Date.now() - started,
        innerBudgetSeconds: timeout.innerBudgetSeconds,
        outerTimeoutSeconds: timeout.outerTimeoutSeconds,
      });
    };
    child.once('error', (error) => finish(null, null, error));
    child.once('close', (exitCode, signal) => finish(exitCode, signal, null));
  });
}

let ledger;
let ledgerPath;
try {
  if (!/^compiler-[0-9]{2}$/.test(shardId || '')) {
    fail('Usage: node ci/run_modern_java_smoke_shard.mjs compiler-NN');
  }
  if (!/^(?:[1-9][0-9]*|local)$/.test(runId) || !/^[1-9][0-9]*$/.test(runAttempt)) {
    fail('Compiler shard ledger run identity is invalid.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const shard = Array.isArray(manifest.shards) ?
    manifest.shards.find((candidate) => candidate?.id === shardId) : undefined;
  if (!shard || !Array.isArray(shard.scripts) || shard.scripts.length === 0) {
    fail(`Compiler shard ${shardId} is absent or empty.`);
  }
  ledgerPath = path.join(
    repoRoot,
    'build',
    'compiler-smoke-results',
    `compiler-smoke-${runId}-${runAttempt}-${shardId}.json`
  );
  ledger = {
    schemaVersion: 1,
    runId,
    runAttempt,
    shard: shardId,
    manifestSha256: sha256File(manifestPath),
    compilerInputLockSha256: sha256File(compilerLockPath),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'running',
    scripts: [],
  };
  writeLedger(ledgerPath, ledger);
  const { childEnvironment: compilerEnvironment, verifyCompilerInputs } = readCompilerEnvironment();

  for (const scriptPath of shard.scripts) {
    if (interruptedSignal) {
      fail(`Compiler shard ${shardId} was interrupted by ${interruptedSignal}.`);
    }
    if (
      typeof scriptPath !== 'string' ||
      !/^ci\/(?:kotlin|scala)[A-Za-z0-9_]*_smoke\.sh$/.test(scriptPath) ||
      path.posix.normalize(scriptPath) !== scriptPath
    ) {
      fail(`Compiler shard ${shardId} contains an unsafe script path: ${String(scriptPath)}`);
    }
    const absoluteScriptPath = path.resolve(repoRoot, ...scriptPath.split('/'));
    if (!absoluteScriptPath.startsWith(`${repoRoot}${path.sep}`)) {
      fail(`Compiler shard ${shardId} escapes the repository: ${scriptPath}`);
    }
    const scriptStat = fs.lstatSync(absoluteScriptPath);
    if (!scriptStat.isFile() || scriptStat.isSymbolicLink()) {
      fail(`Compiler shard ${shardId} script must be a regular file: ${scriptPath}`);
    }

    const timeout = scriptOuterTimeout(fs.readFileSync(absoluteScriptPath, 'utf8'), scriptPath);
    console.log(`::group::${shardId}: ${scriptPath}`);
    const result = await runScript(absoluteScriptPath, compilerEnvironment, timeout);
    console.log('::endgroup::');
    try {
      verifyCompilerInputs();
    } catch (error) {
      result.compilerInputIntegrityError = error.message;
      if (result.status === 'passed') {
        result.status = 'failed';
        result.error = error.message;
      }
    }
    ledger.scripts.push({ path: scriptPath, ...result });
    writeLedger(ledgerPath, ledger);
    if (result.status !== 'passed') {
      ledger.status = result.status;
      break;
    }
  }

  if (ledger.status === 'running') {
    ledger.status = ledger.scripts.length === shard.scripts.length ? 'passed' : 'failed';
  }
  ledger.finishedAt = new Date().toISOString();
  writeLedger(ledgerPath, ledger);
  if (ledger.status !== 'passed') {
    fail(`${shardId} stopped after a ${ledger.status} compiler smoke; ledger: ${ledgerPath}`);
  }
  console.log(`${shardId} completed ${ledger.scripts.length} compiler smoke scripts; ledger: ${ledgerPath}`);
} catch (error) {
  if (ledger && ledgerPath && ledger.status === 'running') {
    ledger.status = interruptedSignal ? 'interrupted' : 'failed';
    ledger.finishedAt = new Date().toISOString();
    writeLedger(ledgerPath, ledger);
  }
  console.error(error.message);
  process.exitCode = 1;
}
