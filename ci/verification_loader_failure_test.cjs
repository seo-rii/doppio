'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const cache = {};
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache[name]) return cache[name].exports;
  const Module = require('node:module'), ts = require('typescript');
  const loaded = cache[name] = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => /^\.\/(?:ClassLoader|ClassVerification|BytecodeVerifier|BytecodeTypeVerifier|VerificationRelations|threading)$/.test(id)
    ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {ClassLoader, BootstrapClassLoader, CustomClassLoader} = load('ClassLoader');
const {ClassVerification} = load('ClassVerification');
const {JVMThread} = load('threading');
const {Code} = require(path.join(runtime, 'src/attributes'));
const util = require(path.join(runtime, 'src/util'));
const {ThreadStatus, StackFrameType} = require(path.join(runtime, 'src/enums'));

function throwable(name = 'Ljava/lang/NoClassDefFoundError;') {
  return {getClass: () => ({getInternalName: () => name})};
}
function thread() {
  const owner = Object.create(JVMThread.prototype);
  owner.status = ThreadStatus.ASYNC_WAITING;
  owner.errors = [];
  owner.setStatus = function(status) { this.status = status; };
  owner.throwNewException = function(name) { this.throwException(throwable(name)); };
  owner.handleUncaughtException = () => assert.fail('Loader error escaped its caller');
  // A Java caller catches the error after all nested metadata/load boundaries.
  owner.stack = [{type: StackFrameType.NATIVE, scheduleException(current, error) {
    current.errors.push(error);
    return true;
  }}];
  return owner;
}
function drain(...owners) {
  for (let count = 0; count < 100; count++) {
    let progressed = false;
    for (const owner of owners) {
      const top = owner.stack.at(-1);
      if (owner.status === ThreadStatus.RUNNABLE && top && top.type === StackFrameType.INTERNAL) {
        progressed = true;
        top.run(owner);
      }
    }
    if (!progressed) return;
  }
  assert.fail('Loader exception boundaries did not finish');
}
function world() {
  const loader = new ClassLoader(null), requests = [];
  loader.bootstrap = loader;
  loader._loadClass = (owner, name, callback, explicit) => requests.push({owner, name, callback, explicit});
  function define(name, parent = 'Ljava/lang/Object;', methods = []) {
    const cls = {majorVersion: 65, constantPool: {}, accessFlags: new util.Flags(1),
      getInternalName: () => name, getLoader: () => loader,
      getSuperClassReference: () => parent === null ? null : {name: parent},
      getInterfaceClassReferences: () => [], getFields: () => [], getMethods: () => methods};
    loader.addClass(name, cls);
    return cls;
  }
  define('Ljava/lang/Object;', null);
  define('Lmeta/Parent;');
  function gate(name) {
    const method = {name: 'accept', rawDescriptor: '(Lmeta/Child;)Lmeta/Parent;', declaredAccessFlags: 9,
      accessFlags: new util.Flags(9), declaredCode: new Code(1, 1, [], [], Buffer.from([0x2a, 0xb0]))};
    return new ClassVerification(define(name, undefined, [method]));
  }
  function fail(index, failure) {
    requests[index].owner.throwException(failure);
    requests[index].callback(null);
  }
  return {loader, requests, define, gate, fail};
}

