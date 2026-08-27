import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const checkerPath = path.join(path.dirname(__filename), 'check_pages_workflow.mjs');

function writeWorkflow(root, workflowText) {
  const workflowPath = path.join(root, 'pages.yml');
  fs.writeFileSync(workflowPath, workflowText);
  return workflowPath;
}

function runChecker(workflowPath) {
  return spawnSync(process.execPath, [checkerPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PAGES_WORKFLOW_PATH: workflowPath,
    },
  });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-pages-workflow-'));
try {
  const complete = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const completeResult = runChecker(complete);
  if (completeResult.status !== 0) {
    throw new Error(`expected complete workflow to pass:\n${completeResult.stderr}`);
  }

  const missingTimeout = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          reporting_interval: '10000'
`);
  const missingTimeoutResult = runChecker(missingTimeout);
  if (missingTimeoutResult.status === 0 || !missingTimeoutResult.stderr.includes('timeout input')) {
    throw new Error(`expected missing timeout to fail:\n${missingTimeoutResult.stdout}\n${missingTimeoutResult.stderr}`);
  }

  const lowTimeout = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '300000'
          reporting_interval: '10000'
`);
  const lowTimeoutResult = runChecker(lowTimeout);
  if (lowTimeoutResult.status === 0 || !lowTimeoutResult.stderr.includes('maximum of 600000')) {
    throw new Error(`expected low timeout to fail:\n${lowTimeoutResult.stdout}\n${lowTimeoutResult.stderr}`);
  }

  const highTimeout = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '1200000'
          reporting_interval: '10000'
`);
  const highTimeoutResult = runChecker(highTimeout);
  if (highTimeoutResult.status === 0 || !highTimeoutResult.stderr.includes('maximum of 600000')) {
    throw new Error(`expected high timeout to fail:\n${highTimeoutResult.stdout}\n${highTimeoutResult.stderr}`);
  }

  const wrongAction = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v4
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const wrongActionResult = runChecker(wrongAction);
  if (wrongActionResult.status === 0 || !wrongActionResult.stderr.includes('deploy-pages@v5')) {
    throw new Error(`expected wrong deploy action to fail:\n${wrongActionResult.stdout}\n${wrongActionResult.stderr}`);
  }

  const inlineCommentVersions = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4 # uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v4 # uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const inlineCommentVersionsResult = runChecker(inlineCommentVersions);
  if (
    inlineCommentVersionsResult.status === 0 ||
    !inlineCommentVersionsResult.stderr.includes('deploy-pages@v5')
  ) {
    throw new Error(
      `expected inline-comment action versions to fail:\n${inlineCommentVersionsResult.stdout}\n${inlineCommentVersionsResult.stderr}`
    );
  }

  const fullLineCommentVersions = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        # uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v4
        # uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const fullLineCommentVersionsResult = runChecker(fullLineCommentVersions);
  if (
    fullLineCommentVersionsResult.status === 0 ||
    !fullLineCommentVersionsResult.stderr.includes('deploy-pages@v5')
  ) {
    throw new Error(
      `expected full-line-comment action versions to fail:\n${fullLineCommentVersionsResult.stdout}\n${fullLineCommentVersionsResult.stderr}`
    );
  }

  const blockScalarDeployVersion = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v4
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
      - name: Disabled deploy text
        if: false
        run: |
          uses: actions/deploy-pages@v5
          with:
            artifact_name: github-pages-\${{ github.run_attempt }}
            timeout: '600000'
            reporting_interval: '10000'
`);
  const blockScalarDeployVersionResult = runChecker(blockScalarDeployVersion);
  if (
    blockScalarDeployVersionResult.status === 0 ||
    !blockScalarDeployVersionResult.stderr.includes('deploy-pages@v5')
  ) {
    throw new Error(
      `expected block-scalar deploy version to fail:\n${blockScalarDeployVersionResult.stdout}\n${blockScalarDeployVersionResult.stderr}`
    );
  }

  const blockScalarUploadVersion = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Disabled upload text
        if: false
        run: |
          uses: actions/upload-pages-artifact@v5
          with:
            name: github-pages-\${{ github.run_attempt }}
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const blockScalarUploadVersionResult = runChecker(blockScalarUploadVersion);
  if (
    blockScalarUploadVersionResult.status === 0 ||
    !blockScalarUploadVersionResult.stderr.includes('upload-pages-artifact@v5')
  ) {
    throw new Error(
      `expected block-scalar upload version to fail:\n${blockScalarUploadVersionResult.stdout}\n${blockScalarUploadVersionResult.stderr}`
    );
  }

  const backtickCommentChromiumInstall = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: echo \\\` # ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const backtickCommentChromiumInstallResult = runChecker(backtickCommentChromiumInstall);
  if (
    backtickCommentChromiumInstallResult.status === 0 ||
    !backtickCommentChromiumInstallResult.stderr.includes('install Chromium')
  ) {
    throw new Error(
      `expected backtick-comment Chromium install to fail:\n${backtickCommentChromiumInstallResult.stdout}\n${backtickCommentChromiumInstallResult.stderr}`
    );
  }

  const missingAttemptArtifactName = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          timeout: '600000'
          reporting_interval: '10000'
`);
  const missingAttemptArtifactNameResult = runChecker(missingAttemptArtifactName);
  if (
    missingAttemptArtifactNameResult.status === 0 ||
    !missingAttemptArtifactNameResult.stderr.includes('github.run_attempt')
  ) {
    throw new Error(
      `expected missing run-attempt artifact name to fail:\n${missingAttemptArtifactNameResult.stdout}\n${missingAttemptArtifactNameResult.stderr}`
    );
  }

  const mismatchedDeployArtifactName = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages
          timeout: '600000'
          reporting_interval: '10000'
`);
  const mismatchedDeployArtifactNameResult = runChecker(mismatchedDeployArtifactName);
  if (
    mismatchedDeployArtifactNameResult.status === 0 ||
    !mismatchedDeployArtifactNameResult.stderr.includes('artifact_name')
  ) {
    throw new Error(
      `expected mismatched deploy artifact name to fail:\n${mismatchedDeployArtifactNameResult.stdout}\n${mismatchedDeployArtifactNameResult.stderr}`
    );
  }

  const missingLocalSmoke = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const missingLocalSmokeResult = runChecker(missingLocalSmoke);
  if (
    missingLocalSmokeResult.status === 0 ||
    !missingLocalSmokeResult.stderr.includes('local Chromium acceptance gate')
  ) {
    throw new Error(
      `expected missing local browser smoke to fail:\n${missingLocalSmokeResult.stdout}\n${missingLocalSmokeResult.stderr}`
    );
  }

  const lateLocalSmoke = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: github-pages-\${{ github.run_attempt }}
          path: docs
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-\${{ github.run_attempt }}
          timeout: '600000'
          reporting_interval: '10000'
`);
  const lateLocalSmokeResult = runChecker(lateLocalSmoke);
  if (
    lateLocalSmokeResult.status === 0 ||
    !lateLocalSmokeResult.stderr.includes('before upload/deploy')
  ) {
    throw new Error(
      `expected late local browser smoke to fail:\n${lateLocalSmokeResult.stdout}\n${lateLocalSmokeResult.stderr}`
    );
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Pages workflow checker tests passed.');
