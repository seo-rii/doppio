'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');

// Source native wrappers + actual source storage/gLong, with controlled class,
// boxing, and thread boundaries. These are not genuine javac/host evidence or
// claims that fake initialization proves the VM's Java lifecycle/ordering.
const types = {Z: 'Boolean', B: 'Byte', C: 'Character', S: 'Short', I: 'Integer', J: 'Long', F: 'Float', D: 'Double'};
const statuses = {ASYNC_WAITING: 6};
class ReferenceClass {
  constructor(name, parent = null) { this.name = name; this.parent = parent; this.initialized = true; this.resolved = true; this.fields = []; }
  getInternalName() { return this.name; }
  isResolved() { return this.resolved; }
  isInitialized() { return this.initialized; }
  isCastable(target) { return this === target || this.parent !== null && this.parent.isCastable(target); }
  fieldLookup(name, descriptor) { return this.fields.find(field => field.name === name && field.rawDescriptor === descriptor) || this.parent?.fieldLookup(name, descriptor) || null; }
}
class ArrayClass extends ReferenceClass {
  constructor(component) { super('[' + component.getInternalName()); this.component = component; }
  getComponentClass() { return this.component; }
  isCastable(target) { return this === target || target instanceof ArrayClass && this.component.isCastable(target.component); }
}
const mockUtil = {
  is_primitive_type: descriptor => descriptor.length === 1,
  boxClassName: descriptor => 'Ljava/lang/' + types[descriptor] + ';',
  descriptor2typestr: descriptor => descriptor.slice(1, -1),
  unboxArguments(thread, descriptors, values) {
    thread.events.push(['unbox', [...descriptors]]);
    const result = [];
    for (const [index, descriptor] of descriptors.entries()) {
      result.push(descriptor.length === 1 ? values[index].unbox() : values[index]);
      if (descriptor === 'J' || descriptor === 'D') result.push(null);
    }
    return result;
  }
};
const fakeDoppio = {VM: {ClassFile: {ReferenceClassData: ReferenceClass, ArrayClassData: ArrayClass},
  Util: mockUtil, Enums: {ThreadStatus: statuses}}};
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.resolve(__dirname, '../src', name + '.ts'), loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.require = id => {
    if (id === '../doppiojvm') return fakeDoppio;
    if (id === '../VarHandleStorage') return load('VarHandleStorage');
    if (id === './gLong') return load('gLong');
    return assert.fail('Unexpected VarHandle native test dependency: ' + id);
  };
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'},
    reportDiagnostics: true
  });
  assert.deepEqual(compiled.diagnostics, []);
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}
const Long = load('gLong').default;
const natives = load('natives/java_lang_invoke').default();
const helper = natives['java/lang/invoke/DoppioVarHandles'];
const signatures = {
  final: 'fieldIsFinal(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;Z)Z',
  field: 'captureField(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;Z)V',
  array: 'captureArray(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;)V',
  copy: 'copyStorage(Ljava/lang/invoke/VarHandle;Ljava/lang/invoke/VarHandle;)V',
  operate: 'operate(Ljava/lang/invoke/VarHandle;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/Object;',
  find: 'findVirtualBase(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;'
};
const alias = 'java/lang/invoke/MethodHandles$Lookup/doppioFindVirtualBase(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;';
const mirror = cls => ({$cls: cls});
const text = value => ({toString: () => value});
const reference = cls => ({getClass: () => cls});
const argArray = array => ({array});
function world() {
  const events = [], returns = [], errors = [], pending = new Map(), classes = new Map();
  const thread = {events, returns, errors, status: 'running',
    setStatus(status) { events.push(['status', status]); this.status = status; },
    asyncReturn(value) { events.push(['return']); returns.push(value); this.status = 'returned'; },
    throwException(error) { errors.push(error); this.status = 'throwing'; },
    throwNewException(type, message) { errors.push({type, message}); this.status = 'throwing'; },
    getBsCl() { return bootstrap; }};
  const bootstrap = {
    getLoadedClass: name => classes.get(name) || null,
    initializeClass(owner, name, callback) {
      assert.equal(owner, thread); events.push(['initialize-wrapper', name]);
      assert.equal(pending.has(name), false); pending.set(name, callback);
    }
  };
  const objectClass = new ReferenceClass('Ljava/lang/Object;');
  const stringClass = new ReferenceClass('Ljava/lang/String;', objectClass);
  const otherClass = new ReferenceClass('Lother/Value;', objectClass);
  const primitives = Object.fromEntries(Object.keys(types).map(name => [name, new ReferenceClass(name)]));
  const constructors = new Map();
  function register(cls) {
    classes.set(cls.name, cls);
    cls.getLoader = () => bootstrap;
    cls.initialize = (owner, callback) => {
      assert.equal(owner, thread); events.push(['initialize-declaration', cls.name]);
      assert.equal(pending.has(cls.name), false); pending.set(cls.name, callback);
    };
    function Constructor(owner) {
      assert.equal(owner, thread); events.push(['allocate', cls.name]);
      this.getClass = () => cls;
      this.unbox = () => this[cls.name.slice(1, -1) + '/value'];
    }
    constructors.set(cls.name, Constructor);
    cls.getConstructor = owner => {
      assert.equal(owner, thread); assert.equal(cls.initialized, true);
      events.push(['constructor', cls.name]); return Constructor;
    };
    return cls;
  }
  [objectClass, stringClass, otherClass, ...Object.values(primitives)].forEach(register);
  for (const descriptor of Object.keys(types)) register(new ReferenceClass(mockUtil.boxClassName(descriptor), objectClass));
  function boxed(descriptor, value) {
    const wrapper = classes.get(mockUtil.boxClassName(descriptor));
    return {getClass: () => wrapper, unbox: () => value};
  }
  function arrayStorage(descriptor, elements, actualComponent = null) {
    const component = primitives[descriptor] || (descriptor === 'Ljava/lang/String;' ? stringClass : objectClass);
    const arrayClass = register(new ArrayClass(component));
    const actual = actualComponent === null ? arrayClass : register(new ArrayClass(actualComponent));
    const handle = {}, array = {array: elements, getClass: () => actual};
    helper[signatures.array](thread, handle, mirror(arrayClass));
    return {handle, array, arrayClass};
  }
  function member(owner, name, descriptor, isStatic = false, final = false) {
    const field = {cls: owner, name, rawDescriptor: descriptor,
      fullName: owner.name.slice(1, -1) + '/' + name,
      accessFlags: {isStatic: () => isStatic, isFinal: () => final}};
    owner.fields.push(field); return field;
  }
  function fieldStorage(descriptor, value, isStatic = false, final = false) {
    const owner = register(new ReferenceClass('Lowner/Cell;', objectClass));
    const field = member(owner, 'value', descriptor, isStatic, final);
    const receiver = reference(owner), handle = {};
    const backing = isStatic ? constructors.get(owner.name) : receiver;
    backing[field.fullName] = value;
    helper[signatures.field](thread, handle, mirror(owner), text('value'), mirror(primitives[descriptor] || stringClass), isStatic ? 1 : 0);
    return {owner, field, receiver, backing, handle};
  }
  function succeed(name) {
    const callback = pending.get(name); assert.equal(typeof callback, 'function');
    pending.delete(name); classes.get(name).initialized = true; callback(classes.get(name));
    return callback;
  }
  function fail(name, error) {
    const callback = pending.get(name); assert.equal(typeof callback, 'function');
    pending.delete(name); thread.throwException(error); callback(null); return callback;
  }
  return {thread, events, errors, returns, classes, primitives, objectClass, stringClass, otherClass,
    register, boxed, arrayStorage, member, fieldStorage, succeed, fail, pending, constructors};
}
function invoke(w, state, mode, ...arguments_) {
  return helper[signatures.operate](w.thread, state.handle, text(mode), argArray(arguments_));
}
function value(result, descriptor, expected) {
  assert.equal(result.getClass().getInternalName(), mockUtil.boxClassName(descriptor));
  if (descriptor === 'J') assert.ok(result.unbox().equals(expected));
  else assert.ok(Object.is(result.unbox(), expected));
}
function error(w, type) { assert.equal(w.errors.at(-1).type, type); assert.deepEqual(w.returns, []); }

