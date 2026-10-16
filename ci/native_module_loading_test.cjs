'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');

// Exercise the complete JVM source with its real registration/evaluation and
// option validation methods. New source dependencies need no shared rebuild.
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['jvm', 'MainLauncher', 'assertions', 'responsiveness']);
const cache = new Map();
let builtinImportError = null;
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(runtime, 'src', name + '.js');
  const loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = request => {
    if (name === 'jvm' && request === './natives/doppio' && builtinImportError) throw builtinImportError;
    // Constructor budget tests do not need a 256MB off-heap buffer or VM boot.
    if (name === 'jvm' && request === './heap') return {default: class UnusedHeap {}};
    if (request.startsWith('./') && sourceModules.has(request.slice(2))) return load(request.slice(2));
    return original(request);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS, esModuleInterop: false}
  }).outputText, filename);
  return loaded.exports;
}
const JVM = load('jvm').default;

const className = 'test/NativeModule';
const signature = 'winner()I';
const definition = value => ({[className]: {[signature]: () => value}});
const source = value => `registerNatives({"${className}": {"${signature}": function () { return ${value}; }}});`;

function world(nativeClasspath = [], factories = []) {
  JVM._haveAddedBuiltinNativeModules = true;
  JVM._nativeMethodModules = factories;
  const vm = Object.create(JVM.prototype);
  vm.nativeClasspath = nativeClasspath;
  vm.natives = {};
  vm.globalRequire = null;
  return vm;
}

