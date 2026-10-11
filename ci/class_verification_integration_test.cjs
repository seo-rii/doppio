'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods', 'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier',
  'BytecodeTypeVerifier', 'VerificationRelations', 'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters',
  'SymbolicResolution', 'ClassAccess', 'util']);
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(runtime, 'src', name + '.js');
  const loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id.startsWith('./') && sourceModules.has(id.slice(2)) ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData, ClassFileVersionError} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {ClassReference} = load('ConstantPool');
const {BytecodeStackFrame, NativeStackFrame, InternalStackFrame, JVMThread} = load('threading');
const {ClassState, ThreadStatus} = require(path.join(runtime, 'src/enums'));
// Source transpilation retains this const enum as a runtime object; ordinary
// release compilation inlines it, so both importer and enum source must agree.
const {NativeCallKind} = load('methods');
const {Flags} = require(path.join(runtime, 'src/util'));
const ClassLock = require(path.join(runtime, 'src/ClassLock')).default;

// These are integration units for the actual source-transpiled lifecycle and
// frame classes, not native-JVM or binary-parser evidence. A controlled gate
// supplies verification outcomes; separate adapter tests exercise real decoding
// and metadata obligations. Prototype metadata avoids synthesizing class files.
function controlledGate(ready = false) {
  return {
    verified: ready, ready, failed: false, calls: [], waiters: [],
    isVerified() { return this.verified; },
    tryToVerify() {
      this.calls.push('try');
      if (this.failed) return false;
      if (this.ready) this.verified = true;
      return this.verified;
    },
    verify(thread, callback) {
      this.calls.push(thread);
      if (this.verified) return callback(true);
      if (this.failed) {
        if (thread) thread.throwNewException('Ljava/lang/VerifyError;', 'controlled verification failure');
        return callback(false);
      }
      this.waiters.push({thread, callback});
    },
    complete(success) {
      this.verified = this.ready = success;
      this.failed = !success;
      for (const {thread, callback} of this.waiters.splice(0)) {
        if (!success && thread) thread.throwNewException('Ljava/lang/VerifyError;', 'controlled verification failure');
        callback(success);
      }
    }
  };
}
function classFixture(options = {}) {
  const cls = Object.create(ReferenceClassData.prototype), gate = controlledGate(options.verified || false);
  Object.assign(cls, {className: options.name || 'Lmeta/Fixture;', loader: {}, verification: gate,
    state: options.state === undefined ? ClassState.LOADED : options.state,
    superClass: null, superClassRef: null, interfaceRefs: [], interfaceClasses: [], accessFlags: new Flags(1),
    attrs: [], fields: [], methods: [], vmMethods: Object.create(null), vmOrigins: [], _vmTable: [], _uninheritedDefaultMethods: [],
    _fieldLookup: {}, _objectFields: [], _staticFields: [], initLock: new ClassLock(), _constructor: null});
  // Initializer execution is controlled, but real initialize/tryToInitialize,
  // hierarchy assembly, ClassLock and state queries remain in use.
  cls.getMethod = signature => cls.methods.find(method => method.signature === signature) || null;
  return {cls, gate};
}
function threadFixture() {
  const owner = Object.create(JVMThread.prototype);
  Object.assign(owner, {stack: [], status: ThreadStatus.RUNNABLE, errors: [], statuses: [], returns: [], jitDisabled: true});
  owner.setStatus = function(status) { this.status = status; this.statuses.push(status); };
  owner.getRef = () => 1;
  owner.throwNewException = function(name, message) { this.errors.push({name, message}); };
  owner.asyncReturn = function(...values) { this.returns.push(values); this.stack.pop(); };
  owner.handleUncaughtException = error => assert.fail(`Exception escaped the test boundary: ${error}`);
  return owner;
}
function bytecodeFixture(options = {}) {
  const {cls, gate} = classFixture(options), counters = {entries: 0, exits: 0, handlers: 0, jit: 0};
  const method = {
    cls, accessFlags: new Flags(0), codeBuffer: Buffer.from([0xb1]), maxStack: 2, numBBEntries: 1,
    name: 'body', signature: 'body()V', returnType: 'V', isSynchronized: !!options.synchronized,
    incrBBEntries() {}, getFullSignature: () => 'meta.Fixture.body()V',
    getCodeAttribute() { counters.handlers++; return {exceptionHandlers: options.handlers || []}; },
    methodLock: () => ({enter: () => { counters.entries++; return true; }, exit: () => { counters.exits++; return true; }}),
    getOp() { counters.jit++; return frame => { frame.returnToThreadLoop = true; }; }
  };
  const frame = new BytecodeStackFrame(method, []), thread = threadFixture();
  thread.stack.push(frame);
  return {cls, gate, counters, method, frame, thread};
}

