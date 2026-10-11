'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ReflectionAdapters', 'GeneratedAdapters', 'ClassData', 'ClassLoader', 'ConstantPool',
  'threading', 'methods', 'ClassVerification', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations']);
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
const {BytecodeStackFrame, InternalStackFrame} = load('threading');
const {ThreadStatus} = require(path.join(runtime, 'src/enums'));
const {decodeMethodCode} = load('BytecodeVerifier');
const {prepareReflectionClass, installReflectionAdapters, getReflectionGenerationProvenance} = load('ReflectionAdapters');
const generatorName = 'Lsun/reflect/MethodAccessorGenerator;', actionName = 'Lsun/reflect/MethodAccessorGenerator$1;';
const generatorPrefix = 'sun/reflect/MethodAccessorGenerator/', actionPrefix = 'sun/reflect/MethodAccessorGenerator$1/';
const commonPrefix = 'sun/reflect/AccessorGenerator/';
const generateSignature = 'generate(Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;IZZLjava/lang/Class;)Lsun/reflect/MagicAccessorImpl;';
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// Controlled class-file shapes model the pinned reflection generator. They test
// admission and ordinary verification, not genuine-javac/native host evidence.
function classBytes({name, superclass = 'java/lang/Object', flags = 0x21, major = 49, methods = []}) {
  const entries = [], indices = new Map();
  function entry(key, make) {
    if (indices.has(key)) return indices.get(key);
    const bytes = make(), index = entries.length + 1;
    entries.push(bytes); indices.set(key, index); return index;
  }
  const cp = {
    utf(text) { return entry('u:' + text, () => Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(text)), Buffer.from(text)])); },
    cls(text) { return entry('c:' + text, () => Buffer.concat([Buffer.from([7]), u2(cp.utf(text))])); },
    nat(name, descriptor) { return entry('n:' + name + descriptor, () => Buffer.concat([Buffer.from([12]), u2(cp.utf(name)), u2(cp.utf(descriptor))])); },
    method(owner, name, descriptor) { return entry('m:' + owner + '.' + name + descriptor,
      () => Buffer.concat([Buffer.from([10]), u2(cp.cls(owner)), u2(cp.nat(name, descriptor))])); }
  };
  const thisClass = cp.cls(name), superClass = superclass === null ? 0 : cp.cls(superclass);
  const methodBytes = methods.map(method => {
    const nameIndex = cp.utf(method.name), descriptorIndex = cp.utf(method.descriptor);
    if (!method.code) return Buffer.concat([u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(0)]);
    const code = Buffer.from(method.code(cp));
    const handlers = (method.handlers || []).map(([start, end, target, catchType]) =>
      Buffer.concat([u2(start), u2(end), u2(target), u2(cp.cls(catchType))]));
    const payload = Buffer.concat([u2(method.stack), u2(method.locals), u4(code.length), code,
      u2(handlers.length), ...handlers, u2(0)]);
    return Buffer.concat([u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(1),
      u2(cp.utf('Code')), u4(payload.length), payload]);
  });
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0]), u2(major), u2(entries.length + 1), ...entries,
    u2(flags), u2(thisClass), u2(superClass), u2(0), u2(0), u2(methodBytes.length), ...methodBytes, u2(0)]);
}
function constructor(superclass = 'java/lang/Object', descriptor = '()V') {
  return {flags: 1, name: '<init>', descriptor, stack: 1, locals: descriptor === '()V' ? 1 : 2,
    code: cp => [0x2a, 0xb7, ...u2(cp.method(superclass, '<init>', '()V')), 0xb1]};
}
function accessorBytes(serialization, options = {}) {
  const refs = {}, superclass = 'sun/reflect/' + (serialization ? 'SerializationConstructorAccessorImpl' : 'ConstructorAccessorImpl');
  const name = 'sun/reflect/' + (serialization ? 'GeneratedSerializationConstructorAccessor1' : 'GeneratedConstructorAccessor1');
  const bytes = classBytes({name, superclass, flags: 1, major: options.major || 49, methods: [constructor(superclass),
    {flags: 1, name: 'newInstance', descriptor: '([Ljava/lang/Object;)Ljava/lang/Object;', stack: 3, locals: 2,
      code: cp => {
        refs.allocate = cp.cls('probe/Child');
        refs.target = cp.method(serialization ? 'probe/Parent' : 'probe/Child', '<init>', '()V');
        refs.helper = cp.method('java/lang/Object', options.wrongHelper ? 'hashCode' : 'toString',
          options.wrongHelper ? '()I' : '()Ljava/lang/String;');
        return [0xbb, ...u2(refs.allocate), options.noDup ? 0x00 : 0x59, 0x2b, 0x57,
          0xb7, ...u2(refs.target), options.badReturn ? 0xac : 0xb0,
          0xb7, ...u2(refs.helper),
          0xbb, ...u2(cp.cls('java/lang/IllegalArgumentException')), 0x5a, 0x5f,
          0xb7, ...u2(cp.method('java/lang/IllegalArgumentException', '<init>', '(Ljava/lang/String;)V')), 0xbf,
          0xbb, ...u2(cp.cls('java/lang/reflect/InvocationTargetException')), 0x5a, 0x5f,
          0xb7, ...u2(cp.method('java/lang/reflect/InvocationTargetException', '<init>', '(Ljava/lang/Throwable;)V')), 0xbf];
      }, handlers: options.noHandlers ? [] : [[0, 6, 10, 'java/lang/ClassCastException'],
        [0, 6, 10, 'java/lang/NullPointerException'], [6, 9, 22, 'java/lang/Throwable']]}]});
  return {bytes, refs, name: 'L' + name + ';'};
}

