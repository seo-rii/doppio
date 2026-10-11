'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations',
  'ReflectionAdapters', 'GeneratedAdapters']);
const cache = new Map();
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache.has(name)) return cache.get(name).exports;
  const loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id.startsWith('./') && sourceModules.has(id.slice(2)) ? load(id.slice(2)) : original(id);
  loaded._compile(require('typescript').transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: 1, module: 1}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData, PrimitiveClassData, ArrayClassData} = load('ClassData');
const {ClassLoader, CustomClassLoader} = load('ClassLoader');
const {JVMThread} = load('threading');
const {ThreadStatus, StackFrameType} = require(path.join(runtime, 'src/enums'));
const u2 = value => { const b = Buffer.alloc(2); b.writeUInt16BE(value); return b; };

// These small parsed classes isolate loader lifecycle behavior. Genuine javac
// inheritance/evolution and native/browser comparisons belong to the B4a corpus.
function bytes(name, superclass = 'java/lang/Object', interfaces = [], flags = 0x21) {
  const utf = text => Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(text)), Buffer.from(text)]);
  const constants = [];
  function cls(text) {
    constants.push(utf(text));
    const index = constants.length;
    constants.push(Buffer.concat([Buffer.from([7]), u2(index)]));
    return constants.length;
  }
  const self = cls(name), parent = superclass === null ? 0 : cls(superclass), roles = interfaces.map(cls);
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 52]), u2(constants.length + 1), ...constants,
    u2(flags), u2(self), u2(parent), u2(roles.length), ...roles.map(u2), u2(0), u2(0), u2(0)]);
}
function throwable(name) { return {getClass: () => ({getInternalName: () => name})}; }
function thread() {
  const owner = Object.create(JVMThread.prototype);
  owner.status = ThreadStatus.ASYNC_WAITING;
  owner.errors = [];
  owner.setStatus = function(status) { this.status = status; };
  owner.throwNewException = function(name) { this.throwException(throwable(name)); };
  owner.handleUncaughtException = () => assert.fail('Derivation error escaped its caller');
  owner.stack = [{type: StackFrameType.NATIVE, scheduleException(current, failure) {
    current.errors.push(failure); return true;
  }}];
  return owner;
}
function drain(...owners) {
  for (let count = 0; count < 100; count++) {
    let progressed = false;
    for (const owner of owners) {
      const top = owner.stack.at(-1);
      if (owner.status === ThreadStatus.RUNNABLE && top && top.type === StackFrameType.INTERNAL) {
        top.run(owner); progressed = true;
      }
    }
    if (!progressed) return;
  }
  assert.fail('Derivation did not settle');
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function world() {
  const loader = new ClassLoader(null);
  loader.bootstrap = loader;
  loader.getLoaderObject = () => null;
  const object = new ReferenceClassData(bytes('java/lang/Object', null), null, loader);
  object.setResolved(null, []);
  loader.addClass(object.getInternalName(), object);
  return {loader, object};
}
function delayed(w, owner, name, results) {
  let candidate, finish;
  w.loader.defineClass(owner, 'L' + name + ';', bytes(name), null, value => results.push(value), cls => {
    candidate = cls;
    cls.resolveHierarchy = (current, callback) => { finish = callback; };
  });
  return {get candidate() { return candidate; }, complete() { finish(candidate); },
    fail(error) { owner.throwException(error); finish(null); drain(owner); }};
}

for (const parsed of [false, true]) {
  test((parsed ? 'parsed Lookup' : 'named') + ' definition loads interface metadata before its superclass without linking descriptor classes', async () => {
    const w = world(), owner = thread(), requests = [], metadata = [];
    w.loader._loadClass = (current, name, callback) => {
      requests.push(name);
      const cls = new ReferenceClassData(bytes(name.slice(1, -1), 'java/lang/Object', [],
        name.includes('Role') ? 0x601 : 0x21), null, w.loader);
      cls.setResolved(w.object, []);
      w.loader.addClass(name, cls);
      metadata.push(cls);
      callback(cls);
    };
    const data = bytes('scope/Ordered', 'scope/Parent', ['scope/RoleA', 'scope/RoleB']);
    let candidate;
    const result = await new Promise(resolve => {
      if (parsed) {
        candidate = new ReferenceClassData(data, null, w.loader);
        w.loader.defineParsedClass(owner, candidate, resolve);
      } else w.loader.defineClass(owner, 'Lscope/Ordered;', data, null, resolve, cls => { candidate = cls; });
    });
    assert.equal(result, candidate);
    assert.deepEqual(requests, ['Lscope/RoleA;', 'Lscope/RoleB;', 'Lscope/Parent;']);
    assert.ok(metadata.every(cls => !cls.isVerified() && !cls.isInitialized(null)));
    assert.equal(candidate.getSuperClassReference().cls, null);
    assert.ok(candidate.getInterfaceClassReferences().every(ref => ref.cls === null));
    assert.equal(candidate.isVerified(), false);
  });
}

test('interface preloading does not admit an interface before rejecting a final superclass', async () => {
  const w = world(), owner = thread(), results = [], requests = [];
  w.loader._loadClass = (current, name, callback) => {
    requests.push(name);
    const cls = new ReferenceClassData(bytes(name.slice(1, -1), 'java/lang/Object', [],
      name === 'Lscope/Role;' ? 0x601 : 0x31), null, w.loader);
    cls.setResolved(w.object, []);
    w.loader.addClass(name, cls);
    callback(cls);
  };
  w.loader.defineClass(owner, 'Lscope/Rejected;', bytes('scope/Rejected', 'scope/Final', ['scope/Role']), null,
    value => results.push(value));
  for (let i = 0; i < 100 && results.length === 0; i++) { await tick(); drain(owner); }
  assert.deepEqual(requests, ['Lscope/Role;', 'Lscope/Final;']);
  assert.deepEqual(results, [null]);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/IncompatibleClassChangeError;');
  assert.equal(w.loader.getLoadedClass('Lscope/Rejected;'), null);
});

test('interface preloading carries the private candidate ancestry and cannot deadlock on itself', () => {
  const w = world(), owner = thread(), results = [];
  w.loader.defineClass(owner, 'Lscope/Recursive;', bytes('scope/Recursive', 'java/lang/Object', ['scope/Recursive']), null,
    value => results.push(value));
  drain(owner);
  assert.deepEqual(results, [null]);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/ClassCircularityError;');
  assert.equal(w.loader.getLoadedClass('Lscope/Recursive;'), null);
  assert.deepEqual(Object.keys(w.loader.pendingDefinitions), []);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('pending definitions are absent from published name and array views', () => {
  const w = world(), owner = thread(), results = [], pending = delayed(w, owner, 'scope/Pending', results);
  assert.ok(pending.candidate);
  assert.equal(w.loader.getLoadedClass('Lscope/Pending;'), null);
  assert.equal(w.loader.getLoadedClass('[Lscope/Pending;'), null);
  assert.deepEqual(w.loader.getLoadedClassNames(), ['Ljava/lang/Object;']);
  assert.deepEqual(results, []);
  pending.complete();
  assert.deepEqual(results, [pending.candidate]);
  assert.equal(w.loader.getLoadedClass('Lscope/Pending;'), pending.candidate);
  assert.equal(pending.candidate.isVerified(), false);
});

test('null expected names use this_class while wrong expected names do not publish aliases', async () => {
  const w = world(), owner = thread(), results = [];
  w.loader.defineClass(owner, 'Lscope/Wrong;', bytes('scope/Actual'), null, cls => results.push(cls));
  assert.deepEqual(results, [null]);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/NoClassDefFoundError;');
  assert.equal(w.loader.getLoadedClass('Lscope/Wrong;'), null);
  assert.equal(w.loader.getLoadedClass('Lscope/Actual;'), null);
  w.loader.defineClass(owner, null, bytes('scope/Actual'), null, cls => results.push(cls));
  await tick();
  assert.equal(results[1], w.loader.getLoadedClass('Lscope/Actual;'));
  assert.ok(results[1]);
});

test('failed derivation releases its candidate and permits a corrected definition', async () => {
  const w = world(), owner = thread(), results = [], pending = delayed(w, owner, 'scope/Retry', results);
  const failure = throwable('Ljava/lang/IllegalAccessError;');
  pending.fail(failure);
  assert.deepEqual(results, [null]);
  assert.equal(owner.errors[0], failure);
  assert.equal(w.loader.getLoadedClass('Lscope/Retry;'), null);
  assert.equal(w.loader.getLoadedClass('Ljava/lang/Object;'), w.object);
  w.loader.defineClass(owner, 'Lscope/Retry;', bytes('scope/Retry'), null, cls => results.push(cls));
  await tick();
  assert.ok(results[1]);
  assert.notEqual(results[1], pending.candidate);
});

test('same-thread independent metadata waiters join without a false circularity error', () => {
  const w = world(), owner = thread(), results = [], pending = delayed(w, owner, 'scope/Shared', results), loaded = [];
  w.loader.loadClass(owner, 'Lscope/Shared;', cls => loaded.push(cls), false);
  assert.deepEqual(owner.errors, []);
  assert.deepEqual(loaded, []);
  pending.complete();
  assert.deepEqual(loaded, [pending.candidate]);
  assert.deepEqual(results, [pending.candidate]);
});

test('failed pending derivation notifies all callbacks and each thread exactly once', () => {
  const w = world(), first = thread(), second = thread(), defined = [], a = [], b = [], c = [];
  const pending = delayed(w, first, 'scope/Fanout', defined);
  w.loader.loadClass(first, 'Lscope/Fanout;', value => a.push(value), false);
  w.loader.loadClass(second, 'Lscope/Fanout;', value => b.push(value), false);
  w.loader.loadClass(second, 'Lscope/Fanout;', value => c.push(value), true);
  const failure = throwable('Ljava/lang/IncompatibleClassChangeError;');
  pending.fail(failure);
  drain(first, second);
  for (const values of [defined, a, b, c]) assert.deepEqual(values, [null]);
  assert.deepEqual(first.errors, [failure]);
  assert.deepEqual(second.errors, [failure]);
  assert.equal(w.loader.getLoadedClass('Lscope/Fanout;'), null);
  assert.deepEqual(Object.keys(w.loader.pendingDefinitions), []);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('a pending candidate in the explicit derivation ancestry fails without joining its load lock', () => {
  const w = world(), owner = thread(), results = [], pending = delayed(w, owner, 'scope/Cycle', results), loaded = [];
  w.loader.loadClass(owner, 'Lscope/Cycle;', cls => loaded.push(cls), false, new Set([pending.candidate]));
  drain(owner);
  assert.deepEqual(loaded, [null]);
  assert.deepEqual(results, [null]);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/ClassCircularityError;');
  assert.equal(w.loader.getLoadedClass('Lscope/Cycle;'), null);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('competing definition success is followed by a duplicate, not the winner identity', async () => {
  const w = world(), first = thread(), second = thread(), results = [], later = [], pending = delayed(w, first, 'scope/Race', results);
  w.loader.defineClass(second, 'Lscope/Race;', bytes('scope/Race'), null, cls => later.push(cls));
  assert.deepEqual(later, []);
  pending.complete();
  await tick(); drain(second);
  assert.deepEqual(later, [null]);
  assert.equal(second.errors[0].getClass().getInternalName(), 'Ljava/lang/LinkageError;');
  assert.equal(w.loader.getLoadedClass('Lscope/Race;'), pending.candidate);
});

test('a competing definition can succeed after the first derivation fails', async () => {
  const w = world(), first = thread(), second = thread(), results = [], later = [], pending = delayed(w, first, 'scope/RaceRetry', results);
  w.loader.defineClass(second, 'Lscope/RaceRetry;', bytes('scope/RaceRetry'), null, cls => later.push(cls));
  pending.fail(throwable('Ljava/lang/IncompatibleClassChangeError;'));
  await tick(); await tick(); drain(second);
  assert.ok(later[0]);
  assert.notEqual(later[0], pending.candidate);
  assert.deepEqual(second.errors, []);
});

test('independent pre-thread requests do not become same-owner circularity', () => {
  const w = world(), results = [], pending = delayed(w, null, 'scope/Bootstrap', results), loaded = [];
  w.loader.loadClass(null, 'Lscope/Bootstrap;', cls => loaded.push(cls), false);
  assert.deepEqual(loaded, []);
  pending.complete();
  assert.deepEqual(loaded, [pending.candidate]);
  assert.deepEqual(results, [pending.candidate]);
});

function customWorld(invoke) {
  const w = world(), missing = {}, originalGet = w.loader.getLoadedClass.bind(w.loader);
  w.loader.getLoadedClass = name => name === 'Ljava/lang/ClassNotFoundException;' ? missing : originalGet(name);
  // Only Java String argument construction is stubbed; loader and declaration
  // identities, queues, failure capture and hierarchy admission remain real.
  w.loader.getInitializedClass = () => ({getConstructor: () => function(current, length) { this.array = new Array(length); }});
  w.loader.getResolvedClass = () => ({getConstructor: () => function() {}});
  const loader = new CustomClassLoader(w.loader, {'loadClass(Ljava/lang/String;)Ljava/lang/Class;'(owner, args, callback) {
    invoke(owner, callback, loader);
  }});
  loader.addClass('Ljava/lang/Object;', w.object);
  return {loader, bootstrap: w.loader, missing, object: w.object};
}

test('custom loader null, wrong-name and primitive mirrors are discarded without alias publication', () => {
  for (const result of ['null', 'wrong-name', 'primitive']) {
    const w = customWorld((owner, callback) => callback(null, mirror)), owner = thread(), values = [];
    const cls = result === 'primitive' ? new PrimitiveClassData('I', w.bootstrap) :
      new ReferenceClassData(bytes('scope/Other'), null, w.bootstrap);
    const mirror = result === 'null' ? null : {$cls: cls};
    w.loader._loadClass(owner, 'Lscope/Requested;', value => values.push(value), true);
    assert.deepEqual(values, [null], result);
    assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/NoClassDefFoundError;', result);
    assert.equal(w.loader.getLoadedClass('Lscope/Requested;'), null);
  }
});

test('custom loader initiation is idempotent for one identity and rejects a different identity', () => {
  let selected;
  const w = customWorld((owner, callback) => callback(null, {$cls: selected})), owner = thread(), values = [];
  const first = new ReferenceClassData(bytes('scope/Identity'), null, w.bootstrap);
  selected = first;
  w.loader._loadClass(owner, 'Lscope/Identity;', value => values.push(value));
  w.loader._loadClass(owner, 'Lscope/Identity;', value => values.push(value));
  selected = new ReferenceClassData(bytes('scope/Identity'), null, world().loader);
  assert.doesNotThrow(() => w.loader._loadClass(owner, 'Lscope/Identity;', value => values.push(value)));
  assert.deepEqual(values, [first, first, null]);
  assert.equal(w.loader.getLoadedClass('Lscope/Identity;'), first);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/LinkageError;');
});

test('custom loader non-CNFE Throwable identity is retained, including after a successful definition', async () => {
  for (const defineFirst of [false, true]) {
    const failure = {getClass: () => ({isCastable: () => false})}, owner = thread(), values = [];
    const w = customWorld((current, callback, loader) => {
      if (defineFirst) loader.defineClass(current, 'Lscope/Throws;', bytes('scope/Throws'), null, cls => {
        assert.ok(cls); callback(failure);
      });
      else callback(failure);
    });
    w.loader._loadClass(owner, 'Lscope/Throws;', value => values.push(value));
    await tick(); drain(owner);
    assert.deepEqual(values, [null]);
    assert.equal(owner.errors[0], failure);
    assert.equal(w.loader.getLoadedClass('Lscope/Throws;') !== null, defineFirst);
  }
});

test('outer loader exception boundary preserves a definition followed by Java failure', async () => {
  const owner = thread(), values = [];
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/IllegalAccessError;', isCastable: () => false})};
  const w = customWorld((current, callback, loader) => {
    loader.defineClass(current, 'Lscope/PublishedThenThrows;', bytes('scope/PublishedThenThrows'), null, cls => {
      assert.ok(cls);
      callback(failure);
    });
  });
  w.loader.loadClass(owner, 'Lscope/PublishedThenThrows;', value => values.push(value), false);
  await tick();
  drain(owner);
  assert.deepEqual(values, [null]);
  assert.deepEqual(owner.errors, [failure]);
  assert.ok(w.loader.getLoadedClass('Lscope/PublishedThenThrows;'));
  assert.deepEqual(Object.keys(w.loader.pendingDefinitions), []);
  assert.deepEqual(Object.keys(w.loader.loadClassLocks.locks), []);
});

test('Java loader-frame ancestry reaches nested native definition, without poisoning independent metadata requests', () => {
  let javaFrame;
  const w = customWorld(owner => {
    javaFrame = {type: StackFrameType.BYTECODE, scheduleException: () => false};
    owner.stack.push(javaFrame);
  }), owner = thread(), results = [], loaded = [];
  const pending = delayed(w, owner, 'scope/FrameCycle', results);
  w.loader._loadClass(owner, 'Lscope/Parent;', () => {}, false, new Set([pending.candidate]));
  // A verifier's ordinary metadata request must not infer ancestry merely
  // because a Java loader invocation is present lower on this same thread.
  w.loader.loadClass(owner, 'Lscope/FrameCycle;', value => loaded.push(value), false);
  assert.deepEqual(owner.errors, []);
  const recursive = [];
  w.loader.defineClass(owner, 'Lscope/FrameCycle;', bytes('scope/FrameCycle'), null, value => recursive.push(value));
  drain(owner);
  assert.deepEqual(recursive, [null]);
  assert.deepEqual(results, [null]);
  assert.deepEqual(loaded, [null]);
  assert.equal(owner.errors.length, 1);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/ClassCircularityError;');
  assert.equal(owner.stack.includes(javaFrame), false);
});

test('an initiating identity published during derivation survives the losing candidate failure', () => {
  const w = world(), owner = thread(), results = [], pending = delayed(w, owner, 'scope/Initiated', results);
  const winner = new ReferenceClassData(bytes('scope/Initiated'), null, world().loader);
  w.loader.addClass('Lscope/Initiated;', winner);
  assert.doesNotThrow(() => pending.complete());
  drain(owner);
  assert.deepEqual(results, [null]);
  assert.equal(w.loader.getLoadedClass('Lscope/Initiated;'), winner);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/LinkageError;');
});

test('a failing generated preparation hook removes its unpublished reservation', () => {
  const w = world(), owner = thread(), results = [];
  w.loader.defineClass(owner, 'Lscope/Prepare;', bytes('scope/Prepare'), null, cls => results.push(cls), () => {
    throw new Error('Invalid VM generated preparation');
  });
  drain(owner);
  assert.deepEqual(results, [null]);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/ClassFormatError;');
  assert.equal(w.loader.getLoadedClass('Lscope/Prepare;'), null);
  assert.deepEqual(Object.keys(w.loader.pendingDefinitions), []);
});

let classNatives;
function loadClassNatives() {
  if (classNatives) return classNatives;
  const filename = path.join(runtime, 'src/natives/java_lang.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') {
    return classNatives = require(filename).default()['java/lang/Class'];
  }
  const loaded = new Module(filename, module), Doppio = require(path.join(runtime, 'src/doppiojvm'));
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id === '../doppiojvm' ? {
    ...Doppio, VM: {...Doppio.VM, ClassFile: {...Doppio.VM.ClassFile, ...load('ClassData')}}
  } : original(id);
  loaded._compile(require('typescript').transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/natives/java_lang.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1}
    }).outputText, filename);
  return classNatives = loaded.exports.default()['java/lang/Class'];
}
function forName(owner, loader, name, initialize = 0) {
  loadClassNatives()['forName0(Ljava/lang/String;ZLjava/lang/ClassLoader;Ljava/lang/Class;)Ljava/lang/Class;'](
    owner, {toString: () => name}, initialize, {$loader: loader}, null);
}

test('noninitializing Class.forName returns a published reference without retrying verification', async () => {
  const w = world(), owner = thread(), returns = [];
  const cls = new ReferenceClassData(bytes('scope/Passive'), null, w.loader), mirror = {$cls: cls};
  cls.setResolved(w.object, []);
  cls.getClassObject = () => mirror;
  cls.resolve = () => assert.fail('Passive lookup must not verify the published class');
  cls.initialize = () => assert.fail('Passive lookup must not initialize the published class');
  w.loader.addClass(cls.getInternalName(), cls);
  owner.asyncReturn = value => returns.push(value);
  forName(owner, w.loader, 'scope.Passive');
  await tick();
  assert.deepEqual(returns, [mirror]);
  assert.equal(cls.isVerified(), false);
  assert.deepEqual(owner.errors, []);
});

test('noninitializing Class.forName waits for array metadata and does not publish a failed result', async () => {
  for (const success of [true, false]) {
    const w = world(), owner = thread(), returns = [], array = new ArrayClassData('I', w.loader);
    const mirror = {$cls: array};
    let complete;
    array.getClassObject = () => mirror;
    array.resolve = (current, callback) => { assert.equal(current, owner); complete = callback; };
    w.loader.loadClass = (current, name, callback) => { assert.equal(name, '[I'); callback(array); };
    w.loader.resolveClass = () => assert.fail('Passive array lookup starts with metadata-only loading');
    w.loader.initializeClass = () => assert.fail('Passive array lookup does not initialize its component');
    owner.asyncReturn = value => returns.push(value);
    forName(owner, w.loader, '[I');
    assert.equal(owner.status, ThreadStatus.ASYNC_WAITING);
    assert.deepEqual(returns, []);
    assert.equal(typeof complete, 'function');
    complete(success ? array : null);
    assert.deepEqual(returns, success ? [mirror] : []);
  }
});

test('initializing Class.forName retains its full initialization path', () => {
  const w = world(), owner = thread(), returns = [], mirror = {};
  let complete;
  w.loader.loadClass = () => assert.fail('The initialized request must use initializeClass');
  w.loader.initializeClass = (current, name, callback) => {
    assert.equal(current, owner);
    assert.equal(name, 'Lscope/Active;');
    complete = callback;
  };
  owner.asyncReturn = value => returns.push(value);
  forName(owner, w.loader, 'scope.Active', 1);
  assert.deepEqual(returns, []);
  complete({getClassObject: () => mirror});
  assert.deepEqual(returns, [mirror]);
});

test('noninitializing Class.forName preserves load failure without returning a mirror', () => {
  const w = world(), owner = thread(), returns = [], failure = throwable('Ljava/lang/ClassNotFoundException;');
  w.loader.loadClass = (current, name, callback) => { current.throwException(failure); callback(null); };
  w.loader.resolveClass = () => assert.fail('Passive missing-class lookup must not resolve');
  owner.asyncReturn = value => returns.push(value);
  forName(owner, w.loader, 'scope.Missing');
  assert.deepEqual(returns, []);
  assert.deepEqual(owner.errors, [failure]);
});
