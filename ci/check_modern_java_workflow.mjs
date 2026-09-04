import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const ciDir = process.env.MODERN_JAVA_WORKFLOW_CI_DIR || path.join(repoRoot, 'ci');
const workflowPath = process.env.MODERN_JAVA_WORKFLOW_PATH ||
  path.join(repoRoot, '.github', 'workflows', 'modern-java.yml');
const manifestPath = process.env.MODERN_JAVA_WORKFLOW_MANIFEST_PATH ||
  path.join(repoRoot, 'ci', 'modern_java_smoke_shards.json');
const compilerLockPath = process.env.MODERN_JAVA_WORKFLOW_COMPILER_LOCK_PATH ||
  path.join(repoRoot, 'ci', 'modern_java_compiler_inputs.lock.json');
const compilerInputToolPath = process.env.MODERN_JAVA_WORKFLOW_COMPILER_INPUT_TOOL_PATH ||
  path.join(repoRoot, 'ci', 'prepare_modern_java_compiler_inputs.mjs');
const smokeScriptPattern = /^(?:kotlin|scala)[A-Za-z0-9_]*_smoke\.sh$/;
const maximumCompilerInputBytes = 128 * 1024 * 1024;

function stripUnquotedComments(text) {
  return text.split('\n').map((line) => {
    let singleQuoted = false;
    let doubleQuoted = false;
    let backtickQuoted = false;
    let escaped = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\' && (doubleQuoted || backtickQuoted)) {
        escaped = true;
        continue;
      }
      if (character === "'" && !doubleQuoted && !backtickQuoted) {
        if (singleQuoted && line[index + 1] === "'") {
          index += 1;
        } else {
          singleQuoted = !singleQuoted;
        }
        continue;
      }
      if (character === '"' && !singleQuoted && !backtickQuoted) {
        doubleQuoted = !doubleQuoted;
        continue;
      }
      if (character === '`' && !singleQuoted && !doubleQuoted) {
        backtickQuoted = !backtickQuoted;
        continue;
      }
      if (
        character === '#' &&
        !singleQuoted &&
        !doubleQuoted &&
        !backtickQuoted &&
        (index === 0 || /\s/.test(line[index - 1]))
      ) {
        return line.slice(0, index).trimEnd();
      }
    }
    return line;
  }).join('\n');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireMatch(text, pattern, message) {
  const match = text.match(pattern);
  if (!match) {
    fail(message);
  }
  return match;
}

function requireIndex(text, needle, label) {
  const index = text.indexOf(needle);
  if (index < 0) {
    fail(`Modern Java workflow is missing ${label}.`);
  }
  return index;
}

function extractJob(workflow, jobName) {
  const startToken = `  ${jobName}:\n`;
  const start = workflow.indexOf(startToken);
  if (start < 0) {
    fail(`Modern Java workflow is missing the ${jobName} job.`);
  }
  const remainder = workflow.slice(start + startToken.length);
  const nextJob = remainder.search(/^  [A-Za-z0-9_-]+:\s*$/m);
  return nextJob < 0 ? remainder : remainder.slice(0, nextJob);
}

function extractStep(job, stepName) {
  const escapedName = stepName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchableJob = `${job.replace(/\n?$/, '\n')}      - name: __checker_end__\n`;
  const match = searchableJob.match(
    new RegExp(`^      - name: ${escapedName}\\n(?<body>[\\s\\S]*?)(?=^      - name:)`, 'm')
  );
  if (!match) {
    fail(`Modern Java workflow is missing the "${stepName}" step.`);
  }
  return match.groups.body;
}

