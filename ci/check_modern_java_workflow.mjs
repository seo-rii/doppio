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
const smokeScriptPattern = /^(?:clojure|groovy|jruby|kotlin|scala)[A-Za-z0-9_]*_smoke\.sh$/;
const maximumCompilerInputBytes = 128 * 1024 * 1024;
const finalLanguageUnitCommand = 'node --test ci/java_final_language_metadata_contract_test.mjs ci/java_final_language_harness_contract_test.mjs ci/java_final_language_retained_contract_test.mjs';
const finalLanguageRunnerCommand = 'node ci/java_final_language_test.mjs --browser';
const finalLanguageRetainedRunnerCommand = 'node ci/java_final_language_retained_test.mjs --browser';
const methodHandleCoreUnitCommand = 'node --test ci/java_methodhandle_core_contract_test.mjs';
const methodHandleCoreRunnerCommand = 'node ci/java_methodhandle_core_test.mjs --browser';
const methodHandleCollectionUnitCommand = 'node --test ci/java_methodhandle_collection_contract_test.mjs';
const methodHandleCollectionRunnerCommand = 'node ci/java_methodhandle_collection_test.mjs --browser';
const varHandleUnitCommand = 'node --test ci/java_methodhandle_varhandle_contract_test.mjs ci/varhandle_storage_test.cjs ' +
  'ci/varhandle_linkage_test.cjs ci/varhandle_native_boundary_test.cjs ci/varhandle_api_metadata_test.cjs';
const varHandleRunnerCommand = 'node ci/java_methodhandle_varhandle_test.mjs --browser';
const bootstrapUnitCommand = 'node --test ci/java_methodhandle_bootstrap_contract_test.mjs ci/bootstrap_linkage_test.cjs';
const bootstrapRunnerCommand = 'node ci/java_methodhandle_bootstrap_test.mjs --browser';
const hiddenClassUnitCommand = 'node --test ci/java_methodhandle_hidden_class_contract_test.mjs ci/hidden_class_runtime_test.cjs ' +
  'ci/hidden_class_metadata_test.cjs ci/hidden_class_entry_guard_test.cjs';
const hiddenClassRunnerCommand = 'node ci/java_methodhandle_hidden_class_test.mjs --browser';
const nominalConstantUnitCommand = 'node --test ci/java_methodhandle_nominal_constant_contract_test.mjs ' +
  'ci/nominal_constant_runtime_test.cjs ci/nominal_constant_overlays_test.cjs ' +
  'ci/nominal_type_metadata_test.cjs ci/nominal_handle_metadata_test.cjs';
const nominalConstantRunnerCommand = 'node ci/java_methodhandle_nominal_constant_test.mjs --browser';
const classFileApiUnitCommand = 'node --test ci/java_classfile_api_contract_test.mjs ci/classfile_api_metadata_test.cjs';
const classFileApiRunnerCommand = 'node ci/java_classfile_api_test.mjs --browser';
const classFileControlFlowUnitCommand = 'node --test ci/java_classfile_controlflow_contract_test.mjs';
const classFileControlFlowRunnerCommand = 'node ci/java_classfile_controlflow_test.mjs --browser';
const classFileExtendedUnitCommand = 'node --test ci/java_classfile_extended_contract_test.mjs ci/classfile_extended_metadata_test.cjs';
const classFileExtendedRunnerCommand = 'node ci/java_classfile_extended_test.mjs --browser';
const classFileHierarchyUnitCommand = 'node --test ci/java_classfile_hierarchy_contract_test.mjs ci/classfile_hierarchy_metadata_test.cjs ci/classfile_constant_instruction_test.cjs';
const classFileHierarchyRunnerCommand = 'node ci/java_classfile_hierarchy_test.mjs --browser';
const classFileInstructionsUnitCommand = 'node --test --test-concurrency=2 ci/java_classfile_instructions_contract_test.mjs ci/classfile_memory_instruction_test.cjs ci/classfile_instruction_writer_test.cjs ci/classfile_instruction_frame_policy_test.cjs';
const classFileInstructionsRunnerCommand = 'node ci/java_classfile_instructions_test.mjs --browser';
const classFileDebugUnitCommand = 'node --test --test-concurrency=2 ci/java_classfile_debug_contract_test.mjs ci/classfile_debug_instruction_test.cjs ci/classfile_debug_reader_test.cjs';
const classFileDebugRunnerCommand = 'node ci/java_classfile_debug_test.mjs --browser';
const partialMultianewarrayUnitCommand = 'node --test ci/partial_multianewarray_regression_test.cjs';

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
    /^(?:clojure|groovy|jruby|kotlin|scala)/.test(name) && name.endsWith('_smoke.sh')
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
      !/^ci\/(?:clojure|groovy|jruby|kotlin|scala)[A-Za-z0-9_]*_smoke\.sh$/.test(scriptPath) ||
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

