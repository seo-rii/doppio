import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maximumArchiveBytes = 512 * 1024 * 1024;
const maximumExtractedBytes = 2 * 1024 * 1024 * 1024;
const maximumArchiveEntries = 20_000;

function fail(message) {
  throw new Error(message);
}

export function sha256File(filename) {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(filename, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const count = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
}

function requireRegularFile(filename) {
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.nlink !== 1) fail(`Expected an unlinked regular file: ${filename}`);
  return stat;
}

function archiveUrl(value, toolchain, allowFileUrls) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`Invalid toolchain URL for ${toolchain.id}.`);
  }
  if (allowFileUrls && url.protocol === 'file:' && !url.hostname) return url;
  if (
    url.protocol !== 'https:' || url.hostname !== 'corretto.aws' ||
    url.port || url.username || url.password || url.search || url.hash ||
    url.pathname !== `/downloads/resources/${toolchain.build}/${toolchain.archiveRoot}.tar.gz`
  ) {
    fail(`${toolchain.id} must use its pinned official Corretto archive URL.`);
  }
  return url;
}

export function validateLock(lock, { allowFileUrls = false } = {}) {
  if (lock?.schemaVersion !== 1 || lock.platform !== 'linux-x64' ||
      !Array.isArray(lock.toolchains) || lock.toolchains.length !== 2) {
    fail('Toolchain lock must use schemaVersion 1, linux-x64, and exactly JDK 21 and JDK 25.');
  }
  for (const [index, toolchain] of lock.toolchains.entries()) {
    const feature = [21, 25][index];
    if (toolchain?.id !== `jdk${feature}` || toolchain.feature !== feature ||
        toolchain.vendor !== 'Amazon Corretto' ||
        !new RegExp(`^${feature}\\.[0-9]+\\.[0-9]+$`).test(toolchain.version || '') ||
        !new RegExp(`^${toolchain.version.replaceAll('.', '\\.')}\\.[0-9]+\\.[0-9]+$`).test(toolchain.build || '') ||
        toolchain.archiveRoot !== `amazon-corretto-${toolchain.build}-linux-x64`) {
      fail(`Invalid toolchain metadata for JDK ${feature}.`);
    }
    for (const field of ['archiveSha256', 'treeSha256']) {
      if (!/^[0-9a-f]{64}$/.test(toolchain[field] || '')) fail(`${toolchain.id} ${field} must be a SHA-256 digest.`);
    }
    if (!Number.isSafeInteger(toolchain.archiveSize) || toolchain.archiveSize <= 0 ||
        toolchain.archiveSize > maximumArchiveBytes) {
      fail(`${toolchain.id} archiveSize must be between 1 byte and 512 MiB.`);
    }
    archiveUrl(toolchain.url, toolchain, allowFileUrls);
  }
}

function runTar(args) {
  const result = spawnSync('tar', args, {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120_000,
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC', TAR_OPTIONS: '' },
  });
  if (result.error || result.status !== 0 || result.stderr) {
    fail(`Unable to inspect or extract toolchain archive: ${result.error?.message || result.stderr || result.status}`);
  }
  return result.stdout;
}

export function inspectArchive(archive, archiveRoot) {
  const listing = runTar([
    '--list', '--verbose', '--numeric-owner', '--full-time', '--quoting-style=escape',
    '--gzip', '--file', archive,
  ]).trimEnd().split('\n');
  if (listing.length > maximumArchiveEntries) fail('Toolchain archive has too many entries.');
  let expandedSize = 0;
  const paths = new Set();
  for (const line of listing) {
    // These pinned archives contain only regular files and directories. Reject
    // links, devices, escaped names, duplicate entries, and path traversal.
    const match = /^([-d])[rwxStTs-]{9} [0-9]+\/[0-9]+ +([0-9]+) [0-9-]+ [0-9:.]+ (.+)$/.exec(line);
    if (!match) fail('Toolchain archive contains an unsupported entry type or name.');
    const [, type, size, entry] = match;
    const normalized = entry.replace(/\/$/, '');
    if (!/^[A-Za-z0-9_./+=$@,-]+$/.test(normalized) ||
        (normalized !== archiveRoot && !normalized.startsWith(`${archiveRoot}/`)) ||
        path.posix.normalize(normalized) !== normalized ||
        normalized.split('/').some((part) => part === '..' || part === '.') ||
        (type === '-' && entry.endsWith('/')) || paths.has(normalized)) {
      fail(`Toolchain archive contains an unsafe or duplicate path: ${entry}`);
    }
    paths.add(normalized);
    expandedSize += Number(size);
    if (!Number.isSafeInteger(expandedSize) || expandedSize > maximumExtractedBytes) {
      fail('Toolchain archive exceeds the 2 GiB extracted size limit.');
    }
  }
  for (const required of ['bin/java', 'bin/javac', 'release']) {
    if (!paths.has(`${archiveRoot}/${required}`)) fail(`Toolchain archive is missing ${required}.`);
  }
}