function requireExactSchedulingStep(step, fixtureName, command) {
  const timeoutFields = step.match(
    /^        (?:(?:"timeout-minutes"|'timeout-minutes')|timeout-minutes)\s*:/gm
  ) || [];
  const timeoutMatch = step.match(/^        timeout-minutes:\s*(\d+)\s*$/m);
  if (timeoutFields.length !== 1 || !timeoutMatch) {
    fail(
      `Modern Java workflow ${fixtureName} scheduling check must set exactly one numeric ` +
      'timeout-minutes.'
    );
  }
  const timeoutMinutes = Number(timeoutMatch[1]);
  if (timeoutMinutes < 1 || timeoutMinutes > 3) {
    fail(
      `Modern Java workflow ${fixtureName} scheduling check timeout must be between 1 and ` +
      '3 minutes.'
    );
  }

  const runFields = step.match(/^        (?:(?:"run"|'run')|run)\s*:/gm) || [];
  const escapedCommand = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (
    runFields.length !== 1 ||
    !new RegExp(`^        run:[ \\t]*${escapedCommand}[ \\t]*$`, 'm').test(step)
  ) {
    fail(
      `Modern Java workflow ${fixtureName} scheduling check must run ${command} directly.`
    );
  }

  for (const [pattern, field] of [
    [/^        (?:(?:"if"|'if')|if)\s*:/m, 'if'],
    [/^        (?:(?:"continue-on-error"|'continue-on-error')|continue-on-error)\s*:/m,
      'continue-on-error'],
    [/^        (?:(?:"shell"|'shell')|shell)\s*:/m, 'shell'],
  ]) {
    if (pattern.test(step)) {
      fail(`Modern Java workflow ${fixtureName} scheduling check must not set ${field}.`);
    }
  }

  const fields = step.split('\n').filter((line) => line.trim().length > 0);
  if (fields.length !== 2) {
    fail(
      `Modern Java workflow ${fixtureName} scheduling check may contain only ` +
      'timeout-minutes and run.'
    );
  }
}

function requireJobTimeout(job, jobName) {
  const match = requireMatch(
    job,
    /^    timeout-minutes:\s*(\d+)\s*$/m,
    `Modern Java workflow must set timeout-minutes on the ${jobName} job.`
  );
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes < 120 || minutes > 180) {
    fail(`Modern Java workflow ${jobName} job timeout must be between 120 and 180 minutes.`);
  }
  return minutes;
}

function requireNodeAndJava(job, jobName) {
  if (!/uses:\s*actions\/checkout@v7\b/.test(job)) {
    fail(`Modern Java workflow ${jobName} job must use checkout@v7.`);
  }
  if (!/uses:\s*actions\/setup-node@v6\b/.test(job) || !/node-version:\s*24\b/.test(job)) {
    fail(`Modern Java workflow ${jobName} job must use Node.js 24.`);
  }
  if (!/uses:\s*actions\/setup-java@v5\b/.test(job) || !/java-version:\s*17\b/.test(job)) {
    fail(`Modern Java workflow ${jobName} job must use Java 17.`);
  }
  if (!/FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*true\b/.test(job)) {
    fail(`Modern Java workflow ${jobName} job must force JavaScript actions onto Node.js 24.`);
  }
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

function isAllowedCompilerInputSize(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= maximumCompilerInputBytes;
}

function scriptBudgetSeconds(scriptPath) {
  const text = fs.readFileSync(path.join(ciDir, path.basename(scriptPath)), 'utf8');
  const compileMatch = text.match(/compile_timeout="\$\{[^:}]+:-(\d+)\}"/);
  if (!compileMatch) {
    fail(`${scriptPath} must declare a default compile timeout.`);
  }
  if (!/kill_after="\$\{[^:}]+:-(\d+)\}"/.test(text)) {
    fail(`${scriptPath} must declare a forced-kill grace period.`);
  }
  const compileInvocations = countLiteral(
    text,
    'timeout -k "${kill_after}s" -s INT "${compile_timeout}s"'
  );
  if (compileInvocations === 0) {
    fail(`${scriptPath} must preserve timeout -k protection for compiler execution.`);
  }

  const runMatch = text.match(/run_timeout="\$\{[^:}]+:-(\d+)\}"/);
  const runInvocations = countLiteral(
    text,
    'timeout -k "${kill_after}s" -s INT "${run_timeout}s"'
  );
  if ((runMatch && runInvocations === 0) || (!runMatch && runInvocations !== 0)) {
    fail(`${scriptPath} has an inconsistent runtime timeout contract.`);
  }

  return Number(compileMatch[1]) * compileInvocations +
    (runMatch ? Number(runMatch[1]) * runInvocations : 0);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`Unable to read Modern Java shard manifest: ${error.message}`);
}
if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.shards)) {
  fail('Modern Java shard manifest must use schemaVersion 1 and contain a shards array.');
}
if (manifest.shards.length !== 8) {
  fail('Modern Java shard manifest must define exactly 8 compiler shards.');
}

const candidateScriptNames = fs.readdirSync(ciDir)
  .filter((name) =>
    (name.startsWith('kotlin') || name.startsWith('scala')) && name.endsWith('_smoke.sh')
  )
  .sort();
