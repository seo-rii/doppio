'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
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
  loaded.require = id => id === './BootstrapLinkage' ? load('BootstrapLinkage') : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}
const linkage = load('BootstrapLinkage');
const {DynamicConstant, InvokeDynamic} = load('ConstantPool');
const util = require(path.join(runtime, 'src/util'));
const {ConstantPoolItemType: Kind} = require(path.join(runtime, 'src/enums'));
const gLong = require(path.join(runtime, 'src/gLong')).default;
const tick = () => new Promise(resolve => setImmediate(resolve));

// Controlled class identities and Java callbacks isolate the real CP/state
// machinery. These are not a substitute for original-bytecode native/guest
// fixtures and do not establish memory-order or concurrent JVM conformance.
function world(t) {
  const state = {events: [], errors: [], calls: [], identities: [], links: [], lookups: [],
    result: null, bodyError: null, conversionError: null, conversionResult: undefined,
    typeError: null, holdBody: false, pending: null, holdLink: false, pendingLink: null};
  const classes = new Map();
  let bootstrap;
  function cls(name, parent = null) {
    const value = {getInternalName: () => name, getLoader: () => bootstrap,
      isSubclass(base) { return this === base || (parent !== null && parent.isSubclass(base)); },
      getClassObject() { return {$cls: this}; }, getConstructor() { return this.constructor; }};
    classes.set(name, value);
    return value;
  }
  const object = cls('Ljava/lang/Object;'), throwable = cls('Ljava/lang/Throwable;', object),
    error = cls('Ljava/lang/Error;', throwable), linkageError = cls('Ljava/lang/LinkageError;', error),
    lookup = cls('Ljava/lang/invoke/MethodHandles$Lookup;', object),
    callSite = cls('Ljava/lang/invoke/CallSite;', object),
    constantSite = cls('Ljava/lang/invoke/ConstantCallSite;', callSite),
    mutableSite = cls('Ljava/lang/invoke/MutableCallSite;', callSite),
    volatileSite = cls('Ljava/lang/invoke/VolatileCallSite;', callSite);
  for (const [name, parent] of [['BootstrapMethodError', linkageError], ['IllegalAccessError', linkageError],
    ['AssertionError', error], ['StackOverflowError', error], ['OutOfMemoryError', error],
    ['NullPointerException', throwable], ['ClassCastException', throwable], ['IllegalStateException', throwable]]) {
    const type = cls('Ljava/lang/' + name + ';', parent);
    type.constructor = function Exception() {
      this.getClass = () => type;
      this['<init>(Ljava/lang/String;Ljava/lang/Throwable;)V'] = (thread, args, callback) => {
        this.message = args[0]; this.cause = args[1]; callback(null);
      };
    };
  }
  cls('Ljava/lang/invoke/WrongMethodTypeException;', throwable).constructor = function WrongType() {};
  function exception(name, cause) {
    return {getClass: () => classes.get(name), cause};
  }
  lookup.constructor = function Lookup() {
    this.getClass = () => lookup;
    this['<init>(Ljava/lang/Class;I)V'] = (thread, args, callback) => {
      state.lookups.push(this); state.events.push('lookup');
      this.owner = args[0]; this.stockModes = args[1]; callback(null);
    };
  };
  cls('[Ljava/lang/Object;', object).constructor = function ObjectArray(thread, length) { this.array = new Array(length); };
  const wrapperNames = {Z: 'Boolean', B: 'Byte', C: 'Character', S: 'Short', I: 'Integer', J: 'Long', F: 'Float', D: 'Double'};
  function box(descriptor, value) {
    return {descriptor, value, unbox: () => value, getClass: () => classes.get('Ljava/lang/' + wrapperNames[descriptor] + ';')};
  }
  for (const descriptor of Object.keys(wrapperNames)) {
    const type = cls('Ljava/lang/' + wrapperNames[descriptor] + ';', object);
    type.constructor = {box: value => box(descriptor, value)};
    cls(descriptor).getClassObject = () => ({descriptor});
  }
  cls('Ljava/lang/invoke/MethodHandles;', object).constructor = {
    ['java/lang/invoke/MethodHandles/identity(Ljava/lang/Class;)Ljava/lang/invoke/MethodHandle;'](thread, args, callback) {
      state.identities.push(args[0]);
      callback(null, {
        ['invokeWithArguments([Ljava/lang/Object;)Ljava/lang/Object;'](thread, args, done) {
          if (state.conversionError) done(state.conversionError);
          else done(null, state.conversionResult === undefined ? args[0].array[0] : state.conversionResult);
        }
      });
    }
  };
  const member = {vmtarget() {}};
  const invokers = cls('Ljava/lang/invoke/Invokers;', object);
  invokers.constructor = {};
  for (const name of ['linkToTargetMethod', 'linkToCallSiteMethod']) {
    invokers.constructor['java/lang/invoke/Invokers/' + name + '(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MemberName;'] =
      (thread, args, callback) => {
        state.links.push({name, type: args[0]});
        if (state.holdLink) state.pendingLink = () => callback(null, member);
        else callback(null, member);
      };
  }
  bootstrap = {
    initializeClass(thread, name, callback) { state.events.push('initialize:' + name); callback(classes.get(name)); },
    getLoadedClass: name => classes.get(name) || null,
    getInitializedClass: (thread, name) => classes.get(name)
  };
  const loader = {bootstrap, getInitializedClass: (thread, name) => classes.get(name)},
    callerObject = {tag: 'exact-caller-mirror'},
    caller = {getClassObject: () => callerObject, getInternalName: () => 'Lfixtures/BootstrapCaller;', getLoader: () => loader};
  function guestThread() {
    return {boundaries: [], errors: [], getBsCl: () => bootstrap, getJVM: () => ({internString: text => text}),
      setStatus() {},
      throwNewException(name, message) { const value = exception(name); value.message = message; this.throwException(value); },
      throwException(value) {
        assert.ok(value && typeof value.getClass === 'function', 'The original Java Throwable is required');
        if (this.boundaries.length > 0) {
          const callback = this.boundaries.pop(); setImmediate(() => callback(value));
        } else this.errors.push(value);
      },
      runWithExceptionBoundary(operation, callback) {
        this.boundaries.push(callback);
        operation(value => {
          assert.equal(this.boundaries.pop(), callback);
          callback(null, value);
        });
      }};
  }
  const thread = guestThread();
  const type = descriptor => ({descriptor,
    ['equals(Ljava/lang/Object;)Z'](thread, args, callback) { callback(null, args[0].descriptor === descriptor ? 1 : 0); }});
  const originalCreateType = util.createMethodType;
  util.createMethodType = (thread, actualLoader, descriptor, callback) => {
    assert.equal(actualLoader, loader); state.events.push('type:' + descriptor);
    callback(state.typeError, state.typeError ? undefined : type(descriptor));
  };
  t.after(() => { util.createMethodType = originalCreateType; });
  const handleObject = {
    ['java/lang/invoke/MethodHandle/type']: {'java/lang/invoke/MethodType/ptypes': {array: [lookup.getClassObject()]}},
    ['invokeWithArguments([Ljava/lang/Object;)Ljava/lang/Object;'](thread, args, callback) {
      state.calls.push(args[0].array); state.events.push('body');
      const finish = () => callback(state.bodyError, state.bodyError ? undefined : state.result);
      if (state.holdBody) state.pending = finish;
      else finish();
    }
  };
  let handleResolved = false;
  const handle = {methodHandle: handleObject,
    isResolved: () => handleResolved,
    getReference: () => ({classInfo: {name: 'Lfixtures/UserBootstrap;'}, nameAndTypeInfo: {name: 'bootstrap'}}),
    resolve(thread, actualLoader, actualCaller, callback) {
      assert.equal(actualLoader, loader); assert.equal(actualCaller, caller);
      state.events.push('handle'); handleResolved = true; callback(true);
    }};
  const args = [];
  caller.getBootstrapMethod = () => [handle, args];
  function site(kind = 'constant', descriptor = '()I') {
    const target = {tag: 'exact-target-' + state.calls.length},
      targetType = type(descriptor), owner = {constant: constantSite, mutable: mutableSite, volatile: volatileSite}[kind];
    return {target, getClass: () => owner,
      ['type()Ljava/lang/invoke/MethodType;'](thread, args, callback) { callback(null, targetType); },
      ['dynamicInvoker()Ljava/lang/invoke/MethodHandle;'](thread, args, callback) { callback(null, target); }};
  }
  function condy(descriptor = 'I') { return new DynamicConstant(0, {name: 'constant', descriptor}); }
  function indy(descriptor = '()I') { return new InvokeDynamic(0, {name: 'dynamic', descriptor}); }
  const resolve = (value, actualThread = thread) => new Promise(done => value.resolve(actualThread, loader, caller, done));
  const link = (value, key, actualThread = thread) => new Promise(done => value.constructCallSiteObject(actualThread, loader, caller, key, done));
  function item(kind, value, descriptor, resolved = true, label = 'arg', failure = null) {
    return {nameAndTypeInfo: {descriptor}, getType: () => kind, isResolved: () => resolved,
      getConstant: () => value,
      resolve(actualThread, actualLoader, actualCaller, callback) {
        state.events.push(label); resolved = true;
        if (failure) { actualThread.throwException(failure); callback(false); }
        else callback(true);
      }};
  }
  return {state, thread, guestThread, classes, bootstrap, loader, caller, callerObject, handle, handleObject,
    args, exception, box, site, condy, indy, resolve, link, item, member};
}

