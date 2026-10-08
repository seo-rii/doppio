import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { inspectClassFiles, parseOptions, runCommand, runCompatibility,
  validateManifest, validateToolchains } from './run_java_compatibility.mjs';
import { treeDigest } from './prepare_java_compatibility_toolchains.mjs';
import { generateSwitchBootstrapFixture } from './generate_switch_bootstrap_fixture.mjs';

const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function manifest() {
  return {
    schemaVersion: 1, profile: 'java21-to-java25-seed', releases: [21, 25],
    approvedTarget: { requiredHosts: [{ id: 'ubuntu-node24' }, { id: 'chromium' }] },
    inventory: { state: 'seed-partial', completeJavaSeInventory: false },
    timeouts: { compileMs: 60_000, nativeMs: 30_000, doppioMs: 120_000 },
    requirements: [{ id: 'API-FIRST', introducedIn: 21, featureStatus: 'final',
      specificationRefs: { 21: 'https://example.test/21', 25: 'https://example.test/25' } }],
    fixtures: [{ id: 'first', source: 'classes/First.java', mainClass: 'fixture.First',
      releases: [21, 25], requirementIds: ['API-FIRST'], arguments: [],
      comparison: 'successful-native-oracle-stdout-stderr' }],
  };
}

function writeFile(filename, data, mode) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, data, mode ? { mode } : undefined);
}

function classFile(major, minor = 0, payload = 1) {
  const bytes = Buffer.alloc(9);
  bytes.writeUInt32BE(0xcafebabe);
  bytes.writeUInt16BE(minor, 4);
  bytes.writeUInt16BE(major, 6);
  bytes[8] = payload;
  return bytes;
}

