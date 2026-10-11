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
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {JVMThread, NativeStackFrame, BytecodeStackFrame} = load('threading');
const {NativeCallKind} = load('methods');
const {ThreadStatus, StackFrameType} = require(path.join(runtime, 'src/enums'));
const {Flags, getTypes} = require(path.join(runtime, 'src/util'));
const u2 = n => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(n); return bytes; };
const u4 = n => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(n); return bytes; };

// These small controlled binaries test parsed VM lifecycle and declaration
// identities. They are not javac output or native/browser conformance evidence.
function classBytes({name, parent = 'java/lang/Object', interfaces = [], flags = 0x21, methods = []}) {
  const pool = [], indexes = new Map();
  function utf(text) {
    const key = 'utf:' + text;
    if (!indexes.has(key)) {
      const bytes = Buffer.from(text);
      pool.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
      indexes.set(key, pool.length);
    }
    return indexes.get(key);
  }
  function cls(text) {
    const key = 'class:' + text;
    if (!indexes.has(key)) {
      const index = utf(text);
      pool.push(Buffer.concat([Buffer.from([7]), u2(index)]));
      indexes.set(key, pool.length);
    }
    return indexes.get(key);
  }
  const self = cls(name), superclass = parent === null ? 0 : cls(parent), ifaces = interfaces.map(cls);
  const declarations = methods.map(({name: methodName = 'take', descriptor = '(Lcontract/Token;)V', access = 1}) => {
    const nameIndex = utf(methodName), descriptorIndex = utf(descriptor);
    if ((access & 0x500) !== 0) return Buffer.concat([u2(access), u2(nameIndex), u2(descriptorIndex), u2(0)]);
    const result = descriptor.slice(descriptor.indexOf(')') + 1);
    const code = result === 'V' ? Buffer.from([0xb1]) : result === 'I' ? Buffer.from([3, 0xac]) : Buffer.from([1, 0xb0]);
    const locals = (access & 8 ? 0 : 1) + getTypes(descriptor).slice(0, -1)
      .reduce((count, type) => count + (type === 'J' || type === 'D' ? 2 : 1), 0);
    const body = Buffer.concat([u2(result === 'V' ? 0 : 1), u2(locals), u4(code.length), code, u2(0), u2(0)]);
    return Buffer.concat([u2(access), u2(nameIndex), u2(descriptorIndex), u2(1), u2(utf('Code')), u4(body.length), body]);
  });
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0]), u2(65), u2(pool.length + 1), ...pool,
    u2(flags), u2(self), u2(superclass), u2(ifaces.length), ...ifaces.map(u2), u2(0),
    u2(declarations.length), ...declarations, u2(0)]);
}
function world() {
  const bootstrap = new ClassLoader(null);
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  function loader() {
    const value = new ClassLoader(bootstrap);
    value.getLoaderObject = () => value;
    value.addClass('Ljava/lang/Object;', bootstrap.getLoadedClass('Ljava/lang/Object;'));
    value._loadClass = (thread, name, callback) => {
      const found = bootstrap.getLoadedClass(name);
      if (found === null) thread.throwNewException('Ljava/lang/NoClassDefFoundError;', name);
      else value.addClass(name, found);
      callback(found);
    };
    return value;
  }
  function define(spec, owner = bootstrap) {
    const value = new ReferenceClassData(classBytes(spec), null, owner);
    owner.addClass(value.getInternalName(), value);
    return value;
  }
  const object = define({name: 'java/lang/Object', parent: null});
  assert.equal(object.tryToResolve(), true);
  return {bootstrap, loader, define, object, constraints: load('LoadingConstraints').getLoadingConstraints(bootstrap)};
}
function hierarchy(w, descriptor = '(Lcontract/Token;)V', options = {}) {
  const a = w.loader(), b = w.loader(), c = options.sameChildInterfaceLoader ? b : w.loader();
  const tokenA = w.define({name: 'contract/Token'}, a);
  const tokenB = options.sharedParentToken ? tokenA : w.define({name: 'contract/Token'}, b);
  if (options.sharedParentToken) b.addClass(tokenA.getInternalName(), tokenA);
  const tokenC = c === b ? tokenB : w.define({name: 'contract/Token'}, c);
  const base = w.define({name: 'parents/Base', flags: options.abstractBase ? 0x421 : 0x21,
    methods: [{descriptor, access: options.abstractBase ? 0x401 : 1}]}, a);
  const role = w.define({name: 'roles/Role', flags: 0x601, methods: [{descriptor, access: 0x401}]}, b);
  const child = w.define({name: 'children/Child', parent: 'parents/Base', interfaces: ['roles/Role'], flags: 0x421,
    methods: options.override ? [{descriptor, access: options.overrideAccess === undefined ? 0x401 : options.overrideAccess}] : []}, c);
  child.getSuperClassReference().cls = base;
  child.getInterfaceClassReferences()[0].cls = role;
  return {a, b, c, tokenA, tokenB, tokenC, base, role, child};
}
function ownerThread() {
  const owner = Object.create(JVMThread.prototype);
  owner.status = ThreadStatus.ASYNC_WAITING;
  owner.errors = [];
  owner.allocations = 0;
  owner.setStatus = function(status) { this.status = status; };
  owner.throwNewException = function(name) {
    this.allocations++;
    this.throwException({getClass: () => ({getInternalName: () => name})});
  };
  owner.handleUncaughtException = () => assert.fail('Preparation failure escaped its caller');
  owner.stack = [{type: StackFrameType.NATIVE, scheduleException(thread, error) {
    thread.errors.push(error); return true;
  }}];
  return owner;
}
function drain(owner) {
  for (let i = 0; i < 100; i++) {
    const top = owner.stack.at(-1);
    if (owner.status !== ThreadStatus.RUNNABLE || !top || top.type !== StackFrameType.INTERNAL) return;
    top.run(owner);
  }
  assert.fail('Preparation boundary did not settle');
}
async function resolve(cls, owner) {
  let result;
  cls.resolve(owner, value => { result = value; }, false);
  for (let i = 0; i < 100 && result === undefined; i++) {
    drain(owner);
    await new Promise(next => setImmediate(next));
  }
  assert.notEqual(result, undefined, 'Full linking must complete its callback');
  return result;
}