test('bootstrap success is installed once and wakes other guest threads', async t => {
  const w = world(t), gate = new linkage.BootstrapResolution(), second = w.guestThread();
  let finish, attempts = 0;
  const first = new Promise(done => gate.resolve(w.thread, callback => { attempts++; finish = callback; }, done));
  const waiter = new Promise(done => gate.resolve(second, () => assert.fail('Waiter restarted bootstrap'), done));
  finish(true);
  assert.equal(await first, true); assert.equal(await waiter, true);
  gate.resolve(second, () => assert.fail('Resolved entry restarted bootstrap'), success => assert.equal(success, true));
  assert.equal(attempts, 1);
});

for (const name of ['BootstrapMethodError', 'IllegalAccessError', 'AssertionError', 'OutOfMemoryError', 'StackOverflowError']) {
  test('JVMS bootstrap failure caching retains the exact Error: ' + name, async t => {
    const w = world(t), gate = new linkage.BootstrapResolution(), original = w.exception('Ljava/lang/' + name + ';');
    let attempts = 0;
    const run = () => new Promise(done => gate.resolve(w.thread, callback => {
      attempts++; w.thread.throwException(original); callback(false);
    }, done));
    assert.equal(await run(), false); assert.equal(await run(), false);
    assert.equal(attempts, 1);
    assert.deepEqual(w.thread.errors, [original, original]);
  });
}