for (const name of candidateScriptNames) {
  if (!smokeScriptPattern.test(name)) {
    fail(`Modern Java compiler smoke inventory contains an unsafe script filename: ${name}`);
  }
  const stat = fs.lstatSync(path.join(ciDir, name));
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(`Modern Java compiler smoke inventory entry must be a regular file: ${name}`);
  }
}
const expectedScripts = candidateScriptNames
  .map((name) => `ci/${name}`)
  .sort();
const seenScripts = new Set();
const seenShardIds = new Set();
const shardIds = [];
const shardBudgets = [];

for (const shard of manifest.shards) {
  if (!shard || !/^compiler-[0-9]{2}$/.test(shard.id || '')) {
    fail('Modern Java shard manifest contains an invalid shard id.');
  }
  if (seenShardIds.has(shard.id)) {
    fail(`Modern Java shard manifest contains duplicate shard id: ${shard.id}`);
  }
  seenShardIds.add(shard.id);
  shardIds.push(shard.id);
  if (!Array.isArray(shard.scripts) || shard.scripts.length === 0) {
    fail(`Modern Java shard ${shard.id} must contain at least one script.`);
  }
  if (JSON.stringify(shard.scripts) !== JSON.stringify([...shard.scripts].sort())) {
    fail(`Modern Java shard ${shard.id} scripts must be in deterministic lexical order.`);
  }

  let hasKotlin = false;
  let hasScala = false;
  let budgetSeconds = 0;
  for (const scriptPath of shard.scripts) {
    if (
      typeof scriptPath !== 'string' ||
      !/^ci\/(?:kotlin|scala)[A-Za-z0-9_]*_smoke\.sh$/.test(scriptPath) ||
      path.posix.normalize(scriptPath) !== scriptPath
    ) {
      fail(`Modern Java shard ${shard.id} contains an unsafe script path: ${String(scriptPath)}`);
    }
    if (seenScripts.has(scriptPath)) {
      fail(`Modern Java shard manifest contains duplicate script: ${scriptPath}`);
    }
    seenScripts.add(scriptPath);
    if (!expectedScripts.includes(scriptPath)) {
      fail(`Modern Java shard manifest references unknown smoke script: ${scriptPath}`);
    }
    hasKotlin ||= path.basename(scriptPath).startsWith('kotlin');
    hasScala ||= path.basename(scriptPath).startsWith('scala');
    budgetSeconds += scriptBudgetSeconds(scriptPath);
  }
  if (!hasKotlin || !hasScala) {
    fail(`Modern Java shard ${shard.id} must exercise both Kotlin and Scala compiler caches.`);
  }
  shardBudgets.push({
    id: shard.id,
    seconds: budgetSeconds,
    outerSeconds: budgetSeconds + shard.scripts.length * 180,
  });
}

if (JSON.stringify(shardIds) !== JSON.stringify([...shardIds].sort())) {
  fail('Modern Java shard ids must be in deterministic lexical order.');
}
const missingScripts = expectedScripts.filter((scriptPath) => !seenScripts.has(scriptPath));
if (missingScripts.length > 0) {
  fail(`Modern Java shard manifest is missing smoke scripts: ${missingScripts.join(', ')}`);
}
if (seenScripts.size !== expectedScripts.length) {
  fail('Modern Java shard manifest inventory does not exactly match ci/ compiler smokes.');
}

const minimumBudget = Math.min(...shardBudgets.map((shard) => shard.seconds));
const maximumBudget = Math.max(...shardBudgets.map((shard) => shard.seconds));
if (maximumBudget > 90 * 60) {
  fail('Modern Java compiler shard declared timeout budget must not exceed 90 minutes.');
}
if (maximumBudget - minimumBudget > 10 * 60) {
  fail('Modern Java compiler shards must remain balanced within 10 minutes of declared timeout budget.');
}
const maximumOuterBudget = Math.max(...shardBudgets.map((shard) => shard.outerSeconds));
if (maximumOuterBudget > 120 * 60) {
  fail('Modern Java compiler shard outer timeout budget must not exceed 120 minutes.');
}

let compilerLock;
try {
  compilerLock = JSON.parse(fs.readFileSync(compilerLockPath, 'utf8'));
} catch (error) {
  fail(`Unable to read Modern Java compiler input lock: ${error.message}`);
}