export function treeDigest(home) {
  const rootStat = fs.lstatSync(home);
  if (!rootStat.isDirectory()) fail(`Expected a real toolchain directory: ${home}`);
  const entries = [];
  let totalSize = 0;
  function visit(directory, relativeDirectory) {
    for (const name of fs.readdirSync(directory).sort()) {
      const filename = path.join(directory, name);
      const relative = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const stat = fs.lstatSync(filename);
      if (stat.isDirectory()) {
        entries.push([relative, 'directory']);
        visit(filename, relative);
      } else if (stat.isFile() && stat.nlink === 1) {
        totalSize += stat.size;
        if (totalSize > maximumExtractedBytes) fail('Extracted toolchain exceeds 2 GiB.');
        // Owner execute permission is stable across both 022 and private 077
        // umasks, unlike group/other permissions applied during extraction.
        entries.push([relative, 'file', Boolean(stat.mode & 0o100), sha256File(filename)]);
      } else {
        fail(`Unsupported link or device in extracted toolchain: ${relative}`);
      }
      if (entries.length > maximumArchiveEntries) fail('Extracted toolchain has too many entries.');
    }
  }
  visit(home, '');
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

function verifyHome(home, toolchain) {
  if (treeDigest(home) !== toolchain.treeSha256) fail(`${toolchain.id} extracted tree SHA-256 mismatch.`);
  const release = fs.readFileSync(path.join(home, 'release'), 'utf8');
  if (!release.split('\n').includes(`JAVA_VERSION="${toolchain.version}"`) ||
      !release.split('\n').includes('IMPLEMENTOR="Amazon.com Inc."')) {
    fail(`${toolchain.id} release metadata does not match the locked version and vendor.`);
  }
  const env = { ...process.env, JAVA_HOME: home, LC_ALL: 'C' };
  for (const name of ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'CLASSPATH']) delete env[name];
  for (const executable of ['java', 'javac']) {
    const result = spawnSync(path.join(home, 'bin', executable), ['-version'], {
      encoding: 'utf8', maxBuffer: 64 * 1024, timeout: 30_000, env,
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    const pattern = executable === 'java'
      ? /(?:openjdk|java) version "([^"]+)"/
      : /(?:^|\n)javac ([^\s]+)(?:\s|$)/;
    if (result.error || result.status !== 0 || pattern.exec(output)?.[1] !== toolchain.version) {
      fail(`${toolchain.id} ${executable} -version does not match ${toolchain.version}.`);
    }
  }
}

