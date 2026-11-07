'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const maximumDelay = 0x7fffffff;

class Clock {
  constructor() { this.now = 0; this.nextId = 0; this.timers = new Map(); this.requests = []; this.immediates = []; }
  setTimeout(callback, delay) {
    const timer = {id: ++this.nextId, callback, requested: delay,
      delay: delay > maximumDelay || delay < 1 || !Number.isFinite(delay) ? 1 : Math.trunc(delay)};
    timer.due = this.now + timer.delay;
    this.requests.push(timer);
    this.timers.set(timer.id, timer);
    return timer;
  }
  clearTimeout(timer) { if (timer) this.timers.delete(timer.id); }
  setImmediate(callback) { this.immediates.push(callback); }
  advance(elapsed) {
    const target = this.now + elapsed;
    for (let count = 0; count < 100; count++) {
      const next = [...this.timers.values()].filter(timer => timer.due <= target)
        .sort((a, b) => a.due - b.due)[0];
      if (!next) { this.now = target; return; }
      this.now = Math.max(this.now, next.due);
      this.timers.delete(next.id);
      next.callback();
    }
    throw new Error('Unexpected timer loop in bounded regression clock.');
  }
  flushImmediate() {
    for (let count = 0; this.immediates.length && count < 100; count++) this.immediates.shift()();
    assert.equal(this.immediates.length, 0, 'Unexpected scheduler loop.');
  }
}

function sourceWorld() {
  const runtime = path.resolve(process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(__dirname, '../build/release-cli'));
  const sourceRoot = path.resolve(__dirname, '../src');
  const clock = new Clock();
  const globals = {performance: {now: () => clock.now}};
  const cache = new Map();
  const sourceModules = new Set(['jvm', 'threading', 'threadpool', 'Monitor', 'parker',
    'ThreadTimer', 'gLong', 'natives/java_lang']);
  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    const filename = path.join(runtime, 'src', name + '.js');
    const loaded = {exports: {}};
    cache.set(name, loaded);
    const original = Module.createRequire(filename);
    const localRequire = request => {
      if (request === 'browserfs') return {...original(request), setImmediate: callback => clock.setImmediate(callback)};
      if (request.startsWith('.')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), request));
        if (target === 'global') return {__esModule: true, default: globals};
        if (sourceModules.has(target)) return load(target);
      }
      return original(request);
    };
    const source = fs.readFileSync(path.join(sourceRoot, name + '.ts'), 'utf8');
    const js = ts.transpileModule(source, {compilerOptions: {
      target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS
    }}).outputText;
    vm.runInNewContext(js, {exports: loaded.exports, module: loaded, require: localRequire,
      __dirname: path.dirname(filename), __filename: filename, Buffer, process, console,
      RELEASE: true, setTimeout: (callback, delay) => clock.setTimeout(callback, delay),
      clearTimeout: timer => clock.clearTimeout(timer)}, {filename});
    return loaded.exports;
  }
  const {JVMThread} = load('threading');
  const JVM = load('jvm').default;
  const ThreadPool = load('threadpool').default;
  const Monitor = load('Monitor').default;
  const Parker = load('parker').default;
  const Long = load('gLong').default;
  const {ThreadStatus, JVMStatus, StackFrameType} = Module.createRequire(path.join(runtime, 'src/jvm.js'))('./enums');
  const natives = load('natives/java_lang').default();
  const parker = new Parker();
  const completions = [];
  const machine = {status: JVMStatus.RUNNING, exitCode: 0, dumpJITStats: false,
    isJITDisabled: () => true, getBootstrapClassLoader: () => null,
    getParker: () => parker, hasVMBooted: JVM.prototype.hasVMBooted,
    terminationCb(code) { completions.push({code, remaining: machine.threadPool.getThreads().length}); }};
  machine.threadPool = new ThreadPool(() => machine.status === JVMStatus.RUNNING ? false :
    JVM.prototype.threadPoolIsEmpty.call(machine));
  let reference = 0;
  function thread(daemon = false) {
    const monitor = new Monitor();
    const mirror = {ref: ++reference, 'java/lang/Thread/daemon': daemon ? 1 : 0,
      'java/lang/Thread/priority': 5, getMonitor: () => monitor};
    const thread = new JVMThread(machine, machine.threadPool, mirror);
    thread.resumptions = 0;
    thread.stack.push({type: StackFrameType.INTERNAL,
      scheduleResume() { thread.resumptions++; }, run() {}, getStackTraceFrame: () => null});
    thread.stack.push({type: StackFrameType.NATIVE, method: {name: 'sleep', fullSignature: 'java/lang/Thread/sleep(J)V'},
      getStackTraceFrame() { return {method: this.method}; }});
    thread.setStatus(ThreadStatus.RUNNABLE);
    if (!machine.firstThread) machine.firstThread = thread;
    return thread;
  }
  return {clock, load, Long, Monitor, Parker, JVM, JVMThread, ThreadStatus, JVMStatus,
    StackFrameType, natives, machine, thread, parker, completions, maximumDelay};
}

module.exports = {sourceWorld, maximumDelay};
