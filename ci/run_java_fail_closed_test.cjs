'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..');
const taskSourcePath = path.join(repoRoot, 'tasks', 'java.ts');
const javaExecutable = path.join(path.sep, 'runtime with spaces', 'bin', 'java');
const bootclasspath = path.join(path.sep, 'bootstrap with spaces', 'rt.jar');
const versionStdout = '';
const versionStderr = 'openjdk version "17.0.20"\n';
const invocationTimeoutMs = 3000;

function parallelLimit(tasks, limit, finalCallback) {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`Invalid parallel limit ${limit}.`);
  }
  if (tasks.length === 0) {
    setImmediate(finalCallback);
    return;
  }

  let next = 0;
  let running = 0;
  let completed = 0;
  let firstError = null;

  function launch() {
    while (running < limit && next < tasks.length) {
      const task = tasks[next++];
      running += 1;
      let called = false;
      try {
        task((error) => {
          if (called) {
            throw new Error('parallelLimit worker callback ran more than once.');
          }
          called = true;
          running -= 1;
          completed += 1;
          firstError = firstError || error || null;
          if (completed === tasks.length) {
            finalCallback(firstError);
          } else {
            launch();
          }
        });
      } catch (error) {
        called = true;
        running -= 1;
        completed += 1;
        firstError = firstError || error;
        if (completed === tasks.length) {
          finalCallback(firstError);
        } else {
          launch();
        }
      }
    }
  }

  launch();
}

function loadJavaTask(childProcessStub, fileSystem = fs, cpuCount = 2) {
  const source = fs.readFileSync(taskSourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2015,
    },
    fileName: taskSourcePath,
  }).outputText;
  const loadedModule = { exports: {} };
  const loadDependency = (name) => {
    if (name === 'child_process') {
      return childProcessStub;
    }
    if (name === 'async') {
      return { parallelLimit };
    }
    if (name === 'os') {
      return { ...os, cpus: () => Array.from({ length: cpuCount }, () => ({})) };
    }
    if (name === 'fs') {
      return fileSystem;
    }
    if (name === 'path') {
      return path;
    }
    throw new Error(`Unexpected task dependency ${name}.`);
  };
  const evaluate = new Function('require', 'module', 'exports', compiled);
  evaluate(loadDependency, loadedModule, loadedModule.exports);
  assert.equal(typeof loadedModule.exports, 'function');
  return loadedModule.exports;
}

function createHarness(childProcessStub, fileSystem = fs, options = {}) {
  const messages = [];
  let runJavaTask = null;
  const configValues = {
    'build.java': javaExecutable,
    'build.bootclasspath': bootclasspath,
    ...(options.configValues || {}),
  };
  function config(name) {
    return configValues[name];
  }
  config.requires = (name) => {
    if (!(name in configValues)) {
      throw new Error(`Missing fake Grunt config ${name}.`);
    }
  };

  const grunt = {
    config,
    registerMultiTask(name, description, task) {
      if (name === 'run_java') {
        runJavaTask = task;
      }
    },
    registerTask() {},
    file: {
      mkdir(directory) {
        fs.mkdirSync(directory, { recursive: true });
      },
    },
    log: {
      error(message) {
        messages.push(String(message));
      },
      ok(message) {
        messages.push(String(message));
      },
      writeln(message) {
        messages.push(String(message));
      },
    },
    fail: {
      fatal(message) {
        throw new Error(String(message));
      },
    },
  };
  loadJavaTask(
    childProcessStub,
    fileSystem,
    options.cpuCount === undefined ? 2 : options.cpuCount
  )(grunt);
  assert.equal(typeof runJavaTask, 'function');
  return { messages, runJavaTask };
}

