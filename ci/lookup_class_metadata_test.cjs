'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');

const sourceModules = new Set(['doppiojvm', 'VM', 'ClassFile', 'ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods', 'util',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations',
  'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters', 'SymbolicResolution', 'ClassAccess', 'method_handles', 'natives/java_lang',
  'natives/java_lang_constant', 'natives/java_lang_invoke', 'VarHandleStorage']);
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

const nativeRegistry = load('natives/java_lang').default();
const resolveMember = nativeRegistry['java/lang/invoke/MethodHandleNatives'][
  'resolve(Ljava/lang/invoke/MemberName;Ljava/lang/Class;)Ljava/lang/invoke/MemberName;'];
const {ReferenceClassData} = load('ClassData');
const {Method} = load('methods');
const {Flags} = load('util');
const {ThreadStatus, MethodHandleReferenceKind: Kind} = require(path.join(runtime, 'src/enums'));
const FLAGS = 'java/lang/invoke/MemberName/flags';

test('MethodType string descriptors retain held hidden and hidden-array descriptors without runtime-name guessing', () => {
  const descriptor = nativeRegistry['java/lang/invoke/MethodType']['toMethodDescriptorString()Ljava/lang/String;'];
  const bootstrap = {getLoadedClass: () => undefined, initializeClass: () => assert.fail('No initialization'),
    resolveClass: () => assert.fail('No resolution')};
  // Real source descriptor construction, controlled Java String allocation.
  bootstrap.getResolvedClass = name => {
    assert.equal(name, 'Ljava/lang/String;');
    return {getConstructor: () => class JavaString {}};
  };
  bootstrap.getInitializedClass = (thread, name) => {
    assert.equal(thread, null); assert.equal(name, '[C');
    return {getConstructor: () => class CharArray {
      constructor(thread, size) { this.array = new Array(size); }
    }};
  };
  const mirror = value => ({$cls: {getInternalName: () => value}});
  const thread = {getBsCl: () => bootstrap};
  for (const [result, parameters, expected] of [
    ['V', ['Lscope/Hidden.0xabc;'], '(Lscope/Hidden.0xabc;)V'],
    ['Lscope/Hidden.0xabc;', ['[Lscope/Hidden.0xdef;', 'J'], '([Lscope/Hidden.0xdef;J)Lscope/Hidden.0xabc;'],
    ['J', ['I', '[[Ljava/lang/String;'], '(I[[Ljava/lang/String;)J']
  ]) {
    const value = descriptor(thread, {'java/lang/invoke/MethodType/rtype': mirror(result),
      'java/lang/invoke/MethodType/ptypes': {array: parameters.map(mirror)}});
    assert.equal(value['java/lang/String/value'].array.map(c => String.fromCharCode(c)).join(''), expected);
  }
});