let compilerInputTool;
try {
  compilerInputTool = stripUnquotedComments(fs.readFileSync(compilerInputToolPath, 'utf8'));
} catch (error) {
  fail(`Unable to read Modern Java compiler input tool: ${error.message}`);
}
if (
  compilerInputTool.includes("redirect: 'follow'") ||
  !compilerInputTool.includes('const maximumDownloadRedirects = 5;') ||
  !compilerInputTool.includes('const downloadSignal = AbortSignal.timeout(600_000);') ||
  !compilerInputTool.includes("redirect: 'manual'") ||
  !/parsedUrl\s*=\s*requireDownloadUrl\(\s*nextUrl\.href,/.test(compilerInputTool)
) {
  fail('Modern Java compiler input downloads must use finite manually validated redirects.');
}
if (
  compilerLock?.schemaVersion !== 2 ||
  compilerLock.kotlin?.version !== '2.4.0' ||
  compilerLock.scala?.version !== '2.13.18' ||
  !/^https:\/\/registry\.npmjs\.org\//.test(compilerLock.kotlin?.url || '') ||
  !/^[0-9a-f]{64}$/.test(compilerLock.kotlin?.sha256 || '') ||
  !compilerLock.kotlin?.jars ||
  !Array.isArray(compilerLock.scala?.files)
) {
  fail('Modern Java compiler input lock metadata is incomplete or unpinned.');
}
if (!isAllowedCompilerInputSize(compilerLock.kotlin.size)) {
  fail('Modern Java Kotlin compiler archive must pin a positive safe-integer size at or below 128 MiB.');
}
if (compilerLock.scala.files.length !== 5) {
  fail('Modern Java Scala compiler input lock must contain exactly five JARs.');
}
const lockedKotlinJars = Object.entries(compilerLock.kotlin.jars);
if (
  lockedKotlinJars.length === 0 ||
  JSON.stringify(lockedKotlinJars.map(([name]) => name)) !==
    JSON.stringify(lockedKotlinJars.map(([name]) => name).sort())
) {
  fail('Modern Java Kotlin extracted JAR lock must be nonempty and lexically ordered.');
}
for (const [jarPath, sha256] of lockedKotlinJars) {
  if (!/^package\/lib\/[A-Za-z0-9_.-]+\.jar$/.test(jarPath) || !/^[0-9a-f]{64}$/.test(sha256)) {
    fail(`Modern Java Kotlin compiler input is unsafe or unhashed: ${jarPath}`);
  }
}
for (const requiredJar of [
  'package/lib/kotlin-compiler.jar',
  'package/lib/kotlin-reflect.jar',
  'package/lib/kotlin-stdlib.jar',
]) {
  if (!(requiredJar in compilerLock.kotlin.jars)) {
    fail(`Modern Java Kotlin compiler input lock is missing ${requiredJar}.`);
  }
}
const scalaNames = [];
for (const file of compilerLock.scala.files) {
  if (
    !/^[A-Za-z0-9_.-]+\.jar$/.test(file?.name || '') ||
    !/^https:\/\/repo1\.maven\.org\//.test(file?.url || '') ||
    !/^[0-9a-f]{64}$/.test(file?.sha256 || '') ||
    !isAllowedCompilerInputSize(file?.size)
  ) {
    fail('Modern Java Scala compiler input lock contains an unsafe or unhashed file, or an invalidly sized file.');
  }
  scalaNames.push(file.name);
}
if (
  new Set(scalaNames).size !== scalaNames.length ||
  JSON.stringify(scalaNames) !== JSON.stringify([...scalaNames].sort())
) {
  fail('Modern Java Scala compiler input lock filenames must be unique and lexically ordered.');
}
for (const requiredName of [
  'java-diff-utils-4.16.jar',
  'jline-3.29.0-jdk8.jar',
  'scala-compiler-2.13.18.jar',
  'scala-library-2.13.18.jar',
  'scala-reflect-2.13.18.jar',
]) {
  if (!scalaNames.includes(requiredName)) {
    fail(`Modern Java Scala compiler input lock is missing ${requiredName}.`);
  }
}

const workflow = stripUnquotedComments(fs.readFileSync(workflowPath, 'utf8'));
const permissionsMatch = requireMatch(
  workflow,
  /^permissions:\n(?<body>(?:  [^\n]+\n)+)/m,
  'Modern Java workflow must declare minimal top-level permissions.'
);
if (permissionsMatch.groups.body !== '  contents: read\n') {
  fail('Modern Java workflow permissions must be exactly contents: read.');
}
const runtimeJob = extractJob(workflow, 'runtime');
const compilerJob = extractJob(workflow, 'compiler');
const terminalJob = extractJob(workflow, 'test');
requireJobTimeout(runtimeJob, 'runtime');
const compilerTimeoutMinutes = requireJobTimeout(compilerJob, 'compiler');
if (
  compilerTimeoutMinutes !== 180 ||
  compilerTimeoutMinutes * 60 < maximumOuterBudget + 45 * 60
) {
  fail(
    'Modern Java workflow compiler job timeout must be 180 minutes and leave at least ' +
    '45 minutes beyond the maximum declared outer shard budget for setup and transfer.'
  );
}
requireNodeAndJava(runtimeJob, 'runtime');
requireNodeAndJava(compilerJob, 'compiler');

const typecheckStep = extractStep(runtimeJob, 'Check TypeScript compiler compatibility');
for (const command of [
  'grunt bootstrap-typecheck',
  'yarn typecheck',
  'yarn typecheck:bootstrap',
  'yarn typecheck:typescript-7-rc',
  'yarn typecheck:typescript-7-rc-bootstrap',
]) {
  if (!typecheckStep.includes(command)) {
    fail(`Modern Java workflow runtime gate must run ${command}.`);
  }
}

const coverageStep = extractStep(runtimeJob, 'Check compiler smoke workflow coverage');
for (const command of [
  'yarn ci:check-modern-java-workflow:test',
  'yarn ci:check-modern-java-workflow',
  'yarn ci:check-compiler-bootstrap-consumers:test',
  'yarn ci:check-compiler-bootstrap-consumers',
  'yarn ci:check-kotlin-modern-source-guards:test',
  'yarn ci:check-kotlin-modern-source-guards',
  'yarn ci:check-scala-modern-source-guards:test',
  'yarn ci:check-scala-modern-source-guards',
]) {
  if (!coverageStep.includes(command)) {
    fail(`Modern Java workflow compiler coverage gate must run ${command}.`);
  }
}

const releaseStep = extractStep(runtimeJob, 'Build release CLI runner');
const releaseTimeout = requireMatch(
  releaseStep,
  /^        timeout-minutes:\s*(\d+)\s*$/m,
  'Modern Java workflow must set timeout-minutes on "Build release CLI runner".'
);
if (Number(releaseTimeout[1]) < 5 || Number(releaseTimeout[1]) > 20) {
  fail('Modern Java workflow release CLI runner timeout must be between 5 and 20 minutes.');
}
if (!/grunt\s+--stack\s+modern-ci-release-cli\b/.test(releaseStep)) {
  fail('Modern Java workflow must build the release CLI runner with modern-ci-release-cli.');
}

const overlayStep = extractStep(runtimeJob, 'Verify compiler bootstrap overlay');
if (!/\.\/ci\/modern_bootstrap_overlay_smoke\.sh\b/.test(overlayStep)) {
  fail('Modern Java workflow must run the compiler bootstrap overlay smoke.');
}

const mesaStep = extractStep(runtimeJob, 'Check Mesa fixture scheduling');
requireExactSchedulingStep(
  mesaStep,
  'Mesa',
  'node ci/mesa_test_regression_test.cjs'
);

const waitStep = extractStep(runtimeJob, 'Check Wait fixture scheduling');
requireExactSchedulingStep(
  waitStep,
  'Wait',
  'node ci/wait_test_regression_test.cjs'
);

const legacyStep = extractStep(runtimeJob, 'Run Java 17 legacy compatibility tests');
for (const task of [
  'check_jdk',
  'find_native_java',
  'run_java:default',
  'lineending:default',
  'unit_test:default',
  'unit_test_nashorn_legacy',
]) {
  if (!legacyStep.includes(task)) {
    fail(`Modern Java workflow legacy gate must run ${task}.`);
  }
}
if (legacyStep.includes('newer:run_java')) {
  fail('Modern Java workflow must let run_java enforce the native-JDK fingerprint cache directly.');
}

const modernRuntimeStep = extractStep(runtimeJob, 'Run modern Java compatibility tests');
if (!/grunt\s+--stack\s+test-modern-java-runtime\b/.test(modernRuntimeStep)) {
  fail('Modern Java workflow must run test-modern-java-runtime.');
}

const arrayStep = extractStep(runtimeJob, 'Run core array compatibility smoke');
if (!/grunt\s+--stack\s+modern-ci-array-runout\b/.test(arrayStep)) {
  fail('Modern Java workflow must generate the ArrayOps runout with modern-ci-array-runout.');
}
if (!/node\s+build\/release-cli\/console\/test_runner\.js\s+classes\/test\/ArrayOps\s+--makefile\b/.test(arrayStep)) {
  fail('Modern Java workflow must run the ArrayOps makefile smoke with the release CLI runner.');
}

const bundleStep = extractStep(runtimeJob, 'Bundle deterministic compiler runtime inputs');
for (const token of [
  'id: bundle_runtime',
  'node ci/modern_java_runtime_artifact.mjs create',
  '--output-dir build/ci-artifacts',
  '--manifest ci/modern_java_smoke_shards.json',
  '--commit "$GITHUB_SHA"',
  '--run-id "$GITHUB_RUN_ID"',
  '--run-attempt "$GITHUB_RUN_ATTEMPT"',
  '--github-output "$GITHUB_OUTPUT"',
]) {
  if (!bundleStep.includes(token)) {
    fail(`Modern Java runtime artifact bundle step is missing ${token}.`);
  }
}
if (
  !/runtime-artifact-name:\s*\$\{\{\s*steps\.bundle_runtime\.outputs\.artifact_name\s*\}\}/.test(runtimeJob) ||
  !/runtime-archive-sha256:\s*\$\{\{\s*steps\.bundle_runtime\.outputs\.sha256\s*\}\}/.test(runtimeJob) ||
  !/runtime-run-id:\s*\$\{\{\s*steps\.bundle_runtime\.outputs\.run_id\s*\}\}/.test(runtimeJob) ||
  !/runtime-run-attempt:\s*\$\{\{\s*steps\.bundle_runtime\.outputs\.run_attempt\s*\}\}/.test(runtimeJob)
) {
  fail('Modern Java runtime job must publish the artifact name, SHA-256, and producer run identity.');
}

const snapshotStep = extractStep(runtimeJob, 'Verify compiler runtime input snapshot');
for (const token of [
  'node ci/modern_java_runtime_artifact.mjs verify-source',
  '--archive "${{ steps.bundle_runtime.outputs.archive_path }}"',
  '--manifest ci/modern_java_smoke_shards.json',
  '--sha256 "${{ steps.bundle_runtime.outputs.sha256 }}"',
  '--commit "$GITHUB_SHA"',
  '--run-id "$GITHUB_RUN_ID"',
  '--run-attempt "$GITHUB_RUN_ATTEMPT"',
  '--artifact-name "${{ steps.bundle_runtime.outputs.artifact_name }}"',
]) {
  if (!snapshotStep.includes(token)) {
    fail(`Modern Java source snapshot integrity gate is missing ${token}.`);
  }
}

const uploadStep = extractStep(runtimeJob, 'Upload compiler runtime inputs');
for (const pattern of [
  /uses:\s*actions\/upload-artifact@v7\b/,
  /path:\s*\$\{\{\s*steps\.bundle_runtime\.outputs\.archive_path\s*\}\}/,
  /archive:\s*false\b/,
  /if-no-files-found:\s*error\b/,
  /retention-days:\s*(?:[7-9]|[1-9][0-9]+)\b/,
]) {
  if (!pattern.test(uploadStep)) {
    fail('Modern Java workflow must upload one raw deterministic runtime tar with upload-artifact@v7.');
  }
}
if (/^          name:/m.test(uploadStep)) {
  fail('Modern Java raw artifact upload must rely on the uploaded filename; upload-artifact@v7 ignores name.');
}

const runtimeOrder = [
  'Check TypeScript compiler compatibility',
  'Check compiler smoke workflow coverage',
  'Build release CLI runner',
  'Verify compiler bootstrap overlay',
  'Bundle deterministic compiler runtime inputs',
  'Check Mesa fixture scheduling',
  'Check Wait fixture scheduling',
  'Run Java 17 legacy compatibility tests',
  'Run modern Java compatibility tests',
  'Run core array compatibility smoke',
  'Verify compiler runtime input snapshot',
  'Upload compiler runtime inputs',
].map((name) => {
  const header = `      - name: ${name}\n`;
  if (countLiteral(runtimeJob, header) !== 1) {
    fail(`Modern Java workflow must contain the ${name} step exactly once.`);
  }
  return requireIndex(runtimeJob, header, `the ${name} step`);
});
if (runtimeOrder.some((index, position) => position > 0 && index <= runtimeOrder[position - 1])) {
  fail('Modern Java runtime gates and artifact publication must remain in dependency order.');
}

if (!/^    needs:\s*runtime\s*$/m.test(compilerJob)) {
  fail('Modern Java compiler job must depend on the runtime job.');
}
if (!/^      fail-fast:\s*false\s*$/m.test(compilerJob)) {
  fail('Modern Java compiler matrix must set fail-fast: false.');
}
const matrixMatch = requireMatch(
  compilerJob,
  /^        shard:\s*\[([^\]]+)\]\s*$/m,
  'Modern Java compiler matrix must list every checked-in shard.'
);
const matrixShardIds = matrixMatch[1].split(',').map((value) => value.trim());
if (JSON.stringify(matrixShardIds) !== JSON.stringify(shardIds)) {
  fail('Modern Java compiler matrix must exactly match the checked-in shard manifest order.');
}
if (!/KOTLIN_SMOKE_CLASSPATH_MODE:\s*full\b/.test(compilerJob)) {
  fail('Modern Java compiler job must preserve the full Kotlin compiler classpath smoke.');
}

