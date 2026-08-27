import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(__filename), '..');
const provenancePath = '.doppio-ci/provenance.json';
const requiredArchivePaths = [
  'build/modern-bootstrap-overlay/modern-bootstrap.jar',
  'build/release-cli/console/runner.js',
  'build/release-cli/src/jvm.js',
  'vendor/java_home/jdk.json',
  'vendor/java_home/lib/doppio.jar',
  'vendor/java_home/lib/rt.jar',
];

function fail(message) {
  throw new Error(message);
}

function parseOptions(argv) {
  const command = argv[0];
  const options = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith('--') || value === undefined || value.startsWith('--')) {
      fail(`Invalid argument near ${name || '<end>'}.`);
    }
    if (options.has(name)) {
      fail(`Duplicate option: ${name}`);
    }
    options.set(name, value);
  }
  return { command, options };
}

function option(options, name, required = true) {
  const value = options.get(name);
  if (required && !value) {
    fail(`Missing required option: ${name}`);
  }
  return value;
}

function resolveFrom(root, value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
}

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) {
        break;
      }
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
}

function requireCommitSha(commitSha) {
  if (!/^[0-9a-f]{40}$/.test(commitSha || '')) {
    fail('The runtime artifact commit must be a lowercase 40-character Git SHA.');
  }
}

function requireRunIdentity(runId, runAttempt) {
  if (!/^[1-9][0-9]{0,19}$/.test(runId || '')) {
    fail('The runtime artifact run id must be a positive decimal integer.');
  }
  if (!/^[1-9][0-9]{0,9}$/.test(runAttempt || '')) {
    fail('The runtime artifact run attempt must be a positive decimal integer.');
  }
}

function runtimeArtifactName(commitSha, runId, runAttempt) {
  requireCommitSha(commitSha);
  requireRunIdentity(runId, runAttempt);
  return `modern-java-runtime-${runId}-${runAttempt}-${commitSha.slice(0, 12)}.tar`;
}

function requireRepositoryCheckout(repoRoot, commitSha) {
  const packagePath = path.join(repoRoot, 'package.json');
  let packageManifest;
  try {
    const packageStat = fs.lstatSync(packagePath);
    if (!packageStat.isFile() || packageStat.isSymbolicLink()) {
      fail('Modern Java artifact repository marker must be a regular package.json file.');
    }
    packageManifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch (error) {
    fail(`Modern Java artifact repository marker is invalid: ${error.message}`);
  }
  if (packageManifest.name !== 'doppiojvm') {
    fail('Modern Java artifact repository marker is not the Doppio package.');
  }

  const gitResult = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const headSha = gitResult.stdout?.trim();
  if (gitResult.error || gitResult.status !== 0 || !/^[0-9a-f]{40}$/.test(headSha || '')) {
    fail('Modern Java artifact repository root must be a Git checkout.');
  }
  if (headSha !== commitSha) {
    fail(`Modern Java artifact commit does not match checkout HEAD: expected ${headSha}, got ${commitSha}.`);
  }
}

function collectRegularFiles(root, relativePath) {
  const absolutePath = path.join(root, ...relativePath.split('/'));
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    fail(`Runtime artifact input must not be a symbolic link: ${relativePath}`);
  }
  if (stat.isFile()) {
    return [relativePath];
  }
  if (!stat.isDirectory()) {
    fail(`Runtime artifact input must be a regular file or directory: ${relativePath}`);
  }

  const files = [];
  for (const name of fs.readdirSync(absolutePath).sort()) {
    files.push(...collectRegularFiles(root, `${relativePath}/${name}`));
  }
  return files;
}

function archiveInputPaths(repoRoot) {
  return [
    ...collectRegularFiles(repoRoot, 'build/release-cli/console'),
    ...collectRegularFiles(repoRoot, 'build/release-cli/src'),
    ...collectRegularFiles(repoRoot, 'build/modern-bootstrap-overlay/modern-bootstrap.jar'),
    ...collectRegularFiles(repoRoot, 'vendor/java_home'),
  ].sort();
}

