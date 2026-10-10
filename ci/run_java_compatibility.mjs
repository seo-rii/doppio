import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { treeDigest, validateLock } from './prepare_java_compatibility_toolchains.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), '..');
const sha256Pattern = /^[0-9a-f]{64}$/;
const supportedReleases = [21, 25];
const outputLimitBytes = 4 * 1024 * 1024;
const inputLimitBytes = 1024 * 1024;
const resultScope = 'Mandatory Java compatibility fixtures on selected hosts; this seed alone does not establish full Java SE inventory completion.';
const legacyResultScope = 'Mandatory CLI seed fixtures only; not full Java SE or browser compatibility.';

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashFile(filename) {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(filename, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const size = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (size === 0) return hash.digest('hex');
      hash.update(buffer.subarray(0, size));
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function uniqueNonempty(values, predicate, label) {
  requireCondition(Array.isArray(values) && values.length > 0 &&
    values.every(predicate) && new Set(values).size === values.length,
  `${label} must contain unique, nonempty valid entries.`);
}

export function validateManifest(manifest) {
  requireCondition(manifest?.schemaVersion === 1 && typeof manifest.profile === 'string' &&
    manifest.profile.length > 0, 'Invalid Java compatibility manifest schema/profile.');
  uniqueNonempty(manifest.releases, (value) => supportedReleases.includes(value), 'Manifest releases');
  requireCondition(JSON.stringify(manifest.releases) === JSON.stringify(supportedReleases),
    'The approved manifest must retain both Java 21 and Java 25; use --release for a focused run.');
  for (const key of ['compileMs', 'nativeMs', 'doppioMs']) {
    requireCondition(Number.isSafeInteger(manifest.timeouts?.[key]) &&
      manifest.timeouts[key] >= 1 && manifest.timeouts[key] <= 600_000,
    `Manifest timeout ${key} must be between 1 and 600000 ms.`);
  }
  const validId = (value) => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(value);
  requireCondition(Array.isArray(manifest.requirements), 'Manifest requirements must be an array.');
  uniqueNonempty(manifest.requirements.map((entry) => entry?.id), validId, 'Requirement IDs');
  const requirementIds = new Set(manifest.requirements.map((entry) => entry.id));
  for (const requirement of manifest.requirements) {
    requireCondition(validId(requirement.packageId),
      `Requirement ${requirement.id} must identify an owner package.`);
    requireCondition(Number.isInteger(requirement.introducedIn) && requirement.introducedIn > 0 &&
      requirement.introducedIn <= Math.max(...manifest.releases) && requirement.featureStatus === 'final',
    `Requirement ${requirement.id} must identify a final feature and its introduction release.`);
    for (const release of manifest.releases.filter((value) => value >= requirement.introducedIn)) {
      requireCondition(typeof requirement.specificationRefs?.[release] === 'string' &&
        requirement.specificationRefs[release].startsWith('https://'),
      `Requirement ${requirement.id} lacks its Java ${release} specification reference.`);
    }
  }
  requireCondition(Array.isArray(manifest.fixtures), 'Manifest fixtures must be an array.');
  uniqueNonempty(manifest.fixtures.map((entry) => entry?.id), validId, 'Fixture IDs');
  const sourceIdentities = new Set();
  for (const fixture of manifest.fixtures) {
    requireCondition(typeof fixture.source === 'string' && fixture.source.endsWith('.java') &&
      !path.posix.isAbsolute(fixture.source) && !fixture.source.includes('\\') &&
      fixture.source.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
    `Invalid source path for fixture ${fixture.id}.`);
    requireCondition(typeof fixture.mainClass === 'string' &&
      /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(fixture.mainClass),
    `Invalid mainClass for fixture ${fixture.id}.`);
    if (fixture.classGenerator !== undefined) {
      requireCondition(typeof fixture.classGenerator === 'string' &&
        /^ci\/[A-Za-z0-9_./-]+\.mjs$/.test(fixture.classGenerator) &&
        fixture.classGenerator.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
      `Invalid classGenerator path for fixture ${fixture.id}.`);
    }
    const identity = JSON.stringify([fixture.source, fixture.mainClass, fixture.arguments, fixture.standardInput || '']);
    requireCondition(!sourceIdentities.has(identity), `Duplicate fixture source/mainClass/inputs: ${identity}.`);
    sourceIdentities.add(identity);
    uniqueNonempty(fixture.releases, (value) => manifest.releases.includes(value), `${fixture.id} releases`);
    uniqueNonempty(fixture.requirementIds, (value) => requirementIds.has(value), `${fixture.id} requirement IDs`);
    uniqueNonempty(fixture.workloadIds, (value) => validId(value), `${fixture.id} workload IDs`);
    requireCondition(JSON.stringify(fixture.workloadIds) ===
      JSON.stringify(fixture.releases.map((release) => `W-JAVA${release}`)),
    `Fixture ${fixture.id} must map each selected release to its approved workload.`);
    uniqueNonempty(fixture.packageIds, validId, `${fixture.id} package IDs`);
    requireCondition(fixture.requirementIds.every((id) =>
      fixture.packageIds.includes(manifest.requirements.find((entry) => entry.id === id).packageId)),
    `Fixture ${fixture.id} must identify every requirement owner package.`);
    requireCondition(Array.isArray(fixture.arguments) && fixture.arguments.every((value) =>
      typeof value === 'string' && !value.includes('\0')), `Invalid arguments for fixture ${fixture.id}.`);
    requireCondition(fixture.standardInput === undefined || typeof fixture.standardInput === 'string' &&
      Buffer.byteLength(fixture.standardInput, 'utf8') <= inputLimitBytes,
    `Invalid or oversized standardInput for fixture ${fixture.id}.`);
    requireCondition(fixture.releases.every(release => fixture.requirementIds.every(id =>
      manifest.requirements.find(requirement => requirement.id === id).introducedIn <= release)),
    `Fixture ${fixture.id} cannot select a release before its required final features.`);
    requireCondition(fixture.comparison === 'successful-native-oracle-stdout-stderr' &&
      fixture.required !== false && fixture.skip !== true,
    `Fixture ${fixture.id} must require successful native/Doppio output comparison.`);
  }
  for (const release of manifest.releases) {
    requireCondition(manifest.fixtures.some((fixture) => fixture.releases.includes(release)),
      `Java ${release} has no required fixtures.`);
    for (const requirement of manifest.requirements.filter((entry) => entry.introducedIn <= release)) {
      requireCondition(manifest.fixtures.some((fixture) => fixture.releases.includes(release) &&
        fixture.requirementIds.includes(requirement.id)),
      `Requirement ${requirement.id} has no required Java ${release} fixture.`);
    }
  }
  return manifest;
}

export function validateToolchains(marker, lock, lockSha256, releases) {
  validateLock(lock);
  requireCondition(lock?.schemaVersion === 1 && Array.isArray(lock.toolchains) && lock.toolchains.length > 0,
    'Invalid Java toolchain lock.');
  uniqueNonempty(lock.toolchains.map((entry) => entry?.id),
    (id) => id === 'jdk21' || id === 'jdk25', 'Locked toolchain IDs');
  for (const entry of lock.toolchains) {
    requireCondition(entry.id === `jdk${entry.feature}` && supportedReleases.includes(entry.feature) &&
      typeof entry.vendor === 'string' && entry.vendor.length > 0 &&
      typeof entry.version === 'string' && /^\d+(?:\.\d+){0,3}$/.test(entry.version) &&
      Number(entry.version.split('.')[0]) === entry.feature && sha256Pattern.test(entry.archiveSha256 || ''),
    `Invalid locked toolchain ${entry.id}.`);
  }
  requireCondition(marker?.schemaVersion === 1 && marker.lockSha256 === lockSha256 &&
    sha256Pattern.test(lockSha256) && Array.isArray(marker.toolchains),
  'Toolchain marker does not match the checked-in lock.');
  uniqueNonempty(marker.toolchains.map((entry) => entry?.id),
    (id) => lock.toolchains.some((entry) => entry.id === id), 'Prepared toolchain IDs');
  for (const entry of marker.toolchains) {
    const locked = lock.toolchains.find((candidate) => candidate.id === entry.id);
    for (const key of ['feature', 'vendor', 'version', 'archiveSha256']) {
      requireCondition(entry[key] === locked[key], `Toolchain marker ${entry.id} has mismatched ${key}.`);
    }
    requireCondition(typeof entry.home === 'string' && path.isAbsolute(entry.home),
      `Toolchain ${entry.id} home must be absolute.`);
  }
  for (const release of releases) {
    requireCondition(marker.toolchains.some((entry) => entry.feature === release),
      `Prepared Java ${release} toolchain is missing.`);
  }
  return marker.toolchains.filter((entry) => releases.includes(entry.feature));
}

function controlledEnvironment() {
  const environment = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC' };
  for (const name of ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'CLASSPATH',
    'NODE_OPTIONS', 'NODE_PATH']) delete environment[name];
  return environment;
}

// Kill the process group as well as the direct child. A hung descendant must not
// keep the pipes open forever after its compiler or VM parent has been killed.
export function runCommand(command, args, { cwd, timeoutMs, maxOutputBytes = outputLimitBytes,
  standardInput = '', environment = controlledEnvironment() }) {
  requireCondition(Number.isSafeInteger(timeoutMs) && timeoutMs > 0, 'A positive process timeout is required.');
  requireCondition(typeof standardInput === 'string' && Buffer.byteLength(standardInput, 'utf8') <= inputLimitBytes,
    'Process standard input must be a UTF-8 string of at most 1048576 bytes.');
  return new Promise((resolve) => {
    const started = Date.now();
    const record = { command: [command, ...args], cwd, timeoutMs, status: 'running', exitCode: null,
      signal: null, timedOut: false, outputLimitExceeded: false, stdout: '', stderr: '', error: null };
    const chunks = { stdout: [], stderr: [] };
    let capturedBytes = 0;
    let finished = false;
    let timer;
    let drainTimer;
    const child = spawn(command, args, { cwd, env: environment, stdio: ['pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32', windowsHide: true });
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(drainTimer);
      for (const stream of ['stdout', 'stderr']) {
        const bytes = Buffer.concat(chunks[stream]);
        try {
          // Preserve a leading BOM and reject replacement-character decoding:
          // different malformed byte sequences must never compare as equal.
          record[stream] = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
        } catch {
          record[`${stream}Base64`] = bytes.toString('base64');
          record.error = `Invalid UTF-8 in subprocess ${stream}; original bytes recorded as base64.`;
        }
      }
      record.durationMs = Date.now() - started;
      record.status = record.timedOut ? 'timeout' : record.outputLimitExceeded ? 'output-limit' :
        record.error ? 'error' : record.exitCode === 0 && !record.signal ? 'passed' : 'failed';
      resolve(record);
    };
    const kill = () => {
      if (child.pid) {
        try {
          if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') record.error = error.message;
        }
      }
      if (!drainTimer) drainTimer = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        finish();
      }, 1000);
    };
    for (const stream of ['stdout', 'stderr']) {
      child[stream].on('data', (data) => {
        const remaining = Math.max(0, maxOutputBytes - capturedBytes);
        chunks[stream].push(data.subarray(0, remaining));
        capturedBytes += data.length;
        if (capturedBytes > maxOutputBytes) {
          record.outputLimitExceeded = true;
          kill();
        }
      });
    }
    child.on('error', (error) => { record.error = error.message; });
    child.stdin.on('error', (error) => {
      // Programs without input may close the pipe before it is written.
      if (error.code !== 'EPIPE') { record.error = error.message; kill(); }
    });
    child.stdin.end(standardInput, 'utf8');
    child.on('close', (code, signal) => {
      record.exitCode = code;
      record.signal = signal;
      finish();
    });
    timer = setTimeout(() => { record.timedOut = true; kill(); }, timeoutMs);
  });
}