function invokeRunJava(runJavaTask, files, optionOverrides = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Fake run_java task did not settle.'));
      }
    }, invocationTimeoutMs);
    const context = {
      files,
      target: 'default',
      options(defaults) {
        return { ...defaults, ...optionOverrides };
      },
      async() {
        return (status) => {
          if (settled) {
            throw new Error('Fake run_java completion callback ran more than once.');
          }
          settled = true;
          clearTimeout(timeout);
          resolve(status !== false);
        };
      },
    };
    try {
      runJavaTask.call(context);
    } catch (error) {
      settled = true;
      clearTimeout(timeout);
      reject(error);
    }
  });
}

function createRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-run-java-fail-closed-'));
  fs.mkdirSync(path.join(root, 'classes', 'test'), { recursive: true });
  return root;
}

function fixture(root, name, sourceContents = `class ${name} {}\n`) {
  const source = path.join(root, 'classes', 'test', `${name}.java`);
  const destination = path.join(root, 'classes', 'test', `${name}.runout`);
  fs.writeFileSync(source, sourceContents);
  fs.utimesSync(source, new Date(2000), new Date(2000));
  return {
    source,
    destination,
    gruntFile: {
      src: [`classes/test/${name}.java`],
      dest: `classes/test/${name}.runout`,
    },
  };
}

function versionFingerprint(currentBootclasspath = bootclasspath) {
  return `${javaExecutable}\n${currentBootclasspath}\n${versionStdout}${versionStderr}`;
}

function writeVersionStamp(root, currentBootclasspath = bootclasspath) {
  const stamp = path.join(root, 'build', '.native-java-version-default');
  fs.mkdirSync(path.dirname(stamp), { recursive: true });
  fs.writeFileSync(stamp, versionFingerprint(currentBootclasspath));
  return stamp;
}

function assertNoTemporaryRunouts(root) {
  const entries = fs.readdirSync(path.join(root, 'classes', 'test'));
  assert.deepEqual(entries.filter((name) => name.startsWith('.native-runout-')), []);
}

function assertVersionCall(call) {
  assert.equal(call.command, javaExecutable);
  assert.deepEqual(call.args, ['-version']);
  assert.equal(call.options.encoding, 'utf8');
  assert.equal(call.options.timeout, 60_000);
  assert.equal(call.options.maxBuffer, 1024 * 1024);
  assert.equal(call.options.killSignal, 'SIGKILL');
  assert.equal(call.options.windowsHide, true);
}

function assertFixtureCall(call, expectedBootclasspath = bootclasspath) {
  assert.equal(call.command, javaExecutable);
  assert.deepEqual(call.args.slice(0, 3), [
    '-Dfile.encoding=UTF8',
    '-ea',
    `-Xbootclasspath/a:${expectedBootclasspath}`,
  ]);
  assert.match(call.args[3], /^classes\/test\/[A-Z]$/);
  assert.equal(Object.prototype.hasOwnProperty.call(call.options, 'shell'), false);
  assert.equal(call.options.encoding, 'utf8');
  assert.equal(call.options.timeout, 60_000);
  assert.equal(call.options.maxBuffer, 1024 * 1024);
  assert.equal(call.options.killSignal, 'SIGKILL');
  assert.equal(call.options.windowsHide, true);
}

async function inRoot(root, operation) {
  const previous = process.cwd();
  process.chdir(root);
  try {
    return await operation();
  } finally {
    process.chdir(previous);
  }
}