test('hierarchy-only admission does not impose preparation constraints or inspect Token Code', () => {
  const w = world(), h = hierarchy(w, undefined, {override: true});
  for (const token of [h.tokenA, h.tokenB, h.tokenC]) {
    token.verification.tryToVerify = () => assert.fail('Token verification was triggered');
    token.tryToInitialize = () => assert.fail('Token initialization was triggered');
  }
  assert.equal(h.child.tryToResolveHierarchy(), true);
  assert.equal(h.child.isPrepared(), false);
  assert.equal(h.child.isVerified(), false);
  assert.equal(h.child.tryToResolve(), false, 'Explicit full linking rejects split descriptor identities');
  assert.equal(h.child.isVerified(), true, 'Preparation must remain distinct from bytecode verification');
  assert.equal(h.child.isResolved(), false);
});

for (const descriptor of ['(Lcontract/Token;)V', '([Lcontract/Token;)V', '([[Lcontract/Token;)V', '()Lcontract/Token;']) {
  test('inherited preparation constrains actual Base/Role owners for ' + descriptor, () => {
    const w = world(), h = hierarchy(w, descriptor, {sameChildInterfaceLoader: true});
    assert.equal(h.child.tryToResolveHierarchy(), true);
    assert.equal(h.child.tryToResolve(), false, 'Equal child and interface loaders do not erase the Base edge');
    assert.equal(h.child.isPrepared(), false);
  });
}

for (const abstractBase of [false, true]) {
  test('third child loader is not constrained for an inherited ' + (abstractBase ? 'abstract' : 'concrete') + ' Base method', () => {
    const w = world(), h = hierarchy(w, undefined, {sharedParentToken: true, abstractBase});
    assert.notEqual(h.tokenC, h.tokenA);
    assert.equal(h.child.tryToResolve(), true);
    assert.equal(h.child.isPrepared(), true);
    assert.equal(h.child.isResolved(), true);
    assert.equal(h.tokenA.isVerified(), false, 'Descriptor equality does not verify an element class');
    assert.equal(h.tokenC.isVerified(), false);
  });
}

test('a declared overriding method adds the child-loader edge even when Base/Role share Token', () => {
  const w = world(), h = hierarchy(w, undefined, {sharedParentToken: true, override: true});
  assert.equal(h.child.tryToResolve(), false);
  assert.equal(h.child.isPrepared(), false);
});

test('a selected abstract superclass method still imposes the inherited owner constraint under JVMS 5.4.2', () => {
  const w = world(), h = hierarchy(w, undefined, {abstractBase: true, sameChildInterfaceLoader: true});
  assert.equal(h.child.tryToResolveHierarchy(), true);
  const selected = h.child.selectMethod(h.role.getDeclaredMethod('take(Lcontract/Token;)V'));
  assert.equal(selected.kind, 'selected');
  assert.equal(selected.method.cls, h.base);
  assert.equal(selected.method.accessFlags.isAbstract(), true);
  assert.equal(h.child.tryToResolve(), false);
  assert.equal(h.child.isVerified(), true);
  assert.equal(h.child.isPrepared(), false);
});

test('failed preparation retains its first guest Throwable and does not retry descriptor imposition', async () => {
  const w = world(), h = hierarchy(w, undefined, {sameChildInterfaceLoader: true}), first = ownerThread();
  let imposed = 0;
  const original = w.constraints.imposeDescriptor.bind(w.constraints);
  w.constraints.imposeDescriptor = (...args) => { imposed++; return original(...args); };
  assert.equal(await resolve(h.child, first), null);
  assert.equal(first.errors.length, 1);
  assert.equal(first.errors[0].getClass().getInternalName(), 'Ljava/lang/LinkageError;');
  const count = imposed, second = ownerThread();
  assert.equal(h.child.tryToResolve(), false);
  assert.equal(await resolve(h.child, second), null);
  assert.equal(imposed, count);
  assert.equal(second.errors[0], first.errors[0]);
  assert.equal(second.allocations, 0);
  assert.equal(h.c.getLoadedClass(h.child.getInternalName()), h.child, 'Preparation failure never undoes derivation');
});

