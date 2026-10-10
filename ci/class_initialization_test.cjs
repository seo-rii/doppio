'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {test: nodeTest} = require('node:test');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const {ReferenceClassData} = require(path.join(runtimeRoot, 'src/ClassData'));
const {ClassLoader} = require(path.join(runtimeRoot, 'src/ClassLoader'));
const {ClassState} = require(path.join(runtimeRoot, 'src/enums'));

const test = (name, body) => nodeTest(name, {timeout: 2000}, body);

// Parse small real class files into the compiled runtime. Only execution of
// <clinit> and the thread's exception sink are controlled by the test; method
// flags, hierarchy traversal, class states, and initialization locks are real.
function classBytes(name, superClass, interfaces, isInterface, methods) {
  const pool = [];
  const u2 = (value) => {
    const result = Buffer.alloc(2);
    result.writeUInt16BE(value);
    return result;
  };
  const u4 = (value) => {
    const result = Buffer.alloc(4);
    result.writeUInt32BE(value);
    return result;
  };
  const utf8 = (value) => {
    const bytes = Buffer.from(value);
    pool.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
    return pool.length;
  };
  const classIndex = (value) => {
    const nameIndex = utf8(value);
    pool.push(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
    return pool.length;
  };
  const thisIndex = classIndex(name);
  const superIndex = superClass === null ? 0 : classIndex(superClass.getInternalName().slice(1, -1));
  const interfaceIndices = interfaces.map((iface) => classIndex(iface.getInternalName().slice(1, -1)));
  const methodBytes = methods.map(({name: methodName, flags}) => {
    const nameIndex = utf8(methodName);
    const descriptorIndex = utf8('()V');
    const attributes = flags & 0x0400 ? [] : [Buffer.concat([
      u2(utf8('Code')), u4(13), u2(0), u2(flags & 0x0008 ? 0 : 1),
      u4(1), Buffer.from([0xb1]), u2(0), u2(0)
    ])];
    return Buffer.concat([u2(flags), u2(nameIndex), u2(descriptorIndex), u2(attributes.length), ...attributes]);
  });
  return Buffer.concat([
    u4(0xcafebabe), u2(0), u2(65), u2(pool.length + 1), ...pool,
    u2(isInterface ? 0x0601 : 0x0021), u2(thisIndex), u2(superIndex),
    u2(interfaceIndices.length), ...interfaceIndices.map(u2), u2(0),
    u2(methodBytes.length), ...methodBytes, u2(0)
  ]);
}

function world() {
  const events = [];
  const loader = new ClassLoader(null);
  let object;
  function define(name, options = {}) {
    const superclass = options.superclass === undefined ? object : options.superclass;
    const interfaces = options.interfaces || [];
    const methods = [...(options.methods || [])];
    if (options.clinit) methods.push({name: '<clinit>', flags: 0x0008});
    const cls = new ReferenceClassData(classBytes(name, superclass, interfaces, !!options.interface, methods), null, options.loader || loader);
    cls.setResolved(superclass, interfaces);
    const constructor = function() {};
    if (options.clinit) {
      constructor['<clinit>()V'] = (thread, args, callback) => {
        events.push(name);
        if (typeof options.clinit === 'function') options.clinit(thread, callback);
        else callback();
      };
    }
    cls.getConstructor = () => constructor;
    return cls;
  }
  // java.lang.Object in the runtime has a static initializer. Keeping that
  // declaration also exercises getMethod's inherited-vs-declared distinction.
  object = define('java/lang/Object', {superclass: null, clinit: true});
  object.setState(ClassState.INITIALIZED);
  const iface = (name, options = {}) => define(name, {interface: true, clinit: true, ...options});
  const defaultMethod = (name = 'method') => ({name, flags: 0x0001});
  return {define, iface, defaultMethod, object, events};
}

let threadRef = 0;
function thread() {
  const errors = [];
  const errorClass = {};
  function InitializerError() {
    this.kind = 'ExceptionInInitializerError';
  }
  InitializerError.prototype.getClass = () => ({isCastable: (target) => target === errorClass});
  InitializerError.prototype['<init>(Ljava/lang/Throwable;)V'] = function(owner, args, callback) {
    this.cause = args[0];
    callback();
  };
  const bootstrap = {
    getResolvedClass(name) {
      assert.equal(name, 'Ljava/lang/Error;');
      return errorClass;
    },
    initializeClass(owner, name, callback) {
      assert.equal(name, 'Ljava/lang/ExceptionInInitializerError;');
      callback({getConstructor: () => InitializerError});
    }
  };
  const ref = ++threadRef;
  return {
    errors,
    getRef: () => ref,
    getBsCl: () => bootstrap,
    throwException(error) { errors.push(error); },
    throwNewException(type, message) { errors.push({type, message}); },
    exception(kind = 'Error') {
      return {kind, getClass: () => ({isCastable: (target) => kind === 'Error' && target === errorClass})};
    }
  };
}

const initialize = (cls, owner) => new Promise((resolve) => cls.initialize(owner, resolve));

test('class initialization orders superclass and declared interface bodies parent-first, once per diamond', async () => {
  const {define, iface, defaultMethod, events} = world();
  const superDefault = iface('SuperDefault', {methods: [defaultMethod()]});
  const superclass = define('Superclass', {interfaces: [superDefault], clinit: true});
  const root = iface('Root', {methods: [defaultMethod()]});
  const left = iface('Left', {interfaces: [root], methods: [defaultMethod('left')]});
  const passive = iface('Passive', {interfaces: [left]});
  const right = iface('Right', {interfaces: [root], methods: [defaultMethod('right')]});
  const staticOnly = iface('StaticOnly', {methods: [{name: 'staticBody', flags: 0x0009}]});
  const abstractOnly = iface('AbstractOnly', {methods: [{name: 'abstractBody', flags: 0x0401}]});
  const cls = define('Implementation', {superclass, interfaces: [passive, right, staticOnly, abstractOnly], clinit: true});
  const owner = thread();
  assert.equal(await initialize(cls, owner), cls);
  assert.deepEqual(events, ['SuperDefault', 'Superclass', 'Root', 'Left', 'Right', 'Implementation']);
  assert.equal(passive.isInitialized(owner), false, 'inheriting a body does not count as declaring it');
  assert.equal(staticOnly.isInitialized(owner), false);
  assert.equal(abstractOnly.isInitialized(owner), false);
  assert.deepEqual(owner.errors, []);
});

test('private instance and synthetic bridge bodies qualify; private/static and abstract methods do not', async () => {
  const {define, iface, events} = world();
  const privateBody = iface('PrivateBody', {methods: [{name: 'privateBody', flags: 0x0002}]});
  const syntheticBody = iface('SyntheticBody', {methods: [{name: 'bridge', flags: 0x1041}]});
  const privateStatic = iface('PrivateStatic', {methods: [{name: 'privateStatic', flags: 0x000a}]});
  const abstractBody = iface('AbstractBody', {methods: [{name: 'abstractBody', flags: 0x0401}]});
  const cls = define('Implementation', {interfaces: [privateBody, syntheticBody, privateStatic, abstractBody], clinit: true});
  assert.equal(await initialize(cls, thread()), cls);
  assert.deepEqual(events, ['PrivateBody', 'SyntheticBody', 'Implementation']);
});

test('interfaces with the same binary name in different loaders remain distinct prerequisites', async () => {
  const {define, iface, defaultMethod, events} = world();
  const first = iface('Shared', {loader: new ClassLoader(null), methods: [defaultMethod('first')]});
  const second = iface('Shared', {loader: new ClassLoader(null), methods: [defaultMethod('second')]});
  const left = iface('Left', {interfaces: [first]});
  const right = iface('Right', {interfaces: [second]});
  const cls = define('Implementation', {interfaces: [left, right], clinit: true});
  assert.equal(await initialize(cls, thread()), cls);
  assert.deepEqual(events, ['Shared', 'Shared', 'Implementation']);
});

test('direct initialization of an interface skips both its superinterfaces and Object', async () => {
  const {iface, defaultMethod, object, events} = world();
  object.setState(ClassState.RESOLVED);
  const parent = iface('Parent', {methods: [defaultMethod()]});
  const child = iface('Child', {interfaces: [parent], methods: [defaultMethod('child')]});
  const owner = thread();
  assert.equal(await initialize(child, owner), child);
  assert.deepEqual(events, ['Child']);
  assert.equal(parent.isInitialized(owner), false);
  assert.equal(object.isInitialized(owner), false);
});

test('direct synchronous initialization of a no-clinit interface does not require or initialize parents', () => {
  const {iface, defaultMethod, object, events} = world();
  object.setState(ClassState.RESOLVED);
  const parent = iface('Parent', {methods: [defaultMethod()]});
  const child = iface('Child', {interfaces: [parent], clinit: false});
  assert.equal(child.tryToInitialize(), true);
  assert.equal(parent.isInitialized(thread()), false);
  assert.equal(object.isInitialized(thread()), false);
  assert.deepEqual(events, []);
});

test('an already initialized interface does not hide its uninitialized qualifying ancestors', async () => {
  const {define, iface, defaultMethod, events} = world();
  const parent = iface('Parent', {methods: [defaultMethod()]});
  const child = iface('Child', {interfaces: [parent], methods: [defaultMethod('child')]});
  const owner = thread();
  await initialize(child, owner);
  const cls = define('Implementation', {interfaces: [child], clinit: true});
  assert.equal(await initialize(cls, owner), cls);
  assert.deepEqual(events, ['Child', 'Parent', 'Implementation']);
});

test('a no-clinit implementing class is not promoted by state queries or the synchronous fast path', async () => {
  const {define, iface, defaultMethod, events} = world();
  const parent = iface('Parent', {methods: [defaultMethod()]});
  const cls = define('Implementation', {interfaces: [parent]});
  const owner = thread();
  assert.equal(cls.isResolved(), true);
  assert.equal(cls.isInitialized(owner), false);
  assert.equal(cls.tryToInitialize(), false);
  assert.deepEqual(events, []);
  assert.equal(await initialize(cls, owner), cls);
  assert.deepEqual(events, ['Parent']);
  assert.equal(cls.isInitialized(owner), true);
});

test('synchronous initialization traverses nondeclaring interfaces but leaves them uninitialized', () => {
  const {define, iface, defaultMethod, events} = world();
  const parent = iface('Parent', {clinit: false, methods: [defaultMethod()]});
  const passive = iface('Passive', {interfaces: [parent]});
  const cls = define('Implementation', {interfaces: [passive]});
  const owner = thread();
  assert.equal(cls.tryToInitialize(), true);
  assert.equal(parent.isInitialized(owner), true);
  assert.equal(passive.isInitialized(owner), false);
  assert.equal(cls.isInitialized(owner), true);
  assert.deepEqual(events, []);
});

test('pending prerequisite initialization preserves same-thread reentrancy and blocks all other fast paths', async () => {
  const {define, iface, defaultMethod, events} = world();
  let entered;
  const ready = new Promise((resolve) => { entered = resolve; });
  const parent = iface('Parent', {methods: [defaultMethod()], clinit(owner, callback) { entered(callback); }});
  const cls = define('Implementation', {interfaces: [parent]});
  const owner = thread();
  const other = thread();
  let ownerFinished = false;
  const first = initialize(cls, owner).then((value) => { ownerFinished = true; return value; });
  const finish = await ready;
  assert.equal(ownerFinished, false);
  assert.equal(cls.isInitialized(owner), true, 'initialization owner may recursively access the class');
  assert.equal(cls.isInitialized(other), false, 'state queries must not publish partial initialization');
  assert.equal(cls.isResolved(), true);
  assert.equal(cls.tryToInitialize(), false, 'threadless fast path must not bypass an owned initialization lock');
  assert.equal(await initialize(cls, owner), cls);
  let otherFinished = false;
  const second = initialize(cls, other).then((value) => { otherFinished = true; return value; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(otherFinished, false);
  finish();
  assert.equal(await first, cls);
  assert.equal(await second, cls);
  assert.equal(cls.isInitialized(other), true);
  assert.deepEqual(events, ['Parent']);
  assert.deepEqual(owner.errors, []);
  assert.deepEqual(other.errors, []);
});

test('an interface failure poisons a no-clinit implementation and stops subsequent initializers', async () => {
  const {define, iface, defaultMethod, events} = world();
  const owner = thread();
  const original = owner.exception();
  const broken = iface('Broken', {methods: [defaultMethod()], clinit(current, callback) { callback(original); }});
  const later = iface('Later', {methods: [defaultMethod('later')]});
  const cls = define('Implementation', {interfaces: [broken, later]});
  assert.equal(await initialize(cls, owner) === null, true, 'failed prerequisite must fail the implementing class');
  assert.deepEqual(owner.errors, [original]);
  assert.equal(cls.isInitialized(owner), false);
  assert.equal(cls.tryToInitialize(), false);
  assert.equal(later.isInitialized(owner), false);
  assert.equal(await initialize(cls, owner), null);
  assert.equal(owner.errors[1].type, 'Ljava/lang/NoClassDefFoundError;');
  assert.deepEqual(events, ['Broken']);
});

test('dependency RuntimeException is wrapped once, the same Error reaches the class owner, waiters receive NCDFE', async () => {
  const {define, iface, defaultMethod, events} = world();
  const owner = thread();
  const other = thread();
  const original = owner.exception('RuntimeException');
  let entered;
  const ready = new Promise((resolve) => { entered = resolve; });
  const broken = iface('Broken', {methods: [defaultMethod()], clinit(current, callback) { entered(callback); }});
  const cls = define('Implementation', {interfaces: [broken], clinit: true});
  const first = initialize(cls, owner);
  const finish = await ready;
  const second = initialize(cls, other);
  finish(original);
  assert.equal(await first, null);
  assert.equal(await second, null);
  assert.equal(owner.errors.length, 1);
  assert.equal(owner.errors[0].kind, 'ExceptionInInitializerError');
  assert.equal(owner.errors[0].cause, original);
  assert.equal(other.errors.length, 1);
  assert.equal(other.errors[0].type, 'Ljava/lang/NoClassDefFoundError;');
  assert.deepEqual(events, ['Broken']);
  assert.equal(cls.tryToInitialize(), false);
});

test('an erroneous class rejects its initialization owner even inside the failure completion callback', async () => {
  const {define, iface, defaultMethod, events} = world();
  const owner = thread();
  const original = owner.exception();
  const broken = iface('Broken', {methods: [defaultMethod()], clinit(current, callback) { callback(original); }});
  const cls = define('Implementation', {interfaces: [broken]});
  let initializedDuringFailure;
  let synchronousDuringFailure;
  let retry;
  const first = await new Promise((resolve) => cls.initialize(owner, (result) => {
    initializedDuringFailure = cls.isInitialized(owner);
    synchronousDuringFailure = cls.tryToInitialize();
    retry = initialize(cls, owner);
    resolve(result);
  }));
  assert.equal(first === null, true);
  assert.equal(initializedDuringFailure, false);
  assert.equal(synchronousDuringFailure, false);
  assert.equal(await retry === null, true);
  assert.equal(owner.errors.length, 2);
  assert.equal(owner.errors[0], original);
  assert.equal(owner.errors[1].type, 'Ljava/lang/NoClassDefFoundError;');
  assert.deepEqual(events, ['Broken']);
});

test('a failed superclass still prevents interface and class initializers', async () => {
  const {define, iface, defaultMethod, events} = world();
  const owner = thread();
  const original = owner.exception();
  const superclass = define('Superclass', {clinit(current, callback) { callback(original); }});
  const parent = iface('Parent', {methods: [defaultMethod()]});
  const cls = define('Implementation', {superclass, interfaces: [parent], clinit: true});
  assert.equal(await initialize(cls, owner), null);
  assert.deepEqual(owner.errors, [original]);
  assert.deepEqual(events, ['Superclass']);
  assert.equal(cls.tryToInitialize(), false);
});