function regularFiles(directory) {
  const result = [];
  function visit(candidate) {
    const stat = fs.lstatSync(candidate);
    requireCondition(!stat.isSymbolicLink(), `Unexpected symbolic link in input inventory: ${candidate}.`);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(candidate).sort()) visit(path.join(candidate, name));
    } else {
      requireCondition(stat.isFile(), `Expected a regular input file: ${candidate}.`);
      result.push(candidate);
    }
  }
  visit(directory);
  return result;
}

export function inspectClassFiles(directory, release, mainClass) {
  const files = regularFiles(directory).filter((filename) => filename.endsWith('.class'));
  requireCondition(files.length > 0, 'Compilation emitted no class files.');
  const records = files.map((filename) => {
    const data = fs.readFileSync(filename);
    requireCondition(data.length >= 8 && data.readUInt32BE(0) === 0xcafebabe,
      `Invalid class file: ${filename}.`);
    const minor = data.readUInt16BE(4);
    const major = data.readUInt16BE(6);
    requireCondition(major === release + 44 && minor === 0,
      `Wrong class version for Java ${release}: ${filename} is ${major}.${minor}.`);
    return { path: path.relative(directory, filename).split(path.sep).join('/'),
      sha256: sha256(data), size: data.length, major, minor };
  });
  requireCondition(records.some((record) => record.path === `${mainClass.replaceAll('.', '/')}.class`),
    `Compilation did not emit the main class ${mainClass}.`);
  return records;
}