function environment(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-java-comparison-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const spec = manifest();
  const manifestPath = path.join(root, 'ci/java_compatibility_manifest.json');
  const lockPath = path.join(root, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(root, 'build/java-compatibility-toolchains/toolchains.json');
  const sourcePath = path.join(root, spec.fixtures[0].source);
  writeFile(sourcePath, 'package fixture; public class First {}\n');
  writeFile(path.join(root, 'package.json'), '{"name":"fixture"}\n');
  const runtimeRoot = path.join(root, 'build/release-cli');
  for (const filename of ['console/runner.js', 'src/jvm.js', 'vendor/java_home/jdk.json',
    'vendor/java_home/lib/rt.jar', 'vendor/java_home/lib/doppio.jar']) {
    writeFile(path.join(runtimeRoot, filename), `fixture ${filename}`);
  }
  const lock = { schemaVersion: 1, platform: 'linux-x64', toolchains: [21, 25].map((feature) => {
    const version = `${feature}.0.1`;
    const build = `${version}.1.1`;
    const archiveRoot = `amazon-corretto-${build}-linux-x64`;
    const home = path.join(root, `build/java-compatibility-toolchains/jdk${feature}`);
    for (const command of ['java', 'javac']) writeFile(path.join(home, 'bin', command), `fake ${command}`, 0o755);
    writeFile(path.join(home, 'lib/modules'), `fake modules ${feature}`);
    return { id: `jdk${feature}`, feature, vendor: 'Amazon Corretto', version, build, archiveRoot,
      archiveSize: 100, archiveSha256: digest(`archive ${feature}`), treeSha256: treeDigest(home),
      url: `https://corretto.aws/downloads/resources/${build}/${archiveRoot}.tar.gz` };
  }) };
  const marker = { schemaVersion: 1, lockSha256: null, toolchains: lock.toolchains.map((entry) => ({
    id: entry.id, feature: entry.feature, vendor: entry.vendor, version: entry.version,
    archiveSha256: entry.archiveSha256, home: path.join(root, `build/java-compatibility-toolchains/${entry.id}`),
  })) };
  const save = () => {
    writeFile(manifestPath, JSON.stringify(spec));
    writeFile(lockPath, JSON.stringify(lock));
    marker.lockSha256 = digest(fs.readFileSync(lockPath));
    writeFile(markerPath, JSON.stringify(marker));
  };
  save();
  const calls = [];
  const execute = async (command, args, options) => {
    const call = { command, args, ...options };
    calls.push(call);
    const result = { command: [command, ...args], cwd: options.cwd, timeoutMs: options.timeoutMs,
      status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
      stdout: '', stderr: '', error: null, durationMs: 0 };
    if (args[0] === '-version') {
      const toolchain = marker.toolchains.find((entry) => command.startsWith(`${entry.home}/`));
      if (path.basename(command) === 'javac') result.stdout = `javac ${toolchain.version}\n`;
      else result.stderr = `openjdk version "${toolchain.version}"\n`;
    } else if (args[0] === '--release') {
      const release = Number(args[1]);
      const classes = args[args.indexOf('-d') + 1];
      writeFile(path.join(classes, 'fixture/First.class'), classFile(release + 44));
      writeFile(path.join(classes, 'fixture/First$Nested.class'), classFile(release + 44, 0, 2));
    } else {
      result.stdout = 'one\ntwo\n';
    }
    return result;
  };
  const run = (overrides = {}) => runCompatibility({ repoRoot: root, execute,
    repositoryState: () => ({ commit: 'a'.repeat(40), trackedDirty: true }), ...overrides });
  return { root, spec, sourcePath, manifestPath, lockPath, markerPath, lock, marker,
    runtimeRoot, calls, execute, run, save };
}

test('checked-in inventory has eleven fixtures covering seventeen final requirements', () => {
  const spec = validateManifest(JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/java_compatibility_manifest.json'))));
  assert.equal(spec.fixtures.length, 11);
  assert.equal(spec.requirements.length, 17);
  assert.deepEqual(spec.releases, [21, 25]);
  assert.equal(spec.fixtures.filter(fixture => fixture.releases.includes(21)).length, 5);
});

test('manifest rejects missing, duplicate, skipped or unrepresented required cases', () => {
  const invalid = [
    (spec) => { spec.fixtures = []; },
    (spec) => { spec.fixtures.push(structuredClone(spec.fixtures[0])); },
    (spec) => { delete spec.fixtures[0].id; },
    (spec) => { spec.fixtures[0].source = '../outside.java'; },
    (spec) => { spec.fixtures[0].source = '/outside.java'; },
    ...['../generator.mjs', 'ci/../generator.mjs', '/ci/generator.mjs', 'ci//generator.mjs',
      'ci/generator.js', true].map(value => (spec) => { spec.fixtures[0].classGenerator = value; }),
    ...[null, 1, 'x'.repeat(1024 * 1024 + 1)].map(value => (spec) => { spec.fixtures[0].standardInput = value; }),
    (spec) => { spec.fixtures[0].mainClass = '-version'; },
    (spec) => { spec.fixtures[0].required = false; },
    (spec) => { spec.fixtures[0].skip = true; },
    (spec) => { spec.fixtures[0].releases = [21, 21]; },
    (spec) => { spec.fixtures[0].releases = [21]; },
    (spec) => { spec.releases = [21]; spec.fixtures[0].releases = [21]; },
    (spec) => { spec.fixtures[0].requirementIds = ['UNKNOWN']; },
    (spec) => { spec.requirements.push(structuredClone(spec.requirements[0])); },
    (spec) => { spec.requirements.push({ ...spec.requirements[0], id: 'UNMAPPED' }); },
    (spec) => { delete spec.requirements[0].specificationRefs['25']; },
    (spec) => { spec.requirements[0].featureStatus = 'preview'; },
    (spec) => { spec.timeouts.nativeMs = 0; },
    (spec) => { spec.timeouts.compileMs = 600001; },
    (spec) => { spec.fixtures[0].comparison = 'stdout-only'; },
    (spec) => { spec.fixtures[0].arguments = ['bad\0argument']; },
  ];
  for (const mutate of invalid) {
    const spec = manifest();
    mutate(spec);
    assert.throws(() => validateManifest(spec), undefined, mutate.toString());
  }
});

test('CLI options are explicit and reject duplicate, unknown, missing and unsupported release values', () => {
  assert.deepEqual(parseOptions(['--release', '21', '--output', 'build/report.json']),
    { release: 21, outputPath: 'build/report.json' });
  for (const args of [['--release', '17'], ['--release', '025'], ['--release'], ['--unknown', 'value'],
    ['--release', '21', '--release', '25']]) assert.throws(() => parseOptions(args));
  assert.deepEqual(parseOptions(['--browser', '--release', '25']), { browser: true, release: 25 });
  assert.throws(() => parseOptions(['--browser', '--browser']), /Duplicate/);
});

test('later final features run only on applicable releases while retaining the Java 21 profile', async (context) => {
  const fixture = environment(context);
  const later = { id: 'LANG-LATER', introducedIn: 25, featureStatus: 'final',
    specificationRefs: { 25: 'https://example.test/25' } };
  fixture.spec.requirements.push(later);
  fixture.spec.fixtures.push({ ...fixture.spec.fixtures[0], id: 'later', mainClass: 'fixture.Later',
    releases: [25], requirementIds: [later.id] });
  fixture.save();
  const result = await fixture.run({ execute: async (command, args, options) => {
    const record = await fixture.execute(command, args, options);
    if (args[0] === '--release') writeFile(path.join(args[args.indexOf('-d') + 1], 'fixture/Later.class'),
      classFile(Number(args[1]) + 44));
    return record;
  } });
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.cases.map(entry => entry.id), ['first:jdk21', 'first:jdk25', 'later:jdk25']);
  fixture.spec.fixtures[1].releases = [21, 25];
  assert.throws(() => validateManifest(fixture.spec), /before its required final features/);
});

test('scripted UTF-8 stdin is identical on native, CLI and Chromium with input provenance', async (context) => {
  const fixture = environment(context);
  const input = 'first\r\nβeta\rtail\n';
  fixture.spec.fixtures[0].standardInput = input;
  fixture.save();
  const browserInputs = [];
  const result = await fixture.run({ browser: true, createBrowserSession: async () => ({ provenance: {},
    execute: async (options) => {
      browserInputs.push(options.standardInput);
      return { status: 'passed', exitCode: 0, stdout: 'one\ntwo\n', stderr: '', signal: null,
        error: null, timedOut: false, outputLimitExceeded: false };
    }, verifyIntegrity: async () => {}, close: async () => {},
  }) });
  assert.equal(result.status, 'passed');
  assert.deepEqual(browserInputs, [input, input]);
  for (const entry of result.cases) {
    assert.deepEqual(entry.standardInput, { bytes: Buffer.byteLength(input), sha256: digest(Buffer.from(input)) });
  }
  const runtimeCalls = fixture.calls.filter(call => call.args[0] === '-cp' || call.command === process.execPath);
  assert.ok(runtimeCalls.every(call => call.standardInput === input));
});

test('process adapter feeds finite Unicode input and EOF without hanging', async () => {
  const input = 'first\r\nβeta\rtail\n';
  const record = await runCommand(process.execPath, ['-e',
    "process.stdin.setEncoding('utf8'); let input=''; process.stdin.on('data',chunk=>input+=chunk); process.stdin.on('end',()=>process.stdout.write(input));"],
  { cwd: repoRoot, timeoutMs: 3000, standardInput: input });
  assert.equal(record.status, 'passed');
  assert.equal(record.stdout, input);
  assert.throws(() => runCommand(process.execPath, [], { cwd: repoRoot, timeoutMs: 1000,
    standardInput: 'x'.repeat(1024 * 1024 + 1) }), /at most 1048576/);
});

test('generated switch companion is deterministic with the selected final class version', () => {
  for (const release of [21, 25]) {
    const first = generateSwitchBootstrapFixture(release);
    assert.deepEqual(first, generateSwitchBootstrapFixture(release));
    assert.equal(first.readUInt32BE(0), 0xcafebabe);
    assert.equal(first.readUInt16BE(4), 0);
    assert.equal(first.readUInt16BE(6), release + 44);
  }
  assert.throws(() => generateSwitchBootstrapFixture(17), /release 21 or 25/);
});

test('companion generation runs between javac and native execution and records provenance', async (context) => {
  const fixture = environment(context);
  const generator = 'ci/fixture_generator.mjs';
  writeFile(path.join(fixture.root, generator), 'fixture generator\n');
  fixture.spec.fixtures[0].classGenerator = generator;
  fixture.save();
  const result = await fixture.run();
  assert.equal(result.status, 'passed');
  for (const item of result.cases) {
    assert.equal(item.classGenerator.sha256, digest('fixture generator\n'));
    const execution = item.classGenerator.execution;
    assert.equal(execution.status, 'passed');
    assert.deepEqual(execution.command.slice(1), [path.join(fixture.root, generator), '--classes',
      item.native.command[2], '--release', String(item.release)]);
    const index = fixture.calls.findIndex(call => call.args[0] === path.join(fixture.root, generator) &&
      call.args[4] === String(item.release));
    assert.equal(fixture.calls[index - 1].args[0], '--release');
    assert.equal(fixture.calls[index + 1].args[0], '-cp');
  }
});

test('generator errors, mutated input and escaping links fail without credited results', async (context) => {
  for (const failure of ['exit', 'timeout', 'version', 'mutation', 'escape']) {
    const fixture = environment(context);
    const generator = 'ci/fixture_generator.mjs';
    const filename = path.join(fixture.root, generator);
    writeFile(filename, 'fixture generator\n');
    fixture.spec.fixtures[0].classGenerator = generator;
    fixture.save();
    if (failure === 'escape') {
      fs.unlinkSync(filename);
      const outside = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-generator-escape-')), 'outside.mjs');
      context.after(() => fs.rmSync(path.dirname(outside), { recursive: true, force: true }));
      fs.writeFileSync(outside, 'outside');
      fs.symlinkSync(outside, filename);
    }
    const result = await fixture.run({ execute: async (command, args, options) => {
      const record = await fixture.execute(command, args, options);
      if (args[0] === filename) {
        if (failure === 'exit') { record.status = 'failed'; record.exitCode = 1; }
        if (failure === 'timeout') { record.status = 'timeout'; record.timedOut = true; }
        if (failure === 'version') {
          writeFile(path.join(args[2], 'fixture/First$Generated.class'), classFile(61));
        }
        if (failure === 'mutation') fs.appendFileSync(filename, 'mutated');
      }
      return record;
    } });
    assert.equal(result.status, 'failed', failure);
    assert.equal(result.summary.passed, 0, failure);
    if (failure !== 'mutation') {
      assert.ok(result.cases.every(item => item.native.status === 'not-run'), failure);
    } else assert.match(result.errors[0], /generator changed/);
  }
});

test('Chromium compares the same class directory on both releases and records host provenance', async (context) => {
  const fixture = environment(context);
  const calls = [];
  let closed = false;
  let verified = false;
  const result = await fixture.run({ browser: true, createBrowserSession: async () => ({
    provenance: { browserVersion: 'test-chromium', bundleSha256: 'a'.repeat(64) },
    execute: async (options) => {
      calls.push(options);
      return { status: 'passed', exitCode: 0, stdout: 'one\ntwo\n', stderr: '', signal: null,
        timedOut: false, outputLimitExceeded: false, error: null };
    },
    verifyIntegrity: async () => { verified = true; },
    close: async () => { closed = true; },
  }) });
  assert.equal(result.status, 'passed');
  assert.equal(result.browser.status, 'passed');
  assert.equal(result.browser.provenance.browserVersion, 'test-chromium');
  assert.deepEqual(result.browser.summary, { required: 2, passed: 2, failed: 0, notRun: 0 });
  assert.equal(calls.length, 2);
  for (const [index, item] of result.cases.entries()) {
    assert.equal(calls[index].classesPath, item.native.command[2]);
    assert.equal(calls[index].mainClass, item.mainClass);
    assert.equal(calls[index].timeoutMs, 120000);
    assert.equal(item.comparison.browserSucceeded, true);
  }
  assert.equal(verified, true);
  assert.equal(closed, true);
});

test('Chromium results remain independently visible when only the CLI output differs', async (context) => {
  const fixture = environment(context);
  const result = await fixture.run({ browser: true,
    execute: async (command, args, options) => {
      const record = await fixture.execute(command, args, options);
      if (command === process.execPath) record.stdout = 'CLI mismatch\n';
      return record;
    },
    createBrowserSession: async () => ({ provenance: {},
      execute: async () => ({ status: 'passed', exitCode: 0, stdout: 'one\ntwo\n', stderr: '',
        signal: null, timedOut: false, outputLimitExceeded: false, error: null }),
      verifyIntegrity: async () => {}, close: async () => {},
    }),
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.summary.passed, 0);
  assert.equal(result.browser.status, 'passed');
  assert.equal(result.browser.summary.passed, 2);
});

test('Chromium errors, output differences, timeouts and integrity failures invalidate required host results', async (context) => {
  const fixture = environment(context);
  for (const failure of ['stdout', 'stderr', 'error', 'timeout', 'integrity', 'cleanup']) {
    let closed = false;
    const result = await fixture.run({ browser: true, createBrowserSession: async () => ({
      provenance: {},
      execute: async () => ({ status: failure === 'error' || failure === 'timeout' ? 'failed' : 'passed',
        exitCode: 0, signal: null, error: failure === 'error' ? 'page failure' : null,
        timedOut: failure === 'timeout', outputLimitExceeded: false,
        stdout: failure === 'stdout' ? 'changed\n' : 'one\ntwo\n',
        stderr: failure === 'stderr' ? 'changed\n' : '' }),
      verifyIntegrity: async () => { if (failure === 'integrity') throw new Error('Browser bundle changed.'); },
      close: async () => { closed = true; if (failure === 'cleanup') throw new Error('Browser did not close.'); },
    }) });
    assert.equal(result.status, 'failed', failure);
    assert.equal(result.browser.status, 'failed', failure);
    assert.equal(result.summary.passed, 0, failure);
    assert.equal(result.browser.summary.passed, 0, failure);
    assert.equal(closed, true, failure);
  }
});

test('Chromium launch failure retains every required case as unrun in the failed ledger', async (context) => {
  const fixture = environment(context);
  const result = await fixture.run({ browser: true,
    createBrowserSession: async () => { throw new Error('No Chromium executable.'); } });
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.summary, { required: 2, passed: 0, failed: 0, notRun: 2 });
  assert.deepEqual(result.browser.summary, result.summary);
  assert.match(result.errors[0], /No Chromium/);
});

test('real class headers must include every generated nested class with non-preview matching major', (context) => {
  const fixture = environment(context);
  const classes = path.join(fixture.root, 'output');
  writeFile(path.join(classes, 'fixture/First.class'), classFile(65));
  writeFile(path.join(classes, 'fixture/First$Nested.class'), classFile(65));
  assert.equal(inspectClassFiles(classes, 21, 'fixture.First').length, 2);
  writeFile(path.join(classes, 'fixture/First$Nested.class'), classFile(65, 65535));
  assert.throws(() => inspectClassFiles(classes, 21, 'fixture.First'), /Wrong class version/);
  writeFile(path.join(classes, 'fixture/First$Nested.class'), classFile(61));
  assert.throws(() => inspectClassFiles(classes, 21, 'fixture.First'), /Wrong class version/);
  writeFile(path.join(classes, 'fixture/First$Nested.class'), Buffer.from('not a class'));
  assert.throws(() => inspectClassFiles(classes, 21, 'fixture.First'), /Invalid class file/);
});

test('runner compiles isolated identical bytes with each matching release and records precise provenance', async (context) => {
  const fixture = environment(context);
  const before = fs.readFileSync(fixture.sourcePath);
  const result = await fixture.run();
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.summary, { required: 2, passed: 2, failed: 0, notRun: 0 });
  assert.equal(result.browser.status, 'not-run');
  assert.equal(result.manifest.approvedTarget.requiredHosts.length, 2);
  assert.equal(result.manifest.inventory.completeJavaSeInventory, false);
  assert.equal(result.manifest.sha256, digest(fs.readFileSync(fixture.manifestPath)));
  assert.equal(result.source.commit, 'a'.repeat(40));
  assert.equal(result.source.trackedDirty, true);
  assert.equal(result.inputIntegrity.status, 'passed');
  assert.match(result.host.node, /^v\d+\./);
  assert.match(result.runtime.snapshotSha256, /^[0-9a-f]{64}$/);
  assert.match(result.runner.sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.toolchains[0].treeSha256, fixture.lock.toolchains[0].treeSha256);
  for (const item of result.cases) {
    assert.equal(item.classes.length, 2);
    assert.ok(item.classes.every((entry) => entry.major === item.release + 44 && entry.minor === 0));
    assert.deepEqual(item.compile.command.slice(1, 3), ['--release', String(item.release)]);
    assert.ok(item.compile.command.includes('-proc:none'));
    assert.ok(!item.compile.command.some((arg) => arg.includes('--patch-module')));
    assert.equal(item.native.command[2], item.doppio.command[4]);
    assert.ok(!item.native.command[2].includes(path.delimiter));
    assert.equal(item.compile.timeoutMs, 60_000);
    assert.equal(item.native.timeoutMs, 30_000);
    assert.equal(item.doppio.timeoutMs, 120_000);
    assert.equal(fs.existsSync(item.compile.cwd), false, 'temporary compilation outputs are cleaned');
  }
  assert.deepEqual(fs.readFileSync(fixture.sourcePath), before);
  const saved = JSON.parse(fs.readFileSync(path.join(fixture.root, 'build/java-compatibility-results.json')));
  assert.deepEqual(saved, result);
  assert.equal(fs.statSync(path.join(fixture.root, 'build/java-compatibility-results.json')).mode & 0o777, 0o600);
  assert.equal((await fixture.run({ release: 25 })).summary.required, 1);
});