test('a synchronously discovered preparation failure materializes only one cached guest Throwable', async () => {
  const w = world(), h = hierarchy(w, undefined, {sameChildInterfaceLoader: true});
  assert.equal(h.child.tryToResolve(), false);
  let imposed = 0;
  const original = w.constraints.imposeDescriptor.bind(w.constraints);
  w.constraints.imposeDescriptor = (...args) => { imposed++; return original(...args); };
  const first = ownerThread(), second = ownerThread();
  assert.equal(await resolve(h.child, first), null);
  assert.equal(await resolve(h.child, second), null);
  assert.equal(imposed, 0);
  assert.equal(first.allocations, 1);
  assert.equal(second.allocations, 0);
  assert.equal(second.errors[0], first.errors[0]);
});

test('pending preparation-failure materialization fans out once per thread without repeating descriptor checks', async () => {
  const w = world(), h = hierarchy(w, undefined, {sameChildInterfaceLoader: true});
  const first = ownerThread(), second = ownerThread(), results = [], failure = {
    getClass: () => ({getInternalName: () => 'Ljava/lang/LinkageError;'})
  };
  let materialize, imposed = 0;
  const original = w.constraints.imposeDescriptor.bind(w.constraints);
  w.constraints.imposeDescriptor = (...args) => { imposed++; return original(...args); };
  first.throwNewException = function(name) {
    assert.equal(name, 'Ljava/lang/LinkageError;');
    this.allocations++;
    materialize = () => this.throwException(failure);
  };
  h.child.resolve(first, value => results.push(['first', value]), false);
  for (let i = 0; i < 100 && !materialize; i++) { drain(first); await new Promise(next => setImmediate(next)); }
  assert.equal(typeof materialize, 'function');
  const checked = imposed;
  h.child.resolve(second, value => results.push(['second', value]), false);
  h.child.resolve(second, value => results.push(['duplicate', value]), false);
  for (let i = 0; i < 5; i++) { drain(second); await new Promise(next => setImmediate(next)); }
  assert.deepEqual(results, []);
  assert.equal(imposed, checked);
  assert.equal(h.child.tryToResolve(), false);
  materialize();
  drain(first); drain(second);
  assert.deepEqual(results, [['first', null], ['second', null], ['duplicate', null]]);
  assert.deepEqual(first.errors, [failure]);
  assert.deepEqual(second.errors, [failure]);
  assert.equal(first.allocations, 1);
  assert.equal(second.allocations, 0);
  assert.equal(h.child.isResolved(), false);
});

for (const overrideAccess of [2, 9]) {
  test('a same-signature ' + (overrideAccess === 2 ? 'private' : 'static') + ' declaration does not add a child override constraint', () => {
    const w = world(), h = hierarchy(w, undefined, {sharedParentToken: true, override: true, overrideAccess});
    assert.equal(h.child.tryToResolve(), true);
    assert.equal(h.child.isPrepared(), true);
    assert.equal(h.child.selectMethod(h.role.getDeclaredMethod('take(Lcontract/Token;)V')).method.cls, h.base);
    assert.equal(h.tokenC.isVerified(), false);
  });
}

test('native entry waits for preparation even when verification already succeeded', () => {
  let calls = 0, complete;
  const cls = {isVerified: () => true, isResolved: () => false, resolve(thread, callback) { complete = callback; }};
  const method = {cls, accessFlags: new Flags(0x109), nativeCallKind: NativeCallKind.Static0,
    returnType: 'I', getNativeFunction: () => () => { calls++; return 42; },
    getFullSignature: () => 'contract.Child.body()I'};
  const owner = {status: ThreadStatus.RUNNABLE, setStatus(status) { this.status = status; },
    getStatus() { return this.status; }, currentMethod: () => null, asyncReturn() {}};
  new NativeStackFrame(method, []).run(owner);
  assert.equal(calls, 0);
  assert.equal(owner.status, ThreadStatus.ASYNC_WAITING);
  assert.equal(typeof complete, 'function');
  complete(null);
  assert.equal(calls, 0);
});

test('a verified but unprepared bytecode frame cannot catch its own linking failure', () => {
  let codeReads = 0;
  const cls = {isVerified: () => true, isResolved: () => false};
  const method = {cls, accessFlags: new Flags(0), codeBuffer: Buffer.from([0xb1]), maxStack: 1,
    incrBBEntries() {}, getFullSignature: () => 'contract.Child.body()V', getCodeAttribute() {
      codeReads++;
      return {exceptionHandlers: [{startPC: 0, endPC: 1, handlerPC: 0, catchType: '<any>'}]};
    }};
  const frame = new BytecodeStackFrame(method, []);
  assert.equal(frame.scheduleException({setStatus() {}}, {
    getClass: () => ({getInternalName: () => 'Ljava/lang/LinkageError;'})
  }), false);
  assert.equal(codeReads, 0);
});