// Controlled class-lifecycle metadata exercises the complete native registry,
// refreshMemberNameMethodTarget, and the actual Method bridge generator. These
// units do not claim to be genuine class-file or native-JVM compatibility tests.
function world(options = {}) {
  const state = {ready: options.ready || false, declaringReady: options.ready || false,
    statuses: [], returns: [], errors: [], resolutions: [], lookups: [], constructors: [], indices: [], executions: [],
    typeReady: options.typeReady !== false, typeResolutions: []};
  const refKind = options.refKind || Kind.INVOKESTATIC;
  const field = options.field || false;
  const constructor = options.constructor === true;
  const name = constructor ? '<init>' : field ? 'value' : 'target';
  const descriptor = field ? 'I' : constructor ? '()V' : '()I';
  const initialFlags = (field ? 0x40000 : constructor ? 0x20000 : 0x10000) | (refKind << 24);
  const thread = {
    getJVM: () => ({shouldDumpCompiledCode: () => false}),
    setStatus(status) { state.statuses.push(status); },
    asyncReturn(value) { state.returns.push(value); },
    throwException(error) { state.errors.push(error); },
    throwNewException(kind, message) { state.errors.push({kind, message}); }
  };
  const clazz = Object.create(ReferenceClassData.prototype);
  const declaring = options.inherited ? Object.create(ReferenceClassData.prototype) : clazz;
  const method = Object.assign(Object.create(Method.prototype), {
    cls: declaring, name, rawDescriptor: descriptor, signature: name + descriptor,
    fullSignature: 'fixture/Declaring/' + name + descriptor,
    escapedSignature: name + descriptor, escapedFullSignature: 'fixture/Declaring/' + name + descriptor,
    isStatic: refKind === Kind.INVOKESTATIC,
    accessFlags: new Flags(refKind === Kind.INVOKESTATIC ? 9 : 1),
    isCallerSensitive: () => false,
    vmTargetBridgeMethods: []
  });
  const fieldType = {getInternalName: () => options.requestedDescriptor || descriptor};
  const actualFieldType = options.foreignIdentity ? {getInternalName: () => descriptor} : fieldType;
  const fieldLoader = {
    getResolvedClass(requested) {
      assert.equal(requested, descriptor);
      return state.typeReady ? actualFieldType : null;
    },
    resolveClass(caller, requested, callback, explicit) {
      assert.equal(caller, thread); assert.equal(requested, descriptor);
      state.typeResolutions.push({callback, explicit});
    }
  };
  const targetField = {cls: declaring, name, rawDescriptor: descriptor, accessFlags: new Flags(refKind === Kind.GETSTATIC ? 9 : 1)};
  const jsConstructor = {[method.escapedFullSignature](...args) { state.executions.push(args); }};
  const noInitialization = () => assert.fail('MemberName resolution must not initialize its target');
  function getConstructor(caller) {
    assert.equal(caller, thread);
    assert.equal(state.declaringReady, true, 'Bridge constructor access must wait for full linking');
    state.constructors.push(this);
    return jsConstructor;
  }
  Object.assign(clazz, {
    // Verification alone is deliberately insufficient: preparation may remain
    // pending even after its verification gate has succeeded.
    isVerified: () => true,
    isHierarchyResolved: () => true,
    isResolved: () => state.ready,
    getLoader: () => fieldLoader,
    getExternalName: () => 'fixture.Target',
    getConstructor,
    initialize: noInitialization,
    tryToInitialize: noInitialization,
    resolve(caller, callback, explicit) {
      assert.equal(caller, thread);
      assert.equal(state.statuses.at(-1), ThreadStatus.ASYNC_WAITING);
      state.resolutions.push({callback, explicit});
    },
    signaturePolymorphicAwareMethodLookup(signature) {
      assert.equal(state.ready, true, 'Native member lookup must wait for full linking');
      assert.equal(signature, name + descriptor);
      state.lookups.push(signature);
      return options.missing ? null : method;
    },
    fieldLookup(requested, requestedDescriptor) {
      assert.equal(state.ready, true, 'Native field lookup must wait for full linking');
      assert.equal(requested, name);
      state.lookups.push(requested);
      return options.missing || requestedDescriptor !== descriptor ? null : targetField;
    },
    getVMIndexForMethod(selected) {
      assert.equal(state.ready, true);
      assert.equal(selected, method);
      state.indices.push(selected);
      return 13;
    },
    getVMIndexForField(selected) {
      assert.equal(state.ready, true);
      assert.equal(selected, targetField);
      state.indices.push(selected);
      return 17;
    }
  });
  if (declaring !== clazz) Object.assign(declaring, {
    getConstructor, getLoader: () => fieldLoader, initialize: noInitialization, tryToInitialize: noInitialization
  });
  const member = {
    'java/lang/invoke/MemberName/clazz': {$cls: clazz},
    'java/lang/invoke/MemberName/name': {toString: () => name},
    'java/lang/invoke/MemberName/type': field ? {$cls: fieldType} : {toString: () => descriptor},
    [FLAGS]: initialFlags
  };
  return {
    state, clazz, declaring, member, method, targetField, fieldType, fieldLoader, initialFlags, refKind, thread,
    invoke: () => resolveMember(thread, member, null),
    succeed() {
      assert.equal(state.resolutions.length, 1);
      state.ready = state.declaringReady = true;
      state.resolutions[0].callback(clazz);
    },
    fail(error) {
      assert.equal(state.resolutions.length, 1);
      thread.throwException(error);
      state.resolutions[0].callback(null);
    }
  };
}