async function testSuccessAndCache() {
  const root = createRoot();
  const a = fixture(root, 'A');
  const b = fixture(root, 'B');
  fs.writeFileSync(a.destination, 'old A\n');
  fs.utimesSync(a.destination, new Date(1000), new Date(1000));
  const versionCalls = [];
  const fixtureCalls = [];
  const childProcessStub = {
    spawnSync(command, args, options) {
      versionCalls.push({ command, args, options });
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      fixtureCalls.push({ command, args, options });
      const className = args[args.length - 1];
      setTimeout(
        () => callback(null, `${className}:stdout\n`, `${className}:stderr\n`),
        className.endsWith('/A') ? 10 : 1
      );
    },
  };
  const harness = createHarness(childProcessStub);
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile, b.gruntFile]), true);
      assert.equal(
        fs.readFileSync(a.destination, 'utf8'),
        'classes/test/A:stdout\nclasses/test/A:stderr\n'
      );
      assert.equal(
        fs.readFileSync(b.destination, 'utf8'),
        'classes/test/B:stdout\nclasses/test/B:stderr\n'
      );
      assert.equal(
        fs.readFileSync(path.join(root, 'build', '.native-java-version-default'), 'utf8'),
        versionFingerprint()
      );
      assertNoTemporaryRunouts(root);
      assert.equal(fixtureCalls.length, 2);
      fixtureCalls.forEach((call) => assertFixtureCall(call));
      assertVersionCall(versionCalls[0]);

      const fixtureCallCount = fixtureCalls.length;
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile, b.gruntFile]), true);
      assert.equal(fixtureCalls.length, fixtureCallCount);
      assert.equal(versionCalls.length, 2);
      assertVersionCall(versionCalls[1]);
      assertNoTemporaryRunouts(root);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 2;
}

