'use strict';

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

// Invoke the JavaScript entry point with the current Node executable. Spawning
// node_modules/.bin/grunt.cmd directly is not portable to Windows.
const gruntExecutable = require.resolve('grunt-cli/bin/grunt');
const result = spawnSync(
  process.execPath,
  [gruntExecutable, 'dist'],
  {
    cwd: __dirname,
    stdio: 'inherit'
  }
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status === null ? 1 : result.status);
}

for (const relativePath of [
  'dist/doppio.jar',
  'dist/dev-cli/console/download_jdk.js',
  'dist/dev-cli/console/runner.js',
  'dist/fast-dev-cli/console/runner.js',
  'dist/release/doppio.js',
  'dist/release-cli/console/doppioh.js',
  'dist/release-cli/console/runner.js',
  'dist/release-cli/src/doppiojvm.js',
  'dist/typings/src/doppiojvm.d.ts'
]) {
  const absolutePath = path.join(__dirname, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile() || fs.statSync(absolutePath).size === 0) {
    throw new Error(`Package build did not produce ${relativePath}.`);
  }
}
