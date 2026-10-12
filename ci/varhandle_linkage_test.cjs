'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods', 'opcodes', 'util',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier',
  'VerificationRelations', 'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters', 'SymbolicResolution',
  'ClassAccess', 'method_handles']);
const cache = new Map();
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache.has(name)) return cache.get(name).exports;
  const ts = require('typescript'), loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => {
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(name), id));
    return id.startsWith('.') && sourceModules.has(dependency) ? load(dependency) : original(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}

const {ReferenceClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {MethodReference} = load('ConstantPool');
const {Opcodes} = load('opcodes');
const {PreAllocatedStack} = load('threading');
const util = load('util');
const {OpCode, MethodHandleReferenceKind: Kind} = require(path.join(runtime, 'src/enums'));
const object = 'Ljava/lang/Object;', variable = 'Ljava/lang/invoke/VarHandle;';
const erased = '([Ljava/lang/Object;)';
const names = {mode: 'Ljava/lang/invoke/VarHandle$AccessMode;', helper: 'Ljava/lang/invoke/DoppioVarHandles;',
  handle: 'Ljava/lang/invoke/MethodHandle;', natives: 'Ljava/lang/invoke/MethodHandleNatives;', array: '[Ljava/lang/Object;'};
const signatures = {
  mode: 'java/lang/invoke/VarHandle$AccessMode/valueFromMethodName(Ljava/lang/String;)Ljava/lang/invoke/VarHandle$AccessMode;',
  factory: 'java/lang/invoke/DoppioVarHandles/invoker(Ljava/lang/invoke/VarHandle$AccessMode;Ljava/lang/invoke/MethodType;Z)Ljava/lang/invoke/MethodHandle;',
  linker: 'java/lang/invoke/MethodHandleNatives/linkMethod(Ljava/lang/Class;ILjava/lang/Class;Ljava/lang/String;Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/invoke/MemberName;'
};
const u2 = value => { const data = Buffer.alloc(2); data.writeUInt16BE(value); return data; };

// These deliberately constructed native declarations and mocked Java factory
// callbacks isolate actual parser/resolver/opcode invariants. They do not claim
// genuine javac, value-access, concurrent, JIT or native-JVM compatibility.
function metadata(name = 'java/lang/invoke/VarHandle', declarations = [
  {name: 'get', descriptor: erased + object}, {name: 'set', descriptor: erased + 'V'},
  {name: 'compareAndSet', descriptor: erased + 'Z'}]) {
  const entries = [];
  const utf = value => {
    entries.push(Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(value)), Buffer.from(value)]));
    return entries.length;
  };
  const cls = value => { const text = utf(value); entries.push(Buffer.concat([Buffer.from([7]), u2(text)])); return entries.length; };
  const self = cls(name), parent = cls('java/lang/Object');
  const methods = declarations.map(method => Buffer.concat([u2(method.flags ?? 0x0191),
    u2(utf(method.name)), u2(utf(method.descriptor)), u2(0)]));
  const bytes = Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0]), u2(65), u2(entries.length + 1), ...entries,
    u2(0x0421), u2(self), u2(parent), u2(0), u2(0), u2(methods.length), ...methods, u2(0)]);
  const loader = new ClassLoader(null), result = new ReferenceClassData(bytes, null, loader);
  // No hierarchy or executable body is needed for a declared-method unit.
  result.methodLookup = signature => result.getDeclaredMethod(signature);
  return result;
}

test('parsed Object/void/boolean VarHandle declarations satisfy the modern signature-polymorphic definition', () => {
  const cls = metadata();
  assert.deepEqual(cls.getMethods().map(method => [method.name, method.returnType, method.isSignaturePolymorphic()]),
    [['get', object, true], ['set', 'V', true], ['compareAndSet', 'Z', true]]);
  for (const method of cls.getMethods()) {
    assert.equal(method.declaredAccessFlags, 0x0191);
    assert.equal(method.declaredCode, null);
    assert.equal(method.getParamWordSize(), 1, 'Erased declaration retains one Object[] word; invocation separately adds its receiver');
  }
});

