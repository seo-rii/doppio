'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
function load() {
  const filename = path.join(runtime, 'src/SymbolicResolution.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(require('typescript').transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/SymbolicResolution.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1}
    }).outputText, filename);
  return loaded.exports;
}
const {SymbolicResolution} = load();
// Controlled class identities, not a name-based approximation of inheritance.
const errorClasses = new Map();
function errorClass(name, parent = null) {
  const cls = {getInternalName: () => name,
    isSubclass(base) { return this === base || (parent !== null && parent.isSubclass(base)); }};
  errorClasses.set(name, cls);
  return cls;
}
const throwableClass = errorClass('Ljava/lang/Throwable;');
const baseError = errorClass('Ljava/lang/Error;', throwableClass);
const linkageError = errorClass('Ljava/lang/LinkageError;', baseError);
const incompatibleError = errorClass('Ljava/lang/IncompatibleClassChangeError;', linkageError);
errorClass('Ljava/lang/NoClassDefFoundError;', linkageError);
for (const name of ['NoSuchFieldError', 'NoSuchMethodError', 'IllegalAccessError']) {
  errorClass('Ljava/lang/' + name + ';', incompatibleError);
}
const vmError = errorClass('Ljava/lang/VirtualMachineError;', baseError);
for (const name of ['OutOfMemoryError', 'StackOverflowError']) errorClass('Ljava/lang/' + name + ';', vmError);
errorClass('Ljava/lang/NullPointerException;', throwableClass);
const throwable = name => ({getClass: () => typeof name === 'string' ? errorClasses.get(name) : name});
function thread() {
  return {errors: [], boundary: null,
    getBsCl() { return {getLoadedClass: name => errorClasses.get(name) || null}; },
    throwException(error) {
      if (this.boundary) {
        const boundary = this.boundary;
        this.boundary = null;
        setImmediate(() => boundary(error));
      } else this.errors.push(error);
    },
    throwNewException(name) { this.throwException(throwable(name)); },
    runWithExceptionBoundary(operation, callback) {
      assert.equal(this.boundary, null);
      this.boundary = callback;
      operation(value => {
        assert.equal(this.boundary, callback);
        this.boundary = null;
        callback(null, value);
      });
    }};
}
const tick = () => new Promise(done => setImmediate(done));

test('successful symbolic resolution retains one operation and serves every waiter once', () => {
  const gate = new SymbolicResolution(), first = thread(), second = thread(), callbacks = [];
  let complete, attempts = 0;
  const operation = done => { attempts++; complete = done; };
  gate.resolve(first, operation, success => callbacks.push(['first', success]));
  gate.resolve(second, operation, success => callbacks.push(['second', success]));
  assert.deepEqual(callbacks, []);
  complete(true);
  gate.resolve(second, operation, success => callbacks.push(['again', success]));
  assert.equal(attempts, 1);
  assert.deepEqual(callbacks, [['first', true], ['second', true], ['again', true]]);
  assert.deepEqual(first.errors, []);
  assert.deepEqual(second.errors, []);
  assert.equal(gate.hasFailed(), false);
});

test('failed symbolic resolution keeps the original guest Throwable and never retries the loader', async () => {
  const gate = new SymbolicResolution(), first = thread(), second = thread(), error = throwable('Ljava/lang/NoClassDefFoundError;');
  let attempts = 0, callbacks = 0;
  const operation = done => { attempts++; first.throwException(error); done(false); };
  gate.resolve(first, operation, success => { assert.equal(success, false); callbacks++; });
  assert.equal(callbacks, 0, 'A false callback must wait for the thrown guest error');
  await tick();
  gate.resolve(second, () => assert.fail('A supplied replacement must not retry a failed CP entry'), success => {
    assert.equal(success, false); callbacks++;
  });
  assert.equal(attempts, 1);
  assert.equal(callbacks, 2);
  assert.ok(first.errors[0] === error);
  assert.ok(second.errors[0] === error);
  assert.equal(gate.hasFailed(), true);
});

test('a failed in-flight reference reports once per guest thread but completes duplicate waiters', async () => {
  const gate = new SymbolicResolution(), first = thread(), second = thread(), error = throwable('Ljava/lang/IllegalAccessError;');
  let complete, attempts = 0, callbacks = 0;
  gate.resolve(first, done => { attempts++; complete = done; }, success => { assert.equal(success, false); callbacks++; });
  const duplicate = success => { assert.equal(success, false); callbacks++; };
  gate.resolve(first, () => assert.fail('Duplicate owner restarted resolution'), duplicate);
  gate.resolve(second, () => assert.fail('A waiter restarted resolution'), duplicate);
  gate.resolve(second, () => assert.fail('A duplicate waiter restarted resolution'), duplicate);
  first.throwException(error);
  complete(false);
  await tick();
  assert.equal(attempts, 1);
  assert.equal(callbacks, 4);
  assert.equal(first.errors.length, 1);
  assert.equal(second.errors.length, 1);
  assert.ok(first.errors[0] === error && second.errors[0] === error);
});