async function downloadArchive(toolchain, destination, { allowFileUrls, fetchImpl }) {
  const url = archiveUrl(toolchain.url, toolchain, allowFileUrls);
  let source;
  if (url.protocol === 'file:') {
    source = fs.createReadStream(fileURLToPath(url));
  } else {
    // Versioned Corretto resources do not redirect. Fail closed if this changes.
    const response = await fetchImpl(url, {
      redirect: 'error', signal: AbortSignal.timeout(600_000),
      headers: { 'user-agent': 'doppio-java-compatibility-ci' },
    });
    const contentLength = response.headers.get('content-length');
    if (!response.ok || !response.body ||
        (contentLength !== null && Number(contentLength) !== toolchain.archiveSize)) {
      await response.body?.cancel();
      fail(`${toolchain.id} download failed or Content-Length differs from locked size (HTTP ${response.status}).`);
    }
    source = Readable.fromWeb(response.body);
  }
  const hash = crypto.createHash('sha256');
  let size = 0;
  const meter = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > toolchain.archiveSize) {
        callback(new Error(`${toolchain.id} download exceeds locked size.`));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(source, meter, fs.createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
  if (size !== toolchain.archiveSize) fail(`${toolchain.id} archive size mismatch.`);
  if (hash.digest('hex') !== toolchain.archiveSha256) fail(`${toolchain.id} archive SHA-256 mismatch.`);
}

export async function prepareToolchains({
  lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'),
  cache = path.join(repoRoot, 'build/java-compatibility-toolchains'),
  allowFileUrls = false,
  fetchImpl = fetch,
} = {}) {
  if (process.platform !== 'linux' || process.arch !== 'x64') fail('Compatibility toolchains currently require Linux x64.');
  const lockBytes = fs.readFileSync(lockPath);
  const lock = JSON.parse(lockBytes);
  validateLock(lock, { allowFileUrls });
  cache = path.resolve(cache);
  fs.mkdirSync(cache, { recursive: true, mode: 0o700 });
  if (!fs.lstatSync(cache).isDirectory()) fail('Toolchain cache must be a real directory.');
  const toolchains = [];
  for (const toolchain of lock.toolchains) {
    const directory = path.join(cache, `${toolchain.id}-${toolchain.archiveSha256}`);
    const home = path.join(directory, toolchain.archiveRoot);
    if (fs.existsSync(directory)) {
      if (!fs.lstatSync(directory).isDirectory()) fail(`Unsafe existing ${toolchain.id} cache entry.`);
      const archive = path.join(directory, 'archive.tar.gz');
      if (requireRegularFile(archive).size !== toolchain.archiveSize || sha256File(archive) !== toolchain.archiveSha256) {
        fail(`${toolchain.id} cached archive checksum or size mismatch; use a fresh cache directory.`);
      }
      verifyHome(home, toolchain);
    } else {
      const temporary = fs.mkdtempSync(path.join(cache, '.prepare-'));
      fs.chmodSync(temporary, 0o700);
      try {
        const archive = path.join(temporary, 'archive.tar.gz');
        await downloadArchive(toolchain, archive, { allowFileUrls, fetchImpl });
        inspectArchive(archive, toolchain.archiveRoot);
        runTar([
          '--extract', '--gzip', '--file', archive, '--directory', temporary,
          '--no-same-owner', '--no-same-permissions', '--delay-directory-restore',
        ]);
        verifyHome(path.join(temporary, toolchain.archiveRoot), toolchain);
        fs.renameSync(temporary, directory);
      } finally {
        // Only remove the private directory created by this invocation. Existing
        // caches are never recursively replaced or deleted on verification errors.
        fs.rmSync(temporary, { recursive: true, force: true });
      }
    }
    toolchains.push({
      id: toolchain.id, feature: toolchain.feature, vendor: toolchain.vendor,
      version: toolchain.version, archiveSha256: toolchain.archiveSha256, home,
    });
    console.log(`${toolchain.id} ${toolchain.version}: archive, extracted tree, java and javac verified.`);
  }
  const marker = {
    schemaVersion: 1,
    lockSha256: crypto.createHash('sha256').update(lockBytes).digest('hex'),
    toolchains,
  };
  const markerPath = path.join(cache, 'toolchains.json');
  if (fs.existsSync(markerPath)) requireRegularFile(markerPath);
  const temporaryMarker = path.join(cache, `.toolchains-${crypto.randomUUID()}.json`);
  try {
    fs.writeFileSync(temporaryMarker, `${JSON.stringify(marker, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporaryMarker, markerPath);
  } finally {
    fs.rmSync(temporaryMarker, { force: true });
  }
  return marker;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let index = 2; index < process.argv.length; index += 2) {
      const name = process.argv[index];
      const value = process.argv[index + 1];
      if (!['--lock', '--cache'].includes(name) || !value || value.startsWith('--') || options[name]) {
        fail(`Invalid or duplicate option ${name}; expected --lock <path> and/or --cache <directory>.`);
      }
      options[name] = value;
    }
    await prepareToolchains({
      ...(options['--lock'] ? { lockPath: path.resolve(options['--lock']) } : {}),
      ...(options['--cache'] ? { cache: path.resolve(options['--cache']) } : {}),
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