test('polymorphism requires the canonical owner, native/varargs declaration and exactly one Object[] parameter', () => {
  const cases = [
    ['examples/NativeVarargs', erased + object, 0x0191],
    ['java/lang/invoke/VarHandle', erased + object, 0x0111],
    ['java/lang/invoke/VarHandle', erased + object, 0x0481],
    ['java/lang/invoke/VarHandle', '([Ljava/lang/String;)V', 0x0191],
    ['java/lang/invoke/VarHandle', '([Ljava/lang/Object;I)V', 0x0191],
    ['java/lang/invoke/VarHandle', '()V', 0x0191]
  ];
  for (const [owner, descriptor, flags] of cases) {
    const method = metadata(owner, [{name: 'get', descriptor, flags}]).getMethods()[0];
    assert.equal(method.isSignaturePolymorphic(), false, owner + descriptor + ':' + flags);
  }
  assert.equal(metadata('java/lang/invoke/MethodHandle', [{name: 'invokeExact', descriptor: erased + object}])
    .getMethods()[0].isSignaturePolymorphic(), true, 'The existing MethodHandle declaration remains polymorphic');
});

test('VarHandle lookup retains each unique canonical erased declaration for arbitrary caller descriptors', () => {
  const cls = metadata();
  for (const [name, descriptor] of [['get', '(JD)J'], ['set', '([JIJ)V'], ['compareAndSet', '([JIJJ)Z']]) {
    const method = cls.getMethods().find(candidate => candidate.name === name);
    assert.equal(cls.signaturePolymorphicAwareMethodLookup(name + descriptor), method);
    assert.equal(cls.signaturePolymorphicAwareMethodLookup(method.signature), method);
    assert.equal(method.rawDescriptor, erased + (name === 'get' ? object : name === 'set' ? 'V' : 'Z'));
  }
  assert.equal(cls.signaturePolymorphicAwareMethodLookup('noSuchMode(I)I'), null);
});

test('VarHandle polymorphic fallback rejects ambiguous names, wrong declaration owners and metadata mismatches', () => {
  const overloaded = metadata('java/lang/invoke/VarHandle', [
    {name: 'get', descriptor: erased + object}, {name: 'get', descriptor: '(I)I', flags: 0x0111}]);
  assert.equal(overloaded.signaturePolymorphicAwareMethodLookup('get(J)J'), null);
  assert.equal(overloaded.signaturePolymorphicAwareMethodLookup('get(I)I'), overloaded.getMethods()[1]);
  const wrongOwner = metadata();
  wrongOwner.getMethods()[0].cls = metadata('examples/Other');
  assert.equal(wrongOwner.signaturePolymorphicAwareMethodLookup('get(J)J'), null);
  const wrongMetadata = metadata('java/lang/invoke/VarHandle', [{name: 'get', descriptor: erased + object, flags: 0x0111}]);
  assert.equal(wrongMetadata.signaturePolymorphicAwareMethodLookup('get(J)J'), null);
});

const linkageErrorClass = {getInternalName: () => 'Ljava/lang/LinkageError;', isSubclass(base) { return this === base; }};
const transientErrorClass = {getInternalName: () => 'Ljava/lang/OutOfMemoryError;', isSubclass: () => false};
const error = permanent => ({getClass: () => permanent ? linkageErrorClass : transientErrorClass});

