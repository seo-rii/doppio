'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const runtimeRoot = path.resolve(process.env.DOPPIO_RELEASE_CLI_ROOT ||
  path.join(__dirname, '../build/release-cli'));
const JVM = require(path.join(runtimeRoot, 'src/jvm')).default;
const {JVMThread} = require(path.join(runtimeRoot, 'src/threading'));
const {JVMStatus, ThreadStatus} = require(path.join(runtimeRoot, 'src/enums'));

let scenarios = 0;

// These host probes exercise the real launch/shutdown decisions. Java execution
// is represented by pending frames so completion occurs only after the caller's
// internal frame has unwound, and dispatch must finish before ordinary shutdown.
function makeThread(vm) {
  const thread = {
    stack: [], status: ThreadStatus.ASYNC_WAITING, dispatches: [], statuses: [], closed: 0,
    setStatus(status) {
      if (status === ThreadStatus.TERMINATED) {
        this.stack.length = 0;
      }
      this.status = status;
      this.statuses.push(status);
    },
    throwException(error) {
      JVMThread.prototype.throwException.call(this, error);
    },
    throwNewException(descriptor, message) {
      this.throwException({descriptor, message});
    },
    handleUncaughtException(error) {
      JVMThread.prototype.handleUncaughtException.call(this, error);
    },
    close() { this.closed++; }
  };
  thread.jvmThreadObj = {
    'dispatchUncaughtException(Ljava/lang/Throwable;)V'(actualThread, args) {
      assert.equal(actualThread, thread);
      assert.equal(thread.stack.length, 0, 'The launch continuation must unwind before dispatch.');
      thread.dispatches.push({error: args[0], exitCode: vm.exitCode});
      thread.stack.push({kind: 'uncaught-handler'});
      thread.setStatus(ThreadStatus.RUNNABLE);
    }
  };
  return thread;
}

function makeLaunch(major, options = {}) {
  const vm = {
    status: JVMStatus.BOOTED, exitCode: 0, dumpJITStats: false,
    completions: [], shutdownCodes: [], calls: [],
    hasVMBooted: JVM.prototype.hasVMBooted
  };
  const thread = vm.firstThread = makeThread(vm);
  vm.threadPool = {getThreads() { return [thread]; }};

  function invoke(name, actualThread, args, callback) {
    assert.equal(actualThread, thread);
    vm.calls.push({name, args, callback});
    // A Java bridge adds an internal frame only when supplied a callback.
    if (typeof callback === 'function') {
      thread.stack.push({kind: 'internal'});
    }
    thread.stack.push({kind: name});
    thread.setStatus(ThreadStatus.RUNNABLE);
  }

  const signature = options.noArgs ? 'main()V' : 'main([Ljava/lang/String;)V';
  const mainMethod = {
    signature, fullSignature: `exit/Probe/${signature}`,
    parameterTypes: options.noArgs ? [] : ['[Ljava/lang/String;'],
    isStatic: !options.instance,
    accessFlags: {isPrivate: () => false, isPublic: () => true, isProtected: () => false}
  };
  const constructor = {
    signature: '<init>()V', fullSignature: 'exit/Probe/<init>()V',
    accessFlags: {isPrivate: () => false}
  };
  function MainClass() {}
  if (!options.missingMain) {
    if (options.instance) {
      MainClass.prototype[mainMethod.fullSignature] = function(actualThread, args, callback) {
        invoke('main', actualThread, args, callback);
      };
    } else {
      MainClass[mainMethod.fullSignature] = MainClass[signature] = (actualThread, args, callback) =>
        invoke('main', actualThread, args, callback);
    }
  }
  MainClass.prototype[constructor.fullSignature] = function(actualThread, args, callback) {
    invoke('constructor', actualThread, args, callback);
  };
  const cdata = mainMethod.cls = {
    majorVersion: major,
    accessFlags: {isAbstract: () => false, isInterface: () => false},
    getConstructor: () => MainClass,
    getExternalName: () => 'exit.Probe',
    methodLookup: (candidate) => !options.missingMain && candidate === signature ? mainMethod : null,
    getInterfaces: () => [], getSuperClass: () => null,
    getMethods: () => options.instance ? [constructor, mainMethod] : []
  };
  vm.systemClassLoader = {
    initializeClass(actualThread, name, callback) {
      assert.equal(actualThread, thread);
      assert.equal(name, 'Lexit/Probe;');
      assert.equal(vm.status, JVMStatus.BOOTED, 'Loading must not begin thread shutdown.');
      assert.equal(vm.exitCode, 1, 'Loading failures must default to failure.');
      vm.loaded = () => callback(cdata);
    }
  };
  vm.bsCl = {
    getInitializedClass(actualThread, name) {
      assert.equal(actualThread, thread);
      if (name === '[Ljava/lang/String;') {
        return {getConstructor() { return function(actualThread, length) { this.array = new Array(length); }; }};
      }
      assert.equal(name, 'Ljava/lang/System;');
      return {getConstructor() { return {
        'java/lang/System/exit(I)V'(actualThread, args) {
          assert.equal(actualThread, thread);
          assert.equal(vm.status, JVMStatus.TERMINATING);
          vm.shutdownCodes.push(args[0]);
          thread.stack.push({kind: 'shutdown'});
          thread.setStatus(ThreadStatus.RUNNABLE);
        }
      }; }};
    }
  };
  return vm;
}

