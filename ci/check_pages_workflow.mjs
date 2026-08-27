import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const workflowPath = process.env.PAGES_WORKFLOW_PATH || path.join(repoRoot, '.github', 'workflows', 'pages.yml');

const workflow = fs.readFileSync(workflowPath, 'utf8');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!/concurrency:\s*\n\s+group:\s+pages-\$\{\{\s*github\.ref\s*\}\}\s*\n\s+cancel-in-progress:\s+true/.test(workflow)) {
  fail('Pages workflow must cancel superseded deployments for the same ref.');
}

if (!/uses:\s+actions\/deploy-pages@v5/.test(workflow)) {
  fail('Pages workflow must use actions/deploy-pages@v5.');
}

const expectedArtifactName = 'github-pages-${{ github.run_attempt }}';
const uploadStepMatch = workflow.match(
  /- name:\s+Upload Pages artifact[\s\S]*?uses:\s+actions\/upload-pages-artifact@v5[\s\S]*?with:\s*\n([\s\S]*?)(?:\n\s{6}- name:|\n\s{2}[A-Za-z0-9_-]+:|\n?$)/
);
if (!uploadStepMatch) {
  fail('Pages workflow must configure the Upload Pages artifact step.');
}

const uploadInputs = uploadStepMatch[1];
const uploadNameMatch = uploadInputs.match(/^\s+name:\s+(.+?)\s*$/m);
if (!uploadNameMatch || uploadNameMatch[1] !== expectedArtifactName) {
  fail('Pages upload artifact name must include github.run_attempt to support failed-job reruns.');
}

const deployStepMatch = workflow.match(
  /- name:\s+Deploy Pages[\s\S]*?uses:\s+actions\/deploy-pages@v5[\s\S]*?with:\s*\n([\s\S]*?)(?:\n\s{6}- name:|\n\s{2}[A-Za-z0-9_-]+:|\n?$)/
);
if (!deployStepMatch) {
  fail('Pages workflow must configure the Deploy Pages step.');
}

const deployInputs = deployStepMatch[1];
const deployArtifactMatch = deployInputs.match(/^\s+artifact_name:\s+(.+?)\s*$/m);
if (!deployArtifactMatch || deployArtifactMatch[1] !== expectedArtifactName) {
  fail('Pages deploy artifact_name must match the run-attempt-specific upload artifact name.');
}

const timeoutMatch = deployInputs.match(/^\s+timeout:\s+['"]?([0-9]+)['"]?/m);
if (!timeoutMatch) {
  fail('Pages deploy step must set a timeout input.');
}

const timeoutMs = Number(timeoutMatch[1]);
if (!Number.isFinite(timeoutMs) || timeoutMs !== 600000) {
  fail('Pages deploy timeout must stay at the deploy-pages maximum of 600000 ms.');
}

const intervalMatch = deployInputs.match(/^\s+reporting_interval:\s+['"]?([0-9]+)['"]?/m);
if (!intervalMatch) {
  fail('Pages deploy step must set a reporting_interval input.');
}

const reportingIntervalMs = Number(intervalMatch[1]);
if (!Number.isFinite(reportingIntervalMs) || reportingIntervalMs < 10000) {
  fail('Pages deploy reporting_interval must be at least 10000 ms.');
}

const chromiumInstallIndex = workflow.indexOf('- name: Install Chromium');
const buildIndex = workflow.indexOf('- name: Build Pages artifact');
const localSmokeIndex = workflow.indexOf('- name: Run local browser playground smoke');
const uploadIndex = workflow.indexOf('- name: Upload Pages artifact');
const deployIndex = workflow.indexOf('- name: Deploy Pages');

if (
  chromiumInstallIndex < 0 ||
  !/\.\/node_modules\/\.bin\/playwright\s+install\s+--with-deps\s+chromium\b/.test(workflow)
) {
  fail('Pages workflow must install Chromium for its local acceptance gate.');
}
if (
  localSmokeIndex < 0 ||
  !/- name:\s*Run local browser playground smoke\s*\n\s+run:\s*\.\/ci\/run_pages_browser_smoke\.sh\b/.test(workflow)
) {
  fail('Pages workflow must run the local Chromium acceptance gate.');
}
if (
  buildIndex < 0 ||
  uploadIndex < 0 ||
  deployIndex < 0 ||
  chromiumInstallIndex > localSmokeIndex ||
  buildIndex > localSmokeIndex ||
  localSmokeIndex > uploadIndex ||
  uploadIndex > deployIndex
) {
  fail('Pages workflow must pass the local Chromium gate after building and before upload/deploy.');
}

console.log('Pages workflow deployment settings checks passed.');