test('raw hierarchy RESOLVED state does not mean verified, resolved, or initialized', () => {
  const {cls, gate} = classFixture({state: ClassState.RESOLVED});
  assert.equal(cls.isVerified(), false);
  assert.equal(cls.isResolved(), false);
  assert.equal(cls.isInitialized(null), false);
  assert.equal(cls.tryToResolve(), false);
  gate.ready = true;
  assert.equal(cls.tryToResolve(), true);
  assert.equal(cls.isResolved(), true);
  assert.equal(cls.isInitialized(null), false);
});

test('pending and failed verification cannot initialize a class with or without an initializer', () => {
  for (const failed of [false, true]) for (const hasInitializer of [false, true]) {
    const {cls, gate} = classFixture({state: ClassState.RESOLVED});
    gate.failed = failed;
    if (hasInitializer) cls.methods.push({cls, signature: '<clinit>()V'});
    cls.getConstructor = () => assert.fail('An unverified class created its constructor');
    assert.equal(cls.tryToInitialize(), false);
    assert.equal(cls.isInitialized(null), false);
    assert.equal(cls.state, ClassState.RESOLVED);
    const owner = threadFixture();
    let called = false;
    cls.initialize(owner, value => { assert.equal(value, null); called = true; });
    assert.equal(called, failed);
    if (!failed) gate.complete(false);
    assert.equal(called, true);
    assert.equal(owner.errors.at(-1).name, 'Ljava/lang/VerifyError;');
    assert.equal(cls.state, ClassState.RESOLVED);
    assert.equal(cls.initLock.getOwner(), null);
  }
});

test('asynchronous verification completes before constructor and initializer work starts', () => {
  const {cls, gate} = classFixture({state: ClassState.RESOLVED}), owner = threadFixture(), events = [];
  cls.getConstructor = () => {
    assert.equal(gate.verified, true);
    events.push('constructor');
    return {'<clinit>()V': (thread, args, callback) => {
      events.push('initializer');
      assert.equal(cls.isInitialized(owner), true, 'Initialization owner may re-enter after verification');
      callback();
    }};
  };
  cls.initialize(owner, value => { assert.equal(value, cls); events.push('complete'); });
  assert.deepEqual(events, []);
  gate.complete(true);
  assert.deepEqual(events, ['constructor', 'initializer', 'complete']);
  assert.equal(cls.state, ClassState.INITIALIZED);
  assert.equal(cls.isInitialized(null), true);
});

test('verified no-initializer classes retain the synchronous initialization fast path', () => {
  const {cls} = classFixture({verified: true, state: ClassState.RESOLVED});
  cls.getConstructor = () => assert.fail('Synchronous no-initializer path does not construct JS code');
  assert.equal(cls.tryToInitialize(), true);
  assert.equal(cls.isInitialized(null), true);
});