const compilerInstallStep = extractStep(compilerJob, 'Install dependencies without repository lifecycle scripts');
for (const token of ['yarn install', '--frozen-lockfile', '--ignore-scripts']) {
  if (!compilerInstallStep.includes(token)) {
    fail(`Modern Java compiler dependency install must include ${token}.`);
  }
}
const kotlinCacheStep = extractStep(compilerJob, 'Cache Kotlin compiler');
if (
  !/uses:\s*actions\/cache@v5\b/.test(kotlinCacheStep) ||
  !/path:\s*build\/kotlin-smoke-cache\b/.test(kotlinCacheStep) ||
  !/key:\s*kotlin-compiler-\$\{\{\s*runner\.os\s*\}\}-\$\{\{\s*hashFiles\('ci\/modern_java_compiler_inputs\.lock\.json'\)\s*\}\}/.test(kotlinCacheStep)
) {
  fail('Modern Java compiler job must cache the Kotlin compiler.');
}
const scalaCacheStep = extractStep(compilerJob, 'Cache Scala compiler');
if (
  !/uses:\s*actions\/cache@v5\b/.test(scalaCacheStep) ||
  !/path:\s*build\/scala-smoke-cache\b/.test(scalaCacheStep) ||
  !/key:\s*scala-compiler-\$\{\{\s*runner\.os\s*\}\}-\$\{\{\s*hashFiles\('ci\/modern_java_compiler_inputs\.lock\.json'\)\s*\}\}/.test(scalaCacheStep)
) {
  fail('Modern Java compiler job must cache the Scala compiler.');
}