export function runtimeSnapshot(repoRoot, runtimePath) {
  const runtimeRoot = path.resolve(path.dirname(runtimePath), '..');
  const guestHome = fs.realpathSync(path.join(runtimeRoot, 'vendor', 'java_home'));
  for (const required of [runtimePath, path.join(runtimeRoot, 'src', 'jvm.js'),
    path.join(guestHome, 'jdk.json'), path.join(guestHome, 'lib', 'rt.jar'),
    path.join(guestHome, 'lib', 'doppio.jar')]) {
    requireCondition(fs.statSync(required).isFile(), `Missing runtime input: ${required}.`);
  }
  const files = [];
  for (const [prefix, directory] of [['console', path.join(runtimeRoot, 'console')],
    ['src', path.join(runtimeRoot, 'src')], ['vendor/java_home', guestHome]]) {
    for (const filename of regularFiles(directory)) files.push({
      path: `${prefix}/${path.relative(directory, filename).split(path.sep).join('/')}`,
      sha256: hashFile(filename), size: fs.statSync(filename).size,
    });
  }
  for (const relativePath of ['build/modern-bootstrap-overlay/modern-bootstrap.jar', 'yarn.lock', 'package.json']) {
    const filename = path.join(repoRoot, relativePath);
    if (fs.existsSync(filename)) files.push({ path: `repository/${relativePath}`,
      sha256: hashFile(filename), size: fs.statSync(filename).size });
  }
  return { entrypoint: runtimePath, entrypointSha256: hashFile(runtimePath),
    snapshotSha256: sha256(JSON.stringify(files)), files };
}