function world(serialization = false, options = {}) {
  const bootstrap = new ClassLoader(null);
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  const add = spec => {
    const cls = new ReferenceClassData(classBytes(spec), null, bootstrap);
    bootstrap.addClass(cls.getInternalName(), cls);
    return cls;
  };
  const objectClass = add({name: 'java/lang/Object', superclass: null, methods: [
    {flags: 1, name: '<init>', descriptor: '()V', stack: 0, locals: 1, code: () => [0xb1]},
    {flags: 1, name: 'toString', descriptor: '()Ljava/lang/String;', stack: 1, locals: 1, code: () => [0x01, 0xb0]}]});
  add({name: 'java/lang/String', methods: [constructor()]});
  add({name: 'java/lang/Throwable', methods: [constructor()]});
  for (const name of ['java/lang/ClassCastException', 'java/lang/NullPointerException']) {
    add({name, superclass: 'java/lang/Throwable', methods: [constructor('java/lang/Throwable')]});
  }
  add({name: 'java/lang/IllegalArgumentException', superclass: 'java/lang/Throwable',
    methods: [constructor('java/lang/Throwable', '(Ljava/lang/String;)V')]});
  add({name: 'java/lang/reflect/InvocationTargetException', superclass: 'java/lang/Throwable',
    methods: [constructor('java/lang/Throwable', '(Ljava/lang/Throwable;)V')]});
  for (const name of ['ConstructorAccessorImpl', 'SerializationConstructorAccessorImpl']) {
    add({name: 'sun/reflect/' + name, methods: [constructor()]});
  }
  const parent = add({name: 'probe/Parent', methods: [constructor()]}),
    child = add({name: 'probe/Child', superclass: 'probe/Parent', methods: [constructor('probe/Parent')]});
  assert.equal(child.tryToResolve(), true);
  const generatorClass = add({name: generatorName.slice(1, -1)}), actionClass = add({name: actionName.slice(1, -1)}),
    definerClass = add({name: 'sun/reflect/ClassDefiner'}), delegatingClass = add({name: 'sun/reflect/DelegatingClassLoader'});
  const loaderObject = {getClass: () => delegatingClass, 'java/lang/ClassLoader/parent': null};
  const loader = new ClassLoader(bootstrap), ownLoaded = loader.getLoadedClass.bind(loader);
  loader.getLoaderObject = () => loaderObject;
  loader.getLoadedClass = name => ownLoaded(name) || bootstrap.getLoadedClass(name);
  const generated = accessorBytes(serialization, options), sourceBytes = {array: Array.from(generated.bytes)},
    generatedName = {toString: () => generated.name.slice(1, -1)}, declaringMirror = {$cls: child},
    parameterTypes = {array: []}, returnType = {$cls: {getInternalName: () => 'V'}};
  const factory = {getClass: () => generatorClass,
    [generatorPrefix + 'declaringClass']: declaringMirror,
    [generatorPrefix + 'parameterTypes']: parameterTypes,
    [generatorPrefix + 'returnType']: returnType,
    [generatorPrefix + 'isConstructor']: 1,
    [generatorPrefix + 'forSerialization']: serialization ? 1 : 0,
    [generatorPrefix + 'targetMethodRef']: generated.refs.target,
    [commonPrefix + 'toStringIdx']: generated.refs.helper,
    [commonPrefix + 'modifiers']: 1};
  const action = {getClass: () => actionClass, [actionPrefix + 'this$0']: factory,
    [actionPrefix + 'val$bytes']: sourceBytes, [actionPrefix + 'val$generatedName']: generatedName,
    [actionPrefix + 'val$declaringClass']: declaringMirror};
  const generateFrame = {method: {cls: generatorClass, signature: generateSignature},
    locals: [factory, declaringMirror, '<init>', parameterTypes, returnType, {array: []}, 1, 1,
      serialization ? 1 : 0, serialization ? {$cls: parent} : null]};
  const actionFrame = {method: {cls: actionClass, signature: 'run()Lsun/reflect/MagicAccessorImpl;'}, locals: [action]};
  const definerFrame = {method: {cls: definerClass,
    signature: 'defineClass(Ljava/lang/String;[BIILjava/lang/ClassLoader;)Ljava/lang/Class;'},
    locals: [generatedName, sourceBytes, 0, generated.bytes.length, null]};
  const nativeFrame = {method: {cls: {}, signature: 'defineClass(...)'}, locals: []};
  const frames = [generateFrame, actionFrame, definerFrame, nativeFrame];
  const thread = {stack: [], errors: [], returns: [], status: ThreadStatus.RUNNABLE, jitDisabled: true,
    getBsCl: () => bootstrap, getStackTrace: () => frames,
    getStatus() { return this.status; }, setStatus(value) { this.status = value; },
    framePop() { this.stack.pop(); }, throwNewException(name, message) { this.errors.push({name, message}); },
    throwException(error) { this.errors.push(error); }, asyncReturn(...values) { this.returns.push(values); }};
  const definition = {className: generated.name, bytes: generated.bytes, sourceBytes,
    offset: 0, length: generated.bytes.length, loader, protectionDomain: null};
  return {bootstrap, loader, loaderObject, parent, child, objectClass, generatorClass, actionClass,
    factory, action, generateFrame, actionFrame, definerFrame, frames, thread, definition};
}
function parsed(w, bytes = w.definition.bytes) { return new ReferenceClassData(bytes, null, w.loader); }
function method(cls, name) { return cls.getMethods().find(item => item.name === name); }
function decoded(cls, m) { return decodeMethodCode({className: cls.getInternalName(),
  superClassName: cls.getSuperClassReference().name, majorVersion: cls.majorVersion,
  name: m.name, descriptor: m.rawDescriptor, declaredAccessFlags: m.declaredAccessFlags,
  declaredCode: m.declaredCode, constantPool: cls.constantPool}); }