test('registration contains six bridge signatures and exactly the 31 canonical shim declarations', () => {
  assert.deepEqual(Object.keys(natives).sort(), ['java/lang/invoke/DoppioVarHandles', 'java/lang/invoke/VarHandle']);
  assert.deepEqual(Object.keys(helper).sort(), Object.values(signatures).sort());
  const source = fs.readFileSync(path.resolve(__dirname, '../classes/modern_classlib/java/lang/invoke/VarHandle.java'), 'utf8');
  const canonical = [...source.matchAll(/public final native (Object|void|boolean) (\w+)\(Object\.\.\. arguments\);/g)]
    .map(([, result, name]) => name + '([Ljava/lang/Object;)' + ({Object: 'Ljava/lang/Object;', void: 'V', boolean: 'Z'})[result]);
  assert.equal(canonical.length, 31);
  assert.deepEqual(Object.keys(natives['java/lang/invoke/VarHandle']).sort(), canonical.sort());
  for (const native of Object.values(natives['java/lang/invoke/VarHandle'])) {
    const w = world(); assert.equal(native(w.thread, {}, argArray([])), undefined);
    error(w, 'Ljava/lang/UnsupportedOperationException;');
    assert.deepEqual(w.events, []);
  }
});

test('field capture is passive, exact, inherited-declaration-aware and readonly for finals', () => {
  const w = world(), owner = w.register(new ReferenceClass('Lbase/Owner;', w.objectClass));
  const child = w.register(new ReferenceClass('Lchild/Owner;', owner));
  const field = w.member(owner, 'value', 'J', true, true), handle = {};
  owner.initialized = child.initialized = false;
  assert.equal(helper[signatures.final](w.thread, mirror(child), text('value'), mirror(w.primitives.J), 1), true);
  helper[signatures.field](w.thread, handle, mirror(child), text('value'), mirror(w.primitives.J), 1);
  assert.equal(handle.$varHandleCapability.field, field);
  assert.equal(handle.$varHandleCapability.readonly, true);
  assert.ok(Object.isFrozen(handle.$varHandleCapability));
  assert.deepEqual(Object.getOwnPropertyDescriptor(handle, '$varHandleCapability'),
    {value: handle.$varHandleCapability, writable: false, enumerable: false, configurable: false});
  assert.deepEqual(w.events, []); assert.deepEqual(w.errors, []);
});