test('only CRLF is normalized, and manifest arguments are passed to both VMs', async (context) => {
  const fixture = environment(context);
  fixture.spec.fixtures[0].arguments = ['hello world'];
  fixture.save();
  const result = await fixture.run({ release: 21, execute: async (...args) => {
    const record = await fixture.execute(...args);
    if (args[0] === process.execPath) record.stdout = 'one\r\ntwo\r\n';
    return record;
  } });
  assert.equal(result.status, 'passed');
  assert.equal(result.cases[0].native.command.at(-1), 'hello world');
  assert.equal(result.cases[0].doppio.command.at(-1), 'hello world');
});

for (const mismatch of ['stdout', 'stderr', 'native-exit', 'doppio-exit', 'timeout']) {
  test(`a ${mismatch} mismatch fails the ledger without dropping other required cases`, async (context) => {
    const fixture = environment(context);
    const result = await fixture.run({ execute: async (command, args, options) => {
      const record = await fixture.execute(command, args, options);
      const runtime = args[0] !== '-version' && args[0] !== '--release';
      const doppio = command === process.execPath;
      if (runtime && (doppio || mismatch === 'native-exit')) {
        if (mismatch === 'stdout') record.stdout = 'one\ntwo';
        if (mismatch === 'stderr') record.stderr = 'unexpected warning\n';
        if (mismatch.endsWith('exit')) { record.status = 'failed'; record.exitCode = 1; }
        if (mismatch === 'timeout') { record.status = 'timeout'; record.timedOut = true; record.exitCode = null; }
      }
      return record;
    } });
    assert.equal(result.status, 'failed');
    assert.deepEqual(result.summary, { required: 2, passed: 0, failed: 2, notRun: 0 });
    assert.ok(result.cases.every((entry) => entry.error && entry.comparison.status === 'failed'));
  });
}

