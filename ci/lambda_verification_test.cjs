'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['LambdaAdapters', 'GeneratedAdapters', 'ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations']);
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
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {BytecodeStackFrame, NativeStackFrame, InternalStackFrame} = load('threading');
const {ThreadStatus} = require(path.join(runtime, 'src/enums'));
const {decodeMethodCode} = load('BytecodeVerifier');
const {prepareLambdaAnonymousClass, installLambdaAdapters, getLambdaGenerationProvenance} = load('LambdaAdapters');

const factoryName = 'Ljava/lang/invoke/InnerClassLambdaMetafactory;';
const factoryPrefix = 'java/lang/invoke/InnerClassLambdaMetafactory/';
const validatingPrefix = 'java/lang/invoke/AbstractValidatingLambdaMetafactory/';
const hostName = 'Lprobe/Host;';
const lambdaName = 'Lprobe/Host$$Lambda$1;';
const u2 = number => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(number); return bytes; };
const u4 = number => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(number); return bytes; };

// Small class-file construction is deliberate: these units check the exact
// generated forwarding shape and VM boundary, not genuine-javac host evidence.
function classBytes({name, superclass = 'java/lang/Object', flags = 0x21, interfaces = [], fields = [], methods = []}) {
  const entries = [], indices = new Map();
  function entry(key, make) {
    if (indices.has(key)) return indices.get(key);
    const bytes = make(), index = entries.length + 1;
    entries.push(bytes);
    indices.set(key, index);
    return index;
  }
  const cp = {
    utf(text) { return entry('utf:' + text, () => Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(text)), Buffer.from(text)])); },
    cls(text) { return entry('class:' + text, () => Buffer.concat([Buffer.from([7]), u2(cp.utf(text))])); },
    nat(name, descriptor) { return entry('nat:' + name + descriptor, () => Buffer.concat([Buffer.from([12]), u2(cp.utf(name)), u2(cp.utf(descriptor))])); },
    method(owner, name, descriptor, isInterface = false) {
      return entry('method:' + owner + '.' + name + descriptor + isInterface,
        () => Buffer.concat([Buffer.from([isInterface ? 11 : 10]), u2(cp.cls(owner)), u2(cp.nat(name, descriptor))]));
    },
    field(owner, name, descriptor) {
      return entry('field:' + owner + '.' + name + descriptor,
        () => Buffer.concat([Buffer.from([9]), u2(cp.cls(owner)), u2(cp.nat(name, descriptor))]));
    }
  };
  const thisClass = cp.cls(name), superClass = superclass === null ? 0 : cp.cls(superclass);
  const interfaceIndices = interfaces.map(item => u2(cp.cls(item)));
  const fieldBytes = fields.map(field => Buffer.concat([u2(field.flags), u2(cp.utf(field.name)), u2(cp.utf(field.descriptor)), u2(0)]));
  const methodBytes = methods.map(method => {
    const nameIndex = cp.utf(method.name), descriptorIndex = cp.utf(method.descriptor);
    if (!method.code) return Buffer.concat([u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(0)]);
    const code = Buffer.from(method.code(cp));
    const payload = Buffer.concat([u2(method.stack), u2(method.locals), u4(code.length), code, u2(0), u2(0)]);
    return Buffer.concat([u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(1),
      u2(cp.utf('Code')), u4(payload.length), payload]);
  });
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 52]), u2(entries.length + 1), ...entries,
    u2(flags), u2(thisClass), u2(superClass), u2(interfaceIndices.length), ...interfaceIndices,
    u2(fieldBytes.length), ...fieldBytes, u2(methodBytes.length), ...methodBytes, u2(0)]);
}

