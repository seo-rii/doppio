import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import {
  inspectArchive, prepareToolchains, sha256File, treeDigest, validateLock,
} from './prepare_java_compatibility_toolchains.mjs';

function fixture(t, { changeJava, changeJavac, extraTarArguments = [], symlink = false } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-toolchains-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const lock = { schemaVersion: 1, platform: 'linux-x64', toolchains: [] };
  for (const feature of [21, 25]) {
    const version = `${feature}.0.1`;
    const build = `${version}.1.1`;
    const archiveRoot = `amazon-corretto-${build}-linux-x64`;
    const home = path.join(directory, archiveRoot);
    fs.mkdirSync(path.join(home, 'bin'), { recursive: true });
    for (const executable of ['java', 'javac']) {
      const output = executable === 'java'
        ? `openjdk version "${changeJava || version}"`
        : `javac ${changeJavac || version}`;
      fs.writeFileSync(path.join(home, 'bin', executable), `#!/bin/sh\nprintf '%s\\n' '${output}'\n`, { mode: 0o755 });
    }
    fs.writeFileSync(path.join(home, 'release'), `JAVA_VERSION="${version}"\nIMPLEMENTOR="Amazon.com Inc."\n`);
    const treeSha256 = treeDigest(home);
    if (symlink) fs.symlinkSync('java', path.join(home, 'bin', 'link'));
    const archive = path.join(directory, `jdk${feature}.tar.gz`);
    const result = spawnSync('tar', [
      '--create', '--gzip', '--file', archive, '--directory', directory,
      ...extraTarArguments, archiveRoot,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    lock.toolchains.push({
      id: `jdk${feature}`, feature, vendor: 'Amazon Corretto', version, build,
      archiveRoot, url: pathToFileURL(archive).href,
      archiveSize: fs.statSync(archive).size, archiveSha256: sha256File(archive), treeSha256,
    });
  }
  const lockPath = path.join(directory, 'lock.json');
  const cache = path.join(directory, 'cache');
  function saveLock() {
    fs.writeFileSync(lockPath, JSON.stringify(lock));
  }
  saveLock();
  return { directory, lock, lockPath, cache, saveLock, options: { lockPath, cache, allowFileUrls: true } };
}

test('prepares both pinned toolchains and re-verifies the complete cache without downloading', async (t) => {
  const setup = fixture(t);
  const marker = await prepareToolchains(setup.options);
  assert.equal(marker.schemaVersion, 1);
  assert.equal(marker.lockSha256, sha256File(setup.lockPath));
  assert.deepEqual(marker.toolchains.map(({ id, feature }) => [id, feature]), [['jdk21', 21], ['jdk25', 25]]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(setup.cache, 'toolchains.json'))), marker);
  for (const toolchain of setup.lock.toolchains) fs.unlinkSync(new URL(toolchain.url));
  assert.deepEqual(await prepareToolchains(setup.options), marker);
});

test('refuses malformed metadata, unpinned URLs, and test URLs in production', (t) => {
  const { lock } = fixture(t);
  assert.throws(() => validateLock(lock), /pinned official/);
  validateLock(lock, { allowFileUrls: true });
  const bad = structuredClone(lock);
  bad.toolchains[0].url = 'https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jdk.tar.gz';
  assert.throws(() => validateLock(bad), /pinned official/);
  bad.toolchains[0].feature = 17;
  assert.throws(() => validateLock(bad, { allowFileUrls: true }), /metadata/);
  bad.toolchains[0] = { ...lock.toolchains[0], archiveSize: 513 * 1024 * 1024 };
  assert.throws(() => validateLock(bad, { allowFileUrls: true }), /512 MiB/);
  bad.toolchains[0] = { ...lock.toolchains[0], treeSha256: 'no digest' };
  assert.throws(() => validateLock(bad, { allowFileUrls: true }), /treeSha256/);
});

test('rejects an archive hash mismatch before extracting and removes only its private temporary directory', async (t) => {
  const setup = fixture(t);
  setup.lock.toolchains[0].archiveSha256 = '0'.repeat(64);
  setup.saveLock();
  fs.mkdirSync(setup.cache);
  fs.writeFileSync(path.join(setup.cache, 'unrelated.txt'), 'keep');
  await assert.rejects(prepareToolchains(setup.options), /archive SHA-256 mismatch/);
  assert.deepEqual(fs.readdirSync(setup.cache), ['unrelated.txt']);
});