function pending(w) {
  assert.equal(w.invoke(), undefined);
  assert.deepEqual(w.state.statuses, [ThreadStatus.ASYNC_WAITING]);
  assert.equal(w.state.resolutions.length, 1);
  assert.equal(w.state.resolutions[0].explicit, false);
  assert.deepEqual(w.state.lookups, []);
  assert.deepEqual(w.state.constructors, []);
  assert.deepEqual(w.state.indices, []);
  assert.deepEqual(w.state.returns, []);
  assert.deepEqual(w.state.errors, []);
  assert.deepEqual(w.state.executions, []);
  assert.equal(w.member[FLAGS], w.initialFlags);
  assert.equal(w.member.vmtarget, undefined);
  assert.equal(w.member.vmindex, undefined);
}

test('an already fully linked class resolves a static handle synchronously without initialization', () => {
  const w = world({ready: true});
  assert.equal(w.invoke(), w.member);
  assert.deepEqual(w.state.statuses, []);
  assert.deepEqual(w.state.resolutions, []);
  assert.deepEqual(w.state.returns, []);
  assert.deepEqual(w.state.errors, []);
  assert.deepEqual(w.state.constructors, [w.declaring]);
  assert.deepEqual(w.state.executions, []);
  assert.equal(w.member[FLAGS], w.initialFlags | 9);
  assert.equal(w.member.vmindex, -1);
  assert.equal(typeof w.member.vmtarget, 'function');
});

function privateNestWorld(field = false, separateLoaders = false) {
  const w = world({ready: true, field, refKind: field ? Kind.GETSTATIC : Kind.INVOKESTATIC});
  const vme = {getInternalName: () => 'Ljava/lang/VirtualMachineError;', isSubclass(base) { return this === base; }};
  const bootstrap = {getLoadedClass: name => name === 'Ljava/lang/VirtualMachineError;' ? vme : null};
  const requests = [], commonLoader = {bootstrap, getResolvedClass: () => w.fieldType}, lookup = Object.create(ReferenceClassData.prototype);
  const members = ['Lfixture/Lookup;', 'Lfixture/Declaring;'];
  const host = Object.assign(Object.create(ReferenceClassData.prototype), {
    getInternalName: () => 'Lfixture/Host;', getPackageName: () => 'fixture', getLoader: () => commonLoader,
    getNestHostReference: () => null, getNestMemberNames: () => members
  });
  const secondLoader = separateLoaders ? {bootstrap, getResolvedClass: () => w.fieldType} : commonLoader;
  const otherHost = separateLoaders ? Object.assign(Object.create(ReferenceClassData.prototype), {
    getInternalName: host.getInternalName, getPackageName: host.getPackageName, getLoader: () => secondLoader,
    getNestHostReference: () => null, getNestMemberNames: () => members
  }) : host;
  for (const [cls, name, loader] of [[lookup, members[0], commonLoader], [w.declaring, members[1], secondLoader]]) {
    const reference = {cls: null, resolveMetadata(thread, definingLoader, caller, callback, explicit) {
      assert.equal(definingLoader, loader); assert.equal(caller, cls); assert.equal(explicit, false);
      requests.push({reference, callback, caller});
    }};
    Object.assign(cls, {getInternalName: () => name, getPackageName: () => 'fixture', getLoader: () => loader,
      getNestHostReference: () => reference, getNestMemberNames: () => []});
  }
  let boundary;
  w.thread.runWithExceptionBoundary = (operation, callback) => {
    boundary = callback;
    operation(value => { boundary = undefined; callback(null, value); });
  };
  (field ? w.targetField : w.method).accessFlags = new Flags(10);
  return {...w, lookup, host, otherHost, requests, vme,
    invoke: () => resolveMember(w.thread, w.member, {$cls: lookup}),
    succeedNest(index, cls) { const request = requests[index]; request.reference.cls = cls; request.callback(true); },
    failNest(error) { const callback = boundary; boundary = undefined; callback(error); }
  };
}

