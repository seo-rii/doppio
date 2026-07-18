import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const checkerPath = path.join(path.dirname(__filename), 'check_modern_java_workflow.mjs');

function writeFixture(root, workflowText, options = {}) {
  const includeBootstrapStep = options.includeBootstrapStep !== false;
  if (includeBootstrapStep && !workflowText.includes('- name: Verify compiler bootstrap overlay')) {
    workflowText = workflowText.replace(
      '      - name: Run modern Java compatibility tests',
      '      - name: Verify compiler bootstrap overlay\n' +
        '        run: ./ci/modern_bootstrap_overlay_smoke.sh\n' +
        '      - name: Run modern Java compatibility tests'
    );
  }

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
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const completeResult = runChecker(complete.ciDir, complete.workflowPath);
  if (completeResult.status !== 0) {
    throw new Error(`expected complete workflow to pass:\n${completeResult.stderr}`);
  }

  const missingBootstrapOverlay = writeFixture(
    root,
    `
jobs:
  test:
    steps:
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`,
    { includeBootstrapStep: false }
  );
  const missingBootstrapOverlayResult = runChecker(
    missingBootstrapOverlay.ciDir,
    missingBootstrapOverlay.workflowPath
  );
  if (
    missingBootstrapOverlayResult.status === 0 ||
    !missingBootstrapOverlayResult.stderr.includes('compiler bootstrap overlay smoke')
  ) {
    throw new Error(
      `expected missing compiler bootstrap overlay smoke to fail:\n${missingBootstrapOverlayResult.stdout}\n${missingBootstrapOverlayResult.stderr}`
    );
  }

  const lateBootstrapOverlay = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Verify compiler bootstrap overlay
        run: ./ci/modern_bootstrap_overlay_smoke.sh
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const lateBootstrapOverlayResult = runChecker(lateBootstrapOverlay.ciDir, lateBootstrapOverlay.workflowPath);
  if (
    lateBootstrapOverlayResult.status === 0 ||
    !lateBootstrapOverlayResult.stderr.includes('before modern Java compatibility tests')
  ) {
    throw new Error(
      `expected late compiler bootstrap overlay smoke to fail:\n${lateBootstrapOverlayResult.stdout}\n${lateBootstrapOverlayResult.stderr}`
    );
  }

  const missing = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
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
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
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
      - name: Build release CLI runner
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const missingReleaseTimeoutResult = runChecker(missingReleaseTimeout.ciDir, missingReleaseTimeout.workflowPath);
  if (
    missingReleaseTimeoutResult.status === 0 ||
    !missingReleaseTimeoutResult.stderr.includes('Build release CLI runner')
  ) {
    throw new Error(
      `expected missing release CLI runner timeout to fail:\n${missingReleaseTimeoutResult.stdout}\n${missingReleaseTimeoutResult.stderr}`
    );
  }

  const wrongReleaseTarget = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack release --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const wrongReleaseTargetResult = runChecker(wrongReleaseTarget.ciDir, wrongReleaseTarget.workflowPath);
  if (
    wrongReleaseTargetResult.status === 0 ||
    !wrongReleaseTargetResult.stderr.includes('modern-ci-release-cli')
  ) {
    throw new Error(
      `expected wrong release target to fail:\n${wrongReleaseTargetResult.stdout}\n${wrongReleaseTargetResult.stderr}`
    );
  }

  const missingArrayRunout = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const missingArrayRunoutResult = runChecker(missingArrayRunout.ciDir, missingArrayRunout.workflowPath);
  if (
    missingArrayRunoutResult.status === 0 ||
    !missingArrayRunoutResult.stderr.includes('modern-ci-array-runout')
  ) {
    throw new Error(
      `expected missing ArrayOps runout generation to fail:\n${missingArrayRunoutResult.stdout}\n${missingArrayRunoutResult.stderr}`
    );
  }

  const missingKotlinSourceGuard = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Check compiler smoke workflow coverage
        run: |
          yarn ci:check-modern-java-workflow:test
          yarn ci:check-modern-java-workflow
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const missingKotlinSourceGuardResult = runChecker(
    missingKotlinSourceGuard.ciDir,
    missingKotlinSourceGuard.workflowPath
  );
  if (
    missingKotlinSourceGuardResult.status === 0 ||
    !missingKotlinSourceGuardResult.stderr.includes('Kotlin modern source guard')
  ) {
    throw new Error(
      `expected missing Kotlin source guard to fail:\n${missingKotlinSourceGuardResult.stdout}\n${missingKotlinSourceGuardResult.stderr}`
    );
  }

  const missingScalaSourceGuard = writeFixture(root, `
jobs:
  test:
    steps:
      - name: Check compiler smoke workflow coverage
        run: |
          yarn ci:check-modern-java-workflow:test
          yarn ci:check-modern-java-workflow
          yarn ci:check-kotlin-modern-source-guards:test
          yarn ci:check-kotlin-modern-source-guards
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/kotlin_alpha_smoke.sh
      - run: ./ci/scala_beta_smoke.sh
`);
  const missingScalaSourceGuardResult = runChecker(
    missingScalaSourceGuard.ciDir,
    missingScalaSourceGuard.workflowPath
  );
  if (
    missingScalaSourceGuardResult.status === 0 ||
    !missingScalaSourceGuardResult.stderr.includes('Scala modern source guard')
  ) {
    throw new Error(
      `expected missing Scala source guard to fail:\n${missingScalaSourceGuardResult.stdout}\n${missingScalaSourceGuardResult.stderr}`
    );
  }

  const compilerSmokeBeforeBuild = writeFixture(root, `
jobs:
  test:
    steps:
      - run: ./ci/kotlin_alpha_smoke.sh
      - name: Build release CLI runner
        timeout-minutes: 20
        run: ./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
      - name: Run modern Java compatibility tests
        run: ./node_modules/.bin/grunt --stack test-modern-java-runtime --grunt-ignore-compile-errors
      - name: Run core array compatibility smoke
        run: |
          ./node_modules/.bin/grunt --stack modern-ci-array-runout --grunt-ignore-compile-errors
          node build/release-cli/console/test_runner.js classes/test/ArrayOps --makefile
      - run: ./ci/scala_beta_smoke.sh
`);
  const compilerSmokeBeforeBuildResult = runChecker(compilerSmokeBeforeBuild.ciDir, compilerSmokeBeforeBuild.workflowPath);
  if (
    compilerSmokeBeforeBuildResult.status === 0 ||
    !compilerSmokeBeforeBuildResult.stderr.includes('before Kotlin/Scala compiler smokes')
  ) {
    throw new Error(
      `expected compiler smoke before runner build to fail:\n${compilerSmokeBeforeBuildResult.stdout}\n${compilerSmokeBeforeBuildResult.stderr}`
    );
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Modern Java workflow checker tests passed.');