function adapted(w) {
  const preparation = prepareReflectionClass(w.thread, w.definition);
  assert.ok(preparation, 'Matching bootstrap reflection generation needs typed adapters');
  const cls = parsed(w, preparation.bytes);
  installReflectionAdapters(preparation, cls);
  return {cls, preparation};
}
function bridgeFor(cls, pc) {
  const instruction = decoded(cls, method(cls, 'newInstance')).instructionAt[pc];
  assert.equal(instruction.opcode, 0xb8);
  const ref = cls.constantPool.get(instruction.cpIndex);
  return cls.getMethods().find(item => item.signature === ref.nameAndTypeInfo.name + ref.nameAndTypeInfo.descriptor);
}

test('ordinary verifier rejects both original privileged reflection shapes', () => {
  for (const serialization of [false, true]) {
    const w = world(serialization), cls = parsed(w);
    assert.equal(cls.tryToResolve(), false);
    assert.equal(cls.isVerified(), false);
    assert.equal(cls.verification.failure.javaClassName, 'Ljava/lang/VerifyError;');
    assert.match(cls.verification.failure.message, serialization ? /uninitialized receiver/ : /assignable/);
  }
});

test('trusted ordinary and serialization accessors pass the full verifier after typed adaptation', () => {
  for (const serialization of [false, true]) {
    const w = world(serialization), untouched = Buffer.from(w.definition.bytes), before = parsed(w);
    const {cls, preparation} = adapted(w);
    assert.equal(cls.tryToResolve(), true);
    assert.equal(cls.isVerified(), true);
    assert.deepEqual(w.definition.bytes, untouched);
    assert.deepEqual(method(cls, '<init>').declaredCode.getCode(), method(before, '<init>').declaredCode.getCode());
    const originalCode = decoded(before, method(before, 'newInstance')), transformed = decoded(cls, method(cls, 'newInstance'));
    assert.deepEqual(transformed.instructions.map(instruction => instruction.pc), originalCode.instructions.map(instruction => instruction.pc));
    assert.deepEqual(transformed.exceptionHandlers, originalCode.exceptionHandlers);
    assert.equal(transformed.instructionAt[3].opcode, 0x59, 'Original duplicate allocation result is retained');
    const provenance = getReflectionGenerationProvenance(cls);
    assert.deepEqual(provenance.originalBytes, untouched);
    assert.deepEqual(provenance.transformedBytes, preparation.bytes);
    assert.equal(provenance.edits.length, serialization ? 3 : 1);
    provenance.originalBytes.fill(0);
    assert.deepEqual(getReflectionGenerationProvenance(cls).originalBytes, untouched);
    for (const m of cls.getMethods().filter(item => item.isNative)) {
      assert.equal(m.declaredAccessFlags & 0x110a, 0x110a);
      assert.equal(m.declaredCode, null);
    }
  }
});