test('different verification gates receive the same shared metadata load failure', () => {
  const w = world(), first = thread(), second = thread(), results = [];
  const firstGate = w.gate('Lmeta/First;'), secondGate = w.gate('Lmeta/Second;');
  firstGate.verify(first, ok => results.push(['first', ok]));
  secondGate.verify(second, ok => results.push(['second', ok]));
  assert.equal(w.requests.length, 1);
  const failure = throwable();
  w.fail(0, failure);
  drain(first, second);
  // Separate threads may run their exception continuations in either order.
  assert.deepEqual(results.sort(), [['first', false], ['second', false]]);
  assert.deepEqual(first.errors, [failure]);
  assert.deepEqual(second.errors, [failure]);
  assert.equal(first.stack.length, 1);
  assert.equal(second.stack.length, 1);
  assert.equal(firstGate.isVerified(), false);
  assert.equal(secondGate.isVerified(), false);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('a successful shared metadata load completes every gate without leaving boundaries', () => {
  const w = world(), first = thread(), second = thread(), results = [];
  const firstGate = w.gate('Lmeta/First;'), secondGate = w.gate('Lmeta/Second;');
  firstGate.verify(first, ok => results.push(['first', ok]));
  secondGate.verify(second, ok => results.push(['second', ok]));
  const child = w.define('Lmeta/Child;', 'Lmeta/Parent;');
  w.requests[0].callback(child);
  assert.deepEqual(results.sort(), [['first', true], ['second', true]]);
  assert.equal(firstGate.isVerified(), true);
  assert.equal(secondGate.isVerified(), true);
  assert.deepEqual(first.errors.concat(second.errors), []);
  assert.equal(first.stack.length, 1);
  assert.equal(second.stack.length, 1);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('successful array component loading releases nested boundaries and returns the array class', () => {
  const w = world(), owner = thread(), results = [];
  w.loader.loadClass(owner, '[[Lmeta/Child;', cls => results.push(cls), false);
  w.requests[0].callback(w.define('Lmeta/Child;', 'Lmeta/Parent;'));
  assert.equal(results.length, 1);
  assert.equal(results[0].getInternalName(), '[[Lmeta/Child;');
  assert.equal(results[0], w.loader.getLoadedClass('[[Lmeta/Child;'));
  assert.equal(owner.stack.length, 1);
  assert.deepEqual(owner.errors, []);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('a gate joining a normal class load also receives its original format error', () => {
  const w = world(), normal = thread(), verifying = thread(), results = [];
  w.loader.loadClass(normal, 'Lmeta/Child;', cls => results.push(['normal', cls]));
  w.gate('Lmeta/Current;').verify(verifying, ok => results.push(['gate', ok]));
  const failure = throwable('Ljava/lang/ClassFormatError;');
  w.fail(0, failure);
  drain(normal, verifying);
  assert.deepEqual(results, [['normal', null], ['gate', false]]);
  assert.deepEqual(normal.errors, [failure]);
  assert.deepEqual(verifying.errors, [failure]);
});

test('failed array components release every nested array load lock and every waiter', () => {
  const w = world(), first = thread(), second = thread(), results = [];
  w.loader.loadClass(first, '[[Lmeta/Child;', cls => results.push(['first', cls]), false);
  w.loader.loadClass(second, '[[Lmeta/Child;', cls => results.push(['second', cls]), false);
  assert.equal(w.requests.length, 1);
  assert.equal(w.requests[0].name, 'Lmeta/Child;');
  const failure = throwable();
  w.fail(0, failure);
  drain(first, second);
  assert.deepEqual(results, [['first', null], ['second', null]]);
  assert.deepEqual(first.errors, [failure]);
  assert.deepEqual(second.errors, [failure]);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
  w.loader.loadClass(first, '[[Lmeta/Child;', () => {}, false);
  assert.equal(w.requests.length, 2, 'A failed array load retained a stale lock');
  w.fail(1, failure);
  drain(first);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('duplicate callbacks on one thread do not throw the same failure twice', () => {
  const w = world(), owner = thread(), results = [];
  w.loader.loadClass(owner, 'Lmeta/Child;', cls => results.push(cls), false);
  w.loader.loadClass(owner, 'Lmeta/Child;', cls => results.push(cls), false);
  const failure = throwable();
  w.fail(0, failure);
  drain(owner);
  assert.deepEqual(results, [null, null]);
  assert.deepEqual(owner.errors, [failure]);
});

test('a failure callback can immediately retry without joining the released queue', () => {
  const w = world(), owner = thread(), results = [];
  w.loader.loadClass(owner, 'Lmeta/Child;', cls => {
    results.push(cls);
    w.loader.loadClass(owner, 'Lmeta/Child;', retry => results.push(retry), false);
  }, false);
  const failure = throwable();
  w.fail(0, failure);
  drain(owner);
  assert.equal(w.requests.length, 2);
  w.fail(1, failure);
  drain(owner);
  assert.deepEqual(results, [null, null]);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('coalesced explicit and implicit missing-class loads retain each caller error mode', () => {
  for (const explicitOwner of [true, false]) {
    const w = world(), first = thread(), second = thread(), results = [];
    w.loader.loadClass(first, 'Lmeta/Child;', cls => results.push(cls), explicitOwner);
    w.loader.loadClass(second, 'Lmeta/Child;', cls => results.push(cls), !explicitOwner);
    const ownerName = explicitOwner ? 'Ljava/lang/ClassNotFoundException;' : 'Ljava/lang/NoClassDefFoundError;';
    const waiterName = explicitOwner ? 'Ljava/lang/NoClassDefFoundError;' : 'Ljava/lang/ClassNotFoundException;';
    const failure = throwable(ownerName);
    w.fail(0, failure);
    drain(first, second);
    assert.deepEqual(results, [null, null]);
    assert.equal(first.errors[0], failure);
    assert.equal(second.errors[0].getClass().getInternalName(), waiterName);
  }
});

test('pre-thread bootstrap missing metadata fails by callback instead of a host exception', () => {
  const w = world(), gate = w.gate('Lmeta/Current;');
  w.loader.classpath = [];
  w.loader._loadClass = BootstrapClassLoader.prototype._loadClass;
  let result;
  assert.doesNotThrow(() => gate.verify(null, ok => { result = ok; }));
  assert.equal(result, false);
  assert.equal(gate.isVerified(), false);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('pre-thread bootstrap missing array components also complete and unlock', () => {
  const w = world();
  w.loader.classpath = [];
  w.loader._loadClass = BootstrapClassLoader.prototype._loadClass;
  let result;
  assert.doesNotThrow(() => w.loader.loadClass(null, '[[Lmeta/Child;', cls => { result = cls; }, false));
  assert.equal(result, null);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('Java class loaders preserve verification LinkageErrors instead of converting them to absence', () => {
  const w = world(), owner = thread(), linkage = w.define('Ljava/lang/LinkageError;');
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/VerifyError;', isCastable: cls => cls === linkage})};
  const loaderObj = {'loadClass(Ljava/lang/String;)Ljava/lang/Class;': (current, args, callback) => callback(failure)};
  const loader = new CustomClassLoader(w.loader, loaderObj), originalInitString = util.initString;
  const results = [];
  try {
    // The test exercises load/error routing, not Java String allocation.
    util.initString = (bootstrap, value) => value;
    loader.loadClass(owner, 'Lmeta/Child;', cls => results.push(cls), false);
    drain(owner);
  } finally {
    util.initString = originalInitString;
  }
  assert.deepEqual(results, [null]);
  assert.deepEqual(owner.errors, [failure]);
});

test('an explicit Java loader can throw its own NoClassDefFoundError without owner-side translation', () => {
  const w = world(), owner = thread(), linkage = w.define('Ljava/lang/LinkageError;');
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/NoClassDefFoundError;', isCastable: cls => cls === linkage})};
  const loaderObj = {'loadClass(Ljava/lang/String;)Ljava/lang/Class;': (current, args, callback) => callback(failure)};
  const loader = new CustomClassLoader(w.loader, loaderObj), originalInitString = util.initString;
  try {
    util.initString = (bootstrap, value) => value;
    loader.loadClass(owner, 'Lmeta/Child;', cls => assert.equal(cls, null), true);
    drain(owner);
  } finally {
    util.initString = originalInitString;
  }
  assert.deepEqual(owner.errors, [failure]);
});