function world({name = 'set', descriptor = '([JIJ)V', hold, failureStage, permanent = false} = {}) {
  const state = {types: [], initializations: [], modes: [], factories: [], links: [], executions: [], errors: [],
    statuses: [], pending: null, failOnce: failureStage, targetFailure: null};
  const owner = metadata(), method = owner.getMethods().find(candidate => candidate.name === name);
  const callerLoader = {label: 'caller-loader'}, callerClassObject = {label: 'caller-class'}, handleClassObject = {label: 'bootstrap-MH'};
  const caller = {getClassObject: () => callerClassObject, getInternalName: () => 'Lcallers/Example;', getLoader: () => callerLoader};
  const mode = {label: name}, invoker = {label: 'real-Java-invoker'}, appendixValue = {label: 'linker-appendix'};
  const failed = error(permanent), constructor = function CanonicalVarHandle() {};
  owner.getConstructor = () => constructor;
  const fail = (stage, callback) => {
    if (state.failOnce !== stage) return false;
    state.failOnce = null; callback(failed); return true;
  };
  const pause = (stage, callback) => { if (hold === stage) state.pending = callback; else callback(); };
  const linked = {vmtarget(thread, descriptor, args) {
    state.executions.push({thread, descriptor, args});
    if (state.targetFailure) thread.throwException(state.targetFailure);
  }};
  const constructors = {
    [names.mode]: {[signatures.mode](thread, args, callback) {
      state.modes.push(args);
      if (!fail('mode', callback)) callback(null, mode);
    }},
    [names.helper]: {[signatures.factory](thread, args, callback) {
      state.factories.push(args);
      if (!fail('factory', callback)) pause('factory', () => callback(null, invoker));
    }},
    [names.natives]: {[signatures.linker](thread, args, callback) {
      state.links.push(args);
      if (!fail('linker', callback)) pause('linker', () => { args[5].array[0] = appendixValue; callback(null, linked); });
    }},
    [names.array]: function ObjectArray(thread, length) { assert.equal(length, 1); this.array = [null]; }
  };
  const bootstrap = {
    initializeClass(thread, name, callback) {
      state.initializations.push(name);
      callback({getConstructor: () => constructors[name], getClassObject: () => handleClassObject});
    },
    getInitializedClass(thread, name) { return {getConstructor: () => constructors[name]}; },
    getLoadedClass(name) { return name === 'Ljava/lang/LinkageError;' ? linkageErrorClass : null; },
    getResolvedClass() { return null; }
  };
  callerLoader.bootstrap = bootstrap;
  const reference = new MethodReference({cls: owner, isResolved: () => true}, {name, descriptor});
  const thread = {
    boundary: null,
    getBsCl: () => bootstrap,
    getJVM: () => ({internString: value => value}),
    setStatus(status) { state.statuses.push(status); },
    throwNewException(name, message) { state.errors.push({name, message}); },
    throwException(value) {
      if (this.boundary) {
        const complete = this.boundary; this.boundary = null;
        setImmediate(() => complete(value));
      } else state.errors.push(value);
    },
    runWithExceptionBoundary(operation, callback) {
      assert.equal(this.boundary, null); this.boundary = callback;
      operation(value => { assert.equal(this.boundary, callback); this.boundary = null; callback(null, value); });
    }
  };
  const original = util.createMethodType;
  util.createMethodType = (actualThread, loader, actualDescriptor, callback) => {
    assert.equal(actualThread, thread); assert.equal(loader, callerLoader);
    const type = {descriptor: actualDescriptor, loader}; state.types.push(type);
    if (!fail(actualDescriptor === descriptor ? 'original-type' : 'linkage-type', callback)) callback(null, type);
  };
  function resolve() { return new Promise(done => reference.resolve(thread, callerLoader, caller, done)); }
  function frame(receiver = {label: 'VH'}, values = [{label: 'long[]'}, 0, {label: 'wide-long'}, null]) {
    const opStack = new PreAllocatedStack(16);
    opStack.push('prefix'); opStack.push(receiver);
    for (const value of values) opStack.push(value);
    return {pc: 0, method: {fullSignature: 'callers/Example/probe()V', cls: {constantPool: {get: () => reference, getUnchecked: () => reference}}},
      opStack, returnToThreadLoop: false};
  }
  return {state, reference, thread, owner, method, caller, callerLoader, callerClassObject, handleClassObject,
    mode, invoker, linked, appendixValue, constructor, failed, resolve, frame,
    restore() { util.createMethodType = original; }};
}

