import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {runCommand, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';

const filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(filename), '..');
const runtimeRoot = path.resolve(process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(repoRoot, 'build/release-cli'));
const timeoutMs = 30_000;
const argumentsToMain = ['', ' ', '  padded  ', '\t\n', '한글😀', '-ea', '--dash'];
const normalize = value => value.replaceAll('\r\n', '\n');
const argumentOutput = argumentsToMain.map(value => value.length + ':' + [...Array(value.length)].map((_, index) =>
  value.charCodeAt(index).toString(16) + ',').join('') + '\n').join('');
const ledgerScope = 'JAR launcher parity across native Java, Node CLI, JVM API, interpreter/JIT, and Chromium.';

function writeLedger(ledger) {
  const destination = path.join(repoRoot, 'build/jar-foundations-results.json');
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  if (fs.existsSync(destination)) {
    const stat = fs.lstatSync(destination);
    assert.ok(stat.isFile() && stat.nlink === 1, 'Refusing to replace a linked or non-regular JAR ledger.');
    assert.equal(JSON.parse(fs.readFileSync(destination, 'utf8')).scope, ledgerScope,
      'Refusing to replace an unrelated results file.');
  }
  fs.writeFileSync(destination, JSON.stringify(ledger, null, 2) + '\n', {mode: 0o600});
}

// Run each public API probe in a fresh process, just like the CLI/native probes.
// Track the real ZipFile close primitive while JarLauncher is on the stack so
// the test verifies the manifest handle is closed before application code runs.
function runApiProbe([runtime, jarPath, mode, jsonArguments]) {
  const require = createRequire(import.meta.url);
  const JVM = require(path.join(runtime, 'src/jvm')).default;
  const options = JVM.getDefaultOptions(runtime);
  options.classpath = [jarPath];
  options.tmpDir = os.tmpdir();
  options.intMode = mode === 'int';
  const expectedCloses = jarPath !== '' && fs.existsSync(jarPath) ? 1 : 0;
  let launcherCloses = 0;
  const vm = new JVM(options, error => {
    if (error) throw error;
    const close = vm.getNative('Ljava/util/zip/ZipFile;', 'close(J)V');
    vm.registerNative('java/util/zip/ZipFile', 'close(J)V', (thread, handle) => {
      if (thread.getStackTrace().some(frame => frame.method.cls.getInternalName() === 'Ldoppio/JarLauncher;')) {
        launcherCloses++;
      }
      return close(thread, handle);
    });
    const launch = vm.getNative('Ldoppio/JarLauncher;', 'launchMain(Ljava/lang/Class;[Ljava/lang/String;)V');
    vm.registerNative('doppio/JarLauncher', 'launchMain(Ljava/lang/Class;[Ljava/lang/String;)V', (...args) => {
      assert.equal(launcherCloses, 1, 'The launcher must close its JarFile before entering application code.');
      return launch(...args);
    });
    let completions = 0;
    vm.runJar(JSON.parse(jsonArguments), code => {
      assert.equal(++completions, 1, 'JVM.runJar must complete once.');
      assert.equal(launcherCloses, expectedCloses, 'Manifest and Main-Class failures must also close the launcher JarFile.');
      process.exitCode = code;
    });
  });
}

function assertExecution(record, entry, label) {
  assert.equal(record.timedOut, false, `${label}: timeout`);
  assert.equal(record.outputLimitExceeded, false, `${label}: output limit`);
  assert.equal(record.error, null, `${label}: host error ${record.error}`);
  assert.equal(record.signal, null, `${label}: signal`);
  if (record.browserErrors) assert.deepEqual(record.browserErrors, [], `${label}: browser errors`);
  assert.equal(record.exitCode, entry.exitCode, `${label}: ${record.stdout}\n${record.stderr}`);
  assert.equal(normalize(record.stdout), entry.stdout, `${label}: stdout`);
  if (entry.error) {
    assert.match(record.stderr, entry.error, `${label}: failure diagnostic`);
    assert.doesNotMatch(record.stderr, /InvocationTargetException/, `${label}: application exception must be unwrapped`);
  } else {
    assert.equal(record.stderr, '', `${label}: stderr`);
  }
}