async function testNonzeroDrainsBeforeFailure() {
  const root = createRoot();
  const a = fixture(root, 'A');
  const b = fixture(root, 'B');
  fs.writeFileSync(a.destination, 'verified A\n');
  fs.writeFileSync(b.destination, 'verified B\n');
  fs.utimesSync(a.destination, new Date(1000), new Date(1000));
  fs.utimesSync(b.destination, new Date(1000), new Date(1000));
  const stamp = writeVersionStamp(root);
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      assertFixtureCall({ command, args, options });
      if (args[args.length - 1].endsWith('/A')) {
        setImmediate(() => callback(null, 'new A\n', ''));
        return;
      }
      setTimeout(() => {
        assert.equal(fs.readFileSync(a.destination, 'utf8'), 'verified A\n');
        assert.equal(fs.readFileSync(b.destination, 'utf8'), 'verified B\n');
        assert.equal(fs.existsSync(stamp), false);
        const error = new Error('fixture exited unsuccessfully');
        error.code = 7;
        error.signal = null;
        error.killed = false;
        callback(error, 'partial B\n', 'failure B\n');
      }, 20);
    },
  };
  const harness = createHarness(childProcessStub);
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile, b.gruntFile]), false);
      assert.equal(fs.readFileSync(a.destination, 'utf8'), 'verified A\n');
      assert.equal(fs.readFileSync(b.destination, 'utf8'), 'verified B\n');
      assert.equal(fs.existsSync(stamp), false);
      assertNoTemporaryRunouts(root);
      assert.match(harness.messages.join('\n'), /code=7/);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testTimeoutDiscardsPartialOutput() {
  const root = createRoot();
  const a = fixture(root, 'A');
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      assertFixtureCall({ command, args, options });
      const error = new Error('fixture timed out');
      error.code = 'ETIMEDOUT';
      error.signal = 'SIGKILL';
      error.killed = true;
      setImmediate(() => callback(error, 'partial output\n', ''));
    },
  };
  const harness = createHarness(childProcessStub);
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile]), false);
      assert.equal(fs.existsSync(a.destination), false);
      assert.equal(fs.existsSync(path.join(root, 'build', '.native-java-version-default')), false);
      assertNoTemporaryRunouts(root);
      assert.match(harness.messages.join('\n'), /ETIMEDOUT/);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testProcessFailure(errorProperties) {
  const root = createRoot();
  const a = fixture(root, 'A');
  fs.writeFileSync(a.destination, 'verified A\n');
  fs.utimesSync(a.destination, new Date(1000), new Date(1000));
  const stamp = writeVersionStamp(root);
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      assertFixtureCall({ command, args, options });
      const error = new Error(errorProperties.message);
      Object.assign(error, errorProperties);
      setImmediate(() => callback(error, 'partial output\n', 'partial error\n'));
    },
  };
  const harness = createHarness(childProcessStub);
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile]), false);
      assert.equal(fs.readFileSync(a.destination, 'utf8'), 'verified A\n');
      assert.equal(fs.existsSync(stamp), false);
      assertNoTemporaryRunouts(root);
      assert.match(harness.messages.join('\n'), new RegExp(String(errorProperties.code || errorProperties.signal)));
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testInvalidOptionsFailBeforeSpawn() {
  const root = createRoot();
  const a = fixture(root, 'A');
  let spawnCalls = 0;
  let fixtureCalls = 0;
  const childProcessStub = {
    spawnSync() {
      spawnCalls += 1;
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile() {
      fixtureCalls += 1;
    },
  };
  const harness = createHarness(childProcessStub);
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile], { timeout: 0 }), false);
      assert.equal(spawnCalls, 0);
      assert.equal(fixtureCalls, 0);
      assert.equal(fs.existsSync(a.destination), false);
      assert.match(harness.messages.join('\n'), /positive finite integers/);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testCleanupFailureCannotPublishStamp() {
  const root = createRoot();
  const a = fixture(root, 'A');
  let rmdirCalls = 0;
  const fileSystemStub = Object.create(fs);
  fileSystemStub.rmdirSync = (directory) => {
    rmdirCalls += 1;
    if (rmdirCalls === 1) {
      throw new Error('injected temporary-directory cleanup failure');
    }
    return fs.rmdirSync(directory);
  };
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      assertFixtureCall({ command, args, options });
      setImmediate(() => callback(null, 'complete output\n', ''));
    },
  };
  const harness = createHarness(childProcessStub, fileSystemStub);
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile]), false);
      assert.equal(fs.readFileSync(a.destination, 'utf8'), 'complete output\n');
      assert.equal(fs.existsSync(path.join(root, 'build', '.native-java-version-default')), false);
      assertNoTemporaryRunouts(root);
      assert.ok(rmdirCalls >= 2);
      assert.match(harness.messages.join('\n'), /injected temporary-directory cleanup failure/);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testSynchronousLaunchThrowDrainsBeforeFailure() {
  const root = createRoot();
  const a = fixture(root, 'A');
  const b = fixture(root, 'B');
  fs.writeFileSync(a.destination, 'verified A\n');
  fs.writeFileSync(b.destination, 'verified B\n');
  fs.utimesSync(a.destination, new Date(1000), new Date(1000));
  fs.utimesSync(b.destination, new Date(1000), new Date(1000));
  const stamp = writeVersionStamp(root);
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      assertFixtureCall({ command, args, options });
      if (args[args.length - 1].endsWith('/B')) {
        throw new Error('injected synchronous launch failure');
      }
      setTimeout(() => callback(null, 'complete A\n', ''), 10);
    },
  };
  const harness = createHarness(childProcessStub);
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile, b.gruntFile]), false);
      assert.equal(fs.readFileSync(a.destination, 'utf8'), 'verified A\n');
      assert.equal(fs.readFileSync(b.destination, 'utf8'), 'verified B\n');
      assert.equal(fs.existsSync(stamp), false);
      assertNoTemporaryRunouts(root);
      assert.match(harness.messages.join('\n'), /injected synchronous launch failure/);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testPublicationFailureSuppressesStamp() {
  const root = createRoot();
  const a = fixture(root, 'A');
  const b = fixture(root, 'B');
  fs.writeFileSync(a.destination, 'verified A\n');
  fs.writeFileSync(b.destination, 'verified B\n');
  fs.utimesSync(a.destination, new Date(1000), new Date(1000));
  fs.utimesSync(b.destination, new Date(1000), new Date(1000));
  const stamp = writeVersionStamp(root);
  let renameCalls = 0;
  const fileSystemStub = Object.create(fs);
  fileSystemStub.renameSync = (source, destination) => {
    renameCalls += 1;
    if (renameCalls === 2) {
      throw new Error('injected second publication failure');
    }
    fs.renameSync(source, destination);
  };
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      assertFixtureCall({ command, args, options });
      setImmediate(() => callback(null, `${args[args.length - 1]}:complete\n`, ''));
    },
  };
  const harness = createHarness(childProcessStub, fileSystemStub, { cpuCount: 1 });
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile, b.gruntFile]), false);
      assert.equal(fs.readFileSync(a.destination, 'utf8'), 'classes/test/A:complete\n');
      assert.equal(fs.readFileSync(b.destination, 'utf8'), 'verified B\n');
      assert.equal(fs.existsSync(stamp), false);
      assertNoTemporaryRunouts(root);
      assert.equal(renameCalls, 2);
      assert.match(harness.messages.join('\n'), /injected second publication failure/);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testBootclasspathChangeInvalidatesCache() {
  const root = createRoot();
  const a = fixture(root, 'A');
  fs.writeFileSync(a.destination, 'verified A\n');
  fs.utimesSync(a.destination, new Date(3000), new Date(3000));
  const stamp = writeVersionStamp(root);
  const changedBootclasspath = path.join(path.sep, 'changed bootstrap', 'rt.jar');
  let fixtureCalls = 0;
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      fixtureCalls += 1;
      assertFixtureCall({ command, args, options }, changedBootclasspath);
      setImmediate(() => callback(null, 'refreshed A\n', ''));
    },
  };
  const harness = createHarness(childProcessStub, fs, {
    configValues: { 'build.bootclasspath': changedBootclasspath },
  });
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile]), true);
      assert.equal(fixtureCalls, 1);
      assert.equal(fs.readFileSync(a.destination, 'utf8'), 'refreshed A\n');
      assert.equal(fs.readFileSync(stamp, 'utf8'), versionFingerprint(changedBootclasspath));
      assertNoTemporaryRunouts(root);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function testEmptyCpuInventoryStillRuns() {
  const root = createRoot();
  const a = fixture(root, 'A');
  let fixtureCalls = 0;
  const childProcessStub = {
    spawnSync() {
      return { status: 0, signal: null, stdout: versionStdout, stderr: versionStderr };
    },
    execFile(command, args, options, callback) {
      fixtureCalls += 1;
      assertFixtureCall({ command, args, options });
      setImmediate(() => callback(null, 'complete A\n', ''));
    },
  };
  const harness = createHarness(childProcessStub, fs, { cpuCount: 0 });
  try {
    await inRoot(root, async () => {
      assert.equal(await invokeRunJava(harness.runJavaTask, [a.gruntFile]), true);
      assert.equal(fixtureCalls, 1);
      assert.equal(fs.readFileSync(a.destination, 'utf8'), 'complete A\n');
      assertNoTemporaryRunouts(root);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return 1;
}

async function main() {
  let completedCases = 0;
  completedCases += await testSuccessAndCache();
  completedCases += await testNonzeroDrainsBeforeFailure();
  completedCases += await testTimeoutDiscardsPartialOutput();
  completedCases += await testProcessFailure({
    message: 'unable to spawn Java',
    code: 'ENOENT',
    signal: null,
    killed: false,
  });
  completedCases += await testProcessFailure({
    message: 'Java terminated by signal',
    code: null,
    signal: 'SIGTERM',
    killed: true,
  });
  completedCases += await testProcessFailure({
    message: 'Java output exceeded maxBuffer',
    code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
    signal: null,
    killed: true,
  });
  completedCases += await testInvalidOptionsFailBeforeSpawn();
  completedCases += await testCleanupFailureCannotPublishStamp();
  completedCases += await testSynchronousLaunchThrowDrainsBeforeFailure();
  completedCases += await testPublicationFailureSuppressesStamp();
  completedCases += await testBootclasspathChangeInvalidatesCache();
  completedCases += await testEmptyCpuInventoryStillRuns();
  assert.equal(completedCases, 13);
  console.log(`run-java-fail-closed:${completedCases}:ok`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