function readRepositoryState(repoRoot) {
  const git = (args) => {
    const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', timeout: 10_000,
      maxBuffer: 1024 * 1024 });
    requireCondition(!result.error && result.status === 0, `Could not read Git provenance: ${result.stderr || result.error?.message}`);
    return result.stdout.trim();
  };
  return { commit: git(['rev-parse', '--verify', 'HEAD']),
    trackedDirty: git(['status', '--porcelain=v1', '--untracked-files=no']).length > 0 };
}

function sameClasses(before, after) {
  requireCondition(JSON.stringify(before) === JSON.stringify(after),
    'Compiled class bytes changed between compilation, native execution and Doppio execution.');
}

function successful(record) {
  return record.status === 'passed' && record.exitCode === 0 && !record.signal &&
    !record.timedOut && !record.outputLimitExceeded && !record.error;
}

function notRun(reason) { return { status: 'not-run', reason }; }

function inside(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function validateOutputPath(repoRoot, outputPath, inputPaths, runtimePath, toolchainsPath) {
  const buildRoot = path.join(repoRoot, 'build');
  requireCondition(outputPath.endsWith('.json') && inside(buildRoot, outputPath) && !inputPaths.includes(outputPath),
    'Results output must be a .json file under build/ and must not overwrite an input file.');
  let ancestor = path.dirname(outputPath);
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const realOutput = path.resolve(fs.realpathSync(ancestor), path.relative(ancestor, outputPath));
  const runtimeRoot = path.resolve(path.dirname(runtimePath), '..');
  const realDirectory = (directory) => fs.existsSync(directory) ? fs.realpathSync(directory) : directory;
  let toolchainHomes = [];
  try {
    const marker = JSON.parse(fs.readFileSync(toolchainsPath, 'utf8'));
    if (Array.isArray(marker?.toolchains)) toolchainHomes = marker.toolchains
      .map((entry) => entry?.home).filter((home) => typeof home === 'string' && path.isAbsolute(home));
  } catch {
    // A missing/malformed marker is recorded by normal preflight. The exact
    // marker path and existing non-ledger files remain protected independently.
  }
  requireCondition(inside(buildRoot, realOutput) &&
    !inside(realDirectory(runtimeRoot), realOutput) &&
    !toolchainHomes.some((home) => inside(realDirectory(home), realOutput)),
  'Results output must remain inside build/ and outside runtime/toolchain directories, including through links.');
  if (fs.existsSync(outputPath)) {
    requireCondition(fs.lstatSync(outputPath).isFile(), 'Results output must be a regular file, not a link.');
    const previous = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    requireCondition(previous?.schemaVersion === 1 && [resultScope, legacyResultScope].includes(previous.scope),
      'Refusing to overwrite a file that is not a Java compatibility result ledger.');
  }
}

export async function runCompatibility({ repoRoot = defaultRepoRoot,
  manifestPath = 'ci/java_compatibility_manifest.json',
  toolchainsPath = 'build/java-compatibility-toolchains/toolchains.json',
  lockPath = 'ci/java_compatibility_toolchains.lock.json',
  runtimePath = 'build/release-cli/console/runner.js',
  outputPath = 'build/java-compatibility-results.json', release,
  browser = false, createBrowserSession,
  execute = runCommand, repositoryState = readRepositoryState } = {}) {
  repoRoot = fs.realpathSync(repoRoot);
  [manifestPath, toolchainsPath, lockPath, runtimePath, outputPath] =
    [manifestPath, toolchainsPath, lockPath, runtimePath, outputPath].map((filename) => path.resolve(repoRoot, filename));
  validateOutputPath(repoRoot, outputPath, [manifestPath, toolchainsPath, lockPath, runtimePath],
    runtimePath, toolchainsPath);
  const ledger = { schemaVersion: 1, startedAt: new Date().toISOString(), status: 'failed',
    scope: resultScope,
    manifest: { path: manifestPath }, source: null, sourceAtEnd: null,
    host: { platform: process.platform, arch: process.arch, osRelease: os.release(), node: process.version,
      nodeExecutableSha256: hashFile(process.execPath) },
    runner: { path: scriptPath, sha256: hashFile(scriptPath) },
    toolchainLock: { path: lockPath }, toolchainMarker: { path: toolchainsPath },
    toolchains: [], runtime: null, selectedReleases: [], cases: [], errors: [],
    inputIntegrity: { status: 'not-verified' },
    browser: browser ? { status: 'not-run', required: true } :
      notRun('Chromium was not selected; use --browser to verify both required hosts.') };
  let workRoot;
  let initialSnapshot;
  let manifest;
  let browserSession;
  try {
    const manifestBytes = fs.readFileSync(manifestPath);
    ledger.manifest.sha256 = sha256(manifestBytes);
    manifest = validateManifest(JSON.parse(manifestBytes));
    requireCondition(release === undefined || (Number.isInteger(release) && manifest.releases.includes(release)),
      'Selected release is not present in the manifest.');
    ledger.selectedReleases = release === undefined ? manifest.releases : [release];
    ledger.manifest.profile = manifest.profile;
    ledger.manifest.requirements = manifest.requirements;
    ledger.manifest.approvedTarget = manifest.approvedTarget;
    ledger.manifest.inventory = manifest.inventory;
    for (const feature of ledger.selectedReleases) {
      for (const fixture of manifest.fixtures.filter((entry) => entry.releases.includes(feature))) {
        ledger.cases.push({ id: `${fixture.id}:jdk${feature}`, fixtureId: fixture.id, release: feature,
          requirementIds: fixture.requirementIds, workloadIds: fixture.workloadIds, packageIds: fixture.packageIds,
          source: { path: fixture.source }, mainClass: fixture.mainClass,
          standardInput: { bytes: Buffer.byteLength(fixture.standardInput || '', 'utf8'),
            sha256: sha256(Buffer.from(fixture.standardInput || '', 'utf8')) },
          ...(fixture.classGenerator ? { classGenerator: { path: fixture.classGenerator,
            execution: notRun('Compilation has not completed.') } } : {}),
          status: 'not-run', classes: [], compile: notRun('Preflight has not completed.'),
          native: notRun('Compilation has not completed.'), doppio: notRun('Compilation has not completed.'),
          browser: notRun(browser ? 'Compilation has not completed.' : 'Chromium was not selected.'),
          comparison: notRun('Execution has not completed.') });
      }
    }
    requireCondition(ledger.cases.length > 0, 'No required fixture/release pairs were selected.');
    ledger.source = repositoryState(repoRoot);
    requireCondition(/^[0-9a-f]{40}$/.test(ledger.source?.commit || ''), 'Invalid source commit provenance.');
    const lockBytes = fs.readFileSync(lockPath);
    const markerBytes = fs.readFileSync(toolchainsPath);
    ledger.toolchainLock.sha256 = sha256(lockBytes);
    ledger.toolchainMarker.sha256 = sha256(markerBytes);
    const lock = JSON.parse(lockBytes);
    const toolchains = validateToolchains(JSON.parse(markerBytes), lock,
      ledger.toolchainLock.sha256, ledger.selectedReleases);
    initialSnapshot = runtimeSnapshot(repoRoot, runtimePath);
    ledger.runtime = initialSnapshot;
    if (browser) {
      const factory = createBrowserSession || (await import('./java_compatibility_browser.mjs')).createBrowserSession;
      browserSession = await factory({ repoRoot,
        runtimePath: path.resolve(path.dirname(runtimePath), '..', '..', 'release', 'doppio.js') });
      ledger.browser.provenance = browserSession.provenance;
      ledger.browser.status = 'running';
    }
    for (const toolchain of toolchains) {
      const locked = lock.toolchains.find((entry) => entry.id === toolchain.id);
      const record = { ...toolchain, treeSha256: treeDigest(toolchain.home), executables: {}, probes: {} };
      ledger.toolchains.push(record);
      requireCondition(record.treeSha256 === locked.treeSha256,
        `Toolchain ${toolchain.id} extracted tree does not match lock.`);
      const realHome = fs.realpathSync(toolchain.home);
      for (const name of ['java', 'javac']) {
        const executable = path.join(toolchain.home, 'bin', name);
        const relative = path.relative(realHome, fs.realpathSync(executable));
        requireCondition(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) &&
          fs.statSync(executable).isFile(), `Toolchain executable escapes its home: ${executable}.`);
        fs.accessSync(executable, fs.constants.X_OK);
        record.executables[name] = { path: executable, sha256: hashFile(executable) };
        const probe = await execute(executable, ['-version'], { cwd: repoRoot, timeoutMs: 10_000 });
        record.probes[name] = probe;
        requireCondition(successful(probe), `Toolchain ${toolchain.id} ${name} version probe failed.`);
        const output = `${probe.stdout}\n${probe.stderr}`;
        const version = name === 'javac' ? /^javac\s+(\S+)/m.exec(output)?.[1] :
          /\bversion\s+"([^"]+)"/.exec(output)?.[1];
        requireCondition(version === toolchain.version, `Toolchain ${toolchain.id} ${name} version does not match lock.`);
      }
    }
    for (const result of ledger.cases) {
      for (const input of [result.source, result.classGenerator].filter(Boolean)) {
        const sourcePath = path.resolve(repoRoot, input.path);
        const realSource = fs.realpathSync(sourcePath);
        const relative = path.relative(repoRoot, realSource);
        requireCondition(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) &&
          fs.lstatSync(sourcePath).isFile(), `Fixture input is not a regular file inside the repository: ${sourcePath}.`);
        requireCondition(sourcePath !== outputPath, 'Results output must not overwrite a fixture input.');
        input.sha256 = hashFile(sourcePath);
      }
    }
    workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-java-compatibility-'));
    for (const result of ledger.cases) {
      const fixture = manifest.fixtures.find((entry) => entry.id === result.fixtureId);
      const toolchain = ledger.toolchains.find((entry) => entry.feature === result.release);
      const caseRoot = path.join(workRoot, `${result.fixtureId}-jdk${result.release}`);
      const classesPath = path.join(caseRoot, 'classes');
      const emptyPath = path.join(caseRoot, 'empty-classpath');
      fs.mkdirSync(classesPath, { recursive: true });
      fs.mkdirSync(emptyPath);
      result.status = 'failed';
      try {
        result.compile = await execute(toolchain.executables.javac.path,
          ['--release', String(result.release), '-encoding', 'UTF-8', '-proc:none',
            '-classpath', emptyPath, '-sourcepath', emptyPath, '-d', classesPath,
            path.join(repoRoot, fixture.source)], { cwd: caseRoot, timeoutMs: manifest.timeouts.compileMs });
        requireCondition(successful(result.compile), 'Compilation did not succeed.');
        if (result.classGenerator) {
          result.classGenerator.execution = await execute(process.execPath,
            [path.join(repoRoot, result.classGenerator.path), '--classes', classesPath, '--release', String(result.release)],
            { cwd: caseRoot, timeoutMs: manifest.timeouts.compileMs });
          requireCondition(successful(result.classGenerator.execution), 'Companion class generation did not succeed.');
        }
        result.classes = inspectClassFiles(classesPath, result.release, fixture.mainClass);
        result.native = await execute(toolchain.executables.java.path,
          ['-cp', classesPath, fixture.mainClass, ...fixture.arguments],
          { cwd: caseRoot, timeoutMs: manifest.timeouts.nativeMs, standardInput: fixture.standardInput || '' });
        sameClasses(result.classes, inspectClassFiles(classesPath, result.release, fixture.mainClass));
        result.doppio = await execute(process.execPath,
          ['--no-deprecation', runtimePath, '-cp', classesPath, fixture.mainClass, ...fixture.arguments],
          { cwd: caseRoot, timeoutMs: manifest.timeouts.doppioMs, standardInput: fixture.standardInput || '' });
        sameClasses(result.classes, inspectClassFiles(classesPath, result.release, fixture.mainClass));
        if (browser) {
          result.browser = await browserSession.execute({ classesPath, mainClass: fixture.mainClass,
            arguments: fixture.arguments, timeoutMs: manifest.timeouts.doppioMs,
            standardInput: fixture.standardInput || '' });
          sameClasses(result.classes, inspectClassFiles(classesPath, result.release, fixture.mainClass));
        }
        const normalize = (output) => output.replaceAll('\r\n', '\n');
        result.comparison = { status: 'failed', normalization: 'CRLF to LF only',
          nativeSucceeded: successful(result.native), doppioSucceeded: successful(result.doppio),
          stdoutEqual: normalize(result.native.stdout) === normalize(result.doppio.stdout),
          stderrEqual: normalize(result.native.stderr) === normalize(result.doppio.stderr) };
        if (browser) {
          result.comparison.browserSucceeded = successful(result.browser);
          result.comparison.browserStdoutEqual = normalize(result.native.stdout) === normalize(result.browser.stdout);
          result.comparison.browserStderrEqual = normalize(result.native.stderr) === normalize(result.browser.stderr);
        }
        requireCondition(result.comparison.nativeSucceeded && result.comparison.doppioSucceeded &&
          result.comparison.stdoutEqual && result.comparison.stderrEqual,
        'Native and Doppio must both exit successfully with matching stdout and stderr.');
        requireCondition(!browser || result.comparison.browserSucceeded && result.comparison.browserStdoutEqual &&
          result.comparison.browserStderrEqual,
        'Chromium must exit successfully with stdout and stderr matching native Java.');
        result.comparison.status = 'passed';
        result.status = 'passed';
      } catch (error) {
        result.error = error.message;
      }
    }
    requireCondition(runtimeSnapshot(repoRoot, runtimePath).snapshotSha256 === initialSnapshot.snapshotSha256,
      'Doppio runtime inputs changed during comparison.');
    requireCondition(hashFile(manifestPath) === ledger.manifest.sha256 &&
      hashFile(lockPath) === ledger.toolchainLock.sha256 && hashFile(toolchainsPath) === ledger.toolchainMarker.sha256,
    'Compatibility manifest or toolchain provenance changed during comparison.');
    for (const result of ledger.cases) {
      for (const input of [result.source, result.classGenerator].filter(Boolean)) {
        requireCondition(hashFile(path.join(repoRoot, input.path)) === input.sha256,
          `Fixture source or generator changed during comparison: ${input.path}.`);
      }
    }
    for (const toolchain of ledger.toolchains) {
      requireCondition(treeDigest(toolchain.home) === toolchain.treeSha256,
        `Toolchain ${toolchain.id} extracted tree changed during comparison.`);
      for (const executable of Object.values(toolchain.executables)) requireCondition(hashFile(executable.path) === executable.sha256,
        `Toolchain executable changed during comparison: ${executable.path}.`);
    }
    if (browserSession) await browserSession.verifyIntegrity();
    ledger.sourceAtEnd = repositoryState(repoRoot);
    requireCondition(ledger.sourceAtEnd.commit === ledger.source.commit &&
      ledger.sourceAtEnd.trackedDirty === ledger.source.trackedDirty,
    'Git commit or tracked working-tree state changed during comparison.');
    ledger.inputIntegrity.status = 'passed';
  } catch (error) {
    ledger.errors.push(error.message);
  } finally {
    if (browserSession) {
      try {
        await browserSession.close();
      } catch (error) {
        ledger.errors.push(`Chromium comparison cleanup failed: ${error.message}`);
      }
    }
    if (workRoot) {
      try {
        fs.rmSync(workRoot, { recursive: true, force: true });
      } catch (error) {
        ledger.errors.push(`Temporary comparison output cleanup failed: ${error.message}`);
      }
    }
  }
  if (ledger.errors.length > 0) {
    ledger.inputIntegrity.status = 'failed';
    for (const result of ledger.cases.filter((entry) => entry.status === 'passed')) {
      result.status = 'failed';
      result.error = `Matching outputs cannot be credited because run integrity failed: ${ledger.errors.join('; ')}`;
    }
  }
  ledger.summary = { required: ledger.cases.length,
    passed: ledger.cases.filter((entry) => entry.status === 'passed').length,
    failed: ledger.cases.filter((entry) => entry.status === 'failed').length,
    notRun: ledger.cases.filter((entry) => entry.status === 'not-run').length };
  ledger.status = ledger.errors.length === 0 && ledger.summary.required > 0 &&
    ledger.summary.passed === ledger.summary.required ? 'passed' : 'failed';
  if (browser) {
    const browserPassed = (entry) => ledger.errors.length === 0 &&
      entry.comparison.nativeSucceeded && entry.comparison.browserSucceeded &&
      entry.comparison.browserStdoutEqual && entry.comparison.browserStderrEqual;
    ledger.browser.summary = { required: ledger.cases.length,
      passed: ledger.cases.filter(browserPassed).length,
      failed: ledger.cases.filter(entry => entry.browser.status !== 'not-run' &&
        !browserPassed(entry)).length,
      notRun: ledger.cases.filter(entry => entry.browser.status === 'not-run').length };
    ledger.browser.status = ledger.browser.summary.passed === ledger.browser.summary.required ? 'passed' : 'failed';
  }
  ledger.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryOutput = `${outputPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryOutput, `${JSON.stringify(ledger, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporaryOutput, outputPath);
  } finally {
    if (fs.existsSync(temporaryOutput)) fs.unlinkSync(temporaryOutput);
  }
  return ledger;
}

