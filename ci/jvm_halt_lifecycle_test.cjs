'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const {sourceWorld} = require('./runtime_timer_source.cjs');

test('halt cancels a timed monitor wait and a queued timeout cannot revive its terminated thread', () => {
  const world = sourceWorld(), thread = world.thread(), monitor = new world.Monitor();
  assert.equal(monitor.enter(thread, () => {}), true);
  world.natives['java/lang/Object']['wait(J)V'](thread, {getMonitor: () => monitor}, world.Long.fromInt(20));
  const stale = world.clock.requests[0].callback;
  world.JVM.prototype.halt.call(world.machine, 7);
  assert.equal(world.machine.status, world.JVMStatus.TERMINATED);
  assert.equal(thread.getStatus(), world.ThreadStatus.TERMINATED);
  assert.equal(world.machine.threadPool.getThreads().length, 0);
  assert.equal(world.clock.timers.size, 0);
  assert.equal(monitor.isWaiting(thread), false);
  assert.equal(monitor.isTimedWaiting(thread), false);
  stale();
  world.clock.advance(20);
  world.clock.flushImmediate();
  assert.equal(thread.getStatus(), world.ThreadStatus.TERMINATED);
  assert.equal(monitor.getOwner(), null);
  assert.equal(world.machine.threadPool.getThreads().length, 0);
  assert.deepEqual(world.completions, [{code: 7, remaining: 0}]);
});

test('halt removes notified-but-blocked waiters without acquiring their monitor', () => {
  const world = sourceWorld(), waiter = world.thread(), owner = world.thread();
  const monitor = new world.Monitor();
  monitor.enter(waiter, () => {});
  monitor.wait(waiter, () => { throw new Error('A halted wait must never resume.'); }, 20);
  monitor.enter(owner, () => {});
  monitor.notify(owner);
  assert.equal(monitor.isBlocked(waiter), true);
  world.JVM.prototype.halt.call(world.machine, 0);
  assert.equal(monitor.isBlocked(waiter), false);
  // An ordinary monitor exit still releases ownership without reviving a
  // cancelled blocked registration.
  assert.equal(monitor.exit(owner), true);
  assert.equal(monitor.getOwner(), null);
  world.clock.advance(20);
  world.clock.flushImmediate();
  assert.equal(world.machine.threadPool.getThreads().length, 0);
});

test('halt cancels sleeping and parked daemon threads before the completion callback', () => {
  const world = sourceWorld(), main = world.thread(), sleeper = world.thread(true), parked = world.thread(true);
  world.natives['java/lang/Thread']['sleep(J)V'](sleeper, world.Long.fromString('2147483648'));
  let cancelled = 0, resumed = 0;
  const timer = world.clock.setTimeout(() => world.parker.completelyUnpark(parked), 100);
  world.parker.park(parked, () => { resumed++; }, () => { cancelled++; world.clock.clearTimeout(timer); });
  world.JVM.prototype.halt.call(world.machine, 0);
  assert.deepEqual(world.completions, [{code: 0, remaining: 0}]);
  assert.equal(world.clock.timers.size, 0);
  assert.equal(world.parker.isParked(parked), false);
  assert.equal(cancelled, 1);
  assert.equal(resumed, 0);
  for (const thread of [main, sleeper, parked]) assert.equal(thread.getStatus(), world.ThreadStatus.TERMINATED);
  world.clock.advance(100);
  world.clock.flushImmediate();
  assert.equal(resumed, 0);
});

test('late yield, async return and exception callbacks leave a halted VM untouched', () => {
  const world = sourceWorld(), thread = world.thread();
  world.natives['java/lang/Thread']['yield()V'](thread);
  world.JVM.prototype.halt.call(world.machine, 0);
  assert.doesNotThrow(() => world.clock.flushImmediate());
  assert.doesNotThrow(() => thread.asyncReturn());
  assert.doesNotThrow(() => thread.throwException({}));
  assert.doesNotThrow(() => thread.throwNewException('Ljava/lang/Exception;', 'late'));
  assert.doesNotThrow(() => thread.setStatus(world.ThreadStatus.RUNNABLE));
  world.JVM.prototype.halt.call(world.machine, 8);
  assert.equal(world.machine.exitCode, 0);
  assert.equal(thread.getStatus(), world.ThreadStatus.TERMINATED);
  assert.equal(world.machine.threadPool.getThreads().length, 0);
  assert.deepEqual(world.completions, [{code: 0, remaining: 0}]);
});

test('ordinary terminated threads can still be reused while their VM is running', () => {
  const world = sourceWorld(), thread = world.thread();
  thread.setStatus(world.ThreadStatus.TERMINATED);
  assert.equal(world.machine.status, world.JVMStatus.RUNNING);
  assert.equal(world.machine.threadPool.getThreads().length, 0);
  thread.stack.push({type: world.StackFrameType.INTERNAL, run() {}});
  thread.setStatus(world.ThreadStatus.RUNNABLE);
  assert.equal(thread.getStatus(), world.ThreadStatus.RUNNABLE);
  assert.equal(world.machine.threadPool.getThreads()[0], thread);
});

