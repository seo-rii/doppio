'use strict';

const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const releaseCliRoot = process.env.DOPPIO_RELEASE_CLI_ROOT === undefined ?
  path.join(repoRoot, 'build', 'release-cli') :
  path.resolve(process.env.DOPPIO_RELEASE_CLI_ROOT);
const javaCliPath = path.join(releaseCliRoot, 'src', 'java_cli.js');
const RealJVM = require(path.join(releaseCliRoot, 'src', 'jvm')).default;
const captures = [];

class FakeJVM {
  static getDefaultOptions(doppioHome) {
    return RealJVM.getDefaultOptions(doppioHome);
  }

  constructor(options) {
    const effectiveOptions = Object.assign(
      {},
      FakeJVM.getDefaultOptions(options.doppioHomePath),
      options
    );
    captures.push({
      passedBootstrapClasspath: options.bootstrapClasspath,
      effectiveBootstrapClasspath: effectiveOptions.bootstrapClasspath.map((entry) => path.resolve(entry))
    });
  }

  setPrintJITCompilation() {
  }

  vtraceMethod() {
  }

  dumpCompiledCode() {
  }
}

const javaCliModule = new Module(javaCliPath, module);
javaCliModule.filename = javaCliPath;
javaCliModule.paths = Module._nodeModulePaths(path.dirname(javaCliPath));
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (parent === javaCliModule && request === './jvm') {
    return {__esModule: true, default: FakeJVM};
  }
  return originalLoad.call(this, request, parent, isMain);
};
try {
  javaCliModule._compile(fs.readFileSync(javaCliPath, 'utf8'), javaCliPath);
} finally {
  Module._load = originalLoad;
}
const javaCli = javaCliModule.exports.default;
const doppioHome = path.join(repoRoot, 'default-runner-home');
const defaultBootstrapClasspath = RealJVM.getDefaultOptions(doppioHome).bootstrapClasspath;

function invoke(extraArgs) {
  const options = {
    doppioHomePath: doppioHome,
    nativeClasspath: [],
    launcherName: 'doppio',
    intMode: false,
    dumpJITStats: false,
    tmpDir: path.join(repoRoot, 'tmp')
  };
  const captureCount = captures.length;
  assert.doesNotThrow(() => javaCli(
    [...extraArgs, 'Example'],
    options,
    () => assert.fail('The fake JVM must not finish during argument parsing.')
  ));
  assert.equal(captures.length, captureCount + 1);
  assert.equal(Object.prototype.hasOwnProperty.call(options, 'bootstrapClasspath'), false);
  return captures[captureCount];
}

const prependA = path.join(repoRoot, 'prepend-a.jar');
const prependB = path.join(repoRoot, 'prepend-b.jar');
const appendA = path.join(repoRoot, 'append-a.jar');
const appendB = path.join(repoRoot, 'append-b.jar');
const replacementA = path.join(repoRoot, 'replacement-a.jar');
const replacementB = path.join(repoRoot, 'replacement-b.jar');
let scenarioCount = 0;

const prepend = invoke([`-Xbootclasspath/p:${prependA}:${prependB}`]);
assert.deepEqual(
  prepend.effectiveBootstrapClasspath,
  [prependA, prependB, ...defaultBootstrapClasspath]
);
assert.equal(prepend.effectiveBootstrapClasspath.includes(undefined), false);
scenarioCount += 1;

const firstDefault = invoke([]);
const secondDefault = invoke([]);
assert.deepEqual(firstDefault.effectiveBootstrapClasspath, defaultBootstrapClasspath);
assert.deepEqual(secondDefault.effectiveBootstrapClasspath, defaultBootstrapClasspath);
assert.notStrictEqual(firstDefault.passedBootstrapClasspath, secondDefault.passedBootstrapClasspath);
scenarioCount += 1;

const append = invoke([`-Xbootclasspath/a:${appendA}:${appendB}`]);
assert.deepEqual(
  append.effectiveBootstrapClasspath,
  [...defaultBootstrapClasspath, appendA, appendB]
);
scenarioCount += 1;

const replacement = invoke([`-Xbootclasspath:${replacementA}:${replacementB}`]);
assert.deepEqual(replacement.effectiveBootstrapClasspath, [replacementA, replacementB]);
scenarioCount += 1;

const composed = invoke([
  `-Xbootclasspath:${replacementA}`,
  `-Xbootclasspath/a:${appendA}`,
  `-Xbootclasspath/p:${prependA}`
]);
assert.deepEqual(composed.effectiveBootstrapClasspath, [prependA, replacementA, appendA]);
scenarioCount += 1;

console.log(`bootclasspath-defaults:${scenarioCount}:ok`);
