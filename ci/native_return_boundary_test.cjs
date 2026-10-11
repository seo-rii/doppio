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
  const loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  // Single-file source transpilation retains imported const-enum lookups.
  loaded.require = id => id === './methods' || id === './threading' ? load(id.slice(2)) : original(id);
  loaded._compile(require('typescript').transpileModule(
    fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}
    }).outputText, filename);
  return loaded.exports;
}
const {JVMThread, NativeStackFrame, InternalStackFrame} = load('threading');
const {SymbolicResolution} = load('SymbolicResolution');
const {ThreadStatus, StackFrameType} = require(path.join(runtime, 'src/enums'));
const {Flags} = require(path.join(runtime, 'src/util'));
// Actual native frames, stack unwinding and CP failure cache; only declaring
// metadata, Java allocation and scheduling are controlled. B7 supplies the
// separate genuine native/Node/Chromium integration evidence.
global.RELEASE = true;
function environment(native) {
  const values = [], failures = [], linkage = {};
  const owner = Object.create(JVMThread.prototype);
  owner.status = ThreadStatus.RUNNABLE;
  owner.setStatus = function(value) { this.status = value; };
  owner.bsCl = {getLoadedClass(name) { assert.equal(name, 'Ljava/lang/LinkageError;'); return linkage; }};
  owner.handleUncaughtException = () => assert.fail('Error escaped the controlled Java caller');
  const caller = {type: StackFrameType.BYTECODE, method: {},
    scheduleResume(thread, value) { assert.equal(thread, owner); values.push(value); },
    scheduleException(thread, failure) { assert.equal(thread, owner); failures.push(failure); return true; }};
  owner.stack = [caller];
  const marker = {getClass: () => ({getInternalName: () => 'Ljava/lang/NoClassDefFoundError;',
    isSubclass: target => target === linkage})};
  // NativeCallKind is an erased const enum; use the method's generic adapter.
  const method = {accessFlags: new Flags(0x109), convertArgs: thread => [thread],
    returnType: 'I', cls: {isResolved: () => true}, getNativeFunction: () => native};
  const frame = new NativeStackFrame(method, []);
  return {owner, caller, frame, method, marker, values, failures};
}

test('synchronous native completion returns once from its own top frame', () => {
  const w = environment(() => 37); w.owner.stack.push(w.frame); w.frame.run(w.owner);
  assert.deepEqual(w.owner.stack, [w.caller]); assert.deepEqual(w.values, [37]); assert.deepEqual(w.failures, []);
});

test('cached CP failure preserves the pending boundary until its original Throwable is consumed', () => {
  const gate = new SymbolicResolution(); let w, completed, calls = 0;
  w = environment(owner => {
    calls++;
    owner.runWithExceptionBoundary(done => gate.resolve(owner, () => assert.fail('Cached failure must not retry'),
      success => { if (success) done(true); }), failure => {
        completed = failure; owner.asyncReturn(43);
      });
  });
  gate.resolve(w.owner, () => w.owner.throwException(w.marker), success => assert.equal(success, false));
  assert.ok(w.owner.stack.at(-1) instanceof InternalStackFrame); w.owner.stack.at(-1).run(w.owner);
  assert.equal(gate.hasFailed(), true); assert.deepEqual(w.failures, [w.marker]); w.failures.length = 0;
  w.owner.stack.push(w.frame); w.frame.run(w.owner);
  assert.ok(w.owner.stack.at(-1) instanceof InternalStackFrame, 'Do not auto-return through the queued exception boundary');
  assert.equal(w.owner.currentMethod(), w.method, 'Nearest Java method is not evidence that the native frame is top');
  assert.deepEqual(w.values, []); assert.equal(completed, undefined); assert.equal(calls, 1);
  w.owner.stack.at(-1).run(w.owner);
  assert.equal(completed, w.marker); assert.deepEqual(w.owner.stack, [w.caller]); assert.deepEqual(w.values, [43]);
  assert.deepEqual(w.failures, []); assert.equal(calls, 1);
});

test('direct synchronous failure keeps its boundary and propagates the original Throwable', () => {
  let w, completed;
  w = environment(owner => owner.runWithExceptionBoundary(() => owner.throwException(w.marker), failure => {
    completed = failure; owner.throwException(failure);
  }));
  w.owner.stack.push(w.frame); w.frame.run(w.owner);
  assert.ok(w.owner.stack.at(-1) instanceof InternalStackFrame, 'A runnable queued exception is not a normal native result');
  assert.deepEqual(w.values, []); assert.equal(completed, undefined);
  w.owner.stack.at(-1).run(w.owner);
  assert.equal(completed, w.marker); assert.deepEqual(w.failures, [w.marker]);
  assert.deepEqual(w.values, []); assert.deepEqual(w.owner.stack, [w.caller]);
});

test('deferred native completion retains its frame until asyncReturn', async () => {
  const w = environment(owner => { owner.setStatus(ThreadStatus.ASYNC_WAITING); setImmediate(() => owner.asyncReturn(47)); });
  w.owner.stack.push(w.frame); w.frame.run(w.owner);
  assert.equal(w.owner.stack.at(-1), w.frame); assert.deepEqual(w.values, []);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(w.owner.stack, [w.caller]); assert.deepEqual(w.values, [47]); assert.deepEqual(w.failures, []);
});
