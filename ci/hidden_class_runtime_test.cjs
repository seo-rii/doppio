'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier',
  'VerificationRelations', 'ReflectionAdapters', 'GeneratedAdapters', 'LambdaAdapters', 'SymbolicResolution', 'ClassAccess', 'util', 'BootstrapLinkage', 'VarHandleStorage']);
const cache = new Map();
function load(name) {
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(path.join(runtime, 'src', name + '.js'));
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(runtime, 'src', name + '.js'), loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id.startsWith('./') && sourceModules.has(id.slice(2)) ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData, ArrayClassData, ClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {ClassReference} = load('ConstantPool');
const {getKnownNestHost, registerHiddenNestHost, resolveNestHost} = load('ClassAccess');
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// Deliberately synthetic bytes isolate actual parser, identity, derivation,
// metadata resolver and array paths. Genuine javac21/25 and native/browser
// execution are separate C5 corpus evidence, never claimed by these units.
function classBytes({name = 'scope/Payload', parent = 'java/lang/Object', fields = [], selfReturn = false, fieldReference = false,
    nestHost, flags = 0x21, major = 65} = {}) {
  const entries = [], constants = new Map();
  function utf(value) {
    const key = 'utf:' + value;
    if (!constants.has(key)) {
      const bytes = Buffer.from(value);
      entries.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
      constants.set(key, entries.length);
    }
    return constants.get(key);
  }
  function cls(value, duplicate = false) {
    const key = 'class:' + value;
    if (duplicate || !constants.has(key)) {
      const text = utf(value);
      entries.push(Buffer.concat([Buffer.from([7]), u2(text)]));
      if (duplicate) return entries.length;
      constants.set(key, entries.length);
    }
    return constants.get(key);
  }
  const self = cls(name), superClass = parent === null ? 0 : cls(parent), otherSelf = cls(name, true),
    members = fields.map(field => Buffer.concat([u2(field.flags || 1), u2(utf(field.name)),
      u2(utf(field.descriptor)), u2(0)])), methods = [], attributes = [];
  let fieldRef;
  if (fieldReference) {
    const field = fields[0], fieldName = utf(field.name), descriptor = utf(field.descriptor);
    entries.push(Buffer.concat([Buffer.from([12]), u2(fieldName), u2(descriptor)]));
    const pair = entries.length;
    entries.push(Buffer.concat([Buffer.from([9]), u2(self), u2(pair)]));
    fieldRef = entries.length;
  }
  if (selfReturn) {
    const code = Buffer.from([0x2a, 0xb0]), body = Buffer.concat([u2(1), u2(1), u4(code.length), code, u2(0), u2(0)]);
    methods.push(Buffer.concat([u2(1), u2(utf('self')), u2(utf('()L' + name + ';')), u2(1),
      u2(utf('Code')), u4(body.length), body]));
  }
  if (nestHost) attributes.push(Buffer.concat([u2(utf('NestHost')), u4(2), u2(cls(nestHost))]));
  const bytes = Buffer.concat([u4(0xcafebabe), u2(0), u2(major), u2(entries.length + 1), ...entries,
    u2(flags), u2(self), u2(superClass), u2(0), u2(members.length), ...members,
    u2(methods.length), ...methods, u2(attributes.length), ...attributes]);
  return {bytes, self, otherSelf, fieldRef};
}
function world() {
  const loader = new ClassLoader(null), requests = [];
  loader.bootstrap = loader;
  loader.getLoaderObject = () => null;
  const object = new ReferenceClassData(classBytes({name: 'java/lang/Object', parent: null}).bytes, null, loader);
  object.setResolved(null, []);
  loader.addClass(object.getInternalName(), object);
  loader._loadClass = (thread, name, callback) => {
    requests.push(name);
    if (thread) thread.throwNewException('Ljava/lang/NoClassDefFoundError;', name);
    callback(null);
  };
  const thread = {errors: [], getRef: () => 1, currentMethod: () => null,
    throwNewException(name, message) { this.errors.push({name, message}); }};
  return {loader, object, requests, thread};
}
function parse(w, spec = {}) {
  const input = classBytes(spec), cls = new ReferenceClassData(input.bytes, null, w.loader);
  return {cls, input};
}

test('hidden identity changes only this_class, preserving original descriptors and distinct duplicate CP entries', () => {
  const w = world(), {cls, input} = parse(w, {fields: [{name: 'self', descriptor: 'Lscope/Payload;'}], selfReturn: true});
  cls.markHidden('0x1', null, false);
  assert.equal(cls.getInternalName(), 'Lscope/Payload.0x1;');
  assert.equal(cls.getExternalName(), 'scope.Payload/0x1');
  assert.equal(cls.getPackageName(), 'scope');
  assert.equal(cls.isHidden(), true);
  assert.equal(cls.isStrongHidden(), false);
  assert.equal(cls.constantPool.get(input.self).cls, cls);
  assert.equal(cls.constantPool.get(input.self).name, cls.getInternalName());
  assert.equal(cls.constantPool.get(input.otherSelf).name, 'Lscope/Payload;');
  assert.equal(cls.constantPool.get(input.otherSelf).cls, null);
  assert.equal(cls.getFields()[0].rawDescriptor, 'Lscope/Payload;');
  assert.equal(cls.getMethods()[0].rawDescriptor, '()Lscope/Payload;');
  assert.throws(() => cls.markHidden('0x2', null, false));
});

test('VM hidden suffix validation cannot admit a caller-selected binary name or descriptor', () => {
  for (const suffix of ['', 'some/name', 'some.name', 'bad;', '[I']) {
    const w = world(), {cls} = parse(w);
    assert.throws(() => cls.markHidden(suffix, null, false));
    assert.equal(cls.isHidden(), false);
  }
});

test('actual hidden derivation verifies and prepares each private identity without publishing or initiating its name', async () => {
  const w = world(), first = parse(w).cls, second = parse(w).cls;
  first.markHidden('0x1', null, false);
  second.markHidden('0x2', null, true);
  const named = parse(w).cls;
  w.loader.addClass(named.getInternalName(), named);
  const names = w.loader.getLoadedClassNames();
  for (const candidate of [first, second]) {
    const result = await new Promise(resolve => w.loader.defineHiddenParsedClass(w.thread, candidate, resolve));
    assert.equal(result, candidate);
    assert.equal(candidate.isVerified(), true);
    assert.equal(candidate.isPrepared(), true);
    assert.equal(candidate.isInitialized(null), false);
    assert.equal(w.loader.getLoadedClass(candidate.getInternalName()), null);
  }
  assert.deepEqual(w.loader.getLoadedClassNames(), names);
  assert.equal(w.loader.getLoadedClass('Lscope/Payload;'), named);
  assert.equal(w.loader.strongHiddenClasses.length, 1);
  assert.equal(w.loader.strongHiddenClasses[0], second);
  assert.deepEqual(w.thread.errors, []);
  assert.throws(() => w.loader.defineHiddenParsedClass(w.thread, named, () => {}));
});

test('this_class passive metadata resolution preserves actual hidden identity without a loader lookup', async () => {
  const w = world(), {cls, input} = parse(w);
  cls.markHidden('0x1', null, false);
  const reference = cls.constantPool.get(input.self);
  assert.ok(reference instanceof ClassReference);
  const success = await new Promise(resolve => reference.resolveMetadata(w.thread, w.loader, cls, resolve, false));
  assert.equal(success, true);
  assert.equal(reference.cls, cls);
  assert.deepEqual(w.requests, []);
  assert.equal(cls.isVerified(), false);
});

test('hidden NESTMATE host capability overrides payload attributes without adding discoverable NestMembers', async () => {
  const w = world(), host = parse(w, {name: 'scope/Host'}).cls,
    hidden = parse(w, {nestHost: 'other/UntrustedHost'}).cls;
  w.loader.addClass(host.getInternalName(), host);
  hidden.markHidden('0x1', null, false);
  assert.equal(hidden.getNestHostReference(), null);
  registerHiddenNestHost(hidden, host);
  assert.equal(getKnownNestHost(hidden), host);
  assert.equal(await new Promise(resolve => resolveNestHost(w.thread, hidden, resolve)), host);
  assert.equal(hidden.isNestmateOf(host), true);
  assert.equal(host.isNestmateOf(hidden), true);
  assert.deepEqual(host.getNestMemberReferences(), []);
  assert.deepEqual(host.getNestMemberNames(), []);
  assert.deepEqual(w.requests, []);
  assert.throws(() => registerHiddenNestHost(hidden, hidden));
});

test('default hidden nest is self and a host from another runtime package has no authority', () => {
  const w = world(), hidden = parse(w, {nestHost: 'scope/ClaimedHost'}).cls,
    wrong = parse(w, {name: 'other/Host'}).cls;
  hidden.markHidden('0x1', null, false);
  assert.throws(() => registerHiddenNestHost(hidden, wrong));
  registerHiddenNestHost(hidden, hidden);
  assert.equal(getKnownNestHost(hidden), hidden);
  assert.equal(hidden.isNestmateOf(wrong), false);
});

test('hidden arrays use cached direct component identities without loader publication or component initialization', () => {
  const w = world(), hidden = parse(w).cls, second = parse(w).cls;
  hidden.markHidden('0x1', null, false);
  second.markHidden('0x2', null, false);
  hidden.initialize = second.initialize = () => assert.fail('Array metadata initializes a component');
  const first = w.loader.getHiddenArrayClass(hidden), other = w.loader.getHiddenArrayClass(second);
  assert.ok(first instanceof ArrayClassData);
  assert.equal(first, w.loader.getHiddenArrayClass(hidden));
  assert.notEqual(first, other);
  assert.equal(first.tryToResolve(), true);
  assert.equal(other.tryToResolve(), true);
  assert.equal(first.getComponentClass(), hidden);
  assert.equal(first.hasHiddenComponent(), true);
  assert.equal(first.getInternalName(), '[Lscope/Payload.0x1;');
  assert.equal(first.getExternalName(), '[Lscope.Payload/0x1;');
  assert.equal(first.isCastable(other), false);
  assert.equal(first.isCastable(w.object), true);
  const secondRank = w.loader.getHiddenArrayClass(first);
  assert.equal(secondRank.tryToResolve(), true);
  assert.equal(secondRank.getComponentClass(), first);
  assert.equal(secondRank.getExternalName(), '[[Lscope.Payload/0x1;');
  assert.equal(secondRank.getInternalName(), '[[Lscope/Payload.0x1;');
  for (const array of [first, other, secondRank]) assert.equal(w.loader.getLoadedClass(array.getInternalName()), null);
  assert.deepEqual(w.requests, []);
  assert.throws(() => w.loader.getHiddenArrayClass(w.object));
});

function loadNatives() {
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(path.join(runtime, 'src/natives/java_lang')).default();
  const filename = path.join(runtime, 'src/natives/java_lang.js'), loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded), stock = require(path.join(runtime, 'src/doppiojvm')),
    patched = {...stock, VM: {...stock.VM, ClassFile: {...stock.VM.ClassFile, ...load('ClassData')}}};
  loaded.require = id => id === '../doppiojvm' ? patched : id === '../ClassAccess' ? load('ClassAccess') : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(root, 'src/natives/java_lang.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports.default();
}
const natives = loadNatives(), helper = natives['java/lang/invoke/DoppioHiddenClasses'],
  lookupPrefix = 'java/lang/invoke/MethodHandles$Lookup/', dataSignature = 'classData0(Ljava/lang/invoke/MethodHandles$Lookup;)Ljava/lang/Object;',
  defineSignature = 'defineHiddenClass0(Ljava/lang/invoke/MethodHandles$Lookup;[BLjava/lang/Object;Z[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;)Ljava/lang/invoke/MethodHandles$Lookup;';
function nativeThread() {
  return {errors: [], returns: [], statuses: [],
    setStatus(value) { this.statuses.push(value); },
    throwNewException(name, message) { this.errors.push({name, message}); },
    asyncReturn(value) { this.returns.push(value); }};
}
function lookup(cls, modes = 0x5f) {
  return {[lookupPrefix + 'lookupClass']: {$cls: cls}, [lookupPrefix + 'allowedModes']: modes & 15,
    [lookupPrefix + 'doppioModernModes']: modes};
}

test('private classData native independently denies non-ORIGINAL Lookups before initialization or data disclosure', () => {
  const w = world(), hidden = parse(w).cls, data = {};
  hidden.markHidden('0x1', data, false);
  hidden.initialize = () => assert.fail('Unauthorized classData initializes its target');
  for (const modes of [0, 1, 0x1f, 0x20, 0x5d]) {
    const owner = nativeThread();
    helper[dataSignature](owner, lookup(hidden, modes & ~0x40));
    assert.equal(owner.errors[0].name, 'Ljava/lang/IllegalAccessException;');
    assert.deepEqual(owner.returns, []);
    assert.deepEqual(owner.statuses, []);
  }
});

test('classData native initializes the exact class once its ORIGINAL capability is checked and propagates failed completion', () => {
  const w = world(), hidden = parse(w).cls, data = {identity: 1};
  hidden.markHidden('0x1', data, false);
  const owner = nativeThread();
  let complete;
  hidden.initialize = (current, callback, explicit) => {
    assert.equal(current, owner); assert.equal(explicit, true); complete = callback;
  };
  helper[dataSignature](owner, lookup(hidden));
  assert.equal(owner.statuses.length, 1);
  assert.deepEqual(owner.returns, []);
  complete(null);
  assert.deepEqual(owner.returns, []);
  complete(hidden);
  assert.deepEqual(owner.returns, [data]);
});

test('hidden factory native rejects missing full privilege before parsing or minting any identity', () => {
  for (const modes of [0, 1, 0x1d, 0x0f, 0x20]) {
    const owner = nativeThread();
    helper[defineSignature](owner, lookup({}, modes), {array: [0]}, null, false, {array: []});
    assert.equal(owner.errors[0].name, 'Ljava/lang/IllegalAccessException;');
    assert.deepEqual(owner.statuses, []);
    assert.deepEqual(owner.returns, []);
  }
});

test('hidden factory private native rejects null operands without relying on its Java facade', () => {
  for (const args of [[null, {array: []}, null, false, {array: []}],
    [lookup({}), null, null, false, {array: []}], [lookup({}), {array: []}, null, false, null]]) {
    const owner = nativeThread();
    helper[defineSignature](owner, ...args);
    assert.equal(owner.errors[0].name, 'Ljava/lang/NullPointerException;');
    assert.deepEqual(owner.statuses, []);
  }
});

test('hidden-final reflection guard reads the exact parsed declaring field and rejects no ordinary or mutable field', () => {
  const w = world(), hidden = parse(w, {fields: [{name: 'constant', descriptor: 'I', flags: 0x11},
    {name: 'mutable', descriptor: 'I', flags: 1}]}).cls, ordinary = parse(w,
      {fields: [{name: 'constant', descriptor: 'I', flags: 0x11}]}).cls;
  hidden.markHidden('0x1', null, false);
  for (const [cls, slot, rejected] of [[hidden, 0, true], [hidden, 1, false], [ordinary, 0, false]]) {
    const owner = nativeThread(), reflected = {'java/lang/reflect/Field/clazz': {$cls: cls},
      'java/lang/reflect/Field/slot': slot, 'java/lang/reflect/Field/modifiers': 0,
      'java/lang/reflect/AccessibleObject/override': 1};
    helper['checkFieldWritable(Ljava/lang/reflect/Field;)V'](owner, reflected);
    assert.deepEqual(owner.errors.map(error => error.name), rejected ? ['Ljava/lang/IllegalAccessException;'] : []);
  }
});

test('private unreflectSetter bridge independently prevents bypass of the hidden-final guard', () => {
  const w = world(), hidden = parse(w, {fields: [{name: 'constant', descriptor: 'I', flags: 0x11}]}).cls;
  hidden.markHidden('0x1', null, false);
  const owner = nativeThread(), original = lookup(hidden), alias = lookupPrefix +
    'doppioHiddenFinalBase$unreflectSetter(Ljava/lang/reflect/Field;)Ljava/lang/invoke/MethodHandle;';
  original[alias] = () => assert.fail('Hidden final setter reached the original Java8 bypass');
  helper['unreflectSetterBase(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/reflect/Field;)Ljava/lang/invoke/MethodHandle;'](
    owner, original, {'java/lang/reflect/Field/clazz': {$cls: hidden}, 'java/lang/reflect/Field/slot': 0});
  assert.equal(owner.errors[0].name, 'Ljava/lang/IllegalAccessException;');
  assert.deepEqual(owner.statuses, []);
});

test('Class.isHidden reports actual reference identities, never arrays of hidden components', () => {
  const w = world(), hidden = parse(w).cls;
  hidden.markHidden('0x1', null, false);
  const query = natives['java/lang/Class']['isHidden()Z'], owner = nativeThread();
  assert.equal(query(owner, {$cls: hidden}), true);
  assert.equal(query(owner, {$cls: w.object}), false);
  assert.equal(query(owner, {$cls: w.loader.getHiddenArrayClass(hidden)}), false);
});

test('Class.getPackageName preserves the original runtime package of hidden classes and direct hidden array mirrors', () => {
  const w = world(), hidden = parse(w).cls;
  hidden.markHidden('0x1', null, false);
  const first = w.loader.getHiddenArrayClass(hidden), second = w.loader.getHiddenArrayClass(first),
    owner = nativeThread(), bootstrap = {
      getResolvedClass: () => ({getConstructor: () => function() {}}),
      getInitializedClass: () => ({getConstructor: () => function(thread, length) { this.array = new Array(length); }})
    };
  owner.getBsCl = () => bootstrap;
  for (const target of [hidden, first, second]) {
    const result = natives['java/lang/DoppioClass']['getPackageName(Ljava/lang/Class;)Ljava/lang/String;'](owner, {$cls: target});
    assert.equal(String.fromCharCode(...result['java/lang/String/value'].array), 'scope');
  }
  assert.deepEqual(w.requests, []);
  assert.deepEqual(owner.statuses, []);
});

for (const isStatic of [false, true]) test('hidden ' + (isStatic ? 'static' : 'instance') +
    ' field Code, constructor storage, reflection slot and VarHandle use one rebound owner key', async () => {
  const w = world(), {cls, input} = parse(w, {fields: [{name: 'wide', descriptor: 'J', flags: isStatic ? 0x19 : 0x11}], fieldReference: true}),
    {captureVarHandleField, operateVarHandleStorage} = load('VarHandleStorage'),
    Long = require(path.join(runtime, 'src/gLong')).default;
  cls.markHidden('0x1', null, false);
  assert.equal(await new Promise(resolve => w.loader.defineHiddenParsedClass(w.thread, cls, resolve)), cls);
  assert.equal(cls.tryToInitialize(), true);
  const field = cls.getFields()[0], reference = cls.constantPool.get(input.fieldRef);
  assert.equal(await new Promise(resolve => reference.resolve(w.thread, w.loader, cls, resolve, false)), true);
  assert.equal(field.fullName, 'scope/Payload.0x1/wide');
  assert.equal(reference.fullFieldName, field.fullName);
  assert.equal(cls.getFieldFromSlot(0), field);
  const constructor = cls.getConstructor(null), owner = isStatic ? constructor : new constructor(null),
    key = reference.fullFieldName, expected = Long.fromString('9007199254740993');
  assert.ok(Object.hasOwn(owner, key), 'Generated default storage uses the exact renamed key');
  assert.equal(Object.hasOwn(owner, 'scope/Payload/wide'), false, 'No stale ordinary-name storage remains');
  owner[key] = expected;
  const captured = captureVarHandleField(cls, 'wide', 'J', isStatic);
  assert.equal(captured, field);
  const result = operateVarHandleStorage(w.thread, {field: captured, readonly: true}, 'get', isStatic ? [] : [owner]);
  assert.equal(result.ok, true);
  assert.equal(result.value.toString(), '9007199254740993');
  assert.equal(owner[field.fullName], expected, 'Reflection VM-index metadata reads the same cell');
  assert.equal(field.rawDescriptor, 'J');
  assert.deepEqual(w.thread.errors, []);
});
