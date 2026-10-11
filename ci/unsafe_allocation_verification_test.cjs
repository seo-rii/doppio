'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const {ThreadStatus} = require(path.join(runtimeRoot, 'src/enums'));

function loadNative() {
  const filename = path.join(runtimeRoot, 'src/natives/sun_misc.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  // Exercise the complete native module without replacing shared build files.
  const Module = require('node:module');
  const ts = require('typescript');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const source = fs.readFileSync(path.join(__dirname, '../src/natives/sun_misc.ts'), 'utf8');
  loaded._compile(ts.transpileModule(source, {compilerOptions: {
    target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS
  }}).outputText, filename);
  return loaded.exports;
}

const allocate = loadNative().default()['sun/misc/Unsafe']['allocateInstance(Ljava/lang/Class;)Ljava/lang/Object;'];

function world(initialized = false) {
  const events = [], allocations = [], returns = [], errors = [];
  let complete;
  const owner = {
    setStatus(status) { events.push(['status', status]); },
    asyncReturn(value) { events.push(['return']); returns.push(value); },
    throwException(error) { errors.push(error); },
    throwNewException() { assert.fail('Unsafe must preserve the original Java Throwable'); }
  };
  function Instance(thread) {
    assert.equal(thread, owner);
    events.push(['allocate']);
    allocations.push(this);
  }
  const cls = {
    isInitialized(thread) { assert.equal(thread, owner); return initialized; },
    initialize(thread, callback) {
      assert.equal(thread, owner);
      assert.equal(complete, undefined, 'initialization must be requested only once');
      events.push(['initialize']);
      complete = callback;
    },
    getConstructor(thread) {
      assert.equal(thread, owner);
      assert.equal(initialized, true, 'an unverified or failed class must never reach allocation');
      events.push(['constructor']);
      return Instance;
    }
  };
  return {
    events, allocations, returns, errors,
    invoke: () => allocate(owner, {}, {$cls: cls}),
    succeed() { initialized = true; complete(cls); },
    fail(error) { owner.throwException(error); complete(null); }
  };
}

test('Unsafe allocation of an initialized class returns synchronously exactly once', () => {
  const w = world(true);
  const value = w.invoke();
  assert.equal(value, w.allocations[0]);
  assert.equal(w.allocations.length, 1);
  assert.deepEqual(w.returns, []);
  assert.deepEqual(w.errors, []);
  assert.deepEqual(w.events, [['constructor'], ['allocate']]);
});

test('Unsafe allocation remains pending until verification and initialization complete', () => {
  const w = world();
  assert.equal(w.invoke(), undefined);
  assert.deepEqual(w.allocations, []);
  assert.deepEqual(w.returns, []);
  assert.deepEqual(w.errors, []);
  assert.deepEqual(w.events, [['status', ThreadStatus.ASYNC_WAITING], ['initialize']]);
});

test('successful asynchronous Unsafe initialization allocates and returns exactly once', () => {
  const w = world();
  assert.equal(w.invoke(), undefined);
  w.succeed();
  assert.equal(w.allocations.length, 1);
  assert.deepEqual(w.returns, [w.allocations[0]]);
  assert.deepEqual(w.errors, []);
  assert.deepEqual(w.events, [
    ['status', ThreadStatus.ASYNC_WAITING], ['initialize'], ['constructor'], ['allocate'], ['return']
  ]);
});

for (const [phase, name] of [
  ['verification', 'Ljava/lang/VerifyError;'],
  ['initialization', 'Ljava/lang/ExceptionInInitializerError;']
]) {
  test(`Unsafe allocation preserves the ${phase} failure without allocating or returning`, () => {
    const w = world();
    const failure = {getClass: () => ({getInternalName: () => name})};
    assert.equal(w.invoke(), undefined);
    assert.doesNotThrow(() => w.fail(failure), 'the guest failure must not become a host assertion');
    assert.deepEqual(w.errors, [failure], 'the original Throwable is delivered once');
    assert.deepEqual(w.allocations, []);
    assert.deepEqual(w.returns, []);
    assert.deepEqual(w.events, [['status', ThreadStatus.ASYNC_WAITING], ['initialize']]);
  });
}
