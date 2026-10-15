import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
// These aggregate limits cover the full launch inventory. Each individual
// native/guest execution retains its original 30-second deadline.
const suiteMinutes = {cli: 30, jar: 70};
const summary = {schemaVersion: 1, status: 'running', startedAt: new Date().toISOString(), suites: []};
for (const name of ['cli', 'jar']) {
  const result = spawnSync(process.execPath, [path.join(import.meta.dirname, `${name}_launch_test.mjs`), '--browser'],
    {cwd: repoRoot, stdio: 'inherit', timeout: suiteMinutes[name] * 60 * 1000});
  summary.suites.push({name, status: result.status === 0 && !result.error ? 'passed' : 'failed',
    exitCode: result.status, signal: result.signal, error: result.error?.message ?? null,
    timeoutMs: suiteMinutes[name] * 60 * 1000, results: `build/${name}-foundations-results.json`});
}
summary.status = summary.suites.every(suite => suite.status === 'passed') ? 'passed' : 'failed';
summary.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(repoRoot, 'build/runtime-foundations-summary.json'),
  JSON.stringify(summary, null, 2) + '\n', {mode: 0o600});
process.exitCode = summary.status === 'passed' ? 0 : 1;
