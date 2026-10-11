'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const root = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
function threading() {
  const filename = path.join(root, 'src/threading.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  const Module = require('node:module');
  const ts = require('typescript');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/threading.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {JVMThread, InternalStackFrame} = threading();
const {ThreadStatus, StackFrameType} = require(path.join(root, 'src/enums'));
function thread() {
  const result = Object.create(JVMThread.prototype);
  result.stack = [];
  result.status = ThreadStatus.ASYNC_WAITING;
  result.setStatus = function(status) { this.status = status; };
  result.handleUncaughtException = () => assert.fail('A captured error escaped the metadata boundary');
  return result;
}

test('metadata success removes only its own boundary and calls back exactly once', () => {
  const owner = thread(), outer = new InternalStackFrame(() => assert.fail('Outer continuation ran'));
  owner.stack.push(outer);
  let finish, calls = 0;
  owner.runWithExceptionBoundary(done => { finish = done; }, (error, value) => {
    assert.equal(error, null);
    assert.equal(value, 42);
    assert.deepEqual(owner.stack, [outer]);
    calls++;
  });
  assert.equal(owner.stack.length, 2);
  finish(42);
  assert.equal(calls, 1);
  assert.throws(() => finish(42), /completed/);
  assert.deepEqual(owner.stack, [outer]);
});

test('a pending metadata load suspends an initially runnable caller', () => {
  const owner = thread();
  owner.status = ThreadStatus.RUNNABLE;
  owner.runWithExceptionBoundary(() => {}, () => assert.fail('Pending operation completed'));
  assert.equal(owner.status, ThreadStatus.ASYNC_WAITING);
  assert.equal(owner.stack.length, 1);
});

test('direct asynchronous Java loader errors retain their exact Throwable identity', () => {
  const owner = thread(), failure = {kind: 'NoClassDefFoundError'}, outer = new InternalStackFrame(() => {});
  owner.stack.push(outer);
  let fail, caught;
  owner.runWithExceptionBoundary(() => { fail = () => owner.throwException(failure); }, error => { caught = error; });
  fail();
  assert.equal(owner.stack.length, 2);
  assert.equal(owner.status, ThreadStatus.RUNNABLE);
  owner.stack.at(-1).run(owner);
  assert.equal(caught, failure);
  assert.deepEqual(owner.stack, [outer]);
  assert.equal(owner.status, ThreadStatus.ASYNC_WAITING);
});

test('Java method frames unwind to the same metadata boundary', () => {
  const owner = thread(), failure = {kind: 'LinkageError'};
  let caught;
  owner.runWithExceptionBoundary(() => {
    owner.stack.push({type: StackFrameType.NATIVE, scheduleException: () => false});
  }, error => { caught = error; });
  owner.throwException(failure);
  assert.equal(owner.stack.length, 1);
  owner.stack[0].run(owner);
  assert.equal(caught, failure);
  assert.equal(owner.stack.length, 0);
});

test('ordinary InternalStackFrame callbacks still cannot catch their own thrown error', () => {
  const owner = thread(), failure = {};
  const outer = new InternalStackFrame(error => assert.equal(error, failure));
  owner.stack.push(outer, new InternalStackFrame(() => assert.fail('Own error was caught')));
  owner.throwException(failure);
  assert.deepEqual(owner.stack, [outer]);
  owner.stack[0].run(owner);
});
