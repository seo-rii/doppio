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
  createMethodType(thread, bootstrap, descriptor, callback) {
    thread.createMethodType(bootstrap, descriptor, callback);
  },
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
  operation: 'operationHandle()Ljava/lang/invoke/MethodHandle;',
  selector: 'selectorHandle()Ljava/lang/invoke/MethodHandle;',
  final: 'fieldIsFinal(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;Z)Z',
  field: 'captureField(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;Z)V',
  array: 'captureArray(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;)V',
  copy: 'copyStorage(Ljava/lang/invoke/VarHandle;Ljava/lang/invoke/VarHandle;)V',
  operate: 'operate(Ljava/lang/invoke/VarHandle;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/Object;',
  find: 'findVirtualBase(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;',
  nominalKind: 'nominalKind(Ljava/lang/invoke/VarHandle;)I',
  nominalOwner: 'nominalOwner(Ljava/lang/invoke/VarHandle;)Ljava/lang/Class;',
  nominalName: 'nominalName(Ljava/lang/invoke/VarHandle;)Ljava/lang/String;'
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

const lookupName = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const helperName = 'Ljava/lang/invoke/DoppioVarHandles;';
const trustedField = 'java/lang/invoke/MethodHandles$Lookup/IMPL_LOOKUP';
const findStaticAlias = 'java/lang/invoke/MethodHandles$Lookup/findStatic(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;';
const privateMembers = [
  ['operation', 'operate', '(Ljava/lang/invoke/VarHandle;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/Object;'],
  ['selector', 'select', '(Ljava/lang/invoke/VarHandle;Ljava/lang/invoke/VarHandle$AccessMode;Ljava/lang/invoke/MethodType;Z)Ljava/lang/invoke/MethodHandle;']
];
function helperWorld() {
  const w = world(), bootstrap = w.thread.getBsCl();
  const lookupClass = w.register(new ReferenceClass(lookupName, w.objectClass));
  const helperClass = w.register(new ReferenceClass(helperName, w.objectClass));
  const helperMirror = mirror(helperClass), trusted = reference(lookupClass), typeRequests = [], findRequests = [], interned = [];
  lookupClass.initialized = helperClass.initialized = false;
  w.constructors.get(lookupName)[trustedField] = trusted;
  helperClass.getClassObject = thread => { assert.equal(thread, w.thread); return helperMirror; };
  w.thread.getJVM = () => ({internString(name) {
    interned.push(name); w.events.push(['intern', name]); return text(name);
  }});
  w.thread.createMethodType = (loader, descriptor, callback) => {
    assert.equal(loader, bootstrap); w.events.push(['method-type', descriptor]);
    typeRequests.push({descriptor, callback});
  };
  trusted[findStaticAlias] = function(thread, args, callback) {
    assert.equal(this, trusted); assert.equal(thread, w.thread);
    w.events.push(['find-static', args[1].toString()]); findRequests.push({args, callback});
  };
  return {...w, bootstrap, lookupClass, helperClass, helperMirror, trusted, typeRequests, findRequests, interned};
}

