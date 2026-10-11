'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const {Opcodes, LookupTable} = require(path.join(runtimeRoot, 'src/opcodes'));
const {OpCode, ThreadStatus} = require(path.join(runtimeRoot, 'src/enums'));
const {PreAllocatedStack} = require(path.join(runtimeRoot, 'src/threading'));
const {Flags} = require(path.join(runtimeRoot, 'src/util'));

function invocation({declaringInitialized = false, symbolicInitialized = false, direct = false} = {}) {
  const events = [];
  const declaring = {
    isInitialized: () => declaringInitialized,
    initialize(thread, callback) { events.push('declaring initialization'); callback(this); }
  };
  const symbolic = direct ? declaring : {
    isInitialized: () => symbolicInitialized,
    initialize(thread, callback) { events.push('symbolic initialization'); callback(this); }
  };
  const signature = 'value()I';
  const resolved = {cls: declaring, name: 'value', signature, fullSignature: 'interfaces/Parent/' + signature,
    accessFlags: new Flags(declaringInitialized ? 1 : 0x401), isSignaturePolymorphic: () => false};
  const implementation = {cls: {isResolved: () => true}, name: 'value', signature,
    fullSignature: 'receivers/Concrete/' + signature, accessFlags: new Flags(0x101), returnType: 'I',
    convertArgs: (thread, args) => [thread, ...args], getNativeFunction: () => () => { events.push('invoked'); return 7; }};
  const reference = {
    isResolved: () => true,
    // This initialization-only fake represents an already-accessible instance
    // reference; real CP access and staticness are covered by their own units.
    hasAccess(owner, callingFrame, isStatic) {
      assert.equal(isStatic, false);
      return true;
    },
    method: resolved,
    classInfo: {cls: symbolic, isResolved: () => true},
    signature,
    paramWordSize: 0
  };
  const pool = {
    get(index) { assert.equal(index, 1); return reference; },
    getUnchecked(index) { assert.equal(index, 1); return reference; }
  };
  const receiverClass = {
    isCastable(target) { assert.equal(target, symbolic); return true; },
    selectMethod(method) { assert.equal(method, resolved); return {kind: 'selected', method: implementation}; }
  };
  const receiver = {getClass: () => receiverClass,
    [signature]() { assert.fail('Dispatch must use the resolved Method, not a string alias'); }};
  const frame = {
    pc: 0,
    returnToThreadLoop: false,
    method: {cls: {constantPool: pool}},
    opStack: new PreAllocatedStack(1),
    getLoader: () => pool
  };
  frame.opStack.push(receiver);
  const thread = {
    stack: [], status: ThreadStatus.RUNNABLE,
    getStatus() { return this.status; },
    currentMethod() { return this.stack.at(-1)?.method || null; },
    isCurrentFrame(frame) { return this.stack.at(-1) === frame; },
    setStatus(status) { this.status = status; events.push(status); },
    asyncReturn(value) { assert.equal(value, 7); this.stack.pop(); },
    throwNewException(type) { events.push(type); }
  };
  const code = Buffer.from([OpCode.INVOKEINTERFACE, 0, 1, 1, 0]);
  return {events, reference, frame, thread, code};
}

for (const [label, options] of [
  ['direct abstract declaration', {direct: true}],
  ['inherited abstract declaration with both interfaces uninitialized', {}],
  ['inherited abstract declaration after only the symbolic child was initialized', {symbolicInitialized: true}],
  ['inherited default declaration with its passive child uninitialized', {declaringInitialized: true}]
]) {
  test(`invokeinterface dispatches ${label} without interface initialization`, () => {
    const {events, frame, thread, code} = invocation(options);
    LookupTable[code[0]](thread, frame, code);
    assert.equal(code[0], OpCode.INVOKEINTERFACE_FAST, 'resolved calls must make progress immediately');
    assert.deepEqual(events, [], 'neither the symbolic interface nor declaring owner is an active use');
    assert.equal(frame.returnToThreadLoop, false);
    LookupTable[code[0]](thread, frame, code);
    assert.deepEqual(events, [ThreadStatus.RUNNABLE], 'selection schedules a frame without invoking or initializing interfaces');
    thread.stack.at(-1).run(thread);
    assert.deepEqual(events, [ThreadStatus.RUNNABLE, 'invoked']);
    assert.equal(frame.returnToThreadLoop, true);
  });
}

test('unresolved invokeinterface resolves once, then dispatches without initializing interfaces', () => {
  const {events, reference, frame, thread, code} = invocation();
  reference.isResolved = () => false;
  reference.resolve = (owner, loader, caller, callback, explicit) => {
    assert.equal(owner, thread);
    assert.equal(loader, frame.getLoader());
    assert.equal(caller, frame.method.cls);
    assert.equal(explicit, false);
    events.push('resolved');
    reference.isResolved = () => true;
    callback(true);
  };
  Opcodes.invokeinterface(thread, frame, code);
  assert.equal(code[0], OpCode.INVOKEINTERFACE);
  assert.equal(frame.returnToThreadLoop, true);
  assert.deepEqual(events, [ThreadStatus.ASYNC_WAITING, 'resolved', ThreadStatus.RUNNABLE]);
  assert.equal(thread.status, ThreadStatus.RUNNABLE);
  events.length = 0;
  frame.returnToThreadLoop = false;
  Opcodes.invokeinterface(thread, frame, code);
  assert.equal(code[0], OpCode.INVOKEINTERFACE_FAST);
  assert.deepEqual(events, []);
});

test('null invokeinterface receivers throw without initializing the interface', () => {
  const {events, frame, thread, code} = invocation({direct: true});
  frame.opStack.pop();
  frame.opStack.push(null);
  Opcodes.invokeinterface(thread, frame, code);
  assert.equal(code[0], OpCode.INVOKEINTERFACE_FAST);
  LookupTable[code[0]](thread, frame, code);
  assert.deepEqual(events, ['Ljava/lang/NullPointerException;']);
  assert.equal(frame.returnToThreadLoop, true);
});
