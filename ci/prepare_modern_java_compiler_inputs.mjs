import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(__filename), '..');
const maximumCompilerInputBytes = 128 * 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

function parseOptions(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
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
  return options;
}

function option(options, name, fallback) {
  return options.get(name) || fallback;
}

function resolveFrom(root, value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
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

function isRegularFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1;
  } catch {
    return false;
  }
}

function requireHash(value, label) {
  if (!/^[0-9a-f]{64}$/.test(value || '')) {
    fail(`${label} must have a lowercase SHA-256 digest.`);
  }
}

function requireSize(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${label} size must be a positive safe integer.`);
  }
  if (value > maximumCompilerInputBytes) {
    fail(`${label} size must not exceed the 128 MiB compiler input limit.`);
  }
}

function requireDownloadUrl(value, label) {
  const parsed = new URL(value);
  const allowedHttpsHost =
    parsed.protocol === 'https:' &&
    ['registry.npmjs.org', 'repo1.maven.org'].includes(parsed.hostname);
  const allowedFixture =
    process.env.MODERN_JAVA_COMPILER_INPUT_ALLOW_FILE_URLS === '1' &&
    parsed.protocol === 'file:';
  if (!allowedHttpsHost && !allowedFixture) {
    fail(`${label} must use an approved HTTPS compiler repository.`);
  }
  return parsed;
}

function validateLock(lock) {
  if (lock?.schemaVersion !== 2 || !lock.kotlin || !lock.scala) {
    fail('Compiler input lock must use schemaVersion 2 with Kotlin and Scala inputs.');
  }
  if (
    !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(lock.kotlin.version || '') ||
    !/^kotlin-compiler-[0-9.]+\.tgz$/.test(lock.kotlin.archiveName || '') ||
    !/^kotlin-compiler-[0-9.]+$/.test(lock.kotlin.extractedDirectory || '')
  ) {
    fail('Kotlin compiler lock metadata is invalid.');
  }
  requireDownloadUrl(lock.kotlin.url, 'Kotlin compiler archive URL');
  requireHash(lock.kotlin.sha256, 'Kotlin compiler archive');
  requireSize(lock.kotlin.size, 'Kotlin compiler archive');
  if (!lock.kotlin.jars || typeof lock.kotlin.jars !== 'object' || Array.isArray(lock.kotlin.jars)) {
    fail('Kotlin compiler lock must contain extracted JAR hashes.');
  }
  const kotlinJarPaths = Object.keys(lock.kotlin.jars);
  if (kotlinJarPaths.length === 0 || JSON.stringify(kotlinJarPaths) !== JSON.stringify([...kotlinJarPaths].sort())) {
    fail('Kotlin compiler extracted JAR lock must be nonempty and lexically ordered.');
  }
  for (const relativePath of kotlinJarPaths) {
    if (
      !/^package\/lib\/[A-Za-z0-9_.-]+\.jar$/.test(relativePath) ||
      path.posix.normalize(relativePath) !== relativePath
    ) {
      fail(`Kotlin compiler lock contains an unsafe JAR path: ${relativePath}`);
    }
    requireHash(lock.kotlin.jars[relativePath], `Kotlin ${relativePath}`);
  }
  for (const requiredJar of [
    'package/lib/kotlin-compiler.jar',
    'package/lib/kotlin-reflect.jar',
    'package/lib/kotlin-stdlib.jar',
  ]) {
    if (!(requiredJar in lock.kotlin.jars)) {
      fail(`Kotlin compiler lock is missing ${requiredJar}.`);
    }
  }

  if (
    !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(lock.scala.version || '') ||
    !Array.isArray(lock.scala.files) ||
    lock.scala.files.length !== 5
  ) {
    fail('Scala compiler lock metadata is invalid.');
  }
  const scalaNames = [];
  for (const file of lock.scala.files) {
    if (!/^[A-Za-z0-9_.-]+\.jar$/.test(file?.name || '')) {
      fail('Scala compiler lock contains an unsafe filename.');
    }
    requireDownloadUrl(file.url, `Scala ${file.name} URL`);
    requireHash(file.sha256, `Scala ${file.name}`);
    requireSize(file.size, `Scala ${file.name}`);
    scalaNames.push(file.name);
  }
  if (
    new Set(scalaNames).size !== scalaNames.length ||
    JSON.stringify(scalaNames) !== JSON.stringify([...scalaNames].sort())
  ) {
    fail('Scala compiler lock filenames must be unique and lexically ordered.');
  }
  for (const requiredName of [
    `scala-compiler-${lock.scala.version}.jar`,
    `scala-library-${lock.scala.version}.jar`,
    `scala-reflect-${lock.scala.version}.jar`,
    'java-diff-utils-4.16.jar',
    'jline-3.29.0-jdk8.jar',
  ]) {
    if (!scalaNames.includes(requiredName)) {
      fail(`Scala compiler lock is missing ${requiredName}.`);
    }
  }
}

function replaceAtomically(temporaryPath, targetPath) {
  const backupPath = `${targetPath}.replaced-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  let movedExisting = false;
  try {
    if (fs.existsSync(targetPath)) {
      fs.renameSync(targetPath, backupPath);
      movedExisting = true;
    }
    fs.renameSync(temporaryPath, targetPath);
    if (movedExisting) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
  } catch (error) {
    if (!fs.existsSync(targetPath) && movedExisting && fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, targetPath);
    }
    throw error;
  }
}