function forwardingBytes({interfaceOwner = false, badReturn = false, extraSpecial = false} = {}) {
  return classBytes({name: lambdaName.slice(1, -1), flags: 0x1030, interfaces: ['probe/Function'],
    fields: [{flags: 0x12, name: 'arg$1', descriptor: hostName}],
    methods: [
      {flags: 2, name: '<init>', descriptor: '(' + hostName + ')V', stack: 2, locals: 2, code: cp => [
        0x2a, 0xb7, ...u2(cp.method('java/lang/Object', '<init>', '()V')),
        0x2a, 0x2b, 0xb5, ...u2(cp.field(lambdaName.slice(1, -1), 'arg$1', hostName)), 0xb1]},
      {flags: 1, name: 'apply', descriptor: '(JD)J', stack: 5, locals: 5, code: cp => [
        0x2a, 0xb4, ...u2(cp.field(lambdaName.slice(1, -1), 'arg$1', hostName)),
        0x1f, 0x29, 0xb7, ...u2(cp.method('probe/Host', 'target', '(JD)J', interfaceOwner)), badReturn ? 0xaf : 0xad]},
      ...(extraSpecial ? [{flags: 1, name: 'unrelated', descriptor: '(' + hostName + ')J', stack: 5, locals: 2, code: cp => [
        0x2b, 0x09, 0x0e, 0xb7, ...u2(cp.method('probe/Host', 'other', '(JD)J', interfaceOwner)), 0xad]}] : [])
    ]});
}

function world(options = {}) {
  const loader = new ClassLoader(null);
  loader.bootstrap = loader;
  const add = options => {
    const cls = new ReferenceClassData(classBytes(options), null, loader);
    loader.addClass(cls.getInternalName(), cls);
    return cls;
  };
  add({name: 'java/lang/Object', superclass: null, methods: [
    {flags: 1, name: '<init>', descriptor: '()V', stack: 0, locals: 1, code: () => [0xb1]}]});
  add({name: 'probe/Function', flags: 0x601, methods: [{flags: 0x401, name: 'apply', descriptor: '(JD)J'}]});
  const host = add({name: 'probe/Host', flags: options.interfaceOwner ? 0x601 : 0x21, methods: [
    {flags: options.targetFlags || 2, name: 'target', descriptor: '(JD)J', stack: 2, locals: 5, code: () => [0x1f, 0xad]},
    {flags: 2, name: 'other', descriptor: '(JD)J', stack: 2, locals: 5, code: () => [0x1f, 0xad]}]});
  const factoryClass = add({name: factoryName.slice(1, -1)});
  const factory = {getClass: () => factoryClass,
    [validatingPrefix + 'targetClass']: {$cls: host},
    [validatingPrefix + 'implKind']: 7,
    [validatingPrefix + 'implDefiningClass']: {$cls: host},
    [validatingPrefix + 'samMethodName']: 'apply',
    [factoryPrefix + 'implMethodClassName']: 'probe/Host',
    [factoryPrefix + 'implMethodName']: 'target',
    [factoryPrefix + 'implMethodDesc']: '(JD)J',
    [factoryPrefix + 'lambdaClassName']: lambdaName.slice(1, -1)};
  const factoryFrame = {method: {cls: factoryClass, signature: 'spinInnerClass()Ljava/lang/Class;'}, locals: [factory]};
  const nativeFrame = {method: {cls: {getInternalName: () => 'Lsun/misc/Unsafe;'},
    signature: 'defineAnonymousClass(Ljava/lang/Class;[B[Ljava/lang/Object;)Ljava/lang/Class;'}, locals: []};
  const thread = {stack: [], errors: [], returns: [], status: ThreadStatus.RUNNABLE, jitDisabled: true,
    getBsCl: () => loader, getStackTrace: () => [factoryFrame, nativeFrame],
    getStatus() { return this.status; }, setStatus(value) { this.status = value; },
    framePop() { this.stack.pop(); },
    throwNewException(name, message) { this.errors.push({name, message}); },
    throwException(error) { this.errors.push(error); }, asyncReturn(...values) { this.returns.push(values); }};
  return {loader, host, factoryClass, factory, factoryFrame, nativeFrame, thread, add,
    original: forwardingBytes(options)};
}

function parsed(w, bytes = w.original) { return new ReferenceClassData(bytes, null, w.loader); }
function method(cls, name) { return cls.getMethods().find(item => item.name === name); }
function decoded(cls, m) {
  return decodeMethodCode({className: cls.getInternalName(), superClassName: cls.getSuperClassReference().name,
    majorVersion: cls.majorVersion, name: m.name, descriptor: m.rawDescriptor,
    declaredAccessFlags: m.declaredAccessFlags, declaredCode: m.declaredCode, constantPool: cls.constantPool});
}
function prepare(w) { return prepareLambdaAnonymousClass(w.thread, {$cls: w.host}, w.original, null); }
function adapted(w) {
  const preparation = prepare(w);
  assert.ok(preparation, 'Trusted special-method lambda needs an explicit transformation');
  const cls = parsed(w, preparation.bytes);
  installLambdaAdapters(preparation, cls);
  return {cls, preparation};
}

