'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const stream = require('node:stream/promises');
const zlib = require('node:zlib');
const typescript = require('typescript');

const repoRoot = path.resolve(__dirname, '..');
const downloaderSourcePath = path.join(repoRoot, 'console', 'download_jdk.ts');
const tarFsPackage = require.resolve('tar-fs/package.json');
const tarStream = require(require.resolve('tar-stream', {
  paths: [path.dirname(tarFsPackage)]
}));
const fixtureMarkerName = '.doppio-jdk-download-test-fixture';
const fixtureMarkerContents = 'doppio-jdk-download-test-fixture-v1\n';
const integrityMarkerName = '.doppio-jdk-integrity.json';

function sha256(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function compileDownloader(outputPath) {
  const source = fs.readFileSync(downloaderSourcePath, 'utf8');
  const result = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2015
    },
    fileName: downloaderSourcePath,
    reportDiagnostics: true
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === typescript.DiagnosticCategory.Error
  );
  assert.deepEqual(errors, [], 'download_jdk.ts must transpile without syntax errors');
  fs.writeFileSync(outputPath, result.outputText, {mode: 0o600});
}

async function writeArchive(archivePath, entries) {
  const pack = tarStream.pack();
  const completed = stream.pipeline(pack, zlib.createGzip(), fs.createWriteStream(archivePath, {mode: 0o600}));
  for (const entry of entries) {
    const header = {
      gid: 0,
      mode: entry.type === 'directory' ? 0o755 : 0o644,
      mtime: new Date(0),
      name: entry.name,
      type: entry.type,
      uid: 0
    };
    if (entry.linkname !== undefined) {
      header.linkname = entry.linkname;
    }
    await new Promise((resolve, reject) => {
      const callback = (error) => error ? reject(error) : resolve();
      if (entry.type === 'file') {
        pack.entry(header, Buffer.from(entry.contents), callback);
      } else {
        pack.entry(header, callback);
      }
    });
  }
  pack.finalize();
  await completed;
}

function safeArchiveEntries() {
  return [
    {name: 'java_home/', type: 'directory'},
    {name: 'java_home/lib/', type: 'directory'},
    {name: 'java_home/lib/ext/', type: 'directory'},
    {name: 'java_home/lib/rt.jar', type: 'file', contents: 'verified runtime jar\n'},
    {name: 'java_home/lib/doppio.jar', type: 'file', contents: 'replaceable doppio jar\n'},
    {name: 'java_home/lib/tools.jar', type: 'file', contents: 'verified tools jar\n'},
    {name: 'java_home/lib/ext/zipfs.jar', type: 'file', contents: 'verified zipfs jar\n'}
  ];
}

function createCaseRoot(suiteRoot, name) {
  const caseRoot = path.join(suiteRoot, name);
  const destinationRoot = path.join(caseRoot, 'destination');
  fs.mkdirSync(destinationRoot, {recursive: true});
  fs.writeFileSync(path.join(caseRoot, fixtureMarkerName), fixtureMarkerContents);
  return {caseRoot, destinationRoot};
}

