import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = process.env.MODERN_JAVA_RUNTIME_SELF_TEST_REPO_ROOT ?
  path.resolve(process.env.MODERN_JAVA_RUNTIME_SELF_TEST_REPO_ROOT) :
  path.resolve(path.dirname(__filename), '..');
const releaseRoot = path.join(repoRoot, 'build', 'release-cli');
const vendorLink = path.join(releaseRoot, 'vendor');

function fail(message) {
  throw new Error(message);
}

const vendorStat = fs.lstatSync(vendorLink);
if (!vendorStat.isSymbolicLink() || fs.readlinkSync(vendorLink) !== '../../vendor') {
  fail('Transferred release CLI vendor link is not the verified relative link.');
}
if (path.resolve(path.dirname(vendorLink), fs.readlinkSync(vendorLink)) !== path.join(repoRoot, 'vendor')) {
  fail('Transferred release CLI vendor link escapes the checkout.');
}

const require = createRequire(import.meta.url);
const api = require(path.join(releaseRoot, 'src', 'doppiojvm.js'));
const JVM = require(path.join(releaseRoot, 'src', 'jvm.js')).default;
for (const exportName of ['Testing', 'VM', 'Heap', 'Debug']) {
  if (!(exportName in api)) {
    fail(`Transferred release CLI is missing ${exportName}.`);
  }
}
if (typeof JVM !== 'function' || !JVM.getJDKInfo().classpath.includes('lib/rt.jar')) {
  fail('Transferred release CLI JVM metadata did not load.');
}
for (const relativePath of ['jdk.json', 'lib/doppio.jar', 'lib/rt.jar']) {
  const target = path.join(vendorLink, 'java_home', ...relativePath.split('/'));
  if (!fs.statSync(target).isFile()) {
    fail(`Transferred release CLI is missing vendor/java_home/${relativePath}.`);
  }
}

const runnerPath = path.join(releaseRoot, 'console', 'runner.js');
const runnerResult = spawnSync(process.execPath, [runnerPath, '-help'], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: 30_000,
});
if (
  runnerResult.error ||
  runnerResult.status !== 0 ||
  !runnerResult.stdout.startsWith('Usage:')
) {
  fail(`Transferred release CLI runner self-test failed: ${runnerResult.error?.message || runnerResult.stderr}`);
}

console.log('Transferred Modern Java runtime inputs self-test passed.');
