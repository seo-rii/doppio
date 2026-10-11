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
  loaded.require = id => /^\.\/(?:ClassVerification|BytecodeVerifier|BytecodeTypeVerifier|VerificationRelations)$/.test(id)
    ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {ClassVerification} = load('ClassVerification');
const {Code} = require(path.join(runtime, 'src/attributes'));
const {Flags} = require(path.join(runtime, 'src/util'));

function world() {
  const loaded = new Map(), requests = [];
  const loader = {
    getLoadedClass: name => loaded.get(name) || null,
    loadClass: (thread, name, callback, explicit) => { requests.push({thread, name, callback, explicit}); }
  };
  loader.bootstrap = loader;
  function define(name, parent = 'Ljava/lang/Object;', methods = []) {
    const cls = {majorVersion: 65, constantPool: {}, accessFlags: new Flags(1),
      getInternalName: () => name, getLoader: () => loader,
      getSuperClassReference: () => parent === null ? null : {name: parent},
      getInterfaceClassReferences: () => [], getFields: () => [], getMethods: () => methods,
      initialize: () => assert.fail('Verification initialized a metadata dependency'),
      resolve: () => assert.fail('Verification recursively linked a metadata dependency')};
    loaded.set(name, cls);
    return cls;
  }
  define('Ljava/lang/Object;', null);
  define('Lmeta/Parent;');
  const code = new Code(1, 1, [], [], Buffer.from([0x2a, 0xb0]));
  const method = {name: 'accept', rawDescriptor: '(Lmeta/Child;)Lmeta/Parent;', declaredAccessFlags: 9,
    accessFlags: new Flags(9), declaredCode: code};
  const cls = define('Lmeta/Current;', undefined, [method]);
  return {loader, loaded, requests, define, cls, method, code};
}
function thread() {
  return {errors: [],
    throwException(error) { this.errors.push(error); },
    throwNewException(name, message) { this.errors.push({name, message}); },
    runWithExceptionBoundary(operation, callback) {
      this.rejectLoad = failure => callback(failure);
      operation(value => callback(null, value));
    }};
}

test('loaded hierarchy metadata discharges obligations without resolution or initialization', () => {
  const w = world();
  w.define('Lmeta/Child;', 'Lmeta/Parent;');
  const gate = new ClassVerification(w.cls);
  assert.equal(gate.isVerified(), false);
  assert.equal(gate.tryToVerify(), true);
  assert.equal(gate.isVerified(), true);
  assert.deepEqual(w.requests, []);
  // Interpreter quickening after verification cannot trigger a second decode.
  w.code.getCode()[0] = 0xff;
  assert.equal(gate.tryToVerify(), true);
});

test('missing metadata cannot authorize execution and concurrent callers share one load', () => {
  const w = world(), gate = new ClassVerification(w.cls), first = thread(), second = thread(), results = [];
  assert.equal(gate.tryToVerify(), false);
  gate.verify(first, success => results.push(['first', success]));
  gate.verify(second, success => results.push(['second', success]));
  assert.equal(gate.isVerified(), false);
  assert.equal(gate.tryToVerify(), false);
  assert.equal(w.requests.length, 1);
  assert.equal(w.requests[0].name, 'Lmeta/Child;');
  assert.equal(w.requests[0].explicit, false);
  assert.deepEqual(results, []);
  const child = w.define('Lmeta/Child;', 'Lmeta/Parent;');
  w.requests[0].callback(child);
  assert.deepEqual(results, [['first', true], ['second', true]]);
  assert.equal(gate.isVerified(), true);
  assert.deepEqual(first.errors.concat(second.errors), []);
});

test('type failure is cached for every waiter and never becomes initialized state', () => {
  const w = world(), gate = new ClassVerification(w.cls), first = thread(), second = thread(), results = [];
  gate.verify(first, success => results.push(success));
  gate.verify(second, success => results.push(success));
  w.requests[0].callback(w.define('Lmeta/Child;')); // Not a Parent subtype.
  assert.deepEqual(results, [false, false]);
  for (const waiter of [first, second]) assert.equal(waiter.errors[0].name, 'Ljava/lang/VerifyError;');
  assert.equal(gate.tryToVerify(), false);
  const later = thread();
  gate.verify(later, success => assert.equal(success, false));
  assert.deepEqual(later.errors, first.errors);
  assert.equal(w.requests.length, 1);
});

test('metadata load failure preserves and caches the original guest Throwable', () => {
  const w = world(), gate = new ClassVerification(w.cls), first = thread(), second = thread();
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/NoClassDefFoundError;'})};
  gate.verify(first, success => assert.equal(success, false));
  gate.verify(second, success => assert.equal(success, false));
  first.rejectLoad(failure);
  assert.equal(first.errors[0], failure);
  assert.equal(second.errors[0], failure);
  const later = thread();
  gate.verify(later, success => assert.equal(success, false));
  assert.equal(later.errors[0], failure);
  assert.equal(w.requests.length, 1);
});

test('multiple waiters on one thread receive callbacks but only one failure delivery', () => {
  const w = world(), gate = new ClassVerification(w.cls), owner = thread(), results = [];
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/NoClassDefFoundError;'})};
  gate.verify(owner, success => results.push(success));
  gate.verify(owner, success => results.push(success));
  owner.rejectLoad(failure);
  assert.deepEqual(results, [false, false]);
  assert.deepEqual(owner.errors, [failure]);
  gate.verify(owner, success => assert.equal(success, false));
  assert.deepEqual(owner.errors, [failure, failure], 'A later attempt still reports the cached failure');
});

test('pure instruction failures do not load metadata or execute trapped declarations', () => {
  const w = world();
  w.method.declaredCode = new Code(1, 1, [], [], Buffer.from([0x0b, 0xb0]));
  w.method.accessFlags = new Flags(0x0109); // Runtime trap; original flags remain 9.
  const gate = new ClassVerification(w.cls), owner = thread();
  assert.equal(gate.tryToVerify(), false);
  gate.verify(owner, success => assert.equal(success, false));
  assert.equal(owner.errors[0].name, 'Ljava/lang/VerifyError;');
  assert.equal(w.requests.length, 0);
});

test('an unregistered lookup/anonymous class resolves its own identity locally', () => {
  const w = world();
  w.method.rawDescriptor = '(Lmeta/Current;)Lmeta/Parent;';
  w.cls.getSuperClassReference = () => ({name: 'Lmeta/Parent;'});
  w.loaded.delete('Lmeta/Current;');
  assert.equal(new ClassVerification(w.cls).tryToVerify(), true);
  assert.equal(w.requests.length, 0);
});

test('metadata hierarchy cycles fail rather than recurse indefinitely', () => {
  const w = world();
  w.define('Lmeta/Child;', 'Lmeta/Child;');
  const gate = new ClassVerification(w.cls), owner = thread();
  gate.verify(owner, success => assert.equal(success, false));
  assert.equal(owner.errors[0].name, 'Ljava/lang/ClassCircularityError;');
  assert.equal(gate.isVerified(), false);
});

test('pre-thread bootstrap metadata loading still verifies the same obligations', () => {
  const w = world(), gate = new ClassVerification(w.cls);
  let result;
  gate.verify(null, success => { result = success; });
  assert.equal(w.requests[0].thread, null);
  w.requests[0].callback(w.define('Lmeta/Child;', 'Lmeta/Parent;'));
  assert.equal(result, true);
  assert.equal(gate.isVerified(), true);
});
