import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const ciDir = process.env.MODERN_JAVA_WORKFLOW_CI_DIR || path.join(repoRoot, 'ci');
const workflowPath = process.env.MODERN_JAVA_WORKFLOW_PATH || path.join(repoRoot, '.github', 'workflows', 'modern-java.yml');

const workflow = fs.readFileSync(workflowPath, 'utf8');
const smokeScriptPattern = /^(?:kotlin|scala).*_smoke\.sh$/;
function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireWorkflowIndex(label, index) {
  if (index < 0) {
    fail(`Modern Java workflow is missing ${label}.`);
  }
  return index;
}

const expectedScripts = fs
  .readdirSync(ciDir)
  .filter((name) => smokeScriptPattern.test(name))
  .sort();

const referencedScripts = new Set();
for (const match of workflow.matchAll(/run:\s*(?:\|\s*)?\n?\s*(?:env\s+)?\.\/ci\/([A-Za-z0-9_./-]+_smoke\.sh)\b/g)) {
  referencedScripts.add(path.basename(match[1]));
}

const missingScripts = expectedScripts.filter((script) => !referencedScripts.has(script));
const unknownScripts = [...referencedScripts]
  .filter((script) => smokeScriptPattern.test(script) && !expectedScripts.includes(script))
  .sort();

if (missingScripts.length > 0 || unknownScripts.length > 0) {
  if (missingScripts.length > 0) {
    console.error('Modern Java workflow is missing smoke scripts:');
    for (const script of missingScripts) {
      console.error(`  - ci/${script}`);
    }
  }

  if (unknownScripts.length > 0) {
    console.error('Modern Java workflow references unknown smoke scripts:');
    for (const script of unknownScripts) {
      console.error(`  - ci/${script}`);
    }
  }

  process.exit(1);
}

const releaseRunnerStep = workflow.match(/- name:\s*Build release CLI runner\n(?<body>(?:\s{8}[^\n]*\n)*)/);
const releaseRunnerBody = releaseRunnerStep?.groups?.body || '';
const releaseTimeoutMatch = releaseRunnerBody.match(/^\s+timeout-minutes:\s*(\d+)\s*$/m);
if (!releaseRunnerStep || !releaseTimeoutMatch) {
  fail('Modern Java workflow must set timeout-minutes on "Build release CLI runner".');
}

const releaseTimeoutMinutes = Number(releaseTimeoutMatch[1]);
if (!Number.isInteger(releaseTimeoutMinutes) || releaseTimeoutMinutes < 5 || releaseTimeoutMinutes > 20) {
  fail('Modern Java workflow release CLI runner timeout must be between 5 and 20 minutes.');
}

if (!/grunt\s+--stack\s+modern-ci-release-cli\b/.test(releaseRunnerBody)) {
  fail('Modern Java workflow must build the release CLI runner with modern-ci-release-cli.');
}

const modernJavaRuntimeStep = workflow.match(/- name:\s*Run modern Java compatibility tests\n(?<body>(?:\s{8}[^\n]*\n)*)/);
const modernJavaRuntimeBody = modernJavaRuntimeStep?.groups?.body || '';
if (!/grunt\s+--stack\s+test-modern-java-runtime\b/.test(modernJavaRuntimeBody)) {
  fail('Modern Java workflow must run test-modern-java-runtime after building the release CLI runner.');
}

const coreArrayStep = workflow.match(/- name:\s*Run core array compatibility smoke\n(?<body>(?:\s{8}[^\n]*\n)*)/);
const coreArrayBody = coreArrayStep?.groups?.body || '';
if (!coreArrayStep) {
  fail('Modern Java workflow is missing "Run core array compatibility smoke".');
}
if (!/grunt\s+--stack\s+modern-ci-array-runout\b/.test(coreArrayBody)) {
  fail('Modern Java workflow must generate the ArrayOps runout with modern-ci-array-runout before the core array smoke.');
}
if (!/node\s+build\/release-cli\/console\/test_runner\.js\s+classes\/test\/ArrayOps\s+--makefile\b/.test(coreArrayBody)) {
  fail('Modern Java workflow must run the ArrayOps makefile smoke with the release CLI runner.');
}

const compilerCoverageStep = workflow.match(
  /- name:\s*Check compiler smoke workflow coverage\n(?<body>(?:\s{8}[^\n]*\n)*)/
);
const compilerCoverageBody = compilerCoverageStep?.groups?.body || '';
if (compilerCoverageStep) {
  if (!/yarn\s+ci:check-kotlin-modern-source-guards:test\b/.test(compilerCoverageBody)) {
    fail('Modern Java workflow must test the Kotlin modern source guard before compiler smokes.');
  }
  if (!/yarn\s+ci:check-kotlin-modern-source-guards\b/.test(compilerCoverageBody)) {
    fail('Modern Java workflow must run the Kotlin modern source guard before compiler smokes.');
  }
}

const releaseRunnerIndex = requireWorkflowIndex('the Build release CLI runner step', workflow.indexOf('- name: Build release CLI runner'));
const modernJavaRuntimeIndex = requireWorkflowIndex(
  'the Run modern Java compatibility tests step',
  workflow.indexOf('- name: Run modern Java compatibility tests')
);
const coreArrayIndex = requireWorkflowIndex(
  'the Run core array compatibility smoke step',
  workflow.indexOf('- name: Run core array compatibility smoke')
);
const firstCompilerSmokeIndex = Math.min(
  ...[...workflow.matchAll(/\.\/ci\/(?:kotlin|scala)[A-Za-z0-9_./-]*_smoke\.sh\b/g)].map((match) => match.index)
);

if (releaseRunnerIndex > modernJavaRuntimeIndex) {
  fail('Modern Java workflow must build the release CLI runner before modern Java compatibility tests.');
}
if (modernJavaRuntimeIndex > coreArrayIndex) {
  fail('Modern Java workflow must run modern Java compatibility tests before the core array smoke.');
}
if (coreArrayIndex > firstCompilerSmokeIndex) {
  fail('Modern Java workflow must run the core array smoke before Kotlin/Scala compiler smokes.');
}

console.log(`Modern Java workflow references ${expectedScripts.length} Kotlin/Scala smoke scripts.`);