for (const name of ['Ljava/lang/NoSuchFieldError;', 'Ljava/lang/NoSuchMethodError;',
  'Ljava/lang/IncompatibleClassChangeError;', 'Ljava/lang/LinkageError;']) {
  test('explicit resolution errors retain their first result: ' + name, async () => {
    const gate = new SymbolicResolution(), first = thread(), second = thread();
    let callbacks = 0;
    gate.resolve(first, done => { gate.throwFailure(first, name, 'original'); done(false); }, success => {
      assert.equal(success, false); callbacks++;
    });
    await tick();
    gate.resolve(second, () => assert.fail('A failed reference was retried'), success => {
      assert.equal(success, false); callbacks++;
    });
    assert.equal(callbacks, 2);
    assert.equal(second.errors[0].getClass().getInternalName(), name);
    assert.ok(first.errors[0] === second.errors[0]);
  });
}

test('diagnostic-only callers retain the original error category without a guest stack', () => {
  const gate = new SymbolicResolution(), owner = {errors: [],
    throwNewException(name, message) { this.errors.push({name, message}); }};
  let attempts = 0;
  const operation = done => { attempts++; gate.throwFailure(owner, 'Ljava/lang/IllegalAccessError;', 'original'); done(false); };
  gate.resolve(owner, operation, success => assert.equal(success, false));
  gate.resolve(owner, operation, success => assert.equal(success, false));
  assert.equal(attempts, 1);
  assert.deepEqual(owner.errors, [{name: 'Ljava/lang/IllegalAccessError;', message: 'original'},
    {name: 'Ljava/lang/IllegalAccessError;', message: 'original'}]);
});

test('execution-dependent receiver errors do not invalidate a successfully resolved reference', () => {
  const gate = new SymbolicResolution(), owner = thread();
  let attempts = 0;
  const operation = done => { attempts++; done(true); };
  gate.resolve(owner, operation, success => assert.equal(success, true));
  owner.throwNewException('Ljava/lang/NullPointerException;');
  gate.resolve(owner, operation, success => assert.equal(success, true));
  assert.equal(attempts, 1);
  assert.equal(gate.hasFailed(), false);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/NullPointerException;');
});

test('a dependent diagnostic-only reference inherits its symbolic owner failure without duplicate reporting', () => {
  const owner = new SymbolicResolution(), member = new SymbolicResolution(), sink = {errors: [],
    throwNewException(name, message) { this.errors.push({name, message}); }};
  member.resolve(sink, done => owner.resolve(sink, ownerDone => {
    owner.throwFailure(sink, 'Ljava/lang/IllegalAccessError;', 'owner');
    ownerDone(false);
  }, success => { member.inheritFailure(owner); done(success); }), success => assert.equal(success, false));
  assert.deepEqual(sink.errors, [{name: 'Ljava/lang/IllegalAccessError;', message: 'owner'}]);
  member.resolve(sink, () => assert.fail('A failed dependent reference restarted'), success => assert.equal(success, false));
  assert.deepEqual(sink.errors, [{name: 'Ljava/lang/IllegalAccessError;', message: 'owner'},
    {name: 'Ljava/lang/IllegalAccessError;', message: 'owner'}]);
});

for (const name of ['Ljava/lang/OutOfMemoryError;', 'Ljava/lang/StackOverflowError;']) {
  test('non-LinkageError resolution failures are delivered but allow a later retry: ' + name, async () => {
    const gate = new SymbolicResolution(), owner = thread(), error = throwable(name);
    let attempts = 0;
    gate.resolve(owner, done => { attempts++; owner.throwException(error); done(false); }, success => assert.equal(success, false));
    await tick();
    assert.ok(owner.errors[0] === error);
    assert.equal(gate.hasFailed(), false);
    gate.resolve(owner, done => { attempts++; done(true); }, success => assert.equal(success, true));
    assert.equal(attempts, 2);
    gate.resolve(owner, () => assert.fail('Successful retry was not retained'), success => assert.equal(success, true));
  });
}

test('a foreign class named LinkageError does not acquire bootstrap failure-cache authority', async () => {
  const foreign = {getInternalName: () => 'Ljava/lang/LinkageError;', isSubclass: base => base === foreign};
  const gate = new SymbolicResolution(), owner = thread(), error = throwable(foreign);
  gate.resolve(owner, done => { owner.throwException(error); done(false); }, success => assert.equal(success, false));
  await tick();
  assert.ok(owner.errors[0] === error);
  assert.equal(gate.hasFailed(), false);
  gate.resolve(owner, done => done(true), success => assert.equal(success, true));
});

test('a transient failure fans out once per thread and survives a reentrant successful retry', async () => {
  const gate = new SymbolicResolution(), owner = thread(), waiter = thread(), error = throwable('Ljava/lang/OutOfMemoryError;');
  const callbacks = [];
  let complete;
  gate.resolve(owner, done => { complete = done; }, success => {
    callbacks.push(['first', success]);
    gate.resolve(owner, done => done(true), retried => callbacks.push(['retry', retried]));
  });
  gate.resolve(waiter, () => assert.fail('A waiter restarted the in-flight attempt'), success => callbacks.push(['waiter', success]));
  gate.resolve(waiter, () => assert.fail('A duplicate waiter restarted the attempt'), success => callbacks.push(['duplicate', success]));
  owner.throwException(error);
  complete(false);
  await tick();
  assert.deepEqual(callbacks, [['first', false], ['retry', true], ['waiter', false], ['duplicate', false]]);
  assert.ok(owner.errors[0] === error && waiter.errors[0] === error);
  assert.equal(owner.errors.length, 1);
  assert.equal(waiter.errors.length, 1);
  assert.equal(gate.hasFailed(), false);
});