test('original non-constructor invokespecial lambda is rejected by the ordinary full verifier', () => {
  const w = world(), cls = parsed(w);
  assert.equal(cls.tryToResolve(), false);
  assert.equal(cls.isVerified(), false);
  assert.equal(cls.verification.failure.javaClassName, 'Ljava/lang/VerifyError;');
  assert.match(cls.verification.failure.message, /invokespecial|assignable/);
});

test('typed static adapter passes ordinary verification and preserves source bytes and constructor Code', () => {
  const w = world(), untouched = Buffer.from(w.original), before = parsed(w);
  const {cls, preparation} = adapted(w);
  assert.deepEqual(w.original, untouched);
  assert.deepEqual(method(cls, '<init>').declaredCode.getCode(), method(before, '<init>').declaredCode.getCode());
  const invoke = decoded(cls, method(cls, 'apply')).instructions.find(item => item.opcode === 0xb8);
  assert.ok(invoke);
  const adapterRef = cls.constantPool.get(invoke.cpIndex);
  assert.equal(adapterRef.classInfo.name, lambdaName);
  assert.equal(adapterRef.nameAndTypeInfo.descriptor, '(' + hostName + 'JD)J');
  const bridge = cls.getMethods().find(item => item.signature === adapterRef.nameAndTypeInfo.name + adapterRef.nameAndTypeInfo.descriptor);
  assert.equal(bridge.declaredAccessFlags & 0x10a, 0x10a, 'private static native declaration');
  assert.equal(bridge.declaredCode, null);
  assert.equal(cls.tryToResolve(), true);
  assert.equal(cls.isVerified(), true);
  const provenance = getLambdaGenerationProvenance(cls);
  assert.deepEqual(provenance.originalBytes, untouched);
  assert.deepEqual(provenance.transformedBytes, preparation.bytes);
  assert.equal(provenance.edits.length, 1);
  assert.equal(provenance.edits[0].method, 'apply(JD)J');
  provenance.originalBytes.fill(0);
  assert.deepEqual(getLambdaGenerationProvenance(cls).originalBytes, untouched, 'provenance storage is not externally mutable');
});

test('private interface implementation uses the same typed adapter and passes verification', () => {
  const w = world({interfaceOwner: true}), {cls} = adapted(w);
  assert.equal(cls.tryToResolve(), true);
});

test('adapter dispatch retains the exact Method despite a same-signature subclass shadow', () => {
  for (const targetFlags of [1, 2]) {
  const w = world({targetFlags});
  const shadow = w.add({name: 'probe/Shadow', superclass: 'probe/Host', methods: [
    {flags: 1, name: 'target', descriptor: '(JD)J', stack: 2, locals: 5, code: () => [0x09, 0xad]}]});
  const {cls} = adapted(w);
  assert.equal(cls.tryToResolve(), true);
  const bridge = cls.getMethods().find(item => item.isNative);
  const target = method(w.host, 'target');
  const receiver = {getClass: () => shadow,
    'target(JD)J'() { assert.fail('A virtual shadow was invoked'); },
    'probe/Host/target(JD)J'() { assert.fail('Method identity must not depend on a receiver property'); }};
  const long = {wide: 'long'};
  bridge.getNativeFunction()(w.thread, receiver, long, 2.5);
  assert.equal(w.thread.stack.length, 2);
  assert.ok(w.thread.stack[0] instanceof InternalStackFrame);
  assert.ok(w.thread.stack[1] instanceof BytecodeStackFrame);
  assert.equal(w.thread.stack[1].method, target);
  assert.notEqual(w.thread.stack[1].method, method(shadow, 'target'));
  assert.deepEqual(w.thread.stack[1].locals, [receiver, long, null, 2.5, null]);
  }
});

test('adapter continuation preserves target Throwable identity', () => {
  const w = world(), {cls} = adapted(w), bridge = cls.getMethods().find(item => item.isNative);
  bridge.getNativeFunction()(w.thread, {}, {}, 2.5);
  w.thread.stack.pop();
  const continuation = w.thread.stack[0], failure = {identity: 'guest target Throwable'};
  continuation.scheduleException(w.thread, failure);
  continuation.run(w.thread);
  assert.deepEqual(w.thread.errors, [failure]);
  assert.equal(w.thread.errors[0], failure);
  assert.deepEqual(w.thread.returns, []);
  assert.equal(w.thread.stack.length, 0);
});