function createArtifact({
  repoRoot,
  manifestPath,
  outputDirectory,
  outputDirectoryArgument,
  commitSha,
  runId,
  runAttempt,
  githubOutputPath,
}) {
  requireCommitSha(commitSha);
  if (!fs.statSync(manifestPath).isFile()) {
    fail(`Compiler shard manifest is not a file: ${manifestPath}`);
  }

  const artifactName = runtimeArtifactName(commitSha, runId, runAttempt);
  const outputPath = path.join(outputDirectory, artifactName);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-modern-runtime-create-'));
  try {
    const inputs = archiveInputPaths(repoRoot);
    const provenanceFiles = [];
    for (const relativePath of inputs) {
      const sourcePath = path.join(repoRoot, ...relativePath.split('/'));
      const stagedPath = path.join(stagingRoot, ...relativePath.split('/'));
      fs.mkdirSync(path.dirname(stagedPath), { recursive: true, mode: 0o755 });
      try {
        // The staging directory and repository normally share a filesystem in
        // CI. Hard links avoid a second 100 MB JDK copy while the tar header
        // still normalizes the stored mode to 0644.
        fs.linkSync(sourcePath, stagedPath);
      } catch (error) {
        if (!['EXDEV', 'EPERM', 'EACCES'].includes(error.code)) {
          throw error;
        }
        fs.copyFileSync(sourcePath, stagedPath);
      }
      const stat = fs.statSync(stagedPath);
      provenanceFiles.push({
        path: relativePath,
        size: stat.size,
        sha256: sha256File(stagedPath),
      });
    }

    const provenance = {
      schemaVersion: 1,
      commitSha,
      runId,
      runAttempt,
      artifactName,
      manifestSha256: sha256File(manifestPath),
      files: provenanceFiles,
    };
    const stagedProvenancePath = path.join(stagingRoot, ...provenancePath.split('/'));
    fs.mkdirSync(path.dirname(stagedProvenancePath), { recursive: true, mode: 0o755 });
    fs.writeFileSync(stagedProvenancePath, `${JSON.stringify(provenance, null, 2)}\n`, { mode: 0o644 });

    const archivePaths = [provenancePath, ...inputs].sort();
    fs.rmSync(outputPath, { force: true });
    const tarResult = spawnSync(
      'tar',
      [
        '--create',
        '--file', outputPath,
        '--format=ustar',
        '--sort=name',
        '--mtime=@0',
        '--owner=0',
        '--group=0',
        '--numeric-owner',
        '--mode=0644',
        '--no-recursion',
        '--files-from=-',
      ],
      {
        cwd: stagingRoot,
        encoding: 'utf8',
        input: `${archivePaths.join('\n')}\n`,
      }
    );
    if (tarResult.error || tarResult.status !== 0) {
      fail(`Unable to create deterministic runtime tar: ${tarResult.error?.message || tarResult.stderr}`);
    }

    const artifactSha256 = sha256File(outputPath);
    if (githubOutputPath) {
      const archivePathOutput = path.isAbsolute(outputDirectoryArgument) ?
        path.join(outputDirectoryArgument, artifactName) :
        path.posix.join(outputDirectoryArgument.replaceAll(path.sep, '/'), artifactName);
      fs.appendFileSync(
        githubOutputPath,
        `sha256=${artifactSha256}\nartifact_name=${artifactName}\n` +
        `run_id=${runId}\nrun_attempt=${runAttempt}\narchive_path=${archivePathOutput}\n`
      );
    }
    console.log(`Created ${outputPath} (${artifactSha256}).`);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function readTarString(header, start, length) {
  const field = header.subarray(start, start + length);
  const nul = field.indexOf(0);
  return field.subarray(0, nul < 0 ? field.length : nul).toString('utf8');
}

function readTarOctal(header, start, length, label) {
  const field = header.subarray(start, start + length);
  if ((field[0] & 0x80) !== 0) {
    fail(`Runtime artifact uses an unsupported base-256 ${label}.`);
  }
  const value = field.toString('ascii').replace(/\0.*$/, '').trim();
  if (!/^[0-7]+$/.test(value || '0')) {
    fail(`Runtime artifact has an invalid ${label}.`);
  }
  return Number.parseInt(value || '0', 8);
}

function isZeroBlock(block) {
  for (const byte of block) {
    if (byte !== 0) {
      return false;
    }
  }
  return true;
}

function isSafeArchivePath(entryPath) {
  return (
    typeof entryPath === 'string' &&
    entryPath.length > 0 &&
    /^[A-Za-z0-9._$/-]+$/.test(entryPath) &&
    !entryPath.includes('\\') &&
    !path.posix.isAbsolute(entryPath) &&
    path.posix.normalize(entryPath) === entryPath &&
    !entryPath.split('/').includes('..') &&
    (entryPath === provenancePath ||
      entryPath === 'build/modern-bootstrap-overlay/modern-bootstrap.jar' ||
      entryPath.startsWith('build/release-cli/console/') ||
      entryPath.startsWith('build/release-cli/src/') ||
      entryPath.startsWith('vendor/java_home/'))
  );
}

function parseTar(archive) {
  const entries = [];
  const seen = new Set();
  let offset = 0;
  let zeroBlocks = 0;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (isZeroBlock(header)) {
      zeroBlocks += 1;
      offset += 512;
      if (zeroBlocks === 2) {
        break;
      }
      continue;
    }
    if (zeroBlocks !== 0) {
      fail('Runtime artifact has data after an incomplete end marker.');
    }

    const storedChecksum = readTarOctal(header, 148, 8, 'header checksum');
    let calculatedChecksum = 0;
    for (let index = 0; index < header.length; index += 1) {
      calculatedChecksum += index >= 148 && index < 156 ? 32 : header[index];
    }
    if (storedChecksum !== calculatedChecksum) {
      fail('Runtime artifact tar header checksum mismatch.');
    }

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const entryPath = prefix ? `${prefix}/${name}` : name;
    const type = header[156];
    if (type !== 0 && type !== 48) {
      fail(`Runtime artifact may contain only regular files: ${entryPath}`);
    }
    if (!isSafeArchivePath(entryPath)) {
      fail(`Runtime artifact contains an unsafe path: ${entryPath}`);
    }
    if (seen.has(entryPath)) {
      fail(`Runtime artifact contains a duplicate path: ${entryPath}`);
    }
    seen.add(entryPath);

    const size = readTarOctal(header, 124, 12, `size for ${entryPath}`);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (!Number.isSafeInteger(size) || dataEnd > archive.length) {
      fail(`Runtime artifact entry exceeds archive bounds: ${entryPath}`);
    }
    entries.push({ path: entryPath, data: archive.subarray(dataStart, dataEnd) });
    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  if (zeroBlocks < 2) {
    fail('Runtime artifact is missing the tar end marker.');
  }
  for (; offset < archive.length; offset += 1) {
    if (archive[offset] !== 0) {
      fail('Runtime artifact contains trailing data.');
    }
  }
  return entries;
}

function verifyProvenance(entries, commitSha, runId, runAttempt, artifactName, manifestPath) {
  const provenanceEntry = entries.find((entry) => entry.path === provenancePath);
  if (!provenanceEntry) {
    fail('Runtime artifact is missing provenance.');
  }

  let provenance;
  try {
    provenance = JSON.parse(provenanceEntry.data.toString('utf8'));
  } catch (error) {
    fail(`Runtime artifact provenance is invalid JSON: ${error.message}`);
  }
  if (
    provenance.schemaVersion !== 1 ||
    provenance.commitSha !== commitSha ||
    provenance.runId !== runId ||
    provenance.runAttempt !== runAttempt ||
    provenance.artifactName !== artifactName
  ) {
    fail('Runtime artifact provenance does not match the checked-out commit.');
  }
  if (provenance.manifestSha256 !== sha256File(manifestPath)) {
    fail('Runtime artifact provenance does not match the checked-in shard manifest.');
  }
  if (!Array.isArray(provenance.files)) {
    fail('Runtime artifact provenance file inventory is invalid.');
  }

  const payloadEntries = entries.filter((entry) => entry.path !== provenancePath);
  if (payloadEntries.length !== provenance.files.length) {
    fail('Runtime artifact payload does not match its provenance inventory.');
  }
  for (let index = 0; index < payloadEntries.length; index += 1) {
    const entry = payloadEntries[index];
    const expected = provenance.files[index];
    if (
      expected?.path !== entry.path ||
      expected?.size !== entry.data.length ||
      expected?.sha256 !== sha256Buffer(entry.data)
    ) {
      fail(`Runtime artifact payload integrity check failed: ${entry.path}`);
    }
  }
  const entryPaths = new Set(payloadEntries.map((entry) => entry.path));
  for (const requiredPath of requiredArchivePaths) {
    if (!entryPaths.has(requiredPath)) {
      fail(`Runtime artifact is missing required input: ${requiredPath}`);
    }
  }
  return provenance;
}

function ensureSafeDirectory(root, relativePath) {
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail('Runtime artifact repository root must be a real directory.');
  }

  let current = root;
  for (const component of relativePath.split('/')) {
    current = path.join(current, component);
    try {
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        fail(`Runtime artifact install has an unsafe symbolic-link directory: ${relativePath}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      fs.mkdirSync(current, { mode: 0o755 });
    }
  }
}

function installEntries(entries, extractRoot) {
  // Do not let a pre-existing checkout symlink redirect any recursive removal
  // or rename outside the verified repository root.
  ensureSafeDirectory(extractRoot, 'build');
  ensureSafeDirectory(extractRoot, 'vendor');
  const stagingRoot = fs.mkdtempSync(path.join(extractRoot, '.modern-java-runtime-extract-'));
  try {
    for (const entry of entries) {
      if (entry.path === provenancePath) {
        continue;
      }
      const outputPath = path.join(stagingRoot, ...entry.path.split('/'));
      fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o755 });
      fs.writeFileSync(outputPath, entry.data, { mode: 0o644 });
    }

    for (const relativeTarget of [
      'build/release-cli',
      'build/modern-bootstrap-overlay',
      'vendor/java_home',
    ]) {
      const source = path.join(stagingRoot, ...relativeTarget.split('/'));
      const target = path.join(extractRoot, ...relativeTarget.split('/'));
      if (!fs.statSync(source).isDirectory()) {
        fail(`Runtime artifact extraction is missing ${relativeTarget}.`);
      }
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
      fs.rmSync(target, { recursive: true, force: true });
      fs.renameSync(source, target);
    }

    const vendorLink = path.join(extractRoot, 'build', 'release-cli', 'vendor');
    const relativeVendorTarget = '../../vendor';
    const resolvedVendorTarget = path.resolve(path.dirname(vendorLink), relativeVendorTarget);
    if (resolvedVendorTarget !== path.join(extractRoot, 'vendor')) {
      fail('Refusing to create an unsafe release CLI vendor link.');
    }
    fs.symlinkSync(relativeVendorTarget, vendorLink, 'dir');
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function inspectArtifact({
  repoRoot,
  manifestPath,
  archivePath,
  expectedSha256,
  commitSha,
  runId,
  runAttempt,
  artifactName,
}) {
  requireCommitSha(commitSha);
  requireRunIdentity(runId, runAttempt);
  requireRepositoryCheckout(repoRoot, commitSha);
  const expectedArtifactName = runtimeArtifactName(commitSha, runId, runAttempt);
  if (artifactName !== expectedArtifactName || path.basename(archivePath) !== expectedArtifactName) {
    fail('Runtime artifact filename does not match its run identity.');
  }
  if (!/^[0-9a-f]{64}$/.test(expectedSha256 || '')) {
    fail('Expected runtime artifact SHA-256 must be 64 lowercase hexadecimal characters.');
  }
  const actualSha256 = sha256File(archivePath);
  if (actualSha256 !== expectedSha256) {
    fail(`Runtime artifact SHA-256 mismatch: expected ${expectedSha256}, got ${actualSha256}.`);
  }

  const entries = parseTar(fs.readFileSync(archivePath));
  const provenance = verifyProvenance(
    entries,
    commitSha,
    runId,
    runAttempt,
    artifactName,
    manifestPath
  );
  return { entries, provenance };
}

function verifySourceSnapshot(repoRoot, provenance) {
  const currentPaths = archiveInputPaths(repoRoot);
  if (
    currentPaths.length !== provenance.files.length ||
    currentPaths.some((relativePath, index) => relativePath !== provenance.files[index]?.path)
  ) {
    fail('Runtime artifact source snapshot inventory changed after bundling.');
  }
  for (const expected of provenance.files) {
    const currentPath = path.join(repoRoot, ...expected.path.split('/'));
    const stat = fs.statSync(currentPath);
    if (stat.size !== expected.size || sha256File(currentPath) !== expected.sha256) {
      fail(`Runtime artifact source snapshot changed after bundling: ${expected.path}`);
    }
  }
}

function verifyArtifact(options) {
  if (path.resolve(options.extractRoot) !== path.resolve(options.repoRoot)) {
    fail('Runtime artifact extraction root must exactly match the verified repository root.');
  }
  const { entries } = inspectArtifact(options);
  const { extractRoot, commitSha } = options;
  fs.mkdirSync(extractRoot, { recursive: true });
  installEntries(entries, extractRoot);
  console.log(`Verified and installed runtime artifact for ${commitSha}.`);
}

function verifySourceArtifact(options) {
  const { provenance } = inspectArtifact(options);
  verifySourceSnapshot(options.repoRoot, provenance);
  console.log(`Verified unchanged runtime artifact source snapshot for ${options.commitSha}.`);
}

try {
  const { command, options } = parseOptions(process.argv.slice(2));
  const repoRoot = resolveFrom(defaultRepoRoot, option(options, '--repo-root', false) || defaultRepoRoot);
  const manifestPath = resolveFrom(
    repoRoot,
    option(options, '--manifest', false) || 'ci/modern_java_smoke_shards.json'
  );
  if (manifestPath !== path.join(repoRoot, 'ci', 'modern_java_smoke_shards.json')) {
    fail('Modern Java artifact must use the checked-in compiler shard manifest.');
  }

  if (command === 'create') {
    const commitSha = option(options, '--commit');
    const runId = option(options, '--run-id');
    const runAttempt = option(options, '--run-attempt');
    const outputDirectoryArgument = option(options, '--output-dir');
    requireCommitSha(commitSha);
    requireRunIdentity(runId, runAttempt);
    requireRepositoryCheckout(repoRoot, commitSha);
    createArtifact({
      repoRoot,
      manifestPath,
      outputDirectory: resolveFrom(repoRoot, outputDirectoryArgument),
      outputDirectoryArgument,
      commitSha,
      runId,
      runAttempt,
      githubOutputPath: options.has('--github-output') ?
        resolveFrom(repoRoot, option(options, '--github-output')) : undefined,
    });
  } else if (command === 'verify' || command === 'verify-source') {
    const verifyOptions = {
      repoRoot,
      manifestPath,
      archivePath: resolveFrom(repoRoot, option(options, '--archive')),
      expectedSha256: option(options, '--sha256'),
      commitSha: option(options, '--commit'),
      runId: option(options, '--run-id'),
      runAttempt: option(options, '--run-attempt'),
      artifactName: option(options, '--artifact-name'),
      extractRoot: resolveFrom(repoRoot, option(options, '--extract-root', false) || repoRoot),
    };
    if (command === 'verify') {
      verifyArtifact(verifyOptions);
    } else {
      verifySourceArtifact(verifyOptions);
    }
  } else {
    fail(
      'Usage: modern_java_runtime_artifact.mjs create|verify|verify-source --manifest PATH ' +
      '--commit SHA --run-id ID --run-attempt N [--output-dir PATH|' +
      '--archive PATH --artifact-name NAME --sha256 SHA]'
    );
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