test('a non-Error prerequisite failure remains transient', async t => {
  const w = world(t), gate = new linkage.BootstrapResolution(), failure = w.exception('Ljava/lang/IllegalStateException;');
  let attempts = 0;
  assert.equal(await new Promise(done => gate.resolve(w.thread, callback => {
    attempts++; w.thread.throwException(failure); callback(false);
  }, done)), false);
  assert.equal(await new Promise(done => gate.resolve(w.thread, callback => { attempts++; callback(true); }, done)), true);
  assert.equal(attempts, 2); assert.equal(w.thread.errors[0], failure);
});

test('recursive resolution produces a guest StackOverflowError without waiting for itself', async t => {
  const w = world(t), gate = new linkage.BootstrapResolution();
  assert.equal(await new Promise(done => gate.resolve(w.thread, () => {
    gate.resolve(w.thread, () => assert.fail('Cycle began a second operation'), success => assert.equal(success, false));
  }, done)), false);
  assert.equal(w.thread.errors[0].getClass().getInternalName(), 'Ljava/lang/StackOverflowError;');
});

test('static arguments resolve in declared order and retain every object/null identity', async t => {
  const w = world(t), literal = {tag: 'String'}, mirror = {tag: 'Class'}, methodType = {tag: 'MethodType'}, methodHandle = {tag: 'MethodHandle'};
  const items = [w.item(Kind.STRING, literal, null, false, 'first'), w.item(Kind.CLASS, mirror, null, false, 'second'),
    w.item(Kind.METHOD_TYPE, methodType, null), w.item(Kind.METHOD_HANDLE, methodHandle, null), w.item(Kind.DYNAMIC, null, 'Ljava/lang/Object;')];
  const values = await new Promise(done => linkage.resolveBootstrapArguments(w.thread, w.loader, w.caller, items,
    (success, value) => { assert.equal(success, true); done(value); }));
  assert.deepEqual(w.state.events, ['first', 'second']);
  assert.deepEqual(values, [literal, mirror, methodType, methodHandle, null]);
});

