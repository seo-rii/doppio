import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const checkerPath = path.join(path.dirname(__filename), 'check_modern_java_workflow.mjs');

function writeFixture(root, workflowText) {
  const ciDir = path.join(root, 'ci');
  fs.mkdirSync(ciDir, { recursive: true });
  fs.writeFileSync(path.join(ciDir, 'kotlin_alpha_smoke.sh'), '#!/usr/bin/env bash\n');
  fs.writeFileSync(path.join(ciDir, 'scala_beta_smoke.sh'), '#!/usr/bin/env bash\n');
  fs.writeFileSync(path.join(ciDir, 'pages_browser_smoke.mjs'), '');

  const workflowPath = path.join(root, 'modern-java.yml');
  fs.writeFileSync(workflowPath, workflowText);
  return { ciDir, workflowPath };
}

function runChecker(ciDir, workflowPath) {
  return spawnSync(process.execPath, [checkerPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MODERN_JAVA_WORKFLOW_CI_DIR: ciDir,
      MODERN_JAVA_WORKFLOW_PATH: workflowPath,
    },
  });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-modern-workflow-'));
try {
  const complete = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release browser bundle
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack release --grunt-ignore-compile-errors
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const completeResult = runChecker(complete.ciDir, complete.workflowPath);
  if (completeResult.status !== 0) {
    throw new Error(`expected complete workflow to pass:\n${completeResult.stderr}`);
  }

  const missing = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release browser bundle
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack release --grunt-ignore-compile-errors
      - run: ./ci/kotlin_alpha_smoke.sh
`);
  const missingResult = runChecker(missing.ciDir, missing.workflowPath);
  if (missingResult.status === 0 || !missingResult.stderr.includes('ci/scala_beta_smoke.sh')) {
    throw new Error(`expected missing Scala smoke to fail:\n${missingResult.stdout}\n${missingResult.stderr}`);
  }

  const unknown = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release browser bundle
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack release --grunt-ignore-compile-errors
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
      - run: ./ci/kotlin_missing_smoke.sh
`);
  const unknownResult = runChecker(unknown.ciDir, unknown.workflowPath);
  if (unknownResult.status === 0 || !unknownResult.stderr.includes('ci/kotlin_missing_smoke.sh')) {
    throw new Error(`expected unknown Kotlin smoke to fail:\n${unknownResult.stdout}\n${unknownResult.stderr}`);
  }

  const missingReleaseTimeout = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release browser bundle
        run: ./node_modules/.bin/grunt --stack release --grunt-ignore-compile-errors
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const missingReleaseTimeoutResult = runChecker(missingReleaseTimeout.ciDir, missingReleaseTimeout.workflowPath);
  if (
    missingReleaseTimeoutResult.status === 0 ||
    !missingReleaseTimeoutResult.stderr.includes('Build release browser bundle')
  ) {
    throw new Error(
      `expected missing release bundle timeout to fail:\n${missingReleaseTimeoutResult.stdout}\n${missingReleaseTimeoutResult.stderr}`
    );
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Modern Java workflow checker tests passed.');