test('invalid field metadata rejects capture without resolving, initializing or granting a name-only field', () => {
  for (const kind of ['descriptor', 'staticness', 'absent', 'unlinked']) {
    const w = world(), owner = w.register(new ReferenceClass('Lowner/Cell;', w.objectClass)), handle = {};
    w.member(owner, 'value', 'J');
    if (kind === 'unlinked') owner.resolved = false;
    helper[signatures.field](w.thread, handle, mirror(owner), text(kind === 'absent' ? 'missing' : 'value'),
      mirror(kind === 'descriptor' ? w.primitives.I : w.primitives.J), kind === 'staticness' ? 1 : 0);
    error(w, 'Ljava/lang/InternalError;'); assert.equal(Object.hasOwn(handle, '$varHandleCapability'), false);
    assert.deepEqual(w.events, []);
  }
  const w = world();
  helper[signatures.final](w.thread, null, text('value'), mirror(w.primitives.I), 0);
  error(w, 'Ljava/lang/NullPointerException;');
});

test('array capture and view copying retain frozen exact capability identity', () => {
  const w = world(), state = w.arrayStorage('I', [17, 9, 23]), copy = {};
  helper[signatures.copy](w.thread, state.handle, copy);
  assert.equal(copy.$varHandleCapability, state.handle.$varHandleCapability);
  assert.equal(copy.$varHandleCapability.arrayClass, state.arrayClass);
  assert.equal(copy.$varHandleCapability.readonly, false);
  const unrelated = w.arrayStorage('J', [Long.ZERO]);
  helper[signatures.copy](w.thread, unrelated.handle, copy);
  error(w, 'Ljava/lang/InternalError;');
  assert.equal(copy.$varHandleCapability, state.handle.$varHandleCapability);
  assert.deepEqual(w.events, []);
});

test('array/view null, nonarray and uncaptured-source failures do not manufacture a capability', () => {
  for (const kind of ['null-array', 'nonarray', 'null-handle', 'uncaptured-view', 'null-view']) {
    const w = world(), handle = {};
    if (kind === 'null-array') helper[signatures.array](w.thread, handle, null);
    else if (kind === 'nonarray') helper[signatures.array](w.thread, handle, mirror(w.objectClass));
    else if (kind === 'null-handle') helper[signatures.array](w.thread, null, mirror(new ArrayClass(w.primitives.I)));
    else if (kind === 'uncaptured-view') helper[signatures.copy](w.thread, {}, handle);
    else helper[signatures.copy](w.thread, null, handle);
    error(w, kind === 'nonarray' ? 'Ljava/lang/IllegalArgumentException;' :
      kind === 'uncaptured-view' ? 'Ljava/lang/InternalError;' : 'Ljava/lang/NullPointerException;');
    assert.equal(Object.hasOwn(handle, '$varHandleCapability'), false); assert.deepEqual(w.events, []);
  }
});

