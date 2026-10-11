'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
function load() {
  const filename = path.join(runtime, 'src/ConstantPool.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(require('typescript').transpileModule(
    fs.readFileSync(path.join(root, 'src/ConstantPool.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}
    }).outputText, filename);
  return loaded.exports;
}
const {InvokeDynamic} = load();
const Long = require(path.join(runtime, 'src/gLong')).default;
const {PreAllocatedStack} = require(path.join(runtime, 'src/threading'));
const {LookupTable} = require(path.join(runtime, 'src/opcodes'));
const {OpCode, ThreadStatus} = require(path.join(runtime, 'src/enums'));

// Actual fast-path evaluator with controlled Java callbacks, not genuine
// compiler/host evidence. The separate B6 corpus supplies that evidence. String
// allocation still uses the runtime's real initString implementation.
class JavaString {
  toString() { return String.fromCharCode(...this['java/lang/String/value'].array); }
}
class CharArray {
  constructor(thread, length) { this.array = Array(length).fill(0); }
}
function environment(renderFloating = (type, value, callback) => callback(null, javaText(type + ':' + value)),
    {deferInitialization = false} = {}) {
  const events = [], pending = [], errors = [], initializations = [];
  const loader = {
    getResolvedClass(name) {
      assert.equal(name, 'Ljava/lang/String;');
      return {getConstructor: () => JavaString};
    },
    getInitializedClass(thread, name) {
      assert.equal(name, '[C');
      return {getConstructor: () => CharArray};
    },
    initializeClass(thread, name, complete) {
      assert.ok(['Ljava/lang/Float;', 'Ljava/lang/Double;'].includes(name));
      const type = name === 'Ljava/lang/Float;' ? 'F' : 'D';
      events.push(['initialize', type]);
      const signature = (type === 'F' ? 'java/lang/Float' : 'java/lang/Double') +
        '/toString(' + type + ')Ljava/lang/String;';
      const constructor = {[signature](actualThread, parameters, callback) {
        assert.ok(actualThread === thread);
        assert.equal(parameters.length, type === 'F' ? 1 : 2);
        if (type === 'D') assert.equal(parameters[1], null, 'Category-two padding');
        events.push(['floating', type, parameters[0]]);
        renderFloating(type, parameters[0], callback);
      }};
      const cls = {getConstructor: () => constructor};
      if (deferInitialization) initializations.push({complete, cls});
      else complete(cls);
    }
  };
  const thread = {status: ThreadStatus.RUNNABLE, getBsCl: () => loader,
    getStatus() { return this.status; },
    setStatus(status) { this.status = status; },
    throwException(error) { errors.push(error); },
    throwNewException(name) { assert.fail('Unexpected guest error ' + name); }};
  return {thread, events, pending, errors, initializations};
}
const javaText = value => ({toString: () => value});
function site(components, method = 'toString') {
  const result = new InvokeDynamic(0, {name: method,
    descriptor: '(Lrecord/Unit;)Ljava/lang/String;'});
  result.objectMethodsMethodName = method;
  result.objectMethodsRecordName = 'Unit';
  result.objectMethodsComponents = components.map(([name, descriptor]) =>
    ({name, descriptor, fieldName: 'record/Unit/' + name}));
  return result;
}
function evaluate(callSite, env, receiver, other) {
  const callbacks = [];
  callSite.evaluateObjectMethods(env.thread, other === undefined ? [receiver] : [receiver, other],
    (error, result) => callbacks.push({error, result}));
  return callbacks;
}

function invokeOpcode(callSite, env, receiver) {
  // Use the actual invocation opcode and operand stack. Only class-library
  // initialization/conversion callbacks are controlled; no scheduler or
  // complete guest execution is claimed by this unit.
  callSite.paramWordSize = 1;
  callSite.getCallSiteObject = () => [{vmtarget: null}, null];
  const opStack = new PreAllocatedStack(3);
  opStack.push(receiver);
  const frame = {pc: 0, opStack, returnToThreadLoop: false,
    method: {fullSignature: 'record/Unit.toString()Ljava/lang/String;',
      cls: {constantPool: {getUnchecked(index) {
        assert.equal(index, 1); return callSite;
      }}}}};
  LookupTable[OpCode.INVOKEDYNAMIC_FAST](env.thread, frame,
    Buffer.from([OpCode.INVOKEDYNAMIC_FAST, 0, 1, 0, 0]));
  return frame;
}