async function initialize(vm) {
  const errors = [];
  await new Promise(resolve => {
    vm.initializeNatives(error => {
      errors.push(error);
      resolve();
    });
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(errors.length, 1, 'initialization must complete exactly once');
  return errors[0];
}

function mockFiles(t, directories, modules, delays = {}) {
  const reads = [], listings = [];
  t.mock.method(fs, 'readdir', (dir, callback) => {
    listings.push(dir);
    const files = directories[dir];
    assert.ok(files, `unexpected native directory ${dir}`);
    setImmediate(() => callback(null, files.slice()));
  });
  t.mock.method(fs, 'readFile', (filename, callback) => {
    reads.push(filename);
    assert.equal(typeof modules[filename], 'string', `unexpected native file ${filename}`);
    setTimeout(() => callback(null, Buffer.from(modules[filename])), delays[filename] || 0);
  });
  return {reads, listings};
}

test('builtin factories register in declaration order before explicit native paths', async () => {
  const vm = world([], [() => definition(1), () => definition(2)]);
  assert.equal(await initialize(vm), undefined);
  assert.equal(vm.getNative('Ltest/NativeModule;', signature)(), 2);
  assert.equal(vm.getNative('Ltest/Missing;', signature), null);
});

test('native files register lexically and later nativeClasspath paths override earlier paths', async t => {
  const directories = {
    '/first': ['z.js', 'ignored.JS', 'ignored.txt', 'a.js'],
    '/second': ['z.js', 'a.js']
  };
  const modules = {
    '/first/a.js': source(11), '/first/z.js': source(12),
    '/second/a.js': source(21), '/second/z.js': source(22)
  };
  const {reads, listings} = mockFiles(t, directories, modules);
  const vm = world(['/first', '/second'], [() => definition(0)]);
  const registrations = [];
  const register = vm.registerNatives;
  vm.registerNatives = function(defs) {
    registrations.push(defs[className][signature]());
    return register.call(this, defs);
  };
  assert.equal(await initialize(vm), undefined);
  assert.deepEqual(listings, ['/first', '/second']);
  assert.equal(reads.length, 4, 'non-JavaScript files must not load');
  assert.deepEqual(registrations, [0, 11, 12, 21, 22]);
  assert.equal(vm.getNative('Ltest/NativeModule;', signature)(), 22);
});

for (const [label, delays] of [
  ['earlier file slower', {'/native/a.js': 20, '/native/z.js': 1}],
  ['later file slower', {'/native/a.js': 1, '/native/z.js': 20}]
]) {
  test(`native override winner is independent of read latency: ${label}`, async t => {
    mockFiles(t, {'/native': ['a.js', 'z.js']}, {
      '/native/a.js': source(1), '/native/z.js': source(2)
    }, delays);
    const vm = world(['/native']);
    assert.equal(await initialize(vm), undefined);
    assert.equal(vm.getNative('Ltest/NativeModule;', signature)(), 2);
  });
}

test('directory read errors preserve the original error and abort initialization', async t => {
  const error = Object.assign(new Error('native directory denied'), {code: 'EACCES'});
  const listings = [];
  t.mock.method(fs, 'readdir', (dir, callback) => {
    listings.push(dir);
    setImmediate(() => callback(error));
  });
  t.mock.method(fs, 'readFile', () => assert.fail('an unreadable directory must not load modules'));
  const vm = world(['/denied', '/later']);
  assert.equal(await initialize(vm), error);
  assert.deepEqual(listings, ['/denied']);
});

test('module file read errors propagate once and prevent later registration', async t => {
  const error = Object.assign(new Error('native file disappeared'), {code: 'ENOENT'});
  const reads = [];
  t.mock.method(fs, 'readdir', (dir, callback) => {
    setImmediate(() => callback(null, ['z.js', 'a.js', 'missing.js']));
  });
  t.mock.method(fs, 'readFile', (filename, callback) => {
    reads.push(filename);
    setImmediate(() => filename.endsWith('/missing.js') ? callback(error) : callback(null, Buffer.from(source(1))));
  });
  const vm = world(['/native', '/later']);
  assert.equal(await initialize(vm), error);
  assert.deepEqual(reads, ['/native/a.js', '/native/missing.js']);
  assert.equal(vm.getNative('Ltest/NativeModule;', signature)(), 1);
});

for (const [label, badSource, message] of [
  ['syntax error', 'registerNatives(', /SyntaxError/],
  ['module exception', 'throw new Error("native module failed");', /native module failed/],
  ['AMD factory exception', 'define([], function () { throw new Error("AMD native failed"); });', /AMD native failed/],
  ['registration exception', 'registerNatives({"test/Bad": {}, hasOwnProperty: 1});', /hasOwnProperty/]
]) {
  test(`${label} is reported through the callback exactly once with its module path`, async t => {
    const {reads} = mockFiles(t, {'/native': ['later.js', 'bad.js']}, {
      '/native/bad.js': badSource, '/native/later.js': source(2)
    });
    const vm = world(['/native']);
    const error = await initialize(vm);
    assert.ok(error instanceof Error);
    assert.match(error.message, /Unable to load native module \/native\/bad\.js/);
    assert.match(error.message, message);
    assert.deepEqual(reads, ['/native/bad.js']);
    assert.equal(vm.getNative('Ltest/NativeModule;', signature), null);
  });
}

test('builtin factory errors propagate unchanged and stop later factories and file reads', async t => {
  const error = new Error('builtin factory failed');
  let reachedLater = false;
  t.mock.method(fs, 'readdir', () => assert.fail('builtin failure must stop file loading'));
  const vm = world(['/native'], [
    () => { throw error; },
    () => { reachedLater = true; return definition(2); }
  ]);
  assert.equal(await initialize(vm), error);
  assert.equal(reachedLater, false);
});

test('builtin registration errors are callback failures instead of host exceptions', async () => {
  const vm = world([], [() => ({'test/Bad': {}, hasOwnProperty: 1})]);
  const error = await initialize(vm);
  assert.ok(error instanceof TypeError);
  assert.match(error.message, /hasOwnProperty/);
});

test('lazy builtin module import errors also reach the initialization callback once', async t => {
  const error = new Error('builtin import failed');
  const vm = world();
  JVM._haveAddedBuiltinNativeModules = false;
  builtinImportError = error;
  t.after(() => { builtinImportError = null; });
  assert.equal(await initialize(vm), error);
});

test('native loading works with real files in a path containing spaces and Korean text', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio native 한글 '));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.writeFileSync(path.join(dir, 'z.js'), `
    var text = require('buffer').Buffer.from('7').toString();
    var fs = require('fs');
    var path = require('path');
    if (typeof fs.readFile !== 'function' || typeof path.join !== 'function') throw new Error('missing host API');
    registerNatives({"${className}": {"${signature}": function () { return Number(text); }}});
  `);
  fs.writeFileSync(path.join(dir, 'a.js'), source(1));
  fs.writeFileSync(path.join(dir, 'ignored.txt'), 'throw new Error("must not execute");');
  const vm = world([dir]);
  assert.equal(await initialize(vm), undefined);
  assert.equal(vm.getNative('Ltest/NativeModule;', signature)(), 7);
});

function constructorOptions(responsiveness) {
  return {
    doppioHomePath: path.resolve(__dirname, '..'),
    bootstrapClasspath: ['/unused-bootstrap.jar'],
    responsiveness
  };
}

test('JVM construction rejects invalid numeric responsiveness before native initialization', () => {
  for (const responsiveness of [0, -1, 1.5, NaN, Infinity, -Infinity, 2147483648, Number.MAX_SAFE_INTEGER, '1000', null]) {
    let initialized = false;
    world([], [() => { initialized = true; return definition(1); }]);
    assert.throws(() => new JVM(constructorOptions(responsiveness), () => {
      assert.fail('invalid constructor options must fail synchronously');
    }), RangeError);
    assert.equal(initialized, false);
  }
});

async function constructWithoutBoot(responsiveness, options = {}) {
  const stop = new Error('stop before class loading');
  world([], [() => { throw stop; }]);
  const completions = [];
  let vm;
  await new Promise(resolve => {
    vm = new JVM({...constructorOptions(responsiveness), ...options}, error => {
      completions.push(error);
      resolve();
    });
  });
  assert.deepEqual(completions, [stop]);
  return vm;
}

test('legacy assertion getters reflect ordered CLI directives and the global enable default', async () => {
  const vm = await constructWithoutBoot(1000, {assertionDirectives: [
    {scope: 'default', enabled: false},
    {scope: 'default', enabled: true},
    {scope: 'class', target: 'pkg.C', enabled: false}
  ]});
  assert.equal(vm.getEnabledAssertions(), true);
  assert.deepEqual(vm.getDisabledAssertions(), ['pkg.C']);
  assert.equal(vm.isAssertionEnabled('pkg.C', false), false);
  assert.equal(vm.isAssertionEnabled('pkg.Other', false), true);
});

test('legacy assertion getter lists keep the last directive for each class or package in order', async () => {
  const vm = await constructWithoutBoot(1000, {assertionDirectives: [
    {scope: 'class', target: 'pkg.B', enabled: true},
    {scope: 'package', target: 'pkg', enabled: true},
    {scope: 'class', target: 'pkg.A', enabled: false},
    {scope: 'class', target: 'pkg.B', enabled: false},
    {scope: 'class', target: 'pkg.A', enabled: true},
    {scope: 'class', target: 'pkg.B', enabled: true},
    {scope: 'package', target: 'pkg', enabled: false},
    {scope: 'package', target: '', enabled: true}
  ]});
  assert.deepEqual(vm.getEnabledAssertions(), ['pkg.A', 'pkg.B', '...']);
  assert.deepEqual(vm.getDisabledAssertions(), ['pkg...']);
  assert.equal(vm.isAssertionEnabled('pkg.A', false), true, 'class exceptions still override package defaults');
  assert.equal(vm.isAssertionEnabled('pkg.Other', false), false);
  assert.equal(vm.isAssertionEnabled('Main', false), true);
});

test('legacy assertion options and newer directives share the getters without losing package notation', async () => {
  const vm = await constructWithoutBoot(1000, {
    enableAssertions: ['old.Keep', 'pkg...', 'old.Toggle'],
    disableAssertions: ['old.Disabled', 'pkg.Gone'],
    assertionDirectives: [
      {scope: 'class', target: 'old.Toggle', enabled: false},
      {scope: 'class', target: 'pkg.Gone', enabled: true},
      {scope: 'package', target: 'pkg', enabled: false},
      {scope: 'package', target: '', enabled: true},
      {scope: 'system', enabled: true}
    ]
  });
  assert.deepEqual(vm.getEnabledAssertions(), ['old.Keep', 'pkg.Gone', '...']);
  assert.deepEqual(vm.getDisabledAssertions(), ['old.Disabled', 'old.Toggle', 'pkg...']);
  assert.equal(vm.isAssertionEnabled('old.Keep', false), true);
  assert.equal(vm.isAssertionEnabled('old.Toggle', false), false);
  assert.equal(vm.isAssertionEnabled('pkg.Gone', false), true);
  assert.equal(vm.isAssertionEnabled('pkg.Other', false), false);
  assert.equal(vm.areSystemAssertionsEnabled(), true);
});

test('legacy assertion getters follow a later global disable and preserve explicit legacy targets', async () => {
  const vm = await constructWithoutBoot(1000, {
    enableAssertions: true,
    disableAssertions: ['pkg.C'],
    assertionDirectives: [
      {scope: 'default', enabled: false},
      {scope: 'class', target: 'pkg.C', enabled: true}
    ]
  });
  assert.deepEqual(vm.getEnabledAssertions(), ['pkg.C']);
  assert.deepEqual(vm.getDisabledAssertions(), []);
  assert.equal(vm.isAssertionEnabled('pkg.C', false), true);
  assert.equal(vm.isAssertionEnabled('pkg.Other', false), false);
  const defaults = await constructWithoutBoot(1000);
  assert.equal(defaults.getEnabledAssertions(), false);
  assert.deepEqual(defaults.getDisabledAssertions(), []);
});

test('JVM construction and getResponsiveness accept the inclusive numeric budget boundaries', async () => {
  for (const budget of [1, 1000, 2147483647]) {
    const vm = await constructWithoutBoot(budget);
    assert.equal(vm.getResponsiveness(), budget);
  }
});

test('getResponsiveness validates each lazy function result and preserves provider exceptions', async () => {
  let calls = 0, budget = 1;
  const vm = await constructWithoutBoot(() => { calls++; return budget; });
  assert.equal(calls, 0, 'construction must keep a budget provider lazy');
  for (const value of [1, 1000, 2147483647]) {
    budget = value;
    assert.equal(vm.getResponsiveness(), value);
  }
  for (const value of [0, -1, 0.5, NaN, Infinity, 2147483648, '1000', null]) {
    budget = value;
    assert.throws(() => vm.getResponsiveness(), RangeError);
  }
  assert.equal(calls, 11, 'every request must evaluate its current budget exactly once');
  const error = new Error('budget provider failed');
  vm.responsiveness = () => { throw error; };
  assert.throws(() => vm.getResponsiveness(), actual => actual === error);
});
