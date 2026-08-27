'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const packageRoot = __dirname;
const vendorRoot = path.join(packageRoot, 'vendor');
const javaHome = path.join(vendorRoot, 'java_home');

function validateFixture(fixturePath) {
  if (process.env.DOPPIO_INSTALL_TEST_ONLY !== '1' || process.env.NODE_ENV !== 'test') {
    throw new Error('DOPPIO_INSTALL_TEST_JDK requires DOPPIO_INSTALL_TEST_ONLY=1 and NODE_ENV=test.');
  }
  if (!path.isAbsolute(fixturePath)) {
    throw new Error('DOPPIO_INSTALL_TEST_JDK must be an absolute path.');
  }
  for (const relativePath of ['.doppio-install-fixture', 'jdk.json', path.join('lib', 'rt.jar')]) {
    const candidate = path.join(fixturePath, relativePath);
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      throw new Error(`DOPPIO_INSTALL_TEST_JDK is missing ${relativePath}.`);
    }
  }
  if (fs.readFileSync(path.join(fixturePath, '.doppio-install-fixture'), 'utf8') !== 'doppio-install-test-fixture-v1\n') {
    throw new Error('DOPPIO_INSTALL_TEST_JDK has an invalid fixture marker.');
  }
}

function provisionJavaHome() {
  const fixturePath = process.env.DOPPIO_INSTALL_TEST_JDK;
  if (fixturePath !== undefined) {
    validateFixture(fixturePath);
    fs.mkdirSync(vendorRoot, {recursive: true});
    fs.rmSync(javaHome, {recursive: true, force: true});
    fs.cpSync(fixturePath, javaHome, {recursive: true});
    return;
  }

  const downloadScript = path.join(packageRoot, 'dist', 'dev-cli', 'console', 'download_jdk.js');
  const result = childProcess.spawnSync(process.execPath, [downloadScript], {
    cwd: packageRoot,
    stdio: 'inherit'
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`JDK downloader exited with code ${result.status === null ? 1 : result.status}.`);
  }
}

function ensureVendorLink(linkPath) {
  let existing = null;
  try {
    existing = fs.lstatSync(linkPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (existing !== null) {
    if (!existing.isSymbolicLink()) {
      throw new Error(`Refusing to replace non-link package path ${linkPath}.`);
    }
    try {
      if (fs.realpathSync(linkPath) === fs.realpathSync(vendorRoot)) {
        return;
      }
    } catch (_error) {
      // Replace a broken or stale package-owned link below.
    }
    fs.unlinkSync(linkPath);
  }

  fs.symlinkSync(vendorRoot, linkPath, 'junction');
}

function install() {
  // Repository builds already have vendor/ at the root. The force flag is
  // retained for developers who explicitly want to exercise the lifecycle.
  if (fs.existsSync(path.join(packageRoot, '.git')) && !process.argv.includes('force')) {
    return;
  }

  provisionJavaHome();

  const distributedJar = path.join(packageRoot, 'dist', 'doppio.jar');
  if (!fs.existsSync(distributedJar) || !fs.statSync(distributedJar).isFile()) {
    throw new Error('The package is missing dist/doppio.jar.');
  }
  fs.mkdirSync(path.join(javaHome, 'lib'), {recursive: true});
  fs.copyFileSync(distributedJar, path.join(javaHome, 'lib', 'doppio.jar'));

  for (const buildType of ['dev', 'release', 'fast-dev']) {
    for (const buildTarget of ['-cli', '']) {
      const outputRoot = path.join(packageRoot, 'dist', `${buildType}${buildTarget}`);
      if (!fs.existsSync(outputRoot) || !fs.statSync(outputRoot).isDirectory()) {
        throw new Error(`The package is missing ${path.relative(packageRoot, outputRoot)}.`);
      }
      ensureVendorLink(path.join(outputRoot, 'vendor'));
    }
  }
}

install();