const prepareCompilerInputsStep = extractStep(compilerJob, 'Prepare verified compiler inputs');
for (const token of [
  'node ci/prepare_modern_java_compiler_inputs.mjs',
  '--lock ci/modern_java_compiler_inputs.lock.json',
  '--kotlin-cache build/kotlin-smoke-cache',
  '--scala-cache build/scala-smoke-cache',
  '--marker build/modern-java-compiler-inputs.json',
]) {
  if (!prepareCompilerInputsStep.includes(token)) {
    fail(`Modern Java verified compiler input preparation is missing ${token}.`);
  }
}

const downloadStep = extractStep(compilerJob, 'Download compiler runtime inputs');
if (
  !/uses:\s*actions\/download-artifact@v8\b/.test(downloadStep) ||
  !/name:\s*\$\{\{\s*needs\.runtime\.outputs\.runtime-artifact-name\s*\}\}/.test(downloadStep) ||
  !/path:\s*build\/ci-artifacts\b/.test(downloadStep) ||
  !/digest-mismatch:\s*error\b/.test(downloadStep)
) {
  fail('Modern Java compiler job must download the raw runtime artifact with download-artifact@v8.');
}

const verifyStep = extractStep(compilerJob, 'Verify and install compiler runtime inputs');
for (const token of [
  'node ci/modern_java_runtime_artifact.mjs verify',
  '--archive "build/ci-artifacts/${{ needs.runtime.outputs.runtime-artifact-name }}"',
  '--manifest ci/modern_java_smoke_shards.json',
  '--sha256 "${{ needs.runtime.outputs.runtime-archive-sha256 }}"',
  '--commit "$GITHUB_SHA"',
  '--run-id "${{ needs.runtime.outputs.runtime-run-id }}"',
  '--run-attempt "${{ needs.runtime.outputs.runtime-run-attempt }}"',
  '--artifact-name "${{ needs.runtime.outputs.runtime-artifact-name }}"',
  '--extract-root .',
]) {
  if (!verifyStep.includes(token)) {
    fail(`Modern Java compiler artifact integrity gate is missing ${token}.`);
  }
}