function writePreviousValidInstall(destinationRoot) {
  const javaHome = path.join(destinationRoot, 'java_home');
  fs.mkdirSync(path.join(javaHome, 'lib', 'ext'), {recursive: true});
  fs.writeFileSync(path.join(javaHome, 'lib', 'rt.jar'), 'previous runtime jar\n');
  fs.writeFileSync(path.join(javaHome, 'lib', 'doppio.jar'), 'previous replaceable jar\n');
  fs.writeFileSync(path.join(javaHome, 'lib', 'tools.jar'), 'previous tools jar\n');
  fs.writeFileSync(path.join(javaHome, 'lib', 'ext', 'zipfs.jar'), 'previous zipfs jar\n');
  fs.writeFileSync(path.join(javaHome, 'preserve-me.txt'), 'existing valid install must survive\n');
  const info = {
    url: 'https://example.invalid/previous-java-home.tar.gz',
    sha256: '1'.repeat(64),
    classpath: ['lib/rt.jar', 'lib/doppio.jar', 'lib/tools.jar', 'lib/ext/zipfs.jar']
  };
  writeJson(path.join(javaHome, 'jdk.json'), info);
  writeJson(path.join(javaHome, integrityMarkerName), {
    schema: 2,
    ...info,
    classpathSha256: {
      'lib/rt.jar': sha256File(path.join(javaHome, 'lib', 'rt.jar')),
      'lib/tools.jar': sha256File(path.join(javaHome, 'lib', 'tools.jar')),
      'lib/ext/zipfs.jar': sha256File(path.join(javaHome, 'lib', 'ext', 'zipfs.jar'))
    }
  });
  fs.writeFileSync(
    path.join(javaHome, 'jdk.json.d.ts'),
    'declare const JDKInfo: { url: string; sha256: string; classpath: string[] };\nexport = JDKInfo;\n'
  );
}

function snapshotTree(root) {
  const records = [];
  function visit(current, relative) {
    const stat = fs.lstatSync(current);
    if (stat.isDirectory()) {
      records.push(`directory:${relative}`);
      for (const entry of fs.readdirSync(current).sort()) {
        visit(path.join(current, entry), relative === '' ? entry : `${relative}/${entry}`);
      }
    } else if (stat.isFile()) {
      records.push(`file:${relative}:${sha256File(current)}`);
    } else {
      records.push(`other:${relative}`);
    }
  }
  visit(root, '');
  return records;
}

function runDownloader(compiledDownloader, fixture, archivePath, expectedSha256, extraEnvironment = {}) {
  const environment = {
    ...process.env,
    DOPPIO_JDK_DOWNLOAD_TEST_ONLY: '1',
    DOPPIO_JDK_TEST_ARCHIVE: archivePath,
    DOPPIO_JDK_TEST_DESTINATION: fixture.destinationRoot,
    DOPPIO_JDK_TEST_ROOT: fixture.caseRoot,
    DOPPIO_JDK_TEST_SHA256: expectedSha256,
    NODE_ENV: 'test',
    NODE_PATH: process.env.NODE_PATH === undefined
      ? path.join(repoRoot, 'node_modules')
      : `${path.join(repoRoot, 'node_modules')}${path.delimiter}${process.env.NODE_PATH}`,
    ...extraEnvironment
  };
  return childProcess.spawnSync(process.execPath, [compiledDownloader], {
    cwd: fixture.caseRoot,
    encoding: 'utf8',
    env: environment,
    maxBuffer: 8 * 1024 * 1024,
    timeout: 30 * 1000
  });
}

function assertCleanTransactionRoot(destinationRoot) {
  const leftovers = fs.readdirSync(destinationRoot).filter((entry) => entry.startsWith('.doppio-jdk-install-'));
  assert.deepEqual(leftovers, [], 'JDK transaction temporary directories must be cleaned');
}

function assertSuccessfulRun(result, expectedMessage) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, expectedMessage);
}

function assertFailedRunPreservesInstall(result, destinationRoot, before) {
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0, 'invalid JDK input unexpectedly installed');
  assert.match(result.stderr, /Failed to (?:configure JDK download|install verified JDK):/);
  assert.deepEqual(snapshotTree(path.join(destinationRoot, 'java_home')), before);
  assertCleanTransactionRoot(destinationRoot);
}

async function runFailureCase(suiteRoot, compiledDownloader, name, prepareArchive, expectedSha256) {
  const fixture = createCaseRoot(suiteRoot, name);
  const archivePath = path.join(fixture.caseRoot, 'java_home.tar.gz');
  await prepareArchive(archivePath);
  writePreviousValidInstall(fixture.destinationRoot);
  const before = snapshotTree(path.join(fixture.destinationRoot, 'java_home'));
  const result = runDownloader(
    compiledDownloader,
    fixture,
    archivePath,
    expectedSha256 === undefined ? sha256File(archivePath) : expectedSha256
  );
  assertFailedRunPreservesInstall(result, fixture.destinationRoot, before);
}