test('compile failure is recorded, does not execute stale classes and retains the second required case', async (context) => {
  const fixture = environment(context);
  const result = await fixture.run({ execute: async (...args) => {
    const record = await fixture.execute(...args);
    if (args[1][0] === '--release') { record.status = 'failed'; record.exitCode = 1; record.stderr = 'javac failed'; }
    return record;
  } });
  assert.deepEqual(result.summary, { required: 2, passed: 0, failed: 2, notRun: 0 });
  assert.ok(result.cases.every((entry) => entry.compile.stderr === 'javac failed' &&
    entry.native.status === 'not-run' && entry.doppio.status === 'not-run'));
});

test('missing compiler output, changed class bytes and wrong nested class version fail closed', async (context) => {
  const fixture = environment(context);
  for (const mutation of ['missing', 'major', 'changed']) {
    const result = await fixture.run({ release: 21, execute: async (command, args, options) => {
      const record = await fixture.execute(command, args, options);
      if (args[0] === '--release') {
        const output = args[args.indexOf('-d') + 1];
        if (mutation === 'missing') fs.rmSync(path.join(output, 'fixture'), { recursive: true });
        if (mutation === 'major') writeFile(path.join(output, 'fixture/First$Nested.class'), classFile(69));
      } else if (args[0] === '-cp' && mutation === 'changed') {
        writeFile(path.join(args[1], 'fixture/First.class'), classFile(65, 0, 99));
      }
      return record;
    } });
    assert.equal(result.status, 'failed');
    assert.equal(result.summary.failed, 1);
    assert.equal(result.cases[0].doppio.status, 'not-run');
  }
});