const runtimeSelfTestStep = extractStep(compilerJob, 'Self-test transferred compiler runtime inputs');
if (!/node\s+ci\/modern_java_runtime_self_test\.mjs\b/.test(runtimeSelfTestStep)) {
  fail('Modern Java compiler job must self-test the transferred release CLI before compiler smokes.');
}

const runShardStep = extractStep(compilerJob, 'Run compiler smoke shard');
if (
  !/^        id:\s*run_shard\s*$/m.test(runShardStep) ||
  !/node\s+ci\/run_modern_java_smoke_shard\.mjs\s+"\$\{\{\s*matrix\.shard\s*\}\}"/.test(runShardStep)
) {
  fail('Modern Java compiler job must run exactly the selected manifest shard.');
}
if (/\.\/ci\/(?:kotlin|scala)[A-Za-z0-9_]*_smoke\.sh\b/.test(workflow)) {
  fail('Modern Java workflow must execute compiler smokes only through the checked-in shard runner.');
}

const ledgerUploadStep = extractStep(compilerJob, 'Upload compiler smoke ledger');
for (const pattern of [
  /^        if:\s*always\(\)\s*&&\s*steps\.run_shard\.outcome\s*!=\s*'skipped'\s*$/m,
  /uses:\s*actions\/upload-artifact@v7\b/,
  /path:\s*build\/compiler-smoke-results\/compiler-smoke-\$\{\{\s*github\.run_id\s*\}\}-\$\{\{\s*github\.run_attempt\s*\}\}-\$\{\{\s*matrix\.shard\s*\}\}\.json/,
  /archive:\s*false\b/,
  /if-no-files-found:\s*error\b/,
  /retention-days:\s*(?:[7-9]|[1-9][0-9]+)\b/,
]) {
  if (!pattern.test(ledgerUploadStep)) {
    fail('Modern Java compiler job must always retain the attempt-unique shard result ledger.');
  }
}