test('static numeric arguments and primitive condy use their exact wrapper categories', async t => {
  const w = world(t), wide = gLong.fromString('9007199254740993');
  const items = [w.item(Kind.INTEGER, 257), w.item(Kind.LONG, wide), w.item(Kind.FLOAT, -0), w.item(Kind.DOUBLE, Math.PI),
    w.item(Kind.DYNAMIC, 1, 'Z'), w.item(Kind.DYNAMIC, -127, 'B'), w.item(Kind.DYNAMIC, 65535, 'C'), w.item(Kind.DYNAMIC, -32767, 'S')];
  const values = await new Promise(done => linkage.resolveBootstrapArguments(w.thread, w.loader, w.caller, items,
    (success, value) => { assert.equal(success, true); done(value); }));
  assert.deepEqual(values.map(value => value.descriptor), ['I', 'J', 'F', 'D', 'Z', 'B', 'C', 'S']);
  assert.equal(values[1].unbox(), wide); assert.ok(Object.is(values[2].unbox(), -0));
});

test('a failed earlier static argument prevents later resolution and user bootstrap execution', async t => {
  const w = world(t), constant = w.condy(), failure = w.exception('Ljava/lang/IllegalAccessError;');
  w.args.push(w.item(Kind.CLASS, null, null, false, 'first', failure), w.item(Kind.STRING, 'late', null, false, 'later'));
  assert.equal(await w.resolve(constant), false);
  assert.ok(w.state.events.includes('first')); assert.ok(!w.state.events.includes('later'));
  assert.equal(w.state.calls.length, 0); assert.equal(w.thread.errors[0], failure);
});

test('bootstrap Lookup belongs only to the exact CP caller with ordinary stock and modern ORIGINAL modes', async t => {
  const w = world(t);
  const lookup = await new Promise(done => linkage.createBootstrapLookup(w.thread, w.caller,
    (error, value) => { assert.equal(error, null); done(value); }));
  assert.equal(lookup.owner, w.callerObject); assert.equal(lookup.stockModes, 15);
  assert.equal(lookup['java/lang/invoke/MethodHandles$Lookup/doppioModernModes'], 95);
  assert.equal(lookup.getClass(), w.classes.get('Ljava/lang/invoke/MethodHandles$Lookup;'));
});

test('the actual user handle receives Lookup, name, declared type and unchanged ordered static arguments', async t => {
  const w = world(t), type = {tag: 'exact-type'}, wide = w.box('J', gLong.MAX_VALUE);
  w.state.result = {tag: 'actual-result'};
  const result = await new Promise(done => linkage.invokeBootstrap(w.thread, w.caller, w.handleObject, 'chosenName', type,
    [null, wide], (success, value) => { assert.equal(success, true); done(value); }));
  assert.equal(result, w.state.result); assert.equal(w.state.calls.length, 1);
  const args = w.state.calls[0];
  assert.equal(args[0].owner, w.callerObject); assert.deepEqual(args.slice(1), ['chosenName', type, null, wide]);
});

for (const name of ['AssertionError', 'BootstrapMethodError']) {
  test('user bootstrap Error is passed through without additional wrapping: ' + name, async t => {
    const w = world(t), originalCause = w.exception('Ljava/lang/IllegalStateException;');
    w.state.bodyError = w.exception('Ljava/lang/' + name + ';', originalCause);
    assert.equal(await w.resolve(w.condy()), false);
    assert.equal(w.thread.errors[0], w.state.bodyError); assert.equal(w.thread.errors[0].cause, originalCause);
  });
}

test('ordinary user bootstrap exceptions are wrapped once with the original guest cause', async t => {
  const w = world(t), constant = w.condy();
  w.state.bodyError = w.exception('Ljava/lang/IllegalStateException;');
  assert.equal(await w.resolve(constant), false); assert.equal(await w.resolve(constant), false);
  assert.equal(w.state.calls.length, 1); assert.equal(w.thread.errors.length, 2);
  assert.equal(w.thread.errors[0].getClass().getInternalName(), 'Ljava/lang/BootstrapMethodError;');
  assert.equal(w.thread.errors[0].cause, w.state.bodyError); assert.equal(w.thread.errors[0], w.thread.errors[1]);
});

test('constant conversion uses a typed identity MethodHandle and retains the wide primitive value', async t => {
  const w = world(t), wide = gLong.fromString('9007199254740993'), constant = w.condy('J');
  w.state.result = w.box('J', wide);
  assert.equal(await w.resolve(constant), true); assert.equal(await w.resolve(constant), true);
  assert.equal(constant.getConstant(w.thread), wide); assert.equal(constant.isResolved(), true);
  assert.equal(w.state.identities.length, 1); assert.equal(w.state.identities[0].descriptor, 'J');
  assert.equal(w.state.calls.length, 1);
});

