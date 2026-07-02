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

const deployStepMatch = workflow.match(
  /- name:\s+Deploy Pages[\s\S]*?uses:\s+actions\/deploy-pages@v5[\s\S]*?with:\s*\n([\s\S]*?)(?:\n\s{6}- name:|\n\s{2}[A-Za-z0-9_-]+:|\n?$)/
);
if (!deployStepMatch) {
  fail('Pages workflow must configure the Deploy Pages step.');
}

const deployInputs = deployStepMatch[1];
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

console.log('Pages workflow deployment settings checks passed.');