test('ready int update returns one synchronous prepared box and preserves neighboring storage', () => {
  const w = world(), state = w.arrayStorage('I', [17, 9, 23]);
  const result = invoke(w, state, 'getAndAdd', state.array, w.boxed('I', 1), w.boxed('I', 2));
  value(result, 'I', 9); assert.deepEqual(state.array.array, [17, 11, 23]);
  assert.deepEqual(w.events, [['unbox', ['[I', 'I', 'I']],
    ['constructor', 'Ljava/lang/Integer;'], ['allocate', 'Ljava/lang/Integer;']]);
  assert.deepEqual(w.returns, []); assert.deepEqual(w.errors, []);
});

test('category-2 primitive padding is stripped before the synchronous exact-long operation', () => {
  const w = world(), wide = Long.fromString('9007199254740993');
  const state = w.arrayStorage('J', [Long.fromInt(17), wide, Long.fromInt(23)]);
  const result = invoke(w, state, 'getAndAddAcquire', state.array, w.boxed('I', 1), w.boxed('J', Long.fromInt(3)));
  value(result, 'J', wide); assert.equal(state.array.array[1].toString(), '9007199254740996');
  assert.equal(state.array.array[0].toInt(), 17); assert.equal(state.array.array[2].toInt(), 23);
  assert.deepEqual(w.events[0], ['unbox', ['[J', 'I', 'J']]);
  assert.deepEqual(w.errors, []); assert.deepEqual(w.returns, []);
});

test('CAS boxes boolean rather than the variable type; set returns null without result-wrapper initialization', () => {
  const w = world(), state = w.arrayStorage('I', [17, 9, 23]);
  value(invoke(w, state, 'compareAndSet', state.array, w.boxed('I', 1), w.boxed('I', 8), w.boxed('I', 10)), 'Z', 0);
  value(invoke(w, state, 'compareAndSet', state.array, w.boxed('I', 1), w.boxed('I', 9), w.boxed('I', 10)), 'Z', 1);
  assert.deepEqual(state.array.array, [17, 10, 23]);
  w.events.length = 0; w.classes.get('Ljava/lang/Integer;').initialized = false;
  assert.equal(invoke(w, state, 'setRelease', state.array, w.boxed('I', 1), w.boxed('I', 11)), null);
  assert.deepEqual(state.array.array, [17, 11, 23]);
  assert.deepEqual(w.events, [['unbox', ['[I', 'I', 'I']]]);
  assert.deepEqual(w.returns, []); assert.deepEqual(w.errors, []);
});

test('reference witnesses retain exact identity and null without primitive boxing', () => {
  const w = world(), first = reference(w.stringClass), second = reference(w.stringClass);
  const state = w.arrayStorage('Ljava/lang/Object;', [first, first, second]);
  assert.equal(invoke(w, state, 'compareAndExchange', state.array, w.boxed('I', 1), first, second), first);
  assert.equal(invoke(w, state, 'getAndSetRelease', state.array, w.boxed('I', 1), null), second);
  assert.deepEqual(state.array.array, [first, null, second]);
  assert.equal(w.events.some(event => ['constructor', 'allocate', 'initialize-wrapper'].includes(event[0])), false);
  assert.deepEqual(w.errors, []); assert.deepEqual(w.returns, []);
});

test('double primitive arguments and raw signed-zero witnesses survive boxing/unboxing', () => {
  const w = world(), state = w.arrayStorage('D', [17, -0, 23]);
  const witness = invoke(w, state, 'compareAndExchangeAcquire', state.array, w.boxed('I', 1), w.boxed('D', -0), w.boxed('D', +0));
  value(witness, 'D', -0); assert.ok(Object.is(state.array.array[1], +0));
  assert.deepEqual(w.events[0], ['unbox', ['[D', 'I', 'D', 'D']]);
  assert.deepEqual(w.errors, []);
});

test('result-wrapper initialization is awaited before mutation, then returns only once', () => {
  const w = world(), state = w.arrayStorage('I', [17, 9, 23]);
  const name = 'Ljava/lang/Integer;'; w.classes.get(name).initialized = false;
  assert.equal(invoke(w, state, 'getAndAdd', state.array, w.boxed('I', 1), w.boxed('I', 2)), undefined);
  assert.deepEqual(state.array.array, [17, 9, 23]); assert.deepEqual(w.returns, []);
  assert.deepEqual(w.events, [['unbox', ['[I', 'I', 'I']], ['status', statuses.ASYNC_WAITING], ['initialize-wrapper', name]]);
  const callback = w.succeed(name);
  assert.deepEqual(state.array.array, [17, 11, 23]); assert.equal(w.returns.length, 1);
  value(w.returns[0], 'I', 9);
  callback(w.classes.get(name));
  assert.deepEqual(state.array.array, [17, 11, 23]); assert.equal(w.returns.length, 1);
  assert.deepEqual(w.errors, []);
});