for (const name of ['NullPointerException', 'ClassCastException']) {
  test('constant conversion wraps the specified actual Java failure: ' + name, async t => {
    const w = world(t), constant = w.condy();
    w.state.conversionError = w.exception('Ljava/lang/' + name + ';');
    assert.equal(await w.resolve(constant), false); assert.equal(await w.resolve(constant), false);
    assert.equal(w.thread.errors[0].cause, w.state.conversionError);
    assert.equal(w.thread.errors[0], w.thread.errors[1]); assert.equal(w.state.calls.length, 1);
    assert.equal(constant.isResolved(), false);
  });
}

test('an unrelated constant conversion Error remains the original Error', async t => {
  const w = world(t); w.state.conversionError = w.exception('Ljava/lang/OutOfMemoryError;');
  assert.equal(await w.resolve(w.condy()), false); assert.equal(w.thread.errors[0], w.state.conversionError);
});

for (const shape of ['empty', 'Object', 'wrong-loader Lookup']) {
  test('condy requires the actual leading bootstrap Lookup class before resolving arguments: ' + shape, async t => {
    const w = world(t);
    w.handleObject['java/lang/invoke/MethodHandle/type']['java/lang/invoke/MethodType/ptypes'].array =
      shape === 'empty' ? [] : [{$cls: shape === 'Object' ? w.classes.get('Ljava/lang/Object;') : {name: 'Lookup'}}];
    w.args.push(w.item(Kind.STRING, 'late', null, false, 'arg'));
    assert.equal(await w.resolve(w.condy()), false);
    assert.equal(w.thread.errors[0].getClass().getInternalName(), 'Ljava/lang/BootstrapMethodError;');
    assert.equal(w.state.calls.length, 0); assert.ok(!w.state.events.includes('arg'));
  });
}

test('self-referential static condy arguments cannot resolve to a default/null value', async t => {
  const w = world(t), constant = w.condy(); w.args.push(constant);
  assert.equal(await w.resolve(constant), false); assert.equal(constant.isResolved(), false);
  assert.equal(w.thread.errors[0].getClass().getInternalName(), 'Ljava/lang/StackOverflowError;');
  assert.equal(w.state.calls.length, 0);
});

test('distinct method/BCI lexical sites sharing one CP entry bootstrap independently', async t => {
  const w = world(t), dynamic = w.indy();
  const keys = ['fixtures/Caller/first()I@0', 'fixtures/Caller/first()I@5', 'fixtures/Caller/second()I@0'];
  const targets = [];
  for (const key of keys) {
    w.state.result = w.site(); targets.push(w.state.result.target);
    assert.equal(await w.link(dynamic, key), true);
  }
  w.state.result = null;
  for (const [index, key] of keys.entries()) {
    assert.equal(await w.link(dynamic, key), true);
    assert.equal(dynamic.getCallSiteObject(key)[1], targets[index]);
  }
  assert.equal(w.state.calls.length, 3); assert.equal(w.state.links.length, 3);
});

for (const kind of ['constant', 'mutable', 'volatile']) {
  test('CallSite uses the retained linker and exact appendix appropriate to its kind: ' + kind, async t => {
    const w = world(t), dynamic = w.indy(); w.state.result = w.site(kind);
    assert.equal(await w.link(dynamic, 'caller/method()I@0'), true);
    assert.equal(w.state.links[0].name, kind === 'constant' ? 'linkToTargetMethod' : 'linkToCallSiteMethod');
    assert.equal(dynamic.getCallSiteObject('caller/method()I@0')[0], w.member);
    assert.equal(dynamic.getCallSiteObject('caller/method()I@0')[1], kind === 'constant' ? w.state.result.target : w.state.result);
  });
}