export function parseOptions(argv) {
  const options = {};
  const names = { '--manifest': 'manifestPath', '--toolchains': 'toolchainsPath', '--lock': 'lockPath',
    '--runtime': 'runtimePath', '--output': 'outputPath', '--release': 'release' };
  for (let index = 0; index < argv.length;) {
    if (argv[index] === '--browser') {
      requireCondition(!options.browser, 'Duplicate --browser option.');
      options.browser = true;
      index++;
      continue;
    }
    const name = names[argv[index]];
    requireCondition(name && argv[index + 1] && !argv[index + 1].startsWith('--') && !(name in options),
      `Invalid, missing or duplicate argument near ${argv[index]}.`);
    options[name] = argv[index + 1];
    index += 2;
  }
  if ('release' in options) {
    requireCondition(/^(21|25)$/.test(options.release), '--release must be 21 or 25.');
    options.release = Number(options.release);
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    const options = parseOptions(process.argv.slice(2));
    const ledger = await runCompatibility(options);
    console.log(`Java compatibility selected-host cases: ${ledger.summary.passed}/${ledger.summary.required} passed; ` +
      `${ledger.summary.failed} failed, ${ledger.summary.notRun} not run. Chromium: ${ledger.browser.status}.`);
    console.log(`Result: ${path.resolve(defaultRepoRoot, options.outputPath || 'build/java-compatibility-results.json')}`);
    for (const error of ledger.errors) console.error(error);
    for (const entry of ledger.cases.filter((result) => result.error)) console.error(`${entry.id}: ${entry.error}`);
    process.exitCode = ledger.status === 'passed' ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