test('initialization owner re-entry still requires verification and never accepts ERRONEOUS state', () => {
  const {cls, gate} = classFixture({state: ClassState.RESOLVED}), owner = threadFixture(), outsider = threadFixture();
  cls.initLock.tryLock(owner, () => {});
  assert.equal(cls.isInitialized(owner), false);
  gate.complete(true);
  assert.equal(cls.tryToResolve(), true, 'An initialization owner must have completed preparation too');
  assert.equal(cls.isInitialized(owner), true);
  assert.equal(cls.isInitialized(outsider), false);
  cls.setState(ClassState.ERRONEOUS);
  assert.equal(cls.isInitialized(owner), false);
  assert.equal(cls.tryToInitialize(), false);
  assert.equal(cls.isResolved(), true, 'Initialization failure does not undo successful verification');
});

test('two asynchronous resolution callers assemble actual method/field tables only once', async () => {
  const parent = classFixture({name: 'Lmeta/Parent;', verified: true, state: ClassState.RESOLVED}).cls;
  const {cls, gate} = classFixture(), callbacks = [], results = [], first = threadFixture(), second = threadFixture();
  const parentMethod = {cls: parent, name: 'parent', signature: 'parent()V', rawDescriptor: '()V',
    accessFlags: new Flags(1), isStatic: false};
  parent.methods.push(parentMethod);
  parent.vmOrigins.push(parentMethod);
  assert.equal(parent.tryToResolve(), true);
  parent._objectFields.push({name: 'parentField', isStatic: false});
  cls.methods.push({cls, name: 'child', signature: 'child()V', rawDescriptor: '()V', accessFlags: new Flags(1), isStatic: false});
  cls.fields.push({name: 'childField', isStatic: false}, {name: 'staticField', isStatic: true});
  cls.superClassRef = new ClassReference(parent.getInternalName());
  cls.loader = {loadClass(thread, name, callback) {
    assert.equal(name, parent.getInternalName());
    callbacks.push(() => callback(parent));
  }};
  cls.resolve(first, value => results.push(value));
  cls.resolve(second, value => results.push(value));
  assert.equal(callbacks.length, 2);
  callbacks[0]();
  callbacks[1]();
  assert.deepEqual(results, []);
  assert.deepEqual(cls.getVMTable().map(method => method.name), ['parent', 'child']);
  assert.deepEqual(cls._objectFields.map(field => field.name), ['parentField', 'childField']);
  assert.equal(cls._staticFields.length, 1);
  gate.complete(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(results, [cls, cls]);
  assert.equal(cls.isResolved(), true);
});

test('pre-thread bootstrap resolution passes null through verification before constructing the thread', () => {
  const {cls, gate} = classFixture({name: 'Ljava/lang/Thread;'}), events = [];
  cls._constructConstructor = owner => { assert.equal(owner, null); events.push('constructor'); return function() {}; };
  cls.resolve(null, value => {
    assert.equal(value, cls);
    assert.equal(cls.isVerified(), true);
    cls.getConstructor(null);
    events.push('complete');
  });
  assert.deepEqual(gate.calls, [null]);
  assert.deepEqual(events, []);
  gate.complete(true);
  assert.deepEqual(events, ['constructor', 'complete']);
});

test('bytecode interpreter and synchronized monitor cannot start while verification is pending', () => {
  const w = bytecodeFixture({synchronized: true});
  w.frame.run(w.thread);
  assert.equal(w.thread.status, ThreadStatus.ASYNC_WAITING);
  assert.equal(w.frame.pc, 0);
  assert.equal(w.counters.entries, 0);
  assert.equal(w.counters.jit, 0);
  assert.deepEqual(w.thread.returns, []);
  w.gate.complete(true);
  assert.equal(w.thread.status, ThreadStatus.RUNNABLE);
  w.frame.run(w.thread);
  assert.equal(w.counters.entries, 1);
  assert.equal(w.thread.returns.length, 1);
});

test('compiled JIT lookup and code execution remain behind the same frame gate', () => {
  const w = bytecodeFixture();
  w.thread.jitDisabled = false;
  w.method.numBBEntries = 0;
  w.frame.run(w.thread);
  assert.equal(w.counters.jit, 0);
  w.gate.complete(true);
  w.frame.run(w.thread);
  assert.equal(w.counters.jit, 1);
});

test('native and bytecode-trap frames cannot invoke their native function before verification', () => {
  for (const success of [true, false]) {
    const {cls, gate} = classFixture(), owner = threadFixture();
    let calls = 0;
    const method = {cls, accessFlags: new Flags(0x0109), nativeCallKind: NativeCallKind.Static0,
      returnType: 'I', getNativeFunction: () => () => { calls++; return 42; },
      getFullSignature: () => 'meta.Fixture.native()I'};
    const frame = new NativeStackFrame(method, []);
    owner.stack.push(frame);
    frame.run(owner);
    assert.equal(calls, 0);
    assert.equal(owner.status, ThreadStatus.ASYNC_WAITING);
    gate.complete(success);
    if (success) {
      frame.run(owner);
      assert.equal(calls, 1);
      assert.deepEqual(owner.returns, [[42]]);
    } else {
      assert.equal(calls, 0);
      assert.deepEqual(owner.returns, []);
      assert.equal(owner.errors[0].name, 'Ljava/lang/VerifyError;');
    }
  }
});

test('an unverified bytecode frame cannot catch its own verification failure', () => {
  const w = bytecodeFixture({handlers: [{startPC: 0, endPC: 1, handlerPC: 0, catchType: '<any>'}]});
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/VerifyError;'})};
  let caught;
  const boundary = new InternalStackFrame(error => { caught = error; });
  w.thread.stack.unshift(boundary);
  w.thread.throwException(failure);
  assert.deepEqual(w.thread.stack, [boundary]);
  assert.equal(w.counters.handlers, 0);
  boundary.run(w.thread);
  assert.equal(caught, failure);
});

test('verification failure cannot exit a synchronized method monitor that was never entered', () => {
  const w = bytecodeFixture({synchronized: true});
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/VerifyError;'})};
  assert.equal(w.frame.scheduleException(w.thread, failure), false);
  assert.equal(w.counters.handlers, 0);
  assert.equal(w.counters.entries, 0);
  assert.equal(w.counters.exits, 0);
});

test('verified synchronized abrupt completion releases only an acquired monitor once', () => {
  const w = bytecodeFixture({verified: true, synchronized: true});
  assert.equal(w.cls.tryToResolve(), true);
  const failure = {getClass: () => ({getInternalName: () => 'Ljava/lang/RuntimeException;'})};
  assert.equal(w.frame.scheduleException(w.thread, failure), false);
  assert.equal(w.counters.exits, 0);
  w.frame.lockedMethodLock = true;
  assert.equal(w.frame.scheduleException(w.thread, failure), false);
  assert.equal(w.counters.exits, 1);
  assert.equal(w.frame.lockedMethodLock, false);
  assert.equal(w.frame.scheduleException(w.thread, failure), false);
  assert.equal(w.counters.exits, 1);
});

function sourceNativeRegistry(name, classExports = {}) {
  const Doppio = require(path.join(runtime, 'src/doppiojvm'));
  const filename = path.join(runtime, 'src/natives', name + '.js'), loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id === '../doppiojvm' ?
    {...Doppio, VM: {...Doppio.VM, ClassFile: {...Doppio.VM.ClassFile, ...load('ClassData'), ...classExports}}} :
    id.startsWith('../') && sourceModules.has(id.slice(3)) ? load(id.slice(3)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/natives', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports.default();
}

// Capture the actual native-registry implementation. Only the constructor it
// invokes is injected: parser classification and pending resolve outcomes are
// controlled here, not evidence from parsing or executing Java binary files.
function anonymousNative() {
  const state = {constructions: [], pending: [], mirror: {}, parseFailure: null, mirrorReads: 0};
  class ControlledAnonymousClass {
    constructor(...args) {
      state.constructions.push(args);
      if (state.parseFailure) throw state.parseFailure;
    }
    resolve(thread, callback, explicit) { state.pending.push({thread, callback, explicit}); }
    getClassObject() { state.mirrorReads++; return state.mirror; }
    initialize() { assert.fail('Anonymous definition must not initialize the class'); }
  }
  const registry = sourceNativeRegistry('sun_misc', {ReferenceClassData: ControlledAnonymousClass});
  return {state, define: registry['sun/misc/Unsafe']['defineAnonymousClass(Ljava/lang/Class;[B[Ljava/lang/Object;)Ljava/lang/Class;']};
}

test('anonymous native definition waits for asynchronous verification before exposing its mirror', () => {
  const {state, define} = anonymousNative(), owner = threadFixture(), loader = {}, protectionDomain = {}, patches = {};
  const host = {$cls: {getProtectionDomain: () => protectionDomain, getLoader: () => loader}};
  assert.equal(define(owner, null, host, {array: []}, patches), undefined);
  assert.equal(owner.status, ThreadStatus.ASYNC_WAITING);
  assert.equal(state.mirrorReads, 0);
  assert.equal(state.constructions[0][1], protectionDomain);
  assert.equal(state.constructions[0][2], loader);
  assert.equal(state.constructions[0][3], patches);
  assert.equal(state.pending[0].explicit, false);
  state.pending[0].callback({});
  assert.equal(state.mirrorReads, 1);
  assert.deepEqual(owner.returns, [[state.mirror]]);
});

test('anonymous native resolution failure never exposes a mirror or returns success', () => {
  const {state, define} = anonymousNative(), owner = threadFixture();
  define(owner, null, {$cls: {getProtectionDomain: () => null, getLoader: () => ({})}}, {array: []}, null);
  state.pending[0].callback(null);
  assert.equal(state.mirrorReads, 0);
  assert.deepEqual(owner.returns, []);
});

test('anonymous native null checks run before construction and parser failures retain Java taxonomy', () => {
  const {state, define} = anonymousNative(), host = {$cls: {getProtectionDomain: () => null, getLoader: () => ({})}};
  for (const [hostValue, dataValue] of [[null, {array: []}], [host, null]]) {
    const owner = threadFixture();
    define(owner, null, hostValue, dataValue, null);
    assert.equal(owner.errors[0].name, 'Ljava/lang/NullPointerException;');
  }
  assert.equal(state.constructions.length, 0);
  for (const [error, name] of [[new ClassFileVersionError('version'), 'Ljava/lang/UnsupportedClassVersionError;'],
    [new Error('format'), 'Ljava/lang/ClassFormatError;']]) {
    state.parseFailure = error;
    const owner = threadFixture();
    define(owner, null, host, {array: []}, null);
    assert.equal(owner.errors[0].name, name);
    assert.equal(owner.errors[0].message, error.message);
    assert.deepEqual(owner.returns, []);
  }
  assert.equal(state.pending.length, 0);
});

// A controlled verifier waiting for loader metadata models A -> load B ->
// define B extends A. The actual loader, hierarchy methods, ClassReference and
// native registry execute; no Java bytecode parsing or Java loader execution is
// claimed by these tests. Definition must break the cycle by building hierarchy
// metadata without recursively asking either verifier to complete.
function hierarchyWorld() {
  const loader = new ClassLoader(null);
  loader.bootstrap = loader;
  const parent = classFixture({name: 'Lmeta/Parent;', state: ClassState.RESOLVED});
  const child = classFixture({name: 'Lmeta/Child;'});
  parent.cls.loader = child.cls.loader = loader;
  loader.addClass(parent.cls.getInternalName(), parent.cls);
  child.cls.superClassRef = new ClassReference(parent.cls.getInternalName());
  const mirror = {$cls: child.cls};
  child.cls.getClassObject = () => mirror;
  loader.defineClass = (thread, name, bytes, protectionDomain, callback, prepare) => {
    assert.equal(name, child.cls.getInternalName());
    if (prepare) prepare(child.cls);
    child.cls.resolveHierarchy(thread, admitted => {
      if (admitted !== null) loader.addClass(name, child.cls);
      callback(admitted);
    }, false);
  };
  return {loader, parent, child, mirror};
}

test('hierarchy-only linking builds metadata without joining an in-flight parent verification', {timeout: 2000}, async () => {
  const w = hierarchyWorld(), owner = threadFixture();
  let parentComplete = false;
  w.parent.cls.resolve(owner, value => { assert.equal(value, w.parent.cls); parentComplete = true; });
  assert.equal(w.parent.gate.waiters.length, 1);
  const linked = await new Promise(resolve => w.child.cls.resolveHierarchy(owner, resolve, false));
  assert.equal(linked, w.child.cls);
  assert.equal(parentComplete, false);
  assert.equal(w.parent.gate.waiters.length, 1);
  assert.equal(w.child.gate.calls.length, 0);
  assert.equal(w.child.cls.isHierarchyResolved(), true);
  assert.equal(w.child.cls.isResolved(), false);
  assert.equal(w.child.cls.isVerified(), false);
  assert.equal(w.child.cls.isInitialized(owner), false);
  assert.equal(w.child.cls.getSuperClass(), w.parent.cls);
});

test('synchronous hierarchy linking does not imply synchronous verified linking', () => {
  const w = hierarchyWorld();
  assert.equal(w.child.cls.tryToResolveHierarchy(), true);
  assert.equal(w.child.gate.calls.length, 0);
  assert.equal(w.parent.gate.calls.length, 0);
  assert.equal(w.child.cls.isHierarchyResolved(), true);
  assert.equal(w.child.cls.tryToResolve(), false);
  assert.equal(w.parent.gate.calls.includes('try'), true);
  assert.equal(w.child.gate.calls.length, 0, 'A pending superclass prevents verified child linking');
});

test('full resolution after hierarchy-only definition waits for parent and then own verification', {timeout: 2000}, async () => {
  const w = hierarchyWorld(), owner = threadFixture();
  await new Promise(resolve => w.child.cls.resolveHierarchy(owner, resolve, false));
  let complete = false;
  const resolving = new Promise(resolve => w.child.cls.resolve(owner, value => { complete = true; resolve(value); }, false));
  assert.equal(complete, false);
  assert.equal(w.parent.gate.waiters.length, 1);
  assert.equal(w.child.gate.waiters.length, 0);
  w.parent.gate.complete(true);
  assert.equal(w.child.gate.waiters.length, 1);
  assert.equal(w.child.cls.isResolved(), false);
  w.child.gate.complete(true);
  assert.equal(await resolving, w.child.cls);
  assert.equal(w.child.cls.isResolved(), true);
  assert.equal(w.child.cls.isInitialized(owner), false);
});

test('a hierarchy-linked ClassReference is not cached as fully resolved until verification passes', {timeout: 2000}, async () => {
  const w = hierarchyWorld(), owner = threadFixture();
  loaderAddChild(w);
  await new Promise(resolve => w.child.cls.resolveHierarchy(owner, resolve, false));
  const reference = new ClassReference(w.child.cls.getInternalName());
  reference.cls = w.child.cls;
  assert.equal(reference.isResolved(), false);
  assert.equal(reference.tryResolve(w.loader), false);
  w.parent.gate.complete(true);
  w.child.gate.complete(true);
  assert.equal(reference.isResolved(), false, 'Verification alone is not full prepared linking');
  assert.equal(reference.tryResolve(w.loader), true);
  assert.equal(reference.isResolved(), true);
});

test('current-method class identity waits for verification instead of resolving a same-name loader class', () => {
  const current = classFixture({state: ClassState.RESOLVED}), owner = threadFixture(), results = [];
  const shadow = classFixture({state: ClassState.RESOLVED, verified: true});
  assert.equal(current.cls.getInternalName(), shadow.cls.getInternalName());
  const loader = {resolveClass() { assert.fail('Anonymous/current-method identity was replaced by a name lookup'); }};
  owner.currentMethod = () => ({cls: current.cls});
  const reference = new ClassReference(current.cls.getInternalName());
  reference.resolve(owner, loader, shadow.cls, success => results.push(success), false);
  assert.equal(reference.cls, current.cls);
  assert.notEqual(reference.cls, shadow.cls);
  assert.equal(reference.isResolved(), false);
  assert.deepEqual(results, []);
  assert.equal(current.gate.waiters.length, 1);
  assert.equal(current.gate.waiters[0].thread, owner);
  assert.deepEqual(shadow.gate.calls, []);
  current.gate.complete(true);
  assert.deepEqual(results, [true]);
  assert.equal(reference.isResolved(), true);
  assert.deepEqual(owner.errors, []);
});

test('current-method class verification failure never becomes resolved or authorizes a cached retry', () => {
  const current = classFixture({state: ClassState.RESOLVED}), owner = threadFixture(), results = [];
  const loader = {resolveClass() { assert.fail('Failed current-method identity was replaced by a name lookup'); }};
  owner.currentMethod = () => ({cls: current.cls});
  const reference = new ClassReference(current.cls.getInternalName());
  reference.resolve(owner, loader, current.cls, success => results.push(success), false);
  assert.deepEqual(results, []);
  current.gate.complete(false);
  assert.deepEqual(results, [false]);
  assert.equal(reference.cls, current.cls);
  assert.equal(reference.isResolved(), false);
  assert.equal(owner.errors[0].name, 'Ljava/lang/VerifyError;');
  reference.resolve(owner, loader, current.cls, success => results.push(success), false);
  assert.deepEqual(results, [false, false]);
  assert.equal(reference.isResolved(), false);
  assert.equal(owner.errors.length, 2, 'A later failed resolve must report the failure again');
  assert.equal(owner.errors[1].name, 'Ljava/lang/VerifyError;');
});

function loaderAddChild(w) { w.loader.addClass(w.child.cls.getInternalName(), w.child.cls); }

for (const variant of ['byte-array', 'heap-byte-buffer', 'unsafe']) {
  test(`ordinary ${variant} native definition returns hierarchy metadata while parent verification waits`, {timeout: 2000}, async () => {
    const w = hierarchyWorld(), owner = threadFixture(), name = {toString: () => 'meta.Child'};
    const loaderObject = {$loader: w.loader};
    owner.getBsCl = () => w.loader;
    w.parent.cls.resolve(owner, value => assert.equal(value, w.parent.cls));
    assert.equal(w.parent.gate.waiters.length, 1);
    let returnValue;
    const returned = new Promise(resolve => { owner.asyncReturn = value => { returnValue = value; resolve(value); }; });
    if (variant === 'unsafe') {
      const registry = sourceNativeRegistry('sun_misc');
      registry['sun/misc/Unsafe']['defineClass(Ljava/lang/String;[BIILjava/lang/ClassLoader;Ljava/security/ProtectionDomain;)Ljava/lang/Class;'](
        owner, null, name, {array: []}, 0, 0, loaderObject, null);
    } else {
      const registry = sourceNativeRegistry('java_lang')['java/lang/ClassLoader'];
      if (variant === 'byte-array') {
        registry['defineClass1(Ljava/lang/String;[BIILjava/security/ProtectionDomain;Ljava/lang/String;)Ljava/lang/Class;'](
          owner, loaderObject, name, {array: []}, 0, 0, null, null);
      } else {
        const buffer = {'java/nio/Buffer/limit': 0, 'java/nio/ByteBuffer/hb': {array: []}, 'java/nio/ByteBuffer/offset': 0};
        registry['defineClass2(Ljava/lang/String;Ljava/nio/ByteBuffer;IILjava/security/ProtectionDomain;Ljava/lang/String;)Ljava/lang/Class;'](
          owner, loaderObject, name, buffer, 0, 0, null, null);
      }
    }
    assert.equal(await returned, w.mirror);
    assert.equal(returnValue, w.mirror);
    assert.equal(w.parent.gate.waiters.length, 1);
    assert.equal(w.child.gate.calls.length, 0);
    assert.equal(w.child.cls.isHierarchyResolved(), true);
    assert.equal(w.child.cls.isResolved(), false);
    assert.equal(w.child.cls.isInitialized(owner), false);
  });
}

test('bootstrap class lookup returns hierarchy metadata without entering either verification gate', {timeout: 2000}, async () => {
  const w = hierarchyWorld(), owner = threadFixture();
  loaderAddChild(w);
  owner.getBsCl = () => w.loader;
  const returned = new Promise(resolve => { owner.asyncReturn = resolve; });
  const native = sourceNativeRegistry('java_lang')['java/lang/ClassLoader'];
  native['findBootstrapClass(Ljava/lang/String;)Ljava/lang/Class;'](owner, null, {toString: () => 'meta.Child'});
  assert.equal(await returned, w.mirror);
  assert.equal(w.parent.gate.calls.length, 0);
  assert.equal(w.child.gate.calls.length, 0);
  assert.equal(w.child.cls.isHierarchyResolved(), true);
  assert.equal(w.child.cls.isResolved(), false);
});

test('findLoadedClass observes loaded metadata without opportunistic verification', () => {
  const w = hierarchyWorld(), owner = threadFixture();
  loaderAddChild(w);
  const native = sourceNativeRegistry('java_lang')['java/lang/ClassLoader'];
  const result = native['findLoadedClass0(Ljava/lang/String;)Ljava/lang/Class;'](
    owner, {$loader: w.loader}, {toString: () => 'meta.Child'});
  assert.equal(result, w.mirror);
  assert.equal(w.parent.gate.calls.length, 0);
  assert.equal(w.child.gate.calls.length, 0);
  assert.equal(w.child.cls.isResolved(), false);
});

test('explicit native resolveClass still requires parent and child verification', {timeout: 2000}, async () => {
  const w = hierarchyWorld(), owner = threadFixture();
  await new Promise(resolve => w.child.cls.resolveHierarchy(owner, resolve, false));
  let completed = false;
  const returned = new Promise(resolve => { owner.asyncReturn = () => { completed = true; resolve(); }; });
  const native = sourceNativeRegistry('java_lang')['java/lang/ClassLoader'];
  native['resolveClass0(Ljava/lang/Class;)V'](owner, {$loader: w.loader}, w.mirror);
  assert.equal(completed, false);
  assert.equal(w.parent.gate.waiters.length, 1);
  assert.equal(w.child.gate.waiters.length, 0);
  w.parent.gate.complete(true);
  assert.equal(completed, false);
  assert.equal(w.child.gate.waiters.length, 1);
  w.child.gate.complete(true);
  await returned;
  assert.equal(w.child.cls.isResolved(), true);
});

test('native frame entry into a hierarchy-only class cannot execute before full verified linking', {timeout: 2000}, async () => {
  const w = hierarchyWorld(), owner = threadFixture();
  await new Promise(resolve => w.child.cls.resolveHierarchy(owner, resolve, false));
  let executed = false;
  const method = {cls: w.child.cls, accessFlags: new Flags(0x0109), nativeCallKind: NativeCallKind.Static0,
    returnType: 'V', getNativeFunction: () => () => { executed = true; },
    getFullSignature: () => 'meta.Child.body()V'};
  const frame = new NativeStackFrame(method, []);
  owner.stack.push(frame);
  frame.run(owner);
  assert.equal(executed, false);
  assert.equal(w.parent.gate.waiters.length, 1);
  w.parent.gate.complete(true);
  assert.equal(executed, false);
  assert.equal(w.child.gate.waiters.length, 1);
  w.child.gate.complete(true);
  assert.equal(executed, false);
  assert.equal(owner.status, ThreadStatus.RUNNABLE);
  frame.run(owner);
  assert.equal(executed, true);
});