function start(vm) {
  JVM.prototype.runClass.call(vm, 'exit.Probe', [], (code) => vm.completions.push(code));
  assert.deepEqual(vm.completions, []);
  vm.loaded();
  assert.equal(vm.status, JVMStatus.RUNNING);
}

function finishCall(vm, name, error) {
  const call = vm.calls[vm.calls.length - 1];
  assert.equal(call.name, name);
  assert.equal(typeof call.callback, 'function', `${name} must have a launch completion callback.`);
  assert.ok(vm.firstThread.stack.some((frame) => frame.kind === 'internal'));
  // InternalStackFrame.run pops itself and suspends before entering its JS continuation.
  vm.firstThread.stack.length = 0;
  vm.firstThread.status = ThreadStatus.ASYNC_WAITING;
  call.callback(error);
  assert.deepEqual(vm.completions, [], 'Main completion must not finish the JVM early.');
}

function finishHandler(vm, error) {
  assert.equal(vm.firstThread.dispatches.length, 1);
  assert.equal(vm.firstThread.dispatches[0].error, error);
  assert.equal(vm.firstThread.dispatches[0].exitCode, 1,
    'Main failure must be recorded before the uncaught handler executes.');
  assert.equal(vm.firstThread.status, ThreadStatus.RUNNABLE);
  assert.deepEqual(vm.shutdownCodes, []);
  assert.deepEqual(vm.completions, []);
  vm.firstThread.stack.length = 0;
  vm.firstThread.setStatus(ThreadStatus.TERMINATED);
}

function finishShutdown(vm, expected) {
  assert.equal(vm.firstThread.status, ThreadStatus.TERMINATED);
  assert.equal(JVM.prototype.threadPoolIsEmpty.call(vm), false);
  assert.equal(vm.status, JVMStatus.TERMINATING);
  assert.deepEqual(vm.shutdownCodes, [expected]);
  assert.deepEqual(vm.completions, []);
  vm.firstThread.stack.length = 0;
  vm.firstThread.setStatus(ThreadStatus.TERMINATED);
  assert.equal(JVM.prototype.threadPoolIsEmpty.call(vm), true);
  assert.equal(vm.status, JVMStatus.TERMINATED);
  assert.deepEqual(vm.completions, [expected]);
  assert.equal(vm.firstThread.closed, 1);
}

for (const major of [52, 65, 69]) {
  const normal = makeLaunch(major);
  start(normal);
  finishCall(normal, 'main');
  assert.equal(normal.exitCode, 0);
  assert.deepEqual(normal.firstThread.dispatches, []);
  finishShutdown(normal, 0);
  scenarios++;

  for (const kind of ['RuntimeException', 'Error']) {
    const failed = makeLaunch(major);
    const error = {kind};
    start(failed);
    finishCall(failed, 'main', error);
    finishHandler(failed, error);
    finishShutdown(failed, 1);
    scenarios++;
  }

  const missing = makeLaunch(major, {missingMain: true});
  start(missing);
  const error = missing.firstThread.dispatches[0].error;
  assert.equal(error.descriptor, 'Ljava/lang/NoSuchMethodError;');
  finishHandler(missing, error);
  finishShutdown(missing, 1);
  scenarios++;
}

