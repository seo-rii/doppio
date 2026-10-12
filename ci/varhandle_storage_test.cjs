'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');

// Pure storage contracts using fake class/thread identities. Compile the
// original backend and gLong in memory; no shared build writes or claims of
// genuine javac, Java lifecycle, host, concurrency or memory-order evidence.
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.resolve(__dirname, '../src', name + '.ts');
  const loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.require = id => id === './gLong' ? load('gLong') : assert.fail('Unexpected storage dependency: ' + id);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'},
    reportDiagnostics: true
  });
  assert.deepEqual(compiled.diagnostics, []);
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}
const Long = load('gLong').default;
const {captureVarHandleField, operateVarHandleStorage, varHandleStorageMode,
  isVarHandleStorageModeSupported} = load('VarHandleStorage');

const forbidden = name => () => assert.fail('Storage unexpectedly called ' + name);
function cls(name, parent = null, component = null) {
  const result = {
    getInternalName: () => name,
    getComponentClass: () => component,
    isResolved: () => true,
    isInitialized: () => true,
    initialize: forbidden('initialize'),
    resolve: forbidden('resolve'),
    tryToResolve: forbidden('tryToResolve'),
    getClassObject: forbidden('getClassObject'),
    getConstructor: forbidden('getConstructor'),
    getLoader: forbidden('getLoader'),
    isCastable(target) {
      if (result === target) return true;
      if (component !== null && target.getComponentClass() !== null) return component.isCastable(target.getComponentClass());
      return parent !== null && parent.isCastable(target);
    }
  };
  return result;
}
const objectClass = cls('Ljava/lang/Object;');
const stringClass = cls('Ljava/lang/String;', objectClass);
const otherClass = cls('Lother/Value;', objectClass);
const primitive = Object.fromEntries('ZBCSIJFD'.split('').map(name => [name, cls(name)]));
const object = type => ({getClass: () => type});
function storage(descriptor, elements, readonly = false, actualComponent = null) {
  const component = primitive[descriptor] || (descriptor === 'Ljava/lang/String;' ? stringClass : objectClass);
  const arrayClass = cls('[' + descriptor, null, component);
  const actual = actualComponent === null ? arrayClass : cls('[' + actualComponent.getInternalName(), null, actualComponent);
  return {capability: {arrayClass, readonly}, array: {array: elements, getClass: () => actual}};
}
function thread() {
  const errors = [];
  return {errors, throwNewException: (type, message) => errors.push({type, message}),
    asyncReturn: forbidden('asyncReturn'), setStatus: forbidden('setStatus'),
    getBsCl: forbidden('getBsCl'), runWithExceptionBoundary: forbidden('runWithExceptionBoundary')};
}
function run(testThread, state, mode, ...values) {
  return operateVarHandleStorage(testThread, state.capability, mode, [state.array, 1, ...values]);
}
function passed(result, value) {
  assert.deepEqual(result, {ok: true, value});
}
function failed(result, testThread, type) {
  assert.deepEqual(result, {ok: false, value: undefined});
  assert.equal(testThread.errors.at(-1).type, type);
}
function field(owner, name, descriptor, isStatic = false, final = false) {
  return {cls: owner, name, rawDescriptor: descriptor, fullName: owner.getInternalName().slice(1, -1) + '/' + name,
    accessFlags: {isStatic: () => isStatic, isFinal: () => final}};
}

test('exact 31 immutable mode names and value arities; unknown/prototype names are rejected', () => {
  const groups = [
    ['get', 0, ['get', 'getVolatile', 'getAcquire', 'getOpaque']],
    ['set', 1, ['set', 'setVolatile', 'setRelease', 'setOpaque']],
    ['compareAndSet', 2, ['compareAndSet', 'weakCompareAndSet', 'weakCompareAndSetPlain', 'weakCompareAndSetAcquire', 'weakCompareAndSetRelease']],
    ['compareAndExchange', 2, ['compareAndExchange', 'compareAndExchangeAcquire', 'compareAndExchangeRelease']],
    ['getAndSet', 1, ['getAndSet', 'getAndSetAcquire', 'getAndSetRelease']],
    ['add', 1, ['getAndAdd', 'getAndAddAcquire', 'getAndAddRelease']],
    ['or', 1, ['getAndBitwiseOr', 'getAndBitwiseOrAcquire', 'getAndBitwiseOrRelease']],
    ['and', 1, ['getAndBitwiseAnd', 'getAndBitwiseAndAcquire', 'getAndBitwiseAndRelease']],
    ['xor', 1, ['getAndBitwiseXor', 'getAndBitwiseXorAcquire', 'getAndBitwiseXorRelease']]
  ];
  assert.equal(groups.reduce((sum, group) => sum + group[2].length, 0), 31);
  for (const [family, valueArity, names] of groups) for (const name of names) {
    const mode = varHandleStorageMode(name);
    assert.deepEqual(mode, {family, valueArity});
    assert.ok(Object.isFrozen(mode));
  }
  for (const name of ['GET', 'getPlain', '', '__proto__', 'constructor', 'toString']) assert.equal(varHandleStorageMode(name), null);
});