test('exception helper adapter invokes the exact Object method instead of a virtual receiver override', () => {
  const w = world(), {cls} = adapted(w), bridge = bridgeFor(cls, 10);
  assert.equal(bridge.rawDescriptor, '(Ljava/lang/Object;)Ljava/lang/String;');
  const receiver = {'toString()Ljava/lang/String;'() { assert.fail('Virtual dispatch changed helper semantics'); }};
  bridge.getNativeFunction()(w.thread, receiver);
  assert.equal(w.thread.stack.length, 2);
  assert.ok(w.thread.stack[0] instanceof InternalStackFrame);
  assert.ok(w.thread.stack[1] instanceof BytecodeStackFrame);
  assert.equal(w.thread.stack[1].method, method(w.objectClass, 'toString'));
  assert.deepEqual(w.thread.stack[1].locals, [receiver]);
});

test('serialization constructor bridge retains exact superclass Method identity and child receiver type', () => {
  const w = world(true), {cls} = adapted(w), bridge = bridgeFor(cls, 6), receiver = {};
  assert.equal(bridge.rawDescriptor, '(Lprobe/Child;)V');
  bridge.getNativeFunction()(w.thread, receiver);
  assert.equal(w.thread.stack[1].method, method(w.parent, '<init>'));
  assert.notEqual(w.thread.stack[1].method, method(w.child, '<init>'));
  assert.deepEqual(w.thread.stack[1].locals, [receiver]);
});

test('serialization allocation adapter preserves initialization ordering and does not call a Java constructor', () => {
  const w = world(true), {cls} = adapted(w), bridge = bridgeFor(cls, 0), events = [];
  let pending;
  w.child.initialize = (thread, callback, explicit) => {
    assert.equal(thread, w.thread); assert.equal(explicit, false); events.push('initialize'); pending = callback;
  };
  w.child.getConstructor = thread => {
    assert.equal(thread, w.thread); events.push('constructor');
    return function(caller) { assert.equal(caller, w.thread); events.push('allocate'); this.allocated = true; };
  };
  bridge.getNativeFunction()(w.thread);
  assert.deepEqual(events, ['initialize']);
  assert.deepEqual(w.thread.returns, []);
  assert.equal(w.thread.stack.length, 0);
  pending(w.child);
  assert.deepEqual(events, ['initialize', 'constructor', 'allocate']);
  assert.equal(w.thread.returns.length, 1);
  assert.equal(w.thread.returns[0][0].allocated, true);
  assert.equal(w.thread.stack.length, 0, 'Superclass Java constructor is a separate exact bridge');
});

test('serialization allocation failure preserves the original error and exposes no receiver', () => {
  const w = world(true), {cls} = adapted(w), bridge = bridgeFor(cls, 0), failure = {name: 'java.lang.VerifyError'};
  w.child.initialize = (thread, callback) => { thread.throwException(failure); callback(null); };
  w.child.getConstructor = () => assert.fail('Failed class must not expose a constructor');
  bridge.getNativeFunction()(w.thread);
  assert.deepEqual(w.thread.errors, [failure]);
  assert.deepEqual(w.thread.returns, []);
  assert.equal(w.thread.stack.length, 0);
});

