'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const util = require(path.join(runtimeRoot, 'src/util'));
const Long = require(path.join(runtimeRoot, 'src/gLong')).default;
const {Opcodes} = require(path.join(runtimeRoot, 'src/opcodes'));
const {OpCode} = require(path.join(runtimeRoot, 'src/enums'));
const {opJitInfo} = require(path.join(runtimeRoot, 'src/jit'));

let checks = 0;
function fromBits(bits) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(bits >>> 0);
  return bytes.readFloatLE();
}

function exact(actual, expected, label) {
  assert.ok(Object.is(actual, expected), `${label}: ${actual} instead of ${expected}`);
  checks++;
}

// Check the stored number, not just floatToRawIntBits, which itself rounds.
for (const [input, bits] of [
  [16777217, 0x4b800000], [16777219, 0x4b800002], [-16777217, 0xcb800000],
  [1 + 2 ** -24, 0x3f800000], [1 + 3 * 2 ** -24, 0x3f800002],
  [2 ** -150, 0], [-(2 ** -150), 0x80000000],
  [3 * 2 ** -150, 2], [-3 * 2 ** -150, 0x80000002],
  [2 ** 128 - 2 ** 103, 0x7f800000], [2 ** 128 - 2 ** 104, 0x7f7fffff],
  [Infinity, 0x7f800000], [-Infinity, 0xff800000], [0, 0], [-0, 0x80000000]
]) exact(util.wrapFloat(input), fromBits(bits), 'binary32 rounding');
exact(util.wrapFloat(NaN), NaN, 'NaN');

function run(name, inputs, expected) {
  const stack = inputs.slice();
  stack.pop2 = function() {
    assert.equal(this.pop(), null, 'wide slot marker');
    return this.pop();
  };
  stack.pushWithNull = function(value) { this.push(value, null); };
  const frame = {pc: 17, opStack: stack};
  Opcodes[name]({}, frame);
  assert.equal(frame.pc, 18, `${name} advances one byte`);
  assert.equal(stack.length, 1, `${name} consumes its operands and wide marker`);
  exact(stack[0], expected, name);
}

run('i2f', [16777217], 16777216);
run('i2f', [-2147483648], -2147483648);
run('d2f', [1 + 2 ** -24, null], 1);
run('d2f', [-(2 ** -150), null], -0);
run('d2f', [3 * 2 ** -150, null], fromBits(2));
run('fadd', [16777216, 1], 16777216);
run('fsub', [1, 2 ** -25], 1);
run('fmul', [fromBits(0x3f800001), fromBits(0x3f800001)], fromBits(0x3f800002));
run('fdiv', [1, 3], fromBits(0x3eaaaaab));
run('fdiv', [-fromBits(1), 2], -0);
run('frem', [-0, 3], -0);
run('frem', [Infinity, 3], NaN);
run('fneg', [0], -0);
run('fneg', [-0], 0);

// Midpoint-adjacent integers must be rounded before losing low bits to double.
for (const [text, bits] of [
  ['0', 0], ['1', 0x3f800000], ['-1', 0xbf800000],
  ['16777217', 0x4b800000], ['16777219', 0x4b800002],
  ['4611686293305294847', 0x5e800000],
  ['4611686293305294848', 0x5e800000],
  ['4611686293305294849', 0x5e800001],
  ['4611686843061108735', 0x5e800001],
  ['4611686843061108736', 0x5e800002],
  ['4611686843061108737', 0x5e800002],
  ['-4611686293305294849', 0xde800001],
  ['9223372036854775807', 0x5f000000],
  ['-9223372036854775808', 0xdf000000]
]) run('l2f', [Long.fromString(text), null], fromBits(bits));

const i2f = opJitInfo[OpCode.I2F];
assert.equal(i2f.pops, 1, 'JIT i2f must read the value rather than remain a NOP');
assert.equal(i2f.pushes, 1, 'JIT i2f must store the rounded result');
const convert = new Function('value', 'u', i2f.emit(['value'], ['out'], '', 'return out;',
  Buffer.alloc(0), 0, [], null));
exact(convert(16777217, util), 16777216, 'JIT i2f rounding');
exact(convert(-16777219, util), -16777220, 'JIT negative i2f tie');
const multiply = new Function('right', 'left', 'u', opJitInfo[OpCode.FMUL].emit(
  ['right', 'left'], ['out'], '', 'return out;', Buffer.alloc(0), 0, [], null));
exact(multiply(fromBits(0x3f800001), fromBits(0x3f800001), util), fromBits(0x3f800002),
  'JIT fmul rounding');
exact(multiply(-fromBits(1), 0.5, util), -0, 'JIT negative underflow');

console.log(`jvm-float-precision:${checks}:ok`);
