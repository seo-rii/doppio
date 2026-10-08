'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const Long = require(path.join(runtimeRoot, 'src/gLong')).default;
const {Opcodes} = require(path.join(runtimeRoot, 'src/opcodes'));

function fromBits(bits) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(bits >>> 0);
  return bytes.readFloatLE();
}

// JVMS f2l saturates infinities/overflow and truncates finite values toward zero.
// Keep the exact long expectation out of JavaScript's double representation.
let checks = 0;
for (const [bits, expected] of [
  [0x7f800000, '9223372036854775807'],
  [0xff800000, '-9223372036854775808'],
  [0x7fc12345, '0'],
  [0x00000000, '0'], [0x80000000, '0'],
  [0x00000001, '0'], [0x80000001, '0'],
  [0x3fe00000, '1'], [0xbfe00000, '-1'],
  [0x7f7fffff, '9223372036854775807'],
  [0xff7fffff, '-9223372036854775808'],
  [0x5f000000, '9223372036854775807'],
  [0xdf000000, '-9223372036854775808'],
  [0x5effffff, '9223371487098961920'],
  [0xdeffffff, '-9223371487098961920'],
  [0x4b800000, '16777216'], [0xcb800000, '-16777216']
]) {
  const label = `f2l(0x${bits.toString(16)})`;
  const stack = ['below-operand', fromBits(bits)];
  stack.pushWithNull = function(value) { this.push(value, null); };
  const frame = {pc: 17, opStack: stack};
  Opcodes.f2l({}, frame);
  assert.equal(frame.pc, 18, `${label} advances one byte`);
  assert.equal(stack.length, 3, `${label} replaces one float slot with two long slots`);
  assert.equal(stack[0], 'below-operand', `${label} preserves preceding operands`);
  assert.equal(stack[2], null, `${label} pushes the wide slot marker`);
  assert.ok(stack[1] instanceof Long, `${label} stores a Java long`);
  assert.ok(stack[1].equals(Long.fromString(expected)), `${label}: ${stack[1]} instead of ${expected}`);
  checks++;
}

console.log(`jvm-float-to-long:${checks}:ok`);