test('actual invokedynamic suspends after consuming the receiver until deferred F and D initialization completes', () => {
  const env = environment(undefined, {deferInitialization: true});
  const frame = invokeOpcode(site([['single', 'F'], ['wide', 'D']]), env,
    {'record/Unit/single': 1.5, 'record/Unit/wide': -0});
  assert.equal(frame.returnToThreadLoop, true);
  assert.equal(frame.pc, 0, 'No PC advancement while initialization is pending');
  assert.deepEqual(frame.opStack.getRaw(), [], 'The receiver has already been consumed');
  assert.equal(env.thread.getStatus(), ThreadStatus.ASYNC_WAITING, 'Do not reexecute the same invocation with an empty stack');
  assert.equal(env.initializations.length, 1);
  const single = env.initializations.shift(); single.complete(single.cls);
  assert.equal(frame.pc, 0);
  assert.deepEqual(frame.opStack.getRaw(), []);
  assert.equal(env.thread.getStatus(), ThreadStatus.ASYNC_WAITING, 'D initialization is a separate pending operation');
  assert.equal(env.initializations.length, 1);
  const wide = env.initializations.shift(); wide.complete(wide.cls);
  assert.equal(frame.pc, 3, 'Exactly one invocation completion');
  assert.equal(env.thread.getStatus(), ThreadStatus.RUNNABLE);
  assert.equal(frame.opStack.getRaw().length, 1);
  assert.ok(frame.opStack.getRaw()[0] instanceof JavaString);
  assert.deepEqual(env.errors, []);
});

test('deferred floating conversion failure preserves Throwable identity without advancing the actual opcode', () => {
  const failure = {}, env = environment((type, value, complete) => complete(failure), {deferInitialization: true});
  const frame = invokeOpcode(site([['single', 'F']]), env, {'record/Unit/single': 1.5});
  assert.equal(env.thread.getStatus(), ThreadStatus.ASYNC_WAITING);
  const pending = env.initializations.shift(); pending.complete(pending.cls);
  assert.deepEqual(env.errors, [failure]);
  assert.ok(env.errors[0] === failure);
  assert.equal(frame.pc, 0);
  assert.deepEqual(frame.opStack.getRaw(), []);
});

test('deferred initializer error is propagated once without a fabricated successful opcode result', () => {
  const failure = {}, env = environment(() => assert.fail('No conversion after failed initialization'), {deferInitialization: true});
  const frame = invokeOpcode(site([['wide', 'D']]), env, {'record/Unit/wide': 2.5});
  assert.equal(env.thread.getStatus(), ThreadStatus.ASYNC_WAITING);
  // The actual loader throws on this thread before completing with null.
  env.thread.throwException(failure);
  env.initializations.shift().complete(null);
  assert.deepEqual(env.errors, [failure]);
  assert.ok(env.errors[0] === failure);
  assert.equal(frame.pc, 0);
  assert.deepEqual(frame.opStack.getRaw(), []);
});

test('empty records allocate a Java string without component calls', () => {
  const env = environment(), callbacks = evaluate(site([]), env, {});
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].error, null);
  assert.ok(callbacks[0].result instanceof JavaString);
  assert.ok(callbacks[0].result.toString().includes('Unit'));
  assert.deepEqual(env.events, []);
});

test('reference components use Java virtual toString and wait for its callback', () => {
  const env = environment(), receiver = {}, component = {
    toString() { assert.fail('Do not use the JavaScript object representation'); },
    'toString()Ljava/lang/String;'(thread, args, callback) {
      assert.ok(this === component && thread === env.thread);
      assert.deepEqual(args, []); env.pending.push(callback);
    }
  };
  receiver['record/Unit/value'] = component;
  const callbacks = evaluate(site([['value', 'Ljava/lang/Object;']]), env, receiver);
  assert.equal(callbacks.length, 0);
  assert.equal(env.pending.length, 1);
  env.pending.shift()(null, javaText('java-value'));
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].error, null);
  assert.ok(callbacks[0].result.toString().includes('value=java-value'));
});

test('reference conversion errors retain the exact Throwable and stop later fields', () => {
  const env = environment(), failure = {}, receiver = {'record/Unit/first': {
    'toString()Ljava/lang/String;'(thread, args, callback) { callback(failure); },
    toString() { return 'wrong-JavaScript-path'; }
  }};
  Object.defineProperty(receiver, 'record/Unit/second', {get() { assert.fail('No later field after abrupt conversion'); }});
  const callbacks = evaluate(site([['first', 'Ljava/lang/Object;'], ['second', 'I']]), env, receiver);
  assert.equal(callbacks.length, 1);
  assert.ok(callbacks[0].error === failure);
  assert.equal(callbacks[0].result, undefined);
});

test('null references and null-returning Java conversions produce null text', () => {
  const env = environment(), receiver = {'record/Unit/absent': null, 'record/Unit/custom': {
    'toString()Ljava/lang/String;'(thread, args, callback) { callback(null, null); },
    toString() { assert.fail('No JavaScript conversion'); }
  }};
  const callbacks = evaluate(site([['absent', 'Ljava/lang/Object;'], ['custom', 'Ljava/lang/Object;']]), env, receiver);
  assert.equal(callbacks.length, 1);
  const text = callbacks[0].result.toString();
  assert.ok(text.includes('absent=null') && text.includes('custom=null'));
});

