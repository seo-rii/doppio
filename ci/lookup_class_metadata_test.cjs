'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');

function nativeRegistry() {
  const filename = path.join(runtime, 'src/natives/java_lang.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename).default();
  const ts = require('typescript'), loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/natives/java_lang.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports.default();
}

const resolveMember = nativeRegistry()['java/lang/invoke/MethodHandleNatives'][
  'resolve(Ljava/lang/invoke/MemberName;Ljava/lang/Class;)Ljava/lang/invoke/MemberName;'];
const {ReferenceClassData} = require(path.join(runtime, 'src/ClassData'));
const {Method} = require(path.join(runtime, 'src/methods'));
const {Flags} = require(path.join(runtime, 'src/util'));
const {ThreadStatus, MethodHandleReferenceKind: Kind} = require(path.join(runtime, 'src/enums'));
const FLAGS = 'java/lang/invoke/MemberName/flags';

// Controlled class-lifecycle metadata exercises the complete native registry,
// refreshMemberNameMethodTarget, and the actual Method bridge generator. These
// units do not claim to be genuine class-file or native-JVM compatibility tests.
function world(options = {}) {
  const state = {ready: options.ready || false, declaringReady: options.ready || false,
    statuses: [], returns: [], errors: [], resolutions: [], lookups: [], constructors: [], indices: [], executions: []};
  const refKind = options.refKind || Kind.INVOKESTATIC;
  const field = options.field || false;
  const constructor = options.constructor === true;
  const name = constructor ? '<init>' : field ? 'value' : 'target';
  const descriptor = field ? 'I' : constructor ? '()V' : '()I';
  const initialFlags = (field ? 0x40000 : constructor ? 0x20000 : 0x10000) | (refKind << 24);
  const thread = {
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
  const targetField = {cls: declaring, name, accessFlags: new Flags(refKind === Kind.GETSTATIC ? 9 : 1)};
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
    fieldLookup(requested) {
      assert.equal(state.ready, true, 'Native field lookup must wait for full linking');
      assert.equal(requested, name);
      state.lookups.push(requested);
      return options.missing ? null : targetField;
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
    getConstructor, initialize: noInitialization, tryToInitialize: noInitialization
  });
  const member = {
    'java/lang/invoke/MemberName/clazz': {$cls: clazz},
    'java/lang/invoke/MemberName/name': {toString: () => name},
    'java/lang/invoke/MemberName/type': {toString: () => descriptor},
    [FLAGS]: initialFlags
  };
  return {
    state, clazz, declaring, member, method, targetField, initialFlags, refKind,
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
