import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectClassFiles, runCommand, validateToolchains } from './run_java_compatibility.mjs';
import { treeDigest } from './prepare_java_compatibility_toolchains.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const namedMain = 'classes.modern_test.Java25InstanceMain';
const programArguments = ['alpha', 'βeta'];
const normalize = (value) => value.replaceAll('\r\n', '\n');
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const timeoutMs = 30_000;

// These are actual compiler-generated classes, never hand-patched versions or
// preview class files. Failure wording is implementation-defined by JLS 12.1.4.
const positiveCases = [
  ['', 'instance-args=alpha|βeta\nconstructed=1\n'],
  ['$StaticNoArgs', 'static-no-args\n'],
  ['$ProtectedNoArgs', 'protected-instance-no-args\n'],
  ['$ArgumentPreference', 'instance-args-preferred=alpha|βeta\n'],
  ['$StaticArgumentPreference', 'static-args-preferred=alpha|βeta\n'],
  ['$Inherited', 'inherited-args=alpha|βeta\n'],
  ['$InheritedArgumentPreference', 'inherited-args=alpha|βeta\n'],
  ['$InheritedDefault', 'default-interface-args=alpha|βeta\n'],
  ['$StaticInterfaceMain', 'interface-static-args=alpha|βeta\n'],
  ['$InterfaceStaticNotInherited', 'interface-static-not-inherited\n'],
  ['$PrivateArgumentFallback', 'private-args-ignored\n'],
].map(([suffix, stdout]) => ({ mainClass: namedMain + suffix, stdout, directory: 'named25' }));
positiveCases.push(
  { mainClass: 'Java25CompactMain', directory: 'compact25',
    stdout: 'compact-args=alpha|βeta\ncompact-initialized\nnull\nobject-to-string\n' },
);

// JLS 25 12.1.4 admits only non-private main members. The pinned Corretto
// launcher invokes non-inherited private/package superclass methods in these
// combinations. Verify Doppio's Java-language selection
// separately: these results do not claim equivalence with that native oracle.
const specOnlyCases = [{ mainClass: namedMain + '$PrivateBaseDefault', directory: 'named25',
  stdout: 'default-interface-args=alpha|βeta\n',
  oracleDifference: /java\.lang\.AssertionError: private superclass main must not run/ },
{ mainClass: 'launcher.other.PackageDefault', directory: 'named25',
  stdout: 'cross-package-default=alpha|βeta\n',
  oracleDifference: /java\.lang\.AssertionError: non-inherited package main must not run/ },
{ mainClass: 'launcher.base.Returned', directory: 'named25',
  stdout: 'package-main-not-reinherited\n',
  oracleDifference: /java\.lang\.AssertionError: non-inherited package main must not run/ }];

const negativeCases = [
  { suffix: '$PrivateMainOnly', guestError: /java\.lang\.NoSuchMethodError/ },
  { suffix: '$MissingConstructor', guestError: /java\.lang\.NoSuchMethodError/ },
  { suffix: '$PrivateConstructor', guestError: /java\.lang\.NoSuchMethodError/ },
  { suffix: '$ConstructorFailure', sharedError: /java\.lang\.IllegalStateException: constructor-failure/ },
  { suffix: '$MainFailure', sharedError: /java\.lang\.IllegalArgumentException: main-failure/ },
  { suffix: '$AbstractInstance', guestError: /java\.lang\.InstantiationError/ },
].map((entry) => ({ ...entry, mainClass: namedMain + entry.suffix, directory: 'named25' }));

function assertCompleted(record, label) {
  assert.equal(record.signal, null, `${label}: signal`);
  assert.equal(record.timedOut, false, `${label}: timeout`);
  assert.equal(record.outputLimitExceeded, false, `${label}: output limit`);
  assert.equal(record.error, null, `${label}: host error`);
}

function assertSuccess(record, label, stdout) {
  assertCompleted(record, label);
  assert.equal(record.status, 'passed', `${label}: ${record.stderr}`);
  assert.equal(record.exitCode, 0, `${label}: exit code`);
  assert.equal(normalize(record.stdout), stdout, `${label}: stdout`);
  assert.equal(normalize(record.stderr), '', `${label}: stderr`);
}