export async function runJarTests({browser = false, caseIds = []} = {}) {
  const ledger = {schemaVersion: 1, scope: ledgerScope, status: 'running', startedAt: new Date().toISOString(),
    hosts: ['native', 'cli-jit', 'api-jit', 'api-int', ...(browser ? ['chromium'] : [])],
    node: process.version, normalization: 'CRLF to LF only',
    compilations: [], packaging: [], cases: [], invalidPaths: []};
  let temporaryRoot;
  let session;
  try {
    const lockBytes = fs.readFileSync(path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'));
    const lock = JSON.parse(lockBytes);
    const marker = JSON.parse(fs.readFileSync(path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json')));
    const [jdk25] = validateToolchains(marker, lock,
      crypto.createHash('sha256').update(lockBytes).digest('hex'), [25]);
    const expectedJdkDigest = lock.toolchains.find(entry => entry.feature === 25).treeSha256;
    assert.equal(treeDigest(jdk25.home), expectedJdkDigest, 'Prepared Java 25 JDK integrity');
    const java17 = tool => process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', tool) : tool;
    const java25 = tool => path.join(jdk25.home, 'bin', tool);
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-jar-launch-한글 '));
    const native17Version = await runCommand(java17('java'), ['-version'], {cwd: temporaryRoot, timeoutMs});
    ledger.toolchains = {java17: native17Version, java25: {...jdk25, treeSha256: expectedJdkDigest}};
    assert.equal(native17Version.exitCode, 0, 'The Java 17 native oracle must start.');
    assert.match(native17Version.stderr + native17Version.stdout, /version "17\./,
      'Use Java 17 (JAVA_HOME) for the legacy native oracle.');
    const archives = path.join(temporaryRoot, 'archives');
    const classes17 = path.join(temporaryRoot, 'classes17');
    const classes25 = path.join(temporaryRoot, 'classes25');
    for (const directory of [archives, classes17, classes25]) fs.mkdirSync(directory);
    let comparisons = 0;
    const source17 = path.join(temporaryRoot, 'JarLaunchFixture.java');
    fs.writeFileSync(source17, `public class JarLaunchFixture {
  public static void main(String[] args) {
    for (String arg : args) {
      System.out.print(arg.length() + ":");
      for (int i = 0; i < arg.length(); i++) System.out.print(Integer.toHexString(arg.charAt(i)) + ",");
      System.out.println();
    }
  }
  public static class Failure {
    public static void main(String[] args) { throw new IllegalStateException("jar-main-failure"); }
  }
  public static class Handler {
    public static void main(String[] args) {
      Thread.currentThread().setUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
        public void uncaughtException(Thread thread, Throwable error) {
          System.out.println("handler:" + error.getClass().getName() + ":" + error.getMessage());
          System.out.println("cause:" + error.getCause());
        }
      });
      throw new IllegalStateException("jar-handler-failure");
    }
  }
  public static class HandlerExit {
    public static void main(String[] args) {
      Thread.currentThread().setUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
        public void uncaughtException(Thread thread, Throwable error) {
          System.out.println("handler-exit-seven");
          System.exit(7);
        }
      });
      throw new IllegalStateException("jar-handler-exit");
    }
  }
  public static class Initialization {
    static { if (System.currentTimeMillis() >= 0) throw new IllegalStateException("jar-initializer-failure"); }
    public static void main(String[] args) { throw new AssertionError("failed initialization must prevent main"); }
  }
  public static class PrivateMain {
    private static void main(String[] args) { throw new AssertionError("private main must not run"); }
  }
  public static class MissingMain {}
}`);
    for (const [tool, classes, sources, release] of [
      [java17('javac'), classes17, [source17], 17],
      [java25('javac'), classes25, [path.join(repoRoot, 'classes/modern_fixture/Java25InstanceMain.java'),
        path.join(repoRoot, 'classes/modern_fixture/Java25CompactMain.java')], 25],
    ]) {
      const result = await runCommand(tool, ['--release', String(release), '-encoding', 'UTF-8',
        '-proc:none', '-d', classes, ...sources], {cwd: temporaryRoot, timeoutMs: 60_000});
      ledger.compilations.push({release, execution: result});
      assertExecution(result, {exitCode: 0, stdout: ''}, `compile Java ${release} JAR fixtures`);
    }
    const named25 = 'classes.modern_test.Java25InstanceMain';
    const cases = [
      {id: '한글 spaces', mainClass: 'JarLaunchFixture', stdout: argumentOutput, exitCode: 0},
      {id: 'missing-manifest', manifest: null, stdout: '', exitCode: 1,
        error: /JAR file is missing manifest/,
        nativeError: /no main manifest attribute|invalid or corrupt jarfile/i},
      {id: 'missing-main-attribute', manifest: 'Manifest-Version: 1.0\r\n\r\n', stdout: '', exitCode: 1,
        error: /does not specify a main class|no main manifest attribute/i},
      {id: 'missing-class', mainClass: 'missing.Main', stdout: '', exitCode: 1,
        error: /ClassNotFoundException|Could not find or load main class/},
      {id: 'missing-main-method', mainClass: 'JarLaunchFixture$MissingMain', stdout: '', exitCode: 1,
        error: /NoSuchMethodError|Main method not found/},
      {id: 'private-main-method', mainClass: 'JarLaunchFixture$PrivateMain', stdout: '', exitCode: 1,
        error: /NoSuchMethodError|Main method not found/},
      {id: 'main-failure', mainClass: 'JarLaunchFixture$Failure', stdout: '', exitCode: 1,
        error: /java\.lang\.IllegalStateException: jar-main-failure/},
      {id: 'main-handler', mainClass: 'JarLaunchFixture$Handler',
        stdout: 'handler:java.lang.IllegalStateException:jar-handler-failure\ncause:null\n', exitCode: 1},
      {id: 'handler-exit', mainClass: 'JarLaunchFixture$HandlerExit',
        stdout: 'handler-exit-seven\n', exitCode: 7},
      {id: 'initialization-failure', mainClass: 'JarLaunchFixture$Initialization',
        stdout: '', exitCode: 1, error: /java\.lang\.ExceptionInInitializerError/},
      {id: 'instance25', mainClass: named25, release: 25,
        stdout: 'instance-args=alpha|βeta\nconstructed=1\n', exitCode: 0},
      {id: 'compact25', mainClass: 'Java25CompactMain', release: 25,
        stdout: 'compact-args=alpha|βeta\ncompact-initialized\nnull\nobject-to-string\n', exitCode: 0},
      {id: 'static-noargs25', mainClass: named25 + '$StaticNoArgs', release: 25,
        stdout: 'static-no-args\n', exitCode: 0},
      {id: 'instance-noargs25', mainClass: named25 + '$ProtectedNoArgs', release: 25,
        stdout: 'protected-instance-no-args\n', exitCode: 0},
      {id: 'args-preference25', mainClass: named25 + '$ArgumentPreference', release: 25,
        stdout: 'instance-args-preferred=alpha|βeta\n', exitCode: 0},
      {id: 'inherited25', mainClass: named25 + '$Inherited', release: 25,
        stdout: 'inherited-args=alpha|βeta\n', exitCode: 0},
      {id: 'default-interface25', mainClass: named25 + '$InheritedDefault', release: 25,
        stdout: 'default-interface-args=alpha|βeta\n', exitCode: 0},
      {id: 'private-main25', mainClass: named25 + '$PrivateMainOnly', release: 25,
        stdout: '', exitCode: 1, error: /NoSuchMethodError|Main method not found/},
      {id: 'private-constructor25', mainClass: named25 + '$PrivateConstructor', release: 25,
        stdout: '', exitCode: 1, error: /NoSuchMethodError|private|constructor/i},
      {id: 'constructor-failure25', mainClass: named25 + '$ConstructorFailure', release: 25,
        stdout: '', exitCode: 1, error: /java\.lang\.IllegalStateException: constructor-failure/},
      {id: 'main-failure25', mainClass: named25 + '$MainFailure', release: 25,
        stdout: '', exitCode: 1, error: /java\.lang\.IllegalArgumentException: main-failure/},
    ];
    assert.ok(caseIds.every(id => cases.some(entry => entry.id === id)), 'Every selected JAR case must exist.');
    const selectedCases = caseIds.length === 0 ? cases : cases.filter(entry => caseIds.includes(entry.id));
    ledger.selectedCases = selectedCases.map(entry => entry.id);
    ledger.omittedCases = cases.filter(entry => !selectedCases.includes(entry)).map(entry => entry.id);
    for (const entry of selectedCases) {
      entry.jarPath = path.join(archives, entry.id + '.jar');
      const manifestRoot = path.join(temporaryRoot, 'manifests', entry.id);
      const args = ['--create', '--no-manifest', '--file', entry.jarPath,
        '-C', entry.release === 25 ? classes25 : classes17, '.'];
      if (entry.manifest !== null) {
        fs.mkdirSync(path.join(manifestRoot, 'META-INF'), {recursive: true});
        fs.writeFileSync(path.join(manifestRoot, 'META-INF/MANIFEST.MF'), entry.manifest ??
          `Manifest-Version: 1.0\r\nMain-Class: ${entry.mainClass}\r\n\r\n`);
        args.push('-C', manifestRoot, 'META-INF/MANIFEST.MF');
      }
      const packed = await runCommand(java17('jar'), args, {cwd: temporaryRoot, timeoutMs: 30_000});
      ledger.packaging.push({id: entry.id, execution: packed});
      assertExecution(packed, {exitCode: 0, stdout: ''}, `pack ${entry.id}`);
    }
    if (browser) {
      const {createBrowserSession} = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({repoRoot});
      ledger.browser = session.provenance;
    }
    const runner = path.join(runtimeRoot, 'console/runner.js');
    const inventory = new Map(selectedCases.map(entry => [entry.id,
      crypto.createHash('sha256').update(fs.readFileSync(entry.jarPath)).digest('hex')]));
    for (const entry of selectedCases) {
      const programArguments = entry.release === 25 ? ['alpha', 'βeta'] : argumentsToMain;
      const record = {id: entry.id, release: entry.release || 17, mainClass: entry.mainClass || null,
        archive: {path: entry.jarPath, sha256: inventory.get(entry.id)}, arguments: programArguments,
        expected: {exitCode: entry.exitCode, stdout: entry.stdout, error: entry.error?.source || null,
          nativeError: (entry.nativeError || entry.error)?.source || null},
        status: 'running', execution: {}};
      ledger.cases.push(record);
      const native = await runCommand(entry.release === 25 ? java25('java') : java17('java'),
        ['-jar', entry.jarPath, ...programArguments], {cwd: temporaryRoot, timeoutMs});
      record.execution.native = native;
      assertExecution(native, {...entry, error: entry.nativeError || entry.error}, `native ${entry.id}`);
      for (const host of ['cli-jit', 'api-jit', 'api-int', ...(browser ? ['chromium'] : [])]) {
        let result;
        if (host === 'chromium') {
          result = await session.execute({classesPath: archives, jarPath: '/classes/' + path.basename(entry.jarPath),
            arguments: programArguments, timeoutMs});
        } else {
          const args = host === 'cli-jit' ? [runner, '-jar', entry.jarPath, ...programArguments] :
            [filename, '--api-run', runtimeRoot, entry.jarPath, host === 'api-int' ? 'int' : 'jit',
              JSON.stringify(programArguments)];
          result = await runCommand(process.execPath, ['--no-deprecation', ...args], {cwd: temporaryRoot, timeoutMs});
        }
        record.execution[host] = result;
        assertExecution(result, entry, `${host} ${entry.id}`);
        comparisons++;
      }
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(entry.jarPath)).digest('hex'),
        inventory.get(entry.id), `${entry.id}: unchanged input JAR`);
      record.status = 'passed';
      console.log(`PASS JAR launch ${entry.id}`);
    }
    for (const jarPath of ['', path.join(archives, 'absent.jar')]) {
      for (const args of [[runner, '-jar', jarPath],
        [filename, '--api-run', runtimeRoot, jarPath, 'jit', '[]']]) {
        const result = await runCommand(process.execPath, ['--no-deprecation', ...args],
          {cwd: temporaryRoot, timeoutMs});
        ledger.invalidPaths.push({path: jarPath, execution: result});
        assert.equal(result.timedOut, false, 'Empty/missing JAR path must not hang.');
        assert.equal(result.error, null, 'Empty/missing JAR path must not throw a host error.');
        assert.equal(result.exitCode, 1, 'Empty/missing JAR path must fail.');
        assert.notEqual(result.stderr, '', 'Empty/missing JAR path needs a diagnostic.');
        comparisons++;
      }
    }
    assert.equal(treeDigest(jdk25.home), expectedJdkDigest, 'Java 25 JDK integrity after JAR tests');
    if (session) session.verifyIntegrity();
    ledger.status = 'passed';
    ledger.comparisons = comparisons;
    console.log(`PASS JAR launcher: ${selectedCases.length} native cases, ${comparisons} guest checks (CLI, JVM API, interpreter/JIT${browser ? ', Chromium' : ''})`);
    return {cases: selectedCases.length, comparisons};
  } catch (error) {
    ledger.status = 'failed';
    ledger.error = error.stack || error.message;
    for (const record of ledger.cases) if (record.status === 'running') record.status = 'failed';
    throw error;
  } finally {
    try {
      if (session) await session.close();
    } finally {
      if (temporaryRoot) fs.rmSync(temporaryRoot, {recursive: true, force: true});
      ledger.completedAt = new Date().toISOString();
      writeLedger(ledger);
    }
  }
}

if (process.argv[2] === '--api-run') {
  runApiProbe(process.argv.slice(3));
} else if (process.argv[1] && path.resolve(process.argv[1]) === filename) {
  try {
    const options = process.argv.slice(2);
    assert.ok(options.every(argument => argument === '--browser' || argument.startsWith('--case=')) &&
      options.filter(argument => argument === '--browser').length <= 1,
    'Usage: node ci/jar_launch_test.mjs [--browser] [--case=CASE_ID ...]');
    await runJarTests({browser: options.includes('--browser'),
      caseIds: options.filter(argument => argument.startsWith('--case=')).map(argument => argument.slice(7))});
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