test('field capture uses exact descriptor and actual declaration, without lifecycle/access shortcuts', () => {
  const owner = cls('Lbase/Owner;'), child = cls('Lchild/Owner;', owner);
  const inherited = field(owner, 'value', 'J', true);
  const lookups = [];
  child.fieldLookup = (name, descriptor) => { lookups.push([name, descriptor]); return inherited; };
  assert.equal(captureVarHandleField(child, 'value', 'J', true), inherited);
  assert.deepEqual(lookups, [['value', 'J']]);
  assert.equal(captureVarHandleField(child, 'value', 'I', true), null);
  assert.equal(captureVarHandleField(child, 'value', 'J', false), null);
  child.fieldLookup = () => null;
  assert.equal(captureVarHandleField(child, 'absent', 'J', true), null);
  child.isResolved = () => false;
  child.fieldLookup = forbidden('unlinked fieldLookup');
  assert.equal(captureVarHandleField(child, 'value', 'J', true), null);
  assert.equal(captureVarHandleField(null, 'value', 'J', true), null);
});

test('wide long comparison is value-based, and add/bitwise preserve all 64 bits', () => {
  const t = thread(), wide = Long.fromString('9007199254740993');
  const state = storage('J', [Long.fromInt(17), wide, Long.fromInt(23)]);
  passed(run(t, state, 'compareAndSet', Long.fromString('9007199254740993'), Long.MIN_VALUE), 1);
  assert.ok(state.array.array[1].equals(Long.MIN_VALUE));
  passed(run(t, state, 'getAndAdd', Long.fromInt(-1)), Long.MIN_VALUE);
  assert.ok(state.array.array[1].equals(Long.MAX_VALUE));
  passed(run(t, state, 'getAndAddAcquire', Long.ONE), Long.MAX_VALUE);
  assert.ok(state.array.array[1].equals(Long.MIN_VALUE));
  passed(run(t, state, 'set', wide), null);
  passed(run(t, state, 'getAndBitwiseOr', Long.MIN_VALUE), wide);
  const negativeWide = wide.or(Long.MIN_VALUE);
  assert.ok(state.array.array[1].equals(negativeWide));
  passed(run(t, state, 'getAndBitwiseAndAcquire', Long.MAX_VALUE), negativeWide);
  assert.ok(state.array.array[1].equals(wide));
  passed(run(t, state, 'getAndBitwiseXorRelease', Long.ONE), wide);
  assert.equal(state.array.array[1].toString(), '9007199254740992');
  assert.equal(state.array.array[0].toInt(), 17);
  assert.equal(state.array.array[2].toInt(), 23);
  assert.deepEqual(t.errors, []);
});

test('int and narrow add/bitwise wrap exactly, without touching neighbors', () => {
  const t = thread();
  for (const [descriptor, before, increment, after] of [
    ['I', 2147483647, 1, -2147483648], ['B', 127, 1, -128], ['S', 32767, 1, -32768], ['C', 65535, 1, 0]
  ]) {
    const state = storage(descriptor, [17, before, 23]);
    passed(run(t, state, 'getAndAddRelease', increment), before);
    assert.deepEqual(state.array.array, [17, after, 23]);
  }
  const bytes = storage('B', [17, 1, 23]);
  passed(run(t, bytes, 'getAndBitwiseOr', 128), 1);
  assert.deepEqual(bytes.array.array, [17, -127, 23]);
  const booleans = storage('Z', [1, 0, 0]);
  passed(run(t, booleans, 'getAndBitwiseOr', 1), 0);
  passed(run(t, booleans, 'getAndBitwiseAndAcquire', 0), 1);
  passed(run(t, booleans, 'getAndBitwiseXorRelease', 1), 0);
  assert.deepEqual(booleans.array.array, [1, 1, 0]);
  assert.deepEqual(t.errors, []);
});

