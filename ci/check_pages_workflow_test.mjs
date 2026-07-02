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
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          timeout: '1200000'
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
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          reporting_interval: '10000'
`);
  const missingTimeoutResult = runChecker(missingTimeout);
  if (missingTimeoutResult.status === 0 || !missingTimeoutResult.stderr.includes('timeout input')) {
    throw new Error(`expected missing timeout to fail:\n${missingTimeoutResult.stdout}\n${missingTimeoutResult.stderr}`);
  }

  const shortTimeout = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v5
        with:
          timeout: '600000'
          reporting_interval: '10000'
`);
  const shortTimeoutResult = runChecker(shortTimeout);
  if (shortTimeoutResult.status === 0 || !shortTimeoutResult.stderr.includes('at least 1200000')) {
    throw new Error(`expected short timeout to fail:\n${shortTimeoutResult.stdout}\n${shortTimeoutResult.stderr}`);
  }

  const wrongAction = writeWorkflow(root, `
concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    steps:
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v4
        with:
          timeout: '1200000'
          reporting_interval: '10000'
`);
  const wrongActionResult = runChecker(wrongAction);
  if (wrongActionResult.status === 0 || !wrongActionResult.stderr.includes('deploy-pages@v5')) {
    throw new Error(`expected wrong deploy action to fail:\n${wrongActionResult.stdout}\n${wrongActionResult.stderr}`);
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Pages workflow checker tests passed.');