test('registration retains eight bridges, exactly three C6 readonly projections and 31 canonical shim declarations', () => {
  assert.deepEqual(Object.keys(natives).sort(), ['java/lang/invoke/DoppioVarHandles', 'java/lang/invoke/VarHandle']);
  assert.deepEqual(Object.keys(helper).sort(), Object.values(signatures).sort());
  assert.equal(Object.keys(helper).length, 11);
  for (const name of ['nominalKind', 'nominalOwner', 'nominalName']) {
    assert.equal(helper[signatures[name]].length, 2, 'Only the implicit thread and held VarHandle: ' + name);
  }
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

test('actual source native registrar accepts every bridge and canonical method map', () => {
  // Execute the real registrar body in isolation, without constructing a JVM,
  // touching its global registry or depending on a newly built artifact.
  const filename = path.resolve(__dirname, '../src/jvm.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const declarations = parsed.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === 'JVM');
  assert.equal(declarations.length, 1);
  const methods = declarations[0].members.filter(node => ts.isMethodDeclaration(node) &&
    ts.isIdentifier(node.name) && node.name.text === 'registerNatives');
  assert.equal(methods.length, 1);
  const originalMethod = methods[0].getText(parsed);
  const compiled = ts.transpileModule('export default class Registrar {\n' + originalMethod + '\n}', {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'},
    reportDiagnostics: true
  });
  assert.deepEqual(compiled.diagnostics, []);
  const isolated = new Module(filename, module);
  isolated.require = id => assert.fail('Pure native registrar unexpectedly imported ' + id);
  isolated._compile(compiled.outputText, filename);
  const registry = {natives: {}};
  assert.doesNotThrow(() => isolated.exports.default.prototype.registerNatives.call(registry, natives));
  assert.deepEqual(Object.keys(registry.natives).sort(), Object.keys(natives).sort());
  let count = 0;
  for (const [owner, methods] of Object.entries(natives)) {
    assert.deepEqual(Object.keys(registry.natives[owner]).sort(), Object.keys(methods).sort());
    for (const [signature, method] of Object.entries(methods)) {
      assert.equal(registry.natives[owner][signature], method);
      count++;
    }
  }
  assert.equal(count, 42, 'Exactly eleven fixed helper hooks plus31 canonical access placeholders');
});

test('zero-argument helper natives resolve only the two canonical private bootstrap members', () => {
  for (const [entry, name, descriptor] of privateMembers) {
    const w = helperWorld(), callerOwner = {}, callerName = text('caller-controlled'), callerType = {};
    const native = helper[signatures[entry]];
    assert.equal(native.length, 1, 'Only the implicit thread parameter');
    assert.equal(native(w.thread, callerOwner, callerName, callerType), undefined);
    assert.deepEqual(w.returns, []);
    assert.equal(w.pending.has(lookupName), true); assert.equal(w.pending.has(helperName), false);
    w.succeed(lookupName);
    assert.equal(w.pending.has(helperName), true); assert.deepEqual(w.typeRequests, []);
    w.succeed(helperName);
    assert.equal(w.typeRequests.length, 1); assert.equal(w.typeRequests[0].descriptor, descriptor);
    const canonicalType = {descriptor}; w.typeRequests[0].callback(null, canonicalType);
    assert.equal(w.findRequests.length, 1);
    const request = w.findRequests[0];
    assert.equal(request.args[0], w.helperMirror);
    assert.equal(request.args[0].$cls, w.helperClass);
    assert.equal(request.args[1].toString(), name);
    assert.equal(request.args[2], canonicalType);
    assert.deepEqual(w.interned, [name]);
    assert.equal(request.args.includes(callerOwner) || request.args.includes(callerName) || request.args.includes(callerType), false);
    const methodHandle = {name: 'private method handle'}; request.callback(null, methodHandle);
    assert.deepEqual(w.returns, [methodHandle]); assert.notEqual(w.returns[0], w.trusted);
    assert.deepEqual(w.errors, []);
  }
});

test('private helper Lookup/owner initialization failures preserve identity and prevent later stages', () => {
  for (const failedClass of [lookupName, helperName]) {
    const w = helperWorld(), original = {name: 'original private helper initializer failure'};
    helper[signatures.operation](w.thread);
    if (failedClass === helperName) w.succeed(lookupName);
    const callback = w.fail(failedClass, original);
    assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
    assert.deepEqual(w.typeRequests, []); assert.deepEqual(w.findRequests, []);
    w.classes.get(failedClass).initialized = true; callback(w.classes.get(failedClass));
    assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
    assert.deepEqual(w.typeRequests, []); assert.deepEqual(w.findRequests, []);
    if (failedClass === lookupName) assert.equal(w.pending.has(helperName), false);
  }
});

test('private helper canonical MethodType failure propagates its original Throwable without lookup/return', () => {
  const w = helperWorld(), original = {name: 'original canonical MethodType failure'};
  helper[signatures.selector](w.thread); w.succeed(lookupName); w.succeed(helperName);
  const callback = w.typeRequests[0].callback;
  callback(original, null);
  assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []); assert.deepEqual(w.findRequests, []);
  callback(null, {});
  assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []); assert.deepEqual(w.findRequests, []);
});

test('private helper fixed findStatic failures preserve the original Throwable rather than returning Lookup', () => {
  for (const [entry] of privateMembers) {
    const w = helperWorld(), original = {name: 'original private findStatic failure'};
    helper[signatures[entry]](w.thread); w.succeed(lookupName); w.succeed(helperName);
    w.typeRequests[0].callback(null, {});
    const callback = w.findRequests[0].callback;
    callback(original);
    assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
    callback(null, w.trusted);
    assert.deepEqual(w.errors, [original]); assert.deepEqual(w.returns, []);
  }
});

test('every private helper continuation is latched against duplicate asynchronous callbacks', () => {
  const w = helperWorld(); helper[signatures.operation](w.thread);
  const lookupCallback = w.succeed(lookupName); lookupCallback(w.lookupClass);
  const ownerCallback = w.succeed(helperName); ownerCallback(w.helperClass);
  assert.equal(w.typeRequests.length, 1);
  const typeCallback = w.typeRequests[0].callback; typeCallback(null, {}); typeCallback(null, {});
  assert.equal(w.findRequests.length, 1);
  const findCallback = w.findRequests[0].callback, methodHandle = {};
  findCallback(null, methodHandle); findCallback(null, {});
  assert.deepEqual(w.returns, [methodHandle]); assert.deepEqual(w.errors, []);
  assert.deepEqual(w.interned, ['operate']);
});

test('private helper synchronous cached continuations still complete exactly once', () => {
  const w = helperWorld(), methodHandle = {};
  w.bootstrap.initializeClass = (thread, name, callback) => {
    assert.equal(thread, w.thread); const cls = w.classes.get(name); cls.initialized = true;
    callback(cls); callback(cls);
  };
  w.thread.createMethodType = (loader, descriptor, callback) => {
    assert.equal(loader, w.bootstrap); assert.equal(descriptor, privateMembers[0][2]); callback(null, {}); callback(null, {});
  };
  w.trusted[findStaticAlias] = function(thread, args, callback) {
    assert.equal(this, w.trusted); assert.equal(args[0], w.helperMirror); assert.equal(args[1].toString(), 'operate');
    callback(null, methodHandle); callback(null, {});
  };
  assert.equal(helper[signatures.operation](w.thread), undefined);
  assert.deepEqual(w.returns, [methodHandle]); assert.deepEqual(w.errors, []);
});

test('same-named foreign helper metadata never grants the fixed bootstrap lookup capability', () => {
  for (const stage of ['lookup', 'owner']) {
    const w = helperWorld(); helper[signatures.operation](w.thread);
    if (stage === 'owner') w.succeed(lookupName);
    const name = stage === 'lookup' ? lookupName : helperName;
    const foreign = new ReferenceClass(name, w.objectClass);
    foreign.initialized = true; foreign.getLoader = () => ({});
    w.pending.get(name)(foreign);
    error(w, 'Ljava/lang/InternalError;'); assert.deepEqual(w.typeRequests, []); assert.deepEqual(w.findRequests, []);
  }
});

test('missing trusted lookup, MethodType or fixed findStatic implementation rejects without exposing authority', () => {
  for (const stage of ['lookup', 'type', 'find']) {
    const w = helperWorld();
    if (stage === 'lookup') delete w.constructors.get(lookupName)[trustedField];
    if (stage === 'find') delete w.trusted[findStaticAlias];
    helper[signatures.operation](w.thread); w.succeed(lookupName);
    if (stage !== 'lookup') {
      w.succeed(helperName); w.typeRequests[0].callback(null, stage === 'type' ? null : {});
    }
    error(w, 'Ljava/lang/InternalError;'); assert.deepEqual(w.findRequests, []);
    assert.equal(w.returns.includes(w.trusted), false);
  }
});

test('private helper findStatic cannot publish a missing MethodHandle or the trusted Lookup itself', () => {
  for (const missing of ['null', 'undefined', 'trusted-lookup']) {
    const w = helperWorld();
    helper[signatures.operation](w.thread); w.succeed(lookupName); w.succeed(helperName);
    w.typeRequests[0].callback(null, {});
    const callback = w.findRequests[0].callback;
    callback(null, missing === 'null' ? null : missing === 'undefined' ? undefined : w.trusted);
    error(w, 'Ljava/lang/InternalError;');
    callback(null, {});
    assert.deepEqual(w.returns, []); assert.equal(w.errors.length, 1);
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

test('field factory missing/incorrect descriptors use NoSuchFieldException without weakening private capture', () => {
  for (const [name, descriptor] of [['missing', 'I'], ['value', 'J']]) {
    const w = world(), owner = w.register(new ReferenceClass('Lowner/Factory;', w.objectClass));
    w.member(owner, 'value', 'I');
    assert.equal(helper[signatures.final](w.thread, mirror(owner), text(name), mirror(w.primitives[descriptor]), 0), undefined);
    error(w, 'Ljava/lang/NoSuchFieldException;'); assert.deepEqual(w.events, []);
    const captureWorld = world(), captureOwner = captureWorld.register(new ReferenceClass('Lowner/Factory;', captureWorld.objectClass));
    captureWorld.member(captureOwner, 'value', 'I'); const handle = {};
    helper[signatures.field](captureWorld.thread, handle, mirror(captureOwner), text(name), mirror(captureWorld.primitives[descriptor]), 0);
    error(captureWorld, 'Ljava/lang/InternalError;'); assert.equal(Object.hasOwn(handle, '$varHandleCapability'), false);
  }
  const w = world(), owner = w.register(new ReferenceClass('Lowner/ReportedType;', w.objectClass));
  const actual = w.member(owner, 'value', 'I');
  // Even an inconsistent metadata query must not substitute the getter's
  // alleged return type for the real declaration descriptor.
  owner.fieldLookup = () => actual;
  helper[signatures.final](w.thread, mirror(owner), text('value'), mirror(w.primitives.J), 0);
  error(w, 'Ljava/lang/NoSuchFieldException;'); assert.deepEqual(w.events, []);
});

test('field factory static/instance mismatches use IllegalAccessException, not an internal capture error', () => {
  for (const isStatic of [false, true]) {
    const w = world(), owner = w.register(new ReferenceClass('Lowner/Staticness;', w.objectClass));
    w.member(owner, 'value', 'I', isStatic);
    helper[signatures.final](w.thread, mirror(owner), text('value'), mirror(w.primitives.I), isStatic ? 0 : 1);
    error(w, 'Ljava/lang/IllegalAccessException;'); assert.deepEqual(w.events, []);
  }
});

test('field factory reference identity is checked against actual declaration-loader metadata', () => {
  for (const final of [false, true]) {
    const w = world(), owner = w.register(new ReferenceClass('Lbase/Reference;', w.objectClass));
    const child = w.register(new ReferenceClass('Lchild/Reference;', owner));
    w.member(owner, 'value', 'Ljava/lang/String;', false, final);
    const reads = [], loader = owner.getLoader();
    owner.getLoader = () => ({getLoadedClass(name) { reads.push(name); return loader.getLoadedClass(name); },
      getResolvedClass: () => assert.fail('Factory must not resolve field type'),
      initializeClass: () => assert.fail('Factory must not initialize field type')});
    assert.equal(helper[signatures.final](w.thread, mirror(child), text('value'), mirror(w.stringClass), 0), final);
    assert.deepEqual(reads, ['Ljava/lang/String;']); assert.deepEqual(w.events, []); assert.deepEqual(w.errors, []);
    const foreign = new ReferenceClass('Ljava/lang/String;', w.objectClass);
    helper[signatures.final](w.thread, mirror(child), text('value'), mirror(foreign), 0);
    error(w, 'Ljava/lang/NoSuchFieldException;'); assert.deepEqual(w.events, []);
  }
});

test('field factory null and impossible unlinked metadata retain their separate NPE/InternalError boundaries', () => {
  for (const parameter of [0, 1, 2]) {
    const w = world(), owner = w.register(new ReferenceClass('Lowner/NullMetadata;', w.objectClass));
    const args = [mirror(owner), text('value'), mirror(w.primitives.I), 0]; args[parameter] = null;
    helper[signatures.final](w.thread, ...args); error(w, 'Ljava/lang/NullPointerException;');
  }
  for (const stage of ['owner', 'declaration', 'reference-type']) {
    const w = world(), owner = w.register(new ReferenceClass('Lowner/Unlinked;', w.objectClass));
    const declared = w.register(new ReferenceClass('Lbase/Unlinked;', w.objectClass));
    const descriptor = stage === 'reference-type' ? 'Ljava/lang/String;' : 'I';
    const field = w.member(declared, 'value', descriptor); owner.fieldLookup = () => field;
    if (stage === 'owner') owner.resolved = false;
    if (stage === 'declaration') declared.resolved = false;
    if (stage === 'reference-type') declared.getLoader = () => ({getLoadedClass: () => null});
    helper[signatures.final](w.thread, mirror(owner), text('value'), mirror(stage === 'reference-type' ? w.stringClass : w.primitives.I), 0);
    error(w, 'Ljava/lang/InternalError;'); assert.deepEqual(w.events, []);
  }
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