test('float/double compare raw bits for signed zero and canonical quiet NaN', () => {
  const t = thread();
  for (const descriptor of ['F', 'D']) {
    const state = storage(descriptor, [17, -0, 23]);
    passed(run(t, state, 'compareAndSet', +0, 1), 0);
    assert.ok(Object.is(state.array.array[1], -0));
    const witness = run(t, state, 'compareAndExchangeAcquire', -0, +0);
    assert.equal(witness.ok, true);
    assert.ok(Object.is(witness.value, -0));
    assert.ok(Object.is(state.array.array[1], +0));
    passed(run(t, state, 'set', NaN), null);
    passed(run(t, state, 'compareAndSet', NaN, 3), 1);
    passed(run(t, state, 'compareAndExchangeRelease', 4, 5), 3);
    assert.deepEqual(state.array.array, [17, 3, 23]);
  }
  const floats = storage('F', [17, 16777216, 23]);
  passed(run(t, floats, 'getAndAddAcquire', 1), 16777216);
  assert.deepEqual(floats.array.array, [17, 16777216, 23]);
  const doubles = storage('D', [17, 2.5, 23]);
  passed(run(t, doubles, 'getAndAdd', 0.5), 2.5);
  assert.deepEqual(doubles.array.array, [17, 3, 23]);
  assert.deepEqual(t.errors, []);
});

test('reference expected uses identity and exchange/get-set return exact witnesses including null', () => {
  const t = thread(), first = object(stringClass), equal = object(stringClass), other = object(otherClass);
  const state = storage('Ljava/lang/Object;', [other, first, equal]);
  passed(run(t, state, 'compareAndSet', equal, other), 0);
  assert.equal(state.array.array[1], first);
  passed(run(t, state, 'compareAndExchange', first, equal), first);
  passed(run(t, state, 'getAndSetRelease', null), equal);
  passed(run(t, state, 'compareAndExchangeAcquire', first, other), null);
  passed(run(t, state, 'weakCompareAndSetPlain', null, first), 1);
  assert.deepEqual(state.array.array, [other, first, equal]);
  assert.deepEqual(t.errors, []);
});

test('all supported mode aliases retain single-thread value and witness behavior', () => {
  const t = thread(), state = storage('I', [17, 9, 23]);
  for (const mode of ['get', 'getVolatile', 'getAcquire', 'getOpaque']) passed(run(t, state, mode), 9);
  for (const mode of ['set', 'setVolatile', 'setRelease', 'setOpaque']) {
    passed(run(t, state, mode, 10), null); assert.deepEqual(state.array.array, [17, 10, 23]);
    state.array.array[1] = 9;
  }
  for (const mode of ['compareAndSet', 'weakCompareAndSet', 'weakCompareAndSetPlain', 'weakCompareAndSetAcquire', 'weakCompareAndSetRelease']) {
    passed(run(t, state, mode, 8, 10), 0);
    passed(run(t, state, mode, 9, 10), 1);
    assert.deepEqual(state.array.array, [17, 10, 23]); state.array.array[1] = 9;
  }
  for (const mode of ['compareAndExchange', 'compareAndExchangeAcquire', 'compareAndExchangeRelease']) {
    passed(run(t, state, mode, 8, 10), 9);
    assert.deepEqual(state.array.array, [17, 9, 23]);
    passed(run(t, state, mode, 9, 10), 9);
    assert.deepEqual(state.array.array, [17, 10, 23]); state.array.array[1] = 9;
  }
  for (const [names, argument, after] of [
    [['getAndSet', 'getAndSetAcquire', 'getAndSetRelease'], 10, 10],
    [['getAndAdd', 'getAndAddAcquire', 'getAndAddRelease'], 2, 11],
    [['getAndBitwiseOr', 'getAndBitwiseOrAcquire', 'getAndBitwiseOrRelease'], 2, 11],
    [['getAndBitwiseAnd', 'getAndBitwiseAndAcquire', 'getAndBitwiseAndRelease'], 1, 1],
    [['getAndBitwiseXor', 'getAndBitwiseXorAcquire', 'getAndBitwiseXorRelease'], 1, 8]
  ]) for (const mode of names) {
    passed(run(t, state, mode, argument), 9);
    assert.deepEqual(state.array.array, [17, after, 23]); state.array.array[1] = 9;
  }
  assert.deepEqual(t.errors, []);
});