test('bounds streaming downloads by locked size and rejects truncated archives', async (t) => {
  const setup = fixture(t);
  setup.lock.toolchains[0].archiveSize -= 1;
  setup.saveLock();
  await assert.rejects(prepareToolchains(setup.options), /exceeds locked size/);
  setup.lock.toolchains[0].archiveSize += 2;
  setup.saveLock();
  await assert.rejects(prepareToolchains(setup.options), /archive size mismatch/);
  assert.deepEqual(fs.readdirSync(setup.cache), []);
});

test('rejects a lying HTTP Content-Length before reading the body', async (t) => {
  const setup = fixture(t);
  for (const toolchain of setup.lock.toolchains) {
    toolchain.url = `https://corretto.aws/downloads/resources/${toolchain.build}/${toolchain.archiveRoot}.tar.gz`;
  }
  setup.saveLock();
  let cancelled = false;
  await assert.rejects(prepareToolchains({
    ...setup.options, allowFileUrls: false,
    fetchImpl: async () => ({
      status: 200, ok: true,
      headers: new Headers({ 'content-length': '999999999' }),
      body: { cancel: async () => { cancelled = true; } },
    }),
  }), /Content-Length/);
  assert.equal(cancelled, true);
});

test('rejects link entries even if the archive digest matches', async (t) => {
  const setup = fixture(t, { symlink: true });
  await assert.rejects(prepareToolchains(setup.options), /unsupported entry type/);
  assert.deepEqual(fs.readdirSync(setup.cache), []);
});

test('rejects traversal archive names before extraction', (t) => {
  const setup = fixture(t, { extraTarArguments: ['--transform=s|amazon-corretto-[^/]*/bin/java$|../escaped|'] });
  const toolchain = setup.lock.toolchains[0];
  assert.throws(() => inspectArchive(new URL(toolchain.url).pathname, toolchain.archiveRoot), /unsafe|Unable to inspect/);
  assert.equal(fs.existsSync(path.join(setup.directory, 'escaped')), false);
});

test('rejects an extracted tree mismatch and an incorrect executable version', async (t) => {
  const setup = fixture(t);
  setup.lock.toolchains[0].treeSha256 = '0'.repeat(64);
  setup.saveLock();
  await assert.rejects(prepareToolchains(setup.options), /extracted tree SHA-256 mismatch/);
  const wrongVersion = fixture(t, { changeJava: '17.0.1' });
  await assert.rejects(prepareToolchains(wrongVersion.options), /java -version does not match/);
  const wrongCompiler = fixture(t, { changeJavac: '17.0.1' });
  await assert.rejects(prepareToolchains(wrongCompiler.options), /javac -version does not match/);
});

test('includes owner execute permission in the verified tree digest', async (t) => {
  const setup = fixture(t);
  const marker = await prepareToolchains(setup.options);
  fs.chmodSync(path.join(marker.toolchains[0].home, 'bin', 'java'), 0o655);
  await assert.rejects(prepareToolchains(setup.options), /extracted tree SHA-256 mismatch/);
});

test('fails closed on cached archive or library corruption without deleting cache data', async (t) => {
  const setup = fixture(t);
  const marker = await prepareToolchains(setup.options);
  const home = marker.toolchains[0].home;
  fs.writeFileSync(path.join(home, 'release'), 'corrupt');
  await assert.rejects(prepareToolchains(setup.options), /extracted tree SHA-256 mismatch/);
  assert.equal(fs.readFileSync(path.join(home, 'release'), 'utf8'), 'corrupt');
  const archive = path.join(path.dirname(home), 'archive.tar.gz');
  fs.appendFileSync(archive, 'corrupt');
  await assert.rejects(prepareToolchains(setup.options), /cached archive checksum or size mismatch/);
  assert.ok(fs.existsSync(archive));
});

test('rejects a symlinked cache root and unexpected cached links', async (t) => {
  const setup = fixture(t);
  const elsewhere = path.join(setup.directory, 'elsewhere');
  fs.mkdirSync(elsewhere);
  fs.symlinkSync(elsewhere, setup.cache);
  await assert.rejects(prepareToolchains(setup.options), /real directory/);
  fs.unlinkSync(setup.cache);
  const marker = await prepareToolchains(setup.options);
  fs.symlinkSync('/tmp', path.join(marker.toolchains[0].home, 'outside'));
  await assert.rejects(prepareToolchains(setup.options), /Unsupported link or device/);
});
