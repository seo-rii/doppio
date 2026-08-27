'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const typescript = require('typescript');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'console', 'test_runner.ts');
const builtRunnerPath = path.join(repoRoot, 'build', 'release-cli', 'console', 'test_runner.js');
const probeEnvironmentName = 'DOPPIO_TEST_RUNNER_ARGS_PROBE';

if (process.env[probeEnvironmentName] !== undefined) {
  const args = JSON.parse(process.env[probeEnvironmentName]);
  const expectHelp = process.env.DOPPIO_TEST_RUNNER_EXPECT_HELP === '1';
  const virtualRunnerPath = fs.existsSync(builtRunnerPath) ?
    builtRunnerPath : path.join(repoRoot, 'console', 'test_runner.js');
  let invocation = null;
  const testing = {
    runTests(options, quiet, keepGoing, hideDiffs) {
      if (expectHelp) {
        throw new Error('Help must exit before running tests.');
      }
      invocation = {
        testClasses: options.testClasses,
        quiet,
        keepGoing,
        hideDiffs
      };
    }
  };
  const compiled = fs.existsSync(builtRunnerPath) ?
    fs.readFileSync(builtRunnerPath, 'utf8') :
    typescript.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
      compilerOptions: {
        module: typescript.ModuleKind.CommonJS,
        target: typescript.ScriptTarget.ES2015
      },
      fileName: sourcePath
    }).outputText;
  const runnerModule = new Module(virtualRunnerPath, module);
  runnerModule.filename = virtualRunnerPath;
  runnerModule.paths = Module._nodeModulePaths(path.dirname(virtualRunnerPath));
  const originalLoad = Module._load;
  const originalExit = process.exit;
  const helpExit = {};
  let requestedExitCode = null;

  process.argv = [process.execPath, virtualRunnerPath, ...args];
  if (expectHelp) {
    process.exit = function(code) {
      requestedExitCode = code;
      throw helpExit;
    };
  }
  Module._load = function(request, parent, isMain) {
    if (parent === runnerModule && request === '../src/testing') {
      return testing;
    }
    if (parent === runnerModule && request === '../vendor/java_home/jdk.json') {
      return {classpath: [], url: ''};
    }
    if (parent === runnerModule && request === 'source-map-support') {
      return {install() {}};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    runnerModule._compile(compiled, virtualRunnerPath);
  } catch (error) {
    if (error !== helpExit) {
      throw error;
    }
  } finally {
    Module._load = originalLoad;
    process.exit = originalExit;
  }
  if (expectHelp) {
    assert.equal(requestedExitCode, 0);
    return;
  }

  process.stdout.write(JSON.stringify({
    invocation,
    polluted: Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'),
    pollutedValue: Object.prototype.polluted
  }));
  return;
}

function runProbe(args, expectHelp = false) {
  const result = childProcess.spawnSync(process.execPath, [__filename], {
    encoding: 'utf8',
    env: {
      ...process.env,
      [probeEnvironmentName]: JSON.stringify(args),
      DOPPIO_TEST_RUNNER_EXPECT_HELP: expectHelp ? '1' : '0'
    }
  });
  if (result.error) {
    throw result.error;
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function parsedProbe(args) {
  return JSON.parse(runProbe(args).stdout);
}

let scenarioCount = 0;

assert.deepEqual(
  parsedProbe(['classes/test/A', 'classes/test/B', '--quiet', '--continue', '--no-diff']).invocation,
  {
    testClasses: ['classes/test/A', 'classes/test/B'],
    quiet: true,
    keepGoing: true,
    hideDiffs: true
  }
);
scenarioCount += 1;

assert.deepEqual(parsedProbe(['classes/test/A', '-qc']).invocation, {
  testClasses: ['classes/test/A'],
  quiet: true,
  keepGoing: true,
  hideDiffs: false
});
scenarioCount += 1;

assert.deepEqual(parsedProbe(['classes/test/A', '--makefile', '--continue']).invocation, {
  testClasses: ['classes/test/A'],
  quiet: true,
  keepGoing: true,
  hideDiffs: false
});
scenarioCount += 1;

assert.deepEqual(parsedProbe(['--', '--help', 'classes/test/A']).invocation, {
  testClasses: ['--help', 'classes/test/A'],
  quiet: false,
  keepGoing: false,
  hideDiffs: false
});
scenarioCount += 1;

for (const helpFlag of ['--help', '-h']) {
  const result = runProbe([helpFlag], true);
  const help = `${result.stdout}\n${result.stderr}`;
  assert.match(help, /Usage: .* path\/to\/test \[flags\]/);
  assert.match(help, /-q, --quiet\s+Suppress in-progress test output/);
  assert.match(help, /--diff\s+Show failed test diff output/);
  assert.match(help, /-c, --continue\s+Keep going after test failure/);
  assert.match(help, /-h, --help\s+Show this usage/);
  scenarioCount += 1;
}

const prototypeProbe = parsedProbe([
  'classes/test/A',
  '--__proto__.polluted=yes'
]);
assert.deepEqual(prototypeProbe.invocation, {
  testClasses: ['classes/test/A'],
  quiet: false,
  keepGoing: false,
  hideDiffs: false
});
assert.equal(prototypeProbe.polluted, false);
assert.equal(prototypeProbe.pollutedValue, undefined);
scenarioCount += 1;

const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
assert.equal(manifest.dependencies.optimist, undefined, 'optimist must not be a production dependency');

console.log(`test-runner-args:${scenarioCount}:ok`);