function createDownloadMeter(expectedSize, label) {
  const hash = crypto.createHash('sha256');
  let bytesRead = 0;
  const stream = new Transform({
    transform(chunk, encoding, callback) {
      bytesRead += chunk.length;
      if (bytesRead > maximumCompilerInputBytes) {
        callback(new Error(`${label} exceeds the 128 MiB compiler input limit.`));
        return;
      }
      if (bytesRead > expectedSize) {
        callback(new Error(`${label} exceeds locked size ${expectedSize} bytes.`));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
    flush(callback) {
      if (bytesRead !== expectedSize) {
        callback(new Error(
          `${label} size mismatch: expected ${expectedSize} bytes, got ${bytesRead}.`
        ));
        return;
      }
      callback();
    },
  });
  return {
    stream,
    digest: () => hash.digest('hex'),
  };
}

function rejectOversizedContentLength(response, expectedSize, label) {
  const value = response.headers.get('content-length');
  if (value === null || !/^[0-9]+$/.test(value)) {
    return;
  }
  const contentLength = Number(value);
  if (!Number.isSafeInteger(contentLength) || contentLength > maximumCompilerInputBytes) {
    fail(`${label} Content-Length exceeds the 128 MiB compiler input limit.`);
  }
  if (contentLength > expectedSize) {
    fail(`${label} Content-Length exceeds locked size ${expectedSize} bytes.`);
  }
}

async function downloadVerified(url, expectedHash, expectedSize, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.download-${process.pid}-${crypto.randomBytes(6).toString('hex')}`
  );
  try {
    const parsedUrl = requireDownloadUrl(url, path.basename(targetPath));
    let source;
    if (parsedUrl.protocol === 'file:') {
      source = fs.createReadStream(fileURLToPath(parsedUrl));
    } else {
      const response = await fetch(parsedUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(600_000),
        headers: { 'user-agent': 'doppio-modern-java-ci' },
      });
      if (!response.ok || !response.body) {
        fail(`Unable to download ${url}: HTTP ${response.status}.`);
      }
      rejectOversizedContentLength(response, expectedSize, url);
      source = Readable.fromWeb(response.body);
    }
    const meter = createDownloadMeter(expectedSize, url);
    await pipeline(source, meter.stream, fs.createWriteStream(temporaryPath, { mode: 0o644 }));
    const actualHash = meter.digest();
    if (actualHash !== expectedHash) {
      fail(`Compiler input SHA-256 mismatch for ${url}: expected ${expectedHash}, got ${actualHash}.`);
    }
    replaceAtomically(temporaryPath, targetPath);
  } finally {
    fs.rmSync(temporaryPath, { recursive: true, force: true });
  }
}

async function ensureVerifiedFile(file, cacheRoot, label) {
  const targetPath = path.join(cacheRoot, file.name);
  if (
    isRegularFile(targetPath) &&
    fs.statSync(targetPath).size === file.size &&
    sha256File(targetPath) === file.sha256
  ) {
    console.log(`${label} cache verified: ${file.name}`);
    return targetPath;
  }
  await downloadVerified(file.url, file.sha256, file.size, targetPath);
  console.log(`${label} cache restored: ${file.name}`);
  return targetPath;
}

function reconcileScalaInventory(cacheRoot, files) {
  const expectedNames = files.map((file) => file.name).sort();
  for (const entry of fs.readdirSync(cacheRoot, { withFileTypes: true })) {
    if (entry.name.endsWith('.jar') && !expectedNames.includes(entry.name)) {
      fs.rmSync(path.join(cacheRoot, entry.name), { recursive: true, force: true });
      console.log(`Scala cache removed unlocked JAR: ${entry.name}`);
    }
  }
}

function validateScalaInventory(cacheRoot, files) {
  const expectedNames = files.map((file) => file.name).sort();
  const jarEntries = fs.readdirSync(cacheRoot, { withFileTypes: true })
    .filter((entry) => entry.name.endsWith('.jar'));
  const actualNames = jarEntries.map((entry) => entry.name).sort();
  return (
    JSON.stringify(actualNames) === JSON.stringify(expectedNames) &&
    jarEntries.every((entry) => isRegularFile(path.join(cacheRoot, entry.name)))
  );
}

function validateKotlinExtraction(extractedRoot, kotlin) {
  const expectedPaths = Object.keys(kotlin.jars);
  const libraryRoot = path.join(extractedRoot, 'package', 'lib');
  let libraryEntries;
  let actualPaths;
  try {
    libraryEntries = fs.readdirSync(libraryRoot, { withFileTypes: true });
    if (libraryEntries.some((entry) => entry.name.endsWith('.jar') && !entry.isFile())) {
      return false;
    }
    actualPaths = libraryEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jar'))
      .map((entry) => `package/lib/${entry.name}`)
      .sort();
  } catch {
    return false;
  }
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    return false;
  }
  return expectedPaths.every((relativePath) => {
    const jarPath = path.join(extractedRoot, ...relativePath.split('/'));
    return isRegularFile(jarPath) && sha256File(jarPath) === kotlin.jars[relativePath];
  });
}

function extractVerifiedKotlinArchive(archivePath, targetRoot, kotlin) {
  const temporaryRoot = path.join(
    path.dirname(targetRoot),
    `.${path.basename(targetRoot)}.extract-${process.pid}-${crypto.randomBytes(6).toString('hex')}`
  );
  fs.mkdirSync(temporaryRoot, { recursive: true });
  try {
    const listResult = spawnSync('tar', ['--list', '--gzip', '--file', archivePath], { encoding: 'utf8' });
    if (listResult.error || listResult.status !== 0) {
      fail(`Unable to inspect Kotlin compiler archive: ${listResult.error?.message || listResult.stderr}`);
    }
    const entryPaths = listResult.stdout.split('\n').filter(Boolean);
    const verboseListResult = spawnSync(
      'tar',
      ['--list', '--verbose', '--numeric-owner', '--gzip', '--file', archivePath],
      { encoding: 'utf8' }
    );
    if (verboseListResult.error || verboseListResult.status !== 0) {
      fail(
        `Unable to inspect Kotlin compiler archive entry types: ` +
        `${verboseListResult.error?.message || verboseListResult.stderr}`
      );
    }
    const verboseEntries = verboseListResult.stdout.split('\n').filter(Boolean);
    if (
      verboseEntries.length !== entryPaths.length ||
      verboseEntries.some((entry) => entry[0] !== '-' && entry[0] !== 'd')
    ) {
      fail('Kotlin compiler archive contains an unsupported link or device entry type.');
    }
    for (const entryPath of entryPaths) {
      const normalized = entryPath.replace(/\/$/, '');
      if (
        (normalized !== 'package' && !normalized.startsWith('package/')) ||
        normalized.includes('\\') ||
        path.posix.isAbsolute(normalized) ||
        path.posix.normalize(normalized) !== normalized ||
        normalized.split('/').includes('..')
      ) {
        fail(`Kotlin compiler archive contains an unsafe path: ${entryPath}`);
      }
    }
    const extractResult = spawnSync(
      'tar',
      [
        '--extract',
        '--gzip',
        '--file', archivePath,
        '--directory', temporaryRoot,
        '--no-same-owner',
        '--no-same-permissions',
      ],
      { encoding: 'utf8' }
    );
    if (extractResult.error || extractResult.status !== 0) {
      fail(`Unable to extract Kotlin compiler archive: ${extractResult.error?.message || extractResult.stderr}`);
    }
    if (!validateKotlinExtraction(temporaryRoot, kotlin)) {
      fail('Extracted Kotlin compiler JAR hashes do not match the lock.');
    }
    replaceAtomically(temporaryRoot, targetRoot);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function writeMarker(markerPath, marker) {
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  const temporaryPath = `${markerPath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(marker, null, 2)}\n`, { mode: 0o644 });
    replaceAtomically(temporaryPath, markerPath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

try {
  const options = parseOptions(process.argv.slice(2));
  const repoRoot = resolveFrom(defaultRepoRoot, option(options, '--repo-root', defaultRepoRoot));
  const lockPath = resolveFrom(repoRoot, option(options, '--lock', 'ci/modern_java_compiler_inputs.lock.json'));
  const kotlinCacheRoot = resolveFrom(repoRoot, option(options, '--kotlin-cache', 'build/kotlin-smoke-cache'));
  const scalaCacheRoot = resolveFrom(repoRoot, option(options, '--scala-cache', 'build/scala-smoke-cache'));
  const markerPath = resolveFrom(repoRoot, option(options, '--marker', 'build/modern-java-compiler-inputs.json'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  validateLock(lock);

  fs.mkdirSync(kotlinCacheRoot, { recursive: true });
  const kotlinArchivePath = await ensureVerifiedFile(
    {
      name: lock.kotlin.archiveName,
      url: lock.kotlin.url,
      sha256: lock.kotlin.sha256,
      size: lock.kotlin.size,
    },
    kotlinCacheRoot,
    'Kotlin archive'
  );
  const kotlinExtractedRoot = path.join(kotlinCacheRoot, lock.kotlin.extractedDirectory);
  if (!validateKotlinExtraction(kotlinExtractedRoot, lock.kotlin)) {
    extractVerifiedKotlinArchive(kotlinArchivePath, kotlinExtractedRoot, lock.kotlin);
    console.log('Kotlin extracted compiler cache restored and verified.');
  } else {
    console.log('Kotlin extracted compiler cache verified.');
  }

  fs.mkdirSync(scalaCacheRoot, { recursive: true });
  reconcileScalaInventory(scalaCacheRoot, lock.scala.files);
  const scalaPaths = new Map();
  for (const file of lock.scala.files) {
    scalaPaths.set(file.name, await ensureVerifiedFile(file, scalaCacheRoot, 'Scala'));
  }
  if (!validateScalaInventory(scalaCacheRoot, lock.scala.files)) {
    fail('Scala compiler cache JAR inventory does not exactly match the lock.');
  }

  const kotlinLibraryRoot = path.join(kotlinExtractedRoot, 'package', 'lib');
  const environment = {
    KOTLIN_COMPILER_JAR: path.join(kotlinLibraryRoot, 'kotlin-compiler.jar'),
    KOTLIN_STDLIB_JAR: path.join(kotlinLibraryRoot, 'kotlin-stdlib.jar'),
    KOTLIN_REFLECT_JAR: path.join(kotlinLibraryRoot, 'kotlin-reflect.jar'),
    SCALA_COMPILER_JAR: scalaPaths.get(`scala-compiler-${lock.scala.version}.jar`),
    SCALA_LIBRARY_JAR: scalaPaths.get(`scala-library-${lock.scala.version}.jar`),
    SCALA_REFLECT_JAR: scalaPaths.get(`scala-reflect-${lock.scala.version}.jar`),
    SCALA_DIFF_UTILS_JAR: scalaPaths.get('java-diff-utils-4.16.jar'),
    SCALA_JLINE_JAR: scalaPaths.get('jline-3.29.0-jdk8.jar'),
  };
  const scalaHashes = new Map(lock.scala.files.map((file) => [file.name, file.sha256]));
  writeMarker(markerPath, {
    schemaVersion: 1,
    lockSha256: sha256File(lockPath),
    environment,
    environmentSha256: {
      KOTLIN_COMPILER_JAR: lock.kotlin.jars['package/lib/kotlin-compiler.jar'],
      KOTLIN_STDLIB_JAR: lock.kotlin.jars['package/lib/kotlin-stdlib.jar'],
      KOTLIN_REFLECT_JAR: lock.kotlin.jars['package/lib/kotlin-reflect.jar'],
      SCALA_COMPILER_JAR: scalaHashes.get(`scala-compiler-${lock.scala.version}.jar`),
      SCALA_LIBRARY_JAR: scalaHashes.get(`scala-library-${lock.scala.version}.jar`),
      SCALA_REFLECT_JAR: scalaHashes.get(`scala-reflect-${lock.scala.version}.jar`),
      SCALA_DIFF_UTILS_JAR: scalaHashes.get('java-diff-utils-4.16.jar'),
      SCALA_JLINE_JAR: scalaHashes.get('jline-3.29.0-jdk8.jar'),
    },
  });
  console.log(`Modern Java compiler inputs verified from ${lockPath}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