test('an exit callback already in flight can release its monitor after halt without terminating twice', () => {
  const world = sourceWorld(), thread = world.thread(), mirror = thread.getJVMObject();
  let finishExit;
  mirror['exit()V'] = (_thread, _arguments, callback) => { finishExit = callback; };
  thread.stack.length = 0;
  thread.setStatus(world.ThreadStatus.TERMINATED);
  assert.equal(typeof finishExit, 'function');
  assert.equal(mirror.getMonitor().getOwner(), thread);
  world.JVM.prototype.halt.call(world.machine, 0);
  assert.doesNotThrow(() => finishExit());
  assert.equal(mirror.getMonitor().getOwner(), null, 'The existing exit callback must release its monitor.');
  assert.equal(thread.getStatus(), world.ThreadStatus.TERMINATED);
  assert.equal(world.machine.threadPool.getThreads().length, 0);
  assert.deepEqual(world.completions, [{code: 0, remaining: 0}]);
});

test('live notify restores monitor reentry count and invokes its callback once', () => {
  const world = sourceWorld(), waiter = world.thread(), owner = world.thread(), monitor = new world.Monitor();
  let resumed = 0;
  monitor.enter(waiter, () => {});
  monitor.enter(waiter, () => {});
  monitor.wait(waiter, () => { resumed++; }, 20);
  monitor.enter(owner, () => {});
  monitor.notify(owner);
  assert.equal(resumed, 0);
  monitor.exit(owner);
  assert.equal(resumed, 1);
  assert.equal(monitor.getOwner(), waiter);
  monitor.exit(waiter);
  assert.equal(monitor.getOwner(), waiter);
  monitor.exit(waiter);
  assert.equal(monitor.getOwner(), null);
  world.clock.advance(20);
  assert.equal(resumed, 1);
});

test('a previously available park permit releases its timer without invoking the asynchronous return', () => {
  const world = sourceWorld(), thread = world.thread();
  let resumed = 0, cancelled = 0;
  world.parker.unpark(thread);
  const timer = world.clock.setTimeout(() => world.parker.completelyUnpark(thread), 100);
  world.parker.park(thread, () => { resumed++; }, () => { cancelled++; world.clock.clearTimeout(timer); });
  assert.equal(thread.getStatus(), world.ThreadStatus.RUNNABLE);
  assert.equal(world.parker.isParked(thread), false);
  assert.equal(resumed, 0);
  assert.equal(cancelled, 1);
  assert.equal(world.clock.timers.size, 0);
});

test('the real Unsafe.park bridge cancels its host timer at halt and ignores an already queued timeout', () => {
  const world = sourceWorld(), thread = world.thread();
  const unsafe = world.load('natives/sun_misc').default()['sun/misc/Unsafe'];
  unsafe['park(ZJ)V'](thread, null, 0, world.Long.fromNumber(100000000));
  const stale = world.clock.requests[0].callback;
  assert.equal(thread.getStatus(), world.ThreadStatus.PARKED);
  world.JVM.prototype.halt.call(world.machine, 0);
  assert.equal(world.clock.timers.size, 0);
  assert.equal(world.parker.isParked(thread), false);
  stale();
  world.clock.flushImmediate();
  assert.equal(thread.getStatus(), world.ThreadStatus.TERMINATED);
  assert.equal(world.machine.threadPool.getThreads().length, 0);
});

test('the real Unsafe.park bridge releases its timer when a permit makes parking return immediately', () => {
  const world = sourceWorld(), thread = world.thread();
  const unsafe = world.load('natives/sun_misc').default()['sun/misc/Unsafe'];
  world.parker.unpark(thread);
  unsafe['park(ZJ)V'](thread, null, 0, world.Long.fromNumber(100000000));
  assert.equal(thread.getStatus(), world.ThreadStatus.RUNNABLE);
  assert.equal(world.clock.timers.size, 0);
  assert.equal(world.parker.isParked(thread), false);
});

test('class initialization completing after halt cannot allocate a late exception or invoke metadata callbacks', () => {
  const world = sourceWorld(), thread = world.thread();
  let initialized, metadata;
  thread.getLoader = () => ({getInitializedClass: () => null,
    initializeClass(_thread, _name, callback) { initialized = callback; }});
  thread.throwNewException('Ljava/lang/Exception;', 'pending');
  thread.runWithExceptionBoundary(done => { metadata = done; }, () => assert.fail('Late metadata callback'));
  world.JVM.prototype.halt.call(world.machine, 0);
  assert.doesNotThrow(() => metadata({}));
  assert.doesNotThrow(() => initialized({getConstructor() { assert.fail('Late exception allocation'); }}));
  assert.equal(world.machine.threadPool.getThreads().length, 0);
});