function assertFailure(record, label, expectedError) {
  assertCompleted(record, label);
  assert.equal(record.status, 'failed', `${label}: ${record.stdout} ${record.stderr}`);
  assert.ok(Number.isInteger(record.exitCode) && record.exitCode !== 0, `${label}: failure must exit nonzero`);
  assert.equal(record.stdout, '', `${label}: failed launch must not execute main body`);
  assert.notEqual(record.stderr, '', `${label}: failure diagnostic`);
  assert.doesNotMatch(record.stderr, /AssertionError|must not run|must prevent main/, `${label}: forbidden main body`);
  if (expectedError) assert.match(record.stderr, expectedError, `${label}: exception type and message`);
}

export async function runMainTests({ browser = false } = {}) {
  const lockBytes = fs.readFileSync(path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'));
  const lock = JSON.parse(lockBytes);
  const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const toolchain = (release) => marker.toolchains.find((entry) => entry.feature === release);
  for (const entry of marker.toolchains) {
    assert.equal(treeDigest(entry.home), lock.toolchains.find((locked) => locked.id === entry.id).treeSha256,
      `${entry.id}: prepared JDK integrity`);
  }
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-java25-main-test-'));
  let session;
  let comparisons = 0;
  try {
    const directories = Object.fromEntries(['named25', 'compact25', 'legacy21'].map((id) => {
      const directory = path.join(temporaryRoot, id);
      fs.mkdirSync(directory);
      return [id, directory];
    }));
    const generated = {
      'launcher/base/Base.java': `package launcher.base;
public class Base {
  void main(String[] args) { throw new AssertionError("non-inherited package main must not run"); }
}`,
      'launcher/other/Bridge.java': 'package launcher.other; public class Bridge extends launcher.base.Base {}',
      'launcher/base/Returned.java': `package launcher.base;
public class Returned extends launcher.other.Bridge {
  void main() { System.out.println("package-main-not-reinherited"); }
}`,
      'launcher/other/PackageDefault.java': `package launcher.other;
interface DefaultMain {
  default void main(String[] args) { System.out.println("cross-package-default=" + String.join("|", args)); }
}
public class PackageDefault extends launcher.base.Base implements DefaultMain {}`,
    };
    const generatedSources = Object.entries(generated).map(([relative, source]) => {
      const filename = path.join(temporaryRoot, 'sources', relative);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, source);
      return filename;
    });
    const namedSource = path.join(repoRoot, 'classes/modern_fixture/Java25InstanceMain.java');
    const compactSource = path.join(repoRoot, 'classes/modern_fixture/Java25CompactMain.java');
    const emptySourcePath = path.join(temporaryRoot, 'empty-sourcepath');
    fs.mkdirSync(emptySourcePath);
    for (const [directory, release, sources] of [
      ['named25', 25, [namedSource, ...generatedSources]],
      ['compact25', 25, [compactSource]],
      ['legacy21', 21, [namedSource]],
    ]) {
      const result = await runCommand(path.join(toolchain(release).home, 'bin/javac'),
        ['--release', String(release), '-encoding', 'UTF-8', '-proc:none',
          '-classpath', emptySourcePath, '-sourcepath', emptySourcePath,
          '-d', directories[directory], ...sources],
        { cwd: temporaryRoot, timeoutMs: 60_000 });
      assertSuccess(result, `compile ${directory}`, '');
    }
    const classInventories = Object.fromEntries(Object.entries(directories).map(([id, directory]) =>
      [id, inspectClassFiles(directory, id === 'legacy21' ? 21 : 25,
        id === 'compact25' ? 'Java25CompactMain' : namedMain)]));
    const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
    const runtimeRoot = path.dirname(path.dirname(runnerPath));
    // Build roots intentionally contain repository symlinks (for example,
    // classes/); hash only the complete code and bootstrap inputs actually
    // consumed by the CLI rather than following unrelated checkout links.
    const runtimeSnapshot = () => ['console', 'src', 'vendor/java_home'].map((relative) =>
      [relative, treeDigest(fs.realpathSync(path.join(runtimeRoot, relative)))]);
    const runtimeDigest = runtimeSnapshot();
    if (browser) {
      const { createBrowserSession } = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({ repoRoot });
    }
    const execute = async (host, entry, release = 25) => {
      const classesPath = directories[entry.directory];
      let result;
      if (host === 'chromium') {
        result = await session.execute({ classesPath, mainClass: entry.mainClass,
          arguments: programArguments, timeoutMs });
      } else {
        const command = host === 'native' ? path.join(toolchain(release).home, 'bin/java') : process.execPath;
        const argumentsPrefix = host === 'native' ? [] : ['--no-deprecation', runnerPath];
        result = await runCommand(command,
          [...argumentsPrefix, '-cp', classesPath, entry.mainClass, ...programArguments],
          { cwd: temporaryRoot, timeoutMs });
      }
      assert.deepEqual(inspectClassFiles(classesPath, release, entry.mainClass),
        classInventories[entry.directory], `${host} ${entry.mainClass}: unchanged class bytes`);
      return result;
    };
    const guestHosts = browser ? ['node', 'chromium'] : ['node'];
    for (const entry of positiveCases) {
      const native = await execute('native', entry);
      assertSuccess(native, `native ${entry.mainClass}`, entry.stdout);
      for (const host of guestHosts) {
        const guest = await execute(host, entry);
        assertSuccess(guest, `${host} ${entry.mainClass}`, normalize(native.stdout));
        comparisons++;
      }
      console.log(`PASS Java 25 launch ${entry.mainClass}`);
    }
    for (const entry of negativeCases) {
      const native = await execute('native', entry);
      assertFailure(native, `native ${entry.mainClass}`, entry.sharedError);
      for (const host of guestHosts) {
        const guest = await execute(host, entry);
        assertFailure(guest, `${host} ${entry.mainClass}`, entry.sharedError || entry.guestError);
        comparisons++;
      }
      console.log(`PASS Java 25 launch failure ${entry.mainClass}`);
    }
    for (const entry of specOnlyCases) {
      const native = await execute('native', entry);
      assertCompleted(native, `pinned native oracle difference ${entry.mainClass}`);
      assert.equal(native.exitCode, 1, `${entry.mainClass}: pinned oracle difference must remain explicit`);
      assert.match(native.stderr, entry.oracleDifference);
      for (const host of guestHosts) {
        assertSuccess(await execute(host, entry), `${host} JLS-only ${entry.mainClass}`, entry.stdout);
        comparisons++;
      }
      console.log(`PASS JLS 25 12.1.4 non-private inherited main ${entry.mainClass} ` +
        '(spec-only; pinned Corretto native launcher differs)');
    }
    const legacyStatic = { mainClass: namedMain + '$StaticInterfaceMain', directory: 'legacy21' };
    const legacyNoArgs = { mainClass: namedMain + '$StaticNoArgs', directory: 'legacy21' };
    const nativeLegacy = await execute('native', legacyStatic, 21);
    assertSuccess(nativeLegacy, 'native legacy public static String[]', 'interface-static-args=alpha|βeta\n');
    assertFailure(await execute('native', legacyNoArgs, 21), 'native legacy zero-argument main');
    for (const host of guestHosts) {
      assertSuccess(await execute(host, legacyStatic, 21), `${host} legacy public static String[]`, nativeLegacy.stdout);
      const legacyFailure = await execute(host, legacyNoArgs, 21);
      assertCompleted(legacyFailure, `${host} legacy zero-argument main`);
      assert.equal(legacyFailure.stdout, '', `${host}: Java 25 protocol must not run on Java 21 class files`);
      assert.match(legacyFailure.stderr, /java\.lang\.NoSuchMethodError/);
      comparisons += 2;
    }
    console.log('PASS Java 21 launcher protocol remains unchanged');
    assert.deepEqual(runtimeSnapshot(), runtimeDigest, 'CLI runtime integrity after launcher tests');
    for (const entry of marker.toolchains) {
      assert.equal(treeDigest(entry.home), lock.toolchains.find((locked) => locked.id === entry.id).treeSha256,
        `${entry.id}: JDK integrity after launcher tests`);
    }
    if (session) session.verifyIntegrity();
    console.log(`PASS Java 25 launcher: ${positiveCases.length} oracle-positive, ${negativeCases.length} oracle-negative, ` +
      `2 legacy, ${specOnlyCases.length} JLS-only cases; ${comparisons} guest checks`);
    return { positive: positiveCases.length, negative: negativeCases.length, legacy: 2,
      specOnly: specOnlyCases.length, comparisons };
  } finally {
    try {
      if (session) await session.close();
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.argv.slice(2).every((argument) => argument === '--browser') &&
      process.argv.slice(2).length <= 1, 'Usage: node ci/java25_main_test.mjs [--browser]');
    await runMainTests({ browser: process.argv.includes('--browser') });
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