const pagesRetryStep = extractStep(runtimeJob, 'Check Pages smoke retry');
requireExactSchedulingStep(
  pagesRetryStep,
  'Pages smoke retry',
  'node ci/pages_browser_smoke_retry_test.mjs'
);

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

for (const [name, fields] of [
  ['Check Java compatibility baseline tooling', [
    'timeout-minutes: 3',
    'run: node --test ci/prepare_java_compatibility_toolchains_test.mjs ci/run_java_compatibility_test.mjs ci/java_compatibility_browser_test.mjs',
  ]],
  ['Check phase A inventory and evidence contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/plan_spec_source_index_test.mjs ci/check_java_se_api_census_test.mjs ci/java_se_contract_sources_test.mjs ci/check_plan_spec_obligations_test.mjs ci/check_phase_a_inventory_test.mjs ci/check_phase_a_evidence_test.mjs',
  ]],
  ['Build Java compatibility browser runtime', [
    'timeout-minutes: 10',
    'run: ./node_modules/.bin/grunt --stack make_build_dir:release vite-release listings:release --grunt-ignore-compile-errors',
  ]],
  ['Install Java compatibility Chromium', [
    'timeout-minutes: 10',
    'run: ./node_modules/.bin/playwright install --with-deps chromium',
  ]],
  ['Prepare pinned Java compatibility toolchains', [
    'timeout-minutes: 25',
    'run: node ci/prepare_java_compatibility_toolchains.mjs',
  ]],
  ['Verify complete phase A requirements inventory', [
    'id: phase_a_inventory',
    'timeout-minutes: 30',
    'run: node ci/plan_spec_source_index.mjs --check && node ci/check_java_se_api_census.mjs && node ci/java_se_contract_sources.mjs && node ci/check_phase_a_inventory.mjs',
  ]],
  ['Upload phase A requirements inventory', [
    "if: always() && steps.phase_a_inventory.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: |',
    '    build/phase-a-inventory.json',
    '    build/phase-a-edition-deltas.json.gz',
    '    build/java-se-api-census/*.gz',
    '    build/java-se-api-census/summary.json',
    '    build/java-se-contract-sources/*.gz',
    '    build/java-se-contract-sources/summary.json',
    '    build/java-se-contract-sources/documents/*.gz',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Run genuine Java 21 and 25 seed fixtures', [
    'id: java_compatibility',
    'timeout-minutes: 130',
    'run: node ci/run_java_compatibility.mjs --browser',
  ]],
  ['Run final Java 25 launcher compatibility', [
    'timeout-minutes: 40',
    'run: node ci/java25_main_test.mjs --browser',
  ]],
  ['Check main exit status contracts', [
    'timeout-minutes: 1',
    'run: node ci/jvm_exit_status_test.cjs && node --test ci/java_uncaught_exit_contract_test.mjs',
  ]],
  ['Run Java uncaught-exception exit compatibility', [
    'id: uncaught_exit',
    'timeout-minutes: 60',
    'run: node ci/java_uncaught_exit_test.mjs --browser',
  ]],
  ['Upload Java uncaught-exception exit ledger', [
    "if: always() && steps.uncaught_exit.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-uncaught-exit-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check class-file version admission', [
    'timeout-minutes: 1',
    'run: node ci/class_file_version_test.cjs && node --test ci/java_class_version_test_test.mjs',
  ]],
  ['Run Java class-file version compatibility', [
    'id: class_version_admission',
    'timeout-minutes: 50',
    'run: node ci/java_class_version_test.mjs --browser',
  ]],
  ['Upload class-file admission ledger', [
    "if: always() && steps.class_version_admission.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-class-version-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Verify current-commit phase A execution evidence', [
    'timeout-minutes: 1',
    'run: node ci/check_phase_a_evidence.mjs',
  ]],
  ['Check phase B initialization contracts', [
    'timeout-minutes: 1',
    'run: node --test ci/class_initialization_test.cjs ci/interface_invocation_initialization_test.cjs ci/java_initialization_contract_test.mjs',
  ]],
  ['Run Java initialization compatibility', [
    'id: java_initialization',
    'timeout-minutes: 10',
    'run: node ci/run_java_compatibility.mjs --manifest ci/java_initialization_manifest.json --output build/java-initialization-results.json --browser',
  ]],
  ['Upload Java initialization ledger', [
    "if: always() && steps.java_initialization.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-initialization-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B structural contracts', [
    'timeout-minutes: 1',
    'run: node --test ci/class_member_structure_test.cjs ci/class_attribute_structure_test.cjs ci/java_class_structure_contract_test.mjs',
  ]],
  ['Run Java class-file structural compatibility', [
    'id: java_class_structure',
    'timeout-minutes: 15',
    'run: node ci/java_class_structure_test.mjs --browser',
  ]],
  ['Upload Java class-file structural ledger', [
    "if: always() && steps.java_class_structure.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-class-structure-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B bytecode verification contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/bytecode_structure_test.cjs ci/bytecode_type_test.cjs ci/verification_relations_test.cjs ci/verification_exception_boundary_test.cjs ci/class_verification_test.cjs ci/verification_loader_failure_test.cjs ci/class_verification_integration_test.cjs ci/modern_overlay_verification_test.cjs ci/unsafe_allocation_verification_test.cjs ci/reflection_invocation_verification_test.cjs ci/lambda_verification_test.cjs ci/reflection_adapters_test.cjs ci/java_bytecode_verification_contract_test.mjs',
  ]],
  ['Run Java bytecode verification compatibility', [
    'id: java_bytecode_verification',
    'timeout-minutes: 15',
    'run: node ci/java_bytecode_verification_test.mjs --browser',
  ]],
  ['Upload Java bytecode verification ledger', [
    "if: always() && steps.java_bytecode_verification.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-bytecode-verification-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B class derivation contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/class_derivation_test.cjs ci/class_loader_derivation_test.cjs ci/lookup_class_metadata_test.cjs ci/java_class_derivation_contract_test.mjs',
  ]],
  ['Run Java class derivation compatibility', [
    'id: java_class_derivation',
    'timeout-minutes: 15',
    'run: node ci/java_class_derivation_test.mjs --browser',
  ]],
  ['Upload Java class derivation ledger', [
    "if: always() && steps.java_class_derivation.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-class-derivation-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B loading constraint contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/loading_constraints_test.cjs ci/class_loading_constraints_test.cjs ci/member_loading_constraints_test.cjs ci/class_preparation_test.cjs ci/method_selection_test.cjs ci/java_loading_constraints_contract_test.mjs',
  ]],
  ['Run Java loading constraint compatibility', [
    'id: java_loading_constraints',
    'timeout-minutes: 15',
    'run: node ci/java_loading_constraints_test.mjs --browser',
  ]],
  ['Upload Java loading constraint ledger', [
    "if: always() && steps.java_loading_constraints.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-loading-constraints-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B member resolution contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/class_member_resolution_test.cjs ci/java_member_resolution_contract_test.mjs',
  ]],
  ['Run Java member resolution compatibility', [
    'id: java_member_resolution',
    'timeout-minutes: 20',
    'run: node ci/java_member_resolution_test.mjs --browser',
  ]],
  ['Upload Java member resolution ledger', [
    "if: always() && steps.java_member_resolution.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-member-resolution-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B member access contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/symbolic_resolution_test.cjs ci/class_access_test.cjs ci/java_member_access_contract_test.mjs',
  ]],
  ['Run Java member access compatibility', [
    'id: java_member_access',
    'timeout-minutes: 25',
    'run: node ci/java_member_access_test.mjs --browser',
  ]],
  ['Upload Java member access ledger', [
    "if: always() && steps.java_member_access.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-member-access-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B invocation evolution contracts', [
    'timeout-minutes: 1',
    'run: node --test ci/method_selection_test.cjs ci/opcode_member_kind_test.cjs ci/java_invocation_evolution_contract_test.mjs',
  ]],
  ['Run Java invocation evolution compatibility', [
    'id: java_invocation_evolution',
    'timeout-minutes: 20',
    'run: node ci/java_invocation_evolution_test.mjs --browser',
  ]],
  ['Upload Java invocation evolution ledger', [
    "if: always() && steps.java_invocation_evolution.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-invocation-evolution-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B core semantics contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/jvm_float_precision_test.cjs ci/jvm_float_to_long_test.cjs ci/array_store_semantics_test.cjs ci/athrow_semantics_test.cjs ci/nominal_constant_interfaces_test.cjs ci/java_core_bytecode_test.mjs ci/java_core_stack_forms_contract_test.mjs ci/java_core_semantics_contract_test.mjs',
  ]],
  ['Run Java core semantics compatibility', [
    'id: java_core_semantics',
    'timeout-minutes: 45',
    'run: node ci/java_core_semantics_test.mjs --browser',
  ]],
  ['Upload Java core semantics ledger', [
    "if: always() && steps.java_core_semantics.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-core-semantics-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B record semantics contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/record_component_native_test.cjs ci/annotated_wildcard_bounds_test.cjs ci/record_object_methods_test.cjs ci/java_record_semantics_contract_test.mjs',
  ]],
  ['Run Java record semantics compatibility', [
    'id: java_record_semantics',
    'timeout-minutes: 30',
    'run: node ci/java_record_semantics_test.mjs --browser',
  ]],
  ['Upload Java record semantics ledger', [
    "if: always() && steps.java_record_semantics.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-record-semantics-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B sealed semantics contracts', [
    'timeout-minutes: 3',
    'run: node --test ci/sealed_class_derivation_test.cjs ci/sealed_class_reflection_test.cjs ci/java_sealed_semantics_contract_test.mjs ci/native_return_boundary_test.cjs',
  ]],
  ['Run Java sealed semantics compatibility', [
    'id: java_sealed_semantics',
    'timeout-minutes: 40',
    'run: node ci/java_sealed_semantics_test.mjs --browser',
  ]],
  ['Upload Java sealed semantics ledger', [
    "if: always() && steps.java_sealed_semantics.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-sealed-semantics-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase B final language contracts', [
    'timeout-minutes: 3',
    `run: ${finalLanguageUnitCommand}`,
  ]],
  ['Run final Java language compatibility', [
    'id: java_final_language',
    'timeout-minutes: 60',
    `run: ${finalLanguageRunnerCommand}`,
  ]],
  ['Upload final Java language ledger', [
    "if: always() && steps.java_final_language.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-final-language-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Run retained final Java language compatibility', [
    'id: java_final_language_retained',
    'timeout-minutes: 70',
    `run: ${finalLanguageRetainedRunnerCommand}`,
  ]],
  ['Upload retained final Java language ledger', [
    "if: always() && steps.java_final_language_retained.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-final-language-retained-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C method handle contracts', [
    'timeout-minutes: 3',
    `run: ${methodHandleCoreUnitCommand}`,
  ]],
  ['Run Java method handle core compatibility', [
    'id: java_methodhandle_core',
    'timeout-minutes: 40',
    `run: ${methodHandleCoreRunnerCommand}`,
  ]],
  ['Upload Java method handle core ledger', [
    "if: always() && steps.java_methodhandle_core.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-methodhandle-core-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C collection and control flow contracts', [
    'timeout-minutes: 3',
    `run: ${methodHandleCollectionUnitCommand}`,
  ]],
  ['Run Java method handle collection compatibility', [
    'id: java_methodhandle_collection',
    'timeout-minutes: 40',
    `run: ${methodHandleCollectionRunnerCommand}`,
  ]],
  ['Upload Java method handle collection ledger', [
    "if: always() && steps.java_methodhandle_collection.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-methodhandle-collection-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C VarHandle execution contracts', [
    'timeout-minutes: 3',
    `run: ${varHandleUnitCommand}`,
  ]],
  ['Run Java VarHandle execution compatibility', [
    'id: java_methodhandle_varhandle',
    'timeout-minutes: 40',
    `run: ${varHandleRunnerCommand}`,
  ]],
  ['Upload Java VarHandle execution ledger', [
    "if: always() && steps.java_methodhandle_varhandle.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-methodhandle-varhandle-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C user bootstrap contracts', [
    'timeout-minutes: 3',
    `run: ${bootstrapUnitCommand}`,
  ]],
  ['Run Java user bootstrap compatibility', [
    'id: java_methodhandle_bootstrap',
    'timeout-minutes: 40',
    `run: ${bootstrapRunnerCommand}`,
  ]],
  ['Upload Java user bootstrap ledger', [
    "if: always() && steps.java_methodhandle_bootstrap.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-methodhandle-bootstrap-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C hidden class contracts', [
    'timeout-minutes: 3',
    `run: ${hiddenClassUnitCommand}`,
  ]],
  ['Run Java hidden class compatibility', [
    'id: java_methodhandle_hidden_class',
    'timeout-minutes: 40',
    `run: ${hiddenClassRunnerCommand}`,
  ]],
  ['Upload Java hidden class ledger', [
    "if: always() && steps.java_methodhandle_hidden_class.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-methodhandle-hidden-class-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C nominal constant contracts', [
    'timeout-minutes: 3',
    `run: ${nominalConstantUnitCommand}`,
  ]],
  ['Run Java nominal constant compatibility', [
    'id: java_methodhandle_nominal_constant',
    'timeout-minutes: 40',
    `run: ${nominalConstantRunnerCommand}`,
  ]],
  ['Upload Java nominal constant ledger', [
    "if: always() && steps.java_methodhandle_nominal_constant.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-methodhandle-nominal-constant-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C public class-file API contracts', [
    'timeout-minutes: 3',
    `run: ${classFileApiUnitCommand}`,
  ]],
  ['Run Java public class-file API compatibility', [
    'id: java_classfile_api',
    'timeout-minutes: 40',
    `run: ${classFileApiRunnerCommand}`,
  ]],
  ['Upload Java public class-file API ledger', [
    "if: always() && steps.java_classfile_api.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-classfile-api-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C class-file control-flow contracts', [
    'timeout-minutes: 3',
    `run: ${classFileControlFlowUnitCommand}`,
  ]],
  ['Run Java class-file control-flow compatibility', [
    'id: java_classfile_controlflow',
    'timeout-minutes: 40',
    `run: ${classFileControlFlowRunnerCommand}`,
  ]],
  ['Upload Java class-file control-flow ledger', [
    "if: always() && steps.java_classfile_controlflow.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-classfile-controlflow-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C class-file extended contracts', [
    'timeout-minutes: 3',
    `run: ${classFileExtendedUnitCommand}`,
  ]],
  ['Run Java class-file extended compatibility', [
    'id: java_classfile_extended',
    'timeout-minutes: 40',
    `run: ${classFileExtendedRunnerCommand}`,
  ]],
  ['Upload Java class-file extended ledger', [
    "if: always() && steps.java_classfile_extended.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-classfile-extended-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C class-file hierarchy contracts', [
    'timeout-minutes: 3',
    `run: ${classFileHierarchyUnitCommand}`,
  ]],
  ['Run Java class-file hierarchy compatibility', [
    'id: java_classfile_hierarchy',
    'timeout-minutes: 40',
    `run: ${classFileHierarchyRunnerCommand}`,
  ]],
  ['Upload Java class-file hierarchy ledger', [
    "if: always() && steps.java_classfile_hierarchy.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-classfile-hierarchy-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check partial multidimensional array allocation', [
    'timeout-minutes: 3',
    `run: ${partialMultianewarrayUnitCommand}`,
  ]],
  ['Check phase C class-file instructions contracts', [
    'timeout-minutes: 3',
    `run: ${classFileInstructionsUnitCommand}`,
  ]],
  ['Run Java class-file instructions compatibility', [
    'id: java_classfile_instructions',
    'timeout-minutes: 40',
    `run: ${classFileInstructionsRunnerCommand}`,
  ]],
  ['Upload Java class-file instructions ledger', [
    "if: always() && steps.java_classfile_instructions.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-classfile-instructions-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check phase C class-file debug contracts', [
    'timeout-minutes: 3',
    `run: ${classFileDebugUnitCommand}`,
  ]],
  ['Run Java class-file debug compatibility', [
    'id: java_classfile_debug',
    'timeout-minutes: 40',
    `run: ${classFileDebugRunnerCommand}`,
  ]],
  ['Upload Java class-file debug ledger', [
    "if: always() && steps.java_classfile_debug.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-classfile-debug-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Check evolved switch ledger contract', [
    'timeout-minutes: 1',
    'run: node --test ci/java_pattern_evolution_contract_test.mjs',
  ]],
  ['Run evolved enum and sealed switch compatibility', [
    'id: pattern_evolution',
    'timeout-minutes: 45',
    'run: node ci/java_pattern_evolution_test.mjs --browser',
  ]],
  ['Upload evolved switch compatibility ledger', [
    "if: always() && steps.pattern_evolution.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-pattern-evolution-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
  ['Upload Java compatibility baseline ledger', [
    "if: always() && steps.java_compatibility.outcome != 'skipped'",
    'uses: actions/upload-artifact@v7',
    'with:',
    '  path: build/java-compatibility-results.json',
    '  archive: false',
    '  if-no-files-found: error',
    '  retention-days: 7',
  ]],
]) {
  const step = extractStep(runtimeJob, name);
  const actualFields = step.split('\n').filter(line => line.trim()).join('\n');
  const expectedFields = fields.map(field => `        ${field}`).join('\n');
  if (actualFields !== expectedFields) {
    fail(`Modern Java workflow ${name} must retain its exact bounded, fail-closed baseline command or artifact contract.`);
  }
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
  'Check Pages smoke retry',
  'Install Java compatibility Chromium',
  'Check Java compatibility baseline tooling',
  'Check phase A inventory and evidence contracts',
  'Build release CLI runner',
  'Build Java compatibility browser runtime',
  'Verify compiler bootstrap overlay',
  'Bundle deterministic compiler runtime inputs',
  'Check Mesa fixture scheduling',
  'Check Wait fixture scheduling',
  'Run Java 17 legacy compatibility tests',
  'Run modern Java compatibility tests',
  'Prepare pinned Java compatibility toolchains',
  'Verify complete phase A requirements inventory',
  'Upload phase A requirements inventory',
  'Run genuine Java 21 and 25 seed fixtures',
  'Run final Java 25 launcher compatibility',
  'Check main exit status contracts',
  'Run Java uncaught-exception exit compatibility',
  'Upload Java uncaught-exception exit ledger',
  'Check class-file version admission',
  'Run Java class-file version compatibility',
  'Upload class-file admission ledger',
  'Verify current-commit phase A execution evidence',
  'Check phase B initialization contracts',
  'Run Java initialization compatibility',
  'Upload Java initialization ledger',
  'Check phase B structural contracts',
  'Run Java class-file structural compatibility',
  'Upload Java class-file structural ledger',
  'Check phase B bytecode verification contracts',
  'Run Java bytecode verification compatibility',
  'Upload Java bytecode verification ledger',
  'Check phase B class derivation contracts',
  'Run Java class derivation compatibility',
  'Upload Java class derivation ledger',
  'Check phase B loading constraint contracts',
  'Run Java loading constraint compatibility',
  'Upload Java loading constraint ledger',
  'Check phase B member resolution contracts',
  'Run Java member resolution compatibility',
  'Upload Java member resolution ledger',
  'Check phase B member access contracts',
  'Run Java member access compatibility',
  'Upload Java member access ledger',
  'Check phase B invocation evolution contracts',
  'Run Java invocation evolution compatibility',
  'Upload Java invocation evolution ledger',
  'Check phase B core semantics contracts',
  'Run Java core semantics compatibility',
  'Upload Java core semantics ledger',
  'Check phase B record semantics contracts',
  'Run Java record semantics compatibility',
  'Upload Java record semantics ledger',
  'Check phase B sealed semantics contracts',
  'Run Java sealed semantics compatibility',
  'Upload Java sealed semantics ledger',
  'Check phase B final language contracts',
  'Run final Java language compatibility',
  'Upload final Java language ledger',
  'Run retained final Java language compatibility',
  'Upload retained final Java language ledger',
  'Check phase C method handle contracts',
  'Run Java method handle core compatibility',
  'Upload Java method handle core ledger',
  'Check phase C collection and control flow contracts',
  'Run Java method handle collection compatibility',
  'Upload Java method handle collection ledger',
  'Check phase C VarHandle execution contracts',
  'Run Java VarHandle execution compatibility',
  'Upload Java VarHandle execution ledger',
  'Check phase C user bootstrap contracts',
  'Run Java user bootstrap compatibility',
  'Upload Java user bootstrap ledger',
  'Check phase C hidden class contracts',
  'Run Java hidden class compatibility',
  'Upload Java hidden class ledger',
  'Check phase C nominal constant contracts',
  'Run Java nominal constant compatibility',
  'Upload Java nominal constant ledger',
  'Check phase C public class-file API contracts',
  'Run Java public class-file API compatibility',
  'Upload Java public class-file API ledger',
  'Check phase C class-file control-flow contracts',
  'Run Java class-file control-flow compatibility',
  'Upload Java class-file control-flow ledger',
  'Check phase C class-file extended contracts',
  'Run Java class-file extended compatibility',
  'Upload Java class-file extended ledger',
  'Check phase C class-file hierarchy contracts',
  'Run Java class-file hierarchy compatibility',
  'Upload Java class-file hierarchy ledger',
  'Check partial multidimensional array allocation',
  'Check phase C class-file instructions contracts',
  'Run Java class-file instructions compatibility',
  'Upload Java class-file instructions ledger',
  'Check phase C class-file debug contracts',
  'Run Java class-file debug compatibility',
  'Upload Java class-file debug ledger',
  'Check evolved switch ledger contract',
  'Run evolved enum and sealed switch compatibility',
  'Upload evolved switch compatibility ledger',
  'Upload Java compatibility baseline ledger',
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
for (const command of [finalLanguageUnitCommand, finalLanguageRunnerCommand, finalLanguageRetainedRunnerCommand]) {
  if (countLiteral(runtimeJob, `        run: ${command}\n`) !== 1) {
    fail(`Modern Java workflow must execute final language command exactly once: ${command}`);
  }
}
for (const command of [methodHandleCoreUnitCommand, methodHandleCoreRunnerCommand]) {
  if (countLiteral(runtimeJob, `        run: ${command}\n`) !== 1) {
    fail(`Modern Java workflow must execute method handle core command exactly once: ${command}`);
  }
}
for (const command of [methodHandleCollectionUnitCommand, methodHandleCollectionRunnerCommand]) {
  if (countLiteral(runtimeJob, `        run: ${command}\n`) !== 1) {
    fail(`Modern Java workflow must execute method handle collection command exactly once: ${command}`);
  }
}
for (const command of [varHandleUnitCommand, varHandleRunnerCommand]) {
  if (countLiteral(runtimeJob, `        run: ${command}\n`) !== 1) {
    fail(`Modern Java workflow must execute VarHandle execution command exactly once: ${command}`);
  }
}
for (const [name, commands] of [['user bootstrap', [bootstrapUnitCommand, bootstrapRunnerCommand]],
  ['hidden class', [hiddenClassUnitCommand, hiddenClassRunnerCommand]],
  ['nominal constant', [nominalConstantUnitCommand, nominalConstantRunnerCommand]],
  ['public class-file API', [classFileApiUnitCommand, classFileApiRunnerCommand]],
  ['class-file control-flow', [classFileControlFlowUnitCommand, classFileControlFlowRunnerCommand]],
  ['class-file extended', [classFileExtendedUnitCommand, classFileExtendedRunnerCommand]],
  ['class-file hierarchy', [classFileHierarchyUnitCommand, classFileHierarchyRunnerCommand]],
  ['class-file instructions', [classFileInstructionsUnitCommand, classFileInstructionsRunnerCommand]],
  ['class-file debug', [classFileDebugUnitCommand, classFileDebugRunnerCommand]],
  ['partial multidimensional allocation', [partialMultianewarrayUnitCommand]]]) {
  for (const command of commands) if (countLiteral(runtimeJob, `        run: ${command}\n`) !== 1) {
    fail(`Modern Java workflow must execute ${name} command exactly once: ${command}`);
  }
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
if (/\.\/ci\/(?:clojure|groovy|jruby|kotlin|scala)[A-Za-z0-9_]*_smoke\.sh\b/.test(workflow)) {
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
  `Modern Java workflow shards ${expectedScripts.length} compiler smokes across ` +
  `${shardIds.length} jobs (${minimumBudget}-${maximumBudget}s inner, ` +
  `${maximumOuterBudget}s maximum outer budget).`
);