const compilerOrder = [
  'Install dependencies without repository lifecycle scripts',
  'Cache Kotlin compiler',
  'Cache Scala compiler',
  'Prepare verified compiler inputs',
  'Download compiler runtime inputs',
  'Verify and install compiler runtime inputs',
  'Self-test transferred compiler runtime inputs',
  'Run compiler smoke shard',
  'Upload compiler smoke ledger',
].map((name) => requireIndex(compilerJob, `- name: ${name}`, `the ${name} step`));
if (compilerOrder.some((index, position) => position > 0 && index <= compilerOrder[position - 1])) {
  fail('Modern Java compiler job must verify the artifact before running sequential shard scripts.');
}

if (!/^    if:\s*always\(\)\s*$/m.test(terminalJob)) {
  fail('Modern Java terminal test job must run with if: always().');
}
if (!/^    needs:\s*\[runtime, compiler\]\s*$/m.test(terminalJob)) {
  fail('Modern Java terminal test job must aggregate runtime and compiler results.');
}
const terminalStep = extractStep(terminalJob, 'Require all Modern Java jobs to pass');
for (const pattern of [
  /RUNTIME_RESULT:\s*\$\{\{\s*needs\.runtime\.result\s*\}\}/,
  /COMPILER_RESULT:\s*\$\{\{\s*needs\.compiler\.result\s*\}\}/,
  /test\s+"\$RUNTIME_RESULT"\s*=\s*success/,
  /test\s+"\$COMPILER_RESULT"\s*=\s*success/,
]) {
  if (!pattern.test(terminalStep)) {
    fail('Modern Java terminal test job must fail unless both dependency results are success.');
  }
}
const topLevelJobs = [...workflow.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)].map((match) => match[1]);
if (topLevelJobs.at(-1) !== 'test') {
  fail('Modern Java test release gate must remain the terminal workflow job.');
}

console.log(
  `Modern Java workflow shards ${expectedScripts.length} Kotlin/Scala smokes across ` +
  `${shardIds.length} jobs (${minimumBudget}-${maximumBudget}s inner, ` +
  `${maximumOuterBudget}s maximum outer budget).`
);