test('invalid lock/marker IDs, feature, digest and selected toolchain availability are rejected', (context) => {
  const fixture = environment(context);
  const check = (marker) => validateToolchains(marker, fixture.lock, fixture.marker.lockSha256, [21, 25]);
  assert.equal(check(fixture.marker).length, 2);
  for (const mutate of [
    (marker) => { marker.toolchains = []; },
    (marker) => { marker.toolchains.push(marker.toolchains[0]); },
    (marker) => { marker.toolchains[0].feature = 25; },
    (marker) => { marker.toolchains[0].archiveSha256 = 'b'.repeat(64); },
    (marker) => { marker.toolchains[0].home = 'relative'; },
    (marker) => { marker.toolchains.pop(); },
    (marker) => { marker.lockSha256 = 'b'.repeat(64); },
  ]) {
    const marker = structuredClone(fixture.marker);
    mutate(marker);
    assert.throws(() => check(marker));
  }
});

test('changed toolchain modules are rejected despite an unchanged matching marker and executables', async (context) => {
  const fixture = environment(context);
  writeFile(path.join(fixture.marker.toolchains[0].home, 'lib/modules'), 'tampered modules');
  const result = await fixture.run();
  assert.equal(result.status, 'failed');
  assert.equal(result.summary.notRun, 2);
  assert.match(result.errors[0], /extracted tree does not match lock/);
  assert.equal(fixture.calls.length, 0);
});