test('final/read-only and type-inapplicable modes fail without reading coordinates or mutating', () => {
  const t = thread();
  for (const [descriptor, mode, args] of [
    ['Ljava/lang/Object;', 'getAndAdd', [null]], ['Z', 'getAndAddRelease', [1]],
    ['F', 'getAndBitwiseOr', [1]], ['D', 'getAndBitwiseXorAcquire', [1]]
  ]) {
    const state = storage(descriptor, [17, 9, 23]);
    assert.equal(isVarHandleStorageModeSupported(state.capability, mode), false);
    failed(run(t, state, mode, ...args), t, 'Ljava/lang/UnsupportedOperationException;');
    assert.deepEqual(state.array.array, [17, 9, 23]);
  }
  const readonly = storage('I', [17, 9, 23], true);
  assert.equal(isVarHandleStorageModeSupported(readonly.capability, 'getAcquire'), true);
  assert.equal(isVarHandleStorageModeSupported(readonly.capability, 'set'), false);
  failed(operateVarHandleStorage(t, readonly.capability, 'set', [null, -1, 10]), t, 'Ljava/lang/UnsupportedOperationException;');
  assert.deepEqual(readonly.array.array, [17, 9, 23]);
  const owner = cls('Lowner/Final;'), member = field(owner, 'value', 'I', false, true);
  const capability = {field: member, readonly: false};
  assert.equal(isVarHandleStorageModeSupported(capability, 'get'), true);
  assert.equal(isVarHandleStorageModeSupported(capability, 'compareAndSet'), false);
  failed(operateVarHandleStorage(t, capability, 'compareAndSet', [null, 9, 10]), t, 'Ljava/lang/UnsupportedOperationException;');
});

test('array null/cast/bounds errors and wrong logical arity leave storage untouched', () => {
  const t = thread(), state = storage('I', [17, 9, 23]);
  failed(operateVarHandleStorage(t, state.capability, 'set', [null, 1, 10]), t, 'Ljava/lang/NullPointerException;');
  const wrong = storage('J', [Long.ZERO]);
  failed(operateVarHandleStorage(t, state.capability, 'get', [wrong.array, 0]), t, 'Ljava/lang/ClassCastException;');
  for (const index of [-1, 3]) {
    failed(operateVarHandleStorage(t, state.capability, 'compareAndExchange', [state.array, index, 8, 10]), t, 'Ljava/lang/ArrayIndexOutOfBoundsException;');
    assert.deepEqual(state.array.array, [17, 9, 23]);
  }
  failed(operateVarHandleStorage(t, state.capability, 'set', [state.array, 1]), t, 'Ljava/lang/invoke/WrongMethodTypeException;');
  failed(operateVarHandleStorage(t, state.capability, 'get', [state.array, 1, 2]), t, 'Ljava/lang/invoke/WrongMethodTypeException;');
  assert.deepEqual(state.array.array, [17, 9, 23]);
});

test('covariant arrays validate only NEW runtime component even before failed comparisons', () => {
  const t = thread(), left = object(stringClass), middle = object(stringClass), right = object(stringClass);
  const alien = object(otherClass), state = storage('Ljava/lang/Object;', [left, middle, right], false, stringClass);
  for (const mode of ['set', 'setOpaque', 'setRelease', 'setVolatile', 'getAndSet', 'getAndSetAcquire', 'getAndSetRelease']) {
    failed(run(t, state, mode, alien), t, 'Ljava/lang/ArrayStoreException;');
    assert.deepEqual(state.array.array, [left, middle, right]);
  }
  for (const mode of ['compareAndSet', 'weakCompareAndSet', 'compareAndExchange', 'compareAndExchangeAcquire', 'compareAndExchangeRelease']) {
    failed(run(t, state, mode, alien, alien), t, 'Ljava/lang/ArrayStoreException;');
    assert.deepEqual(state.array.array, [left, middle, right]);
    // An alien expected is legal for an Object[] handle if NEW fits String[].
    passed(run(t, state, mode, alien, right), mode.includes('Exchange') ? middle : 0);
    assert.deepEqual(state.array.array, [left, middle, right]);
  }
  passed(run(t, state, 'setRelease', right), null);
  assert.deepEqual(state.array.array, [left, right, right]);
});

