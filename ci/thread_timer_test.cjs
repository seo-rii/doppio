'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const {sourceWorld, maximumDelay} = require('./runtime_timer_source.cjs');

test('a positive Java long sleep beyond the host limit cannot become a one-millisecond sleep', () => {
  const world = sourceWorld(), thread = world.thread();
  world.natives['java/lang/Thread']['sleep(J)V'](thread, world.Long.fromString('2147483648'));
  assert.ok(world.clock.requests.every(timer => timer.requested <= maximumDelay));
  world.clock.advance(1);
  assert.equal(thread.resumptions, 0);
  world.clock.advance(maximumDelay - 1);
  assert.equal(thread.resumptions, 0);
  assert.equal(world.clock.requests.at(-1).requested, 1);
  world.clock.advance(1);
  assert.equal(thread.resumptions, 1);
  assert.equal(world.clock.timers.size, 0);
});

test('Long.MAX_VALUE remains asleep across bounded chunks without rounding away the Java long', () => {
  const world = sourceWorld(), thread = world.thread();
  const duration = world.Long.fromString('9223372036854775807');
  duration.toNumber = () => { throw new Error('The original Java long must not be rounded to a host number.'); };
  world.natives['java/lang/Thread']['sleep(J)V'](thread, duration);
  world.clock.advance(maximumDelay * 2);
  assert.equal(thread.resumptions, 0);
  assert.equal(world.clock.timers.size, 1);
  assert.ok(world.clock.requests.every(timer => timer.requested === maximumDelay));
});

test('an overdue bounded chunk accounts for elapsed time rather than adding its lateness again', () => {
  const world = sourceWorld(), thread = world.thread();
  world.natives['java/lang/Thread']['sleep(J)V'](thread, world.Long.fromString('2147483648'));
  const first = world.clock.requests[0];
  world.clock.now = maximumDelay + 10;
  world.clock.timers.delete(first.id);
  first.callback();
  assert.equal(thread.resumptions, 1);
  assert.equal(world.clock.timers.size, 0);
  assert.equal(world.clock.requests.length, 1);
});

test('a negative helper delay cannot wrap into a positive Java long while accounting for elapsed time', () => {
  const world = sourceWorld();
  let completed = 0;
  world.load('ThreadTimer').default(() => { completed++; }, world.Long.MIN_VALUE);
  world.clock.advance(1);
  assert.equal(completed, 1);
  assert.equal(world.clock.timers.size, 0);
  assert.equal(world.clock.requests.length, 1);
});

test('a long Object.wait uses the same bounded timer and notify cancels its remaining chunks', () => {
  const world = sourceWorld(), waiter = world.thread(), owner = world.thread(), monitor = new world.Monitor();
  monitor.enter(waiter, () => {});
  world.natives['java/lang/Object']['wait(J)V'](waiter,
    {getMonitor: () => monitor}, world.Long.fromString('2147483648'));
  assert.equal(world.clock.requests[0].requested, maximumDelay);
  world.clock.advance(maximumDelay);
  assert.equal(waiter.resumptions, 0);
  monitor.enter(owner, () => {});
  monitor.notify(owner);
  monitor.exit(owner);
  assert.equal(waiter.resumptions, 1);
  assert.equal(world.clock.timers.size, 0);
});

test('short and zero sleeps complete once through the ordinary asynchronous return', () => {
  for (const duration of [0, 1, 20]) {
    const world = sourceWorld(), thread = world.thread();
    world.natives['java/lang/Thread']['sleep(J)V'](thread, world.Long.fromInt(duration));
    world.clock.advance(Math.max(duration, 1));
    assert.equal(thread.resumptions, 1);
    world.clock.advance(100);
    assert.equal(thread.resumptions, 1);
    assert.equal(world.clock.timers.size, 0);
  }
});

test('interrupting a long sleep clears its timer before a second sleep of the same method', () => {
  const world = sourceWorld(), target = world.thread();
  const method = target.currentMethod();
  world.natives['java/lang/Thread']['sleep(J)V'](target, world.Long.fromString('2147483648'));
  const stale = world.clock.requests[0].callback;
  const exceptions = [];
  target.throwNewException = descriptor => { exceptions.push(descriptor); };
  const caller = {getBsCl: () => ({getInitializedClass: () => ({methodLookup: signature =>
    signature === 'sleep(J)V' ? method : {signature}})}), asyncReturn() {}};
  const mirror = target.getJVMObject();
  mirror.$thread = target;
  mirror['checkAccess()V'] = (_thread, _arguments, callback) => callback();
  world.natives['java/lang/Thread']['interrupt0()V'](caller, mirror);
  assert.deepEqual(exceptions, ['Ljava/lang/InterruptedException;']);
  assert.equal(world.clock.timers.size, 0);
  // Catching InterruptedException may call the same Method again. Its new
  // native frame must not be returned by an already queued old timeout.
  target.stack[target.stack.length - 1] = {type: world.StackFrameType.NATIVE, method};
  world.natives['java/lang/Thread']['sleep(J)V'](target, world.Long.fromInt(20));
  stale();
  assert.equal(target.resumptions, 0);
  world.clock.advance(20);
  assert.equal(target.resumptions, 1);
});