test('missing executables and a different real version cannot yield a passing ledger', async (context) => {
  const fixture = environment(context);
  const wrongVersion = await fixture.run({ execute: async (...args) => {
    const record = await fixture.execute(...args);
    if (args[1][0] === '-version') record.stderr = 'openjdk version "17.0.1"';
    return record;
  } });
  assert.equal(wrongVersion.status, 'failed');
  assert.match(wrongVersion.errors[0], /version does not match/);
  const javaPath = path.join(fixture.marker.toolchains[0].home, 'bin/java');
  fs.unlinkSync(javaPath);
  fixture.lock.toolchains[0].treeSha256 = treeDigest(fixture.marker.toolchains[0].home);
  fixture.save();
  const missing = await fixture.run();
  assert.equal(missing.status, 'failed');
  assert.equal(missing.summary.notRun, 2);
  assert.match(missing.errors[0], /ENOENT/);
});

test('runtime and source mutation during execution invalidate the overall ledger', async (context) => {
  const fixture = environment(context);
  for (const filename of [path.join(fixture.runtimeRoot, 'src/jvm.js'), fixture.sourcePath]) {
    const result = await fixture.run({ release: 21, execute: async (...args) => {
      const record = await fixture.execute(...args);
      if (args[0] === process.execPath) fs.appendFileSync(filename, '\nchanged');
      return record;
    } });
    assert.equal(result.status, 'failed');
    assert.equal(result.summary.passed, 0);
    assert.equal(result.summary.failed, 1);
    assert.equal(result.inputIntegrity.status, 'failed');
    assert.ok(result.errors.some((message) => /changed during comparison/.test(message)));
  }
});