test('boxed floating values declared as Object are not routed through concat fast unboxing', () => {
  const env = environment(), calls = [], receiver = {};
  for (const name of ['Float', 'Double']) {
    receiver['record/Unit/' + name] = {
      getClass: () => ({getInternalName: () => 'Ljava/lang/' + name + ';'}),
      ['java/lang/' + name + '/value']: 1e20,
      'toString()Ljava/lang/String;'(thread, args, callback) {
        calls.push(name); callback(null, javaText('1.0E20'));
      },
      toString() { assert.fail('No JavaScript floating conversion'); }
    };
  }
  const callbacks = evaluate(site([['Float', 'Ljava/lang/Object;'], ['Double', 'Ljava/lang/Object;']]), env, receiver);
  assert.equal(callbacks.length, 1); assert.deepEqual(calls, ['Float', 'Double']);
  assert.ok(callbacks[0].result.toString().includes('Float=1.0E20'));
  assert.ok(callbacks[0].result.toString().includes('Double=1.0E20'));
  assert.deepEqual(env.events, [], 'Declared reference conversion invokes the virtual Java methods directly');
});

test('array components use their inherited Java object representation', () => {
  const env = environment(), receiver = {'record/Unit/values': {
    array: [1, 2],
    'toString()Ljava/lang/String;'(thread, args, callback) { callback(null, javaText('[I@java-identity')); },
    toString() { assert.fail('Do not format the JavaScript backing array'); }
  }};
  const callbacks = evaluate(site([['values', '[I']]), env, receiver);
  assert.equal(callbacks.length, 1);
  assert.ok(callbacks[0].result.toString().includes('values=[I@java-identity'));
});

test('all integral primitive components keep their declared value representation', () => {
  const env = environment(), entries = [['bool', 'Z', 1, 'true'], ['char', 'C', 65, 'A'],
    ['byte', 'B', -128, '-128'], ['short', 'S', -32768, '-32768'],
    ['integer', 'I', -2147483648, '-2147483648'], ['wide', 'J', Long.fromString('9223372036854775807'), '9223372036854775807']];
  const receiver = Object.fromEntries(entries.map(([name, type, value]) => ['record/Unit/' + name, value]));
  const callbacks = evaluate(site(entries.map(([name, type]) => [name, type])), env, receiver);
  assert.equal(callbacks.length, 1);
  for (const [name, type, value, text] of entries) assert.ok(callbacks[0].result.toString().includes(name + '=' + text));
  assert.deepEqual(env.events, []);
});

for (const type of ['F', 'D']) {
  test(type + ' floating conversion invokes the actual Java static API with exact value and slots', () => {
    const env = environment((actualType, value, callback) => {
      assert.equal(actualType, type); assert.ok(Object.is(value, -0)); callback(null, javaText('-0.0'));
    });
    const callbacks = evaluate(site([['number', type]]), env, {'record/Unit/number': -0});
    assert.equal(callbacks.length, 1);
    assert.ok(callbacks[0].result.toString().includes('number=-0.0'));
    assert.deepEqual(env.events, [['initialize', type], ['floating', type, -0]]);
  });
  test(type + ' floating Java conversion errors are not wrapped or replaced', () => {
    const failure = {}, env = environment((actualType, value, callback) => callback(failure));
    const callbacks = evaluate(site([['number', type]]), env, {'record/Unit/number': 1});
    assert.equal(callbacks.length, 1);
    assert.ok(callbacks[0].error === failure);
    assert.equal(callbacks[0].result, undefined);
  });
}

test('component callbacks execute serially and implicit object methods never invoke accessors', () => {
  const env = environment(), events = [], receiver = {};
  for (const name of ['first', 'second']) {
    receiver['record/Unit/' + name] = {
      'toString()Ljava/lang/String;'(thread, args, callback) { events.push(name); env.pending.push(callback); },
      toString() { return 'wrong'; }
    };
    receiver[name + '()Ljava/lang/Object;'] = () => assert.fail('Implicit object methods read fields, not accessors');
  }
  const callbacks = evaluate(site([['first', 'Ljava/lang/Object;'], ['second', 'Ljava/lang/Object;']]), env, receiver);
  assert.deepEqual(events, ['first']); assert.equal(callbacks.length, 0);
  env.pending.shift()(null, javaText('one'));
  assert.deepEqual(events, ['first', 'second']); assert.equal(callbacks.length, 0);
  env.pending.shift()(null, javaText('two'));
  assert.equal(callbacks.length, 1);
  assert.ok(callbacks[0].result.toString().includes('first=one'));
  assert.ok(callbacks[0].result.toString().includes('second=two'));
});