async function main() {
  const suiteRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-jdk-transaction-'));
  let completedCases = 0;
  try {
    const compiledDownloader = path.join(suiteRoot, 'download_jdk.js');
    compileDownloader(compiledDownloader);

    const fixture = createCaseRoot(suiteRoot, 'success');
    const archivePath = path.join(fixture.caseRoot, 'java_home.tar.gz');
    await writeArchive(archivePath, safeArchiveEntries());
    const archiveSha256 = sha256File(archivePath);
    writePreviousValidInstall(fixture.destinationRoot);
    const installed = runDownloader(compiledDownloader, fixture, archivePath, archiveSha256);
    assertSuccessfulRun(installed, /Successfully installed verified JDK\./);
    const javaHome = path.join(fixture.destinationRoot, 'java_home');
    assert.equal(fs.existsSync(path.join(javaHome, 'preserve-me.txt')), false);
    const info = JSON.parse(fs.readFileSync(path.join(javaHome, 'jdk.json'), 'utf8'));
    const marker = JSON.parse(fs.readFileSync(path.join(javaHome, integrityMarkerName), 'utf8'));
    assert.equal(info.sha256, archiveSha256);
    assert.deepEqual(info.classpath, ['lib/rt.jar', 'lib/doppio.jar', 'lib/tools.jar', 'lib/ext/zipfs.jar']);
    assert.equal(marker.schema, 2);
    assert.deepEqual(Object.keys(marker.classpathSha256).sort(), [
      'lib/ext/zipfs.jar',
      'lib/rt.jar',
      'lib/tools.jar'
    ]);
    for (const entry of info.classpath) {
      const target = path.join(javaHome, ...entry.split('/'));
      const stat = fs.lstatSync(target);
      assert.ok(stat.isFile() && stat.size > 0, `${entry} must be a non-empty regular file`);
      if (entry !== 'lib/doppio.jar') {
        assert.equal(marker.classpathSha256[entry], sha256File(target));
      }
    }
    assertCleanTransactionRoot(fixture.destinationRoot);
    completedCases += 1;

    const afterInstall = snapshotTree(javaHome);
    const idempotent = runDownloader(compiledDownloader, fixture, archivePath, archiveSha256);
    assertSuccessfulRun(idempotent, /JDK is up-to-date and passed integrity checks\./);
    assert.deepEqual(snapshotTree(javaHome), afterInstall);
    assertCleanTransactionRoot(fixture.destinationRoot);
    completedCases += 1;

    fs.writeFileSync(path.join(javaHome, 'lib', 'tools.jar'), 'tampered tools jar\n');
    const repaired = runDownloader(compiledDownloader, fixture, archivePath, archiveSha256);
    assertSuccessfulRun(repaired, /Successfully installed verified JDK\./);
    assert.equal(fs.readFileSync(path.join(javaHome, 'lib', 'tools.jar'), 'utf8'), 'verified tools jar\n');
    assertCleanTransactionRoot(fixture.destinationRoot);
    completedCases += 1;

    fs.writeFileSync(path.join(javaHome, 'lib', 'doppio.jar'), 'package install replacement jar\n');
    const replaceableJar = runDownloader(compiledDownloader, fixture, archivePath, archiveSha256);
    assertSuccessfulRun(replaceableJar, /JDK is up-to-date and passed integrity checks\./);
    assert.equal(
      fs.readFileSync(path.join(javaHome, 'lib', 'doppio.jar'), 'utf8'),
      'package install replacement jar\n'
    );
    assertCleanTransactionRoot(fixture.destinationRoot);
    completedCases += 1;

    await runFailureCase(
      suiteRoot,
      compiledDownloader,
      'wrong-hash',
      (target) => writeArchive(target, safeArchiveEntries()),
      '0'.repeat(64)
    );
    completedCases += 1;

    await runFailureCase(suiteRoot, compiledDownloader, 'corrupt', async (target) => {
      fs.writeFileSync(target, 'this is not a gzip archive\n');
    });
    completedCases += 1;

    await runFailureCase(suiteRoot, compiledDownloader, 'truncated', async (target) => {
      const complete = path.join(suiteRoot, 'complete-for-truncation.tar.gz');
      await writeArchive(complete, safeArchiveEntries());
      const contents = fs.readFileSync(complete);
      fs.writeFileSync(target, contents.subarray(0, contents.length - 16));
    });
    completedCases += 1;

    await runFailureCase(suiteRoot, compiledDownloader, 'traversal', (target) => writeArchive(target, [
      ...safeArchiveEntries(),
      {name: 'java_home/../../escape.txt', type: 'file', contents: 'must not escape\n'}
    ]));
    assert.equal(fs.existsSync(path.join(suiteRoot, 'escape.txt')), false);
    completedCases += 1;

    await runFailureCase(suiteRoot, compiledDownloader, 'symlink', (target) => writeArchive(target, [
      ...safeArchiveEntries(),
      {name: 'java_home/lib/linked.jar', type: 'symlink', linkname: '../../outside'}
    ]));
    completedCases += 1;

    await runFailureCase(suiteRoot, compiledDownloader, 'hardlink', (target) => writeArchive(target, [
      ...safeArchiveEntries(),
      {name: 'java_home/lib/hardlinked.jar', type: 'link', linkname: 'java_home/lib/rt.jar'}
    ]));
    completedCases += 1;

    const rollback = createCaseRoot(suiteRoot, 'rollback');
    const rollbackArchive = path.join(rollback.caseRoot, 'java_home.tar.gz');
    await writeArchive(rollbackArchive, safeArchiveEntries());
    writePreviousValidInstall(rollback.destinationRoot);
    const beforeRollback = snapshotTree(path.join(rollback.destinationRoot, 'java_home'));
    const failedReplacement = runDownloader(
      compiledDownloader,
      rollback,
      rollbackArchive,
      sha256File(rollbackArchive),
      {DOPPIO_JDK_TEST_FAIL_REPLACE: 'after-backup'}
    );
    assertFailedRunPreservesInstall(failedReplacement, rollback.destinationRoot, beforeRollback);
    completedCases += 1;

    const failClosed = createCaseRoot(suiteRoot, 'fail-closed');
    const failClosedArchive = path.join(failClosed.caseRoot, 'java_home.tar.gz');
    await writeArchive(failClosedArchive, safeArchiveEntries());
    writePreviousValidInstall(failClosed.destinationRoot);
    const beforeFailClosed = snapshotTree(path.join(failClosed.destinationRoot, 'java_home'));
    const failClosedEnvironment = {
      ...process.env,
      DOPPIO_JDK_DOWNLOAD_TEST_ONLY: '1',
      DOPPIO_JDK_TEST_ARCHIVE: failClosedArchive,
      DOPPIO_JDK_TEST_DESTINATION: failClosed.destinationRoot,
      DOPPIO_JDK_TEST_ROOT: failClosed.caseRoot,
      DOPPIO_JDK_TEST_SHA256: sha256File(failClosedArchive),
      NODE_ENV: 'production',
      NODE_PATH: path.join(repoRoot, 'node_modules')
    };
    const rejectedOverride = childProcess.spawnSync(process.execPath, [compiledDownloader], {
      cwd: failClosed.caseRoot,
      encoding: 'utf8',
      env: failClosedEnvironment,
      timeout: 30 * 1000
    });
    assertFailedRunPreservesInstall(rejectedOverride, failClosed.destinationRoot, beforeFailClosed);
    completedCases += 1;

    assert.equal(completedCases, 12);
    console.log(`download-jdk-transaction:${completedCases}:ok`);
  } finally {
    fs.rmSync(suiteRoot, {recursive: true, force: true});
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