test('malformed manifest writes a failed ledger and cannot be mistaken for zero-test success', async (context) => {
  const fixture = environment(context);
  writeFile(fixture.manifestPath, '{');
  const result = await fixture.run();
  assert.equal(result.status, 'failed');
  assert.equal(result.summary.required, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(fixture.calls.length, 0);
});

test('output rejects inputs, non-ledger files, runtime/toolchain paths and symlink escapes before errors can write', async (context) => {
  const fixture = environment(context);
  const preserved = [fixture.sourcePath, fixture.manifestPath, fixture.markerPath, fixture.lockPath,
    path.join(fixture.root, 'package.json'), path.join(fixture.runtimeRoot, 'vendor/java_home/jdk.json'),
    path.join(fixture.marker.toolchains[0].home, 'lib/modules')];
  for (const filename of preserved) {
    const before = fs.readFileSync(filename);
    await assert.rejects(fixture.run({ outputPath: filename }));
    assert.deepEqual(fs.readFileSync(filename), before);
  }
  writeFile(fixture.manifestPath, '{');
  const sourceBefore = fs.readFileSync(fixture.sourcePath);
  await assert.rejects(fixture.run({ outputPath: fixture.sourcePath }));
  assert.deepEqual(fs.readFileSync(fixture.sourcePath), sourceBefore);
  const otherJson = path.join(fixture.root, 'build/other.json');
  writeFile(otherJson, '{}');
  await assert.rejects(fixture.run({ outputPath: otherJson }), /not a Java compatibility result ledger/);
  assert.equal(fs.readFileSync(otherJson, 'utf8'), '{}');
  fs.symlinkSync(path.join(fixture.root, 'classes'), path.join(fixture.root, 'build/escape'));
  await assert.rejects(fixture.run({ outputPath: 'build/escape/result.json' }), /including through links/);
  assert.equal(fs.existsSync(path.join(fixture.root, 'classes/result.json')), false);
  fs.symlinkSync(otherJson, path.join(fixture.root, 'build/link.json'));
  await assert.rejects(fixture.run({ outputPath: 'build/link.json' }), /not a link/);
});

test('marker may be directly under build while outputs still cannot enter relocated toolchain homes', async (context) => {
  const fixture = environment(context);
  const markerPath = path.join(fixture.root, 'build/toolchains.json');
  writeFile(markerPath, JSON.stringify(fixture.marker));
  assert.equal((await fixture.run({ toolchainsPath: markerPath, release: 21 })).status, 'passed');
  const oldHome = fixture.marker.toolchains[0].home;
  const relocatedHome = path.join(fixture.root, 'build/relocated-toolchain21');
  fs.renameSync(oldHome, relocatedHome);
  fixture.marker.toolchains[0].home = relocatedHome;
  fixture.save();
  await assert.rejects(fixture.run({ outputPath: path.join(relocatedHome, 'new-result.json') }),
    /outside runtime\/toolchain directories/);
  const existingLedger = path.join(relocatedHome, 'existing-result.json');
  const bytes = fs.readFileSync(path.join(fixture.root, 'build/java-compatibility-results.json'));
  writeFile(existingLedger, bytes);
  await assert.rejects(fixture.run({ outputPath: existingLedger }), /outside runtime\/toolchain directories/);
  assert.deepEqual(fs.readFileSync(existingLedger), bytes);
});

test('process adapter records success, failure and missing executable without inheriting Java/Node options', async (context) => {
  const fixture = environment(context);
  const options = { cwd: fixture.root, timeoutMs: 3000 };
  const passed = await runCommand(process.execPath, ['-e', 'process.stdout.write("ok\\n");process.stderr.write("note\\n")'], options);
  assert.equal(passed.status, 'passed');
  assert.equal(passed.stdout, 'ok\n');
  assert.equal(passed.stderr, 'note\n');
  const failed = await runCommand(process.execPath, ['-e', 'process.exit(7)'], options);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.exitCode, 7);
  const missing = await runCommand(path.join(fixture.root, 'missing-command'), [], options);
  assert.equal(missing.status, 'error');
  assert.match(missing.error, /ENOENT/);
});