test('private MethodHandle bridges wait for both actual nest hosts before changing Java 8 Lookup access flags', () => {
  const w = privateNestWorld();
  assert.equal(w.invoke(), undefined);
  assert.equal(w.requests.length, 1);
  assert.equal(w.requests[0].caller, w.lookup);
  assert.equal(w.member[FLAGS], w.initialFlags);
  assert.equal(w.member.vmtarget, undefined);
  w.succeedNest(0, w.host);
  assert.equal(w.requests.length, 2);
  assert.equal(w.requests[1].caller, w.declaring);
  assert.deepEqual(w.state.returns, []);
  w.succeedNest(1, w.host);
  assert.deepEqual(w.state.returns, [w.member]);
  assert.equal(w.member[FLAGS] & 7, 1);
  assert.deepEqual(w.state.errors, []);
  assert.deepEqual(w.state.executions, []);
});

test('private MethodHandle fields preserve denied access when same-name nest hosts have different identities', () => {
  const w = privateNestWorld(true, true);
  assert.equal(w.invoke(), undefined);
  w.succeedNest(0, w.host); w.succeedNest(1, w.otherHost);
  assert.deepEqual(w.state.returns, [w.member]);
  assert.equal(w.member[FLAGS] & 7, 2);
  assert.equal(w.member.vmindex, 17);
  assert.deepEqual(w.state.errors, []);
});

test('failed nest metadata lookup preserves private flags and its cached self fallback', () => {
  const w = privateNestWorld();
  assert.equal(w.invoke(), undefined);
  w.failNest({kind: 'Ljava/lang/NoClassDefFoundError;', getClass: () => ({isSubclass: () => false})});
  assert.equal(w.requests.length, 2);
  w.succeedNest(1, w.host);
  assert.equal(w.member[FLAGS] & 7, 2);
  assert.deepEqual(w.state.errors, [], 'Nest determination consumes a failed host lookup');
  assert.deepEqual(w.state.returns, [w.member]);
  assert.equal(w.invoke(), w.member);
  assert.equal(w.requests.length, 2, 'A later lookup reuses the determined self host');
});

for (const field of [false, true]) test('a nest VME preserves unresolved MethodHandle flags and permits retry: ' + (field ? 'field' : 'method'), () => {
  const w = privateNestWorld(field), failure = {getClass: () => w.vme};
  assert.equal(w.invoke(), undefined);
  w.failNest(failure);
  assert.ok(w.state.errors[0] === failure);
  assert.equal(w.state.errors.length, 1);
  assert.deepEqual(w.state.returns, []);
  assert.equal(w.member[FLAGS], w.initialFlags);
  assert.equal(w.member.vmtarget, undefined);
  assert.equal(w.member.vmindex, undefined);
  assert.equal(w.requests.length, 1, 'VME stops before determining the declaring host');
  assert.equal(w.invoke(), undefined);
  assert.equal(w.requests.length, 2, 'Transient VME did not determine a self host');
  w.succeedNest(1, w.host);
  w.succeedNest(2, w.host);
  assert.deepEqual(w.state.returns, [w.member]);
  assert.equal(w.member[FLAGS] & 7, 1);
});