function unpublished(reference) {
  assert.equal(reference.method, null); assert.equal(reference.memberName, null);
  assert.equal(reference.appendix, null); assert.equal(reference.varHandleInvoker, null);
  assert.equal(reference.fullSignature, null); assert.equal(reference.jsConstructor, null);
  assert.equal(reference.isResolved(), false);
}

for (const [name, descriptor, words] of [['get', '(JD)J', 4], ['set', '([JIJ)V', 4], ['compareAndSet', '([JIJJ)Z', 6],
  ['get', erased + object, 1], ['set', erased + 'V', 1], ['compareAndSet', erased + 'Z', 1]]) {
  test('CP keeps original caller-loader slots and canonical declaration while linking a real MH bridge: ' + name + descriptor, async () => {
    const w = world({name, descriptor});
    try {
      assert.equal(await w.resolve(), true);
      const r = w.reference;
      assert.deepEqual(w.state.types.map(type => [type.descriptor, type.loader]),
        [[descriptor, w.callerLoader], ['(' + variable + descriptor.slice(1), w.callerLoader]]);
      assert.deepEqual(w.state.modes, [[name]]);
      assert.deepEqual(w.state.factories, [[w.mode, w.state.types[0], 0]]);
      const link = w.state.links[0];
      assert.deepEqual(link.slice(0, 5), [w.callerClassObject, Kind.INVOKEVIRTUAL, w.handleClassObject, 'invokeExact', w.state.types[1]]);
      assert.equal(r.nameAndTypeInfo.descriptor, descriptor); assert.equal(r.paramWordSize, words);
      assert.equal(r.method, w.method); assert.equal(r.method.cls, w.owner);
      assert.equal(r.fullSignature, w.method.fullSignature); assert.equal(r.jsConstructor, w.constructor);
      assert.equal(r.varHandleInvoker, w.invoker); assert.equal(r.memberName, w.linked); assert.equal(r.appendix, w.appendixValue);
      assert.equal(await w.resolve(), true); assert.equal(w.state.factories.length, 1); assert.equal(w.state.links.length, 1);
    } finally { w.restore(); }
  });
}

for (const hold of ['factory', 'linker']) {
  test('in-flight ' + hold + ' work publishes no partial CP cache and serves duplicate waiters once', async () => {
    const w = world({hold});
    try {
      const first = w.resolve(), second = w.resolve();
      unpublished(w.reference);
      assert.equal(w.state.factories.length, 1); assert.equal(typeof w.state.pending, 'function');
      w.state.pending();
      assert.deepEqual(await Promise.all([first, second]), [true, true]);
      assert.equal(w.state.factories.length, 1); assert.equal(w.state.links.length, 1);
    } finally { w.restore(); }
  });
}

for (const failureStage of ['original-type', 'mode', 'factory', 'linkage-type', 'linker']) {
  test('original transient ' + failureStage + ' error survives without NSME replacement or partial publication', async () => {
    const w = world({failureStage});
    try {
      assert.equal(await w.resolve(), false); unpublished(w.reference);
      assert.deepEqual(w.state.errors, [w.failed]);
      assert.equal(await w.resolve(), true, 'A non-LinkageError permits a new CP resolution attempt');
      assert.equal(w.reference.method, w.method);
    } finally { w.restore(); }
  });
}

test('original permanent linker failure is retained unchanged and never rebuilds or publishes a bridge', async () => {
  const w = world({failureStage: 'linker', permanent: true});
  try {
    assert.equal(await w.resolve(), false); unpublished(w.reference);
    assert.equal(await w.resolve(), false); unpublished(w.reference);
    assert.deepEqual(w.state.errors, [w.failed, w.failed]);
    assert.equal(w.state.factories.length, 1); assert.equal(w.state.links.length, 1);
  } finally { w.restore(); }
});