test('exact adapter target still enters the ordinary pre-execution verification gate', () => {
  const w = world(true), {cls} = adapted(w), bridge = bridgeFor(cls, 6);
  let requested = 0;
  w.parent.isVerified = () => false;
  w.parent.resolve = () => { requested++; };
  bridge.getNativeFunction()(w.thread, {});
  const frame = w.thread.stack[1];
  frame.run(w.thread);
  assert.equal(requested, 1);
  assert.equal(w.thread.status, ThreadStatus.ASYNC_WAITING);
  assert.equal(frame.pc, 0);
});

test('same-name custom-loader producer classes and forged producer frames cannot grant adapters', () => {
  for (const scenario of ['no-producer', 'definer-identity', 'action-identity', 'generator-identity', 'factory-receiver',
    'active-generate', 'action-method', 'definer-method', 'loader-identity', 'loader-parent']) {
    const w = world(true);
    if (scenario === 'no-producer') w.thread.getStackTrace = () => [];
    if (scenario === 'definer-identity') w.definerFrame.method.cls = {getInternalName: () => 'Lsun/reflect/ClassDefiner;'};
    if (scenario === 'action-identity') w.actionFrame.method.cls = {getInternalName: () => actionName};
    if (scenario === 'generator-identity') w.factory.getClass = () => ({getInternalName: () => generatorName});
    if (scenario === 'factory-receiver') w.generateFrame.locals[0] = {};
    if (scenario === 'active-generate') w.generateFrame.method.signature = 'untrusted()V';
    if (scenario === 'action-method') w.actionFrame.method.signature = 'untrusted()V';
    if (scenario === 'definer-method') w.definerFrame.method.signature = 'untrusted()V';
    if (scenario === 'loader-identity') w.loaderObject.getClass = () => ({getInternalName: () => 'Lsun/reflect/DelegatingClassLoader;'});
    if (scenario === 'loader-parent') w.loaderObject['java/lang/ClassLoader/parent'] = {};
    assert.equal(prepareReflectionClass(w.thread, w.definition), null, scenario);
    assert.equal(parsed(w).tryToResolve(), false, scenario + ' must not bypass ordinary verification');
  }
});

test('equivalent byte arrays or names cannot replace the exact captured native arguments', () => {
  for (const scenario of ['array', 'definer-array', 'content', 'name', 'declaring', 'parameters', 'return-type', 'offset', 'length', 'protection-domain']) {
    const w = world(true);
    if (scenario === 'array') w.definition.sourceBytes = {array: w.definition.sourceBytes.array.slice()};
    if (scenario === 'definer-array') w.definerFrame.locals[1] = {array: w.definition.sourceBytes.array.slice()};
    if (scenario === 'content') { w.definition.bytes = Buffer.from(w.definition.bytes); w.definition.bytes[0] ^= 1; }
    if (scenario === 'name') w.definition.className = 'Lsun/reflect/GeneratedSerializationConstructorAccessor2;';
    if (scenario === 'declaring') w.action[actionPrefix + 'val$declaringClass'] = {$cls: w.child};
    if (scenario === 'parameters') w.generateFrame.locals[3] = {array: []};
    if (scenario === 'return-type') w.generateFrame.locals[4] = {$cls: {getInternalName: () => 'V'}};
    if (scenario === 'offset') w.definition.offset = 1;
    if (scenario === 'length') w.definition.length--;
    if (scenario === 'protection-domain') w.definition.protectionDomain = {};
    assert.equal(prepareReflectionClass(w.thread, w.definition), null, scenario);
  }
});

test('wrong helper, handler, allocation shape, or class-file generation policy remains unadapted', () => {
  for (const options of [{wrongHelper: true}, {noHandlers: true}, {noDup: true}, {major: 50}]) {
    const w = world(true, options);
    assert.equal(prepareReflectionClass(w.thread, w.definition), null, JSON.stringify(options));
    assert.equal(parsed(w).tryToResolve(), false);
  }
});

test('unrelated bad bytecode is not excused by a trusted producer or successful adapter installation', () => {
  for (const serialization of [false, true]) {
    const w = world(serialization, {badReturn: true}), {cls} = adapted(w);
    assert.equal(cls.tryToResolve(), false);
    assert.equal(cls.isVerified(), false);
    assert.equal(cls.verification.failure.javaClassName, 'Ljava/lang/VerifyError;');
    assert.match(cls.verification.failure.message, /Return|return/);
  }
});