test('a declaring-host VME does not undo a successfully determined referring host', () => {
  const w = privateNestWorld(), failure = {getClass: () => w.vme};
  w.invoke(); w.succeedNest(0, w.host); w.failNest(failure);
  assert.ok(w.state.errors[0] === failure);
  assert.deepEqual(w.state.returns, []);
  assert.equal(w.member[FLAGS], w.initialFlags);
  w.invoke();
  assert.equal(w.requests.length, 3);
  assert.ok(w.requests[2].caller === w.declaring);
  w.succeedNest(2, w.host);
  assert.deepEqual(w.state.returns, [w.member]);
});

test('hierarchy-only or verified-but-unprepared lookup metadata waits before member publication', () => {
  pending(world());
});

test('successful full linking publishes the static bridge and returns the same MemberName exactly once', () => {
  const w = world();
  pending(w);
  w.succeed();
  assert.deepEqual(w.state.returns, [w.member]);
  assert.deepEqual(w.state.errors, []);
  assert.deepEqual(w.state.constructors, [w.declaring]);
  assert.deepEqual(w.state.executions, []);
  assert.equal(w.state.resolutions.length, 1);
  assert.equal(w.member[FLAGS], w.initialFlags | 9);
  assert.equal(w.member.vmindex, -1);
  assert.equal(typeof w.member.vmtarget, 'function');
});

test('an inherited static method waits for linking before accessing its actual declaring constructor', () => {
  const w = world({inherited: true});
  assert.notEqual(w.clazz, w.declaring);
  pending(w);
  w.succeed();
  assert.deepEqual(w.state.returns, [w.member]);
  assert.deepEqual(w.state.constructors, [w.declaring]);
  assert.deepEqual(w.state.executions, []);
});

for (const kind of ['Ljava/lang/VerifyError;', 'Ljava/lang/LinkageError;',
  'Ljava/lang/ClassFormatError;', 'Ljava/lang/NoClassDefFoundError;']) {
  test(`failed linking preserves the original ${kind} without a bridge or extra return`, () => {
    const w = world(), failure = {kind};
    pending(w);
    assert.doesNotThrow(() => w.fail(failure));
    assert.deepEqual(w.state.errors, [failure]);
    assert.equal(w.state.errors[0], failure);
    assert.deepEqual(w.state.lookups, []);
    assert.deepEqual(w.state.constructors, []);
    assert.deepEqual(w.state.returns, []);
    assert.equal(w.member[FLAGS], w.initialFlags);
    assert.equal(w.member.vmtarget, undefined);
    assert.equal(w.member.vmindex, undefined);
  });
}

test('a missing method after linking throws NoSuchMethodError without an asynchronous success return', () => {
  const w = world({missing: true});
  pending(w);
  w.succeed();
  assert.deepEqual(w.state.errors.map(error => error.kind), ['Ljava/lang/NoSuchMethodError;']);
  assert.deepEqual(w.state.returns, []);
  assert.deepEqual(w.state.constructors, []);
  assert.equal(w.member[FLAGS], w.initialFlags);
  assert.equal(w.member.vmtarget, undefined);
});

test('field member resolution waits for linking and preserves field indices without initialization', () => {
  for (const refKind of [Kind.GETSTATIC, Kind.GETFIELD]) {
    const w = world({field: true, refKind});
    pending(w);
    w.succeed();
    assert.deepEqual(w.state.returns, [w.member]);
    assert.deepEqual(w.state.errors, []);
    assert.deepEqual(w.state.constructors, []);
    assert.deepEqual(w.state.indices, [w.targetField]);
    assert.equal(w.member[FLAGS], w.initialFlags | (refKind === Kind.GETSTATIC ? 9 : 1));
    assert.equal(w.member.vmindex, 17);
    assert.equal(w.member.vmtarget, undefined);
  }
});