test('process adapter imposes finite timeout and combined output limits', async (context) => {
  const fixture = environment(context);
  const timeout = await runCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'],
    { cwd: fixture.root, timeoutMs: 100 });
  assert.equal(timeout.status, 'timeout');
  assert.equal(timeout.timedOut, true);
  assert.ok(timeout.durationMs < 3000);
  const oversized = await runCommand(process.execPath,
    ['-e', 'process.stdout.write("x".repeat(1024));setInterval(()=>{},1000)'],
    { cwd: fixture.root, timeoutMs: 3000, maxOutputBytes: 128 });
  assert.equal(oversized.status, 'output-limit');
  assert.equal(oversized.stdout.length + oversized.stderr.length, 128);
});

test('inherited Java/Node injection options are cleared for all subprocesses', async (context) => {
  const fixture = environment(context);
  const names = ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'CLASSPATH', 'NODE_OPTIONS', 'NODE_PATH'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) process.env[name] = '--invalid-injected-option';
    const result = await runCommand(process.execPath,
      ['-e', `process.stdout.write(JSON.stringify(${JSON.stringify(names)}.map(name => process.env[name] ?? null)))`],
      { cwd: fixture.root, timeoutMs: 3000 });
    assert.equal(result.status, 'passed');
    assert.deepEqual(JSON.parse(result.stdout), names.map(() => null));
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test('subprocess capture rejects different malformed UTF-8 bytes and preserves valid Unicode and a BOM', async (context) => {
  const fixture = environment(context);
  const results = [];
  for (const value of [0xff, 0xfe]) {
    const result = await runCommand(process.execPath,
      ['-e', `process.stdout.write(Buffer.from([${value}]))`],
      { cwd: fixture.root, timeoutMs: 3000 });
    assert.equal(result.status, 'error');
    assert.match(result.error, /Invalid UTF-8/);
    assert.equal(result.stdoutBase64, Buffer.from([value]).toString('base64'));
    results.push(result);
  }
  assert.notEqual(results[0].stdoutBase64, results[1].stdoutBase64);
  const unicode = '\ufeff한글\u03a9\ud83d\ude42\n';
  const result = await runCommand(process.execPath, ['-e', `process.stdout.write(${JSON.stringify(unicode)})`],
    { cwd: fixture.root, timeoutMs: 3000 });
  assert.equal(result.status, 'passed');
  assert.equal(result.stdout, unicode);
});
