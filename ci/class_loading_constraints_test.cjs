'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier',
  'VerificationRelations', 'ReflectionAdapters', 'GeneratedAdapters', 'LambdaAdapters']);
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(runtime, 'src', name + '.js'), loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id.startsWith('./') && sourceModules.has(id.slice(2)) ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData, PrimitiveClassData, ArrayClassData} = load('ClassData');
const {ClassLoader, CustomClassLoader} = load('ClassLoader');
const {JVMThread} = load('threading');
const {getLoadingConstraints} = load('LoadingConstraints');
const {ThreadStatus, StackFrameType} = require(path.join(runtime, 'src/enums'));
const u2 = n => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(n); return bytes; };

// Controlled, parsed class files isolate production publication and exception
// boundaries. They are not genuine javac fixtures or native/browser evidence.
// Only String/char[] construction and Java loadClass bodies are controlled;
// the ClassLoader, ClassData, registry, locks and exception boundaries are real.
function classBytes(name, parent = 'java/lang/Object') {
  const pool = [];
  function cls(text) {
    const bytes = Buffer.from(text);
    pool.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
    const index = pool.length;
    pool.push(Buffer.concat([Buffer.from([7]), u2(index)]));
    return pool.length;
  }
  const self = cls(name), superclass = parent === null ? 0 : cls(parent);
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 52]),
    u2(pool.length + 1), ...pool, u2(0x21), u2(self), u2(superclass), u2(0), u2(0), u2(0), u2(0)]);
}
function metadataOnly(cls) {
  for (const name of ['resolve', 'tryToResolve', 'initialize', 'tryToInitialize']) {
    cls[name] = () => assert.fail('Publication called ' + cls.getInternalName() + '.' + name);
  }
  for (const name of ['verify', 'tryToVerify']) {
    cls.verification[name] = () => assert.fail('Publication called ' + cls.getInternalName() + '.' + name);
  }
  return cls;
}
function ownerThread() {
  const owner = Object.create(JVMThread.prototype);
  owner.status = ThreadStatus.ASYNC_WAITING;
  owner.errors = [];
  owner.createdErrors = [];
  owner.setStatus = function(status) { this.status = status; };
  owner.throwNewException = function(name, message) {
    const failure = {name, message, getClass: () => ({getInternalName: () => name})};
    this.createdErrors.push(failure);
    this.throwException(failure);
  };
  owner.handleUncaughtException = () => assert.fail('Publication failure escaped its caller');
  owner.stack = [{type: StackFrameType.NATIVE, scheduleException(current, failure) {
    current.errors.push(failure);
    return true;
  }}];
  return owner;
}
function drain(...owners) {
  for (let i = 0; i < 100; i++) {
    let progressed = false;
    for (const owner of owners) {
      const top = owner.stack.at(-1);
      if (owner.status === ThreadStatus.RUNNABLE && top && top.type === StackFrameType.INTERNAL) {
        top.run(owner);
        progressed = true;
      }
    }
    if (!progressed) return;
  }
  assert.fail('Publication exception boundaries did not settle');
}
async function settle(ready, ...owners) {
  for (let i = 0; i < 100; i++) {
    drain(...owners);
    if (ready()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('Publication callback did not settle');
}
function noReservations(loader) {
  assert.deepEqual(Object.keys(loader.pendingDefinitions), []);
  assert.deepEqual(Object.keys(loader.loadClassLocks.locks), []);
}
function linkageError(owner) {
  assert.equal(owner.errors.length, 1);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/LinkageError;');
  return owner.errors[0];
}
function violation(result, name, expected, actual) {
  assert.notEqual(result, null);
  assert.equal(result.name, name);
  assert.equal(result.expected, expected);
  assert.equal(result.actual, actual);
}
function world() {
  const bootstrap = new ClassLoader(null), primitives = new Map();
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  bootstrap.getPrimitiveClass = name => {
    if (!primitives.has(name)) primitives.set(name, new PrimitiveClassData(name, bootstrap));
    return primitives.get(name);
  };
  const object = metadataOnly(new ReferenceClassData(classBytes('java/lang/Object', null), null, bootstrap));
  object.setResolved(null, []);
  bootstrap.addClass(object.getInternalName(), object);
  // Do not initialize a real String class merely to enter a controlled Java
  // loader body; this is unrelated to the publication contract under test.
  bootstrap.getInitializedClass = (thread, name) => {
    assert.equal(name, '[C');
    return {getConstructor: () => function(caller, length) { this.array = new Array(length); }};
  };
  bootstrap.getResolvedClass = name => {
    assert.equal(name, 'Ljava/lang/String;');
    function StringValue() {}
    StringValue.prototype.toString = function() {
      return String.fromCharCode(...this['java/lang/String/value'].array);
    };
    return {getConstructor: () => StringValue};
  };
  function custom(handler = () => assert.fail('Unexpected Java class load')) {
    const control = {handler, requests: []};
    control.loader = new CustomClassLoader(bootstrap, {
      'loadClass(Ljava/lang/String;)Ljava/lang/Class;'(thread, args, callback) {
        const name = args[0].toString();
        control.requests.push(name);
        control.handler(thread, name, callback, control.loader);
      }
    });
    control.loader.addClass(object.getInternalName(), object);
    return control;
  }
  function publish(name, owner = bootstrap) {
    const cls = metadataOnly(new ReferenceClassData(classBytes(name), null, owner));
    cls.setResolved(object, []);
    owner.addClass(cls.getInternalName(), cls);
    assert.equal(owner.getLoadedClass(cls.getInternalName()), cls);
    return cls;
  }
  return {bootstrap, object, custom, publish, constraints: getLoadingConstraints(bootstrap)};
}
async function loaded(loader, owner, name, explicit = false) {
  const values = [];
  loader.loadClass(owner, name, value => values.push(value), explicit);
  await settle(() => values.length !== 0, owner);
  assert.equal(values.length, 1, 'load callback must run exactly once');
  return values[0];
}
function delayedDefinition(loader, owner, name, values, parsed = false, onResult = () => {}) {
  let candidate, release;
  const completed = cls => { values.push(cls); onResult(cls); };
  const prepare = cls => {
    candidate = metadataOnly(cls);
    const original = candidate.resolveHierarchy;
    candidate.resolveHierarchy = function(...args) {
      release = () => original.apply(candidate, args);
    };
  };
  if (parsed) {
    prepare(new ReferenceClassData(classBytes(name), null, loader));
    loader.defineParsedClass(owner, candidate, completed);
  } else {
    loader.defineClass(owner, 'L' + name + ';', classBytes(name), null, completed, prepare);
  }
  return {get candidate() { return candidate; }, get ready() { return release !== undefined; },
    complete() { assert.ok(release); release(); }};
}

test('successful production definitions are recorded before later constraints are imposed', {timeout: 2000}, async () => {
  const w = world(), a = w.custom().loader, b = w.custom().loader, first = ownerThread(), second = ownerThread();
  const one = [], two = [], name = 'Lscope/Defined;';
  a.defineClass(first, name, classBytes('scope/Defined'), null, cls => one.push(cls), metadataOnly);
  b.defineClass(second, name, classBytes('scope/Defined'), null, cls => two.push(cls), metadataOnly);
  await settle(() => one.length === 1 && two.length === 1, first, second);
  assert.ok(one[0] instanceof ReferenceClassData);
  assert.ok(two[0] instanceof ReferenceClassData);
  assert.notEqual(one[0], two[0]);
  assert.equal(a.getLoadedClass(name), one[0]);
  assert.equal(b.getLoadedClass(name), two[0]);
  assert.equal(one[0].isVerified(), false);
  assert.equal(two[0].isVerified(), false);
  violation(w.constraints.impose(name, a, b), name, one[0], two[0]);
  noReservations(a);
  noReservations(b);
});

test('delegated returns record the returned identity for each actual initiating loader', {timeout: 2000}, async () => {
  const w = world(), originA = w.custom().loader, originB = w.custom().loader;
  const first = w.publish('scope/Delegated', originA), second = w.publish('scope/Delegated', originB);
  const a = w.custom((thread, name, callback) => callback(null, {$cls: first}));
  const b = w.custom((thread, name, callback) => callback(null, {$cls: second}));
  const name = first.getInternalName();
  assert.equal(await loaded(a.loader, ownerThread(), name), first);
  assert.equal(await loaded(b.loader, ownerThread(), name), second);
  violation(w.constraints.impose(name, a.loader, b.loader), name, first, second);
  assert.equal(first.getLoader(), originA);
  assert.equal(second.getLoader(), originB);
  assert.deepEqual(a.requests, ['scope.Delegated']);
  assert.deepEqual(b.requests, ['scope.Delegated']);
});

test('a pre-existing constraint accepts shared delegation and repeated initiation without linking', {timeout: 2000}, async () => {
  const w = world(), origin = w.custom().loader, shared = w.publish('scope/Shared', origin);
  const a = w.custom((thread, name, callback) => callback(null, {$cls: shared}));
  const b = w.custom((thread, name, callback) => callback(null, {$cls: shared}));
  const name = shared.getInternalName();
  assert.equal(w.constraints.impose(name, a.loader, b.loader), null);
  for (const target of [a, b, a, b]) assert.equal(await loaded(target.loader, ownerThread(), name), shared);
  assert.equal(w.constraints.impose(name, b.loader, origin), null);
  assert.equal(shared.isVerified(), false);
  assert.deepEqual(a.requests, ['scope.Shared']);
  assert.deepEqual(b.requests, ['scope.Shared']);
  noReservations(a.loader);
  noReservations(b.loader);
});

for (const parsed of [false, true]) {
  test((parsed ? 'parsed' : 'named') + ' late definition fails before publication and permits corrected delegation',
    {timeout: 2000}, async () => {
      const w = world(), origin = w.custom().loader, accepted = w.publish('scope/Late', origin);
      const control = w.custom((thread, name, callback) => callback(null, {$cls: accepted}));
      const owner = ownerThread(), defined = [], name = accepted.getInternalName();
      const pending = delayedDefinition(control.loader, owner, 'scope/Late', defined, parsed);
      await settle(() => pending.ready, owner);
      assert.equal(control.loader.getLoadedClass(name), null);
      assert.equal(control.loader.getLoadedClass('[' + name), null);
      assert.deepEqual(defined, []);
      // Installing this edge after parsing must not treat the private candidate
      // as an already-published initiating identity.
      assert.equal(w.constraints.impose(name, origin, control.loader), null);
      pending.complete();
      await settle(() => defined.length === 1, owner);
      assert.deepEqual(defined, [null]);
      linkageError(owner);
      assert.equal(control.loader.getLoadedClass(name), null);
      assert.equal(control.loader.getLoadedClass('[' + name), null);
      assert.equal(origin.getLoadedClass(name), accepted);
      assert.equal(pending.candidate.isVerified(), false);
      noReservations(control.loader);

      const retry = ownerThread();
      assert.equal(await loaded(control.loader, retry, name), accepted);
      assert.deepEqual(retry.errors, []);
      assert.equal(control.loader.getLoadedClass(name), accepted);
      assert.notEqual(accepted, pending.candidate);
      noReservations(control.loader);
    });
}

test('a rejected delegated result leaves the defining loader untouched and does not poison retry', {timeout: 2000}, async () => {
  const w = world(), originA = w.custom().loader, originB = w.custom().loader;
  const accepted = w.publish('scope/Return', originA), other = w.publish('scope/Return', originB);
  let selected = other;
  const target = w.custom((thread, name, callback) => callback(null, {$cls: selected}));
  const name = accepted.getInternalName(), owner = ownerThread();
  assert.equal(w.constraints.impose(name, originA, target.loader), null);
  assert.equal(await loaded(target.loader, owner, name), null);
  linkageError(owner);
  assert.equal(target.loader.getLoadedClass(name), null);
  assert.equal(originA.getLoadedClass(name), accepted);
  assert.equal(originB.getLoadedClass(name), other);
  assert.equal(other.getLoader(), originB);
  noReservations(target.loader);

  selected = accepted;
  const retry = ownerThread();
  assert.equal(await loaded(target.loader, retry, name), accepted);
  assert.deepEqual(retry.errors, []);
  assert.equal(originB.getLoadedClass(name), other);
  violation(w.constraints.impose(name, target.loader, originB), name, accepted, other);
  noReservations(target.loader);
});

test('late publication failure fans out the original Throwable once per thread and releases nested load locks',
  {timeout: 2000}, async () => {
    const w = world(), origin = w.custom().loader, accepted = w.publish('scope/Fanout', origin);
    const owner = ownerThread(), waiter = ownerThread(), defined = [], outer = [], same = [], other = [], again = [];
    const name = accepted.getInternalName();
    let pending;
    const target = w.custom((thread, requested, callback, loader) => {
      // A failed define throws through the real enclosing metadata boundary.
      // On success only, the controlled Java loadClass would return its mirror.
      pending = delayedDefinition(loader, thread, 'scope/Fanout', defined, false, value => {
        if (value !== null) callback(null, {$cls: value});
      });
    });
    target.loader.loadClass(owner, name, value => outer.push(value), false);
    await settle(() => pending && pending.ready, owner);
    target.loader.loadClass(owner, name, value => same.push(value), false);
    target.loader.loadClass(waiter, name, value => other.push(value), true);
    target.loader.loadClass(waiter, name, value => again.push(value), false);
    assert.ok(target.loader.loadClassLocks.locks[name], 'the outer public load must hold its load lock');
    assert.equal(w.constraints.impose(name, origin, target.loader), null);
    pending.complete();
    await settle(() => outer.length && same.length && other.length && again.length, owner, waiter);
    assert.deepEqual(defined, [null]);
    for (const values of [outer, same, other, again]) assert.deepEqual(values, [null]);
    const failure = linkageError(owner);
    assert.equal(linkageError(waiter), failure);
    assert.deepEqual(owner.createdErrors, [failure]);
    assert.deepEqual(waiter.createdErrors, []);
    assert.equal(target.loader.getLoadedClass(name), null);
    assert.equal(origin.getLoadedClass(name), accepted);
    noReservations(target.loader);
  });

test('reference-array mirrors preserve the recorded component identities across all initiating views', {timeout: 2000}, async () => {
  const w = world(), originA = w.custom().loader, originB = w.custom().loader;
  const first = w.publish('scope/Element', originA), second = w.publish('scope/Element', originB);
  const a = w.custom((thread, name, callback) => callback(null, {$cls: first}));
  const b = w.custom((thread, name, callback) => callback(null, {$cls: second}));
  const name = first.getInternalName();
  assert.equal(await loaded(a.loader, ownerThread(), name), first);
  assert.equal(await loaded(b.loader, ownerThread(), name), second);
  for (const prefix of ['[', '[[']) {
    const arrayA = a.loader.getLoadedClass(prefix + name), arrayB = b.loader.getLoadedClass(prefix + name);
    assert.ok(arrayA instanceof ArrayClassData);
    assert.ok(arrayB instanceof ArrayClassData);
    assert.notEqual(arrayA, arrayB);
    assert.equal(arrayA.getLoader(), originA);
    assert.equal(arrayB.getLoader(), originB);
    assert.equal(arrayA, originA.getLoadedClass(prefix + name));
    assert.equal(arrayB, originB.getLoadedClass(prefix + name));
    arrayA.getComponentClass = () => assert.fail('Recording an array must not inspect its component');
    a.loader.addClass(prefix + name, arrayA);
    violation(w.constraints.impose(prefix + name, a.loader, b.loader), name, first, second);
  }
  assert.equal(a.loader.getLoadedClass(name), first);
  assert.equal(b.loader.getLoadedClass(name), second);
  assert.equal(first.isVerified(), false);
  assert.equal(second.isVerified(), false);
});

test('primitive and primitive-array publication never creates a reference-leaf identity', () => {
  const w = world(), a = w.custom().loader, b = w.custom().loader;
  const first = w.publish('scope/Token', a), second = w.publish('scope/Token', b);
  for (const name of ['I', 'J', 'V']) {
    const primitive = w.bootstrap.getPrimitiveClass(name);
    a.addClass(name, primitive);
    b.addClass(name, primitive);
    assert.equal(a.getLoadedClass(name), primitive);
    assert.equal(b.getLoadedClass(name), primitive);
    assert.equal(w.constraints.impose(name, a, b), null);
  }
  for (const name of ['[I', '[[I', '[J']) {
    const firstArray = a.getLoadedClass(name), secondArray = b.getLoadedClass(name);
    assert.ok(firstArray instanceof ArrayClassData);
    assert.equal(firstArray, secondArray);
    firstArray.getComponentClass = () => assert.fail('Recording a primitive array must not inspect its component');
    a.addClass(name, firstArray);
    b.addClass(name, secondArray);
    assert.equal(w.constraints.impose(name, a, b), null);
  }
  violation(w.constraints.impose(first.getInternalName(), a, b), first.getInternalName(), first, second);
  assert.equal(a.getLoadedClass(first.getInternalName()), first);
  assert.equal(b.getLoadedClass(second.getInternalName()), second);
});
