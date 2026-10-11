'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1' || !['opcodes', 'jit'].includes(name)) return require(filename);
  const loaded = new Module(filename, module);
  loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(require('typescript').transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'),
    {compilerOptions: {target: 1, module: 1}}).outputText, filename);
  return loaded.exports;
}
const opcodes = load('opcodes'), {opJitInfo} = load('jit');
const {OpCode} = load('enums'), {PreAllocatedStack} = load('threading');
const NPE = 'Ljava/lang/NullPointerException;';

// Real interpreter and emitted-JIT instruction units with a diagnostic exception
// sink. Genuine native/Node/Chromium identity and catch traces belong to B5.
for (const engine of ['interpreter', 'emitted-jit']) for (const value of [null, {marker: 'same throwable'}]) {
  test(`${engine} athrow ${value === null ? 'null creates exact guest NPE' : 'preserves exact throwable identity'}`, () => {
    const events = [], prefix = {marker: 'operand prefix'}, stack = new PreAllocatedStack(4);
    const frame = {pc: engine === 'interpreter' ? 17 : 3, opStack: stack, returnToThreadLoop: false};
    const thread = {
      throwNewException(type, message) { events.push({kind: 'new', type, message, pc: frame.pc}); },
      throwException(throwable) {
        assert.notEqual(throwable, null, 'Null must never reach Throwable scheduling');
        assert.ok(throwable === value, 'Exact throwable, no replacement or wrapping');
        events.push({kind: 'existing', throwable, pc: frame.pc});
      }
    };
    if (engine === 'interpreter') {
      stack.push(prefix); stack.push(value);
      opcodes.LookupTable[OpCode.ATHROW](thread, frame, Buffer.from([OpCode.ATHROW]));
    } else {
      const instruction = opJitInfo[OpCode.ATHROW];
      assert.equal(instruction.hasBranch, true); assert.equal(instruction.pops, 1); assert.equal(instruction.pushes, 0);
      const emitted = instruction.emit(['value'], [], 'unit', 'throw new Error("athrow cannot succeed");',
        Buffer.from([OpCode.ATHROW]), 17, ['prefix'], null);
      new Function('f', 't', 'u', 'value', 'prefix', emitted)(frame, thread, opcodes, value, prefix);
    }
    assert.equal(frame.pc, 17, 'Throwing instruction PC retained/restored');
    assert.equal(frame.returnToThreadLoop, true, 'Exception yields to guest scheduler');
    assert.deepEqual(stack.getRaw(), [prefix], 'Thrown operand consumed, other operands preserved for handler scheduling');
    if (value === null) assert.deepEqual(events, [{kind: 'new', type: NPE, message: '', pc: 17}]);
    else {
      assert.equal(events.length, 1); assert.equal(events[0].kind, 'existing');
      assert.ok(events[0].throwable === value); assert.equal(events[0].pc, 17);
    }
  });
}
