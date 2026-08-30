/**
 * Downloads DoppioJVM's JDK into vendor/java_home.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as stream from 'stream';
import * as url from 'url';
import * as zlib from 'zlib';
import rimraf = require('rimraf');

const tarFsPackage = (require as any).resolve('tar-fs/package.json');
// tar-stream is a tar-fs runtime dependency, but it may be nested instead of
// hoisted. Resolve it from tar-fs so installed packages do not rely on the
// repository's node_modules layout.
const tarStream: any = require((require as any).resolve('tar-stream', {
  paths: [path.dirname(tarFsPackage)]
}));

const JDK_URL = 'https://github.com/plasma-umass/doppio_jcl/releases/download/v3.2/java_home.tar.gz';
const JDK_SHA256 = 'bee079d16b8631ff56d3bdc66b4d03e0ecbf9ee46baeef9b041c0bc497f25c34';
const JDK_PATH = path.resolve(__dirname, '..', '..', '..', 'vendor');
const JDK_FOLDER = 'java_home';
const INTEGRITY_FILE = '.doppio-jdk-integrity.json';
const INTEGRITY_SCHEMA = 2;
const MAX_REDIRECTS = 5;
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 512 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 4096;
const REQUEST_TIMEOUT_MS = 30 * 1000;
const DOWNLOAD_DEADLINE_MS = 10 * 60 * 1000;
const TEST_MARKER = '.doppio-jdk-download-test-fixture';
const TEST_MARKER_CONTENT = 'doppio-jdk-download-test-fixture-v1\n';

interface DownloadConfig {
  sourceUrl: string;
  expectedSha256: string;
  destinationRoot: string;
  localArchive?: string;
  replacementArchiveBeforeExtraction?: string;
  failReplaceAfterBackup?: boolean;
}

interface JdkInfo {
  url: string;
  sha256: string;
  classpath: string[];
}

interface IntegrityMarker extends JdkInfo {
  schema: number;
  classpathSha256: {[entry: string]: string};
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function readRegularFile(filePath: string): Buffer {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`${filePath} must be a non-empty regular file.`);
  }
  return fs.readFileSync(filePath);
}

function sha256RegularFile(filePath: string): string {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`${filePath} must be a non-empty regular file.`);
  }
  const descriptor = fs.openSync(filePath, 'r');
  const digest = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let position = 0;
  try {
    while (position < stat.size) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, Math.min(buffer.length, stat.size - position), position);
      if (bytesRead === 0) {
        throw new Error(`Unexpected end of regular file while hashing ${filePath}.`);
      }
      digest.update(buffer.slice(0, bytesRead));
      position += bytesRead;
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return digest.digest('hex');
}

function parseJsonFile(filePath: string): any {
  return JSON.parse(readRegularFile(filePath).toString('utf8'));
}

function loadConfig(): DownloadConfig {
  const testKeys = [
    'DOPPIO_JDK_DOWNLOAD_TEST_ONLY',
    'DOPPIO_JDK_TEST_ROOT',
    'DOPPIO_JDK_TEST_ARCHIVE',
    'DOPPIO_JDK_TEST_DESTINATION',
    'DOPPIO_JDK_TEST_SHA256',
    'DOPPIO_JDK_TEST_REPLACEMENT_ARCHIVE',
    'DOPPIO_JDK_TEST_FAIL_REPLACE'
  ];
  const testRequested = testKeys.some((key) => process.env[key] !== undefined);
  if (!testRequested) {
    return {
      sourceUrl: JDK_URL,
      expectedSha256: JDK_SHA256,
      destinationRoot: JDK_PATH
    };
  }

  if (process.env.NODE_ENV !== 'test' || process.env.DOPPIO_JDK_DOWNLOAD_TEST_ONLY !== '1') {
    throw new Error('JDK test overrides require NODE_ENV=test and DOPPIO_JDK_DOWNLOAD_TEST_ONLY=1.');
  }
  const testRootValue = process.env.DOPPIO_JDK_TEST_ROOT;
  const archiveValue = process.env.DOPPIO_JDK_TEST_ARCHIVE;
  const destinationValue = process.env.DOPPIO_JDK_TEST_DESTINATION;
  const expectedSha256 = process.env.DOPPIO_JDK_TEST_SHA256;
  const replacementArchiveValue = process.env.DOPPIO_JDK_TEST_REPLACEMENT_ARCHIVE;
  const failReplace = process.env.DOPPIO_JDK_TEST_FAIL_REPLACE;
  if (!testRootValue || !archiveValue || !destinationValue || !expectedSha256) {
    throw new Error('All JDK test override variables must be provided.');
  }
  if (!path.isAbsolute(testRootValue) || !path.isAbsolute(archiveValue) || !path.isAbsolute(destinationValue)) {
    throw new Error('JDK test override paths must be absolute.');
  }
  if (replacementArchiveValue !== undefined && !path.isAbsolute(replacementArchiveValue)) {
    throw new Error('DOPPIO_JDK_TEST_REPLACEMENT_ARCHIVE must be absolute.');
  }
  if (!/^[0-9a-f]{64}$/.test(expectedSha256)) {
    throw new Error('DOPPIO_JDK_TEST_SHA256 must be a lowercase SHA-256 digest.');
  }
  if (failReplace !== undefined && failReplace !== 'after-backup') {
    throw new Error('DOPPIO_JDK_TEST_FAIL_REPLACE has an invalid test failpoint.');
  }

  const testRoot = path.resolve(testRootValue);
  const archivePath = path.resolve(archiveValue);
  const destinationRoot = path.resolve(destinationValue);
  const replacementArchivePath = replacementArchiveValue === undefined
    ? undefined
    : path.resolve(replacementArchiveValue);
  const rootStat = fs.lstatSync(testRoot);
  if (!rootStat.isDirectory()) {
    throw new Error('DOPPIO_JDK_TEST_ROOT must be a directory.');
  }
  const markerPath = path.join(testRoot, TEST_MARKER);
  if (readRegularFile(markerPath).toString('utf8') !== TEST_MARKER_CONTENT) {
    throw new Error('The JDK test root has an invalid fixture marker.');
  }
  if (
    !isWithin(testRoot, archivePath) ||
    !isWithin(testRoot, destinationRoot) ||
    (replacementArchivePath !== undefined && !isWithin(testRoot, replacementArchivePath))
  ) {
    throw new Error('JDK test archive, replacement, and destination must be contained by DOPPIO_JDK_TEST_ROOT.');
  }
  const archiveStat = fs.lstatSync(archivePath);
  const destinationStat = fs.lstatSync(destinationRoot);
  if (!archiveStat.isFile() || archiveStat.size === 0) {
    throw new Error('DOPPIO_JDK_TEST_ARCHIVE must be a non-empty regular file.');
  }
  if (!destinationStat.isDirectory()) {
    throw new Error('DOPPIO_JDK_TEST_DESTINATION must be an existing directory.');
  }
  if (replacementArchivePath !== undefined) {
    const replacementStat = fs.lstatSync(replacementArchivePath);
    if (!replacementStat.isFile() || replacementStat.size === 0) {
      throw new Error('DOPPIO_JDK_TEST_REPLACEMENT_ARCHIVE must be a non-empty regular file.');
    }
  }
  const realTestRoot = fs.realpathSync(testRoot);
  const realArchivePath = fs.realpathSync(archivePath);
  const realDestinationRoot = fs.realpathSync(destinationRoot);
  const realReplacementArchivePath = replacementArchivePath === undefined
    ? undefined
    : fs.realpathSync(replacementArchivePath);
  if (
    !isWithin(realTestRoot, realArchivePath) ||
    !isWithin(realTestRoot, realDestinationRoot) ||
    (realReplacementArchivePath !== undefined && !isWithin(realTestRoot, realReplacementArchivePath))
  ) {
    throw new Error('Resolved JDK test paths must remain contained by DOPPIO_JDK_TEST_ROOT.');
  }

  return {
    sourceUrl: url.format({protocol: 'file:', slashes: true, pathname: realArchivePath}),
    expectedSha256,
    destinationRoot: realDestinationRoot,
    localArchive: realArchivePath,
    replacementArchiveBeforeExtraction: realReplacementArchivePath,
    failReplaceAfterBackup: failReplace === 'after-backup'
  };
}

function normalizeClasspathEntry(entry: string): string {
  if (typeof entry !== 'string' || entry.length === 0 || entry.indexOf('\\') !== -1 || path.posix.isAbsolute(entry)) {
    throw new Error(`Unsafe JDK classpath entry: ${entry}`);
  }
  const segments = entry.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Unsafe JDK classpath entry: ${entry}`);
  }
  const normalized = path.posix.normalize(entry);
  if (normalized !== entry) {
    throw new Error(`Non-canonical JDK classpath entry: ${entry}`);
  }
  return normalized;
}

function validateClasspath(jdkHome: string, classpath: string[]): void {
  if (!Array.isArray(classpath) || classpath.length === 0 || classpath[0] !== 'lib/rt.jar') {
    throw new Error('JDK classpath must start with lib/rt.jar.');
  }
  const seen: {[entry: string]: boolean} = {};
  classpath.forEach((entry) => {
    const normalized = normalizeClasspathEntry(entry);
    if (seen[normalized]) {
      throw new Error(`Duplicate JDK classpath entry: ${normalized}`);
    }
    seen[normalized] = true;
    const absolutePath = path.resolve(jdkHome, ...normalized.split('/'));
    if (!isWithin(jdkHome, absolutePath)) {
      throw new Error(`JDK classpath escapes java_home: ${normalized}`);
    }
    const stat = fs.lstatSync(absolutePath);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`JDK classpath entry must be a non-empty regular file: ${normalized}`);
    }
  });
  if (!seen['lib/doppio.jar']) {
    throw new Error('JDK classpath must contain lib/doppio.jar.');
  }
}

function validateInstalledJdk(jdkHome: string, config: DownloadConfig): JdkInfo {
  const homeStat = fs.lstatSync(jdkHome);
  if (!homeStat.isDirectory()) {
    throw new Error(`${jdkHome} must be a directory.`);
  }
  const info = <JdkInfo> parseJsonFile(path.join(jdkHome, 'jdk.json'));
  const marker = <IntegrityMarker> parseJsonFile(path.join(jdkHome, INTEGRITY_FILE));
  if (info.url !== config.sourceUrl || info.sha256 !== config.expectedSha256) {
    throw new Error('JDK metadata does not match the configured source asset.');
  }
  if (
    marker.schema !== INTEGRITY_SCHEMA ||
    marker.url !== config.sourceUrl ||
    marker.sha256 !== config.expectedSha256 ||
    JSON.stringify(marker.classpath) !== JSON.stringify(info.classpath)
  ) {
    throw new Error('JDK integrity marker is missing or inconsistent.');
  }
  validateClasspath(jdkHome, info.classpath);
  if (
    marker.classpathSha256 === null ||
    typeof marker.classpathSha256 !== 'object' ||
    Array.isArray(marker.classpathSha256)
  ) {
    throw new Error('JDK integrity marker is missing classpath digests.');
  }
  const hashedEntries = info.classpath.filter((entry) => entry !== 'lib/doppio.jar').sort();
  if (JSON.stringify(Object.keys(marker.classpathSha256).sort()) !== JSON.stringify(hashedEntries)) {
    throw new Error('JDK integrity marker classpath digest entries are inconsistent.');
  }
  hashedEntries.forEach((entry) => {
    const expectedDigest = marker.classpathSha256[entry];
    if (!/^[0-9a-f]{64}$/.test(expectedDigest)) {
      throw new Error(`JDK integrity marker has an invalid digest for ${entry}.`);
    }
    const absolutePath = path.resolve(jdkHome, ...entry.split('/'));
    const actualDigest = sha256RegularFile(absolutePath);
    if (actualDigest !== expectedDigest) {
      throw new Error(`JDK classpath integrity check failed for ${entry}.`);
    }
  });
  return info;
}

function doesJDKExist(config: DownloadConfig): boolean {
  const jdkHome = path.join(config.destinationRoot, JDK_FOLDER);
  try {
    validateInstalledJdk(jdkHome, config);
    return true;
  } catch (_error) {
    return false;
  }
}

function ensureDestinationRoot(destinationRoot: string): void {
  if (!fs.existsSync(destinationRoot)) {
    (fs.mkdirSync as any)(destinationRoot, {recursive: true});
  }
  const stat = fs.lstatSync(destinationRoot);
  if (!stat.isDirectory()) {
    throw new Error(`${destinationRoot} must be a directory.`);
  }
}

function streamVerifiedArchive(
  input: any,
  archivePath: string,
  expectedSha256: string,
  expectedLength: number | null,
  callback: (error?: Error) => void
): void {
  const digest = crypto.createHash('sha256');
  let received = 0;
  const output = fs.createWriteStream(archivePath, {flags: 'wx', mode: 0o600});
  const meter = new stream.Transform({
    transform(chunk: Buffer, _encoding: string, done: (error?: Error, data?: Buffer) => void): void {
      received += chunk.length;
      if (received > MAX_ARCHIVE_BYTES) {
        done(new Error(`JDK archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`));
        return;
      }
      digest.update(chunk);
      done(undefined, chunk);
    }
  });

  (stream as any).pipeline(input, meter, output, (error?: Error) => {
    if (error) {
      callback(error);
      return;
    }
    if (expectedLength !== null && received !== expectedLength) {
      callback(new Error(`JDK archive length mismatch: expected ${expectedLength}, received ${received}.`));
      return;
    }
    const actualSha256 = digest.digest('hex');
    if (actualSha256 !== expectedSha256) {
      callback(new Error(`JDK archive SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}.`));
      return;
    }
    callback();
  });
}

function copyLocalArchive(config: DownloadConfig, archivePath: string, callback: (error?: Error) => void): void {
  try {
    const stat = fs.lstatSync(<string> config.localArchive);
    if (!stat.isFile() || stat.size === 0) {
      callback(new Error('The local JDK test archive must be a non-empty regular file.'));
      return;
    }
    streamVerifiedArchive(
      fs.createReadStream(<string> config.localArchive),
      archivePath,
      config.expectedSha256,
      stat.size,
      callback
    );
  } catch (error) {
    callback(<Error> error);
  }
}

interface HttpsDownloadState {
  activeRequest: any;
  activeResponse: any;
  callback: (error?: Error) => void;
  deadlineAt: number;
  deadlineMs: number;
  deadlineTimer: any;
  settled: boolean;
  streamingResponse: boolean;
}

function finishHttpsDownload(state: HttpsDownloadState, error?: Error): void {
  if (state.settled) {
    return;
  }
  state.settled = true;
  clearTimeout(state.deadlineTimer);
  state.activeRequest = null;
  state.activeResponse = null;
  state.callback(error);
}

function abortHttpsDownload(state: HttpsDownloadState): void {
  if (state.settled) {
    return;
  }
  const error = new Error(`JDK download exceeded its absolute deadline of ${state.deadlineMs}ms.`);
  const request = state.activeRequest;
  const response = state.activeResponse;
  if (request !== null) {
    request.destroy(error);
  }
  if (response !== null) {
    response.destroy(error);
  }
  if (!state.streamingResponse) {
    finishHttpsDownload(state, error);
  }
}

function downloadHttpsArchiveAttempt(
  downloadUrl: string,
  redirects: number,
  archivePath: string,
  expectedSha256: string,
  state: HttpsDownloadState
): void {
  if (Date.now() >= state.deadlineAt) {
    abortHttpsDownload(state);
    return;
  }
  const parsed = url.parse(downloadUrl);
  if (parsed.protocol !== 'https:') {
    finishHttpsDownload(state, new Error(`Refusing non-HTTPS JDK URL: ${downloadUrl}`));
    return;
  }

  let request: any;
  try {
    request = (https as any).get(downloadUrl, (response: any) => {
      if (state.settled || request !== state.activeRequest) {
        response.destroy();
        return;
      }
      state.activeResponse = response;
      const statusCode = response.statusCode;
      if ([301, 302, 303, 307, 308].indexOf(statusCode) !== -1) {
        const location = response.headers.location;
        response.destroy();
        if (redirects >= MAX_REDIRECTS) {
          finishHttpsDownload(state, new Error(`JDK download exceeded ${MAX_REDIRECTS} redirects.`));
          return;
        }
        if (typeof location !== 'string' || location.length === 0) {
          finishHttpsDownload(state, new Error(`JDK redirect ${statusCode} is missing Location.`));
          return;
        }
        const redirectedUrl = url.resolve(downloadUrl, location);
        if (url.parse(redirectedUrl).protocol !== 'https:') {
          finishHttpsDownload(state, new Error(`Refusing JDK redirect to non-HTTPS URL: ${redirectedUrl}`));
          return;
        }
        request.destroy();
        state.activeRequest = null;
        state.activeResponse = null;
        downloadHttpsArchiveAttempt(redirectedUrl, redirects + 1, archivePath, expectedSha256, state);
        return;
      }
      if (statusCode !== 200) {
        response.destroy();
        finishHttpsDownload(state, new Error(`JDK download returned HTTP ${statusCode}.`));
        return;
      }

      const lengthHeader = response.headers['content-length'];
      let expectedLength: number | null = null;
      if (lengthHeader !== undefined) {
        if (!/^[0-9]+$/.test(String(lengthHeader))) {
          response.destroy();
          finishHttpsDownload(state, new Error('JDK download returned an invalid Content-Length header.'));
          return;
        }
        expectedLength = parseInt(String(lengthHeader), 10);
        if (expectedLength > MAX_ARCHIVE_BYTES) {
          response.destroy();
          finishHttpsDownload(state, new Error(`JDK archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`));
          return;
        }
      }
      state.streamingResponse = true;
      streamVerifiedArchive(response, archivePath, expectedSha256, expectedLength, (error?: Error) => {
        state.streamingResponse = false;
        if (request === state.activeRequest) {
          state.activeRequest = null;
          state.activeResponse = null;
        }
        finishHttpsDownload(state, error);
      });
    });
    state.activeRequest = request;
    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`JDK download timed out after ${REQUEST_TIMEOUT_MS}ms.`));
    });
    request.on('error', (error: Error) => {
      if (state.settled || request !== state.activeRequest) {
        return;
      }
      if (state.streamingResponse && state.activeResponse !== null) {
        state.activeResponse.destroy(error);
        return;
      }
      finishHttpsDownload(state, error);
    });
  } catch (error) {
    finishHttpsDownload(state, <Error> error);
    return;
  }
}

function downloadHttpsArchive(
  downloadUrl: string,
  archivePath: string,
  expectedSha256: string,
  deadlineMs: number,
  callback: (error?: Error) => void
): void {
  const state: HttpsDownloadState = {
    activeRequest: null,
    activeResponse: null,
    callback,
    deadlineAt: Date.now() + deadlineMs,
    deadlineMs,
    deadlineTimer: null,
    settled: false,
    streamingResponse: false
  };
  state.deadlineTimer = setTimeout(() => abortHttpsDownload(state), deadlineMs);
  downloadHttpsArchiveAttempt(downloadUrl, 0, archivePath, expectedSha256, state);
}

function normalizeArchiveEntry(name: string): string {
  if (typeof name !== 'string' || name.length === 0 || name.indexOf('\0') !== -1 || name.indexOf('\\') !== -1) {
    throw new Error(`Unsafe JDK archive entry: ${name}`);
  }
  if (path.posix.isAbsolute(name) || /^[A-Za-z]:/.test(name)) {
    throw new Error(`Absolute JDK archive entry is forbidden: ${name}`);
  }
  const withoutTrailingSlash = name.replace(/\/+$/, '');
  const segments = withoutTrailingSlash.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Traversal or non-canonical JDK archive entry: ${name}`);
  }
  const normalized = path.posix.normalize(withoutTrailingSlash);
  if (normalized !== withoutTrailingSlash || (normalized !== JDK_FOLDER && !normalized.startsWith(`${JDK_FOLDER}/`))) {
    throw new Error(`JDK archive entry must be contained by ${JDK_FOLDER}: ${name}`);
  }
  return normalized;
}

function extractVerifiedArchive(
  archivePath: string,
  destination: string,
  expectedSha256: string,
  callback: (error?: Error) => void
): void {
  (fs.mkdirSync as any)(destination, {recursive: true});
  const digest = crypto.createHash('sha256');
  let received = 0;
  const names: {[name: string]: string} = {};
  let validationError: Error = null;
  let entryCount = 0;
  let extractedBytes = 0;
  const meter = new stream.Transform({
    transform(chunk: Buffer, _encoding: string, done: (error?: Error, data?: Buffer) => void): void {
      received += chunk.length;
      if (received > MAX_ARCHIVE_BYTES) {
        done(new Error(`JDK archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`));
        return;
      }
      digest.update(chunk);
      done(undefined, chunk);
    }
  });
  const source = fs.createReadStream(archivePath);
  const gunzip = zlib.createGunzip();
  const extractor = tarStream.extract();
  extractor.on('entry', (header: any, entryStream: any, next: () => void) => {
    let normalized: string;
    try {
      normalized = normalizeArchiveEntry(header.name);
      if (header.type !== 'file' && header.type !== 'directory') {
        throw new Error(`Unsupported JDK archive entry type ${header.type}: ${normalized}`);
      }
      if (names[normalized]) {
        throw new Error(`Duplicate JDK archive entry: ${normalized}`);
      }
      entryCount += 1;
      if (entryCount > MAX_ARCHIVE_ENTRIES) {
        throw new Error(`JDK archive exceeds ${MAX_ARCHIVE_ENTRIES} entries.`);
      }
      if (
        typeof header.size !== 'number' ||
        !Number.isSafeInteger(header.size) ||
        header.size < 0 ||
        (header.type === 'directory' && header.size !== 0)
      ) {
        throw new Error(`Invalid JDK archive file size: ${normalized}`);
      }
      if (header.type === 'file') {
        extractedBytes += header.size;
        if (extractedBytes > MAX_EXTRACTED_BYTES) {
          throw new Error(`JDK archive expands beyond ${MAX_EXTRACTED_BYTES} bytes.`);
        }
      }
      names[normalized] = header.type;
    } catch (error) {
      validationError = <Error> error;
      entryStream.resume();
      extractor.destroy(validationError);
      return;
    }

    const absolutePath = path.resolve(destination, ...normalized.split('/'));
    const archiveMode = typeof header.mode === 'number' ? header.mode : 0;
    const mode = (archiveMode | (header.type === 'directory' ? 0o777 : 0o666)) & ~process.umask();
    try {
      if (!isWithin(destination, absolutePath)) {
        throw new Error(`JDK archive entry escapes extraction root: ${normalized}`);
      }
      if (header.type === 'directory') {
        (fs.mkdirSync as any)(absolutePath, {recursive: true, mode});
        fs.chmodSync(absolutePath, mode);
        entryStream.on('error', (error: Error) => extractor.destroy(error));
        entryStream.on('end', next);
        entryStream.resume();
        return;
      }
      (fs.mkdirSync as any)(path.dirname(absolutePath), {recursive: true});
      const output = fs.createWriteStream(absolutePath, {flags: 'wx', mode});
      (stream as any).pipeline(entryStream, output, (error?: Error) => {
        if (error) {
          extractor.destroy(error);
          return;
        }
        try {
          fs.chmodSync(absolutePath, mode);
          next();
        } catch (chmodError) {
          extractor.destroy(<Error> chmodError);
        }
      });
    } catch (error) {
      entryStream.resume();
      extractor.destroy(<Error> error);
    }
  });
  (stream as any).pipeline(source, meter, gunzip, extractor, (error?: Error) => {
    if (error) {
      callback(validationError || error);
      return;
    }
    const actualSha256 = digest.digest('hex');
    if (actualSha256 !== expectedSha256) {
      callback(new Error(`JDK archive SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}.`));
      return;
    }
    if (names[`${JDK_FOLDER}/lib/rt.jar`] !== 'file') {
      callback(new Error('JDK archive is missing java_home/lib/rt.jar.'));
      return;
    }
    callback();
  });
}

function validateExtractedTree(root: string): void {
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory()) {
    throw new Error(`${root} must be an extracted directory.`);
  }
  fs.readdirSync(root).forEach((entry) => {
    const entryPath = path.join(root, entry);
    const entryStat = fs.lstatSync(entryPath);
    if (entryStat.isDirectory()) {
      validateExtractedTree(entryPath);
    } else if (!entryStat.isFile()) {
      throw new Error(`Extracted JDK contains a non-regular entry: ${entryPath}`);
    }
  });
}

function listJarClasspath(jdkHome: string): string[] {
  const relativeDirectories = ['lib', 'lib/ext'];
  const classpath: string[] = [];
  relativeDirectories.forEach((relativeDirectory) => {
    const directory = path.join(jdkHome, ...relativeDirectory.split('/'));
    const entries = fs.readdirSync(directory).sort();
    entries.forEach((entry) => {
      if (path.extname(entry).toLowerCase() === '.jar') {
        classpath.push(`${relativeDirectory}/${entry}`);
      }
    });
  });
  const rtIndex = classpath.indexOf('lib/rt.jar');
  if (rtIndex === -1) {
    throw new Error('Extracted JDK is missing lib/rt.jar.');
  }
  classpath.splice(rtIndex, 1);
  classpath.unshift('lib/rt.jar');
  validateClasspath(jdkHome, classpath);
  return classpath;
}

function writeMetadata(jdkHome: string, config: DownloadConfig): void {
  const classpath = listJarClasspath(jdkHome);
  const info: JdkInfo = {
    url: config.sourceUrl,
    sha256: config.expectedSha256,
    classpath
  };
  const marker: IntegrityMarker = {
    schema: INTEGRITY_SCHEMA,
    url: info.url,
    sha256: info.sha256,
    classpath: info.classpath,
    classpathSha256: {}
  };
  classpath.forEach((entry) => {
    if (entry !== 'lib/doppio.jar') {
      marker.classpathSha256[entry] = sha256RegularFile(path.resolve(jdkHome, ...entry.split('/')));
    }
  });
  fs.writeFileSync(path.join(jdkHome, 'jdk.json'), `${JSON.stringify(info)}\n`, {mode: 0o644});
  fs.writeFileSync(path.join(jdkHome, INTEGRITY_FILE), `${JSON.stringify(marker)}\n`, {mode: 0o644});
  fs.writeFileSync(
    path.join(jdkHome, 'jdk.json.d.ts'),
`declare let JDKInfo: {
  url: string;
  sha256: string;
  classpath: string[];
};
export = JDKInfo;
`,
    {mode: 0o644}
  );
  validateInstalledJdk(jdkHome, config);
}

function replaceJdk(stagedJdkHome: string, config: DownloadConfig, workDirectory: string): void {
  const finalJdkHome = path.join(config.destinationRoot, JDK_FOLDER);
  const backupJdkHome = path.join(workDirectory, 'previous-java-home');
  let movedExisting = false;
  try {
    if (fs.existsSync(finalJdkHome)) {
      fs.renameSync(finalJdkHome, backupJdkHome);
      movedExisting = true;
    }
    if (movedExisting && config.failReplaceAfterBackup) {
      throw new Error('Injected JDK replacement failure after backup for transaction testing.');
    }
    fs.renameSync(stagedJdkHome, finalJdkHome);
  } catch (error) {
    if (movedExisting && !fs.existsSync(finalJdkHome) && fs.existsSync(backupJdkHome)) {
      try {
        fs.renameSync(backupJdkHome, finalJdkHome);
      } catch (rollbackError) {
        throw new Error(`JDK replacement failed (${error}) and rollback failed (${rollbackError}).`);
      }
    }
    throw error;
  }
}

function installJdk(config: DownloadConfig, callback: (error?: Error) => void): void {
  let workDirectory: string;
  try {
    ensureDestinationRoot(config.destinationRoot);
    workDirectory = fs.mkdtempSync(path.join(config.destinationRoot, '.doppio-jdk-install-'));
  } catch (error) {
    callback(<Error> error);
    return;
  }
  const archivePath = path.join(workDirectory, 'java_home.tar.gz');
  const extractRoot = path.join(workDirectory, 'extract');
  let completed = false;

  function finish(error?: Error): void {
    if (completed) {
      return;
    }
    completed = true;
    try {
      (rimraf as any).sync(workDirectory);
    } catch (cleanupError) {
      if (!error) {
        error = <Error> cleanupError;
      }
    }
    callback(error);
  }

  const downloaded = (downloadError?: Error): void => {
    if (downloadError) {
      finish(downloadError);
      return;
    }
    try {
      // Reproduce replacement at the boundary where the legacy validator
      // handed a pathname back to a separately opened extraction pass.
      if (config.replacementArchiveBeforeExtraction) {
        fs.renameSync(config.replacementArchiveBeforeExtraction, archivePath);
      }
    } catch (error) {
      finish(<Error> error);
      return;
    }
    extractVerifiedArchive(archivePath, extractRoot, config.expectedSha256, (extractError?: Error) => {
      if (extractError) {
        finish(extractError);
        return;
      }
      try {
        const stagedJdkHome = path.join(extractRoot, JDK_FOLDER);
        validateExtractedTree(stagedJdkHome);
        writeMetadata(stagedJdkHome, config);
        replaceJdk(stagedJdkHome, config, workDirectory);
        finish();
      } catch (error) {
        finish(<Error> error);
      }
    });
  };

  if (config.localArchive) {
    copyLocalArchive(config, archivePath, downloaded);
  } else {
    downloadHttpsArchive(
      config.sourceUrl,
      archivePath,
      config.expectedSha256,
      DOWNLOAD_DEADLINE_MS,
      downloaded
    );
  }
}

let config: DownloadConfig;
try {
  config = loadConfig();
  if (doesJDKExist(config)) {
    console.log('JDK is up-to-date and passed integrity checks.');
  } else {
    console.log('JDK is missing, stale, or failed integrity checks. Installing a verified copy...');
    installJdk(config, (error?: Error) => {
      if (error) {
        console.error(`Failed to install verified JDK: ${error.message}`);
        process.exitCode = 1;
      } else {
        console.log('Successfully installed verified JDK.');
      }
    });
  }
} catch (error) {
  console.error(`Failed to configure JDK download: ${(<Error> error).message}`);
  process.exitCode = 1;
}