test('declared reference casts remain CCE rather than runtime-array ASE', () => {
  const t = thread(), middle = object(stringClass), alien = object(otherClass);
  const state = storage('Ljava/lang/String;', [middle, middle, middle]);
  failed(run(t, state, 'compareAndSet', alien, middle), t, 'Ljava/lang/ClassCastException;');
  failed(run(t, state, 'set', alien), t, 'Ljava/lang/ClassCastException;');
  assert.deepEqual(state.array.array, [middle, middle, middle]);
});

test('instance fields share exact backing properties and reject null/unrelated receivers', () => {
  const t = thread(), owner = cls('Lowner/Cell;'), child = cls('Lowner/Child;', owner);
  const member = field(owner, 'value', 'J');
  const capability = {field: member, readonly: false};
  const receiver = object(child), wide = Long.fromString('9007199254740993');
  receiver[member.fullName] = wide;
  passed(operateVarHandleStorage(t, capability, 'get', [receiver]), wide);
  passed(operateVarHandleStorage(t, capability, 'compareAndSet', [receiver, Long.fromString(wide.toString()), Long.MIN_VALUE]), 1);
  assert.ok(receiver[member.fullName].equals(Long.MIN_VALUE));
  failed(operateVarHandleStorage(t, capability, 'get', [null]), t, 'Ljava/lang/NullPointerException;');
  failed(operateVarHandleStorage(t, capability, 'get', [object(otherClass)]), t, 'Ljava/lang/ClassCastException;');
  assert.ok(receiver[member.fullName].equals(Long.MIN_VALUE));
});

test('static declaration ownership is exact and lifecycle remains the native wrapper responsibility', () => {
  const t = thread(), owner = cls('Lbase/Static;'), child = cls('Lchild/Static;', owner);
  const member = field(owner, 'value', 'I', true), declarationStorage = {[member.fullName]: 9};
  let constructorReads = 0;
  owner.getConstructor = () => { constructorReads++; return declarationStorage; };
  child.getConstructor = forbidden('symbolic child constructor');
  const capability = {field: member, readonly: false};
  passed(operateVarHandleStorage(t, capability, 'getAndAdd', [2]), 9);
  assert.equal(declarationStorage[member.fullName], 11);
  assert.equal(constructorReads, 1);
  owner.isInitialized = () => false;
  failed(operateVarHandleStorage(t, capability, 'set', [12]), t, 'Ljava/lang/InternalError;');
  assert.equal(declarationStorage[member.fullName], 11);
  assert.equal(constructorReads, 1);
});

test('reference field class checks read loaded cache only and never resolve or initialize', () => {
  const t = thread(), owner = cls('Lowner/References;');
  const member = field(owner, 'value', 'Ljava/lang/String;');
  const receiver = object(owner), first = object(stringClass), second = object(stringClass);
  receiver[member.fullName] = first;
  const cacheReads = [];
  owner.getLoader = () => ({getLoadedClass: name => { cacheReads.push(name); return stringClass; },
    getResolvedClass: forbidden('getResolvedClass'), loadClass: forbidden('loadClass'), resolveClass: forbidden('resolveClass')});
  const capability = {field: member, readonly: false};
  passed(operateVarHandleStorage(t, capability, 'compareAndExchange', [receiver, first, second]), first);
  assert.equal(receiver[member.fullName], second);
  assert.deepEqual(cacheReads, ['Ljava/lang/String;']);
  failed(operateVarHandleStorage(t, capability, 'set', [receiver, object(otherClass)]), t, 'Ljava/lang/ClassCastException;');
  assert.equal(receiver[member.fullName], second);
});

test('invalid capability/mode reports guest failure without accessing backing storage', () => {
  const t = thread(), state = storage('I', [17, 9, 23]);
  failed(operateVarHandleStorage(t, state.capability, '__proto__', [state.array, 1]), t, 'Ljava/lang/IllegalArgumentException;');
  failed(operateVarHandleStorage(t, {readonly: false}, 'get', []), t, 'Ljava/lang/InternalError;');
  const owner = cls('Lowner/Invalid;');
  failed(operateVarHandleStorage(t, {...state.capability, field: field(owner, 'value', 'I')}, 'get', []), t, 'Ljava/lang/InternalError;');
  assert.deepEqual(state.array.array, [17, 9, 23]);
});
