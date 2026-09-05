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

function expectFailure(root, workflowText, expectedMessage, label) {
  const result = runChecker(writeWorkflow(root, workflowText));
  if (result.status === 0 || !result.stderr.includes(expectedMessage)) {
    throw new Error(
      `expected ${label} to fail with ${JSON.stringify(expectedMessage)}:\n${result.stdout}\n${result.stderr}`
    );
  }
}

const completeWorkflow = `
permissions: {}

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact_name: \${{ steps.pages-artifact.outputs.name }}
    permissions:
      contents: read
      pages: read
    steps:
      - name: Install Chromium
        run: ./node_modules/.bin/playwright install --with-deps chromium
      - name: Build Pages artifact
        run: ./ci/build_pages.sh
      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
      - name: Define Pages artifact name
        id: pages-artifact
        run: echo "name=github-pages-\${{ github.run_attempt }}" >> "$GITHUB_OUTPUT"
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: \${{ steps.pages-artifact.outputs.name }}
          path: docs

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    outputs:
      page_url: \${{ steps.deployment.outputs.page_url }}
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          artifact_name: \${{ needs.build.outputs.artifact_name }}
          timeout: '600000'
          reporting_interval: '10000'

  browser-smoke:
    needs: deploy
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Run browser playground smoke
        env:
          DOPPIO_PAGES_URL: \${{ needs.deploy.outputs.page_url }}
        run: node ci/run_pages_browser_smoke_with_retry.mjs
`;

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-pages-workflow-'));
try {
  const completeResult = runChecker(writeWorkflow(root, completeWorkflow));
  if (completeResult.status !== 0) {
    throw new Error(`expected complete workflow to pass:\n${completeResult.stderr}`);
  }

  expectFailure(
    root,
    completeWorkflow.replace('group: pages\n', 'group: pages-\${{ github.ref }}\n'),
    'repository-wide pages group',
    'ref-scoped concurrency'
  );
  expectFailure(
    root,
    completeWorkflow.replace('cancel-in-progress: false', 'cancel-in-progress: true'),
    'must not cancel an active deployment',
    'cancelling concurrency'
  );
  expectFailure(
    root,
    completeWorkflow
      .replace('group: pages\n', 'group: pages-feature\n')
      .replace(
        '      - name: Define Pages artifact name',
        `      - name: Disabled concurrency text
        if: false
        run: |
          concurrency:
            group: pages
            cancel-in-progress: false
      - name: Define Pages artifact name`
      ),
    'repository-wide pages group',
    'nested concurrency text'
  );

  expectFailure(
    root,
    completeWorkflow.replace(
      'permissions: {}',
      `permissions:
  contents: read
  pages: write
  id-token: write`
    ),
    'deployment permissions at workflow scope',
    'broad workflow authority'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      `    permissions:
      contents: read
      pages: read`,
      `    permissions:
      contents: read
      pages: write
      id-token: write`
    ),
    'build permissions',
    'privileged build job'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      `    permissions:
      pages: write
      id-token: write`,
      `    permissions:
      pages: write`
    ),
    'deploy permissions',
    'deploy job without OIDC'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      `  browser-smoke:
    needs: deploy
    runs-on: ubuntu-latest
    permissions:
      contents: read`,
      `  browser-smoke:
    needs: deploy
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write`
    ),
    'browser-smoke permissions',
    'privileged browser smoke'
  );

  expectFailure(
    root,
    completeWorkflow.replace(
      'artifact_name: \${{ steps.pages-artifact.outputs.name }}',
      'artifact_name: github-pages-\${{ github.run_attempt }}'
    ),
    'exact uploaded artifact name',
    'unbound build artifact output'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      'run: echo "name=github-pages-\${{ github.run_attempt }}" >> "$GITHUB_OUTPUT"',
      'run: echo "name=github-pages" >> "$GITHUB_OUTPUT"'
    ),
    'derive its artifact name once',
    'artifact name without run attempt'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      '          name: \${{ steps.pages-artifact.outputs.name }}',
      '          name: github-pages-\${{ github.run_attempt }}'
    ),
    'build artifact-name step output',
    'upload name that bypasses its step output'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      '          artifact_name: \${{ needs.build.outputs.artifact_name }}',
      '          artifact_name: github-pages-\${{ github.run_attempt }}'
    ),
    'exact build job artifact output',
    'deploy retry that recomputes run attempt'
  );

  const uploadStep = `      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          name: \${{ steps.pages-artifact.outputs.name }}
          path: docs
`;
  expectFailure(
    root,
    completeWorkflow
      .replace(uploadStep, '')
      .replace('      - name: Deploy Pages', `${uploadStep}      - name: Deploy Pages`),
    'upload-pages-artifact@v5 in the build job',
    'upload outside the build job'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      '    steps:\n      - name: Deploy Pages',
      `    steps:
      - name: Run repository code
        run: node ci/check_pages_workflow.mjs
      - name: Deploy Pages`
    ),
    'dedicated deploy-pages action',
    'repository code in deploy job'
  );

  expectFailure(
    root,
    completeWorkflow.replace("          timeout: '600000'\n", ''),
    'timeout input',
    'missing deploy timeout'
  );
  expectFailure(
    root,
    completeWorkflow.replace("timeout: '600000'", "timeout: '300000'"),
    'maximum of 600000',
    'low deploy timeout'
  );
  expectFailure(
    root,
    completeWorkflow.replace("timeout: '600000'", "timeout: '1200000'"),
    'maximum of 600000',
    'high deploy timeout'
  );
  expectFailure(
    root,
    completeWorkflow.replace("          reporting_interval: '10000'\n", ''),
    'reporting_interval input',
    'missing reporting interval'
  );
  expectFailure(
    root,
    completeWorkflow.replace("reporting_interval: '10000'", "reporting_interval: '5000'"),
    'at least 10000',
    'low reporting interval'
  );

  expectFailure(
    root,
    completeWorkflow.replace('uses: actions/deploy-pages@v5', 'uses: actions/deploy-pages@v4'),
    'deploy-pages@v5',
    'wrong deploy action'
  );
  expectFailure(
    root,
    completeWorkflow
      .replace(
        'uses: actions/upload-pages-artifact@v5',
        'uses: actions/upload-pages-artifact@v4 # uses: actions/upload-pages-artifact@v5'
      )
      .replace(
        'uses: actions/deploy-pages@v5',
        'uses: actions/deploy-pages@v4 # uses: actions/deploy-pages@v5'
      ),
    'upload-pages-artifact@v5',
    'inline-comment action versions'
  );
  expectFailure(
    root,
    completeWorkflow
      .replace(
        '        uses: actions/upload-pages-artifact@v5',
        `        uses: actions/upload-pages-artifact@v4
        # uses: actions/upload-pages-artifact@v5`
      )
      .replace(
        '        uses: actions/deploy-pages@v5',
        `        uses: actions/deploy-pages@v4
        # uses: actions/deploy-pages@v5`
      ),
    'upload-pages-artifact@v5',
    'full-line-comment action versions'
  );
  expectFailure(
    root,
    completeWorkflow
      .replace('uses: actions/deploy-pages@v5', 'uses: actions/deploy-pages@v4')
      .replace(
        '      - name: Define Pages artifact name',
        `      - name: Disabled deploy text
        if: false
        run: |
          uses: actions/deploy-pages@v5
          with:
            artifact_name: \${{ needs.build.outputs.artifact_name }}
      - name: Define Pages artifact name`
      ),
    'deploy-pages@v5',
    'block-scalar deploy version'
  );
  expectFailure(
    root,
    completeWorkflow
      .replace('uses: actions/upload-pages-artifact@v5', 'uses: actions/upload-pages-artifact@v4')
      .replace(
        '      - name: Define Pages artifact name',
        `      - name: Disabled upload text
        if: false
        run: |
          uses: actions/upload-pages-artifact@v5
          with:
            name: \${{ steps.pages-artifact.outputs.name }}
      - name: Define Pages artifact name`
      ),
    'upload-pages-artifact@v5',
    'block-scalar upload version'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      'run: ./node_modules/.bin/playwright install --with-deps chromium',
      'run: echo \\` # ./node_modules/.bin/playwright install --with-deps chromium'
    ),
    'install Chromium',
    'backtick-comment Chromium install'
  );

  expectFailure(
    root,
    completeWorkflow.replace(
      'page_url: \${{ steps.deployment.outputs.page_url }}',
      'page_url: \${{ steps.missing.outputs.page_url }}'
    ),
    'expose the deployment page_url',
    'wrong deploy output'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      'DOPPIO_PAGES_URL: \${{ needs.deploy.outputs.page_url }}',
      'DOPPIO_PAGES_URL: \${{ needs.build.outputs.page_url }}'
    ),
    'consume only the deploy job page_url',
    'wrong browser output source'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      'run: node ci/run_pages_browser_smoke_with_retry.mjs',
      'run: yarn site:browser-test'
    ),
    'bounded retry runner',
    'browser smoke without bounded retry'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      'run: node ci/run_pages_browser_smoke_with_retry.mjs',
      'run: node ci/run_pages_browser_smoke_with_retry.mjs || yarn site:browser-test'
    ),
    'bounded retry runner',
    'browser smoke retry bypass'
  );
  expectFailure(
    root,
    completeWorkflow.replace(
      '        run: node ci/run_pages_browser_smoke_with_retry.mjs',
      `        uses: actions/upload-pages-artifact@v5
        run: node ci/run_pages_browser_smoke_with_retry.mjs`
    ),
    'consume only the deploy job page_url',
    'deployment action in browser smoke'
  );

  const localSmokeStep = `      - name: Run local browser playground smoke
        run: ./ci/run_pages_browser_smoke.sh
`;
  expectFailure(
    root,
    completeWorkflow.replace(localSmokeStep, ''),
    'local Chromium acceptance gate',
    'missing local smoke'
  );
  expectFailure(
    root,
    completeWorkflow
      .replace(localSmokeStep, '')
      .replace(uploadStep, `${uploadStep}${localSmokeStep}`),
    'local Chromium gate before naming and uploading',
    'late local smoke'
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Pages workflow checker tests passed.');