test('wrapper initialization preserves its original failure and cannot mutate or return on a late callback', () => {
  const w = world(), state = w.arrayStorage('I', [17, 9, 23]);
  const name = 'Ljava/lang/Integer;', original = {name: 'original wrapper initializer failure'};
  w.classes.get(name).initialized = false;
  assert.equal(invoke(w, state, 'getAndAdd', state.array, w.boxed('I', 1), w.boxed('I', 2)), undefined);
  const callback = w.fail(name, original);
  assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
  assert.deepEqual(state.array.array, [17, 9, 23]);
  w.classes.get(name).initialized = true; callback(w.classes.get(name));
  assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
  assert.deepEqual(state.array.array, [17, 9, 23]);
});

test('static operations initialize the exact declaration after box preparation and before storage', () => {
  const w = world(), state = w.fieldStorage('I', 9, true);
  state.owner.initialized = false;
  assert.equal(invoke(w, state, 'getAndAddRelease', w.boxed('I', 2)), undefined);
  assert.equal(state.backing[state.field.fullName], 9); assert.deepEqual(w.returns, []);
  assert.deepEqual(w.events, [['unbox', ['I']], ['constructor', 'Ljava/lang/Integer;'],
    ['allocate', 'Ljava/lang/Integer;'], ['status', statuses.ASYNC_WAITING], ['initialize-declaration', state.owner.name]]);
  const callback = w.succeed(state.owner.name);
  assert.equal(state.backing[state.field.fullName], 11); assert.equal(w.returns.length, 1); value(w.returns[0], 'I', 9);
  callback(state.owner); assert.equal(state.backing[state.field.fullName], 11); assert.equal(w.returns.length, 1);
  assert.deepEqual(w.errors, []);
});

test('both wrapper and static declaration prerequisites must finish before any atomic mutation', () => {
  const w = world(), state = w.fieldStorage('I', 9, true), wrapper = 'Ljava/lang/Integer;';
  state.owner.initialized = false; w.classes.get(wrapper).initialized = false;
  assert.equal(invoke(w, state, 'getAndAdd', w.boxed('I', 2)), undefined);
  assert.equal(w.pending.has(state.owner.name), false); assert.equal(state.backing[state.field.fullName], 9);
  w.succeed(wrapper);
  assert.equal(w.pending.has(state.owner.name), true); assert.equal(state.backing[state.field.fullName], 9);
  w.succeed(state.owner.name);
  assert.equal(state.backing[state.field.fullName], 11); value(w.returns[0], 'I', 9);
  assert.deepEqual(w.errors, []); assert.equal(w.returns.length, 1);
});

test('failed or immediately cached static initialization never returns through the original failure', () => {
  for (const synchronous of [false, true]) {
    const w = world(), state = w.fieldStorage('I', 9, true), original = {name: 'original static initializer failure'};
    state.owner.initialized = false;
    if (synchronous) state.owner.initialize = (thread, callback) => { thread.throwException(original); callback(null); };
    assert.equal(invoke(w, state, 'getAndAdd', w.boxed('I', 2)), undefined);
    if (!synchronous) w.fail(state.owner.name, original);
    assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
    assert.equal(state.backing[state.field.fullName], 9);
    assert.equal(w.events.some(event => event[0] === 'constructor' && event[1] === state.owner.name), false);
  }
});

test('backend exceptions after asynchronous preparation never call asyncReturn or change storage', () => {
  for (const stage of ['null-array', 'bounds', 'covariance']) {
    const w = world(), marker = reference(w.stringClass), invalid = reference(w.otherClass);
    const state = stage === 'covariance' ? w.arrayStorage('Ljava/lang/Object;', [marker, marker, marker], w.stringClass) :
      w.arrayStorage('I', [17, 9, 23]);
    const boxType = stage === 'covariance' ? 'Ljava/lang/Boolean;' : 'Ljava/lang/Integer;';
    w.classes.get(boxType).initialized = false;
    if (stage === 'covariance') invoke(w, state, 'compareAndSet', state.array, w.boxed('I', 1), invalid, invalid);
    else invoke(w, state, 'getAndAdd', stage === 'null-array' ? null : state.array, w.boxed('I', -1), w.boxed('I', 2));
    assert.deepEqual(w.returns, []); w.succeed(boxType);
    error(w, stage === 'null-array' ? 'Ljava/lang/NullPointerException;' : stage === 'bounds' ?
      'Ljava/lang/ArrayIndexOutOfBoundsException;' : 'Ljava/lang/ArrayStoreException;');
    assert.deepEqual(state.array.array, stage === 'covariance' ? [marker, marker, marker] : [17, 9, 23]);
  }
});