for (const invalid of ['null', 'wrong class', 'wrong target type']) {
  test('invalid CallSite result caches the exact validation error at only its lexical site: ' + invalid, async t => {
    const w = world(t), dynamic = w.indy();
    w.state.result = invalid === 'null' ? null : invalid === 'wrong class' ?
      {getClass: () => w.classes.get('Ljava/lang/Object;')} : w.site('constant', '()J');
    assert.equal(await w.link(dynamic, 'first()I@0'), false); assert.equal(await w.link(dynamic, 'first()I@0'), false);
    assert.equal(w.thread.errors[0], w.thread.errors[1]);
    assert.equal(w.thread.errors[0].cause.getClass().getInternalName(), invalid === 'wrong target type' ?
      'Ljava/lang/invoke/WrongMethodTypeException;' : 'Ljava/lang/ClassCastException;');
    assert.equal(dynamic.getCallSiteObject('first()I@0'), null); assert.equal(w.state.links.length, 0);
    w.state.result = w.site(); assert.equal(await w.link(dynamic, 'second()I@0'), true);
    assert.equal(w.state.calls.length, 2);
  });
}

test('the linker does not publish a CallSite while MemberName linkage is pending', async t => {
  const w = world(t), dynamic = w.indy(); w.state.result = w.site(); w.state.holdLink = true;
  const pending = w.link(dynamic, 'call()I@0');
  assert.equal(dynamic.getCallSiteObject('call()I@0'), null);
  assert.ok(w.state.pendingLink); w.state.pendingLink(); assert.equal(await pending, true);
  assert.equal(dynamic.getCallSiteObject('call()I@0')[0], w.member);
});

test('one in-flight lexical site wakes a second thread without a second user invocation', async t => {
  const w = world(t), dynamic = w.indy(), second = w.guestThread();
  w.state.result = w.site(); w.state.holdBody = true;
  const first = w.link(dynamic, 'call()I@0'), other = w.link(dynamic, 'call()I@0', second);
  assert.equal(w.state.calls.length, 1); assert.equal(dynamic.getCallSiteObject('call()I@0'), null);
  w.state.pending(); assert.equal(await first, true); assert.equal(await other, true);
  assert.equal(w.state.calls.length, 1);
});

test('declared type failure precedes static arguments and retains its original error', async t => {
  const w = world(t), dynamic = w.indy(); w.state.typeError = w.exception('Ljava/lang/IllegalAccessError;');
  w.args.push(w.item(Kind.STRING, 'late', null, false, 'late'));
  assert.equal(await w.link(dynamic, 'call()I@0'), false);
  assert.ok(w.state.events.indexOf('handle') < w.state.events.indexOf('type:()I'));
  assert.ok(!w.state.events.includes('late')); assert.equal(w.state.calls.length, 0);
  assert.equal(w.thread.errors[0], w.state.typeError);
});

test('the actual native registrar installs both CallSite target-update hooks', () => {
  const natives = load('natives/java_lang').default(), name = 'java/lang/invoke/MethodHandleNatives',
    registry = {natives: {}}, JVM = require(path.join(runtime, 'src/jvm')).default;
  JVM.prototype.registerNatives.call(registry, natives);
  for (const kind of ['Normal', 'Volatile']) {
    const signature = 'setCallSiteTarget' + kind + '(Ljava/lang/invoke/CallSite;Ljava/lang/invoke/MethodHandle;)V',
      registered = JVM.prototype.getNative.call(registry, 'L' + name + ';', signature);
    assert.equal(typeof registered, 'function');
    assert.equal(registered, natives[name][signature]);
  }
});

for (const kind of ['Normal', 'Volatile']) {
  test('CallSite ' + kind + ' hook updates only its exact target synchronously', () => {
    const natives = load('natives/java_lang').default()['java/lang/invoke/MethodHandleNatives'],
      signature = 'setCallSiteTarget' + kind + '(Ljava/lang/invoke/CallSite;Ljava/lang/invoke/MethodHandle;)V',
      key = 'java/lang/invoke/CallSite/target', original = {tag: 'original'}, first = {tag: 'first'}, second = {tag: 'second'},
      callSite = {[key]: original, retained: {tag: 'unrelated-field'}}, unrelatedSite = {[key]: original},
      thread = new Proxy({}, {get() { assert.fail('A target update must not yield, invoke Java, or asyncReturn'); }});
    const retained = callSite.retained;
    assert.equal(natives[signature](thread, callSite, first), undefined);
    assert.equal(callSite[key], first); assert.equal(unrelatedSite[key], original);
    assert.equal(callSite.retained, retained);
    assert.equal(natives[signature](thread, callSite, second), undefined);
    assert.equal(callSite[key], second); assert.equal(unrelatedSite[key], original);
    assert.deepEqual(Object.keys(callSite), [key, 'retained']);
  });
}