for (const stage of ['normal', 'constructor', 'main']) {
  const vm = makeLaunch(69, {instance: true});
  const error = {kind: `${stage}-failure`};
  start(vm);
  finishCall(vm, 'constructor', stage === 'constructor' ? error : undefined);
  if (stage !== 'constructor') {
    finishCall(vm, 'main', stage === 'main' ? error : undefined);
  }
  if (stage === 'normal') {
    assert.deepEqual(vm.firstThread.dispatches, []);
    finishShutdown(vm, 0);
  } else {
    finishHandler(vm, error);
    finishShutdown(vm, 1);
  }
  scenarios++;
}

const noArgs = makeLaunch(69, {noArgs: true});
const noArgsError = {kind: 'no-args-failure'};
start(noArgs);
assert.deepEqual(noArgs.calls[0].args, []);
finishCall(noArgs, 'main', noArgsError);
finishHandler(noArgs, noArgsError);
finishShutdown(noArgs, 1);
scenarios++;

for (const code of [0, 7]) {
  for (const failedMain of [false, true]) {
    const vm = makeLaunch(52);
    start(vm);
    if (failedMain) {
      finishCall(vm, 'main', {kind: 'handler-exit'});
      assert.equal(vm.firstThread.dispatches[0].exitCode, 1);
    }
    // System.exit can terminate either the executing main or its handler.
    JVM.prototype.halt.call(vm, code);
    assert.equal(vm.exitCode, code);
    assert.equal(vm.status, JVMStatus.TERMINATING);
    assert.equal(vm.firstThread.stack.length, 0);
    assert.equal(vm.firstThread.status, ThreadStatus.TERMINATED);
    assert.deepEqual(vm.completions, []);
    assert.equal(JVM.prototype.threadPoolIsEmpty.call(vm), true);
    assert.deepEqual(vm.completions, [code]);
    assert.deepEqual(vm.shutdownCodes, [], 'Explicit halt must not be replaced by ordinary shutdown.');
    assert.equal(vm.firstThread.closed, 1);
    scenarios++;
  }
}

for (const status of [JVMStatus.BOOTING, JVMStatus.RUNNING, JVMStatus.TERMINATING, JVMStatus.TERMINATED]) {
  const vm = makeLaunch(52);
  vm.status = status;
  assert.throws(() => JVM.prototype.runClass.call(vm, 'exit.Probe', [], () => assert.fail('No completion expected.')));
  assert.equal(vm.status, status);
  assert.equal(vm.exitCode, 0);
  assert.equal(vm.loaded, undefined);
  scenarios++;
}

const failedInstance = makeLaunch(52), normalInstance = makeLaunch(65);
start(failedInstance);
finishCall(failedInstance, 'main', {kind: 'first-instance-failure'});
start(normalInstance);
finishCall(normalInstance, 'main');
assert.equal(failedInstance.exitCode, 1);
assert.equal(normalInstance.exitCode, 0);
finishHandler(failedInstance, failedInstance.firstThread.dispatches[0].error);
finishShutdown(failedInstance, 1);
finishShutdown(normalInstance, 0);
scenarios++;

const parent = makeLaunch(52);
start(parent);
const child = makeThread(parent), childError = {kind: 'child-failure'};
child.throwException(childError);
assert.equal(child.dispatches[0].error, childError);
assert.equal(child.dispatches[0].exitCode, 0);
assert.equal(parent.exitCode, 0, 'A child-thread failure is not a launcher-main failure.');
finishCall(parent, 'main');
finishShutdown(parent, 0);
scenarios++;

console.log(`jvm-exit-status:${scenarios}:ok (main completion, dispatch, shutdown, explicit halt, lifecycle, isolation)`);