test('field binding rejects an existing name with a different descriptor before publishing an offset', () => {
  const w = world({ready: true, field: true, refKind: Kind.GETFIELD, requestedDescriptor: 'J'});
  assert.equal(w.invoke(), undefined);
  assert.deepEqual(w.state.errors.map(error => error.kind), ['Ljava/lang/NoSuchFieldError;']);
  assert.deepEqual(w.state.indices, []);
  assert.equal(w.member[FLAGS], w.initialFlags);
  assert.equal(w.member.vmindex, undefined);
});

test('field binding rejects a same-descriptor foreign defining-loader Class identity', () => {
  const w = world({ready: true, field: true, refKind: Kind.GETFIELD, foreignIdentity: true});
  assert.equal(w.invoke(), undefined);
  assert.deepEqual(w.state.errors.map(error => error.kind), ['Ljava/lang/NoSuchFieldError;']);
  assert.deepEqual(w.state.indices, []);
  assert.equal(w.member[FLAGS], w.initialFlags);
  assert.equal(w.member.vmindex, undefined);
});

test('field type linking is passive and completes before publishing the exact field offset', () => {
  const w = world({ready: true, field: true, refKind: Kind.GETFIELD, typeReady: false});
  assert.equal(w.invoke(), undefined);
  assert.deepEqual(w.state.statuses, [ThreadStatus.ASYNC_WAITING]);
  assert.equal(w.state.typeResolutions.length, 1);
  assert.equal(w.state.typeResolutions[0].explicit, false);
  assert.deepEqual(w.state.indices, []);
  assert.equal(w.member.vmindex, undefined);
  w.state.typeReady = true; w.state.typeResolutions[0].callback(w.fieldType);
  assert.deepEqual(w.state.returns, [w.member]);
  assert.deepEqual(w.state.errors, []);
  assert.deepEqual(w.state.indices, [w.targetField]);
  assert.equal(w.member.vmindex, 17);
});

test('asynchronous field type failure keeps the original failure and publishes nothing', () => {
  const w = world({ready: true, field: true, refKind: Kind.GETFIELD, typeReady: false});
  assert.equal(w.invoke(), undefined);
  const failure = {kind: 'Ljava/lang/NoClassDefFoundError;'};
  w.thread.throwException(failure); w.state.typeResolutions[0].callback(null);
  assert.deepEqual(w.state.errors, [failure]);
  assert.deepEqual(w.state.returns, []); assert.deepEqual(w.state.indices, []);
  assert.equal(w.member[FLAGS], w.initialFlags); assert.equal(w.member.vmindex, undefined);
});

test('retained VM-initialized String field descriptors bind only the exact actual descriptor', () => {
  const w = world({ready: true, field: true, refKind: Kind.GETFIELD});
  const stringClass = {};
  w.thread.getBsCl = () => ({getLoadedClass: name => name === 'Ljava/lang/String;' ? stringClass : null});
  w.member['java/lang/invoke/MemberName/type'] = {getClass: () => stringClass, toString: () => 'I'};
  assert.equal(w.invoke(), w.member);
  assert.deepEqual(w.state.indices, [w.targetField]); assert.deepEqual(w.state.errors, []);
  assert.equal(w.member.vmindex, 17);
});

test('virtual, interface, and constructor bridges retain dispatch kinds after the full-link gate', () => {
  for (const options of [{refKind: Kind.INVOKEVIRTUAL}, {refKind: Kind.INVOKEINTERFACE},
    {refKind: Kind.INVOKESPECIAL, constructor: true}]) {
    const w = world(options);
    pending(w);
    w.succeed();
    assert.deepEqual(w.state.returns, [w.member]);
    assert.deepEqual(w.state.errors, []);
    assert.deepEqual(w.state.constructors, []);
    assert.deepEqual(w.state.executions, []);
    assert.equal(w.member[FLAGS], w.initialFlags | 1);
    assert.equal(w.member.vmindex, options.constructor === true ? -1 : 13);
    assert.equal(typeof w.member.vmtarget, 'function');
  }
});