test('adapter continuation restores the category-two async return padding', () => {
  const w = world(), {cls} = adapted(w), bridge = cls.getMethods().find(item => item.isNative);
  const value = {identity: 'long return'};
  bridge.getNativeFunction()(w.thread, {}, value, 2.5);
  w.thread.stack.pop();
  const continuation = w.thread.stack[0];
  continuation.scheduleResume(w.thread, value);
  continuation.run(w.thread);
  assert.deepEqual(w.thread.errors, []);
  assert.deepEqual(w.thread.returns, [[value, null]]);
  assert.equal(w.thread.returns[0][0], value);
});

test('adapter target still enters the ordinary pre-execution verification gate', () => {
  const w = world(), {cls} = adapted(w), bridge = cls.getMethods().find(item => item.isNative);
  let requested = 0;
  w.host.isVerified = () => false;
  w.host.resolve = () => { requested++; };
  bridge.getNativeFunction()(w.thread, {}, {}, 2.5);
  const frame = w.thread.stack[1];
  frame.run(w.thread);
  assert.equal(requested, 1);
  assert.equal(w.thread.status, ThreadStatus.ASYNC_WAITING);
  assert.equal(frame.pc, 0);
  assert.deepEqual(w.thread.returns, []);
});

test('adapter rejects null receivers before scheduling the target', () => {
  const w = world(), {cls} = adapted(w), bridge = cls.getMethods().find(item => item.isNative);
  bridge.getNativeFunction()(w.thread, null, {}, 2.5);
  assert.equal(w.thread.errors[0].name, 'Ljava/lang/NullPointerException;');
  assert.equal(w.thread.stack.length, 0);
});

test('forged lambda names or same-named custom-loader factory frames cannot authorize adaptation', () => {
  for (const scenario of ['no-factory', 'different-loader', 'wrong-method', 'wrong-factory-object', 'wrong-host', 'wrong-class-name']) {
    const w = world();
    if (scenario === 'no-factory') w.thread.getStackTrace = () => [w.nativeFrame];
    if (scenario === 'different-loader') w.factoryFrame.method.cls = {getInternalName: () => factoryName};
    if (scenario === 'wrong-method') w.factoryFrame.method.signature = 'untrusted()Ljava/lang/Class;';
    if (scenario === 'wrong-factory-object') w.factory.getClass = () => ({getInternalName: () => factoryName});
    if (scenario === 'wrong-host') w.factory[validatingPrefix + 'targetClass'] = {$cls: {getInternalName: () => hostName}};
    if (scenario === 'wrong-class-name') w.factory[factoryPrefix + 'lambdaClassName'] = 'probe/Other$$Lambda$1';
    assert.equal(prepare(w), null, scenario);
    assert.equal(parsed(w).tryToResolve(), false, scenario + ' still goes through normal verification');
  }
});

test('non-special handles and anonymous definitions with CP patches are not adapted', () => {
  const w = world();
  for (const kind of [5, 6, 8, 9]) {
    w.factory[validatingPrefix + 'implKind'] = kind;
    assert.equal(prepare(w), null);
  }
  w.factory[validatingPrefix + 'implKind'] = 7;
  assert.equal(prepareLambdaAnonymousClass(w.thread, {$cls: w.host}, w.original, {array: []}), null);
});

test('unrelated invalid bytecode is still rejected after authorized adapter generation', () => {
  for (const options of [{badReturn: true}, {extraSpecial: true}]) {
    const w = world(options), {cls} = adapted(w);
    assert.equal(cls.tryToResolve(), false);
    assert.equal(cls.isVerified(), false);
    assert.equal(cls.verification.failure.javaClassName, 'Ljava/lang/VerifyError;');
  }
});

test('native body installation cannot turn an ordinary bytecode method into an unchecked native', () => {
  const w = world(), target = method(w.host, 'target');
  assert.throws(() => target.installNativeBody(() => {}), /native|declaration/i);
  assert.ok(target.declaredCode);
  assert.equal(target.isNative, false);
});