test('VarHandle invokevirtual routes to the existing invokehandle opcode and preserves original padding plus appendix', async () => {
  const w = world();
  try {
    assert.equal(await w.resolve(), true);
    w.reference.hasAccess = () => true;
    const frame = w.frame(), original = frame.opStack.getRaw(), code = Buffer.from([OpCode.INVOKEVIRTUAL, 0, 1]);
    Opcodes.invokevirtual(w.thread, frame, code);
    assert.equal(code[0], OpCode.INVOKEHANDLE); assert.deepEqual(frame.opStack.getRaw(), original);
    Opcodes.invokehandle(w.thread, frame, code);
    assert.deepEqual(frame.opStack.getRaw(), ['prefix']); assert.equal(frame.returnToThreadLoop, true);
    assert.deepEqual(w.state.executions[0].args, [w.invoker, ...original.slice(1), w.appendixValue]);
    assert.equal(w.state.executions[0].descriptor, null);
    assert.equal(w.reference.paramWordSize, 4); assert.equal(w.reference.nameAndTypeInfo.descriptor, '([JIJ)V');
  } finally { w.restore(); }
});

test('null VarHandle throws before reading/prepending the invoker or consuming any original slots', async () => {
  const w = world();
  try {
    assert.equal(await w.resolve(), true);
    Object.defineProperty(w.reference, 'varHandleInvoker', {get() { assert.fail('Null receiver must precede invocation adaptation'); }});
    const frame = w.frame(null), original = frame.opStack.getRaw();
    Opcodes.invokehandle(w.thread, frame, Buffer.from([OpCode.INVOKEHANDLE, 0, 1]));
    assert.deepEqual(frame.opStack.getRaw(), original); assert.equal(frame.returnToThreadLoop, true);
    assert.equal(w.state.executions.length, 0);
    assert.deepEqual(w.state.errors.map(error => error.name), ['Ljava/lang/NullPointerException;']);
  } finally { w.restore(); }
});

test('receiver-dependent invocation errors leave a successfully linked CP reference reusable', async () => {
  const w = world();
  try {
    assert.equal(await w.resolve(), true);
    const original = {label: 'WrongMethodTypeException'}, code = Buffer.from([OpCode.INVOKEHANDLE, 0, 1]);
    w.state.targetFailure = original;
    Opcodes.invokehandle(w.thread, w.frame(), code);
    assert.deepEqual(w.state.errors, [original]); assert.equal(w.reference.isResolved(), true);
    w.state.targetFailure = null;
    Opcodes.invokehandle(w.thread, w.frame({label: 'another-VH'}), code);
    assert.equal(w.state.executions.length, 2); assert.equal(w.state.factories.length, 1); assert.equal(w.state.links.length, 1);
    assert.equal(await w.resolve(), true); assert.equal(w.reference.method, w.method);
  } finally { w.restore(); }
});

test('ordinary MethodHandle invokehandle retains its original receiver, wide words and appendix', () => {
  const receiver = {label: 'MH'}, wide = {label: 'long'}, appendix = {label: 'appendix'}, calls = [];
  const opStack = new PreAllocatedStack(10);
  for (const value of ['prefix', receiver, wide, null, -0.0, null]) opStack.push(value);
  const reference = {paramWordSize: 4, appendix, signature: 'invokeExact(JD)J',
    memberName: {vmtarget(thread, descriptor, args) { calls.push({thread, descriptor, args}); }}};
  const frame = {pc: 0, method: {fullSignature: 'callers/MH/probe()V', cls: {constantPool: {getUnchecked: () => reference}}},
    opStack, returnToThreadLoop: false};
  const thread = {throwNewException() { assert.fail('Non-null MethodHandle must not throw'); }};
  Opcodes.invokehandle(thread, frame, Buffer.from([OpCode.INVOKEHANDLE, 0, 1]));
  assert.deepEqual(calls, [{thread, descriptor: null, args: [receiver, wide, null, -0.0, null, appendix]}]);
  assert.deepEqual(opStack.getRaw(), ['prefix']); assert.equal(frame.returnToThreadLoop, true);
});
