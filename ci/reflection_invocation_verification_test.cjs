'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');

function nativeRegistry() {
  const filename = path.join(runtime, 'src/natives/sun_reflect.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename).default();
  const ts = require('typescript'), loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/natives/sun_reflect.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports.default();
}
const invoke = nativeRegistry()['sun/reflect/NativeMethodAccessorImpl'][
  'invoke0(Ljava/lang/reflect/Method;Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/Object;'];
const {Flags} = require(path.join(runtime, 'src/util'));
const {ThreadStatus} = require(path.join(runtime, 'src/enums'));

// Actual native registry and argument conversion, with a controlled class
// initialization gate. Lifecycle/verification integration is tested separately;
// these units are not native-JVM or class-file corpus evidence.
function fixture(options = {}) {
  const state = {phase: 'verification', initialization: [], constructors: 0, invocations: [],
    statuses: [], returns: [], errors: [], boxes: [], wrapperLoads: [], wrappers: []};
  const method = {signature: 'target()' + (options.returnType || 'V'),
    fullSignature: 'fixture/Reflected/target()' + (options.returnType || 'V'),
    returnType: options.returnType || 'V', parameterTypes: options.parameterTypes || [],
    accessFlags: new Flags(options.instance ? 1 : 9)};
  const thread = {
    setStatus(status) { state.statuses.push(status); },
    asyncReturn(value) { state.returns.push(value); },
    throwException(error) { state.errors.push(error); },
    getBsCl: () => ({initializeClass(caller, name, callback) {
      assert.equal(caller, thread);
      state.wrapperLoads.push({name, callback});
    }})
  };
  function target(caller, args, callback) {
    assert.equal(caller, thread);
    if (!options.instance) assert.equal(state.phase, 'ready', 'Target executed before class initialization');
    state.invocations.push({receiver: this, args, callback});
  }
  const constructor = {[method.fullSignature]: target};
  const cls = {
    getMethodFromSlot(slot) { assert.equal(slot, 7); return method; },
    initialize(caller, callback, explicit) {
      assert.equal(caller, thread);
      assert.equal(state.statuses.at(-1), ThreadStatus.ASYNC_WAITING);
      state.initialization.push({callback, explicit});
      if (options.initialized) { state.phase = 'ready'; callback(cls); }
    },
    getConstructor(caller) {
      assert.equal(caller, thread);
      state.constructors++;
      assert.equal(state.phase, 'ready', 'Constructor retrieved before verification/initialization');
      return constructor;
    }
  };
  const mObj = {'java/lang/reflect/Method/clazz': {$cls: cls}, 'java/lang/reflect/Method/slot': 7,
    'java/lang/reflect/Method/returnType': {$cls: {createWrapperObject(caller, value) {
      assert.equal(caller, thread);
      const boxed = {type: method.returnType, value};
      state.boxes.push(boxed);
      return boxed;
    }}}};
  const receiver = {[method.signature]: target};
  function completeInitialization() {
    assert.equal(state.initialization.length, 1);
    state.phase = 'ready';
    state.initialization[0].callback(cls);
  }
  function failInitialization(error) {
    assert.equal(state.initialization.length, 1);
    state.phase = 'failed';
    thread.throwException(error);
    state.initialization[0].callback(null);
  }
  function constructWrapper() {
    assert.equal(state.wrapperLoads.length, 1);
    assert.equal(state.wrapperLoads[0].name, 'Ljava/lang/reflect/InvocationTargetException;');
    function Wrapper(caller) { assert.equal(caller, thread); state.wrappers.push(this); }
    Wrapper.prototype['<init>(Ljava/lang/Throwable;)V'] = function(caller, args, callback) {
      assert.equal(caller, thread);
      this.cause = args[0];
      this.finish = callback;
    };
    state.wrapperLoads[0].callback({getConstructor(caller) { assert.equal(caller, thread); return Wrapper; }});
    assert.equal(state.wrappers.length, 1);
    return state.wrappers[0];
  }
  return {state, method, thread, cls, mObj, receiver, constructor, completeInitialization, failInitialization, constructWrapper};
}

test('static reflective invocation waits for both verification and initialization before constructor access', () => {
  const w = fixture();
  assert.equal(invoke(w.thread, w.mObj, null, null), undefined);
  assert.deepEqual(w.state.statuses, [ThreadStatus.ASYNC_WAITING]);
  assert.equal(w.state.initialization.length, 1);
  assert.equal(w.state.initialization[0].explicit, true);
  assert.equal(w.state.constructors, 0);
  assert.deepEqual(w.state.invocations, []);
  assert.deepEqual(w.state.returns, []);
  w.state.phase = 'initialization'; // Verification succeeded; <clinit> is still pending.
  assert.equal(w.state.constructors, 0);
  assert.deepEqual(w.state.invocations, []);
  w.completeInitialization();
  assert.equal(w.state.constructors, 1);
  assert.equal(w.state.invocations.length, 1);
  assert.equal(w.state.invocations[0].receiver, w.constructor);
  assert.deepEqual(w.state.invocations[0].args, []);
  assert.deepEqual(w.state.returns, []);
  w.state.invocations[0].callback(null);
  assert.deepEqual(w.state.returns, [null]);
  assert.deepEqual(w.state.errors, []);
});

test('static reflection preserves primitive unboxing, category-2 slots, and reference identities', () => {
  const long = {low: 17, high: 3}, reference = {identity: 'argument'}, unboxed = [];
  const box = value => ({unbox() { unboxed.push(value); return value; }});
  const params = {array: [box(7), box(long), box(3.25), reference, null]};
  const w = fixture({parameterTypes: ['I', 'J', 'D', 'Ljava/lang/Object;', '[I']});
  invoke(w.thread, w.mObj, {ignoredForStaticInvocation: true}, params);
  assert.deepEqual(unboxed, [7, long, 3.25]);
  assert.equal(w.state.invocations.length, 0);
  w.completeInitialization();
  assert.deepEqual(w.state.invocations[0].args, [7, long, null, 3.25, null, reference, null]);
  assert.equal(w.state.invocations[0].args[1], long);
  assert.equal(w.state.invocations[0].args[5], reference);
  assert.equal(params.array[3], reference);
  assert.equal(params.array.length, 5);
});

test('primitive reflection returns are boxed only after the initialized target completes', () => {
  for (const returnType of ['Z', 'B', 'C', 'S', 'I', 'F', 'J', 'D']) {
    const w = fixture({returnType}), value = returnType === 'J' ? {low: 2, high: 1} : 2;
    invoke(w.thread, w.mObj, null, null);
    assert.deepEqual(w.state.boxes, []);
    w.completeInitialization();
    assert.deepEqual(w.state.boxes, []);
    w.state.invocations[0].callback(null, value);
    assert.deepEqual(w.state.boxes, [{type: returnType, value}]);
    assert.equal(w.state.returns[0], w.state.boxes[0]);
    assert.deepEqual(w.state.errors, []);
  }
});

test('void and reference reflection results retain null and array identity without boxing', () => {
  for (const [returnType, value] of [['V', undefined], ['Ljava/lang/Object;', null],
    ['Ljava/lang/Object;', {identity: 'return'}], ['[I', {array: [1, 2]}]]) {
    const w = fixture({returnType});
    invoke(w.thread, w.mObj, null, null);
    w.completeInitialization();
    w.state.invocations[0].callback(null, value);
    assert.deepEqual(w.state.boxes, []);
    assert.equal(w.state.returns.length, 1);
    assert.equal(w.state.returns[0], returnType === 'V' ? null : value);
  }
});

test('verification and class initialization failures stay unwrapped and never invoke the target', () => {
  for (const name of ['Ljava/lang/VerifyError;', 'Ljava/lang/ExceptionInInitializerError;', 'Ljava/lang/NoClassDefFoundError;']) {
    const w = fixture(), failure = {name};
    invoke(w.thread, w.mObj, null, null);
    w.failInitialization(failure);
    assert.equal(w.state.constructors, 0);
    assert.deepEqual(w.state.invocations, []);
    assert.deepEqual(w.state.returns, []);
    assert.deepEqual(w.state.wrapperLoads, []);
    assert.deepEqual(w.state.errors, [failure]);
    assert.equal(w.state.errors[0], failure);
  }
});

test('exceptions thrown by the initialized target still become InvocationTargetException causes', () => {
  const w = fixture(), failure = {name: 'Ljava/lang/IllegalStateException;'};
  invoke(w.thread, w.mObj, null, null);
  w.completeInitialization();
  w.state.invocations[0].callback(failure);
  assert.deepEqual(w.state.errors, []);
  assert.deepEqual(w.state.returns, []);
  const wrapper = w.constructWrapper();
  assert.equal(wrapper.cause, failure);
  wrapper.finish(null);
  assert.deepEqual(w.state.errors, [wrapper]);
  assert.deepEqual(w.state.returns, []);
});

test('InvocationTargetException initialization failure remains the existing unwrapped failure', () => {
  const w = fixture(), targetFailure = {name: 'target failure'}, wrapperFailure = {name: 'wrapper initialization failure'};
  invoke(w.thread, w.mObj, null, null);
  w.completeInitialization();
  w.state.invocations[0].callback(targetFailure);
  assert.equal(w.state.wrapperLoads.length, 1);
  w.thread.throwException(wrapperFailure);
  w.state.wrapperLoads[0].callback(null);
  assert.deepEqual(w.state.errors, [wrapperFailure]);
  assert.deepEqual(w.state.wrappers, []);
  assert.deepEqual(w.state.returns, []);
});

test('InvocationTargetException constructor failure replaces the wrapper without recursive wrapping', () => {
  const w = fixture(), targetFailure = {name: 'target failure'}, wrapperFailure = {name: 'wrapper constructor failure'};
  invoke(w.thread, w.mObj, null, null);
  w.completeInitialization();
  w.state.invocations[0].callback(targetFailure);
  const wrapper = w.constructWrapper();
  assert.equal(wrapper.cause, targetFailure);
  wrapper.finish(wrapperFailure);
  assert.deepEqual(w.state.errors, [wrapperFailure]);
  assert.equal(w.state.wrapperLoads.length, 1);
  assert.deepEqual(w.state.returns, []);
});

test('already initialized static classes still invoke exactly once', () => {
  const w = fixture({initialized: true});
  invoke(w.thread, w.mObj, null, {array: []});
  assert.equal(w.state.initialization.length, 1);
  assert.equal(w.state.constructors, 1);
  assert.equal(w.state.invocations.length, 1);
  assert.deepEqual(w.state.invocations[0].args, []);
  w.state.invocations[0].callback(null);
  assert.deepEqual(w.state.returns, [null]);
});

test('instance reflection retains virtual receiver dispatch without initializing the declaring class', () => {
  const w = fixture({instance: true, returnType: 'Ljava/lang/Object;', parameterTypes: ['Ljava/lang/Object;']});
  const argument = {}, result = {};
  invoke(w.thread, w.mObj, w.receiver, {array: [argument]});
  assert.deepEqual(w.state.initialization, []);
  assert.equal(w.state.constructors, 0);
  assert.equal(w.state.invocations.length, 1);
  assert.equal(w.state.invocations[0].receiver, w.receiver);
  assert.equal(w.state.invocations[0].args[0], argument);
  w.state.invocations[0].callback(null, result);
  assert.deepEqual(w.state.boxes, []);
  assert.equal(w.state.returns[0], result);
});