test('unsupported and final updates reject before unboxing, wrapper preparation or declaration initialization', () => {
  const w = world(), state = w.fieldStorage('I', 9, true, true);
  state.owner.initialized = false;
  assert.equal(invoke(w, state, 'compareAndSet', null, null), undefined);
  error(w, 'Ljava/lang/UnsupportedOperationException;');
  assert.deepEqual(w.events, []); assert.equal(state.backing[state.field.fullName], 9);
  const other = world(), references = other.arrayStorage('Ljava/lang/Object;', [null, null, null]);
  assert.equal(invoke(other, references, 'getAndAdd', null, null, null), undefined);
  error(other, 'Ljava/lang/UnsupportedOperationException;'); assert.deepEqual(other.events, []);
});

test('missing/unknown/malformed/null canonical inputs reject without mutation or native completion', () => {
  for (const stage of ['missing-capability', 'unknown-mode', 'arity', 'null-primitive', 'bad-primitive']) {
    const w = world(), state = w.arrayStorage('I', [17, 9, 23]);
    if (stage === 'missing-capability') state.handle = {};
    const args = stage === 'arity' ? [state.array] :
      [state.array, stage === 'null-primitive' ? null : stage === 'bad-primitive' ? reference(w.stringClass) : w.boxed('I', 1), w.boxed('I', 2)];
    assert.equal(invoke(w, state, stage === 'unknown-mode' ? '__proto__' : 'getAndAdd', ...args), undefined);
    error(w, {'missing-capability': 'Ljava/lang/InternalError;', 'unknown-mode': 'Ljava/lang/IllegalArgumentException;',
      arity: 'Ljava/lang/invoke/WrongMethodTypeException;', 'null-primitive': 'Ljava/lang/NullPointerException;',
      'bad-primitive': 'Ljava/lang/ClassCastException;'}[stage]);
    assert.deepEqual(w.events, []); assert.deepEqual(state.array.array, [17, 9, 23]);
  }
});

test('findVirtualBase calls only the exact private alias and preserves asynchronous result identity', () => {
  const w = world(), owner = mirror(w.objectClass), name = text('ordinary'), type = {}, result = {};
  let complete;
  const lookup = {[alias](thread, args, callback) {
    assert.equal(this, lookup); assert.equal(thread, w.thread); assert.deepEqual(args, [owner, name, type]);
    complete = callback;
  }};
  assert.equal(helper[signatures.find](w.thread, lookup, owner, name, type), undefined);
  assert.deepEqual(w.events, [['status', statuses.ASYNC_WAITING]]); assert.deepEqual(w.returns, []);
  complete(null, result); assert.deepEqual(w.returns, [result]);
  complete(null, {}); assert.deepEqual(w.returns, [result]); assert.deepEqual(w.errors, []);
});

test('findVirtualBase preserves original synchronous/asynchronous Throwable and does not recurse into public findVirtual', () => {
  for (const synchronous of [false, true]) {
    const w = world(), original = {name: 'original lookup failure'}; let complete;
    const lookup = {'findVirtual(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;': () => assert.fail('Public overlay recursed'),
      [alias](thread, args, callback) { complete = callback; if (synchronous) callback(original); }};
    assert.equal(helper[signatures.find](w.thread, lookup, mirror(w.objectClass), text('missing'), {}), undefined);
    if (!synchronous) complete(original);
    assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
    complete(null, {}); assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
  }
});

test('findVirtualBase missing alias/null lookup fails before claiming asynchronous invocation', () => {
  for (const lookup of [null, {}]) {
    const w = world(); helper[signatures.find](w.thread, lookup, mirror(w.objectClass), text('method'), {});
    error(w, lookup === null ? 'Ljava/lang/NullPointerException;' : 'Ljava/lang/InternalError;'); assert.deepEqual(w.events, []);
  }
});
